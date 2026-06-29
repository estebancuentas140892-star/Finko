# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-28 (style(cuentas): textos de ayuda simplificados en el form de nueva cuenta, MC.1)

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
| Tests unitarios + integración | 1450/1450 verdes |
| Tests E2E | 57/57 verde. Suites: `smoke` 28 tests, `estrategia-pago` 8 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### style(cuentas): textos de ayuda simplificados en el form de nueva cuenta (MC.1) · 2026-06-28

Primera tarea del backlog "Mis cuentas + distribución" pedido por el usuario. El form de nueva/editar cuenta tenía dos párrafos de explicación debajo de sus checkboxes: uno describía qué es el 4x1000 (impuesto, exenciones de nómina/AFC) y otro aclaraba que la cuota de manejo era opcional. El usuario los consideró innecesarios: la mayoría ya sabe qué es el 4x1000, y un switch ya comunica "opcional" por sí solo. Se eliminaron ambos párrafos `<p class="form-hint form-hint--muted">`, dejando solo la pregunta de cada checkbox. Cambio de copy puro, sin tocar lógica ni `name`/`id` de los inputs. Verificado: 1450/1450 unit + integración, lint limpio, y render real de `renderFormCuenta()` confirmado en happy-dom (las dos preguntas se conservan, las dos explicaciones desaparecen). El preview del entorno seguía sin cargar la app (mismo artefacto de sesiones anteriores), así que la verificación fue por render directo en vez de captura visual. SW v198 → v199.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/view.js` | Eliminados los dos `<p class="form-hint form-hint--muted">` del 4x1000 y de la cuota de manejo en `renderFormCuenta`. |
| `service-worker.js` | `CACHE_NAME` v198 → v199. |

---

### refactor(deudas): barrido de dead code del acordeón (ADR 011, S3) · 2026-06-28

Tercer slice del rediseño de simulación de deudas (ADR 011), de cierre. S1 ya había eliminado el acordeón "Paga un extra cada mes" (su estado `expandidoExtra`, la acción `toggle-extra-estrategia`, el handler y el CSS), así que S3 fue solo barrer los residuos que quedaron: un barrido por `acordeon`/`expandido`/`toggle-extra` en JS, CSS y tests confirmó que el CSS estaba limpio y que las únicas referencias vivas eran 3 comentarios desactualizados. Se corrigieron: el docstring y el comentario inline de `estrategia.js` decían que `_uiEstrategia` guardaba "acordeón abierto" (campo que ya no existe), y `index.js` tenía un comentario tombstone en inglés sobre la acción removida. Las demás coincidencias son historia intencional (CHANGELOG, ADR) o de otras features (sidebar colapsable, detalle de Agenda). Sin cambios de runtime: solo comentarios. Verificado: 1450/1450, lint limpio, grep de residuos en cero. SW v197 → v198.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/views/estrategia.js` | Quitada la mención a "acordeón abierto" del docstring y del comentario del estado UI (el campo ya no existe). |
| `modules/dominio/compromisos/index.js` | Eliminado el comentario tombstone `toggle-extra-estrategia removed`. |
| `service-worker.js` | `CACHE_NAME` v197 → v198. |

---

### refactor(deudas): eliminado el botón "Simular" por deuda (ADR 011, S2) · 2026-06-28

