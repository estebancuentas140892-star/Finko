# Ficha de contexto: Sistema visual

> Identidad visual transversal: color por sección, tejas de marca y biblioteca gráfica, y navegación. Partida de `transversal.md` el 2026-07-24. Reglas de uso y plantilla en [`README.md`](README.md).
>
> **Qué NO buscar acá:** el lenguaje de los formularios y el selector de ícono (en [`captura.md`](captura.md)); los tokens con sus valores exactos (en `styles/tokens.css`, fuente de verdad).

---

## Tejas de marca y biblioteca gráfica (logos de bancos y marcas)

- **Objetivo**          : mostrar el logotipo oficial de cada banco/billetera/marca en una teja de color, con fallback de iniciales, en Mis cuentas, Gastos, Deudas, fijos y suscripciones. `assets/svg/` es la fuente de verdad de diseño (ADR 026); el sprite de `index.html` es artefacto generado.
- **Estado actual**     : BR.3 completa (2026-07-05): los 11 bancos/billeteras reales de `BANCOS_CO` tienen glifo a color; solo "Otro" (no es una entidad real) sigue con iniciales. BR.5 (normalización automática de exports crudos) y BR.4 (ADR 027, excepción de logo a color) cerradas. Iniciativa Biblioteca de recursos gráficos completa.
- **Verificado contra** : `92934a0` (BR.3) más el ADR 027 de este cierre (BR.4), 2026-07-05.

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Catálogo de bancos CO (id, color, texto, simbolo, aliases) | `modules/core/constants.js` | `BANCOS_CO` | ~283 |
| Catálogo de marcas globales | `modules/core/constants.js` | `MARCAS` | antes de BANCOS_CO |
| Render de la teja (glifo o iniciales sobre color) | `modules/infra/marcas.js` | `tejaMarca()` | ~90 |
| Detección de marca en texto libre | `modules/infra/marcas.js` | `resolverMarca()`, `normalizarAlias()` | ~35 |
| Avatar de banco (delega en tejaMarca) | `modules/infra/bancos.js` | `bancoAvatar()` | |
| Sprite generado (símbolos `b-*`) | `index.html` | marcadores `INICIO/FIN bloque generado por scripts/sync-sprite.py` | |
| Pipeline biblioteca → sprite | `scripts/sync-sprite.py` | `normalizar_export_illustrator()` (paso 0, BR.5), `validar_y_convertir()`, `_validar_fullcolor()`, `orden_final()` | |
| Archivos de diseño | `assets/svg/logos/**` | 1 archivo = 1 símbolo (`<slug>.svg` → `b-<slug>`) | |
| Estándar técnico y flujo de trabajo | `assets/svg/README.md` | secciones 6, 6b (logos a color), 7 (export), 9 (flujo en pareja) | |
| CSS de la teja | `styles/components/nudges.css` | `.bank-avatar`, `.bank-avatar__glifo` | ~275 |
| CSS base de iconos (fuente de la herencia de stroke) | `styles/components/forms.css` | `.icon` | ~15 |

**Recursos**: símbolos `b-*` del sprite; `i-saldo` (Efectivo usa un icono estructural como glifo); tokens `--fk-teja-*` (tamaños de teja); campos `color`/`texto` del catálogo pintan la teja vía estilo inline.

**Dependencias y relaciones**: `tejaMarca()` es el único render de teja (bancoAvatar delega); consumidores en tesorería (cuentas), gastos, compromisos (deudas/fijos), agenda. `sprite-sync.test.js` vigila biblioteca ↔ sprite ↔ catálogos; `TX.4` vigila categorías. El sync corre manual: tocar un `.svg` sin correr `python scripts/sync-sprite.py` no cambia la app.

**Riesgos**:

- **Herencia CSS a través de `<use>` (la trampa grande):** `.icon` pone `fill:none; stroke:currentColor; stroke-width:2.35` en el `<svg>` anfitrión y eso SE HEREDA hacia adentro del `<use>`. Todo elemento pintable de un logo a color debe declarar `fill` y `stroke` explícitos o recibe un contorno fantasma del color `texto` de la teja (pasó con Banco de Bogotá y Nequi, 2026-07-05; fix en `0f143f9`). Validador y guardarraíl lo exigen desde entonces.
- Logos a color (`data-fullcolor="true"`): el cuerpo se conserva byte a byte; su teja se pinta del color del propio fondo del logo; `texto` no pinta el glifo (solo el fallback de iniciales).
- IDs internos de gradiente deben ser únicos en todo el sprite (prefijo del slug, ej. `bbog-g0`); el sync lo verifica.
- `BANCOS_CO[].id` se guarda en `localStorage` (datos del usuario): **nunca renombrar ids**. Renombrar un archivo `.svg` publicado rompe el campo `simbolo` (breaking change; ver `ID_ANTERIOR` en el sync para preservar posición).
- El sync aborta sin escribir (`ErrorProduccion`) si un símbolo publicado perdería su archivo fuente; un archivo a medio pulir se excluye sin bloquear (`ErrorRecurso`).
- El sync (BR.5) reescribe archivos de `assets/svg/` en el disco cuando normaliza un export crudo (declaración XML, `id="Capa_1"`, comentario, `xlink:href`, `<g>` bare, IDs de degradado genéricos): correrlo puede dejar cambios sin commitear en la biblioteca, revisar `git status` después.
- Una `<image>` incrustada NUNCA se borra en silencio (ni en la normalización ni en la validación): se rechaza con error explicando la causa probable (capa de calco de Illustrator).
- No editar a mano el bloque generado de `index.html`.
- Todo cambio de assets en producción bumpea `CACHE_NAME` en `service-worker.js`.

**Cambios pendientes**: ninguno activo (iniciativa Biblioteca de recursos gráficos completa).

**Cambios realizados**:

- 2026-07-05 (BR.4, [ADR 027](../DECISIONS/027-logos-de-marca-a-color-excepcion-monocromo.md)): formaliza la excepcion de logo a color (`data-fullcolor`), su archivo autonomo y el color de teja.
- 2026-07-05 (BR.3, completa): 9 bancos y billeteras mas a color de un tiron, todos con la misma imagen de calco incrustada.
- 2026-07-05 (BR.5): el sync normaliza exports crudos de Illustrator antes de validar y reescribe el archivo.
- 2026-07-05 `0f143f9`: fix del contorno fantasma (stroke explicito + validador + guardarrail).
- 2026-07-05 `2b5ae36`: Nequi a color (monograma) y limpieza de exports crudos.
- 2026-07-05: Bancolombia y Banco de Bogota a color (`data-fullcolor`), sync extendido a degradados.
- 2026-07-05 (BR.2): `sync-sprite.py` mas guardarrail `sprite-sync.test.js`.
- 2026-07-05 (BR.1): biblioteca `assets/svg/` (100 simbolos extraidos mas plantillas).

**Observaciones**: regla de fidelidad absoluta (2026-07-05, orden directa de Esteban): todo SVG que él entrega es la versión oficial; cero contornos, sombras, efectos o reinterpretaciones agregados; si un logo necesita contraste se ajusta el contenedor, nunca el logo; recrear solo por motivos técnicos y visualmente idéntico. Formato de entrega: SVG siempre (fuente de verdad); PNG 512×512 de referencia opcional para logos a color (vara de comparación en la revisión en pareja). ADRs relacionados: 023 (iconografía), 025 (logos y tejas), 026 (biblioteca).

---

---

## Navegación v2: menú "Más" como hoja agrupada (NAV2.1, ADR 040) + capa global (DIS.6)

