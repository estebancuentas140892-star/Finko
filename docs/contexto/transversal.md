# Ficha de contexto: Transversal

> Revisado: 2026-08-13.

> Funcionalidades que atraviesan varias secciones y no son visuales: taxonomía de categorías, persistencia, el pipeline de render, el CTA de cuenta, el motor único de avisos y el sistema de logros. Reglas de uso y plantilla en [`README.md`](README.md).
>
> **Qué NO buscar acá** (partido el 2026-07-24): el lenguaje de formularios y el selector de ícono están en [`captura.md`](captura.md); la identidad de color, las tejas de marca y la navegación, en [`sistema-visual.md`](sistema-visual.md).

---

## Taxonomía global de categorías (CAT.1, iniciativa transversal)

- **Objetivo**          : una sola clasificación de categorías entre secciones (Gastos↔Fijos y Apartados↔Metas), decidida una vez y consumida por los catálogos de cada sección, los límites (LIM.1 punto 8) y el catálogo de marcas (ADR 029 D3). Criterios: **fijo** = recurrente con frecuencia definida, parte de la rutina; **gasto** = día a día variable; **apartado** = gasto esporádico previsible que se olvida presupuestar; **meta** = objetivo grande de mediano/largo plazo.
- **Estado actual**     : **iniciativa CAT.1 COMPLETA** (decisión validada con Esteban el 2026-07-13, ADR 014 sección "Validación 2026-07-13"). **CAT.1a** (Gastos↔Fijos): `CATEGORIAS_GASTO_USUARIO` ya no ofrece Vivienda ni Servicios públicos, hint retirado por completo (revisa la decisión 4 del ADR 014, ratificado por Esteban). **CAT.1b** (Apartados↔Metas): `PLANTILLAS_APARTADO` pasa de 17 a 20; sale Vacaciones (vive en Metas), "Matrícula o semestre" se divide en "Matrícula escolar" (el semestre universitario es Meta), "Útiles escolares" se amplía a "Útiles y uniformes", entran Veterinario/Mantenimiento del hogar/Seguro del hogar/Reparaciones inesperadas. **CAT.1c** (Metas): `CATEGORIAS_META_USUARIO` es el catálogo del formulario y ya no ofrece Cumpleaños ni Vacaciones. Fijos no esenciales (para LIM.1 punto 8) = **Streaming y Suscripciones** (Gimnasio y Telefonía esenciales, decisión explícita). ADR 029 D3 validada tal cual (su Fase 0 queda desbloqueada). **Sin bump de schema en ninguna rebanada**: precedente "Alimentación" v15 (CAT.1a), catálogo de plantillas sin referencia inversa (CAT.1b) y catálogo base intacto (CAT.1c), ver Riesgos.
- **Verificado contra** : `28468b5` (2026-07-27, CAT.1c).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Catálogo de Gastos + filtro del formulario (CAT.1a cerrada) | `modules/core/constants.js` | `CATEGORIAS_GASTO`, `CATEGORIAS_GASTO_USUARIO` | ~414 |
| Catálogo de gastos fijos | `modules/core/constants.js` | `CATEGORIAS_AGENDA`, `CATEGORIA_AGENDA_ICONO` | ~596 |
| Plantillas de Apartados (CAT.1b cerrada) | `modules/dominio/apartados/logic.js` | `PLANTILLAS_APARTADO` | ~54 |
| Catálogo de Metas + filtro del formulario (CAT.1c cerrada) | `modules/core/constants.js` | `CATEGORIAS_META`, `CATEGORIAS_META_USUARIO`, `CATEGORIA_META_ICONO` | ~690 |
| Opciones del selector de meta (reinyecta la categoría retirada al editar) | `modules/dominio/metas/view.js` | `_renderOpcionesCategoria()` | ~285 |

**Dependencias y relaciones**: la decisión desbloquea CAT.3 (a qué sección pertenece una categoría personalizada), AP.5 (catálogo de la filosofía redefinida de Apartados), LIM.1 punto 8 (fijos no esenciales) y la Fase 0 del ADR 029 (etiquetado del catálogo de marcas).

**Riesgos**:

- **Registros viejos con categorías retiradas (Gastos)**: gastos con "Vivienda"/"Servicios públicos" siguen mostrando su ícono vía `CATEGORIA_ICONO`, que conserva la entrada aunque el formulario ya no la ofrezca. La regla es filtrar solo el FORMULARIO, nunca borrar la entrada del mapa de íconos al retirar una categoría del catálogo visible.
- **`PLANTILLAS_APARTADO` no tiene esta trampa (hallazgo de CAT.1b)**: a diferencia de `CATEGORIA_ICONO`, un apartado ya creado NO referencia el catálogo de plantillas en su render; guarda su propio `nombre`/`icono` en el momento de crearlo (`_aplicarPlantilla()` copia el valor una sola vez). Retirar o renombrar una plantilla (Vacaciones, Matrícula o semestre, Útiles escolares) es seguro: los apartados existentes creados desde esas plantillas conservan su nombre e ícono guardados sin cambios, y la plantilla retirada simplemente deja de ofrecerse para apartados nuevos.
- **El guardarraíl de consistencia de TX.4** (misma etiqueta ⇒ mismo emoji entre catálogos) debe seguir verde tras cada rebanada: al renombrar o retirar, revisar que no queden etiquetas compartidas divergentes. TX.4 lee `CATEGORIA_META_ICONO`, que sigue cubriendo el catálogo base completo: retirar una categoría del formulario no la saca de ese guardarraíl.
- **Retirar una categoría de un catálogo que se puede editar (hallazgo de CAT.1c)**: filtrar el formulario no basta cuando la sección permite editar el registro (EDIT.1). Si el selector no ofrece la categoría guardada, al editar cae en la primera opción y una corrección de nombre borra la categoría y cambia el ícono. Regla: el selector reinyecta la categoría retirada **solo cuando ya estaba elegida**. Aplica a cualquier retiro futuro (CAT.3) en Metas y en las secciones que EDIT.1 vaya abriendo.

**Cambios pendientes**: ninguno de CAT.1 (iniciativa completa; la tarjeta sale del BOARD). **CAT.3 completa (2026-08-11, [ADR 058](../DECISIONS/058-categorias-personalizadas-globales.md))**, sus cuatro rebanadas cerradas: ver el bloque "Categorías personalizadas del usuario" más abajo. **CAT.4 cerrada (2026-07-31)**: sin hallazgos.

**Cambios realizados**:

- **CAT.4 (2026-07-31)**: auditoría de las dos reglas (categoría/tipo antes que descripción, fecha por defecto = hoy en creación) sobre los ~8 formularios en alcance (Gastos, Ingresos fijos y puntuales, Transferencias, Deuda nueva, Abono a deuda, Gasto fijo, Inversiones, Personales/préstamos, Ahorro/aporte): las dos reglas ya se cumplían en todos. `fechaObjetivo` (Apartados) y `fechaLimite` (Metas) quedan fuera de alcance: son fecha meta futura opcional, no fecha de registro/movimiento. Cierre sin cambios de código.

- **CAT.1a (2026-07-13)**: `CATEGORIAS_GASTO_USUARIO` excluye Vivienda y Servicios públicos (además de Deudas/Ahorro/Alimentación, ya excluidas); `CATEGORIAS_GASTO` (catálogo base) las conserva para `CATEGORIA_ICONO` y la validación de límites existentes. `CATEGORIAS_TIPICAMENTE_FIJAS` eliminada de `constants.js`; `#hint-categoria-fija` eliminado de `renderFormGasto()`; su listener de `change` eliminado de `_montarFormGasto()`. Sin bump de schema.
- **CAT.1c (2026-07-27)**: `CATEGORIAS_META_USUARIO` (nueva, filtra `CATEGORIAS_META`) excluye Cumpleaños y Vacaciones; el catálogo base y `CATEGORIA_META_ICONO` los conservan para el render legado. `_renderOpcionesCategoria()` (`metas/view.js`) lee el catálogo curado y reinyecta la categoría retirada cuando la meta editada ya la tenía. Sin bump de schema.
- **CAT.1b (2026-07-13)**: `PLANTILLAS_APARTADO` (`apartados/logic.js`) 17→20 plantillas. Sale Vacaciones ✈️. "Matrícula o semestre" 🎓 → "Matrícula escolar" 🎓. "Útiles escolares" 📚 → "Útiles y uniformes" 🎒. Entran Veterinario 🩺, Mantenimiento del hogar 🛠️, Seguro del hogar 🛡️, Reparaciones inesperadas 🧰. Sin cambios en `_aplicarPlantilla()`/`renderFormApartado()` (agnósticos al contenido del catálogo). Sin bump de schema.

---

## Categorías personalizadas del usuario (TX.9b, y su extensión CAT.3)

