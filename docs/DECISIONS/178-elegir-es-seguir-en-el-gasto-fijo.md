# ADR 178 - Elegir es seguir en el gasto fijo

**Estado:** Aceptada (2026-11-18). Pedido en chat, "Mejorar la navegación del formulario de Gastos Fijos": "Quiero eliminar esa interacción adicional y hacer que el formulario avance automáticamente cada vez que el usuario seleccione una opción", conservando el diseño de GF.2.
**Fecha:** 2026-11-18
**Autores:** el pedido (producto), Claude Opus 5.5 (cómo se resuelven los casos que el pedido no nombra)
**Relación:** **Cambia** el [ADR 177](177-el-gasto-fijo-en-cuatro-pasos-con-nombre.md) en tres puntos que el pedido revierte a propósito: D2 ("Tocar elige; Siguiente avanza"), D3 (la empresa con "Siguiente" junto a "Sin empresa") y D5 ("Tocar un día no avanza: el botón dice Ver el resumen"). Lo demás del ADR 177 sigue igual: los cuatro pasos, las familias, las pantallas, el resumen y el escritorio. **Amplía** el armazón del [ADR 142](142-formularios-por-tarea.md) D5, que ya avanzaba al tocar en los formularios sin pasos con nombre.

---

## Contexto

Con GF.2, el teléfono pedía dos toques por decisión en tres pantallas: elegir la categoría y "Siguiente", elegir la empresa y "Siguiente", elegir el día y "Ver el resumen". El ADR 177 lo había decidido así porque el canvas mostraba el botón. El pedido lo quita: la elección basta.

Dos pantallas no son una sola elección: "¿Cuándo lo pagas?" junta cada cuánto (con "Mensual" ya marcado) y qué día; y "Otra" frecuencia abre el desplegable de Finko. El monto y "Crea tu categoría" se escriben.

---

## Decisión

### D1. Qué avanza al tocarlo

| Pantalla | Al tocar | Pie |
|---|---|---|
| ¿Cuánto pagas? | (se escribe) | "Siguiente", como hoy |
| ¿Qué es? | una categoría lleva a la empresa, a "Crea tu categoría" o a "¿Cuándo lo pagas?" | ninguno |
| ¿Con qué empresa? | una empresa lleva a "¿Cuándo lo pagas?" | solo "Sin empresa", a lo ancho |
| Crea tu categoría | (se escribe) | "Usar esta categoría", como hoy |
| ¿Cuándo lo pagas? | el día lleva al resumen; cada cuánto, solo si el día ya está; "Otra" no avanza y elegir en su desplegable sí (con el día puesto) | ninguno |
| Revisar | cada fila lleva a su pregunta | "Guardar gasto fijo", como hoy |

Tocar otra vez la opción ya elegida también sigue (como las tejas de Registrar gasto): así se avanza al volver con Atrás sin cambiar nada. Desde el resumen tampoco hay "Listo" en una pantalla de elegir: elegir vuelve al resumen y Atrás vuelve sin cambiar nada.

### D2. Cómo se siente el avance

- **La elección se ve un instante** (`PAUSA_ELEGIR_MS`, 180 ms) con su visto antes de pasar. Un segundo toque en ese instante no salta otra pantalla; Atrás lo anula.
- **Avanza solo si la pantalla quedó respondida, sin marcar error.** Elegir "Quincenal" antes del día no es un error: la pantalla espera el día. Con el día puesto, cambiar cada cuánto lleva al resumen.
- **El teclado no avanza solo** (como desde el ADR 142): las flechas eligen y Enter sigue.

### D3. La transición

Cada pantalla entra con un fundido de 220 ms que sube 6 px (`preguntas-paso-in`, `--fk-ease-out`): el bloque al aparecer y la cabecera (lo ya respondido, la pregunta y su ayuda). La barra de pasos no entra: cambia de color con su transición. Con movimiento reducido no hay fundido (`a11y.css`).

### D4. Dónde vive

En el armazón (`ui/preguntas.js`), solo para los formularios con `data-pasos`: hoy, el gasto fijo. Nueva deuda, Nueva cuenta y los demás siguen como estaban (avanzan al momento, sin pausa ni fundido). El gasto fijo deja de pedir `data-no-avanza` en "¿Qué es?", la empresa y "¿Cuándo lo pagas?"; solo "Otra" frecuencia lo conserva. Las opciones `data-no-avanza` y `data-avanza` siguen en el armazón para quien las pida.

### D5. Lo que se arregla de paso

Elegir en el desplegable de "Otra" frecuencia no rehacía el aviso del calendario ni la fila "Cada cuánto" del resumen (el desplegable despacha `change`, y el gasto fijo solo escuchaba `input`), y el botón del desplegable seguía diciendo la frecuencia de antes al volver a "Otra". Con el avance automático, el resumen mostraba el dato viejo justo después de elegir. Ahora escuchan `change` y el botón se refresca.

---

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Avanzar al momento, sin pausa | La elección no se alcanza a ver: el toque parece no haber hecho nada y la pantalla cambia de golpe |
| Cada cuánto en su propia pantalla otra vez | Revierte el ADR 177 D5, que el pedido conserva ("no quiero que volvamos a modificar toda la interfaz") |
| Que cada cuánto avance siempre | Con "Mensual" ya marcado, elegir "Quincenal" sin día llevaría a un error |
| Dejar "Siguiente" a la vista, más discreto | El pedido es quitarlo |
| Llevar la pausa y el fundido a todos los formularios del armazón | El pedido es del gasto fijo; las demás hojas no se tocan sin pedirlo |

---

## Consecuencias

### Positivas

- Registrar un fijo con empresa pasa de siete toques a cuatro después del monto: categoría, empresa, día y Guardar.
- Lo que se escribe conserva su botón, y la vuelta atrás no cambia.

### Negativas / Restricciones

- Quien quiere revisar otra empresa o categoría sin cambiarla vuelve con Atrás o toca otra vez la suya.
- El armazón suma una diferencia entre formularios con y sin pasos con nombre (la pausa, el fundido y la regla de "respondida").
