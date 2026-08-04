# Tablero - Análisis

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `analisis`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

### Análisis (dominio `analisis`)

> Iniciativa "Análisis v2: rediseño visual" completa ([ADR 038](../DECISIONS/038-analisis-v2-visual.md)): avanzó los puntos 4, 5, 7 y 8 del brief de ANL.1 (reorganización, jerarquía, carga cognitiva, coherencia visual). **ANL.1 hereda el lienzo v2 ya montado:** cuando se inicie, escribe copy y recomendaciones sobre esas cards, no rediseña de cero.

#### ANL.1 - Análisis como centro de interpretación financiera (no solo panel de estadísticas)
- Prioridad  : sin definir
- Estado     : criterio y lenguaje sin decidir. Ver **[ADR 046](../DECISIONS/046-analisis-interpreta-criterio-y-lenguaje.md)** (Abierta). No implementar el criterio de permanencia ni el nivel de traducción sin ese ADR resuelto.
- Objetivo   : el usuario considera que Análisis hoy es una gran cantidad de gráficos e indicadores que puede resultar abrumadora para alguien sin conocimientos financieros; pide que Finko explique e interprete, no solo muestre datos.
- Motivo     : pidió analizar la sección completa antes de implementar cualquier cambio, para decidir qué simplificar, reorganizar, unificar o eliminar, sin perder profundidad de análisis.
- Decidido ya: jerarquía de lectura y colapsables → **[ADR 010](../DECISIONS/010-simplificacion-analisis.md)**. Reorganización visual v2 → **[ADR 038](../DECISIONS/038-analisis-v2-visual.md)** (ANL.1 hereda el lienzo ya montado). Motor de recomendaciones accionables (punto 6, punto 10 y el refuerzo P6 de la auditoría) → **[ADR 044](../DECISIONS/044-motor-unico-de-sugerencia-por-categoria.md)**, motor compartido con Límites e Inicio.
- Secciones  : Análisis (dominio `analisis`); transversal por el motor de recomendaciones (ADR 044) y coordinación con CFG.2c (interpretación fiscal) y LG.2 (logros)
- Depende de : ADR 046 resuelto para el criterio de permanencia y el lenguaje; ADR 044 resuelto para las recomendaciones accionables
- Modelo     : ver el ADR correspondiente a cada parte antes de iniciar
