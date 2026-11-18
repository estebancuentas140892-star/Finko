# Ficha de contexto: Por pagar (antes Deudas)

> Revisado: 2026-11-18 (AVC.1c).

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## La sección "Por pagar": los tres tipos juntos (ficha 05, [ADR 069](../DECISIONS/069-bloque-gastos-en-la-barra-movil.md))

- **Objetivo**          : `compromisos` tiene tres tipos desde v6 (`fijo`, `deuda-entidad`, `deuda-personal`) pero solo administraba dos: los gastos fijos se creaban y editaban desde Calendario, y la propia lista lo decía ("Los gastos fijos se gestionan desde Agenda"). Responder "¿qué tengo que pagar este mes?" costaba dos secciones que la barra no relacionaba. La ficha 05 le devuelve el dominio completo a su dueña.
- **Estado actual**     : **cerrada el 2026-08-18**. **DSK.4 (2026-08-18, [ADR 073](../DECISIONS/073-deudas-inventario-con-su-herramienta-al-lado.md)) le da composición de escritorio desde 1440px**: lista en `span 8` y estrategia en `span 4` pegajosa con tope de alto; detalle en el ADR. **Desde el 2026-11-03, bajo 1024px, la lista va por urgencia y en filas** ([ADR 117](../DECISIONS/117-por-pagar-por-urgencia-y-en-filas.md)). La sección se llama "Por pagar" (título, nav de escritorio, banner de propósito), lista fijos y deudas en dos grupos, y es la única entrada para crear cualquiera de los tres tipos. Hereda del Calendario el **alta/edición de gasto fijo** y el **pago en lote** (CAL.5a/CAL.5b). **Desde el 2026-08-20 la lista abre con los cuatro chips de la ficha 05** (`Todo · Fijos · Deudas · Pagado`), que esa ficha especificó y dejó sin construir y que levantó el [ADR 080](../DECISIONS/080-mis-cuentas-un-primario-y-lo-informativo-al-pie.md) D6 porque su D5 los necesitaba: el chip es un `let` de `views/lista.js` con `setFiltroPorPagar()`/`getFiltroPorPagar()` exportados (mismo patrón que los filtros de Movimientos), no se persiste y un recargado vuelve a "Todo". Sin nada registrado no hay chips. La lente atiende `porPagar:ver-compromiso` (ficha 08; antes `porPagar:ver-deuda`): llegan prefiltrados la tarjeta de crédito de Mis cuentas y cada fila del detalle del día del Calendario, y **el chip lo elige esta lente, no el emisor**. **Desde el 2026-08-21 la lista obedece el reloj del bloque** (`prefijoMesBloque()`): el chip "Pagado", el estado de cada fila y el `data-mes` del botón hablan del mes que se muestra, y eso es lo que dejó al Calendario salir de la administración sin perder el pago de un mes pasado (BUG-015).
- **Verificado contra** : SUS.1a (2026-11-15). Antes: ADR 132 tanda 5 (2026-11-06). Antes: tanda 2 (2026-11-06). Antes: MV2.3 tanda 2 (2026-11-03, [ADR 117](../DECISIONS/117-por-pagar-por-urgencia-y-en-filas.md)), HF.0d (2026-10-17), ficha 08 de la auditoría móvil, commit `ace1a45` (2026-08-21). Antes: ficha 06 (2026-08-20, ADR 080 D6, los chips). Antes: DSK.4 (2026-08-18, sus dos rebanadas). Antes: ficha 05 de la auditoría móvil (2026-08-18).

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| Lista de los dos grupos ("Tus gastos fijos", "Tus deudas") | `modules/dominio/compromisos/views/lista.js` | `renderListaCompromisos()`, `_renderGrupoFijos()`, `_renderGrupoDeudas()` | un grupo no se pinta si está vacío; el empty state general cubre los tres tipos |
| En el teléfono: por urgencia y en filas (ADR 117), con el círculo del pago (ADR 132 D7) | `modules/dominio/compromisos/views/lista.js` | `_renderPorUrgencia()`, `_renderFila()`, `_montosVencidos()`, `tejaCompromiso()` | bajo 1024px; el pie del primer grupo ("Pagos vencidos", "Pagos pendientes"...) es la puerta del lote y `#lote-compromisos` se oculta; el círculo dispara `agenda-marcar-pagado-fijo` o `abrir-abono`; la línea "Toca el círculo" sale solo hasta el primer pago (VIS.1b, ADR 168 D5) |
| La hoja del plan de salida en el teléfono (ADR 132 D10) | `modules/dominio/compromisos/views/plan-salida.js` | `htmlPlanSalida()`, `resultadoExtra()`, `refrescarExtraPlan()` | `renderEstrategiaPago()` la pinta bajo 1024px con dos deudas o más; reusa `elegir-estrategia`, `cambiar-extra-remedio`, `aplicar-aumento-cuota` y `elegir-alternativa` (con `data-plegable` se abre y se cierra) |
| La hoja de un pago (ADR 132 D7) | `modules/dominio/compromisos/views/detalle.js` + `compromisos/index.js` | `htmlDetalleCompromiso()`, `cuandoCompromiso()`, `textoTasa()`, acción `compromiso-detalle` | se arma con el compromiso, no con la fila; sus botones viajan por `registrar-abrir` |
| Tarjeta de gasto fijo | `modules/dominio/compromisos/views/lista.js` | `_renderFijoItem()` | más simple que la de deuda: sin saldo, sin tasa, sin orden de estrategia |
| Chip de vencimiento (lo vencido de este mes antes que el próximo pago) | `modules/dominio/compromisos/views/lista.js` | `_chipVencimiento()`, `_atrasoPorId()` | lo usan las DOS tarjetas; el conjunto sale de `vencidosSinPagar` |
| Chooser de tipo ("¿Qué quieres agregar?") | `index.html` + `modules/dominio/compromisos/index.js` | `#modal-compromiso-tipo`, `_elegirTipoNuevo()`, `_elegirTipoNuevoIr()` | un solo "+ Agregar" en el encabezado; cada chip abre su modal |
| Alta/edición de gasto fijo (mudado de Agenda) | `modules/dominio/compromisos/index.js` | `_nuevoGastoFijo()`, `_editarGastoFijo()`, `_inyectarFormGastoFijo()`, `_guardarGastoFijo()` | acciones `nuevo-gasto-fijo` y `agenda-editar-fijo`; eliminar reusa `_eliminarCompromiso` |
| Formulario de gasto fijo (FORM.1c; orden de [ADR 141](../DECISIONS/141-el-gasto-fijo-empieza-por-el-monto.md)) | `modules/dominio/compromisos/views/formularios.js` + `compromisos/index.js` | `renderFormGastoFijo()`, `FRECUENCIAS_CHIP_FIJO`, `_syncFrecuenciaGastoFijo()`, `_syncCategoriaGastoFijo()` (muda el campo de texto) | monto, qué es, cada cuánto, qué día y "Más opciones" |
| Selector de plataforma del fijo (SUS.1a, [ADR 146](../DECISIONS/146-finko-reconoce-el-tipo-de-gasto.md) D2 a D4) | `compromisos/views/formularios.js`, `compromisos/index.js`, `logic/modelo.js`, `infra/marcas.js` | `_gruposPlataforma()`, `_syncCategoriaGastoFijo()`, `_rotularQueEsGastoFijo()`, `normalizarCompromiso()`, `marcasDeCategoriaAgenda()` | un `<fieldset>` por categoría de `TAGS_CATEGORIA_AGENDA`, oculto y `disabled` salvo el elegido; con plataforma el fijo se llama como ella y guarda `marcaId` (v51) |
| Pago en lote: tarjeta y modal | `modules/dominio/compromisos/views/lote.js` | `renderLoteCard()`, `renderFormPagoLote()` | acciones `compromisos-pagar-lote` / `compromisos-confirmar-lote` |
| Pago en lote: handlers | `modules/dominio/compromisos/index.js` | `_abrirLote()`, `_pagarLote()`, `_actualizarTotalLote()`, `_confirmarLote()`, `_pendientesDelMes()` | siempre el mes en curso: esta sección no navega meses |
| Escritura de los pagos (compartida con "Marcar pagado" de Agenda) | `modules/infra/pago-compromiso.js` | `aplicarPagosCompromisos()`, `fechaPagoDelMes()` | subieron a infra en esta ficha; antes eran privadas de `agenda/index.js` |
| Slot de la tarjeta de lote | `index.html` | `#lote-compromisos` | entre el hero y la card de estrategia |

