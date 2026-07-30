# Auditoría de jank móvil (2026-07-29)

> Auditoría multiagente de rendimiento. 6 agentes independientes recorrieron el código
> (renderizado/DOM, JS/main thread, CSS/composición, navegación/arquitectura,
> eventos/interacción, memoria/ciclo de vida) y un séptimo consolidó la comparativa
> móvil vs escritorio. Cada hallazgo cita archivo y línea.
> Pregunta a responder: por qué la app presenta jank en móvil y no en escritorio.
> Este documento no ejecuta cambios: es diagnóstico priorizado.

---

## Veredicto

Ningún hallazgo exclusivo de móvil explica el jank por sí solo. La brecha la producen
**multiplicadores de plataforma aplicados sobre una base de trabajo por interacción que
ya es desproporcionada en los dos dispositivos**. El escritorio no ejecuta menos trabajo:
tiene margen para absorberlo.

Dos ejes concentran la brecha:

1. **Paint y composición** (peso estimado ~40 % con el multiplicador de viewport y DPR).
   Efectos de pantalla completa en el camino crítico de la interacción más frecuente de
   la app. Es el eje que el harness actual **no puede medir por construcción**.
2. **CPU single-thread** (~45 %). El mismo JS, recálculo de estilo y layout corre 4-15x
   más lento en el Android de gama media/baja del usuario objetivo, sobre rutas cuyo
   costo base ya es alto.

El resto (arquitectura de arranque ~10 %, plataforma y memoria ~5 %) es real pero
secundario para la sensación de fluidez.

### Los multiplicadores, explícitos

- **CPU:** un Android de gama media rinde del orden de 1/4 a 1/6 de un portátil x86
  moderno en trabajo single-thread de DOM/JS; gama baja real cae a 1/8-1/15, y con
  throttling térmico o el hilo en un núcleo pequeño (big.LITTLE) el peor caso llega a
  ~1/20. **Rango de referencia de la industria, no una medición de este proyecto.**
- **GPU y ancho de banda:** el móvil objetivo comparte 10-17 GB/s de LPDDR4X entre CPU y
  GPU; un equipo de escritorio tiene 40-100 GB/s más VRAM dedicada. Para operaciones
  limitadas por fill rate el factor real está entre 5x y 30x.
- **Mecanismo específico de `backdrop-filter`:** las GPU móviles (Mali, Adreno, PowerVR)
  son tile-based deferred. `backdrop-filter` obliga a leer el resultado ya compuesto
  detrás del elemento, lo que rompe el pipeline de tiles y fuerza un resolve del
  framebuffer a memoria principal: exactamente la operación que esa arquitectura está
  diseñada para evitar. En una GPU de escritorio la misma lectura es casi gratis. Por eso
  el blur es la clase de efecto que peor traduce de escritorio a móvil.
- **Viewport y DPR:** un Android de 1080x2400 con DPR ~2,75 tiene ~2,6 millones de
  píxeles físicos; un portátil 1080p a DPR 1 tiene 2,07 millones. **El móvil pinta más
  píxeles reales que el escritorio con una fracción de la capacidad de pintarlos.**

### Evidencia de primera mano del propio repo

`styles/themes.css:92-98` documenta que la versión anterior de `.theme-transitioning`,
con selector `*`, "en desktop con GPU dedicada funcionaba, pero en mobile causaba lag
perceptible al forzar paint/composite en cada div, span, button e icono visible".

Es un incidente ya reproducido, del mismo código, con el mismo síntoma y en el mismo eje
(paint/composite, no JavaScript). Valida el mecanismo con evidencia interna, no con teoría.

---

## Corrección de una cifra antes de leer el resto

La consolidación inicial atribuyó al buscador de Movimientos un costo de 327 a 3.875 ms
por tecla. **Esa cifra es de `BASELINE.md` PERF.0, anterior al windowing**, y no describe
el código actual.

Ruta real verificada (`modules/dominio/movimientos/view.js:522-559`):

| Paso | Costo actual |
|---|---|
| `_todosLosMovimientos()` | memoizado (`view.js:30`, PERF.2): cache hit mientras se escribe, porque el estado no cambia |
| `filtrarMovimientos()` (`logic.js:189-200`) | **O(n) sin memoizar**, con `descripcionMovimiento()` + `toLowerCase()` construyendo un string por ítem, sobre ~11.000 movimientos a 10.000 gastos |
| `_agruparPorMes` + `_aplanarEntradas` | O(coincidencias) |
| `innerHTML = ''` + primer lote | ~8,2 ms planos (PERF.1 + PERF.7a) |

