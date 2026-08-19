# ADR 074 - Me deben adopta la anatomía que Finko ya escribió para Deudas

**Estado:** Aceptada. En implementación (iniciativa DSK.5, dos rebanadas).
**Fecha:** 2026-08-18
**Autores:** Esteban (producto), Claude Design (auditoría "Me deben 1920"), Claude Opus 5 (implementación)
**Relación:** hereda de los [ADR 070](070-inicio-centro-de-atencion-en-escritorio.md), [ADR 071](071-calendario-como-mapa-del-mes-en-escritorio.md), [ADR 072](072-gastos-cabecera-de-banda-y-fila-con-cuenta.md) y [ADR 073](073-deudas-inventario-con-su-herramienta-al-lado.md) la banda de cabecera, y **aplica a esta sección la anatomía de tarjeta que el [ADR 036](036-deudas-v2-visual.md) decidió para Deudas**. Conserva entero el [ADR 047](047-me-deben-v2-intereses-e-historial.md) (el lenguaje de seguimiento sin presión de cobro, el historial que describe y no califica). No toca la lógica: `logic.js` de `personales` no cambia.

---

## Contexto

Me deben y Deudas son **la misma forma de contenido con los papeles cambiados**: alguien, un monto, un estado con fecha y una acción para registrar un pago. Deudas tiene componente propio (`.deuda-card`); Me deben usa `.list-item`, el genérico que comparte con Gastos y Movimientos.

Y la corrección ya está escrita: el comentario que introduce `.deuda-card` dice que **"reemplaza al `.list-item` con hints apilados"**. Ese diagnóstico se hizo, esa solución se implementó, y no cruzó a la sección espejo. Todo lo demás que la auditoría encontró se deriva de ahí:

- **Notas apiladas como párrafos de 970px.** Hasta tres `.list-item__hint` seguidos bajo el título, cada uno a 970px de ancho para textos de 30 a 60 caracteres. Son datos cortos de contexto (el motivo, la fecha pactada, el último abono, la tasa) presentados como párrafos.
- **889px entre el nombre y su monto.** Tercera vez que aparece el mismo defecto en la auditoría de escritorio: Inicio (360px), Deudas (1013px) y acá. Siempre por lo mismo, una fila de móvil sin tope de ancho.
- **Barra de proporción de 970px en la fila y de 1342 en el resumen.** A 1342 cada píxel vale 0,07 %: una precisión que el dato no tiene y que nadie lee. Además es el elemento más ancho de la fila, así que la mirada lo toma como el dato principal cuando es el más secundario.
- **Alturas de fila de 131, 236, 155, 165 y 131.** Un 80 % de diferencia entre la más alta y la más baja, decidida por cuántas notas tenga cada préstamo: el ritmo de la lista lo fijan los datos.
- **El resumen gasta 224px de alto para cuatro números**, con una rejilla `repeat(2, minmax(0, 1fr))` que es una decisión explícita de móvil.

---

## Decisión

### D1. La composición es banda arriba y la lista en dos columnas de tarjetas

No es un mosaico ni un reparto de página. Me deben tiene **un solo objeto**: la lista de a quién le prestaste. El resumen no es un segundo objeto, es el total de esa lista, así que no hay nada que poner en una columna lateral.

Lo que se corrige es el estiramiento, y la salida es poner la misma lista **2-up**: dos tarjetas por fila en vez de una fila de 1376. Se descarta la alternativa de una sola columna acotada con aire a la derecha porque la pregunta de la sección es *a quién le toca*, y eso se contesta viendo a todos a la vez: 2-up muestra los cinco préstamos en la primera pantalla y una columna acotada mostraría tres. Es el mismo razonamiento que puso las cuatro cuentas de Inicio en fila en vez de apiladas.

`align-items: stretch` (el que la rejilla trae de fábrica) iguala las tarjetas de cada fila, así que el defecto de las alturas irregulares se corrige solo.

### D2. La tarjeta adopta la anatomía de `.deuda-card`

Cabecera con teja, nombre y chips de estado; el monto a la derecha con su histórico debajo; el motivo como texto en una línea; y un pie con el avance y las acciones. **No es un patrón nuevo: es aplicar acá una decisión que Finko ya tomó**, y por eso la tarjeta no estrena ni un color, ni una tipografía, ni un componente.

