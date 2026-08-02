# Ficha de contexto: Transversal

> Funcionalidades que atraviesan varias secciones y no son visuales: taxonomía de categorías, persistencia, el CTA de cuenta y el sistema de logros. Reglas de uso y plantilla en [`README.md`](README.md).
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

**Cambios pendientes**: ninguno de CAT.1 (iniciativa completa; la tarjeta sale del BOARD). **CAT.3 decidida el 2026-07-31 ([ADR 058](../DECISIONS/058-categorias-personalizadas-globales.md))**, cuatro rebanadas sin iniciar: ver el bloque "Categorías personalizadas del usuario" más abajo. **CAT.4 cerrada (2026-07-31)**: sin hallazgos.

**Cambios realizados**:

- **CAT.4 (2026-07-31)**: auditoría de las dos reglas (categoría/tipo antes que descripción, fecha por defecto = hoy en creación) sobre los ~8 formularios en alcance (Gastos, Ingresos fijos y puntuales, Transferencias, Deuda nueva, Abono a deuda, Gasto fijo, Inversiones, Personales/préstamos, Ahorro/aporte): las dos reglas ya se cumplían en todos. `fechaObjetivo` (Apartados) y `fechaLimite` (Metas) quedan fuera de alcance: son fecha meta futura opcional, no fecha de registro/movimiento. Cierre sin cambios de código.

- **CAT.1a (2026-07-13)**: `CATEGORIAS_GASTO_USUARIO` excluye Vivienda y Servicios públicos (además de Deudas/Ahorro/Alimentación, ya excluidas); `CATEGORIAS_GASTO` (catálogo base) las conserva para `CATEGORIA_ICONO` y la validación de límites existentes. `CATEGORIAS_TIPICAMENTE_FIJAS` eliminada de `constants.js`; `#hint-categoria-fija` eliminado de `renderFormGasto()`; su listener de `change` eliminado de `_montarFormGasto()`. Sin bump de schema.
- **CAT.1c (2026-07-27)**: `CATEGORIAS_META_USUARIO` (nueva, filtra `CATEGORIAS_META`) excluye Cumpleaños y Vacaciones; el catálogo base y `CATEGORIA_META_ICONO` los conservan para el render legado. `_renderOpcionesCategoria()` (`metas/view.js`) lee el catálogo curado y reinyecta la categoría retirada cuando la meta editada ya la tenía. Sin bump de schema.
- **CAT.1b (2026-07-13)**: `PLANTILLAS_APARTADO` (`apartados/logic.js`) 17→20 plantillas. Sale Vacaciones ✈️. "Matrícula o semestre" 🎓 → "Matrícula escolar" 🎓. "Útiles escolares" 📚 → "Útiles y uniformes" 🎒. Entran Veterinario 🩺, Mantenimiento del hogar 🛠️, Seguro del hogar 🛡️, Reparaciones inesperadas 🧰. Sin cambios en `_aplicarPlantilla()`/`renderFormApartado()` (agnósticos al contenido del catálogo). Sin bump de schema.

---

## Categorías personalizadas del usuario (TX.9b, y su extensión CAT.3)

- **Objetivo**          : el usuario crea sus propias categorías con nombre e ícono, y valen igual que las nativas. Hoy solo en Gastos; **CAT.3** las extiende a Gastos fijos con la sección como campo del objeto, oferta filtrada por sección y resolución de ícono global ([ADR 058](../DECISIONS/058-categorias-personalizadas-globales.md), 5 decisiones).
- **Estado actual**     : **TX.9b en producción, CAT.3a cerrada (2026-08-01)**, quedan CAT.3b a CAT.3d. `S.categoriasPersonalizadas` es `{id, nombre, icono, fechaCreacion, seccion}[]` (`seccion: 'gasto' | 'fijo'`, D1, migración v30 a v31; existentes backfilleadas a `'gasto'`); la clave funcional sigue siendo el **`nombre`**, que es lo que se guarda en `Gasto.categoria` igual que una nativa. `id` y `fechaCreacion` los inyecta el helper genérico `guardar()` de `infra/crud.js`. La **resolutora** (D2) ahora fusiona `CATEGORIA_ICONO` y `CATEGORIA_AGENDA_ICONO` antes de caer a la personalizada, e ignora `seccion` a propósito. El **validador** (D4) compara contra los dos catálogos nativos completos. Hasta CAT.3c el formulario de gasto sigue siendo la única fuente: `gastos/index.js` estampa `seccion: 'gasto'` al crear. **No hay edición ni borrado**: la única operación sobre la colección es `guardar()`, así que una vez creada es permanente. Eso queda **fuera** del ADR 058 y sale a tarjeta propia.
- **Verificado contra** : CAT.3a (2026-08-01).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| El array en el estado (contrato en JSDoc) | `modules/core/state.js` | `categoriasPersonalizadas` | ~421 |
| Migración v30 a v31 (`seccion`) | `modules/core/storage.js` | idempotente, backfill `'gasto'` | ~447 |
| **Resolutora, punto único** | `modules/core/constants.js` | `iconoDeCategoriaGasto(categoria, personalizadas)` | ~529 |
| Catálogo de íconos elegibles (29, cerrado) | `modules/core/constants.js` | `ICONOS_CATEGORIA_PERSONALIZADA` | ~487 |
| Validador del alta (D4: dos catálogos nativos) | `modules/dominio/gastos/logic.js` | `validarCategoriaPersonalizada()` | ~314 |
| Alta (dentro del guardado del gasto, estampa `seccion: 'gasto'`) | `modules/dominio/gastos/index.js` | `_guardarGasto()`, chip sentinela `'__nueva__'` | ~66 |
| Chips del formulario de gasto | `modules/dominio/gastos/view.js` | nativas, personalizadas, sentinela | ~612 |

