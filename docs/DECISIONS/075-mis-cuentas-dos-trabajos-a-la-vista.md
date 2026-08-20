# ADR 075 - Mis cuentas: sus dos trabajos, uno en cada columna

**Estado:** Aceptada. Implementada (iniciativa DSK.6, dos rebanadas). **D1 y D5 quedan acotadas por el [ADR 080](080-mis-cuentas-un-primario-y-lo-informativo-al-pie.md)** (2026-08-20, ficha 06 de la auditoría móvil): D1 conserva las dos columnas de trabajo y su reparto 7 y 5, pero los dos bloques de solo lectura salen de la columna izquierda a una banda propia al pie; D5 conserva que los dos botones de ingreso no son primarios, y cambia su reparto (uno pasa a fila de alta de su lista, el otro a atajo declarado de la teja de Registrar). El resto de este ADR sigue vigente entero.
**Fecha:** 2026-08-18
**Autores:** Esteban (producto), Claude Design (auditoría "Mis cuentas 1920"), Claude Opus 5 (implementación)
**Relación:** hereda de los [ADR 070](070-inicio-centro-de-atencion-en-escritorio.md) a [ADR 074](074-me-deben-adopta-la-anatomia-de-deudas.md) el reparto en columnas de escritorio. Conserva entero el [ADR 035](035-mis-cuentas-v2.md) (Mis cuentas v2: hero, barra de composición, tarjeta de distribución) y el [ADR 051](051-tarjeta-de-credito-producto-integrado.md) D6 (la tarjeta de crédito es solo lectura y no suma al total). No toca lógica: `tesoreria/logic.js` no cambia.

---

## Contexto

Mis cuentas hace **dos trabajos independientes**, y su propio banner de propósito los enuncia con una "y" en medio: dónde está tu dinero, y qué haces con lo que entra. Hoy los dos van apilados en una sola columna de 1376, y eso rompe el segundo:

- **La acción que Inicio anuncia nace fuera de la pantalla.** La tarjeta de distribución empieza más de un pliegue completo por debajo del inicio del contenido: **0px visibles** al abrir. Y no es una pieza cualquiera: es el destino del aviso "Tienes $X sin distribuir · Distribuir" que Inicio muestra en su primera pantalla. El usuario pulsa ahí, llega acá y no ve nada de lo que venía a hacer.
- **Las tarjetas de cuenta se tocan.** `#lista-tesoreria` no declara `gap` y `.cuenta-card` no trae margen: **0px** entre una tarjeta y la siguiente, con dos bordes de 1px pegados en cada junta. Las cuentas se leen como una sola caja subdividida, y como cada una tiene sus acciones, no queda claro a qué cuenta pertenece cada par de botones. **No es un defecto de escritorio: pasa en cualquier ancho.**
- **Más de 1100px entre el nombre de la cuenta y su saldo.** Cuarta aparición del mismo defecto en la auditoría de escritorio, y la peor: Inicio 360, Deudas 1013, Me deben 889, y acá más de 1100. Siempre la misma causa, una fila de móvil sin tope de ancho.
- **Tres primarios en pantalla.** "+ Fijo" y "+ Puntual" son `btn-sm btn-primary` y compiten con el "+ Cuenta" de la barra superior, que es el que declara la acción de la sección. Además "Fijo" y "Puntual" son categorías, no acciones: no dicen qué pasa al pulsarlas.
- **El cupo de una tarjeta de crédito se presenta como un saldo.** El único elemento que dice "esto ya no son tus cuentas" es un `h2` con `sr-only`. El código tiene la decisión tomada (la tarjeta va fuera del total, "no es un activo") y la composición la borra al pintar el cupo con la misma tipografía y en la misma columna que un saldo real.

---

## Decisión

**El umbral es 1440px**, el mismo de Deudas: es donde la columna derecha pasa de 400px, que es lo que necesitan la lista de fuentes y la tarjeta de reparto.

### D1. Dos columnas, un trabajo en cada una: 7 y 5

No es el reparto de Calendario ni el de Deudas. Allá las dos columnas separan **un objeto y su consecuencia** (el mes y el día que abres, el inventario y la estrategia que lo ordena). Acá no hay consecuencia: hay dos trabajos independientes, así que no es primario y dependiente, es **izquierda y derecha**.

"¿Dónde está mi dinero?" toma `span 7` porque es un inventario que crece con cada cuenta nueva; "¿qué hago con lo que entra?" toma `span 5`, que es lo que piden una lista corta de fuentes y una tarjeta de reparto. Las dos empiezan dentro del pliegue, que es lo único que el estado actual no consigue.

**No se parte la sección en dos.** La tentación sería mandar las fuentes de ingreso y la distribución a su propia entrada de navegación, y se descarta: el reparto necesita las cuentas a la vista, porque se distribuye **hacia** cuentas, y separarlas obligaría a ir y volver.

La rejilla se monta sobre **dos envoltorios nuevos** que agrupan lo que ya existe, en `display: contents` bajo 1440px: ahí no son cajas y el orden del DOM queda exactamente como está.

### D2. Las tarjetas de cuenta se separan, en todos los anchos

