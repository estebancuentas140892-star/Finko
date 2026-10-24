# ADR 093 - Perfiles en el mismo dispositivo y el modo niño

**Estado:** Propuesta (2026-10-24). Segunda mitad del handoff "Finko · Aprende y aplícalo"; la primera, la capa de aprendizaje del adulto, es el [ADR 092](092-aprende-y-aplicalo-la-capa-de-aprendizaje.md). **No se implementa antes de que cierre la Fase 1 del 092**: el niño usa el mismo motor de lección con otra piel. Las dudas del handoff se resolvieron por defecto con la propuesta del diseño (decisión en chat del 2026-10-24) y quedan revisables. **P1, la pregunta nueva que el handoff no vio, se resolvió el 2026-10-24**: ver "Resolución de P1" al final.
**Fecha:** 2026-10-24
**Autores:** Claude Design (handoff, tableros de Frai, tokens del modo niño, ilustraciones, onboarding, niño y tutor), Claude Opus 5.5 (triaje y redacción)
**Relación:** **extiende el [ADR 063](063-candado-de-acceso-local.md)**: el candado pasa a ser obligatorio en cuanto existe un perfil de niño y su PIN es lo que separa los perfiles; el resto del 063 no cambia, y su D7 se acota con niños en el dispositivo (P1). **Acota el [ADR 003](003-tono-neutral-profesional.md) dentro del perfil niño** (D6), que ya nombraba a los niños como público. Conserva el [ADR 067](067-biometria-descartada-como-desbloqueo.md) (sin biometría), el [ADR 025](025-logotipos-de-marca-y-tejas.md) D6 (los emojis de los logros adultos siguen) y el [ADR 091](091-un-hecho-financiero-se-informa-una-vez.md) R-HF1 (la mesada entregada es un hecho y se anota una vez). Integra en su pipeline la clase de asset que abrió DV.2d ([ADR 033](033-direccion-visual-premium.md) D3), sin duplicarla. Tarjetas: [`board/transversal.md`](../board/transversal.md), bloque APR.

---

## Contexto

Finko hoy es de una sola persona por instalación. El handoff propone que un adulto tutor y niños de 7 a 12 años compartan el dispositivo: el niño aprende con su propia ruta y administra una alcancía de tres frascos que existe solo como anotación, porque **Finko no mueve dinero: lo anota**. El tutor entrega la mesada en efectivo y Finko la registra como gasto suyo.

El riesgo de fondo es de privacidad, no de seguridad: el candado del 063 es una pantalla de privacidad y no cifra los datos. Ese límite se conserva y se dice en pantalla ("El candado protege tu perfil de quien usa este teléfono. No cifra tus datos.").

---

## Decisión

### D1. Perfiles: un adulto tutor y niños de 7 a 12 años

- **Un solo adulto por instalación**, como hoy. Los niños son perfiles nuevos dentro del mismo `fk_v1`.
- **Crear el primer niño exige activar el candado** (063). Si el adulto no tiene PIN, el alta del niño lo crea antes de continuar.
- **De niño a adulto se pide el PIN; de adulto a niño es libre.** El cambio de perfil reutiliza el fundido del cambio de tema (CFG.7): la app cambia de piel, no de lugar.
- **Con niños, Finko abre en "¿Quién usa Finko?"**: el adulto con su PIN, cada niño con su dibujo y su edad, y "Agregar un niño" (que pide el PIN). Sin niños, el arranque no cambia.
- **El perfil niño no ve deudas, tarjetas, impuestos, cuentas bancarias ni exportar datos**, y tampoco la barra adulta. La pantalla de alta lo dice antes de crear el perfil.

### D2. El tutor administra desde Ajustes, en "Familia"

Bloque nuevo en Ajustes con atajo desde el avatar de Inicio:

| Pantalla | Qué decide |
|---|---|
| Agregar un niño (paso 1 de 2) | nombre, edad (7 a 12), su dibujo del catálogo (sin fotos), cómo te nombra ("Papá", "Mamá" u otro) y qué verá |
| Mesada (paso 2 de 2) | monto, frecuencia (semanal, quincenal o mensual), día, reparto en los tres frascos (por defecto la mitad a Ahorrar), si el niño puede mover dinero entre frascos y si se anota como gasto tuyo |
| Progreso del niño | unidades aprendidas, alcancía, meta, premio y lo que hizo esta semana, con "Entrar como" su nombre |
| Premio por ahorrar | cuánto le sumas cada mes sobre lo que guardó (D4) |

