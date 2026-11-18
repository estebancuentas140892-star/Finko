# Changelog - Finko Claude

> Revisado: 2026-11-18.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-11)

### feat(analisis): ANA.1b, Tus gastos por periodo · 2026-11-18

[ADR 176](DECISIONS/176-analisis-en-dos-lentes.md) D2 a D5 y D7, que reabre el [ADR 090](DECISIONS/090-analisis-cada-bloque-declara-su-alcance.md) D4. Ficha: [`contexto/analisis.md`](contexto/analisis.md). SW v774.

- **El periodo:** Día, Semana (de lunes a domingo), Mes (la de entrada) y Año en cuatro pastillas, y "‹ Noviembre ›" en el encabezado de la sección (`#analisis-periodo`, sin la teja del título, como el bloque Gastos). Las flechas no pasan del periodo en curso ni antes del primer gasto; cambiar de tipo vuelve a hoy. Vive en memoria. En Tu situación la pastilla no aparece.
- **El encabezado** es la tarjeta de identidad de Análisis (pizarra, `.hero-analisis`) con el total, la comparación en pastilla (verde solo al bajar, `--fk-hero-ok` igual en los dos temas) y su gráfica: la barra contra el promedio diario del mes (Día), siete barras (Semana), el ritmo acumulado contra el mes anterior (Mes) y doce barras con la línea del promedio (Año).
- **A la misma altura:** `periodoAnteriorALaAltura` corta el periodo anterior en el mismo día (un 31 contra un mes de 30 se queda en el 30); un periodo cerrado se compara completo. La pastilla de la tendencia del escritorio también: "↓ 25% vs mes anterior a esta altura".
- **El promedio por mes del año** sale de los meses cerrados con gasto: el mes en curso no lo arrastra y un mes sin registro no cuenta como cero.
- **En qué gastas:** la barra mide la parte del total (antes, contra la mayor); desde siete categorías, cinco y "Otras N categorías" con sus nombres; la frase del mayor gasto. En el día, cada gasto de mayor a menor con su subcategoría o nota y su cuenta, y "Ver el día en Gastos" (Movimientos con los gastos y la fecha puestos).
- **Sin gastos:** Tino tranquilo sobre su sol y, en un día o en el periodo en curso, "Registrar un gasto" (en un día pasado, "del 17", que abre el formulario con esa fecha: `nuevo-gasto` acepta `data-fecha`, nunca futura).
- Salen las barras de "A dónde va tu dinero" y su frase (`fraseDelMes`); "Más detalle de tus gastos" queda en el mes en curso hasta ANA.1c.
- Pruebas: `analisis-periodo.test.js` nuevo (rangos, moverse, la misma altura, los cuatro periodos, las frases, la pastilla y lo que pinta cada periodo), `analisis-telefono.test.js` (la barra de la parte) y `movil-mv2.test.js` (los periodos a 390 px). Unitarias 6152/6152, E2E 540/540.

### feat(analisis): ANA.1a, las dos lentes y Tu situación · 2026-11-18

[ADR 176](DECISIONS/176-analisis-en-dos-lentes.md) D1 y D9, que reemplaza el [ADR 134](DECISIONS/134-consultar-del-adulto-en-el-telefono.md) D7 bajo 1024px. Tablero "Finko · Rediseño de Análisis". Ficha: [`contexto/analisis.md`](contexto/analisis.md). SW v773.

- **Las lentes:** "Tus gastos" y "Tu situación" en un riel bajo el título; entra por Tus gastos. La lente vive en memoria (`lenteAnalisis()`, acción `analisis-lente`): al recargar vuelve a la de entrada.
- **Tu situación:** "Hoy, miércoles 18 de noviembre" y tres tarjetas. La salud con su barra en el color de la banda y "De dónde sale el N" como fila; lo que realmente tienes con el neto, la frase (el porcentaje de las deudas en negrita) y dos filas, "Lo que tienes" (sus partes en una línea: hasta cuatro, todas; desde cinco, tres y "y N más") y "Lo que debes" ("2 deudas: Tarjeta y Carro"); y la renta, que solo avisa con alerta.
- **Tres hojas nuevas** en `#modal-detalle-fila`: los cuatro factores, las partes de lo que tienes (con el aviso de préstamos sin cuenta) y las deudas con su saldo (con "Complétala en Por pagar" prefiltrado, ADR 090 D1). Un enlace de cualquier hoja de Análisis la cierra al navegar.
- **Tus gastos queda como en la tanda 4** (meses en barras, categorías y "Más detalle de tus gastos") hasta ANA.1b y ANA.1c.
- Pruebas: `analisis-telefono.test.js` (lentes, Tu situación, las tres hojas, las frases) y `movil-mv2.test.js` (las dos lentes con sus hojas a 390 px). Unitarias 6130/6130, E2E 539/539.

