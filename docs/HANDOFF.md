# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-03 (fix(tesoreria): el checklist de Necesidades no vuelve a pagar lo ya pagado ni sobrepaga deudas, BUG-003 y BUG-004)

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
| Tests unitarios + integración | 1861/1861 verdes |
| Tests E2E | 103/103 verde. Suites: `smoke` 67 tests, `estrategia-pago` 15 tests, `ahorro-inversion` 9 tests, `navegacion-render` 6 tests, `install-prompt` 6 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

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

### docs(revision): revisión exhaustiva de Mis cuentas, 6 bugs registrados (BUG-003 a BUG-008) · 2026-07-03

Arranque del plan de validación sección por sección (orden: el flujo del dinero, Mis cuentas primero por ser la base y el dominio con el cambio más reciente). Se revisó el dominio completo, sus integraciones cross-dominio, los ADR 012/013/017/018 y el copy; cada sospecha se confirmó con sondas empíricas temporales (13 unitarias + 3 E2E en Chromium real, no commiteadas) antes de registrarse. Resultado: 6 bugs en [BUGS.md](BUGS.md). Los tres de prioridad alta comparten zona: BUG-003 (una Necesidad "Ya pagado" se vuelve a pagar al confirmar la distribución: un checkbox `checked disabled` sigue estando checked y `_leerNecesidadesMarcadas` solo filtra por `.checked`), BUG-004 (el checklist registra la cuota completa de una deuda aunque el saldo pendiente sea menor, e incluye deudas saldadas sin archivar) y BUG-005 (la cuota de manejo nace con `frecuencia: 'mensual'` en minúscula y queda fuera de todos los cálculos mensuales; requiere fix + migración idempotente). Los siguen BUG-006 (media: el abono extra a deudas desde el panel no crea el gasto, invisible para Análisis y Límites), BUG-007 y BUG-008 (bajas: copy de cuota de manejo y validaciones que aceptan Infinity). Quedaron además observaciones de UX sin registro de bug (detalle en el [CHANGELOG](CHANGELOG.md)), pendientes de decisión del usuario. Sin cambios de código: 1857/1857 unit intactos. **La sección Mis cuentas queda abierta hasta corregir sus bugs; la siguiente tarea natural es el fix del checklist (BUG-003 + BUG-004 juntos, misma zona de código).**

| Archivo | Cambio |
|---|---|
| `docs/BUGS.md` | 6 entradas nuevas (BUG-003 a BUG-008). |
| `docs/CHANGELOG.md` | Entrada de la revisión con hallazgos y observaciones. |

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

### docs(adr): revisión de ADR 018, el Paso 1 del asistente pasa a checklist accionable · 2026-07-02

Prerequisito de MC.7d. Tras validar en la app el desglose read-only de Necesidades (MC.7c), el usuario dio una dirección nueva (2026-07-02): cada grupo del asistente "Distribuir mi ingreso" debe mostrar sus registros como checklist seleccionable que registra pagos reales, no como lista informativa. Eso contradecía la decisión 2 de [ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md) (Paso 1 read-only, sin mover dinero), así que el ADR se revisó antes de codear.

La revisión (sección nueva "Revisión 2026-07-02" con decisiones R1-R5) define: **R1**, la checklist de Necesidades muestra nombre, cuota del periodo (fijo: su `monto` por ocurrencia; deuda: `cuotaMensual`, nunca el saldo total) y día de pago; los items marcados generan al confirmar exactamente los mismos registros que sus flujos individuales existentes (pago de fijo como "Marcar pagado" de Agenda, cuota de deuda como abono), con el guard "ya pagado este periodo" compartido para evitar doble registro. **R2**, una sola pregunta de cuenta al confirmar (patrón `cuenta-helper`, regla de cuenta única). **R3**, los pasos operan sobre el remanente real (el Paso 2 sugiere sobre el cobro menos las Necesidades marcadas). **R4**, la confirmación única aplica también los pagos del Paso 1; nota de implementación: agregar la slice `gastos` a `_SLICES_DISTRIBUCION` en `tesoreria/index.js` o el "Deshacer" dejaría pagos huérfanos. **R5**, sin schema nuevo (los pagos son gastos normales con `compromisoId`). Las decisiones 2, 5 y 6 originales quedan marcadas como revisadas/ajustadas con el texto original conservado como historia; la tabla de slices refleja MC.7a/b/c entregados y MC.7d ampliado.

