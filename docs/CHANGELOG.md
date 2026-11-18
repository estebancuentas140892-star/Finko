# Changelog - Finko Claude

> Revisado: 2026-11-17.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-11)

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

### feat(gastos): GAS.4b, el total y las categorías de Día a día · 2026-11-16

[ADR 157](DECISIONS/157-gastos-encabezados-sin-registro-y-lista-del-mes.md) D4 a D6; cambia el ADR 069 D8 (G1), el 098 D6, el 132 D2 y el 039 D2 en el teléfono, y suma una excepción a R9. Tablero "Gastos · Rediseño integral", página "Gastos · con movimientos". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v754.

- **Total:** 42 px a 390 con el "$" a la mitad y arriba (`_conSigno`); el comparativo es una pastilla blanca translúcida, baje o suba. Sale "+ $X en fijos y deudas" (`_renderAlcanceInternas`); el total sigue sin internas.
- **Categorías:** todas en una fila que se desliza, de más a menos gasto (`categoriasTopGastos` con todas), con fundido a la derecha y a sangre. Salen "+N categorías", `alternarFiltrosGastos` y la acción `gastos-filtros-alternar`. Escritorio conserva la barra que envuelve, en orden alfabético.
- **Filas del día:** 62 px, título de 15 y subtítulo de 13 en el secundario; el encabezado del día en la display.
- Pruebas: `gastos.test.js` (el riel en teléfono y escritorio reemplaza a las 4 de la barra plegada), `movil-mv2.test.js` (una fila que desborda, de más a menos, sin ensanchar la página).

### feat(nav): GAS.4a, encabezados sin botón de registro · 2026-11-16

[ADR 157](DECISIONS/157-gastos-encabezados-sin-registro-y-lista-del-mes.md) D1 a D3; cambia el ADR 098 D5, el 106 D1, D2 y D4, el 132 D1 y el 133 D1 (bajo 1024 px). Tablero "Gastos · Rediseño integral", página "Encabezados sin botón de registro"; la hoja "Nuevo gasto" la aplica otra sesión (GAS.3, ADR 156). Fichas: [`contexto/sistema-visual.md`](contexto/sistema-visual.md), [`contexto/gastos.md`](contexto/gastos.md). SW v753.

- **Bloque Gastos:** una fila con "Gastos", la pastilla del mes, la lupa y el ojo. Salen la frase y el espejo (`bloque-primario`, `_sincronizarPrimarios` y su `MutationObserver`). La pastilla calla el año corriente (`etiquetaCortaMesBloque`, "Nov 2025" en otro año); el grupo le dice al lector el mes completo. Bajo 360 px el mes baja a su fila. La lupa y el ojo quedan en 44 px (R4), no en los 40 del tablero, y la zona de 44 de cada flecha cabe dentro de la pastilla (`zonas-tactiles` la marcaba como barra desbordada).
- **Las demás secciones:** teja de 36, nombre de 24 y ojo. El primario del encabezado y la frase dejan de verse en el teléfono, pero el primario sigue en el DOM: es la fuente del botón central (ADR 148) y de la barra de escritorio. Salen las reglas que lo ocultaban cuando el vacío traía su botón (R51, Reservas, Me deben) y la receta tonal de 44 px, que queda solo para "+ Fuente fija".
- Pruebas: `bloque-gastos.test.js` (2 nuevas: la fila sin espejo y la pastilla; 1 de la etiqueta corta; salen las 3 del espejo), `movil-mv2.test.js` (la fila del título se mide sin crear ni frase; los recorridos que tocaban el "+" de arriba tocan el botón central; la barra de lentes arranca más arriba), `contraste.test.js` (abre la meta desde el botón central).

### feat(inicio): INI.4, Tino descansa en su hamaca · 2026-11-16

[ADR 155](DECISIONS/155-inicio-tino-descansa-en-la-hamaca.md); cambia el ADR 152 D8 y la forma del 153 D7. Tablero "Finko · Inicio Tino descansa", opción A (la B, "Bosque y sol", no se aplicó); su HTML se mandó a la Papelera. Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v752.

- **"Todo al día"** pasa del sol de CSS con la pose `tranquilo` a `assets/tino/tino-hamaca.svg` (el original de Esteban sin metadatos, 81 KB, precacheado), colgada 11 px sobre el borde del saldo y pintada encima. El disco crema viene en el dibujo: `.todo-al-dia__sol` sale.
- **Tamaño:** 82 % del ancho (320 a 390), hasta 360, y más chica si el alto no alcanza para que el texto quepa sobre la barra (225 a 375 x 667). Las medidas van en fracciones de `--hamaca` (`identidad.css`, sección 12).
- **Dos anillos** detrás (un `::before` a lo ancho de la pantalla que empieza en el borde del saldo) y **el texto a la vista**, "¡Fuera preocupaciones!" y "No tienes pagos pendientes hoy ni esta semana.", en lugar del `role="img"` con nombre.
- **Vaivén** (`todo-al-dia-mece`, `skewX` de 1,3 grados en 5,6 s) solo sin "reducir movimiento". La hamaca no recibe toques.
- **Debajo de "Atención hoy"** (sin pagos, ADR 153 D7): la misma escena a 200, centrada. Defecto de INI.3: la celda es flex en columna y la regla centraba en el otro eje, así que Tino quedaba a la izquierda; su `padding-top` tampoco aplicaba (lo pisa `.bento__cell--flat` en la capa `utils`) y salió.
- Pruebas: `nino-visual.test.js` (3 nuevas: el dibujo sin metadatos, su lienzo en `index.html`, el precache), `inicio-rediseno.test.js` (la hamaca medida contra el tablero y 1 nueva: el vaivén y "reducir movimiento"), `inicio-control-pago.test.js` (el segundo caso, centrado). Unitarias 5994/5994, E2E 534/534.

### refactor(movimientos): MOV.3b, un solo deshacer en toda la app · 2026-11-16

