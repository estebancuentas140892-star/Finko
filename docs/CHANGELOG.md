# Changelog - Finko Claude

> Revisado: 2026-11-27.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-11)

### feat(movimientos): MOV.5, Movimientos con la fila de Día a día · 2026-11-27

[ADR 204](DECISIONS/204-movimientos-con-la-fila-de-dia-a-dia.md); desarrolla el ADR 203 D10 y ajusta el ADR 200 D4 solo en el teléfono. Fichas: [`contexto/movimientos.md`](contexto/movimientos.md) y [`contexto/telefonos.md`](contexto/telefonos.md). SW v869.

- **La fila del historial en el teléfono** es la de Día a día: la cifra arriba a la derecha, el nombre a todo el ancho y, debajo, la cuenta con su logo y su tipo. Sale la columna de 128 px que partía un nombre largo en 4 renglones.
- **Qué es, en palabras y sin punto**: un gasto del día a día no lo dice (como en Día a día); lo demás sí, en su renglón ("Gasto fijo", "Ingreso", "Transferencia, 4x1000 $800"). La categoría va en la hoja.
- **El renglón de la cuenta** pasa a `infra/cuenta-helper.js` (`htmlRenglonCuenta`) y lo comparten Día a día y Movimientos. La hoja de la fila sigue leyendo el monto, qué es y la cuenta.
- Pruebas: `cada-dato.test.js` mide Movimientos en los cinco anchos por tres tamaños de letra y suma la fila, la hoja de un ingreso y escritorio sin cambios; unitarias de la fila del teléfono y de la hoja. Unitarias 6585/6585, E2E 667/667, 1 saltada por la fecha.

### feat(inicio): SIT.2c, lo esencial en Inicio y Tu plan (cierra SIT.2) · 2026-11-27

[ADR 203](DECISIONS/203-lo-esencial-en-la-fila-el-resto-en-la-factura.md) D8 y D9; ajusta el ADR 202 D7. Entrega de Claude Design en `Entrega Claude/`, piezas 5, 6, 7 y 12. Ficha: [`contexto/telefonos.md`](contexto/telefonos.md). SW v868.

- **Atención hoy**: "4 pagos más por $1.875.300" en un renglón, dos unidades, con la flecha de las demás filas; sale "Ver todos" escrito. El nombre accesible empieza por lo que se ve ("..., ver todo lo de hoy").
- **Esta semana**: la teja de 44 dice el día y el número, y "Mañana" en el color de acción; salen "en N días" y el tipo (los oye el lector). La fila pasa de 86 a 64 px. "Entra $X" y "Sale $Y" en un renglón.
- **Tu plan sin datos** (solo teléfono): con los tres grupos en 0 %, una fila "Se llena cuando registres gastos: estilo de vida, necesidades y ahorro." con "Ajustar"; de 215 a 104 px. Escritorio sigue con sus tres líneas.
- Pruebas: `cada-dato.test.js` suma Esta semana (filas de hasta 66 px, tejas de 44, totales en un renglón, "Mañana" entero al 100 y al 130 %), "N pagos más por $X" y Tu plan en una fila con escritorio sin cambios; unitarias de la teja, los totales, la fila "más" y el plan. Unitarias 6579/6579, E2E 664/664, 1 saltada por la fecha.

### feat(fijos): SIT.2b, lo esencial en Fijos, Deudas y la factura del fijo · 2026-11-27

[ADR 203](DECISIONS/203-lo-esencial-en-la-fila-el-resto-en-la-factura.md) D5 a D7; ajusta el ADR 202 D6. Ficha: [`contexto/telefonos.md`](contexto/telefonos.md). SW v867.

- **Fijos**: sale "N pagos de $X" de la fila (de 101 a 65 px con "Pagar"); "Pagar los 5 por $2.181.200" en un renglón.
- **Deudas**: la tarjeta sin la entidad (la dice el logo) y "Cuota de $X" sin el día (lo dice el estado); el total sin la barra vacía y, con pagos, "Pagaste $Y de $X en cuotas de noviembre".
- **La factura del fijo**: "Gasto fijo" solo bajo el título y la instrucción al pie; el nombre completo, sin puntos suspensivos, y "$286.400 cada mes" en su renglón; "Pendiente: 3 pagos de $92.000" cuando debe más de uno.
- Pruebas: `cada-dato.test.js` suma la fila de fijo hasta 66 px, el total sin barra vacía y la factura del fijo en cinco anchos sin puntos suspensivos; se reescribieron las de los textos viejos. Unitarias 6576/6576, E2E 659/659.

