# ADR 163 - Ninguna cuenta queda por debajo de $0

**Estado:** Aceptada (2026-11-17).
**Fecha:** 2026-11-17
**Autores:** Esteban (pedido "Gastos día a día", punto 4, y su respuesta en chat: "Sí, en todo Finko"), Claude Opus 5.5 (implementación)
**Relación:** **Extiende** el [ADR 161](161-dia-a-dia-tino-anota-sin-flecha.md) D2 (el gasto) a todo movimiento que saca dinero de una cuenta. **Cambia** el criterio de INV.1 ("el saldo no alcanza: se confirma el sobregiro en vez de bloquearlo") y de MC.17 (transferir "igual"). Conserva "Completa el pago" ([ADR 153](153-inicio-control-del-pago-y-desplegable-de-cuentas.md)): con varias cuentas el reparto sigue, sin dejar ninguna en negativo.

---

## Contexto

GAS.5b dejó de registrar gastos que la cuenta no cubre. Los demás movimientos todavía preguntaban "quedará en negativo, ¿registrar de todas formas?" cuando había una sola cuenta: el pago de un fijo ("Marcar pagado"), el abono a una deuda, el pago de varios a la vez, el aporte a una meta o a un apartado, registrar o subir una inversión, subir un préstamo a una persona y transferir. Esteban pidió la misma regla en toda la app.

## Decisión

### D1. Si no alcanza, se dice por qué y no se registra

Los nueve puntos usan el mismo aviso, con un solo botón ("Entendido") y sin "registrar igual": "Nequi tiene $50.000 y esto necesita $200.000: faltan $150.000. Finko no deja una cuenta por debajo de $0. Elige otra cuenta o, si tu saldo real es mayor, actualízalo en Mis cuentas." (`mensajeSinSaldo`, `infra/cuenta-helper.js`). La transferencia suma su 4x1000 al monto y lo dice.

La última frase responde la razón que tenía INV.1 para confirmar: la cifra de la app puede estar atrasada. Corregirla en Mis cuentas deja rastro (ADR 143) y no esconde un saldo imposible.

### D2. Lo que no cambia

- Con varias cuentas, "Completa el pago" reparte sin dejar ninguna en negativo y no confirma sin cubrir el total.
- Un consumo con tarjeta sale del cupo, no de una cuenta: lo cuida su aviso de sobrecupo.
- Una cuenta que ya estaba en negativo (dato viejo) no bloquea otras ediciones: se mide lo que el movimiento saca.
- Las funciones puras (`calcularTransferencia`, `aplicarGastoASaldo`) siguen aceptando un saldo negativo: la regla vive en la interfaz, donde se puede explicar.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Seguir confirmando el sobregiro | Es lo que el pedido corrige: una cuenta de ahorros o un bolsillo no queda en negativo. |
| Bloquear en las funciones puras | Romperían importaciones y correcciones de saldo viejas; la interfaz es la que puede decir qué hacer. |
| Un aviso distinto por sección | Nueve textos que se desalinean; uno solo dice lo mismo en toda la app. |

## Consecuencias

- Quien lleva la app con saldos atrasados verá el aviso más seguido: la salida es corregir el saldo en Mis cuentas, una vez.
