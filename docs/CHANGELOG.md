# Changelog - Finko Claude

> Revisado: 2026-10-27.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-10)

### feat(nino): APR.5a, Tino reemplaza a Frai · 2026-10-27

[ADR 095](DECISIONS/095-tino-en-el-sprite.md), acota el [ADR 094](DECISIONS/094-tino-el-guatin.md) D3 y D4; ficha [`contexto/nino.md`](contexto/nino.md). SW v614.

- **Los dibujos entran como llegaron, convertidos fuera del repo.** El export de Image Trace pesaba 34 a 52 KB por pose, con 60 a 90 colores y un lienzo que el sync rechaza; queda en 11 a 15,5 KB, con once roles `--fk-tino-*`, y se ve casi igual de 72 a 128 px. Llegar a los 3 KB del 094 pedía redibujar las cinco poses.
- **El contraste se mide sobre el pelo**, que dibuja la silueta: en oscuro el pelo y su sombra se aclaran (3,5:1 sobre el lienzo). El contorno no llega a 3:1 en oscuro, y aclararlo invertía la cara.
- **Celebra grande en la unidad terminada**, junto a la insignia; la lección suelta sigue con "celebra".
- **Tino se presenta** ("Soy Tino, un guatín.") en el globo de Inicio mientras el niño no tiene nada hecho ni sabido.
- **Frai se retira entero**: sus cuatro SVG, `--fk-kid-frai`, `.frai` (con el trazo grueso bajo 40 px, que Tino no necesita: su tamaño mínimo es 72) y `htmlFrai`/`POSES_FRAI`. `index.html` sube de 189 KB a 241 KB (19 KB más con gzip), también para el adulto.

### docs(nino): ADR 094, Tino el guatín reemplaza a Frai · 2026-10-25

[ADR 094](DECISIONS/094-tino-el-guatin.md), acota el [ADR 093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md) D7; ficha [`contexto/nino.md`](contexto/nino.md). SW v613.

- **El personaje del niño es Tino, un guatín**, decisión de Esteban: guarda semillas para la escasez y la semilla enterrada se vuelve árbol. Su metáfora cubre ahorrar, reservar, crecer y compartir; la del frailejón, solo guardar y esperar. Se cuenta como "sembrar", nunca como "olvidar".
- **Tino es a color, con tokens por rol**: acota el "un solo color" del 093 D7. El tono de cada pose pasa al panel que lo rodea.
- **Pedido de dibujos en dos rondas**: cinco poses para reemplazar a Frai (APR.5a) y seis para lo que faltaba, incluidos los hitos del niño que el handoff pedía (APR.5b). Fuera quedan tristeza, enojo, señal de prohibido, cerdito y escenas del adulto.
- **Ya cambian tres lecciones**: k1-l3, k4-l1 y k7-l1 cuentan la semilla en tercera persona ("el guatín"), ciertas con el dibujo de hoy y con el de Tino. La única etiqueta que llamaba Frai al dibujo deja de nombrarlo. El código conserva los nombres de Frai hasta APR.5a.

### feat(logros): ficha 17 de la auditoría móvil, los encargos llevan y la vitrina se parte · 2026-10-25

MOV.1 ficha 17 (Logros), sin ADR: no cambia ninguna decisión vigente. Ficha: [`contexto/logros.md`](contexto/logros.md). SW v612.

