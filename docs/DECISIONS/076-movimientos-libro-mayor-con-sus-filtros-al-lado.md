# ADR 076 - Movimientos: un libro mayor con sus filtros al lado

**Estado:** Aceptada. En implementación (iniciativa DSK.7, dos rebanadas).
**Fecha:** 2026-08-18
**Autores:** Esteban (producto), Claude Design (auditoría "Movimientos 1920"), Claude Opus 5 (implementación)
**Relación:** hereda de los [ADR 071](071-calendario-como-mapa-del-mes-en-escritorio.md) y [ADR 073](073-deudas-inventario-con-su-herramienta-al-lado.md) el reparto "primario a 8, dependiente a 4" y el mecanismo de columna pegajosa. **Extiende a esta sección la regla de INT.1b** que ya oculta el "Volver" en escritorio para las hijas de Ahorro (vive en `responsive.css` con su motivo escrito; el ADR 059 que la citaba no existe en `docs/DECISIONS/`, y eso ya está registrado como **BUG-027**). Conserva entero el enrutado de acciones por `tipo` del ledger y sus dos estados vacíos.

---

## Contexto

Movimientos es **la única sección de la app cuyo trabajo es recorrer una columna de cifras**, y es justo esa columna la que está rota:

- **La columna de montos está dentada.** `_ACCIONES_POR_TIPO` da a cada tipo un número distinto de botones (gasto 2, ingreso y aporte 1, transferencia 0) y la botonera es el último elemento del flex, así que **el monto se corre con ella**: tres bordes derechos distintos medidos en la misma columna (1678, 1726 y 1778), hasta **100px** entre filas contiguas. Una fila sin acciones ni siquiera emite el contenedor, para no dejar un hueco muerto: es el criterio correcto y es justo lo que produce el escalón. En Gastos o en Deudas no pasa porque todas las tarjetas ofrecen las mismas acciones; acá conviven cinco tipos en la misma lista.
- **La barra de filtros ocupa 143px en tres renglones**, y tiene un coste que no se ve en una captura: el ledger carga en lotes de 50 y sigue cargando solo al llegar al final, así que a las pocas pantallas **cambiar un filtro obliga a volver arriba del todo**. Es la herramienta principal de la sección y solo está disponible al principio.
- **Campos de fecha de 634px cada uno.** `flex: 1 1 8rem` reparte el renglón en móvil; a 1376 los estira a media pantalla para diez caracteres.
- **"Volver a Inicio" en una sección que tiene entrada propia.** Su motivo está escrito en `layout.css`: el regreso explícito existe para las secciones sin ícono en la barra, porque en la PWA instalada no hay chrome del navegador. En escritorio Movimientos **sí** tiene entrada en la barra lateral, con su estado activo.
- **313px de cromo antes del primer movimiento**, casi un tercio del alto disponible, y **918px** entre la descripción y su monto: quinta aparición del mismo defecto de fila ancha en esta auditoría.

---

## Decisión

**El umbral es 1440px**, el mismo de Deudas y Mis cuentas.

### D1. La lista se queda en una columna; lo que va al lado son los filtros

Hay que descartar primero lo que funcionó en Me deben: allá las tarjetas van 2-up porque la pregunta es "a quién le toca" y se contesta viendo a todos a la vez. **Un libro mayor es cronológico**, y en dos columnas el orden de lectura se rompe: se saltaría del 7 de agosto al 3, de vuelta al 6, otra vez al 2. La secuencia **es** el contenido.

Así que el ledger toma `span 8` a la izquierda y los filtros `span 4` a la derecha. Es el mismo reparto de Calendario y Deudas y por el mismo motivo (un objeto y algo que opera sobre él), con la diferencia de que acá la herramienta no reordena la lista: la recorta.

**La lista va a la izquierda** aunque en un buscador convencional los filtros irían primero: acá el recorrido normal es el contrario, se llega a *mirar* y solo se filtra cuando mirar no basta. Y las tres secciones ya cerradas ponen el contenido primario en `span 8` a la izquierda.

### D2. La columna de filtros se fija al desplazar

No es adorno: es lo que resuelve el coste medido. Con el ledger cargando por lotes y desplazándose solo, la herramienta tiene que estar donde está el trabajo. Mismo mecanismo que el carril de estrategia de Deudas ([ADR 073](073-deudas-inventario-con-su-herramienta-al-lado.md) D2), con tope contra el viewport y desplazamiento interno.