**Decisiones de la ficha**

- **El alta es un chooser de tres chips, no un formulario único.** Un fijo no tiene tasa ni saldo total y una deuda no tiene monto recurrente: forzarlos en un solo form obligaba a esconder la mitad de los campos según un segmented. El chooser cuesta un toque y deja los dos formularios intactos (FD6 se conserva: un solo verbo, un solo botón de entrada).
- **La acción de editar un fijo conserva su nombre viejo (`agenda-editar-fijo`).** Renombrarla obligaba a tocar el detalle del día del Calendario, sus tests E2E y los unitarios, sin cambiar nada para el usuario. El prefijo quedó como cicatriz del origen, no como indicio de dueño: quien la registra es `compromisos/index.js`.
- **El motor `pendientesDePagoDelMes` se quedó en `agenda/logic.js`.** Mudarlo arrastraba `eventosDelMes` y las reglas de frecuencia, que son el calendario entero. `compromisos/index.js` lo importa como lectura cross-domain de un `logic.js` puro ([ADR 060](../DECISIONS/060-lectura-cross-domain-de-solo-lectura.md)).
- **`lote:abrir` se retiró.** Existía porque el emisor (compromisos, desde el panel de Inicio) y el dueño del lote (agenda) eran dominios distintos y ADN 10 prohíbe el import. Con los dos del mismo lado, `inicio-pagar-lote` llama a `_abrirLote()` directo.

**Riesgos**:

- **El orden de `MARCAS` decide qué marca resuelve un texto** (SUS.1a): una plataforma de nombre compuesto va antes que su genérica ("YouTube Music" antes que YouTube). El selector depende de que el nombre de cada marca resuelva a sí misma, porque las tejas siguen saliendo por texto; `marcas.test.js` lo recorre.
- **Un solo conjunto para todo lo que se paga junto (OB.1, [ADR 151](../DECISIONS/151-el-estado-de-una-obligacion-se-decide-una-vez.md)).** `pagosPendientesDelMes` (`infra/estado-obligacion.js`) es la intersección de `vencidosSinPagar` (QUÉ está pendiente: la fuente de la pastilla, descarta lo creado después de su día de pago) con `pendientesDePagoDelMes` (CUÁNTO: resta el abono parcial y topa la cuota al saldo), con el estado de cada pago. La leen el lote (`_pendientesDelMes`), `_montosVencidos` de `lista.js`, el panel de Inicio, la banda del Calendario y el motor de avisos: antes eran cuatro copias de la misma cuenta. Lo que la pastilla cuenta y el conjunto no trae es una deuda sin cuota: no hay nada que pagar en lote.
- **El chip de vencimiento cambió de criterio para las deudas también, no solo para los fijos**: antes `_renderCompromisoItem` afirmaba "Vence en 21 días" sobre una cuota que venció el 8 y seguía impaga. Es una revisión del chip de urgencia de D.16d ([ADR 036](../DECISIONS/036-deudas-v2-visual.md) D5) que conserva su anatomía y sus clases: cambia lo que dice, no cómo se ve.
- **`_atrasoPorId()` se calcula una vez por render y baja por parámetro a cada tarjeta.** `_renderCompromisoItem` tiene un default que lo recalcula para no romper a un caller suelto; si alguien renderiza tarjetas en un bucle sin pasarlo, paga un `vencidosSinPagar` por tarjeta.
- **El botón `#compromisos-nueva-deuda` del encabezado ya no existe** (lo reemplaza el del chooser, sin id) y con él se fue `_toggleBotonNuevaDeuda()`: la regla FD6 de ocultarlo con la lista vacía dejó de aplicar porque el botón nuevo sirve para los tres tipos y siempre tiene algo que ofrecer. Un selector `#compromisos-nueva-deuda` devuelve `null`.