### feat(deudas): AVC.1b, sacar un avance desde la tarjeta, con su costo en pesos · 2026-11-18

[ADR 169](DECISIONS/169-un-avance-no-es-un-gasto.md) D1 a D3 y D7. Ficha: [`contexto/deudas.md`](contexto/deudas.md). SW v772.

- **Dónde:** "Sacar un avance" en la hoja de una tarjeta con cupo (teléfono y escritorio), también si no debe nada, y "Avance" en la tarjeta de escritorio. La fila del teléfono no lo lleva: tiene un solo primario ([ADR 117](DECISIONS/117-por-pagar-por-urgencia-y-en-filas.md)).
- **El formulario** (`renderFormAvance`, en la hoja del abono): el monto (en el teléfono, Monto · Revisar con el teclado de Finko), "¿A dónde llegó?" con Efectivo primero (sin cuenta Efectivo, una nueva que se crea en $0 al guardar), las cuotas de 1 a 36 sin ninguna marcada y en tres columnas, la tasa solo si la tarjeta no la tiene (queda guardada en ella), la comisión opcional y la fecha.
- **Antes de guardar:** el costo en pesos (`textoCostoDeAvance`: cuota exacta, intereses y costo a la centena), la línea del fondo de emergencia si tiene dinero y el aviso de cupo, que no bloquea.
- **Gastos (D7):** el interruptor pasa a "Lo pagué con un avance" y su aviso manda a "Sacar un avance". El aviso del cajero de otra red ([ADR 051](DECISIONS/051-tarjeta-de-credito-producto-integrado.md) D7) pasa a la ayuda de la comisión, donde ahora se anota ese costo.
- **Queda fuera:** deshacer un avance desde la hoja de la tarjeta (D6); se deshace desde Movimientos. El ejemplo del D2 dice "$625.400"; la app redondea a la centena y dice "$625.500".
- Pruebas: `avances.test.js` (el texto del costo, la tasa escrita, la cuenta Efectivo nueva), `avance-formulario.test.js` nuevo (lo que pinta, dónde se ofrece, guardar con y sin Efectivo, los errores y el cupo), `gastos.test.js` (el texto nuevo) y `e2e/avance.test.js` (escritorio y 390 px, con deshacer). Unitarias 6124/6124, E2E 539/539.

### feat(deudas): AVC.1a, el avance en los datos: la tarjeta presta y la cuenta recibe · 2026-11-18

[ADR 169](DECISIONS/169-un-avance-no-es-un-gasto.md) D4 a D6, que cambia el [ADR 051](DECISIONS/051-tarjeta-de-credito-producto-integrado.md) D7. Pedido "Revisión de servicios, categorías y movimientos", punto 10. Fichas: [`contexto/deudas.md`](contexto/deudas.md) y [`contexto/movimientos.md`](contexto/movimientos.md). Schema v56, SW v771. Sin pantalla nueva: "Sacar un avance" llega con AVC.1b.

