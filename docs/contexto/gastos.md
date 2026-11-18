# Ficha de contexto: Gastos

> Revisado: 2026-11-17 (GAS.5c).

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## Pantalla Gastos v2 (GAS.1, ADR 039)

- **Objetivo**          : rediseño visual de `#sec-gast` a la familia v2 ([ADR 039](../DECISIONS/039-gastos-v2-visual.md)): hero del mes con total protagonista + comparativo + ojo (GAS.1a), lista agrupada por día + chips con identidad + máscara (GAS.1b), insight de gastos hormiga + empty states v2 (GAS.1c).
- **Estado actual**     : **INICIATIVA COMPLETA** (GAS.1a, GAS.1b y GAS.1c cerradas el 2026-07-14). Sexta pantalla de la familia visual v2. **DSK.3 (2026-08-18, [ADR 072](../DECISIONS/072-gastos-cabecera-de-banda-y-fila-con-cuenta.md)) le da composición de escritorio desde 1680px**: el hero pasa a banda (total a la izquierda; nav de mes, enlace "En qué gastaste" a Análisis y ojo a la derecha, tras un filete), el total del día cae sobre la columna de montos que suma, la fila deja de levantarse al apuntar y la lista deja de entrar en cascada. Dos de sus decisiones son de contenido y **valen en todos los anchos**: la fila abre su subtítulo con la cuenta de origen, y los chevrons de mes pasan al glifo del sistema. **DIS.4 cerrada** (2026-07-26): las 10 correcciones aplicables de la auditoría de diseño de la sección. **Ficha 07 (2026-08-20, [ADR 069](../DECISIONS/069-bloque-gastos-en-la-barra-movil.md) D8): la sección es la portada del bloque Gastos y deja de ser dueña de su reloj.** Bajo 1024px el encabezado del bloque (`ui/bloque-gastos.js`) pone el nombre, el selector de mes y el ojo para las tres lentes, y `.hero-gastos__top` se oculta: dos relojes en la misma pantalla eran el defecto G4. El mes visible vive en `infra/mes-bloque.js`, no acá. Y el hero gana una línea que **declara lo que el total no cuenta** ("+ $X en fijos y deudas", con salida a la lente donde viven): `_sinInternas()` no cambia, lo que cambia es que la pantalla lo dice (G1, regla candidata R82).
- **Verificado contra** : GAS.5a (2026-11-17, [ADR 161](../DECISIONS/161-dia-a-dia-tino-anota-sin-flecha.md)): `_renderEmptyState` y `.gastos-empty__guia--halo`. Antes: ADR 132 tanda 4 (2026-11-06). Antes: tanda 1 (2026-11-05). Antes: MV2.3 tanda 4 (2026-11-04, la hoja del gasto).

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| Hero del mes (nav integrada + label + total + comparativo) | `modules/dominio/gastos/view.js` | `_renderHeroGastos()` | renderizado por `renderFiltrosGastos()` en `#panel-filtros-gastos`, antes de los chips |
| Chip comparativo vs mes anterior | `modules/dominio/gastos/view.js` | `_renderComparativo()` | oculto con filtro activo, mes vacío o sin base; internas (TX.8b) fuera de la base. En el teléfono, pastilla blanca y "$" chico (`_conSigno`, GAS.4b) |
| Dirección y magnitud de la variación (pura) | `modules/dominio/gastos/logic.js` | `variacionMensualGasto(totalActual, totalAnterior)` | null sin base; redondeo a 0% → 'igual' |
| Ojo de privacidad del hero | `modules/dominio/gastos/index.js` | acción `gastos-saldo-visibilidad` | flip de `S.config.ocultarSaldo` + `save()` + `updSaldo()` + re-render, espejo de `agenda-saldo-visibilidad` |
| Estilos del hero | `styles/components/domain.css` | `.hero-gastos*` (bloque al final del archivo) | contraste método IV.1 documentado en el comentario del bloque |
| Ojo compartido de la familia | `styles/components/domain.css` | grupo `.hero-*__ojo` | `.hero-gastos__ojo` va **estático en grilla** `[espaciador\|nav\|ojo]`, no absoluto: la nav de mes centrada no se le solapa a 320px |
| Agrupación por día (pura) | `modules/dominio/gastos/logic.js` | `agruparPorDia(gastos)` | conserva el orden recibido; total por grupo |
| Grupo del día + label humano | `modules/dominio/gastos/view.js` | `_renderGrupoDia()`, `_labelDia()` | "Hoy"/"Ayer"/"Vie 11 jul" (+ año si no es el corriente); `formateadorFecha` cacheado |
| Ítem de la lista (máscara D9, subtítulo sin fecha) | `modules/dominio/gastos/view.js` | `_renderGastoItem(gasto, oculto)` | firma con `oculto` explícito: NO pasarla directa a `.map()` (el índice caería en `oculto`) |
| Banda de escritorio: enlace a Análisis y bloque derecho (DSK.3a, ADR 072 D1) | `styles/responsive.css` | bloque "GASTOS EN ESCRITORIO" + `.hero-gastos__link` | desde 1680px; el enlace lo emite `_renderHeroGastos()` y `domain.css` lo apaga bajo ese ancho |
| Título y subtítulo de la fila (ADR 132 D4): la nota o descripción arriba, "Categoría · Cuenta" debajo; sin texto, la categoría y la cuenta | `modules/dominio/gastos/view.js` | `textosFilaGasto()` | pura, recibe las cuentas |
| Encabezado del día ("Martes 10") y orden del riel de categorías en el teléfono (de más a menos gasto) | `modules/dominio/gastos/view.js` | `labelDiaGastos()`, `categoriasTopGastos()` | ADR 132 D3; ADR 157 D5 |
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
- **La barra de filtros envuelve en escritorio y se desliza en el teléfono (GAS.4b, excepción de R9)**: el override de `#panel-filtros-gastos` en `domain.css` envuelve; el riel del teléfono vive en `identidad.css` (bloque GAS.4b). La base de `.filtros-bar` la comparten Movimientos y el asistente de distribución: no tocarla.
- **El tope de la navegación se calcula en `_mesTope()` sobre `S.gastos`** (mes corriente, o el del gasto más reciente si es posterior). Si alguna vez la sección deja de mostrar todos los gastos no internos, ese cálculo hay que revisarlo con ella o "›" quedará habilitado hacia meses vacíos.
- **`_renderEmptyState()` tiene dos textos, no uno**: en un mes que no es el corriente no ofrece registrar (el formulario abre con la fecha de HOY y el gasto caería en otro mes), sino volver. Agregar un CTA de registro ahí reabre el hallazgo H8.
- **El vacío del mes corriente no trae botón (GAS.3, [ADR 156](../DECISIONS/156-registrar-gasto-en-el-telefono-tablero-integral.md) D2; GAS.5a, [ADR 161](../DECISIONS/161-dia-a-dia-tino-anota-sin-flecha.md) D1)**: Tino explica (la pose con libreta la entrega Esteban en SVG) y, en el teléfono, solo el halo (`.gastos-empty__guia--halo`, fijo) late sobre el botón central, calibrado al círculo de 56 px que sube 26 px (`--gastos-guia-boton`). La flecha punteada salió en GAS.5a: era ruido junto al halo y la frase.