- **Objetivo**          : el menú "Más" del bottom nav móvil pasa de modal centrado con 7 tarjetas planas (ADR 024 D5) a hoja inferior agrupada: "Gestión del dinero" (Deudas, Mis cuentas, Movimientos, Me deben, Límites de gasto, Análisis), "Ahorros" (Fondo de emergencia, Metas, Apartados, Inversión) y fila final Ajustes + botón de tema. Tiles horizontales con teja de icono teñida por dominio; el tile de la sección activa se resalta con su tinte y borde. Séptima pantalla de la familia visual v2.
- **Estado actual**     : **iniciativa COMPLETA el 2026-07-14** (las 3 rebanadas el mismo día). NAV2.1a: hoja agrupada + tejas + tile activo + toggle de tema. NAV2.1b: marca "F" con degradado de acento reemplaza el 💚 del sidebar y el grupo de uso diario pierde el rótulo visible "Diario" (conserva `aria-label="Uso diario"`). NAV2.1c: el botón central "Registrar" pasa de círculo 46px a pastilla 50x38 con el degradado de acento, y el indicador activo del bottom nav pasa de 44% a 22px fijos. Badges de notificación diferidos (ADR 040 D6, decisión de producto pendiente de Esteban). **DIS.6 (2026-07-26)** cierra la auditoría de diseño de la capa global: el botón "Más" **nombra** la sección donde estás (mapa `SECCION_NAV`, hereda el color de dominio del `data-section` que le escribe `markActiveNav`), Movimientos gana entrada propia, el wizard de bienvenida deja de ser la única pantalla sin CSS y su hero pasa del 💚 a la marca "F", la marca entra a Inicio y suben a 44px el cierre de la hoja y las pestañas del hub.
- **Verificado contra** : commit de DIS.6 (2026-07-26).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Markup de la hoja (grupos, tiles, tema) | `index.html` | `#modal-mas`, `.mas-sheet`, `.mas-tile` | ~1290 |
| Presentación de hoja inferior (reutilizable) | `styles/modals.css` | `.modal-overlay--sheet`, `.modal--sheet` | ~207 |
| Tiles con teja por dominio + estado activo | `styles/modals.css` | `.mas-tile`, `.mas-tile__teja`, `.mas-tile.active` | ~270 |
| Botón de tema de la hoja | `styles/modals.css` + `index.html` | `.mas-sheet__theme` (acción `theme-toggle`) | ~330 |
| Marcado del tile activo | `modules/ui/shell.js` | `markActiveNav()` (selector `.nav-item, .mas-tile`) | ~85 |
| Sincronización de TODOS los toggles de tema | `modules/ui/shell.js` | `_syncThemeButton()` (`querySelectorAll`, swap `#i-moon`/`#i-sun`) | ~58 |
| Cierre al navegar (el botón de tema NO cierra) | `modules/ui/menu-mas.js` | `initMenuMas()` (click en `a[href]`) | ~20 |
| Resaltado del botón "Más" por sección | `modules/ui/shell.js` | `MAS_SECTIONS` (11 secciones con Movimientos) | ~18 |
| Marca "F" del sidebar (NAV2.1b) | `styles/layout.css` + `index.html` | `.sidebar__logo-mark` | ~41 |
| Pastilla "Registrar" + indicador fijo del bottom nav (NAV2.1c) | `styles/responsive.css` | `.nav-item__fab`, `.nav-item.active::before` (bloque móvil) | ~104, ~136 |
| Nombre, ícono y color de la sección en el botón "Más" (DIS.6/C3) | `modules/ui/shell.js` | `SECCION_NAV`, `_rotularMas()` | ~30, ~135 |
| Estado "Más ubicado" (DIS.6/C3) | `styles/responsive.css` | `.nav-item--mas-ubicado` (bloque móvil) | ~151 |
| Estilos del wizard de bienvenida (DIS.6/C1) | `styles/modals.css` | `.modal--onboarding`, `.onboarding__*` | ~444 |
| Marca "F" del wizard (DIS.6/C2) | `modules/ui/onboarding.js` | `_renderPaso1()`, `.onboarding__hero` | ~80 |
| Marca "F" en el perfil de Inicio (DIS.6/C4) | `styles/components/domain.css` + `index.html` | `.perfil-inicio__marca` | ~870 |
| Zonas táctiles de 44px de la capa (DIS.6/C5) | `styles/modals.css` | `.modal__close.mas-sheet__close` | ~242 (la mitad de `.hub-tabs__tab` se fue con DIS.18) |

**Dependencias y relaciones**: los tiles heredan `--fk-nav-text` del mapeo global `[data-section]` de `layout.css` (IV.2a): cero mapeo nuevo. Las clases `.menu-mas__*` NO se tocaron: siguen siendo el launcher vertical de la hoja "Registrar" (NAV.A2) y de los accesos de Inicio (IN.4a). `.modal-overlay--sheet`/`.modal--sheet` nacen reutilizables para futuros sheets.

**Riesgos**:

