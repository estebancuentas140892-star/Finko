# Ficha de contexto: Transversal

> Funcionalidades que atraviesan varias secciones de la app (identidad visual, navegación, biblioteca gráfica, persistencia). Reglas de uso y plantilla en [`README.md`](README.md).

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

**Dependencias y relaciones**: consume `--fk-section-accent` (IV.2b/ADR 031) y el patrón de selección D.16b; convive con el selector de cuenta (`renderSelectorCuenta`, conservado a propósito, ADR 042 D3) y el picker de ícono CAT.2. **Conflicto abierto (ADR 042 D9):** AP.5 pedía dropdown de categoría para Apartados; decidir con Esteban al iniciarla.

**Riesgos**:

- **Radios ocultos**: los chips son labels; `element.value` sobre `[name="categoria"]` devuelve el primer radio. Leer siempre vía FormData o iterando radios. En E2E se clickea el label, no `check()` del input.
- **Transiciones vs lecturas síncronas**: `.chip-cat` transiciona background/border; una lectura de `getComputedStyle` inmediata tras cambiar `checked` (o en un tab en segundo plano) devuelve el valor inicial. Verificar estados con E2E o con `transition: none` temporal.

**Cambios pendientes**: FORM.1b (deuda), FORM.1c (gasto fijo).

**Cambios realizados**:

- **FORM.1a (2026-07-15)**: fundación CSS + Registrar gasto v2 + fix del hueco preexistente de `responsive.css` (el 16px anti-zoom achicaba `.input--big-amount` en móvil, también en el ingreso puntual). Ver [CHANGELOG](../CHANGELOG.md).

---

## Taxonomía global de categorías (CAT.1, iniciativa transversal)

- **Objetivo**          : una sola clasificación de categorías entre secciones (Gastos↔Fijos y Apartados↔Metas), decidida una vez y consumida por los catálogos de cada sección, los límites (LIM.1 punto 8) y el catálogo de marcas (ADR 029 D3). Criterios: **fijo** = recurrente con frecuencia definida, parte de la rutina; **gasto** = día a día variable; **apartado** = gasto esporádico previsible que se olvida presupuestar; **meta** = objetivo grande de mediano/largo plazo.
- **Estado actual**     : decisión VALIDADA con Esteban (2026-07-13, ADR 014 sección "Validación 2026-07-13"). **CAT.1a CERRADA** (Gastos↔Fijos): `CATEGORIAS_GASTO_USUARIO` ya no ofrece Vivienda ni Servicios públicos, hint retirado por completo (revisa la decisión 4 del ADR 014, ratificado por Esteban). **CAT.1b CERRADA** (Apartados↔Metas): `PLANTILLAS_APARTADO` pasa de 17 a 20; sale Vacaciones (vive en Metas), "Matrícula o semestre" se divide en "Matrícula escolar" (el semestre universitario es Meta), "Útiles escolares" se amplía a "Útiles y uniformes", entran Veterinario/Mantenimiento del hogar/Seguro del hogar/Reparaciones inesperadas. **Pendiente CAT.1c**: Metas (sale Cumpleaños, Vacaciones/Viajes se fusionan en "Viajes"). Fijos no esenciales (para LIM.1 punto 8) = **Streaming y Suscripciones** (Gimnasio y Telefonía esenciales, decisión explícita). ADR 029 D3 validada tal cual (su Fase 0 queda desbloqueada). **Sin bump de schema**: precedente "Alimentación" v15 (CAT.1a) y catálogo de plantillas sin referencia inversa (CAT.1b, ver Riesgos).
- **Verificado contra** : commit de CAT.1b (2026-07-13).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Catálogo de Gastos + filtro del formulario (CAT.1a cerrada) | `modules/core/constants.js` | `CATEGORIAS_GASTO`, `CATEGORIAS_GASTO_USUARIO` | ~414 |
| Catálogo de gastos fijos | `modules/core/constants.js` | `CATEGORIAS_AGENDA`, `CATEGORIA_AGENDA_ICONO` | ~596 |
| Plantillas de Apartados (CAT.1b cerrada) | `modules/dominio/apartados/logic.js` | `PLANTILLAS_APARTADO` | ~54 |
| Catálogo de Metas (CAT.1c, pendiente) | `modules/core/constants.js` | `CATEGORIAS_META`, `CATEGORIA_META_ICONO` | ~696 |

**Dependencias y relaciones**: la decisión desbloquea CAT.3 (a qué sección pertenece una categoría personalizada), AP.5 (catálogo de la filosofía redefinida de Apartados), LIM.1 punto 8 (fijos no esenciales) y la Fase 0 del ADR 029 (etiquetado del catálogo de marcas).

**Riesgos**:

- **Registros viejos con categorías retiradas (Gastos)**: gastos con "Vivienda"/"Servicios públicos" siguen mostrando su ícono vía `CATEGORIA_ICONO`, que conserva la entrada aunque el formulario ya no la ofrezca. La regla es filtrar solo el FORMULARIO, nunca borrar la entrada del mapa de íconos al retirar una categoría del catálogo visible.
- **`PLANTILLAS_APARTADO` no tiene esta trampa (hallazgo de CAT.1b)**: a diferencia de `CATEGORIA_ICONO`, un apartado ya creado NO referencia el catálogo de plantillas en su render; guarda su propio `nombre`/`icono` en el momento de crearlo (`_aplicarPlantilla()` copia el valor una sola vez). Retirar o renombrar una plantilla (Vacaciones, Matrícula o semestre, Útiles escolares) es seguro: los apartados existentes creados desde esas plantillas conservan su nombre e ícono guardados sin cambios, y la plantilla retirada simplemente deja de ofrecerse para apartados nuevos.
- **El guardarraíl de consistencia de TX.4** (misma etiqueta ⇒ mismo emoji entre catálogos) debe seguir verde tras cada rebanada: al renombrar o retirar, revisar que no queden etiquetas compartidas divergentes.

**Cambios pendientes**: rebanada CAT.1c (catálogo de Metas), tarjeta CAT.1 del BOARD.

**Cambios realizados**:

