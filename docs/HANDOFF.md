# HANDOFF — Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-05-18 (B.3 — favicon SVG)

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

### B.3 — Favicon SVG · 2026-05-18
Favicon vectorial `assets/icons/favicon.svg` — 3 barras ascendentes `#00dc82`
sobre fondo `#0f1117`, esquinas rx=2, idéntico al ícono PNG. `<link rel="icon"
type="image/svg+xml">` en `<head>`. Agregado a CORE_ASSETS del SW. SW v7→v8.
- `assets/icons/favicon.svg` (nuevo), `index.html`, `service-worker.js`

### E.1 — Actualizar tasa de usura Q2 2026 · 2026-05-18
Tasa de usura SFC (Superintendencia Financiera de Colombia) actualizada de
Q1 (26.77% EA) a Q2 (28.17% EA). Cambios en `constants.js`: renombrado
`TASA_USURA_Q1_2026` → `TASA_USURA_Q2_2026`, valor 0.2677 → 0.2817,
vigencia extendida a 2026-06-30. Hint en modal de Compromisos actualizado
para reflejar tasa vigente. 596/596 tests verdes.
- `modules/core/constants.js`, `modules/dominio/compromisos/view.js`

### A.4 — Smoke test confirmado en Redmi Note 11 · 2026-05-18
Usuario verificó que el fix responsive (sesión anterior) se ve bien en el celular real.
Números más legibles, botones con touch targets OK (44px+), inputs sin zoom iOS,
navegación completa a todas las 5 secciones, funcionamiento offline confirmado.
Cierre de A.4 en el ROADMAP post-v1.0.

### Fix: responsive integral mobile (320–1440px) · 2026-05-18
A.4 smoke test reveló que aunque la nav inferior ya funcionaba, la app no se
sentía adaptada a móviles modernos. Refactor de `responsive.css` con
fluid typography (clamp en `.bento__value`, `.card__value`,
`.patrimonio-hero__valor`), touch targets ≥44px en btn/input/select,
inputs 16px font-size para evitar zoom iOS, breakpoint legacy < 480px
movido a < 360px (móviles 393/414 ya no se ven comprimidos), grids
3-col → 1-col en < 768px. `viewport-fit=cover` + `maximum-scale=5` en HTML.
SW bump v6→v7. Verificado a 320/360/393/414/768/1280px sin overflow.
- `styles/responsive.css` (reescrito), `index.html`, `service-worker.js`

### B.2 — Screenshots PWA para manifest · 2026-05-18
2 screenshots 540×720 (tema oscuro) para mejorar la ficha de instalación PWA en Android.
Generados con Pillow (`scripts/gen-screenshots.py`). Array `"screenshots"` en `manifest.json`
con `form_factor: "narrow"`. SW bump v5→v6, screenshots en `OPTIONAL_ASSETS`.
- `assets/screenshots/screenshot-1-dashboard.png`, `screenshot-2-gastos.png` (nuevos)
- `manifest.json`, `service-worker.js`, `scripts/gen-screenshots.py` (nuevo)

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

### D.5 — Envelope budgeting (presupuesto por sobre) · 2026-05-18
Nuevo dominio `modules/dominio/presupuesto/`. Un envelope por categoría con monto
mensual recurrente; progreso = gastos del mes / asignado. 3 estados (ok/alerta/excedido).
Hero con totales, envelope cards color-coded, listado de categorías huérfanas.
Schema bump v1→v2 con migración idempotente. SW con `cache:'reload'` en install.
38 unit tests del logic; 579/579 verdes.
- `modules/dominio/presupuesto/{logic,view,index}.js` (nuevos), `modules/core/{state,storage}.js`,
  `modules/infra/router.js`, `modules/ui/bootstrap.js`, `index.html`, `styles/components.css`,
  `service-worker.js`, `tests/unit/{presupuesto,state}.test.js`

---

## 4. Qué sigue (roadmap post-v1.0)

Ver [`ROADMAP.md`](ROADMAP.md) para la lista completa. Orden sugerido:

| Prioridad | Tarea | Por qué |
|---|---|---|
| 1 | **B.4 — Splash screen iOS** (opcional) | Mejora la experiencia de carga en iOS |
| 2 | **A.5 — Dominio custom** (opcional) | Si se quiere `finko.app` o similar en lugar del `.vercel.app` |
| 3 | **E.2–E.3 — Mantenimiento anual + reforma** | Actualizar SMMLV/UVT en enero; verificar GMF si hay cambios |

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
