# TASKS — Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión de trabajo.
> Última actualización: 2026-05-12

---

## Fase actual: Fase 14 — PWA + Service Worker + cierre

Próximo paso del [ROADMAP.md](ROADMAP.md).

---

## Completadas ✅

### Fase 13 — Onboarding + Configuración ✅

- [x] 13.1 — `modules/ui/onboarding.js` — wizard real de bienvenida: inyecta form en `#onboarding-body`, guarda `S.perfil.nombre` + `S.onboarded = true`, usa sistema de modales existente
- [x] 13.2 — `modules/dominio/config/view.js` — `renderPanelConfig()`: sección perfil (nombre+SMMLV editable), sección datos (exportar/importar/resetear), sección acerca de
- [x] 13.3 — `modules/dominio/config/index.js` — `initConfig()`: acciones `exportar-datos` (Blob + URL.createObjectURL), `resetear-app`; importar via `<input type="file">` + FileReader + localStorage.setItem + reload
- [x] Actualizado `modules/ui/bootstrap.js` — importa y llama `initConfig()`
- [x] Actualizado `index.html` — agrega `#onboarding` modal (wizard)
- [x] Actualizado `eslint.config.js` — agrega `Blob`, `URL`, `FileReader` como globals
- [x] Criterio: `npm test` → 294/294 verdes, lint limpio

### Fase 12 — Calculadoras financieras ✅

- [x] 12.0 — Fix `modules/infra/router.js` — faltaba entrada `['ingresos', 'sec-ingresos']` en SECTIONS
- [x] 12.1 — `modules/dominio/calculadoras/logic.js` — `calcularCDT()` (retención 7%), `calcularCredito()` (sistema francés, EA→mensual), `calcularInteresCompuesto()` (capitalización periódica), `calcularRegla72()` (aproximado + logarítmico), `calcularPrima()` (Ley 1788/2016, auxilio si ≤ 2 SMMLV), `validarCampos()`
- [x] 12.2 — `modules/dominio/calculadoras/view.js` — `renderPanelCalculadoras()` + 5 `renderResultX()` (CDT, crédito, IC, R72, prima)
- [x] 12.3 — `modules/dominio/calculadoras/index.js` — `initCalculadoras()`: stateless, sin data-action, lazy via hashchange
- [x] 12.4 — `tests/unit/calculadoras.test.js` — 39 tests (CDT, crédito, IC, regla72, prima, validarCampos); fix redondeo cuota crédito con tolerancia ±plazo
- [x] Actualizado `modules/ui/bootstrap.js` — importa y llama `initCalculadoras()`
- [x] Criterio: `npm test` → 294/294 verdes, lint limpio

### Fase 11 — Dominio: Análisis financiero ✅

- [x] 11.1 — `modules/dominio/analisis/logic.js` — capa de agregación cross-domain: `calcularBalance()`, `calcularTasaAhorro()`, `nivelSalud()` (excelente/buena/ajustada/critica), `generarResumen()` (agrega ingresos, gastos, compromisos, cuentas)
- [x] 11.2 — `modules/dominio/analisis/view.js` — `renderAnalisis()`: métricas 4-cards, salud con barra de progreso, gastos por categoría con barras proporcionales, alertas hormiga
- [x] 11.3 — `modules/dominio/analisis/index.js` — `initAnalisis()`: sin acciones (solo lectura), `registrarRender`, EventBus observa 4 secciones
- [x] 11.4 — `tests/unit/analisis.test.js` — 28 tests (calcularBalance, calcularTasaAhorro, nivelSalud, generarResumen)
- [x] Actualizado `modules/ui/bootstrap.js` — importa y llama `initAnalisis()`
- [x] Fix: import `nivelSalud` sobrante eliminado de view.js
- [x] Criterio: `npm test` → 255/255 verdes, lint limpio

### Fase 10 — Dominio: Compromisos ✅

