# ADR 041 - Motor de vencimientos y aportes recomendados + Distribución v2

**Estado:** Aceptado parcialmente, en curso. Escrito en la fase de análisis de **MC.13** (Opus 4.8), antes de codificar (regla 2.6). **El motor (D1) está aprobado por Esteban y construido**: MC.13a (mitad A) y MC.13b (mitad B) cerradas el 2026-07-14 y en producción. **Siguen abiertas las dos decisiones que son de Esteban** (conflictos con ADRs aprobados, sección "Decisiones pendientes de Esteban" abajo): no bloquean MC.13c ni MC.13d, sí MC.13e. Ninguna rebanada que dependa de ellas se inicia sin su palabra.
**Fecha:** 2026-07-14
**Autores:** Esteban (producto, brief del 2026-07-08: 21 puntos + integración ingreso fijo→cuenta), Claude Opus 4.8 (análisis y diseño)
**Relación:** redefine el asistente "Distribuir mi ingreso" de los [ADR 012](012-auto-distribucion-ingresos.md), [ADR 013](013-distribucion-automatica-inteligente.md) y **[ADR 018](018-asistente-distribuir-ingreso.md)** (que quedará **parcialmente superado**: el asistente pasa de "todo el mes" a "qué toca con este cobro"). Generaliza la lógica de ocurrencias por frecuencia de `eventosDelMes` ([ADR 021](021-recordatorio-dia-de-ingreso.md), `agenda/logic.js`) y unifica las copias duplicadas de "aporte por período" de Metas y Apartados. **Toca dos decisiones aprobadas** (conflictos (a) NAV.A2b del [ADR 024](024-reorganizacion-navegacion-movil.md) y (b) crédito automático, materia del ADR de pagos automáticos **PA.1**). **Requiere bump de `SCHEMA_VERSION`** (campo `cuentaId` en `Ingreso`).

---

## Contexto

### El problema que reporta Esteban

El asistente "Distribuir mi ingreso" (épica MC.7, cerrada) hoy muestra **todas** las necesidades, ahorros y obligaciones registradas cada vez que se abre. Con pocos registros funciona; con muchos, satura: responde "¿cómo reparto todo lo del mes?" cuando la pregunta real del usuario al recibir un cobro es **"¿qué debo hacer HOY con este dinero?"**. Un usuario que cobra quincenal no debería ver las 12 obligaciones del mes al recibir su primera quincena, solo las que vencen en la ventana de ese cobro y los aportes que corresponden a ese período.

### Lo que ya existe (la mitad del motor)

El análisis del código encontró que la lógica de "ocurrencias por frecuencia" y "aporte por período" ya existe, **fragmentada y en parte duplicada**:

1. **Ocurrencias por frecuencia** (`agenda/logic.js`): `_diasParaCompromiso(c, year, month, diasEnMes)` resuelve en qué días de un mes cae un compromiso según su frecuencia (Mensual, Quincenal, Semanal, Diario, Bimestral, Trimestral, Semestral, Anual, Única vez). `eventosDelMes` y `eventosIngresosDelMes` lo usan; `eventosEnProximos` busca el próximo evento en una ventana de N días. **Es la mitad del motor de vencimientos, pero opera por MES, no por VENTANA de cobro.**

2. **Itemización de necesidades** (`tesoreria/logic/distribucion.js`): `construirDesgloseNecesidades(compromisos, gastos, hoy)` lista fijos + cuotas de deuda con estado "ya pagado este período". **Limitación (el hueco de MC.7g): solo incluye fijos con `frecuencia === 'Mensual'`**; un fijo Quincenal/Semanal/Diario no aparece.

3. **Fecha de cobro** (`tesoreria/logic/ingresos.js`): `ultimoPagoHasta` / `diasParaProximoPago` / `estadoDistribucion` datan el cobro. **Limitación: solo soportan Mensual y Quincenal**; un ingreso Semanal o Diario no tiene ni gating ni ventana.