**Las 7 superficies que leen el mapa crudo** (alcance de CAT.3b, D3 del ADR 058). Las tres últimas **ya fallan hoy**, sin CAT.3:

| # | Archivo | Qué pinta | Acceso crudo |
|---|---|---|---|
| C1 | `modules/dominio/agenda/view.js:716` | detalle del día del calendario | `CATEGORIA_AGENDA_ICONO[c.categoria]` |
| C2 | `modules/dominio/agenda/view.js:888` | chips del formulario de gasto fijo | `CATEGORIA_AGENDA_ICONO[c]` |
| C3 | `modules/dominio/gastos/logic.js:585` | `iconoPorOrigen()`, gasto nacido de un fijo | `CATEGORIA_AGENDA_ICONO[comp.categoria]` |
| C4 | `modules/dominio/tesoreria/views/distribucion.js:315` | checklist de Necesidades | `CATEGORIA_AGENDA_ICONO[it.categoria]` |
| C5 | `modules/dominio/presupuesto/view.js:492` | envelope de un límite | `CATEGORIA_ICONO[...] ?? 'c-otros'` |
| C6 | `modules/dominio/presupuesto/view.js:742` | banner de alertas de límite | `CATEGORIA_ICONO[...] ?? 'c-otros'` |
| C7 | `modules/dominio/resumen/view.js:119` | categoría top de la semana, en Inicio | `CATEGORIA_ICONO[...] ?? 'c-otros'` |

**Los 3 gates de escritura de Gastos fijos** (alcance de CAT.3c): `compromisos/logic/modelo.js:276` rechaza con error toda categoría fuera de `CATEGORIAS_AGENDA`; `:414` la descarta a `null` **en silencio**; `:55` decide si `descripcion` es la categoría o texto libre. Dos espejos en la UI: `agenda/index.js:145` (prefill al editar) y `:217` (`_syncCategoriaGastoFijo`).

**Dependencias y relaciones**: `iconoDeCategoriaGasto()` es pura (recibe las personalizadas por parámetro, el caller lee `S`) y está cableada en 7 sitios del lado Gastos y Presupuesto. `validarPresupuesto` es el **único** validador que ya recibe las personalizadas (`presupuesto/logic.js:558`, cableado en `presupuesto/index.js:97`). **TX.4 sube de guardarraíl a dependencia** con el ADR 058 D2: la resolución global se apoya en que dos catálogos nativos nunca den símbolos distintos a la misma etiqueta, y las 5 etiquetas compartidas (Servicios públicos, Mercado, Educación, Transporte, Mascotas) hoy coinciden.

**Riesgos**:

- **Colisión de nombre con el catálogo de Agenda: cerrada por CAT.3a.** `validarCategoriaPersonalizada` ya compara también contra `CATEGORIAS_AGENDA`. Una personalizada creada **antes** de CAT.3a con un nombre que hoy colisiona (ej. "Arriendo") conserva su categoría y sus gastos: D4 valida altas nuevas, nunca reescribe lo guardado (misma regla que CAT.1a).
- **Sin validación de longitud ni de cantidad**: el input no tiene `maxlength` y no existe ningún tope de cuántas personalizadas se pueden crear.
- **El roundtrip de CSV no recrea la entrada**: `import/logic.js:176` acepta cualquier texto como categoría, así que exportar e importar conserva el **nombre** pero no vuelve a crear la personalizada en `S`; el gasto importado queda sin ícono asociado.
- **Una personalizada sin uso sigue apareciendo**: borrar su último gasto no la retira del catálogo, porque no hay borrado.
- **Precedencia de `iconoPorOrigen`**: un gasto nacido de un fijo o de un abono hereda el ícono del compromiso y la personalizada nunca se consulta (`gastos/view.js:441`).

