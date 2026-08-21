# ADR 084 - Fondo: el compromiso del período, en la primera pantalla

**Estado:** Aceptada. Implementada en la ficha 11 de la auditoría UX/UI móvil (MOV.1).
**Fecha:** 2026-08-21
**Autores:** Esteban (producto), Claude Design (ficha 11 de la auditoría móvil), Claude Opus 5 (implementación)
**Relación:** **confirma DIS.19 entero** en la franja de cobertura: tercera ficha seguida donde la pieza principal se audita y no se toca. **Da respuesta móvil a INT.1g** ([ADR 059](059-inicio-como-tablero-de-decisiones.md) D7), que había diagnosticado el defecto y lo resolvió solo desde 1680px. **Conserva el [ADR 049](049-fondo-de-emergencia-v2.md) D2 y descarta el cambio de la ficha que lo contradecía**, con su razón escrita abajo (D4). Cuarta vez que esta auditoría convierte un nombre de sección suelto en enlace, tras las fichas 04, 06 y 10.

---

## Contexto

Fondo es la sección más larga de la app y la que mejor dibuja lo que mide. Su defecto principal **estaba escrito en su propio código**, con nombre y umbral:

> INT.1g (ADR 059 D7, P1): el compromiso del mes es lo único de esta página que hoy exige bajar un pliegue; desde 1.680px se promueve aquí, siempre visible.
>
> `index.html`, comentario de `<aside id="fondo-carril">`

El diagnóstico es exacto y la respuesta fue un carril lateral que empieza en 1680px. **En un teléfono de 390px el carril no existe**, así que el problema que el código nombra seguía entero en el único medio que esta auditoría cubre. No es un hallazgo nuevo: es un hallazgo conocido sin respuesta móvil.

Cinco hallazgos, y la mitad de los patrones de las fichas 09 y 10 no puede repetirse porque Fondo no tiene lista de bolsas:

- **E1, crítico.** El medidor del compromiso vivía en `_renderHabitoSection()`, después de la tarjeta entera. La tarjeta contesta "¿cuánto aguanto?", que se pregunta cada varios meses; el medidor contesta "¿voy al día con lo que me propuse?", que se pregunta cada período. La frecuente estaba debajo de la ocasional, invertida igual que la estrategia de pago en la ficha 05.
- **E2, crítico según la ficha.** "Registrar un aporte" y "Editar" se pintan como dos `btn btn-ghost btn-sm` del mismo gris, así que la sección no tiene primario. **Este hallazgo se descarta**, y su razón es D4.
- **E3, alto.** Con `colchon === null`, o sea sin gastos fijos registrados, `_renderCobertura()` devolvía una sola frase. No es un texto suelto: **es el interruptor de la sección**, porque sin gastos fijos no hay objetivo, ni niveles, ni franja, ni fecha de cobertura.
- **E4, medio.** El monto reunido se imprimía dos veces en el mismo `<article>`, con doce píxeles de distancia: el pie de la franja lo ponía a la derecha y la primera línea de datos decía "Tienes $X de $Y". Ninguna de las dos funciones sabía de la otra.
- **E5, documentado.** `ordenados.map(_renderAporteItem)` pinta todos los aportes registrados, sin techo, al final de la sección más larga de la app, y empuja el aviso de tasa de ahorro (que puede ser un `role="alert"`) hasta el fondo.

---

## Decisión

Fondo se queda donde está, con su franja de cobertura intacta.

### D1. El medidor del compromiso sube al pie de la tarjeta

`_renderCompromisoDelPeriodo()` nueva emite el medidor (o la pregunta "¿cuánto quieres apartar?" cuando no hay compromiso definido) dentro de `.fondo-card`, encima de la nota y de las acciones. La sección de hábito se queda con lo que es consulta: su título, el historial y el aviso de tasa.

Sube el medidor y **no la lista**: el medidor es la pregunta del período, el historial es archivo. Verificado a 390px con un mes cargado: el medidor cierra en 596px sobre una ventana de 721, o sea que la pregunta del período se contesta sin desplazar.

