# Ficha de contexto: Gastos

> Revisado: 2026-11-22 (GAS.15f).

> Ver reglas de uso y plantilla en [`README.md`](README.md).

> El registro de un gasto (el formulario, la confirmación tras guardar y "Repetir") vive en [`gastos-registro.md`](gastos-registro.md), partida el 2026-11-19 (GAS.9a) por el techo de 40 KB.

---

## Gastos: la especificación integral (GAS.13, ADR 188)

- **Objetivo**          : el tablero "Gastos · Rediseño integral" ([ADR 188](../DECISIONS/188-gastos-especificacion-integral.md)): la especificación de componentes, estados y recorridos de Gastos y cuatro decisiones (áreas, ojo, repetir, dato para pagar).
- **Estado actual**     : completa. GAS.13a a 13h cerradas (D1 a D7). Queda la pose de Tino con el paraguas, que entrega Esteban (GAS.8).
- **Verificado contra** : GAS.13h (2026-11-21).

**Dónde vive**: el detalle de cada pieza está en los "Ajustes al aplicar" del [ADR 188](../DECISIONS/188-gastos-especificacion-integral.md) y en las entradas GAS.13a a 13h del CHANGELOG.

**Cambios realizados**:

- 2026-11-21 GAS.13a a 13h (ADR 188 D1 a D7): "Bus, taxi y apps" (v59), Repetir y la papelera, el dato de cada fijo, la cabecera con la lupa e insignias, el resumen del apartado, el paso a paso, el papel de la factura y las primeras veces. Cierra GAS.13.

---

## Revisión técnica de Gastos y el motor de deudas (GAS.14, ADR 189)

- **Objetivo**          : el pedido "Revisión técnica e implementación de mejoras en Gastos" ([ADR 189](../DECISIONS/189-revision-tecnica-de-gastos-y-motor-de-deudas.md)): corregir lo que falla en datos, vencimientos, totales y formularios de deudas, y un motor que recomiende cómo pagar las deudas sin inventar lo que no se sabe.
- **Estado actual**     : cerrada. GAS.14a a 14e (D1 a D5); los pendientes que deja están en el ADR 189, Consecuencias.
- **Verificado contra** : GAS.14e (2026-11-22).

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| La tasa al editar | `compromisos/views/formularios.js` | `vTasa`, `data-tasa` del abono | el campo es en %; se guarda en decimal |
| Las tasas reparadas | `modules/core/storage.js` | v59 a v60 | EA bajo 1 % y mensual bajo 0,1 % se multiplican por 100 (hasta tres veces) |
| El tope del abono y lo importado | `gastos/index.js`, `gastos/logic.js` | edición del gasto, `_restaurarGasto()`, `deltasPorEdicionEnDeuda()` | Deshacer devuelve el 4x1000 |
| Quincenal, semanal, reinicio y mes sin vencimiento | `modules/infra/vencimientos.js` | `_diasDelCiclo()`, `inicioDeVencimientos()`, `_pagosDelFijo()`, `coberturaDeVencimientos()`, `estadoDelFijoEnMes()` | `situacionDelFijo()` da el vencimiento real, el inicio y el último pago |
| Débito automático | `dominio/agenda/logic.js` | `debitosAutomaticosVencidos()` | fijos con alta: lo pendiente desde el más antiguo; sin alta, la ventana de antes |
| La hoja y el cambio de frecuencia | `compromisos/views/detalle.js`, `compromisos/index.js` | `cuandoCompromiso()`, `_fechasDelFijo()`, guardado del fijo | con pendientes no se deja; al día, `reinicio` = hoy |
| Los pagos de un compromiso | `movimientos/logic.js`, `movimientos/view.js`, `movimientos/index.js`, `compromisos/views/detalle.js` | `compromisoId` en la fila, `setFiltroCompromiso()`, `compromiso-ver-pagos` | la frase "Los pagos de X" dice el filtro (no tiene chip) |
| Lo archivado y "Solo una parte" | `compromisos/views/lista.js`, `views/hero.js`, `ui/bloque-gastos.js`, `presupuesto/index.js` | `resumenFijosDelMes()`, `htmlHeroDeudas()`, `partesDelMes()`, `presupuesto-ver-movimientos` | la tarjeta y la hoja cuentan lo mismo |
| La deuda con una persona | `compromisos/views/formularios.js`, `compromisos/logic/modelo.js`, `compromisos/index.js` | `renderFormCompromiso()`, `validarCompromiso()`, `normalizarCompromiso()`, `_wireToggleFiado()` | relación en vez de "con quién"; sin cuota, el día se salta |
| El motor | `compromisos/logic/motor-deudas.js` | `analizarDeudas()`, `inventarioDeudas()`, `deudasSimulables()`, `deudasUnibles()`, `capacidadDePago()`, `extraParaFrenar()`, `efectoAbonoUnico()` | puro; lo desconocido va a `faltantes`, no se inventa |
| Tu plan y la hoja | `compromisos/views/plan-salida.js`, `views/estrategia.js` | `analisisDelPlan()`, `htmlTuPlan()`, `htmlPlanSalida()`, `htmlEntradaPlanSalida()`, `renderEstrategiaPago()` | las cuentas solo con deudas de tasa y cuota conocidas |
| Juntar y el abono | `logic/estrategia.js`, `views/estrategia-impacto.js`, `compromisos/index.js` | `simularConsolidacion()` (costos), `renderConsolidar()`, `_aplicarConsolidacion()`, `_actualizarTipProyeccion()` | nunca une una personal sin interés; abono a plazo o a cuota |

