# Changelog - Finko Claude

> Revisado: 2026-10-30.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-10)

### feat(movil): MV2.19, Distribuir sin salir de donde estás · 2026-10-30

[ADR 110](DECISIONS/110-distribuir-sin-salir-de-donde-estas.md) (cambia bajo 1024px el ADR 021 y CAL.1; acota el ADR 061; respeta los ADR 018, 035 D6 y 080); ficha [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md). Dos commits, MV2.19a y MV2.19b-c. Ningún cálculo cambia. SW v641 y v642.

- **Se abre donde estás** (a): bajo 1024px `distribuir:abrir` ya no navega a Mis cuentas; cerrar te deja en Inicio, Calendario o Límites. Escritorio sigue navegando.
- **Pie pegado** (a): el resumen y los botones forman `.distribuir__pie`, pegado al borde de la hoja con la receta del ADR 098 D8. A 390, "Siguiente" pasaba de 976px en una hoja de 699; cambiar de paso lleva el paso nuevo a la vista.
- **El pie dice qué falta** (a, todos los anchos): la pregunta de lo que queda abre el último paso, y ahí un "Distribuir" apagado dice por qué (`motivoSinDistribuir()`, lógica pura: monto, cuenta, ingresos, lo movido, nada marcado o lo que queda).
- **Qué se reparte, arriba** (b): monto, ingresos y cuenta en una fila con un "Cambiar"; sin cuenta guardada y con varias, la pregunta abre desplegada y bloquea hasta responderla, en vez de la hoja "¿Desde qué cuenta?" al final. `_cuentaOrigenDistribucion()` lee primero lo elegido. El asistente se pinta según el ancho al abrirse (`_enMovil()` en la vista).
- **Cada paso, lo suyo** (b): la comparación con los expertos va compacta dentro del paso 1; el porqué, los métodos y "Personalizar", en "Cómo lo calculamos" (un `details` que sigue abierto al elegir un método). La leyenda del panel queda solo para el lector de pantalla. El paso 1 empieza a 357px en vez de 789.
- **La hoja dice qué quedó** (c): confirmar pinta `htmlResultadoDistribucion()` con pagos, aportes, lo movido, lo del día a día y el saldo antes y después, con "Deshacer" y "Listo". Un `MutationObserver` deja el aviso de siempre al cerrarla por donde sea; deshacer desde la hoja la cierra sin aviso.
- Pruebas: 16 unitarias en `distribuir-movil.test.js`; 3 E2E en `movil-mv2.test.js` (dos móviles y uno de escritorio). Unitarios 5199/5199, E2E 381/381 (`--workers=2`).

### feat(movil): MV2.9, Mis cuentas en filas con hoja · 2026-10-30

[ADR 109](DECISIONS/109-mis-cuentas-en-filas-con-hoja.md) (extiende el ADR 098 D4 y R92; respeta el ADR 080 y R53); fichas [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md) y [`contexto/sistema-visual.md`](contexto/sistema-visual.md). Solo móvil. SW v640.

- **Cuentas, tarjetas de crédito, fuentes fijas e ingresos puntuales** son filas de 64px que abren la hoja de detalle de Gastos y Movimientos; eliminar va aparte en la hoja. A 390, Mis cuentas baja de 2.207 a 1.616 px y de ocho papeleras a la vista a ninguna.
- **`datosDeFila()` lee las dos anatomías** (`.list-item` y `.cuenta-card`) y lleva como notas lo que la fila calla: chips de la cuenta, día de pago de la fuente, lo usado de la tarjeta. El texto de cada acción sale del texto visible del botón o, si es un ícono, de su nombre accesible hasta los dos puntos; los de Mis cuentas pasan a esa forma.
- **El ingreso puntual gana "Ver en Movimientos" en la hoja**: un botón `.list-item__solo-hoja` que la fila guarda sin mostrarlo en ningún ancho.
- **Fijos y puntuales se leen como una lista** aunque vivan en dos contenedores; la regla que cierra la última fila no anida `:has()`, que invalida el selector entero.
- Pruebas: 7 unitarias en `detalle-fila.test.js` (dos de `tesoreria.test.js` buscan la salida por su clase); 2 E2E en `movil-mv2.test.js` (móvil y escritorio). Unitarios 5183/5183, E2E 378/378 (`--workers=2`).

### feat(movil): MV2.21, "Más" dice cómo está cada destino · 2026-10-29

[ADR 108](DECISIONS/108-mas-dice-como-esta-cada-destino.md) (cumple R74; respeta el ADR 069 D6 y R83); ficha [`contexto/sistema-visual.md`](contexto/sistema-visual.md). Solo móvil. SW v639.

- **Una línea por destino** con la cifra que su sección ya calcula: Calendario (pagos de hoy a 7 días, sin lo ya pagado), Movimientos (el último, con "Hoy", "Ayer" o su fecha), Análisis (la salud y su banda; ámbar solo si es crítica), Mis cuentas (total y cuántas activas) y Me deben (lo que falta cobrar). Sin datos no hay línea; el ojo enmascara los montos y el nombre accesible de la fila incluye la línea.
- **Se calcula al abrir**: un listener en captura escribe las líneas antes de que el delegado de modales muestre la hoja; nada se recalcula en cada repintado.
- **Me deben usa `calcularResumen().totalPendiente`**, el total del hero de su sección, y no `calcularTotalPorCobrar`, que solo cuenta los préstamos que salieron de una cuenta.
- **Lista en vez de rejilla**: una fila de 48 px por destino; la hoja mide 435 px a 320, 390 y 430 (techo 444, R83), sin cortar ninguna línea.
- Pruebas: 10 unitarias en `tests/unit/menu-mas.test.js`. Unitarios 5176/5176, E2E 376/376 (`--workers=2`).

### feat(app): MV2.13, un vacío, un mensaje · 2026-10-29

[ADR 107](DECISIONS/107-el-peso-de-cada-cosa.md) D5 (cierra la fase 11; cambia el ADR 016 D1 y D3); ficha [`contexto/sistema-visual.md`](contexto/sistema-visual.md). Todos los anchos. SW v638.

