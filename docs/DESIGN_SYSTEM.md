# Design System - Finko Claude

> Revisado: 2026-08-11.

> Documento vivo. Se actualiza al agregar nuevos tokens o componentes.
> Última revisión: 2026-07-28 (R70 a R74, la casa de Ahorro, [ADR 056](DECISIONS/056-la-casa-de-ahorro.md): las cinco van en Principios porque ninguna es de componente, son reglas de arquitectura de información. Cierran la auditoría por secciones: son las primeras que no nacen de una pantalla sino de la relación entre cinco. Antes R66 a R69, arquitectura I+H del Fondo de emergencia; las cuatro van en Principios. La quinta regla del informe, "la explicación va antes del número que empeoró", **no entra todavía**: su estado (el retroceso por subida de gastos) necesita un dato que Finko no guarda y quedó sin construir, así que la regla no tiene origen implementado que la sostenga. R69 es de lenguaje y aplica a toda la app, no solo al Fondo. Antes R63 a R65, arquitectura O de Inversión, la que cierra las cuatro secciones del hub de ahorro: las tres van en Principios porque ninguna es de componente, son reglas de qué figura usar y cuándo enseñar. R63 nace de una observación de Esteban sobre el conjunto de las cuatro secciones, no de Inversión sola. Antes R60 a R62, arquitectura E de Apartados: las tres nacen de comparar dos series en la misma tarjeta, así que van juntas en Principios. Su cuarta regla, "el estado terminal cambia el dato y no solo el botón", **no entra**: ya la dice R58 desde Metas, y la de "un dato que no existe se ofrece" es la R57 de ese mismo informe, confirmada aquí. Antes R57 a R59, arquitectura A2 de Metas, la segunda pasada de la auditoría por secciones: la que decide estructura y no detalle. R57 y R58 van en Principios; R59 en Barras y anillos de progreso, junto al medidor semicircular que documenta esa misma sección. Antes R56, auditoría de diseño de Metas, que el informe numeraba R15 y se renumera al primer hueco real; va en Componentes, junto a R2 y R19, porque es la anatomía de la fila lo que fija. La R16 del mismo informe **no entra**: ya la dice R20, palabra por palabra, desde la auditoría de Me deben. Antes R52 a R55, auditoría de diseño de Fondo de emergencia, que el informe numeraba R11 a R14 y se renumeran al primer hueco real; entran las cuatro. R52 y R55 van en Principios; R53 en Botones, junto a R26; R54 en Barras y anillos de progreso, junto a R43. Antes R46 a R51, auditoría de diseño de Calendario, que el informe numeraba R13 a R18 y se renumeran al primer hueco real; entran las seis. R46 a R48 van en Principios; R49 en Colores por dominio, junto a R3; R50 y R51 en Botones, junto a la regla del primario único. Antes R41 a R45, auditoría de diseño de Análisis, la que reservaba R25 a R29 y se renumera al primer hueco real; sus cinco reglas entran las cinco, y la mitad de su R25 que pedía "ninguna clase se declara dos veces" queda como corolario de R23, que ya es dueña del tema. R41, R42 y R45 van en Principios; R43 en Barras y anillos de progreso; R44 en Colores por dominio, junto a R6. Antes R38 a R40, auditoría de diseño de Mis cuentas; el informe numeraba seis reglas, R19 a R24, y solo entran tres: su R20 corresponde a una corrección transversal que quedó fuera de alcance, su R22 ya la dice R20 y su R24 ya la dice R24. Antes R36 y R37, auditoría de la Barra de navegación; R34 y R35, auditoría de Límites de gasto, que el informe numeraba R9 y R10 y se renumeraron al primer hueco real. Antes R29 a R33, auditoría de la Interfaz: la capa global de navegación; R23 a R28 de la de Apartados, R9 a R11 de la de Gastos, R19 a R22 de la de Me deben, R7 y R8 de la de Deudas, R1 a R6 de la de Inicio, radio protagonista y [ADR 054](DECISIONS/054-el-acento-no-mide-gasto.md)).
> Fuente de verdad: los archivos CSS. Si este doc y `tokens.css` difieren, manda `tokens.css` (y hay que actualizar este doc).

---

## Principios de diseño

1. **Claridad sobre estética** - Si hay duda entre lo bonito y lo claro, gana lo claro.
2. **Lenguaje humano, neutral y profesional** - "Tu dinero disponible hoy" antes que "Saldo disponible" (ADN regla 11, [ADR 003](DECISIONS/003-tono-neutral-profesional.md)).
3. **Modo oscuro por defecto** - Reduce fatiga visual en uso prolongado. Modo claro de primera clase, no un derivado.
4. **WCAG AA mínimo** - Texto principal con contraste >= 4.5:1 en ambos temas. Lighthouse Accessibility 100 es innegociable.
5. **Responsive real** - Cada componente funciona en 320px y en 1440px.
6. **Tokens siempre** - Nunca hardcodear colores, espaciados ni tamaños. Solo `var(--fk-*)`.
7. **"Calma con energía"** (rediseño 2026) - Superficies tranquilas con mucho aire; el acento esmeralda se reserva para dinero disponible, progreso y éxito. Cero glow neón.

**R10 · El título nombra el periodo que se está viendo:** una cifra y su periodo se leen juntos. Si la pantalla deja navegar entre periodos, el label dice cuál ("Gastaste en junio"), nunca un "este mes" fijo; con un filtro aplicado, dimensión más periodo ("Café en junio"), nunca la dimensión sola. Origen: el hero de Gastos decía "Gastaste este mes" en cualquier mes navegado, y a 30px de distancia su propia nav decía "Junio 2026" y su chip comparativo, "8% más que mayo".

**R20 · El ojo no tiene excepciones:** toda vista que pinte montos lee `S.config.ocultarSaldo` (IN.2), el único control de privacidad de la app. Máscara larga (`SALDO_MASCARA`) para totales y heros, corta (`SALDO_MASCARA_CUENTA`) por fila y en las cifras dentro de hints. Las barras y anillos de proporción se conservan: muestran porcentaje, no magnitud. Origen: Me deben, la lista más sensible (cuánto te debe la tía, por su nombre propio), era la única sección con dinero que ignoraba el flag.

**R57 · Un dato que no existe se ofrece, no se rellena:** cuando falta el dato del que cuelga media pantalla, el hueco no se tapa con un guion, un "N/D" ni un relleno neutro: se pide lo que falta, en el mismo lugar donde iría, con la acción que lo consigue. Un dato ausente no es información faltante, es información que todavía no existe. Origen: una meta sin fecha límite pierde tres de sus once datos (plan de aportes, número de aportes y fecha), y en su lugar la tarjeta ofrece ponerle fecha con el enlace que abre su formulario de edición.

**R58 · Un estado terminal conserva su forma:** lo que se completa no desaparece ni cambia de componente: mantiene su tarjeta y cambia su contenido (indicador cerrado, acción principal retirada, dato de cierre en vez de plan). Un componente distinto para el estado final obliga a reaprender la pantalla justo en el momento de más carga emocional. Origen: la meta cumplida, que hasta DIS.13 salía de la lista y no tenía ninguna otra pantalla donde verse, editarse ni eliminarse.

**R60 · Dos filas que existen para compararse usan la misma tinta:** un color para lo hecho y otro para lo pendiente, iguales en las dos filas. Si una se dibuja más vistosa que la otra, gana el vistazo y la comparación se invierte, que es lo contrario de lo que el componente vino a hacer. El juicio lo emite el texto, no el relleno. Origen: las dos barras de la tarjeta de apartado (dinero reunido contra plan previsto), que solo funcionan si se leen por longitud.

**R61 · Una comparación se hace contra el plan, no contra el reloj:** si un dato avanza a saltos, su referente también. Comparar un acumulado que crece por aportes contra el tiempo transcurrido, que corre continuo, produce un atraso falso durante casi todo el periodo: con una cuota mensual a seis meses el error medido llega a 17 puntos. Origen: la primera versión de la segunda barra de Apartados, corregida antes de implementarse.

**R62 · Una advertencia necesita umbral:** por debajo de una unidad completa de atraso, la interfaz calla. Una señal que aparece por diferencias que el usuario no puede evitar (el hueco entre un aporte y el siguiente) deja de leerse como aviso y pasa a leerse como ruido, y de paso regaña a quien va al día. Origen: el veredicto de la tarjeta de apartado, que solo habla al acumular un aporte completo de diferencia.

**R63 · Cada sección tiene su propia figura, y la forma la decide lo que se mide:** dos secciones no comparten figura aunque el dato se parezca, porque es la figura la que permite reconocer dónde estás antes de leer el título. Un arco rodea (Metas: cuánto llevas rodeado de lo que quieres), dos barras enfrentadas corren en paralelo (Apartados: tu dinero contra tu plan), bloques y escalera se cuentan (Fondo: meses y etapas), dos columnas se comparan (Inversión: antes y después). Origen: la primera versión de la cabecera de Inversión repetía la franja segmentada del Fondo, y a un metro de distancia las dos secciones se confundían.

