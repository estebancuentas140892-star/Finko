# Changelog - Finko Claude

> Revisado: 2026-11-15.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-11)

### feat(movimientos): HF.1d-2, Distribuir deja su ingreso y sus transferencias (ADR 143 D6) · 2026-11-15

[ADR 143](DECISIONS/143-todo-cambio-de-saldo-deja-registro.md) D6 y su resolución en implementación; cierra HF.1d. Fichas: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md), [`contexto/calendario.md`](contexto/calendario.md). SW v710.

- **El cobro que acredita Distribuir sale en Movimientos**: un `IngresoPuntual` por ocurrencia recibida, en su fecha, con `ingresoId`, `origen: 'distribucion'` y `repartido: true` (`registrosDelCobroDistribuido`). Lo que había acreditado la hoja no se registra otra vez: su fila queda `repartido`.
- **Lo que mueve entre cuentas también**: Estilo de vida y el complemento del déficit quedan como `transferencias` con la nota "Distribuir mi ingreso" (`transferenciasDeLaDistribucion`). "Deshacer" quita las filas con el saldo.
- **La fila es el sello**: la hoja de créditos descarta la ocurrencia que escribió Distribuir, no el mes (la segunda quincena sigue saliendo), y el asistente no propone lo `repartido`. `config.cobrosDistribuidos` ya no se escribe; se lee para lo repartido antes (convertirlo inventaría historial, I4).
- **Sin fecha datable** la fila es de hoy y va ligada al ingreso principal, para que la renta no la cuente encima del ingreso fijo (BUG-039).
- Pruebas: `registro-saldo` (R-HF2 de Distribuir, con deshacer), `tesoreria` (9: las filas y las transferencias), `agenda` (3: la hoja con la fila de Distribuir); E2E `distribucion-credito-automatico` (2 ajustadas: Distribuir sí deja `IngresoPuntual`, y lo repartido se lee de las filas).

### feat(movimientos): HF.1d-1, todo cambio de saldo deja registro (ADR 143) · 2026-11-15

[ADR 143](DECISIONS/143-todo-cambio-de-saldo-deja-registro.md), que aplica la R-HF2 del [ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md) y cierra su riesgo 10. Fichas: [`contexto/movimientos.md`](contexto/movimientos.md), [`contexto/me-deben.md`](contexto/me-deben.md), [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md). Schema v49. SW v709.

- **La regla que se prueba**: el saldo de hoy de una cuenta es su saldo de apertura más sus filas de Movimientos. `efectoEnCuenta(movimientos, cuentaId)` las suma (la transferencia resta lo enviado más su 4x1000 del origen; el gasto importado no cuenta) y `registro-saldo.test.js` lo prueba ruta por ruta con los manejadores reales.
- **Filas derivadas, sin dato nuevo**: lo prestado con cuenta ("Le prestaste a Mamá", sale) y el dinero recibido de una deuda D.14 ("Recibiste: ...", entra por `montoAcreditado`, en su día local).
- **El ajuste a mano**: editar el saldo de una cuenta guarda un registro en la colección nueva `ajustesSaldo` (migración v48 a v49, viaja a la nube), que Movimientos muestra como "Ajuste de saldo". No es ingreso ni gasto: Análisis, la renta y la tasa de ahorro no lo leen.
- **Borrar un préstamo devuelve su dinero** (cambia lo que decidió PE.7): el desembolso vuelve a su cuenta y cada abono sale de donde entró (`reversionAlBorrar`); la confirmación dice qué vuelve a dónde. Un abono sin cuenta no se toca.
- **Cada abono nuevo trae su id**, que usa su fila de Movimientos.
- Pendiente, HF.1d-2: Distribuir sigue acreditando sin fila y la guarda `cobrosDistribuidos` sigue en pie.
- Pruebas: `registro-saldo` (11 nuevas: las filas, `efectoEnCuenta`, la reversión, la migración y R-HF2 en el ajuste, el préstamo de punta a punta y la deuda D.14); E2E `smoke` (2 ajustadas: el ledger de Me deben y el de una cuenta suman la fila de lo prestado). Unitarias 5593/5593, E2E 472/472.

### feat(formularios): FORM.2h, Ajustes con mini-hojas, Tino, la tasa alta en ámbar y el banco con buscador · 2026-11-15

[ADR 142](DECISIONS/142-formularios-por-tarea.md) D2, D7, D9 y D10. **Cierra la iniciativa FORM.2.** Fichas: [`contexto/captura.md`](contexto/captura.md), [`contexto/deudas.md`](contexto/deudas.md), [`contexto/configuracion.md`](contexto/configuracion.md). SW v708.

- **D7, Ajustes como lista** (`data-ajustes`, `montarAjustes`): en el teléfono, "Tu perfil" se lee como filas con su valor a la derecha ("Tu nombre", "¿Cómo recibes tus ingresos?"); tocar una abre su mini-hoja con el campo y "Listo", y al cerrarla, si cambió, el formulario se envía solo (el `submit` de siempre guarda y dice "Guardado"). El botón "Guardar perfil" sale en el teléfono. El candado (PIN) conserva sus pasos: es un flujo de seguridad, no un dato que se edita.
- **D9, la tasa muy alta deja de bloquear**: `validarCompromiso` solo rechaza lo que no puede ser una tasa (más de 1.000 % al año o 500 % al mes, `TASA_IMPOSIBLE`); entre lo muy alto (`TASA_MUY_ALTA`, 200 % y 100 %) y eso, `avisoTasaAlta` muestra un aviso ámbar mientras se escribe y la deuda se guarda igual.
- **D10, Tino en los formularios**: la ⓘ de la tasa abre una mini-hoja con Tino que explica dónde está (`data-mini-ayuda`, `initMiniHojas`, también en escritorio), y "Primero necesitas una cuenta" (Registrar gasto y Me llegó dinero) lleva a Tino pensando en vez de la teja.
- **D2, el banco con buscador**: en el teléfono, "Banco o billetera" de Nueva cuenta abre el desplegable de Finko con buscador en vez de la lista flotante.
- `captura-telefono.js` prepara al iniciar los formularios que ya están en la página (Ajustes se pinta antes).
- Pruebas: `compromisos` (2 reescritas y 1 nueva: muy alta avisa, imposible bloquea); E2E `formularios-telefono` (3 nuevas: el nombre en su mini-hoja, la deuda con tasa alta y Tino, el banco con buscador); `movil-mv2` (1 ajustada: la cuenta elige el banco en el desplegable). Unitarias 5582/5582, E2E 472/472. Falta la prueba de toda la iniciativa en un iPhone real (REV.3b).

### feat(gastos): FORM.2d, la ficha del gasto es su formulario · 2026-11-14

[ADR 142](DECISIONS/142-formularios-por-tarea.md) D6 (en el teléfono reemplaza la hoja del gasto del [ADR 119](DECISIONS/119-plan-de-salida-en-hoja-y-el-detalle-del-gasto.md) D2). Fichas: [`contexto/gastos.md`](contexto/gastos.md), [`contexto/captura.md`](contexto/captura.md). Solo bajo 1024 px. SW v706.

- **Tocar un gasto abre su ficha**: el mismo recibo de FORM.2b, titulado "Gasto", sin barra de etapas ni "Guardar". Cada dato abre su mini-hoja (cuenta, fecha, nota; monto y categoría desde arriba) y al volver al recibo el cambio **se guarda solo** (`_guardarGasto` con `quedarse`), con "Deshacer" en el aviso (`_restaurarGasto`: el gasto y sus efectos en cuentas, deuda y cuota de la tarjeta vuelven a como estaban).
- Debajo, lo que decía la hoja (`htmlExtrasDetalleGasto`: cómo va el límite de su categoría y "Los N gastos de X", que abre Movimientos), "Repetir hoy" y, al pie, "Eliminar este gasto"; borrar desde la ficha la cierra. Editar desde cualquier lado (Movimientos incluido) abre la ficha: ya no reabre el formulario de crear.
- Cerrar la ficha después de un cambio no pregunta "¿Salir sin guardar?": ya quedó guardado.
- Pruebas: `gastos-telefono` (1 reescrita y 1 nueva: un cambio se guarda solo y "Deshacer" lo devuelve); E2E `movil-mv2` (2 reescritas: la ficha con sus acciones y un dato en dos toques; la ficha con el límite y "Los N gastos"; 2 ajustadas: el atrás del sistema y el deslizar se prueban sobre la ficha). Unitarias 5581/5581, E2E 469/469. Las fichas de los otros registros (deudas, metas, cuentas) siguen con su hoja y "Editar", que ahora abre el resumen de sus preguntas.

