# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-02 (fix(color): semántica de color del gasto neutral, no roja, AUD.4)

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
| Tests unitarios + integración | 1764/1764 verdes |
| Tests E2E | 81/81 verde. Suites: `smoke` 45 tests, `estrategia-pago` 15 tests, `ahorro-inversion` 9 tests, `navegacion-render` 6 tests, `install-prompt` 6 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### fix(color): semántica de color del gasto neutral, no roja (AUD.4) · 2026-07-02

Cuarto slice de la auditoría integral del 2026-07-02. Dos lugares pintaban el monto de gasto en rojo fijo, lo que contradice el criterio de ADR 019 (verde = logro, ámbar = advertencia, rojo = incumplimiento) y el tono neutral de ADR 008: gastar no es incumplir. (1) El total de "Resumen de la semana" en Inicio y el "Pendiente" en Préstamos ([styles/components/domain.css](../styles/components/domain.css), clase compartida `.resumen-card__stat--primary`) usaban `--fk-danger-text`; ahora `--fk-text-primary` (neutro). (2) La variación al alza del gasto mensual en Análisis (`.chart-stat--negativo`, [styles/components/charts.css](../styles/components/charts.css)) usaba `--fk-danger`; se eliminó la regla (el color base de `.chart-stat__valor` ya es neutro) y se quitó la asignación de esa clase en [analisis/view.js](../modules/dominio/analisis/view.js). Se decidió neutro y no ámbar para la variación al alza, por consistencia con el texto de tendencia semanal (ya neutro desde F8) y porque no hay un umbral incumplido que justifique una advertencia. Bajar el gasto sigue en verde (`chart-stat--positivo`, `resumen-card__trend--baja`): sí es un logro. Sin tests nuevos (cambio de color puro, sin lógica; ningún test referenciaba estas clases). 1764/1764 unit + 81/81 E2E verdes. SW v250 → v251.

| Archivo | Cambio |
|---|---|
| `styles/components/domain.css` | `.resumen-card__stat--primary .resumen-card__value`: `--fk-danger-text` → `--fk-text-primary`. |
| `styles/components/charts.css` | Eliminada `.chart-stat--negativo` (color danger); el neutro ya es el default de `.chart-stat__valor`. |
| `modules/dominio/analisis/view.js` | `_renderTendencia` ya no asigna `chart-stat--negativo` al subir el gasto. |
| `service-worker.js` | v250 → v251. |

---

### fix(copy): voseo, tildes y términos viejos corregidos (AUD.3) · 2026-07-02

Tercer slice de la auditoría integral del 2026-07-02. Cinco correcciones puntuales de copy: (1) [logros/logic.js](../modules/dominio/logros/logic.js) tenía 4 descripciones en voseo o sin tildes ("Tenes", "un prestamo que vos le diste", "configuracion", "esta lista"), que violan la regla ADN 11 (tuteo, español neutro); corregidas a tuteo con tildes correctas. (2) El enlace "Ver agenda" en el panel de prioridades de Inicio ([compromisos/views/dashboard.js](../modules/dominio/compromisos/views/dashboard.js)) quedó desactualizado desde que la sección se renombró a Calendario (AG.1); ahora dice "Ver calendario". (3) Los empty states de Gastos y Mis cuentas ([gastos/view.js](../modules/dominio/gastos/view.js), [tesoreria/view.js](../modules/dominio/tesoreria/view.js)) mencionaban "el dashboard", término que la app ya no usa desde el renombre a Inicio; corregidos a "Inicio". (4) `APP_VERSION` en [core/constants.js](../modules/core/constants.js) decía `'0.1.0'`, visible en Ajustes > Acerca de Finko, pero el proyecto está en v1.0.0 (`package.json`); sincronizado. (5) "Toca una estrategia" en el placeholder de Deudas ([compromisos/views/estrategia.js](../modules/dominio/compromisos/views/estrategia.js)) se leía raro en desktop (no hay "toque" en mouse); cambiado a "Elige una estrategia". Sin tests nuevos (copy sin lógica asociada; ningún test existente referenciaba estos textos). 1764/1764 unit + 81/81 E2E verdes. SW v249 → v250.

