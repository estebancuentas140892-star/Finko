# ADR 085 - Límites: la lente contiene límites

**Estado:** Aceptada. Implementada en la ficha 12 de la auditoría UX/UI móvil (MOV.1).
**Fecha:** 2026-08-21
**Autores:** Esteban (producto), Claude Design (ficha 12 de la auditoría móvil), Claude Opus 5 (implementación)
**Relación:** **acota el [ADR 077](077-limites-de-gasto-tres-grupos-a-la-vista.md) en su D1 y su D4**: el reparto 5/7 de escritorio pierde su sujeto y la regla del botón único pierde su condición, las dos porque las dos tarjetas que repartía dejan de existir. **Conserva entero el [ADR 019](019-limites-por-rol.md)**, cuyo trato asimétrico por rol es justamente el argumento que resuelve esta ficha, reducido de tarjeta a línea. Cierra el hallazgo **G2** que la ficha 07 dejó abierto ([ADR 069](069-bloque-gastos-en-la-barra-movil.md) D8), con un alcance mayor del que aquella pudo enunciar. No toca el [ADR 044](044-motor-unico-de-sugerencia-por-categoria.md) ni el [ADR 045](045-base-de-calculo-del-disponible-para-limites.md).

---

## Contexto

La ficha 07 metió "Límites de gasto" al bloque Gastos como su tercera lente y dejó **G2** abierta con una sospecha: que el plan de tres grupos no cabía en el bloque porque uno de sus grupos se llama Ahorro.

El código dice algo más fuerte. La pregunta que resuelve G2 no es "¿molesta?" sino **"¿de dónde salen los datos de cada tarjeta?"**, y las importaciones del archivo la contestan:

| Tarjeta | Función que la alimenta | Dueño real |
|---|---|---|
| Los tres presupuestos | `sugerirDistribucionIngreso()` de tesorería | Mis cuentas, ficha 06 |
| Necesidades, desglose | `desgloseNecesidadesDelMes()`, filtrando `fijo` + `deuda-entidad` + `deuda-personal` | Por pagar, ficha 05 |
| Ahorro, desglose | `desgloseAhorroDelMes(ahorro, metas, apartados, inversiones)` | Ahorro y sus cuatro hijas |
| Estilo de vida, sobres | `calcularProgreso()` sobre `gastosMes()` | Gastos, esta lente |

**Una de cuatro filas pertenece al bloque.** El filtro de Necesidades es la definición literal de "Por pagar" que fijó la ficha 05, y el desglose de Ahorro lista las cuatro hijas que las fichas 04, 09, 10 y 11 acaban de auditar.

Cinco hallazgos, y de ellos **dos ya estaban resueltos cuando esta ficha llegó a implementarse**: L2 (la lente leía `new Date()` e ignoraba el reloj del bloque) lo cerró la ficha 07 con `mesBloque()`, y la mitad de L4 (los motivos nombraban Calendario y Deudas) la cerró la ficha 05. Los tres vivos:

- **L1, crítico.** Dos de las tres tarjetas son vistas de solo lectura de contenido que vive en otro sitio, y ninguna permite hacer nada. El usuario que toca "Arriendo" ahí no puede pagarlo, cuando la lente de al lado sí deja.
- **L3, alto.** Lo que da nombre a la sección vive dentro de la tarjeta de Estilo de vida, después de dos tarjetas y un encabezado. Y hay algo más severo: `if (!dist) return _renderResumenGruposVacio(...)`, o sea que **sin ingreso registrado la lente entera caía a su estado vacío aunque el usuario tuviera topes puestos**. La función que no necesita ingresos quedaba supeditada a la que sí.
- **L5, medio.** `presupuestosActivos()` es un `filter` sin `sort`, así que los sobres salían en orden de creación, mientras `desgloseNecesidadesDelMes()`, **en el mismo archivo**, sí ordena por estado de pago y por monto.

---

## Decisión

### D1. Los topes suben a ser la lente entera

Se enciende el modo que el estado vacío ya renderizaba: los sobres bajo su propio título ("Límites por categoría"), con la olla finita, el intro, las filas-botón de R35 y las sugerencias del motor, en el mismo orden. **No se inventa nada: el modo existía y solo se encendía cuando no había plan.**

Y se rompe la dependencia de L3: **los topes dejan de necesitar un ingreso registrado para existir.** El propio código lo defendía en un comentario ("un usuario puede ponerle un tope a lo que gasta antes de registrar sus ingresos") mientras la puerta de arriba lo contradecía.

### D2. El plan del mes pasa de tres tarjetas a una franja de tres líneas

