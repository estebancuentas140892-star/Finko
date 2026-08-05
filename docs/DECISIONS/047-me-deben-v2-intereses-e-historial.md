# ADR 047 - Me deben v2: intereses acumulados, historial de abonos y confianza

**Estado:** Aceptada en alcance (triaje del brief de Esteban del 2026-07-08, 8 puntos). Implementación en curso: tarjeta **PE.6** en [BOARD.md](../BOARD.md). **D1 y D2 entregadas** por PE.1 y PE.7 (el modal de cobro ya muestra pendiente, capital e interés acumulado); **D3 entregada** por PE.6b y **D4 y D5** por PE.6c/PE.6e, las tres el 2026-08-05. **Falta solo D6**, que espera a IV.2 (tarjeta PE.6d).
**Fecha:** 2026-07-24
**Autores:** Esteban (producto, brief del 2026-07-08), Claude Opus 5 (triaje y redacción)
**Relación:** extiende la base que dejaron PE.1 a PE.5 (cerradas). Deriva dos puntos del brief a sus dueños externos: los recordatorios de vencimiento al [ADR 044](044-motor-unico-de-sugerencia-por-categoria.md) por la vía de CFG.3 (motor único de notificaciones), y "fecha por defecto = hoy" a la tarjeta transversal CAT.4. Los estados visuales consumen los semánticos del [ADR 031](031-identidad-de-color-por-seccion.md); el tono lo fija el [ADR 003](003-tono-neutral-profesional.md).

---

## Contexto

El dominio `personales` ("Me deben") ya registra préstamos a terceros, con tasa opcional y reparto capital/interés (schema v21, PE.1) y estados humanizados (PE.2 a PE.5). Sobre esa base, el brief pide que la sección deje de ser un registro y pase a ser un seguimiento: que sepa cuánto se debe **hoy** con intereses, qué se ha abonado y cuándo, cuánto rindió el préstamo, y cómo se ha comportado históricamente cada persona.

Hoy faltan tres datos para eso. No existe cálculo de intereses acumulados a la fecha de cobro: la tasa se pactó pero nadie la proyecta. No existe historial de abonos: solo se guarda un acumulado `pagado`, así que un préstamo con cinco abonos y uno con un solo pago son indistinguibles. Y sin historial no hay forma de derivar ni rendimiento ni puntualidad.

---

## Decisiones

### D1. Finko sugiere el total, el usuario decide el cobro

Al pulsar "Me pagaron" en un préstamo con tasa pactada, la app calcula el **total sugerido = capital pendiente + intereses acumulados a la fecha** y muestra el desglose de las tres cifras (capital / intereses / total).

El usuario queda libre de cobrar todo, cobrar una parte o perdonar los intereses. Finko **sugiere, nunca impone**: es la aplicación directa del ADR 003 a un momento donde la app conoce el número "correcto" y la relación personal puede pedir otro.

### D2. La acumulación de intereses extiende PE.1, no la reemplaza

La lógica financiera es acumulación sobre saldo con pagos parciales entre fechas. El reparto capital/interés que PE.1 ya dejó escrito sigue siendo el mecanismo; lo que se agrega es proyectarlo hasta la fecha de cobro. No se reescribe el reparto existente.

### D3. El historial de abonos es un array con fecha y monto, con migración idempotente

`Personal` gana un historial de abonos (fecha + monto por abono), lo que implica bump de schema con migración idempotente (ADN 6). Los préstamos existentes **conservan su acumulado `pagado`** intacto: la migración no puede inventar un historial que nunca se capturó.

Es la precondición de D4 y D5: sin historial no hay rendimiento ni confianza.

### D4. Rendimiento y confianza son derivados, no datos nuevos

El rendimiento del préstamo (intereses ganados, capital recuperado, porcentaje recuperado, rentabilidad) se **deriva** de D1 y D3. Las estadísticas por persona (préstamos realizados, pagados a tiempo, retrasos, tiempo promedio, total prestado y recuperado) se derivan del historial de D3.

