# Changelog - Finko Claude

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-08)

### refactor(transversal): ARQ.2, consolidar los calculos duplicados que quedan · 2026-08-02

Hallazgo de la auditoria de UX/producto (2026-07-21), patron P7. Commit `94475e1`. Ficha: [`contexto/transversal.md`](contexto/transversal.md). Sin cambio de comportamiento en lo que se toco.

- **Punto 1, `FACTOR_MENSUAL`**: `infra/financiero.js` exporta `FACTOR_MENSUAL_INGRESO` (antes privada); `tesoreria/logic/ingresos.js` la reexporta como `FACTOR_MENSUAL` en vez de mantener una copia identica. Las tablas de 9 entradas de `compromisos/logic/modelo.js` y `ahorro/index.js` no se tocan: son otra tabla, duplicacion ya intencional por ADN #10.
- **Punto 2, helper "registrar pago de compromiso"**: nuevo `infra/pago-compromiso.js` (`gastoDePagoCompromiso()` + `bajarSaldoDeuda()`). Sustituye 4 copias, no las 3 que nombraba el hallazgo original: `compromisos/index.js` tenia dos (`_guardarAbono` y el listener `distribucion:aplicar`), mas el apply de `tesoreria/acciones/distribucion.js` y `agenda/index.js` (`_registrarPagosFijos`). El descuento de la cuenta de origen queda en cada caller (cada uno lo hace en un momento distinto, a proposito). Desbloquea la parte de deudas de CAL.5b.
- **Punto 3, analizado y NO tocado** (decision de Esteban): `totalesDelMes`/`totalDia` de Agenda y `_obligacionesEnRango` de `infra/vencimientos.js` ya divergieron en comportamiento (esta ultima topa una deuda a `saldoTotal`, BUG-004; Agenda no). Unificarlas de verdad seria cambio de comportamiento, no el refactor mecanico que pedia la tarjeta.
- 3608 unit + 253 E2E (1 flaky, paso en reintento; ajena, no relacionada) + lint verdes. SW v472 a v473.

### feat(actualizacion): UPD.1, aviso de version nueva + resumen de novedades · 2026-08-02

Commit `fbaeba6`. Ficha: [`contexto/transversal.md`](contexto/transversal.md).

- **Aviso discreto con boton "Actualizar ahora"** cuando el SW aplica una version nueva pero `sw-register.js` no pudo recargar solo (modal abierto o input con foco al momento del cambio): antes el usuario no tenia ninguna senal hasta la proxima recarga casual. El caso seguro (sin guardas activas) sigue recargando en silencio, sin cambios. `sw-register.js` es un `<script>` clasico y no puede importar `EventBus`; avisa via `CustomEvent('sw:actualizacion-lista')` en `document`, que `modules/ui/sw-aviso.js` escucha.
- **Resumen de novedades una sola vez tras actualizar**: catalogo `NOVEDADES_POR_VERSION` (`constants.js`, vacio por ahora, se llena a mano en cada release que lo amerite) comparado contra `config.ultimaVersionVista` (bump de schema v31 a v32, migracion idempotente). Un usuario nuevo o uno que migra arranca "al dia" con el catalogo vigente, nunca ve de golpe todo el historial acumulado.
- Ambos mecanismos son independientes entre si: el resumen de novedades corre en cada arranque sin importar si la version nueva entro por la recarga silenciosa o por el boton del aviso.
- 8 tests unitarios nuevos (`ultimaVersionNovedadesConocida`, migracion v31 a v32). Verificado en la app real: banner y modal de novedades probados de forma aislada (import directo de los modulos nuevos + evento simulado), dado que el bootstrap completo no pudo correr en vivo por una rotura pasajera y ajena de otra sesion en `infra/bolsas.js` (ya resuelta por esa sesion). 3608 unit + 253 E2E (1 flaky, paso en reintento) + lint verdes. SW v470 a v472 (bump compartido con EDIT.1/apartados, en curso en paralelo).

