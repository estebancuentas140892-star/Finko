# ADR 092 - Aprende y aplícalo: la capa de aprendizaje del adulto

**Estado:** Propuesta (2026-10-24). La implementación iba a esperar a las fichas 17 y 19 de MOV.1; **ese mismo día se decidió en chat arrancar la Fase 1 ya**, siguiendo el handoff tal cual: ver "Resolución del 2026-10-24" al final. APR.1a cerrada. Las dudas del handoff se resolvieron por defecto con la propuesta del diseño, en la misma conversación, y quedan revisables: ver "Dudas resueltas por defecto". El perfil niño, el tutor y los perfiles en el mismo dispositivo viven en el [ADR 093](093-perfiles-en-el-dispositivo-y-modo-nino.md).
**Fecha:** 2026-10-24
**Autores:** Claude Design (handoff "Finko · Aprende y aplícalo", 35 tableros, octubre 2026), Claude Opus 5.5 (triaje y redacción)
**Relación:** **acota el [ADR 032](032-logros-v2-niveles-y-habitos.md) D6**: "Tu progreso" deja el apartado de Análisis y la tarjeta compacta de Inicio que le dio LG.2d. Aplica a Inicio el patrón del [ADR 069](069-bloque-gastos-en-la-barra-movil.md) D2 (regla candidata R81). Conserva enteros el [024](024-reorganizacion-navegacion-movil.md), el [065](065-ahorro-en-la-barra-inferior.md) y el [069](069-bloque-gastos-en-la-barra-movil.md) (la barra móvil no cambia), el 032 D2 y D5 (anti-trampa, niveles derivados, sin puntos de experiencia), el [049](049-fondo-de-emergencia-v2.md) D2 y el [084](084-fondo-el-compromiso-del-periodo-en-la-primera-pantalla.md) (Fondo), y el [087](087-inicio-en-movil-tambien-avisa-y-no-resume.md) (Inicio no crece). Tarjetas: [`board/transversal.md`](../board/transversal.md), bloque APR.

---

## Contexto

Finko existe para personas con poco conocimiento financiero (CLAUDE.md, sección 0), pero hoy enseña en piezas sueltas: el banner de propósito de cada sección ([ADR 016](016-banner-proposito-de-seccion.md)), la educación antes de repartir ([ADR 061](061-educacion-antes-de-repartir.md)) y explicaciones puntuales como la del CDT en Inversión (R65). No hay ruta, no hay práctica y nada une lo que aprendes con tus propios datos.

El handoff propone una capa de aprendizaje con una regla central: **cada lección termina en la sección donde se aplica, con tus datos** ("Aplícalo"), y al revés, cada sección ofrece su lección en el momento en que sirve. Se leyó contra `DESIGN_SYSTEM.md` (R1 a R75), `tokens.css`, `themes.css` y los ADR 022, 024, 032, 049, 063, 065, 069, 084 y 087.

**Premisa corregida.** El handoff da por hecho que "Tu progreso" vive en Ajustes y que esta iniciativa ejecuta LG.2d. LG.2d cerró el 2026-08-13: hoy "Tu progreso" es un apartado colapsable de Análisis (`#panel-analisis-progreso`) más una tarjeta compacta en el bento de Inicio (`#panel-progreso-inicio`), y el [ADR 022](022-vitrina-de-logros-en-ajustes.md) ya está Superado. Lo que este ADR mueve es eso, y por eso **acota** el 032 D6 en vez de ejecutarlo.

---

## Decisión

### D1. Inicio pasa de sección a bloque con tres lentes

La barra móvil no cambia: `Inicio · Gastos · [Registrar] · Ahorro · Más`. Inicio deja de nombrar una sección y nombra un bloque, igual que Gastos (069 D1). Hay un miembro dominante, así que la portada **es** ese miembro y los otros dos se enseñan con la franja de pestañas que lleva su estado encima (R81).

| Lente | Qué contiene | Estado en la pestaña | Hash |
|---|---|---|---|
| Hoy (portada) | el Inicio actual: saldo, Atención hoy, Tu siguiente paso (D5), pendientes del mes | avisos del día ("1 aviso") | `#dash`, sin cambio |
| Aprende | la ruta de nueve unidades y sus lecciones (D8) | duración de la siguiente lección ("3 min") | nuevo |
| Tu progreso | nivel, lo que sabes, lo que haces, semanas activas (D4) | nivel actual ("Constante") | nuevo |

