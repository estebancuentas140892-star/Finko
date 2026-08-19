# ADR 079 - El armazón de escritorio: una identidad, un primario, una navegación fija

**Estado:** Aceptada. En implementación (iniciativa DSK.10, tres rebanadas).
**Fecha:** 2026-08-18
**Autores:** Esteban (producto, incluido el visto bueno explícito a D6), Claude Design (auditoría transversal "Auditoría global 1920"), Claude Opus 5 (implementación)
**Relación:** es la **fase transversal que las nueve auditorías de sección daban por hecha**: los [ADR 070](070-inicio-centro-de-atencion-en-escritorio.md) a [ADR 078](078-analisis-en-dos-filas-de-dos.md) citan sus D1, D2 y D3 como aprobadas, y ninguna estaba implementada. Conserva el tope de 1440px y el centrado, la teja de dominio como sistema de reconocimiento, el estado activo teñido por dominio y la cinta de saldo de la barra superior.

---

## Contexto

El recorrido transversal a 1920 x 1080 encontró quince hallazgos, y ninguno es de composición de contenido: son del **armazón**.

- **La identidad de la sección está duplicada.** La barra superior pinta teja + nombre, y el encabezado de cada sección pinta la misma teja y el mismo nombre 32px más abajo y **más grande** (24px contra 18px). El eco es más fuerte que el original, cuesta 76px de alto en cada una de las trece secciones y enseña que el título de arriba no es de fiar.
- **La jerarquía de acción está invertida.** El primario del encabezado se retira desde 1024 y `shell.js` lo reemite en la barra superior como `.btn-secondary`, a la izquierda del `.btn-primary` global de "Registrar": **la acción propia de la pantalla queda más callada que una que no le pertenece**.
- **Los verbos del primario no son un sistema**: "Registrar gasto", "+ Cuenta", "+ Meta", "+ Reserva", "+ Límite"... tres patrones de construcción y cuatro verbos. El usuario no puede predecir cómo se llama la acción antes de leerla.
- **Colapsar la barra no compra nada a 1920.** Con la sección topada en 1440, el ancho de contenido es **1376 tanto expandida como colapsada**: el control cambia once nombres por cero píxeles. Y la barra colapsada **no tiene ningún sustituto del nombre**: ni `title`, ni panel emergente, ni rótulo. Once destinos sin una palabra, con el estado persistido en `localStorage`.
- **La navegación no se puede leer entera**: las cuatro hijas de Ahorro solo existen mientras el hash pertenece al grupo, "Ahorro" es rótulo de grupo y destino a la vez, el primer grupo no tiene nombre y "Seguimiento" agrupa cinco cosas que no comparten naturaleza. A 1080 de alto la barra tiene **435px libres**: el argumento de ahorro de espacio no aplica en monitor.
- **Ajustes tiene tres entradas** (pie de la barra, barra superior y encabezado de perfil de Inicio), dos de ellas sin etiqueta, y la marca "F" aparece dos veces en Inicio.
- **El movimiento es de dedo, no de puntero**: todas las celdas del bento se levantan al hover con `cursor: default`, los items de navegación se encogen al pulsar, y la cascada de entrada retrasa cinco bloques que en monitor ya se ven de un golpe.

**No hay hallazgo de contraste**: los cuatro pares medidos pasan AA con holgura.

---

## Decisión

**Una identidad, un primario, una navegación fija.** La pantalla se nombra una sola vez, y donde el nombre sobrevive al desplazamiento. Hay exactamente un botón lleno por pantalla, y es el de la pantalla. Y en monitor la navegación no se pliega, porque plegarla no da espacio.

**El umbral es 1680px** para todo lo que depende del ancho, que es donde el colapso deja de comprar píxeles.

### D1. La sección se nombra una sola vez, arriba

Desde 1680px el `.section__title-group` pasa a estar oculto visualmente: la teja y el `h1` **siguen existiendo en el marcado** para lectores de pantalla y desaparecen de la vista. La identidad visible es la de la barra superior, que es la que sobrevive al desplazamiento.

### D2. Un solo primario por pantalla

`#topbar-primario` pasa a `.btn-primary` y "Registrar" a `.btn-secondary` **cuando la sección tiene primario propio**; cuando no lo tiene (Análisis, Ahorro, Movimientos, Fondo, Inversión, Ajustes), "Registrar" recupera el primario. **Es una regla, no un mapa por sección**: la decide la misma condición que `_syncPrimarioTopbar` ya evalúa.

### D3. Dos verbos, con una regla que los separa

**Registrar** para hechos que ocurrieron (un gasto, un ingreso, un pago). **Nueva/Nuevo** para entidades que quedan vivas (deuda, cuenta, límite, meta, reserva, gasto fijo, préstamo). Sin "+" en el texto: el icono ya lo dice cuando hace falta.

