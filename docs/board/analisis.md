# Tablero - Análisis

> Revisado: 2026-11-18.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `analisis`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

### Análisis (dominio `analisis`)

> **Iniciativa ANA.1 - Análisis en dos lentes** ([ADR 176](../DECISIONS/176-analisis-en-dos-lentes.md), aceptada 2026-11-18, tablero "Finko · Rediseño de Análisis"). Fuente única del rediseño bajo 1024px: Tus gastos por periodo y Tu situación de hoy. Reabre el ADR 090 D4 y reemplaza el 046 D4 y el 134 D7. **Una idea sobre Análisis en el teléfono se integra acá, no abre tarjeta suelta.** El escritorio (ADR 078) queda en ANA.2.

#### ANA.1b - Tus gastos por periodo
- Prioridad  : alta
- Estado     : pendiente
- Área       : ambos
- Objetivo   : ADR 176 D2 a D5 y D7: Día, Semana, Mes y Año con flechas, el encabezado con su gráfica, la comparación a la misma altura (también la pastilla del escritorio), "En qué gastas" con la barra de la parte y el periodo sin gastos con Tino
- Riesgo     : la semana de lunes a domingo y los cortes de mes con días distintos (31 contra 30, febrero)
- Secciones  : Análisis
- Archivos   : `modules/dominio/analisis/logic.js`, `telefono.js`, `view.js`, `index.js`, `index.html`, `styles/components/analysis.css`, `styles/identidad.css`
- Depende de : nada
- Aceptación : unitarias de rangos y cortes; a 390px los cuatro periodos y un día sin gastos
- Modelo     : capacidad alta, esfuerzo alto

#### ANA.1c - Lo que Finko encontró
- Prioridad  : alta
- Estado     : pendiente
- Área       : ambos
- Objetivo   : ADR 176 D6 y D7: hasta tres hallazgos por periodo, ordenados por dinero, con Tino con lupa; "Ver cuáles" abre la hoja de la hormiga; sale "Más detalle de tus gastos" del teléfono
- Riesgo     : anunciar una bajada a mitad de periodo
- Secciones  : Análisis (teléfono)
- Archivos   : `modules/dominio/analisis/logic.js`, `telefono.js`, `index.js`, `styles/components/analysis.css`
- Depende de : ANA.1b
- Aceptación : unitarias: tope de tres, orden por dinero, sin bajadas a mitad de periodo; sin hallazgos no hay bloque
- Modelo     : capacidad alta, esfuerzo medio

#### ANA.1d - El detalle de una categoría
- Prioridad  : alta
- Estado     : pendiente
- Área       : ambos
- Objetivo   : ADR 176 D8: la pantalla de la categoría con su comparación, su límite, sus subcategorías, sus seis meses y sus gastos más grandes, con la salida a Movimientos
- Riesgo     : los gastos anteriores a la v52 sin subcategoría ("Sin detalle")
- Secciones  : Análisis (teléfono)
- Archivos   : `modules/dominio/analisis/logic.js`, `telefono.js`, `index.js`, `styles/components/analysis.css`
- Depende de : ANA.1b
- Aceptación : a 390px, tocar una categoría abre su detalle y "‹ Análisis" vuelve al mismo periodo
- Modelo     : capacidad alta, esfuerzo medio

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
