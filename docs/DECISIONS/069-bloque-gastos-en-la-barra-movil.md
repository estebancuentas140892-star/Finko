# ADR 069 - El bloque Gastos en la barra móvil

**Estado:** Aceptada. Implementada en la ficha 01 de la auditoría UX/UI móvil.
**Fecha:** 2026-08-15
**Autores:** Esteban (producto), Claude Design (auditoría), Claude Opus 5 (implementación)
**Relación:** conserva el [ADR 065](065-ahorro-en-la-barra-inferior.md) entero (Ahorro en la barra, Calendario en "Más") y **cambia dos decisiones del [ADR 040](040-navegacion-v2-visual.md)**: el rótulo "Gestión del dinero" de la hoja "Más" y el reparto de sus tejas. Deja intacto el patrón de hoja inferior del mismo ADR. Se apoya en el [ADR 024](024-reorganizacion-navegacion-movil.md) D1 (Registrar en el centro, que no se mueve) y en el [ADR 056](056-la-casa-de-ahorro.md) (agrupar como forma, no como excepción).

---

## Contexto

La auditoría móvil midió la navegación real contra el código, no contra una impresión. Tres datos ordenan el resto:

- **11 de las 15 secciones viven detrás de "Más"** (73 %). La barra nombra cuatro destinos; los otros once no tienen nombre visible en ninguna pantalla hasta abrir una hoja rotulada con una palabra que no describe nada. Para el 73 % de la app el usuario no reconoce: recuerda.
- **Un mismo dominio se gestiona desde dos secciones.** `compromisos` tiene tres tipos (`modelo.js`: `['fijo','deuda-entidad','deuda-personal']`). "Deudas" lista solo los dos de deuda; los gastos fijos se crean y se administran desde Calendario, y la propia lista lo dice ("Los gastos fijos se gestionan desde Agenda"). Responder "¿qué tengo que pagar este mes?" cuesta dos secciones que la barra no relaciona.
- **Un límite no es un tema: es un tope sobre una categoría de gasto.** Hoy es una teja hermana de Análisis y de Me deben, mientras su panel de alerta ya se pinta en Inicio.

A eso se suma un cuarto hallazgo que no depende de la solución: el botón que abre el menú **cambia de nombre y de color** según dónde estés, así que en 11 de 15 secciones el control que abre el mapa no se llama "Más".

Se evaluaron dos arquitecturas con catorce criterios. **A** (destinos sueltos: `Inicio · Gastos · [+] · Por pagar · Más`) gana 2; **B** (dos bloques: `Inicio · Gastos · [+] · Ahorro · Más`) gana 8; empatan 4. Las dos victorias de A son la misma contada dos veces (Por pagar a un toque en vez de dos) y son mitigables con una pastilla de estado; las de B incluyen aprendizaje, descubribilidad y carga cognitiva, y no son mitigables desde A: no hay forma de bajar Ahorro a dos niveles sin agrupar.

---

## Decisión

### D1. "Gastos" pasa de sección a bloque, con tres lentes

La barra móvil queda en `Inicio · Gastos · [Registrar] · Ahorro · Más`: el mismo marcado de siempre, pero la cuarta posición ya no nombra una sección sino un contenedor con tres lentes.

| Lente | Qué contiene | Por qué ese nombre |
|---|---|---|
| Lo que gastaste | la sección Gastos actual | tiempo pasado explícito. Es la portada, así que carga el peso de distinguirse de la siguiente |
| Por pagar | fijos + deudas de entidad + deudas personales | el tiempo verbal hace todo el trabajo frente a la anterior. Cubre arriendo, servicios, tarjeta y el préstamo del primo sin categoría nueva |
| Límites | la sección Límites de gasto | dentro de "Gastos" el apellido "de gasto" sobra: el contexto ya lo dice |

Las tres siguen siendo secciones con hash propio (`#gast`, `#compromisos`, `#presupuesto`). **El bloque es una capa de navegación, no un contenedor nuevo de estado:** no hay hash nuevo en `router.js`, no hay dominio nuevo y ninguna sección cambia de dueño.

### D2. El bloque aterriza en contenido, no en un menú

Ahorro y Gastos agrupan igual, pero aterrizan distinto. Las cuatro modalidades de Ahorro son pares: ninguna se usa mucho más que las otras, así que su portada resume y enruta ([ADR 056](056-la-casa-de-ahorro.md), sin cambios). En Gastos hay un miembro dominante, y anteponerle un menú costaría un toque a la lectura más frecuente de la app a cambio de nada: el resumen que se necesita ya lo da Inicio.

