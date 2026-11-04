# ADR 123 - La hoja de formulario completa

**Estado:** Aceptada (2026-11-04). Segunda mitad del pedido "Sí, todas" del [ADR 122](122-lo-que-faltaba-del-canvas-segunda-pasada.md): las piezas que tocan todos los formularios y la prueba de contraste.
**Fecha:** 2026-11-04
**Autores:** Esteban (diseño y decisión), Claude Opus 5.5 (auditoría, implementación y redacción)
**Relación:** **Aplica** el tablero 3 del canvas móvil ("Hojas y formularios: el pie siempre a la vista") y la regla C3. **Extiende** el [ADR 042](042-formularios-v2-visual.md) (teja junto al título) a los dieciséis formularios que no la tenían, y el pie fijo del [ADR 098](098-finko-movil-2-primera-entrega.md) D8 a los catorce que no lo usaban. **Acota** el [ADR 031](031-identidad-de-color-por-seccion.md) (IV.2b): en la hoja del teléfono la franja de color cede su lugar a la agarradera; el dominio lo dice la teja. En tableta y escritorio la franja sigue.

---

## Contexto

| Lo que pide el tablero 3 | Lo que había |
|---|---|
| "Agarradera, título con la teja del dominio y ✕ arriba" | agarradera solo en las hojas de Más, Perfil, Avisos, Día y Detalle; teja en 5 de 21 formularios |
| "El pie con Cancelar y el botón principal queda fijo" | fijo en 8 formularios; en los otros 14 quedaba al final del scroll |
| "Alto máximo del 94 %, con `env(safe-area-inset-top)` arriba y `env(safe-area-inset-bottom)` en el pie" | 92 % sin margen superior; el margen inferior solo en los 8 pies fijos |
| "Errores debajo del campo, con ícono y texto visible, además de `announce()`" | un bloque arriba del formulario con ⚠️ y la lista; solo el primer campo quedaba marcado |
| Tablero 12: contraste AA en claro y oscuro, verificado | sin prueba automática |

## Decisión

### D1. La anatomía de la hoja

Bajo 481 px, donde el modal es hoja:

- **Agarradera** de 40 × 4 px arriba de toda hoja que se cierra (no la llevan las bloqueantes ni la lección). Las que ya tenían la suya la conservan, con el mismo ancho.
- **Cabecera** de 60 px: teja, título y ✕ de 44 px.
- **Alto máximo** `94dvh` menos el margen seguro superior. Con el teclado abierto manda el ADR 115.

Los dieciséis formularios de dominio sin teja la reciben, con el ícono de su sección. Los catorce pies que no eran fijos pasan a `modal__footer--principal`: fijos al borde de la hoja y con el margen seguro inferior.

### D2. Los errores, debajo de su campo

`mostrarErroresForm()` escribe cada error que reconoce bajo su campo, con el ícono de alerta y el texto en el rojo de texto del tema, y marca el campo con `aria-invalid` y `aria-describedby`. Arriba queda una línea que cuenta: "Revisa el campo marcado." o "Revisa los 3 campos marcados.". Un error que no se puede atar a un campo sigue en la lista de arriba, como antes. El foco va al primer campo marcado y `announce()` sigue diciendo el primer error. Todo se limpia al volver a escribir.

### D3. La prueba de contraste

`contraste.test.js` corre la regla `color-contrast` de axe sobre Inicio, Gastos, Por pagar, Metas, Reservas y Ajustes, en tema claro y oscuro, y sobre un formulario abierto con errores.

La primera corrida encontró cinco piezas bajo AA, que se corrigen acá:

| Pieza | Medía | Arreglo |
|---|---|---|
| Filtro activo (`.chip--active`), claro | 2,71:1, blanco sobre el acento | los colores de `.btn-primary`, como ya decía su comentario |
| `.btn-dominio` (Abonar, Marcar pagado) | 4,2:1 claro, 4,33:1 oscuro | el `-text` del dominio con un 20 % del texto principal |
| "Aportar" de Metas | 4,35:1 claro, 4,25:1 oscuro | la misma receta |
| `.chip-info` ("Prueba"), oscuro | 4,42:1 | la misma receta |

El `-text` de cada dominio está calibrado contra la superficie, no contra su propio tinte: por eso fallaba justo en los botones teñidos.

### D4. El foco de apertura no cae en un ícono

`trapFocus()` buscaba enfocables con `[href]`, que también atrapa el `<use href>` de cada ícono SVG. Con la teja antes de la ✕, el foco de apertura caía en el dibujo y se perdía en `<body>` (ya pasaba en los cinco formularios que tenían teja). El selector pasa a `a[href], area[href]`. Lo encontró la E2E del asistente de Distribuir.

Un pie fijo con una fila debajo ("Desactivar fondo", DIS.12) conserva su margen inferior para no taparla.

## Alternativas descartadas

- **Agarradera también en la tableta.** Entre 481 y 1023 px el modal está centrado, no pegado al borde: una agarradera prometería un gesto que no tiene ese sentido visual.
- **Repetir la lista completa arriba además de los errores por campo.** Dos lecturas del mismo error en la misma pantalla; el tablero pide el error donde está el campo.
- **La franja de color y la agarradera juntas.** Dos marcas en los mismos 12 px superiores; la teja ya dice el dominio.

## Consecuencias

### Positivas

- Ningún formulario deja el botón de guardar al final del scroll ni un error sin texto visible junto a su campo.
- La suite vigila el contraste en los dos temas.

### Negativas / Restricciones

- El campo de un error se adivina por palabras del mensaje (como ya pasaba). Un mensaje nuevo que no nombre su campo cae en la lista de arriba, no se pierde.