- **El modelo:** `Compromiso.avances` (v56, migración sin cambios de datos) y `compromisos/logic/avances.js`: `costoDeAvance` (cuota fija del sistema francés con la tasa EA de la tarjeta; el ejemplo del ADR da $25.649 de cuota y $115.586 de intereses), `validarAvance`, `normalizarAvance`, `deltasDeAvance`, `aplicarAvance` y `buscarAvance`. La cuenta sube el monto; la tarjeta, monto y comisión, y su cuota, la del avance con intereses. El patrimonio solo baja la comisión.
- **Movimientos:** fila nueva `avance`, que entra a la cuenta de destino ("Avance de Visa Bancolombia") con "Deshacer movimiento" y su nombre en el Excel del mes. `efectoEnCuenta` la suma sin cambios. Movimientos repinta también con `compromisos`, que antes no escuchaba (la deuda recibida, D.14, tampoco repintaba).
- **Deshacer:** `planDeshacer` encuentra el avance dentro de su tarjeta. El registro lleva `padreId` y `campo` en vez de una colección propia, y `aplicarDeshacer` lo quita de la lista y lo devuelve si algo falla. Se bloquea si el dinero ya se usó (la cuenta quedaría bajo $0), si la tarjeta ya se pagó por debajo del avance o si se archivó.
- **Borrar la tarjeta** saca de cada cuenta lo que le entró por sus avances (`reversionAvancesAlBorrar`), como ya pasaba con la deuda recibida (D.14). No estaba en el ADR: lo exige la I3 del [ADR 053](DECISIONS/053-invariante-de-patrimonio.md), porque sin la tarjeta no queda fila que explique ese dinero.
- **Por qué dentro de la tarjeta y no en una colección:** es lo que dice el ADR 169 D5, y así viaja a la nube con su tarjeta sin tocar la sincronización.
- Pruebas: `avances.test.js` nuevo (costo, validación, efectos, la fila, R-HF2, patrimonio, deshacer con sus bloqueos y la migración), `movimientos.test.js` (la fila solo ofrece deshacer) y `registro-saldo.test.js` (la ruta R-HF2 de un avance y de borrar su tarjeta). Unitarias 6105/6105, E2E 537/537.

### feat(vista): VIS.1b, el escritorio sin título repetido, el Calendario más bajo y Por pagar sin la ayuda aprendida · 2026-11-18

[ADR 168](DECISIONS/168-lo-importante-sin-desplazar.md) D3 a D6, que acota el [ADR 079](DECISIONS/079-armazon-de-escritorio-una-identidad-un-primario-una-navegacion.md) D1 y el [ADR 132](DECISIONS/132-gastos-del-adulto-en-el-telefono.md) D7. Cierra VIS.1. Fichas: [`contexto/escritorio.md`](contexto/escritorio.md), [`contexto/calendario.md`](contexto/calendario.md), [`contexto/deudas.md`](contexto/deudas.md). SW v770.

- **Escritorio:** el encabezado de la sección se oculta desde 1024 y no desde 1680 (el nombre ya está en la barra y cabe entero); Inicio conserva el suyo. Metas y el Calendario caben enteros en 1440x900.
- **Calendario:** la celda mide 44px bajo 1024 (antes 48) y 70px desde 1024 (antes 80); el encabezado del mes, el de los días y la leyenda se acercan. En el teléfono de 390x844 asoma "Vencido" con su total bajo el mes.
- **Por pagar:** "Toca el círculo cuando pagues algo" sale solo hasta el primer pago.
- Se quedan abajo a propósito: Análisis (reporte), el reparto del ingreso, las categorías sin tope, la nota del Fondo y la tercera deuda en escritorio (D6).
- Pruebas: `compromisos.test.js` (la línea se va tras el primer pago), `movil-mv2.test.js` (la semilla ya pagó: sin línea), `smoke.test.js` (en escritorio el nombre del Calendario está en la barra). Unitarias 6071/6071, E2E 537/537.

### feat(cuentas): VIS.1a, la pregunta de la cuenta marcada a la vista · 2026-11-18

[ADR 168](DECISIONS/168-lo-importante-sin-desplazar.md), que acota el [ADR 080](DECISIONS/080-mis-cuentas-un-primario-y-lo-informativo-al-pie.md) D1. Pedido "Gastos día a día", General, punto 2. Ficha: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md). SW v769.

- Auditoría de las 13 secciones en teléfono (390x844) y escritorio (1440x900) con la semilla de los E2E: `scripts/auditoria-pliegue.js` deja capturas con la línea del pliegue.
- "¿Cuál es tu cuenta marcada exenta del 4x1000?" sale de la banda "Solo informativo" y se pinta bajo Transferir (`#tesoreria-gmf-marcada`): en el teléfono antes de "Tu ingreso", en el escritorio en el hueco de la columna de las cuentas.
- Pruebas: `tesoreria.test.js` (la pregunta va bajo las cuentas y se va con la marcada elegida); `tino-bienvenida.test.js` conoce las novedades 768 de GF.1. Unitarias 6070/6070.

### feat(fijos): GF.1, el monto de Día a día, las categorías de Colombia y "Otros" sin adornos · 2026-11-18

