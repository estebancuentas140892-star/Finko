# ADR 179 - Gastos en cuatro pestañas: Día a día, Fijos, Deudas y Límites

**Estado:** Aceptada (2026-11-18).
**Fecha:** 2026-11-18
**Autores:** Esteban (tablero "Finko · Gastos móvil, rediseño de navegación"; pedido: "aplica los cambios del HTML"), Claude Opus 5.5 (implementación)
**Relación:** **Cambia** el [ADR 069](069-bloque-gastos-en-la-barra-movil.md) (tres lentes), el [ADR 080](080-mis-cuentas-un-primario-y-lo-informativo-al-pie.md) D6 (los chips de Por pagar en el teléfono), el [ADR 117](117-por-pagar-por-urgencia-y-en-filas.md) D1 (los grupos del teléfono), el [ADR 140](140-por-pagar-dice-cuanto-te-falta-este-mes.md) (el hero de Por pagar) y el [ADR 157](157-gastos-encabezados-sin-registro-y-lista-del-mes.md) D1 (el mes y el ojo en la fila del nombre), todo bajo 1024 px. Escritorio no cambia.

---

## Contexto

El tablero trae 21 páginas a 390 x 844: dos diagnósticos con capturas de producción del 18 de noviembre, siete páginas en tema oscuro (Día a día, filtrado, con muchos registros, Fijos, Deudas, Límites y la hoja del mes), cuatro en claro y ocho vacíos (primera vez, sin fijos, sin deudas y mes sin gastos, en los dos temas).

El diagnóstico dice dos cosas. Primero, que hay seis bloques antes del primer gasto y que el mes y el ojo ocupan una fila que no dice nada del dinero. Segundo, que un gasto fijo está a tres toques: "Por pagar" agrupa por tiempo y obliga a filtrar para separar lo que la persona ya distingue, lo que paga cada mes y lo que debe. De Por pagar se conserva el orden por urgencia, "Te falta pagar" (ADR 140) y el círculo para marcar pagado, ahora dentro de cada pestaña.

El tema claro no trae decisiones propias: es la misma anatomía con los tokens del tema.

## Decisión

### D1. Cuatro pestañas (GAS.7a)

La barra del bloque pasa a **Día a día, Fijos, Deudas y Límites**. Fijos (`#fijos`) y Deudas (`#deudas`) son dos lentes de la misma sección, `sec-compromisos`: el router las muestra a las dos y `renderSmart` compara por sección (`seccionDelHash`), así que todo lo que ya pintaba Por pagar sigue pintando. La pestaña manda sobre el chip: en ellas no hay chips y la lista y el hero muestran solo su tipo (`filtroDeLente`). Lo que habla solo de deudas (el simulador, su entrada y el aviso de deudas quietas) se apaga en Fijos; el lote, que paga los dos tipos juntos, se apaga en las dos.

En el teléfono `#compromisos` no tiene pestaña: se queda en la que toca (`lentePorPagar`): la que pidió quien llega, si no la que tiene algo vencido, si no la que tiene algo registrado; Fijos gana el empate. Así siguen sirviendo los enlaces de Inicio, Análisis, Ahorro o el Calendario sin tocarlos. Escritorio sigue con "Por pagar" y sus cuatro chips; su fila del sidebar se enciende también en `#fijos` y `#deudas`.

Las marcas: Fijos lleva el número de fijos vencidos, Deudas el de cuotas vencidas y Límites un punto si hay un tope pasado, ahora junto al nombre y no en la esquina (con cuatro celdas la esquina cae sobre la palabra). El botón central abre de una vez el gasto fijo en Fijos y la deuda en Deudas, como ya hacía con el chip (ADR 137 D1).

### D2. El mes y el ojo bajan a la tarjeta (GAS.7b)

La fila del bloque queda con el nombre y la lupa. El mes deja de ser una pastilla aparte y pasa a ser la palabra del rótulo de cada tarjeta: "Gastaste en **noviembre ⌄**", "Te falta pagar en **noviembre ⌄**", "Cuotas por pagar en **noviembre ⌄**" y "Te queda en **noviembre ⌄**". El ojo va en la esquina de la tarjeta, junto a la cifra que tapa; sigue tapando solo su lente (ADR 166).

Tocar el mes abre la hoja **"Elige el mes"**: el año con sus flechas, una frase ("Lo que gastaste cada mes, sin contar fijos ni deudas") y una fila por mes, del más reciente al primero con datos, con su total del día a día, una barra contra el mes más alto del año, "Este mes" en el corriente y el visto con su marca. Un mes sin gastos dice "Sin gastos"; el primero de Finko lo dice. No se listan meses después del tope de la navegación (`mesTopeGastos`).

### D3. Día a día (GAS.7c)

