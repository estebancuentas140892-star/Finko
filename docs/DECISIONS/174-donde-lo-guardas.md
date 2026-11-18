# ADR 174 - ¿Dónde lo guardas?: metas, reservas y fondo dicen en qué bolsillo están

**Estado:** Aceptada (2026-11-18). Pedido "Revisión de servicios, categorías y movimientos", punto 2: cómo integrar los bolsillos y el colchón financiero, y si se tratan como movimientos o como herramientas de organización. La propuesta salió de esa revisión y se aprobó en chat el mismo día: "Sí, sigue con bolsillos".
**Fecha:** 2026-11-18
**Autores:** el pedido de revisión (producto), Claude Opus 5.5 (investigación, análisis del modelo y diseño)
**Relación:** **Amplía** la meta, la reserva ([ADR 007](007-dominio-apartados.md)) y el fondo de emergencia con un dato de referencia, y la hoja de la cuenta del [ADR 135](135-mis-cuentas-y-me-deben-en-el-telefono.md) D4 con lo que está guardado en ella. **Respeta** el [ADR 020](020-fondo-marcador-de-liquidez.md) (el fondo es un marcador: su dinero sigue en las cuentas) y el [ADR 145](145-los-aportes-de-metas-y-reservas-tienen-fecha.md) (el aporte a una meta o a una reserva sale de una cuenta y deja su fila). **Confirma** el ADR 007: "Bolsillos" sigue fuera del vocabulario de la app como nombre de sección, por ser palabra de marca. No crea movimientos.

---

## Contexto

**Qué hace cada banco (noviembre de 2026):**

| Producto | Qué hace | ¿Rinde? |
|---|---|---|
| Bolsillos de Nequi | Separan dinero del "Disponible" dentro del mismo depósito. Hasta 10 | Sin confirmar |
| Colchón de Nequi | Apartado para emergencias, separado del Disponible, con protecciones para no gastarlo | Sin confirmar |
| Bolsillos "interesantes" de Nequi | Monto y plazo fijos, tasa propia | Sí: es un ahorro a plazo |
| Bolsillos de Bancolombia | Divisiones de la misma cuenta de ahorros. Hasta 15. Suman al saldo total | La tasa de la cuenta |
| Cajitas de Nu | Separan dinero del saldo principal, sin plazo | Sí: 9,35 % EA |

**Finko ya tiene lo mismo con otro nombre:**

| Lo que el banco llama | En Finko |
|---|---|
| Bolsillo con un objetivo (viaje, celular nuevo) | Meta |
| Bolsillo para un gasto que se sabe que viene (SOAT, matrícula) | Reserva |
| Colchón o fondo de emergencia | Fondo de emergencia (de 3 a 6 meses, lo mismo que recomiendan Bancolombia y BBVA) |
| Bolsillo "interesante" o CDT desde una Cajita | Inversión tipo CDT |

**El hueco no es un concepto, es saber dónde está el dinero.** Una meta dice cuánto lleva, pero no en qué bolsillo de qué banco lo tiene. Y la meta y el fondo se comportan distinto frente al saldo de la cuenta:

- **Meta y reserva:** su aporte sale de la cuenta en Finko (ADR 145). El dinero ya no está en el saldo de la cuenta.
- **Fondo:** es un marcador (ADR 020). Su dinero sigue en el saldo de la cuenta. Si está en el Colchón de Nequi, Finko muestra Nequi con ese dinero adentro, mientras la app de Nequi lo muestra aparte.

Quien compara Finko con su banco no tiene cómo saber cuál bolsillo es cuál.

---

## Decisión

### D1. Herramientas de organización, no movimientos

Bolsillos, Cajitas y Colchón no generan un tipo de registro ni de movimiento nuevo. Se organizan con lo que existe: meta, reserva, fondo e inversión. Pasar dinero a un bolsillo es aportar a la meta o a la reserva (ya deja su fila, ADR 145).

### D2. "¿Dónde lo guardas?"

Dato opcional en la meta, la reserva y el fondo: **`guardadoEn: { cuentaId, bolsillo }`**. La cuenta se elige de las cuentas de dinero. `bolsillo` es texto libre y opcional: el nombre que tiene en el banco ("Viaje", "Colchón").

