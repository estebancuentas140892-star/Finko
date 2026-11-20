# ADR 184 - Inicio en el teléfono: dos fichas en la banda y "Atención hoy" en filas

**Estado:** Aceptada (2026-11-19).
**Fecha:** 2026-11-19
**Autores:** Esteban (tablero "Mejoras visuales de Inicio - Bancos, Efectivo y Atención hoy" y la elección "La que más me gustó fue esta: Alternativa · dos fichas en la banda"), Claude Opus 5.5 (implementación)
**Relación:** **Cambia** el [ADR 181](181-inicio-bancos-y-efectivo-y-la-hamaca-que-cabe.md) D1 (la ficha partida con flecha y la caja con los dos grupos), el [ADR 152](152-inicio-rediseno-saldo-al-centro-y-pago-en-hojas.md) D3 y D9 (los pagos como un aviso destacado que resume, y "Ver los N") y el [ADR 126](126-inicio-del-adulto-en-el-telefono.md) D3 en "Atención hoy" (el destacado con su urgencia escrita). Solo bajo 1024 px: el escritorio no cambia.

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

El aviso destacado que resumía los pagos ("3 pagos para hoy", el total, "1 ya vencido" y "Pagar", ADR 152 D3) se va. Cada compromiso es una fila de 84 que se toca entera, con cuatro piezas, cada una en su línea junto al logo: **el logo** (40 con radio 12; sin logo, la teja de su categoría en gris), **el nombre** (15, 600, una línea que se corta con puntos), **el estado** (ícono y palabra en su color, 12,5, 600) y **el valor** (15,5, 700, cifras tabulares). La flecha a la derecha dice que abre el pago.

- **Cuatro estados que no se parecen**, por color, claridad y forma: vencido en rojo con triángulo ("Venció hace 4 días"), vence hoy en ámbar con reloj, próximo en gris con calendario (hoy no entra aquí: vive en Esta semana) y "requiere atención" en azul con círculo (no es un atraso, pide una acción). Las palabras siguen saliendo de `estado-obligacion.js` (ADR 151).
- **La teja ya no es frambuesa:** sin marca, la categoría del pago va en una teja neutra (`tejaDePago(..., { neutra: true })`), también en la hoja "Avisos de hoy". El frambuesa queda en el botón "Pagar", que es la acción de la sección. Al hacerlo apareció un error viejo: la teja buscaba el compromiso con el id del aviso (`tipo:id`) y nunca lo encontraba, así que sin marca salía siempre el ícono de deudas; ahora sale la categoría (Vivienda, Salud).
- **Debajo del título**, con dos pagos o más, "N pagos · $X". Con uno, nada: la fila ya lo dice.
- **Hasta tres pagos**, lo vencido primero y el más atrasado arriba (ADR 150 D1); si hay más, "N pagos más · $X" con los logos de los que no caben (24, montados 7) y "Ver todos", que abre la hoja "Avisos de hoy". Desaparece "Ver los N" de la cabecera.
- **Al pie, "Pagar los N"** (o "Pagar Disney+" con uno), redondo de 48: abre el lote con todos. **Tocar una fila abre el lote con solo ese pago marcado** (`inicio-pagar-uno`, que usa la misma puerta del lote con `marcados`).
- **Lo que no es un pago va aparte**, con las mismas filas, bajo "También necesita tu atención": el débito sin saldo ("Débito automático de EPM", el logo de la cuenta que no alcanza, "Falta saldo en Bancolombia" y el valor del débito), tu ingreso por distribuir ("Tu ingreso del 15 de nov", "Sin distribuir"), lo que te deben ("Acordaron pagarte hace 5 días"), una reserva para hoy y la nube. Cada fila hace lo que hacía su grupo (ver tus cuentas, distribuir, ir a la sección). Hasta tres y "N más". Sin pagos, esa tarjeta es la única y no lleva subtítulo.
- **Lo que no cambia:** qué entra (`esDeHoy`, ADR 099 D2), el orden de los grupos (pagos, tu ingreso, lo demás; ADR 150 D7), el conteo y la hoja, que "Todo al día" se decide por `[data-seccion]` de las filas (ADR 153 D7) y "Novedades" y "Por completar", que siguen con sus filas.
- **Lo que el tablero promete y la app no tiene:** el monto del ingreso por distribuir ("+$4.200.000") no viaja en el aviso del motor; la fila no lo inventa y sale sin valor. Lo que "te llega hoy" sí lo trae. A 390 "3 pagos más · $391.900" cabe en una línea; en pantallas más angostas se corta con puntos y el nombre accesible lo dice entero.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| La tarjeta puente (la propuesta principal del tablero) | Esteban eligió la alternativa. |
| Una flecha en cada ficha | El tablero las dibuja sin flecha: la píldora entera es el control. |
| Abrir los dos grupos con cualquier ficha | El tablero dice "cada una abre su grupo". |
| Cortar el monto con puntos en pantallas angostas | Un saldo cortado es un saldo que no se lee; antes baja de línea. |
| Seguir resumiendo los pagos en un aviso destacado (ADR 152 D3) | El tablero pide ver cada compromiso: qué es, en qué estado y cuánto, sin abrir nada. |
| "Falta saldo" con lo que falta en lugar del valor del débito | El tablero muestra el valor; lo que falta sigue en la hoja "Avisos de hoy". |
| Mezclar lo que no es un pago entre los pagos | El botón "Pagar los N" no lo paga: va aparte para que el conteo y el botón digan lo mismo. |

## Consecuencias

- `render.test.js` cubre las dos fichas, el grupo de cada una, el cambio de grupo, la ficha que se calla, la máscara, las cifras largas y la acción con su lado; `inicio-rediseno.test.js` mide a 390, 360 y 320 (una línea, centradas, 52 de alto, montos enteros, banda en 268) y las cifras largas a 320; `smoke.test.js` y `inicio-control-pago.test.js`, ajustadas.
- `atencion-hoy.test.js` cubre las cuatro piezas de la fila, la acción de cada fila, el resumen, el botón con uno y con varios, el orden, "N pagos más", lo que no es un pago y su tope; `inicio-rediseno.test.js` mide las filas (84), el logo (40), el botón (48) y que tocar un pago abre el lote con solo ese; `inicio-hoy.test.js`, `smoke.test.js`, `inicio-control-pago.test.js` y `movimientos-deshacer.test.js`, ajustadas.
- Las reglas del destacado de "Atención hoy" salen de `identidad.css`; las de `responsive.css` quedan para escritorio y para "Por completar".
- El HTML del tablero se manda a la Papelera al terminar las dos rebanadas.
