# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-21. Última tarea cerrada: MOV.1 ficha 16, Análisis sale prefiltrado y R88 encuentra su segundo caso.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4524/4530 (2026-08-21). Los 6 rojos son **BUG-028**, ajeno |
| Tests E2E | 301/301 verdes (2026-08-21). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v43 (`config.respaldoCifrado`, CFG.4c; migración no-op) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **3**: BUG-025 (impacto en el uso diario), BUG-027 (documental) y BUG-028 (el aviso de compromiso próximo ignora el `hoyISO` inyectado; ya son 6 tests rojos y crece con el calendario) |

---

## 2. Últimas 5 tareas cerradas

**MOV.1 ficha 16 - Analisis: la salida prefiltrada y cinco veredictos, 2026-08-21**
Llego con **dos de sus tres hallazgos ya cerrados** por ANL.3 el 2026-08-11, verificado antes de tocar nada (segundo caso tras INT.1g). Faltaba medio Z3: el aviso de deudas sin saldo decia "Por pagar" pero enlazaba pelado, y ahora sale **prefiltrado** con el chip Deudas ([ADR 090](DECISIONS/090-analisis-cada-bloque-declara-su-alcance.md)). Los otros cuatro veredictos son documentacion: **R88 gana su segundo caso** y va a la 18 lista para confirmar; **R90 se acota** y no llega aca (activos y pasivos son stocks, no flujos); los tres grupos **no** se mudan, porque Analisis esta clavado a `hoy()`; el monitor de renta queda sin auditar. Avance MOV.1: **16 de 25**. SW v585.

**MOV.1 ficha 15 - Movimientos: la quinta fuente y cuatro puertas, 2026-08-21**
Cuatro cambios ([ADR 089](DECISIONS/089-movimientos-la-quinta-fuente-y-cuatro-puertas.md)). La seccion se confirma en "Consultar" con evidencia: es el unico buscador de la app y responde cuatro preguntas que ninguna otra vista responde. El ledger pasa de **4 a 5 de las 7 fuentes** que mueven dinero: los abonos recibidos tenian fecha y cuenta desde el v34 y no salian en ninguna vista cronologica. El rango de fechas se pliega (256px a 160px), Gastos y Mis cuentas ganan salida prefiltrada, y el confirm del borrado nombra la reversa. R90 confirmada y acotada a tres estados. Avance MOV.1: **15 de 25**. SW v584.

**MOV.1 ficha 14 - Me deben ordena por urgencia y la direccion se lee sin color, 2026-08-21**
Tres cambios, cero tokens nuevos ([ADR 088](DECISIONS/088-me-deben-urgencia-de-cobro-y-direccion-con-forma.md)). La lista deja de ordenarse por antiguedad del desembolso y pasa a cuatro grupos de urgencia de cobro, con el clasificador que ya existia y alimentaba solo al chip. El prestamo sin cuenta vinculada declara en ambar que es solo seguimiento: no suma al patrimonio. Y en las dos tarjetas de obligaciones la direccion del dinero se lee con **forma**, flecha y signo, que sobreviven al gris. Candidata R90 con cautela: las fichas 15 y 16 deciden su alcance. Avance MOV.1: **14 de 25**. SW v583.

**ADR 087 - Inicio en movil tambien avisa y no resume, 2026-08-21**
El ADR 070 D2 retiro tres modulos de Inicio en escritorio y escribio "los tres siguen enteros en movil". De sus tres argumentos **solo uno era de ancho**: el resumen semanal es tendencia y la actividad reciente cuenta el pasado, y eso vale igual en un telefono. Salen del DOM los dos; Accesos rapidos se queda porque en movil no hay barra lateral. Nada pierde funcion: Movimientos esta en "Mas" y la tendencia tiene casa en Analisis. Inicio movil pasa de cinco bloques a tres. SW v582.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En proceso:** **auditoría UX/UI móvil de Claude Design, 25 entregas**. Cerradas 01 a 13 (ADR 069, 080, 081, 082, 083, 084, [085](DECISIONS/085-limites-la-lente-contiene-limites.md) y [086](DECISIONS/086-inversion-la-etapa-se-nombra-y-el-consejo-es-el-boton.md)); **la casa Ahorro y sus cuatro hijas quedan cerradas**; sigue la 14, Me deben. El orden lo fijó Esteban y no se altera. La migración a IndexedDB **ya no es tarjeta** ([ADR 068](DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md), fuente única). El resto de las iniciativas de esta fase (CFG, LIM, PA, PERF, MT, PE, ANL, AH, CAT, GAS, LG) cerró completo: el detalle de cada una está en [`CHANGELOG.md`](CHANGELOG.md), que es su dueño. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