Es solo referencia: no mueve dinero ni cambia ningún cálculo. Va en "Agrega si quieres" al crear ([ADR 142](142-formularios-por-tarea.md) D5) y en la ficha al editar. Sin migración: sin el dato, todo se ve como hoy. Si la cuenta se elimina, el dato se ignora.

### D3. Cómo se ve

- **En la meta, la reserva y el fondo:** una fila "Guardado en Nequi, bolsillo Viaje", o solo "Guardado en Nequi" si no hay nombre de bolsillo.
- **En la hoja de la cuenta:** una sección **"Guardado aquí"** con cada meta, reserva o fondo que dice estar en ella, con su monto. Cada fila se compara con su bolsillo en la app del banco.
  - Bajo las metas y reservas: "Este dinero ya salió del saldo de la cuenta: lo apartaste".
  - Bajo el fondo: "Tu fondo está dentro de este saldo", la frase del ADR 020 dicha donde está el dinero.
- **Con el ojo de Mis cuentas cerrado** ([ADR 166](166-un-ojo-por-seccion.md)), los montos de "Guardado aquí" se tapan como los demás.

### D4. El aporte propone esa cuenta

Si la meta o la reserva tiene `guardadoEn`, aportar propone esa cuenta como origen: pasar dinero al bolsillo de Nequi sale, casi siempre, del disponible de Nequi. El usuario la cambia si no es así, y el aviso de saldo del [ADR 163](163-ninguna-cuenta-por-debajo-de-cero.md) aplica igual. El fondo no cambia: su aporte no pide cuenta (ADR 020).

### D5. La palabra "colchón"

El fondo de emergencia suma un subtítulo: **"Tu colchón para emergencias"**. "Colchón financiero" es como lo llama la gente, y la app ya lo usa por dentro (`mesesDeColchon`). El nombre de la sección no cambia.

### D6. Lo que queda fuera

- **Los rendimientos de una Cajita o de un bolsillo** se anotan como ingreso "Rendimientos", que ya existe. Llevarlos directo a la meta sería otro flujo y no se pide.
- **Un bolsillo como cuenta en Mis cuentas** no se propone. Solo es cuenta un producto con número propio (una cuenta de ahorros aparte).

---

## Rebanada

| Rebanada | Qué entrega |
|---|---|
| AH.9 | D2 a D5: `guardadoEn` en meta, reserva y fondo (normalizar, validar, editar), la fila en sus fichas, "Guardado aquí" en la hoja de la cuenta, la cuenta propuesta al aportar y el subtítulo del fondo |

---

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Una sección "Bolsillos" | Repetiría Metas, Reservas y Fondo con el nombre de una marca (ADR 007) |
| Cada bolsillo como cuenta en Mis cuentas | Cada aporte sería una transferencia y el dinero quedaría dos veces: en la cuenta-bolsillo y en la meta |
| Que el fondo descuente la cuenta, como la meta | El ADR 020 ya lo descartó: el fondo no tiene flujo de salida y es dinero disponible para emergencias |
| Calcular "lo que tu banco muestra como disponible" | Depende de si el dinero está separado en un bolsillo o mezclado con el resto, algo que Finko no sabe; listar cada monto basta para comparar |
| Elegir el bolsillo de una lista | Finko no conoce los bolsillos del banco: el nombre es texto del usuario |
| Renombrar la sección a "Colchón" | "Fondo de emergencia" ya está en toda la app y en los avisos; el subtítulo trae la palabra sin mover nada |

---

## Consecuencias

### Positivas

- Cada meta, reserva y fondo dice dónde está su dinero.
- La hoja de una cuenta muestra lo que guarda, para compararlo bolsillo por bolsillo con el banco.
- La diferencia entre la meta (fuera del saldo) y el fondo (dentro del saldo) se dice donde se ve.

### Negativas / Restricciones

- Un dato opcional más en tres formularios.
- El nombre del bolsillo es texto: si el usuario lo cambia en su banco, también lo cambia en Finko.
