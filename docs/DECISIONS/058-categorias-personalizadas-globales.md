# ADR 058 - Categorías personalizadas globales: la sección es un campo, no una colección

**Estado:** Aceptada el 2026-07-31. Esteban aprobó las cinco decisiones sobre el mapa verificado contra el código.
**Fecha:** 2026-07-31
**Autores:** Esteban (decisión), Claude Opus 5 (mapeo del código, verificación y formalización).
**Origen:** tarjeta **CAT.3** del tablero, iniciativa CAT (triaje 2026-07-08, briefs "Auditoría Gastos" y "Auditoría Calendario"). El alcance real se estableció mapeando el código el 2026-07-31, no desde el enunciado de la tarjeta.
**Relación:** **aplica** el [ADR 014](014-taxonomia-categorias-transversal.md) (CAT.1: una categoría pertenece a una sección) al caso de las personalizadas. **Extiende** TX.9b, que las creó solo para Gastos. **Coexiste** con CAT.2f (el ícono por registro de gasto fijo) sin tocarlo. Hereda de CAT.1c la regla de retiro con edición segura, que aplicará cuando exista borrado.

---

## Contexto

TX.9b le dio al usuario la capacidad de crear sus propias categorías: `S.categoriasPersonalizadas` (`{id, nombre, icono, fechaCreacion}[]`, migración v23 a v24). La clave funcional es el `nombre`, que es lo que se guarda en `Gasto.categoria`, igual que una nativa. Valen solo para Gastos.

La tarjeta CAT.3 describía el trabajo como propagar esas categorías "con el mismo ícono y color a TODAS las superficies" y anticipaba un modelo de datos por decidir. El mapeo del código el 2026-07-31 corrigió tres supuestos de ese enunciado:

- **No existe ningún mapa `categoría` a `color` en el repo.** Cero coincidencias de `CATEGORIA_COLOR`, `colorDeCategoria` o `--fk-cat-*`. El color de la teja lo declara el **dominio** (`.cat-teja[data-dom="gastos"]` toma `--fk-dom-gastos`), no la categoría, y el color de la dona de Análisis se asigna **por posición en el ranking** (`PALETA_CATEGORIAS[i % 6]`, `infra/svg.js:374`). Una personalizada ya recibe color correctamente hoy. No hay nada que propagar.
- **El CSV ya funciona.** `export/logic.js:39` serializa `String(g.categoria ?? '')` en texto plano y el módulo no importa nada de `constants.js`.
- **Los filtros ya funcionan.** 8 de 9 agrupaciones y filtros derivan el catálogo de opciones de los datos reales, no de la constante (los chips de filtro de Gastos son `[...new Set(delMes.map(g => g.categoria))]`, `gastos/view.js:141`), así que una personalizada aparece sola.

Lo que sí falta son dos cosas, y una de ellas ya es un defecto sin CAT.3:

**El catálogo de Gastos fijos es un gate de escritura duro.** `validarCompromiso` rechaza cualquier categoría que no esté en `CATEGORIAS_AGENDA` (`compromisos/logic/modelo.js:276`) y `normalizarCompromiso` la descarta a `null` **en silencio** (`modelo.js:414`), con dos espejos en la UI (`agenda/index.js:145` y `:217`). Ninguna variante `_USUARIO` filtra ese catálogo y no existe resolutora equivalente a `iconoDeCategoriaGasto()`: ese es el hueco central.

**Siete superficies leen el mapa de íconos crudo en vez de pasar por la resolutora.** Cuatro son del lado fijos (`agenda/view.js:716`, `:888`, `gastos/logic.js:585`, `tesoreria/views/distribucion.js:315`). Las otras tres **ya fallan hoy con una personalizada de Gastos**: el envelope de Presupuesto (`presupuesto/view.js:492`), el banner de alertas de límite (`:742`) y la categoría top de Inicio (`resumen/view.js:119`) la pintan con `c-otros`, mientras el formulario que la creó sí muestra el ícono elegido. La app se contradice a sí misma.

## Decisión

### D1. La sección es un campo del objeto, no una colección aparte

`S.categoriasPersonalizadas` gana un campo: `{ id, nombre, icono, fechaCreacion, seccion }`, con `seccion` en `'gasto' | 'fijo'`. Una sola colección para las dos secciones.

Bump de schema **v28 a v29**, con migración idempotente que pone `seccion: 'gasto'` en las entradas existentes (ADN 6). Es la única migración que necesita la iniciativa.

Es la traducción directa de la tesis del ADR 014: una categoría **pertenece** a una sección, y los criterios ya están escritos ahí (fijo = recurrente con frecuencia definida; gasto = día a día variable). Modelar la sección como un campo del objeto en vez de como una colección nueva evita duplicar la resolutora y el validador, y deja la detección de nombres duplicados entre secciones en una sola pasada sobre un solo array.

