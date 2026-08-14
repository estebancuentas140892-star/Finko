# Finko - Tu dinero, tu control

> Revisado: 2026-08-11.

PWA offline-first para gestión financiera personal en Colombia.
Sin servidor. Sin cuenta. Sin rastreo. Tu información nunca sale de tu dispositivo.

**Versión actual:** `v1.0.0` ✅ (post-v1.0 activo, ver [`docs/BOARD.md`](docs/BOARD.md))

---

## Qué hace

- Registra ingresos, gastos, gastos fijos y deudas
- Gestiona deudas con estrategias de Avalancha y Bola de Nieve, más renegociación y consolidación simuladas
- Administra cuentas bancarias, efectivo y la distribución automática del ingreso ("Distribuir mi ingreso")
- Hace seguimiento de metas de ahorro, apartados para gastos previsibles, fondo de emergencia e inversiones
- Provee análisis de salud financiera, patrimonio neto, logros y alertas
- Calcula CDT, crédito de consumo, interés compuesto y regla 72 (integrados en Inversión y Deudas)
- Opera 100% offline: funciona sin internet después de la primera carga
- Basada en normativa financiera colombiana (SMMLV, UVT, GMF)

---

## Cómo correr la app localmente

```bash
# Opción 1: Python (recomendado, sin instalación)
python -m http.server 8080
# Abrir: http://localhost:8080

# Opción 2: Node (si está instalado)
npx serve .
```

**No abrir `index.html` directamente** - los ES6 modules requieren un servidor HTTP.

---

## Comandos de desarrollo

El proyecto usa **pnpm** (ver [`docs/SECURITY.md`](docs/SECURITY.md) para el porqué de la migración desde npm).

```bash
# Instalar dependencias de desarrollo
pnpm install

# Tests unitarios (Vitest + happy-dom)
pnpm test
pnpm run test:watch          # modo TDD
pnpm run coverage            # umbral 90% sobre capa lógica

# Tests E2E (Playwright + Chromium)
pnpm run hooks:on            # una vez por clon: activa el pre-commit de .githooks
pnpm run e2e:check           # responde si el cambio obliga a correrlos
pnpm run test:e2e            # al salir verde, sella el runtime que aprobó
pnpm run test:e2e:ui         # con inspector

# Auditoría Lighthouse (requiere servidor en :8080 corriendo)
pnpm run lighthouse
# → coverage/lighthouse-report.html

# Lint y formato
pnpm run lint
pnpm run format

# Servidor local (los ES6 modules no cargan abriendo index.html directo)
pnpm run serve               # http://localhost:8080

# Harness de rendimiento (comparar contra scripts/perf/BASELINE.md)
pnpm perf
```

---

## Documentación

| Documento | Propósito |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | **Punto de entrada para Claude Code/Cursor.** Workflow + reglas + estado actual. |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Capas, flujo de datos, reglas innegociables. |
| [`docs/BOARD.md`](docs/BOARD.md) | Tablero Kanban: tarea en proceso + pendientes por sección de la app. |
| [`docs/BUGS.md`](docs/BUGS.md) | Registro de errores conocidos. |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Memoria del proyecto - mes corriente + índice a `docs/changelog/`. |
| [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) | Convenciones, commits, naming, patrones de código. |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Tokens, componentes, Bento Grid. |
| [`docs/DECISIONS/`](docs/DECISIONS/) | ADRs (Architecture Decision Records). |

Reglas ADN y arquitectura detallada: [`CLAUDE.md`](CLAUDE.md) §4 y [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Métricas actuales

Cifras de tests y cobertura vivas en [`docs/HANDOFF.md`](docs/HANDOFF.md) sección 1 (se actualizan en cada tarea; no se duplican aquí para no desincronizarse).

| Métrica | Objetivo |
|---|---|
| Lighthouse Performance / Accessibility / Best Practices / SEO | ≥ 99 en las 4 |
| `onclick=""` en HTML | 0 |
| `window.X` en módulos | 0 |
| `style=""` inline en `index.html` | 1 (el wrapper oculto del sprite SVG, deliberado) |
| Cobertura lógica (`core/` + `dominio/*/logic.js`) | ≥ 90% |

---

## Próximos pasos

Ver [`docs/BOARD.md`](docs/BOARD.md).
Áreas activas: deploy a dominio custom, mantenimiento de constantes legales, mejoras por sección.
