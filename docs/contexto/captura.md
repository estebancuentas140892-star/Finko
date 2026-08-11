# Ficha de contexto: Captura (formularios y selector de ícono)

> Revisado: 2026-08-11.

> Cómo se capturan datos en un formulario de la app: el lenguaje visual compartido de los formularios y el selector de ícono que varios de ellos incrustan. Partida de `transversal.md` el 2026-07-24. Reglas de uso y plantilla en [`README.md`](README.md).
>
> **Qué NO buscar acá:** qué categorías existen y a qué sección pertenecen (eso es la taxonomía CAT.1, en [`transversal.md`](transversal.md)); la identidad de color y las tejas de marca (en [`sistema-visual.md`](sistema-visual.md)).

---

## Lenguaje de formularios v2 (FORM.1, [ADR 042](../DECISIONS/042-formularios-v2-visual.md))

- **Objetivo**          : un mismo lenguaje de captura para los formularios de la app (handoff "Formularios v2" de Claude Design): monto hero protagonista, categoría con chips de ícono (nunca un select nuevo), fecha con atajos Hoy/Ayer/Otra fecha, teja de dominio junto al título del modal y footer con el primario a lo ancho.
- **Estado actual**     : **FORM.1a CERRADA** (2026-07-15): fundación CSS + Registrar gasto (flagship). Pendientes **FORM.1b** (Nueva deuda) y **FORM.1c** (Nuevo gasto fijo), tarjetas en el BOARD. Los demás formularios migran cuando su iniciativa los toque (ADR 042 D6); regla vigente: ningún formulario nuevo introduce un select de categoría.
- **Verificado contra** : FORM.1a (2026-07-15).

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| Componentes del lenguaje | `styles/components/forms.css` | bloque "FORMULARIOS V2" (`.modal__teja`, `.monto-hero*`, `.chips-cat`/`.chip-cat*`, `.fecha-chips`/`.chip-fecha`, `.modal__footer--principal`, `.form-empty__teja`) | tinte por `--fk-section-accent` (variante `-text`, declarada por `[data-dom]` en `modals.css`, mecanismo IV.2b): el componente se tiñe solo según el modal que lo aloja |
| Excepción móvil del input gigante | `styles/responsive.css` | `.input.input--big-amount` dentro de la media query de inputs | la capa `responsive` le gana por ORDEN a `components`: toda excepción móvil de inputs vive ahí, no en `forms.css` |
| Primer consumidor (flagship) | `modules/dominio/gastos/view.js` | `renderFormGasto()` | detalle en la ficha [`gastos.md`](gastos.md), bloque "Formulario de gasto" |
| Estado seleccionado de chips | `styles/components/forms.css` | `.chip-cat:has(.chip-cat__radio:checked)` | patrón calibrado D.16b (tinte 12% + borde 50% + texto primario); radio oculto DENTRO del label, foco vía `:has(:focus-visible)` |
| Bloque de errores | `modules/infra/form-errors.js` | `mostrarErroresForm()` | sin cambios: su `.form-errors` ya coincide con la anatomía del mockup; la grilla de chips se marca vía `.chips-cat:has(.field-invalid)` |

**Dependencias y relaciones**: consume `--fk-section-accent` (IV.2b/ADR 031) y el patrón de selección D.16b; convive con el selector de cuenta (`renderSelectorCuenta`, conservado a propósito, ADR 042 D3) y el picker de ícono CAT.2. **Conflicto de ADR 042 D9 resuelto (AP.5, 2026-08-01):** el brief de Apartados pedía dropdown de categoría; ganaron los chips por ser la convención ya escrita del lenguaje v2 (`renderFormApartado()`, ver [`apartados.md`](apartados.md)).

**Riesgos**:

- **Radios ocultos**: los chips son labels; `element.value` sobre `[name="categoria"]` devuelve el primer radio. Leer siempre vía FormData o iterando radios. En E2E se clickea el label, no `check()` del input.
- **Transiciones vs lecturas síncronas**: `.chip-cat` transiciona background/border; una lectura de `getComputedStyle` inmediata tras cambiar `checked` (o en un tab en segundo plano) devuelve el valor inicial. Verificar estados con E2E o con `transition: none` temporal.

