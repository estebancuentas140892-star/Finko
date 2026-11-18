# ADR 168 - Lo importante de cada sección sin desplazar

**Estado:** Aceptada y aplicada completa (2026-11-18) en dos tandas: VIS.1a (D1 y D2, SW v769) y VIS.1b (D3 a D6, SW v770).
**Fecha:** 2026-11-18
**Autores:** Esteban (pedido "Gastos día a día", sección General, punto 2), Claude Opus 5.5 (auditoría e implementación)
**Relación:** **Acota el [ADR 080](080-mis-cuentas-un-primario-y-lo-informativo-al-pie.md) D1** (lo que le pide algo al usuario no va en la banda "Solo informativo"), **el [ADR 079](079-armazon-de-escritorio-una-identidad-un-primario-una-navegacion.md) D1** (el umbral de 1680 baja a 1024) y **el [ADR 132](132-gastos-del-adulto-en-el-telefono.md) D7** (la línea del círculo, solo hasta el primer pago). Conserva el resto de los tres, el [ADR 165](165-el-4x1000-segun-la-cuenta.md) (qué pregunta Finko sobre la cuenta marcada) y el [ADR 111](111-calendario-el-mes-entero-en-el-telefono.md) (el mes entero en el teléfono, con el piso táctil de 44px).

---

## Contexto

Esteban pidió que, al entrar por primera vez a cualquier sección, toda la información importante se vea sin desplazar, en el teléfono y en el escritorio. La auditoría (semilla "normal" de los E2E, 13 secciones) dejó cabiendo Inicio, Día a día, Límites, Fondo, Metas, Reservas, Inversión, Me deben y Movimientos en el teléfono, y casi todas en el escritorio. Quedaban bajo el pliegue: la pregunta de la cuenta marcada en Mis cuentas (al pie en los dos anchos), lo próximo en Por pagar, la lista de pagos bajo la grilla del Calendario, "En qué gastas" en Análisis y, en el escritorio, el final de Por pagar, del Calendario y de Metas, con el título de la sección repetido arriba.

## Decisión

### D1. Cómo se mide

El pliegue es el alto de la ventana menos la barra de abajo del teléfono: 784 de 844 en un teléfono de 390, 900 en un escritorio de 1440. Importante es lo que le pide algo al usuario o responde la pregunta de la sección; lo que es reporte o secundario (el reparto del ingreso, el detalle de Análisis) puede quedar abajo. `scripts/auditoria-pliegue.js` repite la medición con capturas que marcan la línea.

### D2. Mis cuentas: la pregunta de la cuenta marcada va bajo las cuentas

"¿Cuál es tu cuenta marcada exenta del 4x1000?" se pinta en `#tesoreria-gmf-marcada`, bajo Transferir: en el teléfono, antes de "Tu ingreso"; en el escritorio, en el hueco de la columna de las cuentas. La banda "Solo informativo" conserva las tarjetas de crédito y el 4x1000 estimado del mes, que no esperan nada del usuario. La pregunta se va sola al elegir la marcada.

### D3. En el escritorio la sección se nombra una sola vez desde 1024

El encabezado de la sección (teja, título y frase) se oculta visualmente desde 1024px y no desde 1680: el nombre ya está en la barra superior y cabe entero en todas las secciones desde 1024 (el más largo, "Fondo de emergencia", ocupa 188px). El `h1` sigue siendo el nombre accesible. Gana hasta 79px del primer pliegue: Metas y el Calendario caben enteros en 1440x900. Inicio conserva su encabezado y su aire: es el saludo, no un título repetido.

### D4. El mes del Calendario cede alto

Bajo 1024 la celda mide 44px (el piso táctil) y no 48, y el encabezado del mes, el de los días y la leyenda se acercan: el mes cede 40px y bajo la tarjeta asoma "Vencido" con su total en un teléfono de 390x844 (en uno de 430x932, la primera fila entera). Desde 1024 la celda mide 70px y no 80: un día con un evento ocupa ~63px y la fila crece con el más cargado.

### D5. "Toca el círculo", solo hasta el primer pago

La línea que explica el círculo de Por pagar sale mientras el usuario no haya pagado nada (ningún gasto con `compromisoId`). Quien ya pagó sabe qué hace, y la línea le empujaba lo próximo fuera de la vista.

### D6. Lo que se queda abajo a propósito

Análisis es un reporte: el puntaje y lo que realmente tienes se ven al entrar; "A dónde va tu dinero" y "En qué gastas" piden desplazar. También quedan abajo el reparto del ingreso en Mis cuentas, las categorías sin tope de Límites, la nota del Fondo y, en Por pagar de escritorio, la tercera deuda.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Dejarla en "Solo informativo" | Queda al pie en los dos anchos y la banda dice justo que no espera nada del usuario. |
| Ponerla en el hero | El hero dice cuánto hay; una pregunta ahí compite con el total. |
| Preguntarla en una hoja al entrar | Interrumpe a quien entra a mirar un saldo; la tarjeta espera sin bloquear. |
| Calendario: la lista de pagos antes del mes en el teléfono | La sección es el mes; lo próximo ya lo dice el hero y los días vencidos se ven en rojo. |
| Calendario: celdas de 40px | Rompe el piso táctil de 44px (R4); el ADR 111 solo lo admite a 320px. |
| Análisis: subir "En qué gastas" | Seguiría bajo el pliegue: el reporte es largo por naturaleza y lo que responde la sección ya se ve. |

## Consecuencias

- En el teléfono, mientras la pregunta esté, la fila del ingreso queda justo bajo el pliegue; vuelve a la vista al responderla.
- En teléfonos de 667px de alto (iPhone SE) el Calendario y Por pagar siguen pidiendo desplazar.
- Quien no ha pagado nada todavía ve la línea del círculo: es cuando la necesita.
