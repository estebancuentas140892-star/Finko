# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-29 (refactor(deudas): D.6 - quitar aviso de fijos vencidos de la sección Deudas)

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
| Tests unitarios + integración | 1607/1607 verdes |
| Tests E2E | 61/61 verde. Suites: `smoke` 28 tests, `estrategia-pago` 12 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### refactor(deudas): quitar aviso de fijos vencidos de la sección Deudas (D.6) · 2026-06-29

El panel "N pendientes del mes" del Dashboard ya centraliza todos los vencidos del mes (fijos, deudas, agenda): el nudge `#nudge-fijos-sin-pagar` en Deudas duplicaba ese subconjunto en el lugar equivocado. Eliminado completamente: función, re-export, import, call y nodo HTML. `renderAlertaDeudasDurmiendo` intacta. 1633/1633 verdes. SW v222 → v223.

| Archivo | Cambio |
|---|---|
| `index.html` | Eliminado `<div id="nudge-fijos-sin-pagar">`. |
| `modules/dominio/compromisos/views/alertas.js` | Eliminada `renderAlertaFijosSinPagar`. |
| `modules/dominio/compromisos/view.js` | Eliminado re-export. |
| `modules/dominio/compromisos/index.js` | Eliminados import y call en `_renderTodo()`. |
| `service-worker.js` | v222 → v223. |

---

### feat(tesoreria): modelo de pisos para distribución automática (MC.6a, ADR 013) · 2026-06-29

Primer slice del [ADR 013](DECISIONS/013-distribucion-automatica-inteligente.md). Reescribe el modo `auto` de `sugerirDistribucionIngreso` con el modelo de pisos: Necesidades (gastos fijos + cuotas de deuda), Ahorro (fondo → objetivos → base sana 20%), Estilo de vida (residual, piso 10%). Nuevo helper puro `calcularAporteMensualObjetivos`. `view.js` computa 4 nuevos inputs desde S (cuotas, faltante fondo, aporte a objetivos, límites). 16 tests nuevos + 4 actualizados. 1617 → 1633 verdes.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `calcularAporteMensualObjetivos` + `sugerirDistribucionIngreso` reescrita. |
| `modules/dominio/tesoreria/view.js` | 4 nuevos inputs computados desde S. |
| `tests/unit/tesoreria.test.js` | 16 tests nuevos + 4 actualizados + import. |

---

### feat(constants): mapeo sección → grupo financiero (TX.5, ADR 014) · 2026-06-29

Cuarto y último slice del [ADR 014](DECISIONS/014-taxonomia-categorias-transversal.md). Agrega en `constants.js` el mapeo canónico sección → grupo financiero como código reutilizable: `GRUPOS_FINANCIEROS` (3 grupos en orden de prioridad), `LABEL_GRUPO_FINANCIERO` (etiquetas UI), `GRUPO_POR_SECCION` (mapa clave→grupo para las 7 secciones) y `clasificarSeccionEnGrupo` (función pura). **Con TX.5, la serie completa TX.1-TX.5 queda cerrada y el ADR 014 implementado.** 8 tests nuevos. 1609 → 1617 verdes. Sin SW bump.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `GRUPOS_FINANCIEROS`, `LABEL_GRUPO_FINANCIERO`, `GRUPO_POR_SECCION`, `clasificarSeccionEnGrupo`. |
| `tests/unit/constants.test.js` | 8 tests TX.5 + imports. |

---

### test(constants): guardarraíl de consistencia de emojis entre catálogos (TX.4) · 2026-06-29

Tercer slice del [ADR 014](DECISIONS/014-taxonomia-categorias-transversal.md). 2 tests en `constants.test.js`: el primero verifica que la lista de etiquetas compartidas entre catálogos no está vacía (smoke del guardarraíl); el segundo verifica que toda etiqueta compartida usa el mismo emoji en todos los catálogos donde aparece. Detecta hoy 6 compartidas que pasan: Mercado 🛒, Transporte 🚗, Servicios públicos 💡, Educación 📚, Mascotas 🐾, Arriendo 🏠. Fallará automáticamente ante cualquier desajuste futuro. 1607 → 1609 verdes. Sin SW bump.

| Archivo | Cambio |
|---|---|
| `tests/unit/constants.test.js` | 2 tests TX.4 + imports de los 4 mapas de emoji y `PLANTILLAS_APARTADO`. |

---

### feat(deudas): renegociar la tasa interactivo + aplicar (D.3a) · 2026-06-29

Primer slice de la Revisión D.3 de [ADR 011](DECISIONS/011-unificacion-simulador-deudas.md): la simulación deja de ser solo what-if y puede **convertirse en acción**. Dentro del bloque "Tu plan no se sostiene", "renegociar la tasa" pasa de texto a herramienta interactiva (🤝): el usuario elige una deuda con tasa conocida, escribe la tasa que cree poder conseguir (en la unidad nativa: EA para entidad, mensual para personal), ve la comparación en vivo y, con "Aplicar nueva tasa", escribe el cambio sobre la deuda en un paso (con confirmación). Nueva lógica pura `simularRenegociacion` (reusa `simularPagoDeuda`, que ahora expone `completo`); maneja el caso inviable→viable sin cifras divergentes (patrón D.1). El "Aplicar" es la primera superficie de la simulación que muta `S`, por eso pide confirmación. Corte **vertical por herramienta** acordado con el usuario (cada una simula y aplica de punta a punta). Verificado: 16 tests unitarios nuevos + 2 E2E (la verificación del cableado de eventos va por E2E, no por el preview, que cachea módulos). SW v217 → v218.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic.js` | `simularRenegociacion`; `simularPagoDeuda` devuelve `completo`; `filtrarDeudasPagables` expone `tasaUnidad`. |
| `modules/dominio/compromisos/views/estrategia-impacto.js` | `renderComparativaRenegociacion` + `renderRenegociar` (movido aquí para mantener `estrategia.js` < 400 líneas). |
| `modules/dominio/compromisos/views/estrategia.js` | Estado UI `renegociar*`; el bloque inviable monta la herramienta. |
| `modules/dominio/compromisos/index.js` | Handlers `_cambiarRenegociarDeuda`, `_actualizarRenegociacionEnVivo`, `_aplicarRenegociacion` + cableado input/change/click. |
| `styles/components/charts.css` | Estilos `.estrategia-card__renegociar-*`. |
| `eslint.config.js` | `HTMLSelectElement` global. |
| `tests/unit/compromisos.test.js`, `tests/e2e/estrategia-pago.test.js` | 16 unit + 2 E2E. |
| `service-worker.js` | v217 → v218. |

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
