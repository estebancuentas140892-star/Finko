# Ficha de contexto: Escritorio (shell de escritorio)

> Revisado: 2026-11-18 (VIS.1b).

> El chrome que solo existe desde 1024px: sidebar, ancho de contenido, barra superior, modal a dos columnas y atajos de teclado. Partida de [`transversal.md`](transversal.md) el 2026-08-14 (DOC.3). Reglas de uso y plantilla en [`README.md`](README.md).
>
> **Qué NO buscar acá:** las anclas de navegación de `ui/shell.js` que resuelven qué se marca activo y cómo se rotula (dueño único: [`sistema-visual.md`](sistema-visual.md)); lo que Inicio comparte con móvil (en [`inicio.md`](inicio.md)). El reparto de Inicio en escritorio (IN.9 y DSK.1) sí vive acá, al final.

---

## Shell de escritorio: sidebar, ancho de contenido y barra superior (iniciativa INT.1)

- **Objetivo**          : el escritorio nunca se decidió. El sidebar existía desde antes de que la app tuviera dos topologías y las quince auditorías por sección midieron móvil a 390px, así que escritorio heredó el reparto móvil estirado. El [ADR 059](../DECISIONS/059-interfaz-de-escritorio.md) lo decide en ocho rebanadas (INT.1a a INT.1h); su archivo se reconstruyó el 2026-11-15 desde estos cierres (BUG-027).
- **Estado actual**     : **las ocho rebanadas cerradas (INT.1a a INT.1h).** INT.1a: contenido centrado + Movimientos en el sidebar. INT.1b: las 4 hijas de Ahorro se anidan bajo la casa (`.nav-subnav`, desplegado solo dentro del grupo) y `BUG-026` se cierra por eliminación de su causa. INT.1c: barra superior fija de 56px con teja+título de la sección activa, "Registrar", tema y Ajustes; fondo opaco sin `backdrop-filter` (Lighthouse 99/100/100/100). INT.1d: `#topbar-saldo` es la cinta de saldo con su ojo, oculta en Inicio (el hero ya lo dice) y sin cuentas; `updSaldo()` recorre todos los `[data-action="saldo-visibilidad"]` porque ahora hay dos ojos a la vez. INT.1e: el primario del encabezado de 8 de las 13 secciones sube a `#topbar-primario`, en secundario. INT.1f: el modal sube a 840px en escritorio y su `<form>` pasa a grid de 2 columnas. INT.1h: cuatro atajos de teclado (`N`, `G` + letra, `?`, `Esc`), apagables en Ajustes. **INT.1g: carril derecho de 320px desde 1.680px** (regla R77), con su único caso real hoy: el compromiso mensual de Fondo de emergencia (detalle en [`ahorro.md`](ahorro.md)). El mecanismo cerró el 2026-08-05 (INT.1a) y su primer contenido el 2026-08-12; los documentos del tablero quedaron sin actualizar hasta esta auditoría del 2026-08-17.
- **Verificado contra** : INT.1g, commit `57b3cdb` (2026-08-12), verificación manual en navegador 2026-08-17; INT.1h, commit `f5fcda7` (2026-08-06); INT.1e, commit `63f95f5` (2026-08-06); INT.1f, commit `bf37761` (2026-08-05); INT.1c/INT.1d, commit `a6eb349` (2026-08-05).

**Mediciones vigentes contra el código** (no contra la recreación del handoff):

| Qué | Antes de INT.1 | Después de INT.1a | Después de INT.1b |
|---|---|---|---|
| Ancho huérfano a 1920 (`main` 1680, `.section` 1440) | 240px pegados al borde derecho | 120 + 120 | sin cambio |
| Ancho huérfano a 2560 | 880px de un lado | 440 + 440 | sin cambio |
| Destinos sin entrada en el sidebar | 1 (Movimientos) | 0 | sin cambio |
| Filas visibles del sidebar en escritorio (grupo Ahorro cerrado) | 15 | 16 | 12 (las 4 hijas se anidan) |
| Alto que necesita el nav a 1280x799 | 648px con 607 disponibles: desborda 41px | sin cambio | 608px con 608 disponibles: sin desborde |