**R64 · Una figura puede enseñar dos cosas si una es la partición de la otra:** el cuerpo dice de qué está hecho el total y el segmento añadido dice qué le suma otra variable. Dos lecciones en una sola figura solo funcionan con esa relación; si las dos magnitudes son independientes, son dos figuras. Origen: las columnas de Inversión, donde la de hoy está partida por tipo (diversificación) y la de al vencer repite ese cuerpo y le añade lo que pone el tiempo (rendimiento).

**R66 · Un logro alcanzado no se retira cuando el objetivo se mueve:** si la meta sube, cambia lo que falta, no lo conseguido. El corte de un nivel se mide contra la unidad real (meses cubiertos, unidades entregadas), nunca contra un porcentaje del objetivo, que se recalcula solo y castiga al usuario por algo que no hizo. Origen: el fondo de emergencia, cuyo objetivo crece cuando suben los gastos fijos, así que el mismo dinero cubría menos tiempo y el porcentaje caía sin que el usuario hubiera gastado un peso.

**R67 · Un camino sin final muestra siempre el siguiente tramo:** completar no es terminar. Si el objetivo del usuario es un punto intermedio de un camino más largo, cumplirlo no apaga la pantalla: el tramo siguiente queda a la vista y la acción secundaria pasa a ofrecerlo, con su destino nombrado. Origen: llegar a tres meses de fondo apagaba la tarjeta, cuando lo sensato es seguir hasta seis.

**R68 · Un porcentaje muy bajo se dice con palabras:** al empezar un tramo nuevo, "apenas empiezas" informa igual que "3%" y no convierte un logro en deuda; en cero, cuando el tramo ni siquiera arrancó, la palabra es "próximo". Un número diminuto justo después de un logro es la única lectura que consigue que celebrar se sienta como quedar debiendo. Origen: el tercer nivel del fondo, que aparece al 3% en el momento exacto de cruzar la meta.

**R69 · Si una cifra necesita que el usuario haga una cuenta mental, está mal escrita:** aplica a toda la app. Los decimales de una unidad que nadie divide ("1,8 meses"), los porcentajes de una cantidad que no está a la vista ("ahorras el 23% de tus ingresos") y las etiquetas de sistema con dos puntos ("Compromiso: $250.000/mes") se reescriben como lo diría una persona: "1 mes y 3 semanas", "de cada $100 que recibes, guardas $23", "te propusiste guardar $250.000 cada mes". Origen: la cifra protagonista del fondo de emergencia estaba escrita en lenguaje de hoja de cálculo.

**R70 · Un concepto que agrupa tiene dirección propia:** si algo se llama "tu ahorro total", existe una pantalla Ahorro. Un encabezado no puede ser el único rastro de un nivel de la jerarquía: sin dirección no se puede visitar, ni volver a él, ni enlazarlo. Origen: "Tu ahorro total" era el resumen de una sección que Finko nunca construyó.

**R71 · Un bloque idéntico no se repite entre pantallas hermanas:** si el mismo contenido aparece en varias hijas, pertenece al padre. La repetición es la señal de que falta un nivel, no una decisión de composición. Origen: la card consolidada de ahorro, copiada en las cuatro secciones, 316px antes de que empezara el contenido propio de cada una.

**R72 · Un destino, un camino:** cuando existan varios, uno es el canónico y los demás son atajos declarados (mismo aspecto, misma etiqueta, ámbito acotado), no rutas paralelas con aspecto distinto. Origen: se llegaba a Metas por tres caminos que no se parecían entre sí (pestañas, enlaces "Ver" de 18px y el menú "Más").

**R73 · La taxonomía se enseña donde los términos conviven:** nunca en el estado vacío de cada categoría, que es la pantalla a la que se llega equivocado. Se enseña comparando, en el lugar donde se elige, y ahí cada opción lleva una línea de para qué sirve. Origen: el estado vacío de Metas remitía a Apartados y el de Apartados a Metas, porque no había ninguna pantalla donde los cuatro nombres se vieran juntos.

**R74 · Un resumen sirve para decidir sin entrar:** cada fila lleva su estado en la unidad de su sección (meses cubiertos, metas en curso, días al próximo cobro). Un resumen que solo suma pesos obliga a entrar en las cuatro secciones para saber cuál necesita atención, que es exactamente lo que venía a evitar. Origen: el consolidado de ahorro mostraba monto y porcentaje de cada bolsa, y nada sobre su estado.

**R65 · Lo que se enseña cambia cuando el usuario cambia:** una explicación que se repite para siempre deja de educar y pasa a ser ruido. Lo que enseña al mes uno estorba al mes doce, así que la pieza pedagógica se muestra en la etapa que la necesita y desaparece después. Origen: la definición de qué es un CDT, que en Inversión vive en el momento 1 (una sola inversión) y cede su lugar a la composición del portafolio en el momento 2.

**R24 · Región viva solo para respuesta:** `role="status"` y `aria-live` solo en la retroalimentación de una acción del usuario, nunca en contenido que se re-renderiza. Un lector de pantalla anuncia toda región viva que cambie, así que un contenido estático dentro de una lista que se repinta convierte cada acción en N anuncios. Origen: Apartados marcaba la sugerencia de aporte y el mensaje de "listo" de cada fila, más el aviso de proximidad: 5 regiones vivas con cuatro apartados, y registrar un solo aporte hacía que el lector leyera las sugerencias de todos, encima del anuncio real de `announce()`.

**R25 · Un umbral por concepto:** "próximo", "urgente" o "alto" se definen **una vez** en `logic` y lo consumen todos los que lo muestran. Dos umbrales para el mismo concepto es un defecto, no una decisión de diseño: el resumen y la lista se contradicen. Origen: en Apartados el aviso de proximidad entraba a 60 días y el badge de la fila solo a 30, así que un apartado a 45 días se contaba en "y 2 apartados más con fecha próxima" y su fila no mostraba ninguna señal de urgencia.

**R27 · Un dato, un lugar:** un resumen encima de una lista **suma, compara o proyecta**. Si repite lo que la primera fila ya dice, no va: el espacio más valioso de la pantalla no se gasta en un eco. Origen: el aviso de Apartados mostraba el apartado más urgente con su fecha y su aporte sugerido, y ese mismo apartado aparecía 60px más abajo con los mismos dos datos.

**R29 · Ninguna pantalla sin estilos:** toda clase que un módulo inyecte tiene reglas en `styles/`. Una pantalla que se ve con los defaults del navegador es un bug, no un pendiente, y la primera que ve el usuario es el peor sitio para tenerlo. Origen: las cinco clases `.onboarding__*` del wizard de bienvenida no tenían una sola regla en todo el proyecto (grep sobre `styles/`: cero coincidencias). Medido a 390px: el hero salía a 16px alineado a la izquierda, el título quedaba pegado al párrafo siguiente y la letra chica de privacidad medía lo mismo que el cuerpo.

**R30 · La barra dice dónde estás, siempre:** toda sección alcanzable tiene en la barra inferior un estado que la distingue de las demás. Un menú "Más" activo también **nombra** la sección donde estás, con su color de dominio. Origen: el botón "Más" no llevaba `data-section`, así que el mapeo de dominio no tenía de dónde tomar color y caía al acento genérico: estar en Inicio y estar en cualquiera de las diez secciones del menú daban los mismos tres valores medidos (color, tinte e indicador).

**R31 · La app se nombra una vez:** la marca aparece al menos en la pantalla de arranque. Sin barra superior fija: en móvil el alto es el recurso escaso, y un encabezado ya decidido no se deshace para hacerle sitio. Origen: `.sidebar__logo` es `display: none` bajo 1024px, así que en el teléfono ni la palabra "Finko" ni la marca "F" aparecían en ninguna pantalla, y en la PWA instalada no hay barra de direcciones ni título de pestaña que lo digan.

**R32 · Toda sección tiene entrada:** ninguna sección depende de un enlace dentro del contenido para existir, y menos de uno que puede estar oculto. Un "volver" es una comodidad, nunca la única vía. Origen: a Movimientos se llegaba solo por "Ver todo" de Actividad reciente, un enlace que vive en una celda que arranca `[hidden]` hasta que hay movimientos registrados: quien registraba su primer gasto no tenía por dónde ver el historial.

**R33 · Un encabezado, una anatomía:** teja de dominio + título en todas las secciones. Una excepción es válida solo si está decidida y escrita (Inicio lo está: IN.8d, [ADR 034](DECISIONS/034-inicio-v2.md) D8). Origen: Movimientos era la única sección sin teja y sin decisión detrás, contra doce que sí la llevan.

