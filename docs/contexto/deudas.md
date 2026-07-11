# Ficha de contexto: Deudas

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## Registro de deudas (dominio `compromisos`, tipo `deuda-entidad`/`deuda-personal`)

- **Objetivo**          : registrar deudas con entidad (banco, tarjeta) o personales (familia, fiado, gota a gota), simular estrategias de pago (Avalancha, Bola de nieve, cuota fija), registrar abonos que descuentan `saldoTotal` y sincronizan la cuenta de origen del pago, y detectar cuándo una cuota no alcanza a cubrir el interés mensual. Comparte el dominio `compromisos` con "Fijos" (tipo `fijo`, vive en Calendario): mismo schema `Compromiso`, tres tipos posibles (`fijo`, `deuda-entidad`, `deuda-personal`).
- **Estado actual**     : estable. **D.14** (2026-07-10) agrega la acreditación opcional de la cuenta de origen al crear una deuda: si el dinero prestado entró a una cuenta del usuario, esa cuenta se acredita automáticamente en el mismo registro (espejo de NAV.A1, ingreso puntual). **Iniciativa "Deudas v2: de registro a asesor"** (brief 2026-07-08, `docs/BOARD.md`) queda pendiente de análisis en **D.15**, bloqueada hasta que cierre IV.2 (la jerarquía visual nueva de las tarjetas depende de la base de color desplegada).
- **Verificado contra** : commit de D.14 (2026-07-10). Primera ficha de esta sección.

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| API pública, handlers de acción, wiring de formularios | `modules/dominio/compromisos/index.js` | `_guardarCompromiso()`, `_editarCompromiso()`, `_eliminarCompromiso()`, `_elegirTipoDeuda()`, `_mostrarChooser()` | ~85, ~141, ~218, ~247, ~236 |
| Toggle Fiado (D.13, oculta cuota/tasa/frecuencia) | `modules/dominio/compromisos/index.js` | `_wireToggleFiado()` | ~180 |
| Toggle cuenta de origen (D.14) | `modules/dominio/compromisos/index.js` | `_wireToggleOrigen()` | ~210 |
| Acreditar/revertir saldo de cuenta (D.14, espejo de `tesoreria/acciones/ingresos.js`) | `modules/dominio/compromisos/index.js` | `_ajustarSaldoCuenta()` | ~67 |
| Validación del formulario de compromiso | `modules/dominio/compromisos/logic/modelo.js` | `validarCompromiso()` | ~211 |
| Normalización (form crudo → shape de `S.compromisos`) | `modules/dominio/compromisos/logic/modelo.js` | `normalizarCompromiso()` | ~346 |
| Alerta de deuda creciente (cuota no cubre interés) | `modules/dominio/compromisos/logic/modelo.js` | `detectarDeudaCreciente()` | ~301 |
| Aritmética de abonos (ADR 002: abono descuenta cuenta + `saldoTotal`) | `modules/dominio/compromisos/logic/abonos.js` | `aplicarAbonoASaldo()`, `revertirAbonoDeSaldo()`, `ajustarMontoAbono()`, `validarAbono()` | |
| Simulación de estrategias (Avalancha, Bola de nieve, consolidación, renegociación) | `modules/dominio/compromisos/logic.js` (barrel) | `filtrarDeudasPagables()`, `compararEstrategias()`, `simularRenegociacion()`, `simularConsolidacion()`, `repartirExtraEnCuotas()` | |
| Form tailored entidad/personal (paso 2 del modal) | `modules/dominio/compromisos/views/formularios.js` | `renderFormDeuda(tipo, deuda)` | ~148 |
| Form de abono | `modules/dominio/compromisos/views/formularios.js` | `renderFormAbono()` | |
| Chooser de tipo (paso 1 del modal) | `modules/dominio/compromisos/views/formularios.js` | `renderChooserCompromiso()` | |
| Lista de deudas activas | `modules/dominio/compromisos/views/lista.js` | `renderListaCompromisos()` | |
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

**Cambios pendientes**: **D.15** (análisis + re-corte de la iniciativa "Deudas v2", `docs/BOARD.md`), bloqueada hasta cerrar IV.2. Dentro de esa iniciativa: alerta de 2 capas, recomendación de estrategia según capacidad de ingresos, copy motivador en simulaciones, BUG-011 (simulaciones se aplican sin confirmar explícito), editar deuda completa, jerarquía visual de la tarjeta, botón "Aplicar" en el simulador de pago extra.

**Cambios realizados**:

- 2026-07-10 (D.14): al crear una deuda (no al editar), si hay al menos una cuenta activa, se ofrece un checkbox opcional "Recibí este dinero en una de mis cuentas" (apagado por defecto). Al activarlo se revela un selector de cuenta (reutiliza `renderSelectorCuenta()` de `cuenta-helper.js`, mismo componente que usa el ingreso puntual NAV.A1). Al guardar, si se eligió una cuenta, se acredita `saldoTotal` completo a esa cuenta (`_ajustarSaldoCuenta`, espejo exacto del helper de `tesoreria/acciones/ingresos.js`) y se guarda `cuentaOrigenId` + `montoAcreditado` (copia inmutable) en el compromiso. Al eliminar una deuda con `cuentaOrigenId`, se revierte el crédito exacto usando `montoAcreditado` (no `saldoTotal` actual, que pudo bajar por abonos). Sin bump de schema (campos opcionales, `undefined`-safe en registros existentes). 4 tests nuevos en `tests/unit/compromisos.test.js` (bloque ausente sin cuentas, checkbox apagado + selector oculto por defecto, ausente en modo edición, cuentas inactivas no cuentan). 2299/2299 unit verdes, lint verde. **Verificación limitada**: el preview local de este entorno no cargó (mismo problema documentado en IV.3); verificado por trazado de código contra el patrón ya probado de NAV.A1, sin captura en navegador real.