El hallazgo **sigue siendo válido y de prioridad alta** (una pasada O(n) con construcción
de string por ítem, por cada tecla, sin debounce), pero su magnitud es de decenas de ms en
CPU de escritorio, no de segundos. Escalado al móvil objetivo: del orden de cientos de ms
por tecla con historial grande. Grave, no catastrófico.

---

## Informe priorizado por impacto real en la fluidez

Los hallazgos se agrupan por causa raíz. Los IDs entre paréntesis son los de los agentes
originales; los duplicados entre agentes están fusionados.

### G1. Paint de pantalla completa en el camino crítico  ·  IMPACTO MÁXIMO

**Causa raíz:** efectos gráficos costosos aplicados a elementos que cubren el viewport
completo, disparados por las interacciones más frecuentes de la app.

| Qué | Dónde | Detalle |
|---|---|---|
| `backdrop-filter: blur(4px)` sobre `position: fixed; inset: 0`, transicionado con `opacity` | `styles/modals.css:9-25` | Se activa en **todo** `abrirModal()`/`cerrarModal()` (`modules/ui/modales.js:25-49`), sobre los 26 modales de `index.html`. El blur se recalcula por frame durante el fade, sobre la pantalla completa. Idéntico en móvil y escritorio: la diferencia la pone el hardware (A1-1, A3-2) |
| 9 reglas `filter: drop-shadow(0 0 8px color-mix(...))` | `styles/layout.css:648-655` y `:556` | Una por ícono de dominio del bento, todas visibles a la vez en el dashboard, la pantalla más visitada. `drop-shadow` opera sobre el canal alfa: más caro que `box-shadow`. Fuera de media query: aplica en ambos dispositivos (A3-6) |
| `.theme-transitioning` transiciona `box-shadow` en ~30 selectores con `!important` | `styles/themes.css:104-140` | `background-color`, `border-color`, `color` y `box-shadow` a la vez, en body, sidebar, topbar, bottom-nav, card, modal, nav-item, input, botón, chip y toast. `box-shadow` es la más cara de las cuatro. Alta intensidad, baja frecuencia. Precedente de lag móvil documentado en el propio archivo (A3-1) |
| Bottom-nav `position: fixed` + FAB con `linear-gradient` y `box-shadow 0 6px 16px` | `styles/responsive.css:173-190`, dentro de `@media (max-width: 1023px)` | Capa de composición permanente en toda pantalla. **Exclusivo de móvil**: adición gráfica que el escritorio no tiene (A3-10) |
| 24 `span.confetti-piece` `position: fixed` creados en un `for` síncrono | `modules/dominio/logros/index.js:184-224`, `styles/base.css:207-210` | 24 capas GPU nuevas de golpe, simultáneas a la animación de entrada del toast. Animan `transform`+`opacity` (correcto), pero el número de capas es el problema. Frecuencia muy baja (A1-8, A3-9) |

**Por qué encabeza la lista:** es el eje con el multiplicador móvil más alto y no lineal
(tile-based GPU x DPR x ancho de banda), afecta la interacción más repetida de la app
(abrir cualquier formulario), y es **invisible para `pnpm perf`**. Es el candidato que
mejor explica "en escritorio va bien y en el celular se siente pesado".

### G2. Trabajo O(n) por cada tecla  ·  IMPACTO MUY ALTO

**Causa raíz:** no existe ningún helper de debounce en el repo (verificado: las únicas
coincidencias de "debounce" están en `modules/core/storage.js`, referidas a `save()`).

| Qué | Dónde | Detalle |
|---|---|---|
| Buscador de Movimientos sin debounce | `modules/dominio/movimientos/index.js:39-43` | Cada `input` llama `renderMovimientosCompletos()`. Ver la tabla de la corrección: `filtrarMovimientos()` es la pasada O(n) no memoizada, con construcción de string por ítem (A1-4, A2-3, A5-1) |
| Asistente "Distribuir mi ingreso" sin debounce | `modules/dominio/tesoreria/acciones/distribucion.js:394-432, 668-679` | Cada tecla en cualquier input de monto dispara `_recalcularDistribucion()` vía listener delegado en `document`. Hace `panel.querySelectorAll('.distribuir__fila')` **dos veces** (líneas 272 y 302), más `querySelectorAll` en 323 y 365, y dentro de cada `map`/`filter` vuelve a llamar `fila.querySelector(...)`: hasta 4 consultas por fila, con 15-30 filas en un usuario activo (A1-3) |

