# Changelog - Finko Claude

> Revisado: 2026-11-19.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-11)

### feat(cuentas): GAS.9d, la tarjeta de crédito nace y se administra en Mis cuentas · 2026-11-19

[ADR 183](DECISIONS/183-gastos-que-cuadran.md) D4, sobre el modelo del [ADR 051](DECISIONS/051-tarjeta-de-credito-producto-integrado.md). Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v812.

- **La puerta:** "Agregar cuenta" (Efectivo, Cuenta de ahorros, Cuenta corriente, Tarjeta de crédito) es la única que crea una tarjeta; su formulario se llama "Nueva tarjeta de crédito". Deudas ya no ofrece el chip y dice "Agrégala en Mis cuentas", que abre esa misma puerta.
- **La administración:** la fila de la tarjeta en Mis cuentas abre su hoja: cupo, disponible, pagar, sacar un avance, editar y eliminar; "Ver la deuda" lleva a Deudas. Desde Deudas la hoja lleva a Mis cuentas.
- **Lo revisado del modelo:** el cupo no es dinero propio ni ingreso; la compra sube la deuda una vez y no toca cuentas; el pago la baja y sale de una cuenta. Las tarjetas de antes siguen iguales.
- Pruebas: `tarjeta-en-mis-cuentas.test.js` (la puerta, la hoja y la contabilidad); E2E de "Agregar cuenta", la pista de Deudas y la hoja desde Mis cuentas; las de tasa alta y MV2 usan un crédito. Unitarias 6351/6351, E2E 576/576.

### fix(fijos): GAS.9c, el vencimiento se cuenta desde el último pago · 2026-11-19

[ADR 183](DECISIONS/183-gastos-que-cuadran.md) D3, cambia la regla por mes de `vencidosSinPagar` (CAL.5b, HF.0d). Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v811.

- **La causa:** el vencimiento solo miraba el mes en curso. Disney+ del 15 de julio sin pagos decía el 19 de noviembre "Venció hace 4 días".
- **La regla** (`pendientesDeObligacion`): las fechas de la obligación salen de su creación y su frecuencia; el último pago cubre la fecha de su mes y todo lo de antes; lo que vence después y ya pasó está pendiente. Una deuda con abono parcial sigue pendiente por lo que falta; una compra con la tarjeta no es pago.
- **Lo que se ve:** el atraso se cuenta desde la fecha pendiente más vieja y se dice en meses desde 31 días; la franja de Día a día dice cuántos pagos y lo que suman; el lote, Inicio y el Calendario traen lo vencido de meses anteriores.
- **Avisos:** una obligación vencida no avisa además "vence en N días" dentro del mismo mes.
- Pruebas: `vencimiento-desde-ultimo-pago.test.js` (el caso Disney+, pagos al día, mismo mes, bimestral, deudas, tarjeta, lote y avisos); semillas de `avisos`, `estado-obligacion`, `vencimiento-unico` y `gastos-pestanas` nacidas en su ciclo. Unitarias 6339/6339, E2E 574/574.

### fix(gastos): GAS.9b, cada pestaña con su resumen · 2026-11-19

[ADR 183](DECISIONS/183-gastos-que-cuadran.md) D2, cambia el D4 del [ADR 182](DECISIONS/182-gastos-cada-cosa-con-su-forma-y-su-color.md). Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v810.

- **Día a día:** fuera todo pago de un fijo o de una deuda aunque se le haya cambiado la categoría a mano (`compromisoId` sin `consumoTC`); una compra con la tarjeta sí cuenta. Mismo criterio en la tarjeta y en la hoja de meses (`esDelDiaADia`).
- **Fijos:** la segunda pestaña vuelve a llamarse así y solo tiene fijos: lista, tarjeta "Pagaste $X de $Y", lote y pastilla. Deja la mezcla con las cuotas de GAS.8d.
- **Deudas:** la línea de la tarjeta habla del mes del encabezado: lo pagado en cuotas, y en un mes pasado, lo que se pagó ese mes.
- **Por pagar** (desde Inicio o un aviso) cae en la pestaña del tipo que se pidió o en la que tiene algo vencido.
- Pruebas: unitarias de `esDelDiaADia`, la línea de Deudas y `lentePorPagar`; E2E del botón central, Ahorro y MV2 al día con Fijos. Unitarias 6321/6321, E2E 574/574.

### fix(gastos): GAS.9a, la raya café al cambiar de pestaña · 2026-11-19

[ADR 183](DECISIONS/183-gastos-que-cuadran.md) D1. Ficha: [`contexto/gastos.md`](contexto/gastos.md), partida en [`contexto/gastos-registro.md`](contexto/gastos-registro.md). SW v809.

- **La causa:** la tarjeta compacta de Día a día (GAS.7c) quedaba encendida al irse a otra pestaña: su `IntersectionObserver` no avisa si el cruce no cambia, y con la sección oculta la tarjeta mide 0. Al volver se pintaba fija bajo las pestañas y asomaba su borde coral.
- **El arreglo:** con la tarjeta en 0 la compacta se apaga, y cada `hashchange` la apaga y la vuelve a observar (`_enlazarCompactaAlNavegar`). Pasa a bosque, como el resumen.
- **Las pestañas:** recorridas con toques en Chromium y WebKit, responden y la marcada es la que se ve; no había fallo de navegación que corregir.
- **Docs:** la ficha de Gastos pasaba su techo; el registro de un gasto (formulario, confirmación y "Repetir") pasa a `contexto/gastos-registro.md` sin cambios.
- Pruebas: E2E `gastos-pestanas` (las cuatro pestañas con toques y la compacta al volver). Unitarias 6318/6318, E2E 574/574.

### feat(cuentas): GAS.8h, Agregar cuenta por tipo y por entidad · 2026-11-19

[ADR 182](DECISIONS/182-gastos-cada-cosa-con-su-forma-y-su-color.md) D8. Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v808.

- **La hoja** (`#modal-agregar-cuenta`, `htmlAgregarCuenta`): "Paso 1 de 3", "¿Qué quieres agregar?" en Dinero tuyo (Efectivo, Cuenta de ahorros, Cuenta corriente) y Dinero prestado (Tarjeta de crédito, con la tarjeta dibujada); con la primera cuenta, Tino saluda.
- **El paso 2:** el buscador y la grilla de bancos y billeteras con su logo, y "¿No está tu entidad? Escríbela"; en la tarjeta, la tarjeta dibujada con el banco elegido y "Continuar con {banco}".
- **El paso 3:** `#form-cuenta` con el banco y el tipo puestos, en el saldo (`data-preguntas-inicio` con el id de una pregunta, `ui/preguntas.js`); la tarjeta abre la deuda con su categoría y su nombre.
- `nueva-cuenta` en el teléfono abre la hoja; escritorio, el formulario de siempre.
- Pruebas: E2E `formularios-telefono` (efectivo, tarjeta, entidad escrita, buscador), `movil-mv2`, `registrar-sheet` y `boton-central`. Unitarias 6318/6318, E2E 572/572.

### feat(limites): GAS.8g, Nuevo límite en dos pasos · 2026-11-19

[ADR 182](DECISIONS/182-gastos-cada-cosa-con-su-forma-y-su-color.md) D7; cambia el ADR 164 D2 para el límite de una parte. Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v807.

- **La hoja** (`renderFormLimiteTelefono`): "Paso 1 de 2 · Dónde" con su barra; la categoría con "Este mes: $X en N gastos" y "Cambiar" (o la lista de las que no tienen límite), "Toda la categoría" o "Solo una parte" y una opción por subcategoría con lo que llevas; "Siguiente: ¿cuánto?". El paso 2 pide el máximo con la pista del mes.
- **Solo una parte** (`soloParte`, `esLimiteDeUnaParte`, `gastadoDeLaParte`): el límite cuenta solo lo de su parte; la fila dice "Restaurantes · Domicilio".
- Es el mismo `#form-presupuesto` con los mismos campos: lo guarda `_guardarPresupuesto`. Acciones `limite-elegir-categoria`, `limite-cambiar-categoria`, `limite-modo`, `limite-parte` y `limite-paso`.
- Pruebas: `limites-subcategoria` (unitaria), E2E `gastos-pestanas` (de la hoja a la fila). Unitarias 6318/6318, E2E 569/569.

### feat(limites): GAS.8f, Límites con su lista, la alerta y la sugerencia · 2026-11-19

[ADR 182](DECISIONS/182-gastos-cada-cosa-con-su-forma-y-su-color.md) D6; cambia el ADR 179 D6 (los grupos por estado). Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v806.

