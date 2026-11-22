# ADR 189 - Revisión técnica de Gastos y el motor de deudas

**Estado:** Aceptada (2026-11-21).
**Fecha:** 2026-11-21
**Autores:** Esteban (pedido "Revisión técnica e implementación de mejoras en Gastos"), Claude Opus 5.5 (diagnóstico e implementación)
**Relación:** Usa sin cambiarlos el [ADR 183](183-gastos-que-cuadran.md) (cada pestaña con lo suyo), el [ADR 186](186-movimientos-encuentra-y-hormiga-por-frecuencia.md) (Movimientos encuentra, hormiga es lo pequeño que se repite) y el [ADR 187](187-cada-pestana-con-su-cifra-y-cada-vencimiento-con-su-pago.md) (cada pago salda el vencimiento más antiguo). **Cambia** el [ADR 006](006-recomendacion-deudas-por-simulacion.md) en cómo se elige la estrategia: un solo motor decide y explica. Sin cambios visuales salvo los mínimos que el comportamiento pide; el diseño de lo nuevo es de Claude Design.

---

## Contexto: el diagnóstico

La revisión recorrió Inicio, Día a día, Fijos, Deudas, Límites, Movimientos y Mis cuentas sobre `origin/main` (GAS.13h), ejecutando las funciones puras con casos controlados. Mucho del pedido ya estaba (GAS.9 a GAS.13): totales por pestaña, Disney+ con sus cinco vencimientos desde julio, hormiga por frecuencia, Movimientos con búsqueda y filtros, repetir y deshacer. Lo que falta o falla:

**Datos que se corrompen (graves)**
1. Editar una deuda divide su tasa entre 100 en cada guardado: el formulario muestra el decimal guardado (0,285) como si fuera porcentaje. La vista del abono pasa el decimal a una función que espera porcentaje.
2. Un abono editado por encima del saldo deja la deuda en 0 en silencio; al borrarlo, la deuda vuelve con la diferencia de más.
3. "Deshacer" en la ficha de un gasto no devuelve el 4x1000: el saldo de la cuenta se corre.
4. Editar un gasto importado (sin efecto en el saldo) para que sea de una tarjeta le suma la compra a la deuda de la tarjeta.

**Vencimientos de los fijos**
5. Quincenal con día alto: el 28 da una sola fecha en febrero; el 30 da el 30 y el 31 de enero; el 31, una al mes.
6. Semanal y quincenal sin fecha de inicio proyectan vencimientos antes del alta: un pago del mismo día se gasta en una fecha inventada.
7. El débito automático solo mira un mes atrás y ofrece los vencimientos nuevos, aunque el pago salde el más antiguo.
8. Un mes sin vencimiento se da por "pagado" si tuvo algún pago (un anual con marzo pendiente sale pagado en noviembre).
9. La hoja del fijo arma "Vence el martes 10" con el día de pago y el mes en curso: mal en anuales, quincenales y semanales. La fecha de inicio y el último pago se calculan pero no se ven.
10. Cambiar la frecuencia de un fijo con pagos reparte los pagos viejos sobre el calendario nuevo sin avisar (de mensual a semanal, 14 pendientes).

**Totales y Movimientos**
11. No hay forma de ver en Movimientos los pagos de un fijo o una deuda: la fila no lleva el compromiso y el filtro no lo acepta.
12. La tarjeta de Fijos y Deudas cuenta lo activo y la hoja del mes cuenta también lo archivado.
13. El resumen de Límites por categoría no respeta "Solo una parte"; de un límite a Movimientos se pierde la parte.
14. "Ver historial" de Gastos abre Movimientos sin el mes; la ficha de una compra con tarjeta no dice cuál.

**Deudas**
15. La deuda con una persona pregunta "¿A quién le debes?", luego "¿Con quién es la deuda?" y dentro de "Para pagar" "¿A nombre de quién?".
16. El día de pago es obligatorio aunque la deuda personal no tenga cuota ni fecha.
17. Dos motores sueltos: uno elige el orden (Avalancha o Bola de nieve) y otro la acción (pagar más, renegociar, unificar); nunca se juntan. La tasa desconocida cuenta como 0 %, la unificación toma todas las deudas (también las de familia sin interés), no hay un "sin cambiar nada" para comparar ni fecha estimada, y la pestaña Bola de nieve del teléfono puede decir "50 años".