### feat(apartados): EDIT.1, editar sin destruir una reserva · 2026-08-02

Rebanada Apartados de **EDIT.1** (patrón P3 de la auditoría de UX/producto). Commit `5929836`. Ficha: [`contexto/apartados.md`](contexto/apartados.md). Inversión y Me deben siguen pendientes de la misma tarjeta.

- Botón "Editar" en la tarjeta abre el mismo modal de siempre con los datos actuales prellenados (nombre, ícono, monto objetivo, fecha objetivo, nota); las plantillas rápidas se ocultan en modo edición.
- `normalizarApartado(datos, apartadoExistente = null)` preserva `montoActual`, `recurrente` y `periodoMeses` del registro existente (no vuelven a pasar por el form) y recalcula `completado` contra el objetivo nuevo, mismo patrón que **EDIT.1a** validó en Metas.
- 17 tests unitarios nuevos (`normalizarApartado` en modo edición, `renderFormApartado` prellenado, botón Editar en la tarjeta). Verificado en la app real: crear, editar nombre/monto/fecha, y editar bajando el objetivo por debajo del acumulado (recalcula `completado` a `true` sin tocar el acumulado).
- 3600 unit + 252 E2E + lint verdes. SW v470 a v472.

### perf(rendimiento): PERF.7c, warm-up de derivaciones pesadas en idle · 2026-08-01

Cierra **PERF.7** completo. Commit `156aa88`. Detalle: [`scripts/perf/BASELINE.md`](../scripts/perf/BASELINE.md).

- `bootstrap.js`, tras `renderAll()`, agenda un `requestIdleCallback` (fallback `setTimeout` sin soporte, ej. Safari) que llama a `precalentarAnalisis()` y `precalentarMovimientos()`, nuevas en cada `view.js`. Ambas solo invocan los memos ya existentes de PERF.2 con los mismos argumentos que sus renders reales; no tocan el DOM.
- Sin infra nueva: los memos de 1 entrada ya cacheaban por firma de argumentos, así que precalentar en idle es solo llamarlos una vez antes de que el usuario navegue.
- 6 tests unitarios nuevos (3 por función: no lanza sin contenedor, no toca el DOM, precalentar no cambia el resultado del render posterior). 3583 unit + 253 E2E + lint verdes. SW v467 a v470 (bump compartido con DV.2b/DV.2c, en curso en paralelo).

### feat(diseno): DV.2c, cascada de listas + resaltado de fila + retiro de bucles infinitos · 2026-08-01

D4 del [ADR 033](DECISIONS/033-direccion-visual-premium.md), independiente de DV.2a/b. Ficha: [`contexto/sistema-visual.md`](contexto/sistema-visual.md). Commits `680b0f0`; la cascada, el resaltado y la doctrina de DESIGN_SYSTEM.md ya habían entrado sin atribución en `ac10202`/`b03ca88` (misma condición de carrera de staging concurrente con la sesión de DV.2b que también los afectó a ellos, ver `1e21397`).

- **Cascada acotada de listas**: `.list-item:nth-child(-n+6 of .list-item)` anima con `cardIn` los primeros 6 ítems de cualquier lista (paso 35ms, cola ≤175ms); el selector CSS4 `of S` cuenta solo hermanos de esa clase, así que un divisor intercalado (cabecera de mes en Movimientos) no corre el conteo. El resto de la lista aparece sin animar.
- **Resaltado de fila recién guardada**: clase `.list-item--nuevo`, pseudo-elemento `::after` con `--fk-row-highlight-bg` que se desvanece por `opacity` en 600ms (compositor, nunca `background-color`). Helper `resaltarFilaNueva(el, dominio)` en `infra/animate.js`: no-op bajo `prefers-reduced-motion`, reentrante por elemento. **Sin consumidor todavía**: ninguna vista lo llama al guardar; lo conecta cada iniciativa v2 por sección cuando le toque (regla anti-sistema-paralelo del ADR).
- **Retiro de `empty-orbit`/`empty-float`**: los dos bucles `animation-iteration-count: infinite` ambientales de los empty states contradecían el veto de animaciones permanentes del propio brief. Cero `infinite` fuera de `a11y.css` en todo `styles/` (auditado).
- **Catálogo cerrado de animación** documentado en `DESIGN_SYSTEM.md`: toda animación nueva necesita fila propia con su propósito, o no se implementa.
- 3583 unit + 251 E2E + lint verdes. SW v469 a v470.

