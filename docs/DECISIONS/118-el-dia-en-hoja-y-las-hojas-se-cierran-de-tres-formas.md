# ADR 118 - El día en hoja y las hojas se cierran de tres formas

**Estado:** Aceptada (2026-11-03). Tercera tanda de la tarjeta **MV2.3**. Esteban decidió aplicar el canvas "tal cual como propone el HTML", también donde acota decisiones aprobadas.
**Fecha:** 2026-11-03
**Autores:** Esteban (diseño y decisión), Claude Opus 5.5 (implementación y redacción)
**Relación:** sigue al [ADR 117](117-por-pagar-por-urgencia-y-en-filas.md). **Acota**, solo bajo 1024 px, el [ADR 111](111-calendario-el-mes-entero-en-el-telefono.md) (el día abierto como panel bajo el mes) y la entrada de CAL.3 (al llegar, el día de hoy se abría solo). **Aplica** RN3 y RN8 del canvas, R46 (la respuesta sin desplazarse) y el volver del [ADR 098](098-finko-movil-2-primera-entrega.md) D1-D2. Escritorio no cambia ([ADR 071](071-calendario-como-mapa-del-mes-en-escritorio.md)).

---

## Contexto

| Hallazgo del canvas | Lo que había |
|---|---|
| Recorrido 3: "al tocar el 25, el panel del día aparece debajo de la rejilla y hay que bajar para verlo" | el panel nacía bajo el mes; el foco lo traía a pantalla desplazando la página |
| Recorrido 3: "no hay forma de volver al día 25" | volver desde "Por pagar" dejaba el Calendario sin día abierto |
| RN8: "toda hoja se cierra de tres formas y devuelve el foco: deslizando hacia abajo, con ✕ y con el atrás del sistema en Android" | solo la ✕, el fondo y Escape; el atrás de Android cambiaba de pantalla con la hoja abierta encima |

## Decisión

### D1. El día se abre en una hoja sobre el mes

Bajo 1024 px, tocar un día abre `#modal-dia-calendario` con el mismo detalle de siempre (`_renderDetalleDia`): la página no se mueve y el mes queda detrás. Tocar el mismo día otra vez lo vuelve a abrir (sin alternar). Al cerrar la hoja, por cualquier camino, el día deja de estar marcado y el foco vuelve a su celda.

Al llegar a la sección no se abre ningún día solo: la hoja taparía el mes que se vino a ver. El día de hoy sigue marcado en la rejilla.

Lo que abre otra hoja desde el día (aportar a una meta, distribuir) cierra antes la del día.

### D2. Al volver de "Por pagar", el día sigue abierto

"Ver en Por pagar" cierra la hoja sin soltar el día, lleva a la fila resaltada ([ADR 116](116-lo-que-faltaba-del-canvas-primera-tanda.md) D1) con "‹ Calendario" (ADR 098), y al volver a esa misma entrada del historial la hoja se reabre en el mismo día y el mismo mes. Si se llega al Calendario por otro camino, no.

### D3. Toda hoja se cierra de tres formas

`ui/hojas.js` agrega dos formas a la ✕, solo bajo 1024 px y nunca en una hoja bloqueante:

- **El atrás del sistema**: un `CloseWatcher` por hoja abierta. El navegador le entrega el atrás sin tocar el historial, así que el router y `volver.js` no cambian. Sin la API (iOS, que no tiene atrás del sistema) no hace nada.
- **Deslizar hacia abajo**: desde una hoja pegada al borde inferior con su contenido arriba del todo. Cierra pasados 120 px (o un cuarto de la hoja) o con un tirón rápido; si no, vuelve a su sitio.

Las dos cierran como Escape: el evento nace dentro de la hoja y cada diálogo lo atiende como siempre. Por eso Escape pasa a cerrar la hoja de arriba y no la primera del documento, y `cerrarModal` deja el fondo inerte mientras quede otra hoja abierta. El foco vuelve al control que abrió la hoja, como ya hacía `releaseFocus`.

## Alternativas descartadas

- **Una entrada de historial por hoja** (`pushState` al abrir, `history.back()` al cerrar). Al cerrar por la ✕ y navegar enseguida, el `back()` asíncrono podía deshacer la navegación nueva, y competía con los sellos de `volver.js`.
- **Un cierre propio por hoja.** Cada diálogo ya sabe cerrarse con Escape (confirmar resuelve su promesa, el selector de cuenta la suya); repetirlo en cada uno era abrir la puerta a que uno se quede sin.
- **El día abierto también en escritorio como hoja.** El ADR 071 le dio su columna junto al mes; ahí no hay que desplazarse.

## Consecuencias

### Positivas

- La respuesta del día se ve sin desplazarse, y el recorrido Calendario, Por pagar y vuelta no pierde el día.
- El atrás de Android y el gesto de bajar hacen lo que el usuario espera de una hoja, en todas.

### Negativas / Restricciones

- Escape con dos hojas abiertas ahora cierra solo la de arriba; antes cerraba la primera del documento.
- Una hoja que necesite arrastrar algo hacia abajo dentro de ella marca esa zona con `data-sin-arrastre`.
