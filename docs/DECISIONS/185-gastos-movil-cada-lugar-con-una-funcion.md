# ADR 185 - Gastos en el teléfono: cada lugar con una sola función

**Estado:** Aceptada (2026-11-19).
**Fecha:** 2026-11-19
**Autores:** Esteban (tablero "Finko · Gastos móvil, propuesta integral"; pedido: "apliquemos el cambio sugerido en este HTML, cada que termines una tarea commit y push"), Claude Opus 5.5 (implementación)
**Relación:** Es el tablero que esperaba el [ADR 183](183-gastos-que-cuadran.md) D6 (GAS.9f). **Cambia** el [ADR 182](182-gastos-cada-cosa-con-su-forma-y-su-color.md) D1 (el encabezado coral con la lupa y el ojo, las pestañas sin pastillas), D2 (la franja de lo vencido y el embudo), D3 (la tarjeta de la primera vez) y D5 (las dos puertas de Deudas y su vacío); el [ADR 162](162-en-que-fue-y-necesidad-o-deseo-en-cada-gasto.md) D1 y D2 en cómo se pregunta en el teléfono; el [ADR 147](147-gusto-o-necesidad-hormiga-sin-adivinar.md) D2 y D3 en los nombres y el carácter de algunas categorías y subcategorías; el [ADR 177](177-el-gasto-fijo-en-cuatro-pasos-con-nombre.md) y el [ADR 178](178-elegir-es-seguir-en-el-gasto-fijo.md) en los títulos y avisos de cada paso del gasto fijo, y el [ADR 180](180-la-pantalla-final-de-registro-es-una-factura.md) en la nota. Todo bajo 1024 px. Escritorio no cambia. Límites y Agregar cuenta no cambian: el tablero los deja como están.

---

## Contexto

El tablero trae 17 páginas: "Así está hoy" (diez capturas con lo que sobra en cada una), Día a día con gastos y la primera vez, la distribución de funciones, cuatro del registro de un gasto (categoría por áreas, detalle con necesidad o deseo, la factura sin desplazar y la nota aparte), las categorías para Colombia, seis del gasto fijo (qué es, empresa con logo, sin empresa, cuándo, otra periodicidad y la factura) y dos de Deudas (primera vez y con deudas), cada pantalla en los dos temas.

La idea que lo ordena: **Gastos registra y controla, Movimientos encuentra, Inicio avisa. Nada se dice dos veces.** El título "Gastos" repetía la barra de abajo; la lupa estaba arriba y en los filtros; la franja de lo vencido repetía Atención hoy y Fijos; cada paso del registro tenía un título que repetía la barra de pasos.

## Decisión

### D1. Las pestañas arriba, el ojo en la tarjeta y la lupa en los filtros (GAS.10a)

- **Sale la fila del nombre** (la teja coral, "Gastos", la lupa y el ojo): la barra de abajo ya dice dónde estás. Las cuatro pestañas son el primer renglón (13,5 px; 12,5 bajo 375, donde no caben) y el contenido sube 56 px.
- **El ojo vuelve a la tarjeta de cada pestaña**, a la derecha de su rótulo, en un círculo de 44 sobre el bosque: Día a día, Fijos, Deudas y Límites. El tablero dice que "sigue tapando las cuatro pestañas a la vez"; lo que hace hoy es tapar la lente donde está (ADR 166: Día a día, Por pagar con Fijos y Deudas, Límites), y eso se conserva: "sigue" describe el ojo de antes, no pide uno nuevo.
- **La lupa queda en un solo sitio:** el primer botón de los filtros de Día a día (donde estaba el embudo), "Buscar y filtrar en Movimientos". Abre Movimientos con Gastos marcado y el foco en la búsqueda. Fijos, Deudas y Límites no llevan lupa.
- **Sale la franja de lo vencido de Día a día.** El dato vive en Atención hoy (Inicio) y encabeza Fijos; la pestaña lo avisa con un punto rojo junto al nombre (Fijos y Deudas, como ya hacía Límites). El nombre accesible dice cuántos.
- **Tarjeta de Día a día:** la diferencia en negrita ("**$7.000 más** que octubre a esta altura del mes"), la cifra pegada al rótulo, la leyenda en 12,5.
- **Los días:** "Hoy · jue 19", "Ayer · mié 18", "Martes 17 · nov": el complemento atenuado en la letra del cuerpo.

