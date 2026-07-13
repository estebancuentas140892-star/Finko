# Ficha de contexto: Deudas

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## Registro de deudas (dominio `compromisos`, tipo `deuda-entidad`/`deuda-personal`)

- **Objetivo**          : registrar deudas con entidad (banco, tarjeta) o personales (familia, fiado, gota a gota), simular estrategias de pago (Avalancha, Bola de nieve, cuota fija), registrar abonos que descuentan `saldoTotal` y sincronizan la cuenta de origen del pago, y detectar cuándo una cuota no alcanza a cubrir el interés mensual. Comparte el dominio `compromisos` con "Fijos" (tipo `fijo`, vive en Calendario): mismo schema `Compromiso`, tres tipos posibles (`fijo`, `deuda-entidad`, `deuda-personal`).
- **Estado actual**     : estable. **D.14** (2026-07-10) agrega la acreditación opcional de la cuenta de origen al crear una deuda: si el dinero prestado entró a una cuenta del usuario, esa cuenta se acredita automáticamente en el mismo registro (espejo de NAV.A1, ingreso puntual). **BUG-011 corregido** (2026-07-11): el extra tecleado en "Aumenta tu cuota" ya no reestructura la card de estrategia en el siguiente re-render (ver riesgo "estado UI simulado" abajo). **Iniciativa "Deudas v2: de registro a asesor"** (brief 2026-07-08, `docs/BOARD.md`): **D.15 (análisis + re-corte) hecho el 2026-07-12** (ver bloque "Deudas v2 (D.15, diseño)" abajo). **Rediseño visual D.16 ([ADR 036](../DECISIONS/036-deudas-v2-visual.md), handoff de Claude Design del 2026-07-12) en curso**: D.16a (hero con total de deuda) cerrada el 2026-07-12; D.15c fue absorbida por D.16d y D.15a re-cortada a solo copy. D.15d (motor de palanca) sigue como siguiente rebanada funcional tras D.16.
- **Verificado contra** : commit de D.16a (2026-07-12). Antes: análisis D.15 (2026-07-12), fix de BUG-011 (2026-07-11), primera ficha (D.14, 2026-07-10).

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
| Hero con el total de deuda (D.16a, ADR 036) | `modules/dominio/compromisos/views/hero.js` | `renderHeroCompromisos()`, agregado puro `resumenDeudas()` en `logic/modelo.js` | |
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
- **Estado UI simulado vs estructura de la card (lección de BUG-011)**: los inputs de simulación del panel de estrategia (`cambiar-extra-remedio`, `cambiar-renegociar-tasa`, `cambiar-consolidar`) commitean su valor a `_uiEstrategia` en cada tecla A PROPÓSITO (para que el clic en "Aplicar" no compita con un re-render por blur). La contrapartida obligatoria: `renderEstrategiaPago()` decide la ESTRUCTURA de la card (recomendación, detalle, bloque viable/inviable) solo con los datos registrados (`recomendarEstrategia(deudas, 0)`); el extra simulado alimenta únicamente el resumen comparativo dentro de su bloque. Si una futura refactorización (D.15) vuelve a pasar el extra simulado a la decisión estructural, el panel de alternativas desaparecerá al cambiar de pestaña y la card presentará la simulación como aplicada. Tests de regresión: describe "BUG-011" en `tests/unit/compromisos.test.js` + suite "BUG-011" en `tests/e2e/estrategia-pago.test.js`.

**Cambios pendientes**: iniciativa "Deudas v2" re-cortada por D.15 en 5 rebanadas (ver `docs/BOARD.md` y el bloque de diseño abajo): **D.15a** (copy + alerta 2 capas), **D.15b** (editar deuda + reorden del form), **D.15c** (tarjeta con jerarquía visual), **D.15d** (motor de recomendación de palanca, la siguiente a implementar), **D.15e** (botón "Aplicar" en el acelerador del plan viable). Ninguna implementada aún.

---

## Deudas v2 (D.15, diseño 2026-07-12)

> Bloque escrito en la fase de análisis (Opus 4.8), **antes de codificar** (regla 2.6). Documenta el estado real de la sección y el diseño del motor de recomendación de palanca. Las 5 rebanadas (D.15a-e) viven en `docs/BOARD.md`.

**Hallazgo central: dos motores ortogonales, no uno.** La tarjeta de estrategia tiene (o tendrá) dos niveles independientes:
- **Nivel orden** (`recomendarEstrategia`, ya existe y probado): en qué ORDEN pagar las deudas, Avalancha (tasa↓) vs Bola de nieve (saldo↑). No se rehace.
- **Nivel palanca** (D.15d, nuevo): qué ACCIÓN tomar sobre el plan, Aumentar la cuota / Renegociar la tasa / Consolidar. Las 3 simulaciones ya existen (`repartirExtraEnCuotas`, `simularRenegociacion`, `simularConsolidacion`) pero hoy solo se ven dentro del panel "plan inviable" (`_renderPanelAlternativas` en `views/estrategia.js`): un usuario con plan viable nunca las descubre. D.15d las saca a primer plano SIEMPRE y recomienda la principal.