### D2. La oferta es por sección, la resolución de ícono es global

Dos reglas separadas, y separarlas es lo que hace simple el resto:

- **Ofrecer** (qué chips ves en un formulario) filtra por `seccion`. El formulario de gasto ofrece las de `'gasto'`; el de gasto fijo, las de `'fijo'`. Una personalizada "Netflix" no aparece como chip en el formulario de gasto variable.
- **Resolver** (qué ícono se pinta para un nombre ya guardado) ignora la sección. Una superficie que pinta un movimiento no sabe, y no debe saber, de qué formulario salió ese nombre.

Una resolutora global es posible porque **el guardarraíl TX.4 ya la garantiza**: las cinco etiquetas que comparten los dos catálogos nativos tienen el mismo símbolo en ambos (`Servicios públicos` `c-servicios`, `Mercado` `c-mercado`, `Educación` `c-libro`, `Transporte` `c-bus`, `Mascotas` `c-mascotas`), verificado el 2026-07-31 en `constants.js:456` y `:609`. Fusionar los dos mapas no puede producir un conflicto de símbolo, y TX.4 sigue siendo la compuerta que lo mantiene así.

### D3. Los siete accesos crudos pasan por la resolutora, incluidos los tres que ya fallan

Los tres de Gastos (`presupuesto/view.js:492`, `:742`, `resumen/view.js:119`) entran en esta iniciativa aunque sean anteriores a ella: es la misma línea de cambio (sustituir el acceso al mapa por la llamada a la resolutora) y es literalmente el objetivo declarado de la tarjeta. Sacarlos a un error numerado aparte dejaría a Inicio y a Presupuesto contradiciendo al formulario de Gastos mientras esa tarjeta espera turno.

Se reportan como **defecto preexistente encontrado durante el mapeo**, no como regresión de CAT.3.

### D4. El validador compara contra los dos catálogos nativos

`validarCategoriaPersonalizada` compara hoy contra `CATEGORIAS_GASTO` y contra las personalizadas ya guardadas (`gastos/logic.js:323`), pero **no** contra `CATEGORIAS_AGENDA`. Hoy ya se puede crear una personalizada llamada "Arriendo" o "Streaming"; con CAT.3 esa colisión pasa de latente a visible, porque el nombre chocaría con una nativa del formulario donde va a aparecer.

La comparación pasa a cubrir los dos catálogos nativos completos, con la misma normalización que ya usa (minúscula `es` sin diacríticos). El nombre es único en toda la app, no por sección: dos categorías con el mismo nombre y distinta sección serían indistinguibles al resolver el ícono (D2), que es global.

### D5. El ícono por registro de gasto fijo (CAT.2f) coexiste sin cambios

Hoy, al elegir la categoría `'Otro'` en un gasto fijo se revela un picker cuyo ícono se guarda en el registro (`Compromiso.icono`, `modelo.js:425`), no en un catálogo reutilizable. Se mantiene tal cual.

Son dos cosas distintas y las dos son legítimas: el ícono de **un** registro ("el arriendo de la finca") y una categoría **reutilizable** que clasifica varios. Retirar el picker por registro obligaría a decidir qué hacer con los gastos fijos que ya guardaron `icono`, y eso es un ADR aparte sin beneficio para esta iniciativa. La personalizada se suma como opción nueva y `Compromiso.icono` conserva su precedencia actual sobre la categoría.

## Lo que queda fuera de este ADR

**Renombrar y eliminar una categoría personalizada.** Hoy no existe ninguna de las dos: la única operación es `guardar()` (`gastos/index.js:82`), no hay `editar` ni `eliminar` sobre la colección, y no hay pantalla de gestión en Ajustes. Una vez creada es permanente, así que un typo queda fijo para siempre y su nombre normalizado bloquea el reintento. Es un problema real, pero es CRUD, no propagación: dobla el alcance de CAT.3 y arrastra la regla de retiro seguro de CAT.1c (el selector debe reinyectar la categoría retirada cuando el registro editado ya la tenía). Sale a una tarjeta nueva por triaje.

**Apartados y Metas.** Sus catálogos son otra cosa: `PLANTILLAS_APARTADO` copia nombre e ícono al registro una sola vez (`apartados/logic.js:54`) y Metas usa `CATEGORIAS_META_USUARIO`. Ninguna de las dos lee este array, y extenderlas exigiría decidir antes si una plantilla y una categoría son la misma cosa.

