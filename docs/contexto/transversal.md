# Ficha de contexto: Transversal

> Funcionalidades que atraviesan varias secciones de la app (identidad visual, navegación, biblioteca gráfica, persistencia). Reglas de uso y plantilla en [`README.md`](README.md).

---

## Selector compacto de ícono (CAT.2, iniciativa transversal)

- **Objetivo**          : un solo componente reutilizable para elegir un ícono de categoría/entidad personalizada en cualquier formulario de la app: un recuadro (ícono elegido o placeholder vacío) que, al tocarlo, despliega una grilla colapsable de íconos; elegir uno cierra la grilla y actualiza el recuadro. Reemplaza el patrón de TX.9b (Gastos), que mostraba la grilla completa (29 íconos) SIEMPRE visible en cuanto se elegía "+ Otra categoría", invasivo en pantalla (punto del brief CAT.2). Seis consumidores identificados en el triaje: Gastos (ya tenía selección propia, TX.9b), Gasto fijo/Calendario (hoy sin ícono en "Otro", solo texto libre), Deudas (categoría "Otra"/"Otro" con ícono fijo `c-otros`, sin elección del usuario), Mis cuentas (banco "Otro" con fallback de iniciales "?", sin ícono elegible), Apartados y Metas (ambos con un `<input type="text" maxlength="4">` para pegar un emoji a mano, dependiente del selector de emojis del sistema operativo, Win+.).
- **Estado actual**     : **CAT.2a y CAT.2b CERRADAS (2026-07-13)**. CAT.2a: componente compartido `infra/icon-picker.js` (`renderIconoPicker`/`wireIconoPicker`/`resetIconoPicker`) construido y migrado como primer consumidor en **Gastos** (TX.9b), reemplazando la grilla siempre-visible por el recuadro colapsable. CAT.2b: **Metas** migrada (categoría "Otra"): el `<input type="text" maxlength="4">` para pegar un emoji a mano se reemplaza por el picker compartido; `meta.icono` ahora puede guardar un id de símbolo del sprite (elegido con el picker) O un emoji crudo (metas viejas, backward-compat sin bump de schema, ver Riesgos). Sin modal anidado a propósito (mismo criterio que TX.9b ya declaraba en su comentario original): un panel dentro del mismo formulario, no un overlay nuevo (evita además el bug latente de foco anidado que ya existe en los pickers dinámicos de `cuenta-helper.js`, cuyo `trapFocus`/`releaseFocus` es singleton, no una pila). **Pendientes** (rebanadas futuras, cada una con su propio análisis porque varias necesitan MÁS que solo el picker, ver "Cambios pendientes" abajo): CAT.2c (Apartados), CAT.2d (Deudas), CAT.2e (Cuentas), CAT.2f (Fijo/Calendario, la más grande: hoy no tiene ni creación de categoría personalizada).
- **Verificado contra** : commit de CAT.2b (2026-07-13).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Componente compartido: render puro (recuadro + panel + input oculto) | `modules/infra/icon-picker.js` | `renderIconoPicker(iconos, opts)` | |
| Componente compartido: wiring (abrir/cerrar panel, elegir ícono) | `modules/infra/icon-picker.js` | `wireIconoPicker(container, opts)` | |
| Componente compartido: reset externo (limpiar selección, ej. al ocultar el campo) | `modules/infra/icon-picker.js` | `resetIconoPicker(container)` | |
| Consumidor 1: form de gasto con categoría nueva | `modules/dominio/gastos/view.js` | `renderFormGasto()` (usa `renderIconoPicker`) | |
| Consumidor 1: wiring en el modal de gasto | `modules/dominio/gastos/index.js` | `_montarFormGasto()` (usa `wireIconoPicker`) | |
| Consumidor 2: form de meta, categoría "Otra" | `modules/dominio/metas/view.js` | `renderFormMeta()` (usa `renderIconoPicker`), `_iconoMeta()` (renderiza sprite-id o emoji legado) | |
| Consumidor 2: wiring + reset condicionado a la categoría | `modules/dominio/metas/index.js` | `_inyectarForm()` (usa `wireIconoPicker`), `_syncCategoriaMeta()`/`_nuevaMeta()` (usan `resetIconoPicker`) | |
| Catálogo de íconos para categoría personalizada (compartido; 29 íconos, reusado por Gastos y Metas) | `modules/core/constants.js` | `ICONOS_CATEGORIA_PERSONALIZADA` | ~493 |
| CSS del recuadro + panel colapsable + botones de la grilla | `styles/components/forms.css` | `.icono-picker-field`, `.icono-picker__recuadro`, `.icono-picker__vacio`, `.icono-picker__panel`, `.icono-picker__btn` | ~121 |

**Recursos**: reusa `iconoCategoria()` de `infra/icons.js` para pintar cada ícono (recuadro y botones de la grilla); ningún asset gráfico nuevo.

**Dependencias y relaciones**: `infra/icon-picker.js` no importa de ningún dominio ni lee `S` (recibe el catálogo de íconos y el valor actual por parámetro, mismo patrón que `cuenta-helper.js`/`renderSelectorCuenta`). Cada dominio consumidor pasa su propio catálogo de íconos (Gastos y Metas reusan `ICONOS_CATEGORIA_PERSONALIZADA`; futuros consumidores podrían pasar catálogos propios, a decidir por rebanada).

**Riesgos**:

