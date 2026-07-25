# ADR 052 - Pagos y créditos automáticos (débito automático simulado)

**Estado:** **Abierta** (las dos decisiones de filosofía siguen sin tomar). No implementar nada de este ADR. La secuencia previa sí está decidida, ver D0. Tarjeta de seguimiento: **PA.1** en [BOARD.md](../BOARD.md).
**Fecha:** 2026-07-24
**Autores:** Esteban (producto, brief "Integración Deudas/Cuentas/Pagos automáticos" y brief de Mis Cuentas, ambos del 2026-07-08), Claude Opus 5 (triaje y redacción)
**Relación:** consume el motor de vencimientos del [ADR 041](041-motor-vencimientos-y-distribucion-v2.md); no se construye un segundo motor. Sus alertas se conectarían al motor único de notificaciones de CFG.3 cuando exista. La restricción de fondo es la ADN 2 y 3 (offline-first, sin servidor).

---

## Contexto

Es un caso muy común en Colombia: suscripciones y cuotas que el banco debita solo. Hoy Finko no lo modela, así que el usuario registra a mano un pago que en la realidad ocurrió sin él, o se olvida y su saldo en la app deja de coincidir con el del banco.

El brief pide la funcionalidad completa: al registrar un gasto fijo, una deuda o una suscripción, una pregunta opcional ("¿este pago se descuenta automáticamente?") más la cuenta de débito. Al llegar la fecha, con saldo suficiente, Finko descontaría, actualizaría la obligación, registraría el movimiento y lo sacaría de pendientes; sin saldo, **no** simularía el pago y generaría una alerta concreta y accionable.

El triaje encontró que esto **no toca el ADN** (todo sigue siendo local) pero sí toca la filosofía del producto, y por dos vías distintas. Por eso el ADR es previo a cualquier línea de código.

---

## D0. La secuencia ya está decidida: primero el lote manual (2026-07-23)

Antes de los pagos automáticos va el **pago en lote manual**, y esa parte ya se ejecutó: CAL.5a está cerrada.

**Por qué:** el lote captura buena parte del valor percibido de "que se pague solo" con una fracción del riesgo, porque el usuario sigue confirmando y la filosofía "Finko refleja la realidad, no la inventa" queda intacta.

**Consecuencia útil:** cuando se retome este ADR, puede llegar con **evidencia real de uso** del lote en vez de intuición, y con `asignarSplitsPorItem` ya escrito y probado, porque un pago automático de varios compromisos tiene exactamente el mismo problema de reparto.

Esta tarjeta **sigue viva y no fue absorbida** por CAL.5a.

---

## D1. Cómo se ejecuta un pago "a la fecha" sin servidor (ABIERTA)

**En una PWA offline sin servidor no existe "ejecutar a la fecha".** Nadie corre nada mientras la app está cerrada. El procesamiento real sería **catch-up al abrir**: al arrancar, Finko procesaría los débitos vencidos desde la última apertura.

La decisión pendiente es **cómo se le comunica eso al usuario** sin que la app parezca rota ni mentirosa. Alguien que abre la app el día 20 vería aparecer de golpe movimientos fechados los días 5, 12 y 18. Si no se explica, parece un error; si se explica mal, parece que la app hizo cosas a sus espaldas.

---

## D2. Registrar un movimiento que el usuario no confirmó (ABIERTA)

Es la decisión de fondo. Finko registraría movimientos **sin confirmación del usuario**, y el débito real en el banco **puede fallar o diferirse**. El resultado sería divergencia entre lo que Finko afirma y lo que pasó de verdad, que es justo lo que el producto promete no hacer.

Opciones que el triaje dejó anotadas, ninguna elegida: **confirmación diferida** (Finko registra y luego pregunta), o un **estado intermedio explícito** del tipo "registrado automáticamente, confírmalo", que separa lo que la app supone de lo que el usuario verificó.

La restricción que enmarca la decisión es la filosofía declarada del producto: **Finko refleja la realidad, no la inventa.**

---

## D3. Débitos y créditos automáticos se deciden juntos (alcance, no elección)

El mismo ADR cubre el **crédito automático del ingreso fijo** que pide el brief de Mis Cuentas ("al llegar la fecha de pago, el dinero se abona automáticamente a la cuenta de destino").

**Por qué van juntos:** débito y crédito automáticos son el mismo problema de filosofía visto desde los dos lados, y comparten el catch-up de D1 y el motor de vencimientos del ADR 041. Resolverlos por separado produciría dos criterios distintos para la misma pregunta. Un solo criterio, no dos.

---

## Consecuencias esperadas

**El motor de vencimientos ya existe y no se duplica.** El ADR 041 dejó `modules/infra/vencimientos.js` como la única tabla de frecuencias y el único reparto por período del proyecto. Este ADR es un consumidor más.

**El fallo por saldo insuficiente es parte del diseño, no un caso borde.** El brief ya fija la conducta: sin saldo, **no** se simula el pago y se genera una alerta clara y accionable. Cualquier alternativa de D2 debe seguir cumpliendo esto.

**Las alertas necesitan un canal que todavía no existe.** Su destino natural es el motor único de notificaciones de CFG.3. Mientras no exista, las alertas viven en la app al abrir.

**La confianza del usuario es el activo en riesgo.** Un pago automático mal registrado no produce un número equivocado: produce que el usuario deje de creerle a la app sobre su propio dinero.

---

## Fuera de alcance

- **El lote de pago manual.** Cerrado en CAL.5a; su ampliación a deudas es la tarjeta CAL.5b.
- **El motor de vencimientos.** Es del [ADR 041](041-motor-vencimientos-y-distribucion-v2.md).
- **El motor de notificaciones.** Es de CFG.3; este ADR sería una fuente más.
- **Integración real con bancos.** No hay servidor (ADN 3): todo pago automático de Finko es una simulación local de lo que el banco hace por su cuenta.

---

## Qué falta para cerrarlo

1. **Resolver D1**: cómo se comunica el catch-up al abrir la app.
2. **Resolver D2**: si Finko registra sin confirmar, y con qué estado intermedio si lo hace.
3. Aprobación explícita de Esteban antes de la primera rebanada de implementación.