[ADR 167](DECISIONS/167-gastos-fijos-categorias-de-colombia.md), con la investigación de hábitos y empresas. Pedido "Gastos fijos", puntos 1 a 4. Fichas: [`contexto/categorias.md`](contexto/categorias.md) y [`contexto/captura.md`](contexto/captura.md). Schema v55, SW v768.

- **El monto:** en el teléfono, "¿Cuánto pagas?" se ve como "¿Cuánto gastaste?" (pregunta al centro, cifra grande, lectura en palabras, teclado de Finko sin salida al del sistema). Lo pide `data-cifra` en el armazón de preguntas.
- **Las categorías:** salen Mercado, Transporte y Mascotas (son de Día a día); entran Medicina prepagada, Seguridad social, Impuestos y Servicio doméstico; "Internet y TV", "Celular" y "Otros" reemplazan a Internet, Telefonía y Otro. Un fijo viejo de Mercado se edita sin perder su categoría.
- **Las empresas:** Servicios públicos (EPM, Enel, Vanti, Acueducto de Bogotá y 12 más), Internet y TV, Celular, Medicina prepagada, Seguros y Gimnasio ofrecen las del país, con iniciales hasta el vector de Esteban; Win+ Fútbol entra a Streaming. WOM queda fuera: perdió el nombre en 2026.
- **"Otros":** sin ícono ni nombre propio; lo escrito va a la nota. Un "Otro" guardado con nombre propio queda sin categoría y se ve igual que antes.
- **Novedades 768:** "Tus gastos fijos, más ordenados".
- Pruebas: `compromisos.test.js` (catálogo, retiradas, "Otros", EPM), `storage.test.js` (v55), `marcas.test.js` (empresas y aliases), `preguntas.test.js` (`data-cifra`), `gastos.test.js`, `smoke.test.js` ("Otros" y EPM), `movil-mv2.test.js` (el monto centrado). Unitarias 6068/6068, E2E 537/537.

### feat(privacidad): OJO.1, un ojo por sección · 2026-11-18

[ADR 166](DECISIONS/166-un-ojo-por-seccion.md). Pedido "Gastos día a día", General, punto 1. Ficha: [`contexto/transversal.md`](contexto/transversal.md). SW v767.

- Ocultar los montos en una sección ya no tapa las demás: cada una guarda su ojo (`config.ocultarPorSeccion`, `infra/privacidad.js`), también cada lente de Gastos (Día a día, Por pagar, Límites).
- Hojas y formularios abiertos desde cualquier lado siguen a la sección a la vista; el menú Más, a la de cada resumen. Quien tenía todo oculto lo sigue teniendo hasta tocar el ojo de cada sección (respaldo `ocultarSaldo`).
- Pruebas: `privacidad.test.js`, `render.test.js`, `tesoreria.test.js`, `smoke.test.js` (Mis cuentas no tapa Inicio; el Calendario guarda su ojo), `movil-mv2.test.js` (el ojo del encabezado de Movimientos queda presionado). Unitarias 6050/6050, E2E 537/537.

### feat(cuentas): GMF.1b, el 4x1000 en gastos y pagos · 2026-11-17

[ADR 165](DECISIONS/165-el-4x1000-segun-la-cuenta.md) D4. Ficha: [`contexto/movimientos.md`](contexto/movimientos.md). SW v766.

- Un gasto, el pago de un fijo o una deuda y el abono que salen de una cuenta que paga guardan `costoGMF` y lo descuentan con el monto; el recibo del teléfono lo dice y Movimientos lo traza. Editar lo recalcula; borrar y deshacer lo devuelven (`deltasPorEdicionDeGasto`).
- Nunca deja la cuenta bajo $0: si el saldo no cubre el 4x1000 entero, cuenta lo que alcance (`gmfDeRetiro`). "Distribuir mi ingreso" todavía no lo descuenta.
- Pruebas: `gmf-gastos.test.js`, `gastos-telefono.test.js` (el recibo). Unitarias 6045/6045, E2E 537/537.

### feat(cuentas): GMF.1a, el 4x1000 según la cuenta y la cuenta marcada · 2026-11-17

[ADR 165](DECISIONS/165-el-4x1000-segun-la-cuenta.md) D1 a D3, con la investigación de la norma vigente. Pedido "Gastos día a día", sección Mis cuentas. Ficha: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md). SW v765.

