# Guía de contribución - Finko Claude

---

## Principio rector

> Una tarea bien hecha hoy ahorra cinco mal hechas la semana que viene.

---

## Antes de empezar

1. Lee [ARCHITECTURE.md](ARCHITECTURE.md) (10 min)
2. Lee [TASKS.md](TASKS.md) - cuál es la tarea activa
3. Lee el `REORG_*.md` o `DESIGN_SYSTEM.md` de la fase activa
4. Corre `npm test` - debe pasar en verde antes de tocar nada

---

## Flujo de trabajo

```
1. Arrancar desde la fase activa en TASKS.md
2. Hacer UNA sola tarea a la vez
3. npm test - verde obligatorio antes de commitear
4. Commitear con el formato correcto
5. Actualizar TASKS.md (mover tarea a completada)
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
- **Usar tokens CSS** - `var(--fk-color-primary)` nunca colores hardcoded.
- **Respetar `@layer`** - no agregar reglas en capas incorrectas.
- **Modo oscuro incluido** - toda nueva clase debe funcionar en ambos temas.

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
- `npm test` debe pasar en verde antes de cada commit.

---

## Tests

- Cada `logic.js` nuevo tiene su `nombre.test.js` en `tests/unit/`.
- Los tests corren con `npm test` (Vitest + happy-dom).
- Los tests de lógica financiera nunca usan mocks de `localStorage` - usan `happy-dom` o datos puros.
- Cobertura objetivo: ≥ 90% en archivos de `core/` y `dominio/*/logic.js`.

```bash
npm test              # Corre todos los tests una vez
npm run test:watch    # TDD: re-corre al guardar
npm run coverage      # Muestra cobertura detallada
```

---

## Actualizar constantes legales

Las constantes en `modules/core/constants.js` tienen vencimiento trimestral.
Protocolo cuando cambian (cada Q):

1. Abrir `constants.js` y buscar `// REVISAR:`
2. Actualizar los valores con fuente oficial (SFC, DIAN, Mintrabajo)
3. Agregar comentario con la fuente y fecha de vigencia
4. Bumpear `CACHE_NAME` en `service-worker.js`
5. Commit: `chore: actualizar constantes legales Q2-2026`
6. Agregar entrada en `CHANGELOG.md`

---

## Para asistentes IA

Antes de tocar código, leer en este orden:

1. [IA_CONTEXT.md](IA_CONTEXT.md) - resumen completo del proyecto
2. [TASKS.md](TASKS.md) - tarea activa y siguiente paso
3. [ARCHITECTURE.md](ARCHITECTURE.md) - reglas innegociables
4. El archivo específico de la fase activa

Nunca hacer cambios destructivos (eliminar archivos, force push) sin confirmación explícita del humano.
