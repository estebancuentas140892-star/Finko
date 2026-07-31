# ADR 057 - Inicio en escritorio: el reparto se decide por ancho, no por dispositivo

**Estado:** Aceptada el 2026-07-31. Esteban aprobó las cuatro decisiones al revisar el handoff de la auditoría de navegación global.
**Fecha:** 2026-07-31
**Autores:** Esteban (decisión), Claude Design (auditoría de navegación global, informes "Inicio 1 a 3"), Claude Opus 5 (verificación contra el código, medición y formalización).
**Origen:** los informes `Inicio 1 - Diagnostico`, `Inicio 2 - Propuesta` e `Inicio 3 - Comparativa` del handoff `Auditoría navegación global Finko-handoff/`, cerrados el 2026-07-31 con 12 hallazgos, 8 decisiones (ID1 a ID8) y 10 pendientes (PI1 a PI10).
**Relación:** **acota** el [ADR 034](034-inicio-v2.md) en tres de sus decisiones (D1 orden dentro de "Atención hoy", D4 acordeón del detalle por cuenta, D7 fusión de accesos y actividad). No lo revierte: el ADR 034 sigue vigente y sigue siendo la fuente del diseño de Inicio. Aplica el [ADR 024](024-reorganizacion-navegacion-movil.md) (el botón de registrar ya tiene su lugar canónico) y hereda los tokens del [ADR 031](031-identidad-de-color-por-seccion.md).

---

## Contexto

El ADR 034 diseñó "Inicio v2" contra un mockup de 390px. Su propia nota lo dice: "el mockup es móvil; en escritorio se conserva el bento de columnas actual con el mismo orden de lectura (detalle por rebanada, sin decisión nueva de layout desktop)". Esa decisión pendiente nunca se tomó, así que escritorio heredó el reparto de móvil estirado sobre 12 columnas.

La auditoría midió el resultado a 1280px y a 1920px. Cuatro de los siete bloques de Inicio ocupan `bento__cell--full` y solo dos usan ese ancho para algo: el hero mide 990 x 299 a 1280 y 1.376 x 299 a 1920, donde lo único que crece son los flancos. Las siete barras del resumen semanal miden 44px en móvil y 177px a span 12 en 1920, donde la semana deja de tener forma de semana.

Ningún bloque de contenido es exclusivo de una plataforma: los siete existen en las dos y dicen lo mismo. Lo que cambia es cómo se reparten, y eso lo decide el ancho disponible.

## Decisión

### D1. Cero celdas de ancho completo en el bento de Inicio

El reparto de escritorio usa `span 4` y `span 6`. Una celda se gana el ancho completo solo si contiene algo cuyo tamaño dependa del ancho (una tabla, una lista de varias columnas, un texto largo); si su contenido tiene tamaño fijo, la celda va acotada. Es la regla **R78** que el informe deja para el design system.

No hay componentes nuevos ni datos nuevos: la propuesta entera es reparto.

### D2. "Atención hoy" agrupa por tipo de componente, y el orden del ADR 034 D1 se ajusta en las dos plataformas

El grupo pasa a dos filas de dos: los dos avisos (`#panel-distribuir-inicio` y `#panel-limites`) comparten la primera, y las dos listas (`#panel-vencidos` y `#panel-prioridades`) la segunda.

Esto **cambia el orden que fijó el ADR 034 D1**, que puso las alertas de límites al final del grupo. El cambio es de marcado compartido, así que aplica también en móvil: límites sube de la cuarta a la segunda posición. Se acepta porque es coherente con el principio que el propio D1 declaró ("lo accionable sube, los atajos bajan") y las alertas de límites son accionables, no un atajo.

La alternativa de reordenar solo en escritorio con `order` de CSS **se rechaza**: divorciaría el orden de foco del orden visual y arriesga WCAG 2.4.3 en una app con accesibilidad medida en 100.

**Medición que sostiene la decisión** (1280px, los cuatro paneles visibles, mismo contenido):

| Escenario | Grupo "Atención hoy" | Bento completo |
|---|---|---|
| Antes | 541px | 1.680px |
| Avisos a `span 6` sin reordenar | 588px | 1.727px |
| Avisos a `span 6` y reordenados | **459px** | **1.598px** |

Sin el reorden el cambio empeora el alto: un aviso de 66px emparejado con una tarjeta de 322px estira la fila y rompe la que hoy ya comparten vencidos y prioridades. El reparto solo funciona con los dos avisos adyacentes.

### D3. El acordeón del detalle por cuenta queda acotado a móvil

El ADR 034 D4 definió el detalle por cuenta como un pill que expande in situ, colapsado por defecto y con estado solo de UI en memoria. Esa decisión **sigue siendo correcta donde se tomó**: a 390px expandir es la única forma de mostrar cuatro cuentas sin sacar al usuario de la pantalla.

En escritorio hay una columna libre de 316px justo al lado del hero, así que el mismo contenido va ahí y deja de ser un estado. Es la regla **R80**: un acordeón es una respuesta al ancho escaso; donde hay ancho, el contenido va al lado.

