# ADR 167 - Gastos fijos: el monto de Día a día, las categorías de Colombia y "Otros" sin adornos

**Estado:** Aceptada (2026-11-18).
**Fecha:** 2026-11-18
**Autores:** Esteban (pedido "Gastos fijos", puntos 1 a 4), Claude Opus 5.5 (investigación, diseño e implementación)
**Relación:** **Cambia** el [ADR 014](014-taxonomia-categorias-transversal.md): D2 y su validación del 2026-07-13 (Mercado, Transporte y Mascotas dejan de tener "doble cara": viven solo en Día a día) y D7 en Gastos fijos ("Otro" pasa a "Otros", sin nombre ni ícono propios). **Retira** el CAT.2f (ícono elegido para "Otro" en un fijo). **Extiende** el [ADR 146](146-finko-reconoce-el-tipo-de-gasto.md) D3 (selector de plataforma) a Servicios públicos, Medicina prepagada, Seguros y Gimnasio, y el [ADR 142](142-formularios-por-tarea.md) D5 con la opción `data-cifra`. Conserva la lista cerrada de no esenciales (Streaming y Suscripciones).

---

## Contexto

Esteban (2026-11-18) pidió cuatro cosas para Gastos fijos: (1) que la zona del monto se vea igual que en Día a día; (2) ordenar las categorías según los gastos fijos más comunes en Colombia, con las empresas más conocidas como opciones (EPM en servicios públicos, por ejemplo); (3) que "Otros" no pida ícono ni descripción, porque para personalizar ya existe "Categoría nueva"; (4) sacar de fijos lo que es del día a día (mercado y transporte cambian cada semana; un arriendo casi nunca), con un criterio de frecuencia y variabilidad.

Lo que se encontró: el formulario del fijo usaba la caja de monto del armazón de preguntas (título grande a la izquierda, caja con borde y "Usar el teclado del teléfono"), mientras Registrar gasto centra la pregunta sobre una cifra grande, la lee en palabras y deja el teclado de Finko abajo, sin salida al del sistema (ADR 156 D4). El catálogo de fijos tenía 15 categorías, tres de ellas variables (Mercado, Transporte, Mascotas), y solo Streaming, Suscripciones, Telefonía e Internet ofrecían empresas.

**Investigación (2026-11-18).** DANE: alojamiento y servicios públicos son el rubro más grande del gasto de los hogares (28,7 %, ENPH 2016-2017), 40,4 % de los hogares vive en arriendo y 65,6 % tiene internet (ECV 2024); planes de celular e internet domiciliario están entre lo que más compran. CRC y prensa 2025: Netflix y Disney+ lideran el streaming, seguidas de Prime Video y HBO Max. MinTIC: Claro lidera el internet fijo; Tigo y Movistar se fusionaron bajo Millicom. Acemi: Colsanitas lidera la medicina prepagada y Sura las pólizas de salud; unos 4,7 millones de personas pagan un plan voluntario. Superservicios y gremios: EPM, Enel, Vanti, Gases de Occidente, Gases del Caribe, Alcanos, Surtigas y Efigas son las empresas de energía y gas con más usuarios; Air-e y Afinia atienden el Caribe. Smart Fit y Bodytech son las cadenas de gimnasios más grandes. Los colores de cada empresa se tomaron de su web (CSS, `theme-color` o el logo).

## Decisión

### D1. El monto del fijo es el de Registrar gasto

En el teléfono, "¿Cuánto pagas?" se ve como "¿Cuánto gastaste?": la pregunta al centro, la cifra grande que crece con lo escrito, su lectura en palabras ("Márcalo con el teclado de abajo" mientras está vacía) y el teclado de Finko abajo, sin "Usar el teclado del teléfono". Lo que falta se dice en la lectura, en rojo. Se pide con `data-cifra` en el bloque del dinero (`ui/preguntas.js`, `_montarCifra`): el armazón esconde el título grande en esa pregunta y conserva el progreso y "Nuevo gasto fijo · 1 de 4". El pie ("Siguiente") es el del armazón, común a todos los formularios de crear. Escritorio no cambia.

### D2. Las categorías de un gasto fijo

Un gasto fijo es un pago con fecha cuyo valor casi no cambia de un mes a otro. Quedan 16, en este orden: Arriendo, Administración, Servicios públicos, **Internet y TV**, **Celular**, Streaming, Suscripciones, Educación, Seguros, **Medicina prepagada**, **Seguridad social**, **Impuestos**, Gimnasio, **Servicio doméstico**, Cuota de manejo y **Otros**.

