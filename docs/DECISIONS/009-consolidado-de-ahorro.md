# ADR 009 - Múltiples tipos de ahorro: vista consolidada, no schema nuevo

**Estado:** Aceptada
**Fecha:** 2026-06-27
**Autores:** Esteban (producto), Claude Opus 4.8 (implementación)

---

## Contexto

El usuario pidió "múltiples tipos de ahorro" (tarea F6). Al revisarlo, Finko ya guarda dinero ahorrado en **cuatro** estructuras distintas, cada una con un propósito propio:

| Dominio | Qué guarda | Forma |
|---|---|---|
| **Ahorro** (`S.ahorro`) | Fondo de emergencia único + aportes + compromiso mensual | Singleton (un solo fondo) |
| **Metas** (`S.metas`) | Objetivos con monto y fecha (viaje, laptop) | Array |
| **Apartados** (`S.apartados`) | Sobres para gastos previsibles (SOAT, impuestos) | Array |
| **Inversiones** (`S.inversiones`) | CDT, fondos, acciones, cripto | Array |

El problema real del usuario no es que falten tipos de ahorro: es que están **fragmentados**. No hay un lugar donde responder "¿cuánto tengo guardado en total y dónde?".

Se evaluaron tres caminos:

1. **Vista consolidada de solo lectura** (la elegida): una card que reúne los cuatro vehículos con su total y desglose.
2. **Generalizar el fondo único a varios fondos nombrados** (`fondoEmergencia` → `fondos: []`): emergencia + ahorro general + "para el carro", etc.
3. **Etiquetar el vehículo** (cuenta de ahorros, CDT, efectivo) en cada ahorro.

---

## Decisión

**Se entrega F6 como una vista consolidada de solo lectura en la sección Ahorro.** No se cambia el schema, no se crea un dominio nuevo, no se generaliza el fondo único.

Razones:

1. **Resuelve el problema real (visibilidad) al menor costo.** La fragmentación se cura con una sola card que agrega lo que ya existe. Cero migración, cero riesgo de regresión sobre el Score de Salud (que lee `fondoEmergencia` directamente).
2. **No diluye conceptos.** El [ADR 007](007-dominio-apartados.md) ya estableció que mezclar metas, apartados y fondo "diluye el propósito de ambos". Generalizar el fondo a varios fondos libres habría reintroducido justo esa confusión (un "ahorro general" se solapa con una Meta sin fecha).
3. **El vehículo ya está cubierto.** Distinguir dónde está la plata (opción 3) duplicaría Inversiones (el CDT vive ahí) y Tesorería (las cuentas).
4. **App estable en producción.** En modo mantenimiento, la opción de menor superficie de cambio y mayor claritud es la correcta.

### Implementación

- **`consolidarAhorro({fondo, metas, apartados, inversiones})`** en `ahorro/logic.js`: función pura que recibe los cuatro totales ya sumados, devuelve `{ total, desglose }` con porcentajes, excluye vehículos en 0 y ordena de mayor a menor.
- **`renderResumenAhorroConsolidado()`** en `ahorro/view.js`: lee `S` y suma inline cada slice. **No importa otros dominios:** suma `S.metas`, `S.apartados`, `S.inversiones` directamente, igual que `compromisos/views/dashboard.js` lee `S.personales` y `S.apartados` sin importar esos módulos. Así se respeta la regla ADN #10 (ningún dominio importa a otro): leer el estado compartido está permitido; importar el módulo de otro dominio, no.
- **Contenedor** `#panel-ahorro-consolidado` en el tope de la sección Ahorro, con patrón `[hidden]` cuando el total es 0.

---

## Consecuencias

### Positivas

- El usuario ve su ahorro total y su reparto de un vistazo, sin abrir cuatro secciones.
- Cero migración, cero schema nuevo, cero riesgo sobre datos existentes o sobre el Score.
- Reusa el patrón probado de "view lee S de varios slices" sin violar la independencia de dominios.

### Negativas / Restricciones

- Es solo lectura: para mover dinero entre vehículos el usuario sigue yendo a cada sección (es lo correcto: cada vehículo tiene reglas propias).
- Si en el futuro se quiere de verdad "varios fondos de emergencia", ese sigue siendo un cambio de schema aparte (queda fuera de F6, documentado aquí como descartado a propósito).