Lo que se revisó y queda como está: las categorías (Educación vive en Día a día por útiles, libros y cursos, y en Fijos por la pensión; la matrícula suelta es Día a día), necesidad, deseo y hormiga (ADR 186 D5: hormiga nunca por el monto solo), los pagos parciales (no existen: un pago salda un vencimiento cualquiera sea su valor, porque las facturas de servicios cambian de valor) y la repetición (crea un gasto nuevo con su id).

## Decisión

### D1. Lo que corrompe datos se corrige y se repara (GAS.14a)

- La tasa se muestra en porcentaje al editar y el abono la lee en su unidad. **Migración v60:** una tasa de entidad (EA) entre 0 y 1 % y una personal (mensual) entre 0 y 0,1 % son tasas ya divididas por el error: se multiplican por 100 hasta salir de ese rango (máximo tres veces). Ninguna tasa real colombiana vive ahí; 0 % se queda en 0.
- Un abono no puede pasar de lo que se debía cuando se hizo; editarlo por encima da error, como al crearlo.
- "Deshacer" de la ficha devuelve también el 4x1000.
- Lo importado sin efecto en el saldo no toca la deuda de una tarjeta al editarlo.

### D2. Los vencimientos de los fijos (GAS.14b)

- **Quincenal:** dos vencimientos al mes separados 15 días: el día de pago y el otro (día + 15, o día - 15 si pasa del 15), cada uno ajustado al último día del mes.
- **Ningún vencimiento antes del inicio** (fecha de inicio o, sin ella, el día del alta), también en semanal y quincenal.
- **Débito automático:** ofrece los vencimientos pendientes desde el más antiguo, los mismos que saldan sus pagos.
- **Un mes sin vencimiento** no es "pagado": no tiene estado de pago.
- **La hoja del fijo** dice el próximo vencimiento real (o el más antiguo pendiente), desde cuándo se paga y el último pago.
- **Cambiar la frecuencia** de un fijo con pagos: si tiene vencimientos pendientes, no se deja (primero se pagan o se anotan con "Ya lo había pagado"); si está al día, el calendario nuevo empieza en la próxima fecha y los pagos anteriores quedan como historia (`Compromiso.reinicio`, opcional).

### D3. Totales y Movimientos (GAS.14c)

- Cada movimiento de un pago lleva su compromiso y Movimientos filtra por él. La hoja de un fijo o una deuda abre "sus pagos" en Movimientos.
- La tarjeta y la hoja del mes cuentan lo mismo: los pagos del mes, también de lo archivado (lo pagado se pagó).
- El resumen de Límites respeta "Solo una parte" y el salto a Movimientos lleva la parte.
- "Ver historial" lleva el mes; la ficha de una compra con tarjeta dice la tarjeta.

### D4. Deudas: preguntar solo lo necesario (GAS.14d)

- Elegida "Con una persona", la siguiente pregunta es la relación ("¿Qué relación tienen?"), no otra vez quién; el nombre de la persona es el nombre de la deuda y "Para pagar" lo toma como titular.
- Una deuda personal sin cuota no exige día de pago.

### D5. El motor de recomendaciones de deudas (GAS.14e)

Un solo análisis (`analizarDeudas`) reemplaza la elección suelta de orden y de acción. Reglas:

1. **Inventario.** Entran las deudas activas con saldo. Cada una dice qué se sabe y qué no: tasa (conocida, 0 % o desconocida), cuota (o sin cuota: acuerdo abierto), si crece (la cuota no cubre el interés del mes) y si es cara (25 % EA o más).
2. **Lo desconocido no se inventa.** Una deuda con tasa desconocida no entra a comparar por tasa: el análisis la lista en "Falta" ("la tasa de Visa") y compara las demás. Una deuda personal sin cuota tampoco se simula: su camino es acordar una cuota.
3. **Escenarios.** Con las deudas simulables: *sin cambiar nada* (cada una con su cuota; lo que se libera no se mueve), *Avalancha* y *Bola de nieve* (lo liberado pasa a la siguiente), con el extra que el usuario escribe o, si no escribe, sin extra. Cada escenario da meses, mes estimado de salida e intereses.
4. **Recomendación principal**, en este orden:
   - Si alguna deuda crece: *detener lo que crece* (el extra mínimo que la frena o, sin capacidad, hablar con la entidad).
   - Si todas son sin interés: *Bola de nieve* (el orden no cambia el costo; terminar una libera su cuota).
   - Con dos o más: *Avalancha* si ahorra al menos 50.000 o un mes frente a Bola de nieve; si no, *Bola de nieve* (la diferencia es pequeña y terminar deudas antes motiva).
   - Con una sola: *seguir con la cuota* y el efecto de un abono extra.
