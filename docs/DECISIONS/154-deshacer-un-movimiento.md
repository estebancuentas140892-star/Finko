# ADR 154 - Deshacer un movimiento: quitarlo como si nunca se hubiera registrado

**Estado:** Aceptada (2026-11-16).
**Fecha:** 2026-11-16
**Autores:** Esteban (pedido "MOVIMIENTOS, implementar función Deshacer operación"), Claude Opus 5.5 (implementación)
**Relación:** Generaliza el deshacer de una transferencia (MC.17f) y el "Deshacer" del aviso al guardar un gasto ([ADR 142](142-formularios-por-tarea.md) D4): los mismos deltas, ahora con la operación entera y con chequeos. Respeta el [ADR 143](143-todo-cambio-de-saldo-deja-registro.md): deshacer no es un cambio de saldo nuevo sino quitar uno que no debió existir, así que no deja registro. Supera en Movimientos el "Eliminar" de MOV.1 para gasto, ingreso y transferencia; las secciones dueñas conservan el suyo.

---

## Contexto

Movimientos ya ofrecía "Eliminar" en cada fila delegando en el borrado de su dueño (`_eliminarGasto`, `_eliminarIngresoPuntual`, `_eliminarTransferencia`), que devuelve los saldos con deltas inversos. Faltaba lo que el pedido nombra:

- **La operación entera.** Un pago repartido entre dos cuentas son dos gastos sin nada que los una: borrar uno dejaba la obligación medio pagada y la otra cuenta sin su dinero.
- **Saber cuándo no es seguro.** Un ingreso ya repartido con "Distribuir" originó aportes, pagos y transferencias que no quedan ligados a él; una compra con tarjeta que ya se pagó; una deuda que se archivó; un gasto de "Ya lo usé" que además reinició la reserva. Borrar esos registros solos deja datos que no cuadran.
- **Todo o nada.** El borrado tocaba cuentas, deuda y registro con llamadas sueltas.

## Decisión

### D1. "Deshacer movimiento" en Movimientos

En la fila de un gasto, un ingreso o una transferencia, el botón de quitar es "Deshacer movimiento" (`deshacer-movimiento`). En el teléfono va en la hoja de la fila, con el tono de peligro (`esAccionPeligrosa` lo reconoce); un gasto abierto desde Movimientos muestra su hoja (no el formulario de FORM.2d) con "Deshacer movimiento" en vez de "Borrar este gasto". El aporte al fondo conserva el borrado de Ahorro. Gastos, Mis cuentas y Ahorro conservan su "Eliminar": no se tocan.

### D2. Deshacer es quitar, no compensar

Se borran los registros de la operación y se devuelven sus efectos: el saldo de cada cuenta, el `saldoTotal` y la `cuotaMensual` de la deuda o tarjeta. No se crea ningún movimiento de reversa, ninguna etiqueta ni ningún registro visible. Como los listados, los totales, Inicio, Análisis y el Excel del mes se derivan de las colecciones, la operación deja de aparecer en todos. Finko no genera PDF.

Los efectos se aplican como **deltas** (los mismos de `deltasPorEdicionDeGasto`, `deltasPorEdicionEnDeuda` y `deltasPorEdicionEnCuotaMensual`, y el espejo de `calcularTransferencia`), nunca como valores viejos: devolver $50.000 a una cuenta respeta el ingreso que entró después. Una obligación con varios pagos recupera solo lo de este pago; el estado de un fijo ("pendiente") y lo pendiente de una deuda se derivan de los gastos que quedan.

### D3. La operación entera: `operacionId`

Las partes de un registro repartido entre varias cuentas (un gasto, el pago de una obligación, un abono) llevan desde ahora el mismo `operacionId` (metadato técnico, sin migración, ninguna pantalla lo muestra). Deshacer cualquiera de las filas quita todas sus partes. Lo anterior a MOV.3 se reconoce por lo que sus partes ya tenían en común: la nota "… repartido entre varias cuentas", la fecha, la obligación, la categoría, cuentas distintas y menos de 10 s entre una y otra al guardarse. En el lote de "Pagar", cada obligación es su propia operación: deshacer Netflix no toca el arriendo pagado esa misma vez.

### D4. Cuándo no se deshace

`planDeshacer()` decide antes de tocar nada:

- **Ingreso ya repartido** (`repartido`, "Distribuir mi ingreso"): lo repartido salió de ese dinero y no queda ligado a él.
- **Compra con tarjeta ya pagada:** deshacerla dejaría el saldo de la tarjeta por debajo de cero.
- **Deuda archivada** después del movimiento: se reactiva primero en Por pagar.
- **Gasto de "Ya lo usé"** (`apartadoId`): además reinició la reserva; se corrige en Reservas.

Una cuenta o una obligación que ya no existe no bloquea: no hay saldo que devolverle.

### D5. Seguro y una sola vez

- Antes de preguntar, el plan; si no es seguro, un aviso de un solo botón ("No se puede deshacer", `confirmar` con `soloAceptar`) y nada cambia.
- La confirmación dice lo que de verdad va a pasar ("Vuelven $20.000 a Bancolombia, vuelven $18.900 a Nequi y Netflix vuelve a quedar por pagar").
- Al confirmar se vuelve a calcular el plan; si su huella cambió (otra pestaña, la nube), no se aplica.
- `aplicarDeshacer()` no toca nada si algún registro ya no está (deshacer dos veces), y si algo falla a mitad devuelve lo que alcanzó a tocar.
- Un segundo toque mientras se confirma no abre otra confirmación.

## Alternativas descartadas

- **Movimientos compensatorios** (un ingreso que anula un gasto). Es lo que el pedido descarta: ensucia el historial, los totales y el Excel con dos filas que no pasaron.
- **Guardar una foto del estado antes de cada operación y restaurarla.** Pisaría lo que pasó después en esas cuentas (el ejemplo del pedido) y exigiría tocar todos los flujos de registro.
- **Un diario de operaciones con sus efectos exactos.** Más preciso para casos raros, pero instrumenta cada flujo que mueve dinero de la app; los deltas ya existentes cubren los cuatro tipos pedidos con lo que el registro guarda.
- **Cambiar también el "Eliminar" de Gastos, Mis cuentas y Ahorro.** El pedido pide no tocar otras funcionalidades; queda como pendiente decidirlo.
- **Deshacer el lote entero desde cualquiera de sus filas.** Quitaría pagos que el usuario no eligió deshacer.

## Consecuencias

- `infra/deshacer.js` es el único lugar que sabe deshacer una operación; importa la lógica pura de Gastos, como `infra/avisos.js` lee la de cada dominio.
- `infra/pago-compromiso.js` (pago y lote), `_guardarAbono` y el guardado de un gasto escriben `operacionId` cuando reparten.
- Queda fuera: los aportes a metas y reservas, lo prestado y lo cobrado en Me deben, lo recibido de una deuda y los ajustes a mano; sus filas no ofrecen deshacer.
- Quedan dos borrados de un gasto (el de Gastos, por registro; el de Movimientos, por operación) hasta que se decida unificarlos.
