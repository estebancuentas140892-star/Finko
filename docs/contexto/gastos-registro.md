# Ficha de contexto: Gastos, el registro

> Revisado: 2026-11-19 (GAS.9a).

> Cómo se registra un gasto: el formulario, la confirmación tras guardar y "Repetir". Partida de [`gastos.md`](gastos.md) el 2026-11-19 (GAS.9a) por el techo de 40 KB; los bloques se movieron sin cambios. Reglas de uso en [`README.md`](README.md).

---

## Formulario de gasto (TX.9 + FORM.1a)

- **Objetivo**          : rediseñar el formulario de registrar gasto para que la categoría sea el dato principal (no la descripción), soporte categorías creadas por el usuario, y no pida una descripción redundante cuando la categoría ya representa el concepto. Desde FORM.1a ([ADR 042](../DECISIONS/042-formularios-v2-visual.md)) es además el flagship del lenguaje de formularios v2: monto hero al frente, categoría con chips de ícono (sin select), fecha con atajos Hoy/Ayer/Otra fecha.
- **Estado actual**     : **TX.9 completa** (categoría primero y categorías personalizadas); IN.5 y FORM.1a cerradas: el ADR 042 D2 puso el monto primero. GAS.2, en "Confirmación tras guardar".
- **Verificado contra** : GAS.5c (2026-11-17, [ADR 162](../DECISIONS/162-en-que-fue-y-necesidad-o-deseo-en-cada-gasto.md)): `_htmlDetalle` y la etapa `detalle` (`telefono.js`), `preguntaNecesidadODeseo` (`logic.js`), `_anotarCaracter` (`index.js`). Antes: GAS.5b, GAS.C, GAS.3, FORM.2b y lo anterior: en el CHANGELOG de noviembre y los meses cerrados.

