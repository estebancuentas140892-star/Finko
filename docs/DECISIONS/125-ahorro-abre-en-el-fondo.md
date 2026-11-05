# ADR 125 - Ahorro abre en el fondo: se retira la casa

**Estado:** Aceptada (2026-11-05). Aplicada el mismo día.
**Fecha:** 2026-11-05
**Autores:** Esteban (pedido y decisión), Claude Opus 5.5 (implementación y redacción)
**Relación:** **Supera** el [ADR 056](056-la-casa-de-ahorro.md) (la casa de Ahorro) y lo que el [ADR 009](009-consolidado-de-ahorro.md) restauró con DIS.18: Ahorro deja de tener portada. **Cambia** el [ADR 065](065-ahorro-en-la-barra-inferior.md) D1 y D3 (la entrada de la barra inferior abre el fondo y se resalta en las cuatro lentes) y el [ADR 069](069-bloque-gastos-en-la-barra-movil.md) D7 (la portada "sigue existiendo" deja de ser cierto). **Conserva** el [ADR 104](104-una-sola-barra-para-ir-de-lado.md): la barra de lentes, que pasa a ser la única forma de recorrer el bloque en el teléfono.

---

## Contexto

Al tocar "Ahorro" se abría la casa: los cuatro carriles (Fondo, Reservas, Metas e Inversión) con su gráfico, su acción y un "Ver todo" cada uno. "Ver todo" llevaba a la sección, que ya trae arriba la barra con las mismas cuatro modalidades. Esteban lo dijo en chat: la pantalla de los carriles muestra demasiada información de una vez, y la vista con la barra permite ver las cuatro opciones e ir pasando una a una. Pidió que Ahorro abra directo en esa vista.

La casa justificaba su lugar en dos cosas (ficha 04 de la auditoría móvil): era el único sitio donde los cuatro nombres convivían y desde donde se aportaba a una meta concreta sin entrar. Desde el ADR 104 los cuatro nombres conviven en la barra de cada sección, y aportar a una meta está a un toque dentro de Metas.

## Decisión

### D1. Ahorro abre en el fondo, en todos los anchos

- La entrada "Ahorro" de la barra inferior y la fila "Ahorro" de la barra lateral apuntan a `#fondo`, la primera de las cuatro en el orden de `MODALIDADES_AHORRO`. Las dos conservan `data-section="ahorro"` como nombre del grupo: ninguna se marca vigente por sí sola. En el teléfono se resalta la entrada de la barra inferior en las cuatro lentes (ADR 065 D3) y en escritorio la fila de la lente del sub-nivel.
- `#ahorro` sale de las rutas y entra a `REDIRECTS` del router: un marcador, un acceso de teclado (`g h`) o un enlace viejo llega al fondo y la barra de direcciones dice `#fondo`.
- Los enlaces que llevaban a la casa (la franja del plan de Límites, el motivo "Ahorro" sin tope y los dos accesos del fondo en "Distribuir tu ingreso") llevan a `#fondo`.

### D2. Se va la casa entera

- La sección `#sec-ahorro`, `renderCasaAhorro()` y sus gráficos, `casaAhorro()`, `diasAlProximoApartado()`, los estados de cada carril y `ETAPA_INVERSION` (`ahorro/logic.js` y `ahorro/view.js`), la acción `ahorro-ir-a-carril` y los estilos `.hub`, `.lane`, `.silrow`, `.silbtn` y `.grow`.
- El "‹ Ahorro" de las cuatro secciones: no hay pantalla de arriba a la cual subir. Ir de lado es la barra de lentes en el teléfono y el sub-nivel en escritorio.
- El dominio Ahorro deja de pintarse cuando cambian metas, reservas o inversiones: solo alimentaban la casa.
- Se quedan `MODALIDADES_AHORRO` (sin `icono` ni `proposito`, que solo usaba la casa) y `partirEtiquetaModalidad()`, que dan el orden y las etiquetas de la barra, e `infra/bolsas.js` e `infra/portafolio.js`, que Reservas e Inversión ya leen de ahí.
- Esteban aprobó en chat borrar el código y las pruebas que solo probaban la casa (unas 40 unitarias y 4 E2E); las demás se ajustaron a las cuatro lentes.

## Alternativas descartadas

- **Solo en el teléfono, con la casa viva en escritorio.** Dos comportamientos para la misma entrada y una pantalla mantenida para un solo ancho. Esteban eligió "en todos".
- **Dejar la casa sin mostrarla.** Código muerto con pruebas que lo sostienen; queda en el historial de git si se quiere volver.
- **Abrir en la última lente visitada.** Sería estado de UI que guardar y no lo pide nadie; el bloque Gastos también abre siempre en su primera lente.

## Consecuencias

- Lo que enseñaba la casa (para qué sirve cada modalidad y el total guardado) deja de verse junto. El rótulo `cuando` de cada modalidad sigue bajo el título de su sección (ADR 116 D4).
- El tablero de Ahorro de Claude Design ("Finko móvil · rediseño", `Diseño Finko/`) dibuja una "Casa de Ahorro" en tres pantallas: esas tres no se aplican; el resto del tablero se aplica sobre las cuatro lentes.