### feat(formularios): FORM.2g, el resto de crear y los controles de Finko en todos los formularios · 2026-11-14

[ADR 142](DECISIONS/142-formularios-por-tarea.md) D2 y D5. Ficha: [`contexto/captura.md`](contexto/captura.md). Solo bajo 1024 px. SW v705.

- **Por preguntas**: Nueva reserva (para qué pago te preparas, con las plantillas en la misma pregunta, y cuánto necesitas reunir), Le prestaste (a quién y cuánto), Nueva inversión (en qué, cómo la reconoces y cuánto) y Nuevo límite (a qué categoría, que avanza al tocarla y deja el monto sugerido, y el máximo del mes). Lo opcional (fechas, frecuencia, interés, motivo, tasa, plazo, la cuenta de donde salió) va en "Agrega si quieres". Editar abre en el resumen.
- **Los controles de Finko en lo que quedaba** (`data-captura`): Configurar el fondo, Cuánto apartar, Compras pequeñas y los formularios de la familia (perfil del niño, mesada, premio, PIN).
- `captura-telefono.js`: un formulario se prepara una sola vez mientras su hoja está abierta (el armazón no pierde la pregunta en la que va), y un `MutationObserver` prepara los que aparecen después: el que el dominio vuelve a pintar con la hoja abierta y los que no viven en una hoja.
- **El vigía de la regla del 142 D2** (`tests/e2e/formularios-telefono.test.js`): trece formularios abiertos a 390 px, ninguno muestra un `<select>`, un `type="date"` ni un `type="number"` del sistema.
- **Lo que queda fuera, a FORM.2h**: Ajustes como lista con mini-hojas (142 D7), la ayuda de la tasa con Tino (D10), la tasa muy alta como aviso ámbar (D9) y el buscador del banco. Pagar varios no lleva teclado: no se escribe un monto.
- Pruebas: E2E `formularios-telefono` (13 nuevas); `apartados` (1 ajustada al bloque con atributos); `movil-mv2` (1 reescrita: Nueva reserva por preguntas). Unitarias 5580/5580, E2E 469/469.

### feat(formularios): FORM.2f, cuenta, ingreso fijo, gasto fijo y meta por preguntas · 2026-11-14

[ADR 142](DECISIONS/142-formularios-por-tarea.md) D5 con el armazón de FORM.2e; el gasto fijo conserva el orden del [ADR 141](DECISIONS/141-el-gasto-fijo-empieza-por-el-monto.md) D1. Ficha: [`contexto/captura.md`](contexto/captura.md). Solo bajo 1024 px. SW v704.

- **Nuevo gasto fijo**: ¿Cuánto pagas? · ¿Qué es? (con el nombre cuando la categoría lo pide; no avanza al tocar) · ¿Cada cuánto? ("Otra" muestra la lista de Finko) · ¿Qué día?. "Nota o débito automático" en el resumen. Editar abre en el resumen.
- **Nueva meta**: ¿Qué quieres lograr? · ¿Cuánto necesitas reunir?; fecha límite (con el calendario de Finko), categoría y nota en "Agrega si quieres".
- **Ingreso fijo**: ¿Qué tipo de ingreso es? (desplegable de Finko) · ¿Cómo lo llamas? · ¿Cuánto recibes? · ¿Cada cuánto?; día de pago (31 botones) y la cuenta donde llega en el resumen.
- **Nueva cuenta**: ¿Dónde tienes este dinero? · ¿Qué tipo de cuenta es? (aparece al elegir el banco) · ¿Cuánto tienes hoy?; 4x1000, cuota de manejo y los datos para que te consignen en el resumen. Es el formulario que se reutiliza: Nueva y Editar fijan `data-preguntas-inicio`.
- `preguntas.js`: un bloque `data-no-avanza` lleva "Siguiente" a la vista; el resumen lee el valor de un desplegable o una fecha de Finko de su botón.
- Pruebas: E2E `movil-mv2` (2 nuevas: el gasto fijo y la cuenta de punta a punta a 390 px) y `contraste` (1 ajustada: el error de la primera pregunta de la meta). Unitarias 5580, E2E 456/456.

### feat(compromisos): FORM.2e, crear por preguntas y Nueva deuda · 2026-11-14

[ADR 142](DECISIONS/142-formularios-por-tarea.md) D5 (cambia el [ADR 042](DECISIONS/042-formularios-v2-visual.md) D4 en el teléfono). Fichas: [`contexto/captura.md`](contexto/captura.md), [`contexto/deudas.md`](contexto/deudas.md). Solo bajo 1024 px. SW v703.

- **`ui/preguntas.js`, el armazón de crear**: un formulario con `data-preguntas` va de a una pregunta por pantalla, con progreso ("Nueva deuda · 3 de 6"), la pregunta en grande, su ayuda y un solo control. Elegir avanza al tocar (salvo `data-no-avanza`); escribir lleva "Siguiente" y Enter sigue; sin responder no se sigue y el error dice qué hacer (`data-falta`). Atrás vuelve con la respuesta puesta.
- **El resumen**: cada respuesta es una fila que vuelve a su pregunta y "Listo" regresa; lo opcional (`data-opcional`) es una ficha de "Agrega si quieres" o, si ya tiene valor, una fila. El botón de guardar del formulario va ahí. Un error al guardar lleva a la pregunta de su campo. Editar abre en el resumen (`data-preguntas-inicio="resumen"`).
- **Controles nuevos**: el teclado de Finko en cada pregunta de dinero; `data-control="dia"` da 31 botones y "Último día del mes" sobre el campo de siempre; un `type="number"` (la tasa) pasa a texto con el teclado numérico y la coma se escribe como punto.
- **Nueva deuda en seis preguntas**: ¿A quién le debes? (dos tarjetas grandes; el formulario se vuelve a pintar y el armazón sigue en la siguiente) · ¿Qué tipo de deuda es? · ¿Cómo la reconoces? · ¿Cuánto debes hoy? · ¿Cuánto pagas cada mes? · ¿Qué día pagas la cuota?. En el resumen: cupo, tasa, frecuencia, nota, "Recibí este dinero" y "Se debita sola". `normalizarCompromiso` y `validarCompromiso` no cambian.
- Pruebas: `preguntas` (9 nuevas); E2E: `movil-mv2` (1 nueva: Nueva deuda de punta a punta a 390 px). Unitarias 5580, E2E 454/454. La ayuda de la tasa con Tino y la tasa alta como aviso ámbar siguen pendientes (FORM.2g).

### feat(formularios): FORM.2c, mover dinero en dos etapas y los controles de Finko · 2026-11-14

[ADR 142](DECISIONS/142-formularios-por-tarea.md) D2 y D4. Ficha: [`contexto/captura.md`](contexto/captura.md). Solo bajo 1024 px. SW v702.

- **`ui/captura-telefono.js`**, una pieza para todos: un formulario la pide con atributos y el dominio no aprende nada. `modales.js` gana `registrarAlAbrir`, así corre en cada apertura con lo que el dominio ya llenó, también en los formularios que se reutilizan.
- **`data-etapas-monto="¿Cuánto abonas?"`**: Monto · Revisar. El primer campo `data-miles` se muda a la etapa del monto con el teclado de Finko y su lectura en palabras; lo demás queda en "Revisar" bajo el monto, que se toca para cambiarlo. Sin monto no se sigue; un error del monto al guardar vuelve a su etapa. `data-atajos` pone atajos sobre el teclado que llevan directo a revisar.
- **Siete formularios**: Abonar a una deuda ("La cuota", "Toda la deuda"), Aportar a una meta y a una reserva ("Lo que falta"), Aportar al fondo, Me llegó dinero, Transferir y Me pagaron ("Todo lo que falta"). Pagar varios no lleva teclado: no se escribe un monto, se marcan pendientes.
- **Los controles de Finko** en esos formularios (y en cualquiera con `data-captura`): un `<select>` pasa a ser el desplegable de Finko (con buscador desde 16 opciones) y un `type="date"`, una fila que abre "Hoy", "Ayer" y el calendario de Finko (las fechas futuras, solo el calendario, y "Quitar la fecha" si es opcional). El campo real queda oculto con su `name` y su valor, y avisa `change` como siempre.
- Pruebas: `captura-telefono` (12 nuevas); E2E `movil-mv2` (2 ajustadas: el monto antes de Revisar en Aportar a una reserva y en Transferir) y `reflow-320` (1 ajustada: el teclado de Finko cabe a 320). Unitarias 5571, E2E 453/453. Falta la prueba en un iPhone real (REV.3b).

