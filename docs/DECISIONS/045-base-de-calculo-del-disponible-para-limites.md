# ADR 045 - Base de cálculo del dinero disponible para límites

**Estado:** Abierta (decisión sin tomar). No implementar nada de este ADR.
**Fecha:** 2026-07-24
**Autores:** Esteban (producto), Claude Opus 5 (análisis)
**Relación:** acota una pieza que el [ADR 017](017-limites-centro-de-control.md) dejó definida solo como "sale de la distribución". **No revisa ni revierte** el [ADR 019](019-limites-por-rol.md) ni el [ADR 014](014-taxonomia-categorias-transversal.md). Lo consume el [ADR 044](044-motor-unico-de-sugerencia-por-categoria.md) para calcular montos sugeridos.

---

## Contexto

Hoy el presupuesto asignado por grupo en Límites de gasto sale de los **ingresos fijos**, vía la distribución ([ADR 017](017-limites-centro-de-control.md) decisión 2). Es una definición que nunca se discutió en detalle: se heredó del modelo de distribución y funcionó mientras el único dinero modelado fuera el sueldo.

El problema que abriste: puedes vender algo, recibir un pago extraordinario, cobrar un préstamo que te debían o recibir una prima, y **ese dinero también es capacidad real de gasto**. Si la base ignora los ingresos esporádicos, Límites subestima lo que puedes gastar y las sugerencias quedan por debajo de la realidad.

El riesgo en la dirección contraria lo señalaste tú mismo en el mismo brief, y es el más caro: **un saldo alto no siempre es gastable**. Puede estar comprometido con obligaciones futuras que todavía no vencieron. Una base que sume saldos sin descontar lo comprometido produciría el peor resultado posible en una app de finanzas personales: recomendar con confianza que gastes dinero que ya tiene dueño.

Las piezas para resolverlo bien ya existen y no hay que construirlas:

- `S.ingresos` distingue ingresos fijos de esporádicos.
- El motor de vencimientos de `modules/infra/vencimientos.js` ([ADR 041](041-motor-vencimientos-y-distribucion-v2.md)) sabe qué está comprometido a una fecha dada.
- Las tarjetas MC.10 y MC.11 (piso de ahorro y detección de déficit real) tocan el mismo cálculo desde el lado de Mis cuentas.

Lo que falta no es capacidad técnica: es la decisión de qué cuenta como disponible.

---

## La decisión pendiente

**Qué dinero entra en la base de cálculo de la capacidad de gasto que Límites usa para asignar y para sugerir topes.**

Sin dirección asumida. La decisión tiene que resolver dos preguntas encadenadas:

1. ¿Qué **fuentes** de dinero suman? (fijos, esporádicos, saldos ya en cuenta)
2. ¿Se **descuenta** lo comprometido y aún no pagado, y con qué corte temporal?

La segunda es la que determina si el resultado es seguro o peligroso, y es independiente de la primera.

---

## Alternativas sobre la mesa

Ninguna está elegida ni descartada.

### A. Solo ingresos fijos (statu quo)

Lo que hace hoy. A favor: predecible, nunca sugiere gastar dinero que no llegó, cero trabajo. En contra: ignora dinero real y disponible; en un mes con prima o venta, Límites queda desconectado de tu situación.

### B. Fijos más esporádicos del período

Suma los ingresos esporádicos ya registrados en el período corriente. A favor: refleja lo que efectivamente entró, sin especular. Usa un dato que ya existe en `S.ingresos`. En contra: el disponible se vuelve volátil mes a mes, y un tope calculado sobre un mes con ingreso extraordinario puede quedar alto para el mes siguiente.

### C. Fijos más esporádicos más saldos líquidos en cuenta

Añade lo que ya está en las cuentas. A favor: es la lectura más literal de "dinero disponible". En contra: **es la alternativa con el riesgo que tú señalaste**. Un saldo puede ser el dinero del arriendo que se paga en tres días. Sin descontar lo comprometido, esta opción sugiere gastar dinero con dueño.

### D. Opción C menos lo comprometido a la fecha

Igual que C, restando las obligaciones que el motor de vencimientos identifica como pendientes en la ventana relevante. A favor: es la única que responde "cuánto puedo gastar sin quedar corto", que es la pregunta real; reutiliza un motor ya en producción. En contra: la más compleja de explicar. La cifra cambia al pagar una obligación, y si el usuario no entiende por qué su disponible bajó, el número pierde credibilidad. Exige decidir la ventana temporal del corte.

---

## Consecuencias esperadas

**El riesgo no es simétrico.** Subestimar el disponible (A) produce sugerencias conservadoras: molesto, no dañino. Sobreestimarlo (C sin descuento) produce sugerencias que te dejan sin dinero para una obligación: es un daño financiero real. Cualquier decisión debería ponderar los dos errores con pesos distintos.

