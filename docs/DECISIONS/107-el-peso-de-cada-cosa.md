# ADR 107 - El peso de cada cosa: botones, avisos y vacíos

**Estado:** Aceptada (2026-10-29). Pedido en chat: "Sí, Fase 11", sobre la fase 11 del canvas "Finko móvil: rediseño integral" (Claude Design, tableros "Fase 11: el peso de cada cosa", "Botones" y "Avisos y vacíos"). El canvas deja de mandar con este ADR.
**Fecha:** 2026-10-29
**Autores:** Esteban (pedido y diseño de la fase 11), Claude Opus 5.5 (implementación y redacción)
**Relación:** piezas MV2.16, MV2.18 y MV2.13 de la tarjeta MV2.2 ([ADR 098](098-finko-movil-2-primera-entrega.md)). **Toma y ajusta** la regla R8 ("confirmar un movimiento de dinero viste su dominio"): vale en toda la app. **Generaliza** el [ADR 036](036-deudas-v2-visual.md) D5 y D6 (el abono viste su dominio). **Respeta** el [ADR 049](049-fondo-de-emergencia-v2.md) D2: el aporte directo al Fondo sigue siendo vía secundaria, al lado de Editar y sin estirarse; cambia su color, no su lugar ni su tamaño. **Cumple** R38, R41, R49, R51, R55 y R75. **Cambia** el [ADR 016](016-banner-proposito-de-seccion.md) D1 y D3 en la rebanada de vacíos. A diferencia de las fases 9 y 10, **toca escritorio**: el color de un botón y la forma de un aviso no dependen del ancho; ningún tamaño ni lugar de escritorio cambia. La app del niño no cambia.

---

## Contexto

Medido en la app real con el escenario C (fase 11 del canvas):

| Hallazgo | Medida |
|---|---|
| Aportar, en gris | Fondo: "Registrar un aporte" es un botón gris al lado de "Editar". Ahorro: "+ Aportar al fondo" es gris. Me deben: "Me pagaron" es gris y "Nuevo préstamo", verde lleno (R38) |
| Pagar, en dos colores | en Por pagar, "Pagar los 6" lleva el índigo de Calendario (el componente viene de allí) y "Marcar pagado", el frambuesa de Por pagar |
| "+" para mover dinero | "+ Aportar" en Metas y Reservas, "+ Aportar al fondo" en Ahorro. El "+" dice crear una ficha; aportar mueve dinero |
| Mis cuentas | "Transferir entre cuentas" con borde neutro y "Distribuir mi ingreso" en verde lleno |
| 13 piezas con filete lateral | avisos de cuatro niveles, veredictos, nota de inversión, razón de la estrategia, Ajustes y consejos de los vacíos |
| Dos mensajes por vacío | Me deben vacío: banner de 171 px y vacío de 409, con dos "Nuevo préstamo" a la vez (R51) |

## Decisión

Tres rebanadas: **MV2.16** (D1 a D3), **MV2.18** (D4) y **MV2.13** (D5).

### D1. Todo lo que mueve dinero viste su sección (MV2.16)

Aportar, pagar, abonar, marcar pagado, me pagaron, transferir y distribuir: tinte del 12 %, borde del 40 % y texto del color del dominio. Una sola clase, `.btn-dominio`, con `data-dom` que elige el color; reemplaza el gris y el verde lleno en Fondo (sin crecer, por el ADR 049 D2), la casa de Ahorro, Me deben, Por pagar ("Pagar los N" toma el frambuesa de su sección, no el índigo de Calendario) y Mis cuentas. Las tarjetas que ya tenían su receta propia (`.deuda-card__abonar`, `.meta-card__aportar`, `.apartado-card__principal`) ya cumplían la regla y se quedan.

### D2. El "+" es solo de crear (MV2.16)

Aportar se dice sin "+", y con el monto cuando la sección lo sabe ("Aportar $275.000"). En Fondo, "Registrar un aporte" pasa a "Aportar al fondo".

### D3. Verde lleno solo para confirmar (MV2.16)

El verde lleno queda para confirmar dentro de una hoja ("Guardar gasto", "Distribuir $2.709.186") y para el único botón de un vacío. Crear es tonal (ADR 106 D4). Editar y ver son secundarios o fantasma; borrar es peligro, en su fila y con confirmación (R26, R53).

### D4. Avisos sin filete; explicaciones sin caja (MV2.18)

Un aviso tiene forma, título y una línea: el ícono de su nivel en una caja tintada. Fondo de color solo si hay algo que atender (riesgo y atención, R41). Ninguna pieza lleva filete lateral. Explicar una cifra no es avisar: los veredictos, la nota de inversión y la razón de la estrategia pasan a texto corrido bajo la cifra (R75). `role="alert"` solo para riesgo (R55).

### D5. Un vacío, un mensaje (MV2.13)

El banner de propósito pasa a ser el título y el cuerpo del vacío, sin perder ni reescribir una palabra del texto aprobado (ADR 016). Un solo botón, el del vacío: mientras se ve, el crear del encabezado se oculta (R51). La sección hermana va en una línea bajo el botón (R73).

## Alternativas descartadas

- **Teñir solo en móvil.** Partir el color de un botón por ancho dejaría dos sistemas.
- **Verde lleno para todo lo que mueve dinero.** Pierde la sección: "Pagar" y "Aportar" se verían iguales y pesarían como "Guardar".
- **Reescribir las recetas de las tarjetas que ya cumplen.** No cambia lo que se ve y agranda el diff.

## Consecuencias

### Positivas

- Mover dinero pesa más que crear en todas las pantallas, y cada acción tiene un solo color.
- Un botón nuevo que mueve dinero se resuelve con `class="btn-dominio" data-dom="…"`.

### Negativas / Restricciones

- Quedan tres recetas de tarjeta equivalentes a `.btn-dominio`; se unifican cuando se toque cada tarjeta, no antes.
