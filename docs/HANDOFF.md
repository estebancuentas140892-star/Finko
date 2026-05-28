# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente ía o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-05-27 (v8.6: prima de servicios = estimador honesto con variables opcionales y disclaimer)

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
| Tests unitarios + integración | 967/967 verdes |
| Tests E2E | 18/18 humo + suite completa |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(tesoreria): v8.6 - prima de servicios = estimador honesto con variables opcionales · 2026-05-27

Convierte la calculadora de prima en un estimador honesto (opción A aprobada). Reconoce que la prima real depende de horas extras, recargos y bonos habituales, que varían por trabajador y empresa.

**Cambios clave:**
- **`modules/infra/financiero.js`:** `calcularPrima(salario, dias, variablesPromedio = 0)`. Nuevo 3er parámetro opcional. El IBC para liquidación incluye `salarioBase + variablesAplicadas`. Retorna `variablesAplicadas` en el resultado. Backwards-compatible: los 7 tests existentes siguen verdes.
- **`index.html`:** Form renombrado ("🎁 Estimá tu prima de servicios"). Descripción honesta: "Aproximación para salario fijo. Si tenés horas extras o bonos habituales, ingrésalos para mayor precisión." Dos campos opcionales nuevos: "Horas extras y recargos promedio/mes" + "Bonos y comisiones habituales promedio/mes". Botón: "Estimar prima".
- **`modules/dominio/tesoreria/index.js`:** Handler suma `extras + bonos` como `variablesPromedio`. Muestra fila "Variables incluidas" en el grid solo si hay > 0. Disclaimer al pie del resultado: "Estimación simplificada. El valor real depende de tu nómina exacta del semestre."
- **`tests/unit/calculadoras.test.js`:** 3 tests nuevos de `variablesPromedio`: default=0 equivale a omitir, positivo incrementa la prima correctamente, negativo se trata como 0.
- **`service-worker.js`:** v88 → v89.

**Archivos:** `modules/infra/financiero.js`, `index.html`, `modules/dominio/tesoreria/index.js`, `tests/unit/calculadoras.test.js`, `service-worker.js`, `docs/`.

**Tests:** 970/970 verdes (3 nuevos).

### style(copy): v8.5 - eliminar guion simple "-" en strings de UI visibles · 2026-05-27

Limpieza de copy: feedback del usuario para evitar el guion simple `-` como separador de inciso en texto visible. El em-dash `-` ya estaba prohibido por CLAUDE.md; ahora extendemos la regla al `-` cuando funciona como pausa entre clausulas.

**Cambios clave (13 strings de UI):**
- **`modules/dominio/metas/view.js:80`**: empty-state reescrito con comas y "como ... o ..." en lugar de "- ... -".
- **`modules/dominio/presupuesto/view.js:151`**: empty-state idem.
- **`modules/dominio/personales/view.js:99`**: chip "X días - ya toca cobrar" → "X días, ya toca cobrar".
- **`modules/dominio/compromisos/view.js:431`**: label "Tasa de interés mensual (%) - opcional" → "Tasa de interés mensual % (opcional)".
- **`index.html`**: title, meta description, dos aria-label de nav, y las 5 options del select ARL del form PILA usan `:` o `,` en lugar de `-`.
- **`service-worker.js`**: v87 → v88 (CORE_ASSETS modificados invalidan cache).

**Sigue:** Pivot honesto de la calculadora de Prima de servicios (opción A: estimador con disclaimer + campos opcionales de horas extras/bonos). Aprobada por el usuario, queda como v8.6.

**Archivos:** `index.html`, `modules/dominio/metas/view.js`, `modules/dominio/presupuesto/view.js`, `modules/dominio/personales/view.js`, `modules/dominio/compromisos/view.js`, `service-worker.js`, `docs/`.

**Tests:** 967/967 verdes (cambio puramente de copy).

### refactor(calculadoras): v8.4 - redistribuir calculadoras a dominios + limpiar módulo (sub-tarea 5/5) · 2026-05-27

Cierra la reorganización "Calculadoras → dominios naturales". Las 7 calculadoras ahora viven dentro de sus secciones naturales como herramientas inline colapsables. El módulo `calculadoras/` fue eliminado por completo.

