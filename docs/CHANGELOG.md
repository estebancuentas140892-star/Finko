# Changelog - Finko Claude

> Revisado: 2026-10-25.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-10)

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

### fix(compromisos): BUG-037, una compra con la tarjeta no es un pago de la tarjeta · 2026-10-18

Primera corrección de los defectos que encontró el banco de HF.0f ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)). Respeta el [ADR 051](DECISIONS/051-tarjeta-de-credito-producto-integrado.md) D2 y D3 y el [ADR 002](DECISIONS/002-abono-deudas.md) sin acotarlos. Ficha: [`contexto/deudas.md`](contexto/deudas.md), bloque Tarjeta de crédito.

- **Causa:** el consumo con tarjeta lleva el `compromisoId` de la tarjeta (MC.16b) y cinco lectores de "lo pagado" sumaban todo gasto con ese campo. Una compra de $600.000 a 6 cuotas sin pagos dejaba la tarjeta `completo`, sacaba su vencimiento de Inicio, Por pagar y avisos, y Distribuir la daba por cubierta.
- **El arreglo:** los cinco excluyen `consumoTC`: `calcularAbonosDelMes` y `fechaUltimoAbono` (`compromisos/logic/abonos.js`), `totalesDelMes` y `pendientesDePagoDelMes` (`agenda/logic.js`, duplicado intencional por la ADN 10) y `_pagadoEnRango` (`infra/vencimientos.js`). Un abono escrito por `pago-compromiso.js` no trae el campo y sigue contando.
- **Sin tocar:** el saldo y la cuota de la tarjeta (`efectoEnDeuda`, `efectoEnCuotaMensual`), el schema y las pantallas. Límites sigue sumando el consumo en Necesidades por su `compromisoId`: es contabilidad (P2, HF.1a) y queda anotado como riesgo en la ficha.
- **Tests:** 26 en `tests/unit/consumo-no-es-pago.test.js` (20 rojos antes): estado, abonado y último abono con compras de 1 y 6 cuotas, varias compras, compra y pago en meses distintos, Calendario, hoja, Inicio, avisos y Distribuir; y por las rutas reales de Gastos y Abonar, editar y borrar la compra. Suite verde en Bogotá, UTC, Tokyo, Kiritimati y Pago Pago. Unitarios 4762/4762, lint verde, E2E 328/328 (`--workers=2`). Banco de HF.0f: de 9 a 8 rojas. SW v593 a v594.

### docs(bugs): HF.0f, cuatro defectos que encontró el banco de perfiles · 2026-10-18

Triaje del banco de perfiles de regresión de HF.0f ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)), sin runtime. El banco (tres personas inventadas, un mes y doce, por las rutas reales de escritura) queda construido y **sin commitear**: nueve pruebas suyas fallan y reproducen cuatro defectos nuevos, y HF.0f no se cierra con la suite en rojo. Decisión de Esteban: registrarlos antes de seguir.

- **BUG-035 (baja):** borrar el pago de un fijo le escribe `saldoTotal` al fijo y el diálogo anuncia una deuda que no existe. El dinero revierte bien.
- **BUG-036 (alta):** Distribuir paga lo que vence el mes siguiente con fecha de hoy. Ese mes queda pendiente en el Calendario, avisa vencido y la hoja vuelve a ofrecer el débito: doble pago si se confirma. Es la causa de seis de las nueve rojas.
- **BUG-037 (alta):** una compra con la tarjeta cuenta como abono del mes. Una compra a cuotas sin ningún pago deja la tarjeta pagada y silencia su vencimiento.
- **BUG-038 (media):** Movimientos ofrece editar abonos y pagos de fijos, pero el formulario no guarda sin cambiarles la categoría.
- **Lo que ya cumple la app**, según el mismo banco: saldos contra un libro independiente, I1, I2 e I5 del ADR 053, Fondo fuera de activos, un cobro y un pago por hecho salvo BUG-036, HF.0b, HF.0h y HF.0j por sus recorridos reales, Movimientos sin duplicados, persistencia de v14 a v44 sin mover una cifra y reversas exactas de once operaciones. Peso de un año del perfil intensivo: 529.469 caracteres, 11,8 % del cupo.

### fix(agenda): HF.0j, la hoja de automáticos no ofrece lo anterior al alta · 2026-10-18

Octava rebanada de la iniciativa HF ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md), decisión del 2026-10-17). Acota el [ADR 052](DECISIONS/052-pagos-automaticos.md) D1 (nota al pie de D1). Ingresos y débitos en una sola rebanada: la regla y el punto de corte son los mismos. Ficha: [`contexto/calendario.md`](contexto/calendario.md) (Pagos automáticos).

