# ADR 111 - Calendario: el mes entero en el teléfono

**Estado:** Aceptada (2026-11-03). Pedido en chat: "vamos a aplicar los cambios de diseño propuestos", sobre la fase 13 del canvas "Finko móvil: rediseño integral" (Claude Design, tableros "Fase 13: Calendario en el teléfono", "Fase 13: el día, el vacío y lo aprobado" y "Calendario v2"). Esteban eligió las tres rebanadas (también la que toca escritorio) y aceptó la excepción de R4 a 320 px. El canvas deja de mandar con este ADR.
**Fecha:** 2026-11-03
**Autores:** Esteban (pedido y diseño de la fase 13), Claude Opus 5.5 (implementación y redacción)
**Relación:** pieza MV2.27 de la tarjeta MV2.2 ([ADR 098](098-finko-movil-2-primera-entrega.md)). **Cambia bajo 1024 px** el [ADR 037](037-calendario-v2-visual.md) D2 (celda cuadrada que se pinta entera). **Acota** R4 entre 320 y 357 px (D2). **Aplica en Calendario** el [ADR 107](107-el-peso-de-cada-cosa.md) D1, D3 y D5, que no habían llegado: esa rebanada toca escritorio porque el 107 no parte por ancho. **Respeta** el ADR 037 D3 (día abierto en índigo), el [ADR 081](081-calendario-la-forma-del-mes-entradas-incluidas.md) K4 (el ingreso se marca como el vencido), DIS.11 C2 y C7 y el [ADR 071](071-calendario-como-mapa-del-mes-en-escritorio.md) (composición de escritorio). K5, ámbar contra rojo, sigue en la ficha 18. Ningún cálculo cambia.

---

## Contexto

Medido en la app real de 320 a 430 px, con un mes normal, con años de uso y sin datos:

| Hallazgo | Medida |
|---|---|
| La grilla no cabe | pide 332 px (siete celdas de 44 y seis huecos de 4). A 360 el domingo queda 17 px fuera de la tarjeta; a 320, 49 px y la columna entera no se ve |
| La causa | `aspect-ratio: 1` con `min-height: 44px` se vuelve un ancho mínimo de 44, y `repeat(7, 1fr)` no encoge por debajo |
| El mes se lee como avisos | con años de uso, 13 de 31 días son una caja con borde y fondo, a 4 px una de otra |
| El número, el texto más chico | 12 px en el teléfono, 14 en escritorio |
| Textos que se parten | "7 compromisos este mes · 2 / ingresos" a 360; "Entra $4.200.000 · sale" con el monto solo abajo a 320; el abono parcial en tres renglones (69 px) |
| Lo aprobado que no llegó | "Distribuir" y "Aportar" del día en verde lleno (ADR 107 D1); sin datos, el vacío dice dos mensajes (D5) y su botón lleva borde |

## Decisión

Tres rebanadas: **MV2.27a** y **MV2.27b** viven bajo 1024 px; **MV2.27c** toca los dos anchos.

### D1. La grilla cabe (MV2.27a, bajo 1024 px)

Siete columnas `minmax(0, 1fr)` sin hueco, y la grilla toma 8 px del relleno de la tarjeta a cada lado. La celda pierde `aspect-ratio` y mide 3rem de alto (los 44 más 4 de hueco de hoy: la tarjeta mide lo mismo) y sigue siendo el botón entero.

### D2. R4 a 320 px: celdas contiguas (MV2.27a)

Desde 358 px la celda mide 44 o más de ancho. Entre 320 y 357 mide menos (40,9 a 320), pegada a sus vecinas: no queda hueco donde el dedo caiga en vacío. Es la única excepción a R4 y vale solo para esta grilla.

### D3. El día se marca en un círculo (MV2.27a, bajo 1024 px)

El estado pasa de la celda a un círculo de 2rem detrás del número (crece con el texto del sistema); los puntos siguen debajo. Mismos colores y mismo orden (ingreso, vencido, hoy, abierto): cambia la forma, no lo que dice. El número sube a 14 px. La leyenda va en dos columnas alineadas.

### D4. Los textos del mes y del día no se parten (MV2.27b, bajo 1024 px)

El subtítulo del mes no dice "este mes" bajo "Octubre 2026" (ADR 037 D2 ya lo escribía así). Cada lado del resumen del día ("Entra $X ·", "sale $Y") baja entero si no cabe. El nombre de un pago usa dos renglones antes de cortarse. El texto que lee un lector de pantalla no cambia.

### D5. Lo aprobado llega a Calendario (MV2.27c, también escritorio)

- El título del día escribe el mes en minúscula: "Viernes 30 de octubre".
- El estado de pago ("Ya pagaste este mes", "Abonado X de Y") sale del cuerpo y ocupa su renglón, a lo ancho del día.
- "Distribuir" viste el azul de Mis cuentas y "Aportar" el morado de Metas (`.btn-dominio`, ADR 107 D1). "Ver en Por pagar" sigue fantasma.
- Mientras se ve el propósito, `.cal-empty` calla su mensaje como `.empty-state` (ADR 107 D5), y "Programar en Por pagar" es el único botón: verde lleno (D3). Un mes vacío de alguien con datos conserva "Diciembre está despejado".

## Alternativas descartadas

- **Celda de 44 también a 320.** No cabe: siete de 44 piden 308 px y la tarjeta deja 286 aun quitando su relleno.
- **Achicar el número para que quepa la caja.** El número ya era lo más chico de la tarjeta.
- **Aplicar D5 solo en el teléfono.** El ADR 107 prohíbe partir el color de un botón por ancho.

## Consecuencias

### Positivas

- El mes entra entero de 320 a 430 px, también con el texto del sistema al 130 %, y trece vencidos se leen como trece días.
- Calendario deja de ser la excepción del ADR 107.

### Negativas / Restricciones

- Entre 320 y 357 px la celda queda bajo 44 de ancho (D2).
- La receta de estado vive dos veces: la celda en escritorio y el círculo bajo 1024. Un estado nuevo se pinta en los dos.