**Cambios realizados**:

- 2026-11-22 GAS.14e (D5): un solo motor de deudas (qué falta, tres escenarios, una recomendación con su porqué y su estimado, alternativas); juntar ya no une deudas sin interés; el abono dice plazo o cuota.
- 2026-11-22 GAS.14d (D4): la deuda con una persona pregunta la relación y el nombre; sin cuota no exige día.
- 2026-11-21 GAS.14c (D3): Movimientos filtra los pagos de un fijo o una deuda; tarjeta y hoja de meses cuentan lo mismo; Límites respeta "Solo una parte".
- 2026-11-21 GAS.14b (D2): quincenal con dos fechas, nada antes del inicio, débito automático desde lo más antiguo, la hoja con el vencimiento real.
- 2026-11-21 GAS.14a (D1): la tasa ya no se divide al editar (v60 repara), el abono editado tiene tope, Deshacer devuelve el 4x1000.

---

## Las pantallas del lienzo "Gastos · Rediseño integral" (GAS.15, ADR 190)

- **Objetivo**          : las pantallas del lienzo "Gastos · Rediseño integral" que GAS.13 no tenía ([ADR 190](../DECISIONS/190-el-plan-de-deudas-del-lienzo.md)), página por página.
- **Estado actual**     : en curso. Páginas 8, 7, 6 y 3 cerradas; de la 5, la ficha del gasto y eliminar (GAS.15f); faltan la ficha del fijo (GAS.15g) y las páginas 4 y 9, en [`board/gastos.md`](../board/gastos.md).
- **Verificado contra** : GAS.15f (2026-11-22).

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| La hoja del plan | `compromisos/views/plan-salida.js` | `htmlPlanSalida()` (tres vistas), `eleccionDelPlan()`, `refrescarExtraPlan()` | las cifras son del motor (`analisisDelPlan()`) |
| Sus acciones | `compromisos/index.js`, `views/estrategia.js` | `aplicar-plan`, `plan-ver-comparar`, `plan-ver-como`, `plan-volver`, `plan-elegir-extra`; `vistaPlan`, `extraElegido`, `extraOtro` | CSS `.plan-*` en `identidad.css` |
| Los formularios de deudas | `compromisos/views/formularios.js`, `compromisos/index.js`, `logic/modelo.js` | `renderFormDeuda()` (`conTipo`), `_wireDeudaLienzo()`, `datosDeFormaPago()`, `nombreDeudaEntidad()`, `htmlFacturaQuienDeuda()` | [ADR 191](../DECISIONS/191-las-deudas-del-lienzo.md); el nombre sale de lo elegido |
| El motor de preguntas | `ui/preguntas.js` | `data-pasos-elegido`, `data-titulo-oculto`, `data-sin-teclado`, `[data-factura-quien]` | la factura de la deuda usa las líneas de la del fijo |
| La lista de Deudas | `compromisos/views/lista.js`, `views/hero.js`, `views/estrategia.js` | `tituloDeuda()`, `_metaDeuda()`, `_renderFilaInventario()`, `htmlHeroDeudas()` | ADR 191 D8; lee el nombre guardado |
| La hoja Resumen | `ui/resumen-apartado.js`, `ui/bloque-gastos.js`, `compromisos/views/lista.js` | `htmlGraficaResumen()`, `htmlCuerpo*()`, `deudaAlCierreDelMes()`, `filasResumenDelMes()` | [ADR 192](../DECISIONS/192-los-resumenes-del-lienzo.md) |
| El gasto del día a día | `gastos/telefono.js`, `gastos/view.js`, `infra/hormiga.js` | `fechaDelRecibo()`, `_pintarHormiga()`, `hormigaDelGasto()` | [ADR 193](../DECISIONS/193-el-gasto-del-lienzo.md) |
| La ficha y eliminar | `gastos/telefono.js`, `gastos/detalle.js`, `gastos/index.js`, `ui/confirm.js` | `_htmlFicha()`, `htmlSalidaFichaGasto()`, `_tarjetaEliminarGasto()`, `confirmar({ icono, tarjeta, apilado })` | [ADR 194](../DECISIONS/194-el-historial-del-lienzo.md) |

