# Guía de contribución - Finko Claude

---

## Principio rector

> Una tarea bien hecha hoy ahorra cinco mal hechas la semana que viene.

---

## Antes de empezar

1. Lee [ARCHITECTURE.md](ARCHITECTURE.md) (10 min)
2. Lee [BOARD.md](BOARD.md) - cuál es la tarjeta en proceso o la siguiente a elegir
3. Si la tarjeta toca CSS/tokens, revisa [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)
4. Corre `pnpm test` - debe pasar en verde antes de tocar nada

---

## Flujo de trabajo

```
1. Elegir una tarjeta pendiente de BOARD.md
2. Hacer UNA sola tarea a la vez
3. pnpm test - verde obligatorio antes de commitear
4. Commitear con el formato correcto
5. Actualizar BOARD.md (borrar la tarjeta completada) + CHANGELOG.md
6. Reportar próxima tarea recomendada
```

---

## Reglas de código

### JavaScript

- **Sin build step.** Vanilla JS ES6 modules. El navegador los entiende directamente.
- **Sin `window.X`** - toda función o variable debe exportarse con `export`. Comunicación cross-módulo: EventBus.
- **Sin `onclick=""` en HTML** - todo vía `data-action` delegado en `actions.js`.
- **`logic.js` sin DOM** - los cálculos no pueden usar `document`, `window` ni `localStorage`. Solo reciben datos, devuelven datos.
- **`save()` siempre** - toda mutación de `S` va seguida de `save()` de `storage.js`. Nunca escribir a `localStorage` directamente.
- **JSDoc en funciones públicas** (opcional pero bienvenido):
  ```js
  /**
   * @param {number} monto - Monto en COP
   * @param {number} tasa - Tasa anual efectiva (ej: 0.24 = 24%)
   * @returns {number} Cuota mensual en COP
   */
  export function calcularCuota(monto, tasa) { ... }
  ```

### CSS

- **Sin `style=""` inline** - siempre clases del design system.
- **Usar tokens CSS** - `var(--fk-accent)`, `var(--fk-space-4)`, nunca colores o tamaños hardcoded. Ver [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) para el catálogo completo.
- **Respetar `@layer`** - no agregar reglas en capas incorrectas.
- **Modo oscuro incluido** - toda nueva clase debe funcionar en ambos temas (probar los dos antes de commitear).

### HTML

- **Semántica correcta** - `<button>` para acciones, `<a>` para navegación, `<input type="...">` correcto.
- **ARIA cuando el HTML semántico no alcanza** - no usar ARIA para redundar lo que ya dice el HTML.
- **Atributos `data-action`** - siempre `kebab-case verbo-sustantivo`: `guardar-gasto`, `editar-meta`.

---

## Naming

| Elemento | Convención | Ejemplo |
|---|---|---|
| Dominios JS | Español neutro | `ingresos`, `compromisos` |
| Infra/UI JS | Inglés | `render`, `actions`, `shell` |
| Archivos CSS | kebab-case | `tokens.css`, `main.css` |
| Variables CSS | `--fk-*` prefijo | `--fk-color-accent`, `--fk-space-4` |
| Funciones de dominio | camelCase ES | `calcularCuota`, `ordenarDeudas` |
| Eventos EventBus | `dominio:acción` | `state:change`, `ui:navigate` |
| `data-action` | kebab-case verbo-sustantivo | `guardar-gasto`, `abrir-modal-deuda` |
| Tests | `nombre.test.js` | `storage.test.js` |

---

## Commits

Formato: `tipo(área): descripción corta en español`

**Tipos:**

| Tipo | Cuándo |
|---|---|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `refactor` | Refactor sin cambio de comportamiento |
| `test` | Agregar o arreglar tests |
| `docs` | Solo documentación |
| `style` | Formato, sin cambio lógico |
| `chore` | Tareas de mantenimiento (deps, config) |
| `perf` | Mejora de rendimiento |
| `a11y` | Mejoras de accesibilidad |

**Ejemplos:**

```
feat(gastos): agregar detector de gastos hormiga
fix(storage): corregir migración v1→v2 con datos vacíos
test(compromisos): agregar tests de avalancha y bola de nieve
docs(architecture): actualizar árbol de dependencias
chore: actualizar SMMLV y UVT para 2026
a11y(modales): implementar focus trap en todos los modales
```