- **Llegó con dos de sus cuatro cambios ya hechos, y se verificó antes de tocar nada.** G1 (el resumen contaba el catálogo y no lo dibujado) lo cerró MOV.20a con `conteoVitrina()`; G2 (el último nivel pedía más logros de los que hay) lo cerró LG.2e con el tramo en 16, más alcanzable que el 17 que proponía. Su premisa de ubicación tampoco rige: la vitrina dejó Ajustes (LG.2d) y hoy es "Lo que haces" en Tu progreso (APR.1d).
- **G3, cada encargo lleva a donde se cumple**: el `hint` de ocho logros enlaza su sección con el rótulo vigente (Gastos, Por pagar, Mis cuentas, Metas, Límites, Me deben, Fondo de emergencia). "Deuda bajo control" ahora dice dónde y el del fondo deja de nombrar "la sección Ahorros". El destino vive en el catálogo (`ir`) y un test exige que la sección exista y que su rótulo esté en el texto.
- **G4, "Te falta" arriba y "Ya los tienes" abajo**, con el orden del catálogo dentro de cada grupo. La ficha se contradice: el prototipo y su nota ("5 de 11, se puede verificar con el dedo") ponen la familia con un nivel en "Ya los tienes", y una frase de la prosa la deja arriba. Ganó el prototipo, que es lo que G1 defiende: "X de Y" es el tamaño de ese grupo, con un solo criterio (`partirVitrina()` y `conteoVitrina()`).
- **H9, encargo de la ficha 03**: el aviso de desbloqueo trae "Ver tu progreso", salvo que ya estés ahí. La ficha 17 no lo trató y declaró el aviso intocable; el enlace no cambia su tiempo ni su cola, y el foco ahora lo pausa igual que el cursor.
- **A la ficha 18**: R91 candidata (todo umbral que la interfaz anuncia debe ser alcanzable: "Momento 2 de 3" en Inversión y "Leyenda del ahorro", este ya cerrado), R86 con su séptima aparición, R88 en su tercer caso, R89a en el séptimo y los nombres de nivel provisionales visibles en pantalla.

### feat(nino): APR.4b, el niño en tableta y escritorio · 2026-10-25

[ADR 093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md) y [ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) D2, diseños 32 y 34; ficha [`contexto/nino.md`](contexto/nino.md). SW v611.

- **Desde 768 px la barra del niño es un riel a la izquierda**, con su dibujo arriba y "Cambiar" al pie; el contenido gana ancho. En el teléfono la barra sigue abajo y "Cambiar" sigue en Inicio y en Yo.
- **Desde 1024 px, Inicio va en dos columnas**: el saludo y la lección que sigue a la izquierda; la alcancía con sus tres frascos y la meta a la derecha. Los frascos ya venían en la pantalla Alcancía; Inicio los muestra solo en escritorio, donde reemplazan la lista corta.
- **El adulto cambia de perfil desde el pie de la barra lateral** cuando hay perfiles de niño: sus iniciales, su nombre y "Cambiar de perfil" llevan a "¿Quién usa Finko?". Sin niños no aparece.

### feat(aprende): APR.4a, Aprende y la lección en escritorio · 2026-10-25

[ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) D2 y D7, diseños 32 y 33; ficha [`contexto/aprende.md`](contexto/aprende.md). SW v610.

- **La ruta en dos columnas desde 1024 px**: tocar una lección la elige, no la abre, y su detalle se ve al lado: "Lección N · M minutos", "Vas a aprender", los tipos de ejercicio, "Termina en" y "Empezar lección", el único primario (el botón de la unidad no se pinta en escritorio). "Ya lo sabes" y "Después" pasan a dos columnas. En móvil la ruta no cambia.
- **"Vas a aprender" es contenido**: las 32 lecciones del adulto suman `aprendes`, dos o tres frases con un test de largo. Viaja con la unidad (`import()`, D11), así que el detalle se pinta primero sin viñetas. Los tipos de ejercicio se derivan de los pasos. Entran a la revisión pedagógica pendiente de APR.2c.
- **La lección en escritorio**: barra de lado a lado con "Salir · tu avance se guarda" escrito; en las preguntas, la respuesta se ve a la derecha de la pregunta en vez de subir desde el pie.
- **Ordenar pasos se arrastra** por su asa, como pide el ADR 092 ("arrastre y flechas"); las flechas siguen siendo la alternativa con teclado. Ícono `i-grip` nuevo en la biblioteca.
- **Repintar la ruta devuelve el foco** al botón que lo tenía: el contenido del detalle llega después del toque y sacaba al usuario de la fila elegida (lo encontró el E2E).

### feat(nino): APR.3f, las unidades 2 a 8 del niño y su ubicación · 2026-10-25

[ADR 093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md) D6 y D9; ficha [`contexto/nino.md`](contexto/nino.md). SW v609.

- **La ruta del niño completa**: lo que necesito y lo que quiero (con el clasificar de dos botones del diseño), mi alcancía y mi meta, ahorrar poco a poco, gastar con un plan, compartir y ayudar, guardar para lo que no esperas y por qué crece mi dinero (el premio por ahorrar como interés que se ve). Tres lecciones por unidad, cada una cierra con "Úsalo de verdad".
- **Voz del niño medida**: un test exige frases de hasta 10 palabras en todo el contenido del niño, tarjetas incluidas.
- **Desde los 10 años, tres preguntas antes de empezar** (D9): Inicio y Aprender las ofrecen una vez; lo que responde bien queda como "Ya lo sabes", cuenta como hecho en la ruta en orden y es insignia en "Yo". De 7 a 9 años la ruta empieza en la unidad 1. "Prefiero empezar desde la unidad 1" también vale para el niño.
- **Falta la revisión pedagógica** de las ocho unidades del niño, como las del adulto: es la aceptación de APR.3f.

