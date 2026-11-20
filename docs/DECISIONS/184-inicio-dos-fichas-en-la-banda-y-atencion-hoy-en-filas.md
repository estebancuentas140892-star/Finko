# ADR 184 - Inicio en el teléfono: dos fichas en la banda y "Atención hoy" en filas

**Estado:** Aceptada (2026-11-19).
**Fecha:** 2026-11-19
**Autores:** Esteban (tablero "Mejoras visuales de Inicio - Bancos, Efectivo y Atención hoy" y la elección "La que más me gustó fue esta: Alternativa · dos fichas en la banda"), Claude Opus 5.5 (implementación)
**Relación:** **Cambia** el [ADR 181](181-inicio-bancos-y-efectivo-y-la-hamaca-que-cabe.md) D1 (la ficha partida con flecha y la caja con los dos grupos) y el [ADR 152](152-inicio-rediseno-saldo-al-centro-y-pago-en-hojas.md) D3 (los pagos como un aviso destacado que resume). Solo bajo 1024 px: el escritorio no cambia.

---

## Contexto

El tablero trae diez páginas. Dos son capturas de hoy ("un pago vencido" y "varios pagos"). Una compara la ficha partida de hoy con dos propuestas para Bancos y Efectivo: la **tarjeta puente** (una tarjeta blanca de 64 que cruza el borde de la banda, con los montos en oscuro y una flecha) y la **alternativa, dos fichas en la banda** (dos píldoras independientes dentro del verde, sin flecha, cada una abre su grupo, mismo alto que hoy y montos en blanco); y sus casos (solo bancos, saldo oculto, cifras largas). Tres páginas son Inicio con la tarjeta puente (oscuro, claro y las cuentas abiertas). Cuatro son "Atención hoy": la anatomía de la fila de un compromiso con sus cuatro estados, y los casos de uno, tres, seis compromisos y "requiere atención" con un pago sin logo.

Esteban eligió la alternativa. La tarjeta puente no se aplica; las páginas que la dibujan valen por lo que muestran de "Atención hoy".

## Decisión

### D1. Dos fichas en la banda (INI.7a)

La ficha partida del ADR 181 D1 se vuelve dos fichas: **Bancos** (los logos de sus cuentas, 26 en círculo y montados 8, hasta tres y luego "+N"; el rótulo y el monto) y **Efectivo** (el disco verde billete de 34 con su billete, el rótulo y el monto). Píldoras de 52 de alto, a 8 una de otra, centradas en la banda, translúcidas sobre el verde, con el rótulo en 11,5 y el monto en 15,5 en blanco. Sin flecha.

- **Cada ficha abre su grupo:** Bancos abre "En bancos · N cuentas" y Efectivo, "En efectivo" (la cuenta dice "Lo que llevas encima" como el tablero), con "Ver mis cuentas" al pie. Tocar la otra cambia de grupo sin cerrar; tocar la misma lo cierra. La ficha abierta se aclara (`aria-expanded`). Se sigue cerrando al navegar, al tocar fuera y con Escape (ADR 153 D2), que devuelve el foco a la ficha que lo abrió.
- **Lo demás del ADR 181 D1 sigue:** qué suma cada lado (`repartoBancosEfectivo`), que se repinta con cada movimiento, que un lado sin cuentas no se pinta (la otra ficha queda sola y centrada) y que el ojo tapa los dos montos.
- **Nombre accesible de cada ficha:** su rótulo, su monto y lo que hace: "Bancos $3.894.400. Ver tus cuentas de banco", "Efectivo $185.000. Ver tu efectivo"; abierta, "Ocultar...".
- **El mismo alto que hoy:** con 4 de margen bajo las fichas, la banda sigue terminando en 268 a 390 x 844.
- **Pantallas angostas:** el tablero mide 390. A 360 y 320 las dos fichas no cabían en una línea con montos normales; el relleno, el espacio, la letra del monto y las tejas se encogen con el ancho (a 320, tejas de 22 y disco de 30) y caben. Con cifras de diez caracteres o más el monto baja a 14 (el tablero lo pide para la tarjeta puente). Si aun así no caben (letra del sistema muy grande), la segunda ficha baja a otra línea: los montos nunca se cortan.

### D2. "Atención hoy" en filas (INI.7b)

Se escribe al cerrar INI.7b.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| La tarjeta puente (la propuesta principal del tablero) | Esteban eligió la alternativa. |
| Una flecha en cada ficha | El tablero las dibuja sin flecha: la píldora entera es el control. |
| Abrir los dos grupos con cualquier ficha | El tablero dice "cada una abre su grupo". |
| Cortar el monto con puntos en pantallas angostas | Un saldo cortado es un saldo que no se lee; antes baja de línea. |

## Consecuencias

- `render.test.js` cubre las dos fichas, el grupo de cada una, el cambio de grupo, la ficha que se calla, la máscara, las cifras largas y la acción con su lado; `inicio-rediseno.test.js` mide a 390, 360 y 320 (una línea, centradas, 52 de alto, montos enteros, banda en 268) y las cifras largas a 320; `smoke.test.js` y `inicio-control-pago.test.js`, ajustadas.
- El HTML del tablero se manda a la Papelera al terminar las dos rebanadas.
