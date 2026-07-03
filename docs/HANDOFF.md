# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-03 (fix(tesoreria): copy de la cuota de manejo corregido y validaciones rechazan Infinity, BUG-007 y BUG-008)

**Producción:** https://finko-brown.vercel.app
**Repositorio:** https://github.com/estebancuentas140892-star/Finko

---

## 1. Qué es Finko

PWA offline-first de gestión financiera personal para Colombia.
Vanilla JS puro + ES6 modules. Sin framework, sin build step, sin servidor, sin cuenta.
Todo vive en `localStorage` (clave `fk_v1`). Pensada para personas con poco conocimiento
financiero: lenguaje simple, normativa colombiana (SMMLV, UVT, tasa de usura, GMF).

**Versión actual:** `v1.0.0` - todas las 14 fases originales completadas y cerradas.
**Rama principal:** `main`.

---

## 2. Estado técnico actual

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 1870/1870 verdes |
| Tests E2E | 106/106 verde. Suites: `smoke` 70 tests, `estrategia-pago` 15 tests, `ahorro-inversion` 9 tests, `navegacion-render` 6 tests, `install-prompt` 6 tests. |
| Schema version (localStorage) | v20 |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### fix(tesoreria): copy de la cuota de manejo corregido y validaciones rechazan Infinity (BUG-007, BUG-008) · 2026-07-03

Cierra los dos bugs de baja prioridad de la revisión de Mis cuentas. **BUG-007:** el hint de la cuota de manejo prometía verla "en Deudas", copy desactualizado desde la reestructuración v6 (los fijos, incluida la cuota de manejo, viven en Calendario). Fix: "Lo verás en Calendario." **BUG-008:** `validarIngreso()` y `validarCuenta()` usaban `isNaN(x) || x <= 0`, que no rechaza `Infinity` (`isNaN(Infinity) === false`); un monto como `'1e999'` pasaba la validación y contaminaba la distribución sugerida, y al persistir quedaba serializado como `null`. Fix: los 3 guards de monto/saldo cambian a `!Number.isFinite(x)`.

El alcance de BUG-008 se mantuvo en tesorería, tal como quedó registrado originalmente; no se extendió a otros dominios (cambio de alcance no pedido).

Verificado con 4 tests unitarios nuevos (Infinity rechazado en monto de ingreso, saldo de cuenta positivo/negativo, monto de cuota de manejo). Sin E2E nuevo: no había aserciones que actualizar. 1866/1866 → 1870/1870 unit; 106/106 E2E sin cambios. Lint limpio. SW v267 → v268. **Mis cuentas queda sin bugs pendientes salvo BUG-009** (media, sobrepago combinando cuota del checklist + abono extra en la misma deuda; requiere decisión de diseño).

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/view.js` | Copy de la cuota de manejo corregido. |
| `modules/dominio/tesoreria/logic.js` | `validarIngreso()`/`validarCuenta()`: `isNaN` → `!Number.isFinite` en 3 guards. |
| `tests/unit/tesoreria.test.js` | 4 tests nuevos (BUG-008). |
| `service-worker.js` | v267 → v268. |

---

### fix(compromisos): el abono extra a deudas desde "Distribuir mi ingreso" registra el gasto (BUG-006) · 2026-07-03

Cuarto bug de la revisión de Mis cuentas (prioridad media). El abono extra a una deuda desde el panel de distribución bajaba el `saldoTotal` y descontaba la cuenta, pero no creaba el gasto-abono: el handler de `distribucion:aplicar` en compromisos solo hacía `editar('compromisos', ...)`. El abono quedaba invisible para Análisis, para el ejecutado de Límites y para el guard "ya pagado este periodo". Fix: el handler crea el gasto con el mismo shape que el abono individual y que `_aplicarNecesidad` (categoría "Deudas", `compromisoId`, `cuentaId`), leyendo `cuentaOrigenId` del evento (ya viajaba). Sigue sin tocar la cuenta (tesorería centraliza el descuento vía `descontable`), así que no hay doble descuento; la slice `gastos` ya estaba en `_SLICES_DISTRIBUCION`, así que Deshacer revierte el nuevo gasto.

**BUG-009 detectado al implementarlo (registrado, no corregido):** una misma deuda aparece a la vez en el checklist (su cuota) y en "Abonar extra"; marcar ambos con montos cercanos al saldo sobrepaga (la cuenta se debita `cuota + extra`, la deuda solo baja hasta 0). Preexistente en la matemática de la cuenta; el fix solo lo hizo visible. Requiere decisión de diseño, por eso se registró en vez de ampliar el alcance.

Verificado con 2 E2E nuevos en Chromium real (el abono extra crea el gasto con shape correcto, baja la deuda y descuenta la cuenta una sola vez; Deshacer lo revierte). El fix vive en un handler de EventBus (capa index.js, no cubierta por unit tests), de ahí la verificación E2E. El preview interactivo sirvió un módulo cacheado de sesión previa (documentado en la memoria del entorno; el servidor sí sirve el código nuevo, confirmado por fetch), así que la E2E en Chromium fresco es la verificación autoritativa. 1866/1866 unit; 104/104 → 106/106 E2E. Lint limpio. SW v266 → v267. **Quedan en Mis cuentas: BUG-007, BUG-008 (bajas) y BUG-009 (media, decisión de diseño).**

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/index.js` | El handler de `distribucion:aplicar` crea el gasto-abono y lee `cuentaOrigenId`; importa `hoy`. |
| `tests/e2e/smoke.test.js` | Suite nueva "abono extra a deudas (BUG-006)", 2 tests. |
| `service-worker.js` | v266 → v267. |