**Cambios realizados**:

- 2026-11-16 OB.1 ([ADR 151](../DECISIONS/151-el-estado-de-una-obligacion-se-decide-una-vez.md)): el lote, "Por pagar" y sus textos leen `pagosPendientesDelMes` y `textoEstadoObligacion`; `marcaDeGasto` hereda la plataforma del fijo por `compromisoId` (desde OB.1b vive en `infra/fila-pago.js`, con la regla de la teja, `marcaDePago`).
- 2026-11-15 SUS.1a: el gasto fijo elige su plataforma (Streaming, Suscripciones, Telefonía, Internet) y guarda `marcaId` (ADR 146).
- 2026-11-15 FORM.2h: la tasa muy alta avisa en ámbar y se guarda (`avisoTasaAlta`, `TASA_MUY_ALTA`, `TASA_IMPOSIBLE`); la ⓘ de la tasa abre a Tino (ADR 142 D9 y D10).
- 2026-11-13 a 2026-11-14: 4 hitos resumidos el 2026-11-18 para que la ficha quepa en su techo (FORM.2e, REV.2b con ADR 141, REV.2a con ADR 140, REV.1 con ADR 137). Detalle en [2026-11](../changelog/2026-11.md) y el [CHANGELOG](../CHANGELOG.md).
- 2026-11-04 a 2026-11-06: 3 hitos resumidos el 2026-11-18 para que la ficha quepa en su techo (MV2.3 tanda 4, ADR 132 tandas 2 y 5: el plan de salida en hoja, los grupos en frase y el círculo del pago). Detalle en [2026-11](../changelog/2026-11.md).
- 2026-08-18 a 2026-11-03: 5 hitos resumidos el 2026-11-18 para que la ficha quepa en su techo (dos de agosto, MOV.1 ficha 08, HF.0d y MV2.3 tanda 2). Detalle en [2026-08](../changelog/2026-08.md), [2026-10](../changelog/2026-10.md) y el [CHANGELOG](../CHANGELOG.md).

---

## Registro de deudas (dominio `compromisos`, tipo `deuda-entidad`/`deuda-personal`)

