# ADR 072 - Gastos en escritorio: cabecera de banda y fila que dice de dónde salió el dinero

**Estado:** Aceptada. En implementación (iniciativa DSK.3, dos rebanadas).
**Fecha:** 2026-08-18
**Autores:** Esteban (producto), Claude Design (auditoría "Gastos 1920"), Claude Opus 5 (implementación)
**Relación:** hereda de los [ADR 070](070-inicio-centro-de-atencion-en-escritorio.md) y [ADR 071](071-calendario-como-mapa-del-mes-en-escritorio.md) el patrón de banda de cabecera y el criterio de que la composición de escritorio se decide en CSS. Conserva enteros el [ADR 039](039-gastos-v2-visual.md) (Gastos v2: hero, agrupado por día, comparativo) y la decisión de TX.9a de no pedir descripción en el formulario. **Convive con la ficha 07 de MOV.1** ([ADR 069](069-bloque-gastos-en-la-barra-movil.md) D8), que sube el mes visible a `infra/mes-bloque.js` y lo saca del hero **bajo 1024px**: este ADR no toca esa decisión y trabaja sobre el hero que sigue vivo en escritorio.

---

## Contexto

Gastos no tiene un defecto de lógica ni de contenido. El rótulo nombra el mes visible y no "este mes", el total describe lo visible, con filtro activo el comparativo se calla, y el vacío de un mes pasado no ofrece registrar donde el gasto no va a caer. Todo eso se conserva íntegro.

Lo que falla es el **reparto del ancho**, y se mide:

- **La fila desperdicia el 70 % de su ancho.** A 1376 la fila mide 1376, la columna de acciones 136 y el monto 77: al cuerpo le quedan **1054px** para escribir una palabra de categoría que ocupa 89. Sobran **965px por fila**, y doce filas de eso son el volumen visual dominante de la sección.
- **El título de la fila no distingue nada.** Es `gasto.categoria`, que la teja de al lado ya dice con su color y su glifo. En un día con tres comidas se apilan tres "Restaurantes" idénticos en negrita, y desde TX.9a el subtítulo (lo único que los diferenciaría) suele estar vacío.
- **La cuenta de origen no se ve en ninguna parte.** El gasto guarda `cuentaId`, el formulario lo pide y `gastosFrecuentes` lo lee, pero la lista no lo muestra nunca. Es el único dato que distingue dos gastos de la misma categoría el mismo día.
- **El hero centra un número de 38px en 1296px de vacío**, y los chips pueden volverse inalcanzables: `.filtros-bar` es `nowrap` + `overflow-x: auto` + `scrollbar-width: none`, un patrón de teléfono en una pantalla sin dedo, donde la única salida es Mayús+rueda.

---

## Decisión

**El umbral es 1680px, no 1024.** Bajo ese ancho el reparto actual es correcto: la tira de chips desplazable funciona donde hay dedo, y el hero centrado es la forma correcta de un ancho estrecho. La auditoría lo fija explícitamente ("ninguna regla por debajo de 1680px de ventana") y este ADR lo respeta. Las dos únicas decisiones que valen en todos los anchos son de **contenido y de marcado**, no de composición: D2 y D6.

**La lista no se parte en dos columnas.** Es la tentación obvia a 1376 y sería un error: el agrupado por día construye una lectura cronológica de arriba abajo, y dos columnas obligarían al ojo a saltar de lado dentro del mismo día. El ancho sobrante se llena de otras dos maneras: arriba, dejando de decorar un total; en la fila, devolviéndole el dato que ya tiene y esconde.

### D1. La cabecera es una banda, con enlace de salida (G1b)

Desde 1680px el hero pasa a banda: el total con su rótulo y su comparativo a la izquierda; a la derecha, tras un filete, la navegación de mes y un enlace **"En qué gastaste"** que lleva a Análisis. Es el mismo patrón de banda ya aprobado en Inicio ([ADR 070](070-inicio-centro-de-atencion-en-escritorio.md) D6) y en Calendario ([ADR 071](071-calendario-como-mapa-del-mes-en-escritorio.md) D4), y el mismo enlace de cabecera que usan "Dónde está tu dinero" y "Lo que tienes que pagar".

El enlace es la respuesta a "¿en qué gasté más?": se contesta **donde ya está contestada**, en Análisis, con su dona y su lista ordenada por monto, en vez de reimplementar la clasificación acá. Ese es también el motivo por el que **el orden alfabético de los chips no se toca**: son un índice de búsqueda, y su valor es que cada categoría esté siempre en el mismo sitio. Índice y clasificación son dos cosas distintas y viven en dos sitios distintos a propósito.

### D2. La fila muestra la cuenta (G2)

El subtítulo pasa a llevar la cuenta de origen, con el mismo separador `·` que ya usa para la descripción legacy y la nota: *"Bancolombia Ahorros · Mercado quincenal Éxito Colina"*. Sin cuenta asignada, el subtítulo desaparece como hoy.