- **Objetivo**          : el usuario crea sus propias categorías con nombre e ícono, y valen igual que las nativas. **CAT.3** las extendió a Gastos fijos con la sección como campo del objeto, oferta filtrada por sección y resolución de ícono global ([ADR 058](../DECISIONS/058-categorias-personalizadas-globales.md), 5 decisiones).
- **Estado actual**     : **TX.9b y CAT.3 (las cuatro rebanadas) en producción.** `S.categoriasPersonalizadas` es `{id, nombre, icono, fechaCreacion, seccion}[]` (`seccion: 'gasto' | 'fijo'`, D1, migración v30 a v31; existentes backfilleadas a `'gasto'`); la clave funcional sigue siendo el **`nombre`**, que es lo que se guarda en `Gasto.categoria`/`Compromiso.categoria` igual que una nativa. `id` y `fechaCreacion` los inyecta el helper genérico `guardar()` de `infra/crud.js`. La **resolutora** (D2) fusiona `CATEGORIA_ICONO` y `CATEGORIA_AGENDA_ICONO` antes de caer a la personalizada, e ignora `seccion` a propósito. El **validador** (D4) compara contra los dos catálogos nativos completos. El formulario de gasto fijo (`renderFormGastoFijo()`) ofrece las personalizadas de `seccion: 'fijo'` y un chip sentinela propio (`'__nueva__'`, distinto del `'__nueva__'` de Gastos: son sentinelas locales a cada form, nunca se comparan entre sí) porque `'Otro'` ya es miembro literal del catálogo de Agenda y no puede reusarse como disparador. `validarCompromiso()`/`normalizarCompromiso()` reciben `personalizadasFijo` (tercer parámetro, default `[]`, retrocompatible con Deudas que no lo pasa). **No hay edición ni borrado**: la única operación sobre la colección es `guardar()`, así que una vez creada es permanente. Eso queda **fuera** del ADR 058 y sale a tarjeta propia.
- **Verificado contra** : `db81eee` (2026-08-11, CAT.3c/CAT.3d).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| El array en el estado (contrato en JSDoc) | `modules/core/state.js` | `categoriasPersonalizadas` | ~421 |
| Migración v30 a v31 (`seccion`) | `modules/core/storage.js` | idempotente, backfill `'gasto'` | ~447 |
| **Resolutora, punto único** | `modules/core/constants.js` | `iconoDeCategoriaGasto(categoria, personalizadas)` | ~529 |
| Catálogo de íconos elegibles (29, cerrado) | `modules/core/constants.js` | `ICONOS_CATEGORIA_PERSONALIZADA` | ~487 |
| Validador del alta (D4: dos catálogos nativos) | `modules/dominio/gastos/logic.js` | `validarCategoriaPersonalizada()` | ~314 |
| Alta desde Gastos (estampa `seccion: 'gasto'`) | `modules/dominio/gastos/index.js` | `_guardarGasto()`, chip sentinela `'__nueva__'` | ~66 |
| Chips del formulario de gasto | `modules/dominio/gastos/view.js` | nativas, personalizadas, sentinela | ~612 |
| Alta desde Gastos fijos (CAT.3c, estampa `seccion: 'fijo'`) | `modules/dominio/agenda/index.js` | `_guardarGastoFijo()`, chip sentinela `CATEGORIA_NUEVA_VALUE_FIJO` | ~237 |
| Chips del formulario de gasto fijo (CAT.3c) | `modules/dominio/agenda/view.js` | `renderFormGastoFijo()`: nativas, personalizadas de `seccion: 'fijo'`, sentinela | ~907 |
| Gate de escritura de Gastos fijos (CAT.3c) | `modules/dominio/compromisos/logic/modelo.js` | `validarCompromiso()`, `normalizarCompromiso()`, `_categoriaFijoConNombreAuto()`: tercer parámetro `personalizadasFijo` | ~55, ~252, ~417 |

**Las 7 superficies que leían el mapa crudo, cerradas por CAT.3b**: las tres últimas fallaban con una personalizada de Gastos antes del cierre (D3 del ADR 058). Las 7 pasan ahora por `iconoDeCategoriaGasto()`:

| # | Archivo | Qué pinta |
|---|---|---|
| C1 | `modules/dominio/agenda/view.js` (`_renderDetalleItem`) | detalle del día del calendario |
| C2 | `modules/dominio/agenda/view.js` (`renderFormGastoFijo`) | chips del formulario de gasto fijo |
| C3 | `modules/dominio/gastos/logic.js` (`iconoPorOrigen`, 3er parámetro `personalizadas`) | gasto nacido de un fijo |
| C4 | `modules/dominio/tesoreria/views/distribucion.js` (`_iconoNecesidad`) | checklist de Necesidades |
| C5 | `modules/dominio/presupuesto/view.js` (`_renderEnvelope`) | envelope de un límite |
| C6 | `modules/dominio/presupuesto/view.js` (`renderPanelLimites`) | banner de alertas de límite |
| C7 | `modules/dominio/resumen/view.js` (`renderPanelResumen`) | categoría top de la semana, en Inicio |

**Los 3 gates de escritura de Gastos fijos, cerrados por CAT.3c**: `compromisos/logic/modelo.js:276` (rechazo duro), `:414` (descarte a `null` en silencio) y `:55` (auto-nombre de AG.4) ya aceptan una personalizada de `seccion: 'fijo'`, no solo `CATEGORIAS_AGENDA`. Los dos espejos de la UI, cerrados igual: `agenda/index.js` prefill al editar y `_syncCategoriaGastoFijo()` (toggle de nombre-auto y de los campos de categoría nueva).

**Dependencias y relaciones**: `iconoDeCategoriaGasto()` es pura (recibe las personalizadas por parámetro, el caller lee `S`) y está cableada en 7 sitios del lado Gastos y Presupuesto. `validarPresupuesto` es el **único** validador que ya recibe las personalizadas (`presupuesto/logic.js:558`, cableado en `presupuesto/index.js:97`). **TX.4 sube de guardarraíl a dependencia** con el ADR 058 D2: la resolución global se apoya en que dos catálogos nativos nunca den símbolos distintos a la misma etiqueta, y las 5 etiquetas compartidas (Servicios públicos, Mercado, Educación, Transporte, Mascotas) hoy coinciden.

**Riesgos**:

- **Colisión de nombre con el catálogo de Agenda: cerrada por CAT.3a.** `validarCategoriaPersonalizada` ya compara también contra `CATEGORIAS_AGENDA`. Una personalizada creada **antes** de CAT.3a con un nombre que hoy colisiona (ej. "Arriendo") conserva su categoría y sus gastos: D4 valida altas nuevas, nunca reescribe lo guardado (misma regla que CAT.1a).
- **Sin validación de longitud ni de cantidad**: el input no tiene `maxlength` y no existe ningún tope de cuántas personalizadas se pueden crear.
- **El roundtrip de CSV no recrea la entrada**: `import/logic.js:176` acepta cualquier texto como categoría, así que exportar e importar conserva el **nombre** pero no vuelve a crear la personalizada en `S`; el gasto importado queda sin ícono asociado.
- **Una personalizada sin uso sigue apareciendo**: borrar su último gasto no la retira del catálogo, porque no hay borrado.
- **Precedencia de `iconoPorOrigen`**: un gasto nacido de un fijo o de un abono hereda el ícono del compromiso y la personalizada nunca se consulta (`gastos/view.js:441`).

**Cambios pendientes**: ninguno de CAT.3 (iniciativa completa, sale del BOARD). Fuera de alcance por decisión del ADR 058: renombrar y eliminar (tarjeta propia), Apartados y Metas (catálogos de otra naturaleza), Ingresos, roundtrip de CSV (riesgo ya documentado arriba).

**Cambios realizados**: `TX.9b`: creación de la funcionalidad (detalle en el CHANGELOG). `2026-07-31 (ADR 058)`: mapeo completo de origen y destino, sin cambios de código. `2026-08-01 (CAT.3a)`: campo `seccion`, migración v30 a v31, resolutora global, validador D4 (detalle en el CHANGELOG). `2026-08-03 (CAT.3b)`: los 7 accesos crudos pasan por la resolutora, incluidos los 3 que ya fallaban (detalle en el CHANGELOG). `2026-08-11 (CAT.3c/CAT.3d)`: Gastos fijos ofrece y acepta personalizadas (chip sentinela propio, tres gates de escritura + dos espejos de UI); CAT.3d verificó end-to-end que las 3 superficies ya resueltas por CAT.3b pintan correcto con una personalizada real de `seccion: 'fijo'`, sin cambios de código adicionales.

---

---

## Persistencia y salvaguarda de cuota (localStorage)