| Archivo | Cambio |
|---|---|
| `modules/dominio/logros/logic.js` | 4 descripciones de logros: tuteo + tildes correctas. |
| `modules/dominio/compromisos/views/dashboard.js` | "Ver agenda" → "Ver calendario" en el panel de prioridades. |
| `modules/dominio/gastos/view.js`, `modules/dominio/tesoreria/view.js` | "el dashboard" → "Inicio" en empty states. |
| `modules/core/constants.js` | `APP_VERSION` `'0.1.0'` → `'1.0.0'`. |
| `modules/dominio/compromisos/views/estrategia.js` | "Toca una estrategia" → "Elige una estrategia". |
| `service-worker.js` | v249 → v250. |

---

### fix(css): 15 variables CSS fantasma mapeadas a tokens reales (AUD.2) · 2026-07-02

Segundo slice de la auditoría integral del 2026-07-02. `charts.css`, `domain.css`, `analysis.css`, `forms.css`, `config.css` y `layout.css` usaban 15 variables `--fk-*` nunca definidas en `tokens.css`: sin definición, el navegador cae al valor inicial (`accent-color` de radios/checkboxes se veía azul del navegador en vez del verde de marca; bordes caían a `currentColor`, invisibles; fondos de charts quedaban transparentes; pesos de fuente caían a `regular`). Mapeo aplicado según el patrón ya establecido en el resto del código: `--fk-primary` → `--fk-accent`; `--fk-border` → `--fk-border-subtle` (convención dominante para bordes de tarjeta, 35 usos contra 15 de `border-default`); `--fk-bg`/`--fk-surface`/`--fk-surface-subtle` → `--fk-bg-surface`/`--fk-bg-elevated` según jerarquía visual (excepto dos usos como `color:` sobre círculos de acento, que van a `--fk-text-on-accent`); `--fk-text` → `--fk-text-primary`; `--fk-weight-*`/`--fk-font-normal` → `--fk-font-*`/`--fk-font-regular`; `--fk-radius` → `--fk-radius-sm`; `--fk-radius-pill` → `--fk-radius-full`; `--fk-text-md` → `--fk-text-base`; `--fk-text-2xs` → `--fk-text-xs` (sin equivalente exacto en la escala, xs es el más cercano). Cero cambios de lógica ni de HTML. Verificado en navegador: Análisis (sparkline, dona, tarjetas de stats) y Presupuesto (estado vacío con borde punteado) ahora muestran bordes y fondos reales en vez de transparentes. 1764/1764 unit verdes (sin cambios de comportamiento, solo visual). SW v248 → v249.

| Archivo | Cambio |
|---|---|
| `styles/components/charts.css` | 15 usos: sparkline, donut, stats, import CSV, tarjetas de estrategia de deuda. |
| `styles/components/domain.css` | 11 usos: selector de cuenta (radio/checkbox), tarjeta de límites, consolidado de ahorro. |
| `styles/components/analysis.css` | 14 usos: tarjetas de grupo, envelopes, fondo de emergencia, inversión, tabla comparativa. |
| `styles/components/forms.css` | 2 usos: badge genérico, placeholder de gasto sin completar. |
| `styles/components/config.css` | 2 usos: título y emoji del detalle de calendario. |
| `styles/layout.css` | 1 uso: separador de sub-header de sección. |
| `service-worker.js` | v248 → v249. |

---

### fix(dashboard/analisis): montos reales de deudas en Inicio y variación sin base en Análisis (AUD.1) · 2026-07-02

