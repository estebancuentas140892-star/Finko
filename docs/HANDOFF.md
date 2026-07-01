# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-01 (fix(presupuesto): la tarjeta de Ahorro celebra en verde al superar la meta, nunca en rojo)

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
| Tests unitarios + integración | 1758/1758 verdes |
| Tests E2E | 78/78 verde. Suites: `smoke` 42 tests, `estrategia-pago` 15 tests, `ahorro-inversion` 9 tests, `navegacion-render` 6 tests, `install-prompt` 6 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### fix(presupuesto): la tarjeta de Ahorro celebra en verde al superar la meta (MC.8) · 2026-07-01

Petición del usuario: superar la meta de Ahorro se pintaba de rojo (barra danger, "Excedido" rojo), lo que transmite error cuando es un buen hábito. `_renderGrupoCard` (`presupuesto/view.js`) se hace consciente del rol para Ahorro: `pct >= 100` usa paleta positiva (verde), nunca ámbar ni rojo. Barra `progress-bar--complete` verde, estado visual nuevo `logro` (borde/fondo verdes) en vez de `excedido`, y la tercera cifra "Ahorrado de más" en verde (`is-positive`) en vez de "Excedido" rojo; no llegar aún es "Te falta" (neutro). Consolida la regla de color: verde = logros/ahorro, ámbar = advertencias, rojo = incumplimientos. Necesidades conserva su chrome (su reencuadre es MC.8b). 1 E2E nuevo. 1758/1758 unit; 77/77 → 78/78 E2E. Verificado en el navegador. SW v245 → v246.

| Archivo | Cambio |
|---|---|
| `modules/dominio/presupuesto/view.js` | `_renderGrupoCard` con paleta positiva por rol para Ahorro (estado `logro`, barra verde, cifra `is-positive`). |
| `styles/components/analysis.css` | `.grupo-card[data-estado="logro"]` + `.grupo-card__fig dd.is-positive`. |
| `tests/e2e/smoke.test.js` | 1 test nuevo (Ahorro superado en verde, nunca rojo). |
| `service-worker.js` | v245 → v246. |

---

### feat(presupuesto): mensajes de Límites por rol (MC.8a) · 2026-07-01

Primer slice de MC.8 ([ADR 019](DECISIONS/019-limites-por-rol.md)). `generarMensajesLimites` (`presupuesto/logic.js`) reencuadrada por rol: **Necesidades** deja de alertar con "límite" y, cuando su gasto supera lo asignado, emite un mensaje **informativo** (`tipo: 'info'` nuevo, "consumiendo una parte importante de tu ingreso..."); estar cerca del presupuesto ya no genera nada. **Ahorro** distingue cumplir ("Cumpliste con el ahorro que planeaste") de superar (mensaje más cálido "¡Excelente!..."). **Estilo de vida** sin cambios. Nueva `coberturaLimitesEstiloVida(presupuestos, presupuestoEV)` (la "olla finita") que devuelve `{limites, presupuesto, sinTope, excede}`; la usará MC.8b. Se ajustó el render de nudges (`_nivelNudge` + nivel `nudge-info`). Pendiente MC.8b: el chrome de las tarjetas (barra roja, "Excedido") todavía sigue el modelo simétrico de MC.5b. 6 unit netos + 1 E2E. 1752/1752 → 1758/1758 unit; 76/76 → 77/77 E2E. Verificado en el navegador. SW v244 → v245.

| Archivo | Cambio |
|---|---|
| `modules/dominio/presupuesto/logic.js` | `generarMensajesLimites` por rol; `coberturaLimitesEstiloVida` nueva. |
| `modules/dominio/presupuesto/view.js` | `_nivelNudge` + soporte del nivel `nudge-info`. |
| `tests/unit/presupuesto.test.js`, `tests/e2e/smoke.test.js` | tests actualizados + `coberturaLimitesEstiloVida` + E2E de Ahorro. |
| `service-worker.js` | v244 → v245. |

---

### docs(adr): ADR 019, Límites de gasto con tratamiento asimétrico por rol (MC.8, diseño) · 2026-07-01

