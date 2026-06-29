# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-29 (fix(compromisos): impacto de simulación sin cifras absurdas, D.1)

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
| Tests unitarios + integración | 1568/1568 verdes |
| Tests E2E | 57/57 verde. Suites: `smoke` 28 tests, `estrategia-pago` 8 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### docs(deudas): ADR 011 revisado, replanteada la jerarquía de la simulación (D.2) · 2026-06-29

Tarea de diseño (sin código). El usuario observó que el pago extra mensual aparece como protagonista arriba de la card de Deudas, antes de elegir estrategia. Se revisó [ADR 011](DECISIONS/011-unificacion-simulador-deudas.md) para **sustituir el slice S1**: el eje principal vuelve a ser elegir **Avalancha vs Bola de nieve** (sube al tope), y el pago extra pasa a ser **contextual**: acelerador plegable ("¿Puedes pagar más rápido?", colapsado bajo el detalle) cuando el plan es viable, y **primer remedio** dentro del bloque "Tu plan no se sostiene" cuando Finko detecta deudas que crecen. Renegociar y consolidar quedan como las otras dos salidas del bloque inviable (texto hasta D.3). Decisiones cerradas con el usuario: alcance = solo ADR + slices; el pago extra se conserva como acelerador plegable en planes viables (no se elimina). Implementación dividida en D.2a (reordenar + acelerador plegable) y D.2b (remedio en plan inviable), ambas sin lógica nueva. Sin tests ni SW bump (no se tocó código).

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/011-unificacion-simulador-deudas.md` | Sección "Revisión D.2": nueva jerarquía, S1 sustituido, slices D.2a/D.2b. |

---

### fix(compromisos): el impacto de la simulación no muestra cifras absurdas con planes inviables (D.1) · 2026-06-29

El resumen "Impacto de tu pago extra" mostraba "terminas 49 años antes y ahorras $6e29" cuando la cuota no cubre los intereses. Raíz: con un plan base inviable, `simularEstrategiaPago` diverge (saldo crece, `interesesTotales` explota, meses topa en 600) y los renderers restaban contra esa base. Fix en los 3 puntos de fuga de `estrategia-impacto.js`, todos por `completo === false`: `renderResumenExtra` (mensaje honesto "sin el extra no se paga" en vez de restar), `renderImpactoAvalancha` ("No se termina de pagar" en vez del total divergente) y `_renderComparativa` (no compara si alguna estrategia no completa). Sin tocar la lógica de simulación. Primer ítem del backlog "Visión de Deudas". Verificado: 4 tests de regresión nuevos (1568 total) con la simulación real, lint limpio, 57/57 E2E. SW v214 → v215.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/views/estrategia-impacto.js` | Guardas por `completo` en `renderResumenExtra`, `renderImpactoAvalancha`, `_renderComparativa`. |
| `tests/unit/compromisos.test.js` | 4 tests de regresión de impacto con plan inviable. |
| `service-worker.js` | v214 → v215. |

---

### feat(apartados): plantillas de gasto previsible ampliadas (AP.2) · 2026-06-29

`PLANTILLAS_APARTADO` pasó de 9 a 15: se agregaron 📋 Revisión técnico-mecánica, 🏛️ Impuesto predial, 🎓 Matrícula o semestre, 🪪 Renovación de documentos, 🐾 Alimento para mascotas, 🐱 Arena para gatos. "Impuestos" se conserva como genérico (vehículo) sin duplicarse con "Impuesto predial" (vivienda). Catálogo reordenado por afinidad (vehículo, impuestos/vivienda, mascotas, educación, regalos/vacaciones). Cambio puramente de datos, sin schema ni migración. Verificado: 2 tests nuevos (1564 total), lint limpio, 57/57 E2E. SW v213 → v214.

| Archivo | Cambio |
|---|---|
| `modules/dominio/apartados/logic.js` | `PLANTILLAS_APARTADO` de 9 a 15 entradas, reordenada. |
| `tests/unit/apartados.test.js` | 2 tests nuevos. |
| `service-worker.js` | v213 → v214. |

