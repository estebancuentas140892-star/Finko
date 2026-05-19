# HANDOFF — Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-05-19 (G.3.F9 - Recordatorio de prima 30 días antes del semestre)

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
| Tests unitarios + integración | 732/732 verdes |
| Tests E2E | 32/32 verdes |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### G.3.F9 - Recordatorio de prima 30 días antes del semestre · 2026-05-19
El nudge de prima en Tesorería ahora escala de nivel según la proximidad del vencimiento.
Funciona como extensión de F8: el mismo `#nudge-prima` pero el contenido y color cambian.
- `modules/dominio/tesoreria/logic.js`: nueva funcion `diasParaPrimaSemestral(hoy?)`.
  Calcula días hasta el próximo vencimiento (30-jun o 20-dic). Normaliza a medianoche
  para comparación limpia. Retorna `{ dias, fecha, semestre }`.
- `modules/dominio/tesoreria/view.js`: `renderNudgePrima()` actualizado para incluir timing.
  dias > 30: nudge-info con distribucion (igual a F8). dias ≤ 30: nudge-medium + countdown.
  dias ≤ 7: nudge-high + countdown urgente. El role cambia a 'alert' cuando es cercana.
- `tests/unit/tesoreria.test.js`: 7 tests nuevos para `diasParaPrimaSemestral` (shape,
  29 dias, dia exacto semestre 1, dia exacto semestre 2, transición jul, transición dic,
  dias >= 0 siempre). Total: 725 + 7 = 732/732 verdes.
- `service-worker.js`: v24 a v25.

### G.3.F8 - Sugerencia de distribución de prima en Tesorería · 2026-05-19
Tarjeta informativa en la sección Tesorería que estima la prima semestral del usuario
y sugiere cómo distribuirla (50% fondo de emergencia, 30% deudas si las hay, 20% metas).
- `modules/dominio/tesoreria/logic.js`: dos funciones nuevas:
  `estimarSalarioMensual(ingresos)` suma ingresos activos con frecuencia Mensual;
  `sugerirDistribucionPrima(salario, tieneDeudas)` calcula prima (salario*180/360) y
  los tres tramos porcentuales.
- `modules/dominio/tesoreria/view.js`: `renderNudgePrima()` escribe en `#nudge-prima`.
  Si salario=0: hint para registrar ingresos. Si salario>0: prima estimada y distribución.
  Lee `S.ingresos` y `S.compromisos` para personalizar (si hay deudas cambia pcts).
- `modules/dominio/tesoreria/index.js`: nueva funcion `_renderTodo()` llama
  `renderNudgePrima()` + `renderListaCuentas()`. EventBus también escucha cambios
  en `ingresos` y `compromisos` para re-renderizar la sugerencia cuando cambian esos dominios.
- `index.html`: nuevo `<div id="nudge-prima">` antes de `#lista-tesoreria`.
- `tests/unit/tesoreria.test.js`: 11 tests nuevos (5 para estimarSalarioMensual,
  6 para sugerirDistribucionPrima). Total: 714 + 11 = 725/725 verdes.
- `service-worker.js`: v23 a v24.

### G.3.F5 - Nudge mora inminente en Compromisos · 2026-05-19
Cuando hay compromisos activos con vencimiento en 5 dias o menos, aparece un nudge de
advertencia encima de la lista en `#nudge-compromisos` (nuevo div en index.html).
- `modules/dominio/compromisos/logic.js`: nueva funcion exportada `nivelAlertaMora(proximos)`.
  Recibe la lista de `compromisosProximos()` y retorna `'high'` (alguno vence en ≤ 3 dias),
  `'medium'` (todos entre 4 y 5 dias) o `null` (sin mora inminente).
- `modules/dominio/compromisos/view.js`: nueva funcion exportada `renderNudgeMoraInminente()`.
  Lee `S.compromisos`, filtra con `compromisosProximos(S.compromisos, 5)`, determina nivel con
  `nivelAlertaMora()` y renderiza el nudge (o limpia el div si no hay mora inminente).
  Cada compromiso aparece con descripcion, label de dias y monto formateado.
- `modules/dominio/compromisos/index.js`: `_renderTodo()` llama `renderNudgeMoraInminente()`
  antes de `renderListaCompromisos()`.
