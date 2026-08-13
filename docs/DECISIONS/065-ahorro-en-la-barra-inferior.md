# ADR 065 - Ahorro en la barra inferior, Calendario en "Más"

**Estado:** Aceptada. Implementada en AH.7a.
**Fecha:** 2026-08-13
**Autores:** Esteban (producto), Claude Opus 5 (diseño e implementación)
**Relación:** **supersede el D1 del [ADR 024](024-reorganizacion-navegacion-movil.md)** en su único punto discutible: qué sección ocupa el cuarto slot de la barra inferior. El botón central "Registrar" (el corazón del D1), la hoja de registro (D2), el ingreso puntual (D3) y el hub de ahorro (D4) siguen vigentes sin cambios. Se apoya en [ADR 056](056-la-casa-de-ahorro.md) (la casa es la única puerta al grupo en móvil) y en [ADR 040](040-navegacion-v2-visual.md) (la hoja "Más" agrupada). No toca el chrome de escritorio del ADR 059 (interfaz de escritorio), que se cita sin enlace porque su archivo no está en el repositorio.

---

## Contexto

El ADR 024 conservó los cuatro destinos que ya estaban en la barra ("Los cuatro destinos actuales conservan su lugar") y gastó su decisión en el slot central. Nunca se preguntó si Calendario merecía el suyo: lo heredó.

Trece meses de secciones después, la comparación es desfavorable:

- **Calendario se consulta, no se opera.** Su trabajo es responder "¿qué me llega este mes y qué falta por pagar?". Es una lectura periódica, típicamente una o dos veces al mes: al recibir el ingreso y al revisar qué queda pendiente. La alta de un fijo y el marcado de pago viven dentro de la sección, no en el camino hacia ella.
- **Ahorro es la casa de cuatro secciones** (fondo, metas, reservas, inversión) desde el ADR 056. En móvil es la única puerta al grupo, y esa puerta estaba a tres toques: abrir "Más", encontrar la teja, entrar. Escritorio la tenía a uno desde el ADR 059 D6.
- **La asimetría es del producto, no de la plataforma.** Una app de finanzas personales que promete "aprender usando" deja el ahorro detrás de un menú y el calendario en primer nivel: el orden de la barra dice qué importa, y decía lo contrario de lo que el producto sostiene.

Decisión de producto tomada por Esteban el 2026-07-31 al triar AH.7, con el ADR nuevo como condición explícita: revertir un D1 vigente no se hace en silencio (regla de `CLAUDE.md` sección 2).

---

## Decisión

### D1. La barra inferior pasa a `Inicio · Gastos · [+] · Ahorro · Más`

Calendario sale de la barra y baja a la hoja "Más". El resto de la barra no se toca: cinco posiciones, "Registrar" en el centro, "Más" al final.

El intercambio es de una lectura periódica por una casa de cuatro secciones. Calendario pasa de un toque a dos (abrir "Más", tocar su teja); Ahorro pasa de tres a uno.

### D2. Calendario hereda el slot de ancho completo que deja Ahorro

En la hoja "Más" no entra a la grilla "Gestión del dinero": ocupa la fila de ancho completo que tenía la teja de Ahorro, encima de Ajustes. Dos razones: baja de la barra inferior y no es una teja más entre seis, y la grilla de 2 columnas conserva sus 6 tejas en 3 filas limpias (con 7 quedaría una huérfana).

### D3. La pestaña de Ahorro se resalta en toda la casa, hijas incluidas

Antes, estar en `#metas` encendía el botón "Más" (que además decía "Metas"): era el "estás aquí" del grupo. Con la casa en la barra, ese papel pasa a su pestaña: se enciende en `#ahorro` y en las cuatro hijas. En consecuencia, el grupo de ahorro completo sale del conjunto de secciones que iluminan "Más", y Calendario entra.

El comportamiento de escritorio no cambia: allá cada hija tiene su propia fila en el sub-nivel (ADR 059 D6) y se marca sola.

### D4. Entrada duplicada en el marcado, no mudanza de la casa

La barra inferior recibe **una entrada nueva** `nav-item--mobile-only` a `#ahorro` dentro del grupo de uso diario. La casa sigue encabezando el grupo 3 del sidebar con sus cuatro hijas anidadas.

Motivo: en móvil solo se pinta el primer `nav-group` (`responsive.css`), así que la única forma de estar en la barra es estar en ese grupo; y mover la casa allá desarmaría el anidado de INT.1b, que es lo que hoy hace caber el sidebar a 1280x799. El costo es que `[href="#ahorro"]` deja de ser único en el DOM: se paga apuntando a la variante de plataforma (`.nav-item--no-mobile` o `.nav-item--mobile-only`) donde haga falta.

---

## Alternativas consideradas

- **Mover la casa del grupo 3 al grupo 1.** Descartada: deja el sub-nivel de las 4 hijas colgando de un grupo sin cabeza y revive el desborde vertical que INT.1b cerró (BUG-026).
- **Calendario como séptima teja de la grilla.** Descartada: la grilla es de 2 columnas y la séptima queda huérfana; además le da a Calendario menos peso que a la teja que reemplaza, cuando lo que hace es bajar de la barra.
- **Duplicar Ahorro: pestaña en la barra y teja en "Más".** Descartada: la hoja nunca repite lo que ya está en la barra (Inicio, Gastos y Registrar tampoco están), y dos caminos al mismo destino en la misma pantalla es la ambigüedad que el ADR 056 vino a cerrar.
- **Seis posiciones en la barra** (Calendario y Ahorro a la vez). Descartada: a 320px los cinco labels ya truncan; una sexta posición rompe el reflow que el E2E fija como compuerta.
- **Un `<button>` en vez de un `<a>` para la entrada nueva**, para no duplicar el `href`. Descartada: es un destino, no una acción; degradar la semántica de enlace por comodidad de selector es pagar accesibilidad con conveniencia de test.

---

## Consecuencias

### Positivas

- El ahorro queda en la zona del pulgar, en la misma barra donde ya viven registrar y gastar: la app deja de decir con su navegación lo contrario de lo que sostiene su producto.
- La casa cobra sentido pleno en móvil: es la puerta de cuatro secciones y ahora está donde se toca sin pensar.
- La hoja "Más" no crece: entra Calendario, sale Ahorro. Ocho destinos, misma altura.

### Negativas / Restricciones

- **Calendario pasa a dos toques.** Es el costo aceptado: se asume porque su uso es de consulta periódica, no diario. Si la telemetría (que no existe: la app no rastrea) o el uso real lo desmienten, el camino de vuelta es otro ADR, no un ajuste silencioso.
- **`[href="#ahorro"]` aparece dos veces en el DOM.** Cualquier selector nuevo debe declarar plataforma. Los tests que clickeaban el genérico ya apuntan a `.nav-item--no-mobile`.
- **Tablet (768 a 1.023px) hereda la topología móvil**, como todo lo demás: sigue sin auditar (pendiente P4 del ADR 059).