- **La tarjeta:** "Te queda para gastar en {mes}", "Usaste $X de $Y en tus N límites", la barra y su pie ("76 % usado", "Faltan 11 días para cerrar el mes"); sin límites no hay tarjeta.
- **Una alerta** (`limiteDeLaAlerta`): la del límite más cerca, en ámbar con Tino; sin uno cerca, la del más pasado, en rojo. "Ver" abre su hoja.
- **Tus límites:** una lista con "· N activos" y "+ Nuevo"; cada fila dice "Usaste $X de $Y", lo que queda o "por encima" y la barra con su pastilla (Te pasaste, Cerca, Vas bien).
- **La sugerencia** (`sinLimiteDelMes`, `categoriaParaSugerirLimite`): la categoría sin tope con más gastos, con "Poner límite a {categoría}" y "Ahora no" (acción `limites-sugerencia-descartar`). Debajo, "Otras categorías sin límite" con su suma y cuántos gastos.
- **Primer uso:** "¿Qué es un límite?" con Tino y los tres pasos, "Empieza por {la que más usas}" y las demás.
- Pruebas: `presupuesto` (unitaria), E2E `gastos-pestanas`, `movil-mv2` y `smoke` (el reloj del bloque, ahora con un límite). Unitarias 6314/6314, E2E 568/568.

### feat(deudas): GAS.8e, Deudas como inventario · 2026-11-19

[ADR 182](DECISIONS/182-gastos-cada-cosa-con-su-forma-y-su-color.md) D5; cambia el ADR 179 D5 (Deudas con las cuotas del mes). Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v805.

- **La tarjeta** (`htmlHeroDeudas`): "Debes en total", "Este mes pagas $X en cuotas" y la barra partida en entidades y personas con su leyenda; con el ojo puesto no va la barra.
- **Dos puertas** (acción `deudas-grupo`, `setGrupoDeudas`): "Con entidades" y "Con personas" con su conteo; la elegida con el borde del color del texto y su frase debajo.
- **La fila** (`_renderFilaInventario`): la teja de la marca, la tarjeta dibujada (`--fk-tarjeta-dibujo`) o las iniciales; de quién es y cómo se paga; "te falta"; la barra "N % pagado" en verde o "N % del cupo" en gris; la pastilla "Cuota vencida hace N días · Pagar" abre el abono.
- **Al pie:** en entidades, "¿Cómo salir más rápido?" como sugerencia girasol (`htmlEntradaPlanSalida({ sugerencia })`) y "Agregar deuda con una entidad"; en personas, la pista de Me deben y "Agregar deuda con una persona".
- **El vacío:** "¿Le debes dinero a alguien?" con Tino separando (pose interina), los dos caminos y Tino tranquilo.
- Pruebas: `gastos-pestanas` (unitaria y E2E), E2E `movil-mv2` (la pastilla abona y la fila abre su hoja; el plan en la sugerencia). Unitarias 6307/6307, E2E 568/568.

### feat(fijos): GAS.8d, Por pagar con fijos y cuotas · 2026-11-19

[ADR 182](DECISIONS/182-gastos-cada-cosa-con-su-forma-y-su-color.md) D4; cambia el ADR 179 D1 y D4 (la pestaña Fijos). Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v804.

- **La lente `'mes'`:** `#fijos` sigue siendo el hash, pero `filtroDeLente` da `'mes'`: la lista junta fijos y cuotas por semana (Vencido, Esta semana, Más adelante, Pagado); la fila de un fijo no repite "gasto fijo" y la de una cuota dice de qué deuda es. Las saldadas viven en Deudas.
- **La tarjeta:** "Te falta pagar en {mes}" con lo pagado de los dos (`resumenFijosDelMes({ conCuotas })`), sin hablar de lo que debes.
- **El lote vuelve:** sin `data-tipo` paga los dos tipos; el simulador y los avisos de deudas se apagan en `'mes'`.
- **A dónde se llega:** `lentePorPagar()` da Por pagar salvo el chip de deudas; "ver un compromiso" (la franja de Día a día, Inicio) cae en Por pagar, y una deuda saldada en Deudas. El botón central en Por pagar pregunta qué agregar (la hoja de tres tipos).
- Pruebas: `gastos-pestanas`, `bloque-gastos`; E2E `movil-mv2` (el lote de dos y el texto al 200 %), `boton-central` y `hub-ahorros`. Unitarias 6304/6304, E2E 568/568.

### feat(gastos): GAS.8c, Gastos fantasma y el mes sin gastos · 2026-11-19

[ADR 182](DECISIONS/182-gastos-cada-cosa-con-su-forma-y-su-color.md) D3 y D9; cambia el ADR 179 D7 (los tres caminos de la primera vez). Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v803.

- **Gastos fantasma:** en el teléfono el aviso de deseos pequeños pasa a ser la sugerencia girasol (`.sugerencia`, la reusan Deudas y Límites): Tino, "12 cafés y antojos pequeños ya suman $108.000 este mes", "Ver cuáles" (la hoja `hormiga` de Análisis) y la equis, que la descarta en ese mes (`S.config.fantasmaDescartado`). Va después del primer día; la pregunta de SUS.2c sigue arriba. Escritorio no cambia.
- **El mes sin gastos:** `_renderDiaNuevo()` con Tino explica, "Aquí verás en qué se va tu dinero" (o "Todavía no hay gastos en noviembre" con historia) y su botón; "¿En qué gastaste hoy?" con Mercado, Comida, Transporte y Café, que abren el gasto con su categoría marcada; y, sin fijos, la pista de Por pagar. El halo del botón central salió del teléfono.
- **Las poses que faltan:** `POSE_TINO_INTERINA` (fantasma con lupa, atajando y separando explica, sorprendido pensando) hasta que lleguen los SVG.
- Pruebas: `gastos-pestanas.test.js` (el vacío y Gastos fantasma); E2E `gastos-registro` (una teja abre el gasto con su categoría) y `gastos-pestanas` (la pista lleva a Por pagar). Unitarias 6305/6305, E2E 568/568 ("perder el teléfono" de `nube.test.js` pasó al reintento).

### feat(gastos): GAS.8b, Día a día como el tablero · 2026-11-19

[ADR 182](DECISIONS/182-gastos-cada-cosa-con-su-forma-y-su-color.md) D2; cambia el ADR 179 D3 (los chips con su total y el comparativo en porcentaje). Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v802.

- **La comparación en pesos:** `comparacionDelMes` corta el mes anterior en el día de hoy ("$48.000 menos que octubre a esta altura del mes"); en un mes cerrado compara contra el mes entero. Sin base, la tarjeta cuenta los gastos.
- **El reparto por categoría:** una barra con un tramo por categoría en su tono (`--fk-cat-*-barra`, igual en los dos temas) y la leyenda de las dos primeras con su porcentaje; "Categorías ›" va a Análisis. El ojo tapa la barra.
- **La franja de alerta** (`.franja-alerta`, roja y ámbar): el vencido dice cuántos, el más antiguo con su monto y desde cuándo, y "Pagar". La usará también Límites.
- **Los filtros:** el embudo (`gastos-mas-filtros`, abre el historial de Gastos) y los chips de 36 sin total, con la elegida al frente y su zona de 44 dentro del riel.
- **Las semanas:** `semanasDelMes` agrupa de lunes a domingo; la más reciente con gastos va por día y las anteriores se pliegan en "Semanas anteriores" (`gastos-semana`, el foco vuelve al botón).
- **Con un chip:** "el 22 % de lo que gastaste este mes" y, si hay límite, su ficha con lo que queda, la barra y "91 % de $170.000 · faltan 11 días".
- Pruebas: `dia-a-dia.test.js` (comparación, reparto y semanas) y `gastos-pestanas.test.js`; en E2E, `movil-mv2` mide la fila de vuelta ya quieta (con las semanas plegadas puede caer en el primer día, que entra en cascada). Unitarias 6302/6302, E2E 568/568.

### feat(gastos): GAS.8a, cada cosa con su forma y su color · 2026-11-19

[ADR 182](DECISIONS/182-gastos-cada-cosa-con-su-forma-y-su-color.md) D1; cambia el ADR 179 D2 (el ojo), el ADR 127 D5 en el bloque Gastos del teléfono y el ADR 157 D4. Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v801.

