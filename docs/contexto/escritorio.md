# Ficha de contexto: Escritorio (shell de escritorio)

> Revisado: 2026-08-19.

> El chrome que solo existe desde 1024px: sidebar, ancho de contenido, barra superior, modal a dos columnas y atajos de teclado. Partida de [`transversal.md`](transversal.md) el 2026-08-14 (DOC.3). Reglas de uso y plantilla en [`README.md`](README.md).
>
> **Qué NO buscar acá:** las anclas de navegación de `ui/shell.js` que resuelven qué se marca activo y cómo se rotula (dueño único: [`sistema-visual.md`](sistema-visual.md)); el reparto del bento de Inicio en escritorio, que es la iniciativa IN.9 (en [`inicio.md`](inicio.md)).

---

## Shell de escritorio: sidebar, ancho de contenido y barra superior (iniciativa INT.1)

- **Objetivo**          : el escritorio nunca se decidió. El sidebar existía desde antes de que la app tuviera dos topologías y las quince auditorías por sección midieron móvil a 390px, así que escritorio heredó el reparto móvil estirado. El ADR 059 lo decide en ocho rebanadas (INT.1a a INT.1h).
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

**BUG-026 cerrado por eliminación de causa, no reparado.** El bloque `@media (max-height: 800px) and (min-width: 1024px)` de `layout.css` (compactación de emergencia de filas/grupos/rótulos) nunca se aplicaba: sus cuatro declaraciones tenían la misma especificidad (0,1,0) que las reglas incondicionales del mismo archivo, escritas más abajo, y perdían la cascada. El anidado de INT.1b recuperó los ~160px que esa compactación intentaba ganar sin lograrlo, así que el bloque se borró completo en vez de repararse (medido: `scrollHeight` ≤ `clientHeight` del `.sidebar__nav` a 1280x799, sin la media query).

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
| Disparador de Registrar en móvil | `index.html` | `.nav-item--registrar.nav-item--mobile-only` |
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
- **Las reglas R75 a R77 están reservadas y sin escribir**: entran a `DESIGN_SYSTEM.md` cuando cierre la última rebanada, así que hoy la lista de principios tiene un hueco declarado entre R74 y R78.
- **Una hija de Ahorro ya no es un clic directo desde cualquier sección** (INT.1b, tradeoff aceptado por el ADR): hace falta abrir "Ahorro" primero para desplegar el sub-nivel. Tests que clickeaban `#metas`/`#inversion` directo desde Dashboard se movieron a `page.goto()` o al camino de dos clics.

**Cambios pendientes**: ninguno. Las ocho rebanadas de INT.1 cerraron completas. Si otra sección declara un bloque igual de urgente y enterrado, se suma a `.section--con-carril` con el mismo criterio que resolvió el caso de Fondo.

**Cambios realizados**:

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
- **Estado actual**     : **dos de tres rebanadas cerradas.** DSK.10a: el `.section__title-group` se oculta visualmente desde 1680px (el `h1` sigue siendo el nombre accesible), `#topbar-primario` y "Registrar" se intercambian el lleno según la sección tenga primario propio, y los tres verbos que faltaban pasan a "Nueva cuenta", "Nueva meta" y "Nueva reserva". DSK.10b: el botón de plegar se retira desde 1680 y el estado persistido se ignora en ese rango sin borrarse, la barra pasa a cuatro grupos con nombre y las 4 hijas de Ahorro dejan de depender del hash en monitor. **Falta DSK.10c** (D8, D9, D10). **Corrige una premisa falsa de toda la serie**: los ADR 070 a 078 citaban D1, D2 y D3 como aprobadas y ninguna estaba implementada.
- **Verificado contra** : DSK.10a, commit `5c1a0e6` (2026-08-19); DSK.10b, esta sesión. Medición en navegador contra el runtime del index, no contra el árbol de trabajo (que comparte otra sesión).