### feat(dv2): DV.2b, riqueza visual piloto: formas orgánicas + patrón · 2026-08-01

D3 del [ADR 033](DECISIONS/033-direccion-visual-premium.md), desbloqueada al cerrar DV.2a. Ficha: [`contexto/sistema-visual.md`](contexto/sistema-visual.md). Commits `ac10202` + `1e21397` (el segundo repara un bloque CSS perdido por una escritura concurrente durante el cierre, ver mensaje del commit).

- **Pipeline extendido a `assets/svg/decoracion/`** (prefijo `d-`): a diferencia de `iconos/`/`logos/`, cada forma declara su propio `viewBox` (no forzado a 24×24) y `scripts/sync-sprite.py` lo preserva en el `<symbol>` generado; sin roles centinela, `fill="currentColor"` puesto a mano. Catálogo inicial de 3 formas draft que Esteban sobrescribe en Illustrator (ADR 026): `blob.svg`, `arco.svg`, `onda.svg`.
- **Clase `.decor`** (`styles/components/atoms.css`): posición absoluta, `z-index: -1`, opacidad 6%, teñida por `--fk-section-color` del hero anfitrión. El contenedor gana `overflow: hidden` + `isolation: isolate` para recortar la forma y contener el z-index negativo.
- **Token `--fk-pattern-dots`** (`styles/tokens.css`) + clase `.pattern-dots`: patrón CSS puro, sin asset, reservado a empty states/onboarding.
- **Piloto acotado (D3 del ADR): 2 heroes + 2 empty states.** `.hero-inicio` (`d-blob`) y `.hero-tesoreria` (`d-onda`); empty states de Metas y Deudas con `.pattern-dots`.
- `assets/svg/README.md` gana la sección 2.3 (`decoracion/`); `DESIGN_SYSTEM.md` gana "Riqueza visual". Guardarraíl `sprite-sync.test.js` actualizado con el mismo mapeo de prefijo. 3583 unit verdes (+7 del guardarraíl de sprite), E2E verde. SW v467 a v469.

### docs(diseno): DV.2a, cierre documental de tokens de superficie/elevación + degradado de identidad · 2026-08-01

El código entró en su propio commit (`d8a7d53`, 2026-07-31) sin cierre documental: tarjeta seguía en BOARD.md y sin entrada de changelog. Esta entrada lo repara. Ficha: [`contexto/sistema-visual.md`](contexto/sistema-visual.md).

- **Escala de elevación de 4 niveles** ([ADR 033](DECISIONS/033-direccion-visual-premium.md) D1): `.card`, `.bento__cell` y `.list-item` ganan sombra en reposo (`--fk-shadow-sm`) en ambos temas; en tema claro sube a doble capa tintada azul-tinta (contacto + ambiental).
- **Token `--fk-grad-identity` consolida el degradado** (D2) que 6 heroes copiaban a mano (`.hero-inicio`, `.score-hero`, `.hero-gastos`, `.hero-tesoreria`, `.hero-compromisos`, `.hero-agenda`): fórmula fija, `--fk-section-color` y `--fk-grad-identity-stop` parametrizables por superficie. Paradas 14/15/16% conservadas sin unificar (ya medidas, no se re-miden). Cada hero redeclara la fórmula localmente: un `var()` dentro de una custom property resuelve contra el elemento donde esa property se declara, no donde se consume.
- `docs/DESIGN_SYSTEM.md` ya había ganado la sección "Sombras y elevación" en el commit original. Sin cambios de código en este cierre, solo documental. SW ya estaba en v461 desde el commit original.

