# CLAUDE.md — Finko Claude

> **Este archivo es el punto de entrada para Claude Code (y cualquier asistente IA) al abrir esta carpeta.**
> Última revisión: 2026-05-18

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

**Obligatorio:** al final de **toda** respuesta (tarea cerrada, exploración, pregunta, ajuste pequeño — lo que sea) incluir el bloque `Próximo paso`. No omitirlo nunca, ni siquiera si la respuesta es corta. Si no hay tarea siguiente clara, proponer la más razonable del [`docs/ROADMAP.md`](docs/ROADMAP.md) y, si hay duda real, pedir input al usuario dentro del mismo bloque.

**Formato exacto (copiar tal cual, solo cambian los valores):**

```
─── Próximo paso ──────────────────────────────────
Tarea siguiente : <título corto>
Modelo sugerido : <Haiku 4.5 | Sonnet 4.6 — <nivel> | Opus 4.7 — <nivel>>
Por qué         : <una línea justificando modelo+nivel>
───────────────────────────────────────────────────
```

**Combinaciones válidas modelo + nivel** (no inventar otras, no mezclar):

| Modelo      | Niveles permitidos                                |
|---          |---                                                |
| Haiku 4.5   | (sin nivel — siempre se escribe `Haiku 4.5`)      |
| Sonnet 4.6  | Bajo · Medio · Alto                                |
| Opus 4.7    | Bajo · Medio · Alto · Extra Alto · Max             |

**Cuándo usar cada combinación.** Objetivo: **ahorrar tokens sin sacrificar calidad de código**. Ante la duda, subir un escalón antes que bajarlo: la calidad nunca se sacrifica.

| Combinación                | Cuándo usarla                                                                                              |
|---                         |---                                                                                                          |
| **Haiku 4.5**              | Verificación de tests verdes, lint, scripts triviales, renombres mecánicos, bumps de constantes (E.1/E.2), leer-y-reportar sin decisiones. |
| **Sonnet 4.6 — Bajo**      | CSS aislado, ajuste de copy, fix puntual con causa ya identificada, doc update; < 30 min, 1–2 archivos.    |
| **Sonnet 4.6 — Medio**     | Feature nueva en un solo dominio siguiendo patrón ya existente; 30–90 min, 3–6 archivos, tests nuevos.     |
| **Sonnet 4.6 — Alto**      | Feature que toca varios dominios o introduce patrones de UI/datos nuevos; 90 min – media jornada.          |
| **Opus 4.7 — Bajo**        | Bug sutil en lógica financiera (regla 72, sistema francés, EA↔mensual, retenciones) con repro clara.       |
| **Opus 4.7 — Medio**       | Nueva lógica financiera CO no trivial (amortización de deudas, escenarios fiscales, proyecciones).         |
| **Opus 4.7 — Alto**        | Decisión arquitectural acotada: bump de schema con migración, refactor cross-domain, nuevo dominio.        |
| **Opus 4.7 — Extra Alto**  | Refactor mayor o feature multidominio con trade-offs no obvios y riesgo real de regresión.                  |
| **Opus 4.7 — Max**         | Reescritura de subsistema crítico, debugging extremo sin pista, cambio que roza el ADN (requiere ADR).      |

**Regla de oro:** una sola tarea por respuesta. El bloque `Próximo paso` define qué se hace **después de verificar y commitear lo actual**, no qué se hace **ahora**. Si el usuario pide encadenar tareas, recordar esta regla y proponer hacer la primera, verificar en la app, y recién después la segunda.

### 2.4 Mantenimiento de los docs

Cuando una tarea/fase se completa, actualizar **en este orden**:

1. **`docs/HANDOFF.md`** — sección "Qué se hizo recientemente": agregar la tarea cerrada al tope de la lista (mantener solo las últimas 5); actualizar "Qué sigue" si cambió el orden de prioridades. Este archivo es el punto de entrada para cualquier asistente o colaborador nuevo.
2. **`docs/CHANGELOG.md`** — agregar la entrada bajo la versión correspondiente con fecha y archivos tocados.
3. **`docs/ROADMAP.md`** — eliminar la tarea completada (moverla a "Completadas" si la sección existe, o quitarla directamente).
4. **`docs/TASKS.md`** — eliminar la tarea si estaba en "En curso".
5. Si la tarea introduce convenciones nuevas → actualizar `docs/ARCHITECTURE.md` o `docs/CONTRIBUTING.md`.