**Cambios pendientes**: CAT.3b a CAT.3d (detalle y alcance por rebanada en el BOARD). Fuera de alcance por decisión del ADR 058: renombrar y eliminar (tarjeta propia), Apartados y Metas (catálogos de otra naturaleza), Ingresos.

**Cambios realizados**: `TX.9b`: creación de la funcionalidad (detalle en el CHANGELOG). `2026-07-31 (ADR 058)`: mapeo completo de origen y destino, sin cambios de código. `2026-08-01 (CAT.3a)`: campo `seccion`, migración v30 a v31, resolutora global, validador D4 (detalle en el CHANGELOG).

---

---

## Persistencia y salvaguarda de cuota (localStorage)

- **Objetivo**          : todo el estado vive en `localStorage` bajo la clave única `fk_v1` (ADN 3). `save()` está debounced 200 ms; `_flush()` serializa `S` entero y escribe. Una salvaguarda avisa antes de llenar la cuota y evita que un guardado fallido se pierda en silencio (ADR 030).
- **Estado actual**     : estable. **PERF.4** ([ADR 030](../DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md), 2026-07-06) decidió **no** reescribir la persistencia (el costo de guardar es ~5 ms debounced, medido en `scripts/perf/`) y en su lugar agregó la salvaguarda de cuota. **IndexedDB** queda como dirección futura (**PERF.5** en BOARD, no iniciar sin un disparador del ADR 030 D4). Partir `localStorage` por clave está **rechazado** (no sube la cuota). Desde **PERF.8** el harness también mide el arranque (`loadData()`: `JSON.parse` + migraciones), la otra mitad de la ruta: **0,6 / 2,6 / 5,1 ms** de mediana a 1.000 / 5.000 / 10.000 gastos. Lineal y lejos del disparador; el D4 sigue exigiendo jank en dispositivo real, no esta cifra de happy-dom.
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

**Cambios realizados**: `2026-07-06 (PERF.4, ADR 030)`: salvaguarda de cuota + guardado que ya no falla en silencio (detalle en CHANGELOG). `2026-07-31 (PERF.8)`: columna "arranque" en el harness, el dato que el D4 pedía.

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

**Cambios pendientes**: **LG.2e** (familia comportamiento): `hormiga-a-raya` implementable ya (categorías hormiga/café + guardia de mes completo de registro, ADR 032 D2.3); `ahorro-creciente` **bloqueado** hasta que exista la derivación canónica de ingreso mensual (probable entregable de ANL.1); `pagador-puntual` pendiente de verificar si el histórico de abonos por fecha alcanza. Cada logro pasa el test anti-gaming del ADR 032 D2 explícitamente en su PR. Los nombres de `NIVELES_USUARIO` son provisionales: cuando Esteban entregue los definitivos, se cambia la constante (sin tocar datos, nada se persiste).

**Cambios realizados**:

- 2026-07-12 (LG.2c, ADR 032 D3/D4): constancia de registro y deudas saldadas; `mesCompleto()` y `rachaMesesCompletos()` nuevas.
- 2026-07-09 (LG.2b, ADR 032 D1/D5): fundacion de progresion: `familia`/`nivel` en el catalogo, `FAMILIAS` y `agruparVitrina()` (una tarjeta por familia), sin bump de schema.
- 2026-07-09 (LG.2a): ADR 032 escrito y validado por Esteban el mismo dia (Aceptada).
- 2026-07-04 (LG.1b, ADR 022): vitrina en Ajustes con hint y progreso parcial.
- 2026-07-04 (LG.1a): toast mas legible, cola de a uno, pausa por hover.

**Observaciones**: ADRs relacionados: 022 (vitrina en Ajustes, vigente operativamente hasta la rebanada LG.2d), 032 (v2, Aceptada), 025 D6 (emojis se conservan). La regla anti-gaming del ADR 032 D2 es principio innegociable: logros que premien la omisión de registro ("día sin gastos") no entran al catálogo bajo ninguna forma; las familias "registro" y "deudas" de LG.2c son ambas ADITIVAS (más registro = más progreso), así que no necesitan la guardia de "mes completo" que sí exigirá LG.2e para los logros de reducción de gasto (hormiga-a-raya).