**R34 · Neutro se dibuja neutro:** cuando una decisión pide "sin alarma", el control no puede quedarse con el color por defecto si ese color significa algo. El neutro es un tono explícito (`--fk-text-muted`), no la ausencia de modificador. Origen: el [ADR 019](DECISIONS/019-limites-por-rol.md) pidió que Necesidades se viera neutra y el código cumplió la letra (`claseBarra = ''`), pero `.progress-bar` sin modificador cae a `--fk-section-accent, --fk-accent` y ninguna sección declara `data-dom` en su cuerpo: medido `rgb(31,209,148)`, el acento de marca. Así, el 90% de las necesidades consumidas se pintaba con el mismo verde con el que Ahorro celebra superar su meta, y las dos barras quedan una debajo de la otra.

**R35 · Todo consejo tiene puerta:** si la interfaz sugiere una acción sobre un elemento listado, ese elemento **es** el control que la ejecuta; y no se sugiere lo que el formulario de destino no puede hacer. Origen: Límites listaba "Domicilios · $42.000" y remataba con "Asígnales un límite para hacer seguimiento mensual", pero el selector del formulario recorría solo `CATEGORIAS_GASTO_USUARIO` y no incluía ninguna categoría creada por el usuario: el consejo era un callejón sin salida para cualquiera que hubiera creado una categoría propia en Gastos.

**R36 · Nada se recorta a medias:** un elemento con margen negativo necesita que su contenedor lo deje salir, y una caja de texto nunca es más baja que su caja de línea. Donde haya `overflow: hidden`, se verifica qué queda afuera. Origen: la pastilla de Registrar nacía 2px por encima del borde de la barra (`padding-top: 4px` contra `margin-top: -6px`) y dos `overflow: hidden` encadenados (`.sidebar` en `layout.css` y `.sidebar__nav` en `responsive.css`) se los comían: con `border-radius: 16px` el corte caía sobre las esquinas y las dejaba en filo recto, y la sombra de marca, que alcanza 10px por encima (blur 16 menos offset 6), se recortaba entera, así que el relieve nunca se renderizó. En el mismo slot, `flex: 1` dejaba la etiqueta en una caja de 11,17px para una línea de 14,17px: `scrollHeight` 18 contra `clientHeight` 11, y el trazo bajo de la "g" de "Registrar" desaparecía.

**R37 · El ícono no trabaja solo:** un glifo genérico (`+`, tres puntos) siempre lleva etiqueta de texto, con el **mismo peso** que sus vecinas, y su `aria-label` nombra lo que la acción ofrece, no su categoría. Origen: el slot central de la barra era el único cuyo ícono no nombra su dominio, y además el único con la etiqueta en peso normal, porque no entra al cálculo de `.active` que da `--fk-font-semibold` a la pestaña activa: el control más prominente de la app tenía la etiqueta tipográficamente más débil.

**R38 · El peso visual sigue al peso de la acción:** mover dinero real pesa más que crear un registro. Ningún control que mueva dinero es más discreto, más chico o más abajo del pliegue que uno que solo agrega una ficha. No implica volverlo primario: el primario de la sección sigue siendo uno solo (R11). Origen: "Transferir entre cuentas", el único control de Mis cuentas que mueve dinero de una cuenta a otra, era `btn-ghost btn-sm` de 165,5x36px sin borde ni ícono y nacía en 839,9px de una página de 2.136,9px, o sea 56px por debajo del pliegue de 784px, mientras "+ Cuenta", "+ Fijo" y "+ Puntual" eran tres primarios sobre el pliegue que solo abren un formulario.

**R41 · Un aviso avisa:** el ámbar y el rojo aparecen solo donde hay algo que atender. Ninguna clase de texto informativo lleva filete, fondo ni borde de estado: la caja de advertencia ya existe y se llama `.nudge`. Origen: `.analisis__hint`, el contexto neutro de Análisis (la UVT vigente, el promedio por día activo, el recordatorio de completar deudas sin saldo), rendía con `border-left: 2,5px rgb(255,184,46)`, el ámbar exacto de `--fk-warning`, en cuatro sitios que suman 258,8px; justo debajo, un `.nudge-medium` real usaba el mismo color para decir que un criterio de renta va en 84% de su tope, así que el aviso verdadero y los cuatro falsos se veían igual.

**R42 · Un rediseño llega hasta el contenido:** rediseñar el encabezado de un bloque sin rediseñar su cuerpo deja dos lenguajes visuales a la vista, y la frontera entre ellos no es una decisión de diseño: es dónde se detuvo la iniciativa. Si la fase se parte, el deferimiento se anota con el **alto medido** de lo que queda pendiente, para que la fase siguiente se pueda priorizar contra un número. Origen: el [ADR 038](DECISIONS/038-analisis-v2-visual.md) D5 convirtió el summary de los dos colapsables de Análisis en fila v2 y dejó su interior intacto: 1.175,8px de títulos de 18px con emoji y bloques sin superficie, detrás de una fila v2, a tres bloques de distancia de las cards de radio 24px de la misma pantalla.

**R45 · Todo bloque cuelga de un encabezado:** un rótulo que agrupa bloques es un encabezado, no un párrafo, y el título de un colapsable también. Ningún bloque de contenido queda fuera de la navegación por encabezados. El nivel lo da la jerarquía real (lo que cuelga de un rótulo baja un nivel), y el tamaño lo sigue dando la clase: cambiar la etiqueta no cambia el diseño. Origen: en Análisis, "A dónde va tu dinero" era un `<p>` con dos `h2` colgando debajo, y los títulos de los dos colapsables eran `<span>` dentro del `<summary>`: 2.379,4px de contenido, medidos con ambos abiertos, invisibles para quien navega por encabezados.

**R46 · Respuesta visible:** una acción que abre o cambia un panel mueve el foco a su encabezado (`tabindex="-1"`), que es lo que lo trae a pantalla y lo anuncia. Si el handler reemplaza el contenedor, el foco nunca queda en el body: vuelve al control equivalente del DOM nuevo. Origen: en Calendario, `renderAgenda()` pintaba el panel del día en 911,7px de una pantalla de 844px, sin mover scroll ni foco: tocar un día, que es LA interacción de la sección, no cambiaba nada de lo que se ve, y con teclado cada flecha de mes obligaba a tabular desde el principio de la sección.

**R47 · Lo vencido no se atenúa:** la atenuación por "pasado" solo aplica a elementos sin información pendiente. Ninguna señal informativa baja de 3:1 ni ningún texto de 4,5:1 por un `opacity` de estado. Origen: `.cal-day--past { opacity: .5 }` cubría el 77% del mes a fin de mes, incluidos los días con pagos vencidos: el número bajaba de 14,46:1 a 4,55:1 y los puntos de 5,64 / 4,98 / 6,36:1 a 2,39 / 2,14 / 2,52:1, así que la grilla pintaba como lo más tenue justo lo que la tarjeta de arriba anunciaba como urgente.

**R48 · Repintar también se anuncia:** un re-render que cambia el contenido (mes, filtro, periodo) llama a `announce()` con el estado nuevo y su conteo. Origen: `_prevMes`/`_nextMes` de Calendario reemplazaban el `innerHTML` entero sin anunciar nada, en un módulo que ya usa `announce()` al guardar, editar, eliminar y pagar.

**R52 · El envoltorio no oculta lo que envuelve:** `aria-hidden` en un contenedor anula el rol y la etiqueta de **todo** su contenido, así que un indicador con etiqueta propia nunca vive dentro de un ancestro oculto. Se marca decorativo el adorno, no el dato. Origen: el hero del fondo envolvía el anillo en `<div class="progress-ring-wrap" aria-hidden="true">` y dentro `progressRing()` emitía un SVG con `role="img"` y la etiqueta que el propio llamador había construido: el porcentaje de avance, que solo existe en el anillo, no se anunciaba nunca. De las cuatro llamadas a `progressRing()` en la app, tres pasaban un `ariaLabel` que su contenedor descartaba (fondo, metas, apartados) y solo Análisis lo hacía bien.

**R55 · El rol ARIA sigue al nivel del aviso:** nivel alto (exceso, déficit, vencido) es `role="alert"`; informativo y de refuerzo son `role="status"`. Un aviso cortés espera una pausa del lector, y el nivel alto aparece justo cuando el mes va mal. Origen: `_renderNudgeTasa` del fondo emitía `status` para los cinco niveles, incluido el que anuncia que los gastos del mes superan los ingresos. Tercera aparición del mismo patrón (Límites L7, Deudas), así que se fija como regla en vez de corregirse una cuarta vez.

**R39 · El texto que acompaña un gráfico lo explica:** la alternativa no visual de una barra o un anillo dice **lo que la barra dice**, con los mismos nombres y las mismas proporciones. Un dato distinto sobre el mismo objeto no es una alternativa (SC 1.4.11). Origen: la barra de composición del hero de Mis cuentas repartía el total por cuenta y el texto de abajo decía "4 cuentas · 1 billetera · efectivo", que cuenta cuentas y no dice cuánto tiene cada una; el comentario del propio CSS afirmaba que el resumen portaba la información real. Corolario medido en la misma corrección: si la diferencia entre segmentos se cifra en opacidad, cada paso se verifica contra el fondo real, no contra la intención. El piso de 0,55 que parecía suficiente rinde 2,65:1 sobre el hero de tesorería; el primer paso que alcanza el umbral no textual de 3:1 es 0,62.