- **El panel colapsable NO es un modal**: es un `<div hidden>` dentro del mismo formulario, alternado con `hidden`/`aria-expanded`. Decisión deliberada (ver Objetivo): un modal anidado reutilizaría `trapFocus`/`releaseFocus` de `infra/a11y.js`, que son **singleton** (una sola `_trapEl`/`_prevFocus` a la vez, no una pila). Los pickers dinámicos de `cuenta-helper.js` (`_mostrarPickerCuenta`, `_mostrarPickerMultiCuenta`) YA abren un modal anidado sobre un modal de registro abierto (ej. abono) y esto deja el trap de foco del modal exterior huérfano al cerrar el interior (el listener de `keydown` del panel exterior nunca se remueve porque `releaseFocus()` solo limpia el `_trapEl` más reciente): riesgo preexistente documentado aquí para no repetirlo, no corregido en esta rebanada (fuera de alcance de CAT.2).
- **`wireIconoPicker` debe llamarse en cada apertura del formulario, O una sola vez si el form es un singleton reusado.** Gastos re-renderiza el HTML completo en cada apertura (`_montarFormGasto`, depende de `S.cuentas`), así que re-adjunta los listeners cada vez. Metas inyecta el form UNA sola vez al arrancar (`_inyectarForm`, en `initMetas()`) y lo reutiliza: ahí `wireIconoPicker` se llama solo una vez, pero como `resetModal()` limpia el `.value` de los inputs sin tocar el estado VISUAL del picker (recuadro/panel/`aria-pressed`), cada consumidor de formulario-singleton debe llamar `resetIconoPicker()` explícitamente al reabrir (`_nuevaMeta`) para no arrastrar el ícono de la vez anterior.
- **Múltiples instancias del componente conviven en la página** (hallazgo real de esta rebanada, CAT.2b): con Gastos y Metas ambos migrados, hay 2 nodos `.icono-picker__panel` en el DOM al mismo tiempo (cada dominio inyecta su modal al arrancar la app, estén o no abiertos). Un selector Playwright/CSS **sin acotar al formulario** (ej. `page.locator('.icono-picker__panel')`) es AMBIGUO y falla; hay que acotar siempre al contenedor del formulario o al `[data-icono-picker="<id>"]` específico. Bug real encontrado y corregido en esta rebanada: el E2E de Gastos (TX.9b) usaba un locator global, roto en cuanto Metas sumó su propio picker a la página.
- **`meta.icono` con dos formatos posibles, sin bump de schema**: id de símbolo del sprite (`c-pesa`, elegido con el picker desde CAT.2b) o emoji crudo (metas viejas, creadas antes con el campo de texto libre de MT.3). `_iconoMeta()` distingue por el patrón `/^[a-z]-/` (ningún emoji real lo produce); si en el futuro se agrega un catálogo de íconos con otro prefijo de letra, revisar que esta regex lo siga cubriendo.
- **El catálogo de íconos es responsabilidad del consumidor**: `renderIconoPicker` no valida que el catálogo tenga sentido para el dominio (ej. Deudas necesitaría su propio catálogo de íconos de categoría, no necesariamente `ICONOS_CATEGORIA_PERSONALIZADA`); cada rebanada futura decide su catálogo al integrar.

**Cambios pendientes**:

- **CAT.2c (Apartados)**: reemplazar el `<input type="text" maxlength="4" placeholder="📦">` del nombre del apartado (`apartados/view.js`) por el picker. Mismo alcance que CAT.2b (form es un singleton reusado, según patrón de Metas, o se re-renderiza; verificar antes de decidir si necesita `resetIconoPicker` explícito).
- **CAT.2d (Deudas)**: hoy "Otra"/"Otro" (`CATEGORIAS_DEUDA`/`CATEGORIAS_DEUDA_PERSONAL`) mapea a un ícono FIJO `c-otros` (`CATEGORIA_DEUDA_ICONO`/`CATEGORIA_DEUDA_PERSONAL_ICONO`), sin elección del usuario: esta rebanada agrega la elección, no solo cambia la UI de una que ya existía.
- **CAT.2e (Cuentas)**: el banco "Otro" en `BANCOS_CO` cae al fallback de iniciales "?" (`tejaMarca`), sin ícono elegible. Igual que Deudas, agrega una capacidad nueva, no solo cambia la UI.
- **CAT.2f (Fijo/Calendario)**: la más grande. `renderFormGastoFijo()` (`agenda/view.js`) usa un catálogo fijo (`CATEGORIAS_AGENDA`) sin ningún mecanismo de categoría personalizada (a diferencia de Gastos, TX.9b): "Otro" hoy es solo texto libre en el campo de descripción, sin ícono. Antes de picker, esta rebanada necesita decidir SI Fijo adopta categorías personalizadas (coordina con **CAT.1**, taxonomía Gastos↔Fijos, que puede cambiar qué categorías existen en cada catálogo) o si el picker se ofrece solo para el ícono de "Otro" sin nombre personalizado. Requiere análisis propio antes de codificar.

**Cambios realizados**:

- 2026-07-13 (CAT.2b): Metas migrada como segundo consumidor. `infra/icon-picker.js` gana `resetIconoPicker(container)` (limpia input + recuadro + panel + `aria-pressed`) y el input oculto pasa a tener `id` propio (`id="${id}"`, igual al `id` del picker) para que consumidores externos puedan direccionarlo. `metas/view.js`: el `<input type="text" maxlength="4">` de MT.3 se reemplaza por `renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'meta-icono', ... })`; `_iconoMeta()` ahora distingue sprite-id (`/^[a-z]-/`) de emoji crudo legado para no romper metas viejas. `metas/index.js`: `wireIconoPicker` en `_inyectarForm()` (el form de Metas es un singleton reusado entre aperturas, a diferencia de Gastos); `_syncCategoriaMeta()` usa `resetIconoPicker` en vez de limpiar el input a mano; `_nuevaMeta()` resetea el picker explícitamente porque `resetModal()` limpia valores pero no el estado visual del componente. **Bug real encontrado y corregido**: el E2E de Gastos (TX.9b) usaba un locator Playwright sin acotar (`page.locator('.icono-picker__panel')`), que se volvió ambiguo en cuanto Metas sumó su propio picker a la página (ambos modales están inyectados en el DOM desde el arranque); acotado a `form.locator(...)`. 5 tests unitarios nuevos (`icon-picker.test.js`: `resetIconoPicker` + id del input) + 2 en `metas.test.js`; 2 E2E de `smoke.test.js` reescritos al nuevo flujo (recuadro + grilla en vez de `.fill()` en un input de texto). 2548/2548 unit + 183/183 E2E completos + lint verdes. SW v375→v376.

- 2026-07-13 (CAT.2a): componente compartido `infra/icon-picker.js` nuevo (`renderIconoPicker`, `wireIconoPicker`); Gastos (TX.9b) migrado como primer consumidor: `gastos/view.js` reemplaza la grilla inline por `renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, ...)`; `gastos/index.js` reemplaza el listener manual por `wireIconoPicker(...)`. CSS: `.icono-picker` (grilla, siempre visible) se re-arquitecturó en `.icono-picker-field` (wrapper) + `.icono-picker__recuadro` (swatch, borde punteado cuando vacío) + `.icono-picker__vacio` (placeholder "+") + `.icono-picker__panel` (la grilla, ahora colapsable) + `.icono-picker__btn` (sin cambios, mismo nombre de clase para no romper la cuenta de botones en tests). E2E `smoke.test.js` (TX.9b) actualizado: toca el recuadro antes de elegir un ícono. Sin cambios de schema ni de lógica de negocio (`validarCategoriaPersonalizada` intacta). 8 tests unitarios nuevos (`icon-picker.test.js`) + 1 nuevo en `gastos.test.js`. 2541/2541 unit + E2E `smoke.test.js` (TX.9b) verde + lint verdes. SW v374→v375.

---

## Persistencia y salvaguarda de cuota (localStorage)

- **Objetivo**          : todo el estado vive en `localStorage` bajo la clave única `fk_v1` (ADN 3). `save()` está debounced 200 ms; `_flush()` serializa `S` entero y escribe. Una salvaguarda avisa antes de llenar la cuota y evita que un guardado fallido se pierda en silencio (ADR 030).
- **Estado actual**     : estable. **PERF.4** ([ADR 030](../DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md), 2026-07-06) decidió **no** reescribir la persistencia (el costo de guardar es ~5 ms debounced, medido en `scripts/perf/`) y en su lugar agregó la salvaguarda de cuota. **IndexedDB** queda como dirección futura (**PERF.5** en BOARD, no iniciar sin un disparador del ADR 030 D4). Partir `localStorage` por clave está **rechazado** (no sube la cuota).
- **Verificado contra** : `5039a76` (2026-07-06, PERF.4).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Guardado debounced + flush | `modules/core/storage.js` | `save()`, `_flush()`, `_flushNow()` | ~430 |
| Evaluación de cuota (pura) | `modules/core/storage.js` | `evaluarCuota()`, `LIMITE_LOCALSTORAGE_CHARS` | |
| Estado de cuota actual (mide S) | `modules/core/storage.js` | `estadoCuota()` | |
| Aviso en Ajustes | `modules/dominio/config/view.js` | `_renderAvisoAlmacenamiento()` (en `_renderDatos`) | |
| Escucha de eventos + anuncio | `modules/dominio/config/index.js` | `EventBus.on('storage:error')`, `on('storage:cuota')` | |
| Restaurar backup (escribe el blob crudo) | `modules/dominio/config/index.js` | `_importarDatos()` | ~42 |

**Dependencias y relaciones**: `_flush()` emite `state:save` (éxito), `storage:cuota` (al cruzar de nivel de uso) y `storage:error` (guardado rechazado). `config/` los escucha para avisar. `infra/memo.js` (PERF.2) escucha `state:change`, no estos. Exportar backup (`config/_exportarDatos`) usa `JSON.stringify(S)` en memoria: es independiente del layout de storage.

**Riesgos**: `LIMITE_LOCALSTORAGE_CHARS` (4.5 M chars) es un piso conservador, no el cupo exacto (varía por navegador); por eso `falloUltimoGuardado` (fallo real) manda sobre la estimación. Si algún día se migra a IndexedDB (PERF.5), `loadData()` pasa a async → bootstrap async, y el sembrado E2E (escribe `fk_v1`) hay que reescribirlo: es el cambio de mayor riesgo del proyecto.

**Cambios realizados**: `2026-07-06 (PERF.4, ADR 030)`: salvaguarda de cuota + guardado que ya no falla en silencio (detalle en CHANGELOG).

---

