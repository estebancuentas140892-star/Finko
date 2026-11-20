# Changelog - Finko Claude

> Revisado: 2026-11-20.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-11)

### feat(gastos): GAS.11b, hormiga es lo pequeño que se repite · 2026-11-20

[ADR 186](DECISIONS/186-movimientos-encuentra-y-hormiga-por-frecuencia.md) D5. Pedido "Implementación y correcciones funcionales de Gastos". Ficha: [`contexto/limites.md`](contexto/limites.md). SW v825.

- **La regla** (`gastosHormiga`, `infra/hormiga.js`): hormiga es una compra de hasta el tope cuyo mismo concepto aparece 3 veces en 30 días, sin mirar el carácter. Un gusto suelto ya no cuenta (antes un café de $6.500 lo era) y una necesidad que se repite sí (el pasaje diario). Los pagos de fijos y deudas siguen fuera. Lo aprendido por concepto dice necesidad o deseo para Análisis; ya no saca ni mete en hormiga.
- **Café pasa a "depende"**: Tinto y Café de cafetería preguntan "Necesidad" o "Deseo" dentro de la opción, como Taxi; Bebidas frías es deseo sin preguntar. Antojos sigue siendo deseo.
- **Las palabras:** "Deseos pequeños" pasa a "Gastos hormiga" en Límites (fila, hoja, formulario y avisos), el aviso de Gastos y el logro; Análisis dice "compras pequeñas que repites" y su hoja se titula "Gastos hormiga". El detalle del gasto dice el carácter sin atarlo a hormiga.
- Pruebas: `caracter-gasto.test.js` (la regla, Café, el detalle), `presupuesto.test.js`, `gastos.test.js`, `gastos-pestanas.test.js`, `aprende.test.js`, `logros.test.js`, `taxonomia.test.js`, `analisis-hallazgos.test.js` (semillas con tres repeticiones) y `smoke.test.js`. Unitarias 6402/6402, E2E 582/582.

### feat(movimientos): GAS.11a, Movimientos encuentra lo que anotaste · 2026-11-20

[ADR 186](DECISIONS/186-movimientos-encuentra-y-hormiga-por-frecuencia.md) D1 a D4. Pedido "Implementación y correcciones funcionales de Gastos". Ficha: [`contexto/movimientos.md`](contexto/movimientos.md). SW v824.

- **El título de un gasto** es el de Gastos: la nota ("Almuerzo de trabajo"), si no la subcategoría ("Taxi"), si no la categoría; debajo, "Categoría · Cuenta". Antes la nota no llegaba y la fila decía "Restaurantes" y "Gasto · Nequi".
- **La búsqueda** mira título, categoría, subcategoría y nota, sin tildes ni mayúsculas ("cafe" encuentra "Café"). El campo dice "Busca por nombre, nota o categoría".
- **El tipo por clase** (`claseMovimiento`): Gastos, Gastos fijos, Deudas, Ingresos, Transferencias, Ahorro, Metas, Me deben y Ajustes de saldo. El chip "Deudas" ya no trae el pago de Netflix; el ajuste a mano ya no es una transferencia. "Gastos" e "Ingresos" valen igual, así las llegadas desde Gastos y Mis cuentas no cambian.
- **"Categoría ⌄" y "Cuenta ⌄"** en la fila, cada uno con su panel en línea (uno a la vez) con lo que hay en el historial; elegir deja la pastilla con su ×. Con una categoría, debajo van "Todo" y sus subcategorías. "Cuenta" sale con dos o más.
- **Periodos:** el rango abre con Este mes, Mes pasado, Últimos 3 meses y Este año, que escriben Desde y Hasta. Con cualquier filtro, la lista dice cuántos y cuánto.
- Lo demás del pedido (pestañas, vencidos, el fijo, la factura, categorías, Deudas) ya estaba con GAS.10: el ADR 186 lo detalla punto por punto.
- Pruebas: `movimientos-consulta.test.js` (nuevo: título, clase, búsqueda, subcategoría, opciones, periodos y la barra), `movimientos.test.js` y `smoke.test.js` (el chip de deudas por clase). Unitarias 6400/6400, E2E 582/582.

