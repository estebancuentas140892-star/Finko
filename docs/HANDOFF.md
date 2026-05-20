# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-05-19 (fix: tesoreria list-item layout mobile + bank avatar fix)

**Producción:** https://finko-brown.vercel.app
**Repositorio:** https://github.com/estebancuentas140892-star/Finko

---

## 1. Qué es Finko

PWA offline-first de gestión financiera personal para Colombia.
Vanilla JS puro + ES6 modules. Sin framework, sin build step, sin servidor, sin cuenta.
Todo vive en `localStorage` (clave `fk_v1`). Pensada para personas con poco conocimiento
financiero: lenguaje simple, normativa colombiana (SMMLV, UVT, tasa de usura, GMF).

**Versión actual:** `v1.0.0` - todas las 14 fases originales completadas y cerradas.
**Rama principal:** `main`.

---

## 2. Estado técnico actual

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 835/835 verdes |
| Tests E2E | 18/18 humo + suite completa |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### fix(tesoreria) - Layout mobile de list-item y avatares de banco (P1) · 2026-05-19
El CSS solo tenía `.list-item__content` (alias obsoleto). Todos los dominios usaban en
HTML `__body`, `__meta`, `__action`, `__value` que no tenían ningún selector CSS. Sin
estos, en tesorería el saldo y el botón × apilaban verticalmente, y el título no se
truncaba con ellipsis porque el body no crecía (`flex: 1` faltaba).

Cambios en `styles/components.css`:
- `.list-item__body` + alias `__content`: `flex: 1; min-width: 0` (crecimiento + truncado).
- `.list-item__meta`: `display: flex; flex-direction: column; align-items: flex-end`
  (columna de monto en compromisos, gastos, personales).
- `.list-item__action`: `display: flex; align-items: center; gap` (saldo + botón × en
  tesorería, o solo botón en ingresos/metas).
- `.list-item__value`: `font-mono, semibold, nowrap` (monto en action de tesorería).
- `.list-item__icon:has(.bank-avatar)`: `background: transparent` (quita el bg redundante
  del wrapper cuando contiene un avatar con color propio).

Tests: 835/835 verdes. Commit: `1b060e0`.

### feat(dominio) - Agenda: calendario mensual de compromisos + detalle del día · 2026-05-19
Nuevo dominio Agenda con vista calendario mensual. Muestra los compromisos del mes con
dots coloreados por tipo (fijo/deuda/agenda). Click en un día con compromisos abre panel
inline con la lista. Segundo click o boton X cierran. Navegar mes limpia seleccion.
Celdas sin compromisos son read-only (sin data-action). Layout responsive (mobile 2-col).
- `modules/dominio/agenda/logic.js`: función pura `eventosDelMes()` mapea compromisos a
  días respetando 9 frecuencias + 1 ciclos periódicos (bimestral, trimestral, semestral,
  anual). 30 tests unitarios.
- `modules/dominio/agenda/view.js`: componente visual del calendario (grilla 7 col,
  cabecera navegación, dots, leyenda) + panel de detalle del día (nombre, tipo, freq,
  monto). Estado local `_diaSeleccionado`, funciones `navegarMes()`, `mostrarDia()`,
  `renderAgenda()`, `_renderDetalleDia()`. Reutiliza `LABEL_TIPO`, `ICONO_TIPO`,
  `f()` de infra compartida.
- `modules/dominio/agenda/index.js`: registra acciones `agenda-prev-mes`, `agenda-next-mes`,
  `agenda-mostrar-dia`. Escucha `state:change` (sección compromisos) y `hashchange`.
- `styles/components.css`: bloque AGENDA con `.cal-card`, `.cal-grid`, `.cal-day` + variantes
  (today, selected, past, inactive, has-events), `.cal-dot` por tipo, `.cal-detail` panel
  expandible con lista de items (icon, body, amount), responsive mobile.
- `index.html`: nueva sección `#sec-agenda` con `<div id="panel-agenda">` + link en sidebar
  desktop + entrada en menú móvil.
- `service-worker.js`: v38.
- Tests: 835/835 unit verdes (sin nuevos: render validado en app). E2E 1 smoke test.
- Commits: `11271f2`, `ef54842`, `4f17c94`, `e3852e4`.