### feat(gastos): SIT.2a, lo esencial en la fila de Día a día y en su factura · 2026-11-27

[ADR 203](DECISIONS/203-lo-esencial-en-la-fila-el-resto-en-la-factura.md) D1 a D4; ajusta el ADR 202 D1 y D3. Entrega de Claude Design en `Entrega Claude/` (no llegó al lienzo). Ficha: [`contexto/telefonos.md`](contexto/telefonos.md). SW v866.

- **La fila del gasto** dice qué fue, cuánto y de qué cuenta salió: sale la clasificación (la categoría la dice la ilustración; la subcategoría, la factura y el nombre del botón). La cuenta es una unidad con sangría colgada tras el logo. De 87 a 64 px con datos cortos.
- **El día**: "Hoy, jueves 26" en un rótulo, como la referencia.
- **"Pagar" y el círculo** dibujan 30 px y no estiran el renglón del estado; se tocan en 44.
- **La factura del gasto**: sin la fecha bajo el título; "Bancolombia Ahorros" en un renglón y "Te queda $X" debajo; la subcategoría bajo la categoría y la fila Detalle solo para "¿Necesidad o deseo?".
- Pruebas: `cada-dato.test.js` suma el alto de la fila, la categoría que no se escribe y el botón de 30 px con toque de 44; unitarias de la fila y de la factura. Unitarias 6576/6576, E2E 653/653.

### feat(limites): SIT.1d, cada dato en su sitio en Límites, la ficha del gasto y los vacíos (cierra SIT.1) · 2026-11-26

[ADR 202](DECISIONS/202-cada-dato-en-su-sitio.md) D8 y D9; el lienzo "Finko móvil: cada dato en su sitio" queda aplicado. Ficha: [`contexto/telefonos.md`](contexto/telefonos.md). SW v865.

- **Límites**: el nombre solo y debajo "$96.000 de $60.000" y el veredicto como dos unidades; "Sin gastos este mes" con palabras; sin la columna de la derecha. "Usaste $X de $Y, faltan 4 días"; el conteo de "Tus límites" como insignia; "Sin límite" con la cifra y "este mes" como unidades.
- **La ficha del gasto**: solo la fecha larga bajo el título y "Toca un dato para cambiarlo." al pie; "Pagado con" dice la entidad, el tipo y "Te queda $X" en renglones; la nota larga ya no se corta.
- **Vacíos**: las tejas de Fijos en columnas de su palabra más larga ("Administración" entera); Atención hoy sin nada hoy deja "Nada pendiente hoy" y lo próximo; Esta semana sin pagos y con un pago hoy, "Nada más esta semana" y el próximo pago; Inicio sin cuentas con Tino y su saludo en una fila.
- Lo abierto para Esteban (los chips de categoría en dos renglones con "Más") no se aplicó.
- Pruebas: `cada-dato.test.js` suma Límites y los vacíos de Inicio; unitarias de la fila del límite, la ficha y los vacíos. Unitarias 6576/6576, E2E 651/651.

### feat(inicio): SIT.1c, cada dato en su sitio en Esta semana, Novedades y los bancos · 2026-11-26

[ADR 202](DECISIONS/202-cada-dato-en-su-sitio.md) D7. Ficha: [`contexto/telefonos.md`](contexto/telefonos.md). SW v864.

- **Esta semana**: la teja dice "Sáb 28 en 2 días"; debajo del nombre, solo el tipo ("Gasto fijo"); el monto arriba a la derecha. "Entra" y "Sale" como pares rótulo y cifra (antes "Entra $X · Salen $Y" en una frase que se salía a 320).
- **Novedades**: sin "Ver" escrito, la flecha sola; "Gastaste $96.000 de $60.000" como unidad; los límites dicen "va en el 80 % de su límite" y "Llevas $X de $Y". Ningún aviso de Inicio une datos con punto.
- **La lista de bancos**: el saldo arriba a la derecha y el tipo en su renglón; un nombre largo usa todo el ancho.
- Pruebas: `cada-dato.test.js` suma Inicio; unitarias de Esta semana y de los avisos con los textos nuevos. Unitarias 6576/6576, E2E 650/650.