- **Objetivo**          : todo el estado vive en `localStorage` bajo la clave única `fk_v1` (ADN 3). `save()` está debounced 200 ms; `_flush()` serializa `S` entero y escribe. Una salvaguarda avisa antes de llenar la cuota y evita que un guardado fallido se pierda en silencio (ADR 030).
- **Estado actual**     : estable. **PERF.4** ([ADR 030](../DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md), 2026-07-06) decidió **no** reescribir la persistencia (el costo de guardar es ~5 ms debounced, medido en `scripts/perf/`) y en su lugar agregó la salvaguarda de cuota. **IndexedDB** queda como dirección futura (**PERF.5** en BOARD, no iniciar sin un disparador del ADR 030 D4). Partir `localStorage` por clave está **rechazado** (no sube la cuota). Desde **PERF.8** el harness también mide el arranque (`loadData()`: `JSON.parse` + migraciones), la otra mitad de la ruta: **0,6 / 2,6 / 5,1 ms** de mediana a 1.000 / 5.000 / 10.000 gastos. Lineal y lejos del disparador; el D4 sigue exigiendo jank en dispositivo real, no esta cifra de happy-dom. **Compuerta reverificada el 2026-08-13** ante un pedido de ejecutar PERF.5: los tres disparadores del D4 siguen cerrados y la tarjeta no se inició. Evidencia y tamaño medido del cambio, en la tarjeta de [`board/transversal.md`](../board/transversal.md); el hallazgo que manda es que el costo vive en los tests (13 suites E2E siembran `fk_v1` sin helper central), no en el runtime.
- **Verificado contra** : `8bfd40e` (2026-07-31, PERF.8).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Guardado debounced + flush | `modules/core/storage.js` | `save()`, `_flush()`, `_flushNow()` | ~430 |
| Evaluación de cuota (pura) | `modules/core/storage.js` | `evaluarCuota()`, `LIMITE_LOCALSTORAGE_CHARS` | |
| Estado de cuota actual (mide S) | `modules/core/storage.js` | `estadoCuota()` | |
| Aviso en Ajustes | `modules/dominio/config/view.js` | `_renderAvisoAlmacenamiento()` (en `_renderDatos`) | |
| Escucha de eventos + anuncio | `modules/dominio/config/index.js` | `EventBus.on('storage:error')`, `on('storage:cuota')` | |
| Restaurar backup (escribe el blob crudo) | `modules/dominio/config/index.js` | `_importarDatos()` | ~42 |
| Medición de escritura y arranque | `scripts/perf/bench.perf.js` | columnas `stringify ms`, `save ms`, `arranque ms` | |

**Dependencias y relaciones**: `_flush()` emite `state:save` (éxito), `storage:cuota` (al cruzar de nivel de uso) y `storage:error` (guardado rechazado). `config/` los escucha para avisar. `infra/memo.js` (PERF.2) escucha `state:change`, no estos. Exportar backup (`config/_exportarDatos`) usa `JSON.stringify(S)` en memoria: es independiente del layout de storage.

**Riesgos**: `LIMITE_LOCALSTORAGE_CHARS` (4.5 M chars) es un piso conservador, no el cupo exacto (varía por navegador); por eso `falloUltimoGuardado` (fallo real) manda sobre la estimación. Si algún día se migra a IndexedDB (PERF.5), `loadData()` pasa a async → bootstrap async, y el sembrado E2E (escribe `fk_v1`) hay que reescribirlo: es el cambio de mayor riesgo del proyecto.

**Cambios realizados**: `2026-07-06 (PERF.4, ADR 030)`: salvaguarda de cuota + guardado que ya no falla en silencio (detalle en CHANGELOG). `2026-07-31 (PERF.8)`: columna "arranque" en el harness, el dato que el D4 pedía. `2026-08-13 (PERF.5)`: pedido de ejecución evaluado y **rechazado**, los tres disparadores del D4 siguen cerrados; sin cambios de código (detalle en el CHANGELOG).

---

---

## Pipeline de render: directo vs. agendado (PERF.6)

- **Objetivo**          : hay dos rutas de render y la diferencia importa. **Directo y síncrono**: `renderAll()` (arranque), los listeners de `hashchange` (navegación) y los handlers que pintan su propia vista tras una acción. **Reactivo y agendado**: los listeners de `state:change` que repintan paneles pasan por `programarRender(fn)`, que los colapsa a un solo pintado por tick.
- **Estado actual**     : estable. `infra/crud.js` emite **un `state:change` por mutación**, así que una acción multi-sección emite muchas veces en un solo tick (una distribución del ingreso: 12). Antes de PERF.6 cada emisión repintaba: **~398 ms** de JavaScript con 10.000 gastos estando en Inicio. Con la cola, **~94,5 ms**, que es exactamente el costo de un render único (4,2x, medido a 3 volúmenes en [`BASELINE.md`](../../scripts/perf/BASELINE.md)). Ocho listeners agendan; los que no pintan paneles (logros evalúa, gastos actualiza el saldo, metas regenera planes) siguen directos a propósito.
- **Verificado contra** : `9d40e00` (2026-08-13, PERF.6).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Cola, dedup y vaciado en microtask | `modules/infra/render.js` | `programarRender()`, `vaciarRendersProgramados()` | ~78 |
| Render condicional por sección visible | `modules/infra/render.js` | `renderSmart()` | ~74 |
| Orquestador síncrono del arranque | `modules/infra/render.js` | `renderAll()`, `registrarRender()` | ~415 |
| Los 8 listeners que agendan | `modules/dominio/{resumen,movimientos,compromisos,presupuesto,ahorro,tesoreria,analisis,agenda}/index.js` | `_renderReactivo` / `_renderTodo` / `_renderSegunSeccion` | |
| Medición de la ráfaga | `scripts/perf/bench.perf.js` | bloque "ráfaga de una acción multi-sección" | |

**Dependencias y relaciones**: el dedup es **por identidad de la función**, así que un listener que agende una flecha creada en el propio callback no se deduplica nunca (pinta una vez por emisión, como antes). De ahí la regla: agendar siempre una función de módulo. La cola es independiente de `infra/memo.js`: memo evita **recalcular** lo mismo, la cola evita **pintar** lo mismo, y se necesitan las dos (dentro de una ráfaga cada emisión invalida el memo de su sección, así que sin la cola cada repintado era un recálculo genuino).

**Riesgos**: un `state:change` ya no deja el DOM actualizado en la línea siguiente. Cualquier código nuevo que emita y después lea el DOM que ese render produce tiene que agendar su lectura igual, o pintar directo. Los renders de navegación y arranque quedaron síncronos justamente para no arrastrar ese contrato a las rutas donde el usuario espera ver el resultado ya. En tests, `vaciarRendersProgramados()` da un punto de vaciado síncrono; en E2E no hace falta (Playwright auto-espera y el microtask corre antes del paint).

**Cambios realizados**: `2026-08-13 (PERF.6)`: cola de renders reactivos, 8 listeners migrados y escenario de ráfaga en el harness (cifras en `BASELINE.md`).

---

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

- 2026-07-06: unificacion del CTA. Accion `ir-a-crear-cuenta` y evento `cuenta:crear` nuevos; los 5 empty states y modales convergen en el mismo copy y comportamiento.

**Observaciones**: el mismo principio ("no informar un requisito sin ofrecer la acción para resolverlo") aplica a futuros bloqueos; si aparece otro requisito duro (ej. registrar un abono sin deudas, aportar sin metas), replicar el patrón antes que dejar un mensaje muerto.

---

---

## Sistema de logros (dominio `logros`)

- **Objetivo**          : gamificación ligera de hábitos: catálogo de logros con evaluación automática, toast con confetti al desbloquear y "Tu progreso" (apartado de Análisis + tarjeta compacta en Inicio).
- **Estado actual**     : estable. **Logros v2 completa** ([ADR 032](../DECISIONS/032-logros-v2-niveles-y-habitos.md) Aceptada el 2026-07-09): LG.2b (2026-07-09), LG.2c (2026-07-12), LG.2e (2026-08-13, familia comportamiento con un solo logro, `hormiga-a-raya`) y **LG.2d cerrada el 2026-08-13** (mudanza a Análisis + tarjeta en Inicio; el [ADR 022](../DECISIONS/022-vitrina-de-logros-en-ajustes.md) pasa a Superada). Catálogo: 18 logros (antes 11), familias `registro` 6, `metas` 1, `deudas` 2, `comportamiento` 1.
- **Verificado contra** : commit de LG.2d (2026-08-13).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Catálogo (18 logros; familias `registro` 6 niveles, `metas` 1, `deudas` 2, `comportamiento` 1) | `modules/dominio/logros/logic.js` | `LOGROS` | ~258 |
| Metadata de familias (nombre por familia) | `modules/dominio/logros/logic.js` | `FAMILIAS` | ~47 |
| Derivación "mes completo de registro" (D3, ≥3 semanas del mes) | `modules/dominio/logros/logic.js` | `mesCompleto()`, helper interno `_semanasPorMes()` | ~92 |
| Racha de meses completos consecutivos (memoizada por gastos) | `modules/dominio/logros/logic.js` | `rachaMesesCompletos()`, `_rachaMesesCompletosMemo` | ~106, ~129 |
| Conteo de deudas saldadas (excluye consolidadas) | `modules/dominio/logros/logic.js` | `deudasSaldadas()` | ~142 |
| Umbrales de gasto hormiga (≤20.000 por transacción; piso de relevancia 100.000) | `modules/dominio/logros/logic.js` | `UMBRAL_GASTO_HORMIGA`, `UMBRAL_HORMIGA_RELEVANTE` | ~160, ~168 |
| Gasto hormiga por mes (LG.2e) | `modules/dominio/logros/logic.js` | `gastoHormigaMes()`, helper interno `_hormigaPorMes()` | ~195 |
| Bajada de hormiga vs promedio de 3 meses (memoizada por gastos) | `modules/dominio/logros/logic.js` | `hormigaALaRaya()`, `_hormigaALaRayaMemo` | ~237, ~255 |
| Evaluación (ids cumplidos ahora, try/catch por logro) | `modules/dominio/logros/logic.js` | `evaluarLogros()` | ~447 |
| Estado render-ready de la vitrina (incluye familia/nivel) | `modules/dominio/logros/logic.js` | `estadoLogros()` | ~480 |
| Agrupación por familia (una tarjeta por familia) | `modules/dominio/logros/logic.js` | `agruparVitrina()` | ~535 |
| Nivel de usuario derivado del conteo (nombres provisionales, tramo superior min 16) | `modules/dominio/logros/logic.js` | `nivelUsuario()`, `NIVELES_USUARIO` | ~597 |
| Detección + persistencia + toast (cola de a uno) | `modules/dominio/logros/index.js` | `_checkYMostrar()`, `_encolarToast()` | ~59, ~97 |
| Confetti (24 piezas, ajuste mobile por bottom-nav) | `modules/dominio/logros/index.js` | `_lanzarConfetti()` | ~193 |
| Apartado "Tu progreso" en Análisis (agrupado + nivel en el encabezado, colapsable) | `modules/dominio/logros/view.js` | `renderProgresoAnalisis()`, `_renderFamiliaItem()` | ~28, ~99 |
| Tarjeta compacta en Inicio (nivel + último logro + próximo objetivo) | `modules/dominio/logros/view.js` | `renderTarjetaProgresoInicio()`, `_proximoObjetivo()` | ~64, ~112 |

