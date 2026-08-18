# Ficha de contexto: Por pagar (antes Deudas)

> Revisado: 2026-08-18.

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## La sección "Por pagar": los tres tipos juntos (ficha 05, [ADR 069](../DECISIONS/069-bloque-gastos-en-la-barra-movil.md))

- **Objetivo**          : `compromisos` tiene tres tipos desde v6 (`fijo`, `deuda-entidad`, `deuda-personal`) pero solo administraba dos: los gastos fijos se creaban y editaban desde Calendario, y la propia lista lo decía ("Los gastos fijos se gestionan desde Agenda"). Responder "¿qué tengo que pagar este mes?" costaba dos secciones que la barra no relacionaba. La ficha 05 le devuelve el dominio completo a su dueña.
- **Estado actual**     : **cerrada el 2026-08-18**. La sección se llama "Por pagar" (título, nav de escritorio, banner de propósito), lista fijos y deudas en dos grupos, y es la única entrada para crear cualquiera de los tres tipos. Hereda del Calendario el **alta/edición de gasto fijo** y el **pago en lote** (CAL.5a/CAL.5b).
- **Verificado contra** : ficha 05 de la auditoría móvil (2026-08-18).

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| Lista de los dos grupos ("Tus gastos fijos", "Tus deudas") | `modules/dominio/compromisos/views/lista.js` | `renderListaCompromisos()`, `_renderGrupoFijos()`, `_renderGrupoDeudas()` | un grupo no se pinta si está vacío; el empty state general cubre los tres tipos |
| Tarjeta de gasto fijo | `modules/dominio/compromisos/views/lista.js` | `_renderFijoItem()` | más simple que la de deuda: sin saldo, sin tasa, sin orden de estrategia |
| Chip de vencimiento (lo vencido de este mes antes que el próximo pago) | `modules/dominio/compromisos/views/lista.js` | `_chipVencimiento()`, `_atrasoPorId()` | lo usan las DOS tarjetas; el conjunto sale de `vencidosSinPagar` |
| Chooser de tipo ("¿Qué quieres agregar?") | `index.html` + `modules/dominio/compromisos/index.js` | `#modal-compromiso-tipo`, `_elegirTipoNuevo()`, `_elegirTipoNuevoIr()` | un solo "+ Agregar" en el encabezado; cada chip abre su modal |
| Alta/edición de gasto fijo (mudado de Agenda) | `modules/dominio/compromisos/index.js` | `_nuevoGastoFijo()`, `_editarGastoFijo()`, `_inyectarFormGastoFijo()`, `_guardarGastoFijo()` | acciones `nuevo-gasto-fijo` y `agenda-editar-fijo`; eliminar reusa `_eliminarCompromiso` |
| Formulario de gasto fijo (FORM.1c, lenguaje v2) | `modules/dominio/compromisos/views/formularios.js` | `renderFormGastoFijo()`, `textoBannerGastoFijo()`, `CATEGORIA_NUEVA_VALUE_FIJO` | mismo HTML que tenía en Agenda, byte a byte salvo el hogar |
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