### feat(nino): APR.3e, el tutor en Ajustes, Familia · 2026-10-25

[ADR 093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md) D2 a D4; fichas [`contexto/nino.md`](contexto/nino.md) y [`contexto/gastos.md`](contexto/gastos.md). SW v608.

- **Alta en dos pasos**: después de quién es el niño, su mesada: cuánto, cada semana, cada 15 días o cada mes, qué día, el reparto en los tres frascos (por defecto la mitad a Ahorrar), si puede mover entre frascos y si se anota como gasto tuyo y de qué cuenta. Se puede dejar para después.
- **"Entregada" es un solo hecho** (091 R-HF1): entran los frascos del niño según su reparto y Gastos anota un gasto tuyo en la categoría nueva **Familia**, que descuenta la cuenta elegida. El gasto lleva `origen` (mesada o premio y de qué niño). Solo se entrega la mesada que toca, una vez.
- **Premio por ahorrar**: $1 por cada $20, $1 por cada $10 (por defecto) o $2 por cada $10, con el resultado de hoy y la fecha de pago antes de activarlo (R50). Se calcula sobre lo que el niño guardó todo el mes; si sacó, sobre lo que quedó. El tutor lo suma el mes siguiente y también queda como gasto Familia.
- **Progreso del niño** para el tutor: mesada (con "Entregada" cuando toca), unidades, alcancía, meta, premio y lo que hizo esta semana ("Gastó $3.000 en un helado"), con "Entrar como".
- **El niño ve su mesada y su premio** en la alcancía ("Papá te suma $1 por cada $10. El 1 de noviembre recibes $2.700 más.").
- **Los avisos del perfil niño** van sobre su barra, no encima.

### feat(nino): APR.3d, la alcancía y la meta del niño · 2026-10-25

[ADR 093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md) D3 y D9; ficha [`contexto/nino.md`](contexto/nino.md). SW v607.

- **Tres frascos que se anotan**: "Guardé" entra al frasco que elija (Ahorrar por defecto), "Gasté" sale de Gastar y "Compartí" de Compartir, con montos rápidos y una nota. No deja sacar más de lo que hay y lo dice en la voz del niño. Mover entre frascos está activo por defecto; el tutor podrá apagarlo (APR.3e). Finko no mueve dinero: solo lo anota (D3).
- **Cada frasco se llena contra lo suyo** (R60): Ahorrar contra la meta, Gastar y Compartir contra lo que les toca de la mesada.
- **Una meta a la vez**: dibujo, nombre, precio y cuánto guarda cada semana; la pantalla responde mientras elige ("Lo tendrás en 8 semanas. Para el 19 de diciembre."). En Inicio y en Alcancía, la meta con su barra y lo que falta; lograda, "Lo compré".
- **En oscuro, el papel de los dibujos va un paso más oscuro que el contorno**: con los dos iguales, como venían del diseño, el balón era un círculo blanco. Un test exige que se distingan en los dos temas.

### feat(nino): APR.3c, la app del niño y su ruta · 2026-10-25

[ADR 093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md) D7 y D9; ficha [`contexto/nino.md`](contexto/nino.md). SW v606.

- **Barra propia**: Inicio, Aprender, Alcancía y Yo. Son pantallas de la app del niño, no rutas del hash: el router del adulto no las conoce.
- **Inicio**: Frai saluda y ofrece la lección que sigue con su duración. **Aprender**: ocho unidades en orden; la actual muestra su camino (hechas para repasar, la de hoy con "Empezar" y Frai al lado, las que vienen). Una unidad sin contenido detiene la ruta en vez de saltarla. **Alcancía**: el total y los tres frascos, por ahora de lectura. **Yo**: una insignia por unidad terminada y "Cambiar de perfil".
- **La lección del niño** usa el mismo motor con su piel: Frai explica en un globo, anima tras un error ("¡Casi!", "Esta era", "Sigamos") y celebra. El avance se guarda en su perfil, nunca en el del adulto.
- **Celebración**: insignia de 88 px con Frai y ocho destellos al terminar la unidad, y "Úsalo de verdad", una pregunta sobre un frasco con lo que tiene ahí.
- **Unidad 1, "¿Qué es el dinero?"**, con tres lecciones en la voz del niño (frases de hasta 10 palabras, lo exige un test). Las siete restantes llegan con APR.3f.

