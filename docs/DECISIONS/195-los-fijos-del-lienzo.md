# ADR 195 - Los fijos del lienzo

**Estado:** Aceptada (2026-11-22).
**Fecha:** 2026-11-22
**Autores:** Esteban (pedido: seguir con la página 4 del lienzo "Gastos · Rediseño integral"), Claude Design (el lienzo), Claude Opus 5.5 (implementación)
**Relación:** Aplica la página 4 ("Fijos") del lienzo `https://claude.ai/artifact/M8EZZ5L2DrnxqzAZvZAwbJ`, tarjeta GAS.15. **Cambia** el [ADR 185](185-gastos-movil-cada-lugar-con-una-funcion.md) D6 y D7 en el gasto fijo ("Sin empresa: escribir el nombre" ya no lleva a "Nombre del servicio", la cifra deja de ir bajo el título, la factura deja la banda bosque y sus filas "Servicio", "Fecha de pago" y "Periodicidad"), el [ADR 178](178-elegir-es-seguir-en-el-gasto-fijo.md) D1 en "Cuándo" (tocar el día ya no sigue) y el [ADR 187](187-cada-pestana-con-su-cifra-y-cada-vencimiento-con-su-pago.md) D4 en la factura ("desde el 15 de jul" pasa a "próximo"). Usa lo que el [ADR 191](191-las-deudas-del-lienzo.md) D5 dio al motor de preguntas (pasos con lo elegido). Conserva el [ADR 177](177-el-gasto-fijo-en-cuatro-pasos-con-nombre.md): cuatro pasos con nombre, Monto, Qué es, Cuándo y Revisar.

---

## Contexto

La página 4 trae nueve tableros: la pestaña Fijos con pagos, la primera vez, "¿Qué es?", la empresa, la empresa que no está, "¿Cuándo lo pagas?" (con "Otra" abierta) y dos facturas. La app ya tenía los cuatro pasos, las familias en dos columnas y las empresas con logo; faltaban la barra que dice lo elegido, la primera vez en tarjeta, "No está aquí" en la misma pantalla y detalles de la lista. "¿Cuándo lo pagas?" y la factura fueron una segunda rebanada (GAS.15i).

## Decisión

### D1. La pestaña Fijos (GAS.15h)

- La suma de lo vencido va en gris, como las demás sumas: el rótulo "Vencido" ya está en rojo.
- La línea de la tarjeta dice "Pagaste **$1.200.000** de $1.584.800 · 1 de 5 pagos", con lo pagado en negrita.

### D2. La primera vez (GAS.15h)

- Una tarjeta con Tino y su calendario a la izquierda y, a la derecha, "Anota lo que pagas cada mes" y "Finko te recuerda cada pago y te dice cuánto te falta en el mes.".
- Debajo, "¿Cuál pagas? Empieza con uno" con los ocho caminos en tejas de cuatro por fila, cada una en el tono de su familia (Casa, Conexión, Otros).

### D3. Los pasos dicen lo elegido (GAS.15h)

- La hoja del gasto fijo va en el índigo de Fijos (la barra, lo elegido, el borde de la tarjeta del nombre).
- La barra dice lo ya elegido en cada paso hecho ("$62.000") y también en el paso en curso cuando la pantalla no es la primera del paso: sobre las empresas, "Servicios públicos"; en "¿Cuándo?", la empresa o el nombre escrito ("EPM", "Agua del conjunto").
- Sin la cifra bajo el título de la hoja: ya la dice su paso.
- El motor de preguntas gana `data-pasos-elegido="actual"` para pedirlo; sin ese valor, el paso en curso sigue diciendo su nombre (las deudas no cambian).

### D4. "No está aquí" (GAS.15h)

- Al final de las empresas, una teja más con el lápiz y el borde punteado: "No está aquí". Elegirla no avanza: abre, en la misma pantalla, la tarjeta "Nombre de la empresa o del servicio" con el campo ("Ej. Agua del conjunto") y "Sin logo, Finko usa sus iniciales en el tono de la categoría.".
- La teja del campo muestra el ícono de la categoría y, al escribir, las iniciales en su tono ("AC"). Con "No está aquí" elegida, la pantalla pide "Continuar".
- El fijo se guarda como antes: con el nombre escrito y sin empresa (`marcaId: null`).