## CTA "necesitas una cuenta" (registro bloqueado por falta de cuenta)

- **Objetivo**          : cuando el usuario intenta registrar un ingreso, un gasto o un abono sin ninguna cuenta activa, el mensaje no se limita a informar el requisito: ofrece una acción única que lo lleva directo a crear la cuenta (cierra el modal actual, navega a Mis cuentas y abre el formulario de nueva cuenta). Reduce la fricción del onboarding: si falta un requisito, se guía a resolverlo, no solo se avisa.
- **Estado actual**     : unificado (2026-07-06). Un solo mecanismo: `data-action="ir-a-crear-cuenta"` → EventBus `'cuenta:crear'` → `_nuevaCuenta` abre `#modal-cuenta`. Copy común "Crear una cuenta" en los 5 puntos de entrada. Antes cada surface hacía algo distinto: ingreso puntual solo cerraba el modal (bug: no navegaba), gastos navegaban sin abrir el form, el abono era un callejón sin salida ("Cerrar").
- **Verificado contra** : `9eaeb4d` (unificación del CTA, SW v329), 2026-07-06.

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Acción unificada (cierra modal + navega + emite evento) | `modules/ui/actions.js` | `registrarAccion('ir-a-crear-cuenta', ...)` | ~91 |
| Suscripción que abre el form de nueva cuenta | `modules/dominio/tesoreria/acciones/cuentas.js` | `EventBus.on('cuenta:crear', _nuevaCuenta)` en `initAccionesCuentas()` | ~478 |
| Modal guiado de flujos de un clic (0 cuentas) | `modules/infra/cuenta-helper.js` | `_mostrarGuiadoCero()` (botón `data-role="ir"`) | ~206 |
| Empty state Nuevo ingreso | `modules/dominio/tesoreria/views/ingresos.js` | `renderFormIngresoPuntual()` (rama `cuentas.length === 0`) | ~234 |
| Empty state Gasto (rápido y completo) | `modules/dominio/gastos/view.js` | `renderFormGastoRapido()`, `renderFormGasto()` | ~320, ~392 |
| Empty state Abono a deuda | `modules/dominio/compromisos/views/formularios.js` | `renderFormAbono()` (rama `cuentas.length === 0`) | ~37 |

**Recursos**: ninguno gráfico propio; reusa `#modal-cuenta` (form de nueva cuenta, estático en `index.html`), la clase `.form-empty`/`.empty-state` y los botones estándar.

**Dependencias y relaciones**: `ir-a-crear-cuenta` vive en el shell (`ui/actions.js`), que no importa dominios; se comunica con tesorería por EventBus (ADN 10). `cuenta-helper.js` (infra) emite el mismo evento tras navegar, sin importar `ui` (evita invertir el layering infra→ui). El helper `_mostrarGuiadoCero` lo disparan `resolverCuenta`/`resolverPago*` cuando un flujo de un clic (Marcar pagado, confirmar gasto multi-cuenta, aportar a meta/apartado) detecta 0 cuentas: todos esos flujos heredan la mejora sin tocarlos. La regla de cuenta única (patrón 0/1/varias) sigue viviendo en `cuenta-helper.js`.

**Riesgos**:

- El evento `'cuenta:crear'` abre `#modal-cuenta`, que es estático en `index.html`: funciona aunque la sección tesorería aún no se haya renderizado. Si ese modal se moviera o renombrara, el CTA quedaría mudo (solo navegaría). `_nuevaCuenta` usa guardas `if (el)`, así que con el DOM incompleto no rompe, solo no abre.
- Orden en `ir-a-crear-cuenta`: cerrar el modal actual (libera foco + quita `inert`) ANTES de abrir `#modal-cuenta` (atrapa foco + `inert`), mismo patrón que `registrar-abrir`. El `navigate('tesoreria')` dispara `hashchange` async; su intento de mover el foco a `#sec-tesoreria` es no-op porque el fondo queda `inert` con el modal abierto.
- Los `<a href="#tesoreria">` de los empty states conservan el href como fallback semántico, pero `dispatch()` hace `preventDefault()`: la navegación real la hace la acción, no el href.

**Cambios pendientes**: ninguno.

**Cambios realizados**:

- 2026-07-06: unificación del CTA. Nueva acción `ir-a-crear-cuenta` + evento `'cuenta:crear'`; los 5 empty states/modales convergen en el mismo copy y comportamiento. Corrige el bug reportado (Nuevo ingreso solo cerraba el modal con "Entendido", sin navegar) y el callejón sin salida del Abono ("Cerrar" sin acción). SW v328 → v329. Tests: 2 unit nuevos (`tesoreria.test.js`: empty state + evento abre modal) + 2 E2E nuevos (`registrar-sheet.test.js`: ingreso y gasto sin cuentas → form de nueva cuenta); `gastos.test.js`/`compromisos.test.js` actualizados al copy nuevo.

**Observaciones**: el mismo principio ("no informar un requisito sin ofrecer la acción para resolverlo") aplica a futuros bloqueos; si aparece otro requisito duro (ej. registrar un abono sin deudas, aportar sin metas), replicar el patrón antes que dejar un mensaje muerto.

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