- **Causa:** `creditosAutomaticosVencidos()` y `debitosAutomaticosVencidos()` recorrían el mes en curso y el anterior sin mirar cuándo nació el registro. Un salario automático de día 15 creado el 17 ofrecía el 15 de ese mes y el de septiembre; un Internet de día 12, lo mismo. Confirmarlos registraba dinero que el usuario nunca dijo que se movió.
- **El filtro:** `_desdeElAlta()` (`agenda/logic.js`) quita del mapa de eventos de cada mes las ocurrencias anteriores a `fechaCreacion`, leída con `fechaLocalISO()` (HF.0e). Corre **antes** de `pendientes*DelMes`, así que la agrupación mensual trabaja sobre lo que queda: un quincenal de días 15 y 30 creado el 17 pierde el 15 y conserva el 30, con su fecha. El día del alta cuenta (sigue pidiendo confirmación).
- **Atrasos legítimos:** lo creado antes de una ocurrencia la conserva; un registro de hace meses mantiene sus dos meses de catch-up, y siguen intactos los descartes por lo ya pagado o cobrado y por lo que Distribuir acreditó (HF.0b, HF.0h, HF.0i).
- **Sin fecha de alta:** un registro sin `fechaCreacion` legible conserva su ventana completa, como antes. No se inventa un alta ni hay migración. Es la limitación que queda: esos registros todavía pueden ofrecer un cobro anterior a su alta real.
- **Solo la hoja:** `ocurrenciasEnMes()`, el Calendario y el lote de "Por pagar" no cambian. Sin pantallas nuevas, sin schema, sin cambio de saldos.
- Verificado en la app (localhost, datos inventados, 18 de octubre): con un plan celular automático de día 12 sembrado con alta del 5 de octubre, se crearon por los formularios un salario automático de día 15 ($4.000.000) y un Internet automático de día 12 ($95.000). Al recargar, la hoja trae solo el plan celular del 12 de octubre (ni septiembre, ni el salario, ni Internet); el saldo sigue en $1.000.000. Confirmado el plan: un gasto del 12 de octubre por $50.000, saldo $950.000, y al recargar la hoja no vuelve ni se duplica.
- Tests: 24 unitarios nuevos en `tests/unit/catchup-desde-alta.test.js` (escenarios A a G, mismo día, noche colombiana, cruce de mes y de año, quincenal, bimestral, trimestral, anual, lo ya registrado, lo acreditado por Distribuir, sin fecha, y una prueba de no mutación con guardar y recargar). Rojos antes del arreglo: 16; los 8 restantes son guardas del catch-up legítimo y del alcance. Suite completa verde en Bogotá, UTC, Tokyo, Kiritimati y Pago Pago. Unitarios 4736/4736, lint verde, E2E 328/328 (`--workers=2`). SW v592 a v593.

### fix(fechas): HF.0e, interpretar la creación en calendario local · 2026-10-17

Séptima rebanada de la iniciativa HF ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md), P3 opción b). Cierra **BUG-025**. Sin schema, sin migración, sin tocar el sello de `crud.guardar()`. Fichas: [`contexto/transversal.md`](contexto/transversal.md) (infra compartida), [`contexto/calendario.md`](contexto/calendario.md), [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md), [`contexto/apartados.md`](contexto/apartados.md) y [`contexto/deudas.md`](contexto/deudas.md).

- **Causa raíz:** `fechaCreacion` es un instante UTC (`new Date().toISOString()`) y cinco lectores le cortaban los diez primeros caracteres como si fueran el día local. Lo creado en Colombia desde las 7 p. m. quedaba fechado al día siguiente, y la noche del último día del mes, en el mes siguiente: un bimestral anclaba su ciclo un mes tarde y el Calendario, Por pagar y los avisos inventaban una mora en el mes equivocado.
- **Un helper, tres casos:** `fechaLocalISO()` (`infra/utils.js`) convierte un instante ISO al día local del entorno, devuelve una fecha de calendario `YYYY-MM-DD` tal cual (sin pasar por ninguna zona) y da `null` para lo ausente o inválido. La zona es la del entorno, no una fija.
- **Lectores corregidos:** `_caeEnCiclo()` y la "Única vez" de `infra/vencimientos.js` (y con ellos el Calendario, Por pagar, los avisos, `ultimoVencimientoHasta` y la hoja de automáticos); `_inicioDelPlan()` de `infra/bolsas.js` (`fechaInicioPlan` sigue siendo fecha de calendario); `estadoDistribucion()`; el descarte de vencimientos anteriores al alta, `detectarFijosSinPagarEsteMes` y "deudas durmiendo" en `compromisos/logic/alertas.js`.
- **Los dos sentidos:** en Colombia el corte UTC corría la creación al día siguiente (Distribuir preguntaba por un cobro del mismo día del alta); en una zona UTC+ la corría al día anterior (Madrid, 00:30 del 1 de agosto, leía 31 de julio y daba por recibido un cobro anterior al alta).
- **Fuera a propósito:** la migración v34 de `core/storage.js` también recorta `fechaCreacion`, para fechar un abono agrupado de respaldos anteriores a v34. Es escritura de una sola vez y `core/` no importa `infra/`. HF.0j (la hoja no ofrece lo anterior al alta) no se adelanta: solo puede usar ya el helper.
- **Compatibilidad sin backfill:** un registro con fecha de calendario no se desplaza en ninguna zona; sin fecha, la frecuencia larga cae todos los meses como antes; una fecha inválida (`'2026-02-30'`, `'no-date'`) se trata como ausente en vez de anclar un ciclo inventado.
- **Tests que dependían de la zona:** tres fixtures de MC.13f (`tesoreria.test.js`) usaban `T00:00:00.000Z` como "4 de julio"; en Colombia es el 3 a las 7 p. m. Pasan a las 15:00 UTC, que no es el 3 en ninguna zona.
- Verificado en la app (localhost, datos inventados, todo creado el 30 de septiembre a las 8:00 p. m. hora Colombia): antes (HEAD), el bimestral de día 15 decía "Venció hace 2 días" en Por pagar y el motor generaba `compromiso-vencido`; Distribuir quedaba en "por confirmar" para el cobro del 30 y la reserva arrancaba su plan el 1 de octubre. Después: el bimestral solo aparece en noviembre ("Vence en 29 días", el Calendario lo pinta el 15 de noviembre), ningún aviso, Distribuir "listo" para el 30 de septiembre, plan desde el 30, alerta "Préstamo moto: 2 meses"; al recargar, las `fechaCreacion` guardadas y el saldo siguen intactos.
- Tests: 26 unitarios nuevos en `tests/unit/fecha-creacion-local.test.js` (helper, ciclo, Distribuir, reservas, deudas, bordes de medianoche, mes, año y bisiesto, compatibilidad), cada uno con `process.env.TZ` fijado y restaurado. Rojos antes del arreglo: 21. La suite completa pasa igual en Bogotá, UTC, Tokyo, Kiritimati (UTC+14) y Pago Pago (UTC-11). Unitarios 4712/4712, lint verde, E2E 328/328 (`--workers=2`). SW v591 a v592.

