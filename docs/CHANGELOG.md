# Changelog - Finko Claude

> Revisado: 2026-11-03.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-11)

### feat(movil): MV2.27, Calendario: el mes entero en el teléfono · 2026-11-03

[ADR 111](DECISIONS/111-calendario-el-mes-entero-en-el-telefono.md) (cambia bajo 1024px el ADR 037 D2; acota R4 entre 320 y 357px; aplica en Calendario el ADR 107 D1, D3 y D5; respeta el ADR 037 D3, el 081 K4 y el 071); ficha [`contexto/calendario.md`](contexto/calendario.md). Ningún cálculo cambia. SW v643.

- **La grilla cabe** (a, bajo 1024px): `aspect-ratio: 1` con piso de 44 se volvía un ancho mínimo y la grilla pedía 332px; a 360 el domingo quedaba 17px fuera de la tarjeta. Ahora `minmax(0, 1fr)` sin hueco, 8px del relleno de la tarjeta a cada lado y 3rem de alto: 40,9 x 48 a 320, 45,5 a 360. Con el texto al 130 % nada se sale.
- **El día, en un círculo** (a): el estado deja la celda y pasa a un círculo de 2rem detrás del número, con los mismos colores y el mismo orden; el número sube a 14px. La leyenda va en dos columnas alineadas.
- **Textos que no se parten** (b): "este mes" va en `.cal-card__sub-mes` y calla bajo 1024; cada lado del resumen del día es un `.cal-detail__lado` que baja entero; el nombre de un pago usa dos renglones. El texto que se lee no cambia.
- **Lo aprobado llega** (c, todos los anchos): "Viernes 30 de octubre" en minúscula; la pill de pago sale del cuerpo y ocupa su renglón (el abono parcial pasa de tres renglones a uno); "Distribuir" con `data-dom="tesoreria"` y "Aportar" con `data-dom="metas"`, una línea nueva en `buttons.css`; con el propósito visible `.cal-empty` calla su mensaje como `.empty-state`, y su botón vuelve a verde lleno (revisa DIS.11 C8, que lo había bajado a borde por el "+ Agregar gasto fijo" que la ficha 05 se llevó).
- **Cuatro tests con fecha** (fuera del alcance, solo tests; fallaban igual en el commit anterior): FD3 de `compromisos.test.js` usaba `diaPago: 5` aunque su comentario dice `DIA_PASADO`, y fallaba del 1 al 5 de cada mes. Tres E2E de Por pagar en `smoke.test.js` crean un fijo, llegan al Calendario y tocan su día; sin eventos hoy, DSK.2c ya lo había abierto y el clic lo cerraba. `abrirDiaAgenda()` solo toca si el día no está abierto.
- Pruebas: 5 unitarias en `agenda.test.js`; 4 E2E en `movil-mv2.test.js` (tres móviles y uno de escritorio); el E2E de C8 en `smoke.test.js` cambia de sentido.

---

## Meses anteriores

- [2026-10](changelog/2026-10.md)
- [2026-08](changelog/2026-08.md)
- [2026-07](changelog/2026-07.md)
- [2026-06](changelog/2026-06.md)
- [2026-05](changelog/2026-05.md)

---

## Convención de entradas

Cada entrada agrupa por fase/release y dentro lista commits con:
- **tipo(área)** - `commit_hash` · `archivos tocados` - descripción de qué cambió.

Tipos: `feat` (nueva funcionalidad), `fix` (bug), `refactor` (sin cambio funcional), `test`, `docs`, `chore` (config/build), `style` (formato).
