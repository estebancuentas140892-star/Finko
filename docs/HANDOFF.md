# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-10 (Apartados Fase 1: dominio para gastos previsibles; 1296/1296 verde)

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
| Tests unitarios + integración | 1296/1296 verdes (+40: dominio Apartados) |
| Tests E2E | 57/57 verde. Suites: `smoke` 28 tests, `estrategia-pago` 8 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(apartados): nuevo dominio para gastos previsibles - Fase 1 · 2026-06-10

Sobres para separar dinero ante gastos previsibles (SOAT, impuestos, productos personales). Dominio nuevo (no extiende Metas), schema v13. Calcula cuánto apartar por periodo de cobro: "aparta $30.000 por quincena". Plantillas rápidas + hint en vivo + aporte que descuenta cuenta (patrón 0/1/varias). Ver [ADR 007](DECISIONS/007-dominio-apartados.md). SW v132 → v133. 1296/1296 verdes (+40).

| Archivo | Cambio |
|---|---|
| `modules/dominio/apartados/{logic,view,index}.js` | Dominio nuevo. `calcularAporteSugerido` es el corazón: faltante / periodos hasta la fecha. |
| `modules/core/state.js` + `storage.js` | typedef Apartado, slice `apartados`, `_version` 13, migración v12 → v13. |
| `index.html` | Ícono, sección, 2 modales, enlaces en sidebar y menú "más". |
| `modules/infra/router.js` + `ui/bootstrap.js` | Ruta y `initApartados()`. |
| `styles/components/domain.css` | Plantillas y sugerencia (solo `var(--fk-*)`). |
| `tests/unit/apartados.test.js` (37) + storage/state | Lógica pura + migración v13. |
| `docs/DECISIONS/007-dominio-apartados.md` | ADR nuevo. `service-worker.js` v132 → v133. |

**Pendiente (fases siguientes):** Fase 2 recurrencia/ciclo (SOAT anual que se reinicia); Fase 3 derivar la frecuencia de aporte desde `S.ingresos` + nudges proactivos.

---

### feat(deudas): motor de recomendación de estrategia por simulación · 2026-06-09

`recomendarEstrategia(deudas, extraMensual)` decide a partir de la simulación real de ambas estrategias, no de la dispersión de tasas. Caso que lo motivó: deuda al 10% mensual con cuota que no cubre el interés + deuda sin interés, donde el plan nunca cierra y la app igual recomendaba Avalancha. Ahora detecta planes inviables (`viable: false`), diagnostica la deuda creciente y calcula el pago extra mínimo. Ver [ADR 006](DECISIONS/006-recomendacion-deudas-por-simulacion.md). SW v131 → v132. 1256/1256 tests verdes.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic.js` | `recomendarEstrategia` reescrita (firma con `extraMensual`, retorno extendido y retrocompatible). Helpers `_diagnosticarInviabilidad` y `_calcularExtraMinimoViable` (búsqueda binaria). `filtrarDeudasPagables` marca `tasaDesconocida`. Constante `UMBRAL_AHORRO_MATERIAL`. |
| `modules/dominio/compromisos/views/estrategia.js` | Pasa `extraMensual` al motor. Banner de plan inviable + nota de tasa desconocida. |
| `modules/dominio/compromisos/views/lista.js` | "tasa por confirmar" para entidad con tasa null. |
| `styles/components/charts.css` | `.estrategia-card__alerta` (danger) y `.estrategia-card__nota` (info). |
| `tests/unit/compromisos.test.js` | Bloque `recomendarEstrategia` reescrito + tests de `tasaDesconocida`. |
| `docs/DECISIONS/006-recomendacion-deudas-por-simulacion.md` | Nuevo ADR. |
| `service-worker.js` | v131 → v132. |

---

### feat(deudas): tasa de interés opcional en deudas con entidad · 2026-06-09

La tasa EA dejó de ser obligatoria al registrar una deuda con entidad (muchas personas no la conocen). Si se omite, se guarda `tasa: null` (desconocida ≠ 0) y la app invita a consultarla. Misma sesión que el motor de recomendación.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic.js` | `validarCompromiso` no exige tasa para entidad; `normalizarCompromiso` guarda `null` si falta. |
| `modules/dominio/compromisos/views/formularios.js` | Label "(opcional)", sin `required`, hint informativo "¿No conoces tu tasa?...". |
| `tests/unit/compromisos.test.js` | Sin tasa = válido, tasa negativa = error, normalización a `null`. |

---