- **El bloque "MODAL EN MÓVIL: BOTTOM SHEET" de `modals.css` (≤480px) ya convertía TODOS los modales en hoja**: a ese ancho sus reglas (max-width 100%, translateY(100%) de entrada) pisan por orden a las de `.modal--sheet` en empate de especificidad, lo cual es deseado (full width y slide completo en teléfonos). Las reglas propias de `.modal--sheet` gobiernan de 481px hacia arriba. Si se ajusta una, revisar la otra.
- **El tinte del tile activo lleva texto en `--fk-text-primary`**, no el `-text` del dominio: sin riesgo AA por diseño (el color es decorativo). Si algún día el label activo se tiñe con el dominio, medir contraste contra el tinte (regla del 6% del bloque de abajo).
- `_syncThemeButton` sincroniza por `querySelectorAll`: cualquier toggle futuro debe ser checkbox o botón con `<use>` interno para que el swap de glifo funcione.
- **`markActiveNav()` escribe y borra el `data-section` del botón "Más"** (DIS.6/C3): de ahí sale su color. Si un flujo futuro lo deja escrito al salir del menú, el botón queda teñido con una sección que ya no es la vigente. El primer bucle de la función selecciona `.nav-item[data-section]`, así que el botón entra en él a partir de la segunda navegación: es inofensivo (el bucle llega a la misma conclusión), pero cualquier cambio de orden dentro de la función hay que leerlo con eso en mente.
- **Al sumar una sección al menú "Más" hay que tocar dos sitios**: `MAS_SECTIONS` (resaltado) y `SECCION_NAV` (nombre corto + ícono). Sin la segunda, el botón se resalta pero vuelve a decir "Más": no rompe nada y por eso pasa desapercibido.
- **`.modal__close` (32x32) se declara después de `.mas-sheet__close` en `modals.css` y con la misma especificidad**: el 44px del cierre de la hoja vive en el selector compuesto `.modal__close.mas-sheet__close` para no perder por orden (corolario de R23).

**Cambios realizados**:

- 2026-07-26 (DIS.6): auditoría de diseño de la capa global de navegación, 7 correcciones (C1 a C7). Reglas R29 a R33 en DESIGN_SYSTEM.md.
- 2026-07-14 (NAV2.1c): `.nav-item__fab` pasa a pastilla 50x38 con degradado de acento y sombra tokenizada; indicador activo del bottom nav a 22px fijos.
- 2026-07-14 (NAV2.1b): marca `.sidebar__logo-mark` nueva en `layout.css`; rotulo "Diario" retirado.
- 2026-07-14 (NAV2.1a): hoja agrupada completa.

**Observaciones**: ADR [040](../DECISIONS/040-navegacion-v2-visual.md); revisa el D5 del [ADR 024](../DECISIONS/024-reorganizacion-navegacion-movil.md), cuyo D4 (pestañas y consolidado repetido) lo supersede el [ADR 056](../DECISIONS/056-la-casa-de-ahorro.md): desde DIS.18 no hay pestañas y el grupo "Ahorros" de la hoja "Más" es una sola teja.

---

---

## Identidad de color por sección: nav + tejas de encabezado (IV.1/IV.2a/IV.2d, ADR 031)

