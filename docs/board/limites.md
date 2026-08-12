# Tablero - Límites de gasto

> Revisado: 2026-08-12.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `presupuesto`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

### Límites de gasto (dominio `presupuesto`)

_(Nota vigente: si más adelante se resuelven MC.10/MC.11 (piso de ahorro + detección de déficit en Mis cuentas), el asignado por grupo de Límites mejora automáticamente sin tocar este código.)_

> **Iniciativa LIM.1: Límites v2, asistente preventivo de estilo de vida** (fusión de 2 briefs). Objetivo: que Límites se enfoque en Estilo de vida, el único grupo con control real. Está repartida entre 4 ADRs y ya no queda nada sin dueño.
>
> **Decidido, para no volver a discutirlo:** tratamiento asimétrico por rol, topes bajo demanda, copy y layout → **[ADR 019](../DECISIONS/019-limites-por-rol.md)** (el brief lo **confirma**, no lo revisa; la nota vieja de esta tarjeta decía lo contrario y estaba mal). Qué fijos son no esenciales → **[ADR 014](../DECISIONS/014-taxonomia-categorias-transversal.md)**: Streaming y Suscripciones, nada más. Base de cálculo del disponible (punto 7) → **[ADR 045](../DECISIONS/045-base-de-calculo-del-disponible-para-limites.md)** (Aceptada el 2026-08-12, Esteban delegó la elección). Sugerencia de monto y de dónde poner tope (puntos 3, 9, 10 y el refuerzo P1/P6 de la auditoría) → **[ADR 044](../DECISIONS/044-motor-unico-de-sugerencia-por-categoria.md)**, todavía Abierta, ya sin su bloqueo (el ADR 045 D6 le fija la base).
>
> **Lo que cerró el ADR 045 y ahorra trabajo:** la base sigue siendo el ingreso recurrente y lo comprometido ya está descontado por el piso de Necesidades del [ADR 013](../DECISIONS/013-distribucion-automatica-inteligente.md), así que **la aritmética del asignado no cambia y `distribucion.js` no se toca por la base**. Los saldos en cuenta nunca entran (stock contra flujo, doble conteo). El dinero extraordinario se informa y no se reparte: eso es LIM.1a.

#### LIM.1a - El dinero extra del mes, informado sin repartir
- Prioridad  : media
- Estado     : lista para trabajar ([ADR 045](../DECISIONS/045-base-de-calculo-del-disponible-para-limites.md) D3 y D5, copy incluido)
- Área       : ambos
- Objetivo   : una prima, una venta o un préstamo cobrado hoy son invisibles en Límites. Una línea informativa en Estilo de vida dice cuánto entró fuera del plan, con salida a Mis cuentas para decidir su destino. No entra al split, no sube el presupuesto del grupo, no sube ningún tope.
- Secciones  : Límites de gasto (`presupuesto`)
- Archivos   : `modules/dominio/presupuesto/logic.js` (función pura que suma `S.ingresosPuntuales` del mes), `modules/dominio/presupuesto/view.js` (`_renderOllaFinita()` y su vecindad), `styles/components/analysis.css`, `tests/unit/presupuesto.test.js`
- Depende de : nada. Sin schema y sin tocar el motor de reparto
- Modelo     : Equilibrado - Medio

#### LIM.1b - Los fijos no esenciales cuentan contra Estilo de vida
- Prioridad  : media
- Estado     : lista para trabajar, con el riesgo declarado abajo. Es el punto 8 del brief; el catálogo lo cerró el [ADR 014](../DECISIONS/014-taxonomia-categorias-transversal.md) el 2026-07-13
- Área       : code
- Objetivo   : hoy todo gasto con `compromisoId` se cuenta como Necesidades (`ejecutadoPorGrupoDelMes`), así que el streaming pesa igual que el arriendo. Streaming y Suscripciones pasan a Estilo de vida, que es donde el usuario decide.
- Riesgo     : **hay que mover los dos lados en la misma rebanada.** El asignado de Necesidades sale de `calcularGastosFijosMensuales()`, que suma todos los fijos: si solo se mueve el ejecutado, Estilo de vida aparece excedido contra un asignado que no incluye esas categorías. Toca el piso del ADR 013 y con eso la superficie de Mis cuentas, no solo Límites.
- Secciones  : Límites de gasto (`presupuesto`), Mis cuentas (`tesoreria`)
- Archivos   : `modules/core/constants.js` (la lista de no esenciales, fuente única), `modules/dominio/presupuesto/logic.js` (`ejecutadoPorGrupoDelMes`, `desgloseNecesidadesDelMes`), `modules/dominio/tesoreria/logic/distribucion.js` (`calcularGastosFijosMensuales` y su uso en `construirContextoDistribucion`), `tests/unit/presupuesto.test.js`, `tests/unit/tesoreria*.test.js`, E2E de ambas secciones
- Depende de : nada, pero conviene después de LIM.1a (la más barata primero)
- Modelo     : Alta capacidad - Alto (cambia el reparto del ingreso en dos superficies)

#### LIM.1c - Sugerir dónde y cuánto poner tope (bloqueada)
- Prioridad  : sin definir
- Estado     : **no iniciar.** Espera el **[ADR 044](../DECISIONS/044-motor-unico-de-sugerencia-por-categoria.md)** (Abierta), que define el motor único compartido con Análisis e Inicio. Su bloqueo declarado (el ADR 045) ya está resuelto: la base es el presupuesto de Estilo de vida y su parte sin tope, nunca saldos ni dinero extraordinario (ADR 045 D6)
- Área       : ambos
- Objetivo   : puntos 3, 9 y 10 del brief. Que la app proponga un monto al crear un tope, señale la categoría que lo pide y detecte la suscripción olvidada, sin mandar al usuario a reconstruir el contexto a mano.
- Secciones  : Límites de gasto (`presupuesto`), transversal (motor en `infra/`, compartido con `analisis` e `inicio`)
- Depende de : ADR 044 resuelto
- Modelo     : ver el ADR 044 al cerrarlo
