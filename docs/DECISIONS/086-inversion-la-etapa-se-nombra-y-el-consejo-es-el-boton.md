# ADR 086 - Inversión: la etapa se nombra y el consejo es el botón

**Estado:** Aceptada. Implementada en la ficha 13 de la auditoría UX/UI móvil (MOV.1).
**Fecha:** 2026-08-21
**Autores:** Esteban (producto), Claude Design (ficha 13 de la auditoría móvil), Claude Opus 5 (implementación)
**Relación:** **confirma DIS.17 casi entero**, que es la lista de "mantener" más larga de la serie: la tarjeta del momento, el gráfico de dos columnas, las notas de honestidad, el orden por monto y el primario único. **Acota DIS.17 en una sola cosa**, el contador de su cabecera, y retira la constante `TOTAL_MOMENTOS` que lo alimentaba. Conserva entero el [ADR 053](053-invariante-de-patrimonio.md) (el origen del dinero y su invariante) y el [ADR 056](056-la-casa-de-ahorro.md) en su reparto con `infra/portafolio.js`. Cierra el último caso de **R85** de la casa Ahorro. Con esta ficha quedan cerradas **la casa y sus cuatro hijas** (04, 09, 10, 11, 13).

---

## Contexto

Inversión es la última bolsa sin auditar y **la primera sección de la serie que ya había hecho este trabajo por su cuenta**. DIS.17 quitó un total que no enseñaba nada, mató un tip permanente, dejó un solo primario y ordenó la lista a propósito. El resultado es que casi todo se mantiene, y que los tres defectos que quedan son de un tipo que no había aparecido en doce fichas: **la sección promete algo que su propio código no puede alcanzar**.

- **N1, crítico. Un contador con denominador inalcanzable.** La cabecera imprime "Momento N de `TOTAL_MOMENTOS`", y esa constante vale 3. Pero el número sale de `etapaDePortafolio()`, cuya única línea que lo decide es `numero: activas.length === 1 ? 1 : 2`. Uno o dos, **nunca tres**. Y el código lo sabe: el comentario del momento 2 dice que "el momento 3 no se puede prometer: necesita un dato que Finko no guarda", y por eso su anticipo habla de interés compuesto en vez de anunciar una etapa siguiente. **La lógica es honesta y la cabecera no.**
- **N2, alto. La sección aconseja al revés según cuánto hayas avanzado.** Sin fondo de emergencia y sin inversiones, el primario era "+ Registrar inversión" y el consejo de abajo decía que primero asegures el fondo. Con una inversión ya hecha y el mismo fondo ausente, `_renderAcciones()` invierte la jerarquía y el primario pasa a ser "Ir al Fondo de emergencia". O sea que **la app era más prudente después de que el usuario invirtió que antes**, que es cuando el consejo sirve. Y en la misma tarjeta el botón y el tip decían cosas opuestas: quien leía solo el botón hacía justo lo que el tip desaconsejaba.
- **N3, medio, y ya estaba resuelto.** La ficha reportaba que el tip nombraba "la pestaña Fondo (arriba)", una posición de pantalla (regla R85). Verificado antes de tocar nada: el tip ya enlazaba a `#fondo`. Lo que quedaba de N3 desaparece con N2, porque el tip completo se retira.

---

## Decisión

Inversión se queda donde está y como está, salvo dos cosas. Las dos son quitar.

### D1. La cabecera nombra la etapa y deja de contarla

"Momento 2 de 3" pasa a **"Construyendo"**, y "Momento 1 de 3" a **"Aprendiendo"**: la etapa con su nombre, que es la palabra que el chip ya usaba. Y el chip, liberado de repetir la etapa, pasa a decir **de qué está hecha**: "3 inversiones · 3 tipos", con sus singulares cuando corresponde.

`TOTAL_MOMENTOS` se retira. Era el denominador de la promesa falsa y no tenía otro consumidor.

**Alternativa considerada y descartada: dejar "de 2".** Sería cierto hoy y quedaría obsoleto el día que exista un tercer momento, además de anunciar un techo bajísimo a alguien que empieza.

Se pierde la sensación de progreso numérico y se gana no mentir. Esa motivación era real y bien intencionada, pero estaba construida sobre un peldaño que no existe, y una motivación falsa se cobra sola cuando el usuario descubre que no avanza.

### D2. El estado vacío hereda la jerarquía del momento 1

Sin fondo de emergencia, el primario del vacío pasa a ser **"Ir al Fondo de emergencia"** y "Registrar inversión" baja a secundario: exactamente lo que `_renderAcciones()` ya hace cuando hay una inversión y falta el fondo. **Cero patrones nuevos**, y sin quitarle al usuario la opción de invertir igual.

Con el fondo activo, el vacío se queda como estaba: primario "+ Registrar inversión". Y la descripción se adapta al caso en vez de dar el catálogo de instrumentos a quien todavía no debería invertir.

**El tip desaparece en los dos casos.** Cuando falta el fondo, el consejo **es** el botón; cuando el fondo ya está, el consejo no aplica. Con él se va la última frase de la casa Ahorro que nombraba una posición de pantalla.

### D3. Lo que no se toca, que es casi todo