### feat(fijos): SIT.1b, cada dato en su sitio en Fijos, Atención hoy y Deudas · 2026-11-26

[ADR 202](DECISIONS/202-cada-dato-en-su-sitio.md) D6; cambia el ADR 184 D2 y ajusta el ADR 199 D2. Ficha: [`contexto/telefonos.md`](contexto/telefonos.md). SW v863.

- **Fijos y Por pagar** con la fila de dato: la cifra arriba a la derecha, el estado con su ícono junto a "Pagar" o el círculo, y debajo "3 pagos de $92.000" (antes "· 3 pagos" pegado al estado) y el tipo. Todas las filas tienen la misma forma: sale la regla que bajaba el monto solo en algunas. "Vence hoy", "Vence mañana", "Sábado 28"; "Pagar los 5" con la cifra debajo; "Pagaste $0 de $980.000" y "0 de 2 pagos" como dos unidades.
- **Atención hoy**: el valor sube junto al nombre con la flecha (como en Fijos) y el estado queda en su renglón; la fila mide lo que trae (66 con un nombre corto, antes 84). El lector oye el valor después del nombre y el estado. "7 pagos por $3.461.200" y "4 pagos más" con su cifra debajo.
- **Deudas**: el saldo con "te falta" debajo, la entidad sola y "Cuota de $1.180.000 el día 3"; sin atraso, "Próxima cuota el sábado 28". El aviso de Tino pasa a rótulo, titular ("Dos deudas crecen cada mes"), los nombres en lista y "Mira cómo frenarlas" (el motor devuelve los nombres). El conteo de Entidades y personas, como insignia. "Debes en total" sin punto y "Cuotas de noviembre: $X, pagaste $Y".
- Pruebas: `cada-dato.test.js` suma Fijos y Deudas (y cuenta renglones, no rectángulos: una negrita adentro da dos en el mismo renglón); unitarias de la fila, la tarjeta, el aviso y el resumen; se reescribieron las E2E de los textos viejos y la de la letra al 200 % (el monto ya no baja). Unitarias 6576/6576, E2E 650/650.

### feat(gastos): SIT.1a, cada dato en su sitio en Día a día · 2026-11-26

[ADR 202](DECISIONS/202-cada-dato-en-su-sitio.md) D1 a D5; cambia el ADR 184 D2 y ajusta el ADR 199 D2 (en las rebanadas que siguen). Pedido de Esteban con el lienzo "Finko móvil: cada dato en su sitio". Ficha: [`contexto/telefonos.md`](contexto/telefonos.md). SW v862.

- **La fila de dato** (D1): la cifra flota arriba a la derecha antes del título en el DOM y solo ocupa el primer renglón; desde el segundo el título usa todo el ancho (a 360, de 159 a 248 px). Debajo, un dato por renglón: la clasificación (lo más específico que el título no dice) y la cuenta con su logo de 16, su nombre corto y el tipo atenuado. La nota ya no va en la fila. Escritorio sigue con su subtítulo.
- **Unidades y palabras** (D2): `.fk-unidad` y `.fk-balance` en `utils.css`, solo en el teléfono; Día a día queda sin " · " ("8 gastos, sin contar fijos ni deudas", "Restaurantes en nov").
- **El día** (D3): "Hoy jueves 26" sin punto; los demás días sin "· nov". **La tarjeta del mes** (D4): "$710.500 más que a esta altura de octubre" con `balance`; el mes sin gastos dice "Aún no anotas gastos este mes." y sale la tarjeta de Tino que lo repetía.
- **Sin guiones automáticos** (D5) en las tejas del registro y las pestañas de Gastos.
- Lo que el lienzo deja abierto (los chips en dos renglones con "Más") no se aplicó. A 320 con la letra al 130 % el título empieza bajo la cifra si su primera palabra no cabe al lado.
- Pruebas: E2E nueva `cada-dato.test.js` (cinco anchos por tres tamaños de letra: unidades enteras, sin " · ", título en 2 renglones desde 360 y 3 a 320, cifra en el primer renglón, sin puntos suspensivos ni guiones); unitarias de `textosFilaGasto` y de la fila del teléfono. Unitarias 6575/6575, E2E 650/650.

### fix(inicio): INI.8, el desplegable de bancos no corre la banda · 2026-11-26

