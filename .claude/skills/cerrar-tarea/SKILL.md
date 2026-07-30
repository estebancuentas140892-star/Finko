---
name: cerrar-tarea
description: Ejecuta el cierre de una tarea de Finko: las compuertas de verificación antes de commitear, la secuencia de actualización de documentos, el chequeo de techos de tamaño y el reporte de supervisión para el usuario. Usar al terminar cualquier tarea, rebanada o fase, antes y después del commit.
---

# Cerrar una tarea en Finko

Este es el **punto único de ejecución del cierre**. Ningún otro documento describe el paso a paso: `CLAUDE.md` fija la norma en una línea y apunta acá; `CONTRIBUTING.md` es dueño de **qué se exige** (las compuertas) y este archivo de **cómo se ejecuta**.

Orden: compuertas → commit → documentos → techos → reporte. No saltarse el orden: commitear antes de verificar deja la rama en rojo, y actualizar documentos antes del commit deja el hash sin conocer.

---

## 1. Compuertas antes de commitear

Las cuatro son obligatorias. Si alguna falla, se arregla la causa: no se commitea igual ni se salta con `--no-verify`.

| # | Compuerta | Cómo se ejecuta | Cuándo aplica |
|---|---|---|---|
| 1 | Tests unitarios verdes | `pnpm test` | siempre que se tocó `modules/` o `tests/` |
| 2 | Lint verde | `pnpm run lint` | siempre que se tocó `.js` |
| 3 | Cero guion largo (U+2014, U+2013) | comando de abajo | siempre, también en tareas de solo documentación |
| 4 | Bump del Service Worker | subir `CACHE_NAME` en `service-worker.js`, ver `OPERACION.md` runbook 3 | siempre que cambió un archivo que el SW precachea (`.js`, `.css`, `index.html`, `docs/legal/*.md`) |
| 5 | E2E verdes si el diff toca markup | `pnpm run e2e:check`; si dice OBLIGATORIA, `pnpm run test:e2e` | lo decide el script, no el criterio de quien cierra |

Compuerta 3, en Git Bash. **Salida vacía significa que pasa:**

```bash
git ls-files -z '*.md' '*.js' '*.css' '*.html' | LC_ALL=C.UTF-8 xargs -0 grep -nP '[\x{2013}\x{2014}]'
```

Tres detalles que costaron tres intentos y por eso quedan escritos: el `LC_ALL` va **sobre el `xargs`** (antes del `git` no llega al `grep`, y sin él `grep -P` falla con "supports only unibyte and UTF-8 locales"); `git ls-files` evita que el recorrido se cuelgue en `node_modules` y que `coverage/`, que es generado, dé falsos positivos; y la herramienta `Grep` de Claude Code acepta el mismo patrón sin forzar locale.

**Compuerta 5, desde 2026-07-30.** E2E dejó de ser opcional: `pnpm run e2e:check` mira las líneas que cambiaron y responde si es obligatoria. Dispara con cualquier señal de markup (`class=`, `id=`, `data-*=`, `href=`, `aria-*=`, un `[data-x]` en CSS o en un `querySelector`, un tag HTML, `innerHTML`). Ignora `docs/`, `scripts/`, `tests/unit/` y `tests/integration/`, que no pueden mover un selector.

Existe porque la norma escrita no alcanzó: DIS.19 cambió el markup de la casa de Ahorro, actualizó los tests unitarios y no los E2E, y la suite pasó **dos días en rojo** con 146 tests sin ejecutar hasta que el cierre de otra tarea la corrió (BUG-019). Que la decisión sea de un script y no de un juicio es todo el punto: quien cierra no tiene que acordarse.

Sigue tardando ~3,5 minutos, así que conviene lanzarla en segundo plano al empezar el cierre y leer el resultado antes de commitear. Si `e2e:check` dice que no hace falta, decirlo en el reporte en vez de dejar la duda.

Si la tarea fue **solo de documentación**, aplican la 3 y nada más: decirlo explícitamente en el reporte ("sin tocar `modules/`, no hay tests que correr") en vez de dejar la duda.

---

## 2. Commit y push

- Formato del mensaje y tipos: `CONTRIBUTING.md` sección "Commits".
- Cuerpo del mensaje en **ASCII sin acentos** (convención vigente del repo, ver `git log`).
- Terminar con el trailer `Co-Authored-By` que usa el repo.
- **Commit y push son autónomos:** no se pide permiso, pero solo después de que las compuertas den verde. Si algo quedó en rojo, se reporta y no se commitea.
- Una tarea puede necesitar varios commits pequeños. Preferir varios chicos y legibles a uno grande, y **aislar los borrados en su propio commit** para que el diff sea reversible.

---

## 3. Secuencia de documentos

Cuatro ediciones siempre, dos condicionales. Tres de las cuatro son de una a tres líneas: la única edición larga es la ficha de contexto, porque es la que se lee antes de volver a tocar esa funcionalidad.

