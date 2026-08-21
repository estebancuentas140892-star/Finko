# ADR 082 - Metas: cabeza, orden y un final que pesa poco

**Estado:** Aceptada. Implementada en la ficha 09 de la auditoría UX/UI móvil (MOV.1).
**Fecha:** 2026-08-20
**Autores:** Esteban (producto), Claude Design (ficha 09 de la auditoría móvil), Claude Opus 5 (implementación)
**Relación:** **confirma DIS.14 y DIS.19 enteros** en la tarjeta (`.meta-card`, el medidor semicircular, la silueta que se llena, el objetivo como extremo de la escala): es la primera sección de la serie donde la pieza principal se audita y no se toca. **Acota DIS.14 en una sola frase**, su "un estado terminal conserva su forma", y solo para la lista. Reutiliza el patrón de divisores por urgencia que la ficha 05 llevó a Por pagar. Hereda de la ficha 04 el reparto casa-compara / sección-administra y sus chips. **Invierte el reparto de la candidata R87** para el movimiento que apunta a un objeto concreto de una lista. No toca el [ADR 048](048-metas-v2-subcategorias-y-plan-de-aportes.md) ni el [ADR 064](064-estructura-de-dos-niveles.md): las subcategorías y el plan de aportes siguen enteros.

---

## Contexto

Metas es la tercera hija de Ahorro y la única cuya pieza principal se había rediseñado hace poco y bien. Eso cambió el trabajo de la ficha: no había que tocar la tarjeta, había que arreglar la **lista** que la contiene.

La medición manda el diagnóstico. A 390px de ancho, la tarjeta mide 332px con fecha límite y 371px sin ella; encima van el volver, el encabezado, los chips de la ficha 04 y el banner de propósito, otros 177px. De los 740px útiles quedan 563 para la lista, o sea **una tarjeta y media**. Con tres metas en curso, dos viven bajo el pliegue.

Sobre esa medida, cuatro hallazgos, y ninguno es de la tarjeta:

- **G1, crítico. La lista calcula la urgencia de cada meta y no la usa.** `metasActivas(metas)` es `metas.filter(m => m.completada !== true)`: filtra, no ordena. Y `_renderMetaCard()` ya computa el porcentaje, el faltante, la fecha límite y el plan de aportes de cada tarjeta. Los datos para ordenar se calculan y se tiran. Con una sola tarjeta visible, el orden de creación **es** la respuesta que la sección da a "¿a cuál le aporto este mes?", y era una respuesta al azar: una meta al 90% que vence en septiembre quedaba debajo de una al 34% que vence en diciembre.
- **G2, alto. El total está en la casa y se pierde al entrar a la habitación.** El carril de Ahorro anuncia "$1.950.000 · 3 en curso". La sección empezaba directamente con la primera tarjeta, así que se entraba sabiendo más de lo que se sabía una vez dentro. Las cifras ya existían: la portada las arma en `ahorro/logic.js`.
- **G3, alto. Lo terminado pesa igual que lo pendiente.** Una meta cumplida se pintaba con la misma tarjeta y solo perdía el "+ Aportar": 290px permanentes al final de la lista por cada meta lograda. Quien cumple metas, que es a quien la sección quiere premiar, es el que peor lo pasaba.
- **G4, medio. Aportar tiene tres puertas y ninguna se declara.** El "+ Aportar" de la tarjeta, la silueta del carril de Ahorro y la teja "Aporte" de la hoja Registrar disparan la misma acción, `abonar-meta`. De las seis puertas que llevan a Metas, tres no abren la sección: abren el aporte.

De ahí sale la lectura que ordena la ficha: **la sección no es el sitio donde se aporta, es el sitio donde se decide a cuál aportar.** Y esa decisión era justo la que la lista no ayudaba a tomar.

---

## Decisión

Metas se queda donde está, hija de Ahorro a dos toques, y con la tarjeta que tiene. Cambia la lista.

