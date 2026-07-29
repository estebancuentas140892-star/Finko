# Ficha de contexto: Inversión

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## La sección Inversión: los tres momentos (dominio `inversiones`, DIS.17)

- **Objetivo**          : acompañar a quien está aprendiendo a invertir, no solo registrarle cifras. La sección no lista un portafolio: nombra la etapa en la que está el usuario y le enseña una cosa distinta en cada una. Una inversión se registra **una sola vez**: no tiene aportes, ni recurrencia, ni monto objetivo, así que tampoco tiene barra de progreso (ponerle una sería inventarle una meta que no tiene). El capital solo crece por una vía: el asistente "Distribuir mi ingreso", nunca desde la tarjeta.
- **Estado actual**     : estable. **DIS.17 cerrada** (2026-07-28): el hero de total invertido, la card de proyección al vencimiento, la lista de porcentajes por tipo, la pila de nudges y el tip permanente se fusionaron en `.inversion-momento`, una tarjeta por etapa con el gráfico de dos columnas. Momentos 1 y 2 vivos; el 3 queda diseñado y sin construir por falta de un dato (ver Riesgos). J.2a (total + lista), J.2b (proyección) y J.2c (nudges) siguen siendo el cálculo: DIS.17 cambió quién lo muestra y cómo se dice, no la fórmula.
- **Verificado contra** : DIS.17 (2026-07-28).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| La tarjeta del momento y sus bloques | `modules/dominio/inversiones/view.js` | `_renderMomento()`, `_renderDuo()`, `_renderNotaMomento()`, `_renderAcciones()` | ~72 |
| Qué momento es y qué frase le toca | `modules/dominio/inversiones/logic.js` | `momentoInversion(inversiones, contexto)` | |
| Geometría del gráfico de dos columnas | `modules/dominio/inversiones/logic.js` | `columnasPortafolio(inversiones)` | |
| Explicación y rasgo de cada tipo | `modules/dominio/inversiones/logic.js` | `EXPLICACION_TIPO`, `RASGO_TIPO`, `explicacionTipo()`, `rasgoTipo()` | |
| Fecha de vencimiento de una inversión | `modules/dominio/inversiones/logic.js` | `fechaVencimientoInversion(inv)` | |
| Proyección al vencimiento (J.2b) | `modules/dominio/inversiones/logic.js` | `proyectarInversion(inv)`, `proyectarPortafolio()`, `esProyectable()` | ~279 |
| Rentabilidad real descontando el IPC (E.5) | `modules/dominio/inversiones/logic.js` | `calcularRentabilidadRealPortafolio()`, `tasaPromedioPonderada()` | ~387 |
| Nudges educativos (J.2c) | `modules/dominio/inversiones/logic.js` | `detectarNudgesInversion(inversiones, contexto)` | ~430 |
| Lista de holdings y su tarjeta | `modules/dominio/inversiones/view.js` | `_renderLista()`, `_renderItem()` | |
| Alta y eliminación | `modules/dominio/inversiones/index.js` | `_nuevaInversion()`, `_guardarInversion()`, `_eliminarInversion()` | ~37 |
| Aporte desde "Distribuir mi ingreso" | `modules/dominio/inversiones/index.js` | `EventBus.on('distribucion:aplicar', ...)` | ~117 |
| Fórmulas financieras compartidas | `modules/infra/financiero.js` | `calcularCDT()`, `calcularInteresCompuesto()`, `calcularRentabilidadReal()`, `calcularRegla72()` | |
| Schema de la inversión | `modules/core/state.js` | `S.inversiones[]` (`tipo`, `nombre`, `monto`, `tasaEA`, `plazoMeses`, `fechaInicio`) | |

**Recursos**: estilos en `styles/components/analysis.css` (`.inversion-momento`, `.inversion-lista`, `.inversion-item__*`) y una línea en `styles/responsive.css` (los 44px de `.inversion-momento__secundaria`, que compite con `.btn-sm` de ese mismo archivo). Token de dominio `--fk-dom-inversion` (turquesa, [ADR 031](../DECISIONS/031-identidad-de-color-por-seccion.md)); el gráfico usa cinco mezclas de ese token con `color-mix` vía `data-seg="0..4"`, y el segmento del tiempo es el único a tinta plena. IPC observado y meta de BanRep en `modules/core/constants.js` (`ipcObservadoVigente()`).

