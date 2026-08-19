# ADR 073 - Deudas en escritorio: el inventario manda y la herramienta se queda a la vista

**Estado:** Aceptada. En implementación (iniciativa DSK.4, dos rebanadas).
**Fecha:** 2026-08-18
**Autores:** Esteban (producto), Claude Design (auditoría "Deudas 1920"), Claude Opus 5 (implementación)
**Relación:** hereda de los [ADR 070](070-inicio-centro-de-atencion-en-escritorio.md), [ADR 071](071-calendario-como-mapa-del-mes-en-escritorio.md) y [ADR 072](072-gastos-cabecera-de-banda-y-fila-con-cuenta.md) la banda de cabecera y la regla "primario a 8, dependiente a 4". Conserva enteros el [ADR 036](036-deudas-v2-visual.md) (Deudas v2: hero, tarjeta, chips) y el [ADR 069](069-bloque-gastos-en-la-barra-movil.md) (la sección es "Por pagar" y administra los tres tipos de compromiso). No toca móvil ni tablet: bajo 1440px la sección queda exactamente como está.

---

## Contexto

Deudas es la segunda sección sin una sola regla de escritorio: cero coincidencias de `.deuda-card`, `.estrategia-card` y `.hero-compromisos` en `responsive.css` y `layout.css`. Pero su defecto no es el de Calendario. Acá el contenido sí llena el ancho: **no es una sección estirada, es una sección apilada**, y la herramienta y el inventario compiten por el mismo eje vertical.

La pregunta de la sección no es "cuánto debo" (esa cifra la da el hero en un segundo). El propio banner de propósito la enuncia: *"¿Sientes que pagas y pagas pero la deuda no baja?"*. Es **"¿voy a salir, y cuándo?"**, y el código está construido para contestarla: motor de estrategias que compara Avalancha contra Bola de nieve, diagnóstico de viabilidad y tres palancas con simuladores propios. Deudas es la única sección de Finko que es una herramienta de decisión.

Dos defectos críticos, medidos contra el código vivo:

- **Al abrir la sección no se ve ninguna deuda.** La primera tarjeta empieza a **1364px** del inicio del contenido: por delante van el hero (162), la tarjeta de estrategia (**1083**) y los encabezados de grupo. La sección abre mostrando una herramienta de simulación, no lo que la herramienta ordena, y quien entra a abonar (la acción más frecuente) desplaza 1364px antes de ver el primer botón.
- **La estrategia no muestra su propio efecto.** Del selector Avalancha/Bola de nieve al primer badge de orden hay **1057px**. Elegir estrategia reordena la lista y le pone a cada deuda su badge 1°, 2°, 3°: ese es su único efecto visible, y ocurre entero fuera de la pantalla. El usuario pulsa, no ve nada, y para comprobarlo baja mil píxeles, momento en el que ya no tiene el selector a la vista para volver a comparar.

Y tres derivados del mismo ancho sin acotar: **1013px** entre el nombre de la deuda y su saldo, un botón "Abonar" de **1246 x 44** repetido una vez por deuda, y párrafos de **~180 caracteres** por línea justo en los textos que explican (el intervalo cómodo está entre 45 y 75).

---

## Decisión

**El umbral es 1440px.** Es el primer ancho en el que la columna dependiente pasa de 350px, que es el piso con el que sus controles (dos tarjetas de estrategia lado a lado, tres tiles de palanca y los campos del simulador) siguen siendo usables. A 1024 esa columna mediría ~250 y habría que rediseñar la herramienta, no recolocarla.

### D1. La lista es la sección; la estrategia es una capa sobre ella

`span 8` para la lista, `span 4` para la estrategia, la misma regla de Inicio, Calendario y Gastos. Quién es primario lo zanja el código, no el gusto: con cero deudas la lista pinta su estado vacío y `renderEstrategiaPago()` sale temprano sin pintar nada; con una sola deuda la estrategia se degrada a un mensaje.

El reparto se hace **colocando en la rejilla los bloques que ya existen** en `#sec-compromisos` (hero, lote, nudge, lista, estrategia), sin envoltorios nuevos ni cambios de marcado: así el orden del DOM (y por tanto el de móvil y el de los lectores de pantalla) no cambia ni un nodo.

### D2. La columna de estrategia es pegajosa, no de alto igualado

Se fija al pliegue y se queda a la vista mientras la lista se desplaza: es la corrección directa del defecto que la sección tiene hoy, ver el selector y el orden que produce al mismo tiempo.