El bloque es una capa de navegación, no un contenedor de estado (069 D1): cada lente es una sección con hash propio y ninguna sección existente cambia de dueño. Aprende es un dominio nuevo (`modules/dominio/aprende/`); "Tu progreso" lo sigue pintando el dominio `logros` en un contenedor del shell (ADN 10, mismo mecanismo del ADR 022 y de LG.2d).

### D2. Escritorio sin lentes

Igual que con el bloque Gastos, en escritorio la barra lateral ya lista los destinos y repetir la navegación con pestañas es lo que el [ADR 056](056-la-casa-de-ahorro.md) vino a cerrar. **"Aprende" entra al grupo "Día a día" después de Inicio** y **"Tu progreso" entra a "Cómo voy", junto a Análisis**. El encabezado de escritorio suma "Cambiar de perfil" junto al nombre solo cuando existen perfiles de niño (ADR 093).

### D3. Un solo sistema de progreso

- **Cada unidad terminada es un logro** de una familia nueva, "Lo que sabes", y cuenta igual que un logro por acción hacia `NIVELES_USUARIO`. No hay puntos de experiencia: serían una segunda economía que balancear (032 D5 ya la descartó).
- **Una unidad suma una vez.** Repasar no suma: es la regla anti-trampa de este ADR, extensión del 032 D2.
- **Las unidades marcadas "Ya lo sabes" por la prueba de ubicación cuentan** (D9).
- **Semanas activas en vez de rachas.** Se acumulan las semanas en que registraste algo o hiciste una lección; solo informan y nunca vuelven a cero. Las rachas que se pierden están prohibidas por producto.
- Los ids de los logros nuevos son valores persistidos en `S.logros`: nunca se renombran (riesgo ya escrito en `contexto/logros.md`).

### D4. "Tu progreso" se muda a una lente propia (acota el 032 D6)

- **Sale el apartado colapsable de Análisis.** Análisis interpreta tu dinero; Tu progreso te interpreta a ti. Junto a Análisis en escritorio, no dentro.
- **Sale la tarjeta compacta del bento de Inicio**, y su celda la ocupa "Tu siguiente paso" (D5): Inicio no crece (ya mide 1.492 px en móvil, ADR 087).
- La lente muestra, en este orden: el nivel con la escala de niveles y cuántos pasos faltan para el siguiente; **Lo que sabes** (unidades de 9 y en qué lección vas); **Lo que haces** (logros por acción, los tres últimos con fecha y el próximo con su avance); y las **semanas activas** con su línea de lectura (R75).
- Si las fichas 17 o 19 de MOV.1 deciden algo incompatible con esta lente, el choque se resuelve con un ADR que acote este, nunca en silencio.

### D5. "Tu siguiente paso" reemplaza la tarjeta compacta de logros en Inicio

Elige **una sola cosa**: una lección, si hay datos para aplicarla ("Este mes hiciste 31 compras de menos de $20.000. ¿Sabes cuánto suman juntas?"), o una acción: la que quedó pendiente de un Aplícalo o el dato que falta (R57). Lleva el enlace "Ver tu ruta". Cuando es una acción, el botón dice el monto (R50) y ofrece "Repasar la lección" como salida secundaria.

### D6. La sección ofrece su lección

Componente nuevo: **una fila bajo el bloque protagonista de la sección**, con un dato real del usuario ("Con tus gastos fijos, 3 meses son $5.250.000 y 6 meses, $10.500.000"). Máximo una por sección. Al terminar la lección, la fila baja al pie como "Repasar" y deja de ocupar la primera pantalla (R65). Las lecciones nunca duplican una pantalla: enlazan a la sección.

Primer caso: Fondo de emergencia, debajo de la franja de cobertura y de sus acciones, que no cambian (084; el aporte sigue como acción secundaria por el 049 D2).

### D7. Anatomía de la lección