- **El propósito es el título y el cuerpo del vacío**: `partirProposito()` separa la pregunta con que abre cada texto (título) del resto (cuerpo), sin cambiar una palabra del copy aprobado; un test reconstruye los 11 textos. El banner pierde su caja y su filete.
- **El vacío calla su propio mensaje** por CSS (`:has`), sin depender del orden de pintado de cada dominio: quedan su botón y su línea hermana.
- **Un solo botón**: en Me deben el del vacío pasa a primario, y el "+ Préstamo" del encabezado se oculta mientras se ve (R51). Medido a 390: el vacío pasa de 596 px en dos bloques a 209 en uno.
- **Metas**: la línea hermana lleva a Reservas en vez de al Fondo, que ya está en la barra de modalidades.
- Pruebas: V-7 cambia de sentido (el botón del vacío es el primario); el E2E de R85 sigue a Reservas; 3 unitarias del corte y un E2E móvil del vacío de Me deben.

### feat(app): MV2.18, avisos sin filete y explicaciones sin caja · 2026-10-29

[ADR 107](DECISIONS/107-el-peso-de-cada-cosa.md) D4 (segunda de tres rebanadas de la fase 11; cumple R41, R49, R55 y R75). Todos los anchos. SW v637.

- **Los avisos pierden el filete lateral**: el ícono del nivel va en una caja tintada de 36 px (`--nudge-tono`) y el título, en el color del texto. Solo riesgo y atención llevan fondo de color; información y logro van sobre la superficie.
- **Explicar una cifra no es avisar**: el veredicto del Fondo y el de Reservas, la nota de Inversión y la razón de la estrategia de Por pagar pasan a texto corrido bajo su cifra. En Mis cuentas, las tres cajas ámbar de la propuesta de distribución pasan a una lista bajo "Por qué esta propuesta".
- **Ajustes**: el aviso de notificaciones bloqueadas conserva su fondo de atención sin filete, y "Borrar todo" pasa a una tarjeta sobre la superficie con borde de peligro. El consejo de un vacío queda en una línea, sin caja.
- **R55**: el aviso de deudas sin actividad usa `role="status"` cuando es de atención y `role="alert"` solo cuando es de riesgo.
- Quedan con filete, a propósito: los toasts, el importador y la calculadora, que no son avisos de la app. El banner de propósito es de la rebanada de vacíos.
- Pruebas: la unitaria de las razones de Distribuir cambia de sentido (lista con título, sin ícono de alerta).

### feat(app): MV2.16, mover dinero viste su sección · 2026-10-29

[ADR 107](DECISIONS/107-el-peso-de-cada-cosa.md) D1 a D3 (primera de tres rebanadas de la fase 11; toma R8 para toda la app y respeta el ADR 049 D2); ficha [`contexto/sistema-visual.md`](contexto/sistema-visual.md). Todos los anchos: el color de un botón no depende del ancho. SW v636.

- **`.btn-dominio` + `data-dom`**: tinte del 12 %, borde del 40 % y texto del dominio, en claro y oscuro. Los colores van en `[data-dom]` para ganarle a la clase de maquetación con la que convive sin depender del orden de los archivos.
- **Lo que antes era gris o verde lleno**: "Aportar al fondo" en Fondo (antes "Registrar un aporte"; sigue secundario y del ancho de Editar, por el ADR 049 D2) y en la casa de Ahorro, "Me pagaron" en Me deben, "Pagar los N" en Por pagar (frambuesa, ya no el índigo de Calendario), "Transferir entre cuentas" y "Distribuir mi ingreso" en Mis cuentas.
- **El "+" es de crear**: "+ Aportar" pasa a "Aportar" en Metas y Reservas (con el monto cuando se sabe), y "+ Aportar al fondo" a "Aportar al fondo".
- Pruebas: 3 expectativas cambian (el "+" y la clase de "Me pagaron"); una unitaria nueva para el Fondo y una aserción para transferir.

### feat(movil): MV2.8c, volver solo en el nivel 3 · 2026-10-29

[ADR 106](DECISIONS/106-un-encabezado-tres-niveles.md) D6 (cierra MV2.8; cambia el "‹ Inicio" fijo de TX.8b en el teléfono); ficha [`contexto/movimientos.md`](contexto/movimientos.md). Solo bajo 1024 px. SW v635.

- **Movimientos desde "Más" ya no dice "‹ Inicio"**: era el enlace fijo de TX.8b, pensado para la PWA sin barra; en el teléfono la barra inferior siempre está. Llegando desde el contenido, el volver contextual (ADR 098 D1) sigue diciendo el origen real ("‹ Gastos"). Escritorio no cambia.
- Pruebas: un E2E móvil abre Movimientos desde "Más" y no encuentra ningún volver.

### feat(movil): MV2.8b, el ojo en el encabezado · 2026-10-29

[ADR 106](DECISIONS/106-un-encabezado-tres-niveles.md) D3 (segunda de tres rebanadas; cambia en el teléfono el ADR 034 D2 y D3). Solo bajo 1024 px. SW v634.

- **Un solo lugar para el ojo (R20)**: a la derecha de la fila del título, antes de crear, en Inicio (junto a la lupa), Ahorro, Fondo, Reservas, Metas, Inversión, Mis cuentas, Me deben, Calendario, Movimientos y Análisis. Ajustes no lleva: no tiene montos. Usa la acción y la sincronización del ojo del bloque Gastos (`bloque-saldo-visibilidad` + `renderAll`).
- **Los ojos de los heroes se callan en el teléfono** (Inicio, Mis cuentas, Calendario y el del medio de Análisis); en escritorio siguen mandando. El hero de Inicio pasa a la izquierda, ahora que el ojo no ocupa su esquina.
- **Movimientos e Inversión enmascaran**: no respetaban `S.config.ocultarSaldo`; ahora el monto de cada fila, el 4x1000 y el nombre accesible de la fila, y los montos del momento y de cada inversión.
- Pruebas: dos unitarias de máscara (Movimientos, Inversión); un E2E móvil con el ojo en las diez pantallas; dos E2E de Inicio en el teléfono pasan del ojo del hero al del encabezado.

