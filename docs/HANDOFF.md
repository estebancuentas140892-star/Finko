# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-30 (feat(presupuesto): MC.5e, CTAs cruzados y copy de complementariedad con Mis cuentas. MC.5 completa)

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
| Tests unitarios + integración | 1728/1728 verdes |
| Tests E2E | 73/73 verde. Suites: `smoke` 37 tests, `estrategia-pago` 15 tests, `ahorro-inversion` 9 tests, `navegacion-render` 6 tests, `install-prompt` 6 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(presupuesto): CTAs cruzados y copy de complementariedad con Mis cuentas (MC.5e) · 2026-06-30

Quinto slice, opcional, de MC.5 ([ADR 017](DECISIONS/017-limites-centro-de-control.md), decisión 7). **Con esto, la épica MC.5 queda completa (a-e).** `sugerirDistribucionIngreso` agrega un CTA incondicional "Ver tu seguimiento en Límites de gasto" (sin cambios en `tesoreria/view.js`, el `ctasHtml` ya mapea `dist.ctas`). La nota de Límites se reescribió: "Mis cuentas planifica cómo repartes tu ingreso; Límites de gasto vigila que cumplas ese plan." El banner de propósito de Límites (EP.2, ADR 016) se alineó con esa identidad de seguimiento. 2 unit + 2 E2E nuevos. 1726/1726 → 1728/1728 unit; 71/71 → 73/73 E2E. SW v240 → v241.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | CTA incondicional a `presupuesto` en `sugerirDistribucionIngreso`. |
| `modules/ui/proposito.js` | Copy de `PROPOSITOS_SECCION.presupuesto` reescrito. |
| `modules/dominio/presupuesto/view.js` | `.grupos-resumen__nota` reescrita. |
| `tests/unit/tesoreria.test.js`, `tests/unit/proposito.test.js`, `tests/e2e/smoke.test.js` | 2 unit + 2 E2E nuevos. |
| `service-worker.js` | v240 → v241. |

---

### feat(presupuesto): alertas y refuerzos inteligentes por grupo y por item en Límites de gasto (MC.5d) · 2026-06-30

Cuarto slice (obligatorio) de MC.5 ([ADR 017](DECISIONS/017-limites-centro-de-control.md); MC.5e queda opcional). Nueva `generarMensajesLimites()` en `presupuesto/logic.js`, reusando el sistema de nudges ya existente (`.nudge nudge-medium|nudge-high|nudge-success`) en vez de un componente nuevo. Genera: alerta por categoría de Estilo de vida en 75-99%/excedida (reusa `alertasLimites`), alerta de grupo para Necesidades/Estilo de vida, refuerzo para Ahorro cuando `pct >= 100` (ahí superar el 100% es bueno, al revés que gasto), y un refuerzo combinado ("Cumpliste todas tus necesidades... Excelente trabajo") cuando todos los items de Necesidades están pagados y el grupo no está excedido. Función pura, sin importar otros dominios. 19 unit + 2 E2E nuevos. 1707/1707 → 1726/1726 unit; 69/69 → 71/71 E2E. SW v239 → v240.

| Archivo | Cambio |
|---|---|
| `modules/dominio/presupuesto/logic.js` | `generarMensajesLimites()` nueva. |
| `modules/dominio/presupuesto/view.js` | `_renderNudge`/`_renderNudgesGrupo`/`_renderRefuerzoCombinado`; tarjetas reciben `nudgesHtml`. |
| `styles/components/analysis.css` | `.grupo-card .nudge` (ajuste de espaciado del sistema de nudges existente). |
| `tests/unit/presupuesto.test.js`, `tests/e2e/smoke.test.js` | 19 unit + 2 E2E nuevos. |
| `service-worker.js` | v239 → v240. |

---

### feat(presupuesto): desglose por item dentro de cada grupo en Límites de gasto (MC.5c) · 2026-06-30

