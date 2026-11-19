# ADR 177 - El gasto fijo en cuatro pasos con nombre

**Estado:** Aceptada (2026-11-18). Pedido en chat con el canvas de Claude Design "Rediseño del formulario de Gastos Fijos - Finko" (seis tableros, oscuro y claro): "aplica los cambios de este HTML". Desde este ADR, el canvas deja de mandar; manda el ADR. El "Siguiente" tras elegir (D2, D3 y D5) lo cambia el [ADR 178](178-elegir-es-seguir-en-el-gasto-fijo.md): elegir es seguir.
**Fecha:** 2026-11-18
**Autores:** el pedido y el canvas (producto y diseño), Claude Opus 5.5 (comparación con lo que había, decisiones de implementación)
**Relación:** **Cambia** la presentación del [ADR 167](167-gastos-fijos-categorias-de-colombia.md) D2 (las 16 categorías se agrupan en familias; la lista no cambia) y D5 en un punto (el chip "Otra" de las empresas pasa a ser "Sin empresa"). **Amplía** el armazón de preguntas del [ADR 142](142-formularios-por-tarea.md) D5 con opciones que solo pide quien las usa. **Cambia** el CAT.3c en un punto: con "Crear categoría" ya no se pide descripción (D4). Conserva el monto del ADR 167 D1, el orden del [ADR 141](141-el-gasto-fijo-empieza-por-el-monto.md) (el monto primero) y el selector de día del ADR 142.

---

## Contexto

El gasto fijo en el teléfono ya se creaba con una pregunta por pantalla: "¿Cuánto pagas?", "¿Qué es?" (las categorías y, debajo, las empresas y la categoría nueva), "¿Cada cuánto?", "¿Qué día?" y el resumen. El canvas lo reordena en cuatro pasos con nombre y le da a cada decisión su pantalla:

| Tablero | Qué muestra |
|---|---|
| 1 · ¿Cuánto pagas? | La cifra y el teclado de Finko, con los pasos rotulados arriba |
| 2 · ¿Qué es? | Las categorías en cinco familias con color, en dos columnas, y "Crear categoría" |
| 2b · ¿Con qué empresa? | La categoría elegida con "Cambiar", las empresas en tres columnas y "Sin empresa" |
| 2c · Crear categoría | Nombre e ícono, en su propia pantalla |
| 3 · ¿Cuándo lo pagas? | Cada cuánto y qué día en una sola pantalla, con el aviso del calendario |
| 4 · Revisar | Las filas con su ícono, el aviso y "Agrega si quieres" con Nota y Débito automático |

Los colores del canvas son los tokens de sección que ya existen (`--fk-dom-presupuesto`, `metas`, `inversion`, `tesoreria`, `compromisos` y, para el aviso del calendario, `agenda`), con sus variantes del tema claro.

---

## Decisión

### D1. Cuatro pasos con nombre

**Monto · Qué es · Cuándo · Revisar**, rotulados bajo la barra de progreso (las `.etapas` de Registrar gasto). La línea "Nuevo gasto fijo · 2 de 4" se va. En su lugar, sobre la pregunta, lo ya respondido: "Pagas $85.000" en "¿Qué es?" y "Crea tu categoría"; la tarjeta de la categoría con su familia, el monto y "Cambiar" en la empresa; "EPM · $85.000" (con la teja de la empresa, o el ícono de la categoría si no hay empresa) en "¿Cuándo lo pagas?". La empresa y la categoría nueva son pantallas del paso "Qué es": la barra no avanza en ellas. Desde el resumen, tocar "Qué es" lleva también por las otras pantallas de ese paso antes de volver.

El armazón (`ui/preguntas.js`) lo ofrece con opciones que solo pide el formulario que las usa:

| Opción | Dónde | Qué hace |
|---|---|---|
| `data-pasos="Monto\|Qué es\|Cuándo\|Revisar"` | formulario | Los pasos rotulados; el último es el resumen |
| `data-paso` | bloque | El paso al que pertenece |
| `[data-contexto]` | dentro del bloque, oculto | Lo ya respondido, que va sobre el título; un `[data-preguntas-volver]` dentro vuelve atrás ("Cambiar") |
| `data-saltar="Sin empresa"` | bloque | La pregunta es opcional (pastilla) y el pie suma ese botón, que la deja sin respuesta y sigue |
| `data-seguir="Usar esta categoría"` | bloque | Lo que dice el botón de seguir |
| `data-avanza` | opción de un bloque `data-no-avanza` | Esa opción sí avanza al tocarla ("Crear categoría") |
| `data-resumen-orden`, `[data-resumen-parte]`, `data-resumen=""` | bloque o parte | Orden de las filas, un bloque partido en dos filas, un bloque sin fila propia |
| `[data-resumen-icono]`, `[data-resumen-aviso]`, `data-resumen-agregar` | bloque, elemento, formulario | El ícono de la fila, el aviso repetido bajo las filas, la línea de "Agrega si quieres" |

Nueva deuda, Nueva cuenta y los demás formularios no cambian.

### D2. "¿Qué es?" agrupado en familias

| Familia | Categorías | Color |
|---|---|---|
| Casa | Arriendo, Administración, Servicios públicos, Servicio doméstico | `presupuesto` (ámbar) |
| Conexión y entretenimiento | Internet y TV, Celular, Streaming, Suscripciones | `metas` (violeta) |
| Salud y bienestar | Medicina prepagada, Seguridad social, Seguros, Gimnasio | `inversion` (turquesa) |
| Estudio, banco e impuestos | Educación, Cuota de manejo, Impuestos | `tesoreria` (azul) |
| Tus categorías | las propias del usuario (solo si hay) | neutro |
| ¿No está en la lista? | Otros y "Crear categoría" (borde punteado) | neutro |

