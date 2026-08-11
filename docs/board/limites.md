# Tablero - Límites de gasto

> Revisado: 2026-08-11.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `presupuesto`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

### Límites de gasto (dominio `presupuesto`)

_(Nota vigente: si más adelante se resuelven MC.10/MC.11 (piso de ahorro + detección de déficit en Mis cuentas), el asignado por grupo de Límites mejora automáticamente sin tocar este código.)_

#### LIM.1 - Límites v2: asistente preventivo de estilo de vida (iniciativa, fusión de 2 briefs)
- Prioridad  : sin definir
- Estado     : mayormente decidido, repartido entre 3 ADRs. Solo la base de cálculo (punto 7) sigue sin dueño: **[ADR 045](../DECISIONS/045-base-de-calculo-del-disponible-para-limites.md)** (Abierta). No iniciar esa parte sin ese ADR resuelto.
- Objetivo   : que Límites se enfoque en Estilo de vida (el único grupo con control real), con solo categorías ya usadas, seguimiento durante el mes y sugerencias de dónde y cuánto poner tope.
- Motivo     : el usuario concluyó, tras analizar la sección, que Necesidades y Ahorro no deberían tener límite de gasto (Necesidades son obligatorias; Ahorro por encima de lo previsto es positivo, no una desviación).
- Decidido ya: tratamiento asimétrico por rol, mecanismo bajo demanda, copy y layout → **[ADR 019](../DECISIONS/019-limites-por-rol.md)** (el brief lo confirma, no lo revisa, pese a lo que decía la nota anterior de esta tarjeta). Dimensión esencial/no esencial de fijos → **[ADR 014](../DECISIONS/014-taxonomia-categorias-transversal.md)**. Detección de patrones y sugerencia de monto + acción (puntos 3, 9, 10 y el refuerzo P1/P6 de la auditoría) → **[ADR 044](../DECISIONS/044-motor-unico-de-sugerencia-por-categoria.md)**, motor compartido con Análisis e Inicio.
- Secciones  : Límites de gasto (`presupuesto`), transversal (motor de sugerencia compartido con `analisis` e `inicio`)
- Depende de : ADR 045 resuelto para la base de cálculo; ADR 044 resuelto para las sugerencias; el resto ya puede implementarse
- Modelo     : ver el ADR correspondiente a cada parte antes de iniciar