### D3. La mesada se anota, no se mueve

Cuando el tutor marca "Entregada", Finko registra **un gasto del adulto en la categoría Familia** (existe: `c-familia`) y acredita los frascos del niño según su reparto. Es un solo hecho con sus dos consecuencias (091 R-HF1). La pantalla lo dice: "Finko no mueve dinero: tú se la entregas y aquí queda anotada."

### D4. Premio por ahorrar: el interés que se ve

- **Cada mes**, sobre lo que el niño **guardó todo el mes** en Ahorrar: si sacó dinero, el premio se calcula sobre lo que quedó.
- **Tres tasas a elegir:** $1 por cada $20, $1 por cada $10 (por defecto) y $2 por cada $10. La pantalla muestra el resultado con el saldo de hoy y la fecha de pago antes de activar (R50).
- **Sale del dinero del tutor** y se anota como gasto Familia, igual que la mesada.
- **La pantalla dice la verdad:** un 10 % mensual es mucho más que cualquier interés real, y el premio es grande para que el niño lo note. Enlaza a la unidad de interés de la ruta del niño.

### D5. El modo niño es una clase, no un tema

Se aplica con la clase `.kid` sobre el tema activo y **suma** tokens `--fk-kid-*` a los `--fk-*` sin reemplazar ninguno. Misma fuente (Inter), misma escala de espaciado, misma familia de íconos. Cambian el lienzo, la forma, el tamaño y la voz. **Oscuro por defecto y claro de primera clase**, igual que el adulto, con AA medido en cada par.

| Token | Oscuro | Claro |
|---|---|---|
| `--fk-bg-base` | `#121729` (noche azul) | `#f2f5fc` (cielo) |
| `--fk-bg-surface` / `-elevated` | `#1b2239` / `#252d48` | `#ffffff` / `#e6ecf8` |
| `--fk-kid-primary` | `#1fd194`, canto `#11865e`, texto 9,6:1 | `#087a4b`, canto `#05522f`, blanco 5,4:1 |
| `--fk-kid-frai` | `#7fdcb0` (10,8:1) | `#1f7a55` (4,8:1) |
| `--fk-kid-sun` | `#ffc94a`, solo celebración | `#f2b01e`, texto `#8a5a00` |
| `--fk-kid-hint` ("casi") | `#6ea6ff` | `#1a5fd4`, igual a `--fk-info` |
| `--fk-kid-ahorrar` | `#38c98c`, texto `#4bd99b` | `#38c98c`, texto `#1f7a52` (5,3:1) |
| `--fk-kid-gastar` | `#ff9a5c`, texto igual | `#ff8a5c`, texto `#c23d00` (5,3:1) |
| `--fk-kid-compartir` | `#f06fc2`, texto `#f27ccb` | `#f06fc2`, texto `#c2187f` (5,6:1) |
| `--fk-text-primary` / `-secondary` | `#f1f3fb` / `#b9c0d6` | `#172038` / `#43506e` |

- **Los tres frascos reutilizan hues de dominio** que ya existen (ahorro, gastos, me deben) para no abrir una paleta paralela, y ninguno va solo: cada frasco lleva ícono y nombre (R49).
- **Forma:** radios 12, 18, 24 y 32; objetivo táctil mínimo 48 px y de diseño 56 px.
- **`--fk-kid-depth: 4px`:** canto sólido bajo cada botón, del mismo hue un paso más oscuro. Dice "esto se toca" sin sombra difusa; al presionar, el botón baja 2 px (`kidPress`, 092 D10).
- **`--fk-kid-icon: 28px`:** cada texto lleva un ícono al lado, con trazo 2,4 (el adulto usa 2).
- **Tipografía, Inter más grande y más pesada:** `kid-text-2xl` 32/800, `-xl` 26/800, `-lg` 22/700, `-base` 18/500 y `-sm` 16/600, que es el texto más chico que ve un niño.

### D6. La voz del niño (acota el ADR 003 dentro del perfil niño)

Las reglas del 003 siguen: tuteo, "dinero", sin jerga ni regionalismos. Se suman tres, solo en el perfil niño: **frases de máximo 10 palabras**, **cifras en pesos completos y redondos** ($5.000, no $4.850) y **exclamaciones permitidas** en lo que dice Frai ("¡Casi! Pensemos juntos otra vez."). Fuera del perfil niño, nada cambia.

