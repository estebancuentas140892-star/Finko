# Ficha de contexto: Metas

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## Metas de ahorro (dominio `metas`)

- **Objetivo**          : bolsas de ahorro con nombre, objetivo, fecha límite opcional y categoría (dueño de su propio `montoActual`, a diferencia de Deudas que deriva el progreso del historial de gastos). El usuario crea, abona, edita y elimina; la fecha límite alimenta un ritmo de ahorro sugerido (MT.4) según la frecuencia real de sus ingresos.
- **Estado actual**     : estable. **EDIT.1a** (2026-07-23) cierra el hueco de edición: antes solo se podía crear, abonar y eliminar; corregir un nombre o un objetivo mal escrito obligaba a eliminar y recrear, perdiendo el progreso acumulado.
- **Verificado contra** : EDIT.1a (2026-07-23).

**Dónde vive**

| Pieza | Archivo | Ancla |
|---|---|---|
| Progreso (porcentaje, faltante, completada) | `modules/dominio/metas/logic.js` | `calcularProgreso(meta)` |
| Normalización crear/editar (EDIT.1a) | `modules/dominio/metas/logic.js` | `normalizarMeta(datos, metaExistente = null)` |
| Validación | `modules/dominio/metas/logic.js` | `validarMeta()`, `validarAbono()` |
| Ritmo de ahorro por periodo (MT.4, motor compartido MC.13b) | `modules/dominio/metas/logic.js` | `calcularAhorroPorPeriodo()`, reexporta `frecuenciaPrincipalIngresos`/`etiquetaPeriodoAhorro` de `infra/vencimientos.js` |
| Lista de metas activas | `modules/dominio/metas/view.js` | `renderListaMetas()`, `_renderMetaItem()` |
| Formulario crear/editar (EDIT.1a) | `modules/dominio/metas/view.js` | `renderFormMeta(meta = null)` |
| Formulario de abono | `modules/dominio/metas/view.js` | `renderFormAbonoMeta(meta)` |
| Ícono de categoría/legacy en el título | `modules/dominio/metas/view.js` | `_iconoMeta()` |
| (Re)inyección del form + wiring, único punto de entrada crear/editar | `modules/dominio/metas/index.js` | `_inyectarFormMeta(meta = null)` |
| Handlers de acción | `modules/dominio/metas/index.js` | `_nuevaMeta()`, `_editarMeta()`, `_guardarMeta()`, `_eliminarMeta()`, `_abrirAbonoMeta()`, `_guardarAbonoMeta()` |

**Recursos**: anillo de progreso compartido (`infra/svg.js`, `progressRing()`); selector de cuenta compartido (`infra/cuenta-helper.js`, `renderSelectorCuenta`, usado en el abono); picker de ícono compacto (`infra/icon-picker.js`, CAT.2b) para la categoría "Otra"; catálogo `CATEGORIAS_META`/`CATEGORIA_META_ICONO`/`ICONOS_CATEGORIA_PERSONALIZADA` de `core/constants.js` (el mismo catálogo de íconos personalizados que usan Gastos y Agenda).

