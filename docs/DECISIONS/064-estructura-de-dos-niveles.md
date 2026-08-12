# ADR 064 - La estructura de dos niveles se decide una sola vez

**Estado:** Aceptada e implementada en su fundación (MT.6a, 2026-08-12): `infra/taxonomia.js` y el primer catálogo que la usa (`SUBCATEGORIAS_META`). Los otros dos consumidores previstos la adoptan cuando su tarjeta los toque.
**Fecha:** 2026-08-12
**Autores:** Esteban (dirección: "toma la mejor elección para el proyecto"), Claude Opus 5 (análisis y redacción)
**Relación:** cierra la delegación que dejaron abiertas el [ADR 048](048-metas-v2-subcategorias-y-plan-de-aportes.md) D1 ("Qué falta para cerrarlo", punto 1) y el [ADR 029](029-catalogo-de-marcas-por-categoria.md) D3. No los reemplaza: les da la forma de datos que los dos delegaron. La tercera consumidora es entidad a producto (tarjeta MC.16, Deudas v2).

---

## Contexto

Tres partes del proyecto piden lo mismo con tres nombres distintos:

| Dónde | Padre | Hijo | Dueño |
|---|---|---|---|
| Metas | categoría ('Vehículo') | subcategoría ('Moto') | ADR 048 D1 |
| Gastos fijos | categoría ('streaming') | marca ('Netflix') | ADR 029 D2 |
| Deudas y tarjeta | entidad ('Bancolombia') | producto ('Tarjeta Oro') | MC.16 |

Es un solo problema de modelado. El ADR 048 lo dijo explícitamente y **delegó la decisión** en la validación D3 del ADR 029, para no modelarlo dos veces. Esa validación fijó la taxonomía de tags de marcas, pero **no la forma de datos genérica**, y la Fase 0 del ADR 029 nunca se implementó: hoy no existe ni `marcasDeCategoria` ni el campo `categorias` en `MARCAS`. Resultado: la delegación quedó apuntando a un lugar donde la respuesta no está, y MT.6 se quedó bloqueada esperándola.

Este ADR responde la pregunta que faltaba, y la responde en el sitio donde se implementa primero.

---

## Decisiones

### D1. Catálogo plano de hijos etiquetados con su padre

La estructura es un array de `{ id, nombre, categorias: string[] }`. **No** un mapa de padre a lista de hijos.

Un hijo puede pertenecer a varios padres: Amazon está en compras y en streaming, y el ADR 029 D1 ya lo había previsto ("una marca puede estar en varios"). En un mapa de padre a hijos eso obliga a escribir la misma fila dos veces, y dos filas pueden divergir en silencio. En el catálogo plano el hijo se declara una vez con dos etiquetas. Cuando la relación es de un solo padre (una subcategoría de meta, un producto de una entidad) el array trae un elemento y la lectura no cambia: la forma de muchos-a-muchos degrada sin costo a uno-a-muchos, y la inversa no.

Sigue siendo "solo datos" (ADR 029 D1): agregar un hijo es agregar una fila, sin tocar lógica.

### D2. `id` estable almacenado, `nombre` visible desechable

El registro guarda el **`id`**, nunca el nombre. Es la misma decisión que el `marcaId` del ADR 029 D5, generalizada: un id por concepto es lo que hace comparables los datos entre registros y lo que habilita cualquier automatización o estadística posterior.

De ahí se siguen dos reglas duras: **un `id` no se renombra jamás** (puede estar escrito en el `localStorage` de un usuario) y **el `nombre` sí puede cambiar** sin migración, porque no es dato guardado.

### D3. Dos lecturas y una consulta, en `infra/taxonomia.js`, con el catálogo por parámetro

`hijosDeCategoria(catalogo, categoria)`, `hijoPorId(catalogo, id)` y `categoriasConHijos(catalogo)`. Puras, sin DOM y sin estado.

El catálogo entra **por parámetro**, no por import: así el módulo sirve a los tres consumidores sin conocer a ninguno, y no reintroduce por la puerta de atrás la dependencia entre dominios que prohíbe el ADN #10. Es el mismo movimiento de `infra/bolsas.js` y `infra/vencimientos.js`: el cálculo compartido vive en infra, el vocabulario se queda en cada dominio.

Contrato de bordes, fijado acá para que los tres consumidores lo hereden igual:

- Categoría sin hijos devuelve **array vacío**, no `null`: un catálogo de dos niveles crece agregando filas, así que "todavía no tiene hijos" es el estado normal de casi todas las categorías al principio, no un fallo.
- `hijoPorId` con un id que ya no está devuelve **`null`**, y el consumidor cae a lo que mostraba antes de existir el segundo nivel (la categoría sola). Mismo patrón de fallback que `resolverMarca`.

---

## Consecuencias

**MT.6 se desbloquea.** Su D1 ya tiene la estructura que estaba esperando, y la primera rebanada (MT.6a) es la fundación: catálogo más lecturas más tests, sin UI y sin tocar datos de usuario. Es la misma división por fases que Esteban ya eligió para el problema gemelo (ADR 029 D7, "arrancar por la fundación, sin UI").

**El ADR 029 Fase 0 se abarata.** Cuando se implemente, `MARCAS` gana su campo `categorias: string[]` y `marcasDeCategoria` deja de ser una función nueva: es `hijosDeCategoria(MARCAS, tag)`. `marcaPorId` es `hijoPorId(MARCAS, id)`. El ADR 029 conserva su taxonomía de tags (D3) y su fallback por texto (D2), que no se tocan.

**MC.16 hereda la forma sin discutirla otra vez.** Entidad a producto entra como tercer consumidor del mismo par de funciones.

**El costo es un array de etiquetas por fila** en lugar de la agrupación visual que da un mapa. A cambio, ningún hijo se escribe dos veces.

---

## Alternativas consideradas

1. **Mapa `{ padre: [hijos] }`** (ej. `CATEGORIA_META_SUBCATEGORIAS`). Es más legible de un vistazo y sigue la forma de los mapas que ya viven en `constants.js` (`CATEGORIA_META_ICONO`). Descartada porque no admite un hijo con dos padres sin duplicar la fila, y el caso ya existe hoy en marcas: elegirla obligaría a Metas y a Marcas a usar formas distintas, que es exactamente lo que el ADR 048 D1 pidió evitar.
2. **Que cada dominio modele su segundo nivel a su manera.** Es lo que pasa si no se decide: tres formas para un problema, y tres implementaciones de la misma búsqueda.
3. **Una capa genérica más ambiciosa** (árbol de N niveles, registro de taxonomías, resolución por herencia). Ningún consumidor pide un tercer nivel. Contra el criterio de CLAUDE.md: menos vocabulario nuevo es mejor diseño.

---

## Fuera de alcance

- **La UI del segundo control** (cuándo aparece el selector de subcategoría, cómo se ve, qué pasa al cambiar de categoría): es MT.6b para Metas y la Fase 1 del ADR 029 para marcas.
- **El campo almacenado** (`subcategoriaId` en la meta) y su migración: MT.6b.
- **Íconos propios por subcategoría.** Hoy el ícono y la silueta salen de la categoría (`CATEGORIA_META_ICONO`, `CATEGORIA_META_SILUETA`). Un glifo por subcategoría es cola de diseño de Esteban (ADR 026) y no bloquea nada: el catálogo no depende de tener logo.
- **El plan de aportes** (ADR 048 D3): otra rebanada.
