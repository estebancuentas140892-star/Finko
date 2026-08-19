# ADR 071 - Calendario como mapa del mes en escritorio

**Estado:** Aceptada. En implementación (iniciativa DSK.2, tres rebanadas).
**Fecha:** 2026-08-18
**Autores:** Esteban (producto), Claude Design (auditoría "Calendario 1920" y su documento "Calendario 1920 - Implementación"), Claude Opus 5 (implementación)
**Relación:** **acota el [ADR 069](069-bloque-gastos-en-la-barra-movil.md)** (ficha 05: el pago en lote sale de Calendario) en un punto y solo en escritorio: la banda del mes vuelve a ofrecer "Pagar los N", pero reusando el modal de "Por pagar" por `data-action`, sin devolverle a `agenda` ni el formulario ni el motor. Conserva enteros el [ADR 037](037-calendario-v2-visual.md) (Calendario v2 visual), el [ADR 021](021-recordatorio-dia-de-ingreso.md) (el día de ingreso es un evento), el [ADR 048](048-metas-v2-subcategorias-y-plan-de-aportes.md) D3 (los aportes de meta comparten grilla), la regla de color de lo vencido que fijó DIS.11 (familia warning, nunca danger) y la disciplina del ojo de los [ADR 034](034-inicio-v2.md)/[ADR 035](035-mis-cuentas-v2.md). Hereda del [ADR 070](070-inicio-centro-de-atencion-en-escritorio.md) la regla "primario a 8, dependiente a 4". No toca móvil: bajo 1024px la sección queda exactamente como la dejó la ficha 05.

---

## Contexto

Calendario es la **única sección de Finko sin una sola regla de escritorio**. La auditoría buscó overrides de `.cal-card`, `.cal-grid`, `.cal-day`, `.cal-detail`, `.hero-agenda` y `.cal-lote` en `responsive.css` y en `layout.css`: cero coincidencias. Lo que se ve en un monitor es la hoja de móvil ocupando 1376px de ancho, y eso rompe las dos piezas que la sección existe para dar.

Tres defectos medidos contra el código vivo:

- **El mes no se estira: se encoge.** `.cal-day` pide `aspect-ratio: 1` con `max-height: 72px`. A 1376 cada columna mide 188px, pero el tope de altura manda y la proporción cuadrada arrastra el ancho con él: la celda se queda en **72 x 72** anclada al principio de una columna de 188. Las siete suman **528px de una rejilla de 1342** (el 39 %), y el rótulo del día de semana, que sí llena su columna, queda **58px fuera** de los días que nombra.
- **El panel del día nace entero fuera de la pantalla.** El detalle se emite debajo de la tarjeta del mes: con hero (172) y tarjeta del mes (622) por delante, **0px visibles** al abrir un día. Es la misma pelea que el código ya documenta en móvil ("el panel nacía fuera del viewport"), repetida en un monitor con 1376px de ancho sin usar.
- **El día solo puede decir "pasa algo".** Punto de 6px por evento, hasta 3, más "+N". Es la solución correcta a 46px de celda; a 121px la celda puede decir **qué** y **cuánto**, que es lo que el usuario abre Calendario a averiguar.

La pregunta propia de la sección no es "qué tengo que atender ahora" (esa es de Inicio) sino **"cómo se reparte el mes"**: cuándo entra el dinero, cuándo sale, y si hay un tramo donde salen tres pagos antes de que entre nada. Contra esa pregunta se mide todo lo que sigue.

---

## Decisión

### D1. Mapa a la izquierda, detalle a la derecha: 8 y 4

Calendario tiene **un objeto principal** (el mes) y **una consecuencia** (el día que se abre). No compiten por el ancho: una manda y la otra depende, así que no hay mosaico que reconciliar. La composición es la clásica de un calendario de escritorio: el mes en `span 8`, el día en `span 4`.

Con span 8 la columna del mes da celdas de ~121px, suficiente para nombre y monto; con span 4 el panel da ~409px de ancho útil, más que los 390 para los que ya están diseñadas sus filas, así que se reutilizan sin tocarlas.

Inicio pone la columna estrecha a la izquierda y Calendario a la derecha, y conviene decirlo en voz alta: no es una contradicción. En las dos pantallas **el contenido primario recibe span 8** y lo que cambia es cuál es. La regla que se conserva del [ADR 070](070-inicio-centro-de-atencion-en-escritorio.md) es "primario a 8, dependiente a 4", no una posición fija.