**El carril de escritorio no se toca** (la ficha lo declaró fuera de alcance), pero la regla que evitaba la copia doble sí: `responsive.css` apagaba `.ahorro-habito__compromiso` dentro de `.ahorro-habito`, y el medidor ya no vive ahí. El selector se extiende a `.fondo-card`, así que desde 1680px sigue habiendo **una sola** copia visible, la del carril. Lo que no se apaga es `.ahorro-habito__sin-compromiso`: el carril devuelve cadena vacía sin compromiso definido, y ocultar la pregunta dejaría a escritorio sin puerta para definirlo.

### D2. El pie de la franja suelta el monto y se queda con la razón en meses

`cov__pie` conserva "1 mes y 2 semanas de 3 meses", que es lo único que solo él dice, y deja de imprimir `m(montoTotal)`. El dinero vive una vez, en la línea de datos, que es la contabilidad. Los 16px que libera son parte del presupuesto de D1: el medidor no se añade encima de todo, entra en el sitio que dejan la repetición y el espacio ganado.

### D3. El estado sin gastos fijos se dice como bloqueo, con la salida enlazada

Donde iba la franja va un bloque con su propio título ("Falta un dato para calcular tu colchón"), la explicación de por qué no hay meses que contar, un enlace de 44px a `#compromisos` ("Registrar mis gastos fijos") y la nota de que mientras tanto se puede aportar, porque el dinero cuenta desde el primer día.

Dos cosas cambian y una se conserva: el estado deja de parecer una nota al pie y pasa a decir que la sección está bloqueada, el nombre de la sección destino pasa a enlace, y **el bloqueo no apaga la oferta de aportar**.

### D4. E2 se descarta: el ADR 049 D2 se conserva

La ficha proponía subir "Registrar un aporte" a primario a ancho completo, y lo justificaba diciendo que DIS.16 ya lo había decidido y no se ejecutó. **La premisa está incompleta.** Existe una decisión posterior:

> El bloque "Aportes al fondo a Registrar" no se elimina. Se conserva para los aportes fuera de ciclo... Lo que sí cambia es su **peso visual, que baja al de una acción secundaria**.
>
> [ADR 049](049-fondo-de-emergencia-v2.md) D2

Y su test lo guarda con una frase que no deja lugar a interpretación: "el aporte principal ya vive en el asistente de distribución; el registro directo desde la sección baja al mismo peso visual que Editar, **nunca vuelve a ser el botón ancho y de color**".

Ejecutar E2 sería revertir el ADR 049 D2, que sigue vigente y cuyo argumento sigue siendo cierto: **el camino principal del aporte es el asistente de distribución**, y el registro directo existe para el caso fuera de ciclo. Un caso secundario no se pinta como primario porque su sección se quedó sin primario.

Esteban tomó la decisión el 2026-08-21: se conserva el ADR 049 D2 y la ficha 11 cierra con tres cambios de cuatro.

**Cabo suelto declarado:** `.fondo-card__principal` existe en `analysis.css` (ancho completo, color del hub de ahorro) y **ningún markup lo usa**. Alguien escribió el estilo del primario antes de que el ADR 049 decidiera no tenerlo. No se borra en esta ficha porque borrar estilo muerto no es del alcance de una auditoría de UX, pero queda anotado: o lo usa alguien, o se retira en una limpieza.

### D5. Lo que no se toca

- **La franja de cobertura entera** (DIS.19): los bloques que crecen en vertical para compararse, los meses sin cubrir punteados porque la franja también es la promesa, y los niveles como posiciones en el eje del tiempo.
- **"Si hoy dejaras de recibir ingresos"**: la apertura hipotética es lo que impide que la fecha se lea como un pronóstico.
- **`mesesEnPalabras()`**: "1 mes y 2 semanas" en vez de "1,6 meses". Nadie piensa en decimales de mes.
- **El veredicto en cero**, que apunta al primer nivel y no a la meta completa.
- **Que un nivel logrado no se retire** cuando suben los gastos fijos: si el objetivo se mueve, el usuario no perdió nada.
- **La nota de que no descuenta saldo**, que es la frontera con Metas y Reservas.
- **El historial, el aviso de tasa y su `role="alert"`** en el nivel alto.
- **El nombre.** Tres alternativas probadas: "Colchón" funciona en el cuerpo ("meses de colchón") y como rótulo pierde la palabra "emergencia", que es la que explica para qué es; "Protección" se confunde con seguros, que Finko no gestiona; "Mi colchón" repite el problema del posesivo sin contraste de la ficha 09.