5. **Abono extra a capital.** Con capacidad o con un extra escrito, el análisis muestra el efecto en la deuda que el orden elegido ataca primero. Para un abono único dice las dos formas: *reducir plazo* (misma cuota, menos meses) y *reducir cuota* (mismo plazo, cuota nueva), y avisa que la entidad decide cuál ofrece.
6. **Unificación.** Solo con una oferta que el usuario escribe (tasa y cuota, y costos si los conoce). Entran solo las deudas con interés y tasa conocida; las personales sin interés nunca. Se recomienda solo si el costo total (intereses más costos) baja; una cuota menor sola no basta y se dice.
7. **Renegociación.** Aparece cuando una deuda crece o la capacidad no alcanza para las cuotas, como algo que se pide a la entidad, sin prometer que la acepta.
8. **Deudas personales.** Sin interés no se tratan como un crédito: no entran a Avalancha por tasa ni a la unificación; sin cuota, la alternativa es acordar una.
9. **Capacidad.** Ingresos estimados menos fijos, cuotas y el promedio del día a día de los tres meses cerrados anteriores. Sin ingresos registrados la capacidad es *desconocida*, no negativa.
10. **Transparencia.** El resultado marca cada cifra como *calculada* (de tus datos), *estimada* (usa la capacidad o el promedio) o *supuesta*, y lista los supuestos: tasa constante, cuotas a tiempo, sin compras nuevas con la tarjeta, sin cobros de seguros ni comisiones. Nunca promete ahorro ni fecha: dice "estimado".
11. **Lo que no entra y por qué:** estrategias híbridas (Avalancha y Bola de nieve cubren el orden; mezclarlas no cambia la decisión con estos datos), cupo y pago mínimo de tarjeta (Finko no los tiene: la tarjeta se simula con su cuota), plazo pactado (no existe el dato; los meses salen de saldo, tasa y cuota).

### D6. Lo visual

El análisis se muestra en la hoja del plan que ya existe ("Tu plan": recomendación, por qué, qué cambia, el orden, lo que falta y los supuestos), con las piezas que la hoja ya tiene. Su diseño definitivo es de Claude Design; el comportamiento queda listo para ese diseño.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Tratar la tasa desconocida como 0 % | Pone esa deuda de última en Avalancha y oculta su costo: inventa un dato. |
| Pagos parciales de fijos por monto | Las facturas de servicios cambian de valor cada mes: un pago menor que el registrado salda su mes. |
| Recalcular en silencio al cambiar la frecuencia | Deja vencimientos pendientes que nunca existieron o paga por adelantado meses que no se pagaron. |
| Recomendar unificar porque baja la cuota | Puede costar más en total; el pedido lo prohíbe. |
| Un catálogo de estrategias en pestañas | El pedido pide una recomendación con razones; las demás quedan como alternativas. |

## Consecuencias

- Cinco rebanadas, GAS.14a a GAS.14e, cada una con su commit y su push.
- Migración v60 (tasas reparadas) y un campo opcional nuevo (`Compromiso.reinicio`). Nada pierde datos.

## Ajustes al aplicar
- **D1 (GAS.14a):** el tope del abono es el saldo de hoy más el abono mismo (lo que se debía cuando se hizo). Editar una compra con tarjeta sobre una tarjeta ya pagada todavía pierde la diferencia al acotar en 0; deshacerla ya se bloquea en ese caso (queda anotado como pendiente menor).
- **D2 (GAS.14b):** con el quincenal nuevo, un fijo del 20 pasa de pagarse el 20 y el último día a pagarse el 5 y el 20: la cuenta de pagos no cambia, pero las fechas sí. El débito automático de un fijo sin fecha de alta conserva la ventana de un mes (HF.0j): no se sabe desde cuándo existe. "Marcar pagado" sigue saldando un vencimiento por toque (ADR 187 D2); "Pagar los N" del lote salda todos.
- **D3 (GAS.14c):** el filtro por compromiso no tiene chip propio: la frase "Los pagos de X" lo dice y "Limpiar filtros" lo quita (su chip lo diseña Claude Design si hace falta). "Ver historial" de Gastos sigue sin mes, a propósito (ficha 15, M3). Movimientos sigue sin sumar el 4x1000 aparte en su total ni restar la compra con tarjeta de su pago: es una lista de lo que pasó, no el saldo (anotado como pendiente).