- **Un color por trabajo:** tokens nuevos en los dos temas para el resumen (bosque, igual en claro y oscuro), la alerta (rojo), el acercarse (ámbar), "vas bien", la sugerencia (girasol), el filtro (neutro, la elegida invertida), el riel de las pestañas y el coral de la sección. Las piezas de Día a día, Deudas y Límites que los usan llegan en GAS.8b a 8f.
- **Cada categoría con su tono:** `TONO_CATEGORIA` da el tono de los nueve del tablero y el de las parientes; `tejaCategoria` lo pone como `data-cat` y la teja deja el coral de Gastos (y el de Límites, GAS.7f, que ahora solo queda en las tejas sin tono).
- **El encabezado:** la teja coral con el recibo, "Gastos", y la lupa y el ojo en círculos de 44. El ojo vuelve a la fila y tapa la lente de su encabezado; los de las tarjetas se apagan. Las pastillas de las pestañas no se ven, pero su conteo sigue en el nombre accesible.
- **El "$" del mismo tamaño** que la cifra en las tarjetas del bloque.
- Pruebas: `tono-categoria.test.js` (cada tono con su token en los dos temas y su regla de teja); `bloque-gastos.test.js` (la fila y el ojo de cada lente); `hub-ahorros` y `smoke` leen el estado de las pestañas en su nombre y el ojo en la fila. Unitarias 6290/6290, E2E 568/568.

### fix(inicio): INI.6d, la junta del encabezado y el saldo sin raya (cierra INI.6) · 2026-11-19

[ADR 181](DECISIONS/181-inicio-bancos-y-efectivo-y-la-hamaca-que-cabe.md) D4. Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v800.

- **El origen:** el fondo de bosque lo pintan dos cajas que se tocan (`.perfil-inicio` y `.hero-inicio`). A densidad 2,625 (muchos Android de 412 px) la junta caía a medio píxel físico: cada caja pintaba media fila suavizada y se veía el fondo de la página, una fila con luminancia 44 entre filas de 62, que aparecía y desaparecía según la posición del desplazamiento. No era borde, sombra ni elemento fijo; a densidad 3 no pasa.
- **El arreglo:** el saldo sube 1 px sobre el encabezado (margen -1, relleno +1 y el centro de sus círculos 1 px más abajo), así la fila cae sobre el mismo verde. Nada se mueve: el rótulo y el borde de abajo quedan donde estaban.
- **Una segunda causa, con puntero:** en una ventana angosta con mouse (o una tableta con puntero), pasar sobre el saldo lo levantaba 2 px ("levantar lo que se pulsa" de DSK.10c, `layout.css`) y abría la misma raya al desplazar con la rueda. La banda del teléfono ya no se levanta.
- Pruebas: `inicio-rediseno.test.js` a 412 x 640 y densidad 2,625 (el saldo monta 1 px, no se levanta con el puntero encima y, en cuatro posiciones del desplazamiento, ninguna fila de la junta se aparta de la media). Unitarias 6285/6285, E2E 568/568 ("dos dispositivos abiertos" de `nube.test.js` pasó al reintento).

### feat(inicio): INI.6c, la luna se queda quieta · 2026-11-19

[ADR 181](DECISIONS/181-inicio-bancos-y-efectivo-y-la-hamaca-que-cabe.md) D3; cambia el ADR 155 D1 y D5. Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v799.

- **La luna sale del dibujo:** el disco crema eran 8 formas de `tino-hamaca.svg` intercaladas con Tino y la hamaca; se borran esas 8 líneas (249 formas quedan, ningún trazo ni color de Tino cambia) y la luna es `.todo-al-dia__luna`, un círculo de `--fk-tino-luna` con el centro y el radio del `viewBox` (460,42; 667,56; 341,58).
- **Se mece la imagen, no la caja:** el ladeo de 1,3 grados pasa de `.todo-al-dia__mece` a `.todo-al-dia__tino`, con el mismo origen; la caja conserva tamaño, colgado y medida (`ui/hamaca.js` no cambia).
- De paso (D2): la escena deja su relleno lateral de 8 px y el mensaje usa el ancho del tablero; a 360 x 640 cabe en una línea y la hamaca mide 204, como el tablero (antes 186).
- Comparado píxel a píxel con la composición aprobada a 320 de ancho, en los dos temas: igual salvo el suavizado del contorno del disco (0,4 % de los píxeles, todos en el borde).
- Pruebas: `nino-visual.test.js` (249 formas, la luna antes de Tino y su color) e `inicio-rediseno.test.js` (Tino se mece y la luna no se mueve, centrada y del 74,4 % de la caja; con "reducir movimiento", quieto). Unitarias 6285/6285, E2E 567/567.

### feat(inicio): INI.6b, la hamaca cabe con su mensaje · 2026-11-19

[ADR 181](DECISIONS/181-inicio-bancos-y-efectivo-y-la-hamaca-que-cabe.md) D2; cambia el ADR 155 D2 y D4. Tablero "Mejoras visuales de Inicio" (360 x 640, donde "Registrar" tapaba el mensaje). Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v798.

- **`ui/hamaca.js`** mide en el navegador el borde del saldo, el alto real del mensaje y el tope de "Registrar", y deja en `--hamaca-libre` el ancho con el que todo cabe con 12 px de aire. Observa encabezado, saldo, título y texto (`ResizeObserver`) y el alto de la ventana; usa `offsetTop`, que no ve el desliz de entrada de las celdas. Con las cuentas abiertas conserva la medida.
- **El ancho:** 78 % del ancho, de 120 a 300 (el tablero dice 160 de piso; a 320 x 568 el mensaje quedaba bajo la barra). Sale la estimación fija `100svh - 420px`, que queda solo antes de medir.
- **El mensaje** del tablero: título de 22/28 a 12 del dibujo y texto de 14/20 a 4, equilibrado en dos líneas.
- Fuera de alcance, anotado en el ADR: el armazón del teléfono reserva la barra dos veces y en pantallas bajas cualquier sección se desplaza unos 40 px de vacío.
- Pruebas: `hamaca.test.js` (la cuenta) e `inicio-rediseno.test.js` (sobre "Registrar" a 360 x 640, 375 x 667, 320 x 568 y 412 x 915, con letra de 20 px y al cambiar el alto; a 390 x 844, 300 de ancho y el título en 599). Unitarias 6284/6284, E2E 567/567.

### feat(inicio): INI.6a, bancos y efectivo en la ficha del saldo · 2026-11-19

[ADR 181](DECISIONS/181-inicio-bancos-y-efectivo-y-la-hamaca-que-cabe.md) D1; cambia el ADR 126 D2 y el 152 D1 y D2 en el teléfono. Tablero "Mejoras visuales de Inicio", variante A. Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v797.

- **La ficha partida:** "Bancos" con los logos de sus cuentas y "Efectivo" con su teja, cada uno con su monto, en lugar de "En efectivo y 2 cuentas". Un lado sin cuentas se calla y el otro ocupa la ficha; el ojo tapa los dos montos.
- **`repartoBancosEfectivo`** (`tesoreria/logic/cuentas.js`) usa la regla de Retirar efectivo (`esCuentaEfectivo`, que `render.js` ahora comparte): billeteras y "Otro" van con los bancos, y los dos lados suman `calcularTotalCuentas`. Sale `etiquetaCuentas`, que ya no tenía uso.
- **Abierta**, las cuentas van en "En bancos" y "En efectivo". El saldo baja su relleno de 28 a 22 para que su borde siga en 268 con la ficha de 56.
- Pruebas: `tesoreria.test.js` (el reparto suma el total, la cuenta vieja sin `banco`), `render.test.js` (los lados, el que se calla, la máscara, los grupos, un retiro de cajero), `inicio-rediseno.test.js` a 390 y 360 (centrada, 56 de alto, montos enteros) y el pago que la actualiza; `smoke.test.js` ajustada. Unitarias 6280/6280, E2E 562/562.

### feat(inversion): MK.3b, dónde está una inversión (cierra MK.3) · 2026-11-19

[ADR 172](DECISIONS/172-las-marcas-que-faltaban.md) D5 y D6. Ficha: [`contexto/inversion.md`](contexto/inversion.md). SW v796.

- **"¿Dónde la tienes?"**, opcional: los bancos y billeteras de `BANCOS_CO` (sin Efectivo ni Otro) y, en su grupo, las plataformas del tag `inversion` de `MARCAS` (trii, Wenia). Se guarda el id en `entidad` (sin migración); una inversión sin entidad se ve como antes. En el teléfono va en "Agrega si quieres" con el desplegable de Finko.
- **La fila y la hoja** pintan el avatar del banco o la teja de la plataforma (`tejaInversion`).
- **Wenia sugiere Cripto**, que se puede cambiar. Finko no recomienda ni califica plataformas.
- **Cripto** suma: "Las atadas al peso o al dólar no buscan subir, y tampoco tienen el seguro de depósito de una cuenta de ahorros." (D6).
- Pruebas: `inversion-entidad.test.js` unitaria (la lista, validar, normalizar, Wenia y el texto) y E2E a 390 (trii con su teja, Bancolombia con su avatar, sin entidad el ícono de siempre). Unitarias 6273/6273, E2E 560/560.

