# ADR 181 - Inicio en el teléfono: bancos y efectivo, la hamaca que cabe, la luna quieta y la junta sin raya

**Estado:** Aceptada (2026-11-19).
**Fecha:** 2026-11-19
**Autores:** Esteban (tablero "Mejoras visuales de Inicio, Finko (versión móvil)" y el pedido de cuatro puntos: el indicador de bancos y efectivo, el mensaje de la hamaca sin desplazar, la luna que se mueve con Tino y la línea que aparece al desplazar), Claude Opus 5.5 (implementación)
**Relación:** **Cambia** el [ADR 126](126-inicio-del-adulto-en-el-telefono.md) D2 y el [ADR 152](152-inicio-rediseno-saldo-al-centro-y-pago-en-hojas.md) D1 y D2 (la ficha "En N cuentas" y la lista de cuentas abiertas), y el [ADR 155](155-inicio-tino-descansa-en-la-hamaca.md) D1, D2, D4 y D5 (el disco dentro del dibujo, el ancho de la hamaca, el texto y qué se mece). Solo bajo 1024 px: el escritorio no cambia.

---

## Contexto

El tablero trae diez páginas. Cinco son la propuesta (oscuro y claro a 390 x 844, oscuro a 360 x 640, claro a 375 x 667 y las cuentas abiertas), tres son las variantes del indicador (A, "Ficha partida", recomendada; B, "Línea bajo el saldo"; C, "Ficha con reparto") y dos son capturas de hoy: a 390 x 844, y a 360 x 640, donde el texto bajo "¡Fuera preocupaciones!" se parte en dos líneas y "Registrar" lo tapa.

El pedido suma dos problemas que el tablero no dibuja: la luna (el disco crema detrás de Tino) se mece con él, y entre el encabezado y "Tu dinero disponible" aparece una línea al desplazar.

## Decisión

### D1. Bancos y Efectivo: la ficha partida (INI.6a)

La ficha del saldo deja de decir "En efectivo y 2 cuentas" y parte el dinero en dos: **Bancos** (con los logos de sus cuentas, hasta tres y luego "+N") y **Efectivo** (con su teja), cada uno con su monto, una raya entre los dos y la flecha en su columna. Abierta, las cuentas van en dos grupos, "En bancos" y "En efectivo", con "Ver mis cuentas" al pie.

- **Qué suma cada lado** (`repartoBancosEfectivo`, `tesoreria/logic/cuentas.js`): las cuentas activas, cada una en un solo lado con la regla de Retirar efectivo (`esCuentaEfectivo`): la clase de su entidad y, en datos viejos sin `banco`, su tipo. Las billeteras (Nequi, Daviplata) y "Otro" van con los bancos. Los dos lados suman exactamente el saldo del hero, así que nada se cuenta dos veces: lo que una meta, reserva o fondo dice que guarda en una cuenta (`guardadoEn`, ADR 174) ya está en el saldo de esa cuenta y no suma aparte; las tarjetas de crédito y las inversiones no son dinero disponible.
- **Se actualiza con cada movimiento:** `updSaldo()` la repinta con el saldo, después de cualquier cambio de una cuenta.
- **Un lado sin cuentas no se pinta** y el otro ocupa la ficha: decir "Efectivo $0" a quien no registró efectivo sugiere que le falta algo.
- **El ojo** tapa los dos montos y su nombre accesible ("Bancos oculto, efectivo oculto").
- **Nombre accesible:** lo que se ve y lo que hace, "Bancos $900.000, efectivo $120.000. Ver detalle por cuenta".
- **Medidas del tablero:** la ficha mide 56 de alto con su borde y hasta 342 de ancho, 18 bajo el monto; el saldo baja su relleno inferior de 28 a 22, así que su borde sigue en 268 a 390 x 844.

### D2. La hamaca cabe con su mensaje, medida en el teléfono (INI.6b)

