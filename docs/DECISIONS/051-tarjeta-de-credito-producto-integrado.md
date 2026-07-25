# ADR 051 - Tarjeta de crédito como producto integrado (cuentas y deudas)

**Estado:** **Abierta** (decisión sin tomar). No implementar nada de este ADR. Tarjeta de seguimiento: **MC.16** en [BOARD.md](../BOARD.md).
**Fecha:** 2026-07-24
**Autores:** Esteban (producto, brief de Mis Cuentas del 2026-07-08), Claude Opus 5 (triaje y redacción)
**Relación:** comparte modelo de datos de dos niveles con el "producto por entidad" del brief de Deudas, cuya estructura se valida en el D3 del [ADR 029](029-catalogo-de-marcas-por-categoria.md): **decidir las dos juntas, no por separado**. La misma estructura la necesitan las subcategorías de Metas ([ADR 048](048-metas-v2-subcategorias-y-plan-de-aportes.md) D1). Si se implementa, desbloquea la derivación de `consumosTC` que el [ADR 050](050-perfil-fiscal-ubicacion-y-framing.md) deja hoy como captura manual. Restringido por la ADN 10 (ningún dominio importa a otro).

---

## Contexto

Los tipos de cuenta que Finko modela hoy no incluyen la tarjeta de crédito. El brief pide ampliarlos (ahorros, corriente, tarjeta débito, **tarjeta crédito**, billetera digital, efectivo, otro), pero el problema no es la longitud del catálogo: es que **una tarjeta de crédito no es dinero disponible, es cupo más deuda**. Meterla como un valor más en la lista de tipos haría que su saldo se sume al patrimonio del usuario como si fuera suyo, que es exactamente lo contrario de la realidad.

Hay un precedente que pesa y que este ADR no puede ignorar: **el tipo de cuenta 'Inversión' se eliminó en la migración v11, justamente para separar dominios**. Reintroducir ahora un tipo que cruza dos dominios (una cuenta que genera deudas) va en dirección contraria a esa decisión y necesita diseño explícito, no un valor más en el catálogo.

El síntoma práctico de que la pieza falta está en otro lado de la app: `consumosTC`, uno de los criterios del monitor de renta, es hoy captura manual porque no hay ningún objeto en el modelo que represente lo que se consumió con tarjeta.

---

## La decisión pendiente

**Si la tarjeta de crédito se modela como un tipo de cuenta, como un producto dentro de Deudas, o como una entidad propia que ambos dominios consultan.**

Nada de esto está decidido. Lo que sigue enmarca el problema.

### Alcance que tendría, cualquiera sea la forma elegida

- Al pagar con la tarjeta, preguntar **a cuántas cuotas**, crear automáticamente la deuda con su tasa registrada y calcular las cuotas.
- Propagar el efecto a Calendario, Análisis y pendientes.
- El **pago anticipado recalcula** las cuotas restantes.
- **Nudges educativos de costos bancarios**: avances en efectivo, retiros en otras redes, pago mínimo. La restricción del brief es explícita, punto 5: intervenir **solo cuando previene un mal hábito**, no como comentario permanente.

### Alternativas sobre la mesa

Ninguna está elegida ni descartada.

**A. Tipo de cuenta nuevo en `tesoreria`.** Es lo que el brief pide literalmente. A favor: el usuario piensa la tarjeta como un producto de su banco, junto a las demás. En contra: reintroduce el cruce de dominios que la v11 eliminó, y obliga a que `tesoreria` sepa generar deudas, lo que roza la ADN 10.

**B. Producto dentro de `compromisos` (Deudas), visible desde Mis cuentas.** El dueño del dato es el dominio que ya modela deudas y cuotas. A favor: no toca el catálogo de tipos de cuenta y respeta la separación de la v11. En contra: el usuario no encuentra su tarjeta donde la busca, y "cupo disponible" es un concepto de cuenta que Deudas no tiene.

**C. Entidad propia consultada por ambos dominios.** Un modelo de producto financiero en `infra/`, que `tesoreria` lee para el cupo y `compromisos` para la deuda. A favor: cumple la ADN 10 sin forzar a ninguno de los dos a saber del otro, y es el patrón que ya funcionó con `infra/vencimientos.js`. En contra: es el diseño más caro, y crea un concepto nuevo que hoy no existe en el modelo.

---

## Consecuencias esperadas

**El patrimonio es lo que está en juego.** Cualquier alternativa debe garantizar que el cupo disponible **nunca** se sume al dinero del usuario. Un error acá no es cosmético: le dice a alguien que tiene dinero que en realidad debe.

**El modelo de datos no se decide solo.** La estructura de dos niveles (entidad y producto: "Visa Platinum del Banco de Bogotá") es la misma que necesitan el brief de Deudas y las subcategorías de Metas. Decidirla tres veces produciría tres formas distintas de representar lo mismo. Se fija una vez, en la validación D3 del ADR 029.

**Desbloquea trabajo fiscal.** Con la tarjeta modelada, `consumosTC` deja de ser un dato que el usuario teclea.

**Los nudges tienen un límite de tono.** El ADR 003 es ADN: educar sobre el costo de un avance en efectivo es útil; comentar cada consumo sería juzgar al usuario.

---

## Fuera de alcance

- **La estructura de dos niveles en sí.** Se decide en el D3 del [ADR 029](029-catalogo-de-marcas-por-categoria.md). Este ADR la consume.
- **El rediseño visual de Mis cuentas.** Cerrado en el [ADR 035](035-mis-cuentas-v2.md).
- **La derivación de `consumosTC` al monitor de renta.** Es de la tarjeta CFG.2a; este ADR solo la habilita.
- **Integración con bancos reales o importación de extractos.** No existe servidor (ADN 3).

---

## Qué falta para cerrarlo

1. **Esteban elige entre A, B y C**, sabiendo que A revisa de hecho la decisión de la migración v11.
2. **Coordinar la elección con el D3 del ADR 029**, que fija la estructura de dos niveles compartida con Deudas y Metas.
3. Definir el tratamiento del cupo en el cálculo de patrimonio antes de escribir una línea.
