# ADR 103 - El isotipo de Finko

**Estado:** Aceptada (2026-10-29). Pedido en chat: "te voy a pasar el nuevo logo de Finko para que lo integres [...] quiero que este sea el diseño del logo", con el archivo `logo-finko.svg` (carpeta "Personaje Tino" del usuario, fuera del repo).
**Fecha:** 2026-10-29
**Autores:** Esteban (diseño del isotipo), Claude Opus 5.5 (implementación y redacción)
**Relación:** **cambia** el [ADR 040](040-navegacion-v2-visual.md) D4 (la marca "F" con el degradado de acento, que ya había reemplazado el 💚 de marca del [ADR 025](025-logotipos-de-marca-y-tejas.md) D6). Abre la carpeta `assets/svg/identidad/` que el [ADR 026](026-biblioteca-de-recursos-graficos.md) dejó reservada. **Respeta** el criterio de teja de marca del ADR 025 (no cambia con el tema), la regla R31 (la app se nombra en Inicio móvil) y el ADN 11 (lenguaje).

---

## Contexto

| Dónde | Antes |
|---|---|
| Barra lateral, Inicio móvil, bienvenida (tres pantallas) | una "F" tipográfica sobre una teja con el degradado verde de acento |
| Favicon, íconos PWA, ícono de iOS | tres barras verdes crecientes, dibujadas a mano en `scripts/gen-icons.py` |
| Pantallas de arranque de iOS | las mismas barras, con el lema "Tu plata bajo control", que choca con el ADN 11 ("dinero", no "plata") |

El isotipo nuevo es una "F" de tres piezas: verde bosque `#184e40`, amarillo `#f3c13c` y coral `#f8765e`. Sobre el lienzo oscuro el verde casi no se ve (1,98:1 contra `#101218`), y sobre blanco el amarillo tampoco (1,6:1).

## Decisión

### D1. Una sola fuente: `assets/svg/identidad/isotipo.svg`

El archivo del usuario entra a la biblioteca sin cambiar un trazo: solo se limpia el envoltorio de Illustrator y se marca `data-fullcolor="true"`. `scripts/sync-sprite.py` conecta `identidad/` con el prefijo `id-`, su propio viewBox y la obligación de ir a color. En el sprite queda `id-isotipo`.

### D2. El isotipo va en una teja de fondo fijo

`--fk-marca-fondo` (`#fbf6ec`), igual en los dos temas, con un filete interior de `--fk-border-subtle`. La teja reemplaza a la "F" en la barra lateral, en Inicio móvil y en las tres pantallas de bienvenida (helper `isotipo()` de `infra/icons.js`). El isotipo ocupa el 64 % del alto de la teja.

### D3. Los íconos se derivan del SVG

`scripts/isotipo.py` lee el SVG y lo dibuja con Pillow. De ahí salen:

- `gen-icons.py`: los PNG de 512, 192 y 180, con la teja a sangre y el isotipo al 62 % del alto, dentro de la zona segura de los íconos adaptables, y el favicon vectorial.
- `gen-splash.py`: la teja sobre el fondo oscuro, el nombre en el color de texto y el lema "Tu dinero bajo control".

### D4. Lo que no cambia

El verde de acento de la app (botones, navegación activa, el nombre "Finko" de la barra lateral), el avatar y la app del niño. La bienvenida "¿Quién usa Finko?" es compartida y lleva el isotipo.

## Alternativas descartadas

- **El isotipo sin teja.** En el tema oscuro el verde se pierde y la "F" se lee como dos piezas sueltas.
- **Aclarar el verde en el tema oscuro.** Cambia el diseño que se entregó; la teja conserva los tres colores tal cual.
- **Rasterizar con Playwright o cairosvg.** Pillow ya genera los íconos; aproximar las curvas con segmentos no suma dependencias.

## Consecuencias

### Positivas

- La marca vive en un archivo: cambiar el isotipo es reemplazar ese SVG y correr `sync-sprite.py`, `gen-icons.py` y `gen-splash.py`.
- La pantalla de arranque deja de decir "plata".

### Negativas / Restricciones

- La teja clara es la única superficie clara del encabezado en el tema oscuro. Es a propósito: es la marca.
- Un teléfono que ya instaló Finko puede tardar en mostrar el ícono nuevo. En iOS solo cambia al volver a agregarla a la pantalla de inicio.
- En los PNG cada curva se aproxima con 24 segmentos. Con el supersampling no se nota, pero el favicon vectorial es el único trazo exacto.