[ADR 154](DECISIONS/154-deshacer-un-movimiento.md) D6 (Esteban: "Sí, unificar"). Fichas: [`contexto/movimientos.md`](contexto/movimientos.md). SW v751.

- **`ui/deshacer-movimiento.js`** (`deshacerConConfirmacion`): el recorrido de MOV.3 sale de Movimientos y lo usan también el "Eliminar" de Gastos (fila, hoja y ficha del teléfono), el de un ingreso puntual en Mis cuentas y el deshacer de una transferencia, cada uno con sus palabras ("Eliminar gasto", "Eliminar ingreso").
- **El "Deshacer" del aviso al guardar un gasto** usa el mismo motor, sin preguntar.
- **Lo que cambia en Gastos:** borrar una parte de un gasto repartido se lleva las otras; el gasto de "Ya lo usé" y la compra con tarjeta ya pagada no se borran y lo dice (antes quedaban la reserva o la tarjeta sin cuadrar). La hoja del gasto avisa que dirá qué vuelve a cada cuenta cuando es repartido.
- Salen `_efectosDeBorrar` (Gastos) y el `_ajustarSaldoCuenta` de transferencias, sin uso. El SW precarga `ui/deshacer-movimiento.js`.
- Pruebas: `pago-vinculado.test.js` (el mensaje nuevo; 2 nuevas: las dos partes y el bloqueo), `movimientos-deshacer.test.js` (2 E2E nuevos: desde Gastos y desde Mis cuentas). Unitarias 5991/5991, E2E 533/533.

### feat(movimientos): MOV.3, deshacer un movimiento como si nunca se hubiera registrado · 2026-11-16

[ADR 154](DECISIONS/154-deshacer-un-movimiento.md). Ficha: [`contexto/movimientos.md`](contexto/movimientos.md). SW v750.

- **"Deshacer movimiento"** en la fila de un gasto, un ingreso o una transferencia de Movimientos (en el teléfono, en su hoja; un gasto abre su hoja con el botón en vez del formulario). Quita los registros y devuelve los efectos (saldo de cada cuenta, saldo y cuota de la deuda o tarjeta) con los deltas de siempre: nada de reversas ni compensaciones, y lo de después en esas cuentas se respeta.
- **La operación entera:** las partes de un registro repartido entre cuentas comparten `operacionId` (gasto, pago y abono, desde ahora); lo anterior se reconoce por su nota "… repartido entre varias cuentas", su fecha y el momento en que se guardó. En el lote, cada obligación es su propia operación.
- **No se deshace** (aviso de un solo botón, `confirmar` con `soloAceptar`, sin tocar nada): un ingreso ya repartido con "Distribuir", una compra con tarjeta ya pagada, un abono a una deuda archivada y el gasto de "Ya lo usé" de una reserva.
- **Todo o nada:** `planDeshacer` decide antes de preguntar; al confirmar se recalcula y, si la huella cambió, no se aplica; `aplicarDeshacer` no toca nada con un plan viejo (deshacer dos veces) y devuelve lo tocado si algo falla a mitad. El SW precarga `infra/deshacer.js`.
- Gastos, Mis cuentas y Ahorro conservan su "Eliminar".
- Pruebas: `deshacer.test.js` (nuevo, 19: los ocho casos del pedido, todo o nada, huella y mensaje, registrando con las funciones reales y comparando con el estado previo), `movimientos.test.js`, `detalle-fila.test.js` y `gastos-detalle.test.js` (la acción y la hoja), `movimientos-deshacer.test.js` (nuevo, 5 E2E) y `smoke.test.js` (los 4 de MOV.1 pasan de eliminar a deshacer). Unitarias 5989/5989, E2E 531/531.

### feat(inicio): INI.3, el desplegable se cierra solo y el pago queda en manos del usuario · 2026-11-16

[ADR 153](DECISIONS/153-inicio-control-del-pago-y-desplegable-de-cuentas.md); cambia el ADR 152 D6 a D8. El pedido llegó escrito sobre la versión anterior a INI.2: "Desmarca…", "No alcanza sola" y "Repartimos… desde la de mayor saldo" ya no estaban. Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v749.

- **El desplegable de cuentas** se cierra al navegar, con un toque fuera (también al abrir otra acción de Inicio) y con Escape, que devuelve el foco a la ficha. Antes nada lo cerraba: el estado en memoria lo dejaba abierto al volver a Inicio. El ojo no lo cierra: enmascara total y detalle juntos (IN.2), como prueba `smoke.test.js`.
- **El saldo** usa `calcularTotalCuentas()` de Mis cuentas en vez de su propia suma. La sincronía ya estaba: `crud.js` emite `state:change` y Tesorería llama a `updSaldo()`.
- **La entidad arriba y el tipo debajo** en las hojas del pago y en el desplegable: `nombreCortoCuenta()`, junto a `_autoNombre`, reduce "Banco de Bogotá Ahorros" a "Banco de Bogotá" (el formulario no pide nombre, así que el tipo salía dos veces). Una entidad larga baja a una segunda línea en vez de cortarse; a menos de 390 la fila de la cuenta baja sus espacios a 8.
- **Defecto de INI.2e:** la fila de "Completa el pago" quedaba con espacios de 14 y borde de 16 porque `.cuenta-pago__opcion`, más abajo en `domain.css` y con la misma especificidad, ganaba; el selector sube a `.cuenta-pago__opcion.cuenta-multi__row`.
- **Un solo mensaje cuando no alcanza** (`opcionesSiNoAlcanza`): otra cuenta sola alcanza ("Si ya pasaste el dinero a una sola cuenta, elígela"), solo sumando varias, o ni sumando todas (el botón se apaga: "No alcanza con tus cuentas"). "Completa el pago" cambia su frase fija por la que sigue el reparto (`estadoCompletar`).
- **Sin reparto que el usuario no eligió:** sale `resolverPagoMultiCuenta` (sin llamadores) y la rama que marcaba de entrada las de mayor saldo.
- **Nada se paga dos veces:** `_confirmarLote` vuelve a leer los pendientes de `S` antes de registrar; si alguno cambió mientras se elegía la cuenta, no registra nada y lo anuncia.
- **"Esta semana" sin filas** ya no pinta "Todo al día · Sin vencimientos…" (decía eso con pagos vencidos hoy): la celda se oculta. Tino ("Todo al día") sale también debajo de "Atención hoy" cuando lo de hoy no es un pago; con un pago hoy, no. Cada fila de "Atención hoy" lleva `data-seccion` para el `:has()`.
- Pruebas: `cuenta-pago.test.js` (los tres casos, la entidad y el tipo, el botón apagado, pagar desde la cuenta a la que se pasó el dinero), `cuenta-helper.test.js` (los mensajes de "Completa el pago"), `render.test.js` (el cierre del desplegable, `nombreCortoCuenta`, el saldo), `compromisos.test.js` y `vencimiento-unico.test.js` (la semana vacía), `inicio-control-pago.test.js` (nuevo, 12 E2E: desplegable, nombres, mensajes, lo desmarcado, el pago que entra por otro lado, Tino). Unitarias 5969/5969, E2E 526/526.