### feat(gastos): FORM.2b, Registrar gasto con el teclado de Finko y un recibo · 2026-11-14

[ADR 142](DECISIONS/142-formularios-por-tarea.md) D3 y D4, que cambia el [ADR 042](DECISIONS/042-formularios-v2-visual.md) D2 en el teléfono. Fichas: [`contexto/captura.md`](contexto/captura.md), [`contexto/gastos.md`](contexto/gastos.md). Solo bajo 1024 px: escritorio conserva la columna. SW v701.

- **Tres etapas en la misma hoja y el mismo `#form-gasto`** (`gastos/telefono.js`): Monto · Categoría · Revisar, con su barra arriba y "Volver" en la cabecera. Los nombres de los campos y los ids que lee `index.js` son los de siempre: `validarGasto`, `normalizarGasto` y el reparto no cambian.
- **El teclado de Finko** (`ui/teclado-finko.js`): 12 botones de 60 px (48 en pantallas bajas) que escriben en el mismo `<input data-miles>` con `inputmode="none"`; la cifra va a 58 px con su lectura en palabras. "Usar el teclado del teléfono" se recuerda en `config.tecladoTelefono` (sin bump de schema) y el mismo botón lo deshace. Glifo nuevo `i-borrar`, el único de la iniciativa.
- **¿En qué fue?** Todas las categorías en tejas de 92 px, las que más usas primero (`ordenarCategoriasPorUso`). Tocar una con el dedo avanza, aunque ya estuviera elegida; con el teclado se elige y se sigue con Enter. "Otra categoría" pide nombre e ícono ahí mismo.
- **El recibo**: tocar monto y categoría vuelve al monto; "Sale de", "Cuotas" (con tarjeta), "Fecha" y "Nota" abren cada una su mini-hoja (`ui/mini-hoja.js`) con los campos reales: el desplegable de Finko con cuentas y tarjetas (051 D4), "Hoy", "Ayer" y el calendario de Finko (`ui/calendario-finko.js`), y la nota con "Listo". La cuenta que se propone es la habitual (`cuentaHabitual`: la más usada en los últimos 20 gastos; sin historial, la de más saldo) con lo que le queda.
- **Si la cuenta no alcanza, el recibo lo dice antes de guardar** (`planSiNoAlcanza`): aviso ámbar con "Completar con..." (el mismo `distribuirPago` de `resolverPagoConPreferida`, la elegida primero) y "Pagar todo con..." (la que alcanza sola). Guardar usa lo elegido sin el diálogo "¿Desde qué cuentas?" ni la confirmación de sobregiro; sin con qué completar, el aviso dice en cuánto queda la cuenta.
- **"Deshacer" en el aviso** (`ui/toast.js` gana `accion`, también en escritorio): borra lo recién guardado y devuelve cada efecto (cuentas, deuda, cuota de la tarjeta). "Guardar y registrar otro" vuelve a abrir el formulario vacío.
- Editar, "Repetir" y un frecuente abren el recibo con todo puesto; editar dice "Guardar cambios" y edita una sola cuenta, como siempre.
- `styles/components/captura.css` va en una capa propia (`captura`, sobre `responsive` e `identidad`): `.modal__body h3` de la capa `modals` le ganaba al título de la pregunta.
- Pruebas: `gastos-telefono` (22 nuevas: orden por uso, cuenta habitual, plan sin saldo, semanas del calendario, mini-hoja con Escape y velo, "Deshacer", y las rutas reales por etapas con reparto, desplegable, "Ayer" y editar), `teclado-finko` (17 nuevas); E2E: `movil-mv2` (3 reescritas para las etapas: el botón de cada paso a la vista, "Listo" de la nota sobre el teclado y el desplegable de cuentas) y `miles` (1 ajustada). Unitarias 5559, E2E 453/453. Falta la prueba en un iPhone real (REV.3b).

### feat(formularios): FORM.2a, lo que vale para todas las hojas · 2026-11-14

[ADR 142](DECISIONS/142-formularios-por-tarea.md) D8 y D9, que cambia el [ADR 042](DECISIONS/042-formularios-v2-visual.md) D1 y el [ADR 123](DECISIONS/123-la-hoja-de-formulario-completa.md) D2. Ficha: [`contexto/captura.md`](contexto/captura.md). Solo bajo 1024 px, salvo los textos. SW v700.

- **Modo escritura** (`responsive.css`): con el teclado abierto la hoja pierde la agarradera y la teja, la cabecera baja a 52 px, el pie deja el margen seguro (el teclado lo cubre) y el alto no pasa de `safe-area-inset-top`. La agarradera del 123 D1 pesaba (0,5,1): la regla nueva la supera a propósito.
- **El campo se ancla arriba**: `llevarCampoALaVista()` usa `block: 'start'` y el cuerpo de la hoja tiene `scroll-padding-top` para que se vea el rótulo. Lo que ya se ve sigue sin moverse (141 D4).
- **Enter avanza, no envía** (`ui/teclado.js`): en el formulario de una hoja, Enter pasa al siguiente campo que abre teclado o, en el último, cierra el teclado. `enterkeyhint` "next" o "done" se pone al tocar el campo (antes de que salga el teclado) y al enfocarlo. Un área de texto conserva su salto de línea.
- **Un solo botón**: "Cancelar" se oculta en el pie de los 19 formularios del teléfono; la ✕, el deslizar y el atrás ya cierran. Los botones genéricos dicen qué guardan ("Guardar compromiso", "Guardar compras pequeñas", "Guardar ingreso fijo", "Guardar límite", "Guardar fondo", "Aportar a la reserva"). Escritorio conserva sus dos botones.
- **Cerrar con cambios pregunta** (`ui/hojas.js`, `pedirCierre`): un `input` o `change` de confianza en el formulario marca la hoja; la ✕, Escape, el atrás y el deslizar preguntan "¿Salir sin guardar?". Lo que el dominio llena al abrir (repetir un gasto) no cuenta, y guardar no pregunta porque el dominio cierra con `cerrarModal`. "Seguir editando" arma de nuevo el `CloseWatcher`, que sirve una sola vez.
- **Una sola marca de opcional**: la pastilla `.form-optional` "Opcional" reemplaza "(opcional)" en 17 rótulos, `label__opcional`, `label__opt` y el "Opcional." de las ayudas (`renderSelectorCuenta` gana `opcional`). Sale `.label-required` (sin usos) y "(COP)", "(1-31)" y "(1-15)" de los rótulos.
- **Errores por campo** (`infra/form-errors.js`): corregir un campo limpia solo ese campo; el aviso de arriba aparece con dos errores o más, dice "Revisa N datos para guardar." y lleva al primero ("Ir al primero" va en el color del título: en rojo daba 4,26:1 en oscuro); un error sin campo va en lista bajo "Antes de guardar:". Con el nuevo `revalidar`, después del primer intento de guardar cada campo se vuelve a validar al dejarlo (19 formularios de mover dinero y crear). Un aviso que dice lo mismo no se rehace, para que el lector de pantalla no lo repita.
- **Mensajes que dicen qué hacer**: unos 90 mensajes en 13 archivos de validación, con las equivalencias del kit del canvas ("Escribe cuánto fue. Por ejemplo: 45.000", "Ponle un nombre para reconocerla", "Elige un día del 1 al 31", "280 % al año es muy alto. ¿Tu extracto la da por mes?"). `_CAMPOS` suma las frases que los atan a su campo ("cuánto", "cada cuánto", "de qué cuenta sale", "a quién"...) y ata por primera vez los errores del fondo de emergencia, que caían sueltos. La tasa muy alta sigue bloqueando: volverla aviso ámbar cambia `validarCompromiso` y queda en FORM.2e.
- Pruebas: `teclado` (5 nuevas y 1 ajustada), `hojas` (5 nuevas), `form-errors` (3 nuevas y 6 ajustadas), y los textos nuevos en `apartados`, `bloqueo`, `compromisos`, `gastos`, `metas`, `personales`, `presupuesto`, `telefono-adulto` y `tesoreria`; E2E: `smoke` (2 ajustadas al rótulo con la pastilla). Falta la prueba en un iPhone real: va con REV.3b.

