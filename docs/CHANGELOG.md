# Changelog — Finko Claude

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

---

## [Unreleased]

### Fase 1 — Esqueleto y documentación (2026-05-12)

**Agregado:**
- Estructura de carpetas completa del proyecto
- `package.json` con devDependencies (vitest, eslint, prettier, happy-dom)
- Configuración de lint (`eslint.config.js`), formato (`.prettierrc`), editor (`.editorconfig`)
- `README.md` con guía de inicio y principios del proyecto
- `docs/ARCHITECTURE.md` — capas, flujo de datos, EventBus, reglas innegociables
- `docs/ROADMAP.md` — 14 fases con criterios de salida y modelos recomendados
- `docs/TASKS.md` — tablero de tareas vivo
- `docs/CONTRIBUTING.md` — convenciones de código, commits y naming
- `docs/IA_CONTEXT.md` — contexto compacto para asistentes IA
- `docs/DECISIONS/001-no-build-step.md` — primer ADR
- `index.html` stub y `styles/main.css` stub para preview en navegador
- `vitest.config.js` y `tests/setup.js` para correr tests

---

## [0.1.0] — Por publicar

Primera versión funcional del proyecto (al completar Fase 6 — UI Shell).

---

## Convención de entradas

Cada entrada de fase usa estas categorías:

- **Agregado** — funcionalidad nueva
- **Cambiado** — cambios en funcionalidad existente
- **Corregido** — corrección de bugs
- **Eliminado** — funcionalidad removida
- **Deprecado** — funcionalidad que se va a eliminar en el futuro
- **Seguridad** — cambios con implicaciones de seguridad