**2026-10-24 (APR.1a):** con "Aprende" en "Día a día" el sidebar volvió a no caber a 1280x799 (29px). Se compacta en `responsive.css` (bloque "SIDEBAR EN ESCRITORIO BAJO": filas de 34px y grupos más juntos con puntero fino y alto ≤ 860px), en la capa `responsive` para no repetir el error de cascada de abajo; quedan ~53px libres para "Tu progreso" (APR.1c). **BUG-026 cerrado por eliminación de causa, no reparado.** El bloque `@media (max-height: 800px) and (min-width: 1024px)` de `layout.css` (compactación de emergencia de filas/grupos/rótulos) nunca se aplicaba: sus cuatro declaraciones tenían la misma especificidad (0,1,0) que las reglas incondicionales del mismo archivo, escritas más abajo, y perdían la cascada. El anidado de INT.1b recuperó los ~160px que esa compactación intentaba ganar sin lograrlo, así que el bloque se borró completo en vez de repararse (medido: `scrollHeight` ≤ `clientHeight` del `.sidebar__nav` a 1280x799, sin la media query).

**Dos premisas del handoff que el código desmiente** (verificadas el 2026-08-02, antes de escribir el ADR 059):

- **PI7 es falso.** El informe de Inicio dio por hecho que `--fk-bg-glass` no tenía valor en tema claro y pintaría una banda negra sobre página blanca; el ADR 057 y el tablero lo registraron como decisión abierta que bloqueaba la barra superior. `themes.css` lo define en `rgba(255, 255, 255, 0.75)` desde el commit de CSS base. Cerrado por falso, nunca bloqueó nada.
- **E3 acredita la mitigación equivocada**, que es BUG-026, arriba.

**Dónde vive**

| Pieza | Archivo | Ancla |
|---|---|---|
| Ancho de contenido y su centrado (INT.1a, D7, regla R77) | `styles/layout.css` | `.section { max-width: var(--fk-content-max); margin-inline: auto }` |
| Tope de ancho (único consumidor: `.section`) | `styles/tokens.css` | `--fk-content-max: 1440px` |
| Entrada de Movimientos en el sidebar (INT.1a, D6; movida de grupo por DSK.10b) | `index.html` | `.nav-item--no-mobile` con `href="#movimientos"`, grupo `nav-label-diario` |
| Entrada de Movimientos en móvil (sin cambios desde DIS.6/C6) | `index.html` | `.mas-tile` con `href="#movimientos"` |
| Sub-nivel de las 4 hijas de Ahorro (INT.1b, D6) | `index.html` | `.nav-subnav#nav-subnav-ahorro`, `[hidden]` por defecto |
| Despliegue del sub-nivel según el hash activo (INT.1b) | ver [`sistema-visual.md`](sistema-visual.md), dueño único de las anclas de navegación de `ui/shell.js` | `markActiveNav()`, `GRUPO_AHORRO` |
| Indentación y borde del sub-nivel (INT.1b) | `styles/layout.css` | `.nav-subnav`, `.nav-item--sub` |
| Clases de plataforma del nav | `styles/responsive.css` | `.nav-item--mobile-only`, `.nav-item--no-mobile` |
| Disparador de Registrar en móvil: abre el alta de la sección activa o, sin alta, la hoja (NAV.D, [ADR 148](../DECISIONS/148-el-boton-central-registra-segun-la-seccion.md)) | `index.html`, `modules/ui/shell.js`, `modules/ui/actions.js` | `.nav-item--registrar.nav-item--mobile-only`, `altaDeSeccion()`, `_syncBotonCentral()`, acción `registrar-segun-seccion` |
| Hoja de registrar (existe en el DOM en las dos plataformas) | `index.html` | `#modal-registrar` |
| Ancho de modal en escritorio (INT.1f, D8): 840px, `--onboarding` se excluye a mano | `styles/modals.css` | `.modal`, `.modal--sm/--lg/--xl/--mas/--onboarding` |
| Grid de 2 columnas del `<form>` en escritorio (INT.1f, D8): emparejamiento vía `:has()` | `styles/responsive.css` | bloque "ESCRITORIO (>= 1024px): formulario de modal a dos columnas" |
| Barra superior de 56px (INT.1c, D1/D2/D5): teja+título, Registrar, tema, Ajustes | `index.html`, `modules/ui/shell.js` | `#topbar`, `_syncTopbar()` |
| Cinta de saldo con su ojo (INT.1d, D9), oculta en Inicio y sin cuentas | `index.html`, `modules/infra/render.js` | `#topbar-saldo`, `updSaldo()` |
| Primario de sección en la barra, en secundario (INT.1e, D3) | `index.html`, `modules/ui/shell.js` | `#topbar-primario`, `_syncPrimarioTopbar()` |
| Ocultar el primario original en desktop y restaurarlo bajo 1024px (INT.1e) | `styles/responsive.css` | `.section__header > .btn-primary` |
| Volver de las 4 hijas de Ahorro, oculto en desktop (INT.1b) | `index.html` / `styles/responsive.css` | `.section__volver--ahorro-hija` |
| Los cuatro atajos de teclado (INT.1h): `N`, `G` + letra, `?`, `Esc` | `modules/ui/actions.js` | `_handleKeydown()`, `_MAPA_SECCION_ATAJO`, `_atajoBloqueado()` |
| Interruptor de los atajos en Ajustes (INT.1h, WCAG 2.1.4) | `modules/dominio/config/view.js`, `modules/dominio/config/index.js` | `_renderAtajos()`, `_toggleAtajos()`, `S.config.atajosTeclado` |
| Modal "Atajos de teclado" (INT.1h) | `index.html` | `#modal-atajos` |
| Carril derecho de 320px desde 1.680px (INT.1g, D7, R77); único caso real: compromiso mensual de Fondo | `styles/layout.css`, `styles/responsive.css`, `modules/dominio/ahorro/view.js` | `.section--con-carril`, `#fondo-carril`, `_renderCompromisoCarril()` |