1. **`docs/contexto/<sección>.md`** (edición sustantiva). Actualizar el bloque de la funcionalidad tocada: `Estado actual`, `Cambios pendientes`, `Riesgos` si aparecieron, y `Verificado contra` con el commit nuevo. En `Cambios realizados` va **una línea por hito** (`YYYY-MM-DD <ID>: qué`), nunca un párrafo: el detalle vive en el CHANGELOG. Si el bloque no existía, se escribió al empezar la tarea, no ahora.
2. **`docs/CHANGELOG.md`** (una entrada). Antes de escribir, comprobar la rotación: si el mes de la última entrada no es el mes actual, mover el mes cerrado a `docs/changelog/YYYY-MM.md` y dejar CHANGELOG.md con el mes nuevo más el índice. Desde 2026-08 el formato de entrada es **una fila de tabla por tarea**: fecha, ID, tipo(área), qué cambió, commit, puntero a la ficha. La columna "qué cambió" contiene el punto que **no** se deduce del diff.
3. **`docs/HANDOFF.md`** (una a tres líneas). Agregar la tarea al tope de "Qué se hizo recientemente", bajar la sexta al puntero de tareas anteriores, y actualizar la tabla de métricas solo si alguna cifra cambió. Tres líneas, no quince.
4. **`docs/BOARD.md`** (borrar). Eliminar la tarjeta cerrada. Si la tarea era una rebanada, dejar la tarjeta padre con las rebanadas que faltan y **cero narrativa de lo que ya cerró**. Si la tarea destapó trabajo nuevo, entra por la skill `triaje-tarea`, no directo.

Condicionales:

5. **`docs/BUGS.md`**, solo si la tarea abrió o cerró un error verificado. Al cerrarlo, se borra su entrada y el CHANGELOG referencia el ID.
6. **`docs/DECISIONS/NNN-*.md`**, solo si hubo una decisión con alternativas rechazadas. Un ADR no se reescribe: si cambia una decisión previa, se escribe uno nuevo que la supersede.

Y si la tarea introdujo una convención nueva, `docs/ARCHITECTURE.md` o `docs/CONTRIBUTING.md` según sea técnica o de proceso.

**La prueba de que la secuencia está bien hecha:** el mismo hecho no aparece narrado dos veces. Si el CHANGELOG y la ficha dicen lo mismo con otras palabras, sobra uno de los dos.

---

## 4. Techos de tamaño y vigencia

Antes de cerrar, verificar que ningún archivo vivo superó su techo. Superarlo no se "deja pasar": obliga a podar o a partir por eje real.

| Archivo | Techo (KB) |
|---|---|
| `CLAUDE.md` | 12 |
| `docs/HANDOFF.md` | 6 |
| `docs/BOARD.md` | 40 |
| `docs/BUGS.md` | 6 |
| `docs/CHANGELOG.md` (mes corriente) | 60 |
| `docs/ARCHITECTURE.md` | 32 |
| `docs/CONTRIBUTING.md` | 5 |
| `docs/DESIGN_SYSTEM.md` | 20 |
| `docs/SECURITY.md` | 8 |
| `docs/OPERACION.md` | 10 |
| ficha de `docs/contexto/` | 40 (objetivo 25) |
| ADR | 20 |
| `SKILL.md` | 8 |
| mes cerrado de `docs/changelog/` | 200 |

```bash
for f in CLAUDE.md docs/HANDOFF.md docs/BOARD.md docs/BUGS.md docs/CHANGELOG.md docs/ARCHITECTURE.md docs/CONTRIBUTING.md docs/DESIGN_SYSTEM.md docs/SECURITY.md; do printf '%6s KB  %s\n' "$(( ($(wc -c < "$f") + 1023) / 1024 ))" "$f"; done
```

**Vigencia (principio 11):** todo documento activo que se toque lleva su sello `Revisado: YYYY-MM-DD` actualizado. Los que pasen de 90 días sin modificación quedan "por validar" y hay que verificarlos contra el código antes de citarlos como fuente de verdad:

```bash
git ls-files -- '*.md' ':(exclude)docs/DECISIONS/*' ':(exclude)docs/changelog/*' ':(exclude)docs/archive/*' ':(exclude)docs/legal/*' | while read -r f; do echo "$(git log -1 --format=%as -- "$f")  $f"; done | sort
```

---

## 5. Reporte de supervisión

El usuario no lee el diff: verifica en la app. El reporte va **siempre**, en este orden, y es la parte que no se puede automatizar.

1. **Qué archivos cambiaron**, con rutas relativas y enlazadas.
2. **Qué cambió en cada uno**, una o dos líneas por archivo.
3. **Cómo verificarlo en la app**, paso a paso: ruta visual, sección, modal, botón, y el dato exacto que debe verse distinto. Si hace falta servidor (`python -m http.server 8080`) o un script, decirlo.
4. **Qué tests cubren el cambio** y con qué cifras quedaron.

Reglas del reporte:

- **Alcance honesto.** Si algo del alcance original quedó fuera, decirlo con su razón, no omitirlo. Si se encontró un defecto preexistente, decirlo aunque no se haya arreglado.
- **Área declarada vs. diff real.** Si la tarjeta se marcó `code` y el diff termina siendo mayoritariamente `styles/**`, markup o assets, anotarlo en el reporte como posible mala clasificación. No es motivo para revertir el cambio ni bloquear el commit.
- **Si se corrigió el plan de la tarjeta**, explicarlo: el usuario aprobó ese plan y merece saber por qué cambió.
- **El reporte no se cierra con recomendaciones.** Nada de prompt para la siguiente tarea, modelo, programa ni nivel de esfuerzo: eso lo decide el usuario (`CLAUDE.md` seccion 2, Estándar de comunicación). El punto "Próximo paso" solo aparece si hay una decisión pendiente suya, y es una pregunta, no una recomendación de ejecución.
