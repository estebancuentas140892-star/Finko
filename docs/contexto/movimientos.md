# Ficha de contexto: Movimientos

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## Ledger unificado y accionable (dominio `movimientos`, TX.8a/TX.8b/MOV.1)

- **Objetivo**          : historial único de todo lo que movió dinero, **derivado** de las colecciones que ya existen (no hay log paralelo): `S.gastos`, `S.ingresosPuntuales`, `S.ahorro.aportes` y `S.transferencias`, normalizados a un shape común `Movimiento`. Dos superficies: el panel compacto "Actividad reciente" de Inicio y la vista completa `#movimientos`, agrupada por mes y paginada. Desde MOV.1, cada fila de la vista completa ofrece las acciones (editar/eliminar) que su dominio dueño ya sabe hacer.
- **Estado actual**     : estable. **MOV.1 cerrada** (2026-07-22, hallazgos P4 y P3 de la auditoría de UX/producto). **Amplía deliberadamente el alcance de TX.8b**, que entregó el ledger como solo-lectura: decisión de Esteban del 2026-07-22, registrada aquí y en el CHANGELOG, no revertida en silencio (regla 2.7). Antes: **TX.8a** (dominio nuevo + Actividad reciente en Inicio), **TX.8b** (vista completa en ruta propia), **MC.17c** (transferencias en el ledger, dirección neutra), **MC.17d** (rastro del 4x1000), **PERF.1** (paginación por lotes).
- **Verificado contra** : commit de MOV.1 (2026-07-22). Primera ficha de esta sección.

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Normalización por fuente | `modules/dominio/movimientos/logic.js` | `movimientosDesdeGastos()`, `movimientosDesdeIngresosPuntuales()`, `movimientosDesdeAportes()`, `movimientosDesdeTransferencias()` | ~60, ~81, ~104, ~131 |
| Combinado y ordenado | `modules/dominio/movimientos/logic.js` | `movimientosRecientes()`, `movimientosCompletos()` | ~159, ~179 |
| Panel compacto de Inicio (markup propio) | `modules/dominio/movimientos/view.js` | `renderActividadReciente()` | ~68 |
| Vista completa agrupada por mes | `modules/dominio/movimientos/view.js` | `renderMovimientosCompletos()`, `_agruparPorMes()` | ~319, ~156 |
| Fila del ledger + acciones (MOV.1) | `modules/dominio/movimientos/view.js` | `_renderMovimientoItem()`, `_ACCIONES_POR_TIPO` | ~170 |
| Paginación por lotes (PERF.1) | `modules/dominio/movimientos/view.js` | `_aplanarEntradas()`, `_agregarSiguienteLote()`, `cargarMasMovimientos()` | ~215, ~277, ~304 |
| Re-render por cambio de fuente | `modules/dominio/movimientos/index.js` | `_SECCIONES_FUENTE`, `initMovimientos()` | ~16, ~23 |

**Recursos**: estilos `.list-item*` compartidos (`atoms.css`) y `.movimientos-*`/`.actividad-reciente__*` (`domain.css`); símbolos `i-edit`, `i-trash`, `i-transferencia`; tejas por dominio vía `tejaCategoria(icono, dominio)`.

**Dependencias y relaciones**: `movimientos` **no importa ningún dominio** (ADN 10): los íconos salen de `core/constants.js` y las acciones se delegan por nombre de `data-action`, no por import. `index.js` escucha `state:change` de `_SECCIONES_FUENTE` (`gastos`, `ingresosPuntuales`, `ahorro`, `transferencias`); como `infra/crud.js` emite `state:change` con el nombre de la colección, cualquier alta/edición/borrado en un dominio dueño repinta el ledger solo.

**Riesgos**:

- **`m.dominio` NO es el dueño de los datos, es una etiqueta visual.** Un gasto de categoría "Deudas" o "Gastos fijos" lleva `dominio: 'compromisos'` (para colorear su teja) pero su registro vive en `S.gastos` y lo administra el dominio `gastos`. **Enrutar acciones por `m.dominio` mandaría la acción al dominio equivocado**: el enrutador correcto es **`m.tipo`**, que sí mapea 1:1 con la colección de origen (`gasto`→`S.gastos`, `ingreso`→`S.ingresosPuntuales`, `aporte`→`S.ahorro.aportes`, `transferencia`→`S.transferencias`). La tarjeta MOV.1 del BOARD proponía `m.dominio`; se corrigió en el análisis.
- **El ledger solo expone lo que el dueño ya sabe hacer; no inventa capacidades.** Hoy: `gasto` edita y borra, `ingreso` puntual solo borra, `aporte` solo borra, `transferencia` ninguna. Los huecos son de otras tarjetas (**MC.17f** deshacer transferencia, **EDIT.1** editar donde no existe), y cuando se cierren, basta añadir su entrada en `_ACCIONES_POR_TIPO`: la fila no necesita más cambios.
- **Delegar (y no reimplementar) es lo que preserva la corrección del dinero.** `_eliminarGasto` devuelve el monto al saldo de la cuenta y revierte el abono de la deuda si era un gasto-abono; `_eliminarIngresoPuntual` revierte el crédito a la cuenta. Reimplementar el borrado en el ledger habría perdido esas reversas. Cualquier acción futura debe delegar igual.
- **Las acciones viven solo en la vista completa**, no en "Actividad reciente" de Inicio: son dos renderizadores distintos (`_renderMovimientoItem` vs. el markup propio de `renderActividadReciente`), y el panel de Inicio es un resumen compacto a propósito.
- **La paginación de PERF.1 pinta por lotes con `insertAdjacentHTML`**: cualquier cosa que agregue la fila debe ser HTML autocontenido (sin wiring por `id` ni listeners propios). Las acciones cumplen porque usan `data-action` delegado en `ui/actions.js`, que escucha en `document`.

**Cambios pendientes**: **MOV.2** (búsqueda y filtros en el ledger), **MC.17f** y **EDIT.1** (capacidades que la fila expondrá cuando existan), todas en `docs/BOARD.md`.

**Cambios realizados**:

- 2026-07-22 (**MOV.1**, hallazgos P4 y P3 de la auditoría de UX/producto): la fila del ledger deja de ser solo-lectura. `_ACCIONES_POR_TIPO` (mapa de routing/UI, cero lógica) y `_renderAccionesMovimiento()` nuevos en `view.js`; la fila suma `.list-item__action` con los mismos `data-action` que cada dominio dueño ya registra (`editar-gasto`/`eliminar-gasto`, `eliminar-ingreso-puntual`, `ahorro-eliminar-aporte`). **Cero cambios en `logic.js`, `index.js` y CSS**: el `data-action` delegado en `ui/actions.js` escucha en `document`, así que funciona con el HTML inyectado por lotes de PERF.1, y el repintado ya lo daba `_SECCIONES_FUENTE` + los `state:change` que emite `infra/crud.js`. **La tarjeta del BOARD proponía enrutar por `m.dominio` y se corrigió a `m.tipo` en el análisis** (ver Riesgos: un gasto de categoría "Gastos fijos" lleva `dominio: 'compromisos'` pero vive en `S.gastos`). 8 tests unitarios + 3 E2E nuevos. Verificado en la app real: borrar un gasto de $80.000 desde el ledger devolvió el saldo de $500.000 a $580.000 (reversa aplicada por el handler de Gastos, no por el ledger) y la fila desapareció sola; editar abrió el form de Gastos con el monto cargado; la fila de "Pago: Arriendo" (teja de compromisos) enrutó correctamente a las acciones de gasto; la transferencia no ofreció ninguna. Ver CHANGELOG.
