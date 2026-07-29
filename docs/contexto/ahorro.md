# Ficha de contexto: Ahorro

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## Fondo de emergencia (dominio `ahorro`, J.1)

- **Objetivo**          : activar/editar un fondo de emergencia con meta en meses de gastos fijos, registrar aportes, definir un compromiso mensual ("págate primero") con sugerencia calculada (AH.2), y mostrar la tasa de ahorro del mes con un nudge según el rango. El dominio dibuja además **la casa de Ahorro** (bloque aparte en esta ficha), que reemplazó al consolidado repetido del hub.
- **Estado actual**     : estable. **Su ruta es `#fondo` desde DIS.18** (2026-07-28): `#ahorro` es la casa. **DIS.16 cerrada** (2026-07-28): el hero pasó a `.fondo-card` y la sección dejó de medirse en porcentaje para medirse en **tiempo**. El anillo de progreso se retiró; lo sustituyen los bloques de mes (la prueba) y la escalera de tres niveles (el camino). Cuatro de los seis estados del mockup están construidos; los otros dos dependen de datos que Finko no guarda (ver Riesgos). **DIS.12 cerrada** (2026-07-27): las 9 correcciones de la auditoría de diseño de la sección; su capa de hero la reemplazó DIS.16, el resto (consolidado, lista de aportes, compromiso, formulario) sigue vigente. **BUG-012 corregido** (2026-07-11): el mensaje de confirmación al desactivar el fondo ya no usa el literal técnico "empty state" (ADN 11: lenguaje humano). **AH.5a cerrada** (2026-07-22): "Registrar aporte" prellena el monto con la sugerencia de AH.2. El resto de la iniciativa "Fondo de emergencia v2" (brief 2026-07-08, `docs/BOARD.md`) sigue pendiente de análisis en **AH.5**.
- **Verificado contra** : commit `979bdc0` DIS.18 (2026-07-28).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| API pública, acciones, coordinación logic+view | `modules/dominio/ahorro/index.js` | `initAhorro()`, `_activarFondo()`, `_editarFondo()`, `_desactivarFondo()` | ~495, ~258, ~262, ~295 |
| Aportes (registrar/eliminar; monto prellenado AH.5a) | `modules/dominio/ahorro/index.js` / `view.js` | `_nuevoAporte()`, `_eliminarAporte()`, `renderFormAporte({fecha, sugerencia})` | ~320 |
| Compromiso mensual + sugerencia (AH.2) | `modules/dominio/ahorro/index.js` | `_editarCompromisoMensual()`, `_usarAporteSugerido()` | |
| Cálculos puros (objetivo, progreso, colchón, tasa, sugerencia) | `modules/dominio/ahorro/logic.js` | `calcularObjetivoFondo()`, `calcularProgresoFondo()`, `mesesDeColchon()`, `calcularTasaAhorro()`, `calcularAporteSugerido()` | |
| Casa de Ahorro (DIS.18; ver su bloque) | `modules/dominio/ahorro/logic.js` / `view.js` | `casaAhorro()`, `renderCasaAhorro()` | |
| Render principal (estado 1 + tarjeta del fondo) | `modules/dominio/ahorro/view.js` | `renderAhorro()`, `_renderEmptyState()`, `_renderFondoCard()` | ~56, ~169, ~221 |
| Las piezas de la tarjeta (DIS.16) | `modules/dominio/ahorro/view.js` | `_renderNivelActual()`, `_renderCobertura()`, `_renderEscalera()`, `_renderVeredictoFondo()`, `_renderDatosFondo()`, `_pieCobertura()` | |
| Los tres niveles y su estado (DIS.16) | `modules/dominio/ahorro/logic.js` | `NIVELES_FONDO`, `nivelesFondo(mesesCubiertos)` | ~133 |
| El tiempo dicho en palabras y su prueba (DIS.16) | `modules/dominio/ahorro/logic.js` | `mesesEnPalabras()`, `fechaCobertura()`, `bloquesCobertura()` | |
| Sección de hábito (aportes + compromiso + nudge de tasa) | `modules/dominio/ahorro/view.js` | `_renderHabitoSection()`, `_renderNudgeTasa()` | ~232, ~294 |
| Formularios modales (fondo, aporte, compromiso) | `modules/dominio/ahorro/view.js` | `renderFormFondo()`, `renderFormAporte()`, `renderFormCompromisoMensual()` | ~341, ~386, ~428 |
| Schema del fondo/aportes | `modules/core/state.js` | `S.ahorro.fondoEmergencia`, `S.ahorro.aportes`, `S.ahorro.compromisoMensual` | |