### feat(nino): APR.3a, perfiles en el dispositivo · 2026-10-25

[ADR 093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md) D1, D2 y P1; ficha nueva [`contexto/nino.md`](contexto/nino.md). Schema v48, SW v605.

- **"¿Quién usa Finko?"**: con niños en el teléfono, Finko abre ahí en vez del candado. El adulto entra con su PIN; cada niño, con su dibujo y su edad. De adulto a niño es libre; de niño a adulto se pide el PIN. La app cambia de piel con el fundido del tema (`body.kid`) y el adulto desaparece.
- **Familia en Ajustes**: agregar un niño (nombre, edad de 7 a 12, su dibujo y cómo te nombra), "Entrar como" y eliminar su perfil con PIN. Sin candado, el alta lo crea antes de guardar al primer niño; con niños, el candado ya no se puede quitar.
- **"Olvidé mi PIN" con niños (P1)** pide escribir BORRAR y avisa que también borra sus perfiles; sin niños queda igual que antes (lo exige un test).
- **Lo que ve el niño**, por ahora: el saludo de Frai y "Cambiar de perfil". Su barra, ruta y alcancía llegan en las rebanadas que siguen.
- **El aviso de un logro nuevo del adulto** ya no se ve detrás del candado ni del selector.

### feat(nino): APR.3b, el sistema visual del niño · 2026-10-25

[ADR 093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md) D5, D7 y D8. Primera rebanada de la Fase 3; va antes que APR.3a porque el alta del niño y "¿Quién usa Finko?" usan sus dibujos. Todavía no se ve en la app: lo usan las rebanadas que siguen. SW v604.

- **Modo niño como clase**: `body.kid` y `body.light-theme.kid` cambian el lienzo y suman `--fk-kid-*` (primario con canto, Frai, sol, "casi" y los tres frascos) sin tocar ningún token adulto. Escala de forma, tamaño y tipografía en `tokens.css`. Un test mide el AA de cada par en los dos temas.
- **Frai en cuatro poses y el catálogo de dibujos** entran al sprite por el pipeline `il-`: saluda, explica, celebra y anima; balón, libro, bicicleta, tenis, cometa, colores, audífonos, patineta y el frasco. Se hornearon a coordenadas absolutas y roles de color para cumplir el estándar.
- **Piezas base** en `styles/components/nino.css` (títulos, tarjeta, botón con canto y `kidPress`, Frai, dibujos, frasco y destellos) y `infra/ilustraciones.js` (dibujo, Frai, frasco que se llena contra su propia meta y destellos).
- **Test intermitente de `confirmarPin` resuelto**: esperaba un solo tick a que `crypto.subtle` terminara; ahora espera el mensaje.

### feat(aprende): APR.2b, la prueba de ubicación · 2026-10-24

[ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) D9; ficha [`contexto/aprende.md`](contexto/aprende.md). Cierra la Fase 2 del adulto. Schema v47, SW v603.

- **Cuatro preguntas, una por unidad de la 1 a la 4**, con "Todavía no lo sé" como respuesta válida. Nada vuelve al final: la prueba ubica, no enseña. Equivocarte o no saber dice en qué unidad se aprende.
- **El resultado dice dónde empiezas** ("Empiezas en la unidad 3"): lo que respondiste bien queda como "Ya lo sabes", sigue abierto para repasar y cuenta en Tu progreso. "Prefiero empezar desde la unidad 1" deshace lo marcado.
- **Solo al empezar**: la ruta la ofrece debajo de la lección recomendada mientras no hayas hecho, sabido ni empezado nada, y una sola vez (`S.aprende.ubicacion`, la fecha en que la hiciste).

### feat(aprende): APR.2a, la sección ofrece su lección · 2026-10-24

[ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) D6; fichas [`contexto/aprende.md`](contexto/aprende.md) y [`contexto/ahorro.md`](contexto/ahorro.md). SW v602.

