# Ficha de contexto: Apartados

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## Aportar a un apartado (dominio `apartados`, AP.5a)

- **Objetivo**          : registrar dinero apartado para un gasto esporádico previsible (SOAT, regalos, matrícula...), descontando la cuenta de origen (patrón 0/1/varias de `infra/cuenta-helper.js`, igual que Metas). Desde AP.5a, el monto llega prellenado con el aporte que le toca aportar al usuario según fecha objetivo y frecuencia real de ingresos, en vez de pedirle que lo vuelva a escribir.
- **Estado actual**     : estable. **AP.5a cerrada** (2026-07-22): el "quick win" de mejor relación impacto/esfuerzo de la auditoría de UX/producto (patrón P1, `docs/BOARD.md`). El resto de AP.5 (form v2, toggle "Recurrente") sigue pendiente de análisis.
- **Verificado contra** : commit de AP.5a (2026-07-22). Primera ficha de esta sección.

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Handler que abre el modal de aporte | `modules/dominio/apartados/index.js` | `_abrirAporte()` | ~168 |
| Handler que guarda el aporte (resuelve cuenta, descuenta saldo) | `modules/dominio/apartados/index.js` | `_guardarAporte()` | ~194 |
| Form del aporte (monto prellenado, AP.5a) | `modules/dominio/apartados/view.js` | `renderFormAporteApartado(apartado, sugerencia)` | ~299 |
| Cálculo del aporte sugerido por período | `modules/dominio/apartados/logic.js` | `calcularAporteSugerido(apartado, hoyISO)` | ~195 |
| Progreso (objetivo, actual, %, faltante) | `modules/dominio/apartados/logic.js` | `calcularProgreso(apartado)` | ~138 |
| Motor compartido de frecuencia/período (infra, MC.13b) | `modules/infra/vencimientos.js` | `aportePorPeriodo(faltante, fechaObjetivoISO, frecuencia, hoyISO)` | |
| Alta de apartado (form + hint en vivo, mismo cálculo) | `modules/dominio/apartados/index.js` / `view.js` | `_actualizarSugerenciaLive()`, `renderFormApartado()` | ~135, ~204 |
| Reiniciar ciclo (apartados recurrentes) | `modules/dominio/apartados/index.js` | `_reiniciarApartado()`, `reiniciarCiclo()` (logic.js) | ~92 |
| Plantillas rápidas (SOAT, Regalos...) | `modules/dominio/apartados/logic.js` | `PLANTILLAS_APARTADO` | ~44 |
| Schema del apartado | `modules/core/state.js` | `S.apartados[]` (`montoObjetivo`, `montoActual`, `fechaObjetivo`, `frecuenciaAporte`, `completado`) | |

**Recursos**: estilos en `styles/components/domain.css` (`.apartado-*`); iconos vía el picker compartido (`infra/icon-picker.js`, CAT.2c) o el emoji curado de cada plantilla; token de dominio `--fk-dom-apartados`.

**Dependencias y relaciones**: `apartados` no importa de otros dominios (ADN 10); `frecuenciaPrincipalIngresos` se re-exporta desde `infra/vencimientos.js` para preseleccionar la frecuencia del form al crear. Escucha `EventBus.on('distribucion:aplicar', ...)` para sumar los aportes del asistente de distribución de Mis Cuentas (el descuento de esa cuenta lo centraliza tesorería, no aquí). El descuento de cuenta al aportar manualmente (`_guardarAporte`) sí es local, vía `_ajustarSaldoCuenta()` + `editar('cuentas', ...)`.

**Riesgos**:

- **`calcularAporteSugerido()` devuelve `null` sin `fechaObjetivo`** (el apartado no tiene plazo): el form de aporte cae limpio al comportamiento anterior (campo vacío, sin hint), verificado por test. No romper ese fallback al tocar el cálculo.
- **El helper `_ajustarSaldoCuenta` y el patrón de reparto (`resolverPagoConPreferida`) están duplicados casi carácter por carácter con Metas** (hallazgo P7 de la auditoría de UX/producto, tarjeta **ARQ.1** en el BOARD): cualquier fix aquí probablemente aplica también allá.
- **La sugerencia se recalcula con `hoy()` real, no con la fecha del sistema de un test**: los tests que verifican el prellenado pasan la `sugerencia` ya calculada como objeto literal, no dependen de la fecha del entorno (evita flakiness).

**Cambios pendientes**: el resto de **AP.5** (form v2 con chips de categoría, toggle "Recurrente" fuera del registro inicial), `docs/BOARD.md`.

**Cambios realizados**:

- 2026-07-22 (**AP.5a**, quick win de la auditoría de UX/producto, patrón P1): `_abrirAporte()` calcula `calcularAporteSugerido(apartado, hoy())` (el mismo cálculo que ya alimentaba el hint en vivo del formulario de creación) y lo pasa a `renderFormAporteApartado(apartado, sugerencia)`, que prellena `value` del campo de monto cuando `sugerencia.aportePorPeriodo > 0` y muestra un hint ("Prellenado con lo que te toca aportar {período} para llegar a tiempo. Puedes cambiarlo."). Sin fecha objetivo o con el apartado ya cubierto, el campo queda vacío como antes (sin regresión). El campo sigue siendo un `<input>` editable normal, no readonly. 5 tests unitarios nuevos (`apartados.test.js`). Verificado en la app real: un apartado SOAT con fecha objetivo y $300.000 faltantes por quincena mostró $50.000 prellenado con el hint correcto. Ver también AH.5a (Ahorro) en la misma rebanada, CHANGELOG.
