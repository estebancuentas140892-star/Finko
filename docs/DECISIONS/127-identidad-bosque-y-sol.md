# ADR 127 - Identidad v3 "Bosque y sol" y Tino en la app del adulto

**Estado:** Aceptada (2026-11-05). Pedido en chat: "una transformación visual integral de Finko [...] que luzca y se sienta como una aplicación financiera moderna, atractiva, profesional y competitiva", con Tino en estados vacíos, bienvenidas, explicaciones y celebraciones puntuales, "utilizando exactamente el personaje original". Esteban decidió en chat las tres preguntas que tocaban decisiones escritas: Tino en el adulto con celebraciones puntuales (acota el 094 y el 101), libertad para cambiar la estructura que fijó el 126 y entrega en su copia de trabajo.
**Fecha:** 2026-11-05
**Autores:** Esteban (pedido y decisiones), Claude Opus 5.5 (dirección visual, implementación y redacción)
**Relación:** **Acota** el [ADR 094](094-tino-el-guatin.md) D2 y el [ADR 092](092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) ("el adulto no tiene personaje"): Tino acompaña también al adulto, en los lugares de D6. **Acota** el [ADR 101](101-finko-del-adulto-decide-no-ensena.md) D2: vuelven los avisos de logro, solo los ocho de D9 y sin vitrina. **Cambia** el [ADR 126](126-inicio-del-adulto-en-el-telefono.md) D2 (el saldo sigue sin tarjeta, ahora sobre la banda de marca, D7) y D8 ("Registrar" deja de ser píldora plana, D8 acá). **Cambia** la paleta del [ADR 031](031-identidad-de-color-por-seccion.md) solo en Gastos (coral) y en el lienzo, y el lenguaje del [ADR 033](033-direccion-visual-premium.md) (los heroes dejan el degradado del 16 % por la tarjeta de identidad, D5). **Respeta** el [ADR 103](103-el-isotipo-de-finko.md) (el isotipo no cambia: de él sale la paleta), el [ADR 095](095-tino-en-el-sprite.md) para el niño (su sprite sigue igual) y el [ADR 106](106-un-encabezado-tres-niveles.md) D4 (crear sigue tonal).

---

## Contexto

Después del canvas móvil y de MV2.30 Inicio, Finko quedó ordenado y accesible, pero con el lenguaje de un tablero oscuro genérico: gris azulado, un esmeralda que no era el de la marca, una sola tipografía, tarjetas iguales en todas las secciones y vacíos que se veían como pantallas a medio hacer. El isotipo (ADR 103) trajo una paleta propia (bosque, girasol y coral sobre crema) que la app no usaba en ningún lado, y Tino existía solo para el niño.

Lo que se revisó antes de decidir: las 14 secciones con sus lentes, las hojas (Registrar, formularios, Tu perfil, Más), Inicio del usuario nuevo y del que tiene datos, el perfil del niño, y cuatro cantidades de información (vacío, poca, normal con nombres largos y montos de ocho cifras, y el estado grande de 4.000 gastos) a 360, 375, 390 y 430 px, más escritorio a 1280.

## Decisión

### D1. La paleta sale del isotipo

- **Marca, fija en los dos temas** (`--fk-brand-*`): bosque `#184e40`, girasol `#f3c13c`, coral `#f8765e`, crema `#fbf6ec`. Pintan la banda de Inicio, el sol de Tino y lo que celebra.
- **Lienzo oscuro "tinta de bosque"**: base `#0d1211`, superficie `#151b1a`, elevada `#1e2624`. Unos grados al verde, sin croma que tiña a los dominios.
- **Lienzo claro "papel cálido"**: base `#f8f7f3`, con la misma luminancia que el gris anterior: los `-text` de dominio siguen sobre 4,5:1 (Calendario pasa a `#4a5fe6`, 4,81:1 sobre la base).
- **La acción**: menta `#2bd49a` en oscuro; en claro el primario es el bosque del isotipo (blanco a 9,5:1).
- **Gastos pasa a coral** (`#fb7d5f`, `-text` claro `#c4402a`): es el coral del isotipo, un paso más vivo. El resto de los colores de dominio del 031 no cambia.