**Regla:** ROADMAP/TASKS siempre muestran solo lo **pendiente**. CHANGELOG es la memoria histórica. HANDOFF.md es el contexto vivo para retomar trabajo rápido.

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
pnpm test               # 596 tests
pnpm run test:watch
pnpm run coverage       # umbral 90% sobre capa lógica

# E2E (Playwright + Chromium)
pnpm run test:e2e       # 18 smoke tests
pnpm run test:e2e:ui

# Lighthouse (requiere servidor en :8080 corriendo)
pnpm run lighthouse     # → coverage/lighthouse-report.html

# Lint
pnpm run lint
pnpm run format
```

---

## 5. Antes de tocar código, leer

1. **Este archivo** (estás aquí) — 3 min.
2. [`docs/HANDOFF.md`](docs/HANDOFF.md) — qué se hizo recientemente, qué sigue, cómo trabajamos — 2 min.
3. [`docs/TASKS.md`](docs/TASKS.md) — tarea activa hoy.
4. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — capas, flujo de datos, reglas — 10 min.
5. [`docs/IA_CONTEXT.md`](docs/IA_CONTEXT.md) — patrones detallados de uso.
6. [`docs/SECURITY.md`](docs/SECURITY.md) — **obligatorio si vas a tocar dependencias o setup de entorno** (política anti-malware npm, migración a pnpm, audits previos).
7. Si la tarea es de dominio nuevo → [`docs/FINANCIAL_LOGIC_CO.md`](docs/FINANCIAL_LOGIC_CO.md) cuando exista.

---

## 6. Convenciones rápidas

- **Imports:** siempre con `.js`, rutas relativas (`../core/state.js`).
- **Commits:** `tipo(área): descripción`. Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`.
- **Naming:** dominios en español (`ingresos`, `compromisos`); infra/ui en inglés (`state`, `actions`).
- **Tests verdes obligatorios** antes de cada commit.
- **CSS:** solo `var(--fk-*)`, nunca hardcodear colores ni tamaños.

---

## 7. Estilo de escritura (obligatorio)

> Estas reglas aplican a **todo texto** generado en el proyecto: respuestas en chat, commits, comentarios de código, documentación (`.md`), microcopy de UI, mensajes de error, alertas, nudges, tests, scripts.

### 7.1 Prohibido el guion largo `—` (em dash, U+2014)

**Nunca** usar el carácter `—` en ningún texto del proyecto. Tampoco usar `–` (en dash, U+2013) ni variantes Unicode similares.

**Por qué:** confunde lectores, no se escribe con teclado estándar en español/inglés, no copia/pega bien entre editores y terminales, y rompe el tono natural del proyecto.

**Qué usar en su lugar** (en orden de preferencia):

| En vez de `—` | Usar | Ejemplo |
|---|---|---|
| Pausa o aclaración | `:` (dos puntos) | "Resumen: 702 tests verdes." |
| Apertura de explicación | `.` (punto y aparte) | "App estable. Modo mantenimiento." |
| Inciso corto | `(...)` (paréntesis) | "El SMMLV (vigente 2026) es $1.750.905." |
| Conector de continuación | `-` (guion simple) | "Sonnet 4.6 - Alto." |
| Rango numérico | `-` (guion simple) o "a" | "30-90 min" / "30 a 90 min" |
| Separador visual | `,` (coma) | "Calidad primero, ahorro segundo." |

### 7.2 Cómo verificarlo

Antes de commitear cualquier texto nuevo, buscar `—` en los archivos modificados:

```bash
grep -rn "—" archivo.md       # debe devolver 0 líneas
grep -rn $'—' archivo.md # alternativa explícita
```

En VS Code: `Ctrl+F` con el carácter `—` pegado al campo de búsqueda.

### 7.3 Excepción única

Los `—` que aparezcan en datos de usuario provenientes de copy/paste externo (por ejemplo, un import CSV con notas que contienen guiones largos) **se preservan tal cual**. La regla aplica a texto que escribimos nosotros, no a contenido del usuario.

### 7.4 Limpieza progresiva

Los archivos existentes (`HANDOFF.md`, `CHANGELOG.md`, `CLAUDE.md`, etc.) tienen `—` heredados. **No es obligatorio limpiarlos de golpe**: cuando se toque un archivo `.md` por otra razón, aprovechar para reemplazar los `—` por la alternativa correcta. En texto nuevo, la regla es estricta: cero `—`.
