# Tablero - Límites de gasto

> Revisado: 2026-08-12 (LIM.1b).

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `presupuesto`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

### Límites de gasto (dominio `presupuesto`)

_(Nota vigente: si más adelante se resuelven MC.10/MC.11 (piso de ahorro + detección de déficit en Mis cuentas), el asignado por grupo de Límites mejora automáticamente sin tocar este código.)_

> **Iniciativa LIM.1: Límites v2, asistente preventivo de estilo de vida** (fusión de 2 briefs). Objetivo: que Límites se enfoque en Estilo de vida, el único grupo con control real. Está repartida entre 4 ADRs y ya no queda nada sin dueño.
>
> **Decidido, para no volver a discutirlo:** tratamiento asimétrico por rol, topes bajo demanda, copy y layout → **[ADR 019](../DECISIONS/019-limites-por-rol.md)** (el brief lo **confirma**, no lo revisa; la nota vieja de esta tarjeta decía lo contrario y estaba mal). Qué fijos son no esenciales → **[ADR 014](../DECISIONS/014-taxonomia-categorias-transversal.md)**: Streaming y Suscripciones, nada más. Base de cálculo del disponible (punto 7) → **[ADR 045](../DECISIONS/045-base-de-calculo-del-disponible-para-limites.md)** (Aceptada el 2026-08-12, Esteban delegó la elección). Sugerencia de monto y de dónde poner tope (puntos 3, 9, 10 y el refuerzo P1/P6 de la auditoría) → **[ADR 044](../DECISIONS/044-motor-unico-de-sugerencia-por-categoria.md)**, todavía Abierta, ya sin su bloqueo (el ADR 045 D6 le fija la base).
>
> **Lo que cerró el ADR 045 y ahorra trabajo:** la base sigue siendo el ingreso recurrente y lo comprometido ya está descontado por el piso de Necesidades del [ADR 013](../DECISIONS/013-distribucion-automatica-inteligente.md), así que **la aritmética del asignado no cambia y `distribucion.js` no se toca por la base**. Los saldos en cuenta nunca entran (stock contra flujo, doble conteo). El dinero extraordinario se informa y no se reparte: eso es LIM.1a.

> **LIM.1a y LIM.1b cerradas el 2026-08-12.** Detalle en el CHANGELOG y en [`contexto/limites.md`](../contexto/limites.md).

#### LIM.1c - Sugerir dónde y cuánto poner tope (bloqueada)
- Prioridad  : sin definir
- Estado     : **no iniciar.** Espera el **[ADR 044](../DECISIONS/044-motor-unico-de-sugerencia-por-categoria.md)** (Abierta), que define el motor único compartido con Análisis e Inicio. Su bloqueo declarado (el ADR 045) ya está resuelto: la base es el presupuesto de Estilo de vida y su parte sin tope, nunca saldos ni dinero extraordinario (ADR 045 D6)
- Área       : ambos
- Objetivo   : puntos 3, 9 y 10 del brief. Que la app proponga un monto al crear un tope, señale la categoría que lo pide y detecte la suscripción olvidada, sin mandar al usuario a reconstruir el contexto a mano.
- Secciones  : Límites de gasto (`presupuesto`), transversal (motor en `infra/`, compartido con `analisis` e `inicio`)
- Depende de : ADR 044 resuelto
- Modelo     : ver el ADR 044 al cerrarlo