**Mediciones a 1920 x 1080** (medidas en el navegador, no estimadas):

| Qué | Antes | Después |
|---|---|---|
| Alto del encabezado de sección (13 secciones) | 36px de título + 32 de separación | 1px, oculto visualmente |
| Botones llenos simultáneos en la barra superior | 2 ("Registrar" lleno y el de la sección en secundario) | 1, y es el de la sección |
| Ancho de contenido con la barra plegada | 1376 (igual que expandida) | el control ya no existe en ese rango |
| Espacio libre del nav con todo desplegado | no aplica (las hijas se ocultaban) | 184px, sin desplazamiento interno |
| Grupos de navegación con rótulo legible | 2 de 3 | 4 de 4 |

**Dónde vive**

| Pieza | Archivo | Ancla |
|---|---|---|
| Identidad de sección oculta visualmente desde 1680 (D1) | `styles/responsive.css` | bloque "IDENTIDAD DE SECCIÓN, UNA SOLA VEZ" |
| Jerarquía de primarios de la barra superior (D2) | `modules/ui/shell.js` | `_syncJerarquiaPrimarios()` |
| Los cuatro grupos con nombre (D6) | `index.html` | `nav-label-diario`, `nav-label-compromisos`, `nav-label-mi-dinero`, `nav-label-como-voy` |
| Umbral de monitor y su lectura (D4, D7) | `modules/ui/shell.js` | `MQ_MONITOR`, `_enMonitor()` |
| Barra sin plegar y estado persistido ignorado (D4) | `modules/ui/shell.js`, `styles/responsive.css` | `_syncBarraPorAncho()`, bloque "LA BARRA NO SE PLIEGA EN MONITOR" |
| Sub-nivel de Ahorro atado al hash **o** al ancho (D7) | `modules/ui/shell.js` | `_syncSubnavAhorro()` |

**Riesgos**:

- **El estado de plegado se ignora, no se borra.** Quien lo tenga guardado en `true` y baje de 1680 recupera la barra plegada, que sigue sin nombres bajo cada icono: es la deuda que D5 deja escrita y **no** se debe dar por definitiva.
- **Bajo 1680 y con menos de 800px de alto, el nav vuelve a desplazarse por dentro** cuando el grupo Ahorro está abierto: 183px de exceso a 1280x799, contra ~123 antes de los dos rótulos nuevos. Ya se desplazaba; los cuatro grupos lo empeoran ~60px. Con el grupo cerrado cabe con 23px de sobra.
- **La barra reacciona al ancho por `matchMedia`**, así que cruzar el umbral sin recargar sí resincroniza (verificado en Playwright). El panel de vista previa de esta herramienta **no** emite `resize` ni `change` al cambiar el viewport: ahí solo se puede verificar recargando en cada ancho.
- **"Deudas" en el mockup es "Por pagar" en el código**: el nombre lo fijó la ficha 01 y lo trajo al chrome la ficha 05 ([ADR 069](../DECISIONS/069-bloque-gastos-en-la-barra-movil.md)). D6 decide agrupación, no nombres, así que el rótulo no se tocó.

**Cambios pendientes**: DSK.10c (D8, una sola entrada a Ajustes; D9, hover solo en lo pulsable; D10, movimiento fino para puntero fino). **N6 (iconos repetidos entre destinos) queda fuera**: es dependencia de la familia de iconos, no de una auditoría de composición.

**Cambios realizados**:

- 2026-08-19 (DSK.10b): barra sin plegar desde 1680 con el estado persistido ignorado, cuatro grupos con nombre (Movimientos sale de "Seguimiento" a "Día a día", los dos espejos de deuda se reúnen en "Compromisos", "Ahorro" deja de ser rótulo de grupo) y las 4 hijas siempre visibles en monitor.
- 2026-08-19 (DSK.10a): identidad de sección una sola vez, un solo primario por pantalla y los tres verbos que faltaban. Commit `5c1a0e6`.
