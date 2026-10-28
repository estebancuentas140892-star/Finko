# ADR 095 - Tino en el sprite: peso, colores por rol y tema oscuro

**Estado:** Aceptada (2026-10-27). Decisión en chat sobre el borrador de conversión de los dibujos de la ronda 1 ("como más lo recomiendes": la recomendación era dejar a Tino en el sprite de siempre con unos 12 KB por pose).
**Fecha:** 2026-10-27
**Autores:** Linay (decisión y dibujos de la ronda 1), Claude Opus 5.5 (conversión, medición y redacción)
**Relación:** **acota el [ADR 094](094-tino-el-guatin.md) D3 y D4**: cuántos colores tiene Tino, cómo se mide su contraste y cuánto pesa cada pose. D1, D2, D5 y D6 del 094 no cambian. Conserva el [ADR 026](026-biblioteca-de-recursos-graficos.md): Tino entra por el pipeline `il-` al sprite de `index.html`, como el resto de los dibujos.

---

## Contexto

Los dibujos de la ronda 1 (saluda, explica, celebra, celebra grande y anima) llegaron el 2026-10-27 como export de Image Trace de Illustrator: 34 a 52 KB por pose, 60 a 90 colores por archivo (el sombreado del calco), un lienzo vertical de unos 650 por 1000 y clases, `<style>` y `transform`, que `scripts/sync-sprite.py` rechaza. El 094 D4 pedía unos 3 KB por pose y el D3, cuatro colores.

Se convirtieron sin redibujar: lienzo de 120 por 120 con la misma escala para las cinco poses, colores agrupados por rol, poda de las formas que no cambian el dibujo y curvas reajustadas con una tolerancia de 0,5 en la retícula de 120 (medio píxel a 128 px, el tamaño más grande en que aparece). En los tamaños de la app (72 a 128 px) se ven casi iguales al original. Con unas 80 formas por pose, el piso medido está entre 9 y 11 KB.

## Decisión

### D1. Unos 12 KB por pose, en el sprite de siempre

- **La ronda 1 pesa de 11 a 15,5 KB por pose**: 61 KB en total, 22,5 KB con gzip. Con Frai fuera del sprite, `index.html` pasa de 189 KB a 241 KB (de 47 KB a 66 KB con gzip).
- **Tope de 16 KB por pose, medido por test.** Una pose nueva que lo pase se simplifica antes de entrar.
- **Sigue en el sprite de `index.html`** (026), la convención de todos los `il-`: un solo mecanismo, un solo precache y el mismo test byte a byte.

### D2. Once roles de color, no cuatro

- **Los roles**: contorno, cuero (el bolso), pelo, sombra (del pelo), panza, claro (hocico y parche del bolso), rosado (orejas y boca), amarillo (lápiz y flecos), rojo y azul (la bandera del bolso) y blanco (ojos). Cada uno es un token `--fk-tino-<rol>`; ningún color absoluto en el SVG (README de `assets/svg/`).
- **Sin manchas amarillas.** El dibujo final no las tiene, y el guatín real tampoco. Lo que lo hace reconocible es la silueta, la panza clara, las orejas rosadas y el bolso con la bandera.
- **El rojo de la bandera y de la boca es parte del personaje**, no una señal: el "sin rojo" del 094 D2 sigue rigiendo el panel de "¡Casi!".

### D3. El contraste se mide sobre el pelo, y en el tema oscuro se aclara

- **El pelo dibuja la silueta**: es el que pasa 3:1 como gráfico contra el lienzo y contra la tarjeta en los dos temas, medido por test.
- **El contorno no se mide.** Dibuja también ojos, dedos y bolso; sobre el lienzo oscuro queda en 1,2:1 y aclararlo invertiría la cara.
- **En el tema oscuro el pelo pasa a `#a65a2a`** (3,5:1 sobre el lienzo, 3,1:1 sobre la tarjeta) **y la sombra a `#8c4a24`**. Los otros nueve roles valen lo mismo en los dos temas.

### D4. La conversión vive junto a los dibujos fuente

El conversor (Python y Playwright) queda en la carpeta del personaje, junto a los exports de Illustrator, fuera del repo; se vuelve a correr para la ronda 2 (APR.5b). Al repo solo entran los SVG ya convertidos, por el pipeline `il-` de siempre.

## Alternativas descartadas

- **Redibujar a Tino simplificado**, con formas planas a mano (3 a 5 KB por pose). Cumplía el 094 D4, pero pedía rehacer cinco dibujos que ya funcionan para ahorrar unos 40 KB.
- **Un sprite aparte que solo cargue el perfil niño.** El adulto no pagaría el peso, pero abre un segundo mecanismo de sprite, con su propio precache y su propio test, por 22 KB comprimidos.
- **Una paleta mínima de 8 roles.** El bolso se vuelve una mancha negra y se pierde el sombreado del pelo, por menos de 2 KB por pose.
- **Un contorno claro en el tema oscuro**, como una calcomanía. El contorno también dibuja ojos y boca: en claro se ven al revés.

## Consecuencias

### Positivas

- Tino entra tal como se dibujó, con sus cinco poses, sin rehacer nada.
- Su contraste se mide como el del resto del niño, en los dos temas.

### Negativas / Restricciones

- **`index.html` pesa 52 KB más (19 KB con gzip) también para el adulto**, que nunca ve a Tino.
- **Trece tokens nuevos**: once roles en el tema oscuro y dos que cambian en el claro.
- **La ronda 2 depende del conversor**, que no está versionado en el repo.
