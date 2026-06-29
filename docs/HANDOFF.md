# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-28 (feat(gastos): guía de categorías de gasto fijo)

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
| Tests unitarios + integración | 1438/1438 verdes |
| Tests E2E | 57/57 verde. Suites: `smoke` 28 tests, `estrategia-pago` 8 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

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

### feat(gastos): lista con los más recientes primero · 2026-06-28

Primera de dos mejoras de Gastos pedidas por el usuario. La lista mostraba los gastos en orden de inserción (el último registrado al fondo). Ahora van los más recientes primero: fecha descendente y, a igualdad de fecha, el último registrado al tope (desempate por orden de inserción inverso, ya que `guardar` hace `push` y `genId` es aleatorio). Función pura nueva `ordenarRecientesPrimero` en `gastos/logic.js`, aplicada por la vista antes de renderizar. Verificado: 5 tests nuevos + ejecución de la función servida en el navegador (orden correcto); el render en vivo no se pudo capturar porque el contexto del preview quedó envenenado tras limpiar caché varias veces (artefacto del entorno, no del código: la suite importa `view.js` y pasa). 1438 → 1443 tests. SW v193 → v194. **Pendiente (Tarea 2):** guía de categorías de gasto fijo (nudge no bloqueante al elegir Servicios públicos, Vivienda, etc.).

| Archivo | Cambio |
|---|---|
| `modules/dominio/gastos/logic.js` | Nueva `ordenarRecientesPrimero` (pura: fecha desc + desempate por inserción inversa, no muta). |
| `modules/dominio/gastos/view.js` | `renderListaGastos` ordena con `ordenarRecientesPrimero` antes de mapear. |
| `tests/unit/gastos.test.js` | 5 tests de `ordenarRecientesPrimero`. |
| `service-worker.js` | `CACHE_NAME` v193 → v194. |

---

### style(dashboard): hero a ancho completo cuando no hay gastos por organizar · 2026-06-28

Segunda y última mejora del Dashboard pedida por el usuario (cierra el pedido). Tras subir la tarjeta "gastos por organizar" junto al hero, quedaba un hueco a su derecha en el caso común sin pendientes (tarjeta `[hidden]`, hero a `span 8`). Ahora, cuando la tarjeta está oculta, el hero se expande a `span 12` (ancho completo) y no queda aire muerto. CSS puro con `:has()` sobre el `[hidden]` del panel (mismo patrón que `.list-item__icon:has(.bank-avatar)`): cero JS, cero acoplamiento del dominio gastos al layout. En tablet/mobile `span 12` se recorta a la fila completa (sin cambios fuera de desktop). Verificado por medición: desktop sin pendientes hero `span 12`, con pendientes `span 8` + tarjeta al lado, mobile sin regresión. 1438/1438. SW v192 → v193.

| Archivo | Cambio |
|---|---|
| `styles/layout.css` | Regla `.bento--dash:has(#panel-gastos-pendientes[hidden]) .bento__cell--hero { grid-column: span 12; }`. |
| `service-worker.js` | `CACHE_NAME` v192 → v193. |

---

### feat(dashboard): "gastos por organizar" junto al hero (desktop) / bajo él (mobile) · 2026-06-28

Primera de dos mejoras del Dashboard pedidas por el usuario. La tarjeta "Tienes N gastos por organizar" vivía al fondo del Dashboard, fuera del bento grid, fácil de pasar por alto. Ahora vive como celda del bento justo después del hero: en escritorio ocupa las 4 columnas libres a la derecha de "Tu dinero disponible hoy" (rellena el hueco que dejaron los accesos rápidos al eliminarse), y en móvil se apila a ancho completo justo debajo. La celda es "bare" (sin fondo, borde ni padding propios) para que el nudge interno sea la única tarjeta visible, estirado a la altura del hero y centrado en vertical: sin doble chrome. Verificado en navegador a 1366px (lado a lado, misma altura) y 375px (apilado, ancho completo); axe-core sin violaciones; 1438/1438. SW v191 → v192. **Pendiente (Tarea A):** rebalancear el bento para el caso sin pendientes (reaparece el hueco a la derecha del hero cuando la tarjeta está oculta).

| Archivo | Cambio |
|---|---|
| `index.html` | `#panel-gastos-pendientes` movido dentro del `.bento` tras el hero, ahora `class="bento__cell"` (span 4 desktop / span 1 mobile). |
| `styles/layout.css` | Celda `#panel-gastos-pendientes` bare + nudge interno `flex:1` + `align-content:center` + radius xl. |
| `service-worker.js` | `CACHE_NAME` v191 → v192. |

---

### feat(deudas): selector de tarjetas + reparto-fallback en "Abonar" (4/4 flujos, cierra la serie) · 2026-06-28

Cierra la serie "selector de tarjetas + reparto solo si no alcanza" en los 4 flujos de pago (Gastos, Gasto rápido, Agenda y ahora Deudas). El formulario de abono vuelve a tener el selector de tarjetas (avatar, nombre, saldo); se elige la cuenta y solo si no alcanza se abre el reparto, pre-sembrado y avisando "X no alcanza". `validarAbono` vuelve a exigir `cuentaId`. Verificado en navegador: cubre (Bancolombia $2M, abono $200k) → un solo gasto-abono, sin picker; no cubre (Nequi $100k, abono $500k) → reparto Nequi $100k + Bancolombia $400k, saldo de la deuda baja de $1.500.000 a $1.000.000, saldos de cuentas sin negativos. Tests 1438/1438 (2 actualizados, sin nuevos: la cobertura de `resolverPagoConPreferida` ya existía). SW v187 → v188.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/views/formularios.js` | `renderFormAbono` con `renderSelectorCuenta` (selector de tarjetas restaurado). |
| `modules/dominio/compromisos/logic.js` | `validarAbono` vuelve a exigir `cuentaId`. |
| `modules/dominio/compromisos/index.js` | `_guardarAbono` usa `resolverPagoConPreferida` en vez de `resolverPagoMultiCuenta`. |
| `tests/unit/compromisos.test.js` | Tests de `validarAbono` y `renderFormAbono` actualizados al nuevo contrato (cuentaId requerido, selector presente). |

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