**Recursos**: emojis por logro (se conservan por ADR 025 D6). CSS: `.logro-toast*`, `.confetti-piece` (nudges.css/base.css), `.logros-lista`, `.logro-item*` (config.css, origen histórico del ADR 022; reusadas tal cual en las dos superficies vigentes). Estado: `S.logros` (`string[]` de ids, orden de inserción = orden de desbloqueo).

**Dependencias y relaciones**: escucha `state:change` (re-evalúa y re-renderiza) y `onboarding:completado` (toast retrasado 4 s, NAV.C/ADR 024 D6). El shell expone `#panel-analisis-progreso` junto a `#panel-analisis` y `#panel-progreso-inicio` dentro del bento de Inicio, porque ni `analisis` ni `resumen` pueden importar `logros` (ADN 10, mismo mecanismo que el ADR 022 estableció para Ajustes). No emite eventos propios. Sin imports de otros dominios: los `eval` leen `S` directo; los evaluadores de la familia "registro" (LG.2c) importan `hoy()` de `infra/utils.js` (infra, no dominio, permitido) para obtener la fecha actual, y los de "deudas" comparan `c.tipo === 'deuda-entidad' || 'deuda-personal'` como literales en vez de importar `esDeuda()` de `compromisos/logic.js`.

**Riesgos**:

- **La persistencia manda sobre la evaluación**: un logro en `S.logros` no se revoca aunque el estado retroceda (borrar gastos, etc.). Cualquier lógica nueva debe respetarlo.
- **Los `eval` corren en cada `state:change`**: mantenerlos O(1) o memoizados (disciplina del ADR 022, reforzada en ADR 032 D7); un evaluador O(historial) sin memo degrada toda la app. `rachaMesesCompletos()` se memoiza (`_rachaMesesCompletosMemo`, PERF.2) porque los 4 niveles de la familia registro (mes-completo a doce-meses-seguidos) la llaman con los mismos argumentos dentro de una sola pasada de `evaluarLogros()`.
- **3+ logros simultáneos** (import de respaldo/CSV) colapsan a un solo toast resumen; no romper ese guard al agregar logros.
- **Ids del catálogo son valores persistidos**: nunca renombrarlos (mismo criterio que los ids de `MARCAS`).
- **`NIVELES_USUARIO` (D5) se calibró para ~20 logros y el catálogo cerró en 18**: LG.2e bajó el tramo superior de min 18 a **min 16** para que no exija el 100 % del catálogo (incluidos `prestamista` y el fondo completo). El test "el tramo superior es alcanzable sin el 100 % del catálogo" defiende la relación; si algún día entran más logros, revisar el umbral, no borrar el test.
- **`rachaMesesCompletos()` se ancla en "el mes anterior a hoy"**: solo detecta una racha activa si el usuario sigue usando la app (dispara `state:change`) mientras la racha está vigente. Una racha pasada y luego abandonada ya quedó persistida en `S.logros` si se evaluó en su momento (no se revoca); el riesgo real es solo si el usuario NUNCA vuelve a abrir la app durante el mes en que la racha era detectable, caso de borde aceptado (mismo patrón que otros logros de conteo simple).

**Cambios pendientes**: ninguno propio de la iniciativa "Logros v2": las 4 rebanadas (LG.2b/c/d/e) cerraron. **Dos logros del catálogo D4 quedaron diferidos por datos, sin tarjeta**: `ahorro-creciente` espera la derivación canónica de ingreso mensual (el ADR 046 no la entregó; no construir una paralela) y `pagador-puntual` espera historial de vencimientos pagados, que `S.compromisos` no guarda (solo estado actual): la verificación y sus razones quedaron en el ADR 032, sección "Resolución de LG.2e en implementación". Los nombres de `NIVELES_USUARIO` son provisionales: cuando Esteban entregue los definitivos, se cambia la constante (sin tocar datos, nada se persiste).

**Cambios realizados**:

- 2026-08-13 (LG.2d, ADR 032 D6, **cierra la iniciativa "Logros v2"**): mudanza de la vitrina. `renderPanelLogros()` se reparte en `renderProgresoAnalisis()` (apartado colapsable "Tu progreso", bloque 6 del [ADR 046](../DECISIONS/046-analisis-interpreta-criterio-y-lenguaje.md) D4, mismo lenguaje `analisis-grupo--fila` que los otros dos colapsables de Análisis, con preservación de estado abierto/cerrado entre renders) y `renderTarjetaProgresoInicio()` (tarjeta compacta nueva en el bento de Inicio: nivel + último logro desbloqueado + próximo objetivo, `_proximoObjetivo()` nuevo). `#panel-logros` sale de Ajustes; el [ADR 022](../DECISIONS/022-vitrina-de-logros-en-ajustes.md) pasa a Superada. Cero cambios en `logic.js` (la mudanza es pura reubicación de vista + wiring); `.logros-lista`/`.logro-item*` se reusan tal cual en las dos superficies nuevas, sin CSS nueva. 8 tests unitarios nuevos + 2 E2E ajustados (navegan a `#analisis` en vez de `#config`).
- 2026-08-13 (LG.2e, ADR 032 D4): familia `comportamiento` con `hormiga-a-raya`; `gastoHormigaMes()` y `hormigaALaRaya()` nuevas, tramo superior de `NIVELES_USUARIO` recalibrado a min 16.
- 2026-07-12 (LG.2c, ADR 032 D3/D4): constancia de registro y deudas saldadas; `mesCompleto()` y `rachaMesesCompletos()` nuevas.
- 2026-07-09 (LG.2b, ADR 032 D1/D5): fundacion de progresion: `familia`/`nivel` en el catalogo, `FAMILIAS` y `agruparVitrina()` (una tarjeta por familia), sin bump de schema.
- 2026-07-09 (LG.2a): ADR 032 escrito y validado por Esteban el mismo dia (Aceptada).
- 2026-07-04 (LG.1b, ADR 022): vitrina en Ajustes con hint y progreso parcial.
- 2026-07-04 (LG.1a): toast mas legible, cola de a uno, pausa por hover.

**Observaciones**: ADRs relacionados: 022 (vitrina en Ajustes, Superada por LG.2d), 032 (v2, Aceptada), 025 D6 (emojis se conservan). La regla anti-gaming del ADR 032 D2 es principio innegociable: logros que premien la omisión de registro ("día sin gastos") no entran al catálogo bajo ninguna forma; las familias "registro" y "deudas" de LG.2c son ambas ADITIVAS (más registro = más progreso), así que no necesitan la guardia de "mes completo" que sí lleva el único logro de reducción del catálogo (`hormiga-a-raya`, LG.2e: los 4 meses de la comparación deben ser mes completo, el mes en curso no participa y el promedio previo debe superar 100.000). Riesgo residual anotado en el código: un mes completo se cumple con gastos en 3 semanas aunque sean todos grandes; no se agregó una segunda guardia por conteo de transacciones porque castigaría al usuario que sí redujo.

---

---

## Motor único de avisos (CFG.3, iniciativa transversal)

