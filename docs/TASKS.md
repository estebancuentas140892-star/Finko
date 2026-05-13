# TASKS — Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión de trabajo.
> Última actualización: 2026-05-12

---

## Fase actual: Fase 7 — Dominio: Tesorería

Próximo paso del [ROADMAP.md](ROADMAP.md). Tareas a detallar al iniciar la fase.

---

## Completadas ✅

### Fase 6 — UI Shell ✅

- [x] 6.1 — `modules/ui/bootstrap.js` — entry point: loadData → initAcciones → initShell → initRouter → initOnboarding → renderAll
- [x] 6.2 — `modules/ui/actions.js` — `registrarAccion()` + `dispatch()` + `initAcciones()` (built-ins: theme-toggle, modal-open, modal-close)
- [x] 6.3 — `modules/ui/modales.js` — `abrirModal()` (trapFocus), `cerrarModal()` (releaseFocus), `resetModal()`
- [x] 6.4 — `modules/ui/onboarding.js` — stub funcional: auto-completa `S.onboarded`; Fase 12 completa el wizard
- [x] Eliminado `events.js` (reemplazado por bootstrap.js + actions.js + modales.js)
- [x] Actualizado `index.html`: script + preloads apuntan a bootstrap.js
- [x] Criterio: `npm test` → 58/58 verdes, lint limpio
- [x] Criterio: modal-open, Escape, theme-toggle verificados en navegador

### Fase 5 — Infra JS ✅

- [x] 5.1 — `modules/infra/utils.js` — `f()`, `hoy()`, `fechaLegible()`, `dialogo()`
- [x] 5.2 — `modules/infra/render.js` — `renderSmart()`, `updSaldo()`, `updateBadge()`, `renderAll()`, `registrarRender()`
- [x] 5.3 — `modules/infra/a11y.js` — `announce()`, `trapFocus()`, `releaseFocus()`
- [x] 5.4 — `modules/infra/crud.js` — `guardar()`, `editar()`, `eliminar()`
- [x] 5.5 — `tests/unit/utils.test.js` — 15 tests | `tests/unit/crud.test.js` — 19 tests
- [x] Criterio: `npm test` → 58/58 verdes
- [x] Criterio: `npm run lint` → limpio
- [x] Criterio: `updSaldo()` verificado en navegador — DOM actualiza al guardar cuenta

### Fase 4 — Core JS (state + storage + constants) ✅

- [x] 4.1 — `modules/core/constants.js` — constantes financieras CO (SMMLV, UVT, tasa usura, GMF, catálogos)
- [x] 4.2 — `modules/core/state.js` — singleton `S` mutable con schema v1 + `createInitialState()` + EventBus
- [x] 4.3 — `modules/core/storage.js` — `loadData()` con migración, `save()` debounced 200ms
- [x] 4.4 — `tests/unit/storage.test.js` — 13 tests (round-trip, debounce, corrupción, idempotencia)
- [x] 4.5 — `tests/unit/state.test.js` — 11 tests (schema, factory, EventBus pub/sub)
- [x] 4.6 — Integrar `loadData()` en `modules/ui/events.js` al arrancar
- [x] Criterio: `npm test` → 24/24 verdes
- [x] Criterio: `npm run lint` → limpio (sin `window.X`)
- [x] Criterio: roundtrip `save()` + `loadData()` verificado en navegador (puerto 8082)

### Fase 1 — Esqueleto + documentación

- [x] 1.0 — Inicializar git + crear estructura de carpetas
- [x] 1.1 — `package.json` con devDeps (vitest, eslint, prettier, happy-dom)
- [x] 1.2 — `.gitignore`, `.prettierrc`, `eslint.config.js`, `.editorconfig`
- [x] 1.3 — `README.md` en raíz
- [x] 1.4 — `docs/ARCHITECTURE.md`
- [x] 1.5 — `docs/ROADMAP.md`
- [x] 1.6 — `docs/TASKS.md`
- [x] 1.7 — `docs/CHANGELOG.md`
- [x] 1.8 — `docs/CONTRIBUTING.md`
- [x] 1.9 — `docs/IA_CONTEXT.md`
- [x] 1.10 — `docs/DECISIONS/001-no-build-step.md`
- [x] 1.11 — `index.html` stub + `styles/main.css` stub
- [x] 1.12 — `tests/setup.js` + `vitest.config.js`
- [x] 1.13 — `npm install` funcional
- [x] 1.14 — Primer commit git

### Fase 2 — Design System + CSS base

- [x] 2.1 — `styles/tokens.css`
- [x] 2.2 — `styles/reset.css`
- [x] 2.3 — `styles/base.css`
- [x] 2.4 — `styles/components.css`
- [x] 2.5 — `styles/layout.css` (incluyendo Bento Grid)
- [x] 2.6 — `styles/modals.css`
- [x] 2.7 — `styles/themes.css`
- [x] 2.8 — `styles/a11y.css`
- [x] 2.9 — `styles/responsive.css`
- [x] 2.10 — `styles/utils.css`
- [x] 2.11 — `styles/main.css` (importa todo con `@layer`)
- [x] 2.12 — `docs/DESIGN_SYSTEM.md` con todos los tokens documentados

### Fase 3 — HTML Shell + Router hash ✅

- [x] 3.1 — Shell principal con landmarks semánticos (`nav`, `main`)
- [x] 3.2 — Sidebar con 7 secciones de navegación + footer con theme toggle y ajustes
- [x] 3.3 — `main` con 8 `<section>` listos para Fases 5–12
- [x] 3.4 — Scaffolding de 4 modales vacíos (gasto, compromiso, cuenta, meta)
- [x] 3.5 — PWA meta tags (`theme-color`, `manifest`, `modulepreload`)
- [x] 3.6 — `modules/infra/router.js` — hash routing funcional (verificado `#dash ↔ #gast`)
- [x] 3.7 — `modules/ui/shell.js` — nav activo + tema toggle persistente
- [x] `modules/ui/events.js` — bootstrap: delegación `data-action`, modales, Escape

---

## Backlog (fases futuras)

Ver [ROADMAP.md](ROADMAP.md) para el detalle completo de Fases 5–14.

---

## Cómo actualizar este archivo

Al terminar cada tarea:
1. Mover de "En progreso" a "Completadas"
2. Si se descubren subtareas nuevas: agregarlas en "En progreso"
3. Al completar toda la fase: actualizar la sección "Fase actual" con la siguiente

Al iniciar una nueva sesión de trabajo:
1. Leer este archivo primero
2. Verificar cuál es la próxima tarea
3. Actualizar "Última actualización" con la fecha