### feat(tesoreria): REV.2c, al transferir la consignación ante la DIAN en una frase · 2026-11-13

Texto del [ADR 135](DECISIONS/135-mis-cuentas-y-me-deben-en-el-telefono.md) D5. Ficha: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md). SW v699.

- **La nota de Transferir** suma, cuando el dinero entra a una cuenta: "No es un ingreso, pero tu banco puede reportarlo a la DIAN como una consignación. Finko la guarda en Movimientos por si la necesitas al declarar renta." Al pasar a efectivo queda solo "Es un movimiento entre tus cuentas: tu total no cambia." Texto corrido, sin caja ni color de alerta (ADR 107 D4).
- `notaTransferencia()` en `tesoreria/logic/transferencias.js` decide por el destino (efectivo por su banco, o por el tipo en cuentas viejas); la acción la rehace al invertir el par o al cambiar "Entra a".
- Pruebas: `tesoreria` (6 nuevas: la frase por destino, la cuenta vieja, el texto sin marcado, invertir hacia el efectivo y "Entra a" con 3 cuentas; 1 ajustada).

### feat(compromisos): REV.2b, el gasto fijo empieza por el monto · 2026-11-13

[ADR 141](DECISIONS/141-el-gasto-fijo-empieza-por-el-monto.md), que ajusta el [ADR 042](DECISIONS/042-formularios-v2-visual.md) D5 y extiende el [ADR 115](DECISIONS/115-el-pie-se-apoya-sobre-el-teclado.md). Fichas: [`contexto/deudas.md`](contexto/deudas.md), [`contexto/sistema-visual.md`](contexto/sistema-visual.md). SW v698.

- **El error**: el formulario abría con 16 chips de categoría (seis filas a 390 px) antes del monto, y con el teclado abierto el campo que se escribía podía quedar tapado.
- **El orden**: "¿Cuánto pagas?", "¿Qué es?" (todas las categorías), "¿Cada cuánto?" y "¿Qué día?" con el banner. La frecuencia va en chips (Mensual, Quincenal, Anual u Otra); "Otra" deja a la vista el desplegable de las nueve, que sigue siendo el dato.
- **"Más opciones"**, plegado: la nota (cuando la categoría ya da el nombre, el mismo campo se muda ahí) y el débito automático. Al editar se abre si guarda algo.
- **El teclado, en todos los formularios** (`ui/teclado.js`): al abrirse o al pasar de campo, el campo enfocado de una hoja sube al centro si quedó fuera de la vista o bajo el pie. No se hace al desplazar.
- **El formulario corto de MV2.17** queda anotado como descartado en el ADR, con lo que se sabe de él: los HTML del canvas se borraron el 2026-11-05.
- Pruebas: `compromisos` (5 nuevas, 1 retirada: frecuencia y día ya no comparten fila), `teclado` (6 nuevas), `smoke` (2 ajustadas y 1 nueva a 390 px con la edición). El efecto del teclado se verifica en el teléfono con REV.3b.

### feat(compromisos): REV.2a, Por pagar dice cuánto te falta pagar este mes · 2026-11-13

[ADR 140](DECISIONS/140-por-pagar-dice-cuanto-te-falta-este-mes.md), que ajusta el [ADR 036](DECISIONS/036-deudas-v2-visual.md) D1 y cambia el texto del pie del [ADR 070](DECISIONS/070-inicio-centro-de-atencion-en-escritorio.md) D8. Fichas: [`contexto/deudas.md`](contexto/deudas.md), [`contexto/inicio.md`](contexto/inicio.md). SW v697.

- **El error**: con solo un arriendo, la tarjeta de arriba de Por pagar decía "No tienes deudas registradas" y $0 sobre una lista con $1.500.000 por pagar. Sumaba solo el saldo de las deudas.
- **El hero**: "Te falta pagar este mes" con lo vencido y lo que falta del mes, fijos y cuotas. La cifra sale de `_agruparPorUrgencia()` de `views/lista.js`, la misma regla que reparte y suma los grupos del teléfono (`faltaPorPagarDelMes()`), así que coincide con "Vencidos" más "Lo que falta este mes". Sobre otro mes dice "Sin pagar en octubre"; sin pagos, "No tienes pagos registrados".
- **Debajo, solo con deudas**: "Lo que debes en total: $X" y el conteo de siempre. Sale la pastilla de cuota/mes: la cuota ya está en la cifra grande.
- **Inicio de escritorio**: el pie de "Lo que tienes que pagar" pasa de "en total debes" a "suman", porque es la suma de sus filas y no el saldo.
- Pruebas: `compromisos` (las del hero reescritas, 12, con la del arriendo solo y la que compara la cifra con las sumas de la lista; 2 del pie de Inicio ajustadas); `smoke` (1 ajustada).

### fix(analisis): BUG-039, la renta ya no suma el salario dos veces · 2026-11-13

Ficha: [`contexto/analisis.md`](contexto/analisis.md). SW v696. Cierra el riesgo 5 del [ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md).

- **El error**: con un salario de $3.000.000 con crédito automático, en noviembre "Ingresos brutos" mostraba $66.000.000: los $36.000.000 proyectados más los diez créditos que ese salario ya había dejado. Podía marcar que superabas el tope sin superarlo.
- **`estimarIngresosBrutosAnio()`**: un ingreso puntual con `ingresoId` es una ocurrencia de su fijo; si ese fijo ya entra en la proyección (activo y con frecuencia anual), no se suma otra vez. Si el fijo se borró o se desactivó, sus créditos del año sí cuentan, porque la proyección ya no los cubre. El valor manual de Ajustes sigue mandando.
- Pruebas: `analisis` (5 nuevas: el salario una vez, un puntual suelto junto a los créditos, el fijo desactivado, el fijo borrado, y el criterio que no pasa a "cerca" ni a "supera" por los créditos).

### fix(analisis): HF.1b, nada se cuenta dos veces · 2026-11-13

[ADR 139](DECISIONS/139-la-naturaleza-de-un-gasto.md), que escribe la HF.1a del [ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md) (P2). Fichas: [`contexto/analisis.md`](contexto/analisis.md), [`contexto/limites.md`](contexto/limites.md), [`contexto/ahorro.md`](contexto/ahorro.md), [`contexto/movimientos.md`](contexto/movimientos.md). SW v695.

- **El error**: comprar 100 con la tarjeta y pagarla 100 daba 200 en Análisis, en la renta, en Límites y en la tasa de ahorro. En Límites, además, la cena con tarjeta contaba como Necesidad porque lleva el `compromisoId` de la tarjeta.
- **`infra/naturaleza.js`** (nuevo, sin schema): consumo, consumo con tarjeta (`consumoTC`), pago de fijo y pago de deuda (categoría "Deudas"), y dos lentes. **Consumo** deja fuera los abonos: Análisis entero y las compras y consumos de la renta. **Lo que sale del ingreso** deja fuera la compra con tarjeta, que cuenta cuando se paga la tarjeta como cuota: Límites por grupo y la tasa de ahorro. Con una sola lente, quien paga un préstamo leería "guardas el 40 %" o vería Necesidades siempre por debajo del plan.
- **Movimientos**: el aporte al Fondo pasa a neutro (no sale de ninguna cuenta). Queda anotado en el ADR que el neto todavía suma la compra con tarjeta y su pago: arreglarlo pide que la fila diga con qué tarjeta se pagó.
- Gastos y Por pagar no cambian: "Gastaste" ya dejaba los abonos aparte, en "+ $X en fijos y deudas".
- Pruebas: `naturaleza` (17 nuevas: una por naturaleza y por lente, y la invariante 100 + 100 = 100 en las cuatro vistas, la que iba a dar HF.0f); `movimientos` (1 reescrita).

