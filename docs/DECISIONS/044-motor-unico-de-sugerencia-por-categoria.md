# ADR 044 - Motor único de sugerencia por categoría

**Estado:** Aceptada el 2026-08-13. Esteban pidió trabajar LIM.1c y delegó explícitamente la elección ("tú tomas las decisiones"), igual que en el [ADR 045](045-base-de-calculo-del-disponible-para-limites.md) y el [ADR 046](046-analisis-interpreta-criterio-y-lenguaje.md). Su bloqueo declarado había desaparecido el 2026-08-12 con la D6 del ADR 045, que fija la base del monto sugerido (el presupuesto de Estilo de vida y su parte sin tope, `coberturaLimitesEstiloVida`, más el histórico de la categoría; nunca saldos ni dinero extraordinario). Implementado en la rebanada **LIM.1c**, con Límites de gasto como único consumidor por ahora.
**Fecha:** 2026-07-24 (abierta), 2026-08-13 (decidida)
**Autores:** Esteban (producto), Claude Opus 5 (análisis)
**Relación:** consume el catálogo del [ADR 029](029-catalogo-de-marcas-por-categoria.md). Lo consumirían los ADR [045](045-base-de-calculo-del-disponible-para-limites.md) (Límites) y [046](046-analisis-interpreta-criterio-y-lenguaje.md) (Análisis), que quedan como **consumidores, no dueños**. Restringido por la regla ADN 10 (ningún dominio importa a otro).

---

## Contexto

Tres superficies distintas de la app piden hoy la misma pieza, y ninguna la tiene:

- **Límites de gasto** quiere detectar gasto frecuente o creciente en una categoría sin tope y proponer que se cree uno, con un monto concreto.
- **Análisis** quiere convertir un patrón detectado en una acción, no en un párrafo.
- **Inicio** quiere avisos discretos y oportunos del mismo tipo, sin ser invasivo.

El tablero ya declaró por escrito, dos veces, que esto debe resolverse con **un motor, no tres**. El problema es que esa regla se enunció dentro de la nota de fusión de dos tarjetas y **el identificador que cita, TX.10, no existe como tarjeta**. La regla no tiene dueño documental: vive como un comentario dentro de otras dos tarjetas que se borrarán cuando se cierren.

La auditoría del 2026-07-21 (patrones P1 y P6) encontró el síntoma en producción, y es concreto:

- Análisis **ya detecta** "subiste 18% en Restaurantes" y ya identifica el gasto hormiga por categoría, pero sus llamados a la acción son **enlaces de navegación**. El hallazgo muere ahí: tienes que salir de la pantalla, ir a Límites y reconstruir a mano el contexto que Análisis acababa de darte.
- Al crear un límite, la app **no sugiere monto**, aunque `calcularGastadoCategoria` ya conoce el histórico de esa categoría. Tienes que inventar un tope de la nada.
- La sección lista las categorías sin tope como **texto muerto**, sin acción para crear el límite ahí mismo.

Los tres son la misma carencia vista desde tres ángulos: el dato existe, el diagnóstico existe, y lo que falta es convertirlo en algo ejecutable sin cambiar de pantalla.

La restricción de fondo es la **regla ADN 10**: ningún dominio importa a otro. Un motor consumido por `presupuesto`, `analisis` e `inicio` no puede vivir dentro de ninguno de los tres sin romperla.

---

## Decisión

### D1. El motor vive en `infra/`, en un archivo propio

`modules/infra/sugerencias-categoria.js`, funciones puras sin DOM y sin `S`. Es la alternativa A: la ADN 10 deja fuera de discusión la B (duplicar por dominio) y la C (dueño en `analisis/`) acopla por orden de render, que se rompe más callado que un import. El precedente decide el resto: `infra/vencimientos.js` es exactamente esta forma, y su historia (dos dominios con la misma tabla de frecuencias copiada carácter por carácter hasta el [ADR 041](041-motor-vencimientos-y-distribucion-v2.md)) es la razón de no volver a repartir la lógica.

### D2. El motor devuelve datos, nunca frases

Cada función devuelve objetos con las cifras y el motivo; el copy lo escribe la superficie dentro del [ADR 003](003-tono-neutral-profesional.md). Tres superficies repitiendo el mismo texto sonarían a plantilla, y un motor que arma strings obliga a fijar el copy en los tests: cambiar una palabra rompería la lógica.

### D3. Tres entradas, no un `sugerir()` que lo hace todo

