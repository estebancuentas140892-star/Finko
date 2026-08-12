# ADR 045 - Base de cálculo del dinero disponible para límites

**Estado:** Aceptada el 2026-08-12. Esteban pidió trabajar LIM.1 y delegó explícitamente la elección ("tú tomas las decisiones"), igual que en el [ADR 046](046-analisis-interpreta-criterio-y-lenguaje.md) y el [ADR 063](063-candado-de-acceso-local.md). El copy de D5 es lo único revisable sin reabrir el ADR: cambiarlo es editar strings, no estructura.
**Fecha:** 2026-07-24 (abierta), 2026-08-12 (decidida)
**Autores:** Esteban (producto), Claude Opus 5 (análisis)
**Relación:** acota una pieza que el [ADR 017](017-limites-centro-de-control.md) dejó definida solo como "sale de la distribución". **No revisa ni revierte** el [ADR 019](019-limites-por-rol.md), el [ADR 014](014-taxonomia-categorias-transversal.md) ni el modelo de pisos del [ADR 013](013-distribucion-automatica-inteligente.md). Respeta el [ADR 024](024-reorganizacion-navegacion-movil.md) D3 (el ingreso puntual se refleja por su efecto, no como flujo nuevo). Le da base numérica al [ADR 044](044-motor-unico-de-sugerencia-por-categoria.md), que era su único bloqueo declarado.

---

## Contexto

Hoy el presupuesto asignado por grupo en Límites de gasto sale de los **ingresos fijos**, vía la distribución ([ADR 017](017-limites-centro-de-control.md) decisión 2). Es una definición que nunca se discutió en detalle: se heredó del modelo de distribución y funcionó mientras el único dinero modelado fuera el sueldo.

El problema que abriste: puedes vender algo, recibir un pago extraordinario, cobrar un préstamo que te debían o recibir una prima, y **ese dinero también es capacidad real de gasto**. Si la base ignora los ingresos esporádicos, Límites subestima lo que puedes gastar y las sugerencias quedan por debajo de la realidad.

El riesgo en la dirección contraria lo señalaste tú mismo en el mismo brief, y es el más caro: **un saldo alto no siempre es gastable**. Puede estar comprometido con obligaciones futuras que todavía no vencieron. Una base que sume saldos sin descontar lo comprometido produciría el peor resultado posible en una app de finanzas personales: recomendar con confianza que gastes dinero que ya tiene dueño.

Lo que falta no es capacidad técnica: es la decisión de qué cuenta como disponible.

---

## Inventario: cómo se calcula la base hoy

Insumo obligatorio de la decisión. Verificado contra el código el 2026-08-12.

| Pieza | Dónde | Qué hace |
|---|---|---|
| Base de ingreso | `infra/financiero.js` `estimarSalarioMensual()` | suma `S.ingresos` activos por `FACTOR_MENSUAL_INGRESO`. Bimestral y Anual no están en la tabla: quedan fuera del cómputo |
| Insumos del reparto | `tesoreria/logic/distribucion.js` `construirContextoDistribucion()` | fijos mensuales, cuotas de deuda, faltante del fondo, aportes a objetivos, suma de límites, gastos del mes, gasto variable promedio |
| Reparto | `tesoreria/logic/distribucion.js` `sugerirDistribucionIngreso()` | `montoNec = fijos + cuotas`; `residuo = ingreso - montoNec`; el ahorro toma su ideal y **Estilo de vida es lo que queda** |
| Consumo en Límites | `presupuesto/view.js` `_renderResumenGrupos()` | el asignado de los 3 grupos es `dist.split.*.monto`, sin aritmética propia |
| Dinero extraordinario | `S.ingresosPuntuales` | colección aparte desde v22; la escribe tesorería y la lee el ledger de Movimientos. **Ningún cálculo de plan la mira** |

Tres hallazgos del inventario, y los tres cambian la decisión:

**1. La premisa "`S.ingresos` distingue fijos de esporádicos" es falsa.** `S.ingresos` son plantillas recurrentes (sin fecha, sin cuenta) y el evento puntual vive en `S.ingresosPuntuales`, colección propia por decisión explícita del [ADR 024](024-reorganizacion-navegacion-movil.md) D3 punto 2. La pregunta no es "filtrar por tipo": es si el plan suma otra colección.

**2. La pregunta 2 del cierre ("¿se descuenta lo comprometido?") ya está respondida en producción.** El modelo de pisos del [ADR 013](013-distribucion-automatica-inteligente.md) pone gastos fijos más cuotas de deuda como piso duro de Necesidades **antes** de repartir, y Estilo de vida es el residuo. Lo comprometido no se suma y luego se resta: nunca llegó a Estilo de vida. No hay ventana temporal que decidir.

**3. El ingreso es el denominador de todos los pisos, así que el dinero extraordinario terminaría casi entero en gasto discrecional.** Con ingreso de $3.000.000, obligaciones de $1.500.000 y un ahorro ideal de $300.000 (importe absoluto: faltante del fondo más aportes a objetivos con fecha), Estilo de vida recibe $1.200.000. Sumar una prima de $1.500.000 al `ingresoMensual` deja el ahorro ideal igual en $300.000 y **Estilo de vida pasa a $2.700.000**: el permiso de gasto se duplica y el ahorro no se mueve un peso. La dirección es la contraria a la que aconsejaría cualquiera con esa prima en la mano.

---

## Decisión

### D1. La base del plan es el ingreso recurrente, y los saldos nunca entran

El asignado por grupo sigue saliendo de `estimarSalarioMensual(S.ingresos)`. Es la alternativa A, ahora elegida a propósito y no por inercia.

Los saldos en cuenta quedan **fuera por definición, no por prudencia**: un saldo es stock y el plan es un flujo mensual. El saldo es, en su mayoría, el ingreso que ya se contó al entrar; sumarlo al ingreso del mes cuenta el mismo dinero dos veces. Las alternativas C y D se descartan por error de categoría antes que por riesgo.

### D2. Lo comprometido ya está descontado y no se agrega ninguna ventana temporal

Límites **no** importa `infra/vencimientos.js` y no resta nada nuevo: el piso de Necesidades del ADR 013 ya lo hace estructuralmente (hallazgo 2 del inventario). La ventana del cobro sigue siendo del asistente "Distribuir mi ingreso" ([ADR 041](041-motor-vencimientos-y-distribucion-v2.md)), que responde otra pregunta: de **este** cobro, cuánto va a cada cosa.

Consecuencia práctica: D1 más D2 significan **cero cambio en la aritmética del asignado**. Ninguna rebanada de LIM.1 toca `distribucion.js` por este ADR.

### D3. El dinero extraordinario se reconoce, y no se reparte

La suma de `S.ingresosPuntuales` del mes en curso se muestra como **una línea informativa** dentro de Estilo de vida, al lado de la olla finita. No entra al split, no sube el presupuesto del grupo, no sube ningún tope y no alimenta ningún monto sugerido.

Esto responde tu punto 7 sin volverlo peligroso: el dinero extraordinario **sí** es capacidad de gasto, y Finko lo dice; lo que no hace es convertirlo en permiso automático de gasto discrecional (hallazgo 3). La salida de la línea es Mis cuentas, donde ese dinero puede ir al fondo, a una meta o a una deuda.

Es coherente con el [ADR 024](024-reorganizacion-navegacion-movil.md) D3 punto 1: el ingreso puntual se refleja por su efecto y no se convierte en un flujo del plan. La alternativa B queda descartada en su forma literal (sumarlo a la base).

### D4. Un tope fijado nunca se recalcula solo

