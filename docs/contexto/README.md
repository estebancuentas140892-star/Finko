# Contexto técnico por funcionalidad - Finko Claude

> Revisado: 2026-08-14.

> Registro técnico permanente. Una ficha por sección de la app; dentro de cada ficha, un bloque por funcionalidad.
> Objetivo: cada funcionalidad se analiza a fondo **una sola vez**, el resultado queda escrito aquí y las sesiones futuras lo reutilizan en vez de volver a recorrer el proyecto.
> Reglas de workflow asociadas: [`/CLAUDE.md`](../../CLAUDE.md) sección 2 (continuidad, fuente única) y sección 3 (antes de explorar), más las skills `triaje-tarea` y `cerrar-tarea`.

---

## 1. Qué resuelve y cómo convive con los otros docs

| Pregunta | Documento |
|---|---|
| ¿En qué carpeta/archivo vive cada sección? ¿Dónde miro ante un síntoma? | [`ARCHITECTURE.md`](../ARCHITECTURE.md) sección 13, el mapa operativo (índice grueso, por dominio) |
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
3. Si el bloque no existe: hacer el análisis profundo una sola vez (archivos, funciones, estilos, recursos gráficos, dependencias, relaciones, riesgos) y escribir el bloque **antes** de codificar. Este análisis inicial admite un modelo de mayor capacidad si la complejidad lo justifica; las iteraciones posteriores, con ficha vigente, usan la capacidad más eficiente que mantenga la calidad (ver la skill `elegir-modelo`).

### 2.2 Al cerrar una tarea

Actualizar el bloque tocado como **paso 1** de la secuencia de cierre de docs (ver la skill `cerrar-tarea`): estado actual, cambios realizados (1 línea + referencia al CHANGELOG), cambios pendientes, y `Verificado contra` con el commit nuevo.

### 2.3 Qué NO va en una ficha

- Historia detallada de cada cambio (vive en CHANGELOG; la ficha lista 1 línea por hito).
- Tarjetas de trabajo con prioridad (viven en BOARD; "Cambios pendientes" es para cabos técnicos sueltos; si uno crece, se promueve a tarjeta).
- Ubicación gruesa por dominio (vive en el mapa operativo, `ARCHITECTURE.md` sección 13).
- Contenido especulativo: **las fichas nacen bajo demanda**, la primera vez que se trabaja una funcionalidad. No se pre-generan fichas de secciones que nadie está tocando: envejecen mal y cuestan tokens sin retorno.

### 2.4 Anclas de localización

