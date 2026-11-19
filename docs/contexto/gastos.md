# Ficha de contexto: Gastos

> Revisado: 2026-11-19 (GAS.8h).

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## Gastos en el teléfono: cada cosa con su forma y su color (GAS.8, ADR 182)

- **Objetivo**          : el tablero "Gastos de Finko · Rediseño móvil" ([ADR 182](../DECISIONS/182-gastos-cada-cosa-con-su-forma-y-su-color.md)): bosque resume, rojo avisa, ámbar acerca, girasol sugiere, el neutro filtra, cada categoría tiene su tono y el coral marca la sección. Bajo 1024 px.
- **Estado actual**     : en proceso. GAS.8a a GAS.8h cerradas (D1 a D8). Faltan las cinco poses de Tino ([`board/gastos.md`](../board/gastos.md)).
- **Verificado contra** : GAS.8h (2026-11-19). Antes: GAS.8g (2026-11-19).

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| Los tokens de cada trabajo | `styles/tokens.css`, `styles/themes.css` | `--fk-resumen*`, `--fk-alerta*`, `--fk-cerca*`, `--fk-bien*`, `--fk-sugerencia*`, `--fk-filtro*`, `--fk-riel*`, `--fk-seccion-coral*` | el claro redefine todo menos el bosque, que es igual en los dos temas |
| El tono de cada categoría | `modules/core/constants.js`, `styles/components/atoms.css` | `TONO_CATEGORIA`, `tonoDeCategoria()`, `.cat-teja[data-cat]` | `tejaCategoria(id, dominio, tono)` pone `data-cat`; `--fk-cat-*-barra` es el de la barra sobre el bosque |
| El encabezado: teja, lupa y ojo | `modules/ui/bloque-gastos.js` | `htmlBloqueGastos()` | el ojo tapa la lente de su encabezado (`claveDelOjo`); los ojos de las tarjetas se apagan en CSS |
| Bosque, filtros y riel | `styles/identidad.css` | bloque "GAS.8 (ADR 182)" | va al final: gana a los bloques GAS.4 y GAS.7 |
| La comparación, el reparto y las semanas (puras) | `modules/dominio/gastos/logic.js` | `comparacionDelMes()`, `repartoPorCategoria()`, `semanasDelMes()` | la comparación "a esta altura" corta el mes anterior en el día de hoy; las semanas van de lunes a domingo, recortadas al mes |
| La tarjeta de Día a día en el teléfono | `modules/dominio/gastos/view.js` | `_lecturaTelefono()`, `_comparacionTelefono()`, `_repartoTelefono()`, `_fichaLimite()` | el ojo tapa la barra; "Categorías ›" va a `#analisis` |
| La franja de alerta (roja y ámbar) | `modules/dominio/gastos/view.js`, `styles/identidad.css` | `_renderAlertaVencido()`, `.franja-alerta`, `.franja-alerta--ambar` | la comparten Día a día y Límites (GAS.8f) |
| Semanas anteriores plegadas | `modules/dominio/gastos/view.js`, `gastos/index.js` | `_renderPorSemanas()`, `alternarSemanaGastos()`, acción `gastos-semana` | la semana más reciente con gastos va por día; el foco vuelve al botón |
| Gastos fantasma y la sugerencia girasol | `modules/dominio/gastos/view.js`, `styles/identidad.css` | `_renderFantasma()`, `.sugerencia`, acción `gastos-fantasma-descartar` | descartada por mes en `S.config.fantasmaDescartado`; "Ver cuáles" abre la hoja `hormiga` de Análisis |
| El mes sin gastos en el teléfono | `modules/dominio/gastos/view.js` | `_renderDiaNuevo()`, `_TEJAS_HOY` | las tejas abren `nuevo-gasto` con `data-categoria` (marca el radio); la pista solo sin fijos activos |
| Las poses que faltan | `modules/infra/ilustraciones.js` | `POSE_TINO_INTERINA` | `htmlTinoSol` cae en la interina; `data-pose` dice la que se ve |
| Por pagar: fijos y cuotas | `modules/dominio/compromisos/views/lista.js`, `views/hero.js` | `_FILTRO_DE_LENTE` (`fijos: 'mes'`), `_renderPorUrgencia` (rama `'mes'`), `resumenFijosDelMes({ conCuotas })` | el lote no lleva `data-tipo` en `'mes'` (paga los dos tipos); el simulador y los avisos de deudas se apagan en CSS |
| Deudas como inventario | `compromisos/views/lista.js`, `hero.js` | `_renderInventarioDeudas()`, `htmlHeroDeudas()`, acción `deudas-grupo` | en Deudas el plan va dentro de la lista |
| Límites: lista, alerta y sugerencia | `presupuesto/view.js`, `logic.js` | `_renderAlertaLimite()`, `_renderFilaEstado()`, `sinLimiteDelMes()`, `limiteDeLaAlerta()` | la sugerencia se descarta por mes y categoría |
| Nuevo límite en dos pasos | `presupuesto/view.js`, `index.js`, `logic.js` | `renderFormLimiteTelefono()`, `esLimiteDeUnaParte()` | `soloParte` cambia lo que cuenta `calcularProgreso` |
| Agregar cuenta | `tesoreria/views/cuentas.js`, `acciones/cuentas.js` | `htmlAgregarCuenta()`, `_seguirConCuenta()`, `#modal-agregar-cuenta` | el paso 3 es `#form-cuenta` o la deuda |

