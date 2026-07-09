# Contexto técnico por funcionalidad - Finko Claude

> Registro técnico permanente. Una ficha por sección de la app; dentro de cada ficha, un bloque por funcionalidad.
> Objetivo: cada funcionalidad se analiza a fondo **una sola vez**, el resultado queda escrito aquí y las sesiones futuras lo reutilizan en vez de volver a recorrer el proyecto.
> Reglas de workflow asociadas: [`/CLAUDE.md`](../../CLAUDE.md) secciones 2.1, 2.4 y 2.6.
> Última revisión: 2026-07-05.

---

## 1. Qué resuelve y cómo convive con los otros docs

| Pregunta | Documento |
|---|---|
| ¿En qué carpeta/archivo vive cada sección? ¿Dónde miro ante un síntoma? | [`MAPA.md`](../MAPA.md) (índice grueso, por dominio) |
| ¿Qué piezas exactas componen ESTA funcionalidad, qué riesgos tiene, qué le falta? | La ficha de su sección en esta carpeta |
| ¿Qué está pendiente y con qué prioridad? | [`BOARD.md`](../BOARD.md) |
| ¿Qué se hizo y cuándo? | [`CHANGELOG.md`](../CHANGELOG.md) |
| ¿Qué errores conocidos hay? | [`BUGS.md`](../BUGS.md) |

La ficha no duplica esos documentos: enlaza a ellos. Su valor es el detalle quirúrgico (archivo + función + relaciones + riesgos) que hoy solo se obtiene recorriendo el código.

---

## 2. Reglas de uso

### 2.1 Antes de trabajar una funcionalidad

1. Abrir la ficha de su sección (índice en la sección 4). Si el bloque de la funcionalidad existe y está vigente, trabajar desde ese contexto: **no recorrer el proyecto de nuevo**.
2. Verificar vigencia con el campo `Verificado contra`:
   ```bash
   git log --oneline <commit>.. -- <archivos listados en el bloque>
   ```
   Si hubo commits que tocaron esos archivos, actualizar solo lo que cambió antes de usar la ficha.
3. Si el bloque no existe: hacer el análisis profundo una sola vez (archivos, funciones, estilos, recursos gráficos, dependencias, relaciones, riesgos) y escribir el bloque **antes** de codificar. Este análisis inicial admite un modelo de mayor capacidad si la complejidad lo justifica; las iteraciones posteriores, con ficha vigente, usan el modelo más eficiente que mantenga la calidad (ver CLAUDE.md sección 2.3).

### 2.2 Al cerrar una tarea

Actualizar el bloque tocado como **paso 1** de la secuencia de cierre de docs (CLAUDE.md sección 2.4): estado actual, cambios realizados (1 línea + referencia al CHANGELOG), cambios pendientes, y `Verificado contra` con el commit nuevo.

### 2.3 Qué NO va en una ficha

- Historia detallada de cada cambio (vive en CHANGELOG; la ficha lista 1 línea por hito).
- Tarjetas de trabajo con prioridad (viven en BOARD; "Cambios pendientes" es para cabos técnicos sueltos; si uno crece, se promueve a tarjeta).
- Ubicación gruesa por dominio (vive en MAPA).
- Contenido especulativo: **las fichas nacen bajo demanda**, la primera vez que se trabaja una funcionalidad. No se pre-generan fichas de secciones que nadie está tocando: envejecen mal y cuestan tokens sin retorno.

### 2.4 Anclas de localización

- **Ancla primaria:** nombre de función, export, clase CSS o `data-action`. Sobrevive a ediciones y se encuentra con `grep -n`.
- **Línea:** solo referencia orientativa (`~120`). Si al abrir el archivo no coincide, manda el ancla; la línea se corrige al actualizar el bloque.

---

## 3. Plantilla de bloque

Copiar dentro de la ficha de la sección correspondiente:

```markdown
## <Nombre de la funcionalidad>

- **Objetivo**          : qué resuelve, 1 o 2 líneas.
- **Estado actual**     : estable | en evolución (tarjeta <ID>) | con errores (BUG-xxx).
- **Verificado contra** : commit `<hash corto>` (YYYY-MM-DD).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Cálculo de X | `modules/dominio/<d>/logic/x.js` | `calcularX()` | ~120 |
| Render de X | `modules/dominio/<d>/views/x.js` | `renderX()` | ~40 |
| Acción del botón | `modules/dominio/<d>/index.js` | `data-action="x:guardar"` | ~15 |

**Recursos**: símbolos del sprite (`i-*`/`c-*`/`b-*`), clases CSS y su archivo,
tokens `--fk-*`, constantes de `core/constants.js`, claves del estado `S`.

**Dependencias y relaciones**: eventos del EventBus que emite/escucha, helpers de
`infra/` que usa, quién consume sus exports.

**Riesgos**: qué se rompe fácil al tocarla, invariantes que respetar, migraciones asociadas.

**Cambios pendientes**: cabos técnicos sin tarjeta formal.

**Cambios realizados**: `YYYY-MM-DD <id o commit>: qué` (detalle en CHANGELOG).

**Observaciones**: decisiones no obvias, ADRs relacionados, trampas conocidas.
```

Los campos sin contenido se escriben como "ninguno conocido" o se omiten: un bloque corto y cierto vale más que uno largo y especulativo.

---

## 4. Índice de fichas

Una ficha por sección de la app (mismo agrupamiento que [`BOARD.md`](../BOARD.md)). "Sin crear" significa que ninguna funcionalidad de esa sección se ha trabajado todavía bajo esta metodología.

| Sección de la app | Ficha | Estado |
|---|---|---|
| Inicio | [`inicio.md`](inicio.md) | activa (estructura del dashboard, análisis conjunto IN.4/IN.6/IN.7/CAL.1/TX.8) |
| Gastos | [`gastos.md`](gastos.md) | activa (TX.9 completa: formulario de gasto + categorías personalizadas) |
| Calendario | [`calendario.md`](calendario.md) | activa (calendario mensual, CAL.2 leyenda dinámica) |
| Deudas | `deudas.md` | sin crear |
| Mis cuentas | `mis-cuentas.md` | sin crear |
| Apartados | `apartados.md` | sin crear |
| Metas | `metas.md` | sin crear |
| Ahorro | `ahorro.md` | sin crear |
| Inversión | `inversion.md` | sin crear |
| Límites de gasto | `limites.md` | sin crear |
| Me deben | `me-deben.md` | sin crear |
| Análisis | [`analisis.md`](analisis.md) | activa (panel de análisis, PERF.2) |
| Configuración | [`configuracion.md`](configuracion.md) | activa (panel de Ajustes, CFG.1a situación laboral) |
| Transversal (navegación, iconografía, hoja Registrar, biblioteca gráfica, persistencia, logros) | [`transversal.md`](transversal.md) | activa (tejas de marca, biblioteca gráfica, persistencia/cuota, sistema de logros) |

Al crear una ficha: actualizar su fila a "activa" y ordenar los bloques dentro del archivo por importancia de la funcionalidad.
