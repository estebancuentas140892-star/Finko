# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-07-31. Última tarea cerrada: MC.13e-2d, cuota del periodo en las filas de ahorro, no el objetivo total.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 3533/3533 verdes |
| Tests E2E | 246/247 verdes (corrida del 2026-07-31). La falla es preexistente y no relacionada a MC.13e-2d: locator duplicado en `#hero-guia-saldo`, de un cambio de otra sesión sin commitear en `index.html`. **Es compuerta** desde el 2026-07-30: el hook de pre-commit exige el sello de una corrida verde cuando el diff toca runtime |
| Schema version (`localStorage`) | v28 |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **2**, ninguno con impacto en el uso diario (uno de copy, uno de la propia suite E2E): ver [BUGS.md](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**AH.7b - "Apartados" se renombra a "Reservas" en todo el copy visible, 2026-07-31**
Decisión de Esteban tras el triaje del pendiente 3 de DIS.18 ([ADR 056](DECISIONS/056-la-casa-de-ahorro.md)): el nombre colisionaba con "apartar". Alcance acotado a copy (nav, título, botones, formularios, anuncios, banner de propósito y referencias cruzadas): el dominio interno, `S.apartados` e ids no cambian. AH.7 se partió en dos; **AH.7a** (Ahorro sube a la barra inferior, Calendario a "Más") sigue pendiente, requiere ADR nuevo por revertir el D1 del [ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md).

**PERF.8 - columna "arranque" en el harness + limpieza de CSS muerto, 2026-07-31**
El harness ya cronometraba la escritura (`stringify`, `save`) pero nunca el camino de vuelta. La columna nueva mide `loadData()` real (`JSON.parse` + las migraciones) sobre el mismo payload: **0,6 / 2,6 / 5,1 ms** de mediana a 1.000 / 5.000 / 10.000 gastos. Es el dato que el [ADR 030](DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md) D4 pedía para disparar PERF.5 con evidencia: crece lineal y **hoy no lo dispara**. De paso, 42 líneas de CSS sin una sola referencia (`.bento__cell--glass`, `.skeleton`, `.spinner` y sus keyframes huérfanos).

**CAT.3 - modelo de las categorías personalizadas globales decidido, 2026-07-31**
**[ADR 058](DECISIONS/058-categorias-personalizadas-globales.md)**, 5 decisiones sobre un mapeo del código: la sección es un **campo** del objeto (`seccion: 'gasto' | 'fijo'`, bump v29), ofrecer filtra por sección y resolver la ignora. El mapeo bajó el alcance de la tarjeta: gráficos, CSV y 8 de 9 filtros ya funcionan, y **no existe ningún mapa categoría-color** en el repo. **Defecto preexistente que entra:** 3 superficies ya pintan `c-otros` una personalizada de Gastos (`presupuesto/view.js:492`, `:742`, `resumen/view.js:119`). Cuatro rebanadas, ninguna iniciada.

**DOC.1 movimiento 5 - `HANDOFF.md` a 6 KB con línea de contrato, 2026-07-31**
Punto 5 de la Fase 4 de la reorganización documental: 12,95 a 4,3 KB. Los 8 bloques que salen (identidad, runbook de E.2-2027, workflow, arquitectura, comandos, el párrafo de 40 tareas) se verificaron en su dueño antes de borrarse. La cabecera imprime el contrato para que no vuelva a crecer, y el paso 3 de la skill `cerrar-tarea` deja de reconstruir el párrafo purgado. **Falta el punto 6 para cerrar la Fase 4:** `BOARD.md` en 80 KB contra un techo de 40.

**CAT.4 - auditoría de consistencia de formularios, 2026-07-31**
Las 2 reglas transversales (categoría/tipo antes que descripción; fecha por defecto = hoy al crear) ya se cumplían en los ~8 formularios en alcance. Cierra sin cambios de código. `fechaObjetivo` (Apartados) y `fechaLimite` (Metas) quedan fuera: son fecha meta futura, no fecha de registro.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
