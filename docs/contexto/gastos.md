# Ficha de contexto: Gastos

> Revisado: 2026-11-20 (GAS.12a).

> Ver reglas de uso y plantilla en [`README.md`](README.md).

> El registro de un gasto (el formulario, la confirmación tras guardar y "Repetir") vive en [`gastos-registro.md`](gastos-registro.md), partida el 2026-11-19 (GAS.9a) por el techo de 40 KB.

---

## Cada pestaña con su cifra y cada vencimiento con su pago (GAS.12, ADR 187)

- **Objetivo**          : el pedido "Correcciones de cálculos y vencimientos" ([ADR 187](../DECISIONS/187-cada-pestana-con-su-cifra-y-cada-vencimiento-con-su-pago.md)): el resumen de cada pestaña habla solo de ella y cada vencimiento de un fijo se paga por separado.
- **Estado actual**     : en proceso. GAS.12a cerrada (D1); faltan 12b a 12d ([`board/gastos.md`](../board/gastos.md)).
- **Verificado contra** : GAS.12a (2026-11-20).

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| La hoja de meses de cada pestaña | `modules/ui/bloque-gastos.js` | `lenteDeLaHoja()`, `totalesDeLaLente()`, `_HOJA_DE_LA_LENTE` | la pestaña sale de la sección del botón y, en `sec-compromisos`, del hash |
| Lo pagado por mes a fijos o a deudas | `compromisos/logic/abonos.js` | `totalesPagadosDelAnio()` | sin `consumoTC`; un pago sin su compromiso se reconoce por la categoría interna |
| Lo gastado por mes en categorías con límite | `presupuesto/logic.js` | `totalesLimitesDelAnio()` | la misma cifra de la tarjeta (`resumenLimitesDelMes`) |
| Los vencimientos de un mes | `infra/vencimientos.js` | `vencimientosDelMes()`, `inicioDeVencimientos()` | sin los anteriores al alta; un quincenal trae dos |
| Fijos en un mes pasado | `compromisos/views/lista.js` | `_agruparPorUrgencia()`, `_faltaDelMes()`, `resumenFijosDelMes()` | sin vencimiento ese mes, el fijo no sale; "Pagaste" suma todos los pagos de fijos |
| Límites con lo de Día a día | `presupuesto/logic.js` | `_gastosDeLimites()` | `esDelDiaADia`: también en las categorías sin límite y en las partes |

**Riesgos**:

- **La lista de Fijos de escritorio es un inventario**, no un mes: sigue mostrando todos los fijos activos. Lo del mes vale para el teléfono (`_renderPorUrgencia`) y para la tarjeta.
- **Límites ya no lista "Gastos fijos" ni "Deudas" entre las categorías sin límite**: quien busque esa fila con su enlace a Fijos la encuentra solo para las retiradas del día a día (Vivienda, Servicios públicos).

**Cambios realizados**:

- 2026-11-20 GAS.12a (ADR 187 D1): la hoja de meses de cada pestaña, Fijos en un mes con solo sus vencimientos, "Pagaste" con todos los pagos de fijos y Límites con lo de Día a día.

---

## Gastos móvil: cada lugar con una función (GAS.10, ADR 185)

