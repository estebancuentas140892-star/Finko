# ADR 048 - Metas v2: subcategorías inteligentes y plan de aportes generado

**Estado:** Aceptada en alcance (triaje del brief de Esteban del 2026-07-08, 7 puntos). Implementación en curso, tarjeta **MT.6** en [BOARD.md](../BOARD.md). **D1:** la estructura de datos delegada quedó decidida en el [ADR 064](064-estructura-de-dos-niveles.md) (2026-08-12) y su fundación está construida (MT.6a: `SUBCATEGORIAS_META` + `infra/taxonomia.js`); falta la UI y el campo almacenado (MT.6b). **D2: cumplida sin código nuevo**, la entregaron MT.4 y MC.13b (`calcularAhorroPorPeriodo` ya consume `frecuenciaPrincipalIngresos` del motor del ADR 041). **D3:** pendiente (MT.6c).
**Fecha:** 2026-07-24
**Autores:** Esteban (producto, brief del 2026-07-08), Claude Opus 5 (triaje y redacción)
**Relación:** consume el motor de vencimientos del [ADR 041](041-motor-vencimientos-y-distribucion-v2.md) para el cálculo por período. La estructura de dos niveles de D1 se decide junto con la validación D3 del [ADR 029](029-catalogo-de-marcas-por-categoria.md). La variante automatizada de D3 pertenece al ADR de pagos automáticos (tarjeta PA.1), no a este.

---

## Contexto

El principio del brief es que **el usuario dice QUÉ quiere y PARA CUÁNDO, y Finko calcula, genera y sincroniza**. Hoy Metas cumple la primera mitad: se registra un objetivo con monto y fecha, y el dominio calcula una cuota. La segunda mitad falta.

Faltan tres cosas concretas. La app no reconoce **qué tipo** de meta es, así que no puede automatizar ni comparar nada. El cálculo de cuota no siempre usa la frecuencia real con la que el usuario recibe dinero. Y no existe un plan: hay una cuota teórica, pero no un calendario de aportes que se pueda ver, seguir ni recalcular cuando algo cambia.

---

## Decisiones

### D1. Subcategorías por categoría, con la estructura decidida una sola vez

Cada categoría de meta gana subcategorías (Tecnología a Laptop / Celular / Tablet; Vehículo a Carro / Moto / Bicicleta; y lo equivalente en Vivienda, Educación, Viajes). El usuario escribe lo mínimo y Finko reconoce el tipo de meta, que es lo que habilita automatizaciones y estadísticas.

**El punto no obvio, y la razón de que esto sea una decisión y no un detalle:** categoría a subcategoría es el **mismo patrón de dos niveles** que entidad a producto en Deudas y en la tarjeta de crédito (MC.16). Son el mismo problema de modelado con dos nombres. Se decide **una sola vez**, en la validación D3 del ADR 029, y ambos consumidores usan esa estructura. Modelarlo dos veces es garantizar dos formas distintas de representar lo mismo.

### D2. La cuota usa la frecuencia real de ingresos, nunca asume quincenal

El cálculo lee la frecuencia con la que el usuario efectivamente recibe dinero, registrada en Mis cuentas (diaria, semanal, quincenal, mensual, personalizada). Queda prohibido asumir quincenal por defecto.

La base ya existe y no hay que construirla: Metas ya calcula cuota, el ADR 021 ya lee el día de ingreso, y el reparto por período es del motor del ADR 041. Metas es **consumidor** de ese motor, no autor de una segunda tabla de frecuencias.

### D3. El plan de aportes se genera y se recalcula completo, pero no se ejecuta solo

Al crear la meta, Finko genera el plan: un registro de aporte por cada fecha de ingreso hasta la fecha objetivo. Si cambia la frecuencia del ingreso, o la fecha o el monto de la meta, **el plan entero se recalcula**, no se parcha.

El límite es explícito: el plan es **visible y recordatorio**, no ejecución. Si esos aportes se aplicaran solos serían movimientos automáticos sin confirmación del usuario, que es exactamente el problema de filosofía que la iniciativa PA se reserva ("Finko refleja la realidad, no la inventa"). Esa variante pertenece al ADR de pagos automáticos y se decide allá.

---

## Consecuencias

**Metas deja de ser una sección aislada.** Al consumir el motor de vencimientos y la frecuencia real de ingresos, el cálculo pasa a depender de datos que viven en Mis cuentas. La comunicación sigue siendo por EventBus y motores compartidos en `infra/` (ADN 10): ningún dominio importa a otro.

**El plan visible toca Calendario.** Un plan de aportes con fechas es contenido que el Calendario debería poder mostrar. Coordinación, no dependencia dura.

**Recalcular el plan completo es más simple y más seguro que parchearlo,** al costo de perder cualquier ajuste manual que el usuario hubiera hecho sobre un aporte individual. Si en el futuro se permite editar un aporte suelto, esta decisión hay que revisarla.

---

## Fuera de alcance

- **Orden de campos del formulario.** Es la regla transversal de CAT.4.
- **La opción "Otro" con icono y nombre propios.** Es de CAT.2 / CAT.3, donde Metas entra como un consumidor más del picker compartido.
- **El cálculo de cuota integrado al asistente "Distribuir mi ingreso".** Era el punto 21 del brief y su dueño es MC.13 / [ADR 041](041-motor-vencimientos-y-distribucion-v2.md); Metas quedó registrada ahí como consumidor explícito del motor.
- **La "sincronización total entre secciones" del punto 7.** No es una tarea: ya es el ADN del proyecto (EventBus más motores compartidos). Se declara cumplida por construcción.
- **Ejecutar los aportes automáticamente.** Ver D3.

---

## Qué falta para cerrarlo

1. ~~**La estructura de datos de dos niveles de D1** se fija en la validación D3 del [ADR 029](029-catalogo-de-marcas-por-categoria.md).~~ **Resuelto el 2026-08-12 por el [ADR 064](064-estructura-de-dos-niveles.md).** La validación del ADR 029 fijó la taxonomía de tags, pero no la forma de datos, y su Fase 0 nunca se construyó: la delegación apuntaba a un lugar donde la respuesta no estaba. El ADR 064 la escribe (catálogo plano de hijos etiquetados con su padre) y los tres consumidores la comparten.
2. **Coordinar con la iniciativa PA** si en algún momento el plan pasa de recordatorio a ejecución.
