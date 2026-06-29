# ADR 012 - Auto-distribución de ingresos ("Distribuir mi ingreso")

**Estado:** Aceptada (diseño). Implementación pendiente por slices.
**Fecha:** 2026-06-29
**Autores:** Esteban (producto), Claude Opus 4.8 (diseño)

---

## Contexto

Finko ya recomienda cómo repartir el ingreso ("¿Cómo distribuir mi dinero?": Necesidades / Estilo de vida / Ahorro, con presets y distribución personalizada, ver MC.2) y avisa cuándo llega el próximo cobro ("En 2 días recibes tu quincena"). Pero el día que el dinero llega, el usuario tiene que **recorrer la app a mano**: entrar a Ahorro y aportar al fondo, a Metas y abonar, a Apartados y aportar, a Deudas y abonar. El usuario pidió un botón "Distribuir mi ingreso" que haga ese reparto de una.

Al diseñar la feature aparecieron dos hechos del modelo de datos actual que la condicionan por completo:

1. **Registrar un ingreso NO acredita saldo a ninguna cuenta.** `S.ingresos` es una *definición* de flujo (monto, frecuencia, día de pago) que alimenta nudges y la sugerencia de distribución. El saldo real de las cuentas lo mantiene el usuario a mano. No existe hoy el concepto de "entró un cobro a la cuenta X".

2. **Los destinos son heterogéneos en cómo (y si) mueven dinero de una cuenta:**

   | Destino | Qué hace un aporte/abono hoy | ¿Descuenta una cuenta? |
   |---|---|---|
   | Fondo de emergencia (`S.ahorro`) | suma a `aportes[]` / `montoActual` | **No** (es un tracker; el dinero "se queda donde está", ver `analisis/logic.js` y [ADR 009](009-consolidado-de-ahorro.md)) |
   | Metas (`S.metas`) | suma a `montoActual` | **Sí** |
   | Apartados (`S.apartados`) | suma a `montoActual` | **Sí** |
   | Deudas (`S.compromisos`) | baja `saldoTotal` | **Sí** |
   | Inversiones (`S.inversiones`) | **solo crea/elimina holdings**: no hay "aportar" incremental | n/a (no existe el primitivo) |
   | Necesidades (gastos fijos, agenda) | son obligaciones que se pagan **cuando vencen** (Agenda: "marcar pagado") | se pagan a lo largo del mes, no el día del cobro |
   | Estilo de vida | "dejarlo en la cuenta para gastar" | es un no-op (el dinero ya está ahí) |

Conclusión: **no se puede tratar la distribución como un único "mover dinero" uniforme.** Cada grupo tiene una naturaleza distinta, y dos de los destinos que el usuario imaginó (gastos fijos/agenda y estilo de vida) no son "buckets que se fondean el día del cobro".

---

## Decisión

### 1. Comportamiento: híbrido (mueve lo fondeable, informa lo demás)

"Distribuir mi ingreso" ejecuta **movimientos reales solo para los destinos que de verdad se fondean al momento de cobrar**:

- **Fondo de emergencia**: aporte real (sin descontar cuenta, igual que su flujo actual).
- **Metas, Apartados, Deudas**: aporte/abono real, descontando de la cuenta de origen.

Para **Necesidades** (gastos fijos, agenda) y **Estilo de vida**, la distribución **solo muestra el monto objetivo como referencia**: ese dinero se queda en la cuenta, disponible, y se gasta a lo largo del mes cuando las obligaciones vencen (Agenda ya gestiona "marcar pagado"). No se inventan pagos anticipados.

**Inversiones** queda como destino **solo informativo en v1**: no existe el primitivo "aportar a un holding existente" (hoy solo se crean/eliminan holdings). Convertirlo en fondeable requiere primero darle a Inversiones un flujo de aporte incremental, que es trabajo aparte (ver slices).

### 2. Origen del dinero: la acción es el "ya recibí mi pago, repártelo"

Como registrar un ingreso no acredita saldo, asumir "el dinero ya está en la cuenta" obligaría al usuario a acreditarlo a mano primero: no elimina el trabajo manual, solo lo mueve. Para que la acción **resuelva el dolor de raíz y no requiera pasos repetidos** (la prioridad explícita del usuario), "Distribuir mi ingreso" es la acción canónica de cobro:

Al confirmar, con la cuenta de origen elegida (patrón 0/1/varias de `cuenta-helper`):

1. **Acredita el ingreso**: suma el monto del cobro al saldo de la cuenta de origen.
2. **Ejecuta los aportes/abonos fondeables**: cada uno descuenta de esa cuenta.
3. **El remanente queda como saldo**: tras el paso 2, la cuenta retiene exactamente la porción de Necesidades + Estilo de vida, lista para gastarse cuando las obligaciones vencen.

Net sobre la cuenta de origen = `+ ingreso - (suma de lo fondeado)` = la porción no fondeable. Un solo gesto: el dinero entra y queda repartido.

Para evitar doble conteo (que el usuario acredite a mano *y* además distribuya), "Distribuir mi ingreso" es **la** forma recomendada de registrar que se recibió el pago, el monto se pre-llena desde la definición del ingreso pero es editable, y la edición manual de saldos sigue disponible. Un guard de de-duplicación (no volver a distribuir el mismo periodo) se añade en un slice posterior.

### 3. Confirmaciones parciales: de primera clase

El panel lista cada destino fondeable como una fila **editable** (monto) con **toggle** (incluir/excluir). En vivo muestra: total asignado vs ingreso, y cuánto queda como remanente. El usuario puede:

- Editar el monto de cualquier destino (no está atado al porcentaje sugerido).
- Apagar destinos que no quiere fondear este cobro.
- Dejar dinero sin asignar (se queda como saldo).

Al confirmar **solo se aplican las filas activas con monto > 0**. No es "todo o nada": una distribución parcial es válida y esperada.

### 4. Orquestación respetando el ADN (#10: ningún dominio importa a otro)

La feature vive en **tesorería** (que ya posee la sugerencia de distribución y el nudge de cobro), pero los movimientos tocan ahorro, metas, apartados y compromisos. Para no violar "ningún dominio importa a otro", el reparto se coordina por **EventBus**:

- Tesorería arma un `plan` (`{ destino, monto }[]` + `cuentaOrigenId` + `ingresoMonto`) y emite una intención `distribucion:aplicar`.
- Cada dominio fondeable se suscribe y **aplica su propia porción** con su propia `logic.js` (recalculando `completado`, ciclo de apartados, clamping de deuda, logros): la lógica de cada aporte sigue siendo dueña de su dominio.
- **Undo por snapshot**: antes de aplicar, se captura una copia de las slices afectadas; la confirmación ofrece un único "Deshacer" que restaura el snapshot. Así la reversión es atómica y simple, sin lógica de "des-aporte" por dominio.

Esto evita que tesorería duplique las reglas de aporte de cada dominio (lo que sería frágil y se desincronizaría cuando un dominio cambie su lógica).

### 5. Schema

- Acreditar el ingreso y los aportes/abonos reutilizan mutaciones ya existentes (`editar('cuentas'...)`, los aportes de cada dominio): **sin cambios de schema** para el núcleo.
- Recordar el mapeo preferido de destinos (qué metas/apartados fondear y con cuánto) y el guard de "ya distribuí este periodo" son aditivos y opcionales en `S.config` / por ingreso: se introducen en sus slices, con migración idempotente solo si hace falta persistir el mapeo.

---

## Slices de implementación (smallest-first)

| Slice | Qué | Dominios / capas | ADR/lógica nueva |
|---|---|---|---|
| MC.4a | Entrada "Distribuir mi ingreso" + panel con plan editable (toggles + montos + remanente en vivo) + acreditar ingreso + aplicar **grupo Ahorro** (Fondo, Metas, Apartados) vía EventBus + undo por snapshot | tesorería, ahorro, metas, apartados, infra (EventBus + snapshot) | `aplicarDistribucion` (plan puro) + contrato de evento + tests |
| MC.4b | Sumar **Deudas** como destino fondeable (abono real, respetando estrategia de pago) | compromisos | tests del abono programático |
| MC.4c | Filas informativas de **Necesidades** y **Estilo de vida** (solo monto de referencia, sin movimiento) | tesorería | copy + tests de render |
| MC.4d | Guard de de-duplicación ("ya distribuiste tu quincena del 30") + silenciar el nudge tras distribuir; persistir el mapeo de destinos preferidos | tesorería, core/state + storage | migración idempotente si se persiste el mapeo |
| MC.4e (opcional) | Dar a **Inversiones** un aporte incremental y sumarlo como destino fondeable | inversiones | nuevo flujo de aporte + tests |