- **El régimen** (`infra/gmf.js`): efectivo no aplica; Nequi y Daviplata, bajo monto (exentos hasta 65 UVT, $3.404.310 al mes); una corriente paga en cada retiro; una de ahorros paga salvo que sea la marcada (exenta hasta 350 UVT, $18.330.900 al mes). Sobre el tope del mes, paga.
- **La marcada:** "¿Es tu cuenta marcada exenta del 4x1000?" al agregar o editar una cuenta que puede serlo; una sola (marcar otra pregunta si la marca pasa). Las cuentas de antes sin respuesta no pagan y Mis cuentas pregunta cuál es; la que tenía la casilla de pagar, sigue pagando.
- **Transferencias sin casilla:** entre cuentas del mismo banco no hay 4x1000; si el origen es exento, solo sobre su tope; la pista lo dice en vivo.
- **Lo que se ve:** el chip y la hoja de cada cuenta dicen su régimen ("Exenta 4x1000", "Bajo monto", "Paga 4x1000 en cada retiro").
- Pruebas: `gmf.test.js` (régimen, costo, retiros del mes, mismo banco), `tesoreria.test.js` (la cuenta y la transferencia), `smoke.test.js` y `movil-mv2.test.js` (la pregunta en escritorio y en el teléfono). Unitarias 6038/6038, E2E 537/537.

### feat(limites): LIM.2, el límite puede ir por subcategoría · 2026-11-17

[ADR 164](DECISIONS/164-limite-por-subcategoria.md). Pedido "Gastos día a día", sección Límites. Ficha: [`contexto/limites.md`](contexto/limites.md). SW v764.

- **El modo:** al poner un límite a una categoría con subcategorías, "¿Cómo quieres el límite?": Toda la categoría o Por subcategoría. Por subcategoría, un máximo para cada una (vacía es sin límite propio) y el de la categoría es la suma. En el teléfono es una pregunta más; las categorías propias no lo ofrecen.
- **Sin tocar lo demás:** el tope guarda `subcategorias` y `montoMensual` sigue siendo el total, así los avisos, la cobertura del plan y la consecuencia al registrar no cambian.
- **Lo que se ve:** bajo el tope, cada subcategoría con su barra y "$240.000 de $300.000", y "Sin límite propio: $X, cuenta en el total". En la fila del teléfono, el sobre de escritorio y la hoja.
- **Novedades 764:** al actualizar, la hoja "Tus gastos, más claros" cuenta el paso "¿En qué fue?", la pregunta de necesidad o deseo, el saldo que no baja de $0 y este límite.
- Pruebas: `limites-subcategoria.test.js` (lógica, formulario, edición que vuelve al tope único, la lista), `tino-bienvenida.test.js` (la novedad 764). Unitarias 6027/6027, E2E 537/537.

### fix(cuentas): SAL.1, ninguna cuenta queda por debajo de $0 · 2026-11-17

[ADR 163](DECISIONS/163-ninguna-cuenta-por-debajo-de-cero.md); extiende el ADR 161 D2 a toda la app. Pedido "Gastos día a día", punto 4, y la respuesta de Esteban: "Sí, en todo Finko". Ficha: [`contexto/transversal.md`](contexto/transversal.md). SW v763.

- **Los nueve flujos** que con una sola cuenta preguntaban "quedará en negativo, ¿registrar de todas formas?" ahora avisan y no registran: pagar un fijo ("Marcar pagado"), abonar a una deuda, pagar varios a la vez, aportar a una meta o a un apartado, registrar o subir una inversión, subir un préstamo y transferir (con su 4x1000).
- **Un solo aviso** (`mensajeSinSaldo`): cuánto tiene, cuánto necesita, cuánto falta, y que se elija otra cuenta o se corrija el saldo en Mis cuentas si está atrasado. Un botón, "Entendido".
- **Tino:** sale la pose compuesta `tino-anota.svg` (GAS.5a); el vacío de Día a día vuelve a `explica` hasta que Esteban entregue el SVG de Tino con la libreta.
- Pruebas: `cuenta-helper.test.js` (el mensaje), `smoke.test.js` (el aporte a una meta que no alcanza no se registra), `ahorro-inversion.test.js` (la inversión sin saldo no se registra). Unitarias 6016/6016, E2E 537/537.