### fix(ux) - Selector de banco: dropdown fuera del modal en mobile · 2026-05-19
Bug reportado: al crear una cuenta en tesoreria, la lista de bancos del custom bank picker
aparecia fuera del modal (especialmente en mobile cerca del borde inferior). Diagnosticado:
CSS containing block. El `.modal` padre tenia `transform: translateY/scale` (animacion de
entrada), lo que creaba un containing block capturando descendientes con `position: fixed`.
El dropdown calculaba su posicion con `getBoundingClientRect()` (relativo al viewport),
pero se posicionaba relativo al modal transformado: desalineamiento.
- `tesoreria/index.js`: documentacion ampliada en `_initBankPicker()` explicando el
  containing block issue. `_resetBankPicker()` nueva funcion para limpiar el display
  visual al reabrir el modal (no solo los inputs del formulario).
  `_posicionar()` reescrita: calcula espacio disponible arriba/abajo del trigger, abre
  el dropdown hacia arriba si no cabe abajo (usando `bottom` en lugar de `top`).
- `service-worker.js`: v36 a v37 (invalidar cache del modal animado).
- Tests: 805/805 unit + 41/41 E2E verdes (sin regresiones).

### feat(ux) - Sidebar colapsable en desktop (UX#3) · 2026-05-19
Boton de colapsar/expandir el sidebar lateral en desktop (>= 1024px). Al colapsar,
el sidebar se reduce a 64px mostrando solo los iconos; los labels se ocultan y aparece
un tooltip nativo (title) en cada item al hover.
- `index.html`: boton `.sidebar__collapse-btn` al final de `.sidebar__footer`, SVG chevron.
- `layout.css`: estado `body.sidebar-collapsed` con override de `--fk-sidebar-width` a
  64px (el token `--fk-sidebar-collapsed` ya existia). Clase `body.sidebar-animating`
  activa la transicion de `grid-template-columns` solo durante el toggle del usuario,
  no en carga inicial ni resize.
- `shell.js`: `toggleSidebarCollapse()`, `initSidebarCollapse()`, `_syncCollapseButton()`,
  `_syncNavTitles()`. Persiste en `localStorage` clave `fk_sidebar_collapsed`.
- `actions.js`: registra accion `sidebar-toggle`.
- `bootstrap.js`: llama `initSidebarCollapse()` despues de `initShell()`.
- `smoke.test.js`: 3 tests nuevos en suite "Sidebar colapsable (desktop)".
- SW v35 a v36. 805/805 unit + 41/41 E2E verdes.

### feat(ux) - Logos/avatares de bancos en selector de cuenta (UX#4) · 2026-05-19
Custom bank picker que reemplaza el select nativo de bancos con un combobox accesible
que muestra avatares circulares con el color corporativo e iniciales de cada entidad.
- `constants.js`: BANCOS_CO pasa de string[] a objetos {id, iniciales, color, texto}.
  El id es el mismo string que antes (retrocompatibilidad total con localStorage).
- `tesoreria/view.js`: renderFormCuenta() genera el custom picker HTML; nuevo helper
  _bankAvatarHtml() para la lista de cuentas y los items del picker.
- `tesoreria/index.js`: _initBankPicker() con toggle, seleccion, teclado (flechas,
  Enter, Escape) y cierre al click externo. Dropdown con position:fixed para evitar
  que el overflow:hidden del modal lo corte.
- `components.css`: estilos de .bank-picker, .bank-picker__trigger, .bank-picker__list,
  .bank-picker__item y .bank-avatar. Lista con max-height:260px + overflow-y:auto.
- `smoke.test.js`: actualizado para usar el nuevo picker (click trigger + click item).
- SW v34 a v35. 805/805 unit + 38/38 E2E verdes.

### fix(ux) - Transición de tema suave en mobile (UX#2) · 2026-05-19
Tecnica "class transitioning": `applyTheme()` en `shell.js` agrega `.theme-transitioning`
al body ANTES del swap de clase de tema, luego la quita a los 350ms. El CSS en `themes.css`
usa ese selector para activar transiciones de 280ms en todos los descendientes durante el
cambio. Solo activo cuando `prefers-reduced-motion: no-preference`.
- `modules/ui/shell.js`: `applyTheme()` agrega `.theme-transitioning` antes del toggle.
  Timer de 350ms lo quita (con clearTimeout si el usuario hace doble toggle rapido).
- `styles/themes.css`: media query `prefers-reduced-motion: no-preference` con selector
  `.theme-transitioning, * {...}` y transition 280ms ease en background-color, border-color,
  box-shadow + 180ms en color y fill.
- SW v33 a v34. 805/805 unit + 2/2 E2E de tema verdes.

### fix(ux) - Toast de logro cortado en mobile (UX#1) · 2026-05-19
El toast del logro desbloqueado se veia parcialmente cortado en celular y a veces tapado
por el bottom nav. Tres ajustes en `.logro-toast`:
- Quitado `white-space: nowrap` y `min-width: 220px` que forzaban overflow con nombres
  largos (Diversificador, Mes en verde, Planificador).
- `width: max-content` + `max-width: min(420px, calc(100vw - ...))` con margenes
  laterales seguros (incluye `env(safe-area-inset-*)`).