**Recursos**: estilos en `styles/components/*.css` (clases `.fondo-card__*` desde DIS.16, `.ahorro-habito__*`, `.casa-ahorro__*` desde DIS.18, `.nudge`), más `.modal__footer-secundario` en `styles/modals.css` (DIS.12, fila de la acción destructiva del formulario) y dos bloques en `styles/responsive.css`: la fila de la casa dentro de `@media (max-width: 767px)` y los 44px de `.fondo-card__secundaria`, que van ahí porque compiten con `.btn-sm` del mismo archivo (regla R4, mismo motivo de capa que Apartados e Inversión); iconos vía sprite (`icon()`, `tejaCategoria('i-ahorro', 'ahorro')`, `emptyArt('ahorro')`); token de dominio `--fk-dom-ahorro`. **`progressRing()` ya no se usa acá**: DIS.16 retiró el anillo.

**Dependencias y relaciones**: `ahorro` no importa de otros dominios (ADN 10); `gastosFijosMensuales` y `tasaAhorro` los calcula `index.js` a partir de `S.compromisos`/`S.ingresos`/`S.gastos` recibidos como parámetros de `renderAhorro()`. Escucha `state:change` de `ahorro`, `compromisos`, `ingresos`, `gastos`, `metas`, `apartados` e `inversiones` (el objetivo depende de fijos; las filas de la casa, de las otras 3 modalidades). Escucha `EventBus.on('distribucion:aplicar', ...)` para sumar aportes del asistente de distribución de Mis Cuentas (MC.7e): el aporte al fondo NO descuenta cuenta (ADR 009, el dinero "se queda" donde está).

**Riesgos**:

- **El aporte al fondo no descuenta saldo de cuenta** (decisión ADR 009, distinta de Metas/Apartados que sí descuentan): el texto `.fondo-card__nota` lo explica en la UI. Cualquier cambio futuro que iguale el comportamiento con Metas/Apartados requiere revisar ese ADR primero.

- **Dos de los seis estados del mockup no se pueden construir hoy** (DIS.16). El estado 4 quiere decir "tardaste 14 meses en llegar" y el estado 5 quiere explicar el retroceso ("tus gastos subieron de $1.460.900 a $1.680.000, así que el mismo dinero te cubre menos tiempo: no perdiste nada"). Los dos necesitan datos que `S.ahorro` no guarda: **cuándo se alcanzó cada nivel** y **con qué gasto fijo se calculó el nivel anterior**. Son dos campos, no un historial, y el propio informe de diseño los deja anotados para implementación. Sin ellos, cuando suben los gastos fijos la tarjeta baja el porcentaje sin explicar por qué: el nivel logrado sí se conserva (`nivelesFondo()` corta contra meses cubiertos, no contra el objetivo), que es la mitad importante del problema.

- **`nivelesFondo()` no depende de la meta del usuario.** La escalera es fija en 1, 3 y 6 meses aunque alguien apunte a 4: la escalera es el camino posible y la meta es su situación elegida. Si un cambio futuro las acopla, el estado "meta cumplida" deja de tener siguiente tramo y la tarjeta vuelve a apagarse al llegar (regla R67).

