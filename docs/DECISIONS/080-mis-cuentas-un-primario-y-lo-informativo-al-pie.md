# ADR 080 - Mis cuentas: un primario, lo informativo al pie y la salida prefiltrada

**Estado:** Aceptada. Implementada en la ficha 06 de la auditoría UX/UI móvil (MOV.1).
**Fecha:** 2026-08-20
**Autores:** Esteban (producto), Claude Design (ficha 06 de la auditoría móvil), Claude Opus 5 (implementación)
**Relación:** **acota el [ADR 075](075-mis-cuentas-dos-trabajos-a-la-vista.md) en sus D1 y D5**, y lo conserva entero en el resto (D2, D3, D4, D6, D7 y D8 quedan intactas). Conserva entero el [ADR 035](035-mis-cuentas-v2.md) (hero, barra de composición, tarjeta de distribución) y el [ADR 051](051-tarjeta-de-credito-producto-integrado.md) D6 (la tarjeta de crédito es solo lectura y no suma al total). Se apoya en el [ADR 069](069-bloque-gastos-en-la-barra-movil.md) D1 (Por pagar es una lente con hash `#compromisos`) y en el [ADR 028](028-inicio-centro-de-control.md) D4 (el evento `distribuir:abrir`). No toca lógica de negocio: `tesoreria/logic/` no cambia.

---

## Contexto

La ficha 06 auditó **arquitectura, no vestido**: la anatomía de la sección ya la había cerrado su propia auditoría de diseño (R38, R39, R40, R20, todas aplicadas y verificadas). Antes de discutir la ubicación contó las puertas de entrada: **nueve, y solo una es el menú**. Una es la teja de acceso rápido de Inicio, y las otras siete son contextuales: otro dominio que necesitó una cuenta, un ingreso o un reparto. La hipótesis que dejó abierta la ficha 03 ("reevaluar si crece hasta parecer un bloque") **se resuelve en negativo con evidencia**: creció en contenido, no en tráfico de menú. No entra a la barra y no sale de "Tu dinero".

Lo que sí encontró son cuatro defectos que el reparto de escritorio no podía ver, porque ninguno es de composición:

- **La única acción de un bloque entero apunta a una casa que ya no existe.** El bloque de tarjetas de crédito es solo lectura y su salida era `<a href="#compromisos">Ver en Deudas</a>`: el hash es correcto desde el ADR 069, el rótulo lleva dos días mintiendo. Es la segunda aparición de R86, encontrada sin buscarla y en otro dominio.
- **Dos consejos de Límites aterrizan en la puerta de un pasillo.** "Ajustar en Mis cuentas" e "Ir a Mis cuentas" prometen el asistente de distribución, que era el octavo bloque de ocho. Calendario e Inicio ya resuelven eso con `distribuir:abrir`, que navega **y** abre: el patrón existe y está probado en dos sitios.
- **Cuatro verbos de alta sin relación declarada entre ellos ni con la hoja Registrar.** Dos de los cuatro ya existen como teja de Registrar.
- **Dos bloques que nadie viene a leer parten la sección justo entre sus dos mitades**, y empujan hacia abajo la mitad a la que apuntan las puertas externas.

El problema de gobierno: el ADR 075 se escribió **tres días antes**, sobre el mismo bloque y desde una auditoría de escritorio. Dos de sus decisiones chocan de frente con esta ficha, y las dos no pueden quedar en pie a la vez.

---

## Decisión

Modificar. La sección se queda donde está, con su nombre, su hero y su anatomía intactos.

### D1. Los dos bloques de solo lectura bajan al pie, bajo un rótulo propio

**Acota el ADR 075 D1.** El orden del DOM pasa a ser: hero, cuentas, transferir, fuentes de ingreso, distribuir y, al final, **"Solo informativo"** con las tarjetas de crédito y el 4x1000 dentro.

El criterio es el mismo que la ficha 05 usó con el plan de salida: **manda la frecuencia**. Lo que se consulta cada quincena sube; lo que se lee de paso baja. Nadie entra a Mis cuentas para leer cuánto pagó de 4x1000. Y el rótulo no es decoración: es lo que le dice al usuario que esos dos bloques no esperan nada de él.

**Escritorio no pierde sus dos columnas.** Lo que cambia es qué contiene la izquierda. Pasa de dos envoltorios a tres:

| Envoltorio | Contenido | Escritorio (desde 1440px) |
|---|---|---|
| `.tesoreria-col--cuentas` | rótulo "Tus cuentas", lista, transferir | `span 7` |
| `.tesoreria-col--ingresos` | fuentes de ingreso, altas, distribuir | `span 5` |
| `.tesoreria-informativo` | rótulo "Solo informativo", tarjetas de crédito, 4x1000 | `span 12`, bajo las dos columnas |

