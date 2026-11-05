# ADR 128 - Los frascos se llenan con el café de Tino

**Estado:** Aceptada (2026-11-05). Pedido en chat: "¿podemos hacer que el frasco que se llena de un líquido en la app, en lugar de ese líquido, se llene con los cafés de Tino?".
**Fecha:** 2026-11-05
**Autores:** Esteban (pedido), Claude Opus 5.5 (dibujo del grano, implementación y redacción)
**Relación:** **Aplica** el [ADR 094](094-tino-el-guatin.md) D1 ("la semilla reemplaza a la gota de agua como su punto de valor") a los frascos, que seguían llenándose de un líquido. **Conserva** el [ADR 093](093-perfiles-en-el-dispositivo-y-modo-nino.md) D5 (tres frascos, cada uno con su color, su nombre y su monto, R49) y la R60 (cada frasco se llena contra su propia meta). Usa el color del grano del dibujo original de Tino, como el [ADR 127](127-identidad-bosque-y-sol.md) D6 usa sus dibujos.

---

## Contexto

Los tres frascos de la alcancía del niño (Ahorrar, Gastar y Compartir) se dibujaban con un relleno plano de su color, que se lee como agua. Tino, en "celebra grande", levanta un grano de café: es su punto de valor desde el 094, y es colombiano.

## Decisión

### D1. Un grano en la biblioteca

`assets/svg/ilustraciones/cafe.svg` entra al sprite como `il-cafe` por el pipeline de siempre (`scripts/sync-sprite.py`): retícula de 20 por 14, el cuerpo, la hendidura y un brillo, en tres tokens fijos en los dos temas (`--fk-cafe-grano` `#7a3b2a`, `--fk-cafe-contorno` `#3d1a0b`, `--fk-cafe-brillo` `#a8624a`) tomados del grano del dibujo original. Fijos porque el grano va siempre sobre el tinte del frasco, nunca sobre el lienzo.

### D2. El frasco se llena de granos

- `GRANOS_FRASCO`: veinte granos en ocho filas trabadas (tres y dos), cada uno con su giro, dentro del vidrio.
- `granosFrasco(proporcion)` devuelve los que caben hasta el nivel: entra cada grano cuyo centro queda bajo la superficie, con medio grano de holgura. Con el llenado mínimo (5 %) ya se ve la primera fila; lleno, los veinte. Más dinero nunca muestra menos granos.
- El color del frasco queda en un tinte al 55 % detrás de los granos (`.frasco__tinte`): sigue diciendo cuál es cada frasco.
- `rellenoFrasco()` y `llenadoFrasco()` no cambian: el nivel se calcula igual que antes.

### D3. El pipeline del sprite vuelve a correr

- El validador de `sync-sprite.py` rechazaba un respaldo de rol anidado (`var(--fk-a, var(--fk-b))`) y con eso `il-insignia`, que ya estaba en el sprite, dejaba el sync parado para cualquier archivo nuevo. La regla acepta ahora ese respaldo.
- Un bloque `<metadata>` se ignora al validar (`sin_metadatos()`) y al comparar el sprite con la biblioteca (`sprite-sync.test.js`). No dibuja nada, y lo agregan Illustrator y las herramientas que estampan la procedencia de un archivo al copiarlo (C2PA): el `cafe.svg` de la copia de trabajo llegó así. El archivo no se reescribe.
- El resto del sprite no cambia.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Granos del color de cada frasco | el café verde o rosado deja de ser el de Tino |
| Granos sin tinte detrás | los tres frascos quedan iguales y el color deja de ayudar a distinguirlos |
| Recortar los granos con un `clipPath` en la superficie | los granos cortados se leen como un líquido con textura; uno entero por arriba se lee como un montón |
| El grano recortado del dibujo de Tino | el dibujo es una pieza entera (127 D6); el grano de la biblioteca es un dibujo propio con sus colores |

## Consecuencias

- El frasco dice "aquí guardo mis semillas" en vez de "aquí hay agua", que es la historia de la ruta (094 D1).
- Hasta veinte `<use>` por frasco: tres frascos en pantalla son sesenta, sin costo medible.
- Los frascos de 32 px (las opciones de "Mover dinero") muestran los granos como textura; desde 44 px se leen como granos.
