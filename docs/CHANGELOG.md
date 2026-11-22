# Changelog - Finko Claude

> Revisado: 2026-11-22.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-11)

### feat(gastos): GAS.15e, el gasto del lienzo · 2026-11-22

[ADR 193](DECISIONS/193-el-gasto-del-lienzo.md) D1 a D3. Pedido: aplicar lo que falta del lienzo "Gastos · Rediseño integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v848.

- **El gasto del día a día, como la página 3 del lienzo** ([ADR 193](DECISIONS/193-el-gasto-del-lienzo.md)):
  - *Detalle:* la teja de la categoría y "¿Qué fue?" arriba; el aro de cada opción a la izquierda; "Necesidad" y "Deseo" con su ícono, bajo el nombre de la opción elegida.
  - *Revisar:* la hoja sigue diciendo "Nuevo gasto" con la barra de pasos ("$4.500", "Café", "Tinto", "Revisar"), sin la banda bosque; "Guardar gasto" con el botón de siempre.
  - *El papel:* "Revisa tu gasto" sobre la cifra, la categoría en su teja y su tono, "Tinto · Necesidad", "Pagado con Nequi · queda $415.500", la fecha corta ("Hoy, sáb 21 nov"), la nota con "Opcional" y el código de barras. En 360 x 640 cabe entero sobre el botón.
  - *Gasto hormiga:* si el gasto sigue una racha de lo pequeño que se repite, el papel lo dice antes de guardar: "Finko lo cuenta como gasto hormiga: 4.º tinto en 30 días" (`hormigaDelGasto()`).
- **Docs:** el mensual de noviembre volvió a sus 200 KB y se parte otra vez: el 13 y el 14 en [`changelog/2026-11-b.md`](changelog/2026-11-b.md).
- Sin cambios de datos.
- Pruebas: `gastos-telefono.test.js` (la fecha, "¿Qué fue?", "Pagado con", "queda", el detalle, la cabecera, la nota, el aviso de hormiga), `caracter-gasto.test.js` (`hormigaDelGasto`) y las E2E del registro. Unitarias 6557/6557, E2E 588/588.

### feat(gastos): GAS.15d, los resúmenes del lienzo · 2026-11-22

[ADR 192](DECISIONS/192-los-resumenes-del-lienzo.md) D1 a D6. Pedido: aplicar lo que falta del lienzo "Gastos · Rediseño integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v847.

- **La hoja Resumen, como la página 6 del lienzo** ([ADR 192](DECISIONS/192-los-resumenes-del-lienzo.md)):
  - *Seis meses a la vez:* el título con el punto de la pestaña ("Resumen · Día a día"), cada mes con su cifra corta encima ("812 mil", "1,2 M") y su barra; el mes visto resaltado en el color de la pestaña; "Meses anteriores" y, después, "Meses siguientes".
  - *Día a día:* "Gastaste en noviembre", "$273.800 más que octubre", cuántos gastos, la barra por categoría y cinco categorías con "Otras N categorías" que abre las demás.
  - *Fijos:* "Pagaste $X de $Y", "1 de 5 pagos · 1 vencido", la barra por familia con su leyenda y cada fijo con su estado ("Venció el 12 nov", "Pagado el 5 nov", "Vence el 24 nov"); el mes en curso, punteado lo que falta.
  - *Deudas:* la gráfica dice lo que debías al cierre de cada mes; "Abonaste $X de $Y en cuotas", "Tu deuda bajó $X", la tarjeta de las cuotas del mes y cada deuda con su estado y lo que debes.
  - *Límites:* el porcentaje usado cada mes con la raya del 100 %, "Usaste $X de $Y", cuántos se pasaron, los días que faltan y cada límite con su barra.
  - Al pie de cada una, su salida a Movimientos ("Ver los 14 gastos en Movimientos").
- Sin cambios de datos.
- Pruebas: `resumen-apartado.test.js` (nueva: la ventana, la gráfica, los cuatro cuerpos, `filasResumenDelMes`), `bloque-gastos.test.js` (la hoja, `deudaAlCierreDelMes`), `gastos-pestanas.test.js` E2E (los cuatro resúmenes) y el ayudante `elegirMesEnHoja` de `smoke.test.js`. Unitarias 6554/6554, E2E 588/588.

### feat(deudas): GAS.15c, la lista de deudas del lienzo · 2026-11-22

[ADR 191](DECISIONS/191-las-deudas-del-lienzo.md) D8. Pedido: aplicar lo que falta del lienzo "Gastos · Rediseño integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v846.

- **La lista de Deudas, como la página 7 del lienzo** ([ADR 191](DECISIONS/191-las-deudas-del-lienzo.md) D8):
  - *La tarjeta de arriba:* "Debes en total · noviembre", "Cuotas de noviembre: $680.000 · pagaste $180.000" y una barra con lo pagado de esas cuotas; la leyenda de entidades y personas sale.
  - *Las pestañas* dicen cuántas y cuánto ("Con entidades 2 · $7.450.000").
  - *Con una entidad:* lo que es como título ("Crédito libre inversión") y la entidad con su día debajo ("Davivienda · día 28"); la barra siempre, con "Cuota $400.000" o "Cupo $2.000.000"; el saldo con "falta" o "usado".
  - *Con una persona:* la relación y cómo le pagas ("Familiar · $100.000 el 10", "todo el 15 de diciembre"), sin barra, y "le debes".
  - *La cuota vencida:* el aviso en su línea y "Pagar" en un botón aparte.
  - *"Finko revisó tus 2 deudas"*, con Tino, bajo la tarjeta en las dos pestañas.
- Sin cambios de datos: el título y la entidad se leen del nombre guardado.
- Pruebas: `compromisos.test.js` (`tituloDeuda()`, la fila, las pestañas, "Pagar"), `gastos-pestanas.test.js` (la tarjeta de Deudas), `gastos-pestanas` y `movil-mv2` E2E. Unitarias 6538/6538, E2E 586/586.

### feat(deudas): GAS.15b, los formularios de deudas del lienzo · 2026-11-22

[ADR 191](DECISIONS/191-las-deudas-del-lienzo.md) D1 a D7. Pedido: aplicar lo que falta del lienzo "Gastos · Rediseño integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v845.

- **Las deudas, como la página 7 del lienzo** ([ADR 191](DECISIONS/191-las-deudas-del-lienzo.md)):
  - *No se vuelve a preguntar con quién:* desde "Agregar deuda con una entidad", "Con una persona" o la primera vez, el formulario arranca en su primer paso. Solo la entrada general pregunta "¿Con quién es?", con dos tarjetas (logos e iniciales) y "¿Es una tarjeta de crédito? Se agrega en Mis cuentas".
  - *Con una entidad, cuatro pasos:* Crédito (el tipo en píldoras y la entidad en una grilla de logos, en una pantalla), Cuánto, Cuota (la cuota y el día juntos) y Revisar. El nombre sale de lo elegido ("Libre inversión Davivienda"); "Otra" pide el nombre. Nuevo y opcional: "Cuotas que faltan".
  - *Con una persona, cuatro pasos:* Quién (el nombre con sus iniciales y "Es tu"), Cuánto, Cómo pagas (una cuota cada mes con su día, todo en una fecha o cuando pueda) y Revisar. Nuevo: "Te prestó el" y "Te cobra interés" (el interruptor abre la tasa mensual).
  - *La factura:* la teja, lo que es y de quién a la izquierda, lo que debes a la derecha; la cuota en una fila; lo opcional en línea, como la del gasto fijo. Los pasos hechos dicen lo elegido y se tocan para volver.
- **La primera vez de Deudas** dice "Con un banco o entidad · Créditos, libranzas, compras a cuotas" y "Con una persona · Familia, amigos, natillera, fiado", con la teja en frambuesa.
- **Datos:** `fechaPrestamo`, `cuotasRestantes` y `fechaInicio` en deudas "Única vez", opcionales y sin migración; las categorías guardadas no cambian (los chips dicen "Estudio", "Prestamista", "La tienda (fiado)").
- Pruebas: `compromisos.test.js` (los pasos, "¿Con quién es?", editar, el nombre, la factura, `datosDeFormaPago`), `preguntas.test.js` (los pasos con lo elegido, la pantalla sin título, sin teclado, la factura con teja), `movil-mv2.test.js` (los recorridos con entidad y con persona) y las que recorrían el formulario viejo. Unitarias 6536/6536, E2E 586/586.

### feat(deudas): GAS.15a, el plan de deudas del lienzo · 2026-11-22