Por eso la portada del bloque **es** "Lo que gastaste", y las otras dos lentes se enseñan con una franja de pestañas que lleva su estado encima: "Por pagar" muestra el número de vencidos y "Límites" cuántos topes se excedieron. Es lo que conserva la promesa de "decidir sin entrar" sin gastar una pantalla en un menú.

Queda como regla candidata para `DESIGN_SYSTEM.md` (**R81**): *un bloque aterriza en un resumen solo si ninguno de sus miembros domina; si hay uno que se consulta mucho más que sus hermanos, la portada es ese miembro y los demás se enseñan con pestañas que muestran su estado*.

### D3. "Me deben" se queda fuera del bloque

Es el único miembro que apunta al revés: es dinero que **va a entrar**. Meterlo obliga a que el nombre del bloque cubra las dos direcciones, y ahí se acaban los nombres cortos: lo único que funciona es una frase ("lo que debo y me deben", 148 px) o un marco temporal ("Mi mes"), y las dos cuestan descubribilidad en el miembro más usado.

Se queda en "Más", bajo el rótulo **Tu dinero**, junto a Mis cuentas: las dos responden "cuánto tengo o voy a tener". Sigue a 2 toques, exactamente igual que dentro del bloque.

**Criterio para reabrirlo:** si la auditoría de Me deben demuestra que se consulta junto con Por pagar (el patrón "cobro para poder pagar"), entra al bloque y el nombre se vuelve a evaluar con ese dato encima.

### D4. El bloque se llama "Gastos"

Nueve candidatos, tres filtros: que un colombiano común lo entienda sin explicación, que cubra los tres miembros y que quepa en 64 px (el ancho útil de la etiqueta a 360 px).

| Candidato | Cubre | Ancho | Veredicto |
|---|---|---|---|
| Deudas | 1 de 3 | 44 px | nombra solo las deudas y deja fuera lo ya gastado y los topes |
| Compromisos | 2 de 3 | 82 px | es el nombre interno del dominio, no el del usuario, y no cabe |
| Lo que debo | 2 de 3 | 68 px | no cubre lo que ya gastaste, que es la lente más consultada |
| Pagos | 2 de 3 | 38 px | a un slot de "Registrar → un pago", y no cubre el gasto ya hecho |
| Dinero / Finanzas | 3 de 3 | 44 px | también cubre Ahorro y Mis cuentas: no excluye nada, no agrupa nada |
| Salidas / Egresos | 3 de 3 | 51 px | vocabulario de contabilidad |
| Mi mes | 3 de 3 | 44 px | marco temporal, no de contenido: quien busca "mis gastos" no piensa "mi mes" |
| Mi plata | 3 de 3 | 48 px | prohibido por el principio 11 del ADN (voz neutral, "dinero" no "plata") |
| **Gastos** | 3 de 3 | 43 px | **elegido** |

"Gastos" cubre los tres miembros en el propio modelo de datos: un gasto fijo es un gasto, un límite es un límite **de gasto**, y pagar una cuota de deuda crea literalmente un registro de gasto (`calcularAbonosDelMes` filtra gastos por `compromisoId`). Coste de aprendizaje cero: ya estaba en la barra y en el mismo sitio.

La dificultad para nombrarlo fue el dato más útil del análisis: con los cuatro miembros iniciales no había ningún nombre corto que funcionara, y eso casi siempre significa que el grupo no es natural. Al quitar Me deben apareció un nombre obvio, y no uno nuevo.

### D5. "Más" siempre se llama "Más"

El botón deja de tomar el nombre, el ícono y el color de la sección donde estás. Resolvía "la barra dice dónde estás" a costa del único rótulo estable del menú: quien aprendió que el quinto botón es el menú veía otra palabra y no tenía forma visual de saber que seguía siendo el mismo control.

Las dos funciones se separan: **el menú se llama "Más"**; **el lugar lo dice el encabezado de sección**, que ya es obligatorio y ya alimenta la barra superior de escritorio. El resaltado del botón se conserva: sigue diciendo "estás detrás de este menú", sin cambiar de palabra.

### D6. Dos rótulos que sí excluyen en la hoja "Más"

"Gestión del dinero" cubría las 15 secciones de una app de finanzas personales: un rótulo que no excluye ninguna no reduce las opciones a mirar. Lo reemplazan dos:

- **Consultar:** Calendario, Movimientos, Análisis.
- **Tu dinero:** Mis cuentas, Me deben.
- **Pie:** Ajustes + el botón de tema, sin cambios.

La hoja baja de ocho destinos a seis: Deudas y Límites se fueron al bloque.

---

### D7. Dentro del bloque Ahorro se va de lado, y el fondo es la precondición