- **Ancla primaria:** nombre de función, export, clase CSS o `data-action`. Sobrevive a ediciones y se encuentra con `grep -n`.
- **Línea:** solo referencia orientativa (`~120`). Si al abrir el archivo no coincide, manda el ancla; la línea se corrige al actualizar el bloque.
- **Un archivo compartido tiene una sola ficha dueña de sus anclas** (principio 1 aplicado a las tablas "Dónde vive"). Caso resuelto en DOC.3: las anclas de navegación de `ui/shell.js` (`markActiveNav()`, `MAS_SECTIONS`, `GRUPO_AHORRO`, `GRUPO_GASTOS`) viven solo en [`sistema-visual.md`](sistema-visual.md); `ahorro.md` y `escritorio.md` enlazan en vez de remapearlas.

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
| Deudas | [`deudas.md`](deudas.md) | activa (registro de deudas, D.14 acreditar cuenta de origen) |
| Mis cuentas | [`mis-cuentas.md`](mis-cuentas.md) | activa (cuentas, MC.14 datos de transferencia) |
| Apartados | [`apartados.md`](apartados.md) | activa (aportar a un apartado, AP.5a monto prellenado) |
| Metas | [`metas.md`](metas.md) | activa (metas de ahorro, EDIT.1a editar sin destruir el progreso) |
| Ahorro | [`ahorro.md`](ahorro.md) | activa (fondo de emergencia, AH.5a monto prellenado en Registrar aporte) |
| Inversión | [`inversion.md`](inversion.md) | activa (la sección por momentos, DIS.17 arquitectura O) |
| Límites de gasto | [`limites.md`](limites.md) | activa (tres grupos por rol, DIS.7 auditoría de diseño) |
| Me deben | [`me-deben.md`](me-deben.md) | activa (préstamos conectados a cuentas y patrimonio, PE.7) |
| Movimientos | [`movimientos.md`](movimientos.md) | activa (ledger unificado, accionable y con búsqueda/filtros, MOV.1/MOV.2) |
| Análisis | [`analisis.md`](analisis.md) | activa (panel de análisis, PERF.2) |
| Configuración | [`configuracion.md`](configuracion.md) | activa (panel de Ajustes, CFG.1a situación laboral) |
| Transversal no visual (persistencia y cuota, pipeline de render, CTA de cuenta, motor de avisos, infra compartida, aviso de versión, guía, legal) | [`transversal.md`](transversal.md) | activa |
| Sistema visual (identidad de color por sección, tejas de marca y biblioteca gráfica, navegación) | [`sistema-visual.md`](sistema-visual.md) | activa (partida de `transversal.md` el 2026-07-24) |
| Captura (lenguaje de formularios v2, selector compacto de ícono) | [`captura.md`](captura.md) | activa (partida de `transversal.md` el 2026-07-24) |
| Categorías (taxonomía global CAT.1, categorías personalizadas del usuario) | [`categorias.md`](categorias.md) | activa (partida de `transversal.md` el 2026-08-14) |
| Logros (catálogo, evaluación, toast, "Tu progreso") | [`logros.md`](logros.md) | activa (partida de `transversal.md` el 2026-08-14) |
| Escritorio (shell de escritorio: sidebar, barra superior, atajos, iniciativa INT.1) | [`escritorio.md`](escritorio.md) | activa (partida de `transversal.md` el 2026-08-14) |

Al crear una ficha: actualizar su fila a "activa" y ordenar los bloques dentro del archivo por importancia de la funcionalidad.

---

## 5. Los 11 principios de organización documental

Gobiernan toda la documentación viva, no solo las fichas. Se citan aquí porque una ficha que los rompe deja de ser fuente única.

1. **Un dato, un dueño.** Cada hecho vive en un solo archivo oficial; los demás enlazan sin resumir.
2. **No documentar lo que el código o git ya dicen.** Sin inventarios archivo por archivo ni copias de valores de tokens CSS.
3. **La historia se escribe una sola vez.** El commit lleva el detalle; CHANGELOG una fila; la ficha una línea por hito (regla 2.3); el tablero borra la tarjeta.
4. **Techo por archivo, verificado al cerrar tarea.** Ficha: **40 KB** (objetivo 25). Superarlo obliga a podar o partir por eje real (precedentes: `transversal.md` partido en tres el 2026-07-25, y otra vez en cuatro el 2026-08-14 con DOC.3). Antes de partir, podar: en las fichas que rompieron el techo, el bloque "Cambios realizados" reproducía el CHANGELOG en párrafos y era cerca de la mitad del archivo (regla 2.3: una línea por hito).
5. **El tablero solo contiene pendientes.**
6. **La norma va en CLAUDE.md; el procedimiento en skills; la referencia en docs.**
7. **La historia congelada no se reescribe.** Los ADR son inmutables.
8. **Casi nunca se crea un `.md` nuevo.** Whitelist: ficha bajo demanda, ADR real, mes de changelog.
9. **Todo archivo de más de 20 KB abre con un índice tabular en sus primeras 40 líneas.**
10. **Revisión trimestral ligera.** Tamaños contra techos, tarjetas con más de 90 días sin actividad, duplicados por `grep` de IDs.
11. **Vigencia obligatoria.** Sello `Revisado: YYYY-MM-DD` en todo documento activo (esta carpeta incluida); más de 90 días sin cambios pasa a "por validar" contra el código.
