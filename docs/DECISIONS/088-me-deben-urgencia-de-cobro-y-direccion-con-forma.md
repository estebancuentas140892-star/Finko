# ADR 088 - Me deben: urgencia de cobro en la lista, dirección con forma en Inicio

**Estado:** Aceptada. Ficha 14 de la auditoría móvil (MOV.1), implementada el 2026-08-21.
**Fecha:** 2026-08-21
**Autores:** Esteban (producto), Claude Design (auditoría), Claude Opus 5 (análisis e implementación)
**Relación:** cierra la ficha 14 de MOV.1 sobre el dominio `personales`. **Usa sin tocar** el [ADR 047](047-me-deben-v2-estados-y-rendimiento.md) (los cinco estados y su copy) y el [ADR 074](074-me-deben-adopta-la-anatomia-de-deudas.md) (anatomía de la tarjeta y corte "Ya te pagaron"). **Toca la fila compartida** de la tarjeta fusionada del [ADR 070](070-inicio-centro-de-atencion-en-escritorio.md) D8/D9. **No reabre** la reserva de color del [ADR 031](031-identidad-de-color-por-seccion.md) (rosa para Me deben, frambuesa para Deudas) ni la ubicación en "Más" decidida por la ficha 03.

---

## Contexto

La ficha 14 levantó cuatro hallazgos. Los dos que se corrigen acá tienen la misma raíz: **el dominio ya calculaba lo que hacía falta y no lo usaba para decidir nada.**

| Id | Hallazgo | Severidad |
|---|---|---|
| D1 | Reservar el rosa no distingue direcciones: dentro de Me deben todo entra, y donde de verdad conviven (Inicio) el reparto de color no llega | Crítico |
| D2 | La lista se ordena por antigüedad del desembolso y no por lo que decide el cobro | Alto |
| D3 | Un préstamo sin cuenta vinculada no cuenta como patrimonio y nada en la fila lo dice | Medio |
| D4 | El resumen aparece con 2 préstamos y el historial por persona con 2 del mismo: dos umbrales sin relación | Bajo |

- **D2 es el sexto caso de R89a, con el perfil de Reservas:** `estadoPrestamo()` clasifica en `vencido / hoy / proximo / abonado / pendiente / liquidado` y `clasificarAntiguedad()` da el tono. Los dos existen, los dos alimentan solo al chip de la fila, y ninguno ordena. Con cinco préstamos, el que ya venció podía quedar debajo de cuatro sin fecha pactada.
- **D1 no es un problema de paleta, es de canal.** El color ya está comprometido en decir **de qué dominio** es la fila, y el rosa de personales significa "préstamo entre personas", no "entra". En el panel de prioridades de Inicio (el único sitio de la app donde lo que te deben y lo que debes se ven en la misma lista) la única diferencia entre las dos direcciones eran dos palabras en un badge de 11px.
- **D3 es una asimetría con dueño en otra sección:** `calcularTotalPorCobrar()` filtra por `cuentaId` antes de sumar, así que dos préstamos idénticos en la lista pesan distinto en el patrimonio de Análisis. La regla del código es correcta (no salió de ninguna cuenta registrada); lo que faltaba era decirlo donde se ve.

---

## Decisión

### D1. La lista se ordena por urgencia de cobro, con divisores

`agruparPersonalesPorUrgencia()` en `logic.js` reparte los seis tipos del clasificador y la vista nombra los grupos. El orden entre grupos es el del cobro; dentro de cada uno manda "más viejos primero", que es el criterio de hoy (`ordenarPersonales('antiguo')`) y sigue siendo el correcto a igualdad de urgencia. Los liquidados cierran la lista con su rótulo "Ya te pagaron" (regla R21, ADR 074 D4).

| Grupo | Tipos que caen ahí | Rótulo |
|---|---|---|
| `vencidos` | `vencido` | La fecha ya pasó |
| `vencenHoy` | `hoy` | La fecha es hoy |
| `sinFecha` | `abonado`, `pendiente` | Sin fecha pactada |
| `adelante` | `proximo` | Con fecha por delante |
| `liquidados` | `liquidado` | Ya te pagaron |

**Cuatro grupos activos y no tres, que es lo que la ficha pedía.** El préstamo que vence hoy lleva el chip "Vence hoy" (ADR 047): meterlo bajo un rótulo que diga que la fecha ya pasó sería contradecirlo en la misma pantalla, y mandarlo a "Con fecha por delante" lo hundiría por debajo de préstamos menos urgentes. La regla 11 del ADN (lenguaje honesto) decide el empate.

**Los divisores aparecen desde dos préstamos**, el mismo umbral del resumen: con uno solo el rótulo describiría la lista entera y añadiría un renglón sin dividir nada. Es la condición que la ficha aceptó de Reservas.

### D2. El préstamo sin cuenta vinculada declara que es solo seguimiento

Un chip más en las notas de la fila: **"Solo seguimiento: no salió de ninguna cuenta"**, en `chip chip-warning` (ámbar de aviso, no rojo de error). No es un fallo del usuario: es una elección válida que tiene una consecuencia fuera de esta lista. No aparece en un préstamo liquidado, que ya no afecta al patrimonio.

La redacción final depende de cómo Análisis presente "Por cobrar" y se verifica en la ficha 16. Lo que esta decisión fija es que **la marca existe**; su texto puede cambiar ahí.

