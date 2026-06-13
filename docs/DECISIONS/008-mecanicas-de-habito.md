# ADR 008 - Mecánicas de hábito: resumen semanal sí, racha con castigo no

**Estado:** Aceptada
**Fecha:** 2026-06-12
**Autores:** Esteban (producto), Claude Fable 5 (decisión/ADR)

---

## Contexto

La fase F8 del rediseño visual 2026 (ver [REDESIGN_2026.md](../REDESIGN_2026.md)) proponía "mecánicas de hábito: racha de registro + resumen semanal", marcada explícitamente como **decisión de producto, no solo UI**. Esta ADR cierra esa decisión antes de escribir código.

Estado actual de la gamificación en Finko:

- **Logros** (`S.logros` + `logros/logic.js`): 12 hitos de una sola vez (primer gasto, meta lograda, fondo de emergencia, etc.) con toast + confetti. Celebran progreso puntual, sin presión recurrente.
- **No existe** ninguna racha real (días consecutivos) ni resumen semanal. El nombre "Logros y Rachas" de la tarea G.3 quedó grande: solo se construyó la parte de logros.

El ADN del proyecto pide "principios Duolingo **adaptados a finanzas, sin infantilizar**" y "tono adulto, cero mascotas ni caricaturas".

---

## La tensión

Las rachas son el mecanismo de retención más efectivo de Duolingo y, a la vez, el más delicado en una app financiera:

1. **El comportamiento premiado no siempre tiene sentido.** Aprender un idioma a diario siempre suma; registrar gastos a diario no: hay días sin movimientos. Una racha diaria puede empujar a anotar trivialidades solo por no romperla.
2. **La aversión a la pérdida es manipuladora en una herramienta de bienestar.** Perder una racha de 40 días genera ansiedad y puede provocar abandono, justo lo contrario del objetivo. En finanzas eso roza lo predatorio.
3. **Finko no vigila el uso de la app.** Es offline-first, sin servidor, sin analítica (ADN #2, #3). No registramos "días que abriste Finko"; solo existe la actividad financiera que el usuario decide anotar.

El resumen semanal, en cambio, es reflexión sin castigo: insight financiero genuino, perfectamente alineado con el tono adulto.

---

## Decisión

**Se construye solo el resumen semanal. No se construye ninguna racha con castigo (estilo Duolingo: llama, días consecutivos, vuelta a cero).**

Dentro del resumen se incluye **"días activos este mes"** como un dato amable: un contador que solo informa, nunca regaña. No es una racha independiente ni se "pierde": se reinicia de forma natural cada mes.

### Qué se construye (alcance de la implementación V.8)

Un **resumen semanal** como panel de solo lectura, agregando datos que ya viven en `S` (lógica pura, sin schema nuevo):

- **Gasto de los últimos 7 días** y comparación con los 7 anteriores (subió / bajó / igual), reusando el tono de los insights existentes.
- **Categoría con más gasto** de la semana.
- **Días activos este mes**: cantidad de días distintos del mes con al menos un movimiento registrado (derivado de `gasto.fecha`). Mide actividad financiera anotada, no aperturas de la app. Presentación neutra ("Llevas 12 días activos este mes"), sin meta, sin castigo, sin comparación competitiva.
- Opcional: número de registros de la semana y un guiño al progreso del fondo/metas (los anillos ya existen).

Ubicación sugerida: una card en el dashboard (el bento de V.4 ya tiene el patrón de paneles dinámicos que aparecen solo con datos). Aparece cuando hay actividad suficiente; no molesta a un usuario nuevo con un resumen vacío.

### Qué NO se construye

- Racha diaria de registro (días consecutivos).
- Cualquier mecánica con aversión a la pérdida: contadores que vuelven a cero, "no rompas tu racha", recordatorios de presión.
- Tracking de aperturas de la app o cualquier telemetría de uso.
- Mascota, avatar o personaje.

---

## Justificación

- **Fiel al ADN.** "Sin infantilizar" y "tono adulto" se respetan: el resumen es una herramienta de reflexión, no un juego.
- **Sin riesgo reputacional.** Una app que ayuda con el dinero no debería usar ansiedad como gancho de retención.
- **Cero costo de datos.** Todo el resumen se deriva de `S` con funciones puras: sin bump de schema, sin migración, sin nuevos campos que mantener.
- **Privacidad por diseño.** "Días activos" mide lo que el usuario anota, no lo que el sistema lo observa hacer. Coherente con offline-first sin servidor.
- **Reconcilia las dos respuestas de producto.** Se eligió "solo resumen semanal" como mecánica y "días activos del mes" como modelo del contador: la síntesis es un resumen con el contador amable adentro, no una racha aparte.

---

## Consecuencias

### Positivas

- Da un "motivo para volver" sin recurrir a presión psicológica.
- Aporta valor financiero real (reflexión semanal), no solo retención.
- Implementación acotada: un `logic.js` de agregación (con tests) + una card en el dashboard. Sin schema, sin migración.

### Negativas / Restricciones

- Menor "enganche" que una racha clásica. Es una renuncia deliberada: priorizamos confianza sobre retención a cualquier costo.
- El resumen necesita datos para ser útil; debe ocultarse con elegancia cuando no los hay (mismo patrón `[hidden]` de los paneles del bento en V.4).
- "Días activos" depende de `gasto.fecha`, que el usuario puede retrofechar; se acepta como aproximación honesta de actividad anotada (no se presenta como "días de uso de la app").

---

## Alternativas descartadas

- **Racha diaria clásica:** descartada por aversión a la pérdida inadecuada en finanzas.
- **Racha semanal:** más laxa, pero sigue siendo una racha que se "pierde"; el contador de días activos logra la motivación sin ese costo.
- **No construir nada (cerrar en V.7):** válida, pero el resumen semanal aporta valor genuino con bajo riesgo, así que vale la pena.