- **Tarjeta:** el comparativo al lado de la cifra ("↘ 8% vs. octubre") y debajo "38 gastos · sin contar fijos ni deudas".
- **Aviso de lo vencido:** una tarjeta debajo dice el pago vencido más antiguo ("Netflix venció hace 16 días · Gasto fijo · $44.900") con "Ver", que lleva a su pestaña. Con varios, cuántos y cuánto suman.
- **Chips con su total:** cada categoría dice cuánto lleva en el mes; filtran y resumen a la vez.
- **Con un chip:** "Restaurantes en noviembre", la cifra, "9 gastos" y, si la categoría tiene límite, su barra y "Te pasaste $45.000 de tu límite de $300.000" (o "Te quedan..."). Las filas dejan de repetir la categoría.
- **Días largos:** un día con más de cuatro gastos muestra los cuatro primeros y "2 gastos más del sábado $26.000 ⌄".
- **Al desplazar:** el nombre sube y quedan pegadas las pestañas y una tarjeta de una línea ("Noviembre ⌄ $1.284.600 38 gastos").

### D4. Fijos (GAS.7d)

Tarjeta: "Te falta pagar en noviembre", una barra de lo pagado y "Pagaste $340.000 de $2.251.900 · 3 de 10 pagos". Grupos: **Vencido** (en rojo, con su suma), **Esta semana** (los próximos siete días), **Más adelante en {mes}** y lo pagado al final. La fila: teja, nombre, la fecha ("Vie 20" o "Venció hace 16 días"), el monto y el círculo. La teja conserva la marca cuando Finko la reconoce (ADR 150): el tablero dibuja íconos genéricos, pero la marca ya se decidió y se lee más rápido.

Vacío: Tino, "Anota lo que pagas cada mes", la frase de lo que hace Finko y "¿Cuál pagas? Empieza con uno" con ocho chips (Arriendo, Energía, Agua, Internet, Celular, Administración, Streaming, Otro) que abren el gasto fijo ya con su nombre.

### D5. Deudas (GAS.7e)

Tarjeta: "Cuotas por pagar en noviembre" y "Debes en total $11.350.000 en 4 deudas". Grupos: **Cuota pendiente este mes** y **Al día este mes**, cada uno con su suma (y lo vencido arriba, en rojo, cuando lo hay). La fila: nombre, cuota, "Mar 24 · crédito con entidad" ("pago mínimo" en la tarjeta de crédito, "deuda personal" en la de una persona) y una línea de avance: "Te falta $6.200.000 de $10.000.000" con su barra, o "Debes $1.450.000 · cupo de $3.000.000" en la tarjeta. Al día: "Pagaste la cuota el 5 nov" y el círculo lleno. Al pie, "¿Cómo salir más rápido?" con cuántos meses faltan con las cuotas de hoy.

Vacío: Tino descansando, "No tienes deudas registradas", la frase y tres caminos (tarjeta de crédito, crédito con un banco o entidad, le debo a una persona).

### D6. Límites (GAS.7f)

Tarjeta dorada: "Te queda en noviembre", la barra y "Usaste $984.000 de $1.250.000 · 1 límite pasado". Grupos: **Pasaste el límite**, **Cerca del límite**, **Vas bien** y **Sin límite** ("Gastas en estas categorías y no tienen tope", cada una con "+ Límite"). La tarjeta "Tu plan de {mes}" (estilo de vida, necesidades, ahorro) no está en el tablero y no se borra: baja al final.

### D7. Primera vez y mes sin gastos (GAS.7g)

Sin gastos, fijos ni deudas, Día a día no muestra tarjeta: Tino, "Aquí ves todo lo que sale de tu dinero" y tres caminos (un gasto de hoy, tus gastos fijos, tus deudas). Un mes pasado sin gastos cambia la tarjeta por "Estás viendo **agosto 2026 ⌄**" y explica: "No registraste gastos en agosto", con "Volver a noviembre" y "Ver septiembre". El vacío del mes corriente con fijos o deudas sigue siendo el del ADR 161.

### D8. Lo que cambia de ADR anteriores

- **ADR 069:** tres lentes pasan a cuatro; "Por pagar" deja de ser pestaña en el teléfono.
- **ADR 080 D6:** los chips Todo, Fijos, Deudas y Pagado quedan solo en escritorio.
- **ADR 117 D1 y ADR 140:** los grupos y el hero de Por pagar se parten por pestaña (D4 y D5).
- **ADR 157 D1:** la pastilla "‹ Noviembre ›" y el ojo salen de la fila del nombre (D2).

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Dos secciones nuevas (`sec-fijos`, `sec-deudas`) | Duplicaría el hero, el lote, el simulador y la hoja de cada compromiso, que hoy viven una sola vez en `sec-compromisos`. Dos lentes de la misma sección no copian nada. |
| Una sola pestaña "Por pagar" con los chips | Es justo lo que el diagnóstico señala: tres toques para un gasto fijo. |
| Redirigir `#compromisos` siempre a `#fijos` en el router | Escritorio perdería la vista "Todo"; y quien llega a ver una deuda caería en Fijos. La pestaña se decide con el chip que trae quien llega. |
| Cambiar todos los enlaces "en Por pagar" de la app | Escritorio sigue llamándose así; en el teléfono `#compromisos` ya cae en la pestaña correcta. |
