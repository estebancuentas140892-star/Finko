# Changelog - Finko Claude

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-07)

### test(e2e): BUG-019 y BUG-020, la compuerta E2E vuelve a verde · 2026-07-30

La suite E2E llevaba dos días caída sin que nadie lo supiera: la última corrida verde fue del 2026-07-28 (236/236), anterior a DIS.19, y el cierre de INV.1 fue el primero que la volvió a correr. Estaba en 20+ fallas con 146 tests sin ejecutar. Queda en **243/243**, y la unitaria en 3450/3450. Cero cambios en `modules/`: el defecto era de los tests, no de la app.

- **La causa dominante no era la obvia.** Que `.casa-ahorro__fila[data-vehiculo]` hubiera desaparecido explicaba solo 4 fallas. Las otras 16 eran que cada `.lane__cta` que DIS.19 agregó a los carriles **duplica la `data-action` de su sección**, así que todo selector `[data-action="..."]` a nivel de documento pasó a resolver 2 o 3 elementos y Playwright elegía el del carril oculto. Se acotaron a su sección los 25 sitios de las cinco acciones duplicadas. Es la clase de rotura que se repite con cada CTA nuevo en un carril, así que el patrón importa más que los sitios.
- **Tres tests de Metas afirmaban un sprite que ya no se dibuja.** `CATEGORIA_META_SILUETA['Boda'] = 'anillo'`: DIS.19 cambió `<use href="#c-anillo">` por una silueta que se llena. Ahora afirman la silueta, y la forma exacta la sigue fijando `tests/unit/metas.test.js` contra `SILUETAS.anillo`. No se duplicó el path en el E2E ni se agregó un atributo a producción para poder mirarlo: el unit test ya lo comparaba bien, así que el E2E se queda con lo que le toca a un E2E.
- **BUG-020, encontrado por el reloj.** `DIA_AYER` y `DIA_PASADO` de `compromisos.test.js` envolvían a módulo 28 para que el día existiera en cualquier mes; eso mantiene el día válido pero **le cambia el offset** a fin de mes, y el offset era justo lo que dos tests afirmaban. Con hoy = 30, "ayer" daba 1: 29 días de atraso. Fallaba 2 o 3 días de cada mes y salió porque la sesión cruzó la medianoche. Los dos pasan a `vi.setSystemTime` con `diaPago` explícito (convención de `agenda.test.js`); los otros 7 usos de `DIA_PASADO` se quedan, porque ahí solo hace falta "un día ya pasado".
- **Un defecto propio de INV.1, del día anterior.** `elegirOrigen()` ahora clickea el `<label class="chip-fecha">` en vez de llamar `.check()` sobre el radio oculto, que el label intercepta. Los otros cinco sitios "pasaban" solo porque `.check()` es no-op cuando el radio ya está marcado, así que la convención (documentada en `smoke.test.js`) estaba rota en seis sitios y se notaba en uno.

**Lo que queda dicho para la próxima:** DIS.19 actualizó los unit tests y no los E2E, y nada avisó. Mientras E2E no sea compuerta de cierre, cualquier cambio de markup puede volver a dejarla en rojo dos días sin que se sepa.

---

### feat(inversion): INV.1, el dinero sale de una cuenta al registrar una inversión · 2026-07-29

Hasta hoy `inversiones` era la única de las cuatro bolsas de ahorro que no tocaba cuentas, mientras `analisis` daba por hecho que sí: comprar un CDT con saldo de una cuenta registrada inflaba el patrimonio de forma permanente y en silencio (hallazgo H5 de la auditoría integral del 2026-07-25, [ADR 053](DECISIONS/053-invariante-de-patrimonio.md)). Ficha: [`contexto/inversion.md`](contexto/inversion.md).

- **La pregunta va en la captura, con dos ramas explícitas.** "Salió de mi cuenta" o "Ya la tenía", sin default silencioso: descontar de más borra dinero real y descontar de menos infla el patrimonio, y la app no puede deducir cuál pasó. La rama se sugiere según la fecha de inicio que el formulario ya pide (`origenSugerido()`, reciente = cuenta, vieja = preexistente) y siempre queda editable.
- **Con cuenta de origen, guardar descuenta y eliminar devuelve.** El alta resta el monto del saldo de la cuenta (con confirmación explícita si lo deja en negativo, mismo criterio que un aporte a una meta desde una sola cuenta); eliminar la inversión devuelve el monto vivo, no el original, porque un aporte posterior del asistente "Distribuir mi ingreso" también salió de cuentas.
- **La cuenta de origen ya borrada no inventa un destino.** Si la cuenta ya no existe al eliminar la inversión, el dinero no se devuelve a ninguna otra: inventar un destino sería fingir un movimiento que nunca ocurrió.
- **Sin ninguna cuenta activa, la pregunta no se dibuja.** El origen llega ausente y se trata como preexistente, la rama que no mueve dinero.
- **Alcance indivisible por el propio ADR**: alta con descuento, reversa al eliminar y la regla de cuenta ya borrada entregadas juntas, sin dejar la mitad más fácil para después.

`S.inversiones[].cuentaId` nuevo y opcional, sin bump de schema. 3450/3450 unit + lint verdes. SW v446 → v447.

---

### feat(ahorro): DIS.19, Ahorro en cuatro carriles · 2026-07-29

Sexta pasada de la auditoría por secciones, y la que cierra el frente de Ahorro. DIS.18 le dio a las cuatro modalidades una pantalla padre y resolvió la navegación, pero dejó el problema de fondo intacto: **la diferencia entre las cuatro estaba adentro de cada sección y la decisión se toma afuera**. Las filas eran monto y estado en texto, así que entrar era una apuesta, y las cuatro se sentían la misma cosa cuatro veces aunque el código ya las hubiera diferenciado. Arquitectura 1c de 3 evaluadas, informe en tres documentos (diagnóstico, arquitectura, gráficos). Fichas: [`contexto/ahorro.md`](contexto/ahorro.md), [`contexto/metas.md`](contexto/metas.md), [`contexto/apartados.md`](contexto/apartados.md), [`contexto/inversion.md`](contexto/inversion.md), [`contexto/transversal.md`](contexto/transversal.md).

- **Cuatro unidades distintas, no cuatro títulos distintos.** Cada carril de `#ahorro` trae su propio gráfico: el fondo en meses cubiertos, los apartados en columnas contra la marca de su plan, las metas en siluetas que se llenan, la inversión en dos columnas donde se ve lo que pone el tiempo. Que se distingan por la forma y no por el rótulo es todo el cambio: cuatro barras de porcentaje decían "lo mismo, cuatro veces".
- **El momento de uso ordena las cuatro con una sola pregunta.** "Ojalá nunca lo uses" sobre el fondo y "En una fecha que no elegiste" sobre los apartados explican la diferencia mejor que cualquier definición. `MODALIDADES_AHORRO` gana `cuando` y se reordena: fondo, apartados, metas, inversión. El orden anterior ("del más urgente al más lejano") decía casi lo mismo sin poder explicarse.
- **El total baja al pie en una línea.** Era la única cifra grande de la pantalla y no servía para decidir nada: nadie hace algo distinto por saber que tiene $24.770.000 repartidos en cuatro sitios.
- **La columna y la silueta SON la acción.** El prototipo elegía un item y luego pulsaba un botón; acá el toque abre el aporte directo. Un toque menos y, sobre todo, cero estado de UI que mantener: el hub se re-renderiza con cada `state:change` de las cuatro slices y una selección guardada se perdería o habría que persistirla en `S`, que no es su sitio.
- **Ningún carril en cero dibuja un gráfico vacío.** Dice qué hace la modalidad y ofrece su primer paso con la acción de su dominio (`ahorro-activar-fondo`, `nuevo-apartado`, `nueva-meta`, `inversion-nueva`). Cuatro rieles vacíos se leen como error, no como invitación. Los cuatro carriles se muestran siempre: una modalidad que no aparece no se puede descubrir.
- **La silueta de la meta también mide (Metas).** El centro del arco dejaba de trabajar en cuanto se reconocía el ícono. Ahora la figura se llena de abajo hacia arriba, así que a 62px la meta se reconoce **y** se mide con un solo dibujo. Diez figuras cerradas derivadas de los glifos que `CATEGORIA_META_ICONO` ya resolvía; un trazo abierto no se puede rellenar por altura sin que el nivel se lea como error de dibujo.
- **El comparador contesta la pregunta que ninguna tarjeta podía (Apartados).** Cada tarjeta responde bien "¿cómo va este apartado?"; para saber "de los cuatro, ¿cuál va mal?" había que recorrer la lista y recordar lo anterior. El comparador pone las columnas contra la misma escala, encima de la lista, y las tarjetas de abajo no cambian.
- **La franja del fondo absorbe la escalera (Fondo).** Los bloques de mes se ponen verticales y el eje rotula los tres niveles: un solo dibujo hace la prueba (cuánto aguantas) y el camino (los niveles y dónde caen). La lista de tres niveles que vivía aparte se retira, con unos 90px recuperados. En vertical los seis meses se comparan entre sí de un vistazo.
- **El compromiso mensual pasa de informar a medir (Fondo).** "Compromiso mensual: $420.000" no permitía saber si el mes iba cumplido sin abrir la lista de aportes y sumar a mano. Ahora una gota se llena con lo aportado en el mes, con la cuenta en pesos y los días que faltan al lado. Se llena con el mismo `siluetaMeta()` de las metas: el relleno por altura tiene una sola implementación en la app, no dos que se parecen.
- **Dos piezas bajan a infra en vez de duplicarse.** Dos de los cuatro gráficos necesitaban cálculo de otros dominios: la línea del plan (`planDeReferencia`, Apartados) y las dos columnas (`columnasPortafolio`, Inversión). ADN 10 prohíbe importarlos y DIS.18 ya se había negado a replicar `momentoInversion()` por lo mismo, así que nacen **`infra/bolsas.js`** e **`infra/portafolio.js`**, con re-export desde cada dominio para no tocar ningún llamador. `columnasPortafolio()` no se puede mover sola: arrastra la proyección de la que se deriva. Primer paso concreto de **ARQ.1**.
- **El agua se recorta con `clipPath`, no se tapa con el color del fondo.** La técnica del mockup daba el mismo dibujo solo mientras el contenedor tuviera ese color exacto: al montar la silueta en un carril con otro fondo, el rectángulo aparecía como un bloque. El id del recorte sale de la clave que pasa el llamador, así que dos siluetas no colisionan.
- **Los gráficos van `aria-hidden` y su lectura la dan las palabras** (regla R11): el estado del carril en su encabezado, el pie del comparador nombrando a los atrasados, y la silueta decorativa porque el arco ya anuncia el porcentaje. Emitir un `role="img"` dentro de un ancestro `aria-hidden` habría parecido el defecto que la regla R52 vino a corregir.
- Verificado en el navegador a 375px, tema oscuro y claro: los cuatro carriles con sus gráficos, sin desborde horizontal, contraste mínimo 4,88 en claro, cero errores de consola. Los cuatro botones de carril abren el formulario correcto. **Aporte de $400.000 al SOAT desde el carril:** la columna pasa de 50% a 82%, cruza su línea del 71%, pierde el estado de atraso y el pie cambia de "SOAT y Impuestos van por debajo" a "Impuestos va por debajo". 103 tests unitarios nuevos (6 de frontera de infra, 12 de `siluetaMeta`, 18 del comparador, 34 de la franja y el medidor, 21 del hub, 12 de integración). **3424/3424 unit + lint verdes.** SW v441 → v446.

**Fuera de alcance, y por qué.** **La celda de ahorro en Inicio** (item 4 del informe, bajaría el recorrido a dos toques) queda para triaje: toca la pantalla de arranque, que no es de esta sección. **El carril de Inversión sigue contando inversiones en vez de decir su etapa**: `momentoInversion()` es del dominio Inversión y sigue esperando el modelo unificado de ARQ.1; lo que bajó a infra fue la aritmética del gráfico, no la etapa. **El carril usa el nombre de la sección y no la frase descriptiva del mockup** ("Pagos que ya sabes que llegan" en vez de "Apartados"): renombrar solo en el hub dejaría dos nombres para una cosa mientras la hija sigue diciendo el suyo, y el nombre está en revisión abierta en **AH.7**. **La consecuencia de cada nivel del fondo** ("buscas trabajo con calma") se fue con la lista y sobrevive solo en el estado vacío: la franja no tiene sitio para tres frases. **E2E no se corrió**: la tarea no tocó el arranque de la app ni agregó flujos nuevos, y los cuatro formularios que disparan los carriles ya están cubiertos por sus propias suites.

---

### feat(ahorro): DIS.18, Ahorro pasa de encabezado repetido a pantalla propia · 2026-07-28

Quinta y última pasada de la auditoría por secciones, y la primera que no analiza una pantalla sino **la relación entre cinco**. El bloque "Tu ahorro total" no tenía dónde vivir: era el resumen de una sección que Finko nunca construyó, así que se repetía en las cuatro hijas y arrastraba una barra de pestañas que existía para tapar ese hueco. Decisión completa en el [ADR 056](DECISIONS/056-la-casa-de-ahorro.md). Ficha: [`contexto/ahorro.md`](contexto/ahorro.md).

- **El padre existía como encabezado y ahora existe como dirección (regla R70).** `#ahorro` es la casa de las cuatro modalidades; el fondo de emergencia se muda a `#fondo`. Restaura la intención del [ADR 009](DECISIONS/009-consolidado-de-ahorro.md), que pedía **una** card "en el tope de la sección Ahorro", en singular, y supersede el D4 del [ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md), que la había convertido en cabecera de cuatro secciones.
- **Un bloque idéntico no se repite entre hermanas (regla R71).** Se retiran la franja `.hub-tabs` y el slot `[data-hub-consolidado]` de Fondo, Metas, Apartados e Inversión: 316px de encabezado idéntico antes del contenido propio, medidos a 390px. El título de Metas pasa de 365px a 68px del tope y su primera tarjeta de 433px a 128px.
- **Las filas del desglose se vuelven la navegación.** Ya lo eran a medias con un enlace "Ver" de 18px; ahora la fila entera es el destino. Y desaparecen las barras de participación: el reparto en porcentaje no ayuda a decidir a dónde entrar.
- **Un destino, un camino (regla R72).** Había tres caminos a una modalidad hermana (pestañas, "Ver" y el menú "Más") y ninguno canónico. En "Más", las cuatro tejas del grupo "Ahorros" pasan a una a ancho completo. El sidebar de desktop conserva las cuatro entradas directas como atajos declarados: el problema medido era de móvil.
- **La taxonomía se enseña donde los términos conviven (regla R73).** Cada fila lleva una línea de para qué sirve ("Para pagos que ya sabes que llegan"). Ese texto no es nuevo: hoy vive disperso en los estados vacíos de Metas y Apartados, que se remiten entre sí, o sea en la pantalla a la que el usuario llegó equivocado.
- **Un resumen sirve para decidir sin entrar (regla R74).** Cada fila muestra su estado en la unidad de su sección: meses cubiertos, metas en curso, días al próximo cobro, inversiones abiertas.
- **Las cuatro filas se muestran siempre, también en cero.** `consolidarAhorro()` ordenaba por monto y escondía las bolsas vacías: correcto para un desglose, erróneo para una puerta. Lo reemplaza `casaAhorro()` con orden fijo de taxonomía. Una modalidad que no aparece no se puede descubrir.
- **Cada hija abre con "volver a Ahorro"** (`.section__volver`, el patrón que ya usaba Movimientos): en la PWA instalada no hay botón "atrás" del navegador, así que desde Metas no había salida vertical, solo lateral.
- **El título pasa a "Todo lo que tienes guardado"** y pierde el subtítulo que enumeraba las cuatro fuentes: las cuatro filas están justo debajo.
- Verificado en la app a 375px con los datos del mockup: total $22.264.000, las cuatro filas con sus montos y estados ("el más próximo, en 23 días"), fila de 84px, sin scroll horizontal ni errores de consola, y `#ahorro` → fila del fondo → `#fondo` → volver. 26 tests unitarios nuevos, `hub-ahorros.test.js` reescrito. **3337/3337 unit + 236/236 E2E + lint verdes.** SW v440 → v441.

**Fuera de alcance, y por qué.** **La fila de Inversión cuenta inversiones en vez de decir su etapa** ("construyendo" en el mockup): esa etapa sale de `momentoInversion()` en el dominio Inversión, importarlo rompe la regla ADN 10 y replicarlo duplicaría el cálculo que **ARQ.1** existe para unificar. **Promover "Ahorro" a la barra inferior** queda sin decidir: implicaría mover Calendario, que es decisión de otra sección. **El nombre "Apartados"**, que colisiona con "apartar" (el verbo genérico de ahorrar en toda la app), queda señalado y sin resolver: es lenguaje de producto y toca varias pantallas. **`#ahorro` no redirige a `#fondo`**: un bookmark viejo llega a la casa, que enlaza al fondo en su primera fila, así que sube un nivel en vez de perderse.

---

### feat(fondo): DIS.16, el fondo se mide en tiempo y no en porcentaje · 2026-07-28

Tercera sección del hub de ahorro en la pasada de arquitectura, y la que tenía dos problemas que ninguna otra tiene: **el objetivo se mueve solo** (si suben los gastos fijos el porcentaje cae sin que el usuario haya gastado un peso) y **no hay final** (llegar a tres meses no es terminar). Arquitectura **I con la prueba de H**, la mezcla que Esteban sugirió. Ficha: [`contexto/ahorro.md`](contexto/ahorro.md).

- **La unidad de la sección deja de ser el porcentaje y pasa a ser el tiempo.** "60%" no dice cuánto aguantas; "cubres tus gastos hasta el 21 de septiembre" sí. El anillo de progreso se retira y el porcentaje baja a un rótulo pequeño al pie de los bloques, que es todo el peso que merece.
- **Cuatro piezas, un trabajo cada una.** El **nombre del nivel** dice qué logró ("Un mes cubierto"), los **bloques de mes** demuestran la cobertura (una afirmación de texto hay que creerla; agosto entero y casi todo septiembre se ve), la **escalera** dice hacia dónde va y el **veredicto** dice qué hacer.
- **Un logro alcanzado no se retira cuando el objetivo se mueve (regla R66).** `nivelesFondo()` corta contra meses cubiertos, no contra un porcentaje del objetivo: si suben los gastos fijos, el usuario no perdió el nivel, cambió lo que falta.
- **Un camino sin final muestra siempre el siguiente tramo (regla R67).** Cumplir la meta no apaga la tarjeta: el tercer nivel queda activo y la secundaria pasa de "Editar" a "Subir mi meta a 6 meses", que nombra su destino en vez de obligar a abrir el formulario para saber a cuánto.
- **Un porcentaje muy bajo se dice con palabras (regla R68).** Recién cruzada la meta el avance hacia seis meses es del 3%, y mostrarlo justo al celebrar convierte el logro en una cuenta pendiente: ahí dice "apenas empiezas". Y en cero, cuando el tramo ni siquiera empezó, dice "próximo": "apenas empiezas" sin haber puesto un peso suena a reproche.
- **Si una cifra necesita que el usuario haga una cuenta mental, está mal escrita (regla R69).** "1,8 meses cubiertos" era la cifra más importante de la sección y estaba en lenguaje de hoja de cálculo: pasa a "1 mes y 3 semanas". "Ahorras el 23% de tus ingresos" pasa a "de cada $100 que recibes, guardas $23". "Compromiso: $250.000/mes" pasa a "Te propusiste guardar $250.000 cada mes". "Objetivo: 3 meses ($4.382.700)" pasa a "Tu meta es cubrir 3 meses: hoy son $4.382.700", donde el "hoy" además advierte que la cifra se mueve.
- **El momento más frágil es el de cero pesos, y la tarjeta lo trata distinto.** No dice "0 meses cubiertos" como cifra grande sino el nivel al que va ("Vas a empezar / Tu primer mes"); el veredicto apunta al **primer nivel** y no a la meta completa ("Guardando $366.000 al mes, en 4 meses llegas a tu primer nivel"), porque "te faltan $4.382.700" es la lectura que más desanima justo cuando menos conviene.
- **Los tres niveles aparecen desde antes de existir el fondo**, apagados: son la promesa de la sección, y la última línea traduce el primero a pesos con datos que Finko ya tiene, así que activarlo no se decide a ciegas.
- **La sección entra al ojo de privacidad** (regla R20): se enmascara lo que está en pesos y sobreviven el nivel, la fecha, los bloques, los meses cubiertos y el porcentaje. Es la arquitectura que mejor lo aguanta, precisamente porque su unidad es el tiempo. "De cada $100, guardas $23" tampoco se tapa: es una proporción, no un saldo.
- **Un primario por pantalla** (regla R1): el botón de registrar se fue del encabezado de "Aportes al fondo" y vive en la tarjeta, a ancho completo, con el nombre del paso ("Hacer mi primer aporte" la primera vez). Las dos acciones a 44px, con la excepción a `.btn-sm` en `responsive.css` por el motivo de capa de siempre.
- Verificado en la app a 375px con los cuatro estados construidos sembrados y en tema oscuro, con las cifras del mockup ($1.460.900 de gastos fijos, meta de 3 meses): sin scroll horizontal, sin errores de consola, acciones medidas en 44px. 46 tests unitarios nuevos, 3 E2E adaptados. **3323/3323 unit + 235/235 E2E + lint verdes.** SW v439 → v440.

**Fuera de alcance, y por qué.** **Los estados 4 y 5 del mockup quedan a medias, y a propósito.** El "tardaste 14 meses en llegar" del estado 4 y la explicación del retroceso del estado 5 ("tus gastos subieron de $1.460.900 a $1.680.000, así que el mismo dinero te cubre menos tiempo: no perdiste nada") necesitan dos datos que `S.ahorro` no guarda: cuándo se alcanzó cada nivel y con qué gasto fijo se calculó el nivel anterior. El informe de diseño los deja anotados para implementación y pasan por triaje. Lo importante del estado 5 **sí** está: el nivel logrado no se retira cuando el objetivo sube. **"Desactivar" no vuelve a la tarjeta**: el mockup lo dibuja junto a "Editar", pero DIS.12 lo bajó al modal con `.btn-danger` (regla R53) y esa decisión es posterior; subirlo pondría una acción destructiva al lado de una de rutina. **"Gastos fijos" se conserva como término** y se explica en palabras la primera vez que aparece ("lo que pagas sí o sí"): retirarlo del todo afecta a varias secciones.

### feat(inversion): DIS.17, la sección pasa a los tres momentos · 2026-07-28

Cuarta y última sección del hub de ahorro en la pasada de arquitectura, y la que menos se parece a las otras tres: **acá no hay aportes**. Una inversión se registra una sola vez, no tiene recurrencia ni monto objetivo, así que nueve de los once elementos que tenían Metas, Apartados y Fondo simplemente no existen. De ahí sale la arquitectura **O, "los tres momentos"**, con el gráfico de la propuesta **N**. Ficha: [`contexto/inversion.md`](contexto/inversion.md).

- **La cabecera deja de ser un total y pasa a ser la etapa del usuario.** El total invertido era la cifra protagonista y no enseñaba nada por sí sola: no decía de qué está hecho el portafolio ni qué le aporta el tiempo, que es la única razón para invertir. Momento 1 (una inversión): la tarjeta explica **qué compró**. Momento 2 (dos o más): muestra el conjunto y de qué está hecho. **Lo que se enseña cambia cuando el usuario cambia** (regla R65): la explicación de qué es un CDT educa el primer mes y es ruido el mes doce.
- **Una figura enseña dos cosas porque una es la partición de la otra (regla R64).** Dos columnas de altura comparada: la de hoy está partida por tipo de inversión, así que la diversificación se ve sin nombrarla, y la de al vencer repite ese mismo cuerpo y le añade un segmento encima. Ese segmento es lo que pone el tiempo, es pequeño en un portafolio joven, y **es honesto**: invertir no es rápido, y quien lo vea crecer con los años entiende el interés compuesto sin que nadie se lo explique.
- **Cada sección del hub tiene su propia figura, y la forma la decide lo que se mide (regla R63).** Metas un arco (rodea lo que quieres), Apartados dos barras enfrentadas (tu dinero contra tu plan), Fondo bloques de mes y escalera (se cuentan meses, hay etapas), Inversión dos columnas (se compara antes y después). Es lo que permite reconocer dónde estás antes de leer el título.
- **Ninguna barra de progreso:** una inversión no tiene meta, y ponerle una sería inventársela. La lista de porcentajes por tipo desaparece como lista y pasa a ser **la leyenda del gráfico**, donde cada parte dice además qué esperar ("CDT · 40% · plazo fijo", "Acciones · 34% · sube o baja").
- **El idioma de banco sale entero.** "Rentabilidad nominal 10,1% EA a real 4,7%" era la frase más difícil de la app para quien está aprendiendo; ahora dice "Tu dinero crece 10,1% al año. Como los precios suben 5,1%, lo que de verdad ganas es 4,7%". Igual "Al vencimiento: $X (+$Y)", que pasa a "En julio de 2027 tendrías $X. De eso, $Y los pone el tiempo". Los emoji de calendario y de rayo, que seguían en el código como en Límites y el hub, se van. **El cálculo de E.5 no cambia**: se mantiene el descuento por IPC observado y solo se reescribe el texto.
- **Los nudges dejan de acumularse.** El hero, la card de proyección, la pila de recomendaciones y el tip permanente se fusionan en la tarjeta del momento: la concentración y el refuerzo positivo entran en la frase, y el de retorno variable lo dice la nota que explica qué no entra en el cálculo. `detectarNudgesInversion()` sigue siendo la fuente: `momentoInversion()` la consume, no la reemplaza.
- **El nudge del fondo de emergencia se conserva y además manda.** Sin fondo activo, la acción principal del momento 1 es "Ir al Fondo de emergencia" y registrar baja a secundaria (a 44px, regla R4, con la excepción a `.btn-sm` en `responsive.css` por el motivo de capa de siempre). El botón de la cabecera de la lista se retira: un primario por pantalla (regla R1).
- **Sin nada proyectable la segunda columna no se dibuja.** Un portafolio de puras acciones o cripto no tiene "después", que era la limitación conocida de la arquitectura N; repetir la primera columna fingiría una comparación que no existe, así que en su lugar la nota invita a agregar tasa y plazo. Las dos columnas comparten escala exacta y por eso el stack no lleva `gap`: 2px por segmento descuadraban la comparación (medido en la app, 94 contra 92 px de cuerpo para el mismo dinero).
- Verificado en la app a 375px con los cuatro estados sembrados (una inversión con fondo sin activar, tres inversiones diversificadas con fondo completo, portafolio concentrado al 72% sin nada proyectable, y tema oscuro): sin scroll horizontal, sin errores de consola, primario a 44px. 27 tests unitarios nuevos, 5 E2E adaptados. **3278/3278 unit en el commit + 235/235 E2E + lint verdes** (en el árbol de trabajo son 3317: los 39 de diferencia son de DIS.16, que sigue sin commitear). SW v437 → v439, saltándose el v438 por el mismo motivo.

**Fuera de alcance, y por qué.** **El momento 3, "tu dinero ya trabaja para ti", queda diseñado y sin construir**: necesita que Finko guarde el **valor real de cada inversión en el tiempo**, y hoy solo guarda el monto inicial y la tasa que el usuario escribió, así que la frase no tendría con qué probarse. El conteo sí lo nombra ("momento 1 de 3") y **el anticipo del momento 2 se reescribió para no prometerlo**: en vez de "vas a ver cuánto rindieron de verdad" habla del interés compuesto, que sí es verdad hoy. **Editar una inversión** tampoco entra: es la misma familia de **EDIT.1** y el flujo no existe, así que la tarjeta de cada holding conserva solo Eliminar. **INV.1** (preguntar de dónde sale el dinero al registrar) sigue siendo dueña de su tema y no se toca. El **consolidado del hub Ahorros** vive en `ahorro/view.js` y es común a las cuatro secciones.

### feat(apartados): DIS.15, las dos carreras reemplazan la fila · 2026-07-28

Segunda sección del hub de ahorro que pasa por la pasada de arquitectura. La respuesta de Metas **no se hereda**: un apartado no es una meta, su fecha es un vencimiento externo (el SOAT vence el 20 de agosto quieras o no) y su logro no es llegar al 100% algún día sino no quedar corto el día del cobro. De ahí sale la arquitectura **E, "las dos carreras"**, y el que Apartados se vea distinto de Metas es una decisión, no un descuido: tratarlos igual fue lo que produjo la fila anterior. Ficha: [`contexto/apartados.md`](contexto/apartados.md).

- **El protagonista deja de ser el dinero y pasa a ser el plazo.** El bloque grande dice cuántos días faltan; el anillo de progreso se retira y el badge de días deja de ser un badge al final del subtítulo. Con el apartado ya reunido ese mismo bloque cambia de dato y dice cuánto sobró ("Ya lo reuniste, con 23 días de sobra").
- **Dos carreras enfrentadas, y ahí está toda la idea.** Arriba el dinero reunido como barra continua; abajo, lo que el plan preveía tener hecho hoy, dibujado en casillas de aporte. Se comparan por longitud, así que la tarjeta se entiende **sin leer un número**. Las dos filas usan la misma tinta a propósito (regla R60): si una se dibujara más vistosa que la otra ganaría el vistazo y la comparación se invertiría.
- **El referente son aportes, no el reloj (regla R61).** `planDeReferencia()` parte el objetivo en los aportes que caben entre el arranque del plan y la fecha objetivo, y cuenta cuántos ya deberían estar hechos. No sirve `calcularAporteSugerido()`, que se recalcula desde el faltante de hoy y por construcción siempre diría "vas al día"; y no sirve el tiempo transcurrido, porque el dinero entra a saltos mientras el calendario corre continuo: con una cuota mensual a seis meses el error llega a 17 puntos y la tarjeta regañaría a quien aporta puntual.
- **El veredicto habla solo con un aporte completo de diferencia (regla R62)**, y sabe decir algo que ninguna tarjeta de Finko decía: **que vas adelantado**. En un apartado eso es el logro real, y no exige llegar al 100%.
- **Sin fecha objetivo se cae la segunda carrera, y no se finge** (regla R57, la que dejó Metas): el monto reunido sube al lugar protagonista y la tarjeta dice qué ganaría el usuario con una fecha.
- **El arranque del plan tiene dos fuentes y por eso hay un campo nuevo.** `fechaCreacion` (que `crud.guardar` estampa desde siempre) para el primer ciclo, y **`fechaInicioPlan`**, que `reiniciarCiclo()` empieza a anotar al cerrar uno. Sin ese sello, un apartado recurrente medía su plan desde el día que se creó: verificado en la app, un ciclo recién reiniciado mostraba "vas 4 aportes atrás" el mismo día uno. Campo opcional, sin declarar en `createInitialState()` y sin migración (quien no lo tenga cae a `fechaCreacion`), **sin bump de `SCHEMA_VERSION`**: mismo criterio que MC.13f.
- **La sección entra al ojo de privacidad**, que hasta hoy no llegaba a ninguna vista del hub de ahorro (hallazgo MT.b, regla R20). Se enmascara solo lo que está en pesos, incluido el monto del botón y la suma del aviso de apartados próximos; el porcentaje, las dos barras, los días y el conteo de aportes siguen legibles porque no revelan cuánto dinero hay.
- **La recurrencia sube a la cabecera** como marca ("cada año"), en vez de ser la cola de una línea de metadatos: es lo único que distingue esta sección. **La acción principal** ocupa el ancho completo y trae el monto ya decidido; Eliminar cae al renglón de menor peso. Las dos a 44px (regla R4), con la excepción a `.btn-sm` en `responsive.css` por el mismo motivo de capa de siempre.
- **Un plan largo no dibuja cien casillas:** pasado un tope de 24, la segunda carrera se dibuja como barra continua y su encabezado sigue diciendo el conteo exacto.
- Verificado en la app a 375px y 320px con los seis estados sembrados, más el ciclo cerrado de punta a punta: "Ya lo usé" guarda `fechaInicioPlan` y la tarjeta pasa de "vas 4 aportes atrás" a "0 de 13 aportes, vas al día". Sin scroll horizontal, sin errores de consola, acciones medidas en 44px. 31 tests unitarios nuevos y 3 reescritos, 3 E2E adaptados. **3254/3254 unit + 235/235 E2E + lint verdes.** SW v436 → v437.

**Fuera de alcance, y por qué.** **"Editar" y el CTA "Elegir fecha"** del mockup **no se implementan**: Apartados no tiene flujo de edición (es una rebanada pendiente de **EDIT.1**), así que el renglón secundario queda solo con Eliminar y el estado sin fecha dice qué ganaría el usuario con una fecha sin ofrecer un control que no existe. Ofrecer un botón que no lleva a ninguna parte habría sido peor que la ausencia. **La historia entre ciclos** del estado 4 ("el año pasado llegaste con 12 días de sobra", "reunido en 4 meses sin fallar un aporte") tampoco: `fechaInicioPlan` deja media memoria puesta, pero falta anotar el cierre con sus días de sobra y no hay ledger de aportes. **El consolidado del hub** (hallazgo A13 y los emoji de A2) sigue en `ahorro/view.js`, común a las cuatro secciones. **AP.5** conserva el formulario: nada de esto toca los campos ni el toggle de recurrencia.

### feat(metas): DIS.14, la meta pasa de fila a tarjeta con medidor · 2026-07-28

Segunda pasada de la auditoría de diseño sobre Metas, la que decide **estructura** y no detalle: la arquitectura **A2** que Claude Design dejó aprobada en la carpeta "Diseño Secciones". La meta deja de ser una fila horizontal con el anillo de 56px en una esquina y pasa a ser `.meta-card`, tarjeta vertical con medidor semicircular, el mismo movimiento que hizo `.deuda-card` en D.16d. Ficha: [`contexto/metas.md`](contexto/metas.md).

- **El objetivo deja de competir con lo acumulado (regla R59).** Antes la fila enfrentaba "$1.200.000" con "de $3.500.000" y la cifra mayor era la de lo que falta, así que la pantalla que debía celebrar avance medía carencia. Ahora el objetivo es el **extremo derecho de la escala del arco** y la única cifra grande es la ya lograda. De paso desaparece la tercera repetición del mismo hecho: el porcentaje vive solo en el arco.
- **El ícono de la meta se muda al centro del arco**, a 44px: el progreso rodea a lo que se persigue en vez de etiquetar la fila. Va sobrepuesto por CSS y no dentro del `<text>` del SVG, por el mismo motivo que `.apartado__anillo-icono`: `meta.icono` puede ser un emoji heredado (CAT.2b) o un id del sprite, y dentro de `<text>` el segundo se imprimiría escapado.
- **Un dato que no existe se ofrece, no se rellena (regla R57).** Sin fecha límite no hay plan de aportes: son tres datos que no existen, y el hueco lo ocupa "Ponle una fecha y Finko calcula cuánto guardar por quincena" con un enlace que abre el formulario de edición, donde vive el campo. Nada de guiones ni "N/D".
- **Un estado terminal conserva su forma (regla R58).** La meta cumplida mantiene la tarjeta y cambia su contenido: arco cerrado en el verde de logro, sin acción de aportar, editable y eliminable como desde DIS.13.
- **Meta recién creada.** Con la meta en cero la cifra grande sería "$0" bajo un arco vacío, doble señal de ausencia en el momento más frágil: esa línea la ocupa "Tu primer aporte arranca el camino", el primer dato pasa a ser el objetivo y el botón nombra el paso ("+ Hacer el primer aporte"). Es el riesgo que la propia arquitectura A se había señalado, y elegir A2 (ícono al centro) es lo que lo desactiva.
- **Las tres acciones a 44px, y MT.g cerrado dentro de Metas.** La principal ocupa el ancho completo con el tinte de la sección (botón propio, no `.btn-primary`: el verde del acento diría "ingreso"); Editar y Eliminar caen a un renglón de menor peso, separados a los extremos, así que eliminar deja de competir con aportar. La excepción a los 36px de `.btn-sm` vive en `responsive.css`, que gana por capa sin importar la especificidad: cuarto caso de la misma familia, junto a Apartados, Límites y Mis cuentas. **`btn-sm` global sigue sin decidirse**, pero ya no lo sufre esta sección.
- **El copy visible adopta "aporte".** El plan se cuenta en aportes ("47 aportes de $502.128 por quincena"), así que un botón que dijera "+ Abonar" contradiría la línea de arriba; además "aporte" es la palabra que Apartados y Fondo ya usan. Cambia lo que el usuario lee (botón, título del modal, etiqueta del campo, confirmación de sobregiro, anuncio del lector); **los ids del DOM y las `data-action` conservan su nombre** (`abonar-meta`, `#form-abono-meta`): renombrarlos sería un refactor sin efecto para el usuario.
- **`arcoProgreso()` nace en `infra/svg.js` como hermano de `progressRing()`**: mismo `pathLength="100"`, mismo keyframe `ring-fill`, color por `currentColor` bajo el mismo `.progress-ring-wrap`, y sin `width`/`height` para estirarse al contenedor. Se retira la línea de `responsive.css` que subía la columna del ícono a 56px: quedó sin sujeto al desaparecer la fila.
- Verificado en la app a 375px y a 320px con los cinco estados sembrados (en curso, sin fecha, en cero, cumplida y con el ojo activo): sin scroll horizontal, ícono medido en el centro exacto del arco (120, 64 del viewBox), arco en el púrpura de Metas, secundarias en 44px y, con el saldo oculto, "21% · $0 · •••• · Faltan •••• · 47 aportes de •••• por quincena · Meta: 28 de junio de 2028". 24 tests unitarios reescritos o nuevos (13 de la tarjeta y las cumplidas en `metas.test.js`, 11 de `arcoProgreso()` en `svg.test.js`) y 11 E2E adaptados. **3223/3223 unit + 235/235 E2E + lint verdes.** SW v435 → v436.

**Fuera de alcance, y por qué.** **La historia de la meta cumplida** que pide el estado 4 del mockup ("12 aportes en 6 meses", "Lograda el 12 de julio de 2026, un mes antes de tu fecha") **no se implementa**: `montoActual` es un campo cacheado sin ledger de aportes y no existe `fechaCumplida`, así que exige modelo de datos nuevo y bump de schema, que es otra tarea. **El consolidado "Tu ahorro total"** (los emoji del hallazgo MT.f y su máscara del ojo) sigue en `ahorro/view.js`, común a las cuatro secciones del hub: fuera del alcance de Metas. **El `select` de categoría** (MT.h) se queda como está por decisión del propio informe: el [ADR 048](DECISIONS/048-metas-v2-subcategorias-y-plan-de-aportes.md) D1 va a rediseñar ese control en MT.6. **Apartados, Fondo e Inversión** no se tocan pese a que la arquitectura A2 se pensó para ponerse a prueba en Apartados: sus carpetas de diseño existen y son otra tarea.

### feat(metas): CAT.1c, el catálogo de Metas adopta la taxonomía global · 2026-07-27

Última rebanada de **CAT.1**: la iniciativa de taxonomía global queda completa y su tarjeta sale del tablero. Ejecuta lo que Esteban validó el 2026-07-13 ([ADR 014](DECISIONS/014-taxonomia-categorias-transversal.md), sección "Validación 2026-07-13") sin reabrir nada: **Cumpleaños** sale del formulario de metas (es un gasto esporádico anual y vive en Apartados, donde CAT.1b ya lo dejó como plantilla) y **Vacaciones** se fusiona con **Viajes** (un concepto, una etiqueta: decisión 3 del ADR). Ficha: [`contexto/transversal.md`](contexto/transversal.md).

- **El catálogo se parte en dos, como en CAT.1a.** `CATEGORIAS_META` sigue siendo la lista completa y `CATEGORIA_META_ICONO` sigue derivándose de ella, así que una meta guardada con Vacaciones conserva su palmera; el formulario lee `CATEGORIAS_META_USUARIO`, el catálogo curado. Se prefirió el par base/usuario a borrar las dos entradas y admitir huérfanas en el mapa de íconos: es la convención que `CATEGORIAS_GASTO`/`CATEGORIAS_GASTO_USUARIO` ya escribió en el mismo archivo, y deja intacto el guardarraíl TX.4 (que compara etiquetas entre catálogos leyendo el mapa completo).
- **Filtrar el formulario no bastaba, y el ADR no podía saberlo: EDIT.1a cerró después de esa validación.** Con el selector curado a secas, editar una meta vieja de Vacaciones caía en "Sin categoría" porque ninguna opción coincidía, así que corregir el nombre le **borraba la categoría y le cambiaba el ícono**: destrucción de datos como precio de una corrección tipográfica, justo lo que EDIT.1a vino a evitar. `_renderOpcionesCategoria()` ahora reinyecta la categoría retirada al final de la lista **solo cuando la meta editada ya la tenía**: nunca se ofrece para metas nuevas. El caso no existe en Gastos porque allí la categoría es obligatoria y el usuario re-elige; en Metas es opcional y la pérdida era silenciosa.
- **Sin bump de schema**: es curación de constantes, no modelo de datos (decisión 6 del ADR 014). Ninguna meta guardada se migra ni se reetiqueta.
- Verificado en la app con dos metas sembradas (una de Vacaciones, otra de Viajes): la lista mantiene `#c-palmera` y `#c-avion`, el formulario nuevo ofrece 10 categorías sin Cumpleaños ni Vacaciones, y editar la meta legada guarda `categoria: 'Vacaciones'` con su progreso intacto. 7 tests nuevos (4 de catálogo en `constants.test.js`, 3 del selector en `metas.test.js`). **3208/3208 unit + lint verdes.** SW v434 → v435.

**Fuera de alcance, y por qué.** No se toca `ICONOS_CATEGORIA_PERSONALIZADA`, que conserva su símbolo "Vacaciones" 🌴: es el catálogo del picker de la categoría "Otra", no taxonomía de secciones. **CAT.3** (categorías personalizadas globales) hereda la regla de retiro con edición segura, anotada en la ficha, pero sigue pendiente de su modelo de datos.

### docs(tesoreria): MC.16, la tarjeta de crédito se decide como producto de Deudas · 2026-07-27

[ADR 051](DECISIONS/051-tarjeta-de-credito-producto-integrado.md) pasa de **Abierta** a **Aceptada** con la **alternativa B** elegida por Esteban, y MC.16 deja de ser una tarjeta bloqueada para quedar re-cortada en 5 rebanadas ejecutables. Sin una línea de código: es el paso que el propio ADR exigía antes de escribir la primera ("Esteban elige entre A, B y C"). Ficha: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md).

- **Lo que cambió la decisión fue el análisis del modelo actual, no una preferencia.** El ADR se escribió el 2026-07-24 asumiendo que la tarjeta era un concepto nuevo. No lo es: `CATEGORIAS_DEUDA` ya incluye `'Tarjeta de crédito'` con `tasa`, `tasaUnidad: 'EA'`, `cuotaMensual` y `saldoTotal`; `Gasto.compromisoId` ([ADR 002](DECISIONS/002-abono-deudas.md)) ya mueve el saldo de una deuda y lo sincroniza al editar y al eliminar (`_ajustarSaldoDeuda`); la D.14 ya acredita una cuenta al crear una deuda y revierte el crédito exacto al borrarla. La mitad del producto estaba construida y ninguna de las tres alternativas del ADR lo sabía.
- **B gana porque el patrimonio queda correcto por construcción.** `calcularActivos()` no lee `compromisos` y `calcularPasivos()` ya suma el `saldoTotal` de toda deuda activa: una tarjeta modelada como compromiso cumple la I5 del [ADR 053](DECISIONS/053-invariante-de-patrimonio.md) ("un cupo disponible nunca es un activo") sin tocar la capa de análisis. **A** (tipo de cuenta nuevo) dejaba el cupo a un `calcularTotalCuentas()` de distancia del patrimonio y revisaba de hecho la migración v11; **C** (entidad propia en `infra/`) crea un concepto nuevo para un solo consumidor, cuando `infra/vencimientos.js` se justificó porque **tres** dominios calculaban lo mismo.
- **Saldo revolvente, una deuda por tarjeta** (decisión de Esteban, D2), con su costo dicho en el ADR y no escondido: "¿a cuántas cuotas?" sube `cuotaMensual` en `monto / N` pero **no crea un plan por compra**, así que el pago anticipado recalcula el total de la tarjeta y no una compra puntual. Una deuda por compra habría multiplicado las filas de Deudas y de Calendario y exigido una agrupación de dos niveles que hoy no existe.
- **Superficie total del diseño: dos campos opcionales y un signo.** `Compromiso.cupoTotal` (que además discrimina "tarjeta operable" de "deuda de tarjeta vieja", sin bandera paralela), `Gasto.consumoTC` (necesario porque el abono a la propia tarjeta lleva el mismo `compromisoId` y el signo sería ambiguo) y el sentido que `_ajustarSaldoDeuda` ya sabe aplicar. `renderSelectorCuenta` recibe las tarjetas **por parámetro**: infra no aprende a leer `S.compromisos`.
- **Dos prohibiciones quedan escritas en el ADR**, porque son el atajo que rompería todo: no se crea una `Cuenta` para una tarjeta ni siquiera "solo para mostrarla" (D5), y la tarjeta solo se ofrece como forma de pago en **Gastos** (D4): no se ahorra, no se aporta a una meta y no se transfiere con cupo de crédito.
- **La estructura de dos niveles no se re-decide.** La entidad es la marca del `bank-picker` (tag `banco` de `BANCOS_CO`) y el producto es la `descripcion` del compromiso: el ADR consume el D3 del [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md), validado el 2026-07-13, en vez de inventar una tercera forma de representar lo mismo (el riesgo que el [ADR 048](DECISIONS/048-metas-v2-subcategorias-y-plan-de-aportes.md) D1 señalaba).
- **Rebanadas nuevas en el tablero:** MC.16a (`cupoTotal` + bump a v28 con migración no-op, precedente v26 → v27), MC.16b (el consumo, indivisible por la I3: alta, edición y eliminación juntas), MC.16c (bloque en Mis cuentas, solo lectura), MC.16d (cuotas) y MC.16e (nudges de avance, otra red y pago mínimo, limitados por el [ADR 003](DECISIONS/003-tono-neutral-profesional.md)). Con MC.16b en producción, `consumosTC` del monitor de renta deja de ser captura manual (CFG.2a).

**Fuera de alcance, y por qué.** No se escribió código: el ADR fija el diseño y cada rebanada se implementa por separado, como pide su propio plan. **Fecha de corte y ciclo de facturación** quedan fuera del ADR: un consumo entra a `saldoTotal` el día que ocurre, y modelar el corte cambia lo que Calendario proyecta. Los **intereses corrientes** no se capitalizan solos: la `tasa` se registra y sirve para advertir (`detectarDeudaCreciente` ya existe). Sin tocar `modules/`, no hay tests que correr ni SW que bumpear.

### fix(tesoreria): MC.13f, confirmar el cobro que Finko no puede datar · 2026-07-27

Hallazgo de la auditoría integral del 2026-07-25. `estadoDistribucion` descarta los cobros anteriores a la fecha de creación del ingreso, y hace bien: sin eso, registrar un ingreso cuyo día de pago ya pasó produciría un falso "ya recibiste". El efecto lateral era el problema: quien registraba un ingreso **a mitad de periodo** (la quincena ya cobrada, el ingreso creado ese mismo día) quedaba sin poder distribuir hasta el cobro **siguiente**, y el CTA "Distribuir" del detalle del día de Calendario seguía ofreciéndose sobre ese cobro pasado, abriendo un asistente que no dejaba avanzar. Ficha: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md).

- **El estado `'pendiente'` ya era exactamente ese caso, así que no hubo dos situaciones que separar.** A esa rama solo se llegaba si algún ingreso producía una fecha de cobro válida y **todas** quedaban descartadas por creación tardía: no existía un `'pendiente'` que significara otra cosa. Por eso el cambio no agrega un quinto estado sino que renombra el que había a **`'por-confirmar'`** y lo hace devolver la fecha candidata en vez de `periodoISO: null`. La tarjeta de la sección pasa de "Podrás distribuir tu ingreso cuando recibas tu próximo pago" a "Registraste este ingreso después del 5 de jul, así que no sabemos si ese pago te llegó" con el botón "Sí, recibí el pago del 5 de jul": Finko pregunta en vez de asumir, en las dos direcciones.
- **La fecha candidata no es cosmética, y por eso esto no era una tarea de copy.** `_confirmarDistribucion` solo sella `S.config.ultimaDistribucionPeriodo` si hay `periodoISO`, así que un arreglo que se limitara a habilitar el botón en ese estado habría permitido **distribuir el mismo periodo más de una vez**. La confirmación es lo que produce la llave del guard de de-duplicación: verificado en la app de punta a punta (confirmar, distribuir, recargar y encontrar "Ya distribuiste tu ingreso de este periodo" sin botón). Una confirmación vieja no estorba a un cobro datado después, porque solo se consulta en la rama del candidato.
- **La respuesta vive en `S.config.cobroConfirmadoPeriodo`**, campo opcional sin declarar en `createInitialState()` ni migrar, exactamente como `ultimaDistribucionPeriodo` y `presetDistribucion`, que ya se escriben así. `undefined`-safe en todo lector, **sin bump de `SCHEMA_VERSION`**. `estadoDistribucion` lo recibe como 4.º parámetro, después de `hoy`, para no mover el orden que fijan los tests existentes.
- **Calendario no se toca.** El guard defensivo de `_renderPanelDistribuir` ya cubría a los callers externos que abren el asistente sin pasar por la tarjeta, así que arreglarlo ahí resuelve el CTA del detalle del día sin que Agenda tenga que saber nada de cobros ni de confirmaciones: ahora encuentra la pregunta en vez del callejón sin salida. **El nudge de Inicio** sigue apareciendo solo en `'listo'`: un cobro ya confirmado lo activa, pero la pregunta no se duplica ahí (Inicio no está en el alcance de la tarjeta).
- **Cero CSS nuevo y cero clases nuevas:** el párrafo y el CTA reusan `.distribuir__pendiente` y `.distribuir-card__cta`, que ya traen su separación; el envoltorio se descartó porque habría sido una clase sin regla. El gancho estable de la pregunta es su `data-action`.
- 8 tests unitarios nuevos, separados por lo que fijan: 6 sobre `estadoDistribucion` (candidato ofrecido, confirmación que desbloquea, confirmación de otra fecha que no desbloquea, doble distribución bloqueada, confirmación vieja inocua, candidato más reciente entre varios, y un cobro datable que convive con un candidato sin preguntar) y 2 sobre la tarjeta. **3201/3201 unit + 235/235 E2E + lint verdes.** SW v433 → v434.

**Fuera de alcance, y por qué.** **BUG-017** (el modelo Quincenal pierde un cobro al mes si `diaPago > 16`) se revisó como pedía la tarjeta y **no se toca**: vive en `ocurrenciasEnMes` (`infra/vencimientos.js`), no en `ultimoPagoHasta`, así que no es el mismo código que MC.13f pese a que ambos daten cobros; y su propia entrada en [`BUGS.md`](BUGS.md) dice que requiere una decisión de Esteban porque cambia lo que hoy muestra el Calendario. **`ultimoPagoHasta` sigue datando solo Mensual y Quincenal** (las frecuencias largas son **MC.13c-3**): un ingreso Anual con día de pago sigue cayendo en `'sin-fecha'`, no en la pregunta nueva. No se revierte ni se anticipa el **[ADR 052](DECISIONS/052-pagos-automaticos.md)**: preguntar antes de actuar es compatible con cualquier dirección que tome, y sirve como evidencia para esa discusión.

### fix(gastos): TX.12b, el chip de gasto frecuente ofrece el monto real, no el redondeado · 2026-07-27

Hallazgo de la auditoría integral del 2026-07-25. `gastosFrecuentes()` agrupa por categoría + monto redondeado a $1.000 (la clave que detecta que 6 cafés de $6.500 son "el mismo café") pero el chip prellenaba ese monto redondeado: tocar "Café $7.000" escribía $7.000 en un formulario para un gasto de $6.500. El redondeo sigue siendo la clave de agrupación; lo que cambia es que el grupo ahora expone el `monto` real del registro más reciente, en el mismo bloque `if (g.fecha >= grupo.ultimaFecha)` que ya actualizaba `cuentaId` con ese criterio. Se descartó la moda del grupo (más código, concepto estadístico nuevo en una función que solo agrupa y cuenta, y ancla el chip a precios viejos cuando el precio sube). Ficha: [`contexto/gastos.md`](contexto/gastos.md). 3 tests nuevos: 2 en `gastosFrecuentes` (monto ofrecido con precio estable y con precio subiendo) y 1 en el chip del formulario; los tests de agrupación de TX.12 no se tocan. **De paso**, `docs/BUGS.md` pierde un guion largo preexistente que tenía la compuerta 3 en rojo. 3193/3193 unit + lint verdes. SW v432 → v433.

### fix(metas): MT.7, prellenar el monto del abono con la cuota del periodo · 2026-07-27

Hallazgo de la auditoría integral del 2026-07-25. La tarjeta de la meta ya mostraba "$X por quincena/mes" (motor MC.13b), pero `renderFormAbonoMeta` abría el campo de monto vacío: Apartados (AP.5a) y Fondo (AH.5a) sí prellenaban con el mismo criterio de cuota del período y Metas había quedado atrás. `renderFormAbonoMeta` ahora calcula `calcularAhorroPorPeriodo(meta, frecuenciaPrincipalIngresos(S.ingresos))` y, si hay una cuota sugerida (requiere fecha límite), prellena el campo con ese monto y muestra el mismo texto de ayuda que usan Apartados y Fondo. Sin fecha límite el motor devuelve `null` y el campo sigue vacío, igual que antes. Ficha: [`contexto/metas.md`](contexto/metas.md). Ni `calcularAhorroPorPeriodo` ni el schema se tocan. 2 tests unitarios nuevos. 3190/3190 unit + lint verdes. SW v431 → v432.

### fix(metas): DIS.13, 6 correcciones de la auditoria de diseno sobre Metas · 2026-07-27

Auditoría de diseño de la sección Metas a 390px, tema oscuro (8 hallazgos, MT.a a MT.h). Es una sección bien pensada y mal armada en móvil: la lógica es cuidadosa (editar no destruye el progreso, el ritmo de ahorro usa la frecuencia real de ingresos) y la fila que muestra cada meta se rompía. Se aplican las 6 correcciones que viven dentro de la sección; 2 hallazgos quedan fuera porque su arreglo es de otras secciones o de una decisión ya abierta. Ficha: [`contexto/metas.md`](contexto/metas.md). El schema no se toca, `calcularProgreso` y `calcularAhorroPorPeriodo` no cambian una línea: todo lo nuevo es markup, una función de consulta y CSS.

- **FM1 la fila de una meta deja de romperse en móvil (MT.a, regla R56, nueva).** Es el hallazgo de la sección y el arreglo ya estaba escrito. `responsive.css` tiene un bloque `@media (max-width: 539px)` que reordena la fila en dos renglones y su comentario dice, literal, que aplica a "gastos, deudas, personales, **metas**"; pero la guarda es `.list-item:has(.list-item__meta)` y `_renderMetaItem` nunca emitía esa clase: metía el monto en el subtítulo y los tres botones en `.list-item__action`. La guarda no coincidía, el grid no se activaba y la protección existía solo en el comentario. **Medido antes a 390px: el cuerpo recibía 60px, el título se partía en 4 líneas (91px) y la fila medía 426px de alto.** Ahora la fila emite `.list-item__meta` y el grid se activa solo. **Medido después: cuerpo de 148px (+147%), título en 2 líneas (46px) y fila de 263px (-38%).** El único CSS nuevo es una línea, porque ese grid declara `40px` para la columna del ícono y el anillo de Metas mide 56.
- **FM2 el monto sube a su columna (MT.a y MT.c).** El acumulado pasa a `.list-item__amount` (tabular, comparable de un vistazo, la anatomía de R19 que ya rige en Movimientos, Deudas y Me deben) y el objetivo lo acompaña debajo en secundario, en `.meta-item__de`, hermana de `.personal-item__de`. El CTA "+ Abonar" se muda con ellos: es lo que describe el comentario de `responsive.css` ("__meta (monto + btn Abonar) pasa a la fila 2") y lo que libera el primer renglón. Los dos comentarios del proyecto se contradecían sobre qué admite `.list-item__meta` (`atoms.css` decía "sin botones"); **se corrige el de `atoms.css`**, o la próxima lectura revierte esto por respetar el otro.
- **FM3 el subtítulo baja de cuatro datos a dos, y el progreso deja de decirse tres veces (MT.c).** `_renderMetaItem` unía con " · " acumulado sobre objetivo, fecha límite, días restantes y cuota por período: 102 caracteres en un párrafo de 12px dentro de una columna de 60. Y el mismo hecho aparecía tres veces en la fila (el anillo "34%", el subtítulo "$1.200.000 / $3.500.000" y la línea de abajo "Falta: $2.300.000"). Ahora el subtítulo dice "Faltan $2.300.000 · 15 de diciembre de 2026" y el ritmo de ahorro, que es el consejo, sube a su propia línea: "$230.000 por quincena para llegar a tiempo". **Los "N días restantes" se van** (decisión del informe): la fecha dice lo mismo y no envejece. Sin fecha límite el subtítulo lo dice en palabras en vez de callarlo.
- **FM4 una meta cumplida deja de desaparecer de la app (MT.d).** `metasActivas()` filtra `completada !== true`, así que al cruzar el objetivo la meta salía de la lista y no había ninguna otra pantalla donde verla: no se podía revisar, ni editar, ni eliminar, **porque el DOM de la fila ni se pintaba**. Cumplir una meta, el mejor momento de la sección, se resolvía haciéndola desaparecer. Ahora hay un bloque "Metas cumplidas" al final de la lista, con `metasCumplidas()` (hermana de la que ya existía, mismo campo, así que ninguna meta cae en las dos ni se queda fuera de ambas) y la variante `.list-item--cumplida`: fondo transparente y borde en el verde de logro que el anillo ya usaba, sin tokens nuevos. La fila sigue siendo editable y eliminable y deja de ofrecer "Abonar". El estado vacío solo aparece cuando no hay ninguna meta de ningún tipo: "Sin metas de ahorro" encima de una lista de metas cumplidas se contradiría (regla R51). El `check-circle` con `icon--pop` sale del título: con la fila ya visible en cada render, una animación permanente por meta cumplida es ruido, y el anillo completo más el rótulo del bloque ya dicen el estado.
- **FM5 el ojo de privacidad por fin llega a Metas (MT.b, regla R20).** `S.config.ocultarSaldo` es un solo control para toda la app y seis vistas lo respetan; `metas/view.js` no importaba `SALDO_MASCARA_CUENTA`. El usuario ocultaba su saldo, cruzaba a Metas y veía cada monto y cada objetivo. Ahora se enmascaran el acumulado, el objetivo, el faltante y la cuota del ritmo de ahorro. **El porcentaje y el nombre no**: el ojo esconde pesos, no progreso.
- **FM6 el anillo vuelve a ser accesible (MT.e, regla R11).** El contenedor llevaba `aria-hidden="true"` y dentro el SVG traía `role="img"` con su etiqueta: el contenedor borraba el subárbol y la etiqueta no se anunciaba nunca. En Metas duele más que en el Fondo porque acá el porcentaje **solo** vive en el anillo. Se quita el `aria-hidden` y la etiqueta pasa de "Progreso de Viaje a Cartagena: 34%" a "Viaje a Cartagena: 34% de tu objetivo"; la meta cumplida dice "Regalo de mamá: meta cumplida".
- **`#lista-metas` recupera la separación entre filas.** No tenía una sola regla en `styles/`: las filas iban borde contra borde y los dos bordes de 1px formaban una costura doble. La lista separa sus ítems desde el contenedor (corolario de R21), igual que `.lista-apartados`, `.personales-lista` e `.inversion-lista`. La clase la emite `index.html`; el id se queda como ancla de `getElementById`.
- **`DESIGN_SYSTEM.md` recibe R56.** El informe la numeraba R15 y se renumera al primer hueco real. Va en Componentes, junto a R2 y R19, porque es la anatomía de la fila lo que fija. **Su R16 no entra: ya la dice R20**, palabra por palabra, desde la auditoría de Me deben. La nota de mantenimiento del informe (que una regla de layout guardada con `:has()` sobre una clase opcional deja que cualquier vista nueva reproduzca el bug en silencio) queda escrita dentro de R56, señalada y no decidida: invertir la guarda toca cinco secciones.
- 17 tests unitarios nuevos (4 de `metasCumplidas`, 8 de la fila v2, 5 del bloque de cumplidas) y 3 reescritos al lugar nuevo del ritmo de ahorro; 5 E2E adaptados (el formato "X / Y" ya no existe, y la meta que se completa al bajar el objetivo ahora se busca en el bloque de cumplidas en vez de comprobar que desapareció). **3188/3188 unit + lint verdes; 235/235 E2E en las 11 suites.** Verificado en el navegador a 390px, 320px y 1280px, tema oscuro, con 3 metas activas (una con nombre largo y fecha a 2028, una sin fecha) y 1 cumplida, ingreso quincenal: grid en `56px 148px 96px`, sin desborde horizontal en ninguno de los tres anchos, sin errores de consola, y el ojo enmascarando las cuatro cifras de cada fila con el porcentaje intacto. SW v430 → v431.

**Fuera de alcance, y por qué.** **MT.f** (los emoji del consolidado "Tu ahorro total") y la mitad de **FM5 que toca el consolidado y el hero del Fondo** no entran acá: ese bloque lo renderiza `ahorro/view.js` y lo comparten las cuatro secciones del hub (Fondo, Metas, Apartados, Inversión), así que corregirlo desde Metas cambiaría otras tres pantallas. Los emoji ya los corrigió **DIS.12** en el Fondo; **la máscara del consolidado sigue abierta y es transversal a las cuatro**. **MT.g** ("+ Abonar" a 36px contra los 44 de R4) depende de la decisión sobre `btn-sm` que `responsive.css` fija con un comentario deliberado y que sigue en la mesa desde el Fondo: es la cuarta sección que lo reporta y corregirlo por sección lo arregla cuatro veces. **MT.h** (el `select` nativo de categoría, sin adoptar FORM.1b) queda fuera **por recomendación explícita del propio informe**: el ADR 048 D1 va a meter subcategorías en ese mismo control dentro de MT.6, así que rediseñarlo antes es pintarlo dos veces. La auditoría **no revisó** escritorio ni tablet como diseño (solo se verificó que no hubiera regresión), tema claro, el picker de ícono de la categoría "Otra" (CAT.2b y CAT.3), el flujo de abono que llega por `distribucion:aplicar`, ni lectores de pantalla reales: se revisó el marcado, no el anuncio. **No se toca MT.7** (prellenar el monto del abono), que es dueña de ese campo, ni **MT.6 / ADR 048**.

### fix(fondo): DIS.12, 9 correcciones de la auditoria de diseno sobre Fondo de emergencia · 2026-07-27

Auditoría de diseño de la sección Fondo de emergencia a 390px, tema oscuro (9 hallazgos, A1 a A9). Es la sección con el mejor motor de consejo de la app (la sugerencia de AH.2 dice el monto, de dónde sale y qué pasa si el margen no alcanza) y el peor cuidado en los bordes. Se aplican las 9: las 7 correcciones del informe (FF1 a FF7) más A7 y A9, que caían en "mejoras futuras" pero viven enteras dentro de la sección. Ficha: [`contexto/ahorro.md`](contexto/ahorro.md). El schema no se toca, `ahorro/logic.js` no cambia una línea y el cálculo de AH.2 no se mueve: todo es markup y CSS.

- **FF2 la barra del consolidado deja de contradecir su propio porcentaje (regla R54, nueva).** Es el hallazgo grande. `.ahorro-total__item` reparte la fila en `minmax(7rem, auto) 1fr auto auto` y la barra es la columna elástica, así que se queda con el sobrante de lo que midan el nombre y el monto. **Medido antes a 390px: pistas de 13, 35, 48 y 52px, con rellenos de 7, 8, 8 y 5px**, o sea que el relleno del **16% se dibujaba más largo que el del 51%**. La barra que existe para mostrar la proporción mostraba lo contrario. En móvil la fila pasa a dos renglones (nombre y monto arriba, barra a lo ancho abajo). **Medido después: las cuatro pistas en 310,2px y los rellenos en 158,2 / 71,3 / 49,6 / 27,9 para 51 / 23 / 16 / 9%.** Desktop no cambia: allí el `1fr` tiene ancho de sobra. Va en `responsive.css` porque es la capa que gana por orden (corolario de R23).
- **FF1 los cuatro vehículos salen del sprite.** `_VEHICULO_META` mapeaba cada vehículo a un emoji del sistema operativo (🛡️ fondo, 🎯 metas, 📦 apartados, 📈 inversiones): glifos que traen su propio color fuera de los tokens, su propio peso y su propia caja, y que no responden al tema. El sprite ya tenía los cuatro símbolos exactos, los mismos que usan la pestaña del hub y la teja de cada sección. Cada fila declara `data-vehiculo` y `domain.css` le da el color de su dominio. **Verificado en el navegador: `#i-ahorro` en `rgb(56,201,140)`, `#i-metas` en `rgb(157,115,235)`, `#i-inversion` en `rgb(47,210,191)` y `#i-apartados` en el menta de ahorro** (apartados no tiene token propio y comparte el de ahorro). El consolidado es la cabecera común del hub, así que la corrección llega a las cuatro secciones a la vez.
- **FF6 la salida deja de verse igual que la destrucción (regla R53, nueva).** Al editar el fondo, `renderFormFondo` reemplazaba Cancelar por "Desactivar fondo" con la **misma clase `btn-ghost`, en la misma posición y con el mismo aspecto**, en el lugar que en todos los demás formularios de Finko es la salida sin consecuencias; y al editar **no había Cancelar**, así que salir sin cambios solo se podía por la X de la cabecera. Había confirmación, pero el diseño pedía el error en vez de prevenirlo. Cancelar vuelve a su sitio y desactivar baja a una fila propia con `.btn-danger`, que ya existía en `buttons.css` y esta sección no usaba. La clase nueva `.modal__footer-secundario` es la única pieza nueva de la entrega: hoy el sistema no tenía dónde poner una acción destructiva dentro de un formulario, y por eso esta terminó donde terminó. **Verificado en el navegador: Cancelar `btn btn-ghost` en el pie (y = 1273,4), desactivar `btn btn-danger btn-sm` de 124,7px en su fila (y = 1362,2) sobre un filete de 1px `--fk-border-subtle`, fondo `rgba(255,71,87,0.12)` y texto `rgb(255,71,87)`.**
- **FF3 el anillo del hero vuelve a existir para el lector de pantalla (regla R52, nueva).** El hero envolvía el anillo en `<div class="progress-ring-wrap" aria-hidden="true">` y dentro `progressRing()` emitía un SVG con `role="img"` y `aria-label="Fondo de emergencia: 60%"`, construido a propósito por el llamador: **el `aria-hidden` del contenedor borraba el subárbol entero y la etiqueta no se anunciaba nunca**. El porcentaje de avance solo existe en el anillo. Se quita el `aria-hidden` y la etiqueta se amplía a "60% de tu objetivo", que es lo que el número significa; `role="img"` ya deja el `<text>` interno como presentacional, así que no hace falta tocar `infra/svg.js`. Es el patrón que `score-hero__ring` de Análisis ya usaba. **Verificado en el navegador: sin `aria-hidden`, `role="img"`, etiqueta "Fondo de emergencia: 60% de tu objetivo", trazo en `rgb(56,201,140)`.**
- **FF4 la lista de aportes adopta la anatomía del sistema (regla R2).** Cada aporte ponía el **monto como `list-item__title`** y la fecha como subtítulo, sin `list-item__icon` y sin `list-item__amount`: una columna de cifras grandes sin sujeto, alineadas a la izquierda, imposibles de comparar de un vistazo. En Movimientos, Deudas y Me deben la regla es la inversa. Ahora la fecha es el título, la nota baja a subtítulo ("Aporte al fondo" cuando no hay nota), el monto vive en `list-item__amount` con el menta de ahorro y la teja del dominio ocupa el slot del ícono. **Verificado en el navegador: "22 de julio de 2026" / "Aporte al fondo" / "+$250.000" en `rgb(56,201,140)`, con teja en las tres filas.**
- **FF5 el peor caso táctil de la sección desaparece (regla R4).** El enlace "Ver →" del consolidado, que es **navegación entre secciones**, medía **18px de zona activa**, el alto de su propia línea. Sube a 44px con margen negativo: el dibujo no cambia. **Medido después: 44px en las tres filas que llevan enlace.**
- **FF7 el compromiso mensual deja el ícono de Deudas.** La fila usaba `icon('deudas')`, la tarjeta con moneda que identifica la sección Deudas en la navegación, en el menú Más y en cada tarjeta de crédito, para acompañar un compromiso de **ahorro**: la metáfora no solo era ajena, era la contraria. Pasa a `i-recurring`, el símbolo de recurrencia que ya marca los gastos fijos en Calendario e Inicio, que es exactamente lo que un compromiso mensual es. Un símbolo propio para "págate primero" sería un asset nuevo y entra por IV.4, no por acá.
- **A7 el rol ARIA sigue al nivel del aviso (regla R55, nueva).** `_renderNudgeTasa` emitía `role="status"` para los cinco niveles, incluido el `nudge-high` que anuncia que los gastos del mes superan los ingresos: `status` es un aviso cortés y el lector espera una pausa, justo cuando el aviso más importa. El nivel alto pasa a `role="alert"`; el resto queda en `status`, mismo criterio que `_renderNudge()` de Límites. Tercera aparición del patrón, así que se fija como regla en vez de corregirse una cuarta vez. **Verificado en el navegador con ingresos $2.000.000 y gastos $2.300.000: `nudge nudge-high` con `role="alert"`.**
- **A9 el CSS muerto del hero se borra.** `analysis.css` mantenía `.fondo-hero__icon`, `.fondo-hero__icon .icon`, `.fondo-hero__progress` y `.fondo-hero__pct` sin un solo consumidor: la teja redonda quedó huérfana cuando el anillo de progreso la reemplazó y las otras dos nunca se emitieron. `.inversion-hero__icon` es idéntica y sí está viva, así que el archivo mostraba dos patrones para el mismo componente sin forma de saber cuál era el vigente sin abrir el JS.
- **`DESIGN_SYSTEM.md` recibe R52 a R55.** El informe las numeraba R11 a R14 y se renumeran al primer hueco real; entran las cuatro. R52 (el envoltorio no oculta lo que envuelve) y R55 (el rol ARIA sigue al nivel del aviso) en Principios; R53 (la salida no se confunde con la destrucción) en Botones, junto a R26; R54 (un gráfico necesita ancho garantizado) en Barras y anillos de progreso, junto a R43.
- 15 tests unitarios nuevos en `ahorro.test.js` (consolidado, hero, lista de aportes, compromiso, rol del nudge y las dos variantes del formulario del fondo). Verificado en el navegador a 375px, tema oscuro, con fondo al 60% ($1.800.000 de un objetivo de $4.382.700), tres aportes, compromiso de $250.000 y los cuatro vehículos con dinero ($5.164.000 de total). SW v429 a v430.

**Fuera de alcance, y por qué.** **La misma corrección de FF3 en Metas y Apartados**: sus contenedores repiten el `aria-hidden` sobre un `progressRing()` con etiqueta, pero son otras secciones y entran con sus propias auditorías. **A8 en su mitad abierta**: `responsive.css` fija `.btn-sm` en 36px con un comentario deliberado ("botones pequeños siguen siendo pequeños") y la R4 pide 44, así que el sistema dice las dos cosas; el informe lo sube a decisión, no a corrección, y acá solo se corrigió el enlace del consolidado, que no es un `.btn-sm`. **El rediseño del hero** (cuatro líneas explicativas antes de decir qué es un fondo de emergencia) es exactamente lo que el [ADR 049](DECISIONS/049-fondo-de-emergencia-v2.md) D3 se propone resolver: queda como insumo de **AH.5**, no como hallazgo. La auditoría **no revisó** escritorio, tablet ni tema claro, la aritmética de AH.2 (revisó cómo se presenta, no si el número es correcto), el banner de propósito (GU.1a), las otras tres secciones del hub, el flujo de aporte que llega por `distribucion:aplicar` ni el fondo dentro del Score de salud.

### fix(calendario): DIS.11, 11 correcciones de la auditoria de diseno sobre Calendario · 2026-07-27

Auditoría de diseño de la sección Calendario a 390px, tema oscuro (13 hallazgos, H1 a H13). Es la sección más completa de la app desde Calendario v2 y CAL.5a: el mes tiene peso financiero y el día es accionable. Se aplican las 11 que no salen de la sección. Ficha: [`contexto/calendario.md`](contexto/calendario.md). El schema no se toca, `agenda/logic.js` no cambia una línea y ningún cálculo financiero se mueve: todo lo nuevo es orden de render, foco, clases y CSS.

- **C4 las filas del modal de lote vuelven a tener borde.** Único bug duro del informe, y de un carácter: `.lote-row` declaraba `border: 1px solid var(--fk-border)`, un token que **no existe** (los reales son `--fk-border-subtle`, `-default`, `-strong`, `-accent`, `-focus`). Una `var()` sin valor invalida la declaración entera, así que el atajo caía a sus iniciales: **medido, `border-style: none` y `border-width: 0px`**. Consecuencia real: las cinco filas flotaban sobre el fondo elevado y, sobre todo, `.lote-row:hover / :focus-within { border-color: var(--fk-dom-agenda) }` no pintaba nada, o sea que la pantalla donde el usuario confirma mover $601.800 no tenía señal de foco por fila. Verificado de paso que el token fantasma no aparece en ningún otro punto del proyecto: era la única ocurrencia.
- **C1 tocar un día por fin cambia algo en pantalla (regla R46, nueva).** `renderAgenda()` emitía hero, tarjeta de lote, calendario, leyenda y **recién después** el detalle: medido a 390px, el panel del día nacía en **911,7px de una pantalla de 844px**, o sea 128px por debajo del borde inferior, y nada movía el scroll ni el foco. La única señal de que había pasado algo era el anillo índigo sobre la celda. Le pasaba lo mismo a CAL.3, que auto-abre el día de hoy al entrar desde otra sección. Tres movimientos: el detalle se emite justo después de la tarjeta del calendario; `_mostrarDia()` lleva el foco al título del panel (`h3` con `tabindex="-1"`, que es lo que lo trae a pantalla y lo anuncia) y lo devuelve a la celda al cerrar; y el panel toma el borde índigo de la sección para leerse como parte del mes que lo abrió. **Alcance honesto: a 390px la grilla no termina antes de los 830px, así que el panel no puede quedar sobre el pliegue; lo que sí puede es entrar a la pantalla solo.**
- **C6 la leyenda pasa a pie de la tarjeta y deja de ser pegajosa (revisa AG.6, decisión de Esteban).** AG.6 la puso entre el calendario y el detalle, y sticky, para seguir consultable al recorrer un día cargado. Medido, pasaban dos cosas: ocupaba **65,7px de chrome permanente que arrancaban en 834,1px**, o sea fuera del primer pantallazo de 844; y cuando sí se pegaba al tope era mientras el usuario recorría la lista del día, momento en que la grilla que explica ya no está en pantalla y el detalle nombra cada tipo en texto ("Gasto fijo · Mensual"). Ahora es el pie de `.cal-card`, separada por una línea sutil, sin superficie propia y sin sticky: **78px que van al panel del día**. `.main-content` conserva su `overflow-x: clip` (el comentario que impide volverlo a `hidden` sigue vigente por otras razones).
- **C2 lo vencido deja de ser lo más tenue del mes (regla R47, nueva).** `.cal-day--past { opacity: .5 }` cubría todo lo anterior a hoy: el 25 de julio, el 77% del mes, y ahí adentro los cinco pagos ya vencidos. **Medido: el número del día bajaba de 14,46:1 a 4,55:1 y los puntos de 5,64 / 4,98 / 6,36:1 a 2,39 / 2,14 / 2,52:1**, bajo el umbral no textual de 3:1 (SC 1.4.11), con la tarjeta de arriba diciendo "5 pagos ya vencieron". Ahora la atenuación queda solo para los días pasados **sin eventos**, que es lo que se quería decir, y el día con un fijo vencido y sin registrar toma fondo, borde y número de la familia **warning, nunca danger** (deber un pago no es un error del usuario, [ADR 019](DECISIONS/019-limites-por-rol.md)): la misma familia de la tarjeta que propone pagarlos. El dato no se recalcula: `renderAgenda()` ya llama a `pendientesDePagoDelMes()` para la tarjeta y ese mismo set alimenta la grilla, así que el conteo del `aria-label` ("Día 5, 2 compromisos, 2 vencidos") y el título de la tarjeta **no pueden discrepar**. La marca va antes de `--today` y `--selected` en el archivo: con igual especificidad, el orden deja que "hoy" (orientación) y la selección (respuesta a un toque) ganen sobre el estado del pago.
- **C3 en la fila del día el monto vuelve al primer renglón.** El bloque `@media (max-width: 640px)` mandaba `.cal-detail__amount` a la segunda fila con `font-size: xs` y color secundario: **medido, el monto quedaba a 61,1px del tope, en 12px y `rgb(163,169,189)`, el texto más pequeño y más apagado de una fila que existe para decir cuánto hay que pagar**. Ahora son tres columnas (teja · nombre y detalle · monto) con el monto en 14px/700 tabular y color primario, y las acciones en su propio renglón. En el mismo pase se borra el `padding-left: calc(var(--fk-space-2) - 3px)`, que compensaba la franja lateral de 3px que **IV.2c eliminó** y dejaba la fila con 5px a la izquierda y 8px a la derecha. **Verificado en el navegador: monto y nombre en la misma línea (y = 492), monto a la derecha en 14px primario, padding simétrico de 12px.** El juego de acciones de la fila no se toca (es **EDIT.1**): solo cambian su reparto y su altura.
- **C5 la tarjeta que propone pagar N dice cuánto suman (regla R50, nueva).** Decía "5 pagos ya vencieron", listaba dos nombres y ofrecía "Pagar los 5"; los $601.800 solo aparecían dentro del modal, así que la decisión de entrar al flujo se tomaba sin el dato que la define y se podía llegar al selector de cuenta sin saber si alcanza. El único número cerca era "Falta $1.060.800" del hero, que mezcla lo vencido con lo que aún no vence. El total entra como segunda línea en mono tabular 24px y el CTA baja a su propio renglón a lo ancho (hoy ya caía ahí por wrap, sin quererlo). **No se enmascara con el ojo**: no es un saldo, es el precio de la acción que se ofrece, mismo criterio que los montos del modal.
- **C8 con la app en cero, una pantalla dice una cosa (regla R51, nueva).** Un usuario nuevo encontraba el banner de propósito, el hero "Sin pagos programados" y la card "Julio está despejado": **tres bloques con el mismo mensaje y dos `.btn-primary` a la vez con el mismo texto** ("+ Agregar gasto fijo"). Con el mes sin ningún evento el hero de guía ya no se renderiza y el CTA de la card baja a secundario: el primario de la sección es uno solo, el del encabezado. **La variante "Sin pagos programados" se conserva para el caso real que la justificó**: un mes con ingresos pero sin pagos.
- **C7 cuatro controles llegan a 44px.** **Medido antes:** nav de mes 36x36, cerrar el detalle 32x32 (su `var(--fk-space-8)`) y el CTA de cada item 38,6px de alto, con un comentario en el CSS que lo llamaba "hit target AA con margen". La celda del día ya estaba al filo, 44x44 exactos. **Medido después: 44x44 los tres primeros y 44 de alto el CTA**, más las acciones ghost de la fila. El ojo del hero (40px) sigue fuera: vive en la lista compartida de `domain.css` con Inicio, Mis cuentas y Deudas, y se corrige allí de una vez.
- **C9 el banner de propósito toma el índigo de la sección.** `domain.css` lista el color de la franja izquierda sección por sección y **faltaba `agenda`**: caía al `var(--fk-accent)` del bloque base, medido `rgb(31,209,148)`, el verde que el sistema reserva para dinero disponible y logro, justo en la sección que estrenó el índigo en IV.2c. Una línea. **Verificado en el navegador: `rgb(125,140,240)`.**
- **V-6 la grilla deja de prometer un teclado que no tiene (decisión de Esteban).** `_renderGrid()` emitía `role="grid"` con hasta 31 `role="gridcell"` colgando directo y ninguna `role="row"`: el patrón exige filas, así que la estructura era inválida y cada lector la resolvía como quería. De las dos vías honestas del informe se toma la mínima: fuera los dos roles, queda la lista de botones, que ya traen un `aria-label` completo por día. El contenedor conserva su nombre accesible con `role="group"`. Un grid sin navegación por flechas promete algo que no cumple.
- **V-4 cambiar de mes no pierde el foco ni se queda callado (regla R48, nueva).** `_prevMes`, `_nextMes` y `_mostrarDia` mutan el estado de la vista y llaman a `renderAgenda()`, que reemplaza el `innerHTML` entero de `#panel-agenda`: el botón recién activado deja de existir y el foco cae al `body`, así que con teclado tocar "›" una vez obligaba a tabular desde el principio de la sección. Con lector de pantalla no se anunciaba nada, en un módulo que ya usa `announce()` al guardar, editar, eliminar y pagar. Ahora la nav devuelve el foco a su botón y anuncia "Julio 2026, 9 compromisos y 1 ingreso" (`resumenMesVisible()`, nueva en `view.js`: index.js no conoce `_viewYear`/`_viewMonth`, que son privados de la vista).
- **`DESIGN_SYSTEM.md` recibe R46 a R51.** El informe las numeraba R13 a R18 y se renumeran al primer hueco real; entran las seis. R46 (respuesta visible), R47 (lo vencido no se atenúa) y R48 (repintar también se anuncia) en Principios; R49 (el color nunca va solo) en Colores por dominio, junto a R3; R50 (un CTA de dinero dice cuánto) y R51 (un vacío, un mensaje) en Botones, junto a la regla del primario único.
- 17 tests unitarios nuevos y 5 reescritos al orden y a los estados nuevos, 4 E2E nuevos (foco al abrir y al cerrar el día, foco y anuncio al navegar de mes, leyenda estática dentro de la card, mes vacío sin hero con el CTA secundario) y 3 adaptados. **3156/3156 unit + lint verdes; 235/235 E2E.** Verificado en el navegador a 375px, tema oscuro, con 6 fijos (4 el día 5), 2 deudas y 1 ingreso: leyenda dentro de la card en `position: static`, detalle como hermano inmediato de la tarjeta, foco en `.cal-detail__title` al abrir, días 5, 12 y 20 marcados como vencidos, tarjeta de lote con "$1.551.800", nav y cerrar en 44x44, punto de ingreso en anillo de 8px sobre puntos sólidos de 5px, y con la app en cero: sin hero, banner índigo y CTA de la card transparente. SW v428 → v429.

**Fuera de alcance, y por qué.** **H13** (el formulario de gasto fijo mide 900,4px dentro de una hoja de 776px, y solo la grilla de 15 chips ocupa 398,5) llega sin propuesta a propósito: lo fijó el [ADR 042](DECISIONS/042-formularios-v2-visual.md) D3 y el informe pide decidirlo **junto con la V2 de Gastos**, que es el mismo problema en dos formularios del mismo lenguaje. **La marca de vencido en deudas** queda para **CAL.5b**, que ya va a tocar el filtro `tipo === 'fijo'` de `pendientesDePagoDelMes()`: abrir ese código dos veces por separado es peor. **El ojo del hero a 44px** se corrige en la lista compartida de `domain.css`, con la auditoría de Inicio. La auditoría **no revisó** escritorio, tablet ni tema claro, el selector de cuenta y el reparto que abre el lote (transversales, `infra/cuenta-helper.js`), el modal de confirmación de borrado, los errores de validación del formulario, el flujo de "Otro" con su picker, un mes con más de 20 eventos o un día con más de 6, ni lectores de pantalla reales: se revisó el marcado, no el anuncio.

### fix(analisis): DIS.10, 12 correcciones de la auditoria de diseno sobre Analisis · 2026-07-27

Auditoría de diseño de la sección Análisis a 390px, tema oscuro (13 hallazgos, H1 a H13). Es la página más larga de la app (2.814,2px medidos, 3.990,1 con los dos colapsables abiertos) y la única de solo lectura. Se aplican 12; la que falta es la mitad de V1 y necesita una decisión de producto. Ficha: [`contexto/analisis.md`](contexto/analisis.md). El schema no se toca y ningún cálculo financiero cambia: los únicos cambios de contrato son de vista (`detectarNudgesRenta` devuelve el nombre de un ícono en vez de un emoji, y `seriePorCategoria` reparte los porcentajes de otra forma).

- **C1 los cuatro avisos neutros dejan de verse como advertencias (regla R41, nueva).** Es el único hallazgo que es un bug duro. `.analisis__hint` estaba declarada **dos veces en el mismo archivo**: en la línea 34 como caja (fondo elevado, borde, `border-left: 3px solid var(--fk-warning)`, radio, padding) y en la 1492 como texto suelto (xs, muted, margin 0). Misma capa y misma especificidad, así que la segunda solo ganaba en las tres propiedades que enumeraba: **el fondo, el borde y el filete ámbar de la primera sobrevivían**. Medido antes: cuatro cajas de 356,4px con filete de 2,5px en `rgb(255,184,46)`, el ámbar exacto de `--fk-warning`, que suman 258,8px (64,7 + 84,2 + 45,2 + 64,7). Ninguno de los cuatro avisa nada: la UVT vigente, el promedio de gasto por día activo, el CTA de deudas sin saldo y el nudge del fondo son contexto. Justo debajo, un `.nudge-medium` real usaba el mismo color para decir que un criterio de renta va en 84% de su tope. **Medido después: 39px, sin borde ni fondo, en los cuatro.** Se resuelve borrando propiedades. El corolario de archivo queda escrito en R23, que ya es dueña de "una clase, un dueño".
- **C2 y C2b el cuerpo de los colapsables entra al lenguaje v2 ([ADR 055](DECISIONS/055-cuerpo-de-los-colapsables-de-analisis.md), regla R42, nueva).** ANL.2d convirtió el summary en fila v2 y dejó el interior intacto a propósito (decisión D5, escrita). Medido: 1.175,8px de `h2` de 18px/600 con emoji y bloques sin superficie, detrás de una fila v2, a tres bloques de las cards de radio 24px de la misma pantalla. Los tres sub-bloques toman la receta de `.tend-card`/`.catg-card` (superficie, radio 24, sombra, padding 16) y sus títulos bajan a 16px/700 con el ícono del sprite: **no es una card nueva, son dos selectores añadidos a la regla existente**, acotados a `.analisis-grupo--fila` para que el desglose de Límites no cambie. En el mismo bloque, la comparación vs mes anterior deja de ser `<table>`: era **la única tabla de datos que la app le mostraba a un teléfono**, y medida no desbordaba (322,7 = 322,7, `scrollWidth` 323 = `clientWidth` 323), se comprimía. Pasa a la anatomía de fila de R20: nombre truncado, monto del mes en negrita tabular y la variación como chip con su ícono, **verde solo al bajar** (ADR 019/IV.3), con la dirección también en `sr-only`. Medido: 996px de cuerpo con tres sub-cards; la lista de cuatro filas, 150px.
- **C3 la frase que interpreta el score sale de la columna angosta.** El anillo mide 132px fijos sobre un interior de card de 316,4, o sea el 41,7% del ancho, y la columna de texto quedaba en 162,7px: la única línea del panel que interpreta un número en vez de mostrarlo ocupaba **68,2px en cuatro renglones de unos veinte caracteres**. El anillo no se toca (ADR 038 D1 midió su contraste contra el wash): la frase baja a ancho completo, encima de la grilla de factores. **Medido después: 317px de medida y 45px de alto, dos renglones.** Costo declarado: la card crece de 323,8 a 372px.
- **C4 la sparkline deja de estirarse (regla R43, nueva).** `_renderTendencia()` la pedía con `width: 600` y el SVG rinde 322,7px: escala horizontal 0,538 contra vertical 1,000, **anisotropía 1,86:1**. Consecuencia medible: el `stroke-width: 2` salía de 1,08px en los tramos horizontales y 2px en los verticales, así que la línea se veía más delgada donde la tendencia es plana, una lectura falsa en un gráfico cuyo único trabajo es mostrar forma; y el marcador (`<circle r="2.5">`) salía como elipse de 2,69 x 5. Tres cambios de una línea en `infra/svg.js` y su llamador: viewBox 360 (**medido después: 1,11:1**), `vector-effect="non-scaling-stroke"` en el trazo, y el marcador como subpath de longitud cero con tapa redonda.
- **C5 la dona deja de contradecir al ADR 019 dos bloques más abajo (regla R44, nueva).** `PALETA_CATEGORIAS` asignaba `#00dc82` al índice 0 (descrito en el propio código como "verde accent - finko brand") y `#ef4444` al 3: **la categoría con más gasto salía siempre en el verde de la marca y desde la cuarta siempre había una roja**, en la sección donde IV.3 y ANL.2c acababan de re-declarar que subir el gasto nunca se pinta de rojo. La paleta pasa a seis hues sin carga de dirección (azul, violeta, cyan, ámbar, teal, rosa) más el pizarra reservado para "Otros". **Medido en oscuro: las siete pasan el umbral no textual, mínimo 4,35:1.** Segundo punto: `pct` se calculaba con un `Math.round` independiente por segmento y la columna sumaba 99 en el ejemplo del informe. Se reparte por **resto mayor** (`repartirPorcentajes()`, nueva en `analisis/logic.js`), y la misma función arregla los porcentajes de la barra de patrimonio. **Verificado en el navegador: las dos columnas suman 100.**
- **C6 un rótulo, un mensaje.** `_renderTendencia()` y `_renderPorCategoria()` emitían cada una su vacío bajo "A dónde va tu dinero", con dos redacciones distintas ("El análisis aparece cuando tengas gastos registrados" y "Sin gastos registrados este mes"): **medido, 132,1px de los 175,7 del grupo**, en dos `<p>` sueltos sobre el fondo base donde los otros hijos son cards. Ahora las dos devuelven `''` y el grupo pone un mensaje único con superficie de card. **Medido después: el grupo baja a 137px.** Tercera repetición del patrón (Gastos H9, Calendario H10, Mis cuentas H6): la regla R18 ya existía. El `.analisis__empty` se acota al grupo porque esa clase también la usa la vista previa del importador.
- **C7 lo que Finko no puede medir se ve como pendiente, no como dato faltante.** De los cinco criterios de la DIAN, Finko mide dos por sí mismo; los otros dependen de un dato que el usuario registra a mano en Ajustes, y salían igual como ficha completa: badge "Sin datos en Finko", valor "N/D", barra al 0% y un tip que repetía la misma instrucción con dos redacciones ("Regístralos…" / "Regístralas…"). Con nada registrado, **tres de las cinco fichas eran cascarones dentro de una grilla de 779,3px**, y el grupo se abre solo cuando hay una alerta. Pasan a una lista compacta con su tope al lado y **un solo** enlace a Ajustes. El objetivo declarado en el código ("que el usuario conozca el límite") se conserva: el tope sigue visible. Ahorro medido por el informe: 169,2px, moderado; lo que cambia de verdad es que dejan de competir cinco fichas iguales cuando solo dos tienen algo que decir.
- **C8 los nueve emoji al sprite y el chevron con ellos.** Inventario completo: 📊 en "Vs mes anterior", 📅 en "Patrón de gasto semanal", ⚠️ en "Alertas de gasto hormiga", 🐜 en cada fila de hormiga, ✅ y ⚠️ en los highlights, 📋 en el nudge de perfil fiscal, 📅 en el aviso de vigencia de la UVT y 🚨/⚠️ en los nudges de tope. Cuarta sección seguida con el mismo hallazgo y la que más acumulaba (Gastos 2, Calendario 3, Mis cuentas 5, esta 9), en la sección donde ADR 037 y ADR 038 se declararon "cero íconos nuevos" porque el sprite ya los tiene. **Dos de los nueve no salían de la vista sino del dato:** `detectarNudgesRenta()` devolvía el glifo dentro del objeto, así que su contrato pasa a devolver el **nombre** del ícono. El chevron `▾` del `::after` pasa a `i-chevron-right` rotado, con el mismo patrón y la misma clase que DIS.7 ya usó en el desglose de Límites, acotado a `--fila`. **Verificado sobre el DOM renderizado: cero emoji en la sección, con el colapsable abierto.**
- **C9 cuatro saltos de encabezado cubren la sección entera (regla R45, nueva).** El panel tiene seis bloques y solo cuatro tenían encabezado real. El rótulo "A dónde va tu dinero" era un `<p>` con dos `h2` colgando debajo, y los títulos de los dos colapsables eran `<span>` dentro del `<summary>`: **2.379,4px de contenido, medidos con los dos abiertos, invisibles para quien navega por encabezados**. El rótulo pasa a `h2`, las dos cards que cuelgan de él a `h3`, cada `summary` envuelve su título en un `h2` y los tres títulos del cuerpo del colapsable a `h3`. **Cero cambios visuales: el tamaño lo dan las clases.** Esquema verificado en el navegador: h2 Score · h2 Patrimonio · h2 A dónde va tu dinero (h3 Tendencia, h3 Por categoría) · h2 Más detalle (h3 x3) · h2 Estado de tu renta.
- **C10 fuera tres regiones vivas estáticas.** `_renderRecomendacionFiscal()`, el aviso de vigencia de la UVT y cada nudge de `_renderNudgeRenta()` llevaban `role="status"` sin responder a ninguna acción, y `renderAnalisis()` reescribe el panel en cada `state:change` de siete slices: registrar un gasto estando en Análisis los volvía a anunciar los tres, cuatro con perfil fiscal y dos criterios en alerta. **No es una regla nueva: R24 ya lo dice** desde Apartados. **Medido después: cero `role="status"` en el panel.**
- **C11 lo que el usuario abrió se queda abierto.** Cada render recreaba los `<details>`, así que abrir "Más detalle de tus gastos", leer los 1.175,8px que se pidieron a propósito y registrar un gasto con el botón de la barra dejaba el grupo cerrado, **descartando además el cómputo diferido que PERF.3 acababa de hacer**. Se leen los dos estados antes de reescribir `innerHTML` y se reaplican después. El detalle se rellena en el acto porque asignar `open` no dispara `toggle` de forma síncrona. PERF.3 intacto: `data-cargado` sigue evitando el recálculo, y si el usuario lo cierra, el render siguiente vuelve a diferirlo. **Verificado en el navegador con el flujo real:** abrir, registrar un gasto desde la hoja de la barra y volver, con el grupo abierto y su cuerpo pintado.
- **C12 el chip dice de cuándo son los números.** El chip del header decía "Julio" mientras el panel mezcla **cinco ventanas de tiempo**: este mes (score y categorías), los últimos 12 meses (tendencia), el mes anterior (comparación), los últimos 90 días (patrón semanal) y el año completo (renta, que lo dice en su propio título). Ahora dice "Julio 2026", la card de categorías declara "Este mes" y el patrón semanal abre su descripción con la ventana. Que el chip se vuelva un selector de mes real es la decisión V1, que sigue abierta.
- **`DESIGN_SYSTEM.md` recibe R41 a R45.** El informe las numeraba R25 a R29 y ese hueco estaba reservado desde la auditoría de la Interfaz precisamente porque esta seguía sin aplicarse; se renumeran al primer hueco real. Entran las cinco. La mitad de su R25 que pedía "ninguna clase se declara dos veces" queda como **corolario de archivo de R23**, que ya es dueña del tema: es el tercer corolario de esa regla.
- 15 tests unitarios nuevos (13 de marcado por corrección + 5 de `repartirPorcentajes`, menos 3 reescritos), 2 de `svg.test.js` actualizados al marcador nuevo y 1 E2E nuevo que abre el colapsable, verifica lista-no-tabla y registra un gasto sin salir de la sección. **3142/3142 unit + lint verdes; 232/232 E2E** (las 11 suites). Verificado en el navegador a 390px, tema oscuro, con 8 categorías del mes, historial de 12 meses, hormigas, 3 deudas (una sin saldo), metas, apartados, inversión e ingresos brutos de renta cargados a mano: sin errores de consola y sin desborde horizontal. SW v427 → v428.

**Fuera de alcance, y por qué.** **La segunda mitad de V1** (que el chip del header sea un selector de mes real) no entra: obliga a decidir qué hacen la tendencia de 12 meses y el monitor anual al cambiar de mes, y eso es diseño de producto, no de sección. La auditoría **no revisó escritorio, tablet ni tema claro**, y ahí queda un dato medido al aplicar C5 que conviene tener escrito: en tema claro la paleta de categorías tiene cuatro entradas bajo el umbral no textual de 3:1 sobre blanco (ámbar 2,15, cyan 2,43, teal 2,49, slate 2,56). **No es una regresión de esta tarea**: el problema es anterior y el cambio sube el piso, porque el verde de marca que salió rendía 1,82. Tampoco se ejercitaron el score en las bandas excelente, buena y crítica, un criterio de renta en estado "supera", el aviso de vigencia de la UVT, el panel con 10+ categorías ni lectores de pantalla reales (se revisó el marcado, no el anuncio).

### fix(mis-cuentas): DIS.9, 9 correcciones de la auditoria de diseno sobre Mis cuentas · 2026-07-27

Auditoría de diseño de la sección Mis cuentas a 390px, tema oscuro (13 hallazgos, H1 a H13). Es la sección más larga de la app y la única que hace cuatro trabajos (tener las cuentas, mover dinero entre ellas, registrar de dónde entra y repartir lo que entró). Se aplican las 9 correcciones que no salen de la sección; 2 son transversales, 1 no traía propuesta y 1 revisa un ADR vigente. Ficha: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md). El schema no se toca; el único cambio de contrato es en `logic/cuentas.js`, y es de vista, no de cálculo.

- **C1 el chip de datos de transferencia deja de desbordar (regla R40, nueva).** Es el único hallazgo de la auditoría que es un bug duro y no un criterio. `_labelDatosTransferencia()` concatenaba con "·" los tres campos que MC.14 puso en el formulario, y `.chip` es `white-space: nowrap` sobre un contenedor con `overflow: visible`. **Medido antes: el chip rendía 377,8px dentro de un contenedor de 222,7**, terminaba 38,3px por fuera de una tarjeta de 356,4 y su borde derecho (893,4) cruzaba por debajo del grupo de acciones (izquierda en 746,4): el texto pasaba bajo el lápiz y la papelera. No era un caso extremo: bastaba llenar los tres campos. Ahora el chip muestra **un** dato, el que sirve para que a uno le consignen (la llave con su tipo, o el número de cuenta, o el alias), y el resto sigue guardado y visible al editar. **Medido después: 169,5px; un número de cuenta de 21 dígitos, 219,2px, dentro de la tarjeta.** El blindaje es lo que hace que no vuelva a pasar: la etiqueta viaja en `.chip__label` con `min-width: 0` y elipsis, porque un nodo de texto suelto dentro de un `inline-flex` no acepta `text-overflow`. **Verificado a 320px: la etiqueta trunca y sigue sin tocar las acciones.** El truncado va acotado a `.cuenta-card__chips`: el resto de los chips de la app llevan texto de catálogo, de largo conocido.
- **C4 la barra de composición se puede ver y el texto por fin la explica (regla R39, nueva).** Dos defectos en el mismo componente. Uno: los cuatro segmentos eran el mismo azul diferenciado solo por opacidad (`[1, 0.62, 0.34]` más 0,2 de la cuarta en adelante). **Medido antes: 5,74 · 3,01 · 1,77 · 1,36**, los dos últimos bajo el umbral no textual de 3:1 y entre sí a 1,3:1. Dos: el comentario del CSS afirmaba que "el resumen en texto la acompaña (SC 1.4.11)" y `resumenCuentas()` devolvía "4 cuentas · 1 billetera · efectivo", que cuenta cuentas y no dice cuánto tiene cada una. `composicionCuentas()` pasa a un tope de **tres** segmentos con el resto agrupado en `{ id: null, nombre: 'otras' }`, y el resumen pasa a "Bancolombia 64% · Davivienda 23% · otras 14%". **Medido después: 5,74 · 4,22 · 3,01**, los tres sobre el umbral. **El piso es 0,62 y no el 0,55 que pedía el informe:** medido sobre el fondo real del hero, 0,55 rinde 2,65:1 y no alcanza el umbral que la propia corrección invoca; 0,62 es el primer paso que lo alcanza (y es, no por casualidad, el valor que el informe ya había medido en 3,01:1). El segmento gana además `min-width: 6px` para que una porción diminuta no deje de dibujarse. La separación entre vecinos sigue siendo baja (1,36 y 1,40): con la diferencia cifrada en opacidad no hay más margen, y lo que carga la información real es el texto, que es el punto de R39.
- **C3 la entrada a mover dinero deja de ser el control más discreto de la sección (regla R38, nueva).** "Transferir entre cuentas" era `btn-ghost btn-sm`: **medido, 165,5x36px** sin borde ni ícono, naciendo en 839,9px de una página de 2.136,9, o sea 56px bajo el pliegue de 784. En la misma pantalla, tres `btn-primary` que solo abren un formulario ("+ Cuenta", "+ Fijo", "+ Puntual") estaban sobre el pliegue. **Medido después: 358,9x44** de ancho completo con borde e `i-transferencia`, pegado a la lista que opera. **No pasa a primario:** el primario de la sección sigue siendo uno solo, el del encabezado (R11).
- **C5 un solo vacío bajo el encabezado único.** MC.18d fusionó los dos sub-encabezados de ingresos en "Fuentes de ingreso" y dejó los dos estados vacíos: **medido, 164,2px cada uno**, con dos redacciones distintas bajo un encabezado que anunció una sola lista. Con las dos listas vacías se emite un mensaje único que nombra las dos entradas; **medido después: 186,9px en total** y el segundo contenedor en 0. Con una de las dos con datos, cada lista vuelve a su copy propio: ahí el vacío sí informa de algo que falta.
- **C6 los cinco emoji de la sección salen del sprite.** MC.18b escribió el criterio ("chips en vez de emoji") y lo aplicó a la tarjeta de cuenta, dejando intacta la lista de al lado: hoy la misma pantalla tenía dos lenguajes de ícono a tres bloques de distancia. Pasan el calendario del hint de ingreso fijo (`i-agenda`), el pie y el estado hecho de la tarjeta de distribución (`i-saldo`, `i-check-circle`), sus alertas (`i-alert`) y el glifo del botón de invertir (`i-transferencia`, el mismo del ledger). **Cero emoji en la sección, verificado sobre el DOM renderizado.** El hint gana el modificador `.list-item__hint--icono` y no la clase base: los hints de Me deben son solo texto y no deben cambiar de layout. El `⇄` estaba documentado en la ficha como decisión deliberada ("glifo de acción puntual, no de catálogo"); se cambia porque el sprite ya tiene el símbolo y el propio informe pedía revisarlo.
- **C7 dos controles llegan a 44px.** **Medido antes:** el botón de invertir 36x36, cuyo comentario lo justificaba como "hit target consistente con `.btn-icon`" cuando `.btn-icon` tampoco llega a los 44 que fija este documento, y las acciones de la tarjeta de cuenta 44 de ancho por 36 de alto, contra **44x44 de los mismos dos botones en las listas de ingreso**, tres bloques más abajo en la misma pantalla. **Medido después: 44x44 los cuatro**, sin mover el ícono (18x18) ni el ancho. El 44 de la tarjeta va en `responsive.css` y no en `domain.css` porque compite con `.btn-sm`, que se declara en esa capa y gana por orden sin importar la especificidad: **la primera versión se escribió en `domain.css` con selector (0,2,0) y midió 36px igual** (corolario de R23, tercer caso después de Apartados y Límites). El ojo del hero (40px) sigue fuera: vive en la lista compartida de `domain.css` con Inicio, Calendario y Deudas.
- **C9 el bloque principal entra al esquema de encabezados.** La sección abría con el h1 y no volvía a tener encabezado hasta "Fuentes de ingreso", **medido a 1.050,4px**: el hero, las cuatro tarjetas, el botón de transferir y la tarjeta del 4x1000, o sea la mitad de la pantalla y el contenido principal, no colgaban de ningún h2. Un `<h2 class="sr-only">Tus cuentas</h2>` lo resuelve sin ruido visual (el h1 ya nombra la sección). **Verificado: cuatro encabezados cubren la sección completa.** Cubierto por un test nuevo en `a11y.test.js`, que lee `index.html`.
- **C10 fuera dos regiones vivas estáticas.** La tarjeta del 4x1000 y el aviso "recibiste tu ingreso" llevaban `role="status"` sin ser respuesta a ninguna acción, y la sección se repinta en cada `state:change`: registrar un gasto o guardar un ingreso hacía que el lector volviera a anunciar "4x1000 estimado este mes: $9.400" con la cifra sin cambiar. **No es una regla nueva: R24 ya lo dice** desde Apartados. **Medido después: la única región viva que queda en la sección es el nudge de próximo ingreso**, que sí cambia. El `role="status"` del pie "Ya distribuiste tu ingreso" se conserva: ese sí responde a una acción.
- **C11 la tarjeta de efectivo pierde el subtítulo.** El slot del segundo renglón mezclaba dos clases de dato: con un banco lleva el tipo de producto ("Ahorros"), que aporta, y con el efectivo producía "Efectivo / Dinero en efectivo", el nombre repetido con más palabras. `_tipoLabel()` devuelve `''` para esa clase y la tarjeta omite el párrafo. Completa el criterio que MC.15a fijó para los bancos y que quedó pendiente para este caso.
- **`DESIGN_SYSTEM.md` recibe R38, R39 y R40.** El informe traía seis reglas nuevas (R19 a R24) y **solo entran tres**: su R20 (una lista de dinero, una anatomía) pertenece a la corrección transversal que quedó fuera, su R22 (la privacidad no termina en la sección) **ya la dice R20** y su R24 **ya la dice R24**. Se renumeran al primer hueco real: la Barra de navegación llegó hasta R37. R38 y R39 en Principios, R40 en Chips y Badges, junto a R22, de la que es continuación (R22 cubre el chip cuyo texto escribe la app; R40, el chip cuyo texto escribe el usuario y no tiene largo máximo).
- 20 tests unitarios nuevos y 7 actualizados al contrato nuevo de `composicionCuentas`/`resumenCuentas`, 1 test nuevo en `a11y.test.js` y 1 E2E ajustado al resumen del hero. **3122/3122 unit + lint verdes**; E2E `smoke`, `a11y-forms`, `reflow-320` y `navegacion-render` **173/173**. Verificado en el navegador a 390px y 320px, tema oscuro, con 4 cuentas (una con los tres datos de transferencia, otra con cuota de manejo, una billetera y efectivo), 2 ingresos fijos, 2 puntuales y el 4x1000 activo: desborde del chip, entrada a transferir, barra y resumen, modal de par con invertir en los dos sentidos, los tres estados de vacío de ingresos y la tarjeta de efectivo. Sin errores de consola y sin overflow horizontal. SW v426 → v427.

**Fuera de alcance, y por qué.** **C2** (que el monto de las filas de ingreso vuelva al primer renglón a la derecha, como el saldo de la tarjeta de cuenta) es el cambio con más superficie de todo lo auditado: lo causa `.list-item:has(.list-item__meta)` en `styles/responsive.css`, la misma regla que ordena las filas de **Gastos, Deudas, Personales y Metas**, y el propio informe advierte que hay que revisar las cinco secciones antes de darla por buena. **C8** (que el ojo de privacidad cubra también los selectores de cuenta) toca `infra/cuenta-helper.js`, que consumen Gastos, Deudas, Abonos y Registrar; el informe ya lo dejaba como decisión V4. Vale anotarlo con precisión: **no es una regla nueva, es una violación de la R20 ya escrita** ("el ojo no tiene excepciones"), y sigue abierta: con el ojo activo, abrir "Transferir" muestra los cuatro saldos exactos, y el `aria-label` del picker los lee en voz alta. **H10** (el formulario de cuenta mide 1.270,4px en una hoja de 776px) llega sin propuesta a propósito: el informe lo agrupa con los formularios de Gastos y Calendario para decidir una vez cuándo un formulario pasa a pasos. **H12** (el orden de la sección) **revisa la decisión D6 del [ADR 035](DECISIONS/035-mis-cuentas-v2.md)**, que puso "Distribuir mi ingreso" al final a propósito, así que espera la palabra de Esteban (regla 2.7). Los cuatro quedan escritos en la ficha con su medición. La sección **creció** de 2.136,9 a 2.260,3px: es el precio declarado de C3 y C7, y H12 (que ahorraría unos 150px al bloque de arriba) no se ejecutó. La auditoría tampoco revisó escritorio, tablet, tema claro, el asistente de distribución por pasos (materia de MC.13e-2), el bank-picker desplegado, el interior de los formularios de ingreso, el caso de 8 o más cuentas ni lectores de pantalla reales: se revisó el marcado, no el anuncio.

### fix(limites): DIS.7, 9 correcciones de la auditoria de diseno sobre Limites de gasto · 2026-07-26

Auditoría de diseño de la sección Límites de gasto a 390px, tema oscuro (10 hallazgos, L1 a L10). Se aplican las 9 que no revisan una decisión vigente; VL1 sí lo hace y espera la palabra de Esteban. Ficha nueva: [`contexto/limites.md`](contexto/limites.md). El schema no se toca y ningún cálculo cambia: el único cambio en `logic.js` es que la validación acepta las categorías que el usuario creó en Gastos, sin lo cual la corrección de L4 no puede guardar.

- **L2 la barra de Necesidades deja de celebrar el consumo (regla R34, nueva).** El [ADR 019](DECISIONS/019-limites-por-rol.md) pidió que Necesidades se viera neutra ("estado monitor, sin ámbar ni rojo") y el código cumplía la letra: `claseBarra = ''`. Pero `.progress-bar` sin modificador cae a `--fk-section-accent, --fk-accent` y ninguna sección declara `data-dom` en su cuerpo, así que el fallback nunca resuelve a color de sección. **Medido antes: `rgb(31,209,148)`, el acento de marca**, el mismo color con el que Ahorro celebra superar su meta, con las dos barras una debajo de la otra. **Medido después: `rgb(136,143,166)`.** Un modificador nuevo, `.progress-bar--neutro`, que no toca la capa semántica (`--warn`, `--danger`, `--complete`).
- **L4 el consejo gana su puerta (regla R35, nueva).** `categoriasSinPresupuesto()` agrupa cualquier categoría con gasto del mes; el selector del formulario recorría solo `CATEGORIAS_GASTO_USUARIO`. Resultado: la sección listaba "Domicilios · $42.000" y remataba con "Asígnales un límite", pero al abrir el formulario esa categoría no estaba: **callejón sin salida para cualquiera que hubiera creado una categoría propia en Gastos** (TX.9b). Ahora cada fila **es** el botón que abre el modal con su categoría precargada, y los chips incluyen las personalizadas. Las que CAT.1 movió a Calendario ("Vivienda", "Servicios públicos") y las internas que la app escribe sola ("Deudas", "Ahorro") explican dónde se controlan en vez de pedir un tope que no se puede crear. **No sugiere montos:** eso es [ADR 044](DECISIONS/044-motor-unico-de-sugerencia-por-categoria.md) y LIM.1, que esta corrección no pisa.
- **L5 el formulario adopta FORM.1b, y de paso se destapa un defecto que nadie había visto.** Era el único formulario de la app en el patrón anterior: `<select>` nativo de categoría y un input de monto suelto. Pasa a chips con ícono + `monto-hero`, con el gasto real del mes en esa categoría como pista ("Gastaste $42.000 acá este mes", vía `calcularGastadoCategoria`, que ya existía) y actualizada al cambiar de chip. **El defecto:** un control deshabilitado no entra en `FormData`, así que el `<select disabled>` del modo edición dejaba a `validarPresupuesto` sin categoría y **guardar el cambio de un tope siempre fallaba** con "Debes elegir una categoría". Reproducido en el navegador antes de corregirlo. La categoría fija viaja ahora en un campo oculto.
- **L8 cada cosa se dice una vez, donde se puede actuar sobre ella.** Con dos categorías en alerta, la tarjeta de Estilo de vida abría con tres nudges seguidos: uno por categoría más el del grupo, y los dos primeros describían sobres que estaban unos 400px más abajo mostrando ya el mismo estado con borde, barra, porcentaje y la palabra "Excedido". El mensaje de cada categoría baja a su sobre como `.envelope__nota` con el color de su estado. **El copy no se toca** ([ADR 019](DECISIONS/019-limites-por-rol.md) D3 pidió conservarlo): cambia de sitio, no de palabras. Por eso la nota conserva el nombre de la categoría aunque el mockup lo recortaba.
- **L1 los cuatro estados salen del sprite.** `_NUDGE_ICONO` mapeaba los niveles a emoji del sistema operativo: color propio que no sale de ningún token ni responde al tema, peso propio y caja propia. Pasan a `i-alert`, `i-trending-up`, `i-info` e `i-check-circle` (el sprite no tiene reloj: crear uno es alcance de IV.4). En el sobre, el glifo de estado se retira del título: el borde, la barra y "Excedido" ya lo dicen tres veces.
- **L7 los grupos entran en el esquema de encabezados y dos controles llegan a 44px (reglas R1 y R4).** Los tres nombres de grupo eran `<p>`: la página poblada exponía solo tres encabezados y ninguno era un grupo. Pasan a `<h3>` con el tamaño re-declarado, así que el aspecto no cambia. **Medido antes: "Ajustar en Mis cuentas" 150,8x21 y "+ Límite" de la tarjeta 71,8x36. Después: 150,8x44 y 71,8x44**, el primero con margen negativo para no mover el dibujo. El 44 del botón va en `responsive.css` y no en `analysis.css` porque `.btn-sm` a 36px se declara en esa capa, que gana por orden (corolario de R23). El nudge de exceso pasa a `role="alert"`, como el nivel alto en el resto de la app.
- **L6 un verbo por acción (regla R8).** El encabezado decía "+ Límite" y la tarjeta "+ Agregar límite" para abrir el mismo modal. Los dos botones se conservan (están a 1,3 pantallas de distancia y la jerarquía ya era correcta: primario arriba, secundario junto a los topes), pero con el mismo nombre. En el estado vacío el del encabezado se retira: ahí la salida que corresponde es "Ir a Mis cuentas", y **de tres botones a la vez se pasa a dos**.
- **L10 el modal dice qué estás haciendo.** `_editarPresupuesto()` solo reemplazaba el cuerpo; el `<h2>` vive estático en `index.html` y nunca se reescribía, así que editar el tope de Restaurantes abría una hoja titulada "Nuevo límite de gasto" cuyo propio contenido la contradecía, y eso es lo que anunciaba el lector de pantalla por `aria-labelledby`. Ahora se escribe al abrir, con el mismo patrón que gastos, agenda, ahorro, apartados y compromisos ya usaban: Límites era el único dominio que no lo hacía.
- **L9 el chevron y "Editar" hablan el idioma de la app.** El desplegable dibujaba su flecha con `content: '▾'` y la fila de acciones del sobre mezclaba un botón de texto con uno de ícono. Pasan a `i-chevron-right` rotado e `i-edit`. La regla que apaga el `::after` queda **acotada a `.grupo-card__desglose`**: `.analisis-grupo` lo comparte Análisis, que está fuera del alcance y no cambia.
- **`DESIGN_SYSTEM.md` recibe R34 y R35.** El informe las numera R9 y R10; se renumeran al primer hueco real (Interfaz llegó hasta R33). Las dos van en Principios de diseño.
- 21 tests unitarios nuevos en `presupuesto.test.js` (categorías personalizadas en la validación, las seis propiedades del formulario nuevo incluida la categoría que sí llega al submit, y las nueve correcciones sobre el panel renderizado) y 2 E2E actualizados al copy y al sitio nuevo del mensaje. **3106/3106 unit + lint verdes**; E2E `smoke` 156/156, `a11y-forms`, `reflow-320` y `navegacion-render` verdes. Verificado en el navegador a 390px, tema oscuro, con plan del mes, tres topes, tres categorías huérfanas y una categoría propia: creación desde la fila huérfana, edición de un tope, cambio de chip actualizando la pista, estado excedido y estado vacío. Sin errores de consola y sin overflow horizontal. SW v422 → v423.

**Fuera de alcance, y por qué.** **VL1** (que Estilo de vida abra la sección en móvil) **revisa la decisión D4 del [ADR 019](DECISIONS/019-limites-por-rol.md)**, que fijó el orden y dejó la diferenciación a la cantidad de contenido: la regla 2.7 prohíbe revertir un ADR en silencio, así que espera decisión explícita. Medido hoy: la tarjeta de Estilo de vida empieza a 804px y sus topes a 1.290px, 1,53 pantallas de recorrido. La **teja de dominio en el encabezado del modal**, que el informe pedía dentro de FORM.1b, se deja fuera: ningún modal de la app la lleva y `.modal__header` es `space-between`, así que agregarla solo acá haría de Límites el raro y obligaría a una regla de CSS acotada contra un componente compartido (criterio de CLAUDE.md sección 2: gana la convención ya escrita). Los mismos cuatro emoji **siguen en Análisis, Ajustes e Importar**, y el chevron de texto sigue en el desplegable de **Análisis**: son otras secciones. El panel de esta sección en Inicio (`renderPanelLimites`) no se auditó a fondo. La auditoría tampoco revisó escritorio, tablet, tema claro, el flujo de eliminar un tope ni la aritmética del asignado por grupo, cuya base de cálculo es el **[ADR 045](DECISIONS/045-base-de-calculo-del-disponible-para-limites.md)**, abierto.

### fix(interfaz): DIS.6, 7 correcciones de la auditoria de diseno sobre la Interfaz · 2026-07-26

Auditoría de diseño de la capa global de navegación a 390px, tema oscuro (11 hallazgos, H1 a H11): barra inferior, hoja "Más", encabezados, indicadores de ubicación y el arranque de un usuario nuevo. Se aplican las 7 correcciones listas (C1 a C7); C8 es solo una regla escrita y los 4 hallazgos restantes son decisiones de producto. Ficha: [`contexto/sistema-visual.md`](contexto/sistema-visual.md). `logic/` y el schema no se tocan.

- **C1 la primera pantalla deja de ser la única sin estilos (regla R29, nueva).** Las cinco clases que `_renderPaso1()` inyecta (`.onboarding__hero`, `__title`, `__desc`, `__footer`, `__note`) no tenían **ninguna** regla en el proyecto: la única aparición de "onboarding" en todo el CSS era un comentario en `config.css` sobre el banner de instalación. **Medido antes:** hero de 16px alineado a la izquierda con margen 0 (un emoji del tamaño del texto), h2 con los 30px de `base.css` y `margin: 0`, y la nota de privacidad a 16px, el mismo tamaño que el cuerpo. Se aplica la receta que la app ya usa 11 veces, la de `.empty-state`: teja centrada, título, descripción, CTA de ancho completo y nota en `--fk-text-xs`. **Medido después: hero 64x64 con el degradado de marca, título 24px con 8px de margen, nota 12px en `--fk-text-muted`, CTA 341x52.** Cero componentes nuevos, cero tokens nuevos.
- **C2 el 💚 sale de la pantalla de bienvenida.** NAV2.1b ([ADR 040](DECISIONS/040-navegacion-v2-visual.md) D4) llamó al emoji del sidebar "el último emoji decorativo de la UI estructural" y no lo era: el hero del wizard seguía siendo `💚`, y es el primer píxel de identidad que la app muestra. Peor, se dibuja distinto en cada sistema operativo, así que la primera impresión de Finko cambiaba según el teléfono. El hueco que crea C1 usa la receta exacta de `.sidebar__logo-mark` y ahí entra la "F". Cierra NAV2.1b de verdad.
- **C3 el botón "Más" dice dónde estás (regla R30, nueva).** El botón no lleva `data-section`, así que el mapeo de dominio de IV.2a no tenía de dónde tomarle color y caía al acento genérico. **Medido antes:** en Inicio y en Análisis los mismos tres valores, `rgb(75,217,155)` de color, `rgba(31,209,148,0.12)` de fondo y `rgb(31,209,148)` de indicador: **11 de las 14 secciones compartían un estado activo que no se distinguía del de Inicio**. Ahora `markActiveNav()` le escribe la sección vigente y el color llega solo. **Medido después: Análisis `rgb(143,155,179)`, Mis cuentas `rgb(91,149,240)`, Metas `rgb(157,115,235)`.** El botón sigue abriendo la hoja: gana una segunda función, no cambia la primera. El `aria-label` pasa a "Análisis. Abrir más opciones", que es lo que hace: nombra y abre. Un mapa de 11 entradas (`SECCION_NAV`) al lado de `MAS_SECTIONS`, que ya existía. Sin slots nuevos y sin tokens nuevos.
- **C6 Movimientos gana entrada de navegación (regla R32, nueva).** Era la sección 14 y no estaba en la barra, ni en la hoja, ni en el sidebar: se llegaba solo por "Ver todo" de Actividad reciente, un enlace que vive en una celda que arranca `[hidden]` y solo aparece cuando ya hay movimientos. Quien registraba su primer gasto y quería el historial completo no tenía por dónde. Un tile en "Gestión del dinero" con `i-saldo` (el sprite no tiene ícono propio) y `'movimientos'` dentro de `MAS_SECTIONS`. **Medido: la grilla es de 2 columnas, así que el sexto tile no cuesta alto (hoja de 484,8px, 57% de 844).**
- **C5 dos controles de navegación llegan a 44px (reglas R4/R8).** **Medido antes:** el cierre de la hoja "Más" en 32x32, en la esquina más lejana del pulgar que la abre, y las pestañas del hub Ahorros en 66,1x38,6. **Medido después: 44x44 y 66,1x44**, sin mover el ícono (20x20) ni la línea inferior de las pestañas. El 44 del cierre va en el selector compuesto `.modal__close.mas-sheet__close` porque `.modal__close` (32x32) se declara más abajo en el mismo archivo y con la misma especificidad: ganaría por orden (corolario de R23). El resto de la capa ya cumplía: los cinco slots de la barra miden 77,7x59,2, el botón de tema 50x54, los tiles 165,3x54 y el volver de Movimientos 64,4x44.
- **C4 la app se nombra una vez en móvil (regla R31, nueva).** `.sidebar__logo` es `display: none` bajo 1024px, así que la marca "F" que NAV2.1b diseñó no existía en el teléfono y el h1 de Inicio es `sr-only` (IN.8d, [ADR 034](DECISIONS/034-inicio-v2.md) D8): en la PWA instalada, sin barra de direcciones ni título de pestaña, la app no decía su nombre en ninguna pantalla. **No** se agrega barra superior fija: costaría 44 a 56px permanentes en la pantalla más apretada y desharía una decisión vigente. La marca de 28x28 entra a la fila de perfil de Inicio, que ya tenía avatar y acceso a Ajustes. **Medido: la fila sigue en 47,7px** (el avatar de 46 ya la definía).
- **C7 Movimientos gana su teja de encabezado (regla R33, nueva).** Era la única sección sin teja y sin decisión detrás (Ajustes ya la tenía). No es dominio financiero ([ADR 025](DECISIONS/025-tejas-de-marca.md) D6), así que va sin `data-dom` y `.cat-teja` cae al neutro por su propio fallback. Reusa `i-saldo`: cero íconos nuevos, cero tokens nuevos. **13 de 14 encabezados con la misma anatomía, y el único distinto lo es porque se decidió** (Inicio, IN.8d).
- **`DESIGN_SYSTEM.md` recibe R29 a R33.** El informe las numera R30 a R34 sobre el supuesto de que la auditoría de Análisis ya ocupó R25 a R29; no está aplicada y Apartados llegó hasta R28, así que se **renumeran** al primer hueco real. Las cinco van en Principios de diseño.
- 4 tests unitarios nuevos en `shell-nav.test.js` (nombre, ícono, `data-section` y `aria-label` del botón ubicado; el cambio entre dos secciones del menú; la limpieza al volver a la barra; Movimientos como sección del menú) y 1 E2E ajustado a 11 tiles. **3085/3085 unit + lint verdes.** Verificado en el navegador a 390px, tema oscuro: wizard con datos borrados, fin del wizard, recorrido por las 11 secciones del menú midiendo etiqueta e indicador, hoja abierta con el cierre y los tiles, pestañas del hub y encabezado de Movimientos. Sin errores de consola. SW v421 → v422.

**Fuera de alcance, y por qué.** Las cuatro decisiones de producto quedan sin tocar y con recomendación escrita: **V1** (si Deudas sube a la barra: `index.html` la pone en el grupo `aria-label="Uso diario"` **y** le pone `nav-item--no-mobile`, así que la app se contradice, pero subirla obliga a bajar otra y eso cambia la forma de la app), **V2** (el hub Ahorros aparece dos veces, como cuatro tiles planos y como cuatro pestañas: NAV.B y el ADR 040 D5 son dos decisiones vigentes que apuntan distinto), **V3** (el segundo paso del onboarding: el wizard pide el nombre y deja al usuario en un Inicio en ceros, con el primer dato útil a dos toques más; cae en el alcance de **GU.1a**, que ya tiene el inventario de arranque) y **V4** (la acción "Registrar" ocupando un slot de pestaña: decisión vigente NAV.A2/[ADR 024](DECISIONS/024-navegacion-registro-central.md), la recomendación del informe es mantenerla). **C8** no es código: declara `.section__volver` como el patrón de regreso para futuras sub-vistas, y con C6 la sección ya no depende de él para existir. La auditoría no revisó escritorio ni tablet, tema claro, el interior de la hoja "Registrar", el banner de instalación de la PWA, el toast de logros, el botón atrás físico de Android sobre el router de hash ni lectores de pantalla reales.

### fix(apartados): DIS.5, 11 correcciones de la auditoria de diseno sobre Apartados · 2026-07-26

Auditoría de diseño de la sección Apartados a 390px, tema oscuro (13 hallazgos, A1 a A13). Se aplican las 11 que no dependen de otra sección; A11 y A13 cruzan dominio y ADR. Ficha: [`contexto/apartados.md`](contexto/apartados.md). El schema no se toca y ningún cálculo cambia, salvo el umbral único de A3.

- **A1 el badge de vencimiento vuelve al ámbar (regla R23, nueva).** `.badge` está declarada **dos veces**: en `forms.css` es una pastilla de estado (su propio comentario dice "ej. vencimientos en Apartados") y en `atoms.css` es un contador de notificación con fondo `--fk-danger`, texto blanco y alto fijo de 20px. `components.css` importa atoms **después** de forms, así que a igual especificidad ganaba atoms. **Medido antes:** el badge "19 días" imprimía `rgb(255,71,87)` = `--fk-danger` en una caja de 52x20px, con el borde ámbar al 35% como único rastro de la intención. Selector compuesto (0,2,0) y geometría de pastilla restituida. **Medido después: fondo ámbar al 18%, color `rgb(255,184,46)`, caja 59x18.** Rojo vuelve a significar emergencia ([ADR 019](DECISIONS/019-color-semantico.md)); a tres semanas de la fecha ya no decía "esto es urgente". Renombrar una de las dos clases es el barrido que pide R23 y va más allá de esta sección.
- **A2 y A7 la fila reparte bien su ancho (regla R19).** **Medido antes:** 356x344,6px repartidos en 56 (anillo) | 110 (contenido) | 133 (acciones), o sea la columna de botones **más ancha que la de información**; el subtítulo envolvía en 6 líneas y la sugerencia de aporte en otras 6, y un solo apartado ocupaba el 41% de una pantalla de 844px. Grilla nueva acotada a `.lista-apartados`: primer renglón [anillo · nombre y detalle · %] y acciones en el suyo. **Medido después: cuerpo 208px, fila 215px (236 con badge de vencimiento), cero scroll horizontal a 320px.** La identidad sale del `<p>` del título y entra al centro del anillo, y el porcentaje pasa a `.list-item__meta` (regla R28 nueva): el arco ya dibujaba ese número y el subtítulo ya lo implicaba. El ícono va en un `<span>` sobrepuesto y **no** como opción `etiqueta` de `progressRing()`, porque `apartado.icono` puede ser un id del sprite (CAT.2c) y dentro del `<text>` del SVG el marcado se imprimiría escapado. Las reglas de grilla van en `responsive.css` y no en `domain.css` porque esa capa gana por orden, igual que G2 en Gastos.
- **A3 un umbral y un aviso que suma (reglas R25 y R27, nuevas).** `apartadosProximos()` entraba a 60 días y el badge de la fila solo a 30: un apartado a 45 días se contaba en "y 2 apartados más con fecha próxima" y su fila no mostraba **ninguna** señal, así que el usuario que bajaba a buscarlo no lo encontraba. `DIAS_PROXIMO = 30` lo consumen los dos. Y el aviso dejaba de aportar: mostraba el apartado más urgente con su fecha y su aporte, y ese mismo apartado aparecía 60px más abajo con los dos datos iguales. Ahora hace lo único que la lista no puede: "3 apartados vencen en los próximos 30 días / Te falta reunir $1.080.000 entre los 3".
- **A4 fuera las tres regiones vivas estáticas (regla R24, nueva).** `.apartado__sugerencia`, `.apartado__listo` y el nudge llevaban `role="status"` sin ser respuesta a ninguna acción, y la lista se repinta en cada `state:change`, cada `hashchange` y después de cada aporte, borrado o reinicio. **Medido antes: 5 regiones vivas** con cuatro apartados, así que registrar un solo aporte hacía que el lector anunciara las sugerencias de todos, encima del anuncio real. **Medido después: 0.** La retroalimentación ya la da `announce()`, que para eso existe.
- **A5 "Ya lo usé" pasa por `confirmar()` y llega a 44px (regla R26, nueva).** Era el **único** handler destructivo del dominio sin confirmación: un toque ponía `montoActual` en el excedente (normalmente $0) y avanzaba la fecha un periodo completo, sin preguntar y sin deshacer, mientras eliminar el apartado (que destruye menos, porque ahí el dinero ya no está en juego) sí abría un modal. El mensaje dice el monto que se libera y la fecha nueva; sin `peligroso: true`, porque cerrar un ciclo no es borrar datos. **El botón pasa de 78x36 a 78x44**, al lado de una papelera de 44x44 a 8px de distancia.
- **A6 los dos montos con separador de miles (regla R16, segundo caso).** `apartado-objetivo` y `aporte-apartado-monto` eran `type="number"` planos en la sección cuyo cálculo entero depende de esos dos números: un cero de más en `980000` no se detecta a simple vista y contamina el aporte sugerido de todos los periodos siguientes. Pasan a `type="text" inputmode="numeric"` con `data-miles`, el mismo patrón que Ajustes montó en B4. El par `miles`/`desdeMiles` queda **duplicado a propósito** en `apartados/view.js`: ADN #10 impide importar de config, y promover el par a `infra/` toca Ajustes, que está fuera del alcance.
- **A8 seis plantillas a la vista y catorce plegadas (decisión V3).** **Medido antes:** las 20 plantillas miden 420px, el 34% de un formulario de 1.235px dentro de una hoja de 776px, y empujaban "¿Cuánto necesitas reunir?" al borde del pliegue. Las 6 más frecuentes (SOAT, Impuestos, Impuesto predial, Útiles y uniformes, Regalos, Navidad) se quedan arriba y el resto entra al `.form-details` que **este mismo formulario ya usa** para la recurrencia: cero CSS y cero componentes nuevos. **Medido después: chips 99px, formulario 835px.** El catálogo no se toca: `PLANTILLAS_APARTADO` sigue con sus 20 entradas.
- **A9 y A10 el vacío explica el mecanismo.** `normalizarApartado()` crea el apartado con `montoActual: 0` y no toca ninguna cuenta (el dinero solo se mueve al aportar), pero el copy sugería lo contrario ("separa poco a poco el dinero", "empezar a separar dinero") y **ninguna pantalla lo decía**: un usuario que crea su SOAT, ve "$0 / $980.000" y cree que ya apartó, no vuelve a aportar. El tip educativo se funde con la descripción y ahí se cierra el hueco; el `announce()` de creación invita al primer aporte. La desambiguación con Límites de gasto se queda (son dos secciones que se confunden) en una línea bajo el CTA, que baja a `.btn-secondary`: "+ Apartado" del encabezado ya es el primario (regla R1). **De cinco bloques de texto a tres.**
- **A12 el formulario de aporte dice el contexto una vez.** La primera línea era una `form-hint--muted` con "Progreso de SOAT: $320.000 de $980.000 (33%) · Faltan: $660.000": el contexto más importante de la hoja con el estilo de las ayudas atenuadas, y "faltan" por tercera vez después de la fila que el usuario acaba de tocar y del anillo. Una sola línea legible: "Llevas $320.000 de $980.000. Te faltan $660.000 para el 14 de agosto de 2026", que además suma la fecha, el dato que no estaba en esta hoja. El hint del prellenado de AP.5a se queda.
- **`DESIGN_SYSTEM.md` recibe R23 a R28.** El informe las numera R19 a R24; se **renumeran** porque R19 a R22 ya las ocupan Me deben y Gastos. R23 en Capas CSS (con el corolario de por qué una corrección que compite con `responsive.css` va en `responsive.css`), R24, R25 y R27 en Principios, R26 en Botones y R28 en List Items.
- 26 tests unitarios nuevos en `apartados.test.js` (el par de miles, el umbral único, el resumen del aviso en singular y plural, la anatomía de la fila, los dos campos de monto, el contexto del aporte, el vacío) y 3 E2E ajustados. **3081/3081 unit + lint verdes**; E2E `smoke` 156/156, `a11y-forms`, `hub-ahorros` y `reflow-320` verdes. Verificado en el navegador a 390px y 320px, tema oscuro, con 4 apartados: crear con separador, aportar con el monto prellenado, confirmar y cancelar "Ya lo usé", sin errores de consola y sin overflow horizontal. SW v420 → v421.

**Fuera de alcance, y por qué.** **A11** (V1: el ciclo completo termina en "Ya lo usé", pero el gasto real de $980.000 de SOAT no existe para la app, así que quien aparta disciplinadamente todo el año ve menos gastos que quien paga de golpe y su análisis de categorías queda incompleto justo en los gastos grandes) cruza dominios: ADN #10 impide que apartados importe gastos, tendría que ir por EventBus, y decidir si el gasto se registra al aportar o al usar es una decisión de producto. **A13** (V2: 61% de la primera pantalla gastado antes del primer apartado, y la fila "📦 Apartados $1.860.000" del consolidado repite la suma de lo que el usuario está por ver) lo fija el [ADR 024](DECISIONS/024-navegacion-registro-central.md) D4, vive en el shell y afecta a Fondo, Metas, Apartados e Inversión a la vez: se decide en la auditoría de Ahorros. La corrección **estructural** de A1 (renombrar una de las dos `.badge`) pide un barrido de CSS fuera de esta sección. **AP.5** (form v2) sigue abierta y toca el mismo formulario que A8: A8 es composición, AP.5 es estructura. La auditoría tampoco revisó escritorio, tablet, tema claro, el reparto multicuenta al aportar ni lectores de pantalla reales.

### fix(gastos): DIS.4, 10 correcciones de la auditoria de diseno sobre Gastos · 2026-07-26

Auditoría de diseño de la sección Gastos a 390px, tema oscuro (12 hallazgos, H1 a H12). Se aplican las 10 correcciones listas (G1 a G10); las 2 restantes revisan decisiones vigentes y esperan la palabra de Esteban. Ficha: [`contexto/gastos.md`](contexto/gastos.md). `gastos/logic.js` y el schema no se tocan en toda la tarea.

- **G1 el título nombra el mes visible (regla R10, nueva).** El label del hero estaba fijo en "Gastaste este mes" y la nav de mes vive **dentro del mismo hero**: al tocar "‹" quedaban a 30px de distancia "Junio 2026" y "Gastaste este mes", con el chip comparativo diciendo "8% más que mayo" en la misma tarjeta. El dato más grande de la pantalla quedaba atribuido al mes equivocado justo a comienzos de mes, que es cuando se revisa el anterior. Ahora `Gastaste en junio` y, con filtro activo, `Café en junio`: antes el filtro se comía el mes por completo ("Gastaste en Café").
- **G2 el monto vuelve al primer renglón (regla R19).** La fila usaba la grilla genérica de `responsive.css`, que bajo 540px da el primer renglón a las acciones. **Medido antes:** fila de 356,4px repartida en 40 | 110,7 | 148, o sea **41,5% del ancho para tres botones** (TX.12 sumó "Repetir" a editar y eliminar) y 110,7px para el nombre, así que "Cuidado personal" partía en dos líneas y el alto de la fila cambiaba con el largo de la categoría; el monto quedaba a 67px del tope. Reglas nuevas acotadas a `.gastos-dia`: primer renglón [teja · nombre y detalle · monto], acciones en el suyo. **Medido después: cuerpo 184 a 205px, monto a 16,8px del tope, fila de 107,6px sin nota y 127,9px con ella, títulos en una línea.** Va en `responsive.css` y no en `domain.css` a propósito: la capa `responsive` le gana por orden a `components`, así que desde ahí la corrección no se aplicaría.
- **G3 ninguna barra de chips esconde opciones (regla R9, nueva).** `.filtros-bar` es `flex-nowrap` + `overflow-x: auto` + `scrollbar-width: none`: **medido, 792px de contenido dentro de 356px visibles**, el 55% de las categorías del mes fuera de vista, y en móvil no se dibuja ninguna barra. La única pista era el cuarto chip cortado, en la única herramienta de análisis de la sección. Pasa a `flex-wrap` junto con los chips de gasto frecuente del formulario, y los chips de filtro suben de 27,7px a **44px reales** (regla R4: su recuadro no lo fijó ninguna decisión). **Medido después: cero px ocultos.** El precio, honesto: con 11 chips la barra ocupa 168px de alto. Acotado a `#panel-filtros-gastos`: la clase base la comparten Movimientos y el asistente de distribución, que no son de esta tarea.
- **G4 el total del mes deja de anunciarse como un filtro.** `#panel-filtros-gastos` llevaba `role="group"` + `aria-label="Filtrar por categoría"` desde antes de GAS.1a, y desde entonces `renderFiltrosGastos()` pinta ahí el hero completo: un lector de pantalla anunciaba el monto del mes, la nav y el ojo como parte de un grupo de filtros, con la barra interna aportando un segundo grupo anidado de nombre casi igual. Se quitan role y aria-label del div: la barra ya trae los suyos.
- **G5 un verbo y un solo primario (regla R1).** La misma acción se llamaba "+ Nuevo gasto" en el encabezado, "Registrar" en la barra inferior (FAB del [ADR 024](DECISIONS/024-navegacion-registro-central.md)) y "+ Registrar gasto" en el vacío, donde además convivían **dos `.btn-primary`**. Un solo verbo, "Registrar gasto", y el CTA del vacío baja a `.btn-secondary`. El `aria-label` del encabezado sale: con el texto visible ya descriptivo, "Registrar nuevo gasto" solo introducía una discrepancia con SC 2.5.3.
- **G6 zona táctil de 44px sin tocar el dibujo (regla R4).** El ojo y los botones "‹ ›" miden 40px, que **sí es decisión documentada** ([ADR 034](DECISIONS/034-inicio-v2.md) D3 y el comentario del propio bloque CSS). Entran a la lista de `::after` centrados que `responsive.css` ya mantenía para los controles de Inicio, en vez de escribir un patrón paralelo. **Medido: dibujo 40x40, zona sensible 44x44.**
- **G7 el mes siguiente se agota (hallazgo H8).** `navegarMesGastos()` no tenía tope: "›" llevaba a septiembre, a diciembre y a 2029, y ahí el vacío ofrecía "+ Registrar gasto", que abre el formulario con la fecha de **hoy**: el gasto se guardaba en el mes corriente y desaparecía de la pantalla que lo pidió, sin ningún aviso. Ahora `_mesTope()` (mes corriente, o el del gasto más reciente si es posterior) deshabilita "›" con `disabled` + `aria-disabled`, y en un mes que no es el corriente el vacío cambia de texto y de acción: "No registraste gastos en mayo" + "Volver a julio" (acción nueva `gastos-mes-actual`).
- **G8 el usuario nuevo no ve tres veces el mismo vacío (hallazgo H9).** Con cero gastos la pantalla apilaba banner de propósito + hero de "$0" + card de vacío. El hero de $0 no aportaba ningún dato: 210px para repetir lo que la card dice mejor. Se omite solo cuando `S.gastos` está vacío; con historial se queda aunque el mes visible esté en cero, porque ahí $0 sí es un dato. **Medido: la sección pasa de ~719px a 509px.** El banner de propósito no se toca ([ADR 016](DECISIONS/016-sistema-de-guia.md)).
- **G9 el formulario vuelve a abrir con el monto (regla R11, nueva).** El [ADR 042](DECISIONS/042-formularios-v2-visual.md) D2 fija el monto como primer campo y así se implementó en FORM.1a; TX.12 insertó los chips de gasto frecuente **antes** de ese bloque, así que lo primero de la hoja pasó a ser una fila de chips con scroll. Era una desviación silenciosa de una decisión vigente, no una decisión nueva. Los chips bajan debajo del monto y el label pasa a "O repite un gasto frecuente": el atajo sigue arriba del pliegue (a 190,5px) y se lee como lo que es.
- **G10 se borra un estado inalcanzable.** `_renderEmptyFiltro()` ("Nada acá este mes") necesitaba gastos en el mes y un filtro sin resultados, pero `renderFiltrosGastos()` resetea el filtro a "Todos" si la categoría desapareció y corre **antes** de `renderListaGastos()` en los 8 call-sites. Se borra la función, su rama y el test que la forzaba (borrado confirmado por Esteban). Su CSS no queda huérfano: la teja neutra y `#i-search` los reusa el vacío de mes pasado de G7.
- **`DESIGN_SYSTEM.md` recibe R9, R10 y R11.** R9 en Chips, R10 en Principios (es transversal: cualquier pantalla con navegación de periodo), R11 en Inputs, más el corolario de R4 que separa "el recuadro lo fijó una decisión" (crece el `::after`) de "no lo fijó nadie" (crece el control). Las otras tres reglas del informe **no entran**: "el monto no baja de renglón" ya es **R19** (Me deben), "un verbo y un primario" ya es **R1** + la regla de uso de botones, y la zona táctil del chip es el corolario de R4, no una regla nueva.
- 8 tests unitarios nuevos en `gastos.test.js` (label del mes navegado, hero ausente sin historial, tope de "›" en tres escenarios, vacío de mes pasado, CTA secundario, orden del formulario) y 1 E2E ajustado. **3055/3055 unit + lint verdes**; E2E `smoke` 156/156, `a11y-forms`, `navegacion-render` y `reflow-320` verdes (173/173 en el pase). Verificado en el navegador a 390px y a 320px, tema oscuro, con 16 gastos en 10 categorías: sin overflow horizontal, sin errores de consola, y las mediciones de arriba tomadas en vivo. SW v419 → v420.

**Fuera de alcance, y por qué.** **V1** (hallazgo H7: "Gastos hormiga" nombra a la vez una categoría del catálogo y el patrón que calcula `detectarHormigas()`, y en el caso límite el insight se lee "Gastos hormiga: Gastos hormiga") revisa el copy que fijó el [ADR 039](DECISIONS/039-gastos-v2-visual.md) D4 y propone además darle una acción al bloque: no se toca sin la palabra de Esteban (regla 2.7). Renombrar la categoría es territorio de **CAT.***. **V2** (hallazgo H11: el formulario mide 1.279px dentro de una hoja de 776px, y la grilla de 14 chips de categoría se lleva 385px) revisa el [ADR 042](DECISIONS/042-formularios-v2-visual.md) D3; el propio informe recomienda dejarla, porque G9 ya devuelve el monto y el atajo arriba del pliegue. **V3** (mostrar la cuenta en el subtítulo de la fila) es dato nuevo en pantalla. **V4** (cuántas acciones lleva la fila) se revisa en **EDIT.1**, ya en el tablero. Y el mismo defecto de G3 sigue vivo en **Movimientos** y en el **asistente de distribución**, que comparten `.filtros-bar`: se señala, no se toca. La auditoría tampoco revisó escritorio, tablet ni tema claro.

### fix(me-deben): DIS.3, 11 correcciones de la auditoria de diseno sobre Me deben · 2026-07-26

Auditoría de diseño de la sección Me deben a 390px, tema oscuro (12 hallazgos, M1 a M12). Se aplican las 11 correcciones que no dependen de otra sección. Ficha: [`contexto/me-deben.md`](contexto/me-deben.md). `personales/logic.js` y el schema no se tocan en toda la tarea.

- **M2 el monto ancla es lo vigente (regla R19, nueva).** La columna `__meta` mostraba `prestamo.monto`, el capital original, mientras el pendiente (lo único que cambia y lo único que decide) vivía en el subtítulo a 12px gris: en un préstamo de $1.200.000 con $400.000 abonados, la cifra grande decía $1.200.000 y lo que falta, $859.067, era el texto más pequeño de la tarjeta. `atoms.css` documenta ese monto como "el ancla para encontrar cuánto de un vistazo": anclaba la cifra equivocada. Ahora el meta es el pendiente y el histórico acompaña debajo en `.personal-item__de` ("de $1.200.000"), **solo cuando hay abonos** que expliquen la diferencia. El subtítulo se queda únicamente con el desglose capital + interés de los préstamos con tasa: en los simples repetía la cifra del meta. El liquidado conserva su monto original, que es su cifra final.
- **M2 y M8, la fila a 390px (bloque C2).** La grilla genérica de `responsive.css` daba el primer renglón a las acciones y mandaba el monto a la segunda fila: **medido antes**, los dos botones se quedaban con 146,9px, el cuerpo con 111,8px (hasta "Camilo Restrepo" partía en dos líneas) y el monto terminaba a 327,3px del tope de una tarjeta de 370,1px. Reglas nuevas scoped a `.personales-lista`: monto arriba a la derecha, acciones en su propio renglón con el CTA a la izquierda y el destructivo al extremo opuesto. **Medido después: cuerpo 175px, monto a 16,8px del tope, tarjeta 305px.** "Me pagaron" pierde `btn-sm` y llega a 44px (regla R4), como el botón de eliminar.
- **M3 el chip de estado en su propia línea (regla R22, nueva).** El chip vivía DENTRO del `<p>` del título con `white-space: nowrap`: en la columna de 111,8px, "La fecha de pago pasó hace 3 semanas" medía 252,5px y cruzaba 74,5px por debajo de "Me pagaron", que se pinta después y lo tapaba. El estado más urgente producía el label más largo, así que cuanto peor la noticia, menos se leía. Baja a `.personal-item__estado` con permiso de partir en dos. Acortar el copy es territorio de PE.6d ([ADR 047](DECISIONS/047-me-deben-v2-intereses-e-historial.md) D6) y no se toca acá.
- **M1 `.personales-lista` existía en el HTML y en ninguna hoja.** Las seis tarjetas iban borde contra borde (0px medidos) y los bordes de 1px formaban una costura doble. Se declara con el mismo patrón y valor que su hermana `.inversion-lista`: flex columna con `--fk-space-3`.
- **M4 el resumen deja de ser una torre.** `auto-fit` con `minmax(180px, 1fr)` resolvía a UNA columna a 390px y los cuatro stats apilados medían 370px, el 47% del alto útil, con el primer préstamo naciendo a 470,8px. Dos columnas fijas (178px cada una), y el modificador `--primary`, que pintaba **exactamente el mismo color** que un stat normal, por fin enfatiza: "Pendiente" pasa a primero y a `--fk-text-2xl`. **Medido después: resumen 224,1px y el primer préstamo a 324,1px.**
- **M5 el ojo de privacidad cubre la sección (regla R20, nueva).** `S.config.ocultarSaldo` es "un solo control de privacidad en toda la app" (IN.2 y los ADRs 035 a 039) y lo leían Inicio, Gastos, Deudas, Calendario, Mis cuentas y Análisis; `personales/view.js` no lo consultaba. Era justo la lista que más incomoda mostrar: cuánto te debe la tía, el primo, el amigo, con nombre propio. Ahora resumen con `SALDO_MASCARA`, montos por fila y cifras de los hints con `SALDO_MASCARA_CUENTA`. Las barras de progreso se conservan: muestran proporción, no magnitud (criterio del hero de Calendario, CAL.4a). Verificado en la app: con el ojo activo no queda ni un dígito de pesos en la sección.
- **M6 el foco ya no muere en el body (regla R13).** Los tres flujos hacían `cerrarModal()` y después `renderListaPersonales()`: `releaseFocus()` devolvía el foco al botón que abrió el modal y el re-render lo destruía. Con teclado, registrar un pago obligaba a tabular desde el principio de la página. Helper `_enfocarTrasRender(id)`: al guardar y al cobrar el foco va a la tarjeta (`article[data-id]` con `tabindex="-1"`), al eliminar a `#sec-personales`. El `announce()` que ya existía en los tres flujos no cambia.
- **M10 lo terminado no compite (regla R21, nueva).** La lista ordenaba por fecha del préstamo sin separar liquidados, así que un préstamo cobrado, que no pide ninguna acción salvo borrar, se sentaba encima de uno activo por ser más viejo. Activos primero, liquidados al final, con el mismo `ordenarPersonales` dentro de cada grupo: el corte es un `filter` de la vista, `logic.js` no cambia.
- **M7 y M11, dos correcciones de contenido.** El vacío mostraba dos primarios verdes con dos nombres para el mismo modal ("+ Préstamo" en el encabezado, "+ Agregar préstamo" en el vacío): el CTA del vacío baja a `btn-secondary` y ambos dicen "+ Agregar préstamo". Y la barra de cada fila decía "% pagado" (la perspectiva del deudor) mientras el resumen decía "% cobrado": la sección se llama Me deben, la voz es la del que cobra.
- **M9 el formulario pregunta primero lo esencial.** El orden ponía la tasa de interés (opcional, el caso raro) como tercer campo, antes de la fecha y la cuenta, con un hint de dos líneas: el caso mayoritario pagaba el peaje del avanzado. Pasa a [persona · monto · fecha · cuenta] y después [tasa · motivo · fecha pactada], con el hint de la tasa en una línea. **Medido: el selector de cuenta completo termina a 540,8px dentro de una hoja de 776,6px**, así que lo esencial queda a la vista al abrir.
- **`DESIGN_SYSTEM.md` recibe R19 a R22.** R19 y R21 en List Items, R22 en Chips, R20 en Principios de diseño (es transversal por definición: "toda vista que pinte montos").
- 20 tests unitarios nuevos en `personales.test.js`. **3048/3048 unit + lint verdes**; E2E `smoke` 156/156, `reflow-320`, `a11y-forms` y `navegacion-render` verdes (173/173 en el pase). Verificado en el navegador a 390px y a 320px, tema oscuro, con los 6 préstamos de los datos de la auditoría: sin overflow horizontal, sin solape chip/botón, botones a 44px, foco medido en los tres flujos. SW v418 → v419.

**Fuera de alcance, y por qué.** **C5** (`.modal__intro` se emite en Me deben y en Metas y no existe en ninguna hoja: hereda 16px secundario por accidente) queda sin aplicar porque declararla cambia también el formulario de Metas, y esta tarea se limitó a Me deben; el defecto sigue anotado en la ficha. **V2** (colapsar los opcionales del form bajo "Más detalles" para subir el botón Guardar, que sigue bajo el borde de la hoja) es una pauta nueva de formulario y se decide en **CAT.4**, la pasada transversal. **V3** (acortar el copy de `labelEstado()`, ej. "Venció hace 3 semanas") toca `logic.js` y el tono del [ADR 003](DECISIONS/003-tono-neutral-profesional.md): se difiere a **PE.6d**, que va a rediseñar los estados de un vistazo, para no abrir dos veces el mismo código. **V1** (un ojo local dentro de la sección) se descarta: el ojo vive en los heros y Me deben no tiene hero; el flag global ya la cubre. La auditoría tampoco revisó escritorio, tablet ni tema claro.

### fix(deudas): DIS.2, 8 correcciones de la auditoria de diseno sobre Deudas · 2026-07-25

Auditoría de diseño de la sección Deudas a 390px, tema oscuro (10 hallazgos, D1 a D10). Se aplican las 7 correcciones listas (FD1 a FD7) más D9. Ficha: [`contexto/deudas.md`](contexto/deudas.md).

- **FD1 estado terminal (regla R7, nueva).** `_renderCompromisoItem` calculaba el chip de urgencia **antes** de saber si la deuda estaba saldada: pagar la última cuota se recibía con "Saldada" en verde y "Vence hoy" en rojo a dos centímetros, en el momento más importante de la sección. El chip solo se emite con saldo pendiente, y el subtítulo pasa de "Cuota $65.900/mes · día 25" (también futuro) a **"Saldada el 22 de julio"**. La fecha sale del último abono (`fechaUltimoAbono` nueva en `logic/abonos.js`), porque un abono es un `Gasto` con `compromisoId` ([ADR 002](DECISIONS/002-abono-deudas.md)) y **no hay campo `fechaSaldado` en el schema, ni hace falta**. Si la deuda llegó a cero sin abonos (saldo editado a mano), dice "Sin saldo pendiente" en vez de inventar un día.
- **FD3 legibilidad (regla R2).** El chip de vencimiento vivía **dentro** del párrafo del nombre, en una columna de 166px: "Tarjeta Visa Bancolombia" ocupaba dos líneas y el chip caía en una tercera. Baja a `.deuda-card__chips`, en primera posición, que es donde el usuario ya busca metadatos. **Medido a 390px: el bloque del nombre pasa de 62px a 36px.** Contrapartida honesta: la fila de chips pasa a dos líneas, así que la tarjeta no se acorta; lo que mejora es la legibilidad del nombre, que es el dato con el que se decide a qué deuda abonar.
- **FD5 jerarquía de acción (regla R8, nueva).** Dos primarios verdes convivían en pantalla: "+ Nueva deuda" (136px) y "Aplicar este aumento" (289px). El [ADR 036](DECISIONS/036-deudas-v2-visual.md) D6 ya había sacado el verde de Abonar porque "un abono es un pago, no un ingreso", pero los tres confirmadores del simulador quedaron fuera de ese criterio. Ahora los tres usan `.estrategia-card__aplicar`, **receta calcada de `.deuda-card__abonar`** (frambuesa 12 %, borde 40 %, texto `--fk-dom-compromisos-text`), así que Deudas tiene un solo vestido de confirmación y un solo verde visible.
- **FD7 el hero cuadra con la lista.** `resumenDeudas()` cuenta todas las deudas activas, saldadas incluidas, mientras la cifra grande solo suma lo que se debe: con una deuda recién pagada el hero decía "en 4 deudas" sobre un total que ignoraba a una de ellas. Ahora devuelve `saldadas` aparte y el texto lo explica: **"en 3 deudas por pagar · 1 saldada"**. Con todas saldadas dice "sin deudas por pagar", no "en 0 deudas". La cifra grande no cambia.
- **FD6 un verbo, un botón.** El encabezado decía "+ Nueva deuda" y el estado vacío "+ Agregar deuda", y sin deudas se veían los dos: dos primarios verdes con dos etiquetas para el mismo modal, en el primer minuto del usuario nuevo. Un solo verbo, y `renderListaCompromisos()` oculta el del encabezado cuando la lista está vacía porque el estado vacío ya conduce.
- **FD2 y FD4, dos correcciones chicas.** Archivar imprimía el carácter `✓` dentro de un `.btn-icon`, el único control de la app dibujado con texto: pasa a `#i-check-circle` del sprite ([ADR 023](DECISIONS/023-lenguaje-de-iconografia.md)). Y `.deuda-card__abonar` medía 38px mientras editar y eliminar, que sí son `.btn`, ya cumplían 44: la acción más repetida de la tarjeta era la única fuera de la regla R4.
- **D9 identidad estable (regla R1).** Con una deuda el título era "Estrategia de pago" y sin eyebrow; con dos o más, eyebrow "Estrategia de pago" + título "¿Cómo salir más rápido?". El mismo componente se presentaba con dos identidades según los datos. Ahora el encabezado es uno solo y lo que cambia es el cuerpo.
- **`DESIGN_SYSTEM.md` recibe R7 (estado terminal) y R8 (una acción principal).** R8 queda escrita con su alcance real: aplicada en Deudas, generalizarla a toda la app es una decisión abierta.
- Verificado en el navegador a 390px, tema oscuro, con 3 deudas activas + 1 saldada: hero, subtítulo fechado, chips, alturas de 44px y color de los tres "Aplicar" medidos en vivo, sin errores de consola. 3028/3028 unit (25 nuevos) + lint + E2E `estrategia-pago` 21/21, `smoke` 156/156, `a11y-forms` 6/6, `reflow-320` y `navegacion-render` verdes. SW v417 → v418.

**Fuera de alcance, y por qué.** **VD1** (plegar el detalle del plan, hallazgo D2: la lista empieza a 1.719px del tope, 2,04 pantallas) revisa la jerarquía del [ADR 011](DECISIONS/011-estrategia-pago-deudas.md) rev D.7 y roza la decisión de D.15d-2 de tener las palancas siempre visibles: no se implementa sin la palabra de Esteban (regla 2.7). **D10** (el CSS muerto de `.estrategia-card__acelerador`) cuelga de esa misma decisión: si VD1 se aprueba ese CSS vuelve a tener dueño, si no, se borra. La auditoría tampoco revisó escritorio, tablet ni tema claro.

### fix(inicio): V1, el acento de marca deja de medir el gasto semanal · 2026-07-25

Última pieza abierta de la auditoría de diseño de Inicio (hallazgo H7, variante V1), decidida por Esteban. Ficha: [`contexto/inicio.md`](contexto/inicio.md).

- **V1 color.** El mini gráfico de "Resumen de la semana" pintaba el día de **mayor gasto** con `--fk-accent` y su etiqueta con `--fk-text-accent`, mientras el principio 7 reserva el esmeralda para dinero disponible, progreso y éxito: el pico se leía con el color del logro, dentro de la misma tarjeta que ya usa verde para celebrar la bajada. Pasa a familia Gastos (barras 28%, pico 100%, etiqueta en `--fk-dom-gastos-text`). El chip "12% menos" **no** cambia: bajar el gasto sí es logro (ADR 019).
- **Por qué la variante `-text` y no el token crudo:** en tema claro `--fk-dom-gastos-text` baja a `#d13b00` (4.84:1 sobre blanco) mientras `--fk-dom-gastos` se queda en `#ff8a5c`, que no pasa AA como texto. Verificado en el navegador en ambos temas.
- **Revisa el [ADR 034](DECISIONS/034-inicio-v2.md) D6**, que fijaba el acento explícitamente, así que queda formalizado en el [ADR 054](DECISIONS/054-el-acento-no-mide-gasto.md) en vez de corregirse en silencio (regla 2.7).
- **`DESIGN_SYSTEM.md` recibe las 6 reglas repetibles** que la auditoría dejó escritas y que vivían solo en el informe: R1 encabezado único de card, R2 fila de obligación en 2 líneas, R3 fondo y glifo nunca del mismo tono, R4 los 44px táctiles aplican a todo control, R5 panel sin scroll propio, R6 el acento no mide gasto. Más la regla de radios del hallazgo H12 (xl protagonista, lg secundario), que documenta la diferencia hero/paneles en vez de cambiar píxeles.
- Solo CSS y documentación: ningún `logic.js`, ningún dato, ningún schema. 3007/3007 unit verdes. SW v416 → v417.

### fix(ajustes): CFG.6, 11 correcciones de la auditoria de diseno sobre Ajustes · 2026-07-25

Auditoría de diseño de la sección Ajustes (13 hallazgos, B1 a B13). Se aplican los 11 que no dependen de otra sección. Ficha: [`contexto/configuracion.md`](contexto/configuracion.md).

- **B1 estructura.** El panel era una pila plana de diez tarjetas idénticas: 3.810px de `#panel-config` y 4.577px de página a 390px, con el interruptor de tema a 1.580px del tope, después de tres formularios fiscales opcionales. Pasa a cinco grupos rotulados (La app · Tu cuenta · Tus datos · Impuestos · Información) con el orden invertido por frecuencia de uso. **Medido después: panel 2.357px (-38%), tema a 114px.** El rótulo copia la receta de `.mas-sheet__group-label`, el patrón que la hoja "Más" ya usa.
- **B2 jerarquía de botón.** Cinco `.btn-primary` visibles a la vez. Instalar y Activar recordatorios pasan a secundario (son ofertas), y con los dos formularios fiscales plegados en un `<details>` nativo queda **uno solo** en reposo.
- **B12 confirmación.** Los tres `submit` guardaban, repintaban el panel entero y terminaban en `announce()`, que es `sr-only`: para el usuario vidente no pasaba nada y encima volvía al tope de la sección. Ahora encienden un `.chip-success` "Guardado" unos segundos y no re-renderizan: los campos ya muestran lo que se guardó. Foco y scroll intactos.
- **B5 accesibilidad.** El importador era un `<label class="btn">` con un `<input type="file" class="sr-only" aria-hidden="true">` que **sí recibía foco** (regla axe `aria-hidden-focus`). Pasa a un `<button>` real que dispara un `<input type="file" hidden>`. Verificado: el foco ya no aterriza ahí.
- **B8 táctil.** El checkbox del perfil fiscal declaraba 18x18 y medía 14x18 (item flex sin `flex-shrink: 0` con etiquetas largas), y la fila 42px contra el piso de 44. Corregido y **acotado a `#panel-config`**: la regla base vive en `forms.css` y la comparten cinco vistas que esta tarea no toca.
- **B4 captura de pesos.** Los tres campos de renta eran `type="number"` pelados: un ingreso anual se escribía `72000000` y un cero de más no se detecta a simple vista. Pasan a `type="text" inputmode="numeric"` con separador de miles al escribir (`miles()` / `desdeMiles()` en `config/view.js`, único par que formatea y lee esos campos).
- **B6 ámbito.** Cuatro botones de 197 a 207px que solo se distinguían por una palabra, dos de ellos capaces de reemplazar TODO el estado. Van en dos pares rotulados ("Toda la app" / "Solo tus gastos") a ancho completo, con verbos que dicen la consecuencia: "Restaurar desde un respaldo" en vez de "Importar datos (JSON)".
- **B7 instrucción situada.** Con el permiso en `denied` la app mandaba al candado de la barra de direcciones, que en una PWA instalada no existe. Se ramifica con `estaInstalada()`, la misma señal que ya decide si se ofrece instalar, y el callejón sin salida gana una salida a Calendario.
- **B9 Centro Legal.** Diez documentos con el mismo peso. Términos y Privacidad quedan sueltos (campo `destacado` en `legal.js`), los otros ocho a un toque. La marca de borrador viaja con el documento (`VERSION_LEGAL` como chip en la cabecera del modal) en vez de quedarse en una lista que el usuario ya dejó atrás. El contenido de los `.md` no se toca: LEG.2 sigue bloqueada por revisión de abogado.
- **B10 "Acerca de".** "Vanilla JS · Sin framework · Offline-first" y "localStorage" no le dicen nada a la persona para la que se hizo Finko. La fila de tecnología sale y la promesa de privacidad abre la lista, con su consecuencia práctica al lado: por eso el respaldo depende de ti.
- **B13 sistema visual.** `#sec-config` era la única de doce secciones sin teja en el encabezado y la única con emoji en los títulos de contenido. Gana `.section__title-group` + `.cat-teja` con `#i-ajustes`, y salen los diez emoji de `<h2>` y los seis de botones. Los de `.nudge` y los de logros no se tocan: son otro patrón y otro dominio.

**Fuera de alcance, y por qué.** B11 (la vitrina de Logros vive dentro del centro de configuración, a 3.878px del tope) se señala y no se mueve: sacarla toca navegación (ADR 022, iniciativa NAV2). Quedan también sin aplicar V2 (autoguardado), V3 (buscador de ajustes) y V4 (migrar a sprite los emoji de nudges y logros de toda la app): las tres son decisiones, no correcciones. Las reglas R13 a R18 del informe no entran a `DESIGN_SYSTEM.md` en esta pasada, igual que R1 a R12 de las auditorías anteriores.

21 tests unitarios nuevos en `config.test.js`, 4 E2E ajustados en `smoke.test.js`. 3007/3007 unit + 231/231 E2E + lint verdes. SW v415 → v416.

### docs(reorg): Fases 1 y 2 de la reorganización documental · 2026-07-24

Auditoría documental completa de los 89 archivos `.md` con 7 subagentes (pedido explícito de Esteban), consolidada en una propuesta que él aprobó con 8 ajustes. Diagnóstico raíz, al que llegaron por caminos independientes 4 de los 7 agentes: **la historia de cada tarea se escribía 4 veces** (CHANGELOG, HANDOFF, ficha y tablero) con detalle que no decrecía de capa en capa, y **ningún archivo vivo tenía techo**. Arrancar una tarea costaba ~69.400 tokens antes de abrir el primer archivo de código.

- **Contrato de migración** en `docs/MIGRACION.md` (temporal, se borra al cerrar la Fase 5): arquitectura final, 11 principios con techos verificables por comando, trazabilidad de los 89 archivos (destino, acción, motivo) y plan de 5 fases.
- **Decisiones de Esteban que cambiaron la propuesta original:** BUGS.md y CONTRIBUTING.md siguen separados; CHANGELOG conserva nombre y mecanismo (cae la carpeta `historia/`, se conserva `archive/`); **el renombrado masivo al español se descarta** tras medir su costo (renombrar `BOARD.md` implicaba 56 referencias vivas y 113 enlaces muertos en historia que por principio no se reescribe); la escala de modelos pasa a hablar de capacidad y no de versiones.
- **Tablero purgado: 150.879 → 102.239 bytes (-32,2 %)**, 751 → 619 líneas, con las 49 tarjetas vivas verificadas una por una. Los 61 IDs cerrados que salieron se comprobaron antes con `grep` contra CHANGELOG y fichas: todos tenían destino.
- **`AGENTS.md` a stub trackeado.** Era una copia de CLAUDE.md con 18 días de atraso; el diff previo dio 20 líneas distintas de ~290, casi todas por el bloque de matriz que le faltaba. Se commiteó intacto antes de reducirlo, así que la reducción es reversible.
- **`CLAUDE_DESIGNS_PROMPT.md` archivado** en `docs/archive/` con nota de archivado, no eliminado (decisión de Esteban): conserva valor como exploración de diseño.
- **Correcciones de veracidad:** "cero deuda técnica" convivía con 2 bugs abiertos; el árbol de dominios listaba `calculadoras` (retirada) y omitía `accesos`; ARCHITECTURE decía 18 dominios y listaba 16; su tabla del EventBus tenía 5 de los 9 eventos reales; CONTRIBUTING citaba el evento `ui:navigate`, que no existe; el ADR 002 seguía en "Propuesta" con la feature implementada hace meses; rutas muertas `Desktop/Finko_Claude` en SECURITY y README.
- **La sección 7 de CLAUDE.md era inverificable** y se arregló: su tabla decía "en vez de guion simple usa guion simple" (se rompió al aplicarse a sí misma), y su comando de verificación no podía pasar nunca. El reemplazo se probó contra un archivo de control con U+2014 y U+2013.
- **Cifra de E2E verificada ejecutando la suite:** 231 passed, exit 0. El total de HANDOFF era correcto; lo que no cuadraba era su desglose por suite, que sumaba 227. Se retira el desglose en vez de mantener 11 números a mano.

**Archivos tocados**

- `docs/MIGRACION.md`: nuevo, contrato de la migración.
- `docs/BOARD.md`: purga de narrativa cerrada + tabla de secciones sin pendientes + tarjeta DOC.1.
- `AGENTS.md`: 285 → 5 líneas. `docs/archive/CLAUDE_DESIGNS_PROMPT.md`: movido y trackeado.
- `CLAUDE.md`: sección 7 reescrita. `docs/HANDOFF.md`, `docs/BUGS.md`, `docs/ARCHITECTURE.md`, `docs/CONTRIBUTING.md`, `docs/SECURITY.md`, `README.md`, `docs/DECISIONS/002-abono-deudas.md`: correcciones de veracidad.
- `.claude/skills/auditor-finko/SKILL.md`: trackeado por primera vez.

Sin impacto en código, tests ni datos: ningún archivo de `modules/` fue tocado. Verificación: 231/231 E2E verdes, cero enlaces `.md` rotos, cero U+2014 y U+2013 en archivos trackeados. Fases 3 a 5 pendientes en la tarjeta **DOC.1** del tablero.

---

### docs(workflow): matriz de decisión de modelo integrada en §2.3 · 2026-07-23

El usuario propuso un "Selector inteligente de modelo y nivel de esfuerzo" con matriz de puntuación (0-55) y modo "Ultracode" multiagente. Triaje (regla 2.7): pisaba la decisión ya existente de `CLAUDE.md` §2.3, así que se fusionó en vez de duplicar (fuente única). Se reconciliaron los conflictos con las restricciones reales del proyecto y del CLI.

- **Matriz de desempate** (11 criterios × 5 = 55) agregada a §2.3, con umbrales mapeados a las combinaciones válidas ya vigentes. Se usa **solo en tareas no triviales o ambiguas**; el bloque `Próximo paso` liviano sigue siendo el default (evita el overhead de puntuar 11 criterios en cada respuesta).
- **Conflictos resueltos:** `Max` sigue reservado a Fable 5 (la propuesta lo daba también a Opus). "Ultracode" no existe como modo nativo del CLI: se traduce a reparto en **subagentes** (tool `Agent`), y solo cuando Paralelización ≥ 4, Agentes ≥ 4 y el usuario lo pide de forma explícita.
- **Restricción real documentada:** el modelo del turno lo fija el usuario al lanzar; el asistente no se auto-cambia de modelo a mitad de respuesta. La matriz alimenta la recomendación del `Próximo paso`, la modulación de esfuerzo dentro del turno y la elección de modelo por subagente.

**Archivos tocados**

- `CLAUDE.md`: nueva subsección "Matriz de decisión" dentro de §2.3; fecha de revisión 2026-07-05 → 2026-07-23.
- `docs/CHANGELOG.md`: esta entrada.

Sin impacto en código ni tests (cambio de protocolo de trabajo). Verificación: cero em dash en el texto nuevo (regla §7.1).

---

### feat(metas): EDIT.1a editar sin destruir el progreso · 2026-07-23

Primera de cuatro rebanadas del patrón **P3** de la auditoría de UX/producto (no se puede editar, corregir obliga a destruir). Metas solo permitía crear, abonar y eliminar: corregir un nombre mal escrito o un objetivo obligaba a eliminar y recrear la meta, perdiendo el progreso acumulado en el camino. Apartados, Inversión y Me deben quedan como las tres rebanadas siguientes en **EDIT.1**.

- **Botón "Editar" en cada fila**, junto a Abonar/Eliminar, que abre el mismo formulario de "Nueva meta" prellenado con nombre, monto objetivo, fecha límite y categoría (incluido el ícono si la categoría es "Otra").
- **El punto financiero: `montoActual` se conserva tal cual.** `normalizarMeta(datos, metaExistente = null)` es la única función que construye el shape completo de una meta; con `metaExistente` conserva el histórico de aportes intacto y recalcula `completada` contra el nuevo objetivo, porque cambiar el objetivo puede cruzar el umbral de cumplimiento en cualquier dirección con el mismo monto ya aportado (bajar el objetivo por debajo de lo aportado completa la meta; subirlo por encima la reabre).
- **Refactor de mantenimiento incluido**: el formulario dejó de ser un singleton reusado entre aperturas (que necesitaba resetear el picker de ícono a mano) y pasó a reinyectarse completo en cada apertura, el mismo patrón que ya usan Gastos, Agenda y Compromisos. Simplifica el código y es lo que permite prellenar una meta existente sin arrastrar estado de la apertura anterior.
- **Ficha de contexto nueva `docs/contexto/metas.md`** (la sección no tenía ninguna, primera vez que se analiza a fondo, regla 2.6).

**Archivos tocados**

- `modules/dominio/metas/logic.js`: `normalizarMeta()` gana el parámetro opcional `metaExistente`.
- `modules/dominio/metas/view.js`: `renderFormMeta()` gana el parámetro opcional `meta`; botón "Editar" en `_renderMetaItem()`.
- `modules/dominio/metas/index.js`: `_inyectarFormMeta()` (reemplaza al singleton `_inyectarForm()`), `_editarMeta()` nuevo; `_guardarMeta()` ramifica crear/editar.
- `tests/unit/metas.test.js`: 16 tests nuevos.
- `tests/e2e/smoke.test.js`: 4 tests nuevos.
- `service-worker.js`: `CACHE_NAME` v414 → v415.
- `docs/contexto/metas.md` (nueva), `docs/contexto/README.md`, `docs/BOARD.md`, `docs/HANDOFF.md`.

**Verificación.** 2981/2981 unit + 231/231 E2E + lint verdes. Verificado con la suite E2E en Chromium real: prefill correcto de los 4 campos, edición conserva un abono ya registrado ($500.000 de $3.000.000 intactos tras corregir solo el nombre, saldo de cuenta sin tocar), bajar el objetivo por debajo de lo aportado completa la meta y la saca de la lista activa, y la categoría/ícono sobreviven la edición.

---

### feat(gastos): TX.12 gastos frecuentes y "Repetir" · 2026-07-23

Segunda pieza del patrón **P2** de la auditoría de UX/producto (la primera fue CAL.5a, el mismo día). El gasto cotidiano (almuerzo, café, Uber) es el registro más repetido de la app y se tecleaba entero cada vez: categoría, monto, cuenta. Dos entradas al mismo problema, sin dato nuevo ni schema (mismo patrón que AP.5a/AH.5a: puro reuso del historial ya registrado).

- **Chips de un toque en "Nuevo gasto".** `gastosFrecuentes()` (nuevo, `gastos/logic.js`, pura) agrupa `S.gastos` por categoría + monto redondeado a $1.000 + descripción normalizada, y devuelve los grupos que se repiten 3 o más veces en los últimos 60 días. Solo aparecen al **crear** (nunca al editar: repetir un patrón no tiene sentido corrigiendo un registro puntual). Un click prellena monto, categoría y la cuenta más reciente usada para ese patrón, y deja el foco en "Guardar": el usuario solo confirma.
- **"Repetir" en cada fila de la lista.** Abre el modal en modo creación (nunca edición) con los datos de esa fila exacta, incluida su nota, fechado con **hoy** (no la fecha del original: es un registro nuevo). Sin chips de frecuentes en este flujo: el usuario ya eligió qué repetir.
- **Excluye gastos con `compromisoId`** (pagos de un fijo del Calendario o abonos de deuda): esos los repite su propio dominio dueño (Agenda/Compromisos); ofrecerlos aquí invitaría a duplicar un pago que ya tiene su mecanismo.
- **Una sola función de prefill.** `_prellenarCamposGasto()` (`gastos/index.js`) la comparten el chip de frecuente y "Repetir" de fila, con una diferencia deliberada: el chip sintetiza una plantilla de varios registros (nota ambigua entre instancias, se omite); "Repetir" apunta a una fila concreta (la nota sí se copia, sin ambigüedad posible).

**Archivos tocados**

- `modules/dominio/gastos/logic.js`: `gastosFrecuentes()` nueva, pura.
- `modules/dominio/gastos/view.js`: `_renderChipsFrecuentes()` nueva; `renderFormGasto()` gana el parámetro `{ sugerencias }`; `_renderGastoItem()` suma el botón "Repetir".
- `modules/dominio/gastos/index.js`: `_prellenarCamposGasto()`, `_repetirFrecuente()`, `_repetirGasto()` nuevas; `_montarFormGasto()` reenvía `sugerencias`; `_editarGasto()` la pasa en `false`.
- `styles/components/domain.css`: `.gastos-frecuentes__*`.
- `tests/unit/gastos.test.js`: 23 tests nuevos.
- `tests/e2e/smoke.test.js`: 2 tests nuevos.
- `service-worker.js`: `CACHE_NAME` v413 → v414.
- `docs/contexto/gastos.md`, `docs/BOARD.md`, `docs/HANDOFF.md`.

**Verificación.** 2965/2965 unit + 227/227 E2E + lint verdes. Verificado además contra un caso real vía la suite E2E en Chromium: 3 repeticiones de "Mercado" ($15.000) disparan el chip, que al click y confirmar registra un 4° gasto y descuenta el saldo; "Repetir" sobre una fila de "Transporte" abre el modal titulado "Repetir gasto" sin chips de frecuentes, con monto/categoría/nota prellenados y la fecha de hoy (no la del original).

---

### feat(agenda): CAL.5a pagar en lote lo que ya venció · 2026-07-23

Primera pieza del patrón **P2** de la auditoría de UX/producto (trabajo manual uno por uno, sin lote). Pagar 6 gastos fijos eran ~30 toques: cada uno pedía la cuenta por separado. Ahora el Calendario ofrece registrarlos juntos **eligiendo la cuenta una sola vez**.

**Decisión de secuencia (regla 2.7).** La tarjeta estaba bloqueada esperando la palabra de Esteban sobre si el lote manual iba antes que **PA.1** (pagos automáticos). Al pedirla como tarea siguiente, esa es la decisión: el lote va primero. No revierte ningún ADR, y de hecho evita tener que tocar la filosofía "Finko refleja la realidad, no la inventa": acá el usuario sigue confirmando cada pago, solo deja de repetir la misma pregunta N veces. PA.1 conserva su tarjeta y ahora podrá llegar con evidencia real de uso.

**Rebanada `a` (regla 2.1).** Solo gastos **fijos**, y solo desde el Calendario. Las deudas se abonan contra su `saldoTotal` (aritmética distinta y de otro dominio) y el punto de entrada desde el bloque de vencidos de Inicio es otra pantalla: ambos quedan como **CAL.5b** en el BOARD.

- **Qué se ofrece pagar.** `pendientesDePagoDelMes()` (nuevo, `agenda/logic.js`, puro): fijos del mes visible, con monto positivo y sin gasto vinculado ese mes. Aplica la **misma regla temporal que el botón individual** (BUG-015), para que el lote no pueda registrar nada que "Marcar pagado" no registraría: mes en curso solo hasta hoy inclusive, mes pasado todo (ya venció), mes futuro nada. Un fijo quincenal aparece **una sola vez**: el estado de pago de un fijo es por mes y no por ocurrencia, así que listarlo dos veces sería un doble cobro.
- **Dónde aparece.** Tarjeta bajo el hero del mes, **solo con dos o más pendientes**: con uno solo el CTA "Marcar pagado" del detalle del día ya lo resuelve y la tarjeta sería ruido compitiendo con el hero. El modal lista todo marcado (la tarjeta prometió "los N": desmarcar es la excepción) con el total en vivo.
- **El punto financiero: una cuenta para el grupo, un movimiento por compromiso.** La cuenta se resuelve con el mismo `resolverPagoConSelector` del pago individual (selector de tarjetas, reparto-fallback sin dejar negativos), y **`asignarSplitsPorItem()`** (nuevo en `infra/distribuir-pago.js`, puro) reparte esos splits entre los items consumiendo las cuentas en orden, con la elegida primero. Cada compromiso conserva así **su propio gasto vinculado**, que es lo que hace funcionar el badge "Ya pagaste este mes" y el progreso del hero; un item puede quedar a caballo entre dos cuentas y entonces genera dos gastos, exactamente como un pago individual repartido.
- **No agrega una cuarta copia de la aritmética de pago.** El BOARD advertía que CAL.5 escribiría una cuarta copia de "gasto vinculado + descuento de cuenta" (ARQ.2 punto 2). En vez de eso, `_registrarPagosFijos()` es la **única copia dentro de Agenda**, compartida por el pago individual y el lote: el proyecto sigue con tres, no cuatro, y la extracción cross-dominio sigue siendo ARQ.2 (las otras dos copias también mueven el `saldoTotal` de una deuda, así que unificarlas es otro trabajo). El descuento se acumula por cuenta y se aplica una sola vez, para no emitir N `state:change` por cuenta en un lote.
- **La fuente de verdad es `S`, no el DOM.** Al confirmar se releen los pendientes desde el estado y se intersectan con lo marcado: entre abrir el modal y confirmar, el usuario pudo pagar uno desde el detalle del día o eliminar el compromiso.

**Archivos tocados**

- `modules/dominio/agenda/logic.js`: `pendientesDePagoDelMes()` nueva, pura.
- `modules/dominio/agenda/view.js`: `_renderLoteCard()` y `renderFormPagoLote()` nuevas; `renderAgenda()` pinta la tarjeta bajo el hero.
- `modules/dominio/agenda/index.js`: `_pagarLote()`, `_actualizarTotalLote()`, `_confirmarLote()`, `_pendientesDelMes()` y `_registrarPagosFijos()` (esta última absorbe el final de `_marcarPagadoGastoFijo`, sin cambio de comportamiento).
- `modules/infra/distribuir-pago.js`: `asignarSplitsPorItem()` nueva, pura.
- `index.html`: modal `#modal-pago-lote`.
- `styles/components/config.css`: `.cal-lote*` (familia warning: ya venció, no es un error del usuario) y `.lote-*` del modal.
- `tests/unit/agenda.test.js`: 18 tests nuevos. `tests/unit/distribuir-pago.test.js`: 6 nuevos.
- `tests/e2e/smoke.test.js`: 2 tests nuevos (registrar el lote completo con una cuenta y ver bajar el saldo; desmarcar y ver recalcular).
- `service-worker.js`: `CACHE_NAME` v412 → v413.
- `docs/contexto/calendario.md`, `docs/BOARD.md`, `docs/HANDOFF.md`.

**Verificación.** 2942/2942 unit + 225/225 E2E + lint verdes. Verificado en la app real (4 gastos fijos, 2 cuentas): la tarjeta ofrece los 3 vencidos por $1.064.900; el reparto sale $900.000 de Bancolombia (que queda en 0) y $164.900 de Nequi ($300.000 → $135.100); los tres gastos quedan con su `compromisoId`; el hero pasa a "Pagado $1.064.900 / Falta $89.000" (el Gimnasio del 28 aún no vence, correcto); la tarjeta desaparece y el detalle del día 5 muestra "Ya pagaste este mes" sin CTA. El pago individual, refactorizado a la función compartida, sigue funcionando igual. Sin errores de consola.

---

### feat(movimientos): MOV.2 búsqueda y filtros en el ledger · 2026-07-22

Cierra por completo el patrón **P4** de la auditoría de UX/producto (junto con MOV.1, la mitad anterior de la misma iniciativa el mismo día). La vista completa de Movimientos no tenía búsqueda ni filtros: encontrar "ese pago de hace 4 meses" era scroll ciego, agravado porque PERF.1 pagina por lotes (lo viejo ni siquiera está en el DOM hasta pedirlo).

- **Búsqueda por texto.** Filtra contra la descripción visible de cada fila, incluida la de una transferencia ("Origen → Destino"), resuelta en vivo con los nombres actuales de cuenta. `descripcionMovimiento(m, cuentas)` se extrajo de `view.js` a `logic.js` (pura) para que la búsqueda y el render compartan exactamente el mismo texto, sin duplicar el join cuenta→nombre.
- **Chips por dominio, no por tipo.** La barra reusa el lenguaje `.filtros-bar`/`.chip`/`.chip--active` de Gastos, cero componente nuevo. La decisión de filtrar por `m.dominio` (Gastos, Deudas, Ingresos, Ahorro, Transferencias) en vez de `m.tipo` es a propósito: para las ACCIONES de MOV.1 enrutar por dominio era un bug (mandaba al handler equivocado), pero para un FILTRO es lo correcto, porque el usuario quiere poder aislar "solo lo de Deudas" de "solo gasto cotidiano", algo que `tipo` no distingue (ambos son `'gasto'`).
- **Rango de fechas** con dos `<input type="date">` (Desde/Hasta), inclusive en ambos extremos, comparando directamente los strings ISO (`m.fecha`).
- **Ojo de rendimiento respetado**: `filtrarMovimientos()` (puro, en `logic.js`) se aplica sobre la fuente ya derivada, ANTES de `_agruparPorMes`/paginar. Nunca sobre el DOM: con años de historial, PERF.1 ni siquiera pintó todos los nodos.
- **El texto y las fechas no repintan la barra completa, a propósito**: si `#movimientos-buscar` se recreara en cada tecla, el usuario perdería el foco y el cursor a mitad de palabra. Esos handlers (`index.js`) solo llaman a `renderMovimientosCompletos()` (la lista).

**Bug real, detectado al verificar en la app y corregido en la misma rebanada.** Como consecuencia directa de la decisión anterior, el botón "Limpiar filtros" vivía en el mismo `innerHTML` que esos handlers se saltan: con un filtro de solo texto o solo fecha activo, el botón se quedaba sin aparecer hasta que algo más forzara un repintado completo de la barra (ej. cambiar de dominio). Se resolvió extrayéndolo a un slot dedicado (`#movimientos-limpiar-slot` + `actualizarBotonLimpiarFiltros()`), que los 3 handlers (buscar, desde, hasta) sí actualizan sin tocar el resto de la barra.

**Archivos tocados**

- `modules/dominio/movimientos/logic.js`: `descripcionMovimiento()` y `filtrarMovimientos()` nuevos, puros.
- `modules/dominio/movimientos/view.js`: `renderFiltrosMovimientos()`, `_DOMINIO_LABEL`, setters de filtro, `actualizarBotonLimpiarFiltros()`; `renderMovimientosCompletos()` filtra antes de agrupar; empty state nuevo "Nada coincide con esos filtros".
- `modules/dominio/movimientos/index.js`: `_wireFiltrosMovimientos()`, `_filtrarDominio()`, `_limpiarFiltrosMovimientos()`.
- `index.html`: contenedor `#movimientos-filtros` nuevo.
- `styles/components/domain.css`: `.movimientos-filtros*`.
- `tests/unit/movimientos.test.js`: 41 tests nuevos.
- `tests/e2e/smoke.test.js`: 6 tests nuevos (Chromium real: escribir, click de chip, rango de fechas, limpiar, y el caso del bug del botón).
- `service-worker.js`: `CACHE_NAME` v411 → v412.
- `docs/contexto/movimientos.md`, `docs/BOARD.md`: MOV.2 cerrada, patrón P4 cerrado por completo.

**Verificación.** 2918/2918 unit + 223/223 E2E + lint verdes. Verificado en la app real con 6 movimientos de 4 fuentes distintas (gastos, ingreso puntual, aporte, transferencia): buscar "mercado" aísla 1 fila sin perder el foco del input; el chip "Deudas" aísla el gasto de categoría interna del gasto cotidiano; el rango de fechas filtra inclusive; "Limpiar filtros" restaura las 6 filas y vacía los 4 campos; sin errores de consola.

---

### feat(movimientos): MOV.1 el ledger deja de ser solo lectura · 2026-07-22

Cierra el patrón **P4** de la auditoría de UX/producto (el ledger es solo de lectura) y la mitad de **P3** que le corresponde. Movimientos es la vista canónica del historial, pero no permitía tocar ninguna fila: para corregir un dato había que recordar de qué sección salió, navegar allá y volver a buscarlo.

**Decisión de alcance, registrada explícitamente (regla 2.7):** esto **amplía la decisión de TX.8b**, que entregó el ledger como solo-lectura a propósito. Esteban lo aprobó de forma explícita el 2026-07-22 tras señalárselo; no se revirtió en silencio.

- **El ledger delega, no reimplementa.** Cada fila ofrece los mismos `data-action` que su dominio dueño **ya registraba** para su propia lista: `editar-gasto`/`eliminar-gasto`, `eliminar-ingreso-puntual`, `ahorro-eliminar-aporte`. **Ese es el punto financiero del diseño**: borrar un gasto desde el ledger devuelve el monto a la cuenta y revierte el abono de la deuda si era un gasto-abono, porque lo ejecuta el handler de Gastos. Reimplementar el borrado en el ledger habría perdido esas reversas en silencio.
- **Alcance honesto: expone capacidades existentes, no las inventa.** Hoy: `gasto` edita y borra, `ingreso` puntual borra, `aporte` borra, `transferencia` nada. Los huecos son de **MC.17f** (deshacer transferencia) y **EDIT.1** (editar donde el dueño no sabe); cuando cierren, basta sumar su entrada en `_ACCIONES_POR_TIPO` y la fila no necesita más cambios.
- **Corrección al plan de la tarjeta: el enrutador es `m.tipo`, no `m.dominio`.** La tarjeta del BOARD proponía `m.dominio`, pero ese campo es una **etiqueta visual**: un gasto de categoría "Deudas" o "Gastos fijos" lleva `dominio: 'compromisos'` para colorear su teja, aunque su registro viva en `S.gastos` y lo administre el dominio `gastos`. Enrutar por ahí habría mandado la acción al dominio equivocado. `tipo` sí mapea 1:1 con la colección de origen. Hay un test dedicado a ese caso.
- **Cero infraestructura nueva.** No cambió `logic.js`, ni `index.js`, ni el CSS: los `data-action` se delegan en `document` desde `ui/actions.js` (así que funcionan con el HTML que PERF.1 inyecta por lotes) y el repintado ya lo daba `_SECCIONES_FUENTE` combinado con los `state:change` que emite `infra/crud.js` por colección.
- **Las acciones viven solo en la vista completa**, no en "Actividad reciente" de Inicio: son dos renderizadores distintos y el panel de Inicio es un resumen compacto a propósito. Hay test que lo fija.

**Archivos tocados**

- `modules/dominio/movimientos/view.js`: `_ACCIONES_POR_TIPO` (mapa de routing/UI) y `_renderAccionesMovimiento()` nuevos; `_renderMovimientoItem()` monta la botonera.
- `tests/unit/movimientos.test.js`: 8 tests nuevos (acciones por tipo, id propagado, enrutado por tipo en el caso trampa, transferencia sin contenedor vacío, aria-label, ausencia en el panel de Inicio).
- `tests/e2e/smoke.test.js`: 3 tests nuevos (la fila ofrece ambas acciones; borrar devuelve el monto a la cuenta y quita la fila; editar abre el form con el dato cargado).
- `service-worker.js`: `CACHE_NAME` v410 → v411.
- `docs/contexto/movimientos.md` (**ficha nueva**), `docs/contexto/README.md`, `docs/BOARD.md`.

**Verificación.** 2877/2877 unit + 217/217 E2E + lint verdes. Verificado en la app real con las 4 fuentes en pantalla: borrar un gasto de $80.000 subió el saldo de $500.000 a $580.000 y la fila desapareció sola; editar abrió el form de Gastos con $800.000 cargado; la fila "Pago: Arriendo" (teja de compromisos) enrutó a las acciones de gasto; la transferencia no ofreció ninguna. Sin errores de consola.

**Ampliación de cobertura (2026-07-22, segunda pasada).** Re-verificado de punta a punta en la app con las 4 fuentes sembradas: borrar un gasto desde la fila devolvió $120.000 a la cuenta ($1.000.000 → $1.120.000) y el ledger pasó de 3 a 2 filas solo; borrar un ingreso puntual revirtió su crédito ($1.120.000 → $820.000); editar abrió el modal precargado; el panel de Inicio siguió con 0 botones. Se agregó **1 E2E** que faltaba: la reversa al borrar un **ingreso puntual** desde el ledger (el bloque original solo cubría la fuente `gastos`, y cada fuente revierte por un camino distinto).

---

### feat(personales,analisis): PE.7 "Me deben" conectado a las cuentas y al patrimonio · 2026-07-22

Cierra el patrón **P5** de la auditoría de UX/producto (módulos que no comparten datos con el saldo ni el patrimonio), el único módulo que lo sufría. Hasta ahora "Me deben" vivía en paralelo: prestar dinero **no descontaba** ninguna cuenta, cobrar **no acreditaba**, y el capital pendiente **no contaba como activo**. El usuario acababa registrando un gasto "espejo" a mano para cuadrar el saldo (doble captura, justo lo que la app quiere evitar) o se quedaba descuadrado.

- **El dinero se mueve.** `Personal` gana `cuentaId` opcional (`normalizarPersonal` lo incluye solo si viene con valor, patrón condicional de MC.13d). El form de alta pregunta "¿De qué cuenta sale el dinero?" y el de cobro "¿En qué cuenta entró el dinero?" (preseleccionando la cuenta del préstamo), ambos con el selector compartido de `infra/cuenta-helper.js` y el patrón 0/1/varias: **con 0 cuentas activas el préstamo se registra igual**, como seguimiento que no toca saldos. Al cobrar se acredita `desglose.aplicado`, no el monto tecleado: escribir de más no infla el saldo.
- **El patrimonio deja de mentir.** `calcularActivos()` acepta un 5.º parámetro `personales` y devuelve `totalPorCobrar`; la barra de composición gana el bucket "Por cobrar" con el token `--fk-dom-personales` (sin color nuevo). **Invariante: prestar no mueve el patrimonio neto**, porque convierte efectivo en un derecho de cobro; la cuenta baja $X y "Por cobrar" sube $X.
- **La decisión financiera del corte, y por qué no es un descuido.** Solo cuentan como activo los préstamos **con `cuentaId`**. La regla del patrimonio, ya documentada en `calcularActivos` desde antes, es que un bucket se suma aparte únicamente si su dinero YA SALIÓ de `cuentas`: por eso Metas y Apartados cuentan (descuentan al aportar) y el fondo de emergencia no (su aporte no descuenta). Un préstamo sin `cuentaId` (registro anterior a PE.7, o efectivo que Finko nunca vio) no movió ningún saldo: su dinero sigue contado dentro de `cuentas` y sumarlo lo contaría **dos veces**. Por la misma razón **no hay backfill**: asignarle una cuenta a los préstamos viejos no solo inventaría un dato del usuario, además inflaría su patrimonio.
- **El interés pendiente NO entra al patrimonio**, a propósito: no se ha ganado ni cobrado y el usuario puede perdonarlo (el propio brief de PE.6 insiste en que Finko sugiere y el usuario decide). Solo capital.
- **Borrar un préstamo no revierte los movimientos**, a diferencia de D.14 en Deudas. Divergencia deliberada: una deuda acredita UNA vez al crearse y revertir es exacto, pero un préstamo es un flujo (desembolso + N abonos, posiblemente a cuentas distintas); revertir solo el desembolso sobre-acreditaría en cuanto hubiera un abono, y revertir el neto con fiabilidad necesita el historial de abonos que planea **PE.6b**. El copy del `confirmar()` ahora lo dice explícitamente.

**Dos defectos corregidos de paso**, ambos destapados por el cambio: `_nuevoPersonal` inyectaba el formulario **una sola vez en el init**, así que crear una cuenta después dejaba el selector invisible hasta recargar la app (ahora re-inyecta en cada apertura, patrón de `_nuevoApartado`); y `resetModal()` se retiró porque pone `checked = false` en todos los radios (habría borrado la cuenta preseleccionada) y vacía los `value` del HTML, que era justo lo que dejaba **en blanco la fecha del préstamo** pese a que el form la rellena con hoy.

**Archivos tocados**

- `modules/dominio/personales/logic.js`: `calcularTotalPorCobrar()` nuevo, `cuentaId` en `normalizarPersonal` y en el typedef `Personal`.
- `modules/dominio/personales/view.js`: selector de cuenta en `renderFormPersonal()` y en `renderFormPagoPersonal()`.
- `modules/dominio/personales/index.js`: helper `_ajustarSaldoCuenta`, descuento al prestar, crédito al cobrar, re-inyección del form, copy del borrado.
- `modules/dominio/analisis/logic.js`: `calcularActivos()` con `personales` y `totalPorCobrar`; `generarResumen()` lo propaga.
- `modules/dominio/analisis/view.js`: bucket "Por cobrar" + **`personales` en las claves de `_calcularDatosAnalisisMemo`** (sin eso, prestar o cobrar no repintaría el patrimonio).
- `styles/components/analysis.css`: `.patri-card__seg--porcobrar`.
- `tests/unit/personales.test.js` (9 nuevos), `tests/unit/analisis.test.js` (5 nuevos + 1 actualizado por el shape), `tests/e2e/smoke.test.js` (4 nuevos: la sección no tenía ninguna cobertura E2E).
- `service-worker.js`: `CACHE_NAME` v409 → v410.
- `docs/contexto/me-deben.md` (**ficha nueva**), `docs/contexto/analisis.md`, `docs/contexto/README.md`, `docs/BOARD.md`.

**Sin bump de schema:** `cuentaId` es aditivo y opcional, ausente en registros previos (precedente `compromiso.icono` de CAT.2d y `costoGMF` de MC.17d).

**Verificación.** 2869/2869 unit + 213/213 E2E + lint verdes. Verificado en la app real: prestar $400.000 desde una cuenta de $1.000.000 la dejó en $600.000 **con el patrimonio neto intacto en $1.000.000** y el segmento "Por cobrar" visible; cobrar $150.000 la subió a $750.000 y el patrimonio siguió en $1.000.000. Sin errores de consola.

---

### feat(apartados,ahorro): AP.5a + AH.5a el monto de un aporte llega prellenado · 2026-07-22

Quick win de mejor relación impacto/esfuerzo de toda la **auditoría de UX/producto** (patrón P1: datos que la app ya tiene y vuelve a pedir), señalado en el triaje del 2026-07-21 y ejecutado en su propia rebanada. En Apartados y en el Fondo de emergencia, la app ya calculaba y **mostraba** cuánto le convenía aportar al usuario, pero al pulsar el botón de aportar, el campo de monto se abría vacío y le pedía volver a escribir el número que acababa de leer.

- **Apartados (AP.5a).** `_abrirAporte()` (`apartados/index.js`) calcula `calcularAporteSugerido(apartado, hoy())`, el mismo cálculo que ya alimentaba el hint en vivo "Aparta $X por quincena..." del formulario de creación (`_actualizarSugerenciaLive`), y lo pasa a `renderFormAporteApartado(apartado, sugerencia)` (`apartados/view.js`), que prellena `value` del campo cuando `sugerencia.aportePorPeriodo > 0` y agrega el hint "Prellenado con lo que te toca aportar {período} para llegar a tiempo. Puedes cambiarlo." Sin fecha objetivo o con el apartado ya cubierto, el campo sigue vacío, comportamiento sin cambios.
- **Ahorro (AH.5a).** `_nuevoAporte()` (`ahorro/index.js`) calcula `_construirSugerenciaAporte()` (AH.2), el mismo cálculo que ya alimentaba la caja de sugerencia del compromiso mensual (`renderCajaSugerencia`), y lo pasa a `renderFormAporte({ fecha, sugerencia })` (`ahorro/view.js`), que prellena `value` cuando `sugerencia.monto > 0` y ajusta el hint sin perder la explicación de que el aporte NO descuenta cuentas (ADR 009, invariante intacto). Sin gastos fijos registrados (`objetivo <= 0`) el campo sigue vacío.
- **Ambos campos siguen siendo `<input>` editables normales**, sin `readonly` ni `disabled`: el usuario puede cambiar el número, solo deja de partir de cero.

**Archivos tocados**

- `modules/dominio/apartados/index.js`: `_abrirAporte()` calcula la sugerencia.
- `modules/dominio/apartados/view.js`: `renderFormAporteApartado(apartado, sugerencia)` gana el segundo parámetro.
- `modules/dominio/ahorro/index.js`: `_nuevoAporte()` calcula la sugerencia.
- `modules/dominio/ahorro/view.js`: `renderFormAporte({ fecha, sugerencia })` gana el campo `sugerencia`.
- `tests/unit/apartados.test.js`: 5 tests nuevos (con/sin sugerencia, monto 0, hint, editable).
- `tests/unit/ahorro.test.js`: 6 tests nuevos (`renderFormAporte()` puro + 2 de integración vía `dispatch()` con el fondo activo).
- `service-worker.js`: `CACHE_NAME` v408 → v409.
- `docs/contexto/apartados.md` (**ficha nueva**, la sección no tenía ninguna): bloque "Aportar a un apartado".
- `docs/contexto/ahorro.md`, `docs/contexto/README.md`, `docs/BOARD.md` (AP.5a/AH.5a cerradas, AP.5/AH.5 reducidas al alcance restante).

**Verificación.** 2856/2856 unit + lint verdes (tarea sin superficie E2E: ambos formularios ya tenían cobertura E2E del flujo de guardar, que no cambió). Verificado en la app real: un apartado SOAT con $300.000 faltantes por quincena mostró $50.000 prellenado; un fondo con $800.000/mes en fijos (sin ingresos registrados) mostró $184.000 prellenado; ambos campos editables, sin errores de consola.

---

### docs(triaje): auditoría de UX/producto integrada al BOARD · 2026-07-21

Solo docs, cero código. Triaje (regla 2.7) de los hallazgos restantes de la **auditoría de UX/producto**, un recorrido de toda la app simulando a un usuario colombiano real con foco en reprocesos, captura repetida de datos, navegación de más y oportunidades de automatización. Sus 2 bugs confirmados ya se habían corregido el mismo día (BUG-014, BUG-015, arriba); esta entrada cubre el resto.

**Los 7 patrones transversales** quedan registrados en el BOARD como criterio de lectura, no como tareas: P1 datos que la app ya tiene y vuelve a pedir, P2 trabajo manual sin lote, P3 no se puede editar (corregir obliga a destruir), P4 el ledger es solo de lectura, P5 módulos que no comparten datos con el saldo ni el patrimonio, P6 se informa pero no se acciona, P7 un concepto con cuatro implementaciones.

**9 tarjetas nuevas**, cada una en su sección: **CAL.5** (pagar en lote lo que vence hoy: ~30 toques para 6 fijos), **MC.17f** (deshacer o editar una transferencia, hueco de integridad), **TX.12** (gastos frecuentes derivados del historial), **MOV.1** y **MOV.2** (ledger accionable + búsqueda y filtros; **sección Movimientos creada en el tablero**, no existía), **PE.7** ("Me deben" conectado a cuentas y patrimonio), **EDIT.1** (editar sin destruir en Metas/Apartados/Inversión/Me deben), **ARQ.1** (`infra/bolsas.js`, un modelo para las 4 bolsas) y **ARQ.2** (consolidar `FACTOR_MENSUAL` duplicado, el helper de registrar pago triplicado y los totales de Agenda).

**6 refuerzos integrados en tarjetas existentes**, sin crear duplicados (regla 2.1): **AP.5** y **AH.5** (el prellenado del aporte sugerido se identifica como el quick win de mejor relación impacto/esfuerzo y se recomienda separarlo como rebanada adelantable), **LIM.1** (sugerir monto por histórico + categorías huérfanas accionables), **ANL.1** (punto 10 nuevo: anclar el motor de recomendaciones en las cards de hormigas que ya existen, porque hoy sus CTA son enlaces de navegación), **PA.1** (se cuestiona la secuencia: probar el lote manual de CAL.5 antes que el automático) y **MC.13e-2f** (desbloqueo parcial: usar el `cuentaId` del ingreso no necesita diseño nuevo y hoy está preso de la decisión del remanente).

**4 hallazgos cuestionan una decisión vigente** y quedan marcados como "no ejecutar sin la palabra de Esteban": MOV.1 amplía TX.8b (que entregó el ledger como solo-lectura a propósito), CAL.5 discute la secuencia de PA.1, MC.17f revisa el cierre de MC.17 como "completa", y la distribución de un toque tensiona a MC.13e-2g (que quiere más pasos, educación financiera al frente). Ninguno se revierte en silencio.

**Verificado contra el código, no aceptado del informe:** el dominio `personales` no tiene un solo `cuentaId` (base de PE.7) y existen 4 mensajes en voseo que violan el ADN 11, registrados como **BUG-016** en `BUGS.md` (el informe los daba por registrados; no lo estaban).

**Alcance honesto:** se trió todo lo que el informe entregó enumerado (7 patrones, 9 automatizaciones priorizadas, 5 fusiones, 4 conflictos de decisión, roadmap de 15 líneas). Su tabla "hallazgos por módulo" venía como vista filtrable y las fichas individuales no llegaron en texto: ese detalle no se trió y habría que recuperarlo de la fuente si se quiere.

**Archivos tocados:** `docs/BOARD.md` (9 tarjetas nuevas, sección Movimientos nueva, bloque de procedencia del triaje, 6 refuerzos), `docs/BUGS.md` (BUG-016).

---

### fix(agenda): BUG-015 "Marcar pagado" registra el pago en el mes visible, no en el actual · 2026-07-21

Segundo hallazgo de la **auditoría de UX/producto**. En el detalle de un gasto fijo del Calendario, el botón "Marcar pagado" se mostraba en **cualquier mes navegado** que no estuviera pagado (la vista decide con el mes visible: `estadoPagoMes` sobre `viewYear-viewMonth`), pero el handler validaba el duplicado contra el **mes actual** (`_prefijoMesActual()`) y grababa el gasto con `fecha: hoy()`. Navegar a un mes pasado y marcarlo creaba un pago fechado en el mes en curso: el badge del mes visible no viraba, el botón seguía invitando a re-clickear (doble registro posible) y el gasto quedaba atribuido al mes equivocado, contaminando también Movimientos y Análisis.

**Decisión de producto (Esteban, 2026-07-21): pasado y presente sí, futuro no.** Ponerse al día con un mes que se olvidó marcar es un caso real y legítimo; pagar por adelantado un mes que aún no vence no lo es, y registrar dinero como gastado en fechas que no ocurrieron contradice el precedente de MC.13c-2 ("Finko registra lo que pasó", que ya rechazó gastos con fecha futura).

- **Vista** (`agenda/view.js`, `_renderDetalleItem`): el CTA viaja con `data-mes="${prefijo}"`, porque `_viewYear`/`_viewMonth` son estado privado de la vista y el handler no puede leerlos. Además el botón **no se renderiza si el mes visible es futuro** (`esMesFuturo`); editar y eliminar siguen disponibles ahí, solo se bloquea el pago.
- **Handler** (`agenda/index.js`, `_marcarPagadoGastoFijo`): el guard de duplicado compara contra el mes visible, y `_fechaPagoDelMes(comp, prefijoMes)` (nuevo) decide la fecha: mes en curso → `hoy()` (el pago acaba de ocurrir); mes pasado → la ocurrencia del compromiso en ESE mes vía `ocurrenciasEnMes` (la última si el fijo cae varias veces, con caída al último día del mes); mes futuro → `null` y el handler aborta (defensa en profundidad por si el botón se filtrara).
- **Lo que NO cambió, a propósito.** El descuento de la cuenta sigue ocurriendo **ahora**, aunque el gasto quede fechado en un mes pasado. Es lo correcto: un saldo es un valor "de hoy". Si el usuario pagó el arriendo en marzo y no lo registró, el saldo que Finko muestra está inflado, y registrarlo ahora lo pone al día con la realidad del banco. Queda escrito en el JSDoc del handler para que no se "corrija" descontando en la fecha del gasto: los saldos no son históricos.

**Archivos tocados**

- `modules/dominio/agenda/view.js`: `data-mes` en el CTA + gate `esMesFuturo`.
- `modules/dominio/agenda/index.js`: `_fechaPagoDelMes()` nuevo, guard de duplicado por mes visible, `fecha: fechaPago`, import de `ocurrenciasEnMes`, JSDoc del handler ampliado.
- `tests/unit/agenda.test.js`: 4 tests nuevos (`data-mes` con el mes visible, mes futuro sin CTA, mes pasado con su propio mes, pagos de meses distintos independientes entre sí).
- `tests/e2e/smoke.test.js`: 2 tests nuevos (marcar el mes anterior fecha el gasto en ESE mes y vira su badge; el mes siguiente no ofrece el CTA).
- `service-worker.js`: `CACHE_NAME` v407 → v408.
- `docs/contexto/calendario.md`, `docs/BUGS.md`: BUG-015 documentado y retirado de pendientes.

**Verificación.** 2845/2845 unit + 209/209 E2E + lint verdes. El E2E cubre el recorrido real que los unit no alcanzan (el handler no es unit-testeable en este dominio): navegar al mes anterior, marcar pagado y leer el `fecha` del gasto desde `localStorage` con `expect.poll` (`save()` es debounced 200ms, ADN #5).

---

### fix(tesoreria): BUG-014 la distribución reparte el cobro del período, no el mes · 2026-07-21

Hallazgo de la **auditoría de UX/producto** (recorrido de la app simulando a un usuario colombiano real). El asistente "Distribuir mi ingreso" proponía repartir el **mensual-equivalente** en vez de lo recibido en ESTE cobro: para un ingreso **quincenal** de $1.000.000, `estimarSalarioMensual` devuelve $2.000.000 (`monto × 2`), y ese valor era el default del input "Monto a distribuir". Al confirmar sin corregir, `_confirmarDistribucion` acreditaba $2.000.000 a la cuenta (`saldo + monto - descontable`) cuando el usuario solo recibió una quincena: **$1.000.000 de sobre-crédito** al saldo, más ahorro y necesidades sobre-asignados. Afecta a la mayoría de asalariados colombianos (nómina quincenal) y contradecía el propósito declarado del ADR 041 ("qué hacer con ESTE dinero, hoy", no "todo el mes").

- **Causa raíz.** `_construirDatosDistribucion` (`tesoreria/views/distribucion.js`) usaba `estimarSalarioMensual(S.ingresos)` como monto a distribuir. Esa función (`infra/financiero.js`) proyecta a mes-equivalente multiplicando por `FACTOR_MENSUAL_INGRESO` (Quincenal = 2), correcto para razonar en cifras mensuales pero no para el monto de un solo cobro.
- **Fix.** Helper puro nuevo `montoCobroPrincipal(ingresos)` en `infra/vencimientos.js` (junto a `frecuenciaPrincipalIngresos`): suma el `monto` por período (que ya es por período, no mensual: ver `montoSalarioMinimoPorPeriodo`) de los ingresos activos cuya frecuencia coincide con la principal. Para un asalariado **mensual** coincide con `estimarSalarioMensual` (cero cambio); para un **quincenal** es una quincena.
- **Reparto de responsabilidades.** `estimarSalarioMensual` se conserva **solo** para `sugerirDistribucionIngreso` (el split de %, que compara el ingreso contra fijos/cuotas/`faltanteFondo ÷ 12`: con el monto por cobro los porcentajes se dispararían y aparecerían falsas alertas de "tus obligaciones consumen todo tu ingreso"). El monto por cobro alimenta `presupuestosSobreRemanente` (remanente del cobro, coherente con las Necesidades, que ya usan la ventana del cobro) y el `montoIngreso` por defecto del asistente (lo que se acredita). La tarjeta compacta `_renderTarjetaDistribuir` también lee el cobro (título + leyenda escalada por %): comparte nombre y botón "Distribuir mi ingreso" con el asistente y no puede mostrar una cifra distinta.

**Archivos tocados**

- `modules/infra/vencimientos.js`: `montoCobroPrincipal(ingresos)` nuevo (export puro).
- `modules/dominio/tesoreria/views/distribucion.js`: `_construirDatosDistribucion` (monto por cobro para presupuesto + default; mensual solo para el split), `_renderTarjetaDistribuir` (título + leyenda por cobro), import de `montoCobroPrincipal`.
- `tests/unit/vencimientos.test.js`: 9 tests nuevos de `montoCobroPrincipal` (mensual = estimarSalarioMensual, quincenal = una quincena, mixtas, inactivos, montos no numéricos).
- `tests/unit/tesoreria.test.js`: 1 test nuevo (tarjeta con ingreso quincenal muestra $1.000.000, no $2.000.000; leyenda ≤ cobro).
- `service-worker.js`: `CACHE_NAME` v406 → v407.
- `docs/contexto/mis-cuentas.md`, `docs/BUGS.md`: BUG-014 documentado; BUG-015 (Calendario) registrado como pendiente.

**Alcance intacto (a propósito).** Sin cambio de `SCHEMA_VERSION` (no hay dato nuevo). Sin tocar `ocurrenciasEnMes` ni `estadoDistribucion`: la nota transversal del modelo Quincenal con `diaPago > 16` (un quincenal cae una sola vez al mes) sigue pendiente y requiere decisión de Esteban aparte.

**Verificación.** 2841/2841 unit + E2E de distribución 3/3 (todos sus fixtures usan ingresos mensuales, donde el valor no cambia: cero regresión) + lint verdes. Verificado además en la app real: con un ingreso quincenal de $1.000.000, la tarjeta muestra "¿Cómo distribuir $1.000.000?" (leyenda Estilo de vida $800.000 / Ahorro $200.000) y el asistente arranca con el input en `1000000`; sin errores de consola.

---

### feat(tesoreria): MC.13e-2a copy, accesos cruzados y navegación del asistente · 2026-07-15

Primera de las 7 rebanadas de **MC.13e-2** ([ADR 041](DECISIONS/041-motor-vencimientos-y-distribucion-v2.md)): agrupa 4 puntos de bajo riesgo del brief (11, 12, 13, 17), sin tocar ninguna lógica financiera.

- **(11) Accesos cruzados fuera del asistente.** El array `ctas` de `sugerirDistribucionIngreso()` ("Ver progreso del fondo", "Explorar/Aportar a inversiones", "Ver estrategia de deudas", "Ver tu seguimiento en Límites de gasto") deja de renderizarse en `_renderTarjetaDistribuir()` (`tesoreria/views/distribucion.js`). La función que los calcula no se toca: sigue siendo lógica pura, cubierta por sus propios tests, porque **MC.13e-2g decidirá si reaparecen** dentro del asistente rediseñado, contextuales a cada paso (punto 10), en vez de vivir siempre visibles antes de abrir el asistente.
- **(12) El aviso "recibiste tu ingreso" es un bloque aparte.** Antes vivía como subtítulo dinámico dentro de `.distribuir-card` (`"Hoy recibes tu ingreso."` / `"Recibiste tu ingreso el X."` / la invitación genérica, según el estado del cobro). Ahora es un párrafo propio (`.distribuir-aviso`), hermano de la tarjeta, que solo aparece cuando hay algo que anunciar (`estado === 'listo'`); la tarjeta en sí siempre abre con la misma frase, "Reparte tu ingreso entre necesidades, estilo de vida y ahorro.".
- **(13) Copy del `<legend>` del panel.** "Reparte hacia tus necesidades, ahorros, deudas e inversiones. El resto queda disponible en tu cuenta." → "Reparte tu ingreso entre tus necesidades, ahorro, deudas e inversiones. Lo que no distribuyas queda disponible en tu cuenta." (gramática más natural; "lo que no distribuyas" no promete todavía la decisión explícita del remanente que trae MC.13e-2f).
- **(17) Navegación modernizada.** Los botones Atrás/Siguiente/Distribuir dejan las flechas de texto plano (`← Atrás`, `Siguiente →`) por el ícono del sprite: `i-chevron-right` (rotado 180° para "Atrás", ya que el sprite no tiene una variante izquierda propia, y ADR 023/037 prohíbe símbolos nuevos) y `i-check-circle` en "Distribuir", mismo lenguaje visual que el resto de la app (FORM.1, etc.).

**Archivos tocados**

- `modules/dominio/tesoreria/views/distribucion.js`: `_renderTarjetaDistribuir()` (quita `ctasHtml`, separa `avisoHtml`, subtítulo fijo), `_renderPanelDistribuir()` (legend + botones con íconos).
- `styles/components/domain.css`: `.distribuir-aviso` nuevo; `.distribucion-ctas` eliminado (sin consumidor).
- `styles/components/forms.css`: `.distribuir__nav-icon--atras` nuevo (rotación del chevron).
- `tests/e2e/smoke.test.js`: el test "CTA cruzado a Límites de gasto" se reescribió para verificar su ausencia (antes verificaba su presencia).
- `tests/unit/tesoreria.test.js`: 3 tests nuevos para `renderDistribucionIngreso()` (sin accesos cruzados, aviso separado, subtítulo fijo).
- `service-worker.js`: `CACHE_NAME` v405 → v406.
- `docs/BOARD.md`, `docs/contexto/mis-cuentas.md`: MC.13e-2a marcada cerrada.

**Verificación:** 2832/2832 unit + 207/207 E2E + lint verdes.

---

### docs(triaje): MC.13e-2 análisis y re-corte del rediseño del asistente · 2026-07-15

Solo docs, cero código. El brief de MC.13 (puntos 9-21, rediseño del asistente "Distribuir mi ingreso") venía como un bloque único ("MC.13e+") demasiado grande para ejecutar de una sola vez (regla 2.1). Análisis del código actual (`tesoreria/views/distribucion.js` + `acciones/distribucion.js`: tarjeta compacta, contenido del modal con chips de preset, y el panel paginado de hasta 3 pasos) para re-cortarlo en **7 rebanadas verificables de forma independiente**: **MC.13e-2a** (copy, accesos cruzados `ctas` y navegación, sin riesgo financiero), **MC.13e-2b** (quitar "Abonar extra a deudas" del asistente, punto 16), **MC.13e-2c** (logo/ícono + nota por fila, punto 15), **MC.13e-2d** (cuota del período en vez del objetivo total, punto 21), **MC.13e-2e** (completar con saldo de otra cuenta si no alcanza, punto 14, lógica financiera nueva), **MC.13e-2f** (integración con la cuenta del ingreso fijo + decisión explícita del remanente, puntos 18 + integración; **necesita decisión de UX de Esteban antes de codificar**) y **MC.13e-2g** (rediseño en 2 pasos con educación financiera, puntos 9-10; **necesita decidir si pasa por un handoff de diseño de Claude Design**, mismo patrón que las 8 pantallas v2 anteriores, o se diseña sin mockup). Orden recomendado: 2a → 2b → 2d → 2c → 2e → 2f → 2g (las últimas dos reestructuran o simplifican lo que las anteriores tocan). Detalle completo de cada rebanada en `docs/BOARD.md`.

---

### refactor(tesoreria): MC.13e-1 un ingreso esporádico ya no ofrece distribuirlo · 2026-07-15

Decisión (a) del [ADR 041](DECISIONS/041-motor-vencimientos-y-distribucion-v2.md) (Distribución v2), confirmada explícitamente por Esteban antes de codificar (regla 2.7 del workflow: un ADR aprobado no se revierte en silencio, se decide formalmente). El brief de MC.13 (puntos 7+19) pedía separar ingreso fijo (periódico, dispara distribución) de ingreso esporádico (solo acredita y registra, sin ofrecer distribución); eso **revertía parcialmente NAV.A2b slice 2 del ADR 024**, que ofrecía automáticamente el asistente tras registrar un ingreso puntual.

**Cambio de comportamiento:** al registrar un ingreso esporádico, la app ya no muestra el diálogo "Sumaste $X a tu cuenta. ¿Quieres repartirlo ahora...?". El ingreso se acredita y se registra en silencio, igual que antes en todo lo demás. El asistente "Distribuir mi ingreso" sigue disponible, pero únicamente como acceso manual desde la tarjeta de Mis cuentas (MC.18e), nunca como oferta automática.

**El modo "ya acreditado" del asistente se eliminó por completo, no solo su disparador.** Antes, cuando el usuario aceptaba la oferta, el asistente arrancaba en un modo especial (`_distribucionPreacreditada` en `acciones/distribucion.js`) que: usaba la cuenta del ingreso puntual sin preguntar (saltaba `resolverCuenta`), no volvía a sumar el monto a la cuenta (ya estaba acreditado, sumarlo de nuevo habría sido un doble abono) y no marcaba el período del ingreso recurrente como distribuido (un ingreso puntual es un evento aparte). Al quitar la única llamada que activaba este modo, todo ese código quedó **100% inalcanzable**: se retiró en la misma rebanada, porque dejarlo ahí habría sido código muerto disfrazado de "por si acaso" (el mismo criterio que ya aplicaron FORM.1b al borrar el chooser de dos pasos y otras rebanadas de este mes).

**Archivos tocados**

- `modules/dominio/tesoreria/acciones/ingresos.js`: `_guardarIngresoPuntual()` deja de llamar a `_ofrecerDistribucion()`; esa función y `_hayAsistenteDistribucion()` se eliminan enteras (sin otro caller); import muerto de `estimarSalarioMensual` retirado; la función deja de ser `async` (ya no tiene ningún `await`).
- `modules/dominio/tesoreria/acciones/distribucion.js`: `_distribucionPreacreditada` (variable de módulo) eliminada; `abrirAsistenteDistribucion()` pierde el parámetro `preacreditado`; `_confirmarDistribucion()` simplifica su rama `yaAcreditado`/`pre` a un único flujo (siempre resuelve cuenta, siempre acredita el monto, siempre marca el período distribuido).
- `modules/dominio/tesoreria/views/distribucion.js`: `renderAsistenteDistribucion()` pierde el parámetro `preacreditado` y usa siempre `datos.distribuir` sin override.
- `modules/dominio/tesoreria/index.js`: el listener de `distribuir:abrir` deja de reenviar un payload (ya no hay nada que reenviar).
- `tests/e2e/registrar-distribucion.test.js`: reescrito completo. Los 3 tests que verificaban el modo "ya acreditado" (comportamiento eliminado) se reemplazan por 3 tests que verifican el invariante inverso: ningún ingreso puntual abre el asistente (con o sin ingreso recurrente registrado), y el acceso manual desde Mis cuentas sigue funcionando con el flujo normal.
- `service-worker.js`: `CACHE_NAME` v404 → v405.
- `docs/contexto/mis-cuentas.md`: bloque MC.13 actualizado (decisión (a) resuelta, MC.13e re-cortada en MC.13e-1 cerrada + MC.13e-2+ pendiente).

**Verificación:** 2829/2829 unit + 207/207 E2E (mismo total: 3 tests reemplazados 1:1) + lint verdes.

**Queda pendiente:** MC.13e-2+, el rediseño del asistente en sí (puntos 9-21 del brief: paso educativo, banner dinámico, completar con saldo de otras cuentas, logo+nombre+nota por fila, quitar "Abonar extra a deudas", navegación modernizada, decisión explícita del remanente, cuota del período, integración con la cuenta del ingreso fijo). Sin re-cortar todavía en rebanadas verificables; ese es el primer paso al retomarla (regla 2.1).

---

### refactor(ui): TX.11 un solo switch para toda la app · 2026-07-15

Hallazgo de la verificación de FORM.1b (no un brief del usuario): la app tenía **tres** componentes de switch para el mismo control visual. (1) `.toggle` en `styles/components/atoms.css` ("TOGGLE (switch)", genérico, 44x24, perilla vía `::after`): **sin un solo consumidor en JS, CSS muerto**. (2) `.config-toggle` en `styles/components/config.css`: el único vivo hasta ahora, en Ajustes (tema y notificaciones, `config/view.js`). (3) `.toggle-switch`/`.toggle-row` en `styles/components/forms.css` (FORM.1b, D.14 "Recibí este dinero en una cuenta"): 44x26, perilla como `<span>` real, tiñe por dominio con `--fk-section-accent`.

**Consolidados en uno solo**, siguiendo la recomendación de la tarjeta: `.toggle` de `atoms.css` (el que no tenía consumidores, así que migrarlo era riesgo cero), con `background: var(--fk-section-accent, var(--fk-accent))` agregado a su estado marcado para heredar el tinte de dominio dentro de un `[data-dom]` (Deudas, frambuesa) y caer al acento neutro fuera de uno (Ajustes, sin `[data-dom]`, cero cambio visual). `.config-toggle` y `.toggle-row` **se conservan**, pero ya no estilizan el switch: son los layouts que lo envuelven (la "pill" con padding/fondo/hover de Ajustes, y la fila label+hint de formularios), tal como identificaba la tarjeta ("esa diferencia no justifica tres componentes" se refería al switch, no a sus envoltorios).

**Migración de los dos consumidores vivos:**

- **Ajustes** (`config/view.js`): `_renderTema()` y `_renderNotificaciones()` anidan `<span class="toggle"><input/><span class="toggle__track"></span></span>` dentro del `<label class="config-toggle">` existente, en vez de que el propio `<input type="checkbox">` lleve `appearance:none` con su propio `::after`. `config/index.js`: el listener de `theme:change` (resincroniza el checkbox tras un cambio de tema externo, ej. desde el sidebar) buscaba el label de texto con `toggle.parentElement?.querySelector('.config-toggle__label')`; con el input ahora un nivel más adentro (dentro de `.toggle`), pasa a `toggle.closest('.config-toggle')?.querySelector(...)`, que sube hasta la etiqueta contenedora sin importar cuántos envoltorios haya.
- **Deudas** (D.14, `compromisos/views/formularios.js`): el bloque "Recibí este dinero en una cuenta" cambia `<span class="toggle-switch"><input class="toggle-switch__input"/><span class="toggle-switch__knob"></span></span>` por `<span class="toggle"><input/><span class="toggle__track"></span></span>`, dentro del mismo `<label class="toggle-row">` (layout label+hint intacto). Wiring sin cambios: `_wireToggleOrigen()` sigue enganchando por `id="comp-recibio-dinero"`, ajeno a la clase del switch.

**CSS eliminado por completo:** `.config-toggle input[type="checkbox"]` y sus reglas `::after`/`:checked`/`:focus-visible` (config.css); `.toggle-switch`, `.toggle-switch__input`, `.toggle-switch__knob` y sus reglas `:has()` (forms.css).

**E2E ajustado:** el input de `#toggle-tema` queda visualmente oculto dentro de `.toggle` (mismo patrón que los chips de FORM.1/1a: `opacity:0; width:0; height:0`), así que un click de Playwright directo sobre el input ya no es "actionable". El test de tema (`smoke.test.js`) pasa a clickear `label[for="toggle-tema"]` (la etiqueta reenvía el click al control anidado), consistente con el helper `elegirChip()` que ya usan los demás formularios v2.

**Archivos tocados**

- `styles/components/atoms.css`: `.toggle input:checked + .toggle__track` gana el fallback `--fk-section-accent`; comentario de cabecera actualizado (único switch de la app).
- `styles/components/config.css`: `.config-toggle input[type="checkbox"]*` eliminado; `.config-toggle`/`.config-toggle__label` quedan como el contenedor "pill".
- `styles/components/forms.css`: `.toggle-switch*` eliminado; `.toggle-row*` intacto.
- `modules/dominio/config/view.js`: `_renderTema()`/`_renderNotificaciones()` anidan `.toggle`.
- `modules/dominio/config/index.js`: `toggle.parentElement` → `toggle.closest('.config-toggle')`.
- `modules/dominio/compromisos/views/formularios.js`: bloque D.14 usa `.toggle`.
- `tests/unit/config.test.js` (2 tests nuevos) + `tests/unit/compromisos.test.js` (1 test nuevo) + `tests/e2e/smoke.test.js` (test de tema adaptado a `label[for="toggle-tema"]`).
- `service-worker.js`: `CACHE_NAME` v403 → v404.
- `docs/contexto/configuracion.md` y `docs/contexto/deudas.md`: bloques actualizados.

**Verificación:** 2829/2829 unit + 207/207 E2E + lint verdes.

---

### feat(forms): FORM.1c Nuevo gasto fijo con el lenguaje v2, cierra la iniciativa Formularios v2 · 2026-07-15

Tercera y última rebanada de **Formularios v2** ([ADR 042](DECISIONS/042-formularios-v2-visual.md) D5): cierra la iniciativa completa (FORM.1a Registrar gasto, FORM.1b Nueva deuda, FORM.1c Nuevo gasto fijo). El form de gasto fijo adopta el lenguaje compartido que ya usan los otros dos: la categoría deja el `<select>` por **chips de ícono** (grilla de 3 columnas por defecto, las 15 de `CATEGORIAS_AGENDA`, mismo picker CAT.2f para "Otro"), el monto pasa a **`.monto-hero`** con el tinte índigo de agenda (`--fk-section-accent`, ya declarado por `data-dom="agenda"` en el modal), frecuencia y día de pago comparten una **fila nueva** (`.form-row`, agregado a `forms.css`: los dos `.form-group` internos no llevan el margen vertical que normalmente separa campos, para no desalinear la fila), y un **banner informativo dinámico** nuevo que lee ambos campos: "Aparecerá cada mes en tu calendario el día 5."

**El banner** (`textoBannerGastoFijo(frecuencia, diaPago)`, pura en `agenda/view.js`) cubre las 9 `FRECUENCIAS`: "cada X" para las que se repiten (día/semana/quincena/mes/dos meses/tres meses/seis meses/año) y "una vez" para "Única vez" (no repite "cada"). Sin día válido (vacío o fuera de 1-31) cierra con "el día que elijas" en vez de inventar una fecha. Se recalcula en cada `input` del form (barato: solo escribe `textContent`, no filtra por campo) y también al pre-rellenar en modo edición.

**Cero cambios de lógica:** `validarCompromiso`/`normalizarCompromiso` y el contrato FormData (`name="categoria"`, `name="frecuencia"`, `name="diaPago"`) no se tocan. El modal ganó su **`.modal__teja`** (glifo `i-agenda`), que le faltaba a diferencia de los otros dos modales del lenguaje v2 (Registrar gasto, Nueva deuda).

**Wiring adaptado en `index.js`:** como la categoría deja de ser un único `<select>` (`form.querySelector('[name="categoria"]')` ya no identifica la selección), `_syncCategoriaGastoFijo()` pasa a leer `[name="categoria"]:checked` y el listener de sincronización queda **delegado en el `change` del form** (mismo patrón que FORM.1a/1b), en vez de colgar del select directo. El prellenado en modo edición marca el radio (`.checked = true`) que corresponde a la categoría guardada, en vez de asignar `.value`.

**Archivos tocados**

- `modules/dominio/agenda/view.js`: `renderFormGastoFijo()` v2 (chips de categoría, monto hero, fila frecuencia+día, banner); `textoBannerGastoFijo()` nueva (pura, exportada) + el mapa interno `_FRASE_FRECUENCIA`.
- `modules/dominio/agenda/index.js`: `_syncCategoriaGastoFijo()` lee el radio marcado; `_actualizarBannerGastoFijo()` nueva; el prellenado en modo edición marca el radio en vez de asignar `.value`; listener de categoría delegado en `change` del form.
- `styles/components/forms.css`: `.form-row` nuevo (grid de 2 columnas + reset del margen vertical de sus `.form-group` internos).
- `index.html`: `.modal__teja` (`i-agenda`) agregado al header de `#modal-gasto-fijo`.
- `tests/unit/agenda.test.js` (chips en vez de `<option>`, 6 tests nuevos de lenguaje v2 + 5 de `textoBannerGastoFijo()`) + `tests/e2e/smoke.test.js` (4 flujos migrados de `page.selectOption('#gfijo-categoria', ...)` al helper `elegirChip()` ya existente de FORM.1a/1b, 1 E2E nuevo del banner). Tests **adaptados, no borrados**.
- `service-worker.js`: `CACHE_NAME` v402 → v403.
- `docs/contexto/calendario.md`: bloque actualizado (nuevas anclas, estado, `Verificado contra`).

**Verificación:** 2826/2826 unit + 207/207 E2E + lint verdes.

---

### feat(forms): FORM.1b Nueva deuda con el lenguaje v2 + el chooser de dos pasos desaparece · 2026-07-15

Segunda rebanada de **Formularios v2** ([ADR 042](DECISIONS/042-formularios-v2-visual.md) D4): el form de deuda adopta el lenguaje que estrenó FORM.1a. El **segmented Entidad/Personal vive inline** al tope del form y **reemplaza el chooser de dos pasos** (mismo contrato `tipo` en un hidden, un paso menos para el usuario): `renderChooserCompromiso()`, `_mostrarChooser()`, `_volverChooser()`, la acción `comp-volver-chooser` y las 89 líneas de `.comp-chooser*` en `charts.css` se borran completas, cero código muerto. Además: categorías en **chips de 2 columnas** (catálogos D.10 por tipo, con el picker de ícono CAT.2d intacto en "Otra/Otro"), saldo total como **monto hero** frambuesa, cuota con prefijo `$`, tasa dentro del disclosure **"Condiciones del crédito"** y el bloque D.14 como **toggle**. Cero lógica nueva: `validarCompromiso`/`normalizarCompromiso` y el contrato FormData no se tocan.

**Decisiones de traducción del mockup** (detalle en [`contexto/deudas.md`](contexto/deudas.md)): **solo la tasa** entró al colapsable, no frecuencia+día como agrupaba el mockup, porque ambos son obligatorios y el día no tiene default seguro: esconderlos habría producido errores de validación silenciosos (el disclosure abre solo al editar una deuda que ya tiene tasa). El **segmented solo aparece al crear**: editar nunca permitió cambiar Entidad↔Personal, y la regla se conserva. `_mostrarFormDeuda()` queda como **único punto de montaje** del form (lo llaman crear, cambiar de tipo y editar), en vez de triplicar el wiring; `_inyectarForm()` se retira y el form se monta on-demand, como en Gastos.

**Dos hallazgos de la verificación** (ninguno venía en el plan de la tarjeta):

- **Corregido aquí:** la perilla del toggle nuevo tenía `background: #fff` hardcodeado, el **único color hardcodeado de todo `styles/`** (viola CLAUDE.md 6 y el guardarraíl 4 del ADR 042). No era solo la regla: el par de tokens del sistema para esto es `--fk-text-muted` (apagado) / `--fk-text-on-accent` (encendido), y `--fk-text-on-accent` es `#ffffff` en claro pero **`#08120d` en oscuro**, así que el blanco fijo contradecía el tema oscuro. Ahora usa el mismo par que `.toggle` de `atoms.css`.
- **Registrado como TX.11:** el toggle se documentó como componente nuevo porque "no existía ningún patrón de switch en la app". Es falso: ya existían `.toggle` (`atoms.css`, genérico, **sin un solo consumidor: CSS muerto**) y `.config-toggle` (`config.css`, vivo en Ajustes). El de FORM.1b es el tercero y solo se diferencia en que tiñe por dominio. Se deja como está para no ampliar el alcance de esta rebanada (regla 2.1) y la consolidación va a su propia tarjeta con recomendación; la ficha ya no afirma lo contrario.

**Archivos tocados**

- `modules/dominio/compromisos/views/formularios.js`: `renderFormDeuda()` v2 (segmented, chips 2col con `CATEGORIA_DEUDA_ICONO`/`CATEGORIA_DEUDA_PERSONAL_ICONO`, monto hero, `input-prefix` en la cuota, disclosure de tasa, toggle D.14, footer con `i-check-circle`); `renderChooserCompromiso()` eliminada.
- `modules/dominio/compromisos/index.js`: `_mostrarFormDeuda()` nueva (único montaje + wiring); `_wireCondicionesColapsable()` nueva; `_wireToggleFiado`/`_wireIconoOtraCategoria` pasan a `change` **delegado** en el form filtrando `e.target.name === 'categoria'` (ya no existe `#comp-categoria`); `_mostrarChooser`/`_volverChooser`/`_inyectarForm` y la acción `comp-volver-chooser` eliminadas.
- `modules/dominio/compromisos/view.js`: deja de re-exportar `renderChooserCompromiso`.
- `styles/components/forms.css`: `.tipo-segmented*`, `.form-disclosure*` (genérico, no específico de tasa) y `.toggle-switch`/`.toggle-row`. `styles/components/charts.css`: `.comp-chooser*` borrado (89 líneas).
- `index.html`: teja `i-deudas` en el header de `#modal-compromiso`.
- `tests/unit/compromisos.test.js` (chips en vez de `<option>`, 4 tests nuevos) + `tests/e2e/smoke.test.js` (los flujos de deuda ya no pasan por el chooser). Tests **adaptados, no borrados**.
- `service-worker.js`: `CACHE_NAME` v401 → v402.

**Verificación:** 2818/2818 unit + 206/206 E2E + lint verdes. Nota del entorno: el pase `a11y-forms` sobre "Nueva deuda" salió **flaky** (axe reportó contraste en `.tipo-segmented__btn` y `.monto-hero__label`, y pasó al reintentar). Investigado: es una **carrera del test, no un defecto de CSS**. `waitForSelector('[data-open]')` devuelve mientras el modal aún hace su `transition: opacity`, así que axe mide un color mezclado; con opacidad 1 ambos pares cumplen AA (`#888fa6` sobre `#20242f` = 4.7:1 en oscuro; `#5d6276` sobre `#eef1f8` = 5.3:1 en claro) y 6 repeticiones del test pasaron 6/6. La carrera es **preexistente** (afecta a cualquier modal con fade) y se registra como BUG-013, no se parchea dentro de esta rebanada.

---

### feat(forms): FORM.1a lenguaje de formularios v2 + Registrar gasto con monto hero y chips · 2026-07-15

Primera rebanada de la iniciativa **Formularios v2** ([ADR 042](DECISIONS/042-formularios-v2-visual.md), octava entrega de la familia visual v2; handoff de Claude Design "Iteración de specimen" enviado por Esteban con instrucción de implementar). Nace el **lenguaje compartido de captura** en `forms.css` y lo estrena el formulario flagship, Registrar gasto: monto hero tintado del dominio al frente, categoría con **chips de ícono en vez de select** (radios reales: el contrato FormData y `validarGasto()` no cambian en nada), fecha con atajos **Hoy / Ayer / Otra fecha** (Hoy por defecto, la regla de CAT.4 aplicada a este form), teja de dominio junto al título del modal y footer con el primario a lo ancho (`i-check-circle`).

**Decisiones de traducción del mockup** (detalle en el ADR): el orden del form pone el **monto primero y revisa TX.9a** (decisión del propio mockup, "el monto es el protagonista"; la categoría sigue antes de cuenta/fecha/nota); la grilla muestra **todo** el catálogo (13 nativas + personalizadas + "Otra categoría"), no solo 6, porque esconder categorías recrearía el problema del desplegable; el selector de cuenta existente se conserva (ya es el patrón de tarjetas, 8 consumidores); DM Mono del mockup → Inter `tabular-nums` (decisión vigente del redesign); cero íconos nuevos en el sprite. **Conflicto señalado sin resolver (ADR 042 D9):** AP.5 pedía "dropdown que autocompleta" para Apartados; la palabra la tiene Esteban al iniciar esa tarjeta.

**Archivos tocados**

- `styles/components/forms.css`: bloque nuevo "Formularios v2" (`.modal__teja`, `.monto-hero*`, `.chips-cat`/`.chip-cat*`, `.fecha-chips`/`.chip-fecha`, `.modal__footer--principal`, `.form-empty__teja`). Todo por `--fk-section-accent` (mecanismo IV.2b): los componentes se tiñen solos según el `data-dom` del modal.
- `styles/responsive.css`: **hueco preexistente corregido**: la regla móvil `.input { font-size: 16px }` (anti-zoom iOS) le ganaba por orden de capas a `.input--big-amount`, achicando el monto grande también en el modal de ingreso puntual. Excepción `2.25rem` en la misma media query (sigue ≥16px, el umbral del zoom).
- `modules/dominio/gastos/view.js`: `renderFormGasto()` v2 completo; `ayerIso()` se exporta (la usa el wiring); empty state "sin cuentas" con teja v2 y el mismo copy.
- `modules/dominio/gastos/index.js`: `_montarFormGasto()` pasa a un listener delegado de `change` (chips de categoría revelan "Otra categoría"; los atajos de fecha escriben el input date real y "Otra fecha" lo revela); `_editarGasto()` marca el chip de la categoría del gasto (si es legacy fuera de catálogo, se re-elige, igual que hacía el select) y el chip de fecha (hoy/ayer/otra).
- `index.html`: teja `i-gastos` en el header de `#modal-gasto`.
- `tests/unit/gastos.test.js`: 4 tests nuevos FORM.1a + 3 reescritos (el de orden documenta la revisión de TX.9a). `tests/e2e/smoke.test.js`: helper `elegirCategoriaGasto()` + 9 flujos adaptados (los `fill` de fecha desaparecen: Hoy es el default).
- `service-worker.js`: `CACHE_NAME` v400 → v401.

**Verificación:** 2816/2816 unit + 206/206 E2E + lint verdes (los E2E cubren en Chromium real: chips → guardar, "Otra categoría" revela el picker CAT.2a, edición, a11y-forms con axe sobre el form nuevo). Nota del entorno: el Browser pane quedó en `visibilityState: hidden` (transiciones congeladas), así que la verificación visual fina la dan los E2E + la validación de Esteban en su celular tras el deploy.

**Podría afectar:** cualquier flujo que registre gastos (hoja Registrar, CTA de empty states); la validación pendiente es de Esteban en producción (móvil real, tema claro y oscuro).

---

### feat(tesoreria): MC.13c-2 la checklist de Necesidades consume el motor, cierra MC.7g · 2026-07-14

Quinta rebanada de **MC.13** ([ADR 041](DECISIONS/041-motor-vencimientos-y-distribucion-v2.md) D2/D3). El asistente deja de mostrar "todos los fijos mensuales del mes" y pasa a mostrar **lo que vence antes de tu próximo cobro**, con todas las frecuencias. **Cierra MC.7g**, abierto desde MC.7d.

**Las tres decisiones de producto, resueltas con Esteban antes de codificar** (regla 2.7):

1. **"Ya pagado" es por la ventana del cobro**, no por el mes calendario. La regla vieja marcaba pagadas TODAS las ocurrencias de un fijo quincenal en cuanto había un solo gasto vinculado en el mes: era un error real que impedía cerrar MC.7g.
2. **Marcar una fila registra un `Gasto` por el total.** Un fijo quincenal cubierto por un cobro mensual son 2 vencimientos: se registra uno de $120.000 con fecha de hoy, no dos de $60.000 con fecha futura. Finko registra lo que pasó, no lo que va a pasar. `_aplicarNecesidad` ya lo hacía así: cero cambios ahí.
3. **Tests adaptados**, no borrados: cada caso vigente (topes de deuda BUG-004, orden, saldadas, íconos CAT.2d, categorías) sigue cubierto.

**Archivos tocados**

- `modules/dominio/tesoreria/logic/distribucion.js`: `construirDesgloseNecesidades` delega en `obligacionesYAportesDelCobro` y acepta un 4.º parámetro `cobro`. Se borran `_prefijoMes` y `_pagadoEstePeriodo` (la regla por mes calendario, que era una copia declarada del criterio de Compromisos).
- `modules/dominio/tesoreria/views/distribucion.js`: arma el cobro (`frecuenciaPrincipalIngresos` + `estadoDistribucion().periodoISO`) y se lo pasa a la checklist.
- `tests/unit/tesoreria.test.js`: bloque reescrito (24 tests, 6 nuevos). `tests/e2e/smoke.test.js`: el E2E que fijaba "excluye un fijo Quincenal" ahora verifica lo contrario en Chromium real.
- `service-worker.js`: `CACHE_NAME` v399 → v400.

**Error de diseño detectado durante la implementación, y corregido.** El primer intento sumaba `vencidas` + `enVentana` en la misma fila. Los tests lo destaparon: a un usuario mensual con el arriendo impago del mes anterior la checklist le habría dicho que debe **dos** arriendos. Como Finko solo sabe que algo está pagado si el usuario registró el gasto, a quien no lleve el registro al día se le inflaría la cuenta. La checklist muestra **solo `enVentana`**; lo vencido lo sigue calculando el motor y tendrá su propio copy en MC.13e, que es justo lo que el ADR fijaba ("vencidas separadas de por-vencer").

**Contrato nuevo:** un compromiso sin `diaPago` válido no aparece, porque sin fecha no hay forma de ubicarlo en la ventana. Es el mismo criterio con el que Agenda no lo pinta en el calendario, y el formulario de compromiso exige `diaPago`, así que en datos reales no ocurre.

**Fuera de alcance, y por qué:** generalizar `ultimoPagoHasta` a todas las frecuencias **no se hizo**. No hace falta para esto (sin fecha datable, el motor asume que el cobro es hoy, que es cuando el usuario está repartiendo) y tocarlo cambiaría la clave de de-duplicación del asistente a cambio de poco. Ver la tarjeta MC.13c-3 en el BOARD.

**Verificación:** 2813/2813 unit + 206/206 E2E + lint verdes.

---

### feat(tesoreria): MC.13d el ingreso fijo registra en qué cuenta se recibe (schema v27) · 2026-07-14

Cuarta rebanada de **MC.13** ([ADR 041](DECISIONS/041-motor-vencimientos-y-distribucion-v2.md) D5). El ingreso fijo gana un campo opcional `cuentaId`: con él, el asistente de distribución podrá partir de esa cuenta y descontar de ahí (MC.13e). **Es solo un dato**: registrar la cuenta NO implica que Finko abone el dinero solo, eso es el conflicto (b) y materia de PA.1.

**Archivos tocados**

- `modules/core/state.js`: `@property {string} [cuentaId]` opcional en el typedef `Ingreso`.
- `modules/core/storage.js`: `SCHEMA_VERSION` 26 → 27 con **migración intencionalmente no-op** (precedente v4 → v5, `cuotaManejo`). Los ingresos existentes no tienen `cuentaId` (undefined → el asistente cae al comportamiento actual). **Sin backfill a propósito:** asignar la cuenta de mayor saldo sería inventar un dato del usuario, y un dato inventado dirige mal el asistente.
- `modules/dominio/tesoreria/logic/ingresos.js`: `normalizarIngreso` incluye `cuentaId` **solo si viene con valor** (mismo patrón condicional que `costoGMF` en MC.17d). Omitirlo es lo que permite que `editar()` (Object.assign) conserve la cuenta ya guardada.
- `modules/dominio/tesoreria/views/ingresos.js`: `_renderGrupoCuentaIngreso` aplica el patrón 0/1/varias de la regla de cuenta única.
- `modules/infra/cuenta-helper.js`: `renderSelectorCuenta` acepta `preseleccionar: false`. Default `true`, así que los 8 consumidores existentes no cambian.
- `tests/unit/storage.test.js` (4 nuevos), `tests/unit/tesoreria.test.js` (11 nuevos), `tests/e2e/smoke.test.js` (1 nuevo).
- `service-worker.js`: `CACHE_NAME` v398 → v399.

**Por qué el selector no preselecciona con varias cuentas.** En un pago, la cuenta de mayor saldo es un default razonable que ahorra un clic. En "¿en qué cuenta recibes este ingreso?" no hay default honesto: adivinar guardaría como hecho del usuario algo que nadie confirmó, y ese dato luego dirige el asistente. Es el mismo principio con el que el ADR rechaza el backfill, aplicado al formulario. Con **una sola** cuenta no se pregunta (no hay nada que adivinar): se informa dónde cae el dinero y el id viaja en un hidden. Sin cuentas, el bloque no aparece: el ingreso puede existir antes que la cuenta.

**Verificación:** el E2E nuevo cubre el recorrido completo (formulario → `FormData` → `normalizarIngreso` → `localStorage`), que los unit tests no podían cubrir por separado: comprueba que el `cuentaId` guardado apunta a una cuenta real y que el estado queda en v27. 2807/2807 unit + 206/206 E2E + lint verdes.

---

### feat(infra): MC.13c-1 obligacionesYAportesDelCobro, la composición "qué toca con este cobro" · 2026-07-14

Tercera rebanada de **MC.13** ([ADR 041](DECISIONS/041-motor-vencimientos-y-distribucion-v2.md) D2). Sobre las dos mitades del motor, una función compone la pregunta que el asistente debe responder: **qué toca con ESTE cobro**, en vez de "cómo reparto todo lo del mes".

**Archivos tocados**

- `modules/infra/vencimientos.js`: `obligacionesYAportesDelCobro({cobro, compromisos, gastos, metas, apartados, fondo, hoyISO})` → `{ventana, vencidas, enVentana, aportes}`. `vencidas` mira un período hacia atrás (desde el cobro anterior hasta ayer): lo que este dinero puede cubrir y el cobro pasado no cubrió. `enVentana` va de hoy hasta el próximo cobro. `aportes` (fondo, metas, apartados) trae la **cuota del período según la frecuencia real del cobro**, que es el punto 21 del brief. Pura: recibe los datos inyectados, no lee `S` ni importa dominios.
- `tests/unit/vencimientos.test.js`: 40 tests nuevos (98 en total).
- `service-worker.js`: `CACHE_NAME` v397 → v398.

**Dos decisiones de diseño que tomó esta rebanada**

- **Una fila por compromiso, no por ocurrencia.** Si un fijo Semanal cae tres veces en la ventana, es una fila de monto × 3, no tres filas. Un `Gasto` solo guarda `compromisoId`, `fecha` y `monto`: no dice a qué ocurrencia corresponde, así que atribuir pagos a ocurrencias concretas sería inventar el dato. Comparar el total del rango contra lo esperado del rango es la lectura honesta, y es la regla que las deudas ya usaban.
- **Un mismo compromiso puede estar vencido y volver a vencer en la ventana.** El arriendo del día 5 sin pagar en julio está vencido, y el del 5 de agosto vuelve a caer antes del próximo cobro: son dos deudas reales, no una repetida. Los dos tramos son disjuntos, así que ninguna ocurrencia se cuenta dos veces.

**Nada la consume todavía** (mismo patrón que MC.13a, cuyas `ocurrenciasEnRango`/`ventanaDelCobro` también aterrizaron antes que su consumidor): la verificación es unitaria. Wiring en **MC.13c-2**, que quedó bloqueada por tres decisiones de producto, ver BOARD.

**Corrección al ADR 041:** el ADR afirma que MC.7g se cierra "sin código especial". El motor sí resuelve las frecuencias, pero la checklist no puede consumirlo sin decidir antes qué significa "ya lo pagaste" (mes calendario vs ventana del cobro) y qué registra marcar una fila de varias ocurrencias. Detalle en la tarjeta MC.13c-2.

**Verificación:** 2793/2793 unit + 205/205 E2E + lint verdes.

---

### refactor(infra): MC.13b motor de vencimientos mitad B + Metas y Apartados borran sus copias · 2026-07-14

Segunda rebanada de **MC.13** (Distribución v2, [ADR 041](DECISIONS/041-motor-vencimientos-y-distribucion-v2.md) D1 mitad B): **el motor compartido queda completo**. La mitad B responde "cada cuánto entra dinero y cuánto toca aportar por período", que es lo que estaba **duplicado carácter por carácter** en `metas/logic.js` y `apartados/logic.js`. La duplicación no era descuido: ADN #10 impide que un dominio importe a otro, y cada archivo lo comentaba como "duplicado intencional". Infra sí la pueden importar los dos, así que la copia única vive ahí.

**Archivos tocados**

- `modules/infra/vencimientos.js`: mitad B nueva. `FRECUENCIAS_APORTE` (la lista que era `FRECUENCIAS_AHORRO` en Metas y `FRECUENCIAS_APORTE` en Apartados), `normalizarFrecuenciaAporte` (los mapas `MAPA_FRECUENCIA_A_*`: lo más largo que un mes se planifica al mes), `diasPorPeriodo` (los `DIAS_POR_PERIODO*`: 1/7/15/30), `etiquetaPeriodo`, `frecuenciaPrincipalIngresos` y `aportePorPeriodo(faltante, fechaObjetivoISO, frecuencia, hoyISO)`, el reparto del faltante entre períodos reales con `hoyISO` inyectable.
- `modules/dominio/metas/logic.js`: borra sus copias. `calcularAhorroPorPeriodo` queda como envoltorio del motor; `FRECUENCIAS_AHORRO` y `etiquetaPeriodoAhorro` pasan a ser alias re-exportados (la vista y sus tests no cambian una línea). Conserva su `diasHastaFecha`, que la vista usa aparte.
- `modules/dominio/apartados/logic.js`: igual. `calcularAporteSugerido` queda como envoltorio; `FRECUENCIAS_APORTE`, `etiquetaPeriodo` y `frecuenciaPrincipalIngresos` se re-exportan.
- `tests/unit/vencimientos.test.js`: 26 tests nuevos de la mitad B (59 en total).
- `service-worker.js`: `CACHE_NAME` v396 → v397.

**Efecto colateral bueno, y uno que conviene saber:** el motor valida lo que las copias no validaban (mismo criterio que la validación de `diaPago` de MC.13a). Una fecha que no existe ya no desborda a otro mes ('2026-02-30' devuelve `null` en vez de calcular sobre el 1 de marzo) y un faltante no finito devuelve `null`; antes Metas propagaba `NaN` hasta la vista si le llegaba una fecha basura. En el camino normal el comportamiento es idéntico.

**Verificación:** refactor sin cambio de comportamiento, así que la prueba es que **no se tocó ni un test existente**: los 86 de `metas.test.js` y los 87 de `apartados.test.js` pasan intactos contra el motor compartido, igual que los 139 de `agenda.test.js` para la mitad A. 2754/2754 unit + 205/205 E2E + lint verdes.

**Qué desbloquea:** MC.13c (`obligacionesYAportesDelCobro`) ya tiene sus dos mitades. Los consumidores previstos (cuota del período del asistente, punto 21; prellenar Aportar de Apartados en AP.5; fondo de emergencia en AH.5; plan de aportes de Metas v2 en MT.6) importan de un solo sitio en vez de copiar por tercera vez.

---

### feat(infra): MC.13a motor de vencimientos mitad A + Agenda lo consume · 2026-07-14

Primera rebanada de **MC.13** (Distribución v2, [ADR 041](DECISIONS/041-motor-vencimientos-y-distribucion-v2.md) D1 mitad A). Nace el motor compartido de vencimientos: la regla de "en qué días cae una obligación según su frecuencia", que vivía duplicable en Agenda, pasa a una sola fuente de verdad en `infra/` que la Distribución v2 (MC.13c), los pagos automáticos (PA.1) y Agenda comparten.

**Qué cambió:** (1) `modules/infra/vencimientos.js` (nuevo, puro, sin dominio, ADN #10): `ocurrenciasEnMes(item, year, month)` (extrae la regla de frecuencias de `_diasParaCompromiso` de Agenda: Mensual/Quincenal/Semanal/Diario/Bimestral/Trimestral/Semestral/Anual/Única vez, con validación de `diaPago` incorporada), `ocurrenciasEnRango(item, inicioISO, finISO)` (generaliza a una ventana arbitraria que puede cruzar meses: la base de la ventana de cobro de MC.13c) y `ventanaDelCobro(frecuencia, fechaCobroISO)` (ventana del cobro para TODAS las frecuencias; a diferencia de `ultimoPagoHasta`, que sólo cubre Mensual/Quincenal; Mensual usa el mes calendario con clamp de fin de mes, el resto su longitud en días/meses). (2) `modules/dominio/agenda/logic.js`: `eventosDelMes` y `eventosIngresosDelMes` pasan a **consumir** `ocurrenciasEnMes`; se eliminan los helpers `_diasParaCompromiso`, `_caeEnCiclo`, `_diasDelMes` y `_parseFechaISO` (ya no duplicados). Comportamiento idéntico (la validación de `diaPago` ahora vive dentro de `ocurrenciasEnMes`, que devuelve `[]` si es inválido). (3) `service-worker.js`: `infra/vencimientos.js` en `CORE_ASSETS`, v395→v396.

**Archivos tocados:** `modules/infra/vencimientos.js` (nuevo), `modules/dominio/agenda/logic.js`, `tests/unit/vencimientos.test.js` (nuevo, 33 tests: frecuencias, validación, rango cruzando meses, ventana por frecuencia, coherencia ventana↔ocurrencias), `service-worker.js`.

**Verificación:** 2728/2728 unit (incluye los 139 de `agenda.test.js`, la red de regresión del refactor) + 205/205 E2E completos + lint verdes.

**Podría afectar:** nada visible al usuario. Es refactor puro: Agenda calcula lo mismo desde una fuente compartida. El Calendario (grilla, dots, detalle del día) queda idéntico (verificado por los E2E de Calendario y los 139 unit de Agenda).

---

### feat(nav): NAV2.1c pastilla "Registrar" con degradado + indicador fijo, cierra Navegación v2 completa · 2026-07-14

Tercera y última rebanada de **Navegación v2** ([ADR 040](DECISIONS/040-navegacion-v2-visual.md) D5): **la iniciativa queda completa** (NAV2.1a-c en un día, séptima pantalla de la familia visual v2). Quedan registradas en el ADR las decisiones diferidas: **badges de notificación** (decidir qué cuenta el badge es de Esteban; el CSS `.nav-item__badge` ya existe sin consumidores) y el tooltip estilizado de la sidebar colapsada (se conservó el `title` nativo).

**Qué cambió:** `styles/responsive.css`: (1) el botón central "Registrar" del bottom nav pasa de círculo 46px con fondo plano a **pastilla 50x38** (radio lg) con el degradado de acento (el mismo de la marca "F" de NAV2.1b) y sombra teñida con `--fk-accent-border` (reemplaza un rgba hardcodeado heredado). (2) El **indicador de sección activa** pasa de `width: 44%` (crecía con el viewport) a **22px fijos**.

**Archivos tocados:** `styles/responsive.css`, `service-worker.js` (v394→v395).

**Verificación:** 2695/2695 unit + 205/205 E2E completos + lint verdes (CSS puro, sin tests nuevos: los E2E de navegación y reflow-320 cubren la barra). Visual con Playwright/Chromium a 390x844.

**Podría afectar:** solo presentación de la barra inferior móvil; la acción `registrar-abrir-hoja` y la hoja "Registrar" no cambian.

---

### feat(nav): NAV2.1b marca "F" con degradado en el sidebar + grupo diario sin rótulo · 2026-07-14

Segunda rebanada de **Navegación v2** ([ADR 040](DECISIONS/040-navegacion-v2-visual.md) D4).

**Qué cambió:** (1) `index.html`: el logo del sidebar cambia el emoji 💚 por la **marca "F"** (`.sidebar__logo-mark`); cierra el último emoji decorativo de la UI estructural (pendiente del ADR 023) y sobrevive al modo colapsado como marca mínima. El rótulo visible "Diario" del primer grupo desaparece (el mockup abre directo con los items); el nombre queda para lectores de pantalla vía `aria-label="Uso diario"` en el `role="group"`. (2) `styles/layout.css`: `.sidebar__logo-mark` (34px, radio md, degradado `--fk-accent-hover`→`--fk-accent`, tinta `--fk-text-on-accent`, sombra con `--fk-accent-border`); solo tokens, ambos temas.

**Archivos tocados:** `index.html`, `styles/layout.css`, `tests/e2e/hub-ahorros.test.js` (test del sidebar desktop actualizado: rótulos visibles = Seguimiento/Ahorros, grupo diario localizado por aria-label, marca "F" presente), `service-worker.js` (v393→v394).

**Verificación:** 2695/2695 unit (incluye el pase axe sobre `index.html`) + 205/205 E2E completos + lint verdes. Visual con Playwright/Chromium a 1280x800 en sidebar expandida y colapsada.

**Podría afectar:** solo presentación del sidebar desktop; navegación, colapso persistido y tooltips nativos intactos.

---

### feat(nav): NAV2.1a menú "Más" como hoja agrupada con tejas de dominio + toggle de tema, abre Navegación v2 · 2026-07-14

Triaje del handoff de Claude Design "Navegación v2" (bundle "Iteración de specimen", enviado por Esteban con instrucción de implementar) → **[ADR 040](DECISIONS/040-navegacion-v2-visual.md)** aceptado + iniciativa NAV2.1 con rebanadas NAV2.1a-c en el BOARD, séptima pantalla de la familia visual v2. Hallazgo del triaje: la estructura del mockup ya existe (sidebar con grupos + colapsar del ADR 024 D6, barra de 5 slots con "Registrar" central del D1, tinte por dominio de IV.2a); el delta real es el menú "Más" y dos pulidos. Decisiones: **revisa explícitamente el ADR 024 D5** (vuelven los rótulos de grupo y las 4 secciones de ahorro recuperan entrada directa; el hub NAV.B con pestañas + consolidado queda intacto), **badges de notificación diferidos** (exige decidir qué cuenta el badge; decisión de producto de Esteban), tooltip nativo de la colapsada se conserva (el estilizado del mockup se recortaría por el scroll del nav), y el sheet conserva un cierre accesible que el mockup omite.

**Qué cambió:** (1) `index.html`: `#modal-mas` reescrito como **hoja inferior**: asa, cierre discreto, grupos "Gestión del dinero" (Deudas, Mis cuentas, Me deben, Límites de gasto, Análisis) y "Ahorros" (Fondo de emergencia, Metas, Apartados, Inversión), fila final Ajustes + **botón de tema** (regresa al menú tras retirarse en una fase anterior; alterna sin cerrar la hoja, la sección Apariencia de Ajustes no cambia). (2) `styles/modals.css`: presentación de hoja reutilizable (`.modal-overlay--sheet`/`.modal--sheet`, ancla inferior + entrada deslizada; a ≤480px el bottom-sheet global existente la gobierna a propósito) + tiles horizontales `.mas-tile` con **teja teñida por el dominio** vía el mapeo `[data-section]` de IV.2a (cero mapeo nuevo; `-text` para glifos, regla IV.1) y **tile activo** con tinte 10% + borde 45%; las clases `.menu-mas__*` quedan intactas para Registrar y accesos de Inicio. (3) `modules/ui/shell.js`: `markActiveNav()` marca también `.mas-tile[data-section]` (clase + `aria-current`); `_syncThemeButton()` pasa de un solo elemento a **todos** los toggles (checkbox de Ajustes + botón del sheet con swap de glifo `#i-moon`/`#i-sun` y `aria-pressed`). (4) `modules/ui/menu-mas.js`: solo doc (cierra al navegar; el botón de tema no cierra por ser `<button>` sin href).

**Archivos tocados:** `index.html`, `styles/modals.css`, `modules/ui/shell.js`, `modules/ui/menu-mas.js`, `tests/unit/shell-nav.test.js` (nuevo, 6 tests: markActiveNav con tiles y botón "Más", sync multi-toggle con glifo y checkbox), `tests/e2e/hub-ahorros.test.js` (2 reescritos a la estructura nueva + 1 nuevo: tile activo resaltado y tema alterna sin cerrar la hoja), `service-worker.js` (v392→v393), `docs/DECISIONS/040-navegacion-v2-visual.md` (nuevo), BOARD/HANDOFF/contexto.

**Verificación:** 2695/2695 unit + 205/205 E2E completos + lint verdes. Visual con Playwright/Chromium en 390x844, ambos temas (glifo sol/luna correcto; el preview embebido congela transiciones y no sirve para screenshots: verificado el mecanismo con estilos computados y las capturas con Chromium real).

**Podría afectar:** en móvil, el menú "Más" cambia de presentación (hoja inferior) y las 4 secciones de ahorro se alcanzan con un toque directo (antes: tarjeta "Ahorros" → pestañas). El resaltado del botón "Más" (`MAS_SECTIONS`) y los deep links no cambian.

---

### feat(gastos): GAS.1c insight de gastos hormiga + empty states v2, cierra Gastos v2 completo · 2026-07-14

Tercera y última rebanada de **Gastos v2** ([ADR 039](DECISIONS/039-gastos-v2-visual.md) D4/D7). **La iniciativa queda completa** (GAS.1a-c cerradas el mismo día): Gastos es la sexta pantalla de la familia visual v2 tras Inicio (ADR 034), Mis cuentas (ADR 035), Deudas (ADR 036), Calendario (ADR 037) y Análisis (ADR 038).

**Qué cambió:** (1) `modules/dominio/gastos/view.js`: **insight de gastos hormiga** (`_renderInsightHormigas()`): pone por fin en pantalla `detectarHormigas()` (existía en `logic.js` desde TX.3 sin ninguna vista). Tarjeta con la anatomía de `.gmf-insight` (MC.18c) en tinte gastos: teja `i-lightbulb` + "Gastos hormiga: {categoría top}" + "N gastos pequeños suman $X este mes. Pequeños, pero se acumulan." Solo en la vista "Todos" (con filtro activo se oculta), solo con mes poblado; el monto respeta el ojo (D9). La comparación tangible del mockup ("más que tu recibo de luz") quedó fuera por decisión del ADR (pendiente 1: pertenece al motor de interpretación de ANL.1). (2) **Empty states v2** (D7): los dos estados pasan de `.empty-state` genérico a `.gastos-empty` con la anatomía de `.cal-empty` (CAL.4b): mes vacío → teja naranja `i-gastos` + copy ampliado del mockup ("...y verás aquí a dónde se va tu dinero") + CTA primario; filtro sin resultados → teja neutra `i-search` + CTA ghost "Ver todos" (acciones existentes, cero lógica nueva). (3) `styles/components/domain.css`: bloques `.gastos-insight*` (glifo `-text` sobre teja 15%: ~3.9:1 oscuro / ~4.1:1 claro, ≥ 3:1 umbral de glifo) y `.gastos-empty*` nuevos; `emptyArt` deja de usarse en Gastos.

**Archivos tocados:** `modules/dominio/gastos/view.js`, `styles/components/domain.css`, `tests/unit/gastos.test.js` (6 nuevos: insight con categoría top/conteo/total, sin hormigas sin tarjeta, filtro la oculta, máscara del ojo, empty de mes con teja+CTA, empty de filtro con teja neutra+Ver todos), `tests/e2e/smoke.test.js` (1 nuevo: 6 domicilios pequeños sembrados → insight visible y se oculta al filtrar; nota del test: el seed va por `addInitScript` + `reload`, un `goto` a la misma URL con hash es navegación same-document y no re-arranca la app), `tests/e2e/navegacion-render.test.js` (selector del empty state migrado a `.gastos-empty__title`), `service-worker.js` (v391→v392).

**Verificación:** 2689/2689 unit + 204/204 E2E completos + lint verdes.

**Podría afectar:** usuarios con muchos gastos pequeños de una misma categoría (≤ $20.000 c/u que suman ≥ $100.000 al mes) ven ahora una tarjeta informativa al tope de la lista que antes no existía; no altera filtros, totales ni CRUD. Los dos empty states cambian solo de presentación.

---

### feat(gastos): GAS.1b lista agrupada por día + chips con identidad + máscara de montos · 2026-07-14

Segunda rebanada de **Gastos v2** ([ADR 039](DECISIONS/039-gastos-v2-visual.md) D3/D5/D9).

**Qué cambió:** (1) `modules/dominio/gastos/logic.js`: `agruparPorDia()` pura nueva: agrupa por fecha exacta conservando el orden recibido (el caller entrega `ordenarRecientesPrimero`, así que los grupos salen del más reciente al más antiguo) con total por grupo. (2) `modules/dominio/gastos/view.js`: `renderListaGastos()` pinta **grupos por día** (`_renderGrupoDia`): encabezado con label humano (`_labelDia`: "Hoy" / "Ayer" / "Vie 11 jul", + año solo si no es el año en curso; `formateadorFecha` cacheado PERF.7a, UTC mediodía como `fechaLegible`) + **total del día** a la derecha. El subtítulo del ítem ya no repite la fecha (vive en el encabezado del grupo): quedan la descripción legacy y la nota, y la línea se omite si no hay ninguna. (3) **Máscara de la lista** (D9): con el ojo activo, el total del día y los montos de los ítems van en `SALDO_MASCARA_CUENTA`; se cierra la fuga que GAS.1a dejaba señalada (sumar los montos visibles reconstruía el total oculto del hero, la misma clase de hueco que ANL.2b cerró en Análisis). (4) **Chips con identidad** (D5): modificador `chip--gastos`; el activo deja el acento verde global y viste el patrón de la card activa del picker de estrategia (D.16b): tinte gastos 12% sobre surface + borde 50% + anillo interior + **texto primario** (el ink naranja sobre el tinte mide 4.39:1 en claro, bajo AA; el primario 11.9:1 oscuro / 15.2:1 claro; medición en el ADR, cuyo D5 se corrigió para reflejarla). (5) `styles/components/domain.css`: `.gastos-dia*` nuevos; los `.list-item` del grupo ganan radio lg + sombra en reposo **por contenedor** (mismo criterio que `#lista-ingresos` en MC.18d: la base compartida de atoms no cambia).

**Archivos tocados:** `modules/dominio/gastos/logic.js`, `modules/dominio/gastos/view.js`, `styles/components/domain.css`, `docs/DECISIONS/039-gastos-v2-visual.md` (D5 corregido con la medición), `tests/unit/gastos.test.js` (11 nuevos: 5 de `agruparPorDia`, 6 de la vista: grupo "Hoy" con total, dos días dos grupos con formato humano, máscara de día e ítems, subtítulo sin fecha, sin subtítulo vacío, chips con identidad), `tests/e2e/smoke.test.js` (1 nuevo: dos gastos de hoy → grupo "Hoy" con total $117.000 y máscara del ojo), `service-worker.js` (v390→v391).

**Verificación:** 2683/2683 unit + 203/203 E2E completos + lint verdes.

**Podría afectar:** el subtítulo de los ítems de Gastos ya no muestra la fecha (la porta el encabezado del día); un gasto sin nota ni descripción legacy muestra solo la categoría. Los montos de la lista ahora respetan el ojo de privacidad. La vista completa de Movimientos (TX.8b) no cambió: sigue plana con su propio formato.

---

### feat(gastos): GAS.1a hero del mes con total protagonista + comparativo + ojo, abre Gastos v2 · 2026-07-14

Triaje del handoff de Claude Design "Gastos v2" (bundle "Iteración de specimen", enviado por Esteban con instrucción de implementar) → **[ADR 039](DECISIONS/039-gastos-v2-visual.md)** aceptado + iniciativa "Gastos v2" con rebanadas GAS.1a-c en el BOARD, sexta pantalla de la familia visual v2. Decisiones de triaje del ADR: el **FAB del mockup no se implementa** (duplicaría el botón central "Registrar" del ADR 024, que el artboard del mockup no tiene; si Esteban lo prefiere, la decisión formal es suya), la búsqueda del header queda fuera (funcionalidad nueva sin decisión de diseño) y el comparativo usa el criterio único IV.3/ADR 038 D4 en vez del ámbar del mockup. Primera rebanada implementada (D1+D2+D9-hero).

**Qué cambió:** (1) `modules/dominio/gastos/view.js`: `renderFiltrosGastos()` reescrita: la barra "‹ Mes ›" suelta y la franja fina de resumen (`_renderResumen`, retirada junto con el conteo "8 gastos") pasan a un **hero de familia v2** (`_renderHeroGastos()`): navegación de mes integrada arriba (mismas acciones `gastos-prev-mes`/`gastos-next-mes`), label contextual ("Gastaste este mes", o "Gastaste en {categoría}" con filtro activo) y **total protagonista de lo visible** (clamp ~38px mono extrabold, tabular-nums). Sexto consumidor del estreno parcial del ADR 033 (degradado de identidad gastos 15% + borde 28% + sombra en reposo). (2) **Chip comparativo** (`_renderComparativo()` + `variacionMensualGasto()` pura en `logic.js`): "8% menos que junio" con `i-trending-down` en verde (`.chip-success` de atoms) solo cuando el gasto baja; al subir queda **neutro con `i-trending-up`** (criterio IV.3/ADR 038 D4, nunca alarmante); "Igual que {mes}" sin ícono si no hubo cambio; oculto con filtro activo, mes visible vacío o sin base (mes anterior en 0, internas TX.8b excluidas de la base). (3) **Ojo de privacidad** (D9): sexto consumidor del flag único `S.config.ocultarSaldo` (IN.2); acción nueva `gastos-saldo-visibilidad` en `index.js` (espejo de `agenda-saldo-visibilidad`); enmascara el total con `SALDO_MASCARA` (la máscara de la lista llega con GAS.1b). El ojo vive en una grilla `[espaciador | nav | ojo]` en vez del absoluto de los demás heroes: misma posición visual top-right, sin colisión con la nav centrada a 320px. (4) `styles/components/domain.css`: bloque `.hero-gastos*` nuevo (contraste método IV.1 contra la parada fuerte del degradado: oscuro #3b2c2c primario 11.15:1 / secundario 5.67:1; claro #ffede7 14.83:1 / 7.51:1); `.mes-nav*` y `.gastos-resumen*` retirados (solo Gastos los usaba); `.hero-gastos__ojo` sumado al grupo compartido de ojos.

**Archivos tocados:** `docs/DECISIONS/039-gastos-v2-visual.md` (nuevo), `docs/BOARD.md`, `modules/dominio/gastos/view.js`, `modules/dominio/gastos/logic.js`, `modules/dominio/gastos/index.js`, `styles/components/domain.css`, `tests/unit/gastos.test.js` (17 nuevos: 7 de `variacionMensualGasto`, 10 del hero: total y label, nav dentro del hero, filtro recalcula, verde al bajar, neutro al subir, internas fuera de la base, sin base sin chip, filtro oculta comparativo, máscara del ojo, mes vacío), `tests/e2e/smoke.test.js` (1 nuevo: hero con total + toggle del ojo), `service-worker.js` (v389→v390).

**Verificación:** 2672/2672 unit + 202/202 E2E completos + lint verdes.

**Podría afectar:** solo presentación de la cabecera de Gastos (filtros, orden de lista, form y CRUD intactos). El conteo "N gastos" de la franja vieja ya no se muestra. El total del mes ahora respeta el ojo de privacidad (antes Gastos era la única sección de la familia sin máscara); los montos de los ítems se enmascaran en GAS.1b.

---

### feat(analisis): ANL.2d filas colapsables limpias + empty state único, cierra Análisis v2 completo · 2026-07-13

Cuarta y última rebanada de **Análisis v2** ([ADR 038](DECISIONS/038-analisis-v2-visual.md) D5/D7). **La iniciativa queda completa** (ANL.2a-d cerradas el mismo día): Análisis es la quinta pantalla de la familia visual v2 tras Inicio (ADR 034), Mis cuentas (ADR 035), Deudas (ADR 036) y Calendario (ADR 037).

**Qué cambió:** (1) `modules/dominio/analisis/view.js`: los `summary` de los dos colapsables ("Más detalle de tus gastos" y "Estado de tu renta") pasan de encabezado con emoji a **fila limpia**: teja pizarra con ícono existente (`i-bar-chart` / `i-percent`, cero íconos nuevos por el criterio del ADR 037), título, **subtítulo con el contenido** ("Vs mes anterior · patrón semanal · hormigas" / "5 criterios DIAN · topes por UVT") y el chevron `::after` que ya existía. Renta suma un **badge contador ámbar** con los criterios en alerta (`cerca` + `supera`) + texto `sr-only`, para que lo colapsado no esconda lo urgente; la apertura automática cuando hay alerta se conserva, y el **cuerpo interno de los colapsables no se rediseña** (decisión D5 del doc de diseño). (2) **Empty state único** (D7): sin gastos registrados, sin activos, sin deudas **y sin señal fiscal**, `renderAnalisis()` corto-circuita a `_renderEmptyAnalisis()`: teja pizarra `i-analisis`, "Aún no hay suficientes datos", explicación y CTA "+ Registrar un gasto" (acción global `nuevo-gasto`). Los datos de renta manuales (Ajustes → Datos de renta) y los flags del perfil fiscal cuentan como datos: el monitor K.3 tiene contenido real para ese usuario y no se esconde tras un "sin datos" (refinamiento dentro del espíritu del D7: "con datos parciales, el panel se muestra"). (3) `styles/components/analysis.css`: modificador `.analisis-grupo--fila` (superficie v2 + sombra en reposo) + `.analisis-grupo__teja/__texto/__title/__sub/__badge` nuevos; la base `.analisis-grupo` quedó **intacta** porque el desglose de Límites (`.grupo-card__desglose`) la reutiliza. `.analisis-empty*` con el mismo lenguaje de `.cal-empty` (CAL.4b): borde punteado de invitación, teja de sección. PERF.2/PERF.3 intactos (el diferimiento por `toggle` y su listener no cambiaron).

**Archivos tocados:** `modules/dominio/analisis/view.js`, `styles/components/analysis.css`, `tests/unit/analisis.test.js` (6 nuevos: empty state con CTA y sin cards, datos parciales muestran el panel, señal fiscal evita el empty, fila del detalle con teja/título/subtítulo, fila de renta sin badge sin alertas, badge con criterio cerca del tope; la aserción de PERF.3 que usaba "Vs mes anterior" como marcador de cuerpo pintado pasó a `comparacion__tabla` porque ese texto ahora vive en el subtítulo del summary, misma intención; fixtures "todo vacío" de ANL.2a y PERF.7d ajustados con el dato mínimo para escapar del empty state sin alterar lo que verifican), `tests/e2e/smoke.test.js` (1 nuevo: usuario sin datos ve un único empty state y el CTA abre el modal de gasto), `service-worker.js` (v388→v389).

**Verificación:** 2655/2655 unit + 201/201 E2E completos + lint verdes.

**Podría afectar:** usuarios recién llegados a Análisis sin ningún dato ven ahora una sola invitación en vez de la pila de secciones con vacíos parciales (score crítico "vacío", patrimonio en ceros). El monitor de renta ya no es visible con la app totalmente vacía (antes se dibujaba con sus 5 criterios "Sin datos en Finko"); reaparece con cualquier dato real o señal fiscal manual.

---

### feat(analisis): ANL.2c "A dónde va tu dinero", tendencia con chip + categorías rankeadas · 2026-07-13

Tercera rebanada de **Análisis v2** ([ADR 038](DECISIONS/038-analisis-v2-visual.md) D3/D4).

**Qué cambió:** (1) `modules/dominio/analisis/view.js`: tendencia y categorías dejan de ser dos secciones sueltas con `h2` propios y pasan a **dos cards bajo el rótulo "A dónde va tu dinero"** (`.analisis__group-label`, patrón `.bento__group-label` de Inicio v2). (2) `_renderTendencia()`: la variación sale de la grilla de stats y pasa a **chip** en la cabecera de la card, con ícono `i-trending-up/down` + texto; **verde solo cuando el gasto baja** (`↓ 25% vs mes anterior`), neutro si sube, neutro sin ícono sin base de comparación o sin cambio (D4, re-declara ADR 019/IV.3 explícitamente en el markup). El sparkline pasa del verde acento al **pizarra de sección** (`--fk-dom-analisis-text`: la serie es contexto, el color con significado lo aporta el dato); las stats quedan en 3 tiles (Este mes / Máximo / Mínimo). (3) `_renderPorCategoria()` (firma nueva `(gastoMes, segmentos)`): dona de 120 con **el top al centro** ("Top · Mercado · 67%") + **filas rankeadas construidas desde los mismos segmentos coloreados de la dona** (color·nombre·%·monto); la leyenda y la lista completa de barras eran dos representaciones paralelas de lo mismo y se unifican en una sola lista (la paleta unificada dona↔filas queda garantizada por construcción); el total del mes ancla la cabecera. (4) CSS: `.analisis__group*`, `.tend-card*`, `.catg-card*` nuevos en `analysis.css`; `charts.css` conserva solo los primitivos (`.sparkline`, `.chart-axis*`, `.donut`; el wrap del sparkline pierde su chrome de card: la tend-card ya es la superficie); `.chart-stats/.chart-stat*/.chart-legend*/.chart-donut-wrap/.analisis__cat-layout/.cat-row*/.cat-list` retirados (solo Análisis los usaba, verificado); referencias migradas en `base.css` (tabular-nums) y `responsive.css` (reglas móviles de `.chart-stats`/`.cat-row` retiradas).

**Archivos tocados:** `modules/dominio/analisis/view.js`, `styles/components/analysis.css`, `styles/components/charts.css`, `styles/base.css`, `styles/responsive.css`, `tests/unit/analisis.test.js` (5 nuevos: rótulo del grupo, chip verde al bajar con ícono, chip neutro al subir, 3 stats, total + top al centro; el describe de paleta unificada se reescribió a la estructura nueva: fila i = color del arco i), `tests/e2e/smoke.test.js` (1 nuevo), `service-worker.js` (v387→v388).

**Verificación:** 2649/2649 unit + 200/200 E2E completos + lint verdes.

**Podría afectar:** solo presentación de tendencia y categorías (la lógica `serieGastosMensual`/`seriePorCategoria`/`colorearSegmentos` no cambió). La lista de categorías ahora muestra los 6 segmentos de la dona (top 5 + "Otros") en vez de todas las categorías con barras: el detalle completo por categoría sigue en "Más detalle de tus gastos" (comparación vs mes anterior).

---

### feat(analisis): ANL.2b patrimonio neto como card-héroe con composición + ojo de privacidad · 2026-07-13

Segunda rebanada de **Análisis v2** ([ADR 038](DECISIONS/038-analisis-v2-visual.md) D2).

**Qué cambió:** (1) `modules/dominio/analisis/view.js`: `_renderPatrimonio()` reescrita: la pila "hero + 2 metric-cards" pasa a **una sola card** (`.patri-card`) con teja pizarra (`i-saldo`) + kicker, cifra grande del neto (verde si ≥ 0 con `--fk-text-accent`, rojo `--fk-danger-text` si < 0; deber más de lo que se tiene sí es una alerta real, no viola ADR 019), leyenda "activos - pasivos", **barra de composición de activos** (`_BUCKETS_ACTIVOS`: Cuentas/Metas/Apartados/Inversión, solo buckets > 0, cada segmento con el color crudo de su dominio ADR 031; decorativa `aria-hidden`) y dos columnas compactas Activos / Pasivos. Los **porcentajes de composición van en texto** en la columna de Activos ("Cuentas 61% · Metas 12% · Inversión 27%"): la barra nunca es la única portadora del dato (SC 1.4.11); reemplazan a los montos por bucket que mostraba la card vieja (cada monto exacto vive en su propia sección). El aviso de deudas sin saldo se conserva. (2) **Ojo de privacidad** (IN.2): quinto consumidor del flag único `S.config.ocultarSaldo`; máscara larga para el neto (`SALDO_MASCARA`), corta para Activos/Pasivos (`SALDO_MASCARA_CUENTA`); los porcentajes no se enmascaran (proporción no revela montos, mismo criterio que la barra del hero de agenda). Acción nueva `analisis-saldo-visibilidad` en `analisis/index.js` (espejo de `agenda-saldo-visibilidad`; nota de cabecera del módulo actualizada: sigue sin mutar datos financieros). (3) `styles/components/analysis.css`: bloque `.patri-card*` reemplaza a `.patrimonio-hero*` y `.metric-*` (solo Análisis los usaba, verificado); superficie neutra + `--fk-shadow-sm` (la identidad semántica vive en el signo del neto). `styles/components/domain.css`: `.patri-card__ojo` se suma al grupo compartido de ojos (posición estable, ADR 034 D3). `styles/base.css`/`styles/responsive.css`: referencias `metric-card__value`/`patrimonio-hero__valor` migradas a las clases nuevas; las reglas móviles de `.metric-grid`/`.patrimonio-hero` se retiran (la card nueva es 2 columnas fijas y padding único).

**Archivos tocados:** `modules/dominio/analisis/view.js`, `modules/dominio/analisis/index.js`, `styles/components/analysis.css`, `styles/components/domain.css`, `styles/base.css`, `styles/responsive.css`, `tests/unit/analisis.test.js` (5 nuevos: positivo con columnas, negativo con signo, composición con porcentajes en texto, sin activos sin barra, máscara integral + porcentajes visibles), `tests/e2e/smoke.test.js` (1 nuevo: toggle del ojo enmascara y desenmascara), `service-worker.js` (v386→v387).

**Verificación:** 2645/2645 unit + 199/199 E2E completos + lint verdes.

**Podría afectar:** solo presentación del patrimonio (la lógica `calcularActivos`/`calcularPasivos`/`calcularPatrimonioNeto` no cambió). Quien tenga el ojo activo ahora ve enmascarado también el patrimonio de Análisis (antes quedaba visible: era una fuga del control de privacidad IN.2, la misma clase de hueco que CAL.4c cerró en Calendario). Los montos por bucket de activos dejan de mostrarse en esta card (los reemplaza el porcentaje; el monto exacto vive en su sección).

---

### feat(analisis): ANL.2a score de salud como héroe + chip de mes, abre Análisis v2 · 2026-07-13

Triaje del handoff de Claude Design "Análisis v2" (bundle "Iteración de specimen", enviado por Esteban con instrucción de implementar) → **[ADR 038](DECISIONS/038-analisis-v2-visual.md)** aceptado + iniciativa "Análisis v2" con rebanadas ANL.2a-d en el BOARD, quinta pantalla de la familia visual v2. El ADR declara la relación con ANL.1 (avanza sus puntos visuales 4/5/7/8; la interpretación sigue allá) y conserva PERF.2/PERF.3 intactos. Primera rebanada implementada (D1+D6).

**Qué cambió:** (1) `modules/dominio/analisis/view.js`: `_renderScoreSalud()` reescrita como **hero** con wash del color de la banda (no del pizarra de sección: el color es el dato): anillo `progressRing` de 132px con el score y "de 100" en overlay HTML, pill de banda (ícono + texto), factores 2×2 (`_FACTORES_SCORE`) con mini-barras en el color de banda (dentro del hero el dato semántico manda; las barras por dominio de IV.2b siguen fuera de él), y **frase humana** vía `_fraseScore()` que nombra el factor más débil real ("Atención a tu liquidez: es lo que más está frenando tu score."), reemplazando el desglose técnico "Deuda 80/100 • ..." redundante con las barras; las frases fijas por banda del mockup se descartaron por ser datos demo (podían ser falsas para el usuario concreto, ADR 038). (2) **Chip de mes** (D6): Análisis es de solo lectura y su header no lleva botón `+`; el chip ghost (`#analisis-chip-mes`, `i-agenda`) ancla el mes analizado; `renderAnalisis()` escribe el nombre (`_MESES` local, duplicación deliberada por ADN 10). (3) `styles/components/analysis.css`: `.score-hero*` reemplaza `.score-card*` (wash `color-mix` banda 14% sobre surface + borde 30% + sombra en reposo, quinto consumidor del estreno parcial del ADR 033); `--score-banda` pinta superficies y `--score-banda-ink` (variantes `-text`) pinta trazos; el texto del pill va en `--fk-text-primary` porque el ink apilado sobre el wash cae bajo AA (medido: crítica oscuro 3.70, ajustada claro 4.05); `progress-bar--score-*` y `.score-factor__bar` sobreviven (los usan los criterios de renta K.3). (4) `styles/layout.css`: `.section__chip` nuevo (genérico para secciones de solo lectura).

**Contraste (método IV.1):** primary/secondary sobre la parada fuerte del wash ≥ 5.49 en ambos temas y las 4 bandas; arco del anillo y mini-barras vs wash ≥ 4.43 (supera el 3:1 no textual), con el valor numérico siempre al lado (SC 1.4.11).

**Archivos tocados:** `modules/dominio/analisis/view.js`, `index.html` (chip del header), `styles/components/analysis.css`, `styles/layout.css`, `tests/unit/analisis.test.js` (6 nuevos: banda + pill con ícono, score en el anillo, 4 factores con valor junto a la barra, frase del factor más débil, refuerzo en excelente, chip de mes), `tests/e2e/smoke.test.js` (1 nuevo: hero + anillo + pill + 4 factores + chip con datos sembrados), `service-worker.js` (v385→v386).

**Verificación:** 2640/2640 unit + 198/198 E2E completos + lint verdes.

**Podría afectar:** solo presentación del score (la lógica `calcularScoreSalud`/`clasificarScore` no cambió). Quien lea el texto de explicación del score verá la frase humana nueva en vez del desglose técnico.

---

### feat(agenda): CAL.4c detalle del día accionable, cierra Calendario v2 completo · 2026-07-13

Tercera y última rebanada de **Calendario v2** ([ADR 037](DECISIONS/037-calendario-v2-visual.md) D4/D5/D7). **La iniciativa queda completa** (CAL.4a-c cerradas el mismo día): Calendario es la cuarta pantalla de la familia visual v2 tras Inicio (ADR 034), Mis cuentas (ADR 035) y Deudas (ADR 036).

**Qué cambió:** (1) `modules/dominio/agenda/view.js`: `_renderDetalleDia()` calcula si todos los compromisos del día están completos (`estadoPagoMes`) y el label del total cambia "Total a pagar" (neutro) → **"Pagado este día"** (verde, `.cal-detail__total--pagado`; refuerzo positivo, ADR 019); un día mixto sigue en "Total a pagar". `_renderDetalleItem()`: el badge de pagado pasa de línea de texto "✓ ..." a **pill verde con `i-check-circle`**; el estado **parcial se preserva** ("Abonado $X de $Y este mes") como pill neutra tabular (mandato explícito del doc de diseño); los CTA dejan `.btn-primary` (verde genérico) por `.cal-detail__cta--<tipo>` con la identidad del tipo: **Marcar pagado** índigo agenda, **Abonar** frambuesa (entidad) / rosa (personal), mismo criterio que `.deuda-card__abonar` (ADR 036 D5: un abono no es un ingreso); Editar y Eliminar quedan intactos (mismas acciones ghost). `_renderDetalleItemIngreso()`: el recordatorio de apartar (ADR 021) pasa de línea de texto a **callout verde `.cal-detail__callout-ingreso`** con `i-lightbulb`, a ancho completo de la tarjeta; el CTA Distribuir sigue `btn-primary` (verde correcto: es dinero que entra). (2) **Máscara D7**: el ojo del hero enmascara ahora también el total del día (`SALDO_MASCARA`), los montos por item, el monto del ingreso y el badge parcial (`SALDO_MASCARA_CUENTA`, mismo criterio que IN.8c). (3) `styles/components/config.css`: pills de estado, callout de ingreso, `.cal-detail__cta*` (38px de alto, hit AA) y borde por tipo al 20% en `.cal-detail__item--*` (decorativo: el tipo lo porta el texto, SC 1.4.11); **`.cal-detail__badge-abono` y `.cal-detail__actions` migraron de `domain.css` a `config.css`**, junto al resto de la familia `.cal-detail__*` (navegabilidad; la animación `check-pop` sigue en forms.css).

**Archivos tocados:** `modules/dominio/agenda/view.js`, `styles/components/config.css`, `styles/components/domain.css` (bloques retirados con nota), `tests/unit/agenda.test.js` (8 nuevos: label neutro/pagado/mixto, pill con ícono y sin CTA, parcial preservado con CTA, clases de CTA por tipo + Editar/Eliminar intactos, callout de ingreso, máscara integral del detalle), `tests/e2e/smoke.test.js` (1 nuevo: día pagado muestra "Pagado este día" + pill; día pendiente muestra Abonar con la clase de su tipo), `service-worker.js` (v384→v385).

**Verificación:** 2634/2634 unit + 197/197 E2E completos + lint verdes.

**Podría afectar:** solo presentación del detalle del día; los `data-action` (`agenda-marcar-pagado-fijo`, `abrir-abono`, `agenda-distribuir-ingreso`, editar/eliminar) no cambiaron. Quien tenga el ojo de privacidad activo ahora ve enmascarados también los montos del detalle del calendario (antes quedaban visibles: era una fuga del control de privacidad IN.2).

---

### feat(agenda): CAL.4b grilla legible + selección índigo + empty state del mes · 2026-07-13

Segunda rebanada de **Calendario v2** ([ADR 037](DECISIONS/037-calendario-v2-visual.md) D2/D3/D6).

**Qué cambió:** (1) `styles/components/config.css`: `.cal-day` pasa a celda cuadrada con contenido centrado (`aspect-ratio: 1`, piso táctil 44px AA, techo 72px para que el grid no crezca desmedido en desktop) y **fondo transparente en reposo** (antes cada celda llevaba `--fk-bg-elevated`; la card ya es la superficie, la celda solo se pinta en hover y en los estados hoy/seleccionado); `.cal-day--selected` cambia de borde neutro `--fk-text-primary` (se confundía con "hoy") a **anillo índigo de sección** (`--fk-dom-agenda-text` + tinte `--fk-dom-agenda` al 16%; variante `-text` porque el token crudo falla el umbral no textual 3:1 en tema claro, mismo criterio que `cal-dot--*` en IV.2c); días pasados bajan de opacidad 0.55 a 0.5; `.cal-card` gana `--fk-shadow-sm` (sombra en reposo, ADR 033); bloque `.cal-empty*` nuevo (borde punteado, teja índigo de 48px con `i-agenda`); la media query móvil de `.cal-day` queda solo con la tipografía (el piso táctil ya vive en la regla base). (2) `modules/dominio/agenda/view.js`: `_renderGrid()` pinta la fila `.cal-day__dots` **siempre** (vacía y `aria-hidden` si el día no tiene eventos, `min-height: 6px`) para que el número quede a la misma altura en todas las celdas del grid centrado; `_renderCabecera()` gana el parámetro `eventosIng` y el subtítulo separa compromisos de ingresos ("2 compromisos este mes · 1 ingreso"; el día de ingreso no es un pago, ADR 021); `_renderEmptyMes()` nuevo (ADR 037 D6), renderizado al final del panel cuando `totalEventosDelMes(eventos) === 0`: "<Mes> está despejado" + "Programa tus gastos fijos y deudas para no perder ningún pago" + CTA `+ Agregar gasto fijo` (`data-action="nuevo-gasto-fijo"` existente). La grilla sigue visible en mes vacío y los días vacíos siguen clickeables (CAL.3 intacta: el empty state convive con el detalle "Sin compromisos ni ingresos este día").

**Archivos tocados:** `styles/components/config.css`, `modules/dominio/agenda/view.js`, `tests/unit/agenda.test.js` (6 nuevos: subtítulo con/sin ingresos, empty state con CTA, sin empty state con un solo ingreso, convivencia con CAL.3, fila de dots en todas las celdas), `tests/e2e/smoke.test.js` (1 nuevo: mes vacío muestra la card y el CTA abre el modal de gasto fijo), `service-worker.js` (v383→v384).

**Verificación:** 2626/2626 unit + 196/196 E2E completos + lint verdes.

**Podría afectar:** solo presentación del grid del calendario y el bloque nuevo de mes vacío. El test E2E de reflow a 320px y las suites de Agenda pasan sin cambios; los `data-action` y clases `cal-day--*` que consumen los E2E existentes no cambiaron de nombre.

---

### feat(agenda): CAL.4a hero del mes con total + progreso pagado + ojo de privacidad · 2026-07-13

Primera rebanada de la iniciativa **Calendario v2** ([ADR 037](DECISIONS/037-calendario-v2-visual.md), aceptado en esta misma sesión tras el triaje del handoff de Claude Design "Iteración de specimen" enviado por Esteban). El mes ahora responde de un vistazo "¿cuánto me sale y cuánto llevo pagado?": hero al tope de `#panel-agenda`, cuarto consumidor del estreno parcial del ADR 033 (degradado de identidad índigo + sombra en reposo), con la misma anatomía que los heroes de Mis cuentas (MC.18a) y Deudas (D.16a).

**Qué cambió:** (1) `modules/dominio/agenda/logic.js`: `totalesDelMes(eventos, gastos, prefijoMes)` nuevo (puro): `total` suma cada aparición de compromiso del mes (`monto` fijos / `cuotaMensual` deudas, criterio de `totalDia`: un quincenal cuenta dos veces, los ingresos no son dinero a pagar, montos no positivos no suman); `pagado` cruza gastos por `compromisoId` + prefijo del mes (criterio de `calcularAbonosDelMes`, duplicado intencional ADN #10) con tope en lo adeudado por compromiso (pagar de más no infla el progreso). (2) `modules/dominio/agenda/view.js`: `_renderHeroMes()` con variante poblada (label "Compromisos de <mes>", total 38px tabular, barra de progreso decorativa `aria-hidden` con relleno acento verde: pagar es avance, no identidad de sección; caption "Pagado $X / Falta $Y") y variante "Sin pagos programados" (mes sin compromisos con monto, aunque tenga ingresos: guía sin cifra, sin barra y sin ojo, disciplina ADR 034/035). (3) `modules/dominio/agenda/index.js`: acción `agenda-saldo-visibilidad` (flip de `S.config.ocultarSaldo` + `save()` + `updSaldo()`, mismo flag de toda la app IN.2) y el listener de `state:change` ahora incluye `gastos` (el pagado del hero y los badges del detalle lo leen; antes la ficha lo daba por hecho pero el listener no lo incluía). (4) `styles/components/config.css`: bloque `.hero-agenda*` (contraste WCAG medido contra la parada fuerte del degradado: oscuro #282d44 → primario 11.39:1, secundario 5.79:1, acento 7.55:1; claro #eaedfd → 14.44:1, 7.31:1, 5.69:1). (5) `styles/components/domain.css`: `.hero-agenda__ojo` sumado a la lista compartida de ojos de hero.

**Archivos tocados:** `modules/dominio/agenda/logic.js`, `modules/dominio/agenda/view.js`, `modules/dominio/agenda/index.js`, `styles/components/config.css`, `styles/components/domain.css`, `tests/unit/agenda.test.js` (16 nuevos: 9 de `totalesDelMes`, 7 del hero), `tests/e2e/smoke.test.js` (3 nuevos: total/progreso, ojo con persistencia del flag vía `expect.poll` por el debounce de `save()`, variante sin pagos), `service-worker.js` (v382→v383).

**Verificación:** 2620/2620 unit + 195/195 E2E completos + lint verdes.

**Podría afectar:** el tope de la sección Calendario (bloque nuevo, el resto del panel no cambia de estructura) y la frecuencia de re-render de agenda (ahora también con `state:change` de `gastos`; `renderSmart` solo pinta con la sección visible). El ojo comparte flag con Inicio/Mis cuentas/Deudas: ocultar en Calendario oculta en toda la app (comportamiento buscado, IN.2).

---

### feat(apartados): CAT.1b plantillas de Apartados curadas según la taxonomía Apartados↔Metas · 2026-07-13

Segunda rebanada de implementación de **CAT.1** (`docs/BOARD.md`), Apartados↔Metas. `PLANTILLAS_APARTADO` pasa de 17 a 20 plantillas.

**Qué cambió (`modules/dominio/apartados/logic.js`):** sale **Vacaciones** ✈️ (ya vive en `CATEGORIAS_META`). "Matrícula o semestre" se divide: la plantilla queda como **"Matrícula escolar"** 🎓 (colegio anual o semestral, gasto esporádico); el semestre universitario se planea como Meta (categoría Educación ya existe ahí). "Útiles escolares" se amplía a **"Útiles y uniformes"** 🎒. Entran **Veterinario** 🩺, **Mantenimiento del hogar** 🛠️, **Seguro del hogar** 🛡️ y **Reparaciones inesperadas** 🧰 (catálogo de esporádicos olvidables definido por Esteban).

**Hallazgo de la rebanada:** a diferencia de `CATEGORIA_ICONO` (Gastos), un apartado ya creado no referencia `PLANTILLAS_APARTADO` en su render: `_aplicarPlantilla()` copia `nombre`/`icono` una sola vez al crear el apartado. Retirar o renombrar una plantilla es seguro para los apartados existentes (conservan su nombre/ícono guardado); la plantilla retirada solo deja de ofrecerse para apartados nuevos. Ningún cambio en `_aplicarPlantilla()` ni `renderFormApartado()` (agnósticos al contenido del catálogo).

**Archivos tocados:** `modules/dominio/apartados/logic.js` (`PLANTILLAS_APARTADO`), `tests/unit/apartados.test.js` (6 tests actualizados/nuevos: conteo 17→20, exclusión de Vacaciones/Matrícula o semestre/Útiles escolares, presencia de las 4 nuevas), `service-worker.js` (v381→v382).

**Verificación:** 2604/2604 unit + 192/192 E2E completos + lint verdes.

**Podría afectar:** solo las plantillas rápidas ofrecidas al crear un apartado nuevo. Apartados existentes creados desde cualquier plantilla (incluidas las retiradas o renombradas) no cambian de nombre ni ícono.

---

### feat(gastos): CAT.1a Gastos ya no ofrece Vivienda ni Servicios públicos, hint retirado · 2026-07-13

Primera rebanada de implementación de **CAT.1** (`docs/BOARD.md`), tras la validación de taxonomía de la misma sesión. Gastos↔Fijos: Vivienda y Servicios públicos salen del formulario de Gastos (siempre recurrentes con fecha fija, viven solo en Agenda) y el hint no bloqueante "esta categoría suele ser un gasto fijo" se retira por completo, revisando la decisión 4 del ADR 014 ("nudge, no muro"): Finko decide en vez de avisar.

**Qué cambió:** (1) `modules/core/constants.js`: `CATEGORIAS_GASTO_USUARIO` (filtro del formulario) excluye ahora también 'Vivienda' y 'Servicios públicos', sumándose a las ya excluidas (Deudas, Ahorro, Alimentación). `CATEGORIAS_GASTO` (catálogo base) las conserva intactas: `CATEGORIA_ICONO` y la validación de categorías de `presupuesto/logic.js` siguen resolviendo bien los gastos y límites ya guardados con esas categorías (mismo precedente que "Alimentación" v15, sin bump de schema). `CATEGORIAS_TIPICAMENTE_FIJAS` (el Set que impulsaba el hint) se elimina. (2) `modules/dominio/gastos/view.js`: `renderFormGasto()` ya no renderiza `<p id="hint-categoria-fija">`. (3) `modules/dominio/gastos/index.js`: `_montarFormGasto()` ya no adjunta el listener de `change` que mostraba/ocultaba el hint; import muerto retirado.

**Archivos tocados:** `modules/core/constants.js`, `modules/dominio/gastos/view.js`, `modules/dominio/gastos/index.js`, `tests/unit/gastos.test.js` (2 tests viejos que afirmaban lo contrario del hint se reescriben, 4 tests nuevos), `service-worker.js` (v380→v381).

**Verificación:** 2600/2600 unit + 192/192 E2E completos + lint verdes.

**Podría afectar:** solo el formulario de nuevo gasto/edición de gasto. Gastos existentes con categoría "Vivienda" o "Servicios públicos" (incluidos los generados al pagar un fijo, TX.6/TX.7) siguen mostrando su ícono y su nombre sin cambios; solo dejan de ofrecerse como opción nueva. Los límites de gasto (`presupuesto`) que ya referencian esas categorías no se ven afectados (`CATEGORIAS_GASTO` intacto).

---

### docs(taxonomia): CAT.1 taxonomía global validada con Esteban, ADR 014 aceptado y ADR 029 D3 confirmada · 2026-07-13

Primer paso de **CAT.1** (`docs/BOARD.md`): sesión de validación de taxonomía con Esteban, una sola decisión para los tres documentos que cubrían la misma pregunta (ADR 014 en Propuesta desde junio, ADR 029 sección D3, criterios de la tarjeta CAT.1), como exigía el hallazgo del triaje del 2026-07-08. Solo documentación, sin código.

**Decisiones validadas:** (1) **Gastos↔Fijos**: Vivienda y Servicios públicos salen del formulario de Gastos y el hint "normalmente pertenece a fijos" (`CATEGORIAS_TIPICAMENTE_FIJAS` + `#hint-categoria-fija`) se retira por completo; esto **revisa la decisión 4 del ADR 014** ("nudge, no muro"), conflicto señalado explícitamente y ratificado por Esteban (regla 2.7). Educación queda en ambas secciones sin hint (doble cara real); Mercado, Transporte y Mascotas quedan duales. (2) **Apartados↔Metas**: sale Vacaciones (ya vive en Metas); "Matrícula o semestre" se divide (la plantilla queda como "Matrícula escolar", el semestre universitario se planea como Meta); entran Veterinario, Mantenimiento del hogar, Seguro del hogar y Reparaciones inesperadas; "Útiles escolares" se amplía a "Útiles y uniformes". (3) **Metas**: sale "Cumpleaños" y "Vacaciones"/"Viajes" se fusionan en "Viajes". (4) **Fijos no esenciales** (para LIM.1 punto 8): solo Streaming y Suscripciones; Gimnasio y Telefonía quedan esenciales (ajuste de Esteban sobre la propuesta). (5) **ADR 029 D3**: la tabla de 13 tags validada tal cual; la Fase 0 de ese ADR queda desbloqueada. **Hallazgo de la sesión:** no hace falta bump de schema (precedente "Alimentación" v15: filtrar del formulario conservando la entrada de ícono), lo que baja el modelo de implementación de Opus 4.8 - Extra a Sonnet 5 - Medio por rebanada.

**Archivos tocados:** `docs/DECISIONS/014-taxonomia-categorias-transversal.md` (Estado → Aceptada + sección "Validación 2026-07-13"), `docs/DECISIONS/029-catalogo-de-marcas-por-categoria.md` (Estado → Aceptada, D3 validada), `docs/contexto/transversal.md` (bloque nuevo "Taxonomía global de categorías"), `docs/BOARD.md` (CAT.1 re-cortada en CAT.1a-c; nota del punto 8 de LIM.1 actualizada), `docs/HANDOFF.md`.

**Podría afectar:** nada en runtime. Define el catálogo que CAT.1a-c implementarán y desbloquea CAT.3, el catálogo de AP.5, el punto 8 de LIM.1 y la Fase 0 del ADR 029.

---

### feat(transversal): CAT.2f selector de ícono en Gasto fijo/Calendario, sexto consumidor, cierra CAT.2 completa · 2026-07-13

Cierra **CAT.2f** (`docs/BOARD.md`), sexta y última rebanada del picker de ícono compartido: **Gasto fijo/Calendario** migrado (categoría "Otro"). Con esta rebanada **la iniciativa CAT.2 queda completa** (CAT.2a-f).

**Análisis previo (misma sesión, triaje 2.7):** la tarjeta señalaba una decisión bloqueante (alcance mínimo vs. categorías personalizadas completas, cruzada con la taxonomía de CAT.1 aún sin validar). Pregunta directa a Esteban: **alcance mínimo**, mismo patrón que CAT.2d/2e, sin esperar CAT.1. Las categorías nombradas nuevas (no solo el ícono de "Otro") quedan para CAT.3.

**Qué cambió:** (1) `agenda/view.js`: `renderFormGastoFijo()` agrega el grupo `#form-group-gfijo-icono` con `renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'gfijo-icono' })`, oculto por defecto; `_renderDetalleItem()` resuelve `c.icono` antes que `CATEGORIA_AGENDA_ICONO[c.categoria]` (mismo patrón que la teja de Deudas, CAT.2d). (2) `agenda/index.js`: el form se re-renderiza completo en cada apertura (`_inyectarFormGastoFijo()`, como Gastos/Deudas/Apartados: no hace falta `resetIconoPicker`); `_syncCategoriaGastoFijo()` (ya era el listener de `change` del selector de categoría, AG.4) se extiende para alternar también `hidden` del grupo del ícono; `wireIconoPicker` se llama en cada `_inyectarFormGastoFijo()`; en modo edición, `setIconoPickerValor` prellena el ícono guardado. (3) `compromisos/logic/modelo.js`: `normalizarCompromiso()` gana `base.icono` en la rama `tipo==='fijo'` (antes solo existía en la rama de deuda desde CAT.2d): guarda el ícono solo si `categoria==='Otro'` Y el valor está en el catálogo, siempre explícito `null`/id válido. (4) `gastos/logic.js`: `iconoPorOrigen()` (TX.6/TX.7, herencia de ícono cuando un gasto nace de pagar un fijo) resuelve `comp.icono` antes que `CATEGORIA_AGENDA_ICONO[comp.categoria]`. (5) El checklist de "Distribuir mi ingreso" **no necesitó ningún cambio**: `construirDesgloseNecesidades()`/`_iconoNecesidad()` ya generalizaban por `it.icono` sin distinguir tipo desde CAT.2d.

**Archivos tocados:** `modules/dominio/agenda/view.js` (`renderFormGastoFijo`, `_renderDetalleItem`), `modules/dominio/agenda/index.js` (`_syncCategoriaGastoFijo`, `_inyectarFormGastoFijo`), `modules/dominio/compromisos/logic/modelo.js` (`normalizarCompromiso`), `modules/dominio/gastos/logic.js` (`iconoPorOrigen`), `tests/unit/compromisos.test.js` (5 tests nuevos), `tests/unit/agenda.test.js` (4 tests nuevos), `tests/unit/gastos.test.js` (1 test nuevo), `tests/e2e/smoke.test.js` (2 tests nuevos), `service-worker.js` (v379→v380).

**Verificación:** 2598/2598 unit + **192/192 E2E completos** + lint verdes.

**Podría afectar:** solo la UI de Agenda/Calendario al crear/editar un gasto fijo con categoría "Otro", y los gastos generados al pagarlo (heredan el ícono elegido en vez del genérico). Gastos fijos existentes con categoría "Otro" y sin ícono siguen mostrando el fijo `c-otros`, sin cambios visibles.

---

### feat(transversal): CAT.2e selector de ícono en Mis cuentas, quinto consumidor · 2026-07-13

Cierra **CAT.2e** (`docs/BOARD.md`), quinta y última rebanada nueva del picker de ícono compartido: **Mis cuentas** migrada (banco "Otro"). Misma naturaleza que CAT.2d (agrega elección de ícono, no reemplaza un campo existente), con un hallazgo adicional real: `cuenta.icono` ya existía en el schema, pero era **dato muerto**: `_iconoPorBanco()` asignaba un emoji a toda cuenta nueva (no solo "Otro"), y ningún render lo leía (`bancoAvatar()`/`tejaMarca()` resolvían la teja únicamente desde `BANCOS_CO`).

**Qué cambió:** (1) `_iconoPorBanco()` retirada; `normalizarCuenta()` ahora guarda `cuenta.icono` solo cuando `banco==='Otro'` y el valor elegido está en `ICONOS_CATEGORIA_PERSONALIZADA` (protege contra manipulación del DOM), siempre explícito (`null` si no aplica, nunca ausente, mismo patrón que `compromiso.icono` de CAT.2d para sobrevivir el merge shallow de `editar()`). (2) `infra/bancos.js`: `bancoAvatar(bancoId, icono)` gana el segundo parámetro; solo lo aplica como `simbolo` de la teja cuando `bancoId==='Otro'` Y el valor tiene forma de id de sprite (`/^[a-z]-[a-z0-9-]+$/`). Esta guarda es necesaria porque **cuentas ya guardadas antes de esta rebanada tienen un emoji en `icono`** (dato legado de `_iconoPorBanco()`), y sin validarlo se generaría un `<use href="#💚">` roto. (3) Los **6 call sites** de `bancoAvatar` en la app (`infra/cuenta-helper.js` ×3, `infra/render.js`, `tesoreria/views/transferencias.js`, `tesoreria/views/cuentas.js`) pasan `cuenta.icono`. (4) `tesoreria/views/cuentas.js`: `renderFormCuenta()` agrega el grupo `#form-group-icono` con el picker, oculto por defecto. (5) `tesoreria/acciones/cuentas.js`: el form de cuenta es un **singleton reusado** (como Metas, no como Gastos/Deudas/Apartados): `wireIconoPicker` se llama una sola vez en `inyectarFormCuenta()`; `_toggleCamposPorClase()` alterna la visibilidad del grupo según la clase del banco elegido (`clase==='otro'`); `_resetBankPicker()` llama `resetIconoPicker`; `_editarCuenta()` usa `setIconoPickerValor` para prellenar el ícono guardado.

**Archivos tocados:** `modules/infra/bancos.js` (`bancoAvatar`), `modules/infra/cuenta-helper.js` (3 call sites), `modules/infra/render.js` (1 call site), `modules/dominio/tesoreria/logic/cuentas.js` (`normalizarCuenta`, retira `_iconoPorBanco`), `modules/dominio/tesoreria/views/cuentas.js` (`renderFormCuenta`, `_renderCuentaItem`, `_bankAvatarHtml`), `modules/dominio/tesoreria/views/transferencias.js` (1 call site), `modules/dominio/tesoreria/acciones/cuentas.js` (`_toggleCamposPorClase`, `inyectarFormCuenta`, `_resetBankPicker`, `_editarCuenta`), `modules/core/state.js` (docstring `Cuenta.icono`), `tests/unit/tesoreria.test.js` (12 tests nuevos, 2 actualizados), `tests/unit/bancos.test.js` (5 tests nuevos), `tests/e2e/smoke.test.js` (2 tests nuevos), `service-worker.js` (v378→v379).

**Verificación:** 2589/2589 unit + **190/190 E2E completos** + lint verdes.

**Podría afectar:** solo la UI de Mis cuentas al elegir banco "Otro". Cuentas existentes con banco "Otro" y un emoji legado en `icono` (de antes de esta rebanada) siguen mostrando el fallback de iniciales "?", sin romperse ni mostrar un glifo inválido (guard de forma en `bancoAvatar`). Cuentas de cualquier otro banco no cambian de teja.

---

### feat(transversal): CAT.2d selector de ícono en Deudas, cuarto consumidor · 2026-07-13

Cierra **CAT.2d** (`docs/BOARD.md`), cuarta rebanada del picker de ícono compartido: **Deudas** migrada (categoría "Otra"/"Otro"). A diferencia de los 3 consumidores previos (Gastos, Metas, Apartados), esta rebanada AGREGA una capacidad nueva en vez de reemplazar un campo de ícono existente: hoy "Otra" (entidad) / "Otro" (personal) cae al ícono fijo `c-otros`, sin elección del usuario.

**Qué cambió:** (1) `compromiso.icono` nuevo, campo opcional sin bump de schema, guardado solo cuando la categoría es "Otra"/"Otro" y el valor elegido está en `ICONOS_CATEGORIA_PERSONALIZADA` (protege contra manipulación del DOM). Siempre explícito (`null` o el id del sprite), nunca ausente: `editar('compromisos', id, cambios)` hace un merge shallow (`Object.assign`, `infra/crud.js`), así que si el usuario cambia de categoría al editar, el ícono viejo debe limpiarse explícitamente en vez de quedar huérfano (mismo patrón ya usado ahí para `tasa`). (2) `formularios.js`: `renderFormDeuda()` agrega el grupo `#grupo-comp-icono` con `renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'comp-icono' })`, oculto salvo que la categoría (guardada, en edición) ya sea la de "otra". (3) `index.js`: `_wireIconoOtraCategoria()` nueva alterna la visibilidad del grupo al cambiar el `<select>` de categoría y llama `wireIconoPicker` (el form se re-renderiza completo en cada apertura, como Gastos/Apartados: no hace falta `resetIconoPicker`). (4) `lista.js`: `compromiso.icono` antes que `_ICONO_DEUDA[categoria]` en la teja y en el chip de categoría. (5) **Consistencia de paso**: el checklist de "Distribuir mi ingreso" (`tesoreria/logic/distribucion.js` `construirDesgloseNecesidades`, `views/distribucion.js` `_iconoNecesidad`) propaga el mismo campo `icono`, para que una deuda con ícono elegido se vea igual ahí que en la lista de Deudas.

**Archivos tocados:** `modules/dominio/compromisos/logic/modelo.js` (`normalizarCompromiso`), `modules/dominio/compromisos/views/formularios.js` (`renderFormDeuda`), `modules/dominio/compromisos/index.js` (`_wireIconoOtraCategoria`, wiring en `_elegirTipoDeuda`/`_editarCompromiso`), `modules/dominio/compromisos/views/lista.js` (`_renderCompromisoItem`), `modules/dominio/tesoreria/logic/distribucion.js` (`construirDesgloseNecesidades`), `modules/dominio/tesoreria/views/distribucion.js` (`_iconoNecesidad`), `tests/unit/compromisos.test.js` (14 tests nuevos), `tests/unit/tesoreria.test.js` (2 tests nuevos + 1 actualizado), `tests/e2e/smoke.test.js` (2 tests nuevos), `service-worker.js` (v377→v378).

**Verificación:** 2577/2577 unit + **188/188 E2E completos** + lint verdes.

**Podría afectar:** solo la UI de Deudas al elegir "Otra"/"Otro" y el checklist de "Distribuir mi ingreso" (ambos ahora pueden mostrar un ícono personalizado en vez del fijo `c-otros`). Deudas existentes sin `icono` siguen mostrando el ícono fijo por categoría, sin cambios visibles.

---

### feat(transversal): CAT.2c selector de ícono en Apartados, tercer consumidor + primera cobertura E2E de la sección · 2026-07-13

Cierra **CAT.2c** (`docs/BOARD.md`), tercera rebanada del picker de ícono compartido: **Apartados** migrado (nombre del apartado).

**Qué cambió:** (1) El `<input type="text" maxlength="4" placeholder="📦">` para pegar un emoji a mano se reemplaza por `renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'apartado-icono', label: '' })` en `apartados/view.js`, dentro de la misma columna angosta (`.apartado-nombre-row`, 3.5rem) que antes ocupaba el input. (2) `renderIconoPicker` gana la opción `label: ''` para omitir el `<span>` de etiqueta en usos compactos (el `aria-label` del panel cae a "Elegir ícono" cuando el label está vacío, sin perder accesibilidad). (3) `_iconoApartado()` nueva distingue sprite-id de emoji crudo (mismo patrón `/^[a-z]-/` que `_iconoMeta()`). (4) Las **17 plantillas rápidas** de Apartados (SOAT 🚗, Regalos 🎁, Arena para gatos 🐱...) conservan su propio catálogo curado de emojis, más específico que el genérico de 29 íconos del picker: se fijan con **`setIconoPickerValor(container, valor, previewHtml)`**, nuevo en el componente compartido, que actualiza el recuadro/input sin pasar por los botones de la grilla (ningún botón queda marcado si el valor no coincide con el catálogo). (5) El panel, al no caber en la columna angosta, pasa a **popover flotante** (`position: absolute`, CSS nuevo en `domain.css`) para no romper el layout de 2 columnas al desplegarse. (6) El form se re-renderiza completo en cada apertura (como Gastos, no como Metas): no hace falta `resetIconoPicker`. (7) **Primera cobertura E2E de la sección Apartados** (no tenía ninguna): 3 tests nuevos cubren plantilla, ícono manual del picker, y plantilla seguida de cambio manual.

**Archivos tocados:** `modules/infra/icon-picker.js` (+`setIconoPickerValor`, `label` opcional), `modules/dominio/apartados/view.js` (`renderFormApartado`, `_iconoApartado`), `modules/dominio/apartados/index.js` (`_inyectarFormApartado`, `_aplicarPlantilla`), `styles/components/domain.css` (popover flotante del panel en `.apartado-nombre-row`), `tests/unit/icon-picker.test.js` (9 tests nuevos), `tests/unit/apartados.test.js` (6 tests nuevos), `tests/e2e/smoke.test.js` (3 tests nuevos), `service-worker.js` (v376→v377).

**Verificación:** 2563/2563 unit + **186/186 E2E completos** + lint verdes.

**Podría afectar:** solo la UI de Apartados al crear/editar un apartado. Las plantillas rápidas siguen mostrando su emoji curado tal cual (no migran al catálogo genérico); `apartado.icono` admite id de sprite o emoji crudo sin bump de schema, igual que `meta.icono` desde CAT.2b.

---

### feat(transversal): CAT.2b selector de ícono en Metas, segundo consumidor + fix de locator ambiguo · 2026-07-13

Cierra **CAT.2b** (`docs/BOARD.md`), segunda rebanada del picker de ícono compartido: **Metas** migrada (categoría "Otra").

**Qué cambió:** (1) El `<input type="text" maxlength="4" placeholder="🎯">` de MT.3 (pegar un emoji a mano) se reemplaza por `renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'meta-icono', ... })` en `metas/view.js`. (2) `_iconoMeta()` ahora distingue dos formatos posibles de `meta.icono` (sin bump de schema): un id de símbolo del sprite (`c-pesa`, elegido con el picker) o un emoji crudo (metas viejas, creadas antes de CAT.2b), usando el patrón `/^[a-z]-/` que ningún emoji real produce. (3) El componente compartido gana **`resetIconoPicker(container)`** (limpia input + recuadro + panel + `aria-pressed`) y el input oculto ahora expone su propio `id` (igual al `id` del picker): necesarios porque el form de Metas, a diferencia del de Gastos, es un **singleton reusado entre aperturas** (`_inyectarForm()` corre una sola vez en `initMetas()`), así que `resetModal()` limpia el `.value` de los campos pero no el estado VISUAL del picker; `metas/index.js` llama `resetIconoPicker` tanto en `_syncCategoriaMeta()` (al ocultar el grupo por cambio de categoría) como en `_nuevaMeta()` (al reabrir el modal). (4) **Bug real encontrado y corregido**: el E2E de Gastos (TX.9b) usaba `page.locator('.icono-picker__panel')` sin acotar al formulario; con Metas también migrado, hay 2 instancias del componente en el DOM al mismo tiempo (ambos modales se inyectan al arrancar la app, estén abiertos o no), así que el locator se volvió ambiguo y el test empezó a fallar. Corregido a `form.locator(...)`.

**Archivos tocados:** `modules/infra/icon-picker.js` (+`resetIconoPicker`, `id` en el input oculto), `modules/dominio/metas/view.js` (`renderFormMeta`, `_iconoMeta`), `modules/dominio/metas/index.js` (`_inyectarForm`, `_syncCategoriaMeta`, `_nuevaMeta`), `tests/unit/icon-picker.test.js` (5 tests nuevos), `tests/unit/metas.test.js` (2 tests nuevos), `tests/e2e/smoke.test.js` (2 tests reescritos al nuevo flujo + 1 corregido en Gastos por el locator ambiguo), `service-worker.js` (v375→v376).

**Verificación:** 2548/2548 unit + **183/183 E2E completos** (suite entera en Chromium real, incluyendo la regresión de Gastos que este mismo cambio expuso) + lint verdes.

**Podría afectar:** solo la UI de Metas al elegir "Otra" categoría; metas existentes con emoji crudo en `icono` siguen renderizando igual (backward-compat verificada con test dedicado). Cualquier E2E futuro que use un locator global `.icono-picker__*` sin acotar al formulario correspondiente será ambiguo en cuanto un tercer dominio (CAT.2c-f) sume su propio picker a la página; los tests ya migrados usan locators acotados.

---

### feat(transversal): CAT.2a selector compacto de ícono + migración de Gastos (TX.9b) · 2026-07-13

Primera rebanada de **CAT.2** (`docs/BOARD.md`): picker de ícono compartido para "Otra categoría/entidad" personalizada, pedido por 6 briefs distintos (2026-07-08). Primer análisis a fondo de esta funcionalidad transversal (ficha nueva en `docs/contexto/transversal.md`, regla 2.6): los 6 consumidores identificados NO parten del mismo punto. Gastos (TX.9b) ya tenía categoría personalizada con una grilla de 29 íconos SIEMPRE visible al elegir "+ Otra categoría" (invasiva en pantalla); Deudas y Cuentas tienen "Otro" con un ícono FIJO (`c-otros`, fallback de iniciales), sin que el usuario pueda elegir; Apartados y Metas usan un `<input type="text" maxlength="4">` para pegar un emoji a mano (dependiente del selector de emojis del sistema operativo); Fijo/Calendario no tiene ni siquiera creación de categoría personalizada. Re-cortado en **CAT.2a-f**, una rebanada por consumidor (regla 2.1: multi-dominio, y varias necesitan más que solo el picker).

**Qué se construyó en CAT.2a:** (1) **Componente compartido nuevo `modules/infra/icon-picker.js`** (`renderIconoPicker`/`wireIconoPicker`): un recuadro que muestra el ícono elegido (o un placeholder "+" vacío) y, al tocarlo, despliega una grilla colapsable de íconos; elegir uno la cierra de nuevo y actualiza el recuadro. **Sin modal anidado a propósito** (mismo criterio que el comentario original de TX.9b en `gastos/index.js`): un panel `hidden` dentro del mismo formulario, no un overlay nuevo. Esto evita además amplificar un bug latente ya presente en los pickers dinámicos de `cuenta-helper.js` (`_mostrarPickerCuenta`, etc.): `trapFocus`/`releaseFocus` de `infra/a11y.js` son **singleton** (una sola `_trapEl`/`_prevFocus`, no una pila), así que un modal anidado sobre otro deja el trap de foco del modal exterior huérfano al cerrar el interior; documentado como riesgo preexistente en la ficha, no corregido aquí (fuera de alcance). (2) **Gastos (TX.9b) migrado** como primer consumidor: `gastos/view.js` reemplaza la grilla inline por `renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, ...)`; `gastos/index.js` reemplaza el listener manual de clic por `wireIconoPicker(...)`. CSS re-arquitecturado en `forms.css`: `.icono-picker` (grilla siempre visible) se convierte en `.icono-picker-field` (wrapper) + `.icono-picker__recuadro` (swatch, borde punteado cuando vacío) + `.icono-picker__vacio` (placeholder) + `.icono-picker__panel` (la grilla, ahora colapsable); `.icono-picker__btn` queda con el mismo nombre de clase (sin romper el conteo de botones en tests existentes). Sin cambios de schema ni de lógica de negocio (`validarCategoriaPersonalizada` intacta, sigue exigiendo un ícono válido).

**Archivos tocados:** `modules/infra/icon-picker.js` (nuevo), `modules/dominio/gastos/view.js`, `modules/dominio/gastos/index.js`, `styles/components/forms.css`, `tests/unit/icon-picker.test.js` (nuevo, 12 tests), `tests/unit/gastos.test.js` (1 test nuevo), `tests/e2e/smoke.test.js` (suite TX.9b actualizada al nuevo flujo: tocar el recuadro antes de elegir ícono), `service-worker.js` (agrega `icon-picker.js` a `CORE_ASSETS`, v374→v375).

**Verificación:** 2541/2541 unit + **183/183 E2E completos** (suite entera corrida en Chromium real, no solo la de Gastos) + lint verdes. El preview local de este entorno no cargó (mismo problema ya documentado en sesiones anteriores); verificado por Playwright/Chromium real en su lugar.

**Podría afectar:** solo la UI de Gastos al crear una categoría personalizada; el `name` del input oculto (`categoriaNuevaIcono`) y la validación no cambiaron, así que el resto del flujo (guardado, reutilización de la categoría en gastos futuros) sigue igual. Cualquier E2E o integración externa que hiciera clic directo en `.icono-picker__btn` sin antes abrir el recuadro se rompería (ya corregido en `smoke.test.js`, no se encontró otro caso).

---

### feat(compromisos): D.15a copy de simulaciones + refuerzo en Abonar, cierra Deudas v2 completa · 2026-07-13

Cierra **D.15a** (`docs/BOARD.md`), última rebanada de la iniciativa "Deudas v2: de registro a asesor" (brief 2026-07-08). **Con esta pieza la iniciativa queda completa** (D.15a-e + rediseño visual D.16a-d). Puntos 4, 5-copy, 6 y 9 del brief; sin cambios de lógica ni schema.

**Qué cambió:** (1) **Nivel orden (Avalancha/Bola de nieve):** `_RESUMEN_ESTRATEGIA.avalancha` gana la frase "Te conviene si tu prioridad es pagar lo menos posible", en paralelo a Bola de nieve, que ya explicaba cuándo conviene ("Ideal si necesitas ver progreso rápido..." → reformulado a "Te conviene si..." para mantener el paralelismo). (2) **Las 3 palancas** (`_renderRemedioExtra`, `renderRenegociar`, `renderConsolidar`): cada una suma "Explora libremente: nada cambia hasta que confirmes", el refuerzo de copy que corresponde a la iniciativa sobre la garantía que BUG-011 ya blindó en lógica (ninguna simulación se aplica sin el botón "Aplicar"). (3) **Refuerzo psicológico en Abonar** (punto 9): `renderFormAbono` suma una línea estática antes del footer del modal ("Cada abono, grande o pequeño, es un paso real hacia quedar libre de esta deuda", `form-hint--info`). El tip en vivo bajo el monto (`_actualizarTipProyeccion` en `index.js`) se reescribió para nunca dejar el campo vacío mientras el monto sea válido, con 3 mensajes por prioridad: el abono salda la deuda por completo ("¡Con este abono saldas esta deuda por completo!", el más fuerte) → hay cuota registrada y el abono adelanta al menos un mes (comportamiento previo intacto, "Con este abono terminas X antes") → refuerzo genérico ("Cada abono reduce lo que debes, sin importar el monto") para deudas sin cuota fija (Fiado, D.13) o abonos que no adelantan un mes completo. Tono ADR 003/008 en todo: afirma progreso real, nunca presiona ni compara con otros usuarios ni usa cuenta regresiva.

**Archivos tocados:** `modules/dominio/compromisos/views/estrategia.js` (resumen de Avalancha + hint de la palanca Aumentar), `modules/dominio/compromisos/views/estrategia-impacto.js` (hint de Renegociar y Consolidar), `modules/dominio/compromisos/views/formularios.js` (línea de refuerzo en `renderFormAbono`), `modules/dominio/compromisos/index.js` (`_actualizarTipProyeccion` reescrita), `tests/unit/compromisos.test.js` (3 tests nuevos), `tests/e2e/estrategia-pago.test.js` (4 tests nuevos, suite "Refuerzo psicológico en Abonar"), `service-worker.js` (v373→v374).

**Verificación:** 2528/2528 unit + 21/21 E2E `estrategia-pago` (suite completa corrida en Chromium real, incluyendo la nueva) + lint verdes.

**Podría afectar:** solo copy de la sección Deudas; ningún `data-action`, handler ni cálculo cambió de comportamiento (el tip en vivo antes quedaba en blanco en algunos casos, ahora siempre muestra un mensaje; el resto de su lógica original, meses antes con cuota, es idéntica).

---

### feat(compromisos): D.15b editar deuda + reorden del form, cierra Deudas v2 salvo D.15a · 2026-07-13

Cierra **D.15b** (`docs/BOARD.md`), tercera pieza independiente de la iniciativa Deudas v2 (puntos 7, 8 y 10 del brief).

**Qué cambió:** (1) **Editar deuda**: el flujo `_editarCompromiso` + `renderFormDeuda(tipo, deuda)` ya existía y prellenaba el formulario completo, pero la `.deuda-card` no tenía ningún trigger visible (solo Abonar/Eliminar/Archivar); el único acceso era desde Calendario, para fijos. Se agregó un botón de editar (`i-edit`, `.btn-icon`, mismo patrón visual que Eliminar) a `_renderCompromisoItem` en `views/lista.js`, disponible tanto en deuda activa (junto a Abonar y Eliminar) como saldada (junto a Archivar); usa la acción `editar-compromiso` ya registrada en `index.js`, cero wiring nuevo. (2) **Formulario reordenado**: el campo de categoría/tipo de deuda ("Tipo de deuda" en entidad, "¿Con quién es la deuda?" en personal) pasa a ir ANTES que la descripción libre, el mismo patrón que TX.9a adoptó en Gastos (y que CAT.4 documenta como regla transversal: "la categoría/tipo va primero, la descripción después, nunca al contrario"). (3) **Hint de bajo valor retirado**: "Si es una tienda o comercio que te fía, elige Fiado" desaparece del campo de categoría personal (Fiado ya está listado como una opción más del propio selector, el hint solo repetía información visible); el hint de tasa desconocida (D.12, `comp-tasa-hint`, "¿No conoces tu tasa?...") se conserva íntegro y sigue siendo el contenido principal de ese campo.

**Archivos tocados:** `modules/dominio/compromisos/views/lista.js` (botón de editar), `modules/dominio/compromisos/views/formularios.js` (reorden de campos + hint retirado), `tests/unit/compromisos.test.js` (5 tests nuevos: 2 del botón de editar en `lista.js`, 3 del form en `formularios.js`), `service-worker.js` (v372→v373).

**Verificación:** 2525/2525 unit + 17/17 E2E `estrategia-pago` (corrida en Chromium real: confirma que la tarjeta con el botón nuevo sigue interactuando bien con Abonar/Eliminar/estrategia) + lint verdes.

**Podría afectar:** solo la sección Deudas. Sin cambios de lógica de negocio, schema ni de los `data-action`/handlers existentes (`editar-compromiso` ya estaba registrado desde antes, solo le faltaba un trigger). Con esto, **la iniciativa "Deudas v2" queda completa salvo D.15a** (copy de simulaciones + refuerzo en Abonar, pendiente e independiente).

---

### feat(compromisos): D.15d-2 las 3 palancas a primer plano en la vista, absorbe D.15e · 2026-07-13

Cierra **D.15d-2** (`docs/BOARD.md`), segunda rebanada de D.15d: conecta el motor puro `recomendarPalanca` (D.15d-1) a la card de estrategia. **El corazón de la iniciativa Deudas v2 se vuelve visible.**

**Qué cambió:** la card de estrategia pasa a **2 niveles ortogonales**. (1) **Nivel orden** (Avalancha/Bola de nieve): sin cambio, pero su detalle se **decopla del extra simulado** (usa siempre extra=0; la exploración del pago extra se mudó a la palanca). (2) **Nivel palanca (nuevo, siempre visible)**: las 3 macro-acciones (Aumentar la cuota / Renegociar la tasa / Consolidar), antes enterradas en el panel "plan inviable" que solo veía un usuario con plan inviable, ahora son una sección permanente bajo el detalle de orden: intro "¿Qué acción te conviene?" + la razón de la palanca recomendada + 3 tiles ordenados por relevancia (`palanca.orden`), con la principal marcada "Recomendada" (`--recomendada`) y preseleccionada, y la herramienta de la palanca activa (una a la vez). La vista calcula la capacidad: `estimarSalarioMensual(S.ingresos)` (infra, D.15d-1) para el ingreso + **`calcularFijosMensuales(S.compromisos)`** (nueva en `modelo.js`, suma tipo 'fijo') para los fijos. (3) **Absorbe D.15e:** el acelerador `<details>` "¿Puedes pagar más rápido?" (solo ofrecía subir la cuota, sin "Aplicar") se retiró; su input vive ahora en la palanca "Aumentar la cuota", que ya trae el botón "Aplicar este aumento". (4) **Panel inviable en 2 capas puras (ADR 031):** el botón de alerta (danger) abre SOLO el diagnóstico; el selector de palancas ya no vive ahí (es la sección neutra siempre visible). **BUG-011 intacto:** la estructura de la card se sigue decidiendo con datos registrados (`recomendarEstrategia(deudas, 0)`); el extra simulado nunca decide estructura. `_uiEstrategia.alternativaActiva` default `null` ("sin elección" → principal); `setEstrategiaUI` admite reset a null.

**Archivos tocados:** `modules/dominio/compromisos/views/estrategia.js` (2 niveles + `_renderPalancas`/`_renderPalancaTile`; retira `_renderAceleradorExtra`), `modules/dominio/compromisos/views/estrategia-impacto.js` (copy del acelerador retirado), `modules/dominio/compromisos/logic/modelo.js` (+`calcularFijosMensuales`), `modules/dominio/compromisos/logic.js` (export), `modules/dominio/compromisos/index.js` (retira el wiring muerto `cambiar-extra-estrategia`/`_cambiarExtraEstrategia`), `styles/components/charts.css` (`.estrategia-card__palancas`/`-intro`/`-razon` + `.estrategia-card__selector-sub`/`--recomendada`), `tests/unit/compromisos.test.js` (bloque de la vista reescrito + `describe D.15d-2`), `tests/e2e/estrategia-pago.test.js` (helper `elegirPalanca`, palancas siempre visibles), `service-worker.js` (v371→v372).

**Verificación:** 2520/2520 unit + **179/179 E2E** (suite `estrategia-pago` reescrita al nuevo modelo, corrida en Chromium real) + lint verdes.

**Podría afectar:** solo la sección Deudas. Los `data-action` de las herramientas (aumentar/renegociar/consolidar) y sus handlers no cambiaron; el acelerador `.estrategia-card__acelerador` y la acción `cambiar-extra-estrategia` ya no existen (cualquier consumidor externo debía ser interno a esta card, no se encontró otro).

---

### feat(compromisos): D.15d-1 motor puro recomendarPalanca + estimarSalarioMensual a infra · 2026-07-13

Primera de las dos rebanadas en que se re-cortó **D.15d** (motor de recomendación de palanca de Deudas v2) al triarla: toca infra + lógica pura + vista, así que se parte en **D.15d-1** (esta, lógica sin UI, verificable por tests) y **D.15d-2** (la vista que consume el motor). Precedente aplicado: **MC.17a** (lógica pura aterriza antes que su consumidor).

**Qué cambió:** (1) **Extracción a infra.** `estimarSalarioMensual` sale de `tesoreria/logic/ingresos.js` y pasa a `infra/financiero.js` (con su tabla privada `FACTOR_MENSUAL_INGRESO`): con presupuesto y compromisos como consumidores además de tesorería, su hogar único sin dueño de dominio es infra (mantiene ADN #10 limpio). El barrel `tesoreria/logic.js` la **re-exporta** desde infra (consumidores del barrel y tests intactos); `presupuesto/view.js` la importa directo de infra (un import cruzado de dominio menos); `tesoreria/acciones/ingresos.js` y `tesoreria/views/distribucion.js` repuntados a infra. `FACTOR_MENSUAL` de tesorería queda donde está (aún lo usan `montoSalarioMinimoPorPeriodo` y `distribucion.js`). (2) **Motor puro `recomendarPalanca(deudas, { ingresoMensual, fijosMensuales })`** en `compromisos/logic/estrategia.js`: decide la palanca principal por **margen libre real** (`capacidad = ingreso - fijos - Σ cuotas de deuda`) y devuelve el orden de relevancia de las 3 (Aumentar/Renegociar/Consolidar) + la razón en tono ADR 003/008. Con margen → Aumentar; sin margen + ≥2 deudas caras → Consolidar; sin margen + 1 cara → Renegociar; sin margen + sin tasas altas → Aumentar (cuando se libere margen). No lee S ni importa tesorería (recibe la capacidad como parámetro; la vista la calculará en D.15d-2). Umbrales: tasa alta 25% EA (heurística, NO la usura del ADR 004) y capacidad mínima 20.000/mes. **Nadie consume el motor todavía** (eso es D.15d-2).

**Archivos tocados:** `modules/infra/financiero.js` (+`estimarSalarioMensual` + tabla), `modules/dominio/tesoreria/logic/ingresos.js` (-`estimarSalarioMensual`), `modules/dominio/tesoreria/logic.js` (re-export desde infra), `modules/dominio/tesoreria/acciones/ingresos.js` y `modules/dominio/tesoreria/views/distribucion.js` (import a infra), `modules/dominio/presupuesto/view.js` (import a infra), `modules/dominio/compromisos/logic/estrategia.js` (+`recomendarPalanca` + helpers `_ordenarPalancas`/`_razonPalanca`), `modules/dominio/compromisos/logic.js` (export), `tests/unit/compromisos.test.js` (12 tests nuevos), `service-worker.js` (v370→v371).

**Verificación:** 2514/2514 unit + lint verdes. Sin verificación en navegador porque no hay UI nueva (el motor aún no se consume): es lógica pura probada, mismo criterio que MC.17a.

**Podría afectar:** cualquier consumidor futuro de `estimarSalarioMensual` debe importarla de `infra/financiero.js` (o del barrel de tesorería, que la re-exporta). El comportamiento de la función es idéntico (mismos tests verdes).

---

### feat(compromisos): D.16d tarjeta de deuda con chips + máscara + empty state, cierra D.16 completa (ADR 036 D5/D6/D7) · 2026-07-12

Cierra **D.16d** (`docs/BOARD.md`), última rebanada del rediseño visual de Deudas ([ADR 036](DECISIONS/036-deudas-v2-visual.md)): la iniciativa D.16 completa queda en producción el mismo día del handoff. Absorbe formalmente **D.15c** (tarjeta con jerarquía visual).

**Qué cambió:** cada deuda pasa de `.list-item` con hints apilados a **tarjeta** `.deuda-card`: teja de marca/categoría a 44px con el **badge de orden estratégico superpuesto en la esquina** (el badge conserva el accent: blanco sobre frambuesa mide ~3.2:1 y no pasa AA a 10px), nombre + chip de urgencia, **saldo prominente** (tabular/bold, enmascarable), cuota como subtítulo, **chips de categoría** (tinte compromisos o personales según el tipo) **y de tasa** ("28% EA" / "Sin interés" con check / "Tasa por confirmar" en ámbar), el aviso de tasa desconocida (D.12) ascendido de línea con ⚠️ a **callout ámbar con ícono**, y acciones nuevas: **Abonar con tinte de compromisos** (botón propio, no verde: un abono no es un ingreso, ADR 002 sin cambios de flujo) + eliminar ghost que vira a danger en hover. Encabezado de grupo "Tus deudas" con el indicador "Orden Avalancha/Bola de nieve" a la derecha (solo cuando el usuario ya eligió estrategia). **Máscara del ojo (D7) extendida al saldo por deuda** (mismo flag del hero). Empty state alineado al mockup ("...y Finko arma tu estrategia de salida"). La clase muerta `.abono-btn` se retiró (su único consumidor era esta lista).

**Archivos tocados:** `modules/dominio/compromisos/views/lista.js` (tarjeta + encabezado + máscara + empty state), `styles/components/domain.css` (bloque DEUDA-CARD + retiro de `.abono-btn`), `styles/components/atoms.css` (badge de orden en `.deuda-card__icon`), `tests/unit/compromisos.test.js` (7 tests nuevos + 5 actualizados al markup nuevo), `service-worker.js` (v369→v370).

**Verificación:** 2502/2502 unit + **179/179 E2E completos** + lint verdes (gate final de toda la serie D.16a-d).

**Podría afectar:** los flujos de abono/archivar/eliminar usan los mismos `data-action` e ids (cero cambios de wiring); cualquier CSS externo que apuntara a `.list-item` dentro de `#lista-compromisos` ya no aplica (no se encontró ninguno fuera de los estilos retirados).

---

### feat(compromisos): D.16c acelerador + panel inviable en 2 capas (ADR 036 D3/D4) · 2026-07-12

Cierra **D.16c** (`docs/BOARD.md`), tercera rebanada del rediseño visual de Deudas ([ADR 036](DECISIONS/036-deudas-v2-visual.md)). Materializa la capa visual que pedía D.15a punto 1 (arquitectura de 2 capas del ADR 031: la alarma señala, la solución calma).

**Qué cambió:** (1) **acelerador** "¿Puedes pagar más rápido?" como sub-card inset (`bg-base`) con el ícono del summary en verde; el impacto del extra pasa a callout de éxito con ícono (mismo lenguaje que la comparativa de D.16b). (2) **Plan inviable en 2 capas:** el danger vive SOLO en el botón de alerta; el panel interior pasa de fondo danger a neutros (fondo base + borde danger sutil) y únicamente el título del diagnóstico conserva el rojo (la regla CSS que teñía TODOS los títulos del panel se acotó al diagnóstico). (3) **Selector de alternativas como tiles verticales** (ícono arriba + nombre abajo), activa en frambuesa de sección; Renegociar estrena `i-handshake`. (4) **Emojis fuera** de todo el bloque: 🎯→`i-trending-down`/`i-check-circle`, 🤝→`i-handshake`, 🏦→`i-cuentas`, 🔒→`i-alert` (SC 1.4.11: ícono + texto). (5) **Fix visual real encontrado en la pasada:** los botones "Aplicar nueva tasa" y "Consolidar" usaban la clase inexistente `btn--primary` (doble guion) y se pintaban como botones sin estilo; ahora `btn-primary`. Cero cambios de lógica; las suites BUG-011 quedan intactas.

**Archivos tocados:** `modules/dominio/compromisos/views/estrategia.js` (tiles del selector + handshake + no-aplica sin candado), `views/estrategia-impacto.js` (íconos en títulos y mensajes ok, fix `btn-primary`), `styles/components/charts.css`, `tests/unit/compromisos.test.js` (4 tests nuevos + 2 aserciones de emoji actualizadas al criterio real), `service-worker.js` (v368→v369).

**Verificación:** 2495/2495 unit + 17/17 E2E `estrategia-pago` + lint verdes.

**Podría afectar:** solo presentación del panel de estrategia; los `data-action` y el flujo de alternativas no cambiaron.

---

### feat(compromisos): D.16b picker de estrategia con identidad de sección + comparativa como callout (ADR 036 D2) · 2026-07-12

Cierra **D.16b** (`docs/BOARD.md`), segunda rebanada del rediseño visual de Deudas ([ADR 036](DECISIONS/036-deudas-v2-visual.md)).

**Qué cambió:** (1) la card de estrategia pasa a superficie con sombra en reposo y radio XL (familia visual del hero); los paneles interiores (picker, métricas, placeholder) bajan a `bg-base` como "inset". (2) Header nuevo: teja tintada de compromisos + título "¿Cómo salir más rápido?" + un solo subtítulo (la línea de honestidad del motor); el eyebrow "Estrategia de pago" queda arriba de la card (clase genérica nueva `.grupo-eyebrow` en `atoms.css`, reutilizable por D.16d para "Tus deudas"). (3) El picker viste la identidad de la sección: card activa con borde/fondo/teja en frambuesa `--fk-dom-compromisos` (antes el accent verde global). (4) Bola de nieve estrena su símbolo propio `i-snowball` (antes el círculo genérico); drafts nuevos `i-snowball`, `i-handshake` y `i-trending-down` publicados vía `scripts/sync-sprite.py` (plantillas que Esteban puede sobrescribir, ADR 026; el rediseño de metáfora de Avalancha/Bola sigue en IV.4). (5) La comparativa Avalancha vs Bola de nieve deja los emojis 💰🏆ℹ️ y pasa a callouts tintados con borde completo + ícono de sprite (verde = ahorro, azul = impulso; ícono + texto, SC 1.4.11). Cero cambios de lógica.

**Archivos tocados:** `assets/svg/iconos/simbolos/{snowball,handshake,trending-down}.svg` (nuevos), `index.html` (sprite, 3 símbolos), `modules/dominio/compromisos/views/estrategia.js` (header + eyebrow + ícono del picker), `views/estrategia-impacto.js` (comparativa con íconos), `styles/components/charts.css`, `styles/components/atoms.css` (`.grupo-eyebrow`), `tests/unit/compromisos.test.js` (3 tests nuevos), `tests/e2e/estrategia-pago.test.js` (aserción del título actualizada al rediseño), `service-worker.js` (v367→v368).

**Verificación:** 2491/2491 unit + 17/17 E2E `estrategia-pago` + lint verdes (incluye las suites de regresión BUG-011 sin tocar su intención).

**Podría afectar:** nada de lógica; el título de la card cambió de copy (la aserción E2E se actualizó en el mismo commit).

---

### feat(compromisos): D.16a hero con el total de deuda + ojo de privacidad (ADR 036 D1/D7) · 2026-07-12

Cierra **D.16a** (`docs/BOARD.md`), primera rebanada del rediseño visual de Deudas ([ADR 036](DECISIONS/036-deudas-v2-visual.md), handoff de Claude Design `Deudas v2.dc.html` enviado por Esteban). La pantalla de Deudas gana lo que no tenía: la magnitud total del problema de un vistazo.

**Qué cambió:** hero nuevo al tope de `#sec-compromisos` con "Lo que debes en total" + saldo total de las deudas activas (cifra protagonista, tabular/extrabold) + chip "cuota/mes" con ícono + texto "en N deudas" + ojo de privacidad anclado a la esquina (posición estable, `S.config.ocultarSaldo`, mismo flag de Inicio y Mis cuentas: un solo control de privacidad en toda la app). Degradado de identidad de compromisos (frambuesa ADR 031) como tercer consumidor del estreno parcial del ADR 033. Agregado puro `resumenDeudas(compromisos)` nuevo en `logic/modelo.js`: suma `saldoTotal` y cuota mensual SOLO de deudas activas (los gastos fijos del mismo dominio no entran: el hero habla de "lo que debes"). Sin deudas: "$0" + "No tienes deudas registradas", sin ojo ni chip (un control que no enmascara nada confunde). Contraste WCAG medido contra la parada fuerte del degradado (método IV.1): oscuro `#3a2433` → primario 11.92:1, secundario 6.06:1; claro `#fce3eb` → primario 13.87:1, secundario 7.02:1.

**Archivos tocados:** `index.html` (contenedor `#compromisos-hero`), `modules/dominio/compromisos/logic/modelo.js` (`resumenDeudas()`), `logic.js` + `view.js` (barrels), `views/hero.js` (nuevo), `index.js` (wiring en `_renderTodo()` + acción `compromisos-saldo-visibilidad`), `styles/components/domain.css` (`.hero-compromisos` + ojo compartido), `tests/unit/compromisos.test.js` (9 tests nuevos), `service-worker.js` (v366→v367).

**Verificación:** 2488/2488 unit + 17/17 E2E `estrategia-pago` + lint verdes.

**Podría afectar:** nada fuera de la sección Deudas; la máscara de los saldos por deuda en la lista llega en D.16d (hoy el ojo enmascara el total y el chip del hero).

---

### feat(ui): MC.17e teja "Transferir" en la hoja Registrar, cierra MC.17 completa · 2026-07-12

Cierra **MC.17e** (`docs/BOARD.md`), última rebanada de MC.17 (transferencias entre cuentas propias). La iniciativa completa (MC.17a fundación de datos, MC.17b formulario/acción, MC.17c ledger de Movimientos, MC.17d GMF del retiro) queda cerrada con este punto de entrada.

**Qué cambió:** nueva teja "Transferir" en la hoja "Registrar" (NAV.A2), visible solo con 2+ cuentas activas (mismo patrón 0/1/varias que ya usan Abono a deuda y Aporte a ahorro en ese mismo archivo). `cuentasActivasParaTransferir(cuentas)` (nueva, pura) cuenta las cuentas activas sin importar el dominio `tesoreria` (regla ADN #10, ya documentada en la cabecera del archivo: la hoja lee `S` directamente y reusa acciones ya registradas por nombre en vez de importar lógica de dominio). La teja usa `data-action="registrar-abrir" data-target-action="abrir-transferencia"`, reutilizando la acción `abrir-transferencia` que MC.17b ya registró en `acciones/transferencias.js`: cero lógica nueva de apertura de modal.

**Archivos tocados:** `modules/ui/registrar.js` (`cuentasActivasParaTransferir()` nueva + teja en `_construirTejasDinamicas()`), `tests/unit/registrar.test.js` (2 tests nuevos), `service-worker.js` (v365→v366), `docs/BOARD.md`, `docs/HANDOFF.md`, `docs/contexto/mis-cuentas.md`.

**Verificación:** 2479/2479 unit verdes (conteo de cuentas activas, tolerancia a entrada vacía/no-array). Verificación funcional vía DOM en el Browser pane (el screenshot visual no respondió esta sesión, mismo patrón intermitente de sesiones anteriores): con 2 cuentas activas la teja aparece en `#registrar-grid` y su clic abre `#modal-transferencia` (`data-open` presente); con 1 sola cuenta activa la teja no se inyecta.

**Podría afectar:** nada fuera de la hoja Registrar; la acción `abrir-transferencia` y el modal no cambiaron (ya cubiertos por los tests de MC.17b/d).

---

### feat(tesoreria): MC.17d GMF del retiro en la transferencia, opcional · 2026-07-12

Cierra **MC.17d** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"), cuarta rebanada de MC.17. Añade el 4x1000 (GMF) real que un banco cobra al sacar dinero de una cuenta no exenta.

**Decisión ratificada con Esteban antes de codificar** (ambas opciones = la recomendación del análisis de Opus del 2026-07-12): (1) el costo del 4x1000 se guarda como campo opcional `costoGMF` en la Transferencia, NO como un `Gasto` separado (no ensucia Análisis, Límites de gasto ni el monitor de renta con una micro-comisión bancaria mecánica); (2) el checkbox del formulario viene marcado por defecto, porque refleja lo que el banco realmente cobrará (el saldo queda exacto sin que el usuario haga nada; puede desmarcarlo si tiene el cupo exento del mes disponible).

**Qué cambió:** cuando la cuenta de origen no está exenta (`aplica4x1000 === true`), el modal de transferencia muestra una sección nueva (`renderSeccionGMF()`, `views/transferencias.js`) con un checkbox "Descontar el 4x1000 (GMF)" marcado + un hint que calcula el costo en vivo a medida que se escribe el monto. Al aplicar: sale `monto + costoGMF` del origen y entra `monto` al destino → el patrimonio neto baja EXACTAMENTE el GMF (la única parte real-mundo de una transferencia, un costo que se lleva el banco). Lógica pura nueva en `logic/transferencias.js`: `costoGMFRetiro(monto)` (monto × 0.004 redondeado al peso, 0 si el monto no es positivo, mismo redondeo que `calcularCostoGMF`) y `origenSujetoAGMF(cuentas, id)` (salvaguarda dura: solo `aplica4x1000 === true`); `calcularTransferencia()` ahora descuenta el `costoGMF` del origen (Σ deltas = -costoGMF) y `normalizarTransferencia(datos, costoGMF)` lo guarda solo si es > 0 (campo opcional, sin migración). La sección reacciona al origen en vivo: aparece/desaparece al invertir el par o cambiar el selector de 3+ (`_refrescarSeccionGMF()`), con el hint recalculado por `_actualizarHintGMF()`. El chequeo de sobregiro y su mensaje de confirmación usan `monto + costoGMF`. El ledger (extiende MC.17c) traza "incluye $X de 4x1000" en el subtítulo de la fila, sin sumarlo al monto mostrado (que es lo que llegó al destino).

**Archivos tocados:** `modules/dominio/tesoreria/logic/transferencias.js`, `modules/dominio/tesoreria/logic.js` (barrel: 2 exports nuevos), `modules/dominio/tesoreria/views/transferencias.js`, `modules/dominio/tesoreria/view.js` (barrel), `modules/dominio/tesoreria/acciones/transferencias.js`, `modules/core/state.js` (campo opcional `costoGMF` en `Transferencia`), `modules/dominio/movimientos/logic.js` (`costoGMF` en el `Movimiento`), `modules/dominio/movimientos/view.js` (subtítulo del GMF), `service-worker.js` (v364→v365), `tests/unit/tesoreria.test.js` + `tests/unit/movimientos.test.js` (21 tests nuevos), `tests/e2e/smoke.test.js` (1 E2E nuevo), `docs/BOARD.md`, `docs/HANDOFF.md`, `docs/contexto/mis-cuentas.md`.

**Verificación:** 2477/2477 unit (helpers puros del GMF, apply que descuenta el gravamen con Σ deltas = -costoGMF, render condicional del checkbox por exención, acción que descuenta/omite según checkbox, subtítulo del ledger) + 179/179 E2E (1 nuevo en Chromium real: origen no exento → checkbox marcado → transferencia descuenta `monto + 800` del origen, `monto` al destino, `costoGMF` guardado, y el ledger muestra "incluye $800 de 4x1000") + lint verdes. El Browser pane interactivo siguió inestable esta sesión; la verificación se apoyó en el E2E de Playwright sobre Chromium real y en la suite unitaria sobre el `render.js`/DOM de producción.

**Podría afectar:** una transferencia con GMF baja el patrimonio total (a diferencia de MC.17a-c, donde el traslado era neutro): es correcto, el GMF es dinero que sale del sistema hacia el banco. El GMF NO es un `Gasto`, así que Análisis/Límites/resumen semanal/monitor de renta siguen sin verlo. El campo `costoGMF` es opcional y `undefined`-safe: transferencias existentes (sin él) siguen válidas sin migración.

---

### feat(movimientos): MC.17c transferencia en el ledger de Movimientos, tipo neutro · 2026-07-12

Cierra **MC.17c** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"), tercera rebanada de MC.17. Sobre la lógica y la UI ya cerradas en MC.17a/b: ahora una transferencia queda visible en el historial.

**Qué cambió:** `movimientosDesdeTransferencias(transferencias)` (nuevo, `modules/dominio/movimientos/logic.js`) normaliza `S.transferencias` a `Movimiento` con `direccion: 'neutro'` (sin signo, sin color), `tipo: 'transferencia'`, `dominio: 'tesoreria'`, ícono `i-transferencia`, y guarda `cuentaOrigenId`/`cuentaDestinoId` en el objeto en vez de una descripción ya armada, porque esta función pura recibe solo `transferencias` (no `cuentas`). El typedef `Movimiento` se extiende con esos 3 valores nuevos. `movimientosRecientes()`/`movimientosCompletos()` combinan ahora 4 fuentes en vez de 3. En `view.js`, `_descripcionMovimiento()` (nuevo) arma "Origen → Destino" en vivo con `_nombreCuenta()` (mismo criterio que el resto del historial: el nombre de cuenta no se congela en el momento de la derivación). `renderActividadReciente()` y `_renderMovimientoItem()` (los 2 sitios de render, panel de Inicio y vista completa `#movimientos`) dejan de asumir el signo binario `esIngreso ? '+' : '-'`: con `direccion === 'neutro'` el signo es `''`, reutilizando la clase de color de egreso (ya neutra por defecto, sin CSS nuevo). `_TIPO_LABEL` suma `transferencia: 'Transferencia'` para el subtítulo. `'transferencias'` se agregó a `_SECCIONES_MOVIMIENTOS` (memo, `view.js`) y a `_SECCIONES_FUENTE` (guard de `state:change`, `movimientos/index.js`): guardar una transferencia (MC.17b) re-pinta ambas vistas solo. Símbolo de sprite nuevo `i-transferencia` (doble flecha, trazo): draft en `assets/svg/iconos/simbolos/transferencia.svg`, publicado con `scripts/sync-sprite.py` (BR.2).

**Archivos tocados:** `modules/dominio/movimientos/logic.js`, `modules/dominio/movimientos/view.js`, `modules/dominio/movimientos/index.js`, `assets/svg/iconos/simbolos/transferencia.svg` (nuevo), `index.html` (sprite regenerado, símbolo `i-transferencia`), `service-worker.js` (v363→v364), `tests/unit/movimientos.test.js` (12 tests nuevos), `docs/BOARD.md`, `docs/HANDOFF.md`, `docs/contexto/mis-cuentas.md`.

**Verificación:** 2456/2456 unit verdes (normalización de la fuente nueva, combinación de las 4 fuentes, render sin signo/color en ambos sitios, dominio "tesoreria" en la teja, subtítulo "Transferencia"). **Nota de proceso:** el Browser pane interactivo no respondió de forma estable esta sesión (mismo patrón intermitente de sesiones anteriores); la verificación se apoyó en la suite unitaria sobre happy-dom, que ejercita el mismo `render.js`/DOM real de producción, sin revisión visual manual en Chromium.

**Podría afectar:** nada fuera del ledger; la transferencia sigue sin tocar `S.gastos` (invariante de MC.17 verificado desde MC.17a), así que Análisis, Límites de gasto, resumen semanal y monitor de renta no la ven, como se diseñó.

---

### feat(tesoreria): MC.17b formulario + acción de transferir entre cuentas · 2026-07-12

Cierra **MC.17b** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"), segunda rebanada de MC.17. UI sobre la lógica ya cerrada en MC.17a.

**Qué cambió:** botón de entrada "Transferir entre cuentas" en `#tesoreria-transferir` (nuevo `renderBotonTransferir()`, `views/transferencias.js`), visible solo con 2+ cuentas activas (patrón 0/1/2/varias: con menos, no hay dos endpoints posibles). Modal `#modal-transferencia` nuevo con automatización por conteo: con **exactamente 2 cuentas**, `renderParTransferencia()` pinta un widget fijo "De A a B" (origen por defecto = mayor saldo) con botón `⇄` que invierte la dirección sin re-renderizar el resto del form; con **3+ cuentas**, `renderFormTransferencia()` usa dos `renderSelectorCuenta()` independientes (mismo componente de tarjetas que ya usan ingreso puntual y abono a deuda), extendido con un parámetro `name` nuevo (opcional, retrocompatible) para poder renderizar dos radiogroups (`cuentaOrigenId`/`cuentaDestinoId`) en el mismo formulario sin colisión. `_guardarTransferencia()` (`acciones/transferencias.js`) valida con `validarTransferencia()`, confirma el sobregiro con el usuario si `!saldoSuficiente()` (mismo patrón "Registrar igual" que ya usa el formulario de deuda), aplica el traslado con `calcularTransferencia()` de MC.17a vía `editar('cuentas', ...)` ×2, guarda el registro en `S.transferencias` (historial, MC.17c lo mostrará en el ledger) y cierra el modal.

**Archivos tocados:** `modules/dominio/tesoreria/views/transferencias.js` (nuevo), `modules/dominio/tesoreria/acciones/transferencias.js` (nuevo), `modules/dominio/tesoreria/view.js` (barrel: 3 exports nuevos + `renderBotonTransferir()` en `renderTesoreria()`), `modules/dominio/tesoreria/index.js` (`initAccionesTransferencias()`), `modules/infra/cuenta-helper.js` (`renderSelectorCuenta()` gana el parámetro opcional `name`), `index.html` (`#tesoreria-transferir` + modal `#modal-transferencia`), `styles/components/domain.css` (`.transferir-entrada`, `.transferir-par*`), `service-worker.js` (v362→v363 + los 2 módulos nuevos en `CORE_ASSETS`), `tests/unit/tesoreria.test.js` (13 tests nuevos), `tests/e2e/smoke.test.js` (4 E2E nuevos), `docs/BOARD.md`, `docs/contexto/mis-cuentas.md`.

**Verificación:** 2449/2449 unit (gating 0/1/2/varias, ambas ramas del form, widget de par, wiring de invertir, camino feliz con descuento/crédito/historial, camino de error sin tocar S) + 178/178 E2E (4 nuevos en Chromium real: entrada oculta con 1 cuenta, transferencia con 2 cuentas actualiza ambos saldos en las tarjetas y en localStorage, invertir cambia el origen, transferencia con 3+ cuentas vía selectores) + lint verdes. **Nota de verificación:** el Browser pane interactivo no estuvo disponible esta sesión (clasificador de seguridad temporalmente caído); la verificación visual se apoyó en los E2E de Playwright sobre Chromium real (incluyen aserciones de texto visible como `$800.000`/`$400.000` en las tarjetas de cuenta), no en una revisión manual de estilos/espaciado del widget nuevo.

**Podría afectar:** `renderSelectorCuenta()` (`infra/cuenta-helper.js`) gana un parámetro opcional con default retrocompatible; sus 5 callers existentes (apartados, compromisos ×2, gastos, ingresos) siguen sin cambios. El patrimonio total en cuentas no cambia con una transferencia (invariante de MC.17a, verificado en la app): solo se mueve entre dos cuentas propias.

---

### feat(tesoreria): MC.17a fundación de datos + lógica pura de transferencias · 2026-07-12

Cierra **MC.17a** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"), primera rebanada de MC.17 (transferencias entre cuentas propias). Solo fundación de datos + lógica pura, sin UI (verificación solo-unit, precedente de la capa `logic/`).

**Qué cambió:** colección nueva `S.transferencias` con el typedef `Transferencia` (`{ id, cuentaOrigenId, cuentaDestinoId, monto, fecha, nota?, fechaCreacion }`) en `state.js`; bump `SCHEMA_VERSION` v25→v26 con migración idempotente en `storage.js` (`transferencias: []` para usuarios existentes, no toca el resto del estado) + el campo en `createInitialState()` (segunda red vía `_applyToS`). Módulo puro nuevo `logic/transferencias.js` con: `validarTransferencia(datos, cuentas)` (origen/destino existen y activos, distintos, monto > 0, fecha ISO; el saldo insuficiente NO es error de validación, es decisión de UI); `saldoSuficiente(cuentas, origenId, monto)` (para que MC.17b decida si confirma sobregiro); `normalizarTransferencia(datos)` (crudo → schema, omite nota vacía); `calcularTransferencia(transferencia, cuentas)` (apply atómico PURO: devuelve las 2 actualizaciones de saldo + los deltas, o `null` como guard estructural si corrompería saldos). **Invariante clave verificado en tests:** la suma de los deltas es 0 (traslado interno, el patrimonio neto no cambia). El GMF sigue diferido a MC.17d (la función es monto-based; MC.17d le suma un parámetro opcional sin romper la firma).

**Archivos tocados:** `modules/core/state.js` (typedef + colección), `modules/core/storage.js` (SCHEMA_VERSION 26 + migración v25→v26), `modules/dominio/tesoreria/logic/transferencias.js` (nuevo), `modules/dominio/tesoreria/logic.js` (barrel: 4 exports nuevos), `service-worker.js` (v361→v362 + `logic/transferencias.js` en `CORE_ASSETS`), `tests/unit/storage.test.js` (3 tests de migración), `tests/unit/tesoreria.test.js` (23 tests de las 4 funciones puras), `tests/integration/flujos.test.js` (1 test ajustado: usaba `transferencias` como ejemplo de campo desconocido, ahora es legítimo → renombrado a `campoInventado`), `docs/BOARD.md`, `docs/contexto/mis-cuentas.md`.

**Verificación:** 2436/2436 unit (26 nuevos: migración idempotente + preservación de datos + invariante de patrimonio neto + guards estructurales del apply) + 174/174 E2E (boot real con schema v26, `logic/transferencias.js` cargado sin error) + lint verdes.

**Podría afectar:** el bump de schema corre en todo cliente al abrir la app (migración idempotente y aditiva, no toca datos existentes). Ningún código escribe aún en `S.transferencias` (eso es MC.17b): la colección arranca `[]` y el apply es una función pura no invocada todavía por la app.

---

### feat(tesoreria): MC.18e distribuir como tarjeta de entrada que lanza el asistente · 2026-07-12

Cierra **MC.18e** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"), quinta y última rebanada del [ADR 035](DECISIONS/035-mis-cuentas-v2.md) (decisión D6). Cierra la iniciativa MC.18 (rediseño visual de "Mis cuentas") completa.

**Qué cambió:** `renderDistribucionIngreso()` deja de pintar el bloque completo siempre desplegado (chips de preset, desglose fila por fila, editor personalizado y el asistente por pasos, todo junto e inline) y pasa a una **tarjeta de entrada compacta** (`.distribuir-card`): "¿Cómo distribuir $X?" con barra segmentada 50/30/20 + leyenda (Necesidades / Estilo de vida / Ahorro, cada una con % y monto), alertas y el CTA cruzado a Límites de gasto (MC.5e) siempre visibles, y un botón "Distribuir mi ingreso" que **lanza** el asistente como modal (`#modal-distribuir`, nuevo) en vez de desplegarlo inline. Los 3 colores de la barra/leyenda reutilizan tokens de dominio ya existentes (Necesidades = `--fk-dom-tesoreria`, Estilo de vida = `--fk-dom-presupuesto`, Ahorro = `--fk-dom-ahorro`), coinciden exactamente con la paleta aprobada del handoff sin introducir hex nuevos. El motor y los 3 pasos del asistente (MC.7, MC.4a/b/d/e) **no cambian**: `_renderPanelDistribuir()` sigue generando el mismo `<fieldset id="distribuir-ingreso-panel">` con sus pasos paginados, solo se mudó de vivir siempre en el DOM con `hidden` + su propio botón toggle, a inyectarse en `#modal-distribuir-body` (`renderAsistenteDistribucion()`, exportada nueva) cada vez que se abre el modal. Los chips de preset (Automático/Clásicos/Personalizado), el editor de distribución personalizada y la razón del cálculo se mudaron junto con el asistente al modal (mismo contenido, misma lógica, nueva casa). `abrirAsistenteDistribucion()` sigue siendo el único punto de entrada del asistente para todos los callers (botón de la tarjeta, recordatorio de día de ingreso del Calendario ADR 021, oferta tras un ingreso puntual NAV.A2b s2 con `preacreditado`): ninguno cambió su firma ni su contrato. Confirmar la distribución ahora cierra el modal (el snackbar "Deshacer" vive en `<body>`, sobrevive el cierre). La tarjeta se reubicó al final de `#sec-tesoreria`, completando el orden vertical del ADR 035 (hero → tarjetas de cuenta → insight GMF → fuentes de ingreso → distribuir). El `data-action="toggle-distribuir-ingreso"` se conserva por nombre (ahora abre el modal en vez de desplegar/ocultar un panel inline) para no tener que repintar los ~30 call sites que ya lo usan en los tests E2E existentes.

**Archivos tocados:** `index.html` (`#ingresos-distribucion` reubicado al final de la sección, `#modal-distribuir` nuevo), `modules/dominio/tesoreria/views/distribucion.js` (`_construirDatosDistribucion()` nueva, `renderDistribucionIngreso()` reescrita, `renderAsistenteDistribucion()` nueva exportada, `_renderTarjetaDistribuir()` nueva, `_renderContenidoAsistente()` ex `_renderDistribucion()` recortada, `_renderPanelDistribuir()` sin su botón/`hidden` propios), `modules/dominio/tesoreria/view.js` (barrel: exporta `renderAsistenteDistribucion`, reordena `renderTesoreria()`), `modules/dominio/tesoreria/acciones/distribucion.js` (`abrirAsistenteDistribucion()` reescrita para abrir el modal, `_refrescarDistribucion()` nueva, `_toggleDistribuirIngreso()` eliminada, `_confirmarDistribucion()` cierra el modal), `styles/components/domain.css` (`.distribuir-card__*` + `.dist-color-*` nuevos, `.distribucion-row*` muerto eliminado), `tests/e2e/smoke.test.js` (1 test ajustado: conteo de `.section__sub-header` escopado por texto), `service-worker.js` (v360 → v361), `docs/BOARD.md`, `docs/contexto/mis-cuentas.md`.

**Verificación:** 2410/2410 unit (sin cambios, la capa de renderizado del asistente nunca tuvo tests unitarios dedicados) + 174/174 E2E (24 tests existentes del asistente completo verificados sin cambios de código, 1 ajustado por el nuevo sub-header legítimo) + lint verdes. Verificado en el navegador con datos reales: tarjeta compacta con barra/leyenda correctas, botón abre el modal con el asistente completo (3 pasos, monto precargado, foco en el input), colores exactos de la paleta aprobada, cierre del modal funcional.

**Podría afectar:** nada persistido (cero cambios de schema ni de lógica de aplicar/deshacer la distribución). Cualquier caller futuro que asuma que `#distribuir-ingreso-panel` existe en el DOM desde el primer render (en vez de solo tras `abrirAsistenteDistribucion()`) se rompería; no se detectó ninguno fuera de los ya migrados.

---

### feat(tesoreria): MC.18d fuentes de ingreso agrupadas · 2026-07-12

Cierra **MC.18d** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"), cuarta rebanada del [ADR 035](DECISIONS/035-mis-cuentas-v2.md) (decisión D7).

**Qué cambió:** los dos sub-encabezados independientes ("Mis ingresos fijos" con "+ Ingreso fijo", "Otros ingresos" con "+ Ingreso") se fusionan en un solo `.section__sub-header` "Fuentes de ingreso", con las dos acciones ("+ Fijo" / "+ Puntual") lado a lado en `.section__sub-actions` (nuevo, envoltorio genérico reutilizable para agrupar acciones cortas en un sub-header). **Resolución del CTA único del mockup:** en vez de un selector nuevo (menú/popover) para elegir entre fijo y puntual, se mantienen los dos botones existentes, ahora compactos y unidos bajo un solo encabezado; no se inventó una pieza de interacción nueva para dos formularios que ya son deliberadamente distintos (uno recurrente, uno de una sola vez). Ambas listas (`#lista-ingresos`, `#lista-ingresos-puntuales`) quedan una tras otra sin sub-header propio entre ellas, con el lenguaje visual de `.cuenta-card` (radio `lg` + sombra en reposo, tercer y último consumidor del piloto ADR 033 en esta pantalla), sin tocar la `.list-item` base que usan las demás secciones (selector CSS scoped por contenedor). **Máscara (D5):** `renderListaIngresos()` y `renderListaIngresosPuntuales()` extienden `S.config.ocultarSaldo` a cada monto (`SALDO_MASCARA_CUENTA`), el puntual conserva su prefijo `+` incluso enmascarado (`+••••`).

**Archivos tocados:** `index.html` (headers de `#sec-tesoreria` fusionados), `modules/dominio/tesoreria/views/ingresos.js` (`_renderIngresoItem()`, `_renderIngresoPuntualItem()`, `renderListaIngresos()`, `renderListaIngresosPuntuales()`), `styles/layout.css` (`.section__sub-actions`), `styles/components/domain.css` (radio + sombra scoped a `#lista-ingresos`/`#lista-ingresos-puntuales`), `tests/unit/tesoreria.test.js` (2 tests nuevos), `tests/e2e/smoke.test.js` (1 E2E nuevo), `service-worker.js` (v359 → v360), `docs/BOARD.md`, `docs/contexto/mis-cuentas.md`.

**Verificación:** 2410/2410 unit (montos reales vs enmascarados en ambas listas) + 174/174 E2E (1 nuevo en Chromium real: un solo sub-header con las dos acciones, ingreso fijo y puntual creados y visibles, máscara compartida) + lint verdes.

**Podría afectar:** nada persistido (cero cambios de schema ni de lógica de guardado/eliminado, `acciones/ingresos.js` intacto). El aria-label de los botones de agregar no cambió (mismo texto descriptivo), solo su texto visible pasa de "+ Ingreso fijo"/"+ Ingreso" a "+ Fijo"/"+ Puntual".

---

### feat(tesoreria): MC.18c GMF como tarjeta insight integrada · 2026-07-12

Cierra **MC.18c** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"), tercera rebanada del [ADR 035](DECISIONS/035-mis-cuentas-v2.md) (decisión D4).

**Qué cambió:** el indicador del 4x1000 (K.1) deja el formato de nudge suelto (`.nudge nudge-info`, con `border-left` de acento) y pasa a **tarjeta insight** propia (`.gmf-insight`): teja de 30px con icono `%` (`i-percent`, fijo, ya no depende del campo `icono` de `detectarNudgeGMF()`) + título con el costo estimado + detalle, tinte tesorería (7% fondo / 22% borde), pegada justo bajo la lista de cuentas (posición sin cambios, ya estaba ahí desde antes de MC.18). Copy y cálculo intactos (`calcularCostoGMF()`, `detectarNudgeGMF()` sin tocar). Contraste WCAG medido en ambos temas: título/detalle 13.14:1/6.68:1 (oscuro) y 15.72:1/7.96:1 (claro); glifo contra su teja 4.59:1 (oscuro) y 4.19:1 (claro), ambos sobre el umbral de 3:1 para elementos gráficos.

**Archivos tocados:** `index.html` (comentario del contenedor `#tesoreria-gmf`), `modules/dominio/tesoreria/views/cuentas.js` (`_renderNudgeGMF()` → `_renderGMFInsight()`), `styles/components/domain.css` (`.gmf-insight__*`), `tests/unit/tesoreria.test.js` (2 tests nuevos), `tests/e2e/smoke.test.js` (1 E2E nuevo), `service-worker.js` (v358 → v359), `docs/BOARD.md`, `docs/contexto/mis-cuentas.md`.

**Verificación:** 2408/2408 unit (contenedor vacío sin costo, tarjeta con icono/monto/detalle con costo) + 173/173 E2E (1 nuevo en Chromium real: sin gastos no aparece, con un gasto del mes desde una cuenta con GMF aparece con el monto correcto) + lint verdes.

**Podría afectar:** nada persistido ni de cálculo (cero cambios en `logic/cuentas.js`). El campo `icono` que devuelve `detectarNudgeGMF()` (`'gastos'`) ya no lo consume ningún render; se conserva en la función pura porque no hay motivo para romper su contrato de datos por un cambio puramente visual.

---

### feat(tesoreria): MC.18b tarjetas de cuenta con saldo prominente y chips de metadatos · 2026-07-12

Cierra **MC.18b** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"), segunda rebanada del [ADR 035](DECISIONS/035-mis-cuentas-v2.md) (decisión D2), y **absorbe MC.15b** (legibilidad de logos: Davivienda, BBVA, DaviPlata, Nubank).

**Qué cambió:** cada cuenta pasa de `.list-item` con hints apilados de emoji (📅 cuota, 💸 4x1000, 🔑 transferencia) a `.cuenta-card`: teja de banco/billetera **44px** (antes 36px, mejora la legibilidad óptica de los logos densos sin tocar los SVG oficiales, ADR 026/027) + nombre + tipo + **saldo prominente** (700, tabular) en la misma fila + **chips** (icono SVG + texto) para cuota de manejo, 4x1000 y datos de transferencia + editar/eliminar como ghost icons de 32px (**eliminar vira a danger en hover**, patrón nuevo solo de esta tarjeta). **Nombre/tipo, generaliza MC.15a:** con nombre autogenerado, el título se reduce al banco solo ("Bancolombia") y el tipo va debajo con una etiqueta siempre legible (`_tipoLabel()` nuevo: "Ahorros"/"Corriente" para bancos, "Billetera digital" para billeteras, "Dinero en efectivo" para efectivo, nunca duplica el nombre); con un nombre explícito (soportado por `normalizarCuenta()`), el subtítulo vuelve a ser "banco · tipo" como antes. **Máscara (D5):** `renderListaCuentas()` extiende el flag `S.config.ocultarSaldo` a cada tarjeta (`SALDO_MASCARA_CUENTA`, mismo control que el hero de MC.18a). **Icono nuevo:** `assets/svg/iconos/simbolos/key.svg` (`i-key`) diseñado siguiendo el lenguaje v2 (trazo + chispa en el ojo) y publicado al sprite con `scripts/sync-sprite.py`; `i-percent` e `i-agenda` ya existían. Los chips reutilizan `.chip`/`.icon--sm`, cero componente nuevo.

**Archivos tocados:** `assets/svg/iconos/simbolos/key.svg` (nuevo), `index.html` (sprite regenerado, símbolo `i-key`), `modules/dominio/tesoreria/views/cuentas.js` (`_renderCuentaItem()` reescrito, `_tipoLabel()` nuevo, `_formatDatosTransferencia()` → `_labelDatosTransferencia()`), `modules/infra/bancos.js` (uso de `bancoClase()` ya existente), `styles/components/domain.css` (`.cuenta-card__*`), `tests/unit/tesoreria.test.js` (8 tests nuevos + 3 reescritos), `tests/e2e/smoke.test.js` (1 E2E nuevo), `service-worker.js` (v357 → v358), `docs/DECISIONS/035-mis-cuentas-v2.md` (referencia), `docs/BOARD.md`, `docs/contexto/mis-cuentas.md`.

**Verificación:** 2406/2406 unit (nombre/tipo en ambos casos auto/explícito, tipo label por clase, chips de cuota/GMF/transferencia con su icono, saldo enmascarado) + 172/172 E2E (1 nuevo en Chromium real: crear cuenta bancaria con cuota+GMF, verificar nombre/tipo/saldo/chips/botones, verificar máscara por tarjeta) + guardarraíl `sprite-sync.test.js` verde + lint. La legibilidad de los logos (ex MC.15b) se verificó por el cambio de contenedor (44px, cero bytes tocados en los SVG oficiales) y por el E2E en Chromium real; sin captura visual local (preview de este entorno no siempre carga, ver `docs/contexto/mis-cuentas.md` histórico de MC.15b).

**Podría afectar:** nada persistido (cero cambios de schema). Cambia el marcado de la lista de cuentas (`.list-item` → `.cuenta-card`): cualquier selector CSS o test externo que dependiera de `.list-item` específicamente para `#lista-tesoreria` deja de aplicar (ninguno detectado fuera de este archivo).

---

### feat(tesoreria): MC.18a hero con total en cuentas + ojo de privacidad + composición · 2026-07-12

Cierra **MC.18a** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"), primera rebanada del [ADR 035](DECISIONS/035-mis-cuentas-v2.md) (decisiones D1, D3 y D5 sobre el hero), el rediseño de pantalla aprobado por Esteban desde el handoff de Claude Design (mockup `Mis cuentas v2.dc.html`).

**Qué cambió:** la pantalla "Mis cuentas" gana un hero al tope (antes el total de cuentas solo existía en Inicio): label "Tu dinero en cuentas" + total protagonista (mono, extrabold, tabular) + **ojo de privacidad** anclado a la esquina (posición estable, solo cambia el contenido) + **barra de composición** (un segmento por cuenta con saldo positivo, ancho proporcional, tintes de `--fk-dom-tesoreria` por peso: mayor saldo = más opaco) + resumen en texto ("3 cuentas · 1 billetera · efectivo", para que el color nunca viaje solo). El ojo comparte `S.config.ocultarSaldo` con el de Inicio (IN.2): un solo control de privacidad en toda la app, enmascarar aquí enmascara allá y viceversa. Sin cuentas: "Aún no tienes cuentas" + $0, sin ojo ni barra. Superficie con degradado de identidad tesorería (16%) + borde (30%) + sombra en reposo: segundo consumidor del piloto ADR 033, contraste WCAG medido contra la parada fuerte (oscuro: primario 11.36:1, secundario 5.78:1; claro: 14.39:1 y 7.28:1); el resumen usa texto secundario, no muted (lección de IN.8b).

**Archivos tocados:** `index.html` (contenedor `#tesoreria-hero`), `modules/dominio/tesoreria/logic/cuentas.js` (`composicionCuentas()`, `resumenCuentas()` puras nuevas), `modules/dominio/tesoreria/views/cuentas.js` (`renderHeroTesoreria()`), `modules/dominio/tesoreria/view.js` (barrel + `renderTesoreria()`), `modules/dominio/tesoreria/logic.js` (barrel), `modules/dominio/tesoreria/acciones/cuentas.js` (acción `tesoreria-saldo-visibilidad`), `styles/components/domain.css` (`.hero-tesoreria__*`; el ojo comparte reglas con `.hero-inicio__ojo`), `tests/unit/tesoreria.test.js` (8 tests nuevos), `tests/e2e/smoke.test.js` (1 E2E nuevo), `service-worker.js` (v356 → v357), `docs/DECISIONS/035-mis-cuentas-v2.md` (nuevo), `docs/BOARD.md`, `docs/contexto/mis-cuentas.md`.

**Verificación:** 2403/2403 unit (composición ordenada por peso y pct, exclusión de inactivas/saldo 0, resumen singular/plural/billetera/efectivo, hero con total y aria-pressed, máscara sin monto real en el DOM, estado vacío sin ojo, acción que alterna y re-renderiza) + 171/171 E2E (1 nuevo en Chromium real: estado vacío, total tras crear cuenta, máscara compartida con el saldo de Inicio, destape) + lint verdes.

**Podría afectar:** nada persistido (reutiliza `S.config.ocultarSaldo`, cero cambios de schema). El ojo de Inicio ahora tiene un segundo punto de control del mismo flag: al volver a Inicio, `updSaldo()` ya refleja el cambio hecho desde Mis cuentas (cubierto por el E2E).

---

### feat(tesoreria): MC.15c aviso de cuota de manejo + MC.15d orden categoría→descripción · 2026-07-12

Cierra **MC.15c** y **MC.15d** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2", tarjeta MC.15). Con esto y la absorción de MC.15b por MC.18b (ADR 035), la tarjeta MC.15 queda cerrada.

**Qué cambió:** (MC.15c) al crear o editar una cuenta, el formulario muestra un hint bajo el toggle de cuota de manejo ("¿Seguro que esta cuenta no cobra cuota de manejo, seguros u otros costos periódicos?") mientras el toggle está SIN marcar; al marcarlo, el hint desaparece y aparece el fieldset de monto/día como siempre. No bloquea el guardado: solo reduce el olvido de un costo recurrente real. El hint vive dentro del mismo `.form-group--checkbox` del toggle, así que el caso "efectivo" de `_toggleCamposPorClase()` ya lo oculta sin wiring adicional. (MC.15d) `renderFormIngresoPuntual()` reordena sus campos a monto → cuenta → categoría → descripción → fecha, el mismo orden que ya cumplía `renderFormIngreso()` (fijos).

**Archivos tocados:** `modules/dominio/tesoreria/views/cuentas.js` (hint en `renderFormCuenta()`), `modules/dominio/tesoreria/acciones/cuentas.js` (`_toggleCuotaFieldset()` sincroniza el hint), `modules/dominio/tesoreria/views/ingresos.js` (orden de campos), `tests/unit/tesoreria.test.js` (3 tests nuevos), `service-worker.js` (v355 → v356), `docs/contexto/mis-cuentas.md`, `docs/BOARD.md`.

**Verificación:** 2394/2394 unit (hint presente y visible por defecto, toggle lo oculta/restaura, orden categoría antes que descripción) + lint verdes.

**Podría afectar:** nada persistido (cero cambios de schema ni de lógica de guardado). **CAT.4** (auditoría transversal de formularios) debe saber que el form de ingreso puntual ya cumple el orden categoría→descripción.

---

### feat(logros): LG.2c constancia de registro + familia deudas saldadas · 2026-07-12

Cierra **LG.2c** (`docs/BOARD.md`, iniciativa "Logros v2"), tercera rebanada del [ADR 032](DECISIONS/032-logros-v2-niveles-y-habitos.md) (decisiones D3 y D4).

**Qué cambió:** dos derivaciones puras nuevas en `logros/logic.js`: `mesCompleto(gastos, mesISO)` (¿el mes tuvo gasto en al menos 3 de sus ~4.4 semanas? bloque de 7 días desde el día 1, el bloque final corto cuenta como semana propia) y `rachaMesesCompletos(gastos, hoyISO)` (racha de meses completos consecutivos, contada hacia atrás desde el mes ANTERIOR a hoy: el mes en curso nunca cuenta porque todavía no terminó). Ambas reciben `hoyISO`/`mesISO` inyectado (mismo patrón que el resto del código: testeables sin mockear `Date`) y comparten un solo pase O(gastos) (`_semanasPorMes()`) para no recorrer el historial una vez por mes consultado. **4 niveles nuevos de la familia "registro"** (`mes-completo`, `tres-meses-seguidos`, `seis-meses-seguidos`, `doce-meses-seguidos`), cada `eval` del catálogo llama a la racha memoizada (`_rachaMesesCompletosMemo`, PERF.2: evita recorrer `S.gastos` 4 veces en una misma pasada de `evaluarLogros()`) con `hoy()` real. **Familia "deudas" nueva**: `deudasSaldadas(compromisos)` cuenta deudas (entidad o personal) con `saldoTotal === 0`, **excluyendo explícitamente las consolidadas** (`_aplicarConsolidacion()` en `compromisos/index.js` archiva la deuda vieja con `activo:false` pero nunca toca su `saldoTotal`: transformarse en un crédito nuevo no es "pagarla", tal como pide el ADR); una deuda archivada manualmente después de llegar a 0 sigue contando. 2 logros nuevos: `primera-deuda-saldada` y `tres-deudas-saldadas`.

**Archivos tocados:** `modules/dominio/logros/logic.js` (`mesCompleto()`, `rachaMesesCompletos()`, `deudasSaldadas()`, 6 entradas nuevas en `LOGROS`, `FAMILIAS.deudas`), `tests/unit/logros.test.js` (24 tests nuevos + 4 ajustados por el crecimiento de la familia registro de 2 a 6 niveles), `tests/e2e/smoke.test.js` (1 E2E nuevo), `service-worker.js` (v354 → v355), `docs/contexto/transversal.md`, `docs/BOARD.md` (LG.2d: su bloqueo por IN.8 se levanta, ya solo espera a ANL.1).

**Verificación:** 2391/2391 unit (semanas por mes, mes completo con bloque final corto, racha que cruza el cambio de año, racha que corta en el primer mes incompleto, deudas saldadas excluyendo consolidadas, integración catálogo↔evaluarLogros con fake timers para los 4 niveles nuevos) + 170/170 E2E (1 nuevo en Chromium real: familia "Deudas saldadas" agrupada en la vitrina) + lint verdes.

**Podría afectar:** nada persistido más allá de lo ya vigente (`S.logros` sigue siendo `string[]`, sin bump de schema, tal como diseña el ADR). El catálogo pasa de 11 a 17 logros; con 17 (no los ~20 previstos para cuando LG.2e agregue la familia comportamiento), el tramo superior de `NIVELES_USUARIO` ("Leyenda del ahorro", min 18) queda temporalmente inalcanzable, fuera del alcance declarado de esta rebanada.

---

### feat(ui): IN.8g fusión accesos rápidos + actividad reciente, cierra "Inicio v2" · 2026-07-12

Cierra **IN.8g** (`docs/BOARD.md`), séptima y última rebanada del [ADR 034](DECISIONS/034-inicio-v2.md) (decisión D7). **Con esta rebanada, la iniciativa "Inicio v2" queda completa.**

**Qué cambió:** "Accesos rápidos" y "Actividad reciente" (antes dos bloques independientes, cada uno su propio `bento__cell`/card) quedan fusionados en un solo contenedor (`.accesos-actividad`), cierre de la pantalla de Inicio. **Arriba:** header con label "Accesos rápidos" + botón "Personalizar" en la misma fila (antes el botón vivía debajo de la grilla, sin label visible) + grilla de tiles sin cambios (`renderAccesosInicio()`/`accesosVisibles()` intactos). **Abajo**, separado por `border-top` (`.accesos-actividad__seccion--actividad`, que desaparece junto con el panel cuando no hay movimientos, sin lógica nueva): header con label "Actividad reciente" + link "Ver todo" en la misma fila (antes: encabezado con ícono propio arriba, "Ver todo" como pie de página al final de la lista) + lista de movimientos sin cambios (`movimientosRecientes()` intacto, mismo signo +/- por dirección). **Cero cambios en `accesos/logic.js` y `movimientos/logic.js`** (regla explícita del ADR: solo contenedor/posición).

**Archivos tocados:** `index.html` (marcado fusionado del bloque final), `modules/dominio/movimientos/view.js` (`renderActividadReciente()`: header simplificado, ya no genera su propia `<section>`/`<header>` con ícono), `styles/components/domain.css` (`.accesos-actividad*` nuevo toma la superficie de card que antes tenían por separado ambos bloques; `.actividad-reciente__ver-todo` pasa de pie de página a link inline), `tests/unit/movimientos.test.js` (2 tests nuevos), `tests/e2e/smoke.test.js` (1 E2E nuevo), `service-worker.js` (v353 → v354), `docs/contexto/inicio.md`.

**Verificación:** 2367/2367 unit (label "Actividad reciente" en el header compartido sin su propia card/ícono, ausencia de las clases retiradas) + 169/169 E2E (1 nuevo en Chromium real: un solo contenedor visual, ambos labels, botón Personalizar visible, grilla de accesos, link "Ver todo" con href correcto, separador en la sección de actividad) + lint verdes.

**Podría afectar:** nada persistido ni de comportamiento (cero cambios de schema, cero cambios de lógica). Visualmente el botón "Personalizar" y el link "Ver todo" cambian de posición (ahora junto a sus labels respectivos, no como pie de página).

---

### feat(resumen): IN.8f resumen semanal visual con serie diaria + barras + chip comparativo · 2026-07-12

Cierra **IN.8f** (`docs/BOARD.md`, iniciativa "Inicio v2"), sexta rebanada del [ADR 034](DECISIONS/034-inicio-v2.md) (decisión D6).

**Qué cambió:** `resumenSemanal()` (`resumen/logic.js`) se extiende de forma aditiva (ningún campo existente cambia de forma ni de valor) con **`serie`** (7 días, ordenados de más antiguo a más reciente, `serieDiaria()` nuevo, cálculo puro dentro del mismo bundle memoizado de PERF.2/7b, sin memo nueva), **`diasActivosSemana`** (días de la ventana de 7 con gasto real, distinto de `diasActivos` mensual que se conserva sin cambios) y **`diaPico`** (nombre completo del día con más gasto, `null` si la semana no tuvo gasto). `renderPanelResumen()` reemplaza el grid plano de estadísticas por un bloque visual bespoke (`.resumen-semana__*`, namespace propio: `.resumen-card__grid/__stat/__label/__value` **no se tocan** porque "Me deben" (`personales-resumen`) los reutiliza): monto grande (`--fk-text-3xl`) + **chip comparativo** compacto ("12% menos" en verde `--fk-success-bg/-text` solo cuando el gasto bajó; "12% más"/"igual"/"sin previa" comparten un tono neutro, mismo criterio que IV.3 en Análisis: **nunca rojo**, ADR 019) + **mini gráfico de 7 barras** (`--fk-accent` al 100% en el día pico, ~28% de opacidad en el resto, alto proporcional con tope al 72% del contenedor) + etiquetas de día resaltadas en el pico + fila de **categoría top** con `tejaCategoria()` (36px) y mensaje interpretativo ("Mercado fue tu categoría top · 2 de 7 días activos · mayor gasto el sábado"). El label cambia a "Gastaste esta semana" (antes "Gastaste estos 7 días") para calzar con el copy del diseño hifi. El viejo stat "Constancia" (días activos del mes) se retira de este panel (Análisis cubre el detalle mensual); `.resumen-card__trend*` quedó sin consumidor tras el cambio y se eliminó como CSS muerto.

**Archivos tocados:** `modules/dominio/resumen/logic.js` (`serieDiaria()`, `resumenSemanal()` extendido), `modules/dominio/resumen/view.js` (rediseño completo de `renderPanelResumen()`, chip/barras/categoría top), `styles/components/domain.css` (`.resumen-semana__*` nuevo, `.resumen-card__trend*` eliminado), `tests/unit/resumen.test.js` (11 tests nuevos), `tests/e2e/smoke.test.js` (1 E2E nuevo), `service-worker.js` (v352 → v353), `docs/contexto/inicio.md`.

**Verificación:** 2366/2366 unit (serie diaria ordenada y sumada por ventana, campos nuevos de `resumenSemanal()`, `diaPico` null sin gasto, 7 barras en el DOM, chip verde al bajar, chip neutro al subir, categoría top con días activos y día pico, defensivo sin categoría top) + 168/168 E2E (1 nuevo en Chromium real: monto, chip, 7 barras con 1 pico, categoría top con teja y monto) + lint verdes.

**Podría afectar:** nada persistido (cero cambios de schema). El stat "Constancia" (días activos del mes) ya no aparece en el panel de Inicio; ese detalle sigue disponible en Análisis.

---

### feat(compromisos): IN.8e Pendientes del mes sin línea roja + Gestionar → Calendario · 2026-07-12

Cierra **IN.8e** (`docs/BOARD.md`, iniciativa "Inicio v2"), quinta rebanada del [ADR 034](DECISIONS/034-inicio-v2.md) (decisión D5).

**Qué cambió:** `renderPanelVencidos()` (`compromisos/views/dashboard.js`) deja el `border-left: 3px solid var(--fk-danger)` de `.vencidos-card` (ADR 019, "gastar no es incumplir"): la urgencia vive SOLO en un texto de estado por ítem, nunca en el borde/fondo de toda la tarjeta. Cada ítem gana una fila `.vencidos-card__meta` con **badge corto** ("Deuda"/"Gasto fijo", `_tipoBadgeCorto()` nuevo, propio de este panel; `_tipoBadge()` con las etiquetas largas sigue intacto para "Próximas prioridades") + **estado temporal semántico** ("Venció hace N días"/"Venció ayer" en `--fk-danger-text`, "Vence hoy" en `--fk-warning-text`, tokens ya validados AA en el resto de la app). El **título** deja de incluir el conteo ("2 pendientes del mes" → "Pendientes del mes"); el número pasa a un **badge circular** en el header (`.vencidos-card__counter`, `--fk-danger-bg`/`-text`). El monto de cada ítem sube a peso `--fk-font-bold` + `font-variant-numeric: tabular-nums` (el 15px del mockup no tiene token exacto en la escala; se conserva `--fk-text-sm`, mismo criterio de IN.8b). **"Gestionar" pasa de `#compromisos` a `#agenda`**: el Calendario es el centro de gestión de obligaciones por fecha (ampliación del 3.er lote del 2026-07-08, formalizada ahora en el ADR); `aria-label` actualizado a "Ir al calendario", igual que "Próximas prioridades".

**Archivos tocados:** `modules/dominio/compromisos/views/dashboard.js` (`_tipoBadgeCorto()`, `renderPanelVencidos()`), `styles/components/domain.css` (`.vencidos-card` sin border-left, `__counter`, `__meta`, `__estado--danger/--warning`, `__name`/`__amount` con peso y tabular-nums), `tests/unit/compromisos.test.js` (7 tests nuevos), `tests/e2e/smoke.test.js` (1 E2E nuevo), `service-worker.js` (v351 → v352), `docs/contexto/inicio.md`.

**Verificación:** 2356/2356 unit (7 nuevos: título sin conteo + badge circular, "Venció hace 2 días" en danger con badge "Deuda", "Vence hoy" en warning con badge "Gasto fijo", deuda personal también usa "Deuda", "Venció ayer", ausencia de clases de severidad viejas, link a `#agenda` con aria-label nuevo) + 167/167 E2E (1 nuevo en Chromium real: badge corto, colores semánticos por estado, click en "Gestionar" navega a `#sec-agenda`) + lint verdes.

**Podría afectar:** nada persistido (cero cambios de schema). Un usuario que antes llegaba a la lista completa de Compromisos desde "Gestionar" ahora llega al Calendario; la lista de Compromisos sigue accesible por su propio ícono de navegación.

---

### feat(ui): IN.8d header de perfil con avatar de iniciales + saludo en dos líneas · 2026-07-12

Cierra **IN.8d** (`docs/BOARD.md`, iniciativa "Inicio v2"), cuarta rebanada del [ADR 034](DECISIONS/034-inicio-v2.md) (decisión D8, cierra la absorción de IN.6b: iniciales, sin foto).

**Qué cambió:** el header de `#sec-dash` deja el título "Tu resumen" + subtítulo y pasa a un header de perfil (`.perfil-inicio`): **teja de iniciales** 46×46px/radio 14px con gradiente del acento y tinta oscura (tokens nuevos `--fk-avatar-grad-a/-grad-b/-ink` en `tokens.css`, colores FIJOS en ambos temas por el criterio de tejas de marca del ADR 025; contraste 9.6:1 sobre la parada más clara del gradiente), **saludo en dos líneas** (`#saludo-franja` "Buenas tardes," 14px secundario arriba; `#saludo-inicio` con el nombre 20px/700 abajo, ahora título visual de la pantalla; medidas ajustadas a la escala de tokens, mismo criterio que IN.8b) y **enlace de ajustes** 40×40px a `#config` (`.perfil-inicio__ajustes`, reusa el símbolo `i-ajustes`). `updSaludo()` (`render.js`) reparte franja/nombre/iniciales; `_iniciales()` nuevo toma la primera letra de las dos primeras palabras del nombre con spread (no parte caracteres de dos unidades de código). **Fallback sin nombre** (decisión que el ADR delegaba a la rebanada): la franja saluda sola (sin coma) y nombre y avatar se ocultan; sin dato nuevo ni bump de schema. **Encabezado accesible resuelto:** el h1 "Tu resumen" queda `sr-only` y la sección conserva su nombre de región vía `aria-labelledby` (pase axe WCAG 2.1 AA del suite unitario verde con el marcado nuevo). La lógica de franjas horarias (IN.6a) no cambió.

**Archivos tocados:** `index.html` (header de `#sec-dash`), `modules/infra/render.js` (`updSaludo()` + `_iniciales()`), `styles/components/domain.css` (`.perfil-inicio*`), `styles/tokens.css` (`--fk-avatar-*`), `tests/unit/render.test.js` (fixture réplica del header + tests de iniciales y fallbacks), `service-worker.js` (v350 → v351), `docs/contexto/inicio.md`.

**Verificación:** 2349/2349 unit (2 netos nuevos: iniciales con 1 y 2+ palabras, franja sin coma y avatar oculto sin nombre, más el fixture del header nuevo en toda la suite de `updSaludo()`) + 166/166 E2E en Chromium real + lint verdes. El pase axe sobre `index.html` (violaciones críticas/graves, ARIA, IDs duplicados) corre dentro del suite unitario y pasó con el marcado nuevo.

**Podría afectar:** nada persistido (cero cambios de schema ni de datos). Lectores de pantalla siguen anunciando la región como "Tu resumen"; visualmente el título de Inicio ahora es el nombre del usuario (o el saludo genérico si no hay nombre).

---

### feat(ui): IN.8c detalle por cuenta expandible en el hero + máscara extendida · 2026-07-12

Cierra **IN.8c** (`docs/BOARD.md`, iniciativa "Inicio v2"), tercera rebanada del [ADR 034](DECISIONS/034-inicio-v2.md) (decisión D4, resuelve la decisión UX que IN.2 dejó abierta).

**Qué cambió:** bajo el monto del hero aparece el pill `#saldo-detalle-toggle` ("Ver detalle por cuenta" ↔ "Ocultar detalle", con `aria-expanded`/`aria-controls`) que expande in situ una lista con una fila por cuenta activa: teja de marca del banco (`bancoAvatar()`, ADR 025), nombre (escapado) y saldo tabular; el efectivo es una fila más. Reglas del ADR implementadas tal cual: **colapsado por defecto** y **estado solo de UI en memoria** (`_detalleCuentasAbierto` en `render.js`; la acción nueva `saldo-detalle` no llama a `save()` ni toca `S.config`, verificado por test); **la máscara del ojo cubre total Y detalle juntos** (extensión de IN.2: filas con `SALDO_MASCARA_CUENTA` y ningún saldo real toca el DOM mientras está oculto); **el conteo "efectivo + N cuentas bancarias" solo colapsado** y ahora con datos reales (`_descCuentas()`: "efectivo + 2 cuentas bancarias", "1 cuenta bancaria", "solo efectivo"; antes era un texto fijo). Animación de entrada de 180 ms solo con `opacity` + `transform` (disciplina ADR 033 D4), apagada bajo `prefers-reduced-motion`. Helper nuevo `bancoClase()` en `infra/bancos.js`, espejo de `claseEntidad()` (tesorería) para consumidores de infra que no pueden importar dominios (ADN 10).

**Archivos tocados:** `index.html` (pill + lista en el hero), `modules/infra/render.js` (estado, `alternarDetalleCuentas()`, filas, conteo real, `SALDO_MASCARA_CUENTA`), `modules/ui/actions.js` (acción `saldo-detalle`), `modules/infra/bancos.js` (`bancoClase()`), `styles/components/domain.css` (pill, tile en miniatura, filas, animación), `tests/unit/render.test.js` (fixture + 10 tests), `tests/e2e/smoke.test.js` (1 test), `service-worker.js` (v349 → v350), `docs/contexto/inicio.md`.

**Verificación:** 2347/2347 unit (10 nuevos: default colapsado, conteos singular/plural/sin efectivo/solo efectivo, filas con tejas y montos, máscara total+detalle sin montos reales en el DOM, colapso limpia, sin cuentas oculta todo, escape de nombre, acción sin persistencia) + 166/166 E2E (1 nuevo en Chromium real: expandir, enmascarar, desenmascarar y recargar vuelve colapsado) + lint verdes. Capturas móvil en ambos temas (expandido y enmascarado) revisadas contra el mockup; fix visual encontrado en la revisión: el pill estiraba al ancho completo por el stretch del flex column, corregido con `align-self: center`.

**Podría afectar:** nada persistido (cero cambios de schema). El texto del conteo bajo el saldo cambia de fijo a real: usuarios sin cuenta de efectivo dejan de leer "efectivo + ..." engañoso.

---

### feat(ui): IN.8b hero con saldo protagonista + ojo estable + piloto visual ADR 033 · 2026-07-12

Cierra **IN.8b** (`docs/BOARD.md`, iniciativa "Inicio v2"), segunda rebanada del [ADR 034](DECISIONS/034-inicio-v2.md) (decisiones D2 y D3) y estreno del piloto acotado del [ADR 033](DECISIONS/033-direccion-visual-premium.md) (D1 sombra en reposo + D2 degradado de identidad, solo en el hero de Inicio; DV.2a sigue pendiente).

**Qué cambió:** el hero (`index.html`, clase nueva `.hero-inicio` sobre la celda) queda centrado y sin el ícono decorativo `i-saldo` (`#hero-saldo-icon` eliminado del DOM y de `updSaldo()`): label "Tu dinero disponible hoy" en sentence case (14px, secundario), monto protagonista (objetivo 42px/800; `clamp()` solo protege pantallas < 390px de un saldo de 9 cifras; tabular-nums; letter-spacing -0.02em; color primario: la identidad la pone el degradado, no el número verde de antes), descripción 12px secundario. El **ojo de privacidad** (D3) pasa a `position:absolute` en la esquina superior derecha del hero, reescrito como botón propio (sin `.btn`: el min-height táctil de 44px que responsive.css impone a `.btn` deformaría los 40px del diseño; 40px cumple WCAG 2.5.8). Al alternar visible/oculto solo cambian el ícono y el contenido del monto: la posición del control queda estable al píxel. Fondo del piloto: `linear-gradient(160deg, color-mix(accent 14%, transparent), transparent 55%)` sobre `--fk-bg-surface`, borde `--fk-accent-border`, sombra `--fk-shadow-md`; ambos temas heredan por tokens sin tocar `themes.css`.

**Contraste WCAG (método IV.1/IV.2, medido contra la parada fuerte del degradado):** oscuro (#193433 compuesto): primario 11.16:1, secundario 5.67:1 (AA texto pequeño); claro (#def4ec): primario 14.62:1, secundario 7.40:1. El texto muted queda excluido del hero (4.13:1 en oscuro, falla AA); las cifras viven como comentario en el propio CSS.

**Archivos tocados:** `index.html` (marcado del hero), `modules/infra/render.js` (`updSaldo()` sin el ícono; contrato de `S.config.ocultarSaldo` intacto), `styles/components/domain.css` (bloque `.hero-inicio*` reemplaza a `.hero-saldo*`), `styles/responsive.css` (excepción de padding del hero en móvil), `tests/unit/render.test.js` (fixture al marcado nuevo), `tests/e2e/smoke.test.js` (1 E2E nuevo), `service-worker.js` (v348 → v349), `docs/contexto/inicio.md`.

**Verificación:** 2337/2337 unit + 165/165 E2E + lint verdes. E2E nuevo: la posición del ojo medida en reposo (`boundingBox`) es idéntica en visible → oculto → visible. Hallazgo del proceso: el corrimiento de 2px que apareció al medir era el lift de hover de `.bento__cell` (comportamiento preexistente por diseño, documentado en el test); el defecto real de IN.2 (el ojo saltaba con el ancho de la máscara) quedó corregido de raíz. Capturas móvil/desktop en ambos temas revisadas contra el mockup.

**Podría afectar:** el monto pierde el verde acento (decisión del diseño hifi); el empty state del hero (`hero-guia`) no cambió. `bento__value--xl` y `bento__cell--accent` quedan sin consumidores en Inicio (la limpieza de CSS muerto vive en PERF.8).

---

### feat(ui): IN.8a reorden del dashboard + labels de grupo + aire · 2026-07-12

Cierra **IN.8a** (`docs/BOARD.md`, iniciativa "Inicio v2"), la primera rebanada de implementación del [ADR 034](DECISIONS/034-inicio-v2.md) (decisión D1: lo accionable sube, los atajos bajan).

**Qué cambió:** el `.bento--dash` de `index.html` queda en el orden nuevo: hero → grupo "Atención hoy" (nudge de distribuir ingreso + Pendientes del mes + Próximas prioridades + alertas de límites) → grupo "Resumen de la semana" → accesos rápidos → actividad reciente al final. Los dos grupos usan un contenedor nuevo `.bento__group` (layout.css): label de grupo `.bento__group-label` (12px/700, uppercase, letter-spacing 0.07em, `--fk-text-muted`: pasa AA sobre bg-base, donde se apoya) + grilla interna `.bento__group-cells` que espeja las columnas del bento por breakpoint (12 desktop / 6 tablet / 1 móvil, responsive.css), así los spans `--full`/`--half` existentes siguen valiendo. Un grupo sin ninguna celda visible desaparece completo (label incluido) vía `:has()`, respetando el patrón `[hidden]` de los paneles dinámicos. Los 6 paneles dinámicos ganan `.bento__cell--flat` (utils.css, capa más alta a propósito: debe ganarle al padding móvil de `.bento__cell` en la capa responsive y al `margin-bottom` de las cards internas en la capa components): el componente interno pone su propia superficie/borde y desaparece el doble contenedor card-dentro-de-card que existía desde TX.8a. Aire en móvil: 20px entre bloques de primer nivel (`.bento--dash`), 12px entre tarjetas dentro de un grupo. `renderPanelResumen()` (`resumen/view.js`) deja de repetir el encabezado interno "Resumen de la semana": el label del grupo es el título (el rediseño completo de esa card llega en IN.8f).

**Archivos tocados:** `index.html` (orden del `.bento--dash` + grupos), `styles/layout.css` (`.bento__group*`), `styles/utils.css` (`.bento__cell--flat`), `styles/responsive.css` (columnas espejo + aire móvil), `modules/dominio/resumen/view.js` (sin encabezado interno), `service-worker.js` (v347 → v348), `docs/contexto/inicio.md`.

**Verificación:** 2337/2337 unit + 164/164 E2E + lint verdes (ningún dominio cambió su lógica: no hacían falta tests nuevos). Geometría medida en Chromium real con datos sembrados (script de captura + medición): label→cards 12px, card→card dentro del grupo 12px, bloque→bloque 20px, celdas planas sin padding fantasma. Capturas móvil/desktop en ambos temas revisadas.

**Podría afectar:** cualquier flujo que dependa del orden visual del dashboard (los E2E de navegación pasan porque localizan por id/aria, no por posición). La línea roja de "Pendientes del mes" y el diseño interno de cada panel siguen igual: cambian en IN.8e/IN.8f.

---

### docs(adr): IN.8 fase de análisis, ADR 034 Inicio v2 escrito + iniciativa re-cortada en rebanadas · 2026-07-12

Cierra la fase de análisis/ADR de la iniciativa **"Inicio v2" (IN.8)**, la tarjeta que exigía revisión formal del ADR 028 antes de codificar. Detonante: Esteban entregó el handoff de diseño de alta fidelidad (`Iteración de specimen/design_handoff_inicio_v2/`: mockup HTML interactivo construido con los tokens reales de `tokens.css`/`themes.css` + documento de decisiones D1 a D8) y dio la instrucción de implementar el diseño con sus opciones recomendadas.

**Qué se decidió (nuevo [ADR 034](DECISIONS/034-inicio-v2.md), Aceptada):** orden vertical nuevo (perfil → hero → "Atención hoy" → "Resumen de la semana" → accesos+actividad fusionados al final; reemplaza el D1 del ADR 028 conservando "un rol por bloque"); hero con saldo centrado protagonista (42px/800 tabular, sin el ícono `i-saldo` decorativo) sobre degradado de identidad + `--fk-shadow-md`; ojo de privacidad con posición absoluta estable (corrige el desplazamiento al alternar); "Ver detalle por cuenta" expandible (colapsado por defecto, estado UI en memoria sin persistir, máscara del ojo extendida al detalle); "Pendientes del mes" sin línea roja (jerarquía por teja de dominio + `.dom-badge` + estado temporal semántico solo en el texto; "Gestionar" pasa de `#compromisos` a `#agenda`, ampliación del 3.er lote); resumen semanal como bloque más visual (monto grande + chip comparativo nunca rojo + barras de 7 días + categoría top); header de perfil con teja de iniciales (sin foto, ratifica ADR 028 D3/ADR 030; sin bump de schema, las iniciales se derivan de `S.perfil.nombre`, así que el bump v24 previsto para IN.6b ya no hace falta).

**Verificaciones hechas contra el código en esta fase:** `resumenSemanal()` (`resumen/logic.js`) NO expone serie diaria, solo agregados (el gráfico de IN.8f requiere cálculo puro nuevo, dentro del bundle memoizado de PERF.2/7b); "Gestionar" apunta hoy a `#compromisos` (`renderPanelVencidos()`); los tokens `--fk-shadow-*` existen en ambos temas pero `--fk-grad-identity` no (lo estrena IN.8b sobre `--fk-accent`); el ojo del hero vive en flujo junto al monto (causa real del salto reportado).

**Estado del [ADR 033](DECISIONS/033-direccion-visual-premium.md):** pasa de "Propuesta" a "Propuesta con estreno parcial autorizado": D1 (sombra en reposo) y D2 (degradado de identidad) se consumen acotados al dashboard de Inicio como piloto, en línea con las recomendaciones de P1/P5; P2, P3, P4 y el despliegue global (DV.2a a DV.2d) siguen pendientes de validación formal.

**Archivos tocados:** `docs/DECISIONS/034-inicio-v2.md` (nuevo), `docs/DECISIONS/033-direccion-visual-premium.md` (estado), `docs/BOARD.md` (tarjeta IN.8 reemplazada por las rebanadas IN.8a a IN.8g, con dependencias y modelo por rebanada; notas de "En proceso" y LG.2d actualizadas), `docs/contexto/inicio.md`, `docs/HANDOFF.md`. Sin cambios de código, tests ni SW.

**Podría afectar:** nada en producción (solo documentación). La implementación arranca con **IN.8a** (reorden del dashboard + labels de grupo + aire); cada rebanada saldrá con tests verdes, verificación en la app, bump de `CACHE_NAME` y push.

---

### feat(tesoreria): MC.15a menos redundancia en tarjetas de cuenta e ingreso fijo · 2026-07-11

Cierra la primera rebanada de **MC.15** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"): la tarjeta se re-cortó en MC.15a/b/c/d (regla 2.1, la tarjeta original tocaba texto duplicado, CSS de logos, un aviso nuevo y orden de formulario, cuatro concerns independientes). Esta rebanada cierra los puntos 1 y 20 del brief.

**Diagnóstico:** la tarjeta de una cuenta mostraba "Banco de Bogotá Ahorros" (título) seguido de "Banco de Bogotá · Ahorros" (subtítulo): pura repetición, porque el formulario de cuentas (`renderFormCuenta()`) nunca ofrece un campo para escribir un nombre propio, así que `cuenta.nombre` siempre sale de `_autoNombre(banco, tipo)` (`logic/cuentas.js`) y ya contiene ambos datos. La tarjeta de un ingreso fijo tenía el mismo problema cuando la descripción coincidía con la categoría elegida (ej. descripción "Salario mínimo" + categoría "Salario mínimo" → subtítulo "Quincenal · Salario mínimo").

**Qué cambió:** en `modules/dominio/tesoreria/views/cuentas.js`, `_renderCuentaItem()` compara `cuenta.nombre` (normalizado: trim + minúsculas) contra el combinado `banco tipo`; si coinciden, omite el subtítulo por completo. Importante: no se asumió que el subtítulo sobra siempre. `normalizarCuenta()` (`logic/cuentas.js`) ya soporta un nombre explícito distinto si algún día el form lo expone (sus propios tests lo prueban: "respeta el nombre del usuario si lo provee"), así que en ese caso el subtítulo se conserva porque sí aportaría información nueva. En `modules/dominio/tesoreria/views/ingresos.js`, `_renderIngresoItem()` omite la categoría del subtítulo cuando coincide (normalizada) con la descripción, dejando solo la frecuencia; si difieren, conserva ambas como antes (el caso común y útil, ej. descripción "Sueldo Claro" + categoría "Salario mínimo").

**Archivos tocados:** `modules/dominio/tesoreria/views/cuentas.js`, `modules/dominio/tesoreria/views/ingresos.js`, `tests/unit/tesoreria.test.js` (5 tests nuevos), `service-worker.js` (v346 → v347), `docs/contexto/mis-cuentas.md`.

**Verificación:** 2337/2337 unit verdes (5 nuevos: nombre autogenerado sin subtítulo, caso banco===tipo sin subtítulo, nombre explícito con subtítulo, descripción=categoría en ingresos omite categoría con match case-insensitive, descripción≠categoría conserva ambas). Lint verde.

**Podría afectar:** ninguna cuenta o ingreso real pierde información: en cuentas, el 100% de las existentes tiene `nombre` autogenerado (ningún form ni migración histórica escribió uno distinto, confirmado por `git log -S` sobre el archivo del formulario), así que todas dejan de mostrar el subtítulo; en ingresos, solo se omite la categoría cuando es literalmente el mismo texto que la descripción.

---

### fix(ahorro): BUG-012 lenguaje humano al desactivar el fondo de emergencia · 2026-07-11

Corrige y elimina **BUG-012** de `docs/BUGS.md` (prioridad media, reportado por Esteban el 2026-07-08): al desactivar el Fondo de Emergencia (Ahorro → editar el fondo → "Desactivar fondo"), el modal de confirmación mostraba el texto literal "...la sección vuelve a mostrar el **empty state**...", jerga técnica de desarrollo visible al usuario final. Viola el ADN 11 (lenguaje humano, jamás jerga técnica en la UI).

**Qué cambió:** en `modules/dominio/ahorro/index.js`, `_desactivarFondo()` cambia el mensaje de `confirmar()` a "...la sección vuelve a mostrar la **pantalla inicial** para activarlo...", que comunica lo mismo (los datos se conservan, la sección vuelve a su estado de bienvenida) sin término técnico. La nota del reporte pedía además "una pasada rápida de grep por otros literales técnicos visibles (Empty State, placeholder, TODO, null, undefined) en todos los view.js al corregirlo, para cazar hermanos del mismo error": el grep (`mensaje:`/`titulo:` de `confirmar()` en todo `modules/`, y `empty state`/`placeholder`/`TODO`/`null`/`undefined` en todos los `view*.js`) confirmó que este era el único caso real; el resto de coincidencias eran comentarios de código (`// ── EMPTY STATE ──`), nombres de variable (`null` como valor de tipo) o atributos HTML legítimos (`placeholder` de un `<input>`).

**Archivos tocados:** `modules/dominio/ahorro/index.js` (fix), `tests/unit/ahorro.test.js` (1 test nuevo), `service-worker.js` (v345 → v346), `docs/contexto/ahorro.md` (ficha nueva, primera de esta sección), `docs/BUGS.md` (entrada eliminada).

**Verificación:** 2331/2331 unit verdes (1 nuevo: el mensaje de confirmación no contiene el literal "empty state" y sí "pantalla inicial"; falla sin el fix, verificado revirtiéndolo con stash). 164/164 E2E verdes (sin cambios de comportamiento observable en flujos automatizados). Lint verde.

**Podría afectar:** nada funcional; cambio de copy en un solo mensaje de confirmación.

---

### fix(compromisos): BUG-011 la simulación de estrategia ya no se presenta como aplicada · 2026-07-11

Corrige y elimina **BUG-011** de `docs/BUGS.md` (prioridad alta, reportado por Esteban el 2026-07-08): en Deudas, con un plan de pago inviable, teclear un valor en "Aumenta tu cuota" (panel de alternativas) y luego pasar a la pestaña "Renegociar la tasa" cerraba el panel automáticamente y dejaba la card mostrando el plan como saneado, sin haber presionado "Aplicar este aumento".

**Diagnóstico (la primera pregunta del reporte era si la mutación es real o visual):** es la variante **visual**. Los tres caminos que escriben en `S` (`_aplicarAumentoCuota`, `_aplicarRenegociacion`, `_aplicarConsolidacion` en `modules/dominio/compromisos/index.js`) están detrás de `confirmar()` y nunca se invocan al teclear ni al cambiar de pestaña; las cuotas registradas no cambiaban. La causa: el input del remedio (`cambiar-extra-remedio`) commitea cada tecla a `_uiEstrategia.extraMensual` (decisión deliberada de D.9, para que el clic en "Aplicar" no compita con un re-render por blur), y `renderEstrategiaPago()` calculaba `recomendarEstrategia(deudas, extraMensual)` **con ese extra simulado**. Si el monto tecleado volvía viable el plan, el siguiente re-render (cambiar de alternativa, abrir/cerrar el panel, cualquier `state:change`) reemplazaba el bloque inviable completo (botón de alerta + panel) por el acelerador del plan viable: la simulación quedaba presentada como estado real.

**Qué cambió:** en `modules/dominio/compromisos/views/estrategia.js`, la estructura de la card (recomendación, detalle "Tu impacto" y la elección bloque viable/inviable) se decide ahora con `recomendarEstrategia(deudas, 0)`: solo datos registrados. El extra simulado alimenta únicamente el resumen comparativo (`renderResumenExtra`) dentro de su propio bloque, que ya cubría el caso "sin extra no cierra, con extra sí" con copy honesto. Con plan viable, el extra del acelerador sigue participando de la recomendación (exploración legítima ya documentada en `logic/estrategia.js`). Beneficio adicional: la simulación ahora **sobrevive** al ir y volver entre pestañas (monto en el input + resumen + botón habilitado), antes se perdía junto con el panel.

**Archivos tocados:** `modules/dominio/compromisos/views/estrategia.js` (fix), `tests/unit/compromisos.test.js` (5 tests nuevos), `tests/e2e/estrategia-pago.test.js` (2 tests nuevos), `service-worker.js` (v344 → v345), `docs/contexto/deudas.md` (lección de diseño: el estado UI simulado nunca decide estructura), `docs/BUGS.md` (entrada BUG-011 eliminada).

**Verificación:** 2330/2330 unit verdes (5 nuevos; 4 de ellos fallan sin el fix, verificado revirtiéndolo temporalmente con stash). 164/164 E2E verdes (2 nuevos con el flujo exacto del reporte en Chromium real: fill del extra, click en la pestaña, panel conservado, `localStorage` sin cambios). Lint verde.

**Hallazgo colateral (SW):** IV.3, D.14, CAL.3 y MC.14 salieron a producción **sin bump de `CACHE_NAME`** y el SW es cache-first puro, así que las PWAs ya instaladas seguían sirviendo los archivos de v344 (IV.2c): esos cuatro cambios podían no verse en el celular. El bump a v345 de este commit los propaga todos. Recordatorio de proceso: todo cambio de JS/CSS/HTML en producción necesita bump (regla ya escrita en el encabezado de `service-worker.js`); la tarjeta UPD.1 del BOARD (aviso de actualización) mitigará el costo de estos bumps para el usuario.

**Podría afectar:** la card de estrategia con plan viable no cambia de comportamiento; con plan inviable, el detalle "Tu impacto" ya no adopta el extra simulado (vuelve a mostrar "No se termina de pagar" hasta que el aumento se aplique de verdad), que es el comportamiento honesto especificado en la iniciativa Deudas v2 (punto 5 del brief).

---

### feat(tesoreria): MC.14 datos de transferencia por cuenta · 2026-07-11

Cierra MC.14 (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"), rebanada independiente que ya podía ejecutarse sin esperar el resto de la iniciativa (MC.13, MC.15, MC.16). Hoy, cuando alguien le pide al usuario sus datos para consignarle, tiene que salir de Finko a buscarlos en otra parte (banca en línea, mensajes viejos, memoria); la app no tenía ningún lugar para guardar esa información de referencia.

**Qué cambió:** en `modules/core/state.js` se agrega el typedef `DatosTransferencia` y el campo opcional `Cuenta.datosTransferencia`: número de cuenta, llave de transferencia con su tipo (`TIPOS_LLAVE`, nuevo catálogo en `core/constants.js`: Celular/Correo/Documento/Alfanumérico/Otro) y alias. En `modules/dominio/tesoreria/views/cuentas.js`, `renderFormCuenta()` agrega un bloque opcional detrás de un toggle "Guardar los datos que compartes cuando alguien te va a consignar" (mismo patrón de fieldset colapsable que ya usaba la cuota de manejo); `_renderCuentaItem()` muestra un hint compacto (🔑) cuando la cuenta tiene estos datos, igual que los hints existentes de cuota de manejo y GMF (no existe una vista de "detalle de cuenta" separada en esta sección, así que la tarjeta de lista sigue siendo el punto de consulta). En `modules/dominio/tesoreria/logic/cuentas.js`: `validarCuenta()` exige el tipo de llave cuando hay una llave (los demás campos son libres entre sí); `parseDatosTransferencia()` (nuevo) construye el objeto final o `null` si el toggle está apagado o quedó vacío tras recortar espacios. En `modules/dominio/tesoreria/acciones/cuentas.js`: wiring del toggle (`_toggleTransferenciaFieldset()`), pre-rellenado en modo edición, y el bloque se oculta para cuentas de clase `efectivo` (no tiene número de cuenta ni llave que aplique), igual que ya pasa con la cuota de manejo y el 4x1000.

**Sin bump de `SCHEMA_VERSION`:** los campos son opcionales y `undefined`-safe en registros existentes, mismo precedente que `cuotaManejo`/`aplica4x1000` (tampoco tienen entrada en `_migrate()`, confirmado por grep antes de decidir).

**Archivos tocados:** `modules/core/state.js`, `modules/core/constants.js`, `modules/dominio/tesoreria/logic/cuentas.js`, `modules/dominio/tesoreria/logic.js` (barrel), `modules/dominio/tesoreria/views/cuentas.js`, `modules/dominio/tesoreria/acciones/cuentas.js`, `tests/unit/tesoreria.test.js` (18 tests nuevos), `docs/contexto/mis-cuentas.md` (ficha nueva, primera de esta sección).

**Verificación:** 2325/2325 unit verdes (18 nuevos: validación con/sin llave+tipo, parseo con todas las combinaciones de campos, normalización, render del toggle+fieldset+catálogo, render del hint combinado en la lista). 162/162 E2E verdes; una prueba de accesibilidad no relacionada (`#distribuir-ingreso-panel`) salió flaky en la corrida completa por contención de recursos, confirmada 3/3 al aislarla, sin relación con los archivos tocados. Lint verde.

**Podría afectar:** nada funcional fuera de la tarjeta/formulario de cuenta; ningún otro dominio lee `datosTransferencia` todavía.

---

### feat(agenda): CAL.3 selección automática del día actual al entrar al Calendario · 2026-07-10

Cierra CAL.3 (`docs/BOARD.md`, sección Calendario). Antes, entrar a Calendario nunca mostraba nada del día de hoy hasta que el usuario tocaba la fecha manualmente, aunque tuviera compromisos vencidos ese mismo día; además, los días sin registros no respondían al click en absoluto (`aria-disabled`, sin `data-action`), así que si el usuario tocaba un día vacío por curiosidad, la app simplemente no hacía nada, sin explicar por qué.

**Qué cambió:** en `modules/dominio/agenda/view.js`, `marcarEntradaSeccion()` (nueva, exportada) arma un flag de un solo uso que el siguiente `renderAgenda()` consume: si el mes visible es el real y hoy tiene compromisos/ingresos y no hay ningún día ya seleccionado, auto-selecciona el día de hoy. El flag NO se arma en `renderAgenda()` mismo (evita que un render disparado por cambio de datos o navegación de meses/días fuerce la selección); solo `modules/dominio/agenda/index.js` la llama, y únicamente en el listener de `hashchange` cuando el usuario llega a `#agenda` desde otra sección. **Decisión deliberada, no un descuido:** la carga directa de la app en `#agenda` (recarga de página, deep-link) no arma el flag. La razón es concreta: varios tests E2E ya existentes cargan `page.goto('/#agenda')` con un `diaPago` fijo (15, 20...) y después hacen click explícito en ese mismo día para abrir el detalle; si el auto-select se armara también en esa carga directa, el día quedaría ya seleccionado, y el click del test lo CERRARÍA por el toggle existente de `mostrarDia()`, un bug intermitente que solo se manifiesta cuando la fecha real de ejecución coincide con el `diaPago` del fixture. Separar "navegar hacia la sección" de "cargar directo en ella" resuelve el problema de raíz sin tocar ningún test existente.

En `_renderGrid()`: se elimina la regla "solo días con eventos son interactivos" (antes los días vacíos llevaban `aria-disabled="true" tabindex="-1"` sin `data-action`); ahora todos los días del grid llevan `data-action="agenda-mostrar-dia"`. En `_renderDetalleDia()`: cuando el día seleccionado no tiene eventos (a propósito, o porque se eliminó el compromiso desde otra sección), en vez de que `renderAgenda()` anule la selección en silencio (comportamiento anterior), se muestra el mismo encabezado con "Sin compromisos ni ingresos este día", sin total ni lista. Se elimina `.cal-day--inactive` de `styles/components/config.css` (CSS muerto: comunicaba "no clickeable", ya no aplica).

**Archivos tocados:** `modules/dominio/agenda/view.js`, `modules/dominio/agenda/index.js`, `styles/components/config.css`, `tests/unit/agenda.test.js` (8 tests nuevos), `tests/e2e/smoke.test.js` (3 tests nuevos), `docs/contexto/calendario.md`.

**Verificación:** 2307/2307 unit verdes (8 nuevos: auto-select con/sin `marcarEntradaSeccion()`, no pisa selección manual previa, se consume una sola vez, día vacío clickeable, mensaje de estado vacío, toggle intacto en día vacío). 162/162 E2E verdes (3 nuevos, incluido uno que navega de verdad vía `.nav-item[href="#agenda"]` con un `diaPago` calculado en el navegador con `new Date().getDate()`, válido sin importar qué día se ejecute la suite; y uno que confirma que `page.goto('/#agenda')` directo NO auto-abre nada). Lint verde. **El preview local de este entorno no cargó** (limitación de infraestructura ya documentada en tareas anteriores de esta sesión); la verificación se apoyó en la suite E2E real contra Chromium headless en lugar de una captura manual.

**Podría afectar:** cualquier otro E2E que navegue a Calendario en dos pasos (otra sección → click en nav a `#agenda`) con un fixture cuyo `diaPago` sea igual al día real de ejecución podría empezar a ver el detalle ya abierto antes de su propio click; ninguno de los E2E existentes lo hace así hoy (todos usan `page.goto('/#agenda')` directo), así que no hay impacto actual.

---

### feat(compromisos): D.14 registrar una deuda acredita la cuenta donde se recibió el dinero · 2026-07-10

Cierra D.14, primera rebanada ya triada de la iniciativa "Deudas v2: de registro a asesor" (`docs/BOARD.md`). Hoy registrar una deuda no tiene ningún efecto sobre las cuentas del usuario: si el préstamo entregó dinero real (un giro, un préstamo personal), el usuario tenía que ir aparte a Mis cuentas y editar el saldo a mano, con el riesgo de olvidarlo o de duplicarlo si además registraba un ingreso puntual. El espejo exacto de este problema ya estaba resuelto para ingresos (NAV.A1, ingreso puntual): reutilizar ese mismo patrón para deudas.

**Qué cambió:** en `modules/dominio/compromisos/views/formularios.js`, `renderFormDeuda()` agrega, solo en modo creación (nunca al editar) y solo si hay al menos una cuenta activa, un checkbox opcional "Recibí este dinero en una de mis cuentas" (apagado por defecto) que revela el selector de cuenta ya existente (`renderSelectorCuenta()` de `infra/cuenta-helper.js`, el mismo componente del ingreso puntual). En `modules/dominio/compromisos/index.js`: `_wireToggleOrigen()` conecta el checkbox al selector (espejo de `_wireToggleFiado`, D.13); `_ajustarSaldoCuenta()` (nuevo, espejo del helper de `tesoreria/acciones/ingresos.js`) suma el `saldoTotal` de la deuda a la cuenta elegida al guardar; `_guardarCompromiso()` guarda `cuentaOrigenId` y `montoAcreditado` (copia inmutable del monto acreditado en ese momento) en el compromiso; `_eliminarCompromiso()` revierte ese crédito exacto usando `montoAcreditado`, no `saldoTotal` actual (que puede haber bajado por abonos posteriores, que ya mueven su propia cuenta de origen por separado: usar `saldoTotal` habría revertido de menos). En `modules/core/state.js` se documentan los dos campos nuevos en el typedef `Compromiso`, opcionales y `undefined`-safe para registros existentes: **sin bump de `SCHEMA_VERSION`**, no hace falta backfill porque ningún código asume que siempre existen.

**Archivos tocados:** `modules/dominio/compromisos/views/formularios.js`, `modules/dominio/compromisos/index.js`, `modules/core/state.js`, `tests/unit/compromisos.test.js` (4 tests nuevos), `docs/contexto/deudas.md` (ficha nueva, primera de esta sección).

**Verificación:** 2299/2299 unit verdes (4 nuevos sobre `renderFormDeuda()`: bloque ausente sin cuentas activas, checkbox apagado + selector oculto por defecto con cuentas, ausente en modo edición, cuentas inactivas no cuentan). Lint verde. **El preview local de este entorno no cargó** (limitación de infraestructura ya documentada en IV.3 y sesiones anteriores); verificado por trazado de código contra el patrón ya probado y en producción de NAV.A1 (ingreso puntual), en vez de captura en Chromium real.

**Podría afectar:** ninguna otra sección lee `cuentaOrigenId`/`montoAcreditado` todavía (no hay UI que los muestre); el efecto observable es solo el saldo de la cuenta elegida al crear/eliminar una deuda con acreditación.

---

### fix(analisis): IV.3 "Vs mes anterior" ya no tiñe de rojo la subida de gasto (D5, ADR 031) · 2026-07-10

Cierra IV.3 (números y estados). Al retomar el criterio D5 del ADR 031 ("dirección con signo, egresos neutros, estados con icono"), se encontró que la card "Vs mes anterior" de Análisis (`_renderComparacionCategorias()`, G.2) seguía sin corregir: usaba `--fk-danger`/`--fk-danger-text` para el delta total, el fondo de fila (`.comparacion__row--sube`) y la columna de dirección (`.comparacion__dir`) cuando el gasto de una categoría o el total subían. Es exactamente la violación que el ADR 019/AUD.4 prohíbe ("gastar no es incumplir": las variaciones al alza van en neutro, nunca en rojo) y que el resumen semanal (F8, `resumen-card__trend--sube`) y `_renderTendencia()` (misma sección Análisis, comentario explícito en el código) ya habían corregido; esta card en particular se quedó fuera de esas pasadas anteriores.

**Qué cambió:** en `styles/components/analysis.css`, `.comparacion__delta--sube` pasa de `--fk-danger-text` a `--fk-text-primary` (neutro); se elimina la regla de fondo `.comparacion__row--sube` (queda sin tinte, solo `--baja` conserva el fondo de éxito); se elimina la regla `.comparacion__row--sube .comparacion__dir` (cae al color por defecto, que hereda `--fk-text-primary` del `body` por cascada, verificado contra `styles/base.css`). Solo "bajar" el gasto sigue reforzándose en verde (`--fk-success`/`-text`). Los highlights ámbar (`.comparacion__highlight--alerta`, "empezaste a gastar en X") no se tocaron: no son rojo y funcionan como aviso informativo, coherente con el resto de la app.

**Archivos tocados:** `styles/components/analysis.css` (3 reglas de color), `docs/contexto/analisis.md` (ficha actualizada con el hallazgo).

**Verificación:** 2295/2295 unit verdes (CSS puro, sin lógica nueva que testear). **El preview local de este entorno no cargó** (limitación de infraestructura ya documentada en sesiones anteriores); la verificación se hizo por trazado manual de la cascada CSS contra el código fuente en vez de captura en Chromium real, diferencia explícita respecto al método habitual de IV.1/IV.2.

**Podría afectar:** nada funcional (CSS puro; sin cambios de datos, JS ni EventBus).

---

### docs(adr): DV.1 ADR 033 Dirección Visual premium escrito (Propuesta) · 2026-07-10

Cierra DV.1 (8.º lote de triaje, pedido directo de Esteban): el entregable era el ADR, cero código tocado. [ADR 033](DECISIONS/033-direccion-visual-premium.md) escrito en estado **Propuesta**, con 5 preguntas (P1-P5, todas con recomendación) esperando la validación de Esteban. Construye SOBRE el ADR 031 sin revertirlo y ratifica los ADR 023/025/026/027.

**Hallazgos del análisis del código que fundan las decisiones:**

- Las cards reposan planas de verdad (`.card`, `.bento__cell`, `.list-item`: borde 1px sin sombra); los tokens `--fk-shadow-*` existen pero solo se usan en hover, dropdowns, modales y toasts. En tema oscuro la profundidad ya la dan los escalones de fondo (base → surface → elevated): la sombra en reposo rinde sobre todo en tema claro, y el ADR lo dice explícitamente para no perseguir en oscuro un efecto que la física del color no da.
- No existe ningún token de degradado: toda la riqueza de color vive en tintes planos al 6-12%.
- El catálogo de animaciones existe de facto (14 keyframes + `countUp`) pero sin doctrina, y contiene 2 bucles infinitos ambientales (`empty-orbit`/`empty-float` en empty states) que el propio brief veta.
- `--fk-section-accent` (IV.2b) ya probó el mecanismo de parametrización por dominio: los degradados y la decoración se montan encima sin JS nuevo.

**Decisiones (resumen):** D1 elevación en escala semántica de 4 niveles (lienzo/reposo/realce/flotante), cards con sombra en reposo y doble capa en claro; D2 el color secundario por dominio es rampa derivada del mismo matiz (no un 2.º hue: respeta el techo de ~8 identidades del ADR 031), materializada en `--fk-section-color` + `--fk-grad-identity` (máx 2 paradas, texto medido contra la parada fuerte); D3 riqueza con presupuesto: formas orgánicas `d-*` neutras compartidas teñidas por `currentColor` (máx 1 por pantalla, opacidad 4-8%), un patrón de puntos CSS tokenizado y las ilustraciones `il-*` como clase nueva de asset del pipeline ADR 026 (Esteban diseña, drafts de Claude como plantillas); D4 catálogo de movimiento CERRADO (150-250 ms micro, una sola vez, solo transform/opacity, retiro de los bucles infinitos, celebraciones siguen en LG.2 y el cambio de tema en CFG.7); D5 la tensión "familia de iconos por sección" se resuelve RATIFICANDO el lenguaje único del ADR 023 (la familia por sección ya existe como metáfora + color; IV.4 sigue siendo el vehículo de redibujos dirigidos); D6 guardarraíles duros por rebanada (ambos temas, AA con cálculo real método IV.1, Lighthouse 100, `pnpm perf` sin regresión, lista prohibida y tabla de presupuesto por regla).

**Archivos tocados:** `docs/DECISIONS/033-direccion-visual-premium.md` (nuevo), `docs/BOARD.md` (DV.1 borrada; iniciativa actualizada; rebanadas DV.2a a DV.2d creadas, ninguna se inicia sin validación), `docs/HANDOFF.md`, `docs/contexto/transversal.md` (bloque de identidad visual apunta al ADR 033).

**Qué sigue:** Esteban valida P1-P5; con el ADR Aceptado arranca DV.2a (tokens de superficie/elevación). Mientras tanto la tarjeta natural es IV.3 (números y estados), independiente de esta iniciativa. **Podría afectar:** nada (solo documentación).

---

### chore(lint): 3 errores no-undef corregidos, lint verde de nuevo · 2026-07-10

Pasada de verificación post-IV.2: `pnpm run lint` fallaba con 3 errores `no-undef` que los cierres anteriores no detectaron (el gate de commit corría tests, no lint). Uno era de IV.2c (`getComputedStyle` sin `window.` en el E2E actualizado de `smoke.test.js`, corregido con el prefijo, convención del propio archivo); dos eran **preexistentes**: `IntersectionObserver` en `movimientos/view.js` (desde PERF.1, 2026-07-06) y `DOMException` en `storage.test.js` (desde PERF.4). La config usa lista blanca explícita de globals (no `env: browser`), así que ambos se agregaron a `eslint.config.js` siguiendo el patrón del archivo. Verificado: lint exit 0, 2295/2295 unit + 159/159 E2E verdes. Sin cambios de comportamiento (el código ya funcionaba; solo el linter no conocía esos globals).

---

### feat(ui): IV.2c Calendario + Inicio, cierra IV.2 completa (ADR 031) · 2026-07-10

Última rebanada de IV.2 (identidad de color por sección). Cierra la iniciativa completa (IV.1, IV.2a-d).

**Calendario:**

- **"fijo" pasa del amarillo prestado de Presupuesto al índigo propio de Calendario** (`--fk-dom-agenda`) en `.cal-dot--fijo`, `.cal-detail__item--fijo`, `.cal-detail__icon--fijo` y `.vencidos-card__icon--fijo` (Inicio, ver abajo). Resuelve la ambigüedad "amarillo = ¿fijo o límite?" (hallazgo 3 del ADR 031) y, al aplicar el mismo cambio en las 4 superficies donde aparece "fijo", evita que Calendario e Inicio queden con dos colores distintos para el mismo concepto.
- **Las tarjetas de evento del detalle del día abandonan la franja lateral de 3px (AG.7) y pasan a fondo teñido** (`background: color-mix(in srgb, var(--fk-dom-X) 8%, var(--fk-bg-elevated))`), pedido explícito de Esteban ("la línea comunica poco"). El texto de la tarjeta es neutro (no del color del dominio), así que el 8% no colisiona con el hallazgo de IV.2a sobre texto coloreado (ese exige ~6%; aquí no aplica).
- Todos los `color:` de glifo en `.cal-dot--*`/`.cal-detail__icon--*` migraron a `-text` (mismo criterio de IV.2d).

**Inicio:**

- "Pendientes del mes" y "Próximas prioridades" ganan una **etiqueta de tipo** (`.dom-badge`, dos variantes nuevas `--agenda`/`--ahorro`) junto al icono+color de sección ya existentes, cumpliendo la regla "el color nunca viaja solo" (D1 del ADR).
- **Bug real corregido de paso**: un apartado en "Próximas prioridades" pedía prestado el dot de tipo `fijo` (heredaba su color, antes amber/presupuesto, ahora habría heredado índigo/agenda) en vez de tener identidad propia. Nuevo `.cal-dot--apartado` (familia menta de Ahorro, ADR 031 P4).

**Archivos tocados:** `styles/components/config.css` (`.cal-dot--*`, `.cal-detail__item--*`, `.cal-detail__icon--*`), `styles/components/domain.css` (`.vencidos-card__icon--*`), `styles/components/nudges.css` (`.dom-badge--agenda`/`--ahorro` nuevas), `modules/dominio/agenda/view.js` (comentario actualizado), `modules/dominio/compromisos/views/dashboard.js` (`_tipoBadge()`, fix del dot de apartado), `tests/e2e/smoke.test.js` (test de franja actualizado a fondo teñido), `service-worker.js` (v343 → v344).

**Verificación:** 2295/2295 unit + 159/159 E2E verdes (1 test E2E actualizado: verificaba `borderLeftColor`, ahora verifica `backgroundColor` contra el mecanismo nuevo). Verificado con datos reales en Chromium: en tema oscuro, "Gasto fijo" resuelve `#7d8cf0` (agenda), "Apartado" resuelve `#38c98c` (ahorro); en tema claro, los mismos badges resuelven sus `-text` correspondientes (`#4f64eb`, `#238059`). **Lección de verificación documentada en `contexto/transversal.md`**: alternar `body.classList` para probar tema claro en caliente puede devolver un `color-mix()` stale (oklab de tema oscuro) incluso leyendo la variable CSS correcta; cargar la página con `localStorage.fk_theme='light'` ya puesto es el método confiable.

**Podría afectar:** nada funcional (CSS + `data-*` + un mapeo local de labels; sin cambios de datos ni de EventBus).

---

### fix(ui): IV.2d migración de -text + cierre de la franja de modales (ADR 031) · 2026-07-10

Tercera rebanada de IV.2 (identidad de color por sección). Corrige el hueco de contraste que IV.1 había detectado y documentado como pendiente: usos de `color: var(--fk-dom-X)` (token crudo) que fallan WCAG AA en tema claro, fuera de las superficies que ya tocó IV.2a. **Además cierra la mitad de IV.2b** ("franja de modales"): se encontró ya implementada, sin commitear, en el working tree (WIP de una sesión anterior); se verificó en el navegador (Chromium real, ambos temas) y se cierra en este mismo movimiento en vez de dejarla suelta.

**Franja de modales (mitad de IV.2b, verificada y cerrada):** los 15 modales de registro con dominio propio (`#modal-gasto`, `#modal-compromiso`, `#modal-abono`...) llevan `data-dom="X"` + una franja superior de 3px en `--fk-dom-X` (crudo: es un acento decorativo, WCAG 1.4.11 exime este caso, no lleva texto). Los modales sin dominio (import, legal, registrar, más, personalizar accesos, instalar iOS, onboarding) quedan correctamente sin franja. Verificado con `getComputedStyle`: `#modal-gasto` resuelve `rgb(255,138,92)` (`--fk-dom-gastos`) y `#modal-inversion` `rgb(47,210,191)` (`--fk-dom-inversion`), ambos exactos en los dos temas. **Queda pendiente de IV.2b:** barras/anillos de progreso (`.progress-bar`/`.progress-ring-wrap` en `atoms.css`) siguen en colores genéricos, sin tinte de dominio.

**Qué cambió:**

- **Análisis:** iconos y textos de los héroes de Fondo e Inversión pasan a `-text` (`.fondo-hero__icon`, `.fondo-hero__sub--ok`, `.fondo-hero__banner`, `.ahorro-habito__compromiso strong`, `.inversion-hero__icon`, `.inversion-hero__tipo-pct`, `.inversion-item__tipo`). `.inversion-hero__tipo-pct` era el caso que IV.1 midió explícitamente en 1.89:1 sobre blanco.
- **Modal Registrar:** los iconos de los tiles `gasto`/`abono`/`aporte` pasan a `-text` (`ingreso` ya usaba el semántico `--fk-success`, sin cambio).
- **Nudges:** `.nudge-high .nudge__title` pasa a `-text` (usaba `--fk-dom-gastos` crudo como color de texto, aunque el resto de niveles de nudge ya usaban tokens `-text` semánticos). Los tokens `--fk-nudge-high-accent/-bg/-border` (border/acento, no texto) se dejaron intactos a propósito.
- **`.dom-badge--*`** (chip reutilizable "Gastos", "Deudas"...): color a `-text` **y** fondo bajado de 12% a 6%, porque lleva texto real directamente sobre el tinte (mismo hallazgo de IV.2a: 12%+`-text` cae a 4.22-4.46:1 en tema claro; 6% mide 4.54:1 en el peor caso).

**Fuera de alcance a propósito:** `.cal-dot--*`/`.cal-detail__icon--*` (Calendario), `.vencidos-card__icon--*` y `.prioridades-card__dot` (Inicio) tienen el mismo patrón de token crudo sin migrar, pero viven en el alcance de **IV.2c** (calendario/inicio), que probablemente rediseñe ese markup (teja + etiqueta de tipo); migrarlos ahora sería trabajo duplicado.

**Archivos tocados:** `styles/components/analysis.css`, `styles/modals.css` (`-text` + franja de modales ya presente), `index.html` (`data-dom` en modales, ya presente), `styles/components/nudges.css`, `docs/DESIGN_SYSTEM.md` (documenta la distinción 6%/12% según texto vs. glifo).

**Verificación:** 2295/2295 unit + 159/159 E2E verdes (sin tests nuevos: CSS puro, sin cambios de markup/JS). Verificado con `getComputedStyle` en Chromium real en tema claro: `.dom-badge--gastos` resuelve `color: rgb(209,59,0)` (`#d13b00` = `--fk-dom-gastos-text` exacto) sobre fondo al 6%; `.inversion-hero__tipo-pct` resuelve `rgb(28,127,116)` (`#1c7f74` = `--fk-dom-inversion-text` exacto); franja de `#modal-gasto`/`#modal-inversion` exacta en ambos temas. Ficha actualizada en [`contexto/transversal.md`](contexto/transversal.md).

**Qué queda de IV.2:** IV.2c (calendario/inicio).

**Podría afectar:** nada funcional (solo color computado en tema claro; tema oscuro sin cambio visual porque `-text` es alias directo del token crudo ahí).

---

### feat(ui): IV.2b barras/anillos de progreso por dominio + franja de modales (ADR 031) · 2026-07-10

Cierra IV.2b completa (el resto del objetivo de IV.2d, mismo día). Extiende `.progress-bar`/`.progress-ring-wrap` (única fuente de progreso lineal/circular de la app) para que su **estado por defecto** ("aún en progreso", sin completar ni cerca) se tiña con el color de la sección, en vez del verde genérico de marca.

**Mecanismo:** una variable compartida `--fk-section-accent`, definida por los mismos bloques `[data-dom="X"]` que ya usaba la franja de modales (`styles/modals.css`), leída por `.progress-bar`/`.progress-ring-wrap` con fallback al acento de marca (`var(--fk-section-accent, var(--fk-accent))`). Los modificadores semánticos (`--near`, `--complete`, `--warn`, `--danger`) NO se tocaron: siguen mandando por especificidad/orden, así que "cerca de la meta" y "completado" se siguen viendo iguales (verde) sin importar la sección, por diseño (D1 del ADR: la capa semántica nunca se mezcla con la identidad).

**Dónde se aplicó `data-dom` (mapeo sin ambigüedad):** anillo de Metas (`metas/view.js`) → `metas`; anillo de Apartados (`apartados/view.js`) y del fondo de emergencia (`ahorro/view.js`) → `ahorro` (comparten familia, ADR 031 P4); barra de Me deben, cobro y pago (`personales/view.js`, 2 lugares) → `personales`; factores Deuda/Liquidez/Ahorro del score de salud en Análisis (`analisis/view.js`) → `compromisos`/`tesoreria`/`ahorro` respectivamente (son composición multi-dominio, D3 punto 4 del ADR: "los gráficos multi-dominio de Análisis ya usan el color de cada dominio").

**Fuera de alcance, con justificación:**

- **Presupuesto/Límites** (`_renderGrupoCard`, grupos Necesidades/Ahorro/Estilo de vida): ya tiene un esquema de color deliberado por **ADR 019** (Necesidades = siempre neutro, nunca alarma; Ahorro = celebra en verde; Estilo de vida = alerta ámbar/rojo). Teñir la barra base con el ámbar de "Límites" habría roto la neutralidad a propósito de Necesidades. Se dejó intacta (sin `data-dom`, sigue en `--fk-accent`); queda como decisión pendiente, coincide con la revisión que **LIM.1** ya tiene planteada para esta sección.
- **Factor "Control"** del score de Análisis: mide volatilidad del gasto (coeficiente de variación), no un dominio limpio de la app (no es "Límites"); se dejó sin teñir en vez de adivinar mal.

**Hallazgo real corregido antes de cerrar (mismo método WCAG de IV.1/IV.2a):** la primera versión usaba el token crudo `--fk-dom-X` (igual que la franja de modales, que es decorativa). Pero el relleno de una barra/anillo de progreso **es la información**, no un acento: aplica el umbral no textual completo de WCAG 1.4.11 (3:1), y el crudo lo fallaba en tema claro para varios dominios medidos contra el fondo del track (ahorro 1.88:1, personales 2.39:1, tesorería 2.65:1, muy por debajo de 3:1). Se cambió `--fk-section-accent` a usar `-text` en vez del token crudo (afecta también la franja de modales: sin cambio en tema oscuro, más nítida en tema claro). Verificado: 4.28-4.38:1 en tema claro para los 5 dominios tocados, encima del umbral. En tema oscuro `-text` es idéntico al crudo, cero cambio visual.

**De paso se corrigió un bug preexistente en la franja de modales de IV.2b (WIP de sesión anterior):** faltaba el mapeo `[data-dom="metas"]`, así que los modales de Metas (`modal-meta`, `modal-abono-meta`) no mostraban franja (caían al verde genérico). Corregido en el mismo movimiento.

**Archivos tocados:** `styles/modals.css` (variable `--fk-section-accent` + mapeo `-text` + fix de metas), `styles/components/atoms.css` (`.progress-bar`, `.progress-ring-wrap`), `modules/dominio/metas/view.js`, `modules/dominio/apartados/view.js`, `modules/dominio/ahorro/view.js`, `modules/dominio/personales/view.js` (2 lugares), `modules/dominio/analisis/view.js` (3 factores), `service-worker.js` (v342 → v343).

**Verificación:** 2295/2295 unit + 159/159 E2E verdes (sin tests nuevos: CSS + atributos estáticos, sin lógica nueva). Verificado con `getComputedStyle` en Chromium real: colores exactos por dominio en ambos temas, estados `--near`/`--complete` sin cambio, Presupuesto sin `data-dom` cae correctamente al acento de marca (sin regresión). Ficha actualizada en [`contexto/transversal.md`](contexto/transversal.md).

**Cierra IV.2 salvo IV.2c** (calendario/inicio).

**Podría afectar:** nada funcional (CSS + atributos `data-*`, sin JS de negocio ni cambios de estado).

---

### feat(ui): IV.2a nav + encabezados de sección teñidos por dominio (ADR 031) · 2026-07-09

Primera rebanada de IV.2 (identidad de color por sección). Cierra la parte de la tarjeta con mayor impacto visual inmediato: reconocer la sección activa por su color, sin leer el texto.

**Qué cambió:**

- **Nav (sidebar + bottom-nav):** el item activo se tiñe con el color de SU dominio (`--fk-dom-X`), no con el acento genérico de marca. Inicio y Ajustes quedan monocromos (no son dominios financieros, ADR 025 D6).
- **Pestañas del hub Ahorros** (Fondo/Metas/Apartados/Inversión): la pestaña activa se tiñe igual, con el mismo mecanismo.
- **Encabezados de sección:** los 11 dominios ganaron una teja (icono + acento del dominio) junto al `<h1>`, reusando el componente `.cat-teja` que ya existía para categorías (ID.3/ADR 025 D3).
- **Mecanismo:** un mapeo único `[data-section="X"] { --fk-nav-bg; --fk-nav-text }` en `styles/layout.css`, consumido por `.nav-item.active` y `.hub-tabs__tab[aria-current]`. Apartados comparte la familia menta de Ahorro (`--fk-dom-ahorro`, decisión ya tomada en ADR 031 P4, no una omisión). Cero JS nuevo: `shell.js` sigue siendo el único que asigna `.active`/`aria-current`.

**Hallazgo real durante la implementación, corregido antes de cerrar (mismo método de IV.1: fórmula WCAG real, no inspección visual):**

- El tinte de fondo estándar del sistema (`--fk-dom-X-bg`, 12%) usado detrás de texto en `-text` cae a **4.22-4.46:1** en tema claro para varios dominios (compromisos, agenda, tesoreria, metas, analisis...), por debajo del umbral AA de texto (4.5:1, WCAG 1.4.3). Se ajustó a **6%** específicamente donde el contenido sobre el tinte es texto real (nav activo); el peor caso mide 4.54:1. Se documentó la distinción para IV.2c (que necesita decidir la opacidad de las tarjetas de evento del calendario): texto encima del tinte → umbral 4.5:1 y ~6-8%; glifo/icono decorativo → umbral 3:1 (WCAG 1.4.11) y 12-14% sobra.
- **Bug preexistente encontrado y corregido de paso** (no introducido hoy; era exactamente el hueco que IV.1 ya había señalado como pendiente para IV.2): `.cat-teja` (usado en categorías de gastos, listas, etc. en toda la app) y `.menu-mas__item .icon` (menú "Más") usaban el token crudo `--fk-dom-X` como color del glifo en vez de `-text`. Verificado: caía a ~1.9-2.5:1 en tema claro, muy por debajo incluso del umbral gráfico de 3:1. Corregido en ambos archivos (`atoms.css`, `modals.css`); en tema oscuro `-text` es idéntico a `-dom` (alias directo en `tokens.css`), cero cambio visual ahí.

**Archivos tocados:** `styles/layout.css` (mapeo + reglas de nav/hub-tabs), `styles/components/atoms.css` (`.cat-teja` corregido + modificador `.section__icon`), `styles/modals.css` (`.menu-mas__item .icon` corregido), `index.html` (11 encabezados con teja + `data-section` en las 4 copias de `.hub-tabs`).

**Verificación:** 2295/2295 unit + 159/159 E2E verdes (sin tests nuevos: cambio de CSS/markup puro sobre mecanismo ya cubierto por los tests existentes de render y E2E de navegación). Verificado visualmente en Chromium real: ambos temas, 320/375/1280px, computado de `background-color`/`color` inspeccionado por sección (frambuesa `#ea5385` en Deudas, menta `#38c98c` en Ahorro/Apartados, púrpura en Metas, pizarra en Análisis, todos exactos). Ficha nueva "Identidad de color por sección" en [`contexto/transversal.md`](contexto/transversal.md) (primer análisis a fondo de esta funcionalidad, regla 2.6).

**Qué queda de IV.2:** IV.2b (progreso/modales), IV.2c (calendario/inicio, con la nota de opacidad ya resuelta arriba) e IV.2d (auditoría general de `-text`: quedan `.inversion-hero__tipo-pct` y `.dom-badge--*` sin migrar).

**Podría afectar:** nada funcional (CSS + atributos `data-*` existentes; ningún dominio ni EventBus tocado).

---

### docs(triaje): 8.º lote (Nueva dirección de diseño premium) integrado al BOARD (regla 2.7, sin implementar) · 2026-07-09

Brief de dirección visual de Esteban + 2 imágenes de referencia (explícitamente inspiración de tono, no para copiar: identidad propia). Resultado en [`BOARD.md`](BOARD.md):

- **Decisión de triaje central: NO se abre una iniciativa paralela.** El brief evoluciona la iniciativa de identidad visual existente ([ADR 031](DECISIONS/031-identidad-de-color-por-seccion.md) + tarjetas IV.*) a "Dirección Visual premium". Una sola fuente de verdad; cero tarjetas duplicadas.
- **Lo que el brief pide y YA existe o está decidido:** color con significado y distinto por sección (ADR 031, IV.1 cerrada con contraste WCAG verificado; los emojis del brief son ilustrativos, mandan los tokens); identificar la sección sin leer (es IV.2, que **sigue siendo la tarjeta recomendada para iniciar y NO espera al ADR nuevo**); iconografía protagonista con logos oficiales intactos (ADR 023 v2, 025, 026, 027, todos vigentes); diseño emocional al completar acciones (vive en LG.2/ADR 032 y el catálogo de celebraciones existente).
- **Lo genuinamente nuevo → tarjeta DV.1** (el ADR de la dirección): sistema de superficie/elevación (cards con profundidad ligera, sombras sutiles en 2-3 niveles, aire), color secundario por dominio (extensión del ADR 031), riqueza visual (degradados tokenizados, formas orgánicas SVG estáticas, patrones discretos, ilustraciones como clase nueva de asset del pipeline ADR 026), catálogo de animaciones con propósito (150-250 ms, `prefers-reduced-motion`, coordinado con LG.2 y CFG.7).
- **Tensión señalada para resolución formal en el ADR:** "una familia de iconos propia por sección" contradice el lenguaje único del ADR 023 (decisión de Esteban tras el rechazo del lenguaje genérico v1). Recomendación preliminar registrada: un solo lenguaje Finko Icons con acento de color y detalles por dominio, no 13 familias. Se decide en DV.1, no en silencio.
- **Guardarraíles duros registrados en la tarjeta** (del propio brief + ADN): la apariencia nunca afecta la velocidad (Lighthouse 100 y `pnpm perf` sin regresión como criterio de cierre de cada rebanada), WCAG AA verificado con cálculo real (método de IV.1), ambos temas (las referencias son claras, Finko es oscuro por defecto), prohibidos backdrop-filter/blurs/transparencias costosas/animaciones permanentes. Nota: PERF.8 ya tiene pendiente borrar el único `backdrop-filter` muerto del CSS.
- **Anti-doble-trabajo:** DV define el sistema transversal (tokens + componentes base); la jerarquía y la "riqueza" pantalla por pantalla se ejecutan en las iniciativas v2 ya registradas (Inicio v2/IN.8, ANL.1, Deudas v2, Mis Cuentas v2, GU.1...), que consumen el sistema. Las ilustraciones/formas definitivas son cola de diseño de Esteban en Illustrator (ADR 026), no bloquean el ADR.

Cero código tocado.

---

### feat(logros): LG.2b fundación de progresión de logros (ADR 032 Aceptada) · 2026-07-09

Esteban validó el [ADR 032](DECISIONS/032-logros-v2-niveles-y-habitos.md) (catálogo D4 aprobado como está; nombres de niveles de usuario provisionales hasta que entregue los definitivos; reubicación en dos tiempos D6 aprobada) y la primera rebanada de implementación cerró el mismo día.

**Archivos tocados:**

- `modules/dominio/logros/logic.js`: campos `familia`/`nivel` en el catálogo (primer-gasto = registro N1, diez-gastos = registro N2, meta-lograda = metas N1; ids intactos, `S.logros` sigue siendo `string[]`, cero migración); `FAMILIAS` (metadata de nombre por familia); `agruparVitrina()` (puro: los singles pasan tal cual y cada familia colapsa a una entrada con el nivel más alto ganado, el siguiente pendiente como objetivo, y conteos); `NIVELES_USUARIO` + `nivelUsuario()` (nivel derivado del conteo de logros, umbrales del ADR 032 D5: 0/3/6/10/14/18; nombres provisionales en la constante, cambiarlos no toca datos).
- `modules/dominio/logros/view.js`: encabezado con "Tu nivel: X" + render agrupado (`_renderFamiliaItem`: emoji del nivel más alto ganado, chip "Nivel X de Y", desc del nivel actual o hint del nivel 1, línea "Siguiente: ..." y barra de progreso del nivel pendiente si la expone). Cero CSS nuevo: reutiliza `.logro-item`, `.chip`, `.progress`.
- `service-worker.js`: `CACHE_NAME` v341 → v342.
- Tests: `tests/unit/logros.test.js` +17 (integridad familia/nivel consecutivos desde 1, `agruparVitrina` con todos los estados de familia, umbrales de `nivelUsuario` en los bordes, render agrupado con chip y objetivo); `tests/e2e/smoke.test.js` +1 (suite "Vitrina de logros (niveles)": nivel visible y familia colapsada sin listar sus niveles sueltos).

**Verificación:** 2295/2295 unit + 159/159 E2E verdes (la vitrina se verifica con render real en happy-dom + Chromium E2E; el preview local de este entorno no es confiable). **Cómo verlo en la app:** Ajustes → card "🏆 Logros": encabezado con "Tu nivel:", la familia "Constancia de registro" como una sola tarjeta con chip de nivel y objetivo siguiente.

**Qué sigue de la iniciativa:** LG.2c (mes completo de registro + rachas + familia deudas), LG.2d (mudanza a Análisis+Inicio, bloqueada por ANL.1/IN.8), LG.2e (comportamiento). **Podría afectar:** solo la vitrina de Ajustes y el toast (sin cambios de datos); los usuarios con logros existentes ven su progreso intacto agrupado por familia.

---

### docs(adr): LG.2a ADR 032 Logros v2, niveles progresivos y regla anti-gaming (Propuesta) · 2026-07-09

Primera fase de la iniciativa LG.2 (4.º lote de triaje). [ADR 032](DECISIONS/032-logros-v2-niveles-y-habitos.md) escrito en estado **Propuesta**: revisión formal del ADR 022, como exige la iniciativa (no mover la vitrina en silencio). Cero código tocado; el catálogo y los nombres se validan con Esteban antes de codificar.

**Decisiones de diseño del ADR:**

- **D1, progresión sin bump de schema:** cada nivel de un "logro con niveles" es un logro independiente con id propio dentro de una familia (`familia` + `nivel` en el catálogo); `S.logros` sigue siendo `string[]` y los ids existentes se reutilizan como primeros niveles (`primer-gasto` = registro N1, `diez-gastos` = N2, `meta-lograda` = metas N1): cero migración, la regla "no revocación" aplica por nivel sin lógica nueva.
- **D2, regla anti-gaming (principio innegociable):** prohibidos los logros que mejoren al omitir registro ("día sin gastos", "semana bajo X%"); test de gaming obligatorio por PR ("¿se consigue más fácil borrando datos?"); guardia: los logros de reducción de gasto solo evalúan meses completos de registro.
- **D3, "mes completo de registro":** gastos en al menos 3 semanas del mes; un pase O(gastos del mes) memoizado (`infra/memo.js`); las rachas se calculan desde el mes anterior (el corriente nunca rompe una racha).
- **D4, catálogo v2 (a validar):** de 11 a ~20 logros; familias registro (6 niveles), metas (3), deudas saldadas (2, excluye consolidaciones), comportamiento (hormiga-a-raya, ahorro-creciente, pagador-puntual); 8 singles intactos. "Deuda antes de lo previsto" diferido sin tarjeta (necesita snapshot del plan que no se persiste).
- **D5, niveles de usuario derivados:** del conteo de logros, sin puntos/XP ni persistencia nueva; nombres propuestos como ejemplos a validar.
- **D6, reubicación en dos tiempos:** principio aceptado (el lugar final es Análisis + tarjeta en Inicio) pero la mudanza queda como rebanada bloqueada por ANL.1 e IN.8 (no posicionar dos veces); el ADR 022 sigue vigente operativamente hasta entonces.
- **D7, rendimiento:** evaluadores O(1) o memoizados, disciplina del ADR 022 reforzada; emojis conservados (ADR 025 D6).

**Rebanadas especificadas** (se vuelven tarjetas tras la validación): LG.2b fundación de progresión, LG.2c constancia + deudas, LG.2d mudanza (bloqueada), LG.2e comportamiento. **Hechos verificados antes de diseñar:** deudas saldadas dejan rastro pero borrable; no existe derivación canónica de ingreso mensual (ingresos fijos son plan, no registro), por eso `ahorro-creciente` queda bloqueado hasta esa derivación (probable entregable de ANL.1).

**Además:** bloque nuevo "Sistema de logros" en [`contexto/transversal.md`](contexto/transversal.md) (primer análisis a fondo del dominio, regla 2.6: catálogo, evaluación, toast/cola, vitrina, riesgos e invariantes).

**Podría afectar:** nada (solo docs). **Validación pendiente:** los 3 puntos marcados en el estado del ADR.

---

### feat(config): LEG.1 Centro Legal en Ajustes (rebanada de UI) · 2026-07-09

Cierra LEG.1 por completo (la rebanada de borradores ya se había cerrado horas antes, mismo día). Apartado "⚖️ Centro Legal" en Ajustes con los 10 documentos de `docs/legal/`.

**Decisión de mecanismo (pendiente en la tarjeta original, resuelta al implementar):** fetch de los `.md` en tiempo de ejecución (mismo origen, `docs/legal/*.md` sumados a `CORE_ASSETS` del service worker → disponibles offline tras la primera visita, igual que el resto de la app) + conversión con un conversor Markdown propio nuevo, sin dependencias (ADN 1). Se descartó incrustar el contenido como datos JS duplicados: `docs/legal/` sigue siendo la única fuente de verdad de los textos, sin bifurcación.

**Archivos nuevos:**
- `modules/infra/markdown.js`: `mdToHtml()`, conversor puro y sin DOM. Cubre solo el subconjunto que usan estos 10 documentos (encabezados h1/h2, negrita, código en línea, enlaces, listas, tablas, citas `>`, separador `---`); no es un parser CommonMark completo. Escapa HTML antes de aplicar cualquier transformación (sin XSS). Los enlaces a otro `.md` reciben `data-doc-link` para que el visor cambie de documento sin salir del modal; los enlaces `https://` externos abren en pestaña nueva.
- `modules/dominio/config/legal.js`: catálogo `DOCUMENTOS_LEGALES` (10 entradas, sin el README interno) + `cargarDocumentoLegal()` (fetch) + `documentoLegalPorId()`.

**Archivos modificados:**
- `index.html`: modal genérico `#modal-legal` (un solo modal para los 10 documentos, patrón `modal-open`/`data-doc` ya usado en el resto de la app).
- `modules/dominio/config/view.js`: `_renderLegal()`, lista de documentos con `data-action="abrir-legal"`.
- `modules/dominio/config/index.js`: `_mostrarDocumentoLegal()` (fetch + `mdToHtml` + pinta el modal, con estado de carga y mensaje de error si falla) y `_wireLegalLinks()` (delegación de clicks en enlaces internos).
- `styles/components/config.css`: `.legal-lista` (lista de Ajustes) y `.legal-doc` (tipografía del visor: h3/h4, párrafos, listas, citas, tablas con scroll horizontal, código).
- `service-worker.js`: `CACHE_NAME` v340 → v341; `markdown.js`, `config/legal.js` y los 10 `.md` sumados a `CORE_ASSETS`.
- `eslint.config.js`: agregado el global `fetch` (usado por primera vez en el proyecto).

**Tests:** 13 nuevos en `tests/unit/markdown.test.js` (encabezados, párrafos, `---`, negrita, código protegido de negrita, enlaces externos e internos, listas, tabla con fila separadora, escape de HTML, citas). 2 nuevos en `config.test.js` (un botón por documento del catálogo, id y título correctos) + 2 en `documentoLegalPorId()`. 3 E2E nuevos en `smoke.test.js` (lista completa + abrir un documento con contenido real vía fetch, navegar a otro documento por su enlace interno, cerrar el modal). El conversor se validó además contra los 10 `.md` reales con un script ad-hoc (sin errores, tablas y citas correctas). 2282/2282 unit + 158/158 E2E verdes.

**Qué queda de la iniciativa LEG:** sin bloqueo de código. Falta contenido: el checklist de `docs/legal/README.md` (responsable, correo de contacto, decisión de licencia del código) y la revisión por un abogado colombiano antes de pasar de v0.1 a v1.0 (gate del punto 9 del brief). LEG.2 (aceptación obligatoria) queda pendiente de eso, no de UI. LEG.3 (auditoría de avisos en funciones sensibles) ya se había cerrado antes en la misma jornada.

**Podría afectar:** nada del resto de la app (sección nueva, aislada, sin tocar `S` ni EventBus). **Validación pendiente:** contenido en v0.1 con marcadores `[PENDIENTE: ...]` visibles en el modal hasta que Esteban los resuelva.

---

### fix(legal): LEG.3 auditoría de avisos en funciones sensibles y transparencia de recomendaciones · 2026-07-09

Cierra la iniciativa LEG.3 (puntos 7+8 del brief del 7.º lote). Inventario de las funciones sensibles de la app y verificación de que cada una aclara que sus resultados son aproximaciones sobre los datos del usuario, no instrucciones ni garantías:

- **Monitor de renta (Análisis):** ya cumplía. 3 avisos existentes verificados: "Confirma con un contador antes de declarar" (hint principal), "Consulta con un contador" (recomendación fiscal permanente K.2) y el aviso de vigencia de UVT ("toma estos topes como referencia provisional"). Sin cambios.
- **Patrimonio neto (Análisis):** es una foto del presente (activos - pasivos con los datos de hoy), no una proyección. No aplica el mismo aviso; se deja fuera del alcance con esa justificación explícita.
- **Estrategia de pago de deudas (`modules/dominio/compromisos/views/estrategia.js`): hueco cerrado.** La card (Avalancha/Bola de nieve, comparativa, renegociar tasa, consolidar) mostraba cifras concretas de ahorro y plazos sin ningún aviso de que son simulaciones. Se agregó una línea bajo el subtítulo de la card: "Los plazos y ahorros son simulaciones con los datos que registraste; confírmalos con tu entidad antes de decidir." Cubre las 4 herramientas de la card (estrategia base, aumentar cuota, renegociar, consolidar) con un solo aviso, sin repetirlo en cada bloque (criterio del punto 15 del brief de Deudas: pocos avisos).
- **Proyección de inversión (`modules/dominio/inversiones/view.js`, sección "Proyección al vencimiento"): hueco cerrado.** Mostraba valor proyectado, ganancia esperada y rentabilidad real sin aviso. Se agregó: "Proyección estimada con la tasa y el plazo que registraste; no es garantía de rentabilidad, confírmala con tu entidad."

**Verificación:** ambos avisos confirmados en el preview (deuda con 2 compromisos con tasa + inversión CDT de prueba), captura y snapshot de accesibilidad revisados, cero errores de consola. 2265/2265 tests unitarios verdes (sin tests nuevos: cambio de copy puro, sin lógica). El descargo general de responsabilidad vive en LEG.1 (`docs/legal/descargo-de-responsabilidad.md`); esta tarjeta solo cubre los avisos contextuales en el punto de uso.

**Podría afectar:** nada funcional (2 líneas de copy nuevas en vistas existentes, sin cambio de estructura de datos ni de lógica).

---

### docs(legal): LEG.1 rebanada de borradores, paquete legal completo para el modelo local-only en `docs/legal/` · 2026-07-09

Primera rebanada de LEG.1 (la iniciativa LEG entró al BOARD el 2026-07-08, 7.º lote). Se ejecuta la secuencia recomendada en el triaje: redactar YA para el modelo local-only vigente (la app está pública sin base legal), con cláusula de versionado por si CFG.4 cambia el ADN.

**Archivos nuevos (11, todos en `docs/legal/`):**

- `README.md`: índice del paquete, reglas de redacción y versionado (0.x borrador → 1.0 tras revisión jurídica), hechos verificados del producto y **checklist de pendientes que bloquean v1.0**: nombre del responsable, correo de contacto real, decisión de licencia del código (el repo público no tiene LICENSE: hoy rige "todos los derechos reservados") y revisión por abogado colombiano (gate del punto 9 del brief).
- `terminos-y-condiciones.md`: naturaleza del servicio (herramienta gratuita de organización, no entidad financiera), consecuencias aceptadas del modelo local-only (respaldo propio, sin recuperación, un dispositivo), uso aceptable, menores, disponibilidad, re-aceptación versionada.
- `politica-de-privacidad.md`: privacidad por diseño; lo único que viaja es la descarga de la app (datos técnicos del hosting Vercel, sin datos financieros); controles de Ajustes (export/import/borrar).
- `tratamiento-de-datos-personales.md`: posición frente a la Ley 1581 de 2012 (tratamiento de ámbito personal/doméstico, excluido por el artículo 2 literal a; Finko no es responsable del tratamiento porque no recibe datos), principios adoptados por diseño, derechos habeas data con plazos de los artículos 14/15, SIC como autoridad, cláusula CFG.4 completa.
- `aviso-de-cookies.md`: cero cookies de todo tipo (verificado); `localStorage` estrictamente funcional; caché del service worker; cómo borrar.
- `descargo-de-responsabilidad.md`: puntos 3+4 del brief (organización y guía, no asesoría financiera/tributaria/contable/jurídica; aproximaciones sobre datos del usuario; constantes legales con fecha de revisión; sin garantías; limitación de responsabilidad).
- `propiedad-intelectual.md`: titularidad del código/diseño/iconografía/textos; el repo público no otorga licencia implícita; los datos del usuario son del usuario.
- `marcas-de-terceros.md`: punto 5 del brief, complementa los ADR 025 D5/027/029 (uso nominativo de identificación, sin afiliación salvo convenio informado, retiro a solicitud del titular con fallback a iniciales/categoría).
- `licencias-de-terceros.md`: inventario verificado archivo por archivo: fuentes Inter y DM Mono (SIL OFL 1.1, empaquetadas en `assets/fonts/`), glifos Simple Icons (CC0, en el sprite); las devDependencies no se distribuyen; cero librerías en runtime.
- `aviso-legal.md`: identificación del responsable (con marcadores pendientes), infraestructura, marco normativo CO, jurisdicción.
- `historial-de-cambios.md`: registro versionado (primera fila: v0.1 del paquete) + criterio de cambio importante vs menor para la re-aceptación de LEG.2.

**Convenciones:** todos los documentos siguen el ADN 11 (bloque "En pocas palabras" en lenguaje claro + texto formal numerado), tuteo, cero guion largo (verificado con grep). Marcadores `[PENDIENTE: ...]` uniformes para los datos que solo Esteban puede definir.

**Qué queda de la iniciativa LEG:** LEG.1 rebanada de UI (Centro Legal en Ajustes que muestre estos textos, coordinar con CFG.6), LEG.2 (aceptación versionada, sigue bloqueada hasta tener el Centro Legal y textos estables) y LEG.3 (auditoría de avisos contextuales, puede ir en paralelo).

**Podría afectar:** nada en la app (cero código tocado; docs solamente). **Validación pendiente:** los 4 puntos del checklist del README de `docs/legal/`.

---

### docs(triaje): 7.º lote (Centro Legal y cumplimiento) integrado al BOARD (regla 2.7, sin implementar) · 2026-07-08

Séptimo triaje del día: 1 brief de 9 puntos sobre el marco legal. Resultado en [`BOARD.md`](BOARD.md), iniciativa nueva **LEG**:

- **Hueco real verificado:** la app está en producción sin ningún documento legal (cero términos, privacidad o disclaimers formales; solo los avisos puntuales "confirma con un contador" del monitor de renta).
- **LEG.1** (Centro Legal en Ajustes + borradores de todos los documentos: términos, privacidad, Ley 1581/Habeas Data, cookies (aclarando que no se usan), licencias, descargo de responsabilidad con los puntos 3+4 del brief, propiedad intelectual, aviso de marcas de terceros que complementa los ADR 025/027/029, contacto para derechos e historial versionado). **LEG.2** (aceptación obligatoria versionada en onboarding + re-aceptación en cambios importantes, con la limitación honesta documentada: sin servidor, la evidencia vive solo en el dispositivo). **LEG.3** (auditoría de avisos en funciones sensibles: mucho ya existe; completar huecos con el mismo tono, sin llenar la app de texto).
- **Acoplamiento señalado con CFG.4:** el contenido del paquete depende de esa decisión de ADN (local-only = "tus datos no salen de tu dispositivo" como fortaleza; cuentas/sync = paquete completamente distinto). Secuencia recomendada: redactar YA para el modelo vigente, con cláusula de versionado. Nota cruzada en ambas direcciones.
- **Gate final explícito (punto 9):** la revisión del paquete por un abogado colombiano antes del lanzamiento oficial es trabajo profesional externo; las tarjetas producen borradores informados y el inventario de funciones sensibles PARA esa revisión, no la sustituyen (mismo principio que Finko aplica a sus usuarios).
- CFG.6 reserva el bloque del Centro Legal en el layout de Ajustes.

Cero código tocado.

---

### docs(triaje): 6.º lote (brief General) integrado al BOARD, con decisión de ADN señalada (regla 2.7, sin implementar) · 2026-07-08

Sexto triaje del día: 1 brief de 8 puntos, el de mayor alcance. Resultado en [`BOARD.md`](BOARD.md):

- **Punto 2 (cuentas de usuario + sincronización): TOCA EL ADN DE FRENTE** ("Sin servidor. Sin cuenta. Sin sync.", CLAUDE.md reglas 2/3, y la promesa de privacidad del onboarding). Se **fusionó con CFG.4**, que ya anticipaba la tensión, y la tarjeta ahora captura la versión completa del pedido + lo que el ADR debe poner sobre la mesa: redefinición del producto, backend/costos/modelo de amenazas, alternativas intermedias (local-first con cifrado E2E, respaldo a almacenamiento del propio usuario), y PERF.5 (IndexedDB) como precondición práctica (activaría el disparador D4 del ADR 030). **Nada se implementa sin ese ADR y la discusión explícita con Esteban.**
- **Punto 3 (seguridad)** → integrado a **CFG.5**, ampliada con re-autenticación en acciones críticas (restablecer app, eliminar todo, exportar; hoy "Restablecer" solo pide confirmación de texto). La parte usuario/contraseña pertenece a CFG.4; el PIN/patrón local puede ir antes.
- **Puntos 4+5 (guía por navegación + simplificar info inicial)** → iniciativa **GU.1** (fusión interna del lote: son la misma auditoría). Revisa formalmente el **ADR 016** (banner de propósito). Regla anti-doble-trabajo: GU.1 audita el sistema transversal; los rediseños internos viven en las iniciativas v2 de cada sección. Varios ejemplos del brief ya existen o ya están previstos (CTA de cuenta, CAL.1, "Gestionar"→Calendario, fondo→distribución).
- **Puntos 6+7+8 (transferencias entre cuentas)** → **MC.17** nueva: transferencia con actualización automática de ambas cuentas, automatización por conteo (regla 0/1/varias), historial como tipo propio en Movimientos que jamás cuenta como ingreso/gasto (bump de schema), y la decisión GMF/4x1000 para el análisis (las cuentas ya modelan `aplica4x1000`).
- **Punto 1 (actualizaciones)** → **UPD.1** nueva: aviso discreto al detectar versión nueva del SW + novedades mostradas una sola vez (`NOVEDADES_POR_VERSION` local, cero servidor).
- **Hallazgo de archivo:** el [ADR 014](DECISIONS/014-taxonomia-categorias-transversal.md) (taxonomía transversal, Propuesta desde junio) cubre el territorio de CAT.1: la sesión de taxonomía debe validar ADR 014 + ADR 029 D3 + CAT.1 como UNA decisión. Desambiguado el ID histórico "AP.5" del ADR 014 frente a la tarjeta AP.5 actual.

Cero código tocado.

---

### docs(triaje): 5.º lote (Fondo de emergencia, Límites de gasto) integrado al BOARD (regla 2.7, sin implementar) · 2026-07-08

Quinto triaje del día: 2 briefs. Resultado en [`BOARD.md`](BOARD.md) y [BUGS.md](BUGS.md):

- **Fondo de emergencia:** el punto 1 ("Empty State" literal visible al desactivar y editar el fondo) es un **bug de copy, BUG-012** (viola el ADN 11; incluye pasada de grep por otros literales técnicos en views al corregirlo). El rediseño UX educativo y la integración del aporte al flujo de distribución → iniciativa **"Fondo v2" (AH.5)**; la base ya existía (AH.2 calcula el aporte, ADR 021 recuerda el día de ingreso, MC.13 punto 21 ya contemplaba la cuota del fondo en la distribución). El registro manual de aportes se conserva como vía secundaria para aportes fuera de ciclo, no se elimina.
- **Límites de gasto: FUSIÓN, no tarjeta nueva.** El brief se solapa casi 1:1 con LIM.1 (brief verbatim de Esteban del 2026-07-05): los puntos coincidentes se marcaron como reafirmados y solo los genuinamente nuevos entraron como puntos 7-10 de la tarjeta, que pasa a llamarse **"Límites v2"**: (7) base de cálculo sobre dinero realmente disponible y no solo ingresos fijos (con la advertencia de diseño: un saldo alto no siempre es gastable; conecta con MC.10/MC.11 y el motor de MC.13); (8) fijos no esenciales (streaming, IA) cuentan contra los límites, con la dimensión esencial/no-esencial decidida en CAT.1/ADR 029 D3; (9) hormiga y fantasma sobre suscripciones ("$120.000/mes en streaming, revisa cuáles usas"), alimentando el motor único de sugerencia por categoría (regla TX.10/LIM.1/ANL.1); (10) límites sugeridos y adaptativos. **Nota formal añadida:** sacar Necesidades y Ahorro de la sección revisa parcialmente el ADR 019 (roles por grupo), a decidir en el análisis, no en silencio. El modelo del análisis inicial sube a Opus 4.8 - Alto (la base de cálculo es lógica financiera con riesgo de recomendaciones erróneas).
- Motor de MC.13: el aporte del fondo en la distribución (AH.5) queda explícito como consumidor n.º 7.

Cero código tocado.

---

### docs(triaje): 4.º lote (Ajustes, Análisis, Apartados, Metas) integrado al BOARD (regla 2.7, sin implementar) · 2026-07-08

Cuarto triaje del día, el más entrelazado: 4 briefs cruzados contra tablero, ADRs, fichas y los 3 lotes anteriores. Resultado en [`BOARD.md`](BOARD.md):

- **Ajustes:** punto 1 (unificar lo fiscal) confirma la dirección de la iniciativa CFG.1+CFG.2 ya en curso y añade la decisión de ubicación → tarjeta nueva **CFG.2c** (asistente "Completar perfil fiscal" bajo demanda en Ajustes; interpretación consolidada en Análisis). Punto 2 (rediseño visual) → integrado a **CFG.6**. Punto 3 (transición de temas) → **CFG.7 con advertencia técnica**: la transición suave YA existe y fue deliberadamente restringida por lag en móvil (documentado en `themes.css`); la dirección recomendada es View Transitions API como mejora progresiva + verificar primero en el dispositivo real de Esteban (mismo criterio de evidencia del ADR 030).
- **Análisis:** puntos 6-8 (lenguaje cercano, explicar gráficos, reorganización) se **integran a ANL.1**, que ya los registraba casi 1:1 desde el 2026-07-05 (se añaden los ejemplos de copy nuevos: "Estado de tu dinero", "Lo que tienes"/"Lo que debes"). Puntos 1-5 (logros) → iniciativa nueva **LG.2 "Logros v2, gamificación de hábitos"** (LG.2a), que requiere ADR revisando el ADR 022 (la vitrina se muda de Ajustes a Análisis + Inicio) e incluye como principio innegociable la **regla anti-gaming de Esteban**: premiar hábitos, nunca la omisión de información (prohibido "día sin gastos").
- **Apartados:** iniciativa **"Apartados v2" (AP.5)** con la filosofía redefinida (colchón para gastos esporádicos olvidables, no objetivos grandes): form estándar, recurrencia como toggle post-creación, aporte sugerido prellenado. Las categorías que son Metas (Vacaciones, Computador...) → **CAT.1 ampliada** (la taxonomía Apartados↔Metas se decide en la MISMA pasada que Gastos↔Fijos); el selector de emojis del SO (Win+.) → **CAT.2**.
- **Metas:** iniciativa **"Metas v2" (MT.6)**: subcategorías inteligentes (patrón compartido detectado: categoría→subcategoría es el mismo modelo de dos niveles que entidad→producto de MC.16/Deudas, se decide UNA vez en ADR 029 D3), cuota por frecuencia real del usuario, plan de aportes generado y recalculado automáticamente (si se ejecutara solo, pertenece al ADR de PA). La integración con "Distribuir mi ingreso" era exactamente el punto 21 de MC.13 (metas añadido como consumidor).
- **Motor compartido de MC.13 renombrado** a "vencimientos y aportes recomendados": suma como consumidores el plan de MT.6 y el prellenado de AP.5 (ya eran consumidores el asistente, la checklist, PA.1 y la cuota por período). **CAT.2 sube a 6 consumidores.**

Cero código tocado.

---

### docs(triaje): 3.er lote (Inicio, Calendario, Me deben) integrado al BOARD (regla 2.7, sin implementar) · 2026-07-08

Tercer triaje del día: 3 briefs. Resultado en [`BOARD.md`](BOARD.md):

- **Inicio:** los 2 puntos se integran a fuentes ya existentes, cero tarjetas nuevas. "Gestionar" de Pendientes del mes → Calendario (no Deudas) entra a la iniciativa **Inicio v2** como rebanada temprana candidata (cambio de una línea, no espera el ADR de revisión). La identificación visual de prioridades **amplía la spec que ya vivía en IV.2c**: además de icono + color de sección, cada ítem lleva etiqueta pequeña de tipo ("Deuda", "Gasto fijo", "Meta"...), cumpliendo "el color nunca viaja solo" (ADR 031 D1); los colores de los emojis del brief son ilustrativos, mandan los tokens aprobados.
- **Calendario:** tarjeta nueva **CAL.3** (selección automática del día actual al entrar: si hoy tiene compromisos, el panel de detalle carga solo; navegación entre fechas sin cambios; incluye indicar claramente cuando un día no tiene registros, que hoy simplemente no muestra nada).
- **Me deben:** iniciativa nueva **"Me deben v2: seguimiento inteligente" (PE.6)** sobre la base ya cerrada de PE.1 (tasa + reparto capital/interés) y PE.2-PE.5 (estados humanizados): total sugerido con intereses acumulados y desglose visible en "Me pagaron" (el usuario decide: cobrar todo, parte o perdonar), historial de abonos por préstamo (bump de schema; hoy solo existe el acumulado `pagado`), rendimiento del préstamo, estados visuales con los semánticos del ADR 031 y estadísticas de confianza por persona (historial informativo, no calificación). **Derivados:** recordatorios de vencimiento → **CFG.3** (personales añadido como fuente del motor único); fecha por defecto = hoy → **CAT.4**, que Esteban elevó a regla de toda la app (la tarjeta pasa a "auditoría de consistencia de formularios: orden + fecha default").

Cero código tocado.

---

### docs(triaje): 2.º lote (Deudas y Mis Cuentas) integrado al BOARD (regla 2.7, sin implementar) · 2026-07-08

Segundo triaje del día: 2 briefs (Deudas, 15 puntos; Mis Cuentas, 21 puntos + integración del ingreso fijo con cuenta de destino). Resultado en [`BOARD.md`](BOARD.md):

- **Iniciativa "Deudas v2: de registro a asesor" (D.15):** alerta roja solo en el encabezado con panel interior en calma (2 capas del ADR 031), Finko recomienda la estrategia principal según capacidad de pago, copy motivador en simulaciones/Avalancha/Bola de nieve, editar deuda (hoy solo se elimina; rebanada temprana candidata), tarjetas con jerarquía visual, "Aplicar" en el simulador de pago extra, menos hints de bajo valor conservando los útiles (D.12). D.14 queda como su primera rebanada. Derivados a fuentes externas: iconos Avalancha/Bola de nieve → IV.4 (spec añadida); "Otro" con icono → CAT.2; catálogo entidad→producto (Visa Platinum...) → ADR 029 D3, compartido con MC.16.
- **BUG-011 registrado en [BUGS.md](BUGS.md):** el panel estratégico se cierra al cambiar de pestaña y deja la simulación aplicada sin "Aplicar estrategia" (reportado por Esteban con pasos de reproducción; corregible antes o dentro de Deudas v2).
- **Iniciativa "Mis Cuentas v2" con 3 tarjetas:** **MC.13 ampliada** a "Distribución v2" (2 pasos: educación visual + distribución por prioridad; alertas por categoría en su paso; completar con saldo de otras cuentas; dinero restante con decisión explícita; cuota del período según frecuencia; el ingreso fijo registra cuenta de destino y el paso final "Estilo de vida" desaparece: lo no distribuido se queda en la cuenta); **MC.15** (UI: redundancias en tarjetas de cuenta e ingresos fijos, legibilidad de logos ajustando SOLO el contenedor por la regla de fidelidad, advertencia útil de cuota de manejo); **MC.16** (tarjeta de crédito como producto integrado cuentas↔deudas, requiere ADR: cupo+deuda, cuotas al pagar, recalculo por pago anticipado, nudges de costos bancarios; desbloquearía el `consumosTC` automático de CFG.2a, nota cruzada añadida).
- **Dos conflictos con decisiones aprobadas, señalados sin revertir en silencio:** (a) "los ingresos esporádicos no ofrecen distribución" revierte parcialmente NAV.A2b slice 2 del ADR 024; (b) el abono automático del ingreso fijo a la fecha es un movimiento sin confirmación: se decide en el MISMO ADR de PA.1 (débitos y créditos automáticos, un solo criterio).
- **CAT.2 pasa de 2 a 4 consumidores** (se suman los forms de Deudas y Cuentas) y nace **CAT.4** (orden categoría→descripción consistente en todos los formularios).

Cero código tocado.

---

### docs(triaje): lote de 5 auditorías de Esteban integrado al BOARD (regla 2.7, sin implementar) · 2026-07-08

Primer triaje formal bajo la sección 2.7 de CLAUDE.md: 5 briefs de Esteban (Inicio, Gastos, Calendario, Mis Cuentas, Deudas/pagos automáticos) cruzados contra el tablero, los 31 ADRs, las fichas y **entre sí**, sin implementar nada. Resultado en [`BOARD.md`](BOARD.md):

- **Iniciativa "Inicio v2" nueva (IN.8):** requiere revisión formal del ADR 028 porque reordena la pantalla aprobada (alertas primero; accesos fusionados con actividad reciente al final) y reabre el avatar con fotografía que el ADR 028 D3 descartó por cupo de `localStorage`. Absorbe IN.6b, IN.4b y las 2 observaciones sueltas de Inicio. Recomendado no iniciar antes de IV.2 (auditar sobre la base de color desplegada, no rediseñar dos veces).
- **Iniciativa CAT nueva (CAT.1/2/3, Transversal):** taxonomía Gastos↔Gastos fijos con categorías contextuales y deduplicación de catálogos (coordinar con la validación D3 del ADR 029: UNA clasificación, no dos); picker de icono compartido (cruce interno del lote: los briefs de Gastos y Calendario piden la misma interacción por separado, se construye UNA vez); categorías personalizadas globales (extiende TX.9b a toda la app).
- **MC.13** (distribución de ingresos contextual por fecha, absorbe MC.7g) y **MC.14** (llaves de transferencia por cuenta) en Mis cuentas. MC.13 define el **motor de vencimientos compartido** que también consume PA.1 (cruce interno del lote: no construir 2 motores; `eventosDelMes` de Agenda ya resuelve la mitad).
- **D.14** (registrar deuda acredita la cuenta donde se recibió el dinero, con "No aplica" obligatorio para deudas que no entregan dinero). **Verificación del triaje:** la otra mitad del brief ("pagar deuda descuenta de la cuenta") ya existe desde el ADR 002 y no genera tarjeta.
- **Iniciativa PA nueva (PA.1, Transversal):** pagos automáticos. Requiere ADR propio: en una PWA offline el "débito a la fecha" solo puede ser catch-up al abrir la app, y registrar movimientos sin confirmación arriesga divergencia con la realidad bancaria (filosofía "Finko refleja, no inventa").
- **Integraciones a fuentes únicas existentes:** iconografía+color en Pendientes/Prioridades y tinte de eventos del calendario → IV.2 (specs añadidas); copy cercano de alertas de límites → LIM.1 (punto 6 nuevo); nota cruzada en ANL.1 (su punto 8 lo resuelve el ADR 031); logos de marca en eventos → ADR 029 (base MK.2 ya existente).

Cero código tocado. Limpieza 7.4 de paso: 3 guiones largos heredados corregidos en BOARD/CHANGELOG/ADR 031.

---

### docs(workflow): sección 2.7, triaje de tareas nuevas y rol de líder técnico · 2026-07-08

Regla nueva del usuario, codificada en [`/CLAUDE.md`](../CLAUDE.md) sección 2.7: toda tarea nueva entra por **triaje** (¿existe parcial?, ¿modifica algo aprobado o revierte un ADR?, ¿se integra a una iniciativa mayor?, ¿depende de algo?, ¿se difiere?) y el resultado es implementar ahora, integrar o registrar y diferir; la tarjeta "En proceso" no se abandona por ideas nuevas (continuidad primero); cada funcionalidad tiene **una sola entrada canónica** en el BOARD (tarjeta o iniciativa que absorbe las tareas pequeñas relacionadas), con la ejecución siempre por rebanadas verificables (la regla 2.1 se mantiene: fuente única ≠ tarea monolítica); priorización explícita al elegir tarjeta (impacto, dependencias, riesgo, beneficio, verificabilidad); y rol de arquitecto: proponer la solución más elegante/reutilizable **antes** de implementar, no después.

**Primer caso aplicado en el mismo movimiento:** la tarjeta **TX.10** ("categoría como eje de automatización") seguía viva en el BOARD pese a que el [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md) declara absorberla desde el 2026-07-06. Se fusionó (nota de absorción con el solape LIM.1/ANL.1 preservado como regla de diseño), se corrigió la nota de IN.7 que la citaba como tarjeta viva (junto con CAL.1, ya cerrada), y el ADR 029 (que llevaba 2 días sin commitear siendo referenciado) entró al repo en su estado honesto de **Propuesta** (pendiente de que Esteban valide la taxonomía D3; nada de eso se inicia sin esa validación).

| Archivo | Cambio |
|---|---|
| `CLAUDE.md` | Sección 2.7 nueva (triaje, continuidad, fuente única por funcionalidad, priorización, rol de arquitecto, documentación viva). |
| `docs/BOARD.md` | Regla de triaje en el encabezado; TX.10 absorbida por el ADR 029; nota de IN.7 corregida. |
| `docs/DECISIONS/029-catalogo-de-marcas-por-categoria.md` | Entra al repo (estado Propuesta, sin cambios de contenido). |

---

### docs(adr) + feat(ui): IV.1, fundación de tokens de identidad de color por sección · 2026-07-07

Primera fase de la iniciativa "Identidad de color por sección" ([ADR 031](DECISIONS/031-identidad-de-color-por-seccion.md), aceptada por Esteban el mismo día). Brief: la app depende demasiado del verde y el negro; cada sección debería tener un color reconocible en toda la experiencia (tarjetas, botones, iconos, barras, gráficos, calendario). El análisis encontró que los tokens `--fk-dom-*` ya existían en `tokens.css` pero sub-desplegados (solo en tejas, dots y badges pequeños), **sin rampa de tema claro** (hueco WCAG real: varios dominios por debajo de 2:1 de contraste sobre blanco) y con `--fk-dom-compromisos` **idéntico** a `--fk-danger` (#ff4757 compartido entre "es una deuda" y "hubo un error").

Las 5 decisiones abiertas del ADR (P1 a P5) se resolvieron todas con la opción recomendada: gastos/egresos se mantienen cálidos y neutros (el [ADR 019](DECISIONS/019-limites-por-rol.md) "gastar no es incumplir" sigue vigente, sin cambios); Deudas se separa del rojo de error; Límites se queda en amarillo; el hub Ahorros usa una familia de colores relacionados en vez de 4 matices sueltos que chocarían entre sí (Metas azul habría colisionado con Mis cuentas).

**Cambios de tokens:** `--fk-dom-agenda` nuevo (índigo `#7d8cf0`, Calendario no tenía color propio); `--fk-dom-compromisos` de `#ff4757` a frambuesa `#ea5385`; `--fk-dom-analisis` a pizarra neutra `#8f9bb3` (Análisis interpreta a los demás dominios en vez de tener datos propios, así que se retira de la zona verde-turquesa saturada); `--fk-dom-inversion` hereda el turquesa `#2fd2bf` que Análisis deja libre. Los 11 dominios ganan `--fk-dom-X-bg` (`color-mix` al 12%, mismo valor en ambos temas) y `--fk-dom-X-text` (variante segura como texto/UI significativa, con override obligatorio en `body.light-theme` que corrige el hueco WCAG).

**Hallazgo corregido antes de implementar, no a ojo:** la frambuesa que proponía el texto original del ADR (`#ef5777`) resultó, al calcular su HSL real, estar a solo 7° de matiz de `--fk-danger`: casi indistinguible con daltonismo protán pese a no ser el mismo hex. Se recalculó a `#ea5385`, separada 14-19° de matiz y con luminosidad propia (una separación robusta contra daltonismo no depende solo del matiz), verificando con la fórmula de contraste WCAG que los 11 dominios siguen pasando ≥4.98:1 sobre superficies oscuras y los 11 `-text` ≥4.5:1 sobre blanco y `#f6f7fa` en tema claro.

**Verificado en el navegador, no solo en código:** con Chromium real vía preview, la teja de "Deudas" en el menú "Más" resuelve a `rgb(234,83,133)` (=`#ea5385`) exacto, "Análisis" a `rgb(143,155,179)` (=`#8f9bb3`) exacto, en ambos temas. La verificación también encontró (preexistente, no introducido por esta tarea) que algunos usos ya desplegados leen el token base directo como color de texto en vez de la variante `-text` (ej. `.inversion-hero__tipo-pct` de `analysis.css`, badges de `nudges.css`), fallando contraste en tema claro (`100%` de Inversión da 1.89:1 contra blanco). Es exactamente el hueco que la iniciativa se propuso cerrar; queda documentado con los archivos y selectores exactos para que IV.2 lo resuelva sin tener que volver a auditar.

**Validación:** 2265/2265 unit (sin cambios de comportamiento JS, cero tests nuevos) + 155/155 E2E en Chromium real + verificación manual de contraste (axe-core no cubre la regla `color-contrast` en happy-dom, ver nota en `a11y.test.js`). SW v339 → v340.

| Archivo | Cambio |
|---|---|
| `styles/tokens.css` | Recoloreo de compromisos/análisis/inversión; `--fk-dom-agenda` nuevo; rampa `-bg`/`-text` para los 11 dominios. |
| `styles/themes.css` | Override de los 11 `--fk-dom-X-text` en `body.light-theme`. |
| `docs/DESIGN_SYSTEM.md` | Tabla de dominios actualizada (valores oscuro/claro) + documentación de la rampa de 3 tokens. |
| `docs/DECISIONS/031-identidad-de-color-por-seccion.md` | ADR aceptado; corrección del hex de compromisos tras el cálculo de contraste real. |
| `docs/BOARD.md` | IV.1 cerrada con el hallazgo exacto para IV.2; IV.2/IV.3 desbloqueadas. |
| `service-worker.js` | v339 → v340. |

---

### perf(rendimiento): PERF.7d, calcularEstadoRenta memoizada sin tocar config/index.js · 2026-07-07

Tercera rebanada de **PERF.7**, y cierre de la mitad de `calcularEstadoRenta()` que PERF.7b había descartado por riesgo de datos obsoletos. `_renderEstadoRenta(anio)` ([analisis/view.js](../../modules/dominio/analisis/view.js)) llamaba a `calcularEstadoRenta(S, anio)` (barrido de `patrimonioBruto` + `totalGastosAnio`) **sin memoizar**, en cada `renderAnalisis()`.

**El plan original de esta tarjeta resultó más grande de lo necesario.** PERF.7b había planteado que primero había que corregir `config/index.js` para que emitiera `state:change` al guardar datos fiscales (hoy los muta directo, sin EventBus), y solo después memoizar. Al analizarlo a fondo: el handler de "Datos de renta" (`#form-datos-fiscales`) siempre **reemplaza** `S.config.datosFiscales[anio]` con un objeto nuevo (`entrada = {}` en cada submit, o lo borra con `delete`), nunca lo muta en el lugar. Eso significa que memoizar `calcularEstadoRenta` con un `extraerClave` que lea `state.config?.datosFiscales?.[anio]` **directamente** (en vez de pasar el estado completo, que nunca cambia de referencia) detecta el cambio solo por identidad, sin depender de ningún evento. Se agregó `_calcularEstadoRentaMemo`, memoizada contra `['gastos', 'cuentas', 'inversiones']` (que sí emiten `state:change` correctamente hoy) con ese `extraerClave` propio. `config/index.js` y `analisis/index.js` quedan sin tocar: menos riesgo y menos superficie de cambio que el plan original.

**Prueba de la corrección, no solo del rendimiento:** se agregaron 4 tests en `tests/unit/analisis.test.js` que renderizan Análisis dos veces con `S.config.datosFiscales` editado entre medio (simulando exactamente el handler, sin pasar por EventBus) y verifican que el segundo render **no sirve el resultado obsoleto**. Con una memoización ingenua (clave por defecto), el test de "editar entre dos renders" habría fallado mostrando el badge "Sin datos en Finko" en vez del monto nuevo: la prueba habría detectado exactamente el bug que este diseño evita.

**Medición honesta (`pnpm perf`):** el efecto en "Análisis caché" es pequeño, dentro del ruido de medición (3,4-4,6 ms antes → 3,4-3,9 ms ahora). `calcularEstadoRenta` ya era barata frente al resto del bundle memoizado de PERF.2 con los datos de la semilla de este harness. El valor de esta tarea es de **corrección de cobertura de caché** (cierra el único barrido sin memoizar que quedaba en el render de Análisis), no de velocidad medible en este escenario sintético.

**Validación:** 2265/2265 unit (4 tests nuevos) + 155/155 E2E en Chromium real + `pnpm perf`. SW v338 → v339. Con esto, **PERF.7 queda completa salvo PERF.7c** (warm-up en idle).

| Archivo | Cambio |
|---|---|
| `modules/dominio/analisis/view.js` | `_calcularEstadoRentaMemo` nuevo (memoiza `calcularEstadoRenta` con `extraerClave` propio); `_renderEstadoRenta` lo usa. |
| `tests/unit/analisis.test.js` | 4 tests nuevos: sin datos, edición entre renders no queda obsoleta, borrado se refleja, cache hit correcto sin cambios. |
| `scripts/perf/BASELINE.md` | Sección PERF.7d con la medición y la explicación de por qué es seguro. |
| `docs/BOARD.md` | PERF.7d cerrada con el alcance revisado (más chico que el planteado en PERF.7b). |
| `service-worker.js` | v338 → v339. |

---

### perf(rendimiento): PERF.7b, fold de hayResumen() en el bundle memoizado del resumen semanal · 2026-07-07

Segunda rebanada de **PERF.7**. `renderPanelResumen()` ([resumen/view.js](../../modules/dominio/resumen/view.js)) llamaba a `hayResumen(gastos, hoyISO)` (barrido propio de `S.gastos`, **sin memoizar**) para decidir si mostrar el panel, y recién después llamaba a `_resumenSemanalMemo()` (memoizada desde PERF.2) para el contenido. `resumenSemanal()` ya calcula `registros` (gastos en los últimos 7 días) como parte de su resultado: la condición de "sin actividad" ahora se lee de ese campo, una sola llamada memoizada en vez de dos (una sin cachear).

**Hallazgo de alcance importante:** la otra mitad prevista de esta tarjeta, memoizar `calcularEstadoRenta()` (Análisis, K.3), se descartó tras analizarla: depende de `S.config.datosFiscales`, y `config/index.js` **muta ese dato sin emitir `state:change`** (el handler de `#form-datos-fiscales` guarda directo + `save()` + `renderPanelConfig()`, sin pasar por el EventBus como el resto de la app). Memoizarla contra `gastos`/`cuentas`/`inversiones` habría servido un resultado **obsoleto** después de editar "Datos de renta" y navegar a Análisis sin pasar por un `renderAll()` completo: eso es un bug de datos, no una optimización perdida. Se registró como **PERF.7d** (arreglar la emisión de eventos primero, memoizar después) en vez de forzarla en esta tarjeta.

**Medición (`pnpm perf`, columna "Inicio", que mide `renderPanelResumen` + `renderActividadReciente`):**

| gastos | Inicio frío (7a → 7b) | Inicio caché (7a → 7b) |
|---|---|---|
| 1.000  | 4,3 → 8,5 ms (regresión, ver nota) | 2,1 → **0,7 ms** |
| 5.000  | 46,8 → **39,5 ms** (~16 % menos) | 8,1 → **0,9 ms** |
| 10.000 | 93,5 → **79,8 ms** (~15 % menos) | 15,2 → **0,8 ms** |

La ruta **caché** (re-render de Inicio sin cambios en `gastos`, el caso más frecuente en uso real) queda plana en ~0,8 ms a cualquier volumen. La ruta **fría** mejora ~15-16 % a 5.000/10.000 gastos. A 1.000 gastos hay una **regresión real de ~4 ms** (no ruido, reproducida en 2 corridas): con la semilla de 10 años y poca densidad, la ventana de "últimos 7 días" seguido no tiene gasto; antes `hayResumen()` (1 barrido) devolvía `false` sin llegar a calcular el bundle completo (5 barridos), ahora `resumenSemanal()` se calcula siempre para leer `.registros`. Se acepta el trade porque el costo absoluto es imperceptible (~4 ms), solo se paga una vez por mutación real (no por render), y se invierte a mejora clara cuando el historial crece, que es el escenario que le preocupa a Esteban. Detalle completo, sin maquillar la regresión, en [`scripts/perf/BASELINE.md`](../scripts/perf/BASELINE.md).

**Validación:** 2261/2261 unit (4 tests nuevos de `renderPanelResumen()` en `tests/unit/resumen.test.js`) + 155/155 E2E en Chromium real + `pnpm perf`. SW v337 → v338.

| Archivo | Cambio |
|---|---|
| `modules/dominio/resumen/view.js` | `renderPanelResumen()` deriva la condición de "sin actividad" de `r.registros` en vez de llamar a `hayResumen()` por separado. |
| `tests/unit/resumen.test.js` | 4 tests nuevos de `renderPanelResumen()` (sin contenedor, oculta sin actividad/sin gastos, muestra con actividad). |
| `scripts/perf/BASELINE.md` | Sección PERF.7b con la medición completa, incluida la regresión a 1.000 gastos. |
| `docs/BOARD.md` | PERF.7b cerrada (parcial); PERF.7d nueva (arreglar emisión de eventos de datos fiscales, precondición para memoizar `calcularEstadoRenta`). |
| `service-worker.js` | v337 → v338. |

---

### perf(rendimiento): PERF.7a, Intl.DateTimeFormat cacheado en las vistas de lista · 2026-07-07

Primera rebanada de **PERF.7**, salida de la segunda pasada de la auditoría de rendimiento (2026-07-07). Esa pasada confirmó que lo grueso ya estaba resuelto (eventos por sección, `renderSmart` hash-gate, `infra/memo.js`, windowing) y corrigió un hallazgo propio: el doble-render caro que motivaba PERF.6 **no ocurre**, porque `renderSmart` solo pinta la sección activa y Análisis (solo-lectura) nunca se muta desde sí mismo. Se reordenó la prioridad hacia PERF.7, que es una ganancia **medida e incondicional**.

**Hallazgo (PERF.7a):** `fechaLegible()` (`infra/utils.js`), `_mesAnioLabel()` (`movimientos/view.js`) y `fechaCorta()` (`tesoreria/views/ingresos.js`) construían un `Intl.DateTimeFormat` nuevo (vía `toLocaleDateString`) en **cada llamada**, o sea una vez por ítem de lista: 50 por lote en Movimientos, el mes completo en Gastos. Construir el formatter es la parte cara; formatear con uno ya construido es barato.

**Cambio:** se agregó `formateadorFecha(locale, opciones)` en `utils.js`: cachea la instancia por firma (locale + `JSON.stringify(opciones)`) en un `Map`, de modo que cada combinación se construye una sola vez en toda la vida de la app. Los tres call sites la usan. `format()` produce texto idéntico a `toLocaleDateString` con los mismos argumentos, así que es cero cambio de comportamiento (hay un test de equivalencia explícito).

**Medición (`pnpm perf`):** "Movs 1er lote" baja de 24,6 / 33,0 / 47,6 ms (línea base PERF.1, a 1.000 / 5.000 / 10.000 gastos) a **~8,2 ms planos**: deja de crecer con el volumen porque los 50 formatters por lote eran el residuo documentado en PERF.1. Las demás columnas no se mueven (Inicio frío 93,5 vs 97,4 previo, Análisis frío 10,5 vs 11,1: dentro del ruido; `stringify`/`save` iguales).

**Validación:** 2257/2257 unit (5 nuevos en `tests/unit/utils.test.js`: `formateadorFecha` reutiliza instancia por firma, distingue firmas, su `format()` coincide con `toLocaleDateString`, y `fechaLegible` no cambió su salida) + 155/155 E2E en Chromium real + `pnpm perf`. SW v336 → v337. Quedan PERF.7b (folding de `calcularEstadoRenta`/`hayResumen` al memo) y PERF.7c (warm-up en idle).

| Archivo | Cambio |
|---|---|
| `modules/infra/utils.js` | `formateadorFecha()` nuevo (caché de `Intl.DateTimeFormat` por firma); `fechaLegible` lo usa. |
| `modules/dominio/movimientos/view.js` | `_mesAnioLabel()` usa `formateadorFecha` en vez de `toLocaleDateString`. |
| `modules/dominio/tesoreria/views/ingresos.js` | `fechaCorta()` usa `formateadorFecha`. |
| `tests/unit/utils.test.js` | 5 tests nuevos (`formateadorFecha` + equivalencia de `fechaLegible`). |
| `scripts/perf/BASELINE.md` | Sección PERF.7a (antes/después de "Movs 1er lote"). |
| `docs/BOARD.md` | PERF.6/7/8 registradas; PERF.7a cerrada; PERF.7b y PERF.7c abiertas. |
| `service-worker.js` | v336 → v337. |

---

### feat(config): CFG.1a, situación laboral en el perfil (quita el SMMLV muerto) · 2026-07-06

Primera rebanada de la iniciativa **fusionada CFG.1 + CFG.2** ("Perfil fiscal/financiero en Ajustes"). Esteban eligió fusionar ambas tarjetas del BOARD porque la situación laboral (CFG.1) alimenta la interpretación del monitor de renta (CFG.2).

**Análisis previo (regla 2.6, ficha nueva `docs/contexto/configuracion.md`):** el encabezado de Ajustes mostraba nombre + un campo "SMMLV configurado" editable, pero rastreando `S.perfil.smmlv` en todo el código **ningún cálculo financiero lo lee** (toda la lógica usa la constante legal `SMMLV` de `constants.js`): era dato muerto que confundía sin hacer nada. Criba de las 8 preguntas de perfil que propuso Esteban contra el criterio "no pedir datos innecesarios": solo **situación laboral** tiene consumidor real hoy y no es derivable; tipo de ingresos y frecuencia ya viven en `S.ingresos`; el resto (personas a cargo, objetivos, conocimiento financiero, tolerancia al riesgo) no lo consume nada todavía y se aplaza hasta que exista la feature que lo use (evita llenar `localStorage` con datos inertes, coherente con PERF.4/ADR 030). Hallazgo adicional para las siguientes rebanadas: el monitor de renta (K.3, `calcularEstadoRenta` en Análisis) **ya hace gran parte de CFG.2**.

**CFG.1a:** se quitó el campo SMMLV del encabezado (`_renderPerfil`) y se agregó un selector de **situación laboral** (`SITUACIONES_LABORALES`: empleado, independiente, pensionado, mixto, otro; vacío = "sin especificar"), persistida en `perfil.situacionLaboral` (schema v24 → v25, migración idempotente que arranca a los usuarios existentes en ''). El handler de `#form-perfil` valida contra el catálogo (nunca guarda un valor libre). `perfil.smmlv` se conserva en el estado (marcado `@deprecated`) por compatibilidad con datos y seeds existentes; solo deja de mostrarse y editarse.

**Validación:** 2252/2252 unit (9 nuevos: 5 de render en `tests/unit/config.test.js` nuevo, 4 de migración v25 en `storage.test.js`; `state.test.js` actualizado a la forma nueva de `perfil`, que ahora incluye `situacionLaboral`) + 155/155 E2E en Chromium real (2 nuevos en `smoke.test.js`: el encabezado del perfil ya no muestra el SMMLV; guardar la situación laboral la refleja en el resumen, la conserva en el selector y la persiste en `localStorage`). El E2E verifica la persistencia leyendo `localStorage` en vez de recargar, porque el `addInitScript` de `saltearOnboarding` resiembra `fk_v1` en cada carga. SW v335 → v336.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `SITUACIONES_LABORALES` (catálogo de 5 situaciones, ids estables). |
| `modules/core/state.js` | `perfil.situacionLaboral` nuevo; `perfil.smmlv` marcado `@deprecated`. |
| `modules/core/storage.js` | `SCHEMA_VERSION` 24 → 25; migración v24 → v25 (situación laboral por defecto '', repone perfil corrupto). |
| `modules/dominio/config/view.js` | `_renderPerfil` quita el SMMLV muerto y agrega el selector de situación laboral (resumen + `<select>`). |
| `modules/dominio/config/index.js` | Handler de `#form-perfil` guarda la situación laboral validada contra el catálogo; ya no procesa el SMMLV. |
| `tests/unit/config.test.js` | Nuevo: 5 tests de render del perfil (SMMLV ausente, selector, preselección, id corrupto). |
| `tests/unit/storage.test.js` | 4 tests de la migración v24 → v25. |
| `tests/unit/state.test.js` | Forma de `perfil` actualizada a `{ nombre, smmlv, situacionLaboral }`. |
| `tests/e2e/smoke.test.js` | 2 tests E2E del perfil (situación laboral se guarda, refleja y persiste). |
| `docs/contexto/configuracion.md` | Ficha nueva (primer análisis a fondo de la sección Ajustes). |
| `docs/contexto/README.md` | Fila de Configuración pasa de "sin crear" a "activa". |
| `docs/BOARD.md` | CFG.1 + CFG.2 fusionadas; CFG.1a cerrada; CFG.2a y CFG.2b como subtareas pendientes. |
| `service-worker.js` | v335 → v336. |

---

### feat(agenda): CAL.2, leyenda del calendario dinámica · 2026-07-06

Primera tarea trabajada sobre la sección Calendario bajo la metodología de fichas de contexto (regla 2.6 de CLAUDE.md): no existía `docs/contexto/calendario.md`, así que el análisis a fondo del dominio `agenda` (piezas, relaciones, riesgos) quedó documentado en la ficha nueva antes de codificar.

La leyenda bajo el calendario mostraba siempre las 4 entradas posibles (día de ingreso, gasto fijo, deuda con entidad, deuda personal) aunque el usuario no tuviera registros de varias de ellas en el mes visible, ocupando espacio sin aportar información útil.

**Solución:** `tiposPresentesEnMes()` (nuevo, `agenda/logic.js`, función pura sin DOM ni `S`): recorre el mapa de eventos ya calculado del mes (el mismo que usa el grid de días) y devuelve solo los tipos que realmente aparecen, en el orden canónico de la leyenda. `_renderLeyenda()` (`agenda/view.js`) pasó a recibir ese mapa de eventos en vez de no recibir nada, y renderiza únicamente las entradas presentes; si ningún tipo aparece este mes (sin compromisos ni ingresos), la función devuelve `''` y no se dibuja el contenedor. Color, ícono y nomenclatura de cada tipo se conservan exactamente iguales (`cal-dot--*`, la misma paleta que ya usan los puntos del calendario): esta tarea solo decide qué entradas mostrar, no cómo se ven, cumpliendo el pedido explícito de no inventar una presentación nueva.

**Validación:** 2243/2243 unit (10 nuevos en `tests/unit/agenda.test.js`: `tiposPresentesEnMes` con input inválido, vacío, un tipo, los cuatro tipos, sin duplicados, tipo faltante tratado como "fijo", y coincidencia con `eventosDelMes` real; más render dinámico de la leyenda con 0, 1 y varios tipos presentes) + 153/153 E2E en Chromium real (2 nuevos/reescritos en `smoke.test.js`: sin compromisos ni ingresos no dibuja la leyenda; con los tres tipos de compromiso presentes los muestra a los tres). Dos tests preexistentes que asumían la leyenda estática (con estado vacío esperaban ver "Gasto fijo"/"Deuda entidad"/"Deuda personal") se corrigieron para sembrar los tipos que ahora necesitan estar presentes para aparecer, reflejando el comportamiento nuevo. SW v334 → v335.

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/logic.js` | `tiposPresentesEnMes()` nuevo: filtra el orden canónico de tipos contra los presentes en el mapa de eventos del mes. |
| `modules/dominio/agenda/view.js` | `_renderLeyenda(eventos)` ahora recibe el mapa de eventos y filtra dinámicamente; `_LABEL_LEYENDA` nuevo (etiquetas por tipo, mismo copy que antes). |
| `tests/unit/agenda.test.js` | 10 tests nuevos (`tiposPresentesEnMes` + render dinámico); 2 tests existentes de la leyenda corregidos al comportamiento dinámico. |
| `tests/e2e/smoke.test.js` | 2 tests nuevos/reescritos de la leyenda dinámica (suite dedicada con seed propio, evita el problema de navegar dos veces al mismo hash sin recargar el SPA). |
| `docs/contexto/calendario.md` | Ficha nueva (primer análisis a fondo del dominio `agenda`, regla 2.6). |
| `docs/contexto/README.md` | Fila de Calendario pasa de "sin crear" a "activa". |
| `docs/BOARD.md` | CAL.2 cerrada. |
| `service-worker.js` | v334 → v335. |

---

### perf(analisis): PERF.3, diferir el cómputo del grupo colapsado de Análisis · 2026-07-06

Cierre de la auditoría de rendimiento (solo queda **PERF.5**/IndexedDB, diferida por el ADR 030). El grupo colapsable "Más detalle de tus gastos" de Análisis (un `<details>` cerrado por defecto) calculaba `calcularComparacionCategorias()` (recorre el mes actual y el anterior de `S.gastos`) y `detectarPatronGastoSemanal()` (recorre 90 días) en **cada** `renderAnalisis()`, aunque el usuario nunca lo abriera. Con PERF.2 esas dos derivaciones vivían dentro del bundle memoizado `_calcularDatosAnalisis()`, así que se recalculaban en cada `state:change` genuino de las secciones observadas mientras la pantalla estaba abierta.

**Solución:** se sacaron esas dos derivaciones del bundle principal a `_calcularDetalleGastos()` (nuevo, memoizado con `['gastos']`) y se **difirió su render al evento `toggle`** del `<details>`. `renderAnalisis()` dibuja el grupo con el cuerpo vacío; la primera vez que el usuario lo abre, un listener calcula y pinta el cuerpo (comparación + patrón semanal + hormigas) y marca `data-cargado` para no recomputar. Las hormigas **no** se difirieron: ya vienen dentro de `generarResumen()`, que el resto del panel (score, patrimonio) necesita igual, así que rendirlas es gratis.

**Cómo se preserva el comportamiento exacto:** la visibilidad del grupo se decide barato, sin pagar el cómputo caro en el caso común. Con gasto este mes (`resumen.gastoMes > 0`, dato que ya trae el resumen) la comparación **siempre** tiene contenido (invariante: `totalGastosMes > 0` implica al menos una categoría con gasto, y `calcularComparacionCategorias` no devuelve vacío en ese caso), así que basta ese chequeo para mostrar el grupo y diferir su cuerpo. Sin gasto este mes (caso menos común: inicio de mes, o usuario que dejó de registrar) se calcula el detalle en el mismo render para no dibujar un grupo que resultaría vacío, ya que la comparación con el mes anterior ("desapareció") o el patrón de los últimos 90 días podrían seguir teniendo datos. Cada `renderAnalisis()` reescribe `innerHTML` (comportamiento previo), así que el `<details>` se recrea y el listener se re-asocia al nodo nuevo, sin duplicados.

**Validación:** 2233/2233 unit (5 nuevos en `tests/unit/analisis.test.js`: grupo mostrado con cuerpo diferido, llenado al primer `toggle`, ruta ansiosa sin gasto del mes, grupo oculto sin datos, y re-diferido en cada render) + 151/151 E2E verdes en Chromium real (Playwright). Medido con `pnpm perf`: Análisis frío baja de ~9,7/16,3 ms a ~7,4/11,1 ms (mediana, 5.000/10.000 gastos), sin regresión en la ruta caché (~3,5-4,4 ms, plana) ni en las demás columnas. SW v333 → v334.

| Archivo | Cambio |
|---|---|
| `modules/dominio/analisis/view.js` | `_calcularDetalleGastos()`/`_calcularDetalleGastosMemo`/`_renderDetalleGastos()` nuevos; `renderAnalisis()` difiere el cuerpo del grupo al `toggle`; `_renderGrupoColapsable()` reemplazado por `_renderGrupoDetalle()`. |
| `tests/unit/analisis.test.js` | 5 tests nuevos del grupo de detalle diferido. |
| `scripts/perf/BASELINE.md` | Sección PERF.3 (antes/después de la columna Análisis frío). |
| `docs/contexto/analisis.md` | Ficha actualizada (piezas nuevas, riesgo del diferido, cambio realizado). |
| `docs/BOARD.md` | PERF.3 cerrada; nota de la iniciativa actualizada. |
| `service-worker.js` | v333 → v334. |

---

### perf(storage): PERF.4, ADR 030 persistencia: salvaguarda de cuota + diferir el rewrite · 2026-07-06

Cierre de la auditoría de rendimiento. PERF.4 se había planteado como "partir la persistencia por colección", pero el análisis con el harness PERF.0 mostró que **el costo de guardar es bajo**: `save()` está debounced 200 ms y `JSON.stringify(S)` son ~5 ms de mediana a 10.000 gastos (la escritura a disco real de un móvil no la mide happy-dom, así que queda estimada). El cuello no es la CPU: es el **techo de cuota de `localStorage` (~5 MB por origen)**, que es un riesgo de **pérdida de datos** a largo plazo, no de lentitud.

Decisión (delegada por Esteban), formalizada en el [ADR 030](DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md): **no reescribir la capa de persistencia** (sería el cambio de mayor riesgo del proyecto: `loadData()` pasaría a asíncrono → bootstrap async, más una migración de años de datos reales sin pérdida, más reescribir el sembrado de las 11 suites E2E que dependen de escribir la clave `fk_v1`, todo para ahorrar ~5 ms debounced). En su lugar se pone una salvaguarda barata sobre el riesgo real y se deja **IndexedDB** documentado como dirección futura con disparadores concretos (ADR 030 D4). Se **rechaza explícitamente** partir `localStorage` por clave: no sube la cuota (todas las claves comparten el límite por origen), solo suma complejidad. La regla 3 del ADN se **reafirma**, no se cambia.

**Salvaguarda implementada (ADR 030 D2), dos partes:**

1. **El guardado que falla deja de morir en silencio.** Antes, si `localStorage` estaba lleno, `_flush()` atrapaba el `QuotaExceededError` con solo un `console.error` y el usuario perdía el cambio sin enterarse. Ahora marca `_falloUltimoGuardado`, emite `storage:error`, y `config/` lo anuncia (a11y assertive) más un aviso persistente en la sección "💾 Tus datos" con CTA "Exportar respaldo".
2. **Aviso anticipado.** `evaluarCuota()` y `estadoCuota()` (funciones puras en `core/storage.js`) clasifican el uso contra un límite conservador (`LIMITE_LOCALSTORAGE_CHARS` = 4.5 M chars, con margen porque la contabilidad exacta varía por navegador): `aviso` ≥ 80 %, `critico` ≥ 95 %. Al **cruzar de nivel** (no en cada guardado) se emite `storage:cuota` y Ajustes muestra el aviso. En operación normal, `_renderAvisoAlmacenamiento()` devuelve string vacío: no se ve nada.

**Validación:** 2228/2228 unit (9 nuevos en `storage.test.js`: umbrales de `evaluarCuota`, `estadoCuota` reflejando el tamaño de S, y el guardado fallido emitiendo `storage:error` en vez de morir en silencio, simulando el cupo lleno con `vi.stubGlobal` porque happy-dom no expone `setItem` de forma espiable) + 151/151 E2E verdes en Chromium real (Playwright). SW v332 → v333.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md` | Nuevo: ADR de la decisión (diferir rewrite, salvaguarda de cuota, IndexedDB como futuro con disparadores). |
| `modules/core/storage.js` | `evaluarCuota()`, `estadoCuota()`, `LIMITE_LOCALSTORAGE_CHARS`; `_flush()` marca fallo y emite `storage:error`/`storage:cuota` en vez de solo loguear; single-serialize. |
| `modules/dominio/config/view.js` | `_renderAvisoAlmacenamiento()` en "💾 Tus datos" (aviso con CTA a exportar; vacío en operación normal). |
| `modules/dominio/config/index.js` | Escucha `storage:error`/`storage:cuota`: anuncia (assertive) y re-renderiza el panel de Config. |
| `tests/unit/storage.test.js` | 9 tests nuevos del monitor de cuota. |
| `docs/BOARD.md` | PERF.4 cerrada; **PERF.5** (migración a IndexedDB) documentada como diferida con disparadores del ADR 030. |
| `service-worker.js` | v332 → v333. |

---

### perf(rendimiento): PERF.2, memoizar derivaciones pesadas de Inicio y Análisis · 2026-07-06

Continuación de la auditoría de rendimiento (PERF.0/PERF.1). El harness `pnpm perf` confirmó el segundo cuello real: `resumenSemanal()`, `movimientosRecientes()`/`movimientosCompletos()` (Inicio) y el bundle de `renderAnalisis()` (~7 llamadas de primer nivel, cada una con sub-barridos propios: `serieGastosMensual` recorre 12 meses llamando `totalGastosMes` cada uno, `calcularComparacionCategorias` recorre el mes actual y el anterior, `detectarPatronGastoSemanal` recorre 90 días) recalculaban sobre todo el historial en cada `state:change` relevante, **incluso en re-renders redundantes**: `renderAll()` repintando el dashboard sin que esos datos hubieran cambiado, o dos listeners reaccionando a una misma acción del usuario (ej. editar un gasto-abono dispara `state:change` para `gastos` y para `compromisos` por separado, cada uno con su propio recálculo completo).

**Solución:** `modules/infra/memo.js` (nuevo), con `memoizar()`: caché de 1 entrada que invalida contra dos señales, cualquiera de las dos basta para forzar el recálculo (nunca se sirve un resultado dudoso): identidad de referencia de los argumentos (cubre el caso de tests que reasignan `S.gastos = [...]` directo, sin pasar por `EventBus`) y un contador de revisión por sección, alimentado por el propio `EventBus` (`state:change`), que ya es la señal canónica de mutación en toda la app. Sin Proxies ni observers sobre `S` (ADN 4). Aplicado a `resumenSemanal()`, a `movimientosRecientes()`/`movimientosCompletos()` (con un `extraerClave` propio, porque esas dos funciones reciben un objeto envoltorio nuevo en cada llamada: `extraerClave` compara los arrays de adentro, no el envoltorio) y al bundle consolidado `_calcularDatosAnalisis()` (nuevo en `analisis/view.js`, junta las ~7 llamadas de `renderAnalisis()` en una sola unidad memoizable). Ninguna función deja de escribir el DOM en cada render: el cacheo es solo de cómputo, nunca de pintado, así que el HTML resultante es idéntico con o sin cache hit.

**Riesgo de medición evitado y documentado:** el harness original medía llamando a la misma función N veces sin cambiar `S` entre medidas; tras esta fase eso convierte casi todas las repeticiones en cache hits, midiendo un escenario real (re-render redundante) pero no el costo de un recálculo genuino. `bench.perf.js` ahora separa ambos: "frío" (`invalidar()` fuerza un `state:change` antes de cada muestra, cache miss garantizado) y "caché" (sin invalidar). En frío, el costo no cambia respecto a la línea base de PERF.0/PERF.1 (sin regresión); en caché, Inicio pasa de 4,3-97,4 ms a 2,2-16,9 ms (1.000 a 10.000 gastos) y Análisis de 4,3-16,3 ms a 2,9-4,6 ms **planos**, ya no crece con el volumen de historial.

Primer análisis a fondo del dominio Análisis documentado en `docs/contexto/analisis.md` (ficha nueva, regla 2.6): dónde vive cada pieza, riesgos conocidos (`_renderEstadoRenta()` queda fuera del bundle memoizado a propósito, es un solo barrido).

**Validación:** 2219/2219 unit (10 tests nuevos en `tests/unit/memo.test.js`: cache hit/miss por referencia, por sección observada/no observada, `extraerClave` con envoltorio) + 151/151 E2E verdes en Chromium real (Playwright). SW v331 → v332.

| Archivo | Cambio |
|---|---|
| `modules/infra/memo.js` | Nuevo: `memoizar()`, caché de 1 entrada por identidad de referencia + revisión de sección. |
| `modules/dominio/resumen/view.js` | `resumenSemanal()` envuelta en `_resumenSemanalMemo`. |
| `modules/dominio/movimientos/view.js` | `movimientosRecientes()`/`movimientosCompletos()` envueltas con `_extraerFuentes` propio. |
| `modules/dominio/analisis/view.js` | `_calcularDatosAnalisis()` nuevo (consolida 7 llamadas en 1), envuelto en `_calcularDatosAnalisisMemo`. |
| `scripts/perf/bench.perf.js` | Medición "frío"/"caché" separada (`invalidar()`, `antesDeCadaMuestra`) para no confundir cache hits del harness con una mejora real. |
| `tests/unit/memo.test.js` | Nuevo: 10 tests del helper de memoización. |
| `docs/contexto/analisis.md` | Nuevo: primer análisis a fondo del dominio Análisis. |
| `docs/contexto/inicio.md`, `docs/contexto/README.md` | Bloques de Inicio/Movimientos/Resumen actualizados; índice de fichas. |
| `docs/HANDOFF.md` | PERF.2 al tope de "últimas 5". |
| `service-worker.js` | `infra/memo.js` agregado a `CORE_ASSETS`; v331 → v332. |

---

### perf(movimientos): PERF.1, paginar por lotes la vista completa de Movimientos · 2026-07-06

Esteban pidió una auditoría de rendimiento completa (temor: que la app se vuelva lenta con años de datos, y que un cambio en una sección recalcule toda la app). **PERF.0** construyó primero el harness de medición: `pnpm perf` (`scripts/perf/seed.js` genera un estado determinista de hasta 10.000 gastos con un PRNG de semilla fija; `scripts/perf/bench.perf.js` mide en happy-dom el costo de los widgets de Inicio, Análisis, Movimientos y la persistencia; corre fuera de `pnpm test` vía `vitest.perf.config.js`). La auditoría en sí confirmó que el temor central estaba mayormente resuelto: `renderSmart()` ya corta el render por sección (hash-gate), así que editar un gasto no recalcula Metas/Inversiones/Análisis. El cuello real medido: la vista completa de Movimientos (`#movimientos`) construía **todos** los nodos del historial de una sola vez, ~3,9 s con 10 años de datos simulados.

**PERF.1** resolvió ese cuello con windowing. `renderMovimientosCompletos()` pinta un primer lote de 50 movimientos (los divisores de mes no restan cupo al conteo, para que un mes con pocos registros no reduzca el tamaño efectivo del lote) y agrega el resto bajo demanda con `cargarMasMovimientos()` (nuevo, exportado), disparada por un botón accesible `data-action="movimientos-cargar-mas"` ("Cargar más movimientos", 100% operable por teclado/lector de pantalla) y, como mejora progresiva, por un `IntersectionObserver` sobre ese mismo botón (se descarta y recrea en cada lote; nunca hay más de uno vivo). El panel compacto de Inicio (`renderActividadReciente()`, límite fijo de 5) no cambia.

**Resultado medido:** primer lote de 327,8 ms → 24,6 ms (1.000 gastos), 1.752,9 ms → 33,0 ms (5.000) y 3.875,2 ms → 47,6 ms (10.000): hasta **81x** más rápido, y el tamaño del primer lote queda plano en 50 nodos sin importar cuánto historial exista (antes crecía 1:1 con él). Nota honesta: el primer lote aún crece un poco con N porque `movimientosCompletos()` sigue derivando y ordenando todo el historial antes de paginar (el corte de PERF.1 es solo de construcción de DOM); ese residuo queda para una fase de memoización futura, sin tarjeta todavía.

**Riesgo de medición encontrado y documentado:** el primer diseño del harness intentaba recorrer todos los lotes en un loop apretado para medir el costo "cargar todo"; eso creaba cientos de `IntersectionObserver` en segundos y saturaba la heap de happy-dom (`FATAL ERROR: JavaScript heap out of memory`, worker crash). Es un artefacto del entorno de test (en la app real nunca hay más de un observer vivo a la vez), no un bug de producción; el harness se ajustó para medir el costo de un lote adicional de forma aislada.

**Validación:** 2209/2209 unit (8 tests nuevos de paginación en `movimientos.test.js`: primer lote acotado a 50, control "Cargar más" aparece/desaparece según haya historial pendiente, `cargarMasMovimientos()` no duplica ítems ni repite divisores de mes al cortar a mitad de mes, reiniciar el render no acumula lotes viejos) + 151/151 E2E verdes en Chromium real (Playwright). SW v330 → v331.

| Archivo | Cambio |
|---|---|
| `scripts/perf/seed.js` | Nuevo: generador determinista de un `S` grande y realista (10 años de gastos, ingresos puntuales, aportes, compromisos, metas, apartados, inversiones). |
| `scripts/perf/bench.perf.js` | Nuevo: harness de medición de hot paths (Inicio, Análisis, Movimientos, `JSON.stringify(S)`, `save()` real). |
| `scripts/perf/BASELINE.md` | Nuevo: línea base PERF.0 + resultado de PERF.1, artefacto de referencia para las próximas fases. |
| `vitest.perf.config.js` | Nuevo: config dedicada de Vitest para `pnpm perf`, no incluida en `pnpm test`. |
| `package.json` | Script `perf` nuevo. |
| `modules/dominio/movimientos/view.js` | `renderMovimientosCompletos()` paginado por lotes; `cargarMasMovimientos()`, `_agregarSiguienteLote()`, `_aplanarEntradas()`, `_renderControlCargarMas()`, `_observarControlCargarMas()` nuevos. |
| `modules/dominio/movimientos/index.js` | Acción `movimientos-cargar-mas` registrada vía `registrarAccion()`. |
| `styles/components/domain.css` | Bloque `.movimientos-cargar-mas` (control centrado). |
| `tests/unit/movimientos.test.js` | 8 tests nuevos de paginación. |
| `docs/contexto/inicio.md` | Bloque de Movimientos actualizado; nueva entrada de "Cambios realizados". |
| `docs/HANDOFF.md` | PERF.1 al tope de "últimas 5"; `pnpm perf` en comandos rápidos. |
| `service-worker.js` | v330 → v331. |

---

### refactor(gastos): IN.5, eliminar "Gasto rápido" y el subsistema de pendientes · 2026-07-06

Con TX.9 completa, el formulario completo de gasto registra en pocos toques (categoría + monto, con fecha y cuenta pre-rellenadas). "Gasto rápido" (anotar solo el monto y completar la categoría después) dejó de aportar valor sobre eso: mantener dos flujos para lo mismo solo sumaba complejidad, más una cola de "pendientes por organizar" que el usuario debía volver a completar. Esteban decidió eliminarlo. Se retiró la feature completa y todo su subsistema dependiente, verificando primero que ningún otro flujo lo necesitara.

**Qué se eliminó.** El botón `.quick-add` del dashboard y el modal `#modal-gasto-rapido` (`index.html`); `renderFormGastoRapido()`, `renderPendientesOrganizar()` y el badge "📝 Pendiente" de `_renderGastoItem()` (`view.js`); `validarGastoRapido()`, `normalizarGastoRapido()`, `esGastoPendiente()`, `gastosPendientes()` (`logic.js`); los handlers `_inyectarFormGastoRapido`/`_abrirGastoRapido`/`_guardarGastoRapido`/`_toastGastoRapido`/`_fmtMonto` y la acción `gasto-rapido` (`index.js`); el contenedor `#panel-gastos-pendientes` del bento; los estilos `.quick-add*` y `.quick-toast*` (`forms.css`, keyframes `toastIn/toastOut` conservadas porque las usa el toast de logros).

**Efecto en cadena.** El flag `pendienteCompletar` tenía un único lector (`esGastoPendiente`), ahora eliminado; se dejó de escribir en los 4 dominios que lo ponían (`gastos/logic.js`, `agenda/index.js`, `compromisos/index.js`, `tesoreria/acciones/distribucion.js`). El dato legacy que quede en `localStorage` (gastos viejos con `pendienteCompletar`) simplemente se ignora: no requiere migración porque nada lo lee. Al desaparecer el panel `#panel-gastos-pendientes` que acompañaba al hero, el hero del dashboard pasa a ancho completo (`bento__cell--full`) y se retiró la regla `:has()` que antes lo expandía condicionalmente (`layout.css`).

**Validación.** 2201/2201 unit (25 tests del subsistema retirados de `gastos.test.js`) + 151/151 E2E; el test de reflow a 320px se repuntó del modal de gasto rápido (eliminado) al de ingreso puntual, que también usa `.input--big-amount`. El preview de este entorno funcionó esta vez: se verificó en la app el dashboard con el hero a ancho completo (sin la card ni huecos), la lista de Gastos sin badge, y cero errores en consola. SW v329 → v330.

| Archivo | Cambio |
|---|---|
| `index.html` | Quita el botón `.quick-add`, el modal `#modal-gasto-rapido` y `#panel-gastos-pendientes`; hero a `bento__cell--full`. |
| `modules/dominio/gastos/view.js` | Quita `renderFormGastoRapido`, `renderPendientesOrganizar`, el badge "📝 Pendiente" y el tip del empty state. |
| `modules/dominio/gastos/logic.js` | Quita `validarGastoRapido`, `normalizarGastoRapido`, `esGastoPendiente`, `gastosPendientes`; `normalizarGasto` deja de escribir `pendienteCompletar`. |
| `modules/dominio/gastos/index.js` | Quita los handlers de gasto rápido, la acción `gasto-rapido` y el render de pendientes; título de edición fijo ("Editar gasto"). |
| `modules/dominio/agenda/index.js`, `modules/dominio/compromisos/index.js`, `modules/dominio/tesoreria/acciones/distribucion.js` | Dejan de escribir `pendienteCompletar: false` al crear gastos. |
| `styles/components/forms.css` | Quita `.quick-add*` y `.quick-toast*`; el chevron sale de la regla de `--fk-icon-sm`. |
| `styles/layout.css` | Quita `#panel-gastos-pendientes` y la regla `:has()` del hero. |
| `styles/components.css`, `docs/DESIGN_SYSTEM.md` | Referencias a `.quick-add`/chevron retiradas. |
| `tests/unit/gastos.test.js` | 25 tests del subsistema retirados. |
| `tests/e2e/reflow-320.test.js` | Reflow repunteado al modal de ingreso puntual. |
| `docs/contexto/gastos.md`, `docs/contexto/inicio.md`, `docs/BOARD.md` | IN.5 cerrada; fichas y tablero actualizados. |
| `service-worker.js` | v329 → v330. |

---

### feat(ux): CTA unificado "necesitas una cuenta" lleva directo a crear la cuenta · 2026-07-06

Reporte de Esteban sobre el onboarding: un usuario nuevo que pulsa el botón (+) → "Nuevo ingreso" sin haber creado ninguna cuenta veía el mensaje "Primero necesitas una cuenta", pero el botón "Entendido" solo cerraba el modal y lo dejaba buscando por su cuenta dónde crear la cuenta. Rompía la continuidad del onboarding. Se unificó el patrón de **todos** los bloqueos por "falta una cuenta" bajo un criterio único de UX: si falta un requisito, la app guía a resolverlo, no solo lo informa.

Nueva acción reutilizable `ir-a-crear-cuenta` en `ui/actions.js`: cierra el modal actual, navega a Mis cuentas y emite `EventBus 'cuenta:crear'`. Tesorería lo escucha en `initAccionesCuentas()` (`EventBus.on('cuenta:crear', _nuevaCuenta)`) y abre el formulario de nueva cuenta. El shell no importa el dominio y `infra/cuenta-helper.js` emite el mismo evento tras navegar, sin invertir el layering infra→ui (ADN 10, comunicación por EventBus). Un solo copy, "Crear una cuenta", en los cinco puntos de entrada.

Diagnóstico de la inconsistencia previa: cada surface hacía algo distinto. El **Nuevo ingreso** (`renderFormIngresoPuntual`) usaba `data-action="modal-close"` sobre un `<a href="#tesoreria">`, y como `dispatch()` hace `preventDefault()` para toda `data-action`, el href nunca navegaba: solo cerraba el modal (el bug reportado). Los dos empty states de **Gastos** ya usaban `ir-a-seccion` (navegaban, pero sin abrir el formulario). El **Abono a deuda** (`renderFormAbono`) era un callejón sin salida: solo un botón "Cerrar". El modal guiado `_mostrarGuiadoCero` de `cuenta-helper.js` (que heredan todos los flujos de un clic: Marcar pagado, confirmar gasto multi-cuenta, aportar a meta/apartado) navegaba pero tampoco abría el formulario.

**Validación:** 2226/2226 unit (2 nuevos en `tesoreria.test.js`: el empty state del ingreso puntual expone el CTA `ir-a-crear-cuenta` y ya no `modal-close`/"Entendido"; el evento `cuenta:crear` abre `#modal-cuenta` en modo creación) + 151/151 E2E en navegador real a viewport móvil (2 nuevos en `registrar-sheet.test.js`: registro de ingreso y de gasto sin cuentas → el CTA cierra el modal, navega a `#tesoreria` y abre el form de nueva cuenta con título "Nueva cuenta"). `gastos.test.js` y `compromisos.test.js` actualizados al copy/acción nuevos. Preview de este entorno no disponible (mismo problema recurrente); cubierto por los E2E. SW v328 → v329.

| Archivo | Cambio |
|---|---|
| `modules/ui/actions.js` | Acción `ir-a-crear-cuenta` (cierra modal + `navigate('tesoreria')` + `EventBus.emit('cuenta:crear')`); import de `EventBus`. |
| `modules/dominio/tesoreria/acciones/cuentas.js` | `EventBus.on('cuenta:crear', _nuevaCuenta)` en `initAccionesCuentas()`; import de `EventBus`. |
| `modules/infra/cuenta-helper.js` | `_mostrarGuiadoCero`: botón "Crear una cuenta" que emite `cuenta:crear` tras navegar; import de `EventBus`. |
| `modules/dominio/tesoreria/views/ingresos.js` | Empty state: CTA `ir-a-crear-cuenta` "Crear una cuenta" (era `modal-close` "Entendido", el bug). |
| `modules/dominio/gastos/view.js` | Empty states de Gasto rápido y Gasto completo: CTA `ir-a-crear-cuenta` "Crear una cuenta" (eran `ir-a-seccion`). |
| `modules/dominio/compromisos/views/formularios.js` | Empty state de Abono: agrega CTA "Crear una cuenta" junto a "Ahora no" (era solo "Cerrar"). |
| `tests/unit/tesoreria.test.js` | 2 tests nuevos. |
| `tests/unit/gastos.test.js`, `tests/unit/compromisos.test.js` | Aserciones actualizadas al copy/acción nuevos. |
| `tests/e2e/registrar-sheet.test.js` | 2 tests E2E nuevos (registro sin cuentas). |
| `docs/contexto/transversal.md` | Bloque nuevo del patrón CTA "necesitas una cuenta". |
| `service-worker.js` | v328 → v329. |

---

### feat(gastos): TX.9b, categorías personalizadas · 2026-07-05

Segunda y última fase de TX.9 (brief de Esteban: categoría primero, categorías personalizadas, sin descripción redundante). Al elegir "+ Otra categoría" en el select del formulario de gasto, se revela un campo de nombre y una grilla de íconos, en el mismo formulario (sin modal anidado, reusando el patrón ya establecido de `hint-categoria-fija`).

`ICONOS_CATEGORIA_PERSONALIZADA` (29 entradas, `constants.js`) cura los símbolos `c-*` del sprite que ya existían pero no estaban asignados a ninguna categoría nativa en `CATEGORIA_ICONO`: se descubrió que el sprite tiene 43 símbolos `c-*` en total, repartidos entre 7 catálogos distintos (gastos, ingresos, agenda, deuda, deuda personal, deuda-personal-relación, metas), de los cuales solo ~18 estaban en uso dentro del catálogo de Gastos. Los 29 restantes son exactamente el pool que hacía falta, sin trabajo de diseño nuevo. Cada entrada trae una etiqueta en español (ej. "Gimnasio" para `c-pesa`) para el `aria-label` del botón.

`validarCategoriaPersonalizada({ nombre, icono }, existentes)` exige nombre no vacío, sin duplicar (insensible a mayúsculas y tildes, vía `.normalize('NFD')` + `\p{Diacritic}`) ninguna categoría nativa de `CATEGORIAS_GASTO` ni una personalizada ya creada, más un ícono elegido del catálogo curado. Al enviar el formulario, la categoría se persiste primero (`guardar('categoriasPersonalizadas', { nombre, icono })`, bump de schema v23 → v24, migración idempotente) y su nombre pasa a ser la `categoria` del gasto: en usos futuros aparece como una opción normal del select, bajo `<optgroup label="Tus categorías">`, indistinguible de una nativa para el resto de la app.

`iconoDeCategoriaGasto(categoria, personalizadas)` (nuevo, en `core/constants.js` en vez de `gastos/logic.js`, para que `movimientos/logic.js` también pueda importarlo sin violar ADN 10 "ningún dominio importa a otro") resuelve nativa primero, personalizada después, y el genérico `i-gastos` como último recurso. Se usa tanto en `_renderGastoItem()` (lista de Gastos) como en `movimientosDesdeGastos()` (Movimientos, TX.8): una categoría personalizada muestra su ícono correcto en ambos lugares, no solo donde se creó.

Encontrado durante el desarrollo: el primer intento de `validarCategoriaPersonalizada()` solo comparaba en minúsculas (`toLocaleLowerCase()`), sin la insensibilidad a tildes que el propio docstring ya prometía; un test escrito con una tilde de más ("mercadó" vs "Mercado") lo detectó antes de cerrar la tarea. Se corrigió agregando `.normalize('NFD').replace(/\p{Diacritic}/gu, '')` a la comparación.

**Validación:** 2224/2224 unit (32 tests nuevos: `constants.test.js` verifica que el catálogo curado no repite ningún ícono ya usado en `CATEGORIA_ICONO` y que cada uno existe en el sprite; `gastos.test.js` cubre validación y los elementos nuevos del formulario; `movimientos.test.js` cubre la resolución del ícono personalizado; `storage.test.js` cubre la migración v23→v24) + 149/149 E2E verdes en navegador real (Playwright), incluido 1 test nuevo de extremo a extremo: crear "Gimnasio" con ícono, verla en la lista, y reutilizarla en un segundo gasto sin que el select duplique la opción. Preview de este entorno no disponible (mismo problema recurrente).

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `ICONOS_CATEGORIA_PERSONALIZADA` (29 íconos curados), `iconoDeCategoriaGasto()`. |
| `modules/core/state.js` | `S.categoriasPersonalizadas` (default `[]`). |
| `modules/core/storage.js` | Migración v23 → v24; `SCHEMA_VERSION = 24`. |
| `modules/dominio/gastos/logic.js` | `validarCategoriaPersonalizada()` nuevo. |
| `modules/dominio/gastos/view.js` | `renderFormGasto()`: optgroup de personalizadas + opción "+ Otra categoría" + selector de ícono inline; `CATEGORIA_NUEVA_VALUE` exportado; `_renderGastoItem()` usa `iconoDeCategoriaGasto()`. |
| `modules/dominio/gastos/index.js` | Reveal/hide de los campos nuevos y click del selector de ícono en `_montarFormGasto()`; creación y persistencia de la categoría en `_guardarGasto()`. |
| `modules/dominio/movimientos/logic.js` | `movimientosDesdeGastos()` recibe `categoriasPersonalizadas` y usa `iconoDeCategoriaGasto()`. |
| `modules/dominio/movimientos/view.js` | Pasa `S.categoriasPersonalizadas` a `movimientosRecientes()`/`movimientosCompletos()`. |
| `styles/components/forms.css` | Bloque `.icono-picker*` (primer selector de ícono de la app). |
| `tests/unit/constants.test.js` | 8 tests nuevos (catálogo curado + resolver). |
| `tests/unit/gastos.test.js` | 15 tests nuevos (validación + formulario). |
| `tests/unit/movimientos.test.js` | 2 tests nuevos. |
| `tests/unit/storage.test.js` | 2 tests nuevos (migración v24). |
| `tests/e2e/smoke.test.js` | 1 test nuevo. |
| `docs/contexto/gastos.md` | TX.9 completa (9a + 9b) cerrada. |
| `docs/BOARD.md` | Tarjeta TX.9b cerrada y borrada. |
| `service-worker.js` | v327 → v328. |

---

### feat(gastos): TX.9a, categoría primero + descripción ya no obligatoria · 2026-07-05

Primera de dos fases de TX.9 (brief de Esteban sobre el formulario de gasto: categoría primero, categorías personalizadas, sin descripción redundante). Primer análisis a fondo de la sección Gastos, documentado en [`docs/contexto/gastos.md`](contexto/gastos.md) (regla 2.6 de `/CLAUDE.md`); la tarjeta original se dividió en **TX.9a** (esta) y **TX.9b** (categorías personalizadas, siguiente fase) por tocar reordenamiento de formulario, redefinición de una señal existente y un modelo de dato nuevo sin precedente en la misma tarjeta.

Categoría pasa a ser el primer campo de `renderFormGasto()` (antes el 4° de 5). El campo Descripción se quitó del formulario: la categoría es ahora el concepto principal del gasto, y `validarGasto()` ya no la exige. El campo **Nota** opcional que pedía el brief ya existía desde antes (agregado en una fase previa sin tarjeta propia); esta tarea no tuvo que crearlo, solo reordenar alrededor de él.

`normalizarGasto()` solo incluye la clave `descripcion` en el objeto devuelto si el caller la trae (ningún caller ya lo hace desde el formulario). Esto importa porque `editar()` hace un merge superficial vía `Object.assign`: si `normalizarGasto()` siempre incluyera `descripcion: ''`, cada edición de un gasto antiguo (aunque solo se cambiara el monto) borraría silenciosamente su descripción histórica.

El título del ítem en la lista de Gastos pasa a ser la categoría; una descripción legacy (de gastos registrados antes de este cambio) y la nota se muestran en el subtítulo, junto a la fecha. `esGastoPendiente()`, el criterio que alimenta el panel "Gastos por organizar" de Inicio, se redefinió de "sin descripción" a `pendienteCompletar === true && categoria === 'Otros'` (el valor que Gasto Rápido ya le pone por defecto cuando el usuario no elige categoría real): preserva exactamente la misma función sin depender de un campo que deja de ser obligatorio.

Durante la implementación se encontraron y corrigieron 2 bugs propios: el mensaje de confirmación de borrado y el anuncio de accesibilidad en `_eliminarGasto()` (`gastos/index.js`), y `movimientosDesdeGastos()` en Movimientos (deriva su descripción de la del gasto), leían `gasto.descripcion` sin fallback; con la descripción ahora opcional, ambos habrían mostrado literalmente "undefined" para cualquier gasto creado con el formulario nuevo. Ambos caen ahora a la categoría.

Fuera de alcance de esta fase (documentado explícitamente para no repetir el error de mezclar cards): categorías personalizadas (**TX.9b**) y cualquier detección nueva de gasto hormiga/fantasma, que es tema de **TX.10**, no de TX.9 (la categoría-primero solo abre la puerta, no implementa el motor).

**Validación:** 2198/2198 unit (tests de formulario reordenado, validación, `esGastoPendiente()`/`gastosPendientes()` con la nueva regla, título/subtítulo del ítem con descripción legacy y nota) + 148/148 E2E verdes en navegador real (Playwright); 4 tests de `smoke.test.js` (crear/editar/eliminar gasto) actualizados porque rellenaban un campo del formulario que ya no existe, y el de borrado ahora verifica explícitamente que el mensaje de confirmación no muestre "undefined". Preview de este entorno no disponible (mismo problema recurrente); verificado además con un flujo manual de creación completa (categoría, monto, cuenta, fecha, nota) y de Gasto Rápido (monto + cuenta, categoría 'Otros', badge Pendiente).

| Archivo | Cambio |
|---|---|
| `modules/dominio/gastos/view.js` | `renderFormGasto()` reordenado, sin campo descripción; `_renderGastoItem()` título = categoría, subtítulo con descripción legacy/nota; copy de `renderPendientesOrganizar()` actualizado. |
| `modules/dominio/gastos/logic.js` | `validarGasto()` sin la validación de descripción; `normalizarGasto()` omite `descripcion` si no viene; `esGastoPendiente()` redefinida. |
| `modules/dominio/gastos/index.js` | `_editarGasto()` sin pre-fill de descripción (el campo ya no existe); `_eliminarGasto()` con fallback a categoría; título del modal de edición usa `esGastoPendiente()`. |
| `modules/dominio/movimientos/logic.js` | `movimientosDesdeGastos()` con fallback de descripción a categoría. |
| `modules/core/state.js` | `Gasto.descripcion` documentado como opcional (`[descripcion]`). |
| `styles/components/forms.css` | `.list-item__placeholder` eliminada (sin consumidores tras el cambio de título). |
| `tests/unit/gastos.test.js` | Tests de `renderFormGasto()`, `validarGasto()`, `esGastoPendiente()`/`gastosPendientes()` y `renderListaGastos()` actualizados/nuevos. |
| `tests/unit/movimientos.test.js` | 1 test actualizado (fallback de descripción). |
| `tests/e2e/smoke.test.js` | 4 tests actualizados. |
| `docs/contexto/gastos.md` | Ficha nueva (primer análisis de la sección); TX.9a cerrada. |
| `docs/BOARD.md` | Tarjeta TX.9a cerrada y borrada; TX.9b es la siguiente fase. |

---

### feat(resumen): IN.4a, accesos rápidos personalizables en Inicio · 2026-07-05

Última fase de la iniciativa "Inicio como centro de control" del [ADR 028](DECISIONS/028-inicio-centro-de-control.md): fila de tiles bajo el hero de Inicio con 1 toque a secciones que hoy quedan detrás de "Más" (Mis cuentas, Deudas, Ahorros, Límites de gasto, Me deben, Análisis, Movimientos, Ajustes), más un botón "Personalizar" que abre un modal con la lista completa: tocar una fila la agrega o la quita, sin drag & drop (ADR 028 D2).

Bump de schema v23: `S.config.accesosInicio` (array ordenado de ids, migración idempotente v22 → v23). El default de 3 secciones no se eligió por preferencia personal (Esteban lo pidió explícitamente objetivo): se evaluaron las 8 candidatas por frecuencia real de autoconsulta y por si ya tienen presencia en Inicio hoy. Resultado: **Mis cuentas, Ahorros, Límites de gasto**, el mismo patrón que usan Mint/YNAB/Fintonic como pantalla principal (cuentas + presupuesto + metas); Deudas queda cubierta parcialmente por "Pendientes del mes", Análisis por el Resumen semanal, y Me deben/Ajustes/Movimientos son nicho o ya están a 1 tap por otra vía.

Dominio nuevo `modules/dominio/accesos/` (`logic.js` puro: `accesosVisibles()` resuelve ids contra el catálogo, `alternarAcceso()` agrega/quita de forma inmutable; `view.js`: `renderAccesosInicio()` y `renderModalPersonalizarAccesos()`; `index.js`: acciones `accesos-personalizar`/`accesos-toggle`). Reutilización máxima de componentes existentes: los tiles son `.menu-mas__item`/`__icon`/`__label` tal cual (mismo color por dominio que ya usa el menú "Más" vía `[data-section]`, cero CSS de color nuevo) y las filas del modal reusan `.list-item`/`tejaCategoria()` (mismo patrón que Movimientos/Gastos).

Bug propio detectado durante el desarrollo: el texto instructivo del modal usaba la clase `.confirm__mensaje`, que los tests E2E ya trataban como el identificador único del mensaje del modal de confirmación activo (`smoke.test.js`); al vivir siempre en el DOM (el modal no se desmonta, solo se oculta), rompía ese selector con un "strict mode violation" de Playwright en un test de Metas sin relación funcional con esta tarea. Se corrigió reusando `.form-hint` (helper genérico ya existente en `forms.css`), sin tocar el contrato de `.confirm__mensaje`.

**Validación:** 2188/2188 unit (20 tests nuevos: `accesos.test.js` con lógica pura, render de tiles/modal y toggle end-to-end vía `dispatch()`; 3 tests de migración v22→v23 en `storage.test.js`). 148/148 E2E verdes en navegador real (Playwright), incluida la corrección del test de Metas que la colisión de clase rompía. Preview de este entorno no disponible (mismo problema recurrente); verificado además con un flujo manual: tiles default en Dashboard → abrir Personalizar → quitar/agregar una sección → cierre y verificación de que el tile row se actualiza en vivo → navegar a otra sección y volver (persiste) → tocar un tile navega a la sección real. SW v326 → v327.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `ACCESOS_INICIO` (catálogo de 8 secciones), `ACCESOS_INICIO_DEFAULT`. |
| `modules/core/state.js` | `S.config.accesosInicio` con el default. |
| `modules/core/storage.js` | Migración v22 → v23; `SCHEMA_VERSION = 23`. |
| `modules/dominio/accesos/logic.js` | Nuevo: `accesosVisibles()`, `alternarAcceso()`. |
| `modules/dominio/accesos/view.js` | Nuevo: `renderAccesosInicio()`, `renderModalPersonalizarAccesos()`. |
| `modules/dominio/accesos/index.js` | Nuevo: `initAccesos()`, acciones `accesos-personalizar`/`accesos-toggle`. |
| `modules/ui/bootstrap.js` | Import + llamada a `initAccesos()`. |
| `index.html` | Fila de tiles bajo el hero (`#accesos-inicio-grid`), modal `#modal-personalizar-accesos`. |
| `styles/components/domain.css` | Bloque `ACCESOS-INICIO` (grilla auto-fit de tiles). |
| `styles/components/atoms.css` | `.accesos-row*` (fila toggleable del modal). |
| `tests/unit/accesos.test.js` | Nuevo: 17 tests. |
| `tests/unit/storage.test.js` | 3 tests nuevos (migración v23). |
| `docs/contexto/inicio.md`, `docs/MAPA.md` | IN.4a cerrada; dominio `accesos/` indexado. |
| `docs/BOARD.md` | Tarjeta IN.4a cerrada y borrada; iniciativa del ADR 028 completa salvo IN.6b. |
| `service-worker.js` | `accesos/` agregado a `CORE_ASSETS`; v326 → v327. |

---

### feat(movimientos): TX.8b, vista completa + Gastos acota categorías internas · 2026-07-05

Cuarta y última fase de la iniciativa TX.8 del [ADR 028](DECISIONS/028-inicio-centro-de-control.md): vista completa del historial de Movimientos en ruta propia `#movimientos` (sin ícono fijo en la barra de navegación; se llega por el link "Ver todo" del panel compacto de Inicio, o por hash directo). Cronológica, agrupada por mes ("Julio 2026"), sin totales: el resumen financiero (ingresos/egresos/variación) sigue siendo dueño exclusivo de Análisis (ADR 028 D5).

Cada `Movimiento` (`movimientos/logic.js`) ahora lleva un campo `dominio` (`gastos`, `compromisos`, `ingresos` o `ahorro`, según el tipo y la categoría interna del gasto) que colorea la teja del ícono con `tejaCategoria()`, el mismo patrón que usan Gastos y Deudas. `movimientosCompletos()` es nuevo: reusa `movimientosRecientes()` con límite `Infinity`, sin duplicar la lógica de combinación/orden de las 3 fuentes.

En paralelo, `renderListaGastos()` y `renderFiltrosGastos()` (`gastos/view.js`) dejan de mostrar las categorías internas ('Deudas' = abonos, 'Gastos fijos' = pagos del Calendario) vía el filtro `_sinInternas()`: Gastos queda enfocada en gasto cotidiano, incluido el total del resumen del mes. `S.gastos` no se toca, así que Análisis y Límites (que siguen leyendo todo el historial) no se ven afectados.

Se corrigió de paso un hueco de TX.8a: `modules/dominio/movimientos/{logic,view,index}.js` no estaban en `CORE_ASSETS` del service worker (ausentes del precache offline desde que se creó el dominio).

**Validación:** 2168/2168 unit (17 tests nuevos en `movimientos.test.js`: campo `dominio` por fuente, `movimientosCompletos()`, `renderMovimientosCompletos()` con lista completa/cuenta/agrupación por mes/teja por dominio/link "Ver todo"; 7 tests nuevos en `gastos.test.js` para la exclusión de internas en lista, chips y total). E2E smoke 82/82 y navegación 7/7 verdes en navegador real (Playwright), incluida una regresión nueva para la ruta sin ícono de nav (mismo patrón que las demás secciones en `navegacion-render.test.js`). Preview de este entorno no disponible (mismo problema recurrente); verificado además con un flujo manual Dashboard → "Ver todo" → Movimientos con datos reales (cuenta, mes, colores por dominio confirmados visualmente). SW v325 → v326.

| Archivo | Cambio |
|---|---|
| `modules/dominio/movimientos/logic.js` | Campo `dominio` en `movimientosDesdeGastos()`/`...IngresosPuntuales()`/`...Aportes()`; `movimientosCompletos()` nuevo. |
| `modules/dominio/movimientos/view.js` | `renderMovimientosCompletos()`, `_agruparPorMes()`, `_renderMovimientoItem()`, link "Ver todo" en `renderActividadReciente()`. |
| `modules/dominio/movimientos/index.js` | `_renderTodo()` wiring `renderSmart(..., 'movimientos')` además de `'dash'`. |
| `modules/dominio/gastos/view.js` | `_CATEGORIAS_INTERNAS`, `_sinInternas()` aplicado en `renderListaGastos()`/`renderFiltrosGastos()`. |
| `modules/infra/router.js` | `SECTIONS` suma `['movimientos', 'sec-movimientos']`. |
| `index.html` | Sección `#sec-movimientos` nueva (sin ícono en `.nav-item`). |
| `styles/components/domain.css` | Bloque `MOVIMIENTOS` (divisor de mes), `.actividad-reciente__ver-todo`. |
| `styles/components/atoms.css` | `.list-item__amount--ingreso`. |
| `tests/unit/movimientos.test.js` | 17 tests nuevos. |
| `tests/unit/gastos.test.js` | 7 tests nuevos. |
| `tests/e2e/navegacion-render.test.js` | 1 test nuevo. |
| `docs/contexto/inicio.md`, `docs/MAPA.md` | TX.8b cerrada; dominio actualizado. |
| `docs/BOARD.md` | Tarjeta TX.8b cerrada y borrada. |
| `service-worker.js` | `movimientos/` agregado a `CORE_ASSETS`; v325 → v326. |

---

### feat(movimientos): TX.8a, dominio nuevo + Actividad reciente en Inicio · 2026-07-05

Tercera fase del [ADR 028](DECISIONS/028-inicio-centro-de-control.md): Inicio muestra un panel "Actividad reciente" con los últimos 5 movimientos de la app, derivados sin log paralelo (D5 del ADR) desde `S.gastos`, `S.ingresosPuntuales` y `S.ahorro.aportes`.

Dominio nuevo `modules/dominio/movimientos/` (`logic.js` puro, `view.js`, `index.js`). `logic.js` no lee `S` ni importa otros dominios (ADN 10): `view.js` extrae los arrays y se los pasa. Cada fuente se normaliza a un shape común `{ id, fecha, tipo, descripcion, monto, direccion, icono, cuentaId }`; se combinan y ordenan por fecha descendente, límite 5.

Ajuste menor a `constants.js`: se agregó `CATEGORIA_ICONO['Gastos fijos'] = 'i-recurring'` (la categoría interna que crean los pagos de fijos no tenía ícono propio y caía al genérico `i-gastos`); `'Deudas'` y `'Ahorro'` ya tenían íconos, así que no hizo falta tocar más el catálogo ni importar `iconoPorOrigen()` de `gastos/logic.js` (habría violado ADN 10).

CSS nuevo `.actividad-reciente*` en `domain.css`, siguiendo el mismo patrón visual que `vencidos-card`/`prioridades-card` (header + lista de ítems con ícono, descripción, "hace N días" vía `tiempoRelativo()` ya existente, y monto con signo `+`/`-` según dirección).

**Validación:** 2145/2145 unit (26 tests nuevos en `movimientos.test.js`: normalización de las 3 fuentes, orden/límite, render oculto/visible/límite de 5 en el DOM). E2E smoke 82/82 verde en navegador real (Playwright), confirmando que el dominio nuevo carga sin errores. Preview de este entorno no disponible (mismo problema recurrente). SW v324 → v325.

| Archivo | Cambio |
|---|---|
| `modules/dominio/movimientos/logic.js` | Nuevo: `movimientosDesdeGastos()`, `movimientosDesdeIngresosPuntuales()`, `movimientosDesdeAportes()`, `movimientosRecientes()`. |
| `modules/dominio/movimientos/view.js` | Nuevo: `renderActividadReciente()`. |
| `modules/dominio/movimientos/index.js` | Nuevo: `initMovimientos()`, registro en `state:change`/`hashchange`/`registrarRender`. |
| `modules/ui/bootstrap.js` | Import + llamada a `initMovimientos()`. |
| `modules/core/constants.js` | `CATEGORIA_ICONO['Gastos fijos'] = 'i-recurring'`. |
| `index.html` | `#panel-actividad-reciente` en el bento de Inicio, antes de "Resumen de la semana". |
| `styles/components/domain.css` | Bloque `ACTIVIDAD-RECIENTE` nuevo. |
| `tests/unit/movimientos.test.js` | Nuevo: 26 tests. |
| `docs/contexto/inicio.md`, `docs/MAPA.md` | TX.8a cerrada; nuevo dominio indexado. |
| `docs/BOARD.md` | Tarjeta TX.8a cerrada y borrada. |
| `service-worker.js` | v324 → v325. |

---

### feat(tesoreria): CAL.1, nudge de distribución del ingreso en Inicio · 2026-07-05

Segunda fase del [ADR 028](DECISIONS/028-inicio-centro-de-control.md): el bloque "Atención hoy" de Inicio ahora muestra un nudge cuando llegó el cobro del periodo y aún no se ha distribuido ("Hoy recibes tu ingreso" / "Recibiste tu ingreso el {fecha}"), con un botón "Distribuir ahora".

Hallazgo clave durante la implementación: `modules/dominio/tesoreria/logic/distribucion.js` ya tenía `estadoDistribucion()`, la función que decide si el cobro del periodo ya llegó y si ya se distribuyó, y `S.config.ultimaDistribucionPeriodo` ya era el marcador de de-duplicación (lo usa el panel equivalente de Mis cuentas desde antes). El ADR 028 D4 anticipaba un "marcador anti-insistencia nuevo dentro del bump v23"; no hizo falta: el nudge de Inicio reutiliza el guard existente sin tocar el schema. El CTA emite el mismo `distribuir:abrir` que ya usa el recordatorio de día de ingreso del Calendario (ADR 021), así que el Calendario no perdió nada: sigue marcando visualmente el día y su tap sigue abriendo el asistente.

Renderizado por **tesorería** (dueña del asistente y de `S.ingresos`), no por el dominio de Inicio: `renderNudgeDistribucionInicio()` nuevo en `views/distribucion.js`, registrado en `tesoreria/index.js` vía `registrarRender()` (mismo patrón que usan los paneles del dashboard de `compromisos`). Reutiliza el componente `.nudge`/`.nudge-info` ya existente en el sistema de diseño (cero CSS nuevo).

**Validación:** 2119/2119 unit (7 tests nuevos: oculto sin ingresos datables, oculto con cobro pendiente, visible con "hoy", visible con fecha de atraso, oculto una vez distribuido, el CTA emite el evento correcto). E2E smoke 82/82 verde en un navegador real (Playwright), incluido el flujo "Distribuir abre el asistente en Mis cuentas". Preview de este entorno no disponible (mismo problema recurrente de sesiones anteriores). SW v323 → v324.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/views/distribucion.js` | `renderNudgeDistribucionInicio()` nuevo. |
| `modules/dominio/tesoreria/acciones/distribucion.js` | `_distribuirDesdeInicio()` + acción `distribuir-desde-inicio`. |
| `modules/dominio/tesoreria/view.js` | Re-export de `renderNudgeDistribucionInicio`. |
| `modules/dominio/tesoreria/index.js` | Registro del render en `state:change`, `hashchange` y `registrarRender()`. |
| `index.html` | `#panel-distribuir-inicio` en el bento de Inicio, antes de "Gastos por organizar". |
| `tests/unit/tesoreria.test.js` | 7 tests nuevos para `renderNudgeDistribucionInicio()`. |
| `docs/contexto/inicio.md` | CAL.1 cerrada; corrección del alcance del bump v23 (sin el marcador que anticipaba el ADR). |
| `docs/BOARD.md` | Tarjeta CAL.1 cerrada y borrada. |
| `service-worker.js` | v323 → v324. |

---

### feat(resumen): IN.6a, saludo dinámico con nombre en Inicio · 2026-07-05

Primera fase implementada del [ADR 028](DECISIONS/028-inicio-centro-de-control.md) (aprobado el mismo día). "Buenos días / Buenas tardes / Buenas noches, {nombre}" según la hora local, bajo el título de Inicio. Usa `S.perfil.nombre` (existía desde el onboarding, ninguna vista lo leía); sin nombre, saluda sin él. Sin dato nuevo, sin migración de schema (D3 del ADR). Franjas: 5 a 11 días, 12 a 18 tardes, resto (19 a 23 y 0 a 4) noches.

`updSaludo()` nuevo en `modules/infra/render.js`, junto a `updSaldo()` (mismo patrón: lee `S` directo, actualiza un elemento del dashboard, se invoca desde `renderAll()`). Elemento `#saludo-inicio` agregado en `index.html` bajo `#title-dash`, reutilizando la clase `.section__subtitle` ya existente.

**Validación:** 2112/2112 unit (6 tests nuevos con reloj falso para las 3 franjas horarias, sin nombre, `S.perfil` ausente y contenedor ausente). Preview no disponible en este entorno (mismo problema de sesiones anteriores, el servidor no llega a "running"); verificado por render happy-dom directo del DOM. SW v322 → v323.

| Archivo | Cambio |
|---|---|
| `modules/infra/render.js` | `updSaludo()` nuevo, invocado desde `renderAll()`. |
| `index.html` | `#saludo-inicio` bajo el título de Inicio. |
| `tests/unit/render.test.js` | 6 tests nuevos para `updSaludo()`. |
| `docs/contexto/inicio.md` | Ficha actualizada: IN.6a cerrada, riesgo del perfil resuelto. |
| `docs/BOARD.md` | Tarjeta IN.6a cerrada y borrada. |
| `service-worker.js` | v322 → v323. |

---

### docs(adr): ADR 028 propuesto, Inicio como centro de control · 2026-07-05

Cierre del análisis conjunto del cluster de Inicio. [ADR 028](DECISIONS/028-inicio-centro-de-control.md) (**aprobado por Esteban el mismo día**) define la arquitectura de información de la pantalla: un rol único por bloque en orden vertical fijo (saludo, hero, accesos rápidos, atención hoy, próximas prioridades, actividad reciente, resumen semanal) y re-corta los briefs del usuario en 6 fases verificables por separado.

Decisiones principales: accesos rápidos data-driven con catálogo + personalización por lista, sin drag & drop en v1 (D2); saludo dinámico ya, avatar ilustrado propio después, fotografía descartada por el cupo de `localStorage` (D3); el aviso de distribución del ingreso pasa a Inicio como nudge de tesorería reutilizando el `distribuir:abrir` existente, y el Calendario conserva la visualización temporal (D4); Movimientos se **deriva** de los registros existentes (`S.gastos` con categorías internas, `S.ingresosPuntuales`, `S.ahorro.aportes`) en un dominio nuevo `movimientos`, sin log paralelo, y Gastos deja de listar las categorías internas; el resumen financiero no va en Inicio (Análisis es el dueño, ANL.1) (D5). Un solo bump de schema (v23) concentrará los campos nuevos.

Hechos verificados que sustentan el diseño (en la ficha [`contexto/inicio.md`](contexto/inicio.md)): los pagos de fijos y abonos a deuda ya crean gastos con categorías internas `'Gastos fijos'`/`'Deudas'` (la "mezcla" que reportó el usuario en Gastos es literal); metas y apartados no tienen registros fechados por aporte (limitación aceptada v1); en móvil, 8 secciones quedan a 2 taps detrás de "Más" (el hueco real que llenan los accesos personalizables).

Solo docs: cero cambios de código, app intacta, sin bump de SW. Con el ADR aprobado, la siguiente tarea es **IN.6a** (saludo dinámico), primera fase del orden recomendado.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/028-inicio-centro-de-control.md` | ADR nuevo (aceptado): D1 a D6. |
| `docs/BOARD.md` | Tarjetas IN.4/IN.6/CAL.1/TX.8 re-cortadas en fases IN.6a, CAL.1, TX.8a, TX.8b, IN.4a, IN.6b (+ IN.4b pospuesta); briefs verbatim capturados por el ADR. |
| `docs/contexto/inicio.md` | Estado, pendientes (con los hallazgos nuevos de fuentes de movimientos) y observaciones apuntando al ADR 028. |

---

### fix(resumen): IN.7, Próximas prioridades ya no duplica lo que vence hoy · 2026-07-05

El usuario reportó que un mismo gasto fijo con vencimiento hoy aparecía a la vez en "Pendientes del mes" y en "Próximas prioridades". Causa confirmada en el análisis de la ficha nueva `docs/contexto/inicio.md`: `detectarVencidosCompletos()` (panel Pendientes del mes) y `compromisosProximos()` (panel Próximas prioridades) tratan "vence hoy" como `diasAtraso = 0` y `diasRestantes = 0` respectivamente, sin exclusión mutua.

Fix acotado a la vista: `renderPanelPrioridades()` filtra `diasRestantes > 0` sobre los compromisos antes de combinarlos con préstamos personales y apartados. No se tocó `compromisosProximos()` en `logic.js`: otros consumidores (`nivelAlertaMora`, el nudge de mora inminente) siguen necesitando el día 0. Los préstamos personales y apartados que vencen hoy sí siguen mostrándose en Próximas prioridades porque no tienen un panel de vencidos propio.

Primer paso del análisis conjunto de Inicio (IN.4, IN.6, IN.7, CAL.1, TX.8, ver BOARD): quedó documentado en la ficha `docs/contexto/inicio.md`, nueva, con el mapa completo del dashboard actual. Un hallazgo relevante para el resto del cluster: hoy solo existe **1** acceso rápido (Gasto rápido), no 3 como describía el brief original de IN.4.

**Validación:** 2 tests migrados de `DIA_HOY` a un nuevo `DIA_MANANA` (dejaron de aplicar al caso "vence hoy" tras el fix) + 2 tests de regresión nuevos (uno confirma que un compromiso de hoy ya no aparece en Próximas prioridades, otro confirma que un préstamo personal o apartado de hoy sigue apareciendo). 2106/2106 unit; verificación en preview no disponible en este entorno (servidor de otra sesión ocupando el puerto), verificación por render happy-dom del DOM real del panel. SW v321 → v322.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/views/dashboard.js` | `renderPanelPrioridades()` filtra `diasRestantes > 0` en la fuente de compromisos. |
| `tests/unit/compromisos.test.js` | `DIA_MANANA` nuevo; 3 tests migrados de `DIA_HOY`; 2 tests de regresión nuevos. |
| `docs/contexto/inicio.md` | Ficha nueva: mapa exhaustivo del dashboard actual, base del análisis conjunto IN.4/IN.6/CAL.1/TX.8. |
| `docs/BOARD.md` | Tarjeta IN.7 cerrada y borrada; nota de alcance restante (recomendaciones anticipadas) enlazada a CAL.1/LIM.1/TX.10. |
| `service-worker.js` | v321 → v322. |

---

### docs(adr): BR.4, ADR 027 formaliza la excepción de logo a color · 2026-07-05

Cierre de la iniciativa Biblioteca de recursos gráficos: registro formal, en un ADR nuevo, de una decisión que Esteban ya había tomado e implementado sin ADR (deuda de proceso señalada en BR.3). [ADR 027](DECISIONS/027-logos-de-marca-a-color-excepcion-monocromo.md) amplía la sección D2 de [ADR 025](DECISIONS/025-logotipos-de-marca-y-tejas.md) ("glifos monocromos de un solo path") con la excepción `data-fullcolor`, ya vigente en los 11 bancos/billeteras reales de `BANCOS_CO`.

Contenido del ADR: cuándo aplica la excepción (D1, juicio humano: marcas cuya identidad ES el color), el marcado `data-fullcolor="true"` (D2), archivo autónomo conservado byte a byte sin conversión de colores (D3), color de teja igual al color del propio fondo del logo, con el criterio de esquinas para degradados/mosaicos ya usado en BR.3 (D4), el guardarraíl técnico de `fill`/`stroke` explícitos que previene el bug del contorno fantasma (`0f143f9`) en cualquier símbolo fullcolor futuro (D5), IDs de degradado prefijados por slug (D6) y su convivencia con la fidelidad D5 de ADR 025 (D7). También actualiza la línea "Estado" de ADR 025 para apuntar hacia el nuevo ADR.

Con BR.4 cerrada, la iniciativa Biblioteca de recursos gráficos (ADR 026 + ADR 027) queda completa: BR.1, BR.2, BR.3, BR.4 y BR.5 sin pendientes. Solo documentación: cero cambios de código, app intacta, sin bump de SW.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/027-logos-de-marca-a-color-excepcion-monocromo.md` | ADR nuevo: excepción de logo a color (`data-fullcolor`), D1 a D7. |
| `docs/DECISIONS/025-logotipos-de-marca-y-tejas.md` | Línea "Estado" actualizada: referencia hacia ADR 027. |
| `docs/contexto/transversal.md` | Ficha actualizada: BR.4 pasa de pendiente a cambio realizado, `Verificado contra` al día. |
| `docs/BOARD.md` | Tarjeta BR.4 cerrada y borrada; iniciativa Biblioteca de recursos gráficos marcada **COMPLETA**. |

---

### feat(assets): BR.3 completa, los 11 bancos/billeteras de BANCOS_CO a color · 2026-07-05

Cierre de la iniciativa de biblioteca gráfica para banca CO. Esteban entregó, en el mismo lote, exports de Davivienda, BBVA, Banco Popular, Scotiabank Colpatria, DaviPlata, Lulo Bank y Nubank, y minutos después (en vivo, mientras se integraban los anteriores) también Banco de Occidente y AV Villas: **9 bancos de un tirón**. Con Bancolombia, Banco de Bogotá y Nequi ya cerrados antes, **los 11 bancos/billeteras de `BANCOS_CO` quedan con glifo oficial a color**; el único sin símbolo es "Otro" (deliberado: no es una entidad real, es el fallback genérico).

Los 9 nuevos llegaron como exports crudos de Illustrator, cada uno con su propia imagen de calco incrustada (mismo patrón ya visto en Banco de Bogotá): BR.5 (cerrada en el commit anterior) resolvió automáticamente la limpieza del envoltorio, y la imagen se retiró de los 9 con el mismo criterio ya aprobado (cero diferencia visual, solo cruft). Dos casos particulares: DaviPlata y Davivienda usan degradado (`Degradado_sin_nombre_N`, nombre en español de Illustrator, que BR.5 no contemplaba); se amplió el regex de renombrado de degradados de BR.5 para reconocer ese patrón además del inglés. Banco de Occidente construye su fondo con un mosaico de 5 polígonos en diagonal (no un rect plano) más una marca en degradado encima.

**Color de teja para los casos sin fondo plano:** DaviPlata, Davivienda y Banco de Occidente no tienen un único color de fondo (degradado o mosaico); se eligió el tono que coincide exacto con al menos 2 de las 4 esquinas del glifo (verificado por muestreo de píxeles en canvas a 240×240), mismo criterio ya aceptado para Banco de Bogotá.

**Ajuste de tests:** con el catálogo completo, ya no queda ningún banco/billetera real sin glifo para ejemplificar el fallback de iniciales (los 3 tests que usaban Davivienda como ejemplo apuntaban a un caso que dejó de existir). Se migraron a "Otro" (para el test que llama a `bancoAvatar()` directo, el único BANCOS_CO restante sin `simbolo`) y a "ChatGPT" de `MARCAS` (para los 2 tests de flujo completo vía `resolverMarca()`, que sigue sin glifo).

**Validación:** 2104/2104 unit (3 fixtures migrados); 147/147 E2E; lint limpio; sync sin errores. Verificación visual: los 9 glifos renderizan completos (0% píxeles transparentes inesperados, muestreo en canvas) y los 3 casos de color aproximado calzan en al menos 2 esquinas exactas. SW v320 → v321.

| Archivo | Cambio |
|---|---|
| `assets/svg/logos/bancos/{banco-popular,bbva,daviplata,davivienda,lulo-bank,nubank,scotiabank-colpatria,av-villas,banco-occidente}.svg` | 9 logos a color nuevos (imagen de calco retirada, `data-fullcolor`, fill/stroke explícitos). |
| `scripts/sync-sprite.py` | Regex de degradados amplia a `Degradado_sin_nombre_N` (Illustrator en español); limpieza de `data-name`. |
| `modules/core/constants.js` | 9 entradas de `BANCOS_CO`: `simbolo` nuevo + `color` actualizado al fondo real del logo. |
| `index.html` | Sprite regenerado: 110 símbolos (9 nuevos). |
| `tests/unit/{agenda,bancos,compromisos}.test.js` | 3 fixtures migrados de Davivienda (ya con glifo) a Otro/ChatGPT. |
| `service-worker.js` | v320 → v321. |
| `docs/BOARD.md` | Tarjeta BR.3 cerrada y borrada; BR.4 actualizada (ya no pendiente de bancos, solo del ADR). |
| `docs/contexto/transversal.md` | Ficha actualizada: estado, riesgos y cambios realizados. |

---

### feat(assets): BR.5, el sync normaliza exports crudos de Illustrator · 2026-07-05

Cierra la fricción detrás de las dos limpiezas manuales que ya hicieron falta en BR.3 (Nequi, Banco de Bogotá): `scripts/sync-sprite.py` ahora normaliza el envoltorio típico de un export crudo de Adobe Illustrator **antes** de validar, y reescribe el archivo limpio de vuelta en `assets/svg/` (la biblioteca sigue siendo la fuente de verdad; el guardarraíl byte a byte de `sprite-sync.test.js` sigue válido porque compara contra el archivo ya normalizado en disco).

**Qué normaliza automáticamente** (`normalizar_export_illustrator()`):

- Declaración XML, `id="Capa_1"`, `version`, comentario del generador: se quitan.
- `xlink:href` → `href` (namespace `xlink` innecesario, se retira si quedó vacío).
- IDs de degradado por defecto de Illustrator (`linear-gradient`, `linear-gradient1`...): se renombran con el nombre del propio archivo como prefijo (`banco-bogota-g0`, `banco-bogota-g1`...), reescribiendo también sus referencias (`url(#...)`, `href="#..."`). Un id ya prefijado a mano (`bbog-g0`) no matchea el patrón y queda intacto: idempotente.
- `<g>` bare (sin `transform`/`class`/`style`) envolviendo el bloque final de paths: se desenvuelve.

**Lo que deliberadamente NO automatiza** (sigue siendo decisión humana): `fill`/`stroke` explícitos por elemento y `data-fullcolor="true"` (el sync los exige, no los adivina); una `<image>` incrustada se **rechaza con un error explicando la causa probable** (capa de calco/referencia olvidada), nunca se borra en silencio.

**Validación:** probado con exports sintéticos replicando los dos casos reales (Nequi, Banco de Bogotá) más un ícono simple, confirmando normalización correcta e idempotencia; corrida real contra la biblioteca ya limpia: `index.html ya estaba sincronizado (sin cambios)`, `bbog-g0` intacto. 2104/2104 unit; 147/147 E2E; lint limpio. SW v319 → v320.

| Archivo | Cambio |
|---|---|
| `scripts/sync-sprite.py` | Paso 0 nuevo: `normalizar_export_illustrator()` + helpers; reescribe archivos normalizados en `assets/svg/`. |
| `assets/svg/README.md` | Sección 7: qué normaliza el sync vs. qué sigue siendo checklist manual. |
| `service-worker.js` | v319 → v320. |
| `docs/BOARD.md` | Tarjeta BR.5 cerrada y borrada. |

---

### fix(assets): contorno fantasma en logos a color por herencia CSS vía use · 2026-07-05

Esteban reportó desde su celular dos alteraciones visuales que él no diseñó: contorno blanco alrededor del remolino de Banco de Bogotá y un borde morado en Nequi que hacía percibir el logo más morado que rosa. **Los archivos SVG estaban intactos**: la causa raíz es que la clase `.icon` ([forms.css](../styles/components/forms.css), `fill:none; stroke:currentColor; stroke-width:2.35`) aplica esas propiedades al `<svg>` anfitrión de la teja y **se heredan hacia adentro del `<use>`**: todo elemento del símbolo sin `stroke` propio recibe un contorno del color `texto` de la teja (blanco en BdB, morado `#1f0020` en Nequi, que a 2.35 de grosor devoraba el acento rosa de ~4 unidades). Bancolombia nunca lo sufrió porque sus paths sí llevan `stroke="none"` explícito: esa asimetría fue la pista.

**Fix en tres capas** (el diseño de Esteban no se tocó: ni una coordenada, ni un color):

- `stroke="none"` explícito en los 2 paths de `nequi.svg` y los 5 de `banco-bogota.svg` (el atributo de presentación del elemento gana a la herencia CSS).
- `sync-sprite.py` (`_validar_fullcolor`): todo elemento pintable de un logo a color debe declarar `fill` Y `stroke` explícitos, o el recurso se excluye con mensaje explicando la herencia. Ningún logo futuro puede reintroducir el bug.
- Guardarraíl nuevo en `sprite-sync.test.js` vigilando lo mismo sobre los archivos publicados.

**Verificación objetiva** (render en canvas replicando la herencia del CSS, conteo de píxeles a 96px): contorno blanco de BdB 4.587 px → **0**; acento rosa de Nequi 30 px → **235** (su área real de diseño); la N volvió a su peso original (5.165 → 2.954 px de morado).

**Reglas nuevas del usuario registradas** (BOARD transversal + memoria + `assets/svg/README.md` 6b): fidelidad absoluta a los logotipos oficiales, cero contornos/bordes/sombras/efectos agregados; si un logo necesita contraste se ajusta el contenedor, nunca el logo. Flujo de entrega: SVG siempre (fuente de verdad) + PNG 512px de referencia opcional para logos a color (vara de comparación en la revisión en pareja). Se creó además la **primera ficha de contexto** de la metodología nueva: [`contexto/transversal.md`](contexto/transversal.md) (tejas de marca y biblioteca gráfica).

**Validación:** 2104/2104 unit (guardarraíl nuevo incluido); 147/147 E2E; lint limpio; sync idempotente (diff de `index.html` limitado a los 2 símbolos). SW v318 → v319.

| Archivo | Cambio |
|---|---|
| `assets/svg/logos/bancos/{nequi,banco-bogota}.svg` | `stroke="none"` en cada path; diseño intacto. |
| `scripts/sync-sprite.py` | Validador fullcolor exige fill/stroke explícitos en elementos pintables. |
| `tests/unit/sprite-sync.test.js` | Test nuevo: logos a color con fill/stroke explícitos (2103 → 2104). |
| `assets/svg/README.md` | Sección 6b (estándar del logo a color y el porqué) + PNG de referencia en el flujo (sección 9). |
| `index.html` | Sprite regenerado: `b-nequi`, `b-banco-bogota`. |
| `service-worker.js` | v318 → v319. |
| `docs/contexto/{README,transversal}.md` | Primera ficha de contexto activa. |
| `docs/BOARD.md` | Regla de fidelidad ampliada; tarjeta BR.5 nueva (normalización de exports crudos). |

---

### feat(assets): BR.3, rediseño de Nequi a color + limpieza de exports crudos · 2026-07-05

Segunda entrega de BR.3: Esteban reemplazó el wordmark completo de Nequi (descartado por ilegible bajo 40px) por un monograma "N" morado con acento rosa sobre fondo blanco, mismo tratamiento a color que Bancolombia y Banco de Bogotá. De paso llegó un reexport ajustado de Banco de Bogotá.

Ambos archivos llegaron como export crudo de Illustrator (declaración XML, `id="Capa_1"`, comentario del generador, sin `data-fullcolor`). El de Banco de Bogotá además traía una **imagen PNG en base64 incrustada** (una capa de calco/referencia que Illustrator no había ocultado antes de exportar), tapada por completo por los 5 paths vectoriales que sí dibujan el remolino completo: se retiró porque quitarla no cambia ni un píxel de lo renderizado y evita cargar un raster pesado en cada teja. Se estableció una regla nueva de fidelidad: todo SVG que Esteban entrega es la versión oficial, cero simplificación o restilizado sin pedirlo; solo limpieza técnica cuando el resultado es visualmente idéntico (ver nota en `BOARD.md`, transversal).

**Qué entró:**

- `nequi.svg` limpio: `data-fullcolor="true"`, fondo `#fff`, N en `#1f0020`, acento en `#fe0086`. Catálogo (`BANCOS_CO`) actualizado: la teja se pinta ahora del fondo blanco propio del glifo (antes berenjena/magenta corporativo).
- `banco-bogota.svg` reexportado: mismos 5 paths con degradado, coordenadas afinadas, IDs de gradiente re-prefijados `bbog-g0` a `bbog-g4` (convención ya usada), sin la imagen de calco.
- Verificado visualmente en el navegador: ambas tejas renderizan correctas en el picker de banco y en la lista de cuentas (36px), sin regresión.

**Validación:** 2103/2103 unit (1 fixture de color de Nequi actualizado); 147/147 E2E; lint limpio; sync-sprite sin errores (diff de `index.html` limitado a los 2 símbolos tocados). SW v317 → v318.

| Archivo | Cambio |
|---|---|
| `assets/svg/logos/bancos/nequi.svg` | Nuevo diseño a color (monograma N + acento), reemplaza el wordmark descartado. |
| `assets/svg/logos/bancos/banco-bogota.svg` | Reexport limpio: gradientes re-prefijados, sin imagen de calco incrustada. |
| `modules/core/constants.js` | Nequi: `color` pasa a `#ffffff` (fondo propio del logo a color). |
| `index.html` | Sprite regenerado: `b-nequi` y `b-banco-bogota` actualizados. |
| `tests/unit/bancos.test.js` | Fixture de colores de Nequi actualizado al nuevo fondo/glifo. |
| `service-worker.js` | v317 → v318. |
| `docs/BOARD.md` | Nota de BR.3 actualizada; regla de fidelidad de SVG registrada. |

---

### docs(workflow): metodología de contexto técnico por funcionalidad · 2026-07-05

Pedido del usuario: minimizar el tiempo que la IA gasta localizando información dentro del proyecto y maximizar el dedicado a diseñar, desarrollar y validar. Entra `docs/contexto/`: una ficha por sección de la app y, dentro, un bloque por funcionalidad con objetivo, estado, dónde vive (tabla archivo + ancla por función/export/clase CSS, con la línea como referencia orientativa), recursos gráficos, dependencias y relaciones, riesgos, cambios pendientes y realizados, y un campo `Verificado contra` (commit) para detectar cuándo un bloque quedó desactualizado.

El workflow queda codificado en `CLAUDE.md`:

- **Reutilización (2.6):** antes de analizar, consultar MAPA + la ficha de la sección; solo recorrer el proyecto desde cero si el bloque no existe o quedó viejo. El análisis inicial de una funcionalidad se hace una sola vez, en profundidad (modelo de mayor capacidad si se justifica); las iteraciones siguientes usan el modelo más eficiente que mantenga la calidad.
- **Cierre (2.4):** actualizar la ficha es ahora el paso 1 de la secuencia de docs al cerrar una tarea.
- **Unificar y dividir (2.1):** cero tarjetas duplicadas en el BOARD (la más completa absorbe a las demás); las tareas que tocan varios dominios o capas se parten en subtareas verificables de forma independiente.

Las fichas nacen bajo demanda al trabajar cada funcionalidad por primera vez; no se pre-generan (envejecen mal y cuestan tokens sin retorno). Se auditó el BOARD en busca de duplicados: no hay (BR.3 y BR.4 son entregables distintos de una misma iniciativa, ya agrupados). Solo docs: cero cambios de código, app intacta, sin bump de SW.

| Archivo | Cambio |
|---|---|
| `docs/contexto/README.md` | Nuevo: reglas de uso, plantilla de bloque, índice de 14 fichas por sección. |
| `CLAUDE.md` | Sección 2.6 nueva (contexto por funcionalidad); 2.1 ampliada (dividir/unificar); 2.4 con la ficha como paso 1; sección 0 y lectura previa (sección 5) enlazan `docs/contexto/`. |
| `docs/BOARD.md` | Paso "consultar ficha" en el uso del tablero + reglas de tarjetas (sin duplicados, dividir lo grande). |
| `docs/HANDOFF.md` | Entrada de cierre en "Qué se hizo recientemente". |

---

### feat(ui): escala de tokens de iconografía + fix de cascada @layer · 2026-07-05

Revisión completa del sistema de iconografía pedida por el usuario: los iconos se percibían pequeños y difíciles de identificar de un vistazo, en móvil y en escritorio. La auditoría encontró dos problemas: (1) no existía una escala de tamaños (11 valores sueltos hardcodeados entre 14 y 56px repartidos en 9 archivos CSS, contra la regla "nunca hardcodear tamaños") y (2) **un bug de cascada preexistente**: `main.css` importa `layout.css` en una capa `@layer` inferior a `components`, y en capas CSS la capa gana sin importar la especificidad, así que los tamaños declarados en `layout.css` para la navegación (22px), el hero de saldo (32px) y los accesos rápidos (18px) llevaban tiempo perdiendo contra el `.icon` base: **los tres contextos renderizaban a 20px**. Eso explica directamente la percepción de iconos pequeños.

**Qué entró:**

- **Escala de tokens `--fk-icon-*`** en `tokens.css`: 7 pasos (16, 18, 20, 24, 28, 32, 48px) más 2 tamaños de teja (`--fk-teja-md` 32px, `--fk-teja-lg` 36px). Piso de 16px: por debajo, el trazo efectivo del sprite (2.35 × tamaño/24) baja de ~1.5px y pierde nitidez en pantallas 1x o de baja resolución. Documentada en `DESIGN_SYSTEM.md` con la tabla contexto → token.
- **Patrón `--fk-icon-size`** (mismo mecanismo que la chispa `--fk-icon-dot` del ADR 023): `.icon` lee `var(--fk-icon-size, var(--fk-icon-md))` y cada contexto declara la variable en vez de `width`/`height` directos. Las variables atraviesan las capas de `main.css`, así que el fix de cascada queda resuelto de raíz y cualquier capa puede dimensionar iconos sin pelear la cascada. Un solo mecanismo en toda la app.
- **Navegación 22 → 24px** (sidebar y bottom-nav): estándar de Material 3 y Apple HIG para navegación, el contexto más crítico en móvil. El override móvil `width: auto` de la era emoji quedó acotado al wrapper del FAB Registrar (único `<span>` del nav); antes pisaba el ancho de los SVG por la misma razón de capas.
- **Tejas más grandes en listas:** en filas de lista (Gastos, Mis cuentas, Deudas, Metas: el contexto de reconocimiento primario) la teja de categoría/marca sube de 32 a 36px (glifo interno de ~20 a ~22px, ratio 62% constante). En superficies compactas (detalle del calendario, picker, hints) conserva 32px.
- **Ajustes por contexto** (jerarquía, no aumento uniforme): `.icon--sm` 14 → 16px (piso de nitidez); cerrar modal 18 → 20px (acción de escape, separada de las acciones de fila que siguen en 18px); ojo del hero 22 → 24px; chips de vencidos y accesos rápidos 18 → 20px (ratio 62% en caja de 32px); heroes de Ahorro/Inversión 26 → 28px; nudges con SVG 20 → 24px (iguala la masa visual con el emoji de 22px); emoji suelto en filas 18 → 20px.
- **Accesibilidad:** bajo `prefers-contrast: more` el trazo de toda la familia sube un paso (base 2.35 → 2.6, sm 2.75, lg 2) conservando la jerarquía entre escalas (bloque nuevo en `a11y.css`, que por vivir en capa superior le gana a components, esta vez a favor).
- **Rendimiento:** cero costo. Solo cambian valores CSS; el sprite, el número de peticiones y el JS quedan intactos.

**Validación:** 2103/2103 unit (incluye axe-core WCAG 2.1 AA); 147/147 E2E (incluye `reflow-320`); script de verificación de estilos computados en Chromium a 1280x800 y 390x844 (15 chequeos: nav 24px en ambos viewports, FAB 24px en círculo de 46px, teja 36px en lista y 32px suelta, glifo 22.3px, sin overflow del bottom-nav). Capturas desktop y móvil revisadas. SW v316 → v317.

| Archivo | Cambio |
|---|---|
| `styles/tokens.css` | Escala `--fk-icon-*` (7 pasos) + `--fk-teja-*` (2 tamaños). |
| `styles/components/forms.css` | `.icon` lee `--fk-icon-size`; `.icon--sm` 16px; cerrar modal 20px. |
| `styles/layout.css` | Nav 24px, hero saldo 32px y accesos 20px vía variable (antes perdían la cascada y quedaban en 20px). |
| `styles/responsive.css` | FAB al patrón de variable; `width: auto` móvil acotado al wrapper del FAB. |
| `styles/modals.css` | Menú Más, tejas de Registrar y volver al patrón de variable. |
| `styles/components/atoms.css` | Teja 36px en filas de lista; emoji de fila a 20px; base de teja tokenizada. |
| `styles/components/nudges.css` | Nudge con SVG a 24px; `bank-avatar` tokenizado. |
| `styles/components/domain.css` | Ojo del hero 24px; chip de vencidos 20px. |
| `styles/components/charts.css` | Chooser de estrategia tokenizado (28px, 24px móvil). |
| `styles/components/analysis.css` | Heroes de Ahorro/Inversión 28px. |
| `styles/a11y.css` | Bloque `prefers-contrast: more` para el trazo. |
| `docs/DESIGN_SYSTEM.md` | Sección "Escala de tamaños" con la tabla contexto → token. |
| `service-worker.js` | v316 → v317. |

---

### feat(assets): logos de marca a color, primeros glifos propios (Bancolombia, Banco de Bogotá) · 2026-07-05

Arranque del flujo de diseño en pareja (BR.3) con los primeros logos que Esteban dibujó en Illustrator. Trae una **decisión de diseño nueva**: algunas marcas cuya identidad **es** el color (Bancolombia: bandera roja/amarilla/azul sobre blanco; Banco de Bogotá: remolino con degradados sobre azul) no se pueden reducir a silueta monocroma sin perderlas. Se introduce el logo **a color** como excepción explícita a la regla de monocromo de [ADR 025](DECISIONS/025-logotipos-de-marca-y-tejas.md) (pendiente de formalizar en un ADR).

**Qué entró:**

- **Logo a color (`data-fullcolor="true"`):** un logo puede traer sus propios `fill`, su fondo y hasta `<defs>` con degradados. Su teja de catálogo se pinta del color de ese fondo (Bancolombia `#ffffff`, Banco de Bogotá `#003576`), no de un color corporativo con glifo monocromo encima. El archivo es autónomo y funciona igual en ambos temas.
- **`sync-sprite.py` extendido:** detecta `data-fullcolor`, valida con un set ampliado que admite `linearGradient`/`radialGradient`/`stop`/`defs`, y **conserva el cuerpo tal cual** (sin convertir colores) para que biblioteca y sprite queden idénticos byte a byte. Verifica además que los **IDs internos de gradiente sean únicos en todo el sprite** (los de Banco de Bogotá van prefijados `bbog-*`). Un logo a color mal formado sigue cayendo en `ErrorRecurso` (se excluye sin romper la corrida).
- **Degradados vía `<use>` verificados:** los `<defs>` viven dentro del `<symbol>` y renderizan correctamente al instanciarse con `<use>` (validado en el navegador a 16-72px, ambos temas).
- **Nequi se probó y se descartó por ahora:** el export era el wordmark completo "nequi", ilegible por debajo de ~40px (las tejas van a 16-32px). Se mantiene su glifo monocromo actual; Esteban aplicará otro diseño más adelante.
- **Tests guardarraíl:** el hermano de TX.4 (`sprite-sync.test.js`) ya cubría la igualdad biblioteca ↔ sprite; ahora valida también los dos logos a color con sus degradados. Tres fixtures que usaban Bancolombia como ejemplo de "banco sin glifo → iniciales" se migraron a Davivienda (sigue sin glifo).

**Validación:** 2103/2103 unit; 147/147 E2E; lint limpio; sync idempotente; degradados renderizando desde el sprite. SW v314 → v316.

| Archivo | Cambio |
|---|---|
| `assets/svg/logos/bancos/bancolombia.svg` | Logo a color: fondo blanco + bandera tricolor (data-fullcolor). |
| `assets/svg/logos/bancos/banco-bogota.svg` | Logo a color: fondo azul + remolino con 5 degradados (IDs `bbog-*`). |
| `scripts/sync-sprite.py` | Soporte `data-fullcolor` con degradados + chequeo de unicidad de IDs internos. |
| `modules/core/constants.js` | Bancolombia teja `#ffffff` + `simbolo`; Banco de Bogotá teja `#003576` + `simbolo`. |
| `index.html` | Sprite regenerado: `b-bancolombia`, `b-banco-bogota` (101 → 102 símbolos). |
| `tests/unit/{bancos,agenda,compromisos}.test.js` | Fixture "sin glifo" migrado de Bancolombia a Davivienda. |
| `.gitignore` | Ignora `__pycache__/` de los scripts Python. |
| `service-worker.js` | v314 → v316. |

---

### feat(assets): BR.2, script de sincronización biblioteca → sprite · 2026-07-05

Segunda tarea de la iniciativa de biblioteca gráfica (tras BR.1). `scripts/sync-sprite.py` invierte la relación: `assets/svg/` manda y el sprite de `index.html` se regenera desde ahí, cerrando el ciclo "Esteban sobrescribe un .svg en Illustrator + corre el script = la app usa el dibujo nuevo" sin tocar código.

**Qué entró:**

- **El script** recorre `iconos/{secciones,simbolos,utilitarios,categorias}` (prefijos `i-`/`c-`) y `logos/**` en cualquier subcarpeta (prefijo `b-`), excluye plantillas `data-placeholder`, convierte los 3 colores centinela de Illustrator (sección 7 del README) a los roles finales y valida el estándar técnico (raíz limpia, solo `path`/`circle`/`rect`/`line`, sin `transform`/`class`/`style`). Reescribe el bloque entre dos marcadores nuevos en `index.html` preservando el orden histórico de los ids ya publicados, así que reemplazar un archivo produce el menor diff posible; los recursos nuevos se agregan al final.
- **Dos niveles de error, a propósito:** un archivo que no cumple el estándar (`ErrorRecurso`) se excluye del sprite sin bloquear la corrida completa, exactamente como promete el README ("nada se rompe" mientras Esteban itera en Illustrator). El sync solo se detiene sin escribir nada (`ErrorProduccion`) cuando la regeneración borraría en silencio un símbolo que ya estaba publicado: ahí hay que arreglar el archivo o retirar la fila de catálogo primero.
- **Normalización pendiente de BR.1 resuelta:** `b-googlegemini` → `b-gemini` (coincide con el archivo `gemini.svg`), 1 línea en `MARCAS`.
- **Guardarraíl nuevo** (`tests/unit/sprite-sync.test.js`, hermano de TX.4): vigila que todo `<symbol>` del sprite tenga su archivo fuente y coincida byte a byte, que ninguna plantilla llegue al sprite, que no haya colisiones de id, y que todo campo `simbolo` de `MARCAS`/`BANCOS_CO` resuelva en ambos lados.
- **Hallazgo en el camino:** `assets/svg/logos/bancos/bancolombia.svg` ya tenía un export de prueba (colores reales de la marca, sin pasar la limpieza del estándar). El sync lo excluyó automáticamente sin intervención manual; Bancolombia sigue con iniciales hasta que BR.3 defina el tratamiento de logos con más de un color (la bandera de Bancolombia no es una silueta monocroma).

**Validación:** primera corrida produjo un sprite idéntico al anterior salvo el rename de Gemini. 2097 → 2103 unit (6 nuevos), 147/147 E2E, lint limpio. SW v313 → v314 (`index.html` y `constants.js` cambiaron).

| Archivo | Cambio |
|---|---|
| `scripts/sync-sprite.py` | Nuevo: script de sincronización. |
| `index.html` | Marcadores del bloque generado; 2 comentarios internos reubicados como documentación permanente; `b-googlegemini` → `b-gemini`. |
| `modules/core/constants.js` | `MARCAS.gemini.simbolo` → `b-gemini`. |
| `tests/unit/sprite-sync.test.js` | Nuevo: guardarraíl biblioteca ↔ sprite ↔ catálogos. |
| `service-worker.js` | v313 → v314. |
| `docs/BOARD.md` | Tarjeta BR.2 cerrada y borrada. |

---

### refactor(compromisos): N.4, logic.js dividido en submódulos · 2026-07-05

Cierre del plan de navegabilidad (N.1 descartada con razones, N.2 MAPA.md, N.3 tesorería, N.4 esta). `compromisos/logic.js` era, tras N.3, el último archivo gigante del proyecto: 1.517 líneas mezclando el modelo del compromiso, los detectores de alerta, todo el motor de estrategia de pago y la aritmética de abonos.

**Qué entró:**

- **4 submódulos bajo `logic/`**, con cortes que resultaron perfectamente contiguos en el original: `modelo.js` (390 líneas: catálogos de tipos, tasas EA/mensual, consultas, validación y normalización del formulario), `alertas.js` (307: fijos sin pagar este mes, deudas durmiendo, vencidos del dashboard, agrupador de prioridades), `estrategia.js` (635: simulación mes a mes Avalancha/Bola de nieve, renegociación, consolidación, motor de recomendación D.11/D.8 y reparto del extra en cuotas D.9) y `abonos.js` (213: aritmética de saldo, validación de abono, estado de pago del mes, deltas por edición de gasto).
- **Barrel con API idéntica (37 exports).** Este dominio es especial: además de sus `views/`, `index.js` y tests, lo importan `agenda/` (validar/normalizar, estado de pago), `analisis/` (totales) e `infra/notificaciones.js` (próximos vencimientos), una excepción preexistente y documentada al ADN #10. Ninguno de esos consumidores cambió ni una línea.
- **Referencias cruzadas mínimas y en una sola dirección:** alertas, estrategia y abonos importan solo de `modelo.js` (`esDeuda`, `tasaEADe`, `compromisosActivos`, `TIPOS_COMPROMISO`). Sin renombres: los privados de cada bloque (`_tasaMensualDesdeEA`, `_RX_FECHA_COMP`, umbrales) ya vivían junto a sus únicos usuarios.
- **Mismo método que N.3:** script determinista por rangos de línea, cero retranscripción manual.

Con esto, el dominio queda simétrico a su propia vista (partida en `views/` desde antes) y el proyecto ya no tiene ningún archivo de más de 900 líneas en `modules/`.

**Validación:** 2097/2097 unit, 147/147 E2E (incluida la suite `estrategia-pago` completa, 15 tests sobre la lógica financiera movida), lint limpio. **Pendiente: validación del usuario en su celular** (Deudas: crear deuda, abonar, pestaña Estrategia; sumada a la de Mis cuentas de N.3).

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic/{modelo,alertas,estrategia,abonos}.js` | Nuevos: lógica pura por subsistema (390/307/635/213 líneas). |
| `modules/dominio/compromisos/logic.js` | Reescrito como barrel (1.517 → 66 líneas). |
| `service-worker.js` | 4 archivos nuevos al precache; v312 → v313. |
| `docs/ARCHITECTURE.md`, `docs/MAPA.md` | Fila de compromisos actualizada con el corte. |
| `docs/BOARD.md` | Tarjeta N.4 cerrada y borrada. |

---

### refactor(tesoreria): N.3, dominio dividido en submódulos por subsistema · 2026-07-05

Segunda tarea del plan de navegabilidad. Tesorería concentraba los 3 archivos más grandes del proyecto (`logic.js` 1.557 líneas, `index.js` 1.521, `view.js` 1.099: 4.177 líneas en 3 archivos) y depurar cualquier cosa ahí exigía leer archivos enormes que mezclaban tres subsistemas distintos.

**Qué entró:**

- **Corte por subsistema en las tres capas.** El dominio quedó dividido en `cuentas` (cuentas bancarias, cuota de manejo sincronizada como compromiso, GMF/4x1000, bank picker), `ingresos` (recurrentes y puntuales, salario mínimo, fechas de cobro, prima de servicios, nudge de próximo cobro) y `distribucion` (el asistente "Distribuir mi ingreso" completo: contexto, sugerencia, pasos, aplicar y deshacer). Cada subsistema tiene su archivo en `logic/`, `views/` y `acciones/`: 9 submódulos nuevos, ninguno supera las 900 líneas.
- **API pública intacta vía barrels.** `logic.js` re-exporta los mismos 38 nombres de siempre y `view.js` las mismas 9 funciones de render: los tests (`tesoreria.test.js`, `flujos.test.js`) y `bootstrap.js` no cambiaron ni una línea de imports. `view.js` además expone `renderTesoreria()`, el `_renderTodo` histórico, para renderSmart y los handlers de cuentas.
- **El estado delicado del asistente quedó encapsulado.** `_snapshotDistribucion` (deshacer atómico), `_distribucionPreacreditada` (modo "ya acreditado" de NAV.A2b) y el timer del snackbar viven ahora como estado privado de `acciones/distribucion.js`, compartido solo por las funciones que de verdad lo usan.
- **Renombres mínimos** para compartir entre submódulos: `_FACTOR_MENSUAL` → `FACTOR_MENSUAL` e `_isoFecha` → `isoFecha` (internos de `logic/`, no re-exportados por el barrel), `_fechaCorta` → `fechaCorta` (entre views). Nada más cambió de nombre.
- **Método:** el split se ejecutó con un script determinista que corta el original por rangos de línea exactos (cero retranscripción manual de código). El orden de registro de acciones, listeners delegados e inyección del formulario se preservó uno a uno.
- **Patrón documentado** en `ARCHITECTURE.md` sección 2.4 y en `MAPA.md`: cuando un dominio entero crece, se corta por subsistema en las tres capas detrás de los barrels.

**Validación:** 2097/2097 unit, 147/147 E2E (incluido el flujo `distribuir:abrir` desde Calendario hasta el asistente en Mis cuentas), lint limpio. **Pendiente: validación del usuario en su celular** (sección Mis cuentas: crear/editar cuenta, ingreso puntual con oferta de distribución, asistente completo con deshacer).

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic/{cuentas,ingresos,distribucion}.js` | Nuevos: lógica pura por subsistema (307/387/883 líneas). |
| `modules/dominio/tesoreria/views/{cuentas,ingresos,distribucion}.js` | Nuevos: HTML por subsistema (265/321/538 líneas). |
| `modules/dominio/tesoreria/acciones/{cuentas,ingresos,distribucion}.js` | Nuevos: handlers por subsistema (477/362/671 líneas). |
| `modules/dominio/tesoreria/logic.js` | Reescrito como barrel (1.557 → 63 líneas). |
| `modules/dominio/tesoreria/view.js` | Reescrito como barrel + `renderTesoreria()` (1.099 → 48 líneas). |
| `modules/dominio/tesoreria/index.js` | Reescrito como coordinador (1.521 → 76 líneas). |
| `service-worker.js` | 9 archivos nuevos al precache; v311 → v312. |
| `docs/ARCHITECTURE.md`, `docs/MAPA.md` | Patrón de corte por subsistema. |
| `docs/BOARD.md` | Tarjeta N.4 (partir `compromisos/logic.js`) registrada. |

---

### docs(mapa): N.2, mapa de navegación del código · 2026-07-05

Esteban pidió reestructurar el proyecto completo (carpetas `pages/` por sección, tipo aplicación multipágina). Se descartó por análisis de impacto: rompería la SPA, el service worker y los 47 archivos de test, sin aportar nada a lo que de verdad quería resolver (ubicarse rápido en el código). Traducido a un plan de navegabilidad de 4 tareas (N.1 a N.4); N.1 (partir `styles/components/domain.css` en un archivo por dominio) también se descartó tras comprobar que todos los CSS de `styles/components/` agrupan por widget/patrón visual a propósito, no por dominio, y que varios widgets (`banner-proposito`, `cuenta-picker/multi/sel`, `abono-btn`) son compartidos entre secciones: forzar el split habría duplicado reglas o quebrado la consistencia con los archivos hermanos.

En su lugar, esta tarea crea [`docs/MAPA.md`](MAPA.md) sin tocar ni una línea de código: tabla completa sección visible → carpeta de dominio → archivos clave (`logic.js`/`view.js`/`index.js`) → archivo de estilos → test unitario; explicación de por qué "Inicio" no tiene carpeta propia (es composición de widgets de otros dominios); índice de qué agrupa cada archivo `styles/components/*.css`; y una tabla síntoma → dónde mirar para depurar sin buscar a ciegas. De paso se corrigió una nota obsoleta en `ARCHITECTURE.md` que hablaba de dos carpetas de dominio (`calculadoras/`, `exports/`) que ya no existen. Sin cambios funcionales: no aplica bump de SW ni tests nuevos.

**Validación pendiente:** ninguna en la app (documentación pura).

| Archivo | Cambio |
|---|---|
| `docs/MAPA.md` | Nuevo: índice de navegación completo del código. |
| `docs/ARCHITECTURE.md` | Nota obsoleta de carpetas vacías reemplazada por puntero a MAPA.md. |
| `CLAUDE.md` | Sección 5 (lectura obligatoria antes de tocar código): agregado MAPA.md como paso 5. |
| `docs/HANDOFF.md` | Entrada nueva al tope de "qué se hizo recientemente"; MK.2 rotó al bloque de tareas anteriores. |

---

### feat(assets): BR.1, biblioteca oficial de recursos gráficos · 2026-07-05

Arranque de la iniciativa Biblioteca de recursos gráficos ([ADR 026](DECISIONS/026-biblioteca-de-recursos-graficos.md)): Esteban pasa a diseñar personalmente los SVG del sistema en Adobe Illustrator, y para eso nace `assets/svg/` como **fuente de verdad de diseño** con estándar propio. La app no cambia en runtime: el sprite inline de `index.html` sigue siendo el mecanismo de entrega (cero peticiones, offline, theming vía `<use>`), y por eso **no hay bump de SW**.

**Qué entró:**

- **Extracción fiel del sprite:** los 100 `<symbol>` convertidos a archivos SVG individuales, byte a byte (regenerar el sprite desde ellos da el mismo resultado). Organización: `iconos/secciones` (14), `iconos/simbolos` (13), `iconos/utilitarios` (11, monolínea exentos de rediseño por la regla 4 del ADR 023), `iconos/categorias` (43) y `logos/` (19 glifos en 8 subcarpetas por sector). La carpeta define el prefijo del symbol (`i-`, `c-`, `b-`); las subcarpetas de `logos/` son organización humana y no afectan el id.
- **17 plantillas `data-placeholder="true"`** para todo lo que hoy cae a iniciales: 10 bancos CO (bancolombia, davivienda, banco-bogota, bbva, banco-popular, scotiabank-colpatria, banco-occidente, av-villas, daviplata, lulo-bank) + disneyplus, primevideo, chatgpt, xbox, claro, tigo y rappi. Son la cola de diseño; el sync futuro las excluye del sprite.
- **El estándar maestro** en `assets/svg/README.md`: retícula 24 y área viva ~21×21, roles de color (trazo desnudo / duotono 22 % / chispa), reglas para logos (silueta monocroma, color en catálogo), nomenclatura (kebab ASCII, archivo = id de catálogo), checklist de exportación de Illustrator con colores centinela (#000 trazo, #00FFFF duotono, #FF00FF chispa), flujo de revisión en pareja y recetas para agregar recursos. Sin `catalog.json`: los metadatos siguen en `constants.js`, única verdad.
- **Caso conocido documentado:** `logos/ia/gemini.svg` ↔ symbol `b-googlegemini`; BR.2 lo normaliza a `b-gemini` (1 línea en `MARCAS`).

**Validación pendiente:** ninguna en la app (cero cambios de runtime). La biblioteca se vuelve operativa con BR.2 (`scripts/sync-sprite.py`); hasta entonces el sprite manda y la biblioteca es su espejo. 2097/2097 unit.

| Archivo | Cambio |
|---|---|
| `assets/svg/**` | 117 SVG nuevos (100 extraídos + 17 plantillas) + README maestro + README de `ilustraciones/` e `identidad/`. |
| `docs/DECISIONS/026-biblioteca-de-recursos-graficos.md` | ADR nuevo. |
| `docs/ARCHITECTURE.md` | Sección 8.1 reescrita: describía la iconografía híbrida emoji/SVG, superada desde los ADR 023/025. |
| `docs/BOARD.md` | Iniciativa nueva con tarjetas BR.2 y BR.3. |

---

### style(ui): ID.5, tracking del patrimonio alineado con el hero · 2026-07-05

Micropulido tipográfico opcional. El único desajuste real tras ID.4: `.patrimonio-hero__valor` (Análisis) usaba `letter-spacing: -0.02em` mientras el hero del dashboard (`.bento__value--xl`, mismo tamaño base `--fk-text-4xl`) ya usa `-0.03em` desde ID.4. Ambas son "la cifra más grande de su pantalla", así que quedan con el mismo tracking calibrado. El eje óptico de Inter Variable (`opsz`) ya se resuelve solo: `font-optical-sizing` es `auto` por defecto y no hay ninguna regla que lo desactive, así que no requirió cambio. Verificado con `preview_inspect` (24px × 0.03 = 0.72px, coincide). 2097/2097 unit (sin cambios, ningún test fija ese valor); no requiere E2E (CSS puro, sin lógica). SW v310 → v311.

| Archivo | Cambio |
|---|---|
| `styles/components/analysis.css` | `.patrimonio-hero__valor`: tracking -0.02em → -0.03em. |
| `service-worker.js` | v310 → v311. |

---

### feat(ui): ID.3, categorías Finko v2 en tejas por dominio · 2026-07-05

Cierre de la iniciativa de identidad visual 2026-07 completa ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md) sección ID.3, [ADR 025](DECISIONS/025-logotipos-de-marca-y-tejas.md) D3): los emojis de categoría salen de la UI estructural y entran 43 símbolos nuevos `c-*` en el lenguaje v2 ("trazo cálido con chispa": duotono 22 %, chispa `var(--fk-icon-dot, currentColor)`, redondez sistemática, vértices agudos solo donde la metáfora los exige: punta de `c-avion`, play de `c-streaming`, diamante de `c-anillo`, tablero de `c-birrete`).

**Catálogos.** Los 6 `CATEGORIA_*_EMOJI` de `constants.js` se reemplazan por `CATEGORIA_*_ICONO` (categoría → id completo de `<symbol>`). Un glifo por metáfora, compartido entre catálogos cuando la etiqueta coincide (guardarraíl TX.4); 5 categorías reusan símbolos estructurales en vez de duplicar dibujo: Vivienda/Arriendo → `i-home`, Tarjeta de crédito/Cuota de manejo → `i-deudas`, Comisión → `i-percent`, Rendimientos → `i-trending-up`, interna Ahorro → `i-ahorro`. Vacaciones y Emprendimiento ganan metáfora propia (palmera y cohete): la reconciliación de emojis de MT.1 ya no las limita.

**La teja de categoría.** `tejaCategoria(id, dominio)` en `infra/icons.js` (hermana de `tejaMarca`) + `.cat-teja` en atoms.css: contenedor de 32px con fondo `--fk-dom-*` al 14 % y glifo al 100 % del color del dominio; dentro de la teja `currentColor` ES el color del dominio, así que la chispa cae a él sin declarar variable. Superficies: Gastos (naranja, hereda el glifo del compromiso de origen vía `iconoPorOrigen`, antes `emojiPorOrigen`), Ingresos fijos y puntuales (verde; las filas ganan ícono que antes no tenían), Deudas (rojo entidad / rosa personal: la teja de categoría es ahora el fallback cuando no hay marca, completando el sistema del ADR 025), Calendario (amarillo presupuesto, el color que el calendario ya usaba para "fijo"; el ingreso del día también cambia 💰 por su teja). Los contextos inline densos (título de meta junto al anillo, envelopes y alertas de Límites, checklist de Necesidades, resumen semanal, desgloses de grupos) usan el glifo a `icon--sm` sin teja.

**Selects y datos.** Los `<option>` quedan en texto plano (un `<option>` nativo no renderiza SVG, ADR 025). En Metas, `normalizarMeta` deja de almacenar el emoji de la categoría: la vista lo resuelve desde el catálogo al renderizar (las metas viejas migran solas al sprite) y el emoji manual del usuario (categoría "Otra") se conserva como dato (ADR 025 D3); las plantillas de Apartados no se tocan. TX.4 pasa a comparar ids de sprite y gana una aserción nueva: todo id referenciado existe como `<symbol>` en `index.html`.

Verificación visual: los 43 glifos renderizados con Chromium a 20px y en teja de 32px, tema claro y oscuro (4 iteraciones de diseño: la lupa de Cuidado personal se leía como símbolo de género y pasó a gota con destello; Vecino se leía como ícono de "foto" y pasó a dos casas con volumen; taza de Café ampliada; hormiga re-alineada), más un render de filas reales (`list-item`, `cal-detail`) con el CSS de producción en ambos temas. 2097/2097 unit (+3); 147/147 E2E (3 asserts de smoke actualizados a teja/sprite). SW v309 → v310. Pendiente: validación del usuario en su celular.

| Archivo | Cambio |
|---|---|
| `index.html` | 43 símbolos `c-*` nuevos; comentario del sprite actualizado (estado final de la migración). |
| `modules/core/constants.js` | `CATEGORIA_*_ICONO` reemplazan a los 6 catálogos de emoji. |
| `modules/infra/icons.js` | `iconoCategoria(id, cls)` (id completo) y `tejaCategoria(id, dominio)`. |
| `modules/dominio/gastos/logic.js` | `emojiPorOrigen` → `iconoPorOrigen` (ids de sprite). |
| `modules/dominio/gastos/view.js` | Teja en la lista; chips y `<option>` en texto plano; retirada la clase `--cat`. |
| `modules/dominio/agenda/view.js` | Teja de categoría en el detalle del día (fijos e ingreso); `<option>` plano. |
| `modules/dominio/tesoreria/view.js` | Teja en ingresos fijos/puntuales; checklist de Necesidades a `icon--sm`; selects planos. |
| `modules/dominio/metas/view.js`, `logic.js` | `_iconoMeta` (sprite por categoría, emoji del usuario en "Otra"); `normalizarMeta` sin emoji derivado. |
| `modules/dominio/compromisos/views/lista.js`, `formularios.js` | Teja de categoría como fallback sin marca; contexto y `<option>` planos. |
| `modules/dominio/presupuesto/view.js`, `modules/dominio/resumen/view.js` | Glifos `icon--sm` en envelopes, huérfanas, alertas, desgloses y categoría top. |
| `styles/components/atoms.css` | `.cat-teja` (tinte por dominio); `:has()` extendido; borrado el bloque `--cat` obsoleto. |
| `styles/components/config.css` | `:has(.cat-teja)` en el detalle del calendario; retirada `.cal-detail__icon--emoji`. |
| `tests/unit/*` (constants, gastos, agenda, compromisos, metas, tesoreria) | TX.4 con ids de sprite + guardarraíl de existencia; asserts a teja/sprite. |
| `tests/e2e/smoke.test.js` | 3 asserts de Metas y Agenda actualizados a sprite/teja. |
| `service-worker.js` | v309 → v310. |

---

### feat(ui): ID.7, símbolos estructurales al lenguaje v2 · 2026-07-05

Cierra la iniciativa de identidad visual 2026-07 ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md)): última fase pendiente tras ID.6 (piloto de navegación). Los 13 símbolos redibujados en ID.2 (`saldo`, `recurring`, `lightbulb`, `alert`, `bolt`, `trophy`, `mountain`, `circle`, `star`, `percent`, `trending-up`, `info`, `bar-chart`) heredaban el trazo 2.35 global desde ID.6 pero conservaban la geometría v1 (duotono al 15 %, punto de valor en `currentColor` plano, sin la variable de la "chispa"). Ahora quedan al día con las reglas v2: `fill-opacity=".22"` y `var(--fk-icon-dot, currentColor)` en cada punto de valor.

**Regla 5 "metáfora primero" aplicada explícitamente.** Tres símbolos mantienen vértices agudos a propósito: los picos de `i-mountain` (avalancha), la punta de `i-bolt` y las 5 puntas de `i-star`. La geometría puntiaguda ES la metáfora (un pico de montaña o una punta de estrella redondeados dejan de leerse como tales); mismo criterio que ya dejó agudo el vértice central de la porción de `i-analisis` en el piloto ID.6. Dos símbolos no llevan punto de valor adicional: `i-saldo` (el signo peso ya es la firma) e `i-star` (la estrella entera ya es el "punto"), evitando redundancia visual. `i-percent` enciende la chispa en sus **dos** círculos, ya que ambos juntos constituyen "el punto de valor" del glifo (razonamiento que ya había fijado ID.2). `i-info` mantiene su círculo exterior sin relleno duotono: distinción deliberada entre una alerta (pesada, con cuerpo) y una explicación neutra (más liviana, solo contorno).

**Redondez sistemática** aplicada donde había una esquina incidental de contenedor, sin tocar la silueta de la metáfora: el triángulo de `i-alert` (radio de esquina 2 → 2.3), las asas de `i-trophy` (2.5 → 2.9, coincide con el piso "≥ 2.9" que fija la regla 2 del ADR) y las barras de `i-bar-chart` (rx 1 → 2, esquinas tipo cápsula: la mitad exacta del ancho de la barra, extremos en semicírculo). El resto de los símbolos (saldo, recurring, lightbulb, circle) ya tenía geometría curva sin vértices que rectificar.

Verificación: los 13 símbolos se renderizaron aislados en el preview a 20px y 48px, en tema claro y oscuro, confirmando que ningún path quedó roto y que la lectura de cada metáfora se conserva. Guardarraíl nuevo en `tests/unit/icons.test.js`: ningún símbolo recalentado conserva `fill-opacity=".15"` (v1), todo punto de valor enciende la chispa salvo las dos excepciones documentadas, y `mountain`/`bolt`/`star` no usan comandos de arco en el path de su silueta principal (verificación mecánica de que la regla 5 no se rompe accidentalmente a futuro).

2094/2094 unit (+6, suite nueva de guardarraíles del sprite); 147/147 E2E sin cambios (no hay lógica de dinero involucrada). SW v308 → v309.

| Archivo | Cambio |
|---|---|
| `index.html` | 13 símbolos `i-*` recalentados a v2 (duotono 22 %, chispa, radios de esquina); comentario del sprite actualizado con el estado de migración. |
| `tests/unit/icons.test.js` | Suite nueva: duotono/chispa por símbolo, excepciones documentadas, vértices agudos preservados, cápsula de `bar-chart`. |
| `docs/DECISIONS/023-lenguaje-de-iconografia-propio.md` | Sección "ID.7" con el razonamiento de cada decisión de geometría. |
| `docs/BOARD.md` | Tarjeta ID.7 borrada; nota de la iniciativa actualizada (cerrada salvo ID.3). |
| `service-worker.js` | v308 → v309. |

---

### feat(ui): MK.2, detección de marca por nombre en fijos, suscripciones y deudas · 2026-07-05

Segunda fase del [ADR 025](DECISIONS/025-logotipos-de-marca-y-tejas.md) (D4): la teja de marca llega a los nombres libres. Módulo nuevo `infra/marcas.js` con `resolverMarca(texto)`: normaliza el texto del usuario (minúsculas, sin tildes, signos a espacio) y lo compara contra aliases por **palabra o frase completa**, nunca substring ("Netflix Premium" resuelve a Netflix; "clarooscuro" NO resuelve a Claro). Busca primero en el catálogo nuevo `MARCAS` y después en `BANCOS_CO` (solo bancos y billeteras, con el id como alias implícito: una deuda "Tarjeta Bancolombia" hereda la identidad del banco; Efectivo y Otro quedan excluidos porque "otro" es palabra común). Sin match devuelve null y el consumidor cae a su ícono de categoría o de tipo: el fallback automático del ADR.

**Catálogo `MARCAS` (24 marcas).** 17 con glifo oficial de **Simple Icons 16.25.0** (CC0), descargados de la versión fijada y copiados por script, sin transcripción manual (regla de fidelidad D5): Netflix, Spotify, YouTube, HBO Max, Crunchyroll, iCloud, Apple, Claude, Gemini, Google, PayPal, Mercado Pago, Movistar, Uber, PlayStation, Duolingo y Platzi. Hallazgo de cobertura: el CDN con `@latest` servía **caché vieja de la v15**; contra la versión vigente real, OpenAI, Amazon, Prime Video y Xbox ya **no están** en Simple Icons (retiros posteriores al análisis del ADR), y Disney+, Claro, Tigo y Rappi nunca estuvieron. Esas 7 entran con iniciales sobre su color (el fallback natural de D2): ChatGPT, Prime Video, Disney+, Claro, Tigo, Rappi y Xbox. Rappi verificado en `#FF441F` contra el theme-color de su propio sitio; Disney+, ChatGPT, Claro, Tigo, Prime Video y el fondo de Platzi quedan como aproximaciones documentadas en el JSDoc (mismo tratamiento que tuvo Nequi antes de MK.1).

**Consumidores.** Calendario (detalle del día): la teja de marca gana al emoji de categoría; con categoría predefinida el nombre del usuario vive en `nota` (AG.4), así que se buscan `descripcion` y `nota` juntas ("Streaming" + nota "Netflix" resuelve). Deudas (lista): la teja reemplaza al ícono genérico del tipo cuando el nombre menciona una marca o un banco. Cambio de convivencia necesario: el **badge de orden de la estrategia ya no reemplaza al ícono** (antes `badge || icono`, y como casi toda deuda activa es "pagable", la teja jamás se habría visto); ahora se superpone reducido (18px) en la esquina de la teja o del ícono, con aro del color de la superficie. La card de estrategia sigue usando el badge a tamaño completo.

**Unificación de render.** `bancoAvatar()` de `infra/bancos.js` ahora delega en `tejaMarca()` de `marcas.js`: un solo render de teja en toda la app, mismo HTML (`.bank-avatar`, glifo al ~62% o iniciales, colores inline). `BANCOS_CO` gana el campo opcional `aliases` (bbva, scotiabank, colpatria, av villas, nu, lulo) para los nombres cortos con que el usuario escribe su banco.

Guardarraíles nuevos en tests: todo alias debe venir ya normalizado, ningún alias puede repetirse entre marcas ni chocar con un banco, y todo `simbolo` declarado debe existir como `<symbol>` en el sprite. 2088/2088 unit (+32: suite nueva `marcas` con 25, +4 en `agenda`, +3 en `compromisos`); 147/147 E2E sin cambios. SW v307 → v308. Pendiente: validación del usuario en su celular (calidad visual de los glifos y del badge superpuesto).

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | Catálogo `MARCAS` (24 entradas) + campo `aliases` en `BANCOS_CO`. |
| `index.html` | 17 símbolos `b-*` nuevos en el sprite (Simple Icons 16.25.0, insertados por script). |
| `modules/infra/marcas.js` | Módulo nuevo: `normalizarAlias`, `resolverMarca`, `tejaMarca`. |
| `modules/infra/bancos.js` | `bancoAvatar()` delega en `tejaMarca()` (render único de teja). |
| `modules/dominio/agenda/view.js` | Teja de marca como ícono principal del detalle del día (descripcion + nota). |
| `modules/dominio/compromisos/views/lista.js` | Teja de marca en la card de deuda; badge de orden superpuesto, ya no excluyente. |
| `styles/components/atoms.css` | Badge de orden reducido y superpuesto en la esquina del ícono. |
| `styles/components/config.css` | `.cal-detail__icon:has(.bank-avatar)`: apaga el tinte del tipo bajo la teja. |
| `tests/unit/marcas.test.js` | Suite nueva (25 tests): normalización, resolución, integridad del catálogo, teja. |
| `tests/unit/agenda.test.js`, `tests/unit/compromisos.test.js` | Tests de integración de la teja en ambas vistas (+7). |
| `service-worker.js` | Precache de `marcas.js`; v307 → v308. |

---

### feat(ui): MK.1, teja de marca con glifos oficiales en Mis cuentas · 2026-07-04

Primera implementación del [ADR 025](DECISIONS/025-logotipos-de-marca-y-tejas.md) (D1/D2). El avatar de banco evoluciona a **teja de marca**: `BANCOS_CO` gana el campo opcional `simbolo` (id de `<symbol>` del sprite) y `bancoAvatar()` renderiza el glifo oficial cuando existe, o las iniciales sobre el color corporativo como fallback. La clase `.bank-avatar` y la firma de la función se conservan, así que los tres consumidores (lista de cuentas de Mis cuentas, picker de cuentas, hints de formularios) reciben el cambio sin tocarse.

**Glifos que entraron (regla de fidelidad ADR 025 D5: nunca inventar un logo de memoria):**

- `b-nequi`: isotipo oficial verificado contra el vector real (cuadrado redondeado magenta). De paso se corrigieron los colores del catálogo a los oficiales: fondo berenjena `#200020` y glifo magenta `#CA0080` (antes un morado aproximado `#9C00FF`).
- `b-nubank`: path oficial tomado de Simple Icons (CC0), verbatim.
- Efectivo reusa el icono estructural `i-saldo` (no es una marca).
- **Quedan con iniciales** (fallback previsto por el ADR): Bancolombia, Davivienda, DaviPlata, Banco de Bogotá y el resto. Motivo documentado: DaviPlata resultó ser solo wordmark (sin isotipo), y para Davivienda/Bancolombia no hubo referencia vectorial confiable en las fuentes consultadas. Cada glifo futuro cuesta 1 `<symbol>` + 1 campo `simbolo`.

Detalles técnicos: los `b-*` son de relleno (`fill="currentColor" stroke="none"` en el path, que le gana al `fill:none` de `.icon`); el glifo ocupa ~62% de la teja; hairline `--fk-border-subtle` en la teja para que las marcas oscuras (Nequi) no se fundan con el tema oscuro. Guardarraíl nuevo en tests: todo `simbolo` declarado debe existir como `<symbol>` en `index.html`.

2056/2056 unit (+13, suite nueva `bancos`); 147/147 E2E sin cambios. SW v306 → v307. Pendiente: validación del usuario en su celular (calidad visual de los glifos a tamaño real).

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | Campo `simbolo` en `BANCOS_CO` (Nequi, Nubank, Efectivo) + colores oficiales de Nequi + JSDoc con la regla de fidelidad. |
| `index.html` | Símbolos `b-nequi` y `b-nubank` en el sprite (prefijo `b-*` nuevo, ADR 025). |
| `modules/infra/bancos.js` | `bancoAvatar()` renderiza glifo del sprite o iniciales (teja de marca). |
| `styles/components/nudges.css` | `.bank-avatar__glifo` (~62%) + hairline; comentario actualizado. |
| `modules/dominio/tesoreria/view.js` | Comentario del wrapper actualizado (teja, no "avatar circular"). |
| `tests/unit/bancos.test.js` | Suite nueva (13 tests): glifo/fallback/colores/aria/guardarraíl del sprite. |
| `service-worker.js` | v306 → v307. |

---

### docs(adr): ADR 025, logotipos de marca y tejas unificadas · 2026-07-04

Replanteo de la tarjeta ID.3 pedido por el usuario al arrancarla: siempre que un servicio o entidad tenga identidad visual reconocida (Netflix, Spotify, Nequi, Bancolombia, Claude...), mostrar su **logotipo oficial** en lugar de un icono genérico; las categorías sin marca siguen con iconos; un solo sistema visual, escalable por catálogo y con fallback automático. Pidió además el análisis fundamentado del paquete de iconos que mejor conviva con logotipos.

**Análisis (con verificación real):** Simple Icons (CC0, glifos de marca monocromos con color oficial) cubre las marcas globales pero **no** la banca colombiana: Nequi, Daviplata, Bancolombia, Davivienda, Banco de Bogotá y Rappi devuelven 404 (verificado archivo por archivo; la primera consulta al listado devolvió un falso "todo existe" y se descartó). Ningún paquete cubre el corazón de Finko, así que adoptar uno completo era imposible. Además, Finko ya hacía identidad de marca a medias con el patrón correcto: `BANCOS_CO` (color corporativo + color de texto) y `bancoAvatar()` con iniciales.

**Decisión ([ADR 025](DECISIONS/025-logotipos-de-marca-y-tejas.md)):** el unificador no es un paquete de iconos, es la **teja** (contenedor único de 40/32px). Dentro conviven dos especies: marca = glifo monocromo sobre fondo sólido de su color oficial (Simple Icons curado para globales + glifos propios para la banca CO); categoría = Finko Icons v2 sobre tinte `--fk-dom-*` con chispa (la dirección C del ADR 023, sin cambios). Resolución automática: catálogo `MARCAS` + `resolverMarca(texto)` por aliases, con fallback a categoría. Marco legal documentado (CC0 + uso nominativo, D5). Emojis de celebración conservados (D6, decisión que la antigua ID.3 dejaba abierta). La decisión de ID.6 (lenguaje propio) sale reforzada: se descartó explícitamente volver a un paquete genérico.

Solo docs, sin código: tests (2043 unit, 147 E2E) y SW (v306) sin cambios.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/025-logotipos-de-marca-y-tejas.md` | ADR nuevo (contexto con cobertura verificada, D1 a D6, alternativas, fases). |
| `docs/BOARD.md` | ID.3 re-cortada en MK.1 (tejas + banca CO, prioridad alta), MK.2 (marcas globales por alias) e ID.3 (categorías v2 en tejas); nota de la iniciativa actualizada. |
| `docs/HANDOFF.md` | Entrada nueva; NAV.A2a movida a la línea de tareas anteriores. |

---

### feat(nav): NAV.C, pulidos de navegación · 2026-07-04

Cierra la iniciativa de navegación 2026-07 ([ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md) D6), última tarjeta pendiente tras NAV.A1, NAV.A2a, NAV.B y NAV.A2b. Tres pulidos acotados, sin lógica nueva:

**Toast de logro retrasado.** El logro "Primer paso" (`s.onboarded === true`) se cumple en el instante en que el usuario termina el wizard, así que su toast con confetti aparecía pisando el cierre del modal de onboarding, la guía del hero vacío ("registrá tus cuentas en Tesorería") y una posible exploración inmediata de la hoja "Registrar" o el modal "Más". El listener de `onboarding:completado` en `logros/index.js` ahora envuelve `_checkYMostrar` en un `setTimeout` de 4 segundos; el resto de logros (disparados por `state:change`) siguen apareciendo al instante.

**Nombre del grupo del sidebar desktop.** Al disolver "Herramientas" en NAV.B, Análisis quedó dentro del grupo "Gestión" junto a Mis cuentas, Me deben y Límites de gasto, pero ese nombre ya había sido señalado como poco predictivo (motivo por el que el modal "Más" lo había retirado en NAV.B, ADR 024 D5). Se renombra a **"Seguimiento"**, que describe mejor el hilo común: monitorear saldos, deudas a favor, topes y análisis, en vez de accionar sobre ellos.

**Banner de propósito de Apartados.** Excedía el objetivo de 40 a 60 palabras de [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md) por un buen margen (83 palabras, el único de las 11 secciones fuera de rango). Se recortó a 58 palabras quitando ejemplos redundantes de la lista de gastos previsibles, manteniendo los tres tiempos (pregunta, problema, solución) y la mención al SOAT que ya cubría un test unitario.

2043/2043 unit; 147/147 E2E (se actualizó el texto de grupo esperado en `hub-ahorros.test.js`; sin tests nuevos, los tres cambios son de copy/timing sin lógica de dinero). SW v305 → v306.

| Archivo | Cambio |
|---|---|
| `modules/dominio/logros/index.js` | Retraso de 4s (`RETRASO_TOAST_ONBOARDING_MS`) en el toast disparado por `onboarding:completado`. |
| `index.html` | Grupo del sidebar "Gestión" → "Seguimiento" (comentario actualizado). |
| `modules/ui/proposito.js` | Texto de `PROPOSITOS_SECCION.apartados` recortado de 83 a 58 palabras. |
| `tests/e2e/hub-ahorros.test.js` | Nombre de grupo esperado actualizado en el test de sidebar desktop. |
| `service-worker.js` | v305 → v306. |

---

### feat(nav): NAV.A2b slice 2, oferta de distribución tras un ingreso · 2026-07-04

Cierre de NAV.A2b ([ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md) D3). Tras registrar un ingreso puntual (que ya subió el saldo de su cuenta en NAV.A1), Finko ofrece repartirlo con el asistente "Distribuir mi ingreso" de Mis cuentas. Es la pieza de lógica de dinero que se había separado a propósito del slice 1.

**El problema y el modo "ya acreditado":** `_confirmarDistribucion` acreditaba la cuenta con `saldo + monto - lo que sale` porque el asistente asumía que el cobro recurrente del mes **aún no había entrado**. Un ingreso puntual ya acreditó su cuenta al registrarse, así que abrir el asistente con ese monto y confirmar habría **duplicado el abono** (el saldo subiría dos veces). El modo nuevo (`_distribucionPreacreditada`):

- **No re-acredita:** `creditoIngreso = 0`, así el saldo solo baja por lo que se reparte a Necesidades/deudas/otras cuentas (el aporte al fondo no descuenta, ADR 009). El dinero ya estaba en la cuenta.
- **Usa la cuenta del ingreso como origen** (no vuelve a preguntar con `resolverCuenta`). Si esa cuenta se borró entre registrar y distribuir, cae al flujo normal para no perder el reparto.
- **No consume el periodo del ingreso recurrente** (`ultimaDistribucionPeriodo`): ese guard de de-duplicación es del salario mensual; un ingreso puntual es un evento aparte y no debe ocultar la distribución del recurrente.

**La oferta:** tras guardar el ingreso puntual (venga de la hoja "Registrar" o de "+ Ingreso" en Mis cuentas), un diálogo pregunta "¿Repartirlo ahora?". Al aceptar, reusa el evento `distribuir:abrir` (el mismo del recordatorio del Calendario, ADR 021) con un payload `preacreditado`: navega a Mis cuentas, abre el asistente y pre-carga el monto y la cuenta del ingreso. Solo se ofrece si el asistente existe (requiere un ingreso recurrente registrado: el panel no se renderiza sin `estimarSalarioMensual > 0`). El modo es de un solo uso: se limpia al confirmar la distribución y al abrir el asistente a mano (toggle), para no filtrarse a una distribución normal posterior.

Verificado con E2E (el preview del entorno sigue con caché de módulos envenenado). El test clave de no-doble-abono: registrar $1.000.000 sobre una cuenta de $1.000.000 (saldo → $2.000.000), distribuir pagando un fijo de $800.000, y confirmar que el saldo queda en **$1.200.000** (no $3.000.000, que sería el doble abono); además el periodo recurrente no se marca. 2043/2043 unit; **147/147 E2E** (+3, nueva suite `registrar-distribucion`); el flujo normal de distribución (incluido el recordatorio ADR 021) sigue verde sin cambios. SW v304 → v305.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/index.js` | Estado `_distribucionPreacreditada`; `_ofrecerDistribucion` + `_hayAsistenteDistribucion` tras el ingreso; modo "ya acreditado" en `_confirmarDistribucion` (crédito, origen y guard de periodo); `_abrirAsistenteDistribucion` acepta `{preacreditado}` y pre-carga el monto; `distribuir:abrir` con payload; toggle manual limpia el modo. |
| `service-worker.js` | v304 → v305. |
| `tests/e2e/registrar-distribucion.test.js` | Suite nueva (3 tests): no-doble-abono, "Ahora no" no abre el asistente, sin ingreso recurrente no se ofrece. |

---

### feat(nav): NAV.A2b slice 1, Abono a deuda y Aporte a ahorro en la hoja "Registrar" · 2026-07-04

Primer corte de NAV.A2b ([ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md) D2). La hoja "Registrar" (que en NAV.A2a quedó con Gasto e Ingreso) suma las dos acciones que dependen de los datos del usuario y necesitan elegir un destino:

- **Abono a deuda:** aparece solo si hay al menos una deuda activa con saldo pendiente (espejo de la condición del botón "Abonar" de la lista de Deudas).
- **Aporte a ahorro:** aparece solo si hay fondo de emergencia activo, alguna meta no completada o algún apartado. Inversión queda fuera (ADR D2: no tiene flujo de aporte incremental, solo "nueva inversión").

**Cómo funciona sin acoplar dominios:** módulo nuevo `ui/registrar.js` que lee `S` directamente (permitido para el shell, igual que el consolidado de ahorro; no importa ningún dominio, regla ADN #10) y reusa la acción built-in `registrar-abrir` incrustando el `data-id` del destino elegido. Así cada flujo de dinero ya existente (`abrir-abono`, `ahorro-nuevo-aporte`, `abonar-meta`, `aportar-apartado`) corre exactamente igual que desde su sección y acredita o descuenta la cuenta como siempre: **cero lógica de dinero nueva en este slice.**

**Patrón 0/1/varias** (el mismo de `cuenta-helper` para el origen del dinero): 0 destinos → la teja no aparece; 1 destino → la teja enruta directo (con el `data-id` ya incrustado); 2+ → la teja abre el selector "¿a cuál?" dentro de la misma hoja (vista destino con lista + "Volver"), sin anidar modales. El botón central "+" pasa de `modal-open` a la acción nueva `registrar-abrir-hoja`, que reconstruye las tejas dinámicas desde `S` cada vez que la hoja se abre.

**Diferido a slice 2 (nueva sesión):** la oferta del asistente de distribución tras registrar un ingreso, que necesita el modo "ya acreditado" en `_confirmarDistribucion` para no duplicar el abono (la trampa documentada en ADR 024 D3). Es la pieza de lógica de dinero riesgosa, aislada a propósito.

El preview del entorno quedó con caché de módulos envenenado (ni recarga ni reinicio del server la bustan, síntoma ya documentado); verificado con E2E en Chromium fresco: la hoja muestra las 4 tejas con datos, el selector lista los destinos correctos y enruta a cada modal, y el caso de 1 destino salta el selector. 2043/2043 unit (+6, `registrar.test.js` cubre `destinosAbono`/`destinosAporte`); **144/144 E2E** (+6, nueva suite `registrar-destinos`); lint limpio; axe sobre el HTML estático sin violaciones. SW v303 → v304.

| Archivo | Cambio |
|---|---|
| `modules/ui/registrar.js` | Módulo nuevo: `destinosAbono`/`destinosAporte` (puras) + tejas dinámicas + selector de destino + acciones `registrar-abrir-hoja`/`registrar-elegir-destino`/`registrar-volver`. |
| `index.html` | Hoja con vista raíz (`#registrar-grid`) + vista destino; "+" del nav → `registrar-abrir-hoja`. |
| `modules/ui/bootstrap.js` | `initRegistrar()` tras `initMenuMas()`. |
| `styles/modals.css` | Tintes de las tejas Abono (deudas) / Aporte (ahorro) + estilos del selector de destino. |
| `service-worker.js` | Precache de `modules/ui/registrar.js`; v303 → v304. |
| `tests/unit/registrar.test.js` | Suite nueva (6 tests): destinos de abono y aporte, filtros y bordes. |
| `tests/e2e/registrar-destinos.test.js` | Suite nueva (6 tests): tejas condicionales, selector, enrutado a cada modal, 0/1/varias. |

---

### feat(nav): NAV.B, hub "Ahorros" con pestañas y consolidado · 2026-07-04

Tercera tarea del [ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md) (decisiones D4, D5 y D6). "¿Dónde están mis ahorros?" tenía cuatro respuestas que competían sin jerarquía; ahora tiene una:

- **Modal "Más" plano (D5):** baja de 10 tarjetas en 3 grupos a **7 tarjetas en una sola cuadrícula** (Deudas, Mis cuentas, Ahorros, Límites de gasto, Me deben, Análisis, Ajustes). La tarjeta única "Ahorros" reemplaza a Ahorro/Metas/Apartados/Inversión y entra al hub por `#ahorro`. Desaparecen los rótulos "Gestión"/"Crecer"/"Herramientas".
- **Franja de pestañas (D4):** `Fondo · Metas · Apartados · Inversión` en la cabecera de las 4 secciones. Son enlaces estáticos entre las secciones existentes presentados como tabs (componente `.hub-tabs`, la actual marcada con `aria-current="page"`): **cero cambios de router**, los deep links `#ahorro/#metas/#apartados/#inversion` siguen intactos, cero JS nuevo.
- **Consolidado como cabecera común (D4 + ADR 009):** el "Tu ahorro total" que vivía solo en Ahorro ahora se dibuja en las 4 secciones vía slots `[data-hub-consolidado]` del shell. `renderResumenAhorroConsolidado()` llena todos los slots y omite el enlace "Ver" del vehículo de la sección actual; `ahorro/index.js` lo renderiza al navegar a cualquier hash del hub. Sigue oculto si el total es 0.
- **Renombre (D4):** la sección "Ahorro" pasa a llamarse **"Fondo de emergencia"** (tab: "Fondo"); se actualizó el copy que la nombraba (propósito de sección, tips de Metas/Inversión, nudge de Inversión, hint del logro "Red de seguridad").
- **Sidebar desktop (D6):** el grupo "Crecer" pasa a "Ahorros" (conserva las 4 entradas directas); "Herramientas" se disuelve y Análisis se integra a "Gestión" (el nombre de ese grupo se revisa en NAV.C).
- **De paso:** `MAS_SECTIONS` en `shell.js` no incluía `apartados` ni `inversion`, así que el botón "Más" no se resaltaba como activo en esas secciones (bug preexistente, corregido); y se retiró el código muerto del toggle de tema en `menu-mas.js` (el botón `#menu-mas-tema` ya no existe en el HTML).

Podría afectar: navegación móvil y desktop, y el render de las secciones del hub (el consolidado ahora también se dibuja en Metas/Apartados/Inversión). Verificado en preview (móvil 375px: pestañas, consolidado en Metas con enlaces correctos, modal de 7; desktop: grupos del sidebar) y con la suite nueva. 2037/2037 unit; **138/138 E2E** (+7, nueva suite `hub-ahorros`). SW v302 → v303. Validación pendiente: la del usuario en su celular.

| Archivo | Cambio |
|---|---|
| `index.html` | Pestañas `.hub-tabs` + slots `[data-hub-consolidado]` en las 4 secciones, título "Fondo de emergencia", modal Más plano de 7, sidebar reorganizado. |
| `modules/dominio/ahorro/view.js` | `renderResumenAhorroConsolidado()` multi-slot con `_htmlConsolidado(total, desglose, seccionActual)`. |
| `modules/dominio/ahorro/index.js` | `_renderSegunSeccion()`: panel en `#ahorro`, consolidado en los 4 hashes del hub. |
| `modules/ui/shell.js` | `MAS_SECTIONS` + `apartados`/`inversion`. |
| `modules/ui/menu-mas.js` | Limpieza: solo cierra el modal al navegar (código de tema muerto retirado). |
| `modules/ui/proposito.js` | Copy de `ahorro`: "¿Para qué sirve el Fondo de emergencia?". |
| `modules/dominio/{metas,inversiones}/view.js`, `modules/dominio/{inversiones,logros}/logic.js`, `modules/core/constants.js` | Menciones a la sección "Ahorro" actualizadas (pestaña Fondo / sección Ahorros). |
| `styles/layout.css`, `styles/modals.css` | Componente `.hub-tabs`; estilos de `.menu-mas__group*` retirados. |
| `tests/e2e/hub-ahorros.test.js` | Suite nueva (7 tests): modal de 7, navegación por pestañas, consolidado visible/oculto, resaltado de "Más", sidebar desktop. |
| `service-worker.js` | v302 → v303. |

---

### feat(nav): NAV.A2a, bottom nav de 5 con botón central "Registrar" · 2026-07-04

Segunda tarea del [ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md). El bottom nav móvil pasa de 4 a 5 posiciones: `Inicio · Gastos · [+] · Calendario · Más`. El "+" central es un FAB de acento (acción, no sección) que abre la hoja "¿Qué quieres registrar?" con dos tejas: **Gasto** (naranja, "una compra o pago") e **Ingreso** (verde, "dinero que recibiste"). Resuelve el hallazgo H1/H2 de la auditoría: registrar entró/salió deja de vivir solo en el botón de la esquina superior y queda siempre en la zona del pulgar, desde cualquier pantalla.

La hoja enruta con una acción built-in `registrar-abrir` en `actions.js` (paralela a `ir-a-seccion`): cierra la hoja e invoca por nombre la acción destino ya registrada (`nuevo-gasto`, `nuevo-ingreso-puntual`), sin anidar modales ni acoplar dominios; no hizo falta el módulo `ui/registrar.js` que el ADR anticipaba.

**Alcance (subset más pequeño con sentido):** la hoja lleva solo las dos acciones globales autocontenidas. "Abono a deuda" y "Aporte a ahorro" se separaron a NAV.A2b: no son globales (los flujos actuales exigen elegir la deuda/meta/apartado por `data-id`, un selector de destino que aún no existe y que encaja con el hub de NAV.B). La oferta de distribución sigue diferida (modo "ya acreditado" del asistente, ADR 024 D3).

**Cierra [BUG-010]:** el bottom nav ahora compensa `env(safe-area-inset-bottom)` (altura + `padding-bottom`) y `.main-content` deja libre ese alto; en iPhone con home indicator los labels ya no quedan bajo la franja del sistema.

Verificado en móvil 390x844 (nav en el orden correcto, la hoja abre y enruta a Gasto e Ingreso sin errores) y a 320px (sin scroll horizontal). 2037/2037 unit; **131/131 E2E** (+3, nueva suite `registrar-sheet`); lint limpio. SW v301 → v302.

| Archivo | Cambio |
|---|---|
| `index.html` | Símbolo `i-plus`, botón central "Registrar" en el nav, hoja `modal-registrar`. |
| `modules/ui/actions.js` | Acción built-in `registrar-abrir` (cierra la hoja e invoca la acción destino). |
| `styles/responsive.css` | Fix BUG-010 (safe area en `.sidebar` y `.main-content`) + FAB `.nav-item--registrar`. |
| `styles/modals.css` | Hoja "Registrar": grid de 2 tejas, descripciones y tintes gasto/ingreso. |
| `tests/e2e/registrar-sheet.test.js` | Suite nueva (3 tests): nav de 5, hoja abre y enruta a Ingreso y a Gasto. |
| `service-worker.js` | v301 → v302. |

---

### feat(tesoreria): NAV.A1, ingreso puntual en Mis cuentas · 2026-07-04

Primera tarea de implementación del [ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md). La auditoría detectó que registrar dinero que entra no tenía camino real: la única acción era la fuente fija (`nuevo-ingreso`), escondida y sin fecha ni cuenta. Ahora Mis cuentas tiene una sub-sección "Otros ingresos" con un botón "+ Ingreso" que abre "Registrar un ingreso": monto, cuenta destino (selector 0/1/varias de `cuenta-helper`; con 0 cuentas, guía a agregar una), descripción y categoría opcionales, y fecha (hoy por defecto).

Decisiones de datos y alcance (ver ADR 024 D3, revisado): colección nueva `S.ingresosPuntuales` (migración v21→v22 idempotente), no reutilizar `S.ingresos` (plantillas recurrentes, otro shape). El registro **acredita el saldo** de la cuenta destino y eliminarlo lo **revierte**, espejo exacto de un gasto (que descuenta y devuelve). Respeta la v8.8: el ingreso se refleja por su efecto (hero "Tu dinero disponible" y patrimonio neto), **no** como flujo en Análisis ni en el resumen semanal, que no cambian. La oferta del asistente de distribución al confirmar quedó **diferida a NAV.A2**: `_confirmarDistribucion` re-acredita la cuenta, así que abrirlo con el monto ya acreditado duplicaría el abono; unificar los flujos es propio de la hoja "Registrar".

Verificado en la app (móvil 390x844): saldo 100k → 350k al registrar $250k, hero muestra $350.000, y al eliminar vuelve a 100k con 0 registros; cero errores de consola. 2037/2037 unit (+13); 128/128 E2E; lint limpio. SW v300 → v301.

| Archivo | Cambio |
|---|---|
| `modules/core/state.js` | Slice `ingresosPuntuales` + typedef `IngresoPuntual`. |
| `modules/core/storage.js` | `SCHEMA_VERSION` 22 + migración v21→v22. |
| `modules/dominio/tesoreria/logic.js` | `validarIngresoPuntual` + `normalizarIngresoPuntual` (puras). |
| `modules/dominio/tesoreria/view.js` | `renderFormIngresoPuntual` + `renderListaIngresosPuntuales`. |
| `modules/dominio/tesoreria/index.js` | Handlers nuevo/guardar/eliminar + acredita/revierte saldo + acciones + EventBus. |
| `index.html` | Sub-sección "Otros ingresos" + modal `modal-ingreso-puntual`. |
| `styles/layout.css`, `styles/components/atoms.css` | `.section__sub-hint` + `.list-item__value--in` (verde). |
| `tests/unit/tesoreria.test.js`, `tests/unit/storage.test.js` | +13 tests (validar/normalizar + migración v22). |
| `service-worker.js` | v300 → v301. |

---

### docs(nav): auditoría de navegación móvil, ADR 024 y tarjetas NAV · 2026-07-04

Auditoría completa de la navegación móvil con ojos de usuario nuevo (viewport 390x844 con Playwright, localStorage limpio) más lectura del código de navegación. Resultado del test de orientación (8 preguntas): 3 evidentes, 3 a medias, 2 fallidas. Hallazgos principales: no existe registro de ingreso puntual y el ingreso fijo vive escondido en Mis cuentas (asimetría entró/salió); no hay acción de registro global y los CTA de alta viven en la peor zona del pulgar; 10 de 13 secciones detrás del modal "Más"; el dinero guardado repartido en 4 secciones sin jerarquía; la barra inferior no compensa el safe area de iOS (registrado como BUG-010).

Decisión aprobada en [ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md): bottom nav de 5 posiciones con botón central "Registrar" (hoja con Gasto/Ingreso siempre y Abono/Aporte por divulgación progresiva), ingreso puntual como capacidad nueva de `tesoreria`, hub "Ahorros" (una entrada, cuatro pestañas, consolidado de ADR 009 como cabecera, sin fusionar dominios), modal "Más" plano de 7 tarjetas y pulidos. Revisa a nivel de navegación la decisión 2026-06 de no fusionar las 4 secciones de ahorro; los dominios no se tocan.

Solo documentación: ninguna funcionalidad afectada. Validación pendiente: ninguna (la implementación arranca con NAV.A1).

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/024-reorganizacion-navegacion-movil.md` | ADR nuevo: contexto (auditoría), decisión D1 a D6, alternativas, slices. |
| `docs/BOARD.md` | Iniciativa de navegación 2026-07: tarjetas NAV.A1, NAV.A2, NAV.B y NAV.C. |
| `docs/BUGS.md` | BUG-010 registrado (safe area del bottom nav). |
| `docs/HANDOFF.md` | Entrada en "Qué se hizo recientemente". |

---

### feat(ui): ID.6, Finko Icons v2 "trazo cálido con chispa" con piloto en la navegación · 2026-07-04

Revisión del lenguaje de iconografía ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md), sección "Revisión v2"). Al arrancar ID.3, el usuario replanteó el sistema: el lenguaje v1 (trazo 2, duotono 15 %, punto monocromo) cumplía pero se percibía neutro y frío. Tras análisis de mercado y 3 direcciones dibujadas sobre la paleta real, se adoptó la dirección A ("trazo cálido con chispa") combinada con C (insignias por dominio, para las categorías de ID.3); la B (sello sólido) se descartó por pesada en listas densas.

Reglas v2: trazo 2.35 global vía CSS `.icon` (`--sm` 2.5, `--lg` 1.8; toda la familia gana cuerpo en un solo cambio), redondez sistemática (radios ≥ 2.9, ápices con arco), duotono al 22 %, y **la chispa**: el punto de valor pasa a `fill="var(--fk-icon-dot, currentColor)"` y el contexto lo enciende en color. La navegación lo pone en acento: item inactivo gris con chispa verde viva (firma visible de la familia); sin variable declarada cae a `currentColor`, cero regresión y cero JS.

Piloto: los 14 símbolos de navegación redibujados en v2. Cambio de metáfora en Inversión: de zigzag con flecha a curva suave ascendente con la chispa en el extremo (progreso calmado). Verificado en preview (tema oscuro y claro: chispa `#1fd194` / `#13b377`, trazo computado 2.35px). 2024/2024 unit; 128/128 E2E. SW v299 → v300.

**Pendiente de validación:** revisión visual del usuario en su celular (nav inferior, modal "Más", empty states con trazo 1.8).

| Archivo | Cambio |
|---|---|
| `index.html` | 14 símbolos de navegación redibujados en v2; comentario del sprite actualizado. |
| `styles/components/forms.css` | `.icon` a trazo 2.35; `.icon--sm` 2.5; `.icon--lg` 1.8. |
| `styles/layout.css` | `--fk-icon-dot: var(--fk-accent)` en `.nav-item__icon.icon` (chispa encendida en nav). |
| `docs/DECISIONS/023-...md` | Sección "Revisión v2" con motivo, direcciones evaluadas y reglas nuevas. |
| `service-worker.js` | v299 → v300. |

---

### feat(ui): ID.2, familia Finko Icons en el resto de la UI estructural · 2026-07-04

Tercera fase de la identidad visual ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md)). Se redibujan 8 símbolos existentes con el lenguaje (duotono + punto de valor): `i-saldo`, `i-recurring`, `i-lightbulb`, `i-alert`, `i-bolt`, `i-trophy`, `i-mountain` y `i-circle` (reinterpretado como "bola de nieve": dos círculos, uno chico creciendo a uno grande). Se agregan 5 símbolos nuevos: `i-star`, `i-percent`, `i-trending-up`, `i-info`, `i-bar-chart`; y se reutiliza `i-cuentas` para "Consolidar deudas" (misma metáfora, sin dibujo nuevo).

Se retiran los emojis de utilería concentrados en la card "Estrategia de pago" (💡, 💪, ✨, ℹ️, 🚨, ⚠️, 📊, 🤝, 🏦) y en el tip evergreen de Inversión (💡), reemplazados por `icon()`. Nuevo modificador `.icon--sm` (14px) para iconos junto a texto xs/sm.

**Fuera de alcance a propósito:** un `hint.textContent` en Apartados que interpola 💡 (asignar HTML a `textContent` lo mostraría como texto crudo); los emojis de categoría (`CATEGORIA_*_EMOJI`, dominio de ID.3); el badge "📝 Pendiente" de Gastos y los usos sueltos de ⚠ en otros 8 archivos (fuera del cúmulo visual que motivó esta fase).

2024/2024 unit; 128/128 E2E. Lint limpio. SW v298 → v299.

| Archivo | Cambio |
|---|---|
| `index.html` | 8 símbolos rediseñados + 4 nuevos (star, percent, trending-up, info, bar-chart). |
| `modules/dominio/compromisos/views/estrategia.js` | 10 emojis de utilería reemplazados por `icon()`. |
| `modules/dominio/inversiones/view.js` | Tip evergreen con `icon('lightbulb')`. |
| `styles/components/forms.css` | `.icon--sm`. |
| `styles/components/charts.css` | Tamaño de icono en `estrategia-card-pick__icono` (desktop + mobile). |
| `docs/DECISIONS/023-...md`, `docs/DESIGN_SYSTEM.md` | ID.2 documentada, `.icon--sm` referenciado. |
| `service-worker.js` | v298 → v299. |

---

### feat(ui): ID.4, espaciado y jerarquía en las tarjetas más densas · 2026-07-04

Segunda fase de la iniciativa de identidad visual 2026-07 (revisión aprobada por el usuario). Cinco puntos de la auditoría visual quedan resueltos:

- **"¿Cómo distribuir?" (Mis cuentas, la tarjeta más densa en móvil):** las filas Necesidades/Estilo de vida/Ahorro pasan de párrafos corridos a un mini listado alineado (icono, etiqueta, porcentaje, monto) con filete discreto entre filas. Las alertas ("fondo aún no completo"...) ganan un callout con tinte de advertencia en vez de mezclarse con el texto. Los enlaces "Ver progreso/estrategia/seguimiento" pasan a fila propia con separación real entre ellos.
- **Bug real, no solo espaciado:** el icono de "1 pendiente del mes" en Inicio era invisible: reutilizaba `.cal-dot--*`, que pinta fondo Y color del mismo tono, así que el SVG quedaba del mismo color que su propio fondo. Ahora es un chip con fondo tenue y el icono en el color completo del dominio (`vencidos-card__icon--fijo/deuda-entidad/deuda-personal`).
- **Tarjeta del fondo (Ahorro):** la nota "este dinero sigue en tus cuentas..." se separa del dato "Objetivo: $X" con un filete y un peldaño menos de peso visual (ya no compite con la cifra).
- **Confetti de logros en móvil:** cada pieza partía siempre desde `bottom:90px` y caía 80px; en desktop no pasaba nada, pero en móvil terminaba a 10px del borde, dentro de la franja del bottom-nav. Ahora en viewports < 1024px arranca por encima de esa franja (mismo criterio que ya usa el toast).
- **Fade del sidebar (ventanas ≤ 800px de alto):** la franja que insinúa "hay más para desplazar" pasa de 20px a 36px con más paradas de color, así el borde de "HERRAMIENTAS" se ve como un desvanecido intencional y no como texto cortado a la mitad.

2024/2024 unit; 128/128 E2E. Lint limpio. SW v297 → v298.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/view.js` | Filas de distribución, alertas y CTAs con markup propio. |
| `modules/dominio/compromisos/views/dashboard.js` | Icono de vencidos con clase de color dedicada (fix del bug de invisibilidad). |
| `modules/dominio/ahorro/view.js` | Nota del fondo con clase propia (separada del dato). |
| `modules/dominio/logros/index.js` | Confetti con clearance de bottom-nav en móvil. |
| `styles/components/domain.css` | `.distribucion-row/-alerta/-ctas`, `.vencidos-card__icon--*`. |
| `styles/components/analysis.css` | `.fondo-hero__nota`. |
| `styles/layout.css` | Fade del sidebar más alto y suave; `.nav-item` compacto en ventanas bajas. |
| `service-worker.js` | v297 → v298. |

---

### feat(ui): ID.1, lenguaje de iconografía propio con piloto en la navegación · 2026-07-04

Primera fase de la iniciativa de identidad visual 2026-07 (revisión aprobada por el usuario). Nace la familia **"Finko Icons"** ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md)): línea sobre grid 24 (trazo 2 heredado de `.icon`), **duotono** (la región "cuerpo" con `fill="currentColor" fill-opacity=".15"` como atributo del símbolo, atraviesa `<use>` sin CSS nuevo) y **punto de valor** (un círculo sólido integrado en la metáfora: la firma de la familia). Glifos utilitarios quedan monolínea a propósito.

Piloto: los 14 símbolos de navegación redibujados (`i-home`, `i-gastos` recibo, `i-agenda` día marcado, `i-deudas`, `i-mas`, `i-cuentas`, `i-personales` persona + moneda, `i-presupuesto` velocímetro, `i-metas` diana, `i-apartados`, `i-ahorro` frasco con moneda, `i-inversion` curva con área, `i-analisis` dona, `i-ajustes` deslizadores). Dos metáforas cambian a propósito: Límites pasa de torta a velocímetro y Ahorro de cerdito a frasco (legibilidad a 22px). Ids intactos: ningún consumidor (`icon()`, `emptyArt()`, HTML) cambió. Verificado con capturas Playwright a 22/48px en ambos temas, sidebar y bottom-nav. Cero costo de rendimiento (sprite estático, sin peticiones ni JS nuevos).

Fases siguientes en el tablero: ID.2 (resto del chrome), ID.3 (categorías, retira emojis estructurales), ID.4 (espaciado en tarjetas densas), ID.5 (micropulido de cifras).

2024/2024 unit; 128/128 E2E. SW v296 → v297.

| Archivo | Cambio |
|---|---|
| `index.html` | 14 símbolos de navegación redibujados + comentario del sprite actualizado. |
| `docs/DECISIONS/023-lenguaje-de-iconografia-propio.md` | ADR nuevo: lenguaje Finko Icons y plan de fases. |
| `docs/DESIGN_SYSTEM.md` | Sección Iconografía reescrita (lenguaje + estado de migración). |
| `docs/BOARD.md` | Tarjetas ID.2-ID.5 en Transversal. |
| `service-worker.js` | v296 → v297. |

---

### style(analisis): paleta unificada entre la dona y las barras por categoría · 2026-07-04

Cierra la observación registrada en el tablero de Análisis. Las barras laterales de "Gastos por categoría" dejan de ser todas verdes: cada una usa **el color que la dona le asignó a su categoría** (misma fuente: `colorearSegmentos`), y las categorías agrupadas en "Otros" heredan el slate de ese segmento, para que el color cuente la misma historia en toda la sección. Sin dona (sin segmentos), las barras conservan el color por defecto.

2022/2022 → 2024/2024 unit (2 nuevos); 128/128 E2E. Lint limpio. SW v295 → v296.

| Archivo | Cambio |
|---|---|
| `modules/dominio/analisis/view.js` | Barras con el color de su segmento de la dona. |
| `tests/unit/analisis.test.js` | 2 tests nuevos (paleta unificada en happy-dom). |
| `service-worker.js` | v295 → v296. |

---

### feat(tesoreria): MC.6c, señales más ricas para la distribución automática · 2026-07-04

Cierra MC.6c, la última tarjeta accionable del tablero. Dos señales nuevas en el motor de pisos (ADR 013):

- **Historial de gasto variable como proxy del estilo de vida real.** Nueva `calcularGastoVariablePromedio(gastos, hoy, meses)`: promedio mensual del gasto variable (sin `compromisoId` y fuera de Deudas/Ahorro/Gastos fijos) sobre los últimos 3 meses completos; los meses sin registros no diluyen y el mes corriente se excluye. El motor eleva el piso de Estilo de vida a ese promedio cuando supera el 10% mínimo: sugerir menos de lo que el usuario de verdad gasta produce planes incumplibles. Si eso aprieta el ahorro por debajo de su ideal, alerta accionable con el rubro a recortar (mismo espíritu que MC.11) y la razón lo menciona. Sin historial, la señal queda apagada (retrocompatible: reparto idéntico al anterior).
- **Inversiones como prioridad tras el fondo.** Con fondo completo y usuario que ya invierte, la razón agrega "tu fondo está completo, así que el ahorro puede ir a tus inversiones" y aparece la CTA "Aportar a tus inversiones" (antes ese caso no tenía CTA de inversión; "Explorar inversiones" sigue reservada a quien no invierte).

Límites de gasto consume el mismo `construirContextoDistribucion`: mejora automáticamente. Un test viejo fijaba el contrato anterior ("ya invierte → sin CTA"); se actualizó al nuevo.

2012/2012 → 2022/2022 unit (10 nuevos, 1 actualizado); 128/128 E2E. Lint limpio. SW v294 → v295.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `calcularGastoVariablePromedio`; piso EV informado por historial; razón/alerta/CTA nuevas. |
| `tests/unit/tesoreria.test.js` | 10 tests nuevos (proxy + señales), 1 actualizado. |
| `service-worker.js` | v294 → v295. |

---

### feat(inversiones): E.5, IPC observado como constante anual · 2026-07-04

Cierra E.5. Nueva constante `IPC_OBSERVADO_POR_ANIO` (variación anual del IPC al cierre de diciembre, decimal) con fuente y fecha de revisión (regla ADN #12): 2024 = 5,20% y 2025 = 5,10% (DANE, boletín de 2026-01-08), más el helper `ipcObservadoVigente()`.

Primer consumidor: la **rentabilidad real del portafolio** de Inversión pasa a descontar la inflación observada (el dato real de pérdida de poder adquisitivo) en vez de la meta de BanRep (3%), que queda en el copy como referencia de largo plazo. Con tasas nominales típicas de CDT (~9-10% EA) la diferencia es material: real ~4,2% con IPC observado vs ~6,3% con la meta. Mantenimiento anual: agregar la entrada del año en enero, junto a E.2.

2008/2008 → 2012/2012 unit (4 nuevos); 128/128 E2E. Lint limpio. SW v293 → v294.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `IPC_OBSERVADO_POR_ANIO` + `ipcObservadoVigente()`. |
| `modules/dominio/inversiones/view.js` | Rentabilidad real con IPC observado; copy con ambas referencias. |
| `tests/unit/constants.test.js` | Describe E.5 (4 tests). |
| `service-worker.js` | v293 → v294. |

---

### feat(gastos): TX.3, categorías Café y Gastos hormiga · 2026-07-04

Cierra TX.3. Dos categorías nuevas en el catálogo de gastos: **Café ☕** y **Gastos hormiga 🐜** (el concepto conocido en finanzas personales para las fugas pequeñas y recurrentes). Aparecen automáticamente en el form de gasto, los envelopes de Límites y la dona de Análisis. Sin migración: los gastos existentes no cambian. Guardarraíl nuevo: toda categoría de gasto debe tener emoji propio (ninguna cae al fallback 📦).

2005/2005 → 2008/2008 unit (3 nuevos); 128/128 E2E. Lint limpio. SW v292 → v293.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `Café` y `Gastos hormiga` en `CATEGORIAS_GASTO` + emojis. |
| `tests/unit/constants.test.js` | Describe TX.3 (3 tests). |
| `service-worker.js` | v292 → v293. |

---

### feat(logros): LG.1b, vitrina de logros en Ajustes · 2026-07-04

Cierra LG.1b con el ADR que pedía ([ADR 022](DECISIONS/022-vitrina-de-logros-en-ajustes.md)):

- **Decisión de ubicación:** card "🏆 Logros" al final de **Ajustes** (no sección propia: la nav ya tiene 13 secciones y la vitrina es solo lectura; no en Inicio: IN.1-IN.3 lo curaron como estado financiero del día). El momento de descubrimiento sigue siendo el toast (LG.1a); la vitrina es el "ver todos".
- **Arquitectura:** `config` no puede importar `logros` (ADN #10), así que el shell expone `#panel-logros` junto a `#panel-config` y el dominio logros renderiza ahí su propia vista (`logros/view.js`, archivo nuevo, agregado al precache del SW).
- **Catálogo extendido:** cada logro gana `hint` (cómo desbloquearlo, en imperativo; los conseguidos muestran `desc`) y `progreso(s)` opcional solo en los de conteo observable directo de S: `diez-gastos` (n de 10) y `diversificador` (n de 3 cuentas activas), con barra de progreso accesible. El progreso del fondo ya vive en Ahorro con su anillo: no se duplica.
- Nueva `estadoLogros(s, idsPersistidos)` pura: desbloqueado = persistido en `S.logros` o cumplido en vivo (un logro ganado no se revoca aunque el estado retroceda).

1994/1994 → 2005/2005 unit (11 nuevos); 128/128 E2E. Lint limpio. SW v291 → v292.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/022-vitrina-de-logros-en-ajustes.md` | ADR nuevo. |
| `modules/dominio/logros/logic.js` | `hint` + `progreso` en el catálogo; `estadoLogros`. |
| `modules/dominio/logros/view.js` | Archivo nuevo: vitrina. |
| `modules/dominio/logros/index.js` | Render en init, state:change y hashchange. |
| `index.html`, `service-worker.js` | Contenedor `#panel-logros`; asset nuevo + v291 → v292. |
| `styles/components/config.css` | Estilos `.logro-item` (pendientes atenuados, emoji en gris). |
| `tests/unit/logros.test.js` | 11 tests nuevos (estadoLogros + vitrina en happy-dom). |

---

### feat(agenda): AP.4, MT.2 y AH.4, recordatorio de día de ingreso en Calendario · 2026-07-04

Cierra las tres épicas de recordatorios de aporte con el único ADR que pedía el tablero ([ADR 021](DECISIONS/021-recordatorio-dia-de-ingreso.md)):

- **Modelo elegido:** el día de pago de cada ingreso activo (`diaPago`, capturado desde v12) aparece en Calendario como **evento de "día de ingreso"**: dot verde (`--fk-dom-ingresos`), entrada en la leyenda, item de detalle con el monto en verde, el recordatorio "Hoy llega tu dinero: recuerda apartar para tus objetivos" y botón **"Distribuir →"**. Respeta la frecuencia (Quincenal = dos ocurrencias, misma lógica que compromisos). El aria-label y el resumen del día distinguen "día de ingreso" de los compromisos a pagar, y el ingreso no infla el "Total a pagar".
- **Sin duplicar a MC.4:** el CTA emite `distribuir:abrir` (EventBus); tesorería navega a Mis cuentas y abre el asistente "Distribuir mi ingreso" en el primer paso. Los montos por vehículo ("$X para el SOAT", "Abonar a la meta") viven SOLO en el asistente: cero réplica del motor de ADR 013 en Agenda. Se rechazó el modelo de N eventos por meta/apartado/fondo (spam + flujos paralelos inferiores).
- El gating por fecha del asistente (MC.4d) sigue mandando: si el cobro aún no llega o ya se distribuyó, el usuario ve ese estado al llegar (degradación coherente).
- El nudge de proximidad de Apartados (60 días) se mantiene; el botón "Definir →" del compromiso mensual se conserva (la parte de AH.4 que pedía quitarlo quedó superada por AH.2: ese form ahora es la casa del aporte sugerido explicado; se verificó que `compromisoMensual` no alimenta nudges ni Score).

1983/1983 → 1994/1994 unit (11 nuevos); 127/127 → **128/128 E2E** (nuevo test del flujo completo: día en calendario → CTA → asistente abierto). Lint limpio. SW v290 → v291.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/021-recordatorio-dia-de-ingreso.md` | ADR nuevo (modelo agregado, alternativas rechazadas). |
| `modules/dominio/agenda/logic.js` | `eventosIngresosDelMes`; `totalDia` excluye ingresos. |
| `modules/dominio/agenda/view.js` | Merge por día, item de ingreso, leyenda, aria/resumen. |
| `modules/dominio/agenda/index.js` | Acción `agenda-distribuir-ingreso`; re-render ante `ingresos`. |
| `modules/dominio/tesoreria/index.js` | Listener `distribuir:abrir` + `_abrirAsistenteDistribucion`. |
| `styles/components/config.css` | `cal-dot--ingreso`, franja e ícono del item (patrón AG.6/AG.7). |
| `tests/unit/agenda.test.js`, `tests/e2e/smoke.test.js` | 11 unit + 1 E2E nuevos. |
| `service-worker.js` | v290 → v291. |

---

### feat(ahorro): AH.3 y AUD.6, ADR 020 fondo como marcador de liquidez + hint del modelo · 2026-07-04

Cierra juntas AH.3 y AUD.6, que el tablero pedía resolver en la misma decisión ([ADR 020](DECISIONS/020-fondo-marcador-de-liquidez.md)):

- **Decisión (AH.3):** el fondo de emergencia **sigue siendo un marcador de liquidez**: el aporte no pide cuenta de origen ni descuenta saldo. Se rechaza la variante con patrón AP.1 porque el modelo con descuento no tiene flujo de salida (el fondo no se "gasta" como una meta o un apartado: se usa en emergencias, y el dinero quedaría atrapado fuera de Mis cuentas), la migración retroactiva es imposible (los aportes históricos no tienen cuenta) y toda la app ya asume el marcador (Distribuir mi ingreso, Score, consolidado). La asimetría con Metas/Apartados es de propósito: esos vehículos son gasto futuro comprometido; el fondo es liquidez etiquetada.
- **Implementación (AUD.6):** hint permanente en la card del fondo ("Este dinero sigue en tus cuentas: el fondo solo lo marca como reservado para emergencias") y en el form de aporte, cerrando la doble contabilidad mental que motivaba ambas tarjetas.
- AH.4 pierde su dependencia de AH.3: el ADR de recordatorios (AP.4/MT.2/AH.4) puede diseñarse sobre un modelo ya fijado.

1983/1983 unit; 127/127 E2E. Lint limpio. SW v289 → v290.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/020-fondo-marcador-de-liquidez.md` | ADR nuevo con la decisión y las alternativas rechazadas. |
| `modules/dominio/ahorro/view.js` | Hint del modelo en card y form de aporte. |
| `service-worker.js` | v289 → v290. |

---

### feat(ahorro): AH.2, aporte recomendado del fondo explicado con datos reales · 2026-07-04

Cierra AH.2. El compromiso mensual del fondo de emergencia deja de ser una pregunta sin guía: el modal muestra un **aporte sugerido construido con los datos reales del usuario** y la explicación de dónde sale, con botón "Usar este monto".

- Nueva `calcularAporteSugerido` (pura, en `ahorro/logic.js`), **alineada con el motor de distribución de Mis cuentas** (ADR 013, MC.6a/MC.10/MC.11) para no tener dos recomendaciones contradictorias: mismo horizonte de 12 meses para cerrar el fondo, mismos pisos (estilo de vida 10%, ahorro 5%), mismo reparto proporcional con margen corto y misma honestidad en déficit (si fijos + cuotas superan el ingreso: $0 y la verdad, sin inventar porcentajes).
- Señales que usa: ingresos mensuales proyectados, gastos fijos, cuotas de deuda activas y el aporte que ya piden las metas/apartados con fecha (réplica local del cálculo de tesorería, regla ADN #10). Cinco bases posibles: `meta` (alcanza el ritmo de 12 meses), `capacidad` (sugiere lo que el margen permite y estima el plazo real; con más de 36 meses no promete fechas), `piso` (margen corto: proporcional 5/15), `deficit` y `completo`.
- **Si falta el ingreso** (nada registrado), la sugerencia usa solo el faltante/12 y el form pide "¿Cuánto recibes al mes, aproximadamente?": la caja se recalcula en vivo mientras el usuario escribe, sin persistir el dato.
- La sección de hábito, cuando no hay compromiso definido, acompaña la pregunta con "Según tus números, $X es un buen punto de partida".

1974/1974 → 1983/1983 unit (9 tests nuevos); 127/127 E2E. Lint limpio. SW v288 → v289.

| Archivo | Cambio |
|---|---|
| `modules/dominio/ahorro/logic.js` | `calcularAporteSugerido` + constantes alineadas con ADR 013. |
| `modules/dominio/ahorro/view.js` | Caja de sugerencia reutilizable; form con input de ingreso opcional; hint en hábito. |
| `modules/dominio/ahorro/index.js` | Contexto (cuotas de deuda, objetivos con fecha); recálculo en vivo; acción `ahorro-usar-sugerido`. |
| `tests/unit/ahorro.test.js` | 9 tests nuevos. |
| `service-worker.js` | v288 → v289. |

---

### feat(personales): PE.1, tasa de interés opcional y reparto capital/interés · 2026-07-04

Cierra PE.1. El préstamo dado (Me deben) acepta una **tasa de interés mensual opcional**, el modelo del préstamo informal en Colombia ("te presto al 2% mensual"): interés simple sobre el capital pendiente, prorrateado por días (mes comercial de 30), sin capitalización. Sin tasa, nada cambia (retrocompatible en lógica, vista y tests).

- **Con tasa, cada pago cubre primero el interés acumulado** y el resto baja el capital (orden estándar de imputación). `aplicarPago` mantiene los acumuladores `capitalPagado`, `interesPagado` e `interesPendiente` (snapshot del devengo al último abono, que es el ancla del devengo siguiente: no se cuenta doble).
- La card muestra el desglose ("Pendiente: $X (capital $C + interés $I)"), la tasa y el interés ya cobrado; la barra de progreso mide **recuperación de capital** (no se infla con intereses). El modal de pago muestra capital e interés acumulado y explica el orden de imputación; el anuncio del abono dice cuánto fue a capital y cuánto a interés.
- El resumen agregado incluye el interés devengado en "Pendiente" y el interés recibido en "Te han devuelto"; `pctCobrado` sigue midiendo capital.
- **Schema v20 → v21** (migración idempotente): préstamos existentes quedan con `tasa: null` y acumuladores derivados de `pagado` (todo lo cobrado fue capital). Nueva fórmula reusable `calcularInteresSimple` en `infra/financiero.js`.

1934/1934 → 1974/1974 unit (40 tests nuevos); 127/127 E2E. Lint limpio. SW v287 → v288.

| Archivo | Cambio |
|---|---|
| `modules/infra/financiero.js` | Nueva `calcularInteresSimple(capital, tasaMensualPct, dias)`. |
| `modules/dominio/personales/logic.js` | `tieneInteres`, `calcularCapitalPendiente`, `calcularInteresPendiente`, `desglosarPago`; `calcularPendiente`/`aplicarPago`/`porcentajePagado`/`calcularResumen`/validación/normalización con tasa. |
| `modules/dominio/personales/view.js` | Campo de tasa en el form; desglose en card y modal de pago. |
| `modules/dominio/personales/index.js` | Persiste acumuladores; anuncio con reparto capital/interés. |
| `modules/core/storage.js` | Migración v20 → v21. |
| `tests/unit/personales.test.js`, `tests/unit/storage.test.js`, `tests/unit/calculadoras.test.js` | 40 tests nuevos (lógica de interés, migración, fórmula). |
| `service-worker.js` | v287 → v288. |

---

### feat(tesoreria): MC.10 y MC.11, piso de ahorro y detección de déficit real · 2026-07-03

Cierra MC.10 y MC.11 juntas, como sugería el tablero ([ADR 013 revisado](DECISIONS/013-distribucion-automatica-inteligente.md), decisiones A y B). Ambas ajustan el reparto del modo Automático cuando las Necesidades son altas:

- **MC.10 (piso de ahorro):** nueva constante `_PISO_AHORRO_PCT = 5`. Cuando el residuo del ingreso no alcanza para el piso de Estilo de vida (10%) más el de ahorro, se reparte **proporcional a los pisos** (el ahorro recibe 1/3 del margen) en vez de irse entero a Estilo de vida. Antes, con obligaciones al 92%, el ahorro quedaba en $0 aunque hubiera fondo incompleto u objetivos con fecha. El ahorro solo queda en $0 sin margen real (obligaciones ≥ 100%) o con déficit real.
- **MC.11 (déficit real):** `construirContextoDistribucion` incorpora el slice `gastos` y deriva `gastosDelMes`. Si los gastos ya registrados este mes superan el ingreso (ej. un fijo que no está en Calendario y se registró suelto), el modo auto deja de mostrar una distribución "ideal" incoherente: ahorro a $0, razón honesta ("tus gastos ya van en el 113% de tu ingreso: estás gastando más de lo que entra") y alerta accionable (revisar en Análisis, recortar Estilo de vida, registrar en Calendario los fijos que falten). Los presets explícitos no se tocan.

El asignado por grupo de Límites de gasto mejora automáticamente (consume el mismo motor). 1927/1927 → 1934/1934 unit (7 tests nuevos); 127/127 E2E (una corrida con flaky de a11y-forms que pasó en retry; re-corrida limpia). Lint limpio. SW v286 → v287.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | Piso de ahorro proporcional; `gastosDelMes` + rama de déficit real. |
| `tests/unit/tesoreria.test.js` | 7 tests nuevos (3 de MC.10, 3 de MC.11, 1 de contexto). |
| `docs/DECISIONS/013-...md` | Revisión con decisiones A y B. |
| `service-worker.js` | v286 → v287. |

---

### feat(compromisos): D.10 y D.13, categorías de relación para deuda personal y Fiado · 2026-07-03

Cierra D.10 y D.13 en un solo pase de diseño, como pedía el tablero ([ADR 015 revisado](DECISIONS/015-categorias-de-deuda-dos-dimensiones.md), decisiones 5 y 6):

- **D.10:** nuevo catálogo `CATEGORIAS_DEUDA_PERSONAL` (Familiar 👪, Amigo 🤝, Vecino 🏘️, Natillera 💰, Prestamista particular 💼, Fiado 🏪, Otro 📦). El form de deuda personal pregunta "¿Con quién es la deuda?" en vez de ofrecer productos de entidad (Tarjeta, Vivienda...). Mismo campo `categoria` en el schema; validación y normalización aceptan solo el catálogo del tipo. **Sin migración:** las deudas personales viejas con valor de producto se conservan tal cual y se reclasifican al editar (no se borra un dato elegido por el usuario).
- **D.13:** "Fiado" entra como categoría de relación con **interfaz adaptada**: al elegirlo, el form oculta cuota, tasa y frecuencia (una tienda que fía no cobra interés ni pacta cuota; se abona libre) y el día de pago queda como recordatorio de la fecha acordada. Para habilitarlo, **la cuota mensual pasa a ser opcional en toda deuda personal** (los préstamos de familia sin cuota fija son la norma): si viene debe ser > 0, vacía se guarda `0`. El simulador de estrategia ya excluía cuota 0 (sin cuota no hay plan que simular); la lista muestra la frecuencia en su lugar y Agenda omite el monto cuando es 0.

El guardarraíl TX.4 incorpora el catálogo nuevo (único label compartido: 'Otro' → 📦, consistente). 1917/1917 → 1927/1927 unit (10 nuevos, 3 actualizados); 127/127 E2E. Lint limpio. SW v285 → v286.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `CATEGORIAS_DEUDA_PERSONAL` + emojis. |
| `modules/dominio/compromisos/logic.js` | Validación/normalización por catálogo del tipo; cuota opcional en personal. |
| `modules/dominio/compromisos/views/formularios.js` | Catálogo y labels por tipo; cuota opcional; grupos con id para el toggle. |
| `modules/dominio/compromisos/index.js` | `_wireToggleFiado` (oculta cuota/tasa/frecuencia al elegir Fiado). |
| `modules/dominio/compromisos/views/lista.js`, `modules/dominio/tesoreria/view.js` | Lookup de emoji unificado producto + relación. |
| `modules/dominio/agenda/view.js` | Deuda sin cuota no muestra "$0". |
| `modules/core/state.js`, `docs/DECISIONS/015-...md` | JSDoc del schema; revisión del ADR. |
| `tests/unit/compromisos.test.js`, `tests/unit/constants.test.js` | 10 tests nuevos; TX.4 con el catálogo nuevo. |
| `service-worker.js` | v285 → v286. |

---

### feat(presupuesto): MC.8d, pulido de Límites con iconos por categoría · 2026-07-03

Cierra MC.8d. Los envelopes y la lista de categorías huérfanas de Límites de gasto muestran el emoji de su categoría (`CATEGORIA_EMOJI`, fallback 📦), igual que ya lo hacía el panel de alertas del dashboard. Los otros frentes de la tarjeta (copy final por grupo, estados vacíos, a11y) ya habían quedado cubiertos por EP.7b (banner y copy de Límites), MC.8b (fusión de topes en la card) y A11Y.1-5: sin más cambios.

1917/1917 unit verdes; 127/127 E2E. Lint limpio. SW v284 → v285.

| Archivo | Cambio |
|---|---|
| `modules/dominio/presupuesto/view.js` | Emoji de categoría en envelopes y huérfanas. |
| `service-worker.js` | v284 → v285. |

---

### test(rwd): RWD.1, verificación de reflow real a 320px en E2E · 2026-07-03

Cierra RWD.1 (estaba bloqueada por el preview del entorno; se resolvió por la vía E2E que la propia tarjeta sugería). Nueva suite [tests/e2e/reflow-320.test.js](../tests/e2e/reflow-320.test.js) (4 tests, viewport 320×568, el punto de verificación de reflow de WCAG 1.4.10, que cubre el zoom 200%/400% en pantallas comunes):

- Las 13 secciones, con **datos reales sembrados** (cuentas, gastos, deudas con nombre largo, fijo, meta, préstamo personal, límite, fondo con aportes), no generan scroll horizontal.
- La barra inferior (la sidebar vuelta bottom bar en móvil) queda completa dentro del viewport.
- El modal de gasto rápido (`.input--big-amount`, el caso de riesgo señalado) y el asistente "Distribuir mi ingreso" caben completos.

Resultado: cero solapes ni overflow, ningún fix de CSS requerido. 123/123 → 127/127 E2E; unit sin cambios; solo tests, sin bump de SW. Nota menor de la tarjeta (labels del nav a 10px bajo 360px) sigue vigente y aceptable.

| Archivo | Cambio |
|---|---|
| `tests/e2e/reflow-320.test.js` | Suite nueva (4 tests de reflow). |

---

### feat(presupuesto): MC.8c, layout de dos columnas + fila completa en Límites · 2026-07-03

Cierra MC.8c (ver [ADR 019](DECISIONS/019-limites-por-rol.md)). En desktop, el grid de "Tu plan del mes por grupo" pasa de 3 columnas iguales a: **Necesidades y Ahorro en 2 columnas compactas** (fila de arriba) y **Estilo de vida en fila completa** (es la card alta: contiene la olla finita, los envelopes y las huérfanas, y en 1/3 del ancho quedaba apretada). El DOM sigue el orden visual (Necesidades → Ahorro → Estilo de vida), que coincide con el orden del asistente "Distribuir mi ingreso". En móvil no cambia nada: `responsive.css` ya apila a 1 columna.

1917/1917 unit verdes; 123/123 E2E (los tests usan selectores `data-grupo`, independientes del orden). Lint limpio. SW v283 → v284.

| Archivo | Cambio |
|---|---|
| `modules/dominio/presupuesto/view.js` | Orden de cards Necesidades → Ahorro → Estilo de vida. |
| `styles/components/analysis.css` | Grid a 2 columnas; Estilo de vida `grid-column: 1 / -1`. |
| `service-worker.js` | v283 → v284. |

---

### feat(compromisos): D.12, aviso de tasa desconocida por deuda en la lista · 2026-07-03

Cierra D.12. El aviso de tasa desconocida era un banner único al tope de la card de estrategia que listaba los nombres, pero al leer la lista de deudas no se identificaba a cuál correspondía. Ahora cada deuda con entidad sin tasa registrada muestra su propio aviso en la card ([lista.js](../modules/dominio/compromisos/views/lista.js)): "⚠️ Tasa por confirmar: la calculamos como 0% y eso subestima los intereses. Confírmala con tu banco." (`.text-warning`, `role="note"`). El contexto de la card ya no repite "tasa por confirmar" (el aviso lo reemplaza). El banner global y su CSS (`.estrategia-card__nota`) se retiran.

1917/1917 unit verdes; 123/123 E2E. Lint limpio. SW v282 → v283.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/views/lista.js` | Aviso por deuda; contexto sin duplicar la tasa. |
| `modules/dominio/compromisos/views/estrategia.js` | Banner global retirado. |
| `styles/components/charts.css` | `.estrategia-card__nota` retirada (muerta). |
| `service-worker.js` | v282 → v283. |

---

### feat(compromisos): D.11, la recomendación nombra cuándo la deuda a atacar es la única con interés · 2026-07-03

Cierra D.11 (revisó [ADR 011](DECISIONS/011-unificacion-simulador-deudas.md)). En `recomendarEstrategia` ([compromisos/logic.js](../modules/dominio/compromisos/logic.js)), cuando ambas estrategias completan el plan y **una sola deuda cobra intereses**:

- Si gana Avalancha, la razón la nombra: «"Tarjeta" es la única de tus deudas que cobra intereses. Pagarla primero no solo reduce ese costo: lo elimina...» (antes solo el copy genérico de tasa más alta).
- Si esa deuda es además la más chica (Avalancha y Bola de nieve empatan y se recomienda Bola de nieve), la razón suma el hecho: cerrar la primera también deja el plan sin intereses (antes solo "pesa la motivación").
- Con varias deudas con interés, el copy genérico no cambia.

1914/1914 → 1917/1917 unit verdes (3 tests nuevos); 123/123 E2E (suite `estrategia-pago` sin regresiones). Lint limpio. SW v281 → v282.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic.js` | Razones específicas cuando hay una única deuda con tasa > 0. |
| `tests/unit/compromisos.test.js` | 3 tests nuevos de D.11. |
| `service-worker.js` | v281 → v282. |

---

### fix(ahorro): AH.1, el hint del objetivo del fondo explica de dónde sale el número · 2026-07-03

Cierra AH.1. En el formulario de activar/editar fondo ([ahorro/view.js](../modules/dominio/ahorro/view.js), `renderFormFondo`), el preview "Con esa meta tu objetivo sería $480.000 (3 meses × $160.000 de gastos fijos al mes)" no explicaba de dónde salía el $160.000. Ahora dice que es "lo que suman al mes tus gastos fijos de Calendario (arriendo, servicios, cuotas...)", que es exactamente cómo lo calcula `_gastosFijosMensuales()` (compromisos fijos activos proyectados a valor mensual).

1914/1914 unit verdes; 123/123 E2E. Lint limpio. SW v280 → v281.

| Archivo | Cambio |
|---|---|
| `modules/dominio/ahorro/view.js` | Copy del preview del objetivo. |
| `service-worker.js` | v280 → v281. |

---

### feat(logros): LG.1a, toast de logros más legible · 2026-07-03

Cierra LG.1a. Tres mejoras al toast de logro desbloqueado en [logros/index.js](../modules/dominio/logros/index.js):

- **Duración:** `DURACION_MS` sube de 2.5s a 5s (2.5s no alcanzaba para leer el nombre del logro).
- **Pausa al pasar el cursor:** `mouseenter` congela el tiempo restante y `mouseleave` lo retoma (mínimo 1s para que no muera apenas salga el cursor).
- **Cierre manual:** botón ✕ con `aria-label`, también accesible por teclado (focusable, `:focus-visible` visible).

Para poder interactuar, el toast pasa de `pointer-events: none` a `auto`. Los toasts encadenados por timer fijo (1.4s) se reemplazan por una cola de uno a la vez: con la pausa por hover la vida de un toast ya no es predecible, y dos toasts fijos en el mismo punto se solaparían (guard anti doble avance de cola entre `animationend` y su fallback).

1914/1914 unit verdes; 123/123 E2E sin regresiones (el toast interactivo no intercepta ningún flujo). Lint limpio. SW v279 → v280.

| Archivo | Cambio |
|---|---|
| `modules/dominio/logros/index.js` | Duración 5s, pausa por hover, botón de cierre, cola de toasts. |
| `styles/components/nudges.css` | `pointer-events: auto`; estilos de `.logro-toast__cerrar`. |
| `service-worker.js` | v279 → v280. |

---

### feat(personales): PE.2 a PE.5, estados de seguimiento humanizados en Me deben · 2026-07-03

Cierra PE.2, PE.3, PE.4 y PE.5 en un solo pase (los cuatro reescriben el mismo chip de estado de `_renderPersonalItem` o líneas vecinas).

- **PE.2:** nuevo helper puro `tiempoRelativo(dias)` en [infra/utils.js](../modules/infra/utils.js): 0 → "hoy", 1 → "ayer", luego días/semanas/meses/años con singular correcto ("hace 1 mes", "hace 5 años"). Reusable por cualquier dominio.
- **PE.3:** nueva lógica de estado por `fechaLimite` en [personales/logic.js](../modules/dominio/personales/logic.js): `estadoPrestamo()` devuelve `proximo` (fecha pactada futura), `hoy`, `vencido`, `abonado` o `pendiente`; `labelEstado()` produce el copy de seguimiento: "Próximo pago en 5 días", "Pago programado para hoy", "La fecha de pago pasó hace 2 meses", en vez de "N días, ya toca cobrar".
- **PE.4:** tras un abono el chip ya no dice "0 días": muestra "Recibiste un abono hoy" o "Último abono hace 15 días" (reusa el humanizador de PE.2). El reparto capital/interés quedará para PE.1.
- **PE.5:** el valor "Te han devuelto" del resumen usa `.text-success` (verde, coherente con los patrones de color financieros).

El tono del chip (default/warning/danger) sigue saliendo del reloj de incomodidad (`clasificarAntiguedad` sobre `calcularDias`, que un abono reinicia); un préstamo vencido se muestra en warning si el reloj es reciente y solo pasa a danger cuando es viejo.

1892/1892 → 1914/1914 unit verdes (7 tests de `tiempoRelativo`, 15 de `estadoPrestamo`/`labelEstado`); 123/123 E2E sin regresiones. Lint limpio. SW v278 → v279.

| Archivo | Cambio |
|---|---|
| `modules/infra/utils.js` | Nuevo `tiempoRelativo(dias)`. |
| `modules/dominio/personales/logic.js` | Nuevos `estadoPrestamo` y `labelEstado`. |
| `modules/dominio/personales/view.js` | Chip por estado; "Te han devuelto" en verde. |
| `tests/unit/utils.test.js`, `tests/unit/personales.test.js` | 29 tests nuevos. |
| `service-worker.js` | v278 → v279. |

---

### style(a11y): COL.1 y COL.2, contraste de warning en claro y texto deshabilitado · 2026-07-03

Cierra COL.1 y COL.2 en un solo pase (mismo tipo de ajuste, mismos archivos de tokens).

- **COL.1:** en modo claro `--fk-warning` (y `--fk-warning-text`) pasa de `#a06800` a `#8a5a00`: el contraste sobre `--fk-bg-base` sube de 4.38:1 a 5.5:1 (AA para texto normal, antes solo cumplía para texto grande). `--fk-warning-bg` se retinta al mismo tono. El modo oscuro (10.8:1) no se toca.
- **COL.2:** `--fk-text-disabled` sube un punto de contraste en ambos temas: oscuro `#424858` → `#565d72` (2.05:1 → 2.9:1), claro `#b0b4c8` → `#8f94ac` (1.92:1 → 2.8:1). El texto deshabilitado está exento de WCAG, pero con baja visión era ilegible; sigue viéndose claramente inactivo frente a `--fk-text-muted`.

1892/1892 unit verdes; 123/123 E2E (incluye el pase axe con `color-contrast` en Chromium real, que valida COL.1 directamente). Lint limpio. SW v277 → v278.

| Archivo | Cambio |
|---|---|
| `styles/themes.css` | Warning claro oscurecido; disabled claro oscurecido. |
| `styles/tokens.css` | Disabled oscuro aclarado. |
| `service-worker.js` | v277 → v278. |

---

### test(a11y): A11Y.5, pase axe sobre formularios dinámicos en E2E · 2026-07-03

Cierra A11Y.5. `tests/unit/a11y.test.js` solo auditaba el HTML estático de `index.html`; los formularios se inyectan por JS al abrir cada modal y quedaban sin auditar. Nueva suite [tests/e2e/a11y-forms.test.js](../tests/e2e/a11y-forms.test.js): abre en Chromium real los 5 modales representativos (Nuevo gasto, Nueva deuda, Nuevo gasto fijo, Nuevo apartado, Nueva cuenta) y el asistente "Distribuir mi ingreso" (con fondo activo para que haya contenido), inyecta axe-core (la misma devDependency del unit test, cero dependencias nuevas, en línea con `docs/SECURITY.md`) y corre WCAG 2.1 A/AA scoped al contenedor abierto, exigiendo cero violaciones critical/serious. En navegador real `color-contrast` sí es computable, así que no se excluye (a diferencia del unit test en happy-dom).

Resultado: los 6 formularios dinámicos pasan sin violaciones graves (ningún fix requerido). 117/117 → 123/123 E2E; 1892/1892 unit sin cambios; lint limpio. Solo tests: sin cambios en assets de producción, sin bump de SW.

| Archivo | Cambio |
|---|---|
| `tests/e2e/a11y-forms.test.js` | Suite nueva (6 tests axe sobre modales y asistente). |

---

### feat(gastos): TX.6 y TX.7, el gasto hereda el ícono de su compromiso de origen · 2026-07-03

Cierra TX.6 y TX.7 en un solo pase (mismo hook, como sugería el tablero). Un gasto con `compromisoId` nació de un fijo de Calendario (checklist de Necesidades o "marcar pagado") o de un abono a deuda; hasta ahora mostraba el ícono genérico de su categoría: todos los abonos a deuda se veían iguales (💳 de 'Deudas') y los pagos de fijos con el 📦 de 'Otros'.

Nuevo helper puro `emojiPorOrigen(gasto, compromisos)` en [gastos/logic.js](../modules/dominio/gastos/logic.js): fijo → emoji de su categoría de Agenda (`CATEGORIA_AGENDA_EMOJI`, ej. Arriendo 🏠); deuda con entidad → 🏦; deuda personal → 🤝; `null` si no hay origen resoluble (sin `compromisoId`, compromiso eliminado, fijo sin categoría), en cuyo caso `_renderGastoItem` cae al lookup por categoría de siempre. Sin violar la regla de dominios: la vista lee `S.compromisos` (permitido) y el helper es puro (recibe la lista como parámetro).

Verificado con 7 unit tests nuevos del helper (fijo hereda, 🏦 vs 🤝, y los 4 caminos de fallback). 1885/1885 → 1892/1892 unit; 117/117 E2E sin regresiones. Lint limpio. Contenido servido verificado vía `curl`. SW v276 → v277.

| Archivo | Cambio |
|---|---|
| `modules/dominio/gastos/logic.js` | Nuevo `emojiPorOrigen` (importa `CATEGORIA_AGENDA_EMOJI`). |
| `modules/dominio/gastos/view.js` | `_renderGastoItem` resuelve el ícono por origen antes del lookup por categoría. |
| `tests/unit/gastos.test.js` | Suite `emojiPorOrigen` (7 tests). |
| `service-worker.js` | v276 → v277. |

---

### feat(ui): EP.7d, divulgación progresiva en Mis cuentas, Análisis y Me deben. Épica EP.7 completa · 2026-07-03

Cierra EP.7d, el último slice de la revisión del [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md), y con él la épica EP.7 completa (EP.7a a EP.7d):

- **Mis cuentas:** el título del empty state ("¿Dónde tienes tu dinero?", una pregunta gancho que duplicaba la del banner) se recorta a "Agrega tu primera cuenta"; `tieneDatos` = alguna cuenta o algún ingreso ya registrado.
- **Análisis:** el `section__subtitle` "Cómo está tu salud financiera..." se quita de `index.html`; los empties por sub-card (Gastos por categoría, Tendencia de gastos) se revisaron contra el criterio de "no repetir el banner" y ya eran cortos y específicos de su propio dato, se dejan igual; `tieneDatos = S.gastos.length > 0`.
- **Me deben:** empty state recortado; `tieneDatos = S.personales.length > 0`. El fix de copy "Personales" → "Me deben" en el banner ya se había hecho en EP.7a.

Se actualizaron 3 aserciones E2E que verificaban el título viejo del empty state de Mis cuentas.

1885/1885 unit verdes; 117/117 E2E (3 actualizadas, sin regresiones). Lint limpio. Verificado sirviendo el contenido real vía `curl` (mismo síntoma de caché stale del preview ya documentado). SW v275 → v276.

**Con EP.7d cerrado, la épica EP.7 (divulgación progresiva) queda completa en las 11 secciones**: cada una tiene una única descripción de propósito (el banner) que se oculta automáticamente en cuanto la sección tiene datos, sin colapso manual ni preferencia persistida.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/view.js`, `modules/dominio/tesoreria/index.js` | Empty state recortado; nuevo helper `_tieneDatosTesoreria()`. |
| `index.html`, `modules/dominio/analisis/index.js` | Subtítulo de Análisis fuera; `tieneDatos` real. |
| `modules/dominio/personales/view.js`, `modules/dominio/personales/index.js` | Empty state recortado; `tieneDatos` real. |
| `tests/e2e/navegacion-render.test.js` | 3 aserciones actualizadas al nuevo título del empty state de Mis cuentas. |
| `service-worker.js` | v275 → v276. |
| `docs/BOARD.md` | Tarjeta EP.7 borrada (épica cerrada). |

---

### feat(ui): EP.7c, divulgación progresiva en Metas, Ahorro e Inversión · 2026-07-03

Aplica el patrón de EP.7a/EP.7b a los 3 dominios de "Crecer" del [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md):

- **Metas:** el `section__subtitle` "Objetivos aspiracionales: viaje, laptop, boda..." se quita de `index.html`; el empty state se recorta pero conserva en una línea la regla de contexto hacia Apartados (gastos previsibles vs objetivos libres); `tieneDatos = S.metas.length > 0`.
- **Ahorro:** el `section__subtitle` "Tu colchón para imprevistos..." se quita; el empty state se recorta (ya no repite "un imprevisto se cubre con deuda" del banner); `tieneDatos` = fondo de emergencia activo o algún aporte ya registrado.
- **Inversión:** sin subtítulo que barrer; empty state recortado; `tieneDatos = S.inversiones.length > 0`.

Verificación: mismo síntoma de caché HTTP stale del preview ya documentado; se confirmó el contenido real servido vía `curl` y la conducta vía la suite E2E real. 1885/1885 unit verdes (sin cambios de lógica pura); 117/117 E2E sin regresiones. Lint limpio. SW v274 → v275.

| Archivo | Cambio |
|---|---|
| `index.html` | Subtítulos de Metas y Ahorro fuera. |
| `modules/dominio/metas/view.js`, `modules/dominio/metas/index.js` | Empty state recortado; `tieneDatos` real. |
| `modules/dominio/ahorro/view.js`, `modules/dominio/ahorro/index.js` | Empty state recortado; nuevo helper `_tieneDatosAhorro()`. |
| `modules/dominio/inversiones/view.js`, `modules/dominio/inversiones/index.js` | Empty state recortado; `tieneDatos` real. |
| `service-worker.js` | v274 → v275. |

---

### feat(ui): EP.7b, divulgación progresiva en Gastos, Deudas, Calendario y Límites · 2026-07-03

Aplica el patrón de EP.7a (mecanismo `tieneDatos` ya listo) a los 4 dominios siguientes del [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md):

- **Gastos:** empty state recortado de un párrafo a una línea ("Anota tu primera compra o pago."); `tieneDatos = S.gastos.length > 0` (histórico completo, no solo el mes en curso).
- **Deudas:** empty state recortado; `tieneDatos` reusa el helper existente `esDeuda(tipo)` de `compromisos/logic.js` sobre `S.compromisos`.
- **Calendario:** sin subtítulo ni empty state que barrer, solo el wiring de `tieneDatos = S.compromisos.length > 0` (mismos compromisos que Deudas: un fijo o una deuda ya generan eventos del mes).
- **Límites de gasto:** el `section__subtitle` "Sigue tu plan del mes por grupo..." se quita de `index.html`; la nota al pie del resumen ("Mis cuentas planifica...; Límites de gasto vigila...") se retira por repetir el banner casi literal; el copy del banner se reescribe a la estructura de tres tiempos del ADR conservando la relación con Mis cuentas; `tieneDatos` = ingresos registrados (`S.ingresos`) o algún tope por categoría (`S.presupuestos`).

El E2E "MC.5e: la nota de la sección menciona la complementariedad con Mis cuentas" se actualiza: ahora verifica que la nota ya no existe (el mensaje lo cubre el banner, visible solo antes de tener datos).

Verificación: se intentó verificar en el preview, pero el navegador arrastró una caché HTTP obstinada del entorno (síntoma ya documentado en memoria del proyecto: `python -m http.server` no envía `Cache-Control`, así que Chrome sirve módulos stale incluso tras recargar); se confirmó el contenido real servido vía `curl` directo y la verificación conductual se apoyó en la suite E2E real (Playwright/Chromium), que sí corre en un contexto limpio. 1885/1885 unit verdes (sin cambios de lógica pura); 117/117 E2E (1 test actualizado, sin regresiones). Lint limpio. SW v273 → v274.

| Archivo | Cambio |
|---|---|
| `modules/dominio/gastos/view.js`, `modules/dominio/gastos/index.js` | Empty state recortado; `tieneDatos` real en los 3 puntos de render. |
| `modules/dominio/compromisos/views/lista.js`, `modules/dominio/compromisos/index.js` | Empty state recortado; `tieneDatos` vía `esDeuda`. |
| `modules/dominio/agenda/index.js` | `tieneDatos` real en los 3 puntos de render. |
| `index.html`, `modules/dominio/presupuesto/view.js`, `modules/dominio/presupuesto/index.js`, `modules/ui/proposito.js` | Subtítulo y nota fuera; copy del banner reescrito; `tieneDatos` real. |
| `tests/e2e/smoke.test.js` | Test "MC.5e" actualizado a la ausencia de la nota. |
| `service-worker.js` | v273 → v274. |

---

### feat(ui): EP.7a, banner de propósito con divulgación progresiva · 2026-07-03

Cierra EP.7a, el slice piloto de la revisión del [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md). El banner de propósito pasa a ser la **descripción única** de cada sección y **solo se muestra mientras la sección no tiene datos**: `htmlBannerProposito(seccion, tieneDatos)` y `renderBannerProposito(seccion, tieneDatos)` reciben ahora si la sección tiene datos, en vez de leer `S.config.propositoColapsado`. Se retira el mecanismo de colapso manual completo: la clave `S.config.propositoColapsado` deja de leerse (queda huérfana e inofensiva en `localStorage` de usuarios existentes, sin migración), las data-actions `colapsar-proposito`/`expandir-proposito` se eliminan de `actions.js`, y el bloque "Mensajes de ayuda" de Ajustes (`config/view.js` `_renderPropositos`, `config/index.js` acción `reactivar-propositos`) se retira por completo.

Piloto completo en Apartados: el `section__subtitle` "Reservas para gastos previsibles..." se quita de `index.html` (duplicaba el banner), el empty state se recorta de un párrafo largo a "Crea tu primer apartado para empezar a separar dinero." (los tips accionables y la regla de contexto hacia Límites de gasto se conservan), y `apartados/index.js` pasa `S.apartados.length > 0` como `tieneDatos` en los tres puntos de render (inicial, `hashchange`, `state:change`). Verificado en el preview: el banner desaparece al crear el primer apartado sin recargar.

Fix de copy incidental (detectado al revisar el mapa completo): el banner de Me deben decía "Personales te ayuda..." en vez de "Me deben".

Los 10 dominios restantes siguen llamando `renderBannerProposito(seccion)` con un solo argumento: `tieneDatos` queda `undefined` (falsy), así que su banner se sigue mostrando siempre (sin colapso posible) hasta que su propio slice (EP.7b a EP.7d) les aplique el patrón completo.

Tests: se reescribió `tests/unit/proposito.test.js` completo (los tests de colapso/persistencia se reemplazan por tests de visibilidad por `tieneDatos`); 1887 → 1885 unit verdes (menos aserciones repartidas, misma cobertura). 117/117 E2E sin regresiones (ningún E2E tocaba el colapso). Lint limpio. SW v272 → v273.

| Archivo | Cambio |
|---|---|
| `modules/ui/proposito.js` | `htmlBannerProposito`/`renderBannerProposito` reciben `tieneDatos`; se retira todo el mecanismo de colapso (handlers, `initBannersProposito`, `reactivarPropositos`); fix de copy "Personales" → "Me deben". |
| `modules/ui/bootstrap.js` | Se retira el import y la llamada a `initBannersProposito()`. |
| `modules/dominio/config/view.js` | Se retira `_renderPropositos()` y su slot en `renderPanelConfig`. |
| `modules/dominio/config/index.js` | Se retira el import de `reactivarPropositos` y la acción `reactivar-propositos`. |
| `index.html` | Subtítulo de Apartados eliminado. |
| `modules/dominio/apartados/view.js` | Empty state recortado. |
| `modules/dominio/apartados/index.js` | Los 3 renders del banner pasan `S.apartados.length > 0`. |
| `tests/unit/proposito.test.js` | Reescrito para el nuevo contrato. |
| `service-worker.js` | v272 → v273. |

---

### docs(adr): ADR 016 revisado, divulgación progresiva (EP.7, fase de diseño) · 2026-07-03

Cierra la fase de diseño de EP.7 (dirección fijada por el usuario el 2026-07-02, reconfirmada con su observación en Metas: "la descripción solo debe aparecer al inicio"). El [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md) pasa de "banner siempre visible y colapsable" a **divulgación progresiva**:

- **D1:** el banner de propósito es la descripción única de cada sección; los `section__subtitle` descriptivos (Límites, Ahorro, Metas, Apartados, Análisis) y las notas al pie que repiten propósito se eliminan.
- **D2:** la visibilidad se deriva de los datos: el banner solo aparece mientras la sección no tiene datos. Se van el colapso manual, `S.config.propositoColapsado` (clave huérfana inofensiva, sin migración), las data-actions `colapsar-proposito`/`expandir-proposito` y el bloque "Mensajes de ayuda" de Ajustes.
- **D3:** el empty state deja de describir y pasa a accionar (título + una línea + CTA); los tips accionables y las reglas de contexto de ADR 014 quedan.
- **D4:** guards de formulario y notas contextuales de datos no se tocan.
- **D5:** contrato: `htmlBannerProposito` devuelve `''` cuando la sección tiene datos; cada dominio pasa el mismo predicado de su empty state.

La revisión incluye la tabla del criterio "tiene datos" para las 11 secciones, el inventario texto por texto (archivo y línea aproximada: qué queda, qué se recorta, qué se va, incluido el fix de copy "Personales" → "Me deben" en el banner) y los 4 slices de implementación: EP.7a (piloto: mecanismo + Apartados + Ajustes), EP.7b (Gastos, Deudas, Calendario, Límites), EP.7c (Metas, Ahorro, Inversión), EP.7d (Mis cuentas, Análisis, Me deben).

Solo docs: sin cambios de código. 1887/1887 unit verdes (sin cambios). Podría afectar (cuando se implemente): visibilidad del banner en las 11 secciones, empty states, Ajustes. Validación pendiente: ninguna para esta fase; cada slice se verifica en la app al implementarse.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/016-banner-proposito-de-seccion.md` | Estado actualizado; notas "Revisada el 2026-07-03" en decisiones 1, 2, 6 y 7; sección "Revisión 2026-07-03" (por qué, D1 a D5, criterio por sección, inventario transversal y por sección, consecuencias, slices EP.7a a EP.7d). |
| `docs/BOARD.md` | Tarjeta EP.7 actualizada: diseño cerrado, quedan los slices. |
| `docs/HANDOFF.md` | Entrada nueva en "Qué se hizo recientemente". |

---

### chore(tesoreria): MC.12, renombrar "Ingreso" a "Ingresos fijos" · 2026-07-03

Cierra MC.12 (tarea de copy solamente). La sección de ingresos en Mis cuentas se llamaba "Ingreso" (singular, demasiado general); ahora se llama "Ingresos fijos" para dejar claro que registra recurrentes (salario, honorarios periódicos, pensión). Solo cambio en copy visible y `aria-label`; IDs internas del DOM quedan estables.

Puntos tocados: titulo ("Mis ingresos" → "Mis ingresos fijos"), botón ("+ Ingreso" → "+ Ingreso fijo"), modal ("Nuevo ingreso" → "Nuevo ingreso fijo"), diálogo de edición ("Editar ingreso" → "Editar ingreso fijo"), diálogo de eliminación ("Eliminar ingreso" → "Eliminar ingreso fijo"), y mensajes de confirmación (guardado/actualizado/eliminado). Verificado en el preview. 1887/1887 unit verdes.

| Archivo | Cambio |
|---|---|
| `index.html` | Título h2, botón, modal title. |
| `modules/dominio/tesoreria/index.js` | Mensajes + diálogos. |

---

### fix(tesoreria): MC.7f, pulido del asistente (copy, foco, transición, estados vacíos) · 2026-07-03

Cierra MC.7f (opcional), el último punto de la épica MC.7. Ninguna lógica financiera nueva: ajustes de copy, accesibilidad y una transición sutil sobre el shell paginado que ya entregaron MC.7d y MC.7e.

- **Copy por paso.** El Paso 2 ganó un título consistente con el resto ("💰 Ahorro, deudas e inversiones · ajusta cuánto destinar a cada una:"), igual que el Paso 1 ya tenía el suyo.
- **Estado vacío corregido.** El hint "Sugerencia: $X a ahorro..." aparecía aunque no hubiera ninguna fila de Ahorro (sin fondo activo, sin metas, sin apartados) donde poner esa sugerencia, un texto confuso sin destino. Ahora solo se muestra cuando existe al menos una fila de Ahorro.
- **Indicador de paso más limpio.** "Paso X de N" solo aporta con 2 o más pasos; con un asistente de un único paso (posible con MC.7e: 2+ cuentas pero nada más que repartir) el indicador ya no aparece.
- **Foco al avanzar (a11y, WAI-ARIA APG para asistentes multi-paso).** Cada contenedor de paso ganó `tabindex="-1"`; al hacer clic en "Siguiente"/"Atrás", el foco se mueve al contenedor del paso recién mostrado. Su `aria-label` ("Paso X de N: <título>") queda anunciado por el simple hecho de recibir foco, sin depender de que el usuario esté cerca del indicador `role="status"`. Al abrir el panel por primera vez se preserva el comportamiento anterior (foco al monto a distribuir), no al contenedor del Paso 1.
- **Transición sutil.** Un fade-in corto (180ms) al mostrar un paso nuevo, con `@media (prefers-reduced-motion: no-preference)` (mismo patrón que el resto de la app); `a11y.css` ya colapsa duraciones globalmente bajo `reduce` como defensa adicional.

Verificado con 3 E2E nuevos en Chromium real (foco se mueve al paso al avanzar/retroceder y se preserva en la apertura inicial; indicador ausente con un solo paso; hint de ahorro ausente cuando no hay fila de Ahorro) y la suite completa de "Distribuir mi ingreso" (19 tests) sin regresiones. 1887/1887 unit sin cambios (nada de lo tocado tiene lógica pura nueva); 114/114 → 117/117 E2E. Lint limpio. SW v271 → v272.

**La épica MC.7 (asistente "Distribuir mi ingreso") queda completa: MC.7a a MC.7f entregados.**

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/view.js` | Título del Paso 2; hint de ahorro condicionado a `ahorro.length > 0`; indicador de paso omitido con un solo paso; `tabindex="-1"` en cada contenedor de paso. |
| `modules/dominio/tesoreria/index.js` | `_irAPasoDistribucion` gana `{ moverFoco }`; mueve el foco al contenedor del paso al avanzar/retroceder, salvo en la apertura inicial. |
| `styles/components/forms.css` | Transición `distribuir-paso-in` (fade + translateY corto, bajo `prefers-reduced-motion: no-preference`); `.distribuir__paso:focus { outline: none }` (el cambio de contenido ya es la señal visual). |
| `tests/e2e/smoke.test.js` | 3 tests nuevos (foco al avanzar/retroceder, indicador ausente con un paso, hint de ahorro ausente sin fila de Ahorro). |
| `service-worker.js` | v271 → v272. |

---

### feat(tesoreria): MC.7e, Paso 3 reparte Estilo de vida entre cuentas · 2026-07-03

Cierra MC.7e (ADR 018 decisión 4), la última tarjeta de prioridad alta de la épica del asistente "Distribuir mi ingreso". Con **2 o más cuentas activas**, el paso final "Estilo de vida" gana una sección "¿Quieres mover parte a otras cuentas?": una fila editable por cuenta activa (mismo patrón toggle + monto del resto del panel), mostrando el saldo actual de cada una como contexto. Con **una sola cuenta activa** el paso sigue siendo puramente informativo, sin cambios (regla de cuenta única).

Diseño deliberadamente conservador para evitar un problema de orden: la cuenta de origen (desde dónde sale el ingreso y se pagan Necesidades/Ahorro/Deudas/Inversiones) solo se resuelve **al confirmar** (R2 del ADR, una sola pregunta al final), así que en el momento de renderizar el Paso 3 todavía no se sabe cuál cuenta es "el origen". En vez de asumir una por defecto (riesgo de mover dinero por error si el usuario elige otra cuenta en el picker final), las filas de transferencia arrancan **sin marcar y en $0**: el remanente completo sigue en la cuenta de origen salvo que el usuario opte explícitamente por mover algo a otra. Al confirmar, cualquier fila cuyo destino resulte ser la propia cuenta de origen es un no-op transparente (el dinero ya estaba ahí).

Nuevo helper puro `construirFilasTransferenciaCuentas(cuentas)` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js): una fila por cuenta activa, ordenadas de mayor a menor saldo. En [tesoreria/index.js](../modules/dominio/tesoreria/index.js): `_leerTransferenciasCuentas()` lee las filas marcadas (excluidas explícitamente de `_leerItemsDistribucion`, que ya no las cuenta como "asignado" del ingreso: son redistribuciones internas, no gasto nuevo); `_validarTransferenciasCuentas()` topa la suma contra el presupuesto de Estilo de vida ya recalculado sobre el remanente real (R3), con su propio resumen en vivo (`#distribuir-cuentas-resumen`) y su propio bloqueo de "Distribuir" si excede. `_confirmarDistribucion()` aplica las transferencias antes de fijar el saldo final de la cuenta de origen (descuenta lo transferido junto con lo demás que sale de ahí); `_SLICES_DISTRIBUCION` ya incluía `cuentas`, así que "Deshacer" revierte todo sin cambios adicionales. Al arreglar el guard de habilitación se corrigió un bug encontrado durante la verificación: "Distribuir" exigía `asignado > 0`, lo que bloqueaba una distribución que **solo** mueve dinero entre cuentas (nada marcado en Necesidades/Ahorro/Deudas/Inversiones); ahora también se habilita con `transferido > 0`. También se corrigió el guard de contenido del panel (`_renderPanelDistribuir`), que antes ocultaba el botón entero si Necesidades/Ahorro/Deudas/Inversiones estaban vacíos, sin considerar que 2+ cuentas ya son motivo suficiente para mostrar el asistente.

Sin schema nuevo (decisión 7 del ADR se mantiene): son ajustes de saldo entre cuentas ya existentes, igual que cualquier otro movimiento de tesorería.

Verificado con 4 tests unitarios nuevos de `construirFilasTransferenciaCuentas` y 5 E2E nuevos en Chromium real (una cuenta activa sin filas de transferencia; 2+ cuentas sin marcar nada por defecto; el resumen en vivo bloquea "Distribuir" si excede el presupuesto de Estilo de vida; confirmar mueve el saldo correctamente entre cuentas; Deshacer revierte la transferencia). Verificación visual adicional en el preview (móvil): las filas de cuenta, el resumen en vivo y el bloqueo del botón. 1883/1883 → 1887/1887 unit; 109/109 → 114/114 E2E. Lint limpio. SW v270 → v271.

Con esto, la épica del asistente "Distribuir mi ingreso" (MC.7) solo deja pendiente el pulido opcional MC.7f.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | Nuevo helper puro `construirFilasTransferenciaCuentas(cuentas)`. |
| `modules/dominio/tesoreria/view.js` | `_filaDistribuir` soporta tipo 'cuenta' (saldo actual, sin marcar por defecto); `_renderPanelDistribuir` agrega la sección de transferencias al paso final y corrige el guard de contenido vacío. |
| `modules/dominio/tesoreria/index.js` | `_leerTransferenciasCuentas`, `_validarTransferenciasCuentas`, `_aplicarTransferenciasCuentas`; `_leerItemsDistribucion` excluye tipo 'cuenta'; guards de habilitación de "Distribuir" ahora aceptan `transferido > 0` sin nada más asignado. |
| `tests/unit/tesoreria.test.js` | Suite `construirFilasTransferenciaCuentas` (4 tests). |
| `tests/e2e/smoke.test.js` | Suite nueva "reparto de Estilo de vida entre cuentas (MC.7e)" (5 tests). |
| `service-worker.js` | v270 → v271. |

---

### feat(tesoreria): MC.7d completo, asistente paginado + ahorro sobre el remanente real (R3) · 2026-07-03

Cierra la tarjeta MC.7d del tablero (las dos partes que quedaban tras el slice 1 del 2026-07-03). El panel "Distribuir mi ingreso" ahora es un **asistente paginado** de hasta 3 pasos (Necesidades → Ahorro, deudas e inversiones → Estilo de vida) con navegación Atrás/Siguiente inline, indicador "Paso X de N" (`role="status"`, anuncia el cambio a lectores de pantalla) y **confirmación única al final**: el botón "Distribuir" solo existe en el último paso. Solo se crean los pasos con contenido (sin Necesidades el asistente arranca en las asignaciones); el monto a distribuir, el indicador y el resumen en vivo quedan fuera de la paginación, visibles siempre. Al abrir, el asistente siempre arranca en el primer paso; si el botón con foco se oculta al navegar, el foco pasa al de navegación visible.

**R3 (ADR 018 revisión 2026-07-02):** el Paso 2 ya no sugiere el ahorro como % teórico del split total. Nuevo helper puro `presupuestosSobreRemanente(monto, necesidadesMarcadas, ahorroPct, estiloVidaPct)` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js): reparte el **remanente real** (monto menos Necesidades marcadas) entre Ahorro y Estilo de vida conservando la proporción del split, con un tope en la sugerencia teórica de cada grupo (marcar menos Necesidades no infla el ahorro: lo no marcado sigue comprometido y se paga después por los flujos de siempre). La fila del fondo de emergencia absorbe en vivo el excedente de ese presupuesto tras los aportes marcados a metas/apartados (nuevo campo `autoExcedente` en `construirDesgloseAhorroPorObjetivo`, `data-dist-auto` en la vista), hasta que el usuario la edite a mano (`data-editado`, se respeta su valor) o la excluya del plan. El hint de sugerencia y la fila informativa de Estilo de vida también se recalculan en vivo al cambiar marcas o monto.

Verificado con 8 tests unitarios nuevos de `presupuestosSobreRemanente` (anclaje al split cuando lo marcado iguala su % teórico; encogimiento proporcional con Necesidades altas; tope teórico al marcar menos; remanente 0; sin fuga por redondeo; splits con 0% en un grupo; entradas no numéricas) y 2 E2E nuevos en Chromium real (navegación completa del asistente con visibilidad de botones por paso; R3 en vivo: desmarcar una Necesidad de 2,7M sube la sugerencia del fondo de 120.000 a 600.000 y editarlo a mano lo saca del modo automático). Los 8 E2E existentes del panel se adaptaron al shell (helper `avanzarDistribuirHasta`). Verificación visual adicional en el preview (desktop y móvil): los 3 pasos, la navegación y los recálculos en vivo. 1875/1875 → 1883/1883 unit; 107/107 → 109/109 E2E. Lint limpio. SW v269 → v270.

Con MC.7d cerrada, **MC.7e (Paso 3: reparto de Estilo de vida entre cuentas) queda desbloqueada**.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | Nuevo helper puro `presupuestosSobreRemanente`; `construirDesgloseAhorroPorObjetivo` expone `autoExcedente` en la fila del fondo. |
| `modules/dominio/tesoreria/view.js` | `_renderPanelDistribuir` reescrito como shell paginado (pasos dinámicos, indicador, nav Atrás/Siguiente, Distribuir al final); presupuesto inicial sobre el remanente con el checklist por defecto; hint y fila de Estilo de vida con spans actualizables. |
| `modules/dominio/tesoreria/index.js` | Navegación del asistente (`_irAPasoDistribucion`, acciones `distribuir-paso-siguiente`/`atras`); `_actualizarSugerenciasRemanente` (R3) invocada desde `_recalcularDistribucion`; flag `data-editado` al editar una fila a mano. |
| `styles/components/forms.css` | Estilos del indicador de paso y la barra de navegación del asistente. |
| `tests/unit/tesoreria.test.js` | Suite nueva `presupuestosSobreRemanente` (8 tests); shapes del fondo con `autoExcedente`. |
| `tests/e2e/smoke.test.js` | Helper `avanzarDistribuirHasta`; suite nueva "asistente paginado (MC.7d)" (2 tests); 8 tests existentes adaptados al shell. |
| `service-worker.js` | v269 → v270. |

---

### fix(tesoreria): tope coordinado entre cuota del checklist y abono extra (BUG-009) · 2026-07-03

Cierra el último bug pendiente de la revisión exhaustiva de Mis cuentas, implementando el diseño decidido con el usuario el mismo día (entrada anterior). Una deuda con `cuotaMensual > 0` y saldo pendiente aparece a la vez en el checklist de Necesidades del panel "Distribuir mi ingreso" (su cuota, marcada por defecto) y en "Abonar extra a deudas" (input libre); si el usuario marcaba ambos, la cuenta se debitaba `cuota + extra` mientras la deuda solo podía bajar hasta 0, sobrepagando.

El fix agrega un helper puro `topeAbonoExtraDeuda(saldoTotal, cuotaMarcada, extraSolicitado)` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js): calcula `disponible = max(0, saldoTotal - cuotaMarcada)` y devuelve `min(extraSolicitado, disponible)`. En [tesoreria/index.js](../modules/dominio/tesoreria/index.js), `_leerItemsDistribucion()` gana un segundo parámetro (las Necesidades ya leídas por `_leerNecesidadesMarcadas`), suma la cuota marcada de la misma deuda por `id` y usa el helper en vez del `Math.min(monto, _saldoDeuda(id))` anterior, que topaba contra el saldo previo sin descontar lo que la cuota del checklist ya iba a pagar. `_recalcularDistribucion()` y `_confirmarDistribucion()` ahora leen las Necesidades primero y se las pasan a `_leerItemsDistribucion()`, de modo que el resumen en vivo y el `apply` comparten el mismo monto efectivo, la garantía que el docstring de esa función ya prometía mucho antes de que ambos flujos pudieran chocar en la misma deuda.

Verificado con 5 tests unitarios nuevos de `topeAbonoExtraDeuda` (sin cuota marcada replica el comportamiento previo; resta la cuota antes de topar el extra; permite el extra hasta lo que queda; nunca negativo si la cuota supera el saldo; valores no numéricos como 0) más 1 E2E en Chromium real que reproduce el escenario exacto del bug: deuda con saldo 300.000 y cuota 100.000 marcada por defecto, el usuario pide un extra de 300.000 (más de lo disponible); el resumen en vivo ya muestra "Asignado: $300.000" en vez de $400.000, y tras confirmar la deuda queda en 0 (nunca negativa), los dos gastos generados suman exactamente 300.000 y la cuenta se debita 300.000, no 400.000. 1870/1870 → 1875/1875 unit; 106/106 → 107/107 E2E. Lint limpio. SW v268 → v269.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | Nuevo helper puro `topeAbonoExtraDeuda(saldoTotal, cuotaMarcada, extraSolicitado)`. |
| `modules/dominio/tesoreria/index.js` | `_leerItemsDistribucion()` gana el parámetro `necesidades` y usa `topeAbonoExtraDeuda`; `_recalcularDistribucion()` y `_confirmarDistribucion()` le pasan las Necesidades ya leídas. |
| `tests/unit/tesoreria.test.js` | 5 tests nuevos de `topeAbonoExtraDeuda`. |
| `tests/e2e/smoke.test.js` | Suite nueva "cuota del checklist + abono extra a la misma deuda no sobrepaga (BUG-009)", 1 test. |
| `service-worker.js` | v268 → v269. |
| `docs/BUGS.md` | BUG-009 resuelto (eliminado). Sin errores pendientes por primera vez desde que se abrió el registro. |

---

### docs(bugs): diseño de BUG-009 decidido, cuota + extra con tope coordinado · 2026-07-03

Tarea de decisión de diseño, sin código. BUG-009 (una misma deuda puede sobrepagarse combinando su cuota del checklist de Necesidades y un abono extra en "Distribuir mi ingreso") quedó registrado el mismo día con la pregunta abierta: ¿se permite pagar cuota + extra a la misma deuda en un mismo movimiento?

**Decisión del usuario, con recomendación del análisis:** sí se permite, con tope coordinado. El extra efectivo pasa a ser `min(extra, saldoTotal - cuotaMarcada)`; si la cuota marcada ya cubre todo el saldo, el extra queda en 0 y se ignora. Pagar la cuota y abonar extra al capital en el mismo movimiento es un comportamiento financiero real y sano que Finko fomenta (el orden Avalancha de "Abonar extra a deudas" existe justo para eso), y el fix es la extensión natural del patrón de topes ya vigente: el docstring de `_leerItemsDistribucion` ya promete que "el resumen y el apply usan el mismo monto efectivo", solo que hoy el tope (`_saldoDeuda`) ignora la cuota marcada en el checklist. Alternativas descartadas: excluir la deuda de "Abonar extra" cuando su cuota está marcada (elimina un flujo legítimo y exige filas que aparecen/desaparecen en vivo) y bloquear la confirmación con un error (fricción, rechaza una intención válida).

El diseño completo con los puntos de implementación (en `modules/dominio/tesoreria/index.js`: `_leerItemsDistribucion` recibe las Necesidades marcadas para restar la cuota del tope; helper puro del tope en `logic.js` con unit tests; E2E del escenario exacto del bug) quedó en la entrada BUG-009 de [BUGS.md](BUGS.md). La implementación es una tarea aparte; BUG-009 sigue pendiente hasta entonces.

| Archivo | Cambio |
|---|---|
| `docs/BUGS.md` | BUG-009 gana la línea "Diseño" con la decisión y el plan de implementación; se retira el "fix probable" abierto. |
| `docs/HANDOFF.md` | Entrada en "Qué se hizo recientemente" (sale MC.7d slice 1 hacia el puntero de tareas anteriores). |
| `docs/CHANGELOG.md` | Esta entrada. |

---

### fix(tesoreria): copy de la cuota de manejo corregido y validaciones rechazan Infinity (BUG-007, BUG-008) · 2026-07-03

Cierra los dos bugs de baja prioridad de la revisión de Mis cuentas, dejando la sección sin bugs pendientes salvo BUG-009 (media, requiere una decisión de diseño).

**BUG-007:** el formulario de cuenta, al activar la cuota de manejo, decía "Finko crea un gasto fijo mensual con este monto y día. Lo vas a ver en Calendario y en Deudas." La sección Deudas solo lista deudas desde la reestructuración v6 (los gastos fijos, incluida la cuota de manejo, se gestionan en Calendario); el copy quedó desactualizado desde entonces. Fix de una línea en [tesoreria/view.js](../modules/dominio/tesoreria/view.js): "Lo verás en Calendario."

**BUG-008:** `validarIngreso()` y `validarCuenta()` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js) usaban `isNaN(x) || x <= 0` (o `< 0`) para validar montos. `isNaN(Infinity)` es `false`, así que un monto como `'1e999'` (que `Number()` convierte a `Infinity`) pasaba la validación: un ingreso o saldo Infinity contaminaba la distribución sugerida con montos no representables en pantalla, y al persistir `JSON.stringify` lo serializaba silenciosamente como `null`, dejando un dato corrupto en `localStorage`. Fix: los tres guards (`monto` de ingreso, `saldo` de cuenta, `cuotaManejoMonto`) cambian a `!Number.isFinite(x)`, que rechaza `NaN`, `Infinity` y `-Infinity` por igual. El guard de `cuotaManejoDia` ya usaba `Number.isInteger`, que también excluye `Infinity`; se simplificó quitando el `isNaN` redundante que llevaba delante.

El alcance de BUG-008 se mantuvo en tesorería, como quedó registrado originalmente ("el patrón probablemente se repite en otros dominios: confirmarlo al revisar cada sección"); extenderlo ahora a otros dominios habría sido un cambio de alcance no pedido.

Verificado con 4 tests unitarios nuevos (`validarIngreso` rechaza monto Infinity; `validarCuenta` rechaza saldo Infinity y -Infinity; la cuota de manejo rechaza monto Infinity). Sin E2E nuevo: el copy no tenía ninguna aserción existente que actualizar y el cambio de validación ya está cubierto a nivel de lógica pura. 1866/1866 → 1870/1870 unit; 106/106 E2E sin cambios (sin regresiones). Lint limpio. SW v267 → v268.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/view.js` | Copy de la cuota de manejo: "Lo vas a ver en Calendario y en Deudas." → "Lo verás en Calendario." |
| `modules/dominio/tesoreria/logic.js` | `validarIngreso()`, `validarCuenta()`: `isNaN` → `!Number.isFinite` en los 3 guards de monto/saldo; guard de `cuotaManejoDia` simplificado. |
| `tests/unit/tesoreria.test.js` | 4 tests nuevos (BUG-008): rechazo de Infinity en monto de ingreso, saldo de cuenta (positivo y negativo) y monto de cuota de manejo. |
| `service-worker.js` | v267 → v268. |
| `docs/BUGS.md` | BUG-007 y BUG-008 resueltos (eliminados). |

---

### fix(compromisos): el abono extra a deudas desde "Distribuir mi ingreso" registra el gasto (BUG-006); nuevo BUG-009 · 2026-07-03

Cuarto bug de la revisión de Mis cuentas, ya de prioridad media. El panel "Distribuir mi ingreso" permite abonar un extra a cada deuda pendiente (sección "Abonar extra a deudas", aparte de la cuota del checklist de Necesidades). Al confirmar, el abono extra bajaba el `saldoTotal` de la deuda y descontaba la cuenta de origen, pero no dejaba ningún registro de gasto: el handler de `distribucion:aplicar` en [compromisos/index.js](../modules/dominio/compromisos/index.js) solo hacía `editar('compromisos', ...)` con el nuevo saldo. El abono quedaba invisible para Análisis (que lee los gastos del mes), para el ejecutado por grupo de Límites (ADR 017) y para el guard "ya pagado este periodo" del propio checklist. El flujo de abono individual (`_guardarAbono`) y el pago de cuota del checklist (`_aplicarNecesidad`) sí registran ese gasto; el abono extra era el único de los tres que no lo hacía.

El fix agrega al handler la creación del gasto-abono con el mismo shape que los otros dos flujos (`descripcion: 'Abono: <deuda>'`, categoría "Deudas", `compromisoId`, `cuentaId`), leyendo `cuentaOrigenId` del payload del evento (ya viajaba, el handler no lo destructuraba). El handler sigue sin tocar la cuenta: el descuento del saldo lo centraliza tesorería en `_confirmarDistribucion` (el monto ya está en `descontable`), así que no hay doble descuento. La slice `gastos` ya estaba en `_SLICES_DISTRIBUCION` (agregada en MC.7d slice 1), de modo que "Deshacer" revierte también el nuevo gasto sin cambios extra.

**BUG-009 detectado al implementar este fix (registrado, no corregido aquí):** una misma deuda con `cuotaMensual > 0` y saldo pendiente aparece a la vez en el checklist de Necesidades (su cuota, marcada por defecto) y en "Abonar extra" (input en 0). Si el usuario marca la cuota y además escribe un extra para esa deuda, ambos se aplican y la cuenta se debita `cuota + extra` mientras la deuda solo puede bajar hasta 0; con montos cercanos al saldo se sobrepaga. Es preexistente en la matemática de la cuenta (el `descontable` ya debitaba ambos); este fix solo lo hizo visible al crear el segundo gasto. Requiere una decisión de diseño (¿se permite pagar cuota + extra en un mismo movimiento, o una deuda ya en el checklist no debe ofrecerse también como extra?), por eso se registró como BUG-009 en vez de ampliar el alcance de esta tarea.

Verificado con 2 E2E nuevos en Chromium real: una deuda con `cuotaMensual: 0` (para que aparezca solo en "Abonar extra", aislando la ruta) recibe un abono extra de $500.000, y al confirmar se crea el gasto con el shape correcto, la deuda baja a $1.500.000 y la cuenta se descuenta una sola vez; el segundo test confirma que "Deshacer" borra el gasto y restaura saldo de deuda y cuenta. El fix vive en el handler de EventBus (capa `index.js`, no cubierta por unit tests, excluida de coverage por diseño), de ahí que la verificación sea E2E. La verificación en el preview interactivo mostró el módulo `compromisos/index.js` cacheado de una sesión anterior (el servidor sí sirve el código nuevo, confirmado por fetch; `location.reload()` no invalida la caché heurística de módulos ES de `python -m http.server`), comportamiento ya documentado en la memoria del entorno; la E2E en Chromium fresco (contexto nuevo por test) es la verificación autoritativa. 1866/1866 unit; 104/104 → 106/106 E2E. Lint limpio. SW v266 → v267.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/index.js` | El handler de `distribucion:aplicar` crea el gasto-abono (mismo shape que el abono individual) y lee `cuentaOrigenId` del evento; importa `hoy` de utils. |
| `tests/e2e/smoke.test.js` | Suite nueva "abono extra a deudas (BUG-006)", 2 tests (registro del gasto + Deshacer). |
| `service-worker.js` | v266 → v267. |
| `docs/BUGS.md` | BUG-006 resuelto (eliminado); BUG-009 nuevo. |

---

### fix(tesoreria): la cuota de manejo cuenta como gasto fijo mensual (BUG-005) · 2026-07-03

Tercer bug de prioridad alta de la revisión exhaustiva de Mis cuentas. Cuando el usuario marca "esta cuenta cobra cuota de manejo mensual" en el formulario de cuenta, Finko crea un compromiso fijo vinculado (`esCuotaManejo: true`) que representa ese cobro recurrente. Ese compromiso nacía con `frecuencia: 'mensual'` en minúscula, pero todo el resto de la app compara contra `'Mensual'` capitalizado: el catálogo `FRECUENCIAS`, la tabla `_FACTOR_MENSUAL` de tesorería y la `FACTOR_MENSUAL` de compromisos. El resultado era una cuota fantasma: no sumaba en `calcularGastosFijosMensuales` (factor `undefined → 0`), así que no entraba en las Necesidades del modelo de distribución (`construirContextoDistribucion` → `sugerirDistribucionIngreso`), no inflaba el objetivo del fondo de emergencia (gastos fijos × meses de respaldo), no aparecía en el checklist de Necesidades de "Distribuir mi ingreso" (que filtra por `frecuencia === 'Mensual'`) y proyectaba $0 como equivalente mensual en la lógica de Deudas. Solo se veía en Calendario, y por casualidad: `_diasParaCompromiso` de Agenda trata cualquier frecuencia no reconocida como mensual (fallback conservador de su `default`).

El fix tiene dos partes, porque hay dos poblaciones de datos. Para las cuotas que se creen de ahora en adelante, `compromisoDesdeCuotaManejo()` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js) escribe `'Mensual'`. Para las cuotas ya guardadas en los dispositivos de los usuarios, una migración idempotente v19 → v20 en [storage.js](../modules/core/storage.js) capitaliza la `frecuencia` de los compromisos con `esCuotaManejo === true` que tengan exactamente `'mensual'` (los que ya están en `'Mensual'`, o cualquier otro valor, se dejan igual; sin `esCuotaManejo` no se tocan). Como todas las migraciones del proyecto, corre en memoria (`S`) en cada `loadData()` y se persiste en el siguiente `save()`, no fuerza una escritura al cargar; el efecto es visible de inmediato porque la UI lee de `S`.

Este cambio hace, por diseño, que la cuota de manejo aparezca ahora como una Necesidad marcable en "Distribuir mi ingreso": es una obligación mensual real, coherente con que el usuario pueda registrar su pago desde ahí igual que cualquier otro fijo (mismo `_pagadoEstePeriodo` compartido, sin doble registro con Calendario). Observación menor detectada al verificar en el navegador, no corregida aquí (es preexistente y ortogonal): el resumen de la tarjeta de distribución redondea a porcentaje entero, así que una necesidad de $15.000 sobre un ingreso de $3.000.000 (0,5%) se muestra como 1% · $30.000 en el resumen agregado, aunque el checklist muestra el monto exacto; afecta a cualquier necesidad pequeña, no solo a la cuota de manejo.

Verificado con 6 tests unitarios nuevos (4 de la migración v19→v20: capitaliza la cuota, no toca un fijo normal, idempotente sobre 'Mensual', no-op sin compromisos; 2 de integración: la cuota generada cuenta en `calcularGastosFijosMensuales` y aparece en `construirDesgloseNecesidades`), el shape esperado de `compromisoDesdeCuotaManejo` actualizado a `'Mensual'` (el test afirmaba el valor buggy y lo entrenaba), más 1 E2E en Chromium real que carga un estado v19 con la cuota en minúscula, comprueba que aparece en el checklist tras la migración y que confirmar la distribución persiste `'Mensual'`. Verificación adicional en el preview interactivo (cargó bien): una cuota de manejo de $15.000 aparece en el checklist con su monto exacto y contribuye al cálculo de Necesidades del modelo de distribución. 1861/1861 → 1866/1866 unit; 103/103 → 104/104 E2E. Lint limpio. SW v265 → v266.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `compromisoDesdeCuotaManejo()` escribe `frecuencia: 'Mensual'` (era `'mensual'`). |
| `modules/core/storage.js` | Migración v19 → v20: capitaliza la frecuencia de las cuotas de manejo ya guardadas; `SCHEMA_VERSION` 19 → 20. |
| `tests/unit/storage.test.js` | 4 tests nuevos de la migración v19 → v20. |
| `tests/unit/tesoreria.test.js` | Shape de `compromisoDesdeCuotaManejo` a `'Mensual'`; 1 test de integración (la cuota cuenta en cálculos mensuales y checklist). |
| `tests/e2e/smoke.test.js` | 1 test nuevo: migración + aparición en el checklist + persistencia en Chromium real. |
| `service-worker.js` | v265 → v266. |

---

### fix(tesoreria): el checklist de Necesidades no vuelve a pagar lo ya pagado ni sobrepaga deudas (BUG-003, BUG-004) · 2026-07-03

Corrige los dos bugs de prioridad alta encontrados en la revisión exhaustiva de Mis cuentas del mismo día (ver la entrada de abajo). Ambos vivían en el checklist accionable de Necesidades del panel "Distribuir mi ingreso" (MC.7d, ADR 018).

**BUG-003:** una fila del checklist ya pagada este periodo nace `checked disabled` para comunicar "esto ya está cubierto", pero un checkbox deshabilitado sigue reportando `.checked === true` en el DOM. `_leerNecesidadesMarcadas()` en [tesoreria/index.js](../modules/dominio/tesoreria/index.js) filtraba solo por `.checked`, así que confirmar la distribución con esa fila presente volvía a pagar un gasto o abono ya registrado: segundo gasto vinculado al mismo compromiso, segundo descuento de la cuenta. Fix de una línea: el filtro exige además `!chk.disabled`. Esto también corrige el resumen en vivo ("Asignado: $X"), que antes sumaba el monto de las filas ya pagadas.

**BUG-004:** `construirDesgloseNecesidades()` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js) usaba `cuotaMensual` de una deuda sin toparla contra su `saldoTotal` pendiente ni excluir las deudas ya saldadas (`saldoTotal <= 0`). Una deuda con cuota de $200.000 y saldo pendiente de solo $50.000 ofrecía y registraba el abono completo de $200.000: la deuda quedaba en $0 correctamente, pero $150.000 de más salían de la cuenta como gasto real, sin ningún lugar a donde ir. Una deuda ya saldada pero sin archivar seguía apareciendo como pendiente, algo que el formulario de abono individual ya rechazaba ("Esta deuda ya está saldada"). Fix: `monto = Math.min(cuotaMensual, saldoTotal)` y el filtro de entrada exige `saldoTotal > 0`, mismo criterio que ya usa `deudasPendientes` en `view.js` para las filas de "Abonar extra a deudas".

Verificado con 4 tests unitarios nuevos en `construirDesgloseNecesidades` (tope activo, tope no interfiere cuando el saldo alcanza, exclusión de deuda saldada, exclusión de saldo negativo) más 2 E2E nuevos en Chromium real que reproducen exactamente los escenarios de los bugs: confirmar con una Necesidad ya pagada presente no la duplica y el resumen en vivo la excluye; el checklist topa la cuota de una deuda a su saldo pendiente y excluye una deuda saldada, con el abono real registrado por el monto correcto. Verificación adicional en el preview interactivo (que esta vez sí cargó la app): confirmé la distribución en vivo con las tres condiciones a la vez (fijo ya pagado + deuda con cuota mayor al saldo + deuda saldada) y el saldo final de la cuenta, el conteo de gastos y el saldo de la deuda coincidieron con lo esperado. 1857/1857 → 1861/1861 unit; 101/101 → 103/103 E2E. Lint limpio. SW v264 → v265.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/index.js` | `_leerNecesidadesMarcadas()` agrega `&& !chk.disabled` al filtro. |
| `modules/dominio/tesoreria/logic.js` | `construirDesgloseNecesidades()` topa el monto de deuda a `saldoTotal` y excluye deudas con `saldoTotal <= 0`. |
| `tests/unit/tesoreria.test.js` | `compDeudaBase()` gana `saldoTotal` por defecto; 4 tests nuevos de BUG-004. |
| `tests/e2e/smoke.test.js` | 2 tests nuevos: BUG-003 (confirmar sin duplicar una fila ya pagada) y BUG-004 (tope de cuota + exclusión de deuda saldada). |
| `service-worker.js` | v264 → v265. |

---

### docs(revision): revisión exhaustiva de Mis cuentas, 6 bugs registrados (BUG-003 a BUG-008) · 2026-07-03

Arranque del plan de validación sección por sección acordado con el usuario (orden: seguir el flujo del dinero, empezando por Mis cuentas como base de todo y dominio con el cambio más reciente). La revisión cubrió el dominio completo (`tesoreria/logic.js`, `view.js`, `index.js`, 3.208 líneas), sus integraciones (crud, cuenta-helper, EventBus `distribucion:aplicar` en los 5 dominios consumidores, Agenda "Marcar pagado", abono individual de Deudas), los ADR que lo gobiernan (012, 013, 017, 018) y todo el copy de la sección. Cada sospecha se confirmó empíricamente antes de registrarse: 13 sondas unitarias (happy-dom) y 3 sondas E2E (Chromium real), temporales y no commiteadas; el fix de cada bug debe traer sus propios tests.

**Hallazgos registrados en [BUGS.md](BUGS.md):** BUG-003 (alta: una Necesidad "Ya pagado" se vuelve a pagar al confirmar la distribución, porque un checkbox `checked disabled` sigue estando checked), BUG-004 (alta: el checklist ofrece y registra la cuota completa de una deuda aunque el saldo pendiente sea menor, e incluye deudas ya saldadas sin archivar), BUG-005 (alta: la cuota de manejo nace con frecuencia 'mensual' en minúscula y queda fuera de gastos fijos mensuales, checklist, objetivo del fondo y equivalente mensual de Deudas; solo se ve en Calendario por un fallback), BUG-006 (media: el abono extra a deudas desde el panel baja deuda y cuenta pero no crea el gasto, invisible para Análisis y Límites), BUG-007 (baja: copy que promete ver la cuota de manejo "en Deudas") y BUG-008 (baja: las validaciones aceptan Infinity vía '1e999').

**Observaciones sin registro de bug (decisión del usuario pendiente):** el monto por defecto del panel para ingresos Quincenales es el mensual estimado (el doble del cobro real); sin día de pago no hay guard de periodo y una segunda confirmación acreditaría el ingreso dos veces; el copy del panel no avisa que el ingreso se acreditará a la cuenta (riesgo de doble conteo si el usuario ya actualizó su saldo a mano); la línea "Sugerencia: $X a ahorro" aparece aunque no haya destinos de ahorro; y la regla ADN #10 ("ningún dominio importa a otro") convive con 8+ imports cruzados de `logic.js` puro (analisis importa de 5 dominios, agenda de compromisos incluso en `index.js`, presupuesto de tesorería y gastos, config de export) mientras otros sitios duplican código citando esa misma regla: conviene un ADR que legalice el patrón "import de logic.js puro, solo lectura" o un refactor, pero no ambos criterios a la vez.

Sin cambios de código ni de service worker. Suites verificadas antes y después: 1857/1857 unit, línea base intacta.

| Archivo | Cambio |
|---|---|
| `docs/BUGS.md` | 6 entradas nuevas (BUG-003 a BUG-008) con causa, archivo, función y líneas. |
| `docs/HANDOFF.md` | Entrada de la revisión en "Qué se hizo recientemente". |

---

### feat(tesoreria): Necesidades pasa a checklist accionable en Distribuir mi ingreso (MC.7d, slice 1) · 2026-07-03

Primer slice de MC.7d: implementa las decisiones R1, R4 y R5 de la revisión 2026-07-02 de [ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md). El desglose de Necesidades del panel "Distribuir mi ingreso" (un `<details>` de solo lectura desde MC.7c) pasa a ser una checklist accionable: el usuario marca los gastos fijos mensuales y las cuotas de deuda que cubre con este ingreso, y al confirmar, cada marca genera exactamente el mismo registro que su flujo individual existente, sin inventar un tipo de movimiento nuevo.

**Alcance decidido con el usuario antes de codear:** solo entran a la checklist los fijos con frecuencia Mensual y las deudas. Un fijo Quincenal, Semanal o Diario tiene más de una ocurrencia dentro del periodo del ingreso; como esta checklist modela una fila = un pago completo, incluirlo con su monto por ocurrencia habría dejado al usuario marcando como "cubierto todo el periodo" algo que en realidad solo cubre una fracción, ensuciando el badge "Ya pagaste este mes" de Agenda y registrando un gasto de menos. Modelar sus múltiples vencimientos (como ya hace `eventosDelMes` de Agenda) queda para una tarea futura. El shell de asistente paginado (avanzar/atrás entre pasos) y el recálculo del presupuesto de Ahorro sobre el remanente real tras las Necesidades marcadas (R3 del ADR) tampoco entran en este slice: quedan como tarjetas separadas en el BOARD para no mezclar tres decisiones de UI/producto distintas en un solo cambio.

En [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js), `construirDesgloseNecesidades(compromisos, gastos, hoy)` gana dos parámetros nuevos y cambia de comportamiento: antes mensualizaba cualquier frecuencia con `_FACTOR_MENSUAL` (un Mercado Quincenal de $150.000 se mostraba como $300.000/mes); ahora filtra directamente por `frecuencia === 'Mensual'` para fijos (las deudas no tienen este problema porque `cuotaMensual` ya es, por definición, la obligación completa del mes) y cada fila trae su `diaPago` y si ya está `pagado` este periodo. Dos privadas nuevas, `_prefijoMes()` y `_pagadoEstePeriodo()`, duplican el criterio de `estadoPagoMes()` de compromisos/logic.js (el mismo guard que usa el badge "Ya pagaste este mes" de Agenda: para un fijo, cualquier gasto vinculado el mes en curso cuenta como pagado; para una deuda, la suma de abonos del periodo debe alcanzar `cuotaMensual`). Es un duplicado intencional, no una importación cruzada: tesorería no puede importar de Compromisos (ADN #10). El orden de la lista pone primero los no pagados, de mayor a menor monto, y deja los ya pagados al final.

En [tesoreria/view.js](../modules/dominio/tesoreria/view.js), `_renderDesgloseNecesidades()` (el `<details>` de solo lectura) se elimina y su lugar lo toma `_filaNecesidad()`: checkbox, nombre, categoría, día de pago y monto. El monto no es editable a propósito, a diferencia de las filas de Ahorro/Deudas/Inversiones: es la cuota real de una obligación, no una asignación libre que el usuario deba calcular. Una fila ya pagada nace marcada y deshabilitada, con "Ya pagado" en vez del monto, para que no se pueda registrar el mismo pago dos veces. `_renderPanelDistribuir()` saca a Necesidades del bloque "Esto queda en tu cuenta (no se mueve)" (ya no aplica: ahora sí se mueve dinero) y la ubica como la primera sección accionable del panel, antes de Ahorro/Deudas/Inversiones, reflejando el orden de pasos del ADR. El panel completo ahora también se muestra cuando la única fuente de contenido son las Necesidades (antes exigía al menos un destino de ahorro, deuda o inversión para aparecer).

En [tesoreria/index.js](../modules/dominio/tesoreria/index.js): `_leerNecesidadesMarcadas()` lee los checkboxes de la nueva checklist (monto fijo en `data-nec-monto`, no un input) y se combina con `_leerItemsDistribucion()` dentro de `_recalcularDistribucion()`, así el resumen en vivo ("Asignado: $X. Queda disponible: $Y") ya suma ambos grupos sin distinguir su origen. `_aplicarNecesidad()` escribe el pago directo en la colección `'gastos'` (para un fijo: mismo shape que "Marcar pagado este mes" de Agenda, categoría "Gastos fijos"; para una deuda: mismo shape que un abono, categoría "Deudas", más el descuento de `saldoTotal` topado en 0). Escribir `gastos`/`cuentas` directo desde tesorería no es una violación de ADN #10: es el mismo patrón que ya usan Agenda y Compromisos, un ledger compartido que cualquier dominio edita con `guardar`/`editar` de crud.js. `_confirmarDistribucion()` aplica cada Necesidad marcada dentro de la misma confirmación única que ya aplicaba Ahorro/Deudas/Inversiones (un solo `resolverCuenta`, ninguna pregunta adicional). **Hallazgo de R4 del ADR aplicado en este slice:** `_SLICES_DISTRIBUCION` (el snapshot para "Deshacer") no incluía la colección `'gastos'`; como este cambio hace que el Paso 1 cree gastos reales, se agregó esa slice, evitando que "Deshacer" dejara pagos huérfanos sin revertir.

**Bug de timing encontrado y corregido durante la verificación E2E (no era un bug de lógica):** los primeros intentos de los tests de confirmar/deshacer fallaban con el saldo y el gasto sin persistir, aunque el código corría sin lanzar ningún error (se confirmó agregando logging temporal directo en el código fuente, luego removido). La causa real: `save()` está debounced 200ms (ADN #5, "nunca escribir a `localStorage` directo") y los tests leían `localStorage` inmediatamente después del click de confirmar, antes de que el debounce hiciera el flush real a disco. Se corrigió agregando `page.waitForTimeout(400)` antes de leer `localStorage` en ambos tests, el mismo patrón que ya usan otros E2E del proyecto que verifican persistencia entre sesiones.

Verificado con 13 tests unitarios nuevos/reescritos en `construirDesgloseNecesidades` (fijos Mensuales con su monto tal cual; exclusión de Quincenal/Semanal/Diario; estado `pagado` según gasto/abono del periodo, incluyendo el caso de abono parcial que no cuenta como pagado; orden con los pagados al final aunque su monto sea mayor) más 4 E2E en Chromium real: la checklist lista fijos mensuales y deudas con su día de pago y excluye un fijo Quincenal; una Necesidad ya pagada aparece marcada y deshabilitada con "Ya pagado"; confirmar con una Necesidad marcada registra el mismo gasto que su flujo individual y descuenta la cuenta correctamente; "Deshacer" restaura el saldo y borra el gasto creado. El preview interactivo de este entorno no cargó la app (`chrome-error://chromewebdata/`, problema ya conocido de este entorno de trabajo); la verificación se apoyó en la suite E2E con Chromium real, que sí es una verificación de navegador genuina. 1851/1851 → 1857/1857 unit; 98/98 → 101/101 E2E. Lint limpio. SW v263 → v264.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `construirDesgloseNecesidades()` gana parámetros `gastos`/`hoy`, filtra solo fijos Mensuales (ya no mensualiza), agrega `diaPago` y `pagado` por fila; nuevas privadas `_prefijoMes()`, `_pagadoEstePeriodo()`. |
| `modules/dominio/tesoreria/view.js` | `_renderDesgloseNecesidades()` eliminada; nueva `_filaNecesidad()` (checklist accionable); `_renderPanelDistribuir()` mueve Necesidades a una sección accionable propia, primero en el panel. |
| `modules/dominio/tesoreria/index.js` | Nuevas `_leerNecesidadesMarcadas()`, `_aplicarNecesidad()`; `_confirmarDistribucion()` aplica los pagos de Necesidades marcadas; `_SLICES_DISTRIBUCION` suma `'gastos'`; listener de `change` para `[data-nec-toggle]`. |
| `styles/components/forms.css` | Nuevas `.distribuir__fila--pagado`, `.distribuir__nec-monto`; clases del `<details>` retirado eliminadas. |
| `tests/unit/tesoreria.test.js` | `construirDesgloseNecesidades`: 13 tests (exclusión por frecuencia, `pagado`, `diaPago`, orden). |
| `tests/e2e/smoke.test.js` | Suite "Distribuir mi ingreso: checklist de Necesidades" reemplaza el test de solo lectura de MC.7c; 4 tests nuevos. |
| `service-worker.js` | v263 → v264. |

---

### docs(adr): revisión de ADR 018, el Paso 1 del asistente pasa a checklist accionable · 2026-07-02

Prerequisito de MC.7d, sin cambios de código. Tras validar en la app el desglose read-only de Necesidades (MC.7c), el usuario dio la dirección nueva del 2026-07-02: cada grupo del asistente "Distribuir mi ingreso" debe mostrar sus registros como **checklist seleccionable que registra pagos reales**, no como lista informativa. Eso contradice la decisión 2 de [ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md) (Paso 1 read-only, sin mover dinero), así que, siguiendo la regla del proyecto (tocar una decisión de un ADR requiere actualizarlo antes de codear), se revisó el ADR como tarea propia.

Se agregó la sección "Revisión 2026-07-02" con cinco decisiones nuevas, ancladas en el código que ya existe:

- **R1 (reemplaza la decisión 2):** la checklist de Necesidades muestra nombre, cuota del periodo actual (fijo: su `monto` por ocurrencia según su frecuencia; deuda: su `cuotaMensual`; nunca el saldo total ni el equivalente mensual normalizado) y día de pago. Los items marcados generan al confirmar exactamente los mismos registros que sus flujos individuales existentes: pago de fijo como "Marcar pagado este mes" de Agenda (gasto con `compromisoId`, categoría "Gastos fijos"), cuota de deuda como abono (baja `saldoTotal`, gasto de categoría "Deudas"). El guard "ya pagado este periodo" se comparte con el badge de Agenda (gasto del mes con `compromisoId`), lo que elimina el doble registro entre ambos flujos. Lo no marcado se comporta como hoy: queda en la cuenta y se paga al vencer.
- **R2:** una sola pregunta de cuenta al confirmar todo el asistente, con el patrón `cuenta-helper` (con una sola cuenta activa no se pregunta, regla de cuenta única). Se descartó preguntar cuenta por cada item: fricción multiplicada para el caso común.
- **R3:** los pasos se encadenan sobre el remanente real: el Paso 2 (Ahorro) sugiere sus aportes sobre el cobro menos las Necesidades marcadas, no sobre el porcentaje teórico del split; la validación total asignado ≤ monto del cobro es una sola para todo el asistente (generaliza `resumirPlanDistribucion`).
- **R4 (ajusta la decisión 6):** la confirmación única aplica también los pagos del Paso 1, con el mismo apply-plan por EventBus y snapshot de undo. Nota de implementación obligatoria: `_SLICES_DISTRIBUCION` en `tesoreria/index.js` hoy no incluye la slice `gastos`; como el Paso 1 crea gastos, hay que agregarla o el "Deshacer" dejaría pagos huérfanos.
- **R5 (confirma la decisión 7):** sin schema nuevo: los pagos son gastos normales con `compromisoId` y los abonos actualizan `saldoTotal`.

Las decisiones 2, 5 y 6 originales quedan marcadas con notas de revisión y su texto se conserva como historia. La tabla de slices refleja MC.7a/b/c entregados y amplía MC.7d (extender `construirDesgloseNecesidades` con cuota del periodo, día de pago y estado pagado; sumar `gastos` al snapshot); la nota de modelos de los slices restantes pasa a la escala Claude 5. El desglose construido en MC.7c no se tira: evoluciona a checklist en MC.7d.

En [BOARD.md](BOARD.md), la tarjeta MC.7d pasó de "requiere revisión de ADR 018 antes de codear" a "pendiente (diseño cerrado)", con el objetivo alineado a R1-R5, los archivos afectados precisados (`construirDesgloseNecesidades`, `_SLICES_DISTRIBUCION`, `_confirmarDistribucion`) y modelo de implementación `Sonnet 5 - Alto`.

Tarea solo de documentación: sin tests nuevos ni bump de service worker. Suites verificadas verdes antes del commit (1851/1851 unit).

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/018-asistente-distribuir-ingreso.md` | Sección "Revisión 2026-07-02" (R1-R5, alternativas y consecuencias de la revisión); notas en las decisiones 2, 5 y 6; estado y autores actualizados; tabla de slices y modelos al día. |
| `docs/BOARD.md` | Tarjeta MC.7d actualizada: estado, objetivo R1-R5, archivos y modelo. |
| `docs/HANDOFF.md` | Entrada nueva en "últimas 5 tareas" (sale AG.5 del listado detallado). |

---

### feat(calendario): nombre automático según la categoría en el gasto fijo (AG.4) · 2026-07-02

El form de "Nuevo gasto fijo" pedía descripción y categoría como dos campos independientes y ambos obligatorios de hecho, pero para las 13 categorías predefinidas (Mercado, Arriendo, Servicios públicos, Internet...) esa pregunta doble es redundante: si el usuario elige "Mercado" como categoría, escribir "Mercado" otra vez como nombre no aporta nada. AG.4 resuelve esto haciendo que, al elegir una categoría predefinida, el nombre del registro sea la propia categoría, y el campo de texto libere su rol original para convertirse en una nota opcional (por ejemplo, con categoría "Mercado" el usuario puede anotar "Éxito de la esquina" o "unidad 302"). Solo con la categoría "Otro" (o sin categoría elegida) el campo de texto vuelve a ser el nombre obligatorio del gasto, exactamente como funcionaba antes.

En [compromisos/logic.js](../modules/dominio/compromisos/logic.js) se agregó `_categoriaFijoConNombreAuto(datos)`, un helper privado que evalúa si el tipo es `fijo`, la categoría pertenece al catálogo `CATEGORIAS_AGENDA` y es distinta de `'Otro'`. `validarCompromiso()` usa este helper para dejar de exigir `descripcion` cuando aplica (antes el chequeo de descripción vacía era incondicional para los tres tipos de compromiso). `normalizarCompromiso()` lo usa para decidir el shape final: con nombre automático, `descripcion = categoria` y lo que el usuario escribió se guarda en un campo nuevo `nota` (cadena vacía si no escribió nada); sin nombre automático, `descripcion` es el texto del usuario y `nota` queda `''`. El campo `nota` es nuevo en el schema de compromisos tipo fijo, pero es opcional, con valor por defecto `''`, y se lee de forma defensiva (`c.nota ?? ''` en el render); siguiendo el mismo criterio que ya usó la adición de `categoria` en MC.9-Agenda, no hace falta una migración de schema para los compromisos ya guardados.

En [agenda/view.js](../modules/dominio/agenda/view.js), `renderFormGastoFijo()` reordena los campos: la categoría pasa a ir primero y el nombre/nota después, para que la relación causa-efecto sea clara en la interfaz (elegís la categoría, el campo de abajo reacciona). El label del campo de nombre ahora tiene un id propio (`gfijo-descripcion-label`) para que JS pueda alternar su texto. En `_renderDetalleItem()`, el subtítulo deja de repetir la categoría cuando coincide exactamente con el nombre del registro (el caso de nombre automático, donde mostrarla de nuevo sería ruido: el título ya dice "Mercado"), pero la sigue mostrando cuando difieren (categoría "Otro" con un nombre propio, por ejemplo "Suscripción Xbox" con categoría "Otro"); además, cuando el registro tiene una nota, se agrega al final del subtítulo.

En [agenda/index.js](../modules/dominio/agenda/index.js) se agregó `_syncCategoriaGastoFijo(form)`, calcada del patrón que ya usó `_syncCategoriaMeta` en MT.3 para Metas: alterna el label ("Descripción" ↔ "Nota (opcional)"), el placeholder y el atributo `required`/`aria-required` del campo de texto según la categoría elegida en el `<select>`, enganchada al evento `change` del selector. Se llama también al (re)inyectar el formulario, tanto al crear un gasto nuevo (estado por defecto: sin categoría, campo requerido) como al editar uno existente. El prefill de edición ahora distingue: si el compromiso tiene nombre automático (categoría predefinida), el campo de texto se rellena con `compromiso.nota`, no con `compromiso.descripcion` (que sería igual a la categoría y no aportaría nada al reabrir el form).

Verificado con 10 tests unitarios nuevos (`validarCompromiso` y `normalizarCompromiso` con categoría predefinida, con "Otro" y sin categoría; el nuevo orden de campos del formulario y su estado por defecto; la supresión de la categoría duplicada en el subtítulo y el render de la nota) más 4 E2E en Chromium real: el label y el `required` cambian al elegir una categoría predefinida y vuelven al elegir "Otro"; guardar con una categoría predefinida y sin texto usa la categoría como nombre del registro; guardar con una categoría predefinida y una nota la muestra en el subtítulo del detalle del día. 1838/1838 → 1851/1851 unit; 94/94 → 98/98 E2E. Lint limpio. SW v262 → v263.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic.js` | Nueva `_categoriaFijoConNombreAuto()`; `validarCompromiso()` deja de exigir descripción con nombre automático; `normalizarCompromiso()` deriva `descripcion`/`nota` para tipo fijo según la categoría. |
| `modules/dominio/agenda/view.js` | `renderFormGastoFijo()` reordena categoría antes del nombre y agrega `#gfijo-descripcion-label`; `_renderDetalleItem()` suprime la categoría duplicada en el subtítulo y muestra la nota cuando existe. |
| `modules/dominio/agenda/index.js` | Nueva `_syncCategoriaGastoFijo(form)` (mismo patrón que `_syncCategoriaMeta` de MT.3); el prefill de edición usa `nota` en vez de `descripcion` cuando el nombre es automático. |
| `tests/unit/compromisos.test.js` | 6 tests nuevos: `validarCompromiso`/`normalizarCompromiso` con categoría predefinida, "Otro" y sin categoría. |
| `tests/unit/agenda.test.js` | 4 tests nuevos: orden de campos y estado por defecto del formulario, supresión de la categoría duplicada, render de la nota en el subtítulo. |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - nombre automático según la categoría", 4 tests. |
| `service-worker.js` | v262 → v263. |

---

### feat(calendario): emoji de categoría como ícono principal (AG.2) · 2026-07-02

En el detalle del día, un gasto fijo con categoría (Mercado, Internet, Arriendo, Servicios públicos...) mostraba el emoji de su categoría (`CATEGORIA_AGENDA_EMOJI`) únicamente dentro del subtítulo pequeño (` · 🌐 Internet`), mientras el ícono principal a la izquierda del registro seguía siendo el genérico por tipo, el mismo círculo para todos los gastos fijos sin distinción. Gastos ya había resuelto exactamente este problema (`CATEGORIA_EMOJI[catKey] ?? icon('gastos')` como ícono principal, con el emoji retirado del subtítulo para no repetirse): AG.2 porta ese mismo patrón a Agenda.

En [agenda/view.js](../modules/dominio/agenda/view.js), `_renderDetalleItem()` calcula `emojiCategoria` (el emoji de la categoría cuando `tipo === 'fijo'` y el registro tiene `categoria`) y lo usa como ícono principal con `emojiCategoria ?? icon(ICONO_TIPO[tipo] ?? 'recurring')`: con emoji disponible, se muestra ese carácter directamente; sin categoría, o en deudas (`categoria` es un campo exclusivo de gastos fijos), cae al ícono SVG genérico de siempre, sin cambio de comportamiento. El subtítulo deja de repetir el emoji: pasa de ` · 🌐 Internet` a ` · Internet`, ya que el emoji ahora vive en el ícono principal y repetirlo sería ruido visual, igual que ya evita Gastos en `list-item__subtitle`.

En [config.css](../styles/components/config.css) se agregó `.cal-detail__icon--emoji`, aplicada solo cuando el ícono muestra un emoji de categoría, con un `font-size` de 1.375rem (más grande que el 1rem base del ícono con SVG) para que el emoji se lea con presencia como protagonista del registro, mismo criterio de tamaño que ya usa `.list-item__icon--cat` de Gastos (1.5rem, "emoji grande, protagonista", documentado en `atoms.css`).

**Corrección de un descuido de la tarea anterior (AG.7):** el commit de AG.7 documentaba el bump de `service-worker.js` de v261 a v262 tanto en el mensaje de commit como en HANDOFF y este mismo CHANGELOG, pero el archivo nunca se tocó: `CACHE_NAME` seguía en `finko-v261` después de ese push. Eso significa que los cambios de AG.7 (franja de color por tipo en el detalle del día) se desplegaron a producción sin invalidar el caché del service worker, así que los usuarios con una instalación PWA activa podían seguir viendo la versión sin la franja de color hasta que algún otro cambio bumpeara la caché. Este commit hace el bump real a v262, cubriendo retroactivamente AG.7 junto con AG.2.

Verificado con 5 tests unitarios (2 reescritos de una tarea anterior que asumían el emoji pegado al texto del subtítulo, un markup que este cambio reemplaza; 3 nuevos para el fallback sin categoría, el emoji sin `<svg>` con categoría, y que las deudas conservan el ícono genérico) más 2 E2E en Chromium real (con categoría, el ícono no contiene ningún `<svg>` y sí el carácter emoji; sin categoría, el ícono sí contiene un `<svg>`). 1835/1835 → 1838/1838 unit; 92/92 → 94/94 E2E. Lint limpio. SW v261 → v262 (bump real, corrige también el vacío dejado por AG.7).

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/view.js` | `_renderDetalleItem()`: el emoji de categoría pasa a ser el ícono principal (`emojiCategoria ?? icon(...)`); el subtítulo ya no repite el emoji, solo el nombre de la categoría. |
| `styles/components/config.css` | Nueva `.cal-detail__icon--emoji` (tamaño mayor para el emoji protagonista, mismo criterio que Gastos). |
| `tests/unit/agenda.test.js` | 2 tests reescritos (emoji ahora en el ícono principal, no en el subtítulo) + 3 tests nuevos (fallback sin categoría, sin `<svg>` con categoría, deuda con ícono genérico). |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - emoji de categoría como ícono principal", 2 tests. |
| `service-worker.js` | v261 → v262 (bump real; corrige el vacío dejado por el commit de AG.7). |

---

### feat(calendario): identificación visual por color en los registros del día (AG.7) · 2026-07-02

En fechas cargadas (una quincena, el fin de mes) el detalle del día en Calendario mostraba todos los registros con el mismo aspecto visual: la única forma de distinguir un gasto fijo de una deuda con entidad o una deuda personal era leer su etiqueta de texto. AG.7 suma una identificación de color a cada item de la lista, reusando la misma paleta que AG.6 ya había fijado para los dots del mini calendario, así el significado de cada color es el mismo en toda la tarjeta.

En [agenda/view.js](../modules/dominio/agenda/view.js), `_renderDetalleItem()` agrega la clase `cal-detail__item--${tipo}` al `<li>` de cada registro (el ícono ya tenía su propia clase `cal-detail__icon--${tipo}`, heredada de una tarea anterior, pero sin ningún CSS de color asociado hasta ahora). En [config.css](../styles/components/config.css), `.cal-detail__item` gana una franja lateral (`border-left: 3px solid`) que cada tipo colorea con su `--fk-dom-*` correspondiente: `--fk-dom-presupuesto` (amarillo) para fijo, `--fk-dom-compromisos` (rojo) para deuda entidad, `--fk-dom-personales` (rosa) para deuda personal. El padding izquierdo del item se recalcula con `calc(var(--fk-space-N) - 3px)` para que la franja no desplace el contenido ni el ícono; el ajuste se repite en el media query mobile porque ahí el padding base es más chico (`--fk-space-2` en vez de `--fk-space-3`). El ícono circular de cada registro también toma el color de su tipo (texto + un fondo tenue con `color-mix(in srgb, var(--fk-dom-*) 14%, var(--fk-bg-surface))`), mismo criterio de intensidad que ya usan los `dom-badge--*` de `nudges.css` para no saturar la tarjeta.

No hubo que decidir nuevos colores: como el calendario solo mapea `S.compromisos` (los mismos 3 tipos que ya cubría la leyenda de AG.6), la paleta ya estaba resuelta y consistente con el resto de la app. Cuando el ADR de recordatorios de aporte (AP.4/MT.2/AH.4) sume tipos nuevos al calendario, sumarán aquí su propia clase `cal-detail__item--<tipo>` con el mismo patrón.

Verificado con 4 tests unitarios nuevos (`cal-detail__item--fijo` en un gasto fijo, `--deuda-entidad` en una deuda con entidad, `--deuda-personal` en una deuda personal, y los tres tipos combinados el mismo día cada uno con su propia clase) más 1 E2E en Chromium real que siembra un fijo y una deuda entidad el mismo día y compara el `border-left-color` computado de ambos: deben ser colores distintos entre sí y ninguno debe quedar transparente (regresión que ocurriría si un tipo no matcheara ninguna clase CSS). 1831/1831 → 1835/1835 unit; 91/91 → 92/92 E2E. Lint limpio. SW v261 → v262.

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/view.js` | `_renderDetalleItem()` agrega `cal-detail__item--${tipo}` al `<li>` del detalle. |
| `styles/components/config.css` | `.cal-detail__item--fijo/deuda-entidad/deuda-personal` (franja lateral + padding compensado, también en el media query mobile); `.cal-detail__icon--*` con color de texto y fondo tenue por tipo. |
| `tests/unit/agenda.test.js` | 4 tests nuevos: clase por tipo (fijo, deuda entidad, deuda personal) y los 3 tipos combinados el mismo día. |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - marca de color por tipo", 1 test que compara colores computados en Chromium real. |
| `service-worker.js` | v261 → v262. |

---

### feat(calendario): leyenda completa, con colores consistentes y siempre visible (AG.6) · 2026-07-02

La leyenda del calendario (qué significa cada dot de color en los días) se renderizaba al final del panel, después del detalle del día. Con un día cargado de registros (una quincena, un fin de mes), el detalle empujaba la leyenda fuera de la pantalla justo cuando más ayudaba tenerla a mano: había que desplazarse hasta el fondo para consultarla.

AG.6 la reubica y la fija. En [agenda/view.js](../modules/dominio/agenda/view.js) la leyenda pasa a renderizarse entre el calendario y el detalle del día (justo debajo del calendario, como pedía la tarjeta), y `.cal-legend` en [config.css](../styles/components/config.css) es ahora `position: sticky` con un pequeño offset superior y fondo, borde y radio propios: al quedar pegada durante el scroll, el contenido del detalle pasa por debajo y no debe transparentarse. El obstáculo real estaba en el shell: `.main-content` tenía `overflow-x: hidden`, y un ancestro con overflow distinto de `visible` se convierte en scroll container, lo que anula el `position: sticky` de todos sus descendientes (el sticky pasa a calcularse contra un contenedor que nunca scrollea, no contra la ventana). Se cambió a `overflow-x: clip` en [layout.css](../styles/layout.css): recorta el desborde horizontal exactamente igual, pero sin crear scroll container. El comentario en el CSS deja el porqué para que nadie lo regrese a `hidden` por accidente.

Sobre la parte de colores de la tarjeta: el calendario hoy solo mapea `S.compromisos` (`eventosDelMes`), así que los 3 tipos que la leyenda ya listaba (gasto fijo, deuda entidad, deuda personal) cubren todos los eventos posibles, cada uno con su color único y consistente con el resto de la app: `--fk-dom-presupuesto` (amarillo), `--fk-dom-compromisos` (rojo) y `--fk-dom-personales` (rosa). No hubo que tocar colores. Los tipos futuros (metas, apartados, aportes al fondo) entrarán a la leyenda cuando el ADR de recordatorios de aporte (AP.4 + MT.2 + AH.4) los sume al calendario; el doc de `_renderLeyenda` deja la guía (una entrada nueva con su `cal-dot--<tipo>`). AG.7 (marca de color por registro en el detalle del día) reusa esta misma paleta.

Verificado con 2 tests unitarios nuevos (la leyenda trae los dots de los 3 tipos; con un día abierto la leyenda queda antes del detalle en el DOM) y 1 E2E en Chromium real que siembra 10 compromisos el mismo día, abre el detalle, scrollea al fondo del documento (con guard de `scrollY > 0` para que el test no pase trivialmente si el contenido no desborda) y verifica que la leyenda sigue completa dentro del viewport. El preview del entorno sigue sin cargar (servidor levantado pero sin respuesta); la verificación visual queda cubierta por el E2E. 1829/1829 → 1831/1831 unit; 90/90 → 91/91 E2E. Lint limpio. SW v260 → v261.

**Podría afectar / validación pendiente:** el cambio de `overflow-x` en `.main-content` es global (todas las secciones). `clip` recorta igual que `hidden`, así que no debería notarse; validar en el celular que la leyenda queda pegada arriba al recorrer un día cargado y que ninguna sección muestra scroll horizontal nuevo.

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/view.js` | La leyenda se renderiza entre el calendario y el detalle del día; doc de `_renderLeyenda` con la guía para tipos futuros. |
| `styles/components/config.css` | `.cal-legend` sticky (top), con fondo, borde y radio propios. |
| `styles/layout.css` | `.main-content` pasa de `overflow-x: hidden` a `clip`: hidden creaba un scroll container que anulaba el sticky. |
| `tests/unit/agenda.test.js` | 2 tests nuevos: dots de los 3 tipos en la leyenda, orden leyenda → detalle. |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - leyenda sticky", 1 test con scroll real. |
| `service-worker.js` | v260 → v261. |

---

### feat(calendario): total a pagar por día (AG.5) · 2026-07-02

El panel de detalle de un día en Calendario listaba cada compromiso por separado (nombre, frecuencia, monto individual) pero nunca los sumaba: para saber cuánto dinero necesitaba tener disponible ese día, el usuario tenía que sumar a mano cada monto de la lista. La sumatoria ya existía como código, pero solo como función privada `_totalDia` dentro de [agenda/view.js](../modules/dominio/agenda/view.js), sin exportar y sin un solo test, y su resultado se mostraba pegado al subtítulo pequeño y gris ("3 compromisos · $450.000"), fácil de pasar por alto.

AG.5 extrae esa suma a `totalDia(evs)`, función pura y exportada en [agenda/logic.js](../modules/dominio/agenda/logic.js): mismo criterio que ya usa el render de cada item individual (`monto` para gastos fijos, `cuotaMensual` para deudas, nunca `saldoTotal`) y que `sumarMontos` de `compromisos/logic.js` (IN.1). Es una duplicación intencional, no una importación cruzada: Agenda no puede importar de Compromisos porque el ADN #10 prohíbe que un dominio importe a otro (aunque `agenda/view.js` ya importa varias funciones de `compromisos/logic.js` para el render de cada item, un acoplamiento existente que este cambio no extiende ni corrige, fuera del alcance de esta tarea). `_renderDetalleDia()` ahora muestra una línea propia, con más peso visual, justo bajo el título del panel: "Total a pagar: **$X**" (`.cal-detail__total`), visible de inmediato sin tener que desplazarse por la lista de items, en vez del monto perdido dentro del subtítulo. Color neutro (`--fk-text-primary`), no rojo: un compromiso programado para ese día no es un incumplimiento, mismo criterio de AUD.4/ADR 019 que ya gobierna el resto de la app. La línea solo aparece cuando la suma es mayor a 0 (compromisos sin monto capturado, como una deuda a la que aún no se le puso cuota, no generan una línea "Total a pagar: $0" vacía de sentido).

Verificado con 9 tests unitarios nuevos (`totalDia` con fijos, deudas, mezcla de ambos, montos no numéricos y entradas nulas; render real del panel con uno y con varios compromisos, con y sin monto, y sin día seleccionado) más 1 E2E en Chromium real (un gasto fijo de $900.000 y una deuda con cuota de $150.000 el mismo día 20, el panel muestra "Total a pagar: $1.050.000"). 1819/1819 → 1829/1829 unit; 89/89 → 90/90 E2E. Lint limpio. SW v259 → v260.

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/logic.js` | Nueva `totalDia(evs)`, función pura y exportada (antes privada en `view.js`, sin tests). |
| `modules/dominio/agenda/view.js` | Eliminada `_totalDia`; `_renderDetalleDia` usa `totalDia` de `logic.js` y muestra una línea propia "Total a pagar" en vez de anexarlo al subtítulo. |
| `styles/components/config.css` | Nueva `.cal-detail__total` (color neutro, monto en negrita). |
| `tests/unit/agenda.test.js` | 9 tests nuevos: `totalDia` (5) + render del total en el panel de detalle (4). |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - total a pagar por día", 1 test. |
| `service-worker.js` | v259 → v260. |

---

### feat(metas): ahorro sugerido según la frecuencia de ingreso, no "por día" (MT.4) · 2026-07-02

La lista de Metas siempre mostraba "$X/día" como ritmo sugerido de ahorro, sin importar cómo cobra el usuario en la realidad. Para alguien que recibe su sueldo cada quincena, pensar en "cuánto por día" no ayuda a planear: el gesto natural es "cuánto aparto en cada quincena". MT.4 reemplaza ese cálculo fijo por uno que reparte el faltante entre los periodos de la frecuencia real de ingreso del usuario, mismo espíritu que ya resolvió Apartados (AP.1) para sus propios aportes sugeridos.

Nueva `calcularAhorroPorPeriodo(meta, frecuenciaIngresos)` en [metas/logic.js](../modules/dominio/metas/logic.js) reemplaza a `calcularAhorroDiario` (eliminada): calcula cuántos periodos completos quedan hasta la fecha límite según la frecuencia (Diario = 1 día, Semanal = 7, Quincenal = 15, Mensual = 30; las frecuencias más largas como Trimestral o Anual se asimilan a Mensual, la unidad de planificación más cercana) y reparte el faltante entre esos periodos, redondeando hacia arriba (mejor pasarse un poco que llegar corto, mismo criterio que Apartados). La frecuencia no es un campo por meta (a diferencia de Apartados, que sí tiene `frecuenciaAporte` seleccionable por ítem): se deriva una sola vez de los ingresos activos del usuario con `frecuenciaPrincipalIngresos(S.ingresos)`, la frecuencia más común entre ellos.

Esta función es una copia intencional de la homónima de `apartados/logic.js`: Metas no puede importar de Apartados porque ambos son dominios y el ADN #10 prohíbe que un dominio importe a otro. La duplicación de esta idea (mapeo de frecuencia + conteo de la más común) ya es el patrón establecido en el código: tesorería tiene su propio `_FACTOR_MENSUAL`, independiente del `DIAS_POR_PERIODO` de Apartados. `renderListaMetas()` en [metas/view.js](../modules/dominio/metas/view.js) calcula la frecuencia una sola vez para toda la lista (es la misma para todas las metas, no cambia por ítem) y la pasa a `_renderMetaItem`, que ahora muestra "$X por quincena", "$X por semana", "$X al mes" o "$X por día" según corresponda, con exactamente la misma redacción que ya usa Apartados en `etiquetaPeriodo` (consistencia de vocabulario entre secciones, mismo espíritu que el guardarraíl de emojis de TX.4/ADR 014, aunque aquí no hay un test automático que lo fuerce).

Los tests con fechas relativas (`new Date(); setDate(...)`) usaban antes `toISOString().slice(0,10)`, que puede desplazar un día en zonas horarias UTC negativas como Colombia según la hora exacta en que corre el test (el mismo problema que ya resolvió `hoyLocal()` en los E2E). Se agregó un helper local `isoEnDias(dias)` en `metas.test.js` que construye la fecha con los getters locales de `Date`, evitando el off-by-one; dos aserciones de conteo exacto de periodos fallaban intermitentemente antes de este ajuste y quedaron estables después. Verificado con 22 tests unitarios nuevos (`frecuenciaPrincipalIngresos`, `etiquetaPeriodoAhorro`, `calcularAhorroPorPeriodo`, y el render real de `renderListaMetas` con distintas frecuencias) más 1 E2E en Chromium real (ingreso Quincenal sembrado, meta con fecha límite a 90 días muestra "por quincena" y nunca "/día"). 1804/1804 → 1819/1819 unit; 88/88 → 89/89 E2E. Lint limpio. SW v258 → v259.

| Archivo | Cambio |
|---|---|
| `modules/dominio/metas/logic.js` | Nuevas `frecuenciaPrincipalIngresos()`, `etiquetaPeriodoAhorro()`, `calcularAhorroPorPeriodo()`; eliminada `calcularAhorroDiario()`. |
| `modules/dominio/metas/view.js` | `renderListaMetas()` calcula la frecuencia de ingreso una sola vez; `_renderMetaItem` recibe la frecuencia y muestra el monto por periodo con su etiqueta. |
| `tests/unit/metas.test.js` | 22 tests nuevos; helper `isoEnDias()` para fechas relativas sin drift de zona horaria. |
| `tests/e2e/smoke.test.js` | Suite nueva "Metas - ritmo de ahorro según frecuencia (MT.4)", 1 test. |
| `service-worker.js` | v258 → v259. |

---

### feat(metas): unificar el flujo de abono con el selector de cuentas compartido (MT.5) · 2026-07-02

El abono a una meta tenía su propia implementación de selector de cuenta, separada del resto de la app: un `<select>` de texto plano, obligatorio elegir cuando había 2 o más cuentas, y una lógica de descuento que solo restaba de una cuenta sin repartir ni confirmar sobregiros. Apartados ya había resuelto exactamente este problema en AP.1 con dos piezas de [infra/cuenta-helper.js](../modules/infra/cuenta-helper.js): `renderSelectorCuenta` (tarjetas seleccionables con avatar de banco, nombre y saldo, preselecciona la de mayor saldo) y `resolverPagoConPreferida` (usa la cuenta elegida si cubre el monto; si no alcanza y hay más cuentas, abre un picker de reparto que no deja ninguna en negativo; con una sola cuenta que no alcanza, pide confirmar el sobregiro). MT.5 es el port directo de ese patrón a Metas.

En [metas/view.js](../modules/dominio/metas/view.js), `renderFormAbonoMeta()` cambia `_renderCuentaSelectorAbono` (función eliminada, 24 líneas de lógica 0/1/varias cuentas duplicada) por una llamada a `renderSelectorCuenta`. En [metas/index.js](../modules/dominio/metas/index.js), `_guardarAbonoMeta()` pasa a ser async y sigue el mismo esqueleto que `_guardarAporte` de Apartados: valida el monto, resuelve los splits con `resolverPagoConPreferida` (si hay cuentas activas), confirma el sobregiro cuando la única cuenta no alcanza (mismo texto y `peligroso: true` que Apartados, adaptado a "abono"), aplica el descuento a cada cuenta del reparto, y llama a `updSaldo()` tras guardar, algo que la implementación anterior nunca hacía (el hero de Inicio quedaba con el saldo viejo hasta el siguiente `renderAll()` completo). El chequeo manual "debes elegir cuenta si hay varias" desaparece: como el selector de tarjetas siempre trae una preselección, ya no hace falta forzar la elección a mano.

Los tests de `renderFormAbonoMeta` que verificaban el `<select>` viejo se reescribieron contra el markup de tarjetas, calcados de los que ya existían para `renderFormAporteApartado` en `apartados.test.js` (mismo patrón: sin cuentas no hay selector, una cuenta trae una tarjeta preseleccionada, varias cuentas preseleccionan la de mayor saldo, ya no queda el `<select>` viejo). Se sumaron 2 E2E en Chromium real que ejercitan el flujo completo con una cuenta real: uno de abono normal que descuenta el saldo correcto (verificado en Tesorería, mismo patrón que la suite Gastos-Cuenta), y uno de abono que no alcanza, que confirma el diálogo de sobregiro y deja el saldo en negativo tras aceptar. 1804/1804 unit; 86/86 → 88/88 E2E. Lint limpio. SW v257 → v258.

| Archivo | Cambio |
|---|---|
| `modules/dominio/metas/view.js` | `renderFormAbonoMeta()` usa `renderSelectorCuenta` de `cuenta-helper.js`; eliminada `_renderCuentaSelectorAbono`. |
| `modules/dominio/metas/index.js` | `_guardarAbonoMeta()` async: `resolverPagoConPreferida`, confirmación de sobregiro con una sola cuenta, reparto aplicado a cada split, `updSaldo()` tras guardar. |
| `tests/unit/metas.test.js` | Describe "selector de cuenta" reescrito contra el nuevo markup, mismo patrón que `apartados.test.js`. |
| `tests/e2e/smoke.test.js` | Suite nueva "Metas - abono con selector de cuenta compartido (MT.5)", 2 tests. |
| `service-worker.js` | v257 → v258. |

---

### feat(metas): simplificar la selección de emoji (MT.3) · 2026-07-02

MT.1 agregó categorías con emoji a Metas, pero dejó el campo "Emoji (opcional)" suelto: visible siempre, sin relación con la categoría elegida. Un usuario podía escribir un emoji, cambiar de categoría, y el emoji manual seguía ganando (por la prioridad de `normalizarMeta`) sin que la UI diera ninguna pista de por qué. MT.3 simplifica: el campo vive oculto por defecto (`#form-group-meta-icono` en [metas/view.js](../modules/dominio/metas/view.js)) y solo aparece cuando la categoría elegida es "Otra", la válvula de escape del catálogo (ADR 014, principio 7); el resto de las categorías ya trae su propio emoji, así que no hay nada que decidir.

La pieza no trivial es evitar un emoji manual "fantasma": `_syncCategoriaMeta(form)`, nueva en [metas/index.js](../modules/dominio/metas/index.js) y enganchada al `change` del selector de categoría, alterna el `hidden` del campo y **limpia su valor al ocultarlo**. Sin esto, un usuario que prueba "Otra", escribe un emoji, y luego elige "Vivienda" antes de guardar, terminaría con el emoji viejo en la meta: `FormData` sigue enviando campos ocultos, y `normalizarMeta` prioriza el emoji explícito sobre el de la categoría (decisión de MT.1, sigue siendo correcta como contrato de la función). También se llama tras `resetModal()` en `_nuevaMeta()`, porque `resetModal` limpia valores de input pero no el atributo `hidden` que dejó una apertura anterior del modal.

La segunda mitad de la tarjeta ("eliminar el emoji emocional de la parte inferior del form/card de meta") ya estaba resuelta: el changelog de junio 2026 registra que ese emoji se movió al título de la card en el rediseño de la lista (anillo de progreso + emoji junto al nombre), no queda ningún emoji suelto en la parte inferior del form ni de la card hoy.

Verificado con 5 tests E2E en Chromium real (el preview del entorno sigue sin cargar, nota ya conocida): el campo nace oculto, se muestra solo con "Otra", el emoji manual se guarda con "Otra", y el caso crítico, cambiar de "Otra" a otra categoría antes de guardar usa el emoji de la categoría nueva y no el manual. Se reescribió un E2E de MT.1 que ya no aplicaba (asumía el campo siempre visible). Sin tests unitarios nuevos: el comportamiento de mostrar/ocultar y limpiar el campo vive en `index.js` (DOM + eventos), fuera del alcance de happy-dom por convención del proyecto (igual que los demás toggles condicionales de formulario); se ajustó el test existente de `renderFormMeta` para reflejar el nuevo markup. 1803/1803 unit; 84/84 → 86/86 E2E. Lint limpio. SW v256 → v257.

| Archivo | Cambio |
|---|---|
| `modules/dominio/metas/view.js` | El form-group del emoji nace `hidden`; label cambiado a "Elige un emoji para tu meta". |
| `modules/dominio/metas/index.js` | Nueva `_syncCategoriaMeta(form)`: alterna `hidden` según la categoría y limpia el emoji al ocultarlo; enganchada al `change` del selector y llamada tras `resetModal` en `_nuevaMeta`. |
| `modules/dominio/metas/logic.js` | Comentario de `normalizarMeta` actualizado para reflejar la nueva UI (la función en sí no cambió). |
| `tests/unit/metas.test.js` | Test de `renderFormMeta` actualizado: el form-group del emoji nace `hidden`. |
| `tests/e2e/smoke.test.js` | 3 tests nuevos (visibilidad condicional, guardado con "Otra", limpieza al cambiar de categoría); 1 test de MT.1 reescrito. |
| `service-worker.js` | v256 → v257. |

---

### feat(metas): categorías con emoji (MT.1) · 2026-07-02

Metas de ahorro tenía nombre libre y un campo de emoji suelto (sin catálogo). Nuevo `CATEGORIAS_META` + `CATEGORIA_META_EMOJI` en [core/constants.js](../modules/core/constants.js), mismo patrón que los catálogos ya existentes (`CATEGORIA_EMOJI` de Gastos, `CATEGORIA_AGENDA_EMOJI`, `CATEGORIA_DEUDA_EMOJI`): 12 categorías con foco en objetivos de alto costo, priorizadas por el usuario el 2026-07-02 (Viajes, Cumpleaños, Boda, Vivienda, Vehículo, Computador, Celular, Educación, Hijo(s), Vacaciones, Emprendimiento, Otra).

Selector "Categoría (opcional)" nuevo en `renderFormMeta()` ([metas/view.js](../modules/dominio/metas/view.js)), con las opciones ya mostrando su emoji. `normalizarMeta()` ([metas/logic.js](../modules/dominio/metas/logic.js)) resuelve el emoji final con esta prioridad: emoji escrito a mano en el campo "Emoji (opcional)" (que se conserva, no se elimina en esta tarea) > emoji de la categoría elegida > 🎯 por defecto. Así una meta sin categoría se comporta exactamente igual que antes, y elegir una categoría predefinida trae su emoji sin que el usuario tenga que escribirlo. El emoji resuelto queda guardado en `meta.icono` como siempre; `_renderMetaItem` no cambió porque ya leía ese campo. Campo `categoria` nuevo y opcional en el shape de `Meta`, lectura defensiva, sin migración de schema.

Reconciliación de emoji contra el guardarraíl de consistencia entre catálogos (ADR 014, TX.4, "mismo concepto ⇒ misma etiqueta y mismo emoji en todas las secciones"): la lista original de la tarjeta pedía 🎓 para "Educación" y 🏖️ para "Vacaciones", pero esas etiquetas ya existían con otro emoji en otros catálogos (Educación 📚 en Gastos/Agenda; Vacaciones ✈️ en Apartados). Se usaron los emojis ya establecidos en vez de introducir un desajuste, y el catálogo de Metas se sumó a la lista de fuentes del test de guardarraíl `TX.4` (antes cubría Gastos, Agenda, Ingresos, Deudas y Apartados) para que una edición futura de cualquiera de estos catálogos no vuelva a divergir sin que un test lo marque.

El preview del entorno sigue sin cargar la app (nota ya conocida en la memoria del proyecto); verificado con 22 tests unitarios nuevos (forma del catálogo, prioridad del emoji en `normalizarMeta`, contenido del selector, emoji real en `renderListaMetas`) más 2 tests E2E nuevos en Chromium real: crear una meta con categoría "Boda" muestra 💍 en la lista, y un emoji escrito a mano gana sobre el de la categoría. 1787/1787 → 1803/1803 unit; 82/82 → 84/84 E2E. Lint limpio. SW v255 → v256.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `CATEGORIAS_META` (12 categorías) + `CATEGORIA_META_EMOJI`, con la reconciliación de Educación y Vacaciones documentada en el comentario. |
| `modules/dominio/metas/logic.js` | `normalizarMeta()`: nuevo campo `categoria`; `icono` se resuelve con prioridad manual > categoría > default. |
| `modules/dominio/metas/view.js` | `renderFormMeta()` agrega el selector `#meta-categoria`; nuevo helper `_renderOpcionesCategoria()`. |
| `tests/unit/constants.test.js` | Describe nuevo con 4 tests de forma del catálogo; `CATEGORIA_META_EMOJI` sumado a las fuentes del guardarraíl TX.4. |
| `tests/unit/metas.test.js` | 15 tests nuevos: `normalizarMeta` con categoría (6), selector en `renderFormMeta` (4), emoji real en `renderListaMetas` (2), más los describe wrappers. |
| `tests/e2e/smoke.test.js` | Suite nueva "Metas - categorías con emoji (MT.1)" con 2 tests. |
| `service-worker.js` | v255 → v256. |

---

### feat(inicio): ojo para ocultar/mostrar el dinero disponible (IN.2) · 2026-07-02

Icono de ojo junto al saldo del hero de Inicio ("Tu dinero disponible hoy"), estilo app bancaria, para usar Finko en lugares públicos: alterna entre el monto visible y la máscara `$••••••` (largo fijo, para no revelar la magnitud del monto real). La preferencia persiste entre sesiones en `S.config.ocultarSaldo` con lectura defensiva (`=== true`; cualquier otro valor muestra el monto), sin migración de schema, como pedía la tarjeta.

Detalles de implementación: `updSaldo()` ([infra/render.js](../modules/infra/render.js)) es el único punto que escribe `#saldo-total`, así que la máscara vive ahí; exporta la constante `SALDO_MASCARA` y sincroniza el botón `#saldo-ojo` (icono ojo/ojo tachado vía swap del `href` del `<use>`, `aria-pressed`, oculto sin cuentas junto con el valor). Mientras el saldo está oculto el monto real nunca toca el DOM, y la nueva `stopCount(el)` ([infra/animate.js](../modules/infra/animate.js)) cancela un countUp en vuelo que de otro modo sobreescribiría la máscara frames después. La acción `saldo-visibilidad` se registra como built-in del shell en [ui/actions.js](../modules/ui/actions.js) (flip defensivo `!== true` + `save()` + `updSaldo()`). CSS en [styles/components/domain.css](../styles/components/domain.css) (capa `components`, para que el refuerzo `.hero-saldo__ojo[hidden]` gane a `display:inline-flex` de `.btn`); el botón reusa `btn btn-ghost btn-icon`. Sprite: símbolos `i-eye` / `i-eye-off` (geometría estilo Lucide, coherente con el resto).

Alcance decidido (la tarjeta lo dejaba abierto): solo el hero, el dato más sensible y el subset más pequeño con sentido; extender la máscara a los demás montos de Inicio (totales de vencidos/prioridades, resumen semanal) quedó como observación en [BOARD.md](BOARD.md). Verificación: el preview del entorno sigue sin cargar (nota en memoria del proyecto), así que la evidencia es 13 tests unit nuevos en `tests/unit/render.test.js` (máscara, defensiva, sync del botón, empty state, acción vía `dispatch`) + 1 E2E nuevo en Chromium real (click → máscara, recarga → persiste, click → monto de vuelta). 1774/1774 → 1787/1787 unit; 81/81 → 82/82 E2E. Lint limpio. SW v254 → v255.

| Archivo | Cambio |
|---|---|
| `index.html` | Símbolos `i-eye`/`i-eye-off` en el sprite; fila `.hero-saldo` con el botón `#saldo-ojo` (`data-action="saldo-visibilidad"`, `aria-pressed`). |
| `modules/infra/render.js` | `SALDO_MASCARA` exportada; `updSaldo()` enmascara cuando `S.config.ocultarSaldo === true` y sincroniza el botón del ojo. |
| `modules/infra/animate.js` | Nueva `stopCount(el)`: cancela el RAF del countUp activo de un elemento. |
| `modules/ui/actions.js` | Acción built-in `saldo-visibilidad`: flip defensivo + `save()` + `updSaldo()`. |
| `styles/components/domain.css` | Sección HERO-SALDO: fila monto + ojo, refuerzo `[hidden]`, icono a 1.375rem. |
| `tests/unit/render.test.js` | Nuevo archivo: 13 tests de `updSaldo` + acción `saldo-visibilidad`. |
| `tests/e2e/smoke.test.js` | Suite nueva "Ocultar/mostrar el dinero disponible (IN.2)" con seed condicional (el reload no pisa la preferencia guardada). |
| `service-worker.js` | v254 → v255. |

---

### feat(inicio): totales al pie de "Próximas prioridades" y "Pendientes del mes" (IN.1) · 2026-07-02

Los dos paneles del dashboard ([compromisos/views/dashboard.js](../modules/dominio/compromisos/views/dashboard.js)) listaban items sin sumatoria: el usuario tenía que sumar a mano cuánto necesitaba para cubrir lo vencido o lo que viene en los próximos 7 días. Nueva función pura `sumarMontos(items)` en [compromisos/logic.js](../modules/dominio/compromisos/logic.js) (mismo criterio `monto ?? cuotaMensual` que ya usa el render de cada item individual, AUD.1), consumida por `renderPanelVencidos` ("Total de gastos vencidos") y `renderPanelPrioridades` ("Total de próximas prioridades", solo cuando hay algo que mostrar; el estado "Todo al día" no lleva total). Nuevas clases `.vencidos-card__total` / `.prioridades-card__total` en [styles/components/domain.css](../styles/components/domain.css), fila con borde superior sutil y monto en negrita, coherente con el resto de las cards del dashboard. Verificación en el navegador bloqueada por caché HTTP agresiva del entorno de preview (`fetch` con `cache:'no-store'` sí traía el código nuevo, pero la navegación normal servía JS viejo); verificado en su lugar con tests de render sobre happy-dom, que ejecutan el código de producción real sin ese problema. 6 tests nuevos (4 `sumarMontos` + 2 de render por panel). 1770/1770 → 1774/1774 unit. SW v253 → v254.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic.js` | Nueva `sumarMontos(items)`, función pura. |
| `modules/dominio/compromisos/views/dashboard.js` | `renderPanelVencidos` y `renderPanelPrioridades` agregan el total al pie. |
| `styles/components/domain.css` | `.vencidos-card__total`, `.prioridades-card__total` + variantes `-amount`. |
| `tests/unit/compromisos.test.js` | 4 tests de `sumarMontos` + 2 de render (total presente/ausente según estado). |
| `service-worker.js` | v253 → v254. |

---

### fix(inicio): la categoría con mayor gasto ya no cuenta fijos ni deudas (IN.3) · 2026-07-02

El indicador "Categoría con más gasto" del resumen semanal de Inicio ([resumen/logic.js](../modules/dominio/resumen/logic.js), `categoriaTopSemana`) sumaba todos los `S.gastos` de la semana, incluidos los generados automáticamente por un gasto fijo o un abono a deuda (que llevan `compromisoId`, ver [ADR 002](DECISIONS/002-abono-deudas.md)). Con un arriendo de $900.000 y un mercado de $50.000, el indicador mostraba "Vivienda" cuando el hábito de consumo real del usuario era Alimentación. Fix: `categoriaTopSemana` ahora excluye los gastos con `compromisoId`, coherente con la distinción que TX.6/TX.7 ya hacen visible en la lista de Gastos (obligación vs. consumo variable). Las demás cifras del resumen (total de 7 días, comparación semanal, registros, días activos) no cambian: siguen contando todos los gastos, porque miden actividad total, no hábitos de categoría. 2 tests de regresión. 1764/1764 → 1766/1766 unit. Verificado en el navegador con datos sembrados (arriendo con `compromisoId` + mercado sin él → "🛒 Alimentación $50.000"). SW v252 → v253.

| Archivo | Cambio |
|---|---|
| `modules/dominio/resumen/logic.js` | `categoriaTopSemana` descarta gastos con `compromisoId` antes de agrupar por categoría. |
| `tests/unit/resumen.test.js` | 2 tests: excluye `compromisoId`, y devuelve `null` si toda la semana fue solo fijos/deudas. |
| `service-worker.js` | v252 → v253. |

---

### fix(ux): descubribilidad y robustez, sidebar/toasts/flush de guardado (AUD.5) · 2026-07-02

Quinto y último slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). Tres ajustes independientes de descubribilidad y robustez:

1. **Sidebar con pliegue**: en alturas de ventana <= 800px (solo escritorio; la regla exige `min-width: 1024px` para no chocar con el bottom nav móvil, que ya aplana el nav a fila) el grupo Herramientas quedaba bajo el scroll interno del `.sidebar__nav` sin ningún indicio visual de que había más contenido. [styles/layout.css](../styles/layout.css) compacta el `margin-top` de `.nav-group` y el `padding-bottom` de `.nav-group__label`, y agrega un `::after` `position: sticky; bottom: 0` con gradiente hacia el color de fondo del sidebar, que insinúa el scroll sin robar espacio de layout (compensado con `margin-top` negativo).
2. **Tormenta de toasts de logros**: al desbloquearse 3 o más logros a la vez (restaurar un respaldo JSON, importar un CSV con muchas categorías nuevas) se encadenaba un toast con confetti cada 1.4s ([logros/index.js](../modules/dominio/logros/index.js)) que tapaba contenido por varios segundos. `_checkYMostrar` ahora corta a un solo toast resumen ("N logros nuevos") cuando `nuevos.length > 2`, reusando `_mostrarToast` con un segundo parámetro `label` opcional (antes fijo en "Logro desbloqueado"). Verificado con un script Playwright temporal (no comiteado, borrado tras confirmar): sembrando datos que desbloquean 6 logros de golpe, aparece exactamente 1 `.logro-toast` con el texto "Logros desbloqueados" / "6 logros nuevos".
3. **`save()` sin flush al cerrar**: el debounce de 200ms en [core/storage.js](../modules/core/storage.js) puede perder el último cambio si el usuario cierra la pestaña o el sistema mata la PWA en segundo plano en móvil antes de que el timer corra. Nueva `initFlushOnHide()` (exportada desde `storage.js`) escucha `visibilitychange` (solo cuando `document.visibilityState === 'hidden'`) y `pagehide`, y llama a `_flushNow()` únicamente si hay un guardado pendiente (`_saveTimer` activo), para no escribir a `localStorage` sin necesidad. Registrada en [ui/bootstrap.js](../modules/ui/bootstrap.js) justo después de `loadData()`, antes de cualquier interacción del usuario. El doc comment de `_flushNow` (antes "no usar en producción") se actualizó para reflejar este segundo uso legítimo.

Sin tests unitarios nuevos: los dos primeros son CSS/DOM puro sin lógica que aislar en happy-dom, y el toast de logros está explícitamente fuera del alcance de los tests unitarios por decisión ya documentada en `tests/unit/logros.test.js` ("el toast y confetti requieren DOM completo y se verifican manualmente en la app"). El flush en `visibilitychange`/`pagehide` tampoco es testeable en happy-dom (no hay pestaña real que ocultar). 1764/1764 unit + 81/81 E2E verdes (sin regresiones). SW v251 → v252.

- **`styles/layout.css`**: media query `(max-height: 800px) and (min-width: 1024px)` con espaciado compacto de `.nav-group` + fade sticky en `.sidebar__nav`.
- **`modules/dominio/logros/index.js`**: `_checkYMostrar` muestra un toast resumen si `nuevos.length > 2`; `_mostrarToast(logro, label)` acepta label opcional.
- **`modules/core/storage.js`**: nueva `initFlushOnHide()`; doc comment de `_flushNow` actualizado.
- **`modules/ui/bootstrap.js`**: registra `initFlushOnHide()` tras `loadData()`.
- **`service-worker.js`**: v251 → v252.

---

### fix(color): semántica de color del gasto neutral, no roja (AUD.4) · 2026-07-02

Cuarto slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). Dos lugares pintaban el monto de gasto en rojo fijo, lo que contradice el criterio consolidado de [ADR 019](DECISIONS/019-limites-por-rol.md) (verde = logro, ámbar = advertencia, rojo = incumplimiento) y el tono neutral de [ADR 008](DECISIONS/008-mecanicas-de-habito.md) (resumen semanal como reflexión sin castigo): gastar no es incumplir.

1. **Total de "Resumen de la semana"** en Inicio y **"Pendiente"** en Préstamos ([styles/components/domain.css](../styles/components/domain.css)), ambos usando la clase compartida `.resumen-card__stat--primary`, coloreaban el monto con `--fk-danger-text`. Cambiado a `--fk-text-primary` (neutro). Ninguno de los dos casos es un incumplimiento: uno es cuánto gastaste (información), el otro es dinero que te deben (positivo para ti).
2. **Variación al alza del gasto mensual** en Análisis (`.chart-stat--negativo`, [styles/components/charts.css](../styles/components/charts.css)) usaba `--fk-danger`. Se eliminó la regla de color (el default de `.chart-stat__valor` ya es neutro) y se quitó la asignación de la clase en `_renderTendencia` ([analisis/view.js](../modules/dominio/analisis/view.js)).

Decisión sobre el punto pendiente del backlog (neutro vs ámbar para la variación al alza): **neutro**, por dos razones. Primero, consistencia: el texto de tendencia semanal en Inicio ya es neutro desde F8 ("Gastaste X% más que la semana pasada" en `--fk-text-secondary`), así que el número no debía quedar en otro tono que su propio texto. Segundo, no hay un umbral incumplido que justifique una advertencia (ámbar): es solo una comparación mes a mes, no un límite superado. Bajar el gasto sigue en verde (`chart-stat--positivo`, `resumen-card__trend--baja`): eso sí es un logro digno de refuerzo positivo.

Sin tests nuevos: cambio de color puro sin lógica nueva; ningún test existente referenciaba las clases o colores tocados (verificado por grep antes de tocar). 1764/1764 unit + 81/81 E2E verdes (Playwright). SW v250 → v251.

- **`styles/components/domain.css`**: `.resumen-card__stat--primary .resumen-card__value`: `--fk-danger-text` → `--fk-text-primary`.
- **`styles/components/charts.css`**: eliminada `.chart-stat--negativo` (color danger); queda el neutro por defecto de `.chart-stat__valor`.
- **`modules/dominio/analisis/view.js`**: `_renderTendencia` ya no asigna `chart-stat--negativo` cuando sube el gasto.
- **`service-worker.js`**: v250 → v251.

---

### fix(copy): voseo, tildes y términos viejos corregidos (AUD.3) · 2026-07-02

Tercer slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). Cinco correcciones puntuales de copy que violaban la regla ADN 11 (tuteo, español neutro, sin términos internos):

1. **[logros/logic.js](../modules/dominio/logros/logic.js)**: 4 descripciones de logros en voseo o sin tildes ("Tenes 3 o mas", "un prestamo que vos le diste", "configuracion", "esta lista"). Corregidas a tuteo con tildes correctas.
2. **"Ver agenda"** en el panel de "Próximas prioridades" de Inicio ([compromisos/views/dashboard.js](../modules/dominio/compromisos/views/dashboard.js)): quedó desactualizado desde que la sección se renombró a Calendario (AG.1, 2026-06-30). Ahora dice "Ver calendario".
3. **"el dashboard"** en los empty states de Gastos ([gastos/view.js](../modules/dominio/gastos/view.js)) y Mis cuentas ([tesoreria/view.js](../modules/dominio/tesoreria/view.js)): término interno que la app ya no usa desde el renombre a Inicio. Corregido a "Inicio".
4. **`APP_VERSION`** en [core/constants.js](../modules/core/constants.js): decía `'0.1.0'`, visible en Ajustes > Acerca de Finko, desincronizado de `package.json` (`1.0.0`). Sincronizado.
5. **"Toca una estrategia"** en el placeholder de Deudas ([compromisos/views/estrategia.js](../modules/dominio/compromisos/views/estrategia.js)): se lee raro en desktop (no hay "toque" con mouse). Cambiado a "Elige una estrategia".

Sin tests nuevos: es copy sin lógica asociada y ningún test existente referenciaba estos textos (verificado por grep antes de tocar). 1764/1764 unit + 81/81 E2E verdes (Playwright). SW v249 → v250.

- **`modules/dominio/logros/logic.js`**: 4 descripciones de logros con tuteo y tildes correctas.
- **`modules/dominio/compromisos/views/dashboard.js`**: "Ver agenda" → "Ver calendario" (+ `aria-label`).
- **`modules/dominio/gastos/view.js`**, **`modules/dominio/tesoreria/view.js`**: "el dashboard" → "Inicio" en empty states.
- **`modules/core/constants.js`**: `APP_VERSION` `'0.1.0'` → `'1.0.0'`.
- **`modules/dominio/compromisos/views/estrategia.js`**: "Toca una estrategia" → "Elige una estrategia".
- **`service-worker.js`**: v249 → v250.

---

### fix(css): 15 variables CSS fantasma mapeadas a tokens reales (AUD.2) · 2026-07-02

Segundo slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). `charts.css`, `domain.css`, `analysis.css`, `forms.css`, `config.css` y `layout.css` referenciaban 15 variables `--fk-*` nunca definidas en `tokens.css` (~52 usos): al no existir, el navegador usa el valor inicial en vez del token de diseño, lo que rompía en silencio el `accent-color` de radios/checkboxes (verde de marca → azul del navegador), los bordes de tarjetas (caían a `currentColor`, invisibles) y los fondos de gráficos (transparentes).

Mapeo aplicado siguiendo el patrón ya dominante en el resto del código:

- `--fk-primary` → `--fk-accent` (color de marca).
- `--fk-border` → `--fk-border-subtle` (convención mayoritaria para bordes de tarjeta: 35 usos reales contra 15 de `border-default`).
- `--fk-bg`, `--fk-surface`, `--fk-surface-subtle` → `--fk-bg-surface` / `--fk-bg-elevated` según la jerarquía visual del elemento (dos usos como `color:` sobre círculos de acento van a `--fk-text-on-accent`, no a un fondo).
- `--fk-text` → `--fk-text-primary`.
- `--fk-weight-bold/medium/semibold/regular` y `--fk-font-normal` → `--fk-font-bold/medium/semibold/regular`.
- `--fk-radius` → `--fk-radius-sm`; `--fk-radius-pill` → `--fk-radius-full`.
- `--fk-text-md` → `--fk-text-base`; `--fk-text-2xs` → `--fk-text-xs` (sin equivalente exacto en la escala tipográfica, xs es el valor real más cercano).

Se aprovechó para quitar los fallbacks inline (`var(--x, valor)`) que compensaban las variables fantasma: ya no hacen falta porque el token real siempre está definido. Cero cambios de lógica, HTML o comportamiento: es puramente resolución de tokens. Verificado en navegador (datos sembrados): Análisis (sparkline, dona, tarjetas de stats) y Presupuesto (estado vacío con borde punteado) muestran bordes y fondos reales. 1764/1764 unit verdes (sin tests nuevos: no hay lógica que cubrir, solo CSS). SW v248 → v249.

- **`styles/components/charts.css`**: 15 usos (sparkline, donut, stats, import CSV, tarjetas de estrategia de deuda).
- **`styles/components/domain.css`**: 11 usos (selector de cuenta radio/checkbox, tarjeta de límites, consolidado de ahorro).
- **`styles/components/analysis.css`**: 14 usos (tarjetas de grupo, envelopes, fondo de emergencia, inversión, tabla comparativa).
- **`styles/components/forms.css`**: 2 usos (badge genérico, placeholder de gasto sin completar).
- **`styles/components/config.css`**: 2 usos (título y emoji del detalle de calendario).
- **`styles/layout.css`**: 1 uso (separador de sub-header de sección).
- **`service-worker.js`**: v248 → v249.

---

### fix(dashboard/analisis): montos reales de deudas en los paneles de Inicio y variación sin base en Análisis (AUD.1) · 2026-07-02

Primer slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). Corrige los 4 bugs funcionales visibles que detectó la auditoría:

1. **"$NaN pendiente" en el nudge "deudas llevan tiempo sin actividad"** (sección Deudas): la vista leía `d.saldoPendiente`, campo que no existe; la lógica (`detectarDeudasDurmiendo`) devuelve `saldoTotal`. Ahora muestra el saldo formateado ("$5.800.000 pendiente").
2. **Deudas vencidas con "$0" en el panel "N pendientes del mes"** (Inicio): `detectarVencidosCompletos` exponía `Number(c.monto) || 0`, pero las deudas no tienen `monto` desde la migración v6 (su cuota vive en `cuotaMensual`). Ahora expone la cuota mensual para deudas y conserva `monto` para fijos.
3. **"Próximas prioridades" (Inicio) omitía la cifra de las deudas**: el render leía `c.monto`; ahora cae a `cuotaMensual` cuando no hay `monto` (fijos, préstamos personales y apartados siguen igual).
4. **Variación "↑ 0%" en rojo en la tendencia de Análisis** cuando el mes anterior cerró en $0: sin base de comparación no hay porcentaje que mostrar; ahora dice "Sin gastos el mes anterior para comparar" en tono neutro (mismo criterio que el resumen semanal de F8).

6 tests de regresión nuevos (1 de lógica + 5 de render en happy-dom). 1758/1758 → 1764/1764 unit; 81/81 E2E. Verificado en navegador real (Playwright, datos sembrados): Inicio, Deudas y Análisis muestran los montos y textos correctos. SW v247 → v248.

- **`modules/dominio/compromisos/views/alertas.js`**: `f(d.saldoTotal)` en el nudge de deudas durmiendo (antes `d.saldoPendiente`, undefined, que formateaba NaN).
- **`modules/dominio/compromisos/logic.js`**: `detectarVencidosCompletos` expone la cuota mensual como `monto` en deudas.
- **`modules/dominio/compromisos/views/dashboard.js`**: el panel de prioridades usa `c.monto ?? c.cuotaMensual`.
- **`modules/dominio/analisis/view.js`**: `_renderTendencia` maneja el caso sin base (mes anterior en $0) con aviso neutro.
- **`tests/unit/compromisos.test.js`**, **`tests/unit/analisis.test.js`**: 6 tests de regresión.
- **`service-worker.js`**: v247 → v248.

---

### feat(presupuesto): los topes por categoría se fusionan dentro de la tarjeta de Estilo de vida (MC.8b, ADR 019) · 2026-07-01

Segundo slice grande de la épica MC.8 ([ADR 019](DECISIONS/019-limites-por-rol.md), decisiones 2 y 4). Elimina la **redundancia de arquitectura de la información**: Estilo de vida dejaba de aparecer en dos sitios (su tarjeta en el resumen y el bloque suelto "Estilo de vida: topes por categoría" debajo, con su hero de totales). Ahora hay **un solo relato por grupo**.

Los topes por categoría (envelope budgeting sobre `S.presupuestos`) viven **dentro** de la tarjeta de Estilo de vida (`_renderDetalleEstiloVida` en `presupuesto/view.js`), con tres piezas:

- **Olla finita** (`_renderOllaFinita`): una línea que dice cuánto del presupuesto de Estilo de vida (que sale de la distribución de Mis cuentas) cubren los límites y cuánto queda sin tope, por ejemplo "Tus límites cubren $300.000 de los $900.000 de tu Estilo de vida. Te quedan $600.000 sin tope." Da la noción de presupuesto acotado sin forzar a asignar el 100% (usa `coberturaLimitesEstiloVida`, MC.8a). Maneja los bordes: sin presupuesto, sin límites, cobertura total y exceso (este último en ámbar).
- **Envelopes por categoría** con sus alertas ámbar/roja (Estilo de vida es el grupo que sí se controla), o un mensaje breve si aún no hay ninguno.
- **Botón "Agregar límite"** (topes bajo demanda) más las categorías con gasto pero sin tope (sugerencia de dónde poner uno).

`_renderGrupoCard` pasa a ser **consciente del rol** (ADR 019 decisión 1): **Necesidades = monitorear** (estado neutro `monitor`, sin barra ámbar ni roja; la tercera cifra informa el exceso como "Sobre lo previsto", nunca "Excedido" en rojo, porque son gastos esenciales que se pagan sí o sí); **Ahorro = celebrar** (verde, ya venía de MC.8); **Estilo de vida = controlar** (conserva su estado de gasto alerta/excedido). El estado sin ingreso conserva la gestión de topes (sin la olla finita, que necesita el presupuesto del grupo), para no perder la capacidad de ponerle un tope al gasto antes de registrar ingresos.

Se eliminaron `_renderHero` y `_renderEmptyState` (código muerto tras la fusión) y su CSS (`.presupuesto-hero*`, `.estilo-detalle*`, y la regla móvil asociada en `responsive.css`). **Pendiente MC.8c:** el layout (Necesidades + Ahorro en dos columnas compactas, Estilo de vida en fila completa); por ahora las tres tarjetas siguen en el grid de 3 columnas.

3 E2E nuevos (fusión de topes + botón "Agregar límite", olla finita con la cobertura exacta, Necesidades sin alarma aunque supere lo previsto). 1758/1758 unit; 42/42 → 45/45 smoke E2E. Lint limpio. SW v246 → v247.

- **`modules/dominio/presupuesto/view.js`**: topes fusionados en la tarjeta de Estilo de vida (`_renderDetalleEstiloVida`, `_renderOllaFinita`); `_renderGrupoCard` consciente del rol (Necesidades neutro); `_renderResumenGruposVacio` conserva los topes sin ingreso; `_renderHero`/`_renderEmptyState` eliminados.
- **`styles/components/analysis.css`**: `.estilo-limites*`, `.estilo-olla*`, `.estilo-limites-standalone*`; se quitó `.estilo-detalle*` y `.presupuesto-hero*`.
- **`styles/responsive.css`**: se quitó la regla móvil de `.presupuesto-hero__totales`.
- **`tests/e2e/smoke.test.js`**: 3 tests nuevos.
- **`service-worker.js`**: v246 → v247.

---

### fix(presupuesto): la tarjeta de Ahorro celebra en verde al superar la meta, nunca en rojo (MC.8, ADR 019) · 2026-07-01

Petición del usuario sobre la retroalimentación visual del Ahorro: superar la meta se pintaba de **rojo** (barra `progress-bar--danger`, borde/fondo de peligro, "Excedido" en rojo), lo que transmite error cuando en realidad es un buen hábito. Se hace `_renderGrupoCard` (`presupuesto/view.js`) consciente del rol para el grupo **Ahorro**: cumplir o superar la meta (`pct >= 100`) usa la **paleta positiva** (verde), nunca ámbar ni rojo.

- Barra `progress-bar--complete` (verde) al llegar al 100%; por debajo, el color de progreso neutro. Nunca `--warn` ni `--danger` para Ahorro.
- Estado visual nuevo `logro` (borde y fondo verdes) en vez de `excedido` (rojo).
- Tercera cifra: superar la meta es "Ahorrado de más" en verde (`is-positive`), no "Excedido" en rojo; no llegar aún es "Te falta" (neutro), en vez del "Disponible" que no aplicaba a ahorro.

Consolida la regla de color de Finko: verde = logros/ahorro/metas cumplidas, ámbar = advertencias, rojo = incumplimientos reales. Necesidades y Estilo de vida conservan su chrome actual (el reencuadre de Necesidades es MC.8b). 1 E2E nuevo (en navegador limpio, autoritativo). 1758/1758 unit; 77/77 → 78/78 E2E. Verificado en el navegador: la tarjeta de Ahorro al 150% muestra barra verde, "Ahorrado de más $300.000" en verde y borde verde. Lint limpio. SW v245 → v246.

- **`modules/dominio/presupuesto/view.js`**: `_renderGrupoCard` con paleta positiva por rol para Ahorro (estado `logro`, barra verde, cifra `is-positive`).
- **`styles/components/analysis.css`**: `.grupo-card[data-estado="logro"]` (verde) + `.grupo-card__fig dd.is-positive`.
- **`tests/e2e/smoke.test.js`**: 1 test nuevo (Ahorro superado se ve en verde, nunca en rojo).
- **`service-worker.js`**: v245 → v246.

---

### feat(presupuesto): mensajes de Límites por rol, Necesidades informativo y Ahorro más cálido (MC.8a, ADR 019) · 2026-07-01

Primer slice de la épica MC.8 ([ADR 019](DECISIONS/019-limites-por-rol.md), decisiones 1, 3 y 2). Reencuadra `generarMensajesLimites` (`presupuesto/logic.js`) para que cada grupo hable según su **rol**, no con una plantilla común:

- **Necesidades = monitorear.** Deja de emitir una alerta con lenguaje de "límite". Cuando el gasto en necesidades supera lo que la distribución les asignó, genera un mensaje **informativo** (`tipo: 'info'`, nuevo): "Tus necesidades están consumiendo una parte importante de tu ingreso este mes. Considera revisar tu plan general o dónde puedes reducir otros gastos." Estar cerca del presupuesto (estado 'alerta') ya no genera nada: es normal.
- **Ahorro = celebrar.** El refuerzo distingue cumplir de superar: si aportaste justo lo planeado, "Vas por buen camino. Cumpliste con el ahorro que planeaste este mes"; si aportaste de más (`ejecutado > asignado`), un mensaje más cálido: "¡Excelente! Este mes estás ahorrando más de lo planeado. Cada peso que ahorras hoy es tranquilidad mañana."
- **Estilo de vida = controlar.** Sin cambios: sigue siendo el único grupo con alertas preventivas por categoría y por grupo.

Nueva función pura **`coberturaLimitesEstiloVida(presupuestos, presupuestoEstiloVida)`** (la "olla finita"): devuelve `{limites, presupuesto, sinTope, excede}`, cuánto del presupuesto de Estilo de vida cubren los topes y cuánto queda sin tope, para dar noción de presupuesto acotado sin forzar el 100%. Reusa `totalAsignadoMensual`. La usará MC.8b en la vista.

Como `generarMensajesLimites` ya está en uso, se ajustó el render de nudges (`presupuesto/view.js`): `_nivelNudge` resuelve el nivel visual y se agregó el nivel `info` → `nudge-info` (azul calmado), además de los existentes. **Nota:** el chrome de las tarjetas (barra roja, etiqueta "Excedido") todavía sigue el modelo simétrico de MC.5b; su reencuadre por rol es MC.8b. Este slice solo cambia los mensajes.

6 unit netos + 1 E2E nuevo. 1752/1752 → 1758/1758 unit; 76/76 → 77/77 E2E. Verificado en el navegador: la tarjeta de Necesidades excedidas muestra un nudge azul informativo (sin "límite") y la de Ahorro que supera lo planeado, el refuerzo cálido en verde. Lint limpio. SW v244 → v245.

- **`modules/dominio/presupuesto/logic.js`**: `generarMensajesLimites` reencuadrada por rol; `coberturaLimitesEstiloVida` nueva.
- **`modules/dominio/presupuesto/view.js`**: `_nivelNudge` + soporte del nivel `nudge-info`.
- **`tests/unit/presupuesto.test.js`**: tests de Necesidades/Ahorro actualizados + 6 de `coberturaLimitesEstiloVida`.
- **`tests/e2e/smoke.test.js`**: E2E de refuerzo de Ahorro actualizado (cumplir) + nuevo (superar).
- **`service-worker.js`**: v244 → v245.

---

### docs(adr): ADR 019, Límites de gasto con tratamiento asimétrico por rol (MC.8, diseño) · 2026-07-01

Diseño de la épica **MC.8**, que **revisa las decisiones 1, 4 y 5 del [ADR 017](DECISIONS/017-limites-centro-de-control.md)** sin revertir su núcleo (presupuesto por grupo desde la distribución, sin schema). Nace de una observación del usuario: tratar los tres grupos de Límites con la misma tarjeta y los mismos umbrales es sutilmente incorrecto, porque no tienen la misma naturaleza. La sección pasa a un **tratamiento asimétrico por rol**:

1. **Necesidades = monitorear.** Gastos esenciales que se pagan sí o sí; no se limitan. El copy se reencuadra: informa cuánto del ingreso consumen ("usan el X%") y, si suben, sugiere revisar el plan general, nunca "te estás pasando". Se elimina la palabra "límite" de su copy.
2. **Ahorro = celebrar.** Ahorrar más de lo planeado es una victoria, no una desviación. Refuerzo cálido y variado al cumplir o superar la meta (ya existía desde MC.5d; se enriquece), nunca alerta.
3. **Estilo de vida = controlar.** Único grupo con topes por categoría y alertas preventivas. Los topes se **fusionan dentro de su tarjeta** (desaparece el bloque suelto "Estilo de vida: topes por categoría"), con el modelo de "agregar límite bajo demanda" (ya existente) más una línea de conciencia de "olla finita" (cuánto del presupuesto de Estilo de vida cubren los límites actuales). Se rechaza la alternativa de porcentajes que sumen 100% por la misma rigidez que MC.6b ya descartó.

Layout: en desktop, Necesidades y Ahorro en dos columnas compactas y Estilo de vida en fila completa (el peso visual comunica dónde está la acción); en móvil se apilan. Decisión pragmática: todas las categorías de gasto siguen siendo limitables en v1 (reclasificarlas por grupo tocaría `ejecutadoPorGrupoDelMes` y se difiere a un ADR futuro). Sin schema nuevo. Implementación en 4 slices (MC.8a a MC.8d). Pausa temporalmente MC.7 (íbamos por MC.7d), que se retoma después. Solo docs.

- **`docs/DECISIONS/019-limites-por-rol.md`**: nuevo ADR (contexto, 6 decisiones, alternativas, consecuencias, slices).
- **`docs/TASKS.md`**: MC.8 diseño cerrado + slices MC.8a a MC.8d; MC.7 marcado en pausa.

---

### feat(tesoreria): desglose itemizado de Necesidades en "Distribuir mi ingreso" (MC.7c, ADR 018) · 2026-07-01

Tercer slice de la épica MC.7 ([ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md), decisión 2), el Paso 1 del asistente. Nueva función pura **`construirDesgloseNecesidades(compromisos)`** en `tesoreria/logic.js`: una fila por gasto fijo y por deuda activos (nombre, categoría, monto mensual equivalente), ordenadas de mayor a menor. Es una vista de **solo lectura**: no mueve dinero, no crea schema; cada obligación se sigue pagando al vencer, exactamente como hoy.

El monto de cada fila usa la misma normalización mensual que ya usa el modelo de distribución (fijo = `monto * factor de frecuencia`, igual que `calcularGastosFijosMensuales`; deuda = `cuotaMensual`, ya mensual), para que el desglose sea coherente con el "Necesidades" agregado que el panel ya mostraba. Los compromisos de baja periodicidad (Anual, Bimestral, etc.) se excluyen, igual que en el agregado.

En la vista, el desglose aparece como un `<details>` colapsable ("Ver detalle (N)") bajo la fila "📦 Necesidades" existente, reusando el patrón visual `.analisis-grupo` (ya usado en Análisis y Límites de gasto) con clases propias (`.distribuir__nec-*`) para no acoplar Mis cuentas al markup de Límites. Cada fila muestra un emoji por categoría (reusa `CATEGORIA_AGENDA_EMOJI`/`CATEGORIA_DEUDA_EMOJI` de `constants.js`), con fallback genérico por tipo.

11 unit + 1 E2E nuevos. 1741/1741 → 1752/1752 unit; 75/75 → 76/76 E2E. Verificado en el navegador: con Arriendo ($800.000), Tarjeta ($250.000) e Internet ($100.000), el detalle los lista en ese orden con sus emojis de categoría. Lint limpio. SW v243 → v244.

- **`modules/dominio/tesoreria/logic.js`**: `construirDesgloseNecesidades()` nueva.
- **`modules/dominio/tesoreria/view.js`**: `renderDistribucionIngreso` computa el desglose; `_renderDesgloseNecesidades()` y `_emojiNecesidad()` nuevas; se inserta en `_renderPanelDistribuir`.
- **`styles/components/forms.css`**: `.distribuir__nec-desglose` + `.distribuir__nec-item*`.
- **`tests/unit/tesoreria.test.js`**: 11 tests nuevos.
- **`tests/e2e/smoke.test.js`**: 1 test nuevo.
- **`service-worker.js`**: v243 → v244.

---

### feat(tesoreria): aporte de ahorro por objetivo en "Distribuir mi ingreso" (MC.7b, ADR 018) · 2026-07-01

Segundo slice de la épica MC.7. El panel "Distribuir mi ingreso" ya no arranca con "todo al fondo": cada meta y apartado activo aparece con su **aporte sugerido** (`construirDesgloseAhorroPorObjetivo`, MC.7a), y el fondo de emergencia recibe el **excedente** que queda tras esos aportes. Los objetivos sin fecha muestran $0 y un hint bajo su fila: "Ponle una fecha en Metas/Apartados para calcular cuánto aportar", con enlace a la sección correspondiente. Todo sigue siendo editable, como antes.

`construirPlanAhorro` quedó sin llamadores tras el cambio (era solo el default "todo al fondo") y se **eliminó** junto con sus 5 tests, en vez de dejarla como código muerto. `construirDesgloseAhorroPorObjetivo` (MC.7a) suma el campo `sinFecha` por fila para que la vista sepa cuándo mostrar el hint, sin que `view.js` tenga que re-derivar esa lógica leyendo fechas directamente.

3 unit + 2 E2E nuevos (netos: se sumaron 8 y se quitaron 5 de `construirPlanAhorro`). 1743/1743 → 1741/1741 unit (neto); 73/73 → 75/75 E2E. Verificado en el navegador: con una meta a 6 meses y $1.200.000 de faltante, sugiere $200.000; el fondo (presupuesto $600.000) recibe $400.000 de excedente; una meta sin fecha muestra $0 con el hint. Lint limpio. SW v242 → v243.

- **`modules/dominio/tesoreria/logic.js`**: `construirDesgloseAhorroPorObjetivo()` ahora expone `sinFecha` por fila; `construirPlanAhorro()` eliminada (sin llamadores).
- **`modules/dominio/tesoreria/view.js`**: `renderDistribucionIngreso` usa `construirDesgloseAhorroPorObjetivo` directamente sobre `S.metas`/`S.apartados`; `_filaDistribuir` agrega el hint de "sin fecha" con enlace a Metas/Apartados.
- **`styles/components/forms.css`**: `.distribuir-ingreso__destinos .distribuir__hint` (sin margin-top propio, ya lo da el `gap` del contenedor).
- **`tests/unit/tesoreria.test.js`**: 3 tests nuevos de `sinFecha`; se eliminó el describe de `construirPlanAhorro` (5 tests).
- **`tests/e2e/smoke.test.js`**: 2 tests nuevos (aporte sugerido + excedente del fondo; hint de meta sin fecha).
- **`service-worker.js`**: v242 → v243.

---

### feat(tesoreria): desglose de aportes de ahorro por objetivo (MC.7a, ADR 018) · 2026-07-01

Primer slice de la épica MC.7 ([ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md), decisión 3). Nueva función pura **`construirDesgloseAhorroPorObjetivo({ metas, apartados, fondo, budgetAhorro, hoy })`** en `tesoreria/logic.js`: a diferencia de `construirPlanAhorro` (que hoy sugiere todo el presupuesto al fondo), reparte un aporte sugerido **por cada meta y apartado activo** (faltante entre meses restantes, igual fórmula que `calcularAporteMensualObjetivos`), y el **fondo de emergencia recibe el excedente** que quede tras esos aportes (nunca negativo; 0 si ya está completo). Los objetivos sin fecha sugieren 0 en vez de adivinar (decisión del usuario).

Para no duplicar la fórmula, se extrajo el helper privado `_aporteMensualObjetivo(montoObjetivo, montoActual, fecha, tsHoy)` y `calcularAporteMensualObjetivos` se refactorizó para consumirlo (extracción sin cambio de comportamiento, verificada por sus 8 tests existentes que siguen en verde). Esta función aún **no está integrada** en el panel "Distribuir mi ingreso" (eso es MC.7b); es solo la lógica de agregación, pura y testeada en aislamiento.

15 tests nuevos. 1728/1728 → 1743/1743 unit. Lint limpio. SW v241 → v242.

- **`modules/dominio/tesoreria/logic.js`**: `construirDesgloseAhorroPorObjetivo()` nueva; `_aporteMensualObjetivo()` helper privado extraído; `calcularAporteMensualObjetivos()` refactorizada para reusarlo.
- **`tests/unit/tesoreria.test.js`**: 15 tests nuevos.
- **`service-worker.js`**: v241 → v242.

---

### docs(adr): ADR 018, "Distribuir mi ingreso" como asistente guiado de 3 pasos (MC.7, diseño) · 2026-07-01

Diseño de la épica MC.7. El panel "Distribuir mi ingreso" ([ADR 012](DECISIONS/012-auto-distribucion-ingresos.md), MC.4a-e) evoluciona a un **asistente guiado** que hace el trabajo pesado y deja al usuario solo revisar, ajustar y confirmar. Tres pasos:

1. **Necesidades** itemizada como **preview read-only** (gastos fijos de Agenda + cuotas de deuda + compromisos del periodo, con nombre/categoría/valor). El dinero no se mueve: queda en la cuenta y se paga cada obligación al vencer, como hoy. Sin schema.
2. **Ahorro** con aportes **auto-calculados por objetivo**: para metas/apartados con fecha, `faltante / periodos restantes` (reusa la fórmula de `calcularAporteMensualObjetivos`, pero devolviendo el desglose por objetivo, no solo el total); para los que no tienen fecha, sugiere 0 + hint "ponle una fecha"; el fondo de emergencia recibe el excedente si está incompleto. Todo editable.
3. **Estilo de vida** repartido entre las cuentas activas; **omitido con cuenta única** (regla de cuenta única del proyecto).

Decisiones cerradas con el usuario: (a) Paso 1 = preview, no reservar/apartar (evita schema y no toca el ADN); (b) objetivos sin fecha en el Paso 2 = sugerir 0 con invitación a poner fecha (no adivinar); (c) la implementación arranca por el **Paso 2** (auto-cálculo de Ahorro), el valor "inteligente" más tangible. Confirmación única al final; reusa el apply-plan/undo, el gating por fecha de cobro y los abonos avalancha de MC.4. Sin schema nuevo en v1. Implementación en 6 slices (MC.7a a MC.7f). Solo docs.

- **`docs/DECISIONS/018-asistente-distribuir-ingreso.md`**: nuevo ADR (contexto, 7 decisiones, alternativas, consecuencias, slices).
- **`docs/TASKS.md`**: MC.7 diseño cerrado + slices MC.7a a MC.7f.

---

## Meses anteriores

- [2026-06](changelog/2026-06.md)
- [2026-05](changelog/2026-05.md)

---

## Convención de entradas

Cada entrada agrupa por fase/release y dentro lista commits con:
- **tipo(área)** - `commit_hash` · `archivos tocados` - descripción de qué cambió.

Tipos: `feat` (nueva funcionalidad), `fix` (bug), `refactor` (sin cambio funcional), `test`, `docs`, `chore` (config/build), `style` (formato).