**Dónde vive (FORM.1a)**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| Form v2 completo (monto hero + chips + fecha con atajos) | `modules/dominio/gastos/view.js` | `renderFormGasto()` | radios reales `name="categoria"` y `name="fechaOpcion"`; el date real `#gasto-fecha` vive oculto en `#gasto-fecha-otra` |
| Wiring de chips y atajos de fecha | `modules/dominio/gastos/index.js` | `_montarFormGasto()` | listener delegado de `change` en el form (categoría revela `#categoria-nueva-fields`; hoy/ayer escriben el date, "otra" lo revela) |
| Edición: marcar chip de categoría y de fecha | `modules/dominio/gastos/index.js` | `_editarGasto()` | categoría legacy fuera de catálogo → ningún chip marcado, se re-elige (mismo comportamiento que tenía el select) |
| Teléfono: etapas, recibo y mini-hojas (FORM.2b, ADR 142 D4) | `modules/dominio/gastos/telefono.js` | `renderFormGastoTelefono()`, `montarFormGastoTelefono()`, `irAEtapaGasto()`, `fechaDelRecibo()` | mismos `name` e ids que la columna (`#gasto-fecha` es `hidden` dentro de la mini-hoja de la fecha; `#grupo-gasto-cuotas` es la fila "Cuotas" del recibo). Editar, "Repetir" y un frecuente llaman `irAEtapaGasto(form, 'revisar')` tras prellenar. "Deshacer" (`_deshacerGastos`) vale también en escritorio |
| Teléfono: la ficha editable (FORM.2d, ADR 142 D6) | `modules/dominio/gastos/telefono.js`, `index.js`, `detalle.js` | `_htmlFicha()`, `renderFormGastoTelefono({ ficha })`, `_guardarGasto` con `form.dataset.quedarse`, `_restaurarGasto()`, `htmlExtrasDetalleGasto()` | en el teléfono `gasto-detalle` y `editar-gasto` abren la ficha (`#form-gasto[data-ficha]`). Al volver al recibo se compara la firma de `FormData`; si cambió, `requestSubmit()` con `quedarse` (no cierra, repinta y avisa con "Deshacer"). Escritorio conserva la hoja del ADR 119 |
| Teléfono: lógica pura | `modules/dominio/gastos/logic.js` | `ordenarCategoriasPorUso()`, `cuentaHabitual()`, `planSiNoAlcanza()` | el plan es la cuenta y lo que falta: apaga "Guardar gasto" (ADR 156 D6); el teléfono no reparte |
| Ayer en ISO local | `modules/dominio/gastos/view.js` | `ayerIso()` | exportada desde FORM.1a (antes `_ayerIso` privada) |
| Componentes CSS del lenguaje | `styles/components/forms.css` | bloque "FORMULARIOS V2" | ver ficha [`captura.md`](captura.md), sección "Lenguaje de formularios v2" |
| Teja del header del modal | `index.html` | `#modal-gasto .modal__teja` | tinte por `--fk-section-accent` del `data-dom="gastos"` |
| Helper E2E de los chips | `tests/e2e/smoke.test.js` | `elegirCategoriaGasto(form, value?)` | clickea el label del chip (el radio está oculto); sin `value` toca el primero (Mercado) |

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Formulario completo de gasto | `modules/dominio/gastos/view.js` | `renderFormGasto()` | ~362 |
| Orden de campos (TX.9a) | `modules/dominio/gastos/view.js` | `renderFormGasto()` | ~381 (Categoría → Monto → Cuenta → Fecha → Nota; sin campo Descripción) |
| Validación (descripción ya no obligatoria, TX.9a) | `modules/dominio/gastos/logic.js` | `validarGasto()` | ~148 |
| Transformación form → shape de `S.gastos` (descripcion solo si viene, TX.9a) | `modules/dominio/gastos/logic.js` | `normalizarGasto()` | ~244 |
| Campo `nota` (opcional, ya al final del form) | `modules/core/state.js` / `modules/dominio/gastos/logic.js` | `Gasto.nota` / `normalizarGasto()` | ~214 |
| Catálogo de categorías nativas (fijo) | `modules/core/constants.js` | `CATEGORIAS_GASTO`, `CATEGORIAS_GASTO_USUARIO` | ~400, ~426 |
| Subcategoría y "¿gusto o necesidad?" (SUS.2a, [ADR 147](../DECISIONS/147-gusto-o-necesidad-hormiga-sin-adivinar.md)) | `constants.js`, `gastos/view.js`, `index.js`, `telefono.js`, `logic.js` | `SUBCATEGORIAS_GASTO`, `CARACTER_CATEGORIA_GASTO`, `htmlDetalleCategoriaGasto()`, `sincronizarDetalleCategoria()`, `_pintarFilaDetalle()`, `normalizarGasto()` | un `<fieldset>` por categoría, oculto y `disabled` salvo el elegido; en el teléfono vive en la mini-hoja `#gasto-mini-detalle` |
| Mapeo categoría nativa → ícono | `modules/core/constants.js` | `CATEGORIA_ICONO` | ~448 |
| Catálogo de íconos elegibles para categoría personalizada (29, sin duplicar los nativos) | `modules/core/constants.js` | `ICONOS_CATEGORIA_PERSONALIZADA` | ~470 |
| Resolver de ícono (nativa → personalizada → genérico, TX.9b) | `modules/core/constants.js` | `iconoDeCategoriaGasto(categoria, personalizadas)` | ~505 |
| Colección de categorías creadas por el usuario (bump v24) | `modules/core/state.js` | `S.categoriasPersonalizadas` | ~304 |
| Validación de categoría nueva (nombre sin duplicar, ícono del catálogo) | `modules/dominio/gastos/logic.js` | `validarCategoriaPersonalizada(datos, existentes)` | ~176 |
| Opción "+ Otra categoría" + selector de ícono inline en el form | `modules/dominio/gastos/view.js` | `renderFormGasto()`, `CATEGORIA_NUEVA_VALUE` | ~364 |
| Reveal/hide de los campos nuevos + click del selector de ícono | `modules/dominio/gastos/index.js` | `_montarFormGasto()` | ~438 |
| Creación y persistencia de la categoría al enviar el formulario | `modules/dominio/gastos/index.js` | `_guardarGasto()` | ~51 |
| Título del ítem en la lista: la nota o descripción si hay, si no la categoría (ADR 132 D4, supera TX.9a) | `modules/dominio/gastos/view.js` | `textosFilaGasto()` | ~560 |
| Nombre del gasto en confirmación de borrado / anuncio a11y (fallback a categoría, TX.9a) | `modules/dominio/gastos/index.js` | `_eliminarGasto()` | ~334 |
| Descripción del Movimiento cuando el gasto no tiene descripción (fallback a categoría, TX.9a) | `modules/dominio/movimientos/logic.js` | `movimientosDesdeGastos()` | ~48 |
| Gasto importado sin efecto en el saldo (HF.0c, ADR 091 P4): editar y borrar ("editar hacia nada") no mueven cuentas | `modules/dominio/gastos/logic.js`, `gastos/index.js`, `import/logic.js` | `deltasPorEdicionDeGasto()`, `_guardarGasto()`, `_eliminarGasto()`, `normalizarFila()` | |

