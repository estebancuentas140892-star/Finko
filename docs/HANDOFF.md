# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-13 (fix agenda: íconos SVG en detalle del día; 1402/1402 verde)

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
| Tests unitarios + integración | 1402/1402 verdes (+21: resumen/logic.js) |
| Tests E2E | 57/57 verde. Suites: `smoke` 28 tests, `estrategia-pago` 8 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### fix(agenda): íconos SVG en detalle del día (deuda-personal y deuda-entidad) · 2026-06-13

`agenda/view.js` usaba `_esc(ICONO_TIPO[tipo])` en lugar de `icon()`, por lo que el ID de ícono SVG (`'personales'`, `'cuentas'`, `'recurring'`) se renderizaba como texto literal dentro del contenedor circular de 36px, desbordando sobre el nombre del compromiso. El mismo error existía en `compromisos/views/lista.js` (fallback sin `ordenBadge`). Fix: importar `icon` en `agenda/view.js` y usarla en ambos archivos. CSS defensivo: `overflow: hidden` + `flex-shrink: 0` en `.cal-detail__icon`. SW v152 → v153. Tests 1402/1402 verdes (sin cambios de lógica).

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/view.js` | Importa `icon` de `infra/icons.js`; `icono = icon(ICONO_TIPO[tipo] ?? 'recurring')` en `_renderDetalleItem`. |
| `modules/dominio/compromisos/views/lista.js` | `icono = icon(ICONO_TIPO[tipo] ?? 'recurring')` en `_renderCompromisoItem` (mismo bug, fallback sin estrategia). |
| `styles/components/config.css` | `.cal-detail__icon`: `overflow: hidden; flex-shrink: 0` para contener el SVG y no ceder espacio bajo presión de flex. |
| `service-worker.js` | v152 → v153. |

---

### feat(rediseno-v8): card de resumen semanal en el dashboard · 2026-06-13

Implementación de la fase F8, según [ADR 008](DECISIONS/008-mecanicas-de-habito.md). Nuevo dominio `resumen/` (solo lectura, derivado de `S.gastos`): lógica pura de agregación (gasto de los últimos 7 días, comparación con la semana previa, categoría con más gasto, "días activos del mes") y una card de ancho completo en el bento del dashboard que aparece solo cuando hay actividad esta semana (patrón `[hidden]` de V.4). Tono calmo: la subida de gasto se muestra en color neutro, no como alarma; la bajada se refuerza en acento. Sin schema nuevo, sin migración, sin racha, sin telemetría. SW v151 → v152. Tests 1402/1402 verdes (+21).

| Archivo | Cambio |
|---|---|
| `modules/dominio/resumen/logic.js` | Nuevo: funciones puras `gastoUltimos7Dias`, `gastoSemanaPrevia`, `compararSemanas`, `categoriaTopSemana`, `diasActivosMes`, `resumenSemanal`, `hayResumen`. |
| `modules/dominio/resumen/view.js` | Nuevo: `renderPanelResumen()` pinta `#panel-resumen`; oculta la card sin actividad. Tono de la tendencia neutral. |
| `modules/dominio/resumen/index.js` | Nuevo: `initResumen()` engancha render en dashboard (registrarRender + state:change de gastos + hashchange). |
| `tests/unit/resumen.test.js` | Nuevo: 21 tests de la lógica de agregación (ventanas de fecha, comparación, top, días activos, gate). |
| `index.html` | Nuevo cell `#panel-resumen` (`bento__cell--full`, arranca `[hidden]`) tras prioridades. |
| `styles/components/domain.css` | Estilos `.resumen-card__*`: grid auto-fit de stats, tonos de tendencia (baja/sube/neutro). |
| `modules/ui/bootstrap.js` | Importa y llama `initResumen()`. |
| `service-worker.js` | v151 → v152; 3 archivos de `resumen/` en CORE_ASSETS. |

---

### docs(adr-008): decisión de producto V.8: resumen semanal sí, racha con castigo no · 2026-06-12

