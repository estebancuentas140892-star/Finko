# Changelog — Finko Claude

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se elimina del ROADMAP/TASKS y se agrega aquí.

---

### A.4 — Smoke test confirmado en Redmi Note 11 · 2026-05-18

Usuario verificó en dispositivo real (Xiaomi Redmi Note 11, 393px) que el fix
responsive de la sesión anterior funciona correctamente. Reportó: números del
dashboard más legibles, botones con altura suficiente para tocar (44px+), inputs
sin activar zoom automático en iOS, navegación completa a las 5 secciones sin
overflow, operación offline confirmada (modo avión + agregar gasto). Cierre de
tarea A.4 del ROADMAP post-v1.0. No requirió cambios de código — solo verificación.

---

### Fix: responsive integral mobile (320–1440px) · 2026-05-18

Smoke test A.4 reveló que aunque la barra inferior ya mostraba los 5 íconos,
la app en general no se sentía adaptada a móviles modernos (Redmi Note 11
393px y similares). Refactor integral de `responsive.css` con principios:

1. **Fluid typography con `clamp()`** — el valor hero del dashboard
   (`.bento__value`, `.card__value`, `.patrimonio-hero__valor`) escala
   fluidamente entre 24px (320px viewport) y 36px (≥600px) en vez de
   saltar bruscamente entre breakpoints. Antes se mostraba 24px en
   cualquier móvil < 480px (Redmi/Pixel/iPhone moderno incluidos);
   ahora a 393px se renderiza a 31.5px, suficiente para destacar como
   métrica principal.

2. **Touch targets ≥ 44px** — `.btn`, `.input`, `.select` y `textarea.input`
   ahora tienen `min-height: 44px` en `< 1024px` (cumple Apple HIG y
   se acerca a Material 48px). Antes 40px era demasiado chico.

3. **Inputs 16px font-size en móvil** — fix para el bug clásico de iOS
   Safari que hace zoom automático al enfocar un input con `font-size < 16px`.
   Antes los inputs eran 14px → al tocarlos la página entera saltaba
   en iPhone.

4. **Breakpoint `< 480px` → `< 360px`** — la regla previa reducía h1 y
   bento__value en todo móvil moderno (393/414px también afectados). El
   nuevo breakpoint solo aplica a dispositivos legacy reales como iPhone
   SE 1ª gen (320px). Móviles modernos (360/393/414) ya no se ven
   "comprimidos".

5. **Grids fijos colapsan a 1-col en < 768px** — `.proyeccion-grid` (era
   3 cols), `.presupuesto-hero__totales` (era 3 cols), `.metric-grid` y
   `.chart-stats` ahora son 1-col en móvil, evitando contenido apretado.
   `.import-resumen` baja a 2-col (estaba auto-fit pero quedaba muy chico).

6. **Nav-item label con ellipsis** — en viewports muy chicos (320px) el
   label "Tesorería" se trunca con `…` en lugar de desbordar.

7. **`viewport-fit=cover` + `maximum-scale=5`** en `index.html` — cubre
   notch/area segura en dispositivos modernos y permite zoom del usuario
   (accesibilidad: no bloqueamos zoom).

8. **Bump `CACHE_NAME` v6→v7** — los PWA instalados refrescarán CSS, HTML
   y SW cacheados al reabrir la app.

Verificado en preview a 6 viewports: 320, 360, 393, 414, 768, 1280px.
Cero overflow horizontal en todos.

- `styles/responsive.css` (reescrito), `index.html` (meta viewport),
  `service-worker.js` (CACHE_NAME)

---

### B.2 — Screenshots PWA para manifest · 2026-05-18

2 screenshots de 540×720 (tema oscuro) para enriquecer la ficha de instalación
PWA en Android Chrome. Generados con Pillow desde script Python reproducible.

- `assets/screenshots/screenshot-1-dashboard.png` — Dashboard con balance, presupuesto y compromisos próximos.
- `assets/screenshots/screenshot-2-gastos.png` — Listado de gastos del mes con categorías color-coded.
- `manifest.json` — array `"screenshots"` con `form_factor: "narrow"` y labels descriptivos.
- `service-worker.js` — screenshots en `OPTIONAL_ASSETS`; bump `CACHE_NAME` v5→v6.
- `scripts/gen-screenshots.py` — script reutilizable para regenerar screenshots.

---

### Fix: sidebar móvil colapsada (A.4 smoke test reveló bug) · 2026-05-18

