# ADR 143 - Todo cambio de saldo deja registro

**Estado:** Aceptada (2026-11-15). Pedido en chat: "sigue con la siguiente tarea del tablero"; HF.1d esperaba su ADR. Las decisiones las toma Claude con la delegación de la sesión ("toma tú todas las decisiones que consideres que es lo mejor para la app").
**Fecha:** 2026-11-15
**Autores:** Esteban (el pedido y la delegación), Claude Opus 5.5 (diagnóstico, diseño e implementación)
**Relación:** **Aplica** la R-HF2 del [ADR 091](091-un-hecho-financiero-se-informa-una-vez.md) ("ningún saldo cambia sin un registro que lo explique") y cierra su riesgo 10 (el saldo igualado a mano). **Cambia** lo que decidió PE.7 para borrar un préstamo (no revertía porque no existía el historial de abonos, que llegó con PE.6b, [ADR 047](047-me-deben-v2-intereses-e-historial.md)). **Acota** el [ADR 012](012-auto-distribucion-ingresos.md) en la rebanada 2. Las filas nuevas se clasifican con el [ADR 139](139-la-naturaleza-de-un-gasto.md).

---

## Contexto

`Cuenta.saldo` es un valor guardado sin diario. Movimientos (`movimientos/logic.js`) arma su historial con lo que ya guardan los dominios, sin registro paralelo. Revisado en el código el 2026-11-15, estas rutas cambian un saldo y no dejan ninguna fila:

| Ruta | Qué hace hoy | Dónde |
|---|---|---|
| Le prestaste a alguien | descuenta el préstamo de su cuenta | `personales/index.js` |
| Recibí este dinero (D.14) | acredita el saldo de la deuda a una cuenta | `compromisos/index.js` |
| Editar el saldo de una cuenta | lo reemplaza | `tesoreria/acciones/cuentas.js` |
| Borrar un préstamo | borra sus filas y deja los saldos movidos | `personales/index.js` |
| Distribuir mi ingreso | acredita el cobro y mueve dinero entre cuentas | `tesoreria/acciones/distribucion.js` |

El préstamo y la deuda D.14 ya guardan todo lo necesario para su fila (cuenta, monto, fecha). El ajuste a mano no guarda nada. Borrar un préstamo se decidió en PE.7 sin revertir porque solo existía el acumulado `pagado`; desde PE.6b cada abono guarda su monto y su cuenta.

## Decisión

### D1. Un registro es una fila de Movimientos, y la prueba es la suma

Para cada cuenta: **saldo de hoy = saldo de apertura + lo que dicen sus filas**. El saldo de apertura no se guarda (I4 del 091 prohíbe inventar historial): es el saldo con que se creó la cuenta. `efectoEnCuenta(movimientos, cuentaId)` suma las filas de una cuenta (entra suma, sale resta; una transferencia resta del origen lo enviado más su 4x1000 y suma al destino lo que llegó) y cada ruta tiene una prueba de R-HF2.

### D2. Lo que ya está guardado se deriva (R-HF5)

- **Le prestaste**: un préstamo con `cuentaId` da una fila que sale ("Le prestaste a Mamá"), en su fecha y por su monto vigente (editar el monto ya ajusta la cuenta por la diferencia).
- **Recibiste el préstamo** (D.14): una deuda con `cuentaOrigenId` da una fila que entra por `montoAcreditado`, en la fecha en que se creó. Borrar la deuda ya revierte ese crédito.

Ninguna de las dos es un ingreso ni un consumo: Análisis, la renta y la tasa de ahorro no leen Movimientos, así que nada se cuenta dos veces.

### D3. Ajustar el saldo a mano deja su fila

Editar el saldo de una cuenta guarda un **ajuste**: colección `ajustesSaldo` (schema v49), con `cuentaId`, `fecha`, `monto` (con signo), `saldoAntes` y `saldoDespues`. En Movimientos es "Ajuste de saldo", entra o sale según el signo, en el dominio de Mis cuentas. No es ingreso ni gasto (ADR 139: no está en esas colecciones) y viaja a la nube como cualquier colección. Crear una cuenta con saldo no es un ajuste: es su apertura.

### D4. Borrar un préstamo devuelve su dinero (cambia PE.7)

Borrar un préstamo deja las cuentas como si no hubiera existido: el desembolso vuelve a su cuenta y cada abono sale de la cuenta donde entró. Un abono sin cuenta (el agrupado de la migración v34, o cobrado sin cuenta) no movió ninguna y no se revierte. La confirmación dice qué vuelve a dónde antes de borrar.

### D5. Cada abono nuevo tiene su id

El abono que registra "Me pagó" guarda `id`. Su fila de Movimientos usa ese id; los abonos de antes conservan el sintético (`préstamo:abono-N`). Es lo que necesitará deshacer un abono suelto, que hoy no tiene botón.

### D6. Rebanada 2 (HF.1d-2): Distribuir deja el ingreso y las transferencias