- `index.html`: nuevo `<div id="nudge-compromisos">` antes de `#lista-compromisos`.
- `tests/unit/compromisos.test.js`: 5 tests nuevos para `nivelAlertaMora`.
  Total: 709 + 5 = 714/714 verdes.
- `service-worker.js`: v22 a v23.

### G.2.D - CSS para Calculadoras y Configuracion · 2026-05-19
Las dos secciones tenian clases HTML huerfanas sin reglas CSS. Se agregaron estilos completos
en `styles/components.css` sin tocar ninguno de los archivos JS ni HTML.
- `.calc-panel/.calc-card/.calc-card__title`: cada calculadora queda como surface-card
  (fondo `--fk-bg-surface`, borde sutil, radius xl, padding 24px, grid de campos 2 col).
- `.calc-result/.calc-result__grid`: area de resultado con borde izquierdo accent, grid dl/dd.
- `.calc-result__highlight/.deduct/.total`: colores accent/danger para valores clave.
- `.calc-result__badge/.calc-result__errors`: badge de clasificacion de tasa + lista de errores.
- `.config-section/.config-section__title/.config-section__desc`: misma surface-card que calc.
- `.config-info`: dl key-value en grid de 2 columnas con dt muted y dd primary.
- `.config-toggle`: pill switch iOS-style con `appearance: none` + `::after` animado en verde.
- `.config-actions`: flex-wrap para botones de importar/exportar.
- `.config-danger`: zona roja sutil (`--fk-danger-bg`, borde rgba danger 25%).
- SW v20 a v21.
- Archivos: `styles/components.css`, `service-worker.js`.

### G.2.C - Onboarding wizard de 3 pasos · 2026-05-19
Amplió el wizard de bienvenida de 1 paso (solo nombre) a 3 pasos reales con datos útiles.
- Paso 1: Nombre. Igual que antes pero con indicador de progreso (dots animados).
- Paso 2: Ingreso principal (monto + frecuencia, opcional) + primera cuenta o billetera (nombre + saldo, opcional). Si el usuario llena algo, se guarda con `guardar()` al pasar al siguiente paso.
- Paso 3: Meta de ahorro. Chips preset (🛡️ Fondo de emergencia, ✈️ Viaje, 💻 Tecnología, 🏠 Vivienda, 🎓 Educación) que pre-llenan el campo de nombre. El usuario puede escribir su propia meta + monto objetivo.
- "Omitir" en paso 2 y "Omitir y empezar" en paso 3 permiten saltar sin registrar datos.
- Nuevas imports en onboarding.js: `guardar` de crud.js, `FRECUENCIAS` de constants.js.
- CSS nuevo en modals.css: `.onboarding__steps`, `.onboarding__step`, `.onboarding__hero`, `.onboarding__title`, `.onboarding__desc`, `.onboarding__footer`, `.onboarding__skip`, `.onboarding__divider`, `.onboarding__chips`, `.onboarding__chip` con variante `.selected`.
- SW v19 a v20.
- Archivos: `modules/ui/onboarding.js` (reescrito), `styles/modals.css`, `service-worker.js`.




### E.2 — Actualizar SMMLV/UVT 2026 + preparar 2027 · 2026-05-19
Hallazgo importante: los valores en `constants.js` estaban desactualizados
(eran los de 2025 etiquetados como 2026). Actualizados a los valores
oficiales 2026:
- **SMMLV 2026:** $1.423.500 → **$1.750.905** (Decreto 1469 del 29-12-2025,
  ratificado por Decreto 0159 del 19-02-2026 tras suspensión provisional).
- **Auxilio transporte 2026:** $200.000 → **$249.095** (Decreto 1470/2025).
- **UVT 2026:** $49.799 → **$52.374** (Resolución DIAN 000238 del 15-12-2025).
- Añadido `VIGENCIA_2026 = '2026-01-01'`.
- Placeholders `SMMLV_2027/UVT_2027/AUXILIO_TRANSPORTE_2027/VIGENCIA_2027 = null`
  (publicación esperada: diciembre 2026).

Actualizadas también las UI strings (config "Acerca de", form de prima)
y test de prima (umbral 2×SMMLV cambió de $2.847.000 a $3.501.810).
702/702 unit + 32/32 E2E verdes. SW v14→v15.
- `modules/core/constants.js`, `modules/dominio/config/view.js`,
  `modules/dominio/calculadoras/{view,logic}.js`,
  `tests/unit/calculadoras.test.js`, `service-worker.js`

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
