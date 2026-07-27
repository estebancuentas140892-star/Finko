# Ficha de contexto: Límites de gasto

> Ver reglas de uso y plantilla en [`README.md`](README.md).
> El dominio se llama `presupuesto` en el código; "Límites de gasto" es el nombre de cara al usuario (para no confundirlo con Apartados: guardar dinero vs. vigilar cuánto sale).

---

## La sección completa: tres grupos con tratamiento asimétrico por rol (MC.8, ADR 019)

- **Objetivo**          : un solo relato por grupo financiero. Necesidades se **monitorea** (neutro), Ahorro se **celebra** (verde de logro) y Estilo de vida se **controla** (único con topes por categoría y alertas). Los topes viven **dentro** de la tarjeta de Estilo de vida, no en un bloque suelto.
- **Estado actual**     : estable. **DIS.7 cerrada** (2026-07-26): las 9 correcciones aplicables de la auditoría de diseño de la sección. La iniciativa **LIM.1** (asistente preventivo de estilo de vida) sigue abierta y no la pisa: DIS.7 abre la puerta que el [ADR 019](../DECISIONS/019-limites-por-rol.md) D2 ya prometía, pero **no sugiere montos**: eso es [ADR 044](../DECISIONS/044-motor-unico-de-sugerencia-por-categoria.md) y LIM.1.
- **Verificado contra** : commit `8d4a5be` (2026-07-26, DIS.7).

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

**Recursos**: símbolos `i-alert`, `i-trending-up`, `i-info`, `i-check-circle`, `i-chevron-right`, `i-edit`, `i-trash`, `i-presupuesto`, más los `c-*` de categoría vía `iconoDeCategoriaGasto()`. Clases nuevas de DIS.7: `.progress-bar--neutro`, `.envelope__nota`, `.envelope-huerfanas__btn`, `.envelope-huerfanas__fija`, `.envelope-huerfanas__motivo`, `.envelope-huerfanas__accion`, `.presupuesto-cat-fija`. Estado `S`: `S.presupuestos`, `S.gastos`, `S.ingresos`, `S.categoriasPersonalizadas`.

**Dependencias y relaciones**: el "Presupuesto" de cada grupo **no es un dato propio**: sale de `sugerirDistribucionIngreso()` + `construirContextoDistribucion()` de `tesoreria/logic.js`, la misma función que "Distribuir mi ingreso". Sin ingresos registrados no hay plan y la sección cae al estado vacío. Se re-renderiza ante `state:change` de `presupuestos`, `gastos` o `ingresos`, y en cada `hashchange`.

**Riesgos**:

- **`.analisis-grupo` es compartido con Análisis.** Toda corrección al desplegable se acota a `.grupo-card__desglose` o se ve también allá (así está hecho el chevron de DIS.7).
- **La barra sin modificador cae al acento de marca** (`--fk-section-accent, --fk-accent`), que significa dinero disponible y logro. Ninguna sección declara `data-dom` en su cuerpo, así que ese fallback nunca resuelve a color de sección: si un grupo debe verse neutro, el neutro se declara (regla R34).
- **`categoriasSinPresupuesto()` no filtra por lo que el formulario puede ofrecer.** Devuelve también las categorías internas ('Deudas', 'Ahorro', que la app escribe sola al registrar un abono o un aporte) y las que CAT.1 movió a Calendario ('Vivienda', 'Servicios públicos'). El filtro vive en la vista (`_puedeTenerTope()`), no en `logic.js`: si se cambia el catálogo, revisar `_MOTIVO_SIN_TOPE`.
- **Un control deshabilitado no entra en `FormData`.** Fue la causa del defecto latente que DIS.7 corrigió: el `<select disabled>` del modo edición dejaba a `validarPresupuesto` sin categoría y guardar un cambio siempre fallaba con "Debes elegir una categoría". La categoría fija viaja ahora en un campo oculto.
- La base de cálculo del "disponible" es el **[ADR 045](../DECISIONS/045-base-de-calculo-del-disponible-para-limites.md)**, abierto: no tocar la aritmética del asignado por grupo sin resolverlo.

**Cambios pendientes**:

- Los mismos cuatro emoji que DIS.7 sacó de acá siguen en **Análisis, Ajustes e Importar** (lote corto, sin tarjeta).
- El desplegable de **Análisis** sigue dibujando su chevron con el carácter `▾` del `::after`; el de Límites ya no.
- El panel de esta sección en Inicio (`renderPanelLimites`) no se auditó a fondo.

**Cambios realizados**:

- `2026-07-26 DIS.7`: 9 correcciones de la auditoría de diseño (iconografía, barra neutra, puerta de las categorías sin tope, formulario FORM.1b, 44px, encabezados, mensaje en su sobre, un verbo, título del modal). Detalle en [CHANGELOG](../CHANGELOG.md).

**Observaciones**: el modelo del [ADR 019](../DECISIONS/019-limites-por-rol.md) es lo mejor de la sección y DIS.7 no lo revisa, lo ejecuta mejor. La única propuesta de la auditoría que **sí** lo revisaría (VL1: que Estilo de vida abra la sección en móvil, contra la decisión D4 que fijó el orden) quedó fuera a la espera de decisión explícita. El copy de los mensajes es del D3 del mismo ADR y no se toca: DIS.7 lo mueve de sitio, no lo reescribe.