### feat(gastos): GAS.5c, "¿En qué fue?" y necesidad o deseo en cada gasto · 2026-11-17

[ADR 162](DECISIONS/162-en-que-fue-y-necesidad-o-deseo-en-cada-gasto.md) D1 a D4; cambia el ADR 147 D1, D4 y D5 y el ADR 142 D4 en el gasto. Pedido "Gastos día a día", punto 3, con las respuestas de Esteban en chat. Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v762.

- **El paso:** en el teléfono, tras la categoría va "¿En qué fue?" (Monto · Categoría · Detalle · Revisar) con sus opciones y "Otra cosa"; tocar una avanza. Si la opción depende del día (Taxi, Domicilio, Cine, Otros) se queda y pregunta "¿Fue una necesidad o un deseo?". La fila del recibo dice "Taxi · Deseo" y vuelve al paso. Sin desplazar a 390 x 844 y 375 x 667.
- **La regla:** la pregunta es obligatoria al registrar (escritorio y teléfono) y vale solo para ese gasto: Finko no aprende "Taxi es un deseo". "Repetir" no copia la respuesta. La pregunta de la lista y de Inicio escribe en los gastos sin respuesta de ese concepto; la ficha corrige solo ese gasto. Lo aprendido antes sigue valiendo para los gastos viejos.
- **El catálogo:** Transporte público, Taxi y App de transporte (nueva, `transp-app`); Almuerzo de trabajo y Restaurante. Ids sin cambio.
- **Las palabras:** "Necesidad" y "Deseo"; "gustos pequeños" pasa a "deseos pequeños" en Gastos, Análisis, Límites y logros. El dato sigue siendo `gusto`, sin migración.
- Pruebas: `gastos-telefono.test.js` (el paso, Taxi que pregunta y Transporte público que no, la obligatoria, Otros, "Repetir", la respuesta por gasto desde la lista y la ficha), `caracter-gasto.test.js`, `gastos-registro.test.js` (Entretenimiento > Cine > Deseo de principio a fin, sin desplazar). Unitarias 6014/6014, E2E 537/537.

### fix(gastos): GAS.5b, ningún gasto deja la cuenta bajo $0 · 2026-11-17

[ADR 161](DECISIONS/161-dia-a-dia-tino-anota-sin-flecha.md) D2; extiende el ADR 156 D6. Pedido "Gastos día a día", punto 4. Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v761.

- **Causa del -$80.000:** en escritorio, con una sola cuenta que no alcanzaba, el gasto pedía "¿Registrar de todas formas?" y descontaba igual. El teléfono ya no guardaba, pero solo al crear: la ficha dejaba editar hacia el negativo.
- **Ahora:** un solo chequeo antes de escribir nada (`_gastoSinSaldo`) en los dos anchos, al crear y al editar. Al editar cuenta como disponible lo que el gasto ya había descontado de la misma cuenta. Fuera: tarjeta de crédito, gastos importados y "Completa el pago" con varias cuentas (no confirma sin cubrir el total).
- Pruebas: `gastos-telefono.test.js` (`planSiNoAlcanza` con el gasto anterior; la ficha que no pasa a una cuenta sin saldo), `smoke.test.js` (escritorio: $80.000 desde $50.000 no se registra; $30.000 sí). Unitarias 6011/6011, E2E 537/537.

### feat(gastos): GAS.5a, Tino anota y el vacío deja la flecha · 2026-11-17

[ADR 161](DECISIONS/161-dia-a-dia-tino-anota-sin-flecha.md) D1; cambia el ADR 156 D2. Pedido "Gastos día a día", puntos 1 y 2. Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v760.

- **Tino anota:** pose nueva `anota` (`assets/tino/tino-anota.svg`): el dibujo base sin el grano de café, con libreta de espiral, la pata que la sostiene y la otra con un lápiz, en los colores y el trazo del original. Mismo lienzo que `tino.svg`.
- **Sin flecha:** el vacío del teléfono deja la flecha punteada; el halo que late en el botón central y la frase "Toca el botón +" bastan.
- Pruebas: `gastos.test.js` (la pose y que no haya flecha), `gastos-registro.test.js` (el halo centrado en el botón, sin desplazar), `nino-visual.test.js` (la pose nueva existe, su lienzo y que no trae texto ni scripts).