**Cambios pendientes**: FORM.1b (deuda), FORM.1c (gasto fijo).

**Cambios realizados**:

- **FORM.1a (2026-07-15)**: fundación CSS + Registrar gasto v2 + fix del hueco preexistente de `responsive.css` (el 16px anti-zoom achicaba `.input--big-amount` en móvil, también en el ingreso puntual). Ver [CHANGELOG](../CHANGELOG.md).

---

---

## Selector compacto de ícono (CAT.2, iniciativa transversal)

- **Objetivo**          : un solo componente reutilizable para elegir un ícono de categoría/entidad personalizada en cualquier formulario de la app: un recuadro (ícono elegido o placeholder vacío) que, al tocarlo, despliega una grilla colapsable de íconos; elegir uno cierra la grilla y actualiza el recuadro. Reemplaza el patrón de TX.9b (Gastos), que mostraba la grilla completa (29 íconos) SIEMPRE visible en cuanto se elegía "+ Otra categoría", invasivo en pantalla (punto del brief CAT.2). Seis consumidores identificados en el triaje: Gastos (ya tenía selección propia, TX.9b), Gasto fijo/Calendario (hoy sin ícono en "Otro", solo texto libre), Deudas (categoría "Otra"/"Otro" con ícono fijo `c-otros`, sin elección del usuario), Mis cuentas (banco "Otro" con fallback de iniciales "?", sin ícono elegible), Apartados y Metas (ambos con un `<input type="text" maxlength="4">` para pegar un emoji a mano, dependiente del selector de emojis del sistema operativo, Win+.).
- **Estado actual**     : **CAT.2 COMPLETA, CAT.2a a CAT.2f CERRADAS (2026-07-13)**. CAT.2a: componente compartido `infra/icon-picker.js` (`renderIconoPicker`/`wireIconoPicker`/`resetIconoPicker`/`setIconoPickerValor`) construido y migrado como primer consumidor en **Gastos** (TX.9b), reemplazando la grilla siempre-visible por el recuadro colapsable. CAT.2b: **Metas** migrada (categoría "Otra"): `meta.icono` ahora puede guardar un id de símbolo del sprite (elegido con el picker) O un emoji crudo (metas viejas, backward-compat sin bump de schema, ver Riesgos). CAT.2c: **Apartados** migrado (nombre del apartado): el `<input type="text" maxlength="4">` para pegar un emoji a mano se reemplaza por el picker en la columna angosta del layout existente (el panel pasa a popover flotante, no reflowa el form); las **plantillas rápidas** (SOAT, Regalos...) conservan su propio catálogo de 17 emojis curados (más específico que el genérico de 29 íconos del picker) vía `setIconoPickerValor`, nuevo en esta rebanada para fijar un valor externo sin pasar por la grilla. CAT.2d: **Deudas** migrada (categoría "Otra"/"Otro"), a diferencia de los 3 consumidores previos esta rebanada AGREGA una capacidad (antes "Otra"/"Otro" caía al ícono fijo `c-otros`, sin elección posible): `compromiso.icono` nuevo, campo opcional siempre explícito (`null` si no aplica, nunca ausente) para que sobreviva el merge shallow de `editar()`. CAT.2e: **Mis cuentas** migrada (banco "Otro"), misma naturaleza que CAT.2d (agrega elección, no reemplaza campo existente) con un hallazgo adicional: `cuenta.icono` YA EXISTÍA en el schema, pero era dato muerto (`_iconoPorBanco()` asignaba un emoji que ningún render leía). Esta rebanada reutiliza el campo con semántica nueva (id de sprite solo para "Otro") y hace que `bancoAvatar()` lo lea de verdad; el emoji legado de cuentas viejas se descarta con un guard de forma (`/^[a-z]-[a-z0-9-]+$/`) para no romper la teja con un `<use href="#💚">` inválido. CAT.2f: **Gasto fijo/Calendario** migrado (categoría "Otro"), sexto y último consumidor, cierra la iniciativa: alcance mínimo decidido con Esteban (triaje 2.7), mismo patrón que CAT.2d/2e sin tocar `CATEGORIAS_AGENDA`. `normalizarCompromiso()` ganó `base.icono` también en la rama `tipo==='fijo'` (antes solo existía para deudas); `_renderDetalleItem()` (Calendario) e `iconoPorOrigen()` (herencia de ícono TX.6/TX.7: un gasto nacido de pagar un fijo hereda su ícono) resuelven `compromiso.icono` antes que `CATEGORIA_AGENDA_ICONO`. El checklist de "Distribuir mi ingreso" no necesitó ningún cambio: ya generalizaba por `it.icono` sin distinguir tipo desde CAT.2d. Sin modal anidado a propósito (mismo criterio que TX.9b ya declaraba en su comentario original): un panel dentro del mismo formulario, no un overlay nuevo (evita además el bug latente de foco anidado que ya existe en los pickers dinámicos de `cuenta-helper.js`, cuyo `trapFocus`/`releaseFocus` es singleton, no una pila). La creación de categorías nombradas nuevas (no solo el ícono de "Otro") en cualquier dominio queda para **CAT.3**.
- **Verificado contra** : commit de CAT.2f (2026-07-13).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Componente compartido: render puro (recuadro + panel + input oculto) | `modules/infra/icon-picker.js` | `renderIconoPicker(iconos, opts)` | |
| Componente compartido: wiring (abrir/cerrar panel, elegir ícono) | `modules/infra/icon-picker.js` | `wireIconoPicker(container, opts)` | |
| Componente compartido: reset externo (limpiar selección, ej. al ocultar el campo) | `modules/infra/icon-picker.js` | `resetIconoPicker(container)` | |
| Componente compartido: fijar un valor externo ajeno al catálogo (ej. plantillas) | `modules/infra/icon-picker.js` | `setIconoPickerValor(container, valor, previewHtml)` | |
| Consumidor 1: form de gasto con categoría nueva | `modules/dominio/gastos/view.js` | `renderFormGasto()` (usa `renderIconoPicker`) | |
| Consumidor 1: wiring en el modal de gasto | `modules/dominio/gastos/index.js` | `_montarFormGasto()` (usa `wireIconoPicker`) | |
| Consumidor 2: form de meta, categoría "Otra" | `modules/dominio/metas/view.js` | `renderFormMeta()` (usa `renderIconoPicker`), `_iconoMeta()` (renderiza sprite-id o emoji legado) | |
| Consumidor 2: wiring + reset condicionado a la categoría | `modules/dominio/metas/index.js` | `_inyectarForm()` (usa `wireIconoPicker`), `_syncCategoriaMeta()`/`_nuevaMeta()` (usan `resetIconoPicker`) | |
| Consumidor 3: form de nuevo apartado (nombre + ícono) | `modules/dominio/apartados/view.js` | `renderFormApartado()` (usa `renderIconoPicker`, `label: ''`), `_iconoApartado()` (renderiza sprite-id o emoji) | |
| Consumidor 3: wiring + plantillas rápidas | `modules/dominio/apartados/index.js` | `_inyectarFormApartado()` (usa `wireIconoPicker`), `_aplicarPlantilla()` (usa `setIconoPickerValor`) | |
| Consumidor 4: form de deuda, categoría "Otra"/"Otro" | `modules/dominio/compromisos/views/formularios.js` | `renderFormDeuda()` (usa `renderIconoPicker`, grupo oculto salvo categoría "otra") | |
| Consumidor 4: wiring (mostrar/ocultar según categoría) + normalización | `modules/dominio/compromisos/index.js`, `logic/modelo.js` | `_wireIconoOtraCategoria()`, `normalizarCompromiso()` (guarda `compromiso.icono`) | |
| Consumidor 4: ícono resuelto en la lista (teja + chip) | `modules/dominio/compromisos/views/lista.js` | `_renderCompromisoItem()` (`compromiso.icono` antes que `_ICONO_DEUDA[categoria]`) | |
| Consumidor 5: form de nueva cuenta, banco "Otro" | `modules/dominio/tesoreria/views/cuentas.js` | `renderFormCuenta()` (usa `renderIconoPicker`), `_bankAvatarHtml()` (pasa `cuenta.icono` a `bancoAvatar`) | |
| Consumidor 5: wiring (mostrar/ocultar por clase de banco) + reset/prefill | `modules/dominio/tesoreria/acciones/cuentas.js` | `_toggleCamposPorClase()` (toggle), `inyectarFormCuenta()` (`wireIconoPicker` una vez), `_resetBankPicker()` (`resetIconoPicker`), `_editarCuenta()` (`setIconoPickerValor` para prefill) | |
| Consumidor 5: normalización + resolución del ícono en toda teja de cuenta | `modules/dominio/tesoreria/logic/cuentas.js`, `modules/infra/bancos.js` | `normalizarCuenta()` (guarda `cuenta.icono`), `bancoAvatar(bancoId, icono)` (solo lo aplica si `bancoId==='Otro'` y tiene forma de id de sprite) | |
| Consumidor 6: form de gasto fijo, categoría "Otro" | `modules/dominio/agenda/view.js` | `renderFormGastoFijo()` (usa `renderIconoPicker`), `_renderDetalleItem()` (`c.icono` antes que `CATEGORIA_AGENDA_ICONO`) | |
| Consumidor 6: wiring (mostrar/ocultar por categoría) + prefill | `modules/dominio/agenda/index.js` | `_syncCategoriaGastoFijo()` (toggle, ya era el listener de `change`), `_inyectarFormGastoFijo()` (`wireIconoPicker` + `setIconoPickerValor` al editar) | |
| Consumidor 6: normalización + herencia de ícono en el gasto pagado | `modules/dominio/compromisos/logic/modelo.js`, `modules/dominio/gastos/logic.js` | `normalizarCompromiso()` (rama `tipo==='fijo'`, guarda `icono`), `iconoPorOrigen()` (TX.6/TX.7: `comp.icono` antes que `CATEGORIA_AGENDA_ICONO`) | |
| Catálogo de íconos para categoría personalizada (compartido; 29 íconos, reusado por Gastos, Metas, Apartados, Deudas, Cuentas y Fijo) | `modules/core/constants.js` | `ICONOS_CATEGORIA_PERSONALIZADA` | ~493 |
| Catálogo propio de plantillas de Apartados (17 emojis curados por gasto real, NO pasa por el picker) | `modules/dominio/apartados/logic.js` | `PLANTILLAS_APARTADO` | ~54 |
| CSS del recuadro + panel colapsable + botones de la grilla | `styles/components/forms.css` | `.icono-picker-field`, `.icono-picker__recuadro`, `.icono-picker__vacio`, `.icono-picker__panel`, `.icono-picker__btn` | ~121 |
| CSS del panel como popover flotante (layout de columna angosta, CAT.2c) | `styles/components/domain.css` | `.apartado-nombre-row .icono-picker-field`, `.apartado-nombre-row .icono-picker__panel` | ~2499 |

