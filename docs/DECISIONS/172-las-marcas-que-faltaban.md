# ADR 172 - Las marcas que faltaban: operadores móviles, software, juegos, ViX y dónde se invierte

**Estado:** Aceptada (2026-11-18). Pedido "Revisión de servicios, categorías y movimientos", puntos 3a, 4b, 5, 6 y 7: qué operadores, plataformas y servicios deben aparecer como opción, sin crear categorías innecesarias. La propuesta salió de esa revisión y se aprobó en chat el mismo día: "Sí, sigue con marcas".
**Fecha:** 2026-11-18
**Autores:** el pedido de revisión (producto), Claude Opus 5.5 (investigación, análisis del catálogo y diseño)
**Relación:** **Amplía** el catálogo del [ADR 029](029-catalogo-de-marcas-por-categoria.md) (D1: agregar una plataforma es agregar una fila; D3: el tag `inversion`, previsto y vacío) y el selector de plataforma del [ADR 146](146-finko-reconoce-el-tipo-de-gasto.md) D3, como lo hizo el [ADR 167](167-gastos-fijos-categorias-de-colombia.md) D5. Sigue su regla de aliases (frases propias, no palabras comunes) y la de fidelidad del [ADR 025](025-logotipos-de-marca-y-tejas.md) D5 (iniciales hasta tener el vector). **No toca** las categorías: los puntos 3b (Celular en Día a día) y 4a (Videojuegos) cambian la taxonomía y van en su propio ADR.

---

## Contexto

**Lo que hay.** `MARCAS` agrupa las empresas por tags, y `TAGS_CATEGORIA_AGENDA` dice qué tags ofrece cada categoría de gasto fijo. "Celular" e "Internet y TV" comparten el tag `telefonia` (Claro, Movistar, Tigo, ETB), y "Suscripciones" ofrece `ia`, `nube`, `gaming`, `educacion` y `domicilios`. La inversión guarda un `nombre` libre ("CDT Bancolombia") y no sabe dónde está.

**Lo que dice la investigación (noviembre de 2026):**

| Servicio | Estado | Cómo se paga |
|---|---|---|
| Móvil Éxito | Activo. El operador móvil virtual (OMV) más grande, con unos 490.000 accesos | Solo prepago: paquetes diarios, semanales o mensuales |
| Virgin Mobile | Activo, sobre la red de Movistar | Prepago y planes mensuales sin permanencia |
| Kalley Móvil | Activo, de Alkosto y Ktronix | Solo prepago: paquetes de $3.000 a $7.000 |
| WOM | Opera sin marca desde febrero de 2026, por orden de la SIC | Prepago y pospago |
| Flash Mobile | Salió del mercado en 2025 | No aplica |
| IYO Móvil y Wings Mobile | No se pudo confirmar que sigan activos | Prepago |
| Microsoft 365 | Activo | Mensual o anual: Personal $36.999 al mes o $369.999 al año |
| McAfee | Activo | Anual, con renovación automática |
| Roblox | Robux: compras sueltas. Roblox Premium: suscripción mensual | Tarjeta, app o tarjeta de regalo |
| Free Fire | Diamantes: compras sueltas, sin suscripción mensual | Dentro del juego o con PIN |
| ViX Premium | Activo, vendido suelto | $22.900 al mes o plan anual |
| trii | App de inversión: acciones de la Bolsa de Colombia y de EE. UU., fondos y CDT. Opera con una comisionista vigilada por la Superfinanciera | Comisión por operación |
| Wenia | Plataforma de criptoactivos del Grupo Cibest (COPW, USDW). Empresa de Bermudas | Sin comisión para vender COPW a pesos |

**Un hallazgo del catálogo.** Si los OMV entran al tag `telefonia`, aparecen también en "Internet y TV", y ninguno vende internet fijo ni televisión.

---

## Decisión

### D1. Celular: entran tres operadores móviles, con un tag propio

Tag nuevo **`movil`**, solo para quien vende planes de celular y nada más. `Celular` ofrece `['telefonia', 'movil']`; "Internet y TV" no cambia. Entran, en este orden y después de los cuatro de hoy: **Móvil Éxito, Virgin Mobile y Kalley Móvil**.

El criterio para entrar al selector: activo en 2026, con un plan o paquete que la gente paga cada mes y un nombre que reconoce. Por eso no entran:

- **WOM**, mientras no tenga nombre. Cuando lo tenga, es una fila.
- **Flash Mobile**, que salió del mercado.
- **IYO Móvil y Wings Mobile**, sin actividad confirmada.

Los tres quedan en "Otra".

### D2. Suscripciones: software y un juego

- Tag nuevo **`software`** con **Microsoft 365** y **McAfee**. `Suscripciones` ofrece `['ia', 'nube', 'software', 'gaming', 'educacion', 'domicilios']`. La frecuencia anual ya existe en los fijos: la renovación anual que nadie recuerda queda en Por pagar antes de cobrarse.
- **Roblox** entra al tag `gaming`, después de Xbox, por Roblox Premium.
- **No entran:**
  - **Free Fire**, porque no vende una suscripción mensual.
  - **Google Play**, porque es la tienda: lo que se paga ahí se anota con la marca del servicio (YouTube, Google One).