- **Pantalla completa, sin barra.** 5 o 6 pasos, una idea por pantalla, contador "n de N". Salir conserva el avance.
- **Tipos de ejercicio:** concepto, elegir una opción, clasificar deslizando (con botones "Es" / "No es" como alternativa obligatoria), mover un control (el resultado se recalcula en vivo), ordenar pasos (arrastre y flechas) y "¿qué harías?".
- **Retroalimentación:** correcto usa `--fk-success` ("Así es"); "casi" usa `--fk-info` ("Casi"), el semántico que el sistema ya define como educativo. **Nunca rojo.** La respuesta correcta y la tuya se marcan con texto ("Esta es", "Tu respuesta"), no solo con color (R49).
- **Equivocarse no quita nada:** la pregunta vuelve al final y la pantalla lo dice.
- **Aplícalo cierra toda lección** con un dato del usuario y un botón a su sección que dice el monto ("Poner un límite de $150.000", R50), más "Ahora no". Si el dato no existe, el Aplícalo lo pide en su lugar (R57).
- **Celebración proporcional:** lección terminada, un chulo; unidad terminada, una insignia de 56 px junto al texto en el color de la unidad. Sin personaje y sin confeti por lección en el adulto. Un hito (ruta terminada) reutiliza el confeti existente de LG.2.
- Las reglas vigentes aplican dentro de la lección: R6 (las compras de la lección hormiga van en el naranja de gastos, no en verde), R8 (pagar viste su dominio), R69 ("1 mes y 2 semanas", "$1 por cada $10").

### D8. La ruta del adulto: nueve unidades abiertas

La capa Aprende **no estrena color**: cada unidad viste el color de la sección donde se aplica ([ADR 031](031-identidad-de-color-por-seccion.md)), así la ruta anticipa a dónde te lleva el Aplícalo. El avance usa el acento, que ya está reservado para progreso.

| # | Unidad | Termina en | Lecciones |
|---|---|---|---|
| 1 | Tu dinero hoy | Inicio y Mis cuentas (propuesto) | por escribir |
| 2 | Repartir tu ingreso | Repartir ingreso, asistente 50/30/20 (propuesto) | por escribir |
| 3 | Gastos hormiga y límites | Límites | 4: Lo pequeño también suma; Encuentra tus gastos hormiga; Un límite que sí puedas cumplir; Repaso: tu mes en hormigas |
| 4 | Fondo de emergencia | Fondo | 4 |
| 5 | Metas y reservas | Metas | 3 |
| 6 | Deudas y gota a gota | Por pagar (propuesto) | por escribir |
| 7 | Crédito e intereses | Por pagar | 4 |
| 8 | Invertir: CDT, interés compuesto y regla del 72 | Inversión | 4 |
| 9 | Impuestos: 4x1000, UVT y renta | Análisis | 3 |

- **Nada se bloquea.** La ruta recomienda ("Unidad 3 · vas aquí") y el adulto abre cualquier unidad: quien ya sabe no debería esperar.
- **Lista de pasos, no camino ilustrado.** El zigzag infantiliza; queda para el niño.
- Una unidad que tus datos vuelven urgente lo dice en la ruta ("Te sirve ya: tienes 2 deudas").
- El único contenido completo que trae el handoff es la unidad 3 (cinco pantallas de la lección 2 y el Aplícalo con Límites). El resto se escribe en su rebanada.

### D9. Prueba de ubicación

Opcional al empezar Aprende: preguntas de opción múltiple con "Todavía no lo sé" como respuesta válida. Las unidades respondidas bien quedan como "Ya lo sabes", siguen abiertas para repasar y cuentan en Tu progreso (D3). El resultado dice dónde empiezas ("Empiezas en la unidad 3") y ofrece "Prefiero empezar desde la unidad 1".

### D10. Siete filas nuevas en el catálogo de animación

Catálogo cerrado de DV.2c. Todas responden "¿qué acaba de pasar?" o "¿a dónde entré?". Solo `transform` y `opacity`, una sola vez, curva `cubic-bezier(0.2, 0.8, 0.2, 1)`. Con `prefers-reduced-motion: reduce` el cambio es inmediato y donde hay celebración queda el estado final estático. **Nada usa `infinite`**; sigue prohibido sacudir la pantalla al fallar.

| Fila | Momento | Qué se mueve | Duración |
|---|---|---|---|
| `stepIn` | siguiente pantalla de la lección | entra 24 px desde la derecha y aparece | 200 ms |
| `feedbackIn` | respuesta revisada | el panel sube 16 px y aparece; el foco pasa a su título | 200 ms |
| `cardOut` | tarjeta clasificada | `translateX(±110%) rotate(±8deg)` y se desvanece, también con botones | 220 ms |
| `checkIn` | lección terminada | el chulo pasa de `scale(.6)` a 1 | 250 ms |
| `badgeIn` | unidad terminada | la insignia gira de -8° a 0 y crece de .8 a 1 (los destellos son solo del niño) | 250 ms |
| `pathFill` + `nodeUnlock` | volver a la ruta con avance | el tramo se llena (`scaleY` desde arriba) y el nodo siguiente crece de .9 a 1 | 250 y 220 ms |
| `kidPress` | botón del niño presionado | baja 2 px sobre su canto (ADR 093) | 120 ms |