### D3. La columna de montos deja de estar dentada

Se **reserva** el hueco de la botonera en las filas que no la emiten, en vez de pintar botones muertos: una fila que no ofrece una acción no debe fingir que la ofrece. El ancho reservado es el de dos botones de icono, que es el máximo que emite `_ACCIONES_POR_TIPO`.

Acotado al contenedor del ledger, sin tocar `.list-item`, que es compartido con Gastos y Me deben. Mismo criterio por contenedor que ya usa `#lista-ingresos`.

**Vale en todos los anchos**: el dentado no es un defecto de escritorio, pasa en cualquier tamaño; a 1376 solo se nota más porque la columna es más larga.

### D4. Los campos de fecha dejan de crecer

Los dos a la mitad de la columna de filtros, sin `flex-grow`. Una fecha tiene un ancho natural de diez caracteres y no gana nada con más.

### D5. El "Volver a Inicio" se oculta en escritorio

Con la regla que ya existe para las cuatro hijas de Ahorro (INT.1b), cuyo comentario dice: *"oculto en desktop por defecto, la casa ya está anidada en el sidebar. Se restaura bajo 1024px, donde sigue siendo la única salida vertical."* Movimientos cumple la misma condición y se quedó fuera. **No es una decisión nueva: es extender una tomada a la sección que faltaba**, y bajo 1024px el control sigue intacto porque ahí sí es la única salida.

Es la segunda vez en esta auditoría que aparece el patrón "la corrección ya existía y no cruzó": la primera fue la anatomía de tarjeta de Me deben.

### D6. El divisor de mes acompaña al desplazamiento

Con filas de 80px el rótulo del mes sale de pantalla a las doce filas, y "cuándo" es la mitad de la pregunta de la sección. El divisor se fija con el mismo mecanismo de la columna, sigue siendo `role="presentation"` y por tanto para un lector de pantalla no cambia nada.

Es la única adición de interacción de la auditoría, y usa un mecanismo ya aprobado en vez de estrenar uno.

### D7. Lo que no se toca

El enrutado de acciones por `tipo` y no por `dominio`, con su argumento escrito (un gasto de categoría "Deudas" colorea como Deudas pero vive en `S.gastos`). Que el ledger no reimplemente ninguna acción y herede las reversas de cada dominio dueño. Que un tipo sin acción no finja tenerla. Los dos estados vacíos distintos (sin datos, el CTA crea; con filtros que no casan, el CTA los quita). Que el 4x1000 de una transferencia se trace en el subtítulo sin sumarlo al monto. Que "Limpiar filtros" se repinte solo para no robar el foco. El filtro por dominio y no por tipo. Y **la ausencia de banner de propósito**: es la única sección sin él y no lo necesita.

---

## Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| La lista 2-up, como Me deben | un libro mayor es cronológico y dos columnas rompen el orden de lectura: la secuencia es el contenido |
| Filtros a la izquierda, como en un buscador | ahí primero se acota y luego se lee; acá se llega a mirar y solo se filtra cuando mirar no basta |
| Pintar botones deshabilitados en las filas sin acción | una fila que no ofrece una acción no debe fingir que la ofrece. Se reserva el hueco, no se inventa el control |
| Tocar `.list-item` para alinear la columna | es compartido con Gastos y Me deben. La corrección va acotada al contenedor del ledger |
| Quitar el "Volver" en todos los anchos | bajo 1024px sigue siendo la única salida vertical de la sección |

---

## Consecuencias

- La sección que existe para comparar cifras por fin tiene su columna a plomo, y eso vale también en móvil.
- Los filtros dejan de ser una herramienta de la primera pantalla y pasan a estar disponibles en todo el recorrido, que es donde se necesitan con un historial que se carga solo.
- Segunda regla del proyecto que se fija al viewport (la primera fue el carril de Deudas). Las dos usan el mismo mecanismo y quedan escritas en su ADR.
- La regla de ocultar el "Volver" en escritorio pasa de ser específica de Ahorro a cubrir también Movimientos: cualquier sección futura con entrada propia en la barra debería heredarla, y conviene revisarlo cuando se agregue una.