### D1. Una franja encabeza la sección con las tres cifras que la casa ya calcula

Lo reunido como cifra grande, la barra de progreso y la línea de contexto con lo que falta. Anatomía de la franja de Por pagar (`renderHeroCompromisos()`): rótulo, cifra, barra, contexto.

El rótulo **declara su alcance** (regla R82): "Reunido en tus 3 metas", en singular con una sola. La cifra no cuenta el Fondo, ni las Reservas, ni las metas ya cumplidas, y decirlo cuesta cuatro palabras. El ojo de privacidad enmascara lo reunido y lo que falta; **el conteo y el porcentaje no se enmascaran**, que no son magnitudes de dinero (regla R20, el mismo corte que ya usa el anillo de la tarjeta).

Con metas cumplidas pero ninguna activa, la franja no se pinta: "Reunido en tus 0 metas $0" es una cabeza que no encabeza nada.

No se duplica acá la fila de siluetas del carril. La ficha 04 decidió que la portada compara y la sección administra: a la sección le faltaba cabeza, no un segundo carril.

### D2. La lista se ordena por fecha límite, y las metas sin plazo van al final

Ascendente por `fechaLimite`. Las metas sin fecha van después, bajo su propio divisor, **"Sin plazo"**. No es un castigo: es donde su invitación a ponerle fecha tiene sentido, porque son las únicas que piden algo distinto de un aporte.

Los divisores son el mismo componente con el que Por pagar separa fijos de deudas (`.grupo-eyebrow-fila` y su hueco de la derecha, donde D.16d puso el indicador de estrategia). **No hay selector de orden:** la ficha 04 fijó orden único por área, y añadir un control acá lo rompería.

Una `fechaLimite` ilegible cuenta como ausente: no se ordena por lo que no se puede leer.

El divisor del grupo con plazo solo se pinta cuando hay un segundo grupo con el que contrastar. Con todas las metas fechadas, el rótulo nombraría lo único que hay y no diría nada.

### D3. Las metas cumplidas bajan a una fila compacta bajo un divisor con contador

Silueta llena, nombre y monto logrado: **52px en vez de 290**. Con dos metas cumplidas se recuperan 476px de lista, que es casi otra meta activa entera.

De la fila del carril de Ahorro (`.silbtn`) se toma la anatomía, figura + nombre + un dato a la derecha, y la figura misma (`siluetaMeta()` al 100%). Lo que cambia es ese dato: el carril muestra el porcentaje, y en una lista de cumplidas el porcentaje es 100 en todas las filas y no informa de nada. Su sitio lo ocupa el monto logrado.

**La fila entera abre el editar y el eliminar tiene su propio botón de ícono.** Son dos botones hermanos, no uno dentro de otro: un `button` anidado no es HTML válido. El botón de eliminar existe porque `renderFormMeta()` no tiene eliminar, así que sin él borrar una meta cumplida se quedaría sin puerta.

Esto **acota DIS.14**. Su "un estado terminal conserva su forma" fue la respuesta correcta al problema que arregló DIS.13, donde la meta cumplida desaparecía y no había ninguna pantalla donde verla. Pero conservar la forma no era la única alternativa a desaparecer: **comprimir no es desaparecer**. La app ya tenía el principio escrito en la regla R7, una deuda saldada apaga sus indicadores de futuro, y acá se aplica al dominio vecino.

### D4. El aporte se declara, y se declara al revés de lo que parecía

La tarjeta conserva "+ Aportar" **sin marca de atajo**: acá está el camino canónico, porque solo acá el aporte ya sabe a qué meta va. Lo que se declara es la otra punta: la teja "Aporte" de Registrar y las siluetas del carril son los atajos.

Esto **invierte el reparto de la candidata R87**. En Mis cuentas (ficha 06) el verbo era genérico y Registrar era el camino canónico. Acá el aporte apunta a **una meta concreta**: desde la tarjeta cuesta un toque y desde Registrar tres, porque hay que pasar por el picker "Elige a cuál". El reparto de R87 sigue siendo cierto, pero le falta una cláusula: **cuando el movimiento apunta a un objeto concreto de una lista, el canónico es la sección y Registrar es el atajo.** La regla no se consolida hasta que la ficha 18 resuelva eso.