**Recursos**: `ICONOS_CATEGORIA_PERSONALIZADA` (29 símbolos `c-*` del sprite sin asignar en `CATEGORIA_ICONO`) y el selector de ícono `.icono-picker` en `forms.css`.

**Dependencias y relaciones**: `iconoDeCategoriaGasto()` vive en `core/constants.js` para que `gastos/` y `movimientos/` lo importen sin romper ADN 10; `movimientosDesdeGastos()` recibe `S.categoriasPersonalizadas` como parámetro.

**Riesgos**:

- **Reclamé "sin distinguir tildes" en `validarCategoriaPersonalizada()` antes de implementarlo**: el primer intento solo hacía `toLocaleLowerCase()`; un test con una tilde de más lo encontró. Se agregó `.normalize('NFD').replace(/\p{Diacritic}/gu, '')`. **Lección**: si el docstring promete una garantía (aquí, insensibilidad a tildes), escribir el test que la ejercite ANTES de dar la función por terminada, no asumir que el caso "obvio" ya está cubierto.
- **Relaciona con TX.10** (categoría como eje de automatización): ese card explícitamente advierte "revisar juntas para no construir 3 motores de sugerencia por categoría distintos". TX.9 (a y b) no implementó detección de gasto hormiga/fantasma nueva; solo reordenó el formulario y sumó categorías de usuario, dejando la puerta abierta para que TX.10 las use después.
- **Sin gestión de categorías personalizadas** (editar nombre/ícono, eliminar, ver cuántos gastos las usan): fuera de alcance de TX.9b, que solo cubre crear + usar. Si Esteban lo pide, es una tarjeta nueva (ej. TX.9c), probablemente en Ajustes.

- **Un gasto importado no mueve saldos (HF.0c, BUG-029)**: `normalizarFila()` lo marca `sinEfectoSaldo` y `deltasPorEdicionDeGasto()` devuelve `{}` para él, al editar y al borrar; el confirm de borrado ya no promete devolver nada. Los importados antes de la v44 no tienen marca y siguen reembolsando (P4: sin backfill). "Repetir" uno crea un gasto manual normal. La marca solo cubre la cuenta: editar un importado hacia un consumo con tarjeta sigue moviendo la deuda.

**Riesgos nuevos (FORM.1a)**:

- **La regla móvil anti-zoom de iOS pisa los inputs por capas:** `responsive.css` declara `.input { font-size: 16px }` en móvil y su capa le gana por ORDEN a `components`, aunque la especificidad diga lo contrario. La excepción de `.input--big-amount` (2.25rem) vive en `responsive.css`, dentro de la misma media query: cualquier componente futuro que necesite un input distinto en móvil debe poner su excepción AHÍ, no en `forms.css`.
- **Los chips son labels con el radio oculto:** en E2E no sirve `check()` sobre el input (no visible); se clickea el label (`elegirCategoriaGasto`). En unit, el estado seleccionado se lee por `input.checked`, no por clases.
- **`form.querySelector('[name="categoria"]').value` ya no sirve para leer/escribir la categoría** (devuelve el primer radio): leer vía FormData (como siempre hizo `_guardarGasto`) o iterar radios (como `_editarGasto`).
- **El primer bloque del formulario es `.monto-hero` y así debe quedar (ADR 042 D2, regla R11)**: TX.12 insertó los chips de gasto frecuente antes y el form dejó de abrir con el monto durante tres días sin que nadie lo decidiera; DIS.4/G9 lo devolvió a su lugar. Cualquier bloque nuevo (atajo, sugerencia, ayuda) va **después** del monto.