### feat(movil): MV2.8a, la fila del título y crear tonal · 2026-10-29

[ADR 106](DECISIONS/106-un-encabezado-tres-niveles.md) D1, D2 y D4 (primera de tres rebanadas de MV2.8); ficha [`contexto/sistema-visual.md`](contexto/sistema-visual.md). Solo bajo 1024 px. SW v633.

- **Una fila para título y acciones**: teja, título y crear a la derecha, al menos 52 px; la frase de la sección ("Dónde está tu dinero y de dónde viene", "Cuándo entra y cuándo sale") baja a su propia fila. Misma rejilla con `display: contents` que la cabecera del bloque Gastos: el marcado de escritorio no cambia.
- **Crear es tonal y corto**: "+ Cuenta", "+ Préstamo", "+ Meta", "+ Reserva" y el espejo del bloque Gastos, con tinte de acento en vez de verde lleno (R38). Bajo 360 px, con teja, queda el "+" de 44 px y el lector oye el nombre completo. La barra superior de escritorio copia el nombre completo de `data-barra`.
- **Un tamaño de título**: 22 px en todas, también el bloque Gastos (20 bajo 360). El hero de "Día a día" va a la izquierda, como Por pagar y Límites.
- Medido: Mis cuentas pasa de 112 a 71 px a 390 (de 135 a 77 a 320); Me deben y Reservas, a 52.
- Pruebas: dos unitarias de la barra superior (`data-barra`) y un E2E móvil de la fila a 390 y 320.

### feat(movil): MV2.2, Movimientos con los filtros en una fila · 2026-10-29

[ADR 105](DECISIONS/105-movimientos-los-filtros-en-una-fila.md) (extiende el ADR 098 D6; respeta la ficha 15, M2); ficha [`contexto/movimientos.md`](contexto/movimientos.md). Solo bajo 1024 px. SW v632.

- **Los tipos se pliegan como las categorías de Gastos**: "Todos", el elegido y "+N tipos"; abierta, la lista completa y "Menos". Elegir pliega. Antes la fila se deslizaba sin decirlo: con seis tipos medía 565 px en 358.
- **"Fechas" es un chip al final de la misma fila** y abre el mismo `<details>` sin repintar la barra (los campos conservan lo escrito). Con fechas puestas se marca como filtro activo y llega abierto, como pedía la ficha 15.
- **"Limpiar filtros" va junto a "Solo gastos"**, debajo de los filtros. "Limpiar filtros" también pliega los tipos.
- Medido a 390 con seis tipos: el primer movimiento sube de 330 a 258 px. A 320, con un tipo elegido, "Fechas" baja de línea y nada se desliza.
- Escritorio igual: el "+N tipos", el chip y la frase nacen ocultos. Los E2E de filtros de Movimientos corren en escritorio y siguen verdes sin cambios.
- Pruebas: 7 unitarias nuevas en `movimientos.test.js` y un E2E móvil en `movil-mv2.test.js`; el de escritorio confirma que las piezas nuevas no se ven.

### feat(movil): MV2.12, una sola barra para ir de lado · 2026-10-29

[ADR 104](DECISIONS/104-una-sola-barra-para-ir-de-lado.md) (acota el ADR 069 D7 y cambia el dibujo del ADR 098 D3); fichas [`contexto/sistema-visual.md`](contexto/sistema-visual.md) y [`ahorro.md`](contexto/ahorro.md). Solo bajo 1024 px. SW v631.

- **Ahorro pinta la barra de Gastos**: las cuatro hijas dejan los chips, que parecían filtros, y la portada dibuja sus saltos con la misma barra, sin celda vigente. Los chips quedan para filtrar.
- **La barra nunca se desliza**: columnas iguales de 44 px, con el rótulo en 13 px bajo 360. A 320 la de Gastos medía 298 px en 294; ahora caben "Por pagar" y su número.
- **El estado no agranda la celda**: el número de "Por pagar" baja a 18 px y el punto va en la esquina. Reservas suma un punto ámbar cuando una reserva está lista para reiniciar (mismo criterio que el aviso `apartado-listo`), y el lector oye "Reservas, una lista para reiniciar".
- **Defecto de paso**: el punto de "Límites" medía 20 px, no 8, porque `.badge` (capa components) le ganaba a la capa layout. Las reglas de la barra viven ahora en el bloque móvil de `responsive.css`.
- Pruebas: `bloque-ahorro.test.js` reescrita para la barra y el punto (de 12 a 16); el E2E de Ahorro y el de Gastos miden que ninguna barra se deslice ni corte rótulos a 320.

### feat(marca): MARCA.1, el isotipo de Finko · 2026-10-29

[ADR 103](DECISIONS/103-el-isotipo-de-finko.md) (cambia el ADR 040 D4); ficha [`contexto/sistema-visual.md`](contexto/sistema-visual.md). Vale en todos los anchos. SW v630.

- **El isotipo de tres piezas del usuario reemplaza a la "F"** en la barra lateral, Inicio móvil y las tres pantallas de bienvenida. Va en una teja de fondo fijo (`--fk-marca-fondo`), igual en los dos temas: sin ella, el verde bosque se pierde sobre el lienzo oscuro.
- **Una sola fuente**: `assets/svg/identidad/isotipo.svg`, la carpeta que el README de la biblioteca tenía reservada. `sync-sprite.py` la conecta con el prefijo `id-` y siempre a color; queda `#id-isotipo` en el sprite y el helper `isotipo()`.
- **Íconos, favicon y splash se derivan del SVG**: `scripts/isotipo.py` lo dibuja con Pillow (sin dependencias nuevas), y `gen-icons.py` y `gen-splash.py` ya no dibujan las tres barras.
- **El splash dice "Tu dinero bajo control"**: decía "Tu plata bajo control", contra el ADN 11. De paso, el lema deja de quedar pegado al nombre.
- Pruebas: el guardarraíl de sincronía del sprite conoce el prefijo `id-`; el E2E de la barra lateral busca el isotipo en vez de la letra "F".