### revert(inicio): INI.5r, Inicio móvil vuelve a como estaba · 2026-11-17

[ADR 160](DECISIONS/160-inicio-mobile-una-portada-con-tino.md) pasa a Revertida. Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v759.

- Esteban no quedó conforme con el rediseño de INI.5 (hecho con Codex) y pidió volver al diseño anterior. `index.html`, `identidad.css`, `atencion-hoy.js`, `por-completar.js`, `compromisos/views/dashboard.js` y sus pruebas quedan idénticos al commit previo a INI.5 (INI.4).
- Tino vuelve a aparecer solo en el vacío de la hamaca ("Todo al día"); los títulos de los bloques van sin ícono y las tarjetas sin el relieve agregado.
- Nada fuera de Inicio cambia: GAS.C y lo anterior siguen igual.

### feat(inicio): INI.5, la referencia móvil con Tino y la identidad Finko · 2026-11-17

[ADR 160](DECISIONS/160-inicio-mobile-una-portada-con-tino.md). La sección Inicio adopta en teléfono la composición de la referencia: Tino acompaña el saldo, y Atención hoy, Esta semana, Por completar y Novedades ganan jerarquía, íconos y tarjetas con relieve. Conserva los datos y las acciones existentes; tablet y escritorio no cambian. SW v758.

- El hero comparte espacio con Tino; el monto largo también cabe desde 320 px. Si aparece la guía de primer uso, Tino no la tapa.
- Los títulos y filas de la agenda refuerzan su jerarquía visual con el bosque, el sol y las superficies de Finko.
- Los E2E de Inicio se actualizaron a la composición móvil. Pruebas unitarias 6009/6009, E2E 536/536 y ESLint sin errores.

### feat(gastos): GAS.C, el recibo del teléfono es un comprobante · 2026-11-17

[ADR 158](DECISIONS/158-el-recibo-de-gasto-es-un-comprobante.md) D1 a D5; cambia el ADR 156 D3 y conserva lo funcional de GAS.3. Pedido "Rediseño visual del registro de gastos: comprobante tipo factura", con la imagen de referencia "Registrar gasto en Finko" y la plantilla de Illustrator. Fichas: [`contexto/gastos.md`](contexto/gastos.md), README de [`assets/svg/`](../assets/svg/README.md) (sección 2.4). SW v756.

- **El comprobante:** papel blanco cálido con troquel (máscara CSS) y sombra, la pestaña verde con el carrito, "Comprobante de gasto" entre destellos, la ilustración de la categoría junto a "$ 48.500" con su trazo verde, la categoría en su pastilla, filas con el ícono de su campo y el valor en su columna, y un código de barras que solo adorna. Papel y tinta fijos en los dos temas; en claro, la hoja es crema.
- **La cabecera de "Revisar":** banda bosque con el isotipo, "Registrar gasto", hojas y una loma crema; sin las etapas con nombre. La ✕ se queda (salida de la ficha).
- **Cada dato una vez:** "Entidad bancaria" dice "Bancolombia" y debajo "Cuenta de ahorros" (`nombreCortoCuenta`, `tipoDeCuenta`), con el logo junto al valor; "¿En qué fue?" para la subcategoría; "Opcional" no se pinta en el papel.
- **Las piezas:** la plantilla (1920 x 1080, Image Trace) se partió fuera del repo en 20 SVG de `assets/svg/comprobante/` con 31 roles `--fk-cmp-*`; entran al sprite como `cmp-*` (`sync-sprite.py`, mismas reglas que `ilustraciones/`). `CATEGORIA_ILUSTRACION` asigna 10 ilustraciones a 12 categorías; las demás llevan su glifo. Comparación píxel a píxel con la plantilla: diferencia de 0,35 % como máximo.
- **Sin desplazar** (ADR 156 D12): 390 x 844, 375 x 667, 360 x 740 y 430 x 932; bajo 760 y 700 de alto el comprobante se compacta.
- Pruebas: `gastos-telefono.test.js` (las piezas del comprobante, el glifo de respaldo y que toda ilustración exista en el sprite, la cabecera, la cuenta con su tipo, la cifra larga), `sprite-sync.test.js` (la carpeta `comprobante/`). Unitarias 6009/6009, E2E 536/536.
- Falta el arte de GAS.C2: el logotipo "Finko" en letras y las ilustraciones de las categorías sin dibujo.