**Recursos**: reusa `iconoCategoria()` de `infra/icons.js` para pintar cada ícono (recuadro y botones de la grilla); ningún asset gráfico nuevo.

**Dependencias y relaciones**: `infra/icon-picker.js` no importa de ningún dominio ni lee `S` (recibe el catálogo de íconos y el valor actual por parámetro, mismo patrón que `cuenta-helper.js`/`renderSelectorCuenta`). Cada dominio consumidor pasa su propio catálogo de íconos (Gastos, Metas, Apartados, Deudas, Cuentas y Fijo reusan `ICONOS_CATEGORIA_PERSONALIZADA` para la grilla). `bancoAvatar()` (`infra/bancos.js`) es compartido por 6 call sites (`cuenta-helper.js` ×3, `render.js`, `tesoreria/views/transferencias.js`, `tesoreria/views/cuentas.js`): CAT.2e tuvo que actualizar los 6 para pasar `cuenta.icono` como segundo parámetro, no solo el consumidor de Mis cuentas. `normalizarCompromiso()` (`compromisos/logic/modelo.js`) es compartida por Deudas (CAT.2d) y Fijo (CAT.2f): ambas ramas (`esDeuda`/`tipo==='fijo'`) implementan la misma lógica de `icono` por separado (código duplicado deliberado, cada rama tiene su propio catálogo de categorías y su propia palabra para "otra": 'Otra'/'Otro' en deuda, 'Otro' en fijo).