### D2. Dos tipografías

Plus Jakarta Sans Variable (OFL-1.1, subconjunto latino de 27 KB, self-hosted) para títulos y cifras; Inter sigue en el cuerpo. `--fk-font-mono`, la fuente de las cifras en 41 sitios, apunta a la display con cifras tabulares. Medido a 22 px: los títulos de sección ocupan lo mismo que con Inter (de 0 a 6 px menos).

### D3. Forma

Radios un paso más redondos (`sm` 8, `md` 12, `lg` 18, `xl` 26, `2xl` 32 nuevo). Los botones son píldoras; el primario tiene cuerpo (filo de luz arriba y sombra de su color) y se hunde al presionarlo. Las lentes son un riel con la activa flotando.

### D4. Profundidad

En oscuro, un filo de luz de 1 px arriba (`--fk-shadow-filo`) en vez de sombras que no se ven; en claro, sombras teñidas de bosque.

### D5. La tarjeta de identidad

El total de Gastos, Por pagar, Calendario, Mis cuentas y Metas es una tarjeta en el tono profundo de su color, igual en los dos temas, como una tarjeta bancaria: el color de la sección mezclado con la tinta (52 % arriba, 30 % abajo) y dos anillos del isotipo en la esquina. Adentro los tokens de texto, borde y superficie se redefinen para la tarjeta, así el ojo, los chips y las barras se adaptan sin regla propia. Contraste medido sobre la parada clara: blanco de 6,9:1 a 8,5:1; secundario al 86 % de 4,8:1 a 5,8:1 sobre el anillo. En escritorio la banda de contexto de Inicio (ADR 070 D6) se viste de bosque con la misma receta.

### D6. Tino en la app del adulto

- **Siempre el dibujo original**: los seis SVG de la carpeta "Personaje Tino" (`tino`, `saluda`, `explica`, `celebra`, `celebra-grande`, `anima`) entran a `assets/tino/` sin cambiar un trazo ni un color; solo se quitó el bloque de metadatos de Illustrator. Se usan como imagen (`htmlTinoSol()`, `infra/ilustraciones.js`). El niño sigue con su sprite (ADR 095).
- **Sobre su sol**: un disco crema fijo en los dos temas, como la teja del isotipo (ADR 103 D2). Así Tino conserva sus colores también en el tema oscuro, sin el pelo aclarado del niño.
- **Dónde aparece, y solo ahí:**

| Lugar | Pose | Cuándo |
|---|---|---|
| Inicio, la guía del usuario nuevo | saluda, con "Hola, soy Tino. Te acompaño en tus primeros pasos." | sin cuentas |
| El vacío de cada sección (banner de propósito, ADR 016) | explica; anima en Metas y Fondo; saluda en Mis cuentas | sin datos en esa sección |
| "¿Cómo distribuir $X?" de Mis cuentas | explica, en lugar del bombillo | con ingreso |
| El aviso que celebra (D9) | celebra o celebra grande | al ocurrir el hito |

Con datos, el banner no se pinta y Tino se va con él. Nunca triste ni enojado (094 D2).

### D7. Inicio: la banda de marca (bajo 1024 px)

El encabezado y el saldo viven sobre el bosque, a sangre y con las esquinas de abajo redondeadas. El saldo sigue sin tarjeta (126 D2): lo que cambia es el fondo sobre el que flota. El número crece a 36-44 px, el avatar pasa a girasol y la ficha de cuentas a cristal. El detalle de cuentas y la guía del usuario nuevo se apoyan sobre la banda como tarjetas.

### D8. La barra de abajo

Cristal (`backdrop-filter`) y la píldora del activo del 126 D8. "Registrar" es un círculo de 56 px que sube 26 px sobre la barra con un anillo del color del fondo: el único elemento flotante de la app. Los avisos, la versión nueva y el aviso de instalar suben lo mismo para no taparlo (el niño conserva su barra).