### feat(gastos): GAS.3, Registrar gasto del tablero integral y lo que lo hacía fallar · 2026-11-17

[ADR 156](DECISIONS/156-registrar-gasto-en-el-telefono-tablero-integral.md) D1 a D12; cambia el ADR 142 D3, D4 y D9 y el 132 D6. Pedido "GASTOS, mejoras funcionales y de comportamiento" y tablero "Gastos · Rediseño integral" (ocho páginas de la hoja y "Gastos · primera vez"); las cabeceras son de GAS.4 (ADR 157). Fichas: [`contexto/gastos.md`](contexto/gastos.md), [`contexto/captura.md`](contexto/captura.md). SW v755.

- **Calendario:** `reset.css` da `text-align: left` a todo botón y cada número quedaba pegado a la izquierda de su celda de 44 px, corrido de su letra. `.calf__dia` centra y es un círculo que no se deforma a 320. Vale para toda hoja con "Otra fecha".
- **Destello de la Nota:** `llevarCampoALaVista` tomaba el campo de la mini-hoja por tapado (la franja de 96 px es del pie de la hoja, no del de la mini-hoja) y desplazaba el área visible de iOS, que la hoja perseguía. Un campo de mini-hoja ya no se desplaza. Verificado con un `visualViewport` emulado; falta el iPhone real (REV.3b).
- **Saldo que no alcanza:** un mensaje bajo "Sale de" con lo que falta y "Guardar gasto" apagado; `_guardarGasto` lo vuelve a comprobar. Salen "Completar con", "Pagar todo con" y el reparto del recibo (`repartoDelRecibo`); `planSiNoAlcanza` queda en cuenta y falta. Escritorio no cambia.
- **"¿Con qué pagaste?"** usa `htmlOpcionCuenta`, la fila de la hoja del pago de Inicio, ahora compartida (entidad, tipo, saldo, logo, tarjetas aparte).
- **Recibo y pasos:** categoría y monto una vez (sin el monto en letras), filas de rótulo y valor, fecha en una línea (`fechaDelRecibo`), "¿Qué fue?" como lista con su categoría debajo del título, la nota dice dónde aparece. Un solo botón: salen "Guardar y registrar otro" y "Toca cualquier dato para cambiarlo.". Sin "Usar el teclado del teléfono" (`sistema: false`; las demás hojas lo conservan). Categorías en dos columnas, enteras: a 390 todas en una línea.
- **Vacío:** "Anota tu primera compra" con Tino, sin botón; una flecha punteada y un halo señalan el botón central. En el teléfono el banner de propósito de Gastos no se pinta; en escritorio calla el vacío.
- **Sin desplazar:** monto, categoría y recibo caben a 390 x 844, 375 x 667 y 360 x 740 (medido el cuerpo de la hoja).
- Pruebas: `gastos-telefono.test.js` (el recibo, el saldo que no alcanza sin guardar, otra cuenta que guarda entero, "Otra fecha", la nota, las semanas de cada mes, el bisiesto y el cambio de año), `gastos.test.js` (el vacío), `teclado.test.js` (la mini-hoja), `cuenta-helper.test.js` (la fila compartida); E2E nuevo `gastos-registro.test.js` (la flecha sobre el botón central y el recorrido entero con un solo registro) y `miles`, `movil-mv2`, `navegacion-render` y `smoke` al día.

## Meses anteriores

- [2026-11, del 3 al 16](changelog/2026-11.md) (rotación forzada el 2026-11-13, el 2026-11-15, el 2026-11-16 y el 2026-11-18: el mes pasó el techo de 60 KB)
- [2026-10](changelog/2026-10.md)
- [2026-08](changelog/2026-08.md)
- [2026-07](changelog/2026-07.md)
- [2026-06](changelog/2026-06.md)
- [2026-05](changelog/2026-05.md)

---

## Convención de entradas

Cada entrada agrupa por fase/release y dentro lista commits con:
- **tipo(área)** - `commit_hash` · `archivos tocados` - descripción de qué cambió.

Tipos: `feat` (nueva funcionalidad), `fix` (bug), `refactor` (sin cambio funcional), `test`, `docs`, `chore` (config/build), `style` (formato).