**Dependencias y relaciones**: `inversiones` no importa de otros dominios (ADN 10). La vista **lee** `S.ahorro.fondoEmergencia` (solo el slice de estado, sin importar el dominio Ahorro) para pasarle el contexto a `momentoInversion()`. Escucha `EventBus.on('distribucion:aplicar', ...)` para sumar al capital lo que el plan de distribución asignó; el descuento de la cuenta de origen lo centraliza tesorería, no este dominio. `analisis` suma las inversiones al patrimonio vía `calcularActivos()`.

**Riesgos**:

- **El momento 3 no se puede construir y por eso no existe.** "Tu dinero ya trabaja para ti" necesita el **valor real de cada inversión en el tiempo** y la fecha de cada actualización; Finko solo guarda el monto que se puso y la tasa que el usuario escribió, así que la frase no tiene con qué probarse. El conteo sí lo nombra ("momento 1 de 3") y el anticipo del momento 2 fue reescrito para **no prometerlo**. Si alguien agrega ese dato, el momento 3 ya está diseñado (`Arquitectura Inversion - O con grafico propio.dc.html`).
- **`momentoInversion()` consume los nudges, no los reemplaza.** `detectarNudgesInversion()` sigue siendo la única fuente: la concentración y el refuerzo positivo entran en la frase del momento, y el del fondo de emergencia sale como `aviso` porque además decide cuál es la acción principal. Cambiar un `id` de nudge rompe la tarjeta en silencio.
- **Las dos columnas del gráfico comparten escala y tienen que sumar exacto.** Las alturas van en % de la columna de "al vencer" (que vale 100), por eso el `.inversion-momento__stack` **no lleva `gap`**: 2px de separación por segmento descuadraban la comparación (medido: 94 contra 92 px de cuerpo para el mismo dinero). La línea entre segmentos es un `box-shadow`, que no ocupa espacio.
- **Sin nada proyectable la segunda columna no se dibuja.** Un portafolio de puras acciones o cripto no tiene "después", que era la limitación conocida de la arquitectura N. Repetir la primera columna fingiría una comparación, así que en su lugar la nota invita a agregar tasa y plazo.
- **No se puede editar una inversión** (familia de **EDIT.1**): corregir una tasa mal escrita obliga a eliminarla y volver a crearla, perdiendo la fecha de inicio. Es el hallazgo más caro de la sección y no lo resuelve DIS.17.
- **`inversiones` no toca cuentas** (tarjeta **INV.1** y [ADR 053](../DECISIONS/053-invariante-de-patrimonio.md)): comprar un CDT con saldo de una cuenta registrada infla el patrimonio de forma permanente. DIS.17 no lo toca, y su tarjeta sigue siendo dueña de preguntar de dónde sale el dinero al registrar.
- **La retención del 7% solo se modela en el CDT.** `proyectarInversion()` devuelve valor neto para CDT y bruto para el resto (la retención de fondos varía y no se modela). Cualquier cifra que se compare entre tipos arrastra esa asimetría.

**Cambios pendientes**: **el momento 3** y el dato que lo habilita (valor real en el tiempo), que pasa por triaje antes de ser tarjeta. **Editar una inversión** (rebanada de **EDIT.1**): el mockup pone Editar al lado de Eliminar en la tarjeta de cada holding y no se implementó porque el flujo no existe. **INV.1** (de dónde sale el dinero al registrar), ya en [`BOARD.md`](../BOARD.md). El **consolidado del hub** (hallazgo A13) ya no vive acá: DIS.18 lo mudó a la casa de Ahorro y esta sección abre con `.section__volver` ([ADR 056](../DECISIONS/056-la-casa-de-ahorro.md)).

**Cambios realizados**:

- 2026-07-28 (**DIS.17**, arquitectura O con el gráfico de N, auditoría de diseño por secciones): la cabecera pasa de total a etapa, gráfico de dos columnas con la primera partida por tipo, lenguaje reescrito sin tecnicismos, nudges absorbidos en la frase del momento y un solo primario por pantalla. `momentoInversion()`, `columnasPortafolio()`, `fechaVencimientoInversion()`, `rasgoTipo()` y `explicacionTipo()` nuevas en `logic.js`. Ver CHANGELOG.
