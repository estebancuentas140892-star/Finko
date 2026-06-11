# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-11 (fix copy alerta cuota/interés en deudas; 1351/1351 verde)

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
| Tests unitarios + integración | 1351/1351 verdes (+18: fix abono parcial en Agenda) |
| Tests E2E | 57/57 verde. Suites: `smoke` 28 tests, `estrategia-pago` 8 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### fix(compromisos): mensajes de alerta "cuota no cubre intereses" reescritos · 2026-06-11

Reemplazados los mensajes técnicos del diálogo de confirmación al registrar una deuda cuya cuota no alcanza para cubrir los intereses. El texto anterior producía "la deuda crece $0" en el caso de empate exacto, que no significaba nada para el usuario. Ahora hay dos mensajes claros según el caso: cuota = interés (saldo se queda igual) y cuota < interés (saldo crece cada mes). Cada mensaje incluye los montos relevantes y dice cuánto hay que pagar como mínimo.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/index.js` | Dos mensajes: `deficit === 0` ("La cuota solo cubre los intereses") y `deficit > 0` ("La cuota no alcanza para cubrir los intereses") con montos concretos y acción recomendada. |

---

### fix(agenda): abono parcial no marca la cuota como pagada · 2026-06-10

El badge "Ya pagaste este mes" en la Agenda ahora distingue tres estados: sin pago, abono parcial (ámbar: "Abonado $X de $Y este mes") y cuota cubierta (verde: "✓ Ya pagaste este mes"). Antes, cualquier gasto vinculado a una deuda ese mes activaba el badge verde sin revisar el monto. La lógica es pura y testeable.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic.js` | `calcularAbonosDelMes` y `estadoPagoMes` (nueva lógica pura; fijos = cualquier pago completo; deudas = suma vs cuotaMensual). |
| `modules/dominio/agenda/view.js` | `_renderDetalleItem` usa `estadoPagoMes`; badge parcial con clase `--parcial`. |
| `styles/components/domain.css` | `.cal-detail__badge-abono--parcial` con `--fk-warning-text`. |
| `tests/unit/compromisos.test.js` | +18 tests para `calcularAbonosDelMes` y `estadoPagoMes`. |
| `service-worker.js` | v135 → v136. |

---

### feat(apartados): frecuencia automática + nudge de proximidad - Fase 3 · 2026-06-10

Al abrir "Nuevo apartado", la frecuencia de aporte se pre-selecciona según los ingresos activos del usuario. El modal ya abre con "Quincenal" marcado si el usuario cobra quincenal, sin tocar nada. Si no hay ingresos, cae a "Mensual". Cuando hay apartados que vencen en 60 días, un nudge en la sección avisa: "SOAT vence en 30 días · Aparta $X por quincena." ADN #10 respetado (logic.js recibe `ingresos` como parámetro; view.js lee S directamente). SW v134 → v135. 1333/1333 verdes (+13).

| Archivo | Cambio |
|---|---|
| `modules/dominio/apartados/logic.js` | `frecuenciaPrincipalIngresos(ingresos)`: moda de frecuencias activas → FRECUENCIAS_APORTE. `apartadosProximos(apartados, hoyISO, umbral)`: filtra y ordena por urgencia. |
| `modules/dominio/apartados/view.js` | `renderFormApartado(frecuenciaPreferida)`: pre-selecciona la opción. `renderNudgeApartadosProximos()`: nudge informativo con el más urgente y recuento de otros. |
| `modules/dominio/apartados/index.js` | `_nuevoApartado` re-inyecta el form para leer `S.ingresos` actualizado; nudge en pipeline de render. |
| `index.html` | `#apartados-nudge-proximos` antes de `#lista-apartados`. `service-worker.js` v134 → v135. |
| `tests/unit/apartados.test.js` (+13) | 6 para `frecuenciaPrincipalIngresos`, 7 para `apartadosProximos`. |

---

### feat(apartados): recurrencia y ciclo automático - Fase 2 · 2026-06-10

Un apartado para un gasto que se repite (SOAT anual, impuestos) se reinicia para el próximo periodo en vez de recrearse a mano. Schema v14. Al marcar "Se repite" + periodo, cuando reúne el dinero queda "✅ ¡Listo!" con botón "Ya lo usé": `reiniciarCiclo` vacía el monto (conserva excedente), avanza la fecha al siguiente vencimiento y vuelve a en progreso. SW v133 → v134. 1320/1320 verdes (+24).

| Archivo | Cambio |
|---|---|
| `modules/dominio/apartados/logic.js` | `reiniciarCiclo`, `avanzarMeses`, `estaListoParaReiniciar`, `etiquetaPeriodoMeses`, `PERIODOS_RECURRENCIA`. |
| `modules/dominio/apartados/{view,index}.js` | Checkbox "Se repite" + select (toggle); badge "¡Listo!" + botón "Ya lo usé". |
| `modules/core/{state,storage}.js` | `recurrente`/`periodoMeses`, `_version` 14, migración v13 → v14. |

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

> Para tareas anteriores (tasa opcional en deudas, motor distribución ingresos, Apartados Fase 1, alerta próximo cobro, ADR 005), ver [`docs/CHANGELOG.md`](CHANGELOG.md).

---

## 4. Estado de finalización (v1.0 + post-v1.0)

**🎯 Hito: todas las series pendientes completadas.**

- ✅ **"Coaching de ingresos"** (Fases 1, 2, 3): diaPago + nudge de próximo cobro + distribución adaptativa. SW v128 → v131. 1235/1235 verdes. 2026-06-09.
- ✅ **"Mejoras de deudas"**: tasa opcional + motor de recomendación por simulación. SW v131 → v132. 1256/1256 verdes. Ver [ADR 006](DECISIONS/006-recomendacion-deudas-por-simulacion.md). 2026-06-09.
- ✅ **"Apartados"** (Fases 1, 2, 3): CRUD + recurrencia/ciclo + frecuencia automática + nudge de proximidad. SW v132 → v135. 1333/1333 verdes. Ver [ADR 007](DECISIONS/007-dominio-apartados.md). 2026-06-10.
- ✅ **fix(agenda) abono parcial**: badge de Agenda distingue abono parcial de cuota cubierta. SW v135 → v136. 1351/1351 verdes. 2026-06-10.

**Tareas opcionales / futuras:**
- **E.2-2027** — Enero 2027: actualizar SMMLV/UVT a valores 2027 cuando se publiquen oficialmente (Haiku, ~15 min).
- **E.5** — Agregar IPC como constante anual si se quiere mostrar inflación observada (Haiku, Bajo).
- **A.5** — Setup de dominio custom cuando el usuario tenga URL registrada. No requiere código. Guía lista en `docs/SETUP_DOMINIO.md`.

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