**Por qué duele más en móvil:** el teclado virtual compite por el hilo principal en cada
pulsación. El síntoma percibido es retraso de caracteres al escribir, que es la forma de
jank más visible que existe. Nota de contraste: `save()` sí está debounced 200 ms
(`storage.js:17-23`); estas dos rutas no.

### G3. Render total por `innerHTML` sin patch incremental  ·  IMPACTO ALTO

**Causa raíz:** 37 ocurrencias de `el.innerHTML = ...` en los `view.js` de dominio, con
solo 2 excepciones que insertan de forma incremental (`movimientos/view.js:492,496`). No
hay diffing ni actualización por fila en ninguna parte.

| Qué | Dónde | Detalle |
|---|---|---|
| Tocar un día del calendario reconstruye el panel completo | `modules/dominio/agenda/view.js:181-191`, `agenda/index.js:73-83` | `_mostrarDia()` llama `renderAgenda()`, que reemplaza el `innerHTML` de `#panel-agenda`: hero, tarjeta de lote, cabecera, grilla del mes entero (hasta 31 botones con sub-spans, ~200-300 nodos) y panel de detalle. Solo cambió qué día está expandido (A1-2) |
| Cualquier alta, edición o baja de gasto reconstruye el mes visible | `modules/dominio/gastos/index.js:492-499`, `gastos/view.js:292-322` | `#lista-gastos` completo, agrupado por día. Registrar un gasto es la acción más frecuente de la app (A1-6) |
| Listas regeneradas enteras por cambio de un ítem | 11 dominios (`metas`, `apartados`, `personales`, `presupuesto`, `compromisos/views/lista.js`, etc.) | Solo Movimientos pagina (`TAMANO_LOTE = 50`), precisamente porque ya se midió que era el peor cuello: `movimientos/view.js:14-39` (A4-5, A4-6) |
| `renderBannerProposito` escribe en un nodo oculto | `modules/ui/proposito.js:92-96`, 31 call-sites en 11 dominios | Único render sin gate de `renderSmart`: hace `el.innerHTML` aunque la sección esté en `display: none` (A4-3) |

**Amplificación móvil:** cada reemplazo paga parse de HTML, creación de nodos, recálculo
de estilo, layout y paint. El recálculo se cobra por **todos** los nodos insertados, no
solo por los visibles, lo que conecta directamente con G4.

### G4. Recálculo de estilo relacional exclusivo de móvil  ·  IMPACTO ALTO (y solo en móvil)

**Causa raíz:** selectores `:has()` sobre filas de lista dentro de un media query de
ancho reducido.

| Qué | Dónde | Detalle |
|---|---|---|
| `.list-item:has(.list-item__meta)` y variantes `.personales-lista`, `.gastos-dia` | `styles/responsive.css:339-431`, **dentro de `@media (max-width: 539px)`** (verificado) | Recálculo relacional que el escritorio nunca paga. Se evalúa sobre todo el subárbol insertado por G3, no sobre las filas que caben en pantalla (A3-7) |
| +10 usos de `:has()` en componentes de lista | `atoms.css:201-202`, `config.css:1256-1257`, `forms.css:783-835`, `domain.css:136,1302` | Aplican en ambos dispositivos (A3-8) |

**Es el único grupo genuinamente exclusivo de móvil con impacto real.** Precisión
importante: bajo 539px la fila se reestructura a un grid de dos líneas, así que en móvil
hay **menos** filas visibles, no más. El costo no es el número de filas en pantalla: es
que el recálculo se paga por todos los nodos del subárbol.

### G5. `memo.js` aplicado a 4 de 18 dominios  ·  IMPACTO ALTO

**Causa raíz:** la técnica existe, está probada y medida (PERF.2 aplanó Análisis a 3-5 ms
sin importar el volumen), pero solo se usó en `analisis/view.js`, `logros/logic.js`,
`movimientos/view.js` y `resumen/view.js`. Los otros 14 dominios recalculan desde cero en
cada render y en cada re-entrada a la sección.

