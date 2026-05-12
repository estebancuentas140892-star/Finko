# TASKS — Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión de trabajo.
> Última actualización: 2026-05-12

---

## Fase actual: Fase 4 — Core JS (state + storage + constants)

### En progreso 🔄

- [ ] 4.1 — `modules/core/constants.js` — constantes financieras CO (tasa usura, UVT, SMMLv)
- [ ] 4.2 — `modules/core/state.js` — singleton `S` mutable con schema v1
- [ ] 4.3 — `modules/core/storage.js` — `loadData()` con migración, `save()` debounced 200ms
- [ ] 4.4 — `tests/unit/storage.test.js` — tests de migraciones idempotentes
- [ ] 4.5 — `tests/unit/state.test.js` — tests de forma del estado inicial
- [ ] 4.6 — Integrar storage con events.js: `loadData()` en bootstrap

### Criterios de salida de Fase 4

- [ ] `npm test` pasa ≥ 10 tests nuevos, 0 failures
- [ ] `loadData()` devuelve estado válido en localStorage vacío
- [ ] `save()` escribe en `localStorage` con key `fk_v1`
- [ ] Constantes exportadas sin `window.X`
- [ ] Schema v1 documentado en `ARCHITECTURE.md`

**Modelo recomendado:** Opus 4.7 — Esfuerzo Alto

---

## Completadas ✅

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
