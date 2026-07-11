# Ficha de contexto: Ahorro

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## Fondo de emergencia (dominio `ahorro`, J.1)

- **Objetivo**          : activar/editar un fondo de emergencia con meta en meses de gastos fijos, registrar aportes, definir un compromiso mensual ("págate primero") con sugerencia calculada (AH.2), y mostrar la tasa de ahorro del mes con un nudge según el rango. Alimenta además el consolidado de ahorro del hub (F6, junto con Metas/Apartados/Inversión).
- **Estado actual**     : estable. **BUG-012 corregido** (2026-07-11): el mensaje de confirmación al desactivar el fondo ya no usa el literal técnico "empty state" (ADN 11: lenguaje humano). **Iniciativa "Fondo de emergencia v2"** (brief 2026-07-08, `docs/BOARD.md`) queda pendiente de análisis en **AH.5**.
- **Verificado contra** : commit del fix de BUG-012 (2026-07-11). Primera ficha de esta sección.

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| API pública, acciones, coordinación logic+view | `modules/dominio/ahorro/index.js` | `initAhorro()`, `_activarFondo()`, `_editarFondo()`, `_desactivarFondo()` | ~495, ~258, ~262, ~295 |
| Aportes (registrar/eliminar) | `modules/dominio/ahorro/index.js` | `_nuevoAporte()`, `_eliminarAporte()` | ~320 |
| Compromiso mensual + sugerencia (AH.2) | `modules/dominio/ahorro/index.js` | `_editarCompromisoMensual()`, `_usarAporteSugerido()` | |
| Cálculos puros (objetivo, progreso, colchón, tasa, sugerencia) | `modules/dominio/ahorro/logic.js` | `calcularObjetivoFondo()`, `calcularProgresoFondo()`, `mesesDeColchon()`, `calcularTasaAhorro()`, `calcularAporteSugerido()` | |
| Consolidado de ahorro (hub, F6, ADR 024 D4) | `modules/dominio/ahorro/logic.js` / `view.js` | `consolidarAhorro()`, `renderResumenAhorroConsolidado()` | |
| Render principal (empty state + hero) | `modules/dominio/ahorro/view.js` | `renderAhorro()`, `_renderEmptyState()`, `_renderHero()` | ~44, ~150, ~168 |
| Sección de hábito (aportes + compromiso + nudge de tasa) | `modules/dominio/ahorro/view.js` | `_renderHabitoSection()`, `_renderNudgeTasa()` | ~232, ~294 |
| Formularios modales (fondo, aporte, compromiso) | `modules/dominio/ahorro/view.js` | `renderFormFondo()`, `renderFormAporte()`, `renderFormCompromisoMensual()` | ~341, ~386, ~428 |
| Schema del fondo/aportes | `modules/core/state.js` | `S.ahorro.fondoEmergencia`, `S.ahorro.aportes`, `S.ahorro.compromisoMensual` | |

**Recursos**: estilos en `styles/components/*.css` (clases `.fondo-hero__*`, `.ahorro-habito__*`, `.ahorro-total__*`, `.nudge`); iconos vía sprite (`icon()`, `emptyArt('ahorro')`); token de dominio `--fk-dom-ahorro` (anillo de progreso vía `progressRing()`).

**Dependencias y relaciones**: `ahorro` no importa de otros dominios (ADN 10); `gastosFijosMensuales` y `tasaAhorro` los calcula `index.js` a partir de `S.compromisos`/`S.ingresos`/`S.gastos` recibidos como parámetros de `renderAhorro()`. Escucha `state:change` de `ahorro`, `compromisos`, `ingresos`, `gastos`, `metas`, `apartados` e `inversiones` (el objetivo depende de fijos; el consolidado, de los otros 3 vehículos). Escucha `EventBus.on('distribucion:aplicar', ...)` para sumar aportes del asistente de distribución de Mis Cuentas (MC.7e): el aporte al fondo NO descuenta cuenta (ADR 009, el dinero "se queda" donde está).

**Riesgos**:

- **El aporte al fondo no descuenta saldo de cuenta** (decisión ADR 009, distinta de Metas/Apartados que sí descuentan): el texto `fondo-hero__nota` lo explica en la UI. Cualquier cambio futuro que iguale el comportamiento con Metas/Apartados requiere revisar ese ADR primero.
- **`_desactivarFondo()` conserva los datos** (`activo: false`, no borra `montoActual`/`aportes`): al reactivar, `renderFormFondo` precarga los valores previos. El mensaje de confirmación (corregido en BUG-012) debe seguir comunicando esto sin usar jerga técnica.
- **Lenguaje humano (ADN 11) en mensajes de `confirmar()`**: a diferencia del HTML de las vistas (revisado en cada PR), los textos de `confirmar({ mensaje: ... })` no pasan por ningún linter de copy; un grep periódico de literales técnicos (`empty state`, `placeholder`, `null`, `undefined`, `TODO`) en `index.js`/`acciones/*.js` de todos los dominios es la única red de seguridad hoy (ver Nota de BUGS.md).

**Cambios pendientes**: **AH.5** (rediseño UX educativo del fondo + integración del aporte con "Distribuir mi ingreso" vía el motor de MC.13, `docs/BOARD.md`).

**Cambios realizados**:

- 2026-07-11 (BUG-012): el mensaje de confirmación de `_desactivarFondo()` decía "...la sección vuelve a mostrar el empty state..." (jerga técnica visible al usuario, violaba ADN 11). Cambiado a "...la sección vuelve a mostrar la pantalla inicial para activarlo...". Grep de literales técnicos (`empty state`, `placeholder`, `TODO`, `null`, `undefined`) sobre mensajes/títulos de `confirmar()` en todo `modules/`: este era el único caso real, el resto de coincidencias eran comentarios de código o nombres de variable (`null` como valor de tipo, `placeholder` como atributo HTML legítimo). 1 test unitario nuevo en `tests/unit/ahorro.test.js` (falla sin el fix, verificado con stash). SW v345 → v346.
