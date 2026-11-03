# ADR 112 - Ajustes como índice en el teléfono

**Estado:** Aceptada (2026-11-03). Pedido en chat: "vamos con el siguiente cambio de diseño", sobre la pieza MV2.26 del plan del canvas "Finko móvil: rediseño integral" (Claude Design, "Plan de implementación" y hallazgo V5 de la auditoría). El canvas no la dibujó: Esteban eligió en chat la forma ("se despliega en su sitio") y el orden.
**Fecha:** 2026-11-03
**Autores:** Esteban (pedido, forma y orden), Claude Opus 5.5 (auditoría a 390 px, implementación y redacción)
**Relación:** cierra **CFG.6**, la auditoría móvil de Ajustes, que absorbe MV2.26. CFG.6 esperaba las fichas 17, 18 y 19 de MOV.1: el [ADR 101](101-finko-del-adulto-decide-no-ensena.md) sacó Logros del adulto, así que la 17 y la 19 ya no la tocan, y Esteban decidió no esperar la 18. **Cumple** R13 (grupos rotulados) y R14 (confirmar lo guardado). **Respeta** el [ADR 050](050-perfil-fiscal-ubicacion-y-framing.md) (el perfil fiscal sigue tras su botón), el [063](063-candado-de-acceso-local.md), el [043](043-sincronizacion-multidispositivo-y-cuentas.md), el [096](096-finko-en-la-nube-con-supabase.md), el [066](066-motor-unico-de-avisos.md) y el [099](099-inicio-movil-hoy-en-una-lista.md) D6 (la hoja del avatar lleva a su bloque). Ningún bloque cambia lo que hace. Escritorio no cambia.

---

## Contexto

Medido en la app real a 390 × 844, con perfil, dos cuentas, un ingreso y dos pagos fijos:

| Hallazgo | Medida |
|---|---|
| Una pila de bloques abiertos | 15 bloques en 5.376 px (6,4 pantallas) y 36 controles a la vista |
| Lo tuyo, al fondo | "La app" (cinco bloques) llena la primera pantalla y media: "Tu perfil" empieza a 1.355 px, "Familia" a 2.273 y la nube a 2.543 |
| Nada dice cómo está | el candado, la nube o el último respaldo se leen solo abriendo y leyendo su bloque |
| Atajos en el teléfono | "Atajos de teclado" mide 204 px, y su propio texto dice "En pantallas de escritorio" |
| Lo más largo | "Tus datos" mide 1.045 px; "Borrar todos mis datos" queda a 4.076 px |

Queda anotado y **no se decide acá**: "Acerca de Finko" dice "Finko no tiene servidor: nada de lo que escribes sale de tu teléfono" y el Centro Legal "tus datos solo en este dispositivo", 600 px debajo de "Guardar en la nube". Es de NUBE y del Centro Legal, cuando la nube deje de ser prueba.

## Decisión

### D1. Cada bloque es una fila con su estado (bajo 1024 px)

Título y, debajo, una línea con lo que el bloque ya sabe: el nombre, "Activo" o "Apagado", quién está en Familia (la frase de la hoja del avatar), "Conectada" o "Sin cuenta", el último respaldo (la frase que ya escribe "Tus datos"), el tema, el permiso de los recordatorios, la versión. Sin estado no hay línea. Las filas de un grupo forman una sola lista.

### D2. La fila se despliega en su sitio

Un botón dentro del título, con `aria-expanded` (patrón acordeón de WAI-ARIA). Pueden quedar varias abiertas, y lo abierto sobrevive al repintado del panel: cambiar el tema no cierra la fila. Los formularios y su cableado no cambian.

### D3. Lo tuyo primero

Bajo 1024 px los grupos van así: Tu cuenta, Familia, Tus datos, La app, Impuestos, Información. Ningún bloque cambia de grupo.

### D4. Atajos, solo con un puntero fino

Los atajos de una tecla funcionan solo donde hay mouse o trackpad (`any-pointer: fine`), como ya dice su texto, y su interruptor se ve con la misma condición, en todos los anchos. Sin puntero fino no hay atajo, así que WCAG 2.1.4 se cumple sin interruptor. Escape sigue cerrando hojas en todas partes.

### D5. Se abre sola la fila que pide algo

La nube a mitad de entrar (falta el código, falta decidir qué hacer con los datos, o un error) y el bloque al que lleva la hoja del avatar.

### D6. Escritorio no cambia

Desde 1024 px la vista pinta el panel de hoy, en su orden, y repinta al cruzar el corte.

## Alternativas descartadas

- **Abrir cada bloque en una hoja.** Mudaba los formularios del perfil, el candado y los datos, y había que volver a cablearlos.
- **Esconder "Atajos de teclado" y dejar los atajos activos.** En un teléfono con teclado bluetooth quedarían atajos sin forma de apagarlos.
- **Reordenar con `order` de CSS.** El lector de pantalla y el tabulador seguirían el orden viejo.

## Consecuencias

### Positivas

- Ajustes cabe en una pantalla y media cerrado, y cada fila dice cómo está sin abrirla.
- Un bloque nuevo entra como fila pasando su estado a `_fila()`.

### Negativas / Restricciones

- El panel tiene dos formas según el ancho; la de escritorio no se toca.
- El estado de cada fila se calcula al pintar: lo que cambia sin repintar el panel (la línea de sincronización de la nube) no se refleja en la fila.
