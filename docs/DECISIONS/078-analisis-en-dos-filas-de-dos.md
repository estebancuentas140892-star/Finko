# ADR 078 - Análisis en dos filas de dos, y una sparkline que no se deforma

**Estado:** Aceptada. En implementación (iniciativa DSK.9, dos rebanadas).
**Fecha:** 2026-08-18
**Autores:** Esteban (producto), Claude Design (auditoría "Análisis 1920"), Claude Opus 5 (implementación)
**Relación:** cierra la serie de escritorio que abrieron los [ADR 070](070-inicio-centro-de-atencion-en-escritorio.md) a [ADR 077](077-limites-de-gasto-tres-grupos-a-la-vista.md). Conserva entero el [ADR 038](038-analisis-v2-visual.md) (Análisis v2: score, patrimonio, tendencia y categorías, y el orden de lectura de sus dos preguntas) y la decisión de PERF.3 de diferir el cuerpo del grupo de detalle. No toca lógica: `analisis/logic.js` no cambia.

---

## Contexto

Análisis es la sección con más contenido de Finko: cuatro tarjetas y dos colapsables. Hoy las cuatro van apiladas a 1376px de ancho, y eso cuesta caro:

- **Cuatro tarjetas apiladas: 1,7 pliegues y 2 de 6 bloques visibles.** Score 1376 x 350, patrimonio x 292, tendencia x 271, categorías x 259. Ninguna de las cuatro necesita 1376: sus rejillas internas (los cuatro factores del score, las dos columnas del patrimonio, los tres stats de la tendencia) ya reparten el ancho en mitades. Apilar es la única opción a 390px y a 1920 cuesta un pliegue entero. **La consecuencia ya estaba reconocida en el código**: dos bloques se entregan colapsados "para no enterrar lo importante", o sea que la sección ya sabía que no cabía y su salida en móvil fue esconder contenido.
- **La sparkline se deforma 3,7 veces, y el código ya arregló este mismo problema.** `sparkline()` emite el SVG sin `width` ni `height` y con `preserveAspectRatio="none"`, así que toma el ancho del contenedor y estira el dibujo hasta llenarlo. Con `viewBox` de 360 pintado a 1342, la anisotropía es **3,73:1**. Lo que se deforma es **la pendiente**, no el grosor (de eso ya se encarga el `non-scaling-stroke`): cada mes ocupa casi 120px horizontales para 68 verticales, así que una subida real del 30 % se dibuja casi plana. **Y esta corrección ya se hizo una vez**: DIS.10 bajó el viewBox de 600 a 360 porque a ~323px de ancho la anisotropía era 1,86:1. Se corrigió para un ancho, y caducó al cambiar de ancho.
- **Más de 1050px entre la categoría y su monto**, con una dona de 108 al lado: proporción de 1 a 11 entre el gráfico y su lista, cuando el código dice que las dos cuentan una sola historia con la misma paleta.
- **La frase que interpreta el score, en un renglón de 1334.** Es la única línea de la sección que traduce un número a una recomendación, y ya la movieron una vez de sitio por el motivo contrario: en la columna del anillo daba 162,7px de medida.

---

## Decisión

**El umbral es 1440px**, el mismo de la serie desde Deudas.

### D1. Dos filas de dos, emparejadas por la pregunta que contestan

Arriba score y patrimonio ("¿cómo estoy?"); abajo tendencia y categorías ("¿a dónde va mi dinero?"). Es el mismo orden de lectura que el código ya declara; lo que cambia es que cada par comparte fila.

**El emparejamiento importa más que el ahorro de altura.** Score y patrimonio contestan la misma pregunta desde dos lados (un juicio y una cifra), y verlos juntos es lo que permite calibrarlos: un score de 72 con patrimonio positivo dice algo distinto que el mismo 72 con patrimonio negativo, y hoy hay 597px entre uno y otro. Abajo pasa igual: la tendencia dice **cuánto** y las categorías **en qué**, y la pregunta útil ("¿subió por algo puntual o por todo?") solo se contesta con las dos a la vista.