- **Tres superficies cuentan vencidos en la misma pantalla y tienen que coincidir**: la pastilla de la pestaña "Por pagar", el chip de cada tarjeta y la tarjeta de pago en lote. Las tres salen de `vencidosSinPagar`. **El motor del lote (`pendientesDePagoDelMes`) cuenta más**: no descarta un compromiso registrado este mes después de su día de pago, así que `_pendientesDelMes()` lo filtra por los ids de `vencidosSinPagar` y usa el motor solo para el MONTO de cada fila (que es lo que sabe resolver: resta el abono parcial y topa la cuota al saldo). Sin ese filtro la tarjeta decía "2 pagos ya vencieron" con la pastilla marcando 1 (encontrado verificando en la app, no por un test).
- **El chip de vencimiento cambió de criterio para las deudas también, no solo para los fijos**: antes `_renderCompromisoItem` afirmaba "Vence en 21 días" sobre una cuota que venció el 8 y seguía impaga. Es una revisión del chip de urgencia de D.16d ([ADR 036](../DECISIONS/036-deudas-v2-visual.md) D5) que conserva su anatomía y sus clases: cambia lo que dice, no cómo se ve.
- **`_atrasoPorId()` se calcula una vez por render y baja por parámetro a cada tarjeta.** `_renderCompromisoItem` tiene un default que lo recalcula para no romper a un caller suelto; si alguien renderiza tarjetas en un bucle sin pasarlo, paga un `vencidosSinPagar` por tarjeta.
- **`#modal-gasto-fijo` y `#modal-pago-lote` cambiaron de `data-dom="agenda"` a `data-dom="compromisos"`**, así que su teja y su tinte pasan de índigo a frambuesa. Cualquier test que midiera ese color por el modal mide otro ahora.
- **El botón `#compromisos-nueva-deuda` del encabezado ya no existe** (lo reemplaza el del chooser, sin id) y con él se fue `_toggleBotonNuevaDeuda()`: la regla FD6 de ocultarlo con la lista vacía dejó de aplicar porque el botón nuevo sirve para los tres tipos y siempre tiene algo que ofrecer. Un selector `#compromisos-nueva-deuda` devuelve `null`.

**Cambios realizados**:

- 2026-08-18 (**ficha 05 de la auditoría móvil**): ver arriba. Ver [CHANGELOG](../CHANGELOG.md).

---

## Registro de deudas (dominio `compromisos`, tipo `deuda-entidad`/`deuda-personal`)

- **Objetivo**          : registrar deudas con entidad (banco, tarjeta) o personales (familia, fiado, gota a gota), simular estrategias de pago (Avalancha, Bola de nieve, cuota fija), registrar abonos que descuentan `saldoTotal` y sincronizan la cuenta de origen del pago, y detectar cuándo una cuota no alcanza a cubrir el interés mensual. Comparte el dominio `compromisos` con los gastos fijos (tipo `fijo`, que desde la ficha 05 también se administran acá, ver el bloque de arriba): mismo schema `Compromiso`, tres tipos posibles (`fijo`, `deuda-entidad`, `deuda-personal`).
- **Estado actual**     : estable. **FORM.1b CERRADA (2026-07-15)**: el form de deuda adopta el lenguaje de Formularios v2 ([ADR 042](../DECISIONS/042-formularios-v2-visual.md)); ver bloque "Formulario de deuda (FORM.1b)" abajo, cierra la iniciativa FORM.1. **Iniciativa "Deudas v2: de registro a asesor" (brief 2026-07-08) CERRADA COMPLETA el 2026-07-13** (todas sus rebanadas D.15a-e y el rediseño visual D.16a-d). **D.14** (2026-07-10) agrega la acreditación opcional de la cuenta de origen al crear una deuda. **BUG-011 corregido** (2026-07-11): el extra tecleado en "Aumenta tu cuota" ya no reestructura la card de estrategia en el siguiente re-render (ver riesgo "estado UI simulado" abajo). **Rediseño visual D.16 ([ADR 036](../DECISIONS/036-deudas-v2-visual.md)) CERRADO el 2026-07-12** (hero, picker/comparativa, acelerador/panel en 2 capas, tarjeta de deuda). **D.15d (motor + vista de palancas) y D.15b (editar deuda + reorden del form) CERRADAS el 2026-07-13** (ver "Deudas v2 (D.15, diseño)" abajo para el detalle del motor). **D.15a CERRADA (2026-07-13)**: copy motivador en las simulaciones de orden (Avalancha explicita "cuándo conviene", en paralelo a Bola de nieve, que ya lo tenía) + reafirmación "explora libremente, nada cambia hasta que confirmes" en las 3 palancas (Aumentar/Renegociar/Consolidar) + refuerzo psicológico en Abonar: línea estática ("cada abono es un paso real hacia quedar libre de esta deuda") y el tip en vivo nunca queda vacío (mensaje reforzado cuando el abono salda la deuda por completo, genérico cuando no hay proyección de meses que mostrar). Tono ADR 003/008: afirma progreso real, sin presión ni comparación. Sin cambios de lógica de negocio.
- **Verificado contra** : DIS.2 (2026-07-25, auditoría de diseño). Antes: FORM.1b (2026-07-15), D.15a (2026-07-13, cierra Deudas v2 completa), D.15b (2026-07-13), D.15d-2 (2026-07-13), D.15d-1 (2026-07-13), cierre de D.16d/D.16 (2026-07-12), análisis D.15 (2026-07-12), fix de BUG-011 (2026-07-11), primera ficha (D.14, 2026-07-10).

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
| Hero con el total de deuda (D.16a, ADR 036) | `modules/dominio/compromisos/views/hero.js` | `renderHeroCompromisos()`, agregado puro `resumenDeudas()` en `logic/modelo.js` | |
| Lista de deudas activas + trigger de editar (D.15b) | `modules/dominio/compromisos/views/lista.js` | `renderListaCompromisos()`, `_renderCompromisoItem()` | |
| Panel de estrategia de pago (arriba, define orden de pago) | `modules/dominio/compromisos/views/estrategia.js` | `renderEstrategiaPago()` | |
| Paneles de dashboard (vencidos, prioridades, Inicio) | `modules/dominio/compromisos/views/dashboard.js` | `renderPanelVencidos()`, `renderPanelPrioridades()` | |
| Selector de cuenta embebido en form (reutilizado por D.14) | `modules/infra/cuenta-helper.js` | `renderSelectorCuenta()` | ~37 |
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