- **Objetivo**          : registrar deudas con entidad (banco, tarjeta) o personales (familia, fiado, gota a gota), simular estrategias de pago (Avalancha, Bola de nieve, cuota fija), registrar abonos que descuentan `saldoTotal` y sincronizan la cuenta de origen del pago, y detectar cuándo una cuota no alcanza a cubrir el interés mensual. Comparte el dominio `compromisos` con los gastos fijos (tipo `fijo`, que desde la ficha 05 también se administran acá, ver el bloque de arriba): mismo schema `Compromiso`, tres tipos posibles (`fijo`, `deuda-entidad`, `deuda-personal`).
- **Estado actual**     : estable. **FORM.1b CERRADA (2026-07-15)**: el form de deuda adopta el lenguaje de Formularios v2 ([ADR 042](../DECISIONS/042-formularios-v2-visual.md)); ver bloque "Formulario de deuda (FORM.1b)" abajo, cierra la iniciativa FORM.1. **Iniciativa "Deudas v2: de registro a asesor" (brief 2026-07-08) CERRADA COMPLETA el 2026-07-13** (todas sus rebanadas D.15a-e y el rediseño visual D.16a-d). **D.14** (2026-07-10) agrega la acreditación opcional de la cuenta de origen al crear una deuda. **BUG-011 corregido** (2026-07-11): el extra tecleado en "Aumenta tu cuota" ya no reestructura la card de estrategia en el siguiente re-render (ver riesgo "estado UI simulado" abajo). **Rediseño visual D.16 ([ADR 036](../DECISIONS/036-deudas-v2-visual.md)) CERRADO el 2026-07-12** (hero, picker/comparativa, acelerador/panel en 2 capas, tarjeta de deuda). **D.15d (motor + vista de palancas) y D.15b (editar deuda + reorden del form) CERRADAS el 2026-07-13** (ver "Deudas v2 (D.15, diseño)" abajo para el detalle del motor). **D.15a CERRADA (2026-07-13)**: copy motivador en las simulaciones de orden, en las 3 palancas y en Abonar (detalle en el CHANGELOG de julio). Sin cambios de lógica de negocio.
- **Verificado contra** : HF.0e (2026-10-17, alta y antigüedad de la deuda en hora local). Antes: DIS.2 (2026-07-25), FORM.1b (2026-07-15) y D.15 (2026-07-13); el resto, en git.

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| API pública, handlers de acción, wiring de formularios | `modules/dominio/compromisos/index.js` | `_guardarCompromiso()`, `_editarCompromiso()`, `_nuevoCompromiso()`, `_mostrarFormDeuda()`, `_elegirTipoDeuda()` | `_mostrarFormDeuda()` (FORM.1b) es el único punto de montaje del form: lo llaman crear, cambiar de tipo (segmented) y editar |
| Toggle Fiado (D.13, oculta cuota/tasa/frecuencia) | `modules/dominio/compromisos/index.js` | `_wireToggleFiado()` | escucha `change` delegado en el form (chips de categoría, no un `<select>`) |
| Ícono "Otra"/"Otro" (CAT.2d) | `modules/dominio/compromisos/index.js` | `_wireIconoOtraCategoria()` | ídem, delegado |
| Disclosure "Condiciones del crédito" (FORM.1b) | `modules/dominio/compromisos/index.js` | `_wireCondicionesColapsable()` | toggle local de `aria-expanded` + `panel.hidden`, sin action global |
| Toggle cuenta de origen (D.14) | `modules/dominio/compromisos/index.js` | `_wireToggleOrigen()` | ~210 |
| Tip en vivo de refuerzo psicológico en Abonar (D.15a) | `modules/dominio/compromisos/index.js` | `_actualizarTipProyeccion()` | ~434 |
| Acreditar/revertir saldo de cuenta (D.14, espejo de `tesoreria/acciones/ingresos.js`) | `modules/dominio/compromisos/index.js` | `_ajustarSaldoCuenta()` | ~67 |
| Validación del formulario de compromiso | `modules/dominio/compromisos/logic/modelo.js` | `validarCompromiso()` | ~211 |
| Normalización (form crudo → shape de `S.compromisos`) | `modules/dominio/compromisos/logic/modelo.js` | `normalizarCompromiso()` | ~346 |
| Alerta de deuda creciente (cuota no cubre interés) | `modules/dominio/compromisos/logic/modelo.js` | `detectarDeudaCreciente()` | ~301 |
| Aritmética de abonos (ADR 002: abono descuenta cuenta + `saldoTotal`) | `modules/dominio/compromisos/logic/abonos.js` | `aplicarAbonoASaldo()`, `revertirAbonoDeSaldo()`, `ajustarMontoAbono()`, `validarAbono()` | |
| Simulación de estrategias (Avalancha, Bola de nieve, consolidación, renegociación) | `modules/dominio/compromisos/logic.js` (barrel) | `filtrarDeudasPagables()`, `compararEstrategias()`, `simularRenegociacion()`, `simularConsolidacion()`, `repartirExtraEnCuotas()` | |
| Motor de recomendación de palanca (D.15d, Aumentar/Renegociar/Consolidar) | `modules/dominio/compromisos/logic/estrategia.js` | `recomendarPalanca(deudas, { ingresoMensual, fijosMensuales })`, `_ordenarPalancas()`, `_razonPalanca()` | |
| Sección de palancas en la vista (D.15d-2, siempre visible: intro + tiles + herramienta) | `modules/dominio/compromisos/views/estrategia.js` | `_renderPalancas()`, `_renderPalancaTile()`, `_renderContenidoAlternativa()`, `_renderRemedioExtra()` | |
| Estimación de ingreso mensual (capacidad de pago; D.15d la sacó de `tesoreria`) | `modules/infra/financiero.js` | `estimarSalarioMensual()` | |
| Fijos mensuales para la capacidad (suma compromisos tipo 'fijo') | `modules/dominio/compromisos/logic/modelo.js` | `calcularFijosMensuales()` | |
| Form de deuda v2, segmented inline + chips + monto hero + disclosure (FORM.1b) | `modules/dominio/compromisos/views/formularios.js` | `renderFormDeuda(tipo, deuda)` | el chooser de dos pasos se retiró: el segmented vive dentro de este mismo render, solo al crear |
| Form de abono | `modules/dominio/compromisos/views/formularios.js` | `renderFormAbono()` | |
| Composición de escritorio: rejilla de la sección, estrategia pegajosa, banda del total y estado sin deudas (DSK.4a, ADR 073 D1/D2/D4) | `styles/responsive.css` | bloque "POR PAGAR EN ESCRITORIO" | desde 1440px; coloca por id los bloques que la sección ya tiene, sin envoltorios ni cambios de DOM |
| Tarjeta de deuda a dos renglones y botón dimensionado (DSK.4b, ADR 073 D3) | `styles/responsive.css` | bloque "TARJETA DE DEUDA EN ESCRITORIO" | desde 1440px; rejilla con filas declaradas a mano porque el aviso de tasa se emite entre chips y acciones |
| Hero "Te falta pagar este mes" (ADR 140, que ajusta el 036 D1) | `modules/dominio/compromisos/views/hero.js` | `renderHeroCompromisos()`; la cifra sale de `faltaPorPagarDelMes()` en `views/lista.js`, el saldo de abajo de `resumenDeudas()` | |
| Lista de deudas activas + trigger de editar (D.15b) | `modules/dominio/compromisos/views/lista.js` | `renderListaCompromisos()`, `_renderCompromisoItem()` | |
| Panel de estrategia de pago (arriba, define orden de pago) | `modules/dominio/compromisos/views/estrategia.js` | `renderEstrategiaPago()` | |
| Paneles de dashboard (vencidos, prioridades, Inicio) | `modules/dominio/compromisos/views/dashboard.js` | `renderPanelVencidos()`, `renderPanelPrioridades()` | |
| Selector de cuenta embebido en form (reutilizado por D.14); abre en la cuenta del último abono (HF.2a) | `modules/infra/cuenta-helper.js` | `renderSelectorCuenta()`, `cuentaHabitualDe()` | |
| Schema de la deuda | `modules/core/state.js` | `@typedef Compromiso` | ~90 |

**Recursos**: estilos en `styles/components/*.css` (buscar por clase `.comp-*`/`.cuenta-sel__*`); catálogos `CATEGORIAS_DEUDA` (producto, entidad) y `CATEGORIAS_DEUDA_PERSONAL` (relación, D.10) en `core/constants.js`; iconos vía `tejaCategoria`/sprite (`icons.js`).

**Dependencias y relaciones**: `compromisos` no importa de `tesoreria` (ADN 10), pero D.14 y los abonos (ADR 002) sí llaman `editar('cuentas', ...)` vía `infra/crud.js` para mover saldo, exactamente el mismo patrón que usa `tesoreria/acciones/ingresos.js` para ingresos puntuales (no hay import cruzado de dominio, solo de `infra/`). `EventBus.on('distribucion:aplicar', ...)` conecta compromisos con el asistente de distribución de Mis Cuentas (evento, no import directo).

**Riesgos**:

- **D.14 y abonos son dos crédito/débito independientes sobre la misma cuenta**: si el usuario acredita $1.000.000 al crear la deuda y luego paga abonos desde la MISMA cuenta, son dos movimientos de saldo distintos y correctos (uno de entrada al crear, otros de salida al abonar); no hay doble conteo porque cada uno ajusta el saldo una sola vez.
- **`montoAcreditado` es inmutable a propósito**: guarda el monto exacto acreditado al crear (copia de `saldoTotal` en ese momento), NO el `saldoTotal` actual. Si se usara `saldoTotal` actual para revertir al eliminar, una deuda con abonos ya pagados revertiría de menos (el saldo bajó por los abonos, que ya movieron su propia cuenta de origen por separado). Nunca leer `montoAcreditado` como "lo que falta pagar": para eso está `saldoTotal`.
- **El bloque de cuenta de origen solo aparece al crear, nunca al editar**: evita re-acreditar la misma deuda dos veces. Si en el futuro se permite cambiar `cuentaOrigenId` desde edición, hay que decidir explícitamente la semántica de saldo (revertir de la cuenta vieja + acreditar la nueva), no está implementado.
- **Migración**: `cuentaOrigenId`/`montoAcreditado` son campos opcionales nuevos, sin bump de `SCHEMA_VERSION`: los registros existentes simplemente no los tienen (`undefined`), equivalente semánticamente a "no aplica". No requieren backfill porque ningún código lee esos campos asumiendo que siempre existen (siempre se comprueba con `if (compromiso.cuentaOrigenId)`).
- **La lista lee `S.gastos`, no solo `S.compromisos` (DIS.2)**: para fechar el saldado, `_renderCompromisoItem` llama `fechaUltimoAbono(S.gastos, id)`. Un abono es un `Gasto` con `compromisoId` (ADR 002), así que la fecha es la del último abono, no un campo del schema: **no existe `fechaSaldado`** y no hace falta uno. Si una deuda llega a cero editando el saldo a mano, no hay abono y el subtítulo dice "Sin saldo pendiente". Nunca leer esa fecha como "cuándo se archivó".
- **El botón del encabezado lo apaga la lista (DIS.2, FD6)**: `renderListaCompromisos()` toca `#compromisos-nueva-deuda`, que vive en `index.html` fuera de su contenedor. Es deliberado (es la misma sección y el mismo render), pero cualquier test o flujo que haga clic en `[data-action="nuevo-compromiso"]` con la lista vacía resuelve dos elementos y el primero está `hidden`: hay que apuntar a `.empty-state [data-action="nuevo-compromiso"]`.
- **Estado UI simulado vs estructura de la card (lección de BUG-011)**: los inputs de simulación del panel de estrategia (`cambiar-extra-remedio`, `cambiar-renegociar-tasa`, `cambiar-consolidar`) commitean su valor a `_uiEstrategia` en cada tecla A PROPÓSITO (para que el clic en "Aplicar" no compita con un re-render por blur). La contrapartida obligatoria: `renderEstrategiaPago()` decide la ESTRUCTURA de la card (recomendación, detalle, bloque viable/inviable) solo con los datos registrados (`recomendarEstrategia(deudas, 0)`); el extra simulado alimenta únicamente el resumen comparativo dentro de su bloque. Si una futura refactorización (D.15) vuelve a pasar el extra simulado a la decisión estructural, el panel de alternativas desaparecerá al cambiar de pestaña y la card presentará la simulación como aplicada. Tests de regresión: describe "BUG-011" en `tests/unit/compromisos.test.js` + suite "BUG-011" en `tests/e2e/estrategia-pago.test.js`.

**Cambios pendientes**: **dos decisiones abiertas de la auditoría de diseño (DIS.2, 2026-07-25)**, que no se implementan sin la palabra de Esteban:

- **VD1: plegar el detalle del plan (hallazgo D2).** La lista de deudas empieza a 1.719px del tope (2,04 pantallas de 844px con 3 deudas): la card de estrategia mide 1.417px. La propuesta pliega el detalle de orden ("Por qué te conviene" + "Tu impacto" + "¿Cómo elegir?") en un desplegable "Ver el detalle del plan" y deja visibles el picker y las tres palancas; la lista subiría a ~1.050px. **Revisa la jerarquía del [ADR 011](../DECISIONS/011-unificacion-simulador-deudas.md) rev D.7 y roza la decisión de D.15d-2 de tener las palancas siempre visibles** (regla 2.7). Archivo: `views/estrategia.js`.
- **D10: CSS muerto del acelerador plegable.** `.estrategia-card__acelerador`, `-summary` y `-body` (~35 líneas en `charts.css`) quedaron sin consumidor cuando D.15d-2 retiró `_renderAceleradorExtra`. Es **una** decisión, no dos tareas: si VD1 se aprueba, ese CSS pasa a ser el desplegable del detalle; si no, se borra.

Fuera de esas dos, la iniciativa "Deudas v2: de registro a asesor" (brief 2026-07-08) quedó **completa el 2026-07-13**: D.15a (copy, última pieza), D.15b (editar + reorden), D.15c (absorbida por D.16d), D.15d-1/D.15d-2 (motor + vista de palancas) y D.15e (absorbida por D.15d-2), sumadas al rediseño visual D.16a-d (2026-07-12).

---

## Formulario de deuda (FORM.1b, [ADR 042](../DECISIONS/042-formularios-v2-visual.md))

- **Objetivo**          : segunda rebanada de Formularios v2, el form de deuda adopta el lenguaje compartido de FORM.1a: segmented Entidad/Personal inline (reemplaza el chooser de dos pasos), categoría en chips 2col, saldo total como monto hero, cuota con prefijo `$`, tasa dentro de un disclosure colapsable, y el bloque D.14 como toggle switch.
- **Estado actual**     : **FORM.1b CERRADA (2026-07-15)**. Cierra la iniciativa FORM.1 completa (FORM.1a gasto, FORM.1c gasto fijo).
- **Verificado contra** : FORM.1b (2026-07-15).

**Decisiones de traducción del mockup (ADR 042 D4, resueltas al codificar)**:

- **Solo la tasa vive dentro del disclosure "Condiciones del crédito"**, no frecuencia+día como agrupaba el mockup: ambos son obligatorios (`validarCompromiso` los exige siempre) y el día de pago no tiene un valor por defecto seguro para esconder (a diferencia de frecuencia, que ya trae 'Mensual' preseleccionado). Esconder un campo obligatorio sin default detrás de un colapsable cerrado habría generado errores de validación silenciosos. El disclosure abre por defecto al editar una deuda que ya tiene tasa guardada.
- **El segmented reemplaza el chooser de dos pasos por completo**: `renderChooserCompromiso()`, `_mostrarChooser()`, `_volverChooser()` y la acción `comp-volver-chooser` se eliminaron (cero código muerto); el CSS `.comp-chooser*` (89 líneas en `charts.css`) también. `_inyectarForm()` (pre-inyectaba el chooser al arrancar) también se retiró: como en Gastos, el form se monta on-demand en cada apertura del modal.
- **El segmented solo aparece al crear**: editar una deuda nunca permitió cambiar Entidad↔Personal (ni con el chooser viejo); se conserva la regla, solo cambia cómo se expresa (ausencia del bloque, no un paso saltado).
- **Toggle switch: consolidado en TX.11 (2026-07-15).** El de FORM.1b (`.toggle-switch`/`.toggle-row` en `forms.css`) fue el tercer switch de la app (los otros: `.toggle` en `atoms.css`, entonces CSS muerto, y `.config-toggle` en `config.css`, vivo en Ajustes). TX.11 migró el bloque D.14 a `.toggle` de `atoms.css` (único switch de la app desde entonces): la etiqueta sigue siendo `.toggle-row` (layout label + hint, sin cambios), pero el track ahora es `<span class="toggle"><input/><span class="toggle__track"></span></span>` en vez de `.toggle-switch`/`.toggle-switch__knob`. `.toggle` ganó `var(--fk-section-accent, var(--fk-accent))` en su estado marcado, así que el tinte por dominio (frambuesa en Deudas) se conserva igual que antes. `.toggle-switch*` se eliminó de `forms.css`.
- **`.form-disclosure` es un componente genérico**, no específico de tasa: trigger + panel con `aria-expanded`/`hidden`, reusable para futuros colapsables.

**Wiring (todo delegado, sin `id` único en los radios de categoría)**: `_mostrarFormDeuda(overlay, tipo, deuda)` es el único punto de montaje (lo llaman `_nuevoCompromiso`, `_elegirTipoDeuda` y `_editarCompromiso`); `_wireToggleFiado`/`_wireIconoOtraCategoria` escuchan `change` delegado en el `<form>` filtrando `e.target.name === 'categoria'` (antes escuchaban un único `<select id="comp-categoria">`, que ya no existe).

**Riesgos nuevos**:

- **Ningún `id="comp-categoria"` existe más**: cualquier código o test que lo busque directamente falla en silencio (`querySelector` devuelve `null`). Usar `form.querySelector('input[name="categoria"]:checked')` para leer, o `elegirChip(form, valor)` en E2E (helper en `smoke.test.js`, compartido con FORM.1a).
- **`#grupo-comp-tasa` ahora envuelve el disclosure completo** (trigger + panel), no solo el input: `_wireToggleFiado` lo sigue ocultando entero para Fiado, comportamiento intacto pero la superficie ocultada creció (ya no es solo un `form-group`).

**Cambios realizados**:

- 2026-10-17 (**HF.0e**, BUG-025): "deudas durmiendo" y el descarte de vencimientos anteriores al alta leen `fechaCreacion` en hora local.
- 2026-07-15 a 2026-08-11: 3 hitos resumidos el 2026-11-15 para que la ficha quepa en su techo (GAS.2c, BUG-018, FORM.1b, D.14). Detalle en [2026-07](../changelog/2026-07.md), [2026-08](../changelog/2026-08.md).

---

## Tarjeta de crédito ([ADR 051](../DECISIONS/051-tarjeta-de-credito-producto-integrado.md), iniciativa MC.16)

- **Objetivo**          : la tarjeta es un producto de Deudas, no una `Cuenta`: cupo más deuda, nunca dinero disponible. `cupoTotal` es el único campo nuevo del modelo (D1) y el `disponible` se deriva, nunca se almacena.
- **Estado actual**     : **MC.16 CERRADA (2026-07-31)**. La tarjeta es operable de punta a punta: se registra con cupo, se paga con ella (el consumo sube el saldo), difiere a cuotas (sube `cuotaMensual`), se ve en su bloque de Mis cuentas y avisa su costo en cuatro situaciones (MC.16e). Con MC.16b, `consumosTC` del monitor de renta deja de ser captura manual (CFG.2a). **AVC.1a y 1b (2026-11-18, [ADR 169](../DECISIONS/169-un-avance-no-es-un-gasto.md))**: "Sacar un avance" en la hoja de la tarjeta (y "Avance" en escritorio) lleva el dinero a una cuenta (crea Efectivo si falta) y dice el costo en pesos antes de guardar; vive en `avances` de la tarjeta (v56), sube deuda, cuota (con intereses) y cuenta, y se deshace desde Movimientos. **AVC.1c**: dos o más avances en 90 días dan el aviso `avances-seguidos` en Novedades de Inicio (`avancesRecientes`), con "Ver tu plan de salida".
- **Verificado contra** : AVC.1c (2026-11-18): `avancesRecientes`, `_deAvances` en `infra/avisos.js`, `_contenidoAvances` en `ui/atencion-hoy.js` y `_verPlanSalida`. Antes: AVC.1b (2026-11-18), AVC.1a (2026-11-18), BUG-037 (2026-10-18).

**`cupoTotal` es dato y discriminador a la vez** (misma economía que `esCuotaManejo`): una deuda con `categoria: 'Tarjeta de crédito'` **con** `cupoTotal` es una tarjeta operable (recibe consumos, muestra disponible); **sin** `cupoTotal` es una deuda vieja capturada a posteriori y se comporta como cualquier otra. No hay campo `esTarjeta` ni bandera paralela.