Cada slice es verificable en la app de forma aislada. MC.4a entrega ya el valor central (repartir hacia el ahorro de un gesto).

---

## Alternativas consideradas

- **Solo planificar (no mover saldo):** mostrar el plan como guía sin ejecutar nada. Cero riesgo, pero no resuelve el dolor reportado ("no quiero recorrer la app"). Descartada: sería repetir la sugerencia que ya existe.
- **Mover TODO de un clic (incluidos gastos fijos/agenda y estilo de vida):** pre-pagar obligaciones el día del cobro no refleja cuándo vencen, y "estilo de vida = dejarlo en la cuenta" es un no-op. Más invasiva y con más casos raros que revertir. Descartada por chocar con la realidad de esas obligaciones.
- **Asumir que el dinero ya está en la cuenta (no acreditar el ingreso):** obliga al usuario a acreditar a mano primero; no elimina el trabajo repetido. Descartada frente a "la acción es el cobro": acreditar dentro del flujo cierra el ciclo en un gesto.
- **Orquestar escribiendo directo a las slices con `crud` desde tesorería:** más simple, pero duplica las reglas de aporte de cada dominio (completado, ciclo, logros, clamping) y se desincroniza cuando un dominio cambia. Descartada a favor de EventBus, que conserva la propiedad de cada dominio (ADN #10).

---

## Consecuencias

### Positivas

- El día del cobro se resuelve de un gesto: el dinero entra y queda repartido hacia lo que de verdad se fondea, sin recorrer la app.
- Respeta la realidad de cada destino: no inventa pagos de obligaciones que aún no vencen ni mueve dinero que solo debe quedarse disponible.
- La orquestación por EventBus + undo por snapshot mantiene el ADN intacto (dominios independientes) y da una reversión atómica simple.
- Reusa los aportes/abonos existentes: no reescribe lógica financiera, la coordina.

### Negativas / Restricciones

- Acreditar el ingreso cambia el rol de "ingreso" (de definición a también disparador de un cobro real): hay que comunicar bien el net sobre la cuenta para no confundir, y el guard de de-duplicación (MC.4d) es necesario para evitar doble conteo.
- Inversiones no es fondeable hasta tener un aporte incremental (MC.4e); en v1 es solo informativa.
- Cada dominio fondeable gana un suscriptor de EventBus y un aporte programático (reusando su `logic.js`): trabajo repartido por slices, no un solo cambio.
- La feature toca varias slices de `S`; el undo por snapshot debe copiar exactamente las afectadas para que "Deshacer" sea fiel.

---

## Estado de implementación

**MC.4 completa (a-e), 2026-06-29.** Los 5 slices están en producción:

- **MC.4a**: entrada + panel editable + grupo Ahorro (Fondo/Metas/Apartados) vía EventBus + undo por snapshot.
- **MC.4b**: Deudas como destino fondeable (abono real, orden Avalancha, topado al saldo).
- **MC.4c**: filas informativas de Necesidades y Estilo de vida (solo referencia, no se mueven).
- **MC.4d**: la acción se habilita solo al llegar el cobro del periodo (`estadoDistribucion` + `ultimoPagoHasta`), nudge "Hoy recibes tu ingreso, ¿distribuir?" y guard de de-duplicación por periodo (`S.config.ultimaDistribucionPeriodo`, revertible en el undo). Persistir el mapeo de destinos preferidos quedó fuera (no se implementó en este slice).
- **MC.4e**: Inversiones se volvió fondeable con un aporte incremental al capital del holding (`construirPlanInversiones` + suscriptor en `inversiones/index.js`). Esto cierra la restricción "Inversiones es solo informativa en v1" listada arriba.

La evolución posterior (Automático inteligente y asistente guiado de 3 pasos) se trata como épicas nuevas (MC.6, MC.7) con su propio ADR.
