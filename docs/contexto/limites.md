# Ficha de contexto: Límites de gasto

> Revisado: 2026-08-12 (LIM.1b).

> Ver reglas de uso y plantilla en [`README.md`](README.md).
> El dominio se llama `presupuesto` en el código; "Límites de gasto" es el nombre de cara al usuario (para no confundirlo con Apartados: guardar dinero vs. vigilar cuánto sale).

---

## La sección completa: tres grupos con tratamiento asimétrico por rol (MC.8, ADR 019)

- **Objetivo**          : un solo relato por grupo financiero. Necesidades se **monitorea** (neutro), Ahorro se **celebra** (verde de logro) y Estilo de vida se **controla** (único con topes por categoría y alertas). Los topes viven **dentro** de la tarjeta de Estilo de vida, no en un bloque suelto.
- **Estado actual**     : estable. **DIS.7 cerrada** (2026-07-26): las 9 correcciones aplicables de la auditoría de diseño de la sección. La iniciativa **LIM.1** (asistente preventivo de estilo de vida) sigue abierta y no la pisa: DIS.7 abre la puerta que el [ADR 019](../DECISIONS/019-limites-por-rol.md) D2 ya prometía, pero **no sugiere montos**: eso es [ADR 044](../DECISIONS/044-motor-unico-de-sugerencia-por-categoria.md) y LIM.1c. **ADR 045 Aceptada el 2026-08-12** y LIM.1 partida en tres rebanadas: **LIM.1a y LIM.1b cerradas** (el dinero extraordinario del mes; Streaming y Suscripciones contra Estilo de vida), LIM.1c pendiente (sugerencias, bloqueada por el ADR 044).
- **Verificado contra** : commit de LIM.1b (2026-08-12); el resto de la sección, contra `8d4a5be` (2026-07-26, DIS.7).

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| Panel completo de la sección | `modules/dominio/presupuesto/view.js` | `renderPanelPresupuesto()` | escribe `#panel-presupuesto`; llama a `_sincronizarBotonEncabezado()` |
| Resumen de los 3 grupos | `modules/dominio/presupuesto/view.js` | `_renderResumenGrupos(anio, mes)` | orden de DOM fijo `['necesidades','ahorro','estilo-de-vida']` (MC.8c) |
| Tarjeta de un grupo | `modules/dominio/presupuesto/view.js` | `_renderGrupoCard()` | decide `estadoVisual`, `claseBarra` y la tercera cifra **por rol**, no por plantilla |
| Detalle de Estilo de vida (topes) | `modules/dominio/presupuesto/view.js` | `_renderDetalleEstiloVida()` | recibe `notasCategoria` (Map categoría → mensaje) |
| Un tope por categoría | `modules/dominio/presupuesto/view.js` | `_renderEnvelope(p, gastos, anio, mes, nota)` | 5.º parámetro = el mensaje de estado que se dibuja dentro del sobre |
| Categorías con gasto y sin tope | `modules/dominio/presupuesto/view.js` | `_renderSinPresupuesto()`, `_puedeTenerTope()` | cada fila **es** el botón que abre el modal precargado |
| Formulario del modal | `modules/dominio/presupuesto/view.js` | `renderFormPresupuesto(actual, categoriaPrecargada)` | FORM.1b: chips + `monto-hero`; al editar, categoría en campo oculto |
| Chips de categoría del form | `modules/dominio/presupuesto/view.js` | `_renderChipsCategoria()` | nativas de `CATEGORIAS_GASTO_USUARIO` + personalizadas de `S.categoriasPersonalizadas` |
| "Olla finita" | `modules/dominio/presupuesto/view.js` | `_renderOllaFinita()` | consume `coberturaLimitesEstiloVida()` |
| Dinero extraordinario del mes | `modules/dominio/presupuesto/view.js` | `_renderExtraordinario(total, presupuestoEV)` | LIM.1a: va debajo de la olla finita y solo con plan del mes (`presupuestoEV > 0`) |
| Suma del extraordinario (puro) | `modules/dominio/presupuesto/logic.js` | `extraordinarioDelMes()` | suma `S.ingresosPuntuales` fechados en el mes; mismo corte que `ejecutadoPorGrupoDelMes` |
| Fijos no esenciales, fuente única | `modules/core/constants.js` | `CATEGORIAS_AGENDA_NO_ESENCIALES` | LIM.1b: Streaming y Suscripciones, lista cerrada del [ADR 014](../DECISIONS/014-taxonomia-categorias-transversal.md) |
| Lado ejecutado (puro) | `modules/dominio/presupuesto/logic.js` | `idsFijosNoEsenciales()` | Set de ids que `ejecutadoPorGrupoDelMes` y `desgloseNecesidadesDelMes` usan para mandar el pago a Estilo de vida |
| Lado asignado (puro) | `modules/dominio/tesoreria/logic/distribucion.js` | `calcularFijosNoEsencialesMensuales()` | subconjunto de `calcularGastosFijosMensuales`; `sugerirDistribucionIngreso` lo resta del piso de Necesidades |
| Panel de alertas del dashboard | `modules/dominio/presupuesto/view.js` | `renderPanelLimites()` | escribe `#panel-limites` en Inicio; **no auditado a fondo en DIS.7** |
| Abrir modal (crear / editar) | `modules/dominio/presupuesto/index.js` | `_nuevoPresupuesto(el)`, `_editarPresupuesto(el)`, `_setTitulo()` | el título del modal se escribe al abrir, como en el resto de los dominios |
| Cableado del formulario | `modules/dominio/presupuesto/index.js` | `_wireForm()` | submit + listener de `change` en `.chips-cat` que actualiza la pista del monto |
| Guardar | `modules/dominio/presupuesto/index.js` | `_guardarPresupuesto(form)` | pasa `S.categoriasPersonalizadas` a `validarPresupuesto` |
| Mensajes por rol (puro) | `modules/dominio/presupuesto/logic.js` | `generarMensajesLimites()` | ids `categoria-<nombre>` para los de categoría; `grupo-*` para los de grupo |
| Progreso y estado de un tope | `modules/dominio/presupuesto/logic.js` | `calcularProgreso()`, `UMBRAL_ALERTA`, `UMBRAL_EXCEDIDO` | 75% / 100% |
| Categorías huérfanas (puro) | `modules/dominio/presupuesto/logic.js` | `categoriasSinPresupuesto()` | agrupa **cualquier** categoría con gasto del mes, incluidas las internas |
| Validación | `modules/dominio/presupuesto/logic.js` | `validarPresupuesto(datos, existentes, idActual, personalizadas)` | 4.º parámetro para las categorías propias del usuario |
| Estilos de la sección | `styles/components/analysis.css` | `.grupos-resumen*`, `.grupo-card*`, `.estilo-limites*`, `.envelope*` | comparte `.analisis-grupo` con Análisis |
| Barra neutra | `styles/components/atoms.css` | `.progress-bar--neutro` | `--fk-text-muted`; no es capa semántica |
| 44px del "+ Límite" de la tarjeta | `styles/responsive.css` | `.estilo-limites__actions .btn` | va acá y no en `analysis.css`: `.btn-sm` a 36px se declara en esta capa, que gana por orden (corolario de R23) |

