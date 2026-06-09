# ADR 005: No desglozar IVA ni propina en el registro de gastos

**Fecha:** 2026-06-09
**Estado:** Aceptado
**Contexto:** Evaluación post-v1.0 de mejorar la captura de datos en gastos.

---

## Contexto

El usuario preguntó si vale la pena registrar el IVA (19%) y el cargo de servicio
voluntario (10% en restaurantes) como campos separados al anotar un gasto.

## Decisión

No se agregan campos de IVA ni de propina al formulario de gastos. El usuario registra
el **total pagado** (monto que salió de su bolsillo), que ya incluye estos conceptos.

## Razones

1. **Para finanzas personales, el total es suficiente.** El dato que informa
   decisiones financieras personales ("¿como demasiado por fuera?", "¿en qué categoría
   gasto más?") es el total, no el desglose impuesto/base.

2. **El IVA no es recuperable para el usuario final.** El desglose de IVA es útil para
   empresas y responsables de IVA que necesitan cruzar el gravamen soportado con el
   cobrado. Un consumidor final nunca recupera ese 19%, así que separarlo no cambia
   ninguna decisión.

3. **La propina es voluntaria y ya está decidida.** El usuario ya eligió darla o no
   en la mesa. Registrarla por separado no aporta información nueva.

4. **Fricción vs. valor.** El registro de gastos debe ser rápido. Agregar campos
   obligatorios o semiopcionales de IVA/servicio aumenta la fricción en cada registro
   sin cambiar los insights que genera la app.

5. **Complejidad de datos.** Registrar IVA por ítem requeriría saber qué productos lo
   aplican (no todos: alimentos básicos, medicamentos y otros están exentos o
   gravados al 5%). Esa granularidad excede el alcance de una app de finanzas personales.

## Consecuencias

El form de gasto mantiene: descripción, cuenta, monto, categoría, fecha y nota.
El campo **monto** siempre es el total pagado.

Si en el futuro surge demanda de una herramienta de estimación, el lugar correcto es
una **calculadora opcional** (dominio `calculadoras`): "¿Cuánto voy a pagar con IVA
19% y servicio 10%?" antes de llegar a la caja. Eso aporta valor sin ensuciar el
historial de gastos.

## Alternativas descartadas

- **Campo IVA opcional en el form:** añade confusión ("¿lo incluyo o no en el monto?").
- **Campo servicio opcional:** misma confusión, y el 10% es voluntario por definición.
- **Categoría especial "IVA/Impuestos":** fragmenta gastos reales (ej. un almuerzo en
  tres filas: base, IVA, servicio) sin beneficio analítico.