| Qué | Dónde | Detalle |
|---|---|---|
| Presupuesto: el mismo total, dos veces por categoría, sin memoizar | `presupuesto/logic.js:43-47, 69-86, 523-529` + `view.js:108, 427-434, 489-490` | `alertasLimites()` y `_renderEnvelope()` calculan cada uno `calcularProgreso()`, y cada uno reescanea `S.gastos` completo con `gastosMes()`. Con ~15 categorías y 10.000 gastos: ~300k iteraciones por render (A2-1) |
| Presupuesto: 4 pasadas más del contexto de distribución | `tesoreria/logic/distribucion.js:397-414, 493-500`, llamado desde `presupuesto/view.js:85` | `construirContextoDistribucion()` recorre `S.gastos` 4 veces (`gastosDelMes` + promedio variable de 3 meses) en cada render del panel (A2-2) |
| Gastos sin memo: 3 pasadas por render | `gastos/view.js:106-115, 135, 258-266, 298` + `logic.js:29-32, 94-96` | Mes visible, mes anterior para el comparativo, y `_mesTope()` que recorre **todo** el historial para saber hasta qué mes se puede navegar (A2-6) |
| Compromisos sin memo | `compromisos/views/lista.js:185` + `logic/abonos.js:149-157` | `fechaUltimoAbono()` recorre todo `S.gastos` por cada deuda saldada visible (A2-5) |
| `filter` dentro de `for` al abrir el asistente | `infra/vencimientos.js:453-460, 474-518, 608-611` | `obligacionesYAportesDelCobro()` recorre `S.gastos` completo por cada compromiso, dos veces (vencidas + en ventana) (A2-4) |
| `compromisos.find()` por gasto renderizado | `gastos/logic.js:448-456` + `view.js:441` | Acotado al mes visible (A2-7) |

**Tarea larga concreta:** `_renderResumenGrupos()` (`presupuesto/view.js:82-139`) suma
~34 pasadas O(gastos) sin memoizar en un solo render. Extrapolando desde `BASELINE.md`
(donde Análisis hacía ~15 pasadas por 20,4 ms a 10.000 gastos), esto son 70-100 ms de
cómputo en CPU de escritorio **antes** de construir el HTML: del orden de 0,4-1,2 s en el
móvil objetivo, en una tarea sincrónica no interrumpible. Presupuesto es hoy lo que era
Análisis antes de PERF.2, y nunca recibió ese tratamiento.

### G6. Fan-out de eventos sin guard  ·  IMPACTO MEDIO

| Qué | Dónde | Detalle |
|---|---|---|
| `logros` es el único dominio que no filtra por sección | `logros/index.js:31-36` | `EventBus.on('state:change', ...)` sin comprobar `section`: cada mutación de cualquier dominio corre `evaluarLogros(S)` (los agentes discrepan entre 17 y 20 evaluadores; irrelevante para el peso) sobre `S.gastos/compromisos/metas/cuentas/ahorro`, esté o no visible `#config`. Los otros 13 dominios sí filtran (A1-5, A4-2) |
| N emisiones síncronas de `state:change` por un tap | `tesoreria/acciones/distribucion.js:619` | `_SLICES_DISTRIBUCION.forEach(s => EventBus.emit('state:change', ...))`: cada emisión recorre los 15 suscriptores (A5-2) |
| 17 listeners de `hashchange` por navegación | `router.js:71` + 16 `dominio/*/index.js` | 16 terminan en una comparación de string. Costo de perf bajo; duplicación estructural alta (A4-8, A5-4) |

Contexto de amplificación medido: un solo `guardar('gastos', ...)` (`infra/crud.js:36-46`)
toca hasta 9 módulos. Gracias a `renderSmart` (`infra/render.js:74-77`) solo el visible
pinta DOM real: **la excepción es `logros`, y es una sola**.

### G7. Arranque eager  ·  IMPACTO MEDIO, NO MEDIDO

