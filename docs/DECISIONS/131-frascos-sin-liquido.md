# ADR 131 - Frascos sin líquido: Ahorrar se llena, Gastar y Compartir se vacían

**Estado:** Aceptada (2026-11-05). Pedido en chat: "sigue aplicando los cambios propuestos en el HTML". La única propuesta del diseño "Finko · Identidad Bosque y sol" que faltaba era su página "Frascos sin líquido", que esperaba la decisión de Esteban; ese pedido es la decisión.
**Fecha:** 2026-11-05
**Autores:** Esteban (decisión), Claude Design (propuesta), Claude Opus 5.5 (implementación y redacción)
**Relación:** **Cambia** el [ADR 128](128-los-frascos-se-llenan-de-cafe.md) D2 en el tinte: el color del frasco deja el vidrio y pasa a la tapa. **Revierte** la alternativa que el 128 descartó ("granos sin tinte detrás: los tres frascos quedan iguales"): con la tapa de color, los tres se distinguen sin tinte. **Conserva** el 128 D1 (el grano y sus colores), el reparto de granos de `granosFrasco()`, la R60 (cada frasco contra lo suyo, `llenadoFrasco()` no cambia) y la R49 del [ADR 093](093-perfiles-en-el-dispositivo-y-modo-nino.md) D5 (el nombre y el monto siguen al lado: el color nunca va solo).

---

## Contexto

Con el ADR 128 los frascos se llenan de granos de café sobre un tinte de su color al 55 %. El tinte sigue leyéndose como un líquido detrás de los granos, y los tres frascos se cuentan igual: más granos es más dinero. Pero Gastar y Compartir no son ahorro: su parte de la mesada entra para usarse. Un frasco de Gastar que se vacía no es un fracaso, y uno lleno no es una meta.

## Decisión

### D1. El vidrio, transparente; el color, en la tapa

- `il-frasco` pinta su tapa con `currentColor`, el color de cada frasco (`--fk-kid-ahorrar`, `--fk-kid-gastar`, `--fk-kid-compartir`), con su contorno de siempre.
- El vidrio queda con la sombra de las ilustraciones (`--fk-il-shade`), sin líquido ni tinte. Se va `.frasco__tinte`.

### D2. Ahorrar se llena hacia la meta

Como hasta ahora: los granos que caben hasta el nivel contra el precio de la meta. Arriba no hay huecos: es vidrio libre para seguir guardando.

### D3. Gastar y Compartir se vacían con lo que se usa

- Lleno es lo que le toca a ese frasco de la mesada; cada grano que falta deja su hueco, el contorno del grano punteado (`il-cafe-hueco`, `--fk-cafe-hueco`: el contorno de la ilustración al 38 % en oscuro y al 32 % en claro). El niño ve lo que usó, no lo que ganó.
- Los huecos quedan arriba: el último grano en entrar es el primero en salir.
- Solo con mesada repartida para ese frasco (`frascoConHuecos()`, `nino/logic.js`): sin ella no hay contra qué medir lo usado, y el frasco se ve como Ahorrar.
- Va igual en los tres tamaños de la app (64, 44 y 32 px): la Alcancía, las tejas de Inicio y el selector de los formularios.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Conservar el tinte y sumar la tapa | el tinte sigue leyéndose como líquido, que es lo que la propuesta quita |
| Huecos también en Ahorrar | Ahorrar no tiene un "lleno" que se gaste: su lleno es la meta, y lo que falta es lo que queda por guardar, no lo usado |
| Huecos en Gastar y Compartir sin mesada | dirían "lo usaste" sin saber cuánto había |
| Los huecos abajo | un frasco de granos se vacía por arriba; abajo se leería como un frasco roto |
| Bajar la sombra del vidrio en claro al 6 % del diseño | es un token compartido con todas las ilustraciones; con el 10 % de siempre el vidrio se lee igual |

## Consecuencias

- Los tres frascos dicen cosas distintas: Ahorrar cuánto falta para la meta; Gastar y Compartir cuánto queda de la semana.
- Si el tutor cambia la mesada, los huecos miden contra la nueva (riesgo anotado en `contexto/nino.md`).
- Hasta veinte `<use>` por frasco, como antes: los huecos ocupan los sitios de los granos que faltan.
- `rellenoFrasco()` queda sin uso en la app: borrarlo con su prueba es una decisión aparte.