### D2. La primera vez de Día a día (GAS.10a)

Tino al lado de la frase, sin el sol, "Aquí verás en qué se va tu dinero" y "Cada gasto que registres aparece aquí, ordenado por día." Sin botón: registrar es el botón central y las cuatro tejas. Las tejas dicen "Restaurantes" (antes "Comida"). La pista va punteada, con el ícono de lo que se repite: "¿Pagas algo cada mes? **Anótalo en Fijos**".

### D3. Categorías para Colombia (GAS.10b)

Tres preguntas distintas, cada una en su sitio:

| Pregunta | Quién la responde | Cómo |
|---|---|---|
| ¿En qué fue? | La persona | Categoría y detalle, en dos toques. El área solo ordena la pantalla. |
| ¿Necesidad o deseo? | Finko, por el detalle | Solo pregunta cuando depende del momento, dentro de la opción elegida. |
| ¿Es un gasto hormiga? | Nunca se pregunta | Finko lo detecta (Gastos fantasma), no es un dato del formulario. |

Las áreas son rótulos en la misma pantalla, no un paso ni un nivel: **Comida** (Mercado, Restaurantes, Café, Antojos), **Movilidad** (Transporte, Carro o moto), **Personal** (Salud, Cuidado personal, Ropa, Entretenimiento) y **Casa y familia** (Hogar, Familia, Mascotas, Educación). Otros va sin área.

Lo que cambia:

- **"Mecato" pasa a "Antojos"** (la categoría guardada se renombra con una migración, como la v55 de Fijos); "Paquetes" a "Paquetes y snacks", "Plaza o fruver" a "Frutas y verduras" y "Maquillaje" a "Maquillaje y belleza".
- **Carro o moto es nueva** (necesidad): Gasolina, Parqueadero y Peajes salen de Transporte (que queda con Transporte público, Taxi y App de transporte) y se suman Lavado y Taller y repuestos. Los gastos guardados en Transporte con una de esas tres pasan a Carro o moto, y sus límites con ellos.
- **"Herramientas y ferretería" y "Arreglos" se unen** en "Ferretería y arreglos": lo guardado como Arreglos pasa a la otra.
- **Carácter:** Entretenimiento, Decoración y Uñas y spa son deseo sin preguntar; Muebles y electrodomésticos se pregunta.
- **Los ids de las opciones no cambian** (salvo Arreglos, que desaparece al unirse).
- **Tono e ícono:** Antojos rosa con la torta, Carro o moto pizarra con el carro, Familia lila y Mascotas café, como el tablero.

### D4. Nuevo gasto: categoría por áreas y detalle con la pregunta adentro (GAS.10c)

- **Categoría:** sin la instrucción de título; las dieciséis en dos columnas bajo su área, cada ícono en el tono de su categoría (no todos en coral), y al final Otros y "Crear categoría" punteado.
- **Detalle:** la teja y el nombre de la categoría arriba, y las opciones como una lista con su radio. Cuando lo elegido depende del momento, "Necesidad" y "Deseo" aparecen dentro de esa misma opción, sin título ni bloque aparte. Sin "¿En qué fue?" ni "¿Fue una necesidad o un deseo?".

### D5. La factura sin desplazar y la nota aparte (GAS.10d)

La factura cabe entera en 375 × 667 (iPhone SE) con "Guardar gasto" a la vista: Categoría, Detalle ("Taxi · Necesidad"), Cuenta de origen (con lo que queda) y Fecha, y la Nota con "Agregar". La nota se escribe en una hoja aparte ("Nota", el campo y "Listo"); la factura no se mueve.

### D6. El gasto fijo: qué es, empresa y sin empresa (GAS.10e)

