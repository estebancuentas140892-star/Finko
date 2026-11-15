# Changelog - Finko Claude

> Revisado: 2026-11-15.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-11)

### feat(gastos): SUS.1b, el chip "Gastos hormiga" sale del formulario · 2026-11-15

[ADR 146](DECISIONS/146-finko-reconoce-el-tipo-de-gasto.md) D5. Fichas: [`contexto/gastos.md`](contexto/gastos.md), [`contexto/limites.md`](contexto/limites.md). SW v720.

- **Hormiga ya no se declara**: el formulario de gasto (escritorio y teléfono) deja de ofrecer la categoría. Un café de $6.500 cuenta como gasto pequeño en su propia categoría, por monto (`infra/hormiga.js`).
- **Lo guardado no se pierde**: la categoría sigue en `CATEGORIAS_GASTO`, así que los gastos viejos conservan su ícono y sus topes se siguen mostrando. Mismo tratamiento que Vivienda en CAT.1a.
- **Límites explica en vez de pedir un tope imposible**: un gasto viejo en "Gastos hormiga" sale en "Gastas acá y no tiene tope" con "Se controla en Gastos pequeños".
- Pruebas: `constants` (1 ajustada), `gastos` (1 nueva), `presupuesto` (2 nuevas). Unitarias 5737/5737, E2E 477/477.

### feat(compromisos): SUS.1a, la plataforma de cada suscripción · 2026-11-15

[ADR 146](DECISIONS/146-finko-reconoce-el-tipo-de-gasto.md) (ejecuta las fases 0 y 1 del [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md) con la forma del [ADR 064](DECISIONS/064-estructura-de-dos-niveles.md)). Ficha: [`contexto/deudas.md`](contexto/deudas.md). Schema v51, SW v719.

- **El catálogo por fin tiene tags** (`MARCAS[].categorias`) y cada categoría de fijo dice cuáles ofrece (`TAGS_CATEGORIA_AGENDA`): Streaming une video y música; Suscripciones, IA, nube, juegos, educación y domicilios; Telefonía e Internet, los operadores. `iCloud` y `Google` estrenan el tag `nube`.
- **Seis plataformas nuevas con iniciales** hasta tener su vector: Paramount+, Apple TV+, Apple Music, YouTube Music, Amazon Music y Deezer. Las compuestas van antes que su genérica: "YouTube Music" ya no resuelve a YouTube.
- **El nombre de cada marca resuelve a sí misma** (test que recorre el catálogo): por eso el fijo con plataforma se llama "Netflix" y Calendario, Por pagar y Distribuir pintan su logo sin tocarlos.
- **Al editar un fijo de antes**, el selector propone la plataforma que su nombre o su nota ya mencionan; se guarda solo si el usuario guarda. La migración v51 no inventa `marcaId`.
- **En el teléfono**, elegir una categoría con plataformas baja la hoja hasta el selector, y el resumen dice "Streaming · Netflix" (`data-resumen-valor`).
- **Rotación forzada**: las cuatro tandas de Consultar del 13 pasan a [`changelog/2026-11.md`](changelog/2026-11.md).
- Pruebas: `marcas` (11 nuevas), `compromisos` (11 nuevas), `storage` (2 nuevas), E2E `smoke` (1 nueva: elegir Netflix, verlo en el Calendario y reabrirlo elegido). Unitarias 5734/5734, E2E 477/477.

### feat(nino): APR.5b, la ronda 2 de Tino y los hitos del niño · 2026-11-15

Nota del [ADR 095](DECISIONS/095-tino-en-el-sprite.md) (la ronda 2 por el conversor) y [ADR 094](DECISIONS/094-tino-el-guatin.md). Ficha: [`contexto/nino.md`](contexto/nino.md). SW v718.

