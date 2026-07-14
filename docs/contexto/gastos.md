# Ficha de contexto: Gastos

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## Pantalla Gastos v2 (GAS.1, ADR 039)

- **Objetivo**          : rediseño visual de `#sec-gast` a la familia v2 ([ADR 039](../DECISIONS/039-gastos-v2-visual.md)): hero del mes con total protagonista + comparativo + ojo (GAS.1a), lista agrupada por día + chips con identidad + máscara (GAS.1b), insight de gastos hormiga + empty states v2 (GAS.1c).
- **Estado actual**     : **INICIATIVA COMPLETA** (GAS.1a, GAS.1b y GAS.1c cerradas el 2026-07-14). Sexta pantalla de la familia visual v2.
- **Verificado contra** : GAS.1c (2026-07-14).

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| Hero del mes (nav integrada + label + total + comparativo) | `modules/dominio/gastos/view.js` | `_renderHeroGastos()` | renderizado por `renderFiltrosGastos()` en `#panel-filtros-gastos`, antes de los chips |
| Chip comparativo vs mes anterior | `modules/dominio/gastos/view.js` | `_renderComparativo()` | oculto con filtro activo, mes vacío o sin base; internas (TX.8b) fuera de la base |
| Dirección y magnitud de la variación (pura) | `modules/dominio/gastos/logic.js` | `variacionMensualGasto(totalActual, totalAnterior)` | null sin base; redondeo a 0% → 'igual' |
| Ojo de privacidad del hero | `modules/dominio/gastos/index.js` | acción `gastos-saldo-visibilidad` | flip de `S.config.ocultarSaldo` + `save()` + `updSaldo()` + re-render, espejo de `agenda-saldo-visibilidad` |
| Estilos del hero | `styles/components/domain.css` | `.hero-gastos*` (bloque al final del archivo) | contraste método IV.1 documentado en el comentario del bloque |
| Ojo compartido de la familia | `styles/components/domain.css` | grupo `.hero-*__ojo` | `.hero-gastos__ojo` va **estático en grilla** `[espaciador\|nav\|ojo]`, no absoluto: la nav de mes centrada no se le solapa a 320px |
| Agrupación por día (pura) | `modules/dominio/gastos/logic.js` | `agruparPorDia(gastos)` | conserva el orden recibido; total por grupo |
| Grupo del día + label humano | `modules/dominio/gastos/view.js` | `_renderGrupoDia()`, `_labelDia()` | "Hoy"/"Ayer"/"Vie 11 jul" (+ año si no es el corriente); `formateadorFecha` cacheado |
| Ítem de la lista (máscara D9, subtítulo sin fecha) | `modules/dominio/gastos/view.js` | `_renderGastoItem(gasto, oculto)` | firma con `oculto` explícito: NO pasarla directa a `.map()` (el índice caería en `oculto`) |
| Chips con identidad de sección | `styles/components/domain.css` | `button.chip--gastos.chip--active` | patrón D.16b: tinte 12% + borde 50% + anillo, texto primario (medición en ADR 039 D5) |
| Estilos de grupos por día | `styles/components/domain.css` | `.gastos-dia*` | `.list-item` gana radio lg + sombra por contenedor (criterio MC.18d) |
| Insight de gastos hormiga | `modules/dominio/gastos/view.js` | `_renderInsightHormigas(delMes, oculto)` | consume `detectarHormigas()` (logic.js); solo vista "Todos", monto respeta el ojo |
| Empty states v2 | `modules/dominio/gastos/view.js` | `_renderEmptyState()`, `_renderEmptyFiltro()` | anatomía `.cal-empty`; clases `.gastos-empty*` (el genérico `.empty-state` ya no se usa aquí) |
| Estilos del insight y los empty | `styles/components/domain.css` | `.gastos-insight*`, `.gastos-empty*` | contraste del glifo documentado en el comentario del bloque |

**Decisiones de triaje que NO están en el mockup tal cual** (detalle en el ADR 039): FAB descartado (duplicaría el botón central "Registrar" del ADR 024), búsqueda del header fuera de alcance, comparativo neutro al subir (criterio IV.3/ADR 038 D4, el mockup pedía ámbar), comparación tangible del insight hormiga diferida al motor de interpretación (ANL.1).

**Riesgos**:

- **`renderFiltrosGastos()` normaliza el filtro ANTES de pintar el hero** (si la categoría activa desapareció del mes, resetea a "Todos"): si se reordena ese cuerpo, el hero puede calcular el total con un filtro fantasma.
- La franja `_renderResumen` y sus clases `.gastos-resumen*`, y la barra `.mes-nav*`, **ya no existen**; cualquier referencia externa que aparezca es código muerto.
- ~~El ojo de Gastos enmascara solo el hero (fuga por suma de ítems)~~: **cerrado en GAS.1b** (total del día y montos de ítems en `SALDO_MASCARA_CUENTA`).
- **`_renderGastoItem(gasto, oculto)` cambió de aridad en GAS.1b**: pasarla directa a `.map()` pondría el índice en `oculto` (ítems 1+ enmascarados siempre); el caller usa arrow explícita. Mantener así.
- El ink `--fk-dom-gastos-text` sobre el tinte 12% en tema claro mide **4.39:1** (bajo AA para texto pequeño): por eso el chip activo usa texto primario. No "corregir" el chip a texto naranja sin re-medir.

**Cambios realizados**:

- 2026-07-14 (GAS.1c): insight de gastos hormiga (por fin en pantalla `detectarHormigas()`) + empty states v2; cierra la iniciativa. Nota E2E: sembrar estado en un test cuya página ya arrancó exige `addInitScript` + `reload` (un `goto` a la misma URL con hash es same-document y no re-arranca la app; un `evaluate` directo lo pisa el initScript de `saltearOnboarding` al recargar). Ver [CHANGELOG](../CHANGELOG.md).
- 2026-07-14 (GAS.1b): lista agrupada por día (Hoy/Ayer/"Vie 11 jul" + total del día), chips con identidad de sección, máscara de montos de la lista, subtítulo sin fecha. Ver [CHANGELOG](../CHANGELOG.md).
- 2026-07-14 (GAS.1a): hero del mes con total protagonista + comparativo + ojo. Ver [CHANGELOG](../CHANGELOG.md).

---

## Formulario de gasto (TX.9)

- **Objetivo**          : rediseñar el formulario de registrar gasto para que la categoría sea el dato principal (no la descripción), soporte categorías creadas por el usuario, y no pida una descripción redundante cuando la categoría ya representa el concepto.
- **Estado actual**     : **TX.9 completa** (TX.9a: categoría primero, descripción ya no obligatoria; TX.9b: categorías personalizadas). **IN.5 cerrada** (2026-07-06): se eliminó "Gasto rápido" y su subsistema de "pendientes por organizar" (el formulario completo, con categoría primero y descripción opcional, ya cubre el registro veloz).
- **Verificado contra** : `9c0caf1` (2026-07-06, IN.5).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Formulario completo de gasto | `modules/dominio/gastos/view.js` | `renderFormGasto()` | ~362 |
| Orden de campos (TX.9a) | `modules/dominio/gastos/view.js` | `renderFormGasto()` | ~381 (Categoría → Monto → Cuenta → Fecha → Nota; sin campo Descripción) |
| Validación (descripción ya no obligatoria, TX.9a) | `modules/dominio/gastos/logic.js` | `validarGasto()` | ~148 |
| Transformación form → shape de `S.gastos` (descripcion solo si viene, TX.9a) | `modules/dominio/gastos/logic.js` | `normalizarGasto()` | ~244 |
| Campo `nota` (opcional, ya al final del form) | `modules/core/state.js` / `modules/dominio/gastos/logic.js` | `Gasto.nota` / `normalizarGasto()` | ~214 |
| Catálogo de categorías nativas (fijo) | `modules/core/constants.js` | `CATEGORIAS_GASTO`, `CATEGORIAS_GASTO_USUARIO` | ~400, ~426 |
| Mapeo categoría nativa → ícono | `modules/core/constants.js` | `CATEGORIA_ICONO` | ~448 |
| Catálogo de íconos elegibles para categoría personalizada (29, sin duplicar los nativos) | `modules/core/constants.js` | `ICONOS_CATEGORIA_PERSONALIZADA` | ~470 |
| Resolver de ícono (nativa → personalizada → genérico, TX.9b) | `modules/core/constants.js` | `iconoDeCategoriaGasto(categoria, personalizadas)` | ~505 |
| Colección de categorías creadas por el usuario (bump v24) | `modules/core/state.js` | `S.categoriasPersonalizadas` | ~304 |
| Validación de categoría nueva (nombre sin duplicar, ícono del catálogo) | `modules/dominio/gastos/logic.js` | `validarCategoriaPersonalizada(datos, existentes)` | ~176 |
| Opción "+ Otra categoría" + selector de ícono inline en el form | `modules/dominio/gastos/view.js` | `renderFormGasto()`, `CATEGORIA_NUEVA_VALUE` | ~364 |
| Reveal/hide de los campos nuevos + click del selector de ícono | `modules/dominio/gastos/index.js` | `_montarFormGasto()` | ~438 |
| Creación y persistencia de la categoría al enviar el formulario | `modules/dominio/gastos/index.js` | `_guardarGasto()` | ~51 |
| Título del ítem en la lista = categoría (TX.9a); descripción legacy y nota pasan al subtítulo | `modules/dominio/gastos/view.js` | `_renderGastoItem()` | ~195 |
| Nombre del gasto en confirmación de borrado / anuncio a11y (fallback a categoría, TX.9a) | `modules/dominio/gastos/index.js` | `_eliminarGasto()` | ~334 |
| Descripción del Movimiento cuando el gasto no tiene descripción (fallback a categoría, TX.9a) | `modules/dominio/movimientos/logic.js` | `movimientosDesdeGastos()` | ~48 |