**Cambios clave:**
- **`index.html`:** 4 nuevos `<details class="herramienta-inline">` en las secciones Metas (CDT + Interés Compuesto) y Análisis (Regla del 72 + Rentabilidad real). Eliminada la sección `sec-calc` completa.
- **`modules/dominio/metas/index.js`:** Handlers `_onSubmitHerramientaCDT` y `_onSubmitHerramientaIC` (importan de `infra/financiero.js`). Wire-up en `initMetas()`.
- **`modules/dominio/analisis/index.js`:** Handlers `_onSubmitHerramientaR72` y `_onSubmitHerramientaRentabilidad`. Wire-up en `initAnalisis()`.
- **`modules/ui/bootstrap.js`:** Removidos `import { initCalculadoras }` y la llamada `initCalculadoras()`.
- **`modules/dominio/calculadoras/view.js`** y **`index.js`:** Borrados.
- **`tests/unit/calculadoras.test.js`:** Removidos import `renderAlertaUsura` y 7 tests asociados (la función fue deprecada con el módulo).
- **`service-worker.js`:** v86 → v87; removidas entradas `calculadoras/view.js` y `calculadoras/index.js` de `CORE_ASSETS`.

**Archivos:** `index.html`, `modules/dominio/metas/index.js`, `modules/dominio/analisis/index.js`, `modules/ui/bootstrap.js`, `service-worker.js`, `tests/unit/calculadoras.test.js`. Eliminados: `modules/dominio/calculadoras/view.js`, `modules/dominio/calculadoras/index.js`.

**Tests:** 967/967 verdes (7 menos por eliminar tests de `renderAlertaUsura`, correctamente deprecada).

### refactor(nav): v8.0 - eliminar sección Calculadoras del nav (sub-tarea 1/5) · 2026-05-27

Primera sub-tarea de la reorganización "Calculadoras → dominios naturales". Solo cambios de navegación, sin tocar lógica.

**Cambios clave:**
- **`index.html`:** Quitado el link `#calc` del sidebar desktop (grupo Herramientas) y del menú Más mobile.
- **`modules/infra/router.js`:** Eliminado `['calc', 'sec-calc']` de SECTIONS. Agregado `REDIRECTS = new Map([['calc', 'dash']])`: cualquier hash `#calc` redirige al Dashboard con `history.replaceState`.
- **`service-worker.js`:** v83 → v84.

**Archivos:** `index.html`, `modules/infra/router.js`, `service-worker.js`.

**Tests:** 974/974 verdes.

### feat(compromisos) - v7.15: abono a deudas, sub-tarea 3 (badge agenda + tip proyección + E2E) · 2026-05-27

Cierra la feature completa "Abonar deuda" (ADR 002). Tercera y última sub-tarea: feedback visual en Agenda y en el modal de abono, más el smoke E2E.

**Cambios clave:**
- **Badge "Ya abonaste este mes"** (`agenda/view.js`): `_renderDetalleItem` recibe ahora `viewYear` y `viewMonth`. Detecta si hay un gasto con `compromisoId === c.id` y `fecha` en el mes visualizado. Si existe, muestra `<p class="cal-detail__badge-abono">✓ Ya abonaste este mes</p>` en el panel de detalle del día.
- **Tip de proyección** (`compromisos/index.js`, `view.js`): al tipear monto en el modal de abono, calcula cuántos meses antes termina la deuda con ese abono y actualiza el párrafo `#abono-tip-proyeccion`. Muestra solo cuando el ahorro es >= 1 mes.
- **CSS** (`styles/components.css`): `.cal-detail__badge-abono` (texto xs, color success).
- **Smoke E2E** (`tests/e2e/smoke.test.js`): Suite 11 "Agenda - badge abono". Inyecta una deuda y un gasto-abono del mes actual via `addInitScript`, navega a Agenda, clica el día 15, verifica el badge visible. Corrige también el selector de la leyenda (era `text=Deuda` que fallaba por ambigüedad).
- **`service-worker.js`:** v82 → v83.

**Sigue:** No hay más sub-tareas de "abono a deudas". Proyecto en modo mantenimiento.

**Archivos:** `modules/dominio/agenda/view.js`, `modules/dominio/compromisos/view.js`, `modules/dominio/compromisos/index.js`, `styles/components.css`, `tests/e2e/smoke.test.js`, `service-worker.js`, `docs/`.

**Tests:** 974/974 verdes. E2E: 39 pasan (badge + leyenda Agenda).

> Para tareas anteriores (v7.14 y previas), ver [`docs/CHANGELOG.md`](CHANGELOG.md).

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
