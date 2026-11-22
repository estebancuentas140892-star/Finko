# ADR 188 - Gastos: la especificación integral

**Estado:** Aceptada (2026-11-21).
**Fecha:** 2026-11-21
**Autores:** Esteban (tablero "Gastos · Rediseño integral" de 2026-11-21; pedido: "vamos a aplicar todos los cambios propuestos en este HTML, cada vez que termines una tarea, realiza commit y push"), Claude Opus 5.5 (implementación)
**Relación:** Es la especificación del lienzo que aplicaron el [ADR 185](185-gastos-movil-cada-lugar-con-una-funcion.md) y sus correcciones ([ADR 186](186-movimientos-encuentra-y-hormiga-por-frecuencia.md), [ADR 187](187-cada-pestana-con-su-cifra-y-cada-vencimiento-con-su-pago.md)). **Cambia** el ADR 185 D1 (vuelve la fila del nombre, con la lupa como única búsqueda de Gastos), D3 (el área Movilidad y la categoría Transporte) y D4 (el detalle ya no repite la categoría arriba); el [ADR 175](175-a-donde-se-paga.md) en el rótulo del dato para pagar de cada fijo, y el [ADR 166](166-un-ojo-por-seccion.md) solo en dónde va el ojo y qué más tapa. Todo bajo 1024 px. Escritorio no cambia salvo el renombre de D1.

---

## Contexto

El tablero trae cuatro páginas: "Especificación · componentes" (medidas a 393 px de cada pieza: cabecera, pestañas, tarjeta, fila, estados de pago, tejas, paso a paso, botones, segmentado, hojas y factura), "Especificación · estados" (cada pantalla con datos, la primera vez, un mes pasado sin registros y con algo pendiente), "Especificación · recorridos" (registrar un gasto, un fijo, una deuda con una entidad y con una persona, un límite, consultar, el resumen del mes y el plan de deudas) y "Decisiones tomadas" (cuatro puntos que quedaban abiertos). Dice que "ya está aplicado en todas las pantallas del lienzo"; el lienzo no viene en el archivo, así que cada punto se comparó contra la app en `origin/main` (GAS.12d) a 393 x 852, 360 x 640 y 320 x 568.

## Decisión

### D1. Las áreas del registro (GAS.13a)

Comida, **Transporte**, Personal y Casa y familia: el área que se llamaba Movilidad pasa a Transporte, y la categoría Transporte pasa a **"Bus, taxi y apps"** para que ningún rótulo repita el nombre de una categoría; al lado de Carro o moto la pregunta queda en "¿te llevaron o manejaste?". Sus opciones no cambian (Transporte público, Taxi, App de transporte).

Es un renombre con migración (v59), como Mecato a Antojos: los gastos, los límites y lo aprendido de hormiga cambian de nombre; los ids de las opciones y el dinero no cambian. Un CSV exportado antes entra con el nombre nuevo.

### D2. Repetir este gasto (GAS.13b)

"Repetir este gasto" en vez de "Repetir hoy": dice qué repite. Abre la factura con todo igual y la fecha de hoy, lista para guardar. Al consultar un gasto: "Gasto registrado", la papelera y "Repetir este gasto" (secundario de 48 con borde); la papelera confirma con "Úsalo si lo anotaste por error", sin prometer devoluciones.

### D3. El dato para pagar de cada fijo (GAS.13c)

Un solo campo, opcional, con el nombre exacto del dato que trae la factura de ese tipo. Nunca "Para pagar".