---

### fix(tesoreria): la cuota de manejo cuenta como gasto fijo mensual (BUG-005) · 2026-07-03

Tercer bug de prioridad alta de la revisión de Mis cuentas. El compromiso que Finko crea al marcar "esta cuenta cobra cuota de manejo mensual" (`esCuotaManejo: true`) nacía con `frecuencia: 'mensual'` en minúscula, pero todo el resto de la app compara contra `'Mensual'` (catálogo `FRECUENCIAS`, tablas `_FACTOR_MENSUAL`/`FACTOR_MENSUAL`). Efecto: una cuota fantasma que no sumaba en gastos fijos mensuales, no entraba en el modelo de distribución ni en el objetivo del fondo, no aparecía en el checklist de Necesidades y proyectaba $0 en Deudas (solo se veía en Calendario, por el fallback de frecuencia desconocida de Agenda). Fix en dos partes: `compromisoDesdeCuotaManejo()` escribe `'Mensual'` para las cuotas nuevas, y una **migración idempotente v19 → v20** en storage.js capitaliza las ya guardadas (`SCHEMA_VERSION` 19 → 20). Como todas las migraciones, corre en memoria en cada `loadData()` y persiste en el siguiente `save()`. Por diseño la cuota ahora aparece como Necesidad marcable en "Distribuir mi ingreso" (es una obligación mensual real). Observación menor preexistente, no corregida: el resumen de la tarjeta de distribución redondea a % entero, así que una necesidad de $15.000 sobre $3M (0,5%) se ve como 1% · $30.000 en el agregado, aunque el checklist muestra el monto exacto.

Verificado con 6 tests unitarios nuevos (4 de migración, 2 de integración) + shape actualizado + 1 E2E en Chromium real (carga estado v19, verifica checklist tras migración y persistencia al confirmar). Verificación en vivo en el preview. 1861/1861 → 1866/1866 unit; 103/103 → 104/104 E2E. Lint limpio. SW v265 → v266. **Quedan en Mis cuentas: BUG-006 (media), BUG-007 y BUG-008 (bajas).**

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `compromisoDesdeCuotaManejo()` escribe `frecuencia: 'Mensual'`. |
| `modules/core/storage.js` | Migración v19 → v20 (capitaliza cuotas de manejo guardadas); `SCHEMA_VERSION` 19 → 20. |
| `tests/unit/storage.test.js` | 4 tests de la migración v19 → v20. |
| `tests/unit/tesoreria.test.js` | Shape a `'Mensual'`; 1 test de integración. |
| `tests/e2e/smoke.test.js` | 1 test nuevo (migración + checklist + persistencia). |
| `service-worker.js` | v265 → v266. |

---

### fix(tesoreria): el checklist de Necesidades no vuelve a pagar lo ya pagado ni sobrepaga deudas (BUG-003, BUG-004) · 2026-07-03

