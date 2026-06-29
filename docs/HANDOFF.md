# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-29 (docs: ADR 013 distribución "Automático inteligente", MC.6 diseño)

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
| Tests unitarios + integración | 1494/1494 verdes |
| Tests E2E | 57/57 verde. Suites: `smoke` 28 tests, `estrategia-pago` 8 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### docs: ADR 013, distribución "Automático inteligente" (MC.6, diseño) · 2026-06-29

Tarea de diseño (sin código). El modo Automático de "¿Cómo distribuir mi dinero?" hoy solo adapta según los gastos fijos y, en el caso común, devuelve 50/30/20 fijo; además la barra duplica "Automático" y "50/30/20". El ADR diseña su evolución. Decisiones con el usuario (2 preguntas): alcance = sigue siendo distribución en 3 grupos pero con % calculados desde los datos reales (el reparto por destino se queda en MC.4 / futuro MC.7); duplicidad = Automático por defecto y los 3 presets fijos pasan a un grupo secundario "Métodos clásicos". El motor pasa a un modelo de pisos por prioridad: Necesidades = gastos fijos + cuotas mínimas de deuda; Ahorro = prioridades en orden (cerrar fondo, abono extra a deudas caras, metas/apartados con plazo, o base sana); Estilo de vida = lo que queda con piso de sostenibilidad. Transparencia obligatoria (Automático explica el porqué). Sin cambios de schema, lógica pura. 3 slices: MC.6a (motor), MC.6b (barra de presets), MC.6c (señales más ricas, opcional). Sin código ni tests aún.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/013-distribucion-automatica-inteligente.md` | ADR nuevo (modelo de pisos por prioridad, resolución de la duplicidad, transparencia, alternativas, consecuencias, 3 slices). |

---

### feat(inversiones): Inversiones como destino fondeable de "Distribuir mi ingreso" (ADR 012, MC.4e) · 2026-06-29

Quinto y último slice de la auto-distribución: cierra MC.4. El ADR había dejado Inversiones como destino solo informativo porque el dominio no tenía "aportar a un holding existente" (solo crear/eliminar). Este slice agrega ese aporte incremental: `construirPlanInversiones` (pura) arma una fila por holding con monto 0 editable y el capital actual como contexto; el aporte incrementa el `monto` (capital) del holding y **sí descuenta** de la cuenta de origen (como metas/apartados/deudas; el filtro `i.tipo !== 'fondo'` ya lo cubría). Orquestación por EventBus (ADN #10): el nuevo suscriptor en `inversiones/index.js` aplica su porción con `editar('inversiones', ...)`. Se sumó `inversiones` a `_SLICES_DISTRIBUCION` (el undo restaura el capital), y el gating del botón ahora considera ahorro, deudas o inversiones. El panel muestra una subsección "Aportar a inversiones". Verificado: 4 tests de lógica nuevos (1494 total), test desechable en happy-dom (suscriptor real sube el capital $1M → $1.5M; el panel renderiza la subsección), lint limpio, 57/57 E2E. Preview en `chrome-error` (recurrente): verificación por render + E2E. SW v206 → v207. **MC.4 completa.** Pendientes: épicas MC.6 (Automático inteligente) y MC.7 (asistente guiado), ambas requieren ADR.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `construirPlanInversiones` (fila por holding, capital como contexto). |
| `modules/dominio/tesoreria/view.js` | Subsección "Aportar a inversiones"; inversiones en el gating; capital en la fila; legend. |
| `modules/dominio/tesoreria/index.js` | `inversiones` en `_SLICES_DISTRIBUCION` (undo del capital). |
| `modules/dominio/inversiones/index.js` | Suscriptor `distribucion:aplicar` que incrementa el capital del holding. |
| `tests/unit/tesoreria.test.js` | 4 tests de `construirPlanInversiones`. |
| `service-worker.js` | `CACHE_NAME` v206 → v207. |

---

### feat(tesoreria): "Distribuir mi ingreso" se habilita al llegar el cobro + guard de de-duplicación (ADR 012, MC.4d) · 2026-06-29

Cuarto slice de la auto-distribución. Antes el botón "Distribuir mi ingreso" salía siempre que hubiera un destino fondeable; ahora la acción se ata al calendario del cobro y se protege contra el doble conteo. Lógica pura nueva: `ultimoPagoHasta` (fecha ISO del cobro más reciente ya ocurrido, espejo hacia atrás de `diasParaProximoPago`, Mensual/Quincenal) y `estadoDistribucion` que devuelve `{ estado, periodoISO, esHoy }` con cuatro estados: `'sin-fecha'` (sin día de pago registrado: la acción se mantiene, no hay regresión), `'pendiente'` (hay día de pago pero el cobro de este periodo aún no llega, p. ej. ingreso registrado hoy con día ya pasado: oculta el botón), `'listo'` (ya llegó y no se ha distribuido) y `'distribuido'` (ya se repartió este periodo). El periodo = fecha del cobro más reciente (<= hoy y posterior a `fechaCreacion` del ingreso) y es la clave de de-duplicación. La UI muestra en `'listo'` un nudge "💸 Hoy recibes tu ingreso. ¿Deseas distribuirlo ahora?" sobre el botón, en `'distribuido'` "✓ Ya distribuiste tu ingreso de este periodo" sin botón, y en `'pendiente'` un aviso muted. Al confirmar se marca `S.config.ultimaDistribucionPeriodo` (antes de mover dinero, para que el re-render ya oculte el botón); el snapshot de undo incluye ahora la slice `config`, así "Deshacer" revierte la marca. Cambio aditivo, sin migración. Verificado: 17 tests de lógica nuevos (1490 total), test de render desechable en happy-dom (los cuatro estados), lint limpio, 57/57 E2E. El preview volvió a caer en `chrome-error` (recurrente): verificación por render + E2E. SW v205 → v206. **Pendiente de MC.4:** MC.4e (inversiones, opcional). Quedan abiertas MC.6 y MC.7 (épicas, requieren ADR).

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `ultimoPagoHasta` + `estadoDistribucion` (gating por fecha + clave de periodo) + helper `_isoFecha`. |
| `modules/dominio/tesoreria/view.js` | El panel ramifica por estado: nudge "¿distribuir?", "ya distribuiste", aviso "pendiente", o fallback. |
| `modules/dominio/tesoreria/index.js` | Marca `ultimaDistribucionPeriodo` al confirmar; `config` en el snapshot de undo. |
| `styles/components/forms.css` | `.distribuir__cta`, `.distribuir__hecho`, `.distribuir__pendiente`. |
| `tests/unit/tesoreria.test.js` | 17 tests de `ultimoPagoHasta` y `estadoDistribucion`. |
| `service-worker.js` | `CACHE_NAME` v205 → v206. |

---

### feat(tesoreria): filas informativas Necesidades/Estilo de vida en el panel (ADR 012, MC.4c) · 2026-06-29

Tercer slice de la auto-distribución, de cierre del panel base. El panel "Distribuir mi ingreso" ahora muestra, bajo "Esto queda en tu cuenta (no se mueve)", dos filas de referencia: Necesidades y Estilo de vida con su % y su monto. No son editables ni mueven dinero (las obligaciones se pagan al vencer; el estilo de vida se gasta a lo largo del mes); solo completan la foto de los 3 grupos para que el usuario entienda a dónde va todo su ingreso. Los montos se recalculan en vivo al cambiar el "Monto a distribuir" (son % del ingreso, leídos de `data-dist-pct`). Cambio solo de UI (view + index + CSS), sin lógica financiera nueva ni cross-domain. Verificado: 1473/1473, lint limpio, y un test desechable en happy-dom (las filas muestran 50%→$1.5M y 30%→$900k sobre 3M, y recalculan a $1M/$600k al bajar el monto a 2M). SW v204 → v205. **Pendientes de MC.4:** MC.4d (habilitar solo al llegar el ingreso + nudge "Hoy recibes tu ingreso, ¿distribuir?" + de-duplicación), MC.4e (inversiones). Backlog nuevo del usuario: MC.6 (Automático inteligente, no 50/30/20 fijo + quitar duplicidad) y MC.7 (asistente guiado de 3 pasos con obligaciones itemizadas y aportes auto-calculados); ambas épicas, requieren ADR.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/view.js` | Bloque informativo Necesidades/Estilo de vida en el panel; pasa `necesidadesPct`/`estiloVidaPct`. |
| `modules/dominio/tesoreria/index.js` | `_recalcularDistribucion` recalcula los montos informativos en vivo. |
| `styles/components/forms.css` | `.distribuir__info` + `.distribuir__info-fila`. |
| `service-worker.js` | `CACHE_NAME` v204 → v205. |

