# Ficha de contexto: Análisis

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## Panel de análisis financiero

- **Objetivo**          : dominio de solo lectura que agrega datos de todos los otros dominios para mostrar salud financiera, patrimonio, tendencia de gastos, distribución por categoría, comparación mes a mes, patrón semanal, hormigas y el monitor de topes de renta (K.3). Es la única capa que importa de múltiples dominios (`analisis/logic.js`), justamente para que ningún otro dominio tenga que importar a otro (ADN 10).
- **Estado actual**     : estable. **PERF.2** (2026-07-06) consolidó y memoizó las derivaciones pesadas de `renderAnalisis()`; sin cambios de comportamiento ni de HTML generado. **ANL.1** (pendiente, `docs/BOARD.md`) propone una revisión UX/UI completa de la sección; no iniciada.
- **Verificado contra** : `af5183e` (2026-07-06, PERF.1); análisis del dominio hecho en PERF.2 (2026-07-06).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Orquestador del render (única entrada) | `modules/dominio/analisis/view.js` | `renderAnalisis()` | ~66 |
| Cómputo consolidado (PERF.2, memoizado) | `modules/dominio/analisis/view.js` | `_calcularDatosAnalisis()`, `_calcularDatosAnalisisMemo` | ~31 |
| Resumen agregado (gastos, compromisos, activos/pasivos, patrimonio, volatilidad) | `modules/dominio/analisis/logic.js` | `generarResumen()` | ~175 |
| Activos / pasivos / patrimonio neto | `modules/dominio/analisis/logic.js` | `calcularActivos()`, `calcularPasivos()`, `calcularPatrimonioNeto()` | ~47, ~77, ~104 |
| Proyección de patrimonio a 6/12/24 meses | `modules/dominio/analisis/logic.js` | `proyectarPatrimonio()`, `proyeccionMultiHorizonte()` | ~123, ~136 |
| Score de salud financiera (3 o 4 factores) | `modules/dominio/analisis/logic.js` | `calcularScoreSalud()`, `clasificarScore()` | ~254, ~332 |
| Serie temporal de gastos (sparkline, 12 meses) | `modules/dominio/analisis/logic.js` | `serieGastosMensual()` | ~357 |
| Distribución por categoría (donut) | `modules/dominio/analisis/logic.js` | `seriePorCategoria()` | ~385 |
| Comparación vs mes anterior (G.2) | `modules/dominio/analisis/logic.js` | `calcularComparacionCategorias()` | ~435 |
| Patrón de gasto semanal (G.2) | `modules/dominio/analisis/logic.js` | `detectarPatronGastoSemanal()` | ~529 |
| Monitor de topes de renta (K.3, 5 criterios UVT) | `modules/dominio/analisis/logic.js` | `calcularEstadoRenta()`, `detectarNudgesRenta()`, `patrimonioBruto()`, `totalGastosAnio()` | ~699, ~783, ~629, ~643 |
| Render del monitor de renta (no memoizado, ver Riesgos) | `modules/dominio/analisis/view.js` | `_renderEstadoRenta()` | ~129 |
| Re-render por sección observada + al navegar a `#analisis` | `modules/dominio/analisis/index.js` | `initAnalisis()`, `SECCIONES_OBSERVADAS` | |
| Gráficos SVG (sparkline, donut) | `modules/infra/svg.js` | `sparkline()`, `donut()`, `colorearSegmentos()`, `progressRing()` | |
| Grupo colapsable de detalle (comparación, patrón semanal, hormigas) | `modules/dominio/analisis/view.js` | `_renderGrupoColapsable()` | ~77 |

**Recursos**: estilos en `styles/components/analysis.css` (bento, métricas, salud, patrimonio, proyección, panel completo); constantes fiscales `UVT`, `TOPES_RENTA_UVT`, `UMBRAL_ALERTA_RENTA` en `core/constants.js`.