**Recursos**: símbolos `i-alert`, `i-trending-up`, `i-info`, `i-check-circle`, `i-chevron-right`, `i-edit`, `i-trash`, `i-presupuesto`, más los `c-*` de categoría vía `iconoDeCategoriaGasto()`. Clases nuevas de DIS.7: `.progress-bar--neutro`, `.envelope__nota`, `.envelope-huerfanas__btn`, `.envelope-huerfanas__fija`, `.envelope-huerfanas__motivo`, `.envelope-huerfanas__accion`, `.presupuesto-cat-fija`. Clase nueva de LIM.1a: `.estilo-olla--extra` (con `.estilo-olla__link`), que reusa la anatomía de `.estilo-olla` y el acento de `.grupos-resumen__link`, así que no introduce un par de color nuevo. Estado `S`: `S.presupuestos`, `S.gastos`, `S.ingresos`, `S.ingresosPuntuales`, `S.categoriasPersonalizadas`.

**Dependencias y relaciones**: el "Presupuesto" de cada grupo **no es un dato propio**: sale de `sugerirDistribucionIngreso()` + `construirContextoDistribucion()` de `tesoreria/logic.js`, la misma función que "Distribuir mi ingreso". Sin ingresos registrados no hay plan y la sección cae al estado vacío. Se re-renderiza ante `state:change` de `presupuestos`, `gastos`, `ingresos` o `ingresosPuntuales` (este último lo agregó LIM.1a), y en cada `hashchange`.

**Riesgos**:

- **`.analisis-grupo` es compartido con Análisis.** Toda corrección al desplegable se acota a `.grupo-card__desglose` o se ve también allá (así está hecho el chevron de DIS.7).
- **La barra sin modificador cae al acento de marca** (`--fk-section-accent, --fk-accent`), que significa dinero disponible y logro. Ninguna sección declara `data-dom` en su cuerpo, así que ese fallback nunca resuelve a color de sección: si un grupo debe verse neutro, el neutro se declara (regla R34).
- **`categoriasSinPresupuesto()` no filtra por lo que el formulario puede ofrecer.** Devuelve también las categorías internas ('Deudas', 'Ahorro', que la app escribe sola al registrar un abono o un aporte) y las que CAT.1 movió a Calendario ('Vivienda', 'Servicios públicos'). El filtro vive en la vista (`_puedeTenerTope()`), no en `logic.js`: si se cambia el catálogo, revisar `_MOTIVO_SIN_TOPE`.
- **Un control deshabilitado no entra en `FormData`.** Fue la causa del defecto latente que DIS.7 corrigió: el `<select disabled>` del modo edición dejaba a `validarPresupuesto` sin categoría y guardar un cambio siempre fallaba con "Debes elegir una categoría". La categoría fija viaja ahora en un campo oculto.
- **La aritmética del asignado por grupo no se toca** (**[ADR 045](../DECISIONS/045-base-de-calculo-del-disponible-para-limites.md)**, Aceptada el 2026-08-12): la base es el ingreso recurrente de `estimarSalarioMensual(S.ingresos)` y lo comprometido ya está descontado porque el piso de Necesidades del [ADR 013](../DECISIONS/013-distribucion-automatica-inteligente.md) (fijos + cuotas de deuda) sale del ingreso **antes** de repartir: Estilo de vida es el residuo. Los saldos en cuenta nunca entran (stock contra flujo: el saldo es el ingreso ya contado). Límites no importa `infra/vencimientos.js`.
- **El ingreso es el denominador de todos los pisos**, y el excedente cae en el residuo: cualquier peso que se sume a `ingresoMensual` engorda sobre todo el presupuesto de Estilo de vida y deja el ahorro ideal igual (es un importe absoluto). Por eso el dinero extraordinario de `S.ingresosPuntuales` se informa y no se reparte (ADR 045 D3, rebanada LIM.1a).
- **La clasificación por `compromisoId` tiene una excepción y no se puede leer del gasto** (LIM.1b): el pago de un fijo se guarda con categoría `'Gastos fijos'`, no con la del compromiso, así que saber si era Streaming exige la lista de compromisos. Por eso `ejecutadoPorGrupoDelMes` recibe un 5.º parámetro. Un consumidor nuevo que lo omita vuelve al comportamiento viejo **en silencio**, sin error.
- **Los dos lados de LIM.1b viven en dominios distintos y tienen que moverse juntos:** el ejecutado acá, el asignado en `tesoreria/logic/distribucion.js`. Estilo de vida es el **residuo** de la distribución, así que restar del piso de Necesidades ya se lo entrega; nadie suma nada al presupuesto de Estilo de vida a mano. Si alguna vez deja de ser residuo, esta rebanada se rompe callada.
- **`calcularGastosFijosMensuales` sigue devolviendo el total, no la parte esencial** (decisión de LIM.1b): esa cifra también define el objetivo del fondo de emergencia y Ahorro la replica localmente en `ahorro/index.js`. Restarle ahí los no esenciales habría movido el objetivo del fondo en una superficie y no en la otra. Quien necesite el piso de Necesidades resta con `calcularFijosNoEsencialesMensuales`.
- **`pctFijos` de `sugerirDistribucionIngreso` es el % de los fijos esenciales**, no el de Calendario: es el número que se compara contra lo asignado a Necesidades, y con el total daría falsas alertas de preset. Un usuario con Streaming ve un porcentaje menor al que suman sus fijos en Calendario.

**Cambios pendientes**:

- De LIM.1 queda **LIM.1c** (`docs/board/limites.md`), bloqueada por el ADR 044.
- Los mismos cuatro emoji que DIS.7 sacó de acá siguen en **Análisis, Ajustes e Importar** (lote corto, sin tarjeta).
- El desplegable de **Análisis** sigue dibujando su chevron con el carácter `▾` del `::after`; el de Límites ya no.
- El panel de esta sección en Inicio (`renderPanelLimites`) no se auditó a fondo.
- **LIM.1a no toca el panel de Inicio**: el dinero extraordinario solo se informa en la sección. Si alguna vez debe salir en Inicio, es decisión de producto, no un olvido.

**Cambios realizados**:

- `2026-08-12 LIM.1b`: Streaming y Suscripciones dejan de cargar Necesidades y cuentan contra Estilo de vida, en sus dos lados a la vez (ejecutado acá, asignado en tesorería).
- `2026-08-12 LIM.1a`: la línea de dinero extraordinario del mes en Estilo de vida (`extraordinarioDelMes()` + `_renderExtraordinario()`), informada y sin repartir (ADR 045 D3).
- `2026-07-26 DIS.7`: 9 correcciones de la auditoría de diseño (iconografía, barra neutra, puerta de las categorías sin tope, formulario FORM.1b, 44px, encabezados, mensaje en su sobre, un verbo, título del modal). Detalle en [CHANGELOG](../CHANGELOG.md).

**Observaciones**: el modelo del [ADR 019](../DECISIONS/019-limites-por-rol.md) es lo mejor de la sección y DIS.7 no lo revisa, lo ejecuta mejor. La única propuesta de la auditoría que **sí** lo revisaría (VL1: que Estilo de vida abra la sección en móvil, contra la decisión D4 que fijó el orden) quedó fuera a la espera de decisión explícita. El copy de los mensajes es del D3 del mismo ADR y no se toca: DIS.7 lo mueve de sitio, no lo reescribe.