- 2026-08-11 (GAS.2c): `_guardarAbono()` (`compromisos/index.js`) sustituye su `announce()` final por `mostrarToast()`, con segunda linea via `consecuenciaDeAbono()` nueva en `compromisos/logic/abonos.js` (prioridad deuda saldada > saldo restante). Mismo patron de Gastos (GAS.2a/2b), formalizado en [ADR 062](../DECISIONS/062-toast-de-consecuencia-en-abono-y-aporte.md). Detalle completo: `contexto/gastos.md`.
- 2026-08-02 (**BUG-018**): la fecha por defecto del abono sale de `hoy()` (`infra/utils.js`, getters locales) y no de `toISOString()`. Desde las 7 p.m. hora Colombia el abono quedaba fechado al dia siguiente. Mismo cambio en `views/alertas.js` (umbral de deudas durmiendo). Queda abierto **BUG-025**: `fechaCreacion` arrastra el mismo defecto de huso del lado de la lectura.
- 2026-07-15 (FORM.1b): form v2 completo (segmented, chips, monto hero, disclosure de tasa, toggle D.14, teja del header) + retiro completo del chooser de dos pasos (JS y CSS muertos). Ver [CHANGELOG](../CHANGELOG.md).

---

## Tarjeta de crédito ([ADR 051](../DECISIONS/051-tarjeta-de-credito-producto-integrado.md), iniciativa MC.16)

- **Objetivo**          : la tarjeta es un producto de Deudas, no una `Cuenta`: cupo más deuda, nunca dinero disponible. `cupoTotal` es el único campo nuevo del modelo (D1) y el `disponible` se deriva, nunca se almacena.
- **Estado actual**     : **MC.16 CERRADA (2026-07-31)**, las cinco rebanadas. La tarjeta es operable de punta a punta: se registra con cupo, se paga con ella (el consumo sube el saldo), difiere a cuotas (sube `cuotaMensual` automáticamente), se ve en su propio bloque de Mis cuentas y avisa su costo en cuatro situaciones (MC.16e). El [ADR 051](../DECISIONS/051-tarjeta-de-credito-producto-integrado.md) queda ejecutado completo. Con MC.16b en producción, `consumosTC` del monitor de renta deja de ser captura manual (CFG.2a).
- **Verificado contra** : MC.16e (2026-07-31).

**`cupoTotal` es dato y discriminador a la vez** (misma economía que `esCuotaManejo`): una deuda con `categoria: 'Tarjeta de crédito'` **con** `cupoTotal` es una tarjeta operable (recibe consumos, muestra disponible); **sin** `cupoTotal` es una deuda vieja capturada a posteriori y se comporta como cualquier otra. No hay campo `esTarjeta` ni bandera paralela.