### D3. La dirección del dinero se señala con forma, en las dos tarjetas de obligaciones

Cada fila lleva dos señales redundantes, las dos de forma y ninguna de color:

- una flecha en la esquina de la teja: `↙` para lo que entra, `↗` para lo que sale;
- un signo en el monto: `+$150.000` frente a `-$300.000`, con el signo ASCII y la misma convención que la lista de Movimientos (`esIngreso ? '+' : '-'`).

**Un apartado no lleva ninguna de las dos.** Su fecha objetivo no le mueve dinero a nadie: pasa dinero de un bolsillo tuyo a otro. Es el mismo `neutro` que Movimientos deja sin signo.

**Se aplica también a la tarjeta fusionada de escritorio** (ADR 070 D8), no solo al panel móvil. Las dos mezclan direcciones con el mismo defecto, la fila es la misma anatomía y un helper local (`_direccionFila()`) las sirve a las dos: dejar la flecha solo en móvil habría hecho que la señal apareciera y desapareciera al cambiar de ancho.

### D4. Lo que no se mueve

La ubicación en "Más → Tu dinero" (R84 verificada, no heredada), el nombre "Me deben", toda la copia del dominio, el resumen y sus cuatro cifras, el historial por persona sin puntajes, el reloj de incomodidad que un abono reinicia, el modelo de interés simple, el estado vacío, el origen no reeditable y la reserva de color del ADR 031. **Ningún token nuevo.**

D4 de la ficha (los dos umbrales de aparición) se anota para el cierre sin cambio: los dos criterios son individualmente correctos y están razonados en el código.

---

## Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| Distinguir la dirección con un color propio (verde entra, rojo sale) | El color ya dice de qué dominio es la fila. Dos significados en el mismo píxel se anulan, y el rosa de personales tendría que dejar de significar lo que la app entera le enseñó al usuario |
| Reabrir la reserva del rosa de la ficha 05 | Sigue siendo correcta dentro del bloque Gastos. El problema no era el reparto de matices, era que ningún matiz llega al único sitio donde las dos direcciones conviven |
| Tres grupos exactos, metiendo "vence hoy" en "La fecha ya pasó" | La fila dice "Vence hoy". El rótulo diría lo contrario a dos centímetros de distancia |
| Ordenar por `clasificarAntiguedad()` en vez de por `estadoPrestamo()` | La antigüedad mide incomodidad, no urgencia de cobro: un vencido es vencido aunque sea reciente. Es la distinción que el ADR 047 escribió y que este orden respeta |
| Divisores siempre, incluso con un préstamo | Un divisor divide. Con una sola fila el rótulo es un renglón que no informa, en una sección que a veces tiene tres |
| Pintar el aviso de "solo seguimiento" en `chip-danger` | Convertiría una elección válida en un error del usuario. El selector de cuenta es opcional a propósito |
| Hacer que el préstamo sin cuenta sí sume al patrimonio | Cambia la definición de activo, que es de Análisis y está razonada: no salió de ninguna cuenta registrada. Esta decisión informa, no legisla sobre la otra sección |
| Añadir un símbolo nuevo al sprite para las flechas | `#i-trending-up` y `#i-trending-down` significan tendencia, no dirección, y un símbolo nuevo es un componente nuevo. Un glifo de texto hereda el color de la teja, escala con la tipografía y no toca el sprite |
| Dejar la flecha solo en el panel móvil | La fila es la misma en la tarjeta fusionada de escritorio y mezcla las mismas direcciones. La señal aparecería y desaparecería al cambiar de ancho |

---

## Consecuencias

- **Cobrar al que más urge cuesta los mismos dos toques, sin leer los chips uno por uno:** el que urge está bajo el primer divisor.
- **La lista pasa a responder la pregunta de la sección** (a quién le recuerdo) en vez de la del desembolso (cuándo presté).
- **En Inicio, la dirección del dinero se lee sin color.** La señal sobrevive al gris, al daltonismo y al modo de alto contraste, que es el argumento entero de la candidata R90.
- **Los divisores añaden hasta cuatro renglones** a una lista que a veces tiene tres filas. Se acepta con el umbral de dos préstamos.
- **`_direccionFila()` es la primera pieza compartida entre las dos tarjetas de obligaciones** desde que el ADR 070 D8 las fusionó en escritorio. Vive en el mismo archivo que las dos filas, así que no cruza dominios (ADN 10).
- **Candidata R90:** la dirección del dinero se señala con forma, no con color. Dos apariciones, pero del mismo defecto visto dos veces, así que se anota **con esa cautela declarada**: las fichas 15 (Movimientos) y 16 (Análisis) son las que la confirman o la tumban, y de ellas depende su alcance (regla general o arreglo local del panel de prioridades).
- **Lo que va al cierre (ficha 18):** el alcance de R90; que "Tu dinero" agrupe por tema y no por uso (sin reabrir la ficha 03); la redacción final del aviso de solo seguimiento, que depende de Análisis; los dos umbrales de aparición de D4; y R87, que suma su segundo caso del mismo matiz (registrar un préstamo mueve dinero y crea un objeto duradero a la vez, igual que Inversión).
- **Corrección de un dato de la ficha:** dice que los accesos rápidos por defecto son `tesoreria · ahorro · presupuesto`. El código vigente, cambiado por la ficha 02, es `tesoreria · compromisos · personales`, así que Me deben **sí** llega como acceso por defecto. No cambia ninguna decisión.