- **Objetivo**          : la sección activa se identifica por el color de SU dominio (nav sidebar/bottom-nav, tejas de la hoja "Más") y cada encabezado de sección lleva una teja con el icono y el acento del dominio, para reconocer dónde se está sin leer el texto.
- **Estado actual**     : IV.1 (tokens `--fk-dom-*`) cerrada 2026-07-07. **IV.2a cerrada 2026-07-09**: despliegue en nav + encabezados (su capa de pestañas del hub la retiró DIS.18). **IV.2d, IV.2b e IV.2c cerradas el 2026-07-10** (misma jornada): migración `-text`, franja de modales + progreso por dominio, y calendario/Inicio (fijo→índigo, fondo teñido en vez de franja lateral, etiqueta de tipo en Inicio). **IV.2 completa.** Sigue IV.3 (números y estados) e IV.4 (iconografía dirigida post-color, condicionada a revisión visual), ver BOARD. **DV.1 cerrada el 2026-07-10** y **DV.2a cerrada el 2026-07-31** ([ADR 033](../DECISIONS/033-direccion-visual-premium.md) D1+D2, aceptado en P1/P2/P3/P5 el 2026-07-30): escala de elevación de 4 niveles (`.card`/`.bento__cell`/`.list-item` ganan sombra en reposo en ambos temas, doble capa tintada en claro) y `--fk-grad-identity` consolidado sobre el mismo mapeo `[data-dom]`/`[data-section]`: las 6 superficies que copiaban la fórmula a mano (`.hero-inicio`, `.score-hero`, `.hero-gastos`, `.hero-tesoreria`, `.hero-compromisos`, `.hero-agenda`) ahora la redeclaran localmente vía `--fk-section-color`/`--fk-grad-identity-stop`. **DV.2b cerrada el 2026-08-01** (D3 del ADR 033): pipeline de `scripts/sync-sprite.py` extendido a `assets/svg/decoracion/` (prefijo `d-`, viewBox propio), clase `.decor` teñida por `--fk-section-color`, patrón `--fk-pattern-dots`; piloto en 2 heroes (`.hero-inicio`, `.hero-tesoreria`) y 2 empty states (Metas, Deudas). **DV.2c cerrada el 2026-08-01** (D4 del ADR 033): cascada acotada de listas (`cardIn`, primeros 6 `.list-item`), resaltado de fila nueva (`.list-item--nuevo`) y retiro de `empty-orbit`/`empty-float`; catálogo cerrado de animación documentado en DESIGN_SYSTEM.md. Sigue DV.2d (ilustraciones, bloqueada), ver BOARD.
- **Verificado contra** : commit `680b0f0` (DV.2c, 2026-08-01).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Mapeo `--fk-nav-bg`/`--fk-nav-text` por sección | `styles/layout.css` | bloque `[data-section="X"]` | ~198 |
| Nav activo (sidebar + bottom-nav) teñido | `styles/layout.css` | `.nav-item.active`, `.nav-item[aria-current="page"]` | ~134 |
| Acento por sección, incluida la ruta nueva del fondo (DIS.18) | `styles/layout.css` | `[data-section="fondo"]`, mapeo `--fk-nav-bg`/`--fk-nav-text` | ~230 |
| Teja de encabezado de sección (reusa `.cat-teja`) | `styles/components/atoms.css` | `.section__icon.cat-teja` | ~249 |
| `.cat-teja` con color de texto correcto (`-text`) | `styles/components/atoms.css` | `.cat-teja`, `[data-dom="X"]` | ~221 |
| Iconos del launcher `.menu-mas__*` con color correcto (`-text`; desde NAV2.1a lo usan Registrar y accesos de Inicio, ya no el menú "Más") | `styles/modals.css` | `.menu-mas__item[data-section="X"] .icon` | ~144 |
| Markup de los 11 encabezados con teja | `index.html` | `.section__title-group` + `.section__icon` por sección | ~490-777 |
| Tejas de la hoja "Más" con `data-section` | `index.html` | `.mas-tile[data-section="X"]` | ~1370-1400 |
| Iconos/textos de Análisis (fondo, inversión) con `-text` (IV.2d) | `styles/components/analysis.css` | `.fondo-hero__icon`, `.fondo-hero__sub--ok`, `.fondo-hero__banner`, `.ahorro-habito__compromiso strong`, `.inversion-hero__icon`, `.inversion-hero__tipo-pct`, `.inversion-item__tipo` | ~604-885 |
| Iconos del tile de Registrar con `-text` (IV.2d) | `styles/modals.css` | `.registrar__tile[data-kind="X"] .icon` | ~220 |
| Título de nudge alto con `-text` (IV.2d) | `styles/components/nudges.css` | `.nudge-high .nudge__title` | ~91 |
| Badges de dominio: `-text` + fondo 6% en vez de 12% (IV.2d) | `styles/components/nudges.css` | `.dom-badge--*` | ~429 |
| Franja superior de 3px por dominio en modales de registro (IV.2b) | `styles/modals.css` | `.modal-overlay[data-dom] .modal::before` | ~68 |
| `--fk-section-accent` por dominio (compartida: franja de modal + progreso), variante `-text` (IV.2b) | `styles/modals.css` | `[data-dom="X"] { --fk-section-accent: var(--fk-dom-X-text) }` | ~80 |
| `data-dom="X"` en los 15 modales de registro con dominio propio | `index.html` | `.modal-overlay#modal-*` | ~812-1084 |
| Barra/anillo de progreso: estado por defecto teñido por sección, semántico intacto (IV.2b) | `styles/components/atoms.css` | `.progress-bar`, `.progress-ring-wrap` (no sus modificadores `--near`/`--complete`/`--warn`/`--danger`) | ~433, ~485 |
| `data-dom` en anillos/barras de progreso por vista | `modules/dominio/metas/view.js`, `apartados/view.js`, `ahorro/view.js`, `personales/view.js` (2), `analisis/view.js` (3 factores) | atributo `data-dom="X"` en el wrapper del anillo/barra | |
| Calendario: "fijo" en índigo propio (no amarillo prestado de Límites) | `styles/components/config.css` | `.cal-dot--fijo`, `.cal-detail__item--fijo`, `.cal-detail__icon--fijo` (todos `--fk-dom-agenda`) | ~774 |
| Calendario: tarjetas de evento con fondo teñido (reemplaza franja lateral AG.7) | `styles/components/config.css` | `.cal-detail__item--*` (`background: color-mix(..., 8%, --fk-bg-elevated)`) | ~910 |
| Inicio: etiqueta de tipo (`.dom-badge`) en Pendientes/Prioridades + fix del bug apartado→fijo | `modules/dominio/compromisos/views/dashboard.js` | `_tipoBadge()`, `cal-dot--apartado` (nuevo) | ~13 |
| `.dom-badge--agenda`/`.dom-badge--ahorro` (variantes nuevas, consumidas por Inicio) | `styles/components/nudges.css` | `.dom-badge--*` | ~429 |
| Forma decorativa `.decor` + patrón `.pattern-dots` (DV.2b) | `styles/components/atoms.css` | `.decor`, `.decor--top-right`, `.decor--bottom-right`, `.pattern-dots` | ~326 |
| Formas orgánicas draft, símbolos `d-*` (DV.2b) | `assets/svg/decoracion/` | `blob.svg`, `arco.svg`, `onda.svg` | |
| Piloto de `.decor` en los 2 heroes (DV.2b) | `index.html`, `modules/dominio/tesoreria/views/cuentas.js` | `<svg class="decor decor--top-right"><use href="#d-blob"/>` (hero-inicio), `d-onda` (hero-tesoreria) | |
| Piloto de `.pattern-dots` en los 2 empty states (DV.2b) | `modules/dominio/metas/view.js`, `compromisos/views/lista.js` | `_renderEmptyState()`, clase en `.empty-state` | |
| Cascada acotada de listas: primeros 6 `.list-item`, paso 35ms (DV.2c) | `styles/components/atoms.css` | `.list-item:nth-child(-n+6 of .list-item)` | ~90 |
| Resaltado de fila nueva: pseudo-elemento con tinte de dominio (DV.2c) | `styles/components/atoms.css`, `styles/base.css` | `.list-item--nuevo::after`, `@keyframes rowHighlightOut` | ~113, ~212 |
| Helper JS del resaltado, no-op bajo reduced-motion (DV.2c) | `modules/infra/animate.js` | `resaltarFilaNueva(el, dominio)` | |