**Reglas:**
- Descripción en español, imperativo presente: "agregar", "corregir", "actualizar" (no "agregué", "agregando").
- Máximo 72 caracteres en la primera línea.
- Si el commit afecta múltiples áreas, usa el área más importante o `app`.
- `pnpm test` debe pasar en verde antes de cada commit.

---

## Tests

- Cada `logic.js` nuevo tiene su `nombre.test.js` en `tests/unit/`.
- Los tests corren con `pnpm test` (Vitest + happy-dom).
- Los tests de lógica financiera nunca usan mocks de `localStorage` - usan `happy-dom` o datos puros.
- Cobertura objetivo: ≥ 90% en archivos de `core/` y `dominio/*/logic.js`.

```bash
pnpm test              # Corre todos los tests una vez
pnpm run test:watch    # TDD: re-corre al guardar
pnpm run coverage      # Muestra cobertura detallada
```

---

## Actualizar constantes legales

Las únicas constantes con vencimiento son anuales: **SMMLV**, **auxilio de transporte** y **UVT** (regla ADN 12; la tasa de usura se eliminó del producto, ver [ADR 004](DECISIONS/004-eliminar-tasa-usura.md)). Viven en `LEGAL_POR_ANIO` dentro de `modules/core/constants.js`.

Protocolo cuando se publican los valores nuevos (normalmente en enero):

1. Buscar los valores oficiales: DIAN (UVT) y Mintrabajo (SMMLV, auxilio de transporte).
2. En `constants.js`, agregar **una entrada nueva** en `LEGAL_POR_ANIO` para el año (no se crean exports `_20XX` sueltos; toda la app lee de la tabla histórica).
3. Correr `pnpm test` (incluye `tests/unit/constants.test.js`).
4. Bumpear `CACHE_NAME` en `service-worker.js`.
5. Commit: `feat(E.2): cargar SMMLV + auxilio + UVT <año>`.
6. Agregar entrada en `CHANGELOG.md`.

Detalle paso a paso en [`HANDOFF.md`](HANDOFF.md) sección "Recordatorio enero 2027".

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

### Modales - contrato

- Abrir: `abrirModal('#modal-gasto')` - quita `aria-hidden`, agrega `data-open=""`, `trapFocus`, marca `.app-shell` como `inert`.
- Cerrar: `cerrarModal('#modal-gasto')` - pone `aria-hidden="true"`, quita `data-open`, libera el `inert`, `releaseFocus`.
- HTML del modal vive en `index.html` (estático). El formulario interno se inyecta dinámicamente.
- Escape cierra el modal activo (manejado en `actions.js`).

### Selector de cuenta compartido (patrón 0/1/varias)

Cualquier flujo que mueva dinero (gasto, abono, aporte) usa el mismo patrón: sin cuentas activas → seguimiento sin descuento; una cuenta → autoselección; varias → selector con reparto automático si ninguna alcanza sola.

```js
import { renderSelectorCuenta, resolverPagoConPreferida } from '../../infra/cuenta-helper.js';
```

---

## Qué NO hacer

- No crear archivos fuera de la estructura propuesta sin discutirlo.
- No agregar dependencias de runtime (`package.json` solo tiene devDeps).
- No escribir tests de UI con mocks pesados - los tests son de `logic.js` puro + happy-dom para axe.
- No usar `alert()` / `confirm()` nativos - usar `dialogo()` de `infra/utils.js` o el overlay de `ui/confirm.js`.
- No hardcodear colores, tamaños o espaciados en CSS - usar tokens.
- No hacer cambios destructivos (eliminar archivos, `reset --hard`) sin aprobación explícita.
- No dejar tarjetas cerradas en `BOARD.md` - se borran al cerrar la tarea, la historia va en `CHANGELOG.md`.

---

## Para asistentes IA

Antes de tocar código, leer en este orden:

1. [`/CLAUDE.md`](../CLAUDE.md) - workflow obligatorio + reglas ADN + estado actual.
2. [BOARD.md](BOARD.md) - tarjeta en proceso y pendientes por sección.
3. [ARCHITECTURE.md](ARCHITECTURE.md) - capas, flujo de datos, reglas innegociables.
4. El archivo de decisión (`DECISIONS/NNN-*.md`) si la tarjeta lo referencia.

Nunca hacer cambios destructivos (eliminar archivos, force push) sin confirmación explícita del humano.
