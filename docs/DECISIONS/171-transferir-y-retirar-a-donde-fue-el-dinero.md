# ADR 171 - Transferir y retirar: lo que importa es a dónde fue el dinero

**Estado:** Aceptada (2026-11-18). Pedido "Revisión de servicios, categorías y movimientos", punto 11: transferencias entre cuentas propias, a otras personas y retiros en cajero, con la pregunta de si hace falta registrar el canal (Bre-B, Transfiya). La propuesta salió de esa revisión y se aprobó en chat el mismo día: "Sí, sigue con 11".
**Fecha:** 2026-11-18
**Autores:** el pedido de revisión (producto), Claude Opus 5.5 (investigación, análisis del modelo y diseño)
**Relación:** **Amplía** MC.17 (la transferencia entre cuentas propias) con un costo opcional y un atajo de retiro, y la hoja "¿Qué quieres registrar?" del [ADR 024](024-reorganizacion-navegacion-movil.md) D2 en su fila de Transferir. **Sigue** al [ADR 165](165-el-4x1000-segun-la-cuenta.md) D3 y D4 (un costo de la operación viaja con el registro y no es un gasto), al [ADR 143](143-todo-cambio-de-saldo-deja-registro.md) (la fila explica el saldo), al [ADR 154](154-deshacer-un-movimiento.md) (deshacer) y al [ADR 163](163-ninguna-cuenta-por-debajo-de-cero.md). **Conecta** con el [ADR 169](169-un-avance-no-es-un-gasto.md) D9: la tarjeta de crédito como origen de un retiro lleva a "Sacar un avance". No cambia el [ADR 051](051-tarjeta-de-credito-producto-integrado.md) D4: no se transfiere con cupo.

---

## Contexto

**El canal.** Bre-B transfiere gratis entre personas, en segundos y a toda hora, hasta 1.000 UVB por operación (unos $12,1 millones en 2026). Antes, por ACH, una transferencia a otro banco costaba entre $4.600 y $14.500. Transfiya pasó sus transferencias entre personas a Bre-B en octubre de 2025. Que la operación haya ido por Bre-B, Transfiya o PSE no cambia ningún saldo, ningún cálculo ni ningún análisis de Finko.

**Lo que hay:**

- **Entre cuentas propias (MC.17):** traslado neutro. No es ingreso ni gasto, y el patrimonio no cambia. El 4x1000 se calcula solo: nada entre cuentas del mismo banco, y el tope de la cuenta marcada o de bajo monto (ADR 165 D3). Se guarda en `costoGMF`. La nota tiene como ejemplo "Ej. arriendo, ahorro del mes".
- **La hoja "¿Qué quieres registrar?"** muestra "Transferir · Entre tus cuentas" solo con dos cuentas o más.
- **Retiro en cajero:** funciona como un traslado a la cuenta Efectivo, pero nada lo nombra así. El cajero de otra red cobra entre $6.500 y $8.300 en 2026, y hoy no hay dónde anotarlo.

**Lo que se encontró:**

1. **Un pago a otra persona no es una transferencia en Finko.** El dinero deja de ser tuyo, así que es un gasto, un préstamo o el pago de algo que debes. La gente dice "le transferí a mi hermana", y el ejemplo "arriendo" de la nota invita a registrar como traslado lo que es un gasto.
2. **El costo de una operación ya tiene convención.** El 4x1000 viaja con su registro (`costoGMF`), sale de la cuenta junto con el monto y no es un gasto (ADR 165 D4).

---

## Decisión

### D1. Sin canal

Ningún registro guarda si fue por Bre-B, Transfiya, PSE u otro medio. Lo que importa es de dónde salió el dinero, a dónde llegó y si costó algo. La nota sigue disponible para quien quiera escribirlo.

### D2. "Transferir o retirar" en la hoja de registrar

La fila "Transferir" de la hoja pasa a **"Transferir o retirar"** ("A tu cuenta, a otra persona o en el cajero") y aparece con una sola cuenta. Abre un selector, "¿A dónde fue el dinero?", con el patrón de destinos que la hoja ya usa para Abono y Aporte. Cada opción abre un formulario que ya existe o el de D3:

| Opción | Aparece si | Abre |
|---|---|---|
| A otra cuenta tuya | hay dos cuentas o más | Transferir (MC.17) |
| Lo saqué en efectivo | hay una cuenta que no es Efectivo | Retirar efectivo (D3) |
| Pagué algo de Por pagar | hay algo pendiente este mes | Pagar varios, el lote del mes |
| Le pagué algo a alguien | siempre | Registrar gasto |
| Le presté dinero | siempre | Nuevo préstamo (Me deben) |

No hay un tipo de movimiento nuevo: cada opción deja el registro de siempre. "Pagué algo de Por pagar" va antes que "Le pagué algo" para que el arriendo pagado por transferencia marque el fijo y no quede como un gasto suelto con el fijo todavía pendiente. Abonar a una deuda sigue en su propia fila de la hoja. El botón "Transferir entre cuentas" de Mis cuentas no cambia: ahí la pregunta ya está contestada.