**El consumo vive en el dominio de Gastos, no acá.** Un consumo es un `Gasto` con `compromisoId` y `consumoTC: true`, sin `cuentaId`. `compromisos` no se enteró: no cambió ni una línea suya en MC.16b. El campo `consumoTC` existe porque el abono a la tarjeta lleva **el mismo** `compromisoId` con el signo contrario, y deducirlo de la ausencia de `cuentaId` sería frágil (un gasto sin cuenta ya es legal: efectivo no registrado).

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
| Marca del avance en efectivo (MC.16e, checkbox oculto salvo tarjeta) | `gastos/view.js`, `#grupo-gasto-avance` + aviso `#gasto-avance-nudge` |
| Aviso de consumo que pasa del cupo | `gastos/logic.js`, `excesoDeCupo` + `gastos/index.js`, `_actualizarNudgeSobrecupo` |
| Aviso de lo que cuesta no pagar el total | `compromisos/index.js`, `_actualizarTipProyeccion` (rama de tarjeta) |
| Tasa mensual desde la tasa registrada (EA o mensual) | `compromisos/logic/modelo.js`, `tasaMensualDecimal` |

**Riesgos**:

- **Nada impide que un consumo pase del cupo**: desde MC.16e el formulario lo avisa con el exceso exacto, pero **no bloquea** y el disponible sigue acotado con `Math.max`. Es deliberado: quien aprueba o rechaza es el banco, y Finko no puede saberlo. El aviso es informativo, no una validación.
- **`avanceTC` no entra en ningún cálculo**: solo dispara el aviso. Si algún día se quiere separar avances de compras en Análisis o en el monitor de renta, el dato ya está guardado, pero hoy nadie lo lee fuera del formulario.
- **El aviso de intereses del abono depende de una `tasa` que el usuario pudo no registrar**: sin ella el mensaje explica el mecanismo sin cifra. La `tasa` tampoco capitaliza el saldo sola (fuera de alcance del ADR 051): el número del aviso es una estimación del próximo mes, no un movimiento que la app vaya a aplicar.
- **`cupoTotal` se limpia a `null` al cambiar de categoría al editar** (lo exige `editar()`, que hace `Object.assign` shallow): reclasificar una tarjeta como "Vivienda" y volver a "Tarjeta de crédito" pierde el cupo tecleado. Es el mismo comportamiento que `icono` y es intencional, pero el usuario no recibe aviso. **Ojo con el efecto nuevo:** una tarjeta que pierde su cupo deja de ofrecerse en Gastos, aunque sus consumos ya registrados siguen intactos.
- **Sin cuentas activas no hay formulario de gasto**, así que quien solo tenga tarjeta no puede registrar un consumo: el empty state de `renderFormGasto` sigue exigiendo una cuenta. Es preexistente y quedó fuera de MC.16b a propósito (tocar ese empty state es una decisión de producto, no del signo del saldo).
- **Un gasto repartido entre varias cuentas se parte en varios registros; un consumo con tarjeta nunca se parte**: no hay reparto que hacer sobre un cupo. Si MC.16d agrega cuotas, se apoya en ese mismo registro único.

**Cambios realizados**:

- 2026-07-30 (MC.16a): `cupoTotal` en el form condicionado a la categoría, validación, normalización, chip de disponible en la card y bump de schema v27 a v28 (migración no-op). Ver [CHANGELOG](../CHANGELOG.md).
- 2026-07-30 (MC.16b): el consumo con tarjeta como `Gasto` con `consumoTC`, tarjetas en el selector de origen (solo Gastos) y el signo del saldo en `deltasPorEdicionEnDeuda`, con alta, edición y eliminación juntas. Ver [CHANGELOG](../CHANGELOG.md).
- 2026-07-31 (MC.16e): cuatro avisos de costo (avance en efectivo con el retiro en otra red en su texto, sobrecupo, y lo que cuesta no pagar el total del abono), campo `avanceTC` con bump v29 a v30 y `tasaMensualDecimal` extraída de `detectarDeudaCreciente`. Ver [CHANGELOG](../CHANGELOG.md).

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

