# ADR 121 - Buscar, la nube en el avatar y las pruebas del canvas

**Estado:** Aceptada (2026-11-04). Sexta y última tanda de la tarjeta **MV2.3**. Esteban decidió aplicar el canvas "tal cual como propone el HTML".
**Fecha:** 2026-11-04
**Autores:** Esteban (diseño y decisión), Claude Opus 5.5 (implementación y redacción)
**Relación:** sigue al [ADR 120](120-separador-de-miles-en-todos-los-campos-de-dinero.md). **Aplica** el recorrido 7 del canvas (encontrar un movimiento entre miles), las reglas de carga, conexión y sincronización del tablero 3, y las dos verificaciones que el tablero 6 pide para cerrar el plan (reflujo en seis anchos y zonas táctiles). Movimientos en escritorio conserva sus filtros ([ADR 076](076-movimientos-libro-mayor-con-sus-filtros-al-lado.md)); lo nuevo de la búsqueda vale en todos los anchos.

---

## Contexto

| Hallazgo del canvas | Lo que había |
|---|---|
| Recorrido 7: "antes de escribir: búsquedas recientes y atajos por categoría y por cuenta. Resultados: «4 resultados · $187.600», agrupados por mes con su total" | el campo buscaba, pero sin recientes ni atajos, sin cuántos ni cuánto, y cada mes decía su nombre con el año aunque fuera el actual |
| Tablero 3, sin conexión y sincronización: "la hoja del avatar dice «Sin conexión · tus cambios quedan en este teléfono y se envían al volver»" y "«En la nube hace 2 min»" | la fila "Copia en la nube" del avatar decía el correo o una invitación, nunca el estado |
| Tablero 3, carga: "solo si un render tarda más de 300 ms se muestran filas fantasma del mismo alto que las reales" | Movimientos con años de historial se quedaba en blanco mientras armaba la lista |
| Tablero 6: "ampliar reflow-320 a los seis anchos y a 320 × 568, con las cuatro semillas" y "un E2E de objetivos táctiles" | reflujo solo a 320 con una semilla; sin prueba de zonas táctiles |

## Decisión

### D1. Buscar en Movimientos

- **Antes de escribir**, al tocar el campo: "Buscaste antes" (las últimas cinco búsquedas, en `S.config.busquedasRecientes`), "Por categoría" (las cuatro más usadas y "Todas…") y "Por tipo y cuenta" (los tipos con movimientos y las cuentas). Cada atajo pone su filtro.
- **Con texto**: arriba de la lista, "N resultados · $X en todo tu historial" (o "en estas fechas" con un rango puesto), con lo que suman las salidas y las entradas por separado si hay de las dos.
- **Cada mes** dice su total neto ("Octubre −$187.600"), y el año solo si no es el actual.
- Una búsqueda se recuerda cuando se confirma (al salir del campo o con Enter) y dejó resultados.

### D2. La nube en la hoja del avatar

Con cuenta, la fila "Copia en la nube" dice el estado: "En la nube hace 2 min", "Hay cambios por subir: se suben solos en un momento" o, sin red, "Sin conexión · tus cambios quedan en este teléfono y se envían al volver". Sin cuenta no dice nada nuevo. El estado lo anota el dominio de la nube en `infra/nube.js`, que la hoja ya lee.

### D3. Filas de espera

Movimientos pinta filas fantasma del alto de una fila real y arma la lista en el cuadro siguiente cuando el historial pasa de 1.500 movimientos, el tamaño desde el cual armarla en un teléfono de gama media pasa de 300 ms (PERF.1). Son quietas: el catálogo de animación prohíbe los bucles.

### D4. Las dos pruebas del plan

- `reflow-320.test.js` recorre las secciones en 320 × 568, 360, 375, 390, 414 y 430 de ancho con cuatro semillas (vacío, poca, normal y la de `scripts/perf/seed.js`): ninguna desborda a lo ancho.
- `zonas-tactiles.test.js`: a 390, en cada sección, ningún control visible mide menos de 44 px de alto sin una zona sensible que llegue a 44 (R4), y ninguna barra de opciones esconde opciones con desborde (R9).

La segunda encontró seis controles bajo 44: en el teléfono `.btn-sm` sube a 44 de alto, y el atajo de la franja de Límites, "Elegir fecha" de una meta y el historial de abonos de Me deben ganan la zona sensible de los enlaces ([ADR 116](116-lo-que-faltaba-del-canvas-primera-tanda.md) D7).

## Alternativas descartadas

- **Guardar las búsquedas fuera de `S`.** Escribir `localStorage` directo rompe el ADN 5; una lista corta en `config` viaja con el respaldo y la nube.
- **Filas de espera por tiempo medido.** El armado ocupa el hilo principal: un temporizador de 300 ms no alcanza a dispararse antes de que termine. Se decide por tamaño, que es lo que predice el tiempo.

## Consecuencias

### Positivas

- Encontrar un movimiento entre miles cuesta un toque desde los atajos.
- El estado de la nube se ve donde se mira la cuenta.
- El reflujo y las zonas táctiles quedan vigilados por la suite.

### Negativas / Restricciones

- `S.config.busquedasRecientes` es un campo nuevo, opcional y sin migración.
- Un control nuevo de menos de 44 px hace fallar `zonas-tactiles.test.js` hasta que tenga su zona.