### fix(avisos): HF.0d, una sola regla de vencimiento para avisos, Inicio y Por pagar · 2026-10-17

Sexta rebanada de la iniciativa HF ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)). Cierra **BUG-031**. Aplica el [ADR 041](DECISIONS/041-motor-vencimientos-y-distribucion-v2.md) y el [ADR 066](DECISIONS/066-motor-unico-de-avisos.md) D3 sin cambiarlos. Fichas: [`contexto/transversal.md`](contexto/transversal.md) (motor de avisos, dueña de la regla), [`contexto/inicio.md`](contexto/inicio.md), [`contexto/deudas.md`](contexto/deudas.md) y [`contexto/calendario.md`](contexto/calendario.md).

- **Causa raíz:** el Calendario fechaba con el motor compartido (`ocurrenciasEnMes`) y marcaba pagado con `estadoPagoMes`, pero "compromiso próximo" contaba solo con `diaPago` (`proximoVencimiento`) y no recibía gastos (`compromisosProximos`), y "vencido" (`detectarVencidosCompletos`) tampoco miraba la frecuencia. Un fijo pagado el 15 seguía avisando "vence mañana" el 17; un bimestral o un trimestral salía todos los meses con otra fecha; un día 31 caía en un 31 de septiembre inexistente.
- **Una regla, las piezas del Calendario:** `vencimientosDesde()` (nueva, `logic/modelo.js`) da las fechas desde hoy con `ocurrenciasEnRango`; `proximoVencimiento()` la usa y devuelve `null` si no vuelve a vencer en un año. `compromisosProximos()` se muda a `logic/alertas.js`, recibe `gastos` (cuarto parámetro, default `[]`), salta los meses 'completo' y entrega `fechaVencimiento`. `detectarVencidosCompletos()` toma el día de las ocurrencias del mes. El barrel no cambia para los consumidores.
- **Sin duplicar al vencido:** el estado de pago es por mes, así que si el mes ya tiene un vencimiento pasado sin cubrir, lo que cae después en el mismo mes no es otro "próximo" (un solo gasto cubre los dos). Dos meses distintos sí son dos avisos: octubre vencido y noviembre a tres días son dos pagos reales (ADR 041 D2).
- **Deuda saldada:** no vence aunque su último abono fuera menor que la cuota (`estadoPagoMes` decía 'parcial' y Inicio la listaba "vencida hace 12 días", severidad urgente). Mismo criterio que el lote de "Por pagar"; un saldo desconocido no cuenta como cero.
- **Límites del modelo, documentados y fijados en tests:** un gasto cubre las dos quincenas del mes (el Calendario ya pintaba pagada la segunda), y un pago registrado en el mes anterior no cubre el vencimiento del siguiente. Distinguirlos exige saber a qué ocurrencia pertenece un gasto: dato nuevo, fuera de esta tarea.
- **Por pagar:** el chip fecha por frecuencia; una "Única vez" ya pasada dice "Sin próximo pago" en vez de una fecha inventada y se ordena al final.
- **Fuera de alcance, dicho:** el monto de un vencido con abono parcial sigue siendo la cuota completa en Inicio y en el aviso (el lote ofrece lo que falta); el punto de "vencido" de la grilla del Calendario sigue marcando ocurrencias anteriores al alta del registro (diferencia ya documentada en su ficha; terreno de HF.0e y HF.0j); `detectarFijosSinPagarEsteMes` conserva la regla vieja porque no tiene consumidores en runtime.
- Verificado en la app (localhost, datos inventados, 17 de octubre): Internet pagado el 15 con día 18, un bimestral de ciclo septiembre-noviembre, un trimestral de ciclo agosto-noviembre con día 18, un quincenal de días 4 y 19 creado el 10, Agua vencida el 9 y una tarjeta saldada. Antes (HEAD): Inicio anunciaba Internet y el trimestral "mañana", el bimestral "en 3 días" y la tarjeta "vencida hace 12 días"; el motor generaba "Internet vence mañana" con severidad alta y omitía el quincenal del 19. Después: Inicio, Por pagar, Calendario y avisos coinciden en Agua vencida y Gimnasio a 2 días; Internet sale el 18 de noviembre, el trimestral el 18 y el bimestral el 20, igual que el Calendario; móvil y escritorio.
- Tests: 52 unitarios nuevos en `tests/unit/vencimiento-unico.test.js` (pagado antes de vencer, bimestral, quincenal, hoy, mañana, tres días, abono parcial, vencido, inactivo, saldada, cambio de mes, febrero, días 29 a 31 con bisiesto, cinco frecuencias contra el Calendario, un aviso por compromiso y reloj fijado años después). Rojos antes del arreglo: 29; el resto son guardas. Unitarios 4686/4686, lint verde, E2E 328/328 (`--workers=2`; HF.0d no suma E2E y la tabla de HANDOFF arrastraba los 320 de HF.0c). SW v590 a v591.

