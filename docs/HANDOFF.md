# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-29 (feat(agenda): categorías predefinidas para gastos fijos)

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
| Tests unitarios + integración | 1539/1539 verdes |
| Tests E2E | 57/57 verde. Suites: `smoke` 28 tests, `estrategia-pago` 8 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(agenda): categorías predefinidas para gastos fijos · 2026-06-29

Campo **categoría** en el formulario "Nuevo gasto fijo" de Agenda: 13 categorías con emoji (🏠 Arriendo, 🏢 Administración, 💡 Servicios públicos, 🌐 Internet, 📱 Telefonía, 🎬 Streaming, 🛡️ Seguros, 📚 Educación, 🏋️ Gimnasio, 💳 Cuota de manejo, 🚗 Transporte, 🐾 Mascotas, 📦 Otro). Agenda no tiene almacenamiento propio (vista calendario sobre `S.compromisos`), así que el campo vive en `Compromiso` con `tipo='fijo'`: `CATEGORIAS_AGENDA` + `CATEGORIA_AGENDA_EMOJI` en `constants.js`, validados/normalizados en `compromisos/logic.js` (exclusivos de `tipo='fijo'`, las deudas no lo exponen). Migración idempotente v16 → v17 (`categoria: null` en fijos existentes). El selector aparece en el form de Agenda y el emoji + nombre en el detalle del día ("Gasto fijo · Mensual · 🌐 Internet"). Verificado: 20 tests nuevos (1539 total) en `compromisos.test.js`, `agenda.test.js` y `storage.test.js` (migración + idempotencia + exclusión de deudas); lint limpio, 57/57 E2E. SW v210 → v211.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `CATEGORIAS_AGENDA` (13 categorías) + `CATEGORIA_AGENDA_EMOJI`. |
| `modules/core/storage.js` | Migración v16 → v17: `categoria: null` en compromisos `tipo='fijo'`. |
| `modules/core/state.js` | Typedef `Compromiso` con `categoria` (solo fijo). |
| `modules/dominio/compromisos/logic.js` | `validarCompromiso` + `normalizarCompromiso` con categoría (solo fijo). |
| `modules/dominio/agenda/view.js` | Selector de categoría en `renderFormGastoFijo`; emoji en `_renderDetalleItem`. |
| `modules/dominio/agenda/index.js` | Pre-rellena categoría al editar. |
| `tests/unit/compromisos.test.js`, `tests/unit/agenda.test.js`, `tests/unit/storage.test.js` | 20 tests nuevos. |
| `service-worker.js` | v210 → v211. |

---

### feat(tesoreria): iconografía en las categorías de ingresos (MC.9) · 2026-06-29

Cada categoría de ingreso muestra un emoji representativo, mismo patrón que `CATEGORIA_EMOJI` de gastos. Nuevo mapa `CATEGORIA_INGRESO_EMOJI` en `constants.js` (12 categorías: 💼 Salario, 🏷️ Salario mínimo, 💵 Honorarios, 🤝 Comisión, 🏠 Arriendo, 👴 Pensión, 🪙 Subsidio, 🎁 Bonificación, 🧾 Cuota, 💰 Venta, 📈 Rendimientos, 📦 Otro). El emoji aparece en cada `<option>` del selector de categoría y junto al nombre en la lista de ingresos. Cambio puramente visual: la categoría guardada sigue siendo el string plano, el emoji se resuelve en la vista. Verificado: 6 tests nuevos (1519 total): cobertura del mapa contra el catálogo, render del selector y de la lista (con/sin categoría), lint limpio, 57/57 E2E. SW v209 → v210.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `CATEGORIA_INGRESO_EMOJI` (12 categorías). |
| `modules/dominio/tesoreria/view.js` | Emoji en `<option>` de `renderFormIngreso` y en `_renderIngresoItem`. |
| `tests/unit/tesoreria.test.js` | 6 tests nuevos. |
| `service-worker.js` | v209 → v210. |

---

### fix(tesoreria): salario mínimo se pre-llena por período según la frecuencia (MC.8) · 2026-06-29

