# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-03 (feat(compromisos): D.11, la recomendación nombra cuándo la deuda a atacar es la única con interés)

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
| Tests unitarios + integración | 1917/1917 verdes |
| Tests E2E | 123/123 verde. Suites: `smoke` 81 tests, `estrategia-pago` 15 tests, `ahorro-inversion` 9 tests, `navegacion-render` 6 tests, `install-prompt` 6 tests, `a11y-forms` 6 tests. |
| Schema version (localStorage) | v20 |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(compromisos): D.11, la recomendación nombra cuándo la deuda a atacar es la única con interés · 2026-07-03

En `recomendarEstrategia`: con una sola deuda con tasa > 0, la razón de Avalancha la nombra y dice que pagarla primero elimina (no reduce) el costo de intereses; si esa deuda es además la más chica, la razón de Bola de nieve suma ese hecho. 1917/1917 unit (+3); 123/123 E2E. SW v281 → v282.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic.js` | Razones específicas para única deuda con interés. |

---

### fix(ahorro): AH.1, el hint del objetivo del fondo explica de dónde sale el número · 2026-07-03

Copy del preview en `renderFormFondo`: el "$160.000 de gastos fijos al mes" ahora se explica como "lo que suman al mes tus gastos fijos de Calendario (arriendo, servicios, cuotas...)". 1914/1914 unit; 123/123 E2E. SW v280 → v281.

| Archivo | Cambio |
|---|---|
| `modules/dominio/ahorro/view.js` | Copy del preview del objetivo. |

---

### feat(logros): LG.1a, toast de logros más legible · 2026-07-03

Duración 2.5s → 5s; hover pausa el autocierre; botón ✕ de cierre manual (focusable). El toast pasa a `pointer-events: auto` y los toasts encadenados por timer se reemplazan por una cola de uno a la vez. 1914/1914 unit; 123/123 E2E (no intercepta ningún flujo). SW v279 → v280.

| Archivo | Cambio |
|---|---|
| `modules/dominio/logros/index.js` | Duración, pausa por hover, cierre, cola. |
| `styles/components/nudges.css` | Toast interactivo; estilos de la ✕. |

---

### feat(personales): PE.2 a PE.5, estados de seguimiento humanizados en Me deben · 2026-07-03

Un solo pase para las 4 tarjetas (mismo chip de estado). Nuevo `tiempoRelativo(dias)` en `infra/utils.js` ("hace 5 años" en vez de "1.825 días", reusable). Nuevos `estadoPrestamo()` y `labelEstado()` en `personales/logic.js`: copy de seguimiento por `fechaLimite` ("Próximo pago en 5 días", "Pago programado para hoy", "La fecha de pago pasó hace 2 meses") y estado tras abono ("Recibiste un abono hoy", "Último abono hace 15 días"). "Te han devuelto" en verde. 1914/1914 unit (+22); 123/123 E2E. SW v278 → v279.

| Archivo | Cambio |
|---|---|
| `modules/infra/utils.js` | Nuevo `tiempoRelativo`. |
| `modules/dominio/personales/logic.js`, `view.js` | Estado + copy del chip; verde en el resumen. |

---

### style(a11y): COL.1 y COL.2, contraste de warning en claro y texto deshabilitado · 2026-07-03

Un solo pase para ambas tarjetas (mismos archivos de tokens). COL.1: `--fk-warning` claro `#a06800` → `#8a5a00` (4.38:1 → 5.5:1, AA texto normal); el oscuro no se toca. COL.2: `--fk-text-disabled` sube un punto en ambos temas (oscuro → `#565d72` 2.9:1, claro → `#8f94ac` 2.8:1) sin dejar de verse inactivo. 1892/1892 unit; 123/123 E2E (axe con `color-contrast` real valida COL.1). SW v277 → v278.

| Archivo | Cambio |
|---|---|
| `styles/themes.css`, `styles/tokens.css` | Tokens de warning claro y disabled ajustados. |

---

> Para tareas anteriores (test(a11y) A11Y.5 pase axe sobre formularios dinámicos en E2E, feat(gastos) TX.6 y TX.7 el gasto hereda el ícono de su compromiso de origen, feat(ui) EP.7d divulgación progresiva Mis cuentas/Análisis/Me deben con la épica EP.7 completa, feat(ui) EP.7c divulgación progresiva Metas/Ahorro/Inversión, feat(ui) EP.7b divulgación progresiva Gastos/Deudas/Calendario/Límites, feat(ui) EP.7a banner con divulgación progresiva, docs(adr) ADR 016 revisado divulgación progresiva, chore(tesoreria) MC.12 renombrar "Ingreso" a "Ingresos fijos", fix(tesoreria) MC.7f pulido del asistente épica MC.7 completa, feat(tesoreria) MC.7e Paso 3 reparte entre cuentas, feat(tesoreria) MC.7d completo asistente paginado + R3, fix(tesoreria) BUG-007/BUG-008 copy cuota de manejo + validaciones Infinity, fix(compromisos) BUG-006 abono extra, fix(tesoreria) BUG-009 tope coordinado cuota+extra, docs(bugs) diseño BUG-009, fix(tesoreria) BUG-005 cuota de manejo, fix(tesoreria) BUG-003/BUG-004 checklist de Necesidades, feat(tesoreria) MC.7d slice 1 checklist de Necesidades, docs(revision) Mis cuentas, docs(adr) ADR 018 revisión, AG.4, AG.2, AG.7, AG.6, AG.5, MT.4, MT.5, MT.3, MT.1, IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

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