- **Salen** Mercado, Transporte y Mascotas: varían cada semana y ya viven en Día a día con sus subcategorías (GAS.5c).
- **Entran** Medicina prepagada (prepagada o póliza de salud), Seguridad social (la planilla de quien trabaja por su cuenta), Impuestos (predial y vehicular, una vez al año) y Servicio doméstico. Son fijos que pagan muchos hogares y no tenían casa.
- **Cambian de nombre** "Internet" a "Internet y TV" (los paquetes de hogar traen los dos) y "Telefonía" a "Celular" (la palabra que usa la gente). "Celular" hereda la decisión de esencial de "Telefonía".
- **Educación queda en las dos secciones**: la pensión del colegio es fija; útiles y libros, del día a día.

### D3. "Otros" es una categoría más

Sin selector de ícono y sin nombre propio: el fijo se llama "Otros" y lo que se escriba va a la nota de "Más opciones", como en cualquier categoría. Quien quiere nombre e ícono crea una categoría nueva. Ningún fijo guarda `icono` al tener categoría.

### D4. Lo que ya está guardado (schema v55)

- "Internet", "Telefonía" y "Otro" se renombran; un fijo que se llamaba como su categoría se llama como la nueva.
- Un "Otro" con nombre propio ("Pensión colegio") queda **sin categoría**, con su nombre y su ícono: así se veía, y sin categoría el nombre lo escribe el usuario. Al editarlo, el ícono se conserva mientras siga sin categoría.
- Mercado, Transporte y Mascotas no se tocan: siguen válidas para los fijos que las tienen (`CATEGORIAS_AGENDA_RETIRADAS`) y su chip aparece solo al editar uno de ellos (precedente CAT.1c).
- Una categoría propia de fijos con el nombre de una nativa nueva ("Impuestos") se retira y sus fijos toman la nativa. Las propias de Día a día no se tocan.
- Los nombres retirados tampoco se pueden usar para una categoría propia.

### D5. Las empresas de cada categoría

| Categoría | Empresas (en el orden del selector) |
|---|---|
| Servicios públicos | EPM, Enel, Vanti, Acueducto de Bogotá, Emcali, Air-e, Afinia, Celsia, Triple A, Gases del Caribe, Gases de Occidente, Efigas, Surtigas, Alcanos, ESSA, CHEC |
| Internet y TV | Claro, Movistar, Tigo, ETB, DirecTV, Starlink |
| Celular | Claro, Movistar, Tigo, ETB |
| Streaming | las de antes y Win+ Fútbol |
| Medicina prepagada | Colsanitas, Colmédica, Sura, Coomeva, Allianz |
| Seguros | Sura, Allianz, Seguros Bolívar, Mapfre, AXA Colpatria, HDI Seguros, Seguros del Estado, La Previsora |
| Gimnasio | Smart Fit, Bodytech, Spinning Center |

Entran con iniciales sobre el color de la empresa hasta tener el vector de Esteban (regla de fidelidad del ADR 025 D5). Enel (logo en degradado), Alcanos, DirecTV, Starlink, Allianz y AXA Colpatria llevan un color aproximado. Los aliases son frases propias: "bolivar", "estado" o "compensar" a secas pintarían la teja en textos que no hablan de la empresa. Elegir una empresa le da el nombre al fijo ("EPM"), como ya pasaba con Netflix.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Mantener la doble cara de Mercado y Transporte (ADR 014) | Es lo que el pedido señala: un valor que cambia cada semana no es un gasto fijo y confunde al elegir dónde anotarlo. |
| Pasar el "Otro" con nombre propio a "Otros" con su nombre en la nota | La fila de Por pagar dice solo el nombre: varios fijos se verían como "Otros". Sin categoría se ven como antes. |
| Crear una categoría propia por cada "Otro" con nombre | Crearía categorías que el usuario no pidió. |
| Un campo opcional "¿Cómo se llama?" en "Otros" | El pedido quita ese cuadro: personalizar es "Categoría nueva". |
| WOM en Celular | Perdió el nombre en Colombia en 2026 (orden de la SIC) y no hay uno nuevo confirmado. "Otra" lo cubre. |
| Compensar en Medicina prepagada | Lidera los planes complementarios, que son otro producto, y "compensar" es un verbo común: su alias pintaría la teja en textos cualquiera. |
| Selector de bancos en Cuota de manejo | Los bancos viven en otro catálogo (`BANCOS_CO`); queda fuera de este pedido. |
| Llevar `data-cifra` a todos los formularios de crear | El pedido habla del fijo; la opción queda lista para los demás. |

## Consecuencias

- El fijo se anota con los mismos gestos que un gasto del día a día.
- Quien registra un servicio en Medellín, Bogotá, Cali o la costa encuentra su empresa con un toque, y el fijo lleva su nombre.
- La migración v55 no borra nada: cambia nombres, deja sin categoría el "Otro" con nombre propio y retira las categorías propias que repetían una nativa.
- Sin vector, 34 empresas se ven con iniciales hasta que Esteban entregue sus logos.
- Novedades 768: "Tus gastos fijos, más ordenados".
