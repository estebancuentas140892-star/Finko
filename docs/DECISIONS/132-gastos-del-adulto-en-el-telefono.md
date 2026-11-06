# ADR 132 - Gastos del adulto en el teléfono

**Estado:** Aceptada (2026-11-05). Tanda 1 aplicada (SW v675). En aplicación por tandas: (1) el selector de mes, Día a día y los vacíos de las tres lentes; (2) Por pagar y la hoja de una deuda; (3) Límites y las hojas de un límite y de un límite nuevo; (4) la hoja "Nuevo gasto"; (5) la hoja del plan de salida. El tablero se borra de `Diseño Finko/` al cerrar la quinta.
**Fecha:** 2026-11-05
**Autores:** Esteban (diseño y decisión: "vamos con el siguiente cambio de diseño"), Claude Opus 5.5 (auditoría, implementación y redacción)
**Relación:** **Aplica** el tablero "Finko móvil · rediseño1" (Claude Design, `Diseño Finko/`), la segunda pieza de MV2.30, sobre la identidad del [ADR 127](127-identidad-bosque-y-sol.md). **Supera** en la fila de un gasto el TX.9a (la categoría como título siempre) y el orden del [ADR 072](072-gastos-cabecera-de-banda-y-fila-con-cuenta.md) D2 (la cuenta abre el subtítulo), D4. **Acota** el [ADR 098](098-finko-movil-2-primera-entrega.md) D6 (la barra plegada de categorías, D2) y el [ADR 039](039-gastos-v2-visual.md) D3 (el encabezado del día, D3). **Conserva** el [ADR 127](127-identidad-bosque-y-sol.md) D5 (el total sigue en su tarjeta de identidad, aunque el tablero lo dibuja suelto), el [ADR 077](077-limites-de-gasto-tres-grupos-a-la-vista.md) D4 (un botón siempre, nunca dos) y a Tino en los vacíos ([ADR 129](129-tino-ronda-2-en-el-adulto.md)).

---

## Contexto

El tablero compara, para las tres lentes de Gastos y sus hojas, la pantalla de hoy (capturas del 2026-11-04, antes de la identidad v3) con una propuesta: Día a día, Por pagar y Límites con uso normal, vacías y a 360 px con textos largos; las hojas "Nuevo gasto", "Detalle de una deuda", "Detalle de un límite", "Nuevo límite" y tres estados del plan de salida. Se auditó cada propuesta contra la app de hoy fotografiada con los mismos datos.

## Decisión

### D1. El selector de mes (tanda 1)

Las flechas van sueltas, sin caja, y el mes en negrita entre ellas. Bajo 1024 px.

### D2. Las categorías de Día a día (tanda 1)

La barra plegada muestra "Todos", las tres categorías en las que más se gastó en el mes (de mayor a menor), la activa si no está entre ellas y "+N categorías" con borde punteado. Abierta, sigue siendo el índice alfabético completo (ADR 072 D1). Antes, plegada, mostraba solo "Todos" y la activa.

### D3. El encabezado de cada día (tanda 1)

"Hoy", "Ayer" y después el día de la semana completo con su número ("Martes 10"): el mes ya está en el selector. Con el año o el mes distintos al visible se agregan. Sin mayúsculas sostenidas; el total del día en el color secundario.

### D4. La fila de un gasto (tanda 1)

- Título: la nota o la descripción del gasto si tiene; si no, la categoría.
- Subtítulo: "Categoría · Cuenta" cuando el título es la nota; solo la cuenta cuando el título ya es la categoría.
- Vale en los dos anchos: es contenido, no maquetación.

### D5. La salida al historial (tanda 1)

"Ver historial completo" es un enlace del color de la acción con su flecha, centrado.

### D6. Los vacíos de las tres lentes (tanda 1)

- El botón vive dentro de la tarjeta del vacío y es el primario: el "+" del encabezado se esconde mientras la lente está vacía (la regla de `responsive.css` que ya lo hacía en Por pagar).
- Día a día: "Registrar gasto".
- Por pagar: "¿Qué quieres agregar primero?" con los tres caminos en filas (gasto fijo, deuda con entidad, deuda personal), cada una con su ejemplo; abren el formulario de una vez, sin la hoja intermedia.
- Límites: el ejemplo ("un máximo de $300.000 para Restaurantes") y "Crear límite". Hoy esa lente vacía no tenía botón.
- Tino sigue en la tarjeta (ADR 127 D6 y 129 D3), donde el tablero dibuja una teja.

### D7. Por pagar (tanda 2)

Encabezados de grupo sin mayúsculas sostenidas ("Vencidos" en rojo con "Del más antiguo al más reciente" debajo); el pago se marca con un círculo a la derecha de cada fila (rojo vencido, ámbar hoy, neutro el resto) en vez de un botón por fila; una línea de ayuda arriba ("Toca el círculo cuando pagues algo"); los filtros en el color de la sección; "¿Cómo salir más rápido?" con "Ver plan" a todo el ancho. Tocar la fila abre "Detalle de una deuda": la cuota del mes, cuánto falta, la tasa y el día de pago, "Abonar", "Editar" y "Eliminar esta deuda".

### D8. Límites (tanda 3)

"Tu plan de noviembre" como una tarjeta con "Ajustar" y una línea por grupo con lo que mide cada uno; los topes en una sola tarjeta con filas compactas (monto arriba, barra, "Pasó por" o "Quedan" y el porcentaje de su tope), sin botones por fila: la fila abre "Detalle de un límite" (lo gastado contra el tope, sus gastos del mes, "Cambiar el límite" y "Quitar este límite"); "Gastas acá y no tiene tope" con "+ Límite". "Nuevo límite" elige la categoría en una grilla y dice cuánto lleva en el mes.

### D9. La hoja "Nuevo gasto" (tanda 4)

El monto grande arriba, la grilla de categorías, la cuenta con "Cambiar", "¿Cuándo?" en tres botones (Hoy, Ayer, Otra fecha) y la nota al final, con el pie fijo de siempre (ADR 123).

### D10. La hoja del plan de salida (tanda 5)

El resultado primero ("sales de deudas en 15 meses y pagas $X en intereses"), Bola de nieve y Avalancha como dos pestañas con la recomendada marcada, el orden en que se terminan las deudas, "Si pagas un poco más cada mes" con su efecto y "Aplicar", y "Otras opciones" (renegociar, juntar) como filas. Si las cuotas no alcanzan para los intereses, el aviso va primero con lo que crece cada deuda y "Lo mínimo para salir".

## Lo que se ajusta al pasar del tablero a la app

| El tablero dice | La app dice | Por qué |
|---|---|---|
| El total del mes suelto, sin tarjeta | la tarjeta de identidad de Gastos y de Por pagar | ADR 127 D5, posterior al tablero |
| Una teja con el ícono de la sección en los vacíos | Tino sobre su sol | ADR 127 D6 y 129 D3 |
| "Ahorro" en la barra de abajo lleva a la casa | `#fondo` | la casa se retiró (ADR 125) |

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Dejar la categoría como título siempre (TX.9a) | con dos gastos de Restaurantes el mismo día, la nota es lo único que los distingue; el tablero la sube |
| Las tres categorías del chip por orden alfabético | el atajo sirve si son las que más se usan; alfabético ya es la barra abierta |
| La hoja "¿Qué quieres agregar?" también en el vacío de Por pagar | un toque de más para quien llega por primera vez; el vacío ya tiene el espacio para las tres |

## Consecuencias

- La fila de un gasto cambia también en escritorio (D4).
- Cada tanda se publica sola, con su prueba y su versión del Service Worker.
