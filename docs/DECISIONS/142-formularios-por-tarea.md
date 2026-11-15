# ADR 142 - Formularios por tarea

**Estado:** Aceptada (2026-11-14). Pedido en chat: "una revisión profunda de todos los formularios [...] la persona que ingrese a diligenciar un formulario debe entender rápidamente qué información debe ingresar"; ante la primera propuesta (pulir la columna de campos), Esteban pidió "no quiero que realices unos cambios sencillos [...] no importa si hay que hacer cambios drásticos, con tal de no perder el estilo gráfico ni la finalidad de Finko" y, sobre los ADR que esto cambia, delegó la decisión: "hazlo como consideres que es la mejor decisión para la app".
**Fecha:** 2026-11-14
**Autores:** Esteban (pedido y delegación), Claude Opus 5.5 (auditoría, diseño y redacción)
**Diseño:** canvas "Finko · Rediseño de formularios móviles", página "Propuesta por tarea" (https://claude.ai/code/artifact/ba69c496-63a1-4d69-b2c1-fe0bbc69346f). Como manda CLAUDE.md, el canvas deja de mandar desde que este ADR se acepta: la fuente de verdad es este documento.
**Relación:** **Cambia** el [ADR 042](042-formularios-v2-visual.md) D1 (el pie pierde "Cancelar"), D2 (Registrar gasto deja de ser una columna: tres etapas en la misma hoja, con todas las categorías a la vista en la segunda), D4 (Nueva deuda pasa a preguntas) y D6 (todos los formularios migran, no solo tres). **Cambia** el [ADR 123](123-la-hoja-de-formulario-completa.md) D2 (los errores se limpian campo por campo y se validan al salir del dato). **Amplía** el [ADR 127](127-identidad-bosque-y-sol.md) D6: Tino suma dos lugares, la ayuda de la ⓘ y "Primero necesitas una cuenta" (D10). **Amplía** el [ADR 115](115-el-pie-se-apoya-sobre-el-teclado.md) y el [ADR 141](141-el-gasto-fijo-empieza-por-el-monto.md) D4: siguen mandando donde hay texto, con el modo escritura de D8. **Respeta** el [ADR 141](141-el-gasto-fijo-empieza-por-el-monto.md) D1 (el gasto fijo pregunta en el mismo orden: cuánto, qué es, cada cuánto, qué día), el [ADR 120](120-separador-de-miles-en-todos-los-campos-de-dinero.md) (el teclado de Finko escribe en el mismo campo `data-miles`), el [ADR 118](118-el-dia-en-hoja-y-las-hojas-se-cierran-de-tres-formas.md) (tres formas de cerrar; se suma la confirmación con cambios), el [ADR 127](127-identidad-bosque-y-sol.md) (identidad y el dibujo de Tino), el [ADR 101](101-finko-del-adulto-decide-no-ensena.md) (no se celebra cada registro), el [ADR 062](062-toast-de-consecuencia-en-abono-y-aporte.md) (el aviso dice la consecuencia) y el [ADR 051](051-tarjeta-de-credito-producto-integrado.md) D4 (las tarjetas aparecen en "¿Con qué pagaste?"). Solo bajo 1024 px: escritorio conserva sus formularios.

---

## Contexto

La auditoría recorrió los 27 formularios y diálogos con campos de la app del adulto en el teléfono, su código y su comportamiento con el teclado.

| Hallazgo | Evidencia |
|---|---|
| Todos son la misma cosa: una columna de campos | Registrar gasto mide ≈ 1.450 px a 375 × 667 (comentario D8 de `responsive.css`); Nueva deuda, 12 campos en una sola pantalla |
| El teclado tapa porque se le pide todo | Con el teclado de texto en un iPhone SE quedan ≈ 363 px visibles y la hoja gasta ≈ 170 en marco: ≈ 190 para escribir. El pie suma los 34 px del margen seguro también encima del teclado |
| Selectores del sistema encima de la hoja | 12 `<select>`, 10 `type="date"` y 10 `type="number"` |
| Enter envía el formulario a medias | 0 usos de `enterkeyhint` |
| Lo opcional se dice de 5 maneras; lo obligatorio, de ninguna | `form-optional`, "(opcional)" en 17 rótulos, `label__opcional`, `label__opt` y "Opcional." en una ayuda; `.label-required` existe con 0 usos |
| El monto tiene dos caras | 9 formularios con `.monto-hero`; unos 10 con un campo común "Monto (COP)"; "(COP)" en 15 rótulos |
| Errores del sistema, que se borran todos juntos | "La descripción del compromiso es obligatoria"; `form-errors.js` limpia todas las marcas con cualquier tecla |
| Cerrar no pregunta | un deslizón corto y rápido (`hojas.js`, 40 px a 0,6 px/ms) descarta una deuda a medio llenar |
| La sorpresa al final | si la cuenta no alcanza, después de tocar Guardar se abre otro diálogo, "¿Desde qué cuentas?" (`cuenta-helper.js`) |

Lo que ya funciona se conserva: el pie sobre el teclado (115), el campo que sube a la vista (141), 16 px y 44 px en los campos, el separador de miles (120), el error debajo de su campo (123) y el monto primero en Gasto y Gasto fijo.

## Decisión

### D1. Cuatro tareas, cuatro formas

Un formulario no se diseña por su lista de campos sino por lo que la persona viene a hacer.

| Tarea | Forma | Formularios |
|---|---|---|
| **A. Mover dinero** (a diario) | teclado de Finko, un toque y un recibo | Registrar gasto, Me llegó dinero, Abonar a una deuda, Aportar a una meta, Aportar a una reserva, Aportar al fondo, Transferir, Me pagaron, Pagar varios |
| **B. Crear algo nuevo** (una vez) | una pregunta por pantalla y un resumen | Nueva deuda, Nueva cuenta, Ingreso fijo, Nuevo gasto fijo, Nueva meta, Nueva reserva, Le presté a alguien, Nueva inversión, Nuevo límite, Compras pequeñas, Configurar el fondo, Cuánto apartar, Perfil fiscal, Perfil del niño, Mesada |
| **C. Corregir** (al editar) | la ficha es el formulario: cada dato abre su mini-hoja | editar cualquier registro de A o B |
| **D. Ajustes** | lista de filas con su valor y una mini-hoja | Tu nombre (bienvenida), Tu perfil, Candado (PIN) |

### D2. Una regla para elegir el control

| Si la pregunta tiene | Control |
|---|---|
| Dos caminos | dos tarjetas grandes que avanzan al tocar (en B) o segmentado (en un recibo) |
| De 3 a 6 opciones cortas | pastillas, todas a la vista |
| De 7 a 16 opciones con ícono | grilla de tejas a pantalla completa, las más usadas primero; es la única pregunta de esa pantalla |
| 7 o más sin ícono, o nombres largos | **desplegable de Finko**: una hoja con lista de 64 px por fila, con lo elegido marcado |
| Más de 15, o algo que se busca por nombre | desplegable de Finko con buscador (bancos y billeteras) |
| Dinero | teclado de Finko (D3) |
| Un día del mes | selector de día: 31 botones y "Último día del mes" |
| Una fecha | "Hoy" y "Ayer" como atajos; "Otra fecha" abre el calendario de Finko |
| Texto libre | campo con el teclado del sistema, solo en su pantalla o en una mini-hoja |
| Sí o no | interruptor en un recibo; dos botones si es la pregunta de la pantalla |

Nunca: `<select>` del sistema, `type="date"` ni `type="number"`. Se mantiene la regla del 042 D6: ninguna categoría en un desplegable.

### D3. El teclado de Finko

- Para todo lo que es dinero: montos, cuotas, cupos y tasas (estas con coma).
- Es parte de la pantalla, no una capa: 12 botones reales de 60 px (54 en una mini-hoja), "000" para los ceros y borrar con un ícono propio (el único glifo nuevo de la iniciativa).
- Escribe en el mismo `<input name="monto" data-miles>` de hoy, con `inputmode="none"`: el campo acepta foco, pegar y un teclado físico, `ui/miles.js` sigue formateando y el contrato `FormData` no cambia. La regla de qué tecla produce qué valor es una función pura, con sus pruebas.
- La cifra va grande (58 px, la display) con su lectura en palabras debajo ("un millón quinientos mil pesos"), anunciada con `aria-live`.
- "Usar el teclado del teléfono" deja el campo en `inputmode="numeric"` para quien usa lector de pantalla o lo prefiere.

### D4. Mover dinero: monto, un toque, recibo

Registrar gasto, en la misma hoja y el mismo `<form id="form-gasto">`, con tres etapas con nombre arriba (Monto · Categoría · Revisar):

1. **Monto** con el teclado de Finko. Los frecuentes (TX.12) quedan como atajos: uno salta directo al recibo con todo puesto.
2. **¿En qué fue?** Las 14 categorías y "Otra categoría" en tejas grandes, todas a la vista (respeta el 042 D2), ordenadas por uso. Tocar una avanza.
3. **Recibo.** Monto y categoría arriba; debajo "Sale de" (la cuenta habitual, con lo que queda después del gasto), "Fecha" (hoy) y "Nota" (opcional). Cada fila abre su desplegable o su mini-hoja. Si la cuenta no alcanza, el recibo lo dice antes de guardar y ofrece completar con otra cuenta: el mismo reparto de `resolverPagoConPreferida`, visible antes en vez de en un diálogo posterior.

"Guardar gasto" envía el mismo formulario: `validarGasto`, `normalizarGasto` y el reparto no cambian. Al guardar, el aviso de siempre con la consecuencia y "Deshacer" (062). Los otros ocho formularios de A siguen el mismo patrón con dos etapas (Monto · Revisar) y atajos sobre el teclado cuando el dominio ya los conoce ("La cuota", "Toda la deuda", "Lo que falta").

### D5. Crear: una pregunta por pantalla y un resumen

- Progreso arriba ("3 de 6", segmentos del color de la sección), la pregunta en grande (27 px, en tú), una ayuda de una línea y un solo control. Elegir avanza al tocar; escribir lleva el botón pegado encima del teclado.
- Solo lo obligatorio va de a uno. Lo opcional se ofrece en el resumen como "Agrega si quieres".
- El resumen es el recibo de B: cada dato se cambia tocándolo y "Guardar" está siempre a la vista.
- Atrás vuelve a la pregunta anterior con la respuesta puesta.
- Precedente: el asistente paginado de Distribuir (MC.7d, ADR 018), un paso visible a la vez dentro de un mismo formulario.

Nueva deuda: ¿A quién le debes? · ¿Qué tipo de deuda es? · ¿Cómo la reconoces? · ¿Cuánto debes hoy? · ¿Cuánto pagas cada mes? · ¿Qué día pagas la cuota?; en el resumen se agregan tasa, cupo, débito automático, "Recibí este dinero" y nota. La frecuencia (casi siempre mensual) pasa al resumen. El gasto fijo conserva el orden del 141 D1. Nueva cuenta busca el banco en un desplegable con buscador y deja número, llave y cuota de manejo para el resumen.

### D6. Corregir: la ficha es el formulario

El detalle de un registro (`ui/detalle-fila.js`, ADR 119) se vuelve editable: tocar un dato abre una mini-hoja con ese dato y nada más; "Listo" lo guarda y el aviso ofrece "Deshacer". Eliminar queda al pie, en rojo. Editar ya no reabre el formulario de crear.

### D7. Ajustes: lista y mini-hoja

Nombre, PIN y perfil se leen como una lista con su valor a la derecha; cambiar uno abre una mini-hoja que se apoya sobre el teclado.

### D8. Lo que vale para todas las hojas

- **Modo escritura** mientras hay teclado (`data-teclado`): sin agarradera ni teja, cabecera de 52 px, pie de 72 sin el margen seguro, y la hoja arranca en `env(safe-area-inset-top)` para que la ✕ no quede debajo de la hora en la app instalada.
- **El campo se ancla arriba**, no al centro: `scroll-padding` en el cuerpo y `block: 'start'` en `llevarCampoALaVista()`.
- **Enter avanza, no envía**: `enterkeyhint="next"` y `"done"`; se apaga el envío implícito.
- **Un solo botón** a lo ancho, con verbo y objeto ("Guardar gasto", "Abonar $350.000"). "Cancelar" sale: la ✕, el gesto y el atrás ya cierran.
- **Cerrar con cambios pregunta** ("¿Salir sin guardar?"), por cualquiera de las tres formas del 118.
- **Una sola marca de opcional**: la pastilla "Opcional". Lo obligatorio no se marca. Sin "(COP)" ni "(1-31)" en los rótulos.

### D9. Errores y avisos

- Con una pregunta por pantalla casi no hay errores de "falta": no se sigue sin responder. Lo que queda se valida al salir del dato y al guardar.
- Corregir un campo limpia solo ese campo. El aviso de arriba aparece solo con dos errores o más y lleva al primero.
- Los mensajes dicen qué hacer: "Escribe cuánto fue. Por ejemplo: 45.000" en vez de "El monto debe ser un número mayor a 0"; "Ponle un nombre para reconocerla" en vez de "La descripción del compromiso es obligatoria". La lista de equivalencias vive en el kit del canvas y se aplica en `logic.js` de cada dominio.
- Lo que se puede guardar pero conviene revisar es un **aviso ámbar** con su salida, no un error ("280 % al año es muy alto para una tarjeta"; "faltan $15.000, ¿completas con Nequi?").

### D10. Tino en los formularios

Siempre el dibujo original sobre su sol (127 D6), en tres lugares: la mini-hoja de ayuda que abre la ⓘ (explica), "Primero necesitas una cuenta" (pensando) y los hitos que ya celebra el 127 D9 cuando ocurren al crear (celebra). No aparece en los errores, en cada registro guardado ni mientras se escribe.

## Lo que no cambia

La lógica financiera, `validar*` y `normalizar*` (salvo el texto de sus mensajes), el reparto entre cuentas, los contratos `FormData`, el almacenamiento (`fk_v1`, sin migración), la navegación, los tokens de "Bosque y sol" y los formularios de escritorio.

## Rebanadas

| Rebanada | Qué entrega | Depende de |
|---|---|---|
| FORM.2a | D8 y D9 en las 27 hojas de hoy: modo escritura, Enter, barra de estado, un solo botón, confirmar al cerrar, opcional único, errores por campo y mensajes reescritos | nada |
| FORM.2b | D3 y D4 en Registrar gasto: teclado de Finko, tejas, recibo, desplegable de cuentas y el aviso de saldo | FORM.2a |
| FORM.2c | D4 en los otros ocho formularios de A | FORM.2b |
| FORM.2d | D6: la ficha editable y sus mini-hojas | FORM.2b |
| FORM.2e | D5 en Nueva deuda: el armazón de preguntas y el resumen | FORM.2a |
| FORM.2f | D5 en Nueva cuenta (con buscador), Ingreso fijo, Nuevo gasto fijo y Nueva meta | FORM.2e |
| FORM.2g | D5 en los otros diez de B y D7 en Ajustes | FORM.2f |

Cada rebanada adapta sus pruebas unitarias y E2E en el mismo commit, sube el `CACHE_NAME` y se prueba en un iPhone real junto con REV.3b.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Pulir la columna de campos (la primera versión del canvas) | mejora el vestido, no la causa: el teclado sigue apareciendo para todo y las decisiones siguen todas a la vez |
| Un formulario corto que esconde campos | esconde datos que sí se piden; el 042 D2 ya explicó por qué un "ver más" recrea la fricción |
| `<select>` del sistema para las listas largas | su rueda tapa la hoja y no muestra íconos, logos ni saldos |
| Preguntas de a una también para mover dinero | tres preguntas obligatorias para algo diario; con valores por defecto, el recibo es más corto |
| `interactive-widget=resizes-content` | el 115 ya lo descartó: no funciona en iOS |
| Que la ficha guarde sola, sin "Listo" | un toque accidental cambiaría un registro; "Listo" con "Deshacer" es igual de rápido |

## Consecuencias

### Positivas

- Nadie ve más de una decisión a la vez y nadie busca el botón de guardar.
- El teclado del sistema se abre mucho menos: en Registrar gasto, de 2 veces a ninguna (1 con nota); en Nueva deuda, de 7 a 1; en Nueva cuenta, de 6 a 1; en Ingreso fijo, de 3 a ninguna.
- Corregir un dato es un toque, no reabrir un formulario.
- Un solo lenguaje para los 27 formularios, con una regla escrita para el próximo.

### Negativas / Restricciones

- Dos piezas nuevas de JS en `ui/` (el teclado de Finko y el armazón de preguntas) y casi todas las pruebas E2E de formularios se reescriben.
- Escritorio conserva el formulario de hoy: dos presentaciones del mismo contrato hasta que una iniciativa de escritorio decida.
- El comportamiento con el teclado no se puede ejercitar en el navegador de escritorio: cada rebanada se prueba en un teléfono real.
- Quien ya usa Finko a diario cambia de costumbre en Registrar gasto; los frecuentes y los valores por defecto lo compensan.