---

## Fuentes

**Una sola fuente: Inter Variable**, self-hosted en `assets/fonts/inter-variable.woff2` (pesos 100-900 en un archivo, `font-display: swap`, cero peticiones externas: compatible con CSP `font-src 'self'` y el modo offline del SW).

- Los **montos** usan Inter con `font-variant-numeric: tabular-nums` (cifras tabulares), peso 600-700. No existe fuente monoespaciada: `--fk-font-mono` es un alias de `--fk-font-sans` (DM Mono se eliminó en el rediseño 2026, fase F1).

```css
font-family: var(--fk-font-sans);  /* Inter + fallbacks system-ui */
```

---

## Paleta de colores

### Marca

| Token | Oscuro (default) | Claro (`body.light-theme`) | Uso |
|---|---|---|---|
| `--fk-accent` | `#1fd194` | `#13b377` | CTA principal, valor positivo, dinero disponible |
| `--fk-accent-hover` | `#38dca6` | (hereda) | Estado hover del acento |
| `--fk-accent-subtle` | `rgba(31,209,148,0.12)` | `rgba(19,179,119,0.10)` | Fondo de chips y celdas accent |
| `--fk-accent-border` | `rgba(31,209,148,0.32)` | `rgba(19,179,119,0.28)` | Bordes de elementos accent |

### Fondos

| Token | Oscuro | Claro | Uso |
|---|---|---|---|
| `--fk-bg-base` | `#101218` | `#f6f7fa` | Fondo principal de la app |
| `--fk-bg-surface` | `#181b23` | `#ffffff` | Cards, sidebar, modales |
| `--fk-bg-elevated` | `#20242f` | `#eef1f8` | Cards dentro de cards, inputs |
| `--fk-bg-hover` | `rgba(255,255,255,0.04)` | `rgba(0,0,0,0.04)` | Hover de filas y botones ghost |
| `--fk-bg-active` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` | Estado presionado |
| `--fk-bg-glass` | `rgba(22,25,34,0.7)` | `rgba(255,255,255,0.75)` | Superficies translúcidas (topbar) |
| `--fk-bg-overlay` | `rgba(0,0,0,0.65)` | (hereda) | Fondo del overlay de modal |

### Texto

| Token | Uso |
|---|---|
| `--fk-text-primary` | Títulos, valores importantes (`#e9ebf3` oscuro / `#1a1d27` claro) |
| `--fk-text-secondary` | Párrafos, labels |
| `--fk-text-muted` | Texto de apoyo, placeholders (calibrado a AA sobre bg-base en ambos temas) |
| `--fk-text-disabled` | Deshabilitado (exento de WCAG; ver COL.2 en [BOARD.md](BOARD.md)) |
| `--fk-text-accent` | Texto verde (`#4bd99b` oscuro / `#006b3d` claro) |
| `--fk-text-on-accent` | Texto sobre botón de acento (`#08120d` oscuro / `#fff` claro) |

### Semánticos

| Token base | Oscuro | Claro | Uso |
|---|---|---|---|
| `--fk-success` | `#25cf86` | `#006b3d` | Pagado, positivo, logro. Desacoplado de la marca a propósito |
| `--fk-warning` | `#ffb82e` | `#a06800` | Pendiente, por vencer (claro: ver COL.1 en [BOARD.md](BOARD.md)) |
| `--fk-danger` | `#ff4757` | `#c0202f` | Vencido, error, incumplimiento. **No** se usa para el gasto normal (ver criterio de color abajo) |
| `--fk-info` | `#3d8aff` | `#1a5fd4` | Educativo, contexto neutral |
| `--fk-amber` | `#f59e0b` | (hereda) | Warning cálido (ej. duplicados en import) |

Cada semántico tiene par `--fk-{nombre}-bg` y `--fk-{nombre}-text`.

**Criterio semántico de color (ADR 019 + AUD.4):** verde = logro, ámbar = advertencia, rojo = incumplimiento. **Gastar no es incumplir:** los totales de gasto y las variaciones al alza van en neutro (`--fk-text-primary`), nunca en rojo. Bajar el gasto sí se celebra en verde.

### Colores por dominio (`--fk-dom-*`)

Reconocimiento visual inmediato de cada sección ([ADR 031](DECISIONS/031-identidad-de-color-por-seccion.md)). Croma armonizado: ningún hue grita más que el resto, y cada par vecino se separa por matiz **y** luminosidad (no solo saturación), para que siga siendo discriminable con daltonismo.

| Token | Oscuro (default) | Claro (`body.light-theme`, solo `-text`) | Sección |
|---|---|---|---|
| `--fk-dom-ingresos` | `#1fd194` | `-text: #13815b` | Ingresos (= acento de marca) |
| `--fk-dom-gastos` | `#ff8a5c` | `-text: #d13b00` | Gastos |
| `--fk-dom-compromisos` | `#ea5385` | `-text: #db1b5a` | Deudas (frambuesa; antes `#ff4757`, idéntico a `--fk-danger`) |
| `--fk-dom-tesoreria` | `#5b95f0` | `-text: #1a6bea` | Mis cuentas |
| `--fk-dom-metas` | `#9d73eb` | `-text: #844fe6` | Metas |
| `--fk-dom-analisis` | `#8f9bb3` | `-text: #627291` | Análisis (pizarra neutra; antes `#2fd2bf` turquesa) |
| `--fk-dom-presupuesto` | `#f3b740` | `-text: #98680a` | Límites de gasto |
| `--fk-dom-personales` | `#f06fc2` | `-text: #d41690` | Me deben |
| `--fk-dom-ahorro` | `#38c98c` | `-text: #238059` | Ahorro |
| `--fk-dom-inversion` | `#2fd2bf` | `-text: #1c7f74` | Inversión (turquesa; hereda el matiz que Análisis dejó libre; antes `#4db8d8`) |
| `--fk-dom-agenda` | `#7d8cf0` | `-text: #4f64eb` | Calendario (índigo, token nuevo) |

**Rampa de cada dominio (2 acompañantes, IV.1):**

- **`--fk-dom-X-bg`**: `color-mix(in srgb, var(--fk-dom-X) 12%, transparent)`. Mismo valor en ambos temas (a 12% compone bien sobre superficie oscura y clara). Fondo de tejas y celdas, donde el contenido encima es icono/glifo (umbral 3:1, WCAG 1.4.11).
- **`--fk-dom-X-text`**: variante segura como texto o UI significativa (glifos, dots, badges). En oscuro es igual a `--fk-dom-X` (ya pasa AA ahí). En claro se sobreescribe en `body.light-theme`: el valor crudo fallaba WCAG AA sobre blanco (varios por debajo de 2:1, ver tabla arriba).
- **Opacidad del fondo cuando lleva texto real encima (hallazgo IV.2a):** 12% + `-text` cae a 4.22-4.46:1 en tema claro para varios dominios (por debajo del 4.5:1 de WCAG 1.4.3). `.dom-badge--*` (texto real, no solo icono) usa 6% en vez de 12% (peor caso medido: 4.54:1). Regla: contenido de texto → ~6%; glifo/icono decorativo → 12-14% está bien.
- El token base `--fk-dom-X` se reserva para acentos decorativos (bordes finos, franjas) que ya van acompañados de icono/etiqueta y por eso quedan exentos del umbral de contraste no textual (SC 1.4.11).

### Degradado de identidad (`--fk-grad-identity`)

DV.2a ([ADR 033](DECISIONS/033-direccion-visual-premium.md) D2) tokeniza el degradado que 6 heroes ya copiaban a mano: `linear-gradient(160deg, color-mix(in srgb, var(--fk-section-color) var(--fk-grad-identity-stop), transparent), transparent 55%)`. Fórmula fija (ángulo, orden de capas, corte en 55%); cada superficie declara localmente:

- **`--fk-section-color`**: el token crudo de su dominio (`--fk-dom-X`), o `--fk-accent`/`--score-banda` en los dos heroes semánticos (`.hero-inicio`, `.score-hero`) que quedan fuera del mapeo `[data-dom]`.
- **`--fk-grad-identity-stop`**: la parada, **medida por superficie y sin unificar** (divergencia 14-16% conservada a propósito: `.hero-inicio`/`.score-hero` 14%, `.hero-gastos` 15%, `.hero-tesoreria`/`.hero-compromisos`/`.hero-agenda` 16%). Subir una parada ya medida a un valor común invalidaría su contraste sin necesidad.
- **`--fk-grad-identity`**: sí, otra vez, la línea completa de arriba. Limitación real de CSS (verificada en Chrome): un `var()` dentro del VALOR de una custom property se resuelve contra el elemento donde ESA property se declaró, no donde se consume. Declararla una sola vez en `:root` con `--fk-section-color`/`--fk-grad-identity-stop` adentro NO funciona para superficies que las redefinen: siempre leería el `:root`. La única forma que funciona en CSS puro es que las tres líneas vivan juntas, en el mismo selector, en cada superficie. `tokens.css` conserva la fórmula como referencia canónica, no como algo que se consuma con `var(--fk-grad-identity)` a secas.

