# ADR 198 - Gastos accesible

**Estado:** Aceptada (2026-11-22).
**Fecha:** 2026-11-22
**Autores:** Esteban (pedido: que lo hecho sirva a personas con discapacidad, como quien no ve o quien tiene temblor por Parkinson), Claude Opus 5.5 (auditoría e implementación)
**Relación:** Completa los [ADR 190](190-el-plan-de-deudas-del-lienzo.md) a [ADR 197](197-las-opciones-en-una-linea.md) (las pantallas del lienzo y GAS.16) con las reglas de accesibilidad de Finko: R4 (zonas de 44 px, [ADR 121](121-buscar-la-nube-en-el-avatar-y-las-pruebas-del-canvas.md) D4), contraste AA ([ADR 123](123-la-hoja-de-formulario-completa.md) D3) y A11Y.5 (axe en los formularios). Ajusta los colores de cinco marcas del catálogo (SUS.1a, [ADR 146](146-finko-reconoce-el-tipo-de-gasto.md)).

---

## Contexto

La auditoría del 2026-11-22 recorrió las hojas de Gastos en el teléfono, en oscuro y en claro: axe (WCAG 2.0, 2.1 y 2.2, A y AA), la zona de toque de cada control medida tocando (los seudo-elementos que la agrandan cuentan; lo que la tapa, no) y el nombre accesible frente a lo que se ve. La base estaba bien: foco atrapado en la hoja y el fondo inerte, foco al título al cambiar de pregunta, avisos al guardar, "¿Salir sin guardar?" ante un cierre por accidente, movimiento reducido y reflow a 320 px. Pero axe solo miraba la primera pantalla de seis formularios y las zonas táctiles solo las secciones: los pasos del gasto fijo, las facturas y "Nuevo límite" no tenían control.

Encontró: la barra de pasos con botones de 82 x 18 px (WCAG 2.5.8 pide 24; R4, 44); el contraste de las iniciales de cinco marcas, del avatar de una persona en "Nueva deuda", de las iniciales del nombre escrito sobre la factura y del monto de la parte elegida en "Nuevo límite"; la tecla "000" llamada "Tres ceros" (2.5.3: quien usa control por voz dice lo que ve); y controles de 24 a 42 px en "Cada cuánto", "Otra", el nombre sin empresa, "Nuevo límite" y la papelera de la ficha del fijo.

## Decisión

### D1. Zonas de toque de 44 px sin cambiar cómo se ve nada

- La barra de pasos: el botón de cada paso cubre su celda (la barra y el nombre) y 8 px arriba y abajo.
- "Cada cuánto" y "Otra" pasan a 44 px de alto; el campo del nombre sin empresa llena su tarjeta.
- En "Nuevo límite", el riel, las partes y los montos sugeridos conservan su tamaño y su zona llega a 44 con un seudo-elemento (que se mide desde dentro del borde: se suma su grosor); el campo del monto tiene al menos 44 de ancho.
- La papelera de la ficha del fijo va en la capa de la ✕, junto a ella: la zona que se desplaza recortaba su parte de arriba.
- En la tarjeta de Fijos y Deudas, la zona del mes crece hacia arriba y la del ojo hacia abajo, y la fila del mes lleva 2 px más de aire: con una cifra corta el ojo queda justo debajo del mes y las dos zonas se montaban.

### D2. Contraste AA

- Las marcas que se muestran con iniciales llegan a 4,5:1: YouTube Music (#EB0000), Triple A (#0B7BBA), Gases de Occidente (#1C7AB9) y Surtigas (#007ABC, texto blanco) bajan su tono entre 5 y 8 %; ViX conserva su naranja con texto oscuro. Las que tienen logo dibujado son logotipos y no cambian.
- Las iniciales de una persona en "Nueva deuda" mezclan el tono de Deudas con el color del texto; las del nombre escrito sobre la factura usan la tinta del papel, que siempre es claro; el monto de la parte elegida va en el gris secundario.

### D3. El nombre accesible empieza por lo que se ve

La tecla "000" se llama "000, tres ceros"; la cifra de la factura dice "$85.000 cada semana. Cambiar"; el monto de la factura del gasto lleva "Cambiar el monto" como texto para el lector, después de la cifra; "Ver historial completo de movimientos".

### D4. Pruebas que lo vigilan

`tests/e2e/a11y-gastos.test.js`, en oscuro y en claro: el gasto fijo de la cifra a la factura, el gasto del día a día, "Nuevo límite", las cuatro pestañas, la ficha del fijo y "Nueva deuda", con axe sin violaciones graves y cada control habilitado con 44 x 44 px de zona. En `marcas.test.js`, toda marca con iniciales llega a 4,5:1.

## Alternativas descartadas

- **Agrandar a la vista los controles a 44 px:** cambia lo que dibujó el lienzo; la zona invisible cumple igual para el dedo.
- **Dejar las iniciales de marca fuera por ser logotipos:** son texto que reemplaza a un logo que no tenemos; con un tono 5 % más oscuro se leen.

## Consecuencias

- Sin cambios de datos guardados: los colores son del catálogo de marcas, no de lo que la persona registró.
- Lo que ninguna prueba automática asegura queda para hacer en el teléfono: un recorrido con TalkBack (gasto fijo completo y un límite) y otro con Voice Access. "Elegir es seguir" (un toque avanza solo) se compensa con "Revisar" antes de guardar y con volver atrás, pero conviene probarlo con alguien con temblor.

## Ajustes al aplicar

- **D1:** los pasos que aún no se pueden tocar (deshabilitados) no cuentan como zona de toque. La papelera, en la capa de la ✕, ya no se desplaza con la ficha: queda arriba, como la ✕.