- 2026-07-05: BR.4, [ADR 027](../DECISIONS/027-logos-de-marca-a-color-excepcion-monocromo.md) formaliza la excepción de logo a color (`data-fullcolor`): cuándo aplica (D1), archivo autónomo conservado byte a byte (D3), color de teja = color del propio fondo del logo (D4), guardarraíl de `fill`/`stroke` explícitos (D5), IDs de degradado prefijados (D6) y convivencia con la fidelidad de ADR 025 (D7). Amplía [ADR 025](../DECISIONS/025-logotipos-de-marca-y-tejas.md) D2. Solo doc, sin cambio de código ni bump de SW.
- 2026-07-05: BR.3 completa. 9 bancos/billeteras más a color de un tirón (Davivienda, BBVA, Banco Popular, Scotiabank Colpatria, DaviPlata, Lulo Bank, Nubank, Banco de Occidente, AV Villas), todos con la misma imagen de calco incrustada de Illustrator retirada. DaviPlata/Davivienda con degradado en español (`Degradado_sin_nombre_N`, regex de BR.5 ampliado); Banco de Occidente con fondo de mosaico de polígonos (no rect plano). Color de teja para los 3 casos sin fondo plano elegido por coincidencia exacta en al menos 2 esquinas (verificado con muestreo de píxeles en canvas). 3 tests migrados de Davivienda (ya con glifo) a "Otro"/"ChatGPT" como nuevos ejemplos del fallback de iniciales.
- 2026-07-05: BR.5, el sync normaliza exports crudos de Illustrator antes de validar (declaración XML, `id="Capa_1"`, comentario, `xlink:href`, `<g>` bare, IDs de degradado genéricos en inglés y español, `data-name`) y reescribe el archivo limpio en `assets/svg/`.
- 2026-07-05 `0f143f9`: fix del contorno fantasma (stroke explícito + validador + guardarraíl + README 6b).
- 2026-07-05 `2b5ae36`: Nequi a color (monograma) + limpieza de exports crudos.
- 2026-07-05: Bancolombia y Banco de Bogotá a color (`data-fullcolor`), sync extendido a degradados.
- 2026-07-05: BR.2 `sync-sprite.py` + guardarraíl `sprite-sync.test.js`.
- 2026-07-05: BR.1 biblioteca `assets/svg/` (100 símbolos extraídos + plantillas).

**Observaciones**: regla de fidelidad absoluta (2026-07-05, orden directa de Esteban): todo SVG que él entrega es la versión oficial; cero contornos, sombras, efectos o reinterpretaciones agregados; si un logo necesita contraste se ajusta el contenedor, nunca el logo; recrear solo por motivos técnicos y visualmente idéntico. Formato de entrega: SVG siempre (fuente de verdad); PNG 512×512 de referencia opcional para logos a color (vara de comparación en la revisión en pareja). ADRs relacionados: 023 (iconografía), 025 (logos y tejas), 026 (biblioteca).

---

## Sistema de logros (dominio `logros`)

- **Objetivo**          : gamificación ligera de hábitos: catálogo de logros con evaluación automática, toast con confetti al desbloquear y vitrina de solo lectura al final de Ajustes.
- **Estado actual**     : estable. **Logros v2 en curso** ([ADR 032](../DECISIONS/032-logros-v2-niveles-y-habitos.md) Aceptada el 2026-07-09): LG.2b (2026-07-09) y **LG.2c cerrada el 2026-07-12** (rachas de constancia + familia deudas saldadas, SW v354); siguen LG.2d (mudanza a Análisis+Inicio; su bloqueo por IN.8 ya se levantó el 2026-07-12, sigue esperando solo a ANL.1) y LG.2e (comportamiento), ver BOARD. Catálogo: 17 logros (antes 11).
- **Verificado contra** : commit de LG.2c (2026-07-12).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Catálogo (17 logros; familias `registro` 6 niveles, `metas` 1, `deudas` 2) | `modules/dominio/logros/logic.js` | `LOGROS` | ~150 |
| Metadata de familias (nombre por familia) | `modules/dominio/logros/logic.js` | `FAMILIAS` | ~47 |
| Derivación "mes completo de registro" (D3, ≥3 semanas del mes) | `modules/dominio/logros/logic.js` | `mesCompleto()`, helper interno `_semanasPorMes()` | ~91 |
| Racha de meses completos consecutivos (memoizada por gastos) | `modules/dominio/logros/logic.js` | `rachaMesesCompletos()`, `_rachaMesesCompletosMemo` | ~105, ~128 |
| Conteo de deudas saldadas (excluye consolidadas) | `modules/dominio/logros/logic.js` | `deudasSaldadas()` | ~141 |
| Evaluación (ids cumplidos ahora, try/catch por logro) | `modules/dominio/logros/logic.js` | `evaluarLogros()` | ~329 |
| Estado render-ready de la vitrina (incluye familia/nivel) | `modules/dominio/logros/logic.js` | `estadoLogros()` | ~362 |
| Agrupación por familia (una tarjeta por familia) | `modules/dominio/logros/logic.js` | `agruparVitrina()` | ~417 |
| Nivel de usuario derivado del conteo (nombres provisionales) | `modules/dominio/logros/logic.js` | `nivelUsuario()`, `NIVELES_USUARIO` | ~473 |
| Detección + persistencia + toast (cola de a uno) | `modules/dominio/logros/index.js` | `_checkYMostrar()`, `_encolarToast()` | ~59, ~97 |
| Confetti (24 piezas, ajuste mobile por bottom-nav) | `modules/dominio/logros/index.js` | `_lanzarConfetti()` | ~193 |
| Vitrina en Ajustes (agrupada + nivel en el encabezado) | `modules/dominio/logros/view.js` | `renderPanelLogros()`, `_renderFamiliaItem()` | ~24, ~62 |