Decisión de producto de la fase F8 (mecánicas de hábito), tomada con el usuario antes de codear. Se descarta la racha estilo Duolingo (días consecutivos, aversión a la pérdida) por inadecuada en una app financiera de bienestar. Se construirá solo un **resumen semanal** de solo lectura (gasto de 7 días + comparación, categoría top, "días activos del mes" como contador amable que solo informa), derivado de `S` con lógica pura, sin schema nuevo. La implementación queda como próxima tarea. Sin código de app en este commit (solo ADR + docs).

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/008-mecanicas-de-habito.md` | Nuevo ADR: tensión racha vs tono adulto, decisión (solo resumen semanal), alcance, qué NO se construye, alternativas descartadas. |
| `docs/REDESIGN_2026.md`, `docs/ROADMAP.md` | F8/V.8 marcada "decisión tomada, implementación pendiente"; modelo bajado a Sonnet 4.6 - Medio (ya no hay decisión de producto que requiera Opus). |

---

### feat(rediseno-v7): empty states ilustrados y navegación con indicador activo · 2026-06-12

Séptima y última fase de UI del rediseño visual 2026. Nuevo helper `emptyArt(id)` en `infra/icons.js`: ilustración SVG geométrica (círculo de fondo, órbita punteada animada, puntos flotantes, icono del dominio centrado) que reemplaza el icono suelto en los 10 empty states. Navegación pulida: indicador de acento en el item activo (barra vertical en sidebar, horizontal en bottom nav), press scale y micro-zoom del icono al hover. Fix 1: el empty state de Deudas aún usaba emoji 💳 (escapado de V.2). Fix 2: `infra/icons.js` faltaba en CORE_ASSETS del SW desde V.2 (brecha offline-first). Tips de empty states unificados con `icon('lightbulb')`. SW v150 → v151. Tests 1381/1381 verdes (+6). Desde esta tarea rige el deploy continuo: cada cierre se pushea a Vercel de inmediato.

| Archivo | Cambio |
|---|---|
| `modules/infra/icons.js` | Nuevo `emptyArt(id)`: ilustración geométrica para empty states; colores y animación en CSS, cero inline. |
| `tests/unit/icons.test.js` | Nuevo: 6 tests de `icon()` y `emptyArt()` (sprite, clases, aria-hidden, sin colores inline). |
| Views de 9 dominios + `compromisos/views/lista.js` | Empty states usan `emptyArt(dominio)`; tips con `icon('lightbulb')`; Deudas pierde el emoji 💳. |
| `styles/components/atoms.css` | Estilos `.empty-art__*` + animaciones `empty-orbit` (40s) y `empty-float`, gateadas por no-preference. |
| `styles/layout.css` | `.nav-item::before`: barra de acento del item activo (crece desde el centro); press scale; zoom 1.1 del icono al hover. |
| `styles/responsive.css` | El indicador pasa a barra horizontal en el borde superior del bottom nav. |
| `service-worker.js` | v150 → v151; `icons.js` agregado a CORE_ASSETS (faltaba desde V.2). |

---

### feat(rediseno-v6): microinteracciones: press universal, lift al hover, anillo y checkmark animados · 2026-06-12

Sexta fase del rediseño visual 2026. Press scale(0.97) en todos los botones (antes solo móvil), lift sutil al hover en cards y list-items (gateado por prefers-reduced-motion), llenado de entrada animado del anillo de progreso (refactor a pathLength="100": dashoffset normalizado permite un keyframe CSS genérico para cualquier tamaño), checkmark con pop de overshoot al pagar/completar (metas, apartados, personales, badge de pago en agenda), y count-up extraído a `infra/animate.js` como helper reutilizable por elemento. Fix: la animación `sectionIn` nunca corría (selector `.sec.active`; las secciones usan `.section`, mismo bug que cardIn corregido en V.4). SW v149 → v150. Tests 1375/1375 verdes (+1 neto).

| Archivo | Cambio |
|---|---|
| `modules/infra/svg.js` | Arco del anillo con `pathLength="100"`: dasharray fijo 100, dashoffset = 100 - pct para cualquier tamaño. Habilita la animación CSS genérica de llenado. |
| `tests/unit/svg.test.js` | 2 tests de dasharray reescritos para pathLength + 1 nuevo (dashoffset independiente del tamaño). |
| `modules/infra/animate.js` | Nuevo: `countUp(el, to, opts)` reutilizable, RAF por elemento (WeakMap), respeta prefers-reduced-motion internamente. |
| `modules/infra/render.js` | Usa `countUp` de animate.js; elimina la implementación local de V.4. |
| `styles/base.css` | Fix: `sectionIn` con selector `.section.active` (antes `.sec.active`, muerto). Press móvil movido a buttons.css como regla universal. |
| `styles/components/buttons.css` | `.btn:active` scale(0.97) universal; `transform` agregado a transitions de btn y card; lift -2px en `.card-hover:hover`. |
| `styles/components/atoms.css` | Keyframes `ring-fill` + animación en `.progress-ring__bar`; lift -1px en `.list-item:hover`. |
| `styles/components/forms.css` | Keyframes `check-pop` (overshoot 1.15) + clase `.icon--pop`. |
| `styles/components/domain.css` | `.cal-detail__badge-abono` con animación check-pop (pop al marcar pagado en agenda). |
| `modules/dominio/{metas,apartados,personales}/view.js` | Checkmarks de completado con clase `icon--pop`. |
| `eslint.config.js` | Globals `cancelAnimationFrame` y `performance` (usados desde V.4, faltaban). |
| `service-worker.js` | v149 → v150; `animate.js` en CORE_ASSETS. |

---

> Para tareas anteriores, ver [`docs/CHANGELOG.md`](CHANGELOG.md).

---

> Para tareas anteriores (motor recomendación deudas, tasa opcional, motor distribución ingresos, Apartados Fase 1, ADR 005), ver [`docs/CHANGELOG.md`](CHANGELOG.md).

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