**Recursos**: `ICONOS_CATEGORIA_PERSONALIZADA` (29 símbolos `c-*` del sprite ya existentes en `index.html`, ID.3/ADR 023, que no estaban asignados en `CATEGORIA_ICONO`); primer selector de ícono de la app (`.icono-picker`/`.icono-picker__btn` en `forms.css`, patrón tap-to-select consistente con `.accesos-row`/chips de categoría).

**Dependencias y relaciones**: `CATEGORIA_ICONO`/`CATEGORIAS_GASTO_USUARIO` los usa también `iconoPorOrigen()` (TX.6/TX.7) y el panel de Movimientos (TX.8a/b). `iconoDeCategoriaGasto()` (nuevo, en `core/constants.js` para que tanto `gastos/` como `movimientos/` lo importen sin violar ADN 10) resuelve nativa primero, personalizada después; `movimientosDesdeGastos()` recibe `S.categoriasPersonalizadas` como segundo parámetro (pura, no lee `S`).

**Riesgos**:

- ~~**"Descripción obligatoria" estaba profundamente asumida**~~: **resuelto (TX.9a)**. Ver detalle en el registro de cambios.
- ~~**Categorías personalizadas eran dato de usuario nuevo, sin precedente en la app**~~: **resuelto (TX.9b)**. `S.categoriasPersonalizadas` (bump v24), `ICONOS_CATEGORIA_PERSONALIZADA` + `iconoDeCategoriaGasto()` en `constants.js`, selector de ícono inline en el mismo formulario (sin modal anidado, mismo patrón que `hint-categoria-fija`).
- **Reclamé "sin distinguir tildes" en `validarCategoriaPersonalizada()` antes de implementarlo**: el primer intento solo hacía `toLocaleLowerCase()`; un test con una tilde de más lo encontró. Se agregó `.normalize('NFD').replace(/\p{Diacritic}/gu, '')`. **Lección**: si el docstring promete una garantía (aquí, insensibilidad a tildes), escribir el test que la ejercite ANTES de dar la función por terminada, no asumir que el caso "obvio" ya está cubierto.
- **Relaciona con TX.10** (categoría como eje de automatización): ese card explícitamente advierte "revisar juntas para no construir 3 motores de sugerencia por categoría distintos". TX.9 (a y b) no implementó detección de gasto hormiga/fantasma nueva; solo reordenó el formulario y sumó categorías de usuario, dejando la puerta abierta para que TX.10 las use después.
- ~~**Relaciona con IN.5** (eliminar/transformar "Gasto rápido")~~: **cerrada (2026-07-06)**. Se eliminó "Gasto rápido" por completo (botón, modal, form, toast) junto con su subsistema de "pendientes por organizar" (`esGastoPendiente`/`gastosPendientes`/`renderPendientesOrganizar`, el badge "📝 Pendiente" y el flag `pendienteCompletar` en los 4 dominios que lo escribían). Dato de usuario legacy (`pendienteCompletar` en gastos guardados) queda ignorado, sin migración: no lo lee nadie. Ver registro de cambios.
- **Sin gestión de categorías personalizadas** (editar nombre/ícono, eliminar, ver cuántos gastos las usan): fuera de alcance de TX.9b, que solo cubre crear + usar. Si Esteban lo pide, es una tarjeta nueva (ej. TX.9c), probablemente en Ajustes.

**Cambios pendientes**: ninguno conocido para TX.9. Posible extensión futura: gestión de categorías personalizadas (ver Riesgos).

**Cambios realizados**:

- 2026-07-06 (IN.5): se eliminó "Gasto rápido". Con TX.9 completa, el formulario completo ya registra un gasto en pocos toques (categoría + monto, con fecha y cuenta pre-rellenadas), así que mantener un segundo flujo paralelo solo sumaba complejidad y una cola de "pendientes por organizar" que el usuario tenía que volver a completar. Se retiró: el botón `.quick-add` y el modal `#modal-gasto-rapido` (`index.html`), `renderFormGastoRapido()`/`renderPendientesOrganizar()` (`view.js`), `validarGastoRapido()`/`normalizarGastoRapido()`/`esGastoPendiente()`/`gastosPendientes()` (`logic.js`), los handlers `_abrirGastoRapido`/`_guardarGastoRapido`/`_toastGastoRapido` y la acción `gasto-rapido` (`index.js`), el badge "📝 Pendiente" del ítem, el contenedor `#panel-gastos-pendientes` del bento y sus estilos, y los estilos `.quick-add*`/`.quick-toast*` (`forms.css`). El hero del dashboard pasa a ancho completo (`--full`) al desaparecer el panel que lo acompañaba. El flag `pendienteCompletar` se dejó de escribir en los 4 dominios que lo ponían (`gastos`, `agenda`, `compromisos`, `tesoreria/distribucion`); las keyframes `toastIn/toastOut` se conservan (las usa el toast de logros). 25 tests unit retirados (los del subsistema), reflow E2E repunteado al modal de ingreso puntual (mismo `.input--big-amount`). 2201/2201 unit + 151/151 E2E verdes; verificado además en la app (dashboard sin la card, sin huecos; lista de gastos sin badge). SW v329 → v330.
- 2026-07-05 (TX.9b): categorías personalizadas. Al elegir "+ Otra categoría" en el select, se revela (sin modal anidado, mismo patrón que `hint-categoria-fija`) un campo de nombre y una grilla de 29 íconos (`ICONOS_CATEGORIA_PERSONALIZADA`, símbolos `c-*` del sprite que ya existían pero no estaban asignados en `CATEGORIA_ICONO`, evitando dos entradas con el mismo glifo en el mismo selector). `validarCategoriaPersonalizada()` valida nombre no vacío y sin duplicar (insensible a mayúsculas y tildes) ninguna categoría nativa ni personalizada ya creada, más ícono elegido del catálogo curado. Al enviar el formulario, la categoría se persiste primero (`guardar('categoriasPersonalizadas', {...})`, bump de schema v24) y luego se usa su nombre como `categoria` del gasto, exactamente igual que si fuera nativa; en usos futuros aparece como una opción normal del select (`<optgroup label="Tus categorías">`). `iconoDeCategoriaGasto()` (nuevo en `core/constants.js`) resuelve nativa → personalizada → genérico, usado tanto en `_renderGastoItem()` como en `movimientosDesdeGastos()` (Movimientos también muestra el ícono correcto para una categoría personalizada). 32 tests nuevos (`constants.test.js`: catálogo de íconos sin duplicar nativos + resolver; `gastos.test.js`: validación + formulario; `movimientos.test.js`: resolución de ícono personalizado; `storage.test.js`: migración v23→v24) + 1 test E2E nuevo (creación completa, reutilización en un segundo gasto, verificación de que no se duplica la opción en el select). 2224/2224 unit + 149/149 E2E verdes en navegador real (Playwright). SW v327 → v328.
- 2026-07-05 (TX.9a): categoría pasa a ser el primer campo del formulario completo de gasto (antes era el 4°); el campo Descripción se quitó del formulario (ya no se pide); descripción deja de ser obligatoria en `validarGasto()`. `normalizarGasto()` solo incluye la clave `descripcion` si el caller la trae (ningún caller ya lo hace desde el form), para que `editar()` (merge superficial vía `Object.assign`) no borre la descripción de gastos existentes que ya la tenían al editar otro campo. El título del ítem en la lista pasa a ser la categoría; una descripción legacy (gastos de antes de este cambio) y la nota se muestran en el subtítulo junto a la fecha. `esGastoPendiente()` redefinida: `pendienteCompletar === true && categoria === 'Otros'` (antes: `pendienteCompletar === true || !descripcion`), preservando la función del panel "Gastos por organizar" sin depender de un campo ya no obligatorio. Encontrados y corregidos 2 bugs de "undefined" en consumidores de `gasto.descripcion` sin fallback (mensaje de confirmación de borrado y `movimientosDesdeGastos()`). 24 tests nuevos/actualizados + 4 tests E2E actualizados. 2198/2198 unit + 148/148 E2E verdes.

**Observaciones**: el campo **Nota** que pedía el brief de Esteban ya existía en el formulario antes de esta tarea (agregado en una fase anterior sin tarjeta propia); TX.9a no tuvo que crearlo, solo reordenar alrededor de él. El brief completo (categoría primero, categorías personalizadas, sin descripción redundante) está capturado en `BOARD.md`.
