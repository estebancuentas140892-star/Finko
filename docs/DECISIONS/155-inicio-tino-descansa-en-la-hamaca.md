# ADR 155 - Inicio: Tino descansa en su hamaca cuando todo está al día

**Estado:** Aceptada (2026-11-16).
**Fecha:** 2026-11-16
**Autores:** Esteban (tablero "Finko · Inicio Tino descansa" y el dibujo `Personaje Tino/tino-hamaca.svg`; pedido: "implementar los cambios sugeridos en la hamaca"), Claude Opus 5.5 (implementación)
**Relación:** **Cambia** el [ADR 152](152-inicio-rediseno-saldo-al-centro-y-pago-en-hojas.md) D8 (la puesta de "Todo al día": el sol de 204, la pose `tranquilo` y el nombre de la imagen) y la forma del segundo caso del [ADR 153](153-inicio-control-del-pago-y-desplegable-de-cuentas.md) D7 (cuándo sale no cambia). **Amplía** el [ADR 129](129-tino-ronda-2-en-el-adulto.md) D1: un dibujo original más en `assets/tino/`, sin cambiar un trazo ni un color. Del [ADR 127](127-identidad-bosque-y-sol.md) D6 respeta el dibujo original y que Tino nunca está triste; el sol lo pone ahora el dibujo, no el CSS.

---

## Contexto

El tablero trae cinco páginas a 390 x 844: "Hoy" (la captura de la app: Tino duerme sobre un disco crema, sin ningún texto), "A · La hamaca" en oscuro y en claro, y "B · Bosque y sol" en oscuro y en claro. El pedido fue la A. Las dos páginas A son el mismo marcado con los colores del tema; su dibujo es `tino-hamaca.svg` sin el bloque de metadatos.

Lo que la A cambia frente a hoy: Tino en una hamaca que cuelga del borde de abajo del saldo, con el disco crema dentro del dibujo; dos anillos finos detrás, centrados en el disco; el texto escrito debajo ("¡Fuera preocupaciones!" y "No tienes pagos pendientes hoy ni esta semana."), que hoy solo existía como nombre de la imagen; y un vaivén lento de la hamaca, que el tablero apaga con "reducir movimiento".

## Decisión

### D1. El dibujo: `assets/tino/tino-hamaca.svg`

Entra como los de la ronda 2 (ADR 129 D1): sin el bloque de metadatos de Illustrator ni el `id` de la capa, las 257 formas y sus colores tal cual (81 KB). El Service Worker lo precachea. Trae su propio disco crema, así que `.todo-al-dia__sol` sale con su CSS. No entra a `TINO_ORIGINAL`: esa tabla es de `htmlTinoSol`, que pinta un sol detrás; `index.html` pide la hamaca directo, decorativa (`alt=""`), y un test compara su lienzo con el `viewBox`.

### D2. Colgada del saldo

La hamaca mide el 82 % del ancho (320 a 390, como el tablero) sin pasar de 360, y baja si el alto no alcanza: `(100svh - 420px - áreas seguras) x 0,91`, que a 375 x 667 da 225 y deja el texto sobre la barra. Sube los 28 px del espacio del bento bajo el saldo más 0,0347 de su ancho: los ganchos quedan 11 px sobre el borde del saldo, pintados encima, como en el tablero (la celda va después del saldo en el DOM y los dos son posicionados). Con el desplegable "En 3 cuentas" abierto, el saldo crece y la hamaca baja con él. A 390 x 844 el título queda en 628, como el tablero, y la página no se desplaza.

### D3. Dos anillos detrás

Radios de 0,5375 y 0,75 del ancho de la hamaca (172 y 240 a 320), de 1,5 px, centrados en el disco. Van a lo ancho de la pantalla y empiezan en el borde del saldo, así que nunca lo pisan ni desbordan a lo ancho. Oscuro: blanco al 6 % y al 4 %; claro: bosque al 10 % y al 6 %, los valores del tablero.

### D4. El texto se ve

"¡Fuera preocupaciones!" (`h2`, Plus Jakarta 24/30, 800, el texto principal del tema) y "No tienes pagos pendientes hoy ni esta semana." (14/20, el texto secundario), centrados, 20 px bajo el dibujo. Reemplazan el `role="img"` con nombre de INI.2f: el lector de pantalla lee lo mismo que se ve y el dibujo es decorativo.

### D5. Se mece, salvo con "reducir movimiento"

Un ladeo (`skewX`) de 1,3 grados a cada lado en 5,6 s, desde los ganchos, solo con `prefers-reduced-motion: no-preference`. Es transformación pura: no repinta ni mueve el resto. La hamaca no recibe toques (tampoco el menú de guardar imagen al dejar el dedo encima).

### D6. El segundo caso, más chico y sin colgar

Cuando "Atención hoy" trae algo que no es un pago (ADR 153 D7), la escena sale debajo de esa tarjeta a 200 de ancho, centrada, con el mismo texto y sin anillos: no hay saldo del que colgar. El tablero no dibuja este caso. De paso se corrige un defecto de INI.3: la celda es `flex` en columna y la regla centraba en el eje equivocado, así que Tino quedaba recostado a la izquierda.

### D7. Lo que cambia de ADR anteriores

- **ADR 152 D8:** el sol de 204 con halos y la pose `tranquilo` de 310 salen; la imagen con nombre pasa a ser texto visible. Cuándo sale "Todo al día" no cambia.
- **ADR 153 D7:** el segundo caso pasa de la escena de 310 x 240 (sin centrar) a la hamaca de 200 con su texto.
- **ADR 129 D3** no cambia: `tranquilo` sigue en "Nada que atender hoy", que sale cuando hoy no hay nada pero la semana sí.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| La B, "Bosque y sol" | El pedido fue la hamaca; la B queda sin aplicar. |
| La hamaca sobre el sol de CSS de antes | El dibujo ya trae su disco: serían dos. |
| La hamaca siempre de 320 | A 375 x 667 el texto quedaba debajo de la barra. |
| Colgarla con JS o con anchor positioning | Los 28 px bajo el saldo son fijos bajo 1024 (`responsive.css`), así que basta el CSS; anchor positioning no llega a todos los Safari que usa la app. |
| Reducir los colores del dibujo, como el sprite del niño | ADR 129 D1: el adulto usa el original sin cambiar un trazo. Pesa 81 KB, se pide solo cuando se ve (`loading="lazy"`) y queda en el precache. |
| Colgarla también debajo de "Atención hoy" | Colgaría de una tarjeta que dice otra cosa; ahí va suelta y más chica. |

## Consecuencias

- `assets/tino/` pasa a quince dibujos; el precache crece 81 KB.
- A 375 x 667 la página se desplaza 50 px (antes 22): lo que se ve, hamaca y texto, cabe sobre la barra; lo que baja es el relleno inferior de la sección.
- `inicio-rediseno.test.js` mide la hamaca contra el tablero (colgada 11 px, 320 de ancho, centrada, título en 628, sin desplazamiento, ganchos encima del saldo) y el vaivén con y sin "reducir movimiento"; `inicio-control-pago.test.js`, el segundo caso centrado.
- El HTML del tablero se mandó a la Papelera.