Reutilizaciones, sin fila nueva: el llenado de barras en vertical (frascos y metas), la entrada de lista para la siguiente tarjeta a clasificar, el confeti de LG.2 para los hitos y el fundido del cambio de tema (CFG.7) para el cambio de perfil.

### D11. Técnica, sin servidor y sin librerías

- **Lecciones como módulos de datos dentro del paquete** (`modules/dominio/aprende/lecciones/`), uno por unidad, cargados con `import()` al abrir la lección para no tocar el arranque y precacheados por el service worker. Módulo `.js` con `export default` y no `.json`: es el mismo mecanismo de módulos de toda la app y no depende de los import attributes.
- **Estado nuevo en `S`, pequeño:** lecciones hechas por id con su fecha, unidades sabidas por la prueba de ubicación y semanas activas como conjunto de semanas. Bump de schema con migración idempotente (ADN 6). Las semanas activas se persisten y no se derivan porque deben ser monótonas: borrar un gasto no puede restar una semana (mismo criterio que `S.logros`, donde la persistencia manda).
- **Ningún dominio importa a otro.** Los datos que pide un Aplícalo se leen de `S` o de helpers de `infra/`. Si Aprende necesita el cálculo de gasto hormiga (`gastoHormigaMes()`, hoy en `logros/logic.js`), ese cálculo se muda a `infra/` y los dos dominios lo leen de ahí: no se duplica. Los botones del Aplícalo navegan por hash o emiten un evento, como `movimientos:ver` en el 069 D8.
- **Las ilustraciones van en el mismo sprite** que los íconos, por el pipeline que dejó DV.2d (`scripts/sync-sprite.py`, prefijo `il-`).
- **Accesibilidad:** clasificar tiene botones además del gesto; ordenar tiene flechas; la retroalimentación se anuncia una sola vez con `role="status"` (R24) y el foco pasa al título del panel.

---

## Dudas resueltas por defecto

El handoff cerró con catorce dudas. Se adoptó en todas la propuesta del diseño o, donde el diseño no proponía, la lectura más conservadora; cada una se puede reabrir con una línea en chat. Las del perfil niño están en el ADR 093.

| Duda | Queda así |
|---|---|
| ¿Inicio con tres lentes o Aprende en la barra reabriendo el 065? | tres lentes (D1) |
| ¿Recalibrar `NIVELES_USUARIO` (0, 3, 6, 10, 14, 16)? | se conservan los umbrales. El catálogo pasa de 18 a 27 pasos posibles y el tramo superior se vuelve más alcanzable, no menos; el test "alcanzable sin el 100 % del catálogo" sigue mandando. Se revisa con datos reales |
| ¿Cuentan las unidades "Ya lo sabes"? | sí (D3, D9) |
| Cifras que cambian cada año en la unidad 9 (UVT, topes de renta, 4x1000) | la lección lee las constantes de `core/constants.js`, nunca cifras escritas a mano, y se revisa con la tarjeta anual E.2 |
| Revisión pedagógica | ninguna unidad se publica sin una revisión de sus textos registrada en su tarjeta |
| Gota a gota: tono y enlaces | tono informativo, sin alarma. Solo se enlazan líneas de denuncia o ayuda verificadas y con fecha de revisión, como las constantes legales (ADN 12) |
| Tope del gasto hormiga ($20.000) | lo configura el usuario en Límites, con $20.000 por defecto (`UMBRAL_GASTO_HORMIGA`). El mismo tope se aplica a todos los meses que se comparan, así que cambiarlo no regala el logro `hormiga-a-raya`; lo defiende un test |
| Orden de la ruta adulta | unidades abiertas con recomendación (D8) |

---

## Alternativas descartadas

- **Aprende como sexta pestaña.** A 320 px cada lugar mide 53 px y "Registrar" no cabe. Material e iOS recomiendan cinco como máximo.
- **Aprende en lugar de Ahorro.** Reabre el ADR 065 a dos meses de aceptado, y Ahorro es donde terminan cuatro de las nueve unidades.
- **Registrar como botón flotante** para liberar un lugar. Flotaría sobre la columna de montos, que en Finko vive a la derecha de cada fila, y revierte el corazón del ADR 024.
- **Aprende dentro de "Más".** No cabe bajo ningún rótulo de la hoja (su regla 4), deja la ruta colgando de un enlace (R32) y dice que aprender es secundario.
- **Puntos de experiencia aparte de los logros.** Segunda economía; el 032 D5 ya la descartó.
- **Rachas que se pierden.** Prohibidas por producto; las reemplazan las semanas activas.
- **Ruta en zigzag para el adulto.** Infantiliza.
- **Bloquear unidades al adulto.** Quien ya sabe no debería esperar.
- **Dejar "Tu progreso" en Análisis** y sumar Aprende aparte. Mezcla una sección que interpreta el dinero con una que interpreta a la persona, y deja dos superficies de progreso (la de Análisis y la de la ruta) contando cosas distintas.