| Tipo de fijo | Fila en la factura | Ayuda dentro del campo |
|---|---|---|
| Servicios públicos | Número de contrato | Está en tu factura: 1029 3847 |
| Internet y TV | Número de cuenta | Está en tu factura |
| Celular | Número de la línea | 300 123 4567 |
| Arriendo, Administración, Servicio doméstico | A quién le pagas | Nequi 300 123 4567 · don Carlos |
| Educación | Código del estudiante | El del recibo del colegio |
| Seguros, Medicina prepagada | Número de póliza | Está en tu póliza |
| Seguridad social | Dónde la pagas | Mi Planilla, Aportes en Línea |
| Impuestos | Placa o ficha catastral | ABC123 |
| Streaming, Suscripciones, Gimnasio | Se cobra solo a | una cuenta o tarjeta de Mis cuentas, con su logo |
| Cuota de manejo | Se cobra en | la cuenta del banco; no hay nada que escribir |
| Otros | Dato para pagar | Referencia, cuenta o lo que necesites |

### D4. Cabecera, pestañas, tarjeta y ojo (GAS.13d)

- **Cabecera:** vuelve la fila del nombre con la anatomía de Movimientos y Mis cuentas: teja coral de 34 con el recibo, "Gastos" y la lupa de 44, que es la única búsqueda de Gastos y abre Movimientos con el apartado de la pestaña y el mes a la vista.
- **Pestañas:** la activa en píldora con una marca de 16 x 3 en el color de su apartado (coral, índigo, frambuesa, amarillo). En vez del punto, una insignia roja con el número: pagos vencidos en Fijos, cuotas vencidas en Deudas, límites pasados en Límites. Sin pendientes no hay insignia; Día a día no la lleva.
- **Tarjeta:** rótulo y mes en pastilla (abre el resumen de la pestaña); cifra de 38 con el ojo de 36 pegado a ella; una línea de comparación y una barra, y "Resumen" en la leyenda. Nunca alertas ni botones de acción.
- **El ojo:** uno por pestaña, junto a su cifra. Tapa la tarjeta, la lista, el resumen del mes y las facturas que se abren desde esa pestaña; al ocultar se tacha, salen la comparación, la barra y la leyenda, y Finko lo recuerda al volver (ADR 166).
- **Fila:** título la nota o el detalle (si no hay, la categoría) y debajo "Categoría · Cuenta".

### D5. El resumen del apartado y los estados de pago (GAS.13e)

- El mes de la tarjeta y "Resumen" abren el resumen de esa pestaña: tocar una barra cambia de mes y tocar una categoría abre Movimientos con el apartado, el mes y la categoría puestos. Un mes sin datos lleva la barra a 4 px y "Sin gastos"; Fijos y Deudas cuentan los vencidos en la línea del total.
- **Fijos:** vencido en rojo con la pastilla "Pagar" (no un círculo); pendiente con el círculo de contorno y el chulo gris ("Marcar pagado"); pagado con el círculo verde lleno y la fila al 62 %. **Deudas:** "Cuota vencida hace N días · Pagar" en la fila. **Límites:** la fila pasada en rojo (texto y barra), sin franja aparte.

### D6. Paso a paso, factura y aviso (GAS.13f)

- **Paso a paso:** cuatro segmentos con su rótulo; lo hecho muestra lo elegido ("$4.500", "Café") y se toca para volver a ese paso. Por eso la pantalla no repite la categoría arriba ni lleva el monto de subtítulo. Color del apartado.
- **Factura:** papel fijo en los dos temas, con dientes arriba y abajo; cabecera con el isotipo, "Finko" y el tipo; monto de 40 con "COP"; filas de 48 que abren su paso; lo opcional en línea con "Agregar"; la cuenta de origen con el logo del banco o el billete del efectivo y lo que queda. Al registrar: "Revisa tu gasto" y "Guardar"; si la cuenta no alcanza, "Guardar" se apaga y lo dice la fila de la cuenta. Lo que Finko detecta (hormiga) va en un aviso girasol, nunca como pregunta; "¿Necesidad o deseo?" se contesta en la fila Detalle y la fila de la lista lo recuerda solo cuando Finko lo ve repetirse.
- **Después de guardar:** aviso de 5 s sobre la barra, "Tinto · $4.500", "Te quedan $145.500 en Efectivo" y "Deshacer".

### D7. Las primeras veces, Deudas y los recorridos (GAS.13g)