Consecuencia obligatoria: **el picker sale en el mismo orden que la lista.** Una meta que se ve primera en Metas no puede verse tercera en el picker.

### D5. El orden vive en infra, no en el dominio

`ordenarBolsasPorFecha(bolsas, campoFecha)` es nueva en `infra/bolsas.js`, y `metas/logic.js` la envuelve como `ordenarMetasPorPlazo()` con el nombre del dominio.

El motivo es D4. La cabecera de `ui/registrar.js` declara que no importa dominios y llega a duplicar su propio `_TIPOS_DEUDA` para no hacerlo, así que el picker no puede llamar a Metas. Con el orden en infra, ninguno de los dos lo define por su cuenta: es el mismo movimiento que `infra/vencimientos.js` hizo con el ritmo de aporte (MC.13b, [ADR 041](041-motor-unico-de-vencimientos.md)) y que `progresoDeBolsa` hizo con el progreso (ARQ.1a). El campo de la fecha se recibe como parámetro porque cada bolsa llama a su fecha distinto: `fechaLimite` en Metas, `fechaObjetivo` en Apartados.

Efecto lateral buscado: si la ficha 10 encuentra que a Reservas también le falta orden, la pieza ya está.

### D6. La fecha de cumplimiento no se pinta, porque no existe

La ficha propuso "Cumplida el 12 de mayo" en la fila compacta. **No se implementa, y no por criterio sino por dato:** `Meta` no tiene `fechaCumplida`, y `montoActual` es un campo cacheado sin ledger de aportes, así que no hay de dónde derivarla. Pintarla exigiría campo nuevo, bump de schema y una migración que no puede rellenar el pasado de nadie.

Es el mismo hueco que `contexto/metas.md` ya declara como insumo de ARQ.1, y esta ficha no lo abre: la fila resuelve G3 con nombre y monto logrado. Si la fecha se quiere, es tarjeta propia con su schema.

### D7. Lo que no se toca

- **La tarjeta entera** (DIS.14 y DIS.19): el objetivo como extremo de la escala en vez de cifra rival, la silueta dentro del arco, la cifra grande siendo lo logrado y no lo que falta, y los tres botones a 44px de la regla R4.
- **El nudge de fecha.** "Ponle una fecha y Finko calcula cuánto guardar por quincena" ocupa el hueco del plan ausente en vez de rellenarlo.
- **"Tu primer aporte arranca el camino"** con la meta en cero, en vez de un "$0" bajo un arco vacío.
- **El plan por frecuencia real de ingreso** ("9 aportes de $256.000 por quincena").
- **El estado vacío** y su frontera con Reservas ("para gastos que ya sabes que vienen, usa Reservas").
- **La ubicación:** hija de Ahorro, a dos toques. Los problemas eran de lista, no de sitio.
- **El nombre.** Cuatro candidatos probados: "Objetivos" es más largo, más frío y ya se usa en la copia del asistente para otra cosa; "Sueños" se lo puede permitir el banner de propósito, no el rótulo de una sección con cifras; "Mis metas" lleva un posesivo que Mis cuentas y Me deben usan por contraste, y acá no hay contra qué contrastar.

---

## Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| Rediseñar la tarjeta y dejar la lista | Es donde no estaba el problema. DIS.14 y DIS.19 están razonadas en el código y la auditoría no encontró con qué rebatirlas |
| Ordenar por porcentaje de avance | Premia a la meta que ya va bien. La pregunta de la sección es cuál necesita el aporte, y eso lo contesta el plazo |
| Dar un selector de orden al usuario | Rompe el orden único por área que fijó la ficha 04, y añade un control para elegir entre criterios que el usuario no tiene por qué comparar |
| Poner las metas sin plazo primero, para empujar a ponerles fecha | Convierte una invitación en una intromisión. Lo que no tiene plan no puede encabezar la lista de lo que sí lo tiene |
| Ocultar o plegar las metas cumplidas | Las esconde en vez de ordenarlas, y reabre lo que DIS.13 arregló: la meta cumplida volvería a no tener pantalla donde verse |
| Dejar la tarjeta a las cumplidas y solo quitarle el arco | Ahorra pixeles sueltos y conserva el problema: la escala, la cifra grande y los dos botones a 44px siguen pidiendo una tarjeta para algo que no pide nada |
| Duplicar la fila de siluetas del carril dentro de la sección | La ficha 04 repartió el trabajo: la portada compara, la sección administra. Duplicarlo daría dos sitios para la misma comparación |
| Marcar "+ Aportar" de la tarjeta como atajo, igual que en Mis cuentas | Sería aplicar R87 al pie de la letra donde su premisa se invierte. El verbo de la tarjeta no es genérico: ya sabe a qué meta va |
| Duplicar el comparador dentro de `ui/registrar.js` | Es exactamente la duplicación que G4 denuncia, ahora en el orden. Dos copias del criterio se desincronizan en el primer cambio |
| Añadir `fechaCumplida` en esta ficha para pintar la fecha en la fila | Mete modelo de datos y bump de schema en una ficha cuyo alcance es la lista, y la migración no podría rellenar el pasado de nadie |

---

## Consecuencias

- **La pregunta de la sección pasa de contestarse por azar a contestarse por urgencia.** Aportar a la meta que toca cuesta dos toques siempre, porque es la primera de la lista por definición; antes eran dos con suerte y tres o cuatro con desplazamiento sin ella.
- **Con dos metas cumplidas se recuperan 476px de lista.** El coste del éxito baja de 290px por meta lograda a 52.
- **Ningún recorrido cambia de longitud y ninguna puerta se mueve.** Las seis siguen siendo seis, y la sección sigue a dos toques.
- **Lo que empeora, y se acepta:** quien tenga memorizada la posición de una meta la pierde una vez, y la meta cumplida deja de enseñar su arco lleno. Esa recompensa la da mejor el momento de cumplirla, y su coste lo pagaba cada visita posterior.
- **`infra/bolsas.js` gana su cuarta pieza compartida** (`ordenarBolsasPorFecha`), con dos lectores desde el primer día: la lista de Metas y el picker de Registrar.
- **Sin cambio de schema y sin dato nuevo.** Las tres cifras de la franja se agregan en tiempo de render sobre `calcularProgreso()`.
- **Regla candidata R89:** toda lista de más de dos elementos tiene un orden, y lo dice. Si la lista no cabe en una pantalla, su primer elemento es la respuesta que la app da, y el orden de llegada de los datos no puede ser esa respuesta. Tres casos: la ficha 04 encontró las cuatro áreas de Ahorro ordenadas de tres formas distintas, la 05 ordenó Por pagar por urgencia con divisores visibles y esta encontró Metas sin orden ninguno. **Con una pregunta de alcance abierta para la ficha 18:** el caso de la 04 es de coherencia entre vistas y los otros dos de ordenación dentro de una vista, y hay que decidir si eso es una regla o dos.
- **R87 no se consolida** hasta que la ficha 18 le escriba la cláusula del objeto concreto.
- **Dependencias que esta decisión abre:** la **ficha 17** hereda el solape de "Metas cumplidas", que vive al final de esta lista y también es una categoría de Logros (`logros/logic.js` declara `metas: { nombre: 'Metas cumplidas' }`); si la 17 decide que el historial es el sitio, la fila compacta es exactamente la que se va. La **ficha 10** es la hermana con la misma anatomía de bolsa: si allá el orden también falta, R89 gana su cuarto caso y D5 ya le dejó la pieza. La **ficha 18** recibe R89 con su pregunta de alcance y la cláusula pendiente de R87.
