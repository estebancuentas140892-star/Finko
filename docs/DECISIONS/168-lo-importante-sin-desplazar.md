# ADR 168 - Lo importante de cada sección sin desplazar

**Estado:** Aceptada (2026-11-18). VIS.1a aplicada; VIS.1b a VIS.1d en curso.
**Fecha:** 2026-11-18
**Autores:** Esteban (pedido "Gastos día a día", sección General, punto 2), Claude Opus 5.5 (auditoría e implementación)
**Relación:** **Acota el [ADR 080](080-mis-cuentas-un-primario-y-lo-informativo-al-pie.md) D1**: lo que le pide algo al usuario no va en la banda "Solo informativo". Conserva el resto del 080 y el [ADR 165](165-el-4x1000-segun-la-cuenta.md) (qué pregunta Finko sobre la cuenta marcada).

---

## Contexto

Esteban pidió que, al entrar por primera vez a cualquier sección, toda la información importante se vea sin desplazar, en el teléfono y en el escritorio. La auditoría (semilla "normal" de los E2E, 13 secciones) dejó cabiendo Inicio, Día a día, Límites, Fondo, Metas, Reservas, Inversión, Me deben y Movimientos en el teléfono, y casi todas en el escritorio. Quedaban bajo el pliegue: la pregunta de la cuenta marcada en Mis cuentas (al pie en los dos anchos), lo próximo en Por pagar, la lista de pagos bajo la grilla del Calendario, "En qué gastas" en Análisis y, en el escritorio, el final de Por pagar, del Calendario y de Metas, con el título de la sección repetido arriba.

## Decisión

### D1. Cómo se mide

El pliegue es el alto de la ventana menos la barra de abajo del teléfono: 784 de 844 en un teléfono de 390, 900 en un escritorio de 1440. Importante es lo que le pide algo al usuario o responde la pregunta de la sección; lo que es reporte o secundario (el reparto del ingreso, el detalle de Análisis) puede quedar abajo. `scripts/auditoria-pliegue.js` repite la medición con capturas que marcan la línea.

### D2. Mis cuentas: la pregunta de la cuenta marcada va bajo las cuentas

"¿Cuál es tu cuenta marcada exenta del 4x1000?" se pinta en `#tesoreria-gmf-marcada`, bajo Transferir: en el teléfono, antes de "Tu ingreso"; en el escritorio, en el hueco de la columna de las cuentas. La banda "Solo informativo" conserva las tarjetas de crédito y el 4x1000 estimado del mes, que no esperan nada del usuario. La pregunta se va sola al elegir la marcada.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Dejarla en "Solo informativo" | Queda al pie en los dos anchos y la banda dice justo que no espera nada del usuario. |
| Ponerla en el hero | El hero dice cuánto hay; una pregunta ahí compite con el total. |
| Preguntarla en una hoja al entrar | Interrumpe a quien entra a mirar un saldo; la tarjeta espera sin bloquear. |

## Consecuencias

- En el teléfono, mientras la pregunta esté, la fila del ingreso queda justo bajo el pliegue; vuelve a la vista al responderla.