---

### feat(apartados): formulario de aporte con selector de tarjetas y reparto multi-cuenta (AP.1) · 2026-06-29

El aporte a un apartado usaba un `<select>` de texto plano sin logo del banco y sin opción de completar desde otra cuenta. Se unificó al **selector de tarjetas compartido** (Gastos/Abono/Pago): `renderSelectorCuenta` (avatar de la entidad + radios `name="cuentaId"`) en el form y `resolverPagoConPreferida` al guardar (reparto-fallback sin negativos; confirma sobregiro con una sola cuenta). Se preserva el aporte como seguimiento cuando no hay cuentas activas (sube `montoActual` sin descontar). Primer paso del backlog "Visión de Apartados". Verificado: 4 tests de render nuevos (1562 total), lint limpio, 57/57 E2E. SW v212 → v213.

| Archivo | Cambio |
|---|---|
| `modules/dominio/apartados/view.js` | `renderFormAporteApartado` usa `renderSelectorCuenta`; eliminado el helper local `_renderCuentaSelectorAporte`. |
| `modules/dominio/apartados/index.js` | `_guardarAporte` async con `resolverPagoConPreferida` (reparto + sobregiro); descuenta por split; mantiene aporte-seguimiento sin cuentas. |
| `tests/unit/apartados.test.js` | 4 tests de render de `renderFormAporteApartado`. |
| `service-worker.js` | v212 → v213. |

---

### feat(compromisos): categorías predefinidas para deudas (tipo de obligación) · 2026-06-29

Campo **tipo de obligación** en el formulario de nueva deuda (entidad y personal): 12 categorías con emoji (💳 Tarjeta de crédito, 💵 Crédito de consumo, 🏠 Crédito hipotecario, 🚗 Crédito vehicular, 🎓 Crédito educativo, 🧾 Libranza, 🔄 Crédito rotativo, 📉 Sobregiro, 🏪 Microcrédito, 🤝 Préstamo personal, 💧 Gota a gota, 📦 Otro). Catálogo único (`CATEGORIAS_DEUDA` + `CATEGORIA_DEUDA_EMOJI`): el mismo selector sirve para `deuda-entidad` y `deuda-personal`, sin filtrar por tipo. Validado/normalizado en `compromisos/logic.js`, exclusivo de las ramas de deuda (los fijos siguen usando `CATEGORIAS_AGENDA`, sin relación). Migración idempotente v17 → v18 (`categoria: null` en deudas existentes). El selector aparece en `renderFormDeuda` y el emoji + nombre en la card de la lista de deudas ("💳 Tarjeta de crédito · Deuda con entidad · 28%"). **Cierra el backlog "Mis cuentas: ajustes a ingresos": las 3 categorías predefinidas (Ingresos, Agenda, Deudas) quedan completas.** Verificado: 21 tests nuevos (1558 total) en `compromisos.test.js` y `storage.test.js`; lint limpio, 57/57 E2E. SW v211 → v212.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `CATEGORIAS_DEUDA` (12 categorías) + `CATEGORIA_DEUDA_EMOJI`. |
| `modules/core/storage.js` | Migración v17 → v18: `categoria: null` en deudas existentes. |
| `modules/core/state.js` | Typedef `Compromiso.categoria` documentado para ambos catálogos. |
| `modules/dominio/compromisos/logic.js` | `validarCompromiso` + `normalizarCompromiso` con categoría (rama deuda). |
| `modules/dominio/compromisos/views/formularios.js` | Selector de categoría en `renderFormDeuda`. |
| `modules/dominio/compromisos/views/lista.js` | Emoji + nombre en `_renderCompromisoItem`. |
| `tests/unit/compromisos.test.js`, `tests/unit/storage.test.js` | 21 tests nuevos. |
| `service-worker.js` | v211 → v212. |

---

> Para tareas anteriores, ver [`docs/CHANGELOG.md`](CHANGELOG.md).

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
