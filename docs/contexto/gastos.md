# Ficha de contexto: Gastos

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## Formulario de gasto (TX.9)

- **Objetivo**          : rediseñar el formulario de registrar gasto para que la categoría sea el dato principal (no la descripción), soporte categorías creadas por el usuario, y no pida una descripción redundante cuando la categoría ya representa el concepto.
- **Estado actual**     : **TX.9a cerrada** (categoría primero, descripción ya no obligatoria). Pendiente **TX.9b** (categorías personalizadas).
- **Verificado contra** : `e6766b8` (2026-07-05, TX.9a).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Formulario completo de gasto | `modules/dominio/gastos/view.js` | `renderFormGasto()` | ~362 |
| Orden de campos (TX.9a) | `modules/dominio/gastos/view.js` | `renderFormGasto()` | ~381 (Categoría → Monto → Cuenta → Fecha → Nota; sin campo Descripción) |
| Validación (descripción ya no obligatoria, TX.9a) | `modules/dominio/gastos/logic.js` | `validarGasto()` | ~148 |
| Transformación form → shape de `S.gastos` (descripcion solo si viene, TX.9a) | `modules/dominio/gastos/logic.js` | `normalizarGasto()` | ~244 |
| Campo `nota` (opcional, ya al final del form) | `modules/core/state.js` / `modules/dominio/gastos/logic.js` | `Gasto.nota` / `normalizarGasto()` | ~214 |
| Catálogo de categorías (fijo, no soporta entradas de usuario todavía) | `modules/core/constants.js` | `CATEGORIAS_GASTO`, `CATEGORIAS_GASTO_USUARIO` | ~400, ~426 |
| Mapeo categoría → ícono (catálogo fijo) | `modules/core/constants.js` | `CATEGORIA_ICONO` | ~448 |
| Título del ítem en la lista = categoría (TX.9a); descripción legacy y nota pasan al subtítulo | `modules/dominio/gastos/view.js` | `_renderGastoItem()` | ~195 |
| Flag "pendiente de completar" (TX.9a: `pendienteCompletar` + categoría en 'Otros') | `modules/dominio/gastos/logic.js` | `esGastoPendiente()`, `gastosPendientes()`, `normalizarGastoRapido()` | ~126, ~137, ~277 |
| Panel "Gastos por organizar" (Inicio, consume el flag) | `modules/dominio/gastos/view.js` | `renderPendientesOrganizar()` | ~264 |
| Formulario de Gasto Rápido (sin cambios: monto + cuenta, categoría auto 'Otros') | `modules/dominio/gastos/view.js` | `renderFormGastoRapido()`, `normalizarGastoRapido()` | ~298 |
| Nombre del gasto en confirmación de borrado / anuncio a11y (fallback a categoría, TX.9a) | `modules/dominio/gastos/index.js` | `_eliminarGasto()` | ~334 |
| Descripción del Movimiento cuando el gasto no tiene descripción (fallback a categoría, TX.9a) | `modules/dominio/movimientos/logic.js` | `movimientosDesdeGastos()` | ~48 |

**Recursos**: sin selector de ícono en la app hoy (ningún precedente de catálogo creado por el usuario, en ningún dominio); habría que construirlo desde cero para "categoría personalizada". Sprite completo en `index.html` (símbolos `c-*` de categoría, ID.3/ADR 023).

**Dependencias y relaciones**: `CATEGORIA_ICONO`/`CATEGORIAS_GASTO_USUARIO` los usa también `iconoPorOrigen()` (TX.6/TX.7) y el panel de Movimientos (TX.8a/b, vía `CATEGORIA_ICONO` directo). Cambiar el catálogo a "fijo + personalizado" implica que ambos consumidores necesitan resolver también contra las categorías del usuario, no solo el catálogo estático.

**Riesgos**:

- ~~**"Descripción obligatoria" estaba profundamente asumida**~~: **resuelto (TX.9a)**. `validarGasto()` ya no la exige; `_renderGastoItem()` muestra la categoría como título (la descripción legacy, si existe, pasa al subtítulo); `esGastoPendiente()` se redefinió sobre `pendienteCompletar === true && categoria === 'Otros'` en vez de "sin descripción", preservando la función exacta de "Gastos por organizar".
- **Dos consumidores indirectos de `gasto.descripcion` sin fallback, encontrados y corregidos durante TX.9a**: el mensaje de confirmación de borrado / anuncio a11y (`_eliminarGasto()` en `index.js`) y `movimientosDesdeGastos()` (Movimientos deriva su descripción de la del gasto) leían `gasto.descripcion` directo, sin `??`/`?.`. Con la descripción ahora opcional, ambos habrían mostrado literalmente "undefined" para cualquier gasto creado con el formulario nuevo. Ambos cayeron a la categoría como fallback. **Lección para TX.9b y futuros cambios de este campo**: `grep -rn "\.descripcion" modules/` antes de asumir que la búsqueda inicial encontró todos los consumidores; los cross-dominio (Movimientos lee `S.gastos` directo) son fáciles de pasar por alto.
- **Categorías personalizadas son dato de usuario nuevo, sin precedente en la app**: ningún otro dominio permite crear entradas de catálogo (todas las categorías/iconos son fijos en `constants.js`). Requiere: colección nueva en `S` (ej. `S.categoriasPersonalizadas: [{ id, nombre, icono }]`), bump de schema con migración idempotente (ADN 6), un selector de ícono (UI nueva, sin componente reusable hoy salvo el sprite completo), y que `CATEGORIA_ICONO`/el filtro de categorías del selector de mes en Gastos resuelvan también contra esta colección nueva.
- **Relaciona con TX.10** (categoría como eje de automatización): ese card explícitamente advierte "revisar juntas para no construir 3 motores de sugerencia por categoría distintos". TX.9a no implementó detección de gasto hormiga/fantasma nueva (esa fue la razón que dio el usuario para pedir "categoría primero", no un requisito funcional del card); solo reordenó el formulario, dejando la puerta abierta para que TX.10 la use después.
- **Relaciona con IN.5** (eliminar/transformar "Gasto rápido"): IN.5 depende explícitamente de TX.9 en `BOARD.md`. Con el formulario completo ya rápido y con categoría primero, decidir si dos flujos (rápido vs. completo) siguen aportando algo distinto.

**Cambios pendientes**: **TX.9b** (categorías personalizadas: "Otra categoría" con selector de ícono + nombre, persistidas, bump de schema; depende de TX.9a, ya cerrada).

**Cambios realizados**:

- 2026-07-05 (TX.9a): categoría pasa a ser el primer campo del formulario completo de gasto (antes era el 4°); el campo Descripción se quitó del formulario (ya no se pide); descripción deja de ser obligatoria en `validarGasto()`. `normalizarGasto()` solo incluye la clave `descripcion` si el caller la trae (ningún caller ya lo hace desde el form), para que `editar()` (merge superficial vía `Object.assign`) no borre la descripción de gastos existentes que ya la tenían al editar otro campo. El título del ítem en la lista pasa a ser la categoría; una descripción legacy (gastos de antes de este cambio) y la nota se muestran en el subtítulo junto a la fecha. `esGastoPendiente()` redefinida: `pendienteCompletar === true && categoria === 'Otros'` (antes: `pendienteCompletar === true || !descripcion`), preservando la función del panel "Gastos por organizar" sin depender de un campo ya no obligatorio. Encontrados y corregidos 2 bugs de "undefined" en consumidores de `gasto.descripcion` sin fallback (ver Riesgos). 24 tests nuevos/actualizados en `gastos.test.js` (formulario reordenado, validación, `esGastoPendiente()`/`gastosPendientes()` con la nueva regla, título/subtítulo del ítem) + 1 test actualizado en `movimientos.test.js`; 4 tests E2E de `smoke.test.js` actualizados (ya no rellenan un campo que no existe; verifican el fallback a categoría en el mensaje de borrado). 2198/2198 unit + 148/148 E2E verdes en navegador real (Playwright); verificado además con un flujo manual de creación completa y de Gasto Rápido.

**Observaciones**: el campo **Nota** que pedía el brief de Esteban ya existía en el formulario antes de esta tarea (agregado en una fase anterior sin tarjeta propia); TX.9a no tuvo que crearlo, solo reordenar alrededor de él. El brief completo (categoría primero, categorías personalizadas, sin descripción redundante) está capturado en `BOARD.md`.
