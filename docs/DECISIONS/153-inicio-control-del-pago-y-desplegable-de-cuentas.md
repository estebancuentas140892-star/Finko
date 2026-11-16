# ADR 153 - Inicio: el desplegable de cuentas se cierra solo y el pago queda en manos del usuario

**Estado:** Aceptada (2026-11-16).
**Fecha:** 2026-11-16
**Autores:** Esteban (pedido "INICIO, mejoras funcionales y de interacción"), Claude Opus 5.5 (implementación)
**Relación:** **Cambia** el [ADR 152](152-inicio-rediseno-saldo-al-centro-y-pago-en-hojas.md) D6 (el texto del aviso), D7 (la frase y qué abre marcado) y D8 (cuándo sale Tino), y el [ADR 126](126-inicio-del-adulto-en-el-telefono.md) D4 en la tarjeta vacía de "Esta semana". Conserva el [ADR 151](151-el-estado-de-una-obligacion-se-decide-una-vez.md) (el estado de un pago se decide una vez) y el reparto en el orden en que se marcan las cuentas (ADR 152 D7).

---

## Contexto

El pedido llegó escrito sobre la versión anterior a INI.2: citaba "Desmarca los que aún no hayas pagado", "No alcanza sola", "¿Desde qué cuentas?" y "Repartimos automáticamente desde la de mayor saldo", que INI.2 ya había retirado esa misma mañana. Revisado contra el código, quedaba esto por resolver:

- El desplegable de cuentas guardaba su estado en memoria y nada lo cerraba: seguía abierto al ir a otra sección y volver.
- El formulario de Mis cuentas no pide nombre: toda cuenta se llama `_autoNombre(banco, tipo)` ("Banco de Bogotá Ahorros"). Las hojas del pago y el desplegable escribían ese nombre y debajo el tipo ("Cuenta de ahorros"): el tipo salía dos veces y el nombre se cortaba.
- En "Completa el pago" la regla de INI.2e que baja los espacios de la fila a 8 perdía contra `.cuenta-pago__opcion`, con la misma especificidad y más abajo en la hoja: la fila quedaba en 14 y el nombre se cortaba.
- El aviso de saldo insuficiente decía siempre lo mismo, también cuando ninguna otra cuenta alcanzaba o cuando ni sumando todas alcanzaba, y "Completa el pago" mantenía una frase fija.
- Seguía una puerta (`resolverPagoMultiCuenta`, sin llamadores) que abría el reparto ya marcado con las cuentas de mayor saldo.
- "Esta semana" sin filas decía "Todo al día · Sin vencimientos en los próximos 7 días" aunque "Atención hoy" tuviera pagos vencidos.

## Decisión

### D1. El saldo es la suma de Mis cuentas (INI.3)

`updSaldo()` deja su propia suma y usa `calcularTotalCuentas()` y `cuentasActivas()` de `tesoreria/logic/cuentas.js`, como ya hacía "Más": una sola cuenta del dinero disponible (cuentas activas, también la que está en negativo). La sincronía ya existía: toda mutación de `cuentas` pasa por `crud.js`, que emite `state:change`, y Tesorería llama a `updSaldo()`. El protagonismo lo dio INI.2a (centrado, 56 px); no cambia nada visual.

### D2. El desplegable se abre con su ficha y se cierra solo (INI.3)

Se cierra al navegar (`hashchange`), con cualquier toque fuera de la ficha y de su caja (también el que abre otra acción de Inicio, como "Pagar") y con Escape, que devuelve el foco a la ficha. Tocar dentro de la caja no lo cierra, y el ojo tampoco: enmascara el total y el detalle abierto juntos (IN.2, [ADR 034](034-inicio-v2.md) D4), así que actúa sobre lo que se está mirando. `cerrarDetalleCuentas()` vive en `render.js`, junto al estado; los listeners, en `actions.js`, junto a la acción que lo abre.

### D3. La entidad arriba y el tipo debajo (INI.3)

En las dos hojas del pago y en el desplegable, el nombre autogenerado se reduce a la entidad con `nombreCortoCuenta()`, al lado de `_autoNombre` (la misma reducción que hace Mis cuentas desde MC.18b); un nombre que no salió de ahí se respeta. El tipo sigue saliendo de `tipoDeCuenta()`: "Cuenta de ahorros", "Cuenta corriente", "Depósito de bajo monto" para una billetera, nada para el efectivo; nunca se asume ahorros. Para que se lea entero:

- La fila de "Completa el pago" recupera los espacios de 8 y el borde de 12 de INI.2e (el selector sube a `.cuenta-pago__opcion.cuenta-multi__row`).
- En un teléfono de menos de 390, la fila de "¿Desde qué cuenta pagas?" baja sus espacios a 8: "Banco de Bogotá" cabe en una línea a 375.
- Una entidad larga ("Scotiabank Colpatria") baja a una segunda línea en vez de cortarse con puntos suspensivos.

### D4. Un solo mensaje, según el caso (INI.3)

Cuando la cuenta marcada no alcanza, `opcionesSiNoAlcanza()` distingue tres casos y la hoja dice uno solo:

- **Otra cuenta sola alcanza:** "No tienes saldo suficiente en esta cuenta para cubrir el pago: faltan $X. Puedes elegir otra cuenta o varias para completar el valor. Si ya pasaste el dinero a una sola cuenta, elígela para registrar el pago." Botón "Completar con otra cuenta".
- **Solo sumando varias:** "... faltan $X. Puedes completar el valor con varias cuentas o pasar primero el dinero a una sola." Mismo botón.
- **Ni sumando todas:** "No tienes saldo suficiente para cubrir el pago, ni sumando todas tus cuentas: faltan $Y. Registra primero en tus cuentas el dinero que necesitas." El botón se apaga: "No alcanza con tus cuentas".

"Completa el pago" cambia su frase fija por una que sigue el reparto (`estadoCompletar()`): "Elige otra cuenta para completar el valor. Cada una pone lo que tiene, en el orden en que las eliges." mientras falta; "Se registra un pago desde cada cuenta marcada, por el valor que ves en cada una." con varias; "El pago se registra completo desde Bancolombia." con una; y el caso de ni sumando todas, con el botón apagado.

### D5. Finko no reparte lo que el usuario no eligió (INI.3)

Se retira `resolverPagoMultiCuenta` y la rama de "Completa el pago" que marcaba de entrada las cuentas de mayor saldo: sin una cuenta elegida, la hoja abre sin nada marcado. El reparto sigue el orden en que el usuario marca (ADR 152 D7), la hoja dice cuánto usa cada cuenta antes de pagar y el mensaje explica la regla. Quien ya pasó el dinero a una cuenta la elige en "¿Desde qué cuenta pagas?" y paga desde ella sola; en "Completa el pago", desmarcando la otra. Finko no mueve dinero entre cuentas: orienta a pasarlo o a registrarlo primero.

### D6. Nada se paga dos veces (INI.3)

Antes de registrar el lote, `_confirmarLote` vuelve a leer `pagosPendientesDelMes` de `S`: si mientras el usuario elegía la cuenta algún pago dejó de estar pendiente o cambió su monto (otra pestaña, la nube, un segundo toque), no registra nada, lo anuncia y repinta. Lo desmarcado nunca entra: el lote solo lee las casillas marcadas.

### D7. "Esta semana" vacía no pinta tarjeta; Tino dice "Todo al día" solo si es cierto (INI.3)

Sin filas en la semana, `#panel-prioridades` se oculta: se va la tarjeta "Todo al día · Sin vencimientos en los próximos 7 días" (y su CSS). El vacío lo dice el mismo `#panel-todo-al-dia` de INI.2f, con el mismo dibujo:

- Sin nada en "Atención hoy" ni en la semana: como en INI.2f, en lugar de las dos tarjetas.
- Con algo en "Atención hoy" que no es un pago (tu ingreso por distribuir, lo que te deben) y la semana vacía: debajo de esa tarjeta, a su alto.
- Con un pago hoy o un débito sin saldo: no sale, porque no sería cierto.

Cada fila de "Atención hoy" lleva `data-seccion`, y el `:has()` de `identidad.css` sección 12 decide sin depender del orden de render. Solo bajo 1024px, como INI.2f.

## Lo que el pedido daba por pendiente y ya estaba

- **"Ver" junto a "Pagar":** con solo pagos ya no sale (INI.2b); "Ver los N" aparece solo cuando hay más clases de aviso de las que caben, y es la única puerta a ellas. Se conserva.
- **"Desmarca los que aún no hayas pagado":** retirada en INI.2c. La selección, el total y el conteo en vivo, y que solo se pague lo marcado, ya funcionaban; quedan probados en E2E.

## Alternativas descartadas

- **Juntar "¿Desde qué cuenta pagas?" y "Completa el pago" en una sola hoja con casillas.** El tablero de INI.2 separa elegir de completar y el pedido se cumple con las dos hojas; juntarlas revertiría un ADR del mismo día sin necesidad.
- **Que el usuario escriba cuánto sale de cada cuenta.** Más control, más pasos y más errores de digitación. El orden de marcado ya decide, y la hoja dice cuánto usa cada cuenta antes de pagar.
- **Dejar pagar en negativo cuando ni sumando alcanza.** Registraría un saldo que no existe. Con una sola cuenta en total sigue el aviso de sobregiro de siempre.
- **Cortar los nombres largos con puntos suspensivos.** Escondía justo la entidad, que es lo que identifica la cuenta.
- **Tino en escritorio.** Escritorio no cambia (ADR 152).

## Consecuencias

- `nombreCortoCuenta()` queda como la regla única del nombre corto; la tarjeta de Mis cuentas conserva su propia comparación (no se tocó para no mover esa sección).
- Los mensajes de las hojas valen en todo pago que pase por ellas: el lote, "Marcar pagado", un gasto, un abono y los aportes a metas y reservas.
- `infra/cuenta-helper.js` importa lógica pura de Tesorería, como `infra/avisos.js` lee la de cada dominio.