**Cambios pendientes**: ninguno conocido para TX.9. Posible extensión futura: gestión de categorías personalizadas (ver Riesgos). El resto de la iniciativa Formularios v2 (FORM.1b deuda, FORM.1c gasto fijo) vive en el BOARD.

**Cambios realizados**:

- 2026-11-17 GAS.5c ([ADR 162](../DECISIONS/162-en-que-fue-y-necesidad-o-deseo-en-cada-gasto.md)): "¿En qué fue?" es una etapa del teléfono (subcategoría con "Otra cosa"); "¿Fue una necesidad o un deseo?" obligatoria al registrar cuando lo elegido depende del día, y vale solo para ese gasto (`preguntaNecesidadODeseo`).
- 2026-11-17 GAS.5b ([ADR 161](../DECISIONS/161-dia-a-dia-tino-anota-sin-flecha.md) D2): ningún gasto deja la cuenta bajo $0, en los dos anchos y al editar (`_gastoSinSaldo`, `planSiNoAlcanza` con el gasto anterior); sale "¿Registrar de todas formas?".
- 2026-11-17 GAS.C ([ADR 158](../DECISIONS/158-el-recibo-de-gasto-es-un-comprobante.md)): el recibo del teléfono es un comprobante con las piezas de `assets/svg/comprobante/` (sprite `cmp-*`); la cabecera de "Revisar" es la banda de Finko. Falta el arte de GAS.C2.
- 2026-11-17 GAS.3 ([ADR 156](../DECISIONS/156-registrar-gasto-en-el-telefono-tablero-integral.md)): la hoja del tablero integral; sin "Usar el teclado del teléfono" ni "Guardar y registrar otro"; un mensaje y sin guardar si la cuenta no alcanza; la fila de cuentas de Inicio; calendario centrado; la nota sin destello.
- 2026-11-15 SUS.2a ([ADR 147](../DECISIONS/147-gusto-o-necesidad-hormiga-sin-adivinar.md)): Mecato, "Sé más específico" y, en Otros o una categoría propia, "¿Es un gusto o una necesidad?"; el gasto guarda `subcategoriaId` y `caracter` (v52) y la fila se titula con la subcategoría.
- 2026-11-04 (**BUG-038** y **BUG-035**, 5c97b98): editar un pago o abono abre con su categoría fija y sin tarjetas; editar o borrar el pago de un fijo no toca `saldoTotal`. Ver CHANGELOG.
- 2026-10-17 (**HF.0c**, BUG-029): el gasto importado no toca el saldo al importarlo, editarlo o borrarlo (`sinEfectoSaldo`, schema v44). Ver CHANGELOG.
- 2026-08-10 (GAS.2a): ver bloque "Confirmación tras guardar" más abajo.
- 2026-07-15 (FORM.1a): form v2 completo (monto hero, chips de categoría, atajos de fecha, teja del header, footer principal) + fix del hueco preexistente de `responsive.css` que achicaba `.input--big-amount` en móvil. Ver [CHANGELOG](../CHANGELOG.md) y [ADR 042](../DECISIONS/042-formularios-v2-visual.md).

- 2026-07-06 (IN.5): se eliminó "Gasto rápido" (botón, modal y la cola de "pendientes por organizar"); el formulario completo ya registra en pocos toques. Detalle en el changelog de julio. SW v330.
- 2026-07-05: 2 hitos resumidos el 2026-11-15 para que la ficha quepa en su techo (TX.9b, TX.9a). Detalle en [2026-07](../changelog/2026-07.md).

**Observaciones**: el campo **Nota** ya existía antes de TX.9a; la tarea solo reordenó alrededor de él.

---

## Confirmación tras guardar (GAS.2, triaje del handoff "22 Formulario de Gasto")

- **Objetivo**          : que guardar un gasto deje una prueba visual (no solo accesible) de qué se guardó y, cuando existe, qué consecuencia tuvo (límite tocado, saldo restante). Origen: auditoría de Claude Design de la ficha 22, que asumía un toast visual ya existente en Gastos; no existía (ver hallazgo abajo).
- **Estado actual**     : **completa** (GAS.2a a 2c, 2026-08-10 y 11): el toast dice qué se guardó y su consecuencia ([ADR 060](../DECISIONS/060-lectura-cross-domain-de-solo-lectura.md), [ADR 062](../DECISIONS/062-toast-de-consecuencia-en-abono-y-aporte.md)); detalle en el CHANGELOG de agosto.
- **Verificado contra** : GAS.2c (2026-08-11).

