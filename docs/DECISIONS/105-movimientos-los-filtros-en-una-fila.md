# ADR 105 - Movimientos: los filtros en una fila

**Estado:** Aceptada (2026-10-29). Pedido en chat: "Sí, Movimientos", sobre la fase 9 del canvas "Finko móvil: rediseño integral" (Claude Design, tablero "Fase 9: lentes, Movimientos y Más", parte 2, y "Movimientos v2"). El canvas deja de mandar con este ADR.
**Fecha:** 2026-10-29
**Autores:** Esteban (pedido y diseño de la fase 9), Claude Opus 5.5 (implementación y redacción)
**Relación:** pieza de la tarjeta MV2.2 (R9 de la auditoría MV2, [ADR 098](098-finko-movil-2-primera-entrega.md)). **Extiende** el ADR 098 D6 (categorías de Gastos plegadas) a los tipos de Movimientos. **Respeta** el rango de fechas plegado de la ficha 15 (M2, [ADR 089](089-movimientos-la-quinta-fuente-y-cuatro-puertas.md)): cambia el lugar del control, no su comportamiento. Las fechas de cada fila ya no repiten el año desde el [ADR 102](102-fechas-con-el-ano-solo-si-no-es-el-de-hoy.md). Solo bajo 1024 px: escritorio ([ADR 076](076-movimientos-libro-mayor-con-sus-filtros-al-lado.md)) y la app del niño no cambian.

---

## Contexto

Medido en la app real con el escenario C (fase 9 del canvas):

| Hallazgo | Medida |
|---|---|
| "Me deben" no se ve | la fila de tipos mide 377 px en 358 (a 390) o en 296 (a 320). Se desliza sin decirlo: a 320 esconde 81 px (R9) |
| 176 px de filtros | buscar, la fila de tipos y "Filtrar por fechas" empujan el primer movimiento hasta los 330 px |
| Dos tratos para lo mismo | Gastos pliega sus categorías desde el ADR 098 D6; Movimientos desliza sus tipos |

## Decisión

### D1. Los tipos se pliegan como las categorías de Gastos

Plegada, la fila dice "Todos", el tipo elegido y "+N tipos". Abierta, la lista completa en orden alfabético y "Menos". Elegir un tipo pliega la fila: ya se encontró lo que se buscaba. Es la receta del ADR 098 D6 con su mismo botón (`.filtros-bar__mas`).

### D2. Las fechas pasan de fila propia a un chip en la misma fila

"Fechas" va al final de la fila de tipos y abre debajo los dos campos. Sigue plegado y se abre solo si ya trae fechas (ficha 15, M2). Con fechas puestas, el chip se marca como un filtro activo.

### D3. Si no cabe, baja de línea

La fila envuelve en vez de deslizarse: con un tipo elegido, a 320 "Fechas" pasa a la segunda línea. Nada se esconde sin decir cuánto falta.

### D4. "Limpiar filtros" junto a lo que se está viendo

Con un tipo elegido, la línea dice "Solo gastos" y a su lado "Limpiar filtros", debajo de los filtros. Sin filtros no hay línea.

### D5. Escritorio no cambia

El mismo marcado sirve a los dos anchos: el chip de fechas, el "+N tipos" y la línea "Solo …" nacen ocultos y solo existen bajo 1024 px. En escritorio siguen la fila completa de tipos y el desplegable "Filtrar por fechas" de la columna de filtros (ADR 076).

## Alternativas descartadas

- **Achicar los chips para que quepan los seis tipos.** A 320 ni así caben, y bajan del piso táctil de 44 px (R4).
- **Dejar el rango de fechas en su fila.** Son 44 px fijos para el control que menos se usa.
- **Un menú desplegable de tipos.** Es un patrón nuevo; el plegado ya existe en Gastos y se aprende una vez.

## Consecuencias

### Positivas

- El primer movimiento sube: la fila de fechas desaparece y la de tipos ocupa una línea.
- Los seis tipos se alcanzan a cualquier ancho, con su conteo a la vista.
- Gastos y Movimientos filtran igual.

### Negativas / Restricciones

- Ver todos los tipos cuesta un toque más ("+N tipos").
- Repintar la fila (al elegir un tipo) vuelve a plegar las fechas si no tienen valores, como ya pasaba con el desplegable.