**Recursos**: emojis por logro (se conservan por ADR 025 D6). CSS: `.logro-toast*`, `.confetti-piece` (nudges.css/base.css), `.logros-lista`, `.logro-item*` (config.css). Estado: `S.logros` (`string[]` de ids, orden de inserción = orden de desbloqueo).

**Dependencias y relaciones**: escucha `state:change` (re-evalúa y re-renderiza) y `onboarding:completado` (toast retrasado 4 s, NAV.C/ADR 024 D6). El shell expone `#panel-logros` junto a `#panel-config` porque `config` no puede importar `logros` (ADN 10, ver ADR 022 punto 4). No emite eventos propios. Sin imports de otros dominios: los `eval` leen `S` directo; los evaluadores de la familia "registro" (LG.2c) importan `hoy()` de `infra/utils.js` (infra, no dominio, permitido) para obtener la fecha actual, y los de "deudas" comparan `c.tipo === 'deuda-entidad' || 'deuda-personal'` como literales en vez de importar `esDeuda()` de `compromisos/logic.js`.

**Riesgos**:

- **La persistencia manda sobre la evaluación**: un logro en `S.logros` no se revoca aunque el estado retroceda (borrar gastos, etc.). Cualquier lógica nueva debe respetarlo.
- **Los `eval` corren en cada `state:change`**: mantenerlos O(1) o memoizados (disciplina del ADR 022, reforzada en ADR 032 D7); un evaluador O(historial) sin memo degrada toda la app. `rachaMesesCompletos()` se memoiza (`_rachaMesesCompletosMemo`, PERF.2) porque los 4 niveles de la familia registro (mes-completo a doce-meses-seguidos) la llaman con los mismos argumentos dentro de una sola pasada de `evaluarLogros()`.
- **3+ logros simultáneos** (import de respaldo/CSV) colapsan a un solo toast resumen; no romper ese guard al agregar logros.
- **Ids del catálogo son valores persistidos**: nunca renombrarlos (mismo criterio que los ids de `MARCAS`).
- **`NIVELES_USUARIO` (D5) se calibró para ~20 logros**; con 17 (LG.2e/comportamiento aún no implementada), el tramo superior "Leyenda del ahorro" (min 18) queda temporalmente inalcanzable. No se tocó en LG.2c (fuera de su alcance declarado); recalibrar si molesta antes de que LG.2e agregue los que faltan.
- **`rachaMesesCompletos()` se ancla en "el mes anterior a hoy"**: solo detecta una racha activa si el usuario sigue usando la app (dispara `state:change`) mientras la racha está vigente. Una racha pasada y luego abandonada ya quedó persistida en `S.logros` si se evaluó en su momento (no se revoca); el riesgo real es solo si el usuario NUNCA vuelve a abrir la app durante el mes en que la racha era detectable, caso de borde aceptado (mismo patrón que otros logros de conteo simple).

**Cambios pendientes**: LG.2e (familia comportamiento: hormiga-a-raya, ahorro-creciente, pagador-puntual) en BOARD. Los nombres de `NIVELES_USUARIO` son provisionales: cuando Esteban entregue los definitivos, se cambia la constante (sin tocar datos, nada se persiste).

**Cambios realizados**:

- 2026-07-12 (LG.2c, ADR 032 D3/D4): constancia de registro + deudas saldadas. `mesCompleto(gastos, mesISO)` (≥3 semanas distintas del mes, bloque de 7 días desde el día 1, el bloque final corto cuenta) y `rachaMesesCompletos(gastos, hoyISO)` (racha hacia atrás desde el mes anterior a hoy, el mes en curso nunca cuenta) nuevos, ambos puros con `hoyISO` inyectado para testeo sin mocks de fecha; internamente comparten `_semanasPorMes()` (un solo pase O(gastos)). 4 niveles nuevos de la familia "registro" (`mes-completo`, `tres-meses-seguidos`, `seis-meses-seguidos`, `doce-meses-seguidos`), cada `eval` llama a la racha memoizada (`_rachaMesesCompletosMemo`) con `hoy()` real. Familia "deudas" nueva (`FAMILIAS.deudas`): `deudasSaldadas(compromisos)` cuenta deudas con `saldoTotal === 0`, excluyendo explícitamente las consolidadas (`activo:false` pero `saldoTotal` sin tocar, verificado contra `_aplicarConsolidacion()` en `compromisos/index.js`); una deuda archivada manualmente DESPUÉS de llegar a 0 sigue contando. Catálogo pasa de 11 a 17 logros; 4 tests existentes ajustados (totalNiveles de la familia registro pasa de 2 a 6). 24 tests unitarios nuevos + 1 E2E. 2391/2391 unit + 170/170 E2E + lint verdes. SW v354 → v355.
- 2026-07-09 (LG.2b): fundación de progresión (ADR 032 D1/D5): `familia`/`nivel` en el catálogo (primer-gasto y diez-gastos = familia registro; meta-lograda = familia metas), `FAMILIAS`, `agruparVitrina()` (una tarjeta por familia: nivel más alto ganado + siguiente objetivo con barra), `NIVELES_USUARIO` + `nivelUsuario()` y vitrina con "Tu nivel:" en el encabezado. Sin bump de schema. 17 tests unitarios nuevos + 1 E2E; SW v341 → v342.
- 2026-07-09 (LG.2a): ADR 032 escrito y validado por Esteban el mismo día (Aceptada): familias con niveles sin bump de schema (cada nivel = id propio en `S.logros`), regla anti-gaming con test por PR, derivación "mes completo de registro", niveles de usuario derivados del conteo, reubicación en dos tiempos (Ajustes hoy, Análisis+Inicio tras ANL.1/IN.8).
- 2026-07-04 (LG.1b, ADR 022): vitrina en Ajustes con hint y progreso parcial.
- 2026-07-04 (LG.1a): toast más legible, cola de a uno, pausa por hover.

