# ADR 117 - Por pagar por urgencia y en filas

**Estado:** Aceptada (2026-11-03). Segunda tanda de la tarjeta **MV2.3** ("lo que faltaba del canvas"). Esteban decidió aplicar el canvas "tal cual como propone el HTML", también donde acota decisiones aprobadas, y para el texto al 200 % eligió "dos renglones".
**Fecha:** 2026-11-03
**Autores:** Esteban (diseño y decisión), Claude Opus 5.5 (implementación y redacción)
**Relación:** sigue al [ADR 116](116-lo-que-faltaba-del-canvas-primera-tanda.md). **Acota** cuatro decisiones aprobadas, solo bajo 1024 px salvo D3: el orden por tipo de "Por pagar" (ficha 05, [ADR 069](069-bloque-gastos-en-la-barra-movil.md)) y su tarjeta de lote suelta; la anatomía de tarjeta de `.deuda-card` del [ADR 036](036-deudas-v2-visual.md) D5; las notas como pastillas de Me deben del [ADR 074](074-me-deben-adopta-la-anatomia-de-deudas.md) D2 (en todos los anchos); y el rótulo de una línea de las lentes del [ADR 104](104-una-sola-barra-para-ir-de-lado.md). **Aplica** R89a (la lista declara su orden), R19 (el monto ancla), R50 (la acción a la vista) y la hoja de detalle del [ADR 098](098-finko-movil-2-primera-entrega.md) D4. Escritorio no cambia ([ADR 073](073-deudas-inventario-con-su-herramienta-al-lado.md)).

---

## Contexto

| Hallazgo del canvas | Lo que había |
|---|---|
| Tablero 4, Por pagar | la lista iba por tipo (fijos, luego deudas) y lo vencido se mezclaba con lo que vence el 30 |
| Tablero 4, Por pagar | cada obligación era una tarjeta de 150 a 190 px: chips, tres botones y un callout |
| Tablero 3, regla de filas | "una pastilla de estado por fila"; Me deben llevaba hasta cinco |
| Tablero 11, Me deben | "Solo seguimiento: no salió de ninguna cuenta" no cabía en una pastilla a 320 y 360 px |
| Tablero 3, texto al 200 % | "las filas crecen en alto: los montos bajan bajo el título en lugar de cortarse y las lentes pasan a dos líneas"; las lentes se cortaban con puntos suspensivos |

## Decisión

### D1. Por pagar, por urgencia

Bajo 1024 px la lista se agrupa así, y cada grupo dice su orden: "Vencidos · del más antiguo al más reciente", "Lo que falta este mes", "Más adelante · el más cercano primero", "Pagado este mes" y "Saldadas". Los dos primeros llevan su suma. Sobre un mes que no es el actual (el reloj del bloque) no hay vencido ni próximo: "Sin pagar en {mes}" y "Pagado en {mes}". Los chips de la lente siguen filtrando.

El lote baja al pie de "Vencidos": "Pagar los N · $X", con el mismo conjunto y los mismos montos que el modal (`vencidosSinPagar` cruzado con `pendientesDePagoDelMes`). Su tarjeta suelta se oculta en el teléfono. Con un chip puesto el pie no aparece: pagaría también lo que el chip esconde.

### D2. Cada obligación, una fila

Teja de 36 px, nombre, una línea de estado ("Venció hace 3 días · gasto fijo", "Mañana · gasto fijo", "Vie 30 · deuda personal · faltan $700.000"), el monto a la derecha y la acción debajo, alineada con el texto: "Marcar pagado" o "Abonar $X". Tocar la fila abre la hoja de detalle con editar y eliminar (archivar, si la deuda quedó en cero) y con lo que antes eran pastillas: cuota y día, categoría, tasa y cupo. El ojo tapa los montos y el botón dice solo "Abonar".

En el teléfono la lista ya no muestra el número de orden de la estrategia: lo que ordena es la urgencia. La estrategia sigue en su tarjeta.

### D3. Me deben, una sola pastilla

La del estado. Las notas (interés, último abono, fecha pactada, solo seguimiento) van en una línea de texto que parte donde haga falta; "Solo seguimiento" conserva el ámbar en el texto. Aplica en todos los anchos.

### D4. Texto al 200 %, dos renglones

Bajo 1024 px las lentes parten su rótulo en dos líneas en lugar de cortarlo. En las filas de Por pagar, Gastos, Movimientos e Ingresos el cuerpo pide un mínimo en `rem`: con texto normal el monto cabe al lado desde 320 px; con la fuente del sistema grande ya no cabe y baja a su renglón.

## Alternativas descartadas

- **Dejar el lote como tarjeta encima de la lista.** Repetía lo que el grupo de vencidos ya dice, con su suma, tres centímetros abajo.
- **Por urgencia también en escritorio.** El ADR 073 resolvió escritorio con la columna de saldos, que es lo que decide a cuál abonar; el canvas no lo pide.
- **Montos con `nowrap` y nombre cortado al 200 %.** El monto es lo que decide; se corta el nombre, que está entero en la hoja.

## Consecuencias

### Positivas

- La primera pantalla de Por pagar muestra lo vencido y su total sin bajar.
- Una sola puerta de lote, pegada a lo que paga.

### Negativas / Restricciones

- La lista tiene dos anatomías según el ancho; `compromisos/index.js` repinta al cruzar 1024 px.
- `ui/detalle-fila.js` lee una tercera anatomía (`.deuda-card`).