- **Cuatro poses al sprite** (`assets/svg/ilustraciones/`, `scripts/sync-sprite.py`): pensando, reserva, sembrar y compartir, de 7 a 15 KB cada una. El conversor ganó soporte de `polygon`, cuatro roles de color (`--fk-tino-verde`, `-hoja`, `-celeste`, `-gris`, en `themes.css`) y el encaje por ancho de las poses anchas.
- **Cada unidad explica con su pose** (`poseTinoDeUnidad()`): "Lo que necesito y lo que quiero" piensa, "Compartir y ayudar" comparte, "Guardar para lo que no esperas" se cubre de la lluvia y "¿Por qué crece mi dinero?" siembra. En la lección y en la ruta.
- **Tino piensa** con las tres preguntas de ubicación y **siembra** en el premio por ahorrar.
- **Dos hitos con destellos**: la meta lograda y la ruta terminada ("Terminaste tu ruta", con "Ver mi ruta") celebran en grande.
- **"Meta cumplida" no entra al sprite**: no baja de 18,8 KB sin deformarse y el tope es 16. El adulto la sigue usando como imagen.
- Pruebas: `nino` (3 nuevas y 1 ajustada: la meta lograda celebra en grande), `nino-visual` (2 nuevas y 1 ajustada: la lista de poses). Unitarias 5710/5710, E2E 476/476 (la intermitente de `nube.test.js` pasó en su reintento).

### feat(ahorro): HF.1c, la fecha de cada aporte a metas y reservas · 2026-11-15

[ADR 145](DECISIONS/145-los-aportes-de-metas-y-reservas-tienen-fecha.md) (aplica la R-HF2 del 091 a la última ruta sin fila y resuelve V5 del 083). Fichas: [`contexto/metas.md`](contexto/metas.md), [`contexto/apartados.md`](contexto/apartados.md), [`contexto/movimientos.md`](contexto/movimientos.md). Schema v50, SW v717.

- **`aportes[]` en metas y reservas** (`{ id, fecha, monto, cuentaId, origen? }`): una fila por cuenta del reparto; sin cuentas, una sin cuenta; lo de Distribuir lleva la cuenta de origen y `origen: 'distribucion'` (`filasDeAporte()`, `infra/crud.js`).
- **Migración v49 a v50 idempotente**: pone `aportes: []` y conserva los válidos. No inventa filas: lo que ya había es saldo de apertura (I4 del 091).
- **Movimientos gana dos fuentes**: "Aporte a {nombre}", neutras como la transferencia, con su cuenta; `efectoEnCuenta()` las resta, así el saldo de cada cuenta vuelve a ser apertura más filas. Chip de filtro "Metas".
- **"Ya lo usé" registra el gasto** (V5): lo liberado queda en "Otros" con el nombre de la reserva, `apartadoId` y `sinEfectoSaldo` (ese dinero salió al aportarlo). El diálogo lo avisa; la categoría se cambia en Gastos.
- Fuera: borrar o editar un aporte, el dinero de una meta o reserva borrada, elegir la categoría en el diálogo.
- Pruebas: `aportes-bolsas` (15 nuevas: filas, fuentes, efecto en cuenta, gasto de la reserva, migración y R-HF2 con los manejadores reales). Unitarias 5705/5705, E2E 476/476 (la intermitente de `nube.test.js` falló bajo carga y pasó aislada dos veces).

### docs(contexto): cuatro fichas vuelven bajo su techo de 40 KB · 2026-11-15

Regla de la skill `cerrar-tarea` (sección 4): superar el techo obliga a podar o a partir por eje real.

- **`inicio.md` (55 KB a 39 KB)**: los bloques de escritorio (IN.9 y DSK.1, con sus trampas y riesgos) se mudan sin cambios a [`contexto/escritorio.md`](contexto/escritorio.md), sección "Inicio en escritorio": ese es su eje. Inicio deja un puntero.
- **`inicio.md`, `deudas.md`, `sistema-visual.md` y `gastos.md`**: los hitos más viejos de "Cambios realizados" (julio y agosto) se resumen en una línea por bloque, con sus IDs y el enlace al mes de [`changelog/`](changelog/) donde está el detalle. No se borra nada que no esté en el CHANGELOG.