**Riesgos**:

- **Las pastillas de las pestañas siguen en el DOM** (`sincronizarBloqueGastos` las escribe y el nombre accesible lleva el conteo); solo no se ven en el bloque Gastos (Ahorro sí las muestra).
- **Límites pintaba sus tejas en el coral de Gastos** (GAS.7f): esa regla queda solo para las tejas sin `data-cat`.
- **El embudo (`gastos-mas-filtros`) abre el historial como `gastos-ver-historial`**: Movimientos con el dominio y sin rango, donde viven la cuenta y las fechas; no hay hoja de filtros propia.
- **`filtroDeLente('fijos')` ya no es `'fijo'` sino `'mes'`**: quien preguntaba "¿estoy en Fijos?" tiene que preguntar por `'mes'`; el vacío de la pestaña sigue siendo el de los fijos.
- **La entidad de una deuda sale de la marca de su nombre** (`resolverMarca`); sin marca, la fila dice la categoría.

**Cambios realizados**:

- 2026-11-19 GAS.8h (ADR 182 D8): Agregar cuenta en el teléfono por tipo y por entidad.
- 2026-11-19 GAS.8g (ADR 182 D7): Nuevo límite en dos pasos en el teléfono; "Solo una parte" cuenta solo lo de su subcategoría.
- 2026-11-19 GAS.8f (ADR 182 D6): Límites con su lista, una sola alerta, la sugerencia y el primer uso.
- 2026-11-19 GAS.8e (ADR 182 D5): Deudas como inventario, con dos puertas, el plan como sugerencia y su vacío.
- 2026-11-19 GAS.8d (ADR 182 D4): la segunda pestaña vuelve a ser Por pagar (`#fijos`, lente `'mes'`), con los fijos y las cuotas del mes y el lote.
- 2026-11-19 GAS.8c (ADR 182 D3): Gastos fantasma como sugerencia girasol y el mes sin gastos con Tino, las cuatro tejas y la pista de Por pagar.
- 2026-11-19 GAS.8b (ADR 182 D2): Día a día: la comparación en pesos, la barra por categoría, la franja del vencido, los chips sin total y las semanas plegadas.
- 2026-11-19 GAS.8a (ADR 182 D1): los roles de color, el tono por categoría, el resumen bosque y el encabezado coral.

---

## Gastos en cuatro pestañas (GAS.7, ADR 179)