Los tres ratios se conservan, porque son lo único que dice si el plan del mes se está cumpliendo, pero como tres líneas con salida: Necesidades a "Por pagar", Ahorro a su casa, y **Estilo de vida a ninguna parte, porque es la lente en la que ya estás**. Decir "aquí" es más honesto que un enlace que no lleva a nada.

**Los desgloses desaparecen, no se pliegan.** Un plegable seguiría siendo un espejo, solo escondido.

Medido en la app a 390px: la franja cierra en **192px** contra los ~360 de las tres tarjetas, y la lente completa (franja, título, olla finita, tres sobres y las huérfanas) cabe sin desplazar.

**El trato asimétrico del [ADR 019](019-limites-por-rol.md) se conserva, reducido a lo que cabe en una línea:** Necesidades es siempre neutra (su porcentaje informa cuánto del ingreso consume, no un umbral de peligro), Ahorro celebra el excedente en verde, y solo Estilo de vida pinta ámbar y rojo. Ese trato es lo que resuelve G2: **de las tres tarjetas de una sección llamada "Límites de gasto", exactamente una se comportaba como un límite de gasto.** Las otras dos eran seguimiento de un plan, que es otra cosa.

**Los mensajes de grupo no se pierden con su tarjeta.** Vivían dentro de cada una; ahora suben encima de la franja (`_renderNudgesPlan()`). El de un fijo vencido es información que la lente no debe perder solo porque su tarjeta se fue.

### D3. Los sobres se ordenan por urgencia

`ordenarPresupuestosPorUrgencia()` nueva en `presupuesto/logic.js`: excedido, alerta, resto, y dentro de cada estado el porcentaje más alto arriba. **Sin divisores**, a diferencia de Metas y Reservas: la lista es corta y el borde del sobre ya dice su estado.

Es el quinto caso de R89a y el más limpio de todos: no hay que comparar dominios ni fichas, el ejemplo y el contraejemplo conviven en el mismo archivo.

### D4. Los motivos de "no lleva tope" enlazan su salida

Las tres cadenas de `_MOTIVO_SIN_TOPE` que apuntan a "Por pagar" pasan de texto muerto a enlace a `#compromisos`, a 44px (regla R4). Aparecen en la fila de una categoría **en la que el usuario está gastando** y donde busca control: mandarlo a un nombre sin puerta era peor ahí que en un estado vacío. Quinta aparición de R86, cuarto dominio.

### D5. Lo que esto acota del ADR 077, y por qué no es una reversión en silencio

- **D1 del 077** repartía la pantalla de escritorio en `span 5` (las dos tarjetas que se leen) y `span 7` (la que se opera, con sus topes dentro). Con las dos tarjetas retiradas, **ese reparto se queda sin sujeto**: no hay dos lados que repartir. Se retiran `.grupos-resumen__col`, `.grupos-resumen__grid` y sus reglas de `responsive.css`. Lo que el bloque de 1440px conserva es lo que valía por sí mismo y no dependía de las tarjetas: los sobres a dos columnas (D2 del 077) y las filas huérfanas a dos columnas.
- **D4 del 077** decía que mientras el primario del encabezado esté visible, el botón del pie se retira, y que en el estado vacío pasa lo contrario. **La regla se conserva y su condición desaparece:** ya no hay estado vacío por falta de plan, así que el primario del encabezado queda siempre visible y el CTA del pie se retira siempre. "Un botón siempre, nunca dos" se cumple sin la rama.
- **Lo que el 077 argumentaba y sigue en pie:** su D1 descartaba "poner los tres grupos en fila y bajar los topes a un bloque propio" porque ese bloque suelto es lo que el ADR 019 retiró, y porque la olla finita solo se sostiene si la relación con el presupuesto de Estilo de vida es visible. **Esta decisión no reinstala ese bloque suelto:** la olla finita viaja con los topes y sigue diciendo "tus límites cubren $X de los $Y de tu Estilo de vida", con el monto del grupo que la franja también muestra. La relación se conserva; lo que se va es la tarjeta que la envolvía.

Esto se decidió con Esteban el 2026-08-21, con las tres opciones sobre la mesa (dejarlo como está, mover todo el plan a Mis cuentas, o partir por naturaleza). No hay reversión en silencio: hay un ADR que acota, que es como el tablero pide resolver el choque entre una ficha móvil y un ADR de escritorio.

### D6. Lo que no se toca