[ADR 201](DECISIONS/201-inicio-el-desplegable-de-bancos-no-corre-la-banda.md) D1 y D2; extiende el ADR 199 D2 a las cuentas abiertas. Pedido de Esteban con una captura del Redmi. Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v861.

- **Por qué se corría:** la banda es una celda del grid del bento (`1fr`, que no baja del mínimo de su contenido) y las filas del desplegable no bajaban de línea (`nowrap`): "Nequi / Depósito de bajo monto / $188.000" pedía 398 px con la letra al 130 % y la columna crecía con ella. `main` recorta lo que sobra, así que no salía barra: todo se corría a la derecha.
- **Las filas bajan de línea** (D1): nombre y tipo sin puntos, la columna de textos no baja de su palabra más larga y el saldo baja a su renglón, a la derecha, si no cabe. **La banda no ensancha su columna** (D2, `min-width: 0`).
- La prueba "sobra 0" de INI.2a mide el documento, que `main` recorta; la nueva mide la banda antes y después de abrir.
- Pruebas: E2E nueva en `telefonos.test.js` (393 al 115 y al 130 %, 360 al 115 %, 320 al 130 %: la banda mide lo mismo, las filas quedan dentro de la caja y ninguna palabra se parte); sin el arreglo fallan las cuatro. Unitarias 6573/6573, E2E 634/634.

### feat(movimientos): MOV.4, buscar y filtrar sin perder la lista · 2026-11-25

[ADR 200](DECISIONS/200-movimientos-buscar-y-filtrar.md) D1 a D11. Lienzo "Rediseño de Movimientos: Finko móvil". Ficha: [`contexto/movimientos.md`](contexto/movimientos.md). SW v860.

- **Un buscador que entiende criterios** (D1, `busqueda.js`): al enfocarlo se oculta el encabezado y aparece ←; vacío, "Buscaste antes" y "Puedes buscar por"; desde 2 letras sugiere tipo, categoría, subcategoría, cuenta, empresa, persona, mes y monto con su conteo, y al final "Buscar el texto". Elegir crea el chip y deja el foco para encadenar.
- **Un solo botón Filtros** con insignia y **la hoja de ocho criterios** en cuatro grupos (D2, `hoja.js`): aplica en vivo, cada opción con su conteo, "Ver N movimientos" en el pie; seis atajos de periodo, categoría entera o a medias, cuenta con "Salió de" y "Llegó a", empresa, persona, valor y estado.
- **Tipo en ocho grupos, varios a la vez** (D3). **Estado** a tiempo, con atraso o abono parcial, derivado de "cada pago salda el vencimiento más viejo" (D6, `vencimientoDeCadaPago`).
- **La fila v2** (D4): "Tipo · Categoría" en la segunda línea, la cuenta bajo el monto, el pago de un fijo con su nombre y el color de Por pagar.
- **Lo puesto en una línea** (D7): chips que caben enteros, "+N" que abre la hoja en el oculto, "Limpiar" y la × con Deshacer; el resumen "5 movimientos · salieron $187.600". Las llegadas de otras secciones son chips comunes (D8).
- **Pegado al bajar** (D9, segunda excepción a R31); en escritorio la misma barra sobre el ledger y sin la columna de filtros. **Sin resultados** con "Prueba quitando uno" y **sin datos** con "Registrar un movimiento" (D10).
- Lo que el lienzo dibuja distinto quedó en "Ajustes al aplicar": sin puntos (ADR 199 D2), letra en rem, valor sin el teclado de Finko, la lista se filtra al confirmar el texto.
- Pruebas: unitarias `movimientos-filtros` (preparar, aplicar, conteos, chips, sugerencias, estado); E2E `movimientos-filtros` (los recorridos del lienzo, axe y zonas de 44 en los dos temas); se reescribieron las de la barra vieja (ADR 105, pastillas, rango plegado). Unitarias 6573/6573, E2E 630/630.

### fix(a11y): TEL.1c, hojas, toques con frenos y nombres · 2026-11-25

[ADR 199](DECISIONS/199-inicio-gastos-y-movimientos-en-todos-los-telefonos.md) D11 a D19; cierra TEL.1 y el lienzo "en todos los teléfonos". Ficha: [`contexto/telefonos.md`](contexto/telefonos.md). SW v859.