### fix(tesoreria): HF.0i, Distribuir solo acredita y marca como recibidos cobros identificados · 2026-10-17

Quinta rebanada de la iniciativa HF ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md), P8). Cierra **BUG-033** y **BUG-034**. Fichas: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md) (Distribución v2) y [`contexto/calendario.md`](contexto/calendario.md) (Pagos automáticos).

- **Causa raíz:** el asistente trabajaba con "el cobro" como una suma de plantillas (`montoCobroPrincipal`) y una resta agregada de lo que acreditó la hoja; nunca supo qué ocurrencias formaban lo que repartía. Con ingresos en días distintos volvía a proponer una ocurrencia ya repartida y creaba dinero (BUG-034), y con el monto editado daba por recibidos todos los ingresos del cobro (BUG-033).
- **La identidad es la ocurrencia:** `ocurrenciasPorDistribuir()` devuelve cada ingreso del cobro en la fecha exacta de su último cobro (`ingresoId` + fecha), sin lo que ya selló una distribución. Si la lista no existe (distribución anterior a HF.0h), el sello de periodo es la evidencia de lo que cayó hasta él. Lo que acreditó la hoja sigue por repartir con el monto acreditado y no se suma otra vez (HF.0b).
- **Qué se acredita lo decide una función pura:** `resolverCobroDistribuido()` cruza el monto, los ingresos marcados y la aclaración de la diferencia: `'valor'` (un solo ingreso llegó por otro monto) o `'parte'` (llegó todo y se reparte una parte; se acredita completo). Con dos ingresos y un monto mayor no hay respuesta posible y no se confirma.
- **Lo mínimo de pantalla:** con un ingreso claro no aparece nada nuevo. Con dos o más, bajo el monto, una lista "Este cobro incluye estos ingresos", todos marcados; desmarcar uno ajusta el monto solo. La pregunta de la diferencia aparece solo si el monto no cuadra, y nombra los valores.
- **Pagos por partes, no:** representarlos exige un modelo nuevo. Ninguna opción marca un ingreso como cobrado a medias, y el aviso lo dice ("Finko no registra pagos por partes").
- **`cobrosDistribuidos` guarda lo repartido**, también lo que había acreditado la hoja (`yaAcreditado`, que la hoja ignora porque lo maneja su `IngresoPuntual`). Su ventana pasa de dos a doce meses: el cobro de una frecuencia Anual mira doce meses atrás. El test de retención de HF.0h cambió con esa ventana, por diseño y explicado en el propio test.
- **La tarjeta** propone lo que falta repartir; ya distribuido, sigue mostrando de cuánto es el cobro.
- **Fuera de alcance, dicho:** sin fecha datable (Semanal, Diario, sin día) no hay identidad y el asistente sigue como antes; un ingreso de la frecuencia principal sin día no entra en la propuesta; un ingreso que el usuario marcó como no llegado y no es automático no vuelve al asistente ese mismo periodo (la hoja sí lo ofrece si es automático); editar el `diaPago` de un ingreso ya repartido rompe el par.
- Verificado en la app (localhost, datos inventados): Caso B, lista con los dos ingresos, monto a 4.000.000, solo "llegó todo" disponible y "Distribuir" bloqueado hasta desmarcar Honorarios; total 3.600.000 con el arriendo, la hoja ofrece solo los honorarios y al confirmarlos queda en 4.600.000. Caso A: la tarjeta propone 4.000.000 con y sin pares guardados. Caso C: monto a 3.800.000, las dos opciones y el aviso de pagos por partes; "llegó por 3.800.000" deja 3.400.000 y la hoja no vuelve. A 375 px sin desbordes.
- Tests: 21 unitarios nuevos (20 en `tesoreria.test.js`, 1 en `agenda.test.js`) y 8 E2E nuevos en `distribucion-credito-automatico.test.js` (Caso A, quincenal, Caso B, sin aclarar, deshacer y tres del Caso C). Rojos antes del arreglo: los 21 unitarios y 6 E2E; el quincenal y "sin tocar el monto" son guardas que ya pasaban. HF.0b y HF.0h siguen verdes. Unitarios 4634/4634, lint verde, E2E 328/328 con `--workers=2`, sin flaky. SW v589 a v590.