Tarea solo de documentación: sin cambios de código, tests ni service worker. La tarjeta MC.7d del BOARD pasó de "requiere revisión de ADR" a "pendiente", con el diseño cerrado y `Sonnet 5 - Alto` como modelo de implementación.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/018-asistente-distribuir-ingreso.md` | Sección "Revisión 2026-07-02" (R1-R5, alternativas y consecuencias); notas de revisión en las decisiones 2, 5 y 6; tabla de slices actualizada (MC.7a/b/c entregados, MC.7d ampliado); modelos de slices restantes en escala Claude 5. |
| `docs/BOARD.md` | Tarjeta MC.7d: estado a "pendiente (ADR revisado)", objetivo alineado con R1-R5, archivos afectados precisados. |

---

### feat(calendario): nombre automático según la categoría en el gasto fijo (AG.4) · 2026-07-02

El form de gasto fijo pedía descripción y categoría como dos campos independientes, aunque para categorías predefinidas (Mercado, Arriendo, Internet...) ambos dicen lo mismo: pedir un nombre aparte de "Mercado" es redundante. AG.4 hace que, con una categoría predefinida, el nombre del registro sea la propia categoría; el campo de texto libera su rol y pasa a ser una nota opcional. Solo con la categoría "Otro" (o sin categoría) el campo vuelve a ser el nombre obligatorio del gasto.

En [compromisos/logic.js](../modules/dominio/compromisos/logic.js), nueva `_categoriaFijoConNombreAuto(datos)` detecta cuándo aplica (tipo fijo + categoría del catálogo de Agenda + distinta de "Otro"). `validarCompromiso()` deja de exigir descripción cuando aplica; `normalizarCompromiso()` deriva `descripcion = categoria` y guarda lo que el usuario escribió como `nota` (cadena vacía si no escribió nada). Sin categoría o con "Otro", el comportamiento es el de siempre: `descripcion` es el texto del usuario y `nota` queda ''. Es un campo nuevo, pero opcional y con lectura defensiva (`c.nota ?? ''`), así que no requiere migración de los compromisos ya guardados.

En [agenda/view.js](../modules/dominio/agenda/view.js), `renderFormGastoFijo()` reordena los campos (categoría primero, nombre/nota después) para que la causalidad sea clara en la UI, y le da al label del campo un id (`gfijo-descripcion-label`) para que el JS pueda alternarlo. `_renderDetalleItem()` deja de repetir la categoría en el subtítulo cuando coincide con el nombre (nombre automático) y muestra la nota cuando existe. En [agenda/index.js](../modules/dominio/agenda/index.js), nueva `_syncCategoriaGastoFijo(form)` (mismo patrón que `_syncCategoriaMeta` de MT.3) alterna label, placeholder y `required` según la categoría elegida, enganchada al `change` del selector y llamada también al abrir el modal (nuevo o edición); en edición, si el compromiso tiene nombre automático, el campo de texto se prellena con `nota`, no con `descripcion`.

Verificado con 10 tests unitarios nuevos (`validarCompromiso`/`normalizarCompromiso` con categoría predefinida, "Otro" y sin categoría; orden de campos y estado por defecto del form; supresión de la categoría duplicada y render de la nota en el detalle) más 4 E2E en Chromium real (el label y el `required` cambian al elegir/quitar una categoría predefinida; guardar con categoría y sin texto usa la categoría como nombre; guardar con categoría y una nota la muestra en el subtítulo). 1838/1838 → 1851/1851 unit; 94/94 → 98/98 E2E. Lint limpio. SW v262 → v263.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic.js` | Nueva `_categoriaFijoConNombreAuto()`; `validarCompromiso()` y `normalizarCompromiso()` para tipo fijo derivan `descripcion`/`nota` según la categoría. |
| `modules/dominio/agenda/view.js` | `renderFormGastoFijo()` reordena categoría antes del nombre y agrega `#gfijo-descripcion-label`; `_renderDetalleItem()` suprime la categoría duplicada y muestra la nota. |
| `modules/dominio/agenda/index.js` | Nueva `_syncCategoriaGastoFijo(form)`; prefill de edición usa `nota` cuando el nombre es automático. |
| `tests/unit/compromisos.test.js` | 6 tests nuevos: validación y normalización con categoría predefinida, "Otro" y sin categoría. |
| `tests/unit/agenda.test.js` | 4 tests nuevos: orden de campos, estado por defecto del form, supresión de categoría duplicada, render de la nota. |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - nombre automático según la categoría", 4 tests. |
| `service-worker.js` | v262 → v263. |

---

> Para tareas anteriores (AG.2, AG.7, AG.6, AG.5, MT.4, MT.5, MT.3, MT.1, IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

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