- `.logro-toast__nombre` permite wrap con `overflow-wrap: anywhere`.
- En mobile (< 1024px) el `bottom` ahora respeta la altura del bottom nav
  (`var(--fk-header-height) + var(--fk-space-4)`) para no quedar tapado.
- SW v32 a v33. 805/805 unit + 18/18 E2E smoke verdes.

> Para tareas anteriores, ver [`docs/CHANGELOG.md`](CHANGELOG.md).

---

## 4. Qué sigue (roadmap post-v1.0)

**Estado actual:** App completa, en producción estable (`https://finko-brown.vercel.app`). Todas las features v1.0 + post-v1.0 están implementadas. **Modo mantenimiento.**

> **Importante para futuros desarrolladores:** Antes de instalar dependencias o configurar
> un nuevo entorno, leer [`docs/SECURITY.md`](SECURITY.md). Incluye política anti-malware npm,
> guía de migración a **pnpm** con defensas (`minimum-release-age`, `only-built-dependencies`),
> y el audit de seguridad realizado el 2026-05-18.

Tareas opcionales restantes:

| Prioridad | Tarea | Cuándo | Nivel |
|---|---|---|---|
| 1 | **A.5 - Dominio custom** (opcional) | Cuando el usuario tenga dominio registrado | Guía lista en [`docs/SETUP_DOMINIO.md`](SETUP_DOMINIO.md) |
| 2 | **E.2 - SMMLV + UVT** (anual) | **Enero 2027** - buscar nuevos valores Mintrabajo (SMMLV) + DIAN (UVT), actualizar `modules/core/constants.js` | ~15 min, Haiku |
| 3 | **E.3 - GMF + reforma** (demanda) | Si hay reforma tributaria - verificar cambios en GMF | Ad-hoc |

### ⏰ Recordatorio enero 2027 - E.2

**Qué hacer:**
1. 👉 Visita [DIAN UVT](https://www.dian.gov.co/) y [Mintrabajo SMMLV](https://www.mintrabajo.gov.co/)
2. Obtén los valores vigentes para 2027
3. Actualiza en `modules/core/constants.js`:
   ```javascript
   export const SMMLV_2027 = <nuevo_valor>;
   export const UVT_2027 = <nuevo_valor>;
   ```
4. Cambia las referencias de `_2026` a `_2027` en `constants.js`
5. Tests (`npm test` → 596/596 verdes)
6. Commit: `feat(E.2): actualizar SMMLV 2027 + UVT 2027`
7. Push a main → auto-deploy a producción

**Archivo:** Escribe tu `Próximo paso` con modelo **Haiku 4.5** (búsqueda + cambio mecánico).

---

## 5. Cómo trabajamos (workflow)

- **Una tarea a la vez.** No se empieza la siguiente sin verificar en la app y commitear.
- **Al cerrar cada tarea:** actualizar este archivo (HANDOFF.md) + CHANGELOG.md; eliminar de ROADMAP.md y TASKS.md.
- **Al final de cada respuesta:** bloque `─── Próximo paso ───` con modelo sugerido + nivel.
- **Modelos permitidos:** `Haiku 4.5` (sin nivel) · `Sonnet 4.6 - Bajo/Medio/Alto` · `Opus 4.7 - Bajo/Medio/Alto/Extra Alto/Max`.
- **Regla de oro:** calidad del código primero, ahorro de tokens segundo.
- Workflow completo en [`/CLAUDE.md`](../CLAUDE.md) sección 2.

---

## 6. Arquitectura en una línea por capa

```
core/        → state.js (singleton S), storage.js (save debounced), constants.js (CO legales)
infra/       → utils, render, a11y, crud, router, csv, svg, notificaciones
ui/          → bootstrap (entry point), shell, actions (delegación data-action), modales, onboarding
dominio/     → ingresos, gastos, compromisos, tesoreria, metas, analisis,
               calculadoras, config, import, export
tests/unit/  → lógica pura (Vitest + happy-dom) - 521 tests
tests/e2e/   → smoke tests (Playwright) - 18 tests
```

Regla clave: **ningún dominio importa a otro** - comunicación exclusiva por `EventBus`.
Todo `logic.js` es sin DOM (testeable en Node). Todo `view.js` solo lee `S`, no lo muta.

---

## 7. Comandos rápidos

```bash
python -m http.server 8080   # Servir la app (ES6 modules requieren HTTP)
pnpm test                     # 596 tests unitarios + integración
pnpm run test:e2e             # 18 smoke tests Playwright
pnpm run coverage             # umbral 90% capa lógica
pnpm run lighthouse           # requiere servidor en :8080
```
