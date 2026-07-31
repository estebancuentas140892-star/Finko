---
name: cerrar-tarea
description: Ejecuta el cierre de una tarea de Finko: las compuertas de verificación antes de commitear, la secuencia de actualización de documentos, el chequeo de techos de tamaño y el reporte de supervisión para el usuario. Usar al terminar cualquier tarea, rebanada o fase, antes y después del commit.
---

# Cerrar una tarea en Finko

**Punto único de ejecución del cierre.** `CONTRIBUTING.md` es dueño de qué se exige; este archivo, de cómo se ejecuta.

Orden: compuertas → commit → documentos → techos → reporte. No saltarse el orden: commitear antes de verificar deja la rama en rojo, y actualizar documentos antes del commit deja el hash sin conocer.

---

## 1. Compuertas antes de commitear

Las cinco son obligatorias. Si alguna falla, se arregla la causa: no se commitea igual ni se salta con `--no-verify`.

| # | Compuerta | Cómo se ejecuta | Cuándo aplica |
|---|---|---|---|
| 1 | Tests unitarios verdes | `pnpm test` | siempre que se tocó `modules/` o `tests/` |
| 2 | Lint verde | `pnpm run lint` | siempre que se tocó `.js` |
| 3 | Cero guion largo (U+2014, U+2013) | comando de abajo | siempre, también en tareas de solo documentación |
| 4 | Bump del Service Worker | subir `CACHE_NAME` en `service-worker.js`, ver `OPERACION.md` runbook 3 | siempre que cambió un archivo que el SW precachea (`.js`, `.css`, `index.html`, `docs/legal/*.md`) |
| 5 | E2E verdes si el cambio toca runtime | `pnpm run e2e:check`; si dice OBLIGATORIA, `pnpm run test:e2e` | lo decide el script, no el criterio de quien cierra. Además lo exige el hook de pre-commit |

Compuerta 3, en Git Bash. **Salida vacía significa que pasa:**

```bash
git ls-files -z '*.md' '*.js' '*.css' '*.html' | LC_ALL=C.UTF-8 xargs -0 grep -nP '[\x{2013}\x{2014}]'
```

Dos detalles que costaron tres intentos: el `LC_ALL` va **sobre el `xargs`** (antes del `git` no llega al `grep`, y sin él `grep -P` falla con "supports only unibyte and UTF-8 locales"), y `git ls-files` evita colgarse en `node_modules` y los falsos positivos de `coverage/`, que es generado.

**Compuerta 5, desde 2026-07-30.** Dispara con `index.html`, `modules/`, `styles/` o `service-worker.js`; no con `docs/`, `scripts/` ni `tests/unit/`. Tarda ~3,5 min: conviene lanzarla en segundo plano al empezar el cierre. `pnpm run test:e2e` sella el runtime que aprobó, y `.githooks/pre-commit` bloquea el commit si falta ese sello, así que no depende de acordarse. Si el hook no está activo en el clon: `pnpm run hooks:on`. Motivo y diseño: `OPERACION.md` runbook 5.

Si la tarea fue **solo de documentación**, aplican la 3 y nada más: decirlo explícitamente en el reporte ("sin tocar `modules/`, no hay tests que correr") en vez de dejar la duda.

---

## 2. Commit y push

Formato, tipos y reglas del mensaje: `CONTRIBUTING.md` sección "Commits". Acá solo lo que es del cierre:

- Terminar con el trailer `Co-Authored-By` que usa el repo.
- **Commit y push son autónomos:** no se pide permiso, pero solo con las compuertas en verde. Si algo quedó en rojo, se reporta y no se commitea.

---

## 3. Secuencia de documentos

Cuatro ediciones siempre, dos condicionales. La única larga es la ficha de contexto: es la que se lee antes de volver a tocar esa funcionalidad.

1. **`docs/contexto/<sección>.md`** (edición sustantiva). Actualizar el bloque de la funcionalidad tocada: `Estado actual`, `Cambios pendientes`, `Riesgos` si aparecieron, y `Verificado contra` con el commit nuevo. En `Cambios realizados` va **una línea por hito** (`YYYY-MM-DD <ID>: qué`), nunca un párrafo: el detalle vive en el CHANGELOG. Si el bloque no existía, se escribió al empezar la tarea, no ahora.
2. **`docs/CHANGELOG.md`** (una entrada). Antes de escribir, comprobar la rotación: si el mes de la última entrada no es el mes actual, mover el mes cerrado a `docs/changelog/YYYY-MM.md` y dejar CHANGELOG.md con el mes nuevo más el índice. Desde 2026-08 el formato de entrada es **una fila de tabla por tarea**: fecha, ID, tipo(área), qué cambió, commit, puntero a la ficha. La columna "qué cambió" contiene el punto que **no** se deduce del diff.
3. **`docs/HANDOFF.md`** (una a tres líneas). Agregar la tarea al tope de "Últimas 5 tareas cerradas", **borrar la sexta** (su detalle vive en el CHANGELOG), y actualizar el sello `Revisado:` y la tabla de métricas si alguna cifra cambió. Su cabecera imprime el contrato: nada de comandos, runbooks, arquitectura ni identidad.
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

**Vigencia:** todo documento que se toque actualiza su sello `Revisado: YYYY-MM-DD`. Los que pasen de 90 días sin cambios se verifican contra el código antes de citarlos como fuente de verdad:

```bash
git ls-files -- '*.md' ':(exclude)docs/DECISIONS/*' ':(exclude)docs/changelog/*' ':(exclude)docs/archive/*' ':(exclude)docs/legal/*' | while read -r f; do echo "$(git log -1 --format=%as -- "$f")  $f"; done | sort
```

---

## 5. Reporte de supervisión

El usuario no lee el diff: verifica en la app. El reporte va **siempre**, en este orden.

1. **Qué archivos cambiaron**, con rutas relativas y enlazadas.
2. **Qué cambió en cada uno**, una o dos líneas por archivo.
3. **Cómo verificarlo en la app**, paso a paso: ruta visual, sección, modal, botón, y el dato exacto que debe verse distinto. Si hace falta servidor (`python -m http.server 8080`) o un script, decirlo.
4. **Qué tests cubren el cambio** y con qué cifras quedaron.

Reglas del reporte:

- **Alcance honesto.** Si algo del alcance original quedó fuera, decirlo con su razón, no omitirlo. Si se encontró un defecto preexistente, decirlo aunque no se haya arreglado.
- **Área declarada vs. diff real.** Si la tarjeta se marcó `code` y el diff termina siendo mayoritariamente `styles/**`, markup o assets, anotarlo en el reporte como posible mala clasificación. No es motivo para revertir el cambio ni bloquear el commit.
- **Si se corrigió el plan de la tarjeta**, explicarlo: el usuario aprobó ese plan y merece saber por qué cambió.
- **El reporte no se cierra con recomendaciones.** Nada de prompt para la siguiente tarea, modelo, programa ni nivel de esfuerzo: eso lo decide el usuario (`CLAUDE.md` seccion 2, Estándar de comunicación). El punto "Próximo paso" solo aparece si hay una decisión pendiente suya, y es una pregunta, no una recomendación de ejecución.