### feat(ahorro): AH.9, ¿dónde lo guardas? · 2026-11-19

[ADR 174](DECISIONS/174-donde-lo-guardas.md) D2 a D5. Fichas: [`contexto/ahorro.md`](contexto/ahorro.md) y [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md). SW v795.

- **`guardadoEn: { cuentaId, bolsillo }`** (sin migración) en la meta, la reserva y el fondo, con `infra/guardado-en.js` (los cuatro dominios lo usan sin importarse). Es solo referencia: ningún cálculo de saldo, patrimonio ni distribución lo lee; si la cuenta se elimina o se desactiva, se ignora.
- **El campo** "¿Dónde lo guardas?": la cuenta (sin elegir de entrada) y el nombre del bolsillo, opcionales. En el teléfono va en "Agrega si quieres" y su fila del resumen dice "Nequi, bolsillo Viaje".
- **Cómo se ve:** la ficha de la meta y de la reserva suma "Guardado en · Nequi, bolsillo Viaje"; la nota del fondo, "Guardado en Nequi, bolsillo Colchón."; la hoja de la cuenta suma **"Guardado aquí"** con cada meta, reserva o fondo y su monto (con el ojo de Mis cuentas), y las dos frases: "Este dinero ya salió del saldo de la cuenta: lo apartaste" y "Tu fondo está dentro de este saldo".
- **El aporte propone esa cuenta** (D4) en la meta y la reserva; el fondo no pide cuenta.
- **"Tu colchón para emergencias"** sobre el fondo (D5), en el teléfono y en escritorio.
- **El resumen de preguntas:** "Meta" y "Reserva" llevan la etiqueta y "Guardado en", la cuenta (antes el dinero y un documento).
- Pruebas: `guardado-en.test.js` unitaria (leer, validar, dónde está, qué dice estar en una cuenta, normalizar) y E2E a 390 (la meta en Nequi, bolsillo Viaje, aparece en la hoja de Nequi con su monto, su ficha lo dice y aportar propone Nequi). Unitarias 6268/6268, E2E 559/559.

### feat(cuentas): MC.20c, la tarjeta como origen del retiro (cierra MC.20) · 2026-11-19

[ADR 171](DECISIONS/171-transferir-y-retirar-a-donde-fue-el-dinero.md) D3. Ficha: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md). SW v794.

- **"Sale de"** de Retirar efectivo trae las tarjetas con cupo en su grupo ("Tarjetas de crédito", con el cupo disponible). Elegir una cierra la hoja y abre **"Sacar un avance"** de esa tarjeta (ADR 169) con el monto ya escrito y Efectivo como destino: sacar dinero con cupo es un avance, no un retiro. Nunca se guarda una transferencia con cupo (ADR 051 D4).
- La tarjeta se invoca por nombre (`registrar-abrir` con `abrir-avance` y `data-monto`): Mis cuentas no importa Por pagar (ADN 10).
- Pruebas: E2E `retiro-tarjeta` (elegir la tarjeta abre Sacar un avance con $300.000 escritos). Unitarias 6263/6263, E2E 558/558.

### feat(registrar): MC.20b, "Transferir o retirar" en la hoja de registrar · 2026-11-19

[ADR 171](DECISIONS/171-transferir-y-retirar-a-donde-fue-el-dinero.md) D2. Ficha: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md). SW v793.

- **La fila** "Transferir" pasa a **"Transferir o retirar"** ("A tu cuenta, a otra persona o en el cajero") y aparece con una sola cuenta.
- **"¿A dónde fue el dinero?"** (`opcionesTransferirORetirar`, la vista de destinos de Abono y Aporte): A otra cuenta tuya (dos cuentas o más), Lo saqué en efectivo (una cuenta que no sea efectivo), Pagué algo de Por pagar (algo pendiente este mes, antes que el gasto), Le pagué algo a alguien (Registrar gasto) y Le presté dinero (Nuevo préstamo). Cada opción abre el registro de siempre; `ui/registrar.js` sigue sin importar dominios (invoca por nombre con `registrar-abrir`).
- Pruebas: unitarias de qué opciones salen según las cuentas y lo pendiente del mes; E2E `registrar-transferir` (con una cuenta, "Le presté dinero" abre Nuevo préstamo y "Lo saqué en efectivo" abre Retirar efectivo) y `registrar-destinos` al día. Unitarias 6263/6263, E2E 557/557.

### feat(cuentas): MC.20a, Retirar efectivo · 2026-11-19

[ADR 171](DECISIONS/171-transferir-y-retirar-a-donde-fue-el-dinero.md) D3 (sin la tarjeta) y D4 a D6. Ficha: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md). SW v792.

- **"Retirar efectivo"** junto a "Transferir entre cuentas" en Mis cuentas, con una cuenta que no sea efectivo (transferir sigue pidiendo dos). Es la misma hoja con `data-modo="retiro"`: sale de las cuentas que no son efectivo, llega a Efectivo (si hay varias se elige; si no hay, se crea en $0 al guardar y recibe el retiro) y en el teléfono va en dos etapas, como Transferir.
- **"¿Te cobraron por el retiro?"**, opcional: `Transferencia.comision` (sin migración) sale del origen con el monto y el 4x1000 en `calcularTransferencia`, `efectoEnCuenta` (R-HF2) y deshacer; el aviso de saldo la suma. No es un gasto.
- **Movimientos:** la transferencia que llega a efectivo se lee "Retiro de Bancolombia", "A tu efectivo · incluye $7.200 del cajero y $800 de 4x1000" (`esRetiro`, derivado del destino).
- **La nota de Transferir:** "Ej. ahorro del mes, pasar a Nequi" (D6).
- Pruebas: `retiro.test.js` unitaria (comisión en el cálculo, en el efecto y en la fila; cuentas del retiro; validación) y E2E a 390 (sin Efectivo lo crea y descuenta monto, 4x1000 y cajero; con Efectivo llega a esa cuenta); `deshacer` (la comisión vuelve) y `tesoreria`/`smoke` (con una cuenta, solo "Retirar efectivo"). Unitarias 6259/6259, E2E 555/555.

### feat(registro): FAC.1, la pantalla final de registro es una factura · 2026-11-19

[ADR 180](DECISIONS/180-la-pantalla-final-de-registro-es-una-factura.md), pedido directo sin tarjeta con la referencia `Diseños SVG/factura-finko.svg`. Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v791. Todo bajo 1024 px; escritorio no cambia.

- **Un solo papel** (`.factura` en `components/captura.css`, `ui/factura.js`): marco bosque con la franja girasol y coral, el sello con el isotipo entre tres rayas, un corte de puntos, el título, la cifra con "COP", un corte de guiones, las filas "ícono | rótulo y valor", la nota tras otro corte y un código de barras a todo el ancho (derivado del id, solo adorna). Marco, papel y tinta fijos en los dos temas (`--fk-factura-*`).
- **Registrar gasto:** "Nuevo gasto" antes de guardar y "Gasto registrado" en la ficha; la categoría pasa a ser la primera fila, con su glifo; "Entidad bancaria" pasa a "Cuenta de origen"; íconos de contorno (`i-nota` nuevo en el sprite). Salen la pestaña, los destellos, la ilustración, el trazo, el troquel, el logo junto al valor y el isotipo de la banda (ya va en el sello).
- **Resumen de los flujos por preguntas** (gasto fijo, deuda, ingreso fijo, cuenta, meta, reserva, inversión, préstamo, límite): el título del formulario (`data-factura-titulo`, "Gasto fijo"), la cifra principal arriba con su rótulo y sin repetir su fila, un ícono por fila (`simboloDeFilaFactura`) y la nota aparte.
- **Sin desplazar** en 390 x 844, 430 x 932, 360 x 740 y 375 x 667, con filas de 44 px; a 320 x 568 la hoja desplaza por dentro (ADR 156).
- Pruebas: unitarias de `gastos-telefono` (la factura, sus íconos, "Cuenta de origen") y `preguntas` (la cifra, la nota aparte, `simboloDeFilaFactura`); E2E de `movil-mv2` (la deuda y el gasto fijo con su cifra). Unitarias 6250/6250, E2E 553/553.

### feat(gastos): GAS.7g, primera vez y mes sin gastos (cierra GAS.7) · 2026-11-19

