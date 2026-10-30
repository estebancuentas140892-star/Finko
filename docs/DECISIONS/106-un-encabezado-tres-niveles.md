# ADR 106 - Un encabezado, tres niveles

**Estado:** Aceptada (2026-10-29). Pedido en chat: "Sí, MV2.8", sobre la fase 10 del canvas "Finko móvil: rediseño integral" (Claude Design, tableros "Fase 10: un encabezado, tres niveles" y "Encabezado"). El canvas deja de mandar con este ADR.
**Fecha:** 2026-10-29
**Autores:** Esteban (pedido y diseño de la fase 10), Claude Opus 5.5 (implementación y redacción)
**Relación:** pieza MV2.8 de la tarjeta MV2.2 ([ADR 098](098-finko-movil-2-primera-entrega.md)), reglas RN1 y RN7 de la fase 2 del canvas. **Cambia en el teléfono** el [ADR 034](034-inicio-v2.md) D2 y D3 (hero de Inicio centrado, ojo en su esquina) y el [ADR 072](072-gastos-cabecera-de-banda-y-fila-con-cuenta.md) en lo que dice del hero centrado bajo 1.680 px. **Cambia** el "‹ Inicio" fijo de Movimientos (TX.8b). **Amplía** la excepción de R33 al bloque Gastos. **Respeta** el [ADR 069](069-bloque-gastos-en-la-barra-movil.md) D8 y el ADR 098 D5 (lugar y nombre corto del primario del bloque, que cambia de peso) y el ADR 098 D1 (volver con el origen real). Solo bajo 1024 px: escritorio ([ADR 070](070-inicio-centro-de-atencion-en-escritorio.md), INT.1e) y la app del niño no cambian.

---

## Contexto

Medido en la app real con el escenario C, a 390 × 844 y 320 × 568 (fase 10 del canvas):

| Hallazgo | Medida |
|---|---|
| El ojo, en cinco sitios | esquina izquierda del hero en Inicio, encabezado en Gastos, esquina derecha del hero en Mis cuentas y Calendario, y a 499 px en Análisis. En siete pantallas con montos no está: Ahorro, sus cuatro hijas, Me deben y Movimientos |
| Crear, de cuatro formas | "+ Gasto" en la fila del título; "Nueva meta" y "Nueva reserva" completos; "Nuevo préstamo" en la fila a 390 y en fila propia a 320; "Nueva cuenta" siempre en fila propia (encabezado de 112 px) |
| Crear pesa como pagar | los cinco son verdes y llenos, como "Aportar" o "Pagar los 6", que sí mueven dinero (R38) |
| "‹ Inicio" sin venir de Inicio | Movimientos abierto desde "Más" dice "‹ Inicio" (el enlace fijo de TX.8b) |
| El hero cambia de lado | centrado en Inicio y en Día a día; a la izquierda en Por pagar, Metas, Mis cuentas y Calendario |
| Dos tamaños de título | 20 px en el bloque Gastos, 22 a 26 en las demás |

## Decisión

Tres niveles: **raíz** (Inicio y los destinos de "Más": sin volver), **bloque** (Gastos y la portada de Ahorro: el título es del bloque y la barra de lentes va debajo) y **hija o cruzado** ("‹ Origen" encima del título, con el nombre real del lugar de donde viniste).

### D1. La fila del título lleva solo título y acciones (MV2.8a)

Teja, título y, a la derecha, las acciones. La fila mide al menos 52 px. La frase de la sección ("Dónde está tu dinero y de dónde viene") va en su propia fila, a lo ancho, debajo del título, como la de Gastos desde el ADR 098 D5.

### D2. Un tamaño de título y el hero a la izquierda (MV2.8a)

Título de 22 px en todas las pantallas, también en el bloque Gastos (20 px bajo 360 px, y baja de línea antes que cortarse). El hero va siempre a la izquierda: el bloque Gastos deja de saltar de lado al cambiar de lente.

### D3. El ojo va en el encabezado de toda pantalla con montos (MV2.8b)

Un solo control para toda la app (R20), en el mismo lugar: a la derecha de la fila del título, después de la lupa. Sale de los heroes de Inicio, Mis cuentas y Calendario y del medio de Análisis, y llega a Ahorro, sus cuatro hijas, Me deben y Movimientos. `S.config.ocultarSaldo` no cambia de contrato.

### D4. Crear es tonal, de 44 px y con el nombre corto (MV2.8a)

"+ Gasto", "+ Meta", "+ Reserva", "+ Cuenta", "+ Préstamo": tonal (tinte y texto de acento, no verde lleno), siempre al final de la fila. Bajo 360 px, si la fila lleva teja, queda solo el "+" con su nombre para el lector de pantalla. El primario de cada encabezado ya solo se ve en móvil (en escritorio lo copia la barra superior, INT.1e), así que lleva el nombre corto y la barra copia el completo de `data-barra`. En el bloque Gastos cambia el peso del espejo del ADR 098 D5, no su nombre.

### D5. Mover dinero va en el objeto y pesa más (R38, R8)

"Aportar", "Pagar" y "Me pagaron" siguen donde están. Por eso Fondo e Inversión no llevan crear arriba.

### D6. Volver solo en el nivel 3 (MV2.8c)

Desde la barra o desde "Más" no hay volver. El "‹ Inicio" fijo de Movimientos se oculta bajo 1024 px; el volver contextual del ADR 098 D1 sigue diciendo el origen real ("‹ Gastos").

## Alternativas descartadas

- **Dejar el ojo en el hero.** Cinco posiciones distintas para el mismo control, y siete pantallas sin él.
- **Crear en verde lleno.** Pesa igual que pagar o aportar, que sí mueven dinero.
- **Una barra superior fija para el título.** Cuesta 44 a 56 px permanentes y R31 la descarta; la frase también puede bajar de línea sin ella.

## Consecuencias

### Positivas

- El encabezado de Mis cuentas a 320 baja de 135 a 72 px y el de Me deben, de 96 a 52: "+ Préstamo" deja de bajar a su propia fila.
- Un solo lugar para el ojo y uno para crear en las trece pantallas.

### Negativas / Restricciones

- Cada encabezado nuevo debe seguir la fila: teja, título, lupa, ojo y crear, en ese orden.
- El espejo de crear duplica un botón por sección en el DOM (uno se ve por ancho), como ya pasa en el bloque Gastos.