El D4 no se revierte, se acota. Lo que se conserva sin cambios: la máscara de privacidad cubre el total y cada cuenta juntos (extensión de IN.2), el ojo no se mueve, y el texto "efectivo + N cuentas bancarias" sigue apareciendo solo cuando el detalle no se está mostrando.

### D4. La fusión de accesos rápidos y actividad reciente queda acotada a móvil

El ADR 034 D7 fusionó los dos bloques en un solo `bento__cell` para ahorrar una tarjeta donde el alto es el recurso escaso. En escritorio el alto también es escaso, pero sobra ancho: separarlos en dos columnas ahorra alto en vez de gastarlo.

En escritorio, accesos rápidos ocupa `span 4` en la primera fila, en lista vertical (a 316px la grilla de tejas cae a dos columnas y deja un hueco), y actividad reciente ocupa `span 6` en la fila final, junto al resumen semanal. Ese ancho devuelve al gráfico la proporción con la que se diseñó: 49px por barra a span 6 contra 44px en móvil. Es la regla **R79**: un gráfico se dimensiona por la forma de su dato, no por el ancho de su celda.

El límite de filas de actividad pasa de 5 a 8 en escritorio. No es un dato nuevo ni una consulta nueva: `movimientosRecientes()` ya recibe el límite por parámetro.

## Lo que queda fuera de este ADR

**ID4 (ocultar `.perfil-inicio` en escritorio) e ID7 (carril de urgencias a partir de 1.680px) no se deciden acá.** Los dos dependen de una barra superior permanente de escritorio que no existe en el código: verificado el 2026-07-31, no hay ningún `topbar` en `styles/` y `.perfil-inicio` es hoy el único encabezado de Inicio en las dos plataformas, incluido el acceso a Ajustes. Ocultarlo ahora dejaría la pantalla sin saludo, sin marca y sin esa entrada. Quedan registrados en la tarjeta **INT.1** del tablero, con la auditoría Interfaz como fuente.

**El copy del estado vacío de escritorio queda provisional.** La estructura se aprueba (una pieza centrada de 620px con tres pasos, contra una guía de móvil que se diluye en 990px); el texto se escribe en una revisión de UX Writing que cubra toda la app, para no fijar un tono en una sola pantalla.

**Dos decisiones de token siguen abiertas y viajan con INT.1:** si `--fk-bg-glass` gana un valor propio en tema claro o se retira del design system, y dónde se corrige el contraste de los tokens `--fk-dom-*` (medido en 3,23:1 y 2,65:1 contra el mínimo de 3:1 de WCAG 1.4.11, hallazgo IT12 del informe). Corregirlos desde Inicio cambiaría trece secciones de golpe, así que merecen su propia tarjeta de accesibilidad.

## Alternativas rechazadas

| Alternativa | Por qué se rechaza |
|---|---|
| Cambiar el orden de los bloques del bento | El ADR 034 D1 lo decidió por rol y ninguna medición lo cuestiona. Lo único que se ajusta es el orden **dentro** de "Atención hoy" (D2), no la secuencia de los bloques. |
| Reordenar solo en escritorio con `order` de CSS | Divorcia el orden de foco del orden visual: riesgo WCAG 2.4.3. |
| Reemplazar el mini gráfico por uno más grande en escritorio | A `span 6` el actual ya funciona, y un componente distinto por plataforma rompe la consistencia sin comprar nada. |
| Mover el ojo de privacidad | El ADR 034 D3 lo fijó en una posición estable a propósito. |
| Darle a Inicio un botón de registrar propio | Ya vive en la barra inferior en móvil ([ADR 024](024-reorganizacion-navegacion-movil.md)). Un tercer punto de entrada solo en Inicio rompe "un destino, un camino canónico". |
| Meter Análisis en Inicio | Fuera del rol que el ADR 028 le dio a la pantalla. |

## Consecuencias

- **Móvil cambia en un solo punto:** el orden de las alertas de límites dentro de "Atención hoy" (D2). Todo lo demás queda idéntico, incluidos el acordeón del hero, la fusión de accesos y actividad, el límite de 5 filas y el estado vacío.
- **El marcado del bento es compartido**, así que D2, D3 y D4 tocan `index.html` y no solo estilos. Varios tests de Inicio afirman posición: la suite completa (unit y E2E) es compuerta de cada rebanada.
- **La máscara de privacidad pasa a cubrir dos celdas** en escritorio en vez de una. La garantía sigue siendo la del test de IN.8c: ningún saldo real toca el DOM oculto.
- **Tablet (768 a 1.023px) sigue sin auditar.** Con este ADR el hueco crece: hay un reparto de 12 columnas para 1024 en adelante y uno de 1 columna para 767 hacia abajo. El bento ya define 6 columnas en ese rango y las clases existentes lo cubren, pero ninguna medición lo respalda.
- **Estados vacíos parciales** (con cuentas pero sin gastos, con gastos pero sin deudas) siguen sin cubrir en las dos plataformas.
- Las reglas **R78, R79 y R80** entran a `DESIGN_SYSTEM.md`, sección Principios, al cerrar la iniciativa.

## Implementación

Iniciativa **IN.9** del tablero, en cinco rebanadas verificables por separado: IN.9a (D2), IN.9b (límite de filas), IN.9c (D3), IN.9d (D4 y la fila final), IN.9e (estado vacío).