Segundo slice del rediseño de simulación de deudas (ADR 011). Cada fila de deuda tenía un botón "Simular" que abría un modal con una simulación individual (meses/intereses ahorrados con un extra). Esa superficie aislada confundía: mostraba el impacto de una sola deuda, sin reflejar cómo interactúan entre sí (cuotas liberadas, volcamiento), y ya quedó cubierta por el panel unificado de S1 (extra mensual + resumen de impacto sobre todo el portafolio). Se eliminó el botón y toda su maquinaria: la acción `simular-abono`, los handlers `_abrirSimulacion` y `_actualizarSimulacion`, la vista `renderSimulacion` y su re-export, las 5 reglas CSS `.sim-resultado*` (ya muertas), y los imports que quedaban sin uso (`renderSimulacion`, `simularPagoDeuda`, `formatearDuracion` en index.js; `tasaEADe` en formularios.js). Ningún test referenciaba la simulación por deuda, así que el conteo no cambia. Verificado: 1450/1450 unit + integración, 57/57 E2E, y render de la lista en happy-dom (Abonar presente, "Simular" ausente). **Pendientes:** S3 (limpiar dead code residual del acordeón), S4/S5 (herramientas what-if: renegociar tasa y consolidar). SW v196 → v197.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/views/lista.js` | Eliminado el botón "Simular" de la fila de deuda. |
| `modules/dominio/compromisos/index.js` | Eliminados `_abrirSimulacion`, `_actualizarSimulacion`, la acción `simular-abono` y 3 imports sin uso. |
| `modules/dominio/compromisos/view.js` | Eliminado el re-export de `renderSimulacion`. |
| `modules/dominio/compromisos/views/formularios.js` | Eliminada `renderSimulacion` y el import `tasaEADe` (sin uso). |
| `styles/components/domain.css` | Eliminado el bloque `.sim-resultado*` (5 reglas muertas). |
| `service-worker.js` | `CACHE_NAME` v196 → v197. |

---

### feat(deudas): extra mensual siempre visible con resumen de impacto en vivo (ADR 011, S1) · 2026-06-28

Primer slice del rediseño de simulación de deudas (ADR 011). El input de "pago extra mensual" estaba escondido en un acordeón colapsado al fondo de la card de estrategia. Ahora está siempre visible arriba de la card, con un resumen de impacto que compara "sin extra" vs "con extra" al instante: meses menos, intereses ahorrados. Se actualiza en vivo (evento `input`, sin perder foco) y la card completa se recalcula al salir del campo. Se eliminó el acordeón completo. **Pendientes:** S2 (eliminar botón "Simular" por deuda), S3 (limpiar dead code del acordeón), S4/S5 (herramientas interactivas: renegociar tasa y consolidar). 1446 → 1450 tests. SW v195 → v196.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/011-unificacion-simulador-deudas.md` | ADR nuevo (diseño completo: 5 slices). |
| `modules/dominio/compromisos/views/estrategia.js` | Extra + resumen arriba de las cards; eliminado el acordeón. |
| `modules/dominio/compromisos/views/estrategia-impacto.js` | Nueva `renderResumenExtra`. |
| `modules/dominio/compromisos/index.js` | `input` para resumen en vivo; eliminado `_toggleExtraEstrategia`. |
| `styles/components/charts.css` | CSS de extra + resumen; eliminado CSS del acordeón. |
| `tests/unit/compromisos.test.js` | 4 tests de `renderResumenExtra`. |
| `tests/e2e/estrategia-pago.test.js` | Corregido (ya no abre acordeón). |

---

### feat(gastos): guía de categorías de gasto fijo (nudge no bloqueante) · 2026-06-28

Segunda de dos mejoras de Gastos pedidas por el usuario. Al elegir Vivienda, Servicios públicos o Educación en el formulario de gasto, aparece un hint info debajo del select: "Esta categoría suele ser un gasto fijo mensual. Si es recurrente, puedes registrarlo en Agenda para llevarlo mejor." No limita la decisión (el usuario puede ignorarlo). Se implementó con `CATEGORIAS_TIPICAMENTE_FIJAS` (Set en `constants.js`), un hint oculto en el form (`view.js`), un `change` listener en `_montarFormGasto` (`index.js`), y `.form-hint--info` en `forms.css`. 1443 → 1446 tests. SW v194 → v195.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | Nueva `CATEGORIAS_TIPICAMENTE_FIJAS` (Set: Vivienda, Servicios públicos, Educación). |
| `modules/dominio/gastos/view.js` | Hint oculto `#hint-categoria-fija` tras el `<select>` de categoría. |
| `modules/dominio/gastos/index.js` | `change` listener en categoría que muestra/oculta el hint. |
| `styles/components/forms.css` | `.form-hint--info { color: var(--fk-info-text); }`. |
| `tests/unit/gastos.test.js` | 3 tests nuevos. |

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
