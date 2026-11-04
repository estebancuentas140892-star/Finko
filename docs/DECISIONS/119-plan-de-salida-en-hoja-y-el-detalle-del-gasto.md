# ADR 119 - El plan de salida en hoja y el detalle del gasto

**Estado:** Aceptada (2026-11-04). Cuarta tanda de la tarjeta **MV2.3**. Esteban decidió aplicar el canvas "tal cual como propone el HTML", también donde acota decisiones aprobadas.
**Fecha:** 2026-11-04
**Autores:** Esteban (diseño y decisión), Claude Opus 5.5 (implementación y redacción)
**Relación:** sigue al [ADR 118](118-el-dia-en-hoja-y-las-hojas-se-cierran-de-tres-formas.md). **Cierra** la deuda de la ficha 05 ("Ver plan de salida" al pie de Por pagar) y la pieza MV2.14 del canvas. **Acota** el [ADR 098](098-finko-movil-2-primera-entrega.md) D4 para los gastos: su hoja deja de copiar la fila y trae datos propios. Solo bajo 1024 px; escritorio no cambia ([ADR 073](073-deudas-inventario-con-su-herramienta-al-lado.md)). **Aplica** la regla 1 del [ADR 060](060-lectura-cross-domain-de-solo-lectura.md): Gastos lee el cálculo del límite de `presupuesto/logic.js`.

---

## Contexto

| Hallazgo del canvas | Lo que había |
|---|---|
| L4 y MV2.14: "el simulador aparece antes que la lista"; la ficha 05 pedía "Ver plan de salida" al pie | la estrategia bajó al final de la lista, pero entera: dos tarjetas, tres palancas, un campo y un botón, de 900 a 1.400 px |
| Pantalla "Detalle de un gasto" | la hoja de la fila copiaba lo que la fila ya decía y sus tres botones; no decía de qué cuenta salió, cómo va el límite de la categoría ni qué pasa al borrar |

## Decisión

### D1. "¿Cómo salir más rápido?" al pie, y el plan en su hoja

Con dos o más deudas, al pie de Por pagar va una tarjeta: "¿Cómo salir más rápido?", "Compara Avalancha y Bola de nieve con tus N deudas. Es una simulación: nada cambia hasta que confirmes." y "Ver plan". La tarjeta abre una hoja con el simulador completo, el mismo de siempre: `#estrategia-pago` se muda a la hoja bajo 1024 px y vuelve a su lugar en escritorio. Sin cambios de lógica.

### D2. La hoja del gasto tiene datos propios

Tocar un gasto en Gastos abre la hoja con:

- La categoría como título, el monto y la fecha ("Ayer, martes 27 de octubre").
- "Salió de", "Nota" y "Categoría", en filas.
- Si la categoría tiene límite: "Restaurantes lleva $278.800 de su límite de $250.000 en octubre. Ver límite".
- "Repetir hoy" y "Editar".
- "Los N gastos de Restaurantes en octubre", que abre Movimientos con la categoría y el mes puestos.
- Aparte, "Borrar este gasto" y debajo qué pasa: "Te pediremos confirmar. Los $46.900 vuelven a Bancolombia Ahorros."

Con el ojo puesto se tapan los montos. Movimientos, Mis cuentas y las fuentes de ingreso conservan la hoja que copia la fila.

## Alternativas descartadas

- **Dos copias del simulador**, una en la sección y otra en la hoja. Sus campos guardan estado de la simulación (BUG-011); con dos, cada una diría otra cosa.
- **Pasar los datos nuevos por atributos de la fila** para que `detalle-fila.js` los copie. Eran cuatro cálculos por fila pintada para una hoja que se abre una vez.

## Consecuencias

### Positivas

- La lista de Por pagar termina en una tarjeta de 90 px y no en un simulador de 1.000.
- La hoja del gasto responde lo que se viene a preguntar al tocarlo, sin salir.

### Negativas / Restricciones

- `#estrategia-pago` cambia de padre según el ancho; quien lo busque por posición dentro de la sección lo encuentra solo en escritorio.
- La hoja del gasto tiene su propio armado (`gastos/views/detalle.js`); si la fila suma un dato, la hoja no lo hereda sola.
