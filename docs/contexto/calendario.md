# Ficha de contexto: Calendario

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## Calendario mensual de compromisos (dominio `agenda`)

- **Objetivo**          : vista calendario mensual sobre `S.compromisos` y `S.ingresos` (no agrega datos nuevos): mapea cada compromiso activo y cada ingreso activo a los días del mes en que cae, respetando su frecuencia. No importa de otros dominios (ADN 10); duplica deliberadamente lo mínimo que necesita (ej. `totalDia`) en vez de importar `compromisos/logic.js`.
- **Estado actual**     : estable. **CAL.2** (2026-07-06) hizo dinámica la leyenda de tipos bajo el calendario. **CAL.1** (nudge de distribución del ingreso en Inicio, cerrada 2026-07-05) vive en el dominio `resumen`, no en `agenda`.
- **Verificado contra** : `PENDIENTE_CAL2` (2026-07-06, CAL.2).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Mapeo de compromisos a días del mes (respeta frecuencia) | `modules/dominio/agenda/logic.js` | `eventosDelMes()` | ~104 |
| Mapeo de ingresos a días del mes (ADR 021, recordatorio) | `modules/dominio/agenda/logic.js` | `eventosIngresosDelMes()` | ~144 |
| Total de eventos del mes (badge de cabecera) | `modules/dominio/agenda/logic.js` | `totalEventosDelMes()` | ~177 |
| Tipos de evento presentes en el mes (CAL.2, leyenda dinámica) | `modules/dominio/agenda/logic.js` | `tiposPresentesEnMes()` | ~186 |
| Total a pagar de un día (AG.5) | `modules/dominio/agenda/logic.js` | `totalDia()` | ~204 |
| Próximo vencimiento fuera del mes visible | `modules/dominio/agenda/logic.js` | `eventosEnProximos()` | ~228 |
| Orquestador del render (única entrada) | `modules/dominio/agenda/view.js` | `renderAgenda()` | ~85 |
| Leyenda de tipos bajo el calendario (CAL.2, dinámica) | `modules/dominio/agenda/view.js` | `_renderLeyenda()`, `_LABEL_LEYENDA` | ~244 |
| Grid del mes + dots por día (hasta 3 + "+N") | `modules/dominio/agenda/view.js` | `_renderGrid()`, `_renderDots()` | ~165, ~230 |
| Detalle del día (lista de compromisos/ingreso) | `modules/dominio/agenda/view.js` | `_renderDetalleDia()`, `_renderDetalleItem()`, `_renderDetalleItemIngreso()` | ~269, ~343, ~319 |
| Formulario simplificado de gasto fijo | `modules/dominio/agenda/view.js` | `renderFormGastoFijo()` | ~461 |
| Delegación de acciones (`agenda-*`) + re-render por `state:change` | `modules/dominio/agenda/index.js` | `initAgenda()` | |

**Recursos**: estilos en `styles/components/config.css` (`.cal-*`, incluida la paleta `cal-dot--*` por tipo: `--fk-dom-ingresos`, `--fk-dom-presupuesto`, `--fk-dom-compromisos`, `--fk-dom-personales`); tejas de marca/categoría vía `infra/icons.js` y `infra/marcas.js` (MK.2, ID.3).

**Dependencias y relaciones**: `agenda/logic.js` es puro (sin `S`, sin DOM), recibe `compromisos`/`ingresos` como argumentos. `agenda/view.js` lee `S.compromisos`, `S.ingresos`, `S.gastos` (para el badge de estado de pago) directo; importa `LABEL_TIPO`/`ICONO_TIPO`/`calcularAbonosDelMes`/`estadoPagoMes` de `compromisos/logic.js` (permitido: agenda es una vista de solo lectura sobre compromisos, no un dominio hermano que muta los mismos datos). `agenda/index.js` re-renderiza por `state:change` de `compromisos`/`ingresos`/`gastos` y al navegar a `#agenda`.

**Tipos de evento posibles** (exhaustivo, `TIPOS_COMPROMISO` de `compromisos/logic/modelo.js` + el tipo especial `ingreso`): `ingreso` (evento especial, no es un compromiso: lo agrega `eventosIngresosDelMes` con `tipo: 'ingreso'` fijo), `fijo`, `deuda-entidad`, `deuda-personal`. Un compromiso sin `tipo` cuenta como `fijo` (criterio defensivo, igual en `_renderDots` y `tiposPresentesEnMes`).

**Riesgos**:

- **La leyenda dinámica (CAL.2) depende del orden canónico hardcodeado en dos lugares**: `ORDEN` dentro de `tiposPresentesEnMes()` (logic.js) y `_LABEL_LEYENDA` (view.js, mismo orden implícito por cómo se recorre `tipos.map`). Si se agrega un tipo de evento nuevo al calendario (ej. vencimiento de meta o apartado, mencionado como ampliación futura sin tarjeta en `docs/BOARD.md`), hay que sumarlo en ambos lugares y en la paleta CSS `cal-dot--*` (`styles/components/config.css`); si falta en `ORDEN`, `tiposPresentesEnMes` lo descarta silenciosamente (no rompe, pero el tipo nunca aparece en la leyenda aunque sí tenga dots en el grid).
- **`tiposPresentesEnMes` recorre el mapa `eventos` ya construido por `renderAgenda()`** (post-merge de `eventosComp` + `eventosIng`), no vuelve a leer `S` ni recalcula nada: es barato (un solo recorrido de arrays ya en memoria), no necesita memoización.
- **Frecuencias largas (Bimestral/Trimestral/Semestral/Anual) sin `fechaCreacion`** caen siempre (fallback conservador, `_caeEnCiclo`): un compromiso así puede aparecer en la leyenda todos los meses aunque el usuario lo perciba como esporádico.

**Cambios pendientes**: ninguno propio de CAL.2. Ampliación futura sin tarjeta formal (ver `docs/BOARD.md`, nota bajo "Calendario"): la categoría "Otro" podría llevar ícono personalizado propio.

**Cambios realizados**:

- 2026-07-06 (CAL.2, leyenda dinámica): la leyenda bajo el calendario mostraba siempre las 4 entradas posibles (día de ingreso, gasto fijo, deuda entidad, deuda personal) aunque el usuario no tuviera registros de varias de ellas en el mes visible. Se agregó `tiposPresentesEnMes()` (nuevo, `agenda/logic.js`, puro): recorre el mapa de eventos del mes y devuelve solo los tipos presentes, en el orden canónico de la leyenda. `_renderLeyenda()` (`agenda/view.js`) pasó a recibir `eventos` y renderizar solo esas entradas (color, ícono y nomenclatura siguen siendo los oficiales `cal-dot--*`, sin presentación nueva); devuelve `''` si no hay ningún tipo presente (sin compromisos ni ingresos este mes, no se dibuja el contenedor). Primer análisis a fondo del dominio, ficha nueva. 10 tests nuevos en `tests/unit/agenda.test.js` (`tiposPresentesEnMes` + render dinámico de la leyenda) + 2 tests E2E nuevos/reescritos en `smoke.test.js` (con los 3 tipos presentes muestra los 3; sin nada, no dibuja la leyenda). 2243/2243 unit + 153/153 E2E verdes. SW v334 → v335.