**No se iguala a la altura de la lista**, como sí se hizo en Calendario, porque acá no hay altura contra la que igualar: el mes mide siempre lo mismo, la lista de deudas crece con el número de deudas. El tope de alto se expresa contra el **viewport** (`dvh` menos la barra superior, el aire de sección y la banda), no contra la rejilla, y con desplazamiento interno para el caso del plan inviable, donde el diagnóstico alarga la columna. **Es la única regla de toda la iniciativa de escritorio que depende del alto de la ventana**, y por eso queda escrita acá.

### D3. La tarjeta de deuda baja de tres renglones a dos

Los chips y las acciones comparten renglón: los chips ocupan el ancho sobrante y las acciones se alinean a la derecha. El botón "Abonar" se dimensiona a su texto (hoy resuelve `flex: 1 1 0%`, correcto a 390px, y a este ancho produce una barra de 1246px repetida una vez por deuda, que le quita peso al saldo, que es el dato que decide a cuál abonar).

**El saldo sigue en columna a la derecha**, y eso es deliberado: es lo que permite recorrer los saldos en vertical y ver cuál pesa más. Lo que se corrige es la distancia, que baja de 1013 a ~503px al acotar la lista a 8 columnas.

### D4. Sin deudas, la lista ocupa las doce columnas

Con la lista vacía la estrategia no se pinta, así que el reparto 8 · 4 dejaría el estado vacío con un tercio de pantalla en blanco al lado. La misma solución que Calendario aplicó a su mes sin día abierto.

### D5. Fuera el "+" del botón de la cabecera

El botón de la sección dice "+ Agregar". D3 del lenguaje de acciones ya aprobada: el "+" sale del texto porque el ícono ya lo aporta. El sustantivo no se toca: la ficha 05 ([ADR 069](069-bloque-gastos-en-la-barra-movil.md)) lo dejó genérico a propósito, porque ese botón abre el chooser de los tres tipos de compromiso.

### D6. Lo que se conserva y no se toca

El motor de estrategias entero, incluida la separación entre el orden (Avalancha/Bola) y la palanca (Aumentar/Renegociar/Consolidar). La arquitectura de dos capas del plan inviable: la alarma señala, la solución calma. Que el extra tecleado nunca decida estructura (BUG-011). Que la tarjeta de estrategia nunca esté deshabilitada, con mensaje educativo en vez de un botón gris. El badge de orden superpuesto a la teja de marca. El callout de tasa por confirmar. Que abonar no vaya en verde: un abono no es un ingreso. Y el estado terminal de una deuda saldada.

Cuatro de los ocho hallazgos de la auditoría (los párrafos de 180 caracteres, los campos de formulario de 1309px, las tarjetas de estrategia de 667px y parte de la distancia nombre-saldo) **no necesitan regla propia: se corrigen solos al acotar el ancho**. Eso es señal de que el diagnóstico apunta a una causa y no a siete síntomas.

---

## Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| Mosaico bento | dos objetos que no compiten por el ancho: un inventario que crece y una herramienta que lo ordena. El mosaico aplana esa relación sin resolver nada que dos columnas no resuelvan |
| Estrategia como columna primaria (span 8) | contesta la pregunta de la sección, pero el código zanja la duda: sin deudas no se pinta, y con una sola se degrada a un mensaje. Es una capa sobre la lista, no la lista |
| Igualar la altura de la columna a la de la lista, como en Calendario | ahí el mes mide siempre lo mismo; acá la lista crece con el número de deudas y no hay altura contra la que igualar |
| Pegar el saldo al nombre de la deuda | se pierde la columna de saldos, que es lo que permite compararlos de un vistazo. El problema es la distancia, no la alineación |
| Aplicar la composición desde 1024px | la columna dependiente quedaría en ~250px y habría que rediseñar la herramienta en vez de recolocarla |

---

## Consecuencias

- La sección deja de abrir con una herramienta de simulación tapando su propio contenido, y el bucle de decisión (elegir estrategia, ver el orden que produce) cabe por fin en una pantalla.
- Aparece en el proyecto la primera regla de composición que depende del **alto** de la ventana. Queda acotada a esta columna y escrita en `dvh`; si mañana otra sección la necesita, se hereda de acá.
- La auditoría se escribió contra la sección cuando se llamaba "Deudas" y solo listaba deudas. Hoy es "Por pagar" y su lista tiene también los gastos fijos ([ADR 069](069-bloque-gastos-en-la-barra-movil.md)): el reparto vale igual, porque el argumento (la lista es la sección) no depende de cuántos grupos tenga, pero **el hallazgo E8 cambia de objeto**: el botón ya no dice "+ Nueva deuda" sino "+ Agregar", y lo que se corrige es solo el "+".
- La tarjeta de lote de "Por pagar" y el nudge de deudas durmiendo viajan en la columna de la lista, no en la de la herramienta: son inventario, no decisión.