**Cambios realizados**:

- 2026-11-22 GAS.15f (D1 y D2): la ficha del gasto de la página 5: el nombre y la fecha arriba con la papelera; "Gasto registrado" y lo de hormiga en el papel; "¿Eliminar este gasto?" con la tarjeta del gasto.
- 2026-11-22 GAS.15e (D1 a D3): el gasto de la página 3: "¿Qué fue?" con la teja; Revisar con los pasos; el aviso de gasto hormiga.
- 2026-11-22 GAS.15d (D1 a D6): la hoja Resumen de la página 6: seis meses con su cifra; Día a día por categoría, Fijos por pago, Deudas al cierre, Límites en porcentaje.
- 2026-11-22 GAS.15c (D8): la lista de Deudas de la página 7: el tipo como título y la entidad debajo, las pestañas con cuánto, "Pagar" aparte.
- 2026-11-22 GAS.15b (D1 a D7): los formularios de deudas de la página 7: cuatro pasos por tipo, "¿Con quién es?" solo cuando no se sabe, la factura con la teja.
- 2026-11-22 GAS.15a (D1 a D4): la hoja del plan de la página 8: recomendación, comparar y cómo funciona; "Aplicar este plan" sube las cuotas.

---

## Cada pestaña con su cifra y cada vencimiento con su pago (GAS.12, ADR 187)

- **Objetivo**          : el pedido "Correcciones de cálculos y vencimientos" ([ADR 187](../DECISIONS/187-cada-pestana-con-su-cifra-y-cada-vencimiento-con-su-pago.md)): el resumen de cada pestaña habla solo de ella y cada vencimiento de un fijo se paga por separado.
- **Estado actual**     : completa. GAS.12a a 12d cerradas (D1 a D4).
- **Verificado contra** : GAS.12c y 12d (2026-11-20). Antes: GAS.12b (2026-11-20).

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| La hoja de meses de cada pestaña | `modules/ui/bloque-gastos.js` | `lenteDeLaHoja()`, `totalesDeLaLente()`, `_HOJA_DE_LA_LENTE` | la pestaña sale de la sección del botón y, en `sec-compromisos`, del hash |
| Lo pagado por mes a fijos o a deudas | `compromisos/logic/abonos.js` | `totalesPagadosDelAnio()` | sin `consumoTC`; un pago sin su compromiso se reconoce por la categoría interna |
| Lo gastado por mes en categorías con límite | `presupuesto/logic.js` | `totalesLimitesDelAnio()` | la misma cifra de la tarjeta (`resumenLimitesDelMes`) |
| Los vencimientos de un mes | `infra/vencimientos.js` | `vencimientosDelMes()`, `inicioDeVencimientos()` | sin los anteriores al alta; un quincenal trae dos |
| Fijos en un mes pasado | `compromisos/views/lista.js` | `_agruparPorUrgencia()`, `_faltaDelMes()`, `resumenFijosDelMes()` | sin vencimiento ese mes, el fijo no sale; "Pagaste" suma todos los pagos de fijos |
| Límites con lo de Día a día | `presupuesto/logic.js` | `_gastosDeLimites()` | `esDelDiaADia`: también en las categorías sin límite y en las partes |
| Cada pago salda un vencimiento | `infra/vencimientos.js` | `coberturaDeVencimientos()`, `vencimientosSinPagar()`, `vencimientosSinPagarDelMes()`, `estadoDelFijoEnMes()`, `vencimientoCubierto()` | un pago es un gasto o las partes con un `operacionId` (o, antes de MOV.3, `NOTA_PAGO_REPARTIDO` y el día); `Gasto.periodos` |
| Quién la usa | `compromisos/logic/alertas.js`, `logic/abonos.js`, `agenda/logic.js` | `pendientesDeObligacion()`, `estadoPagoMes()`, `compromisosProximos()`, `pendientesDePagoDelMes()` | las deudas siguen con la regla del ADR 183 D3 |
| El lote paga todos | `infra/estado-obligacion.js`, `compromisos/index.js`, `infra/pago-compromiso.js` | `pagosPendientesDelMes()` (`periodos`), `_confirmarLote()`, `aplicarPagosCompromisos()` | un gasto por pago con su `periodos`; con uno no se guarda |
| "Ya lo había pagado" | `compromisos/views/detalle.js`, `compromisos/index.js`, `infra/pago-compromiso.js` | `[data-action="fijo-ya-pagado"]`, `anotarPagadoPorFuera()`, `NOTA_PAGADO_POR_FUERA` | uno por toque, sin cuenta y con `sinEfectoSaldo`; el aviso trae "Deshacer" |
| La fecha del primer pago | `compromisos/views/formularios.js`, `compromisos/index.js`, `logic/modelo.js`, `infra/vencimientos.js` | `#gfijo-inicio` en `#gfijo-cuando`, `#gfijo-resumen-inicio` (`data-resumen-sub`), `fechaInicioValida()`, `_creacionLocal()`, `ocurrenciasEnMes()` | elegirla toca su día en la rejilla y sigue; `data-vacio` del campo de fecha (`ui/captura-telefono.js`) |
| Lo que dicen las vistas | `compromisos/views/lista.js`, `detalle.js`, `lote.js`, `agenda/listas.js`, `agenda/view.js`, `infra/notificaciones.js` | `_textoVencido()`, `cuandoCompromiso()`, `_rotuloDelMonto()`, `_subFilaLote()`, `htmlListasMes()`, `_pagadoEnElDia()` | la lista del Calendario recibe el mapa del lote |