Los tres son `display: contents` bajo el umbral, así que en móvil no son cajas y el orden del DOM es el que se lee. Es el patrón que ya usan `.banda-inicio` ([ADR 070](070-inicio-centro-de-atencion-en-escritorio.md) D4) y los dos envoltorios que introdujo el propio ADR 075.

**Lo que el ADR 075 D1 pierde:** que la columna izquierda fuera "dónde está tu dinero" completa, tarjetas incluidas. **Lo que conserva:** el reparto 7 y 5, el umbral de 1440px, y el argumento de fondo, que eran dos trabajos independientes y no un primario con su dependiente. La tarjeta de crédito no era ninguno de los dos trabajos: era una lectura, y por eso baja.

### D2. Un solo primario, y los dos verbos que se repiten se declaran atajos

**Acota el ADR 075 D5.**

| Verbo | Qué pasa a ser |
|---|---|
| Nueva cuenta | **El único primario.** Es lo único que no existe en Registrar |
| Fuente fija | Fila de alta al pie de la lista de fijos. Crea una **regla**, no un movimiento |
| Ingreso | Atajo declarado a la teja "Ingreso" de Registrar: mismo ícono (`#i-saldo`) y misma etiqueta |
| Transferir entre cuentas | Conserva su anatomía de R38 y gana la marca de atajo de la teja "Transferir" |

Ningún recorrido se alarga: los cuatro siguen a un toque desde la sección. Lo que cambia es que dejan de competir y que los dos que se repiten **se ven iguales en sus dos casas** (R72).

**Por qué se acota D5.** D5 acertó en bajar los dos botones de ingreso a secundarios, y buscó etiquetas que dijeran la acción en vez de la categoría. Esta ficha llega a un reparto distinto por otro camino: el problema no es el peso del botón, es **de quién es el verbo**. De ahí sale la regla candidata **R87**: *el alta de una regla vive en su sección; el alta de un movimiento vive en Registrar*. Crear una fuente de ingreso fija es programar algo que se repetirá y pertenece a la lista que la administra; registrar un ingreso puntual es mover dinero hoy y pertenece a Registrar, donde cualquier copia del verbo es un atajo declarado. Es la segunda aparición independiente del mismo reparto: la ficha 05 llegó a él con el gasto fijo contra las cinco tejas de Registrar.

**La etiqueta del atajo la fija el código, no la ficha.** La ficha 06 llama "Transferencia" a la teja de Registrar; el código la llama **"Transferir"**. R72 pide la misma etiqueta que el camino canónico, así que manda el código.

### D3. Una línea bajo el título dice la mitad que el nombre no dice

**"Dónde está tu dinero y de dónde viene"**, bajo el `h1`. El nombre "Mis cuentas" se conserva: nombra lo que el usuario viene a ver y ya está aprendido, y los cuatro candidatos probados ("Tu dinero", "Cuentas e ingresos", "Tesorería", y dejarlo) no pagan el reaprendizaje. Pero la sección también es dueña de *de dónde viene* el dinero y de *cómo se reparte*, que es su parte más consultada desde fuera, y eso el nombre no lo puede decir.

Convive con el [ADR 079](079-armazon-de-escritorio-una-identidad-un-primario-una-navegacion.md) D1 ("la sección se nombra una vez"): esa decisión prohíbe **repetir el nombre**, no describir la sección debajo de él.

### D4. Los dos enlaces de Límites abren el asistente en vez de navegar

Pasan a emitir `distribuir:abrir`, el evento que Calendario e Inicio ya usan, así que el usuario llega **con el asistente abierto** en vez de con la sección abierta. Y las etiquetas dejan de nombrar la sección para nombrar la acción: **"Ajustar mi distribución"** y **"Distribuir mi ingreso"**. Es R85 aplicada a un caso nuevo (la copia describe lo que va a pasar, no a dónde va a llevar) y de paso sobrevive a cualquier mudanza futura de la sección.

Cero patrones nuevos y cero eventos nuevos: dos recorridos pasan de "entrar y buscar" a "llegar abierto".

### D5. La tarjeta de crédito sale a Por pagar, prefiltrada a su deuda

"Ver en Deudas" pasa a **"Ver en Por pagar"** y lleva a la lente con el chip **Deudas** puesto y esa deuda a la vista. No basta con reapuntar el hash, que ya era correcto: la tarjeta habla de una deuda concreta, así que la salida tiene que llegar a esa deuda y no a la lente entera. Mismo patrón que el acceso contextual prefiltrado que la ficha 07 definió para Movimientos: **quien sale pone el filtro con un setter exportado del destino y después navega**, que es lo que `movimientos/view.js` ya permite con `setFiltroTexto()` y `setFiltroDominio()`.

