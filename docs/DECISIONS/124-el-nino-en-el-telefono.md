# ADR 124 - El niño en el teléfono

**Estado:** Aceptada (2026-11-05). Tandas 1 (la barra, Inicio, la Alcancía y Yo), 2 (Aprender y la lección), 3 (las hojas) y 4 (la primera vez y "¿Quién usa Finko?") aplicadas; la quinta se suma como adenda.
**Fecha:** 2026-11-05
**Autores:** Esteban (diseño y decisión), Claude Opus 5.5 (auditoría, implementación y redacción)
**Relación:** **Aplica** el tablero "Finko móvil · rediseño" del perfil niño (Claude Design, 2026-11-05), que compara cada pantalla de hoy con su propuesta. **Conserva** el [ADR 093](093-perfiles-en-el-dispositivo-y-modo-nino.md) (cuatro destinos, la alcancía solo anota, la voz del niño) y el [ADR 094](094-tino-el-guatin.md) (Tino). **Supera** el [ADR 098](098-finko-movil-2-primera-entrega.md) D13 en un punto: los frascos de Inicio ya no van en filas bajo 400 px, van en tejas a todo ancho (D2).

---

## Contexto

La app del niño se diseñó en la Fase 3 de APR, antes del canvas móvil del adulto. El tablero nuevo la pasa al mismo lenguaje del teléfono: tarjetas de borde fino, la acción principal sola y grande, el total junto al título y las secciones con su título fuera de la tarjeta. Nada cambia de fondo: mismos datos, mismas reglas, mismos tokens `.kid` (el tablero usa exactamente los de `themes.css`).

Antes de esta tanda, la app del niño era igual a las capturas "hoy" del tablero: ninguna propuesta estaba aplicada.

## Decisión

### D1. La barra, el saludo y el espacio

- **Barra:** el destino actual lleva una píldora detrás del ícono (64 × 36 px), no detrás de todo el botón; el nombre va en el color primario. La barra es un tono más oscuro que la tarjeta.
- **"Cambiar"** lleva su nombre al lado del ícono.
- **El globo de Tino** pierde el borde y gana un piquito hacia él.
- **Espacio:** 16 px a los lados y entre tarjetas; las tarjetas comunes llevan borde de 1 px y las que piden atención (la lección, el premio, la meta alcanzada), de 2 px y con color.

### D2. Inicio

- **La lección que sigue:** chip de acento ("Unidad 3 · lección 2 de 3", o "Tu primera lección"), el título, un reloj con la duración y un solo botón. Si el niño dejó la lección a medias, dice "Ibas en el paso N" y el botón es "Seguir donde ibas".
- **La alcancía:** el total junto al título y los tres frascos en tejas de su color, una sola vez y en todos los anchos (antes eran una lista en el teléfono y los frascos en escritorio). Sin dinero, "Tu alcancía" invita al primer "Guardé dinero".
- **La meta** en Inicio solo se mira: "Tu meta", lo que tiene de lo que cuesta, la barra y lo que falta. Sus botones viven en la Alcancía.
- **Meta alcanzada:** Tino celebra arriba, en lugar del saludo: "¡Lo lograste! Ya tienes para tu meta", cuánto cuesta y cuánto tiene, y "Ya lo compré".
- **"Cambiar el plan"** abre la misma pantalla de la meta con lo que ya tiene; guardar cambia esa meta, no crea otra.

### D3. La Alcancía

- Cada frasco con su botón debajo: Guardé, Gasté y Compartí, sin ícono y en el color del frasco. "Mover dinero entre frascos" pasa a botón de línea.
- La meta trae la fecha ("para el 26 de marzo") y dos botones: "Cambiar el plan" y "Quitar la meta"; alcanzada, "Ya lo compré".
- **"Lo último que anotaste":** las cuatro anotaciones más nuevas, una fila por hecho. La mesada repartida en los tres frascos es una sola fila ("Mesada del sábado · En tus 3 frascos") y mover entre frascos también ("De Gastar a Ahorrar"). La fecha es "miércoles 11"; de otro mes, "lunes 2 de noviembre". Lo que entra va en verde con "+"; lo que sale, con "−". La lógica vive en `ultimasAnotaciones()` (`nino/logic.js`, sin DOM).
- **"Tu mesada":** "$10.000 cada sábado" y "La próxima llega el sábado 14 de noviembre"; cada 15 días, "Llega los viernes. La próxima: viernes 27 de noviembre". El reparto en tejas.
- **El premio** con Tino y el borde del sol: "Mamá te suma $1 por cada $10 que guardas."
- **Sin nada anotado todavía:** Tino dice "Tu dinero va en tres frascos.", cada frasco dice para qué es, un solo "Guardé dinero" y "¿Quieres algo especial? Primero guarda, después creas tu meta.". Si el niño ya anotó algo y gastó todo, la Alcancía es la de siempre, con sus frascos en $0.