Primer slice de la **auditoría integral de producto** del 2026-07-02 (UX, UI, tipografía, a11y, lenguaje, IA, integración, rendimiento, responsive; método: revisión de código completa + 29 capturas Playwright en desktop/móvil y tema claro/oscuro). Veredicto de la auditoría: base sobresaliente, deuda corta y localizada; el backlog restante quedó como **AUD.2 a AUD.6** en [TASKS.md](TASKS.md). Este slice corrige los 4 bugs funcionales visibles: (1) "$NaN pendiente" en el nudge de deudas sin actividad (la vista leía `d.saldoPendiente`; la lógica devuelve `saldoTotal`); (2) deudas vencidas con "$0" en "N pendientes del mes" (`detectarVencidosCompletos` usaba `c.monto`, que las deudas no tienen desde v6; ahora expone `cuotaMensual`); (3) "Próximas prioridades" omitía la cifra de las deudas (ahora `c.monto ?? c.cuotaMensual`); (4) variación "↑ 0%" en rojo en Análisis cuando el mes anterior cerró en $0 (ahora aviso neutro "Sin gastos el mes anterior para comparar", mismo criterio que el resumen semanal). 6 tests de regresión. 1758/1758 → 1764/1764 unit; 81/81 E2E. Verificado en navegador real. SW v247 → v248.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/views/alertas.js` | `f(d.saldoTotal)` en el nudge de deudas durmiendo (antes NaN). |
| `modules/dominio/compromisos/logic.js` | `detectarVencidosCompletos` expone la cuota mensual como `monto` en deudas. |
| `modules/dominio/compromisos/views/dashboard.js` | El panel de prioridades usa `c.monto ?? c.cuotaMensual`. |
| `modules/dominio/analisis/view.js` | `_renderTendencia` con aviso neutro cuando no hay base de comparación. |
| `tests/unit/compromisos.test.js`, `tests/unit/analisis.test.js` | 6 tests de regresión. |
| `service-worker.js` | v247 → v248. |

---

### feat(presupuesto): los topes se fusionan dentro de la tarjeta de Estilo de vida (MC.8b) · 2026-07-01

Segundo slice grande de MC.8 ([ADR 019](DECISIONS/019-limites-por-rol.md), decisiones 2 y 4). Se elimina el bloque suelto "Estilo de vida: topes por categoría" (y su hero de totales): ahora los topes viven **dentro** de la tarjeta de Estilo de vida (`_renderDetalleEstiloVida`), con tres piezas nuevas: la línea de "olla finita" (`coberturaLimitesEstiloVida`, MC.8a) que dice cuánto del presupuesto de Estilo de vida cubren los límites y cuánto queda sin tope, sin forzar el 100%; los envelopes por categoría con sus alertas; y el botón "Agregar límite" (topes bajo demanda). `_renderGrupoCard` pasa a ser **consciente del rol**: Necesidades = monitorear (estado neutro `monitor`, sin barra ámbar ni roja, tercera cifra "Sobre lo previsto" sin rojo aunque supere lo previsto); Ahorro = celebrar (verde, ya venía de MC.8); Estilo de vida = controlar (conserva alerta/excedido). El estado sin ingreso conserva la gestión de topes (sin olla finita). Se eliminaron `_renderHero` y `_renderEmptyState` (código muerto tras la fusión). 3 E2E nuevos. 1758/1758 unit; 42/42 → 45/45 smoke E2E. SW v246 → v247. Pendiente MC.8c: layout (Necesidades + Ahorro en 2 columnas, Estilo de vida en fila completa).

| Archivo | Cambio |
|---|---|
| `modules/dominio/presupuesto/view.js` | Topes fusionados en la tarjeta de Estilo de vida (`_renderDetalleEstiloVida`, `_renderOllaFinita`); `_renderGrupoCard` consciente del rol; `_renderHero`/`_renderEmptyState` eliminados. |
| `styles/components/analysis.css` | `.estilo-limites*`, `.estilo-olla*`, `.estilo-limites-standalone*`; se quitó `.estilo-detalle*` y `.presupuesto-hero*`. |
| `styles/responsive.css` | Se quitó la regla móvil de `.presupuesto-hero__totales`. |
| `tests/e2e/smoke.test.js` | 3 tests nuevos (fusión + botón, olla finita, Necesidades sin alarma). |
| `service-worker.js` | v246 → v247. |

---

> Para tareas anteriores (fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md).

---

## 4. Estado de finalización (v1.0 + post-v1.0)

**🎯 Hito: todas las series pendientes completadas.**

- ✅ **"Coaching de ingresos"** (Fases 1, 2, 3): diaPago + nudge de próximo cobro + distribución adaptativa. SW v128 → v131. 1235/1235 verdes. 2026-06-09.
- ✅ **"Mejoras de deudas"**: tasa opcional + motor de recomendación por simulación. SW v131 → v132. 1256/1256 verdes. Ver [ADR 006](DECISIONS/006-recomendacion-deudas-por-simulacion.md). 2026-06-09.
- ✅ **"Apartados"** (Fases 1, 2, 3): CRUD + recurrencia/ciclo + frecuencia automática + nudge de proximidad. SW v132 → v135. 1333/1333 verdes. Ver [ADR 007](DECISIONS/007-dominio-apartados.md). 2026-06-10.
- ✅ **fix(agenda) abono parcial**: badge de Agenda distingue abono parcial de cuota cubierta. SW v135 → v136. 1351/1351 verdes. 2026-06-10.

**Tareas opcionales / futuras:**
- **E.2-2027**: Enero 2027, actualizar SMMLV/UVT a valores 2027 cuando se publiquen oficialmente (Haiku, ~15 min).
- **E.5**: Agregar IPC como constante anual si se quiere mostrar inflación observada (Haiku, Bajo).
- **A.5**: Setup de dominio custom cuando el usuario tenga URL registrada. No requiere código. Guía lista en `docs/SETUP_DOMINIO.md`.

**App en producción estable:** https://finko-brown.vercel.app (Lighthouse 99-100, 1333/1333 tests verdes, cero deuda técnica conocida).

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

### Recordatorio enero 2027 - E.2

> Desde la refactorización a tabla histórica, **no se crean exports `_2027`**: basta con agregar UNA entrada en `LEGAL_POR_ANIO`. Toda la app (UI, cálculos, tests) y el aviso de vigencia de P1 dejan de marcar "desactualizado" en cuanto la entrada existe.

**Qué hacer:**
1. Visita [DIAN UVT](https://www.dian.gov.co/) y [Mintrabajo SMMLV](https://www.mintrabajo.gov.co/)
2. Obtén los valores oficiales 2027 (SMMLV, auxilio de transporte, UVT) con sus decretos/resoluciones.
3. En `modules/core/constants.js`, reemplaza `2027: null` por una entrada completa:
   ```javascript
   2027: {
     smmlv:             <nuevo_valor>,
     auxilioTransporte: <nuevo_valor>,
     uvt:               <nuevo_valor>,
     vigenciaDesde: '2027-01-01',
     fuentes: { smmlv: '...', auxilio: '...', uvt: '...' },
   },
   ```
4. Tests (`pnpm test` → todo verde; incluye `tests/unit/constants.test.js`).
5. Bumpear `CACHE_NAME` en `service-worker.js`.
6. Commit: `feat(E.2): cargar SMMLV + auxilio + UVT 2027`
7. Push a main → auto-deploy a producción.

**Modelo:** Escribe tu `Próximo paso` con **Haiku 4.5** (búsqueda + cambio mecánico de una entrada).

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
tests/e2e/   → smoke tests (Playwright) - 57 tests
```

Regla clave: **ningún dominio importa a otro** - comunicación exclusiva por `EventBus`.
Todo `logic.js` es sin DOM (testeable en Node). Todo `view.js` solo lee `S`, no lo muta.

---

## 7. Comandos rápidos

```bash
python -m http.server 8080   # Servir la app (ES6 modules requieren HTTP)
pnpm test                     # 1182 tests unitarios + integración
pnpm run test:e2e             # 57 smoke tests Playwright
pnpm run coverage             # umbral 90% capa lógica
pnpm run lighthouse           # requiere servidor en :8080
```