### feat(app): MV2.6, las fechas dicen el año solo si no es el de hoy · 2026-10-29

[ADR 102](DECISIONS/102-fechas-con-el-ano-solo-si-no-es-el-de-hoy.md) (pieza MV2.6 de MV2.2, fase 12 del canvas "Finko móvil: rediseño integral"); ficha [`contexto/transversal.md`](contexto/transversal.md), infra compartida. Vale en todos los anchos. SW v629.

- **Una sola regla en `fechaLegible`**: día y mes en tres letras, de un catálogo propio, y el año solo si no es el del teléfono. Antes ponía siempre el año con el mes largo ("28 de octubre de 2026"). El catálogo evita el "sept" de `Intl` en es-CO.
- **`fechaCorta` de Mis cuentas desaparece**: nunca ponía el año, así que una prima de 2024 decía "30 de jun" como una de este año. Sus 6 usos (ingresos puntuales, aviso de próximo ingreso y Distribuir) pasan a `fechaLegible`, igual que tres copias sueltas: Atención hoy, la hoja de pagos automáticos del Calendario y "Saldada el" de Por pagar.
- **Movimientos usa `fechaDiaMes`**: la fila no dice el año ni en los grupos de años anteriores; lo dice el grupo.
- Fuera a propósito: los formatos con día de la semana (encabezado de día de Gastos, app del niño, mesada de Familia), los títulos de mes y los selectores de fecha.
- Pruebas: la equivalencia con `toLocaleDateString` de PERF.7 deja de valer y se reemplaza por la regla con el año en curso, el anterior, el siguiente y el cambio de año; 5 expectativas pasan al mes corto; una nueva en Movimientos y otra en Mis cuentas.

### refactor(app): APR.7, Finko del adulto ayuda a decidir; no enseña con lecciones · 2026-10-29

[ADR 101](DECISIONS/101-finko-del-adulto-decide-no-ensena.md) (retira del adulto la capa del ADR 092, la vitrina y los avisos del 032, y revierte el 087 D3); fichas [`contexto/inicio.md`](contexto/inicio.md), [`aprende.md`](contexto/aprende.md) y [`logros.md`](contexto/logros.md). SW v628.

- **Inicio del adulto es una sola pantalla**: sin la franja "Hoy, Aprende, Tu progreso", sin "Tu siguiente paso" y sin Accesos rápidos.
- **Aprende y Tu progreso salen**: sus secciones, sus entradas en la barra lateral y la oferta del Fondo. `#aprende` y `#progreso` redirigen a Inicio en el router, para que un enlace viejo no quede en blanco.
- **Los logros se guardan en silencio**: `logros/index.js` queda en evaluar y guardar; salen el aviso emergente y el confeti. `S.aprende`, `S.logros` y `S.config.accesosInicio` no se tocan (sin migración).
- **El motor de lecciones se queda para el niño** (`leccion-abrir`, `#modal-leccion`). Queda en el código sin pantalla: la ruta del adulto y sus lecciones, la vitrina de logros, la franja de lentes (`ui/bloque-inicio.js`) y el dominio `accesos/`.
- Pruebas: `aprende.test.js` pasa de 11 pruebas de la ruta del adulto a 5 que verifican el retiro; salen las 4 E2E de la vitrina; 3 E2E y 1 unitaria cambian de sentido. El motor sigue cubierto por la E2E del niño (`perfiles.test.js`).

### feat(nino): APR.6b, "Este teléfono es de un adulto" · 2026-10-29

[ADR 100](DECISIONS/100-el-nino-empieza-solo.md) D5; ficha [`contexto/nino.md`](contexto/nino.md). Cierra la Fase 6 de APR. SW v627.

- **Un teléfono que empezó como del niño ya no deja a nadie atrapado**: en "Yo", un enlace discreto con confirmación abre dos pasos en el modal de bienvenida (`ui/telefono-adulto.js`): nombre y PIN dos veces (`validarPin`, `crearBloqueo`), y la aceptación completa de los documentos.
- **Nada se guarda hasta aceptar**. Entonces el teléfono deja de ser del niño, el adulto entra con el PIN que acaba de crear (`bloqueo:abierto`, como en "¿Quién usa Finko?") y el niño queda como su perfil con todo lo suyo. Al volver a abrir, "¿Quién usa Finko?".
- **No se ofrece en un teléfono unido a la nube de su familia** (NUBE.3): el adulto ya existe en su teléfono. El enlace se esconde por CSS con `.kid-vinculado`.
- 9 tests unitarios nuevos y 2 E2E.

### feat(nino): APR.6a, el niño empieza solo: Finko pregunta quién lo va a usar · 2026-10-29

[ADR 100](DECISIONS/100-el-nino-empieza-solo.md) (acota el ADR 093 D1 y la aceptación legal LEG.2 solo en el camino del niño); ficha [`contexto/nino.md`](contexto/nino.md). Todos los anchos. SW v626.

- **La primera pantalla pregunta quién va a usar Finko**: "Soy adulto", "Soy niño o niña" y "Tengo un código de mi familia", que sube desde el paso del nombre. Al adulto le cuesta un toque; los dos E2E de onboarding lo suman.
- **El niño llega a su app en tres pantallas** (`ui/onboarding-nino.js`): nombre y edad (7 a 12, "Tengo 13 años o más" lleva al adulto), su dibujo, y "Un adulto de mi familia sabe que uso Finko". Sin PIN, sin cuenta, sin internet.
- **El teléfono queda como teléfono propio del niño** (`dispositivoNino`, el modo de NUBE.3): al recargar entra directo a su app. El perfil dice "Tu familia" donde no hay tutor nombrado.
- **El aviso legal del niño** se guarda con `via: 'nino'` (`registrarAvisoNino()`): no es un contrato aceptado; el gate solo mira la versión y no le salta. Los documentos no cambian.
- Al niño no se le avisa `onboarding:completado`: lo escuchan el aviso de logros y el de instalar, que son del adulto.
- 12 tests unitarios nuevos y 3 E2E; 2 E2E de onboarding suman el toque de "Soy adulto".