**Riesgos**:

- **El chrome cambia en las 13 secciones a la vez** desde INT.1c: no hay forma de pilotarlo en una sola. La suite completa es compuerta de cada rebanada.
- **Tablet (768 a 1.023px) sigue sin auditar** (pendiente P4 del informe): hoy usa la topología móvil completa en una pantalla de 1.024 de ancho. El hueco crece con cada rebanada, igual que pasó con el ADR 057.
- **Lighthouse 100 es innegociable** y `backdrop-filter` fijo sobre contenido que scrollea es el caso donde el filtro cuesta. **P9 resuelto en INT.1c**: la barra usa fondo opaco con borde inferior, sin `backdrop-filter`; verificado 99/100/100/100.
- **AH.7a cerró primero** (2026-08-13, [ADR 065](../DECISIONS/065-ahorro-en-la-barra-inferior.md)): el grupo de uso diario de `index.html` ganó una entrada `nav-item--mobile-only` a `#ahorro` y Calendario pasó a `nav-item--no-mobile`. El sidebar y la barra superior de escritorio no se tocaron, pero **`[href="#ahorro"]` ya no es único en el DOM**: cualquier selector nuevo (INT.1g incluido) declara plataforma.
- **R76 y R77 siguen sin escribir** en `DESIGN_SYSTEM.md` (R75 se usó después para otra regla): el código cita R77 para el ancho y el carril. Lo registra el ADR 059 reconstruido.
- **Una hija de Ahorro ya no es un clic directo desde cualquier sección** (INT.1b, tradeoff aceptado por el ADR): hace falta abrir "Ahorro" primero para desplegar el sub-nivel. Tests que clickeaban `#metas`/`#inversion` directo desde Dashboard se movieron a `page.goto()` o al camino de dos clics.

**Cambios pendientes**: ninguno. Las ocho rebanadas de INT.1 cerraron completas. Si otra sección declara un bloque igual de urgente y enterrado, se suma a `.section--con-carril` con el mismo criterio que resolvió el caso de Fondo.

**Cambios realizados**:

- 2026-11-15 (NAV.D, ADR 148): el botón central del teléfono lee el mismo primario del encabezado que `_syncPrimarioTopbar()` y lo dispara; un encabezado con dos `.btn-primary` rompería a los dos lectores. Verificado contra `tests/unit/boton-central.test.js` y `tests/e2e/boton-central.test.js`.
- 2026-10-24 (APR.1a y APR.1d): filas "Aprende" en "Día a día" y "Tu progreso" en "Cómo voy"; filas de 34px con alto ≤ 860px para seguir cabiendo a 1280x799.
- 2026-08-17 (auditoría documental, INT.1g): el código de la octava rebanada ya existía desde el commit `57b3cdb` (2026-08-12), sin mensaje de commit propio y sin actualizar el tablero. Verificado en el navegador esta sesión: a 1.680px+ el carril muestra el compromiso real y la copia del panel principal se oculta; debajo, el carril se oculta y la copia vuelve. Sin test automatizado propio (hueco de cobertura anotado, no bloqueo). Ver CHANGELOG.
- 2026-08-06 (INT.1h): cuatro atajos en `_handleKeydown()` (`N` abre Registrar, `G` + letra navega con un mapa fijo de 11 secciones, `?` abre `#modal-atajos`, `Esc` sin cambios). Tres guardas cancelan el atajo antes de actuar (campo de texto o `contenteditable` con foco, modal abierto, tecla modificadora): es la mitigación de P8. Interruptor en Ajustes por WCAG 2.1.4 (`S.config.atajosTeclado`, default `true`, schema v35). Commit `f5fcda7`.
- 2026-08-06 (INT.1e): `#topbar-primario` copia texto, `aria-label` y `data-action`/`data-modal` del único `.btn-primary` del encabezado activo (`_syncPrimarioTopbar()`), sin mapa nuevo por sección; se resincroniza al navegar y ante `state:change`. Cubre 8 de las 13 secciones. Commit `63f95f5`.
- 2026-08-05 (INT.1c e INT.1d): barra superior fija de 56px (teja+título, Registrar, tema, Ajustes, fondo opaco sin `backdrop-filter`) y cinta de saldo con su ojo, oculta en Inicio y sin cuentas, sobre el mismo flag `ocultarSaldo`. Commit `a6eb349`.
- 2026-08-05 (INT.1f): el modal base sube de 520 a 840px desde 1024px; su `<form>` pasa a grid de 2 columnas emparejando los `.form-group` simples vía `:has()`. Móvil no cambia.
- 2026-08-03 (INT.1b): las 4 hijas de Ahorro se anidan bajo la casa en el sidebar de desktop; `.section__volver` de las 4 se oculta ahí; BUG-026 se cierra por eliminación de causa.
- 2026-08-02 (INT.1a): `.section` gana `margin-inline: auto` y Movimientos entra al grupo "Seguimiento" del sidebar.

---

## Armazón de escritorio: una identidad, un primario, una navegación fija (iniciativa DSK.10, ADR 079)

- **Objetivo**          : la auditoría transversal a 1920 x 1080 encontró quince hallazgos y ninguno es de composición de contenido: son del armazón. La pantalla se nombra una sola vez y donde el nombre sobrevive al desplazamiento, hay exactamente un botón lleno por pantalla y es el de la pantalla, y en monitor la navegación no se pliega porque plegarla no da espacio.
- **Estado actual**     : **iniciativa completa, las tres rebanadas.** DSK.10a: el `.section__title-group` se oculta visualmente desde 1024px (desde VIS.1b, [ADR 168](../DECISIONS/168-lo-importante-sin-desplazar.md) D3; antes 1680; Inicio conserva su encabezado) (el `h1` sigue siendo el nombre accesible), `#topbar-primario` y "Registrar" se intercambian el lleno según la sección tenga primario propio, y los tres verbos que faltaban pasan a "Nueva cuenta", "Nueva meta" y "Nueva reserva". DSK.10b: el botón de plegar se retira desde 1680 y el estado persistido se ignora en ese rango sin borrarse, la barra pasa a cuatro grupos con nombre y las 4 hijas de Ahorro dejan de depender del hash en monitor. DSK.10c: Ajustes queda con una sola entrada en el chrome de escritorio, el bento solo levanta lo que se puede pulsar y el movimiento de dedo (encogido al pulsar, cascada de entrada) se acota a donde tiene sentido. **Corrige una premisa falsa de toda la serie**: los ADR 070 a 078 citaban D1, D2 y D3 como aprobadas y ninguna estaba implementada.
- **Verificado contra** : DSK.10a, commit `5c1a0e6` (2026-08-19); DSK.10b, commit `07d97b6` (2026-08-19); DSK.10c, esta sesión. Medición en navegador contra el runtime del index, no contra el árbol de trabajo (que comparte otra sesión).

**Mediciones a 1920 x 1080** (medidas en el navegador, no estimadas):