**Dónde vive**

| Pieza | Archivo | Ancla | Nota |
|---|---|---|---|
| Componente de toast genérico (cola, autocierre pausable, cierre manual) | `modules/ui/toast.js` | `mostrarToast({ titulo, detalle?, tono?, icono? })` | mismo patrón que el toast de logros (`dominio/logros/index.js`), copiado no importado: logros es privado de su dominio (ADN 10) |
| Primer consumidor | `modules/dominio/gastos/index.js` | `_guardarGasto()` | reemplaza al `announce()` que había ahí (mismo rol, `role="status"`); solo calcula la consecuencia en creación, no en edición |
| CSS del toast (3 tonos: ok/alerta/peligro) | `styles/components/nudges.css` | bloque "TOAST GENERICO (GAS.2a)" | reusa `@keyframes toastIn/toastOut` de `base.css` y `--fk-z-toast`; icono real del sprite (`i-check-circle`/`i-alert`), no emoji |
| Segunda línea, prioridad fija (excedido → alerta → saldo de cuenta → nada) | `modules/dominio/gastos/logic.js` | `consecuenciaDeGasto({ progreso, categoria, saldoCuenta, nombreCuenta, ocultarSaldo })` | pura, sin `S`; recibe el `progreso` ya calculado (ADR 060) |
| Lectura cross-domain del progreso del límite | `modules/dominio/gastos/index.js` | `_guardarGasto()`, import de `calcularProgreso` desde `../presupuesto/logic.js` | en `index.js`, no en `logic.js` (evita el ciclo con `presupuesto/logic.js`, que ya importa `gastosMes` de `gastos/logic.js`) |

**Hallazgo del handoff, corregido**: la ficha 22 de Claude Design daba por hecho un toast visual tras guardar; solo corría `announce()` (`sr-only`). GAS.2a construyó la pieza.

**Casos que la ficha no cubrió, resueltos en GAS.2b**:

| Caso | Cómo queda |
|---|---|
| Gasto repartido entre varias cuentas | sin cuenta única que nombrar; el aviso de límite (prioridad 1/2) sigue aplicando igual |
| Consumo con tarjeta (`consumoTC`) | no descuenta ninguna cuenta; mismo tratamiento que el repartido |
| Edición de un gasto existente | el toast queda en una línea ("Gasto actualizado"), sin recalcular consecuencia |
| Ojo de privacidad activo (`S.config.ocultarSaldo`) | ninguna cifra, ni de límite ni de saldo: corta antes de mirar el progreso |

**Riesgos**:

- **ADR 060 formaliza una lectura cross-domain que el código ya hacía en otros 3 sitios** (`presupuesto/logic.js`, `analisis/logic.js`, `analisis/view.js` leyendo de `gastos/logic.js`/`tesoreria/logic.js`), pero solo cubre "un `logic.js` puro importado por otro dominio". Si una tarjeta futura necesita leer de un `view.js` o `index.js` ajeno, ese ADR no lo habilita: es exactamente el acoplamiento que ADN 10 sigue prohibiendo.
- **ADR 059 no existe en el repositorio** pese a estar citado (BUG-027, cerrado el 2026-11-15).

**Cambios pendientes**: ninguno. Iniciativa GAS.2 completa.

**Cambios realizados**:

- 2026-08-11 (GAS.2c): la regla de confirmacion se generalizo a Abono (`compromisos/logic/abonos.js`, `consecuenciaDeAbono()`) y Aporte (`metas/logic.js`, `consecuenciaDeAporte()`), [ADR 062](../DECISIONS/062-toast-de-consecuencia-en-abono-y-aporte.md). Detalle y verificacion: `contexto/deudas.md` y `contexto/metas.md`.
- 2026-08-10 (GAS.2b): segunda línea del toast (`consecuenciaDeGasto()`), lectura cross-domain de `calcularProgreso()` ([ADR 060](../DECISIONS/060-lectura-cross-domain-de-solo-lectura.md)).
- 2026-08-10 (GAS.2a): toast genérico (`ui/toast.js`) y primera línea en `_guardarGasto()`.