[ADR 190](DECISIONS/190-el-plan-de-deudas-del-lienzo.md) D1 a D4. Pedido: aplicar lo que falta del lienzo "Gastos · Rediseño integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v844.

- **La hoja del plan de deudas es la del lienzo** (página 8, "Estrategias de pago"), en tres vistas:
  - *La recomendación:* Tino y "Tu plan para salir de deudas" ("Estimado con tus datos"), la tarjeta bosque "Finko te recomienda" con la forma de pagar y su porqué con cifras, "Qué cambia si lo aplicas" (meses antes, intereses que te ahorras y el extra al mes), "El orden" ("Aquí va el extra" o "Va primero", "Sigue con su cuota"; las deudas sin tasa o sin cuota al final, "Fuera del plan"), "Cómo funciona, mes a mes", "Aplicar este plan" y "Comparar con otras formas de pagar".
  - *Comparar:* "Puedes poner de más cada mes" ($0, $100.000, $150.000, $250.000 u Otro) y Avalancha, Bola de nieve, Unificar deudas (con dos o más que cobran interés) y Seguir como vas, cada una con cuándo terminas y cuánto en intereses; "Aplicar Avalancha".
  - *Cómo funciona:* cuándo terminas cada deuda con el plan y como vas hoy, y "Lo que haces tú".
- **Aplicar este plan:** con extra, sube las cuotas tras confirmar; el remanente va a la deuda que el orden ataca primero (en Bola de nieve, la más pequeña; antes siempre la de mayor tasa). Sin extra, deja ese orden. La hoja se cierra con "Plan aplicado".
- Si una deuda crece, la tarjeta es la del motor ("Paga $X más al mes") y ese mínimo ya viene como extra. Con una sola deuda completa, pide completar los datos.
- Sale la hoja de pestañas de antes (`plan-movil__*`). En escritorio sigue la tarjeta con "Tu plan".
- Pruebas: `compromisos.test.js` (las tres vistas, la elección, lo que falta, lo que crece, el reparto por orden), `movil-mv2.test.js` (comparar, volver, cómo funciona y aplicar). Unitarias 6523/6523, E2E 585/585.

### feat(deudas): GAS.14e, el motor de recomendaciones de deudas · 2026-11-22

[ADR 189](DECISIONS/189-revision-tecnica-de-gastos-y-motor-de-deudas.md) D5. Pedido "Revisión técnica e implementación de mejoras en Gastos". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v843.

- **El motor de deudas (`analizarDeudas`):** un solo análisis con las reglas del ADR 189 D5. Inventario (tasa conocida, 0 % o desconocida; con o sin cuota; si crece; si es cara), lo que falta ("la tasa de Visa", "cuánto y cuándo le pagas a Mamá"), tres escenarios (sin cambiar nada, Avalancha, Bola de nieve) con meses, mes estimado de salida e intereses, una recomendación principal con su porqué (frenar lo que crece, la más pequeña si nada cobra interés, Avalancha si ahorra 50.000 o un mes, seguir la cuota con una sola, o completar los datos) y alternativas (pagar más con lo que queda libre, acordar una cuota, renegociar sin prometer, unir con una oferta). Lo desconocido no se inventa: una deuda sin tasa o sin cuota no entra en las cuentas y se dice cuál.
- **"Tu plan" en la hoja del plan** (y arriba de la tarjeta de escritorio): la recomendación, por qué, el estimado ("hacia mayo de 2028") y los supuestos al pie. La cifra grande dice "Sin contar X" cuando alguna deuda no entra; la pestaña que no termina dice "no terminas" (antes "50 años"). "Finko revisó tus deudas" dice el resumen del motor; la entrada clásica ya no da meses con una tasa desconocida.
- **Lo libre al mes** es ingresos menos fijos, cuotas y el promedio del día a día; sin ingresos o sin ningún mes con gastos es desconocido (antes restaba 0 y lo inflaba).
- **Juntar tus deudas** solo une las que cobran interés con tasa conocida (también un gota a gota); antes unía y archivaba todas, incluso un préstamo sin interés o una deuda sin tasa. Pide los costos del crédito nuevo (opcional) y los suma: si la cuota baja pero el total sube, lo dice. "Juntar" aparece con dos o más unibles; "Renegociar", si alguna cobra interés.
- **El abono** calcula los meses con intereses (antes `saldo / cuota`) y, con una entidad que cobra interés, dice las dos formas: a plazo (meses e intereses que te ahorras) o a cuota (la cuota nueva); "Pregúntale cuál ofrece".
- **El mínimo que frena** lo que crece es lo que le falta a cada cuota para cubrir su interés, al siguiente múltiplo de 10.000; la hoja lo trae escrito.
- Una deuda personal sin cuota ni día dice "Sin fecha fija" en la lista (antes "día null", de GAS.14d).
- Pruebas: `motor-deudas.test.js` (nueva, casos controlados A a G, capacidad, abono plazo o cuota, consolidar con costos), `compromisos.test.js` (Tu plan, sin tasa, no terminas, la entrada, Sin fecha fija, Juntar), `movil-mv2.test.js` y `estrategia-pago.test.js` (Tu plan, Juntar sin el préstamo sin interés, el abono a plazo). Unitarias 6521/6521, E2E 585/585.

### fix(deudas): GAS.14d, preguntar solo lo necesario · 2026-11-22

[ADR 189](DECISIONS/189-revision-tecnica-de-gastos-y-motor-de-deudas.md) D4. Pedido "Revisión técnica e implementación de mejoras en Gastos". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v842.

- **La deuda con una persona no pregunta dos veces con quién:** elegida "Con una persona", el paso siguiente es "¿Qué relación tienen?" (familia, amigo, trabajo...) y el nombre pregunta "¿Cómo se llama?" ("Nombre de quien te prestó"). En "Para pagar" ya no se pide el titular: es esa persona; la referencia queda como "Otra referencia".
- **Sin cuota no hay día fijo:** una deuda personal sin cuota acordada no exige día de pago; la pregunta se puede saltar con "Sin fecha fija" y se guarda `diaPago: null`. Con cuota, el día sigue siendo obligatorio. Las deudas con entidad no cambian.
- Pruebas: `compromisos.test.js` (la relación, el nombre, el titular oculto, el día opcional sin cuota y obligatorio con cuota). Unitarias 6487/6487, E2E 585/585.

### feat(movimientos): GAS.14c, totales y Movimientos · 2026-11-21

[ADR 189](DECISIONS/189-revision-tecnica-de-gastos-y-motor-de-deudas.md) D3. Pedido "Revisión técnica e implementación de mejoras en Gastos". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v841.

- **Los pagos de un fijo o una deuda, en Movimientos:** cada fila de un pago lleva su compromiso y Movimientos filtra por él. La hoja del fijo o la deuda (con pagos) trae "Ver sus pagos en Movimientos"; la lista dice "Los pagos de Disney+" y "Limpiar filtros" lo quita.
- **La tarjeta y la hoja de meses cuentan lo mismo:** lo pagado a un fijo o una deuda archivados también cuenta en su mes (antes la tarjeta solo contaba lo activo y la hoja todo).
- **Límites, "Solo una parte":** el resumen del mes cuenta solo esas partes, como su tarjeta; de un límite de una sola parte a Movimientos, el filtro lleva la parte.
- **El detalle de una compra con tarjeta** dice con cuál; el aviso al guardar mira el límite con `activo !== false`, como el resto.
- Pruebas: `movimientos-consulta.test.js` (el filtro), `bloque-gastos.test.js` ("Solo una parte"), `compromisos.test.js` (la hoja). Unitarias 6485/6485, E2E 585/585.

### fix(fijos): GAS.14b, los vencimientos de los fijos · 2026-11-21

[ADR 189](DECISIONS/189-revision-tecnica-de-gastos-y-motor-de-deudas.md) D2. Pedido "Revisión técnica e implementación de mejoras en Gastos". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v840.

