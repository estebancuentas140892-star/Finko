# Finko — Tu plata, tu control

PWA offline-first para gestión financiera personal en Colombia.
Sin servidor. Sin cuenta. Sin rastreo. Tu información nunca sale de tu dispositivo.

---

## Qué hace

- Registra ingresos, gastos y compromisos por quincena
- Gestiona deudas con estrategias de Avalancha y Bola de Nieve
- Administra cuentas bancarias, bolsillos y fondo de emergencia
- Hace seguimiento de metas de ahorro e inversiones
- Provee análisis de salud financiera, logros y alertas
- Calcula CDT, crédito de consumo, interés compuesto, prima de servicios
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

Abre `http://localhost:8080` en el navegador.
**No abrir `index.html` directamente** — los ES6 modules requieren un servidor HTTP.

---

## Comandos de desarrollo

```bash
# Instalar dependencias de desarrollo
npm install

# Correr tests
npm test

# Tests en modo watch (para TDD)
npm run test:watch

# Ver cobertura
npm run coverage

# Lint
npm run lint

# Formatear código
npm run format
```

---

## Estructura del proyecto

```
Finko_Claude/
├─ index.html              ← Shell principal de la app
├─ manifest.json           ← PWA manifest
├─ service-worker.js       ← Cache-first offline
├─ styles/                 ← CSS modular por capa
│  ├─ tokens.css           ← Variables de diseño
│  └─ main.css             ← Punto de entrada CSS
├─ modules/
│  ├─ core/                ← Estado, persistencia, constantes
│  ├─ infra/               ← Utilidades, render, a11y, CRUD, router
│  ├─ ui/                  ← Bootstrap, shell, navegación, modales
│  └─ dominio/             ← Lógica de negocio por dominio
├─ tests/                  ← Tests unitarios e integración
├─ scripts/                ← Utilidades de mantenimiento
└─ docs/                   ← Documentación del proyecto
```

Para entender la arquitectura en profundidad: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Documentación

| Documento | Propósito |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Capas, flujo de datos, reglas innegociables |
| [ROADMAP.md](docs/ROADMAP.md) | Fases y estado de avance |
| [TASKS.md](docs/TASKS.md) | Tareas activas y siguiente paso |
| [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Tokens, componentes, Bento Grid |
| [FINANCIAL_LOGIC_CO.md](docs/FINANCIAL_LOGIC_CO.md) | Constantes y lógica financiera colombiana |
| [ACCESSIBILITY.md](docs/ACCESSIBILITY.md) | WCAG, teclado, ARIA, lectores de pantalla |
| [IA_CONTEXT.md](docs/IA_CONTEXT.md) | Contexto compacto para asistentes IA |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | Convenciones, commits, naming |
| [CHANGELOG.md](docs/CHANGELOG.md) | Histórico de cambios |

---

## Principios del proyecto

1. **Vanilla JS sin build step** — el navegador entiende ES6 modules directamente.
2. **Offline-first** — el Service Worker garantiza operación sin red.
3. **Sin servidor** — privacidad absoluta; localStorage es la única persistencia.
4. **Lógica separada del DOM** — cada dominio tiene `logic.js` (puro, testeable) y `view.js` (render).
5. **Cero `onclick=""` en HTML estático** — todo vía `data-action` delegado.
6. **Cero `window.X`** — todo vía EventBus e imports explícitos.
7. **Lenguaje humano** — "Tu plata" antes que "Saldo disponible".

---

## Estado actual

Ver [docs/TASKS.md](docs/TASKS.md) para el estado en tiempo real.

Fase actual: **Fase 1 — Esqueleto y documentación inicial**