4. **Aporte por período, DUPLICADO en dos dominios**:
   - `metas/logic.js`: `frecuenciaPrincipalIngresos(ingresos)`, `etiquetaPeriodoAhorro(frecuencia)`, `calcularAhorroPorPeriodo(meta, frecuencia)` + constantes `FRECUENCIAS_AHORRO`, `MAPA_FRECUENCIA_A_AHORRO`, `DIAS_POR_PERIODO_AHORRO`.
   - `apartados/logic.js`: **la misma** `frecuenciaPrincipalIngresos` + `FRECUENCIAS_APORTE`, `MAPA_FRECUENCIA_A_APORTE`, `DIAS_POR_PERIODO` (valores idénticos: Diario 1, Semanal 7, Quincenal 15, Mensual 30). Cada archivo lo comenta como "duplicado intencional de la misma idea".
   - `distribucion.js`: `_aporteMensualObjetivo` reparte por MESES, no por período de ingreso (el punto 21 pide lo contrario).
   - `ahorro/logic.js` (AH.2): calcula el aporte recomendado del fondo con datos reales; sería el tercer consumidor.

**Diagnóstico:** hay tres copias parciales de "frecuencia → período → cuánto por período" y dos modelos de itemización de obligaciones que no comparten ventana. Construir un cuarto motor para MC.13 sería el error exacto que la regla 2.7 (fusión TX.10/LIM.1/ANL.1) previene. La decisión es **extraer y generalizar una sola pieza compartida**.

---

## Decisión

### D1. Un motor compartido en `infra/vencimientos.js` (pieza única de infraestructura)