### D3. Retirar efectivo

Un atajo de la transferencia, no un registro nuevo:

- **Llega a Efectivo**, sin preguntar. Si hay varias cuentas Efectivo, se elige; si no hay ninguna, se crea en $0 al guardar y recibe el retiro (ADR 143: crearla es su apertura, y la fila del retiro explica su saldo).
- **Sale de** las cuentas que no son Efectivo, con el 4x1000 calculado como en cualquier transferencia.
- **"¿Te cobraron por el retiro?"**, opcional: lo que cobró el cajero.
- **La tarjeta de crédito** aparece como origen en un grupo aparte. Elegirla abre "Sacar un avance" (ADR 169) con el monto y Efectivo ya puestos: sacar dinero con cupo es un avance, no un retiro.

Se abre desde la hoja (D2) y desde Mis cuentas, junto a "Transferir entre cuentas".

### D4. El costo del retiro viaja con la transferencia

`Transferencia.comision`, opcional y sin migración (como `costoGMF` en MC.17d): sale del origen junto con el monto y el 4x1000; al destino llega el monto. **No es un gasto**, como el 4x1000 (ADR 165 D4): no hay una categoría de comisiones en Día a día, y crear una para esto sumaría vocabulario. El nombre es genérico a propósito: si después hace falta en otra transferencia (por ejemplo, pasar el saldo de PayPal al banco), el dato ya existe. Por ahora el campo solo se ofrece al retirar.

`calcularTransferencia`, `efectoEnCuenta` y deshacer (ADR 154) cuentan la comisión igual que el 4x1000. Con ella, el aviso de saldo (ADR 163) mide monto más 4x1000 más comisión.

### D5. Cómo se ve en Movimientos

Una transferencia que llega a una cuenta Efectivo se lee como **"Retiro de Bancolombia"**, y su fila dice lo que costó ("incluye $7.200 del cajero y $800 de 4x1000"). Se deriva del destino: no hace falta un campo que diga que fue un retiro. Las demás transferencias no cambian.

### D6. La nota de la transferencia

El ejemplo pasa de "Ej. arriendo, ahorro del mes" a **"Ej. ahorro del mes, pasar a Nequi"**: el arriendo es un gasto fijo, no un traslado.

### D7. Lo que no se hace

- **Consignar efectivo** es el mismo traslado al revés (de Efectivo a una cuenta) y no lleva atajo.
- **Recibir dinero de otra persona** sigue siendo un ingreso o el cobro de un préstamo (Me deben), como hoy.

---

## Rebanadas

| Rebanada | Qué entrega |
|---|---|
| MC.20a | D3 (sin la tarjeta), D4 a D6: `comision`, Retirar efectivo desde Mis cuentas, la fila de retiro en Movimientos y la nota nueva |
| MC.20b | D2: "Transferir o retirar" con su selector en la hoja de registrar |
| MC.20c | D3, la tarjeta como origen que abre "Sacar un avance". Espera a AVC.1b |

---

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Guardar el canal (Bre-B, Transfiya, PSE) | No cambia ningún cálculo, ningún análisis lo usaría y agrega una pregunta a cada traslado |
| Un tipo de movimiento "Transferencia a otra persona" | Duplicaría gastos, préstamos y pagos con otro nombre, y Análisis no lo contaría como gasto |
| Preguntar "¿a quién?" dentro del formulario de Transferir | Mezclaría en un formulario de cuentas propias tres registros con campos distintos; el selector de la hoja ya resuelve elegir a dónde ir |
| La comisión del cajero como gasto | Pediría una categoría nueva solo para eso y rompería la convención del 4x1000 |
| Un campo de comisión en toda transferencia | Con Bre-B las transferencias entre personas no cuestan: sería una pregunta casi siempre vacía |
| Un registro propio de retiro | Es un traslado a Efectivo: un registro nuevo duplicaría el de MC.17 y su deshacer |
| Atajo para consignar efectivo | Es menos frecuente y el formulario de Transferir ya lo resuelve |

---

## Consecuencias

### Positivas

- Quien dice "le transferí" llega al registro correcto sin saber cómo lo llama Finko.
- El retiro en cajero se encuentra por su nombre, y su costo queda en el saldo y en Movimientos.
- El arriendo pagado por transferencia marca el fijo en vez de duplicarse como gasto.

### Negativas / Restricciones

- La hoja de registrar gana una vista de selector y una fila que cambia de nombre.
- La cuenta Efectivo puede nacer sola en el primer retiro: quien no la quería la elimina en Mis cuentas.
- La comisión no cuenta como gasto en Análisis, igual que el 4x1000: lo que cuesta mover el dinero se ve en el saldo y en Movimientos, no en las categorías.