- **Hojas fuera de la isla** (D11): arriba, max(40, zona superior + 8) y bajo 700 de alto max(16, ...); antes el 94 % menos la zona. En horizontal, nada queda bajo la muesca.
- **Teclas** (D12): "Nuevo límite" pasa a 56 desde 844 de alto; las de Nuevo gasto ya eran más grandes (60). Separación de 8 siempre.
- **Ficha del gasto** (D14): 8 px entre la papelera y la ✕ (antes 0); título y subtítulo bajan de línea.
- **Avanzar al tocar, con frenos** (D15, `ui/toque.js`): con el dedo, un toque no cuenta en los primeros 350 ms de una pantalla nueva, si el dedo viajó más de 10 px o si empezó en otra opción. El segundo toque de un temblor ya no elige en la pantalla siguiente. "Guardar" dos veces mientras la hoja se cierra anota una sola vez.
- **El aviso con "Deshacer" espera** (D16): se pausa con el dedo o el foco encima; su ✕ se toca en 44.
- **Búsqueda de Movimientos** (D17, `ui/placeholder.js`): "Nombre, nota, categoría" cuando la larga no cabe.
- **Nombres** (D18): las filas de "Atención hoy", los pasos hechos y los chips de filtro empiezan por lo que se ve.
- **Tinta sobre el rojo** (D19): #1b0508 en oscuro (5,87:1) en insignias y botones rojos; blanca en claro.
- Pruebas: E2E `telefonos` suma hojas con la isla simulada, teclas, ficha, búsqueda, tinta y un temblor con toques de dedo; unitarias de los frenos, "Guardar dos veces" y el aviso. Unitarias 6575/6575, E2E 616/616.

### fix(movil): TEL.1b, pestañas, tejas, días y cifras que caben · 2026-11-25

[ADR 199](DECISIONS/199-inicio-gastos-y-movimientos-en-todos-los-telefonos.md) D1 y D5 a D10. Ficha: [`contexto/telefonos.md`](contexto/telefonos.md). SW v858.

- **La letra del sistema llega a 1 rem** (D1): `<meta name="text-scale" content="scale">`; Chrome en Android deja de inflar las letras por su cuenta. Falta confirmarlo en el Redmi al 115 %.
- **Pestañas en dos pares** (D5): una fila mientras quepan con su insignia; si no, 2 x 2 en el mismo orden de lectura. La letra ya no baja a 12 px en los angostos.
- **Empresas y entidades** (D6, `ui/tejas.js`): la columna no baja de la palabra más larga de la lista más 3 px ("Bancolombia" ya no se sale); 3 columnas a 360.
- **Atajos de la primera vez** (D7): 2 x 2 hasta 375, una fila desde 393.
- **Días del mes de 44** (D8): la rejilla mira su propio ancho: 7, 6 o 5 columnas (5 en la hoja de 320, que deja 270 px).
- **Las cifras caben con su ojo** (D9, `infra/cifra-que-cabe.js`): la letra de 22 px o más crece como mucho 15 %; si la cifra no cabe, se achica (mínimo 28 en la tarjeta, 34 en el saldo y el monto). Se mide con el valor final, no con el del conteo, y contra lo que se ve de la caja. En Fijos el ojo ya no baja de línea.
- **La hamaca** (D10) ya medía su mensaje (INI.6b). A 320 x 568 la cifra del saldo queda en 51 (antes 46) y la hamaca llega a su mínimo: la página desplaza unos px, como acepta el lienzo; cambia esa prueba de INI.6b.
- Pruebas: E2E `telefonos` suma `text-scale`, pestañas a 320 al 130 % y a 430, cifras a 320 al 130 %, entidades y días a 320 y 360. Unitarias 6565/6565, E2E 610/610.

### fix(movil): TEL.1a, nada se corta en ningún teléfono · 2026-11-25

[ADR 199](DECISIONS/199-inicio-gastos-y-movimientos-en-todos-los-telefonos.md) D2 a D4. Pedido: aplicar el lienzo "Finko · Inicio, Gastos y Movimientos en todos los teléfonos" (7 páginas, 21 cambios): nace TEL.1 con TEL.1b y 1c. Ficha nueva: [`contexto/telefonos.md`](contexto/telefonos.md). SW v857.

