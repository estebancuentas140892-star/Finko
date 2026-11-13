# ADR 139 - La naturaleza de un gasto: nada se cuenta dos veces

**Estado:** Aceptada y aplicada (2026-11-13, HF.1b).
**Fecha:** 2026-11-13
**Autores:** Esteban (la dirección, P2 del ADR 091: "el pago de una obligación conserva su registro y deja de sumar como consumo"; el arranque: "Sí, arranca HF.1b"), Claude Opus 5.5 (diagnóstico, diseño e implementación)
**Relación:** **Escribe** la HF.1a que pedía el [ADR 091](091-un-hecho-financiero-se-informa-una-vez.md) (P2) y cierra sus riesgos 3 y 6; el 4 queda cerrado en la lente de consumo (D2). **Acota** el [ADR 051](051-tarjeta-de-credito-producto-integrado.md) D3 (la compra con tarjeta sigue siendo un gasto, pero no sale del ingreso hasta que se paga la tarjeta) y el [ADR 002](002-abono-deudas.md) D1 (el abono sigue en `S.gastos`, pero no es consumo). **Respeta** el [ADR 013](013-distribucion-automatica-inteligente.md) (las cuotas de deuda son Necesidades), el [ADR 020](020-fondo-marcador-de-liquidez.md) (el aporte al Fondo no mueve ninguna cuenta) y el [ADR 002](002-abono-deudas.md) D2 (no se separa capital de intereses). Sin schema.

---

## Contexto

`S.gastos` guarda tres hechos distintos con la misma forma: lo que compraste, el pago de un gasto fijo y el abono a una deuda (ADR 002). Con la tarjeta de crédito (ADR 051) se volvió visible el costo: comprar 100 con la tarjeta y pagarla 100 dejaba **200** de gasto en Análisis, en "Necesidades" de Límites, en la tasa de ahorro y en las compras y consumos de la renta. En Límites el error era doble: la compra con tarjeta lleva el `compromisoId` de la tarjeta, así que una cena con tarjeta contaba como Necesidad.

Verificado en el código el 2026-11-13: `totalGastosMes()` y `totalGastosAnio()` suman todo `S.gastos`; `ejecutadoPorGrupoDelMes()` llama Necesidad a todo gasto con `compromisoId`; la tasa de ahorro (`ahorro/index.js`) suma todo el mes; Movimientos pinta el aporte al Fondo como egreso aunque no sale de ninguna cuenta.

## Decisión

### D1. Cada gasto tiene una naturaleza, derivada de lo que ya guarda

`infra/naturaleza.js`, puro y sin schema:

| Naturaleza | Cómo se reconoce | Ejemplo |
|---|---|---|
| `consumo` | todo lo que no es lo de abajo | mercado, una cena pagada con Nequi |
| `consumo-con-tarjeta` | `consumoTC === true` (ADR 051 D3) | la cena pagada con la tarjeta |
| `pago-de-fijo` | categoría "Gastos fijos" (la pone `gastoDePagoCompromiso`) | el arriendo marcado como pagado |
| `pago-de-deuda` | categoría "Deudas" y sin `consumoTC` (la pone el abono; el formulario no la ofrece) | la cuota del préstamo, el pago de la tarjeta |

Los demás registros ya traen su naturaleza en la colección donde viven: ingreso (`ingresos`, `ingresosPuntuales`), transferencia propia (`transferencias`), aporte a una bolsa (`ahorro.aportes`, metas y reservas), inversión, préstamo y su cobro (`personales`). No necesitan función.

### D2. Dos lentes, cada una con su nombre

- **Consumo: en qué se fue tu dinero.** Todo menos `pago-de-deuda`. La compra con tarjeta cuenta en su fecha y en su categoría. La usan **Análisis** entero (gasto del mes, la serie de meses, categorías, comparación con el mes anterior, patrón semanal, gastos pequeños y el puntaje) y **la renta** (compras y consumos, que la DIAN mide como consumo, no como pago de deudas). Los topes por categoría de Límites ya eran consumo: la categoría "Deudas" no tiene tope.
- **Lo que sale del ingreso: cuánto te queda.** Todo menos `consumo-con-tarjeta`. La compra con tarjeta todavía no sacó dinero: sale cuando pagas la tarjeta, como cuota de deuda. La usan **Límites por grupo** (el plan del ingreso, donde el ADR 013 pone las cuotas de deuda, la de la tarjeta incluida, en Necesidades) y **la tasa de ahorro** ("de cada $100 que recibes, guardas…").

En las dos, comprar 100 con la tarjeta y pagarla 100 da **100**. Lo que cambia es el mes y el lugar: en consumo es la cena del mes de la compra; en lo que sale del ingreso es la cuota de la tarjeta del mes en que se paga.

### D3. Movimientos: el aporte al Fondo no sale

El aporte al fondo de emergencia pasa a dirección `neutro`, como una transferencia: no tiene cuenta, no suma al neto del día y se pinta sin signo. Su dinero se queda donde estaba (ADR 020).

### D4. Lo que no cambia

- **Gastos** ya separaba las dos cosas: "Gastaste en noviembre" deja fuera los pagos de fijos y deudas, y los dice aparte en "+ $X en fijos y deudas". Es el modelo de esta decisión y no se toca.
- **Por pagar** sigue siendo el lugar de los abonos: ahí se ve cuánto pagaste a cada deuda.
- Ningún registro se borra ni cambia de forma: el abono sigue moviendo la cuenta y bajando la deuda (ADR 002 D1).

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Una sola lente: sacar todo abono de todas las vistas (P2 al pie de la letra) | la tasa de ahorro diría "guardas el 40 %" a quien pagó su préstamo con ese dinero, y Necesidades quedaría siempre por debajo del plan, que sí incluye las cuotas (ADR 013) |
| Una sola lente de caja: sacar la compra con tarjeta de todas las vistas | Análisis y la renta dejarían de ver en qué se gastó con la tarjeta, y los topes por categoría no cuadrarían con Análisis |
| En Límites, la compra con tarjeta en Estilo de vida y el pago de la tarjeta fuera | el plan del ingreso reserva la cuota de la tarjeta en Necesidades: ese grupo quedaría siempre corto y Estilo de vida pasado |
| Un campo nuevo `naturaleza` en cada gasto | todo se deriva con certeza de lo que ya se guarda (R-HF5); un campo nuevo pide migración y se desincroniza al editar |
| Separar capital e intereses del abono | rechazado por el ADR 002 D2; los intereses se ven en el plan de salida de Por pagar |
| Pintar sin signo la compra con tarjeta en Movimientos | sin decir con qué tarjeta se pagó, la fila parecería un error; queda pendiente (Consecuencias) |

## Consecuencias

- Quien paga deudas ve bajar el gasto del mes de Análisis y el de la renta: el pago sigue en Por pagar, en Movimientos y en la línea "en fijos y deudas" de Gastos.
- La tasa de ahorro deja de restar dos veces lo que pagaste con tarjeta; una cena con tarjeta pesa en ella el mes en que pagas la tarjeta.
- **Pendiente en Movimientos**: el neto de un día o de una búsqueda sigue sumando la compra con tarjeta y el pago de la tarjeta. Arreglarlo pide que la fila diga con qué tarjeta se pagó; es diseño, sin tarjeta todavía.
- HF.1c y HF.1d clasifican sus filas nuevas con esta tabla.