- 2026-07-25 (DIS.2, auditoría de diseño de la sección, 8 correcciones): la tarjeta de deuda saldada deja de anunciar vencimientos y se fecha con el último abono (`fechaUltimoAbono` nueva en `logic/abonos.js`); archivar usa `#i-check-circle`; el chip de urgencia baja del nombre a `.deuda-card__chips`; `.deuda-card__abonar` sube a 44px; los tres "Aplicar" del simulador pasan a `.estrategia-card__aplicar` (identidad de compromisos, no `.btn-primary`); un solo verbo y un solo botón para crear deuda; `resumenDeudas()` cuenta aparte las saldadas y el hero las explicita; la card de estrategia conserva su encabezado con una sola deuda. Reglas **R7** (estado terminal) y **R8** (una acción principal) escritas en [`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md). Ver [CHANGELOG](../CHANGELOG.md).

- 2026-07-13 (D.15a, **cierra Deudas v2 completa**): copy motivador en las simulaciones de orden y en las 3 palancas, y refuerzo psicologico en Abonar (linea estatica + tip en vivo que nunca queda vacio). Sin logica nueva.

- 2026-07-13 (D.15b): boton de editar en la tarjeta de deuda (activa y saldada) sobre la accion `editar-compromiso` que ya existia, y la categoria pasa antes de la descripcion en el form.

- 2026-07-13 (D.15d-2, **absorbe D.15e**): la card de estrategia pasa a 2 niveles. Se retira `_renderAceleradorExtra` y el extra vive en la palanca "Aumentar la cuota"; `_renderPalancas` muestra las 3 siempre, con la recomendada marcada. El panel inviable queda como 2 capas puras.

- 2026-07-13 (D.15d-1, logica sin UI): `estimarSalarioMensual` sube de `tesoreria/logic/ingresos.js` a `infra/financiero.js`, y nace `recomendarPalanca()` en `logic/estrategia.js` (con `TASA_ALTA_EA` 0.25 y `UMBRAL_CAPACIDAD_MINIMA` 20.000), aun sin consumidor.

- 2026-07-12 (D.16d, ADR 036 D5/D6/D7, cierra D.16): `_renderCompromisoItem` pasa de `.list-item` a `.deuda-card` (teja 44px con badge de orden superpuesto, saldo enmascarable, chips de categoria y tasa, aviso de tasa como callout). Se retira `.abono-btn`. Flujos de abono/archivar/eliminar sin cambios de wiring.

- 2026-07-12 (D.16c, ADR 036 D3/D4): acelerador como sub-card inset, panel inviable en 2 capas y selector de alternativas como tiles verticales; emojis reemplazados por iconos del sprite. **Fix real**: los "Aplicar" de renegociar/consolidar usaban la clase inexistente `btn--primary`.

- 2026-07-12 (D.16b, ADR 036 D2): card de estrategia a superficie con sombra en reposo, picker activo en frambuesa (antes accent global), eyebrow `.grupo-eyebrow` nueva en `atoms.css`, y la comparativa Avalancha vs Bola como callouts tintados.

- 2026-07-12 (D.16a, ADR 036 D1/D7): hero al tope de la seccion (`renderHeroCompromisos()` en `views/hero.js`) con el total de deuda, chip de cuota/mes y ojo de privacidad. Agregado puro `resumenDeudas()` en `logic/modelo.js`: solo deudas activas, los fijos no entran.

- 2026-07-11 (**BUG-011**): teclear un monto en "Aumenta tu cuota" y provocar un re-render presentaba el plan como saneado sin haber aplicado nada. La mutacion nunca fue real (los `_aplicar*` van tras `confirmar()`): era la variante visual. Fix: la estructura se decide con `recomendarEstrategia(deudas, 0)`.

- 2026-07-10 (**D.14**): al crear una deuda (nunca al editar) se ofrece acreditar su monto a una cuenta; se guardan `cuentaOrigenId` y `montoAcreditado` (copia inmutable) para revertir exacto al eliminar. Sin bump de schema. **Verificacion limitada**: sin navegador real, por trazado contra NAV.A1.