### docs(decisiones): BUG-027, el ADR 059 se reconstruye · 2026-11-15

Cierra **BUG-027**: el [ADR 059](DECISIONS/059-interfaz-de-escritorio.md) (interfaz de escritorio, iniciativa INT.1) se citaba como aceptado desde el 2026-08-02 y nunca se había commiteado. Ficha: [`contexto/escritorio.md`](contexto/escritorio.md).

- **Reconstruido desde los cierres de INT.1a a INT.1h** (`changelog/2026-08.md`), la ficha de escritorio y las citas "ADR 059 Dn" del código. Conserva número y fecha de aceptación: el código lo cita en siete archivos y un ADR nuevo las dejaría apuntando a nada.
- **No inventa decisiones**: dice qué no se pudo recuperar. D1, D2 y D5 se citan siempre juntos y no se sabe cómo se repartían entre las piezas de la barra; D4 no lo cita nadie por número y se infiere (los atajos de INT.1h son la única rebanada sin decisión).
- **Enlaces reparados**: el ADR 084 apuntaba a un archivo que nunca existió; el 065 y el 076 lo citaban sin enlace. `BUGS.md` queda sin errores abiertos.

### feat(cuentas): HF.2a, la cuenta habitual de cada pago · 2026-11-15

R-HF5 del [ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md): se deriva, no se pide. Fichas: [`contexto/calendario.md`](contexto/calendario.md), [`contexto/deudas.md`](contexto/deudas.md). SW v716.

- **`cuentaHabitualDe()`** (`infra/cuenta-helper.js`): la cuenta del último pago del compromiso, sin campo nuevo. A igual fecha, la de mayor monto (un pago repartido); una compra con la tarjeta no cuenta (BUG-037); si esa cuenta ya no está activa, no adivina con un pago más viejo.
- **"Marcar pagado"** del gasto fijo y **el abono** a una deuda abren en esa cuenta aunque otra tenga más saldo. **El lote** también, si todos sus pagos comparten la misma.
- Sin pagos previos, todo queda como antes: la cuenta de mayor saldo.
- Pruebas: `cuenta-helper` (8 nuevas: la derivación y el selector), `compromisos` (2: el segundo abono abre con la cuenta del primero). Unitarias 5690/5690, E2E 476/476 (la intermitente de `nube.test.js` falló una vez y pasó aislada).

### feat(avisos): HF.2b, el débito automático sin saldo se avisa antes · 2026-11-15

Nota del [ADR 052](DECISIONS/052-pagos-automaticos.md) (resuelve PA.1c) y acotación del D2 del [ADR 099](DECISIONS/099-inicio-movil-hoy-en-una-lista.md). Fichas: [`contexto/calendario.md`](contexto/calendario.md), [`contexto/transversal.md`](contexto/transversal.md). SW v715.

- **Aviso `debito-sin-saldo`**: un débito automático de hoy a tres días cuya cuenta no alcanza. Severidad `alta` (interrumpe con la notificación activada), sección `compromisos`. Reemplaza al "vence en N días" del mismo pago.
- **El saldo se consume en cascada**: primero lo vencido sin registrar, después lo próximo por fecha. La cascada de la hoja "Pagos automáticos" pasa a `resolverDebitosContraCuentas()` (`agenda/logic.js`) y la usan los dos.
- **Estados derivados** (`estadosDebitosAutomaticos()`): `esperado`, `sin-saldo`, `sin-cuenta`, `registrado`. No se guardan.
- **"Atención hoy"** lo muestra aunque la fecha sea futura, en su propia fila: "Nequi no alcanza para Netflix · Se debita en 3 días · faltan $25.000", con "Ver tus cuentas". En escritorio va en el panel de avisos con su rótulo ámbar. La notificación: "Nequi no alcanza para Netflix, que se debita en 3 días".
- Fuera: el aviso del débito sin cuenta y el estado en el Calendario.
- Pruebas: `agenda` (17 nuevas), `avisos` (11), `atencion-hoy` (4), `notificaciones` (2). Unitarias 5680/5680, E2E 476/476.