Smoke test desde móvil real (Xiaomi/Android) reveló que la barra de navegación
inferior solo mostraba el item activo (Dashboard), atrapando al usuario en el
dashboard sin forma de navegar a Ingresos, Gastos, etc. Dos bugs estructurales
acumulados desde Fase 6 que Lighthouse + E2E (que solo probaron 1280×800) no
detectaron.

**Bug 1 — wrapper interno rompe el flex chain:**
La nav real es `sidebar__nav > nav-group > div[role="list"] > nav-item`. En
mobile, `sidebar__nav` es `flex-direction:row` pero el `<div role="list">`
intermedio era `display:block` (default), apilando los 5 items verticales
dentro de una caja de 60px con `overflow:hidden` → solo se veía el primero.

**Bug 2 — `top: 0` desktop colateral en mobile:**
`.sidebar` desktop tiene `position:sticky; top:0`. En mobile cambia a
`position:fixed; bottom:0` pero el `top:0` heredado seguía activo. Con
`height:60px` fijo, `top:0` ganaba a `bottom:0` → la barra quedaba ARRIBA en
vez de abajo.

**Fix:**
- Aplanar la cadena en mobile: `.sidebar__nav > .nav-group, .sidebar__nav > .nav-group > [role="list"] { display: flex; flex-direction: row; flex: 1; }`.
- `top: auto` explícito en `.sidebar` del media query mobile.
- Bump `CACHE_NAME` `finko-v4 → finko-v5` para que los PWA instalados refresquen el `responsive.css` cacheado (sin esto, el fix no llega al usuario).

**Verificado en preview a 375×812:** sidebar en y:752 (al fondo), 5 items en
fila distribuidos correctamente, segundo grupo ocultado por la regla
`.nav-group:not(:first-child)` ya existente.

**Commits:**
- **fix(responsive)** — `ee727ec` · `styles/responsive.css` — fix de los 2 bugs estructurales.
- **chore(sw)** — `1bf3b00` · `service-worker.js` — bump `CACHE_NAME` v4→v5.

---

### Deploy real + verificación headers (A.1' / A.2 / A.3) · 2026-05-18

Finko publicada en producción en `https://finko-brown.vercel.app`. Repo en
`https://github.com/estebancuentas140892-star/Finko` con integración Vercel→GitHub
para auto-redeploy en cada push a `main`.