**El consumo vive en el dominio de Gastos, no acá.** Un consumo es un `Gasto` con `compromisoId` y `consumoTC: true`, sin `cuentaId`. `compromisos` no se enteró: no cambió ni una línea suya en MC.16b. El campo `consumoTC` existe porque el abono a la tarjeta lleva **el mismo** `compromisoId` con el signo contrario, y deducirlo de la ausencia de `cuentaId` sería frágil (un gasto sin cuenta ya es legal: efectivo no registrado). **Por eso todo lector de lo pagado excluye `consumoTC`** (BUG-037): `compromisos/logic/abonos.js`, `agenda/logic.js` (hero y hoja) y `_pagadoEnRango` (`infra/vencimientos.js`). Sin el campo, es abono.

**Anclas del código**:

| Pieza | Dónde |
|---|---|
| Campo del form (oculto salvo categoría tarjeta) | `compromisos/views/formularios.js`, `#grupo-comp-cupo` tras el monto hero |
| Revelado del campo | `compromisos/index.js`, `_wireCupoTarjeta` (patrón de `_wireIconoOtraCategoria`) |
| Validación (opcional; si viene, > 0) | `compromisos/logic/modelo.js`, `validarCompromiso` |
| Normalización (`null` explícito si no aplica) | `compromisos/logic/modelo.js`, `normalizarCompromiso` |
| Chip "Disponible" en la card | `compromisos/views/lista.js`, `cupoChip` |
| Prefijo del valor de tarjeta en el selector | `core/constants.js`, `TARJETA_PREFIJO` (`'tc:'`) |
| Tarjetas en el selector de origen (grupo aparte) | `infra/cuenta-helper.js`, `renderSelectorCuenta({ tarjetas })` |
| Qué tarjeta es operable | `gastos/logic.js`, `tarjetasDeCredito` |
| Origen del gasto (cuenta vs tarjeta) | `gastos/logic.js`, `normalizarGasto` |
| Signo del ajuste a la deuda | `gastos/logic.js`, `efectoEnDeuda` + `deltasPorEdicionEnDeuda` |
| Escritura del saldo de la deuda | `gastos/index.js`, `_aplicarDeltasADeudas` sobre `_ajustarSaldoDeuda` |
| Campo "¿A cuántas cuotas?" (MC.16d, chips, oculto salvo tarjeta) | `gastos/view.js`, `#grupo-gasto-cuotas` tras el selector de origen |
| Revelado del campo (delegado en `change` de `cuentaId`) | `gastos/index.js`, listener de `_montarFormGasto` |
| Aporte del consumo a `cuotaMensual` (`monto / cuotas`, redondeado) | `gastos/logic.js`, `efectoEnCuotaMensual` + `deltasPorEdicionEnCuotaMensual` |
| Escritura de `cuotaMensual` | `gastos/index.js`, `_aplicarDeltasACuotaMensual` sobre `_ajustarCuotaMensual` |
| Marca "Lo pagué con un avance" (MC.16e; texto de AVC.1b, checkbox oculto salvo tarjeta) | `gastos/view.js`, `#grupo-gasto-avance` + aviso `#gasto-avance-nudge` |
| Aviso de consumo que pasa del cupo | `gastos/logic.js`, `excesoDeCupo` + `gastos/index.js`, `_actualizarNudgeSobrecupo` |
| Aviso de lo que cuesta no pagar el total | `compromisos/index.js`, `_actualizarTipProyeccion` (rama de tarjeta) |
| Tasa mensual desde la tasa registrada (EA o mensual) | `compromisos/logic/modelo.js`, `tasaMensualDecimal` |
| Avance que llega a una cuenta: costo, validación, efectos, reversa al borrar (AVC.1a) | `compromisos/logic/avances.js`; deshacer en `infra/deshacer.js`, `_planAvance` |
| "Sacar un avance" (AVC.1b): formulario y guardado | `views/formularios.js`, `renderFormAvance`; `compromisos/index.js`, `_abrirAvance` y `_guardarAvance` (en `#modal-abono`) |

**Riesgos**:

- **Nada impide que un consumo pase del cupo**: desde MC.16e el formulario lo avisa con el exceso exacto, pero **no bloquea** y el disponible sigue acotado con `Math.max`. Es deliberado: quien aprueba o rechaza es el banco, y Finko no puede saberlo. El aviso es informativo, no una validación.
- **Hay dos avances**: el que llega a una cuenta (`avances`, ADR 169) y el que paga directo a otra persona (gasto con `avanceTC`, "Lo pagué con un avance"). El aviso de AVC.1c los cuenta juntos. Deshacer desde la hoja de la tarjeta (D6) no está: solo desde Movimientos (AVC.1d).
- **Borrar la tarjeta saca de las cuentas el dinero de sus avances** (I3 del ADR 053), aunque ya se haya gastado: el mismo trato de la deuda recibida (D.14).
- **El aviso de intereses del abono depende de una `tasa` que el usuario pudo no registrar**: sin ella el mensaje explica el mecanismo sin cifra. La `tasa` tampoco capitaliza el saldo sola (fuera de alcance del ADR 051): el número del aviso es una estimación del próximo mes, no un movimiento que la app vaya a aplicar.
- **`cupoTotal` se limpia a `null` al cambiar de categoría al editar** (lo exige `editar()`, que hace `Object.assign` shallow): reclasificar una tarjeta como "Vivienda" y volver a "Tarjeta de crédito" pierde el cupo tecleado. Es el mismo comportamiento que `icono` y es intencional, pero el usuario no recibe aviso. **Ojo con el efecto nuevo:** una tarjeta que pierde su cupo deja de ofrecerse en Gastos, aunque sus consumos ya registrados siguen intactos.
- **Sin cuentas activas no hay formulario de gasto**, así que quien solo tenga tarjeta no puede registrar un consumo: el empty state de `renderFormGasto` sigue exigiendo una cuenta. Es preexistente y quedó fuera de MC.16b a propósito (tocar ese empty state es una decisión de producto, no del signo del saldo).
- **Un gasto repartido entre varias cuentas se parte en varios registros; un consumo con tarjeta nunca se parte**: no hay reparto que hacer sobre un cupo.
- **Límites aún lee el consumo por su `compromisoId`** (`presupuesto/logic.js`): lo suma a Necesidades y su desglose da la tarjeta por pagada. Es contabilidad (P2, HF.1a), fuera de BUG-037.