**Riesgos**:

- **La lista de Fijos de escritorio es un inventario**, no un mes: sigue mostrando todos los fijos activos. Lo del mes vale para el teléfono (`_renderPorUrgencia`) y para la tarjeta.
- **Límites ya no lista "Gastos fijos" ni "Deudas" entre las categorías sin límite**: quien busque esa fila con su enlace a Fijos la encuentra solo para las retiradas del día a día (Vivienda, Servicios públicos).
- **Un pago de este mes puede saldar uno de julio**: `estadoPagoMes` de un fijo ya no es "hay un gasto en el mes". Quien pregunte si un fijo está pagado en un mes, que pregunte a `estadoPagoMes` o `vencimientoCubierto`, no busque gastos por fecha.
- **Las pruebas con fijos creados hace años y sin pagos** tienen vencimientos pendientes desde entonces: las semillas nacen en el ciclo del escenario o traen un pago por vencimiento.

**Cambios realizados**:

- 2026-11-20 GAS.12c y 12d (ADR 187 D3 y D4): "Ya lo había pagado" sin mover dinero y la fecha del primer pago. Cierra GAS.12.
- 2026-11-20 GAS.12b (ADR 187 D2): cada pago de un fijo salda el vencimiento más antiguo; lo vencido dice cuántos pagos y su suma en Fijos, la hoja, el lote, el Calendario e Inicio; el lote los paga todos.
- 2026-11-20 GAS.12a (ADR 187 D1): la hoja de meses de cada pestaña, Fijos en un mes con solo sus vencimientos, "Pagaste" con todos los pagos de fijos y Límites con lo de Día a día.

---

## Gastos móvil: cada lugar con una función (GAS.10, ADR 185)