- **CAT.1a (2026-07-13)**: `CATEGORIAS_GASTO_USUARIO` excluye Vivienda y Servicios públicos (además de Deudas/Ahorro/Alimentación, ya excluidas); `CATEGORIAS_GASTO` (catálogo base) las conserva para `CATEGORIA_ICONO` y la validación de límites existentes. `CATEGORIAS_TIPICAMENTE_FIJAS` eliminada de `constants.js`; `#hint-categoria-fija` eliminado de `renderFormGasto()`; su listener de `change` eliminado de `_montarFormGasto()`. Sin bump de schema.
- **CAT.1b (2026-07-13)**: `PLANTILLAS_APARTADO` (`apartados/logic.js`) 17→20 plantillas. Sale Vacaciones ✈️. "Matrícula o semestre" 🎓 → "Matrícula escolar" 🎓. "Útiles escolares" 📚 → "Útiles y uniformes" 🎒. Entran Veterinario 🩺, Mantenimiento del hogar 🛠️, Seguro del hogar 🛡️, Reparaciones inesperadas 🧰. Sin cambios en `_aplicarPlantilla()`/`renderFormApartado()` (agnósticos al contenido del catálogo). Sin bump de schema.

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

## Persistencia y salvaguarda de cuota (localStorage)

- **Objetivo**          : todo el estado vive en `localStorage` bajo la clave única `fk_v1` (ADN 3). `save()` está debounced 200 ms; `_flush()` serializa `S` entero y escribe. Una salvaguarda avisa antes de llenar la cuota y evita que un guardado fallido se pierda en silencio (ADR 030).
- **Estado actual**     : estable. **PERF.4** ([ADR 030](../DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md), 2026-07-06) decidió **no** reescribir la persistencia (el costo de guardar es ~5 ms debounced, medido en `scripts/perf/`) y en su lugar agregó la salvaguarda de cuota. **IndexedDB** queda como dirección futura (**PERF.5** en BOARD, no iniciar sin un disparador del ADR 030 D4). Partir `localStorage` por clave está **rechazado** (no sube la cuota).
- **Verificado contra** : `5039a76` (2026-07-06, PERF.4).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Guardado debounced + flush | `modules/core/storage.js` | `save()`, `_flush()`, `_flushNow()` | ~430 |
| Evaluación de cuota (pura) | `modules/core/storage.js` | `evaluarCuota()`, `LIMITE_LOCALSTORAGE_CHARS` | |
| Estado de cuota actual (mide S) | `modules/core/storage.js` | `estadoCuota()` | |
| Aviso en Ajustes | `modules/dominio/config/view.js` | `_renderAvisoAlmacenamiento()` (en `_renderDatos`) | |
| Escucha de eventos + anuncio | `modules/dominio/config/index.js` | `EventBus.on('storage:error')`, `on('storage:cuota')` | |
| Restaurar backup (escribe el blob crudo) | `modules/dominio/config/index.js` | `_importarDatos()` | ~42 |

**Dependencias y relaciones**: `_flush()` emite `state:save` (éxito), `storage:cuota` (al cruzar de nivel de uso) y `storage:error` (guardado rechazado). `config/` los escucha para avisar. `infra/memo.js` (PERF.2) escucha `state:change`, no estos. Exportar backup (`config/_exportarDatos`) usa `JSON.stringify(S)` en memoria: es independiente del layout de storage.

**Riesgos**: `LIMITE_LOCALSTORAGE_CHARS` (4.5 M chars) es un piso conservador, no el cupo exacto (varía por navegador); por eso `falloUltimoGuardado` (fallo real) manda sobre la estimación. Si algún día se migra a IndexedDB (PERF.5), `loadData()` pasa a async → bootstrap async, y el sembrado E2E (escribe `fk_v1`) hay que reescribirlo: es el cambio de mayor riesgo del proyecto.

**Cambios realizados**: `2026-07-06 (PERF.4, ADR 030)`: salvaguarda de cuota + guardado que ya no falla en silencio (detalle en CHANGELOG).

---

## CTA "necesitas una cuenta" (registro bloqueado por falta de cuenta)

- **Objetivo**          : cuando el usuario intenta registrar un ingreso, un gasto o un abono sin ninguna cuenta activa, el mensaje no se limita a informar el requisito: ofrece una acción única que lo lleva directo a crear la cuenta (cierra el modal actual, navega a Mis cuentas y abre el formulario de nueva cuenta). Reduce la fricción del onboarding: si falta un requisito, se guía a resolverlo, no solo se avisa.
- **Estado actual**     : unificado (2026-07-06). Un solo mecanismo: `data-action="ir-a-crear-cuenta"` → EventBus `'cuenta:crear'` → `_nuevaCuenta` abre `#modal-cuenta`. Copy común "Crear una cuenta" en los 5 puntos de entrada. Antes cada surface hacía algo distinto: ingreso puntual solo cerraba el modal (bug: no navegaba), gastos navegaban sin abrir el form, el abono era un callejón sin salida ("Cerrar").
- **Verificado contra** : `9eaeb4d` (unificación del CTA, SW v329), 2026-07-06.

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Acción unificada (cierra modal + navega + emite evento) | `modules/ui/actions.js` | `registrarAccion('ir-a-crear-cuenta', ...)` | ~91 |
| Suscripción que abre el form de nueva cuenta | `modules/dominio/tesoreria/acciones/cuentas.js` | `EventBus.on('cuenta:crear', _nuevaCuenta)` en `initAccionesCuentas()` | ~478 |
| Modal guiado de flujos de un clic (0 cuentas) | `modules/infra/cuenta-helper.js` | `_mostrarGuiadoCero()` (botón `data-role="ir"`) | ~206 |
| Empty state Nuevo ingreso | `modules/dominio/tesoreria/views/ingresos.js` | `renderFormIngresoPuntual()` (rama `cuentas.length === 0`) | ~234 |
| Empty state Gasto (rápido y completo) | `modules/dominio/gastos/view.js` | `renderFormGastoRapido()`, `renderFormGasto()` | ~320, ~392 |
| Empty state Abono a deuda | `modules/dominio/compromisos/views/formularios.js` | `renderFormAbono()` (rama `cuentas.length === 0`) | ~37 |