**Cambios realizados** (detalle en el [CHANGELOG](../CHANGELOG.md)):

- 2026-07-30 a 2026-07-31: 3 hitos resumidos el 2026-11-15 para que la ficha quepa en su techo (MC.16a, MC.16b, MC.16e). Detalle en [2026-07](../changelog/2026-07.md).
- 2026-10-18 (BUG-037): una compra con la tarjeta deja de contar como pago de la tarjeta.
- 2026-11-18 AVC.1c ([ADR 169](../DECISIONS/169-un-avance-no-es-un-gasto.md) D8): el aviso de avances seguidos, en Novedades.
- 2026-11-18 (AVC.1a y AVC.1b): el avance que llega a una cuenta: modelo, fila y deshacer; luego su formulario con el costo en pesos.

---

## Deudas v2 (D.15, diseño 2026-07-12)

> Bloque escrito en la fase de análisis (Opus 4.8), **antes de codificar** (regla 2.6). Documenta el estado real de la sección y el diseño del motor de recomendación de palanca. Las 5 rebanadas (D.15a-e) viven en `docs/BOARD.md`.

**Hallazgo central: dos motores ortogonales, no uno.** La tarjeta de estrategia tiene (o tendrá) dos niveles independientes:
- **Nivel orden** (`recomendarEstrategia`, ya existe y probado): en qué ORDEN pagar las deudas, Avalancha (tasa↓) vs Bola de nieve (saldo↑). No se rehace.
- **Nivel palanca** (D.15d, nuevo): qué ACCIÓN tomar sobre el plan, Aumentar la cuota / Renegociar la tasa / Consolidar. Las 3 simulaciones ya existen (`repartirExtraEnCuotas`, `simularRenegociacion`, `simularConsolidacion`) pero hoy solo se ven dentro del panel "plan inviable" (`_renderPanelAlternativas` en `views/estrategia.js`): un usuario con plan viable nunca las descubre. D.15d las saca a primer plano SIEMPRE y recomienda la principal.

**Motor de recomendación de palanca (D.15d), IMPLEMENTADO en D.15d-1 (2026-07-13):**
- Firma pura: `recomendarPalanca(deudas, { ingresoMensual, fijosMensuales })` en `logic/estrategia.js`. NO lee `S` ni importa `tesoreria`: recibe la capacidad como parámetro (la vista la calculará en D.15d-2). `deudas` es el shape de `filtrarDeudasPagables`.
- **Capacidad = margen libre real** (decisión de Esteban, 2026-07-12): `capacidad = ingresoMensual - fijosMensuales - Σ cuotas de deuda`. Es el dinero realmente disponible para más pago, no el ingreso bruto. `fijosMensuales` es SOLO los compromisos tipo 'fijo' (las cuotas de deuda se restan aparte vía `deudas`, para no doble-contar).
- Retorno: `{ principal, orden, capacidad, tieneCapacidad, razon }`. `orden` es el ranking de relevancia de las palancas **disponibles** (principal = `orden[0]`); disponibilidad: aumentar siempre, renegociar exige alguna tasa > 0, consolidar exige ≥ 2 deudas. `razon` en tono ADR 003/008.
- Reglas de la principal (helper declarativo `_ordenarPalancas`): con margen (`capacidad ≥ 20.000`) → **Aumentar**; sin margen + ≥2 deudas caras → **Consolidar**; sin margen + 1 cara → **Renegociar**; sin margen + sin tasas altas → **Aumentar** (cuando se libere margen: renegociar/consolidar no ayudan a una deuda barata o al 0%). Umbral de "cara" = **25% EA** (`TASA_ALTA_EA`, heurística de producto, NO la usura del ADR 004). Las 3 se muestran siempre en D.15d-2, con pesos visuales según `orden` (no 3 botones iguales, punto 2 del brief).

**Fuente de la capacidad de ingresos (arquitectura, EXTRAÍDA en D.15d-1):** `estimarSalarioMensual` **se movió de `tesoreria/logic/ingresos.js` a `infra/financiero.js`** (hogar único sin dueño de dominio, ahora que presupuesto y compromisos también la consumen; ADN 10 limpio). El barrel `tesoreria/logic.js` la re-exporta desde infra (consumidores del barrel y tests intactos); `presupuesto/view.js` la importa directo de infra (un import cruzado de dominio menos); `tesoreria/acciones/ingresos.js` y `tesoreria/views/distribucion.js` repuntados a infra. La tabla `FACTOR_MENSUAL` de tesorería se quedó donde estaba (aún la usan `montoSalarioMinimoPorPeriodo` y `distribucion.js`); infra tiene su propia copia privada `FACTOR_MENSUAL_INGRESO`. En D.15d-2 la vista de compromisos importará `estimarSalarioMensual` de infra (ADN 10) y sumará los fijos con las funciones propias del dominio.

**Qué NO toca ninguna rebanada** (fuentes únicas externas, ya en el BOARD): iconos de Avalancha/Bola → IV.4; "Otro" con icono+nombre → CAT.2/CAT.3; catálogo entidad→producto → validación D3 del ADR 029. Ninguna rebanada revisa el ADR 019 (esa nota del triaje era para LIM.1, no para Deudas).

**Cambios realizados**:

- 2026-07-10 a 2026-07-25: 11 hitos resumidos el 2026-11-15 para que la ficha quepa en su techo (DIS.2, D.15a, D.15b, D.15d-2, D.15e, D.15d-1, D.16d, D.16, D.16c, D.16b, D.16a, BUG-011, D.14). Detalle en [2026-07](../changelog/2026-07.md).










