# ADR 124 - El niño en el teléfono

**Estado:** Aceptada (2026-11-05). Tanda 1 (la barra, Inicio, la Alcancía y Yo) y tanda 2 (Aprender y la lección) aplicadas; las otras tres se suman como adendas.
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

## Alternativas descartadas

- **Dejar la lista de frascos bajo 400 px (ADR 098 D13).** Era la salida a que los frascos no cabían a 320; con las tejas del tablero y la letra que se achica bajo 360, caben, y se evita pintar la alcancía dos veces.
- **Mostrar los botones de la meta también en Inicio.** El tablero los deja solo en la Alcancía: Inicio dice qué sigue, la Alcancía es donde se decide.
- **Guardar cada movimiento de la mesada como su propia fila en "Lo último".** Para el niño es una sola entrega; tres filas de la misma mesada empujarían fuera lo que él anotó.

## Tandas que siguen

3. Las hojas: Guardé y la meta.
4. La primera vez y "¿Quién usa Finko?".
5. Lo del adulto: Familia en Ajustes, el progreso del niño, la mesada, el premio y agregar un niño.

## Consecuencias

- El tablero de diseño deja de mandar cuando sus cinco tandas estén aplicadas: desde ahí la fuente es este ADR.
- `nino.css` pierde `.knino-mini`, `.knino-acciones`, `.knino-quitar` y el camino en zigzag (`.kcamino`, `.knode`, `.kunit`); gana las tejas, las filas, el botón de línea y la ruta en línea (`.kruta__*`, `.kleccion*`).
- Dos íconos nuevos en el sprite: `i-lock` e `i-clock`, con su archivo en `assets/svg/iconos/simbolos/`.
