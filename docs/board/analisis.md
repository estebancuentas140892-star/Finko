# Tablero - Análisis

> Revisado: 2026-08-11.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `analisis`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

### Análisis (dominio `analisis`)

> Iniciativa "Análisis v2: rediseño visual" completa ([ADR 038](../DECISIONS/038-analisis-v2-visual.md)): avanzó los puntos 4, 5, 7 y 8 del brief de ANL.1 (reorganización, jerarquía, carga cognitiva, coherencia visual). **ANL.1 hereda el lienzo v2 ya montado:** cuando se inicie, escribe copy y recomendaciones sobre esas cards, no rediseña de cero.

> **Iniciativa ANL.1: Análisis interpreta.** Criterio de permanencia, lenguaje y layout cerrados por el **[ADR 046](../DECISIONS/046-analisis-interpreta-criterio-y-lenguaje.md)** (Aceptada el 2026-08-12, Esteban delegó la elección). Lo que decidió, para no volver a discutirlo: ninguna card se elimina (D1); el titular habla claro y el término técnico baja a secundario (D2); interpretar es **una línea por card derivada del dato real**, función pura en `logic.js`, nunca imperativa (D3); la sección no gana cards y el layout queda cerrado en 6 bloques, con el sexto reservado para logros (D4). El inventario card por card vive en el ADR. **Efecto colateral: LG.2d queda desbloqueada** (esperaba justo esa definición de layout).

> **ANL.1a cerrada el 2026-08-12** (`.analisis-lectura`, `lecturaPatrimonio` / `lecturaTendencia` / `lecturaCategorias`, regla R75). Fundó el patrón de lectura que ANL.1c reutiliza.

> **ANL.1b cerrada el 2026-08-12** (ADR 046 D2). Titulares de las 5 filas de la tabla de equivalencias, en `view.js`.

#### ANL.1c - Lectura del colapsable de detalle
- Prioridad  : baja
- Estado     : lista para trabajar (ADR 046 D3 sobre las unidades 5 a 7 del inventario)
- Área       : ambos
- Objetivo   : la comparación vs mes anterior entrega deltas sin conclusión. Patrón semanal y hormigas ya interpretan: se revisan contra el criterio, no se reescriben.
- Secciones  : Análisis
- Archivos   : `modules/dominio/analisis/logic.js`, `modules/dominio/analisis/view.js`, `tests/unit/analisis.test.js`
- Depende de : nada. Reutiliza `_renderLectura()` y el patrón que ANL.1a ya fundó
- Modelo     : ver la skill `elegir-modelo`
