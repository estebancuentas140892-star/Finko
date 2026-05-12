# TASKS — Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión de trabajo.
> Última actualización: 2026-05-12

---

## Fase actual: Fase 1 — Esqueleto + documentación

### Completadas ✅

- [x] 1.0 — Inicializar git + crear estructura de carpetas
- [x] 1.1 — `package.json` con devDeps (vitest, eslint, prettier, happy-dom)
- [x] 1.2 — `.gitignore`, `.prettierrc`, `eslint.config.js`, `.editorconfig`
- [x] 1.3 — `README.md` en raíz
- [x] 1.4 — `docs/ARCHITECTURE.md`
- [x] 1.5 — `docs/ROADMAP.md`
- [x] 1.6 — `docs/TASKS.md` (este archivo)

### En progreso 🔄

- [ ] 1.7 — `docs/CHANGELOG.md`
- [ ] 1.8 — `docs/CONTRIBUTING.md`
- [ ] 1.9 — `docs/IA_CONTEXT.md`
- [ ] 1.10 — `docs/DECISIONS/001-no-build-step.md`
- [ ] 1.11 — `index.html` stub + `styles/main.css` stub (para ver en el navegador)
- [ ] 1.12 — `tests/setup.js` + `vitest.config.js`
- [ ] 1.13 — `npm install` funcional
- [ ] 1.14 — Primer commit git

### Criterios de salida de Fase 1

- [ ] `npm install` sin errores
- [ ] `npm test` corre sin falla (aunque no haya tests todavía)
- [ ] `index.html` abre en el navegador en `http://localhost:8080` sin errores
- [ ] Todos los `.md` creados y con contenido real (no placeholders vacíos)
- [ ] Primer commit limpio con mensaje `chore: fase 1 — esqueleto y documentación inicial`

---

## Próxima fase: Fase 2 — Design System + CSS base

### Tareas (pendientes de activar)

- [ ] 2.1 — `styles/tokens.css`
- [ ] 2.2 — `styles/reset.css`
- [ ] 2.3 — `styles/base.css`
- [ ] 2.4 — `styles/components.css`
- [ ] 2.5 — `styles/layout.css` (incluyendo Bento Grid)
- [ ] 2.6 — `styles/modals.css`
- [ ] 2.7 — `styles/themes.css`
- [ ] 2.8 — `styles/a11y.css`
- [ ] 2.9 — `styles/responsive.css`
- [ ] 2.10 — `styles/utils.css`
- [ ] 2.11 — `styles/main.css` (importa todo con `@layer`)
- [ ] 2.12 — `docs/DESIGN_SYSTEM.md` con todos los tokens documentados

**Modelo recomendado:** Sonnet 4.6 — Esfuerzo Alto

---

## Backlog (fases futuras)

Ver [ROADMAP.md](ROADMAP.md) para el detalle completo de Fases 3–14.

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