**Uso permitido:** heroes de sección y superficies grandes de identidad, empty states. Máximo 2 paradas (ADR 031 D6). CTA primarios, fondos de página y filas de lista siguen planos. Si hay texto encima, se mide contra la parada más fuerte con WCAG real; texto coloreado (`-text`) encima exige bajar esa parada a ~6-8%.

**R6 · El acento no mide gasto** ([ADR 054](DECISIONS/054-el-acento-no-mide-gasto.md)): toda magnitud de gasto va en familia `--fk-dom-gastos` o en neutro; `--fk-accent` queda para dinero disponible, progreso y logro (principio 7). El chip que celebra una **bajada** sí va verde: es logro, no magnitud.

**R44 · La paleta de categorías no habla de dirección:** ningún color con significado de dirección de dinero (el verde de la marca, el rojo de peligro) se usa como color de categoría en un gráfico de distribución. Una dona reparte, no juzga. Y los porcentajes de un reparto suman 100: se calculan por resto mayor sobre el conjunto, no con un redondeo independiente por segmento. Origen: `PALETA_CATEGORIAS` asignaba `#00dc82` al índice 0 y `#ef4444` al 3, así que la categoría con más gasto salía siempre en el verde de la marca y desde la cuarta siempre había una roja, dos bloques debajo de la card donde IV.3 y ANL.2c acababan de re-declarar que subir el gasto no se pinta de rojo (ADR 019). En el mismo ejemplo la columna de porcentajes sumaba 99.

**R49 · El color nunca va solo:** toda distinción que cambie una decisión lleva forma o texto además del color (SC 1.4.1). La que no cambia ninguna decisión no necesita entrada propia ni forma propia. Origen: en la grilla de Calendario el tipo de evento se codificaba solo por el color de un punto de 5px, y dos de los cuatro eran rosados vecinos (234,83,133 y 240,111,194). La distinción que sí decide es una: entra dinero o sale dinero, así que el día de ingreso pasó a anillo y los pagos siguen como punto sólido; entidad contra personal se queda en color porque en la grilla las dos se pagan igual.

**R3 · Fondo y glifo nunca del mismo tono:** teja de dominio = fondo `color-mix(in srgb, var(--fk-dom-X) 14%, transparent)` + glifo `var(--fk-dom-X-text)`. Mismo tono en ambos deja el trazo invisible sobre su propio fondo. Un punto sólido sin dibujo (`.cal-dot--*`) puede compartirlo; un chip con icono, nunca.

### Nudges (5 niveles)

Tokens `--fk-nudge-{nivel}-{bg|border|accent}` construidos con `color-mix()` sobre los semánticos. Niveles: `critical` (danger), `high` (dom-gastos), `medium` (warning), `info` (info), `success` (success). Clases: `.nudge`, `.nudge-critical|high|medium|info|success`. Modificador `.nudge--veredicto` (CFG.2b): único caso con dos `.nudge__desc`, porque separa la conclusión del encuadre; solo aporta el margen entre ambos.

---

## Escala de espaciado (base 4px)

`--fk-space-1` (4px) · `-2` (8px) · `-3` (12px) · `-4` (16px) · `-5` (20px) · `-6` (24px) · `-8` (32px) · `-10` (40px) · `-12` (48px) · `-16` (64px) · `-20` (80px).

Alias t-shirt: `--fk-space-xs` (8px), `-sm` (12px), `-md` (16px), `-lg` (24px), `-xl` (32px).

---

## Escala tipográfica

| Token | rem | px | Uso |
|---|---|---|---|
| `--fk-text-xs` | 0.75 | 12 | Labels muy pequeñas, helpers |
| `--fk-text-sm` | 0.875 | 14 | Labels, botones, texto de soporte |
| `--fk-text-base` | 1 | 16 | Texto base del cuerpo |
| `--fk-text-lg` | 1.125 | 18 | Subtítulos, intros |
| `--fk-text-xl` | 1.25 | 20 | Títulos de sección pequeños |
| `--fk-text-2xl` | 1.5 | 24 | Títulos de sección |
| `--fk-text-3xl` | 1.875 | 30 | Valores monetarios grandes |
| `--fk-text-4xl` | 2.25 | 36 | Títulos hero, saldo principal |

Pesos: `--fk-font-light` (300) a `--fk-font-extrabold` (800). Altura de línea: `--fk-leading-tight` (1.25) a `--fk-leading-relaxed` (1.625). Existen alias `--fk-fs-*` y `--fk-fw-*`.

---

## Border radius

| Token | Valor | Uso |
|---|---|---|
| `--fk-radius-sm` | `6px` | Inputs, chips pequeños |
| `--fk-radius-md` | `10px` | Botones, tags |
| `--fk-radius-lg` | `16px` | Cards principales |
| `--fk-radius-xl` | `24px` | Celdas Bento, modales |
| `--fk-radius-full` | `9999px` | Pills, badges, avatares |

**Radio protagonista:** el bloque protagonista de una sección usa `--fk-radius-xl`; todo panel secundario, `--fk-radius-lg`. El hero de Inicio (24px) sobre paneles de 16px es intención, no deriva.

---

## Sombras y elevación

Elevación sutil, **sin glow neón** (el look "neón sobre negro" se retiró en el rediseño 2026). Escala semántica de 4 niveles (DV.2a, [ADR 033](DECISIONS/033-direccion-visual-premium.md) D1): cada superficie declara su nivel, no una sombra suelta.

| Nivel | Nombre | Fondo | Borde | Sombra | Ejemplos |
|---|---|---|---|---|---|
| 0 | Lienzo | `--fk-bg-base` | no | no | fondo de página, secciones |
| 1 | Reposo | `--fk-bg-surface` | `--fk-border-subtle` | `--fk-shadow-sm` | `.card`, `.bento__cell`, `.list-item` |
| 2 | Realce | `--fk-bg-elevated` | `--fk-border-default` | `--fk-shadow-md` | hover de card, dropdowns |
| 3 | Flotante | `--fk-bg-surface` | según pieza | `--fk-shadow-lg` | modales, toasts, sheets |

| Token | Uso |
|---|---|
| `--fk-shadow-sm` | Nivel 1, reposo |
| `--fk-shadow-md` | Nivel 2, hover/dropdowns |
| `--fk-shadow-lg` | Nivel 3, modales/overlays |
| `--fk-shadow-glow` | Anillo de acento fino (1.5px de borde accent + sombra suave); **no** es glow luminoso |

**El cambio real es el nivel 1:** en oscuro los escalones de fondo (`-base` → `-surface` → `-elevated`) ya comunican profundidad, así que la sombra en reposo es un refuerzo sutil. En claro el borde 1px no alcanzaba solo: `-sm`/`-md` van tintados hacia azul-tinta (`rgba(26,32,60,...)`) y en **doble capa** (una nítida de contacto + una ambiental difusa, mismo tinte) desde `themes.css`. `-lg` no cambia (sigue siendo una sola capa). Doble capa sigue siendo una pintura única por elemento: `box-shadow` transiciona solo en hover/focus, nunca en keyframes.

**Aire entre bloques (para las iniciativas v2):** separación entre bloques de una sección, `--fk-space-6` en móvil y `--fk-space-8` en escritorio. Es guía de composición para pantallas nuevas, no un cambio retroactivo del espaciado ya cerrado.

---

## Riqueza visual: decoración y patrón (DV.2b, [ADR 033](DECISIONS/033-direccion-visual-premium.md) D3)

Piloto acotado sobre el pipeline del [ADR 026](DECISIONS/026-biblioteca-de-recursos-graficos.md): dos recursos nuevos, presupuesto duro en ambos.

**Formas orgánicas (`assets/svg/decoracion/`, símbolos `d-*`).** Catálogo neutro compartido (curvas suaves, arcos, blobs), `fill="currentColor"`: el dominio la tiñe vía CSS, cero diseño por sección. Clase `.decor` (`styles/components/atoms.css`):

- `position: absolute`, `z-index: -1`, `pointer-events: none`, `opacity: 0.06` (rango permitido 4-8%).
- Modificadores de esquina: `.decor--top-right`, `.decor--bottom-right`.
- **El contenedor que la aloja necesita `overflow: hidden` propio y `isolation: isolate`** (contiene el z-index negativo a esa caja, evita que se fugue a otros elementos de la página).
- **Presupuesto: máximo 1 forma por pantalla.** Nunca debajo de un bloque de texto largo sin volver a medir contraste contra el compuesto.
- **Piloto actual (2 heroes):** `.hero-inicio` (`d-blob`, esquina superior derecha) y `.hero-tesoreria` (`d-onda`, esquina inferior derecha).

