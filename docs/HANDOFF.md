# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-27 (style personales: card de resumen "Me deben" rediseñada con resumen-card__*)

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

### feat(presupuesto): alertas de límites de gasto en el dashboard · 2026-06-27

Nuevo bento panel `#panel-limites`: aparece en el dashboard solo cuando hay envelopes en alerta (>=75%) o excedido (>100%) en el mes actual. Badge rojo = excedido, naranja = alerta. Oculto si todo está en 'ok'. `alertasLimites()` en logic.js, `renderPanelLimites()` en view.js; ambos registrados en index.js. SW v162 → v163. Tests 1407/1407.

| Archivo | Cambio |
|---|---|
| `modules/dominio/presupuesto/logic.js` | Nueva `alertasLimites()`: filtra y ordena envelopes en alerta/excedido. |
| `modules/dominio/presupuesto/view.js` | Nueva `renderPanelLimites()`: panel HTML con badges de estado. |
| `modules/dominio/presupuesto/index.js` | Registra el panel en `registrarRender`, EventBus y hashchange. |
| `index.html` | `<div id="panel-limites">` bento full-width antes del panel-resumen. |
| `styles/components/domain.css` | 9 reglas `.limites-card*` con badges danger/warning. |
| `service-worker.js` | v162 → v163. |

---

### style(metas): microcopy motivacional al crear una meta · 2026-06-27

Form de nueva meta ahora tiene: (1) párrafo intro "Escribe lo que quieres lograr..." antes de los campos, (2) hint bajo "Fecha límite" explicando el cálculo de ahorro diario, (3) placeholder del nombre con ejemplos variados. SW v161 → v162.

| Archivo | Cambio |
|---|---|
| `modules/dominio/metas/view.js` | `renderFormMeta`: intro + hint en fecha + placeholder mejorado. |
| `service-worker.js` | v161 → v162. |

---

### style(ui): iconos emoji en selectores de categoría · 2026-06-27

`CATEGORIA_EMOJI` (mapa centralizado en `constants.js`) añade un emoji a cada una de las 11 categorías de gasto. Se usa en: opciones del `<select>` en el form de gasto, opciones del form de Límites de gasto, chips de filtro en la vista de Gastos y subtítulo de cada ítem de gasto. Los valores almacenados y `data-cat` no cambian. SW v160 → v161. Tests 1407/1407 verdes.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | Nuevo export `CATEGORIA_EMOJI` con 11 entradas. |
| `modules/dominio/gastos/view.js` | Emojis en catOpts, chips de filtro y subtítulo de ítem. |
| `modules/dominio/presupuesto/view.js` | Emojis en opciones del form de Límites. |
| `service-worker.js` | v160 → v161. |

---

### style(gastos): renombrar "Anotar un gasto" a "Gasto rápido" · 2026-06-27

Botón de acceso rápido en dashboard renombrado de "Anotar un gasto" a "Gasto rápido". Actualizado: title, aria-label, desc del botón. Tip del empty-state en Gastos también alineado al nuevo nombre. SW v159 → v160.

| Archivo | Cambio |
|---|---|
| `index.html` | title, aria-label y desc del botón quick-add actualizados. |
| `modules/dominio/gastos/view.js` | Tip de empty-state apunta a "Gasto rápido". |
| `service-worker.js` | v159 → v160. |

---

### style(personales): card de resumen "Me deben" rediseñada · 2026-06-27

El resumen de totales (visible con 2+ préstamos) no tenia CSS: las clases `.personales-resumen__*` existian en el HTML pero eran texto plano. Fix: reescribir `_renderResumen` para reutilizar `.resumen-card__grid/stat/label/value` y atoms `.progress`. Solo 3 reglas CSS nuevas para el wrapper y el footer. "Pendiente" destacado en verde acento. SW v158 → v159.

| Archivo | Cambio |
|---|---|
| `modules/dominio/personales/view.js` | `_renderResumen` usa clases `resumen-card__*` y atoms `.progress`. |
| `styles/components/domain.css` | 3 reglas: `.personales-resumen`, `.personales-resumen__footer`, `.personales-resumen__hint`. |
| `service-worker.js` | v158 → v159. |

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