- **Objetivo**          : el tablero "Gastos móvil, rediseño de navegación" ([ADR 179](../DECISIONS/179-gastos-en-cuatro-pestanas.md)): bajo 1024 px el bloque va en Día a día, Fijos, Deudas y Límites; el mes y el ojo bajan a la tarjeta de cada pestaña.
- **Estado actual**     : **INICIATIVA COMPLETA** (GAS.7a a GAS.7g, 2026-11-18, ADR 179 D1 a D7). Escritorio no cambia: "Por pagar" con sus cuatro chips.
- **Verificado contra** : FAC.1 (2026-11-19, ADR 180). Antes: GAS.7g (2026-11-19).

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| Las cuatro pestañas y sus marcas | `modules/ui/bloque-gastos.js` | `LENTES_BLOQUE_GASTOS`, `estadoLentesGastos()` (`vencidosFijos`, `vencidasDeudas`) | Fijos y Deudas comparten el encabezado de `#tabs-compromisos`; el punto de Límites va junto al nombre |
| Las rutas `#fijos` y `#deudas` | `modules/infra/router.js` | `SECTIONS`, `seccionDelHash()` | las dos muestran `sec-compromisos`; `renderSmart`, `markActiveNav` (sidebar), el volver y el ojo comparan por sección |
| La pestaña manda sobre el chip | `modules/dominio/compromisos/views/lista.js` | `filtroDeLente()`, `lentePorPagar()` | sin chips en la pestaña; el hero (`faltaPorPagarDelMes`) y el lote del pie cuentan solo su tipo |
| `#compromisos` en el teléfono | `modules/dominio/compromisos/index.js` | `_quedarseEnLaPestana()`, `_irAPorPagar()` | `replaceState` dentro del `hashchange`, antes que el router, que ya lee la pestaña |
| Lo que se apaga en cada pestaña | `styles/identidad.css` | bloque "GAS.7", `#sec-compromisos[data-lente]` | el simulador y los avisos de deudas en Fijos; la tarjeta del lote en las dos |
| El mes en el rótulo de cada tarjeta (D2) | `modules/infra/mes-bloque.js` | `htmlMesDelRotulo()` | botón `bloque-elegir-mes` en el teléfono; texto en escritorio |
| La hoja "Elige el mes" | `modules/ui/bloque-gastos.js`, `index.html` | `htmlHojaMeses()`, `filasHojaMeses()`, `primerMesFinko()`, `#modal-elegir-mes` | totales de `totalesDiaADiaDelAnio()` (`gastos/logic.js`); `bloque-ir-mes` pasa por `navegarMesGastos` |
| El ojo de cada tarjeta | `modules/infra/privacidad.js` | `htmlOjoTarjeta()` | Día a día y Por pagar reusan el de su hero; Límites usa este |
| La tarjeta de Límites | `modules/dominio/presupuesto/view.js` | `_renderHeroLimites()`, `resumenLimitesDelMes()` (logic) | solo bajo 1024 px |

**Riesgos**:

- **Comparar `location.hash` con `'compromisos'` deja fuera las pestañas.** Lo que pregunta "¿estoy en Por pagar?" usa `seccionDelHash()`; lo que navega a Por pagar, `_irAPorPagar()` (en el teléfono va a la pestaña, no a `#compromisos`).
- **El chip sigue vivo debajo de la pestaña**: `setFiltroPorPagar` lo fija quien llega (`porPagar:ver-compromiso`) y `lentePorPagar()` lo lee para elegir pestaña; dentro de la pestaña no se ve.

**Cambios realizados**:

- 2026-11-19 FAC.1 ([ADR 180](../DECISIONS/180-la-pantalla-final-de-registro-es-una-factura.md)): el recibo de Registrar gasto (`gastos/telefono.js`) y el resumen de `ui/preguntas.js` son una factura (`ui/factura.js`, `.factura`); la categoría es la primera fila y "Entidad bancaria" pasa a "Cuenta de origen".
- 2026-11-18 y 19 GAS.7a a 7g (ADR 179 D1 a D7): cuatro pestañas, el mes en la tarjeta, Día a día, Fijos, Deudas, Límites por estado y los vacíos; detalle en el CHANGELOG de noviembre. GAS.8 (ADR 182) cambia D1 a D7 en el teléfono.

---

## Pantalla Gastos v2 (GAS.1, ADR 039)

- **Objetivo**          : rediseño visual de `#sec-gast` a la familia v2 ([ADR 039](../DECISIONS/039-gastos-v2-visual.md)): hero del mes con total protagonista + comparativo + ojo (GAS.1a), lista agrupada por día + chips con identidad + máscara (GAS.1b), insight de gastos hormiga + empty states v2 (GAS.1c).
- **Estado actual**     : **completa** (GAS.1a a 1c, 2026-07-14). Escritorio en banda desde 1680px (DSK.3, [ADR 072](../DECISIONS/072-gastos-cabecera-de-banda-y-fila-con-cuenta.md)); bajo 1024px es la portada del bloque Gastos ([ADR 069](../DECISIONS/069-bloque-gastos-en-la-barra-movil.md) D8). `_sinInternas()` deja fuera fijos y deudas.
- **Verificado contra** : GAS.5a (2026-11-17, [ADR 161](../DECISIONS/161-dia-a-dia-tino-anota-sin-flecha.md)): `_renderEmptyState` y `.gastos-empty__guia--halo`. Lo anterior, en el CHANGELOG.

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

**Riesgos**:


- **La lista del mes cierra con una salida al historial completo** (2026-08-21, ficha 15, [ADR 089](../DECISIONS/089-movimientos-la-quinta-fuente-y-cuatro-puertas.md) D3). `_renderSalidaHistorial()` en `view.js` y la accion `gastos-ver-historial` en `index.js`, que emite `movimientos:ver` con el dominio y **sin rango**: el reloj de mes de este bloque es justo lo que el historial sirve para saltarse. Va al pie y por EventBus, sin import cruzado (ADN 10).
- **`renderFiltrosGastos()` normaliza el filtro ANTES de pintar el hero** (si la categoría activa desapareció del mes, resetea a "Todos"): si se reordena ese cuerpo, el hero puede calcular el total con un filtro fantasma.
- La franja `_renderResumen` y sus clases `.gastos-resumen*`, y la barra `.mes-nav*`, **ya no existen**; cualquier referencia externa que aparezca es código muerto.
- **`_renderGastoItem(gasto, oculto)` cambió de aridad en GAS.1b**: pasarla directa a `.map()` pondría el índice en `oculto` (ítems 1+ enmascarados siempre); el caller usa arrow explícita. Mantener así.
- El ink `--fk-dom-gastos-text` sobre el tinte 12% en tema claro mide **4.39:1** (bajo AA para texto pequeño): por eso el chip activo usa texto primario. No "corregir" el chip a texto naranja sin re-medir.
- **El label del hero nombra el mes visible, nunca "este mes" (DIS.4/G1, regla R10)**: la nav de mes vive dentro del mismo hero, así que un label fijo atribuía el total al mes equivocado en cuanto se tocaba "‹". Con filtro activo es `{categoría} en {mes}`: la categoría sin el mes también pierde información.
- **La grilla móvil de la fila de gasto es propia de la sección** (`responsive.css`, `@media (max-width: 539px)`, scope `.gastos-dia`), no la genérica de `.list-item:has(.list-item__meta)`. Dos trampas: la capa `responsive` le gana **por orden** a `components`, así que esta corrección NO funciona desde `domain.css`; y sus `grid-template-areas` tienen que ser rectangulares (un área en L invalida la declaración entera y el navegador la descarta en silencio).
- **La barra de filtros envuelve en escritorio y se desliza en el teléfono (GAS.4b, excepción de R9)**: el override de `#panel-filtros-gastos` en `domain.css` envuelve; el riel del teléfono vive en `identidad.css` (bloque GAS.4b). La base de `.filtros-bar` la comparten Movimientos y el asistente de distribución: no tocarla.
- **El tope de la navegación se calcula en `_mesTope()` sobre `S.gastos`** (mes corriente, o el del gasto más reciente si es posterior). Si alguna vez la sección deja de mostrar todos los gastos no internos, ese cálculo hay que revisarlo con ella o "›" quedará habilitado hacia meses vacíos.
- **`_renderEmptyState()` tiene dos textos, no uno**: en un mes que no es el corriente no ofrece registrar (el formulario abre con la fecha de HOY y el gasto caería en otro mes), sino volver. Agregar un CTA de registro ahí reabre el hallazgo H8.
- **El vacío del mes corriente (GAS.3, ADR 156 D2; GAS.5a, ADR 161 D1):** en escritorio Tino explica y el registro es el primario del encabezado; en el teléfono, desde GAS.8c (ADR 182 D3), es `_renderDiaNuevo()` con su propio botón y las cuatro tejas (el halo del botón central salió).

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
- 2026-07-14 a 2026-11-04: GAS.1a a 1c (ADR 039), ficha 07 (ADR 069 D8), DIS.4, APR.3e (Familia y `gasto:registrar`), MV2.1 (ADR 098) y MV2.3 (ADR 119 D2 y 122 D5): detalle en el CHANGELOG de cada mes ([`changelog/`](../changelog/)).

---

## Formulario de gasto (TX.9 + FORM.1a)

- **Objetivo**          : rediseñar el formulario de registrar gasto para que la categoría sea el dato principal (no la descripción), soporte categorías creadas por el usuario, y no pida una descripción redundante cuando la categoría ya representa el concepto. Desde FORM.1a ([ADR 042](../DECISIONS/042-formularios-v2-visual.md)) es además el flagship del lenguaje de formularios v2: monto hero al frente, categoría con chips de ícono (sin select), fecha con atajos Hoy/Ayer/Otra fecha.
- **Estado actual**     : **TX.9 completa** (categoría primero y categorías personalizadas); IN.5 y FORM.1a cerradas: el ADR 042 D2 puso el monto primero. GAS.2, en "Confirmación tras guardar".
- **Verificado contra** : GAS.5c (2026-11-17, [ADR 162](../DECISIONS/162-en-que-fue-y-necesidad-o-deseo-en-cada-gasto.md)): `_htmlDetalle` y la etapa `detalle` (`telefono.js`), `preguntaNecesidadODeseo` (`logic.js`), `_anotarCaracter` (`index.js`). Antes: GAS.5b, GAS.C, GAS.3, FORM.2b y lo anterior: en el CHANGELOG de noviembre y los meses cerrados.

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

