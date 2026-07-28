# ADR 051 - Tarjeta de crédito como producto integrado (cuentas y deudas)

**Estado:** **Aceptada** (alternativa B, decidida por Esteban el 2026-07-27). Tarjeta de seguimiento: **MC.16** en [BOARD.md](../BOARD.md), re-cortada en rebanadas al aceptar este ADR.
**Fecha:** 2026-07-24 (abierta), 2026-07-27 (decidida)
**Autores:** Esteban (producto, brief de Mis Cuentas del 2026-07-08; decisión de modelado), Claude Opus 5 (triaje, análisis del modelo actual y redacción)
**Relación:** consume la estructura de dos niveles validada en el D3 del [ADR 029](029-catalogo-de-marcas-por-categoria.md) (entidad por catálogo de marcas, producto por descripción), sin redefinirla. Aplica la invariante I5 del [ADR 053](053-invariante-de-patrimonio.md) ("un cupo de crédito disponible nunca es un activo"). Extiende el gasto-abono del [ADR 002](002-abono-deudas.md) y la acreditación a cuenta de la tarjeta D.14 de Deudas (cerrada el 2026-07-10, ver [CHANGELOG](../CHANGELOG.md)). Si se implementa, desbloquea la derivación de `consumosTC` que el [ADR 050](050-perfil-fiscal-ubicacion-y-framing.md) deja hoy como captura manual. Restringido por la ADN 10 (ningún dominio importa a otro).

---

## Contexto

Los tipos de cuenta que Finko modela hoy no incluyen la tarjeta de crédito. El brief pide ampliarlos (ahorros, corriente, tarjeta débito, **tarjeta crédito**, billetera digital, efectivo, otro), pero el problema no es la longitud del catálogo: es que **una tarjeta de crédito no es dinero disponible, es cupo más deuda**. Meterla como un valor más en la lista de tipos haría que su saldo se sume al patrimonio del usuario como si fuera suyo, que es exactamente lo contrario de la realidad.

Hay un precedente que pesa: **el tipo de cuenta 'Inversión' se eliminó en la migración v11, justamente para separar dominios**. Reintroducir un tipo que cruza dos dominios (una cuenta que genera deudas) va en dirección contraria a esa decisión.

El síntoma práctico de que la pieza falta está en otro lado de la app: `consumosTC`, uno de los criterios del monitor de renta, es hoy captura manual porque no hay ningún objeto en el modelo que represente lo que se consumió con tarjeta.

### Lo que el análisis del código encontró (2026-07-27)

La mitad del modelo ya está construida, y eso decide el ADR:

1. **La deuda de tarjeta ya existe como concepto.** `CATEGORIAS_DEUDA` incluye `'Tarjeta de crédito'` (`core/constants.js`), y el `Compromiso` de tipo `deuda-entidad` ya guarda `saldoTotal`, `cuotaMensual`, `tasa` y `tasaUnidad: 'EA'`, que es la unidad de una tarjeta.
2. **El gasto que mueve el saldo de una deuda ya existe.** `Gasto.compromisoId` ([ADR 002](002-abono-deudas.md)) marca un gasto como abono, y `gastos/index.js` ya sincroniza el `saldoTotal` del compromiso al editar y al eliminar (`_ajustarSaldoDeuda`). Un consumo con tarjeta es esa misma operación con el signo contrario.
3. **Una deuda ya mueve saldo de una cuenta y lo revierte.** La D.14 (`cuentaOrigenId` + `montoAcreditado`) acredita la cuenta al crear la deuda y revierte el crédito exacto al eliminarla: la I3 del ADR 053 ya está cumplida en este dominio.
4. **El patrimonio ya está del lado correcto.** `calcularActivos()` no lee `compromisos`, y `calcularPasivos()` ya suma el `saldoTotal` de toda deuda activa (`analisis/logic.js`). Una tarjeta modelada como compromiso cumple la I5 sin escribir una línea nueva de análisis.
5. **El selector de origen del dinero es único.** `renderSelectorCuenta` (`infra/cuenta-helper.js`) lo usan 8 formularios de 6 dominios. Es el punto de inserción natural de "pagué con la tarjeta", y vive en infra, no en un dominio.
6. **Leer `S.compromisos` desde otro dominio ya es la norma.** `tesoreria`, `gastos`, `agenda`, `presupuesto`, `ahorro` y `analisis` lo hacen. La ADN 10 prohíbe **importar** el módulo de otro dominio, no leer el singleton.

