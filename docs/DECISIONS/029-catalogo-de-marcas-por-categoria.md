# ADR 029 - Catálogo de marcas por categoría (seleccionar en vez de escribir)

**Estado:** Aceptada. La taxonomía de la sección D3 fue validada por Esteban el 2026-07-13 (sesión de taxonomía CAT.1, junto con el [ADR 014](014-taxonomia-categorias-transversal.md)): la tabla de tags queda tal cual; la Fase 0 puede iniciar. Decisiones de dirección ya tomadas por Esteban: (1) arrancar por la fundación (ADR + catálogo de datos + resolver, sin UI); (2) `resolverMarca` por texto se **conserva como fallback**, no se elimina.
**Fecha:** 2026-07-06
**Autores:** Esteban (visión de producto), Claude Opus 4.8 (análisis y diseño)
**Relación:** evoluciona la capa de marcas de [ADR 025](025-logotipos-de-marca-y-tejas.md) (catálogo `MARCAS`/`BANCOS_CO`, teja, `resolverMarca`) y la biblioteca gráfica de [ADR 026](026-biblioteca-de-recursos-graficos.md) (Esteban diseña los SVG; `assets/svg/` es la fuente de verdad). **Absorbe la tarjeta TX.10** del BOARD ("categoría como eje de automatización"): esta es su pieza de infraestructura de datos. Reusa las categorías personalizadas de TX.9b (`S.categoriasPersonalizadas`, `ICONOS_CATEGORIA_PERSONALIZADA`).

---

## Contexto

Pedido de Esteban (2026-07-06): al registrar algo que tiene una marca, plataforma o entidad conocida (Netflix, Spotify, Claude, Bancolombia, Nequi...), el usuario debería **seleccionarla de una lista**, no escribirla. Hoy escribe el nombre libre y la app intenta reconocerlo por texto; eso falla con errores de escritura ("Neflix"), admite variantes inconsistentes del mismo servicio ("HBO", "HBO+", "HBO Max") y ensucia la base de datos, lo que dificulta cualquier automatización. La meta: dato limpio y consistente, logo/color asignados solos, y una arquitectura de catálogo escalable donde agregar una plataforma sea "agregar una fila", sin tocar lógica.

Hallazgos del análisis del código actual:

1. **El catálogo ya existe, a medias.** `MARCAS` (22 servicios) y `BANCOS_CO` (13 bancos/billeteras) en `constants.js` ya guardan `{ id, nombre, aliases, color, texto, iniciales, simbolo }`. Es exactamente el catálogo pedido, pero (a) está **plano**, no agrupado por categoría, y (b) se consulta por **texto libre**, no por selección.
2. **El "reconocimiento por texto" a reemplazar es `resolverMarca(texto)`** (`infra/marcas.js`): compara el texto contra `aliases`. Es el punto de falla descrito. `tejaMarca(marca)` renderiza el logo y se reutiliza igual con selección.
3. **"Streaming" no es categoría de gastos, es de gastos fijos (Calendario).** `CATEGORIAS_AGENDA` incluye Streaming, Suscripciones, Internet, Telefonía. Ahí es donde hoy se escribe "Netflix" y corre `resolverMarca`. Una suscripción es un fijo recurrente, no un gasto suelto.
4. **El patrón "seleccionar en vez de escribir" ya está probado**: el formulario de cuenta usa un `bank-picker` que elige el banco y trae su logo. Bancos, Billeteras, Cooperativas y Plataformas de inversión son territorio de **cuentas/inversiones**, no de gastos.
5. **"Otro → personalizado" ya existe** (TX.9b, en Gastos): nombre + selector de ícono. Falta solo el color opcional.
6. **El almacenamiento hoy no guarda la marca**: se re-resuelve del texto en cada render. Guardar la marca elegida de forma explícita es el corazón de "base de datos limpia".

## Decisión

Evolucionar la capa de marcas de ADR 025 de "resolver por texto" a "seleccionar y guardar", conservando la resolución por texto como fallback. El elemento nuevo es una **relación categoría ↔ marcas** en un catálogo de datos, y un `marcaId` **almacenado** en el registro.

### D1. Catálogo de datos dedicado (no JSON en runtime, no base de datos)

Una base de datos rompe ADN §3 (sin servidor). `.json` cargado en runtime rompe el offline-first sin ganancia (habría que precachearlo en el SW y cargarlo async antes de pintar un formulario). La forma equivalente y compatible con el ADN es un **módulo de datos** que solo exporta datos, sin lógica: agregar una plataforma = agregar una fila, sin tocar lógica de aplicación, que es exactamente el objetivo pedido.

- `MARCAS` y `BANCOS_CO` se mantienen como fuente de verdad de **identidad** (id, nombre, color, texto, iniciales, simbolo, aliases). No se renombran ids (son valores que pueden estar en `localStorage`).
- Se agrega a cada marca un campo **`categorias: string[]`**: los tags de categoría a los que pertenece. Una marca puede estar en varios (`Amazon Music → ['musica']`, `Prime Video → ['streaming']`, `Amazon → ['compras']`).
- El catálogo puede quedarse en `core/constants.js` o extraerse a `core/catalogo/` si crece; se decide al implementar según tamaño. En ambos casos es "solo datos".

### D2. Resolver por selección (infra, puro)