Nace `modules/infra/vencimientos.js`: funciones puras, sin DOM, sin `S`, sin importar dominios (es infra, la consumen todos, ADN #10 intacto, mismo hogar que `infra/financiero.js` para `estimarSalarioMensual`). Tiene **dos mitades**:

**Mitad A - Ocurrencias y ventana (vencimientos).**

- `ocurrenciasEnRango(item, inicioISO, finISO)`: días en que un compromiso/ingreso cae dentro de `[inicio, fin]` según su frecuencia. Generaliza `_diasParaCompromiso` de un mes a un rango arbitrario (una ventana puede cruzar meses: una quincena del 25 de julio al 9 de agosto). `agenda/logic.js` pasa a **consumir** esta función (su `eventosDelMes` queda como envoltorio de conveniencia por mes, sin duplicar la lógica de frecuencias). Fuente única de la regla de frecuencias.
- `ventanaDelCobro(frecuencia, fechaCobroISO)`: dado un cobro y su frecuencia, devuelve `{ inicioISO, finISO }` = de ese cobro hasta el día anterior al siguiente cobro de la misma frecuencia. Quincenal ≈ 15 días, Mensual ≈ 1 mes, Semanal ≈ 7. Soporta **todas** las frecuencias (cierra el hueco de `ultimoPagoHasta`, hoy solo Mensual/Quincenal).

**Mitad B - Frecuencia de ingresos y aporte por período (aportes recomendados).**

- `frecuenciaPrincipalIngresos(ingresos)`: **una sola copia** (hoy duplicada en Metas y Apartados). La más común entre los ingresos activos, mapeada a `{Diario, Semanal, Quincenal, Mensual}`.
- `diasPorPeriodo(frecuencia)` y `etiquetaPeriodo(frecuencia)`: constantes únicas (hoy triplicadas).
- `aportePorPeriodo(faltante, fechaObjetivoISO, frecuencia, hoy)`: faltante repartido entre los períodos de la frecuencia real hasta la fecha objetivo. Generaliza `calcularAhorroPorPeriodo` de Metas para que Apartados, el fondo (AH.2) y la distribución lo consuman igual. **Reemplaza el reparto por meses de `_aporteMensualObjetivo`** en el asistente (punto 21: "la cuota del período según la frecuencia del ingreso, no el objetivo total").

### D2. La función central del asistente: `obligacionesYAportesDelCobro`

Sobre las dos mitades, una función compone la respuesta a "¿qué toca con este cobro?":

```
obligacionesYAportesDelCobro({ cobro:{frecuencia, fechaISO}, compromisos, gastos, metas, apartados, fondo, hoy })
  → {
      ventana: { inicioISO, finISO },
      vencidas:    [ obligaciones con día de pago anterior a hoy y no pagadas este período ],
      enVentana:   [ obligaciones que vencen dentro de [hoy, finVentana] ],
      aportes:     [ { tipo:'fondo'|'meta'|'apartado', id, nombre, montoPeriodo, sinFecha } ],
    }
```

- **Solo lo del cobro, no todo el mes**: `enVentana` filtra por la ventana de D1, no por el mes completo. Responde la pregunta real del usuario.
- **Vencidas separadas de por-vencer**: hoy `construirDesgloseNecesidades` mezcla todo; separarlas permite el copy "esto ya venció" vs "esto vence antes de tu próximo cobro" (puntos 9-10: cada recomendación en el paso de su categoría, no todas juntas).
- **Absorbe MC.7g**: al usar `ocurrenciasEnRango` (todas las frecuencias), un fijo Quincenal/Semanal/Diario aparece en su ventana correcta. El hueco de "solo Mensual" desaparece sin código especial.

> **Corrección de la implementación (MC.13c-1, 2026-07-14).** La frase "sin código especial" de arriba resultó **inexacta** y se deja escrita para no reescribir la historia. El motor sí resuelve las frecuencias, pero la checklist no puede consumirlo sin decidir antes tres cosas que **no son técnicas**, y por eso MC.13c se partió en MC.13c-1 (la función, cerrada) y MC.13c-2 (el wiring, bloqueado):
>
> 1. **Qué significa "ya lo pagaste"**: `_pagadoEstePeriodo` cuenta el **mes calendario**; el motor cuenta la **ventana del cobro**. Con un fijo Quincenal la regla actual está mal (un pago marcaría las dos ocurrencias), pero cambiarla altera lo que hoy ve bien un usuario mensual.
> 2. **Qué registra marcar una fila de varias ocurrencias**: `_aplicarNecesidad` escribe UN `Gasto`. ¿Un gasto de $120.000 o dos de $60.000? Cambia Movimientos y Análisis.
> 3. **Reescribir ~20 tests vigentes** de `construirDesgloseNecesidades` (regla 2.5).
>
> Además hay una **dependencia técnica no prevista**: `ultimoPagoHasta` sigue devolviendo `null` para todo lo que no sea Mensual/Quincenal, así que datar el cobro de un usuario Semanal o Diario es una rebanada previa. `ventanaDelCobro` cubre las frecuencias, pero **datar el último cobro** no se generalizó.
>
> **Cerrado en MC.13c-3 (2026-08-02), con un límite.** `ultimoVencimientoHasta(item, hoyISO)` en el motor data el último cobro de las **seis frecuencias con día del mes**, y `ultimoPagoHasta` queda como envoltorio que le pasa el ingreso entero (las largas sitúan su ciclo desde `fechaCreacion`). **Semanal y Diario siguen sin datarse, y no por omisión**: caen por día de semana, el formulario no les pide `diaPago` y darles fecha exige un campo nuevo, que es otra decisión. Lo que la corrección de arriba temía (un usuario largo sin guard de de-duplicación) ya no ocurre; lo que sigue abierto es el modelo de datos de las frecuencias sin día del mes.
>
> Dos decisiones de diseño que MC.13c-1 sí tomó, por ser técnicas: **una fila por compromiso, no por ocurrencia** (un `Gasto` no dice a qué ocurrencia pertenece: atribuirlo sería inventar el dato) y **un mismo compromiso puede estar en `vencidas` y en `enVentana`** con ocurrencias distintas (son deudas reales distintas; los tramos son disjuntos).
- **Aportes por período** (no total ni mensual): consume `aportePorPeriodo` (punto 21).

### D3. Consumidores del motor (un motor, no cuatro)

| Consumidor | Qué usa | Estado |
|---|---|---|
| Asistente Distribución v2 (MC.13) | `obligacionesYAportesDelCobro` completo | esta iniciativa |
| Checklist de Necesidades (ex MC.7g) | `enVentana` + `vencidas` con todas las frecuencias | **absorbido aquí** |
| Metas (`calcularAhorroPorPeriodo`) | `aportePorPeriodo` + `frecuenciaPrincipalIngresos` | migra a la copia única (MT.6) |
| Apartados (prellenar "Aportar", AP.5) | `aportePorPeriodo` | consumidor |
| Fondo en la distribución (AH.5) | `aportePorPeriodo` sobre el objetivo del fondo | consumidor |
| Pagos automáticos (PA.1) | `vencidas` (catch-up al abrir) | consumidor futuro |
| Cuota del período (punto 21) | `aportePorPeriodo` | integrado |

Metas y Apartados **borran** sus copias de `frecuenciaPrincipalIngresos`/`DIAS_POR_PERIODO`/etc. y re-importan de `infra/vencimientos.js`. Es refactor sin cambio de comportamiento (los valores son idénticos): una rebanada propia, verificable con los tests existentes de ambos dominios.

### D4. Distribución v2: el asistente en 2 pasos (dirección; detalle en rebanadas)

El brief (puntos 9-20) redefine la UX. La dirección, sin cerrar cada pantalla aquí (eso son rebanadas de UI que consumen el motor):

- **Paso 0 educativo** (punto 9): antes de repartir, cómo distribuyen los expertos (barras/porcentajes 50/30/20, candidato a logro por distribución saludable sostenida). Reutiliza la barra 50/30/20 que MC.18e ya pinta en la tarjeta.
- **Recomendaciones en el paso de su categoría** (punto 10), no todas al inicio: el motor ya separa vencidas / en-ventana / aportes por grupo.
- **Dos bloques visuales independientes** (punto 12): "recibiste tu ingreso" y el asistente.
- **Cada fila con logo/ícono + nombre + nota** (punto 15): diferencia dos "Arriendo" (reutiliza MK.2 + CAT.2, ya existentes).
- **El excedente exige decisión explícita** (punto 18): dejar en cuenta / ahorro / meta, antes de finalizar.
- **Quitar accesos "Ver progreso / estrategias / límites"** del asistente (punto 11) y **"Abonar extra a deudas" del paso de ahorro** (punto 16: un abono es un pago, vive en Deudas).
- **Navegación Atrás/Siguiente modernizada** (punto 17), coherente con la familia visual v2 (IV/ADR 033).

### D5. Integración ingreso fijo → cuenta (requiere schema)

El brief pide que el ingreso fijo registre **en qué cuenta se recibe**, para que el asistente parta de esa cuenta y el paso final "Estilo de vida" desaparezca (lo no distribuido simplemente se queda ahí, reflejando la realidad; revisa el cierre del asistente MC.7e).

- **Schema**: campo opcional `cuentaId` en `@typedef Ingreso` (`Ingreso` hoy NO lo tiene; `IngresoPuntual` sí). Bump `SCHEMA_VERSION` v26→v27, **migración idempotente y aditiva** (los ingresos existentes quedan con `cuentaId` ausente → el asistente cae al patrón de cuenta única / pregunta, como hoy). Sin backfill destructivo.
- **Efecto**: con `cuentaId`, el asistente arranca en esa cuenta y descuenta de ahí (elimina la pregunta de cuenta del flujo cuando el dato existe). Sin `cuentaId`, comportamiento actual.
- **NO implica crédito automático**: registrar la cuenta de destino es un dato; abonar solo a esa cuenta en la fecha de pago es el conflicto (b), materia de PA.1.

---

## Decisiones pendientes de Esteban (regla 2.7: no se revierte un ADR en silencio)

### Conflicto (a) - El ingreso esporádico deja de ofrecer distribución (revierte NAV.A2b s2, ADR 024 D3)

El brief (puntos 7+19) pide separar **ingreso fijo** (periódico, dispara la distribución) de **ingreso esporádico** (solo acredita y registra, **sin** ofrecer distribución). Hoy, tras registrar un ingreso puntual, `_ofrecerDistribucion` (`tesoreria/acciones/ingresos.js`) ofrece repartirlo con el asistente en modo "ya acreditado" (NAV.A2b s2, cerrada e implementada el 2026-07-04). Quitar esa oferta **revierte una decisión aprobada del ADR 024**.

- **Argumento a favor de quitarla** (brief): un ingreso esporádico (venta, regalo) no tiene la cadencia que justifica repartir con el motor de ventana; ofrecerlo cada vez es ruido.
- **Argumento en contra** (por qué se construyó): el modo "ya acreditado" resolvió el doble-abono justamente para poder ofrecer distribución tras un puntual sin re-acreditar; el usuario podría querer repartir un ingreso grande esporádico.
- **Recomendación del análisis**: quitar la oferta **automática** tras el puntual (el brief manda), pero **conservar** el asistente accesible manualmente (el usuario que quiera repartir un esporádico grande lo abre desde la tarjeta "Distribuir"). Así se respeta el brief sin perder la capacidad. **Decisión de Esteban.**

### Conflicto (b) - Crédito automático del ingreso fijo a la cuenta (materia de PA.1, no de este ADR)

El brief pide que "el dinero del ingreso fijo se abone automáticamente a la cuenta en la fecha de pago". Eso es un **movimiento automático sin confirmación**, exactamente el problema de filosofía de PA.1 (pagos automáticos): en una PWA offline sin servidor no hay "ejecutar a la fecha", sería catch-up al abrir, y Finko registraría dinero que el usuario no confirmó. **Débitos y créditos automáticos son el mismo problema**: se deciden juntos en el ADR de PA.1, con un solo criterio, **no aquí**. Este ADR solo agrega el dato `cuentaId` (D5); la automatización del abono queda fuera de su alcance y bloqueada por PA.1.

---

## Alternativas consideradas

- **Un cuarto motor propio del asistente** (leer todo y filtrar en la vista). Descartada: es el anti-patrón de la regla 2.7 (tres copias ya existen). El costo de extraer a `infra/` se paga una vez y elimina la duplicación de Metas/Apartados de paso.
- **Dejar el motor en `agenda/logic.js`** (donde vive `eventosDelMes`). Descartada: Agenda es un dominio; que Metas, Apartados y Tesorería importaran de Agenda violaría ADN #10. Infra es el único hogar neutral.
- **Ventana = mes calendario** (statu quo del asistente). Descartada: no responde "qué toca con ESTE cobro" para quien cobra quincenal/semanal; es la causa raíz de la saturación que reporta Esteban.
- **Reparto de aportes por meses** (`_aporteMensualObjetivo` actual). Se conserva para `calcularAporteMensualObjetivos` (usos agregados fuera del asistente) pero el asistente pasa a `aportePorPeriodo` (punto 21).
- **Bump de schema con backfill de `cuentaId`** (asignar la cuenta de mayor saldo a los ingresos existentes). Descartada: adivinar la cuenta de destino es inventar un dato; ausente es honesto y cae al comportamiento actual.

---

## Consecuencias

### Positivas

- **Un solo motor** para 6+ consumidores; se borran las copias duplicadas de Metas/Apartados (menos superficie, un solo lugar donde arreglar la regla de frecuencias).
- El asistente responde la pregunta real ("qué toca hoy") en vez de "todo el mes": menos saturación, el objetivo del brief.
- Cierra MC.7g (fijos no mensuales en la checklist) sin código especial.
- Habilita PA.1, la cuota del período (punto 21), el plan de Metas v2 (MT.6), el prellenado de Apartados (AP.5) y el aporte del fondo en la distribución (AH.5): todos pasan a consumir la pieza única.

### Negativas / Restricciones

- **Bump de schema** (v26→v27): toda migración es riesgo; se mitiga con aditiva idempotente + tests de migración (precedente MC.17a).
- **Refactor de Metas y Apartados** (borrar sus copias): rebanada propia, verificable con los tests existentes, sin cambio de comportamiento.
- **Alcance grande**: el asistente v2 (puntos 9-20) son varias rebanadas de UI. El motor (D1-D3) es la fundación y va primero; la UI después, cada pieza verificable.
- **Dos decisiones de Esteban** bloquean rebanadas concretas (no el motor): (a) la oferta tras el esporádico, (b) el crédito automático (PA.1).

---

## Rebanadas de implementación (smallest-first)

El **motor (MC.13a-b) no depende de los conflictos** y puede arrancar apenas Esteban apruebe este ADR. Las rebanadas de UI del asistente dependen del motor y, algunas, de las decisiones (a)/(b).

| Rebanada | Qué | Depende de | Modelo |
|---|---|---|---|
| **MC.13a** | `infra/vencimientos.js` mitad A (`ocurrenciasEnRango`, `ventanaDelCobro`) + Agenda pasa a consumirla (su `eventosDelMes` queda como envoltorio). Solo-unit + E2E de Calendario intactos. | ADR aprobado | Opus 4.8 - Alto (lógica de fechas/frecuencias, riesgo de regresión en Calendario) |
| **MC.13b** | `infra/vencimientos.js` mitad B (`frecuenciaPrincipalIngresos`, `diasPorPeriodo`, `aportePorPeriodo`) + Metas y Apartados **borran sus copias** y re-importan. Refactor sin cambio de comportamiento, verificado con sus tests. | MC.13a | Opus 4.8 - Alto |
| **MC.13c-1** | `obligacionesYAportesDelCobro` (D2) puro + 40 tests. **Cerrada 2026-07-14.** Sin consumidores todavía. | MC.13b | Opus 4.8 - Alto |
| **MC.13c-2** | La checklist de Necesidades y el desglose de ahorro pasan a consumirlo (absorbe MC.7g). **Cerrada 2026-07-14**: las 3 decisiones de producto se tomaron y generalizar `ultimoPagoHasta` resultó innecesario para el wiring, así que se separó. | MC.13c-1 + decisiones de Esteban | Opus 4.8 - Alto |
| **MC.13c-3** | Generalizar el datado del cobro: `ultimoVencimientoHasta` en el motor. **Cerrada 2026-08-02**, ver la nota de cierre en D2. Semanal y Diario quedan fuera por modelo de datos, no por alcance. | MC.13c-2 | Opus 5 - Alto |
| **MC.13d** | Schema: `cuentaId` en `Ingreso` (D5), bump v26→v27 + migración + el form de ingreso fijo captura la cuenta. **Cerrada 2026-07-14**: migración intencionalmente no-op (no hay nada que migrar sin backfill), form con patrón 0/1/varias y selector sin preseleccionar. | nada dura; independiente | Opus 4.8 - Extra (bump con migración) |
| **MC.13e+** | Asistente v2 UI (puntos 9-20): paso educativo, recomendaciones por categoría, excedente explícito, filas con logo, navegación v2. Varias rebanadas de UI. | MC.13c, MC.13d; **decisión (a)** para el flujo esporádico | Sonnet 5 - Alto por rebanada |

Cada rebanada se verifica en la app (desktop + móvil) con tests verdes antes de commit, según el workflow de [`/CLAUDE.md`](../../CLAUDE.md).