### docs(board): la poda del tablero del 13 de noviembre · 2026-11-13

[ADR 138](DECISIONS/138-la-poda-del-tablero-del-13-de-noviembre.md). Tablero: [`BOARD.md`](BOARD.md) y [`board/transversal.md`](board/transversal.md). Solo documentación, sin bump del SW.

- **Criterio de Esteban**: quedarse con lo que aporta y no seguir cambiando la app. Cada tarjeta se revisó contra el código y los ADR: de 47 entradas quedan 17, y el índice va en orden de valor.
- **MOV.1 cierra con 17 de 25 fichas**: las ocho restantes auditaban pantallas que MV2.30 volvió a dibujar. Sus pendientes ya estaban hechos (la fila de altas, el plan de salida, el vencido en rojo), pasan a HF o se descartan; la tabla vive en el ADR.
- **HF, de 24 rebanadas a seis tarjetas**, ninguna atada a la ficha 18. HF.0f y HF.0g salen: el banco de perfiles no está en esta copia ni en el stash, y sus tres errores ya tienen pruebas propias.
- **Se unen**: REV.5 en REV.3b, HF.1a en HF.1b, HF.1g en HF.1d, HF.3f y HF.3g en HF.3e, PERF.13 en MV2.28, HF.4 y HF.5a en NUBE.4.
- **Se recortan**: REV.2b sin "6 frecuentes y N más" (el ADR 042 D2 lo había rechazado) y REV.3a a solo "Descargar el mes para Excel".
- **Salen**: REV.4 (el ojo sigue único), DEC.1 (la razón ya está en Distribuir y en Por pagar), DV.2d (Tino explica los vacíos), PERF.14, PERF.15, DOC.5 y APR.3f.
- **BUG-039 entra**: la renta suma la proyección del salario más cada crédito automático del mismo salario (`estimarIngresosBrutosAnio()`).

### fix(movil): REV.1, la revisión del 13 de noviembre, tanda 1 · 2026-11-13

[ADR 137](DECISIONS/137-revision-del-13-de-noviembre-tanda-1.md). Fichas: [`contexto/deudas.md`](contexto/deudas.md), [`contexto/movimientos.md`](contexto/movimientos.md), [`contexto/limites.md`](contexto/limites.md), [`contexto/sistema-visual.md`](contexto/sistema-visual.md). SW v694. Lo demás de la revisión quedó en las tarjetas REV.2a a REV.4.

- **Por pagar**: "Agregar" con el chip "Fijos" abre de una vez el gasto fijo y con "Deudas" el formulario de deuda. Esos dos chips vacíos traen su botón ("Agregar gasto fijo"; entidad y personal) y ya no dicen "este mes".
- **Registro**: el logo de la primera pantalla, centrado en su teja. Al instalar, "Instalando Finko…" y "Finko quedó instalada"; Ajustes deja de ofrecer instalar en la pestaña desde la que se instaló; fuera de iPhone ya no abre las instrucciones del iPhone.
- **Botones redondos**: sin el rectángulo del navegador al tocar y con el anillo de foco que sigue su forma (`a11y.css` le cambiaba el radio a todo lo enfocado). El foco por teclado sigue visible.
- **Movimientos**: tocar la búsqueda ofrece solo "Buscaste antes", y nada si no hay búsquedas.
- **Límites**: el banner pregunta "¿Gastas más de lo que pensabas y no sabes en qué se fue el dinero?" en vez de nombrar un plan.
- Pruebas: `compromisos` (3, una reescrita), `install-prompt` (4 nuevas), `proposito` (1 reescrita); E2E: los chips de Por pagar en `smoke` y la búsqueda en `buscar`.

### feat(config): MV2.30 Ajustes en el teléfono; cierra rediseño5 y MV2.30 · 2026-11-13

[ADR 136](DECISIONS/136-ajustes-del-adulto-en-el-telefono.md). Ficha: [`contexto/configuracion.md`](contexto/configuracion.md). SW v693. Tablero "rediseño5", borrado al cerrar: era el último de `Diseño Finko/`.

- **Bajo el título**, "Tu perfil, tus datos y cómo funciona Finko" (en los dos anchos).
- **El índice** (bajo 1024px): "Tú y tu familia", "Tus datos", "La app en este teléfono" e "Información"; cada fila con su teja (la inicial en Tu perfil) y lo que pide atención con su aviso ("Nunca has guardado un respaldo", "Bloqueados en este dispositivo"). El tema oscuro es un interruptor en la fila. Siete íconos nuevos en la biblioteca y el sprite: `users`, `cloud`, `archive`, `bell`, `download`, `refresh` y `doc`.
- **Tu perfil**: "¿Cómo recibes tus ingresos? (opcional)" en botones, con "Prefiero no decir".
- **Copia en la nube** (antes "Guardar en la nube") y **Recordatorios bloqueados**, con el texto del tablero.
- **Respaldo y exportación**: qué pasa sin la nube, el estado del último respaldo en una tarjeta, "Guardar respaldo ahora", la contraseña, "Más opciones" en filas a la vista y "Borrar todos mis datos" aparte. "Teléfono" bajo 1024px, "dispositivo" en escritorio.
- **La hoja de borrar**: "¿Borrar todos tus datos?", qué se borra y, sin respaldo, el aviso con "Guardar respaldo primero" (`confirmar()` gana la opción `aviso`).
- Pruebas: `config` (tejas, botones, respaldo y la hoja con aviso), `nube`; E2E: el índice y el tema en `movil-mv2`, el perfil en `smoke`.

### feat(personales): MV2.30 Mis cuentas tanda 4, Me deben y sus hojas; cierra rediseño4 · 2026-11-13

[ADR 135](DECISIONS/135-mis-cuentas-y-me-deben-en-el-telefono.md) D7 y D8. Ficha: [`contexto/me-deben.md`](contexto/me-deben.md). SW v692. Tablero "rediseño4", borrado al cerrar.

- **Bajo el título**, "Dinero que prestaste y te van a devolver" (en los dos anchos).
- **En el teléfono** (`personales/telefono.js`), "Te deben" suelto con la pastilla "Te han devuelto $X de $Y" y su barra; la nota del círculo; los grupos en frase con su suma; cada préstamo una fila (cuánto falta y de cuánto, la barra si hubo abonos, "Pactó devolver en 17 días" en ámbar o rojo según la urgencia, el motivo y "solo seguimiento") con el círculo de "Me pagó" a la derecha. Desde 1024px sigue la lista de siempre; al cruzar el ancho se repinta.
- **La hoja de un préstamo** (`htmlDetallePrestamo()`, acción `personal-detalle`): cuánto falta, "Te devolvió $X de $Y · 40%", cuándo y de qué cuenta, lo pactado, el motivo y los abonos; "Me pagó", "Editar el préstamo" y, aparte, "Eliminar el préstamo".
- **"Me pagaron"** se titula "Te pagó Andrés", dice lo prestado, lo devuelto y lo que falta, pregunta "¿Cuánto te pagó Andrés?" en grande y el botón lleva el monto ("Registrar $150.000").
- **El vacío**: "Registrar un préstamo" dentro de la tarjeta del banner y sin el "+" del encabezado.
- Pruebas: `personales-telefono` (9 nuevas), V-7 de `personales` ajustada; E2E: Me deben en `movil-mv2`.

### feat(tesoreria): MV2.30 Mis cuentas tanda 3, Distribuir paso 1 · 2026-11-13

[ADR 135](DECISIONS/135-mis-cuentas-y-me-deben-en-el-telefono.md) D6. Ficha: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md). SW v691. Tablero "rediseño4".

- **Arriba**, lo que se reparte dice dónde entró: "Salario · entró a Bancolombia".
- **Cada paso** con "Paso 1 de 3" y un punto por paso; el primero es una pregunta ("¿Qué necesidades pagas con este ingreso?") con "Lo recomendado es dejarles el 50%. Hoy van en 65%."; en el teléfono la comparación compacta se va y "Cómo lo calculamos y otros métodos" baja al final del paso.
- **Cada necesidad** es una fila: teja, nombre y monto, "Día 14 · educación" debajo y la marca a la derecha (el mismo checkbox).
- **El pie** dice "Asignado $X · Queda $Y" y "Siguiente: ahorro" o "Siguiente: estilo de vida".
- Pruebas: 1 reescrita y 2 ajustadas en `distribuir-movil`; E2E: el indicador y el pie de `smoke`, `movil-mv2` y `distribucion-remanente`.