- **Objetivo**          : responder "de todo lo que le pasa al usuario hoy, qué merece avisarle", mirando todas las secciones a la vez. Los `nudge` de cada sección son la señal en contexto dentro de su pantalla y no se comparan entre sí; este motor es el único que puede decir si va primero un arriendo vencido o un tope excedido.
- **Estado actual**     : **iniciativa CFG.3 completa (2026-08-13)**, las tres rebanadas del **[ADR 066](../DECISIONS/066-motor-unico-de-avisos.md)**. Existe el motor (`infra/avisos.js`, ocho tipos de aviso de siete fuentes), la notificación del sistema al abrir (CFG.3a), el panel "Avisos" en Inicio con lo que ningún otro panel del dashboard ya cubre (CFG.3b, detalle en [`contexto/inicio.md`](inicio.md)) y el interruptor por sección en Ajustes + el sello persistido de "ya avisó hoy" (CFG.3c, schema v40, detalle en [`contexto/configuracion.md`](configuracion.md)).
- **Verificado contra** : CFG.3c (2026-08-13).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Motor: recolecta, clasifica y ordena | `modules/infra/avisos.js` | `recolectarAvisos()` | ~250 |
| Filtro de lo que justifica interrumpir | `modules/infra/avisos.js` | `avisosQueInterrumpen()`, `SEVERIDADES_QUE_INTERRUMPEN` | ~300, ~60 |
| Umbrales del motor (3 días, 7 días) | `modules/infra/avisos.js` | `DIAS_COMPROMISO_PROXIMO`, `DIAS_APARTADO_PROXIMO`, `DIAS_PRESTAMO_PROXIMO` | ~63 |
| Recolector por fuente (uno por dominio) | `modules/infra/avisos.js` | `_deCompromisosVencidos()` ... `_deDiaDePago()` | ~110 |
| Superficie: notificación del sistema | `modules/infra/notificaciones.js` | `verificarYNotificar()` | ~120 |
| Copy de esa superficie | `modules/infra/notificaciones.js` | `formatearAvisoSistema()`, `_frase()` | ~160, ~190 |
| Disparo al arrancar (detrás del primer render) | `modules/ui/bootstrap.js` | `verificarYNotificar()` | ~116 |
| Superficie: panel "Avisos" en Inicio (CFG.3b) | `modules/dominio/resumen/view.js` | `renderPanelAvisos()`, `_TIPOS_SIN_PANEL_PROPIO` | ~155 |
| Preferencia por sección + sello del día (CFG.3c) | `modules/infra/avisos.js` | `SECCIONES_AVISO`, `LABEL_SECCION_AVISO`, `filtrarPorPreferencia()` | ~78 |
| Interruptor en Ajustes (CFG.3c) | `modules/dominio/config/view.js` / `index.js` | `_renderPreferenciasAvisos()`, `_toggleAvisoSeccion()` | |
| Migración v39 → v40 | `modules/core/storage.js` | bloque `< 40` en `_migrate` | ~592 |

**Las siete fuentes y quién detecta cada una** (el motor no reimplementa ninguna regla de fecha ni de umbral):

| Tipo | Función | Dónde vive |
|---|---|---|
| `compromiso-vencido` | `vencidosSinPagar` (atraso >= 1 día) | `dominio/compromisos/logic.js` |
| `compromiso-proximo` | `compromisosProximos` (0 a 3 días) | `dominio/compromisos/logic.js` |
| `limite-excedido`, `limite-alerta` | `alertasLimites` | `dominio/presupuesto/logic.js` |
| `apartado-proximo`, `apartado-listo` | `apartadosProximos`, `estaListoParaReiniciar` | `dominio/apartados/logic.js` |
| `prestamo-vencido`, `prestamo-proximo` | `estadoPrestamo` | `dominio/personales/logic.js` |
| `dia-de-pago` | `ocurrenciasEnMes` sobre los ingresos activos | `infra/vencimientos.js` |

**Dependencias y relaciones**: `infra/avisos.js` importa cinco `logic.js` de dominios, solo lectura y nunca un `index.js`/`view.js` ([ADR 060](../DECISIONS/060-lectura-cross-domain-de-solo-lectura.md)); el precedente ya existía en `infra/notificaciones.js`. Es puro: no lee `S`, no toca el DOM, la fecha entra como `hoyISO`. Quien lee `S` es `verificarYNotificar()`, que le pasa las seis colecciones. Desbloquea **PA.1c** (aviso de débito sin saldo, [ADR 052](../DECISIONS/052-pagos-automaticos.md)) y los recordatorios de préstamos del [ADR 047](../DECISIONS/047-me-deben-v2-intereses-e-historial.md): entran como una fuente más de la tabla de arriba.

**Riesgos**:

- **Con la app cerrada no hay aviso, y no es una limitación temporal**: un service worker no puede leer `localStorage`, donde vive todo `fk_v1`, así que no tiene con qué calcular un vencimiento (ADR 066 D1). El copy de Ajustes no debe prometer lo contrario. Único disparador de revisión: **PERF.5** (persistencia a IndexedDB), que resolvería la mitad técnica; la mitad de soporte de plataforma (`periodicsync` es Chromium con PWA instalada, iOS no lo implementa) seguiría igual.
- **`DIAS_APARTADO_PROXIMO` es 7, no el `DIAS_PROXIMO` (30) del dominio**: son dos preguntas distintas (listar en la sección contra avisar hoy) y a propósito no comparten constante. Bajarlas a una sola volvería a llenar el aviso todos los días.
- **Lo que vence hoy nunca es `compromiso-vencido`**: el motor le pide a `vencidosSinPagar` un `umbralDiasAtraso: 1` para que el día del vencimiento lo cubra solo `compromiso-proximo` con `dias: 0`. Si alguien baja ese umbral a 0, el mismo compromiso genera dos avisos el mismo día.
- **Los préstamos personales nunca pasan de severidad `media`**, ni con un año de atraso: el [ADR 047](../DECISIONS/047-me-deben-v2-intereses-e-historial.md) fija que esa sección recuerda y no presiona, y una notificación del sistema por dinero que le deben al usuario es justo esa presión. Interrumpir queda para lo que él debe.
- **El motor no recorta la lista** (ADR 066 D4): si una superficie nueva muestra solo tres avisos, el `slice` va en la superficie. Recortar en el motor se lo esconde a todas a la vez.
- **`nombre` es dato del usuario, nunca copy**: hay un test que verifica que no contenga palabras como "vence" u "hoy". Meter una frase ahí rompe la separación que hace testeable al motor sin fijar el copy.
- **El sello de "ya avisó hoy" (CFG.3c) reemplazó el flag de sesión, no lo sumó**: `S.config.ultimoAvisoISO` es lo único que decide si `verificarYNotificar()` avisa; ya no existe un flag en memoria ni su reset de test (`_resetNotificadoEstasSesion` se eliminó de `notificaciones.js`). Cualquier test que necesite reabrir el día siguiente debe mutar `S.config.ultimoAvisoISO` directo, no llamar a una función de reset.
- **La preferencia por sección (CFG.3c) es por `SECCIONES_AVISO` (cinco), no por los nueve `TIPOS_AVISO`**: decisión y alternativa rechazada en la nota del 2026-08-13 del ADR 066. Un tipo nuevo que se agregue al motor hereda automáticamente la preferencia de su sección; no hace falta tocar el interruptor de Ajustes.
- **Apagar una sección en Ajustes no repinta el panel de Inicio al instante**: `_toggleAvisoSeccion()` solo re-renderiza `#panel-config` (mismo patrón que el resto de toggles de esa pantalla, ninguno emite `state:change`). El panel de Inicio respeta la preferencia en su próximo render, no en vivo.

**Cambios pendientes**: ninguno. Iniciativa completa.

**Cambios realizados**:

- 2026-08-13 (CFG.3c, cierra la iniciativa, [ADR 066](../DECISIONS/066-motor-unico-de-avisos.md) nota de la misma fecha): interruptor por sección en Ajustes (`filtrarPorPreferencia()` en el motor, consumido por `notificaciones.js` y por el panel de Inicio) + sello persistido `config.ultimoAvisoISO` que reemplaza el flag de sesión. Schema v39 → v40. Detalle completo: [`contexto/configuracion.md`](configuracion.md).

- **CFG.3b (2026-08-13)**: panel "Avisos" en Inicio (`resumen/view.js`, `renderPanelAvisos()`), quinta celda del grupo "Atención hoy". Filtra el motor a los tres tipos sin superficie propia (`apartado-listo`, `dia-de-pago`, `prestamo-vencido`): los demás ya viven en "Pendientes del mes", "Próximas prioridades" y "Alertas de límites", sin tocar esa lógica. Detalle completo: [`contexto/inicio.md`](inicio.md).
- **CFG.3a (2026-08-13)**: motor `infra/avisos.js` (ocho tipos, siete fuentes, severidad y orden) y `infra/notificaciones.js` consumiéndolo; `verificarYNotificar()` pasa a leer `S` completo en vez de recibir `S.compromisos`. Riesgo técnico resuelto y escrito en el ADR 066. Sin schema, sin UI nueva.

