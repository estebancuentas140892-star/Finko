# ADR 098 - Finko móvil 2, primera entrega: volver con memoria, filas de una línea y la primera pantalla para lo que importa

**Estado:** Aceptada (2026-10-29). Pedido en chat: rediseño integral de la experiencia móvil (auditoría MV2 en Claude Design) y luego "impleméntalo como consideres que sea la mejor opción, sin olvidar la versión para niños". El usuario delegó las decisiones que tocaban decisiones aprobadas, con la condición de señalarlas.
**Fecha:** 2026-10-29
**Autores:** Esteban (pedido y delegación), Claude Opus 5.5 (auditoría, diseño, implementación y redacción)
**Relación:** primera entrega del plan MV2 (canvas "Finko móvil 2"). **Cambia** el [ADR 069](069-bloque-gastos-en-la-barra-movil.md) D7 (la casa sale de la fila de chips de Ahorro) y amplía su D8 (la cabecera del bloque Gastos gana lupa y primario). **Cambia** la decisión DIS.4/G3 de la ficha [`gastos.md`](../contexto/gastos.md) (la barra de categorías se envolvía entera; en móvil pasa a plegarse con conteo) y el orden "estrategia arriba" de Por pagar, solo en móvil. Respeta el [ADR 042](042-formularios-v2-visual.md) D2 (todas las categorías del formulario a la vista) y el [ADR 072](072-gastos-cabecera-de-banda-y-fila-con-cuenta.md) D8 (en escritorio las acciones de la fila siguen visibles). No toca el ADN, ni cálculos, datos, sincronización o reglas de negocio.

---

## Contexto

La auditoría MV2 recorrió la app real a 320, 360, 375, 390, 412 y 430 px, con cuatro escenarios de datos (nuevo, poco, normal y mucho: 4000 gastos en 4 años) y el perfil niño. Lo comprobado, no supuesto:

| Hallazgo | Medida |
|---|---|
| N1. Volver no recordaba la altura | de Gastos leído a 2500 px se volvía a 0 |
| N2. Entrar a otra sección heredaba el scroll | de un tope de Límites a Movimientos se aterrizaba a 900 px |
| N3. Movimientos decía "‹ Inicio" viniera de donde viniera | escrito a mano (TX.8b) |
| N4. Fila de gasto de 128 px | la primera pantalla de Gastos mostraba 1 fila, a 649 px del tope |
| N5. Primario de la lente en su propia fila | 96 px antes del nombre del bloque |
| N6. Categorías en tres filas | 168 px antes del primer gasto |
| N8. Mis cuentas con 200 ingresos puntuales | 29,3 pantallas |
| N9. Botones de mes del bloque de 32x32 | bajo el piso de 44 (R4) |
| N10. Fila de chips de Ahorro | cinco chips, "Inversión" fuera de vista a 390 (R9) y el vigente sin marca visible |
| N11. "Guardar gasto" | a 1458 px en una hoja de 535 px de cuerpo (375x667) |
| N12. Chips del asistente de distribución | 10 px de alto: la barra se encogía en la columna del modal |
| N13. Estados vacíos | dos primarios para la misma acción y un hero en $0 que no informa (R51) |
| N14. Onboarding sin nombre | el aviso solo llegaba al lector de pantalla |
| N15. Barra de estado | seguía el tema del sistema, no el de Finko |
| Niño | el camino de Aprender desbordaba 36 px (el teléfono alejaba la página y la barra se salía del borde); los frascos del inicio se cortaban a 320 |

## Decisión

Todo bajo 1024 px. Las piezas nuevas nacen ocultas fuera de ese ancho, así que escritorio no cambia (lo vigila un E2E).

### D1. Volver al lugar de donde viniste

`ui/volver.js` sella cada entrada del historial (`history.state`). Si a una sección se llegó desde el **contenido** de otra (una tarjeta, un "Ver todo", un número), la entrada guarda el origen y la sección pinta "‹ {origen}", que hace `history.back()`. Por la **navegación principal** (barra, menú Más, pestañas del bloque, chips de Ahorro) no hay origen: es un destino de primer nivel y la barra ya es la salida. Si la sección trae un volver propio al mismo origen (las hijas de Ahorro), se reusa en vez de duplicarse. El "‹ Inicio" fijo de Movimientos se aparta mientras hay uno contextual.

### D2. Volver a la misma altura

Una entrada nueva arranca arriba; un regreso recupera su altura. No se guarda solo el `scrollY`: al volver, la lista se repinta y los días fuera de pantalla miden lo que estima `content-visibility` (PERF.12), así que la misma altura cae en otro gasto. Al tocar algo se anota **la fila a la vista** (`elementFromPoint`, costo constante) y el regreso la pone donde estaba. Se reintenta mientras la lista se pinta y se suelta si el usuario toca la pantalla.

### D3. Ahorro: cuatro modalidades en cuatro columnas (cambia ADR 069 D7)

La casa sale de la fila: con cinco chips la fila desbordaba y escondía "Inversión", y la subida ya la dan el "‹ Ahorro" de cada hija y la pestaña de la barra. Las cuatro reparten el ancho (caben a 320); "Fondo de emergencia" dice "Fondo" en el chip y el resto queda en el DOM para escritorio y lectores. El chip vigente por fin se ve: su estilo vivía en la capa `layout` y `.chip` (capa `components`) le ganaba siempre.

