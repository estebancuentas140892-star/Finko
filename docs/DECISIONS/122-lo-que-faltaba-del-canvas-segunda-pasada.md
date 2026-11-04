# ADR 122 - Lo que faltaba del canvas, segunda pasada

**Estado:** Aceptada (2026-11-04). Pedido en chat: "de estos 13 archivos HTML, ¿qué cambios de diseño falta por realizar en la app?". Una segunda auditoría independiente, verificada pieza por pieza contra el código, encontró 12 propuestas sin hacer o a medias que la primera (ADR 116) no vio. Esteban respondió "Sí, todas". Este ADR cubre las piezas puntuales; las dos que tocan todos los formularios van en el [ADR 123](123-la-hoja-de-formulario-completa.md).
**Fecha:** 2026-11-04
**Autores:** Esteban (diseño y decisión), Claude Opus 5.5 (auditoría, implementación y redacción)
**Relación:** sigue a la tarjeta **MV2.3** (ADR 116 a 121), ya cerrada. **Aplica** R89a, R41, R49 y el tablero 3 ("un conflicto se avisa una vez en Atención hoy"). **Extiende** el [ADR 116](116-lo-que-faltaba-del-canvas-primera-tanda.md) D6 (ningún filete lateral) a las piezas que quedaban. **Acota** el [ADR 066](066-motor-unico-de-avisos.md) con un tipo de aviso nuevo.

---

## Contexto

| Tablero | Lo que pide | Lo que había |
|---|---|---|
| 4, Metas | "Con plazo · la más cercana primero" | "Con plazo" |
| 8, Inicio | "El saludo se corta con «…» antes que el nombre; el nombre no se corta" | al revés: el nombre se cortaba |
| 4, Por pagar | "Los cuatro filtros caben como botones de igual ancho a 320 px" | chips del ancho de su texto |
| 3 y 11 | ningún filete lateral; el nivel lo dice el ícono | filetes en la importación de CSV y en el reparto de Familia; ⚠️ y 📅 en tres avisos |
| 4, Gastos con filtro | "8 gastos · tu límite es $250.000" bajo el total | solo el total |
| 3, sincronización | un conflicto "se avisa una vez en Atención hoy, con su acción" | solo en Ajustes |
| 10 y 11, pruebas | "ninguna fila del título pasa de 52 px a 320" y "ninguna pieza visible con filete lateral" | no existían |
| 11, Ajustes | notificaciones bloqueadas como "aviso de atención" | un párrafo tintado |

## Decisión

### D1. El divisor de Metas dice su orden

"Con plazo · la más cercana primero" (R89a).

### D2. Se corta el saludo, no el nombre

La franja ("Buenas tardes,") lleva puntos suspensivos; el nombre baja de línea si no cabe.

### D3. Los filtros de Por pagar, de igual ancho

Bajo 1024 px, una rejilla de cuatro columnas iguales.

### D4. Ningún filete lateral, ningún emoji de nivel

La importación de CSV pasa a borde completo con el ícono de alerta (la fila dice su estado en su columna), el reparto de Familia lleva el color del frasco en el borde completo, y los avisos de Reservas y Ajustes usan el ícono del sistema. Las reglas sin uso que conservaban filete lo pierden. La cita legal lo conserva (ADR 116 D6).

### D5. Gastos con filtro dice cuántos y su límite

Bajo el total: "2 gastos · tu límite es $250.000", o "2 gastos" si la categoría no tiene límite. El resumen junto a los filtros que dibuja el tablero 3 sale del mismo dato y no se repite.

### D6. El conflicto de la nube, en Atención hoy

Tipo nuevo `nube-por-decidir` en el motor de avisos: severidad media (no despierta el teléfono), sin interruptor propio, con la acción "Decidir" que lleva a Ajustes.

### D7. Notificaciones bloqueadas, un aviso de atención

Ícono, título "Las notificaciones están bloqueadas" y la línea de cómo volver a activarlas.

### D8. Las dos pruebas

`movil-mv2.test.js` mide la fila del título en diez secciones a 320; `zonas-tactiles.test.js` recorre las secciones buscando bordes izquierdos más gruesos que el derecho.

## Alternativas descartadas

- **Un interruptor para el aviso de la nube.** Un conflicto deja la sincronización detenida; silenciarlo no lo resuelve.
- **El resumen "7 gastos · $278.800" junto a los filtros además del hero.** Repetiría el total que el hero ya muestra en grande.

## Consecuencias

### Positivas

- La suite vigila la fila del título y los filetes; volver a cualquiera de los dos rompe una prueba.

### Negativas / Restricciones

- Un nombre largo en Inicio ocupa dos o tres líneas en un teléfono chico.