`S.presupuestos[].montoMensual` es dato del usuario: se cambia editándolo, nunca por movimiento del plan. Lo único que se mueve mes a mes es el asignado del grupo y la cobertura (`coberturaLimitesEstiloVida`). Cierra el punto 3 del cierre original.

### D5. La cifra se explica en una línea (ADN 11)

- El plan: **"Tu plan del mes sale de tus ingresos recurrentes, después de tus gastos fijos y las cuotas de tus deudas."**
- El extra de D3: **"Este mes entraron $X que no son parte de tu plan."**

Ninguna otra superficie tiene que reescribir esta explicación: si hace falta repetirla, se cita.

### D6. Qué hereda el ADR 044

El monto sugerido se calcula sobre el **presupuesto de Estilo de vida y su parte sin tope** (`coberturaLimitesEstiloVida`), más el histórico de la categoría. Nunca sobre saldos ni sobre dinero extraordinario. Con eso, el bloqueo que el [ADR 044](044-motor-unico-de-sugerencia-por-categoria.md) declaraba ("no debería cerrarse antes que el 045") queda levantado.

---

## Alternativas descartadas

### A. Solo ingresos fijos (statu quo)

**Elegida en D1** como base del plan, y ampliada por D3 para que el dinero extraordinario no quede invisible. Su contra original ("ignora dinero real y disponible") la resuelve D3 sin tocar el reparto.

### B. Fijos más esporádicos del período

Descartada en su forma literal. Sumar el esporádico al `ingresoMensual` agranda sobre todo Estilo de vida y deja el ahorro igual (hallazgo 3), además de hacer volátil un plan que el usuario interpreta como estable. Su intención se conserva en D3: el dato se muestra, no se reparte.

### C. Fijos más esporádicos más saldos líquidos en cuenta

Descartada por error de categoría (D1): mezcla stock con flujo y cuenta dos veces el mismo dinero, además del riesgo que tú mismo señalaste.

### D. Opción C menos lo comprometido a la fecha

Descartada: resuelve con código nuevo un problema que el modelo de pisos ya resuelve (hallazgo 2), y arrastra el doble conteo de C. La cifra más difícil de explicar del ADR habría sido también la menos necesaria.

---

## Consecuencias

**Riesgo asimétrico respetado.** La decisión no sobreestima nunca: la base solo contiene dinero recurrente y el reparto ya descuenta obligaciones. El error posible queda del lado conservador, que es molesto y no dañino.

**Sin schema y sin tocar el motor de reparto.** No hay bump de `SCHEMA_VERSION` y `distribucion.js` no se modifica. El único código nuevo que este ADR autoriza es la línea de D3: una función pura en `presupuesto/logic.js` que suma `S.ingresosPuntuales` del mes, más su render.

**Mis cuentas y Límites siguen contando lo mismo.** Al no cambiar la base, las dos superficies conservan la fuente única del ADR 017 y no hay riesgo de que muestren cifras distintas del mismo plan.

**Queda un hueco conocido, y no es de este ADR.** Los ingresos con frecuencia Bimestral o Anual no entran en `estimarSalarioMensual` (no están en `FACTOR_MENSUAL_INGRESO`). Es un hueco del cálculo del ingreso recurrente, no de la composición de la base: si alguna vez molesta, es tarjeta propia de tesorería.

**Volatilidad acotada.** Con D3 y D4, lo único que se mueve dentro del mes es una línea informativa. Ningún tope ni ningún presupuesto de grupo cambia por registrar un ingreso puntual.

---

## Fuera de alcance

Buena parte de la iniciativa LIM.1 **ya estaba decidida** en otros ADRs, y este documento no la reabre.