- **Fondo ofrece "¿Cuánto es suficiente para ti?"** en una fila bajo la tarjeta y sus acciones, que no cambian (ADR 084 y 049 D2), con un dato tuyo: "Con tus gastos fijos, 3 meses son $X y 6 meses, $Y". Sin gastos fijos, o con el saldo oculto, la fila no muestra cifras.
- **Hecha la lección, la fila baja al pie** como una fila corta de "Repasar" y deja libre la primera pantalla (R65).
- **Sin import cruzado (ADN 10)**: Fondo deja dos huecos en su tarjeta y avisa con el evento nuevo `seccion:pintada`; Aprende los llena. Sumar otra sección es una entrada en `OFERTAS_DE_SECCION` y sus dos huecos.

### feat(aprende): APR.2c, las unidades 7, 8 y 9 · 2026-10-24

[ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) D8; ficha [`contexto/aprende.md`](contexto/aprende.md). Cierra el contenido de la ruta del adulto. SW v601.

- **Unidad 7, Crédito e intereses**: tasa al mes y tasa al año, la tarjeta de crédito (elegir y clasificar), menos cuotas, menos intereses (control con lo que pides y las cuotas) y un repaso. Su Aplícalo dice lo que te cobran tus deudas este mes, en Por pagar.
- **Unidad 8, Invertir: CDT y regla del 72**: ahorrar e invertir no son lo mismo, el CDT, interés compuesto y la regla del 72 (dos controles). Su Aplícalo suma lo que tienes invertido y en cuánto se duplicaría cada inversión, en Inversión.
- **Unidad 9, Impuestos: 4x1000 y renta**: el 4x1000, la cuenta exenta y si tienes que declarar renta. Las cifras del año (exento del 4x1000, tope de ingresos) salen de `core/constants.js` por marcadores, nunca escritas a mano (ADN 12); un test exige que todo marcador sea uno que la vista sabe llenar.
- **Ruta completa**: las nueve unidades tienen contenido. Con todas hechas, la ruta lo dice ("Terminaste las 9 unidades") en vez de prometer unidades en preparación.

### feat(aprende): APR.2c, las unidades 5 y 6 · 2026-10-24

[ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) D8; ficha [`contexto/aprende.md`](contexto/aprende.md). SW v600.

- **Unidad 5, Metas y reservas**: una meta con nombre, precio y fecha, cuánto guardar cada mes (control con el precio y los meses) y reservas para lo que sabes que viene. Su Aplícalo lee tus metas y dice cuánto te falta y cuánto guardar al mes, en Metas.
- **Unidad 6, Deudas y gota a gota**: lo que de verdad cuesta una deuda, avalancha o bola de nieve y por qué el gota a gota es tan peligroso (control con lo que te prestan). Su Aplícalo suma tus deudas, tus cuotas y lo que te cobran de intereses, en Por pagar. Tono informativo y sin enlazar líneas de ayuda mientras no estén verificadas con fecha (ADR 092, dudas).

### feat(aprende): APR.2c, las unidades 1 y 2 · 2026-10-24

[ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) D8; ficha [`contexto/aprende.md`](contexto/aprende.md). SW v599.

- **Unidad 1, Tu dinero hoy**: cuánto tienes de verdad, dónde está tu dinero y lo que entra y lo que sale (control de dinero libre por día). Su Aplícalo suma tus cuentas y descuenta lo comprometido del mes, en Mis cuentas.
- **Unidad 2, Repartir tu ingreso**: la regla 50/30/20 (control con tu ingreso), necesidad o gusto (clasificar) y págate primero (ordenar). Su Aplícalo reparte tu ingreso del mes, en Repartir ingreso.
- **La ruta empieza en la unidad 1**: es la primera con contenido, así que "vas aquí" y "Tu siguiente paso" arrancan ahí. "Tu siguiente paso" ya no dice "con tus saldos, con tus datos" cuando la lección nombra sus datos.

### feat(aprende): APR.2c, la unidad 4 y un Aplícalo para cada unidad · 2026-10-24

[ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) D7 y D8; ficha [`contexto/aprende.md`](contexto/aprende.md). Primera rebanada de la Fase 2.

