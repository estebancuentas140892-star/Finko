# ADR 059 - Interfaz de escritorio: el chrome se decide para el escritorio

**Estado:** Aceptada el 2026-08-02 y ejecutada completa (INT.1a a INT.1h, cerradas entre el 2026-08-02 y el 2026-08-17). **Este archivo es una reconstrucción del 2026-11-15** (cierra [BUG-027](../BUGS.md)): el original se citó como aceptado desde INT.1a pero nunca se commiteó, ni existe en `git log --all`. Lo que sigue sale de los cierres de las ocho rebanadas en [`changelog/2026-08.md`](../changelog/2026-08.md), de [`contexto/escritorio.md`](../contexto/escritorio.md) y de las citas en el código. No agrega decisiones: donde una cita no alcanza para saber qué decía el original, se dice.
**Fecha:** 2026-08-02. **Reconstruido:** 2026-11-15.
**Autores:** Esteban (aprobación), Claude Design (auditoría de Interfaz del handoff de navegación global), Claude Opus 5 (verificación contra el código y formalización). Reconstrucción: Claude Opus 5.5.
**Origen:** la auditoría de Interfaz del handoff `Auditoría navegación global Finko-handoff/`, con sus hallazgos (E1 en adelante), ocho decisiones y pendientes P1 a P9, verificada contra el código el 2026-08-02 antes de escribir el ADR.
**Relación:** **acota** el punto 8 del [ADR 056](056-la-casa-de-ahorro.md) (D6: las hijas de Ahorro pasan de permanentes a contextuales en el sidebar); hereda del [ADR 057](057-inicio-en-escritorio.md) el criterio de decidir por ancho y no por dispositivo. Móvil no cambia en ninguna decisión.

---

## Contexto

El escritorio nunca se había decidido. El sidebar existía desde antes de que la app tuviera dos topologías, y las auditorías por sección midieron móvil a 390px, así que escritorio heredó el reparto móvil estirado: contenido pegado a un lado con 240px huérfanos a 1920 (880 a 2560), Movimientos sin entrada en el sidebar, el sidebar desbordando 41px a 1280x799, un `h1` que se iba con el scroll y un formulario de 520px con 1.400px libres al lado.

Dos premisas del handoff se corrigieron al verificarlas contra el código, antes de escribir el ADR:

- **PI7 era falso**: `--fk-bg-glass` sí tiene valor en tema claro, así que nunca bloqueó la barra superior.
- **El hallazgo E3 acreditaba una mitigación que no funcionaba**: el bloque `@media (max-height: 800px)` del sidebar perdía la cascada en sus cuatro declaraciones. Nació BUG-026, que INT.1b cerró por eliminación de la causa.

---

## Decisiones

### D1, D2 y D5. Una barra superior fija de 56px (INT.1c)

Teja y título de la sección activa (reemplazan el `h1` que se iba con el scroll), "Registrar" (la misma hoja que móvil, otro disparador), el tema y el acceso a Ajustes. Fondo opaco con borde inferior, sin `backdrop-filter` (pendiente **P9**: el filtro fijo sobre contenido que se desplaza era el riesgo para Lighthouse; medido 99/100/100/100).

Los cierres citan las tres decisiones juntas ("D1/D2/D5") y ningún documento conserva cómo se repartían entre las piezas de la barra: este archivo no lo inventa.

### D3. El primario de la sección sube a la barra (INT.1e)

El primario del encabezado (`.section__header > .btn-primary`, el que R1 ya exige único) se copia a `#topbar-primario`, en secundario: mover dinero ("Registrar") pesa más que crear una ficha (R38). El original se oculta en escritorio y vuelve bajo 1024px. El pendiente **P1** (recorrer las 13 secciones) se resolvió aquí: 8 tienen primario de encabezado.

### D4. Atajos de teclado (INT.1h), número inferido

Ningún documento cita "D4" por número. Es la única decisión sin rebanada atribuida y INT.1h es la única rebanada sin decisión atribuida, así que se lee como D4. Cuatro atajos (`N`, `G` + letra, `?`, `Esc`) con tres guardas (campo de texto con foco, modal abierto, tecla modificadora) que resuelven el pendiente **P8**, y un interruptor en Ajustes (WCAG 2.1.4: un atajo de una sola tecla se puede apagar).

### D6. El sidebar tiene una entrada por destino y cabe (INT.1a e INT.1b)

Movimientos entra al sidebar (era el único destino sin entrada en escritorio). Las cuatro hijas de Ahorro pasan de filas permanentes a un sub-nivel anidado bajo la casa, desplegado solo dentro del grupo: el sidebar cabe a 1280x799. **Tradeoff aceptado**: una hija ya no es un clic directo desde cualquier sección. Acota el punto 8 del ADR 056 (nota en ese ADR).

### D7. El contenido se centra y, desde 1.680px, gana un carril (INT.1a e INT.1g, regla R77)

`.section` se centra con `margin-inline: auto` dentro de su tope de 1.440px: el sobrante se reparte a los dos lados. Desde 1.680px, una sección puede promover a un carril derecho de 320px el bloque que hoy exige bajar un pliegue (`.section--con-carril`). Su único caso real es el compromiso mensual de Fondo de emergencia ([ADR 084](084-fondo-el-compromiso-del-periodo-en-la-primera-pantalla.md) le da su respuesta móvil).

### D8. El formulario de escritorio a 840px y dos columnas (INT.1f)

El modal base sube a 840px desde 1024px; los modificadores de tamaño conservan el suyo. El `<form>` pasa a una rejilla de dos columnas donde solo se emparejan los campos simples (etiqueta y un control, vía `:has()`), sin alterar el orden del DOM (R11).

### D9. La cinta de saldo en la barra (INT.1d)

`#topbar-saldo` lleva el saldo con su ojo (mismo `S.config.ocultarSaldo`, R20), oculto en Inicio, donde el héroe ya lo dice (R27), y sin cuentas.

---

## Pendientes que quedaron abiertos

- **P4, tablet (768 a 1.023px)**: sigue con la topología móvil completa, sin auditar. Lo citan el ADR 065 y `contexto/escritorio.md`.
- **R75 a R77**: se reservaron en `DESIGN_SYSTEM.md` para el cierre de INT.1 y no se escribieron. R75 se usó después para otra regla; R76 y R77 siguen sin texto, aunque el código y `contexto/escritorio.md` citan R77 para el ancho y el carril (D7).

---

## Por qué una reconstrucción y no un ADR nuevo

Las ocho rebanadas ya están en producción y el código cita "ADR 059 Dn" en `index.html`, `ui/shell.js`, `ui/actions.js`, `infra/render.js`, `layout.css`, `modals.css` y `responsive.css`. Un ADR con otro número dejaría esas citas apuntando a nada; reescribir las decisiones como si fueran nuevas falsearía su fecha. Se conserva el número y la fecha de aceptación, y se marca qué partes no se pudieron recuperar.
