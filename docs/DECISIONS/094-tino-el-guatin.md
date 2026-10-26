# ADR 094 - Tino, el guatín: el personaje del perfil niño

**Estado:** Aceptada (2026-10-25). Decisión de Esteban en chat, con sus bocetos de Tino; los dibujos finales llegan después.
**Fecha:** 2026-10-25
**Autores:** Esteban (decisión, nombre y bocetos), Claude Opus 5.5 (redacción y pedido de ilustraciones)
**Relación:** **acota el [ADR 093](093-perfiles-en-el-dispositivo-y-modo-nino.md) D7** (Frai, el frailejón) y su duda resuelta por defecto "¿Frailejón como personaje? sí, con nombre provisional". El resto del 093 no cambia. Conserva el [ADR 092](092-aprende-y-aplicalo-la-capa-de-aprendizaje.md): el adulto sigue sin personaje.

---

## Contexto

El 093 D7 eligió un frailejón con el nombre provisional "Frai": atrapa el agua de la niebla, la guarda para cuando no llueve y crece despacio. Enseñaba tres ideas: guardar, tener reserva y esperar.

El 2026-10-25 Esteban decidió cambiarlo por un **guatín** (también llamado ñeque), un roedor autóctono de Colombia que entierra semillas para las épocas de escasez y a veces olvida dónde las dejó: de esas semillas nacen árboles. Entregó dos tableros de bocetos a color, con unas cuarenta escenas.

Hoy el personaje aparece en siete lugares del perfil niño (Inicio, las pantallas de idea de cada lección, la ruta, la alcancía vacía, la respuesta revisada y el cierre de la lección y de la unidad), son cuatro SVG en el sprite (`il-frai-*`), tiene un token propio (`--fk-kid-frai`) y su metáfora estaba escrita en tres lecciones (k1-l3, k4-l1 y k7-l1).

## Decisión

### D1. El personaje es Tino, un guatín

- **Se llama Tino y se presenta como "Tino, un guatín".** Un nombre propio crea vínculo; el de la especie no. "Tener tino" es decidir con buen juicio, que es lo que enseña la ruta. Sale de guatín, tiene dos sílabas y no lleva tilde.
- **Su metáfora cubre casi toda la ruta del niño**, donde la del frailejón cubría dos ideas: guardar semillas para la escasez es ahorrar y tener reserva (k3, k4, k7); la semilla enterrada se vuelve un árbol que da más semillas, que es el interés que crece (k8); el bosque que siembra alimenta a otros, que es compartir (k6).
- **La historia se cuenta como "sembrar", no como "olvidar".** Perder la cuenta del dinero es lo contrario de lo que enseña la ruta; el olvido queda como dato curioso, nunca como lección.
- **La semilla reemplaza a la gota de agua** como su punto de valor, el mismo papel que la chispa tiene en los íconos de Finko.

### D2. Lo que no cambia del 093 D7

- **Solo en el perfil niño.** El adulto no tiene personaje (092).
- **Nunca triste, decepcionado ni enojado.** Tras un error, anima. Sin rojo ni gestos de castigo: ninguna señal de prohibido.
- **Las cuatro poses base y sus lugares**: saluda, explica, celebra y anima.
- **La alcancía son los tres frascos.** Si Tino aparece con una alcancía, es el frasco, nunca un cerdito (el 093 ya lo descartó por genérico).

### D3. Tino tiene sus colores, cada uno por rol

- **Acota el "funciona en un solo color" del 093 D7.** Tino es a color (pelo café, panza beige, orejas rosadas, manchas amarillas) porque las manchas y el contraste de la panza son lo que lo hacen reconocible; monocromo deja de ser un guatín.
- **Cada color es un token de rol** (`--fk-tino-*`) con su valor en los dos temas y contraste de 3:1 como gráfico contra el lienzo, medido por test como el resto de los tokens del niño. Si el café no llega en el tema oscuro, se aclara. Nunca un color absoluto en el SVG (README de `assets/svg/`).
- **El tono de cada pose ya no lo pone el color del personaje** (el sol al celebrar, el azul de "casi" al animar): lo pone el panel que lo rodea, que ya tiene ese color. `--fk-kid-frai` se retira con el reemplazo.

### D4. Formato de los dibujos

- **SVG vectorial**, lienzo de 120 por 120, fondo transparente y sin texto: la tarjeta y las palabras las pone la app.
- **Formas planas**, sin degradados, sombras difusas ni texturas. Legible a 72 px, el tamaño más chico en que aparece.
- **Mirando a la derecha**: en las lecciones el globo de texto va a su derecha.
- **Entran por el pipeline `il-`** (`scripts/sync-sprite.py`: solo `path`, `circle`, `rect` y `line`, color por rol). Esteban entrega los SVG con sus colores; la integración los convierte a tokens.