- **Quincenal:** siempre dos vencimientos separados 15 días (el día de pago y +15 o -15), ajustados al último día del mes. Antes el 30 daba el 30 y el 31 de enero, el 28 una sola fecha en febrero y el 31 una al mes. Con el 20 ahora son el 5 y el 20.
- **Ningún vencimiento antes del inicio:** un semanal sin fecha de inicio empieza en su primer pago; un pago hecho el día del alta salda ese día y no uno inventado de antes (lo pagado antes del inicio salda como mucho un vencimiento, el inmediatamente anterior).
- **Débito automático:** ofrece los vencimientos pendientes desde el más antiguo, que son los que saldan sus pagos (ADR 187 D2). Antes miraba un mes atrás y, al confirmar, saldaba otros y volvían a salir. Cambia el ADR 052 D1 para los fijos con fecha de alta.
- **Un mes sin vencimiento** (un anual fuera de su mes) no queda "pagado" por un pago que cayó en él; sí el mes del alta con un pago de antes del inicio.
- **La hoja del fijo** dice el vencimiento real (el más antiguo sin pago o el próximo), "Desde" y "Último pago".
- **Cambiar la frecuencia** de un fijo con pagos pendientes no se deja; al día, el calendario nuevo empieza hoy (`Compromiso.reinicio`) y lo pagado antes queda como historia.
- Pruebas: `gastos-cifras-vencimientos.test.js` (semanal, quincenal del 30, anual, la situación del fijo, el reinicio), `vencimientos.test.js`, `agenda.test.js` y `catchup-desde-alta.test.js` con las reglas nuevas. Unitarias 6483/6483, E2E 585/585.

### fix(deudas): GAS.14a, lo que corrompía datos · 2026-11-21

[ADR 189](DECISIONS/189-revision-tecnica-de-gastos-y-motor-de-deudas.md) D1. Pedido "Revisión técnica e implementación de mejoras en Gastos". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v839.

- **La tasa de una deuda se dividía entre 100 en cada edición:** el formulario mostraba el decimal guardado (0,285) como porcentaje y al guardar lo volvía a dividir. Ahora el campo dice 28,5. La vista del interés del abono leía la tasa en la unidad equivocada.
- **Migración v60:** una tasa de entidad (EA) por debajo de 1 % o una personal (mensual) por debajo de 0,1 % es una tasa que el error ya dividió; se multiplica por 100 hasta salir de ese rango, máximo tres veces. 0 % y las tasas reales no cambian.
- **Un abono editado** no puede pasar de lo que se debía cuando se hizo; antes la deuda quedaba en 0 en silencio y, al borrar el abono, volvía con la diferencia de más.
- **"Deshacer" en la ficha** devuelve también el 4x1000: el saldo de la cuenta se corría.
- **Un gasto importado** (sin efecto en el saldo) que se edita para que sea de una tarjeta ya no le suma la compra a su deuda.
- Pruebas: `compromisos.test.js` (la tasa al editar y en el abono), `storage.test.js` (v60), `consumo-no-es-pago.test.js` (el tope del abono), `gastos.test.js` (lo importado). Unitarias 6478/6478, E2E 585/585 ("dos dispositivos abiertos" de `nube.test.js` pasó al reintento).

### feat(deudas): GAS.13h, las primeras veces, Deudas en un mes pasado y el plan (cierra GAS.13) · 2026-11-21

[ADR 188](DECISIONS/188-gastos-especificacion-integral.md) D7. Tablero "Gastos · Rediseño integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v838.

- **Deudas en un mes pasado:** la tarjeta dice "Debías al cierre de octubre ⌄" con lo que se debía ese mes: el saldo de hoy más lo que se abonó después y menos lo que se compró con la tarjeta después; una deuda creada después no cuenta. La línea y la barra salen de ese saldo.
- **El plan:** con dos deudas o más, la línea "¿Cómo salir más rápido?" pasa a la tarjeta "Finko revisó tus deudas", con en cuántos meses sales con las cuotas de hoy; lleva al plan de siempre (tu plan, comparar, cómo funciona, aplicar).
- **Las primeras veces:** Deudas con Tino y su lupa; Límites con la pose del paraguas, que todavía no existe: va con "explica" (`POSE_TINO_INTERINA`) hasta que llegue el dibujo; Fijos queda con Tino y su calendario y las ocho tejas, sin el banner de propósito encima. "La que más usas" ya estaba en Límites.
- **Los recorridos** del tablero se recorrieron contra la app: el gasto, el fijo, la deuda con una entidad y con una persona, el límite y consultar ya siguen esos pasos; la deuda conserva su contador de preguntas en vez de la barra de pasos.
- Con GAS.13h se cierra GAS.13.
- Pruebas: `gastos-pestanas.test.js` (`saldoDeudaAlCierre`, la tarjeta del mes pasado), `movil-mv2.test.js` (la tarjeta del plan). Unitarias 6473/6473, E2E 585/585.

### feat(gastos): GAS.13g, el papel de la factura · 2026-11-21

[ADR 188](DECISIONS/188-gastos-especificacion-integral.md) D6. Tablero "Gastos · Rediseño integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v837.

- **El papel:** #fffcf5 en los dos temas, con dientes de 8 px arriba y abajo (máscara `conic-gradient`) y sombra cálida. Salen el marco bosque, la franja de tres colores y el código de barras.
- **La cabecera:** el isotipo de 22, "Finko" y el tipo: COMPROBANTE en el gasto, GASTO FIJO en el fijo, DEUDA en la deuda. El título del papel ("Nuevo gasto") queda para el lector de pantalla: la hoja ya dice "Revisa tu gasto" o "Gasto registrado".
- **La cuenta de origen** lleva el logo de su banco, o el billete verde del efectivo, en el lugar del ícono, con lo que queda al lado.
- Pruebas: `gastos-telefono.test.js` (la cabecera y el logo). Unitarias 6472/6472, E2E 585/585 ("dos dispositivos abiertos" de `nube.test.js` pasó al reintento).

### feat(gastos): GAS.13f, paso a paso con lo elegido y el aviso tras guardar · 2026-11-21

[ADR 188](DECISIONS/188-gastos-especificacion-integral.md) D6. Tablero "Gastos · Rediseño integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v836.

- **El paso a paso** dice lo elegido en cada segmento hecho ("$4.500", "Café", "Tinto") y se toca para volver a ese paso. Por eso sale el monto de subtítulo de la cabecera y la categoría de arriba del Detalle (queda para el lector de pantalla). Cambia el ADR 185 D4.
- **"¿Necesidad o deseo?"** se contesta en la factura, en la fila Detalle ("Tinto · ¿Necesidad o deseo?" mientras no se conteste). Sale el bloque aparte de la ficha. En la lista, la fila lo recuerda en girasol solo cuando el gasto depende, no tiene respuesta y Finko lo ve repetirse (hormiga, ADR 186 D5).
- **La ficha:** si el gasto es hormiga, un aviso girasol lo dice ("Finko lo cuenta como gasto hormiga"), nunca una pregunta; "Los N gastos de X" pasa a un enlace "Ver en Movimientos" con chevrón, de 44.
- **Después de guardar:** el aviso dice "Tinto · $4.500" (lo que dice la fila y el monto) con la consecuencia y "Deshacer".
- Pruebas: `gastos-telefono.test.js` (el paso a paso, la fila Detalle, la ficha), `movil-mv2.test.js` (el enlace). Unitarias 6471/6471, E2E 585/585.

### feat(gastos): GAS.13e, el resumen del apartado y los estados de pago · 2026-11-21

[ADR 188](DECISIONS/188-gastos-especificacion-integral.md) D5. Tablero "Gastos · Rediseño integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v835.

- **"Resumen" en vez de "Elige el mes":** el mes de la tarjeta y "Resumen" abren una hoja con doce barras del año (la de un mes sin datos en 4 px, en el color del apartado); tocar una barra cambia de mes y la hoja sigue abierta. Debajo, el total del mes ("Sin gastos" si no hay; en Fijos y Deudas, cuántos están vencidos) y lo que lo hizo: Día a día y Límites por categoría, Fijos por pago y Deudas por deuda, con su glifo de 26 en su tono y sin fondo. Tocar una parte abre Movimientos con el apartado, el mes y la categoría puestos. Sale la frase que explicaba la hoja.
- **Estados de pago:** lo vencido lleva la pastilla "Pagar" (no un círculo), en Fijos y en Deudas; lo pendiente, el círculo de contorno de 34 con el chulo gris, también lo de hoy o mañana; lo pagado, el círculo verde lleno y la fila al 62 %. La pastilla va al 12 % de rojo: al 18 % no llegaba a AA (ADR 123).
- **Límites:** la fila pasada en rojo ya lo dice; sale la franja roja "pasó su límite". La ámbar del límite que va cerca se queda.
- Pruebas: `bloque-gastos.test.js` (`partesDelMes`, la hoja), `compromisos.test.js` ("Pagar"), `presupuesto.test.js`, y en E2E el resumen que sigue abierto (`smoke.test.js`, `gastos-pestanas.test.js`). Unitarias 6470/6470, E2E 585/585.