- **Objetivo**          : el tablero "Finko · Gastos móvil, propuesta integral" ([ADR 185](../DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md)): Gastos registra y controla, Movimientos encuentra, Inicio avisa. Día a día, el registro de un gasto, las categorías, el gasto fijo y Deudas. Bajo 1024 px; Límites y Agregar cuenta no cambian.
- **Estado actual**     : completa. GAS.10a a 10g cerradas (D1 a D8); cierra GAS.9f.
- **Verificado contra** : GAS.10g (2026-11-19). Antes: GAS.10f (2026-11-19).

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| Las pestañas como primer renglón | `modules/ui/bloque-gastos.js` | `htmlBloqueGastos()` | solo la barra; el punto rojo de Fijos y Deudas es `pintarEstadoLente(..., true)` |
| El ojo de cada tarjeta | `gastos/view.js`, `compromisos/views/hero.js`, `presupuesto/view.js` | `.hero-gastos__ojo`, `_htmlOjo()`, `htmlOjoTarjeta()` | tapa su lente (ADR 166); el estilo, en el bloque "GAS.10" de `identidad.css` |
| La lupa de los filtros | `gastos/view.js`, `gastos/index.js` | `.filtros-bar__embudo`, acción `gastos-mas-filtros` | Movimientos con Gastos marcado y el foco en `#movimientos-buscar` |
| El complemento del día | `gastos/view.js` | `complementoDiaGastos()`, `.gastos-dia__extra` | solo en el teléfono (`plegar`) |
| La primera vez | `gastos/view.js` | `_renderDiaNuevo()`, `.dia-nuevo__tarjeta--fila`, `.tino-sol--libre` | Tino sin sol; la pista punteada solo sin fijos |
| Las áreas y lo que cambia de nombre | `modules/core/constants.js` | `AREAS_GASTO`, `RENOMBRES_CATEGORIA_GASTO`, `SUBCATEGORIAS_A_CARRO`, `SUBCATEGORIAS_UNIDAS` | las áreas solo ordenan la pantalla (GAS.10c) |
| La migración v58 | `modules/core/storage.js` | `_migrate()`, bloque `< 58` | gastos, límites (un límite de Transporte por partes se parte), lo aprendido de hormiga y las propias que chocan |
| Los íconos de una categoría propia de Gastos | `modules/core/constants.js` | `ICONOS_CATEGORIA_GASTO_PROPIA` | sin el carro ni la torta; metas, cuentas y fijos siguen con `ICONOS_CATEGORIA_PERSONALIZADA` |
| La categoría por áreas | `modules/dominio/gastos/telefono.js` | `_htmlCategoria()`, `.tejas__area`, `.tejas--sueltas` | orden fijo del tablero (sale `ordenarCategoriasPorUso` del teléfono); el tono va en `--teja-tono` |
| El detalle con la pregunta adentro | `modules/dominio/gastos/telefono.js` | `_htmlDetalle()`, `pintarDetalle()`, `colocarPregunta()`, `[data-caracter-casa]` | el `fieldset` de la pregunta se muda tras la opción elegida; sin opción vuelve a su casa |
| Sus estilos | `styles/components/captura.css` | bloque "GAS.10c" al final | la capa `captura` le gana a `identidad`: lo del formulario va acá |
| La factura del gasto | `modules/dominio/gastos/telefono.js` | `_htmlRecibo()`, `_pintarRecibo()`, `_pintarFilaDetalle()`, `#gasto-fila-nota` con `[data-fila-accion]` | sin el tipo de la cuenta; con dos del mismo banco, el nombre entero |
| Sus estilos | `styles/components/captura.css` | bloque "GAS.10d" al final | acotado a `#form-gasto`; el papel redeclara los tonos de categoría del tema claro |
| El gasto fijo: qué es y la empresa | `modules/dominio/compromisos/views/formularios.js` | `_gruposPlataforma()` (`_GRUPO_MARCAS`), `#gfijo-sin-empresa` | las marcas van en el primer grupo de la categoría que las nombra |
| Sin empresa | `modules/dominio/compromisos/index.js`, `logic/modelo.js` | `_syncSinEmpresaGastoFijo()`, `nombreServicio` en `normalizarCompromiso()` | sin nombre escrito, el fijo se llama como la categoría |
| Cuándo | `modules/dominio/compromisos/views/formularios.js`, `index.js` | `FRECUENCIAS_OTRA_FIJO`, `[name="frecuenciaOtra"]`, `_syncFrecuenciaGastoFijo()` | en escritorio "Otra" sigue siendo el desplegable con las nueve |
| La factura del fijo | `modules/ui/preguntas.js` | `data-resumen-opcionales`, `[data-resumen-sub]`, `data-resumen-orden` en una parte | lo opcional en línea es opt-in: deudas, cuentas y metas siguen con "Agrega si quieres" |
| Deudas en el teléfono | `modules/dominio/compromisos/views/lista.js`, `hero.js`, `estrategia.js` | `_renderVacioDeudas()`, `_renderInventarioDeudas()`, `_metaDeuda()`, `htmlHeroDeudas()`, `htmlEntradaPlanSalida({ sugerencia })` | sus estilos, al final de `identidad.css` (bloque "GAS.10g") |

**Riesgos**:

- **El ojo tapa su lente, no las cuatro**: el tablero lo da por hecho; el ADR 185 D1 dice por qué no cambia.
- **Sin franja, lo vencido de Día a día solo está en el punto de la pestaña y en Inicio**: quien busque `gastos-vencido` o `gastos-ver-vencido`, ya no existen.
- **El carro y la torta siguen en `ICONOS_CATEGORIA_PERSONALIZADA`**: esa lista la comparten metas, cuentas y fijos y valida lo guardado; quitarlos rompía editar una meta con el carro.
- **El formulario de gasto se estiliza en `captura.css`, que es una capa por encima de `identidad.css`**: una regla de GAS.10 para `#form-gasto` puesta en `identidad.css` no aplica.

**Cambios realizados**:

- 2026-11-20 GAS.11d (ADR 186 D7): Deudas la primera vez: Tino toma el alto que sobra (64 a 104 px, `svh`) y bajo 700 de alto se recoge el aire; la factura del fijo recoge el de su cabecera bajo 660. Cierra GAS.11.
- 2026-11-20 GAS.11b (ADR 186 D5): Café pregunta necesidad o deseo dentro de Tinto y Café de cafetería (Bebidas frías es deseo); Gastos fantasma y el aviso cuentan lo pequeño que se repite.
- 2026-11-19 GAS.10g (ADR 185 D8): Deudas: la primera vez con un Tino y dos tarjetas lado a lado; con deudas, "Cuotas de noviembre", el selector con su conteo, "Cuota $X · día N" y el plan en una línea. Cierra GAS.10 y GAS.9.
- 2026-11-19 GAS.10f (ADR 185 D7): Cuándo en una pantalla sin títulos ("Otra" despliega cuatro chips) y la factura del fijo como la del gasto, con lo opcional en línea.
- 2026-11-19 GAS.10e (ADR 185 D6): el gasto fijo sin "Pagas $X" ni títulos en Qué es y la empresa; los logos por grupo, cuatro por fila, y "Sin empresa: escribir el nombre" con su pantalla.
- 2026-11-19 GAS.10d (ADR 185 D5): la factura del gasto como el tablero (cifra con COP al lado, "Detalle", lo que queda junto a la cuenta, la flecha) y la nota en una línea con su hoja aparte.
- 2026-11-19 GAS.10c (ADR 185 D4): la categoría por áreas, cada teja en su tono, y el detalle con la categoría arriba y la pregunta dentro de la opción.
- 2026-11-19 GAS.10b (ADR 185 D3): Antojos (antes Mecato), Carro o moto con Gasolina, Parqueadero y Peajes, Ferretería y arreglos, el carácter nuevo y la migración v58.
- 2026-11-19 GAS.10a (ADR 185 D1 y D2): las pestañas arriba, el ojo en la tarjeta, la lupa en los filtros, sin franja de lo vencido, "Hoy · jue 19" y la primera vez con Tino al lado.

---

## Gastos que cuadran (GAS.9, ADR 183)

- **Objetivo**          : el pedido de correcciones de Gastos ([ADR 183](../DECISIONS/183-gastos-que-cuadran.md)): la navegación sin la raya café, un resumen por pestaña, el vencimiento contado desde el último pago, la tarjeta nacida en Mis cuentas y la sugerencia de límite al registrar. Bajo 1024 px.
- **Estado actual**     : lógica completa: GAS.9a a 9e y 9g cerradas. El diseño de Claude Design (GAS.9f) es GAS.10 (ADR 185).
- **Verificado contra** : GAS.9g (2026-11-19). Antes: GAS.9e (2026-11-19).

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| La compacta de Día a día | `modules/dominio/gastos/view.js` | `_pintarCompacta()`, `_enlazarCompactaAlNavegar()` | apagada con la tarjeta en 0 y en cada `hashchange` |
| El resumen de cada pestaña | `gastos/logic.js`, `compromisos/views/hero.js`, `compromisos/views/lista.js` | `esDelDiaADia()`, `htmlHeroDeudas()`, `resumenFijosDelMes()`, `lentePorPagar()` | Día a día sin pagos de obligaciones; Fijos solo fijos; Deudas con lo pagado en el mes |
| El vencimiento desde el último pago | `compromisos/logic/alertas.js`, `infra/estado-obligacion.js`, `infra/avisos.js` | `pendientesDeObligacion()`, `vencidosSinPagar()`, `pagosPendientesDelMes()` | atraso desde la fecha pendiente más vieja; el último pago cubre su mes y lo de antes |
| La tarjeta en Mis cuentas | `tesoreria/acciones/cuentas.js`, `tesoreria/views/cuentas.js`, `compromisos/views/formularios.js`, `compromisos/views/detalle.js` | `_agregarTarjeta()` (`tc-agregar`), `_renderTarjetaTC()`, `renderFormDeuda({ sinTarjeta })`, `htmlDetalleCompromiso()` | la única puerta es "Agregar cuenta"; la hoja de la tarjeta es la misma en las dos secciones |
| La sugerencia de límite al registrar | `presupuesto/logic.js`, `gastos/index.js` | `sugerenciaDeLimiteAlRegistrar()`, `_sugerirLimite()` | una vez por categoría y mes (`S.config.limiteSugerenciasVistas`), una al día |

**Riesgos**:

- **Un `IntersectionObserver` no avisa si el cruce no cambia**: con una sección que se oculta, mirar también el tamaño y volver a observar al navegar.
- **Un fijo de prueba sin pagos creado hace años sale vencido desde entonces**: las semillas nacen en el ciclo del escenario o traen su pago anterior.

**Cambios realizados**:

- 2026-11-19 GAS.9g (ADR 183 D4): la tarjeta con su nombre y su logo en Mis cuentas.
- 2026-11-19 GAS.9e (ADR 183 D5): Límites sugiere al registrar, una vez.
- 2026-11-19 GAS.9d (ADR 183 D4): la tarjeta nace y se administra en Mis cuentas.
- 2026-11-19 GAS.9c (ADR 183 D3): el vencimiento se cuenta desde el último pago.
- 2026-11-19 GAS.9b (ADR 183 D2): cada pestaña con su resumen; la segunda vuelve a ser Fijos.
- 2026-11-19 GAS.9a (ADR 183 D1): la compacta ya no asoma al cambiar de pestaña; pasa a bosque.