### D4. Yo

El dibujo grande y centrado, el nombre y la edad; dos datos ("2 de 8 unidades listas", "5 semanas aprendiendo"); "Mis insignias" con su cuenta y las ocho en dos columnas. La insignia ganada lleva el ícono de su unidad en lugar de la estrella (el sprite expone `--fk-insignia-estrella`; solo Yo la apaga). La que falta muestra un candado y el nombre de la unidad, no su número.

### D5. Lo que se ajusta al pasar del tablero a la app

| El tablero dice | La app dice | Por qué |
|---|---|---|
| "Ya **los** compré", "Cuest**an**" | "Ya lo compré", "Cuesta" | el tablero concordaba con "audífonos"; la app no sabe el género ni el número de lo que el niño escribe |
| "¡Vas muy bien! Hoy sigue tu meta." | "¡Vas muy bien! Sigue tu lección de hoy." | la frase del tablero dependía de la lección del ejemplo |
| "Ibas en la pregunta 2" | "Ibas en el paso 2" | la lección guarda el paso, no la pregunta |
| "Cambiar de perfil" en el teléfono propio del niño | no se muestra | ese teléfono no tiene adulto (NUBE.3, `.kid-propio`) |
| "¡Tu patineta es una meta!" junto a la lección | "¡Vamos con la lección N!" o "¡Te falta una para la insignia!" | la primera dependía del ejemplo; la regla sirve para las 24 lecciones |
| "Úsalo de verdad" con "Lo necesito" y "Lo quiero" | la pregunta sola, y "Ver mi alcancía" | las preguntas de "Úsalo" son abiertas ("¿Para qué quieres ahorrar?") y no traen opciones; dárselas es contenido y espera la revisión pedagógica (APR.3f) |

Bajo 360 px los nombres de los frascos pierden su ícono y se achican para no partirse.

### D6. Aprender (tanda 2)

- **Cabecera:** "Aprender", "Llevas 2 de 8 unidades" y una barra de avance.
- **La ruta es una línea punteada**, no un camino en zigzag. Cada unidad terminada (o sabida por la ubicación) es un círculo verde con su chulo y se repasa desde su primera lección. Las que vienen llevan su ícono en un círculo gris.
- **La unidad actual va abierta** en una tarjeta con el borde de su color: sus lecciones en filas (la lista se repasa, la de ahora lleva su número y "Ahora · 3 minutos", las que vienen un candado y "Después"), Tino con un globo corto y un solo botón: "Empezar la lección", o "Seguir donde ibas" si la dejó a medias (la fila lo dice: "· ibas aquí").
- **Lo que dice Tino:** "¡Te falta una para la insignia!" cuando queda una; si no, "¡Vamos con la lección N!".

### D7. La lección (tanda 2)

- Barra de avance de 10 px, la pregunta en 28 px y "Elige una" en minúscula. Las opciones miden 68 px y su letra va en una teja; la correcta se marca con borde de 3 px y "Esta era" en verde lleno; la elegida, en el azul de la pista.
- Mientras no responde, el pie dice "Toca la que creas. No hay apuro.".
- **"¡Casi!" y "¡Así es!"** dejan de ser un panel pegado abajo: son una tarjeta que flota, con el color de lo que dicen y Tino al lado.
- **La unidad terminada:** Tino grande junto a la insignia con el ícono de la unidad, "¡Nueva insignia!" en el color del sol, "Terminaste la unidad 3" y lo que aprendió. "Úsalo de verdad" va en una tarjeta con el borde del sol y en una sola frase ("En Gastar tienes $6.500. ¿Es para algo que necesitas o que quieres?").
- **El pie:** "Ver mi alcancía" y "Volver al inicio" (antes, "Volver a la ruta").

### D8. Las hojas: anotar y la meta (tanda 3)

