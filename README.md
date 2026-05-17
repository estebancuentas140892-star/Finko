# Finko — Tu plata, tu control

PWA offline-first para gestión financiera personal en Colombia.
Sin servidor. Sin cuenta. Sin rastreo. Tu información nunca sale de tu dispositivo.

**Versión actual:** `v1.0.0` ✅

---

## Qué hace

- Registra ingresos, gastos y compromisos por quincena
- Gestiona deudas con estrategias de Avalancha y Bola de Nieve
- Administra cuentas bancarias, bolsillos y fondo de emergencia
- Hace seguimiento de metas de ahorro e inversiones
- Provee análisis de salud financiera, logros y alertas
- Calcula CDT, crédito de consumo, interés compuesto, regla 72, prima de servicios
- Opera 100% offline: funciona sin internet después de la primera carga
- Basada en normativa financiera colombiana (SMMLV, UVT, tasa de usura, GMF)

---

## Cómo correr la app localmente

```bash
# Opción 1: Python (recomendado, sin instalación)
python -m http.server 8080
# Abrir: http://localhost:8080

# Opción 2: Node (si está instalado)
npx serve .
```

**No abrir `index.html` directamente** — los ES6 modules requieren un servidor HTTP.

---

## Comandos de desarrollo

```bash
# Instalar dependencias de desarrollo
npm install

# Tests unitarios (Vitest + happy-dom) — 300 tests
npm test
npm run test:watch          # modo TDD
npm run coverage            # umbral 90% sobre capa lógica

# Tests E2E (Playwright + Chromium) — 18 smoke tests
npm run test:e2e
npm run test:e2e:ui         # con inspector

# Auditoría Lighthouse (requiere servidor en :8080 corriendo)
npm run lighthouse
# → coverage/lighthouse-report.html

# Lint y formato
npm run lint
npm run format
```

---

## Estructura del proyecto

```
Finko_Claude/
├─ CLAUDE.md               ← workflow + reglas para asistentes IA
├─ index.html              ← shell principal de la app
├─ manifest.json           ← PWA manifest
├─ service-worker.js       ← cache-first offline
├─ styles/                 ← CSS modular por capa (@layer)
│  ├─ tokens.css           ← variables de diseño (--fk-*)
│  └─ main.css             ← punto de entrada CSS
├─ modules/
│  ├─ core/                ← estado, persistencia, constantes
│  ├─ infra/               ← utilidades, render, a11y, CRUD, router
│  ├─ ui/                  ← bootstrap, shell, actions, modales, onboarding
│  └─ dominio/             ← lógica por área (ingresos, gastos, compromisos, …)
├─ tests/
│  ├─ unit/                ← 300 tests sobre logic.js puro
│  └─ e2e/                 ← 18 smoke tests Playwright
├─ scripts/                ← gen-icons.py, lighthouse.js
└─ docs/                   ← documentación viva
```

Arquitectura detallada en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Documentación

| Documento | Propósito |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | **Punto de entrada para Claude Code/Cursor.** Workflow + reglas + estado actual. |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Capas, flujo de datos, reglas innegociables. |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Solo lo pendiente (post-v1.0). |
| [`docs/TASKS.md`](docs/TASKS.md) | Tarea activa hoy. |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Memoria del proyecto — qué se hizo en cada fase. |
| [`docs/IA_CONTEXT.md`](docs/IA_CONTEXT.md) | Patrones de uso para asistentes IA. |
| [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) | Convenciones, commits, naming. |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Tokens, componentes, Bento Grid. |
| [`docs/DECISIONS/`](docs/DECISIONS/) | ADRs (Architecture Decision Records). |

---

## Principios del proyecto

1. **Vanilla JS sin build step** — el navegador entiende ES6 modules directamente.
2. **Offline-first** — el Service Worker garantiza operación sin red.
3. **Sin servidor** — privacidad absoluta; `localStorage` es la única persistencia.
4. **Lógica separada del DOM** — cada dominio tiene `logic.js` (puro, testeable) y `view.js` (render).
5. **Cero `onclick=""` en HTML estático** — todo vía `data-action` delegado.
6. **Cero `window.X`** — todo vía EventBus e imports explícitos.
7. **Lenguaje humano** — "Tu plata" antes que "Saldo disponible".

---

## Métricas v1.0

| Métrica | Resultado |
|---|---|
| Lighthouse Performance | **99** |
| Lighthouse Accessibility | **100** |
| Lighthouse Best Practices | **100** |
| Lighthouse SEO | **100** |
| Tests unitarios | **300/300** |
| Tests E2E | **18/18** |
| Cobertura lógica (líneas / funciones) | **99.6% / 100%** |
| `onclick=""` en HTML | **0** |
| `window.X` en módulos | **0** |
| `style=""` inline en HTML | **0** |
| LOC máximo por archivo de dominio | **230** (objetivo < 400) |

---

## Próximos pasos

Ver [`docs/ROADMAP.md`](docs/ROADMAP.md) — sección "Post-v1.0".
Áreas activas: deploy a producción, mejora de íconos, tests de integración, mantenimiento de constantes legales.