### docs(transversal): HF, P8 resuelta y catch-up desde el alta para débitos · 2026-10-17

Dos decisiones de Esteban, escritas en el [ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md) antes de tocar runtime. Sin runtime.

- **P8:** Distribuir trabaja con ocurrencias identificadas. Con varios ingresos en el cobro el usuario marca cuáles recibió; con uno solo no se pregunta nada; una diferencia de monto se aclara y nunca se adivina; un pago por partes no se marca como completo. HF.0i queda desbloqueada.
- **Débitos:** la regla de HF.0j para ingresos se extiende a los débitos automáticos de un compromiso recién creado. HF.0j los absorbe (fuente única), acota el ADR 052 D1 y sigue esperando HF.0e; no se implementa ahora.

### fix(gastos): HF.0c, el importador CSV de gastos no crea dinero · 2026-10-17

Cuarta rebanada de la iniciativa HF ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md), P4). Cierra **BUG-029**. Fichas: [`contexto/gastos.md`](contexto/gastos.md) y [`contexto/configuracion.md`](contexto/configuracion.md).

- **Causa raíz:** el importador guardaba `cuentaId` sin descontar (correcto: el CSV es historia que el saldo tecleado ya refleja), pero el gasto importado era indistinguible de uno manual. Editarlo aplicaba la diferencia de monto a la cuenta y borrarlo devolvía el monto: cada importado borrado creaba dinero. Y desde TX.9a el formulario no pide descripción, así que el CSV que exporta Finko la trae vacía y el importador, que la exigía, lo rechazaba.
- **La marca es un dato, no un modo:** `Gasto.sinEfectoSaldo` (schema v44, migración no-op, precedente del ADR 051 D8) la pone `normalizarFila()`. La cuenta se conserva como dato. `deltasPorEdicionDeGasto()` devuelve `{}` para un gasto marcado, y borrar pasa a ser "editar hacia nada" con esa misma función (antes era un `+monto` aparte), así que editar y borrar no pueden divergir. El confirm de borrado nombra solo lo que de verdad se revierte.
- **Sin backfill:** un gasto importado antes de la v44 no se distingue de uno manual y sigue reembolsando al borrarlo. Es la decisión P4, no un olvido.
- **Ida y vuelta:** una fila sin descripción es válida si trae categoría, y los duplicados se detectan por el nombre visible del gasto (descripción, o categoría si no hay), el mismo criterio del título de la lista. Sin eso, dos gastos sin descripción del mismo día y monto chocaban y el segundo se perdía. La columna `descripcion` sigue siendo obligatoria como encabezado.
- **Una expectativa vieja cambió, y es el bug:** `flujos.test.js` usaba "sin descripción, categoría Otros" como fila mala. Es exactamente lo que exporta Finko desde TX.9a; la fila mala pasa a ser la que no trae ni descripción ni categoría. Las demás aserciones del test no cambiaron.
- **Los gastos manuales no cambian:** crear, editar y borrar siguen moviendo su cuenta (controles en smoke.test.js y verificación en la app).
- **Fuera de alcance, dicho:** la marca cubre la cuenta y no la deuda (editar un importado hacia un consumo con tarjeta sigue moviendo la deuda); filas idénticas dentro del mismo CSV siguen tratándose como duplicado.
- **El importador lo dice:** "Formato esperado" suma dos notas: la descripción puede ir vacía si hay categoría, y lo importado no cambia el saldo de las cuentas.
- Verificado en la app (localhost, datos inventados; el archivo se inyectó en el `<input type="file">` porque el selector del sistema no se maneja desde el navegador integrado): importar dos gastos con cuenta deja $800.000; editar Mercado de 120.000 a 150.000 y borrar Transporte (el confirm ya no dice "devuelve") lo dejan en $800.000; borrar el gasto manual de Café devuelve $30.000 a Nómina; al recargar, el importado conserva cuenta y marca.
- Tests: 10 unitarios nuevos (6 en `import.test.js`, 2 en `gastos.test.js`, 2 en `storage.test.js`) y 3 E2E nuevos (`importar-gastos.test.js`: importar, editar, borrar y recargar; importar dos veces; exportar e importar ida y vuelta). Rojos antes del arreglo: 9 unitarios y los 3 E2E (el primero, con 770.000 tras editar). Unitarios 4613/4613, lint verde, E2E 320/320 con `--workers=2`, sin flaky. SW v588 a v589.

### docs(transversal): HF, triaje de los hallazgos de HF.0h · 2026-10-17

Tres decisiones de Esteban sobre lo que dejó abierto HF.0h ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)). Sin runtime.