Corrige los dos bugs de prioridad alta de la revisión exhaustiva de Mis cuentas del mismo día (entrada siguiente en esta lista). **BUG-003:** un checkbox `checked disabled` (fila "Ya pagado" del checklist) sigue reportando `.checked === true`; `_leerNecesidadesMarcadas()` filtraba solo por eso, así que confirmar la distribución con una fila ya pagada presente la volvía a pagar (segundo gasto, segundo descuento de cuenta). Fix: el filtro exige además `!chk.disabled`. **BUG-004:** el checklist ofrecía y registraba la cuota completa de una deuda sin toparla contra su saldo pendiente, y no excluía deudas ya saldadas (`saldoTotal <= 0`). Fix: `monto = Math.min(cuotaMensual, saldoTotal)` y el filtro de entrada exige `saldoTotal > 0`, mismo criterio que ya usan las filas de "Abonar extra a deudas" del mismo panel.

Verificado con 4 tests unitarios nuevos (tope de cuota activo/inactivo, exclusión de deuda saldada, exclusión de saldo negativo) más 2 E2E en Chromium real que reproducen los escenarios exactos de los bugs. Verificación adicional en vivo en el preview interactivo (cargó sin problemas esta vez): confirmé la distribución con las tres condiciones a la vez (fijo ya pagado + deuda con cuota mayor al saldo + deuda saldada) y el saldo final, el conteo de gastos y el saldo de la deuda coincidieron con lo esperado. 1857/1857 → 1861/1861 unit; 101/101 → 103/103 E2E. Lint limpio. SW v264 → v265.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/index.js` | `_leerNecesidadesMarcadas()` agrega `&& !chk.disabled` al filtro. |
| `modules/dominio/tesoreria/logic.js` | `construirDesgloseNecesidades()` topa el monto de deuda a `saldoTotal` y excluye deudas saldadas. |
| `tests/unit/tesoreria.test.js` | `compDeudaBase()` gana `saldoTotal` por defecto; 4 tests nuevos. |
| `tests/e2e/smoke.test.js` | 2 tests nuevos: BUG-003 y BUG-004. |
| `service-worker.js` | v264 → v265. |

---

### feat(tesoreria): Necesidades pasa a checklist accionable en Distribuir mi ingreso (MC.7d, slice 1) · 2026-07-03

Primer slice de MC.7d, implementando R1/R4/R5 de la revisión 2026-07-02 de [ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md). El desglose de Necesidades del panel "Distribuir mi ingreso" (antes un `<details>` de solo lectura, MC.7c) pasa a ser una checklist: el usuario marca los gastos fijos y cuotas de deuda que cubre con este ingreso, y al confirmar cada marca registra exactamente el mismo pago que su flujo individual existente (pago de fijo como "Marcar pagado" de Agenda, cuota de deuda como abono), coherente con badges, Análisis y el ejecutado de Límites (ADR 017). **Alcance de este slice, decidido con el usuario:** solo fijos con frecuencia Mensual y deudas entran a la checklist; un fijo Quincenal/Semanal/Diario tiene más de una ocurrencia por periodo y una sola fila no puede representarlas sin pagar de más o de menos, así que quedan fuera hasta una tarea futura que modele sus vencimientos (mismo problema que ya resolvió `eventosDelMes` de Agenda). El shell de asistente paginado (avanzar/atrás) y el recálculo de Ahorro sobre el remanente real (R3) quedan pendientes en tarjetas separadas del BOARD.

En [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js), `construirDesgloseNecesidades(compromisos, gastos, hoy)` gana dos parámetros: ahora filtra solo fijos Mensuales (antes mensualizaba Quincenal/Semanal/Diario con `_FACTOR_MENSUAL`, comportamiento que la revisión de ADR descartó por el riesgo de marcar como "pagado" un periodo cubierto solo a medias) y agrega `diaPago` y `pagado` por fila. Nuevas privadas `_prefijoMes()` y `_pagadoEstePeriodo()` duplican el guard de `estadoPagoMes` de compromisos/logic.js (mismo criterio del badge "Ya pagaste este mes" de Agenda: cualquier gasto vinculado alcanza para un fijo, la suma de abonos debe cubrir `cuotaMensual` para una deuda); duplicado intencional, no importación cruzada (ADN #10). El orden pone primero los no pagados (de mayor a menor monto).

En [tesoreria/view.js](../modules/dominio/tesoreria/view.js), nueva `_filaNecesidad()` reemplaza el `<details>` de `_renderDesgloseNecesidades()` (eliminada): checkbox + nombre + categoría + día de pago + monto (no editable: es una obligación real, no una asignación libre); si `pagado`, el checkbox nace marcado y deshabilitado con "Ya pagado" en vez del monto. `_renderPanelDistribuir()` mueve la sección de Necesidades del bloque "Esto queda en tu cuenta (no se mueve)" a una sección accionable propia, primero en el panel (Paso 1 antes que Ahorro/Deudas/Inversiones); la fila informativa de Estilo de vida es lo único que queda en "no se mueve". El panel ahora también aparece cuando solo hay Necesidades (antes exigía al menos un destino de ahorro/deuda/inversión).

En [tesoreria/index.js](../modules/dominio/tesoreria/index.js): nueva `_leerNecesidadesMarcadas()` (lee `[data-nec-toggle]`, monto fijo en `data-nec-monto`, no editable) se suma a `_leerItemsDistribucion()` en `_recalcularDistribucion()` para que el resumen en vivo incluya ambos; nueva `_aplicarNecesidad()` escribe directo en `'gastos'` (mismo patrón que Agenda y Compromisos: `gastos`/`cuentas` son un ledger compartido que cualquier dominio edita con `guardar`/`editar` de crud.js, no una violación de ADN #10) y descuenta `saldoTotal` para deudas; `_confirmarDistribucion()` la invoca por cada Necesidad marcada, dentro de la misma confirmación única que ya aplicaba Ahorro/Deudas/Inversiones. **Hallazgo de R4 aplicado:** `_SLICES_DISTRIBUCION` no incluía `'gastos'`; como este slice hace que el Paso 1 cree gastos, se agregó, o "Deshacer" habría dejado pagos huérfanos.

**Bug encontrado y corregido durante la verificación E2E:** los primeros tests fallaban con el saldo/gasto sin persistir tras confirmar, pese a que el código corría sin errores (verificado con logging temporal en el código fuente). Causa: `save()` está debounced 200ms (ADN #5) y los tests leían `localStorage` inmediatamente después del click, antes del flush. No era un bug de la lógica de negocio: se corrigió agregando `page.waitForTimeout(400)` antes de leer `localStorage` en los tests de confirmar/deshacer, mismo patrón ya usado en otros E2E del proyecto que verifican persistencia.

Verificado con 13 tests unitarios nuevos/reescritos (`construirDesgloseNecesidades` con fijos Mensuales, exclusión de Quincenal/Semanal/Diario, estado `pagado` por gasto del periodo, orden con pagados al final) más 4 E2E en Chromium real (checklist con día de pago y exclusión correcta; fila ya pagada deshabilitada; confirmar registra el mismo gasto que el flujo individual y descuenta la cuenta; Deshacer restaura saldo y borra el gasto). El preview interactivo del entorno no cargó la app (`chrome-error://chromewebdata/`, problema conocido de este entorno); la verificación se apoyó en E2E con Chromium real. 1851/1851 → 1857/1857 unit; 98/98 → 101/101 E2E. Lint limpio. SW v263 → v264.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `construirDesgloseNecesidades()` gana `gastos`/`hoy`, filtra solo fijos Mensuales, agrega `diaPago`/`pagado`; nuevas privadas `_prefijoMes()`, `_pagadoEstePeriodo()`. |
| `modules/dominio/tesoreria/view.js` | Nueva `_filaNecesidad()` (reemplaza `_renderDesgloseNecesidades()`); `_renderPanelDistribuir()` mueve Necesidades a sección accionable propia (Paso 1). |
| `modules/dominio/tesoreria/index.js` | Nuevas `_leerNecesidadesMarcadas()`, `_aplicarNecesidad()`; `_confirmarDistribucion()` aplica los pagos marcados; `_SLICES_DISTRIBUCION` suma `'gastos'`; listener de `change` para `[data-nec-toggle]`. |
| `styles/components/forms.css` | Nueva `.distribuir__fila--pagado`, `.distribuir__nec-monto`; clases muertas del `<details>` eliminadas. |
| `tests/unit/tesoreria.test.js` | `construirDesgloseNecesidades` reescrito: 13 tests (exclusión por frecuencia, `pagado`, `diaPago`, orden). |
| `tests/e2e/smoke.test.js` | Suite "Distribuir mi ingreso: checklist de Necesidades" reemplaza el test de MC.7c; 4 tests nuevos. |
| `service-worker.js` | v263 → v264. |