### feat(movil): MV2.15c, Inicio móvil: el avatar abre tu perfil · 2026-10-29

[ADR 099](DECISIONS/099-inicio-movil-hoy-en-una-lista.md) D6 y D7 (cambia el ADR 034 D8 y retoma el candidato móvil del 070 D10); ficha [`contexto/inicio.md`](contexto/inicio.md). Cierra MV2.15. Bajo 1024 px; escritorio sin cambios (E2E). SW v625.

- **El avatar es un botón neutro** (`#perfil-boton`) que abre la hoja "Tu perfil" (`ui/hoja-perfil.js`): tu nombre, Familia, la copia en la nube (con el correo si hay sesión) y Ajustes. La marca queda como la única teja verde. Existe aunque falte el nombre, con un dibujo de persona.
- **Pasarle el teléfono a un niño** va primero, uno por niño, y usa el `entrarComo` de siempre: de adulto a niño es libre y volver pide el PIN (ADR 093 D1).
- **Cada fila baja hasta su bloque de Ajustes** y le da el foco al título: un `hashchange` de una vez, puesto al tocar, corre detrás del de `volver.js`, que deja la sección nueva arriba.
- **El engranaje sale del DOM**: desde 1024px ya estaba oculto (DSK.1a) y bajo 1024px Ajustes vive en la hoja y en "Más". El avatar de escritorio sigue decorativo y verde: los dos anchos conviven y el CSS decide.
- 13 tests unitarios nuevos y 3 E2E; el E2E de DSK.1a sigue protegiendo la marca y ahora verifica el avatar en vez del engranaje.

### feat(movil): MV2.15b, Inicio móvil: "Esta semana" en vez de Próximas prioridades · 2026-10-29

[ADR 099](DECISIONS/099-inicio-movil-hoy-en-una-lista.md) D5 (respeta el ADR 088 D3); ficha [`contexto/inicio.md`](contexto/inicio.md). Segunda de tres rebanadas. Bajo 1024 px; escritorio sin cambios (E2E). SW v624.

- **Lo que entra y lo que sale de mañana a 7 días** en `#panel-prioridades`: los compromisos, préstamos y apartados de siempre más el día de pago de los ingresos (`_ingresosProximos`, sobre `ocurrenciasEnMes`). El salario de mañana por fin aparece.
- **Una fila de 58 px por cosa**, con el día a la izquierda en vez de un encabezado por día; el tipo va en palabras ("Mañana · gasto fijo"). Tope de cuatro; el resto, "Y N más en el Calendario".
- **La dirección sigue dicha con forma (ADR 088 D3)**: la flecha pasa de la teja al recuadro del día y el signo se queda en el monto; lo que entra suma el color de un ingreso. El pie dice lo que entra y lo que sale en toda la semana; un apartado no cuenta en ninguno de los dos.
- La anatomía con teja y badge sigue en la tarjeta fusionada de escritorio: sus regresiones (IV.2c, CAT.2c) se mudaron a ese test. "Todo al día" conserva su texto.
- 8 tests unitarios nuevos y 1 E2E; 7 ajustados a la fila nueva y 5 mudados a escritorio.

### feat(movil): MV2.15a, Inicio móvil: "Atención hoy" en una lista que cuadra · 2026-10-29

[ADR 099](DECISIONS/099-inicio-movil-hoy-en-una-lista.md) (cambia el ADR 087 D5 y acota el orden del 057 D2 a escritorio); ficha [`contexto/inicio.md`](contexto/inicio.md). Primera de tres rebanadas de la fase 8 del canvas. Bajo 1024 px; escritorio sin cambios (E2E). SW v623.

- **Una fila por clase de aviso** (`ui/atencion-hoy.js`), con su acción directa: "Pagar" es el lote de Pendientes del mes, "Distribuir" el aviso de Inicio, "Ver" navega. La clase es la `seccion` del motor, la misma del interruptor de Ajustes: cero vocabulario nuevo. Con uso normal, de cuatro paneles y 1.275 px a una lista de 307 px.
- **Un solo número**: la lente "Hoy" contaba el préstamo de mañana y no el ingreso por distribuir. Ahora lente, "Ver los N" y título de la hoja salen de `contarAvisosDeHoy()`. Sin avisos y con cuentas, la lente dice "Al día".
- **Aviso nuevo `ingreso-por-distribuir`** en el motor: compone `estadoDistribucion` y es opcional (solo lo pide `avisosDeHoy`), así que las notificaciones no cambian. Si el cobro es de hoy, el "te llega hoy" del mismo cobro no se cuenta dos veces.
- **Próximas prioridades empieza mañana** también para préstamos y apartados: lo de hoy ya está arriba. Su test de regresión cambió de sentido a propósito (D2).
- La lista va fuera de los dos envoltorios de "Atención hoy": el `:has()` de DSK.1c que decide el `span 12` de escritorio cuenta solo lo de adentro.
- 24 tests unitarios nuevos y 5 E2E con reloj fijo.

### feat(movil): MV2.1, Finko móvil 2 primera entrega: volver con memoria y filas de una línea · 2026-10-29

[ADR 098](DECISIONS/098-finko-movil-2-primera-entrega.md) (cambia ADR 069 D7, amplía su D8 y cambia DIS.4/G3 solo en móvil); fichas [`contexto/transversal.md`](contexto/transversal.md), [`contexto/gastos.md`](contexto/gastos.md) y [`contexto/nino.md`](contexto/nino.md). Todo bajo 1024 px; escritorio sin cambios (E2E). SW v622.