### feat(tesoreria): MV2.30 Mis cuentas tanda 2, la hoja de una cuenta y Transferir · 2026-11-13

[ADR 135](DECISIONS/135-mis-cuentas-y-me-deben-en-el-telefono.md) D4 y D5. Ficha: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md). SW v690. Tablero "rediseño4".

- **La hoja de una cuenta** es propia (`htmlDetalleCuenta()`, acción `cuenta-detalle`) en vez de la genérica: la cuenta con su saldo; tipo, 4x1000 ("Aplica" o "No aplica"), cuota de manejo ("No tiene" o "$15.900, el día 5") y el dato para recibir en filas; "Ver sus movimientos" como fila; "Editar la cuenta" y, aparte, "Eliminar la cuenta" con "Te pediremos confirmar". Las acciones pasan por `registrar-abrir`, que cierra la hoja primero.
- **Transferir entre cuentas**: "Sale de" y "Entra a" con lo que tiene cada cuenta; con dos cuentas, "Cambiar" en la de origen invierte el par. "¿Cuánto vas a pasar?" en grande, "Es un movimiento entre tus cuentas: tu total no cambia.", la fecha y la nota plegadas y el botón con el monto ("Transferir $200.000"). En los dos anchos.
- Pruebas: 5 ajustadas o nuevas en `tesoreria` y 1 en `detalle-fila`; E2E: la hoja de la cuenta de `movil-mv2` mide la hoja nueva y uno nuevo a 390 px invierte el par y lee el botón.

### feat(tesoreria): MV2.30 Mis cuentas tanda 1, el total, tu ingreso y "Reparte" · 2026-11-13

[ADR 135](DECISIONS/135-mis-cuentas-y-me-deben-en-el-telefono.md) D1 a D3. Ficha: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md). SW v689. Tablero "rediseño4".

- **Arriba, en el teléfono**: la tarjeta de identidad dice cuántas cuentas hay en una pastilla en vez de la barra de composición; "Tus cuentas" se ve y "Transferir entre cuentas" es un botón neutro, sin "Atajo" (en los dos anchos).
- **Cada cuenta** dice qué es: "Lo que llevas encima" para el efectivo, "Ahorros · Bancolombia" con nombre propio y, en el teléfono, "aplica 4x1000" (la hoja no lo repite: `data-solo-fila`).
- **Tu ingreso** (antes "Fuentes de ingreso", sin la frase): cada fijo en verde con cuándo llega ("Cada mes, el día 1 · el próximo llega en 18 días", `cuandoLlegaIngreso()`), que absorbe el día de pago y, en el teléfono, el aviso del próximo cobro. "Ingreso fijo" y "De una vez" con la nota de la diferencia; sin ingresos, una tarjeta con "Agregar mi ingreso fijo" y "¿Te entró dinero una sola vez? Regístralo". Sin puntuales ya no hay aviso de que faltan.
- **"Reparte tus $X"**: lo recibido como subtítulo, cada grupo en una fila con "Hoy 65% · lo recomendado es 50%" y una rayita en lo recomendado; la nota con la primera razón y "Por qué esta propuesta" plegado al pie.
- Pruebas: 21 ajustadas o nuevas en `tesoreria` y 2 en `detalle-fila`; E2E: uno nuevo a 390 px, y en `smoke` el alta de ingresos parte del vacío nuevo y la línea de la cuenta se mide visible.

### feat(analisis): MV2.30 Consultar tanda 4, Análisis en filas; cierra Consultar · 2026-11-13

[ADR 134](DECISIONS/134-consultar-del-adulto-en-el-telefono.md) D7. Ficha: [`contexto/analisis.md`](contexto/analisis.md). SW v688. El tablero "rediseño3" queda aplicado completo y su HTML se borró.

- **Bajo el título**, "Cómo está tu dinero y hacia dónde va", en los dos anchos.
- **En el teléfono** (`analisis/telefono.js`), las tarjetas de escritorio dicen lo mismo en filas: la salud suelta con su banda en pastilla con ícono, su barra y lo que más la frena con su salida ("Tienes una base saludable. Lo que más puede mejorar es..." en la banda buena); "De dónde sale el 59", un factor por fila; "Lo que realmente tienes" con lo que tienes y lo que debes en filas con su parte; "A dónde va tu dinero" en barras por mes con la comparación en frase (y, si el mes anterior no tuvo gastos, "todavía no hay con qué comparar"); "En qué gastas", una fila por categoría con la barra medida contra la mayor.
- **"Más detalle de tus gastos" y "Estado de tu renta"** son dos filas de una tarjeta que abren su hoja (`analisis-hoja`, `#modal-detalle-fila`) con el mismo cuerpo del plegable de escritorio; la de la renta avisa "Estás cerca de un tope para declarar" o, en rojo, "Pasas un tope para declarar". Un enlace dentro de la hoja la cierra. Desde 1024 px siguen los plegables, con los subtítulos nuevos.
- **El vacío** dice "Todavía no hay suficientes datos" y qué se verá; conserva su teja porque Tino ya está en el banner de propósito.
- Pruebas: `analisis-telefono` nuevo (13), 4 ajustadas en `analisis` (el simulacro de `matchMedia` ya distingue el teléfono de la tarjeta a 1440); E2E: uno nuevo a 390 px abre las dos hojas, `smoke` mide el vacío nuevo y el de DIS.10 (C11) registra el gasto desde el "Registrar" de la barra de arriba, porque a 390 px ya no hay plegable que siga abierto.

### feat(movimientos): MV2.30 Consultar tanda 3, Movimientos por día · 2026-11-13

[ADR 134](DECISIONS/134-consultar-del-adulto-en-el-telefono.md) D6. Ficha: [`contexto/movimientos.md`](contexto/movimientos.md). SW v687. Tablero "rediseño3".

- **Por día**: bajo el título, "Todo lo que entró y salió, por fecha"; dentro de cada mes, cada día con su encabezado ("Hoy, viernes 13", "Ayer, jueves 12", "Martes 10") y su total, en los dos anchos. La fila deja de repetir el día y dice qué y de dónde ("Mercado · Bancolombia"): supera esa parte del ADR 121 D1.
- **Filtros**: con dos tipos o menos ("Gastos", "Aportes") van a la vista, sin "+N tipos".
- **Un gasto abre la hoja del gasto** (la de Gastos, ADR 119 D2: de dónde salió, categoría, "Editar" y "Borrar este gasto" con a dónde vuelve el dinero) en vez de la hoja genérica de la fila.
- **En el teléfono**: el mes en frase y grande con su total, cada día una tarjeta (las filas se redondean por adyacencia: la lista se pinta en lotes y no admite envoltorio) y la búsqueda dice "2 resultados · -$404.300" con "Limpiar" al lado. En escritorio la frase de la búsqueda sigue completa.
- Pruebas: 1 ajustada y 1 nueva en `movimientos`; el E2E de la búsqueda a 390px mide el resumen nuevo.

### feat(agenda): MV2.30 Consultar tanda 2, la hoja de un día y el Calendario vacío · 2026-11-13

[ADR 134](DECISIONS/134-consultar-del-adulto-en-el-telefono.md) D5. Ficha: [`contexto/calendario.md`](contexto/calendario.md). SW v686. Tablero "rediseño3".

- **La hoja de un día**: "Mañana, sábado 14 de noviembre" (también hoy y ayer), "1 pago" en vez de "1 compromiso", la frecuencia en palabras ("Gasto fijo · cada mes") y, al pie, "Desde Por pagar lo marcas como pagado. Al volver, el día sigue abierto." En el teléfono "Ver en Por pagar" es un botón a lo ancho bajo su pago.
- **Sin nada con fecha** (ni pagos ni ingresos): el vacío ya no es "Noviembre está despejado" sobre un mes en blanco. En el teléfono el banner con Tino lleva dentro "Agregar un pago fijo", que abre el formulario de Por pagar de una vez (`comp-elegir-tipo-nuevo-ir`), y el mes no se dibuja. Con datos y un mes vacío sigue "está despejado" (ADR 111 D5).
- Pruebas: 6 ajustadas y 1 nueva en `agenda`; en `smoke`, el vacío de "está despejado" siembra un fijo inactivo y uno nuevo abre el gasto fijo desde el vacío.

