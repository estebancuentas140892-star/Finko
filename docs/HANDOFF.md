# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-02 (feat(inicio): totales al pie de prioridades y vencidos, IN.1)

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
| Tests unitarios + integración | 1774/1774 verdes |
| Tests E2E | 81/81 verde. Suites: `smoke` 45 tests, `estrategia-pago` 15 tests, `ahorro-inversion` 9 tests, `navegacion-render` 6 tests, `install-prompt` 6 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(inicio): totales al pie de "Próximas prioridades" y "Pendientes del mes" (IN.1) · 2026-07-02

Los dos paneles del dashboard no sumaban sus listas: el usuario tenía que sumar a mano cuánto necesitaba para cubrir lo vencido o lo que viene en 7 días. Nueva `sumarMontos(items)` pura en [compromisos/logic.js](../modules/dominio/compromisos/logic.js) (mismo criterio `monto ?? cuotaMensual` de AUD.1), consumida por ambos paneles en [dashboard.js](../modules/dominio/compromisos/views/dashboard.js): "Total de gastos vencidos" y "Total de próximas prioridades" (este último solo cuando hay algo que mostrar, no en el estado "Todo al día"). El preview del entorno sirvió JS viejo por caché HTTP agresiva (ver nota en memoria del proyecto); verificado en su lugar con tests de render sobre happy-dom, que ejecutan el código de producción real. 6 tests nuevos. 1770/1770 → 1774/1774 unit. SW v253 → v254.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic.js` | Nueva `sumarMontos(items)`. |
| `modules/dominio/compromisos/views/dashboard.js` | Total al pie en ambos paneles. |
| `styles/components/domain.css` | `.vencidos-card__total`, `.prioridades-card__total`. |
| `tests/unit/compromisos.test.js` | 6 tests (4 lógica + 2 render). |
| `service-worker.js` | v253 → v254. |

---

### fix(inicio): la categoría con mayor gasto ya no cuenta fijos ni deudas (IN.3) · 2026-07-02

El indicador "Categoría con más gasto" del resumen semanal de Inicio ([resumen/logic.js](../modules/dominio/resumen/logic.js)) sumaba todos los gastos de la semana, incluidos los generados automáticamente por un fijo o un abono a deuda (`compromisoId`). Con un arriendo de $900.000 y un mercado de $50.000 mostraba "Vivienda" en vez de "Alimentación", el hábito real. `categoriaTopSemana` ahora excluye los gastos con `compromisoId`, coherente con la distinción que TX.6/TX.7 ya hacen en Gastos. Las demás cifras del resumen (total 7 días, comparación, registros, días activos) no cambian, siguen midiendo actividad total. 2 tests de regresión. 1764/1764 → 1766/1766 unit. Verificado en el navegador con datos sembrados. SW v252 → v253.

| Archivo | Cambio |
|---|---|
| `modules/dominio/resumen/logic.js` | `categoriaTopSemana` descarta gastos con `compromisoId`. |
| `tests/unit/resumen.test.js` | 2 tests de regresión. |
| `service-worker.js` | v252 → v253. |

---

### fix(ux): descubribilidad y robustez, sidebar/toasts/flush de guardado (AUD.5) · 2026-07-02

Quinto slice de la auditoría integral del 2026-07-02, tres ajustes independientes. (1) **Sidebar con pliegue**: en ventanas de altura <= 800px (solo escritorio, `min-width: 1024px`) el último grupo del sidebar (Herramientas) queda bajo el scroll interno sin ningún indicio visual; [styles/layout.css](../styles/layout.css) compacta el espaciado vertical de los `.nav-group` y agrega un fade `position: sticky` pegado al fondo del `.sidebar__nav` que insinúa que hay más para desplazar. (2) **Tormenta de toasts de logros**: al desbloquearse 3 o más logros a la vez (restaurar un respaldo JSON, importar un CSV) se encadenaba un toast con confetti cada 1.4s que tapaba contenido; [logros/index.js](../modules/dominio/logros/index.js) ahora muestra un solo toast resumen ("N logros nuevos") cuando `nuevos.length > 2`, reusando `_mostrarToast` con un label configurable. Verificado con un script Playwright temporal (no comiteado): 6 logros desbloqueados a la vez → 1 solo toast. (3) **`save()` sin flush al cerrar**: el debounce de 200ms podía perder el último cambio si la pestaña se cerraba o el sistema mataba la PWA en móvil antes de que corriera; nueva `initFlushOnHide()` en [core/storage.js](../modules/core/storage.js) escucha `visibilitychange` (hidden) y `pagehide`, y fuerza el flush solo si hay un guardado pendiente. Registrada en [ui/bootstrap.js](../modules/ui/bootstrap.js) justo después de `loadData()`. Sin tests nuevos (cambios de CSS/UX sin lógica pura nueva que testear en happy-dom; el toast de logros ya está fuera del alcance de tests unitarios por decisión previa del proyecto, ver comentario en `tests/unit/logros.test.js`). 1764/1764 unit + 81/81 E2E verdes. SW v251 → v252.

| Archivo | Cambio |
|---|---|
| `styles/layout.css` | Media query `(max-height: 800px) and (min-width: 1024px)`: espaciado compacto de `.nav-group` + fade sticky al fondo de `.sidebar__nav`. |
| `modules/dominio/logros/index.js` | `_checkYMostrar` muestra un solo toast resumen si `nuevos.length > 2`; `_mostrarToast` acepta un `label` opcional. |
| `modules/core/storage.js` | Nueva `initFlushOnHide()`: flush inmediato en `visibilitychange`/`pagehide` si hay guardado pendiente. |
| `modules/ui/bootstrap.js` | Registra `initFlushOnHide()` justo después de `loadData()`. |
| `service-worker.js` | v251 → v252. |

---

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

> Para tareas anteriores (AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

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