---

## Gastos en el teléfono: cada cosa con su forma y su color (GAS.8, ADR 182)

- **Objetivo**          : el tablero "Gastos de Finko · Rediseño móvil" ([ADR 182](../DECISIONS/182-gastos-cada-cosa-con-su-forma-y-su-color.md)): bosque resume, rojo avisa, ámbar acerca, girasol sugiere, el neutro filtra, cada categoría tiene su tono y el coral marca la sección. Bajo 1024 px.
- **Estado actual**     : en proceso. GAS.8a a GAS.8h cerradas (D1 a D8). Faltan las cinco poses de Tino ([`board/gastos.md`](../board/gastos.md)).
- **Verificado contra** : GAS.8h (2026-11-19). Antes: GAS.8g (2026-11-19).

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| Los tokens de cada trabajo | `styles/tokens.css`, `styles/themes.css` | `--fk-resumen*`, `--fk-alerta*`, `--fk-cerca*`, `--fk-bien*`, `--fk-sugerencia*`, `--fk-filtro*`, `--fk-riel*`, `--fk-seccion-coral*` | el claro redefine todo menos el bosque, que es igual en los dos temas |
| El tono de cada categoría | `modules/core/constants.js`, `styles/components/atoms.css` | `TONO_CATEGORIA`, `tonoDeCategoria()`, `.cat-teja[data-cat]` | `tejaCategoria(id, dominio, tono)` pone `data-cat`; `--fk-cat-*-barra` es el de la barra sobre el bosque |
| El encabezado | `modules/ui/bloque-gastos.js` | `htmlBloqueGastos()` | desde GAS.10a, solo las pestañas (ADR 185 D1) |
| Bosque, filtros y riel | `styles/identidad.css` | bloque "GAS.8 (ADR 182)" | va al final: gana a los bloques GAS.4 y GAS.7 |
| La comparación, el reparto y las semanas (puras) | `modules/dominio/gastos/logic.js` | `comparacionDelMes()`, `repartoPorCategoria()`, `semanasDelMes()` | la comparación "a esta altura" corta el mes anterior en el día de hoy; las semanas van de lunes a domingo, recortadas al mes |
| La tarjeta de Día a día en el teléfono | `modules/dominio/gastos/view.js` | `_lecturaTelefono()`, `_comparacionTelefono()`, `_repartoTelefono()`, `_fichaLimite()` | el ojo tapa la barra; "Categorías ›" va a `#analisis` |
| La franja de alerta (roja y ámbar) | `styles/identidad.css` | `.franja-alerta`, `.franja-alerta--ambar` | la usa Límites; Día a día la dejó en GAS.10a |
| Semanas anteriores plegadas | `modules/dominio/gastos/view.js`, `gastos/index.js` | `_renderPorSemanas()`, `alternarSemanaGastos()`, acción `gastos-semana` | la semana más reciente con gastos va por día; el foco vuelve al botón |
| Gastos fantasma y la sugerencia girasol | `modules/dominio/gastos/view.js`, `styles/identidad.css` | `_renderFantasma()`, `.sugerencia`, acción `gastos-fantasma-descartar` | descartada por mes en `S.config.fantasmaDescartado`; "Ver cuáles" abre la hoja `hormiga` de Análisis |
| El mes sin gastos en el teléfono | `modules/dominio/gastos/view.js` | `_renderDiaNuevo()`, `_TEJAS_HOY` | las tejas abren `nuevo-gasto` con `data-categoria` (marca el radio); la pista solo sin fijos activos |
| Las poses que faltan | `modules/infra/ilustraciones.js` | `POSE_TINO_INTERINA` | `htmlTinoSol` cae en la interina; `data-pose` dice la que se ve |
| Por pagar: fijos y cuotas | `modules/dominio/compromisos/views/lista.js`, `views/hero.js` | `_FILTRO_DE_LENTE` (`fijos: 'mes'`), `_renderPorUrgencia` (rama `'mes'`), `resumenFijosDelMes({ conCuotas })` | el lote no lleva `data-tipo` en `'mes'` (paga los dos tipos); el simulador y los avisos de deudas se apagan en CSS |
| Deudas como inventario | `compromisos/views/lista.js`, `hero.js` | `_renderInventarioDeudas()`, `htmlHeroDeudas()`, acción `deudas-grupo` | en Deudas el plan va dentro de la lista |
| Límites: lista, alerta y sugerencia | `presupuesto/view.js`, `logic.js` | `_renderAlertaLimite()`, `_renderFilaEstado()`, `sinLimiteDelMes()`, `limiteDeLaAlerta()` | la sugerencia se descarta por mes y categoría |
| Nuevo límite en dos pasos | `presupuesto/view.js`, `index.js`, `logic.js` | `renderFormLimiteTelefono()`, `esLimiteDeUnaParte()` | `soloParte` cambia lo que cuenta `calcularProgreso` |
| Agregar cuenta | `tesoreria/views/cuentas.js`, `acciones/cuentas.js` | `htmlAgregarCuenta()`, `_seguirConCuenta()`, `#modal-agregar-cuenta` | el paso 3 es `#form-cuenta` o la deuda |