| Qué | Antes | Después |
|---|---|---|
| Alto del encabezado de sección (13 secciones) | 36px de título + 32 de separación | 1px, oculto visualmente |
| Botones llenos simultáneos en la barra superior | 2 ("Registrar" lleno y el de la sección en secundario) | 1, y es el de la sección |
| Ancho de contenido con la barra plegada | 1376 (igual que expandida) | el control ya no existe en ese rango |
| Espacio libre del nav con todo desplegado | no aplica (las hijas se ocultaban) | 184px, sin desplazamiento interno |
| Grupos de navegación con rótulo legible | 2 de 3 | 4 de 4 |
| Entradas a Ajustes en la misma pantalla | 3, dos sin etiqueta | 1, con etiqueta |
| Celdas del bento que se levantan al pasar el puntero | todas, con `cursor: default` | solo las que llevan enlace, botón o acción |

**Dónde vive**

| Pieza | Archivo | Ancla |
|---|---|---|
| Identidad de sección oculta visualmente desde 1024 (D1; VIS.1b, ADR 168 D3) | `styles/responsive.css` | bloque "IDENTIDAD DE SECCIÓN, UNA SOLA VEZ" |
| Jerarquía de primarios de la barra superior (D2) | `modules/ui/shell.js` | `_syncJerarquiaPrimarios()` |
| Los cuatro grupos con nombre (D6) | `index.html` | `nav-label-diario`, `nav-label-compromisos`, `nav-label-mi-dinero`, `nav-label-como-voy` |
| Umbral de monitor y su lectura (D4, D7) | `modules/ui/shell.js` | `MQ_MONITOR`, `_enMonitor()` |
| Barra sin plegar y estado persistido ignorado (D4) | `modules/ui/shell.js`, `styles/responsive.css` | `_syncBarraPorAncho()`, bloque "LA BARRA NO SE PLIEGA EN MONITOR" |
| Sub-nivel de Ahorro atado al hash **o** al ancho (D7) | `modules/ui/shell.js` | `_syncSubnavAhorro()` |
| Entrada única a Ajustes (D8) | `index.html` | `.sidebar__footer a[href="#config"]`; `.topbar__actions` ya solo lleva el tema |
| Levante del bento solo en lo pulsable (D9) | `styles/layout.css` | `.bento__cell:has(a, button, [data-action]):hover` |
| Encogido al pulsar solo con puntero grueso (D10) | `styles/layout.css` | `@media (pointer: coarse) .nav-item:active` |
| Cascada de entrada retirada en monitor (D10) | `styles/responsive.css` | bloque "SIN CASCADA DE ENTRADA EN MONITOR" |

**Riesgos**:

- **El estado de plegado se ignora, no se borra.** Quien lo tenga guardado en `true` y baje de 1680 recupera la barra plegada, que sigue sin nombres bajo cada icono: es la deuda que D5 deja escrita y **no** se debe dar por definitiva.
- **Bajo 1680 y con menos de 800px de alto, el nav vuelve a desplazarse por dentro** cuando el grupo Ahorro está abierto: 183px de exceso a 1280x799, contra ~123 antes de los dos rótulos nuevos. Ya se desplazaba; los cuatro grupos lo empeoran ~60px. Con el grupo cerrado cabe con 23px de sobra.
- **La barra reacciona al ancho por `matchMedia`**, así que cruzar el umbral sin recargar sí resincroniza (verificado en Playwright). El panel de vista previa de esta herramienta **no** emite `resize` ni `change` al cambiar el viewport: ahí solo se puede verificar recargando en cada ancho.
- **La marca "F" de Inicio no se borró del marcado**, aunque D8 la nombre: DSK.1a (ADR 070 D10) ya la oculta desde 1024 y en móvil sigue siendo la única vez que la app se nombra, porque allá la barra lateral no tiene logo. Borrarla habría revertido ese ADR en silencio. Lo mismo con el engranaje del saludo.
- **El levante del bento depende de los datos**: una celda gana o pierde su acción según lo que haya que mostrar (sin cuentas no hay enlace "Ver mis cuentas"). Es a propósito, pero significa que una celda puede levantarse hoy y no mañana con la misma pantalla.
- **"Deudas" en el mockup es "Por pagar" en el código**: el nombre lo fijó la ficha 01 y lo trajo al chrome la ficha 05 ([ADR 069](../DECISIONS/069-bloque-gastos-en-la-barra-movil.md)). D6 decide agrupación, no nombres, así que el rótulo no se tocó.