**No es un bento**, aunque sea la sección donde la pregunta tiene más sentido: un mosaico sirve cuando las piezas tienen pesos distintos y piden anchos distintos. Acá las cuatro pesan igual y responden dos preguntas, dos cada una.

### D2. Los dos colapsables se quedan plegados y a ancho completo, al final

A 1920 la conclusión obvia sería desplegarlos porque hay sitio, y **es la conclusión equivocada**: el cuerpo del grupo de detalle **no existe hasta que se abre**, porque PERF.3 difiere su cálculo al primer `toggle` (hace su propio barrido de todos los gastos). Desplegarlo por defecto convertiría una decisión de coste en un coste fijo de cada render.

Van al final, después de las dos filas, donde el ancho completo sí les conviene: sus cuerpos son largos y heterogéneos.

### D3. El viewBox de la sparkline sigue al ancho al que se pinta

El arreglo no es acotar la caja por CSS: con la caja a 640 y el viewBox en 360 aún quedarían 1,78:1. El arreglo es **pasarle a `sparkline()` el ancho de la columna donde se va a pintar**, para que viewBox y caja coincidan y la deformación sea 1:1.

Y con eso, la regla que faltaba escrita: **el ancho del viewBox no puede ser un literal**, tiene que seguir al ancho al que el gráfico se pinta. Es lo que hizo que la corrección de DIS.10 caducara al cambiar de ancho.

El ancho se elige por el mismo corte que decide la composición, leído una vez por render: bajo 1440px sigue siendo 360, que es lo que DIS.10 midió para la tarjeta de móvil. Como en el resto de la serie, **un cambio de ancho sin cambio de estado no repinta**: la limitación ya está aceptada en IN.9b y en DSK.2c.

### D4. Lo que se corrige solo

La frase del score queda en unos 640px al pasar su tarjeta a media fila, entre los dos extremos que el código ya probó. Y la lista de categorías baja a la mitad, con lo que la dona recupera su peso relativo. Ninguna de las dos necesita regla propia.

### D5. Lo que no se toca

Que el chip de la tendencia sea verde solo cuando el gasto baja y neutro cuando sube, nunca rojo. Que sin gastos el mes anterior no se muestre un porcentaje. Que la frase del score se derive de los datos reales nombrando el factor más débil. Que la barra de composición del patrimonio reparta por resto mayor para que sume 100. Que los porcentajes en texto no se enmascaren con el ojo activo y sí lo hagan el neto y las dos columnas. Que el estado de los dos colapsables sobreviva al repintado. Que los criterios de renta que Finko no puede medir vayan en lista compacta. Y que el veredicto de renta reutilice el componente `nudge`.

---

## Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| Mosaico bento | las cuatro tarjetas pesan igual; un bento resuelve pesos distintos |
| Desplegar los dos colapsables porque a 1920 hay sitio | el cuerpo del detalle se difiere a propósito (PERF.3): desplegarlo por defecto vuelve fijo un coste que hoy es bajo demanda |
| Acotar solo la caja de la sparkline por CSS | con viewBox de 360 en una caja de 640 quedan 1,78:1: reduce el problema, no lo elimina |
| Subir otra vez el literal del viewBox | es exactamente lo que caducó: un literal sirve para un ancho y falla en el siguiente |
| Mover el chip del mes a la barra superior (A7 de la auditoría) | **el hallazgo ya no aplica**: ANL.3 sacó ese chip del encabezado y lo puso en el rótulo del grupo "A dónde va tu dinero". La auditoría se escribió contra una foto anterior |

---

## Consecuencias

- La sección que existe para dar una visión de conjunto por fin cabe en menos de un pliegue y medio, sin esconder nada.
- **D3 vale en todos los anchos** en el sentido de que la regla es la misma; lo que cambia por ancho es el valor. Queda escrita para que la próxima vez que cambie el ancho no vuelva a caducar.
- El grupo "A dónde va tu dinero" pasa a ser una rejilla de dos columnas con su rótulo cruzando ambas: es el primer sitio del proyecto donde un rótulo de grupo abarca una fila de tarjetas.
- Cierra la serie de escritorio de las nueve secciones auditadas. Queda pendiente el documento transversal ("Auditoría global 1920"), que recoge los hallazgos cruzados.
