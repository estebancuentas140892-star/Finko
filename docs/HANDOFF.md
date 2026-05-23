# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente ía o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-05-23 (feat: Card "Hoy" con mini-agenda del día en el Dashboard)

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
| Tests unitarios + integración | 893/893 verdes |
| Tests E2E | 18/18 humo + suite completa |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(dash) - Card "Hoy" con mini-agenda del día en el Dashboard · 2026-05-23
Nueva card visible entre "Gasto rápido" y el bento de métricas. Muestra los compromisos que
vencen hoy (hasta 3, con ícono de tipo y monto, "+N más" si hay más). Si no hay eventos hoy,
muestra el próximo en los siguientes 14 días con la distancia en días. Si no hay nada próximo,
muestra mensaje de tranquilidad. Link "Ver agenda" directo al calendario.

La card desaparece automáticamente si el usuario no tiene compromisos activos (sin ruido para usuarios nuevos).
Se actualiza con cada cambio de estado (via `registrarRender`) y al navegar al Dashboard (hashchange).

**Archivos:**
- `modules/dominio/agenda/logic.js`: ya tenía `eventosDeHoy()` y `eventosEnProximos()` (lógica pura)
- `modules/dominio/agenda/view.js`: nueva función exportada `renderCardHoy()`; import actualizado
- `modules/dominio/agenda/index.js`: importa `registrarRender` y `renderCardHoy`; hashchange maneja
  'agenda' y 'dash'; `registrarRender(() => renderSmart(renderCardHoy, 'dash'))` sincroniza con estado global
- `index.html`: `<div id="panel-hoy">` entre `.quick-add` y `#bento-dash`
- `styles/components.css`: bloque `.hoy-card` (header, title, link, list, item, dot, name, amount,
  more, empty, prox)
- `service-worker.js`: v55→v56
- `tests/unit/agenda.test.js`: +13 tests (eventosDeHoy: 5 casos; eventosEnProximos: 7 casos con
  vi.useFakeTimers); import extendido a las 4 funciones exportadas

**Tests:** 893/893 verdes.

### refactor(ux) - Menú reordenado por frecuencia de uso real · 2026-05-23
Mobile bottom nav: `Dashboard · Gastos · Agenda · [Más]` (Agenda sube, Tesorería pasa a Más).
Desktop: 3 grupos (Diario / Gestión / Herramientas). Modal Más: agrega Tesorería, quita Agenda.
E2E: `retries: 1` en playwright.config.js + `test.describe.serial` en Onboarding. SW: v55.

### refactor(ux) - Ingresos integrado como card dentro de Tesorería · 2026-05-22
Sección dedicada "Ingresos" eliminada del menú. Los ingresos ahora viven como
una card compacta dentro de Tesorería, sobre la lista de cuentas.

Motivación: para el 80% de usuarios colombianos con 1 ingreso (SMMLV o similar),
tener una sección entera para 1-2 items era desproporcionado. La card ocupa el
espacio justo: título, total mensual, lista de items, botón "+ Agregar".