En el teléfono, tejas en dos columnas con el ícono sobre el color de su familia; la elegida lleva el borde y el fondo de Por pagar (`compromisos`) y un visto. Tocar elige; "Siguiente" avanza. "Crear categoría" avanza al tocarla. El grupo vive en `GRUPOS_CATEGORIA_AGENDA` (`core/constants.js`), que cubre cada categoría una sola vez (lo vigila un unitario). Una categoría retirada (ADR 167 D4) aparece al editar en "Tus categorías".

### D3. "¿Con qué empresa?" en su pantalla

Solo para las categorías que tienen empresas. Arriba, la categoría elegida con su familia y el monto ("Casa · $85.000") y "Cambiar", que vuelve a "¿Qué es?". La pregunta lleva la pastilla "Opcional" y la línea "Tu gasto fijo llevará su nombre en Por pagar." Las empresas van en tres columnas; la elegida, con el visto. Al pie, **"Sin empresa"** junto a "Siguiente": el chip "Otra" del ADR 167 D5 pasa a ser ese botón en el teléfono y a llamarse "Sin empresa" en escritorio. La pregunta conserva su texto por categoría ("¿Cuál plataforma?", "¿Con qué aseguradora?"...). La empresa no tiene fila propia en el resumen: la dice "Qué es" ("Servicios públicos · EPM").

### D4. "Crear categoría" en su pantalla

"Crea tu categoría", con "Para lo que no está en la lista. Queda guardada para la próxima vez.", el nombre ("¿Cómo se llama?"), el ícono en la grilla siempre abierta (seis columnas en el teléfono: `renderIconoPicker` con `abierto`) y "La encontrarás en «Tus categorías» al registrar otro gasto fijo." El botón dice "Usar esta categoría" y no sigue sin nombre ni ícono. **No pide descripción**, tampoco en escritorio: el nombre del fijo es el de la categoría, como con cualquier otra, y el campo de texto pasa a ser la nota opcional.

### D5. "¿Cuándo lo pagas?" en una pantalla

Cada cuánto (Mensual, Quincenal, Anual u Otra, en un control segmentado) y qué día (los 31 días en siete columnas y "Último día del mes") juntos, con el aviso "Aparecerá cada mes en tu calendario el día 15." en una caja con el ícono del calendario. Tocar un día no avanza: el botón dice "Ver el resumen". Los rótulos son "Cada cuánto" y "Qué día", también en escritorio.

### D6. Revisar

"Así queda tu gasto fijo" y "Toca un dato para cambiarlo.", con cuatro filas en este orden y su ícono: **Qué es** (la teja de la empresa o el ícono de la categoría en el color de su familia), **Cuánto pagas**, **Cada cuánto** ("Cada mes") y **Día de pago** ("El 15 de cada mes"). Debajo, el aviso del calendario. "Agrega si quieres" dice "También puedes hacerlo después." y ofrece dos fichas: **Nota** y **Débito automático** (esta, solo con cuentas activas). En escritorio, las dos siguen dentro de "Más opciones".

### D7. Lo que no cambia

- Los datos: ni un campo nuevo, ni migración. El catálogo de empresas (ADR 167 y 172) y el monto (ADR 167 D1). Las validaciones, salvo la descripción con "Crear categoría" (D4).
- Escritorio: la misma grilla, ahora agrupada y con el ícono en el color de su familia; la empresa y la categoría nueva siguen como bloques del mismo formulario; el aviso del calendario lleva su caja e ícono. Lo demás queda igual.
- "31" y "Último día del mes" guardan lo mismo (`diaPago` 31, que ya cae en el último día de los meses cortos); se marca "Último día del mes", como hasta hoy.
- Sin categoría elegida, el teléfono no sigue: el nombre escrito a mano queda para escritorio, donde la categoría sigue siendo opcional.

---

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Llevar los pasos con nombre a todos los formularios de crear | El canvas es del gasto fijo; las opciones del armazón quedan listas para quien las pida |
| Un formulario propio del gasto fijo, fuera del armazón | Duplicaría el teclado, el resumen, los errores y la vuelta atrás que el armazón ya resuelve |
| Colores nuevos para las familias | Los del canvas son los tokens de sección que ya existen, con sus variantes claras |
| Mantener la frecuencia y el día en dos pantallas | El canvas los junta: son una sola decisión, cuándo se paga |
| Quitar "31" porque "Último día del mes" guarda lo mismo | El canvas muestra los dos; quitarlo esconde un día que la gente busca |
| Abrir la grilla de íconos con CSS en el teléfono | El `[hidden]` del reset es `!important` en la capa más baja y ninguna capa le gana: la grilla abierta es una opción del componente |

---

## Consecuencias

### Positivas

- La persona sabe en qué paso va y qué ya respondió, sin leer "2 de 4".
- Las 16 categorías se encuentran por familia, no en una lista de tres columnas.
- La empresa y la categoría nueva dejan de aparecer debajo de la grilla, fuera de la vista.
- Crear una categoría ya no pide escribir dos nombres.

### Negativas / Restricciones

- El armazón suma opciones (tabla de D1) que hoy usa un solo formulario.
- `GRUPOS_CATEGORIA_AGENDA` debe seguir a `CATEGORIAS_AGENDA`: una categoría nueva entra en las dos (lo vigila un unitario).
- Las pruebas que leían "¿Cada cuánto?", "¿Qué día?", "Categoría nueva" u "Otra" cambian con el texto.