**Recursos**: tokens `--fk-dom-X`/`-bg`/`-text` de los 11 dominios (`tokens.css`, overrides de `-text` en `themes.css`). Apartados comparte la familia menta de Ahorro (`--fk-dom-ahorro`, ADR 031 P4); Inicio y Ajustes no son dominios financieros (ADR 025 D6) y quedan monocromos (acento genérico).

**Dependencias y relaciones**: el mapeo de acento vive en selectores de atributo `[data-section="X"]` puros (sin acoplar a `.nav-item`), así que cualquier elemento futuro con ese atributo hereda el color automáticamente. `shell.js` (`markActiveNav`) sigue siendo el único que asigna `.active`/`aria-current`; esta funcionalidad es 100% CSS + markup estático, sin JS nuevo.

**Riesgos**:

- **Contraste texto vs. gráfico son estándares distintos** (hallazgo real de esta rebanada): un glifo (icono dentro de teja) es "graphical object" (WCAG 1.4.11, umbral 3:1); un nombre de sección en el nav es texto real (WCAG 1.4.3, umbral 4.5:1). Mezclarlos hace fácil pasar el umbral equivocado. La teja usa 14% de tinte (glifo, 3:1 de sobra); el nav activo usa **6%**, no el 12% de `--fk-dom-X-bg` (con 12%, el texto sobre su propio tinte caía a 4.22-4.46:1 en tema claro para varios dominios, verificado con la fórmula WCAG real, no a ojo: mismo método que IV.1). No reusar `--fk-dom-X-bg` para fondos que llevan el propio `-text` encima sin volver a medir.
- **Nunca usar el token crudo `--fk-dom-X` como `color` de texto o glifo significativo**: falla contraste en tema claro (el hueco que IV.1 ya había detectado y esta rebanada corrigió en `.cat-teja` y `.menu-mas__item .icon`, preexistente a IV.2a). Usar siempre `-text`.
- **`data-section="apartados"` mapea a `--fk-dom-ahorro`**, no a un token propio (no existe `--fk-dom-apartados`, decisión ADR 031 P4). Si se le da color propio en el futuro, es una decisión de producto, no un bug a "corregir".
- **`.dom-badge--*` llevaba texto real sobre un tinte de 12%** (IV.2d): con `-text` encima, ese fondo caía a 4.22-4.46:1 en tema claro (mismo hallazgo que el nav de IV.2a). Se bajó a 6%, verificado en el navegador: `.dom-badge--gastos` en claro resuelve `color: rgb(209,59,0)` (`--fk-dom-gastos-text`) sobre fondo al 6%. Regla para toda superficie nueva: si el contenido encima del tinte es texto, 6%; si es solo un icono/glifo, 12-14% está bien.
- **`--fk-nudge-high-accent`/`-bg`/`-border` (tokens.css) siguen apuntando al token crudo `--fk-dom-gastos`** a propósito (border/acento, no texto: 3:1 de sobra) y NO se tocaron en IV.2d; solo se corrigió `.nudge-high .nudge__title` (el único uso de ese color como texto). Si se agrega otro uso de `--fk-nudge-high-*` como `color` de texto, debe ir con `-text`, no con el token crudo.
- **Presupuesto/Límites (`_renderGrupoCard`, `presupuesto/view.js`) NO tiene `data-dom` a propósito**: su barra ya sigue un esquema de color por rol del ADR 019 (Necesidades = neutro siempre, nunca alarma; Ahorro = celebra al completar; Estilo de vida = alerta ámbar/rojo vía `_claseProgreso`). Agregar `data-dom="presupuesto"` tiñe TAMBIÉN el estado neutro de Necesidades con el ámbar de Límites, rompiendo esa neutralidad deliberada. Cualquier cambio aquí es una decisión de producto (coincide con LIM.1), no un "falta migrar".
- **El fondo de un progreso teñido por dominio necesita `-text`, no el token crudo**: a diferencia de una franja/borde decorativo (exento del umbral no textual porque no es la única vía de información), el relleno de una barra/anillo SÍ es la información y debe pasar WCAG 1.4.11 (3:1) en serio. El token crudo de varios dominios falla ese umbral contra el fondo del track en tema claro (medido: ahorro 1.88:1, personales 2.39:1, tesorería 2.65:1). Cualquier superficie nueva que use `--fk-section-accent` (o cualquier variable de dominio) como relleno de una barra/anillo/gráfico debe usar `-text`, reservando el token crudo para acentos puramente decorativos (franjas, bordes finos).
- **Verificación de `color-mix()` en tema claro: no alternar `body.classList` en caliente para medir, cargar la página ya con el tema puesto.** Alternar `document.body.classList.add('light-theme')` y leer `getComputedStyle(...).backgroundColor` en el mismo script (incluso separado por `requestAnimationFrame`) puede devolver un valor stale/incorrecto para propiedades que dependen de `color-mix()` con variables CSS (se observó `oklab()` con luminancia de tema oscuro justo después de alternar a claro), aunque las variables CSS en sí (`getPropertyValue('--fk-bg-elevated')`) sí se lean correctamente en el mismo instante. Esto NO afecta a producción (el tema se fija antes de que corra JS de la app, o se alterna vía un botón real con reflow de por medio, no de scripts de automatización síncronos); es una trampa solo para verificación en este entorno. Forma confiable de medir: `localStorage.setItem('fk_theme', 'light')` ANTES de `navigate()`, nunca alternar la clase después de cargada la página.
- **Entorno de desarrollo: el navegador cachea agresivamente los `.css`/`.js` servidos por `python -m http.server`** (sin `Cache-Control` explícito, cachea por heurística) y esto sobrevive a `Ctrl+Shift+R` vía automatización, a desregistrar el service worker, a limpiar `caches.keys()` y hasta a reiniciar el servidor y abrir una pestaña nueva. Si al verificar un cambio de CSS/JS en el navegador el resultado no refleja el archivo editado, antes de sospechar del código: `fetch(url, {cache:'reload'})` sobre los archivos tocados (fuerza revalidación real con el servidor) y RECIÉN DESPUÉS navegar/recargar. Confirmar con `document.styleSheets` recorriendo `rule.styleSheet.cssRules` en las `CSSImportRule` (los `@import` no aparecen en `cssRules` de primer nivel).
- **IV.2d excluyó a propósito Calendario e Inicio** (`.cal-dot--*`, `.cal-detail__icon--*` en `config.css`; `.vencidos-card__icon--*` en `domain.css`; `.prioridades-card__dot` en `compromisos/dashboard.js`, que reutiliza `cal-dot--*` para colorear su icono): esas superficies tienen el mismo patrón de token crudo sin migrar, pero viven en el alcance de **IV.2c** (calendario/inicio), que probablemente las rediseñe (teja + etiqueta de tipo). Migrarlas ahora sería trabajo duplicado si IV.2c cambia el markup.

