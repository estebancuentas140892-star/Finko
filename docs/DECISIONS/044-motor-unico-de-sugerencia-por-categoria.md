# ADR 044 - Motor único de sugerencia por categoría

**Estado:** Abierta (decisión sin tomar). No implementar nada de este ADR.
**Fecha:** 2026-07-24
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

## La decisión pendiente

**Dónde vive el motor, qué recibe, qué devuelve y quién puede llamarlo.**

Nada de esto está decidido. Lo que sigue enmarca la decisión, no la toma.

### Propósito que tendría que cumplir

Dado un patrón de gasto por categoría, devolver un **diagnóstico acompañado de un monto sugerido y una acción ejecutable**, para que la superficie que lo muestra pueda resolver la situación sin mandarte a otra pantalla.

El "monto sugerido más acción" es el punto que separa este motor de lo que ya existe: hoy sobra diagnóstico y falta salida accionable.

### Entradas candidatas (a confirmar al cerrar)

| Entrada | De dónde sale hoy | Nota |
|---|---|---|
| Gasto histórico por categoría | `calcularGastadoCategoria` | ya existe y ya se calcula |
| Categoría y su grupo financiero | `core/constants.js` | mapeo sección a grupo, ya existe |
| Topes vigentes | `S.presupuestos` | para saber qué categoría no tiene tope |
| Marca o suscripción detectada | catálogo del [ADR 029](029-catalogo-de-marcas-por-categoria.md) | precondición del caso "gasto fantasma" |
| Capacidad de gasto del período | pendiente del [ADR 045](045-base-de-calculo-del-disponible-para-limites.md) | **el monto sugerido depende de esa decisión** |
| Fecha de referencia (`hoyISO`) | inyectada | para que la función sea pura y testeable |

### Salidas candidatas

Un diagnóstico legible, un monto sugerido cuando aplique, y una acción identificable que el consumidor sepa ejecutar. La forma exacta del contrato se fija al cerrar este ADR.

### Consumidores previstos

Límites de gasto, Análisis e Inicio. Ninguno de los tres sería dueño del motor.

---

## Alternativas sobre la mesa

Ninguna está elegida ni descartada.

### A. Motor compartido en `modules/infra/`

Un archivo de funciones puras, sin DOM, importable por cualquier dominio. Es el patrón que el proyecto ya usa para piezas transversales: `infra/vencimientos.js` (la única tabla de frecuencias, que el [ADR 041](041-motor-vencimientos-y-distribucion-v2.md) dejó como regla), `infra/financiero.js`, `infra/cuenta-helper.js` y `infra/distribuir-pago.js`.

A favor: cumple la ADN 10 sin esfuerzo, es testeable en Node, y hay cuatro precedentes vivos del mismo patrón. En contra: suma un archivo más a una carpeta que ya es grande.

### B. Lógica duplicada por dominio (statu quo)

Cada superficie implementa su propia versión. A favor: cero coordinación. En contra: es exactamente lo que el tablero ya declaró que no quiere, y el precedente reciente es malo: `MAPA_FRECUENCIA_A_*` estuvo duplicado carácter por carácter en dos dominios hasta que el ADR 041 lo unificó.

### C. Motor dentro de `analisis/`, los demás leen su salida por EventBus

Vive donde ya está la detección de patrones. A favor: aprovecha que Análisis ya calcula casi todo. En contra: convierte a un dominio en dueño de una pieza transversal, y obliga a que Límites e Inicio dependan de que Análisis se haya ejecutado. Acopla por orden de render, que es más frágil que acoplar por import.

---

## Consecuencias esperadas

**La ADN 10 restringe el espacio de soluciones antes de empezar.** Un motor consumido por tres dominios vive en `infra/` o se comunica por EventBus. La opción B queda fuera de la ADN por duplicación, no por gusto; la C cumple la letra de la regla pero traslada el acoplamiento al orden de ejecución.

**El monto sugerido no se puede cerrar sin el ADR 045.** Sugerir un tope exige saber cuánto dinero hay realmente disponible. Si ese ADR concluye que la base incluye saldos, el motor puede sugerir montos que estén comprometidos con obligaciones futuras. **Este ADR no debería cerrarse antes que el 045**, o el contrato de salida nacería apoyado en una cifra sin definir.

**El contrato de salida decide si el problema se resuelve o se renombra.** Si el motor devuelve solo diagnóstico, la app queda igual que hoy con una capa más de indirección: el hallazgo P6 seguiría vigente.

**Riesgo de tono.** Convertir diagnóstico en acción acerca el producto a prescribir. El [ADR 003](003-tono-neutral-profesional.md) es ADN: Finko sugiere, nunca impone. El copy de cada sugerencia debe seguir siendo orientativo.

**Riesgo de saturación.** Tres superficies emitiendo sugerencias del mismo motor pueden convertirse en ruido. Tu propio brief pidió avisos "nunca invasivos ni constantes". Hace falta una regla de frecuencia, y este ADR debería fijarla o delegarla explícitamente.

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

## Qué falta para cerrarlo

1. Decidir entre las alternativas A, B y C.
2. Cerrar antes el [ADR 045](045-base-de-calculo-del-disponible-para-limites.md), del que depende el monto sugerido.
3. Fijar el contrato exacto de entrada y salida.
4. Fijar la regla de frecuencia, o delegarla por escrito a cada superficie.
