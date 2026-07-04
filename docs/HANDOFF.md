# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-04 (feat(gastos): TX.3, categorías Café y Gastos hormiga)

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
| Tests unitarios + integración | 2008/2008 verdes |
| Tests E2E | 128/128 verde. Suites: `smoke` 82 tests, `estrategia-pago` 15 tests, `ahorro-inversion` 9 tests, `navegacion-render` 6 tests, `install-prompt` 6 tests, `a11y-forms` 6 tests, `reflow-320` 4 tests. |
| Schema version (localStorage) | v21 |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(gastos): TX.3, categorías Café y Gastos hormiga · 2026-07-04

Café ☕ y Gastos hormiga 🐜 entran al catálogo de gastos (form, envelopes de Límites, dona de Análisis). Sin migración. Guardarraíl: toda categoría con emoji propio. 2008/2008 unit (+3); 128/128 E2E. SW v292 → v293.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | Categorías + emojis nuevos. |

---

### feat(logros): LG.1b, vitrina de logros en Ajustes · 2026-07-04

Card "🏆 Logros" al final de Ajustes ([ADR 022](DECISIONS/022-vitrina-de-logros-en-ajustes.md)): conseguidos con su descripción, pendientes con hint de cómo desbloquearlos, barra de progreso en los de conteo. `logros/view.js` nuevo renderiza en `#panel-logros` del shell (config no puede importar logros, ADN #10). Catálogo con `hint` + `progreso` opcional; `estadoLogros` pura. 2005/2005 unit (+11); 128/128 E2E. SW v291 → v292.

| Archivo | Cambio |
|---|---|
| `modules/dominio/logros/*`, `index.html` | Vitrina + contenedor del shell. |
| `docs/DECISIONS/022-...md` | ADR nuevo. |

---

### feat(agenda): AP.4, MT.2 y AH.4, recordatorio de día de ingreso · 2026-07-04

Un solo modelo para las tres épicas ([ADR 021](DECISIONS/021-recordatorio-dia-de-ingreso.md)): el día de pago de cada ingreso activo aparece en Calendario (dot verde, monto, recordatorio de apartar) con CTA "Distribuir →" que abre el asistente de Mis cuentas vía EventBus. Sin eventos por vehículo ni réplica del motor: los montos sugeridos viven solo en el asistente. 1994/1994 unit (+11); 128/128 E2E (+1, flujo completo). SW v290 → v291.

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/*`, `modules/dominio/tesoreria/index.js` | Evento de ingreso + apertura del asistente. |
| `docs/DECISIONS/021-...md` | ADR nuevo. |

---

### feat(ahorro): AH.3 y AUD.6, ADR 020 fondo como marcador de liquidez + hint · 2026-07-04

Decisión de fondo ([ADR 020](DECISIONS/020-fondo-marcador-de-liquidez.md)): el aporte al fondo NO pide cuenta ni descuenta saldo; el fondo es liquidez etiquetada, no gasto comprometido (se rechaza la variante AP.1 de AH.3: sin flujo de salida y sin migración posible). AUD.6 implementada: hint del modelo en la card y en el form de aporte. AH.4 pierde su dependencia de AH.3. 1983/1983 unit; 127/127 E2E. SW v289 → v290.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/020-...md`, `modules/dominio/ahorro/view.js` | ADR nuevo; hints del modelo. |

---

### feat(ahorro): AH.2, aporte recomendado del fondo explicado con datos reales · 2026-07-04

El modal del compromiso mensual muestra un aporte sugerido con datos reales (ingresos, fijos, cuotas, otras metas con fecha) y su explicación, alineado con el motor de distribución (ADR 013: horizonte 12 meses, pisos 10/5, déficit honesto). Sin ingresos registrados pide el promedio y recalcula en vivo; botón "Usar este monto". 1983/1983 unit (+9); 127/127 E2E. SW v288 → v289.

| Archivo | Cambio |
|---|---|
| `modules/dominio/ahorro/*` | `calcularAporteSugerido`, caja explicativa, wiring en vivo. |

---

> Para tareas anteriores (feat(personales) PE.1 tasa de interés opcional y reparto capital/interés, feat(tesoreria) MC.10 y MC.11 piso de ahorro y detección de déficit real, feat(compromisos) D.10 y D.13 categorías de relación para deuda personal y Fiado, feat(presupuesto) MC.8d pulido de Límites con iconos por categoría, test(rwd) RWD.1 verificación de reflow real a 320px en E2E, feat(presupuesto) MC.8c layout de dos columnas en Límites, feat(compromisos) D.12 aviso de tasa desconocida por deuda en la lista, feat(compromisos) D.11 la recomendación nombra la única deuda con interés, fix(ahorro) AH.1 hint del objetivo del fondo explicado, feat(logros) LG.1a toast de logros más legible, feat(personales) PE.2 a PE.5 estados de seguimiento humanizados en Me deben, style(a11y) COL.1 y COL.2 contraste de warning y texto deshabilitado, test(a11y) A11Y.5 pase axe sobre formularios dinámicos en E2E, feat(gastos) TX.6 y TX.7 el gasto hereda el ícono de su compromiso de origen, feat(ui) EP.7d divulgación progresiva Mis cuentas/Análisis/Me deben con la épica EP.7 completa, feat(ui) EP.7c divulgación progresiva Metas/Ahorro/Inversión, feat(ui) EP.7b divulgación progresiva Gastos/Deudas/Calendario/Límites, feat(ui) EP.7a banner con divulgación progresiva, docs(adr) ADR 016 revisado divulgación progresiva, chore(tesoreria) MC.12 renombrar "Ingreso" a "Ingresos fijos", fix(tesoreria) MC.7f pulido del asistente épica MC.7 completa, feat(tesoreria) MC.7e Paso 3 reparte entre cuentas, feat(tesoreria) MC.7d completo asistente paginado + R3, fix(tesoreria) BUG-007/BUG-008 copy cuota de manejo + validaciones Infinity, fix(compromisos) BUG-006 abono extra, fix(tesoreria) BUG-009 tope coordinado cuota+extra, docs(bugs) diseño BUG-009, fix(tesoreria) BUG-005 cuota de manejo, fix(tesoreria) BUG-003/BUG-004 checklist de Necesidades, feat(tesoreria) MC.7d slice 1 checklist de Necesidades, docs(revision) Mis cuentas, docs(adr) ADR 018 revisión, AG.4, AG.2, AG.7, AG.6, AG.5, MT.4, MT.5, MT.3, MT.1, IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

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
