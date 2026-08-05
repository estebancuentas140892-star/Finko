# Tablero - Me deben

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `personales`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

### Me deben (dominio `personales`)

#### PE.6 - Me deben v2: rendimiento, estados visuales y confianza
- Prioridad  : media-alta
- Estado     : en curso. Alcance y las 6 decisiones: **[ADR 047](../DECISIONS/047-me-deben-v2-intereses-e-historial.md)**, su dueño.
- Objetivo   : que la sección deje de ser un registro y pase a seguimiento: rendimiento del préstamo y estadísticas por persona, ambos derivados del historial.
- Secciones  : Me deben (`personales`)
- Archivos   : `modules/dominio/personales/logic.js`, `personales/view.js`
- Depende de : PE.6d espera a IV.2 en producción (ADR 047, punto 2 de "Qué falta para cerrarlo")
- Riesgo     : D5 exige copy que describa, no que califique a la persona; nada de scores ni semáforos de reputación
- Modelo     : Alta capacidad - Medio (las tres rebanadas son derivadas puras sobre `abonos[]`)
- Rebanadas  : PE.6c rendimiento, PE.6d estados visuales, PE.6e confianza