---

## Consecuencias

### Positivas

- Lo que Finko enseña queda unido a lo que el usuario hace: cada lección termina en una acción con monto y cada sección ofrece su lección cuando sirve.
- La barra móvil, los tokens, la fuente y la iconografía no cambian. El adulto no estrena colores.
- Un solo sistema de progreso: lo que sabes y lo que haces suben el mismo nivel.

### Negativas / Restricciones

- **El contenido es el cuello de botella real**, no el código: unas 33 lecciones con revisión pedagógica, y el handoff solo trae la unidad 3.
- **`[href="#dash"]` deja de ser único en el DOM** (barra, franja de pestañas): todo selector nuevo declara su contexto, como obligaron el 065 y el 069.
- **Análisis pierde su último apartado no financiero** y Logros cambia de superficie por segunda vez: `contexto/logros.md`, `contexto/analisis.md` e `contexto/inicio.md` se actualizan en la rebanada que lo mueve.
- **Bump de schema** y precache del service worker más grande: el presupuesto de Lighthouse 100 sigue siendo compuerta.

---

## Rebanadas

Fase 1 (adulto) es el primer alcance de implementación. Ninguna arranca antes de que cierren las fichas 17 y 19 de MOV.1.

| Rebanada | Qué entrega | Depende de |
|---|---|---|
| APR.1a | Dominio `aprende`: motor de lección (seis tipos de ejercicio, retroalimentación, la pregunta vuelve), estado en `S` con migración, carga con `import()`, precache, filas de animación de la lección | fichas 17 y 19 de MOV.1 |
| APR.1b | Unidad 3 completa con su Aplícalo en Límites; el tope hormiga configurable | APR.1a |
| APR.1c | Inicio como bloque de tres lentes, lente Aprende (ruta), Tu siguiente paso, entradas de escritorio | APR.1a |
| APR.1d | Tu progreso como lente propia: familia "Lo que sabes", semanas activas; sale de Análisis y del bento | APR.1c |
| APR.2a | Componente "la sección ofrece su lección", empezando por Fondo | APR.1b |
| APR.2b | Prueba de ubicación | APR.1d |
| APR.2c | Contenido de las unidades 1, 2 y 4 a 9, una rebanada por unidad al empezarla, cada una con revisión pedagógica | APR.1b |
| APR.4a | Aprende y la lección en escritorio (ruta, detalle de la lección elegida y "Termina en") | APR.1d |

---

## Resolución del 2026-10-24: la Fase 1 arranca sin esperar a MOV.1

Pedido en chat: "vamos con la siguiente fase", y ante la pregunta de qué fase, "tal cual como recomienda el HTML". El handoff no condiciona Aprende a la auditoría móvil, así que la espera por las fichas 17 y 19 se levanta para toda la Fase 1 (APR.1a a APR.1d).

| Efecto | Detalle |
|---|---|
| Fichas 17 y 19 de MOV.1 | dejan de bloquear. Cuando lleguen, se releen contra lo que APR.1d haya movido de "Tu progreso"; un choque se resuelve con un ADR que acote, como dice D4 |
| Despliegue | cada rebanada se sube a `main` al cerrar sus compuertas, para verla en producción |
| APR.1a, cómo quedó | la lección 2 de la unidad 3 se entregó primero porque el handoff la trae completa; las lecciones 1, 3 y 4 pasan a APR.1b. En escritorio la ruta ya tiene su fila en "Día a día"; en móvil se llega por `#aprende` hasta APR.1c |
| APR.1c y APR.1d, juntas | la pestaña "Tu progreso" necesita su lente, así que salieron en un solo paso. Las unidades suman al nivel desde `S.aprende.hechas` (primera fecha, no se revoca) y no entran a `S.logros`; las semanas activas son las guardadas más las semanas con gastos |
| Desvío consciente del texto del diseño | el cierre de la lección describe el logro "Hormiga a raya" con su regla real (bajar del promedio de los tres meses anteriores, ADR 032), no con la del mockup ("mantenerte bajo el límite"), que no existe |