### feat(inicio): INI.2f, "Todo al día" con Tino · 2026-11-16

[ADR 152](DECISIONS/152-inicio-rediseno-saldo-al-centro-y-pago-en-hojas.md) D8; cierra INI.2: el tablero "Finko · Inicio, rediseño" quedó aplicado entero y su HTML se mandó a la Papelera. Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v748.

- **Sin nada en "Atención hoy" ni filas en "Esta semana"**, las dos tarjetas se van y Tino duerme sobre su sol (`#panel-todo-al-dia`): un sol crema de 204 con dos halos y el dibujo de 310 apoyado abajo, más ancho que el sol, centrado entre el saldo y la barra. Es la pose `tranquilo` que ya existía: el tablero trae el mismo dibujo.
- **Lo decide el CSS** (`identidad.css`, sección 12) con `:has()` sobre lo que pintaron las dos celdas (el vacío `.atencion-hoy__ok` y la ausencia de `.esta-semana__lista`), así no depende del orden en que se dibujan. Sin cuentas, "Atención hoy" no pinta su vacío y sigue la guía del usuario nuevo. Solo bajo 1024px.
- Con algo en una de las dos, nada cambia: "Nada que atender hoy" o "Todo al día · Sin vencimientos en los próximos 7 días" como antes.
- La imagen carga perezosa (`loading="lazy"`): mientras no se ve, no se descarga; ya estaba en el precache del SW.
- Pruebas: `inicio-rediseno.test.js` (3 nuevas: Tino centrado con su nombre, no sale con pagos, escritorio sin cambios), `inicio-atencion.test.js` (el caso sin nada ahora muestra a Tino). Unitarias 5946/5946, E2E 514/514.

### feat(inicio): INI.2e, "Completa el pago" · 2026-11-16

[ADR 152](DECISIONS/152-inicio-rediseno-saldo-al-centro-y-pago-en-hojas.md) D7. Vale en todo reparto entre cuentas: el lote, el pago de un fijo, un gasto, un abono y los aportes a metas y reservas. Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v747.

- **La hoja** (`_mostrarPickerMultiCuenta`, `htmlFilasCompletar`): "Completa el pago" con volver y X, una frase ("Elige una o varias cuentas para cubrir $X. Si ya pasaste dinero a otra cuenta, elígela aquí…") y las cuentas con su casilla a la derecha y, si están marcadas, "Usa $X" o "No hace falta". Sale el aviso rojo de la hoja anterior: la de la cuenta ya lo dijo.
- **El reparto sigue el orden en que se marcan** (`repartirEnOrden`): la primera pone lo que tiene sin quedar en negativo y la siguiente lo que falta. Antes salía de la de mayor saldo (`distribuirPago`), que sigue para el reparto sin preferida.
- **Abre con la cuenta que no alcanzó**, sola: el usuario marca con qué completar. Antes se rellenaba con las de mayor saldo.
- **El pie:** "Pago completo" en verde o "Faltan $X" en ámbar, "$cubierto de $total" y una barra de 6; el botón "Pagar $X" solo con el pago cubierto (si no, "Elige otra cuenta", apagado).
- **Volver** regresa a "¿Desde qué cuenta pagas?" con la misma cuenta marcada; desde un formulario no hay flecha.
- Ajuste al tablero (anotado en el ADR): en el tablero la tarjeta se sale de la hoja a 390 y la hoja corría a lo ancho; acá va a 12 de los bordes, con espacios de 8, logo de 40 y nombre en 15.
- Pruebas: `cuenta-helper.test.js` (`repartirEnOrden` nueva; el reparto con la preferida sola y volver desde la cuenta, reescritas), `aportes-bolsas.test.js` (marcar la otra cuenta), `inicio-rediseno.test.js` (2 nuevas: completar con Nequi y volver). Unitarias 5946/5946, E2E 511/511.

### feat(inicio): INI.2d, "¿Desde qué cuenta pagas?" y el saldo que no alcanza · 2026-11-16

[ADR 152](DECISIONS/152-inicio-rediseno-saldo-al-centro-y-pago-en-hojas.md) D6; reemplaza la hoja plegada del ADR 150 D5. Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v746.