- **Filas sin puntos ni palabras partidas** (D2): Día a día, Movimientos, Fijos, Deudas, "Esta semana" y "Atención hoy" bajan de línea; el monto baja a su renglón, a la derecha, solo si no cabe junto a la palabra más larga del título. En Fijos el monto y "Pagar" van juntos (antes el monto se montaba sobre el botón a 320 al 115 %). A 320, "Esta semana" ensanchaba la portada a 329 px y sus montos quedaban fuera de la pantalla: era el nombre de una fila de "Atención hoy" en una sola línea.
- **El saludo y el nombre de Inicio** bajan de línea en vez de cortarse (supera el ADR 126 D1); los chips de Día a día bajan de línea en vez de deslizarse.
- **La leyenda de la tarjeta** se envuelve y "Resumen ›" baja a su renglón (D3).
- **La barra de abajo** (D4): "Registrar" en una columna del ancho de su texto; ninguna etiqueta se corta a 320 al 130 %. Las listas terminan sobre "Registrar" (`--fk-fin-de-lista`), no debajo.
- La prueba de escritorio "Calendario conserva la celda pintada" fallaba en `main` según la fecha (una semana con un solo pago mide 70 y pedía 80): ahora vigila que la celda no se compacte a los 44 del teléfono.
- Prueba nueva: E2E `telefonos` (seis pantallas en cinco combinaciones de tamaño y letra, Range por palabra; la barra y el fin de la lista). Unitarias 6565/6565, E2E 605/605.

### fix(a11y): GAS.17, Gastos accesible · 2026-11-22

[ADR 198](DECISIONS/198-gastos-accesibles.md) D1 a D4. Pedido: aplicar lo que falta del lienzo "Gastos · Rediseño integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v856.

- **Gastos accesible: WCAG 2.2 AA y zonas de 44 px en las hojas** ([ADR 198](DECISIONS/198-gastos-accesibles.md)):
  - *Toque (temblor, Parkinson):* la barra de pasos tenía botones de 82 x 18 px; ahora cada paso cubre su celda y 8 px arriba y abajo. "Cada cuánto", "Otra", el nombre sin empresa, el riel, las partes y los montos de "Nuevo límite" y la papelera de la ficha del fijo llegan a 44 px sin cambiar cómo se ven. La papelera va junto a la ✕.
  - *Contraste:* las iniciales de YouTube Music, ViX, Triple A, Gases de Occidente y Surtigas llegan a 4,5:1 (tono 5 a 8 % más oscuro o texto oscuro); también las iniciales de una persona en "Nueva deuda", las del nombre escrito sobre la factura y el monto de la parte elegida.
  - *Lector de pantalla y voz:* la tecla "000" se llama "000, tres ceros"; la cifra de la factura y el monto del recibo dicen primero lo que se ve.
- Pruebas nuevas: E2E `a11y-gastos` (axe WCAG 2.2 A/AA y zonas de 44 px medidas tocando, en oscuro y en claro, del gasto fijo, el gasto, "Nuevo límite", las pestañas, la ficha del fijo y "Nueva deuda") y `marcas.test.js` (contraste de las iniciales). Unitarias 6565/6565, E2E 599/599.
- Pendiente en el teléfono: un recorrido con TalkBack y Voice Access.

### fix(gastos): GAS.16, las opciones en una línea · 2026-11-22

[ADR 197](DECISIONS/197-las-opciones-en-una-linea.md) D1 a D3. Pedido: aplicar lo que falta del lienzo "Gastos · Rediseño integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v855.

- **Cada opción en una línea, en cualquier teléfono** ([ADR 197](DECISIONS/197-las-opciones-en-una-linea.md)):
  - *El problema:* en el Redmi Note 11, con la letra del sistema algo más grande, "Administración", "Suscripciones" y "Crear categoría" se salían de su teja en "¿Qué es?" del gasto fijo; en el gasto y en "Nuevo límite" "Entretenimiento" se partía.
  - *Ahora:* en "¿Qué es?", en la categoría del gasto y en la de "Nuevo límite" cada nombre va en una línea; dos opciones comparten fila cuando caben y la que no cabe en media fila toma la fila entera. "Cada cuánto", "Primer pago", la cabecera de la factura del fijo, "Opcional" y "Toda la categoría / Solo una parte" bajan de línea en lugar de montarse o partirse. Las empresas van en columnas de al menos 4,5 rem.
- Auditado en 320, 360, 393 y 412 px con la letra al 100, 115 y 130 %. Sin cambios de datos.
- Pruebas: E2E nueva `opciones-una-linea` (360 y 393 px, letra al 115 %). Unitarias 6564/6564, E2E 593/593.