### feat(tesoreria): MC.13e-2f-2, decisión explícita del remanente al confirmar · 2026-08-01

Punto 18 del brief; **cierra MC.13e-2f completa** (la mitad del `cuentaId` cerró el 2026-07-30). Ficha: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md).

- **Las tres decisiones de UX de Esteban del 2026-07-30, tal cual.** Radiogroup de 3 opciones dentro del paso final "Estilo de vida" que ya existía, **sin preselección** (una opción marcada de entrada sería la respuesta de Finko, no la del usuario) y con "Distribuir" bloqueado hasta elegir: ni cuarto paso ni modal. La cifra es `sinAsignar`, lo que sobra del cobro, no `evBudget` del split. Y "ahorro"/"meta" **no abre ruta de apply nueva**: `_elegirDestinoRemanente` suma a la fila que el Paso 2 ya tiene, devuelve el foco ahí y la deja editable. Sin cambios en `logic/distribucion.js`: `resumirPlanDistribucion` ya devolvía `sinAsignar`.
- **Dos cosas que el diseño no cubría.** Sin fila de ahorro ni de meta donde ponerlo, la única respuesta posible sería "dejarlo": una pregunta de una sola respuesta es fricción, no decisión, así que el bloque no se renderiza y el asistente confirma como antes. Y elegir destino marca `data-editado` en la fila del fondo **aunque no sea la receptora**: sin eso, el automático de R3 le descontaría al fondo lo que se acaba de sumar a otra fila y el remanente nunca bajaría a cero.
- Guard en `_confirmarDistribucion` además del botón deshabilitado, mismo cinturón que el del déficit (MC.13e-2e). 5 E2E nuevos ([`distribucion-remanente.test.js`](../tests/e2e/distribucion-remanente.test.js)), incluido el camino hasta `localStorage`. Sin bump de schema. SW v466 a v467.

### feat(inicio): IN.9d, Accesos rápidos en fila propia, Resumen semanal y Actividad reciente en la fila final 6+6 · 2026-08-01

Cuarta rebanada de **IN.9** ([ADR 057](DECISIONS/057-inicio-en-escritorio.md) D4), cierra la iniciativa salvo IN.9e. Ficha: [`contexto/inicio.md`](contexto/inicio.md).

- **La fusión de Accesos rápidos + Actividad reciente (ADR 034 D7) queda acotada a móvil, igual que hizo IN.9c con el acordeón.** Mismo patrón: dos contenedores conviven en el DOM (`#accesos-actividad-movil` fusionado; `#panel-accesos-escritorio` span 4 en fila propia y `#panel-actividad-reciente-escritorio` span 6 junto a `#panel-resumen`), `_repartoAccesosActividad()` nuevo en `render.js` decide cuál se ve según el ancho (mismo umbral 1024px que `_enEscritorio()`). `accesos/view.js` y `movimientos/view.js` llenan las dos copias sin condicional; el reparto se llama después de los renders de dominio para no pisar el oculto por falta de movimientos que ya aplicó `movimientos/view.js`.
- **`#panel-resumen` no se duplica:** es la misma celda en los dos anchos, pasa de `bento__cell--full` a `bento__cell--half` (CSS responsive ya la vuelve span 1 en móvil) y recupera un título propio (`renderPanelResumen()`) porque el grupo con label externo que lo describía ahora también tendría que describir Actividad reciente, que no comparte tema. El gráfico semanal recupera la proporción con la que se diseñó (R79: 49px por barra a span 6 contra 177px que daba el span 12 anterior).
- **DOM = orden visual = orden de foco en los dos anchos, sin `order` de CSS** (mismo criterio que rechazó IN.9a D2 por WCAG 2.4.3): Accesos rápidos en fila propia se logra envolviendo su única celda en un `.bento__group` sin label (fuerza fila completa); Resumen y Actividad son celdas sueltas fuera de grupo, así el auto-flow del grid las empareja solas. En móvil, el grupo de Accesos y la celda de Actividad quedan `hidden` y el acordeón fusionado ocupa su lugar de siempre: el orden visible no cambia.
- 9 tests unitarios nuevos (`accesos.test.js`, `movimientos.test.js`, `render.test.js`, `resumen.test.js`) + 2 E2E (fusión móvil confirmada intacta a 390px, fila final 6+6 medida a 1280px). La medición de posición espera 600ms: la entrada del bento anima cada celda con delay escalonado (layout.css) y dos celdas en índices distintos miden "y" en puntos distintos de su propio slide-in si no se espera a que asiente. 3577 unit + 253 E2E + lint verdes. SW v465 a v466.

