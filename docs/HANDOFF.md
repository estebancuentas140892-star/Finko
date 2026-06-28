# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-27 (fix analisis: patrimonio neto suma inversiones + apartados)

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
| Tests unitarios + integración | 1418/1418 verdes |
| Tests E2E | 57/57 verde. Suites: `smoke` 28 tests, `estrategia-pago` 8 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### fix(copy): reemplazar voseo por tuteo (ADN #11) · 2026-06-27

Hallazgo 2 de la revisión. 8 cadenas en voseo → tuteo en HTML, logic.js y views (Instalá → Instala, Tocá → Toca, gastás → gastas, usá → usa, Poné → Pon, Usá → Usa). Cambio mecánico, cero lógica, cero test changes. SW v171 → v172. Tests 1418/1418.

| Archivo | Cambio |
|---|---|
| `index.html` | Onboarding PWA: 3 cadenas voseo → tuteo. |
| `modules/dominio/analisis/logic.js` | Insight de gasto: "gastás" → "gastas". |
| `modules/dominio/compromisos/views/estrategia.js` | Sugerencia estrategia: "usá" → "usa". |
| `modules/dominio/personales/index.js` | Validación monto: "Poné" → "Pon". |
| `modules/dominio/import/logic.js` | Error CSV: "Usá" → "Usa". |
| `service-worker.js` | v171 → v172. |

---

### fix(analisis): el patrimonio neto suma inversiones y apartados · 2026-06-27

De una revisión integral de la app. Los "Activos totales" del patrimonio neto eran `cuentas + metas` y omitían inversión y apartados (activos reales): se subestimaba el patrimonio. Ahora `activos = cuentas + metas + apartados + inversiones`; el fondo de emergencia queda fuera a propósito (su aporte no descuenta la cuenta, ya está en `cuentas`, sumarlo duplicaría). Verificado en la app: −$2.830.000 → −$630.000. SW v170 → v171. Tests 1418/1418 (+7).

| Archivo | Cambio |
|---|---|
| `modules/dominio/analisis/logic.js` | `calcularActivos` suma 4 buckets (+`totalApartados`/`totalInversiones`); `generarResumen` propaga apartados e inversiones. |
| `modules/dominio/analisis/view.js` | Pasa `S.apartados`/`S.inversiones`; desglose de activos muestra Apartados e Inversión. |
| `tests/unit/analisis.test.js` | Fixtures + 7 casos nuevos. |
| `tests/integration/flujos.test.js` | Llamadas a `generarResumen` con la firma real. |
| `service-worker.js` | v170 → v171. |

---

### refactor(analisis): simplificar y jerarquizar la sección (F8) · 2026-06-27

Análisis de 10 secciones apiladas a jerarquía clara (solo vista, sin tocar logic/schema/tests). Score → Patrimonio → Tendencia → Categorías arriba; "Más detalle de gastos" y "Estado de renta" colapsados en `<details>` (renta se abre si hay alerta). Card "Resumen del mes" eliminada. Subtítulo guía nuevo. Ver [ADR 010](DECISIONS/010-simplificacion-analisis.md). SW v169 → v170. Tests 1411/1411.

| Archivo | Cambio |
|---|---|
| `modules/dominio/analisis/view.js` | `renderAnalisis` reordenado; `_renderGrupoColapsable`; renta colapsable; `_renderMetricas` eliminado. |
| `index.html` | Subtítulo en header de Análisis. |
| `styles/components/analysis.css` | Reglas `.analisis-grupo*`. |
| `docs/DECISIONS/010-simplificacion-analisis.md` | ADR nuevo. |
| `service-worker.js` | v169 → v170. |

---

### style(apartados): rediseño del formulario (F7) · 2026-06-27

Form de nuevo apartado reorganizado: emoji inline con el nombre (grid), recurrencia dentro de `<details>` colapsable, mejor microcopy en frecuencia. SW v168 → v169. Tests 1411/1411.

| Archivo | Cambio |
|---|---|
| `modules/dominio/apartados/view.js` | `renderFormApartado` reestructurado. |
| `styles/components/domain.css` | Reglas `.apartado-nombre-row*` y `.form-details*`. |
| `service-worker.js` | v168 → v169. |

---

### feat(ahorro): vista consolidada del ahorro total (F6) · 2026-06-27

Card de solo lectura al tope de la sección Ahorro: "Tu ahorro total" suma fondo + metas + apartados + inversiones con desglose y barras de participación. Se decidió NO generalizar el schema (un fondo → varios) ni etiquetar vehículo: la fragmentación se cura con visibilidad. Ver [ADR 009](DECISIONS/009-consolidado-de-ahorro.md). `consolidarAhorro()` pura; el view lee S de los 4 slices sin cross-import (ADN #10). SW v167 → v168. Tests 1411/1411 (+4).

| Archivo | Cambio |
|---|---|
| `modules/dominio/ahorro/logic.js` | Nueva `consolidarAhorro()`. |
| `modules/dominio/ahorro/view.js` | Nueva `renderResumenAhorroConsolidado()`. |
| `modules/dominio/ahorro/index.js` | Render bundleado + EventBus a metas/apartados/inversiones. |
| `index.html` | `<div id="panel-ahorro-consolidado">`. |
| `styles/components/domain.css` | Reglas `.ahorro-total*`. |
| `tests/unit/ahorro.test.js` | +4 tests. |
| `docs/DECISIONS/009-consolidado-de-ahorro.md` | ADR nuevo. |
| `service-worker.js` | v167 → v168. |

---

---

> Para tareas anteriores, ver [`docs/CHANGELOG.md`](CHANGELOG.md).

---

> Para tareas anteriores, ver [`docs/CHANGELOG.md`](CHANGELOG.md).

---

> Para tareas anteriores (motor recomendación deudas, tasa opcional, motor distribución ingresos, Apartados Fase 1, ADR 005), ver [`docs/CHANGELOG.md`](CHANGELOG.md).

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