**Las notas pasan a chips**, que es lo que son. El motivo se queda como texto porque es una cita del usuario, no un dato.

Vale en todos los anchos: es la anatomía del componente, no su reparto. En móvil la tarjeta pierde las tres líneas de párrafo gris que hoy la estiran.

### D3. La barra de proporción se topa

120px en la tarjeta y 180 en el resumen, con el porcentaje en texto al lado. Una proporción no necesita más: lo que la barra aporta es la lectura de un vistazo, y el número exacto ya lo da el texto. **Las barras se conservan con el ojo de privacidad activo**, como hoy: muestran proporción, no magnitud.

### D4. El corte entre activos y liquidados se hace visible

`view.js` ya concatena los activos y después los liquidados, y su comentario declara que el corte es una decisión de presentación. Lo que falta es que se vea: un rótulo **"Ya te pagaron"** y borde discontinuo en las cerradas.

**Sin atenuar.** Bajar la opacidad de la tarjeta cerrada compone todo su subárbol y hunde el chip "Liquidado" y el motivo por debajo de AA. Finko ya resuelve esto dos veces sin atenuar texto: la atenuación de "pasado" del calendario se acota a los días sin contenido, y una deuda saldada cambia su meta por un chip verde a plena opacidad.

### D5. "Nuevo préstamo" en los dos sitios, incluido el `aria-label`

Hoy el botón del encabezado dice "+ Agregar préstamo" en pantalla y "Registrar nuevo préstamo personal" en su `aria-label`, y el del estado vacío dice "+ Agregar préstamo". D3 del lenguaje de acciones: fuera el "+", y el verbo es "Nuevo" porque un préstamo es una entidad persistente, no un hecho que se registra. La propia sección ya se había fijado la regla de que la misma acción se llame igual en todos lados.

### D6. Lo que no se toca, y acá más que en ninguna otra sección

El tono de seguimiento sin presión de cobro ("La fecha de pago pasó hace 10 días", nunca "vencido"). Que el historial por persona describa y no califique, sin puntajes ni semáforos sobre alguien que ni usa la app. Que los préstamos sin fecha pactada queden fuera del conteo de puntualidad. Que el abono heredado de la migración se rotule "Antes de este historial". Que el reloj de antigüedad se reinicie con cada abono. Y el énfasis de "Pendiente" en el resumen.

Esta es la sección donde el trabajo fino está en el lenguaje y no en la composición, y la composición no tiene por qué costarle nada al lenguaje.

---

## Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| Columna lateral, como Deudas y Calendario | esas dos tienen dos objetos (un inventario y algo que actúa sobre él). Acá solo hay uno: repetir la forma sin el motivo que la justificaba |
| Una sola columna acotada con aire a la derecha | muestra tres préstamos donde 2-up muestra cinco, y la pregunta de la sección se contesta viéndolos a todos a la vez |
| Atenuar la tarjeta liquidada | la opacidad de grupo compone el subárbol y baja el chip "Liquidado" a 4,11:1 y el motivo a 4,41, los dos bajo AA. El rótulo de corte y el chip ya dan la señal |
| Dejar `.list-item` y solo acotar anchos | los síntomas (notas apiladas, barra estirada, alturas irregulares) son de la anatomía, no del ancho. La solución ya estaba escrita para la sección hermana |
| Quitar las barras con el ojo activo | muestran proporción, no magnitud, y esa distinción ya está decidida |

---

## Consecuencias

- Las dos secciones hermanas quedan con el mismo acabado, y la próxima corrección que se haga en una tiene una sola forma que copiar en la otra.
- **D2, D3 y D5 se ven también en móvil**: son anatomía, tope de ancho y copia, no reparto. La ficha de MOV.1 que toque Me deben las hereda; no se descubren por sorpresa.
- El rótulo de corte "Ya te pagaron" es marcado nuevo en la vista, y por tanto también aparece en móvil, donde hoy tampoco se ve dónde termina lo que sigue abierto.
- La sección deja de ser la única de la familia sin componente propio de tarjeta, lo que a su vez deja de justificar excepciones en `.list-item`, que es compartido con Gastos y Movimientos.