| Función | Responde | Devuelve |
|---|---|---|
| `historicoCategoria(gastos, categoria, hoyISO, meses?)` | cuánto se gasta habitualmente acá | `{ actual, promedio, mesesConGasto, cerrados }` |
| `sugerirMontoTope(gastos, categoria, hoyISO, { sinTope })` | cuánto poner de tope | `{ monto, base, promedio, mesesConGasto, acotado }` o `null` |
| `sugerirCategoriasParaTope(gastos, categorias, hoyISO, { sinTope, umbral })` | dónde conviene poner uno | lista ordenada con `motivo: 'creciente'\|'recurrente'` |
| `detectarSuscripcionesLargas(compromisos, gastos, hoyISO, { mesesMinimos, ventana })` | qué suscripción vale la pena revisar | lista con `mesesPagados` y `costoAnual` |

El módulo es el motor; que tenga cuatro puertas no lo vuelve tres motores. La regla que el tablero declaró dos veces es "una sola implementación", y eso se cumple.

**`hoyISO` entra por parámetro** (mismo criterio que `infra/vencimientos.js`): sin eso, ninguna de las cuatro es testeable sin congelar el reloj.

**El consumidor filtra las categorías candidatas.** El motor no conoce `S.presupuestos` ni el catálogo visible de cada superficie (ADN 10): recibe la lista de categorías que **pueden** recibir un tope y todavía no lo tienen. Es la misma lista que el formulario ofrece como chips, así que ninguna sugerencia queda sin puerta (regla R35).

### D4. La base del monto es el histórico, y el techo es lo que el plan deja sin tope

El promedio de los meses cerrados con gasto (tres por defecto); sin histórico, lo que va corrido del mes en curso. El mes en curso no entra al promedio: está incompleto y movería la cifra según el día.

**Nunca se propone un recorte.** Un tope por debajo de lo que la persona ya gasta es una dieta que no pidió; el tope nace en su gasto habitual y bajarlo es decisión suya (ADR 003).

El techo es `coberturaLimitesEstiloVida().sinTope` ([ADR 045](045-base-de-calculo-del-disponible-para-limites.md) D6): sugerir más que eso repartiría dinero que el plan no tiene. Saldos y dinero extraordinario nunca entran.

### D5. La suscripción se detecta por antigüedad y costo, no por uso

Finko **no sabe** si algo se usa: no hay dato de uso y no se inventa uno. Lo que sí sabe es cuántos meses lleva cobrada una suscripción y cuánto suma al año, que es la cifra que nadie tiene en la cabeza. El motor solo mira los fijos **no esenciales** del [ADR 014](014-taxonomia-categorias-transversal.md) (Streaming y Suscripciones, la misma lista cerrada de LIM.1b): el arriendo también lleva doce meses cobrándose y no es un hallazgo.

El catálogo de marcas del [ADR 029](029-catalogo-de-marcas-por-categoria.md) queda **fuera de esta primera entrega**: la señal que importa (cuántos meses lleva cobrándose, cuánto suma al año) sale de los compromisos y sus pagos, y esperar la Fase 1 de ese ADR habría bloqueado la rebanada sin mejorar la detección. Cuando exista `marcaId`, el motor puede agrupar por marca sin cambiar su contrato.

### D6. La regla de frecuencia es de cada superficie, con un tope escrito

El motor devuelve **listas ordenadas**; cuántas se muestran lo decide quien las muestra, porque el ruido depende de lo que ya haya en pantalla. Límites de gasto adopta **una sugerencia de tope y una de suscripción por render**, las de mayor monto, porque la sección ya tiene sus propias alertas por sobre. Sin persistencia de descartes: guardar "no me muestres esto" es schema nuevo y nadie lo ha pedido.

### Consumidores

Límites de gasto es el único hoy. Análisis dejó de depender del motor con el [ADR 046](046-analisis-interpreta-criterio-y-lenguaje.md) D3 (su lectura describe, no ordena) e Inicio queda como consumidor futuro: puede importar el mismo módulo sin tocarlo.

---

## Alternativas

### A. Motor compartido en `modules/infra/` (elegida, D1)

Un archivo de funciones puras, sin DOM, importable por cualquier dominio. Es el patrón que el proyecto ya usa para piezas transversales: `infra/vencimientos.js` (la única tabla de frecuencias, que el [ADR 041](041-motor-vencimientos-y-distribucion-v2.md) dejó como regla), `infra/financiero.js`, `infra/cuenta-helper.js` y `infra/distribuir-pago.js`.

A favor: cumple la ADN 10 sin esfuerzo, es testeable en Node, y hay cuatro precedentes vivos del mismo patrón. En contra: suma un archivo más a una carpeta que ya es grande.

### B. Lógica duplicada por dominio (statu quo, descartada)

Cada superficie implementa su propia versión. A favor: cero coordinación. En contra: es exactamente lo que el tablero ya declaró que no quiere, y el precedente reciente es malo: `MAPA_FRECUENCIA_A_*` estuvo duplicado carácter por carácter en dos dominios hasta que el ADR 041 lo unificó.

### C. Motor dentro de `analisis/`, los demás leen su salida por EventBus (descartada)