**Cambios pendientes**: ninguno de la iniciativa. **N6 (iconos repetidos entre destinos) queda fuera**: es dependencia de la familia de iconos, no de una auditoría de composición, y necesita tarjeta propia. **D5 queda como deuda escrita**: bajo 1680 la barra plegada sigue sin nombres.

**Cambios realizados**:

- 2026-08-19 (DSK.10c, cierra la iniciativa): engranaje de la barra superior retirado (el del saludo ya salía por CSS desde DSK.1a, y en móvil los dos se quedan), levante del bento acotado a las celdas con acción vía `:has()`, `scale(0.97)` de la navegación acotado a `pointer: coarse` y cascada de entrada retirada desde 1680.
- 2026-08-19 (DSK.10b): barra sin plegar desde 1680 con el estado persistido ignorado, cuatro grupos con nombre (Movimientos sale de "Seguimiento" a "Día a día", los dos espejos de deuda se reúnen en "Compromisos", "Ahorro" deja de ser rótulo de grupo) y las 4 hijas siempre visibles en monitor.
- 2026-08-19 (DSK.10a): identidad de sección una sola vez, un solo primario por pantalla y los tres verbos que faltaban. Commit `5c1a0e6`.

---

## Inicio en escritorio (IN.9 y DSK.1)

> Movido de [`inicio.md`](inicio.md) el 2026-11-15, sin cambios de contenido: el eje de estos bloques es el escritorio. Lo que Inicio tiene en común con móvil (piezas, riesgos, cambios) sigue allá.

**Escritorio: iniciativa IN.9, cerrada** ([ADR 057](../DECISIONS/057-inicio-en-escritorio.md)). El ADR 034 diseñó Inicio contra un mockup de 390px y dejó escrito que el reparto de escritorio quedaba sin decidir; el ADR 057 lo decide: cero celdas de ancho completo, `span 4` y `span 6` (regla R78). Cerraron **IN.9a** (los dos avisos de "Atención hoy" comparten fila), **IN.9b** (8 filas de actividad en escritorio), **IN.9c** (el detalle por cuenta a columna propia, D3 del ADR, acota el 034 D4 a móvil), **IN.9d** (Accesos rápidos en fila propia + Resumen semanal y Actividad reciente en la fila final 6+6, D4 del ADR, acota el 034 D7 a móvil) e **IN.9e** (estado vacío propio de escritorio: pieza centrada de 620px con tres pasos, contra la guía de móvil que se diluía estirada a 990px; copy provisional, PI5). **Fuera de la iniciativa:** ID4 e ID7 del informe (ocultar `.perfil-inicio` y el carril de urgencias) dependen de una barra superior de escritorio que no existe en el código, registrada como INT.1.

**Riesgos vivos de la iniciativa:** IN.9c partió la máscara de privacidad en dos celdas (acordeón móvil + columna de escritorio). Su garantía la cubren tests dedicados (IN.8c/IN.9c), verificados. Tablet (768 a 1.023px) sigue sin auditar. Desde IN.9b, el panel de actividad lee el ancho con `matchMedia` en cada render: un cambio de ancho sin cambio de estado no lo repinta, así que el límite y el reparto quedan en el del último render hasta la siguiente acción (misma limitación que `_repartoCierreInicio()` heredó).

**Escritorio, segunda pasada: iniciativa DSK.1, en proceso** ([ADR 070](../DECISIONS/070-inicio-centro-de-atencion-en-escritorio.md), que acota el 057 D3/D4 y el 034 D1/D7). El 057 decidió **cómo repartir** los nueve módulos; el 070 cambia la pregunta a **cuáles pertenecen**: si el usuario abre Finko diez segundos, tiene que salir sabiendo qué atender. Cuatro rebanadas, **las cuatro cerradas**: **DSK.1a** purga y cabecera (D2, D10), **DSK.1b** banda de contexto (D4, D5, D6), **DSK.1c** columnas 4 + 8 (D7), **DSK.1d** fusión de obligaciones y pie (D8, D9). **Alcance escritorio, desde 1024px:** móvil no se toca, es territorio de la auditoría móvil (MOV.1), que sigue abierta.