- **La hoja** (`_mostrarSelectorPreferida`, `htmlHojaCuentaPago`): "¿Desde qué cuenta pagas?", "Total a pagar $X" y las cuentas en una sola tarjeta, cada una con su logo de 42, nombre, tipo largo (`tipoDeCuenta(c, true)`), saldo y el círculo de marcado a la derecha. Abre marcada la propuesta (la habitual del pago o la de mayor saldo); marcar otra repinta la lista y el botón. Salen la vista plegada, "Cambiar" y "Después del pago te quedan".
- **El saldo que no alcanza:** debajo de la fila marcada, el aviso ámbar "No tienes saldo suficiente en esta cuenta para cubrir el pago: faltan $X…", y el botón pasa de "Pagar $X" a "Completar con otra cuenta", que lleva al reparto entre cuentas.
- **Volver:** `resolverPagoConSelector` acepta `volver`; la flecha devuelve `VOLVER` y el lote (`_confirmarLote`) vuelve a abrirse con las mismas casillas (`_abrirLote` con los marcados). Desde el reparto, "Volver" regresa a esta hoja con la misma cuenta marcada.
- **Cáscara de las hojas del pago** en `identidad.css`: flecha de volver (`.modal__volver`, el chevron al revés), título en 21, X redonda, pie más hondo con filo y botón redondo de 56. El cuerpo vive en `domain.css` (sección INI.2d).
- Pruebas: `cuenta-pago.test.js` (reescrito: la lista, el aviso, repintar al marcar, `VOLVER`), `cuenta-helper.test.js` (el título), `inicio-rediseno.test.js` (3 nuevas: propuesta y aviso, volver al lote con las casillas, pagar desde la marcada). Unitarias 5945/5945, E2E 509/509.

### feat(inicio): INI.2c, la hoja "Pagos para hoy" · 2026-11-16

[ADR 152](DECISIONS/152-inicio-rediseno-saldo-al-centro-y-pago-en-hojas.md) D5 y D9. Rotación forzada del CHANGELOG: las entradas del 15 pasan al archivo del mes. Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v745.

- **Cada pago es una tarjeta que se toca entera** (`renderFormPagoLote`): logo de 44 con `tejaDePago` (la teja de su categoría si no hay marca), nombre, el estado escrito en su color y el monto; la casilla a la derecha. El input cubre la tarjeta sin verse y la caja `.lote-row__caja` dice su estado; marcada lleva el borde de acento, desmarcada el monto se apaga.
- **Lo vencido dice su día:** "Venció el 15" (y "Cuota de la deuda · venció el 5"); el estado sigue saliendo de `estado-obligacion.js`, solo cambia cómo se escribe en esta hoja (ADR 152 D9). La hoja "Avisos de hoy" conserva sus pastillas.
- **El orden** (`ordenarLote`): lo vencido primero, el más atrasado arriba; a igual día, el de mayor monto.
- **Sin frase bajo el título** ni teja en el encabezado; la X es redonda.
- **El pie:** "Total a pagar", "3 de 3 seleccionados" y el total en 28; el botón redondo dice "Pagar los 3" ("Pagar 1 pago"); sin nada marcado se apaga y dice "Elige al menos un pago".
- `renderFormPagoLote` acepta los `marcados` para volver a la hoja con las mismas casillas (lo usa INI.2d).
- Pruebas: `compromisos.test.js` (4 nuevas: pie con conteo, logo y caja, `ordenarLote`, `marcados`; 5 ajustadas; 2 retiradas con la frase), `smoke` (el botón y el conteo; "Venció el 1"), `inicio-rediseno.test.js` (1 nueva). Unitarias 5944/5944, E2E 506/506.

### feat(inicio): INI.2b, "Atención hoy" resumida y "Esta semana" con el día · 2026-11-16

[ADR 152](DECISIONS/152-inicio-rediseno-saldo-al-centro-y-pago-en-hojas.md) D3, D4 y D9; cambia el ADR 150 D3, D4 y D7. Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v744.

- **Atención hoy:** los pagos vuelven a ser el aviso destacado (`_htmlDestacado`, como antes de AH.1): "Importante", "3 pagos para hoy", el total en el color del texto (`detalleMonto`, `.atencion-hoy__monto`) y "1 ya vencido" en rojo. Lo vencido junto con lo de hoy se dice así solo en esta fila; la mezcla con lo próximo sigue con el desglose de OB.1. Sale la lista de AH.1 (`_htmlPagos`, `MAX_PAGOS_ATENCION` y sus reglas): cada pago se lista en la hoja del lote.
- **"Pagar":** el botón dice solo su verbo (`cta.corto`) y el nombre accesible lo completa: "Pagar los 3 pagos para hoy".
- **"Ver los N"** solo cuando hay filas que no caben (más clases que el tope de tres); antes salía también cuando el total de avisos pasaba de las filas.
- **Tu ingreso:** "Recibiste tu ingreso del 30 de oct", con el mes en tres letras (ADR 102 D1); sale `_fechaLarga`.
- **Esta semana:** vuelven el recuadro del día (48 por 52), "En 3 días · gasto fijo", el monto con su signo, "Sale $X" arriba y "Calendario" en el título: reverso de AH.1b en `dashboard.js` y `responsive.css`. `cuandoSemana` se queda para las filas de escritorio (AH.1d).
- **Medidas del tablero en el teléfono** (`identidad.css`, sección 10): títulos en 20 con la letra de los números, tarjetas de radio 24, destacado con teja de 48, frase en 18 y botón redondo de 50, filas con teja de 44, y 28 entre Atención hoy y Esta semana. "Por completar" y "Novedades" comparten las filas y se ven igual.
- Pruebas: `atencion-hoy.test.js` (2 nuevas: el resumen y "Ver los N" solo si no cabe; 4 reescritas, 2 retiradas con la lista de AH.1), `compromisos.test.js` (reverso de AH.1b y `cuandoSemana`), `inicio-hoy` y `smoke` (el resumen y el lote desde "Pagar"; la hoja de avisos con cinco avisos), `inicio-rediseno.test.js` (2 nuevas). Unitarias 5942/5942, E2E 505/505.

### feat(inicio): INI.2a, el saldo al centro · 2026-11-16

[ADR 152](DECISIONS/152-inicio-rediseno-saldo-al-centro-y-pago-en-hojas.md) D1 y D2: nace la iniciativa INI.2 con el tablero "Finko · Inicio, rediseño". Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v743.

