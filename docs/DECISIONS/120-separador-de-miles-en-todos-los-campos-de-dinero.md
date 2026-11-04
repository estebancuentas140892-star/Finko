# ADR 120 - Separador de miles en todos los campos de dinero

**Estado:** Aceptada (2026-11-04). Quinta tanda de la tarjeta **MV2.3**. Esteban decidió aplicar el canvas "tal cual como propone el HTML".
**Fecha:** 2026-11-04
**Autores:** Esteban (diseño y decisión), Claude Opus 5.5 (implementación y redacción)
**Relación:** sigue al [ADR 119](119-plan-de-salida-en-hoja-y-el-detalle-del-gasto.md). **Completa** R16 ("los montos se leen con su separador también mientras se escriben"), que hasta acá cumplían solo los datos de renta de Ajustes (B4) y las Reservas (T9). **Aplica** la regla 3 del [ADR 060](060-lectura-cross-domain-de-solo-lectura.md): el par `miles` / `desdeMiles` estaba copiado en dos dominios y sube a infra. Rige en todos los anchos.

---

## Contexto

| Hallazgo del canvas | Lo que había |
|---|---|
| A6 y R16: "$1500000" se lee mal; en un formulario de dinero el separador ayuda a no poner un cero de más | 28 campos de dinero eran `type="number"`: sin separador mientras se escribe. Solo 5 (renta y Reservas) lo tenían, cada dominio con su propio cableado |

## Decisión

### D1. Todo campo de dinero es texto con teclado numérico y `data-miles`

Gasto, fijo, abono, deuda (saldo, cupo, cuota), meta, aporte, fondo, inversión, préstamo y cobro, límite y gastos pequeños, cuenta y cuota de manejo, ingreso fijo y puntual, transferencia, el extra y la cuota de la estrategia, y los montos de Distribuir. Pierden `min`, `max` y `step`: los validadores de cada dominio ya dicen qué falta, en palabras. Los PIN, las tasas, los días y los porcentajes no cambian.

### D2. Un solo cableado para todos (`ui/miles.js`)

- Al escribir, el campo se reformatea ("1500000" pasa a "1.500.000") y el cursor conserva los mismos dígitos a su derecha: escribir en medio del número no lo manda al final.
- Al armar el `FormData` de un formulario, cada campo marcado viaja como dígitos (evento `formdata`, en todos los navegadores desde 2021). Los validadores que leen `Number(datos.monto)` no cambian.
- Quien lee `.value` directo (vistas previas, Distribuir) usa `desdeMiles()`; quien escribe un monto en un campo usa `miles()`.

`miles` conserva un "-" inicial: el saldo de una cuenta puede estar en negativo y editarla no debe volverlo positivo.

### D3. El par sube a infra

`infra/miles.js` reemplaza las dos copias de Reservas y Ajustes, que lo reexportan con su nombre de siempre. Sus cableados locales se retiran.

## Alternativas descartadas

- **Leer cada campo con `desdeMiles()` en todos los formularios.** Eran 37 lectores de `FormData`; el evento `formdata` los cubre de una vez y no deja a ninguno atrás.
- **Formatear solo al salir del campo.** No ayuda mientras se escribe, que es cuando se equivoca un cero.

## Consecuencias

### Positivas

- Los 33 campos de dinero se leen igual mientras se escriben.
- Un campo nuevo de dinero solo necesita `data-miles`.

### Negativas / Restricciones

- Las pruebas unitarias corren en happy-dom, que no dispara `formdata`; `tests/setup.js` lo agrega para leer lo mismo que el navegador.
- Un campo de dinero sin `data-miles` vuelve a leerse sin separador; quien escriba uno nuevo lo marca.