- **Fijos la primera vez:** Tino con el calendario y ocho tejas que abren el fijo con su categoría. **Deudas:** Tino con la lupa y los dos caminos. **Límites:** Tino con el paraguas y "La que más usas".
- **Deudas en un mes pasado:** la tarjeta muestra lo que debías al cierre de ese mes. Con dos deudas o más, la tarjeta "Finko revisó tus deudas" lleva al plan (tu plan, comparar, cómo funciona, aplicar).
- Los recorridos del tablero (gasto, fijo, deuda con entidad y con persona, límite, consultar) se verifican paso a paso contra la app.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Dejar "Transporte" como categoría y llamar Movilidad al área | El tablero lo decide: el área usa la palabra de todos los días y la categoría dice qué hay adentro. |
| Mostrar "Bus, taxi y apps" solo en pantalla y guardar "Transporte" | Análisis, Límites y el CSV leen el nombre guardado: tendrían dos respuestas. |
| Un ojo que tape las cuatro pestañas | El ADR 166 lo descartó y el tablero lo mantiene: uno por pestaña. |

## Consecuencias

- Siete rebanadas, GAS.13a a GAS.13g, cada una con su commit y su push.
- La migración v59 sube el esquema; nada pierde dinero.

## Ajustes al aplicar

- **D1 (GAS.13a):** en las tejas de la primera vez "Bus, taxi y apps" va en dos renglones a 393 y menos: las cuatro tejas miden lo mismo y el nombre va centrado. El importador traduce "Mecato" y "Transporte" al nombre de hoy.
- **D2 (GAS.13b):** "Repetir este gasto" copia también lo contestado de necesidad o deseo: el tablero pide la factura "con todo igual" y "lista para guardar", así que **cambia el [ADR 162](162-en-que-fue-y-necesidad-o-deseo-en-cada-gasto.md) D2**, que lo volvía a preguntar. La papelera va al lado de "Repetir este gasto", en la misma fila; la confirmación antepone "Úsalo si lo anotaste por error." a lo que corrige en los saldos. La factura de un gasto nuevo se titula "Revisa tu gasto".
- **D3 (GAS.13c):** el dato se guarda en la referencia de `datosPago` (el campo del [ADR 175](175-a-donde-se-paga.md) que ya existía); la llave, el titular y la cuenta guardados antes siguen en el formulario, ocultos en el teléfono, y no se pierden al editar. En escritorio el bloque sigue entero. "Se cobra solo a" usa el débito automático: elegir la cuenta lo prende. Solo admite cuentas, como el débito de hoy: una tarjeta de crédito no entra todavía. La ficha del fijo dice el nombre de su dato.
- **D4 (GAS.13d):** el tablero dice "uno por pestaña"; hasta acá Fijos y Deudas compartían el ojo de Por pagar (ADR 166). Ahora cada una guarda el suyo y, sin él, sigue el de Por pagar. La fila de la lista ya decía la nota o el detalle y debajo la categoría y la cuenta; cuando el título es la categoría, debajo va solo la cuenta, para no repetirla. Con la regla de 44 px (R4), la pestaña de 38 y el ojo de 36 llevan una zona táctil de 44 que no se ve. En escritorio el ojo de Fijos, Deudas y Límites también va junto a la cifra (la tarjeta es la misma).
- **D5 (GAS.13e):** el resumen es la hoja de meses de GAS.12a con otra forma: doce barras en vez de una lista, y tocar una ya no cierra la hoja (el tablero sigue a "tocar una categoría"). Fijos lista sus pagos por fijo y Deudas por deuda; la categoría del pago es interna ("Gastos fijos"), así que esas partes abren Movimientos con el apartado y el mes, sin categoría. Límites cuenta por categoría con límite, sin partir por subcategoría. "Pagar" es la misma acción del círculo; lo de hoy o mañana pasa al círculo gris (el tablero tiene tres estados), y el ámbar queda en su texto. La franja ámbar del límite que va cerca se queda: el tablero solo quita la del pasado.
