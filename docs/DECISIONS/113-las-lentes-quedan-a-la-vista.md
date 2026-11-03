# ADR 113 - Las lentes quedan a la vista

**Estado:** Aceptada (2026-11-03). Pedido en chat: "vamos con el siguiente cambio de diseño", sobre la pieza MV2.20 del plan del canvas "Finko móvil: rediseño integral" (Claude Design, "Arquitectura de navegación" y "Sistema visual móvil"). El canvas proponía título compacto y lentes fijas; Esteban eligió en chat **solo las lentes**.
**Fecha:** 2026-11-03
**Autores:** Esteban (decisión sobre R31), Claude Opus 5.5 (medición, implementación y redacción)
**Relación:** pieza MV2.20 de la tarjeta MV2.2 ([ADR 098](098-finko-movil-2-primera-entrega.md)). **Acota R31** ("sin barra superior fija"): la barra de lentes de un bloque es la única excepción. **Respeta** el [ADR 104](104-una-sola-barra-para-ir-de-lado.md) (una sola barra, 44 px, nunca se desliza), el [ADR 106](106-un-encabezado-tres-niveles.md) (el título y sus acciones no cambian) y el ADR 098 D12 (zona segura). Solo bajo 1024 px; escritorio no tiene barra de lentes.

---

## Contexto

Medido en la app real a 390 × 844 con 40 gastos del mes:

| Hallazgo | Medida |
|---|---|
| La lista es larga | Gastos mide 4.076 px (4,8 pantallas) |
| Las lentes se van pronto | la barra (Día a día, Por pagar, Límites) empieza a 139 px y mide 53: a los 192 px de desplazamiento ya no está |
| Volver a ellas cuesta | desde el final de la lista hay que subir unos 3.900 px; tocar "Gastos" en la barra inferior no sube |
| El resto es corto | Ahorro mide 1.363 px y Metas 1.080: hoy el caso es Gastos, pero la barra es la misma (ADR 104) |

La barra vive dentro del envoltorio de la cabecera (192 px en Gastos, 53 en las hijas de Ahorro): fijarla sin más la soltaba al salir ese envoltorio.

## Decisión

### D1. Al bajar, la barra de lentes queda pegada arriba

`position: sticky` sobre la zona segura superior, con su fondo de siempre. El título, la frase, el mes y el hero se van con la lista. Vale para las dos barras que existen: el bloque Gastos y las cuatro hijas de Ahorro.

### D2. R31 se acota, no se deroga

"Sin barra superior fija" sigue valiendo para todo lo demás: ningún título, aviso o acción se queda arriba. La excepción es la barra de lentes de un bloque, que es navegación (ADR 104) y mide 53 px.

### D3. El DOM no cambia

Bajo 1024 px los envoltorios de la cabecera pasan a `display: contents`, así la barra se queda pegada mientras dure la sección. El espacio entre la cabecera, el mes y la barra se conserva. Ningún selector de JavaScript ni de prueba cambia.

### D4. Lo que se lleva a la vista no queda debajo de la barra

Un salto a una fila (por ejemplo "Ver en Por pagar" desde Calendario) la deja debajo de la barra y no tapada por ella.

## Alternativas descartadas

- **Título compacto y lentes fijas** (lo que proponía el canvas). Unos 97 px fijos para decir lo que la lente vigente ya dice.
- **Sin barra fija, tocar la pestaña activa sube al tope.** R31 intacta, pero hay que saberlo.
- **Mover la barra fuera del envoltorio en JavaScript.** Cambiaba el DOM que leen tres módulos y sus pruebas, para lograr lo mismo que `display: contents`.

## Consecuencias

### Positivas

- Cambiar de lente desde cualquier punto de una lista larga es un toque.

### Negativas / Restricciones

- 53 px de alto fijo mientras se baja por una sección con lentes.
- Un envoltorio nuevo alrededor de la barra la volvería a soltar: tiene que ser `display: contents` o no existir.