**Motor de recomendación de palanca (D.15d), diseño:**
- Firma pura: `recomendarPalanca(deudas, { ingresoMensual, fijosMensuales })` en `logic/estrategia.js`. NO lee `S` ni importa `tesoreria`: recibe la capacidad como parámetro (la vista la calcula).
- **Capacidad = margen libre real** (decisión de Esteban, 2026-07-12): `capacidad = ingresoMensual − fijosMensuales − Σ cuotas de deuda actuales`. Es el dinero realmente disponible para más pago, no el ingreso bruto.
- Reglas: margen positivo → principal = **Aumentar la cuota** (aprovecha capacidad, conecta con `repartirExtraEnCuotas`); sin margen + al menos una tasa alta → **Renegociar** (baja el costo sin exigir más flujo); varias deudas costosas (≥2 con interés material) → **Consolidar**. Las 3 se muestran siempre, ordenadas por relevancia con pesos visuales distintos (no 3 botones iguales, punto 2 del brief).

**Fuente de la capacidad de ingresos (arquitectura, decisión de Esteban):** `estimarSalarioMensual` hoy vive en `tesoreria/logic/ingresos.js`; `presupuesto/view.js` ya lo importa cruzando dominio (roza ADN 10). Con `compromisos` como 3.º consumidor, D.15d **extrae la función a `infra/financiero.js`** (hogar único sin dueño de dominio) y actualiza los imports de `tesoreria` y `presupuesto`. El barrel `tesoreria/logic.js` puede re-exportarla para no romper consumidores. Esto mantiene el motor puro y ADN 10 limpio.

**Qué NO toca ninguna rebanada** (fuentes únicas externas, ya en el BOARD): iconos de Avalancha/Bola → IV.4; "Otro" con icono+nombre → CAT.2/CAT.3; catálogo entidad→producto → validación D3 del ADR 029. Ninguna rebanada revisa el ADR 019 (esa nota del triaje era para LIM.1, no para Deudas).

**Cambios realizados**:

- 2026-07-12 (D.16a, ADR 036 D1/D7): hero nuevo al tope de `#sec-compromisos` (`#compromisos-hero`, `renderHeroCompromisos()` en `views/hero.js`): "Lo que debes en total" + saldo total de las deudas activas + chip "cuota/mes" + "en N deudas" + ojo de privacidad (`compromisos-saldo-visibilidad`, mismo flag `S.config.ocultarSaldo` de Inicio/Mis cuentas). Agregado puro `resumenDeudas()` en `logic/modelo.js` (solo deudas activas; los fijos del dominio no entran). CSS `.hero-compromisos` en `domain.css` con contraste WCAG medido (oscuro secundario 6.06:1, claro 7.02:1). Sin deudas: "$0" + label de vacío, sin ojo ni chip. 9 tests unitarios nuevos.

- 2026-07-11 (BUG-011): al teclear un monto en "Aumenta tu cuota" (panel de alternativas del plan inviable) y provocar cualquier re-render (cambiar a "Renegociar"/"Consolidar", abrir/cerrar el panel), la card dejaba de mostrar el bloque inviable y presentaba el plan como saneado, sin haber presionado "Aplicar este aumento". La mutación NO era real (los tres `_aplicar*` de `index.js` están detrás de `confirmar()`); era la variante visual: `renderEstrategiaPago()` calculaba `recomendarEstrategia(deudas, extraMensual)` con el extra simulado, y si este volvía viable el plan, el re-render reemplazaba el panel por el acelerador. Fix en `views/estrategia.js`: la estructura se decide con `recomendarEstrategia(deudas, 0)`; con plan viable el extra sigue participando de la recomendación (exploración legítima del acelerador). 5 tests unitarios nuevos (4 fallan sin el fix, verificado con stash) + 2 E2E nuevos con el flujo real de teclado y pestañas. SW v344 → v345 (el bump además propaga IV.3/D.14/CAL.3/MC.14, que habían salido sin bump y no llegaban a PWAs instaladas).

- 2026-07-10 (D.14): al crear una deuda (no al editar), si hay al menos una cuenta activa, se ofrece un checkbox opcional "Recibí este dinero en una de mis cuentas" (apagado por defecto). Al activarlo se revela un selector de cuenta (reutiliza `renderSelectorCuenta()` de `cuenta-helper.js`, mismo componente que usa el ingreso puntual NAV.A1). Al guardar, si se eligió una cuenta, se acredita `saldoTotal` completo a esa cuenta (`_ajustarSaldoCuenta`, espejo exacto del helper de `tesoreria/acciones/ingresos.js`) y se guarda `cuentaOrigenId` + `montoAcreditado` (copia inmutable) en el compromiso. Al eliminar una deuda con `cuentaOrigenId`, se revierte el crédito exacto usando `montoAcreditado` (no `saldoTotal` actual, que pudo bajar por abonos). Sin bump de schema (campos opcionales, `undefined`-safe en registros existentes). 4 tests nuevos en `tests/unit/compromisos.test.js` (bloque ausente sin cuentas, checkbox apagado + selector oculto por defecto, ausente en modo edición, cuentas inactivas no cuentan). 2299/2299 unit verdes, lint verde. **Verificación limitada**: el preview local de este entorno no cargó (mismo problema documentado en IV.3); verificado por trazado de código contra el patrón ya probado de NAV.A1, sin captura en navegador real.