- **"Desactivar fondo" se queda en el formulario, no vuelve a la tarjeta.** El mockup de DIS.16 lo dibuja en el renglón secundario junto a "Editar", pero DIS.12 lo bajó a su propia fila dentro del modal con `.btn-danger` (regla R53), y esa decisión es posterior al mockup. Subirlo a la tarjeta pondría una acción destructiva al lado de una de rutina.
- **`_desactivarFondo()` conserva los datos** (`activo: false`, no borra `montoActual`/`aportes`): al reactivar, `renderFormFondo` precarga los valores previos. El mensaje de confirmación (corregido en BUG-012) debe seguir comunicando esto sin usar jerga técnica.
- **Lenguaje humano (ADN 11) en mensajes de `confirmar()`**: a diferencia del HTML de las vistas (revisado en cada PR), los textos de `confirmar({ mensaje: ... })` no pasan por ningún linter de copy; un grep periódico de literales técnicos (`empty state`, `placeholder`, `null`, `undefined`, `TODO`) en `index.js`/`acciones/*.js` de todos los dominios es la única red de seguridad hoy (ver Nota de BUGS.md).
- **El consolidado repetido y su barra ya no existen** (DIS.18): eran un componente compartido por las cuatro secciones y la regla R54 medía sus pistas. Su reemplazo, la casa, vive en un solo sitio y no dibuja proporciones. Los riesgos propios de la casa están en su bloque.
- **El anillo del hero NO puede volver a envolverse en `aria-hidden`** (regla R52): `progressRing()` emite su propio `role="img"` con la etiqueta que construye el llamador, y ocultar el contenedor borra el subárbol entero. Metas ya lo corrigió en DIS.13; Apartados sigue con el defecto a la espera de su auditoría.
- **AH.5a solo alcanza a "Registrar aporte"**: el compromiso mensual sigue con su propio botón "Usar este monto" (`ahorro-usar-sugerido`) en vez de prellenado directo; son dos formularios con propósito distinto (uno es un recordatorio, el otro un movimiento real) y no se fusionaron a propósito.

**Cambios pendientes**: **los estados 4 y 5 del mockup de DIS.16** y los dos campos que los habilitan (fecha de cada nivel alcanzado, gasto fijo de referencia), que pasan por triaje antes de ser tarjeta. El resto de **AH.5** (rediseño UX educativo del fondo; la integración del aporte con "Distribuir mi ingreso" ya existe vía `EventBus.on('distribucion:aplicar', ...)`, `docs/BOARD.md`).

**Cambios realizados**:

- 2026-07-28 (**DIS.18**, la casa de Ahorro): la sección se muda de `#ahorro` a `#fondo`, pierde la franja de pestañas y el slot del consolidado, y gana `.section__volver`. `consolidarAhorro()` pasa a `casaAhorro()`. Detalle en el bloque de la casa. Ver CHANGELOG.

- 2026-07-28 (**DIS.16**, arquitectura I con la prueba de H, auditoría de diseño por secciones): la sección deja de medirse en porcentaje y pasa a medirse en tiempo. `.fondo-card` sustituye al hero, el anillo se retira, entran los bloques de mes y la escalera de tres niveles, y todo el lenguaje se reescribe sin decimales de mes ni etiquetas de sistema. `nivelesFondo()`, `mesesEnPalabras()`, `fechaCobertura()` y `bloquesCobertura()` nuevas en `logic.js`. Ver CHANGELOG.