- **Anotar** (Guardé, Gasté, Compartí, mover): el título a la par de la ✕, sin filete; el monto en una caja de 72 px con letra de 36; "Escríbelo o toca un billete." y cuatro billetes en dos columnas, con el elegido marcado; el frasco en tejas con su dibujo; la nota dice "(si quieres)"; el botón dice cuánto: "Guardar $5.000". El billete marcado y el botón siguen a lo que hay en el campo, se escriba o se toque.
- **La meta** es una pantalla de paso: sin la barra de abajo en el teléfono, con su flecha para volver. "Tu nueva meta" (o "Cambiar tu meta"), los dibujos en cuadros, "¿Cómo se llama?", el precio en grande y **tres cantidades por semana** ($2.000, $5.000 y $10.000) en vez de subir y bajar de a $1.000. Si la meta ya guardaba otra cantidad, esa cantidad entra como cuarta opción, marcada. Tino responde "Lo tendrás en 19 semanas. ¡Para el 26 de marzo!" y debajo, "Ya cuentas con los $26.200 que tienes en Ahorrar.".
- **Capas de CSS:** la ✕ de la hoja vive en la capa `modals` y su ajuste del teléfono en `responsive`, y el campo desnudo no dibuja el anillo de foco de `a11y` porque su caja ya lo marca: desde `components` no se les gana.

### D9. La primera vez y "¿Quién usa Finko?" (tanda 4)

- **La piel del niño sale de su app:** `.kid-piel` en un contenedor pide los mismos tokens de `body.kid` (themes.css declara los dos selectores en el mismo bloque, oscuro y claro). La llevan el overlay de "¿Quién usa Finko?" siempre y el del onboarding mientras está en la primera pantalla o en el camino del niño; el camino del adulto vuelve al diálogo de siempre. Con la piel, el overlay ocupa toda la pantalla, sin agarradera ni bordes.
- **"¿Quién usa Finko?":** Tino pregunta "¡Hola! ¿Quién va a usar Finko?", los niños van primero y el adulto al final ("Adulto, con PIN"); "Agregar un niño · pide tu PIN" es una fila punteada de todo el ancho y el pie dice que todo se queda en el teléfono.
- **La primera pantalla:** el isotipo, "Te damos la bienvenida a Finko", dos tarjetas grandes (la del niño con Tino) y "Tengo un código de mi familia" en el color primario.
- **El camino del niño:** "Volver" y tres puntos de avance arriba; Tino hace la pregunta de cada pantalla ("¡Hola! Soy Tino. ¿Cómo te llamas?", "Elige tu dibujo, Juanita. Así te reconoces."); las edades en una grilla de tres por dos; los dibujos en cuadros de su color; "Antes de empezar" con Tino grande, "Úsalo con alguien de tu familia." y una nota: "Todo se queda en este teléfono. No necesitas correo ni internet.". El botón principal va al pie.
- **Capas:** el marco a pantalla completa vive en `responsive.css` y el contenido en `modals.css`, donde están las piezas del onboarding.

## Alternativas descartadas

- **Dejar la lista de frascos bajo 400 px (ADR 098 D13).** Era la salida a que los frascos no cabían a 320; con las tejas del tablero y la letra que se achica bajo 360, caben, y se evita pintar la alcancía dos veces.
- **Mostrar los botones de la meta también en Inicio.** El tablero los deja solo en la Alcancía: Inicio dice qué sigue, la Alcancía es donde se decide.
- **Guardar cada movimiento de la mesada como su propia fila en "Lo último".** Para el niño es una sola entrega; tres filas de la misma mesada empujarían fuera lo que él anotó.

## Tandas que siguen

5. Lo del adulto: Familia en Ajustes, el progreso del niño, la mesada, el premio y agregar un niño.

## Consecuencias

- El tablero de diseño deja de mandar cuando sus cinco tandas estén aplicadas: desde ahí la fuente es este ADR.
- `nino.css` pierde `.knino-mini`, `.knino-acciones`, `.knino-quitar` y el camino en zigzag (`.kcamino`, `.knode`, `.kunit`); gana las tejas, las filas, el botón de línea y la ruta en línea (`.kruta__*`, `.kleccion*`).
- Dos íconos nuevos en el sprite: `i-lock` e `i-clock`, con su archivo en `assets/svg/iconos/simbolos/`.
- La pantalla de la meta pierde el paso de $1.000 por semana: quien quiera otra cantidad cambia el precio o la meta (D8).