**Dependencias y relaciones**: `metas/logic.js` es puro (sin `S`, sin DOM); `metas/view.js` lee `S.metas`, `S.cuentas` e `S.ingresos`. **Sin ojo de privacidad**: a diferencia de Gastos/Agenda/Deudas, esta sección no enmascara montos con `S.config.ocultarSaldo` (no consume `SALDO_MASCARA`). `metas/index.js` escucha `state:change` de `metas` y el evento `distribucion:aplicar` (Tesorería, ADR 012/MC.4a) para aplicar abonos del asistente "Distribuir mi ingreso" sin descontar la cuenta ahí (la descuenta Tesorería de forma centralizada). No importa de otros dominios (ADN #10).

**Riesgos**:

- **`montoActual` es un campo cacheado, no derivado de un ledger** (a diferencia de Deudas, donde el saldo se deriva de `S.gastos` vía `calcularAbonosDelMes`). Cualquier función que construya el shape completo de una meta (`normalizarMeta`, el handler de abono, `distribucion:aplicar`) debe leer y preservar `montoActual` explícitamente: sobrescribirlo con `0` o con un valor no derivado del existente destruye progreso en silencio. `normalizarMeta(datos, metaExistente)` es la única función que construye el shape completo; su segundo parámetro existe exactamente para no repetir este error al editar (EDIT.1a).
- **Las metas completadas desaparecen de la lista** (`metasActivas()` filtra `completada !== true`): no hay una vista de "metas cumplidas" ni forma de editarlas o revisarlas una vez marcadas. Si se pide, es una tarjeta nueva (ver "Cambios pendientes"); hoy ni el botón Editar ni Eliminar están disponibles para una meta completada porque el DOM ni se pinta.
- **`_iconoMeta()` distingue dos formatos históricos de `meta.icono`**: un id de sprite (`c-*`, patrón `/^[a-z]-/`) o un emoji crudo (metas creadas antes de CAT.2b con el campo de texto libre de MT.3). El picker de EDIT.1a (`renderFormMeta`) hereda la misma distinción al prellenar: un emoji legacy no se pasa como `valorActual` al picker (ningún botón del catálogo lo representa; se dejaría el recuadro vacío en vez de romper el glifo con un `href` inválido).
- **El form pasó de singleton reusado a reinyectado en cada apertura (EDIT.1a)**: antes `_inyectarForm()` se llamaba una sola vez en `initMetas()` y cada apertura de "Nueva meta" limpiaba manualmente el picker de ícono (`resetIconoPicker`) porque el DOM persistía entre aperturas. Ahora `_inyectarFormMeta(meta)` reconstruye el HTML completo en cada apertura (crear o editar), mismo patrón que Gastos/Agenda/Compromisos: más simple de razonar, y necesario para poder prellenar una meta existente sin arrastrar el estado visual de la apertura anterior.

**Cambios pendientes**: ninguno conocido para EDIT.1a. Fuera de alcance de esta rebanada: vista de metas completadas (ver riesgo arriba, sin tarjeta propia hoy); ojo de privacidad (`S.config.ocultarSaldo`) no implementado en esta sección, a diferencia del resto de la app.

**Cambios realizados**:

- 2026-07-23 (**EDIT.1a**, patrón P3 de la auditoría de UX/producto, primera de cuatro rebanadas: Metas, Apartados, Inversión y Me deben siguen el mismo patrón de aquí en adelante): editar una meta sin destruir el progreso. Botón "Editar" (`i-edit`) en cada fila, junto a Abonar/Eliminar. `renderFormMeta(meta = null)` prellena nombre, monto objetivo, fecha límite y categoría (con el picker de ícono también prellenado si la categoría es "Otra" y el ícono guardado es un id de sprite válido); el botón cambia a "Actualizar meta". `normalizarMeta(datos, metaExistente = null)` es el corazón de la decisión de producto: **conserva `montoActual` tal cual** (no se toca el histórico de aportes al corregir un dato) y **recalcula `completada`** contra el nuevo objetivo, porque cambiar el objetivo puede cruzar el umbral de cumplimiento en cualquier dirección con el mismo monto ya aportado. El form dejó de ser un singleton reusado (antes requería resetear el picker de ícono a mano en cada apertura) y pasó a reinyectarse completo en cada apertura, mismo patrón que Gastos/Agenda/Compromisos. 16 tests unitarios nuevos (`normalizarMeta` en modo edición, `renderFormMeta` prellenado, botón Editar en la lista) + 4 E2E nuevos (prefill y actualización, progreso conservado tras editar solo el nombre, recálculo de `completada` al bajar el objetivo, categoría/ícono preservados). 2981/2981 unit + 231/231 E2E + lint verdes. SW v414 → v415.