### feat(gastos): GAS.13d, cabecera con la lupa, insignias y el ojo junto a la cifra · 2026-11-21

[ADR 188](DECISIONS/188-gastos-especificacion-integral.md) D4. Tablero "Gastos · Rediseño integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v834.

- **La fila del nombre vuelve** (cambia el ADR 185 D1): teja coral de 34 con el recibo, "Gastos" en 22/800 y la lupa de 44, la misma anatomía de Movimientos y Mis cuentas. La lupa es la única búsqueda de Gastos: sale de los filtros de Día a día y abre Movimientos con el apartado de la pestaña (Gastos, Gastos fijos o Deudas) y el mes a la vista.
- **Pestañas:** riel con relleno 4, la activa en 700 con una marca de 16 x 3 en el color de su apartado (coral, índigo, frambuesa, amarillo). En vez del punto, una insignia roja con el número: pagos vencidos en Fijos, cuotas vencidas en Deudas, límites pasados en Límites. A 320 la letra baja a 12 y la insignia a 14 para que quepan.
- **Tarjeta:** radio 24, el mes en pastilla de 28 al 14 % de blanco, la cifra de 38 y el ojo de 36 pegado a ella (en las cuatro). Con el ojo puesto salen la comparación, la barra y la leyenda. "Categorías" pasa a "Resumen", que abre la hoja de la pestaña.
- **Un ojo por pestaña:** Fijos y Deudas guardan cada uno el suyo (antes compartían el de Por pagar); sin el suyo siguen lo que decía el de Por pagar.
- La zona táctil sigue en 44 (R4): la pestaña de 38 y el ojo de 36 crecen con un `::before`. El ojo queda `position: relative` para que esa zona no cubra la tarjeta.
- Pruebas: `bloque-gastos.test.js` (la fila, las insignias, la lupa con filtros), `gastos-pestanas.test.js`, `hub-ahorros.test.js`, `movil-mv2.test.js`. Unitarias 6467/6467, E2E 585/585.

### feat(fijos): GAS.13c, el dato para pagar de cada fijo · 2026-11-21

[ADR 188](DECISIONS/188-gastos-especificacion-integral.md) D3. Tablero "Gastos · Rediseño integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v833.

- **Un solo campo con el nombre del dato** en la factura del fijo (teléfono): Servicios públicos, "Número de contrato"; Internet y TV, "Número de cuenta"; Celular, "Número de la línea"; Arriendo, Administración y Servicio doméstico, "A quién le pagas"; Educación, "Código del estudiante"; Seguros y Medicina prepagada, "Número de póliza"; Seguridad social, "Dónde la pagas"; Impuestos, "Placa o ficha catastral"; lo demás, "Dato para pagar". La ayuda va dentro del campo y la pantalla se titula con el dato. Nunca "Para pagar".
- **Lo que se cobra solo** (Streaming, Suscripciones, Gimnasio: "Se cobra solo a"; Cuota de manejo: "Se cobra en") no pide dato: la fila del débito toma ese nombre, sin interruptor, y elegir la cuenta prende el débito automático con ella.
- El valor se guarda en la referencia de `datosPago`; la llave, el titular y la cuenta de antes siguen en el formulario (ocultos en el teléfono) y no se pierden al editar. Escritorio no cambia.
- La ficha del fijo dice el nombre de su dato ("A quién le pagas · Martha Gómez").
- Pruebas: `compromisos.test.js` (cada tipo y la ficha), `para-pagar.test.js`, `gastos-pestanas.test.js` y `movil-mv2.test.js` (la fila "Número de contrato"). Unitarias 6466/6466, E2E 585/585.

### feat(gastos): GAS.13b, "Repetir este gasto" y la papelera · 2026-11-21

[ADR 188](DECISIONS/188-gastos-especificacion-integral.md) D2. Tablero "Gastos · Rediseño integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v832.

- **"Repetir este gasto"** en vez de "Repetir hoy" (teléfono y escritorio). Abre la factura con todo igual y la fecha de hoy, lista para guardar: ahora copia también lo que se contestó de necesidad o deseo (cambia el ADR 162 D2, que lo volvía a preguntar); se cambia en la fila Detalle.
- **La factura consultada:** la hoja dice "Gasto registrado"; "Repetir este gasto" es un secundario de 48 con borde y la papelera va a su lado, de 48. Sale "Cada cambio se guarda solo y lo puedes deshacer" (el tablero no lleva subtítulos que expliquen).
- **La papelera** confirma con "Úsalo si lo anotaste por error." antes de lo que corrige en los saldos; no promete devoluciones.
- **La factura de un gasto nuevo** se titula "Revisa tu gasto" (antes "Registrar gasto").
- De paso, las pruebas de `import.test.js` que GAS.13a dejó en rojo (el importador ya traducía "Transporte") quedan con el nombre de hoy y una prueba del CSV viejo.
- Pruebas: `gastos-telefono.test.js`, `gastos-detalle.test.js` y `movil-mv2.test.js` con los textos nuevos; Repetir un taxi llega a la factura con su respuesta. Unitarias 6464/6464, E2E 585/585 ("dos dispositivos abiertos" de `nube.test.js` en rojo una vez, verde al repetir).

### feat(gastos): GAS.13a, las áreas del registro y "Bus, taxi y apps" · 2026-11-21

[ADR 188](DECISIONS/188-gastos-especificacion-integral.md) D1. Tablero "Gastos · Rediseño integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v831.

- **El área se llama Transporte** y la categoría que se llamaba así pasa a **"Bus, taxi y apps"** (Transporte público, Taxi y App de transporte): al lado de Carro o moto ningún rótulo repite el nombre de una categoría.
- **Migración v59:** los gastos, los límites y lo aprendido de hormiga (`c:Transporte|...`) cambian de nombre; los ids de las opciones y los montos no cambian. Una categoría propia que ya se llamara así se retira, como en v58.
- **El importador** traduce "Mecato" y "Transporte" de un CSV viejo al nombre de hoy.
- En las tejas de la primera vez de Día a día el nombre va en dos renglones: las cuatro tejas miden lo mismo y el nombre va centrado.
- De paso: la prueba del complemento del día no aceptaba "sáb" (la tilde).
- Pruebas: `categorias-colombia.test.js` (migración v59), las de registro, límites, Movimientos e importar con el nombre nuevo. Unitarias 6463/6463, E2E 585/585.

### feat(fijos): GAS.12c y 12d, "Ya lo había pagado" y la fecha del primer pago (cierra GAS.12) · 2026-11-20

[ADR 187](DECISIONS/187-cada-pestana-con-su-cifra-y-cada-vencimiento-con-su-pago.md) D3 y D4 (decisiones de Esteban). Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v830.

- **"Ya lo había pagado"** (D3): en la hoja de un fijo con vencimientos vencidos, anota el más viejo como pagado por fuera de Finko (un débito automático que nunca se registró): un gasto con la fecha de ese vencimiento, sin cuenta y con `sinEfectoSaldo` (`anotarPagadoPorFuera`, `infra/pago-compromiso.js`). No toca ningún saldo; Fijos y Análisis lo cuentan en su mes, Día a día y Límites no. Uno por toque: la hoja se queda abierta con lo que falta, y el aviso trae "Deshacer". Lo que vence hoy no se ofrece.
- **La fecha del primer pago** (D4): `Compromiso.fechaInicio` (nuevo, opcional, solo fijos), en la pantalla "Cuándo" bajo los días ("Primer pago (opcional)"): elegirla marca su día y sigue a la factura, que la dice junto a la fecha de pago ("El día 15 · desde el 15 de jul") sin sumar una fila; como línea aparte la factura dejaba de caber en 393 x 740. Manda sobre el alta: desde ella hay vencimientos y ella marca el ciclo (el mes de un anual, el día de un semanal); el día de pago sale de ella. Nada se pinta ni se debe antes de ella. Así, Disney+ registrado hoy "desde el 15 de julio" debe julio a noviembre, y un seguro anual vence en su mes aunque se registre en otro. Sin ella, todo sigue como antes; los fijos guardados no cambian.
- Con GAS.12c y 12d se cierra GAS.12.
- El campo de fecha de Finko del teléfono acepta `data-vacio` para decir qué fecha pide cuando la pantalla no muestra su rótulo.
- Pruebas: `gastos-cifras-vencimientos.test.js` (lo anotado sin mover dinero y su "Deshacer", el botón solo con vencidos, el primer pago en el pasado y en el futuro, el anual en su mes, la validación, el campo en "Cuándo" y la hoja de meses desde el primer pago) y `gastos-pestanas.test.js` (E2E: "Ya lo había pagado" de punta a punta y el primer pago en "Cuándo", con la factura sin desplazar) y `movil-mv2.test.js`. Unitarias 6460/6460, E2E 585/585.