**Recursos**: ninguno gráfico propio; reusa `#modal-cuenta` (form de nueva cuenta, estático en `index.html`), la clase `.form-empty`/`.empty-state` y los botones estándar.

**Dependencias y relaciones**: `ir-a-crear-cuenta` vive en el shell (`ui/actions.js`), que no importa dominios; se comunica con tesorería por EventBus (ADN 10). `cuenta-helper.js` (infra) emite el mismo evento tras navegar, sin importar `ui` (evita invertir el layering infra→ui). El helper `_mostrarGuiadoCero` lo disparan `resolverCuenta`/`resolverPago*` cuando un flujo de un clic (Marcar pagado, confirmar gasto multi-cuenta, aportar a meta/apartado) detecta 0 cuentas: todos esos flujos heredan la mejora sin tocarlos. La regla de cuenta única (patrón 0/1/varias) sigue viviendo en `cuenta-helper.js`.

**Riesgos**:

- El evento `'cuenta:crear'` abre `#modal-cuenta`, que es estático en `index.html`: funciona aunque la sección tesorería aún no se haya renderizado. Si ese modal se moviera o renombrara, el CTA quedaría mudo (solo navegaría). `_nuevaCuenta` usa guardas `if (el)`, así que con el DOM incompleto no rompe, solo no abre.
- Orden en `ir-a-crear-cuenta`: cerrar el modal actual (libera foco + quita `inert`) ANTES de abrir `#modal-cuenta` (atrapa foco + `inert`), mismo patrón que `registrar-abrir`. El `navigate('tesoreria')` dispara `hashchange` async; su intento de mover el foco a `#sec-tesoreria` es no-op porque el fondo queda `inert` con el modal abierto.
- Los `<a href="#tesoreria">` de los empty states conservan el href como fallback semántico, pero `dispatch()` hace `preventDefault()`: la navegación real la hace la acción, no el href.

**Cambios pendientes**: ninguno.

**Cambios realizados**:

- 2026-07-06: unificacion del CTA. Accion `ir-a-crear-cuenta` y evento `cuenta:crear` nuevos; los 5 empty states y modales convergen en el mismo copy y comportamiento.

**Observaciones**: el mismo principio ("no informar un requisito sin ofrecer la acción para resolverlo") aplica a futuros bloqueos; si aparece otro requisito duro (ej. registrar un abono sin deudas, aportar sin metas), replicar el patrón antes que dejar un mensaje muerto.

---

## Tejas de marca y biblioteca gráfica (logos de bancos y marcas)

- **Objetivo**          : mostrar el logotipo oficial de cada banco/billetera/marca en una teja de color, con fallback de iniciales, en Mis cuentas, Gastos, Deudas, fijos y suscripciones. `assets/svg/` es la fuente de verdad de diseño (ADR 026); el sprite de `index.html` es artefacto generado.
- **Estado actual**     : BR.3 completa (2026-07-05): los 11 bancos/billeteras reales de `BANCOS_CO` tienen glifo a color; solo "Otro" (no es una entidad real) sigue con iniciales. BR.5 (normalización automática de exports crudos) y BR.4 (ADR 027, excepción de logo a color) cerradas. Iniciativa Biblioteca de recursos gráficos completa.
- **Verificado contra** : `92934a0` (BR.3) más el ADR 027 de este cierre (BR.4), 2026-07-05.

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Catálogo de bancos CO (id, color, texto, simbolo, aliases) | `modules/core/constants.js` | `BANCOS_CO` | ~283 |
| Catálogo de marcas globales | `modules/core/constants.js` | `MARCAS` | antes de BANCOS_CO |
| Render de la teja (glifo o iniciales sobre color) | `modules/infra/marcas.js` | `tejaMarca()` | ~90 |
| Detección de marca en texto libre | `modules/infra/marcas.js` | `resolverMarca()`, `normalizarAlias()` | ~35 |
| Avatar de banco (delega en tejaMarca) | `modules/infra/bancos.js` | `bancoAvatar()` | |
| Sprite generado (símbolos `b-*`) | `index.html` | marcadores `INICIO/FIN bloque generado por scripts/sync-sprite.py` | |
| Pipeline biblioteca → sprite | `scripts/sync-sprite.py` | `normalizar_export_illustrator()` (paso 0, BR.5), `validar_y_convertir()`, `_validar_fullcolor()`, `orden_final()` | |
| Archivos de diseño | `assets/svg/logos/**` | 1 archivo = 1 símbolo (`<slug>.svg` → `b-<slug>`) | |
| Estándar técnico y flujo de trabajo | `assets/svg/README.md` | secciones 6, 6b (logos a color), 7 (export), 9 (flujo en pareja) | |
| CSS de la teja | `styles/components/nudges.css` | `.bank-avatar`, `.bank-avatar__glifo` | ~275 |
| CSS base de iconos (fuente de la herencia de stroke) | `styles/components/forms.css` | `.icon` | ~15 |

**Recursos**: símbolos `b-*` del sprite; `i-saldo` (Efectivo usa un icono estructural como glifo); tokens `--fk-teja-*` (tamaños de teja); campos `color`/`texto` del catálogo pintan la teja vía estilo inline.

**Dependencias y relaciones**: `tejaMarca()` es el único render de teja (bancoAvatar delega); consumidores en tesorería (cuentas), gastos, compromisos (deudas/fijos), agenda. `sprite-sync.test.js` vigila biblioteca ↔ sprite ↔ catálogos; `TX.4` vigila categorías. El sync corre manual: tocar un `.svg` sin correr `python scripts/sync-sprite.py` no cambia la app.

**Riesgos**:

- **Herencia CSS a través de `<use>` (la trampa grande):** `.icon` pone `fill:none; stroke:currentColor; stroke-width:2.35` en el `<svg>` anfitrión y eso SE HEREDA hacia adentro del `<use>`. Todo elemento pintable de un logo a color debe declarar `fill` y `stroke` explícitos o recibe un contorno fantasma del color `texto` de la teja (pasó con Banco de Bogotá y Nequi, 2026-07-05; fix en `0f143f9`). Validador y guardarraíl lo exigen desde entonces.
- Logos a color (`data-fullcolor="true"`): el cuerpo se conserva byte a byte; su teja se pinta del color del propio fondo del logo; `texto` no pinta el glifo (solo el fallback de iniciales).
- IDs internos de gradiente deben ser únicos en todo el sprite (prefijo del slug, ej. `bbog-g0`); el sync lo verifica.
- `BANCOS_CO[].id` se guarda en `localStorage` (datos del usuario): **nunca renombrar ids**. Renombrar un archivo `.svg` publicado rompe el campo `simbolo` (breaking change; ver `ID_ANTERIOR` en el sync para preservar posición).
- El sync aborta sin escribir (`ErrorProduccion`) si un símbolo publicado perdería su archivo fuente; un archivo a medio pulir se excluye sin bloquear (`ErrorRecurso`).
- El sync (BR.5) reescribe archivos de `assets/svg/` en el disco cuando normaliza un export crudo (declaración XML, `id="Capa_1"`, comentario, `xlink:href`, `<g>` bare, IDs de degradado genéricos): correrlo puede dejar cambios sin commitear en la biblioteca, revisar `git status` después.
- Una `<image>` incrustada NUNCA se borra en silencio (ni en la normalización ni en la validación): se rechaza con error explicando la causa probable (capa de calco de Illustrator).
- No editar a mano el bloque generado de `index.html`.
- Todo cambio de assets en producción bumpea `CACHE_NAME` en `service-worker.js`.

**Cambios pendientes**: ninguno activo (iniciativa Biblioteca de recursos gráficos completa).

**Cambios realizados**:

- 2026-07-05 (BR.4, [ADR 027](../DECISIONS/027-logos-de-marca-a-color-excepcion-monocromo.md)): formaliza la excepcion de logo a color (`data-fullcolor`), su archivo autonomo y el color de teja.
- 2026-07-05 (BR.3, completa): 9 bancos y billeteras mas a color de un tiron, todos con la misma imagen de calco incrustada.
- 2026-07-05 (BR.5): el sync normaliza exports crudos de Illustrator antes de validar y reescribe el archivo.
- 2026-07-05 `0f143f9`: fix del contorno fantasma (stroke explicito + validador + guardarrail).
- 2026-07-05 `2b5ae36`: Nequi a color (monograma) y limpieza de exports crudos.
- 2026-07-05: Bancolombia y Banco de Bogota a color (`data-fullcolor`), sync extendido a degradados.
- 2026-07-05 (BR.2): `sync-sprite.py` mas guardarrail `sprite-sync.test.js`.
- 2026-07-05 (BR.1): biblioteca `assets/svg/` (100 simbolos extraidos mas plantillas).

**Observaciones**: regla de fidelidad absoluta (2026-07-05, orden directa de Esteban): todo SVG que él entrega es la versión oficial; cero contornos, sombras, efectos o reinterpretaciones agregados; si un logo necesita contraste se ajusta el contenedor, nunca el logo; recrear solo por motivos técnicos y visualmente idéntico. Formato de entrega: SVG siempre (fuente de verdad); PNG 512×512 de referencia opcional para logos a color (vara de comparación en la revisión en pareja). ADRs relacionados: 023 (iconografía), 025 (logos y tejas), 026 (biblioteca).

---

## Sistema de logros (dominio `logros`)

- **Objetivo**          : gamificación ligera de hábitos: catálogo de logros con evaluación automática, toast con confetti al desbloquear y vitrina de solo lectura al final de Ajustes.
- **Estado actual**     : estable. **Logros v2 en curso** ([ADR 032](../DECISIONS/032-logros-v2-niveles-y-habitos.md) Aceptada el 2026-07-09): LG.2b (2026-07-09) y **LG.2c cerrada el 2026-07-12** (rachas de constancia + familia deudas saldadas, SW v354); siguen LG.2d (mudanza a Análisis+Inicio; su bloqueo por IN.8 ya se levantó el 2026-07-12, sigue esperando solo a ANL.1) y LG.2e (comportamiento), ver BOARD. Catálogo: 17 logros (antes 11).
- **Verificado contra** : commit de LG.2c (2026-07-12).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Catálogo (17 logros; familias `registro` 6 niveles, `metas` 1, `deudas` 2) | `modules/dominio/logros/logic.js` | `LOGROS` | ~150 |
| Metadata de familias (nombre por familia) | `modules/dominio/logros/logic.js` | `FAMILIAS` | ~47 |
| Derivación "mes completo de registro" (D3, ≥3 semanas del mes) | `modules/dominio/logros/logic.js` | `mesCompleto()`, helper interno `_semanasPorMes()` | ~91 |
| Racha de meses completos consecutivos (memoizada por gastos) | `modules/dominio/logros/logic.js` | `rachaMesesCompletos()`, `_rachaMesesCompletosMemo` | ~105, ~128 |
| Conteo de deudas saldadas (excluye consolidadas) | `modules/dominio/logros/logic.js` | `deudasSaldadas()` | ~141 |
| Evaluación (ids cumplidos ahora, try/catch por logro) | `modules/dominio/logros/logic.js` | `evaluarLogros()` | ~329 |
| Estado render-ready de la vitrina (incluye familia/nivel) | `modules/dominio/logros/logic.js` | `estadoLogros()` | ~362 |
| Agrupación por familia (una tarjeta por familia) | `modules/dominio/logros/logic.js` | `agruparVitrina()` | ~417 |
| Nivel de usuario derivado del conteo (nombres provisionales) | `modules/dominio/logros/logic.js` | `nivelUsuario()`, `NIVELES_USUARIO` | ~473 |
| Detección + persistencia + toast (cola de a uno) | `modules/dominio/logros/index.js` | `_checkYMostrar()`, `_encolarToast()` | ~59, ~97 |
| Confetti (24 piezas, ajuste mobile por bottom-nav) | `modules/dominio/logros/index.js` | `_lanzarConfetti()` | ~193 |
| Vitrina en Ajustes (agrupada + nivel en el encabezado) | `modules/dominio/logros/view.js` | `renderPanelLogros()`, `_renderFamiliaItem()` | ~24, ~62 |