**Riesgos**:

- **Las pastillas de las pestañas siguen en el DOM** (`sincronizarBloqueGastos` las escribe y el nombre accesible lleva el conteo); solo no se ven en el bloque Gastos (Ahorro sí las muestra).
- **Límites pintaba sus tejas en el coral de Gastos** (GAS.7f): esa regla queda solo para las tejas sin `data-cat`.
- **El embudo (`gastos-mas-filtros`) abre el historial como `gastos-ver-historial`**: Movimientos con el dominio y sin rango, donde viven la cuenta y las fechas; no hay hoja de filtros propia.
- **`filtroDeLente('fijos')` ya no es `'fijo'` sino `'mes'`**: quien preguntaba "¿estoy en Fijos?" tiene que preguntar por `'mes'`; el vacío de la pestaña sigue siendo el de los fijos.
- **La entidad de una deuda sale de la marca de su nombre** (`resolverMarca`); sin marca, la fila dice la categoría.

**Cambios realizados**:

- 2026-11-19 GAS.8h (ADR 182 D8): Agregar cuenta en el teléfono por tipo y por entidad.
- 2026-11-19 GAS.8g (ADR 182 D7): Nuevo límite en dos pasos en el teléfono; "Solo una parte" cuenta solo lo de su subcategoría.
- 2026-11-19 GAS.8f (ADR 182 D6): Límites con su lista, una sola alerta, la sugerencia y el primer uso.
- 2026-11-19 GAS.8e (ADR 182 D5): Deudas como inventario, con dos puertas, el plan como sugerencia y su vacío.
- 2026-11-19 GAS.8d (ADR 182 D4): la segunda pestaña vuelve a ser Por pagar (`#fijos`, lente `'mes'`), con los fijos y las cuotas del mes y el lote.
- 2026-11-19 GAS.8c (ADR 182 D3): Gastos fantasma como sugerencia girasol y el mes sin gastos con Tino, las cuatro tejas y la pista de Por pagar.
- 2026-11-19 GAS.8b (ADR 182 D2): Día a día: la comparación en pesos, la barra por categoría, la franja del vencido, los chips sin total y las semanas plegadas.
- 2026-11-19 GAS.8a (ADR 182 D1): los roles de color, el tono por categoría, el resumen bosque y el encabezado coral.

---

## Gastos en cuatro pestañas (GAS.7, ADR 179)

- **Objetivo**          : el tablero "Gastos móvil, rediseño de navegación" ([ADR 179](../DECISIONS/179-gastos-en-cuatro-pestanas.md)): bajo 1024 px el bloque va en Día a día, Fijos, Deudas y Límites; el mes y el ojo bajan a la tarjeta de cada pestaña.
- **Estado actual**     : **INICIATIVA COMPLETA** (GAS.7a a GAS.7g, 2026-11-18, ADR 179 D1 a D7). Escritorio no cambia: "Por pagar" con sus cuatro chips.
- **Verificado contra** : FAC.1 (2026-11-19, ADR 180). Antes: GAS.7g (2026-11-19).

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| Las cuatro pestañas y sus marcas | `modules/ui/bloque-gastos.js` | `LENTES_BLOQUE_GASTOS`, `estadoLentesGastos()` (`vencidosFijos`, `vencidasDeudas`) | Fijos y Deudas comparten el encabezado de `#tabs-compromisos`; el punto de Límites va junto al nombre |
| Las rutas `#fijos` y `#deudas` | `modules/infra/router.js` | `SECTIONS`, `seccionDelHash()` | las dos muestran `sec-compromisos`; `renderSmart`, `markActiveNav` (sidebar), el volver y el ojo comparan por sección |
| La pestaña manda sobre el chip | `modules/dominio/compromisos/views/lista.js` | `filtroDeLente()`, `lentePorPagar()` | sin chips en la pestaña; el hero (`faltaPorPagarDelMes`) y el lote del pie cuentan solo su tipo |
| `#compromisos` en el teléfono | `modules/dominio/compromisos/index.js` | `_quedarseEnLaPestana()`, `_irAPorPagar()` | `replaceState` dentro del `hashchange`, antes que el router, que ya lee la pestaña |
| Lo que se apaga en cada pestaña | `styles/identidad.css` | bloque "GAS.7", `#sec-compromisos[data-lente]` | el simulador y los avisos de deudas en Fijos; la tarjeta del lote en las dos |
| El mes en el rótulo de cada tarjeta (D2) | `modules/infra/mes-bloque.js` | `htmlMesDelRotulo()` | botón `bloque-elegir-mes` en el teléfono; texto en escritorio |
| La hoja "Elige el mes" | `modules/ui/bloque-gastos.js`, `index.html` | `htmlHojaMeses()`, `filasHojaMeses()`, `primerMesFinko()`, `#modal-elegir-mes` | totales de `totalesDiaADiaDelAnio()` (`gastos/logic.js`); `bloque-ir-mes` pasa por `navegarMesGastos` |
| El ojo de cada tarjeta | `modules/infra/privacidad.js` | `htmlOjoTarjeta()` | Día a día y Por pagar reusan el de su hero; Límites usa este |
| La tarjeta de Límites | `modules/dominio/presupuesto/view.js` | `_renderHeroLimites()`, `resumenLimitesDelMes()` (logic) | solo bajo 1024 px |