**Dependencias y relaciones**: `analisis/logic.js` importa de `gastos/logic.js`, `compromisos/logic.js`, `tesoreria/logic.js`, `metas/logic.js`, `apartados/logic.js`, `inversiones/logic.js` (única excepción documentada a ADN 10, por diseño: es la capa de agregación cross-dominio). `analisis/index.js` escucha `state:change` para `gastos`, `compromisos`, `cuentas`, `metas`, `ahorro` (`SECCIONES_OBSERVADAS`) y re-renderiza vía `renderSmart()` (corta si la sección activa no es `#analisis`). Ver [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) sección 2.4.

**Riesgos**:

- **`_renderEstadoRenta(anio)` no está memoizado**: llama `calcularEstadoRenta(S, anio)` directo en cada `renderAnalisis()`, que a su vez hace su propio barrido de `totalGastosAnio(gastos, anio)` (otro O(gastos) independiente del bundle memoizado por PERF.2). Es un solo barrido (no los ~15 del bundle principal), así que se dejó fuera del alcance de PERF.2 a propósito; candidato para una fase futura si se vuelve significativo.
- **El bundle memoizado (`_calcularDatosAnalisisMemo`) invalida por sección completa, no por campo**: cualquier `state:change` de `gastos`/`compromisos`/`cuentas`/`metas`/`apartados`/`inversiones` fuerza un recálculo del panel entero, aunque el cambio no afecte, por ejemplo, la serie de 12 meses. Es una sobre-invalidación deliberada (nunca sirve datos obsoletos) documentada en `modules/infra/memo.js`.
- **ANL.1 (pendiente, sin iniciar)**: si esa revisión UX reestructura qué se calcula y en qué orden, revisar si el bundle consolidado de PERF.2 sigue teniendo sentido tal cual o conviene partirlo por sub-sección.

**Cambios pendientes**: ninguno propio de PERF.2. **ANL.1** (revisión UX/UI completa) vive en `docs/BOARD.md`, sin iniciar.

**Cambios realizados**:

- 2026-07-06 (PERF.2, auditoría de rendimiento): `renderAnalisis()` hacía ~7 llamadas de primer nivel (cada una con sub-barridos propios, ej. `serieGastosMensual` recorre 12 meses llamando `totalGastosMes` cada uno) sobre `S.gastos`/`S.compromisos`/etc. en cada `state:change` relevante, incluso cuando el mismo panel se repintaba sin que esos datos hubieran cambiado (ej. `renderAll()`, o dos listeners reaccionando a una misma acción del usuario). Se consolidaron todas esas llamadas en `_calcularDatosAnalisis()` (una sola función que devuelve `{ resumen, serieGastos, segmentosCat, comparacion, patronSemanal }`) y se envolvió con `memoizar()` (`infra/memo.js`, nuevo): cachea contra la identidad de los arrays de entrada + un contador de revisión por sección alimentado por `EventBus` (`state:change`), sin Proxies ni observers sobre `S` (ADN 4). `renderAnalisis()` sigue escribiendo `el.innerHTML` en cada llamada (el cacheo es solo de cómputo, nunca de DOM), así que el HTML resultante es idéntico con o sin cache hit. Mismo mecanismo aplicado a `resumenSemanal()` (`resumen/view.js`) y a `movimientosRecientes()`/`movimientosCompletos()` (`movimientos/view.js`, con un `extraerClave` propio porque esos callers pasan un objeto envoltorio nuevo en cada llamada). Medido con `pnpm perf`: en la llamada "fría" (recálculo genuino, cache miss forzado) el costo no cambia respecto a la línea base de PERF.0/PERF.1; en la llamada "caché" (repetición sin cambios reales) Análisis pasa de ~5-20 ms a ~3-5 ms **planos**, sin crecer con el volumen de historial. 10 tests nuevos en `tests/unit/memo.test.js` (cache hit/miss por referencia, por sección observada/no observada, `extraerClave` con envoltorio). 2219/2219 unit + 151/151 E2E verdes. SW v331 → v332.