- **La banda:** degradado vertical del bosque claro al profundo con tres círculos centrados en el monto (disco de girasol al 7 %, anillos de 164 y 232). El encabezado y el saldo son dos cajas: cada una pinta los círculos desde el mismo centro (`--fk-banda-centro`), así se leen como uno.
- **El monto:** "Tu dinero disponible", sin "hoy", centrado; la cifra en 56 y el "$" volado en 28, en dos spans (`.hero-inicio__signo`, `.hero-inicio__cifra`). `countUp` gana `formato` y anima solo la cifra; el texto del párrafo sigue siendo el monto entero, así las pruebas y el lector no cambian. De once caracteres para arriba la cifra baja a 44 (y con el ancho a 320).
- **La ficha:** "En 3 cuentas" ("En efectivo y 2 cuentas"), centrada, tejas de 30 montadas 9 con aro del color de la banda.
- **Las cuentas abiertas:** caja translúcida sobre la banda; cada fila con logo de 40, nombre y tipo debajo (`tipoDeCuenta`: "Ahorros", "Depósito de bajo monto" para una billetera, nada para el efectivo) y saldo; al pie "Ver mis cuentas" centrado. Escritorio sigue igual (la columna de cuentas no lleva el tipo).
- Pruebas: `render.test.js` (6 nuevas: el "$" aparte, negativo, cifra larga, máscara, `tipoDeCuenta`), `inicio-rediseno.test.js` nueva (3: centrado y tamaños, cuentas abiertas, 320 px). Unitarias 5942/5942, E2E 503/503.

### fix(inicio): AH.1e, "Pagos para hoy" como en el tablero · 2026-11-16

[ADR 150](DECISIONS/150-estados-de-pago-y-logos-en-inicio.md) D7, con nota en el [ADR 151](DECISIONS/151-el-estado-de-una-obligacion-se-decide-una-vez.md). Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v742.

- **La revisión final del tablero** encontró un solo desvío: con un pago vencido y dos de hoy, el bloque se titulaba "Pagos pendientes" (regla de OB.1 para la mezcla) y el tablero, sobre ese mismo caso, escribe "Pagos para hoy".
- `tituloObligaciones` llama "Pagos para hoy" a lo vencido junto con lo de hoy; "Pagos pendientes" queda para la mezcla con lo próximo. Vale en Atención hoy, el título del lote, "Por pagar" y el panel de escritorio.
- Revisado también el tema claro, que el tablero pide con los mismos tokens: Atención hoy, Esta semana y la hoja de la cuenta se leen bien; la hoja pasa AA en los dos temas (texto más débil, 5,1:1).
- Pruebas: `estado-obligacion`, `atencion-hoy` y `compromisos` con el título nuevo (1 caso nuevo para la mezcla con lo próximo). Unitarias 5936/5936, E2E 500/500.

### feat(inicio): AH.1d, en escritorio el estado va en su columna · 2026-11-16

[ADR 150](DECISIONS/150-estados-de-pago-y-logos-en-inicio.md) D6, cierra AH.1. Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v741 (la v740 queda para OB.1b de la otra sesión).

- **"Lo que tienes que pagar" (escritorio):** cada fila es una rejilla de teja de 36 con radio 11 (el logo del pago con `tejaDePago`; préstamo y reserva, la de su sección), nombre, estado en su propia columna de 200 y monto en una de 120, a 60 de alto. Sale el badge de tipo y la flecha: la teja y la pastilla dicen qué es y cómo está.
- **El estado es la pastilla de D1:** el grupo del lote con `textoEstadoObligacion` (vencido o hoy, de OB.1); lo que viene, "próximo" con `cuandoSemana`.
- **El pago va sin signo** (D7); el préstamo que entra conserva el "+". El apartado con emoji legacy lo sigue mostrando (CAT.2c).
- Limpieza: `_tipoBadge`, `_iconoApartado` y `_LABEL_POR_TIPO` quedaron sin uso y salieron; el badge corto sigue en la lista del teléfono.
- Pruebas: `compromisos.test.js` (5 reescritas de la anatomía de escritorio y 2 ajustadas). Unitarias 5936/5936, E2E 500/500.

### refactor(pagos): OB.1b, lo que OB.1 repetía de AH.1 cede a AH.1 · 2026-11-16

Nota del [ADR 151](DECISIONS/151-el-estado-de-una-obligacion-se-decide-una-vez.md), con el [ADR 150](DECISIONS/150-estados-de-pago-y-logos-en-inicio.md). Fichas: [`contexto/inicio.md`](contexto/inicio.md), [`contexto/deudas.md`](contexto/deudas.md). SW v740.

- **El pedido:** donde OB.1 y AH.1 hacían lo mismo, manda AH.1; de OB.1 queda solo lo que AH.1 no tenía (el conjunto del lote con su monto, los textos de lo vencido y lo de hoy, los títulos de grupo).
- **Próximo a vencer:** de 1 a 3 días pasa a la ventana de "Esta semana" (7 días, ADR 150 D1 y D4), y sale el texto "Vence en 3 días", que ninguna pantalla mostraba: lo próximo se dice "Jue 19 · en 3 días". `DIAS_COMPROMISO_PROXIMO` del motor vuelve a su propio 3: los avisos no cambian.
- **La marca de un pago:** `marcaDeCompromiso` (marcas.js) repetía la regla de `tejaDePago` con una diferencia (no leía la nota). Sale; la regla de AH.1 queda expuesta como `marcaDePago` en `infra/fila-pago.js`, `tejaDePago` la usa y `marcaDeGasto` se muda a su lado. `marcas.js` vuelve a como estaba antes de OB.1.
- **La selección de cuenta** es la hoja de AH.1c; OB.1 no le suma nada.
- Pruebas: `fila-pago.test.js` (las de la marca de un gasto, mudadas de `marcas.test.js`, más la nota), `estado-obligacion.test.js` (la semana y el umbral propio del motor).

### feat(pagos): AH.1c, la hoja para elegir la cuenta del pago · 2026-11-16

[ADR 150](DECISIONS/150-estados-de-pago-y-logos-en-inicio.md) D5. Fichas: [`contexto/calendario.md`](contexto/calendario.md) e [`inicio.md`](contexto/inicio.md). SW v739 (la v738 fue de OB.1).