**Riesgos**:

- **Comparar `location.hash` con `'compromisos'` deja fuera las pestañas.** Lo que pregunta "¿estoy en Por pagar?" usa `seccionDelHash()`; lo que navega a Por pagar, `_irAPorPagar()` (en el teléfono va a la pestaña, no a `#compromisos`).
- **El chip sigue vivo debajo de la pestaña**: `setFiltroPorPagar` lo fija quien llega (`porPagar:ver-compromiso`) y `lentePorPagar()` lo lee para elegir pestaña; dentro de la pestaña no se ve.

**Cambios realizados**:

- 2026-11-19 FAC.1 ([ADR 180](../DECISIONS/180-la-pantalla-final-de-registro-es-una-factura.md)): el recibo de Registrar gasto (`gastos/telefono.js`) y el resumen de `ui/preguntas.js` son una factura (`ui/factura.js`, `.factura`); la categoría es la primera fila y "Entidad bancaria" pasa a "Cuenta de origen".
- 2026-11-18 y 19 GAS.7a a 7g (ADR 179 D1 a D7): cuatro pestañas, el mes en la tarjeta, Día a día, Fijos, Deudas, Límites por estado y los vacíos; detalle en el CHANGELOG de noviembre. GAS.8 (ADR 182) cambia D1 a D7 en el teléfono.

---

## Pantalla Gastos v2 (GAS.1, ADR 039)