- **Unidad 4, Fondo de emergencia**: para qué sirve, cuánto es suficiente (control de gastos fijos por meses), cómo llenarlo sin ahogarte (control de aporte y ordenar pasos) y cuándo usarlo y reponerlo. Su Aplícalo lee tus gastos fijos y tu fondo y dice cuánto te cubre ("1 mes y 2 semanas", R69); sin gastos fijos los pide.
- **El Aplícalo deja de ser solo de la unidad 3**: `aplica.js` arma un modelo por unidad (cifra, línea, filas y botones hacia la sección) y la vista lo pinta igual para todas. Quedan escritos y probados los cálculos de las nueve unidades; el contenido de las demás llega en sus rebanadas.
- **Los controles también**: cada cálculo trae su lectura (`RESULTADOS`), y los textos pueden usar los valores legales del año (UVT, tope de renta, exento del 4x1000) sin escribirlos a mano (ADN 12).
- **La ruta sigue**: al terminar la unidad 3, la 4 queda como "vas aquí". Las tarjetas de clasificar pueden no llevar monto; la regla del tope aplica solo a las que clasifican gastos pequeños.

### feat(aprende): APR.1c y APR.1d, Inicio de tres lentes y Tu progreso propio · 2026-10-24

[ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) D1 a D5; acota el ADR 032 D6. Cierra la Fase 1 de APR. SW v597.

- **Inicio es un bloque en móvil**: pestañas Hoy, Aprende y Tu progreso, con su estado debajo del nombre (avisos, minutos de la lección que sigue, nivel). La barra inferior no cambia; "Inicio" se resalta en las tres lentes.
- **"Tu progreso" es una lente propia** (`#progreso`, y fila en "Cómo voy" en escritorio): nivel con escala, lo que sabes, lo que haces y semanas activas. Salen el apartado de Análisis y la tarjeta compacta de Inicio.
- **Un solo sistema de progreso**: cada unidad que ya sabes suma un paso al nivel, igual que un logro, una sola vez. Las semanas activas son las guardadas al registrar o hacer una lección más las semanas con gastos; borrar un gasto no resta la semana en que lo registraste.
- **"Tu siguiente paso"** ocupa la celda de la tarjeta de logros: la lección que sigue, con un dato real si lo hay, o el límite de gastos pequeños que la unidad 3 enseñó a poner. Inicio no crece (ADR 087).
- **Pruebas trasladadas, no perdidas**: las 11 de las dos superficies retiradas pasan a la lente nueva con la misma intención; las dos sin sujeto (el colapsable abierto entre renders, la tarjeta oculta sin logros) se cambiaron por su equivalente. `infra/avisos.js` gana `avisosDeHoy()`, que comparten Inicio y la pestaña Hoy.

### feat(aprende): APR.1b, la unidad 3 completa y el límite de gastos pequeños · 2026-10-24

[ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) D7 y dudas; fichas [`contexto/aprende.md`](contexto/aprende.md) y [`contexto/limites.md`](contexto/limites.md). SW v596, schema v46.

- **Las cuatro lecciones de la unidad 3**: "Lo pequeño también suma" (termina en Gastos), la de APR.1a, "Un límite que sí puedas cumplir" (ordenar pasos y "¿qué harías?") y el repaso. Los textos quedan con la revisión pedagógica pendiente (APR.2c).
- **El Aplícalo pone el límite**: "Poner un límite de $X" emite `hormiga:limite` y Límites, su dueño, lo guarda y lo muestra. Si ya hay uno, el botón lleva a verlo.
- **Límites gana el sobre de gastos pequeños**: cruza categorías, mismo criterio de alerta y excedido que un tope; sin límite, una línea con el total del mes ofrece ponerlo.
- **El tope de gasto pequeño es del usuario** (`S.config.hormiga.tope`, por defecto $20.000): lo leen Aprende, Gastos, Análisis y "Hormiga a raya". Un test defiende que cambiarlo no regala el logro, porque se aplica igual a los cuatro meses que se comparan.
- **Insignia al terminar la unidad** (`il-insignia`, `badgeIn`), solo la primera vez. Es la primera ilustración final del pipeline de DV.2d; el test de sincronía del sprite ya conoce `ilustraciones/`.
- **La ruta sin unidad actual lo dice**, y las unidades hechas se despliegan para repasar.

### feat(aprende): APR.1a, la ruta y la primera lección completa · 2026-10-24

[ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) D7, D8, D10 y D11; ficha [`contexto/aprende.md`](contexto/aprende.md). La Fase 1 arrancó sin esperar a las fichas 17 y 19 de MOV.1 por decisión en chat (resolución al final del ADR). SW v595, schema v45.

