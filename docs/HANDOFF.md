# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente ía o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-05-26 (refactor: Dashboard acción-orientado - Vencidos + Próximas Prioridades)

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
| Tests unitarios + integración | 915/915 verdes |
| Tests E2E | 18/18 humo + suite completa |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### refactor(dash) - Dashboard acción-orientado: Vencidos + Próximas Prioridades · 2026-05-26
Rediseño del dashboard para mostrar **solo** información de acción inmediata.

**Eliminado:** bento de Ingresos del mes, Gastos del mes, Metas activas, Compromisos
activos, Me deben (contadores genéricos sin contexto). Card Hoy (fusionada con
Próximas Prioridades para eliminar redundancia).

**Agregado:**
- `#panel-vencidos`: compromisos cuyo día de pago ya pasó (fijos + deudas + agenda).
  Hasta 3 visibles, resto con scroll vertical interno (max-height). Severidad por
  color de borde izquierdo (leve/moderada/urgente).
- `#panel-prioridades`: próximos 7 días agrupados por día (HOY destacado en
  accent, Mañana, En N días). Reemplaza Card Hoy.
- `.balance-tira`: tira simple con Balance del mes (único indicador combinado
  que queda en dashboard). Color por signo.

**Archivos:**
- `modules/dominio/compromisos/logic.js`: + `detectarVencidosCompletos(comp, hoyISO)`
  (los 3 tipos) + `agruparPorDiasRestantes(proximos)`
- `modules/dominio/compromisos/view.js`: + `renderPanelVencidos()` + `renderPanelPrioridades()`
  + `_hoyISOLocal()` (fix de timezone para que "venció hoy" cuente día local, no UTC)
- `modules/dominio/compromisos/index.js`: import de `registrarRender` y los nuevos renders;
  `registrarRender(() => renderSmart(_renderDashboardPanels, 'dash'))`; hashchange a 'dash'
- `modules/dominio/agenda/view.js`: eliminada `renderCardHoy()` y sus imports
- `modules/dominio/agenda/index.js`: removido import de `registrarRender` y `renderCardHoy`
- `index.html`: `#sec-dash` reestructurado (hero solo, panel-vencidos, panel-prioridades,
  balance-tira); eliminados `#panel-hoy` y bento completo (`#bento-dash`)
- `styles/components.css`: + `.vencidos-card`, `.prioridades-card`, `.balance-tira`,
  `.bento__cell--solo`; eliminado `.hoy-card`
- `service-worker.js`: v58→v59
- `tests/unit/compromisos.test.js`: +14 tests (9 para `detectarVencidosCompletos`,
  5 para `agruparPorDiasRestantes`)

**Tests:** 915/915 verdes (+14).

### feat(gastos) - Selector de mes anterior/siguiente sobre la lista · 2026-05-23
Encabezado `‹ Mayo 2026 ›` encima de los chips de categoría. Permite revisar gastos
de cualquier mes sin exportar CSV. El filtro de categoría se resetea al navegar de mes.
El mes seleccionado persiste durante la sesión.

**Archivos:**
- `modules/dominio/gastos/view.js`: `_viewYear`/`_viewMonth` (estado local); `_ensureMes()`;
  `navegarMesGastos(delta)` exportada; `renderFiltrosGastos()` incluye `.mes-nav` + chips;
  `renderListaGastos()` usa el mes de la vista en lugar de `hoy()`
- `modules/dominio/gastos/index.js`: `_prevMes()` / `_nextMes()`; acciones `gastos-prev-mes`
  y `gastos-next-mes` registradas
- `styles/components.css`: bloque `.mes-nav` (btn, label, hover, focus)
- `service-worker.js`: v57→v58

**Tests:** 901/901 verdes (sin tests nuevos: la lógica de navegación es análoga a `navegarMes`
en Agenda que tampoco tiene tests unitarios; `gastosMes` ya estaba cubierta).

### feat(gastos) - Filtro por categoría con chips fijos sobre la lista · 2026-05-23
Chips de categoría encima de la lista de gastos del mes. "Todos" activo por defecto.
Un chip por cada categoría presente en el mes actual; al hacer clic filtra la lista.
El filtro persiste en la sesión y se auto-resetea si la categoría activa desaparece.
Si la categoría seleccionada no tiene gastos muestra "Sin gastos en esta categoría" + botón "Ver todos".

**Archivos:**
- `modules/dominio/gastos/logic.js`: nueva función pura `filtrarGastos(gastos, categoria)`
- `modules/dominio/gastos/view.js`: estado local `_filtroCategoria`; `renderFiltrosGastos()`;
  `renderListaGastos()` aplica filtro; `_renderEmptyFiltro()`; `setFiltroCategoria()` exportada
- `modules/dominio/gastos/index.js`: acción `gastos-filtrar-cat`; `renderFiltrosGastos` en EventBus y hashchange
- `index.html`: `<div id="panel-filtros-gastos">` antes de `#lista-gastos`
- `styles/components.css`: `.filtros-bar` + `.chip` + `.chip--active`
- `service-worker.js`: v56→v57
- `tests/unit/gastos.test.js`: +8 tests para `filtrarGastos`

**Tests:** 901/901 verdes.

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
