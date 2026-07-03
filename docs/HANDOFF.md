# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-03 (fix(tesoreria): tope coordinado entre cuota del checklist y abono extra, BUG-009)

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
| Tests unitarios + integración | 1875/1875 verdes |
| Tests E2E | 107/107 verde. Suites: `smoke` 71 tests, `estrategia-pago` 15 tests, `ahorro-inversion` 9 tests, `navegacion-render` 6 tests, `install-prompt` 6 tests. |
| Schema version (localStorage) | v20 |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### fix(tesoreria): tope coordinado entre cuota del checklist y abono extra (BUG-009) · 2026-07-03

Cierra el último bug pendiente de la revisión de Mis cuentas. Con el usuario se decidió el diseño el mismo día (ver el CHANGELOG anterior): una deuda que aparece a la vez en el checklist de Necesidades (su cuota, marcada por defecto) y en "Abonar extra a deudas" del panel "Distribuir mi ingreso" **puede pagar ambos en un mismo movimiento**, pero el extra ya no topa contra el saldo previo sin más (lo que permitía sobrepagar); topa contra lo que queda **tras** la cuota marcada.

Nuevo helper puro `topeAbonoExtraDeuda(saldoTotal, cuotaMarcada, extraSolicitado)` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js): `disponible = max(0, saldoTotal - cuotaMarcada)`, `efectivo = min(extraSolicitado, disponible)`. `_leerItemsDistribucion()` en [tesoreria/index.js](../modules/dominio/tesoreria/index.js) gana un segundo parámetro (las Necesidades ya leídas por `_leerNecesidadesMarcadas`), suma la cuota marcada de la misma deuda (`tipo === 'necesidad-deuda'` con el mismo `id`) y llama al helper en vez del `Math.min(monto, _saldoDeuda(id))` anterior. `_recalcularDistribucion()` y `_confirmarDistribucion()` ahora leen las Necesidades primero y se las pasan a `_leerItemsDistribucion()`, así el resumen en vivo y el apply comparten el mismo monto efectivo (la promesa que ya hacía el docstring de esa función, ahora cierta también quando ambos flujos tocan la misma deuda).

Verificado con 5 tests unitarios nuevos de `topeAbonoExtraDeuda` (sin cuota marcada = comportamiento previo; resta la cuota antes de topar; permite el extra hasta lo que queda; nunca negativo si la cuota supera el saldo; valores no numéricos como 0) más 1 E2E en Chromium real que reproduce el escenario exacto del bug: deuda con saldo 300.000 y cuota 100.000, el usuario marca la cuota (por defecto) y pide un extra de 300.000; el resumen en vivo ya muestra "Asignado: $300.000" (no $400.000), y tras confirmar la deuda queda en 0 (nunca negativa), los dos gastos suman exactamente 300.000 y la cuenta se debita 300.000, no 400.000. 1870/1870 → 1875/1875 unit; 106/106 → 107/107 E2E. Lint limpio. SW v268 → v269.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | Nuevo helper puro `topeAbonoExtraDeuda(saldoTotal, cuotaMarcada, extraSolicitado)`. |
| `modules/dominio/tesoreria/index.js` | `_leerItemsDistribucion()` gana el parámetro `necesidades` y usa `topeAbonoExtraDeuda`; `_recalcularDistribucion()` y `_confirmarDistribucion()` le pasan las Necesidades ya leídas. |
| `tests/unit/tesoreria.test.js` | 5 tests nuevos de `topeAbonoExtraDeuda`. |
| `tests/e2e/smoke.test.js` | Suite nueva "cuota del checklist + abono extra a la misma deuda no sobrepaga (BUG-009)", 1 test. |
| `service-worker.js` | v268 → v269. |
| `docs/BUGS.md` | BUG-009 resuelto (eliminado). Sin errores pendientes. |

---

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

> Para tareas anteriores (feat(tesoreria) MC.7d slice 1 checklist de Necesidades, docs(revision) Mis cuentas, docs(adr) ADR 018 revisión, AG.4, AG.2, AG.7, AG.6, AG.5, MT.4, MT.5, MT.3, MT.1, IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

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