### D6. Prerrequisito: los chips de Por pagar, que la ficha 05 dejó sin construir

Los cuatro chips **Todo · Fijos · Deudas · Pagado** están especificados en la ficha 05 (con sus anchos medidos a 360px) y **no llegaron al código**: la lente pinta sus dos grupos sin filtro, y la entrada del CHANGELOG de la ficha 05 no los menciona ni los declara diferidos. D5 no existe sin ellos, así que se construyen acá y se dice en voz alta que son deuda de la ficha 05, no alcance de la 06.

Lo que **no** entra con ellos, y sigue siendo de la ficha 05: la fila de altas que aparece solo para el grupo visible, y el pie de saldo con "Ver plan de salida".

### D7. Lo que no se toca

La ubicación en "Más" (M1, defendida con las nueve puertas). El hero con su barra de composición y su ojo (R39 y R20 aplicadas). Las dos listas de ingresos separadas, que resolvió MC.18d. El asistente de distribución por dentro: se abre desde más sitios, no cambia. El aviso de próximo ingreso dentro de la sección (C6, mantenido con nota: el aviso que importa, el de repartir cuando el dinero ya entró, sí está en Inicio y en Calendario). Y las D2, D3, D4, D6, D7 y D8 del ADR 075.

---

## Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| Dejar el orden del ADR 075 y aplicar solo los otros tres cambios | Deja en pie el defecto más barato de arreglar de los cuatro. Y el ADR 075 D1 no decidió *dónde va lo informativo*: decidió que hubiera dos columnas de trabajo, y las tarjetas no son un trabajo |
| Revertir el ADR 075 entero y volver a una sola columna | Tira una decisión aceptada y verificada por un defecto que no es de composición. El reparto 7 y 5 sigue siendo correcto para los dos trabajos que sí lo son |
| Plegar o esconder los dos bloques informativos | Los esconde en vez de ordenarlos. Cambiar de sitio es el cambio más barato posible y no le quita a nadie un dato que ya leía |
| Subir Mis cuentas a la barra (hipótesis de la ficha 03) | Costaría un slot para atender la puerta menos usada de las nueve. Es un destino de servicio, no un bloque de consulta deliberada |
| Renombrar la sección | Cuatro candidatos probados. "Tu dinero" es el rótulo del grupo que la contiene, y un grupo y su miembro no pueden llamarse igual; "Cuentas e ingresos" describe el contenido y no la intención, y sus 17 caracteres no caben en la teja de Inicio; "Tesorería" es el nombre interno del dominio, o sea terminología técnica |
| Dejar "+ Puntual" como fila de alta igual que el fijo | Borra la distinción que R87 acaba de establecer. Un puntual es un movimiento y su casa es Registrar; copiarlo acá sin declararlo es exactamente lo que R72 prohíbe |
| Reapuntar solo el rótulo de la tarjeta de crédito, sin prefiltro | El hash ya era correcto, así que ese cambio solo, sin filtro, deja al usuario buscando su tarjeta en una lista de fijos y deudas mezclados. La pregunta que trae ("cuánto debo de esta") merece llegar respondida |
| Subir el aviso de próximo ingreso a Inicio (C6) | Pediría reabrir la ficha 02 y competir con un aviso que ya existe y que además abre el asistente. Coste alto, ganancia baja |

---

## Consecuencias

- **Dos recorridos de Límites pasan de 2 toques + desplazar 8 bloques a 1 toque sin desplazar.** Un bloque entero recupera su salida, y la pantalla deja de abrirse con tres verbos compitiendo.
- **Coste de aprendizaje, pagado una vez:** quien sabía que el 4x1000 estaba a media pantalla tiene que bajar hasta el pie. Es un bloque que no se toca y no se busca.
- **La lente Por pagar gana estado de UI propio** (el chip activo), que hasta ahora no tenía. Vive en el módulo como `let` con setter exportado, igual que los filtros de Movimientos: no se persiste y no toca el schema.
- **R86 suma su segunda aparición** y **R87 nace con dos apariciones independientes**. Las dos siguen como candidatas hasta la ficha 18, que es la que promueve reglas.
- **Dependencias que esta decisión abre:** la ficha 12 recibe los dos enlaces reapuntados y un dato para su pregunta G2 (el reparto se calcula donde están las cuentas, no donde están los topes); la ficha 05 queda con su fila de altas por grupo y su pie de saldo pendientes; la ficha 14 es el otro miembro de "Tu dinero" y si el mismo conteo de puertas le sale distinto, el grupo hay que releerlo.