**DSK.1a cerrada (2026-08-18, ADR 070 D2 y D10).** En escritorio salen tres módulos y la cabecera se calla:
- **Accesos rápidos** y **Actividad reciente** de escritorio **salen del DOM**, no se ocultan: escritorio era su único hogar (IN.9d los había creado solo para ese ancho), así que dejarlos sería marcado muerto. Se van `#panel-accesos-escritorio`, `#accesos-inicio-grid-escritorio` y `#panel-actividad-reciente-escritorio`, con su `bento__group` envolvente. `accesos/view.js` y `movimientos/view.js` vuelven a llenar un solo contenedor cada uno.
- **Resumen de la semana** sí sigue en el DOM (`#panel-resumen`), porque bajo 1024px no cambió nada: `_repartoCierreInicio()` lo fuerza oculto desde 1024px. El oculto se fuerza en una sola dirección, nunca al revés, para no pisar el oculto por falta de datos de `resumen/view.js`.
- **Cabecera de perfil:** marca "F" y engranaje ocultos desde 1024px por CSS (`responsive.css`, mismo patrón que `.section__volver--ahorro-hija`), restaurados bajo 1024px. El selector es de **hijo directo** a propósito: `.perfil-inicio__ajustes` se reusa en la barra superior, que conserva su engranaje.
- `_repartoAccesosActividad()` se renombra a `_repartoCierreInicio()`: ya no reparte, decide qué cierre de Inicio se ve.
- **Pendiente que deja:** "Personalizar" accesos se queda sin entrada en escritorio hasta que Ajustes le dé sitio. Y `_limiteRecientes()` de `movimientos/view.js` conserva su rama de escritorio (8 filas, IN.9b) aunque el panel que la usaba ya no se ve en ese ancho: no se toca acá porque el ADR 070 no decidió sobre el límite.

**DSK.1b cerrada (2026-08-18, ADR 070 D4, D5 y D6).** El hero de saldo y la columna de cuentas se funden en una banda de ancho completo desde 1024px. Medida: 1137 x 180 a 1440px, sin desplazamiento de página.
- **El mecanismo es un envoltorio, `.banda-inicio`** (`index.html`), que abraza al hero y a `#panel-cuentas-detalle`. Bajo 1024px vale `display: contents` (`domain.css`): no existe como caja y sus hijos vuelven a ser celdas sueltas del bento. Todo lo que lo convierte en superficie vive en el bloque de 1024px de `responsive.css`. **Móvil no cambia**, verificado contra un servidor que sirve `HEAD` en paralelo: mismas coordenadas de hero, ojo, rótulo, monto, pill y conteo dentro de un píxel. Tablet tampoco: la banda no aplica y sigue vigente la regla propia de `span 6` del rango 768-1023.
- **Trampa a recordar (D6):** los dos hijos siguen siendo `.bento__cell--half`, o sea `grid-column: span 6`, porque bajo 1024px ese span es el que vale. Dentro de la banda hay que reponerles `grid-column: auto`, o cada uno pide 6 columnas a una rejilla de 2 y el navegador inventa cuatro columnas implícitas de 0px: los dos terminan apilados a ancho completo.
- **D5 se resolvió por colocación, no moviendo el botón.** Anidar `#saldo-ojo` dentro de `#hero-saldo-label` funcionaba en escritorio y rompía móvil: bajo 1024px ese botón no es absoluto sino `position: relative` con desplazamiento (regla de área táctil de `responsive.css`), así que dentro del `<p>` le sumaba 40px de alto a la fila del rótulo. En su lugar, dentro de la banda el hero pasa a rejilla de dos columnas y el ojo se coloca en la celda contigua.
- **El mínimo de las fichas (9,5rem) está medido:** a 1440px la columna derecha mide 702px y cuatro fichas de 11rem con sus huecos pedían 740, así que la cuarta caía sola a una segunda fila. El nombre se parte en dos líneas antes que truncarse (tope de 2 con `line-clamp`): los nombres reales no caben en una línea de 167px y el diseño no se topó con esto porque usó nombres cortos inventados.
- **El título `#cuentas-detalle-titulo` se oculta pero no se borra:** `aria-labelledby` del panel lo sigue nombrando.