- **No se crea la categoría "Tecnología".** Tendría dos marcas y partiría Suscripciones en dos cajas que el usuario no distingue.

### D3. Streaming: ViX

**ViX** entra al tag `streaming`, después de Crunchyroll. El precio de entrada ($9.900 durante 6 meses) sube después: el usuario edita el monto del fijo, como con cualquier otro.

### D4. Aliases y colores

Los aliases son frases propias, para que la teja no se pinte en textos que no hablan de la empresa (ADR 167 D5):

| Marca | Aliases | No se usa |
|---|---|---|
| Móvil Éxito | `movil exito` | `exito`: es el supermercado |
| Virgin Mobile | `virgin mobile`, `virgin` | |
| Kalley Móvil | `kalley movil` | `kalley`: es la marca de televisores y electrodomésticos |
| Microsoft 365 | `microsoft 365`, `office 365`, `microsoft office` | `microsoft`: Xbox también es Microsoft |
| McAfee | `mcafee` | |
| Roblox | `roblox` | `robux`: los Robux son compras sueltas de Día a día, no la suscripción |
| ViX | `vix premium`, `vix` | |
| trii | `trii` | |
| Wenia | `wenia` | |

Cada nombre resuelve a su propia marca (la invariante del ADR 146 D4 que recorre `marcas.test.js`). Los colores se toman de la web de cada empresa. Todas entran con iniciales hasta tener el vector.

### D5. Inversión: "¿Dónde la tienes?"

Campo opcional **`entidad`** en la inversión, con dos fuentes en un mismo selector:

- Los bancos y billeteras de `BANCOS_CO`, sin Efectivo ni Otro: el CDT, que es la inversión más común, está en un banco.
- Las plataformas del tag **`inversion`** de `MARCAS`: **trii** y **Wenia**.

Se guarda el id, como `Cuenta.banco`. Los ids no chocan: los bancos se guardan con su nombre ("Bancolombia") y las marcas en minúsculas ("trii"). La fila pinta el avatar del banco o la teja de la marca. Elegir Wenia sugiere el tipo Cripto, que se puede cambiar. El `nombre` sigue siendo del usuario.

Es un dato opcional y sin migración, como `cuentaId` en INV.1: una inversión sin entidad se ve como hoy.

Finko no recomienda ni califica plataformas: no es asesor. Tampoco dice si una plataforma está vigilada por la Superfinanciera, porque es un dato que cambia y nadie lo mantendría (el motivo del [ADR 004](004-eliminar-tasa-usura.md)).

### D6. El texto de Cripto

Hoy dice que las criptomonedas "suben y bajan mucho en poco tiempo". COPW y USDW no buscan subir: están atadas al peso o al dólar. Se agrega una frase: "Las atadas al peso o al dólar no buscan subir, y tampoco tienen el seguro de depósito de una cuenta de ahorros." Sin lección ni pregunta ([ADR 101](101-finko-del-adulto-decide-no-ensena.md)): es la explicación que la sección ya da del tipo.

---

## Rebanadas

| Rebanada | Qué entrega |
|---|---|
| MK.3a | D1 a D4: nueve filas en `MARCAS`, los tags `movil` y `software` y los dos cambios de `TAGS_CATEGORIA_AGENDA` |
| MK.3b | D5 y D6: "¿Dónde la tienes?" en la inversión y el texto de Cripto |

---

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Los OMV en el tag `telefonia` | Aparecerían en "Internet y TV", donde ninguno vende |
| Los siete operadores del pedido | Uno salió del mercado, otro no tiene marca y dos no tienen actividad confirmada: el selector ofrecería empresas que no existen |
| Categoría "Tecnología" o "Software" | Dos marcas en una caja nueva que el usuario no distingue de Suscripciones |
| Google Play como marca | Es la tienda: todo lo digital quedaría en una sola marca y se perdería qué se pagó |
| Free Fire en Suscripciones | No vende suscripción mensual; sus diamantes son compras de Día a día |
| Solo trii y Wenia en la inversión | El CDT en un banco, la inversión más común, quedaría en "Otra" |
| Un campo para el banco y otro para la plataforma | Dos campos para una misma pregunta: dónde está la inversión |
| Marcar qué plataforma está vigilada | Dato que cambia y pide mantenimiento (ADR 004) |

---

## Consecuencias

### Positivas

- Quien paga su celular en Móvil Éxito, Virgin Mobile o Kalley Móvil lo encuentra con un toque.
- Microsoft 365 y McAfee quedan como fijos anuales visibles antes de renovarse.
- Una inversión dice dónde está, con el logo del banco o de la plataforma.

### Negativas / Restricciones

- Nueve logos más esperan el vector de Esteban; mientras tanto, iniciales.
- El catálogo de inversión arranca con dos plataformas: las demás entran como filas cuando se pidan.
- Mantener el criterio de D1: una empresa que sale del mercado sale del selector (borrar su fila deja el `marcaId` guardado sin marca y la teja cae al texto, como ya prevé el catálogo desde el ADR 146 D4).