- **Objetivo**          : rediseño visual de `#sec-gast` a la familia v2 ([ADR 039](../DECISIONS/039-gastos-v2-visual.md)): hero del mes con total protagonista + comparativo + ojo (GAS.1a), lista agrupada por día + chips con identidad + máscara (GAS.1b), insight de gastos hormiga + empty states v2 (GAS.1c).
- **Estado actual**     : **completa** (GAS.1a a 1c, 2026-07-14). Escritorio en banda desde 1680px (DSK.3, [ADR 072](../DECISIONS/072-gastos-cabecera-de-banda-y-fila-con-cuenta.md)); bajo 1024px es la portada del bloque Gastos ([ADR 069](../DECISIONS/069-bloque-gastos-en-la-barra-movil.md) D8). `_sinInternas()` deja fuera fijos y deudas.
- **Verificado contra** : GAS.5a (2026-11-17, [ADR 161](../DECISIONS/161-dia-a-dia-tino-anota-sin-flecha.md)): `_renderEmptyState` y `.gastos-empty__guia--halo`. Lo anterior, en el CHANGELOG.

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| Hero del mes (nav integrada + label + total + comparativo) | `modules/dominio/gastos/view.js` | `_renderHeroGastos()` | renderizado por `renderFiltrosGastos()` en `#panel-filtros-gastos`, antes de los chips |
| Chip comparativo vs mes anterior | `modules/dominio/gastos/view.js` | `_renderComparativo()` | oculto con filtro activo, mes vacío o sin base; internas (TX.8b) fuera de la base. En el teléfono, pastilla blanca y "$" chico (`_conSigno`, GAS.4b) |
| Dirección y magnitud de la variación (pura) | `modules/dominio/gastos/logic.js` | `variacionMensualGasto(totalActual, totalAnterior)` | null sin base; redondeo a 0% → 'igual' |
| Ojo de privacidad del hero | `modules/dominio/gastos/index.js` | acción `gastos-saldo-visibilidad` | flip de `S.config.ocultarSaldo` + `save()` + `updSaldo()` + re-render, espejo de `agenda-saldo-visibilidad` |
| Estilos del hero | `styles/components/domain.css` | `.hero-gastos*` (bloque al final del archivo) | contraste método IV.1 documentado en el comentario del bloque |
| Ojo compartido de la familia | `styles/components/domain.css` | grupo `.hero-*__ojo` | `.hero-gastos__ojo` va **estático en grilla** `[espaciador\|nav\|ojo]`, no absoluto: la nav de mes centrada no se le solapa a 320px |
| Agrupación por día (pura) | `modules/dominio/gastos/logic.js` | `agruparPorDia(gastos)` | conserva el orden recibido; total por grupo |
| Grupo del día + label humano | `modules/dominio/gastos/view.js` | `_renderGrupoDia()`, `_labelDia()` | "Hoy"/"Ayer"/"Vie 11 jul" (+ año si no es el corriente); `formateadorFecha` cacheado |
| Ítem de la lista (máscara D9, subtítulo sin fecha) | `modules/dominio/gastos/view.js` | `_renderGastoItem(gasto, oculto)` | firma con `oculto` explícito: NO pasarla directa a `.map()` (el índice caería en `oculto`) |
| Banda de escritorio: enlace a Análisis y bloque derecho (DSK.3a, ADR 072 D1) | `styles/responsive.css` | bloque "GASTOS EN ESCRITORIO" + `.hero-gastos__link` | desde 1680px; el enlace lo emite `_renderHeroGastos()` y `domain.css` lo apaga bajo ese ancho |
| Título y subtítulo de la fila (ADR 132 D4): la nota o descripción arriba, "Categoría · Cuenta" debajo; sin texto, la categoría y la cuenta | `modules/dominio/gastos/view.js` | `textosFilaGasto()` | pura, recibe las cuentas |
| Encabezado del día ("Martes 10") y orden del riel de categorías en el teléfono (de más a menos gasto) | `modules/dominio/gastos/view.js` | `labelDiaGastos()`, `categoriasTopGastos()` | ADR 132 D3; ADR 157 D5 |
| Alineación del total del día, fila sin levantar y lista sin cascada (DSK.3b, ADR 072 D4/D5/D7) | `styles/responsive.css` | bloque "LISTA DE GASTOS EN ESCRITORIO" | desde 1680px; la reserva del encabezado se calcula con los tokens de la columna de acciones, no con un número fijo |
| Chips con identidad de sección | `styles/components/domain.css` | `button.chip--gastos.chip--active` | patrón D.16b: tinte 12% + borde 50% + anillo, texto primario (medición en ADR 039 D5) |
| Estilos de grupos por día | `styles/components/domain.css` | `.gastos-dia*` | `.list-item` gana radio lg + sombra por contenedor (criterio MC.18d) |
| Insight de gastos hormiga | `modules/dominio/gastos/view.js` | `_renderInsightHormigas(delMes, oculto)` | consume `detectarHormigas()` (logic.js); solo vista "Todos", monto respeta el ojo |
| Empty states v2 | `modules/dominio/gastos/view.js` | `_renderEmptyState()` (`_renderEmptyFiltro()` se borró en DIS.4: era inalcanzable) | anatomía `.cal-empty`; clases `.gastos-empty*` (el genérico `.empty-state` ya no se usa aquí) |
| Estilos del insight y los empty | `styles/components/domain.css` | `.gastos-insight*`, `.gastos-empty*` | contraste del glifo documentado en el comentario del bloque |

**Riesgos**:

- **La lista del mes cierra con una salida al historial completo** (2026-08-21, ficha 15, [ADR 089](../DECISIONS/089-movimientos-la-quinta-fuente-y-cuatro-puertas.md) D3). `_renderSalidaHistorial()` en `view.js` y la accion `gastos-ver-historial` en `index.js`, que emite `movimientos:ver` con el dominio y **sin rango**: el reloj de mes de este bloque es justo lo que el historial sirve para saltarse. Va al pie y por EventBus, sin import cruzado (ADN 10).
- **`renderFiltrosGastos()` normaliza el filtro ANTES de pintar el hero** (si la categoría activa desapareció del mes, resetea a "Todos"): si se reordena ese cuerpo, el hero puede calcular el total con un filtro fantasma.
- La franja `_renderResumen` y sus clases `.gastos-resumen*`, y la barra `.mes-nav*`, **ya no existen**; cualquier referencia externa que aparezca es código muerto.
- **`_renderGastoItem(gasto, oculto)` cambió de aridad en GAS.1b**: pasarla directa a `.map()` pondría el índice en `oculto` (ítems 1+ enmascarados siempre); el caller usa arrow explícita. Mantener así.
- El ink `--fk-dom-gastos-text` sobre el tinte 12% en tema claro mide **4.39:1** (bajo AA para texto pequeño): por eso el chip activo usa texto primario. No "corregir" el chip a texto naranja sin re-medir.
- **El label del hero nombra el mes visible, nunca "este mes" (DIS.4/G1, regla R10)**: la nav de mes vive dentro del mismo hero, así que un label fijo atribuía el total al mes equivocado en cuanto se tocaba "‹". Con filtro activo es `{categoría} en {mes}`: la categoría sin el mes también pierde información.
- **La grilla móvil de la fila de gasto es propia de la sección** (`responsive.css`, `@media (max-width: 539px)`, scope `.gastos-dia`), no la genérica de `.list-item:has(.list-item__meta)`. Dos trampas: la capa `responsive` le gana **por orden** a `components`, así que esta corrección NO funciona desde `domain.css`; y sus `grid-template-areas` tienen que ser rectangulares (un área en L invalida la declaración entera y el navegador la descarta en silencio).
- **La barra de filtros envuelve en escritorio y se desliza en el teléfono (GAS.4b, excepción de R9)**: el override de `#panel-filtros-gastos` en `domain.css` envuelve; el riel del teléfono vive en `identidad.css` (bloque GAS.4b). La base de `.filtros-bar` la comparten Movimientos y el asistente de distribución: no tocarla.
- **El tope de la navegación se calcula en `_mesTope()` sobre `S.gastos`** (mes corriente, o el del gasto más reciente si es posterior). Si alguna vez la sección deja de mostrar todos los gastos no internos, ese cálculo hay que revisarlo con ella o "›" quedará habilitado hacia meses vacíos.
- **`_renderEmptyState()` tiene dos textos, no uno**: en un mes que no es el corriente no ofrece registrar (el formulario abre con la fecha de HOY y el gasto caería en otro mes), sino volver. Agregar un CTA de registro ahí reabre el hallazgo H8.
- **El vacío del mes corriente (GAS.3, ADR 156 D2; GAS.5a, ADR 161 D1):** en escritorio Tino explica y el registro es el primario del encabezado; en el teléfono, desde GAS.8c (ADR 182 D3), es `_renderDiaNuevo()` con su propio botón y las cuatro tejas (el halo del botón central salió).