[ADR 179](DECISIONS/179-gastos-en-cuatro-pestanas.md) D7. Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v790, con la entrada 790 de Novedades para quien actualiza. Todo bajo 1024 px.

- **Primera vez:** sin gastos, fijos ni deudas, Día a día no lleva tarjeta: Tino, "Aquí ves todo lo que sale de tu dinero" y tres caminos: un gasto de hoy (el formulario), tus gastos fijos y tus deudas (sus pestañas, con sus propios caminos). Con fijos o deudas y sin gastos, sigue el vacío del ADR 161.
- **Mes sin gastos:** un mes pasado vacío cambia la tarjeta por "Estás viendo agosto 2026 ⌄" y dice "No registraste gastos en agosto" ("Fue tu primer mes en Finko" si lo fue), con "Volver a noviembre" y "Ver septiembre" (`gastos-mes-siguiente`; no sale si el siguiente es el corriente).
- **`primerMesFinko`** baja a `infra/mes-bloque.js`: la usan la hoja de meses y este vacío.
- **Novedades 790:** "Gastos, en cuatro pestañas".
- Pruebas: `gastos-pestanas.test.js` (la primera vez con sus tres caminos; el mes pasado sin gastos, "Ver" el siguiente y "Volver a"); `tino-bienvenida` (la entrada 790); `gastos-registro` siembra un fijo para seguir probando el vacío del ADR 161 y el reloj de `smoke` un gasto el mes anterior. Unitarias 6249/6249, E2E 553/553.

### feat(limites): GAS.7f, Límites por estado · 2026-11-19

[ADR 179](DECISIONS/179-gastos-en-cuatro-pestanas.md) D6. Fichas: [`contexto/limites.md`](contexto/limites.md) y [`contexto/gastos.md`](contexto/gastos.md). SW v789. Todo bajo 1024 px.

- **Los grupos:** bajo la tarjeta, "Pasaste el límite", "Cerca del límite" y "Vas bien", cada uno en su tarjeta; el límite de deseos pequeños va en el grupo de su estado.
- **La fila** dice una sola frase: "Te pasaste $45.000 · límite $300.000" o "Quedan $88.000 de $500.000", sin porcentaje.
- **Sin límite:** "Gastas en estas categorías y no tienen tope", cada una con "$96.500 este mes" y "+ Límite". Vivienda, Servicios públicos y Gastos fijos dicen "Se controla en Fijos" y Deudas "Se controla en Deudas", con su enlace (en escritorio sigue "Por pagar").
- **Las tejas** de categoría van en el color de Gastos, como las dibuja el tablero, y los grupos arrancan bajo la tarjeta sin la raya de antes.
- **Lo que el tablero no trae no se borra:** la suma de los topes, el extraordinario, las sugerencias y "Tu plan de noviembre" bajan al final.
- Pruebas: `gastos-pestanas.test.js` (los grupos por estado, la frase de cada fila y "Sin límite" con su enlace a Fijos); E2E de `movil-mv2` (los grupos y "Te pasaste $15.900 · límite $200.000"); unitarias de `presupuesto` (la frase de la fila y los grupos). Unitarias 6249/6249, E2E 551/551.

### feat(deudas): GAS.7e, la pestaña Deudas · 2026-11-18

[ADR 179](DECISIONS/179-gastos-en-cuatro-pestanas.md) D5. Fichas: [`contexto/gastos.md`](contexto/gastos.md) y [`contexto/deudas.md`](contexto/deudas.md). SW v788. Todo bajo 1024 px.

- **La tarjeta:** "Cuotas por pagar en noviembre ⌄" y, en una línea, "Debes en total $11.350.000 en 4 deudas".
- **Los grupos:** Cuota vencida (si la hay), Cuota pendiente este mes y Al día este mes, con sus sumas; las saldadas al final.
- **La fila:** nombre y cuota, "Mar 24 · crédito con entidad" ("pago mínimo" en la tarjeta, "deuda personal" en la de una persona) y su avance: "Te falta $6.200.000 de $10.000.000" con su barra, o "Debes $1.450.000 · cupo de $3.000.000" en la tarjeta. El total es el saldo más lo abonado (o lo acreditado al crearla). Al día: "Pagaste la cuota el 5 nov" y el círculo lleno.
- **¿Cómo salir más rápido?** dice cuántos meses faltan con las cuotas de hoy (`simularEstrategiaPago` sin extra).
- **El vacío:** sin deudas no hay tarjeta; Tino tranquilo, "No tienes deudas registradas" y tres caminos: la tarjeta de crédito (llega elegida), un crédito con un banco o entidad y lo que se le debe a una persona.
- **Al aplicarlo:** la tarjeta de crédito lleva el ícono de tarjeta y el crédito el del banco; la deuda al día no apaga su nombre; el aviso de deudas quietas deja aire antes del primer grupo.
- Pruebas: `gastos-pestanas.test.js` (la tarjeta y los grupos de Deudas, el avance con y sin cupo, el vacío y la tarjeta que llega elegida); unitarias de `renderEntradaPlanSalida` (los meses, y el texto de antes cuando las cuotas no alcanzan); E2E de `movil-mv2` (la fila dice "pago mínimo" y su avance). Unitarias 6248/6248, E2E 550/550.

### feat(fijos): GAS.7d, la pestaña Fijos · 2026-11-18

[ADR 179](DECISIONS/179-gastos-en-cuatro-pestanas.md) D4. Fichas: [`contexto/gastos.md`](contexto/gastos.md) y [`contexto/deudas.md`](contexto/deudas.md). SW v787. Todo bajo 1024 px.

- **La tarjeta:** "Te falta pagar en noviembre ⌄" con el "$" chico, la barra de lo pagado y "Pagaste $340.000 de $2.251.900 · 3 de 10 pagos" (`resumenFijosDelMes`, el mismo reparto que la lista).
- **Los grupos:** Vencido (en rojo, o "Para hoy"), Esta semana (los próximos siete días), Más adelante en noviembre y Pagado este mes, cada uno con su suma; sin la línea de orden y sin "gasto fijo" en la fila. La marca de la empresa se queda en la teja (ADR 150).
- **El vacío:** sin fijos no hay tarjeta; Tino con su calendario, "Anota lo que pagas cada mes" y "¿Cuál pagas? Empieza con uno" con ocho caminos que abren el gasto fijo con su categoría (Energía y Agua en Servicios públicos, con su nombre).
- Pruebas: `gastos-pestanas.test.js` (la tarjeta y los grupos de Fijos; el vacío y su camino a Servicios públicos con nombre); E2E de `movil-mv2` (Fijos dice "Vencido" y no lleva la línea de orden). Unitarias 6247/6247, E2E 548/548.

### feat(gastos): GAS.7c, Día a día como el tablero · 2026-11-18

[ADR 179](DECISIONS/179-gastos-en-cuatro-pestanas.md) D3. Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v786. Todo bajo 1024 px; escritorio no cambia.

- **La tarjeta:** el comparativo va al lado de la cifra y corto ("↘ 18% vs. octubre"); debajo, "38 gastos · sin contar fijos ni deudas".
- **Lo vencido:** debajo de la tarjeta, el pago vencido más antiguo ("Netflix venció hace 16 días · Gasto fijo · $44.900") con "Ver", que lleva a su pestaña por `porPagar:ver-compromiso`; con varios, cuántos y cuánto suman. Solo en el mes corriente y sin chip; el conjunto es el del lote (`pagosPendientesDelMes`).
- **Chips con su total:** cada categoría dice cuánto lleva en el mes (el ojo lo tapa).
- **Con un chip:** "9 gastos" al lado de la cifra y, si la categoría tiene límite, su barra (lo de más en girasol) y "Te pasaste $45.000 de tu límite de $300.000" o "Te quedan...". Las filas dejan de repetir la categoría (`textosFilaGasto(..., { conCategoria })`).
- **Días largos:** con más de cinco gastos, el día muestra cuatro y "2 gastos más del sábado $26.000 ⌄" (`gastos-dia-mas`).
- **Al desplazar:** cuando la tarjeta sale por arriba, una tarjeta de una línea queda bajo las pestañas ("Noviembre ⌄ $1.143.600 21 gastos", `#gastos-compacta`, con un `IntersectionObserver`).
- Pruebas: `gastos-pestanas.test.js` (chips con total, la tarjeta sin chip y con un límite pasado, la fila sin categoría, el día plegado, el aviso de lo vencido); E2E de `movil-mv2` (el riel con montos, la ficha del gasto con el día plegado) y `zonas-tactiles` (el riel es la excepción de R9, ADR 157 D6).

### feat(gastos): GAS.7b, el mes y el ojo bajan a la tarjeta · 2026-11-18