Vive donde ya está la detección de patrones. A favor: aprovecha que Análisis ya calcula casi todo. En contra: convierte a un dominio en dueño de una pieza transversal, y obliga a que Límites e Inicio dependan de que Análisis se haya ejecutado. Acopla por orden de render, que es más frágil que acoplar por import.

---

## Consecuencias

**Sin schema y sin tocar el reparto.** El motor solo lee lo que ya está guardado (`S.gastos`, `S.compromisos`) y el techo sale de una función que ya existía. No hay bump de `SCHEMA_VERSION` y `distribucion.js` no se toca, coherente con el ADR 045.

**El hallazgo P6 queda cerrado en Límites.** El aviso trae el monto y su botón abre el formulario con la cifra puesta: se resuelve sin cambiar de pantalla. La excepción declarada es la suscripción, cuya acción (dar de baja un fijo) vive en Calendario: duplicar ese control acá rompería la fuente única, así que el aviso lleva enlace y no botón.

**El copy queda como riesgo vivo.** Convertir diagnóstico en acción acerca el producto a prescribir. La mitigación es estructural (D2: el motor no escribe frases) y de forma: el aviso dice el hecho y ofrece, nunca ordena.

**La sugerencia sube con el gasto.** Como el monto propuesto es el promedio y nunca un recorte, una racha de gasto alto propone topes altos. Es el costo aceptado de no imponer dietas: el tope es un aviso, no un permiso, y el techo del plan lo acota por arriba.

**Un tope creado ya no vuelve a sugerirse**, porque la categoría sale de la lista de candidatas. La regla de frecuencia de D6 evita el otro extremo, el de tres avisos apilados en la misma tarjeta.

---

## Fuera de alcance

- **La base de cálculo del dinero disponible.** Es del [ADR 045](045-base-de-calculo-del-disponible-para-limites.md). Este motor la consume, no la define.
- **El criterio de permanencia de gráficos y el lenguaje de Análisis.** Son del [ADR 046](046-analisis-interpreta-criterio-y-lenguaje.md).
- **El tratamiento asimétrico por rol de Límites.** Es del [ADR 019](019-limites-por-rol.md), que no se toca.
- **El catálogo de marcas y suscripciones.** Es del [ADR 029](029-catalogo-de-marcas-por-categoria.md). Le da datos al motor; su curación es de ese ADR.
- **La ejecución de la acción sugerida y su persistencia.** Ver los límites de responsabilidad, abajo.
- **El copy final de cada mensaje.** Lo fija cada superficie dentro del marco del ADR 003.

### Límites de responsabilidad del motor

El motor **sugiere**. En concreto, no hace nada de esto:

| No hace | Quién lo hace |
|---|---|
| Mutar `S` o persistir | El dominio dueño del dato, con el flujo normal de `save()` |
| Ejecutar la acción sugerida | La superficie que la muestra, cuando confirmas |
| Decidir el copy final | Cada superficie, dentro del ADR 003 |
| Tocar el DOM | Nadie: es lógica pura, sin DOM (ADN 9) |
| Decidir cuándo se muestra una sugerencia | La superficie, según su propia regla de frecuencia |

---

## No duplica

| ADR | Qué decide | Frontera con este |
|---|---|---|
| [029](029-catalogo-de-marcas-por-categoria.md) | Catálogo de marcas y suscripciones por categoría | Le aporta **datos** de entrada, no lógica de sugerencia |
| [019](019-limites-por-rol.md) | Tratamiento asimétrico por rol y topes bajo demanda | Decide **cómo se presenta** cada grupo; no define ningún motor |
| [010](010-simplificacion-analisis.md) | Jerarquía y colapsables de Análisis | Capa de presentación; no toca lógica de recomendación |
| [041](041-motor-vencimientos-y-distribucion-v2.md) | Motor de vencimientos y reparto por período | Motor distinto, otro dominio de problema. Es el **precedente de patrón** a seguir, no una superposición |

Ningún ADR existente define un motor de sugerencia por categoría. Verificado antes de escribir este documento.

---

## Qué queda cerrado

1. **Alternativa A, B o C:** A, motor propio en `infra/` (D1).
2. **Base del monto:** el histórico de la categoría, acotado por lo que el plan deja sin tope (D4, sobre el ADR 045 D6).
3. **Contrato de entrada y salida:** las cuatro funciones de D3, datos y nunca frases (D2).
4. **Regla de frecuencia:** delegada a cada superficie, con el tope de Límites escrito (D6).

Implementación: rebanada **LIM.1c**, cerrada el 2026-08-13 (`modules/infra/sugerencias-categoria.js` más su consumo en Límites de gasto). Detalle en el [CHANGELOG](../CHANGELOG.md) y en [`contexto/limites.md`](../contexto/limites.md).
