# HANDOFF — Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-05-18 (A.1' / A.3 — Deploy real + verificación)

**Producción:** https://finko-brown.vercel.app
**Repositorio:** https://github.com/estebancuentas140892-star/Finko

---

## 1. Qué es Finko

PWA offline-first de gestión financiera personal para Colombia.
Vanilla JS puro + ES6 modules. Sin framework, sin build step, sin servidor, sin cuenta.
Todo vive en `localStorage` (clave `fk_v1`). Pensada para personas con poco conocimiento
financiero: lenguaje simple, normativa colombiana (SMMLV, UVT, tasa de usura, GMF).

**Versión actual:** `v1.0.0` — todas las 14 fases originales completadas y cerradas.
**Rama principal:** `main`.

---

## 2. Estado técnico actual

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 579/579 verdes |
| Tests E2E | 18/18 verdes |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### A.1' / A.2 / A.3 — Deploy real a Vercel + verificación headers · 2026-05-18
Finko en producción: https://finko-brown.vercel.app. Repo conectado para
auto-redeploy en push a `main`. HTTPS automático (HSTS preload). Todos los
headers de seguridad verificados en producción (X-Frame-Options, nosniff,
Referrer-Policy, Permissions-Policy). Fix detectado y corregido en
`vercel.json`: regla genérica `/(.*)\.js` estaba sobrescribiendo el
`Cache-Control` del SW por `immutable` (1 año). Reordenadas las reglas para
que `/service-worker.js` sea la última (Vercel: "última regla gana").
- `vercel.json` (reordenado)

### C.3 — Tests de migración schema v1→v2 · 2026-05-18
9 tests en Suite 6 de `flujos.test.js` que blindan la migración introducida por D.5.
Cubre: subida de `_version` 1→2 con `presupuestos:[]`, datos sin campo `_version` (legacy),
idempotencia (v2 con presupuestos no los pierde), preservación de todos los campos v1,
tipos inválidos (`"1"` string, `null`), roundtrip v1→flush→reload→v2, y descarte de
campos desconocidos por `_applyToS`. 596/596 verdes.
- `tests/integration/flujos.test.js` (ampliado con Suite 6 — C.3)

### C.2 — Tests de integración: backup/restore · 2026-05-18
8 tests para validar el ciclo export CSV → reset app → import. Cubre exportación
correcta a CSV (preserva fecha, monto, descripción, categoría, cuenta, nota), 
importación con detección de duplicados, y roundtrip completo con datos idénticos.
Incluye casos de error (CSV con filas malas, cuenta no encontrada → cuentaId null) 
y robustez (BOM UTF-8). 587/587 verdes.
- `tests/integration/flujos.test.js` (ampliado con C.2)

### D.5 — Envelope budgeting (presupuesto por sobre) · 2026-05-18
Nuevo dominio `modules/dominio/presupuesto/`. Un envelope por categoría con monto
mensual recurrente; progreso = gastos del mes / asignado. 3 estados (ok/alerta/excedido).
Hero con totales, envelope cards color-coded, listado de categorías huérfanas.
Schema bump v1→v2 con migración idempotente. SW con `cache:'reload'` en install.
38 unit tests del logic; 579/579 verdes.
- `modules/dominio/presupuesto/{logic,view,index}.js` (nuevos), `modules/core/{state,storage}.js`,
  `modules/infra/router.js`, `modules/ui/bootstrap.js`, `index.html`, `styles/components.css`,
  `service-worker.js`, `tests/unit/{presupuesto,state}.test.js`

### C.1 — Tests de integración: flujo completo · 2026-05-18
20 tests en 4 suites: estado del flujo onboarding→cuenta→ingreso→gasto, análisis
cross-domain (balance/tasa/salud/generarResumen), roundtrip localStorage (flush+reload),
y resiliencia (JSON corrupto, estado vacío, cuenta inactiva). 541/541 verdes.
- `tests/integration/flujos.test.js` (nuevo)

### B.1 — Íconos PNG producción + Apple Touch Icon · 2026-05-18
Diseño nuevo: gráfico de barras creciente (3 barras redondeadas, verde sobre oscuro).
Supersampling 4× + LANCZOS. Safe zone 80% cumplido (maskable OK).
Agrega `apple-touch-icon.png` (180×180) + `<link rel=apple-touch-icon>` en HTML.
- `scripts/gen-icons.py` (reescrito), `assets/icons/icon-192.png`, `assets/icons/icon-512.png`, `assets/icons/apple-touch-icon.png` (nuevo), `index.html`, `service-worker.js`