**El monto sugerido del [ADR 044](044-motor-unico-de-sugerencia-por-categoria.md) hereda esta decisión entera.** El motor sugerirá topes calculados sobre esta base: si la base es peligrosa, el motor amplifica el error y lo reparte por tres superficies. Por eso el ADR 044 declara que no debería cerrarse antes que este.

**Explicabilidad.** Sea cual sea la opción, la cifra tiene que poder explicarse en una línea de lenguaje humano (ADN 11). "Tu disponible es X" sin poder decir de dónde sale es peor que una cifra conservadora.

**Volatilidad.** Las opciones B, C y D hacen que el disponible cambie dentro del mes. Hay que decidir si los topes ya fijados se recalculan o se congelan al crearse, porque un tope que se mueve solo es difícil de interpretar.

**Alcance técnico.** Ninguna alternativa exige bump de schema: todas se calculan sobre datos existentes. La D reutiliza `infra/vencimientos.js` importándolo, no copiándolo, tal como fijó el ADR 041.

---

## Fuera de alcance

Esta sección es deliberadamente extensa: buena parte de la iniciativa LIM.1 **ya está decidida** en otros ADRs, y este documento no la reabre.

- **Qué grupos tienen límite y cuáles no.** Ya decidido en el [ADR 019](019-limites-por-rol.md) decisión 1: Necesidades se monitorea, Ahorro se celebra, Estilo de vida es el único con topes. **Este ADR no lo revisa.**
- **Cómo se agregan los límites.** Ya decidido en el ADR 019 decisión 2: bajo demanda, mostrando solo categorías con gasto y sin tope, no las 13 de golpe.
- **El copy por grupo.** Ya decidido en el ADR 019 decisión 3.
- **El layout de las tarjetas.** Ya decidido en el ADR 019 decisión 4.
- **Qué gastos fijos son no esenciales.** Ya decidido el 2026-07-13 en el [ADR 014](014-taxonomia-categorias-transversal.md): Streaming y Suscripciones; Gimnasio y Telefonía quedan esenciales.
- **Sugerir dónde poner un límite y detectar gasto hormiga o fantasma.** Es del [ADR 044](044-motor-unico-de-sugerencia-por-categoria.md). Este ADR le da la base numérica; no define el motor.
- **Reclasificar cada categoría de gasto por grupo** (el "camino purista"). El ADR 019 decisión 5 ya lo difirió explícitamente a un ADR propio. Sigue diferido.
- **El piso de ahorro y la detección de déficit** (MC.10, MC.11). Tocan el mismo cálculo desde Mis cuentas; se coordinan, no se absorben.

---

## No duplica

| ADR | Qué decide | Frontera con este |
|---|---|---|
| [017](017-limites-centro-de-control.md) | Límites organizado en 3 grupos; el asignado sale de la distribución | Dejó la base como "sale de la distribución", **sin especificar qué la compone**. Este la especifica |
| [019](019-limites-por-rol.md) | Tratamiento asimétrico por rol, topes bajo demanda, copy, layout | Decide **cómo se presenta y se controla**; nunca toca de qué dinero sale la cifra |
| [014](014-taxonomia-categorias-transversal.md) | Taxonomía de categorías y dimensión esencial / no esencial | Decide **qué categoría es qué**; no el monto disponible |
| [041](041-motor-vencimientos-y-distribucion-v2.md) | Motor de vencimientos y reparto por período | Le aporta **lo comprometido a la fecha** si se elige la opción D. Se importa, no se copia |

Ningún ADR existente fija la composición de la base de cálculo. Verificado antes de escribir este documento.

---

## Corrección de una nota del tablero

La tarjeta LIM.1 afirma que sacar Necesidades y Ahorro de la sección *"revisa parcialmente el ADR 019"*. **Es inexacto y conviene no propagarlo.** El ADR 019 es del 2026-07-01 y el brief es del 2026-07-05: el ADR ya había decidido lo mismo cuatro días antes, y su propio contexto anota que Necesidades y Ahorro **ya no tienen** límites configurables hoy. El brief **confirma** el ADR 019, no lo revierte.

Se deja constancia acá porque el tablero se actualiza en un paso posterior de la reorganización documental.

---

## Qué falta para cerrarlo

1. Elegir entre A, B, C y D, ponderando el error asimétrico.
2. Si se elige C o D, decidir la ventana temporal del corte de lo comprometido.
3. Decidir si los topes ya fijados se recalculan cuando el disponible cambia dentro del período.
4. Redactar la línea de explicación de la cifra, en lenguaje humano (ADN 11).