### fix(fijos): GAS.12b, cada pago salda el vencimiento más antiguo · 2026-11-20

[ADR 187](DECISIONS/187-cada-pestana-con-su-cifra-y-cada-vencimiento-con-su-pago.md) D2, que **cambia el ADR 183 D3 para los fijos** (decisión de Esteban). Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v829.

- **La regla** (`coberturaDeVencimientos`, `infra/vencimientos.js`): un fijo tiene sus vencimientos desde su alta y cada pago cubre uno, del más viejo al más nuevo; lo que sobra adelanta los que vienen. Antes el último pago dejaba al día todo lo de antes y un pago cubría el mes entero (las dos quincenas). Disney+ del 15 de julio sin pagos: 5 pendientes desde el 15 de julio, "Venció hace 4 meses"; un pago hoy salda julio y quedan 4 desde agosto. Un pago repartido entre cuentas es uno (`operacionId` o, antes de MOV.3, la nota y el día). Lo de antes del alta no se debe; un pago anotado al crear el fijo cubre el de su mes.
- **Lo que dice cada vista**, con la misma cifra: la fila de Fijos ("Venció hace 4 meses · 5 pagos", el total), la hoja del fijo ("Pagos pendientes", "Venció el 15 de jul · 5 pagos" en lugar de "Venció el sábado 15"), el lote ("5 pagos · desde el 15 de jul"), la lista "Vencido" del Calendario, Atención hoy y la notificación del sistema, en meses ("venció hace 4 meses", no "hace 128 días").
- **Pagar:** "Marcar pagado" paga uno; "Pagar los N" del lote paga todos los pendientes de cada fijo en un gasto con `periodos` (nuevo, opcional). El Calendario marca cada vencimiento por su día; "Deshacer" dice "vuelve a quedar por pagar" si quitar el pago deja uno más sin pagar.
- **Las deudas no cambian:** siguen con el ADR 183 D3 (el abono que completa la cuota del mes deja la deuda al día).
- Sin migración: los gastos guardados se leen con la regla nueva. Un fijo semanal pagado una vez al mes queda con las semanas sin pago (GAS.12c las salda sin mover dinero).
- Pruebas: `gastos-cifras-vencimientos.test.js` (los casos del pedido: mensual, quincenal, anual, cada 2, 3 y 6 meses, día 31, pagado, varios pendientes, aún no vence, pago atrasado y adelantado, repartido, las vistas y el lote) y, con la regla nueva, `vencimiento-desde-ultimo-pago`, `vencimiento-unico`, `catchup-desde-alta`, `deshacer` y `pago-vinculado`. Unitarias 6448/6448, E2E 583/583.

### fix(gastos): GAS.12a, cada pestaña con su cifra · 2026-11-20

[ADR 187](DECISIONS/187-cada-pestana-con-su-cifra-y-cada-vencimiento-con-su-pago.md) D1. Pedido "Correcciones de cálculos y vencimientos, Gastos de Finko": nace GAS.12 con 12b a 12d. Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v828.

- **La hoja "Elige el mes"** se abre desde la tarjeta de cada pestaña y ahora habla de ella: Día a día, lo gastado en el día a día; Fijos, lo pagado en gastos fijos; Deudas, lo abonado a deudas (sin las compras con la tarjeta); Límites, lo gastado en sus categorías. Cada una con su ojo. Antes las cuatro decían lo del día a día.
- **Fijos en un mes pasado** lista solo los fijos con un vencimiento ese mes: ya no "quedó sin pagar" un fijo creado después ni un anual fuera de su mes, y un quincenal son dos vencimientos. "Pagaste $X de $Y" suma todos los pagos de fijos del mes, no solo los de los fijos que quedaron al día.
- **Límites cuenta lo mismo que Día a día** (`esDelDiaADia`): el pago de un fijo o de una deuda no gasta un límite aunque se le haya cambiado la categoría, y "Otras categorías sin límite" ya no trae la fila de lo pagado en fijos o deudas.
- Revisado sin cambios: Día a día y la tarjeta de Deudas ya contaban solo lo suyo (GAS.9b); Inicio, Análisis, Movimientos y los saldos no leen estos resúmenes.
- Pruebas: `gastos-cifras-vencimientos.test.js` (nuevo: el escenario del pedido con $500.000, $800.000 y $300.000, la hoja de cada pestaña, Fijos en octubre, Límites) y `gastos-pestanas.test.js` (E2E: la fila de Vivienda conserva su enlace a Fijos y no hay fila de Gastos fijos). Unitarias 6421/6421, E2E 583/583.

### fix(deudas): GAS.11d, lo importante cabe por la altura · 2026-11-20

[ADR 186](DECISIONS/186-movimientos-encuentra-y-hormiga-por-frecuencia.md) D7. Pedido "Implementación y correcciones funcionales de Gastos". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v827.

- **Deudas, la primera vez:** Tino ya no mide 104 px de ancho siempre; toma el alto que sobra (`clamp(64px, 30svh - 118px, 104px)`, con `vh` donde no hay `svh`). Bajo 700 de alto se recoge el aire entre las piezas y dentro de las dos tarjetas. A 360 x 640 la calma queda en 523 con la barra en 580 (antes, en 611, tapada por el botón central); a 393 x 740 todo queda igual. La letra no cambia.
- **La factura del fijo** a 360 x 640 pasaba 4 px: bajo 660 de alto se recoge el aire de la cabecera y sobre las filas, sin tocar la letra ni el alto de las filas. La del gasto ya cabía. A 320 x 568 las dos desplazan por dentro con "Guardar" a la vista, como aceptaba el ADR 156.
- Con GAS.11d se cierra GAS.11.
- Pruebas: `gastos-pestanas.test.js` (E2E: Deudas sin deudas a 360 x 640, Tino entre 64 y 104, el título en 20 px, la calma sobre la barra). Unitarias 6406/6406, E2E 583/583.

### fix(fijos): GAS.11c, cada semana es cada 7 días · 2026-11-20

[ADR 186](DECISIONS/186-movimientos-encuentra-y-hormiga-por-frecuencia.md) D6. Pedido "Implementación y correcciones funcionales de Gastos". Ficha: [`contexto/calendario.md`](contexto/calendario.md). SW v826.

- **El cálculo** (`ocurrenciasEnMes`, `infra/vencimientos.js`, la fuente única de Fijos, Atención hoy, el Calendario y los avisos): el semanal repetía su día dentro de cada mes (con el 15: el 15, 22 y 29, y del 29 al 15 siguiente pasaban 16 días; con el 31, un pago al mes). Ahora cuenta 7 días desde el primer pago, el día elegido en el mes en que se creó (el 31 en un mes de 30 es el 30), cruzando meses: 15, 22 y 29 de noviembre, 6, 13, 20 y 27 de diciembre. Un semanal sin fecha de creación conserva el cálculo de antes.
- **Lo que dice:** la factura del fijo semanal pone "Desde el día 15" (antes "El día 15") y el aviso del calendario, "Aparecerá cada semana en tu calendario desde el día 15".
- Las otras seis periodicidades del teléfono (Mensual, Quincenal, Anual, Cada 2, 3 y 6 meses) se verificaron para catorce meses con el día 15 y el 31, también el último de febrero: salen bien y no se tocaron.
- Pruebas: `vencimientos.test.js` (el semanal anclado, el 31 en un mes de 30, el rango que cruza el mes), `compromisos.test.js` (el aviso) y `smoke.test.js`. Unitarias 6406/6406, E2E 582/582 ("dos dispositivos abiertos" de `nube.test.js`, el intermitente, pasó al repetir).

### feat(gastos): GAS.11b, hormiga es lo pequeño que se repite · 2026-11-20

[ADR 186](DECISIONS/186-movimientos-encuentra-y-hormiga-por-frecuencia.md) D5. Pedido "Implementación y correcciones funcionales de Gastos". Ficha: [`contexto/limites.md`](contexto/limites.md). SW v825.