---

## Decisión

**Alternativa B: la tarjeta de crédito es un producto de `compromisos` (Deudas), visible desde Mis cuentas sin ser una `Cuenta`.** No se agrega ningún tipo a `TIPOS_CUENTA`.

### D1. La tarjeta es un `Compromiso`, y `cupoTotal` es lo único nuevo

Una tarjeta es un `Compromiso` de tipo `deuda-entidad` con `categoria: 'Tarjeta de crédito'`, más un campo nuevo:

- **`cupoTotal`** (number, COP, opcional): el cupo aprobado.
- **`disponible = cupoTotal - saldoTotal`**, derivado, nunca almacenado.

`cupoTotal` es además el discriminador: una deuda de tarjeta **con** `cupoTotal` es un producto operable (recibe consumos, muestra cupo); una **sin** `cupoTotal` es lo que se puede registrar hoy, una deuda vieja capturada a posteriori, y sigue comportándose igual. Sin campo `esTarjeta` ni bandera paralela: menos vocabulario nuevo, y el dato que hace falta hace también de marca (misma economía que `esCuotaManejo`, que es dato y discriminador a la vez).

La entidad y el producto salen de piezas que ya existen (ADR 029 D3): la entidad es la marca del `bank-picker` (tag `banco` de `BANCOS_CO`), el producto es la `descripcion` del compromiso ("Visa Platinum"). No se crea una estructura de dos niveles nueva.

### D2. Saldo revolvente: una deuda por tarjeta, no una deuda por compra

Cada consumo **suma** a `saldoTotal` de la tarjeta. La tarjeta es una sola fila en Deudas, no una fila por compra.

Consecuencia aceptada y explícita: **"¿a cuántas cuotas?" no crea un plan por compra.** Al registrar un consumo diferido a N cuotas, el monto entra completo a `saldoTotal` y `cuotaMensual` sube en `monto / N`. El pago anticipado, entonces, recalcula el total de la tarjeta y no una compra puntual: quien abona de más baja `saldoTotal`, y ajustar `cuotaMensual` queda como edición del usuario, igual que en cualquier otra deuda.

Se elige así porque cabe entero en el modelo actual. Una deuda por compra multiplicaría las filas de Deudas y de Calendario y exigiría un nivel de agrupación (tarjeta → compras) que hoy no existe en ninguna parte, para una precisión que solo se nota al abonar de más.

### D3. El consumo es un `Gasto` con `compromisoId` y sin `cuentaId`

Pagar con la tarjeta registra un gasto normal (su categoría, su fecha, sus límites de gasto y su análisis) que:

- **no** descuenta ninguna cuenta (`cuentaId` ausente: el dinero no salió del banco),
- **sí** apunta a la tarjeta (`compromisoId`),
- lleva el campo nuevo **`Gasto.consumoTC`** (boolean, opcional) que fija el sentido.

El campo es necesario porque el abono a la propia tarjeta también es un gasto con el mismo `compromisoId`: sin él, el signo del ajuste sería ambiguo. Deducirlo de la ausencia de `cuentaId` sería frágil, porque un gasto sin cuenta ya es legal hoy (efectivo no registrado).

La sincronía al editar y al eliminar no se escribe: `_ajustarSaldoDeuda` ya existe en `gastos/index.js` y solo necesita el signo que le dicta `consumoTC`.

### D4. La tarjeta se ofrece donde se elige de dónde sale el dinero