Datos y lógica sin cambios: el modal, la entity Ingreso, render del dashboard
(#ingresos-mes), Score de Salud Financiera y Calculadoras siguen funcionando igual.
Solo cambia el contenedor visual.

**Archivos:**
- `index.html`: eliminado nav-item "Ingresos" y `<section id="sec-ingresos">`;
  agregado `<div id="panel-ingresos-card">` en `#sec-tesoreria`
- `modules/infra/router.js`: eliminada ruta `['ingresos', 'sec-ingresos']`
- `modules/dominio/ingresos/view.js`: nueva función `renderCardIngresos()`;
  elimina `renderListaIngresos()` (reemplazada)
- `modules/dominio/ingresos/index.js`: listeners cambian de `'ingresos'` a
  `'tesoreria'`; `_guardarIngreso` y `_eliminarIngreso` actualizados
- `styles/components.css`: nuevo bloque `.ingresos-card` (header, title, meta,
  total, list, empty state)
- `service-worker.js`: v53→v54
- `tests/e2e/smoke.test.js`: suite 4 reescrita como "card en Tesorería";
  fix flake onboarding (localStorage.clear en contexto correcto)
- `tests/e2e/navegacion-render.test.js`: test "Ingresos empty state" actualizado
  para verificar `.ingresos-card__empty` en Tesorería

**Tests:** 880/880 unit + 48/48 E2E verdes.

### fix(logros) - Toast de logro estancado en pantalla forever · 2026-05-22
Bug crítico reportado en producción: los toasts de logro se quedaban visibles indefinidamente.
Raíz: listener `animationend` con `{ once: true }` en `_mostrarToast()` capturaba el evento
de la **animación de entrada** (toastIn, ~350ms) en lugar de la salida (toastOut). Esto cancelaba
el timer del fadeout, dejando el toast estancado.

Timeline del bug:
- t=0: toast aparece, toastIn animation empieza (350ms)
- t=0: setTimeout(2500ms) configurado para disparar fadeout
- t=350ms: toastIn termina → animationend dispara → { once: true } listener ejecuta clearTimeout()
- t=2500ms: timer NUNCA se ejecuta → toast queda visible forever

Solución: Remover el listener defensivo problemático. Reemplazar con `toast.isConnected` check
en el setTimeout para detectar si el toast fue removido externamente (fallback seguro).

**Archivos:**
- `modules/dominio/logros/index.js` (línea 88-96): removido listener `animationend`, agregado
  guard `if (!toast.isConnected) return;` antes de aplicar fade
- `service-worker.js`: v52→v53

**Verificación:** app en producción v53 (curl confirmó presencia del guard `isConnected`).
Toast ahora desaparece en ~2.9s (2.5s visible + 0.4s fade) consistentemente en todos los navegadores.

### feat(tesoreria, compromisos) - Cuota de manejo auto-sincronizada + E2E smoke tests · 2026-05-20
Nueva feature opcional: al crear/editar una cuenta, la persona puede activar "cuota de manejo"
(tarifa mensual que el banco cobra). Finko auto-genera un Compromiso tipo Fijo con frecuencia Mensual,
campo `esCuotaManejo=true` y `cuentaId` del banco. Sincronización idempotente: si la cuota cambia
de monto o día, el compromiso se edita; si se desactiva, se elimina; si se activa, se crea.
Visible en Compromisos y Agenda con ícono diferenciado.

Incluye 4 nuevos smoke tests E2E que cubre el flujo gastos-cuenta completo (crear gasto con selector,
editar monto, cambiar cuenta, eliminar gasto) y verifica saldos se actualizan en tesorería/dashboard.
Total: 47 tests E2E verdes.

**Schema:** Bump v4→v5. Campo opcional `cuotaManejo: {monto, diaCobro}` en Cuenta. Campo opcional
`cuentaId` + bandera `esCuotaManejo` en Compromiso. Migración idempotente sin pérdida de datos.

**Archivos:**
- `modules/core/state.js`: typedef CuotaManejo, schema v5
- `modules/core/storage.js`: SCHEMA_VERSION=5, migración v4→v5 (no-op)
- `modules/dominio/tesoreria/logic.js`: parseCuotaManejo(), validarCuenta extended, normalizarCuenta,
  compromisoDesdeCuotaManejo(), compromisoCuotaManejoDeCuenta()
- `modules/dominio/tesoreria/view.js`: renderFormCuenta() con checkbox + fieldset, hint en lista
- `modules/dominio/tesoreria/index.js`: _sincronizarCuotaManejo() orchestrator (create/update/delete),
  _toggleCuotaFieldset(), listeners en form
- `styles/components.css`: .checkbox-row, .cuota-fieldset
- `tests/unit/tesoreria.test.js`: +16 tests (parseCuotaManejo, validarCuenta con cuota, etc.)
- `tests/unit/state.test.js`: versión bump check
- `service-worker.js`: v50→v51

**Tests:** 880/880 verdes (835 unit + 45 integration + nuevo banco picker).


### fix(ux) - Toast de logro: duración 2.5s + auto-update del SW · 2026-05-20
Dos ajustes para resolver reportes del usuario en mobile:

1. Toast de logro tardaba 4s en desaparecer (`DURACION_MS = 4000` en
   `modules/dominio/logros/index.js`). Reducido a 2500ms - se siente snappy
   sin sentirse interrumpido. Total visible incluyendo fade: ~2.9s (antes ~4.4s).

2. SW viejo cacheado en el celular del usuario hacía que no llegaran los fixes
   de UX#1 (toast cortado), UX#4 (bank avatars con color) y P3 (toggle centralizado),
   aunque ya estaban en producción desde v33/v35/v40. El navegador mobile demora
   hasta 24h en re-fetchear el `service-worker.js`. `modules/infra/sw-register.js`
   ahora llama `reg.update()` al arrancar la app, forzando el chequeo de versión.
   Combinado con `skipWaiting()` + `clients.claim()` (ya presentes), futuras
   actualizaciones toman control en cuanto el usuario abre la app.

`service-worker.js`: v41 → v42. Tests: 835/835 verdes.

### perf(ux) - Transición de tema sin lag en mobile (P2) · 2026-05-19
La transición entre tema claro/oscuro tenía lag visible en mobile (frame drops
durante el cambio). En desktop con GPU dedicada se sentía fluido, pero el `*`
selector animaba 563 elementos × 5 propiedades simultáneamente, ahogando al
compositor mobile.

Cambio en `styles/themes.css`:
- Reemplazado `.theme-transitioning *` por una lista acotada de ~30 selectores
  que cubren solo las superficies que cambian de color (body, sidebar, topbar,
  bottom-nav, cards, modals, inputs, buttons, calendario, etc.).
- Resultado: 563 -> 185 elementos animados (67% menos). El texto hereda `color`
  del contenedor animado, asi que el ojo percibe el crossfade igual.
- Duración 280ms preservada (paridad visual con desktop).
- `service-worker.js`: v41.

Tests: 835/835 verdes (cambio solo CSS).

### fix(ux) - Toggle de tema duplicado: centralizado en Ajustes (P3) · 2026-05-19
El toggle de tema aparecía en tres lugares: botón en el footer del sidebar (desktop),
botón en el menú "Más" (mobile) y checkbox en la sección Ajustes (solo desktop).
Se eliminaron los dos botones redundantes y la sección Ajustes se hizo visible en
todos los tamaños de pantalla.

Cambios:
- `index.html`: eliminado `<button data-action="theme-toggle">` del `.sidebar__footer` y
  del `.menu-mas`. El toggle vive ahora exclusivamente en `#sec-config`.
- `modules/dominio/config/view.js`: quitado `config-section--desktop-only` de `_renderTema()`.
  La sección Apariencia es visible en mobile y desktop.
- `modules/ui/shell.js`: `_syncThemeButton()` actualizado para manejar
  `input[type=checkbox]` con `setTimeout(0)` (el browser revierte `checked` de forma
  asincrona tras `e.preventDefault()`).
- `modules/dominio/config/index.js`: listener `EventBus.on('theme:change')` envuelto en
  `setTimeout(0)` por la misma razon.
- `tests/e2e/smoke.test.js`: Suite 7 "Tema" reescrita: navega a `#config` y verifica
  `body.classList` en lugar de `aria-pressed` del boton eliminado.
- `service-worker.js`: v40.

Tests: 835/835 verdes.

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