---

## Refactors transversales pendientes (infra compartida)

- **Objetivo**          : consolidaciones de código duplicado entre dominios, sin lógica de producto nueva. Hallazgo de la auditoría de UX/producto (2026-07-21), patrón P7.
- **Estado actual**     : **ARQ.1 cerrada completa** (2026-08-02). **ARQ.1a** (commit `87b6b04`): `progresoDeBolsa(objetivo, actual)` en `infra/bolsas.js` reemplaza las tres copias de `calcularProgreso`/`calcularProgresoFondo` (Metas, Apartados, Ahorro) y la cuarta inline de `estadoDeBolsa`, con el criterio de bordes más estricto (el del fondo). `diasHastaFecha` de Metas (la copia con otro redondeo que arriesgaba el refactor) se retiró sin reemplazo: no la llamaba nadie en `modules/`. Cada dominio conserva su envoltorio y su vocabulario (`completado` vs. `completada`). Es la pieza que resuelve **DOC.1** (Hub Ahorro necesita leer el progreso de las cuatro bolsas sin importar sus dominios, ADN 10): la fuente única ya vive en `infra/bolsas.js`, junto a `estadoDeBolsa` y `planDeReferencia` (arrancados por DIS.19). **ARQ.1b** (commit `bc25fe9`): `descuentaSaldo(tipoBolsa, registro)` en el mismo archivo expone en código la tabla del ADR 053 I2 (Metas y Apartados siempre descuentan, el Fondo nunca por ADR 020, Inversión según `cuentaId` de INV.1), con 4 tests de invariante en `analisis.test.js`. `calcularActivos()` no llama esta función a propósito: su regla de suma no se toca de forma retroactiva (ADR 053 I4), y uno de los tests documenta esa brecha aceptada (inversión sin `cuentaId` igual suma a activos). **Decisión de Esteban (2026-08-02): los dos puntos que quedaban se dejan como duplicación intencional documentada**, ver abajo; **ARQ.1c** reabrió el segundo el mismo día, a pedido suyo, y bajó a `infra/portafolio.js` el corte de la etapa de Inversión (`etapaDePortafolio()`) que la casa de Ahorro necesitaba. **ARQ.2 cerrada el 2026-08-02** (puntos 1 y 2; punto 3 analizado y dejado sin tocar, ver abajo). Tarjeta **ARQ.1** sale de `docs/BOARD.md`.

**ARQ.1 - un solo modelo para las cuatro bolsas** (`infra/bolsas.js`, cerrada): fondo de emergencia, metas, apartados e inversión comparten `progresoDeBolsa()`, `diasHastaFecha()`/`planDeReferencia()`/`estadoDeBolsa()` (DIS.19) y `descuentaSaldo()` (ADR 053 I2). Cada dominio conserva su envoltorio y su vocabulario. **No fusiona las pantallas**: las 4 secciones siguen respondiendo a mentalidades distintas del usuario. Archivos: `modules/infra/bolsas.js`, `metas/logic.js`, `apartados/logic.js`, `ahorro/logic.js`.

**Dos puntos NO se tocan** (decisión de Esteban, 2026-08-02, mismo criterio que ARQ.2 punto 3): **(1) handlers de "aportar"**, `_guardarAbonoMeta` (`metas/index.js`) y `_guardarAporte` (`apartados/index.js`) siguen casi idénticos línea por línea. El cálculo que hacían distinto ya está unificado desde ARQ.1a; lo que queda es orquestación de UI (`confirmar()`, DOM, `announce()`), no lógica de negocio, y `infra/bolsas.js` se declara "sin DOM" a propósito. `_ajustarSaldoCuenta`, la pieza más chica, ya se repite igual en 7 dominios de toda la app: unificarla solo acá sería una excepción arbitraria. **(2) etapa de Inversión en el carril de Ahorro** (DIS.18): `_estadoInversion()` (`ahorro/logic.js`) mostraba un conteo ("2 inversiones") en vez de la etapa de `momentoInversion()` (`inversiones/logic.js`), y exponerla se dejó fuera por mezclar dos cosas: bajar el cálculo (refactor) y cambiar lo que la fila dice (UI). **ARQ.1c (2026-08-02) separó las dos y resolvió la primera:** `etapaDePortafolio()` en `infra/portafolio.js` devuelve el número de etapa y las inversiones abiertas, sin una palabra de copy; `momentoInversion()` lo consume y conserva sus frases. **AH.8, el mismo día, ejecutó la fila:** el carril dice "2 inversiones, construyendo", el conteo del D4 más la etapa del mockup (ver `contexto/ahorro.md`). El punto (1) sigue como duplicación intencional.

**"Hoy en ISO" tiene una sola fuente: `hoy()` en `infra/utils.js`** (BUG-018, 2026-08-02). Usa los getters locales de `Date`, así que es correcta en UTC-5. Cinco sitios pintaban "hoy" con `new Date().toISOString().slice(0, 10)`, que desde las 7 p.m. hora Colombia ya devuelve mañana: `compromisos/views/formularios.js` (el abono, el único que persistía el dato malo), `compromisos/views/alertas.js`, `config/index.js` ×2 y la copia literal `_hoyISO()` de `personales/view.js`, que se borró. **Lo que NO se movió y por qué:** `isoFecha(d)` (`tesoreria/logic/ingresos.js`) y `_iso(d)` (privada, `infra/vencimientos.js`) formatean una fecha **cualquiera**, no "hoy", y ya son locales: promoverlas sería refactor preventivo. Y `fechaCobertura` (`ahorro/logic.js`) usa `toISOString()` a propósito, sobre un `Date` construido en UTC a mediodía. El defecto que queda es de lectura, no de escritura, y está en **BUG-025**.

**ARQ.2 - consolidar los cálculos duplicados que quedan (cerrada 2026-08-02, salvo punto 3):**

