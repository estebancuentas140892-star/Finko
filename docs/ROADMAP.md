# Roadmap — Finko Claude

> Documento vivo. Se actualiza al completar cada fase.
> Última revisión: 2026-05-12

---

## Estado actual

**Fase activa:** Fase 1 — Esqueleto y documentación
**Próxima:** Fase 2 — Design System + CSS base

---

## Visión de las 14 fases

| Fase | Nombre | Estado | Modelo | Esfuerzo |
|---|---|---|---|---|
| 0 | Análisis y alineación arquitectural | ✅ Completada | Opus 4.7 | Medio |
| 1 | Esqueleto + documentación inicial | 🔄 En curso | Sonnet 4.6 | Medio |
| 2 | Design System + CSS base | ⏳ Pendiente | Sonnet 4.6 | Alto |
| 3 | HTML Shell + Router hash | ⏳ Pendiente | Sonnet 4.6 | Medio |
| 4 | Core JS (state, storage, constants) | ⏳ Pendiente | Opus 4.7 | Alto |
| 5 | Infra JS (utils, render, a11y, crud, router) | ⏳ Pendiente | Sonnet 4.6 | Medio |
| 6 | UI Shell (bootstrap, shell, actions, modales) | ⏳ Pendiente | Sonnet 4.6 | Medio |
| 7 | Dominio: Tesorería | ⏳ Pendiente | Sonnet 4.6 | Alto |
| 8 | Dominio: Ingresos + Gastos | ⏳ Pendiente | Sonnet 4.6 | Alto |
| 9 | Dominio: Compromisos (fijos + deudas + agenda) | ⏳ Pendiente | Opus 4.7 | Alto |
| 10 | Dominio: Metas + Calculadoras (lazy) | ⏳ Pendiente | Sonnet 4.6 | Medio |
| 11 | Dominio: Análisis (logros, salud, alertas) | ⏳ Pendiente | Opus 4.7 | Extra Alto |
| 12 | Onboarding + Empty states + Microcopy | ⏳ Pendiente | Sonnet 4.6 | Medio |
| 13 | PWA + Service Worker + Deploy | ⏳ Pendiente | Sonnet 4.6 | Medio |
| 14 | Verificación final (Lighthouse, axe, smoke test) | ⏳ Pendiente | Haiku 4.5 | — |

---

## Detalle por fase

### Fase 0 — Análisis y alineación ✅

**Objetivo:** entender el proyecto de referencia (Finko-Refactor) y definir la arquitectura del nuevo proyecto antes de escribir código.

**Salida:**
- Análisis de qué rescatar y qué evitar
- Decisiones tecnológicas justificadas
- Estructura de carpetas propuesta y aprobada
- Plan de 14 fases con criterios claros
- Modelos y esfuerzo definidos por fase

---

### Fase 1 — Esqueleto + documentación 🔄

**Objetivo:** crear la base estructural del proyecto. Sin HTML/CSS/JS de producto todavía.

**Tareas:** ver [TASKS.md](TASKS.md)

**Criterios de salida:**
- [ ] Estructura de carpetas completa
- [ ] `package.json` con devDeps funcional (`npm install` sin errores)
- [ ] `npm test` corre (aunque no haya tests todavía)
- [ ] Todos los `.md` de documentación inicial creados
- [ ] `index.html` y `styles/main.css` stub abiertos en el navegador sin errores
- [ ] Primer commit limpio

---

### Fase 2 — Design System + CSS base

**Objetivo:** construir el sistema de diseño completo en CSS antes de escribir HTML de producto.

**Tareas:**
- 2.1: `styles/tokens.css` — paleta, tipografía, espaciado, radii, sombras
- 2.2: `styles/reset.css` — normalización cross-browser
- 2.3: `styles/base.css` — tipografía base, focus visible global
- 2.4: `styles/components.css` — `.btn`, `.card`, `.input`, `.chip`, `.badge`, `.list-item`
- 2.5: `styles/layout.css` — shell de app, sidebar, Bento Grid base
- 2.6: `styles/modals.css` — overlay, animaciones
- 2.7: `styles/themes.css` — modo oscuro (default) y claro
- 2.8: `styles/a11y.css` — `prefers-reduced-motion`, alto contraste
- 2.9: `styles/responsive.css` — breakpoints
- 2.10: `styles/utils.css` — helpers
- 2.11: `styles/main.css` — importa todo con `@layer`
- 2.12: Actualizar `docs/DESIGN_SYSTEM.md` con todos los tokens

**Criterios de salida:**
- [ ] Todos los tokens CSS documentados en `DESIGN_SYSTEM.md`
- [ ] Modo oscuro/claro funcional con toggle
- [ ] Bento Grid responsive (desktop → tablet → móvil)
- [ ] Todos los componentes base visibles en el navegador
- [ ] Contraste WCAG AA en todos los textos principales
- [ ] `prefers-reduced-motion` respetado

**Modelo:** Sonnet 4.6 — Esfuerzo Alto
**Por qué:** decisiones de diseño requieren criterio y coherencia; no es una tarea mecánica. Sonnet es suficiente — no necesitamos Opus para CSS.

---

### Fase 3 — HTML Shell + Router

**Objetivo:** construir el `index.html` completo con semántica correcta y navegación funcional.