### perf(arranque): PERF.16, el arranque bajo 400 ms y entrar a Fondo · 2026-11-15

Cifras y método en [`scripts/perf/BASELINE.md`](../scripts/perf/BASELINE.md) (sección PERF.16). Ficha: [`contexto/transversal.md`](contexto/transversal.md). SW v714.

- **Un overlay cerrado y sin abrir nunca no se maqueta por dentro** (`content-visibility: hidden`): los 40 con sus formularios eran ~310 ms del arranque. `despertarOverlay()` lo devuelve al render antes de abrirlo y conserva la animación. El arranque baja de 675 a 350 ms bloqueados a 4x.
- **Registrar, "Más" y el formulario de gasto se despiertan en idle**: su primera apertura no paga nada.
- **Los aportes de Fondo fuera de pantalla no se estilizan** (`content-visibility: auto`): el tab Ahorro baja de 359 a 194 ms de respuesta.
- **Lighthouse en producción da 100 en las cuatro**: el 91 de MV2.28 era la conexión en frío de la primera corrida. `lighthouse.js` audita `127.0.0.1`.
- Queda en el borde el formulario de gasto (INP entre 160 y 192 ms a 4x), sin tocar.
- Rotación forzada: las cinco tandas de Ahorro del 13 pasan a [`changelog/2026-11.md`](changelog/2026-11.md).
- Pruebas: `modales` (5 nuevas). Unitarias 5646/5646, E2E 476/476.

### perf(fluidez): MV2.28, medir lo publicado y devolver el cambio de sección · 2026-11-15

Cifras y método en [`scripts/perf/BASELINE.md`](../scripts/perf/BASELINE.md) (sección MV2.28). Ficha: [`contexto/transversal.md`](contexto/transversal.md). SW v713.

- **Se midió producción** contra el commit de PERF.12 en la misma máquina: `fluidez.js --url` y `lighthouse.js` con dirección. El instrumento se colgaba con el tab Ahorro (hoy abre Fondo): ya no, y cada interacción tiene tope.
- **Cambiar de sección reestilizaba toda la página** (2.295 elementos en vez de 260): `html:has(.section.active .bloque-tabs)` le cambiaba el estilo a la raíz al navegar. El `scroll-padding-top` queda fijo en móvil. Entrar a Gastos baja de 274 a 189 ms de respuesta a 4x; a Inicio, de 193 a 109.
- **Abrir "Más" ya no recorre el historial en el toque**: el último movimiento y la salud van memoizados y se precalientan en idle (INP 104 a 72 ms).
- **El arranque no lee layout a mitad del script**: `initTeclado()` y el color de la barra esperan un cuadro.
- **Lo que sigue sobre su umbral va a PERF.16**: el arranque (675 ms bloqueados en local y 918 en producción, contra 400), entrar a Fondo y el Speed Index de Lighthouse (Performance 91 en producción; las otras tres en 100).
- Pruebas: `menu-mas` (4 nuevas), `teclado` (1 nueva). Unitarias 5641/5641, E2E 476/476.

### feat(avisos): HF.3e, lo que Finko muestra fuera de la app · 2026-11-15

[ADR 144](DECISIONS/144-lo-que-finko-muestra-fuera-de-la-app.md) (acota los ADR 063 y 066, cierra el diferido del ADR 040) y su resolución en implementación. Ficha: [`contexto/transversal.md`](contexto/transversal.md). SW v712.