**Cambios pendientes**: ninguno de IV.2, DV.2a, DV.2b ni DV.2c (completas). IV.3 (números y estados) e IV.4 (iconografía post-color) siguen en BOARD, igual que DV.2d. **DV.2c dejó el helper `resaltarFilaNueva()` listo pero sin consumidor**: ninguna vista todavía lo llama al guardar un registro; lo conecta la iniciativa v2 de cada sección cuando le toque (regla anti-sistema-paralelo del ADR 033). El teja de "Movimientos" (sub-vista de Inicio, sin dominio propio) y "Inicio"/"Ajustes" quedan deliberadamente sin teja/tinte. Presupuesto/Límites (`_renderGrupoCard`) quedó sin tinte de dominio en sus barras a propósito (ver riesgo abajo); si más adelante se decide integrarlo, coordinar con LIM.1.

**Cambios realizados**:

- 2026-08-01 (DV.2c, ADR 033 D4): cascada acotada de listas, resaltado de fila nueva (`.list-item--nuevo`), retiro de `empty-orbit`/`empty-float` y catálogo cerrado de animación en DESIGN_SYSTEM.md.
- 2026-08-01 (DV.2b, ADR 033 D3): pipeline de sprite extendido a `decoracion/` (`d-*`), clase `.decor` + `.pattern-dots`, piloto en 2 heroes y 2 empty states.
- 2026-07-31 (DV.2a, ADR 033 D1+D2): escala de elevación de 4 niveles (`--fk-shadow-sm` en reposo para `.card`/`.bento__cell`/`.list-item`, doble capa en `themes.css` claro) y `--fk-grad-identity` consolidado en los 6 heroes que lo copiaban a mano.