### D7. Frai, el personaje guía

Un frailejón del páramo colombiano: atrapa el agua de la niebla, la guarda para cuando no llueve y crece despacio, más o menos un centímetro al año. Enseña tres ideas de la ruta: **guardar, tener reserva y esperar a que crezca**. "Frai" es nombre provisional.

- Su gota de agua es el punto de valor que ya tienen los íconos de Finko. Cuerpo y hojas usan el duotono (22 %) y el trazo redondeado de la familia de íconos.
- **Funciona en un solo color:** lo pone el contexto con `currentColor`, `--fk-kid-frai` por defecto. Bajo 40 px el trazo sube de 2,6 a 3,2 o 4, igual que la escala de íconos.
- **Cuatro poses:** saluda (Inicio, bienvenida, cambio de perfil), explica (pantallas de idea), celebra (fin de unidad, meta cumplida, toma `--fk-kid-sun`) y anima (después de un error, toma `--fk-kid-hint`).
- **Nunca aparece en el perfil adulto. Nunca se ve triste ni decepcionado:** tras un error, anima.

### D8. Ilustraciones del catálogo, nunca fotos ni emojis

- **Metas y avatares del niño son dibujos del catálogo**: balón, libro, bicicleta, tenis, cometa, colores, audífonos y patineta. Cada uno pesa menos de 1 KB y viaja dentro de la app.
- **Tres tokens nuevos de ilustración:** `--fk-il-line` (contorno), `--fk-il-paper` (zonas blancas) y `--il-a` (color de la meta, tomado de los dominios). El mismo dibujo funciona en los dos temas.
- **Entran por el pipeline de DV.2d** (`assets/svg/ilustraciones/`, prefijo `il-`, `sync-sprite.py`). DV.2d conserva su lote propio (los ocho estados vacíos); este catálogo es otro lote del mismo mecanismo, no una tarjeta rival.
- **El frasco** se llena en proporción a la meta de ese frasco, nunca contra los otros dos (R60). **La insignia de unidad** mide 88 px en el niño, con Frai celebrando; 56 px en el adulto (092 D7).

### D9. Lo que ve el niño

Barra propia de cuatro destinos: **Inicio · Aprender · Alcancía · Yo**.

- **Inicio:** saludo de Frai, siguiente lección con su duración, la alcancía y la meta con lo que falta ("Te faltan $18.000. Unas 4 semanas.").
- **Aprender:** ruta por unidades como **camino ilustrado**, y **en orden**: el niño sigue la secuencia para no perderse (el adulto no, 092 D8). De 7 a 9 años la ruta empieza en la unidad 1; desde los 10 hace primero tres preguntas de ubicación.
- **Lección con Frai:** el mismo motor del 092 con la piel `.kid`. "¿Lo necesito o lo quiero?" clasifica con dos botones grandes. El error muestra "Tu respuesta" y "Esta era", y Frai anima.
- **Celebración de unidad:** insignia con Frai y ocho destellos estáticos escalonados (opacidad, paso de 35 ms), más **"Úsalo de verdad"**, el Aplícalo del niño ("En tu frasco Gastar tienes $6.000. ¿Es para algo que necesitas o que quieres?").
- **Alcancía:** total y tres frascos (Ahorrar, Gastar, Compartir) con sus acciones "Guardé", "Gasté" y "Compartí"; la meta; la mesada con su próxima fecha y reparto; el premio con su próximo pago.
- **Crear una meta:** dibujo, nombre, precio y cuánto guarda cada semana; la pantalla responde en semanas y en fecha ("Lo tendrás en 8 semanas. Para el 19 de diciembre.").
- **Yo:** sus insignias y su progreso, y "Cambiar de perfil".

---

## Dudas resueltas por defecto

| Duda | Queda así |
|---|---|
| ¿Frailejón como personaje? | sí, con nombre provisional (D7) |
| Premio: ¿periodicidad, tope, monto fijo? | mensual, sobre lo guardado todo el mes, tres tasas con $1 por cada $10 por defecto, sin tope adicional: el saldo del niño ya lo acota la mesada (D4) |
| Privacidad: ¿el tutor ve cada movimiento o solo totales? | ve cada movimiento, como muestra el handoff ("Gastó $3.000 en un helado") |
| Autonomía: ¿cambia su reparto y mueve entre frascos sin permiso? | el reparto lo fija el tutor; mover entre frascos lo decide un interruptor del tutor, activo por defecto ("Decidir también es parte de aprender") |
| ¿Uno o varios tutores? | uno, como hoy |
| Tema del perfil niño | oscuro por defecto, como el adulto (D5) |
| Edades: ¿un contenido o dos tramos? | un solo contenido de 7 a 12, con prueba de ubicación desde los 10 (D9) |