Nada de esto se persiste como campo propio: se calcula. Persistir un derivado es garantizar que se desincronice del historial que lo produce.

**Precisión al implementar (PE.6c, 2026-08-05): la rentabilidad no se anualiza.** El ADR pedía "rentabilidad" sin fijar la unidad. Se entrega como interés YA COBRADO sobre capital prestado. Anualizarla (tasa efectiva anual, TIR) la volvería comparable con un CDT, y eso es una promesa de retorno que un préstamo informal a un conocido no puede sostener: puede pagarse tarde, a medias o nunca. Por la misma razón el interés devengado y no cobrado se reporta aparte y nunca se suma a lo ganado, igual que ya se lo excluye del patrimonio.

### D5. Las estadísticas por persona son historial informativo, no calificación

El copy debe dejar claro que la app describe lo que pasó, no puntúa a la persona. Es la restricción del brief y la del ADR 003: nada de scores, semáforos de reputación ni lenguaje que juzgue a alguien que no es el usuario de la app.

**Precisión al implementar (PE.6e, 2026-08-05): el orden de la lista también califica.** Ordenar las personas por puntualidad construye el ranking de confiabilidad que esta decisión prohíbe, aunque ninguna palabra del copy lo diga. Se ordena por total prestado, que responde "cuánto tengo con cada quien". Y la puntualidad solo cuenta préstamos con fecha pactada: sin fecha no hay nada que incumplir, y contar esa ausencia junto a los retrasos inventaría una falta.

### D6. Los estados visuales no introducen colores nuevos

Los cinco estados identificables de un vistazo (al día / próximo a vencer / pago parcial / vencido / finalizado) son una evolución **visual** de los estados que PE.2 a PE.5 ya calculan. Usan los semánticos ya existentes del ADR 031 (success / warning / danger más el neutro), **sin colores nuevos**. Coordina con IV.2: no abre paleta.

---

## Consecuencias

**Bump de schema con datos reales en juego.** D3 toca el modelo de datos de préstamos que ya existen en dispositivos de usuarios. La migración es el punto de mayor riesgo del ADR: debe ser idempotente y no puede perder el acumulado.

**El orden de implementación no es libre.** D4 y D5 dependen de D3; D1 y D2 son independientes del historial. Eso fija la secuencia de rebanadas anotada en la tarjeta PE.6.

**La lógica financiera vive en `logic.js` puro.** Acumulación de intereses con pagos parciales es exactamente el tipo de cálculo que la ADN 9 exige testeable sin DOM.

---

## Fuera de alcance

- **Recordatorios de vencimiento de préstamos** ("mañana vence el préstamo de Juan"). Van al motor único de notificaciones de CFG.3, con `personales` como una fuente más. No se construye un avisador propio de la sección.
- **Fecha por defecto = hoy en el formulario.** Es la regla transversal de CAT.4, que la aplica en una sola pasada por todos los formularios de la app.
- **Cobro de intereses de mora o penalizaciones.** El brief no lo pide y añadirlo cambiaría el tono del producto.

---

## Qué falta para cerrarlo

1. ~~**Cómo migran los préstamos existentes al historial de D3:** historial vacío, o un abono sintético inicial que represente el acumulado `pagado`.~~ **Resuelto en PE.6b (2026-08-05): abono sintético, marcado `agrupado: true`.** El historial vacío dejaba la suma del historial y el acumulado `pagado` en desacuerdo desde el día uno, y todo lo que D4 y D5 derivan de él cargaría una rama de excepción permanente. La marca es lo que evita que el sintético finja precisión: la vista lo rotula "Antes de este historial" en vez de una fecha, porque su fecha es la del último abono conocido y no la de cada pago.
2. **El punto 7 (estados visuales, D6) conviene después de IV.2**, para no pintar dos veces. Sigue abierto: IV.2 no está en producción.
