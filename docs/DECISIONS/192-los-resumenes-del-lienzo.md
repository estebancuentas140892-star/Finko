# ADR 192 - Los resúmenes del lienzo

**Estado:** Aceptada (2026-11-22).
**Fecha:** 2026-11-22
**Autores:** Esteban (pedido: seguir con la página 6 del lienzo "Gastos · Rediseño integral"), Claude Design (el lienzo), Claude Opus 5.5 (implementación)
**Relación:** Aplica la página 6 ("Resúmenes mensuales") del lienzo `https://claude.ai/artifact/M8EZZ5L2DrnxqzAZvZAwbJ`, tarjeta GAS.15. **Cambia** el [ADR 188](188-gastos-especificacion-integral.md) D5 (el resumen del apartado: doce barras con su inicial y una lista plana pasan a seis meses con su cifra y un cuerpo por pestaña) y el [ADR 187](187-cada-pestana-con-su-cifra-y-cada-vencimiento-con-su-pago.md) D1 en Deudas (la hoja ya no dice lo abonado cada mes sino lo que se debía al cierre). Conserva el [ADR 179](179-gastos-en-cuatro-pestanas.md) D2 (la hoja se abre desde el mes del rótulo y tocar un mes cambia el mes del bloque).

---

## Contexto

La hoja que abre el mes de cada tarjeta de Gastos era, desde GAS.13e, la misma para las cuatro pestañas: el año con sus flechas, doce barras con la inicial del mes, el total del mes visto y sus partes. El lienzo trae cuatro tableros, uno por pestaña ("Resumen mensual · Día a día", "· Fijos", "· Deudas", "· Límites"), con otra forma: seis meses con la cifra sobre cada barra y, debajo, lo que cada pestaña necesita decir de su mes.

## Decisión

### D1. Seis meses a la vez

- El título dice la pestaña con su punto de color: "Resumen · Día a día" (coral), "· Fijos" (índigo), "· Deudas" (frambuesa), "· Límites" (amarillo).
- Arriba, lo que mide la gráfica ("Lo que gastaste cada mes") y el año (o los dos años, "2025 · 2026").
- Seis meses: el mes visto y los cinco anteriores; si el mes visto es de hace más de seis meses, la ventana termina en él. Cada mes con su cifra corta encima ("812 mil", "1,2 M"), su barra de 22 en gris y su nombre corto ("Jun"); el mes visto, sobre su fondo, en negrita y con la barra en el color de la pestaña.
- "Meses anteriores" (a la izquierda) mueve la ventana seis meses atrás, sin empezar antes del primer mes de Finko. Tocar un mes cambia el mes del bloque y la hoja sigue abierta (ADR 188 D5).

### D2. Lo que mide cada gráfica

- Día a día: lo gastado cada mes. Fijos: lo pagado en fijos; el mes en curso lleva además lo que falta, en un contorno punteado. Deudas: lo que se debía al cierre de cada mes (en el mes en curso, lo de hoy; como "Debías al cierre de" de la tarjeta, ADR 188 D7). Límites: el porcentaje usado de los topes del mes, con una raya en el 100 %.

### D3. Día a día

"Gastaste en noviembre", la cifra, "$273.800 más que octubre" (o "menos que", o "Igual que"; sin el mes anterior en la historia, no va) y cuántos gastos. La barra partida por categoría y las categorías de mayor a menor con su porcentaje, la cifra y una barra delgada contra la mayor: cinco y "Otras N categorías" desde siete, que abre las demás (como Análisis, con "Ver menos"). Al pie, "Ver los 14 gastos en Movimientos".

### D4. Fijos

"Pagaste en noviembre $1.200.000 de $1.584.800", "1 de 5 pagos · 1 vencido"; la barra partida por familia (Casa, Conexión, Salud, Estudio, Otros, las de "¿Qué es?") con su leyenda; cada fijo del mes con su teja, su estado ("Venció el 12 nov", "Pagado el 5 nov", "Vence el 24 nov") y la cifra: lo vencido, lo pagado y lo que falta. Al pie, "Ver los pagos de fijos en Movimientos". Las filas salen del mismo reparto que la lista de Fijos.

### D5. Deudas

"Abonaste en noviembre $180.000 de $680.000 en cuotas" y "Tu deuda bajó $180.000" (o "subió"). En el mes en curso, la tarjeta "Cuotas de noviembre $180.000 de $680.000" con su barra y cuántas van al día, por pagar o vencidas. Cada deuda con su teja, lo que es ("Libre inversión"; una tarjeta, con su banco), su estado ("Abonaste $180.000 · al día", "Cuota de $400.000 · vence el 28", "venció el 10") y lo que debes. Al pie, "Ver los abonos en Movimientos".

### D6. Límites

"Usaste en noviembre $563.400 de $1.160.000", "1 de 4 límites se pasó" (o "Ningún límite se pasó") y, en el mes en curso, los días que faltan. Cada límite de mayor a menor porcentaje con "$108.000 de $100.000", el porcentaje y su barra en el color de su estado. Al pie, "Ver los gastos con límite en Movimientos".

## Alternativas descartadas

- **Conservar las doce barras:** con doce no cabe la cifra sobre cada una, que es lo que el lienzo agrega.
- **Seguir con lo abonado en la gráfica de Deudas:** el lienzo mide lo que se debía, que es lo que la persona quiere ver bajar; lo abonado del mes queda en la cifra grande.

## Consecuencias

- La hoja vive en `ui/resumen-apartado.js` (pura) y `ui/bloque-gastos.js` (la ventana, las cifras de cada mes y las acciones `bloque-resumen-ventana` y `resumen-otras`); sale `bloque-mes-hoja-anio`. Las filas de Fijos y Deudas salen de `filasResumenDelMes()` en `compromisos/views/lista.js`.
- Sin cambios de datos.

## Ajustes al aplicar

- **D1:** el lienzo solo dibuja el mes en curso, así que no trae cómo volver: después de "Meses anteriores" aparece "Meses siguientes" a la derecha. Un mes antes del primero de Finko va apagado y sin cifra.
- **D4:** las filas del lienzo no se tocan; las de Día a día y Límites sí (abren Movimientos con la categoría), como antes.
- **D5:** "de $680.000 en cuotas" y la tarjeta de las cuotas solo en el mes en curso: de un mes pasado no se sabe qué cuotas había. En el orden de las filas se sigue el lienzo: al día, por pagar, vencidas.
- **D6:** la barra de un límite que va cerca (desde el 75 %) va en amarillo, como su pastilla "Cerca" en la pestaña. Bajo 390 px, "$X de $Y" baja a su propia línea para que el nombre quepa.
