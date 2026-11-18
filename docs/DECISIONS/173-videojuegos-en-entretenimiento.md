# ADR 173 - Videojuegos en Entretenimiento; Celular sigue solo como gasto fijo

**Estado:** Aceptada (2026-11-18). Pedido "Revisión de servicios, categorías y movimientos", puntos 3 y 4. El punto 4 preguntaba cómo registrar una compra dentro de un videojuego. Para Celular, la revisión proponía sumarlo también a Día a día (3b); en chat se eligió "Solo gasto fijo".
**Fecha:** 2026-11-18
**Autores:** el pedido de revisión (producto y la decisión sobre Celular), Claude Opus 5.5 (investigación y diseño)
**Relación:** **Amplía** las subcategorías del [ADR 147](147-gusto-o-necesidad-hormiga-sin-adivinar.md) D3, validadas el 2026-11-15, con una más. **Confirma** el [ADR 167](167-gastos-fijos-categorias-de-colombia.md) D2: Celular vive solo en Gastos fijos. Las marcas de juegos y telefonía son del [ADR 172](172-las-marcas-que-faltaban.md).

---

## Contexto

**Videojuegos.** Los diamantes de Free Fire y los Robux de Roblox son compras sueltas: dentro del juego (por Google Play o App Store), en la web del juego o con un PIN comprado en Alkosto o Ktronix. Hoy Entretenimiento tiene Cine, Conciertos y eventos, Rumba y licor, Chance y apuestas y Paseos: la compra en un juego no tiene subcategoría. "Compras digitales" describe el canal, no el gasto: una app de mercado comprada en Google Play no es entretenimiento.

**Celular.** El fijo "Celular" cubre el plan o el paquete que se paga cada mes. La revisión proponía que Celular viviera también en Día a día, como Educación, para la recarga prepago suelta ($5.000 cuando se acaba el saldo), que hoy cae en "Otros". La decisión en chat fue no hacerlo.

---

## Decisión

### D1. Entretenimiento > Videojuegos

Subcategoría nueva, `entret-videojuegos`, "Videojuegos", después de "Conciertos y eventos". Recoge diamantes, Robux, pases de temporada, juegos de consola o de Steam y los PIN de juegos.

- **Carácter gusto**, como "Chance y apuestas": una compra pequeña cuenta como gasto hormiga de inmediato (ADR 147 D1). Las compras dentro de los juegos son justo el gasto que se escapa sin verse, y Finko ya sabe mostrarlo.
- **Se le puede poner límite** por subcategoría ([ADR 164](164-limite-por-subcategoria.md)), sin nada nuevo.
- La suscripción mensual de un juego (Roblox Premium, PlayStation Plus) no va aquí: es un gasto fijo con su marca (ADR 172 D2).

### D2. Celular sigue solo como gasto fijo

Celular vive en un solo lugar: el gasto fijo, con su operador (ADR 167 y 172). La recarga suelta de prepago se anota en **"Otros"**, que pregunta si fue necesidad o deseo. Día a día no gana categoría.

### D3. Lo que ya está guardado

Nada se migra:

- **Los gastos de Entretenimiento sin subcategoría** no se reclasifican: nada en ellos dice si fueron un juego, y adivinarlo sería inventar el dato.
- **Una categoría propia "Videojuegos"** se queda: las subcategorías no reservan nombres, y la persona la eligió.

El id nuevo no necesita bump de schema: `subcategoriaId` ya admite cualquier id del catálogo (v52).

---

## Rebanada

| Rebanada | Qué entrega |
|---|---|
| GAS.6 | D1: la fila en `SUBCATEGORIAS_GASTO` y sus pruebas (se ofrece en "¿En qué fue?" de Entretenimiento, cuenta como gusto y una compra pequeña es hormiga) |

---

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Celular también en Día a día, con "Recarga o paquete" y "Equipo, accesorios o arreglo" | Decisión en chat: un solo lugar para el celular. Quien recarga suelto usa "Otros", sin una categoría más para todos |
| Una categoría "Compras digitales" | Describe el canal y mezclaría juegos, apps y suscripciones; se perdería en qué se gastó |
| Videojuegos como categoría propia de Día a día | Es entretenimiento: una categoría aparte sumaría una teja para un gasto que ya tiene casa |
| Carácter "depende" | Una compra en un juego no es una necesidad; con "depende" la hormiga esperaría a que se repita |

---

## Consecuencias

### Positivas

- Una compra en un juego tiene dónde anotarse, y la pequeña se ve como hormiga desde la primera.
- Celular sigue en un solo lugar: no hay que elegir entre dos para anotarlo.

### Negativas / Restricciones

- La recarga prepago suelta se mezcla con lo demás de "Otros". Si con el uso resulta frecuente, la decisión se revisa con un ADR nuevo.