- [x] 10.1 — `modules/dominio/compromisos/logic.js` — `TIPOS_COMPROMISO`, `LABEL_TIPO`, `ICONO_TIPO`, `compromisosActivos()`, `calcularCompromisoMensual()`, `calcularTotalCompromisos()`, `proximoVencimiento()`, `urgencia()`, `validarCompromiso()`, `normalizarCompromiso()`
- [x] 10.2 — `modules/dominio/compromisos/view.js` — `renderListaCompromisos()` (ordenada por urgencia + chip de días), `renderFormCompromiso()`
- [x] 10.3 — `modules/dominio/compromisos/index.js` — `initCompromisos()`: acciones `nuevo-compromiso` / `eliminar-compromiso`, inyección de form, `updateBadge`, suscripción EventBus
- [x] 10.4 — `tests/unit/compromisos.test.js` — 40 tests (catálogos, compromisosActivos, calcularCompromisoMensual, calcularTotalCompromisos, proximoVencimiento, urgencia, validar, normalizar)
- [x] Actualizado `modules/ui/bootstrap.js` — importa y llama `initCompromisos()`
- [x] Actualizado `index.html` — botón compromisos → `data-action="nuevo-compromiso"`
- [x] Criterio: `npm test` → 227/227 verdes, lint limpio

### Fase 9 — Dominio: Metas ✅

- [x] 9.1 — `modules/dominio/metas/logic.js` — `metasActivas()`, `calcularProgreso()`, `diasHastaFecha()`, `calcularAhorroDiario()`, `validarMeta()`, `validarAbono()`, `normalizarMeta()`
- [x] 9.2 — `modules/dominio/metas/view.js` — `renderListaMetas()` (lista + progress bar + empty state), `renderFormMeta()`
- [x] 9.3 — `modules/dominio/metas/index.js` — `initMetas()`: acciones `nueva-meta` / `eliminar-meta` / `abonar-meta` (window.prompt), inyección de form, suscripción EventBus
- [x] 9.4 — `tests/unit/metas.test.js` — 41 tests (metasActivas, calcularProgreso, diasHastaFecha, calcularAhorroDiario, validar, validarAbono, normalizar)
- [x] Actualizado `modules/ui/bootstrap.js` — importa y llama `initMetas()`
- [x] Actualizado `index.html` — botón metas → `data-action="nueva-meta"`
- [x] Criterio: `npm test` → 187/187 verdes, lint limpio
- [x] Criterio: crear meta → aparece en lista con barra de progreso; abonar → % actualiza

### Fase 8 — Dominio: Ingresos + Gastos ✅

- [x] 8.1 — `modules/dominio/ingresos/logic.js` — `ingresosActivos()`, `calcularIngresoMensual()`, `calcularTotalMensual()`, `validarIngreso()`, `normalizarIngreso()`
- [x] 8.2 — `modules/dominio/gastos/logic.js` — `gastosMes()`, `totalGastos()`, `totalGastosMes()`, `gastosPorCategoria()`, `detectarHormigas()`, `validarGasto()`, `normalizarGasto()`
- [x] 8.3 — `modules/dominio/ingresos/view.js` — `renderResumenIngresos()`, `renderListaIngresos()`, `renderFormIngreso()`
- [x] 8.4 — `modules/dominio/gastos/view.js` — `renderResumenGastos()`, `renderListaGastos()`, `renderFormGasto()`
- [x] 8.5 — `modules/dominio/ingresos/index.js` — `initIngresos()`: acciones `nuevo-ingreso` / `eliminar-ingreso`, inyección de form, suscripción EventBus, `registrarRender`
- [x] 8.6 — `modules/dominio/gastos/index.js` — `initGastos()`: acciones `nuevo-gasto` / `eliminar-gasto`, inyección de form, suscripción EventBus, pre-rellena fecha
- [x] 8.7 — `tests/unit/ingresos.test.js` — 31 tests (ingresosActivos, calcularIngresoMensual, calcularTotalMensual, validar, normalizar)
- [x] 8.8 — `tests/unit/gastos.test.js` — 33 tests (gastosMes, totalGastos, gastosPorCategoria, detectarHormigas, validar, normalizar)
- [x] Actualizado `modules/ui/bootstrap.js` — importa y llama `initIngresos()` y `initGastos()`
- [x] Actualizado `index.html` — bento `#ingresos-mes`, sección `#sec-ingresos`, `modal-ingreso`, botón gastos → `data-action="nuevo-gasto"`
- [x] Criterio: `npm test` → 146/146 verdes, lint limpio
- [x] Criterio: registrar ingreso → `#ingresos-mes` actualiza; registrar gasto → `#gastos-mes` actualiza