---

## Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| Subir "Registrar un aporte" a primario a ancho completo (E2 de la ficha) | Revierte el [ADR 049](049-fondo-de-emergencia-v2.md) D2, que sigue vigente: el camino principal del aporte es el asistente de distribución y el registro directo es la vía del caso fuera de ciclo. Decisión de Esteban, 2026-08-21 |
| Bajar el umbral del carril de 1680px para que el compromiso se vea antes | El carril es una columna lateral: bajo 1024px no hay dos columnas que repartir. La respuesta móvil no puede ser un carril más estrecho |
| Subir el medidor **y** el historial a la tarjeta | El historial es consulta y crece sin techo (E5). Subirlo devolvería el problema de altura que esta decisión viene a resolver |
| Dejar el medidor duplicado en la tarjeta y en la sección de hábito | Dos copias del mismo dato en la misma pantalla es exactamente lo que la regla de `responsive.css` evitaba desde 1680px |
| Plegar la sección de hábito para ganar el espacio del medidor | Esconde el historial para hacer sitio a algo que cabe sin esconder nada. D2 ya libera el espacio necesario |
| Poner techo al historial de aportes con un "ver todos" | La ficha 05 se negó a inventar paginación hasta que la 15 mida el volumen real de Movimientos. Inventarla acá sería crear el patrón que aquella ficha rechazó |
| Mover el aviso de tasa de ahorro fuera del final de la sección | La tasa se calcula con ingresos y gastos, dominio de las fichas 06 y 16. Decidir su ubicación desde acá es legislar sobre pantallas sin auditar |
| Dejar el bloqueo de E3 como frase suelta y solo enlazar el nombre | El enlace era la mitad del arreglo. La otra mitad es decir que la sección está bloqueada, porque sin gastos fijos no hay nada que la tarjeta pueda dibujar |

---

## Consecuencias

- **La pregunta del período deja de exigir un desplazamiento.** Verificado a 390px: el medidor cierra en 596px con la barra en 721.
- **El defecto que INT.1g nombró queda resuelto en los dos medios**, cada uno con su forma: la tarjeta en móvil, el carril en monitor.
- **El monto reunido se imprime una vez.** El pie de la franja recupera su trabajo, que es la razón en meses.
- **El estado sin gastos fijos deja de ser un callejón:** dice qué falta, enlaza a dónde ir y conserva la única acción que sí se puede hacer sin ese dato.
- **Escritorio no cambia**, y la copia doble del medidor se evita con el selector extendido en `responsive.css`.
- **Sin cambio de schema, sin dato nuevo, sin componente nuevo.** El medidor viaja con sus clases; el bloqueo suma cuatro reglas de estilo.
- **La ficha cierra con tres cambios de cuatro, y el cuarto queda con razón escrita.** Es la primera ficha de la serie cuya premisa choca con un ADR vigente, y el choque se resolvió como manda el proyecto: se dijo y lo decidió Esteban.
- **Lo que pasa a la ficha 18:** el **tercer tipo de R87** (un aporte al fondo no crea una regla ni mueve dinero, es un apunte de seguimiento, y aun así comparte la teja "Aporte" de Registrar con los que sí descuentan, así que una regla con dos categorías no puede clasificar tres cosas); **E5**, el historial sin techo, junto al mismo pendiente de las fichas 05 y 10; la **ubicación del aviso de tasa de ahorro**, que cruza las fichas 06 y 16; el **estilo muerto** `.fondo-card__principal`; y el patrón **"arreglado solo en escritorio"**, que conviene barrer en el cierre porque esta auditoría solo cubre móvil.
- **R89a suma su primer caso positivo:** el historial ordena por fecha con `ordenarAportesPorFecha()`, y en un historial la fecha es el criterio evidente. Hasta ahora la regla solo tenía incumplimientos. **R89b no aplica** y **R86 no suma caso nuevo**: los tres textos de este archivo ya estaban en el inventario de la ficha 05, y lo que esta ficha añade es la medida de su gravedad, porque uno de ellos apagaba la sección entera.
