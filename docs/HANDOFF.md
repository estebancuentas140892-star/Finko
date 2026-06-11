# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-11 (subtítulos permanentes + urgencia visual en Apartados; 1359/1359 verde)

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
| Tests unitarios + integración | 1359/1359 verdes (+8: calcularGastosFijosMensuales + estimarSalarioMensual multifrecuencia) |
| Tests E2E | 57/57 verde. Suites: `smoke` 28 tests, `estrategia-pago` 8 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### docs(redesign): plan maestro de modernización visual 2026 · 2026-06-11

Auditoría visual de toda la app con datos de demostración (desktop y móvil, dark y light) y plan del rediseño en fases. Diagnóstico: emojis como iconografía, montos en DM Mono "estilo terminal", estética neón sobre negro, desktop de una columna, progreso visualmente tímido, jerarquía débil en cards, microinteracciones ausentes. Plan en [`REDESIGN_2026.md`](REDESIGN_2026.md): 7 fases de UI (V.1 a V.7 en ROADMAP) + 1 opcional de producto (V.8, mecánicas de hábito). **La siguiente tarea es V.1: tokens v2 + tipografía.**

| Archivo | Cambio |
|---|---|
| `docs/REDESIGN_2026.md` | Nuevo: diagnóstico, dirección "calma con energía", fases, restricciones. |
| `docs/ROADMAP.md` | Serie V (Rediseño visual 2026) con V.1-V.8. |

---

### feat(ux): subtítulos permanentes + urgencia visual en Apartados · 2026-06-11

Tres mejoras visuales sin cambios de lógica o tests. Subtítulos de sección permanentes para Ahorro, Metas y Apartados (visibles siempre, no solo en el empty state). Badge de urgencia inline en el subtitle de cada apartado: rojo si vence en ≤7 días, ámbar en 8-30 días. Estado "Listo para usar" en apartados recurrentes que ya reunieron el dinero: borde y fondo verde en el card. SW v143 → v144.

| Archivo | Cambio |
|---|---|
| `index.html` | Subtítulos permanentes: Ahorro ("Tu colchón..."), Metas ("Objetivos aspiracionales..."), Apartados ("Reservas para gastos previsibles..."). |
| `modules/dominio/apartados/view.js` | `list-item--listo` cuando está listo para reiniciar; badge `badge--danger`/`badge--warn` por días restantes. |
| `styles/components/forms.css` | `.badge--danger` (rojo, mismo patrón que `.badge--warn`). |
| `styles/components/domain.css` | `.list-item--listo` + `:hover`. |
| `service-worker.js` | v143 → v144. |

---

### fix(metas): copy del empty state desambigua Metas vs Ahorro vs Apartados · 2026-06-11

El empty state de Metas mencionaba "fondo de emergencia" como meta sugerida, compitiendo directamente con la sección Ahorro. Se reescribió descripción y tip para guiar al usuario al dominio correcto. SW v142 → v143.

| Archivo | Cambio |
|---|---|
| `modules/dominio/metas/view.js` | Desc y tip del empty state reescritos: Metas = objetivos aspiracionales; fondo de emergencia → Ahorro; gastos previsibles (SOAT, impuestos) → Apartados. |
| `service-worker.js` | v142 → v143. |

---

### fix(tesoreria): card de distribución visible para todas las frecuencias de ingreso · 2026-06-11

La card "¿Cómo distribuir $X?" en Mis Ingresos no aparecía para usuarios con ingresos quincenales, semanales o diarios. Tres bugs corregidos: (1) `estimarSalarioMensual` ahora convierte todas las frecuencias a mensual usando `_FACTOR_MENSUAL`; (2) el cálculo de gastos fijos usa la nueva función `calcularGastosFijosMensuales` que corrige el filtro de frecuencia (lowercase vs Mensual); (3) `tieneDeudas` corregido de `tipo === 'deuda'` a `'deuda-entidad' || 'deuda-personal'` (el tipo string `'deuda'` nunca existió). SW v141 → v142. 1359/1359 tests verdes.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `_FACTOR_MENSUAL` constante. `estimarSalarioMensual` multifrecuencia. Nueva `calcularGastosFijosMensuales`. |
| `modules/dominio/tesoreria/view.js` | `renderDistribucionIngreso` usa `calcularGastosFijosMensuales`; `tieneDeudas` tipo corregido. |
| `tests/unit/tesoreria.test.js` | Test `estimarSalarioMensual` actualizado; 2 nuevos tests frecuencias. 6 nuevos tests `calcularGastosFijosMensuales`. |
| `service-worker.js` | v141 → v142. |

---

### feat(agenda): acciones Abonar/Editar/Eliminar para deudas en la Agenda · 2026-06-11

Las tarjetas de deuda en el detalle del día de la Agenda ahora tienen los mismos botones que los gastos fijos. Abonar reutiliza la acción `abrir-abono` ya registrada por compromisos. Eliminar reutiliza `eliminar-compromiso`. Editar usa una nueva acción `editar-compromiso` que abre el modal de compromisos pre-rellenado (sin pasar por el chooser). Fix secundario: se corrigió el bug `!pagado` (variable inexistente) en el bloque de acciones del gasto fijo, reemplazado por `estadoPago !== 'completo'`. SW v140 → v141.

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/view.js` | Bloque `accionesHtml` extendido con rama `deuda-entidad/deuda-personal`; fix bug `pagado` → `estadoPago`. |
| `modules/dominio/compromisos/index.js` | `_editarCompromiso(el)`: abre modal pre-rellenado. `_guardarCompromiso`: detecta `form.dataset.id` y usa `editar` en modo edit. Nuevo `registrarAccion('editar-compromiso', ...)`. |
| `modules/dominio/compromisos/views/formularios.js` | `renderFormDeuda(tipo, deuda = null)`: pre-fill de todos los campos en modo edit; botones "Cancelar/Actualizar deuda" vs "Volver/Guardar deuda". |
| `service-worker.js` | v140 → v141. |

---


> Para tareas anteriores (motor recomendación deudas, tasa opcional, motor distribución ingresos, Apartados Fase 1, ADR 005), ver [`docs/CHANGELOG.md`](CHANGELOG.md).

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