---

---

## Refactors transversales pendientes (infra compartida)

- **Objetivo**          : dos consolidaciones de código duplicado entre dominios, sin lógica de producto nueva. Hallazgo de la auditoría de UX/producto (2026-07-21), patrón P7.
- **Estado actual**     : **ARQ.1 arrancó de lado** (2026-07-29, DIS.19): dos piezas concretas ya viven en infra porque la casa de Ahorro las necesitaba y ADN 10 le prohibia importar esos dominios. **`infra/bolsas.js`** guarda `diasHastaFecha` + `planDeReferencia` + `estadoDeBolsa` (venian de Apartados) y **`infra/portafolio.js`** la cadena de proyeccion completa, de `esProyectable` a `columnasPortafolio` (venia de Inversion). Cada dominio re-exporta con el nombre de siempre, asi que no cambio ningun llamador ni test, y `tests/unit/bolsas.test.js` compara identidad de funcion entre infra y el dominio para que una copia local nueva falle. Lo que sigue pendiente de ARQ.1 es el **modelo unificado**: `calcularProgreso` (3 copias), `diasHastaFecha` de Metas (otra firma y otro redondeo), los handlers de aportar y la propiedad "descuenta saldo" del ADR 053. Tarjetas **ARQ.1** y **ARQ.2** en `docs/BOARD.md`.

**ARQ.1 - un solo modelo para las cuatro bolsas** (`infra/bolsas.js`): fondo de emergencia, metas, apartados e inversión son 4 implementaciones del mismo concepto (bolsa con objetivo, acumulado, progreso y aportes). Duplicación medida: `calcularProgreso` escrito 3 veces, `diasHastaFecha` 2 veces **con redondeos distintos** (el riesgo real del refactor), handlers de "aportar" casi carácter por carácter entre Metas y Apartados. Extraer a `infra/` las funciones puras compartidas + un componente de fila de progreso; precedente exacto `infra/vencimientos.js` (MC.13a/b). **No fusiona las pantallas**: las 4 secciones responden a mentalidades distintas del usuario, se unifica la infraestructura, no la UX. Archivos: `modules/infra/` (nuevo), `metas/logic.js`, `apartados/logic.js`, `ahorro/logic.js`, `inversiones/logic.js`.

**ARQ.2 - consolidar los cálculos duplicados que quedan**: (1) `FACTOR_MENSUAL` vive en 2 archivos (`infra/financiero.js` como `FACTOR_MENSUAL_INGRESO`, `tesoreria/logic/ingresos.js` como `FACTOR_MENSUAL`). (2) el helper "registrar pago de compromiso" (gasto-abono + bajar saldo + descontar cuenta) escrito 3 veces (`compromisos/_guardarAbono`, apply de `acciones/distribucion.js`, `agenda/_marcarPagadoGastoFijo`); centralizarlo reduce la superficie de bugs como BUG-015. (3) totales de Agenda que recalculan lo que el motor de vencimientos ya da. Conviene **antes** de CAL.5b (que suma deudas al lote y ahí sí necesita mover `saldoTotal`); refactor sin cambio de comportamiento, con las suites existentes como red de regresión.

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

## Sistema de guía por navegación (GU.1, auditoría pendiente)

- **Objetivo**          : principio "aprender usando, no leyendo": el usuario descubre la app guiado en el momento de necesidad, no leyendo texto permanente. Ya se aplica en varios puntos (CTA de cuenta lleva a crearla, CAL.1 ofrece distribuir al llegar el ingreso, el fondo recomienda su aporte en la distribución) y se adopta como principio transversal.
- **Estado actual**     : pendiente de análisis, no iniciada. Tarjeta **GU.1a** en `docs/BOARD.md`: inventario de todos los banners/hints/CTAs de arranque por sección, propuesta de qué se elimina/fusiona/convierte en guía contextual, revisión formal del [ADR 016](../DECISIONS/016-banner-proposito-de-seccion.md), re-corte en rebanadas por sección. Conviene DESPUÉS de que las iniciativas v2 grandes definan sus pantallas, o la auditoría se hace dos veces.

**Regla anti-doble-trabajo**: esta tarjeta define el principio y audita el sistema transversal (banners, hints); los rediseños internos de cada sección viven en sus propias iniciativas v2, que aplican el principio en vez de duplicarlo.
