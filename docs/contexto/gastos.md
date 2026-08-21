# Ficha de contexto: Gastos

> Revisado: 2026-08-20.

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## Pantalla Gastos v2 (GAS.1, ADR 039)

- **Objetivo**          : rediseño visual de `#sec-gast` a la familia v2 ([ADR 039](../DECISIONS/039-gastos-v2-visual.md)): hero del mes con total protagonista + comparativo + ojo (GAS.1a), lista agrupada por día + chips con identidad + máscara (GAS.1b), insight de gastos hormiga + empty states v2 (GAS.1c).
- **Estado actual**     : **INICIATIVA COMPLETA** (GAS.1a, GAS.1b y GAS.1c cerradas el 2026-07-14). Sexta pantalla de la familia visual v2. **DSK.3 (2026-08-18, [ADR 072](../DECISIONS/072-gastos-cabecera-de-banda-y-fila-con-cuenta.md)) le da composición de escritorio desde 1680px**: el hero pasa a banda (total a la izquierda; nav de mes, enlace "En qué gastaste" a Análisis y ojo a la derecha, tras un filete), el total del día cae sobre la columna de montos que suma, la fila deja de levantarse al apuntar y la lista deja de entrar en cascada. Dos de sus decisiones son de contenido y **valen en todos los anchos**: la fila abre su subtítulo con la cuenta de origen, y los chevrons de mes pasan al glifo del sistema. **DIS.4 cerrada** (2026-07-26): las 10 correcciones aplicables de la auditoría de diseño de la sección. **Ficha 07 (2026-08-20, [ADR 069](../DECISIONS/069-bloque-gastos-en-la-barra-movil.md) D8): la sección es la portada del bloque Gastos y deja de ser dueña de su reloj.** Bajo 1024px el encabezado del bloque (`ui/bloque-gastos.js`) pone el nombre, el selector de mes y el ojo para las tres lentes, y `.hero-gastos__top` se oculta: dos relojes en la misma pantalla eran el defecto G4. El mes visible vive en `infra/mes-bloque.js`, no acá. Y el hero gana una línea que **declara lo que el total no cuenta** ("+ $X en fijos y deudas", con salida a la lente donde viven): `_sinInternas()` no cambia, lo que cambia es que la pantalla lo dice (G1, regla candidata R82).
- **Verificado contra** : ficha 07 de la auditoría móvil (2026-08-20, ADR 069 D8). Antes: DSK.3 (2026-08-18, sus dos rebanadas), DIS.4 (2026-07-26).

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
| Banda de escritorio: enlace a Análisis y bloque derecho (DSK.3a, ADR 072 D1) | `styles/responsive.css` | bloque "GASTOS EN ESCRITORIO" + `.hero-gastos__link` | desde 1680px; el enlace lo emite `_renderHeroGastos()` y `domain.css` lo apaga bajo ese ancho |
| Cuenta de origen en el subtítulo de la fila (DSK.3b, ADR 072 D2) | `modules/dominio/gastos/view.js` | `_renderGastoItem()`, `nombreCuenta` | lee `S.cuentas` por `cuentaId` con el mismo `find` de otras cinco vistas; sin cuenta el subtítulo se comporta como antes |
| Alineación del total del día, fila sin levantar y lista sin cascada (DSK.3b, ADR 072 D4/D5/D7) | `styles/responsive.css` | bloque "LISTA DE GASTOS EN ESCRITORIO" | desde 1680px; la reserva del encabezado se calcula con los tokens de la columna de acciones, no con un número fijo |
| Chips con identidad de sección | `styles/components/domain.css` | `button.chip--gastos.chip--active` | patrón D.16b: tinte 12% + borde 50% + anillo, texto primario (medición en ADR 039 D5) |
| Estilos de grupos por día | `styles/components/domain.css` | `.gastos-dia*` | `.list-item` gana radio lg + sombra por contenedor (criterio MC.18d) |
| Insight de gastos hormiga | `modules/dominio/gastos/view.js` | `_renderInsightHormigas(delMes, oculto)` | consume `detectarHormigas()` (logic.js); solo vista "Todos", monto respeta el ojo |
| Empty states v2 | `modules/dominio/gastos/view.js` | `_renderEmptyState()` (`_renderEmptyFiltro()` se borró en DIS.4: era inalcanzable) | anatomía `.cal-empty`; clases `.gastos-empty*` (el genérico `.empty-state` ya no se usa aquí) |
| Estilos del insight y los empty | `styles/components/domain.css` | `.gastos-insight*`, `.gastos-empty*` | contraste del glifo documentado en el comentario del bloque |