**Recursos**: emojis por logro (se conservan por ADR 025 D6). CSS: `.logro-toast*`, `.confetti-piece` (nudges.css/base.css), `.logros-lista`, `.logro-item*` (config.css). Estado: `S.logros` (`string[]` de ids, orden de inserción = orden de desbloqueo).

**Dependencias y relaciones**: escucha `state:change` (re-evalúa y re-renderiza) y `onboarding:completado` (toast retrasado 4 s, NAV.C/ADR 024 D6). El shell expone `#panel-logros` junto a `#panel-config` porque `config` no puede importar `logros` (ADN 10, ver ADR 022 punto 4). No emite eventos propios. Sin imports de otros dominios: los `eval` leen `S` directo; los evaluadores de la familia "registro" (LG.2c) importan `hoy()` de `infra/utils.js` (infra, no dominio, permitido) para obtener la fecha actual, y los de "deudas" comparan `c.tipo === 'deuda-entidad' || 'deuda-personal'` como literales en vez de importar `esDeuda()` de `compromisos/logic.js`.

**Riesgos**:

- **La persistencia manda sobre la evaluación**: un logro en `S.logros` no se revoca aunque el estado retroceda (borrar gastos, etc.). Cualquier lógica nueva debe respetarlo.
- **Los `eval` corren en cada `state:change`**: mantenerlos O(1) o memoizados (disciplina del ADR 022, reforzada en ADR 032 D7); un evaluador O(historial) sin memo degrada toda la app. `rachaMesesCompletos()` se memoiza (`_rachaMesesCompletosMemo`, PERF.2) porque los 4 niveles de la familia registro (mes-completo a doce-meses-seguidos) la llaman con los mismos argumentos dentro de una sola pasada de `evaluarLogros()`.
- **3+ logros simultáneos** (import de respaldo/CSV) colapsan a un solo toast resumen; no romper ese guard al agregar logros.
- **Ids del catálogo son valores persistidos**: nunca renombrarlos (mismo criterio que los ids de `MARCAS`).
- **`NIVELES_USUARIO` (D5) se calibró para ~20 logros**; con 17 (LG.2e/comportamiento aún no implementada), el tramo superior "Leyenda del ahorro" (min 18) queda temporalmente inalcanzable. No se tocó en LG.2c (fuera de su alcance declarado); recalibrar si molesta antes de que LG.2e agregue los que faltan.
- **`rachaMesesCompletos()` se ancla en "el mes anterior a hoy"**: solo detecta una racha activa si el usuario sigue usando la app (dispara `state:change`) mientras la racha está vigente. Una racha pasada y luego abandonada ya quedó persistida en `S.logros` si se evaluó en su momento (no se revoca); el riesgo real es solo si el usuario NUNCA vuelve a abrir la app durante el mes en que la racha era detectable, caso de borde aceptado (mismo patrón que otros logros de conteo simple).

**Cambios pendientes**: LG.2e (familia comportamiento: hormiga-a-raya, ahorro-creciente, pagador-puntual) en BOARD. Los nombres de `NIVELES_USUARIO` son provisionales: cuando Esteban entregue los definitivos, se cambia la constante (sin tocar datos, nada se persiste).

**Cambios realizados**:

- 2026-07-12 (LG.2c, ADR 032 D3/D4): constancia de registro y deudas saldadas; `mesCompleto()` y `rachaMesesCompletos()` nuevas.
- 2026-07-09 (LG.2b, ADR 032 D1/D5): fundacion de progresion: `familia`/`nivel` en el catalogo, `FAMILIAS` y `agruparVitrina()` (una tarjeta por familia), sin bump de schema.
- 2026-07-09 (LG.2a): ADR 032 escrito y validado por Esteban el mismo dia (Aceptada).
- 2026-07-04 (LG.1b, ADR 022): vitrina en Ajustes con hint y progreso parcial.
- 2026-07-04 (LG.1a): toast mas legible, cola de a uno, pausa por hover.

**Observaciones**: ADRs relacionados: 022 (vitrina en Ajustes, vigente operativamente hasta la rebanada LG.2d), 032 (v2, Aceptada), 025 D6 (emojis se conservan). La regla anti-gaming del ADR 032 D2 es principio innegociable: logros que premien la omisión de registro ("día sin gastos") no entran al catálogo bajo ninguna forma; las familias "registro" y "deudas" de LG.2c son ambas ADITIVAS (más registro = más progreso), así que no necesitan la guardia de "mes completo" que sí exigirá LG.2e para los logros de reducción de gasto (hormiga-a-raya).

---

## Navegación v2: menú "Más" como hoja agrupada (NAV2.1, ADR 040)