---

## Gastos frecuentes y "Repetir" (TX.12)

- **Objetivo**          : el gasto cotidiano (almuerzo, café, Uber) es el registro más repetido de la app y se tecleaba entero cada vez. Dos entradas al mismo problema, patrón P2 de la auditoría de UX/producto: (1) chips derivados del historial en el formulario de "Nuevo gasto", que prellenan monto/categoría/cuenta y dejan solo confirmar; (2) botón "Repetir" en cada fila de la lista, que abre el formulario en modo creación prellenado con esa fila exacta (incluida su nota) y fecha de hoy.
- **Estado actual**     : cerrado el 2026-07-23. Sin dato nuevo ni schema (mismo patrón que AP.5a/AH.5a): todo sale de `S.gastos` ya existente. **TX.12b** (2026-07-27) corrigió el monto que ofrece el chip.
- **Verificado contra** : TX.12b (2026-07-27).

**Dónde vive**

| Pieza | Archivo | Ancla |
|---|---|---|
| Derivación pura de patrones repetidos | `modules/dominio/gastos/logic.js` | `gastosFrecuentes(gastos, hoyISO, opciones)` |
| Chips de un toque en el form (solo al crear) | `modules/dominio/gastos/view.js` | `_renderChipsFrecuentes()`, consumida por `renderFormGasto({ sugerencias })` |
| Botón "Repetir" en cada fila de la lista | `modules/dominio/gastos/view.js` | `_renderGastoItem()`, botón `data-action="repetir-gasto"` |
| Prefill compartido (chip de frecuente y "Repetir" de fila) | `modules/dominio/gastos/index.js` | `_prellenarCamposGasto(form, datos)` |
| Handlers | `modules/dominio/gastos/index.js` | `_repetirFrecuente()`, `_repetirGasto()` |
| Estilos de los chips | `styles/components/domain.css` | `.gastos-frecuentes__*` |

**Criterio de agrupación** (`gastosFrecuentes`): categoría, monto redondeado a $1.000 y descripción normalizada; 3 o más veces en 60 días, máximo 4, por más repetido y más reciente. Excluye los gastos con `compromisoId` (los repite su dominio). El monto que ofrece el chip es el del registro más reciente, sin redondear (TX.12b).

**Decisión de diseño:** el chip de frecuente no prellena la nota (sería ambigua entre registros); "Repetir" de una fila sí, porque apunta a una fila concreta.

**Riesgos**:

- **`renderFormGasto({ sugerencias })` cambia de firma**: acepta un objeto de opciones en vez de ningún argumento. Todos los call-sites existentes (incluidos los de los tests) seguían funcionando sin cambios porque el parámetro tiene default vacío; cualquier caller nuevo que quiera ocultar los chips (modo edición, "Repetir") debe pasar `sugerencias: false` explícitamente.
- **El botón "Repetir" vive en Gastos, no en Movimientos**: MOV.1 delega `editar-gasto`/`eliminar-gasto` desde el ledger al dominio dueño, pero `repetir-gasto` no se sumó ahí (fuera de alcance de esta tarjeta). Si se pide "repetir" también desde el ledger, es una entrada más en `_ACCIONES_POR_TIPO` de `movimientos/logic.js`, sin lógica nueva.

**Cambios pendientes**: ninguno conocido para esta pieza.

**Cambios realizados**:

- 2026-07-27 (TX.12b): el chip frecuente ofrece el `monto` real del registro más reciente, no el redondeado a $1.000 que solo agrupa. SW v433.
- 2026-07-26 (DIS.4/G9 y G3): los chips bajan **debajo** del monto hero (el label pasa a "O repite un gasto frecuente") y `.gastos-frecuentes__lista` cambia el scroll horizontal oculto por `flex-wrap`. Ver CHANGELOG.
- 2026-07-23 (TX.12, patrón P2 de la auditoría de UX/producto): chips de frecuentes y "Repetir" en la fila. SW v414. Detalle en [2026-07](../changelog/2026-07.md).
