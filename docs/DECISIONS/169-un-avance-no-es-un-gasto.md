# ADR 169 - Un avance no es un gasto: la tarjeta presta y la cuenta recibe

**Estado:** Aceptada (2026-11-18). Pedido "Revisión de servicios, categorías y movimientos", punto 10: que Finko no se limite a registrar el avance y ayude a entender lo que cuesta. La propuesta salió de esa revisión y se aprobó en chat el mismo día: "Sí, empieza por avances".
**Fecha:** 2026-11-18
**Autores:** el pedido de revisión (producto), Claude Opus 5.5 (investigación, análisis del modelo y diseño)
**Relación:** **Cambia** el [ADR 051](051-tarjeta-de-credito-producto-integrado.md) D7 en lo que toca al avance: deja de ser solo la marca `avanceTC` de un consumo. Conserva D2 (saldo revolvente), D3 (el consumo es un gasto), D5 (el cupo nunca es activo) y los otros dos avisos de D7 (retiro en otra red y pago mínimo). **Reusa** el patrón D.14 "Recibí este dinero" (una deuda que acredita una cuenta), la fila que entra del [ADR 143](143-todo-cambio-de-saldo-deja-registro.md) D2, el deshacer del [ADR 154](154-deshacer-un-movimiento.md) y el aviso de saldo del [ADR 163](163-ninguna-cuenta-por-debajo-de-cero.md). Cumple las invariantes I3 a I5 del [ADR 053](053-invariante-de-patrimonio.md). Respeta el [ADR 101](101-finko-del-adulto-decide-no-ensena.md) (el adulto decide, no recibe lecciones) y el [ADR 004](004-eliminar-tasa-usura.md) (sin constantes de alta frecuencia). El patrón entra al motor del [ADR 066](066-motor-unico-de-avisos.md).

---

## Contexto

Hoy (MC.16e) un avance se registra como un gasto pagado con la tarjeta, con el interruptor "Fue un avance en efectivo". Marcarlo solo muestra un aviso ("Un avance cobra intereses desde el mismo día que lo retiras...") y no cambia ningún cálculo.

Ese modelo sirve para un solo caso: el avance que le paga directo a otra persona (desde octubre de 2026, Nu envía el avance por Bre-B a cualquier cuenta). En el caso común está mal. **Cuando el dinero llega a ti** (efectivo del cajero, tu Nequi), el avance no es un gasto: la deuda de la tarjeta sube y tu dinero sube lo mismo. El gasto ocurre después, cuando usas ese dinero. Hoy el efectivo del avance no entra a ninguna cuenta: si se reparte en mercado, transporte y un pago, el registro queda falso (todo en una categoría) o no se registra.

**Investigación (noviembre de 2026):**

- Los intereses corren desde el primer día, sin el beneficio de una compra a una cuota (centro de ayuda de Bancolombia).
- En Bancolombia, el avance por app o cajero se difiere a 24 meses fijos; en oficina, de 1 a 36. Comisión sin IVA: $7.400 por app, $8.294 por cajero, $16.300 por corresponsal (tarifario de noviembre). Davivienda, Serfinanza y Nu cobran entre $6.800 y $12.000.
- Tasa promedio de las tarjetas: 22,93 % EA (Superfinanciera, junio de 2026). Usura de noviembre: 28,34 % EA.
- **Ejemplo:** $500.000 por cajero, a 24 meses y 22,93 % EA: cuota de $25.649, $115.586 de intereses y $9.870 de comisión con IVA. Usar $500.000 cuesta $125.456.
- Los préstamos de Nequi ("Salvavidas", crédito de libre inversión) son créditos con cuotas, no avances de una tarjeta.

**Lo que ya existe y se reusa:**

- D.14: crear una deuda con "Recibí este dinero" acredita una cuenta (`cuentaOrigenId`, `montoAcreditado`) y borrarla lo revierte. Desde el ADR 143 deja una fila que entra.
- `simularPagoDeuda` (`compromisos/logic/estrategia.js`) simula mes a mes con la tasa EA.
- La transferencia guarda su costo aparte (`costoGMF`): sale el monto más el costo, llega el monto.

---

## Decisión

### D1. Sacar un avance es una operación de la tarjeta

