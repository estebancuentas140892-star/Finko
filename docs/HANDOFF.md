# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-21. Última tarea cerrada: ficha 11 de MOV.1, el compromiso del Fondo en la primera pantalla (ADR 084).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4508/4514 (2026-08-21). Los 6 rojos son **BUG-028**, ajeno |
| Tests E2E | 300/300 verdes, sello de la ficha 11 (2026-08-21). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v43 (`config.respaldoCifrado`, CFG.4c; migración no-op) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **3**: BUG-025 (impacto en el uso diario), BUG-027 (documental) y BUG-028 (el aviso de compromiso próximo ignora el `hoyISO` inyectado; ya son 6 tests rojos y crece con el calendario) |

---

## 2. Últimas 5 tareas cerradas

**MOV.1 ficha 11 - El compromiso del Fondo, en la primera pantalla, 2026-08-21**
Undecima de las 25 entregas, con [ADR 084](DECISIONS/084-fondo-el-compromiso-del-periodo-en-la-primera-pantalla.md). El defecto estaba escrito en el codigo: el comentario del carril declara el compromiso del mes "lo unico de esta pagina que hoy exige bajar un pliegue" y lo resuelve solo desde 1680px, o sea que en un telefono seguia entero. El medidor sube al pie de la tarjeta (cierra en 596px con la barra en 721), el pie de la franja suelta el monto repetido y el estado sin gastos fijos pasa a bloqueo con enlace. **E2 se descarto**: revertia el ADR 049 D2, que sigue vigente. SW v577.

**MOV.1 ficha 10 - Reservas usa el orden que ya tenia escrito, 2026-08-21**
Decima de las 25 entregas, con [ADR 083](DECISIONS/083-reservas-el-orden-que-el-dominio-ya-tenia-escrito.md). La evidencia mas fuerte de la serie: la doc del aviso de proximidad declaraba "con la lista ordenada por urgencia, el primero es el que apura", y la lista era un `filter` sin `sort`. Cuatro grupos con divisor, con el mismo umbral que cuenta el aviso, y el orden lo aporta la pieza de infra de la ficha 09. La reserva ya reunida baja de 307px a 62 conservando su boton y subiendo al principio, al contrario que la meta cumplida. El comparador no se toca y se reordena solo. R89 se parte en R89a y R89b. SW v576.

**MOV.1 ficha 09 - La lista de Metas gana cabeza y orden, 2026-08-21**
Novena de las 25 entregas, con [ADR 082](DECISIONS/082-metas-cabeza-orden-y-un-final-que-pesa-poco.md). Primera ficha donde la pieza principal se audita y no se toca: DIS.14 y DIS.19 quedan enteras. La lista salia en orden de creacion y, como a 390px cabe tarjeta y media, ese orden era la respuesta al azar a "a cual le aporto": ahora manda la fecha limite, con las metas sin plazo al final. Gana una franja con lo reunido y su alcance declarado, y la meta cumplida baja de 290px a 54. El picker de Registrar adopta el orden de la lista, con el comparador en `infra/bolsas.js`. SW v575.

**MOV.1 ficha 08 - Calendario mide el mes entero, entradas incluidas, 2026-08-21**
Octava de las 25 entregas, con [ADR 081](DECISIONS/081-calendario-la-forma-del-mes-entradas-incluidas.md), que **supera el ADR 037** en la mitad del hero. La seccion media la mitad de lo que dibuja: el hero sumaba solo salidas y la grilla pintaba tambien los ingresos. `flujoDelMes()` mide las dos direcciones. El detalle del dia deja de administrar y, para no perder el pago de un mes pasado, "Por pagar" toma su mes del reloj del bloque. SW v574.

**MOV.1 ficha 07 - El bloque Gastos gana su anatomía, 2026-08-20**
Séptima de las 25 entregas; sus decisiones entran al [ADR 069](DECISIONS/069-bloque-gastos-en-la-barra-movil.md) como **D8**. El bloque gana un **solo reloj** para las tres lentes (antes eran tres) y el hero **declara lo que su total no cuenta** ("+ $X en fijos y deudas", R82). Cada tope sale a los movimientos que lo forman. G2 queda acotado para la ficha 12. SW v573.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En proceso:** **auditoría UX/UI móvil de Claude Design, 25 entregas**. Cerradas 01 a 11 (ADR 069, 080, 081, [082](DECISIONS/082-metas-cabeza-orden-y-un-final-que-pesa-poco.md), [083](DECISIONS/083-reservas-el-orden-que-el-dominio-ya-tenia-escrito.md) y [084](DECISIONS/084-fondo-el-compromiso-del-periodo-en-la-primera-pantalla.md)); sigue la 12, Limites de gasto. El orden lo fijó Esteban y no se altera. La migración a IndexedDB **ya no es tarjeta** ([ADR 068](DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md), fuente única). El resto de las iniciativas de esta fase (CFG, LIM, PA, PERF, MT, PE, ANL, AH, CAT, GAS, LG) cerró completo: el detalle de cada una está en [`CHANGELOG.md`](CHANGELOG.md), que es su dueño. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
