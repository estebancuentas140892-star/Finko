# ADR 146 - Finko reconoce el tipo de gasto: hormiga, fantasma y vampiro sin preguntarlos

**Estado:** Aceptada (2026-11-15). Pedido de Esteban en chat; las recomendaciones del triaje se aceptaron con "Sí, arranca".
**Fecha:** 2026-11-15
**Autores:** Esteban (visión de producto), Claude Opus 5.5 (triaje, diseño e implementación)
**Relación:** **Ejecuta** la Fase 0 y la Fase 1 del [ADR 029](029-catalogo-de-marcas-por-categoria.md) (catálogo de marcas por categoría y `marcaId` guardado) con la forma de datos del [ADR 064](064-estructura-de-dos-niveles.md). **Conserva** la taxonomía del [ADR 014](014-taxonomia-categorias-transversal.md) (Streaming y Suscripciones son las dos categorías no esenciales). **Extiende** el criterio de hormiga del [ADR 092](092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) D11 y la detección de suscripciones del [ADR 044](044-motor-unico-de-sugerencia-por-categoria.md). Los avisos nuevos entran al motor del [ADR 066](066-motor-unico-de-avisos.md).

---

## Contexto

Pedido de Esteban (2026-11-15): la mayoría de los colombianos no conoce los términos "gasto hormiga", "gasto fantasma" y "gasto vampiro". Finko no debe preguntarle al usuario de qué tipo es un gasto, sino reconocerlo con lo que ya sabe (la categoría, la plataforma, el monto, la frecuencia) y mostrar la oportunidad de ahorro. Al elegir una categoría como Streaming, el usuario debería ver una lista de plataformas (Netflix, Prime Video, HBO Max...) con su logo; con varias suscripciones, Finko debería preguntarle si las usa todas.

Lo que el código tenía el 2026-11-15:

1. **Hormiga ya se reconoce sola**: `infra/hormiga.js` decide por monto (hasta $20.000, tope configurable en Límites), no por categoría. Pero el formulario de gasto **todavía ofrece un chip "Gastos hormiga"**, que le pregunta al usuario justo lo que el pedido dice no preguntar.
2. **Fantasma está a medias**: `detectarSuscripcionesLargas` mira fijos de Streaming y Suscripciones con seis o más meses cobrados y sale solo en Límites, una a la vez. No cuenta cuántas plataformas paga la persona ni entra al motor de avisos.
3. **La lista de plataformas está decidida y no construida**: el ADR 029 se aceptó el 2026-07-13, pero `MARCAS` no tiene el campo `categorias` y ningún registro guarda `marcaId` (lo confirmó el ADR 064). El logo sale por texto libre: "Neflix" no resuelve.
4. **Vampiro no existe** en ninguna parte del código.

## Decisión

### D1. Los nombres de categoría no cambian

Se conservan "Streaming" (video y música) y "Suscripciones" (IA, nube, juegos, educación, membresías de domicilios), las dos que validó el ADR 014. "Plataformas digitales" o "Entretenimiento digital" obligarían a fusionar dos categorías ya guardadas en `localStorage` y a migrar datos, sin que el usuario gane nada: lo que reconoce es el logo de la plataforma, no el nombre del cajón.

### D2. El selector de plataforma vive en el gasto fijo

Una suscripción es un pago recurrente con fecha: su lugar es el gasto fijo de "Por pagar" (ADR 014 D1), que es donde ya se elige Streaming. "Entretenimiento" de Gastos queda para el cine o una salida, sin lista. El selector aparece debajo de la categoría solo cuando la categoría tiene plataformas, es opcional y trae al final "Otra" (sin plataforma). Telefonía e Internet también lo muestran: Claro, Movistar y Tigo ya estaban en el catálogo.

### D3. Las marcas se etiquetan con tags y cada categoría de fijo los une

`MARCAS` gana `categorias: string[]` con los tags del ADR 029 D3 (`streaming`, `musica`, `ia`, `telefonia`, `pagos`, `transporte`, `domicilios`, `gaming`, `educacion`) más `nube` para iCloud y Google. La tabla `TAGS_CATEGORIA_AGENDA` dice qué tags ofrece cada categoría de fijo (Streaming: `streaming` y `musica`; Suscripciones: `ia`, `nube`, `gaming`, `educacion` y `domicilios`; Telefonía e Internet: `telefonia`). Es la decisión que el ADR 029 D4 dejó para la UI. Lectura con `hijosDeCategoria` y `hijoPorId` de `infra/taxonomia.js` (ADR 064), envueltas en `infra/marcas.js`.