### Fase 7 — Dominio: Tesorería ✅

- [x] 7.1 — `modules/dominio/tesoreria/logic.js` — `cuentasActivas()`, `calcularTotalCuentas()`, `validarCuenta()`, `normalizarCuenta()`, `_iconoPorBanco()`
- [x] 7.2 — `modules/dominio/tesoreria/view.js` — `renderListaCuentas()` (lista + empty state), `renderFormCuenta()` (HTML del modal)
- [x] 7.3 — `modules/dominio/tesoreria/index.js` — `initTesoreria()`: acciones `nueva-cuenta` / `eliminar-cuenta`, inyección de form, suscripción EventBus
- [x] 7.4 — `tests/unit/tesoreria.test.js` — 24 tests de logic.js (cuentasActivas, calcularTotal, validar, normalizar)
- [x] Actualizado `modules/ui/bootstrap.js` — importa y llama `initTesoreria()`
- [x] Actualizado `index.html` — botón Tesorería usa `data-action="nueva-cuenta"`
- [x] `eslint.config.js` — agrega `FormData`, `varsIgnorePattern: '^_'`
- [x] Criterio: `npm test` → 82/82 verdes, lint limpio
- [x] Criterio: agregar cuenta → saldo `$850.000` en dashboard; eliminar → empty state + saldo `$0`

### Fase 6 — UI Shell ✅

- [x] 6.1 — `modules/ui/bootstrap.js` — entry point: loadData → initAcciones → initShell → initRouter → initOnboarding → renderAll
- [x] 6.2 — `modules/ui/actions.js` — `registrarAccion()` + `dispatch()` + `initAcciones()` (built-ins: theme-toggle, modal-open, modal-close)
- [x] 6.3 — `modules/ui/modales.js` — `abrirModal()` (trapFocus), `cerrarModal()` (releaseFocus), `resetModal()`
- [x] 6.4 — `modules/ui/onboarding.js` — stub funcional: auto-completa `S.onboarded`; Fase 12 completa el wizard
- [x] Eliminado `events.js` (reemplazado por bootstrap.js + actions.js + modales.js)
- [x] Actualizado `index.html`: script + preloads apuntan a bootstrap.js
- [x] Criterio: `npm test` → 58/58 verdes, lint limpio
- [x] Criterio: modal-open, Escape, theme-toggle verificados en navegador

### Fase 5 — Infra JS ✅

- [x] 5.1 — `modules/infra/utils.js` — `f()`, `hoy()`, `fechaLegible()`, `dialogo()`
- [x] 5.2 — `modules/infra/render.js` — `renderSmart()`, `updSaldo()`, `updateBadge()`, `renderAll()`, `registrarRender()`
- [x] 5.3 — `modules/infra/a11y.js` — `announce()`, `trapFocus()`, `releaseFocus()`
- [x] 5.4 — `modules/infra/crud.js` — `guardar()`, `editar()`, `eliminar()`
- [x] 5.5 — `tests/unit/utils.test.js` — 15 tests | `tests/unit/crud.test.js` — 19 tests
- [x] Criterio: `npm test` → 58/58 verdes
- [x] Criterio: `npm run lint` → limpio
- [x] Criterio: `updSaldo()` verificado en navegador — DOM actualiza al guardar cuenta

### Fase 4 — Core JS (state + storage + constants) ✅

- [x] 4.1 — `modules/core/constants.js` — constantes financieras CO (SMMLV, UVT, tasa usura, GMF, catálogos)
- [x] 4.2 — `modules/core/state.js` — singleton `S` mutable con schema v1 + `createInitialState()` + EventBus
- [x] 4.3 — `modules/core/storage.js` — `loadData()` con migración, `save()` debounced 200ms
- [x] 4.4 — `tests/unit/storage.test.js` — 13 tests (round-trip, debounce, corrupción, idempotencia)
- [x] 4.5 — `tests/unit/state.test.js` — 11 tests (schema, factory, EventBus pub/sub)
- [x] 4.6 — Integrar `loadData()` en `modules/ui/events.js` al arrancar
- [x] Criterio: `npm test` → 24/24 verdes
- [x] Criterio: `npm run lint` → limpio (sin `window.X`)
- [x] Criterio: roundtrip `save()` + `loadData()` verificado en navegador (puerto 8082)

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