### A.1 — Deploy a producción (Netlify/Vercel) · 2026-05-18
`netlify.toml` y `vercel.json` listos para deploy estático sin build step.
Cache máxima para JS/CSS; `no-cache` para `service-worker.js`; cabeceras de seguridad.
Fix del SW: 7 módulos faltantes agregados a `CORE_ASSETS`; `CACHE_NAME` → `finko-v2`.
- `netlify.toml` (nuevo), `vercel.json` (nuevo), `service-worker.js`

**Para publicar con Netlify:** instalar CLI (`npm i -g netlify-cli`), luego `netlify deploy --prod --dir .`
**Para publicar con Vercel:** instalar CLI (`npm i -g vercel`), luego `vercel --prod`

### D.1 — Exportar gastos a CSV · 2026-05-18
Botón `📤 Exportar gastos (CSV)` en Configuración → Tus datos.
Genera `finko-gastos-YYYY-MM-DD.csv` con BOM UTF-8 (compatibilidad Excel).
Formato idéntico al del importador D.2 (roundtrip garantizado).
- `modules/dominio/export/logic.js` (nuevo) — `gastosACSV(gastos, cuentas)`
- `modules/dominio/config/view.js` — botón nuevo
- `modules/dominio/config/index.js` — handler + acción
- `tests/unit/export.test.js` (nuevo) — 13 tests

### D.2 — Importar gastos desde CSV · 2026-05-18
Parser RFC 4180 simplificado con autodetección de separador, preview con tabla
scrollable, detección de duplicados por hash (fecha|monto|descripcionLower).
- `modules/infra/csv.js` (nuevo), `modules/dominio/import/{logic,view,index}.js` (nuevos)

### D.4 — Notificaciones push · 2026-05-18
Recordatorios locales (Web Notifications API) para compromisos ≤ 3 días.
Opt-in desde Configuración. 4 estados de permiso (default/granted/denied/unsupported).
- `modules/infra/notificaciones.js` (nuevo), wiring en `config/`, `compromisos/`, `bootstrap.js`

### D.3 — Gráficos SVG inline · 2026-05-18
Sparkline de 12 meses + donut de categorías en Análisis. Sin librerías.
- `modules/infra/svg.js` (nuevo) — helpers puros `sparkline()`, `donut()`

### Patrimonio neto + proyecciones · 2026-05-17
Panel con activos/pasivos, proyecciones a 6/12/24 meses.
Campos `saldoPendiente` y `tasaEA` en compromisos de tipo deuda.
- `modules/dominio/analisis/{logic,view,index}.js`, `compromisos/{logic,view,index}.js`

---

## 4. Qué sigue (roadmap post-v1.0)

Ver [`ROADMAP.md`](ROADMAP.md) para la lista completa. Orden sugerido:

| Prioridad | Tarea | Por qué |
|---|---|---|
| 1 | **A.4 — Smoke test desde móvil real** | Instalar el PWA en celular + probar offline en producción |
| 2 | **B.2 — Screenshots en manifest** | Mejora la ficha de instalación PWA en Android |
| 3 | **E.1–E.3 — Mantenimiento periódico** | Actualizar constantes legales CO trimestrales/anuales |
| 4 | **A.5 — Dominio custom** (opcional) | Si se quiere `finko.app` o similar en lugar del `.vercel.app` |

---

## 5. Cómo trabajamos (workflow)

- **Una tarea a la vez.** No se empieza la siguiente sin verificar en la app y commitear.
- **Al cerrar cada tarea:** actualizar este archivo (HANDOFF.md) + CHANGELOG.md; eliminar de ROADMAP.md y TASKS.md.
- **Al final de cada respuesta:** bloque `─── Próximo paso ───` con modelo sugerido + nivel.
- **Modelos permitidos:** `Haiku 4.5` (sin nivel) · `Sonnet 4.6 — Bajo/Medio/Alto` · `Opus 4.7 — Bajo/Medio/Alto/Extra Alto/Max`.
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
tests/unit/  → lógica pura (Vitest + happy-dom) — 521 tests
tests/e2e/   → smoke tests (Playwright) — 18 tests
```

Regla clave: **ningún dominio importa a otro** — comunicación exclusiva por `EventBus`.
Todo `logic.js` es sin DOM (testeable en Node). Todo `view.js` solo lee `S`, no lo muta.

---

## 7. Comandos rápidos

```bash
python -m http.server 8080   # Servir la app (ES6 modules requieren HTTP)
npm test                      # 521 tests unitarios
npm run test:e2e              # 18 smoke tests Playwright
npm run coverage              # umbral 90% capa lógica
npm run lighthouse            # requiere servidor en :8080
```
