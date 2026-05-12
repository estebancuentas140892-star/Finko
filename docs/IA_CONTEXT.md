# IA_CONTEXT — Finko Claude

> Este documento es el punto de entrada para cualquier asistente IA (Claude, Cursor, Copilot, etc.)
> que trabaje en este proyecto. Leerlo toma 5 minutos y da suficiente contexto para no romper nada.
>
> Última revisión: 2026-05-12 (Fase 1)

---

## Qué es este proyecto

**Finko** es una PWA offline-first de gestión financiera personal para Colombia.
- Sin servidor. Sin cuenta. Sin sincronización. Todo vive en `localStorage` del usuario.
- Vanilla JS + ES6 modules. Sin framework. Sin build step. Sin TypeScript.
- Pensada para personas con poco o ningún conocimiento financiero (lenguaje claro, no técnico).
- Basada en normativa colombiana: SMMLV, UVT, tasa de usura, GMF, prima de servicios.

---

## Antes de tocar código, leer en este orden

1. **Este archivo** (estás aquí) — 5 min
2. [TASKS.md](TASKS.md) — cuál es la tarea activa ahora mismo
3. [ARCHITECTURE.md](ARCHITECTURE.md) — reglas innegociables de la arquitectura
4. El documento específico de la fase activa (ver TASKS.md → link a ROADMAP.md)

---

## Estado actual del proyecto

| Ítem | Estado |
|---|---|
| Fase activa | Fase 1 — Esqueleto y documentación |
| Siguiente fase | Fase 2 — Design System + CSS |
| Tests | Sin tests todavía (se agregan en Fase 4+) |
| App en navegador | Stub mínimo (solo `index.html` + CSS vacío) |

Ver [ROADMAP.md](ROADMAP.md) para el mapa completo de 14 fases.

---

## Reglas que NUNCA se rompen

1. **Sin build step** — no agregar Vite como bundler, no TypeScript, no Babel.
2. **Sin `window.X`** — ninguna función o variable global. Todo: `export` + `import`.
3. **Sin `onclick=""`** — toda interacción vía `data-action` delegado en `actions.js`.
4. **Sin `style=""` inline** — solo clases CSS del design system.
5. **`logic.js` sin DOM** — los cálculos de dominio son funciones puras, sin `document`.
6. **`save()` siempre tras mutar `S`** — nunca escribir a localStorage directamente.
7. **Ningún dominio importa a otro dominio** — comunicación solo por EventBus.
8. **`npm test` verde antes de cada commit** — sin excepciones.

Romper cualquiera de estas reglas requiere una discusión explícita con el humano y un ADR en `docs/DECISIONS/`.

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

**`S`** = singleton mutable con todos los datos del usuario (gastos, deudas, cuentas, metas…).
**EventBus** = en `state.js`. Desacopla dominios. Ningún dominio sabe del otro.
**`save()`** = en `storage.js`. Debounced 200ms. Escribe `S` a `localStorage`.

---

## Estructura de un dominio (patrón obligatorio)

```
modules/dominio/nombre/
  ├─ logic.js   → Funciones puras. Sin DOM. Sin S directo. Recibe datos, devuelve datos.
  ├─ view.js    → Genera strings HTML. Puede leer S. No puede mutarlo.
  └─ index.js   → Exporta la API pública. Conecta logic + view + EventBus.
```

```js
// logic.js — correcto
export function calcularTotalGastos(gastos) {
  return gastos.reduce((acc, g) => acc + g.monto, 0);
}

// view.js — correcto
import { calcularTotalGastos } from './logic.js';
export function renderResumen() {
  const total = calcularTotalGastos(S.gastos);
  return `<p>Total: ${f(total)}</p>`;
}
```

---

## Capas de módulos (de más bajo a más alto)

```
core/       → state, storage, constants     (sin dependencias externas)
infra/      → utils, render, a11y, crud     (depende de core)
ui/         → bootstrap, shell, actions     (depende de core + infra + dominio)
dominio/    → lógica por área               (depende de core + infra, nunca de otro dominio)
```

---

## CSS — convenciones clave