Tercer slice de MC.5 ([ADR 017](DECISIONS/017-limites-centro-de-control.md)). Las tarjetas de Necesidades y Ahorro suman un detalle colapsable ("Ver detalle (N)", reusa `.analisis-grupo`) con un item por fuente. **Necesidades** (`desgloseNecesidadesDelMes`): cada gasto fijo/deuda activo con su monto de referencia y estado de pago del mes (pendiente / abono parcial / pagado), pendientes primero. **Ahorro** (`desgloseAhorroDelMes`): fondo de emergencia, metas activas, apartados activos, inversiones; solo el fondo tiene aportes fechados así que solo él reporta "aportado este mes", el resto muestra acumulado a la fecha (copy honesto sobre esa diferencia). Ambas funciones puras, sin importar otros dominios (ADN #10). 16 unit + 2 E2E nuevos. 1691/1691 → 1707/1707 unit; 67/67 → 69/69 E2E. SW v238 → v239.

| Archivo | Cambio |
|---|---|
| `modules/dominio/presupuesto/logic.js` | `desgloseNecesidadesDelMes()` + `desgloseAhorroDelMes()` nuevas. |
| `modules/dominio/presupuesto/view.js` | `_renderDesgloseNecesidades`/`_renderDesgloseAhorro`; `_renderGrupoCard` recibe detalle opcional. |
| `styles/components/analysis.css` | `.grupo-card__desglose` + `.grupo-card__item*`. |
| `tests/unit/presupuesto.test.js`, `tests/e2e/smoke.test.js` | 16 unit + 2 E2E nuevos. |
| `service-worker.js` | v238 → v239. |

---

### feat(presupuesto): resumen read-only de los 3 grupos en Límites de gasto (MC.5b) · 2026-06-30

Segundo slice de MC.5 ([ADR 017](DECISIONS/017-limites-centro-de-control.md)). Límites de gasto arranca ahora con **"Tu plan del mes por grupo"**: una tarjeta por grupo financiero (Necesidades / Estilo de vida / Ahorro) con asignado, ejecutado, disponible, % y barra de progreso. Los topes por categoría quedan debajo como "detalle de Estilo de vida". El **asignado** sale de la misma distribución que Mis cuentas (`sugerirDistribucionIngreso`); para no duplicarla se extrajo el helper puro `construirContextoDistribucion` en `tesoreria/logic.js` y se refactorizó `tesoreria/view.js` para consumirlo (extracción sin cambio de comportamiento). El **ejecutado** lo deriva `ejecutadoPorGrupoDelMes` de los flujos del mes sin schema nuevo (Necesidades = gastos con `compromisoId`; Estilo de vida = gastos sin `compromisoId`; Ahorro = aportes fechados al fondo). Estado vacío que guía a Mis cuentas si no hay ingreso. 14 unit + 2 E2E nuevos. 1691/1691 unit + 67/67 E2E. SW v237 → v238.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `construirContextoDistribucion()` nueva (helper puro compartido). |
| `modules/dominio/tesoreria/view.js` | `renderDistribucionIngreso` consume el helper (menos duplicación). |
| `modules/dominio/presupuesto/logic.js` | `ejecutadoPorGrupoDelMes()` nueva. |
| `modules/dominio/presupuesto/view.js` | `_renderResumenGrupos` + tarjetas + estado vacío; re-enmarca envelopes. |
| `index.html`, `styles/components/analysis.css`, `styles/responsive.css` | subtítulo + estilos del resumen por grupo (grid 3→1 col en móvil). |
| `tests/unit/presupuesto.test.js`, `tests/unit/tesoreria.test.js`, `tests/e2e/smoke.test.js` | 14 unit + 2 E2E nuevos. |
| `service-worker.js` | v237 → v238. |

---

### feat(nav): renombrar secciones, Dashboard → Inicio y Agenda → Calendario · 2026-06-30

Evaluación UX/IA de una propuesta del usuario (eligiendo la mejor opción para un usuario primerizo). Se coincide con su propuesta: "Dashboard" es jerga opaca, "Inicio" es universal; "Agenda" → "Calendario" porque para un usuario primerizo gana el reconocimiento del formato visual (reconsidera AG.1). Clave de IA: se cambió **solo la etiqueta visible**, no la ruta ni el código (hash `#dash`/`#agenda`, `id` del DOM y dominio `agenda` quedan estables, para no romper deep links, bookmarks ni el cache del SW). Cambios en nav, título de sección, banner de propósito y 7 menciones de copy en Gastos/Tesorería/Deudas/Ahorro. Bonus fix: "tus deudas en Compromisos" (nombre obsoleto) → "en la sección Deudas" en la copia de recomendación de distribución. Fix de lint pre-existente en `proposito.js` de paso. 1667/1667 unit + 65/65 E2E verdes. SW v235 → v236.

| Archivo | Cambio |
|---|---|
| `index.html` | Labels de nav + `aria-label` + título de sección "Mi Agenda" → "Calendario". |
| `modules/ui/proposito.js` | Copy del banner de Calendario; fix de lint (`titulo` sin usar). |
| `modules/dominio/gastos/index.js`, `tesoreria/view.js`, `tesoreria/logic.js`, `compromisos/views/lista.js`, `ahorro/view.js` | 7 menciones de copy "Agenda" → "Calendario"; "Compromisos" → "Deudas". |
| `tests/e2e/smoke.test.js` | Assert de heading actualizado a "Calendario". |
| `service-worker.js` | v235 → v236. |

---

> Para tareas anteriores (MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md).

---

## 4. Estado de finalización (v1.0 + post-v1.0)

**🎯 Hito: todas las series pendientes completadas.**

- ✅ **"Coaching de ingresos"** (Fases 1, 2, 3): diaPago + nudge de próximo cobro + distribución adaptativa. SW v128 → v131. 1235/1235 verdes. 2026-06-09.
- ✅ **"Mejoras de deudas"**: tasa opcional + motor de recomendación por simulación. SW v131 → v132. 1256/1256 verdes. Ver [ADR 006](DECISIONS/006-recomendacion-deudas-por-simulacion.md). 2026-06-09.
- ✅ **"Apartados"** (Fases 1, 2, 3): CRUD + recurrencia/ciclo + frecuencia automática + nudge de proximidad. SW v132 → v135. 1333/1333 verdes. Ver [ADR 007](DECISIONS/007-dominio-apartados.md). 2026-06-10.
- ✅ **fix(agenda) abono parcial**: badge de Agenda distingue abono parcial de cuota cubierta. SW v135 → v136. 1351/1351 verdes. 2026-06-10.

**Tareas opcionales / futuras:**
- **E.2-2027**: Enero 2027, actualizar SMMLV/UVT a valores 2027 cuando se publiquen oficialmente (Haiku, ~15 min).
- **E.5**: Agregar IPC como constante anual si se quiere mostrar inflación observada (Haiku, Bajo).
- **A.5**: Setup de dominio custom cuando el usuario tenga URL registrada. No requiere código. Guía lista en `docs/SETUP_DOMINIO.md`.

**App en producción estable:** https://finko-brown.vercel.app (Lighthouse 99-100, 1333/1333 tests verdes, cero deuda técnica conocida).

> **Importante para futuros desarrolladores:** Antes de instalar dependencias o configurar
> un nuevo entorno, leer [`docs/SECURITY.md`](SECURITY.md). Incluye política anti-malware npm,
> guía de migración a **pnpm** con defensas (`minimum-release-age`, `only-built-dependencies`),
> y el audit de seguridad realizado el 2026-05-18.

Tareas opcionales restantes:

| Prioridad | Tarea | Cuándo | Nivel |
|---|---|---|---|
| 1 | **A.5 - Dominio custom** (opcional) | Cuando el usuario tenga dominio registrado | Guía lista en [`docs/SETUP_DOMINIO.md`](SETUP_DOMINIO.md) |
| 2 | **E.2 - SMMLV + UVT** (anual) | **Enero 2027** - buscar nuevos valores Mintrabajo (SMMLV) + DIAN (UVT), actualizar `modules/core/constants.js` | ~15 min, Haiku |
| 3 | **E.3 - GMF + reforma** (demanda) | Si hay reforma tributaria - verificar cambios en GMF | Ad-hoc |

### Recordatorio enero 2027 - E.2

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

- **Una tarea a la vez.** No se empieza la siguiente sin verificar en la app y commitear.
- **Al cerrar cada tarea:** actualizar este archivo (HANDOFF.md) + CHANGELOG.md; eliminar de ROADMAP.md y TASKS.md.
- **Al final de cada respuesta:** bloque `─── Próximo paso ───` con modelo sugerido + nivel.
- **Modelos permitidos:** `Haiku 4.5` (sin nivel) · `Sonnet 4.6 - Bajo/Medio/Alto` · `Opus 4.7 - Bajo/Medio/Alto/Extra Alto/Max`.
- **Regla de oro:** calidad del código primero, ahorro de tokens segundo.
- Workflow completo en [`/CLAUDE.md`](../CLAUDE.md) sección 2.

---

## 6. Arquitectura en una línea por capa

```
core/        → state.js (singleton S), storage.js (save debounced), constants.js (CO legales)
infra/       → utils, render, a11y, crud, router, csv, svg, notificaciones
ui/          → bootstrap (entry point), shell, actions (delegación data-action), modales, onboarding
dominio/     → ingresos, gastos, compromisos, tesoreria, metas, analisis,
               calculadoras, config, import, export
tests/unit/  → lógica pura (Vitest + happy-dom) - 521 tests
tests/e2e/   → smoke tests (Playwright) - 57 tests
```

Regla clave: **ningún dominio importa a otro** - comunicación exclusiva por `EventBus`.
Todo `logic.js` es sin DOM (testeable en Node). Todo `view.js` solo lee `S`, no lo muta.

---

## 7. Comandos rápidos

```bash
python -m http.server 8080   # Servir la app (ES6 modules requieren HTTP)
pnpm test                     # 1182 tests unitarios + integración
pnpm run test:e2e             # 57 smoke tests Playwright
pnpm run coverage             # umbral 90% capa lógica
pnpm run lighthouse           # requiere servidor en :8080
```