[ADR 179](DECISIONS/179-gastos-en-cuatro-pestanas.md) D2 (y la tarjeta del D6). Cambia el ADR 157 D1 (la pastilla "‹ Noviembre ›" y el ojo en la fila del nombre). Fichas: [`contexto/gastos.md`](contexto/gastos.md) y [`contexto/limites.md`](contexto/limites.md). SW v785.

- **Teléfono:** la fila del bloque queda con "Gastos" y la lupa. El mes es la palabra del rótulo de cada tarjeta ("Gastaste en noviembre ⌄", "Te falta pagar en...", "Cuotas por pagar en...", "Te queda en...") y abre la hoja **"Elige el mes"**: el año, una fila por mes con lo gastado en el día a día, su barra, "Este mes", "Tu primer mes en Finko" y el visto. Sin meses futuros ni anteriores al primero en Finko.
- **El ojo** va en la esquina de cada tarjeta y sigue tapando solo su pestaña (ADR 166); la hoja también lo respeta.
- **Límites** abre con su tarjeta dorada: "Te queda en noviembre", la barra y "Usaste $984.000 de $1.250.000 · 1 límite pasado" (o "Te pasaste en..."). La tarjeta de **Fijos** pasa al índigo de lo que se paga cada mes.
- **Sale** la pastilla del mes del encabezado, con su CSS en `layout.css`, `responsive.css` e `identidad.css`.
- Pruebas: `bloque-gastos.test.js` (la hoja, el primer mes, el rótulo, el ojo y la tarjeta de Límites), `compromisos.test.js` (el rótulo nuevo) y los E2E de `smoke` que navegaban el mes, ahora por la hoja.

### feat(gastos): GAS.7a, cuatro pestañas: Día a día, Fijos, Deudas y Límites · 2026-11-18

[ADR 179](DECISIONS/179-gastos-en-cuatro-pestanas.md) D1, tablero "Finko · Gastos móvil, rediseño de navegación" (21 páginas): primera rebanada de GAS.7. Cambia el ADR 069 (tres lentes) y el ADR 080 D6 (los chips de Por pagar quedan en escritorio). Fichas: [`contexto/gastos.md`](contexto/gastos.md) y [`contexto/deudas.md`](contexto/deudas.md). SW v784.

- **Teléfono:** "Por pagar" se parte en **Fijos** (`#fijos`) y **Deudas** (`#deudas`), dos lentes de `sec-compromisos`. En ellas no hay chips; la lista, el hero y el lote del pie cuentan solo su tipo. Fijos lleva el número de fijos vencidos, Deudas el de cuotas vencidas y Límites su punto junto al nombre. El botón central abre el gasto fijo en Fijos y la deuda en Deudas.
- **`#compromisos` en el teléfono** cae en la pestaña que toca (`lentePorPagar`): la del chip que trae quien llega, si no la que tiene algo vencido, si no la que tiene algo registrado. Los enlaces de Inicio, Análisis, Ahorro o el Calendario siguen sirviendo sin tocarlos; el plan de salida abre en Deudas.
- **Por sección, no por hash:** `seccionDelHash` (router) es lo que leen `renderSmart`, la fila "Por pagar" del sidebar, el volver de contexto y el ojo de la sección. En Fijos se apagan el simulador y los avisos de deudas.
- **Escritorio no cambia:** "Por pagar" con sus cuatro chips.
- Pruebas: `gastos-pestanas.test.js` (nueva: rutas, filtro de la pestaña, hero por tipo, a qué pestaña cae), `bloque-gastos.test.js`, y E2E de `movil-mv2`, `hub-ahorros`, `boton-central` y `avance` reescritos para las cuatro pestañas.

### feat(fijos): GF.3, elegir es seguir en el gasto fijo · 2026-11-18

[ADR 178](DECISIONS/178-elegir-es-seguir-en-el-gasto-fijo.md), pedido directo sin tarjeta: cambia el [ADR 177](DECISIONS/177-el-gasto-fijo-en-cuatro-pasos-con-nombre.md) D2, D3 y D5 (el "Siguiente" tras elegir). Ficha: [`contexto/captura.md`](contexto/captura.md). SW v783, una línea más en Novedades 777.

- **Teléfono:** la categoría, la empresa y el día llevan a la pantalla siguiente sin botón; cada cuánto espera al día y, con el día puesto, sigue. "Otra" frecuencia no avanza; elegir en su desplegable sí. El monto y "Crea tu categoría" conservan su botón; la empresa deja solo "Sin empresa" en el pie, a lo ancho. Desde el resumen tampoco hay "Listo": Atrás vuelve sin cambiar.
- **Cómo se siente:** la elección se ve 180 ms con su visto antes de pasar; un segundo toque en ese instante no salta otra pantalla y Atrás lo anula. Si la pantalla no quedó respondida, espera sin marcar error. Cada pantalla entra con un fundido de 220 ms (sin él con movimiento reducido).
- **Solo con `data-pasos`:** Nueva deuda y los demás formularios del armazón no cambian. `data-no-avanza` y `data-avanza` siguen disponibles; el gasto fijo ya no los usa salvo en "Otra".
- **De paso:** el desplegable de "Otra" no rehacía el aviso del calendario ni la fila "Cada cuánto" (solo se escuchaba `input`), y su botón seguía diciendo la frecuencia de antes; con el avance, el resumen mostraba el dato viejo.
- Pruebas: `preguntas.test.js` (la pausa, el doble toque, Atrás, cada cuánto sin día, "Otra" y su desplegable, el pie y el fundido), `compromisos.test.js` (sin frenos salvo "Otra") y `movil-mv2.test.js` (el fijo de punta a punta sin "Siguiente"). Unitarias 6219/6219, E2E 546/546.

### feat(catalogos): GAS.6 y MK.3a, Videojuegos y las marcas que faltaban · 2026-11-18

[ADR 173](DECISIONS/173-videojuegos-en-entretenimiento.md) D1 y [ADR 172](DECISIONS/172-las-marcas-que-faltaban.md) D1 a D4: dos cambios de catálogo, en un commit. Fichas: [`contexto/categorias.md`](contexto/categorias.md). SW v782.

- **GAS.6:** Entretenimiento > **Videojuegos** (`entret-videojuegos`, después de "Conciertos y eventos"), de carácter gusto: una compra pequeña cuenta como hormiga y se le puede poner límite. Nada se migra; Celular sigue solo como gasto fijo.
- **MK.3a:** Celular ofrece también Móvil Éxito, Virgin Mobile y Kalley Móvil (tag `movil`, que "Internet y TV" no lee); Suscripciones, Microsoft 365 y McAfee (tag `software`) y Roblox (`gaming`, después de Xbox); Streaming, ViX después de Crunchyroll. trii y Wenia entran con el tag `inversion` para MK.3b. Los alias comunes quedan fuera ("exito", "kalley", "microsoft", "robux"): no pintan la teja en textos ajenos. Todas con iniciales hasta tener el vector.
- Pruebas: `taxonomia.test.js` (el orden, el carácter y la hormiga) y `marcas.test.js` (los tags conocidos, Celular con siete operadores, cada nombre a su marca, los alias que no se usan y las plataformas de inversión fuera de los fijos). Unitarias 6214/6214, E2E 546/546.

### feat(deudas): PAG.1, ¿a dónde se paga? · 2026-11-18

[ADR 175](DECISIONS/175-a-donde-se-paga.md). Completa el punto 9 de la revisión con el [ADR 170](DECISIONS/170-tus-llaves-a-un-toque.md). Ficha: [`contexto/deudas.md`](contexto/deudas.md). SW v781.

- **El dato** (`datosPago`, D1): en el gasto fijo y en la deuda con una persona, el titular, una llave de Bre-B, la entidad con el número de cuenta y la referencia. Al menos uno de llave, número o referencia. La deuda con una entidad no lo ofrece. Sin migración.
- **El formulario:** "Para pagar" es una ficha de "Agrega si quieres" en el teléfono; en escritorio, dentro de "Más opciones" del fijo y al pie de la deuda con una persona.
- **Copiar donde se paga** (D2): la ficha del pago dice "Para pagar a Martha Gómez" con cada dato y su Copiar, que no cierra la hoja ("Copiaste la llave de Martha Gómez"); "¿Desde qué cuenta pagas?" trae el dato principal arriba de las cuentas, con su Copiar.
- **Lo que se ve** (D3): el número de cuenta enmascarado hasta tocarlo; con el ojo de Por pagar cerrado, todo. La referencia no pasa la prueba de tarjeta (D4).
- **`infra/llaves.js`**: el formato, la prueba de tarjeta y cómo se ve una llave pasan de Mis cuentas a infra, porque Por pagar también los usa y un dominio no importa a otro (ADN 10). Tesorería los reexporta.
- Pruebas: `compromisos.test.js` (normalizar y validar `datosPago`, el formulario de la deuda y la ficha) y `para-pagar.test.js` (a 390 px: Copiar deja los 10 dígitos, la hoja sigue abierta y la hoja de la cuenta trae el dato). Unitarias 6209/6209, E2E 546/546.