**Cambios realizados**:

- 2026-11-17 SAL.1: sale `tino-anota.svg` (compuesto, no es arte de Esteban); el vacío vuelve a `explica` hasta su SVG.
- 2026-11-17 GAS.5a ([ADR 161](../DECISIONS/161-dia-a-dia-tino-anota-sin-flecha.md) D1): el vacío de Día a día trae a Tino anotando en una libreta y deja la flecha punteada; el halo del botón central se queda.
- 2026-11-16 GAS.4b (ADR 157 D4-D6): el total con el "$" chico y el comparativo blanco; sale "+ $X en fijos y deudas"; las categorías en un riel deslizable de más a menos gasto, sin "+N".
- 2026-11-16 GAS.4a ([ADR 157](../DECISIONS/157-gastos-encabezados-sin-registro-y-lista-del-mes.md) D1): la cabecera del bloque va en una fila (nombre, pastilla "‹ Noviembre ›", lupa y ojo), sin "Todo el dinero que se te va" ni el espejo "+ Gasto"; registrar es el botón central.
- 2026-11-15 (SUS.1b, [ADR 146](../DECISIONS/146-finko-reconoce-el-tipo-de-gasto.md) D5): el chip "Gastos hormiga" sale de `CATEGORIAS_GASTO_USUARIO` (escritorio y teléfono); hormiga es lo que Finko reconoce por monto. Sigue en `CATEGORIAS_GASTO`: los gastos guardados conservan su ícono y, al editarlos, se re-elige la categoría como con Vivienda.
- 2026-11-15 SUS.2d: la hoja y la ficha del gasto dicen si su concepto es gusto o necesidad y dejan corregirlo (`htmlCaracterGasto`, acción `gasto-caracter`).
- 2026-11-15 SUS.2c ([ADR 147](../DECISIONS/147-gusto-o-necesidad-hormiga-sin-adivinar.md) D1): si algo "depende" se repite sin respuesta, la tarjeta del aviso pregunta "¿es un gusto o algo que necesitas?" (`preguntaHormiga`, `htmlPreguntaHormiga`, acción `gastos-gusto-o-necesidad`); la respuesta va a `S.config.hormiga.conceptos` (v53).
- 2026-11-06 (ADR 132 tanda 4): la hoja "Nuevo gasto" pregunta en frase ("¿Cuánto gastaste?", "¿En qué?", "¿De qué cuenta sale?", "¿Cuándo?"), sin "COP"; en el teléfono el monto va a la izquierda y la cuenta se pliega con "Cambiar" (`renderSelectorCuenta`, acción `cuenta-sel-cambiar` en `ui/actions.js`).
- 2026-11-05 (ADR 132 tanda 1): mes sin cajas, chips con las tres categorías de más gasto, días "Martes 10", fila con la nota arriba, historial como enlace y vacío con su botón dentro del banner.
- 2026-11-04 (**MV2.3 segunda pasada**, [ADR 122](../DECISIONS/122-lo-que-faltaba-del-canvas-segunda-pasada.md) D5): con una categoría filtrada, `_lecturaFiltro()` escribe bajo el total "N gastos · tu límite es $X" (el límite sale de `presupuestosActivos()`; sin límite, solo la cuenta). El ojo tapa el monto.
- 2026-11-04 (**MV2.3 tanda 4**, [ADR 119](../DECISIONS/119-plan-de-salida-en-hoja-y-el-detalle-del-gasto.md) D2, acota el ADR 098 D4): la fila abre `gasto-detalle` y la hoja la arma `gastos/detalle.js` (`htmlDetalleGasto`, `cuandoGasto`): cuenta, nota, categoría, la línea del límite del mes del gasto (`calcularProgreso` de Límites, ADR 060), "Repetir hoy" y "Editar", "Los N gastos de X en {mes}" (`gasto-ver-categoria` → `movimientos:ver` con categoría y mes) y "Borrar este gasto" con lo que vuelve a la cuenta (`deltasPorEdicionDeGasto`). Movimientos conserva la hoja genérica.
- 2026-10-29 (MV2.1, [ADR 098](../DECISIONS/098-finko-movil-2-primera-entrega.md)): en móvil la fila es una línea con hoja de detalle (`ui/detalle-fila.js`), las categorías se pliegan con "+N" (cambia DIS.4/G3; `alternarFiltrosGastos()`), y la cabecera del bloque trae lupa y primario espejo. Escritorio igual.
- 2026-10-25 (APR.3e): categoría nativa **Familia** (`c-familia`, sale del selector de íconos personalizados) y `gasto:registrar`, el gasto que otro dominio ya decidió (mesada, premio del niño): se guarda con `origen` y descuenta su cuenta sin preguntar. Ver [`nino.md`](nino.md).
- 2026-08-20 (ficha 07, ADR 069 D8): el mes sube a `infra/mes-bloque.js`, `navegarMesGastos()` se queda con el reset del filtro y `mesTopeGastos()` se exporta. 2026-07-26 (DIS.4): las 10 correcciones de la auditoría de diseño de la sección (reglas R9 a R11 en [`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md)). Detalle de los dos en [`changelog/2026-08.md`](../changelog/2026-08.md) y [`changelog/2026-07.md`](../changelog/2026-07.md).

- 2026-07-14 (GAS.1c): insight de gastos hormiga (por fin en pantalla `detectarHormigas()`) + empty states v2; cierra la iniciativa. Nota E2E: sembrar estado en un test cuya página ya arrancó exige `addInitScript` + `reload` (un `goto` a la misma URL con hash es same-document y no re-arranca la app; un `evaluate` directo lo pisa el initScript de `saltearOnboarding` al recargar). Ver [CHANGELOG](../CHANGELOG.md).
- 2026-07-14 (GAS.1b): lista agrupada por día (Hoy/Ayer/"Vie 11 jul" + total del día), chips con identidad de sección, máscara de montos de la lista, subtítulo sin fecha. Ver [CHANGELOG](../CHANGELOG.md).
- 2026-07-14 (GAS.1a): hero del mes con total protagonista + comparativo + ojo. Ver [CHANGELOG](../CHANGELOG.md).

---

## Formulario de gasto (TX.9 + FORM.1a)

- **Objetivo**          : rediseñar el formulario de registrar gasto para que la categoría sea el dato principal (no la descripción), soporte categorías creadas por el usuario, y no pida una descripción redundante cuando la categoría ya representa el concepto. Desde FORM.1a ([ADR 042](../DECISIONS/042-formularios-v2-visual.md)) es además el flagship del lenguaje de formularios v2: monto hero al frente, categoría con chips de ícono (sin select), fecha con atajos Hoy/Ayer/Otra fecha.
- **Estado actual**     : **TX.9 completa** (TX.9a: categoría primero, descripción ya no obligatoria; TX.9b: categorías personalizadas). **IN.5 cerrada** (2026-07-06). **FORM.1a cerrada** (2026-07-15): form v2 completo; **el orden de TX.9a quedó revisado por el ADR 042 D2** (monto primero; la categoría sigue antes de cuenta/fecha/nota). **GAS.2 cerrada** (GAS.2a y GAS.2b, 2026-08-10): el formulario no cambió; ver bloque "Confirmación tras guardar" más abajo. **GAS.2c diferida** (Abono, Aporte).
- **Verificado contra** : GAS.5c (2026-11-17, [ADR 162](../DECISIONS/162-en-que-fue-y-necesidad-o-deseo-en-cada-gasto.md)): `_htmlDetalle` y la etapa `detalle` (`telefono.js`), `preguntaNecesidadODeseo` (`logic.js`), `_anotarCaracter` (`index.js`). Antes: GAS.5b (2026-11-17, [ADR 161](../DECISIONS/161-dia-a-dia-tino-anota-sin-flecha.md) D2): `_gastoSinSaldo` y `planSiNoAlcanza(..., anterior)`. Antes: GAS.C (2026-11-17, [ADR 158](../DECISIONS/158-el-recibo-de-gasto-es-un-comprobante.md)): el recibo del teléfono es un comprobante (`_htmlRecibo`, `_pieza`, `CATEGORIA_ILUSTRACION`); la cuenta se pinta con `nombreCortoCuenta` y `tipoDeCuenta(c, true)`. Antes, GAS.3 (2026-11-17, [ADR 156](../DECISIONS/156-registrar-gasto-en-el-telefono-tablero-integral.md)): el recibo dice cada dato una vez, la cuenta que no alcanza apaga "Guardar gasto" (`planSiNoAlcanza` es cuenta y falta; sin `reparto` ni `repartoDelRecibo`) y "¿Con qué pagaste?" usa `htmlOpcionCuenta` de `infra/cuenta-helper.js`. Antes, FORM.2b (2026-11-14): bajo 1024 px el formulario va por etapas en `gastos/telefono.js` (`renderFormGastoTelefono`, `montarFormGastoTelefono`, `repartoDelRecibo`) y `_montarFormGasto` elige cuál pintar; el contrato `FormData` y `_guardarGasto` son los de siempre, salvo que en el teléfono el reparto sale del recibo (`reparto`) y no del diálogo. Antes, BUG-035 y BUG-038 (2026-11-04, 5c97b98). Antes: HF.0c (2026-10-17), solo el efecto de editar y borrar sobre el saldo; GAS.2b (2026-08-10).

**Dónde vive (FORM.1a)**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| Form v2 completo (monto hero + chips + fecha con atajos) | `modules/dominio/gastos/view.js` | `renderFormGasto()` | radios reales `name="categoria"` y `name="fechaOpcion"`; el date real `#gasto-fecha` vive oculto en `#gasto-fecha-otra` |
| Wiring de chips y atajos de fecha | `modules/dominio/gastos/index.js` | `_montarFormGasto()` | listener delegado de `change` en el form (categoría revela `#categoria-nueva-fields`; hoy/ayer escriben el date, "otra" lo revela) |
| Edición: marcar chip de categoría y de fecha | `modules/dominio/gastos/index.js` | `_editarGasto()` | categoría legacy fuera de catálogo → ningún chip marcado, se re-elige (mismo comportamiento que tenía el select) |
| Teléfono: etapas, recibo y mini-hojas (FORM.2b, ADR 142 D4) | `modules/dominio/gastos/telefono.js` | `renderFormGastoTelefono()`, `montarFormGastoTelefono()`, `irAEtapaGasto()`, `fechaDelRecibo()` | mismos `name` e ids que la columna (`#gasto-fecha` es `hidden` dentro de la mini-hoja de la fecha; `#grupo-gasto-cuotas` es la fila "Cuotas" del recibo). Editar, "Repetir" y un frecuente llaman `irAEtapaGasto(form, 'revisar')` tras prellenar. "Deshacer" (`_deshacerGastos`) vale también en escritorio |
| Teléfono: la ficha editable (FORM.2d, ADR 142 D6) | `modules/dominio/gastos/telefono.js`, `index.js`, `detalle.js` | `_htmlFicha()`, `renderFormGastoTelefono({ ficha })`, `_guardarGasto` con `form.dataset.quedarse`, `_restaurarGasto()`, `htmlExtrasDetalleGasto()` | en el teléfono `gasto-detalle` y `editar-gasto` abren la ficha (`#form-gasto[data-ficha]`). Al volver al recibo se compara la firma de `FormData`; si cambió, `requestSubmit()` con `quedarse` (no cierra, repinta y avisa con "Deshacer"). Escritorio conserva la hoja del ADR 119 |
| Teléfono: lógica pura | `modules/dominio/gastos/logic.js` | `ordenarCategoriasPorUso()`, `cuentaHabitual()`, `planSiNoAlcanza()` | el plan es la cuenta y lo que falta: apaga "Guardar gasto" (ADR 156 D6); el teléfono no reparte |
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
| Subcategoría y "¿gusto o necesidad?" (SUS.2a, [ADR 147](../DECISIONS/147-gusto-o-necesidad-hormiga-sin-adivinar.md)) | `constants.js`, `gastos/view.js`, `index.js`, `telefono.js`, `logic.js` | `SUBCATEGORIAS_GASTO`, `CARACTER_CATEGORIA_GASTO`, `htmlDetalleCategoriaGasto()`, `sincronizarDetalleCategoria()`, `_pintarFilaDetalle()`, `normalizarGasto()` | un `<fieldset>` por categoría, oculto y `disabled` salvo el elegido; en el teléfono vive en la mini-hoja `#gasto-mini-detalle` |
| Mapeo categoría nativa → ícono | `modules/core/constants.js` | `CATEGORIA_ICONO` | ~448 |
| Catálogo de íconos elegibles para categoría personalizada (29, sin duplicar los nativos) | `modules/core/constants.js` | `ICONOS_CATEGORIA_PERSONALIZADA` | ~470 |
| Resolver de ícono (nativa → personalizada → genérico, TX.9b) | `modules/core/constants.js` | `iconoDeCategoriaGasto(categoria, personalizadas)` | ~505 |
| Colección de categorías creadas por el usuario (bump v24) | `modules/core/state.js` | `S.categoriasPersonalizadas` | ~304 |
| Validación de categoría nueva (nombre sin duplicar, ícono del catálogo) | `modules/dominio/gastos/logic.js` | `validarCategoriaPersonalizada(datos, existentes)` | ~176 |
| Opción "+ Otra categoría" + selector de ícono inline en el form | `modules/dominio/gastos/view.js` | `renderFormGasto()`, `CATEGORIA_NUEVA_VALUE` | ~364 |
| Reveal/hide de los campos nuevos + click del selector de ícono | `modules/dominio/gastos/index.js` | `_montarFormGasto()` | ~438 |
| Creación y persistencia de la categoría al enviar el formulario | `modules/dominio/gastos/index.js` | `_guardarGasto()` | ~51 |
| Título del ítem en la lista: la nota o descripción si hay, si no la categoría (ADR 132 D4, supera TX.9a) | `modules/dominio/gastos/view.js` | `textosFilaGasto()` | ~560 |
| Nombre del gasto en confirmación de borrado / anuncio a11y (fallback a categoría, TX.9a) | `modules/dominio/gastos/index.js` | `_eliminarGasto()` | ~334 |
| Descripción del Movimiento cuando el gasto no tiene descripción (fallback a categoría, TX.9a) | `modules/dominio/movimientos/logic.js` | `movimientosDesdeGastos()` | ~48 |
| Gasto importado sin efecto en el saldo (HF.0c, ADR 091 P4): editar y borrar ("editar hacia nada") no mueven cuentas | `modules/dominio/gastos/logic.js`, `gastos/index.js`, `import/logic.js` | `deltasPorEdicionDeGasto()`, `_guardarGasto()`, `_eliminarGasto()`, `normalizarFila()` | |

**Recursos**: `ICONOS_CATEGORIA_PERSONALIZADA` (29 símbolos `c-*` del sprite ya existentes en `index.html`, ID.3/ADR 023, que no estaban asignados en `CATEGORIA_ICONO`); primer selector de ícono de la app (`.icono-picker`/`.icono-picker__btn` en `forms.css`, patrón tap-to-select consistente con `.accesos-row`/chips de categoría).

**Dependencias y relaciones**: `CATEGORIA_ICONO`/`CATEGORIAS_GASTO_USUARIO` los usa también `iconoPorOrigen()` (TX.6/TX.7) y el panel de Movimientos (TX.8a/b). `iconoDeCategoriaGasto()` (nuevo, en `core/constants.js` para que tanto `gastos/` como `movimientos/` lo importen sin violar ADN 10) resuelve nativa primero, personalizada después; `movimientosDesdeGastos()` recibe `S.categoriasPersonalizadas` como segundo parámetro (pura, no lee `S`).

**Riesgos**:

- ~~**"Descripción obligatoria" estaba profundamente asumida**~~: **resuelto (TX.9a)**. Ver detalle en el registro de cambios.
- ~~**Categorías personalizadas eran dato de usuario nuevo, sin precedente en la app**~~: **resuelto (TX.9b)**. `S.categoriasPersonalizadas` (bump v24), `ICONOS_CATEGORIA_PERSONALIZADA` + `iconoDeCategoriaGasto()` en `constants.js`, selector de ícono inline en el mismo formulario (sin modal anidado, mismo patrón que `hint-categoria-fija`).
- **Reclamé "sin distinguir tildes" en `validarCategoriaPersonalizada()` antes de implementarlo**: el primer intento solo hacía `toLocaleLowerCase()`; un test con una tilde de más lo encontró. Se agregó `.normalize('NFD').replace(/\p{Diacritic}/gu, '')`. **Lección**: si el docstring promete una garantía (aquí, insensibilidad a tildes), escribir el test que la ejercite ANTES de dar la función por terminada, no asumir que el caso "obvio" ya está cubierto.
- **Relaciona con TX.10** (categoría como eje de automatización): ese card explícitamente advierte "revisar juntas para no construir 3 motores de sugerencia por categoría distintos". TX.9 (a y b) no implementó detección de gasto hormiga/fantasma nueva; solo reordenó el formulario y sumó categorías de usuario, dejando la puerta abierta para que TX.10 las use después.
- ~~**Relaciona con IN.5** (eliminar/transformar "Gasto rápido")~~: **cerrada (2026-07-06)**. `pendienteCompletar` en gastos viejos queda ignorado, sin migración.
- **Sin gestión de categorías personalizadas** (editar nombre/ícono, eliminar, ver cuántos gastos las usan): fuera de alcance de TX.9b, que solo cubre crear + usar. Si Esteban lo pide, es una tarjeta nueva (ej. TX.9c), probablemente en Ajustes.

- **Un gasto importado no mueve saldos (HF.0c, BUG-029)**: `normalizarFila()` lo marca `sinEfectoSaldo` y `deltasPorEdicionDeGasto()` devuelve `{}` para él, al editar y al borrar; el confirm de borrado ya no promete devolver nada. Los importados antes de la v44 no tienen marca y siguen reembolsando (P4: sin backfill). "Repetir" uno crea un gasto manual normal. La marca solo cubre la cuenta: editar un importado hacia un consumo con tarjeta sigue moviendo la deuda.

**Riesgos nuevos (FORM.1a)**:

- **La regla móvil anti-zoom de iOS pisa los inputs por capas:** `responsive.css` declara `.input { font-size: 16px }` en móvil y su capa le gana por ORDEN a `components`, aunque la especificidad diga lo contrario. La excepción de `.input--big-amount` (2.25rem) vive en `responsive.css`, dentro de la misma media query: cualquier componente futuro que necesite un input distinto en móvil debe poner su excepción AHÍ, no en `forms.css`.
- **Los chips son labels con el radio oculto:** en E2E no sirve `check()` sobre el input (no visible); se clickea el label (`elegirCategoriaGasto`). En unit, el estado seleccionado se lee por `input.checked`, no por clases.
- **`form.querySelector('[name="categoria"]').value` ya no sirve para leer/escribir la categoría** (devuelve el primer radio): leer vía FormData (como siempre hizo `_guardarGasto`) o iterar radios (como `_editarGasto`).
- **El primer bloque del formulario es `.monto-hero` y así debe quedar (ADR 042 D2, regla R11)**: TX.12 insertó los chips de gasto frecuente antes y el form dejó de abrir con el monto durante tres días sin que nadie lo decidiera; DIS.4/G9 lo devolvió a su lugar. Cualquier bloque nuevo (atajo, sugerencia, ayuda) va **después** del monto.

**Cambios pendientes**: ninguno conocido para TX.9. Posible extensión futura: gestión de categorías personalizadas (ver Riesgos). El resto de la iniciativa Formularios v2 (FORM.1b deuda, FORM.1c gasto fijo) vive en el BOARD.

**Cambios realizados**:

- 2026-11-17 GAS.5c ([ADR 162](../DECISIONS/162-en-que-fue-y-necesidad-o-deseo-en-cada-gasto.md)): "¿En qué fue?" es una etapa del teléfono (subcategoría con "Otra cosa"); "¿Fue una necesidad o un deseo?" obligatoria al registrar cuando lo elegido depende del día, y vale solo para ese gasto (`preguntaNecesidadODeseo`).
- 2026-11-17 GAS.5b ([ADR 161](../DECISIONS/161-dia-a-dia-tino-anota-sin-flecha.md) D2): ningún gasto deja la cuenta bajo $0, en los dos anchos y al editar (`_gastoSinSaldo`, `planSiNoAlcanza` con el gasto anterior); sale "¿Registrar de todas formas?".
- 2026-11-17 GAS.C ([ADR 158](../DECISIONS/158-el-recibo-de-gasto-es-un-comprobante.md)): el recibo del teléfono es un comprobante con las piezas de `assets/svg/comprobante/` (sprite `cmp-*`); la cabecera de "Revisar" es la banda de Finko. Falta el arte de GAS.C2.
- 2026-11-17 GAS.3 ([ADR 156](../DECISIONS/156-registrar-gasto-en-el-telefono-tablero-integral.md)): la hoja del tablero integral; sin "Usar el teclado del teléfono" ni "Guardar y registrar otro"; un mensaje y sin guardar si la cuenta no alcanza; la fila de cuentas de Inicio; calendario centrado; la nota sin destello.
- 2026-11-15 SUS.2a ([ADR 147](../DECISIONS/147-gusto-o-necesidad-hormiga-sin-adivinar.md)): Mecato, "Sé más específico" y, en Otros o una categoría propia, "¿Es un gusto o una necesidad?"; el gasto guarda `subcategoriaId` y `caracter` (v52) y la fila se titula con la subcategoría.
- 2026-11-04 (**BUG-038** y **BUG-035**, 5c97b98): editar un pago o abono abre con su categoría fija y sin tarjetas; editar o borrar el pago de un fijo no toca `saldoTotal`. Ver CHANGELOG.
- 2026-10-17 (**HF.0c**, BUG-029): el gasto importado no toca el saldo al importarlo, editarlo o borrarlo (`sinEfectoSaldo`, schema v44). Ver CHANGELOG.
- 2026-08-10 (GAS.2a): ver bloque "Confirmación tras guardar" más abajo.
- 2026-07-15 (FORM.1a): form v2 completo (monto hero, chips de categoría, atajos de fecha, teja del header, footer principal) + fix del hueco preexistente de `responsive.css` que achicaba `.input--big-amount` en móvil. Ver [CHANGELOG](../CHANGELOG.md) y [ADR 042](../DECISIONS/042-formularios-v2-visual.md).

- 2026-07-06 (IN.5): se eliminó "Gasto rápido" (botón, modal y la cola de "pendientes por organizar"); el formulario completo ya registra en pocos toques. Detalle en el changelog de julio. SW v330.
- 2026-07-05: 2 hitos resumidos el 2026-11-15 para que la ficha quepa en su techo (TX.9b, TX.9a). Detalle en [2026-07](../changelog/2026-07.md).

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

- 2026-07-27 (TX.12b): el chip frecuente ofrece el `monto` real del registro más reciente, no el redondeado a $1.000 que solo agrupa. SW v433.
- 2026-07-26 (DIS.4/G9 y G3): los chips bajan **debajo** del monto hero (el label pasa a "O repite un gasto frecuente") y `.gastos-frecuentes__lista` cambia el scroll horizontal oculto por `flex-wrap`. Ver CHANGELOG.
- 2026-07-23 (TX.12, patrón P2 de la auditoría de UX/producto): ver detalle arriba. 23 tests unitarios nuevos (`gastosFrecuentes`: agrupación, ventana de días, redondeo, exclusión de `compromisoId`, orden; chips del form; botón "Repetir" en la fila) más 2 E2E nuevos (chip prellena y registra; "Repetir" abre en modo creación sin chips de frecuentes, con nota copiada y fecha de hoy). 2965/2965 unit + 227/227 E2E + lint verdes. SW v413 a v414.