- **Objetivo**          : el menú "Más" del bottom nav móvil pasa de modal centrado con 7 tarjetas planas (ADR 024 D5) a hoja inferior agrupada: "Gestión del dinero" (Deudas, Mis cuentas, Me deben, Límites de gasto, Análisis), "Ahorros" (Fondo de emergencia, Metas, Apartados, Inversión) y fila final Ajustes + botón de tema. Tiles horizontales con teja de icono teñida por dominio; el tile de la sección activa se resalta con su tinte y borde. Séptima pantalla de la familia visual v2.
- **Estado actual**     : **iniciativa COMPLETA el 2026-07-14** (las 3 rebanadas el mismo día). NAV2.1a: hoja agrupada + tejas + tile activo + toggle de tema. NAV2.1b: marca "F" con degradado de acento reemplaza el 💚 (último emoji decorativo de la UI estructural) y el grupo de uso diario pierde el rótulo visible "Diario" (conserva `aria-label="Uso diario"`). NAV2.1c: el botón central "Registrar" pasa de círculo 46px a pastilla 50x38 con el degradado de acento, y el indicador activo del bottom nav pasa de 44% a 22px fijos. Badges de notificación diferidos (ADR 040 D6, decisión de producto pendiente de Esteban).
- **Verificado contra** : commit de NAV2.1c (2026-07-14).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Markup de la hoja (grupos, tiles, tema) | `index.html` | `#modal-mas`, `.mas-sheet`, `.mas-tile` | ~1290 |
| Presentación de hoja inferior (reutilizable) | `styles/modals.css` | `.modal-overlay--sheet`, `.modal--sheet` | ~207 |
| Tiles con teja por dominio + estado activo | `styles/modals.css` | `.mas-tile`, `.mas-tile__teja`, `.mas-tile.active` | ~270 |
| Botón de tema de la hoja | `styles/modals.css` + `index.html` | `.mas-sheet__theme` (acción `theme-toggle`) | ~330 |
| Marcado del tile activo | `modules/ui/shell.js` | `markActiveNav()` (selector `.nav-item, .mas-tile`) | ~85 |
| Sincronización de TODOS los toggles de tema | `modules/ui/shell.js` | `_syncThemeButton()` (`querySelectorAll`, swap `#i-moon`/`#i-sun`) | ~58 |
| Cierre al navegar (el botón de tema NO cierra) | `modules/ui/menu-mas.js` | `initMenuMas()` (click en `a[href]`) | ~20 |
| Resaltado del botón "Más" por sección | `modules/ui/shell.js` | `MAS_SECTIONS` | ~18 |
| Marca "F" del sidebar (NAV2.1b) | `styles/layout.css` + `index.html` | `.sidebar__logo-mark` | ~41 |
| Pastilla "Registrar" + indicador fijo del bottom nav (NAV2.1c) | `styles/responsive.css` | `.nav-item__fab`, `.nav-item.active::before` (bloque móvil) | ~104, ~136 |

**Dependencias y relaciones**: los tiles heredan `--fk-nav-text` del mapeo global `[data-section]` de `layout.css` (IV.2a): cero mapeo nuevo. Las clases `.menu-mas__*` NO se tocaron: siguen siendo el launcher vertical de la hoja "Registrar" (NAV.A2) y de los accesos de Inicio (IN.4a). `.modal-overlay--sheet`/`.modal--sheet` nacen reutilizables para futuros sheets.

**Riesgos**:

- **El bloque "MODAL EN MÓVIL: BOTTOM SHEET" de `modals.css` (≤480px) ya convertía TODOS los modales en hoja**: a ese ancho sus reglas (max-width 100%, translateY(100%) de entrada) pisan por orden a las de `.modal--sheet` en empate de especificidad, lo cual es deseado (full width y slide completo en teléfonos). Las reglas propias de `.modal--sheet` gobiernan de 481px hacia arriba. Si se ajusta una, revisar la otra.
- **El tinte del tile activo lleva texto en `--fk-text-primary`**, no el `-text` del dominio: sin riesgo AA por diseño (el color es decorativo). Si algún día el label activo se tiñe con el dominio, medir contraste contra el tinte (regla del 6% del bloque de abajo).
- `_syncThemeButton` sincroniza por `querySelectorAll`: cualquier toggle futuro debe ser checkbox o botón con `<use>` interno para que el swap de glifo funcione.

**Cambios realizados**:

- 2026-07-14 (NAV2.1c): `.nav-item__fab` pasa a pastilla 50x38 con degradado de acento y sombra tokenizada; indicador activo del bottom nav a 22px fijos.
- 2026-07-14 (NAV2.1b): marca `.sidebar__logo-mark` nueva en `layout.css`; rotulo "Diario" retirado.
- 2026-07-14 (NAV2.1a): hoja agrupada completa.

**Observaciones**: ADR [040](../DECISIONS/040-navegacion-v2-visual.md); revisa el D5 del [ADR 024](../DECISIONS/024-reorganizacion-navegacion-movil.md) (el hub Ahorros NAV.B queda intacto: pestañas y consolidado siguen en las secciones).

---

## Identidad de color por sección: nav + tejas de encabezado (IV.1/IV.2a/IV.2d, ADR 031)