- **Objetivo**          : el tablero "Finko · Gastos móvil, propuesta integral" ([ADR 185](../DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md)): Gastos registra y controla, Movimientos encuentra, Inicio avisa. Día a día, el registro de un gasto, las categorías, el gasto fijo y Deudas. Bajo 1024 px; Límites y Agregar cuenta no cambian.
- **Estado actual**     : completa. GAS.10a a 10g cerradas (D1 a D8); cierra GAS.9f.
- **Verificado contra** : GAS.10g (2026-11-19). Antes: GAS.10f (2026-11-19).

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| Las pestañas como primer renglón | `modules/ui/bloque-gastos.js` | `htmlBloqueGastos()` | solo la barra; el punto rojo de Fijos y Deudas es `pintarEstadoLente(..., true)` |
| El ojo de cada tarjeta | `gastos/view.js`, `compromisos/views/hero.js`, `presupuesto/view.js` | `.hero-gastos__ojo`, `_htmlOjo()`, `htmlOjoTarjeta()` | tapa su lente (ADR 166); el estilo, en el bloque "GAS.10" de `identidad.css` |
| La lupa de los filtros | `gastos/view.js`, `gastos/index.js` | `.filtros-bar__embudo`, acción `gastos-mas-filtros` | Movimientos con Gastos marcado y el foco en `#movimientos-buscar` |
| El complemento del día | `gastos/view.js` | `complementoDiaGastos()`, `.gastos-dia__extra` | solo en el teléfono (`plegar`) |
| La primera vez | `gastos/view.js` | `_renderDiaNuevo()`, `.dia-nuevo__tarjeta--fila`, `.tino-sol--libre` | Tino sin sol; la pista punteada solo sin fijos |
| Las áreas y lo que cambia de nombre | `modules/core/constants.js` | `AREAS_GASTO`, `RENOMBRES_CATEGORIA_GASTO`, `SUBCATEGORIAS_A_CARRO`, `SUBCATEGORIAS_UNIDAS` | las áreas solo ordenan la pantalla (GAS.10c) |
| La migración v58 | `modules/core/storage.js` | `_migrate()`, bloque `< 58` | gastos, límites (un límite de Transporte por partes se parte), lo aprendido de hormiga y las propias que chocan |
| Los íconos de una categoría propia de Gastos | `modules/core/constants.js` | `ICONOS_CATEGORIA_GASTO_PROPIA` | sin el carro ni la torta; metas, cuentas y fijos siguen con `ICONOS_CATEGORIA_PERSONALIZADA` |
| La categoría por áreas | `modules/dominio/gastos/telefono.js` | `_htmlCategoria()`, `.tejas__area`, `.tejas--sueltas` | orden fijo del tablero (sale `ordenarCategoriasPorUso` del teléfono); el tono va en `--teja-tono` |
| El detalle con la pregunta adentro | `modules/dominio/gastos/telefono.js` | `_htmlDetalle()`, `pintarDetalle()`, `colocarPregunta()`, `[data-caracter-casa]` | el `fieldset` de la pregunta se muda tras la opción elegida; sin opción vuelve a su casa |
| Sus estilos | `styles/components/captura.css` | bloque "GAS.10c" al final | la capa `captura` le gana a `identidad`: lo del formulario va acá |
| La factura del gasto | `modules/dominio/gastos/telefono.js` | `_htmlRecibo()`, `_pintarRecibo()`, `_pintarFilaDetalle()`, `#gasto-fila-nota` con `[data-fila-accion]` | sin el tipo de la cuenta; con dos del mismo banco, el nombre entero |
| Sus estilos | `styles/components/captura.css` | bloques "GAS.10d" y "GAS.15e" al final | acotado a `#form-gasto`; el papel redeclara los tonos de categoría del tema claro |
| El gasto fijo: qué es y la empresa | `modules/dominio/compromisos/views/formularios.js` | `_gruposPlataforma()` (`_GRUPO_MARCAS`), `#gfijo-sin-empresa` | las marcas van en el primer grupo de la categoría que las nombra |
| Sin empresa | `modules/dominio/compromisos/index.js`, `logic/modelo.js` | `_syncSinEmpresaGastoFijo()`, `nombreServicio` en `normalizarCompromiso()` | sin nombre escrito, el fijo se llama como la categoría |
| Cuándo | `modules/dominio/compromisos/views/formularios.js`, `index.js` | `FRECUENCIAS_OTRA_FIJO`, `[name="frecuenciaOtra"]`, `_syncFrecuenciaGastoFijo()` | en escritorio "Otra" sigue siendo el desplegable con las nueve |
| La factura del fijo | `modules/ui/preguntas.js` | `data-resumen-opcionales`, `[data-resumen-sub]`, `data-resumen-orden` en una parte | lo opcional en línea es opt-in: deudas, cuentas y metas siguen con "Agrega si quieres" |
| Deudas en el teléfono | `modules/dominio/compromisos/views/lista.js`, `hero.js`, `estrategia.js` | `_renderVacioDeudas()`, `_renderInventarioDeudas()`, `_metaDeuda()`, `htmlHeroDeudas()`, `htmlEntradaPlanSalida({ sugerencia })` | sus estilos, al final de `identidad.css` (bloque "GAS.10g") |