`renderSelectorCuenta` acepta una lista opcional de tarjetas y las pinta en un grupo aparte, claramente separado de las cuentas de dinero real. **El llamador pasa las tarjetas**, el helper no lee `S.compromisos`: así infra no gana conocimiento de un dominio y cada formulario decide si las ofrece.

La primera entrega solo las ofrece en **Gastos**. Metas, Apartados, Fondo, transferencias y abonos siguen operando únicamente con cuentas de dinero real: no se ahorra ni se transfiere con cupo de crédito.

### D5. El cupo nunca toca el patrimonio, y no se toca `calcularActivos`

Aplicación directa de la I5 del ADR 053. Como la tarjeta es un compromiso y no una cuenta, `calcularActivos()` no cambia y `calcularPasivos()` ya la incluye. **Queda prohibido crear una `Cuenta` para representar una tarjeta**, aunque sea "solo para mostrarla": ese atajo es exactamente el error que este ADR evita.

El cupo disponible es información de capacidad de endeudamiento, no dinero. Se muestra como cupo, nunca sumado a "tu dinero disponible".

### D6. Mis cuentas la muestra en su propio bloque

Mis cuentas pinta las tarjetas en un bloque separado del listado de cuentas y **fuera** del total de dinero disponible, con su cupo usado y disponible, y un enlace a Deudas para operar. Es una vista de solo lectura: la tarjeta se crea, edita y abona en Deudas, que es su dueño.

`tesoreria` lee `S.compromisos` en su view, como ya lo hacen `distribucion.js` y `acciones/cuentas.js`. No importa el módulo `compromisos` (ADN 10).

### D7. Nudges: solo cuando previenen un mal hábito

El brief lo pide explícito en su punto 5, y el [ADR 003](003-tono-neutral-profesional.md) es ADN. Se permiten avisos en tres situaciones concretas y en el momento de la operación: **avance en efectivo**, **retiro en otra red** y **pago mínimo**. Prohibido comentar cada consumo, y prohibido calificar al usuario. Un aviso explica el costo, no juzga la compra.

### D8. Schema: bump con migración no-op

`cupoTotal` (Compromiso) y `consumoTC` (Gasto) son campos opcionales `undefined`-safe: los registros existentes siguen funcionando sin tocarlos. Aun así se bumpea `SCHEMA_VERSION`, con migración no-op documentada, siguiendo el precedente exacto de la v26 → v27 (`Ingreso.cuentaId`, MC.13d): campo que el usuario llena por formulario, sin backfill posible. El bump entra en la rebanada que introduce `cupoTotal`.

---

## Consecuencias

### Positivas

- **El patrimonio queda correcto por construcción**, no por vigilancia: el cupo no puede sumarse a activos porque no existe ninguna cuenta que lo contenga.
- **Reuso alto, superficie baja:** dos campos opcionales, un signo en una función que ya existe, un parámetro opcional en un helper de infra. No hay dominio nuevo, ni tipo de cuenta nuevo, ni entidad nueva en infra.
- **Respeta la migración v11:** los dominios siguen separados y `tesoreria` no aprende a generar deudas.
- **Desbloquea `consumosTC`** del monitor de renta (CFG.2a): sumar los gastos con `consumoTC` del año deja de ser un dato tecleado.
- **Los límites de gasto y el análisis funcionan sin cambios:** un consumo con tarjeta es un gasto, con su categoría, y ya cuenta donde tiene que contar.

### Negativas y restricciones

- **"Cupo disponible" vive en un compromiso**, que es un concepto de cuenta alojado en el dominio de deudas. Se acepta: el dato depende de `saldoTotal`, que es del compromiso, y separarlo obligaría a sincronizar dos fuentes.
- **El usuario busca su tarjeta en Mis cuentas y ahí es solo lectura** (D6). Es el costo real de B, mitigado por el bloque visible y el enlace a Deudas.
- **Las cuotas por compra no se modelan** (D2). El pago anticipado opera sobre el total de la tarjeta.
- **Un gasto pagado con tarjeta no baja ninguna cuenta**, así que el disponible del mes se ve mejor de lo que estará cuando llegue la factura. Es la realidad del producto, y es justo lo que los nudges de D7 deben hacer visible.

