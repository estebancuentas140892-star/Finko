# ADR 004 - Eliminar la tasa de usura (refinamiento de la regla 12)

**Estado:** Aceptada
**Fecha:** 2026-06-07
**Autores:** Esteban (producto), Claude Opus 4.8 (implementación)

---

## Contexto

La regla 12 del ADN (`CLAUDE.md`) decía: "Constantes legales con fecha de revisión: tasa de usura trimestral, SMMLV/UVT anual."

La tasa de usura la certifica la Superintendencia Financiera (SFC) **cada trimestre**. Mantenerla vigente exigía agregar una entrada nueva a `USURA_POR_PERIODO` cuatro veces al año, cada vez que la SFC publica la certificación. En la práctica esto significaba un recordatorio de mantenimiento recurrente que, si se olvidaba, dejaba la app mostrando una tasa desactualizada etiquetada como vigente.

Al revisar el footprint real, la usura tenía un uso vivo mínimo:

- **Único consumo en la UI:** un hint en el formulario de "deuda con entidad" ("La usura vigente es ~X% anual (SFC, periodo). Si tu tarjeta o banco supera ese límite, puedes reportarlo.").
- **Definido pero sin consumir en la app:** `clasificarTasaCredito()` (clasificaba una tasa en bandas), usado solo por tests.
- **Infraestructura:** tabla `USURA_POR_PERIODO`, función `tasaUsuraVigente()`, exports `TASA_USURA` y `PERIODO_USURA`.

El dueño de producto decidió enfocar el mantenimiento solo en indicadores de baja frecuencia: anuales (SMMLV, auxilio de transporte, IPC) y estables sin vencimiento (GMF/4x1000, aportes de seguridad social).

Alternativas consideradas para el hint de usura:

1. **Referencia aproximada anual** (ej. "la usura ronda 28-30% anual, verifica en la SFC"): conserva la señal de protección al consumidor, sin exactitud trimestral.
2. **Eliminar la referencia por completo:** menos código, cero mantenimiento; se pierde la señal de "tu tasa es abusiva". **Opción elegida.**
3. **Congelar el valor y suavizar el copy:** el número queda fijo y envejece.

---

## Decisión

**Se elimina por completo el concepto de tasa de usura del producto.** La regla 12 del ADN se refina a: "Constantes legales con fecha de revisión: SMMLV, UVT y auxilio de transporte (anuales). Indicadores de alta frecuencia (ej. usura trimestral) quedan fuera del alcance por costo de mantenimiento."

Se elimina:

- `USURA_POR_PERIODO` (tabla) y `tasaUsuraVigente()` en `constants.js`.
- Exports `TASA_USURA`, `PERIODO_USURA` y el alias deprecado `TASA_USURA_Q2_2026`.
- `clasificarTasaCredito()` en `financiero.js` y su bloque de tests.
- El hint de usura en el formulario de deuda con entidad, reemplazado por una guía neutral sobre dónde encontrar la tasa EA.

---

## Justificación

### 1. Costo de mantenimiento desproporcionado

Cuatro actualizaciones al año para alimentar un solo hint informativo. El resto del valor (el clasificador) ni siquiera se mostraba en la app.

### 2. Riesgo de información incorrecta

Sin actualización puntual, el fallback mostraba la última tasa conocida etiquetada como vigente: una constante legal silenciosamente vieja, justo lo que la regla 12 buscaba evitar.

### 3. El producto se enfoca en lo administrable

Los indicadores que quedan (SMMLV, UVT, auxilio anuales; GMF y aportes estables) se revisan una vez al año o nunca. La app sigue siendo útil y fácil de mantener.

---

## Consecuencias

### Positivas

- Cero mantenimiento trimestral.
- Imposible mostrar una tasa de usura desactualizada (ya no existe).
- Menos código y superficie de constantes legales.

### Negativas / Restricciones

- Se pierde la señal de "tu tasa de crédito podría ser abusiva" en el formulario de deuda con entidad.
  - *Mitigación:* el campo conserva un hint neutral que orienta dónde encontrar la tasa EA. El usuario que sospeche de una tasa abusiva puede consultar la SFC directamente.
- La regla 12 de `CLAUDE.md` se actualiza para reflejar el nuevo alcance.
- `clasificarTasaCredito()` se elimina; si en el futuro se quisiera una señal de tasa abusiva, se reintroduciría contra una referencia estable (anual o aproximada), no trimestral.