**Observaciones**: ADRs relacionados: 022 (vitrina en Ajustes, vigente operativamente hasta la rebanada LG.2d), 032 (v2, Aceptada), 025 D6 (emojis se conservan). La regla anti-gaming del ADR 032 D2 es principio innegociable: logros que premien la omisión de registro ("día sin gastos") no entran al catálogo bajo ninguna forma; las familias "registro" y "deudas" de LG.2c son ambas ADITIVAS (más registro = más progreso), así que no necesitan la guardia de "mes completo" que sí exigirá LG.2e para los logros de reducción de gasto (hormiga-a-raya).

---

## Identidad de color por sección: nav + tejas de encabezado (IV.1/IV.2a/IV.2d, ADR 031)

- **Objetivo**          : la sección activa se identifica por el color de SU dominio (nav sidebar/bottom-nav, pestañas del hub Ahorros) y cada encabezado de sección lleva una teja con el icono y el acento del dominio, para reconocer dónde se está sin leer el texto.
- **Estado actual**     : IV.1 (tokens `--fk-dom-*`) cerrada 2026-07-07. **IV.2a cerrada 2026-07-09**: despliegue en nav + hub-tabs + encabezados. **IV.2d, IV.2b e IV.2c cerradas el 2026-07-10** (misma jornada): migración `-text`, franja de modales + progreso por dominio, y calendario/Inicio (fijo→índigo, fondo teñido en vez de franja lateral, etiqueta de tipo en Inicio). **IV.2 completa.** Sigue IV.3 (números y estados) e IV.4 (iconografía dirigida post-color, condicionada a revisión visual), ver BOARD. **DV.1 cerrada el 2026-07-10**: el [ADR 033](../DECISIONS/033-direccion-visual-premium.md) (Dirección Visual premium, estado Propuesta) extiende este sistema con elevación en 4 niveles, `--fk-section-color` + `--fk-grad-identity` sobre el mismo mapeo `[data-dom]`/`[data-section]`, decoración/ilustraciones (pipeline ADR 026) y catálogo de movimiento cerrado; nada se implementa sin la validación de Esteban (rebanadas DV.2a-d en BOARD).
- **Verificado contra** : commit de IV.2c (2026-07-10).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Mapeo `--fk-nav-bg`/`--fk-nav-text` por sección | `styles/layout.css` | bloque `[data-section="X"]` | ~198 |
| Nav activo (sidebar + bottom-nav) teñido | `styles/layout.css` | `.nav-item.active`, `.nav-item[aria-current="page"]` | ~134 |
| Pestañas del hub Ahorros teñidas | `styles/layout.css` | `.hub-tabs__tab[aria-current="page"]` | ~359 |
| Teja de encabezado de sección (reusa `.cat-teja`) | `styles/components/atoms.css` | `.section__icon.cat-teja` | ~249 |
| `.cat-teja` con color de texto correcto (`-text`) | `styles/components/atoms.css` | `.cat-teja`, `[data-dom="X"]` | ~221 |
| Iconos del menú "Más" con color correcto (`-text`) | `styles/modals.css` | `.menu-mas__item[data-section="X"] .icon` | ~144 |
| Markup de los 11 encabezados con teja | `index.html` | `.section__title-group` + `.section__icon` por sección | ~490-777 |
| Pestañas del hub con `data-section` | `index.html` | `.hub-tabs__tab[data-section="X"]` (4 copias, una por página del hub) | ~649-726 |
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

**Cambios pendientes**: ninguno de IV.2 (completa). IV.3 (números y estados) e IV.4 (iconografía post-color) siguen en BOARD. El teja de "Movimientos" (sub-vista de Inicio, sin dominio propio) y "Inicio"/"Ajustes" quedan deliberadamente sin teja/tinte. Presupuesto/Límites (`_renderGrupoCard`) quedó sin tinte de dominio en sus barras a propósito (ver riesgo abajo); si más adelante se decide integrarlo, coordinar con LIM.1.

**Cambios realizados**:

- 2026-07-10 (IV.2c): "fijo" pasa del amarillo prestado de Presupuesto al índigo propio de Calendario (`--fk-dom-agenda`) en `.cal-dot--fijo`, `.cal-detail__item--fijo`, `.cal-detail__icon--fijo` y `.vencidos-card__icon--fijo` (Inicio): resuelve la ambigüedad "amarillo = ¿fijo o límite?" del hallazgo 3 del ADR 031, con el mismo color en TODA la app para el mismo concepto (antes el calendario y Pendientes del mes discrepaban entre sí). Las tarjetas de evento del detalle del día (`.cal-detail__item--*`) abandonan la franja lateral de 3px (AG.7) y pasan a fondo teñido al 8% (`color-mix` sobre `--fk-bg-elevated`): sin colisión con el hallazgo de IV.2a sobre texto coloreado porque el texto de la tarjeta es neutro. "Pendientes del mes" y "Próximas prioridades" de Inicio ganan una etiqueta de tipo (`.dom-badge`, dos variantes nuevas `--agenda`/`--ahorro`) junto al icono+color ya existentes (D1: "el color nunca viaja solo"). **Bug real corregido de paso**: un apartado en "Próximas prioridades" pedía prestado el dot de `fijo` (heredaba su color) en vez de tener el propio; nuevo `.cal-dot--apartado` (familia menta). E2E `smoke.test.js` actualizado de `borderLeftColor` a `backgroundColor` (mecanismo nuevo). **Cierra IV.2 completa.** Sin bump de schema. Verificado con `getComputedStyle` en Chromium real, ambos temas (con la lección de caché documentada abajo) + 2295/2295 unit + 159/159 E2E verdes. SW v343 → v344.
- 2026-07-10 (IV.2b): `.progress-bar`/`.progress-ring-wrap` (única fuente de progreso lineal/circular) tiñen su estado por defecto con `--fk-section-accent` (Metas, Ahorro/fondo, Apartados, Me deben en cobro y pago, y los factores Deuda/Liquidez/Ahorro del score de salud de Análisis); los modificadores semánticos `--near`/`--complete` no se tocaron. **Hallazgo real corregido antes de cerrar:** la primera versión leía el token crudo del dominio (igual que la franja), pero el relleno de una barra/anillo ES la información (no un acento decorativo): aplica el umbral no textual completo de WCAG 1.4.11 (3:1), y el crudo lo fallaba en tema claro para varios dominios contra el fondo del track (ahorro 1.88:1, personales 2.39:1, tesorería 2.65:1). Se cambió `--fk-section-accent` a usar `-text` (afecta también la franja de modales: sin cambio en oscuro, más nítida en claro); verificado en 4.28-4.38:1. Presupuesto/Límites (`_renderGrupoCard`) quedó **fuera a propósito**: ya tiene su propio esquema de color por ADR 019 (Necesidades siempre neutro, Ahorro celebra, Estilo de vida alerta) que un tinte de dominio habría roto (Necesidades dejaría de verse neutral). El factor "Control" del score de Análisis tampoco se tiñó (mide volatilidad de gasto, no un dominio limpio). De paso se corrigió un bug de la franja de modales (WIP de sesión anterior): faltaba el mapeo de `metas`, así que `modal-meta`/`modal-abono-meta` no mostraban franja. SW v342 → v343. Verificado con `getComputedStyle` en Chromium real (ambos temas) + 2295/2295 unit + 159/159 E2E verdes (sin tests nuevos).
- 2026-07-10 (IV.2d): migración de `color: var(--fk-dom-X)` a `-text` en los usos restantes fuera de Calendario/Inicio: Análisis (`.fondo-hero__icon`, `.fondo-hero__sub--ok`, `.fondo-hero__banner`, `.ahorro-habito__compromiso strong`, `.inversion-hero__icon`, `.inversion-hero__tipo-pct`, `.inversion-item__tipo`), el modal Registrar (`.registrar__tile[data-kind] .icon`) y `.nudge-high .nudge__title`. `.dom-badge--*` migrado a `-text` + fondo bajado de 12% a 6% (texto real sobre el tinte, mismo hallazgo de IV.2a). Corrige el bug de contraste medido en IV.1 (el "100%" de Inversión daba 1.89:1 en tema claro). **Además se encontró y verificó la franja de modales** (mecanismo, no el color final): estaba implementada sin commitear desde una sesión anterior; se cerró junto con IV.2d y se terminó de calibrar el color en IV.2b (ver arriba). Sin bump de schema ni cambios de JS: CSS + atributos estáticos. Verificado con `getComputedStyle` en Chromium real en tema claro (color e.g. `rgb(28,127,116)` = `#1c7f74` = `--fk-dom-inversion-text` exacto) además de 2295/2295 unit + 159/159 E2E verdes (sin tests nuevos, mismo criterio que IV.2a).
- 2026-07-09 (IV.2a): nav sidebar/bottom-nav + pestañas del hub Ahorros teñidas por dominio; teja de icono+acento en los 11 encabezados de sección; corregido el hueco de contraste texto-vs-fondo-propio (6% en nav) y el bug preexistente de `.cat-teja`/`.menu-mas__item .icon` usando el token crudo en vez de `-text`. 2295/2295 unit + 159/159 E2E verdes (sin tests nuevos: cambio de CSS/markup puro, verificado con cálculo WCAG real + inspección visual en Chromium, mismo método que IV.1).
- 2026-07-07 (IV.1, ADR 031): tokens `--fk-dom-*` con rampa `-bg`/`-text` para los 11 dominios.

**Observaciones**: ADR relacionado: [031](../DECISIONS/031-identidad-de-color-por-seccion.md). Metodología de verificación de contraste (heredada de IV.1, reforzada aquí): nunca aprobar un color "seguro" solo por inspección visual; calcular luminancia relativa y ratio WCAG real contra el fondo efectivo (incluyendo mezclas `color-mix`), y elegir el umbral correcto según si el contenido es texto (4.5:1) o gráfico (3:1).