- **Volver al origen real y a la misma fila** (`ui/volver.js`): la llegada desde el contenido pinta "‹ {origen}" y regresa con `history.back()`; por la barra no hay origen. La altura se recupera por la fila que se veía, no por `scrollY`: con `content-visibility` la misma altura caía 5 filas más arriba.
- **Fila de una línea con hoja de detalle** en Gastos y Movimientos (`ui/detalle-fila.js`): 128 a 71 px, tres gastos en la primera pantalla donde había uno. La hoja copia los botones de la fila y los dispara por `registrar-abrir`: cero lógica nueva.
- **Cabecera del bloque Gastos** con lupa y primario corto, espejo del botón original que la barra de escritorio sigue leyendo. Categorías plegadas con "+N categorías". Ahorro en cuatro columnas sin la casa; el chip vigente por fin se ve (perdía contra `.chip` por capa).
- **Mis cuentas** muestra 5 ingresos puntuales y sale a Movimientos: 29,3 a 3 pantallas con 4000 gastos. Formularios con el pie pegado ("Guardar gasto" de 1458 px a la vista). Por pagar pone la lista antes que la estrategia.
- **Arreglos con alcance a escritorio**: la barra de filtros ya no se encoge en la columna de un modal (chips del asistente de distribución, 10 a 28 px en escritorio y 44 en móvil) y el onboarding muestra el error en vez de solo anunciarlo.
- **Niño**: el camino de Aprender desbordaba 36 px y alejaba la página; frascos en filas bajo 400 px; zona segura arriba. `theme-color` sigue al tema y a la piel del niño.
- Test de `compromisos` que fallaba del 29 en adelante (fecha real): fecha fija. 31 tests unitarios nuevos y 7 E2E.

### perf(ui): PERF.12, cambiar de sección sin estilizar el mes entero · 2026-10-28

Cifras en [`scripts/perf/BASELINE.md`](../scripts/perf/BASELINE.md) (PERF.12); ficha [`contexto/transversal.md`](contexto/transversal.md). SW v621.

- **El tirón al cambiar de sección era el `focus()` del router**, no el JS de los renders: estiliza y maqueta en el acto la sección nueva (84 a 149 ms a 4x; los renders de dominio, 16 a 42). Se vio cronometrando cada listener de `hashchange` por separado.
- **El foco va al final**, después de `markActiveNav`: antes el cuadro volvía a estilizar 906 elementos.
- **Los días de Gastos fuera de pantalla no se estilizan** (`content-visibility: auto` desde el segundo día): 3.428 elementos a 282 al entrar. Gastos otra vez 245 a 112 ms de respuesta, primera vez 325 a 190; las hojas abiertas sobre Gastos también bajan (Registrar 93 a 44).
- La contención rompía el colapso del margen de la última fila (8 px más entre días): `:last-child` sin margen. Capturas comparadas píxel a píxel en claro y oscuro.
- No se hizo lo demás que proponía la tarjeta (saltar renders, `content-visibility: hidden` en secciones): la aceptación quedó cumplida sin eso.

### perf(ui): PERF.11, scroll, hojas y cambio de sección más fluidos, medidos en un navegador · 2026-10-28

Cifras antes y después en [`scripts/perf/BASELINE.md`](../scripts/perf/BASELINE.md) (PERF.11); fichas [`contexto/transversal.md`](contexto/transversal.md) y [`contexto/nube.md`](contexto/nube.md); lo que quedó, PERF.12 a PERF.15 en [`board/transversal.md`](board/transversal.md). SW v620.

- **Instrumento nuevo, `pnpm perf:fluidez`**: Chromium emulando un teléfono con la CPU frenada 4x. `pnpm perf` corre en happy-dom y no podía ver estilo, layout, paint ni compositor, que es donde estaban los tirones. Mide también la respuesta al cambiar de sección, que el INP del navegador no ve porque el render corre en el `hashchange`.
- **Los 36 modales cerrados se seguían pintando** a pantalla completa con `blur`: 36 superficies en cada cuadro de scroll, en cualquier sección. Cerrados ya no se pintan y el fondo del modal abierto ya no se desenfoca, solo se oscurece: es el efecto que peor traduce a la GPU de un teléfono (auditoría de jank G1, ADR 033 D4). Render passes por cuadro: 36 a 1.
- **Abrir una hoja ya no espera a re-estilizar el fondo**: `inert` llega un cuadro después (con Gastos a la vista recalculaba 3.384 elementos). INP de Registrar 232 a 96 ms, de Más 224 a 88. El router ya no mueve el foco a la sección si hay un modal abierto: navegar y abrir un modal en el mismo tick se lo robaba.
- **El arranque ya no abre una View Transition para el tema**: era el origen de los `InvalidStateError` y `TimeoutError` en consola, y el tema claro llegaba un cuadro tarde.
- **Entrar a Gastos** animaba las filas de todo el mes (la cascada contaba 6 por día) y el indicador de la barra animaba `width`: respuesta de 455 a 276 ms la primera vez, de 411 a 229 la segunda.
- **La sincronización de cada minuto ya no huella el estado entero** si no hubo guardado local: de 27,4 a 6,5 ms con 3.000 gastos (en Node).
- **El arranque no cambió** (616 ms bloqueado a 4x): no son los modales ni la fuente, se descartó midiendo. Queda en PERF.13.
- **52 E2E esperaban el modal cerrado como "visible"** (`waitForSelector` por defecto): con `opacity: 0` Playwright lo contaba visible, con `visibility: hidden` ya no. Ahora esperan `state: 'attached'`, que es lo que siempre quisieron decir (cerrado = sin `data-open`).

### feat(nube): NUBE.3, el teléfono del niño vinculado con un código del padre · 2026-10-28

[ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md) (resolución de NUBE.3); fichas [`contexto/nube.md`](contexto/nube.md) y [`contexto/nino.md`](contexto/nino.md); SQL en [`supabase/`](../supabase/README.md). SW v619.

