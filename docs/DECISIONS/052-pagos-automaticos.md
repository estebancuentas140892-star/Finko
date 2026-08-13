# ADR 052 - Pagos y créditos automáticos (débito automático simulado)

**Estado:** **Aceptada** (2026-08-13). D1 y D2 resueltas; ver también D4, que fija el alcance de la primera rebanada. Tarjeta de seguimiento: **PA.1** en [BOARD.md](../BOARD.md).
**Fecha:** 2026-07-24. **Resuelta:** 2026-08-13.
**Autores:** Esteban (producto, brief "Integración Deudas/Cuentas/Pagos automáticos" y brief de Mis Cuentas, ambos del 2026-07-08; delega la decisión de D1 y D2 el 2026-08-13), Claude Opus 5 (triaje, redacción y decisión delegada)
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

## D1. El catch-up se ejecuta al abrir y se comunica como una hoja de revisión (RESUELTA)

**En una PWA offline sin servidor no existe "ejecutar a la fecha".** Nadie corre nada mientras la app está cerrada. El procesamiento real es **catch-up al abrir**: al arrancar, Finko mira qué débitos automáticos vencieron y siguen sin registrarse.

**Decisión:** el catch-up **no escribe nada**. Al abrir, y detrás de los gates existentes (candado, aceptación legal, novedades), Finko abre una hoja titulada "Pagos automáticos" que lista cada débito vencido con su fecha real, su monto y la cuenta de la que sale, y pide una sola confirmación para registrarlos todos. Nada aparece de golpe en el ledger: lo que el usuario ve primero es la lista, no el resultado.

**Ventana del catch-up: el mes en curso y el anterior.** Más atrás no se ofrece. Un débito que lleva dos meses sin registrarse ya no es catch-up, es historia que el usuario debe revisar a mano en el Calendario, y arrastrarla a la hoja de cada apertura la vuelve inservible.

**Por qué así:** el problema que planteaba la decisión ("movimientos fechados el 5, el 12 y el 18 aparecen de golpe") desaparece si nunca aparecen solos. La hoja es la explicación, no un aviso posterior a un hecho consumado.

**Si otro overlay está abierto** (gate legal, novedades, candado), la hoja no se apila: espera a la siguiente apertura. No se pierde nada, porque no había nada escrito.

---

## D2. Finko no registra un movimiento que el usuario no confirmó (RESUELTA)

**Decisión: no se registra nada sin confirmación.** Lo automático es la **preparación**, no la escritura: Finko sabe qué venció, cuánto, de qué cuenta sale y con qué fecha, y lo deja listo para confirmar de un toque. El usuario nunca teclea el monto, la cuenta ni la fecha, y Finko nunca afirma un movimiento que no ocurrió.

**Alternativa rechazada: registrar con estado intermedio** ("registrado automáticamente, confírmalo"). Obligaría a cada consumidor de `S.gastos` (Movimientos, Análisis, ejecutado de Límites, patrimonio, logros, presupuestos) a decidir si un movimiento sin confirmar cuenta o no: es un cambio de invariante transversal, con superficie de error en toda la app, **a cambio de ahorrar un toque**. Y ahorra solo un toque porque, por D1, la ejecución ocurre igual al abrir la app: el usuario ya está ahí mirando.

**Alternativa rechazada: confirmación diferida** (registrar y preguntar después). Misma divergencia que la anterior durante la ventana de duda, sin el estado explícito que al menos la señalizaba.

**Consecuencia de diseño:** la fecha del gasto es la del vencimiento real (el 5, no hoy), y el descuento de la cuenta ocurre al confirmar. Es el mismo criterio ya escrito en `_marcarPagadoGastoFijo` (Agenda): el saldo de una cuenta es un valor de hoy, no un histórico.

**Sin saldo suficiente no se ofrece el registro.** La fila queda bloqueada, nombra la cuenta y lo que falta, y el resto de los débitos sí se puede confirmar. Es lo que ya pedía el brief y encaja con la decisión: Finko no simula un débito que el banco no pudo hacer.

---

## D4. Alcance de la primera rebanada: débitos primero, créditos después (RESUELTA)

D3 fija que débito y crédito comparten criterio, no que se implementen el mismo día. La primera rebanada (**PA.1a**) entrega el **débito automático de compromisos** completo (captura, catch-up, hoja, registro, bloqueo por saldo); el **crédito automático del ingreso fijo** entra en **PA.1b** reusando la misma hoja y el mismo criterio de confirmación.

**Por qué en ese orden:** el débito es el caso que el brief describe con más detalle y el que ya tiene motor, aritmética de reparto y flujo de registro escritos (`vencimientos.js`, `pago-compromiso.js`, el lote de CAL.5a). El crédito necesita además decidir qué colección recibe el abono recurrente, que es una pregunta propia y no debe contaminar la rebanada del débito.

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

## Rebanadas

1. **PA.1a** (cerrada 2026-08-13): débito automático de compromisos. Campos `debitoAutomatico` y `cuentaDebitoId` en `Compromiso` (schema v39), captura en el formulario de gasto fijo y en el de deuda, detección de vencidos en `agenda/logic.js`, hoja de confirmación al abrir y registro con la fecha real del vencimiento.
2. **PA.1b**: crédito automático del ingreso fijo, sobre la misma hoja y el mismo criterio de D2.
3. **PA.1c** (opcional, depende de CFG.3): llevar el aviso de "sin saldo" al motor único de notificaciones cuando exista.