### feat(tesoreria): MC.13e-2c, logo/ícono + nota por fila en el asistente · 2026-08-01

El grueso (`_iconoDestino`/`_iconoNecesidad` con `bancoAvatar`/`resolverMarca`, render de `nota`, CSS de `.distribuir__saldo`) ya había entrado sin atribución en el commit `132b0b5` (MC.13e-2d). Ficha: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md).

- `Compromiso.nota` solo existía para `tipo='fijo'` con categoría predefinida (AG.4, doble uso del campo de texto); las deudas no tenían dónde guardarla. `renderFormDeuda()` gana el campo "Nota (opcional)" (mismo patrón que Meta/Apartado), `normalizarCompromiso()` lo guarda para `esDeuda()`.
- `.distribuir__nota` estaba usada en el HTML desde `132b0b5` sin regla propia (texto sin estilo); gana color muted + cursiva.
- Sin bump de schema (campo opcional, `undefined`-safe). SW a v465.

### docs(apartados): AP.5, cierre documental del form v2 y la recurrencia como toggle · 2026-08-01

El código entró como colateral del commit `ab8c9a1` (CAT.3a) sin su propio cierre; esta entrada lo repara. Ficha: [`contexto/apartados.md`](contexto/apartados.md).

- **Form v2** (`renderFormApartado()`): plantillas migradas de `.chip` a `chips-cat`/`chip-cat`, monto objetivo a `monto-hero`, campo "Nota" nuevo, footer `modal__footer--principal`. Resuelve el conflicto abierto del [ADR 042](DECISIONS/042-formularios-v2-visual.md) D9 (dropdown vs. chips): ganan los chips, la convención ya escrita del lenguaje v2.
- **Recurrencia fuera del registro inicial**: se retira el `<details>` "Este gasto se repite" (checkbox + `select` de periodo) del alta; se activa después con el botón "Hacer recurrente" que ya vivía en la tarjeta (`toggle-recurrente-apartado`).
- Sin bump de schema ni tests nuevos: `normalizarApartado()`/`validarApartado()` ya toleraban `recurrente`/`periodoMeses` ausentes, y `apartados.test.js` (167 tests) ya cubría el toggle y la ausencia de los campos retirados.

### docs(inicio): IN.9c, cierre documental de la columna propia del detalle por cuenta · 2026-08-01

Tercera rebanada de **IN.9** ([ADR 057](DECISIONS/057-inicio-en-escritorio.md) D3). El código entró como colateral del commit `ab8c9a1` (CAT.3a) sin su propio cierre; esta entrada lo repara. Ficha: [`contexto/inicio.md`](contexto/inicio.md).

