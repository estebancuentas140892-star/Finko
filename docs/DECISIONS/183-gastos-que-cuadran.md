# ADR 183 - Gastos que cuadran: navegación, resúmenes, vencimientos, tarjetas y límites

**Estado:** Aceptada (2026-11-19).
**Fecha:** 2026-11-19
**Autores:** Esteban (pedido "Correcciones funcionales y lógica financiera, Gastos de Finko"), Claude Opus 5.5 (diagnóstico e implementación)
**Relación:** **Cambia** el [ADR 182](182-gastos-cada-cosa-con-su-forma-y-su-color.md) D4 (la segunda pestaña vuelve a ser Fijos, solo con los fijos) y la regla de vencimiento por mes de `detectarVencidosCompletos` (CAL.5b, HF.0d). Usa sin cambiarlo el modelo de tarjeta del [ADR 051](051-tarjeta-de-credito-producto-integrado.md). Lo visual lo define Claude Design: este ADR corrige el funcionamiento y la lógica, y deja los textos que la lógica necesita.

---

## Contexto

El pedido trae cinco problemas de funcionamiento en Gastos (teléfono) y pide integrar después el diseño que apruebe Claude Design:

1. Al cambiar de pestaña aparece una raya café arriba de Día a día y a veces un toque no hace nada.
2. El resumen de cada pestaña no siempre habla de su pestaña.
3. Un fijo mensual sin pagos desde julio dice "venció hace 4 días": se mira solo el mes en curso.
4. La tarjeta de crédito se registra desde Deudas; debe nacer y administrarse en Mis cuentas.
5. Límites debe sugerir un tope cuando el usuario registra varios gastos en una categoría sin límite, sin repetirse.

Lo que el diagnóstico del código encontró:

- **La raya café es la tarjeta compacta de Día a día** (`#gastos-compacta`, GAS.7c): fija bajo las pestañas, en el coral de antes (que se lee café). Su `IntersectionObserver` solo avisa cuando cambia el cruce: al irse a otra pestaña con la tarjeta grande ya fuera de la pantalla no avisa nada, y con la sección oculta la tarjeta mide 0 y el aviso decía "no se cruza, arriba": la compacta quedaba encendida y al volver se pintaba detrás de las pestañas (asoma su borde).
- **Las pestañas responden** en Chromium y en WebKit con toques (ocho cambios seguidos, con y sin desplazamiento): la marcada siempre es la que se ve. No hay `id` de la página que choque con los hash ni reglas de `:hover` que hagan pedir doble toque en iOS.
- **La tarjeta de crédito ya es un producto integrado** (ADR 051): un `Compromiso` `deuda-entidad` con `cupoTotal`; cada compra es un `Gasto` con `compromisoId` y `consumoTC` (sube la deuda, no toca ninguna cuenta) y cada pago es un abono (categoría "Deudas", baja la deuda y sale de una cuenta). Mis cuentas ya la muestra aparte con su disponible; el patrimonio la cuenta como pasivo. Lo que falta es la puerta de entrada y la administración.
- **El vencimiento es por mes**: `detectarVencidosCompletos` mira solo las fechas del mes en curso y `estadoPagoMes` dice si ese mes tiene un pago. Los meses anteriores sin pago no existen para nadie.

## Decisión

### D1. La compacta se apaga al navegar (GAS.9a)

La compacta solo se enciende cuando la tarjeta grande de Día a día salió por arriba **y se ve**: con la sección oculta (mide 0) se apaga. Al cambiar de hash se apaga en el acto y el observador vuelve a mirar desde cero, que siempre entrega un primer aviso con el estado de la pestaña a la que se llegó. Pasa a bosque, como el resumen al que resume (ADR 182 D1). La navegación de las pestañas no cambia: no tenía fallo que corregir; queda una prueba con toques que recorre las cuatro.

Al aplicarlo (GAS.9a): el aviso con la sección oculta llegaba solo cuando la tarjeta grande seguía a la vista; si ya estaba fuera, no había aviso. Por eso además del tamaño 0 hace falta el `hashchange`: apaga la compacta y la vuelve a observar (`_enlazarCompactaAlNavegar`, `gastos/view.js`). La prueba E2E recorre las cuatro pestañas con toques y mira la compacta en el primer cuadro de vuelta.

### D2. Cada pestaña con su resumen (GAS.9b)

- **Día a día** cuenta solo lo que se gastó en el día a día: además de las categorías internas, fuera todo pago de un fijo o de una deuda (`compromisoId` sin `consumoTC`). Una compra con tarjeta sí es día a día.
- **Fijos** (la segunda pestaña vuelve a llamarse así y a listar solo fijos): la tarjeta, la lista, el lote y "Pagaste $X de $Y" hablan solo de fijos. Las cuotas de las deudas viven en Deudas.
- **Deudas**: lo que debes hoy y, del mes elegido, cuánto de las cuotas se pagó.
- **Límites**: lo usado de los límites en el mes elegido (ya era así).

El mes del encabezado manda en las cuatro.

Al aplicarlo (GAS.9b): el criterio de Día a día vive en una función pura, `esDelDiaADia` (`gastos/logic.js`), que usan la tarjeta y la hoja de meses. "Por pagar" (`#compromisos`) en el teléfono cae en la pestaña que pidió quien llega; si no pidió ninguna, en la que tiene algo vencido (`lentePorPagar`). Las pastillas de las pestañas cuentan por tipo: vencidos de Fijos en Fijos y cuotas vencidas en Deudas.

### D3. El vencimiento se cuenta desde el último pago (GAS.9c)