## Pregunta P1

**P1. "Olvidé mi PIN" con niños en el dispositivo.** El 063 D7 resuelve el olvido borrando todo, tras la misma confirmación de "Borrar todos mis datos". Con perfiles, esa salida queda en la pantalla del PIN, que un niño de 7 a 12 años abre al tocar el perfil adulto, y la confirmación se puede leer y aceptar. **Recomendación:** desde "¿Quién usa Finko?" y desde el cambio de perfil, la salida pide escribir una palabra de confirmación y dice que también se borran los perfiles de los niños; el resto del 063 D7 no cambia. Resuelta el 2026-10-24, ver abajo.

---

## Alternativas descartadas

- **Alcancía o cerdito como personaje:** genérico. **Colibrí:** dice energía, no ahorro. **Oso de anteojos:** lindo, pero sin metáfora.
- **Segunda fuente redondeada para niños:** rompe la regla de una sola fuente autoalojada y suma peso a la PWA.
- **Emojis en el modo niño:** cambian según el sistema operativo y no siguen los tokens.
- **Fotos en metas y avatares:** pesan en el almacenamiento y no hacen falta.
- **Tema propio para el niño** en vez de clase sobre el tema activo: duplicaría los dos temas y abriría una paleta paralela.
- **Mover dinero de verdad** (cuentas del niño, transferencias): Finko no tiene servidor ni cuentas (ADN 3) y no las tendrá por esto.

---

## Consecuencias

### Positivas

- La familia usa el mismo teléfono sin que el niño vea las finanzas del adulto.
- El niño practica con dinero real que existe fuera de la app, y el tutor ve el mismo hecho en sus Gastos sin anotarlo dos veces.
- El sistema visual crece por suma: ningún token adulto cambia.

### Negativas / Restricciones

- **El candado sigue sin cifrar.** Quien abra `fk_v1` lee los datos de todos los perfiles; el 063 ya lo dice y la pantalla también.
- **Bump de schema** con `perfiles[]` y, por niño, frascos, mesada, metas, premio y progreso. Migración idempotente: una instalación sin niños queda igual.
- **Los respaldos y la exportación** incluyen los perfiles de los niños; el niño no puede exportar.
- **CFG.6** (auditoría de Ajustes) hereda el bloque Familia y lo audita con el resto.

---

## Rebanadas

| Rebanada | Qué entrega | Depende de |
|---|---|---|
| APR.3a | Perfiles en `S`, "¿Quién usa Finko?", cambio con PIN, candado obligatorio al primer niño | Fase 1 del 092 |
| APR.3b | Tokens `.kid`, Frai en sus cuatro poses y el catálogo de ilustraciones por el pipeline `il-` | APR.3a |
| APR.3c | Shell del niño: barra de cuatro destinos, Inicio, ruta en camino, lección con Frai y celebración | APR.3b |
| APR.3d | Alcancía: tres frascos, metas y "Yo" | APR.3c |
| APR.3e | Tutor en Ajustes, Familia: alta del niño, mesada como gasto Familia, premio, progreso del niño | APR.3d |
| APR.3f | Contenido del niño, una rebanada por unidad, con revisión pedagógica | APR.3c |
| APR.4b | Perfil niño en escritorio y tableta | APR.3d |

---

## Resolución de P1 (2026-10-24)

La recomendación se aceptó en chat tal como estaba escrita ("Acepto la recomendación de P1 del ADR 093 tal como está escrita").

| | Decisión | Efecto en el tablero |
|---|---|---|
| P1 | Con perfiles de niño, "Olvidé mi PIN" desde "¿Quién usa Finko?" y desde el cambio de perfil pide escribir una palabra de confirmación y dice que también se borran los perfiles de los niños. Sin niños, el 063 D7 queda exactamente como está. El 063 no se reescribe: este ADR lo acota | APR.3a deja de esperar una decisión y lo implementa; solo sigue atada al cierre de la Fase 1 del 092 |