**Patrón de puntos (`--fk-pattern-dots`, `styles/tokens.css`).** CSS puro, sin asset: `radial-gradient` tokenizado. Clase `.pattern-dots` fija el `background-size` (16px). Reservado para empty states y onboarding, nunca fondos de página ni cards de contenido. **Piloto actual (2 empty states):** Metas y Deudas (`_renderEmptyState()` de sus vistas).

**Especificación técnica de `decoracion/`:** a diferencia de `iconos/`/`logos/`, no está atada a la retícula 24×24: cada forma declara su propio `viewBox` (el catálogo inicial usa 200×200) y `scripts/sync-sprite.py` lo preserva en el `<symbol>` generado. Detalle completo en `assets/svg/README.md` sección 2.3.

**Guardarraíles heredados del ADR (D6, aplican a toda pieza DV.2*):** ambos temas, WCAG AA con cálculo real, Lighthouse 100 + `pnpm perf` sin regresión, cero JS nuevo para color/decoración, lista prohibida vigente (`backdrop-filter`, blurs, degradados de 3+ paradas, `mix-blend-mode`, animaciones en bucle).

---

## Transiciones y movimiento

- `--fk-transition-fast` (120ms) · `-base` (200ms) · `-slow` (350ms), easing `cubic-bezier(0.4, 0, 0.2, 1)`.
- Animar solo `transform`/`opacity` (compositor), nunca layout.
- **Toda animación respeta `prefers-reduced-motion`.**
- El cambio de tema usa la técnica `.theme-transitioning` (crossfade de 280ms sobre ~30 contenedores acotados, no `*`, para no causar lag en móvil).

### Catálogo cerrado de animación (DV.2c, [ADR 033](DECISIONS/033-direccion-visual-premium.md) D4)

Doctrina, no lista de sugerencias: **agregar una animación nueva es agregarla a esta tabla con su propósito**. Sin fila propia, no se implementa.

- Toda animación responde una de dos preguntas: **"¿qué acaba de pasar?"** (feedback de una acción) o **"¿a dónde entré?"** (orientación). Si no responde ninguna, no entra.
- Duración: 150-250ms para micro-interacciones; 300-350ms es el techo, reservado para entrada de sección.
- Easing estándar: `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- Solo `transform` y `opacity` (compositor). Se ejecuta **una vez**: `animation-iteration-count: infinite` queda prohibido en todo `styles/`.
- Todo helper JS nuevo se auto-chequea contra `prefers-reduced-motion` (patrón de `countUp` en `infra/animate.js`); el llamador no repite el chequeo.

| Momento | Animación | Duración |
|---|---|---|
| Entrar a una sección | `sectionIn` | 300ms |
| Lista al renderizar | cascada acotada: `cardIn` en los primeros 6 `.list-item`, paso 35ms (DV.2c) | 200ms + cola ≤175ms |
| Registro guardado (toast) | `toastIn` / `toastOut` | 200ms |
| Registro guardado (fila) | resaltado de fila nueva: `.list-item--nuevo`, pseudo-elemento con tinte de dominio que se desvanece vía `opacity` (DV.2c) | 600ms |
| Progreso que avanza | `progress-fill` / `ring-fill` | según valor |
| Monto que cambia | `countUp` (`infra/animate.js`, reentrante) | 500ms |
| Completar meta / pagar deuda / logro | toast + confetti del dominio | vive en LG.2/[ADR 032](DECISIONS/032-logros-v2-niveles-y-habitos.md), no se duplica acá |
| Cambio de tema | View Transitions API (crossfade nativo, CFG.7); fallback `theme-transitioning` sin soporte/`reduced-motion` | 220ms / 280ms |

**Retiros (DV.2c):** `empty-orbit` y `empty-float` (bucles ambientales infinitos en los empty states) se retiraron: contradecían el veto de animaciones permanentes. El empty state gana personalidad por su ilustración estática, no por movimiento perpetuo.

---

## Iconografía

**Familia propia "Finko Icons"** ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md)), en migración por fases desde el híbrido emoji/SVG anterior:

- **Lenguaje:** línea sobre grid 24 (trazo 2, terminaciones redondeadas), **duotono** (la región "cuerpo" de la metáfora lleva `fill="currentColor" fill-opacity=".15"` como atributo del símbolo) y **punto de valor** (un círculo sólido r 1.2-1.6 integrado en la metáfora: la ventana de la casa, el día marcado, la moneda). Glifos utilitarios (x, chevron, edit, trash...) quedan monolínea sin duotono ni punto.
- **Sprite:** inline en `index.html` (`<symbol id="i-*">`, `currentColor`), consumido vía `icon('i-*')` de `infra/icons.js`. Los atributos `fill` atraviesan `<use>` sin CSS adicional, así que el duotono se tiñe solo con el color del contexto (nav activa, tarjetas de dominio, empty states).
- **Estado de migración:** navegación (ID.1) y resto de la UI estructural (ID.2) redibujadas; categorías con tinte por dominio quedan para ID.3 (ahí se retiran los catálogos de emoji y se actualiza el guardarraíl TX.4). Mientras tanto los **emojis** siguen en categorías de dominio, logros, celebraciones y tips, con su regla de consistencia vigente: la misma etiqueta compartida entre catálogos usa el mismo emoji en toda la app.
- **Iconos chicos:** `.icon--sm` (16px) para iconos en línea con texto xs/sm (subtítulos, badges, selectores de opción), evita que el `.icon` base (20px) domine una etiqueta pequeña.

### Escala de tamaños (tokens `--fk-icon-*`, 2026-07-05)

Todos los tamaños de icono salen de esta escala (definida en `styles/tokens.css`); ningún componente declara un tamaño suelto. El trazo efectivo de un icono de línea es `stroke × (tamaño / 24)`: por eso el piso es 16px (bajo eso el trazo baja de ~1.5px y pierde nitidez en pantallas 1x o de baja resolución).

| Token | Tamaño | Contexto |
|---|---|---|
| `--fk-icon-xs` | 16px | Inline con texto xs/sm: badges, hints, `.icon--sm`, volver de la hoja Registrar |
| `--fk-icon-sm` | 18px | Acciones secundarias de fila: editar, borrar |
| `--fk-icon-md` | 20px | Base (`.icon`): filas, formularios, cerrar modal, accesos rápidos, chips de vencidos |
| `--fk-icon-lg` | 24px | Navegación (sidebar y bottom-nav), FAB Registrar, ojo del hero, nudges SVG. Estándar Material 3 / Apple HIG |
| `--fk-icon-xl` | 28px | Launchers y heroes de sección: menú Más, chooser de estrategia, heroes de Ahorro/Inversión |
| `--fk-icon-2xl` | 32px | Tejas de la hoja Registrar, icono del hero de saldo |
| `--fk-icon-3xl` | 48px | Empty states y guías (`.icon--lg`) |

Tejas (contenedor redondeado del glifo de categoría o marca, glifo interno al ~62% del lado): `--fk-teja-md` 32px en superficies compactas (detalle del calendario, picker, hints) y `--fk-teja-lg` 36px en filas de lista, el contexto de reconocimiento primario.

Accesibilidad: bajo `prefers-contrast: more` el trazo de toda la familia sube un paso (2.35 → 2.6 en base; ver `styles/a11y.css`) conservando la jerarquía entre escalas.

---

## Componentes

### Botones

```html
<button class="btn btn-primary">Guardar</button>
<button class="btn btn-secondary">Cancelar</button>
<button class="btn btn-accent">Ver detalle</button>
<button class="btn btn-ghost">Ignorar</button>
<button class="btn btn-danger">Eliminar</button>

<!-- Tamaños -->
<button class="btn btn-primary btn-sm">Pequeño</button>
<button class="btn btn-primary btn-lg">Grande</button>

