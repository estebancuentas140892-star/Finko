# ADR 149 - Inicio, centro de atención rápida: lo de hoy, lo de la semana, lo que falta completar y lo nuevo

**Estado:** Aceptada (2026-11-16). Pedido de Esteban en chat; las cuatro decisiones abiertas (qué es un registro pendiente, cómo dura una meta alcanzada, qué sale de "Atención hoy" y si alcanza a escritorio) las eligió él antes de implementar.
**Fecha:** 2026-11-16
**Autores:** Esteban (visión de producto), Claude Opus 5.5 (diseño e implementación)
**Relación:** **Cambia** el [ADR 099](099-inicio-movil-hoy-en-una-lista.md) D1 (las clases que entran a "Atención hoy"). **Revisa** una alternativa que el [ADR 066](066-motor-unico-de-avisos.md) había rechazado (el aviso de "meta alcanzada"). **Retira** el panel de alertas de límites de Inicio en escritorio, que el [ADR 057](057-inicio-en-escritorio.md) (IN.9a) había subido junto al aviso de distribuir. Conserva el [ADR 087](087-inicio-en-movil-tambien-avisa-y-no-resume.md) y el [ADR 070](070-inicio-centro-de-atencion-en-escritorio.md) D2: Inicio avisa y no resume. Se apoya en el [ADR 147](147-gusto-o-necesidad-hormiga-sin-adivinar.md) D1 (la pregunta de gusto o necesidad).

---

## Contexto

Esteban (2026-11-16): Inicio debe funcionar "como un centro de atención rápida y no como un segundo panel de análisis financiero": de un vistazo, qué atender, qué está por ocurrir y qué se podría olvidar. Pidió cuatro bloques: registros pendientes, novedades importantes, atención hoy y esta semana. Sin gráficos, estadísticas ni balances, y sin tarjetas vacías.

Lo que ya había: los gráficos, el resumen semanal y la actividad reciente salieron de Inicio con los ADR 070 y 087. "Atención hoy" mezclaba dos cosas distintas: lo que pide hacer algo hoy (un pago vencido, un ingreso sin repartir) y lo que pide enterarse (un límite pasado, una reserva que ya reunió el dinero, el respaldo atrasado). No existía ningún bloque para lo que el usuario dejó a medio registrar, ni para una meta cumplida.

## Decisión

### D1. Cuatro bloques, en el orden de la urgencia

`Atención hoy` → `Esta semana` → `Por completar` → `Novedades`, debajo del saldo. Los dos primeros no cambian de forma. Los dos nuevos usan las mismas filas de "Atención hoy" (`.atencion-hoy__*`), en los dos anchos: la pantalla se lee como una sola lista partida en bloques. Cada bloque nuevo aparece solo con algo que decir; sin ninguno, su grupo desaparece. En escritorio van lado a lado, y uno solo ocupa la fila.

### D2. Lo que es novedad sale de "Atención hoy"

Son novedad (`TIPOS_NOVEDAD`, `ui/atencion-hoy.js`): límite pasado o al 75 %, reserva lista, meta alcanzada, respaldo atrasado y "pagas varias suscripciones". "Atención hoy" se queda con lo que pide hacer algo hoy: pagos vencidos o de hoy, débito sin saldo, préstamo con la fecha pactada vencida, ingreso por distribuir, día de pago y la nube por decidir. Un aviso va a un bloque o al otro, nunca a los dos. Las novedades van todas como filas que se tocan enteras, sin aviso destacado ni urgencia escrita: nada de eso es para hoy.

En escritorio sale el panel `#panel-limites` y el panel de avisos deja de mostrar la reserva lista, el respaldo y las suscripciones: los dice "Novedades".

### D3. "Por completar": lo que quedó a medio registrar

En Finko todo gasto lleva categoría, así que no hay "sin categorizar" literal. Quedan a medias dos cosas (`infra/pendientes.js`):

1. **Gastos en "Otros" que no dicen en qué fueron** (sin nota, descripción ni subcategoría) de los últimos 30 días. La fila abre el más reciente con `editar-gasto`; al completarlo, la fila pasa al siguiente.
2. **La pregunta "¿es un gusto o algo que necesitas?"** del ADR 147, que hasta ahora solo aparecía dentro de Gastos, con sus dos respuestas a la vista (`gastos-gusto-o-necesidad`). No se pregunta sobre "Otros" a secas: primero hay que decir en qué fue.

No entra al motor de avisos ni al interruptor de Ajustes: un dato que falta no es una notificación que se pueda apagar.

### D4. La meta alcanzada es novedad durante siete días

Aviso nuevo del motor, `meta-alcanzada`, de severidad baja (nunca despierta el teléfono). La fecha es la del último aporte de la meta cumplida (`fechaMetaAlcanzada`, `metas/logic.js`): la meta no guarda cuándo se completó y no hace falta, porque una meta cumplida ya no recibe aportes. Dura `DIAS_META_ALCANZADA` (7) días y se va sola, sin dato nuevo ni migración. Una meta cumplida sin aportes con fecha (anterior a la v50, o por bajar el objetivo) no avisa.

El ADR 066 rechazó este aviso porque "repetirlo en la próxima apertura es noticia vieja" y el toast del abono ya lo decía. Se revisa porque cambió la pregunta: ya no es "qué merece una notificación" sino "qué te podrías perder si no abriste Finko el día del aporte". Con una ventana fija deja de ser un estado que persiste.

## Alternativas descartadas

- **"Hasta que toques Visto" para la meta.** Pedía guardar qué metas se vieron y subir el schema por una novedad de severidad baja. Esteban eligió la ventana de siete días.
- **Dejar los límites en "Atención hoy" y crear "Novedades" solo con las metas.** Un límite pasado no pide nada hoy; dejarlo arriba seguía mezclando urgencia con información.
- **Contar como pendiente todo gasto en "Otros".** Un "Otros" con nota ("recarga") ya está registrado; marcarlo sería pedirle al usuario que repita lo que ya dijo.
- **Solo en el teléfono.** Escritorio habría seguido con el panel de límites y el de avisos diciendo lo mismo que "Novedades" en otra forma.

## Consecuencias

- "Nada que atender hoy" puede convivir con un límite pasado debajo, en Novedades: es correcto, porque el límite no se atiende hoy.
- `renderPanelLimites()` (`presupuesto/view.js`) queda sin contenedor en Inicio: no pinta nada. Retirarla junto con sus pruebas es limpieza pendiente.
  > Nota (2026-11-16): retirada el mismo día, con Esteban de acuerdo, junto con `.limites-card` y su prueba unitaria.
- "Atención hoy" y la hoja "Avisos de hoy" cuentan menos que antes con los mismos datos: el número sigue siendo uno solo (ADR 099 D3), pero ya no incluye novedades.
- La meta alcanzada no tiene interruptor en Ajustes (no es de ninguna de las seis secciones de avisos). Es baja y dura una semana.