- **BUG-033, reproducido antes de registrarlo:** con dos ingresos en el cobro y el monto editado a lo que llegó, Distribuir sella los dos y la hoja deja de ofrecer el que nunca llegó. Con un solo ingreso la identidad es segura y no hay bug.
- **BUG-034, encontrado al investigar el anterior:** con ingresos en días distintos, el monto por defecto vuelve a sumar una ocurrencia que la distribución anterior ya acreditó. E2E temporal con reloj fijo: +10.000.000 con 9.000.000 recibidos. Viene de MC.13, no de HF.0h.
- **HF.0i** absorbe los dos y espera la decisión **P8** (¿el asistente pregunta qué llegó?). Sin ella no se diseña arquitectura nueva de cobros. HF.0f pasa a depender de HF.0i: congelaría el doble conteo como esperado.
- **HF.0j:** la hoja no ofrecerá cobros anteriores al alta de un ingreso automático; acota el ADR 052 D1 y espera HF.0e por la hora local. Queda abierta la misma pregunta para el débito automático, que hoy se comporta igual.
- **DOC.5:** limpieza de `contexto/mis-cuentas.md` (43,4 KB) al techo de 40 KB, solo trasladando historia, sin mezclarla con correcciones financieras.

### fix(agenda): HF.0h, la hoja de automáticos no reofrece un cobro que Distribuir ya acreditó · 2026-10-17

Tercera rebanada de la iniciativa HF ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)), espejo de HF.0b. Cierra **BUG-032**. Fichas: [`contexto/calendario.md`](contexto/calendario.md) (Pagos automáticos) y [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md) (Distribución v2).

- **Causa raíz:** la hoja decide qué cobro falta mirando solo `IngresoPuntual` con `ingresoId` en el mes (`pendientesDeCreditoDelMes`), y Distribuir acredita el saldo sin dejar ningún registro de qué ocurrencia acreditó. Posponer la hoja y distribuir dejaba el cobro "pendiente" para siempre.
- **Lo que ya existía no alcanzaba, y no se forzó:** `ultimaDistribucionPeriodo` es una sola fecha (la más reciente de cualquier frecuencia, no solo la del cobro), no dice qué ingresos formaban el cobro, no separa la primera quincena de la segunda y reconstruirlo depende de ingresos que el usuario puede editar después. Usarlo como guarda habría escondido ingresos que nadie acreditó.
- **Dato mínimo, por la convención existente:** al confirmar, Distribuir sella en `S.config.cobrosDistribuidos` los pares `{ingresoId, fecha}` que acredita: el mismo conjunto de HF.0b (`_ocurrenciasDelCobro`, ahora fuente única de los dos sentidos) menos lo que la hoja ya registró. Campo opcional de `config` sin schema, igual que `ultimaDistribucionPeriodo` y `cobroConfirmadoPeriodo`. No crea `IngresoPuntual` ni movimientos: eso sigue siendo HF.1d.
- **La hoja descarta por ocurrencia exacta, no por mes:** distribuir la primera quincena no esconde la segunda, ni septiembre esconde octubre, ni un ingreso esconde a otro del mismo monto, descripción o cuenta.
- **Solo se sella si entra dinero nuevo** (`acreditar > 0`). Con el monto editado a mano se sella el cobro entero: el asistente lo trata como un solo cobro, igual que su propio sello de periodo.
- **Deshacer la revierte sola:** `config` ya estaba en el snapshot de "Deshacer", así que el cobro vuelve a la hoja junto con el saldo. Se conservan el mes en curso y los dos anteriores (la hoja revisa dos).
- **Compatibilidad con HF.1d:** cuando Distribuir escriba su `IngresoPuntual`, la guarda se retira. Queda escrito en la tarjeta que la hoja debe descartar ese registro por ocurrencia, o la segunda quincena distribuida dejaría de salir.
- **Fuera de alcance, dicho:** la hoja sigue confirmando un quincenal una vez por mes cuando el crédito lo hace ella misma (riesgo 8 del ADR 091); editar el `diaPago` de un ingreso ya acreditado rompe el par en los dos sentidos; Semanal y Diario siguen sin reconocerse. Hallazgo sin triar: la hoja ofrece el mes anterior de un ingreso automático recién creado, porque no mira `fechaCreacion`.
- Verificado en la app (localhost, datos inventados): hoja con Salario prueba +$4.000.000, "Ahora no" sin cambios (total $800.000); Distribuir con el arriendo de $1.200.000 deja Nómina en $3.300.000 y el total en $3.600.000; al recargar la hoja no se abre. Con Honorarios prueba creado después (automático, día 16), la hoja ofrece solo los honorarios y el total sigue en $3.600.000.
- Tests: 23 unitarios nuevos (15 en `tesoreria.test.js`, 8 en `agenda.test.js`, uno de ellos espejo entre los dos dominios) y 5 E2E nuevos (`distribucion-credito-automatico.test.js`: Distribuir y recargar, "Ahora no", deshacer, otro ingreso y otro periodo, mes siguiente), con el dinero total afirmado en cada paso. Rojos antes del arreglo: 20 de los 23 unitarios (los otros tres afirman que nada se esconde o que la guarda persiste) y 3 de los 5 E2E, donde la hoja volvía a ofrecer +$4.000.000 ("Ahora no" y deshacer son controles). Ninguna expectativa existente cambió. Unitarios 4603/4603, lint verde. E2E 317/317 verdes con `--workers=2` en dos corridas: la primera sin flaky; la segunda, con la máquina más cargada (13 min), 5 flaky por el timeout de 30 s que pasaron al reintento, uno de ellos nuevo (el recorrido con recarga) y cuatro previos. SW v587 a v588.