**Riesgos**:

- **El panel colapsable NO es un modal**: es un `<div hidden>` dentro del mismo formulario, alternado con `hidden`/`aria-expanded`. Decisión deliberada (ver Objetivo): un modal anidado reutilizaría `trapFocus`/`releaseFocus` de `infra/a11y.js`, que son **singleton** (una sola `_trapEl`/`_prevFocus` a la vez, no una pila). Los pickers dinámicos de `cuenta-helper.js` (`_mostrarPickerCuenta`, `_mostrarPickerMultiCuenta`) YA abren un modal anidado sobre un modal de registro abierto (ej. abono) y esto deja el trap de foco del modal exterior huérfano al cerrar el interior (el listener de `keydown` del panel exterior nunca se remueve porque `releaseFocus()` solo limpia el `_trapEl` más reciente): riesgo preexistente documentado aquí para no repetirlo, no corregido en esta rebanada (fuera de alcance de CAT.2).
- **`wireIconoPicker` debe llamarse en cada apertura del formulario, O una sola vez si el form es un singleton reusado.** Gastos, Apartados, Deudas y Fijo re-renderizan el HTML completo en cada apertura (`_montarFormGasto`/`_inyectarFormApartado`/`_elegirTipoDeuda`+`_editarCompromiso`/`_inyectarFormGastoFijo`), así que re-adjuntan los listeners cada vez y NO necesitan `resetIconoPicker` al reabrir (el HTML nuevo ya nace limpio). Metas y Cuentas inyectan el form UNA sola vez al arrancar y lo reutilizan: ahí sí hace falta `resetIconoPicker()`/`setIconoPickerValor()` explícito al reabrir o editar, porque `resetModal()` limpia el `.value` de los inputs pero no el estado VISUAL del picker.
- **Múltiples instancias del componente conviven en la página** (hallazgo de CAT.2b, con los 6 dominios migrados): cada dominio inyecta su modal al arrancar la app, estén o no abiertos, así que hay hasta 6 nodos `.icono-picker__panel` en el DOM a la vez. Un selector Playwright/CSS **sin acotar al formulario** (ej. `page.locator('.icono-picker__panel')`) es AMBIGUO y falla; hay que acotar siempre al contenedor del formulario o al `[data-icono-picker="<id>"]` específico. Los E2E de los 6 dominios ya siguen este criterio.
- **Un campo con el nombre correcto puede seguir siendo dato muerto (hallazgo de CAT.2e)**: `cuenta.icono` ya existía en el schema de `Cuenta` antes de esta rebanada, pero nada lo leía para renderizar (`bancoAvatar()`/`tejaMarca()` resolvían la teja solo desde `BANCOS_CO`); `normalizarCuenta()` lo llenaba igual con un emoji vía `_iconoPorBanco()` (retirada en esta rebanada), para TODOS los bancos, no solo "Otro". Antes de asumir que un campo del schema está "ya resuelto" porque existe y se guarda, verificar que algún render lo LEA de verdad.
- **Datos viejos de un campo reutilizado pueden tener una forma inesperada (hallazgo de CAT.2e)**: cuentas creadas antes de esta rebanada tienen `icono` con un emoji (`💚`, `🏦`...), no un id de sprite. `bancoAvatar(bancoId, icono)` valida con `/^[a-z]-[a-z0-9-]+$/` antes de usar `icono` como `simbolo` de `tejaMarca()`; sin esa guarda, un emoji legado generaría un `<use href="#💚">` roto. Mismo principio que la validación contra el catálogo en `normalizarCompromiso()`/`normalizarCuenta()` al guardar, pero aquí aplicado también en el momento de LEER (los datos ya guardados en `localStorage` de usuarios reales no pasaron por la validación nueva).
- **Catálogo genérico del picker vs. catálogo curado propio del dominio (hallazgo de CAT.2c)**: Apartados tiene `PLANTILLAS_APARTADO`, 17 emojis específicos por gasto real (SOAT 🚗, arena para gatos 🐱, impuesto predial 🏛️) que NO tienen equivalente exacto en el catálogo genérico de 29 íconos del picker (`ICONOS_CATEGORIA_PERSONALIZADA`, pensado para categorías amplias). Decisión: las plantillas conservan su emoji propio (no se migran al picker), y `setIconoPickerValor` es el mecanismo para que un flujo EXTERNO a la grilla (plantilla, o cualquier futuro atajo) fije el recuadro/input sin pasar por los botones del catálogo. Si un futuro dominio necesita reconciliar sus plantillas con el catálogo del picker, esa es la pieza a extender, no `wireIconoPicker`.
- **`apartado.icono`/`meta.icono`/`compromiso.icono` con dos formatos posibles, sin bump de schema**: id de símbolo del sprite (`c-pesa`, elegido con el picker) o emoji crudo (plantillas de Apartados, o datos viejos anteriores a CAT.2b/c). Los tres dominios distinguen por el patrón `/^[a-z]-/` (`_iconoApartado()`, `_iconoMeta()`; `compromiso.icono` de CAT.2d solo admite id de sprite, nunca emoji, porque no hay input de emoji libre que migrar en Deudas). Si en el futuro se agrega un catálogo de íconos con otro prefijo de letra, revisar que esta regex lo siga cubriendo en los sitios que la usan.
- **`compromiso.icono` siempre explícito, nunca ausente (hallazgo de CAT.2d)**: a diferencia de `meta.icono`/`apartado.icono` (siempre presentes porque el campo existía desde antes), `editar('compromisos', id, cambios)` hace un merge **shallow** (`Object.assign`, `infra/crud.js`). Si `normalizarCompromiso()` omitiera la clave `icono` cuando la categoría deja de ser "Otra"/"Otro", el valor viejo sobreviviría huérfano tras editar. Por eso `normalizarCompromiso()` siempre asigna `base.icono = valor válido | null`, nunca lo deja `undefined` (mismo patrón ya usado ahí para `tasa`).
- **El catálogo de íconos es responsabilidad del consumidor**: `renderIconoPicker` no valida que el catálogo tenga sentido para el dominio; cada rebanada futura decide su catálogo al integrar.

**Cambios pendientes**: ninguno. La iniciativa CAT.2 queda completa con sus 6 rebanadas cerradas.

**Cambios realizados**:

- 2026-07-13 (CAT.2f, cierra la iniciativa CAT.2): Gasto fijo/Calendario migrado como sexto y ultimo consumidor, categoria "Otro".

- 2026-07-13 (CAT.2e): Mis cuentas migrada como quinto consumidor, banco "Otro"; `cuenta.icono` ya existia en el schema sin uso real y esta rebanada lo redefine (ver Riesgos).

- 2026-07-13 (CAT.2d): Deudas migrada como cuarto consumidor; a diferencia de los 3 previos no habia campo de icono que reemplazar, se agrega `compromiso.icono` nuevo.

- 2026-07-13 (CAT.2c): Apartados migrado como tercer consumidor; el componente gana `setIconoPickerValor()` para fijar un valor fuera del catalogo.

- 2026-07-13 (CAT.2b): Metas migrada como segundo consumidor; el componente gana `resetIconoPicker()` y el input oculto pasa a tener `id` propio.

- 2026-07-13 (CAT.2a): componente compartido `infra/icon-picker.js` nuevo (`renderIconoPicker`, `wireIconoPicker`); Gastos migrado como primer consumidor.

---