`#lista-tesoreria` pasa a `flex` con `gap`. Es la corrección más pequeña de la auditoría y la más visible, y no es de escritorio: las tarjetas se tocan también en un teléfono. Es además el único sitio de la app donde tarjetas con borde se apilan sin separación; la lista de ingresos, justo debajo, sí las separa.

### D3. El botón de transferir se dimensiona a su texto

`width: 100%` es la regla de móvil, donde el ancho completo es lo que lo convierte en zona de toque. A 1376 producía una franja con borde de 1376 x 44 para tres palabras, que pesa más que las tarjetas de cuenta sobre las que actúa. Mismo defecto y misma corrección que el botón de lote en Calendario y el de "Abonar" en Deudas. **El patrón 0/1/2 no se toca**: el botón sigue apareciendo solo con dos cuentas activas.

### D4. El rótulo de cada bloque se hace visible en escritorio

"Tus cuentas" y "Tus tarjetas de crédito" son hoy `h2` con `sr-only`, y **estaba bien mientras todo iba apilado**: el `h1` ya nombra la sección y un título visible sonaría redundante. Al partir en dos columnas cada una necesita decir de qué es, así que el motivo por el que estaban ocultos desaparece con la composición.

En el caso de las tarjetas de crédito el rótulo hace más que ordenar: es lo único que separa un cupo de un saldo, y **el cupo de una tarjeta no es dinero tuyo**. Bajo 1440px los dos siguen siendo solo para lectores de pantalla.

### D5. Los dos botones de ingreso pasan a secundarios y dicen la acción

"+ Fijo" y "+ Puntual" dejan de ser primarios: el primario de la sección es el de la barra superior. Y pasan a nombrar lo que hacen: **"Nuevo ingreso fijo"** y **"Registrar ingreso puntual"**, que además aplica bien la regla D3 del lenguaje de acciones (el fijo es una entidad que persiste; el puntual es un hecho que ocurrió).

### D6. El párrafo del 4x1000 se acota a 62ch

149 caracteres en un solo renglón de 882px, muy por encima del rango cómodo. Se corrige solo al pasar a columna, pero se deja escrito porque el bloque podría volver a ancho completo.

### D7. El degradado del hero se mantiene, y conviene decir por qué

En Inicio se retiró un degradado idéntico en estructura ([ADR 070](070-inicio-centro-de-atencion-en-escritorio.md) D4). Acá **no aplica el mismo argumento**: allá el tinte era `--fk-accent`, el verde que en esta app significa "bien", así que un lavado verde detrás del saldo insinuaba un juicio. Acá el tinte es el color de dominio de la sección, el mismo que lleva su teja en la barra superior. No dice "tu saldo es bueno", dice "estás en Mis cuentas". Es identidad, no estado, y retirarlo sería aplicar la forma de una decisión sin su motivo.

### D8. Lo que no se toca

La barra de composición con su resumen en texto y sus tres pasos de opacidad medidos. El tope de tres segmentos con el resto agrupado en "otras". Que el chip de transferencia muestre un solo dato. Que el subtítulo desaparezca en las cuentas de efectivo. Que eliminar vire a rojo solo en hover. Que el ojo enmascare el total y cada saldo con el mismo flag que Inicio. Y que la tarjeta de crédito sea solo lectura, con Deudas como dueña de crear y abonar.

---

## Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| Mosaico bento | los dos bloques no compiten por el ancho: son dos trabajos, y cada uno quiere una columna entera |
| Sección aparte para ingresos y distribución | el reparto se hace **hacia** cuentas y las necesita a la vista; separarlos obliga a ir y volver, y cambia la arquitectura para resolver un problema de composición |
| Reparto 8 y 4, como Calendario y Deudas | ahí hay un primario y un dependiente. Acá son dos trabajos independientes, y la columna derecha necesita más de 4 columnas para su lista y su tarjeta de reparto |
| Retirar el degradado del hero por consistencia con Inicio | el motivo de Inicio era el significado del verde de estado, no el degradado en sí. Acá el tinte es identidad de sección |
| Dejar los rótulos en `sr-only` | con dos columnas visualmente idénticas, el único elemento que distingue un cupo de un saldo sería invisible |

---

## Consecuencias

- El recorrido que Inicio propone ("Tienes $X sin distribuir · Distribuir") deja de aterrizar en una pantalla donde no se ve nada de lo prometido.
- **D2 y D5 se ven también en móvil**: la separación entre tarjetas es un defecto de cualquier ancho, y el nombre de los dos botones es copia. Están declarados así para que la ficha de MOV.1 que toque la sección los herede.
- Los dos envoltorios nuevos son el primer caso del proyecto en que una sección agrupa sus bloques para el reparto de escritorio. Deudas lo resolvió colocando por id sin envoltorios, y acá no alcanza: las dos columnas tienen varios bloques cada una y las filas de la rejilla acoplarían sus alturas.
- El rótulo visible de tarjetas de crédito abre la puerta a que ese bloque crezca (hoy es solo lectura). Si algún día opera, ya tiene dónde colgar sus acciones.