- **"¿Desde qué cuenta vas a realizar el pago?"** reemplaza al selector de tarjetas con "Continuar" en los pagos sin formulario ("Marcar pagado" y el lote de Inicio con varias cuentas). Plegada: la cuenta propuesta (la habitual del pago o la de mayor saldo) con su logo de 44, su tipo y "Cambiar"; "Saldo disponible" en grande y "Después del pago te quedan $X" (o cuánto falta si no alcanza). El botón dice "Pagar $total" y la X cierra.
- **"Cambiar"** abre en la misma hoja todas las cuentas: logo de 40, nombre, saldo en grande y el círculo de marcado; la que no alcanza sola dice "No alcanza sola · faltan $X" y, elegida, sigue llevando al reparto entre cuentas.
- Piezas puras exportadas: `cuentaPropuesta`, `cuentaFrenteAlPago`, `htmlHojaCuentaPago`.
- **La cáscara de la hoja vive en `identidad.css`:** en `components/domain.css` las reglas del encabezado y del pie perdían contra las capas `modals` y `responsive`. El cuerpo (`.cuenta-pago__*`) sí va en `domain.css`.
- Pruebas: `cuenta-pago.test.js` (9). Los de `cuenta-helper.test.js` pasan sin cambios: los radios siguen siendo `cuentaId` y "Pagar" sigue siendo `data-role="confirmar"`. Unitarias 5936/5936, E2E 500/500.

### fix(pagos): OB.1, el estado de cada pago se decide una vez · 2026-11-16

[ADR 151](DECISIONS/151-el-estado-de-una-obligacion-se-decide-una-vez.md). Fichas: [`contexto/inicio.md`](contexto/inicio.md), [`contexto/deudas.md`](contexto/deudas.md). SW v738.

- **El síntoma:** con dos pagos vencidos, Atención hoy decía "2 pagos para hoy · 2 ya vencidos"; el lote abría con "Pagos para hoy" y "Vencen hoy o ya vencieron", y la cuenta se pedía "para registrar 2 pagos vencidos" aunque uno venciera hoy.
- **La causa:** el estado se decidía en cinco sitios con cinco reglas (`sentido` del aviso, `dia === new Date().getDate()`, `diasAtraso === 0`...) y el conjunto del lote se calculaba en cuatro. Las fechas ya eran de calendario local: no era la zona horaria.
- **`infra/estado-obligacion.js`:** `estadoObligacion` (vencido, hoy, próximo a 3 días, el umbral del motor), `textoEstadoObligacion` ("Venció hace N días", "Vence hoy"), el título, la frase y el desglose de un grupo, y `pagosPendientesDelMes`, el único conjunto del lote con su monto y su estado.
- **Lo leen todos:** Atención hoy (`_contenidoPagos`: el bloque se titula "Pagos vencidos", "Pagos para hoy" o "Pagos pendientes"), el lote (título del modal, filas, tarjeta), "Por pagar" (grupo, filas, chip), el panel de Inicio en los dos anchos y la banda del Calendario. "Pagar lo vencido" pasa a "Pagar los N".
- **Montos iguales:** Atención hoy y el panel de Inicio sumaban la cuota completa y el lote cobraba lo que falta tras un abono. El motor toma el monto de `pagosPendientesDelMes`, y una deuda personal sin cuota ya no sale "vencida" por $0 (el botón decía 2 y el lote abría 1).
- **Menos texto:** el intro del lote queda en "Desmarca los que aún no hayas pagado."; la selección de cuenta se titula "¿Desde qué cuenta vas a realizar el pago?" y pierde la frase "Elige la cuenta para registrar 2 pagos vencidos de $X" (`cuenta-helper.js`, dos líneas; la hoja completa llega con AH.1c). El contexto que leen la guía sin cuentas y el reparto pasa a "registrar estos pagos".
- **El servicio de un gasto:** `marcaDeGasto` lo hereda del fijo por `compromisoId` (Netflix, Disney+, HBO Max, Prime Video); `marcaDeCompromiso` lee el `marcaId` y, sin él, el nombre. Sin campo nuevo ni migración (ADR 146, alternativa 3).
- **Bug de paso:** `Number(null)` es 0; sin el chequeo de tipo una obligación sin fecha se leía "para hoy". Lo encontró la prueba nueva.
- **Queda:** lo vencido del mes pasado no entra (el conjunto es del mes en curso) y el débito sin saldo que vence hoy va en su fila pero el lote lo trae.
- **Verificado en la app** (375 px, 16 de nov): Netflix vencido 6 días, tarjeta vencida 2 días con abono de $100.000, Disney+ hoy y HBO Max en 2 días. "Pagos pendientes · Pagar los 3 · $283.800" en Atención hoy, el mismo título, filas y total en el lote, y al registrar: tres gastos, la cuenta baja $283.800 y la deuda $200.000. HBO Max queda en "Esta semana".
- Pruebas: `estado-obligacion.test.js` (nuevo), `atencion-hoy`, `avisos`, `compromisos`, `cuenta-helper` y `marcas`; E2E de `smoke` y `movil-mv2` con los textos nuevos.

### feat(inicio): AH.1b, Esta semana con logos y el tablero tal cual · 2026-11-16

[ADR 150](DECISIONS/150-estados-de-pago-y-logos-en-inicio.md) D4 y D7. Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v737 (la v736 la reservó la sesión de correcciones del lote).