### D2. La celda ocupa su columna

En escritorio se retiran `aspect-ratio` y `max-height` de `.cal-day` y la celda pasa a `min-block-size: 80px`. Con eso desaparece de una vez el 39 % de rejilla usada y la desalineación de 58px de la cabecera, que era un derivado del mismo defecto y no necesita regla propia.

80 y no 86: un día con un evento ocupa ~63px de contenido, así que 80 ya es holgura, y la fila crece con el día más cargado. A 86 la pantalla cabía en el pliegue con 0px de sobra y un segundo día de doble evento la desbordaba.

### D3. El día dice qué y cuánto; con tres o más pagos, cuántos y cuánto

Hasta **dos pagos**, la celda los nombra con su monto. Desde **tres**, pasa a agregado: "9 pagos" y la suma del día. En Colombia el 15 y el 30 concentran casi todo, y ese no es el caso extremo de Calendario sino el normal: listar 2 de 9 es arbitrario (el usuario no sabría por qué esos dos) y ninguno de los dos contesta lo que se pregunta el 15, que es cuánto sale. La celda no pierde información: cambia una lista truncada por una cifra completa, y los nueve nombres siguen a un clic en la columna de al lado.

**El día de ingreso nunca se agrega**: entra o no entra, y es el dato que más decide. **El aporte a meta tampoco** ([ADR 048](048-metas-v2-subcategorias-y-plan-de-aportes.md) D3: es recordatorio, no pago, y no suma al total del día). El agregado cuenta solo pagos y suma solo lo que `totalDia()` ya considera pago.

El punto de color se conserva como marca de tipo dentro de cada fila, y con él la leyenda dinámica. La fila de puntos de móvil no se pinta en escritorio: su trabajo lo hace la fila de nombre y monto.

### D4. La banda del mes: una superficie, una frase

El hero del mes (1376 x 172) decía la mitad de la frase y la tarjeta de lote (1376 x 173) la otra mitad: 345px de alto, un tercio del pliegue, con dos cifras mono extrabold compitiendo antes de que apareciera el mes. En escritorio se funden en una banda: a la izquierda cuánto suma el mes y cuánto llevas pagado; a la derecha, cuánto de lo que falta ya venció y el botón para liquidarlo. Es el mismo patrón de banda que el [ADR 070](070-inicio-centro-de-atencion-en-escritorio.md) D6 ya aprobó en Inicio.

**Esto acota el [ADR 069](069-bloque-gastos-en-la-barra-movil.md) y hay que decirlo, no dejarlo pasar.** La ficha 05 sacó de Calendario la tarjeta de lote entera, con el argumento de que "Por pagar" es la sección dueña de los tres tipos de compromiso. Ese argumento sigue en pie y no se revierte: el formulario, el motor de pago y el modal siguen siendo de `compromisos`. Lo que vuelve, **solo desde 1024px**, es la **entrada**: la banda emite `data-action="compromisos-pagar-lote"` con el mes visible, igual que ya lo hace "Pendientes del mes" en Inicio. Cero lógica nueva en `agenda` y cero imports nuevos: la entrada es marcado con `data-action`, que es justo el mecanismo que evita el import cruzado (ADN 7 y 10). Bajo 1024px la banda no existe y la sección sigue siendo el tablero de consulta que dejó la ficha 05.

El botón se dimensiona a su texto. El `flex: 1 1 100%` que en móvil lo bajaba a su propio renglón producía en monitor un botón de **1334 x 44** para tres palabras.

### D5. El panel del día es columna fija y desplaza su propia lista

El detalle deja de emitirse debajo del mes y pasa a la columna de la derecha, donde no se mueve nunca: el bucle de la sección (clic en un día, ver qué pasa ese día) deja de costar un salto de pantalla que además dejaba el mes fuera de la vista.

La columna **iguala la altura del mes** y lo que se desplaza es la lista; el título y el total del día no se mueven. Con 9 o 10 pagos en un día, dejar crecer la columna devolvería exactamente el defecto que este ADR corrige. Lo que sostiene la regla es `contain: size`: sin él, la altura de la fila la fija el hijo más alto y el carril seguía creciendo con sus filas (medido: 1470px de alto) estirando la fila con él. Con contención de tamaño el carril aporta cero al cálculo de la fila y el `stretch` le devuelve la altura del mes. Quién manda deja de depender de cuántos pagos tenga el día.

