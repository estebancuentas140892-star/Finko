# Tablero - Ahorro

> Revisado: 2026-08-11.

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