- **La regla** (`gastosHormiga`, `infra/hormiga.js`): hormiga es una compra de hasta el tope cuyo mismo concepto aparece 3 veces en 30 días, sin mirar el carácter. Un gusto suelto ya no cuenta (antes un café de $6.500 lo era) y una necesidad que se repite sí (el pasaje diario). Los pagos de fijos y deudas siguen fuera. Lo aprendido por concepto dice necesidad o deseo para Análisis; ya no saca ni mete en hormiga.
- **Café pasa a "depende"**: Tinto y Café de cafetería preguntan "Necesidad" o "Deseo" dentro de la opción, como Taxi; Bebidas frías es deseo sin preguntar. Antojos sigue siendo deseo.
- **Las palabras:** "Deseos pequeños" pasa a "Gastos hormiga" en Límites (fila, hoja, formulario y avisos), el aviso de Gastos y el logro; Análisis dice "compras pequeñas que repites" y su hoja se titula "Gastos hormiga". El detalle del gasto dice el carácter sin atarlo a hormiga.
- Pruebas: `caracter-gasto.test.js` (la regla, Café, el detalle), `presupuesto.test.js`, `gastos.test.js`, `gastos-pestanas.test.js`, `aprende.test.js`, `logros.test.js`, `taxonomia.test.js`, `analisis-hallazgos.test.js` (semillas con tres repeticiones) y `smoke.test.js`. Unitarias 6402/6402, E2E 582/582.

### feat(movimientos): GAS.11a, Movimientos encuentra lo que anotaste · 2026-11-20

[ADR 186](DECISIONS/186-movimientos-encuentra-y-hormiga-por-frecuencia.md) D1 a D4. Pedido "Implementación y correcciones funcionales de Gastos". Ficha: [`contexto/movimientos.md`](contexto/movimientos.md). SW v824.

- **El título de un gasto** es el de Gastos: la nota ("Almuerzo de trabajo"), si no la subcategoría ("Taxi"), si no la categoría; debajo, "Categoría · Cuenta". Antes la nota no llegaba y la fila decía "Restaurantes" y "Gasto · Nequi".
- **La búsqueda** mira título, categoría, subcategoría y nota, sin tildes ni mayúsculas ("cafe" encuentra "Café"). El campo dice "Busca por nombre, nota o categoría".
- **El tipo por clase** (`claseMovimiento`): Gastos, Gastos fijos, Deudas, Ingresos, Transferencias, Ahorro, Metas, Me deben y Ajustes de saldo. El chip "Deudas" ya no trae el pago de Netflix; el ajuste a mano ya no es una transferencia. "Gastos" e "Ingresos" valen igual, así las llegadas desde Gastos y Mis cuentas no cambian.
- **"Categoría ⌄" y "Cuenta ⌄"** en la fila, cada uno con su panel en línea (uno a la vez) con lo que hay en el historial; elegir deja la pastilla con su ×. Con una categoría, debajo van "Todo" y sus subcategorías. "Cuenta" sale con dos o más.
- **Periodos:** el rango abre con Este mes, Mes pasado, Últimos 3 meses y Este año, que escriben Desde y Hasta. Con cualquier filtro, la lista dice cuántos y cuánto.
- Lo demás del pedido (pestañas, vencidos, el fijo, la factura, categorías, Deudas) ya estaba con GAS.10: el ADR 186 lo detalla punto por punto.
- Pruebas: `movimientos-consulta.test.js` (nuevo: título, clase, búsqueda, subcategoría, opciones, periodos y la barra), `movimientos.test.js` y `smoke.test.js` (el chip de deudas por clase). Unitarias 6400/6400, E2E 582/582.

### feat(deudas): GAS.10g, Deudas, la primera vez y con deudas · 2026-11-19

[ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D8. Tablero "Finko · Gastos móvil, propuesta integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v823.

- **La primera vez:** un solo Tino, sin el sol; "¿Le debes dinero a alguien?" y "Anótalo y Finko te dice cuánto debes, a quién y cuándo pagas."; dos tarjetas lado a lado (Con una entidad: "Banco, cooperativa o crédito"; Con una persona: "Familia, amigos o conocidos") con "+ Agregar"; y "Si no le debes a nadie, no tienes que hacer nada aquí." Sale el segundo Tino. Cabe en 393 x 740 sin desplazar.
- **Con deudas:** la tarjeta dice "Cuotas de noviembre: **$680.000**" (con lo pagado, "· llevas $X", como pedía el ADR 183). Las dos puertas pasan a un selector de dos pestañas con su conteo y sale la frase que repetía la pestaña. Cada fila: "Cuota $400.000 · día 28" (sin cuota, como antes) y la tarjeta con el logo de su banco. "Agregar deuda con..." punteado va antes de "¿Cómo salir más rápido? **Compara dos formas de pagar**", ahora una línea con el bombillo.
- Con GAS.10g se cierran GAS.10 (ADR 185) y GAS.9 (su GAS.9f era este tablero). El HTML del tablero va a la Papelera.
- Pruebas: `gastos-pestanas.test.js` (unitarias y E2E: la línea, el selector, las filas, la primera vez sin desplazar a 393 x 740) y `movil-mv2.test.js`. Unitarias 6379/6379, E2E 582/582 ("dos dispositivos abiertos" de `nube.test.js`, el intermitente, pasó al repetir).

### feat(fijos): GAS.10f, cuándo y la factura del fijo · 2026-11-19

[ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D7. Tablero "Finko · Gastos móvil, propuesta integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v822.

- **Cuándo:** Mensual, Quincenal, Anual y "Otra ⌄" en una fila, y los 31 días debajo; sin el título, el contexto, los rótulos ni el aviso del calendario (quedan para el lector). "Otra" despliega Cada semana, Cada 2 meses, Cada 3 meses y Cada 6 meses (`frecuenciaOtra` escribe el desplegable de siempre).
- **La factura del fijo:** la cabecera bosque con "Gasto fijo" al centro, como la del gasto; sin la barra de pasos, "Así queda tu gasto fijo" ni "Toca un dato para cambiarlo". "Nuevo gasto fijo" chico, la cifra con COP al lado; Servicio ("Netflix" y a su lado "Streaming"), Fecha de pago ("El día 15") y Periodicidad ("Cada mes"), con la flecha.
- **Lo opcional en la factura** (`data-resumen-opcionales`, opt-in del armazón): tras un filete, Débito automático con su interruptor y Para pagar y Nota con "+ Agregar"; sale "Agrega si quieres". El rayo y el billete son sus íconos. "Guardar gasto fijo" en bosque con el chulo.
- Cabe sin desplazar en 375 x 667 y 360 x 740; a 320 x 568 desplaza 67 px por dentro, como la del gasto.
- Pruebas: `compromisos.test.js` y `preguntas.test.js` (las partes, "Otra", los íconos), `movil-mv2.test.js` (el flujo con "Cada 2 meses" y la factura sin desplazar). Unitarias 6379/6379, E2E 582/582.

### feat(fijos): GAS.10e, el gasto fijo, qué es, empresa y sin empresa · 2026-11-19

[ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D6. Tablero "Finko · Gastos móvil, propuesta integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v821.

- **Qué es** sin "Pagas $X" ni el título a la vista (quedan para el lector): el monto va bajo "Nuevo gasto fijo" en la cabecera, como en Nuevo gasto. Las áreas son rótulos y Otros y "Crear categoría" cierran sin el suyo.
- **La empresa:** los logos de 58, cuatro por fila, sin borde; la elegida con su aro y el visto. Por grupo cuando la categoría junta varios (Streaming: "Series y películas" y "Música"; Internet y TV, Celular y Suscripciones también). Sin la tarjeta de contexto, el título, el aviso ni "Sin empresa" en el pie.
- **"Sin empresa: escribir el nombre"**, punteado al final, lleva a "Nombre del servicio": un campo con la teja de la categoría y "Continuar". El fijo se llama así (`nombreServicio`); sin nombre, como la categoría, como antes. Elegir una empresa lo borra.
- Pruebas: `compromisos.test.js` (los grupos, la pantalla y el nombre guardado), `movil-mv2.test.js` (el flujo sin "Pagas" y Streaming hasta "Mubi"). Unitarias 6378/6378, E2E 582/582.

### feat(gastos): GAS.10d, la factura sin desplazar y la nota aparte · 2026-11-19

[ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D5. Tablero "Finko · Gastos móvil, propuesta integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v820.

- **La cifra con "COP" al lado** (38 px, en la tinta) bajo "Nuevo gasto" de 13; cada dato con su rótulo de 11,5 sobre el valor de 15 y la flecha a la derecha; el glifo de la categoría en su tono (los del tema claro: el papel es crema en los dos).
- **"Detalle"** en lugar de "¿En qué fue?" o "¿Necesidad o deseo?". **La cuenta:** el banco (el ícono del edificio; la tarjeta conserva el suyo) y a su lado "quedan $2.955.000" o "cupo $X", sin el tipo; con dos cuentas del mismo banco, el nombre entero para no confundirlas.
- **La nota** es una línea tras un filete: "Nota" y "+ Agregar"; escrita, el texto y "Cambiar". Su hoja dice "Nota", el campo de tres líneas y "Listo", sin la frase ni la X (el velo, Esc y Listo la cierran). "Guardar gasto" lleva el chulo.
- Cabe en 375 x 667 sin desplazar (medido: sobra 0). A 320 x 568 desplaza 39 px por dentro, como ya aceptaba el ADR 156.
- Pruebas: `gastos-telefono.test.js` (la nota, la cuenta sin tipo y con homónima, el cupo, "Detalle"), `gastos-registro.test.js` y `movil-mv2.test.js`. Unitarias 6376/6376, E2E 581/581 ("dos dispositivos abiertos" de `nube.test.js`, el intermitente, pasó solo).

### feat(gastos): GAS.10c, Nuevo gasto por áreas y la pregunta adentro · 2026-11-19

[ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D4. Tablero "Finko · Gastos móvil, propuesta integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v819.

- **Categoría:** sale la instrucción de título (queda para el lector); las dieciséis bajo Comida, Movilidad, Personal y Casa y familia, en dos columnas de 48, el ícono de 34 en el tono de su categoría (`--teja-tono`). Al final, Otros, las propias y "Crear categoría" punteada a su lado. El orden es el del tablero: el teléfono deja de ordenar por uso.
- **Detalle:** arriba la teja de 44 y el nombre de la categoría; las opciones con su aro, la elegida en negrita con el aro y el fondo en su tono. Cuando depende del momento (Taxi), "Necesidad" y "Deseo" aparecen dentro de esa opción (`colocarPregunta` muda el `fieldset`), sin título ni ayuda. En Otros o una propia, la pregunta va sola con su frase.
- Pruebas: `gastos-telefono.test.js` (las áreas, el tono, la cabecera y la pregunta tras Taxi), `gastos-registro.test.js` (todo cabe a 390, Entretenimiento en una línea, la pregunta pegada a Taxi) y `movil-mv2.test.js`. Unitarias 6376/6376, E2E 581/581.

### feat(gastos): GAS.10b, categorías para Colombia · 2026-11-19

[ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D3. Tablero "Finko · Gastos móvil, propuesta integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v818.

- **Antojos** (antes Mecato, con la torta y en rosa); "Paquetes y snacks", "Frutas y verduras" y "Maquillaje y belleza". Los ids `mecato-*` y `mercado-plaza` no cambian.
- **Carro o moto**, nueva (pizarra, el carro, necesidad): Gasolina, Parqueadero y Peajes salen de Transporte y llegan Lavado y Taller y repuestos. Arreglos se une a "Ferretería y arreglos".
- **Carácter:** Entretenimiento, Decoración y Uñas y spa son deseo; Muebles y electrodomésticos se pregunta. Familia pasa a lila y Mascotas a café.
- **Migración v58:** Mecato pasa a Antojos en gastos, límites y lo aprendido (`c:Mecato|` a `c:Antojos|`); la gasolina guardada en Transporte pasa a Carro o moto, y un límite de Transporte por partes se parte (las partes que se van forman uno de Carro o moto con su suma); una categoría propia llamada Antojos o Carro o moto se retira.
- **El selector de ícono propio de Gastos** (`ICONOS_CATEGORIA_GASTO_PROPIA`) deja fuera el carro y la torta; la lista compartida no cambia: metas, cuentas y fijos la usan para validar.
- **Docs:** el mensual de noviembre pasó sus 200 KB y se parte: del 3 al 6 en [`changelog/2026-11-a.md`](changelog/2026-11-a.md).
- Pruebas: `categorias-colombia.test.js` nuevo (áreas, nombres, carácter y la migración, idempotente); los fixtures con Mecato pasan a Antojos. Unitarias 6376/6376, E2E 581/581.

### feat(gastos): GAS.10a, cada lugar con una función · 2026-11-19

[ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D1 y D2; cambia el ADR 182 D1 a D3. Tablero "Finko · Gastos móvil, propuesta integral" (GAS.9f). Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v817.

- **Sale la fila "Gastos"** con la teja, la lupa y el ojo: las pestañas son el primer renglón y el contenido sube 56 px. Fijos y Deudas llevan el punto rojo de lo vencido junto al nombre.
- **El ojo vuelve a cada tarjeta**, en un círculo a la derecha del rótulo, y sigue tapando su lente (ADR 166): el tablero daba por hecho uno para las cuatro.
- **La lupa es el primer botón de los filtros** (antes el embudo): Movimientos con Gastos y el foco en la búsqueda. Sale la franja de lo vencido de Día a día.
- **"Hoy · jue 19", "Martes 17 · nov"** (`complementoDiaGastos`), la diferencia en negrita y la primera vez con Tino al lado, sin botón ni sol, "Restaurantes" en la teja y la pista "Anótalo en Fijos" punteada.
- Pruebas: `bloque-gastos.test.js` y `gastos-pestanas.test.js` (unitarias), `gastos-pestanas`, `gastos-registro` y `smoke` (E2E). Unitarias 6366/6366, E2E 581/581.

### feat(inicio): INI.7b, "Atención hoy" en filas · 2026-11-19

[ADR 184](DECISIONS/184-inicio-dos-fichas-en-la-banda-y-atencion-hoy-en-filas.md) D2; cambia el ADR 152 D3 y D9 y el 126 D3 en "Atención hoy". Tablero "Mejoras visuales de Inicio - Bancos, Efectivo y Atención hoy". Cierra INI.7. Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v816.

- **Cada compromiso es una fila de 84:** logo de 40, nombre, estado con ícono y palabra en su color (rojo y triángulo, ámbar y reloj, gris y calendario, azul y círculo) y valor en cifras tabulares, con la flecha. Tocarla abre el lote con solo ese pago marcado (`inicio-pagar-uno`).
- **"N pagos · $X"** bajo el título, hasta tres filas, "N pagos más · $X" con sus logos y "Ver todos" (la hoja), y "Pagar los N" al pie. Sale el aviso destacado que resumía y "Ver los N".
- **Lo que no es un pago va aparte**, bajo "También necesita tu atención", una fila por aviso: el débito sin saldo con el logo de la cuenta, tu ingreso por distribuir, lo que te deben, la reserva de hoy, la nube.
- **La teja sin marca es neutra** (`tejaDePago` con `neutra`, también en la hoja): el frambuesa se confundía con el rojo de lo vencido. De paso, la teja buscaba el compromiso con el id del aviso (`tipo:id`) y nunca lo hallaba: sin marca salía siempre el ícono de deudas.
- **Lo que el tablero promete y el motor no trae:** el monto del ingreso por distribuir; esa fila sale sin valor.
- Pruebas: `atencion-hoy.test.js` (piezas, acciones, resumen, topes, lo de aparte), `inicio-rediseno.test.js` (84, 40, 48 y el lote con un solo pago marcado); `inicio-hoy`, `smoke`, `inicio-control-pago` y `movimientos-deshacer` ajustadas. Unitarias 6366/6366, E2E 580/580.

### feat(inicio): INI.7a, dos fichas en la banda · 2026-11-19

[ADR 184](DECISIONS/184-inicio-dos-fichas-en-la-banda-y-atencion-hoy-en-filas.md) D1; cambia el ADR 181 D1 en el teléfono. Tablero "Mejoras visuales de Inicio - Bancos, Efectivo y Atención hoy", la alternativa que eligió Esteban ("dos fichas en la banda"); la tarjeta puente no se aplica. Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v815.

- **Dos fichas en lugar de la ficha partida:** Bancos (logos de 26 montados 8) y Efectivo (disco verde de 34 con su billete), píldoras de 52 a 8 una de otra, sin flecha y con los montos en blanco. La banda sigue en 268 a 390 x 844 (4 de margen bajo las fichas).
- **Cada una abre su grupo:** "En bancos · N cuentas" o "En efectivo" ("Lo que llevas encima"). La otra ficha cambia de grupo sin cerrar; Escape devuelve el foco a la que lo abrió. `#saldo-detalle-toggle` ya no existe: el contenedor es `#saldo-fichas` y cada ficha lleva `data-lado`.
- **Lo que el tablero no mide:** a 360 y 320 no cabían en una línea; relleno, espacio, letra y tejas se encogen con el ancho, las cifras de diez caracteres bajan a 14 y, como último recurso, la segunda ficha baja de línea. Ningún monto se corta.
- Pruebas: `render.test.js` (grupos por ficha, cambio de grupo, la que se calla, máscara, cifras largas), `inicio-rediseno.test.js` a 390, 360 y 320 y cifras largas a 320; `smoke.test.js` e `inicio-control-pago.test.js` ajustadas. Unitarias 6366/6366, E2E 579/579.

### fix(cuentas): GAS.9g, la tarjeta con su nombre en Mis cuentas · 2026-11-19

[ADR 183](DECISIONS/183-gastos-que-cuadran.md) D4. Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v814.

- **La causa:** desde MC.16c la fila leía `tarjeta.nombre`; una deuda guarda su nombre en `descripcion`. La tarjeta salía sin nombre y con el ícono genérico (lo mostró la captura a 390 px de GAS.9d).
- **El arreglo:** lee `descripcion` y pone el logo del banco que el nombre diga, como la fila de Deudas.
- Pruebas: `tarjeta-en-mis-cuentas.test.js` (nombre, etiqueta y logo con un nombre guardado como en la app). Unitarias 6363/6363, E2E 577/577.

### feat(limites): GAS.9e, Límites sugiere al registrar, una vez · 2026-11-19

[ADR 183](DECISIONS/183-gastos-que-cuadran.md) D5. Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v813.

- **Cuándo:** al guardar el tercer gasto del mes (o más) en una categoría sin ningún límite, ni de una parte. Solo cuenta el día a día. Una vez por categoría y mes, y como mucho una al día; el "Ahora no" de Límites también la apaga.
- **Qué dice:** "Has hecho 3 gastos en Restaurantes este mes. ¿Quieres ponerle un límite para controlar cuánto gastas en esta categoría?"; si una parte pesa la mayoría (Domicilio), la sugerencia es para esa parte. "Poner límite" abre Nuevo límite con la categoría puesta.
- **Cómo se ve:** el aviso con Tino de siempre, detrás del aviso del gasto, hasta que llegue el diseño de Claude Design.
- Pruebas: `limite-sugerencia-al-registrar.test.js` (los límites existentes, el mes, una vez, una al día, pagos fuera, tarjeta, parte, categorías propias) y E2E `limite-sugerencia.test.js`. Unitarias 6362/6362, E2E 577/577.

### feat(cuentas): GAS.9d, la tarjeta de crédito nace y se administra en Mis cuentas · 2026-11-19

[ADR 183](DECISIONS/183-gastos-que-cuadran.md) D4, sobre el modelo del [ADR 051](DECISIONS/051-tarjeta-de-credito-producto-integrado.md). Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v812.

- **La puerta:** "Agregar cuenta" (Efectivo, Cuenta de ahorros, Cuenta corriente, Tarjeta de crédito) es la única que crea una tarjeta; su formulario se llama "Nueva tarjeta de crédito". Deudas ya no ofrece el chip y dice "Agrégala en Mis cuentas", que abre esa misma puerta.
- **La administración:** la fila de la tarjeta en Mis cuentas abre su hoja: cupo, disponible, pagar, sacar un avance, editar y eliminar; "Ver la deuda" lleva a Deudas. Desde Deudas la hoja lleva a Mis cuentas.
- **Lo revisado del modelo:** el cupo no es dinero propio ni ingreso; la compra sube la deuda una vez y no toca cuentas; el pago la baja y sale de una cuenta. Las tarjetas de antes siguen iguales.
- Pruebas: `tarjeta-en-mis-cuentas.test.js` (la puerta, la hoja y la contabilidad); E2E de "Agregar cuenta", la pista de Deudas y la hoja desde Mis cuentas; las de tasa alta y MV2 usan un crédito. Unitarias 6351/6351, E2E 576/576.

### fix(fijos): GAS.9c, el vencimiento se cuenta desde el último pago · 2026-11-19

[ADR 183](DECISIONS/183-gastos-que-cuadran.md) D3, cambia la regla por mes de `vencidosSinPagar` (CAL.5b, HF.0d). Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v811.

- **La causa:** el vencimiento solo miraba el mes en curso. Disney+ del 15 de julio sin pagos decía el 19 de noviembre "Venció hace 4 días".
- **La regla** (`pendientesDeObligacion`): las fechas de la obligación salen de su creación y su frecuencia; el último pago cubre la fecha de su mes y todo lo de antes; lo que vence después y ya pasó está pendiente. Una deuda con abono parcial sigue pendiente por lo que falta; una compra con la tarjeta no es pago.
- **Lo que se ve:** el atraso se cuenta desde la fecha pendiente más vieja y se dice en meses desde 31 días; la franja de Día a día dice cuántos pagos y lo que suman; el lote, Inicio y el Calendario traen lo vencido de meses anteriores.
- **Avisos:** una obligación vencida no avisa además "vence en N días" dentro del mismo mes.
- Pruebas: `vencimiento-desde-ultimo-pago.test.js` (el caso Disney+, pagos al día, mismo mes, bimestral, deudas, tarjeta, lote y avisos); semillas de `avisos`, `estado-obligacion`, `vencimiento-unico` y `gastos-pestanas` nacidas en su ciclo. Unitarias 6339/6339, E2E 574/574.

### fix(gastos): GAS.9b, cada pestaña con su resumen · 2026-11-19

[ADR 183](DECISIONS/183-gastos-que-cuadran.md) D2, cambia el D4 del [ADR 182](DECISIONS/182-gastos-cada-cosa-con-su-forma-y-su-color.md). Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v810.

- **Día a día:** fuera todo pago de un fijo o de una deuda aunque se le haya cambiado la categoría a mano (`compromisoId` sin `consumoTC`); una compra con la tarjeta sí cuenta. Mismo criterio en la tarjeta y en la hoja de meses (`esDelDiaADia`).
- **Fijos:** la segunda pestaña vuelve a llamarse así y solo tiene fijos: lista, tarjeta "Pagaste $X de $Y", lote y pastilla. Deja la mezcla con las cuotas de GAS.8d.
- **Deudas:** la línea de la tarjeta habla del mes del encabezado: lo pagado en cuotas, y en un mes pasado, lo que se pagó ese mes.
- **Por pagar** (desde Inicio o un aviso) cae en la pestaña del tipo que se pidió o en la que tiene algo vencido.
- Pruebas: unitarias de `esDelDiaADia`, la línea de Deudas y `lentePorPagar`; E2E del botón central, Ahorro y MV2 al día con Fijos. Unitarias 6321/6321, E2E 574/574.

### fix(gastos): GAS.9a, la raya café al cambiar de pestaña · 2026-11-19

[ADR 183](DECISIONS/183-gastos-que-cuadran.md) D1. Ficha: [`contexto/gastos.md`](contexto/gastos.md), partida en [`contexto/gastos-registro.md`](contexto/gastos-registro.md). SW v809.

- **La causa:** la tarjeta compacta de Día a día (GAS.7c) quedaba encendida al irse a otra pestaña: su `IntersectionObserver` no avisa si el cruce no cambia, y con la sección oculta la tarjeta mide 0. Al volver se pintaba fija bajo las pestañas y asomaba su borde coral.
- **El arreglo:** con la tarjeta en 0 la compacta se apaga, y cada `hashchange` la apaga y la vuelve a observar (`_enlazarCompactaAlNavegar`). Pasa a bosque, como el resumen.
- **Las pestañas:** recorridas con toques en Chromium y WebKit, responden y la marcada es la que se ve; no había fallo de navegación que corregir.
- **Docs:** la ficha de Gastos pasaba su techo; el registro de un gasto (formulario, confirmación y "Repetir") pasa a `contexto/gastos-registro.md` sin cambios.
- Pruebas: E2E `gastos-pestanas` (las cuatro pestañas con toques y la compacta al volver). Unitarias 6318/6318, E2E 574/574.

## Convención de entradas

Cada entrada agrupa por fase/release y dentro lista commits con:
- **tipo(área)** - `commit_hash` · `archivos tocados` - descripción de qué cambió.

Tipos: `feat` (nueva funcionalidad), `fix` (bug), `refactor` (sin cambio funcional), `test`, `docs`, `chore` (config/build), `style` (formato).
