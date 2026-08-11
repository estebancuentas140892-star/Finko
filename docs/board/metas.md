# Tablero - Metas

> Revisado: 2026-08-11.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `metas`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

### Metas (dominio `metas`)

#### MT.6 - Metas v2: subcategorías inteligentes + plan de aportes generado automáticamente
- Prioridad  : media-alta
- Estado     : pendiente de análisis (no iniciar). Alcance y las 3 decisiones: **[ADR 048](../DECISIONS/048-metas-v2-subcategorias-y-plan-de-aportes.md)**, su dueño.
- Objetivo   : el usuario dice qué quiere y para cuándo; Finko reconoce el tipo de meta (subcategorías), calcula la cuota con la frecuencia real de ingresos y genera el plan de aportes.
- Secciones  : Metas, Calendario (plan visible), transversal por el motor de MC.13
- Archivos   : `modules/dominio/metas/logic.js` (cálculo existente), motor compartido de MC.13, `agenda` (visualización del plan)
- Depende de : MC.13 (motor); validación D3 del ADR 029 para las subcategorías; coordinar con PA si el plan se automatiza
- Riesgo     : la estructura de dos niveles se comparte con entidad→producto (MC.16, Deudas v2): modelarla acá por separado la duplica (ADR 048 D1)
- Modelo     : Alta capacidad - Alto (modelo de datos de subcategorías + generación/recalculo del plan de aportes)