- **Objetivo**          : la sección activa se identifica por el color de SU dominio (nav sidebar/bottom-nav, pestañas del hub Ahorros) y cada encabezado de sección lleva una teja con el icono y el acento del dominio, para reconocer dónde se está sin leer el texto.
- **Estado actual**     : IV.1 (tokens `--fk-dom-*`) cerrada 2026-07-07. **IV.2a cerrada 2026-07-09**: despliegue en nav + hub-tabs + encabezados. **IV.2d, IV.2b e IV.2c cerradas el 2026-07-10** (misma jornada): migración `-text`, franja de modales + progreso por dominio, y calendario/Inicio (fijo→índigo, fondo teñido en vez de franja lateral, etiqueta de tipo en Inicio). **IV.2 completa.** Sigue IV.3 (números y estados) e IV.4 (iconografía dirigida post-color, condicionada a revisión visual), ver BOARD. **DV.1 cerrada el 2026-07-10**: el [ADR 033](../DECISIONS/033-direccion-visual-premium.md) (Dirección Visual premium, estado Propuesta) extiende este sistema con elevación en 4 niveles, `--fk-section-color` + `--fk-grad-identity` sobre el mismo mapeo `[data-dom]`/`[data-section]`, decoración/ilustraciones (pipeline ADR 026) y catálogo de movimiento cerrado; nada se implementa sin la validación de Esteban (rebanadas DV.2a-d en BOARD).
- **Verificado contra** : commit de IV.2c (2026-07-10).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Mapeo `--fk-nav-bg`/`--fk-nav-text` por sección | `styles/layout.css` | bloque `[data-section="X"]` | ~198 |
| Nav activo (sidebar + bottom-nav) teñido | `styles/layout.css` | `.nav-item.active`, `.nav-item[aria-current="page"]` | ~134 |
| Pestañas del hub Ahorros teñidas | `styles/layout.css` | `.hub-tabs__tab[aria-current="page"]` | ~359 |
| Teja de encabezado de sección (reusa `.cat-teja`) | `styles/components/atoms.css` | `.section__icon.cat-teja` | ~249 |
| `.cat-teja` con color de texto correcto (`-text`) | `styles/components/atoms.css` | `.cat-teja`, `[data-dom="X"]` | ~221 |
| Iconos del launcher `.menu-mas__*` con color correcto (`-text`; desde NAV2.1a lo usan Registrar y accesos de Inicio, ya no el menú "Más") | `styles/modals.css` | `.menu-mas__item[data-section="X"] .icon` | ~144 |
| Markup de los 11 encabezados con teja | `index.html` | `.section__title-group` + `.section__icon` por sección | ~490-777 |
| Pestañas del hub con `data-section` | `index.html` | `.hub-tabs__tab[data-section="X"]` (4 copias, una por página del hub) | ~649-726 |
| Iconos/textos de Análisis (fondo, inversión) con `-text` (IV.2d) | `styles/components/analysis.css` | `.fondo-hero__icon`, `.fondo-hero__sub--ok`, `.fondo-hero__banner`, `.ahorro-habito__compromiso strong`, `.inversion-hero__icon`, `.inversion-hero__tipo-pct`, `.inversion-item__tipo` | ~604-885 |
| Iconos del tile de Registrar con `-text` (IV.2d) | `styles/modals.css` | `.registrar__tile[data-kind="X"] .icon` | ~220 |
| Título de nudge alto con `-text` (IV.2d) | `styles/components/nudges.css` | `.nudge-high .nudge__title` | ~91 |
| Badges de dominio: `-text` + fondo 6% en vez de 12% (IV.2d) | `styles/components/nudges.css` | `.dom-badge--*` | ~429 |
| Franja superior de 3px por dominio en modales de registro (IV.2b) | `styles/modals.css` | `.modal-overlay[data-dom] .modal::before` | ~68 |
| `--fk-section-accent` por dominio (compartida: franja de modal + progreso), variante `-text` (IV.2b) | `styles/modals.css` | `[data-dom="X"] { --fk-section-accent: var(--fk-dom-X-text) }` | ~80 |
| `data-dom="X"` en los 15 modales de registro con dominio propio | `index.html` | `.modal-overlay#modal-*` | ~812-1084 |
| Barra/anillo de progreso: estado por defecto teñido por sección, semántico intacto (IV.2b) | `styles/components/atoms.css` | `.progress-bar`, `.progress-ring-wrap` (no sus modificadores `--near`/`--complete`/`--warn`/`--danger`) | ~433, ~485 |
| `data-dom` en anillos/barras de progreso por vista | `modules/dominio/metas/view.js`, `apartados/view.js`, `ahorro/view.js`, `personales/view.js` (2), `analisis/view.js` (3 factores) | atributo `data-dom="X"` en el wrapper del anillo/barra | |
| Calendario: "fijo" en índigo propio (no amarillo prestado de Límites) | `styles/components/config.css` | `.cal-dot--fijo`, `.cal-detail__item--fijo`, `.cal-detail__icon--fijo` (todos `--fk-dom-agenda`) | ~774 |
| Calendario: tarjetas de evento con fondo teñido (reemplaza franja lateral AG.7) | `styles/components/config.css` | `.cal-detail__item--*` (`background: color-mix(..., 8%, --fk-bg-elevated)`) | ~910 |
| Inicio: etiqueta de tipo (`.dom-badge`) en Pendientes/Prioridades + fix del bug apartado→fijo | `modules/dominio/compromisos/views/dashboard.js` | `_tipoBadge()`, `cal-dot--apartado` (nuevo) | ~13 |
| `.dom-badge--agenda`/`.dom-badge--ahorro` (variantes nuevas, consumidas por Inicio) | `styles/components/nudges.css` | `.dom-badge--*` | ~429 |

**Recursos**: tokens `--fk-dom-X`/`-bg`/`-text` de los 11 dominios (`tokens.css`, overrides de `-text` en `themes.css`). Apartados comparte la familia menta de Ahorro (`--fk-dom-ahorro`, ADR 031 P4); Inicio y Ajustes no son dominios financieros (ADR 025 D6) y quedan monocromos (acento genérico).

**Dependencias y relaciones**: el mapeo de acento vive en selectores de atributo `[data-section="X"]` puros (sin acoplar a `.nav-item`), así que cualquier elemento futuro con ese atributo hereda el color automáticamente. `shell.js` (`markActiveNav`) sigue siendo el único que asigna `.active`/`aria-current`; esta funcionalidad es 100% CSS + markup estático, sin JS nuevo.

**Riesgos**:

- **Contraste texto vs. gráfico son estándares distintos** (hallazgo real de esta rebanada): un glifo (icono dentro de teja) es "graphical object" (WCAG 1.4.11, umbral 3:1); un nombre de sección en el nav es texto real (WCAG 1.4.3, umbral 4.5:1). Mezclarlos hace fácil pasar el umbral equivocado. La teja usa 14% de tinte (glifo, 3:1 de sobra); el nav activo usa **6%**, no el 12% de `--fk-dom-X-bg` (con 12%, el texto sobre su propio tinte caía a 4.22-4.46:1 en tema claro para varios dominios, verificado con la fórmula WCAG real, no a ojo: mismo método que IV.1). No reusar `--fk-dom-X-bg` para fondos que llevan el propio `-text` encima sin volver a medir.
- **Nunca usar el token crudo `--fk-dom-X` como `color` de texto o glifo significativo**: falla contraste en tema claro (el hueco que IV.1 ya había detectado y esta rebanada corrigió en `.cat-teja` y `.menu-mas__item .icon`, preexistente a IV.2a). Usar siempre `-text`.
- **`data-section="apartados"` mapea a `--fk-dom-ahorro`**, no a un token propio (no existe `--fk-dom-apartados`, decisión ADR 031 P4). Si se le da color propio en el futuro, es una decisión de producto, no un bug a "corregir".
- **`.dom-badge--*` llevaba texto real sobre un tinte de 12%** (IV.2d): con `-text` encima, ese fondo caía a 4.22-4.46:1 en tema claro (mismo hallazgo que el nav de IV.2a). Se bajó a 6%, verificado en el navegador: `.dom-badge--gastos` en claro resuelve `color: rgb(209,59,0)` (`--fk-dom-gastos-text`) sobre fondo al 6%. Regla para toda superficie nueva: si el contenido encima del tinte es texto, 6%; si es solo un icono/glifo, 12-14% está bien.
- **`--fk-nudge-high-accent`/`-bg`/`-border` (tokens.css) siguen apuntando al token crudo `--fk-dom-gastos`** a propósito (border/acento, no texto: 3:1 de sobra) y NO se tocaron en IV.2d; solo se corrigió `.nudge-high .nudge__title` (el único uso de ese color como texto). Si se agrega otro uso de `--fk-nudge-high-*` como `color` de texto, debe ir con `-text`, no con el token crudo.
- **Presupuesto/Límites (`_renderGrupoCard`, `presupuesto/view.js`) NO tiene `data-dom` a propósito**: su barra ya sigue un esquema de color por rol del ADR 019 (Necesidades = neutro siempre, nunca alarma; Ahorro = celebra al completar; Estilo de vida = alerta ámbar/rojo vía `_claseProgreso`). Agregar `data-dom="presupuesto"` tiñe TAMBIÉN el estado neutro de Necesidades con el ámbar de Límites, rompiendo esa neutralidad deliberada. Cualquier cambio aquí es una decisión de producto (coincide con LIM.1), no un "falta migrar".
- **El fondo de un progreso teñido por dominio necesita `-text`, no el token crudo**: a diferencia de una franja/borde decorativo (exento del umbral no textual porque no es la única vía de información), el relleno de una barra/anillo SÍ es la información y debe pasar WCAG 1.4.11 (3:1) en serio. El token crudo de varios dominios falla ese umbral contra el fondo del track en tema claro (medido: ahorro 1.88:1, personales 2.39:1, tesorería 2.65:1). Cualquier superficie nueva que use `--fk-section-accent` (o cualquier variable de dominio) como relleno de una barra/anillo/gráfico debe usar `-text`, reservando el token crudo para acentos puramente decorativos (franjas, bordes finos).
- **Verificación de `color-mix()` en tema claro: no alternar `body.classList` en caliente para medir, cargar la página ya con el tema puesto.** Alternar `document.body.classList.add('light-theme')` y leer `getComputedStyle(...).backgroundColor` en el mismo script (incluso separado por `requestAnimationFrame`) puede devolver un valor stale/incorrecto para propiedades que dependen de `color-mix()` con variables CSS (se observó `oklab()` con luminancia de tema oscuro justo después de alternar a claro), aunque las variables CSS en sí (`getPropertyValue('--fk-bg-elevated')`) sí se lean correctamente en el mismo instante. Esto NO afecta a producción (el tema se fija antes de que corra JS de la app, o se alterna vía un botón real con reflow de por medio, no de scripts de automatización síncronos); es una trampa solo para verificación en este entorno. Forma confiable de medir: `localStorage.setItem('fk_theme', 'light')` ANTES de `navigate()`, nunca alternar la clase después de cargada la página.
- **Entorno de desarrollo: el navegador cachea agresivamente los `.css`/`.js` servidos por `python -m http.server`** (sin `Cache-Control` explícito, cachea por heurística) y esto sobrevive a `Ctrl+Shift+R` vía automatización, a desregistrar el service worker, a limpiar `caches.keys()` y hasta a reiniciar el servidor y abrir una pestaña nueva. Si al verificar un cambio de CSS/JS en el navegador el resultado no refleja el archivo editado, antes de sospechar del código: `fetch(url, {cache:'reload'})` sobre los archivos tocados (fuerza revalidación real con el servidor) y RECIÉN DESPUÉS navegar/recargar. Confirmar con `document.styleSheets` recorriendo `rule.styleSheet.cssRules` en las `CSSImportRule` (los `@import` no aparecen en `cssRules` de primer nivel).
- **IV.2d excluyó a propósito Calendario e Inicio** (`.cal-dot--*`, `.cal-detail__icon--*` en `config.css`; `.vencidos-card__icon--*` en `domain.css`; `.prioridades-card__dot` en `compromisos/dashboard.js`, que reutiliza `cal-dot--*` para colorear su icono): esas superficies tienen el mismo patrón de token crudo sin migrar, pero viven en el alcance de **IV.2c** (calendario/inicio), que probablemente las rediseñe (teja + etiqueta de tipo). Migrarlas ahora sería trabajo duplicado si IV.2c cambia el markup.

**Cambios pendientes**: ninguno de IV.2 (completa). IV.3 (números y estados) e IV.4 (iconografía post-color) siguen en BOARD. El teja de "Movimientos" (sub-vista de Inicio, sin dominio propio) y "Inicio"/"Ajustes" quedan deliberadamente sin teja/tinte. Presupuesto/Límites (`_renderGrupoCard`) quedó sin tinte de dominio en sus barras a propósito (ver riesgo abajo); si más adelante se decide integrarlo, coordinar con LIM.1.

**Cambios realizados**:

- 2026-07-10 (IV.2c): "fijo" pasa del amarillo prestado de Presupuesto al indigo propio de Calendario, resolviendo la ambiguedad que diagnostico el ADR 031; el detalle del dia abandona la franja lateral por fondo tenido.
- 2026-07-10 (IV.2b): `.progress-bar` y `.progress-ring-wrap` (unica fuente de progreso) tinen su estado por defecto con `--fk-section-accent`.
- 2026-07-10 (IV.2d): migracion de `color: var(--fk-dom-X)` al token `-text` en los usos restantes fuera de Calendario e Inicio.
- 2026-07-09 (IV.2a): nav y pestanas del hub tenidas por dominio; teja de icono y acento en los 11 encabezados de seccion.
- 2026-07-07 (IV.1, ADR 031): tokens `--fk-dom-*` con rampa `-bg`/`-text` para los 11 dominios.

**Observaciones**: ADR relacionado: [031](../DECISIONS/031-identidad-de-color-por-seccion.md). Metodología de verificación de contraste (heredada de IV.1, reforzada aquí): nunca aprobar un color "seguro" solo por inspección visual; calcular luminancia relativa y ratio WCAG real contra el fondo efectivo (incluyendo mezclas `color-mix`), y elegir el umbral correcto según si el contenido es texto (4.5:1) o gráfico (3:1).