- **Con candado, la notificación no dice qué ni cuánto**: "Tienes 2 avisos en Finko · Ábrela para verlos", sin nombre, cifra ni emoji. Con el ojo puesto y sin candado nombra el aviso sin la cifra (`formatearAvisoSistema(aviso, total, { candado, oculto })`).
- **El número del ícono** (`navigator.setAppBadge`) cuenta los avisos `urgente` y `alta` de las secciones encendidas, solo con los recordatorios activados; se limpia en cero. Se recalcula al abrir, en `state:change` y `state:save` (una vez por cuadro) y al volver a la app. Notificación y número leen la misma lista (`avisosQueNotifican()`).
- **Tocar la notificación abre la sección del aviso** (`data.url` y `notificationclick` en el SW): enfoca la app abierta y cambia el hash, o la abre ahí. No hay ruta por elemento.
- **Cuatro accesos directos** en `manifest.json`: Hoy, Por pagar, Registrar gasto y Registrar ingreso. `?accion=` es lista cerrada (`ui/accion-arranque.js`), se borra de la dirección al leerla y se ejecuta tras el candado y la aceptación legal, antes de novedades y débitos.
- **El SW sirve el shell de `/` a una navegación con query**: guardar `/?accion=...` aparte lo habría dejado viejo tras el traspaso de `activate`.
- El nav no lleva número: dentro de la app Inicio ya abre en "Atención hoy" (nota del ADR 040 en el tablero).
- Rotación forzada: las entradas del 6 de noviembre pasan a [`changelog/2026-11.md`](changelog/2026-11.md).
- Pruebas: `fuera-de-la-app` (20 nuevas: el copy con candado y ojo, `verificarYNotificar` con `data.url`, el número con sus casos, la ruta por sección, el SW con su `notificationclick` y la navegación con query, el manifiesto y `?accion=`); E2E `accesos-directos` (4 nuevas, una con el PIN antes del formulario). Unitarias 5636/5636, E2E 476/476.

### feat(movimientos): REV.3a, descargar el mes para Excel · 2026-11-15

[ADR 138](DECISIONS/138-la-poda-del-tablero-del-13-de-noviembre.md) D3 y su resolución en implementación. Fichas: [`contexto/movimientos.md`](contexto/movimientos.md), [`contexto/configuracion.md`](contexto/configuracion.md). SW v711.

- **Cada divisor de mes trae su botón de descarga**: `finko-movimientos-YYYY-MM.csv` con Fecha, Descripción, Categoría, Cuenta, Entrada y Salida, de la más vieja a la más reciente. Separador `;` y BOM UTF-8: así Excel en español lo abre en columnas y con tildes.
- **Baja lo que la lista muestra de ese mes, filtros incluidos** (`movimientosVisibles()`, que ahora usa también el render). Entrada menos Salida da el neto del divisor: lo `neutro` (transferencia, aporte al fondo) va con su monto en la descripción, no en las columnas.
- **Ajustes conserva su CSV, renombrado** a "Exportar gastos en CSV · Para volver a importarlos": el formato del mes no se reimporta. La descarga de los dos vive en `infra/csv.js` `descargarCSV()`.
- El botón mide 40 px en escritorio y 44 en el teléfono: `.btn-icon.btn-sm` lo bajaba a 32 de ancho, y la regla lleva `.btn-icon` en el selector.
- Pruebas: `movimientos-excel` (10 nuevas: columnas, orden, mes, transferencia, el neto contra `sumaDeMovimientos`, BOM y comillas, relectura con `parsearCSV`, el botón por mes y la descarga con un filtro puesto); `config` (1 ajustada: el texto de la fila). Unitarias 5616/5616, E2E 472/472 (en el puerto 8091: el 8081 de esta máquina quedó con sockets que escuchan sin proceso y cuelgan peticiones al azar).

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

## Meses anteriores

- [2026-11, del 3 al 6, Ahorro y Consultar del 13](changelog/2026-11.md) (rotación forzada el 2026-11-13 y el 2026-11-15: el mes pasó el techo de 60 KB)
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