### feat(deudas): GAS.10g, Deudas, la primera vez y con deudas · 2026-11-19

[ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D8. Tablero "Finko · Gastos móvil, propuesta integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v823.

- **La primera vez:** un solo Tino, sin el sol; "¿Le debes dinero a alguien?" y "Anótalo y Finko te dice cuánto debes, a quién y cuándo pagas."; dos tarjetas lado a lado (Con una entidad: "Banco, cooperativa o crédito"; Con una persona: "Familia, amigos o conocidos") con "+ Agregar"; y "Si no le debes a nadie, no tienes que hacer nada aquí." Sale el segundo Tino. Cabe en 393 x 740 sin desplazar.
- **Con deudas:** la tarjeta dice "Cuotas de noviembre: **$680.000**" (con lo pagado, "· llevas $X", como pedía el ADR 183). Las dos puertas pasan a un selector de dos pestañas con su conteo y sale la frase que repetía la pestaña. Cada fila: "Cuota $400.000 · día 28" (sin cuota, como antes) y la tarjeta con el logo de su banco. "Agregar deuda con..." punteado va antes de "¿Cómo salir más rápido? **Compara dos formas de pagar**", ahora una línea con el bombillo.
- Con GAS.10g se cierran GAS.10 (ADR 185) y GAS.9 (su GAS.9f era este tablero). El HTML del tablero va a la Papelera.
- Pruebas: `gastos-pestanas.test.js` (unitarias y E2E: la línea, el selector, las filas, la primera vez sin desplazar a 393 x 740) y `movil-mv2.test.js`. Unitarias 6379/6379, E2E 582/582 ("dos dispositivos abiertos" de `nube.test.js`, el intermitente, pasó al repetir).

### feat(fijos): GAS.10f, cuándo y la factura del fijo · 2026-11-19

[ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D7. Tablero "Finko · Gastos móvil, propuesta integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v822.

- **Cuándo:** Mensual, Quincenal, Anual y "Otra ⌄" en una fila, y los 31 días debajo; sin el título, el contexto, los rótulos ni el aviso del calendario (quedan para el lector). "Otra" despliega Cada semana, Cada 2 meses, Cada 3 meses y Cada 6 meses (`frecuenciaOtra` escribe el desplegable de siempre).
- **La factura del fijo:** la cabecera bosque con "Gasto fijo" al centro, como la del gasto; sin la barra de pasos, "Así queda tu gasto fijo" ni "Toca un dato para cambiarlo". "Nuevo gasto fijo" chico, la cifra con COP al lado; Servicio ("Netflix" y a su lado "Streaming"), Fecha de pago ("El día 15") y Periodicidad ("Cada mes"), con la flecha.
- **Lo opcional en la factura** (`data-resumen-opcionales`, opt-in del armazón): tras un filete, Débito automático con su interruptor y Para pagar y Nota con "+ Agregar"; sale "Agrega si quieres". El rayo y el billete son sus íconos. "Guardar gasto fijo" en bosque con el chulo.
- Cabe sin desplazar en 375 x 667 y 360 x 740; a 320 x 568 desplaza 67 px por dentro, como la del gasto.
- Pruebas: `compromisos.test.js` y `preguntas.test.js` (las partes, "Otra", los íconos), `movil-mv2.test.js` (el flujo con "Cada 2 meses" y la factura sin desplazar). Unitarias 6379/6379, E2E 582/582.

### feat(fijos): GAS.10e, el gasto fijo, qué es, empresa y sin empresa · 2026-11-19

[ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D6. Tablero "Finko · Gastos móvil, propuesta integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v821.

- **Qué es** sin "Pagas $X" ni el título a la vista (quedan para el lector): el monto va bajo "Nuevo gasto fijo" en la cabecera, como en Nuevo gasto. Las áreas son rótulos y Otros y "Crear categoría" cierran sin el suyo.
- **La empresa:** los logos de 58, cuatro por fila, sin borde; la elegida con su aro y el visto. Por grupo cuando la categoría junta varios (Streaming: "Series y películas" y "Música"; Internet y TV, Celular y Suscripciones también). Sin la tarjeta de contexto, el título, el aviso ni "Sin empresa" en el pie.
- **"Sin empresa: escribir el nombre"**, punteado al final, lleva a "Nombre del servicio": un campo con la teja de la categoría y "Continuar". El fijo se llama así (`nombreServicio`); sin nombre, como la categoría, como antes. Elegir una empresa lo borra.
- Pruebas: `compromisos.test.js` (los grupos, la pantalla y el nombre guardado), `movil-mv2.test.js` (el flujo sin "Pagas" y Streaming hasta "Mubi"). Unitarias 6378/6378, E2E 582/582.

### feat(gastos): GAS.10d, la factura sin desplazar y la nota aparte · 2026-11-19

[ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D5. Tablero "Finko · Gastos móvil, propuesta integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v820.

- **La cifra con "COP" al lado** (38 px, en la tinta) bajo "Nuevo gasto" de 13; cada dato con su rótulo de 11,5 sobre el valor de 15 y la flecha a la derecha; el glifo de la categoría en su tono (los del tema claro: el papel es crema en los dos).
- **"Detalle"** en lugar de "¿En qué fue?" o "¿Necesidad o deseo?". **La cuenta:** el banco (el ícono del edificio; la tarjeta conserva el suyo) y a su lado "quedan $2.955.000" o "cupo $X", sin el tipo; con dos cuentas del mismo banco, el nombre entero para no confundirlas.
- **La nota** es una línea tras un filete: "Nota" y "+ Agregar"; escrita, el texto y "Cambiar". Su hoja dice "Nota", el campo de tres líneas y "Listo", sin la frase ni la X (el velo, Esc y Listo la cierran). "Guardar gasto" lleva el chulo.
- Cabe en 375 x 667 sin desplazar (medido: sobra 0). A 320 x 568 desplaza 39 px por dentro, como ya aceptaba el ADR 156.
- Pruebas: `gastos-telefono.test.js` (la nota, la cuenta sin tipo y con homónima, el cupo, "Detalle"), `gastos-registro.test.js` y `movil-mv2.test.js`. Unitarias 6376/6376, E2E 581/581 ("dos dispositivos abiertos" de `nube.test.js`, el intermitente, pasó solo).

### feat(gastos): GAS.10c, Nuevo gasto por áreas y la pregunta adentro · 2026-11-19

[ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D4. Tablero "Finko · Gastos móvil, propuesta integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v819.

- **Categoría:** sale la instrucción de título (queda para el lector); las dieciséis bajo Comida, Movilidad, Personal y Casa y familia, en dos columnas de 48, el ícono de 34 en el tono de su categoría (`--teja-tono`). Al final, Otros, las propias y "Crear categoría" punteada a su lado. El orden es el del tablero: el teléfono deja de ordenar por uso.
- **Detalle:** arriba la teja de 44 y el nombre de la categoría; las opciones con su aro, la elegida en negrita con el aro y el fondo en su tono. Cuando depende del momento (Taxi), "Necesidad" y "Deseo" aparecen dentro de esa opción (`colocarPregunta` muda el `fieldset`), sin título ni ayuda. En Otros o una propia, la pregunta va sola con su frase.
- Pruebas: `gastos-telefono.test.js` (las áreas, el tono, la cabecera y la pregunta tras Taxi), `gastos-registro.test.js` (todo cabe a 390, Entretenimiento en una línea, la pregunta pegada a Taxi) y `movil-mv2.test.js`. Unitarias 6376/6376, E2E 581/581.

### feat(gastos): GAS.10b, categorías para Colombia · 2026-11-19

[ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D3. Tablero "Finko · Gastos móvil, propuesta integral". Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v818.

- **Antojos** (antes Mecato, con la torta y en rosa); "Paquetes y snacks", "Frutas y verduras" y "Maquillaje y belleza". Los ids `mecato-*` y `mercado-plaza` no cambian.
- **Carro o moto**, nueva (pizarra, el carro, necesidad): Gasolina, Parqueadero y Peajes salen de Transporte y llegan Lavado y Taller y repuestos. Arreglos se une a "Ferretería y arreglos".
- **Carácter:** Entretenimiento, Decoración y Uñas y spa son deseo; Muebles y electrodomésticos se pregunta. Familia pasa a lila y Mascotas a café.
- **Migración v58:** Mecato pasa a Antojos en gastos, límites y lo aprendido (`c:Mecato|` a `c:Antojos|`); la gasolina guardada en Transporte pasa a Carro o moto, y un límite de Transporte por partes se parte (las partes que se van forman uno de Carro o moto con su suma); una categoría propia llamada Antojos o Carro o moto se retira.
- **El selector de ícono propio de Gastos** (`ICONOS_CATEGORIA_GASTO_PROPIA`) deja fuera el carro y la torta; la lista compartida no cambia: metas, cuentas y fijos la usan para validar.
- **Docs:** el mensual de noviembre pasó sus 200 KB y se parte: del 3 al 6 en [`changelog/2026-11-a.md`](changelog/2026-11-a.md).
- Pruebas: `categorias-colombia.test.js` nuevo (áreas, nombres, carácter y la migración, idempotente); los fixtures con Mecato pasan a Antojos. Unitarias 6376/6376, E2E 581/581.

### feat(gastos): GAS.10a, cada lugar con una función · 2026-11-19

[ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D1 y D2; cambia el ADR 182 D1 a D3. Tablero "Finko · Gastos móvil, propuesta integral" (GAS.9f). Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v817.

- **Sale la fila "Gastos"** con la teja, la lupa y el ojo: las pestañas son el primer renglón y el contenido sube 56 px. Fijos y Deudas llevan el punto rojo de lo vencido junto al nombre.
- **El ojo vuelve a cada tarjeta**, en un círculo a la derecha del rótulo, y sigue tapando su lente (ADR 166): el tablero daba por hecho uno para las cuatro.
- **La lupa es el primer botón de los filtros** (antes el embudo): Movimientos con Gastos y el foco en la búsqueda. Sale la franja de lo vencido de Día a día.
- **"Hoy · jue 19", "Martes 17 · nov"** (`complementoDiaGastos`), la diferencia en negrita y la primera vez con Tino al lado, sin botón ni sol, "Restaurantes" en la teja y la pista "Anótalo en Fijos" punteada.
- Pruebas: `bloque-gastos.test.js` y `gastos-pestanas.test.js` (unitarias), `gastos-pestanas`, `gastos-registro` y `smoke` (E2E). Unitarias 6366/6366, E2E 581/581.

### feat(inicio): INI.7b, "Atención hoy" en filas · 2026-11-19

[ADR 184](DECISIONS/184-inicio-dos-fichas-en-la-banda-y-atencion-hoy-en-filas.md) D2; cambia el ADR 152 D3 y D9 y el 126 D3 en "Atención hoy". Tablero "Mejoras visuales de Inicio - Bancos, Efectivo y Atención hoy". Cierra INI.7. Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v816.

- **Cada compromiso es una fila de 84:** logo de 40, nombre, estado con ícono y palabra en su color (rojo y triángulo, ámbar y reloj, gris y calendario, azul y círculo) y valor en cifras tabulares, con la flecha. Tocarla abre el lote con solo ese pago marcado (`inicio-pagar-uno`).
- **"N pagos · $X"** bajo el título, hasta tres filas, "N pagos más · $X" con sus logos y "Ver todos" (la hoja), y "Pagar los N" al pie. Sale el aviso destacado que resumía y "Ver los N".
- **Lo que no es un pago va aparte**, bajo "También necesita tu atención", una fila por aviso: el débito sin saldo con el logo de la cuenta, tu ingreso por distribuir, lo que te deben, la reserva de hoy, la nube.
- **La teja sin marca es neutra** (`tejaDePago` con `neutra`, también en la hoja): el frambuesa se confundía con el rojo de lo vencido. De paso, la teja buscaba el compromiso con el id del aviso (`tipo:id`) y nunca lo hallaba: sin marca salía siempre el ícono de deudas.
- **Lo que el tablero promete y el motor no trae:** el monto del ingreso por distribuir; esa fila sale sin valor.
- Pruebas: `atencion-hoy.test.js` (piezas, acciones, resumen, topes, lo de aparte), `inicio-rediseno.test.js` (84, 40, 48 y el lote con un solo pago marcado); `inicio-hoy`, `smoke`, `inicio-control-pago` y `movimientos-deshacer` ajustadas. Unitarias 6366/6366, E2E 580/580.

### feat(inicio): INI.7a, dos fichas en la banda · 2026-11-19

[ADR 184](DECISIONS/184-inicio-dos-fichas-en-la-banda-y-atencion-hoy-en-filas.md) D1; cambia el ADR 181 D1 en el teléfono. Tablero "Mejoras visuales de Inicio - Bancos, Efectivo y Atención hoy", la alternativa que eligió Esteban ("dos fichas en la banda"); la tarjeta puente no se aplica. Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v815.

- **Dos fichas en lugar de la ficha partida:** Bancos (logos de 26 montados 8) y Efectivo (disco verde de 34 con su billete), píldoras de 52 a 8 una de otra, sin flecha y con los montos en blanco. La banda sigue en 268 a 390 x 844 (4 de margen bajo las fichas).
- **Cada una abre su grupo:** "En bancos · N cuentas" o "En efectivo" ("Lo que llevas encima"). La otra ficha cambia de grupo sin cerrar; Escape devuelve el foco a la que lo abrió. `#saldo-detalle-toggle` ya no existe: el contenedor es `#saldo-fichas` y cada ficha lleva `data-lado`.
- **Lo que el tablero no mide:** a 360 y 320 no cabían en una línea; relleno, espacio, letra y tejas se encogen con el ancho, las cifras de diez caracteres bajan a 14 y, como último recurso, la segunda ficha baja de línea. Ningún monto se corta.
- Pruebas: `render.test.js` (grupos por ficha, cambio de grupo, la que se calla, máscara, cifras largas), `inicio-rediseno.test.js` a 390, 360 y 320 y cifras largas a 320; `smoke.test.js` e `inicio-control-pago.test.js` ajustadas. Unitarias 6366/6366, E2E 579/579.

### fix(cuentas): GAS.9g, la tarjeta con su nombre en Mis cuentas · 2026-11-19

[ADR 183](DECISIONS/183-gastos-que-cuadran.md) D4. Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v814.

- **La causa:** desde MC.16c la fila leía `tarjeta.nombre`; una deuda guarda su nombre en `descripcion`. La tarjeta salía sin nombre y con el ícono genérico (lo mostró la captura a 390 px de GAS.9d).
- **El arreglo:** lee `descripcion` y pone el logo del banco que el nombre diga, como la fila de Deudas.
- Pruebas: `tarjeta-en-mis-cuentas.test.js` (nombre, etiqueta y logo con un nombre guardado como en la app). Unitarias 6363/6363, E2E 577/577.

### feat(limites): GAS.9e, Límites sugiere al registrar, una vez · 2026-11-19

[ADR 183](DECISIONS/183-gastos-que-cuadran.md) D5. Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v813.

- **Cuándo:** al guardar el tercer gasto del mes (o más) en una categoría sin ningún límite, ni de una parte. Solo cuenta el día a día. Una vez por categoría y mes, y como mucho una al día; el "Ahora no" de Límites también la apaga.
- **Qué dice:** "Has hecho 3 gastos en Restaurantes este mes. ¿Quieres ponerle un límite para controlar cuánto gastas en esta categoría?"; si una parte pesa la mayoría (Domicilio), la sugerencia es para esa parte. "Poner límite" abre Nuevo límite con la categoría puesta.
- **Cómo se ve:** el aviso con Tino de siempre, detrás del aviso del gasto, hasta que llegue el diseño de Claude Design.
- Pruebas: `limite-sugerencia-al-registrar.test.js` (los límites existentes, el mes, una vez, una al día, pagos fuera, tarjeta, parte, categorías propias) y E2E `limite-sugerencia.test.js`. Unitarias 6362/6362, E2E 577/577.

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

## Convención de entradas

Cada entrada agrupa por fase/release y dentro lista commits con:
- **tipo(área)** - `commit_hash` · `archivos tocados` - descripción de qué cambió.

Tipos: `feat` (nueva funcionalidad), `fix` (bug), `refactor` (sin cambio funcional), `test`, `docs`, `chore` (config/build), `style` (formato).