**Tareas:**
- 3.1: Shell principal (landmarks: `<header>`, `<nav>`, `<main>`, `<aside>`)
- 3.2: Sidebar con las 8 secciones de navegación
- 3.3: Contenedor principal con las 8 secciones (vacías por ahora)
- 3.4: Estructura de modales (vacíos, solo el scaffold)
- 3.5: Meta tags PWA (viewport, theme-color, manifest, modulepreload)
- 3.6: Hash routing básico en `modules/infra/router.js`
- 3.7: Shell JS en `modules/ui/shell.js` (navegación + tema)

**Criterios de salida:**
- [ ] La app abre en el navegador sin errores de consola
- [ ] La navegación entre secciones funciona (hash routing)
- [ ] Toggle de tema claro/oscuro funciona
- [ ] 0 `onclick=""` en todo el HTML
- [ ] Validador W3C limpio
- [ ] Navegación por teclado funcional (Tab, Enter, flechas en sidebar)

**Modelo:** Sonnet 4.6 — Esfuerzo Medio

---

### Fase 4 — Core JS (state, storage, constants)

**Objetivo:** implementar el núcleo de la app: estado, persistencia y constantes legales.

**Tareas:**
- 4.1: `modules/core/state.js` — Singleton `S` + EventBus con tipado JSDoc
- 4.2: `modules/core/storage.js` — `loadData()`, `save()` debounced, migración v1
- 4.3: `modules/core/constants.js` — SMMLV 2026, UVT 2026, tasa usura Q1-2026, GMF, bancos CO
- 4.4: Tests completos de `storage.js` (migraciones, snapshots)
- 4.5: Tests de `constants.js` (valores vigentes y fallbacks)

**Criterios de salida:**
- [ ] `npm test` verde con cobertura > 90% en `core/`
- [ ] `save()` debounce verificado (no escribe > 1x cada 200ms)
- [ ] Migración v1 idempotente (correr 2 veces no cambia el resultado)
- [ ] Constantes legales actualizadas con fuente y fecha de vencimiento

**Modelo:** Opus 4.7 — Esfuerzo Alto
**Por qué:** el core es el cimiento de toda la app. Un error aquí se propaga a todo. Opus garantiza la máxima precisión en el diseño del schema y las migraciones.

---

### Fase 5 — Infra JS

**Objetivo:** utilidades transversales que usan todos los módulos superiores.

**Tareas:**
- 5.1: `modules/infra/utils.js` — `f()` (formato moneda COP), `hoy()`, `dialogo()`
- 5.2: `modules/infra/render.js` — `renderSmart()`, `updSaldo()`, `updateBadge()`, `renderAll()`
- 5.3: `modules/infra/a11y.js` — `announce()`, `trapFocus()`, `releaseFocus()`
- 5.4: `modules/infra/crud.js` — `guardar()`, `editar()`, `eliminar()` genéricos sobre `S`
- 5.5: Tests de `utils.js`, `crud.js`

**Modelo:** Sonnet 4.6 — Esfuerzo Medio

---

### Fase 6 — UI Shell

**Objetivo:** orquestación completa de la interfaz.

**Tareas:**
- 6.1: `modules/ui/bootstrap.js` — entry point, inicialización, carga de dominios
- 6.2: `modules/ui/actions.js` — delegador `data-action` con `dispatch()`
- 6.3: `modules/ui/modales.js` — factory: `abrirModal()`, `cerrarModal()`, `resetModal()`
- 6.4: `modules/ui/onboarding.js` — wizard 3 pasos para `!S.onboarded`

**Modelo:** Sonnet 4.6 — Esfuerzo Medio

---

### Fases 7–11 — Dominios

Cada dominio se implementa en una fase propia:
- Primero `logic.js` con sus tests (TDD)
- Luego `view.js` para el render
- Verificar en navegador antes de continuar

---

### Fase 12 — Onboarding + Empty states + Microcopy

**Objetivo:** UX humana. La app acompaña y orienta al usuario.

**Tareas:**
- Empty states con CTA en todas las secciones vacías
- Microcopy revisado: lenguaje claro, sin tecnicismos
- Tooltips de ayuda en campos complejos
- Mensajes de éxito y error claros

**Modelo:** Sonnet 4.6 — Esfuerzo Medio

---

### Fase 13 — PWA + Service Worker

**Objetivo:** la app funciona 100% offline tras la primera carga.

**Tareas:**
- `manifest.json` completo (íconos 192/512, name, short_name, theme_color)
- `service-worker.js` cache-first con lista completa de assets
- Test offline en DevTools (Network → Offline)
- Deploy a Vercel o Netlify

**Modelo:** Sonnet 4.6 — Esfuerzo Medio

---

### Fase 14 — Verificación final

**Objetivo:** confirmar que todo funciona y cumple los criterios de calidad.

**Criterios:**
- [ ] Lighthouse Accessibility ≥ 95
- [ ] Lighthouse Performance ≥ 90
- [ ] axe-core sin issues críticos
- [ ] Smoke test manual completo (todos los flujos)
- [ ] `npm test` verde con cobertura ≥ 90%
- [ ] Navegación completa por teclado

**Modelo:** Haiku 4.5 (o manual)

---

## Métricas objetivo (v1.0)

| Métrica | Objetivo |
|---|---|
| LOC por archivo de dominio | < 400 |
| `style=""` inline en HTML | 0 |
| `window.X` en módulos | 0 |
| `onclick=""` en HTML | 0 |
| Lighthouse Accessibility | ≥ 95 |
| Lighthouse Performance | ≥ 90 |
| Cobertura de tests | ≥ 90% |
| Tiempo de carga offline | < 2s |