**Cambios realizados**:

- 2026-11-17 SAL.1: sale `tino-anota.svg` (compuesto, no es arte de Esteban); el vacío vuelve a `explica` hasta su SVG.
- 2026-11-17 GAS.5a ([ADR 161](../DECISIONS/161-dia-a-dia-tino-anota-sin-flecha.md) D1): el vacío de Día a día trae a Tino anotando en una libreta y deja la flecha punteada; el halo del botón central se queda.
- 2026-11-16 GAS.4b (ADR 157 D4-D6): el total con el "$" chico y el comparativo blanco; sale "+ $X en fijos y deudas"; las categorías en un riel deslizable de más a menos gasto, sin "+N".
- 2026-11-16 GAS.4a ([ADR 157](../DECISIONS/157-gastos-encabezados-sin-registro-y-lista-del-mes.md) D1): la cabecera del bloque va en una fila (nombre, pastilla "‹ Noviembre ›", lupa y ojo), sin "Todo el dinero que se te va" ni el espejo "+ Gasto"; registrar es el botón central.
- 2026-11-15 (SUS.1b, [ADR 146](../DECISIONS/146-finko-reconoce-el-tipo-de-gasto.md) D5): el chip "Gastos hormiga" sale de `CATEGORIAS_GASTO_USUARIO` (escritorio y teléfono); hormiga es lo que Finko reconoce por monto. Sigue en `CATEGORIAS_GASTO`: los gastos guardados conservan su ícono y, al editarlos, se re-elige la categoría como con Vivienda.
- 2026-11-15 SUS.2d: la hoja y la ficha del gasto dicen si su concepto es gusto o necesidad y dejan corregirlo (`htmlCaracterGasto`, acción `gasto-caracter`).
- 2026-11-15 SUS.2c ([ADR 147](../DECISIONS/147-gusto-o-necesidad-hormiga-sin-adivinar.md) D1): si algo "depende" se repite sin respuesta, la tarjeta del aviso pregunta "¿es un gusto o algo que necesitas?" (`preguntaHormiga`, `htmlPreguntaHormiga`, acción `gastos-gusto-o-necesidad`); la respuesta va a `S.config.hormiga.conceptos` (v53).
- 2026-11-06 (ADR 132 tanda 4): la hoja "Nuevo gasto" pregunta en frase ("¿Cuánto gastaste?", "¿En qué?", "¿De qué cuenta sale?", "¿Cuándo?"), sin "COP"; en el teléfono el monto va a la izquierda y la cuenta se pliega con "Cambiar" (`renderSelectorCuenta`, acción `cuenta-sel-cambiar` en `ui/actions.js`).
- 2026-11-05 (ADR 132 tanda 1): mes sin cajas, chips con las tres categorías de más gasto, días "Martes 10", fila con la nota arriba, historial como enlace y vacío con su botón dentro del banner.
- 2026-07-14 a 2026-11-04: GAS.1a a 1c (ADR 039), ficha 07 (ADR 069 D8), DIS.4, APR.3e (Familia y `gasto:registrar`), MV2.1 (ADR 098) y MV2.3 (ADR 119 D2 y 122 D5): detalle en el CHANGELOG de cada mes ([`changelog/`](../changelog/)).

---

