# ADR 056 - Ahorro es una pantalla, no un encabezado repetido

**Estado:** Aceptada el 2026-07-28. Esteban pidió implementar la arquitectura del informe "Arquitectura Tu ahorro total" de la auditoría de diseño por secciones.
**Fecha:** 2026-07-28
**Autores:** Esteban (decisión), Claude Design (informe "Arquitectura Tu ahorro total", hallazgos H1 a H9), Claude Opus 5 (verificación contra el código e implementación).
**Origen:** informe de arquitectura de información sobre el bloque "Tu ahorro total" y la navegación del hub de ahorro, 2026-07-28. Es la quinta y última pasada de la auditoría por secciones, después de DIS.14 (Metas), DIS.15 (Apartados), DIS.16 (Fondo) y DIS.17 (Inversión).
**Relación:** **restaura** la intención del [ADR 009](009-consolidado-de-ahorro.md) F6 ("una vista consolidada de solo lectura en el tope de la sección Ahorro", en singular). **Supersede el D4 del [ADR 024](024-reorganizacion-navegacion-movil.md)** (hub de cuatro pestañas y consolidado como cabecera común) y **revisa su D6** (las cuatro entradas directas del sidebar). Respeta el [ADR 007](007-dominio-apartados.md): las cuatro modalidades siguen siendo secciones separadas con arquitecturas propias. No pisa **ARQ.1** (unificación de la infraestructura de las cuatro bolsas), que declara explícitamente no ser un rediseño de pantallas.

---

## Contexto

El ADR 009 resolvió F6 con una card consolidada de solo lectura "en el tope de la sección Ahorro". El ADR 024 D4, seis meses después, la convirtió en **cabecera común de cuatro secciones** y le agregó una franja de pestañas, con un argumento razonable en su momento: cero cambios de router.

Medido a 390px, el costo real de esa composición era:

| Síntoma | Medición |
|---|---|
| Encabezado idéntico antes del contenido propio, en las 4 secciones | 316px (38px de pestañas + 278px de card) |
| Título de la sección | a 365px del tope |
| Primer elemento de la lista | a 433px, el 51% de la primera pantalla |
| Caminos hacia una modalidad hermana | 3 (pestañas, enlaces "Ver" del consolidado, menú "Más") |
| Área táctil del salto entre secciones | 18px el enlace, 39px la pestaña |

La causa no era la card ni las pestañas: era que **el concepto padre no tenía dirección**. "Tu ahorro total" responde una pregunta de nivel superior, y como no existía un nivel superior donde ponerla, se copió en las cuatro hijas. De ahí salen la repetición, las pestañas (que existen para saltar de lado cuando no se puede subir) y el hecho de que **ninguna pantalla mostrara los cuatro nombres juntos**: la app terminó enseñando su propia taxonomía en los estados vacíos de Metas y Apartados, que se remiten entre sí, o sea en la pantalla a la que el usuario llegó equivocado.

## Decisión

**Un concepto que agrupa tiene pantalla propia. `#ahorro` es la casa de las cuatro modalidades; el fondo de emergencia se muda a `#fondo`.**

1. **Nace la sección Ahorro** (`#ahorro`, `#sec-ahorro`): el total guardado una sola vez, y las cuatro modalidades como filas navegables. No es un componente nuevo: es el contenido que ya existía, puesto en su sitio.
2. **Las filas del desglose se vuelven la navegación.** Ya lo eran a medias, con un enlace de 18px. Ahora la fila entera es el destino, con área táctil completa, y desaparecen las barras de participación: el reparto en porcentaje no ayuda a decidir a dónde entrar.
3. **Cada fila lleva una línea de para qué sirve.** Resuelve la taxonomía sin agregar texto: lo mueve desde los estados vacíos, donde se enseñaba cruzado, al único lugar donde los cuatro nombres conviven y se pueden comparar.
4. **Cada fila lleva su estado en su propia unidad:** meses cubiertos (Fondo), metas en curso (Metas), días al próximo cobro (Apartados), inversiones abiertas (Inversión). Un resumen sirve para decidir sin entrar.
5. **Las cuatro filas se muestran siempre, también en cero.** `consolidarAhorro()` ordenaba por monto y escondía las modalidades vacías, que es correcto para un desglose y erróneo para una puerta: lo que no aparece no se puede descubrir. Lo reemplaza `casaAhorro()`, con orden fijo de taxonomía.
6. **Desaparecen la franja de pestañas y la card consolidada repetida.** Cada sección hija abre con **volver a Ahorro** (`.section__volver`, el patrón que ya usaba Movimientos): en una PWA instalada no hay botón "atrás" del navegador, así que hasta hoy desde Metas no había salida vertical, solo lateral.
7. **En "Más", las cuatro tejas del grupo "Ahorros" se reducen a una,** a ancho completo. La elección entre modalidades deja de tomarse en un menú global y se toma dentro del tema.
8. **En el sidebar de desktop, la casa encabeza el grupo y las cuatro entradas directas se conservan** (`nav-item--no-mobile`): son atajos declarados a destinos que la casa también ofrece, no rutas paralelas con otro aspecto. El problema medido era de móvil, y ahí la única entrada es la casa.
9. **El título pasa de "Tu ahorro total" a "Todo lo que tienes guardado"** y pierde el subtítulo que enumeraba las cuatro fuentes: las cuatro filas están justo debajo.
10. **`#ahorro` no redirige.** Un bookmark viejo llega a la casa, que enlaza al fondo en su primera fila: sube un nivel, no se pierde.

