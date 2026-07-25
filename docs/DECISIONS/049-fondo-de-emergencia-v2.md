# ADR 049 - Fondo de emergencia v2: aporte por distribución y rediseño educativo

**Estado:** Aceptada en alcance (triaje del brief de Esteban del 2026-07-08, 3 puntos). Implementación pendiente: tarjeta **AH.5** en [BOARD.md](../BOARD.md). AH.5a (prellenado del aporte) ya cerrada, ver [CHANGELOG](../CHANGELOG.md).
**Fecha:** 2026-07-24
**Autores:** Esteban (producto, brief del 2026-07-08), Claude Opus 5 (triaje y redacción)
**Relación:** el aporte recomendado lo calcula AH.2 y el recordatorio del día de ingreso es del [ADR 021](021-recordatorio-dia-de-ingreso.md), ambos ya en producción. El fondo es **consumidor** del motor de vencimientos del [ADR 041](041-motor-vencimientos-y-distribucion-v2.md). El rediseño aplica los tokens del [ADR 031](031-identidad-de-color-por-seccion.md) y el tono del [ADR 003](003-tono-neutral-profesional.md).

---

## Contexto

La base automatizada del fondo de emergencia ya existe: AH.2 calcula cuánto conviene aportar y el ADR 021 recuerda el día de ingreso. Lo que el brief cuestiona no es el cálculo, es **dónde ocurre el aporte y qué comunica la sección**.

Hoy el aporte al fondo se registra desde la propia sección, con su bloque "Aportes al fondo a Registrar". Eso obliga al usuario a acordarse del fondo por su cuenta, en un momento distinto de aquel en que tiene el dinero en la mano. Y la sección se explica a sí misma en términos de números (cuánto llevas, cuánto falta) sin responder lo que una persona sin formación financiera necesita saber primero: qué es esto, por qué importa, cuándo se usa.

---

## Decisiones

### D1. El aporte principal se hace desde la distribución del ingreso

El flujo canónico para aportar al fondo pasa a ser el asistente "Distribuir mi ingreso": el valor que AH.2 ya calcula aparece sugerido ahí, por la vía del motor de vencimientos.

La razón es de momento, no de mecánica: el aporte se decide cuando el dinero entra, no cuando el usuario recuerda visitar la sección.

### D2. El registro directo desde la sección se conserva como vía secundaria

El bloque "Aportes al fondo a Registrar" **no se elimina**. Se conserva para los aportes fuera de ciclo, como apartar una parte de un ingreso esporádico que no pasó por el asistente.

Es una decisión deliberada contra la simplificación fácil: quitar el registro directo dejaría sin salida un caso real. Lo que sí cambia es su **peso visual**, que baja al de una acción secundaria; cuánto exactamente se define en el análisis de la rebanada.

### D3. La sección comunica protección antes que cifras

El rediseño debe responder de inmediato qué es el fondo, por qué importa, cuándo usarlo y cómo protege. El registro emocional es tranquilidad, seguridad y prevención, no solo el progreso numérico.

Aplica el sistema visual vigente sin inventar nada: jerarquía y tokens del ADR 031, iconografía Finko Icons v2, lenguaje del ADR 003 y accesibilidad AA.

### D4. La configuración del fondo pregunta lo necesario al crearlo o editarlo

Meta en meses de gastos y compromiso de aporte por período, este último según la frecuencia real de ingresos del usuario, no una asumida.

---

## Consecuencias

**El fondo queda acoplado al asistente de distribución por dependencia de orden.** D1 no se puede implementar antes de que el motor de MC.13 exponga el aporte sugerido. El rediseño de D3 y D4 sí es independiente y puede ir antes.

**Dos puntos de entrada para el mismo dato exigen un solo camino de escritura.** D1 y D2 conviven, pero ambos deben terminar en la misma función de aporte del dominio `ahorro`, o el saldo del fondo se calculará distinto según por dónde entró el dinero.

**El rediseño conviene después de IV.2,** para no pintar la sección dos veces.

---

## Fuera de alcance

- **El cálculo del aporte recomendado.** Ya existe (AH.2) y no se toca.
- **La integración del aporte con el asistente.** Su dueño es MC.13 / [ADR 041](041-motor-vencimientos-y-distribucion-v2.md); el fondo figura ahí como consumidor del motor.
- **El prellenado del aporte.** Cerrado en AH.5a.
- **Qué cuenta financia el aporte.** Lo resuelve el asistente de distribución, no la sección.

---

## Qué falta para cerrarlo

1. **El peso visual exacto del registro directo de D2** se decide en el análisis de la rebanada, con la pantalla rediseñada a la vista.
2. **D1 espera al motor de MC.13.**
