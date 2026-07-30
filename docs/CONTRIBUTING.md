# Guía de contribución - Finko Claude

> Este documento es dueño de **dos cosas**: el formato de los commits y qué se exige antes de commitear. Nada más.
> Lo que se movió de acá porque ya tenía dueño: las reglas de código y los patrones técnicos viven en [`ARCHITECTURE.md`](ARCHITECTURE.md) y en el ADN de [`/CLAUDE.md`](../CLAUDE.md) seccion 4; el workflow, en `/CLAUDE.md` seccion 2; el runbook de constantes legales, en [`OPERACION.md`](OPERACION.md) runbook 2; la secuencia de cierre, en la skill `cerrar-tarea`. Duplicarlas acá era la razón de que este archivo pesara el doble de su techo.
> Revisado: 2026-07-30.

> Una tarea bien hecha hoy ahorra cinco mal hechas la semana que viene.

---

## Antes de empezar

1. [`/CLAUDE.md`](../CLAUDE.md): workflow, ADN y estándar de comunicación. Es el punto de entrada.
2. [`BOARD.md`](BOARD.md): la tarjeta en proceso, o la siguiente a elegir.
3. La ficha de la sección en [`contexto/`](contexto/README.md) antes de tocarla.
4. `pnpm test` en verde antes de tocar nada.

Si la tarjeta toca CSS o tokens, además [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).

---

## Commits

Formato: `tipo(área): descripción corta en español`.

| Tipo | Cuándo |
|---|---|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `refactor` | Refactor sin cambio de comportamiento |
| `test` | Agregar o arreglar tests |
| `docs` | Solo documentación |
| `style` | Formato, sin cambio lógico |
| `chore` | Mantenimiento (deps, config) |
| `perf` | Mejora de rendimiento |
| `a11y` | Accesibilidad |

```
feat(gastos): agregar detector de gastos hormiga
fix(storage): corregir migracion v1 a v2 con datos vacios
a11y(modales): implementar focus trap en todos los modales
```

**Reglas:**

- Imperativo presente: "agregar", "corregir". No "agregué" ni "agregando".
- Máximo 72 caracteres en la primera línea.
- **Cuerpo en ASCII sin acentos** (convención vigente del repo).
- Si toca varias áreas, usar la más importante o `app`.
- Varios commits chicos y legibles antes que uno grande. Los borrados van en su propio commit, para que el diff sea reversible.

---

## Qué se exige antes de commitear

Las cinco compuertas. La ejecución paso a paso es de la skill `cerrar-tarea`; acá está **qué** se exige.

| # | Compuerta | Cuándo aplica |
|---|---|---|
| 1 | `pnpm test` en verde | se tocó `modules/` o `tests/` |
| 2 | `pnpm run lint` en verde | se tocó `.js` |
| 3 | Cero U+2014 y U+2013 | siempre, también en tareas de solo documentación |
| 4 | Bump de `CACHE_NAME` | cambió un archivo que el SW precachea |
| 5 | E2E en verde | el cambio toca runtime. Lo responde `pnpm run e2e:check` |

Ninguna se salta con `--no-verify`. Si una queda en rojo, se arregla la causa o se reporta sin commitear.

### Compuerta 5, en detalle

Es obligatoria en cuanto se toca `index.html`, `modules/`, `styles/` o `service-worker.js`. No la dispara `docs/`, `scripts/` ni `tests/unit/`.

No depende de que alguien se acuerde: `.githooks/pre-commit` bloquea el commit si falta un sello E2E verde para ese runtime exacto. El hook compara huellas y no corre Playwright, así que es instantáneo y la suite se corre una vez por lote, no una vez por commit. `pnpm run test:e2e` escribe el sello al salir verde.

Activarlo en un clon nuevo: `pnpm run hooks:on`. Detalle y motivo: [`OPERACION.md`](OPERACION.md) runbook 5.

---

## Tests

- Cada `logic.js` nuevo tiene su `nombre.test.js` en `tests/unit/`.
- Los tests de lógica financiera no usan mocks de `localStorage`: usan `happy-dom` o datos puros.
- Cobertura objetivo: 90 % o más en `core/` y `dominio/*/logic.js`.

Dos reglas que costaron una suite caída dos días (BUG-019 y BUG-020):

- **En E2E, un `[data-action="..."]` va acotado a su sección**: `#sec-metas [data-action="nueva-meta"]`, nunca suelto. Las 15 secciones viven siempre en el DOM (solo cambia `display`), y desde DIS.19 cada carril de `#ahorro` repite la `data-action` de su sección: un selector suelto se queda con el botón de una sección oculta.
- **Un test que afirma una distancia en días fija el reloj** con `vi.setSystemTime` y usa el día explícito. Envolver con `% 28` mantiene el día válido pero le cambia el offset los días 29 a 31, que es justo lo que el test afirmaba. Referencia: `tests/unit/agenda.test.js`.

Comandos: [`README.md`](../README.md), que es la única lista.

---

## Qué NO hacer

- No agregar dependencias de runtime: `package.json` solo tiene devDeps, y antes de tocarlas se lee [`SECURITY.md`](SECURITY.md).
- No dejar tarjetas cerradas en `BOARD.md`: se borran al cerrar, la historia va al `CHANGELOG.md`.
- No cerrar una respuesta con la próxima tarea, el modelo ni el nivel de esfuerzo recomendados: lo prohíbe `/CLAUDE.md` seccion 2.
- No hacer cambios destructivos (eliminar archivos, `reset --hard`, force push) sin aprobación explícita.

Naming: [`ARCHITECTURE.md`](ARCHITECTURE.md) seccion 11. Reglas de JS, CSS y HTML: el ADN de [`/CLAUDE.md`](../CLAUDE.md) seccion 4.