- **El niño no tiene correo ni contraseña.** En Familia, "Su teléfono", el padre autoriza con dos casillas y recibe un código de 8 letras (10 minutos, un solo uso). El teléfono del niño lo escribe desde la bienvenida y recibe un token que solo abre las funciones del niño; la base guarda su huella, no el token.
- **El perfil del niño viaja partido por dueño**: lo que fija el padre, su progreso y cada movimiento y meta por separado. Así el "Guardé" del niño y la mesada que entrega el padre no se pisan; lo prueba un test con los dos a la vez.
- **La base rechaza lo que no es del niño**: sus cuentas, a su hermano o su mesada. Las reglas se prueban con `supabase/pruebas-seguridad.sql`, que corre dentro de una transacción que se deshace; pasó completo contra el proyecto real.
- **El teléfono del niño entra directo a su perfil**, sin adulto ni "Cambiar de perfil". Si el padre lo desvincula, deja de sincronizar y lo anotado se queda ahí.
- **El SQL de la nube entra al repo** (`supabase/`): también el de `registros`, que faltaba.
- **Llega encima de NUBE.2b**: borrar la cuenta del padre se lleva en cascada los códigos y vínculos de sus niños, y el teléfono del niño se entera en su próxima pasada (`vinculo-invalido`) y deja de sincronizar. El error de una pasada del teléfono del niño ya no se descarta por no tener sesión: nunca la tiene.

### feat(nube): NUBE.2b, borrar la cuenta completa desde Ajustes · 2026-10-28

[ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md) (resolución de NUBE.2b); ficha [`contexto/nube.md`](contexto/nube.md); [SECURITY.md](SECURITY.md) regla 10. SW v618.

- **Función de base, no Edge Function.** `borrar_mi_cuenta()` corre como su dueño, borra de `auth.users` solo a quien la llama y lo demás cae en cascada en la misma transacción. La app la llama con su propio token: la clave secreta no existe en ningún lado, ni como secreto del servidor.
- **Probada en `finko-prueba` sin dejar rastro**: `supabase/pruebas-borrar-cuenta.sql` crea dos personas inventadas en una transacción deshecha y comprueba que una se va con sus registros, la otra sigue, un token sin usuario no borra nada y `anon` no la puede llamar (por REST, 401). Falta probarla con un usuario invitado real.
- **Confirmación fuerte**: escribir BORRAR (el texto de `legal/nube/autorizaciones.md`) y el PIN si hay candado. "Borrar de la nube" de NUBE.1 sigue: borra la copia y deja la cuenta.
- **En el dispositivo quedan los datos**; se olvidan la sesión, el libro y la autorización de la nube, que era de esa cuenta: una cuenta nueva la vuelve a fechar.
- **Una pasada de sincronización en camino ya no deja su error** cuando la sesión se cerró o la cuenta se borró mientras tanto.
- **Un test unitario vigila que toda tabla de `supabase/` con `usuario` cuelgue de `auth.users` con `on delete cascade`**: una que no, quedaría atrás al borrar.

### feat(app): UPD.3, botón para actualizar la app sin perder datos · 2026-10-28

[ADR 097](DECISIONS/097-version-nueva-con-boton.md), que reemplaza la decisión de alcance de UPD.1; ficha [`contexto/transversal.md`](contexto/transversal.md). SW v617.

- **El aviso sale siempre y la app nunca recarga sola.** Antes la versión nueva entraba con una recarga silenciosa y nadie se enteraba; ahora sale "Hay una versión nueva de Finko. Tus datos se conservan." con Actualizar y Ahora no, que vuelve a ofrecerse al regresar a la app.
- **Dos señales desde `sw-register.js`**, que no puede importar: el evento avisa en el momento y la marca en `<html>` queda para quien llega después. Sin ella, un cambio de SW anterior al listener se perdía, y Ajustes respondía "ya tienes la última" con la página aún en la vieja.
- **La guarda de primera instalación compara contra el controlador anterior**, no contra el del arranque: una página que nació sin SW tampoco avisaba de una actualización posterior.
- **"Reparar la app" no borra nada sin red**: sin SW, sin cache y sin conexión la próxima carga no tendría de dónde sacar la app. La prueba de red es el mismo `reg.update()`.
- **Verificado con SW real** en `finko-sim.localhost` (la app lo trata como producción) simulando tres publicaciones: buscar en Ajustes, el aviso con Ahora no y Actualizar, y reparar; el perfil sembrado sobrevivió a las cuatro.
- **La primera publicación con este cambio entra por la recarga silenciosa** del `sw-register.js` viejo de cada instalación; el aviso rige desde la siguiente.

### feat(nube): NUBE.2, sincronización por registro entre dispositivos · 2026-10-27

[ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md) (resolución de NUBE.2); ficha [`contexto/nube.md`](contexto/nube.md). SW v616.

- **Sin tocar los dominios ni el schema.** Cada dispositivo lleva un libro aparte con la huella de cada registro tal como quedó sincronizado: otra huella es un cambio, un registro que falta es un borrado. El ADR pedía la marca en cada registro con bump de schema; el libro da lo mismo sin migración y sin que ningún dominio anote nada.
- **Las huellas ordenan las claves** antes de calcularse: Postgres guarda el jsonb con otro orden, y sin eso cada vuelta por la nube parecía un cambio nuevo.
- **Gana el cambio más reciente por registro** cuando los dos lados lo tocaron; el borrado viaja como marca. Lo que baja se aplica con arreglos nuevos para que la memoria de `infra/memo.js` lo note.
- **Corre sola**: 3 s después de cada guardado, al volver a la app, con la red de vuelta y cada minuto; "Sincronizar ahora" la pide al momento. Ese botón nunca va deshabilitado: una pasada que arrancaba antes de pintar Ajustes lo dejaba trabado.
- **`registros` reemplaza a `respaldos`**, que se retiró vacía. Borrar la cuenta completa pasa a NUBE.2b: necesita una función de servidor.

### feat(nube): NUBE.1, cuenta opcional y respaldo automático en Supabase · 2026-10-27

[ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md) (resolución en implementación); ficha nueva [`contexto/nube.md`](contexto/nube.md). Cierra NUBE.0 y NUBE.1; MOV.1 en pausa. SW v615.

