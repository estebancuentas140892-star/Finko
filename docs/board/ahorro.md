# Tablero - Ahorro

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `ahorro`, casa de Ahorro + fondo de emergencia). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

### Ahorro (dominio `ahorro`, casa de Ahorro + fondo de emergencia)

#### AH.7a - Ahorro sube a la barra inferior, Calendario baja a "Más"
- Prioridad  : media
- Estado     : requiere ADR nuevo (**supersede el D1 del [ADR 024](../DECISIONS/024-reorganizacion-navegacion-movil.md)**, decisión de Esteban tomada el 2026-07-31 tras el triaje de AH.7)
- Área       : ambos
- Objetivo   : la barra inferior pasa de `Inicio · Gastos · [+] · Calendario · Más` a `Inicio · Gastos · [+] · Ahorro · Más`; Calendario se muda a teja dentro de "Más".
- Riesgo     : toca la navegación global; coordinar con **INT.1** (barra superior de escritorio) e **IN.9** (Inicio en escritorio), en curso sobre la misma franja aunque en otra plataforma, para no pisarse
- Secciones  : Navegación (bottom nav), Ahorro, Calendario, Más
- Archivos   : `index.html` (nav), ruteo en `modules/infra/`, `styles/components/` (nav), `tests/e2e/`
- Depende de : nada duro; coordinar con INT.1/IN.9
- Aceptación : captura móvil con Ahorro en la barra + Calendario dentro de "Más" + E2E de navegación verde
- Modelo     : Alta capacidad - Alto (nav global, revierte un ADR vigente)

#### AH.5 - Fondo v2: rediseño UX educativo del hero (D2 + D3)
- Prioridad  : media
- Área       : design (D2 y D3 son rediseño visual; ya no queda código sin mockup)
- Estado     : pendiente de análisis (no iniciar sin decidir el handoff, mismo dilema que enfrentó MC.13e-2g: mockup de Claude Design o Sonnet/Opus sin mockup). Alcance y las 4 decisiones: **[ADR 049](../DECISIONS/049-fondo-de-emergencia-v2.md)**, su dueño. **AH.5a y AH.5b cerradas** (ver CHANGELOG): D1 (aporte por distribución) y D4 (compromiso por frecuencia real) ya en producción.
- Objetivo   : D3, la sección comunica protección (qué es, por qué importa, cuándo se usa) antes que cifras; D2, el peso visual del registro directo baja al de una acción secundaria, exacto cuánto se decide con la pantalla rediseñada a la vista.
- Secciones  : Ahorro (fondo)
- Archivos   : `modules/dominio/ahorro/view.js` (rediseño del hero `_renderFondoCard`), CSS nuevo si hay mockup
- Depende de : nada duro (el motor de MC.13 y IV.2 ya están en producción)
- Modelo     : si hay handoff, Equilibrado - Alto (implementación de mockup); si no, Alta capacidad - Alto (diseño + implementación sin mockup)