---

## Alternativas rechazadas

1. **A. Tipo de cuenta nuevo en `tesoreria`.** Es lo que el brief pedía literalmente y es como el usuario piensa el producto. Rechazada: reintroduce el cruce de dominios que eliminó la migración v11, obliga a `tesoreria` a generar deudas (roza la ADN 10) y deja el cupo a un `calcularTotalCuentas()` de distancia del patrimonio, que es el riesgo declarado (I5).
2. **C. Entidad propia en `infra/`** consultada por ambos dominios, al estilo de `infra/vencimientos.js`. Rechazada por costo sin beneficio: crea un concepto nuevo en el modelo para un solo consumidor real, cuando el dueño natural del dato (la deuda con su tasa y su saldo) ya existe y ya está construido. `vencimientos.js` se justificó porque **tres** dominios calculaban lo mismo; acá no hay duplicación que consolidar.
3. **Una deuda por compra diferida** (ver D2): más fiel a cómo funciona una tarjeta en Colombia, rechazada por el ruido que mete en Deudas y Calendario y por la agrupación de dos niveles que exigiría.
4. **Un tipo de gasto nuevo en vez de reusar el gasto-abono.** Rechazada: duplicaría la sincronía de `saldoTotal` que el ADR 002 ya resolvió.

---

## Fuera de alcance

- **La estructura de dos niveles en sí.** Validada en el D3 del [ADR 029](029-catalogo-de-marcas-por-categoria.md); este ADR la consume (entidad = marca, producto = descripción).
- **Fecha de corte y ciclo de facturación.** Un consumo entra a `saldoTotal` el día que ocurre. Modelar el corte cambia lo que Calendario proyecta y necesita su propia decisión.
- **Intereses corrientes calculados automáticamente.** La `tasa` se registra y se usa para advertir (`detectarDeudaCreciente` ya existe), no para capitalizar el saldo sola.
- **La derivación de `consumosTC` al monitor de renta.** Es de la tarjeta CFG.2a; este ADR solo la habilita.
- **El rediseño visual de Mis cuentas.** Cerrado en el [ADR 035](035-mis-cuentas-v2.md).
- **Integración con bancos o importación de extractos.** No existe servidor (ADN 3).

---

## Plan de implementación

Rebanadas de MC.16, en orden. Cada una entra sola y deja la app usable.

| Rebanada | Alcance | Por qué en este orden |
|---|---|---|
| **MC.16a** | `cupoTotal` en el formulario de deuda de tarjeta + bump de schema + cupo disponible en la fila de Deudas | Es el dato base. Sin cupo no hay producto operable (D1). |
| **MC.16b** | Consumo con tarjeta: `consumoTC` en Gasto, tarjetas en `renderSelectorCuenta` (solo Gastos), signo en `_ajustarSaldoDeuda` | El corazón del ADR (D3, D4). Incluye editar y eliminar el consumo: la I3 no admite un alta sin su reversa. |
| **MC.16c** | Bloque de tarjetas en Mis cuentas, fuera del total de dinero | Depende de que exista una tarjeta operable (D6). |
| **MC.16d** | "¿A cuántas cuotas?" al registrar el consumo, con ajuste de `cuotaMensual` | Refina MC.16b; sin ella el consumo ya funciona (D2). |
| **MC.16e** | Nudges de avance en efectivo, retiro en otra red y pago mínimo | Última: educa sobre un flujo que ya debe existir y funcionar (D7). |

## Qué falta para cerrarlo

Nada: la decisión está tomada. Las tres preguntas que este ADR tenía abiertas quedan resueltas en D1 (alternativa B), D2 (saldo revolvente) y D5 (tratamiento del cupo en el patrimonio).
