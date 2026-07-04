# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-03 (feat(ui): EP.7a, banner de propósito con divulgación progresiva)

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

### chore(tesoreria): MC.12, renombrar "Ingreso" a "Ingresos fijos" · 2026-07-03

Copy solamente: la sección "Mis ingresos" en Mis cuentas ahora se llama "Mis ingresos fijos" para dejar claro que registra ingresos recurrentes (salario, honorarios periódicos, pensión). Cambio en botón, modal, diálogos y mensajes; sin cambios en IDs internos ni lógica. Verificado en preview. 1887/1887 unit verdes, sin regresiones.

| Archivo | Cambio |
|---|---|
| `index.html` | Título h2, botón "+", modal title. |
| `modules/dominio/tesoreria/index.js` | Mensajes + diálogos. |

---

### fix(tesoreria): MC.7f, pulido del asistente. Épica MC.7 completa · 2026-07-03

Cierra MC.7f (opcional), sin lógica financiera nueva: copy consistente por paso (título del Paso 2 alineado con el Paso 1), un estado vacío corregido (el hint "Sugerencia: $X a ahorro..." ya no aparece si no hay ninguna fila de Ahorro donde ponerla), el indicador "Paso X de N" se omite con un solo paso, foco movido al contenedor del paso al avanzar/retroceder (`tabindex="-1"` + `role="group"`/`aria-label`, patrón WAI-ARIA APG para asistentes multi-paso, sin robar el foco en la apertura inicial) y una transición de fade corta bajo `prefers-reduced-motion: no-preference`.

Verificado con 3 E2E nuevos (foco al avanzar/retroceder y preservado en apertura inicial; indicador ausente con un paso; hint de ahorro ausente sin fila de Ahorro) y las 19 pruebas existentes de "Distribuir mi ingreso" sin regresiones. 1887/1887 unit sin cambios; 114/114 → 117/117 E2E. Lint limpio. SW v271 → v272. **Épica MC.7 completa (MC.7a a MC.7f).**

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/view.js` | Título del Paso 2; hint de ahorro condicionado; indicador omitido con un paso; `tabindex="-1"` en cada paso. |
| `modules/dominio/tesoreria/index.js` | `_irAPasoDistribucion` gana `{ moverFoco }`; mueve el foco al contenedor del paso al navegar. |
| `styles/components/forms.css` | Transición `distribuir-paso-in`; `.distribuir__paso:focus { outline: none }`. |
| `tests/e2e/smoke.test.js` | 3 tests nuevos. |
| `service-worker.js` | v271 → v272. |

---

### feat(tesoreria): MC.7e, Paso 3 reparte Estilo de vida entre cuentas · 2026-07-03

Cierra MC.7e (ADR 018 decisión 4), última tarjeta de prioridad alta de la épica MC.7. Con 2+ cuentas activas, el paso final "Estilo de vida" del asistente gana un reparto opcional: filas toggle+monto por cuenta (mismo patrón del resto del panel), **sin marcar nada por defecto** (el remanente completo sigue en la cuenta de origen salvo que el usuario mueva algo explícitamente). Diseño así de conservador porque la cuenta de origen solo se resuelve al confirmar (R2 del ADR); una fila que termine apuntando a la propia cuenta de origen es un no-op. Con una sola cuenta el paso sigue siendo informativo.

Nuevo helper puro `construirFilasTransferenciaCuentas` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js). En [tesoreria/index.js](../modules/dominio/tesoreria/index.js): lectura/validación/aplicación separadas de las transferencias (excluidas del "asignado" del ingreso, ya que son redistribuciones internas); "Deshacer" las revierte gratis porque `cuentas` ya estaba en el snapshot. Al verificar se corrigieron dos guards: "Distribuir" exigía `asignado > 0` y bloqueaba una distribución que solo transfiere entre cuentas; y el guard de contenido vacío del panel no consideraba que 2+ cuentas ya ameritan mostrar el asistente.

Verificado con 4 unit nuevos + 5 E2E nuevos (sin filas con 1 cuenta; nada marcado por defecto con 2+; bloqueo si excede el presupuesto de Estilo de vida; confirmar mueve saldo correctamente; Deshacer revierte). Verificación visual en el preview (móvil). 1883/1883 → 1887/1887 unit; 109/109 → 114/114 E2E. Lint limpio. SW v270 → v271. **La épica MC.7 solo deja pendiente el pulido opcional MC.7f.**

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | Nuevo `construirFilasTransferenciaCuentas`. |
| `modules/dominio/tesoreria/view.js` | `_filaDistribuir` soporta tipo 'cuenta'; sección de transferencias en el paso final; guard de contenido vacío corregido. |
| `modules/dominio/tesoreria/index.js` | `_leerTransferenciasCuentas`, `_validarTransferenciasCuentas`, `_aplicarTransferenciasCuentas`; guards de habilitación corregidos. |
| `tests/unit/tesoreria.test.js`, `tests/e2e/smoke.test.js` | Tests nuevos (4 unit + 5 E2E). |
| `service-worker.js` | v270 → v271. |

---

> Para tareas anteriores (feat(tesoreria) MC.7d completo asistente paginado + R3, fix(tesoreria) BUG-007/BUG-008 copy cuota de manejo + validaciones Infinity, fix(compromisos) BUG-006 abono extra, fix(tesoreria) BUG-009 tope coordinado cuota+extra, docs(bugs) diseño BUG-009, fix(tesoreria) BUG-005 cuota de manejo, fix(tesoreria) BUG-003/BUG-004 checklist de Necesidades, feat(tesoreria) MC.7d slice 1 checklist de Necesidades, docs(revision) Mis cuentas, docs(adr) ADR 018 revisión, AG.4, AG.2, AG.7, AG.6, AG.5, MT.4, MT.5, MT.3, MT.1, IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

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