- `marcasDeCategoria(categoriaTag)` → array de marcas del tag, en orden de catálogo. Puro, sin DOM, en `infra/marcas.js` (o un submódulo). Es la única función nueva de lógica.
- `marcaPorId(id)` → la marca cuyo `id` coincide (para pintar el logo desde el `marcaId` guardado).
- `resolverMarca(texto)` **se conserva sin cambios** como fallback: registros viejos e importaciones CSV que no traen `marcaId` siguen mostrando su logo por texto.

### D3. Taxonomía de categorías con marcas (VALIDADA 2026-07-13)

Tags de categoría, vocabulario normalizado y agnóstico de dominio. Validada por Esteban tal cual el 2026-07-13 (sesión CAT.1):

| Tag | Marcas hoy en catálogo | Marcas a sumar (con iniciales hasta tener glifo) |
|---|---|---|
| `streaming` | Netflix, Disney+, HBO Max, Prime Video, Crunchyroll, YouTube | Paramount+, Apple TV+ |
| `musica` | Spotify | Deezer, Apple Music, Amazon Music, YouTube Music, Tidal |
| `ia` | Claude, ChatGPT, Gemini | Copilot, Perplexity, Midjourney, Grok, Notion AI, Cursor |
| `telefonia` | Movistar, Claro, Tigo | WOM, Virgin |
| `pagos` | PayPal, Mercado Pago | |
| `transporte` | Uber | Didi, Cabify, InDrive |
| `domicilios` | Rappi | iFood |
| `gaming` | PlayStation, Xbox | Nintendo, Steam |
| `educacion` | Duolingo, Platzi | Coursera, Udemy |
| `banco` | los 9 bancos de `BANCOS_CO` | Dale!, otros |
| `billetera` | Nequi, Daviplata, Nubank, Lulo Bank | |
| `cooperativa` | (ninguna aún) | las cooperativas comunes del país |
| `inversion` | (ninguna aún) | plataformas de inversión más usadas |

- El primer entregable etiqueta lo que ya existe y suma solo las marcas de mayor uso; el resto crece "agregando filas" (D1).
- Los glifos nuevos los diseña Esteban en Illustrator (ADR 026); mientras tanto la marca usa `iniciales` (fallback natural de ADR 025 D2). El catálogo no depende de tener el logo listo.

### D4. Mapeo categoría de dominio → tag

Las etiquetas visibles de cada dominio (agenda "Streaming", "Suscripciones", "Telefonía"...) se mapean a los tags de D3. "Suscripciones" es un cajón amplio: puede ofrecer la unión de streaming + musica + ia, o pedir primero el tipo. Se resuelve al diseñar la UI (Fase 1), no ahora.

### D5. `marcaId` almacenado (dato limpio)

Al seleccionar una marca, el registro (gasto fijo, gasto, deuda...) guarda **`marcaId`** (el id estable del catálogo), no solo el nombre. Es un campo **opcional nuevo** con migración idempotente trivial (no existe → no hay marca). Beneficio directo: consistencia (una plataforma = un id), logo/color deterministas, y la base para las automatizaciones de TX.10 (agrupar "cuánto gasto en streaming" por `marcaId`/tag, no por texto).

### D6. "Otro" → personalizado (reusa TX.9b)

Si la categoría no tiene marcas, o el usuario elige "Otro", aparece el formulario de categoría/marca personalizada que ya existe en Gastos (nombre + ícono de la biblioteca). Se le suma el **color opcional** pedido. Queda disponible para futuras selecciones, igual que las predefinidas.

### D7. Alcance y fases (dividir lo grande, 2.1)

- **Fase 0 (esta):** ADR + catálogo de datos (etiquetado por categoría) + `marcasDeCategoria`/`marcaPorId` + tests puros. Sin UI, sin cambio de dato de usuario. `resolverMarca` intacto.
- **Fase 1:** piloto de UI en **un** formulario (candidato natural: gasto fijo de Calendario, donde vive Streaming/Netflix hoy): segundo selector "Plataforma" cuando la categoría tiene marcas; guarda `marcaId`; pinta con `tejaMarca`.
- **Fase 2+:** extender a los demás formularios y categorías; color en la personalizada; automatizaciones de TX.10 que consumen `marcaId`/tag.

## Consecuencias

- **Positivas:** dato limpio y consistente (un id por plataforma); logo/color/automatización deterministas; catálogo que crece agregando filas sin tocar lógica; cero regresión (los registros viejos siguen resolviéndose por texto); no reintroduce build step ni servidor.
- **Costo:** un campo de schema nuevo (`marcaId`, opcional) por registro que lo soporte; mantener el mapeo categoría→tag; y el trabajo de glifos nuevos queda como cola de diseño de Esteban (no bloquea, cae a iniciales).
- **Riesgo:** definir mal la taxonomía (D3) se replica en cada formulario. Por eso el ADR se valida antes de construir el catálogo. La consolidación con TX.10 evita construir dos motores de "por categoría" distintos (regla "sin duplicados", 2.1).

## Alternativas consideradas

1. **Seguir solo con texto + `resolverMarca` mejorado** (más aliases, tolerancia a typos): no resuelve el pedido central (dato limpio por selección) y mantiene la inconsistencia.
2. **`.json` en runtime o IndexedDB como "catálogo":** choca con offline-first/sin-servidor y agrega carga async antes de pintar; el módulo de datos da el mismo beneficio de "solo datos, agregar filas" sin ese costo.
3. **Reemplazar `resolverMarca` del todo:** descartado por Esteban en esta ronda (se conserva como fallback) para no romper fijos/deudas ya registrados ni el logo automático de importaciones CSV.