- **Dominio nuevo `aprende`**: la ruta de nueve unidades en `#aprende` (unidad actual abierta, el resto en "Después" con "En preparación" donde aún no hay texto) y la lección a pantalla completa en `#modal-leccion`. En escritorio entra al grupo "Día a día"; en móvil se llega por el enlace hasta APR.1c.
- **Motor de lección como valor inmutable**: concepto, elegir, clasificar (gesto y botones), mover un control (el deslizador no repinta el paso, así no pierde el foco) y ordenar. Una pregunta fallada vuelve antes del Aplícalo, nunca después, y el contador no se infla.
- **La lección 2 de la unidad 3 de punta a punta**, con el Aplícalo sobre los gastos pequeños del mes, un límite sugerido (80 % a la decena de mil) y "Registrar un gasto" cuando aún no hay dato (R57). El cierre describe "Hormiga a raya" con su regla real del ADR 032, no la del mockup.
- **`S.aprende` (v45)**: la primera fecha de cada lección (repasar no suma) y las semanas activas, persistidas porque deben ser monótonas.
- **`infra/hormiga.js`**: el umbral de gasto hormiga deja de estar duplicado en Gastos y Logros; los tres lo leen de ahí.
- **Primer `import()` dinámico del proyecto**: el contenido de cada unidad se carga al abrir la lección y está en el precache.
- **El sidebar vuelve a caber a 1280x799**: la fila nueva lo desbordaba 29px (BUG-026). Con puntero fino y alto ≤ 860px las filas bajan a 34px, en la capa `responsive` para que la cascada no la anule; quedan ~53px para "Tu progreso".

### docs(transversal): APR, P1 del ADR 093 resuelta · 2026-10-24

La recomendación de P1 del [ADR 093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md) se aceptó en chat tal como estaba escrita. Sin runtime.

- **Con perfiles de niño**, "Olvidé mi PIN" desde "¿Quién usa Finko?" y desde el cambio de perfil pide escribir una palabra de confirmación y dice que también borra los perfiles de los niños. Sin niños, el ADR 063 D7 no cambia; el 063 no se reescribe, el 093 lo acota.
- **APR.3a** deja de esperar una decisión: solo sigue atada al cierre de la Fase 1 del 092.

### docs(transversal): APR, triaje del handoff "Aprende y aplícalo" · 2026-10-24

El handoff de Claude Design (35 tableros) pasa a dos ADR en Propuesta, [092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) (capa de aprendizaje del adulto) y [093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md) (perfiles, modo niño y tutor), más la iniciativa APR en [`board/transversal.md`](board/transversal.md). Sin runtime.

- **Nada se implementa antes de cerrar las fichas 17 y 19 de MOV.1:** "Tu progreso" se muda y esas fichas auditan Logros. Primer alcance de código: la Fase 1 del adulto (APR.1a a APR.1d).
- **Premisa del handoff corregida:** daba "Tu progreso" en Ajustes y la mudanza de LG.2d por pendiente. LG.2d cerró el 2026-08-13 (Análisis más tarjeta en Inicio), así que el 092 **acota** el ADR 032 D6 en vez de ejecutarlo.
- **Las catorce dudas del handoff** se resolvieron por defecto con la propuesta del diseño, por decisión en chat, y quedan revisables en cada ADR. Una referencia vieja del handoff ("emojis hasta ID.3") se descartó: ID.3 cerró en julio.
- **Pregunta nueva, P1 del 093:** con niños en el dispositivo, "Olvidé mi PIN" (063 D7, borra todo) queda al alcance de un niño desde la pantalla del PIN. Bloquea APR.3a.

---

## Meses anteriores

- [2026-10, del 16 al 18](changelog/2026-10.md): rotación forzada por el techo de 60 KB; el resto de octubre sigue arriba hasta que cierre el mes.
- [2026-08](changelog/2026-08.md)
- [2026-07](changelog/2026-07.md)
- [2026-06](changelog/2026-06.md)
- [2026-05](changelog/2026-05.md)

---

## Convención de entradas

Cada entrada agrupa por fase/release y dentro lista commits con:
- **tipo(área)** - `commit_hash` · `archivos tocados` - descripción de qué cambió.

Tipos: `feat` (nueva funcionalidad), `fix` (bug), `refactor` (sin cambio funcional), `test`, `docs`, `chore` (config/build), `style` (formato).
