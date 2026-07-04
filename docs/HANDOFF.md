# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-03 (feat(ui): EP.7d, divulgación progresiva en Mis cuentas, Análisis y Me deben. Épica EP.7 completa)

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
| Tests unitarios + integración | 1887/1887 verdes |
| Tests E2E | 117/117 verde. Suites: `smoke` 81 tests, `estrategia-pago` 15 tests, `ahorro-inversion` 9 tests, `navegacion-render` 6 tests, `install-prompt` 6 tests. |
| Schema version (localStorage) | v20 |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(ui): EP.7d, divulgación progresiva en Mis cuentas, Análisis y Me deben. Épica EP.7 completa · 2026-07-03

Cierra el último slice de la revisión del ADR 016: Mis cuentas (título del empty recortado, ya no repite la pregunta gancho del banner), Análisis (subtítulo fuera, empties por sub-card revisados y conservados por ser cortos y específicos) y Me deben (empty recortado). `tieneDatos` real en los 3. 3 aserciones E2E actualizadas al nuevo título de Mis cuentas.

1885/1885 unit verdes; 117/117 E2E (3 actualizadas). Lint limpio. Verificado vía `curl` (mismo síntoma de caché stale del preview). SW v275 → v276. **Épica EP.7 completa: las 11 secciones tienen una única descripción de propósito que se oculta sola al tener datos.** Tarjeta EP.7 borrada de BOARD.md.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/*`, `modules/dominio/personales/*` | Empty states recortados; `tieneDatos` real. |
| `index.html`, `modules/dominio/analisis/index.js` | Subtítulo de Análisis fuera; `tieneDatos` real. |
| `tests/e2e/navegacion-render.test.js` | 3 aserciones actualizadas. |

---

### feat(ui): EP.7c, divulgación progresiva en Metas, Ahorro e Inversión · 2026-07-03

Aplica el patrón de EP.7a/b a los 3 dominios de "Crecer": subtítulos de Metas y Ahorro fuera de `index.html`; empty states recortados (Metas conserva en una línea la regla de contexto hacia Apartados; Ahorro ya no repite "un imprevisto se cubre con deuda" del banner); `tieneDatos` real en los 3 (Metas: `S.metas.length > 0`; Ahorro: fondo activo o algún aporte; Inversión: `S.inversiones.length > 0`).

1885/1885 unit verdes; 117/117 E2E sin regresiones; lint limpio. Verificado sirviendo el contenido real vía `curl` (mismo síntoma de caché stale del preview ya documentado). SW v274 → v275. **Solo queda EP.7d (Mis cuentas, Análisis, Me deben) para cerrar la épica EP.7.**

| Archivo | Cambio |
|---|---|
| `index.html` | Subtítulos de Metas y Ahorro fuera. |
| `modules/dominio/metas/*`, `modules/dominio/ahorro/*`, `modules/dominio/inversiones/*` | Empty states recortados; `tieneDatos` real. |

---

### feat(ui): EP.7b, divulgación progresiva en Gastos, Deudas, Calendario y Límites · 2026-07-03

Aplica el patrón de EP.7a (mecanismo `tieneDatos` ya listo) a 4 dominios más: Gastos y Deudas con empty state recortado; Calendario solo con el wiring de `tieneDatos`; Límites de gasto con el subtítulo y la nota al pie ("Mis cuentas planifica...; Límites vigila...") retirados y el copy del banner reescrito a la estructura de tres tiempos. `tieneDatos` de Deudas reusa el helper `esDeuda()` ya existente. El E2E que verificaba la nota retirada se actualizó para confirmar su ausencia.

1885/1885 unit verdes; 117/117 E2E (1 actualizado). El preview arrastró caché stale del navegador (síntoma ya documentado); se verificó el contenido real servido vía `curl` y la conducta vía la suite E2E real. SW v273 → v274.

| Archivo | Cambio |
|---|---|
| `modules/dominio/gastos/*`, `modules/dominio/compromisos/*`, `modules/dominio/agenda/index.js` | `tieneDatos` real; empty states recortados. |
| `index.html`, `modules/dominio/presupuesto/*`, `modules/ui/proposito.js` | Subtítulo y nota fuera; copy del banner de Límites reescrito. |
| `tests/e2e/smoke.test.js` | Test "MC.5e" actualizado. |

---

### feat(ui): EP.7a, banner de propósito con divulgación progresiva · 2026-07-03

Cierra EP.7a (slice piloto de la revisión del ADR 016). El banner de propósito ya no se colapsa manualmente: ahora `htmlBannerProposito`/`renderBannerProposito` reciben `tieneDatos` y el banner se oculta solo cuando la sección tiene datos. Se retiró todo el mecanismo viejo (`S.config.propositoColapsado`, data-actions `colapsar-proposito`/`expandir-proposito`, bloque "Mensajes de ayuda" de Ajustes). Piloto completo en Apartados (subtítulo fuera, empty state recortado, banner desaparece al crear el primer apartado, verificado en preview). Fix de copy incidental: "Personales" → "Me deben" en el banner. Los otros 10 dominios siguen con el banner siempre visible (sin colapso) hasta sus propios slices EP.7b-EP.7d.

1887 → 1885 unit verdes (test de proposito.js reescrito); 117/117 E2E sin regresiones. SW v272 → v273.

| Archivo | Cambio |
|---|---|
| `modules/ui/proposito.js` | Contrato nuevo con `tieneDatos`; se retira el mecanismo de colapso. |
| `modules/ui/bootstrap.js`, `modules/dominio/config/index.js`, `modules/dominio/config/view.js` | Se retiran imports/acciones/bloque huérfanos. |
| `index.html`, `modules/dominio/apartados/view.js`, `modules/dominio/apartados/index.js` | Piloto en Apartados. |

---

### docs(adr): ADR 016 revisado, divulgación progresiva (EP.7, fase de diseño) · 2026-07-03

Cierra la fase de diseño de EP.7, la única tarjeta de prioridad alta del tablero. El [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md) queda revisado con la dirección que fijó el usuario el 2026-07-02: el banner de propósito pasa a ser **la descripción única** de cada sección y **solo se muestra mientras la sección no tiene datos**. Desaparecen el colapso manual, `S.config.propositoColapsado`, las dos data-actions y el bloque "Mensajes de ayuda" de Ajustes (sin migración: la clave huérfana en localStorage es inofensiva). El empty state deja de describir y pasa a accionar (título corto + una línea + CTA); los 5 `section__subtitle` descriptivos y la nota al pie de Límites se van; los guards de formulario y las notas contextuales de datos quedan.

La revisión incluye: la tabla del criterio "tiene datos" por sección (cada dominio reusa el predicado de su empty state), el inventario texto por texto con archivo y línea aproximada (qué queda, qué se recorta, qué se va), las consecuencias y los 4 slices de implementación (EP.7a piloto: mecanismo + Apartados + Ajustes; EP.7b a EP.7d por grupos de secciones). Solo docs: sin cambios de código; tests sin cambios.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/016-banner-proposito-de-seccion.md` | Estado actualizado; notas "Revisada el 2026-07-03" en las decisiones 1, 2, 6 y 7; sección nueva "Revisión 2026-07-03" completa. |
| `docs/BOARD.md` | Tarjeta EP.7 actualizada: diseño cerrado, quedan los slices EP.7a a EP.7d. |

---

> Para tareas anteriores (chore(tesoreria) MC.12 renombrar "Ingreso" a "Ingresos fijos", fix(tesoreria) MC.7f pulido del asistente épica MC.7 completa, feat(tesoreria) MC.7e Paso 3 reparte entre cuentas, feat(tesoreria) MC.7d completo asistente paginado + R3, fix(tesoreria) BUG-007/BUG-008 copy cuota de manejo + validaciones Infinity, fix(compromisos) BUG-006 abono extra, fix(tesoreria) BUG-009 tope coordinado cuota+extra, docs(bugs) diseño BUG-009, fix(tesoreria) BUG-005 cuota de manejo, fix(tesoreria) BUG-003/BUG-004 checklist de Necesidades, feat(tesoreria) MC.7d slice 1 checklist de Necesidades, docs(revision) Mis cuentas, docs(adr) ADR 018 revisión, AG.4, AG.2, AG.7, AG.6, AG.5, MT.4, MT.5, MT.3, MT.1, IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

---

## 4. Mantenimiento y producción

**App en producción estable:** https://finko-brown.vercel.app (Lighthouse 99-100, cero deuda técnica conocida).

La lista completa y vigente de tareas de mantenimiento y features opcionales vive en [`docs/BOARD.md`](BOARD.md) (secciones "Mantenimiento" y por sección de la app). Esta sección solo guarda el procedimiento detallado de la tarea recurrente más delicada.

> **Importante para futuros desarrolladores:** Antes de instalar dependencias o configurar
> un nuevo entorno, leer [`docs/SECURITY.md`](SECURITY.md). Incluye política anti-malware npm,
> guía de migración a **pnpm** con defensas (`minimum-release-age`, `only-built-dependencies`),
> y el audit de seguridad realizado el 2026-05-18.

### Recordatorio enero 2027 - E.2-2027

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

Workflow completo (una tarea a la vez, cierre de conversación, selección de modelo) en [`/CLAUDE.md`](../CLAUDE.md) sección 2. No se duplica acá para no desincronizarse.

---

## 6. Arquitectura en una línea por capa

```
core/        → state.js (singleton S), storage.js (save debounced), constants.js (CO legales)
infra/       → utils, render, a11y, crud, router, csv, svg, notificaciones
ui/          → bootstrap (entry point), shell, actions (delegación data-action), modales, onboarding
dominio/     → agenda, ahorro, analisis, apartados, calculadoras, compromisos,
               config, export, gastos, import, inversiones, logros, metas,
               personales, presupuesto, resumen, tesoreria
```

Regla clave: **ningún dominio importa a otro** - comunicación exclusiva por `EventBus`.
Todo `logic.js` es sin DOM (testeable en Node). Todo `view.js` solo lee `S`, no lo muta.
Detalle completo en [`docs/ARCHITECTURE.md`](ARCHITECTURE.md). Cifras de tests actuales: ver sección 2 arriba.

---

## 7. Comandos rápidos

```bash
python -m http.server 8080   # Servir la app (ES6 modules requieren HTTP)
pnpm test                     # tests unitarios + integración (Vitest + happy-dom)
pnpm run test:e2e             # smoke tests Playwright
pnpm run coverage             # umbral 90% capa lógica
pnpm run lighthouse           # requiere servidor en :8080
```
