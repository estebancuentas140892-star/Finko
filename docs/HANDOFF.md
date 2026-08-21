# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-21. Última tarea cerrada: MOV.1 ficha 14, Me deben ordena por urgencia y la dirección se lee sin color.

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

**MOV.1 ficha 14 - Me deben ordena por urgencia y la direccion se lee sin color, 2026-08-21**
Tres cambios, cero tokens nuevos ([ADR 088](DECISIONS/088-me-deben-urgencia-de-cobro-y-direccion-con-forma.md)). La lista deja de ordenarse por antiguedad del desembolso y pasa a cuatro grupos de urgencia de cobro, con el clasificador que ya existia y alimentaba solo al chip. El prestamo sin cuenta vinculada declara en ambar que es solo seguimiento: no suma al patrimonio. Y en las dos tarjetas de obligaciones la direccion del dinero se lee con **forma**, flecha y signo, que sobreviven al gris. Candidata R90 con cautela: las fichas 15 y 16 deciden su alcance. Avance MOV.1: **14 de 25**. SW v583.

**ADR 087 - Inicio en movil tambien avisa y no resume, 2026-08-21**
El ADR 070 D2 retiro tres modulos de Inicio en escritorio y escribio "los tres siguen enteros en movil". De sus tres argumentos **solo uno era de ancho**: el resumen semanal es tendencia y la actividad reciente cuenta el pasado, y eso vale igual en un telefono. Salen del DOM los dos; Accesos rapidos se queda porque en movil no hay barra lateral. Nada pierde funcion: Movimientos esta en "Mas" y la tendencia tiene casa en Analisis. Inicio movil pasa de cinco bloques a tres. SW v582.

**MOV.1 ficha 13 - La etapa de Inversion se nombra, 2026-08-21**
Decimotercera de las 25 entregas, con [ADR 086](DECISIONS/086-inversion-la-etapa-se-nombra-y-el-consejo-es-el-boton.md). La cabecera decia "Momento N de 3" y ese 3 era inalcanzable: el numero sale de `etapaDePortafolio()`, que devuelve 1 o 2 y nunca mas. Ahora nombra la etapa y el chip dice de que esta hecha. Y el vacio hereda la jerarquia del momento 1: sin fondo, el primario lleva al Fondo, porque la app era mas prudente despues de invertir que antes. Con esto cierran la casa Ahorro y sus cuatro hijas. SW v581.

**MOV.1 ficha 12 - La lente de Limites contiene limites, 2026-08-21**
Duodecima de las 25 entregas, con [ADR 085](DECISIONS/085-limites-la-lente-contiene-limites.md), que **acota el ADR 077 D1 y D4**. Dos de las tres tarjetas eran vistas de solo lectura de "Por pagar" y del bloque Ahorro: el filtro de Necesidades es la definicion literal de la lente hermana. El argumento que cierra G2 es el trato asimetrico del ADR 019: de las tres tarjetas, exactamente una se comportaba como un limite. Los topes pasan a ser la lente y el plan a una franja de tres lineas con salida (192px contra ~360). Y dejan de caerse cuando no hay ingreso registrado. SW v579.

**Inicio en movil: el resumen semanal empujaba todas las tarjetas fuera del viewport, 2026-08-21**
Reportado dos veces como "volvimos a una version antigua". No era la cache: `.resumen-semana__header` es un flex sin `flex-wrap` con un chip `nowrap` que no encoge, asi que con "Sin semana previa para comparar" pedia 415px de min-content. El bento movil es `1fr`, y un track `1fr` no baja del min-content de su item mas ancho: **las cinco celdas** se iban a 415 en un viewport de 391. De 75 elementos desbordados a 0. Dos guardias E2E nuevos. SW v580.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En proceso:** **auditoría UX/UI móvil de Claude Design, 25 entregas**. Cerradas 01 a 13 (ADR 069, 080, 081, 082, 083, 084, [085](DECISIONS/085-limites-la-lente-contiene-limites.md) y [086](DECISIONS/086-inversion-la-etapa-se-nombra-y-el-consejo-es-el-boton.md)); **la casa Ahorro y sus cuatro hijas quedan cerradas**; sigue la 14, Me deben. El orden lo fijó Esteban y no se altera. La migración a IndexedDB **ya no es tarjeta** ([ADR 068](DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md), fuente única). El resto de las iniciativas de esta fase (CFG, LIM, PA, PERF, MT, PE, ANL, AH, CAT, GAS, LG) cerró completo: el detalle de cada una está en [`CHANGELOG.md`](CHANGELOG.md), que es su dueño. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