| Qué | Dónde | Detalle |
|---|---|---|
| Los 18 dominios y toda la UI se cargan al arrancar | `ui/bootstrap.js:22-63` | 112 archivos, 37.008 líneas parseadas y ejecutadas antes del primer paint útil, sin importar qué sección va a ver el usuario. **Cero `import()` dinámico en todo `modules/`** (verificado por grep). `service-worker.js` precachea 107 rutas con la misma estrategia (A4-1) |
| Cadena de arranque 100 % sincrónica | `ui/bootstrap.js:43-77` + `core/storage.js:452-470` | `loadData()` (`JSON.parse` de todo el estado) seguido de 17 `initXxx()` y `renderAll()` (A2-9) |

El móvil pierde dos veces: parse y compile más lentos, y sin caché de código en la primera
visita. **Nadie lo ha medido**: `docs/BOARD.md` (PERF.8) lo admite explícitamente,
"`pnpm perf` no mide `loadData()`... el muro real de largo plazo".

### G8. Serialización total del estado sin poda  ·  IMPACTO BAJO-MEDIO, YA DECIDIDO

| Qué | Dónde | Detalle |
|---|---|---|
| `JSON.stringify(S)` completo en cada `save()` | `core/storage.js:476-479, 514-540` | Medido en `BASELINE.md`: 0,4 / 2,3 / 4,8 ms (mediana) a 1k/5k/10k gastos. Escalado al móvil: decenas de ms por save, fuera del camino crítico del frame gracias al debounce de 200 ms (A2-10, A6-1) |
| Ninguna colección tiene tope ni poda por antigüedad | `core/state.js` | Grep de `podar/purge/trim/maxItems`: 0 resultados. Cada interacción cotidiana paga O(historial total), que crece mes a mes (A6-1) |
| `estadoCuota()` paga el mismo costo en modo lectura | `core/storage.js:508-512`, usado en `config/view.js:400` | `JSON.stringify(S).length` completo al abrir Ajustes (A6-1) |

**Ya diagnosticado y diferido a propósito por ADR 030.** Se incluye por completitud, no
como acción propuesta. Es degradación por volumen de datos del usuario a lo largo de
semanas, no por acumulación dentro de una sesión.

---

## El punto ciego del harness

`vitest.perf.config.js:10` fija `environment: 'happy-dom'`. **happy-dom no tiene motor de
estilo, ni layout, ni paint, ni compositor.** Por construcción, `pnpm perf` no puede ver:

1. **Recálculo de estilo.** No resuelve selectores contra el árbol. Los 49 usos de
   `:has()`/`:not()`, incluidos los 14 de `responsive.css` que solo existen bajo 539px,
   cuestan 0 ms en el harness. El costo móvil exclusivo de G4 es literalmente invisible.
2. **Layout.** Cero. Las cascadas de reflujo de un `innerHTML` de 200-300 nodos no aparecen.
3. **Paint y rasterizado.** Cero. Los 55 `box-shadow`, 18 gradientes, 11
   `filter`/`drop-shadow` y el `backdrop-filter` del modal no existen para el harness.
   **Todo el grupo G1 es indetectable por este benchmark.**
4. **Composición y capas.** Cero. Las ~10 capas `fixed`/`sticky`, la bottom-nav permanente
   de móvil y las 24 capas del confeti no se cuentan.
5. **Inserción real en el DOM.** El harness mide construir el string de HTML. El navegador
   además parsea, crea nodos, recalcula, hace layout y pinta: se mide la mitad barata.
6. **DPR.** No hay píxeles, así que el multiplicador 2-3x de la plataforma no puede aparecer.
7. **CPU.** Corre en la máquina del desarrollador: todas las cifras están divididas de
   fábrica entre 4 y 15 respecto al dispositivo real.
8. **Arranque.** `loadData()` no se mide (PERF.8).