### feat(limites): GAS.15k, el nuevo límite del lienzo · 2026-11-22

[ADR 196](DECISIONS/196-los-limites-del-lienzo.md) D3 y D4. Pedido: aplicar lo que falta del lienzo "Gastos · Rediseño integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v854.

- **"Nuevo límite", como la página 9 del lienzo (segunda parte)** ([ADR 196](DECISIONS/196-los-limites-del-lienzo.md) D3 y D4):
  - *La categoría:* la barra "Categoría · Monto" en ámbar; las categorías por área en tejas de dos por fila con "Llevas $10.500" o "Sin gastos"; las que ya tienen límite, apagadas. Tocar una lleva al monto; "Poner límite" abre la hoja ya en él.
  - *El monto:* "Toda la categoría" o "Solo una parte" (una pastilla por parte con lo que lleva), "Máximo al mes para Café" con la cifra grande, "Llevas $10.500 en noviembre · $18.000 en octubre", tres montos sugeridos y el teclado de Finko; la flecha de la cabecera vuelve a la categoría.
- Editar un límite no cambia. Sin cambios de datos.
- Pruebas: `limites-subcategoria.test.js` (las dos pantallas, `montosSugeridosLimite`), E2E `gastos-pestanas` ("La que más usas" abre el monto). Unitarias 6564/6564, E2E 589/589.

### feat(limites): GAS.15j, los límites del lienzo · 2026-11-22

[ADR 196](DECISIONS/196-los-limites-del-lienzo.md) D1 y D2. Pedido: aplicar lo que falta del lienzo "Gastos · Rediseño integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v853.

- **Límites, como la página 9 del lienzo (primera parte)** ([ADR 196](DECISIONS/196-los-limites-del-lienzo.md) D1 y D2):
  - *La tarjeta:* "Usaste **$563.400** de $1.160.000 · faltan 9 días" y la barra; sale el pie con el porcentaje.
  - *La lista:* "Tus límites · 4" y "+ Nuevo" en verde; cada fila dice "$108.000 de $100.000" y "Te pasaste $8.000" o "Quedan $368.600", con la barra alineada y sin pastilla; "Sin límite" con "$X este mes". En el teléfono sale "Tus límites suman".
  - *La primera vez:* Tino con su paraguas de hoja, "Ponle un tope a lo que más gastas", "La que más usas" con "Poner límite" y las otras en chips.
- La alerta del límite más cerca y la sugerencia siguen. Sin cambios de datos.
- Pruebas: `presupuesto.test.js`, E2E `gastos-pestanas` y `movil-mv2`. Unitarias 6563/6563, E2E 588/588.

### feat(fijos): GAS.15i, el cuándo y la factura del fijo del lienzo · 2026-11-22

[ADR 195](DECISIONS/195-los-fijos-del-lienzo.md) D5 y D6. Pedido: aplicar lo que falta del lienzo "Gastos · Rediseño integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v852.

- **Fijos, como la página 4 del lienzo (segunda parte)** ([ADR 195](DECISIONS/195-los-fijos-del-lienzo.md) D5 y D6):
  - *"¿Cuándo lo pagas?":* "Cada cuánto" en un riel índigo; "Otra" con seis (suma "Todos los días" y "Una sola vez"); "Cada semana" pide el día de la semana (L a D) y deja el primer pago en el próximo; la fila "Primer pago" dice la fecha o el próximo pago ("Mar 24 nov"). Tocar el día ya no sigue: la pantalla pide "Continuar".
  - *La factura:* "Nuevo gasto fijo" con la barra de pasos y sin la banda bosque; la teja, el nombre y la categoría arriba con la cifra y "cada mes"; una fila "Se paga" ("El 24 de cada mes · próximo 24 nov"); lo opcional en dos líneas con "Opcional"; el código de barras.
- Sin cambios de datos: el semanal guarda `fechaInicio` y `diaPago` como siempre; "Todos los días" y "Una sola vez" son `Diario` y `Única vez`.
- Pruebas: `compromisos.test.js` (`textoSePagaFijo`, `htmlFacturaQuienFijo`), `captura-telefono.test.js` (`fechaCorta`), E2E `movil-mv2` y `gastos-pestanas`. Unitarias 6562/6562, E2E 588/588.

### feat(fijos): GAS.15h, los fijos del lienzo · 2026-11-22