Una tarjeta operable (con `cupoTotal`, ADR 051 D1) ofrece **"Sacar un avance"** junto a "Abonar", en su fila de Por pagar y en su hoja. Una deuda de tarjeta sin cupo no lo ofrece. El formulario es de mover dinero (ADR 142) y pide, en este orden:

1. **¿Cuánto sacaste?** con el teclado de Finko.
2. **¿A dónde llegó?** las cuentas de dinero, con Efectivo primero. Si no existe la cuenta Efectivo, elegirla la crea.
3. **¿A cuántas cuotas?** 1, 2, 3, 6, 9, 12, 18, 24 o 36, sin ninguna marcada: el plazo cambia el costo y lo decide quien lo sacó.
4. **¿Cuánto te cobraron de comisión?** opcional: lo que dice el banco, con IVA. Finko no guarda una tabla de comisiones por banco (ADR 004: cambian cada semestre y no hay quién las mantenga).

Si la tarjeta no tiene tasa, se pide antes del costo ("¿Qué tasa tiene tu tarjeta? Está en el extracto, como EA") y se guarda en la tarjeta. Si el avance pasa el cupo disponible, sale el mismo aviso de sobrecupo del consumo.

### D2. Antes de guardar, el costo en pesos

La revisión del formulario dice el costo en cifras, no en porcentaje:

> Este avance te cuesta unos **$125.500**: $115.600 de intereses en 24 cuotas de $25.649 y $9.870 de comisión. Pagarás $625.400 por $500.000.

`costoDeAvance({ monto, tasaEA, cuotas, comision })`, función pura de `compromisos/logic`, da la cuota fija (sistema francés, el que usan los bancos), los intereses y el total. Con tasa 0, la cuota es `monto / cuotas` y los intereses son 0.

Sin pregunta, sin confirmación doble y sin bloqueo: la persona ya decidió o ya sacó el dinero, y Finko le pone la cifra delante. El aviso explica el costo, no juzga (ADR 051 D7).

### D3. La alternativa que ya tiene

Si el Fondo de emergencia está activo y tiene dinero, una línea bajo el costo: "Tu fondo de emergencia tiene $N. Es para esto." Sin fondo, nada: ni regaño ni invitación a crearlo. El formulario lee `fondoEmergencia` del estado sin importar el dominio de Ahorro ([ADR 060](060-lectura-cross-domain-de-solo-lectura.md)).

### D4. Lo que cambia en el dinero

Al guardar, una sola operación:

| Qué | Cambio |
|---|---|
| Cuenta de destino | sube el monto |
| `saldoTotal` de la tarjeta | sube el monto más la comisión |
| `cuotaMensual` de la tarjeta | sube la cuota de D2, con intereses |
| Patrimonio | baja solo la comisión |

La cuota del avance lleva intereses porque corren desde el primer día y es la cifra que la persona vio en D2. El consumo con tarjeta sigue sumando `monto / cuotas` (MC.16d): este ADR no lo toca.

**Ni el avance ni la comisión son un gasto.** El dinero se gasta después, desde la cuenta, con su categoría. La comisión y los intereses se pagan con los abonos a la tarjeta, que ya son gastos ([ADR 002](002-abono-deudas.md)): registrar la comisión también como gasto la contaría dos veces ([ADR 091](091-un-hecho-financiero-se-informa-una-vez.md)). Es el mismo trato del 4x1000 de una transferencia.

### D5. Dónde queda escrito

**`Compromiso.avances`** (schema v56): una lista dentro de la tarjeta, como los aportes de una reserva ([ADR 145](145-los-aportes-de-metas-y-reservas-tienen-fecha.md)) y los abonos de un préstamo ([ADR 047](047-me-deben-v2-intereses-e-historial.md)). Cada avance guarda `id`, `fecha`, `monto`, `cuentaId`, `cuotas`, `cuota` (lo que sumó a `cuotaMensual`) y `comision`. Migración sin cambios de datos: una tarjeta sin la lista no tiene avances.

En Movimientos es una fila que **entra** a la cuenta de destino ("Avance de Visa Bancolombia"), en el dominio de Por pagar y en su fecha, como la deuda recibida del ADR 143 D2. No es ingreso: Análisis, la renta y la tasa de ahorro no leen Movimientos. `efectoEnCuenta` la suma, con su prueba de R-HF2 ("ningún saldo cambia sin un registro que lo explique").

### D6. Deshacer, no editar