<!-- Icono -->
<button class="btn btn-icon btn-ghost" aria-label="Cerrar">✕</button>
```

**Regla de uso:** un solo `.btn-primary` visible por sección. Los demás deben ser secondary o ghost.

**R8 · Confirmar un movimiento de dinero no usa el acento.** Generalización del [ADR 036](DECISIONS/036-deudas-v2-visual.md) D6 ("un abono es un pago, no un ingreso"): el botón que **confirma** una salida de dinero viste su dominio (`--fk-dom-X` 12 % + borde 40 % + `-text`); el verde queda para el único primario, que es el que **crea**. Aplicada en Deudas (`.deuda-card__abonar`, `.estrategia-card__aplicar`). Extenderla a toda la app es una decisión abierta.

**R50 · Un CTA de dinero dice cuánto.** Una tarjeta o un botón que propone mover dinero muestra el monto **antes** de abrir el flujo, no dentro. Origen: la tarjeta de pago en lote de Calendario decía "5 pagos ya vencieron" y ofrecía "Pagar los 5"; los $601.800 solo aparecían dentro del modal, así que la decisión de entrar al flujo se tomaba sin el dato que la define y el usuario podía llegar al selector de cuenta sin saber si le alcanza. La cifra más cercana, "Falta $1.060.800" del hero, mezcla lo vencido con lo que aún no vence.

**R51 · Un vacío, un mensaje.** Una pantalla vacía dice **una vez** para qué sirve y **una vez** qué hacer. Extiende la regla de uso de arriba: un solo primario visible, y el bloque que sobra no se atenúa, se quita. Origen: Calendario en cero apilaba el banner de propósito, el hero "Sin pagos programados" y la card "Julio está despejado", tres bloques con el mismo mensaje, más dos `.btn-primary` simultáneos con el mismo texto ("+ Agregar gasto fijo").

**R53 · La salida no se confunde con la destrucción.** Una acción destructiva no ocupa la posición de Cancelar ni comparte su estilo: viste `.btn-danger` y vive en su propia fila (`.modal__footer-secundario`), separada por un filete. Cancelar está **siempre** presente. Origen: al editar el fondo de emergencia, "Desactivar fondo" reemplazaba a Cancelar con la misma clase `btn-ghost`, en la misma posición y con el mismo aspecto, en el lugar que en todos los demás formularios de Finko es la salida sin consecuencias; y al editar no había Cancelar, así que salir sin cambios solo se podía por la X de la cabecera. Había confirmación, pero el diseño pedía el error en vez de prevenirlo.

**R26 · Confirmación proporcional al daño.** Toda acción que borre o reinicie datos pasa por `confirmar()`, con el **monto y la consecuencia** en el mensaje; `peligroso: true` queda para las que destruyen, no para las que cierran un ciclo. Y su zona táctil nunca es menor que la de las acciones vecinas: la más destructiva no puede ser la más fácil de tocar por error. Origen: "Ya lo usé" en Apartados ponía $1.240.000 en cero y movía la fecha un año desde un `.btn-sm` de 78x36px sin preguntar, a 8px de una papelera de 44x44 que sí abría modal.

### Cards

```html
<div class="card">
  <div class="card__header">
    <span class="card__title">Saldo total</span>
    <span class="chip chip-success">+2.3%</span>
  </div>
  <p class="card__value">$4.850.000</p>
  <div class="card__footer">
    <span class="text-sm text-muted">Actualizado hoy</span>
    <button class="btn btn-ghost btn-sm">Ver</button>
  </div>
</div>
```

Jerarquía interna en 3 niveles (rediseño F3): primario (monto/progreso), secundario (contexto), terciario (metadata).

**R1 · Un solo encabezado de card:** sentence case, `--fk-text-sm` / `--fk-font-semibold`, `--fk-text-primary`, **sin icono dentro del `h2`**; contador opcional junto al título y un enlace de acción a la derecha. El label de grupo del bento conserva su uppercase 12/700: otro nivel, no otro patrón. Corolario: **un solo verbo por destino**.

**R5 · Panel sin scroll propio:** máximo 4 filas y, si hay más, una fila de salida de 44px ("Ver los N en ..."). En móvil la barra de scroll no se dibuja, así que un `overflow-y: auto` esconde ítems sin pista visual. El scroll es de la pantalla.

### Inputs

```html
<div class="form-group">
  <label class="label label-required" for="monto">Monto</label>
  <div class="input-group">
    <span class="input-prefix" aria-hidden="true">$</span>
    <input class="input input-money input--has-prefix"
           id="monto" type="number" min="0" placeholder="0" />
  </div>
  <span class="helper-text">En pesos colombianos (COP)</span>
</div>
```

Reglas móviles: inputs con `font-size` >= 16px (anti-zoom iOS), touch targets >= 44px.

**R4 · Los 44px táctiles aplican a todo control, sea o no `.btn`.** Fuera de esa clase nadie los verificaba: quedaban entre 18 y 40px. El recuadro **visual** queda libre, así que un diseño aprobado no se rompe: se expande solo la zona sensible con un `::after` centrado de 44px (ver `styles/responsive.css`). Corolario del criterio: **si el recuadro no lo fijó ninguna decisión, el control crece de verdad**; el `::after` es para los tamaños que sí están decididos (el ojo de los heros, la nav de mes). Un chip de filtro de 27,7px no tenía dueño: creció.

**R11 · El primer bloque de un formulario es el dato que el usuario vino a escribir.** Los atajos, las sugerencias y las ayudas van después, por útiles que sean. Origen: TX.12 insertó los chips de gasto frecuente antes del monto y el formulario más usado de la app dejó de abrir en su campo principal, contra lo que ya fijaba el [ADR 042](DECISIONS/042-formularios-v2-visual.md) D2, sin que nadie lo hubiera decidido.

### Chips y Badges

```html
<span class="chip chip-success">Pagado</span>
<span class="chip chip-warning">Pendiente</span>
<span class="chip chip-danger">Vencido</span>
<span class="chip chip-info">Info</span>
<span class="chip chip-accent">Activo</span>

<span class="badge">3</span>
<span class="badge badge-accent">12</span>
<span class="badge badge-warning">2</span>
```

**R7 · Estado terminal:** un elemento en estado final (saldado, cumplido, archivado) **apaga sus indicadores de futuro**: vencimientos, urgencias, cuentas regresivas, cuotas por pagar. El chip se calcula después de saber si el elemento sigue vivo, no antes, y el hueco se llena con el **cierre** (la fecha en que ocurrió). Origen: una deuda saldada decía "Saldada" en verde y "Vence hoy" en rojo a dos centímetros.

**R9 · Una barra de opciones no esconde opciones:** prohibido `overflow-x` con `scrollbar-width: none` en una barra de chips. O envuelve (`flex-wrap`), o muestra N y ofrece un "+M" que despliega el resto (patrón de R5, en horizontal). Origen: la barra de filtros de Gastos medía 792px de contenido dentro de 356px visibles, o sea el 55% de las categorías del mes fuera de vista, y en móvil no se dibuja ninguna barra de scroll: la única pista era que el cuarto chip aparecía cortado. Precio honesto de envolver: ~44px por fila extra.

**R22 · Un chip cabe o baja de línea:** un chip de estado nunca desborda ni tapa. Si no cabe en su columna, vive en su **propia línea** bajo el título y puede partir en dos (`white-space: normal`); `nowrap` solo con truncado explícito. Origen: el chip de Me deben iba dentro del `<p>` del nombre y "La fecha de pago pasó hace 3 semanas" (252px) cruzaba por debajo del botón, que lo tapaba: el estado más urgente producía el label más largo, así que cuanto peor la noticia, menos se leía.

**R40 · Un dato largo se corta:** todo texto que el usuario escribe (llave, alias, número de cuenta, nota, nombre) vive en un contenedor con `min-width: 0` y truncado explícito, y viaja en su **propio elemento**: un nodo de texto suelto dentro de un `inline-flex` no acepta `text-overflow`. Ningún chip usa `nowrap` sin elipsis. Es R22 llevada del chip de estado, cuyo texto lo escribe la app, al chip de dato, cuyo texto lo escribe el usuario y no tiene largo máximo. Origen: `_labelDatosTransferencia()` concatenaba los tres campos de MC.14 con "·" y el chip rendía 377,8px dentro de un contenedor de 222,7px: terminaba 38,3px por fuera de la tarjeta de 356,4px y su borde derecho (893,4) pasaba por debajo del grupo de acciones (izquierda en 746,4), o sea por debajo del lápiz y de la papelera.

### List Items

```html
<article class="list-item">
  <div class="list-item__icon" aria-hidden="true">🛒</div>
  <div class="list-item__content">
    <p class="list-item__title">Mercado del mes</p>
    <p class="list-item__subtitle">Alimentación · Hoy</p>
  </div>
  <span class="list-item__amount">$285.000</span>
