# ADR 165 - El 4x1000 según la cuenta, como lo cobra el banco

**Estado:** Aceptada (2026-11-17). D1 a D3 en GMF.1a; D4 en GMF.1b.
**Fecha:** 2026-11-17
**Autores:** Esteban (pedido "Gastos día a día", sección Mis cuentas, y sus respuestas en chat), Claude Opus 5.5 (investigación, diseño e implementación)
**Relación:** **Reemplaza** la casilla manual "A esta cuenta le aplica el 4x1000" (MC.17) y la de "Descontar el 4x1000 de este retiro" de las transferencias (MC.17d). Respeta el [ADR 163](163-ninguna-cuenta-por-debajo-de-cero.md): el aviso de saldo incluye el 4x1000.

---

## Contexto

Esteban pidió que al configurar las cuentas Finko pregunte cuál es la principal o de nómina y que, con una segunda cuenta, sepa si paga el 4x1000 y lo calcule solo, investigando antes cómo funciona hoy en Colombia.

Lo que dice la norma (Estatuto Tributario y DIAN, revisado el 2026-11-17):

- El GMF es 4 por mil de cada retiro (arts. 871 y 872).
- No lo pagan, hasta **350 UVT al mes** ($18.330.900 con la UVT 2026 de $52.374, Resolución DIAN 000238 de 2025), los retiros de una cuenta de ahorros, un depósito electrónico o una tarjeta prepago (art. 879 num. 1). El art. 881-1 (Ley 2277 de 2022) permite repartir esa exención entre varias cuentas de la misma persona, pero los bancos siguen pidiendo marcar una sola mientras el sistema de información no funciona del todo.
- Un **depósito de bajo monto** (Nequi, Daviplata) no lo paga hasta **65 UVT al mes** ($3.404.310), aparte de la anterior (art. 879 num. 25; Concepto DIAN 362 de 2024).
- Las **cuentas corrientes** no tienen la exención del num. 1.
- Los **traslados entre cuentas del mismo titular en el mismo banco** no lo pagan (art. 879 num. 14).

## Decisión

### D1. Cada cuenta tiene un régimen, y Finko lo deduce

`infra/gmf.js` (`regimenGMF`): el efectivo no aplica; Nequi y Daviplata son de bajo monto (exentas hasta 65 UVT); una corriente paga en cada retiro; una de ahorros (o una billetera que no es de bajo monto, como Nu o Lulo) paga salvo que sea **la marcada**, exenta hasta 350 UVT. Sobre lo que pase del tope del mes, también paga. El tope se mide con lo que la cuenta ya retiró en el mes (gastos que movieron su saldo y transferencias a otro banco).

### D2. "¿Es tu cuenta marcada exenta del 4x1000?", una sola

Al agregar o editar una cuenta que puede serlo, Finko lo pregunta (en el teléfono, una pregunta más; "casi siempre es la de nómina"). Solo puede haber una: marcar otra pregunta si la marca pasa a esta, y la de antes queda pagando. Las cuentas de antes que no lo dicen quedan **sin definir**: no se les cobra nada y Mis cuentas pregunta "¿Cuál es tu cuenta marcada exenta del 4x1000?" con la salida a esa cuenta, y editarla pide la respuesta. Una cuenta que antes tenía la casilla de pagar marcada sigue pagando (también un Nequi o Daviplata: se respeta lo que la persona dijo).

### D3. Las transferencias lo calculan solas

Sin casilla: entre cuentas del mismo banco no hay 4x1000; si el origen es la marcada o de bajo monto, solo paga lo que pase de su tope; si paga, el 0,4 %. La pista lo dice en vivo ("Se descontarán $800 de 4x1000...", "Entre tus cuentas de Bancolombia no se paga 4x1000.") y el registro guarda `costoGMF` como antes.

### D4. Los gastos y los pagos también (GMF.1b)

Un gasto (Día a día), el pago de un fijo o una deuda ("Marcar pagado", pagar varios) y el abono a una deuda que salen de una cuenta que paga guardan su `costoGMF` y lo descuentan con el monto. El recibo del teléfono dice "Incluye $400 de 4x1000" y Movimientos, "incluye $400 de 4x1000" en la fila y en el saldo de la cuenta. Editar recalcula el 4x1000 del gasto como queda; borrar y deshacer devuelven monto y 4x1000 juntos (`deltasPorEdicionDeGasto`).

Si el saldo no alcanza para el 4x1000 entero después del monto, se cuenta lo que alcance (`gmfDeRetiro`): Finko ya no deja registrar un monto mayor al saldo (ADR 163) y el 4x1000 no puede ser lo que deje la cuenta en negativo. Lo que reparte "Distribuir mi ingreso" todavía no lo descuenta: su cálculo de cuentas es aparte y queda para otra tarea.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Solo estimar el 4x1000 del mes | El saldo de Finko dejaría de cuadrar con el del banco; Esteban eligió descontarlo de verdad. |
| Repartir las 350 UVT entre todas las cuentas | La ley lo permite, pero los bancos todavía exigen marcar una; se revisará cuando el sistema del art. 881-1 funcione. |
| Preguntar en cada transferencia si paga | Es lo que la casilla hacía y nadie sabe de memoria cuánto lleva retirado en el mes. |
| Cobrarle a una cuenta de antes que no dijo nada | Podría ser su cuenta exenta: se pregunta antes de cobrar. |

## Consecuencias

- La UVT del año vigente (`UVT`, actualizada cada enero, tarjeta E.2) mueve los dos topes; una reforma tributaria se revisa con la tarjeta E.3.
- `aplica4x1000` se conserva como "paga en cada retiro" para lo que ya lo lee (el estimado del mes en Mis cuentas).

## Fuentes

- Actualícese, "Transacciones exentas del GMF en 2026"; INCP, "DIAN fijó en $52.374 el valor de la UVT para 2026"; INCP y Accounter sobre el Concepto DIAN 362 de 2024 (depósitos de bajo monto); DUR 1625 de 2016, art. 1.4.2.2.21 (traslados entre cuentas del mismo titular).
