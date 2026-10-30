# ADR 104 - Una sola barra para ir de lado

**Estado:** Aceptada (2026-10-29). Pedido en chat: "Sí, MV2.12", sobre la fase 9 del canvas "Finko móvil: rediseño integral" (Claude Design, tableros "Fase 9: lentes, Movimientos y Más" y "Barra de lentes"). El canvas deja de mandar con este ADR.
**Fecha:** 2026-10-29
**Autores:** Esteban (pedido y diseño de la fase 9), Claude Opus 5.5 (implementación y redacción)
**Relación:** pieza MV2.12 de la tarjeta MV2.2 ([ADR 098](098-finko-movil-2-primera-entrega.md)). **Acota** el [ADR 069](069-bloque-gastos-en-la-barra-movil.md) D7: Ahorro y Gastos comparten el dibujo de la barra, pero no la estructura. **Cambia el dibujo** del ADR 098 D3, de chip a barra: se quedan las cuatro columnas y "Fondo". **Respeta** el ADR 069 D8 (encabezado del bloque Gastos), el punto de Límites de la ficha 07 y el [ADR 101](101-finko-del-adulto-decide-no-ensena.md) (Inicio ya no tiene lentes). Solo bajo 1024 px: escritorio y la app del niño no cambian.

---

## Contexto

Medido en la app real con el escenario C (fase 9 del canvas):

| Hallazgo | Medida |
|---|---|
| Ir de lado parece filtrar | En Ahorro, las cuatro modalidades son chips idénticos a los filtros de Por pagar y Movimientos. Gastos usa una barra segmentada para lo mismo |
| La barra de Gastos se desliza a 320 | mide 298 px en 294: el punto de "Límites" queda pegado al borde (R9) |
| El estado agranda la celda | la pastilla de "Por pagar" y el punto de "Límites" van en línea y empujan el rótulo |

## Decisión

### D1. Lo que cambia de pantalla es una barra; lo que filtra la lista, un chip

Las cuatro hijas de Ahorro pintan la barra del bloque Gastos (`.bloque-tabs`). Los chips quedan solo para filtrar. Una sola receta en el bloque móvil de `responsive.css` dibuja las dos barras y la de la portada de Ahorro.

### D2. Celdas iguales a lo ancho, de 44 px, y la barra nunca se desliza

Columnas iguales (`minmax(0, 1fr)`), sin desplazamiento (R9). Bajo 360 px el rótulo baja a 13 px. "Fondo de emergencia" sigue diciendo "Fondo" (ADR 098 D3) y el lector de pantalla oye el nombre completo.

### D3. El estado no agranda la celda

Número rojo si hay riesgo ("Por pagar" con sus vencidos). Punto en la esquina si pide mirar: "Límites" con un tope excedido (rojo, como desde la ficha 07) y "Reservas" con una reserva lista para reiniciar (ámbar). Ese segundo punto usa `estaListoParaReiniciar`, el mismo criterio del aviso `apartado-listo` del motor. El lector de pantalla oye las dos cosas ("Reservas, una lista para reiniciar").

### D4. La portada de Ahorro lleva la misma barra, sin celda vigente

Sus cuatro botones siguen saltando al carril de cada modalidad dentro de la misma pantalla. La estructura de Ahorro no cambia: portada, cuatro pares y el "‹ Ahorro" de cada hija (ADR 069 D7).

### D5. Sin la variante con íconos

La barra con íconos de la fase 3 mide 52 px. Con texto, la barra mide lo mismo en Gastos y en Ahorro, y cabe a 320.

## Alternativas descartadas

- **Teñir los chips de Ahorro como la barra sin cambiar su marcado.** Dos componentes con el mismo dibujo se separan con el primer ajuste; el canvas pide un solo dibujo.
- **Dejar que la barra se deslice con un indicador de "hay más".** Es lo que R9 prohíbe: lo que no se ve no se aprende.
- **La barra con íconos.** Más alta y no cabe a 320 sin cortar rótulos.

## Consecuencias

### Positivas

- Ninguna barra se desliza de 320 a 430 px; un test lo vigila.
- Un toque para ir de una modalidad de Ahorro a otra, igual que entre las lentes de Gastos, y con el mismo dibujo.
- Reservas avisa sin que haya que entrar.

### Negativas / Restricciones

- En la portada de Ahorro la barra no marca una celda: ahí son saltos dentro de la pantalla, no lugares.
- Un rótulo nuevo más largo que "Por pagar" no cabe a 320 sin cortarse con puntos suspensivos: los nombres de la barra se eligen cortos.