### feat(ingresos): motor de distribución adaptativa del ingreso (Fase 3) · 2026-06-09

Tarjeta "¿Cómo distribuir $X?" en Mis ingresos, debajo del nudge de próximo cobro. Split 50/30/20 adaptado al peso real de gastos fijos. Alertas y CTAs según contexto: fondo de emergencia, deudas, inversiones. Sin nuevo schema ni CSS. SW v130 → v131. 1235/1235 tests verdes (+14).

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `sugerirDistribucionIngreso(ingresoMensual, contexto)`: pura, 3 escenarios (<=50%, 51-70%, >70% fijos), CTAs dinámicos. |
| `modules/dominio/tesoreria/view.js` | `renderDistribucionIngreso()` + `_renderDistribucion()`. Lee S directamente sin importar otros dominios. |
| `modules/dominio/tesoreria/index.js` | Importa y llama en `_renderTodo`. EventBus extendido: ahora reacciona a `ahorro` e `inversiones`. |
| `index.html` | `<div id="ingresos-distribucion">` entre nudge y lista de ingresos. |
| `tests/unit/tesoreria.test.js` | +14 tests: split suma 100 para 8 valores de pctFijos, alertas/CTAs por contexto, coherencia de montos. |
| `service-worker.js` | `CACHE_NAME` v130 → v131. |

---

### feat(ingresos): alerta proactiva de próximo cobro en Mis ingresos (Fase 2) · 2026-06-09

Nudge "Recibes X en N días" encima de la lista de ingresos. Dos funciones puras nuevas (`diasParaProximoPago`, `detectarNudgeProximoIngreso`) + render del nudge. Solo soporta Mensual y Quincenal (ciclo exactamente derivable del diaPago). SW v129 → v130. 1221/1221 tests verdes (+20).

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `diasParaProximoPago` (Mensual/Quincenal, maneja fin de mes y rollover) + `detectarNudgeProximoIngreso` (más próximo + otros en 7 días). |
| `modules/dominio/tesoreria/view.js` | `renderNudgeProximoIngreso()`: escribe nudge en `#ingresos-nudge-proximo`. Formato: "hoy / mañana / en X días (DD mmm)". |
| `modules/dominio/tesoreria/index.js` | `renderNudgeProximoIngreso` importado y llamado en `_renderTodo`. |
| `index.html` | `<div id="ingresos-nudge-proximo">` antes de `#lista-ingresos`. |
| `tests/unit/tesoreria.test.js` | +11 tests `diasParaProximoPago` + +9 tests `detectarNudgeProximoIngreso`. |
| `service-worker.js` | `CACHE_NAME` v129 → v130. |

---

> Para tareas anteriores (diaPago schema v12, skip link WCAG, formulario dinámico de cuentas + schema v11, ADR 005), ver [`docs/CHANGELOG.md`](CHANGELOG.md).

---

## 4. Qué sigue (roadmap post-v1.0)

**Serie cerrada:** "Coaching de ingresos" (Fases 1, 2 y 3) completada el 2026-06-09. `diaPago` en ingresos + nudge de próximo cobro + tarjeta de distribución adaptativa. SW v128 → v131. 1235/1235 tests verdes.

**Mejoras de deudas (2026-06-09):** tasa de interés opcional al registrar deuda con entidad + motor de recomendación de estrategia por simulación (detecta planes inviables y calcula pago extra mínimo). SW v131 → v132. 1256/1256 verdes. Ver [ADR 006](DECISIONS/006-recomendacion-deudas-por-simulacion.md).

**Apartados (2026-06-10):** dominio nuevo para gastos previsibles, Fase 1 cerrada. SW v132 → v133. 1296/1296 verdes. Ver [ADR 007](DECISIONS/007-dominio-apartados.md).

**Próxima tarea natural:** Apartados Fase 2 (recurrencia/ciclo: un apartado como el SOAT se reinicia tras cumplirse/gastarse) y Fase 3 (derivar la frecuencia de aporte desde `S.ingresos` + nudges "tu SOAT vence en N meses, aparta $X").

**Otras opciones:**
- **A.5 - Dominio custom** deploy en dominio propio. No requiere código. Ver guía en `docs/SETUP_DOMINIO.md`.
- **E.2 - SMMLV + UVT 2027** en enero 2027 (~15 min, Haiku): búsqueda de valores oficiales y actualización de `LEGAL_POR_ANIO` en `constants.js`.

**Estado base:** App en producción estable (`https://finko-brown.vercel.app`).

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