Es el dato que diferencia dos gastos iguales del mismo día, y el único que la fila puede mostrar **sin pedirle nada nuevo al usuario ni a la lógica**: el nombre sale de `S.cuentas` por `cuentaId`, con el mismo `find` que ya usan otras cinco vistas.

Vale en todos los anchos porque es contenido, no composición. En móvil ocupa la línea que hoy suele estar vacía.

### D3. Los chips envuelven (G3)

Desde 1680px `.filtros-bar` pasa a `flex-wrap: wrap` y suelta `overflow-x`. Ninguna categoría puede quedar fuera de alcance. Bajo ese ancho la tira desplazable se queda como está.

### D4. El total del día cae sobre la columna que suma (G4)

El encabezado de día reserva a la derecha exactamente lo que ocupa la columna de acciones más los huecos que la separan del monto, para que su cifra quede a plomo con los montos que suma. Es una regla de alineación, no un componente.

### D5. Solo se levanta lo que se puede pulsar (G6)

Desde 1680px se retira el `translateY(-1px)` del hover de la fila de Gastos y se conservan el cambio de fondo y de borde. La fila no tiene acción propia (solo la tienen sus tres botones), así que una barra de 1376px que se levanta al pasar promete un clic que no existe. Es la misma regla que el [ADR 070](070-inicio-centro-de-atencion-en-escritorio.md) aplicó al bento.

### D6. Chevrons del sistema en la navegación de mes (G7)

`‹` y `›` dejan de ser caracteres de la fuente de texto y pasan a `#i-chevron-right`, el de la izquierda girado 180 grados, igual que `.section__volver`. No cambia ni el tamaño de toque ni la posición. Vale en todos los anchos: es el glifo, no el reparto.

### D7. Sin cascada de entrada en la lista (G8)

Desde 1680px se retira la animación escalonada de los seis primeros `.list-item` de Gastos. En un monitor la lista se ve completa de un golpe y el escalonado solo retrasa lo que ya está calculado; además se repite en cada cambio de mes. Mismo criterio que el [ADR 070](070-inicio-centro-de-atencion-en-escritorio.md) aplicó al bento.

### D8. Lo que se conserva y no se toca

Las tres acciones de la fila **siguen siempre visibles**. El rótulo del mes visible, el comportamiento del comparativo con filtro activo, el "›" deshabilitado en el último mes navegable, el vacío de un mes pasado que ofrece volver en vez de registrar, el agrupado por día con su total y el ojo que enmascara total, totales de día y montos a la vez. Ningún color, tipografía, radio, sombra ni componente nuevo; ninguna gráfica, ninguna tabla, ningún filtro, orden configurable ni búsqueda.

---

## Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| Partir la lista en dos columnas | rompe la lectura cronológica que el agrupado por día construye: el ojo tendría que saltar de lado dentro del mismo día |
| Una tarjeta "En qué gastaste" en la cabecera, con su clasificación por categoría (G1 de la primera pasada) | Análisis ya tiene esa tarjeta, con dona, lista ordenada por monto y comparación contra el mes anterior. Duplicarla contradice la decisión de Inicio de retirar el resumen semanal justamente porque la clasificación pertenece a Análisis. Al retirarse, Gastos queda **sin ninguna lógica nueva que escribir ni probar** |
| Ordenar los chips por monto | son un índice de búsqueda: su valor es la posición estable. La clasificación por monto la da el enlace a Análisis |
| Revelar las acciones de la fila al apuntar (G5 de la primera pasada) | en todo Finko no existe un solo revelado por opacidad, y los cinco `:focus-within` del código cambian el borde, no la visibilidad. Sería un patrón de interacción nuevo en la sección que menos lo necesita |
| Aplicar todo desde 1024px | a ese ancho el hero centrado y la tira de chips desplazable siguen siendo correctos, y esa franja es territorio de la auditoría móvil |

---

## Consecuencias

- Gastos gana composición de escritorio sin lógica nueva: la única dependencia (el nombre de la cuenta) se resuelve leyendo `S.cuentas`, que la vista ya puede leer.
- **D2 y D6 se ven también en móvil.** Son contenido y glifo, no reparto. La ficha de la auditoría móvil que toque Gastos hereda las dos y debe decidir sobre ellas si quiere otra cosa; no se descubren por sorpresa.
- La banda depende del hero que sigue vivo en escritorio. Si una ficha posterior de MOV.1 mueve la navegación de mes fuera del hero **también** por encima de 1024px, esta banda se queda sin su mitad derecha y hay que rehacerla: queda anotado en la ficha de contexto de la sección.
- El enlace a Análisis crea una salida más desde Gastos. Es la tercera cabecera con enlace de salida, así que el patrón deja de ser de Inicio y pasa a ser transversal.
