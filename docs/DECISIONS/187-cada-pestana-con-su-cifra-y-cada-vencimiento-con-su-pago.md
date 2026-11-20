# ADR 187 - Cada pestaña con su cifra y cada vencimiento con su pago

**Estado:** Aceptada (2026-11-20).
**Fecha:** 2026-11-20
**Autores:** Esteban (pedido "Correcciones de cálculos y vencimientos, Gastos de Finko", 2026-11-20, y las tres decisiones de D2 a D4), Claude Opus 5.5 (diagnóstico e implementación)
**Relación:** **Cambia** el [ADR 183](183-gastos-que-cuadran.md) D3 para los gastos fijos: el último pago ya no cubre lo de antes; las deudas siguen con esa regla. Completa el ADR 183 D2 (la hoja de meses, los meses pasados de Fijos y Límites). Usa sin cambiarlo el motor de fechas del [ADR 041](041-motor-vencimientos-y-distribucion-v2.md) y la fecha de un pago de un mes pasado de BUG-015. Sin cambios de diseño salvo los dos campos que D3 y D4 necesitan.

---

## Contexto

El pedido trae dos problemas: (1) el resumen de cada apartado de Gastos no siempre habla solo de su apartado, y (2) Disney+, mensual desde el 15 de julio y sin pagos, dice "venció hace 5 días": parece tomar el 15 de noviembre como si fuera el último pago.

Lo que el diagnóstico del código encontró (sobre `origin/main`, GAS.11d):

- **Día a día y Deudas ya cuentan solo lo suyo** (GAS.9b): `esDelDiaADia` deja fuera todo pago de un fijo o de una deuda, y la tarjeta de Deudas suma saldos y abonos. Inicio, Análisis, Movimientos y los saldos no leen estos resúmenes.
- **Lo que todavía mezcla:**
  - La hoja "Elige el mes" se abre desde las cuatro tarjetas y en las cuatro dice lo del día a día ("Lo que gastaste cada mes, sin contar fijos ni deudas").
  - Fijos en un mes pasado lista como "Quedó sin pagar" todos los fijos activos: también los que se crearon después y los que no caen ese mes (anual, bimestral), y cuenta un solo pago aunque el fijo sea quincenal o semanal.
  - "Pagaste $X de $Y" en Fijos suma solo los pagos de los fijos que quedaron al día ese mes.
  - Límites cuenta en su categoría el pago de un fijo o de una deuda si se le cambió la categoría a mano (Día a día no lo cuenta), y su lista de categorías sin límite trae lo pagado en fijos y en deudas.
- **Los vencimientos:**
  - La hoja del fijo dice "Venció el sábado 15": la fecha de este mes, aunque lo pendiente empiece en julio.
  - Lo vencido vale una mensualidad aunque falten cinco, y pagar una deja todo al día (ADR 183 D3): los vencimientos anteriores desaparecen.
  - El estado de pago es por mes: un pago deja pagadas las dos quincenas o las cuatro semanas.
  - La notificación del sistema dice "venció hace 128 días".
  - La fecha de inicio es el alta del registro: un anual cae siempre en el mes en que se creó, y no se puede decir "desde el 15 de julio" si se registra después.
  - Un pago de un mes pasado se fecha en el vencimiento de ese mes (BUG-015): la fecha del gasto es la del periodo. Se conserva, porque Análisis y los meses de Fijos cuentan por esa fecha.

## Decisión

### D1. Cada pestaña con su cifra (GAS.12a)

- **La hoja de meses habla de la pestaña que la abre:** Día a día, lo gastado en el día a día; Fijos, lo pagado en gastos fijos; Deudas, lo abonado a deudas; Límites, lo gastado en las categorías con límite. Cada una con su ojo.
- **Fijos en un mes** lista solo los fijos con un vencimiento ese mes (desde su inicio), y cada vencimiento con su monto: un quincenal son dos. "Pagaste" suma todos los pagos de fijos del mes.
- **Límites cuenta lo mismo que Día a día** (`esDelDiaADia`): un pago de un fijo o de una deuda no gasta un límite, y "Otras categorías sin límite" ya no trae la fila de lo pagado en fijos o en deudas ("Gastos fijos · Se controla en Fijos", ADR 179 D6). Una categoría retirada del día a día (Vivienda) conserva su enlace a Fijos.
- El mes del encabezado manda en las cuatro, como hasta ahora.

