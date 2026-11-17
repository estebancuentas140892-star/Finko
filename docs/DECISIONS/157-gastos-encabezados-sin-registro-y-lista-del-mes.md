# ADR 157 - Gastos: encabezados sin botón de registro y la lista del mes

**Estado:** Aceptada (2026-11-16).
**Fecha:** 2026-11-16
**Autores:** Esteban (tablero "Gastos · Rediseño integral"; pedido: "vamos a realizar los cambios propuestos en el HTML"), Claude Opus 5.5 (implementación)
**Relación:** Mitad visual del tablero; la hoja "Nuevo gasto" y el vacío de Día a día van en el ADR 156 (GAS.3, otra sesión). **Cambia** el [ADR 098](098-finko-movil-2-primera-entrega.md) D5 (el espejo "+ Gasto" y la frase del bloque), el [ADR 106](106-un-encabezado-tres-niveles.md) D1, D2 y D4 (la frase bajo el título, el tamaño del título y el primario tonal del encabezado), el [ADR 132](132-gastos-del-adulto-en-el-telefono.md) D1 (el mes) y el [ADR 133](133-ahorro-del-adulto-en-el-telefono.md) D1 (la frase de cada hija de Ahorro), todo bajo 1024 px. Se apoya en el [ADR 148](148-el-boton-central-registra-segun-la-seccion.md): crear ya es el botón central.

---

## Contexto

El tablero trae once páginas a 390 x 844. Esta mitad toma tres: "Gastos · con movimientos", "Encabezados sin botón de registro" (Gastos, Mis cuentas, Metas y Me deben) y lo que la primera muestra de la lista del mes. El resto (las ocho páginas de la hoja "Nuevo gasto" y "Gastos · primera vez") lo aplica la sesión de GAS.3, con archivos repartidos por mensaje para no chocar.

Frente a la app, las cabeceras del tablero no tienen frase debajo ni botón de crear: la del bloque Gastos pone el mes en una pastilla en la misma fila que el nombre, y las de las demás secciones llevan solo teja, nombre y ojo.

## Decisión

### D1. El bloque Gastos en una fila (GAS.4a)

"Gastos", la pastilla del mes ("‹ Noviembre ›", 40 px de alto, sobre el riel de las lentes), la lupa y el ojo, en ese orden. Sale la frase "Todo el dinero que se te va" y sale el espejo "+ Gasto" / "+ Agregar" / "+ Límite" con su acción `bloque-primario`. La pastilla dice solo el mes en el año corriente y "Nov 2025" en otro año (`etiquetaCortaMesBloque`), para que quepa desde 360 px; bajo 360 el mes baja a su propia fila, a la izquierda. El grupo dice el mes completo al lector ("Seleccionar mes, Noviembre 2026"). Las flechas pasan a ser el chevron del sprite, de 36 px con su zona de 44 dentro de la pastilla; la lupa y el ojo siguen en 44 (R4), no en los 40 del tablero. "›" sigue deshabilitado en el último mes navegable.

### D2. Las demás cabeceras: teja, nombre y ojo (GAS.4a)

Bajo 1024 px, el primario del encabezado de cada sección y su frase ("Dónde está tu dinero y de dónde viene") dejan de verse. El primario **sigue en el DOM**: lo leen el botón central (ADR 148 D1) y la barra superior de escritorio (ADR 059 D3), así que ninguno de los dos cambia. La frase sigue en escritorio. El nombre pasa a 24 px (26 en "Gastos", que es portada de bloque), 22 bajo 375 y 20 bajo 360; la teja, a 36 px con radio 11. La lupa y el ojo van en el color del texto.

### D3. Lo que cambia de ADR anteriores (GAS.4a)

- **ADR 098 D5:** sin espejo ni frase en el bloque. La lupa se queda.
- **ADR 106 D1 y D4:** la fila ya no lleva crear ni la frase debajo; el primario tonal de 44 px queda solo para "+ Fuente fija" de Mis cuentas, que crea una regla dentro del contenido.
- **ADR 106 D2:** 22 px pasa a 24 (26 en Gastos).
- **ADR 132 D1:** las flechas sueltas pasan a la pastilla.
- **ADR 133 D1:** la frase de cada hija de Ahorro se calla en el teléfono.
- **R51 (un primario por pantalla) y ADR 077 D4:** las reglas que ocultaban el "+" del encabezado cuando el vacío traía su botón ya no hacen falta y salen.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Sacar el primario del encabezado del HTML | Es la fuente del botón central y de la barra de escritorio (ADR 148, ADR 059): habría que inventar un mapa sección a acción. |
| Dejar el año en la pastilla siempre | "Noviembre 2026" no cabe a 360 px junto al nombre, la lupa y el ojo. |
| Mantener la frase bajo el título | El tablero no la trae en ninguna de las cuatro cabeceras; la teja y el nombre ya dicen dónde estás. |

## Consecuencias

- Crear algo en una sección es solo el botón central. Quien no lo descubra pierde el "+" de arriba; el central lleva el nombre accesible de lo que abre (ADR 148 D4).
- Los E2E del teléfono que tocaban el "+" del encabezado o el espejo tocan ahora el botón central.
