# ADR 011 - Unificación del simulador de deudas

**Estado:** Aceptada
**Fecha:** 2026-06-28
**Autores:** Esteban (producto), Claude Opus 4.8 (diseño), Claude Sonnet 4.6 (implementación)

---

## Contexto

La simulación de pago de deudas hoy vive en **tres superficies dispersas** que no se hablan entre sí:

1. **Acordeón "Paga un extra cada mes"** (dentro de la card de estrategia, colapsado por defecto): recalcula al salir del campo (`change`), pero el impacto se ve escondido dentro del detalle de la estrategia que el usuario haya elegido (Avalancha o Bola de nieve). Si no eligió ninguna, parece que "no pasa nada" al escribir un monto.

2. **Botón "Simular" por deuda** (en cada fila de la lista de deudas): abre un modal con su propia simulación individual (meses/intereses ahorrados). Solo muestra resultado si el usuario escribe un valor. No se conecta con el panel de estrategia.

3. **Diagnóstico "no se terminan de pagar"** (banner cuando el plan es inviable): lista las deudas que crecen y sugiere renegociar la tasa, consolidar las deudas o aumentar la cuota. Son texto plano: el usuario lee la recomendación pero no puede actuar sobre ella desde ahí.

**El usuario reportó** que tanto el extra como el botón "Simular" parecen no hacer nada, y que las recomendaciones deberían ser herramientas interactivas que muestren el impacto en tiempo real.

---

## Decisión

### Principio central

**Una sola superficie de simulación** dentro de la sección de Deudas, inline (no en modal), con resultados en vivo que el usuario puede ver sin buscar.

### Cambios concretos

1. **El extra mensual se sube arriba de la card de estrategia**, como un control prominente (no un acordeón colapsado), con un **resumen de impacto siempre visible** que compara "sin extra" vs "con extra": nueva fecha de fin, meses menos, intereses ahorrados. Se calcula con `compararEstrategias` (ya existe). Esto arregla "no pasa nada al escribir un valor".

2. **El botón "Simular" por deuda se elimina.** La simulación individual se absorbe en el panel unificado: con el extra mensual y las estrategias visibles, el usuario ya ve el impacto sobre todo el portafolio de deudas. Un simulador por-deuda aporta un dato parcial que no refleja cómo interactúan las deudas entre sí (cuotas liberadas, volcamiento).

3. **Las recomendaciones pasan de texto a herramientas interactivas**, como controles adicionales dentro del panel de estrategia. Cada una tiene su propio input y muestra una comparación en vivo:
   - **Renegociar tasa**: el usuario elige una deuda e ingresa una nueva tasa; se compara el plan actual vs la nueva tasa (reusa `simularPagoDeuda`).
   - **Consolidar deudas**: el usuario ingresa condiciones de un nuevo crédito (tasa, cuota o plazo); se compara la consolidación vs la mejor estrategia actual.
   - **Aumentar cuota**: es el extra mensual ya expuesto arriba. No necesita tratamiento separado.

4. **Las herramientas interactivas son "what-if"**: nunca modifican `S`. Son comparaciones que ayudan al usuario a decidir antes de actuar. Cada resultado incluye el disclaimer orientativo del ADN: "según lo que registras en Finko; confirma con tu entidad financiera".

### Slices de implementación (smallest-first)

| Slice | Qué | Lógica nueva |
|---|---|---|
| S1 | Extra mensual como control principal + resumen de impacto siempre visible | No (reusa `compararEstrategias`) |
| S2 | Eliminar botón "Simular" por deuda y su modal | No (solo eliminación) |
| S3 | Reorganizar el acordeón (ya absorbido en S1, limpiar el dead code) | No |
| S4 | "Renegociar tasa" interactivo | `simularRenegociacion` + tests |
| S5 | "Consolidar deudas" interactivo | `simularConsolidacion` + tests |

---

## Alternativas consideradas

- **Mantener las 3 superficies y mejorar cada una por separado:** el usuario describió explícitamente la confusión de tener la simulación fragmentada. Mantener la fragmentación solo reduciría el síntoma, no la causa.
- **Modal unificado de simulación (en vez de inline):** agrega un paso (abrir el modal) que desconecta al usuario de su lista de deudas. Inline es mejor.

---

## Consecuencias

- La card de estrategia se vuelve **el centro de control** de deudas: estrategia + extra + impacto + herramientas what-if.
- El botón "Simular" por deuda desaparece de la lista. Habrá 2 tests E2E (de `estrategia-pago`) y potencialmente tests unitarios que referencien `simular-abono` o `renderSimulacion`: se actualizan o eliminan en S2.
- Las herramientas interactivas (S4, S5) requieren funciones puras nuevas con tests de lógica financiera. La implementación es posterior a S1-S3 y se revisa en sesiones dedicadas.