- `#panel-cuentas-detalle`/`#cuentas-detalle-lista` (`index.html`) muestran el detalle por cuenta en una columna propia desde 1024px, y comparten `_filasCuentas()` (`render.js`) con el acordeón del hero, que a partir de ahora queda acotado a menos de 1024px (`_enEscritorio()`). La máscara de privacidad cubre las dos celdas juntas, extensión de IN.2 ya prevista en el ADR.
- Tests y bump de SW ya estaban en `ab8c9a1` (v463): `smoke.test.js` (E2E, columna de escritorio) y `render.test.js` (unit). Sin cambios de código en este cierre.

### fix(test): BUG-022, BUG-023 y BUG-024, suites que se ponían rojas según el día del mes · 2026-08-01

Encontrados al correr las compuertas de CAT.3a: **8 unitarios y 4 E2E rojos en HEAD**, verificados contra un stash completo del árbol. Ninguno es un defecto de la app: los tres son el **mismo patrón de fechas fijas** en los tests, que solo fallan los primeros días de cada mes.

- **BUG-022** (`renderPanelVencidos`, 6 tests): `DIA_PASADO` envuelve a módulo 28, así que el día 1 del mes devolvía 27, o sea el futuro. Sin vencidos, el panel salía vacío. Los dos describes fijan el reloj a mitad de mes, la convención que el propio archivo ya había adoptado para los tests de distancia exacta.
- **BUG-023** (chip TX.12b, 1 unitario + 2 E2E): el unitario fijaba fechas de junio contra la ventana de 60 días que `renderFormGasto` mide con el reloj real. El E2E sembraba con `isoHaceNDias`, correcto, pero la lista de gastos muestra el **mes en curso** y el día 1 toda fecha "hace N días" cae en el mes anterior: se topa en el día 1.
- **BUG-024** (gota del compromiso de ahorro): los aportes estaban fijos en julio y el medidor mide el mes en curso.
- **Colateral real de CAT.3a, no rot:** el E2E de TX.9b creaba una personalizada llamada "Gimnasio", que con el D4 nuevo ahora colisiona con `CATEGORIAS_AGENDA`. Renombrada a "Suplementos", igual que los unitarios equivalentes.

### feat(gastos): CAT.3a, modelo de categorías personalizadas globales · 2026-08-01

Primera de cuatro rebanadas del [ADR 058](DECISIONS/058-categorias-personalizadas-globales.md). Sin cambio visible en la app todavía. Ficha: [`contexto/transversal.md`](contexto/transversal.md).

- **Campo `seccion` en `S.categoriasPersonalizadas`** (D1): `'gasto' | 'fijo'`, backfill `'gasto'` en las existentes (bump de schema v30 a v31, migración idempotente).
- **Resolutora global de ícono** (D2): `iconoDeCategoriaGasto()` ahora también resuelve contra `CATEGORIA_AGENDA_ICONO`, no solo `CATEGORIA_ICONO`, antes de caer a la personalizada o al genérico `i-gastos`. Ignora la `seccion` a propósito: una superficie que pinta un movimiento no sabe, y no debe saber, de qué formulario salió el nombre.
- **`validarCategoriaPersonalizada` compara contra los dos catálogos nativos** (D4): `CATEGORIAS_GASTO` y `CATEGORIAS_AGENDA`. El nombre es único en toda la app, no por sección.
- El formulario de gasto sigue siendo la única fuente de personalizadas hasta CAT.3c: `gastos/index.js` estampa `seccion: 'gasto'` al crear.


---

## Meses anteriores

- [2026-07](changelog/2026-07.md)
- [2026-06](changelog/2026-06.md)
- [2026-05](changelog/2026-05.md)

---

## Convención de entradas

Cada entrada agrupa por fase/release y dentro lista commits con:
- **tipo(área)** - `commit_hash` · `archivos tocados` - descripción de qué cambió.

Tipos: `feat` (nueva funcionalidad), `fix` (bug), `refactor` (sin cambio funcional), `test`, `docs`, `chore` (config/build), `style` (formato).