- 2026-07-27 (**DIS.12**, auditoría de diseño de la sección, 9 hallazgos A1 a A9, todos aplicados): la barra del consolidado dejaba pistas de 13, 35, 48 y 52px a 390px, así que el relleno del 16% se dibujaba más largo que el del 51% (A1, regla R54 nueva, se corrige apilando la fila en `responsive.css`; medido después, 310,2px de pista en las cuatro y rellenos de 158,2 / 71,3 / 49,6 / 27,9); los cuatro vehículos dejan los emoji del sistema operativo por el símbolo del sprite teñido con el token de su dominio (A2, `_VEHICULO_META` pasa de `emoji` a `icono` y el `<li>` declara `data-vehiculo`); "Desactivar fondo" ocupaba el sitio de Cancelar con el mismo `btn-ghost` y al editar no había Cancelar, así que la salida y la destrucción eran el mismo gesto (A3, regla R53 nueva, clase nueva `.modal__footer-secundario` + `.btn-danger`); el `aria-hidden` del contenedor del anillo borraba el `role="img"` y la etiqueta que el propio código construía (A4, regla R52 nueva, etiqueta ampliada a "N% de tu objetivo"); la lista de aportes ponía el monto como título y adopta la anatomía de R2 con teja, fecha como título y `list-item__amount` (A5); el compromiso mensual cambia `i-deudas` por `i-recurring` (A6); el aviso de nivel alto pasa a `role="alert"` (A7, regla R55 nueva); el enlace "Ver →" sube de 18 a 44px de zona activa (A8, regla R4); y se borran cuatro reglas de CSS muerto del hero (A9). 15 tests unitarios nuevos. Verificado en el navegador a 375px, tema oscuro. **Queda abierta la mitad de A8**: `responsive.css` fija `.btn-sm` en 36px con un comentario deliberado y la R4 pide 44; el informe lo sube a decisión del usuario, no a corrección. SW v429 a v430. Ver CHANGELOG.
- 2026-07-22 (**AH.5a**, quick win de la auditoría de UX/producto, patrón P1, mismo movimiento que AP.5a en Apartados): `_nuevoAporte()` calcula `_construirSugerenciaAporte()` (el mismo cálculo AH.2 que ya alimentaba la caja de sugerencia del compromiso mensual) y lo pasa a `renderFormAporte({ fecha, sugerencia })`, que prellena `value` del campo de monto cuando `sugerencia.monto > 0` y cambia el hint para explicar el prellenado, sin perder la explicación de que el aporte no descuenta cuentas (ADR 009). Sin sugerencia (fondo sin gastos fijos registrados, `objetivo <= 0`) el campo queda vacío como antes. 6 tests unitarios nuevos (`ahorro.test.js`: 4 sobre `renderFormAporte()` puro + 2 de integración vía `dispatch()` con el fondo activo). Verificado en la app real: fondo con $800.000/mes en fijos mostró $184.000 prellenado (sin ingresos registrados, base `sin-ingreso` de AH.2) con el hint correcto, campo editable. Ver también AP.5a (Apartados) en la misma rebanada, CHANGELOG.
- 2026-07-11 (BUG-012): el mensaje de confirmación de `_desactivarFondo()` decía "...la sección vuelve a mostrar el empty state..." (jerga técnica visible al usuario, violaba ADN 11). Cambiado a "...la sección vuelve a mostrar la pantalla inicial para activarlo...". Grep de literales técnicos (`empty state`, `placeholder`, `TODO`, `null`, `undefined`) sobre mensajes/títulos de `confirmar()` en todo `modules/`: este era el único caso real, el resto de coincidencias eran comentarios de código o nombres de variable (`null` como valor de tipo, `placeholder` como atributo HTML legítimo). 1 test unitario nuevo en `tests/unit/ahorro.test.js` (falla sin el fix, verificado con stash). SW v345 → v346.

---

## Casa de Ahorro (dominio `ahorro`, hub `#ahorro`)

- **Objetivo**          : responder "cuánto tengo guardado en total y dónde" en una sola pantalla, y ser la puerta a las cuatro modalidades. Es el único lugar donde los cuatro nombres conviven, así que también es donde se enseña la diferencia entre ellos.
- **Estado actual**     : estable. **DIS.18 cerrada** (2026-07-28): nace la pantalla. Reemplaza al consolidado de solo lectura que se repetía en las cuatro secciones hijas (F6, ADR 024 D4) y restaura la intención del [ADR 009](../DECISIONS/009-fondo-de-emergencia.md).
- **Verificado contra** : commit `979bdc0` DIS.18 (2026-07-28).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Filas, propósito y estado por modalidad | `modules/dominio/ahorro/logic.js` | `casaAhorro()`, `MODALIDADES_AHORRO`, `_estadoFondo()`, `_estadoMetas()`, `_estadoApartados()`, `_estadoInversion()` | ~102 |
| Próximo cobro de Apartados sin importar ese dominio | `modules/dominio/ahorro/logic.js` | `diasAlProximoApartado(apartados, hoyISO)` | |
| Render de la pantalla | `modules/dominio/ahorro/view.js` | `renderCasaAhorro()`, `_htmlCasaAhorro()` | ~55 |
| Slot y sección | `index.html` | `#sec-ahorro`, `#panel-casa-ahorro` | |
| Volver a la casa desde cada hija | `index.html` | `.section__volver` en `#sec-fondo`, `#sec-metas`, `#sec-apartados`, `#sec-inversion` | |
| Rutas | `modules/infra/router.js` | `SECTIONS`: `ahorro` a `sec-ahorro`, `fondo` a `sec-fondo` | ~11 |
| Rótulo del botón "Más" por sección | `modules/ui/shell.js` | `SECCION_NAV`, `MAS_SECTIONS` | ~20 |