`BASELINE.md` es honesto sobre esto ("Son costo de JavaScript... no el paint real del
navegador"), pero la frase que sigue, "el orden de magnitud y la tendencia con el volumen
se conservan", **solo vale para el eje JavaScript**. Ahí está el error de razonamiento:

> `pnpm perf` mide con precisión el único eje donde móvil y escritorio se diferencian por
> un factor lineal y modesto (CPU, 4-15x), y es ciego por construcción al eje donde se
> diferencian por un factor mayor y no lineal (paint y composición x DPR x arquitectura
> de GPU x ancho de banda). El jank móvil vive en los dos.

**Corolario operativo:** quitar el `backdrop-filter` del overlay **no movería ninguna
columna del baseline**. Optimizar solo contra esa tabla puede mejorar los números sin
mover el jank. La brecha no se cierra sin medir en dispositivo real, o al menos con
throttling de CPU 4-6x más los paneles Rendering y Layers de DevTools.

---

## Contradicciones y discrepancias resueltas

**`.skeleton`: refutado como causa.** Verificado por grep en todo el proyecto: `.skeleton`
aparece solo en `styles/components/atoms.css:390` (comentario) y `:408` (la regla). En
`index.html`: 0 coincidencias. En `modules/`: 0. La regla animaría `background-position`
(paint continuo, mal patrón) pero **nunca se instancia**: costo real cero en ambos
dispositivos. `.spinner` (`atoms.css:399`) y `.bento__cell--glass` con su propio
`backdrop-filter: blur(8px)` (`layout.css:488-492`) están en la misma situación: CSS
muerto. Deuda de limpieza, no causa de jank.

**`transition: width` en `.progress-bar`: degradado a impacto bajo.** `atoms.css:459-472`
declara las dos cosas: `animation: progress-fill` (línea 464, cuyo keyframe es
`transform: scaleX`, compositor, correcto) **y** `transition: width` (línea 465, que sí es
layout). El comentario de las líneas 467-469 describe solo el keyframe: es incompleto y
engañoso, no falso. Pero al verificar los call-sites, el hallazgo se cae en lo importante:

- `tesoreria/views/distribucion.js:237` y `views/cuentas.js:104` asignan `style.width` a
  `.distribuir-card__seg` y `.hero-tesoreria__compo-seg`, no a `.progress-bar`. Ninguna de
  esas dos clases declara `transition` (`domain.css:513-515` y `domain.css:1667-1673`).
- Donde sí se usa `.progress-bar` (`presupuesto/view.js:211` y `:504`), el ancho va dentro
  del `innerHTML`. Como el nodo es nuevo en cada render, no hay valor previo desde el que
  transicionar: **la transición prácticamente nunca dispara.**

Es el `innerHTML` total (el problema grande de G3) lo que neutraliza este problema
pequeño. Recomendación: borrar la línea 465 y corregir el comentario. No es causa de la brecha.

**Discrepancias menores entre agentes, sin efecto en el veredicto:** evaluadores de logros
17 contra 20 (no verificado; el problema es que corre siempre, no cuántos son);
`addEventListener` 113 contra 114; listeners de `hashchange` 15 contra 17. Y el
`getBoundingClientRect` de `acciones/cuentas.js:439-450` es una lectura seguida de tres o
cuatro escrituras de estilo, no una lectura simple como se describió: la conclusión (no es
thrashing, porque no hay bucle y corre una vez al abrir el dropdown) se sostiene igual.

---

## Lo que NO explica la brecha

Descartado con evidencia, para que nadie lo persiga.

1. **Fuga de memoria en móvil.** Falso. Cero `setInterval` en toda la app. Los 3
   `requestAnimationFrame` se cancelan vía `WeakMap`. El único `IntersectionObserver`
   (`movimientos/view.js:464`) hace `disconnect()` antes de cada nueva observación.
   `infra/memo.js` cachea **una** entrada por función, no un `Map` que crece. Los 26
   `EventBus.on` sin `off` son permanentes por diseño y se registran una vez. El desbalance
   de 114 `addEventListener` contra 6 `removeEventListener` está justificado: el nodo se
   reemplaza entero por `innerHTML` y el listener se va con su nodo (documentado en
   `movimientos/index.js:26-28`). Los modales dinámicos se destruyen con `overlay.remove()`.
   **En una sesión abierta nada crece de forma medible.**
2. **Eventos táctiles, gestos o scroll.** Falso, y es el hallazgo negativo más valioso de
   la auditoría: **cero** listeners de `scroll`, `touchstart/move/end/cancel`,
   `pointermove/up`, `mousemove`, `resize` y `wheel` en todo `modules/`. Cero
   `ResizeObserver`, cero `MutationObserver`, cero librerías de gestos. El único listener
   de puntero (`acciones/cuentas.js:540`) ejecuta un `contains()`. **Si hay jank al hacer
   scroll, no es JS bloqueando el hilo: es paint y composición** (G1, G4). Esto redirige la
   investigación al eje correcto.
3. **Layout thrashing.** Falso. Un solo `getBoundingClientRect` en toda la app, sin bucle.
4. **El router destruye y recrea secciones al navegar.** Falso. Las 15 secciones viven
   siempre en el DOM; la navegación es `classList.toggle('active')` con
   `display: none/block` (`layout.css:303-310`). `renderAll()` solo corre en el boot y al
   terminar el onboarding.
5. **Un evento y los 18 dominios repintan.** Falso. `renderSmart` (`render.js:74-77`) hace
   guard por sección. La excepción real es una sola: `logros` (G6).
6. **Abuso de `transition: all`, `will-change` o capas GPU forzadas.** Falso. Conteos
   duros: cero `transition: all`, cero `will-change`, cero `translateZ`, cero
   `backface-visibility`, cero gradientes radiales o cónicos, cero
   `style.setProperty('--...')` en runtime (el cambio de tema solo hace `classList.toggle`
   sobre `body`, así que no invalida variables en `:root`).
7. **Animaciones infinitas quemando la GPU.** Falso para skeleton y spinner: CSS muerto
   verificado. La única animación infinita realmente activa es `.empty-art__orbit` (40s) y
   `.empty-art__dots` (4s) en `atoms.css:338-352`, y **solo en empty states**: las
   pantallas donde el usuario todavía no tiene datos, no donde reporta el jank. Ya está en
   `docs/BOARD.md` como DV.2c.
8. **La animación del sidebar.** Imposible: `layout.css:826` abre
   `@media (prefers-reduced-motion: no-preference) and (min-width: 1024px)`. Es la única
   animación de layout de la app y **es exclusiva de escritorio**.
9. **`responsive.css` mete efectos gráficos caros exclusivos de móvil.** Falso más allá del
   FAB de la bottom-nav: no añade ningún `backdrop-filter`, `filter` ni gradiente nuevo.
10. **`localStorage` lento en Android.** Contribuye, no domina: 4,8 ms medidos a 10.000
    gastos, con debounce de 200 ms y fuera del camino crítico del frame.
11. **El service worker.** No: solo afecta la caché de red, fuera del hilo de interacción.
    `activate` sí borra las versiones viejas (`service-worker.js:243-254`).
12. **El motor del navegador móvil (WebView contra Chrome, Safari iOS).** Ningún agente
    aportó evidencia, y no hace falta: los mecanismos identificados explican la brecha sin
    invocar diferencias de motor.

Hallazgos reales pero irrelevantes para la fluidez: `a11y.js:98-117` (`querySelectorAll`
de focables por cada Tab, solo teclado físico); `a11y.js:72-91` (`trapFocus` con una sola
variable `_trapEl`, que rompe el foco con modales anidados: es bug de **correctitud**,
`compromisos/index.js:144`); `transferencias.js:122-133` (`outerHTML` sobre un subárbol de
2 selects); `service-worker.js:266-296` (handler `fetch` sin allowlist);
`transition: box-shadow` en `:hover`, que en `layout.css:736` está bajo
`@media (hover: hover)` y por tanto casi no aplica en táctil.

---

## Deuda estructural detectada de paso

No son causas del jank, pero sí condicionan cualquier trabajo futuro de rendimiento:

- **Sin contrato de ciclo de vida.** Cero `destroy`/`teardown`/`unmount` en `modules/`. Hoy
  no causa fugas solo porque cada `initXxx()` corre una vez y todo reset pasa por
  `location.reload()` (`config/index.js:105,211`). Cualquier reinicialización futura sin
  recarga duplicaría handlers para siempre, porque no existe `EventBus.off`
  (`core/state.js:450` documenta que las suscripciones duplicadas se permiten).
- **`docs/ARCHITECTURE.md:238-250` está desactualizado.** Dice que `state:change` solo lo
  escucha `render.js`, pero `render.js` no tiene ningún `EventBus.on`. Los suscriptores
  reales son 14 `dominio/*/index.js` más `infra/memo.js`. Un diagnóstico futuro que confíe
  en esa tabla busca en el lugar equivocado.
- **Los 16 patrones casi idénticos de "si el hash es X, renderiza"** en cada
  `dominio/*/index.js` son duplicación estructural; un dispatcher único en `router.js`
  eliminaría 16 listeners y el patrón repetido.