### D5. "¿Cuándo lo pagas?" (GAS.15i)

- "Cada cuánto" y "Qué día" a la vista. Cada cuánto en un riel: Mensual, Quincenal, Anual y "Otra", la elegida llena de índigo.
- "Otra" abre seis en dos columnas: Cada semana, Cada 2 meses, Cada 3 meses, Cada 6 meses, Todos los días y Una sola vez.
- Cada semana cambia los días del mes por "Qué día de la semana" (L a D, en círculos). Elegir uno deja el primer pago en la próxima fecha que cae ese día (hoy incluido); su día del mes es el día de pago.
- Debajo, la fila "Primer pago" con el calendario: dice la fecha elegida o, sin ella, el próximo pago ("Mar 24 nov"), y abre el calendario de Finko.
- Tocar el día lo marca y ya no sigue solo: con el día elegido, la pantalla pide "Continuar".

### D6. La factura del fijo (GAS.15i)

- La hoja sigue diciendo "Nuevo gasto fijo", con la barra de pasos ("$185.000 · EPM · Día 24 · Revisar"); sin la banda bosque ni el botón bosque.
- Arriba del papel, la teja (el logo, las iniciales del nombre escrito o el ícono de la categoría), el nombre y la categoría; a la derecha, la cifra y "cada mes".
- Una sola fila "Se paga": "El 24 de cada mes" y "próximo 24 nov" ("Cada sábado", "Todos los días", "El 10 dic · una sola vez").
- Lo opcional en dos líneas, como la ficha del fijo (ADR 194 D3): "Débito automático" con su interruptor (y "Desde Bancolombia"), el dato para pagar y la nota, con "Opcional" y "+ Agregar" si faltan; la nota tras un filete y el código de barras al pie.
- El motor de preguntas gana `data-resumen-opcionales-dos` para pedir esas dos líneas.

## Alternativas descartadas

- **Mantener la pantalla "Nombre del servicio":** el lienzo pone el nombre junto a las empresas; una pantalla más alarga el paso sin decir nada nuevo.
- **Que el paso en curso diga lo elegido en todos los formularios:** en las deudas el lienzo de la página 7 muestra el nombre del paso en curso; por eso es una opción del formulario.

## Consecuencias

- Las pruebas que buscaban "Sin empresa: escribir el nombre", la pantalla "Nombre del servicio", `.modal__titulo-sub`, que el día siguiera solo o las filas "Fecha de pago" y "Periodicidad" en el gasto fijo cambian.
- Sin cambios de datos: `nombreServicio` y `marcaId` se guardan igual; el semanal guarda su primer pago (`fechaInicio`) y su día (`diaPago`) como siempre, y "Todos los días" y "Una sola vez" son las frecuencias `Diario` y `Única vez` que ya existían.

## Ajustes al aplicar

- **D4:** el lienzo muestra siete empresas; la app sigue mostrando todas las de la categoría, y "No está aquí" queda al final. Al elegirla, la tarjeta del nombre se trae a la vista por encima de "Continuar", que va pegado al pie de la hoja.
- **D4:** las iniciales saltan los conectores ("de", "del", "la", "los", "y"), como las de las empresas ("Gases del Caribe", GC): "Agua del conjunto" da "AC".
- **D3:** si el nombre escrito está vacío, el paso dice la categoría.
- **D2:** bajo 375 px, Tino baja a 88 px y el texto de las tejas a 12 px.
- **D1:** los grupos ("Esta semana", "Más adelante") siguen la fecha de hoy; el lienzo los dibuja con otra fecha.
- **D5:** "Todos los días" y "Una sola vez" no piden el día del mes: el día de pago sale de la fila de la fecha (o de hoy), y con "Una sola vez" la fila dice "Fecha del pago". Al editar un semanal, su día de la semana sale de su ancla (el día de pago en el mes de su primer pago o de su alta); cambiarlo deja el primer pago en la próxima fecha de ese día. Sin día elegido, la fila dice "Elegir fecha" y la pantalla no muestra "Continuar".
- **D6:** "Desde el 15 de jul" (GAS.12d) sale de la factura: la fecha del primer pago ya la dice su fila en "Cuándo", y la factura dice el próximo pago. El débito dice la cuenta en texto, sin su logo. Sin día del mes, "Se paga" dice la frecuencia.