### D4. Filas de una línea con hoja de detalle

En Gastos y Movimientos la fila entera es un botón que abre una hoja con lo que la fila decía y sus acciones; eliminar va aparte (R53). La hoja no trae lógica: copia los botones de la fila y los dispara con `registrar-abrir`, el puente de la hoja Registrar, así que editar o eliminar abren su propio modal sin apilar dos. Los días se leen como una sola lista. Fila de 128 a 71 px; tres filas en la primera pantalla donde había una.

### D5. La cabecera del bloque Gastos trae lupa y primario (amplía ADR 069 D8)

El primario de cada lente baja a la fila del nombre en versión corta ("+ Gasto", "+ Agregar", "+ Límite"). Es un espejo: dispara el botón original, que sigue en el DOM porque es el que lee la barra superior de escritorio, y copia su `hidden` y su nombre accesible. La frase del bloque pasa a su propia fila. Una lupa lleva a Movimientos sin filtros y con el foco en la búsqueda; Inicio gana la misma lupa junto al engranaje.

### D6. Categorías de Gastos plegadas, con conteo (cambia DIS.4/G3)

Plegada, la barra dice "Todos", la elegida y "+N categorías"; abierta es el índice alfabético completo. Nada se esconde sin decir cuánto falta (R9). Elegir pliega. Distinto del formulario (D8): filtrar es ocasional, registrar es el paso obligatorio de cada gasto.

### D7. Mis cuentas no se vuelve una tira

Se ven los cinco ingresos puntuales más recientes y "Ver los N en Movimientos", que llega con el filtro de ingresos. 29,3 a 3 pantallas con el escenario de 4000 gastos.

### D8. Formularios: el pie pegado y todas las categorías a la vista

El pie con el primario se pega al borde inferior de la hoja en todos los formularios que lo usan. Las tejas de categoría bajan de 68 a 56 px y siguen todas visibles: el ADR 042 D2 rechazó con razón un "ver más" en ese paso.

### D9. Chips de filtro con piso táctil

Por pagar, Movimientos y el asistente de distribución pasan de 28 a 44 px. La barra de filtros ya no se encoge dentro de la columna de un modal (`flex-shrink: 0`): es un arreglo de `domain.css` y también corrige el asistente en escritorio, donde medía lo mismo.

### D10. Onboarding: el error se ve

Sin nombre, o sin aceptar los documentos, sale el bloque de errores de todos los formularios (que también lo anuncia). Es el mismo modal en escritorio.

### D11. La barra del sistema sigue a Finko

En móvil las dos `<meta name="theme-color">` toman el fondo vigente: el tema elegido y la piel del perfil niño.

### D12. Zona segura superior

`env(safe-area-inset-top)` en el contenido del adulto y en el del niño: con `viewport-fit=cover` y la barra translúcida, en el iPhone instalado el contenido nacía debajo del reloj.

### D13. Perfil niño

El camino de Aprender recorta su desborde horizontal y cierra el zigzag bajo 400 px, para que Tino no quede afuera; los tres frascos del inicio van uno por fila bajo 400 px. La identidad del niño (Tino, frascos, su barra) no cambia, y nada del adulto entra a su app: `volver.js` no actúa con `body.kid`.

Y tres ajustes sin decisión nueva: Por pagar pone la lista antes que la estrategia (la estrategia sigue ordenando la lista), su hero deja de repetir el ojo del bloque, y en un estado vacío con primario propio se oculta el del encabezado y el hero en $0 (R51).

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Barra superior fija con título y volver en todas las secciones | cuesta 44 a 56 px permanentes en la pantalla más apretada (ADR 059, R31) y duplica la barra inferior |
| Guardar solo `scrollY` | con `content-visibility` la misma altura cae en otro gasto (medido: 5 filas de diferencia) |
| Deslizar la fila para revelar acciones | gesto oculto, choca con el scroll horizontal del sistema y no tiene equivalente de teclado |
| Plegar también las categorías del formulario | el ADR 042 D2 lo rechazó: un toque extra en el paso obligatorio de cada gasto. El pie pegado resuelve el problema real (N11) |
| Mover el primario original del encabezado al bloque | la barra superior de escritorio lo lee de ahí (INT.1e) |
| Inicio con lista de avisos y hoja de perfil (MV2.15), lentes unificadas (MV2.12), Distribuir en sitio (MV2.19) | quedan para la segunda entrega: tocan composición de Inicio y del asistente, con más riesgo que valor en esta |

## Consecuencias

### Positivas

- La primera pantalla de Gastos muestra el mes, el total y tres gastos (antes: el total y uno).
- Volver deja de ser un reinicio: misma sección, misma fila.
- Ninguna opción queda cortada a 320 px en las pantallas tocadas.

### Negativas / Restricciones

- Una acción de fila cuesta un toque más en móvil (abrir la hoja). Se compensa con la hoja a ancho completo y con lo que se ve sin desplazarse.
- La memoria de altura vive lo que vive la pestaña: tras recargar, el regreso arranca arriba.
- `volver.js` escucha `click` en captura sobre `document` para anotar de dónde salió el toque. No despacha acciones: eso sigue siendo solo de `actions.js`.
- Dos arreglos alcanzan escritorio a propósito: la barra de filtros que se encogía (D9) y el error visible del onboarding (D10). Ninguno cambia su diseño.
