# HANDOFF — Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-05-18 (Fix routing race condition en 5 dominios)

**Producción:** https://finko-brown.vercel.app
**Repositorio:** https://github.com/estebancuentas140892-star/Finko

---

## 1. Qué es Finko

PWA offline-first de gestión financiera personal para Colombia.
Vanilla JS puro + ES6 modules. Sin framework, sin build step, sin servidor, sin cuenta.
Todo vive en `localStorage` (clave `fk_v1`). Pensada para personas con poco conocimiento
financiero: lenguaje simple, normativa colombiana (SMMLV, UVT, tasa de usura, GMF).

**Versión actual:** `v1.0.0` — todas las 14 fases originales completadas y cerradas.
**Rama principal:** `main`.

---

## 2. Estado técnico actual

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 702/702 verdes |
| Tests E2E | 32/32 verdes |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### Fix routing race condition en 5 dominios · 2026-05-18
**Síntoma reportado por el usuario:** al navegar desde Dashboard hacia
Tesorería o Metas, la sección a veces aparecía completamente vacía (solo
título, sin lista, sin empty state). Intermitente y frustrante.
**Causa:** tesoreria, metas, gastos, ingresos y compromisos hacían
`renderSmart(..., key)` en su `init()` pero **no** registraban listener
de `hashchange`. Si el hash inicial era `#dash` y se navegaba a otra
sección sin haber mutado el estado, nunca se rendereaba el contenido.
**Solución:** agregar `window.addEventListener('hashchange', ...)` a los
5 dominios siguiendo el patrón ya validado en analisis/config/presupuesto/
calculadoras/personales. SW v13→v14. Nuevo test E2E de regresión
`navegacion-render.test.js` (6 tests) que prueba navegar Dashboard→sección
y verificar empty state visible.
- `modules/dominio/{tesoreria,metas,gastos,ingresos,compromisos}/index.js`
- `tests/e2e/navegacion-render.test.js` (nuevo, 6 tests)
- `service-worker.js` (v13→v14)
- Tests: 702/702 unit, 32/32 E2E verdes.

### Test E2E F.4 — Smoke de Estrategia de pago · 2026-05-18
8 tests Playwright en `tests/e2e/estrategia-pago.test.js`: card visible con ≥ 2
deudas, orden Avalancha (mayor tasa primero), orden Bola de Nieve (menor saldo
primero), toggle ida/vuelta, extra mensual redibuja totales, intereses formateados,
hint con 1 deuda, contenedor vacío sin deudas. 26/26 E2E verdes.

### F.4 — Estrategias Avalancha / Bola de Nieve · 2026-05-18
3 funciones puras en `compromisos/logic.js`: `filtrarDeudasPagables`,
`simularEstrategiaPago` (mes a mes con interés `(1+EA)^(1/12)-1`, cuotas
liberadas que ruedan, tope MAX_MESES=600), `compararEstrategias`. Card
en `compromisos/view.js` aparece solo con ≥ 2 deudas válidas (con 1 muestra
hint). Input "extra mensual" + toggle Avalancha 🏔️/Bola de Nieve ⚪ + tabla
con orden + ahorro vs alternativa (plural-aware: "1 mes" vs "N meses"). 17
tests nuevos (702/702 verdes). SW v12→v13.
- `modules/dominio/compromisos/{logic,view,index}.js`, `index.html`,
  `styles/components.css`, `tests/unit/compromisos.test.js`, `service-worker.js`

### F.3 — Score de Salud Financiera con 4 factores ponderados · 2026-05-18
Agregado cross-dominio en dashboard + panel `analisis/`. Score 0–100 con 4 factores
ponderados: tasa de ahorro (40%), deuda-a-activos (25%), liquidez en meses (20%),
control de gastos / volatilidad (15%). Clasificación en 4 bandas visuales: excelente
(80+), buena (60–79), ajustada (40–59), crítica (<40). Card con hero number, gauge
0–100, y 4 sub-factor cards mostrando drivers. Volatilidad calculada como std dev
de 12 meses de gastos. 18 tests nuevos: 685/685 verdes. SW v11→v12.
- `modules/dominio/analisis/{logic,view}.js` (nuevas funciones + integración)
- `styles/components.css` (+60 líneas para `.score-card` y variantes)
- `tests/unit/analisis.test.js` (+18 tests)
- `service-worker.js` (v11→v12)

### Fix crítico: Routing race condition en `renderSmart()` · 2026-05-18
**Síntoma:** Secciones presupuesto, analisis, calculadoras, config mostraban contenido
inconsistentemente (a veces sí, a veces no). **Causa:** Race condition en hashchange
listeners. El dominio registra su listener ANTES que el router. Cuando se navega:
1. Listener del dominio dispara → `renderSmart()` chequea `.active` clase
2. `.active` aún es FALSE (el router no la ha actualizado)
3. `renderSmart()` retorna sin renderizar (no-op)
4. Router dispara más tarde y actualiza `.active`, pero demasiado tarde

**Solución:** Cambiar `renderSmart()` de chequear `.active` (asincrónico, actualizado
por router) a chequear `location.hash` (sincrónico, actualizado antes de los listeners).
Además, agregar listener de `hashchange` a dominio `analisis/` que faltaba.
- `modules/infra/render.js`: `renderSmart()` ahora usa `location.hash.slice(1)` en vez de `.active`
- `modules/dominio/analisis/index.js`: agregado listener de `hashchange` faltante
- Tests: 685/685 verdes. Verificado en browser: todas 4 secciones renderean consistentemente.

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
| 1 | **A.5 — Dominio custom** (opcional) | Cuando el usuario tenga dominio registrado | Guía lista en [`docs/SETUP_DOMINIO.md`](SETUP_DOMINIO.md) |
| 2 | **E.2 — SMMLV + UVT** (anual) | **Enero 2027** — buscar nuevos valores Mintrabajo (SMMLV) + DIAN (UVT), actualizar `modules/core/constants.js` | ~15 min, Haiku |
| 3 | **E.3 — GMF + reforma** (demanda) | Si hay reforma tributaria — verificar cambios en GMF | Ad-hoc |

### ⏰ Recordatorio enero 2027 — E.2

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
- **Modelos permitidos:** `Haiku 4.5` (sin nivel) · `Sonnet 4.6 — Bajo/Medio/Alto` · `Opus 4.7 — Bajo/Medio/Alto/Extra Alto/Max`.
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
tests/unit/  → lógica pura (Vitest + happy-dom) — 521 tests
tests/e2e/   → smoke tests (Playwright) — 18 tests
```

Regla clave: **ningún dominio importa a otro** — comunicación exclusiva por `EventBus`.
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