Bug en la automatización "Salario mínimo": pre-llenaba el campo `monto` con el valor **mensual** completo (SMMLV + auxilio), pero `monto` es el valor **por período** y `estimarSalarioMensual` lo multiplica por el factor de la frecuencia. Resultado: con Quincenal el ingreso mensual estimado quedaba al doble (Semanal, ~4.3×). Fix: el salario mínimo se trata como un **ancla mensual** y se divide por la frecuencia para obtener el monto por período (Mensual = completo, Quincenal = /2, Semanal = /4.33, Diario = /30; frecuencias sin factor reconocido caen al mensual). Además la automatización ahora **reacciona al cambiar la frecuencia** (antes solo a la categoría y al checkbox de subsidio). Verificado: 7 tests nuevos (1513 total) incluido un test de regresión que confirma que el monto por período × frecuencia ≈ SMMLV (ya no se duplica), lint limpio. SW v208 → v209.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `montoSalarioMinimoPorPeriodo(conSubsidio, frecuencia)` (ancla mensual / factor, reusa `_FACTOR_MENSUAL`). |
| `modules/dominio/tesoreria/index.js` | `_attachCategoriaToggle`: pre-llena el monto por período y escucha el `change` de frecuencia. |
| `tests/unit/tesoreria.test.js` | 7 tests nuevos (incluye regresión MC.8). |
| `service-worker.js` | `CACHE_NAME` v208 → v209. |

---

### feat(tesoreria): categorías predefinidas para ingresos + automatización "Salario mínimo" con subsidio de transporte · 2026-06-29

Se agregó un campo **categoría** al registrar un ingreso, con 12 categorías predefinidas (Salario, Salario mínimo, Honorarios, Comisión, Arriendo, Pensión, Subsidio, Bonificación, Cuota, Venta, Rendimientos, Otro). Migración idempotente v15 → v16 (`categoria: null` en ingresos existentes). Automatización: al elegir "Salario mínimo", aparece "¿Recibo subsidio de transporte?" con checkbox; marcado → monto = SMMLV + auxilio (leídos de `constants.js`). La lista de ingresos muestra "Mensual · Honorarios". Verificado: 12 tests nuevos (1506 total), render desechable en happy-dom, lint limpio, 57/57 E2E. SW v207 → v208.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `CATEGORIAS_INGRESO` (12 categorías). |
| `modules/core/storage.js` | Migración v15 → v16: `categoria: null` en ingresos. |
| `modules/core/state.js` | Typedef `Ingreso` con `categoria`. |
| `modules/dominio/tesoreria/logic.js` | `validarIngreso` + `normalizarIngreso` con categoría; `calcularSalarioMinimo`. |
| `modules/dominio/tesoreria/view.js` | Selector de categoría en form; fieldset subsidio; categoría en lista. |
| `modules/dominio/tesoreria/index.js` | `_attachCategoriaToggle` (show/hide subsidio, pre-llenado). |
| `tests/unit/tesoreria.test.js` | 12 tests nuevos. |
| `service-worker.js` | v207 → v208. |

---

### docs: ADR 013, distribución "Automático inteligente" (MC.6, diseño) · 2026-06-29

Tarea de diseño (sin código). El modo Automático de "¿Cómo distribuir mi dinero?" hoy solo adapta según los gastos fijos y, en el caso común, devuelve 50/30/20 fijo; además la barra duplica "Automático" y "50/30/20". El ADR diseña su evolución. Decisiones con el usuario (2 preguntas): alcance = sigue siendo distribución en 3 grupos pero con % calculados desde los datos reales (el reparto por destino se queda en MC.4 / futuro MC.7); duplicidad = Automático por defecto y los 3 presets fijos pasan a un grupo secundario "Métodos clásicos". El motor pasa a un modelo de pisos por prioridad: Necesidades = gastos fijos + cuotas mínimas de deuda; Ahorro = prioridades en orden (cerrar fondo, abono extra a deudas caras, metas/apartados con plazo, o base sana); Estilo de vida = lo que queda con piso de sostenibilidad. Transparencia obligatoria (Automático explica el porqué). Sin cambios de schema, lógica pura. 3 slices: MC.6a (motor), MC.6b (barra de presets), MC.6c (señales más ricas, opcional). Sin código ni tests aún.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/013-distribucion-automatica-inteligente.md` | ADR nuevo (modelo de pisos por prioridad, resolución de la duplicidad, transparencia, alternativas, consecuencias, 3 slices). |

---

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