**Recursos**: `ICONOS_CATEGORIA_PERSONALIZADA` (29 símbolos `c-*` del sprite sin asignar en `CATEGORIA_ICONO`) y el selector de ícono `.icono-picker` en `forms.css`.

**Dependencias y relaciones**: `iconoDeCategoriaGasto()` vive en `core/constants.js` para que `gastos/` y `movimientos/` lo importen sin romper ADN 10; `movimientosDesdeGastos()` recibe `S.categoriasPersonalizadas` como parámetro.

**Riesgos**:

- **Reclamé "sin distinguir tildes" en `validarCategoriaPersonalizada()` antes de implementarlo**: el primer intento solo hacía `toLocaleLowerCase()`; un test con una tilde de más lo encontró. Se agregó `.normalize('NFD').replace(/\p{Diacritic}/gu, '')`. **Lección**: si el docstring promete una garantía (aquí, insensibilidad a tildes), escribir el test que la ejercite ANTES de dar la función por terminada, no asumir que el caso "obvio" ya está cubierto.
- **Relaciona con TX.10** (categoría como eje de automatización): ese card explícitamente advierte "revisar juntas para no construir 3 motores de sugerencia por categoría distintos". TX.9 (a y b) no implementó detección de gasto hormiga/fantasma nueva; solo reordenó el formulario y sumó categorías de usuario, dejando la puerta abierta para que TX.10 las use después.
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

**Observaciones**: el campo **Nota** ya existía antes de TX.9a; la tarea solo reordenó alrededor de él.

---

## Confirmación tras guardar (GAS.2, triaje del handoff "22 Formulario de Gasto")

- **Objetivo**          : que guardar un gasto deje una prueba visual (no solo accesible) de qué se guardó y, cuando existe, qué consecuencia tuvo (límite tocado, saldo restante). Origen: auditoría de Claude Design de la ficha 22, que asumía un toast visual ya existente en Gastos; no existía (ver hallazgo abajo).
- **Estado actual**     : **completa** (GAS.2a a 2c, 2026-08-10 y 11): el toast dice qué se guardó y su consecuencia ([ADR 060](../DECISIONS/060-lectura-cross-domain-de-solo-lectura.md), [ADR 062](../DECISIONS/062-toast-de-consecuencia-en-abono-y-aporte.md)); detalle en el CHANGELOG de agosto.
- **Verificado contra** : GAS.2c (2026-08-11).

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| Componente de toast genérico (cola, autocierre pausable, cierre manual) | `modules/ui/toast.js` | `mostrarToast({ titulo, detalle?, tono?, icono? })` | mismo patrón que el toast de logros (`dominio/logros/index.js`), copiado no importado: logros es privado de su dominio (ADN 10) |
| Primer consumidor | `modules/dominio/gastos/index.js` | `_guardarGasto()` | reemplaza al `announce()` que había ahí (mismo rol, `role="status"`); solo calcula la consecuencia en creación, no en edición |
| CSS del toast (3 tonos: ok/alerta/peligro) | `styles/components/nudges.css` | bloque "TOAST GENERICO (GAS.2a)" | reusa `@keyframes toastIn/toastOut` de `base.css` y `--fk-z-toast`; icono real del sprite (`i-check-circle`/`i-alert`), no emoji |
| Segunda línea, prioridad fija (excedido → alerta → saldo de cuenta → nada) | `modules/dominio/gastos/logic.js` | `consecuenciaDeGasto({ progreso, categoria, saldoCuenta, nombreCuenta, ocultarSaldo })` | pura, sin `S`; recibe el `progreso` ya calculado (ADR 060) |
| Lectura cross-domain del progreso del límite | `modules/dominio/gastos/index.js` | `_guardarGasto()`, import de `calcularProgreso` desde `../presupuesto/logic.js` | en `index.js`, no en `logic.js` (evita el ciclo con `presupuesto/logic.js`, que ya importa `gastosMes` de `gastos/logic.js`) |

