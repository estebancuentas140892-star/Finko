# ADR 190 - El plan de deudas del lienzo

**Estado:** Aceptada (2026-11-22).
**Fecha:** 2026-11-22
**Autores:** Esteban (pedido: aplicar lo que falta del lienzo "Gastos · Rediseño integral", empezando por la página 8), Claude Design (el lienzo), Claude Opus 5.5 (implementación)
**Relación:** Aplica la página 8 ("Estrategias de pago") del lienzo de Claude Design `https://claude.ai/artifact/M8EZZ5L2DrnxqzAZvZAwbJ`. **Cambia** el [ADR 132](132-gastos-del-adulto-en-el-telefono.md) D10 (la hoja del plan ordenada por el resultado, con pestañas) y el [ADR 189](189-revision-tecnica-de-gastos-y-motor-de-deudas.md) D6 ("Tu plan" provisional en la hoja): la hoja es ahora la del lienzo. Usa sin cambiarlo el motor del ADR 189 D5.

---

## Contexto

El lienzo trae doce páginas. El HTML que se aplicó en GAS.13 ([ADR 188](188-gastos-especificacion-integral.md)) era solo la página 12 (la especificación); las pantallas no venían en el archivo. Una revisión del 2026-11-22 (textos de cada tablero contra el código) mostró que las páginas 2, 11 y 12 están en la app, que la 3 a la 7 y la 9 tienen huecos y que la 8 no se había aplicado. GAS.14e había dejado "Tu plan" con las clases de la hoja de siempre, a la espera de este diseño.

La página 8 son tres pantallas de la misma hoja: **La recomendación** (Tino, "Tu plan para salir de deudas", la tarjeta bosque "Finko te recomienda", "Qué cambia si lo aplicas" en tres cifras, "El orden", "Cómo funciona, mes a mes", "Aplicar este plan" y "Comparar con otras formas de pagar"), **Comparar** (cuánto más al mes en chips y cada forma de pagar con cuándo terminas y cuánto en intereses: Avalancha, Bola de nieve, Unificar deudas, Seguir como vas) y **Cómo funciona** (cuándo terminas cada deuda con el plan y como vas hoy, y "Lo que haces tú").

## Decisión

### D1. Tres vistas de una hoja

`htmlPlanSalida()` pinta la vista de `ui.vistaPlan` (`recomendacion`, `comparar`, `como`). "Comparar" y "Cómo funciona" llevan volver (`plan-volver`) y el título; el foco va al título al cambiar de vista. La hoja abre siempre en la recomendación. Desde 1024px sigue la tarjeta de escritorio con "Tu plan" arriba (el lienzo no trae escritorio).

### D2. Las cifras son las del motor

- Entran solo las deudas con tasa y cuota conocidas (`analisis.simulables`); las demás van al final de "El orden" con "Falta la tasa" o "Sin cuota acordada" y "Fuera del plan". Con una sola deuda completa y otras sin datos, la tarjeta pide completar los datos y no hay cifras ni "Aplicar".
- La tarjeta bosque dice la recomendación del motor y su porqué con cifras ("Entre los dos órdenes la diferencia en intereses es pequeña..."). Si el usuario elige la otra forma en Comparar, dice "Tu elección" y cómo funciona. Si una deuda crece, la tarjeta es la del motor ("Paga $X más al mes" o "Habla con la entidad") con el ícono de alerta.
- "Qué cambia si lo aplicas" compara el plan (el orden elegido con el extra elegido) con "Seguir como vas" (cada deuda con su cuota, sin pasar lo liberado): meses antes y "nov 2027, no jun 2028"; intereses que se ahorran; el extra al mes y a qué deuda va. Si hoy no se termina, dice "terminas de pagar" y "hoy no terminas"; si el plan no termina, "No terminas".
- El extra: el que se elige en Comparar (chips $0, $100.000, $150.000 y $250.000 del lienzo, más el mínimo que frena si lo hay, y "Otro" con su monto); sin elegir, el mínimo que frena lo que crece (0 si nada crece).

### D3. Aplicar este plan

Con extra, sube las cuotas tras confirmar (`repartirExtraEnCuotas`: primero lo que crece y el resto a la deuda que el orden ataca primero, que ahora es la más pequeña en Bola de nieve y no siempre la de mayor tasa). Sin extra, deja ese orden para la lista de Deudas. En los dos casos la hoja se cierra con un aviso ("Plan aplicado: Bola de nieve").

### D4. Lo que se adaptó del lienzo

- El chip "Ejemplo con datos ilustrativos" (era del prototipo) dice "Estimado con tus datos" (y "Estimado" en Comparar y Cómo funciona): las cifras son estimados (ADR 189 D5, regla 10). Los supuestos van en una nota corta al pie de la recomendación.
- "Unificar deudas" sale solo con dos o más deudas que cobran interés con tasa conocida y se abre en su sitio con la herramienta de siempre (tasa, cuota y costos). El lienzo decía "Conviene si te prestan a menos de 22 % E.A."; Finko dice el promedio que pagas hoy y que conviene si en total, con los costos, pagas menos: una tasa menor no basta si el plazo o los costos se comen el ahorro.
- "Renegociar la tasa" aparece en Comparar solo cuando el motor la sugiere (una deuda crece o las cuotas no caben); el lienzo no la trae.
- "Seguir como vas" es una tarjeta de referencia, no una opción que se aplica.
- Las notas de 11 px del lienzo van a 12 px (la letra no baja de 12, página 11 del lienzo). A 320 px las tres cifras van dos arriba y una abajo.

## Alternativas descartadas

- **Dejar la hoja de antes con "Tu plan" arriba:** el lienzo es el diseño aprobado para esto; mantener las dos cosas repetía la recomendación.
- **Elegir el extra por la capacidad estimada:** con un ingreso registrado y sin gastos la capacidad sale inflada; un extra que el usuario no eligió no debe subir sus cuotas.

## Consecuencias

- `plan-salida.js` se reescribe; sale la hoja de pestañas (`plan-movil__*`) y su CSS. `lista.js` exporta `tejaDeudaInventario()`; `repartirExtraEnCuotas()` recibe el orden.
- Pendiente: las páginas 3 a 7 y 9 del lienzo (tarjeta GAS.15 en [`board/gastos.md`](../board/gastos.md)).

## Ajustes al aplicar