"Deshacer movimiento" (ADR 154), desde Movimientos o desde la hoja de la tarjeta, quita el avance y devuelve sus efectos como deltas: la cuenta baja el monto y la tarjeta baja el monto, la comisión y la cuota. `planDeshacer` no lo permite cuando:

- **La cuenta ya no tiene el monto:** ese dinero se usó, y deshacer dejaría la cuenta bajo $0 (ADR 163). "Ese dinero ya salió de Efectivo. Si el avance está mal, corrige primero lo que pagaste con él."
- **La tarjeta ya se pagó por debajo del avance:** el mismo caso de la compra ya pagada (ADR 154 D4).

Un avance no se edita: se deshace y se vuelve a sacar, como la transferencia (MC.17f).

### D7. La marca del gasto se queda para el avance que paga directo

El interruptor del gasto con tarjeta sigue, para el avance que llega directo a otra persona, con otro texto: **"Lo pagué con un avance"**. Su aviso conserva el costo y agrega: "Si el dinero llegó a tu cuenta o lo sacaste en efectivo, regístralo en la tarjeta, con Sacar un avance."

Los gastos ya guardados con `avanceTC` no se migran: nada dice a qué cuenta llegó el dinero, y adivinarlo sería inventar el dato (I4 del ADR 053).

### D8. El patrón, no el caso

Dos o más avances en 90 días, contando los de D5 y los gastos con `avanceTC`, dan un aviso: "Llevas 3 avances en tres meses: es señal de que el mes no alcanza", con el botón "Ver tu plan de salida". La detección es una función pura de `compromisos/logic` (`avancesRecientes`) y el motor del ADR 066 solo la compone (066 D3). Severidad media: no dispara notificación del sistema (066 D5). Un solo aviso para todas las tarjetas.

### D9. Lo que no cambia

- **El monitor de renta.** Si los avances cuentan para la DIAN como consumos con tarjeta se decide aparte; hoy no se suman.
- **Los préstamos de las apps** siguen siendo deudas, no avances.
- **"Retirar efectivo"** (propuesta 11c de la revisión) es otra tarjeta del tablero. Cuando exista, elegir una tarjeta de crédito como origen lleva a este formulario.

---

## Rebanadas

| Rebanada | Qué entrega |
|---|---|
| AVC.1a | D4 a D6: schema v56, `costoDeAvance`, aplicar y deshacer como funciones puras, la fila de Movimientos y su prueba de R-HF2. Sin pantalla |
| AVC.1b | D1 a D3 y D7: "Sacar un avance" en la tarjeta (teléfono y escritorio), el costo, la línea del fondo y el texto nuevo del interruptor |
| AVC.1c | D8: el aviso del patrón en el motor único |

---

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Dejar el avance como gasto y solo mejorar el aviso | Mantiene el error de modelo: el efectivo no entra a ninguna cuenta y todo queda en una categoría |
| La transferencia con la tarjeta como origen | Tesorería tendría que mover deudas: es la alternativa A que el ADR 051 rechazó |
| Una deuda nueva por cada avance (D.14 tal cual) | Una fila más en Por pagar por avance; contradice el saldo revolvente del ADR 051 D2 |
| La comisión como gasto aparte | Se contaría dos veces: al sacar el avance y al abonar a la tarjeta |
| Una tabla de comisiones o la usura para calcular sin preguntar | ADR 004: constantes de alta frecuencia sin quién las mantenga |
| Sumar `monto / cuotas` a la cuota, como el consumo | Mostraría una cuota sin intereses justo en el producto que los cobra desde el primer día |
| Confirmación doble o bloqueo | La persona ya sacó el dinero: registrarlo bien es lo que la ayuda |
| Una lección sobre avances | ADR 101: el adulto ve la cifra al decidir, no un curso |

---

## Consecuencias

### Positivas

- El efectivo de un avance aparece donde está, y lo que se paga con él tiene su categoría.
- La persona ve cuánto le cuesta antes de guardar, en pesos y con la tasa de su tarjeta.
- Por pagar muestra la cuota real de la tarjeta después del avance.

### Negativas / Restricciones

- Un campo nuevo en la tarjeta (schema v56) y una fuente más en Movimientos.
- El costo es una estimación con la tasa que escribió el usuario: si el banco la cambia, el costo real cambia.
- Si el usuario no escribe la comisión, el costo solo muestra los intereses.
