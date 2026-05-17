# CLAUDE.md — Finko Claude

> **Este archivo es el punto de entrada para Claude Code (y cualquier asistente IA) al abrir esta carpeta.**
> Última revisión: 2026-05-17

---

## 0. Estado del proyecto

**Versión:** `v1.0.0` — estable, completa, lista para usar.
**Tag git:** `v1.0.0`
**Próxima fase:** post-v1.0 (deploy, mejoras opcionales, mantenimiento).

Ver:
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) → qué se hizo en cada fase/tarea ya cerrada.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) → siguientes fases/ideas activas (todo lo de v1.0 fue eliminado, está en CHANGELOG).
- [`docs/TASKS.md`](docs/TASKS.md) → tareas activas hoy.

---

## 1. Qué es Finko

PWA offline-first de gestión financiera personal para Colombia.
Sin servidor. Sin cuenta. Sin sync. Todo vive en `localStorage`.
Vanilla JS + ES6 modules. **Sin framework, sin build step, sin TypeScript.**

Estructura de carpetas (resumen):

```
index.html            → shell + estructura HTML completa
manifest.json         → PWA manifest
service-worker.js     → cache-first offline
styles/               → CSS por capa (@layer)
modules/
  core/               → state.js, storage.js, constants.js
  infra/              → utils, render, a11y, crud, router
  ui/                 → bootstrap, shell, actions, modales, onboarding
  dominio/            → ingresos, gastos, compromisos, tesoreria,
                        metas, analisis, calculadoras, config
tests/
  unit/               → 300 tests Vitest + happy-dom (lógica pura)
  e2e/                → 18 smoke tests Playwright
scripts/              → gen-icons.py, lighthouse.js
docs/                 → ARCHITECTURE, ROADMAP, CHANGELOG, etc.
```

---

## 2. Workflow obligatorio del coaching

> Estas reglas son del usuario. Aplican **siempre**. No hay que pedirlas en cada sesión.

### 2.1 Una tarea/fase a la vez

- No saltar al "siguiente paso" sin que la tarea activa esté **verificada en la app** y commiteada.
- Si una tarea es muy grande, partirla y proponer el subset más pequeño que tenga sentido.

### 2.2 Reportar cambios para supervisar en la app

Al cerrar una tarea **siempre** decir, en este orden:

1. **Qué archivos cambiaron** (rutas relativas).
2. **Qué cambió en cada uno** (1–2 líneas por archivo).
3. **Cómo verificarlo en la app** — paso a paso: ruta visual, sección, modal, botón. Si requiere `python -m http.server 8080` o algún script, decirlo.
4. **Qué tests cubren el cambio** (si aplica).

### 2.3 Cierre obligatorio de cada conversación

Al final de cada respuesta que cierre una tarea o fase (o cuando el usuario diga "seguimos", "siguiente", etc.), incluir un bloque así:

```
─── Próximo paso ──────────────────────────────────
Tarea siguiente : <título corto>
Modelo sugerido : <Haiku 4.5 | Sonnet 4.6 | Opus 4.7>
Nivel de esfuerzo: <Bajo | Medio | Alto | Extra Alto>
Por qué         : <una línea justificando modelo+esfuerzo>
───────────────────────────────────────────────────
```

Criterios para elegir modelo:

| Modelo      | Cuándo usarlo                                                                 |
|---          |---                                                                            |
| Haiku 4.5   | Verificación, lint, cierre, scripts simples, ajustes mecánicos.               |
| Sonnet 4.6  | Default. CSS, HTML, dominios, refactors normales, tests, docs.                |
| Opus 4.7    | Decisiones arquitecturales, lógica financiera crítica, debugging complejo.    |

Niveles de esfuerzo:

| Nivel       | Significado                                                                   |
|---          |---                                                                            |
| Bajo        | < 30 min, cambios mecánicos, baja probabilidad de errores.                    |
| Medio       | 30–90 min, requiere pensar pero el camino es claro.                           |
| Alto        | 90 min – media jornada, varios archivos, posibles trade-offs.                 |
| Extra Alto  | Más de media jornada, decisiones de diseño, riesgo de regresiones.            |

### 2.4 Mantenimiento de los docs

Cuando una tarea/fase se completa:

- **Eliminar** la entrada del `ROADMAP.md` y de `TASKS.md`.
- **Agregar** la entrada al `CHANGELOG.md` bajo la versión correspondiente, con la fecha y los archivos tocados.
- Si la tarea introduce convenciones nuevas → actualizar `docs/ARCHITECTURE.md` o `docs/CONTRIBUTING.md`.

Esto garantiza que ROADMAP/TASKS siempre muestran solo lo **pendiente** y CHANGELOG es el archivo de memoria del proyecto.

### 2.5 Confirmar antes de cambios destructivos

Eliminar archivos, force push, reescribir historial, borrar tests existentes → **siempre** confirmar con el usuario antes.

---

## 3. Reglas innegociables (ADN)

1. **Vanilla JS sin build step** — no agregar bundlers, TS, frameworks.
2. **Offline-first** — el SW garantiza operación sin red.
3. **Sin servidor** — solo `localStorage` (clave `fk_v1`).
4. **Singleton `S` mutable** — no reactivity, no proxies.
5. **`save()` debounced 200ms** — nunca escribir a `localStorage` directo.
6. **Migraciones idempotentes** — cada bump de schema sube datos sin romper.
7. **Cero `onclick=""`** — todo vía `data-action` delegado en `actions.js`.
8. **Cero `window.X`** — todo `export` + `import`.
9. **`logic.js` sin DOM** — funciones puras, testeables en happy-dom/Node.
10. **Ningún dominio importa a otro** — comunicación por EventBus.
11. **Lenguaje humano** — "Tu plata" antes que "Saldo disponible".
12. **Constantes legales con fecha de revisión** — tasa de usura trimestral, SMMLV/UVT anual.

Tocar cualquiera de estas reglas requiere un ADR en `docs/DECISIONS/` y discusión explícita.

---

## 4. Comandos esenciales

```bash
# Servir la app (NO abrir index.html directo — ES6 modules requieren HTTP)
python -m http.server 8080

# Tests unitarios (happy-dom)
npm test                # 300 tests
npm run test:watch
npm run coverage        # umbral 90% sobre capa lógica

# E2E (Playwright + Chromium)
npm run test:e2e        # 18 smoke tests
npm run test:e2e:ui

# Lighthouse (requiere servidor en :8080 corriendo)
npm run lighthouse      # → coverage/lighthouse-report.html

# Lint
npm run lint
npm run format
```

---

## 5. Antes de tocar código, leer

1. **Este archivo** (estás aquí) — 3 min.
2. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — capas, flujo de datos, reglas — 10 min.
3. [`docs/TASKS.md`](docs/TASKS.md) — tarea activa hoy.
4. [`docs/IA_CONTEXT.md`](docs/IA_CONTEXT.md) — patrones detallados de uso.
5. Si la tarea es de dominio nuevo → [`docs/FINANCIAL_LOGIC_CO.md`](docs/FINANCIAL_LOGIC_CO.md) cuando exista.

---

## 6. Convenciones rápidas

- **Imports:** siempre con `.js`, rutas relativas (`../core/state.js`).
- **Commits:** `tipo(área): descripción`. Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`.
- **Naming:** dominios en español (`ingresos`, `compromisos`); infra/ui en inglés (`state`, `actions`).
- **Tests verdes obligatorios** antes de cada commit.
- **CSS:** solo `var(--fk-*)`, nunca hardcodear colores ni tamaños.
