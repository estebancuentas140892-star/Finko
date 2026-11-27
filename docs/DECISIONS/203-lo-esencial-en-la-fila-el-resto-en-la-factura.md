# ADR 203 - Lo esencial en la fila, el resto en la factura (Inicio y Gastos en el teléfono)

**Estado:** Aceptada. En aplicación por rebanadas: SIT.2a (D1 a D4, Día a día, el botón "Pagar" y la factura del gasto) aplicada el 2026-11-27; SIT.2b (D5 a D7) y SIT.2c (D8 a D10) pendientes.
**Fecha:** 2026-11-27
**Autores:** el pedido de Esteban ("se realizaron varios cambios"), con la entrega de Claude Design `Entrega Claude/REFERENCIA-refinamiento-inicio-gastos.html` y `ESPECIFICACION-refinamiento-fila-y-factura.md` (no llegó al lienzo compartido); Claude Opus 5.5 (implementación)
**Relación:** Ajusta el ADR 202: D1 (la clasificación sale de la fila del teléfono), D3 (el encabezado del día en un rótulo), D6 ("3 pagos de $X" pasa a la ficha del fijo; botón de 30 px) y D7 (la teja de Esta semana pierde "en N días" y la fila pierde el tipo). Ajusta R1 de R93 en `DESIGN_SYSTEM.md`.

---

## Contexto

Con "Cada dato en su sitio" (ADR 202) nada se corta ni se parte, pero las filas quedaron altas: medido a 393 px con el escenario largo, una fila de Día a día medía 87 a 90 px en 3 renglones, una de Fijos con "Pagar" 101 px y una de Esta semana 86 px. Causas: renglones que repiten lo que ya dicen la ilustración, el logo, el estado o la factura; el botón "Pagar" y el círculo (34 px) estiran el renglón del estado; la teja de Esta semana tiene 3 renglones (62 px); una barra se dibuja vacía; en la factura, la cuenta, su tipo y su saldo quedan apretados en un renglón y el nombre del fijo se corta con puntos.

No es un rediseño: colores, letra, íconos, tarjetas, rellenos de fila (12 / 14 px) y la forma de la fila de dato (ADR 202 D1) se conservan. Solo el teléfono.

## La regla: una unidad, un renglón

Un renglón es una **unidad de información**, no un dato suelto: "Bancolombia Ahorros" es una unidad (la cuenta), "$286.400 cada mes" otra (valor y periodicidad), "Entra $4.200.000" otra. Dos unidades distintas no comparten renglón salvo que tengan lugares fijos (izquierda y derecha). Lo que ya se ve en otro lado (ilustración, logo, estado, factura) no se repite en la fila: la fila dice lo que se decide de un vistazo; la factura, que se abre al tocarla, lo tiene todo.

## Decisión

### D1. Medidas que cambian

El dato va a 2 px del nombre (antes 3) y el renglón del estado a 3 px. "Pagar" y el círculo dibujan 30 px (antes 34) con margen negativo, así el renglón del estado mide lo que su texto (18 px); la zona de toque sigue en 44 x 44 (R4): la pastilla con un `::before` de `inset: -7px`, el círculo con su botón de 44 y el dibujo a 7 px.

### D2. La fila del gasto (SIT.2a)

Qué fue, cuánto y de qué cuenta salió. Sale la clasificación del teléfono: la categoría la dice la ilustración y la subcategoría vive en la factura; el lector la oye en el nombre del botón ("Ver detalle: Almuerzo, Almuerzo de trabajo, $22.000"). La cuenta es un bloque (`.fila__cuenta`): el logo de 16 no se encoge y el texto va a su lado, así una cuenta larga baja alineada tras el logo. Sin cuenta, la fila mide un renglón. `textosFilaGasto` sigue devolviendo `clasificacion`.

### D3. El encabezado del día (SIT.2a)

"Hoy, jueves 26" y "Ayer, miércoles 25" en un solo rótulo, en el peso del rótulo (antes "Hoy" en negrita y "jueves 26" atenuado). La especificación no lo nombra; lo dibuja la referencia en Día a día y en los cinco anchos.

### D4. La factura del gasto (SIT.2a)

Sale la fecha bajo el título: ya está en el comprobante. "Pagado con": la entidad y el tipo atenuado en un renglón ("Bancolombia Ahorros", una unidad) y "Te queda $2.845.300" en el siguiente. La categoría lleva su subcategoría en el segundo renglón de la misma fila (tocarla lleva a la categoría y de ahí a "¿En qué fue?": se cambian las dos); la fila Detalle queda solo para "¿Necesidad o deseo?". Al registrar un gasto el recibo no cambia (ADR 185 D5).

### D5. Fijos (SIT.2b, pendiente)

Sale el renglón "N pagos de $X" de la fila (pasa a la factura del fijo, D7); "Pagar los 5 por $2.181.200" en un renglón.

### D6. Deudas (SIT.2b, pendiente)

Sale el renglón de la entidad de la tarjeta (queda en el logo, la ficha y el nombre accesible); la cuota dice "Cuota de $1.180.000" sin el día (lo dice el estado). El total de Deudas sin pagos en el mes no dibuja la barra; con pagos, "Pagaste $Y de $X en cuotas de noviembre" y la barra.

### D7. La factura del gasto fijo (SIT.2b, pendiente)

Bajo el título solo "Gasto fijo"; "Toca un dato para cambiarlo." al pie. En el recibo, el nombre completo sin puntos suspensivos y "$286.400 cada mes" como unidad; "Pendiente: 3 pagos de $92.000" si hay más de un pago pendiente.

### D8. Inicio (SIT.2c, pendiente)

"4 pagos más por $1.875.300" en un renglón con la flecha de las demás filas. Esta semana: teja de 44 x 44 con el día y el número ("Mañana" en el color de acción); salen "en N días" y el tipo; "Entra $X" y "Sale $Y" en línea.

### D9. Tu plan sin datos (SIT.2c, pendiente)

Con los tres grupos en 0 %, una fila: "Se llena cuando registres gastos: estilo de vida, necesidades y ahorro." y "Ajustar".

### D10. Movimientos queda fuera

La referencia recomienda que Movimientos use la fila de Día a día; es otra tarea.

## Decisiones que la entrega deja a Esteban

Quitar "en 2 días" de Esta semana (lo había pedido en la primera ronda) y unir categoría y subcategoría en una fila de la factura: Esteban pidió aplicar los cambios de la entrega, así que se aplican las dos (D4, D8).

## Ajustes al aplicar

- **La regla de la factura vive en `captura.css`**: la rejilla del recibo está en esa capa, que gana a `identidad.css`; el segundo renglón (`.recibo__s` a todo el ancho) se fija ahí para la ficha.
- **El tipo de la cuenta en la factura** usa `.recibo__cuenta-tipo`: `.recibo__tipo` ya existe en `captura.css` como bloque.

## Alternativas descartadas

- **Achicar la letra o los rellenos**: el aire de la tarjeta está bien; lo que sobraba eran renglones.
- **Dejar la subcategoría en la fila y quitar la cuenta**: la cuenta es lo que no se deduce de la ilustración.

## Consecuencias

- La fila de Día a día pasa de 87 a 64 px con datos cortos; con cuenta larga, de 126 a 102.
- E2E nueva en `cada-dato.test.js` ("Lo esencial en la fila"): alto de la fila, la categoría no escrita y el botón de 30 px que se toca en 44.