**El costo, dicho sin adornos:** pasar de Metas a Apartados sube de uno a dos toques. Es el único empeoramiento. Se acepta por frecuencia: el peaje de hoy (316px de repetición en cada visita a cualquiera de las cuatro) se paga siempre, mientras que el toque extra se paga solo al saltar entre modalidades, que son intenciones distintas y rara vez consecutivas.

## Consecuencias

- El consolidado se renderiza en un sitio en vez de cuatro, y la navegación entre modalidades deja de existir como componente (`.hub-tabs` se borra de `layout.css` y de las cuatro secciones).
- Una quinta bolsa futura es una fila más en una lista, no una quinta pestaña en una barra que ya estaba llena.
- Las cuatro secciones hijas abren en su contenido: el título de Metas pasa de 365px a 68px del tope, y su primera tarjeta de 433px a 128px (medido a 375px).
- **La fila de Inversión cuenta inversiones en vez de decir su etapa.** El mockup mostraba "construyendo", que sale de `momentoInversion()` en el dominio Inversión: importarlo rompe la regla ADN #10 y replicarlo duplicaría el cálculo que ARQ.1 existe para unificar. Queda pendiente de ARQ.1, no de esta decisión.
  - **Resuelta el 2026-08-02 en dos pasos.** **ARQ.1c** bajó el corte que decide la etapa a `infra/portafolio.js` (`etapaDePortafolio()`), que la casa lee sin importar el dominio Inversión y sin copiar el criterio. **AH.8** ejecutó la fila: dice `2 inversiones, construyendo`, o sea **el conteo del D4 más la etapa del mockup**, no una en lugar de la otra. El conteo solo no decía en qué va el usuario, que es lo que sí dicen los otros tres; la etapa sola no dice el tamaño de lo que construyó, y la fila existe para decidir si vale la pena entrar. El D4 no se revierte: se completa. Las dos palabras (`aprendiendo`, `construyendo`) son las mismas del chip de la sección hija a propósito, con un test que falla si las dos pantallas se separan.
- Quedan dos temas señalados y sin resolver, los dos por fuera del alcance de una sección: **promover "Ahorro" a la barra inferior** (implicaría mover Calendario, decisión de otra sección) y el nombre **"Apartados"**, que colisiona con "apartar", el verbo genérico de ahorrar en toda la app.
- Cinco reglas nuevas en [`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) (R70 a R74): son de arquitectura de información, no de componente, así que van en Principios.

## Actualización (INT.1b, 2026-08-03, acota el D8)

El ADR 059 D6 acota, no revierte, el punto 8: en el sidebar de desktop las cuatro entradas directas dejan de ser **permanentes** y pasan a **contextuales**, anidadas bajo la casa (`.nav-subnav`) y desplegadas solo mientras el hash activo pertenece al grupo. Motivo: medidas y sin funcionalidad nueva, las cuatro filas costaban ~160px de sidebar todo el tiempo aunque el usuario estuviera en Gastos o Calendario (BUG-026). Siguen siendo atajos declarados a destinos que la casa también ofrece, nunca rutas paralelas: el punto 8 se cumple igual, solo que el sidebar ya no las paga cuando no aplican.

## Alternativas consideradas

Las cuatro arquitecturas posibles, evaluadas contra los mismos criterios en vez de afirmar una:

| | 1 · Como estaba | 2 · Cuatro en la nav principal | 3 · Una sección "Ahorro" | 4 · Una sola lista |
|---|---|---|---|---|
| Caminos a un destino | 3 | 1 | **1** | 1 |
| El padre tiene dirección | No | No hay padre | **Sí** | Sí |
| Repetición entre hermanas | 316px x 4 | Se elimina, y con ella el consolidado | **Ninguna** | Ninguna |
| Dónde se compara el total | En las cuatro | **En ninguna** | En su casa | En la lista |
| Costo al cambiar de modalidad | 1 toque | 1 toque | 2 toques | 0 |
| Cabe en la barra inferior | Sí (no estaba) | **No: 8 destinos** | Sí | Sí |
| Respeta el ADR 007 | Sí | Sí | **Sí** | **No** |
| Respeta las 4 arquitecturas aprobadas | Sí | Sí | **Sí** | **No** |

- **Opción 2, cada modalidad como sección de la navegación principal.** Descartada: la barra inferior tiene cuatro destinos y el botón de registrar, todos de uso diario. Promover las cuatro exigiría ocho entradas, el doble del máximo razonable en móvil, y competirían con Gastos o Calendario, que se usan a diario, cuando una meta se visita cada quince días. Dicho de otro modo: la app ya era la opción 2 con la promoción faltante, y las pestañas eran el sustituto improvisado de esos cuatro slots que nunca hubo.
- **Opción 4, una sola lista donde cada elemento declara su tipo.** Descartada: choca de frente con el ADR 007 (mezclar estos conceptos diluye el propósito de cada uno) y borraría el trabajo de DIS.14 a DIS.17, donde cada bolsa recibió una arquitectura distinta porque mide cosas distintas.
- **Dejar las pestañas y solo agregar la casa.** Descartada: dos formas de llegar al mismo destino con aspecto distinto es el hallazgo H1, no su solución. Si al usarlo resulta que el salto lateral es frecuente, la respuesta no es devolver las pestañas: es que la casa sea lo bastante buena como para que volver a ella no moleste.
- **Casa en `#ahorros` (plural), dejando el fondo en `#ahorro`.** Descartada: la colisión Ahorro/Ahorros es justo la que el ADR 024 D4 intentó cerrar renombrando la sección a "Fondo de emergencia". Con el fondo en `#fondo`, cada ruta nombra lo que muestra.