La regla del tablero: la hamaca mide el 78 % del ancho, hasta 300 y no menos de 160, y baja lo necesario para que el dibujo y su mensaje queden sobre "Registrar" con 12 px de aire. Cambia cómo se sabe cuánto alto queda: el ADR 155 D2 lo estimaba con `100svh - 420px`, una medida fija que suponía el saldo, el mensaje en una línea y la barra; a 360 x 640 el mensaje ocupa dos y "Registrar" lo tapa, y con la letra del sistema más grande falla en cualquier ancho.

`ui/hamaca.js` mide en el navegador el borde de abajo del saldo, el alto real del mensaje y el tope del círculo de "Registrar", y deja el resultado en `--hamaca-libre`; el CSS sigue decidiendo el ancho con esa cota. Vuelve a medir cuando cambia el saldo, el mensaje o el alto de la ventana. Con las cuentas abiertas conserva la última medida (Tino no se achica al abrirlas). Antes de medir, el CSS usa la cota por alto de antes.

El texto queda como el tablero: título de 22/28 a 12 del dibujo y mensaje de 14/20 a 4, equilibrado en dos líneas cuando no cabe en una.

### D3. La luna se queda quieta (INI.6c)

El disco crema estaba dentro del dibujo, partido en ocho formas que rodean a Tino y la hamaca, así que se mecía con ellos. Sale del dibujo y pasa a ser un círculo aparte, detrás (`.todo-al-dia__luna`, centro y radio tomados del `viewBox`: 460,42; 667,56; 341,58), del color `--fk-tino-luna`. Se mece solo la imagen de Tino con su hamaca, con el mismo ladeo y el mismo origen. Comparado píxel a píxel con el dibujo aprobado, la composición queda igual salvo el suavizado de los bordes (1 px); ningún trazo ni color de Tino cambia.

### D4. La junta del encabezado y el saldo sin raya (INI.6d)

El fondo de bosque lo pintan dos cajas (el encabezado y el saldo) que se tocan. En pantallas de densidad fraccionaria (2,625 en muchos Android de 412 px), el borde entre las dos cae a medio píxel físico: cada caja pinta media fila suavizada y por ahí se ve el fondo de la página, una raya de 1 px que aparece y desaparece según la posición del desplazamiento. No es un borde, una sombra ni un elemento fijo. El saldo sube 1 px sobre el encabezado (margen de -1 y relleno de +1, con el centro de sus círculos 1 px más abajo para que sigan alineados), así la junta cae sobre el mismo verde.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| B, "Línea bajo el saldo" | Separa los montos del control que los abre y suma una línea más al saldo. |
| C, "Ficha con reparto" | La barra repite en proporción lo que los dos montos ya dicen. |
| "Efectivo $0" sin cuentas de efectivo | Sugiere que falta registrar algo; el lado se calla. |
| Contar las billeteras como efectivo | Nequi y Daviplata son cuentas, no dinero en la mano; Retirar efectivo ya las trata así. |
| Seguir con la medida fija del ADR 155 | Es la que falla a 360 x 640 y con la letra más grande. |
| Anchor positioning | No llega a todos los Safari que usa la app (lo mismo dijo el ADR 155). |
| Mecer a Tino dentro del SVG, con su propio CSS | El dibujo se pide como `<img>` y la app no controla desde afuera su "reducir movimiento"; y las formas de la luna van intercaladas. |
| La luna como otro SVG | Un archivo y una petición más para un círculo de un color. |
| Tapar la raya con una sombra o un borde de 1 px | Corta los anillos de la banda donde se cruzan con la junta. |

## Consecuencias

- `inicio-rediseno.test.js` mide la ficha a 390 y 360 (centrada, 56 de alto, montos enteros dentro), sus grupos y que un pago la actualiza; `render.test.js` y `tesoreria.test.js`, el reparto, el lado que se calla, la máscara y que los lados suman el saldo.
- El HTML del tablero se manda a la Papelera al aplicarlo.