### fix(tesoreria): HF.0b, Distribuir no reacredita un cobro que el crédito automático ya acreditó · 2026-10-16

Segunda rebanada de la iniciativa HF ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)). Cierra **BUG-030** y abre **BUG-032**. Fichas: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md) (Distribución v2) y [`contexto/calendario.md`](contexto/calendario.md) (Pagos automáticos).

- **Causa raíz:** PA.1b dio a un mismo cobro dos caminos de crédito y ninguno miraba al otro. La hoja de automáticos acredita y escribe `IngresoPuntual` con `ingresoId`; `_confirmarDistribucion()` sumaba `monto` siempre, porque desde MC.13e-1 el asistente tiene un solo flujo ("siempre acredita") y PA.1b llegó un mes después sin tocarlo.
- **El arreglo es una resta, no un modo:** `montoYaAcreditadoDelCobro()` (pura, en `logic/distribucion.js`) suma lo que la hoja ya acreditó de este cobro y la acción acredita `max(0, monto - eso)`. El reparto, el déficit, las transferencias y el undo no cambian.
- **Identidad explícita:** cuenta un `IngresoPuntual` solo si su `ingresoId` es un ingreso del cobro (frecuencia principal, el mismo conjunto de `montoCobroPrincipal`) y su `fecha` es exactamente la del último cobro de ese ingreso (`ultimoPagoHasta`). La hoja escribe esa misma fecha porque las dos salen de `ocurrenciasEnMes`. Monto, descripción o cuenta iguales no bastan, y un ingreso puntual sin `ingresoId` es un evento aparte (decisión (a) del ADR 041, que no se toca).
- **El periodo sale de la fecha exacta, no del mes:** el crédito de septiembre no vuelve acreditado octubre, y en un quincenal la primera quincena no cubre la segunda (la hoja acredita una vez por mes).
- **"Ingreso puntual equivalente"**, que la tarjeta mencionaba, no existe como concepto en el código: no se inventó. Un ingreso registrado a mano sin `ingresoId` sigue sin reconocerse.
- **Hallazgo nuevo, reproducido en la app:** el sentido inverso. Si el usuario pospone la hoja y distribuye, la hoja vuelve a ofrecer el cobro y confirmarlo lo duplica. Es BUG-032 (tarjeta HF.0h); arreglarlo toca la hoja del Calendario, fuera de esta tarea.
- **Fuera de alcance, dicho:** frecuencias sin día datable (Semanal, Diario, Variable) no se reconocen; con dos ingresos del cobro en cuentas distintas, lo acreditado se queda donde entró y el asistente descuenta todo de la cuenta de origen, como ya hacía.
- Verificado en la app (localhost, perfil inventado): hoja confirmada, Cuenta Nómina en $4.500.000; Distribuir con el arriendo de $1.200.000 y $500.000 a Cuenta Ahorros deja $2.800.000 y $800.000, total $3.600.000. Antes del arreglo, la E2E daba $6.800.000 en Nómina.
- Tests: 11 unitarios nuevos (`tesoreria.test.js`: escenarios A a D, quincenal, otra frecuencia, sin fecha datable, guardar y cargar) y 3 E2E nuevos (`distribucion-credito-automatico.test.js`, rojos antes del arreglo). Ninguna expectativa existente cambió. Unitarios 4580/4580, lint verde. E2E 312/312 verdes con `--workers=2`, sin flaky. SW v586 a v587.

### docs(transversal): HF, P1 a P7 del ADR 091 resueltas · 2026-10-16

Las siete recomendaciones del [ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md) se aceptaron en chat tal como estaban escritas. Sin runtime.

- **Ninguna rebanada de la Fase 0 espera ya una decisión:** HF.0c (P4, el gasto importado no toca el saldo) y HF.0e (P3, BUG-025 por la opción b) quedan desbloqueadas.
- **Ningún ADR cambia hoy.** El 020 se conserva (P1) y HF.1f sale del tablero sin código. Los que se acotan (051 D3 y 002 por P2, 081 D2 por P5) se acotan con su ADR propio en HF.1a y HF.3a, que siguen atadas a la ficha 18 y al cierre de MOV.1.
- **P7 parte una tarjeta:** HF.4f queda solo con compartir texto; el PDF se difiere y no conserva tarjeta. P6 deja HF.5a en "no iniciar".
- Las reglas R-HF1 a R-HF6 y el plan siguen como propuesta: las preguntas eran sobre choques, no sobre las reglas.

### fix(avisos): HF.0a, la suite vuelve a verde y "compromiso próximo" respeta la fecha inyectada · 2026-10-16

Primera rebanada de la iniciativa HF ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)). Cierra **BUG-028**. Ficha: [`contexto/transversal.md`](contexto/transversal.md), bloque "Motor único de avisos".