### feat(agenda): MV2.30 Consultar tanda 1, la hoja Más y Calendario · 2026-11-13

[ADR 134](DECISIONS/134-consultar-del-adulto-en-el-telefono.md) D1 a D4. Fichas: [`contexto/calendario.md`](contexto/calendario.md). SW v685. Tablero "rediseño3".

- **La hoja Más**: cada destino con su estado debajo del nombre ("4 pagos esta semana") y una flecha a la derecha; los rótulos de grupo en frase. Sigue bajo el techo de 444 px (R83) con filas de 6 px de relleno; a 320 la flecha de Ajustes se calla para que su línea entre (ADR 108 D4).
- **Calendario arriba**: la tarjeta del mes dice entra y sale en una pastilla y, en el mes en curso, lo próximo en frase: "Lo próximo: Colegio, mañana. Tu siguiente ingreso llega el 1 de dic." (`fraseLoProximo()`); en otros meses sigue la frase de antes.
- **El mes**: la cabecera cuenta pagos ("7 pagos · 1 ingreso"); la leyenda dice "Sale un pago", "Entra un ingreso", "Vencido" y "Hoy", y todos los pagos van en el color de Por pagar. Lo que vence hoy ya no se marca vencido (como "Vence hoy" en Por pagar, ADR 132); en el teléfono el vencido va en rojo y las flechas del mes sueltas.
- **Lo del mes en listas** (bajo 1024px, mes en curso): "Vencido" en rojo, "Lo que falta este mes" y "Lo que entró", con su suma y una fila por pago (teja, monto, cuándo y qué es) que abre su día (`htmlListasMes()`).
- **Rotación forzada del CHANGELOG**: las entradas del 3 al 5 de noviembre pasan a [`changelog/2026-11.md`](changelog/2026-11.md).
- Pruebas: 12 ajustadas y 5 nuevas en `agenda`; E2E: la leyenda y la pastilla de `smoke` cambian de texto y uno nuevo a 390px abre un día desde las listas.

### feat(apartados): MV2.30 Ahorro tanda 5, la hoja "Nueva reserva"; cierra Ahorro · 2026-11-13

[ADR 133](DECISIONS/133-ahorro-del-adulto-en-el-telefono.md) D7. Ficha: [`contexto/apartados.md`](contexto/apartados.md). SW v684. El tablero "rediseño2" queda aplicado completo y su HTML se borró.

- **Preguntas en frase**: "¿Para qué pago te quieres preparar?" con "Toca uno para llenar el nombre, o escribe el tuyo."; "Nombre"; "(opcional)" en gris en la fecha y la nota.
- **Las otras plantillas** se abren desde un chip punteado "14 más" al final de la fila, en vez del enlace "Ver las otras 14 plantillas" (queda como su nombre accesible). En el teléfono las plantillas son píldoras en fila y el "COP" bajo el monto se va.
- **La frecuencia** son cuatro botones a la vista (el segmento de Familia, radios `frecuenciaAporte`), no una lista desplegable. La pista del aporte en vivo baja a la fecha ("Con fecha, Finko calcula cuánto separar en cada aporte.") y la nota sugiere "Ej.: la moto de Andrés".
- Pruebas: 4 ajustadas y 5 nuevas en `apartados`; un E2E a 390px llena el nombre con una plantilla, abre "14 más", elige "Quincenal" y crea la reserva.

### feat(inversiones): MV2.30 Ahorro tanda 4, Inversión y la hoja de una inversión · 2026-11-13

[ADR 133](DECISIONS/133-ahorro-del-adulto-en-el-telefono.md) D6. Ficha: [`contexto/inversion.md`](contexto/inversion.md). SW v683. Tablero "rediseño2".

- **Arriba, en el teléfono**: "Lo que pusiste a crecer" y el total, con la pastilla "Al vencer, el tiempo le suma $X".
- **La etapa** dice lo mismo que la tarjeta del momento (DIS.17) con una barra partida en vez de las dos columnas: con una inversión, lo que pusiste y lo que pone el tiempo (rayado) con sus montos; con varias, un tramo por tipo con su rasgo y su porcentaje. La inflación y "Lo que sigue" van al pie de la tarjeta.
- **El aviso del fondo** es una tarjeta con "Ir al fondo"; **cada inversión** es una fila (monto, tipo, tasa y vencimiento) que abre su hoja: lo que tendrías al vencer con su barra, tasa, plazo, de dónde salió el dinero, "Editar" y "Eliminar".
- **Registrar** va a un "+ Inversión" en el encabezado que solo existe en el teléfono: `shell.js` no sube a la barra de escritorio un primario con `data-solo-movil`, donde la acción sigue en la tarjeta del momento.
- **El vacío**: el botón vive dentro de la tarjeta del banner; con el fondo empezado y sin completar, "Antes de invertir, conviene tener tu fondo de emergencia completo" va en tarjeta aparte con "Ver mi fondo". Sin fondo, el primario sigue llevando al Fondo (ADR 086 D2).
- Pruebas: 1 ajustada y 9 nuevas en `inversiones`; dos E2E (390px y escritorio) recorren la fila, la hoja y el "+ Inversión" que no sube a la barra.

### feat(metas): MV2.30 Ahorro tanda 3, Metas y la hoja de una meta · 2026-11-13

[ADR 133](DECISIONS/133-ahorro-del-adulto-en-el-telefono.md) D5. Ficha: [`contexto/metas.md`](contexto/metas.md). SW v682. Tablero "rediseño2".

- **La lista en el teléfono**: la tarjeta de identidad primero (ADR 127 D5), ahora con el porcentaje junto a lo que falta ("42% · te faltan $X", los dos anchos); el aviso del fondo incompleto como tarjeta con "Ir al fondo" a la derecha; la pista "Toca + para aportar" y los grupos en frase ("Con plazo" con su orden debajo, "Sin plazo" con la invitación a ponerle fecha, "Cumplidas · N"), cada uno una tarjeta.
- **Cada meta es una fila** (`htmlFilaMeta()`): su silueta llena con lo reunido, lo reunido de su objetivo y la fecha, la barra y el plan ("Faltan 2 aportes de $945.000, uno al mes"), con un círculo "+" que abre el aporte. La cumplida dice "Cumplida" y no tiene círculo.
- **La hoja de una meta** (`htmlDetalleMeta()`, acción `meta-detalle`): la silueta grande, lo reunido con su porcentaje, la fecha, el plan y lo que falta, "Aportar", "Editar la meta" y "Eliminar esta meta". `formaSilueta()` e `iconoMeta()` pasan de privadas de `view.js` a `detalle.js`, que las comparte con la tarjeta.
- Pruebas: 10 nuevas en `metas`; un E2E a 390px abre la hoja, pasa a editar y aporta desde el círculo, y los dos de ADR 082 miden ahora las filas.

### feat(apartados): MV2.30 Ahorro tanda 2, Reservas y sus hojas · 2026-11-13

[ADR 133](DECISIONS/133-ahorro-del-adulto-en-el-telefono.md) D4. Ficha: [`contexto/apartados.md`](contexto/apartados.md). SW v681. Tablero "rediseño2".

- **La lista en el teléfono**: "Tienes reservado" y el total, una pastilla con cuántas vencen en 30 días y cuánto falta (dice lo del aviso de proximidad, que se calla bajo 1024px) y la pista de cómo se lee cada fila. Los grupos en frase, cada uno una tarjeta; "Vencen en 30 días" suma lo que falta. Sin el comparador: cada barra trae su rayita.
- **Cada reserva es una fila** (`htmlFilaReserva()`): su emoji, lo reunido de lo que necesita, la fecha ("10 de dic, en 27 días" hasta 60 días), la barra con la rayita de hoy y "Vas un aporte atrás"; el círculo de la derecha abre "Aportar" o, si está lista, la marca como usada.
- **La hoja de una reserva** (`htmlDetalleApartado()`, acción `reserva-detalle`): lo reunido contra lo que necesita, dónde deberías ir hoy, cuánto reponer, vence, el plan y lo que falta; "Se repite cada año" es un interruptor que cambia sin cerrar la hoja (apagarlo en una reserva ya reunida cierra la hoja antes de confirmar).
- **"Aportar"** (los dos anchos): lo reunido con su barra antes del monto, "¿Cuánto vas a aportar?" con el campo grande (`monto-hero`), "¿De qué cuenta sale?" y el botón con el monto escrito ("Aportar $90.000").
- **El vacío**: el botón vive dentro de la tarjeta del banner ("Crear mi primera reserva") y el "+ Reserva" del encabezado se va; la salida a Límites va al pie.
- Pruebas: 4 ajustadas y 14 nuevas en `apartados`; dos E2E a 390px recorren la fila, la hoja, el interruptor, "Aportar" y el vacío, y los dos de ADR 083 miden ahora las filas.

