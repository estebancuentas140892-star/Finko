# ADR 006 - Recomendación de estrategia de deudas basada en simulación

**Estado:** Aceptada
**Fecha:** 2026-06-09
**Autores:** Esteban (producto), Claude Opus 4.8 (implementación)

---

## Contexto

La función `recomendarEstrategia(deudas)` decidía entre Avalancha y Bola de nieve mirando solo la **dispersión de tasas**: si la diferencia entre la tasa máxima y la mínima superaba 5 puntos EA, recomendaba Avalancha; si no, Bola de nieve. Nunca simulaba el plan de pago real.

El dueño de producto reportó un escenario concreto que desnudaba dos problemas:

- Deuda A: $200.000 al 10% mensual (~214% EA), cuota $10.000.
- Deuda B: $200.000 sin interés, cuota $20.000.

La app siempre recomendaba Avalancha (diferencia de tasas enorme), pero:

1. **La recomendación estaba desconectada de la realidad.** Sin pago extra, ambas estrategias dan exactamente el mismo resultado en este caso (el orden no cambia nada hasta que una deuda se cierra y libera su cuota). Recomendar Avalancha era ruido.
2. **El plan ni siquiera termina.** La cuota de $10.000 de la deuda A no cubre su interés mensual de $20.000: la deuda **crece sin tope**. La simulación corta en el tope de 600 meses con `completo: false`, pero la app igual recomendaba alegremente una estrategia, sin avisar que el plan es inviable.

La alerta "la cuota no cubre los intereses" solo aparecía **una vez**, al registrar la deuda, y nunca más.

---

## Decisión

**`recomendarEstrategia(deudas, extraMensual)` ahora decide a partir de la simulación real de ambas estrategias**, no de la dispersión de tasas. El orden de decisión es:

1. **0 o 1 deuda** → no recomienda (una sola deuda no necesita estrategia).
2. **Ninguna estrategia completa el plan** (`viable: false`) → no recomienda Avalancha ni Bola. Devuelve un `diagnostico` con las deudas crecientes (cuota < interés mensual) y el **pago extra mínimo** que volvería viable el plan.
3. **Solo una estrategia completa** → esa (la otra dejaría una deuda creciendo sin cerrar).
4. **Ambas completan:**
   - Todas sin interés → Bola de nieve.
   - Avalancha ahorra de forma **material** (>= $50.000 en intereses o >= 1 mes) → Avalancha.
   - Ahorro inmaterial o empate → Bola de nieve (la motivación de cerrar deudas pesa más que el ahorro marginal).

La firma recibe `extraMensual` porque cambia el resultado: un plan inviable sin aporte puede volverse viable (y cambiar de recomendación) con un pago extra.

### Cálculo del pago extra mínimo viable

`_calcularExtraMinimoViable(deudas)` hace **búsqueda binaria** sobre el extra mensual (en múltiplos de $10.000), buscando el menor valor con el que la simulación Avalancha completa. La cota superior segura es el interés del primer mes menos la suma de cuotas: si el extra cubre todo el interés del primer mes (cuando los saldos, y por tanto los intereses, son máximos), el saldo total baja desde el inicio y el plan cierra.

### Señalamiento de tasa desconocida

Las deudas con entidad sin tasa registrada (`tasa: null`, ver ADR de tasa opcional) se simulan como 0%, lo que **subestima** sus intereses. `filtrarDeudasPagables` ahora marca `tasaDesconocida: true` en esas deudas y la card de estrategia muestra un aviso invitando a confirmar la tasa.

---

## Justificación

### 1. El invariante que hace al motor seguro

**Si Bola de nieve completa el plan, Avalancha también lo completa.** Avalancha concentra todo el flujo extra en la deuda de mayor tasa, que es lo óptimo para reducir el saldo total; Bola lo concentra en la de menor saldo, dejando la cara creciendo más. Por eso el caso "solo Bola completa" es imposible, y el motor **nunca** recomienda una estrategia cuyo plan no cierra. Cubierto por un test de invariante.

### 2. Honestidad sobre planes inviables

El cambio más importante no es elegir mejor entre Avalancha y Bola, sino **decir la verdad cuando ninguna funciona**. Antes la app daba una falsa sensación de control; ahora diagnostica la deuda creciente y cuantifica el aporte mínimo para salir del pozo.

### 3. Decisión por números, no por heurística

El umbral de "5 puntos de diferencia de tasas" era un proxy que fallaba en casos como el reportado. La simulación ya existía (`compararEstrategias`); el motor simplemente la usa para decidir, no solo para mostrar el detalle.

---

## Consecuencias

### Positivas

- La recomendación refleja el plan real, no una heurística de tasas.
- El usuario con un plan inviable recibe un diagnóstico accionable (qué deuda crece, cuánto extra necesita).
- Las deudas con tasa sin registrar se señalan en vez de tratarse silenciosamente como 0%.
- El retorno de `recomendarEstrategia` es retrocompatible: los campos `estrategia` y `razon` se conservan; se agregan `viable`, `diagnostico`, `ahorroIntereses`, `ahorroMeses`.

### Negativas / Restricciones

- `recomendarEstrategia` ahora simula (cuesta más que comparar tasas), pero el costo es despreciable: la simulación está acotada a 600 meses y la búsqueda binaria del extra mínimo a ~7 iteraciones.
- El umbral de materialidad ($50.000) es un juicio de producto, no una verdad financiera; documentado como constante nombrada para ajuste futuro.
- Los fixtures de test de `recomendarEstrategia` ahora requieren `cuota` (antes bastaba `tasaEA` y `saldo`), porque la decisión depende de la simulación completa.
