# ADR 108 - "Más" dice cómo está cada destino

**Estado:** Aceptada (2026-10-29). Pedido en chat: "Sí, Más", sobre la fase 9 del canvas "Finko móvil: rediseño integral" (Claude Design, tablero "Fase 9: lentes, Movimientos y Más", parte 3, y "Hoja Más v2"). El canvas deja de mandar con este ADR.
**Fecha:** 2026-10-29
**Autores:** Esteban (pedido y diseño de la fase 9), Claude Opus 5.5 (implementación y redacción)
**Relación:** pieza MV2.21 de la tarjeta MV2.2 ([ADR 098](098-finko-movil-2-primera-entrega.md)); cumple R74. **Respeta** el [ADR 069](069-bloque-gastos-en-la-barra-movil.md) D6 (los rótulos "Consultar" y "Tu dinero", y qué hay en cada uno), R83 (la hoja no pasa de 444 px) y R20 (el ojo). La hoja solo existe en el teléfono; escritorio y la app del niño no cambian.

---

## Contexto

Medido en la app real con el escenario C (fase 9 del canvas):

| Hallazgo | Medida |
|---|---|
| Cinco destinos mudos | "Más" lista Calendario, Movimientos, Análisis, Mis cuentas y Me deben sin una cifra (R74): hay que entrar a cada uno para saber si pide algo |
| La rejilla no deja lugar | a 320, la rejilla de dos columnas ya parte "Mis cuentas" en dos líneas |
| Hay espacio | la hoja mide 361 de 444 px (R83) |

## Decisión

### D1. Una línea por destino, con lo que su sección ya calcula

- Calendario: los pagos de los próximos 7 días ("3 pagos esta semana"), con `compromisosProximos`.
- Movimientos: el último movimiento ("Ayer: Netflix"), con `movimientosRecientes`.
- Análisis: la salud ("Salud 37 de 100"), con el mismo cálculo y la misma banda que su anillo. Si la banda es crítica, la línea va en ámbar: pide atención.
- Mis cuentas: el total y cuántas cuentas ("$4.761.300 en 4").
- Me deben: lo que falta cobrar ("$200.000 por cobrar").

Sin datos no hay línea. El ojo enmascara los montos (R20). El nombre accesible de cada fila incluye su línea.

### D2. Lista en vez de rejilla

Una fila por destino: teja, nombre y, a la derecha, la línea. Los rótulos, el orden, Ajustes y el tema al pie no cambian.

### D3. Se calcula al abrir

Las líneas se escriben al abrir la hoja, no en cada repintado de la app: el cálculo de la salud no es barato y la hoja casi siempre está cerrada. Viven en `ui/menu-mas.js`, que lee la lógica pura de cada dominio, como ya hace el bloque Gastos; ningún dominio importa a otro (ADN 10).

## Alternativas descartadas

- **Que cada sección publique su línea por el EventBus.** Obliga a cinco dominios a emitir algo que hoy no emiten para un solo consumidor.
- **Mantener la rejilla con la línea debajo del nombre.** A 320 no cabe y la hoja pasa del techo de R83.

## Consecuencias

### Positivas

- Desde "Más" se sabe si algo pide atención antes de entrar.
- La hoja sigue bajo los 444 px: mide 435 a 320, 390 y 430, sin cortar ninguna línea; lo vigila el E2E de R83.

### Negativas / Restricciones

- Si una sección cambia cómo calcula su cifra, la línea de "Más" debe usar la misma función, no una copia.
