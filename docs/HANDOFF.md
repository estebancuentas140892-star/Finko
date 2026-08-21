# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-21. Última tarea cerrada: ficha 08 de MOV.1, Calendario mide el mes entero (ADR 081).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4490/4496 (2026-08-21). Los 6 rojos son **BUG-028**, ajeno |
| Tests E2E | 294/294 verdes, sello de la ficha 08 (2026-08-21). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v43 (`config.respaldoCifrado`, CFG.4c; migración no-op) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **3**: BUG-025 (impacto en el uso diario), BUG-027 (documental) y BUG-028 (el aviso de compromiso próximo ignora el `hoyISO` inyectado; ya son 6 tests rojos y crece con el calendario) |

---

## 2. Últimas 5 tareas cerradas

**MOV.1 ficha 08 - Calendario mide el mes entero, entradas incluidas, 2026-08-21**
Octava de las 25 entregas, con [ADR 081](DECISIONS/081-calendario-la-forma-del-mes-entradas-incluidas.md), que **supera el ADR 037** en la mitad del hero y **acota su D5**. La seccion media la mitad de lo que dibuja: el hero sumaba solo salidas mientras la grilla pintaba los ingresos. `flujoDelMes()` mide las dos direcciones y el hero pasa a "Te queda en agosto". El detalle del dia deja de administrar (cuatro acciones a una salida prefiltrada) y para no perder el pago de un mes pasado, "Por pagar" toma su mes del reloj del bloque. La suite E2E destapo un defecto de la propia ficha: pagar un fijo dejaba la fila con su boton puesto. SW v574.

**MOV.1 ficha 07 - El bloque Gastos gana su anatomía, 2026-08-20**
Séptima de las 25 entregas; sus decisiones entran al [ADR 069](DECISIONS/069-bloque-gastos-en-la-barra-movil.md) como **D8**. El bloque gana encabezado propio con **un solo reloj** para las tres lentes (G4: antes eran tres y saltar de pestaña cambiaba el mes sin avisar), la portada se llama "Día a día" y el hero **declara lo que su total no cuenta** ("+ $X en fijos y deudas", G1/R82) en vez de contradecir el nombre del bloque. Cada tope sale a los movimientos que lo forman con el filtro puesto, para lo cual Movimientos gana su quinto filtro, la categoría (G5). G2 queda acotado para la ficha 12 y Movimientos se queda en "Más" (G3). De paso se escribieron el D7 y el D8 del ADR 069, que 21 comentarios citaban sin que existieran. SW v573.

**MOV.1 ficha 06 - Mis cuentas: un primario y lo informativo al pie, 2026-08-20**
Sexta de las 25 entregas, con [ADR 080](DECISIONS/080-mis-cuentas-un-primario-y-lo-informativo-al-pie.md), que **acota el ADR 075** en D1 y D5. Las nueve puertas resuelven en negativo el disparador de la ficha 03: no entra a la barra. Lo de solo lectura baja a una banda al pie (escritorio conserva sus columnas: `span 7` / `span 5` / `span 12`), queda un solo primario con dos atajos declarados de Registrar (R87), las salidas de Límites abren el asistente y la tarjeta de crédito sale a Por pagar prefiltrada a su deuda. Obligó a construir los cuatro chips de la lente que la ficha 05 dejó sin hacer. SW v572.

**MOV.20a - "Tu progreso" cuenta lo que se ve (Logros), 2026-08-20**
Decía "de 18" con 12 tarjetas debajo. `conteoVitrina()` nueva, numerador y denominador del mismo conjunto; `nivelUsuario()` sigue sobre el conteo crudo. R86 en el `hint` de "Planificador". R91 **anulada**: LG.2e ya bajó ese tramo a 16 sobre 18. SW v571.

**DSK.1 completa - Inicio como centro de atención en escritorio (Inicio), 2026-08-20**
Cuatro rebanadas del [ADR 070](DECISIONS/070-inicio-centro-de-atencion-en-escritorio.md), todas cerradas. Escritorio deja de ser el reparto de móvil estirado: salen los módulos que no avisan, saldo y cuentas se funden en una banda, las obligaciones se leen en una línea de tiempo y "Atención hoy" deja de ser un mosaico 2x2. Con un mes cargado, cabe en el pliegue sin desplazar. SW v570.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En proceso:** **auditoría UX/UI móvil de Claude Design, 25 entregas**. Cerradas 01 a 08 (ADR [069](DECISIONS/069-bloque-gastos-en-la-barra-movil.md), [080](DECISIONS/080-mis-cuentas-un-primario-y-lo-informativo-al-pie.md) y [081](DECISIONS/081-calendario-la-forma-del-mes-entradas-incluidas.md)); sigue la 09. El orden lo fijó Esteban y no se altera. La migración a IndexedDB **ya no es tarjeta** ([ADR 068](DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md), fuente única). El resto de las iniciativas de esta fase (CFG, LIM, PA, PERF, MT, PE, ANL, AH, CAT, GAS, LG) cerró completo: el detalle de cada una está en [`CHANGELOG.md`](CHANGELOG.md), que es su dueño. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
