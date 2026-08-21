# ADR 083 - Reservas: el orden que el dominio ya tenía escrito

**Estado:** Aceptada. Implementada en la ficha 10 de la auditoría UX/UI móvil (MOV.1).
**Fecha:** 2026-08-21
**Autores:** Esteban (producto), Claude Design (ficha 10 de la auditoría móvil), Claude Opus 5 (implementación)
**Relación:** **confirma DIS.15 y DIS.19 enteros** (la tarjeta de las dos carreras y el comparador de columnas): segunda ficha seguida donde la pieza principal se audita y no se toca. Aplica el patrón de orden por urgencia con divisores del [ADR 069](069-bloque-gastos-en-la-barra-movil.md) (ficha 05) y del [ADR 082](082-metas-cabeza-orden-y-un-final-que-pesa-poco.md) (ficha 09), y **se separa del 082 en dos puntos deliberados** que se explican abajo. **Parte la candidata R89 en R89a y R89b**, con el caso que lo obliga. Cuarta aparición de R86 y primera provocada por esta misma auditoría (la ficha 07 movió Límites de gasto). No toca el [ADR 058](058-categorias-personalizadas-globales.md) ni las decisiones de AP.5.

---

## Contexto

Reservas llegaba a esta ficha con la mejor pieza de la serie encima de la peor lista de la serie.

**La evidencia central es que el propio código documenta un orden que no existe.** El aviso de proximidad no nombra las reservas que cuenta, y su documentación explica por qué: hace lo único que la lista no puede, que es sumar, y remata declarando un contrato con la lista. Con la lista ordenada por urgencia, dice, el primero es el que apura. La lista no estaba ordenada: `renderListaApartados()` pintaba `activos.map(...)` y `apartadosActivos()` es un `filter` sin `sort`.

Cinco hallazgos, y el patrón de la ficha 09 solo se repite en dos de los cuatro:

- **V1, crítico. El ordenador estaba escrito, probado y conectado a otra cosa.** `apartadosProximos()` ya ordena por urgencia con un `.sort()` sobre `diasHastaFecha`, pero solo alimenta el aviso. El impacto es doble: la lista daba una respuesta al azar a "¿a cuál le aporto?", igual que Metas, y además **dejaba al aviso sin aterrizaje**. En el prototipo el aviso decía "1 reserva vence en los próximos 30 días" y la primera tarjeta era la de una reserva a 47 días.
- **V2, alto. Una reserva ya reunida gastaba 307px en dos carreras que no informan.** Y no es una impresión, está en el cálculo: `_renderCarreras()` hace `aportesEsperados = listo ? totalAportes : plan.aportesEsperados`, así que con el dinero reunido la segunda carrera se iguala a la primera **por definición**. Dos barras llenas comparándose entre sí no dicen nada.
- **V3, alto. El diagnóstico estaba hecho y la navegación no lo aprovechaba.** El comparador clasifica cada columna y su pie nombra a los atrasados en palabras, y luego había que encontrar esa reserva recorriendo tarjetas de 333px. La doc de `_renderComparador()` justifica que el gráfico no sea interactivo porque "las tarjetas ya están debajo, en el mismo orden": el argumento es válido y descansaba en que ese orden significara algo.
- **V4, medio. Cuarta aparición de R86.** El estado vacío cerraba con "Eso va en Límites de gasto", y la ficha 07 convirtió esa sección en la tercera lente del bloque Gastos. Es la primera aparición de R86 causada por esta auditoría y no por la app heredada.
- **V5, documentado, no se decide acá.** "Ya lo usé" cierra el ciclo sin registrar el gasto que la reserva existía para pagar: el aporte sí mueve dinero (descuenta de las cuentas por `splits`), pero `reiniciarCiclo()` solo devuelve `montoActual`, `completado`, `fechaObjetivo` y `fechaInicioPlan`. Un usuario que aparta bien tiene sus gastos grandes fuera de Gastos, de Movimientos y del reparto por categoría. Resolverlo toca tres fichas que esta auditoría no ha llegado a auditar.

---

## Decisión

Reservas se queda donde está, con su comparador y su tarjeta intactos. Cambia el orden de la lista.

### D1. Cuatro grupos, con el umbral que el dominio ya define

`agruparApartadosPorUrgencia()` nueva en `apartados/logic.js` reparte las reservas activas en cuatro grupos, cada uno por lo que pide:

| Grupo | Por qué ahí |
|---|---|
| **Listas para usar** | Su acción cierra un ciclo y el cobro viene. Es lo único que se resuelve de un toque |
| **Vencen en 30 días** | Exactamente el conjunto que cuenta el aviso, con el mismo `DIAS_PROXIMO` |
| **Más adelante** | Con fecha y fuera del umbral, en el mismo orden ascendente |
| **Sin fecha** | No piden dinero, piden una fecha (regla R57) |

El rótulo del segundo grupo se compone con `DIAS_PROXIMO`, no con un 30 escrito a mano: **el divisor y el aviso no pueden discrepar**, y ese umbral ya es único en la sección desde T7/R25.

Una reserva **ya vencida** entra en ese mismo grupo y no en uno propio: lo que ya se cobró es al menos tan urgente como lo que se cobra mañana, y el orden ascendente la deja arriba. Los divisores solo se pintan cuando hay más de un grupo que separar, igual que en la lista de Metas.

**El orden por fecha lo aporta `ordenarBolsasPorFecha()` de `infra/bolsas.js`**, la pieza que estrenó la ficha 09, con `fechaObjetivo` como campo. Es su segundo consumidor y la razón por la que esta decisión no escribe ningún comparador nuevo.

### D2. La reserva ya reunida baja a una fila que conserva su botón

Glifo, nombre, "$2.400.000 listos · vence el 15 de agosto" y **"Ya lo usé"**: 62px medidos en la app, contra 307. Se van las dos carreras (llenas por definición) y el veredicto, cuya instrucción ya la dice el botón.

Es la misma decisión de fondo que el [ADR 082](082-metas-cabeza-orden-y-un-final-que-pesa-poco.md) D3, comprimir un estado que ya no compite por el aporte, **con dos diferencias que salen del comportamiento y no del estilo**:

- **Conserva su acción.** Una meta cumplida es historia; una reserva reunida está esperando un toque.
- **Va arriba y no al final.** `apartadosActivos()` mantiene vivas a las recurrentes completadas justamente para eso, y su comentario lo dice: esperando que el usuario lo use y reinicie el ciclo. Enterrarlas es como se acaba pagando el SOAT dos veces.

Copiar la solución de Metas entera habría enterrado lo único que se puede cerrar hoy en la sección.

### D3. El comparador no se toca, y se reordena solo

Comparte el mismo array que la lista, así que sus columnas siguen al orden nuevo sin una línea de cambio, y el atrasado que nombra su pie queda arriba. **No se hace interactivo el gráfico**, que era la solución cara y la que su autor descartó con razón: el problema nunca fue el comparador, era el orden en el que descansaba.

### D4. El vacío señala Límites con un enlace, no con un nombre

"¿Buscabas ponerle un tope a lo que gastas al mes? Eso va en **Límites**", con enlace a `#presupuesto`. El texto de desambiguación se conserva entero, porque distinguir "apartar para un cobro" de "ponerse un tope" es exactamente lo que ese vacío debe hacer. Mismo gesto que la ficha 04 aplicó al tip de Fondo y la 06 a la tarjeta de crédito.

### D5. R89 se parte en R89a y R89b

La ficha 09 dejó R89 escrita con una pregunta encima: ¿es una regla o dos? Reservas la contesta, y lo hace cumpliendo una mitad y fallando la otra **a la vez**: el comparador y la lista comparten literalmente el mismo array, así que las dos vistas del mismo conjunto están ordenadas igual (la mitad de coherencia **se cumple**), y aun así la sección fallaba, porque ese orden común no respondía a ninguna pregunta (la mitad de ordenación **falla**). Cumplir una y fallar la otra al mismo tiempo demuestra que son independientes.

- **R89a, candidata:** una lista que no cabe en pantalla declara su orden, y ese orden responde a la pregunta de la sección. Casos: fichas 05, 09 y 10.
- **R89b, candidata:** un mismo conjunto se ordena igual en todas las vistas que lo muestran. Casos: ficha 04 (incumplida) y ficha 10 (cumplida).

Ninguna se consolida acá. La ficha 18 decide si el corte es este o si R89b se absorbe en una regla de coherencia ya existente.

### D6. Lo que no se toca