Entran seis plataformas con iniciales hasta que Esteban entregue su vector (ADR 025 D2): Paramount+, Apple TV+, Apple Music, YouTube Music, Amazon Music y Deezer. Las tres con nombre compuesto van **antes** de su marca genérica en el catálogo, porque `resolverMarca` se queda con la primera que coincide.

### D4. Elegir una plataforma da el nombre y guarda `marcaId` (schema v51)

Con una plataforma elegida, el gasto fijo se llama como ella ("Netflix", no "Streaming") y guarda `marcaId`. El texto que el usuario escriba sigue siendo la nota. Sin plataforma, `marcaId` es `null` y todo queda como antes. `marcaId` va siempre explícito, como `icono` y `cupoTotal`, para que `editar()` lo limpie al cambiar de categoría; y solo se acepta si la marca pertenece a la categoría elegida.

Invariante probada: el nombre de cada marca del catálogo resuelve a esa misma marca con `resolverMarca`. Así las seis superficies que pintan la teja por texto (Calendario, "Por pagar", Distribuir, la tarjeta de crédito) muestran el logo correcto sin tocarlas, y `marcaId` queda para lo que el texto no resuelve bien: contar plataformas (D6).

### D5. El chip "Gastos hormiga" sale del formulario de gasto

Hormiga es lo que Finko reconoce por monto, no algo que el usuario declara. El chip sale de `CATEGORIAS_GASTO_USUARIO`; la categoría sigue en `CATEGORIAS_GASTO` para que los gastos ya guardados con ella conserven su ícono y su límite (mismo tratamiento que Vivienda en CAT.1a).

### D6. Varias plataformas a la vez son un aviso

Con tres o más fijos activos de Streaming y Suscripciones, el motor de avisos suma un tipo nuevo con cuántas son, cuánto suman al mes y al año. La superficie pregunta, no acusa: "Pagas 4 plataformas: $96.000 al mes. ¿Las usas todas?". Severidad baja (no interrumpe con notificación del sistema). Finko sigue sin saber si algo se usa (ADR 044): muestra el hecho y la persona decide. No espera los seis meses de `detectarSuscripcionesLargas`, que se queda para su caso (la que lleva más tiempo).

**Nota de implementación (SUS.1c, 2026-11-15).** El aviso es el tipo `suscripciones-varias` del motor (detector `resumenSuscripciones` en `compromisos/logic/modelo.js`). Dice "suscripciones" y no "plataformas": Suscripciones también trae IA, nube y juegos. Cuenta plataformas distintas por `marcaId` y suma el equivalente mensual de cada fijo (una anual entra por su doceava parte). Y calla hasta el mes siguiente cuando el usuario toca "Revisarlas", que lo lleva a Por pagar (`config.suscripcionesRevisadas`, schema v54). Sin eso, un aviso sin fecha saldría todos los días en "Atención hoy" y dejaría de leerse.

### D7. Vampiro queda definido, no construido

Para Finko, vampiro es **lo que se paga sin comprar nada**: cuota de manejo (categoría de fijo), intereses de deudas (ya calculados en Deudas) y comisiones. Los dos primeros se derivan de datos que existen; los seguros atados a un crédito no tienen dato propio. Se construye después de D6, con su propia rebanada y la superficie decidida con Esteban.

## Fases

- **SUS.1a** (esta): D1 a D4. Catálogo etiquetado, plataformas nuevas, selector en el gasto fijo, `marcaId` y migración v51.
- **SUS.1b**: D5, el chip de hormiga sale del formulario.
- **SUS.1c**: D6, el aviso de varias plataformas.
- **SUS.1d**: D7, vampiro, con su superficie decidida.

## Consecuencias

- **Positivas:** un dato limpio por plataforma, el logo deja de depender de cómo se escriba, y las detecciones de fantasma y vampiro tienen un id con qué contar. Ninguna superficie que pinta tejas cambia.
- **Costo:** un campo nuevo en el compromiso y una migración; mantener la tabla de tags por categoría; los vectores de las plataformas nuevas quedan en la cola de diseño de Esteban (no bloquean).
- **Riesgo:** el orden de `MARCAS` decide la resolución por texto. Un test recorre el catálogo entero para que una fila nueva mal ubicada falle antes de llegar a producción.

## Alternativas consideradas

1. **Preguntar el tipo al registrar** ("¿es hormiga?"): es lo que el pedido descarta, y depende de que el usuario conozca un término que la mayoría no conoce.
2. **Renombrar a "Plataformas digitales"**: migración de datos sin beneficio visible (D1).
3. **Selector también en Gastos, bajo Entretenimiento**: un pago de Netflix suelto no es el caso; duplicaría el lugar donde vive una suscripción y partiría el conteo de D6 en dos fuentes.
4. **Leer el logo siempre desde `marcaId` en cada superficie**: tocar seis archivos para el mismo resultado que da la invariante de D4.
