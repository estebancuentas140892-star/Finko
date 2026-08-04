# Tablero - Me deben

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `personales`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

### Me deben (dominio `personales`)

#### PE.6 - Me deben v2: intereses acumulados, historial de abonos, rendimiento y confianza
- Prioridad  : media-alta
- Estado     : pendiente de análisis (no iniciar). Alcance y las 6 decisiones: **[ADR 047](../DECISIONS/047-me-deben-v2-intereses-e-historial.md)**, su dueño.
- Objetivo   : que la sección deje de ser un registro y pase a seguimiento: total sugerido con intereses al cobrar, historial de abonos, rendimiento y estadísticas por persona.
- Secciones  : Me deben (`personales`)
- Archivos   : `modules/dominio/personales/logic.js`, `state.js`/`storage.js` (historial, bump), `personales/view.js`
- Depende de : nada duro; el punto 7 conviene tras IV.2
- Riesgo     : el bump de schema toca préstamos ya existentes en dispositivos reales; la migración debe conservar el acumulado `pagado` (ADR 047 D3)
- Modelo     : Alta capacidad - Alto (intereses acumulados con pagos parciales; el resto de rebanadas puede bajar)
- Rebanadas  : PE.6a intereses+desglose, PE.6b historial+schema, PE.6c rendimiento, PE.6d estados visuales, PE.6e confianza