**DSK.1c cerrada (2026-08-20, ADR 070 D7, cierra la iniciativa DSK.1).** El grupo "Atención hoy" pasa de un mosaico 2x2 que se recolocaba según cuántos paneles hubiera visibles a un reparto fijo: avisos en columna estrecha (`span 4`), obligaciones en columna ancha (`span 8`). Sin ningún aviso visible, las obligaciones ocupan la fila entera (`span 12`).
- **El defecto era de estado, no de composición.** Con los cuatro paneles activos se emparejaban por tipo (avisos 114+114, listas 370+370); con un número impar visible, media fila quedaba vacía y un aviso heredaba la altura de una lista. La zona más importante de Inicio era la que peor se comportaba con pocos datos, que es el caso normal.
- **Dos envoltorios, mismo patrón que `.banda-inicio` y `.tesoreria-col`**: `.atencion-hoy__avisos` (distribuir, límites, motor único) y `.atencion-hoy__obligaciones` (vencidos, prioridades), `display: contents` por defecto (`domain.css`) y flex-columna desde 1024px (`responsive.css`). El `:has()` que decide el `span 12` mira **dentro** del envoltorio de avisos, no cuenta paneles sueltos: `.bento__group-cells:not(:has(.atencion-hoy__avisos > .bento__cell:not([hidden])))`.
- **`#panel-avisos` (motor único, CFG.3b) se mueve en el DOM**, de última posición del grupo a tercera, junto a distribuir y límites. No es solo composición de escritorio: por naturaleza es un aviso igual que los otros dos, y hasta ahora quedaba fuera de la regla que IN.9a ya había aplicado ("los dos avisos primero, las listas después") simplemente porque llegó después en el tiempo. El cambio de orden en el DOM también alcanza a móvil (mueve el panel de avisos antes de vencidos/prioridades en el apilado vertical), y es la corrección de esa inconsistencia, no una regresión: no hay tarjeta de móvil que dependiera del orden anterior.
- **Cierra la deuda que DSK.1d había dejado escrita**: el borde derecho de la tarjeta fusionada ya cae a plomo (antes la celda medía `span 6` sin reparto propio) y la pantalla de Inicio con datos reales de un mes cargado cabe en el pliegue sin desplazamiento, verificado a 1920 x 1080.

**DSK.1d cerrada (2026-08-20, ADR 070 D8 y D9).** "Pendientes del mes" y "Próximas prioridades" se fusionan en **"Lo que tienes que pagar"** desde 1024px: una sola línea de tiempo, un total y un pie. Medido a 1920 x 1080 con el reparto de la auditoría: botón "Pagar lo vencido · $1.474.400", resumen "4 pagos · en total debes $5.964.300", borde izquierdo a plomo con la banda (desfase 0) y **33px de aire bajo el botón**, que antes era 1.
- **El grupo "Ya se venció" lista exactamente lo que paga el botón.** Es la restricción que ordena todo lo demás: si el grupo y el lote no cubrieran el mismo conjunto, la cifra dentro del botón dejaría de ser cierta, y esa cifra es el punto de D8. Por eso un compromiso que vence **hoy** se queda en ese grupo (`vencidosSinPagar` lo incluye, y el lote lo paga) y lo dice en su propia fila, en warning: "vence hoy".
- **Una sola anatomía de fila.** Las filas, los grupos y los chips los presta `.prioridades-card__*`, que ya era la anatomía de las dos listas (el propio código decía que eran "idénticas"). El badge sigue la regla de cada mitad: corto en lo vencido ("Deuda", "Gasto fijo"), largo en lo que viene ("Reserva", "Préstamo").
- **La tarjeta es la celda (D9).** `#panel-vencidos` pierde `bento__cell--flat` en escritorio y vuelve a pintar la superficie de `.bento__cell`; el contenido va directo, sin `.vencidos-card` dentro. Sin eso el borde caía 24px por dentro del de la columna vecina. Al angostar la ventana, `_restaurarCeldaVencidos()` devuelve la celda a su forma plana: si no, quedaría superficie dentro de superficie.
- **`#panel-prioridades` se vacía, no se retira del marcado**: bajo 1024px sigue siendo su propia tarjeta y ese ancho es territorio de MOV.1.
- **Lo que este alcance no daba todavía, cerrado por DSK.1c el mismo día:** el borde derecho caía a plomo solo cuando existiera el reparto 4 + 8 (hasta entonces la celda seguía en `span 6`), y "cabe en el pliegue sin desplazar" tampoco (a 1920 el documento medía 1339 contra 1080 de ventana). Las dos eran consecuencia de D7, no de D8, y las resuelve DSK.1c.