### D5. Las poses, en dos rondas

Ronda 1, para reemplazar a Frai (APR.5a):

| Pose | Dónde aparece | Tamaño |
|---|---|---|
| Saluda | Inicio del niño | 96 px |
| Explica | Pantallas de idea de cada lección, la ruta junto a la lección de hoy, la alcancía vacía | 72 a 112 px |
| Celebra | Respuesta correcta y lección lista | 80 a 112 px |
| Celebra grande (nueva) | Unidad terminada, junto a la insignia, y los hitos | 128 px |
| Anima | Después de un error, en el panel de "¡Casi!" | 80 px |

Ronda 2, para lo que el handoff dejó sin pieza y para las lecciones (APR.5b):

| Pose | Para qué |
|---|---|
| Sembrar | Tino entierra una semilla y al lado brota una planta: el premio por ahorrar ("¿Por qué crece?") y las unidades 4 y 8 |
| Compartir | Tino le da una semilla a otro animal: el frasco Compartir y la unidad 6 |
| Reserva | La hoja como paraguas bajo la lluvia: la unidad 7 |
| Pensando | Las tres preguntas de ubicación y crear una meta |
| Ruta terminada | La bandera en la cima: el hito de terminar la ruta |
| Meta cumplida | El hito de completar su meta |

**Quedan fuera** de los bocetos: triste, enojo, el error con nube de lluvia, "evitar" con la señal de prohibido, el cerdito y las escenas del adulto (registrar o ver gastos, recordatorio, cargando).

### D6. La transición, hasta que lleguen los dibujos

- **Los tres textos con la metáfora cambian ya, en tercera persona** ("el guatín guarda semillas para cuando no hay frutos"): son ciertos con el dibujo de hoy y con el de Tino. Tino se presenta por su nombre con APR.5a, cuando su dibujo esté en pantalla.
- **Ningún texto llama Frai al dibujo actual.** La única etiqueta para lector de pantalla que lo nombraba ("Frai celebra junto a tu nueva insignia") pasa a "Celebramos tu nueva insignia".
- **El código conserva** `htmlFrai()`, `POSES_FRAI`, `il-frai-*`, `.frai` y `--fk-kid-frai` hasta APR.5a, que los renombra junto con el cambio de dibujo: renombrar sin dibujo nuevo es churn.

## Alternativas descartadas

- **Conservar el frailejón.** Su metáfora cubre guardar y esperar, pero no que lo guardado se multiplica (crece un centímetro al año, siempre igual) ni compartir. Y una planta da pocas poses: una roseta de hojas no saluda ni celebra, y se lee mal en tamaño pequeño.
- **Llamarlo "Guatín".** Es el nombre de la especie, no de un personaje; lleva tilde, y en otras regiones al mismo animal le dicen ñeque.
- **Tino en un solo color, como Frai.** Pierde las manchas y la panza que lo hacen un guatín.
- **Usar las poses de tristeza o de error con lluvia.** Contradicen el 093 D7, que no cambia: el niño equivocado recibe ánimo, no un personaje triste.

## Consecuencias

### Positivas

- Una sola historia (guardar, sembrar, crecer, compartir) sostiene las ocho unidades del niño.
- Un animal autóctono y expresivo: once poses posibles frente a cuatro.

### Negativas / Restricciones

- **Cuatro tokens de color nuevos**, con contraste medido en dos temas, donde Frai usaba uno.
- **Más peso en el sprite:** un personaje a color pesa más que uno monocromo. Cada pose debe quedarse en unos 3 KB; el pipeline avisa si una se pasa de los elementos recomendados.
- **Mientras llegan los dibujos**, tres pantallas de idea hablan del guatín con el frailejón al lado. Se acepta porque dura hasta APR.5a y ningún texto le pone nombre al dibujo.

## Rebanadas

| Rebanada | Qué entrega | Depende de |
|---|---|---|
| APR.5a | Ronda 1 en el sprite (`il-tino-*`), tokens `--fk-tino-*` con su contraste, renombre del código (`htmlTino()`, `POSES_TINO`, `.tino`), "celebra grande" en la unidad terminada y Tino que se presenta | dibujos de la ronda 1 |
| APR.5b | Ronda 2 y sus usos: sembrar, compartir, reserva y pensando en sus pantallas; los hitos del niño (meta cumplida y ruta terminada, con el confeti que ya existe), que el handoff pedía y no se construyeron | dibujos de la ronda 2, APR.5a |
