# Changelog — Finko Claude

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se elimina del ROADMAP/TASKS y se agrega aquí.

---

### Íconos PNG producción + Apple Touch Icon (B.1) · 2026-05-18

Rediseño completo de los íconos PWA con técnica de supersampling.

**Resumen:**
- Diseño nuevo: 3 barras crecientes redondeadas (`#00dc82` sobre `#0f1117`). Gráfico financiero inmediatamente reconocible, funciona a 192px y 512px.
- Técnica: renderizado 4× (`2048px`, `768px`) + downscale `LANCZOS` → anti-aliasing de producción.
- Safe zone 80% cumplido: contenido dentro del área segura para `maskable`.
- Nuevo `apple-touch-icon.png` (180×180) para instalación en iOS Safari.
- `<link rel="apple-touch-icon">` agregado en `index.html`.
- `apple-touch-icon.png` en `OPTIONAL_ASSETS` del SW.

**Commits:**
- **feat(assets)** — `43dc878` · `scripts/gen-icons.py` (reescrito), `assets/icons/icon-192.png`, `assets/icons/icon-512.png`, `assets/icons/apple-touch-icon.png` (nuevo), `index.html`, `service-worker.js`.

---

### Deploy a producción — Netlify/Vercel (A.1) · 2026-05-18

Config de deploy estático lista para Netlify y Vercel. Sin build step.