- Variables: siempre `var(--fk-*)`. Prefijo `--fk-` para todo.
- Capas `@layer` en orden: `reset → base → tokens → layout → components → modals → themes → a11y → responsive → utils`
- Modo oscuro por defecto, modo claro con `body.light-theme`
- Sin valores hardcoded en propiedades visuales (color, tamaño, spacing)

---

## HTML — contrato de eventos

```html
<!-- Correcto: data-action con argumentos -->
<button data-action="guardar-gasto" data-arg-categoria="alimentacion">Guardar</button>

<!-- Incorrecto: onclick directo -->
<button onclick="guardarGasto()">Guardar</button>
```

El delegador en `actions.js` convierte automáticamente los `data-arg-*` en parámetros del handler.

---

## Constantes legales — protocolo de actualización

El archivo `modules/core/constants.js` tiene constantes con vencimiento trimestral.
Cada Q, verificar y actualizar:
- **Tasa de usura** — publicada por la SFC (Superintendencia Financiera)
- **SMMLV** — Salario Mínimo Mensual Legal Vigente (Mintrabajo, enero cada año)
- **UVT** — Unidad de Valor Tributario (DIAN, enero cada año)
- **GMF** — 4×1000 (estable por ley, verificar si cambia)

Cada constante tiene un comentario `// Vigente hasta: YYYY-QN` en el código.

---

## Patrones a seguir (tomados del proyecto de referencia)

### CRUD genérico

Usar `crud.js` en lugar de repetir guardar/editar/eliminar en cada dominio:

```js
import { guardar, editar, eliminar } from '../../infra/crud.js';

// Guardar un gasto nuevo
guardar('gastos', { descripcion, monto, categoria, fecha });

// Editar por ID
editar('gastos', id, { monto: 150000 });

// Eliminar por ID
eliminar('gastos', id);
```

### Render inteligente

`renderSmart` evita re-renderizar secciones que el usuario no está viendo:

```js
import { renderSmart } from '../../infra/render.js';

EventBus.on('state:change', ({ section }) => {
  if (section === 'gastos') renderSmart(renderGastos, 'gastos');
});
```

### Announce para accesibilidad

Notificar a screen readers tras acciones importantes:

```js
import { announce } from '../../infra/a11y.js';

announce('Gasto guardado correctamente'); // Polite
announce('Error: monto inválido', 'assertive'); // Urgente
```

---

## Qué NO hacer

- No crear archivos fuera de la estructura propuesta sin discutirlo.
- No agregar dependencias de runtime (el `package.json` solo tiene devDeps).
- No escribir tests de UI con mocks pesados — los tests son de `logic.js` puro.
- No usar `alert()` / `confirm()` nativos — usar `dialogo()` de `infra/utils.js`.
- No hardcodear colores, tamaños o espaciados en CSS — usar tokens.
- No hacer cambios destructivos (eliminar archivos, reset --hard) sin aprobación.

---

## Contexto del proyecto de referencia

Este proyecto nace de **Finko-Refactor** (v4.x, 1.311 tests), que tenía:
- 4 archivos de dominio > 1.500 LOC (analisis.js: 2.849 LOC)
- 210 asignaciones `window.X`
- 341 `style=""` inline
- CRUD duplicado 6-8 veces
- Sin separación logic/view

Finko Claude resuelve todos esos problemas desde el día 1, sin heredar la deuda.
La **lógica financiera** del proyecto anterior es valiosa y se portará aquí fase por fase,
pero reescrita con la separación `logic.js` / `view.js` correcta.

---

## Prompt recomendado para iniciar una nueva sesión de trabajo

```
Estoy trabajando en Finko Claude, una PWA offline-first de gestión financiera para Colombia.

Leer primero:
1. docs/IA_CONTEXT.md (ya leído — es este archivo)
2. docs/TASKS.md — tarea activa
3. docs/ARCHITECTURE.md — reglas innegociables

Tarea de esta sesión: [DESCRIBIR UNA SOLA TAREA]

Reglas:
- Sin build step, sin window.X, sin onclick=""
- npm test verde antes de cada commit
- No tocar nada fuera del scope de esta tarea
- Si algo falla, parar y mostrar el error — no improvisar
```