*Escrita el 2026-08-20, con la ficha 07. La decisión es de la ficha 04 y llevaba implementada desde entonces; lo que faltaba era el texto: trece comentarios del código y de los tests ya la citaban como "ADR 069 D7" y no existía.*

El bloque Ahorro aterriza en su portada, que resume y enruta ([ADR 056](056-la-casa-de-ahorro.md)), pero **dentro de sus cuatro modalidades no se podía ir de lado**: de Metas a Reservas había que volver a la portada. Cada hija gana una **fila de chips** con las cuatro (`ui/bloque-ahorro.js`), así que cualquiera se alcanza desde cualquiera con un toque. Solo bajo 1024px: en escritorio la barra lateral ya las lista.

No es lo mismo que las pestañas del bloque Gastos y por eso no comparten componente: allá hay una lente dominante y el bloque aterriza en ella; acá las cuatro son pares y la portada sigue existiendo.

Y **el fondo de emergencia es una precondición, no una modalidad más** (AH4): mientras no esté completo, las otras tres lo dicen en media línea. Es jerarquía de contenido, no de navegación: los cuatro chips siguen ahí y ninguno se bloquea.

### D8. La anatomía del bloque Gastos: un nombre, un reloj y un número honesto

*Ficha 07 de la auditoría móvil. La ficha 01 decidió que el bloque existiera (D1); esta decide cómo es por dentro.*

El bloque gana un encabezado propio (`ui/bloque-gastos.js`, inyectado en las tres lentes) con cuatro piezas:

| Pieza | Qué resuelve |
|---|---|
| Nombre y una línea: "Gastos" / "Todo el dinero que se te va" | el contenedor se nombra una vez, y las tres lentes dejan de repetir su título bajo 1024px |
| **Un solo selector de mes** | el hallazgo G4 |
| El ojo de privacidad | silencia las tres lentes a la vez en vez de una sola pantalla |
| Las tres pestañas, con su estado encima | "Día a día", "Por pagar" (contador de vencidos) y "Límites" (un punto, no un número) |

**G4, un reloj y no tres.** "Día a día" navegaba mes a mes con estado propio, "Límites" leía `new Date()` en cada render y "Por pagar" miraba a vencimientos: retroceder a junio en la primera y saltar a la tercera devolvía al mes actual sin avisar. Un contenedor promete continuidad. El estado sube a `infra/mes-bloque.js`, que vive en infra y no en un dominio porque las tres lentes son dominios distintos y ninguno puede importar a otro (ADN 10). Bajo 1024px el hero de la portada pierde su fila de arriba: su selector y su ojo son ahora los del bloque. En escritorio no hay encabezado de bloque y cada sección conserva el suyo.

**Consecuencia declarada:** "Límites" pasa de estar clavado al mes en curso a poder mirar meses anteriores. Es una mejora y es un cambio de comportamiento; queda anotado para la ficha 12.

**G1, el número honesto (regla candidata R82).** `_sinInternas()` filtra los pagos de deuda y de fijos para que el desglose por categoría sea el gasto que el usuario decide día a día. El filtro **no se toca**: es correcto. Lo que faltaba es que la pantalla dijera qué deja fuera, porque dentro de un bloque llamado Gastos un número principal que excluye a dos de sus tres lentes es la clase de incoherencia que hace que la gente deje de confiar en las cifras. El hero gana una línea: **"+ $X en fijos y deudas"** con salida a la lente donde viven. Sin inflar el total, sin inventar una cifra nueva. No se pinta si no hay nada que declarar ni con un filtro de categoría activo, porque entonces el hero describe una categoría y no el mes.

**El nombre se confirma, no se hereda.** Se probaron seis alternativas (Deudas, Compromisos, Lo que debo, Dinero, Salidas/Egresos, Mi mes) y todas fallan por cobertura, por ancho a 360px o por idioma. En el habla común colombiana "mis gastos del mes" ya incluye el arriendo, y el modelo de datos le da la razón al usuario: pagar una cuota crea un registro de gasto. Lo estrecho era la pantalla, y eso es lo que corrige G1.

**G5, de un número a los movimientos que lo forman.** Desde un tope no había forma de ver los consumos que lo componen sin ir a Movimientos y armar el filtro a mano. Cada tope gana una salida que **llega con el filtro puesto**: su categoría y el mes visible del bloque. Movimientos gana su quinto filtro (categoría, con chip que se puede quitar) porque los cuatro que tenía no podían expresarlo. El emisor no importa el dominio: emite `movimientos:ver` (mismo mecanismo que `distribuir:abrir`).