### D2. Cada pago salda el vencimiento más antiguo (GAS.12b)

Para los **gastos fijos**:

- Un fijo tiene sus vencimientos desde su inicio, según su frecuencia (el motor del ADR 041). **Cada pago cubre un vencimiento, del más viejo al más nuevo.** Lo que sobra cubre los siguientes: un pago adelantado.
- Un pago es un gasto con el `compromisoId` del fijo, o varios con el mismo `operacionId` (repartido entre cuentas). `Gasto.periodos` (nuevo, opcional, 1 si falta) dice cuántos vencimientos cubre un pago.
- Un pago hecho antes del primer vencimiento cubre el de su propio mes si cae antes del inicio (quien registra el fijo el 18 y anota que ya pagó el del 15), sin volver pendiente ningún mes anterior al registro.
- **Pendiente** es todo vencimiento que ya pasó (hoy incluido) sin pago. El atraso se cuenta desde el más viejo, y lo vencido dice cuántos son y lo que suman.
- Un mes está pagado cuando todos sus vencimientos lo están, y el Calendario marca cada vencimiento con lo suyo.
- "Marcar pagado" paga uno (el más viejo); "Pagar los N" del lote paga todos los pendientes de cada fijo marcado, en un solo gasto con su `periodos`.

Las **deudas** siguen con el ADR 183 D3: su saldo es lo que se debe, y un abono que completa la cuota del mes deja la deuda al día.

### D3. "Ya lo había pagado" (GAS.12c)

En la hoja de un fijo con vencimientos pendientes, una acción registra como pagados los que ya se pagaron por fuera de Finko, del más viejo al más nuevo: un gasto por vencimiento, con su fecha, sin cuenta y con `sinEfectoSaldo` (el mecanismo de lo importado, HF.0c). No toca ningún saldo; Fijos y Análisis lo cuentan en su mes, porque ahí se pagó.

### D4. La fecha del primer pago (GAS.12d)

`Compromiso.fechaInicio` (nuevo, opcional, solo fijos): la fecha del primer vencimiento. En "Cuándo", un campo de fecha opcional. Con ella manda sobre `fechaCreacion` para el ciclo (el mes de un anual, el día de un semanal) y para desde cuándo hay vencimientos, y el día de pago sale de ella. Sin ella, todo sigue como hoy.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Mantener la regla del ADR 183 D3 en los fijos | El pedido pide no perder los vencimientos anteriores ni sobrescribir lo que no se ha pagado. |
| Cada pago cubre el vencimiento de su propio mes | El arriendo del 30 pagado el 2 dejaría vencido el mes anterior y "pagado" uno que no ha llegado. |
| Pagar varios vencimientos como varios gastos del mismo día | Llena Movimientos de filas iguales; `periodos` dice lo mismo en un registro. |
| Un "cubierto hasta" en el compromiso | Es un dato que no es un pago y que habría que mantener al editar o deshacer un pago. |
| Mover a hoy la fecha del pago de un mes pasado | Cambiaría el mes en que Análisis y Fijos cuentan ese pago. |
| Saldar lo pagado por fuera descontando la cuenta | La cuenta ya refleja lo que el banco dice: se descontaría dos veces. |

## Consecuencias

- Cuatro rebanadas, cada una con su commit y su push: GAS.12a (D1), GAS.12b (D2), GAS.12c (D3) y GAS.12d (D4).
- Sin migración: los gastos y los fijos guardados no cambian. Con D2 puede volver a verse pendiente un vencimiento viejo que la regla anterior daba por cubierto (quien no anotó un mes, o un quincenal pagado una vez al mes): D3 es la salida sin mover dinero.
- La fila vencida, el lote, Atención hoy y el Calendario dicen la misma cifra: todos los vencimientos pendientes, no uno.
- Los saldos de las cuentas solo cambian cuando se paga, como antes; "Ya lo había pagado" no los toca.
