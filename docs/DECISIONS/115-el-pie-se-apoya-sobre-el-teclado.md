# ADR 115 - El pie se apoya sobre el teclado

**Estado:** Aceptada (2026-11-03). Pedido en chat: "vamos con el siguiente cambio de diseño", sobre la pieza MV2.5 del plan del canvas "Finko móvil: rediseño integral" (hallazgo C1 de la auditoría y "Hojas y formularios" del sistema visual). El canvas pedía elegir entre `visualViewport` e `interactive-widget`; se elige el primero. El canvas exigía la prueba en un iPhone real: Esteban la hizo sobre la vista previa de Vercel el mismo día ("Se ve bien") antes de publicar en `main`.
**Fecha:** 2026-11-03
**Autores:** Esteban (pedido), Claude Opus 5.5 (implementación y redacción)
**Relación:** pieza MV2.5 de la tarjeta MV2.2 ([ADR 098](098-finko-movil-2-primera-entrega.md)); **completa** su D8 (el pie pegado a la hoja), que dejó fuera el teclado. **Respeta** el ADR 098 D12 (zona segura) y la lección a pantalla completa del [ADR 092](092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) D7. Solo bajo 1024 px; escritorio no tiene teclado en pantalla.

---

## Contexto

| Hallazgo | Medida |
|---|---|
| El pie se esconde | a 375 × 667, con el teclado abierto en "Nuevo gasto" solo se ve el monto: "Guardar gasto" queda debajo del teclado (C1) |
| La causa | en iOS el teclado tapa la página sin achicarla, y la hoja es fija a toda la pantalla; Chrome en Android hace lo mismo desde que dejó de achicar la página por defecto |
| Lo que ya estaba | el pie pegado al borde de la hoja (ADR 098 D8), que sin teclado funciona |

En Chromium sin pantalla no hay teclado: la comprobación automática reemplaza `visualViewport` y le cambia el alto. Con un área visible de 508 px en una pantalla de 844, "Guardar gasto" queda con su borde inferior en 495.

## Decisión

### D1. La hoja se pega al área que se ve

`ui/teclado.js` lee `visualViewport` y, mientras el teclado tapa más de 120 px, deja en `<html>` la marca `data-teclado` y el área visible (`--fk-vv-alto`, `--fk-vv-arriba`). La hoja abierta toma ese alto y ese tope, así su pie queda encima del teclado. Sin teclado no queda nada y la hoja es la de siempre.

### D2. Un solo mecanismo para iOS y Android

`interactive-widget=resizes-content` en el viewport solo lo entiende Chrome en Android; iOS necesita `visualViewport` igual. Se usa este para los dos.

### D3. Lo que no es teclado no cuenta

La barra del navegador que aparece al desplazar (menos de 120 px) y la página ampliada con los dedos (`scale` mayor que 1) no mueven la hoja.

## Alternativas descartadas

- **`interactive-widget=resizes-content`.** No funciona en iOS, que es donde se midió el problema.
- **Mover el foco o desplazar el formulario al escribir.** El pie seguiría debajo del teclado.

## Consecuencias

### Positivas

- "Guardar" y "Cancelar" quedan a la vista mientras se escribe, en todas las hojas con pie.

### Negativas / Restricciones

- La prueba automática simula `visualViewport`; el iPhone real se probó a mano una vez. Un cambio en la hoja o en `ui/teclado.js` se vuelve a probar en un teléfono.
- Una hoja nueva con un alto propio fijo (como la lección a pantalla completa) tiene que quedar fuera de la regla o tomar el área visible.