**Riesgos**:

- **El ojo tapa su lente, no las cuatro**: el tablero lo da por hecho; el ADR 185 D1 dice por qué no cambia.
- **Sin franja, lo vencido de Día a día solo está en el punto de la pestaña y en Inicio**: quien busque `gastos-vencido` o `gastos-ver-vencido`, ya no existen.
- **El carro y la torta siguen en `ICONOS_CATEGORIA_PERSONALIZADA`**: esa lista la comparten metas, cuentas y fijos y valida lo guardado; quitarlos rompía editar una meta con el carro.
- **El formulario de gasto se estiliza en `captura.css`, que es una capa por encima de `identidad.css`**: una regla de GAS.10 para `#form-gasto` puesta en `identidad.css` no aplica.

**Cambios realizados**:

- 2026-11-20 GAS.11b y 11d (ADR 186 D5 y D7): Café pregunta dentro de Tinto; Deudas la primera vez y la factura del fijo caben por la altura. Cierra GAS.11.
- 2026-11-19 GAS.10a a 10g (ADR 185 D1 a D8): pestañas arriba, categorías para Colombia (v58), registro por áreas, factura sin desplazar, el gasto fijo en pantallas sin títulos y Deudas. Detalle en el CHANGELOG.

---

## Gastos que cuadran (GAS.9, ADR 183)

- **Objetivo**          : el pedido de correcciones de Gastos ([ADR 183](../DECISIONS/183-gastos-que-cuadran.md)): la navegación sin la raya café, un resumen por pestaña, el vencimiento contado desde el último pago, la tarjeta nacida en Mis cuentas y la sugerencia de límite al registrar. Bajo 1024 px.
- **Estado actual**     : lógica completa: GAS.9a a 9e y 9g cerradas. El diseño de Claude Design (GAS.9f) es GAS.10 (ADR 185).
- **Verificado contra** : GAS.9g (2026-11-19). Antes: GAS.9e (2026-11-19).

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| La compacta de Día a día | `modules/dominio/gastos/view.js` | `_pintarCompacta()`, `_enlazarCompactaAlNavegar()` | apagada con la tarjeta en 0 y en cada `hashchange` |
| El resumen de cada pestaña | `gastos/logic.js`, `compromisos/views/hero.js`, `compromisos/views/lista.js` | `esDelDiaADia()`, `htmlHeroDeudas()`, `resumenFijosDelMes()`, `lentePorPagar()` | Día a día sin pagos de obligaciones; Fijos solo fijos; Deudas con lo pagado en el mes |
| El vencimiento desde el último pago | `compromisos/logic/alertas.js`, `infra/estado-obligacion.js`, `infra/avisos.js` | `pendientesDeObligacion()`, `vencidosSinPagar()`, `pagosPendientesDelMes()` | atraso desde la fecha pendiente más vieja; en una deuda el último pago cubre su mes y lo de antes (en un fijo, desde GAS.12b, cada pago salda la más vieja) |
| La tarjeta en Mis cuentas | `tesoreria/acciones/cuentas.js`, `tesoreria/views/cuentas.js`, `compromisos/views/formularios.js`, `compromisos/views/detalle.js` | `_agregarTarjeta()` (`tc-agregar`), `_renderTarjetaTC()`, `renderFormDeuda({ sinTarjeta })`, `htmlDetalleCompromiso()` | la única puerta es "Agregar cuenta"; la hoja de la tarjeta es la misma en las dos secciones |
| La sugerencia de límite al registrar | `presupuesto/logic.js`, `gastos/index.js` | `sugerenciaDeLimiteAlRegistrar()`, `_sugerirLimite()` | una vez por categoría y mes (`S.config.limiteSugerenciasVistas`), una al día |

**Riesgos**:

- **Un `IntersectionObserver` no avisa si el cruce no cambia**: con una sección que se oculta, mirar también el tamaño y volver a observar al navegar.
- **Un fijo de prueba sin pagos creado hace años sale vencido desde entonces**: las semillas nacen en el ciclo del escenario o traen su pago anterior.

**Cambios realizados**:

- 2026-11-19 GAS.9g (ADR 183 D4): la tarjeta con su nombre y su logo en Mis cuentas.
- 2026-11-19 GAS.9e (ADR 183 D5): Límites sugiere al registrar, una vez.
- 2026-11-19 GAS.9d (ADR 183 D4): la tarjeta nace y se administra en Mis cuentas.
- 2026-11-19 GAS.9c (ADR 183 D3): el vencimiento se cuenta desde el último pago.
- 2026-11-19 GAS.9b (ADR 183 D2): cada pestaña con su resumen; la segunda vuelve a ser Fijos.
- 2026-11-19 GAS.9a (ADR 183 D1): la compacta ya no asoma al cambiar de pestaña; pasa a bosque.

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
| El encabezado | `modules/ui/bloque-gastos.js` | `htmlBloqueGastos()` | desde GAS.10a, solo las pestañas (ADR 185 D1) |
| Bosque, filtros y riel | `styles/identidad.css` | bloque "GAS.8 (ADR 182)" | va al final: gana a los bloques GAS.4 y GAS.7 |
| La comparación, el reparto y las semanas (puras) | `modules/dominio/gastos/logic.js` | `comparacionDelMes()`, `repartoPorCategoria()`, `semanasDelMes()` | la comparación "a esta altura" corta el mes anterior en el día de hoy; las semanas van de lunes a domingo, recortadas al mes |
| La tarjeta de Día a día en el teléfono | `modules/dominio/gastos/view.js` | `_lecturaTelefono()`, `_comparacionTelefono()`, `_repartoTelefono()`, `_fichaLimite()` | el ojo tapa la barra; "Categorías ›" va a `#analisis` |
| La franja de alerta (roja y ámbar) | `styles/identidad.css` | `.franja-alerta`, `.franja-alerta--ambar` | la usa Límites; Día a día la dejó en GAS.10a |
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
| La hoja Resumen | `modules/ui/bloque-gastos.js`, `index.html` | `htmlHojaMeses()`, `primerMesFinko()`, `#modal-elegir-mes` | seis meses desde GAS.15d (ADR 192); `bloque-ir-mes` pasa por `navegarMesGastos` |
| El ojo de cada tarjeta | `modules/infra/privacidad.js` | `htmlOjoTarjeta()` | Día a día y Por pagar reusan el de su hero; Límites usa este |
| La tarjeta de Límites | `modules/dominio/presupuesto/view.js` | `_renderHeroLimites()`, `resumenLimitesDelMes()` (logic) | solo bajo 1024 px |

**Riesgos**:

- **Comparar `location.hash` con `'compromisos'` deja fuera las pestañas.** Lo que pregunta "¿estoy en Por pagar?" usa `seccionDelHash()`; lo que navega a Por pagar, `_irAPorPagar()` (en el teléfono va a la pestaña, no a `#compromisos`).
- **El chip sigue vivo debajo de la pestaña**: `setFiltroPorPagar` lo fija quien llega (`porPagar:ver-compromiso`) y `lentePorPagar()` lo lee para elegir pestaña; dentro de la pestaña no se ve.

**Cambios realizados**:

- 2026-11-19 FAC.1 (ADR 180): el recibo del gasto y el resumen de `ui/preguntas.js` son una factura (`ui/factura.js`); "Pagado con" desde GAS.15e.
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