Una obligación tiene sus fechas (desde su creación, según su frecuencia) y sus pagos (gastos con su `compromisoId`, sin las compras con tarjeta). **El último pago cubre la fecha de su propio mes** (o la última fecha anterior a él) **y todo lo de antes**: quien registró la mensualidad de noviembre está al día aunque no haya anotado las de antes. Lo que cae después de esa fecha y ya pasó está pendiente; sin pagos, todo desde la creación. Así:

- Disney+ mensual del 15 de julio sin pagos: pendientes julio a noviembre, vencido **desde el 15 de julio**, cinco pagos.
- Pagar la mensualidad lo deja al día; pagar otra vez en el mismo mes no cubre dos.
- Una deuda con abonos que no completan la cuota del mes sigue pendiente por lo que falta.

Al aplicarlo (GAS.9c): la regla vive en `pendientesDeObligacion` (`compromisos/logic/alertas.js`) y `vencidosSinPagar` la usa: cada vencido trae `pendientes`, `desde` y `montoPendiente`, y su atraso se cuenta desde `desde`. `pagosPendientesDelMes` suma lo vencido de meses anteriores aunque su fecha de este mes no haya llegado, así el lote, Inicio y el Calendario lo ven. Un atraso de 31 días o más se dice en meses ("Venció hace 4 meses"); la franja de Día a día dice cuántos pagos y lo que suman. Pagar registra una mensualidad con la fecha de hoy y deja la obligación al día: Finko no registra a la fuerza los meses de antes, porque no sabe si se pagaron por fuera. En los avisos, una obligación vencida no avisa además "vence en N días" si esa fecha es de este mes (el mismo pago la cubre); si es del mes siguiente, son dos pagos y avisa los dos. Las pruebas de ADR anteriores creaban sus fijos en 2020 o 2025 sin pagos: ahora nacen en el ciclo del escenario.

### D4. La tarjeta de crédito nace en Mis cuentas (GAS.9d)

Sin cambiar el modelo del ADR 051: "Agregar cuenta" (Efectivo, Cuenta de ahorros, Cuenta corriente, Tarjeta de crédito) es la única puerta para crear una tarjeta; Deudas deja de ofrecerla y su fila manda a administrarla en Mis cuentas. Las tarjetas de antes siguen iguales: son los mismos compromisos.

Al aplicarlo (GAS.9d): el formulario de una deuda nueva sin `data-desde="cuentas"` no trae el chip "Tarjeta de crédito" y dice "¿Es una tarjeta de crédito? Agrégala en Mis cuentas" (`tc-agregar`: en el teléfono abre "Agregar cuenta" con la tarjeta elegida; en escritorio, el formulario de la tarjeta). Al editar, el chip sale solo si la deuda ya es una tarjeta. La fila de la tarjeta en Mis cuentas abre la misma hoja que en Deudas (`compromiso-detalle`), que ahora dice el cupo y el disponible y lleva a Mis cuentas o a su deuda según dónde se abra. Revisado el modelo: el cupo no suma al dinero de las cuentas ni al patrimonio, una compra (`consumoTC`) sube la deuda sin tocar cuentas y cuenta una vez como gasto, y el pago baja la deuda sin volver a contarse. Las tarjetas guardadas antes siguen iguales; una deuda de categoría tarjeta sin cupo (capturada a posteriori) sigue en Deudas y no sale en Mis cuentas.

### D5. Límites sugiere al registrar, una vez (GAS.9e)

Al guardar un gasto, si su categoría no tiene límite (ni uno por subcategoría que lo cubra), lleva tres gastos o más en el mes y la sugerencia no se mostró ni se descartó en ese mes para esa categoría, Finko lo dice una vez. Si una subcategoría pesa la mayor parte, la sugerencia es para esa parte ("Solo una parte", ADR 182 D7).

Al aplicarlo (GAS.9e): la regla es `sugerenciaDeLimiteAlRegistrar` (`presupuesto/logic.js`). Cuenta solo el día a día (`esDelDiaADia`: fuera los pagos de fijos y deudas; la compra con tarjeta sí), desde tres gastos en el mes del gasto, en una categoría que admite límite (las del usuario también) y sin ningún límite activo en ella, ni de una parte: quien ya puso uno decidió. La parte se sugiere si pesa más de la mitad y hay gasto en otra. Se recuerda por mes en `S.config.limiteSugerenciasVistas` (solo las del mes) y como mucho una al día (`limiteSugerenciaUltimoDia`); el "Ahora no" de Límites también la apaga. Mientras llega el diseño se dice en el aviso con Tino de siempre, después del aviso del gasto; "Poner límite" abre Nuevo límite con la categoría (y la parte) puestas, y cerrarlo es "ahora no".

### D6. El diseño de Claude Design

Cuando llegue el tablero aprobado (Día a día, Fijos, Deudas, Límites y Agregar cuenta) se aplica tal cual sobre esta lógica, sin otra propuesta.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Ocultar la raya con CSS | Es la compacta encendida a destiempo: se corrige su estado, no su dibujo. |
| Mantener Por pagar con fijos y cuotas (ADR 182 D4) | El pedido pide que cada pestaña tenga solo lo suyo; las cuotas ya se ven en Deudas. |
| Asignar cada pago a la fecha pendiente más vieja | Quien no anotó los meses de antes quedaría siempre atrasado aunque pague al día. |
| Un tipo de cuenta "tarjeta de crédito" en `S.cuentas` | El ADR 051 lo descartó: su saldo se sumaría como dinero propio. |