- **Qué es:** sin "Pagas $X" ni "¿Qué es?"; las categorías por área: **Casa** (Arriendo, Administración, Servicios públicos, Servicio doméstico), **Conexión y entretenimiento** (Internet y TV, Celular, Streaming, Suscripciones), **Salud y bienestar** (Medicina prepagada, Seguridad social, Seguros, Gimnasio) y **Estudio, banco e impuestos** (Educación, Cuota de manejo, Impuestos), con Otros y "Crear categoría" al final.
- **Empresa:** los logos grandes, cuatro por fila, por grupo ("Series y películas", "Música"), sin la tarjeta de contexto, el título ni el aviso. Al final, "Sin empresa: escribir el nombre".
- **Sin empresa:** un solo campo, "Nombre del servicio", con la teja de la categoría, y "Continuar".

### D7. Cuándo y la factura del fijo (GAS.10f)

- **Cuándo:** Mensual, Quincenal, Anual y "Otra ⌄" en una fila, y debajo los 31 días con "Último día del mes"; sin títulos ni notas. "Otra" despliega Cada semana, Cada 2 meses, Cada 3 meses y Cada 6 meses, sin repetir Mensual.
- **Factura del fijo:** "Gasto fijo" arriba; Servicio (con su logo), Fecha de pago ("El día 15"), Periodicidad ("Cada mes"); Débito automático con su interruptor, Para pagar y Nota con "Agregar". Cabe en 375 × 667 sin desplazar. Salen "Así queda tu gasto fijo", "Toca un dato para cambiarlo" y "Agrega si quieres".

### D8. Deudas (GAS.10g)

- **Primera vez:** un solo Tino, "¿Le debes dinero a alguien?", "Anótalo y Finko te dice cuánto debes, a quién y cuándo pagas.", dos tarjetas lado a lado (Con una entidad, Con una persona) con "Agregar", y "Si no le debes a nadie, no tienes que hacer nada aquí.". Cabe en el Redmi Note 11 (393 × 740) sin desplazar.
- **Con deudas:** la tarjeta con el ojo, "Debes en total", la cifra, "Cuotas de noviembre: **$680.000**", la barra y la leyenda de entidades y personas. Las dos puertas grandes pasan a un selector de dos pestañas con su conteo ("Con entidades 2 · Con personas 1") y sale la frase que repetía la pestaña. Cada fila: logo, nombre, "Cuota $400.000 · día 28", lo que falta y, si aplica, "Cuota vencida hace 9 días · Pagar" o la barra del cupo de la tarjeta. Agregar va punteado debajo y "¿Cómo salir más rápido? Compara dos formas de pagar" es una línea.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Un ojo que tape las cuatro pestañas | El tablero lo da por hecho ("sigue"), pero el ADR 166 lo descartó a propósito y el tablero no pide cambiarlo. |
| Dejar la franja de lo vencido en Día a día | Decía lo mismo que Atención hoy y que Fijos; Día a día es para lo que gastas. |
| Las áreas como un paso antes de la categoría | El tablero dice que son rótulos: un toque más por gasto no ordena nada. |
| Guardar los gastos de gasolina en Transporte y solo mostrarlos en Carro o moto | La categoría guardada es la que suman Análisis y Límites: tendrían dos respuestas distintas. |
| Una pantalla aparte para "¿Necesidad o deseo?" | El tablero la pone dentro de la opción: solo aparece cuando hace falta. |

## Consecuencias

- Siete rebanadas, GAS.10a a GAS.10g, cada una con su commit y su push.
- Con GAS.10 se cierra GAS.9f.
- La migración de D3 sube el esquema; los gastos y límites guardados conservan su dinero, solo cambian de nombre o de categoría según la tabla de arriba.

## Ajustes al aplicar

- **D5 (GAS.10d):** sin el tipo de la cuenta, dos cuentas del mismo banco se leerían igual ("Bancolombia"); en ese caso la factura dice el nombre entero de cada una. La hoja de la nota no lleva la X: el velo, Esc y "Listo" la cierran. A 320 x 568 la factura desplaza 39 px por dentro, como ya aceptaba el ADR 156; en 375 x 667 cabe entera.