### feat(cuentas): MC.19, tus llaves a un toque · 2026-11-18

[ADR 170](DECISIONS/170-tus-llaves-a-un-toque.md), MC.19a y MC.19b juntas: el formulario de una sola llave habría perdido las demás al editar. Ficha: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md). Schema v57, SW v780.

- **El modelo** (D1, D2 y D7): `datosTransferencia.llaves`, hasta 7, con los tipos de Bre-B (`TIPOS_LLAVE`: Celular, Documento, Correo, Alfanumérica, Otro). La migración v57 pasa `llave` y `tipoLlave` a la primera de la lista ("Alfanumérico" a "Alfanumérica", sin tipo a Otro) y el `alias` a llave Alfanumérica (con @) u Otro, sin repetirla. Nada se borra ni se reformatea.
- **El formato al escribir** (D3, `erroresTransferencia`): el celular con 10 dígitos que empiezan por 3, el documento de 5 a 15 números o letras, el correo completo, la alfanumérica con @. Se guarda limpio (`limpiarLlave`). Solo se revisa la llave que se escribe o se cambia. La misma llave en esta cuenta o en otra no ("Esa llave ya está en Nequi."), y un número de tarjeta (Luhn) tampoco, ni en el número de cuenta. Con varias, el mensaje dice cuál: "Llave 2: ...".
- **Copiar** (D4, `infra/portapapeles.js`, el primero de la app): "Para recibir" en la hoja de la cuenta lista cada llave y el número con Copiar, y el toast dice "Copiaste tu llave de celular de Nequi". Copia el valor sin formato. El chip de la tarjeta de escritorio copia la llave que muestra.
- **Lo que se ve** (D5, `textoLlave`): el celular con espacios; el documento y el número, `•••• 4050` hasta tocarlos; con el ojo de Mis cuentas cerrado, todo enmascarado. El dato oculto no viaja en el HTML: los botones llevan el índice.
- **El formulario** (D6): el número, la lista de llaves (tipo en chips, valor y quitar) y "Agregar otra llave" hasta 7. Sale Alias.
- Pruebas: `tesoreria.test.js` (cada formato, tarjeta, repetidas, la llave vieja que no bloquea, el tope, la migración, el formulario, el chip y la hoja), `portapapeles.test.js` (con y sin Clipboard API) y `llaves.test.js` (a 390 px: la hoja, Copiar con el portapapeles, ver el documento y el ojo; en escritorio: dos llaves, el formato al guardar y el chip que copia). Unitarias 6204/6204, E2E 545/545.

### feat(deudas): AVC.1d, deshacer un avance desde la hoja de la tarjeta · 2026-11-18

[ADR 169](DECISIONS/169-un-avance-no-es-un-gasto.md) D6. Cierra la iniciativa AVC.1. Ficha: [`contexto/deudas.md`](contexto/deudas.md). SW v779.

- **En la hoja de la tarjeta**, "Tu avance" o "Tus avances" bajo sus datos: la fecha, a qué cuenta llegó y el monto, del más nuevo al más viejo, cada uno con "Deshacer". En los dos anchos.
- **"Deshacer" es el de Movimientos** (`deshacerConConfirmacion` de MOV.3, acción `deshacer-avance`): la misma confirmación con lo que pasa, los mismos frenos (el dinero ya salió de la cuenta, la tarjeta ya se pagó por debajo) y "Avance deshecho" al terminar. Ninguna lógica nueva.
- Pruebas: `avance-formulario.test.js` (sin avances no hay lista; el orden, la cuenta y el id del botón) y `avance.test.js` (a 390 px: sacar un avance y deshacerlo desde la hoja devuelve Efectivo y la tarjeta a como estaban). Unitarias 6194/6194, E2E 543/543.

### feat(deudas): AVC.1c, el aviso de avances seguidos · 2026-11-18

[ADR 169](DECISIONS/169-un-avance-no-es-un-gasto.md) D8. Fichas: [`contexto/deudas.md`](contexto/deudas.md) e [`inicio.md`](contexto/inicio.md). SW v778.

- **La detección** (`avancesRecientes`, `compromisos/logic/avances.js`): los avances de hoy y los 90 días anteriores, de todas las tarjetas, sumando los que llegaron a una cuenta y los gastos "Lo pagué con un avance". Una fecha futura no cuenta.
- **El aviso** `avances-seguidos` (motor único, severidad media, sin notificación del sistema, con el interruptor de "Deudas y pagos fijos"): "Llevas 3 avances en tres meses" y "Suman $X. Es señal de que el mes no alcanza.", con "Ver tu plan de salida".
- **Va a Novedades, no a Atención hoy:** la tarjeta decía Atención hoy, pero no pide hacer algo hoy sino enterarse, y eso es Novedades por el ADR 149 D2 (como las suscripciones).
- **"Ver tu plan de salida" desde Inicio** navega a Por pagar y abre el plan después del re-render; antes, desde otra sección, la hoja abría vacía.
- Pruebas: `avisos.test.js` (dos en 90 días sí; uno, o dos separados por más de 90, no; el día 90 cuenta; gastos y varias tarjetas en un aviso; fecha futura; no interrumpe), `atencion-hoy.test.js` (Novedades y su copy) y `avance.test.js` (a 390 px, de Novedades al plan abierto). Unitarias 6192/6192, E2E 543/543.

### feat(fijos): GF.2, el gasto fijo en cuatro pasos con nombre · 2026-11-18

[ADR 177](DECISIONS/177-el-gasto-fijo-en-cuatro-pasos-con-nombre.md), pedido directo con el canvas "Rediseño del formulario de Gastos Fijos" (aplicado y borrado). Fichas: [`contexto/captura.md`](contexto/captura.md) y [`contexto/categorias.md`](contexto/categorias.md). SW v777, Novedades 777.

- **En el teléfono:** Monto · Qué es · Cuándo · Revisar rotulados arriba, sin "2 de 4"; sobre cada pregunta, lo ya respondido ("Pagas $85.000", la tarjeta de la categoría con "Cambiar", "EPM · $85.000"). La empresa y "Crea tu categoría" son pantallas del paso "Qué es"; desde el resumen, "Qué es" pasa por ellas antes de volver.
- **"¿Qué es?" en familias** (`GRUPOS_CATEGORIA_AGENDA`): Casa, Conexión y entretenimiento, Salud y bienestar, Estudio, banco e impuestos, Tus categorías y ¿No está en la lista?, con el color de una sección que ya existe. También en escritorio. "Categoría nueva" pasa a "Crear categoría" y avanza al tocarla.
- **La empresa** en tres columnas, opcional, con "Sin empresa" en el pie (el chip "Otra" se llama así también en escritorio).
- **Crear una categoría ya no pide descripción**: el fijo se llama como ella (cambia el CAT.3c). La grilla de íconos va abierta (`renderIconoPicker` con `abierto`: el `[hidden]` del reset no deja abrirla con CSS).
- **"¿Cuándo lo pagas?"** junta cada cuánto (segmentado) y qué día; tocar un día no avanza. El aviso del calendario va en su caja con el ícono de la Agenda, y se repite en el resumen.
- **El resumen:** Qué es (con la teja de la empresa o el ícono de su familia), Cuánto pagas, Cada cuánto y Día de pago, en ese orden; "Nota" y "Débito automático" son dos fichas.
- **El armazón** (`ui/preguntas.js`) suma opciones que solo pide quien las usa (tabla en el ADR 177 D1). Los días del selector quedan centrados (heredaban `text-align: left` del reset de botones, también en Nueva deuda).
- Pruebas: `preguntas.test.js` (pasos con nombre, contexto, saltar, día que no avanza, resumen ordenado y partido, volver dentro del paso), `compromisos.test.js` (familias, empresa, categoría nueva, cuándo, contexto) y `movil-mv2.test.js` (el recorrido con EPM y con una categoría creada). Unitarias 6185/6185, E2E 542/542.

### feat(analisis): ANA.1d, el detalle de una categoría · 2026-11-18