- **(1) `FACTOR_MENSUAL`**: `infra/financiero.js` exporta ahora `FACTOR_MENSUAL_INGRESO` (antes privada); `tesoreria/logic/ingresos.js` reexporta ese mismo objeto como `FACTOR_MENSUAL` en vez de mantener una copia idéntica. Sin cambio de valores ni de callers (`distribucion.js` sigue importando `FACTOR_MENSUAL` de `ingresos.js` como siempre). Las copias de 9 entradas de `compromisos/logic/modelo.js` y `ahorro/index.js` **no se tocan**: son otra tabla (incluyen Bimestral/Trimestral/Semestral/Anual/Única vez) y su duplicación ya está documentada como intencional por ADN #10.
- **(2) Helper "registrar pago de compromiso"**: nuevo `infra/pago-compromiso.js` (`gastoDePagoCompromiso()` escribe el gasto vinculado, "Pago"/"Gastos fijos" o "Abono"/"Deudas" según `esCompromisoDeuda()`; `bajarSaldoDeuda()` topa `saldoTotal` en 0). Sustituye **cuatro** copias, no las 3 que nombraba el hallazgo original: `compromisos/index.js` tenía dos (`_guardarAbono` y el listener `EventBus.on('distribucion:aplicar', ...)`, sin nombrar en la auditoría), más el apply de `tesoreria/acciones/distribucion.js` (`_aplicarNecesidad`) y `agenda/index.js` (`_registrarPagosFijos`). El descuento de la cuenta de origen **queda en cada caller**: cada uno la aplica en un momento distinto y a propósito (inmediato por split en Compromisos, acumulado por cuenta en Agenda, fusionado con el crédito del ingreso en la Distribución v2), documentado en su propio comentario; el helper compartido no toca `cuentas`. Desbloquea la parte de deudas de **CAL.5b**.
- **(3) Analizado, NO se toca** (decisión de Esteban, 2026-08-02): `totalesDelMes`/`totalDia` (`agenda/logic.js`) y `_obligacionesEnRango` (privada, `infra/vencimientos.js`) ya divergieron en comportamiento antes de esta tarea: la segunda topa el monto de una deuda a `saldoTotal` (BUG-004), Agenda no. Consolidarlas de verdad cambiaría lo que el hero de Agenda muestra en una deuda casi saldada (empezaría a toparlo): es un cambio de comportamiento, no el refactor mecánico que pedía la tarjeta. Queda como duplicación intencional (mismo criterio ADN #10 que ya aplica a `calcularAbonosDelMes`), sin tarjeta propia, hasta que alguien decida resolverla.

---

## Aviso de actualización del Service Worker + novedades (UPD.1)

- **Objetivo**          : el SW ya recargaba solo, en silencio, cuando detectaba una versión nueva y era seguro hacerlo (sin modal abierto, sin input con foco). El hueco real era el caso contrario: si no era seguro, el usuario se quedaba sin ninguna señal hasta la próxima recarga casual. UPD.1 cubre exactamente ese hueco con un aviso discreto + botón, y agrega un resumen de novedades que se muestra una sola vez tras actualizar.
- **Estado actual**     : **cerrada (2026-08-02)**. Decisión de alcance: el caso seguro sigue recargando solo sin aviso (comportamiento ya en producción, commits `d13b45c`/`cd14689`, 2026-07-27); el aviso visible aparece solo cuando el guard bloquea la recarga automática.
- **Verificado contra** : `fbaeba6` (2026-08-02).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Guard que bloquea la recarga automática | `modules/infra/sw-register.js` | `esSeguroRecargar()`, listener `controllerchange` | ~56, ~67 |
| Puente hacia el aviso (el SW es `<script>` clásico, no importa `EventBus`) | `modules/infra/sw-register.js` | `document.dispatchEvent(new CustomEvent('sw:actualizacion-lista'))` | ~77 |
| Banner + botón "Actualizar ahora" | `modules/ui/sw-aviso.js` | `initSwAviso()`, `_mostrarAviso()` | ~12, ~16 |
| CSS del banner (mismo esqueleto que `.logro-toast`, sin autocierre) | `styles/components/nudges.css` | `.sw-aviso` | ~260 |
| Catálogo de novedades por versión (clave = número de `CACHE_NAME`) | `modules/core/constants.js` | `NOVEDADES_POR_VERSION` | ~901 |
| Última versión conocida del catálogo (usada por el default y la migración) | `modules/core/constants.js` | `ultimaVersionNovedadesConocida()` | ~909 |
| Marca persistida de hasta dónde ya vio el usuario | `modules/core/state.js` | `config.ultimaVersionVista` | ~412 |
| Migración v31 a v32 (backfill al catálogo vigente en ese momento) | `modules/core/storage.js` | `SCHEMA_VERSION = 32`, migración | ~21, ~472 |
| Modal de novedades (reusa `.modal`/`.modal__header` etc., patrón de `confirm.js`) | `modules/ui/novedades.js` | `mostrarNovedadesSiHay()` | ~18 |
| CSS del modal (lista con viñetas dentro de `.modal__body`) | `styles/modals.css` | `.novedades__lista` | ~570 |
| Wiring en el arranque | `modules/ui/bootstrap.js` | `initSwAviso()`, `mostrarNovedadesSiHay()` | ~78 |

**Dependencias y relaciones**: `sw-register.js` (clásico, sin imports) es el único puente entre el ciclo de vida real del SW y el resto de la app; el `CustomEvent` en `document` es el patrón elegido para cruzar esa frontera sin romper ADN 8 (cero `window.X`). El resumen de novedades es independiente del aviso: corre en cada arranque (`bootstrap.js`) sin importar si la versión nueva entró por la recarga silenciosa o por el botón del aviso. `NOVEDADES_POR_VERSION` y `ultimaVersionNovedadesConocida()` desacoplan a propósito el catálogo de `CACHE_NAME`: no todo bump de SW (uno por tarea que toque código, ver `OPERACION.md`) amerita una entrada de novedades, así que el catálogo queda disperso por diseño.

**Riesgos**:

- **El ciclo de vida del SW tiene esquinas** (waiting/controllerchange/doble recarga) y sigue sin cobertura automatizada: `sw-register.js` no corre en localhost (rama `_esDesarrollo`), así que el guard, el `CustomEvent` real y la recarga solo se pueden verificar en producción o con el SW forzado a mano. Lo que sí se verificó de forma aislada: `initSwAviso()` + un `CustomEvent` simulado muestran el banner correcto y el botón recarga; `mostrarNovedadesSiHay()` con un catálogo de prueba abre el modal, lista los puntos y persiste `ultimaVersionVista` al cerrar.
- **`NOVEDADES_POR_VERSION` depende de disciplina manual**: nadie lo llena automáticamente al bumpear `CACHE_NAME`. Si una tarea futura quiere avisar de una novedad, tiene que acordarse de agregar la entrada; no hay guardarraíl que lo fuerce.
- **Catálogo vacío en este cierre**: no había contenido de producto decidido para anunciar (el copy de novedades es decisión de Esteban, mismo criterio que el copy de UX Writing en otras tarjetas). El mecanismo completo queda probado con datos de prueba, listo para la primera entrada real.

**Cambios pendientes**: ninguno de UPD.1 (tarjeta cerrada, sale del BOARD).

**Cambios realizados**:

- **2026-08-02 (UPD.1)**: aviso discreto + botón para el caso bloqueado, resumen de novedades una sola vez, `config.ultimaVersionVista` (schema v32). Detalle completo en el CHANGELOG.

---

## Shell de escritorio: sidebar, ancho de contenido y barra superior (iniciativa INT.1)

- **Objetivo**          : el escritorio nunca se decidió. El sidebar existía desde antes de que la app tuviera dos topologías y las quince auditorías por sección midieron móvil a 390px, así que escritorio heredó el reparto móvil estirado. El [ADR 059](../DECISIONS/059-interfaz-de-escritorio.md) lo decide en ocho rebanadas (INT.1a a INT.1h).
- **Estado actual**     : **INT.1a, INT.1b, INT.1c, INT.1d, INT.1e, INT.1f e INT.1h cerradas**. INT.1a: contenido centrado + Movimientos en el sidebar. INT.1b: las 4 hijas de Ahorro se anidan bajo la casa (`.nav-subnav`, desplegado solo dentro del grupo) y `BUG-026` se cierra por eliminación de su causa. INT.1c: barra superior fija de 56px con teja+título de la sección activa, "Registrar", tema y Ajustes; fondo opaco sin `backdrop-filter` (Lighthouse 99/100/100/100). INT.1d: `#topbar-saldo` es la cinta de saldo con su ojo, oculta en Inicio (el hero ya lo dice) y sin cuentas; `updSaldo()` recorre todos los `[data-action="saldo-visibilidad"]` porque ahora hay dos ojos a la vez. INT.1e: el primario del encabezado de 8 de las 13 secciones sube a `#topbar-primario`, en secundario. INT.1f: el modal sube a 840px en escritorio y su `<form>` pasa a grid de 2 columnas. INT.1h: cuatro atajos de teclado (`N`, `G` + letra, `?`, `Esc`), apagables en Ajustes. Queda INT.1g.
- **Verificado contra** : INT.1h, commit `f5fcda7` (2026-08-06); INT.1e, commit `63f95f5` (2026-08-06); INT.1f, commit `bf37761` (2026-08-05); INT.1c/INT.1d, commit `a6eb349` (2026-08-05).

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
| Entrada de Movimientos en el sidebar (INT.1a, D6) | `index.html` | `.nav-item--no-mobile` con `href="#movimientos"`, grupo `nav-label-gestion` |
| Entrada de Movimientos en móvil (sin cambios desde DIS.6/C6) | `index.html` | `.mas-tile` con `href="#movimientos"` |
| Sub-nivel de las 4 hijas de Ahorro (INT.1b, D6) | `index.html` | `.nav-subnav#nav-subnav-ahorro`, `[hidden]` por defecto |
| Despliegue del sub-nivel según el hash activo (INT.1b) | `modules/ui/shell.js` | `markActiveNav()`, `GRUPO_AHORRO` |
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

**Riesgos**:

- **El chrome cambia en las 13 secciones a la vez** desde INT.1c: no hay forma de pilotarlo en una sola. La suite completa es compuerta de cada rebanada.
- **Tablet (768 a 1.023px) sigue sin auditar** (pendiente P4 del informe): hoy usa la topología móvil completa en una pantalla de 1.024 de ancho. El hueco crece con cada rebanada, igual que pasó con el ADR 057.
- **Lighthouse 100 es innegociable** y `backdrop-filter` fijo sobre contenido que scrollea es el caso donde el filtro cuesta. **P9 resuelto en INT.1c**: la barra usa fondo opaco con borde inferior, sin `backdrop-filter`; verificado 99/100/100/100.
- **AH.7a cerró primero** (2026-08-13, [ADR 065](../DECISIONS/065-ahorro-en-la-barra-inferior.md)): el grupo de uso diario de `index.html` ganó una entrada `nav-item--mobile-only` a `#ahorro` y Calendario pasó a `nav-item--no-mobile`. El sidebar y la barra superior de escritorio no se tocaron, pero **`[href="#ahorro"]` ya no es único en el DOM**: cualquier selector nuevo (INT.1g incluido) declara plataforma.
- **Las reglas R75 a R77 están reservadas y sin escribir**: entran a `DESIGN_SYSTEM.md` cuando cierre la última rebanada, así que hoy la lista de principios tiene un hueco declarado entre R74 y R78.
- **Una hija de Ahorro ya no es un clic directo desde cualquier sección** (INT.1b, tradeoff aceptado por el ADR): hace falta abrir "Ahorro" primero para desplegar el sub-nivel. Tests que clickeaban `#metas`/`#inversion` directo desde Dashboard se movieron a `page.goto()` o al camino de dos clics.

**Cambios pendientes**: queda una rebanada (INT.1g, carril derecho sin sección que lo use todavía) en `docs/BOARD.md`.

**Cambios realizados**:

- **2026-08-06 (INT.1h)**: cuatro atajos de teclado en `_handleKeydown()` (`ui/actions.js`). `N` abre "¿Qué quieres registrar?", `G` + letra (mapa fijo de 11 secciones) navega, `?` abre `#modal-atajos`, `Esc` sigue cerrando el modal abierto (sin cambios). Riesgo P8 (choque con lector de pantalla / escritura normal) mitigado con tres guardas: campo de texto o `contenteditable` con foco, modal abierto (foco atrapado), o tecla modificadora presionada, todas cancelan el atajo antes de actuar. Interruptor en Ajustes → La app (WCAG 2.1.4, exige poder apagar un atajo de una sola tecla): `S.config.atajosTeclado`, default `true`, schema v35 con migración idempotente. Commit `f5fcda7`. Detalle en el CHANGELOG.
- **2026-08-06 (INT.1e)**: `#topbar-primario` en la barra superior, en secundario (R38). `_syncPrimarioTopbar()` (`shell.js`) lee el único `.btn-primary` del encabezado activo (mismo botón que R1 ya exige único por pantalla) y copia texto, `aria-label` y `data-action`/`data-modal`, sin mapa nuevo por sección. Cubre 8 de las 13 secciones; Análisis, Ahorro, Movimientos, Fondo, Inversión y Ajustes no tienen primario de encabezado. Se resincroniza en cada navegación y ante `state:change` (Deudas sin deudas activas, Límites sin plan del mes). El botón original se oculta en desktop (`responsive.css`) y se restaura bajo 1024px con `:not([hidden])`. Commit `63f95f5`. Detalle en el CHANGELOG.
- **2026-08-05 (INT.1c e INT.1d)**: barra superior fija de 56px con teja+título de la sección activa, "Registrar" (misma hoja que móvil, otro disparador), tema y Ajustes; fondo opaco sin `backdrop-filter` (P9 resuelto). Cinta de saldo con su ojo, oculta en Inicio y sin cuentas, mismo flag `ocultarSaldo` y misma acción `saldo-visibilidad` que el hero. Commit `a6eb349`. Detalle en el CHANGELOG.
- **2026-08-05 (INT.1f)**: el modal base sube de 520 a 840px desde 1024px de ventana; su `<form>` interno pasa a grid de 2 columnas, con los `.form-group` simples (label + un solo `.input`/`.select`, sin hint ni picker) emparejados vía `:has()` y todo lo demás a ancho completo. Móvil no cambia. Detalle en el CHANGELOG.
- **2026-08-03 (INT.1b)**: las 4 hijas de Ahorro se anidan bajo la casa en el sidebar de desktop, desplegadas solo dentro del grupo; `.section__volver` de las 4 se oculta en desktop; BUG-026 se cierra por eliminación de causa (el bloque de compactación de emergencia se borró). Detalle en el CHANGELOG.
- **2026-08-02 (INT.1a)**: `.section` gana `margin-inline: auto` y Movimientos entra al grupo "Seguimiento" del sidebar. Detalle en el CHANGELOG.

---

## Sistema de guía por navegación (GU.1, auditoría GU.1a cerrada 2026-08-03)

- **Objetivo**          : principio "aprender usando, no leyendo": el usuario descubre la app guiado en el momento de necesidad, no leyendo texto permanente. Ya se aplica en varios puntos (CTA de cuenta lleva a crearla, CAL.1 ofrece distribuir al llegar el ingreso, el fondo recomienda su aporte en la distribución) y se adopta como principio transversal.
- **Estado actual**     : **[ADR 016](../DECISIONS/016-banner-proposito-de-seccion.md) auditado y vigente sin desviaciones.** GU.1a se adelantó a su recomendación original ("después de las v2 grandes") por instrucción directa: alcance acotado a lo ya en producción, con el único hallazgo cruzado marcado para que su sección v2 lo resuelva al rediseñar (no antes).
- **Inventario verificado** (17 secciones de dominio + `index.html` + `shell.js`):
  - Las 11 secciones del ADR (`modules/ui/proposito.js`) tienen su banner, cero código muerto de EP.1-EP.6 (`propositoColapsado`, toggles, bloque de Ajustes: ningún rastro en `modules/`), y sus empty states quedaron recortados sin repetir el banner (verificado contra la tabla de EP.7 más abajo).
  - El único `section__subtitle` que queda en `index.html` (Mis cuentas, "Fuentes de ingreso") es título de sub-bloque, no descripción de propósito: encaja en la excepción que el propio ADR ya declara para "Mis ingresos fijos".
  - Las 6 secciones sin banner (Dashboard, Ajustes, Movimientos, Accesos, Import, Logros) siguen fuera con motivo propio: Dashboard/Ajustes ya excluidas por el ADR; Movimientos y Accesos son autoevidentes (listado/tiles); Import tiene su instrucción funcional fija, no de propósito; Logros ya aplica el principio "aprender usando" en su propio idioma (hint de "cómo conseguirlo" por logro) y no necesita el patrón del banner encima.
  - **Único hallazgo:** Ahorro apila dos preguntas gancho cuando el fondo está vacío (banner + hero, detalle en [`contexto/ahorro.md`](ahorro.md)). Cae dentro de **AH.5 D3** (rediseño del hero), no se toca acá por la regla anti-doble-trabajo.
- **Conclusión formal**: no hace falta re-cortar GU.1a en tarjetas por sección; el sistema transversal está sano y el ADR no se revisa de fondo, solo se confirma.

**Regla anti-doble-trabajo**: esta tarjeta define el principio y audita el sistema transversal (banners, hints); los rediseños internos de cada sección viven en sus propias iniciativas v2, que aplican el principio en vez de duplicarlo.

---

## Aceptación legal versionada (LEG.2)

- **Objetivo**          : aceptación expresa del paquete legal antes de usar la app (onboarding, usuario nuevo) y re-aceptación cuando la versión vigente cambie (usuario existente). No espera al checklist de contenido de [`legal/README.md`](../legal/README.md) (responsable, contacto, licencia, revisión de abogado): eso bloquea el paso a v1.0, no el mecanismo, que corre sobre `VERSION_LEGAL` vigente (`Borrador v0.1`).
- **Estado actual**     : cerrada (2026-08-04). Onboarding gana paso 2 (checkbox único + 3 enlaces al Centro Legal); gate standalone `#aceptacion-legal` para `S.onboarded === true` con `legalAceptado` ausente o de otra versión, bloqueante (Escape lo ignora vía `data-bloqueante`). Usuario existente con datos ya guardados queda **grandfathered** en la migración v33 (versión histórica `Borrador v0.1`, hardcoded a propósito): no se le exige aceptar retroactivamente el día del despliegue.
- **Verificado contra** : `53becc8` (2026-08-04).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Registro de aceptación en el estado | `modules/core/state.js` | `config.legalAceptado` | ~425 |
| Migración v32 a v33 (grandfather) | `modules/core/storage.js` | `SCHEMA_VERSION = 33` | ~21, ~485 |
| Bloque compartido + gate standalone | `modules/ui/aceptacion-legal.js` | `faltaAceptarLegal()`, `renderBloqueAceptacion()`, `registrarAceptacion()`, `initAceptacionLegal()` | |
| Paso 2 del wizard | `modules/ui/onboarding.js` | `_renderPaso2()`, `_onSubmitPaso2()` | |
| Escape ignora overlays bloqueantes | `modules/ui/actions.js` | `_handleKeydown()`, `data-bloqueante` | ~54 |
| Overlay del gate | `index.html` | `#aceptacion-legal` | |
| Wiring de arranque | `modules/ui/bootstrap.js` | `initAceptacionLegal()`, tras `initOnboarding()` | |

**Dependencias y relaciones**: reusa la acción global `abrir-legal` (registrada por `config/index.js`, LEG.1) para los 3 enlaces del checkbox, sin importar el dominio config desde `ui/`. `bootstrap.js` difiere `mostrarNovedadesSiHay()` mientras el gate esté pendiente, para no abrir dos modales encima (`trapFocus` no apila).

**Riesgos**:

- **El checklist de contenido sigue abierto** (`legal/README.md`): responsable, correo de contacto y licencia del código sin decidir; revisión de abogado colombiano pendiente (trabajo externo). El paquete sigue en v0.1 borrador; cuando suba a v1.0 (o cualquier cambio importante), el gate de re-aceptación se activa solo con el bump de `VERSION_LEGAL`.
- **La versión hardcoded `Borrador v0.1` en la migración v33 no debe seguir a `VERSION_LEGAL`** si ese texto cambia: es un hecho histórico de esa migración, mismo precedente que `REMAPEO_TIPO_DEUDA` (v18 a v19).
- **Evidencia solo local** (limitación honesta ya documentada en `legal/README.md`): sin servidor, `legalAceptado` vive únicamente en el dispositivo del usuario.

**Cambios pendientes**: ninguno de código. El paso a v1.0 depende del checklist de contenido, que es trabajo de Esteban/abogado, no de esta tarjeta.

**Cambios realizados**:

- **2026-08-04 (LEG.2)**: onboarding de 2 pasos, gate de re-aceptación, migración v33 grandfathered. Detalle en el CHANGELOG.