### D9. Celebraciones puntuales

- **Ocho hitos**: lograr una meta, saldar una deuda, completar el fondo de emergencia y el primer mes completo de registro (celebra grande); el primer ingreso, la primera reserva, el primer límite y la primera meta (celebra).
- **De dónde salen**: los logros que `dominio/logros` ya guarda en silencio (101 D3). Un logro que aparece en `S.logros` y no estaba se celebra una vez en la vida. El primer ingreso y la primera reserva no tienen logro: cuentan cuando su colección pasa de 0 a exactamente 1.
- **Lo que no se celebra**: dos logros o más en un mismo cambio (una puesta al día de datos de antes, una importación), una colección que pasa de 0 a varios (un respaldo, la nube) y cualquier cosa en el perfil del niño. Uno por cambio: si coinciden, habla el más grande.
- **Cómo**: el aviso de siempre (`ui/toast.js`, rol `status`, sin robar el foco) con Tino sobre su sol en lugar del ícono, un filo girasol y 7 s en pantalla. Al arrancar, la foto de los logros se toma antes de `initLogros()`, así el mes que se completó ayer también se celebra al abrir; si un candado o un aviso tapa la pantalla, espera al primer cambio.

### D10. Una capa propia

El lenguaje visual vive en `styles/identidad.css`, una capa (`@layer identidad`) después de `responsive` y antes de `utils`: gana en los dos anchos sin pelear especificidad, y se lee en un archivo en vez de en 20 parches al final de `responsive.css`. Las medidas sin token van literales y comentadas (126 D7).

## Lo que no cambia

La lógica financiera, los cálculos, el almacenamiento (`fk_v1`, schema v48), la estructura de datos, la navegación y los flujos de registro, edición y borrado. No hay secciones ni datos nuevos. El perfil del niño conserva su diseño. Escritorio conserva su maquetación.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Tino del sprite (ADR 095) también en el adulto | el pedido es el dibujo original; el sprite es una conversión con el sombreado simplificado y el pelo aclarado en oscuro |
| Redibujar a Tino más simple para el adulto | el pedido lo prohíbe expresamente |
| Cambiar el tema por defecto a claro o al del sistema | cambia lo que ve cada persona que nunca tocó el tema; queda como decisión aparte |
| Tarjeta de identidad en todas las secciones | Fondo, Reservas, Inversión, Me deben y Límites no tienen un total protagonista; inventarlo sería relleno |
| Celebrar cada registro | convierte el hábito en ruido; el 101 tenía razón en eso |
| Guardar en los datos qué celebraciones ya se mostraron | `S.logros` ya es esa memoria; un campo nuevo pedía migración y sincronización |
| Los cambios al final de `responsive.css`, como el 126 D8 | ese archivo ya pesa 168 KB; la identidad se revisa entera, no por parches |

## Consecuencias

### Positivas

- Una marca reconocible: el isotipo, la banda de Inicio, las tarjetas de identidad y Tino dicen lo mismo.
- Los vacíos se ven intencionales: un personaje, una pregunta y un botón.
- Todo lo visual nuevo está en un archivo y en los tokens: revertirlo es quitar una línea de `main.css` y volver los tokens.

### Negativas / Restricciones

- **Peso**: +27 KB de fuente y +238 KB de dibujos originales (unos 95 KB con gzip), precacheados. Los dibujos solo se piden cuando se ven.
- **Dos mecanismos de Tino**: sprite para el niño, imagen para el adulto. Si llegan poses nuevas (APR.5b), el adulto las recibe como archivo y el niño por el conversor.
- **Las pantallas de arranque de iOS** (`assets/splash/`) siguen con el fondo `#101218`; regenerarlas con `gen-splash.py` queda pendiente.
- **Los tableros de MV2.30 que faltan** (Gastos, Ahorro, Más y listas, Mis cuentas, Ajustes) se aplican sobre esta identidad: su estructura sigue mandando; su color y su tipografía, este ADR.