</article>
```

Variantes reales: `.list-item__icon--cat` (ícono de categoría con chip de acento), `.list-item__meta`, `.list-item__action`, `.list-item__value`, `.list-item__progress-label`. Nota de color: los montos de gasto van en neutro, no en rojo (criterio AUD.4).

**R2 · Fila de obligación**, anatomía única en 2 líneas: teja 32px (`--fk-dom-X` al 14% + `-text`) · nombre 14/600 truncado · meta con `.dom-badge` y estado temporal · monto 14/700 tabular. En una línea el badge se come ~64px y trunca el nombre justo donde se decide qué pagar.

**R19 · El monto ancla es lo vigente:** la cifra destacada de una fila de dinero (`.list-item__amount`) es la que **decide hoy**: pendiente, saldo, cuota. El histórico acompaña debajo en secundario (`--fk-text-xs` + `--fk-text-muted`) y solo cuando hay movimientos que expliquen la diferencia. Nunca al revés. En móvil esa cifra vive en el **primer renglón** y las acciones bajan a su propio renglón: dos botones en el primer renglón dejan el cuerpo en ~112px y parten el nombre en dos líneas. Origen: Me deben anclaba lo prestado hace meses ($1.200.000) y dejaba lo pendiente ($858.500) en 12px gris al fondo de la tarjeta.

**R21 · Lo terminado no compite:** lo liquidado, completado o archivado se lista **después** de lo activo, sin desaparecer; el criterio de orden se aplica dentro de cada grupo. Origen: un préstamo liquidado, que no pide ninguna acción salvo borrar, se sentaba encima de uno activo por ser más antiguo. Corolario de contenedor: una lista separa sus ítems desde el contenedor (`display: flex` + `gap`), no desde el ítem.

**R56 · La fila de lista emite siempre su columna de monto:** `.list-item__meta` no es opcional ni decorativa: es la clase con la que `responsive.css` reconoce una fila de dinero y le da el layout móvil de dos renglones. Una fila que mete su monto dentro del subtítulo se queda sin esa protección y su cuerpo colapsa. Origen: Metas era la única sección cuya fila no emitía la columna; medido a 374px, el cuerpo recibía 51px de 315, el nombre se partía a mitad de palabra en 5 líneas, el subtítulo en 15 y la fila medía 506px de alto, mientras el comentario de la regla móvil afirmaba desde siempre cubrir "gastos, deudas, personales, metas". **Nota de mantenimiento:** el problema de fondo es que una regla de layout se protege con `:has()` sobre una clase que el componente puede o no emitir, así que cualquier vista nueva que la olvide reproduce el bug en silencio. Invertir la guarda (aplicar el grid a `.list-item` y exceptuar los casos que no lo quieren) toca cinco secciones y queda señalado, no decidido.

**R28 · La identidad vive en el slot del ícono:** el ícono que identifica el elemento va en el slot del ícono, no dentro del `<p>` del título (donde impide truncar limpio). Un slot **puede combinar** identidad y métrica (el anillo de progreso con el ícono al centro); no puede **reemplazar** la identidad por una métrica. Origen: Apartados era la única sección donde el emoji iba pegado al nombre y el slot lo ocupaba un "33%" que el subtítulo ya implicaba y el propio arco ya dibujaba.

### Barras y anillos de progreso

```html
<!-- Barra (gruesa, animada al entrar en viewport) -->
<div class="progress" role="progressbar"
     aria-valuenow="68" aria-valuemin="0" aria-valuemax="100"
     aria-label="Progreso de meta">
  <div class="progress-bar" style="width:68%"></div>
</div>
<!-- Estados: .progress-bar--near | --complete | --warn | --danger -->
```

Para el progreso protagonista (Metas, Apartados, Ahorro, Score) existe el **anillo SVG**: `.progress-ring` + `.progress-ring__track` + `.progress-ring__bar` + `.progress-ring__label` (envueltos en `.progress-ring-wrap`), generado desde `infra/svg.js`.

Cuando el progreso **es** la pantalla y no un ícono de fila, existe su hermano el **medidor semicircular**: `.progress-arc` + `.progress-arc__track` + `.progress-arc__bar` + `.progress-arc__label`, del mismo `infra/svg.js` y con el mismo `progress-ring-wrap` alrededor (comparten color, `pathLength="100"` y keyframe de llenado). Deja el centro libre para el ícono de lo que se persigue, sobrepuesto por CSS. Hoy lo usa Metas (DIS.14).

**R59 · El objetivo no compite con lo acumulado:** en una bolsa con meta, la única cifra grande es la que el usuario ya logró. El objetivo se dibuja como **extremo de la escala** del indicador, no como segundo número al lado del primero. "$1.200.000 / $3.500.000" enfrenta dos cifras y la mayor es la de lo que falta, así que la pantalla que debería celebrar avance mide carencia. Origen: la tarjeta de meta antes de DIS.14, donde el mismo progreso se decía tres veces (anillo, par de montos y línea "Falta") y ninguna mandaba.

**R54 · Un gráfico necesita ancho garantizado:** un indicador proporcional no se dibuja en el sobrante de un grid. Si su pista depende del largo de un texto vecino, deja de ser comparable entre filas y puede invertir el orden real. Origen: `.ahorro-total__item` repartía la fila en `minmax(7rem, auto) 1fr auto auto` y la barra era la columna elástica: medido a 390px, las cuatro pistas salían de 13, 35, 48 y 52px, así que el relleno del 16% (8px) se dibujaba más largo que el del 51% (7px). La barra que existe para mostrar la proporción mostraba lo contrario.

**R43 · Un gráfico no se estira:** nada de `preserveAspectRatio="none"` sin defender el trazo. El viewBox se genera cerca del tamaño real en que va a rendir y el trazo lleva `vector-effect="non-scaling-stroke"`; un marcador circular se dibuja como punto de trazo con tapa redonda, no como `<circle>` relleno, que se deforma en elipse. Origen: la sparkline de Análisis se generaba con `width: 600` y rendía en 322,7px, una anisotropía de 1,86:1: el `stroke-width: 2` salía de 1,08px en los tramos horizontales y de 2px en los verticales, así que la línea se veía más delgada donde la tendencia es plana, una lectura falsa en el único gráfico cuyo trabajo es mostrar forma. Corregido: viewBox 360 (residuo 1,11:1 medido) más `non-scaling-stroke`.

### Empty State

```html
<div class="empty-state">
  <div class="empty-state__icon" aria-hidden="true">💸</div>
  <h3 class="empty-state__title">Aún no hay gastos</h3>
  <p class="empty-state__desc">Registra tu primer gasto para empezar.</p>
  <p class="empty-state__tip">Tip: usa "Anotar un gasto" desde Inicio.</p>
  <button class="btn btn-primary">+ Agregar gasto</button>
</div>
```

Los empty states del rediseño F7 usan ilustraciones SVG geométricas inline (`emptyArt()` de `infra/icons.js`).

---

## Bento Grid

Layout del Inicio (`#sec-dash`). CSS Grid de 12 columnas.

```html
<div class="bento" role="region" aria-label="Inicio">

  <!-- Celda grande: 8 cols × 2 filas -->
  <article class="bento__cell bento__cell--wide bento__cell--tall bento__cell--accent">
    <p class="bento__label">Tu dinero disponible hoy</p>
    <p class="bento__value bento__value--accent bento__value--xl">$2.485.000</p>
    <p class="bento__desc">efectivo + cuentas bancarias</p>
  </article>

  <!-- Celda pequeña: 4 cols × 1 fila -->
  <article class="bento__cell">
    <p class="bento__label">Gastos del mes</p>
    <p class="bento__value">$985.400</p>
  </article>

</div>
```

| Clase | Columnas | Filas |
|---|---|---|
| `.bento__cell` (base) | 4 | 1 |
| `.bento__cell--wide` | 8 | 1 |
| `.bento__cell--full` | 12 | 1 |
| `+ .bento__cell--tall` | - | 2 |

Responsive: 12 cols (> 1024px) → 6 cols (768-1023px) → 1 col (< 768px).

---

## Capas CSS (`@layer`)

Orden de precedencia (menor → mayor):

```
reset → base → tokens → layout → components → modals → themes → a11y → responsive → utils
```

`styles/components.css` es un barrel que importa los 8 sub-módulos de `styles/components/` (atoms, buttons, forms, domain, analysis, charts, config, nudges).

**Reglas:** cada archivo CSS vive en su capa. Nunca agregar reglas directamente en `main.css` (solo `@import` + `@font-face`; los `@font-face` van al final porque un `@import` después de otra regla se descarta).

**R23 · Una clase, un dueño:** ninguna clase se declara en dos archivos de componentes. Si dos conceptos quieren el mismo nombre, uno cambia de nombre: el orden de los `@import` de `components.css` no es una decisión de diseño y nadie lo revisa al agregar una regla. Origen: `.badge` es una pastilla de estado en `forms.css` y un contador rojo de notificación en `atoms.css`; como atoms se importa después, el badge "19 días" de Apartados imprimía `--fk-danger` con la geometría de un contador de dos dígitos, cuando el código pedía `--fk-warning`. **Corolario de capa:** una corrección que compita con una regla de `responsive.css` va en `responsive.css`, porque esa capa gana por orden sin importar la especificidad. **Corolario de archivo:** tampoco se declara dos veces dentro del **mismo** archivo. Con igual capa y especificidad, la segunda declaración solo gana en las propiedades que enumera y el resto de la primera sobrevive sin que nadie lo lea así: `.analisis__hint` estaba escrita en la línea 34 como caja con filete ámbar y en la 1492 como texto suelto, y lo que rendía era texto suelto **con** el filete.

---

## Modo claro / oscuro

El modo oscuro es el **default** (tokens en `:root` de `tokens.css`).
El modo claro se activa con `body.light-theme`, que sobrescribe tokens en `themes.css`.

- En claro, el acento se oscurece (`#13b377`) y los interactivos van a verde bosque (`#006b3d`) para garantizar contraste AA sobre blanco.
- Toda clase nueva debe funcionar en ambos temas (probar los dos antes de commitear).
- Breakpoints responsive: 1440 / 1024 / 768 / 480 / 360 px, con tipografía fluida (`clamp`).