- **La tarjeta del momento entera** (DIS.17): que la cabecera sea la etapa y no un total, que la lección cambie cuando el usuario cambia ("una explicación que se repite para siempre deja de educar"), y que no haya barra de progreso porque una inversión no tiene meta.
- **El gráfico de dos columnas**, con la primera partida por tipo y el segmento del tiempo encima: diversificación y rendimiento en una sola figura. Y si nada es proyectable, la segunda columna no se dibuja en vez de fingir una comparación.
- **La honestidad del cálculo**: "no es una promesa: confírmalo con tu entidad", la retención del 7% aplicada al CDT, y la nota que dice cuántas inversiones quedan fuera de la proyección por no tener ganancia fija.
- **El total invertido a media tarjeta.** Subirlo parece obvio y DIS.17 lo bajó a propósito, porque "no enseñaba nada por sí solo". Decisión cerrada, razonada y sin evidencia en contra.
- **El orden de la lista por monto descendente.** La pregunta de esta sección es cómo está repartido el dinero, no qué vence antes.
- **La altura de la tarjeta**, que deja la lista bajo el pliegue. Acá la tarjeta aparece **una vez**, no una por elemento como en Metas: recortarla sería tocar lo único que educa.
- **El origen del dinero, que no se vuelve a preguntar al editar** ([ADR 053](053-invariante-de-patrimonio.md)): reabrirlo permitiría mover un descuento histórico entre cuentas sin dejar rastro.
- **El nombre.** "Inversión" se conserva: cabe en el chip, es la palabra del usuario y no colisiona. Descartados "Portafolio" (es el nombre del módulo de infraestructura y suena a asesor, no a app personal) y "Mis inversiones" (ya es el título de la lista de dentro, y dos niveles no pueden llamarse igual).

---

## Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| Hacer alcanzable el momento 3 | Exige guardar el valor de mercado de cada posición, un dato que Finko no tiene. Es una decisión de producto que toca el modelo de datos y Análisis: excede esta ficha |
| Dejar el contador en "de 2" | Cierto hoy, obsoleto el día que exista un tercer momento, y anuncia un techo bajísimo a quien empieza |
| Conservar el contador y añadir un momento 3 vacío o "por venir" | Es la misma promesa falsa con más letra pequeña |
| Dejar el tip del vacío y solo cambiar el primario | El tip y el botón seguirían siendo dos voces en la misma tarjeta. Cuando el consejo se vuelve el botón, el tip no aporta |
| Quitar del vacío la opción de registrar cuando falta el fondo | Sería decidir por el usuario. Baja a secundario, no desaparece: el mismo criterio que `_renderAcciones()` ya aplicaba |
| Subir el total invertido a la cabecera | DIS.17 lo bajó con razón escrita y esta auditoría no encontró con qué rebatirla |
| Recortar la tarjeta para que la lista entre en el pliegue | Es lo único que educa en la sección, y a diferencia de Metas aparece una sola vez |
| Escribir una regla nueva del tipo "un contador declara un total alcanzable" | Una sola aparición en trece fichas. Sería documentar una observación local; se anota el caso para la 18 sin numerarlo |

---

## Consecuencias

- **La sección deja de prometer una etapa inalcanzable.** Nada que perseguir y nada que prometer.
- **Ir al fondo desde el vacío pasa de tres toques y una lectura a un toque.** Registrar sigue a un toque, como secundario.
- **La app deja de aconsejar al revés a quien más lo necesita**, que es el que todavía no ha invertido nada.
- **Se cierra el último R85 de la casa Ahorro.** Conviene verificar en el cierre que no queda ningún "(arriba)" en los otros dominios.
- **`momentoInversion()` cambia su contrato:** suma `etapa` y su `chip` pasa de repetir la etapa a decir su composición. Su único consumidor es la vista de la sección; el carril de Ahorro usa `etapaDePortafolio()` y `columnasPortafolio()`, que no se tocan.
- **Sin cambio de schema, sin dato nuevo, sin componente nuevo.** Ni un color.
- **Reglas candidatas:** **R89a suma su primer caso positivo** y eso importa más de lo que parece. Las fichas 09, 10 y 12 encontraron listas sin orden, y una regla que **nadie** cumple es sospechosa de ser un gusto del auditor. Acá `_renderLista()` llama a `ordenarInversionesPorMonto()` con la razón escrita, así que la regla deja de tener solo incumplimientos. **R89b se cumple**: el carril de Ahorro y esta sección comparten `etapaDePortafolio` y `columnasPortafolio`, o sea mismas cifras y misma figura desde un solo módulo. **R86 y R88 sin caso**, buscados y no encontrados: R88 sigue con una sola aparición y la ficha 16 es su última oportunidad. **R87 recibe un matiz**: registrar una inversión mueve dinero (descuenta de la cuenta de origen) **y** crea un objeto duradero, así que no encaja limpio en ninguno de los tres tipos que la cláusula pendiente distingue.
- **Lo que pasa a la ficha 18:** **¿debe Finko guardar el valor de mercado de una inversión?** Es el dato que falta para que exista un tercer momento (el que compara lo que vale hoy contra lo que costó) y también el que haría honesto el patrimonio de Análisis, que hoy suma capital invertido y no valor actual. Además, **el caso del contador con denominador inalcanzable** (una aparición, sin regla), **el matiz de R87**, la verificación de que no queda ningún R85 en otros dominios, y **el estado terminal de las cuatro bolsas**, ya en la lista desde la ficha 10 y ahora con el dato de que Inversión no tiene ninguno: una posición se cierra borrándola, sin rastro.
