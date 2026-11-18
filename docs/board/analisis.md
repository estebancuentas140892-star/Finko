# Tablero - Análisis

> Revisado: 2026-11-18.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `analisis`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

### Análisis (dominio `analisis`)

> **Iniciativa ANA.1 - Análisis en dos lentes** ([ADR 176](../DECISIONS/176-analisis-en-dos-lentes.md), aceptada 2026-11-18, tablero "Finko · Rediseño de Análisis"). **Completa en el teléfono** (ANA.1a a 1d, 2026-11-18); el tablero de diseño se aplicó y se borró. Fuente única del rediseño bajo 1024px: Tus gastos por periodo y Tu situación de hoy. Reabre el ADR 090 D4 y reemplaza el 046 D4 y el 134 D7. **Una idea sobre Análisis en el teléfono se integra acá, no abre tarjeta suelta.** El escritorio (ADR 078) queda en ANA.2.

#### ANA.2 - El escritorio con la estructura del teléfono
- Prioridad  : baja
- Estado     : no iniciar
- Área       : design
- Objetivo   : ADR 176 D10: las dos filas de dos del ADR 078 se rediseñan con las dos lentes; salen el anillo, la barra de composición, máximo y mínimo y la dona
- Riesgo     : -
- Secciones  : Análisis (escritorio)
- Archivos   : `modules/dominio/analisis/view.js`, `styles/responsive.css`
- Depende de : ANA.1 completa y un tablero de escritorio
- Aceptación : captura a 1440px
- Modelo     : capacidad alta, esfuerzo medio