- **La compuerta 1 estaba rota para cualquier commit**, incluido el de la ficha 17 de MOV.1: 7 rojos de 4.563. Ahora 4.569 de 4.569.
- **El arreglo es un parámetro, no una regla nueva.** `proximoVencimiento()`, `urgencia()` y `compromisosProximos()` aceptan la fecha de referencia con default hoy (la convención de `diasParaProximoPago()` en tesorería), y `_deCompromisosProximos()` recibe el `hoyISO` del motor y lo pasa por `_fechaRef()`, como ya hacían las otras seis fuentes. Los siete consumidores que no pasan fecha no cambian.
- **Sin cambio visible.** En producción `hoyISO` ya es el día real: lo que estaba roto era el contrato de inyectabilidad, y con él la suite.
- **El séptimo rojo era otro caso del mismo patrón, sin registrar**: `inversiones.test.js` usaba `fechaInicio: '2026-07-29'` contra `DIAS_ORIGEN_RECIENTE = 30` con el reloj real, así que caducó el 2026-08-28. Ahora fija el reloj.
- **Los tests nuevos fijan el reloj meses después de la fecha inyectada.** Si una fuente vuelve a leer `new Date()`, fallan cualquier día, no solo los que no coinciden con el fixture: la razón por la que BUG-028 pasó desapercibido el día que se escribió.
- **Fuera de alcance, a propósito:** que esa fecha ignore la frecuencia y lo ya pagado es BUG-031 (HF.0d). Cambia lo que ve el usuario y merece su propia tarjeta.
- Verificado en la app (localhost, datos inventados): Inicio pinta "Arriendo de prueba" que vence hoy e "Internet de prueba" en 2 días, y el motor, llamado en el navegador con `hoyISO` 2026-09-17, devuelve solo "Internet de prueba, 1 día", lo que antes del arreglo era imposible. El SW no se registra en localhost por diseño.
- Tests: 6 unitarios nuevos (5 de fecha inyectada en `compromisos.test.js`, 1 en `avisos.test.js`) y 1 reparado. Lint verde. E2E 309/309 verdes con `--workers=2` (con los workers por defecto, esta máquina daba 14 flaky y 1 rojo por carga del servidor Python, también en `main` sin cambios). SW v585 a v586.

### docs(transversal): HF, triaje de la iniciativa "un hecho financiero se informa una sola vez" · 2026-10-16

Triaje del brief de Esteban del 2026-10-16 contra el código. Decisión: [ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md) (Propuesta). Tarjetas: [`board/transversal.md`](board/transversal.md), bloque HF. Sin runtime.

- **MOV.1 no bloquea la iniciativa entera, solo sus Fases 1 y 3.** La Fase 0 no comparte archivos con la ficha 17 ni decide nada de la 18; la 18 es dueña del historial fechado, el valor de mercado, R90 y V5, y HF los espera.
- **La compuerta 1 estaba rota para todos:** 7 rojos en `main` (6 de BUG-028 y uno nuevo, un test de Inversión con fecha fija que caducó el 2026-08-28). Por eso la primera rebanada es HF.0a y no algo visible.
- **Cinco pedidos del brief ya existían** y no generan trabajo: forma habitual de pago y crédito automático (ADR 052), semántica del consumo con tarjeta (ADR 051 D3), préstamo con cuenta (PE.7) e inversión con origen (ADR 053).
- **Seis choques con ADR vigentes quedan como preguntas, no como cambios:** Fondo (020), pago de tarjeta y abono como gasto (051 D3, 002), Calendario sin acciones (081 D2), push y servidor (066 D1, 043 D1 y D4). Ninguno se revierte en silencio.
- **Tres errores nuevos, verificados en el código:** BUG-029 (importar gastos y borrarlos crea dinero), BUG-030 (Distribuir reacredita un salario ya acreditado por PA.1b) y BUG-031 ("compromiso próximo" avisa lo ya pagado y fecha sin la frecuencia).
- **Cupo:** los movimientos externos llevarían el estado a T1 del ADR 068 en dos o tres años; queda escrito antes de abrir la Fase 4.
- El diferido del ADR 040 (badges del nav) pasa a HF.3e: el brief respondió qué cuenta el badge.
- `CHANGELOG.md` rota: agosto pasa a [`changelog/2026-08.md`](changelog/2026-08.md) (364 KB, sobre el techo de 200 de un mes cerrado, igual que 2026-07; partirlo no entra aquí).
- Compuerta 3 verde. Sin tocar `modules/`, no hay tests que correr.

---

## Meses anteriores

- [2026-08](changelog/2026-08.md)
- [2026-07](changelog/2026-07.md)
- [2026-06](changelog/2026-06.md)
- [2026-05](changelog/2026-05.md)

---

## Convención de entradas

Cada entrada agrupa por fase/release y dentro lista commits con:
- **tipo(área)** - `commit_hash` · `archivos tocados` - descripción de qué cambió.

Tipos: `feat` (nueva funcionalidad), `fix` (bug), `refactor` (sin cambio funcional), `test`, `docs`, `chore` (config/build), `style` (formato).