**Decisiones de triaje que NO están en el mockup tal cual** (detalle en el ADR 039): FAB descartado (duplicaría el botón central "Registrar" del ADR 024), búsqueda del header fuera de alcance, comparativo neutro al subir (criterio IV.3/ADR 038 D4, el mockup pedía ámbar), comparación tangible del insight hormiga diferida al motor de interpretación (ANL.1).

**Riesgos**:


- **La lista del mes cierra con una salida al historial completo** (2026-08-21, ficha 15, [ADR 089](../DECISIONS/089-movimientos-la-quinta-fuente-y-cuatro-puertas.md) D3). `_renderSalidaHistorial()` en `view.js` y la accion `gastos-ver-historial` en `index.js`, que emite `movimientos:ver` con el dominio y **sin rango**: el reloj de mes de este bloque es justo lo que el historial sirve para saltarse. Va al pie y por EventBus, sin import cruzado (ADN 10).
- **`renderFiltrosGastos()` normaliza el filtro ANTES de pintar el hero** (si la categoría activa desapareció del mes, resetea a "Todos"): si se reordena ese cuerpo, el hero puede calcular el total con un filtro fantasma.
- La franja `_renderResumen` y sus clases `.gastos-resumen*`, y la barra `.mes-nav*`, **ya no existen**; cualquier referencia externa que aparezca es código muerto.
- ~~El ojo de Gastos enmascara solo el hero (fuga por suma de ítems)~~: **cerrado en GAS.1b** (total del día y montos de ítems en `SALDO_MASCARA_CUENTA`).
- **`_renderGastoItem(gasto, oculto)` cambió de aridad en GAS.1b**: pasarla directa a `.map()` pondría el índice en `oculto` (ítems 1+ enmascarados siempre); el caller usa arrow explícita. Mantener así.
- El ink `--fk-dom-gastos-text` sobre el tinte 12% en tema claro mide **4.39:1** (bajo AA para texto pequeño): por eso el chip activo usa texto primario. No "corregir" el chip a texto naranja sin re-medir.
- **El label del hero nombra el mes visible, nunca "este mes" (DIS.4/G1, regla R10)**: la nav de mes vive dentro del mismo hero, así que un label fijo atribuía el total al mes equivocado en cuanto se tocaba "‹". Con filtro activo es `{categoría} en {mes}`: la categoría sin el mes también pierde información.
- **La grilla móvil de la fila de gasto es propia de la sección** (`responsive.css`, `@media (max-width: 539px)`, scope `.gastos-dia`), no la genérica de `.list-item:has(.list-item__meta)`. Dos trampas: la capa `responsive` le gana **por orden** a `components`, así que esta corrección NO funciona desde `domain.css`; y sus `grid-template-areas` tienen que ser rectangulares (un área en L invalida la declaración entera y el navegador la descarta en silencio).
- **La barra de filtros no puede volver a `overflow-x` (DIS.4/G3, regla R9)**: la regla base de `.filtros-bar` en `domain.css` sigue con scroll oculto porque la comparten Movimientos y el asistente de distribución; el override vive acotado a `#panel-filtros-gastos`. Tocar la base afectaría a esas dos secciones.
- **El tope de la navegación se calcula en `_mesTope()` sobre `S.gastos`** (mes corriente, o el del gasto más reciente si es posterior). Si alguna vez la sección deja de mostrar todos los gastos no internos, ese cálculo hay que revisarlo con ella o "›" quedará habilitado hacia meses vacíos.
- **`_renderEmptyState()` tiene dos textos, no uno**: en un mes que no es el corriente no ofrece registrar (el formulario abre con la fecha de HOY y el gasto caería en otro mes), sino volver. Agregar un CTA de registro ahí reabre el hallazgo H8.

