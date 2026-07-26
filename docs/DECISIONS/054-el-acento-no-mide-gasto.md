# ADR 054 - El acento de marca no mide magnitudes de gasto

**Estado:** Aceptada el 2026-07-25. Esteban eligió la variante recomendada por la auditoría (V1) al revisar los hallazgos de la sección Inicio.
**Fecha:** 2026-07-25
**Autores:** Esteban (decisión), Claude Design (auditoría de diseño de Inicio, hallazgo H7), Claude Opus 5 (verificación contra el código y formalización).
**Origen:** hallazgo H7 y variante V1 de la auditoría de diseño de Inicio del 2026-07-25.
**Relación:** **revisa** el [ADR 034](034-inicio-v2-dashboard-decision.md) D6 (resumen semanal como el bloque más visual), que fijó `--fk-accent` en la barra del día pico. Conserva el resto del D6 sin tocar: la fila superior, el chip comparativo, el mini gráfico de 7 días, la fila de categoría top y la serie diaria de `resumen/logic.js`. Aplica el [ADR 031](031-identidad-de-color-por-seccion.md) (tokens de dominio, "el color nunca viaja solo") y respeta el [ADR 019](019-limites-por-rol.md) ("gastar no es incumplir").

---

## Contexto

El D6 del ADR 034 especificó el mini gráfico semanal de Inicio así: barras de 7 días con `--fk-accent` al 100 % en el día pico y al 28 % en el resto, más la etiqueta del día pico resaltada con `--fk-text-accent`. Se implementó tal cual en `styles/components/domain.css` (`.resumen-semana__barra-fill`, `.resumen-semana__barra-fill--pico`, `.resumen-semana__dia--pico`).

El principio 7 de [`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) reserva el esmeralda de marca para **dinero disponible, progreso y éxito**. El criterio AUD.4, ya aplicado en `.list-item`, manda las magnitudes de gasto en neutro. El resultado en pantalla es una lectura invertida: el día en que más se gastó queda pintado con el color del logro, en el bloque más visual de la pantalla más visitada.

El conflicto es de significado, no de contraste: los dos colores pasan AA. El costo de dejarlo es que el usuario aprende que el verde a veces premia y a veces solo mide, y esa ambigüedad se paga en toda la app.

## Decisión

**Las magnitudes de gasto se pintan en la familia `--fk-dom-gastos` o en neutro. `--fk-accent` queda reservado a dinero disponible, progreso y logro.**

En el resumen semanal de Inicio:

| Elemento | Antes (ADR 034 D6) | Ahora |
|---|---|---|
| Barras de los 6 días restantes | `color-mix(in srgb, var(--fk-accent) 28%, transparent)` | `color-mix(in srgb, var(--fk-dom-gastos) 28%, transparent)` |
| Barra del día pico | `var(--fk-accent)` | `var(--fk-dom-gastos)` |
| Etiqueta del día pico | `var(--fk-text-accent)` | `var(--fk-dom-gastos-text)` |

**El chip comparativo no cambia.** "12 % menos" sigue en `--fk-success-text` con `i-trending-up` invertido: bajar el gasto sí es un logro, y esa parte del D6 es coherente con el ADR 019. Gastar más sigue en neutro o ámbar, nunca en rojo alarmante.

La variante `-text` de la etiqueta no es decorativa: en tema claro `--fk-dom-gastos-text` baja a `#d13b00` (4.84:1 sobre blanco) mientras `--fk-dom-gastos` se queda en `#ff8a5c`, que no pasaría como texto. Es la regla de [ADR 031](031-identidad-de-color-por-seccion.md) aplicada al pie de la letra: el relleno usa el color de dominio, el texto usa su variante `-text`.

Alcance: solo el mini gráfico del resumen semanal de Inicio. Ningún otro bloque de la app usaba el acento para medir gasto, así que no hay barrido pendiente.

## Consecuencias

- Un color, un significado: el verde deja de competir consigo mismo dentro de la misma tarjeta (chip verde de logro + barra verde de gasto).
- El naranja de gastos aparece en Inicio, lo que refuerza la identidad por dominio que el ADR 031 ya sostiene en Gastos, Movimientos y las tejas de categoría.
- Queda como regla escrita (R6 en [`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md)), así que las secciones futuras la copian en vez de volver a decidirla.
- Ningún cambio de lógica, de datos ni de schema: son tres declaraciones CSS. Los tests que tocan el panel verifican estructura (`.resumen-semana__barra-fill--pico` existe una vez), no color, y siguen verdes sin edición.

## Alternativas consideradas

- **Dejar el acento como lo fijó el D6:** descartada por Esteban. Era la opción de cero trabajo y conservaba un ADR aceptado intacto, pero mantenía la lectura invertida en el bloque más visual de Inicio y obligaba a documentar el principio 7 con una excepción sin argumento propio.
- **Barras en neutro (`--fk-text-muted`) sin color de dominio:** cumple AUD.4 y es lo más sobrio, pero desperdicia la señal del pico: sin color, el día de mayor gasto solo se distingue por altura, y con dos días parecidos la lectura se pierde.
- **Pintar de rojo o ámbar el día pico:** descartada de entrada. Es exactamente lo que el ADR 019 prohíbe: gastar no es incumplir, y un pico semanal no es una alerta.