**Recursos**: `.casa-ahorro__*` en `styles/components/domain.css` (color por `[data-vehiculo]`, misma clave que la teja de cada sección) y su bloque móvil en `styles/responsive.css`; `[data-section="fondo"]` en `styles/layout.css` para el acento de navegación; símbolos `i-ahorro`, `i-metas`, `i-apartados`, `i-inversion`, `i-chevron-right`; lee `S.ahorro`, `S.metas`, `S.apartados`, `S.inversiones` y `S.config.ocultarSaldo`.

**Dependencias y relaciones**: `renderCasaAhorro(gastosFijosMensuales)` la invoca `_renderAhorroBound()` y `_renderSegunSeccion()` con `renderSmart(..., 'ahorro')`. El view suma los montos de las cuatro slices inline: no importa Metas, Apartados ni Inversión (ADN 10), y las funciones de estado son puras y reciben conteos ya calculados.

**Riesgos**:

- **La fila de Inversión cuenta inversiones, no dice su etapa.** El mockup mostraba "construyendo", que sale de `momentoInversion()` en el dominio Inversión: importarlo rompe ADN 10 y replicarlo duplicaría el cálculo que **ARQ.1** existe para unificar. Cuando ARQ.1 mueva el modelo de las cuatro bolsas a `infra/`, la etapa se puede leer sin duplicar nada.
- **El orden de las filas es fijo y las cuatro se muestran siempre**, también en cero: una modalidad que no aparece no se puede descubrir, y ese descubrimiento es la mitad del propósito de la pantalla. Filtrar por monto (lo que hacía `consolidarAhorro()`) devuelve el defecto.
- **`_estadoApartados()` chequea el tipo antes de convertir.** `Number(null)` es 0 y 0 días significa "vence hoy": sin ese chequeo, un apartado sin fecha se anuncia como si venciera hoy. Hay test que lo fija.
- **`#ahorro` cambió de dueño.** Un enlace que quiera el fondo tiene que apuntar a `#fondo` (hoy: `analisis/view.js` y `inversiones/view.js`). Los bookmarks viejos a `#ahorro` llegan a la casa a propósito: suben un nivel, no se pierden.

**Cambios pendientes**: **promover "Ahorro" a la barra inferior** queda sin decidir (hoy vive en "Más"); mover Calendario para hacerle sitio es una decisión de otra sección. El nombre **"Apartados"**, que colisiona con "apartar" (el verbo genérico de ahorrar en toda la app), quedó señalado y sin resolver: es lenguaje de producto y toca varias pantallas.

**Cambios realizados**:

- 2026-07-28 (**DIS.18**, informe "Arquitectura Tu ahorro total", arquitectura 3 de 4 evaluadas): nace la pantalla; el fondo se muda a `#fondo`; se retiran `.hub-tabs` y `[data-hub-consolidado]` de las cuatro hijas y cada una gana `.section__volver`; las 4 tejas del grupo "Ahorros" en "Más" pasan a una a ancho completo (el sidebar de desktop las conserva como atajos declarados); `consolidarAhorro()` pasa a `casaAhorro()` con orden fijo y sin esconder modalidades. Ver CHANGELOG y [ADR 056](../DECISIONS/056-la-casa-de-ahorro.md).
