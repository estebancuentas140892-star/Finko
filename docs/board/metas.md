# Tablero - Metas

> Revisado: 2026-08-11.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `metas`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

### Metas (dominio `metas`)

#### MT.6 - Metas v2: subcategorías inteligentes + plan de aportes generado automáticamente
- Prioridad  : media-alta
- Estado     : en curso, 1 de 3 rebanadas cerradas. Alcance y las 3 decisiones: **[ADR 048](../DECISIONS/048-metas-v2-subcategorias-y-plan-de-aportes.md)**, su dueño. La estructura de datos que D1 delegaba ya está decidida en el **[ADR 064](../DECISIONS/064-estructura-de-dos-niveles.md)**. **D2 (cuota con la frecuencia real de ingresos) se declaró cumplida sin código**: la entregaron MT.4 y MC.13b.
- Objetivo   : el usuario dice qué quiere y para cuándo; Finko reconoce el tipo de meta (subcategorías) y genera el plan de aportes.
- Secciones  : Metas, Calendario (plan visible), transversal por el motor de MC.13
- Depende de : nada bloqueante. Coordinar con PA si el plan pasa de recordatorio a ejecución (ADR 048 D3)
- Modelo     : Alta capacidad - Alto (generación y recálculo del plan de aportes)

**MT.6b - la subcategoría entra al formulario y al dato** (siguiente)
- Objetivo   : segundo control en el form de meta cuando la categoría tiene subcategorías; la meta guarda `subcategoriaId`.
- Archivos   : `modules/dominio/metas/view.js` (`renderFormMeta`), `metas/logic.js` (`normalizarMeta`), `metas/index.js`, migración en `core/storage.js`
- Depende de : ADR 064 (listo). El control adopta FORM.1b (chips del lenguaje, ADR 042: prohibido un `select` de categoría nuevo), así que absorbe el pendiente MT.h de DIS.13
- Riesgo     : cambiar de categoría con una subcategoría ya elegida tiene que limpiarla, o la meta queda con un hijo de otro padre. `normalizarMeta` es la única función que construye el shape completo (ver ficha de contexto)

**MT.6c - plan de aportes generado y recalculado** (ADR 048 D3)
- Objetivo   : al crear la meta, un registro de aporte por cada fecha de ingreso hasta la fecha objetivo; si cambia la frecuencia, la fecha o el monto, el plan entero se regenera.
- Archivos   : `modules/infra/vencimientos.js` (fechas del motor), `metas/logic.js`, `metas/view.js`, schema bump
- Riesgo     : el plan es visible y recordatorio, **nunca ejecución** (ADR 048 D3). Recalcular completo pierde ajustes manuales sobre un aporte suelto: si se permiten, hay que revisar la decisión

**MT.6d - el plan se ve en Calendario** (coordinación, no dependencia dura)