**Cambios realizados**:

- 2026-08-20 (**ficha 07 de la auditoría móvil**, ADR 069 D8): el mes sube a `infra/mes-bloque.js` y `navegarMesGastos()` se queda solo con lo suyo (el reset del filtro de categoría); `mesTopeGastos()` se exporta para que el bloque no discrepe del hero sobre hasta dónde se navega; `_renderAlcanceInternas()` nueva. Ver [CHANGELOG](../CHANGELOG.md)., auditoría de diseño de la sección, 10 correcciones): el label del hero nombra el mes visible (`Gastaste en junio`, y `{categoría} en {mes}` con filtro); la fila de gasto sube el monto al primer renglón y baja las acciones al suyo (nombre de 110,7px a ~185px, "Cuidado personal" en una línea, alto estable en 107,6px sin nota); la barra de filtros y los chips de gasto frecuente dejan el scroll oculto por `flex-wrap` y los chips de filtro llegan a 44px; `#panel-filtros-gastos` pierde el `role="group"` que anunciaba el total del mes como un filtro; un solo verbo ("Registrar gasto") y un solo primario visible; el ojo y la nav de mes ganan zona táctil de 44px sin cambiar su dibujo de 40px; "›" se deshabilita en el último mes navegable y el vacío de un mes pasado ofrece volver en vez de registrar; sin ningún gasto no se pinta el hero de $0; el formulario vuelve a abrir con el monto y `_renderEmptyFiltro()` (inalcanzable) se borra. Reglas **R9** a **R11** escritas en [`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md). Ver CHANGELOG.

- 2026-07-14 (GAS.1c): insight de gastos hormiga (por fin en pantalla `detectarHormigas()`) + empty states v2; cierra la iniciativa. Nota E2E: sembrar estado en un test cuya página ya arrancó exige `addInitScript` + `reload` (un `goto` a la misma URL con hash es same-document y no re-arranca la app; un `evaluate` directo lo pisa el initScript de `saltearOnboarding` al recargar). Ver [CHANGELOG](../CHANGELOG.md).
- 2026-07-14 (GAS.1b): lista agrupada por día (Hoy/Ayer/"Vie 11 jul" + total del día), chips con identidad de sección, máscara de montos de la lista, subtítulo sin fecha. Ver [CHANGELOG](../CHANGELOG.md).
- 2026-07-14 (GAS.1a): hero del mes con total protagonista + comparativo + ojo. Ver [CHANGELOG](../CHANGELOG.md).

---

## Formulario de gasto (TX.9 + FORM.1a)

- **Objetivo**          : rediseñar el formulario de registrar gasto para que la categoría sea el dato principal (no la descripción), soporte categorías creadas por el usuario, y no pida una descripción redundante cuando la categoría ya representa el concepto. Desde FORM.1a ([ADR 042](../DECISIONS/042-formularios-v2-visual.md)) es además el flagship del lenguaje de formularios v2: monto hero al frente, categoría con chips de ícono (sin select), fecha con atajos Hoy/Ayer/Otra fecha.
- **Estado actual**     : **TX.9 completa** (TX.9a: categoría primero, descripción ya no obligatoria; TX.9b: categorías personalizadas). **IN.5 cerrada** (2026-07-06). **FORM.1a cerrada** (2026-07-15): form v2 completo; **el orden de TX.9a quedó revisado por el ADR 042 D2** (monto primero; la categoría sigue antes de cuenta/fecha/nota). **GAS.2 cerrada** (GAS.2a y GAS.2b, 2026-08-10): el formulario no cambió; ver bloque "Confirmación tras guardar" más abajo. **GAS.2c diferida** (Abono, Aporte).
- **Verificado contra** : GAS.2b (2026-08-10).

**Dónde vive (FORM.1a)**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| Form v2 completo (monto hero + chips + fecha con atajos) | `modules/dominio/gastos/view.js` | `renderFormGasto()` | radios reales `name="categoria"` y `name="fechaOpcion"`; el date real `#gasto-fecha` vive oculto en `#gasto-fecha-otra` |
| Wiring de chips y atajos de fecha | `modules/dominio/gastos/index.js` | `_montarFormGasto()` | listener delegado de `change` en el form (categoría revela `#categoria-nueva-fields`; hoy/ayer escriben el date, "otra" lo revela) |
| Edición: marcar chip de categoría y de fecha | `modules/dominio/gastos/index.js` | `_editarGasto()` | categoría legacy fuera de catálogo → ningún chip marcado, se re-elige (mismo comportamiento que tenía el select) |
| Ayer en ISO local | `modules/dominio/gastos/view.js` | `ayerIso()` | exportada desde FORM.1a (antes `_ayerIso` privada) |
| Componentes CSS del lenguaje | `styles/components/forms.css` | bloque "FORMULARIOS V2" | ver ficha [`captura.md`](captura.md), sección "Lenguaje de formularios v2" |
| Teja del header del modal | `index.html` | `#modal-gasto .modal__teja` | tinte por `--fk-section-accent` del `data-dom="gastos"` |
| Helper E2E de los chips | `tests/e2e/smoke.test.js` | `elegirCategoriaGasto(form, value?)` | clickea el label del chip (el radio está oculto); sin `value` toca el primero (Mercado) |

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

**Riesgos nuevos (FORM.1a)**:

- **La regla móvil anti-zoom de iOS pisa los inputs por capas:** `responsive.css` declara `.input { font-size: 16px }` en móvil y su capa le gana por ORDEN a `components`, aunque la especificidad diga lo contrario. La excepción de `.input--big-amount` (2.25rem) vive en `responsive.css`, dentro de la misma media query: cualquier componente futuro que necesite un input distinto en móvil debe poner su excepción AHÍ, no en `forms.css`.
- **Los chips son labels con el radio oculto:** en E2E no sirve `check()` sobre el input (no visible); se clickea el label (`elegirCategoriaGasto`). En unit, el estado seleccionado se lee por `input.checked`, no por clases.
- **`form.querySelector('[name="categoria"]').value` ya no sirve para leer/escribir la categoría** (devuelve el primer radio): leer vía FormData (como siempre hizo `_guardarGasto`) o iterar radios (como `_editarGasto`).
- **El primer bloque del formulario es `.monto-hero` y así debe quedar (ADR 042 D2, regla R11)**: TX.12 insertó los chips de gasto frecuente antes y el form dejó de abrir con el monto durante tres días sin que nadie lo decidiera; DIS.4/G9 lo devolvió a su lugar. Cualquier bloque nuevo (atajo, sugerencia, ayuda) va **después** del monto.

**Cambios pendientes**: ninguno conocido para TX.9. Posible extensión futura: gestión de categorías personalizadas (ver Riesgos). El resto de la iniciativa Formularios v2 (FORM.1b deuda, FORM.1c gasto fijo) vive en el BOARD.

**Cambios realizados**:

- 2026-08-10 (GAS.2a): ver bloque "Confirmación tras guardar" más abajo.
- 2026-07-15 (FORM.1a): form v2 completo (monto hero, chips de categoría, atajos de fecha, teja del header, footer principal) + fix del hueco preexistente de `responsive.css` que achicaba `.input--big-amount` en móvil. Ver [CHANGELOG](../CHANGELOG.md) y [ADR 042](../DECISIONS/042-formularios-v2-visual.md).

- 2026-07-06 (IN.5): se eliminó "Gasto rápido". Con TX.9 completa, el formulario completo ya registra un gasto en pocos toques (categoría + monto, con fecha y cuenta pre-rellenadas), así que mantener un segundo flujo paralelo solo sumaba complejidad y una cola de "pendientes por organizar" que el usuario tenía que volver a completar. Se retiró: el botón `.quick-add` y el modal `#modal-gasto-rapido` (`index.html`), `renderFormGastoRapido()`/`renderPendientesOrganizar()` (`view.js`), `validarGastoRapido()`/`normalizarGastoRapido()`/`esGastoPendiente()`/`gastosPendientes()` (`logic.js`), los handlers `_abrirGastoRapido`/`_guardarGastoRapido`/`_toastGastoRapido` y la acción `gasto-rapido` (`index.js`), el badge "📝 Pendiente" del ítem, el contenedor `#panel-gastos-pendientes` del bento y sus estilos, y los estilos `.quick-add*`/`.quick-toast*` (`forms.css`). El hero del dashboard pasa a ancho completo (`--full`) al desaparecer el panel que lo acompañaba. El flag `pendienteCompletar` se dejó de escribir en los 4 dominios que lo ponían (`gastos`, `agenda`, `compromisos`, `tesoreria/distribucion`); las keyframes `toastIn/toastOut` se conservan (las usa el toast de logros). 25 tests unit retirados (los del subsistema), reflow E2E repunteado al modal de ingreso puntual (mismo `.input--big-amount`). 2201/2201 unit + 151/151 E2E verdes; verificado además en la app (dashboard sin la card, sin huecos; lista de gastos sin badge). SW v329 → v330.
- 2026-07-05 (TX.9b): categorías personalizadas. Al elegir "+ Otra categoría" en el select, se revela (sin modal anidado, mismo patrón que `hint-categoria-fija`) un campo de nombre y una grilla de 29 íconos (`ICONOS_CATEGORIA_PERSONALIZADA`, símbolos `c-*` del sprite que ya existían pero no estaban asignados en `CATEGORIA_ICONO`, evitando dos entradas con el mismo glifo en el mismo selector). `validarCategoriaPersonalizada()` valida nombre no vacío y sin duplicar (insensible a mayúsculas y tildes) ninguna categoría nativa ni personalizada ya creada, más ícono elegido del catálogo curado. Al enviar el formulario, la categoría se persiste primero (`guardar('categoriasPersonalizadas', {...})`, bump de schema v24) y luego se usa su nombre como `categoria` del gasto, exactamente igual que si fuera nativa; en usos futuros aparece como una opción normal del select (`<optgroup label="Tus categorías">`). `iconoDeCategoriaGasto()` (nuevo en `core/constants.js`) resuelve nativa → personalizada → genérico, usado tanto en `_renderGastoItem()` como en `movimientosDesdeGastos()` (Movimientos también muestra el ícono correcto para una categoría personalizada). 32 tests nuevos (`constants.test.js`: catálogo de íconos sin duplicar nativos + resolver; `gastos.test.js`: validación + formulario; `movimientos.test.js`: resolución de ícono personalizado; `storage.test.js`: migración v23→v24) + 1 test E2E nuevo (creación completa, reutilización en un segundo gasto, verificación de que no se duplica la opción en el select). 2224/2224 unit + 149/149 E2E verdes en navegador real (Playwright). SW v327 → v328.
- 2026-07-05 (TX.9a): categoría pasa a ser el primer campo del formulario completo de gasto (antes era el 4°); el campo Descripción se quitó del formulario (ya no se pide); descripción deja de ser obligatoria en `validarGasto()`. `normalizarGasto()` solo incluye la clave `descripcion` si el caller la trae (ningún caller ya lo hace desde el form), para que `editar()` (merge superficial vía `Object.assign`) no borre la descripción de gastos existentes que ya la tenían al editar otro campo. El título del ítem en la lista pasa a ser la categoría; una descripción legacy (gastos de antes de este cambio) y la nota se muestran en el subtítulo junto a la fecha. `esGastoPendiente()` redefinida: `pendienteCompletar === true && categoria === 'Otros'` (antes: `pendienteCompletar === true || !descripcion`), preservando la función del panel "Gastos por organizar" sin depender de un campo ya no obligatorio. Encontrados y corregidos 2 bugs de "undefined" en consumidores de `gasto.descripcion` sin fallback (mensaje de confirmación de borrado y `movimientosDesdeGastos()`). 24 tests nuevos/actualizados + 4 tests E2E actualizados. 2198/2198 unit + 148/148 E2E verdes.

**Observaciones**: el campo **Nota** que pedía el brief de Esteban ya existía en el formulario antes de esta tarea (agregado en una fase anterior sin tarjeta propia); TX.9a no tuvo que crearlo, solo reordenar alrededor de él. El brief completo (categoría primero, categorías personalizadas, sin descripción redundante) está capturado en `BOARD.md`.

---

## Confirmación tras guardar (GAS.2, triaje del handoff "22 Formulario de Gasto")

- **Objetivo**          : que guardar un gasto deje una prueba visual (no solo accesible) de qué se guardó y, cuando existe, qué consecuencia tuvo (límite tocado, saldo restante). Origen: auditoría de Claude Design de la ficha 22, que asumía un toast visual ya existente en Gastos; no existía (ver hallazgo abajo).
- **Estado actual**     : **GAS.2a cerrada** (2026-08-10): toast genérico compartido (`ui/toast.js`) + primera línea (nombre del gasto guardado o "Gasto actualizado" en edición). **GAS.2b cerrada** (2026-08-10): segunda línea con la consecuencia, prioridad fija de 3 casos, lectura cross-domain a `presupuesto/logic.js` formalizada por el [ADR 060](../DECISIONS/060-lectura-cross-domain-de-solo-lectura.md). **GAS.2c cerrada** (2026-08-11): la misma regla se generalizo a Abono (deudas) y Aporte (metas), con [ADR 062](../DECISIONS/062-toast-de-consecuencia-en-abono-y-aporte.md). Plan completo y verificación del handoff contra el código: [`board/gastos.md`](../board/gastos.md).
- **Verificado contra** : GAS.2c (2026-08-11).

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| Componente de toast genérico (cola, autocierre pausable, cierre manual) | `modules/ui/toast.js` | `mostrarToast({ titulo, detalle?, tono?, icono? })` | mismo patrón que el toast de logros (`dominio/logros/index.js`), copiado no importado: logros es privado de su dominio (ADN 10) |
| Primer consumidor | `modules/dominio/gastos/index.js` | `_guardarGasto()` | reemplaza al `announce()` que había ahí (mismo rol, `role="status"`); solo calcula la consecuencia en creación, no en edición |
| CSS del toast (3 tonos: ok/alerta/peligro) | `styles/components/nudges.css` | bloque "TOAST GENERICO (GAS.2a)" | reusa `@keyframes toastIn/toastOut` de `base.css` y `--fk-z-toast`; icono real del sprite (`i-check-circle`/`i-alert`), no emoji |
| Segunda línea, prioridad fija (excedido → alerta → saldo de cuenta → nada) | `modules/dominio/gastos/logic.js` | `consecuenciaDeGasto({ progreso, categoria, saldoCuenta, nombreCuenta, ocultarSaldo })` | pura, sin `S`; recibe el `progreso` ya calculado (ADR 060) |
| Lectura cross-domain del progreso del límite | `modules/dominio/gastos/index.js` | `_guardarGasto()`, import de `calcularProgreso` desde `../presupuesto/logic.js` | en `index.js`, no en `logic.js` (evita el ciclo con `presupuesto/logic.js`, que ya importa `gastosMes` de `gastos/logic.js`) |

**Hallazgo del handoff, corregido**: la ficha 22 de Claude Design asumía "el toast ya existe, ya tiene cola y ya se muestra tras guardar", dibujando «Gasto registrado». Falso: lo único que corría tras guardar era `announce()` (`infra/a11y.js`), una live region `sr-only` que solo oye un lector de pantalla. El único toast visual de la app era `.logro-toast`, propiedad del dominio `logros`. GAS.2a construyó la pieza que la ficha daba por hecha.

**Casos que la ficha no cubrió, resueltos en GAS.2b**:

| Caso | Cómo queda |
|---|---|
| Gasto repartido entre varias cuentas | sin cuenta única que nombrar; el aviso de límite (prioridad 1/2) sigue aplicando igual |
| Consumo con tarjeta (`consumoTC`) | no descuenta ninguna cuenta; mismo tratamiento que el repartido |
| Edición de un gasto existente | el toast queda en una línea ("Gasto actualizado"), sin recalcular consecuencia |
| Ojo de privacidad activo (`S.config.ocultarSaldo`) | ninguna cifra, ni de límite ni de saldo: corta antes de mirar el progreso |

**Riesgos**:

- **ADR 060 formaliza una lectura cross-domain que el código ya hacía en otros 3 sitios** (`presupuesto/logic.js`, `analisis/logic.js`, `analisis/view.js` leyendo de `gastos/logic.js`/`tesoreria/logic.js`), pero solo cubre "un `logic.js` puro importado por otro dominio". Si una tarjeta futura necesita leer de un `view.js` o `index.js` ajeno, ese ADR no lo habilita: es exactamente el acoplamiento que ADN 10 sigue prohibiendo.
- **De paso, verificando la numeración del ADR**, se encontró que **ADR 059 no existe en el repositorio** pese a estar citado como "aceptado" en 7 documentos (iniciativa INT.1). Registrado como **BUG-027**, ajeno a esta tarjeta.

**Cambios pendientes**: ninguno. Iniciativa GAS.2 completa.

**Cambios realizados**:

- 2026-08-11 (GAS.2c): la regla de confirmacion se generalizo a Abono (`compromisos/logic/abonos.js`, `consecuenciaDeAbono()`) y Aporte (`metas/logic.js`, `consecuenciaDeAporte()`), [ADR 062](../DECISIONS/062-toast-de-consecuencia-en-abono-y-aporte.md). Detalle y verificacion: `contexto/deudas.md` y `contexto/metas.md`.
- 2026-08-10 (GAS.2b): segunda línea del toast (`consecuenciaDeGasto()`), lectura cross-domain de `calcularProgreso()` desde `gastos/index.js` ([ADR 060](../DECISIONS/060-lectura-cross-domain-de-solo-lectura.md)). 244/244 unit de `gastos.test.js` (7 nuevos), 263/263 E2E, lint verde. Verificado en la app los 4 casos de prioridad con datos reales (excedido, alerta, saldo de cuenta, ojo de privacidad).
- 2026-08-10 (GAS.2a): toast genérico (`ui/toast.js`) + primera línea en `_guardarGasto()`. 237/237 unit de `gastos.test.js` + 263/263 E2E verdes, lint verde. Verificado en la app: creación muestra "Mercado $30.000", edición muestra "Gasto actualizado", autocierre a los 5s.

---

## Gastos frecuentes y "Repetir" (TX.12)

- **Objetivo**          : el gasto cotidiano (almuerzo, café, Uber) es el registro más repetido de la app y se tecleaba entero cada vez. Dos entradas al mismo problema, patrón P2 de la auditoría de UX/producto: (1) chips derivados del historial en el formulario de "Nuevo gasto", que prellenan monto/categoría/cuenta y dejan solo confirmar; (2) botón "Repetir" en cada fila de la lista, que abre el formulario en modo creación prellenado con esa fila exacta (incluida su nota) y fecha de hoy.
- **Estado actual**     : cerrado el 2026-07-23. Sin dato nuevo ni schema (mismo patrón que AP.5a/AH.5a): todo sale de `S.gastos` ya existente. **TX.12b** (2026-07-27) corrigió el monto que ofrece el chip.
- **Verificado contra** : TX.12b (2026-07-27).

**Dónde vive**

| Pieza | Archivo | Ancla |
|---|---|---|
| Derivación pura de patrones repetidos | `modules/dominio/gastos/logic.js` | `gastosFrecuentes(gastos, hoyISO, opciones)` |
| Chips de un toque en el form (solo al crear) | `modules/dominio/gastos/view.js` | `_renderChipsFrecuentes()`, consumida por `renderFormGasto({ sugerencias })` |
| Botón "Repetir" en cada fila de la lista | `modules/dominio/gastos/view.js` | `_renderGastoItem()`, botón `data-action="repetir-gasto"` |
| Prefill compartido (chip de frecuente y "Repetir" de fila) | `modules/dominio/gastos/index.js` | `_prellenarCamposGasto(form, datos)` |
| Handlers | `modules/dominio/gastos/index.js` | `_repetirFrecuente()`, `_repetirGasto()` |
| Estilos de los chips | `styles/components/domain.css` | `.gastos-frecuentes__*` |

**Criterio de agrupación** (`gastosFrecuentes`): categoría + monto redondeado a $1.000 (mismo `step` del campo monto, absorbe variaciones menores sin fusionar montos distintos) + descripción normalizada (sin tildes/mayúsculas). Se repite 3 o más veces (`minRepeticiones`) dentro de los últimos 60 días (`diasVentana`), máximo 4 resultados (`maxResultados`), ordenados por más repetido y, en empate, por más reciente. **Excluye gastos con `compromisoId`** (pagos de fijo del Calendario o abonos de deuda, categorías internas 'Gastos fijos'/'Deudas' de TX.8b): los repite su propio dominio dueño; ofrecerlos aquí invitaría a duplicar un pago que ya tiene su mecanismo. **El monto redondeado es solo la clave de agrupación (TX.12b)**: el `monto` que el grupo expone (y que el chip ofrece/prellena) es el del registro más reciente, sin redondear.

**Decisión de diseño: la nota NO se prellena desde el chip de frecuente, pero SÍ desde "Repetir" de una fila.** El chip sintetiza una plantilla a partir de varios registros del historial; su nota (si alguno la tuviera) sería ambigua entre instancias del grupo, así que se omite. "Repetir" en cambio apunta a una fila concreta y conocida: su nota se copia tal cual, junto con monto/categoría/cuenta, porque no hay ambigüedad posible.

**Riesgos**:

- **`renderFormGasto({ sugerencias })` cambia de firma**: acepta un objeto de opciones en vez de ningún argumento. Todos los call-sites existentes (incluidos los de los tests) seguían funcionando sin cambios porque el parámetro tiene default vacío; cualquier caller nuevo que quiera ocultar los chips (modo edición, "Repetir") debe pasar `sugerencias: false` explícitamente.
- **El botón "Repetir" vive en Gastos, no en Movimientos**: MOV.1 delega `editar-gasto`/`eliminar-gasto` desde el ledger al dominio dueño, pero `repetir-gasto` no se sumó ahí (fuera de alcance de esta tarjeta). Si se pide "repetir" también desde el ledger, es una entrada más en `_ACCIONES_POR_TIPO` de `movimientos/logic.js`, sin lógica nueva.

**Cambios pendientes**: ninguno conocido para esta pieza.

**Cambios realizados**:

- 2026-07-27 (TX.12b, hallazgo de la auditoría integral del 2026-07-25): el grupo de `gastosFrecuentes()` conserva el `monto` real del registro más reciente, no el redondeado a $1.000 que solo sirve de clave de agrupación (6 cafés de $6.500 ofrecían el chip "Café $7.000"). El bloque que ya actualizaba `cuentaId` con el registro más reciente ahora hace lo mismo con `monto`. 3 tests nuevos (2 en `gastosFrecuentes`, 1 en el chip del formulario, cubriendo el monto ofrecido con precio estable y con precio subiendo). 3193/3193 unit + lint verdes. SW v432 → v433.
- 2026-07-26 (DIS.4/G9 y G3): los chips bajan **debajo** del monto hero (el label pasa a "O repite un gasto frecuente") y `.gastos-frecuentes__lista` cambia el scroll horizontal oculto por `flex-wrap`. Ver CHANGELOG.
- 2026-07-23 (TX.12, patrón P2 de la auditoría de UX/producto): ver detalle arriba. 23 tests unitarios nuevos (`gastosFrecuentes`: agrupación, ventana de días, redondeo, exclusión de `compromisoId`, orden; chips del form; botón "Repetir" en la fila) más 2 E2E nuevos (chip prellena y registra; "Repetir" abre en modo creación sin chips de frecuentes, con nota copiada y fecha de hoy). 2965/2965 unit + 227/227 E2E + lint verdes. SW v413 a v414.