---

> Para tareas anteriores (docs(revision) Mis cuentas, docs(adr) ADR 018 revisión, AG.4, AG.2, AG.7, AG.6, AG.5, MT.4, MT.5, MT.3, MT.1, IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

---

## 4. Mantenimiento y producción

**App en producción estable:** https://finko-brown.vercel.app (Lighthouse 99-100, cero deuda técnica conocida).

La lista completa y vigente de tareas de mantenimiento y features opcionales vive en [`docs/BOARD.md`](BOARD.md) (secciones "Mantenimiento" y por sección de la app). Esta sección solo guarda el procedimiento detallado de la tarea recurrente más delicada.

> **Importante para futuros desarrolladores:** Antes de instalar dependencias o configurar
> un nuevo entorno, leer [`docs/SECURITY.md`](SECURITY.md). Incluye política anti-malware npm,
> guía de migración a **pnpm** con defensas (`minimum-release-age`, `only-built-dependencies`),
> y el audit de seguridad realizado el 2026-05-18.

### Recordatorio enero 2027 - E.2-2027

> Desde la refactorización a tabla histórica, **no se crean exports `_2027`**: basta con agregar UNA entrada en `LEGAL_POR_ANIO`. Toda la app (UI, cálculos, tests) y el aviso de vigencia de P1 dejan de marcar "desactualizado" en cuanto la entrada existe.

**Qué hacer:**
1. Visita [DIAN UVT](https://www.dian.gov.co/) y [Mintrabajo SMMLV](https://www.mintrabajo.gov.co/)
2. Obtén los valores oficiales 2027 (SMMLV, auxilio de transporte, UVT) con sus decretos/resoluciones.
3. En `modules/core/constants.js`, reemplaza `2027: null` por una entrada completa:
   ```javascript
   2027: {
     smmlv:             <nuevo_valor>,
     auxilioTransporte: <nuevo_valor>,
     uvt:               <nuevo_valor>,
     vigenciaDesde: '2027-01-01',
     fuentes: { smmlv: '...', auxilio: '...', uvt: '...' },
   },
   ```
4. Tests (`pnpm test` → todo verde; incluye `tests/unit/constants.test.js`).
5. Bumpear `CACHE_NAME` en `service-worker.js`.
6. Commit: `feat(E.2): cargar SMMLV + auxilio + UVT 2027`
7. Push a main → auto-deploy a producción.

**Modelo:** Escribe tu `Próximo paso` con **Haiku 4.5** (búsqueda + cambio mecánico de una entrada).

---

## 5. Cómo trabajamos (workflow)

Workflow completo (una tarea a la vez, cierre de conversación, selección de modelo) en [`/CLAUDE.md`](../CLAUDE.md) sección 2. No se duplica acá para no desincronizarse.

---

## 6. Arquitectura en una línea por capa

```
core/        → state.js (singleton S), storage.js (save debounced), constants.js (CO legales)
infra/       → utils, render, a11y, crud, router, csv, svg, notificaciones
ui/          → bootstrap (entry point), shell, actions (delegación data-action), modales, onboarding
dominio/     → agenda, ahorro, analisis, apartados, calculadoras, compromisos,
               config, export, gastos, import, inversiones, logros, metas,
               personales, presupuesto, resumen, tesoreria
```

Regla clave: **ningún dominio importa a otro** - comunicación exclusiva por `EventBus`.
Todo `logic.js` es sin DOM (testeable en Node). Todo `view.js` solo lee `S`, no lo muta.
Detalle completo en [`docs/ARCHITECTURE.md`](ARCHITECTURE.md). Cifras de tests actuales: ver sección 2 arriba.

---

## 7. Comandos rápidos

```bash
python -m http.server 8080   # Servir la app (ES6 modules requieren HTTP)
pnpm test                     # tests unitarios + integración (Vitest + happy-dom)
pnpm run test:e2e             # smoke tests Playwright
pnpm run coverage             # umbral 90% capa lógica
pnpm run lighthouse           # requiere servidor en :8080
```