Diseño de la épica MC.8, que revisa las decisiones 1, 4 y 5 del [ADR 017](DECISIONS/017-limites-centro-de-control.md) sin revertir su núcleo. Los tres grupos de Límites dejan de tratarse igual y pasan a reflejar su **rol**: (1) **Necesidades** = monitorear (sin límites, sin alarma; copy informativo tipo "usan el X% de tu ingreso", no "te pasaste"); (2) **Ahorro** = celebrar (refuerzo cálido al cumplir/superar, nunca alerta); (3) **Estilo de vida** = controlar (único con topes por categoría). Los topes se **fusionan dentro de la tarjeta de Estilo de vida** (adiós al bloque suelto), con "agregar bajo demanda" + conciencia de "olla finita" (cuánto del presupuesto cubren los límites), rechazando el 100% obligatorio. Layout desktop: Necesidades + Ahorro en 2 columnas compactas, Estilo de vida en fila completa. Decisión pragmática: todas las categorías siguen limitables (reclasificar por grupo se difiere). Sin schema nuevo. Pausa MC.7 (íbamos por MC.7d), que se retoma después. Solo docs.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/019-limites-por-rol.md` | Nuevo ADR (contexto, 6 decisiones, alternativas, consecuencias, 4 slices MC.8a-d). |
| `docs/TASKS.md` | MC.8 diseño cerrado + slices MC.8a a MC.8d; MC.7 marcado en pausa. |

---

### feat(tesoreria): desglose itemizado de Necesidades en "Distribuir mi ingreso" (MC.7c) · 2026-07-01

Tercer slice de MC.7 ([ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md), decisión 2), el Paso 1 del asistente. Nueva `construirDesgloseNecesidades(compromisos)` en `tesoreria/logic.js`: una fila por gasto fijo y por deuda activos (nombre, categoría, monto mensual), ordenadas de mayor a menor. Solo lectura: no mueve dinero ni crea schema, cada obligación se paga al vencer como hoy. El monto normaliza a mensual igual que `calcularGastosFijosMensuales` (fijo) y usa `cuotaMensual` (deuda), para coincidir con el "Necesidades" agregado que ya mostraba el panel. En la vista es un `<details>` colapsable bajo la fila de Necesidades, reusando el patrón `.analisis-grupo` con clases propias (sin acoplar Mis cuentas al markup de Límites) y emojis por categoría (reusa `CATEGORIA_AGENDA_EMOJI`/`CATEGORIA_DEUDA_EMOJI`). 11 unit + 1 E2E nuevos. 1741/1741 → 1752/1752 unit; 75/75 → 76/76 E2E. Verificado en el navegador. SW v243 → v244.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `construirDesgloseNecesidades()` nueva. |
| `modules/dominio/tesoreria/view.js` | `_renderDesgloseNecesidades()`/`_emojiNecesidad()` nuevas; insertadas en `_renderPanelDistribuir`. |
| `styles/components/forms.css` | `.distribuir__nec-desglose` + `.distribuir__nec-item*`. |
| `tests/unit/tesoreria.test.js`, `tests/e2e/smoke.test.js` | 11 unit + 1 E2E nuevos. |
| `service-worker.js` | v243 → v244. |

---

### feat(tesoreria): aporte de ahorro por objetivo en "Distribuir mi ingreso" (MC.7b) · 2026-07-01

Segundo slice de MC.7 ([ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md), decisión 3). El panel ya no arranca "todo al fondo": cada meta/apartado activo muestra su aporte sugerido (`construirDesgloseAhorroPorObjetivo`, MC.7a), y el fondo recibe el excedente. Objetivos sin fecha muestran $0 y un hint bajo su fila invitando a ponerle fecha (enlace a Metas/Apartados). `construirPlanAhorro` quedó sin llamadores y se eliminó (con sus 5 tests) en vez de dejarla muerta. La función de MC.7a ahora expone `sinFecha` por fila para que la vista sepa cuándo mostrar el hint. 3 unit + 2 E2E nuevos (neto, tras quitar los 5 de `construirPlanAhorro`). 1743/1743 → 1741/1741 unit; 73/73 → 75/75 E2E. Verificado en el navegador (meta a 6 meses con $1.200.000 de faltante → sugiere $200.000; fondo con presupuesto $600.000 → recibe $400.000 de excedente; meta sin fecha → $0 + hint). SW v242 → v243.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `construirDesgloseAhorroPorObjetivo()` expone `sinFecha`; `construirPlanAhorro()` eliminada. |
| `modules/dominio/tesoreria/view.js` | `renderDistribucionIngreso` usa el desglose por objetivo; `_filaDistribuir` agrega el hint de "sin fecha". |
| `styles/components/forms.css` | `.distribuir-ingreso__destinos .distribuir__hint`. |
| `tests/unit/tesoreria.test.js`, `tests/e2e/smoke.test.js` | 3 unit + 2 E2E nuevos; describe de `construirPlanAhorro` eliminado. |
| `service-worker.js` | v242 → v243. |

---

> Para tareas anteriores (MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md).

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
