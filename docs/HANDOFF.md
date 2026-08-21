# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-21. Última tarea cerrada: ficha 13 de MOV.1, la etapa de Inversión se nombra (ADR 086).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4537/4543 (2026-08-21). Los 6 rojos son **BUG-028**, ajeno |
| Tests E2E | 302/302 verdes, sello de la ficha 13 (2026-08-21). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v43 (`config.respaldoCifrado`, CFG.4c; migración no-op) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **3**: BUG-025 (impacto en el uso diario), BUG-027 (documental) y BUG-028 (el aviso de compromiso próximo ignora el `hoyISO` inyectado; ya son 6 tests rojos y crece con el calendario) |

---

## 2. Últimas 5 tareas cerradas

**MOV.1 ficha 13 - La etapa de Inversion se nombra, 2026-08-21**
Decimotercera de las 25 entregas, con [ADR 086](DECISIONS/086-inversion-la-etapa-se-nombra-y-el-consejo-es-el-boton.md). La cabecera decia "Momento N de 3" y ese 3 era inalcanzable: el numero sale de `etapaDePortafolio()`, que devuelve 1 o 2 y nunca mas. Ahora nombra la etapa y el chip dice de que esta hecha. Y el vacio hereda la jerarquia del momento 1: sin fondo, el primario lleva al Fondo, porque la app era mas prudente despues de invertir que antes. Con esto cierran la casa Ahorro y sus cuatro hijas. SW v581.

**MOV.1 ficha 12 - La lente de Limites contiene limites, 2026-08-21**
Duodecima de las 25 entregas, con [ADR 085](DECISIONS/085-limites-la-lente-contiene-limites.md), que **acota el ADR 077 D1 y D4**. Dos de las tres tarjetas eran vistas de solo lectura de "Por pagar" y del bloque Ahorro: el filtro de Necesidades es la definicion literal de la lente hermana. El argumento que cierra G2 es el trato asimetrico del ADR 019: de las tres tarjetas, exactamente una se comportaba como un limite. Los topes pasan a ser la lente y el plan a una franja de tres lineas con salida (192px contra ~360). Y dejan de caerse cuando no hay ingreso registrado. SW v579.

**MOV.1 ficha 11 - El compromiso del Fondo, en la primera pantalla, 2026-08-21**
Undecima de las 25 entregas, con [ADR 084](DECISIONS/084-fondo-el-compromiso-del-periodo-en-la-primera-pantalla.md). El defecto estaba escrito en el codigo: el comentario del carril declara el compromiso del mes "lo unico de esta pagina que hoy exige bajar un pliegue" y lo resuelve solo desde 1680px, o sea que en un telefono seguia entero. El medidor sube al pie de la tarjeta (cierra en 596px con la barra en 721), el pie de la franja suelta el monto repetido y el estado sin gastos fijos pasa a bloqueo con enlace. **E2 se descarto**: revertia el ADR 049 D2, que sigue vigente. SW v577.

**Inicio en movil: el resumen semanal empujaba todas las tarjetas fuera del viewport, 2026-08-21**
Reportado dos veces como "volvimos a una version antigua". No era la cache: `.resumen-semana__header` es un flex sin `flex-wrap` con un chip `nowrap` que no encoge, asi que con "Sin semana previa para comparar" pedia 415px de min-content. El bento movil es `1fr`, y un track `1fr` no baja del min-content de su item mas ancho: **las cinco celdas** se iban a 415 en un viewport de 391. De 75 elementos desbordados a 0. Dos guardias E2E nuevos. SW v580.

**MOV.1 ficha 10 - Reservas usa el orden que ya tenia escrito, 2026-08-21**
Con [ADR 083](DECISIONS/083-reservas-el-orden-que-el-dominio-ya-tenia-escrito.md). La doc del aviso de proximidad declaraba "con la lista ordenada por urgencia, el primero es el que apura", y la lista era un `filter` sin `sort`. Cuatro grupos con divisor, con el mismo umbral que cuenta el aviso. La reserva ya reunida baja de 307px a 62 conservando su boton. SW v576.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En proceso:** **auditoría UX/UI móvil de Claude Design, 25 entregas**. Cerradas 01 a 13 (ADR 069, 080, 081, 082, 083, 084, [085](DECISIONS/085-limites-la-lente-contiene-limites.md) y [086](DECISIONS/086-inversion-la-etapa-se-nombra-y-el-consejo-es-el-boton.md)); **la casa Ahorro y sus cuatro hijas quedan cerradas**; sigue la 14, Me deben. El orden lo fijó Esteban y no se altera. La migración a IndexedDB **ya no es tarjeta** ([ADR 068](DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md), fuente única). El resto de las iniciativas de esta fase (CFG, LIM, PA, PERF, MT, PE, ANL, AH, CAT, GAS, LG) cerró completo: el detalle de cada una está en [`CHANGELOG.md`](CHANGELOG.md), que es su dueño. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