- **El sobre y su anatomía**, sin glifo antepuesto al título porque el borde, la barra y la palabra "Excedido" ya dicen el estado.
- **La olla finita**, con su rama para cada caso, incluido el de topes que se pasan del presupuesto.
- **"Gastas acá y no tiene tope" como filas-botón** (R35): cada fila **es** el botón que abre el formulario con la categoría precargada.
- **Los umbrales 75% y 100%**, y que un tope no obligue a nada.
- **El formulario**, el asistente de distribución y **el panel de alertas de Inicio**, que sigue avisando y enlazando acá.
- **El nombre.** "Límites" se confirma, y es la primera vez que es cierto: la lente ya solo contiene topes. Descartados "Límites de gasto" (correcto pero no cabe en la fila de tres pestañas a 360px), "Presupuesto" (es el nombre interno del dominio y en la app significa el reparto de tres grupos, o sea que reinstalaría G2) y "Topes" (más preciso, pero la app entera dice "límite" en botones y copia).

---

## Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| Dejar las tres tarjetas como están | El bloque Gastos contendría un espejo de su propia lente hermana, a un toque, sin acciones y con otra anatomía |
| Mover todo el plan de tres grupos a Mis cuentas | Coherente con quién calcula el reparto, pero entierra el seguimiento mensual a dos toques dentro de "Más". Se descarta por frecuencia de consulta |
| Plegar los dos desgloses en vez de retirarlos | Un plegable sigue siendo un espejo, solo escondido, y el usuario que lo abre encuentra una lista donde no puede hacer nada |
| Retirar los tres ratios junto con las tarjetas | Se perdería la única vista que dice si el plan del mes se está cumpliendo. La franja conserva el dato y suelta el envoltorio |
| Ocultar las dos tarjetas solo bajo 1024px y conservarlas en escritorio | Deja la contradicción viva y duplica el mantenimiento: dos arquitecturas de información para la misma lente |
| Hacer que Estilo de vida también enlace a algún sitio, por simetría | Enlazaría a la pantalla en la que el usuario ya está. La asimetría es información, no un descuido |
| Ordenar los sobres con divisores, como Metas y Reservas | La lista es corta y el borde del sobre ya dice su estado. Los divisores ahí serían tres rótulos para cinco filas |
| Sugerir un monto en las filas de "no tiene tope" | Es otra decisión y tiene dueño: el motor del [ADR 044](044-motor-unico-de-sugerencia-por-categoria.md) |
| Resolver acá si el seguimiento de los tres grupos pertenece a Análisis | La ficha 16 no está auditada. Decidirlo desde acá sería legislar sobre ella |

---

## Consecuencias

- **El bloque Gastos deja de contener una copia muda de su lente hermana.** De importar de cuatro dominios pasa a uno propio (`gastosMes`) más una franja de referencia con enlaces.
- **Los topes dejan de depender de un ingreso que no necesitan.** Sin plan, lo único que falta es la franja: verificado en la app con `ingresos: []` y tres topes puestos.
- **Ver o editar un tope: los mismos dos toques, sin desplazar.** Los sobres cierran dentro de la primera pantalla.
- **El rótulo "Límites" pasa a ser verificable**: encabeza límites.
- **Escritorio pierde el reparto 5/7 y gana una sola columna de sobres a dos columnas.** Es el precio declarado de retirar las dos tarjetas, y el bloque de 1440px conserva lo que no dependía de ellas.
- **Lo que empeora, y por qué se acepta:** el desglose de Necesidades ordenado por estado de pago era genuinamente bueno y desaparece de acá. "Por pagar" ya ordena por urgencia y además **deja pagar**: se pierde una vista y se gana la acción, a un toque.
- **Se retira CSS muerto:** 39 reglas de `.grupos-resumen*` y `.grupo-card*` en `analysis.css` y las dos de `responsive.css`. Nada del proyecto emite esas clases desde esta ficha.
- **Reglas candidatas:** **R86** suma su quinta aparición en cuatro dominios. **R89a** suma su quinto caso, el más limpio. **R88 se examinó y se descartó acá**: el candidato era el panel de Inicio, que se titula "N límites de gasto en alerta" y cuenta solo sobres, ignorando que el grupo Estilo de vida pueda estar excedido con los mismos umbrales; pero R88 habla del resumen que **encabeza su propia vista**, y ese es un panel en otra superficie. Forzarlo debilitaría la regla, así que sigue con una sola aparición y la ficha 16 es su última candidata. **R87 sin caso propio**: el alta de un tope no es regla ni movimiento, es un umbral, y encaja en el tercer tipo que abrió la ficha 11.
- **Lo que pasa a la ficha 18:** si **Análisis** es mejor casa a largo plazo para el seguimiento de los tres grupos (la franja lo conserva por frecuencia de consulta, pero un plan cuyo tercer grupo es Ahorro no es una pregunta de Gastos); si el tráfico nuevo hacia Mis cuentas obliga a releer la conclusión de "destino de servicio" de la ficha 06; el inventario completo de **R86**, ahora con cinco apariciones; y si **R89a** ya tiene evidencia suficiente para consolidarse.
