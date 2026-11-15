# ADR 145 - Los aportes a metas y reservas tienen fecha, y "Ya lo usé" deja su gasto

**Estado:** Aceptada (2026-11-15). Pedido en chat: hacer las tareas del tablero que no esperan a nadie, sin preguntar ("no me realices preguntas solo termina las tareas pendientes"); HF.1c esperaba este ADR.
**Fecha:** 2026-11-15
**Autores:** Esteban (el pedido y la delegación), Claude Opus 5.5 (diagnóstico, diseño e implementación)
**Relación:** **Aplica** la R-HF2 del [ADR 091](091-un-hecho-financiero-se-informa-una-vez.md) ("ningún saldo cambia sin un registro que lo explique") a la última ruta que el [ADR 143](143-todo-cambio-de-saldo-deja-registro.md) dejó sin fila. **Resuelve V5** del [ADR 083](083-reservas-el-orden-que-el-dominio-ya-tenia-escrito.md) ("Ya lo usé" cierra el ciclo sin registrar el gasto). Sigue el precedente del Fondo, que ya guarda `ahorro.aportes[]` fechados, y la I4 del 091 (no se inventa historia).

---

## Contexto

Revisado en el código el 2026-11-15:

- Aportar a una meta o a una reserva (`metas/index.js`, `apartados/index.js`) suma a `montoActual` y descuenta la cuenta por `splits`. Distribuir hace lo mismo por `distribucion:aplicar`, con el descuento centralizado en `tesoreria/acciones/distribucion.js`. **Ninguno deja una fila**: la cuenta baja y Movimientos no dice por qué. Es lo que el ADR 143 dejó anotado como "lo que sigue sin fila".
- "Ya lo usé" (`_reiniciarApartado`) devuelve la reserva a cero o a su excedente y no registra nada: el SOAT que la reserva existía para pagar no aparece en Gastos, ni en Movimientos, ni en el reparto por categoría de Análisis.

## Decisión

### D1. Cada aporte es una fila: `aportes[]` en la meta y en la reserva (schema v50)

`{ id, fecha, monto, cuentaId, origen? }`. Una fila por cuenta de donde salió el dinero (un aporte repartido entre dos cuentas deja dos). Sin cuentas activas, una fila con `cuentaId: null` (el aporte vale como seguimiento, como siempre). Lo que llega por Distribuir lleva la cuenta de origen del reparto y `origen: 'distribucion'`.

`montoActual` sigue siendo el saldo de la meta o reserva y la fuente de verdad de su progreso. `aportes[]` es la historia que lo explica desde la v50.

### D2. Sin reconstrucción: lo anterior es saldo de apertura

La migración v49 a v50 pone `aportes: []` en cada meta y reserva que no lo tenga, y conserva uno que ya sea arreglo. No inventa filas para el `montoActual` que ya existía (I4 del 091): ese dinero queda como saldo de apertura, igual que el saldo inicial de una cuenta en el ADR 143.

### D3. En Movimientos, un aporte es un traslado: neutro y con su cuenta

Dos fuentes nuevas: `aporte-meta` (dominio `metas`) y `aporte-reserva` (dominio `ahorro`, el color de las reservas). Dirección `neutro`, como la transferencia y el aporte al Fondo: el dinero sigue siendo de la persona, cambia de bolsillo. No suma a Entrada ni a Salida. `efectoEnCuenta()` lo resta de su cuenta, así la R-HF2 se cumple: saldo de hoy = apertura + filas.

### D4. "Ya lo usé" registra el gasto, sin tocar las cuentas (V5)

Al confirmar, la reserva deja un `Gasto` por lo que se liberó: `descripcion` = el nombre de la reserva, `categoria` "Otros", fecha de hoy, `apartadoId` y `sinEfectoSaldo: true`. Ese dinero ya salió de las cuentas cuando se apartó: descontarlo otra vez lo cobraría dos veces. La persona puede cambiar la categoría desde Gastos (editar no toca el saldo de un gasto `sinEfectoSaldo`). El diálogo lo dice antes de confirmar. Si no se liberó nada, no hay gasto.

`sinEfectoSaldo` deja de significar solo "vino del importador" (HF.0c): significa "registra un gasto cuyo dinero ya salió de las cuentas por otra fila".

## Fuera de alcance

- Borrar o editar un aporte desde su fila (Movimientos no ofrece acciones para estos tipos; es el mismo criterio que el ingreso y el aporte al Fondo antes de EDIT.1).
- Lo que pasa con el dinero al borrar una meta o una reserva, o al cumplir una meta (riesgo 7 del 091).
- Elegir la categoría del gasto dentro del diálogo de "Ya lo usé".

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Aporte como `egreso` en Movimientos | sumaría a "Salida" y al CSV del mes como gasto un dinero que sigue siendo de la persona |
| Reconstruir aportes desde `montoActual` | inventa fechas y cuentas (I4 del 091) |
| `montoActual` derivado de `aportes[]` | rompe a todo usuario con saldo previo a la v50 y a cada lector de `montoActual` |
| "Ya lo usé" descuenta la cuenta | el dinero ya salió al aportarlo: sería un doble cobro |