### D6. El modo privacidad alcanza la rejilla

El ojo enmascara también los montos de las celdas del mes, con la **máscara corta por celda** (`SALDO_MASCARA_CUENTA`, la misma que ya usan las filas de cuenta y del detalle). Sin esto, activar el ojo con la celda mostrando cifras dejaba de ocultar nada útil. La celda conserva su estructura, así que se sigue viendo **qué** hay y **cuándo**, y solo se oculta **cuánto**.

**Excepción, ya vigente en el código:** el total de lo vencido no se enmascara. No es un saldo, es el precio de la acción que la banda está ofreciendo, mismo criterio que los montos del modal de pago.

### D7. Entrada sin eventos hoy: abre el próximo día con eventos

Al entrar a la sección, si el día actual no tiene eventos, el panel abre el **próximo día con eventos del mes visible**; si no hay ninguno por delante, se mantiene el estado vacío actual. Es una extensión del auto-seleccionado de CAL.3 y, como aquel, **se consume una sola vez**: navegar entre meses o días dentro de la sección no vuelve a forzarla.

Va acotada a escritorio. En móvil el panel nace bajo la grilla y abrir un día que el usuario no pidió lo obligaría a desplazarse; esa pantalla es territorio de MOV.1 y no se decide desde acá.

### D8. Lo que la maqueta trae y no se implementa

La maqueta pinta un botón "Nuevo gasto fijo" en la barra superior de la sección. No se implementa: la ficha 05 ([ADR 069](069-bloque-gastos-en-la-barra-movil.md)) mudó el alta de gasto fijo a "Por pagar", y la barra superior del escritorio de Finko tiene **un solo** botón, global, "Registrar". El hallazgo que lo acompañaba (renombrar segun D3 del lenguaje de acciones) queda sin objeto en esta sección.

---

## Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| Mosaico bento, como Inicio | un mosaico reconcilia piezas de pesos parecidos que compiten por el ancho. Acá el mes manda y el día depende: la relación es de causa y consecuencia, y el mosaico la aplana |
| Conservar la celda cuadrada y solo subir el tope de altura | la proporción cuadrada es lo que arrastra el ancho hacia abajo. Subir el tope da celdas gigantes sin resolver que el ancho de la columna manda |
| Listar dos de los nueve pagos del 15 | arbitrario: el usuario no sabría por qué esos dos, y ninguno contesta cuánto sale ese día |
| Dejar crecer la columna del día con su contenido | devuelve el defecto corregido: con 9 pagos el mes vuelve a salirse de la pantalla |
| Devolver a Calendario el formulario de gasto fijo y el motor de pago | eso sí sería revertir el [ADR 069](069-bloque-gastos-en-la-barra-movil.md) en silencio. Vuelve la entrada a una acción ajena, no su dueño |
| Enmascarar también el total de lo vencido | no es un saldo sino el precio de la acción ofrecida; el código ya trata así los montos del modal de pago |

---

## Consecuencias

- Calendario deja de ser la única sección sin reglas de escritorio: la rejilla, la banda y el panel del día tienen composición propia desde 1024px.
- El clic deja de servir para **averiguar** y pasa a servir para **actuar**: lo que hay y por cuánto ya se lee en el mapa.
- `agenda/view.js` emite en la celda la fila de nombre y monto **y** la fila de puntos; el reparto lo decide CSS por ancho, no JavaScript. Así móvil no cambia ni un nodo y no aparece la limitación de "un cambio de ancho sin cambio de estado no repinta".
- La banda de escritorio depende de una acción registrada por `compromisos` (`compromisos-pagar-lote`). Si esa acción se renombra, la banda se queda sin CTA: queda anotado en la ficha de contexto de las dos secciones.
- Estabilidad medida ante distintos estados: un mes sin vencidos pierde el bloque derecho de la banda y conserva el izquierdo; un mes sin eventos conserva la rejilla navegable y el panel muestra su estado vacío; el mes de quincena (21 compromisos, 9 pagos el 15) cabe en el pliegue igual que el mes ligero, con la lista desplazando por dentro.