**Import CSV no recrea la entrada del catálogo.** `import/logic.js:176` acepta cualquier texto como categoría sin validar, así que un roundtrip de exportar e importar conserva el **nombre** de una personalizada pero no vuelve a crearla en `S.categoriasPersonalizadas`: el gasto importado queda con nombre válido y sin ícono asociado (cae al fallback). Ya pasa hoy con las de Gastos. Se documenta como limitación conocida.

**Ingresos.** `CATEGORIA_INGRESO_ICONO` es un tercer catálogo, de otro dominio, y nadie pidió personalizadas ahí.

## Alternativas rechazadas

| Alternativa | Por qué se rechaza |
|---|---|
| Catálogo plano global sin campo `seccion` | Cero migración, pero toda personalizada se ofrecería en las dos secciones: "Netflix" como chip del formulario de gasto variable. Contradice la tesis del ADR 014, que es justamente que la sección de una categoría se decide una vez. |
| Una colección nueva `categoriasPersonalizadasFijos` | Duplica resolutora y validador, y obliga a cruzar dos arrays para detectar nombres duplicados entre secciones. Más vocabulario para el mismo resultado que un campo. |
| Resolver el ícono por sección en vez de globalmente | Obliga a cada superficie a saber de qué sección salió el nombre que está pintando. `movimientos/logic.js` mezcla gastos y compromisos en una sola lista: tendría que arrastrar la sección por todo el pipeline para elegir mapa. |
| Nombre único por sección en vez de único en toda la app | Dos personalizadas homónimas en secciones distintas serían indistinguibles para la resolutora global de D2, que solo recibe el nombre. |
| Dejar los 3 accesos crudos de Gastos para una tarjeta aparte | Son la misma línea de cambio y el mismo síntoma. Postergarlos deja la app contradiciéndose entre el formulario y el resto de las superficies. |
| Retirar el picker de ícono por registro y reemplazarlo por personalizadas | Más limpio en concepto (una sola forma de personalizar), pero rompe los gastos fijos que ya guardaron `icono` con categoría `'Otro'` y exige una decisión de migración que esta iniciativa no necesita. |
| Agregar un mapa `categoría` a `color` | No existe hoy y nada lo pide: el color viene del dominio (teja) y del ranking (dona). Inventarlo sería vocabulario nuevo para un problema que no está ocurriendo. |

## Consecuencias

- **Un solo bump de schema (v28 a v29) para toda la iniciativa**, en la primera rebanada. La migración es de una línea y idempotente: si `seccion` falta, es `'gasto'`.
- **El nombre pasa a ser único en toda la app.** Un usuario que ya tenga una personalizada llamada igual que una nativa de Agenda ("Arriendo", "Streaming") conserva su categoría y sus gastos: D4 valida **altas nuevas**, nunca reescribe lo guardado, igual que la regla de CAT.1a (filtrar el formulario, nunca borrar del mapa de íconos).
- **`CATEGORIA_AGENDA_ICONO` necesita su variante curada.** El catálogo de Agenda se expone crudo al formulario y contiene `'Otro'`, que es miembro literal, no sentinela. Habilitar el chip de categoría nueva ahí obliga a decidir cómo convive con `'Otro'` en la rebanada correspondiente.
- **TX.4 sube de guardarraíl a dependencia.** D2 se apoya en que dos catálogos nativos nunca den símbolos distintos a la misma etiqueta. Ese test deja de ser una comodidad y pasa a sostener la resolución global.
- **La personalizada sin uso sigue apareciendo.** Borrar el último gasto de una personalizada no la retira del catálogo (no hay borrado), así que su chip queda en el formulario. Con fijos habilitados el efecto se duplica.
- **Los tres accesos crudos arreglados cambian lo que ve un usuario que ya tiene personalizadas**, sin que él haya hecho nada: el ícono correcto aparece donde antes había `c-otros`. Es una corrección, y se anuncia como tal en el CHANGELOG.

## Implementación

Iniciativa **CAT.3** del tablero, en cuatro rebanadas verificables por separado:

- **CAT.3a** - el modelo: campo `seccion`, migración v28 a v29, resolutora global sobre los dos mapas nativos, y D4 en el validador. Sin cambio visible todavía.
- **CAT.3b** - los siete accesos crudos pasan por la resolutora (D3), incluidos los tres que ya fallaban.
- **CAT.3c** - Gastos fijos ofrece y acepta personalizadas: chip de categoría nueva en el formulario, y los tres gates de escritura de `modelo.js` más sus dos espejos en `agenda/index.js`.
- **CAT.3d** - las superficies de fijos resuelven el ícono de una personalizada (detalle del día del calendario, checklist de Necesidades de Tesorería, gasto nacido de un fijo).