- **El comparador** (DIS.19). Es la razón de que el hallazgo G2 de Metas no se repita: esta sección sí tiene cabeza.
- **La tarjeta y sus dos carreras** (DIS.15): el foco en días y no en dinero, las dos filas con la misma tinta, el veredicto que solo habla con un aporte completo de diferencia.
- **El aviso que suma.** Hace lo único que la lista no puede. Su problema no era él.
- **El botón que trae el monto** ("+ Aportar $160.000"), que con el ojo activo no imprime la cifra (R20).
- **El toggle de recurrencia** (AP.5) y su confirmación antes de que una reserva completada desaparezca.
- **R57 en la reserva sin fecha**, y la ubicación como hija de Ahorro, a dos toques.
- **El nombre.** Cuatro candidatos probados: "Apartados" es el nombre interno del dominio y ya se abandonó en la interfaz; "Gastos futuros" describe bien y colisiona de frente con el bloque Gastos; "Sobres" es metáfora conocida en finanzas personales pero no aparece en ninguna otra parte de Finko.

---

## Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| Ordenar la lista sin agrupar, como hizo la ficha 09 con Metas | Deja fuera lo que hace única a esta sección: el umbral de 30 días ya existe, ya define un concepto y ya lo usa el aviso. Sin el divisor, el aviso y la lista siguen hablando de conjuntos que el usuario no puede relacionar |
| Hacer interactivo el comparador para llegar a la reserva atrasada | Es la solución cara al problema barato, y su autor ya la había descartado con razón. Ordenar la lista resuelve V3 sin tocar el componente |
| Mandar las reservas listas al final, copiando la fila de las metas cumplidas | Entierra lo único que se puede cerrar hoy. `apartadosActivos()` las mantiene vivas a propósito, y el resultado de enterrarlas es pagar dos veces el mismo cobro |
| Quitarle el botón a la fila de la reserva reunida, para que la fila sea idéntica a la de Metas | Consistencia visual a costa de la función. En Metas la fila es historia; acá es una tarea pendiente de un toque |
| Dejar la tarjeta completa a la reserva reunida y solo apagar sus carreras | Ahorra pixeles sueltos y conserva el problema: la tarjeta sigue pidiendo el espacio de algo que solo tiene una cosa que decir |
| Darle un grupo propio a lo ya vencido | Un quinto divisor para un caso que el orden ascendente ya deja arriba. El usuario no necesita que se le nombre: necesita verlo primero |
| Escribir un comparador propio en el dominio en vez de usar el de `infra/bolsas.js` | Es la duplicación que la ficha 09 acabó de evitar. El orden por fecha de una bolsa es uno solo |
| Resolver V5 acá y hacer que "Ya lo usé" registre el gasto | Toca Gastos, Movimientos y Análisis. Decidirlo desde esta ficha sería legislar sobre tres pantallas sin auditar |
| Poner techo al número de columnas del comparador | El componente es compartido y su umbral solo puede fijarse viendo todos sus consumidores. Anotado para la ficha 18, sin decisión |

---

## Consecuencias

- **El aviso deja de apuntar al vacío.** Cuenta y no nombra a propósito, y ahora la primera tarjeta bajo el divisor "Vencen en 30 días" es una de las que cuenta.
- **Cerrar el ciclo de una reserva reunida pasa de tres toques más una pantalla de desplazamiento a los mismos tres toques sin desplazar.**
- **245px recuperados por cada reserva ya reunida.**
- **El comparador gana valor sin cambiar una línea:** el atrasado que nombra su pie es ahora la primera tarjeta que se ve.
- **`infra/bolsas.js` confirma su cuarta pieza compartida** con un segundo consumidor real, y con eso la decisión D5 de la ficha 09 deja de ser una apuesta.
- **Lo que empeora, y se acepta:** una reserva cambia de sitio cada vez que cruza el umbral de 30 días, así que su posición deja de ser memorizable. La posición memorizable lo era porque no significaba nada.
- **Sin cambio de schema y sin dato nuevo.** Ni un color, ni un componente, ni un comparador.
- **Lo que pasa a la ficha 18:** el corte de R89 en R89a y R89b con su mapa de casos; la cláusula pendiente de R87, reforzada acá porque el botón de la sección trae el monto calculado y el de Registrar no puede; **V5**, el ciclo que no registra gasto; **el estado terminal de las cuatro bolsas**, que hoy se resuelve de formas opuestas (Metas conserva las cumplidas para siempre, Reservas borra las no recurrentes sin dejar rastro y conserva las recurrentes esperando un toque, y Fondo e Inversión están sin auditar); y **el techo del comparador**, componente compartido sin umbral declarado.