**Verificación de headers (A.3):**
- **HTML** `/`: `max-age=0, must-revalidate` ✓
- **`/service-worker.js`**: `no-cache, no-store, must-revalidate` ✓ (tras fix)
- **`/styles/*.css`**: `max-age=31536000, immutable` ✓
- **`/modules/**/*.js`**: `max-age=31536000, immutable` ✓
- **Security headers** en todas las rutas: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: notifications=(self)` ✓
- **HTTPS** (A.2): automático en Vercel con `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` ✓

**Fix detectado en producción:**
Vercel aplica TODAS las reglas que matchean una ruta y, cuando dos setean el
mismo header, **gana la última en orden**. La regla genérica `/(.*)\.js`
matcheaba `service-worker.js` y, al venir después de la regla específica,
sobrescribía `Cache-Control` con `immutable` (max-age 1 año), bloqueando
actualizaciones del PWA. Solución: reordenar `vercel.json` para que la regla
de `/service-worker.js` sea la última. `netlify.toml` NO cambia porque Netlify
usa "primera regla gana" (comportamiento inverso) y ahí el orden ya era correcto.

**Commits:**
- **fix(deploy)** — `0960322` · `vercel.json` — reordenar reglas para que SW reciba `no-cache`.

---

### Tests de integración — Migración schema v1→v2 (C.3) · 2026-05-18

9 tests en Suite 6 de `tests/integration/flujos.test.js` que blindan la lógica de `_migrate()` y `_applyToS()` introducidas en el schema bump de D.5.

**Casos cubiertos:**
- **Migración base** (1 test): fixture `_version:1` sin `presupuestos` → `loadData()` agrega `presupuestos:[]` y sube `_version` a `SCHEMA_VERSION` (2).
- **Legacy sin `_version`** (1 test): dato muy viejo sin el campo → se trata como v1 y migra correctamente.
- **Idempotencia** (1 test): fixture `_version:2` con presupuestos existentes → no los borra ni duplica.
- **Preservación de datos** (1 test): cuentas, ingresos, gastos, compromisos, metas, perfil y `onboarded` de v1 sobreviven sin alteraciones.
- **`presupuestos` preexistente en v1** (1 test): `_migrate()` solo agrega si `!Array.isArray(data.presupuestos)`, los existentes se respetan.
- **`_version` string `"1"`** (1 test): `typeof "1" !== 'number'` → fallback a 1 → migra.
- **`_version` null** (1 test): `typeof null !== 'number'` → fallback a 1 → migra.
- **Roundtrip post-migración** (1 test): `loadData(v1)` → `_flushNow()` → `loadData()` → estado v2 idéntico.
- **Campos desconocidos descartados** (1 test): `_applyToS()` itera `Object.keys(createInitialState())`, campos legacy como `transferencias` no aparecen en `S`.

**Commits:**
- **test(integration)** — `tests/integration/flujos.test.js` (ampliado con Suite 6) — 9 tests nuevos; 596/596 tests verdes.

---

### Tests de integración — Flujo C.2 (Backup/Restore) · 2026-05-18

8 tests en `tests/integration/flujos.test.js` cubriendo el ciclo completo export → reset → import.

**Suites:**
- **Export a CSV** (2 tests): `gastosACSV()` preserva toda la información (fecha, monto, descripción, categoría, cuenta, nota); CSV vacío cuando no hay gastos.
- **Import desde CSV** (3 tests): `procesarCSV()` detecta correctamente gastos válidos, duplicados e errores; detección de duplicados cuando se reimporta lo mismo; cuentaId se resuelve correctamente o es null si no existe.
- **Roundtrip completo** (1 test): exportar → limpiar → importar → verificar que datos son idénticos (fecha, monto, descripción, categoría, cuentaId, nota).
- **Validación y robustez** (2 tests): CSV con errores múltiples rechaza solo las filas malas; BOM UTF-8 se procesa correctamente.

**Commits:**
- **test(integration)** — `tests/integration/flujos.test.js` (ampliado) — 8 tests nuevos; 587/587 tests verdes.

---

### Envelope budgeting — Presupuesto por sobre (D.5) · 2026-05-18

Nueva sección "Presupuesto" cierra la funcionalidad core de Finko. Un envelope por
categoría con monto mensual recurrente; el progreso se compara contra los gastos del
mes actual.

**Resumen:**
- Estados de progreso: `ok` (<75%), `alerta` (75–100%), `excedido` (>100%). Cada estado
  con su color en la barra de progreso y un icono (⏰/⚠️) en el título del envelope.
- Panel completo con hero (Asignado · Gastado · Restante), lista de envelope cards
  color-coded, y sección de "Categorías con gastos sin presupuesto" (huérfanas).
- Modal de creación/edición. Al editar, la categoría queda deshabilitada para evitar
  conflictos con el resto del schema (delete + create new si el usuario quiere cambiar).
- Schema bump `v1 → v2`: agrega `S.presupuestos = []`. Migración idempotente garantiza
  que usuarios existentes arrancan sin envelopes sin perder datos.
- SW mejora: `cache: 'reload'` en `install` evita servir versiones obsoletas del HTTP
  cache del browser o CDN intermedio (relevante también para producción).

**Commits:**
- **feat(presupuesto)** — `f3f4141` · `modules/dominio/presupuesto/{logic,view,index}.js` (nuevos),
  `modules/core/{state,storage}.js`, `modules/infra/router.js`, `modules/ui/bootstrap.js`,
  `index.html`, `styles/components.css`, `service-worker.js`, `tests/unit/{presupuesto,state}.test.js` —
  38 tests nuevos del logic; CACHE_NAME `finko-v3` → `finko-v4`; 579/579 verdes.

---

### Tests de integración — Flujo C.1 · 2026-05-18

20 tests en `tests/integration/flujos.test.js` cubriendo el flujo principal de usuario.

**Suites:**
- **Estado del flujo** (6 tests): onboarding → cuenta → ingreso → gasto; verifica que cada dominio registra correctamente y los ítems tienen IDs únicos.
- **Análisis cross-domain** (6 tests): `calcularBalance`, `calcularTasaAhorro`, `nivelSalud`, `generarResumen` calculan correctamente sobre el estado real; incluye caso "salud crítica" con egresos > ingresos.
- **Roundtrip localStorage** (4 tests): `_flushNow()` + `loadData()` reproduce el estado exacto; análisis idéntico antes y después; `loadData()` idempotente; múltiples ítems sin duplicados.
- **Resiliencia** (4 tests): JSON corrupto, estado vacío, `generarResumen` sobre estado vacío, cuenta inactiva excluida del total.

**Commits:**
- **test(integration)** — `534d7d0` · `tests/integration/flujos.test.js` (nuevo) — 541/541 tests verdes (18 archivos).

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