- **La lista del mes cierra con una salida al historial completo** (2026-08-21, ficha 15, [ADR 089](../DECISIONS/089-movimientos-la-quinta-fuente-y-cuatro-puertas.md) D3). `_renderSalidaHistorial()` en `view.js` y la accion `gastos-ver-historial` en `index.js`, que emite `movimientos:ver` con el dominio y **sin rango**. Va al pie y por EventBus, sin import cruzado (ADN 10).
- **`renderFiltrosGastos()` normaliza el filtro ANTES de pintar el hero** (si la categoría activa desapareció del mes, resetea a "Todos"): si se reordena ese cuerpo, el hero puede calcular el total con un filtro fantasma.
- La franja `_renderResumen` y sus clases `.gastos-resumen*`, y la barra `.mes-nav*`, **ya no existen**; cualquier referencia externa que aparezca es código muerto.
- **`_renderGastoItem(gasto, oculto)` cambió de aridad en GAS.1b**: pasarla directa a `.map()` pondría el índice en `oculto` (ítems 1+ enmascarados siempre); el caller usa arrow explícita. Mantener así.
- El ink `--fk-dom-gastos-text` sobre el tinte 12% en tema claro mide **4.39:1** (bajo AA para texto pequeño): por eso el chip activo usa texto primario. No "corregir" el chip a texto naranja sin re-medir.
- **El label del hero nombra el mes visible, nunca "este mes" (DIS.4/G1, regla R10)**: la nav de mes vive dentro del mismo hero, así que un label fijo atribuía el total al mes equivocado en cuanto se tocaba "‹". Con filtro activo es `{categoría} en {mes}`: la categoría sin el mes también pierde información.
- **La grilla móvil de la fila de gasto es propia de la sección** (`responsive.css`, `@media (max-width: 539px)`, scope `.gastos-dia`), no la genérica de `.list-item:has(.list-item__meta)`. Dos trampas: la capa `responsive` le gana **por orden** a `components`, así que esta corrección NO funciona desde `domain.css`; y sus `grid-template-areas` tienen que ser rectangulares (un área en L invalida la declaración entera, en silencio).
- **La barra de filtros envuelve en escritorio y se desliza en el teléfono (GAS.4b, excepción de R9)**: el override de `#panel-filtros-gastos` en `domain.css` envuelve; el riel del teléfono vive en `identidad.css` (bloque GAS.4b). La base de `.filtros-bar` la comparten Movimientos y el asistente de distribución: no tocarla.
- **El tope de la navegación se calcula en `_mesTope()` sobre `S.gastos`** (mes corriente, o el del gasto más reciente si es posterior). Si alguna vez la sección deja de mostrar todos los gastos no internos, ese cálculo hay que revisarlo con ella o "›" quedará habilitado hacia meses vacíos.
- **`_renderEmptyState()` tiene dos textos, no uno**: en un mes que no es el corriente no ofrece registrar (el formulario abre con la fecha de HOY y el gasto caería en otro mes), sino volver. Agregar un CTA de registro ahí reabre el hallazgo H8.
- **El vacío del mes corriente (GAS.3, ADR 156 D2; GAS.5a, ADR 161 D1):** en escritorio Tino explica y el registro es el primario del encabezado; en el teléfono, desde GAS.8c (ADR 182 D3), es `_renderDiaNuevo()` con su propio botón y las cuatro tejas (el halo del botón central salió).

**Cambios realizados**:

- 2026-11-17 SAL.1: sale `tino-anota.svg` (compuesto, no es arte de Esteban); el vacío vuelve a `explica` hasta su SVG.
- 2026-11-17 GAS.5a ([ADR 161](../DECISIONS/161-dia-a-dia-tino-anota-sin-flecha.md) D1): el vacío de Día a día trae a Tino anotando en una libreta y deja la flecha punteada; el halo del botón central se queda.
- 2026-11-16 GAS.4b (ADR 157 D4-D6): el total con el "$" chico y el comparativo blanco; sale "+ $X en fijos y deudas"; las categorías en un riel deslizable de más a menos gasto, sin "+N".
- 2026-11-16 GAS.4a (ADR 157 D1): la cabecera del bloque en una fila; registrar es el botón central.
- 2026-11-15 (SUS.1b, ADR 146 D5): el chip "Gastos hormiga" sale de `CATEGORIAS_GASTO_USUARIO`; hormiga es lo que Finko reconoce.
- 2026-11-15 SUS.2d: la hoja y la ficha del gasto dicen si su concepto es gusto o necesidad y dejan corregirlo (`htmlCaracterGasto`, acción `gasto-caracter`).
- 2026-11-15 SUS.2c (ADR 147 D1): lo que "depende" y se repite se pregunta (`preguntaHormiga`); la respuesta va a `S.config.hormiga.conceptos` (v53).
- 2026-11-06 (ADR 132 tanda 4): "Nuevo gasto" pregunta en frase ("¿Cuánto gastaste?"); la cuenta se pliega con "Cambiar".
- 2026-11-05 (ADR 132 tanda 1): mes sin cajas, chips con las tres categorías de más gasto, días "Martes 10", fila con la nota arriba, historial como enlace y vacío con su botón dentro del banner.
- 2026-07-14 a 2026-11-04: GAS.1a a 1c (ADR 039), ficha 07 (ADR 069 D8), DIS.4, APR.3e (Familia y `gasto:registrar`), MV2.1 (ADR 098) y MV2.3 (ADR 119 D2 y 122 D5): detalle en el CHANGELOG de cada mes ([`changelog/`](../changelog/)).

---