- **Qué grupos tienen límite y cuáles no.** [ADR 019](019-limites-por-rol.md) decisión 1: Necesidades se monitorea, Ahorro se celebra, Estilo de vida es el único con topes.
- **Cómo se agregan los límites.** ADR 019 decisión 2: bajo demanda, solo categorías con gasto y sin tope.
- **El copy por grupo** (ADR 019 decisión 3) y **el layout de las tarjetas** (decisión 4).
- **Qué gastos fijos son no esenciales.** Decidido el 2026-07-13 en el [ADR 014](014-taxonomia-categorias-transversal.md): Streaming y Suscripciones; Gimnasio y Telefonía quedan esenciales. **Su implementación (punto 8 de LIM.1) sí toca el reparto**: mover esas dos categorías a Estilo de vida cambia el piso de Necesidades del ADR 013 y hay que moverlo en ambos lados a la vez, o el grupo aparece excedido contra un asignado que no lo incluye. Eso es la rebanada LIM.1b, que revisa la **clasificación**, no la base que decide este ADR.
- **Sugerir dónde poner un límite y detectar gasto hormiga o fantasma.** Es del [ADR 044](044-motor-unico-de-sugerencia-por-categoria.md); este ADR le da la base numérica (D6).
- **Reclasificar cada categoría de gasto por grupo** (el "camino purista"). Diferido por el ADR 019 decisión 5 a un ADR propio. Sigue diferido.
- **El piso de ahorro y la detección de déficit** (MC.10, MC.11). Tocan el mismo cálculo desde Mis cuentas; se coordinan, no se absorben.

---

## No duplica

| ADR | Qué decide | Frontera con este |
|---|---|---|
| [017](017-limites-centro-de-control.md) | Límites organizado en 3 grupos; el asignado sale de la distribución | Dejó la base como "sale de la distribución", **sin especificar qué la compone**. Este la especifica |
| [013](013-distribucion-automatica-inteligente.md) | Modelo de pisos por prioridad del reparto | Decide **cómo se reparte** el ingreso; este decide **qué ingreso** se reparte |
| [019](019-limites-por-rol.md) | Tratamiento asimétrico por rol, topes bajo demanda, copy, layout | Decide **cómo se presenta y se controla**; nunca toca de qué dinero sale la cifra |
| [014](014-taxonomia-categorias-transversal.md) | Taxonomía de categorías y dimensión esencial / no esencial | Decide **qué categoría es qué**; no el monto disponible |
| [024](024-reorganizacion-navegacion-movil.md) | El ingreso puntual sube el saldo y queda en su historial, no es flujo | Este lo **muestra** en Límites sin convertirlo en flujo del plan (D3) |
| [041](041-motor-vencimientos-y-distribucion-v2.md) | Motor de vencimientos y reparto por período | Responde "de este cobro, cuánto va a cada cosa". D2 declara que Límites no lo necesita |

Ningún ADR existente fija la composición de la base de cálculo. Verificado antes de escribir este documento.

---

## Corrección de una nota del tablero

La tarjeta LIM.1 afirmaba que sacar Necesidades y Ahorro de la sección *"revisa parcialmente el ADR 019"*. **Es inexacto y conviene no propagarlo.** El ADR 019 es del 2026-07-01 y el brief es del 2026-07-05: el ADR ya había decidido lo mismo cuatro días antes, y su propio contexto anota que Necesidades y Ahorro **ya no tienen** límites configurables hoy. El brief **confirma** el ADR 019, no lo revierte. La nota ya se corrigió en el tablero.

---

## Qué queda cerrado

1. **Elegir entre A, B, C y D:** A, elegida a propósito y ampliada por D3 (D1).
2. **Ventana temporal del corte:** no aplica, el piso de Necesidades ya descuenta lo comprometido (D2).
3. **Si los topes se recalculan:** no, nunca solos (D4).
4. **Línea de explicación en lenguaje humano:** redactada (D5).

Implementación: rebanadas **LIM.1a** (la línea de D3) y **LIM.1b** (punto 8, fijos no esenciales) en [`board/limites.md`](../board/limites.md). **LIM.1c** (sugerencias) sigue esperando el ADR 044, que este ADR desbloquea con D6.