---

### feat(tesoreria): "Distribuir mi ingreso" suma Deudas como destino (ADR 012, MC.4b) · 2026-06-29

Segundo slice de la auto-distribución. El panel ahora reparte también hacia las deudas pendientes como abono real. Bajo una subsección "Abonar a deudas (ordenadas por prioridad de pago)" aparece una fila por deuda con saldo > 0, ordenadas estilo Avalancha (mayor interés efectivo anual primero, la estrategia óptima recomendada), cada una con su saldo como contexto. El abono se topa al saldo (no se paga de más; el excedente se queda en la cuenta) en `_leerItemsDistribucion`, así el resumen y el apply usan el mismo monto efectivo. Al confirmar, la deuda se aplica por el mismo EventBus `distribucion:aplicar`: el suscriptor en `compromisos/index.js` baja `saldoTotal` (topado en 0) con su propia lógica; tesorería centraliza el descuento de la cuenta (las deudas, como metas/apartados, sí salen de la cuenta). Se agregó `compromisos` al snapshot de undo. Lógica pura nueva `construirPlanDeudas` (ordena por EA desc replicando localmente `tasaEADe` con comentario, ADN #10). El botón "Distribuir mi ingreso" ahora también aparece cuando solo hay deudas (sin destinos de ahorro). Verificado: 5 tests de lógica nuevos (1473 total), test de integración desechable en happy-dom (orden por prioridad, tope al saldo, descuento de cuenta, undo), 57/57 E2E. El navegador local cargó módulos cacheados de la sesión anterior en :8080 y no mostró las filas de deuda; se confirmó que los archivos servidos sí contienen el código nuevo, y la verificación quedó en el test de integración (el SW v204 fuerza assets frescos en producción). SW v203 → v204. **Pendientes:** MC.4c (filas informativas necesidades/estilo de vida), MC.4d (de-duplicación + mapeo), MC.4e (inversiones).

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `construirPlanDeudas` (orden Avalancha) + `_tasaEADeuda` (replicado, ADN). |
| `modules/dominio/tesoreria/view.js` | Subsección de deudas en el panel + `_filaDistribuir` (muestra saldo). |
| `modules/dominio/tesoreria/index.js` | Tope del abono al saldo; `compromisos` en el snapshot; copy del resumen. |
| `modules/dominio/compromisos/index.js` | Suscriptor `distribucion:aplicar`: baja `saldoTotal` de la deuda. |
| `styles/components/forms.css` | `.distribuir__subtitulo` + `.distribuir__saldo`. |
| `tests/unit/tesoreria.test.js` | 5 tests de `construirPlanDeudas`. |
| `service-worker.js` | `CACHE_NAME` v203 → v204. |

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
