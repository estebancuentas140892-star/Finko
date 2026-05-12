# TASKS — Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión de trabajo.
> Última actualización: 2026-05-12

---

## Fase actual: Fase 3 — HTML Shell + Router hash

### En progreso 🔄

- [ ] 3.1 — Shell principal con landmarks semánticos (`header`, `nav`, `main`, `aside`)
- [ ] 3.2 — Sidebar con 8 secciones de navegación
- [ ] 3.3 — `main` con 8 `<section>` vacíos (contenedores listos para Fases 5–12)
- [ ] 3.4 — Scaffolding de modales vacíos (listos para Fases 5–12)
- [ ] 3.5 — PWA meta tags (`viewport`, `theme-color`, `manifest`, `modulepreload`)
- [ ] 3.6 — `modules/infra/router.js` — hash routing con `hashchange`
- [ ] 3.7 — `modules/ui/shell.js` — navegación activa + tema toggle

### Criterios de salida de Fase 3

- [ ] 0 `onclick=""` en index.html
- [ ] Hash routing funciona: `#dash`, `#gast`, `#compromisos`, etc.
- [ ] Sidebar marca el ítem activo correctamente
- [ ] Keyboard navigation: Tab, Enter, flechas navegan el sidebar
- [ ] W3C Validator: 0 errores
- [ ] Bento demo reemplazado por dashboard real vacío

**Modelo recomendado:** Sonnet 4.6 — Esfuerzo Medio

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

---

## Backlog (fases futuras)

Ver [ROADMAP.md](ROADMAP.md) para el detalle completo de Fases 4–14.

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