- 2026-07-10 (IV.2c): "fijo" pasa del amarillo prestado de Presupuesto al indigo propio de Calendario, resolviendo la ambiguedad que diagnostico el ADR 031; el detalle del dia abandona la franja lateral por fondo tenido.
- 2026-07-10 (IV.2b): `.progress-bar` y `.progress-ring-wrap` (unica fuente de progreso) tinen su estado por defecto con `--fk-section-accent`.
- 2026-07-10 (IV.2d): migracion de `color: var(--fk-dom-X)` al token `-text` en los usos restantes fuera de Calendario e Inicio.
- 2026-07-09 (IV.2a): nav y pestanas del hub tenidas por dominio; teja de icono y acento en los 11 encabezados de seccion.
- 2026-07-07 (IV.1, ADR 031): tokens `--fk-dom-*` con rampa `-bg`/`-text` para los 11 dominios.

**Observaciones**: ADR relacionado: [031](../DECISIONS/031-identidad-de-color-por-seccion.md). Metodología de verificación de contraste (heredada de IV.1, reforzada aquí): nunca aprobar un color "seguro" solo por inspección visual; calcular luminancia relativa y ratio WCAG real contra el fondo efectivo (incluyendo mezclas `color-mix`), y elegir el umbral correcto según si el contenido es texto (4.5:1) o gráfico (3:1).

---

## Transición de tema claro/oscuro (CFG.7, pendiente, con advertencia técnica)

- **Objetivo**          : Esteban percibe el cambio de tema como brusco ("parece que la página recarga"). Investigación ya hecha (no repetir): la transición suave YA existe (`theme-transitioning`, 280 ms, `styles/themes.css`) y su alcance actual (~30 contenedores, no `*`) es una decisión deliberada de rendimiento: animar `*` causaba lag perceptible en móvil (cientos de elementos x 5 propiedades) y se revirtió. Bajo `prefers-reduced-motion` el cambio es instantáneo a propósito.
- **Estado actual**     : pendiente de análisis, no iniciada. Tarjeta **CFG.7** en `docs/BOARD.md`. Antes de tocar nada: (1) reproducir la brusquedad en el dispositivo real de Esteban y descartar `reduced-motion` activo; (2) la dirección recomendada NO es "más transiciones CSS" (ya probado y revertido) sino la **View Transitions API** (`document.startViewTransition()`): el navegador compone un crossfade de snapshot en un solo paint, como mejora progresiva (Chrome/Edge/Safari 18+, Firefox cae al comportamiento actual). Cumple la restricción de rendimiento del ADR 031 D6.

**Archivos**: `modules/ui/shell.js` (`toggleTheme`), `styles/themes.css`.

**Depende de**: verificación en dispositivo real primero (mismo criterio de evidencia del ADR 030 D4).