Las auditorías de sección ya aplicaron esta regla en Calendario, Deudas, Me deben, Mis cuentas y Límites. Acá se cierra lo que falta: **"+ Cuenta" pasa a "Nueva cuenta", "+ Meta" a "Nueva meta" y "+ Reserva" a "Nueva reserva"**.

### D4. A 1920 no hay barra colapsada

Desde 1680px el botón de colapsar se retira y **el estado persistido se ignora en ese rango**. Por debajo todo sigue igual: ahí el control sí ensancha el contenido.

### D5. Si la barra colapsada sobrevive bajo 1680, necesita nombre

No se diseña en esta etapa (es otra resolución), pero queda escrito: **ningún destino sin nombre**. Lo que hoy existe bajo 1680 (once iconos mudos con el estado persistido) **no debe darse por definitivo**, y su corrección necesita tarjeta propia.

### D6. Cuatro grupos con nombre, ninguno mudo

- **Día a día**: Inicio · Gastos · Calendario · Movimientos
- **Compromisos**: Deudas · Me deben
- **Mi dinero**: Mis cuentas · Ahorro y sus cuatro hijas
- **Cómo voy**: Límites de gasto · Análisis

Reúne los dos espejos de deuda (hoy "Deudas" vive en el grupo diario y "Me deben", su espejo exacto, en otro), saca a Movimientos de un grupo que no lo explicaba y deja cada rótulo prediciendo lo que contiene. **Es la única decisión que cambia la arquitectura de información**, y por eso llevó visto bueno explícito de Esteban antes de tocarla.

No cambia rutas, ni hashes, ni dominios: son rótulos y orden en el marcado.

### D7. Las cuatro hijas de Ahorro, siempre visibles

Desde 1680px la subnav deja de depender del hash. La barra tiene 435px libres y la propuesta completa deja todavía 263 sin desplazamiento interno. Con D6, "Ahorro" deja de ser rótulo de grupo y se queda solo como destino con sus cuatro hijas debajo: **la palabra deja de aparecer dos veces y el mapa de la app se puede leer entero sin entrar a ningún sitio**.

### D8. Una sola entrada a Ajustes

Se conserva la del pie de la barra lateral, la única con etiqueta. Salen el engranaje de la barra superior y el del encabezado de perfil de Inicio, y con él la marca "F", que solo existía por el caso móvil. **El conmutador de tema se queda arriba: no es navegación.**

### D9. Solo se levanta lo que se puede pulsar

El `translateY(-2px)` del hover se acota a las celdas del bento que son enlace o contienen una acción; las demás cambian el borde y nada más. Es la misma regla que ya aplicaron Gastos (ADR 072 D5) y Deudas.

### D10. Movimiento fino para puntero fino

El `scale(0.97)` de `.nav-item:active` se acota a `pointer: coarse`, y la cascada de entrada del bento se retira desde 1680px: en monitor la pantalla se ve completa de un golpe y el escalonado solo retrasa lo que ya está listo.

### D11. El tope de 1440 se mantiene

No se ensancha la sección en monitor: los 120px de aire por lado son el resultado correcto, no un hueco que llenar. La pregunta del aprovechamiento del espacio se responde sección por sección, y eso es exactamente lo que hicieron los ADR 070 a 078.

---

## Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| Ensanchar la sección más allá de 1440 | una lista de 1376px no mejora a 1680: el problema no era el tope, era qué se hace con el ancho dentro de cada sección |
| Conservar el colapso de la barra en monitor | con la sección topada, colapsar da **cero** píxeles de contenido y quita once nombres |
| Ocultar el título de sección borrándolo del marcado | el `h1` es el nombre accesible de la sección: se oculta visualmente, no se elimina |
| Dibujar iconos nuevos para Fondo de emergencia y Movimientos (N6) | es trabajo de la familia de iconos, con sus reglas de duotono y retícula, no de una auditoría de composición. Queda anotado como dependencia |
| Quitar el conmutador de tema de la barra superior junto con Ajustes | no es navegación: es un control de la vista, y su sitio es el cromo |

---

## Consecuencias

- **Corrige una premisa falsa de toda la serie**: las nueve auditorías de sección citaban D1, D2 y D3 como aprobadas. Estaban decididas, no implementadas. Los ADR 070 a 078 no cambian de contenido, pero ahora su contexto es cierto.
- El encabezado de sección deja de ocupar 76px en trece pantallas desde 1680px, y eso mueve hacia arriba todo lo que las auditorías de sección midieron: **las cifras de pliegue de los ADR 071 a 078 mejoran, ninguna empeora**.
- **N6 queda abierto**: dos iconos siguen repetidos entre destinos distintos (Ahorro/Fondo y Movimientos/Efectivo). Es dependencia de la familia de iconos y necesita tarjeta propia.
- **D5 queda como deuda escrita**: bajo 1680 la barra colapsada sigue sin nombres. La decisión de acá es no darla por buena, no arreglarla.
- Ajustes pierde dos de sus tres entradas: si alguna medición futura muestra que el pie de la barra no basta, la decisión se revisa con datos, no volviendo a sembrar engranajes.
