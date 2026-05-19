# IA_CONTEXT - Finko Claude

> Punto de referencia compacto para asistentes IA (Claude Code, Cursor, Copilot).
> Si recién abrís la carpeta, leé primero [`/CLAUDE.md`](../CLAUDE.md) - contiene el workflow obligatorio.
> Última revisión: 2026-05-17

---

## Qué es este proyecto

**Finko** es una PWA offline-first de gestión financiera personal para Colombia.

- Vanilla JS + ES6 modules. **Sin framework, sin build step, sin TypeScript.**
- Sin servidor. Sin cuenta. Sin sync. Todo vive en `localStorage` (clave `fk_v1`).
- Pensada para personas con poco o ningún conocimiento financiero (lenguaje claro, no técnico).
- Basada en normativa colombiana: SMMLV, UVT, tasa de usura, GMF, prima de servicios.

**Estado:** v1.0.0 estable. Todas las 14 fases originales cerradas.

---

## Antes de tocar código, leer en este orden

1. [`/CLAUDE.md`](../CLAUDE.md) - workflow + reglas innegociables + estado actual.
2. [`TASKS.md`](TASKS.md) - tarea activa hoy (si la hay).
3. [`ARCHITECTURE.md`](ARCHITECTURE.md) - capas, flujo de datos, dependencias.
4. [`CHANGELOG.md`](CHANGELOG.md) - qué se hizo en cada fase ya cerrada.
5. [`ROADMAP.md`](ROADMAP.md) - qué queda para post-v1.0.

---

## Arquitectura en 30 segundos

```
Usuario → data-action → actions.js → handler dominio
                                           │
                                      muta S → save()
                                           │
                                      EventBus.emit('state:change')
                                           │
                                      render.js → view.js → innerHTML
```

- **`S`** = singleton mutable con todos los datos (ingresos, gastos, cuentas, compromisos, metas…).
- **EventBus** = en `state.js`. Desacopla dominios. Ningún dominio sabe del otro.
- **`save()`** = en `storage.js`. Debounced 200ms. Escribe `S` a `localStorage`.

---

## Estructura de un dominio (patrón obligatorio)

```
modules/dominio/<nombre>/
  ├─ logic.js   → Funciones puras. Sin DOM. Sin `S` directo. Recibe datos, devuelve datos.
  ├─ view.js    → Genera HTML (string). Puede leer S. No puede mutarlo.
  └─ index.js   → API pública. Conecta logic + view + EventBus + acciones.
```

Ejemplo correcto:

```js
// logic.js - sin DOM
export function calcularTotalGastos(gastos) {
  return gastos.reduce((acc, g) => acc + g.monto, 0);
}

// view.js - solo render
import { calcularTotalGastos } from './logic.js';
import { S } from '../../core/state.js';
import { f } from '../../infra/utils.js';

export function renderResumen() {
  return `<p>Total: ${f(calcularTotalGastos(S.gastos))}</p>`;
}

// index.js - wiring
import { registrarAccion } from '../../ui/actions.js';
import { renderResumen } from './view.js';
import { registrarRender } from '../../infra/render.js';
import { EventBus } from '../../core/state.js';

export function initGastos() {
  registrarAccion('nuevo-gasto', () => { /* abrir modal */ });
  registrarRender('gastos', renderResumen);
  EventBus.on('state:change', ({ section }) => {
    if (section === 'gastos') /* re-render */
  });
}
```

---

## Capas de módulos (de más bajo a más alto)

```
core/       → state, storage, constants     (sin dependencias)
infra/      → utils, render, a11y, crud, router  (depende solo de core)
ui/         → bootstrap, shell, actions, modales (depende de core + infra)
dominio/    → un dominio cada uno           (depende de core + infra, nunca de otro dominio)
```

---

## CSS - convenciones clave

- Variables: siempre `var(--fk-*)`. Prefijo `--fk-` para todo.
- Capas `@layer` en orden: `reset → base → tokens → layout → components → modals → themes → a11y → responsive → utils`
- Modo oscuro por defecto, modo claro con `body.light-theme`
- Sin valores hardcoded en propiedades visuales (color, tamaño, spacing)

---

## HTML - contrato de eventos

```html
<!-- Correcto: data-action con argumentos -->
<button data-action="guardar-gasto" data-arg-categoria="alimentacion">Guardar</button>

<!-- Incorrecto: onclick directo -->
<button onclick="guardarGasto()">Guardar</button>
```

El delegador en `actions.js` resuelve la acción y convierte `data-arg-*` en argumentos del handler.

---

## Modales - contrato

- Abrir: `abrirModal('#modal-gasto')` - quita `aria-hidden`, agrega `data-open=""`, trapFocus.
- Cerrar: `cerrarModal('#modal-gasto')` - pone `aria-hidden="true"`, quita `data-open`, releaseFocus.
- HTML del modal vive en `index.html` (estático). El form interno se inyecta dinámicamente.
- Escape cierra el modal activo (manejado en `actions.js`).

---

## Constantes legales - protocolo de actualización

`modules/core/constants.js` tiene constantes con vencimiento trimestral o anual:
- **Tasa de usura** - SFC (Superintendencia Financiera), trimestral.
- **SMMLV** - Mintrabajo, enero cada año.
- **UVT** - DIAN, enero cada año.
- **GMF** - 4×1000, estable por ley.

Cada constante tiene un comentario `// Vigente hasta: YYYY-QN`.

---

## Patrones a seguir

### CRUD genérico

```js
import { guardar, editar, eliminar } from '../../infra/crud.js';

guardar('gastos', { descripcion, monto, categoria, fecha });
editar('gastos', id, { monto: 150000 });
eliminar('gastos', id);
```

### Render inteligente

`renderSmart` evita re-renderizar secciones que el usuario no está viendo.

```js
import { renderSmart } from '../../infra/render.js';

EventBus.on('state:change', ({ section }) => {
  if (section === 'gastos') renderSmart(renderGastos, 'gastos');
});
```

### Announce para accesibilidad

```js
import { announce } from '../../infra/a11y.js';

announce('Gasto guardado correctamente');       // polite
announce('Error: monto inválido', 'assertive'); // urgente
```

---

## Qué NO hacer

- No crear archivos fuera de la estructura propuesta sin discutirlo.
- No agregar dependencias de runtime (`package.json` solo tiene devDeps).
- No escribir tests de UI con mocks pesados - los tests son de `logic.js` puro + happy-dom para axe.
- No usar `alert()` / `confirm()` nativos - usar `dialogo()` de `infra/utils.js`.
- No hardcodear colores, tamaños o espaciados en CSS - usar tokens.
- No hacer cambios destructivos (eliminar archivos, `reset --hard`) sin aprobación explícita.
- No actualizar fases en ROADMAP/TASKS mezclando "hecho" y "pendiente" - usar CHANGELOG para lo hecho.

---

## Prompt recomendado para iniciar una nueva sesión

```
Estoy trabajando en Finko Claude (PWA offline-first de gestión financiera para Colombia).

Acabás de leer:
- CLAUDE.md (workflow + reglas)
- docs/TASKS.md (tarea activa)

Tarea de esta sesión: [DESCRIBIR UNA SOLA TAREA]

Recordá:
- Tarea por tarea - no anticipar la siguiente.
- Al cerrar, decir archivos cambiados + cómo verificar en la app + tests.
- Bloque de cierre con modelo+esfuerzo sugerido para la próxima.
- npm test verde antes de commitear.
```