- **"Esta semana":** cada fila lleva la teja de lo que vence (el logo del pago con `tejaDePago`; ingreso, préstamo y reserva, la de su sección) donde iba el recuadro del día, y cuándo en la pastilla gris de "próximo": "Jue 19 · en 3 días" (`cuandoSemana`).
- **El tablero tal cual (D7), pedido de Esteban:** "Esta semana" pierde los totales y el enlace "Calendario" del título; el pago va sin signo ("$39.900"), lo que entra conserva el "+" y su color. "Atención hoy" y su hoja ordenan pagos, tu ingreso y lo demás (`ordenarGruposAtencion`, solo en el HTML: el conteo y los grupos no cambian). "Recibiste tu ingreso el 15 de noviembre", con el mes completo.
- Rotación forzada: las entradas del 14 de noviembre pasaron a [`changelog/2026-11.md`](changelog/2026-11.md).
- Pruebas: `compromisos.test.js` (7 reescritas, 1 nueva y 2 retiradas con los totales), `atencion-hoy.test.js` (2 reescritas y 3 nuevas), E2E de "Esta semana" en `inicio-hoy`. Unitarias 5888/5888, E2E 500/500.

### feat(inicio): AH.1a, cada pago de hoy con su logo y su estado · 2026-11-16

[ADR 150](DECISIONS/150-estados-de-pago-y-logos-en-inicio.md) D1 a D3, del tablero "Finko · Atención hoy y selección de cuenta". Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v735.

- **Antes:** "3 pagos para hoy · $463.800 · 1 ya vencido" decía cuánto, no qué. Ahora "Pagos para hoy" lista cada pago con el logo de su marca, su estado en pastilla y su monto, y el botón "Pagar los 3 · $463.800" paga el lote como antes.
- **Estado con ícono y palabra:** vencido en rojo con fondo (`alert`), para hoy en ámbar (`clock`); lo vencido va primero, el más atrasado arriba. `.chip-estado` vive en `atoms.css` para que "Esta semana" y escritorio usen la misma pieza.
- **La teja es el logo:** `infra/fila-pago.js` (`tejaDePago`) toma el `marcaId` guardado, la marca que menciona el nombre ("Tarjeta Bancolombia" trae el logo del banco) o, sin marca, la teja de su categoría en el color de Por pagar. El débito sin saldo lleva el logo de la cuenta que no alcanza.
- **Tope de tres pagos** a la vista; el resto lo dice "Y N pagos más" y lo lista la hoja "Avisos de hoy", que usa las mismas piezas a 32.
- **Queda para AH.1b** lo que el tablero cambia de ADR anteriores (D7): el orden pagos, ingreso y lo demás, "15 de noviembre" con el mes completo y "Esta semana" sin totales.
- Se coordinó con la sesión "Correcciones de Atención hoy y flujo de pago": ella es dueña del contenido del lote (`_contenidoPagos`) y de los textos; esta rebanada solo pinta.
- Pruebas: `fila-pago.test.js` (7), `atencion-hoy.test.js` (4 reescritas y 5 nuevas), E2E de `smoke` e `inicio-hoy` con las pastillas. Unitarias 5886/5886.

### fix(formularios): FORM.2i, en el iPhone tocar una opción avanza · 2026-11-16

[ADR 142](DECISIONS/142-formularios-por-tarea.md) D4 y D5. Ficha: [`contexto/captura.md`](contexto/captura.md). SW v734.

- **El síntoma:** en un iPhone, Registrar gasto pasaba del monto a la categoría y ahí se quedaba: la teja quedaba elegida y no se llegaba al recibo. Lo mismo en toda pregunta de opciones de "crear por preguntas" (tipo de deuda, tipo de cuenta...).
- **La causa:** "tocar avanza, el teclado no" se decidía con `event.detail > 0`. La opción vive dentro de su `<label>`: el dedo cae en el rótulo y el navegador reenvía el clic al `<input>`. Chrome lo reenvía con `detail` 1; Safari, con `detail` 0, igual que las flechas del teclado. Reproducido en WebKit 26.4 con perfil de iPhone.
- **El cambio:** `ui/toque.js` (`vigilarToques(form)`) recuerda el rótulo recién tocado durante esa tarea; el clic reenviado a su opción cuenta como toque. Lo usan `gastos/telefono.js` y `ui/preguntas.js`, los dos sitios que leían `detail`. El teclado sigue sin avanzar.
- **Por qué no lo vio la suite:** E2E corre solo en Chromium y los unitarios despachaban el clic directo al radio con `detail` 1.
- Pruebas: `toque.test.js` (7) y el caso Safari en `gastos-telefono.test.js` y `preguntas.test.js`. Unitarias 5874/5874, E2E 500/500.

### fix(deploy): UPD.4, el JS y el CSS se revalidan siempre · 2026-11-16

Ficha: [`contexto/transversal.md`](contexto/transversal.md) (aviso de actualización). Sin bump del SW: `vercel.json` no se precachea.

- **El síntoma:** en un iPhone con la app instalada, el "+" de la barra de abajo se hundía al tocarlo y no abría nada, en todas las secciones, con la v733 ya instalada. "Más" y el primario del encabezado sí abrían. Cerrar la app del todo y volver a abrirla lo arregló.
- **Lo que se sabe:** la página en memoria tenía el `index.html` nuevo (el botón pide `registrar-segun-seccion`, NAV.D) y un `actions.js` anterior que no conoce esa acción, y el delegador ignora en silencio una acción sin registrar. El código actual abre bien en Chromium móvil y en WebKit 26.4 con perfil de iPhone, y lo publicado estaba completo (268 archivos del precache en 200).
- **Lo que no se probó:** cómo se armó la mezcla. La sospecha es la ventana de 5 minutos de `max-age=300` en `.js` y `.css`: al recargar, el HTML (`max-age=0`) se revalida y un módulo aún "fresco" se puede reusar de la memoria del navegador. Con publicaciones cada 10 a 30 minutos esa ventana se cruza fácil.
- **El cambio:** `.js` y `.css` pasan a `max-age=0, must-revalidate`, igual que el HTML. El cache que sirve la app es el del SW, así que lo único que se pierde es el atajo del cache HTTP en la primera visita sin SW. Es una mitigación: si el síntoma vuelve, la causa es otra.
- `netlify.toml` conserva `immutable` de un año para `.js` y `.css`: no es el destino de publicación, pero publicarlo ahí repetiría el bloqueo que el changelog de mayo ya registró.
- Pruebas: sin cambios en `modules/`, no hay tests que correr.