Distribuir guardará el cobro que acredita como `IngresoPuntual` (con `ingresoId` y la fecha de la ocurrencia) y el dinero que mueve entre cuentas como `transferencias`. Con eso se retira la guarda `config.cobrosDistribuidos` (HF.0h, HF.0i): el ingreso puntual la reemplaza solo para lo confirmado como recibido, por ocurrencia y no por mes, para que la segunda quincena distribuida siga saliendo.

## Lo que no cambia

Los formularios, la lógica financiera, Análisis, la renta y los saldos que ya existen. Ningún registro viejo se reescribe ni se completa hacia atrás (I4).

## Rebanadas

| Rebanada | Qué entrega |
|---|---|
| HF.1d-1 | D1 a D5: `efectoEnCuenta`, las filas del préstamo y de la deuda recibida, `ajustesSaldo` (v49), borrar un préstamo revierte, abonos con id, una prueba de R-HF2 por ruta |
| HF.1d-2 | D6: Distribuir con ingreso y transferencias; se retira `cobrosDistribuidos` |

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Un diario de saldo paralelo a los dominios | cada hecho quedaría escrito dos veces (R-HF1) y se desincronizaría al editar o borrar |
| Guardar el saldo de apertura en cada cuenta | se deriva: es el saldo de hoy menos sus filas; guardarlo pide migración y no aporta |
| El ajuste como gasto o ingreso puntual | contaría como consumo o como ingreso en Análisis, en la renta y en la tasa de ahorro |
| No permitir editar el saldo | quien concilia con su banco lo necesita; lo que faltaba era el registro, no la prohibición |
| Seguir sin revertir al borrar un préstamo | dejaba saldos movidos sin ninguna fila que los explique, justo lo que la R-HF2 prohíbe |

## Consecuencias

### Positivas

- Igualar el saldo al del banco ya no esconde nada: la diferencia queda con su fecha.
- Movimientos muestra lo prestado y lo recibido de una deuda: el historial de una cuenta cuadra con su saldo.
- Conciliar con un extracto (Fase 4 del 091) tiene por fin sobre qué apoyarse.

### Negativas / Restricciones

- Una colección nueva: migración v49, una clave más en el respaldo y en la nube.
- Borrar un préstamo cambia el saldo de las cuentas; la confirmación lo dice antes.
- Hasta HF.1d-2, Distribuir sigue acreditando sin fila.

## Resolución de HF.1d-2 en implementación (2026-11-15)

Pedido en chat: aplicar lo que sigue del tablero sin preguntar. Lo que el código pidió precisar de D6:

- **Dos campos opcionales en `IngresoPuntual`, sin migración.** `origen: 'distribucion'` (la fila la escribió Distribuir) y `repartido: true` (esa ocurrencia ya se repartió). Hacen falta los dos porque son preguntas distintas: la hoja de créditos descarta por ocurrencia solo lo que escribió Distribuir y sigue descartando por mes lo suyo; el asistente no vuelve a proponer nada repartido, venga de donde venga. Distribuir marca `repartido` en la fila de la hoja cuando reparte un cobro que la hoja ya había acreditado.
- **`config.cobrosDistribuidos` deja de escribirse, no de leerse.** Sus pares sin `yaAcreditado` son cobros que Distribuir acreditó sin fila: convertirlos en `IngresoPuntual` sería completar historial hacia atrás (I4) y con montos que no se guardaron (el caso "me pagaron otro valor"). Soltarlos haría que la hoja los ofreciera otra vez. Se siguen leyendo hasta que salgan de la ventana; la hoja solo mira dos meses y el asistente el último cobro. Borrar la lectura es limpieza de paso cuando ya no proteja nada.
- **Una fila por ocurrencia recibida**, en la fecha de esa ocurrencia y en la cuenta de origen. Con una sola ocurrencia la fila lleva lo acreditado (el valor que el usuario confirmó si llegó por otro monto); con "reparto solo una parte", el cobro completo, que es lo que entró.
- **Sin fecha datable** (Semanal, Diario, Variable) se acredita en una fila de hoy ligada al primer ingreso de la frecuencia principal: sin `ingresoId` la renta lo sumaría encima de la proyección del ingreso fijo (BUG-039). Sin ningún ingreso, la fila va sin `ingresoId`, como un ingreso puntual cualquiera.
- **Las transferencias** son las de Estilo de vida (origen a otra cuenta) y las del complemento del déficit (otra cuenta al origen), con la nota "Distribuir mi ingreso" y sin 4x1000, porque Distribuir no lo descuenta. "Deshacer" las quita junto con el ingreso, porque las dos colecciones entran a su copia.
- **Lo que sigue sin fila**: ~~los aportes a metas y reservas (HF.1c)~~ (tienen fila desde el [ADR 145](145-los-aportes-de-metas-y-reservas-tienen-fecha.md), 2026-11-15) y lo que cada dominio aplica por `distribucion:aplicar` fuera de metas y reservas. La prueba de R-HF2 de Distribuir cubre el cobro y la transferencia.
