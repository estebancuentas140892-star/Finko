# Tablero - Metas

> Revisado: 2026-08-11.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `metas`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

### Metas (dominio `metas`)

#### MT.6 - Metas v2: subcategorías inteligentes + plan de aportes generado automáticamente
- Prioridad  : media-alta
- Estado     : en curso, 3 de 4 rebanadas cerradas (MT.6a, MT.6b, MT.6c). Alcance y las 3 decisiones: **[ADR 048](../DECISIONS/048-metas-v2-subcategorias-y-plan-de-aportes.md)**, su dueño. La estructura de datos que D1 delegaba ya está decidida en el **[ADR 064](../DECISIONS/064-estructura-de-dos-niveles.md)**. **D2 (cuota con la frecuencia real de ingresos) se declaró cumplida sin código**: la entregaron MT.4 y MC.13b. **D3 (plan de aportes) ya está generado y almacenado (MT.6c)**; solo falta que se vea (MT.6d).
- Objetivo   : el usuario dice qué quiere y para cuándo; Finko reconoce el tipo de meta (subcategorías) y genera el plan de aportes.
- Secciones  : Metas, Calendario (plan visible), transversal por el motor de MC.13
- Depende de : nada bloqueante. Coordinar con PA si el plan pasa de recordatorio a ejecución (ADR 048 D3)
- Modelo     : Alta capacidad - Alto (generación y recálculo del plan de aportes)

**MT.6d - el plan se ve en Calendario** (siguiente, coordinación, no dependencia dura)
- Objetivo   : el plan de aportes generado por MT.6c (`meta.planAportes`) se muestra en Calendario, con las fechas y montos que ya guarda cada meta.
- Archivos   : `modules/dominio/agenda/logic.js`, `agenda/view.js`, `agenda/index.js`