[ADR 176](DECISIONS/176-analisis-en-dos-lentes.md) D8. Cierra la iniciativa ANA.1 (queda ANA.2, el escritorio, "no iniciar"). Ficha: [`contexto/analisis.md`](contexto/analisis.md). SW v776.

- **Dónde:** cada fila de "En qué gastas" (semana, mes y año) es un botón con su flecha que abre la categoría dentro de Análisis, con "‹ Análisis" para volver al mismo periodo; "Ver Restaurantes" de un hallazgo también. Las flechas del encabezado mueven el periodo sin salir de la categoría. "Otras N categorías" despliega las demás, con "Ver menos".
- **El detalle** (`datosCategoria`): el total con su parte del periodo y su número de gastos; la comparación a la misma altura en pastilla y en frase ("Del 1 al 18 de octubre llevabas $349.000."); el límite del mes si la categoría tiene uno, con lo que queda para los días que faltan; "En qué se va", sus subcategorías en una barra y en filas (lo anterior a la v52, "Sin detalle"); "Cómo ha cambiado", seis meses contra el promedio de los cinco anteriores desde el primer gasto; y "Tus gastos más grandes", cinco, con "Ver los N en Gastos" (Movimientos con la categoría y el periodo).
- **En el año** la pastilla no va: sería el promedio de todo el gasto; lo dice "Cómo ha cambiado".
- Pruebas: `analisis-categoria.test.js` nuevo (total, parte, la misma altura, subcategorías, seis meses, los más grandes, el detalle pintado y volver) y `movil-mv2.test.js` (abrir y volver a 390 px). Unitarias 6168/6168, E2E 541/541.

### feat(analisis): ANA.1c, lo que Finko encontró · 2026-11-18

[ADR 176](DECISIONS/176-analisis-en-dos-lentes.md) D6 y D7, que amplía el [ADR 127](DECISIONS/127-identidad-bosque-y-sol.md) D6. Ficha: [`contexto/analisis.md`](contexto/analisis.md). SW v775.

- **El bloque:** bajo "En qué gastas", Tino con lupa sobre su sol, "Lo que Finko encontró" y hasta tres hallazgos (`hallazgosDelPeriodo`), ordenados por el dinero que nombran; el del día de la semana, que no es una suma, al final. Sin hallazgos no aparece.
- **Por periodo:** la semana, el día que se llevó al menos el 40 %; el mes, la hormiga (tres compras o más), el mayor cambio de una categoría contra el mes anterior a la misma altura (margen de ruido del 10 %) y, en el mes en curso, el día de la semana destacado de los últimos 90 días; el año, el mes cerrado más alto contra el promedio (con tres meses o más) y la hormiga del año. El día no busca nada.
- **A mitad de periodo solo se anuncia lo que subió:** una bajada se dice cuando el periodo cierra ("bajó 18% frente a septiembre").
- **Los enlaces:** "Ver cuáles" abre la hoja de las compras pequeñas de gusto por categoría (`hormigaEnRango`, sobre `gastosHormiga` del ADR 147); "Ver julio" salta al mes; "Ver Restaurantes" abre Movimientos con la categoría (ANA.1d lo cambia por su detalle).
- **Sale del teléfono "Más detalle de tus gastos"**: su contenido quedó repartido entre el encabezado (el total contra el mes anterior), este bloque (el mayor cambio, el día de la semana y la hormiga) y el detalle de la categoría. En el escritorio sigue (ADR 176 D10).
- Pruebas: `analisis-hallazgos.test.js` nuevo (cada periodo, el tope de tres, el orden, sin bajadas a mitad de mes, el margen de ruido, la hoja y el bloque sin hallazgos) y `movil-mv2.test.js` (sin la fila del detalle). Unitarias 6161/6161, E2E 540/540.

### feat(analisis): ANA.1b, Tus gastos por periodo · 2026-11-18

[ADR 176](DECISIONS/176-analisis-en-dos-lentes.md) D2 a D5 y D7, que reabre el [ADR 090](DECISIONS/090-analisis-cada-bloque-declara-su-alcance.md) D4. Ficha: [`contexto/analisis.md`](contexto/analisis.md). SW v774.

- **El periodo:** Día, Semana (de lunes a domingo), Mes (la de entrada) y Año en cuatro pastillas, y "‹ Noviembre ›" en el encabezado de la sección (`#analisis-periodo`, sin la teja del título, como el bloque Gastos). Las flechas no pasan del periodo en curso ni antes del primer gasto; cambiar de tipo vuelve a hoy. Vive en memoria. En Tu situación la pastilla no aparece.
- **El encabezado** es la tarjeta de identidad de Análisis (pizarra, `.hero-analisis`) con el total, la comparación en pastilla (verde solo al bajar, `--fk-hero-ok` igual en los dos temas) y su gráfica: la barra contra el promedio diario del mes (Día), siete barras (Semana), el ritmo acumulado contra el mes anterior (Mes) y doce barras con la línea del promedio (Año).
- **A la misma altura:** `periodoAnteriorALaAltura` corta el periodo anterior en el mismo día (un 31 contra un mes de 30 se queda en el 30); un periodo cerrado se compara completo. La pastilla de la tendencia del escritorio también: "↓ 25% vs mes anterior a esta altura".
- **El promedio por mes del año** sale de los meses cerrados con gasto: el mes en curso no lo arrastra y un mes sin registro no cuenta como cero.
- **En qué gastas:** la barra mide la parte del total (antes, contra la mayor); desde siete categorías, cinco y "Otras N categorías" con sus nombres; la frase del mayor gasto. En el día, cada gasto de mayor a menor con su subcategoría o nota y su cuenta, y "Ver el día en Gastos" (Movimientos con los gastos y la fecha puestos).
- **Sin gastos:** Tino tranquilo sobre su sol y, en un día o en el periodo en curso, "Registrar un gasto" (en un día pasado, "del 17", que abre el formulario con esa fecha: `nuevo-gasto` acepta `data-fecha`, nunca futura).
- Salen las barras de "A dónde va tu dinero" y su frase (`fraseDelMes`); "Más detalle de tus gastos" queda en el mes en curso hasta ANA.1c.
- Pruebas: `analisis-periodo.test.js` nuevo (rangos, moverse, la misma altura, los cuatro periodos, las frases, la pastilla y lo que pinta cada periodo), `analisis-telefono.test.js` (la barra de la parte) y `movil-mv2.test.js` (los periodos a 390 px). Unitarias 6152/6152, E2E 540/540.

### feat(analisis): ANA.1a, las dos lentes y Tu situación · 2026-11-18

[ADR 176](DECISIONS/176-analisis-en-dos-lentes.md) D1 y D9, que reemplaza el [ADR 134](DECISIONS/134-consultar-del-adulto-en-el-telefono.md) D7 bajo 1024px. Tablero "Finko · Rediseño de Análisis". Ficha: [`contexto/analisis.md`](contexto/analisis.md). SW v773.

- **Las lentes:** "Tus gastos" y "Tu situación" en un riel bajo el título; entra por Tus gastos. La lente vive en memoria (`lenteAnalisis()`, acción `analisis-lente`): al recargar vuelve a la de entrada.
- **Tu situación:** "Hoy, miércoles 18 de noviembre" y tres tarjetas. La salud con su barra en el color de la banda y "De dónde sale el N" como fila; lo que realmente tienes con el neto, la frase (el porcentaje de las deudas en negrita) y dos filas, "Lo que tienes" (sus partes en una línea: hasta cuatro, todas; desde cinco, tres y "y N más") y "Lo que debes" ("2 deudas: Tarjeta y Carro"); y la renta, que solo avisa con alerta.
- **Tres hojas nuevas** en `#modal-detalle-fila`: los cuatro factores, las partes de lo que tienes (con el aviso de préstamos sin cuenta) y las deudas con su saldo (con "Complétala en Por pagar" prefiltrado, ADR 090 D1). Un enlace de cualquier hoja de Análisis la cierra al navegar.
- **Tus gastos queda como en la tanda 4** (meses en barras, categorías y "Más detalle de tus gastos") hasta ANA.1b y ANA.1c.
- Pruebas: `analisis-telefono.test.js` (lentes, Tu situación, las tres hojas, las frases) y `movil-mv2.test.js` (las dos lentes con sus hojas a 390 px). Unitarias 6130/6130, E2E 539/539.

---

## Convención de entradas

Cada entrada agrupa por fase/release y dentro lista commits con:
- **tipo(área)** - `commit_hash` · `archivos tocados` - descripción de qué cambió.

Tipos: `feat` (nueva funcionalidad), `fix` (bug), `refactor` (sin cambio funcional), `test`, `docs`, `chore` (config/build), `style` (formato).