**Resumen:**
- `netlify.toml`: `publish = "."`, sin comando de build, cache 1 año para JS/CSS, `no-cache` para `service-worker.js`, cabeceras de seguridad (`X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy: notifications=(self)`).
- `vercel.json`: configuración equivalente para Vercel.
- `service-worker.js`: 7 módulos post-v1.0 faltantes agregados a `CORE_ASSETS` (csv, svg, notificaciones, import/*, export/logic); `CACHE_NAME` bumpeado de `finko-v1` → `finko-v2`.

**Para publicar:**
```bash
# Netlify
npm i -g netlify-cli
netlify deploy --prod --dir .

# Vercel
npm i -g vercel
vercel --prod
```

**Commits:**
- **feat(deploy)** — `518a297` · `netlify.toml` (nuevo), `vercel.json` (nuevo), `service-worker.js` — config de headers, caché y seguridad; SW CORE_ASSETS completo; CACHE_NAME v2.

---

### Feature: Exportar gastos a CSV (D.1) — 2026-05-18

Exportación de gastos al mismo formato que acepta el importador (D.2), garantizando roundtrip completo.

**Resumen:**
- Botón "📤 Exportar gastos (CSV)" en Configuración → Tus datos, junto a los botones de importar.
- Función pura `gastosACSV(gastos, cuentas)` en `modules/dominio/export/logic.js`: serializa con BOM UTF-8 (compatibilidad Excel en Windows), ordena por fecha más reciente primero, resuelve `cuentaId` → nombre legible.
- Formato de salida: `fecha,monto,descripcion,categoria,cuenta,nota` — idéntico al que acepta D.2.
- Estado vacío: anuncia "No hay gastos para exportar" sin generar archivo.
- Archivo descargado: `finko-gastos-YYYY-MM-DD.csv`.

**Commits:**

- **feat(export)** — `f091091` · `modules/dominio/export/logic.js` (nuevo), `modules/dominio/config/view.js`, `modules/dominio/config/index.js`, `tests/unit/export.test.js` (nuevo) — `gastosACSV()`; botón y acción `exportar-gastos-csv` wired desde `config`; 13 tests nuevos (521/521 verdes).

---

## [1.0.0] — 2026-05-16

Primera versión estable y completa de Finko Claude. PWA offline-first lista para uso local.

**Métricas finales:**
- Lighthouse: **Performance 99 · Accessibility 100 · Best Practices 100 · SEO 100**
- Tests unitarios: **300/300** verdes
- Tests E2E: **18/18** verdes (Playwright)
- Cobertura lógica: **99.6% líneas · 100% funciones**
- Lint: limpio
- `onclick`/`style`/`window.X` en HTML/módulos: **0 / 0 / 0**

### Feature: Patrimonio Neto + Proyección (2026-05-17)

Feature completa en 3 tareas: lógica financiera → extensión de formulario → renderizado UI.

**Resumen:**
- Tarea 1: Cálculo de patrimonio neto (activos − pasivos) y proyecciones lineales a 6/12/24 meses.
- Tarea 2: Captura de `saldoPendiente` y `tasaEA` para deudas en compromiso (campos opcionales).
- Tarea 3: Panel Patrimonio con hero card, grid de activos/pasivos, CTA si faltan saldos, proyecciones.

**Commits:**

- **feat(analisis)** — `6b014dd` · `modules/dominio/analisis/logic.js`, `modules/core/state.js`, `tests/unit/analisis.test.js` — lógica pura: `calcularActivos()`, `calcularPasivos()`, `calcularPatrimonioNeto()`, `proyectarPatrimonio()`, `proyeccionMultiHorizonte()`; extensión de `generarResumen()` con parámetro opcional metas; 33 tests nuevos cubriendo activos, pasivos, patrimonio, proyecciones; back-compat garantizada.
- **feat(compromisos)** — `8b9adbc` · `modules/dominio/compromisos/{logic,view,index}.js`, `tests/unit/compromisos.test.js`, `styles/components.css` — captura `saldoPendiente` (monto adeudado) y `tasaEA` (tasa efectiva anual) para compromisos de tipo deuda; campos opcionales en formulario (hidden hasta seleccionar tipo=deuda); validación condicional; normalización; 14 tests; estilos `.form-optional`, `.form-hint`; visibilidad toggle en `_inyectarForm()`.
- **feat(analisis)** — `c0025c4` · `modules/dominio/analisis/{view,index.js}`, `styles/components.css` — renderizado de patrimonio: hero card (patrimonio neto ±signo), grid activos/pasivos con detalles, CTA si faltan saldos, subsección proyecciones (6m/12m/24m con dinámica de ahorro/déficit); ~180 líneas CSS nuevas (.patrimonio-hero, .proyeccion-grid, plus fix de .metric-card/.salud-card/.progress-bar que estaban sin estilo); observa cambios de metas.

### Feature: Importar gastos desde CSV (D.2) — Preview + detección de duplicados (2026-05-18)

Importación masiva de gastos desde extractos bancarios o backups CSV.

**Resumen:**
- Parser RFC 4180 simplificado en `infra/csv.js` con autodetección de separador (`,` o `;`), quote escaping, BOM UTF-8, CRLF/CR/LF, saltos dentro de quotes.
- Soporte solo para gastos (los ingresos son recurrentes, no transacciones individuales en este schema).
- Validación per-row con número de línea real; errores acumulados, no se aborta al primero.
- Normalización: fechas en 4 formatos (incluyendo DD/MM/YYYY colombiano y validación de bisiestos); montos en formato CO (`1.234.567,89`) y US (`1,234,567.89`) con `$` opcional.
- **Detección de duplicados** via hash determinista `fecha|monto|descripcionLower`: compara contra `S.gastos` existentes y dentro del propio CSV.
- **Match de cuenta** por nombre case-insensitive (solo cuentas activas).
- **Modal con 2 vistas**: picker (file + hint del formato) → preview (4 stats + tabla scrollable con sticky header + acciones cancelar/confirmar).
- Botón nuevo en Configuración → "Tus datos": "📥 Importar gastos (CSV)".

**Commits:**

- **feat(import)** — `ba4cec5` · `modules/infra/csv.js` (nuevo), `modules/dominio/import/{logic,view,index}.js` (nuevos), `index.html`, `modules/dominio/config/view.js`, `modules/ui/bootstrap.js`, `styles/components.css`, `tests/unit/{csv,import}.test.js` — parser CSV (`parsearCSV`, `parsearCSVaObjetos`, `serializarCSV`, `detectarSeparador`); lógica de importación (`procesarCSV`, `validarFila`, `normalizarFila`, `hashGasto`, `parsearFecha`, `parsearMonto`); UI modal con 5 acciones (`abrir-import`, `seleccionar-csv` via change-delegation, `confirmar-import`, `cancelar-import`, `reiniciar-import`); 93 tests nuevos (508/508 verdes).

### Feature: Notificaciones Push (D.4) — Recordatorios de compromisos (2026-05-18)

Recordatorios locales sin servidor usando la Web Notifications API.

**Resumen:**
- Opt-in explícito desde el panel Configuración → sección "🔔 Recordatorios".
- 4 estados de la sección según permiso del navegador: default (botón activar) / granted (toggle) / denied (instrucciones) / unsupported (fallback link).
- Al arrancar la app: si opt-in + permiso granted + hay compromisos ≤ 3 días → muestra UNA notificación por sesión.
- Formato singular ("⏰ Arriendo vence hoy") y plural ("⏰ 3 compromisos vencen mañana, nombres…").
- `S.config.notificaciones` persistido en localStorage; sin schema bump (campo opcional retrocompatible).

**Commits:**

- **feat(notificaciones)** — `f56e06f` · `modules/infra/notificaciones.js` (nuevo), `modules/core/state.js`, `modules/dominio/compromisos/logic.js`, `modules/dominio/config/{view,index}.js`, `modules/ui/bootstrap.js`, `eslint.config.js`, `tests/unit/{notificaciones,compromisos}.test.js` — `estadoPermiso()`, `pedirPermiso()`, `mostrarNotificacion()`, `verificarYNotificar()`, `formatearMensajeNotificacion()` (pura); `compromisosProximos(compromisos, diasLimite=3)`; wiring UI acciones; 21 tests nuevos (415/415 verdes).

### Feature: Gráficos (D.3) — Sparkline + Donut (2026-05-18)

Visualización de datos financieros con SVG inline vanilla, sin librerías.

**Resumen:**
- Sección "Tendencia de gastos": sparkline 12 meses con área suave, eje X, 4 stats (este mes, variación, máximo, mínimo).
- Donut integrado en "Gastos por categoría": distribución circular con leyenda y tooltips nativos.
- Paleta de 7 colores accesibles; "Otros" agrupa categorías pequeñas de forma semántica.
- Layout responsive: donut y barras en columna (mobile), lado a lado (desktop 768px+).

**Commits:**

- **feat(analisis)** — `e63a9f0` · `modules/infra/svg.js` (nuevo), `modules/dominio/analisis/logic.js`, `modules/dominio/analisis/view.js`, `styles/components.css`, `tests/unit/{svg,analisis}.test.js` — helpers puros `sparkline()`, `donut()`, `colorearSegmentos()` en `svg.js` (180 líneas); lógica `serieGastosMensual()`, `seriePorCategoria()` para computar series temporales (75 líneas); renderizado `_renderTendencia()` + donut integrado (90 líneas); CSS responsivo (.sparkline, .donut, .chart-*, layout grid) 145 líneas; 47 tests nuevos (31 svg.test.js, 16 analisis.test.js; 394/394 verdes).

### Extras post-fase 14 (2026-05-16/17)

- **fix(bento)** — `15e487b` · `index.html`, `styles/layout.css`, `modules/infra/render.js` — celda huérfana de la Bento Grid en desktop: se agregaron las cards `#metas-count` y `#balance-mes` y la lógica de cálculo en `updSaldo()` con `_FACTOR_MENSUAL`.
- **feat(pwa)** — `e0b598e` · `assets/icons/icon-192.png`, `assets/icons/icon-512.png`, `scripts/gen-icons.py` — íconos PNG reales generados con Pillow (fondo `#0f1117`, círculo `#00dc82`, letra "F").
- **test(a11y)** — `87848bc` · `tests/unit/a11y.test.js`, `eslint.config.js` — integración de axe-core con 6 tests WCAG 2.1 AA sobre el `index.html` estático (0 violaciones críticas/serias).
- **test(e2e)** — `9af9f80` · `tests/e2e/smoke.test.js`, `playwright.config.js`, `package.json` — 18 smoke tests Playwright cubriendo navegación, CRUD ingresos/gastos/cuentas, persistencia, tema, modales.
- **feat(qa)** — `8ebbaf8` · `scripts/lighthouse.js`, `index.html`, `styles/layout.css` — script Lighthouse programático (usa Chromium de Playwright para evitar EPERM en Windows). Fixes para llegar a Accessibility 100: `aria-dialog-name` en `#onboarding` (cambio a `aria-label`) y contraste de `.bento__label` (color `--fk-text-muted` → `--fk-text-secondary`, ratio 4.0:1 → 7.0:1).

### Fase 14 — PWA + Service Worker + verificación final (2026-05-16)

- **feat(pwa)** — `b78ad4f` · `manifest.json`, `service-worker.js`, `index.html` — manifest completo (name, short_name, display:standalone, theme_color, lang:es, íconos 192/512); SW cache-first con CORE_ASSETS + OPTIONAL_ASSETS tolerante, purga de caches viejos al activar, fallback al shell en navegación offline; registro SW vía `<script>` plain con guard `'serviceWorker' in navigator`.
- **chore(qa)** — `e8c0a77` · `package.json`, `vitest.config.js`, tag `v1.0.0` — bump 0.1.0 → 1.0.0, cobertura ajustada a la capa lógica pura (excluye `view.js`, `index.js`, `ui/` DOM-bound), umbral 90%.

### Fase 13 — Onboarding + Configuración (2026-05-15)

- **feat(ui)** — `873d817` · `modules/ui/onboarding.js`, `modules/dominio/config/{view,index}.js`, `modules/ui/bootstrap.js`, `index.html`, `eslint.config.js` — wizard real de bienvenida (form en `#onboarding-body`, guarda `S.perfil.nombre` + `S.onboarded`); panel de configuración con perfil editable (nombre + SMMLV), exportar JSON (Blob + URL.createObjectURL), importar JSON (FileReader + reload), resetear app, sección "Acerca de".

### Fase 12 — Calculadoras financieras (2026-05-15)

- **feat(dominio)** — `0dcec52` · `modules/dominio/calculadoras/{logic,view,index}.js`, `tests/unit/calculadoras.test.js`, `modules/infra/router.js`, `modules/ui/bootstrap.js` — 5 calculadoras: CDT (retención 7%), crédito (sistema francés, EA→mensual), interés compuesto (capitalización periódica), regla 72 (aproximado + logarítmico), prima (Ley 1788/2016, auxilio si ≤ 2 SMMLV); lazy load via hashchange; 39 tests; fix `router.js` entrada `['ingresos', 'sec-ingresos']`.

### Fase 11 — Análisis financiero (2026-05-14)

- **feat(dominio)** — `53a5f1d` · `modules/dominio/analisis/{logic,view,index}.js`, `tests/unit/analisis.test.js`, `modules/ui/bootstrap.js` — agregación cross-domain: `calcularBalance()`, `calcularTasaAhorro()`, `nivelSalud()` (excelente/buena/ajustada/critica), `generarResumen()`; UI con 4 métricas, salud con progress bar, gastos por categoría con barras proporcionales, alertas hormiga; 28 tests; EventBus observa 4 secciones para recalcular.

### Fase 10 — Compromisos (2026-05-14)

- **feat(dominio)** — `769d010` · `modules/dominio/compromisos/{logic,view,index}.js`, `tests/unit/compromisos.test.js`, `modules/ui/bootstrap.js`, `index.html` — gastos fijos + deudas + agenda; catálogos `TIPOS_COMPROMISO`/`LABEL_TIPO`/`ICONO_TIPO`; `compromisosActivos()`, `calcularCompromisoMensual()`, `proximoVencimiento()`, `urgencia()`; lista ordenada por urgencia con chip de días; badge en navbar; 40 tests.

### Fase 9 — Metas de ahorro (2026-05-13)

- **feat(dominio)** — `ed0681c` · `modules/dominio/metas/{logic,view,index}.js`, `tests/unit/metas.test.js`, `modules/ui/bootstrap.js`, `index.html` — `metasActivas()`, `calcularProgreso()`, `diasHastaFecha()`, `calcularAhorroDiario()`; lista con progress bar + empty state; abonar via prompt; 41 tests.

### Fase 8 — Ingresos + Gastos (2026-05-13)

- **feat(dominio)** — `469f006` · `modules/dominio/ingresos/{logic,view,index}.js`, `modules/dominio/gastos/{logic,view,index}.js`, `tests/unit/{ingresos,gastos}.test.js`, `modules/ui/bootstrap.js`, `index.html` — ingresos (`ingresosActivos`, `calcularIngresoMensual`, frecuencias mensual/quincenal/semanal/diario); gastos (`gastosMes`, `totalGastosMes`, `gastosPorCategoria`, `detectarHormigas`); bento `#ingresos-mes` + `#gastos-mes` actualizado en `updSaldo`; modales con formularios validados; 64 tests entre los dos dominios.

### Fase 7 — Tesorería (2026-05-12)

- **feat(dominio)** — `632a0fe` · `modules/dominio/tesoreria/{logic,view,index}.js`, `tests/unit/tesoreria.test.js`, `modules/ui/bootstrap.js`, `index.html`, `eslint.config.js` — `cuentasActivas()`, `calcularTotalCuentas()`, `_iconoPorBanco()`; lista de cuentas con saldo + empty state; saldo total en dashboard; 24 tests.

### Fase 6 — UI Shell (2026-05-12)

- **feat(ui)** — `1381bce` · `modules/ui/{bootstrap,actions,modales,onboarding}.js`, `index.html` — entry point completo: `bootstrap.js` (loadData → initAcciones → initShell → initRouter → initOnboarding → renderAll); `actions.js` con `registrarAccion()`/`dispatch()` + built-ins (theme-toggle, modal-open, modal-close); `modales.js` factory con `abrirModal()` (trapFocus), `cerrarModal()` (releaseFocus), `resetModal()`; onboarding stub (Fase 13 completa el wizard); eliminado `events.js` legacy.

### Fase 5 — Infra (2026-05-12)

- **feat(infra)** — `6f8a786` · `modules/infra/{utils,render,a11y,crud}.js`, `tests/unit/{utils,crud}.test.js` — `f()` (formato COP), `hoy()`, `fechaLegible()`, `dialogo()`; `renderSmart()`, `updSaldo()`, `updateBadge()`, `renderAll()`, `registrarRender()`; `announce()`, `trapFocus()`, `releaseFocus()`; CRUD genérico `guardar()`/`editar()`/`eliminar()` sobre `S`; 34 tests.

### Fase 4 — Core JS (2026-05-12)

- **feat(core)** — `4ca1adc` · `modules/core/{state,storage,constants}.js`, `tests/unit/{state,storage}.test.js` — constantes financieras CO (SMMLV, UVT, tasa usura Q1-2026, GMF, catálogos bancos); singleton `S` schema v1 + `createInitialState()` + EventBus pub/sub; `loadData()` con migración v1 idempotente; `save()` debounced 200ms; 24 tests (incluye round-trip, debounce, corrupción).

### Fase 3 — HTML Shell + Router (2026-05-11)

- **feat(shell)** — `91246ab` · `index.html`, `modules/infra/router.js`, `modules/ui/shell.js`, `modules/ui/events.js` — shell con landmarks semánticos (`nav`, `main`); sidebar con 7 secciones + footer (theme toggle + ajustes); 8 secciones `<section>` listas para dominios; 4 modales scaffold; PWA meta tags; hash routing; tema persistente; delegación `data-action`; soporte Escape.

### Fase 2 — Design System + CSS (2026-05-10)

- **feat(css)** — `b570afc` · `styles/{tokens,reset,base,components,layout,modals,themes,a11y,responsive,utils,main}.css`, `docs/DESIGN_SYSTEM.md` — design system completo: tokens (paleta, tipografía, espaciado, radii, sombras), reset cross-browser, base con focus visible, `.btn`/`.card`/`.input`/`.chip`/`.badge`/`.list-item`, shell + sidebar + Bento Grid, modales con animaciones, modo oscuro/claro, `prefers-reduced-motion`, breakpoints 1440/1024/768/480/360, helpers `.sr-only`; importado con `@layer` en orden estricto.

### Fase 1 — Esqueleto y documentación (2026-05-10)

- **chore** — `eb2b3ab` · estructura de carpetas, `package.json` con devDeps (vitest, eslint, prettier, happy-dom), `.gitignore`, `.prettierrc`, `eslint.config.js`, `.editorconfig`, `README.md`, `docs/{ARCHITECTURE,ROADMAP,TASKS,CHANGELOG,CONTRIBUTING,IA_CONTEXT}.md`, `docs/DECISIONS/001-no-build-step.md`, `index.html` + `styles/main.css` stub, `vitest.config.js`, `tests/setup.js`.

---

## Convención de entradas

Cada entrada agrupa por fase/release y dentro lista commits con:
- **tipo(área)** — `commit_hash` · `archivos tocados` — descripción de qué cambió.

Tipos: `feat` (nueva funcionalidad), `fix` (bug), `refactor` (sin cambio funcional), `test`, `docs`, `chore` (config/build), `style` (formato).
