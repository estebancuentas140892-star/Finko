# ADR 021 - Recordatorios de aporte: un evento de "día de ingreso" que lleva al asistente

**Estado:** Aceptada
**Fecha:** 2026-07-04
**Autores:** Claude Fable 5 (análisis y decisión, sesión autónoma autorizada por Esteban)
**Resuelve:** AP.4 (recordatorios de aporte de Apartados), MT.2 (integración de Metas con Calendario) y AH.4 (integración del fondo con Calendario). El tablero pedía un solo ADR para las tres.

---

## Contexto

Tres épicas pedían recordatorios de aporte en Calendario, cada una desde su dominio:

- **AP.4 (Apartados):** "Hoy recibiste tu ingreso, recuerda apartar $X para el SOAT".
- **MT.2 (Metas):** recordatorio por meta según la frecuencia del ingreso, con nombre/color y botón "Abonar".
- **AH.4 (Ahorro):** "Hoy corresponde tu aporte al Fondo de emergencia" con registro rápido; además, quitar el botón "Definir →" del compromiso mensual por duplicar a MC.4.

El riesgo señalado por el tablero: **duplicar a "Distribuir mi ingreso"** (MC.4/MC.7, ADR 012 y 018), que ya hace exactamente esto: al llegar el ingreso, acredita la cuenta y reparte hacia fondo, metas, apartados y deudas con montos sugeridos por el motor de ADR 013, filas editables, confirmación única y deshacer. También existe ya el nudge de proximidad de Apartados (60 días antes de la fecha objetivo).

## Decisión

**Calendario muestra el día de pago de cada ingreso activo como "día de ingreso", con un solo recordatorio agregado cuyo botón lleva al asistente "Distribuir mi ingreso". Los montos por vehículo NO viven en Calendario: viven en el asistente.**

Concretamente:

1. **Un evento por ingreso, no por vehículo.** El día de pago (`diaPago`, dato que el form de ingreso ya captura desde v12) aparece en el calendario con su dot verde (`--fk-dom-ingresos`), el monto del ingreso y el recordatorio "Recuerda apartar para tus objetivos". Respeta la frecuencia del ingreso (Quincenal = dos ocurrencias, misma lógica `eventosDelMes` que ya resuelve esto para compromisos).
2. **El CTA es "Distribuir →"** y abre el asistente de Mis cuentas (navegación + EventBus `distribuir:abrir`; tesorería abre su propio panel). Cero lógica de reparto en Agenda: una sola fuente de verdad para los montos sugeridos.
3. **Se rechaza el modelo de N eventos por meta/apartado/fondo** (la lectura literal de MT.2/AP.4): con 3 metas, 2 apartados y el fondo, cada día de ingreso tendría 6 recordatorios y 6 flujos de registro paralelos e inferiores al asistente (sin validación de remanente, sin deshacer, sin reparto entre cuentas). El "para el SOAT $X" de AP.4 y el "Abonar a la meta" de MT.2 ya existen dentro del asistente, fila por fila, con nombre y monto sugerido.
4. **El nudge de proximidad de Apartados (60 días) se mantiene intacto:** responde a otra pregunta (se acerca la fecha del gasto) y no se solapa con el día de ingreso.
5. **El botón "Definir →" del compromiso mensual se conserva** (la parte de AH.4 que pedía quitarlo queda superada por AH.2): ese form ya no es un número sin contexto que duplica a MC.4, es la casa del aporte sugerido explicado (ADR 013 alineado). Se verificó además que `S.ahorro.compromisoMensual` no alimenta nudges ni el Score de Salud fuera del dominio ahorro: es un recordatorio personal, rol distinto al reparto ejecutable del asistente.

### Implementación

- `agenda/logic.js`: `eventosIngresosDelMes(ingresos, year, month)` reusa `_diasParaCompromiso` (los ingresos tienen la misma forma: `frecuencia`, `diaPago`, `fechaCreacion`) y marca cada evento con `tipo: 'ingreso'`. `totalDia` ignora explícitamente esos eventos (un ingreso no es dinero a pagar).
- `agenda/view.js`: merge de eventos de ingresos + compromisos por día (ingresos primero); dot y entrada de leyenda `cal-dot--ingreso`; item de detalle propio con monto en verde, recordatorio y botón "Distribuir →" (`data-action="agenda-distribuir-ingreso"`).
- `agenda/index.js`: la acción emite `EventBus.emit('distribuir:abrir')` y re-renderiza también ante `state:change` de `ingresos`.
- `tesoreria/index.js`: listener de `distribuir:abrir` que navega a `#tesoreria` si hace falta y abre el panel del asistente en el primer paso (tras el re-render del hashchange).
- `styles`: `.cal-dot--ingreso` con `var(--fk-dom-ingresos)`.

## Consecuencias

### Positivas

- Las tres épicas se cierran con un único modelo coherente y sin duplicar el motor de reparto ni el flujo de registro.
- Calendario gana la vista "cuándo entra dinero" (pedida indirectamente por las tres tareas) sin ruido: un evento por ingreso.
- Los ingresos sin `diaPago` no generan evento (dato no capturado): incentivo natural para completarlo al editar el ingreso.

### Negativas / Restricciones

- El recordatorio no muestra "cuánto apartar para X" en el propio calendario; ese detalle está a un tap (el asistente). Es deliberado: mostrar montos requeriría replicar el motor de ADR 013 en Agenda (tercera copia) o violar ADN #10.
- No hay notificación push ni recordatorio fuera de la app (fuera de alcance: Finko es offline-first y sin servidor; las notificaciones locales existentes no cambian).
- Si el usuario nunca registró ingresos con día de pago, Calendario no cambia. El asistente sigue accesible desde Mis cuentas como siempre.