**Hallazgo del handoff, corregido**: la ficha 22 de Claude Design daba por hecho un toast visual tras guardar; solo corría `announce()` (`sr-only`). GAS.2a construyó la pieza.

**Casos que la ficha no cubrió, resueltos en GAS.2b**:

| Caso | Cómo queda |
|---|---|
| Gasto repartido entre varias cuentas | sin cuenta única que nombrar; el aviso de límite (prioridad 1/2) sigue aplicando igual |
| Consumo con tarjeta (`consumoTC`) | no descuenta ninguna cuenta; mismo tratamiento que el repartido |
| Edición de un gasto existente | el toast queda en una línea ("Gasto actualizado"), sin recalcular consecuencia |
| Ojo de privacidad activo (`S.config.ocultarSaldo`) | ninguna cifra, ni de límite ni de saldo: corta antes de mirar el progreso |

**Riesgos**:

- **ADR 060 formaliza una lectura cross-domain que el código ya hacía en otros 3 sitios** (`presupuesto/logic.js`, `analisis/logic.js`, `analisis/view.js` leyendo de `gastos/logic.js`/`tesoreria/logic.js`), pero solo cubre "un `logic.js` puro importado por otro dominio". Si una tarjeta futura necesita leer de un `view.js` o `index.js` ajeno, ese ADR no lo habilita: es exactamente el acoplamiento que ADN 10 sigue prohibiendo.
- **ADR 059 no existe en el repositorio** pese a estar citado (BUG-027, cerrado el 2026-11-15).

**Cambios pendientes**: ninguno. Iniciativa GAS.2 completa.

**Cambios realizados**:

- 2026-08-11 (GAS.2c): la regla de confirmacion se generalizo a Abono (`compromisos/logic/abonos.js`, `consecuenciaDeAbono()`) y Aporte (`metas/logic.js`, `consecuenciaDeAporte()`), [ADR 062](../DECISIONS/062-toast-de-consecuencia-en-abono-y-aporte.md). Detalle y verificacion: `contexto/deudas.md` y `contexto/metas.md`.
- 2026-08-10 (GAS.2b): segunda línea del toast (`consecuenciaDeGasto()`), lectura cross-domain de `calcularProgreso()` ([ADR 060](../DECISIONS/060-lectura-cross-domain-de-solo-lectura.md)).
- 2026-08-10 (GAS.2a): toast genérico (`ui/toast.js`) y primera línea en `_guardarGasto()`.

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

**Criterio de agrupación** (`gastosFrecuentes`): categoría, monto redondeado a $1.000 y descripción normalizada; 3 o más veces en 60 días, máximo 4, por más repetido y más reciente. Excluye los gastos con `compromisoId` (los repite su dominio). El monto que ofrece el chip es el del registro más reciente, sin redondear (TX.12b).

**Decisión de diseño:** el chip de frecuente no prellena la nota (sería ambigua entre registros); "Repetir" de una fila sí, porque apunta a una fila concreta.

**Riesgos**:

- **`renderFormGasto({ sugerencias })` cambia de firma**: acepta un objeto de opciones en vez de ningún argumento. Todos los call-sites existentes (incluidos los de los tests) seguían funcionando sin cambios porque el parámetro tiene default vacío; cualquier caller nuevo que quiera ocultar los chips (modo edición, "Repetir") debe pasar `sugerencias: false` explícitamente.
- **El botón "Repetir" vive en Gastos, no en Movimientos**: MOV.1 delega `editar-gasto`/`eliminar-gasto` desde el ledger al dominio dueño, pero `repetir-gasto` no se sumó ahí (fuera de alcance de esta tarjeta). Si se pide "repetir" también desde el ledger, es una entrada más en `_ACCIONES_POR_TIPO` de `movimientos/logic.js`, sin lógica nueva.

**Cambios pendientes**: ninguno conocido para esta pieza.

**Cambios realizados**:

- 2026-07-27 (TX.12b): el chip frecuente ofrece el `monto` real del registro más reciente, no el redondeado a $1.000 que solo agrupa. SW v433.
- 2026-07-26 (DIS.4/G9 y G3): los chips bajan **debajo** del monto hero (el label pasa a "O repite un gasto frecuente") y `.gastos-frecuentes__lista` cambia el scroll horizontal oculto por `flex-wrap`. Ver CHANGELOG.
- 2026-07-23 (TX.12, patrón P2 de la auditoría de UX/producto): chips de frecuentes y "Repetir" en la fila. SW v414. Detalle en [2026-07](../changelog/2026-07.md).