### feat(ahorro): MV2.30 Ahorro tanda 1, el encabezado de las cuatro lentes y el Fondo · 2026-11-13

[ADR 133](DECISIONS/133-ahorro-del-adulto-en-el-telefono.md) D1 a D3. Ficha: [`contexto/ahorro.md`](contexto/ahorro.md). SW v680. Tablero "rediseño2".

- **Para qué sirve cada lente** bajo su título ("Para pagos que ya sabes que llegan"), en los dos anchos: sin casa, la frase de cuándo se usa el dinero no decía para qué. El campo `cuando` de `MODALIDADES_AHORRO` pasa a `para`; la línea de propósito que abría la tarjeta del Fondo en escritorio sale, porque el subtítulo ya la dice.
- **El Fondo en el teléfono** (`_renderFondoTelefono()`): "Tu fondo te cubre 1 mes de 3" con una barra partida en los meses de la meta (`tramosCobertura()`, `cifraCobertura()`), la fecha hasta la que cubre, "Aportar al fondo" con el tinte (no sólido, ADR 049 D2) y "Ajustar", la nota del dinero que no se mueve en su caja, el compromiso como tarjeta con cuándo vuelve a empezar (`inicioPeriodoSiguiente()`) y los aportes en filas que abren su hoja con "Eliminar este aporte". Desde 1024px siguen la franja y la gota.
- **El Fondo vacío**: una sola pregunta (la del banner, con Tino) y la tarjeta pegada debajo con los tres niveles en tabla y "Empezar mi fondo" como primario; sin gastos fijos, la pista va al pie con "Ir a Por pagar". Cierra el hallazgo de GU.1a.
- **La tasa del mes** se dice como lo que es: "Este mes te queda el 79% de lo que recibes", según los gastos registrados hasta hoy.
- Pruebas: 5 ajustadas y 18 nuevas en `ahorro`; los dos E2E del Fondo a 390px miden la tarjeta del compromiso y abren la hoja de un aporte.

### feat(compromisos): MV2.30 Gastos tanda 5, la hoja del plan de salida; cierra Gastos · 2026-11-06

[ADR 132](DECISIONS/132-gastos-del-adulto-en-el-telefono.md) D10. Ficha: [`contexto/deudas.md`](contexto/deudas.md). SW v679. El tablero "rediseño1" queda aplicado completo y su HTML se borró.

- **El resultado primero**: "Con tus cuotas de hoy, sales de deudas en 15 meses y pagas $X en intereses", con Tino pensando en la cabeza.
- **¿Por cuál empiezas?**: Bola de nieve y Avalancha como dos pestañas, la recomendada primero y marcada; qué hace cada una, qué cuesta frente a la otra y el orden en que se terminan las deudas.
- **Pago extra**: "Si pagas un poco más cada mes" con el efecto al escribir (`resultadoExtra()`, repintado sin perder el foco) y "Aplicar $X más al mes". Si las cuotas no alcanzan para los intereses, el aviso va primero con lo que crece cada deuda y "Lo mínimo para salir" trae el monto escrito.
- **Otras opciones** (renegociar, juntar) como filas que abren su herramienta en su sitio. Solo en el teléfono: desde 1024px sigue la tarjeta del simulador.
- Pruebas: 7 nuevas en `compromisos`; el E2E de la hoja cambia de pestaña, escribe el extra y abre una opción.

### feat(gastos): MV2.30 Gastos tanda 4, la hoja "Nuevo gasto" · 2026-11-06

[ADR 132](DECISIONS/132-gastos-del-adulto-en-el-telefono.md) D9. Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v678. Tablero "rediseño1".

- **Preguntas en frase**: "¿Cuánto gastaste?", "¿En qué?", "¿De qué cuenta sale?" y "¿Cuándo?"; se va el "COP" bajo el monto y la nota sugiere "Ej.: almuerzo con el equipo".
- **Monto a la izquierda** en todas las hojas con monto del teléfono (acota el `.monto-hero` del ADR 042 a escritorio): el tablero lo dibuja igual en "Nuevo límite", "Aportar" y "Me pagaron".
- **Cuenta plegada**: con una ya elegida y otra para elegir, el selector compartido muestra solo la elegida ("Tienes $X") y "Cambiar"; elegir otra lo vuelve a plegar. La acción `cuenta-sel-cambiar` es built-in porque el selector es de infra.
- Pruebas: 1 ajustada y 3 nuevas en `gastos`; un E2E en el teléfono abre la hoja, cambia de cuenta y la ve plegarse.

### feat(presupuesto): MV2.30 Gastos tanda 3, Límites y las hojas de un límite · 2026-11-06

[ADR 132](DECISIONS/132-gastos-del-adulto-en-el-telefono.md) D8. Ficha: [`contexto/limites.md`](contexto/limites.md). SW v677. Tablero "rediseño1".

- **Tarjeta del plan** (los dos anchos): Estilo de vida primero, cada grupo dice dónde se mide ("Se mide en Por pagar" es la salida) y el aviso del grupo va dentro, no suelto arriba.
- **Topes en el teléfono**: una tarjeta con una fila por tope (lo gastado, la barra, "Pasó por" o "Quedan" y el porcentaje de su tope), sin botones. La fila abre su hoja (`presupuesto/detalle.js`): lo gastado de su tope, el aviso, sus gastos del mes, "Cambiar el límite" y "Quitar este límite". El de gastos pequeños es una fila más con su hoja. Desde 1024px siguen los sobres.
- **Resumen**: "Tus límites suman $X. Se pasaron N de M."; el aviso de que el plan no alcanza va aparte. La introducción queda solo en el vacío.
- **Nuevo límite**: la grilla de tres columnas y la pista "En noviembre llevas $X en Ropa.", con el origen de la cifra propuesta cuando no es esa.
- Pruebas: 8 ajustadas y 7 nuevas en `presupuesto`; en E2E, el orden del plan y un recorrido de la lente en el teléfono.

### feat(compromisos): MV2.30 Gastos tanda 2, Por pagar y la hoja de una deuda · 2026-11-06

[ADR 132](DECISIONS/132-gastos-del-adulto-en-el-telefono.md) D7. Ficha: [`contexto/deudas.md`](contexto/deudas.md). SW v676. Tablero "rediseño1".

- **Fila**: el nombre con su monto al lado y, a la derecha, un círculo que marca el pago (rojo vencido, ámbar hoy o mañana, neutro el resto; lleno y verde si ya se pagó). Se van el botón de texto por fila, las acciones escondidas y las notas que leía la hoja genérica.
- **Grupos**: "Vencidos" en rojo con "Del más antiguo al más reciente" debajo, sin mayúsculas sostenidas. "Vence hoy" pasa a ámbar: todavía no venció. Arriba, "Toca el círculo cuando pagues algo" solo si hay algo por marcar.
- **Hoja de un pago** (`views/detalle.js`, acción `compromiso-detalle`): la cuota del mes y cuándo vence, cuánto falta, la tasa y el día de pago; "Abonar" o "Marcar pagado", "Editar" y "Eliminar" (o "Archivar" si quedó en cero). Se arma con el compromiso, no copiando la fila.
- Filtros en el color de la sección y "Ver plan" a todo el ancho. Pruebas: 8 de la fila reescritas y 6 nuevas de la hoja en `compromisos`; el E2E de Por pagar toca el círculo y abre la hoja.

---

## Meses anteriores

- [2026-11, del 3 al 5](changelog/2026-11.md) (rotación forzada el 2026-11-13: el mes pasó el techo de 60 KB)
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