**G2 se acota, no se resuelve.** "Límites de gasto" no es lo que su nombre promete: lo que abre es el plan de tres grupos (Necesidades, Estilo de vida, Ahorro) y los topes son un bloque dentro de una de sus tarjetas. Al bloque entra la parte que sí es de gastos, los topes, y la pestaña se llama "Límites". El plan de tres grupos **queda como pregunta explícita para la ficha 12**: uno de sus grupos es Ahorro, que es el otro bloque de la barra, y su dependencia es Mis cuentas, que vive en "Más".

**G3, Movimientos se queda en "Más".** No es destino principal y no entra a la barra en ninguna arquitectura evaluada, pero quitarlo de "Más" reabriría un defecto ya cerrado (R32): su único camino era "Ver todo" de Actividad reciente, un enlace en una celda que arranca `[hidden]` y solo se activa cuando ya hay movimientos, o sea que desaparecía justo cuando el usuario es nuevo.

## Alternativas consideradas

- **Arquitectura A: "Por pagar" como quinto destino suelto.** Descartada por el marcador (2 contra 8) y por su forma: añade un destino con anatomía distinta a la de Ahorro (uno es sección plana, el otro un hub) y deja las cuatro modalidades de ahorro a tres toques, la profundidad máxima de la app.
- **Sacar "Registrar" de la fila para hacer sitio a cinco destinos.** Descartada: era el precio de la arquitectura A y con B el motivo desaparece. Queda anotada como hipótesis abierta **HR-1** (Registrar como botón extendido fuera de la fila), sin decisión y sin fecha: el único argumento que sobrevive es de peso visual, y eso no basta para mover una ergonomía que funciona.
- **Meter "Me deben" al bloque.** Descartada en D3: invierte la dirección del dinero y era lo único que impedía encontrar un nombre corto.
- **Portada-resumen también para Gastos**, por simetría con Ahorro. Descartada en D2: la simetría es del principio (agrupar), no de la forma de la portada.
- **Un hash nuevo para el bloque** (`#gastos-bloque`) con las tres lentes como estado interno. Descartada: rompe los enlaces profundos existentes, obliga a mover tres secciones de dueño y crea un concepto de contenedor que el proyecto no tiene. La franja de pestañas navega por hash, que es el único mecanismo de navegación del proyecto.
- **Franja de pestañas también en escritorio.** Descartada: allá el sidebar ya lista las tres lentes en filas propias, y repetir la misma navegación dos veces en la misma pantalla es lo que el ADR 056 vino a cerrar.

---

## Consecuencias

### Positivas

- **La descubribilidad baja de 73 % a 36 %**: cuatro destinos visibles abren ocho secciones; cinco quedan detrás del menú.
- **Ninguna sección a tres toques.** La profundidad máxima pasa de 3 a 2 (salvo Logros, que no es sección y se decide aparte).
- **Los tres términos conviven en una pantalla.** Hoy no hay ninguna en la que "gasto", "pago pendiente" y "límite" se vean juntos, y por eso hay que aprenderlos por separado.
- **La barra no cambia de alto, de anatomía ni de ergonomía**: cambian las etiquetas y lo que hay detrás de una de ellas. Es el cambio de arquitectura con menos coste de implementación de los tres evaluados.

### Negativas / Restricciones

- **"Por pagar" pasa de 2 toques a 2 toques, pero desde otro sitio.** Quien tenía memorizado "Más → Deudas" tiene que aprender "Gastos → Por pagar". La pastilla de vencidos es lo que paga ese aprendizaje: el dato está visible antes de entrar.
- **`[href="#gast"]`, `[href="#compromisos"]` y `[href="#presupuesto"]` dejan de ser únicos en el DOM:** la franja los repite en las tres lentes. Todo selector nuevo declara su contexto (`.nav-item[...]`, `.bloque-tabs__tab[...]`), igual que el ADR 065 obligó a hacer con `#ahorro`.
- **A 360 px la franja se desplaza en horizontal.** Las tres etiquetas no caben sin truncar y truncar el nombre es peor que desplazarlo: los nombres son justamente lo que se está enseñando. A 390 px (el ancho base auditado) caben las tres.
- **La ficha 01 solo define el lugar y el nombre.** El interior de cada lente (cómo caben fijos, deudas de entidad, deudas personales y las estrategias de pago dentro de una pestaña) es de las fichas 05, 07 y 12. **La ficha 05 cerró la parte de "Por pagar" el 2026-08-18**: los tres tipos se administran ahí (dos grupos en la lista, un chooser de tres chips para crear), y el alta de gasto fijo y el pago en lote se mudaron desde Calendario. Detalle en [`contexto/deudas.md`](../contexto/deudas.md).
- **Logros hereda su hallazgo sin decisión:** sigue siendo un panel dentro de Ajustes, sin ruta propia. Lo decide la ficha 17.