### feat(logos): BR.7b, todos los logos pesan lo mismo · 2026-11-16

README de assets/svg sección 6. Ficha: [`contexto/sistema-visual.md`](contexto/sistema-visual.md). SW v733.

- **El tamaño ya no lo da el lado mayor sino la superficie:** BR.7 llevaba todo logo a 20 de lado mayor, y un logo casi cuadrado (Prime Video, Bancolombia, Apple) se veía mucho más grande que uno largo y bajo (Disney+) y rozaba las esquinas. Ahora la caja del logo tiene la superficie de un cuadrado de 16x16, con tope de 20 en su lado mayor: un cuadrado queda en 16x16 y Disney+ sigue en 20 de ancho, como estaba.
- **Corrección por tinta:** con la misma caja, un logo macizo pesa más que uno de trazo fino. Se midió cuánto pinta cada logo (al rasterizarlo) y los que pasan del 22 % se achican a la potencia 0,35, nunca se agrandan: YouTube, Lulo, iCloud, Netflix, Duolingo, Apple.
- Los 40 archivos se rehicieron desde los originales de BR.6c, no encima de BR.7, para no acumular redondeos. Así medidos todos caben en la ficha redonda del saldo, y la reducción al 85 % de BR.7 sale.
- Pruebas: sin cambios de lógica. Unitarias 5865/5865, E2E 500/500.

### feat(logos): BR.7, todo logo llena su teja · 2026-11-16

README de assets/svg secciones 6 y 6b. Ficha: [`contexto/sistema-visual.md`](contexto/sistema-visual.md). SW v732.

- **La retícula de 24 es la teja:** `tejaMarca()` pinta los `b-*` al 100 % (`.bank-avatar__glifo--logo`, con la teja recortando sus esquinas) en vez del 62 %. Los íconos de Finko (`i-*`, Efectivo) siguen al 62 %.
- **Los 40 archivos de `logos/` se normalizaron** separando fondo y logo: el fondo va de borde a borde como rectángulo (el cuadrado redondeado de Disney+, el círculo de Spotify y el de Claro pasan a rectángulo con su mismo relleno) y el logo se escala sin deformar a 20 de lado mayor, centrado. Las siluetas de Simple Icons, que llenaban los 24, bajan a 20. Las coordenadas van horneadas (el sync no admite `transform`) y los degradados del logo se movieron con él. Se borraron las líneas invisibles de AV Villas y Banco de Occidente.
- **ChatGPT y Apple TV+** tenían el logo recortado del fondo negro, mostrando la teja blanca por los huecos: ahora el fondo es negro de borde a borde y el logo va en blanco; su teja pasa a negra. Disney+ toma de color de teja el tono medio de su degradado.
- En la ficha redonda de cuentas del saldo el logo va al 85 % para que el círculo no le corte las esquinas.
- Pruebas: `marcas.test.js` (los colores de teja nuevos y la clase del logo). Unitarias 5865/5865, E2E 500/500.

### refactor(presupuesto): INI.1, se retira el panel de alertas de límites de Inicio · 2026-11-16

[ADR 149](DECISIONS/149-inicio-centro-de-atencion-rapida.md) D2. Fichas: [`contexto/inicio.md`](contexto/inicio.md), [`contexto/limites.md`](contexto/limites.md). SW v731.

- `renderPanelLimites()`, sus cuatro llamadas en `presupuesto/index.js`, el CSS `.limites-card` y su prueba unitaria (el ícono de una categoría propia en la alerta) salen: desde INI.1 no tenían contenedor. El límite pasado en Inicio lo dice "Novedades", con la teja de Límites.
- Unitarias 5864/5864, E2E 500/500.

### feat(inicio): INI.1, Inicio como centro de atención rápida · 2026-11-16

[ADR 149](DECISIONS/149-inicio-centro-de-atencion-rapida.md), que cambia el [099](DECISIONS/099-inicio-movil-hoy-en-una-lista.md) D1 y revisa una alternativa rechazada del [066](DECISIONS/066-motor-unico-de-avisos.md). Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v730.

- **Cuatro bloques en orden de urgencia:** Atención hoy, Esta semana, Por completar y Novedades. Los dos nuevos van en los dos anchos con las filas de Atención hoy, cuyas reglas salen del `@media` de `responsive.css`; aparecen solo con algo que decir.
- **Novedades** (`TIPOS_NOVEDAD`): límite pasado o al 75 %, reserva lista, meta alcanzada, respaldo atrasado y suscripciones. Salen de "Atención hoy" y de `#panel-avisos`; `#panel-limites` sale del DOM. "Nada que atender hoy" ya no promete "ningún límite pasado".
- **Por completar** (`infra/pendientes.js`, fuera del motor de avisos): gastos en Otros sin nota ni descripción de los últimos 30 días (la fila abre el más reciente con `editar-gasto`) y la pregunta de gusto o necesidad del ADR 147 con sus dos respuestas. No se pregunta sobre "Otros" a secas.
- **`meta-alcanzada`**: aviso nuevo del motor, severidad baja, siete días desde el último aporte de la meta cumplida (`fechaMetaAlcanzada`). Sin dato nuevo ni migración; sin interruptor en Ajustes.
- Pruebas: `por-completar.test.js` y `meta-alcanzada.test.js` (25), `atencion-hoy.test.js` con Novedades, E2E `inicio-atencion.test.js` (7); se ajustan `resumen.test.js`, `inicio-hoy.test.js` y `smoke.test.js` (DSK.1c y el panel de avisos). Unitarias 5865/5865, E2E 500/500 (el intermitente "dos dispositivos abiertos" de `nube.test.js` falló en la corrida completa y pasó en la suya, 6/6).

## Meses anteriores

- [2026-11, del 3 al 14](changelog/2026-11.md) (rotación forzada el 2026-11-13, el 2026-11-15 y el 2026-11-16: el mes pasó el techo de 60 KB)
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
