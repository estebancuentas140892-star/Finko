# Changelog - Finko Claude

> Revisado: 2026-10-16.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-10)

### docs(transversal): HF, triaje de la iniciativa "un hecho financiero se informa una sola vez" · 2026-10-16

Triaje del brief de Esteban del 2026-10-16 contra el código. Decisión: [ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md) (Propuesta). Tarjetas: [`board/transversal.md`](board/transversal.md), bloque HF. Sin runtime.

- **MOV.1 no bloquea la iniciativa entera, solo sus Fases 1 y 3.** La Fase 0 no comparte archivos con la ficha 17 ni decide nada de la 18; la 18 es dueña del historial fechado, el valor de mercado, R90 y V5, y HF los espera.
- **La compuerta 1 estaba rota para todos:** 7 rojos en `main` (6 de BUG-028 y uno nuevo, un test de Inversión con fecha fija que caducó el 2026-08-28). Por eso la primera rebanada es HF.0a y no algo visible.
- **Cinco pedidos del brief ya existían** y no generan trabajo: forma habitual de pago y crédito automático (ADR 052), semántica del consumo con tarjeta (ADR 051 D3), préstamo con cuenta (PE.7) e inversión con origen (ADR 053).
- **Seis choques con ADR vigentes quedan como preguntas, no como cambios:** Fondo (020), pago de tarjeta y abono como gasto (051 D3, 002), Calendario sin acciones (081 D2), push y servidor (066 D1, 043 D1 y D4). Ninguno se revierte en silencio.
- **Tres errores nuevos, verificados en el código:** BUG-029 (importar gastos y borrarlos crea dinero), BUG-030 (Distribuir reacredita un salario ya acreditado por PA.1b) y BUG-031 ("compromiso próximo" avisa lo ya pagado y fecha sin la frecuencia).
- **Cupo:** los movimientos externos llevarían el estado a T1 del ADR 068 en dos o tres años; queda escrito antes de abrir la Fase 4.
- El diferido del ADR 040 (badges del nav) pasa a HF.3e: el brief respondió qué cuenta el badge.
- `CHANGELOG.md` rota: agosto pasa a [`changelog/2026-08.md`](changelog/2026-08.md) (364 KB, sobre el techo de 200 de un mes cerrado, igual que 2026-07; partirlo no entra aquí).
- Compuerta 3 verde. Sin tocar `modules/`, no hay tests que correr.

---

## Meses anteriores

- [2026-08](changelog/2026-08.md)
- [2026-07](changelog/2026-07.md)
- [2026-06](changelog/2026-06.md)
- [2026-05](changelog/2026-05.md)

---

## Convención de entradas

Cada entrada agrupa por fase/release y dentro lista commits con:
- **tipo(área)** - `commit_hash` · `archivos tocados` - descripción de qué cambió.

Tipos: `feat` (nueva funcionalidad), `fix` (bug), `refactor` (sin cambio funcional), `test`, `docs`, `chore` (config/build), `style` (formato).