[ADR 195](DECISIONS/195-los-fijos-del-lienzo.md) D1 a D4. Pedido: aplicar lo que falta del lienzo "Gastos · Rediseño integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v851.

- **Fijos, como la página 4 del lienzo (primera parte)** ([ADR 195](DECISIONS/195-los-fijos-del-lienzo.md)):
  - *La pestaña:* la suma de lo vencido en gris y "Pagaste **$1.200.000** de ..." con lo pagado en negrita.
  - *La primera vez:* Tino y la frase en una tarjeta; "¿Cuál pagas? Empieza con uno" en tejas de cuatro por fila, en el tono de su familia.
  - *Los pasos:* la hoja en el índigo de Fijos; la barra dice lo elegido ("$62.000", "Servicios públicos", "EPM"), también en el paso en curso, y la cifra deja de ir bajo el título.
  - *La empresa:* "No está aquí" es una teja más; abre en la misma pantalla "Nombre de la empresa o del servicio", con las iniciales en el tono de la categoría ("AC"), y pide "Continuar". Sale la pantalla "Nombre del servicio".
- Sin cambios de datos: el nombre escrito y `marcaId: null` se guardan igual.
- Pruebas: `compromisos.test.js`, `preguntas.test.js` (el paso en curso con lo elegido), E2E `movil-mv2` y `gastos-pestanas`. Unitarias 6559/6559, E2E 588/588.

### feat(fijos): GAS.15g, la ficha del fijo del lienzo · 2026-11-22

[ADR 194](DECISIONS/194-el-historial-del-lienzo.md) D3. Pedido: aplicar lo que falta del lienzo "Gastos · Rediseño integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v850.

- **La ficha de un gasto fijo, como la página 5 del lienzo** ([ADR 194](DECISIONS/194-el-historial-del-lienzo.md) D3):
  - *Arriba:* el nombre y "Gasto fijo · toca un dato para cambiarlo", con la papelera junto a la ✕.
  - *El papel "Gasto fijo":* la teja, el nombre, la categoría y "$185.000 cada mes"; filas que se tocan: "Se paga", "Débito automático" con su cuenta, el dato para pagar ("Número de contrato", con su Copiar) y la nota. Tocar una abre "Editar gasto fijo" en esa pregunta, que vuelve a su factura al seguir.
  - *Debajo:* los dos últimos pagos ("Octubre · Pagado el 23 oct · Bancolombia"), "Registrar el pago de noviembre" si falta y "Ver todos los pagos en Movimientos". "Ya lo había pagado" sigue con meses vencidos.
- La ficha de una deuda no cambia. Sin cambios de datos.
- Pruebas: `compromisos.test.js` (la ficha del fijo, sus pagos, sus datos para pagar), E2E `para-pagar`. Unitarias 6558/6558, E2E 588/588.

### feat(gastos): GAS.15f, la ficha del gasto del lienzo · 2026-11-22

[ADR 194](DECISIONS/194-el-historial-del-lienzo.md) D1 y D2. Pedido: aplicar lo que falta del lienzo "Gastos · Rediseño integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v849.

- **La ficha de un gasto, como la página 5 del lienzo** ([ADR 194](DECISIONS/194-el-historial-del-lienzo.md) D1): la cabecera dice el nombre ("Tinto") y "Sáb 21 nov · toca un dato para cambiarlo", con la papelera junto a la ✕, sin la banda bosque. El papel dice "Gasto registrado" y, si es hormiga, "Finko lo cuenta como gasto hormiga: 4.º tinto en 30 días". Debajo, "Repetir este gasto" a todo el ancho y "Ver los 2 gastos de Café en Movimientos".
- **"¿Eliminar este gasto?"** (D2): la papelera en su círculo rojo, la tarjeta del gasto ("Tinto · Sáb 21 nov · Efectivo · $4.500"), "Se borra de Gastos y de Movimientos. Úsalo si lo anotaste por error.", "Eliminar gasto" a todo el ancho y "Cancelar" debajo. Si borrar hace más (otras partes, una deuda), lo agrega. `confirmar()` gana `icono`, `tarjeta` y `apilado`.
- Sin cambios de datos.
- Pruebas: `gastos-telefono.test.js` (la cabecera de la ficha, la salida, la hoja de eliminar), `pago-vinculado.test.js` y E2E `movil-mv2`, `movimientos-deshacer`. Unitarias 6558/6558, E2E 588/588.

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
