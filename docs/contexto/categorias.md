# Ficha de contexto: Categorías

> Revisado: 2026-08-14.

> La taxonomía que comparten todas las secciones (CAT.1) y las categorías que crea el usuario (TX.9b, CAT.3). Partida de [`transversal.md`](transversal.md) el 2026-08-14 (DOC.3). Reglas de uso y plantilla en [`README.md`](README.md).
>
> **Qué NO buscar acá:** el selector compacto de ícono con el que se elige el glifo de una categoría nueva (en [`captura.md`](captura.md)); el formulario de gasto y su lista (en [`gastos.md`](gastos.md)).

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
| Opciones del selector de meta (reinyecta la categoría retirada al editar) | `modules/dominio/metas/view.js` | inline en `renderFormMeta()`, sobre `CATEGORIAS_META_USUARIO` | ~355 |

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
- **CAT.1c (2026-07-27)**: `CATEGORIAS_META_USUARIO` (nueva, filtra `CATEGORIAS_META`) excluye Cumpleaños y Vacaciones; el catálogo base y `CATEGORIA_META_ICONO` los conservan para el render legado. El armado de opciones de `metas/view.js` (inline, no es función propia) lee el catálogo curado y reinyecta la categoría retirada cuando la meta editada ya la tenía. Sin bump de schema.
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