- **Sin librería de Supabase.** Para entrar por correo, renovar la sesión y leer o escribir una tabla alcanza `fetch`: `infra/nube.js` habla REST directo y no entra código de terceros al repo.
- **Un respaldo por usuario, del estado completo.** La tabla `respaldos` tiene RLS por usuario y ningún permiso para quien no entró; se verificó contra el proyecto real (401 sin sesión, 422 para un correo no invitado). La sincronización por registro queda para NUBE.2.
- **Al entrar nunca se pisa un lado**: sin respaldo sube, con un dispositivo vacío trae todo, y con datos en los dos lados la persona elige y mientras tanto no se sube nada. Después, cada cambio sube solo a los 5 segundos; sin red queda pendiente.
- **El PIN no sube**, y al traer queda el del dispositivo. La autorización se acepta con una casilla que nombra los perfiles de niños y queda guardada con versión y fecha.
- **El enlace del correo trae la sesión en el hash**, que chocaba con las rutas de la app: se captura en el arranque, antes del router, y deja la app en Ajustes.
- **Lo que queda para el dueño de la cuenta**: SMTP propio en Supabase, porque su correo por defecto tiene un límite bajo y no deja editar la plantilla para mandar el código.

### docs(nube): NUBE.0, seguridad y paquete legal para la nube · 2026-10-27

[ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md) D3, D6 y D7. Parte de documentos de NUBE.0; sin código.

- **SECURITY.md con dos modos**: el modelo de amenaza separa "sin cuenta" (hoy) de "con cuenta" y suma la sección 8 con diez reglas de la nube (RLS con test por regla, la clave secreta nunca en el cliente, código de vinculación del niño de un uso y 10 minutos, librería con huella SHA-256). La guía histórica npm a pnpm se condensa para quedar bajo el techo de 8 KB.
- **La CSP documentada no era la real**: SECURITY.md decía `style-src 'self'` y `vercel.json` sirve `'self' 'unsafe-inline'` por los `style=""` que generan los módulos. Ahora dice la verdad.
- **Paquete legal en `legal/nube/`, fuera de lo que la app publica**: tratamiento de datos y privacidad reescritos para cuentas, términos de la cuenta y el texto exacto de cada autorización, con la del padre por cada niño y su derecho a ser escuchado (Decreto 1377 de 2013). Los documentos vigentes siguen describiendo el modelo sin cuenta, que es cierto hasta NUBE.1.
- **Seis datos pendientes** antes de activarlo: responsable, canal de atención, región de Supabase, su contrato de tratamiento, si aplica el RNBD y el plazo de borrado.

### docs(nube): ADR 096, Finko en la nube con Supabase · 2026-10-27

[ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md), reemplaza el D1 y deroga el D4 del [ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md) y cambia la regla 3 del ADN. Iniciativa NUBE en [`board/transversal.md`](board/transversal.md). Sin código.

- **Se reabre el 043 por lo que cambió, no porque se volvió a pedir**: ahora hay dos personas por familia (el niño del 093), el adulto quiere sus finanzas en el PC y hay compromiso de costo (gratis durante la prueba, suscripción al crecer), que era su condición de reapertura.
- **Cuenta opcional y copia local que manda.** Sin cuenta, Finko sigue como hoy; con cuenta, cada dispositivo guarda todo y Supabase sincroniza una copia. Si el servicio se apaga, nadie pierde datos.
- **Sincronizar por registro**: cada registro ya tiene UUID; se le suma la fecha de cambio y el borrado como marca. Gana el cambio más reciente de ese registro.
- **Descartadas**: solo la familia en la nube (no da el PC ni salva al que pierde el teléfono), cifrado de extremo a extremo (impide bancos y no recupera una clave perdida) y Firebase.
- **Ley 1581 con niños**: autorización del padre al vincular cada niño, documentos legales reescritos y revisión de abogado antes de abrir cuentas fuera del grupo de prueba.

### feat(nino): APR.5a, Tino reemplaza a Frai · 2026-10-27

[ADR 095](DECISIONS/095-tino-en-el-sprite.md), acota el [ADR 094](DECISIONS/094-tino-el-guatin.md) D3 y D4; ficha [`contexto/nino.md`](contexto/nino.md). SW v614.

- **Los dibujos entran como llegaron, convertidos fuera del repo.** El export de Image Trace pesaba 34 a 52 KB por pose, con 60 a 90 colores y un lienzo que el sync rechaza; queda en 11 a 15,5 KB, con once roles `--fk-tino-*`, y se ve casi igual de 72 a 128 px. Llegar a los 3 KB del 094 pedía redibujar las cinco poses.
- **El contraste se mide sobre el pelo**, que dibuja la silueta: en oscuro el pelo y su sombra se aclaran (3,5:1 sobre el lienzo). El contorno no llega a 3:1 en oscuro, y aclararlo invertía la cara.
- **Celebra grande en la unidad terminada**, junto a la insignia; la lección suelta sigue con "celebra".
- **Tino se presenta** ("Soy Tino, un guatín.") en el globo de Inicio mientras el niño no tiene nada hecho ni sabido.
- **Frai se retira entero**: sus cuatro SVG, `--fk-kid-frai`, `.frai` (con el trazo grueso bajo 40 px, que Tino no necesita: su tamaño mínimo es 72) y `htmlFrai`/`POSES_FRAI`. `index.html` sube de 189 KB a 241 KB (19 KB más con gzip), también para el adulto.


---

## Meses anteriores

- [2026-10, del 16 al 25](changelog/2026-10.md): rotaciones forzadas por el techo de 60 KB; el resto de octubre sigue arriba hasta que cierre el mes.
- [2026-08](changelog/2026-08.md)
- [2026-07](changelog/2026-07.md)
- [2026-06](changelog/2026-06.md)
- [2026-05](changelog/2026-05.md)

---

## Convención de entradas

Cada entrada agrupa por fase/release y dentro lista commits con:
- **tipo(área)** - `commit_hash` · `archivos tocados` - descripción de qué cambió.

Tipos: `feat` (nueva funcionalidad), `fix` (bug), `refactor` (sin cambio funcional), `test`, `docs`, `chore` (config/build), `style` (formato).
