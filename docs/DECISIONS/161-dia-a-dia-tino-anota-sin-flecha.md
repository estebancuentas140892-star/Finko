# ADR 161 - Día a día: Tino anota y el vacío deja la flecha

**Estado:** Aceptada (2026-11-17).
**Fecha:** 2026-11-17
**Autores:** Esteban (pedido "Gastos día a día", puntos 1 y 2), Claude Opus 5.5 (implementación)
**Relación:** **Cambia** el [ADR 156](156-registrar-gasto-en-el-telefono-tablero-integral.md) D2 (la pose de Tino y la flecha punteada del vacío). **Extiende** el [ADR 127](127-identidad-bosque-y-sol.md) D6 con una pose compuesta sobre el dibujo original, sin redibujar al personaje.

---

## Contexto

El vacío de Día a día ("Anota tu primera compra") mostraba a Tino explicando y, en el teléfono, una flecha punteada que bajaba hasta el botón central, más un halo que late en él. Esteban pidió un Tino que apunte en una hoja, más acorde con anotar gastos, y quitar la línea: el botón ya titila (el halo) y la frase dice "Toca el botón +"; otro elemento es ruido.

No hay dibujo de Tino con libreta entre los originales de `Personaje Tino/`.

## Decisión

### D1. Tino anota en su libreta, y el halo basta

- **Pose `anota`** (`assets/tino/tino-anota.svg`, `TINO_ORIGINAL.anota`): es `tino.svg` sin un trazo cambiado, salvo el grano de café que sostenía (diez trazados que se quitan). Encima van una libreta de espiral con renglones y algo escrito, la pata de atrás que la sostiene por el borde y la de adelante con un lápiz. Las piezas nuevas usan los colores del dibujo (pelo `#9b5223`, contorno `#321106`, lápiz `#f5b11e` y `#f86e5a`) y su grosor de trazo. Mismo lienzo que la pose base (637 x 957), así que cae en el sol como cualquier pose de pie.
- **Sin flecha:** salen `.gastos-empty__guia--trazo` y `--punta` con su CSS (`--gastos-guia-base`, `--gastos-guia-alto`, la animación del trazo). Se queda el halo que late sobre el botón central y su versión quieta con "reducir movimiento".

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Esperar un dibujo nuevo de Esteban | El pedido es concreto y la composición conserva el personaje tal cual; si llega un original, se reemplaza el archivo sin tocar código. |
| Redibujar a Tino escribiendo | El ADR 127 D6 pide los dibujos originales, nunca una versión redibujada. |
| Quitar también el halo | El pedido lo nombra como suficiente para llamar la atención. |

## Consecuencias

- `tino-anota.svg` se precachea en el SW como las demás poses.
- Si la barra o el botón central cambian de medida, solo se recalibra `--gastos-guia-boton` (`domain.css`).
