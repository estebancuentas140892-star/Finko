# Ficha de contexto: Inversión

> Revisado: 2026-08-11.

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## La sección Inversión: los tres momentos (dominio `inversiones`, DIS.17)

- **Objetivo**          : acompañar a quien está aprendiendo a invertir, no solo registrarle cifras. La sección no lista un portafolio: nombra la etapa en la que está el usuario y le enseña una cosa distinta en cada una. Una inversión se registra **una sola vez**: no tiene aportes, ni recurrencia, ni monto objetivo, así que tampoco tiene barra de progreso (ponerle una sería inventarle una meta que no tiene). El capital solo crece por una vía: el asistente "Distribuir mi ingreso", nunca desde la tarjeta.
- **Estado actual**     : estable. **EDIT.1 (rebanada Inversión) cerrada** (2026-08-02): tipo, nombre, monto, tasa EA, plazo y fecha se editan sin recrear la inversión, botón "Editar" en cada holding. El origen del dinero no se vuelve a preguntar (se decide una sola vez al crear, ADR 053): `normalizarInversion(datos, inversionExistente)` preserva el `cuentaId`. Con cuenta de origen, editar el monto ajusta el delta contra el saldo de esa cuenta (ADR 053 I3), con confirmación si el aumento deja la cuenta en negativo. **Me deben es la última rebanada pendiente de EDIT.1.** **INV.1 cerrada** (2026-07-29): el dominio deja de ser el único de las cuatro bolsas de ahorro que no tocaba cuentas. El formulario pregunta el origen del dinero (salió de una cuenta / ya la tenía), sugerido según la fecha de inicio; con cuenta de origen, registrar descuenta el saldo y eliminar lo devuelve. Cierra el hallazgo H5 de la auditoría del 2026-07-25 y el ADR 053. **DIS.19** (2026-07-29) no cambió esta pantalla, pero sí de dónde saca su aritmética: la cadena de proyección bajó a `infra/portafolio.js` para que el carril de Inversión en la casa de Ahorro dibuje el mismo gráfico sin importar este dominio. **DIS.17 cerrada** (2026-07-28): el hero de total invertido, la card de proyección al vencimiento, la lista de porcentajes por tipo, la pila de nudges y el tip permanente se fusionaron en `.inversion-momento`, una tarjeta por etapa con el gráfico de dos columnas. Momentos 1 y 2 vivos; el 3 queda diseñado y sin construir por falta de un dato (ver Riesgos). J.2a (total + lista), J.2b (proyección) y J.2c (nudges) siguen siendo el cálculo: DIS.17 cambió quién lo muestra y cómo se dice, no la fórmula.
- **Verificado contra** : ARQ.1c (2026-08-02).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| La tarjeta del momento y sus bloques | `modules/dominio/inversiones/view.js` | `_renderMomento()`, `_renderDuo()`, `_renderNotaMomento()`, `_renderAcciones()` | ~72 |
| Qué momento es y qué frase le toca | `modules/dominio/inversiones/logic.js` | `momentoInversion(inversiones, contexto)` | |
| El corte que decide el momento, compartido con la casa de Ahorro | `modules/infra/portafolio.js` | `etapaDePortafolio(inversiones)` | |
| Geometría del gráfico de dos columnas | `modules/dominio/inversiones/logic.js` | `columnasPortafolio(inversiones)` | |
| Explicación y rasgo de cada tipo | `modules/dominio/inversiones/logic.js` | `EXPLICACION_TIPO`, `RASGO_TIPO`, `explicacionTipo()`, `rasgoTipo()` | |
| Fecha de vencimiento de una inversión | `modules/dominio/inversiones/logic.js` | `fechaVencimientoInversion(inv)` | |
| Proyección al vencimiento (J.2b) | `modules/dominio/inversiones/logic.js` | `proyectarInversion(inv)`, `proyectarPortafolio()`, `esProyectable()` | ~279 |
| Rentabilidad real descontando el IPC (E.5) | `modules/dominio/inversiones/logic.js` | `calcularRentabilidadRealPortafolio()`, `tasaPromedioPonderada()` | ~387 |
| Nudges educativos (J.2c) | `modules/dominio/inversiones/logic.js` | `detectarNudgesInversion(inversiones, contexto)` | ~430 |
| Lista de holdings y su tarjeta | `modules/dominio/inversiones/view.js` | `_renderLista()`, `_renderItem()` | |
| Alta y eliminación | `modules/dominio/inversiones/index.js` | `_nuevaInversion()`, `_guardarInversion()`, `_eliminarInversion()` | ~37 |
| Editar una inversión, delta de saldo si tiene cuenta (EDIT.1, ADR 053 I3) | `modules/dominio/inversiones/index.js` | `_editarInversion(el)`, rama `idEdit` de `_guardarInversion()` | |
| Normaliza datos del form, crear vs. editar (EDIT.1) | `modules/dominio/inversiones/logic.js` | `normalizarInversion(datos, inversionExistente)` | ~299 |
| Form de inversión, crea o edita; nota de origen en solo lectura al editar | `modules/dominio/inversiones/view.js` | `renderFormInversion({fechaInicio, inversion})`, `_renderOrigenEditable()` | ~390 |
| Origen del dinero: sugerencia, validación y descuento (INV.1) | `logic.js` (`origenSugerido()`, `validarOrigenInversion()`), `view.js` (`_renderOrigen()`), `index.js` (`_wireOrigen()`, `_ajustarSaldoCuenta()`) | | |
| Aporte desde "Distribuir mi ingreso" | `modules/dominio/inversiones/index.js` | `EventBus.on('distribucion:aplicar', ...)` | ~117 |
| Fórmulas financieras compartidas | `modules/infra/financiero.js` | `calcularCDT()`, `calcularInteresCompuesto()`, `calcularRentabilidadReal()`, `calcularRegla72()` | |
| Schema de la inversión | `modules/core/state.js` | `S.inversiones[]` (`tipo`, `nombre`, `monto`, `tasaEA`, `plazoMeses`, `fechaInicio`, `cuentaId?`) | |

**Recursos**: la proyección y la geometría del gráfico viven en `infra/portafolio.js` (`calcularTotalInvertido`, `calcularPorTipo`, `esProyectable`, `proyectarInversion`, `proyectarPortafolio`, `columnasPortafolio`); `logic.js` las re-exporta con el nombre de siempre y conserva lo que es de la sección (tipos, validación, nudges, `momentoInversion`, rentabilidad real). Desde **ARQ.1c** el mismo archivo guarda `etapaDePortafolio()`, el corte que decide qué momento es; `logic.js` lo consume pero **no** lo re-exporta (ningún llamador de la sección lo pide por su nombre). Estilos en `styles/components/analysis.css` (`.inversion-momento`, `.inversion-lista`, `.inversion-item__*`) y una línea en `styles/responsive.css` (los 44px de `.inversion-momento__secundaria`, que compite con `.btn-sm` de ese mismo archivo). Token de dominio `--fk-dom-inversion` (turquesa, [ADR 031](../DECISIONS/031-identidad-de-color-por-seccion.md)); el gráfico usa cinco mezclas de ese token con `color-mix` vía `data-seg="0..4"`, y el segmento del tiempo es el único a tinta plena. IPC observado y meta de BanRep en `modules/core/constants.js` (`ipcObservadoVigente()`).

**Dependencias y relaciones**: `inversiones` no importa de otros dominios (ADN 10). La vista **lee** `S.ahorro.fondoEmergencia` (solo el slice de estado, sin importar el dominio Ahorro) para pasarle el contexto a `momentoInversion()`. Escucha `EventBus.on('distribucion:aplicar', ...)` para sumar al capital lo que el plan de distribución asignó. Desde **INV.1** también escribe en `S.cuentas` (vía `editar('cuentas', ...)` de `infra/crud.js`, nunca importando tesorería: mismo patrón que `personales`, `metas`, `apartados` y `compromisos`) para descontar o devolver el saldo de la cuenta de origen. `analisis` suma las inversiones al patrimonio vía `calcularActivos()`.

**Riesgos**:

- **El momento 3 no se puede construir y por eso no existe.** "Tu dinero ya trabaja para ti" necesita el **valor real de cada inversión en el tiempo** y la fecha de cada actualización; Finko solo guarda el monto que se puso y la tasa que el usuario escribió, así que la frase no tiene con qué probarse. El conteo sí lo nombra ("momento 1 de 3") y el anticipo del momento 2 fue reescrito para **no prometerlo**. Si alguien agrega ese dato, el momento 3 ya está diseñado (`Arquitectura Inversion - O con grafico propio.dc.html`).
- **El corte del momento ya no vive acá, las frases sí (ARQ.1c).** `momentoInversion()` pide el número a `etapaDePortafolio()` (`infra/portafolio.js`) porque la casa de Ahorro necesita la misma etapa para su carril y ADN 10 le prohíbe importar esta sección. Si el umbral cambia (hoy: una inversión con monto es el momento 1, dos o más el 2), se cambia allá y las dos pantallas se mueven juntas. **Desde AH.8 el carril de Ahorro además dice las mismas dos palabras del `chip`** ("aprendiendo", "construyendo") con su propio literal en `ahorro/logic.js`: renombrar el chip acá sin renombrar allá rompe un test de `bolsas.test.js`, que es lo que impide que las dos pantallas se separen. Lo que sigue siendo de la sección son los títulos, la explicación del tipo, el anticipo y la acción: infra no guarda copy, cada pantalla pone su vocabulario. `TOTAL_MOMENTOS` tampoco bajó: el conteo "momento 1 de 3" es del relato de esta sección y no lo lee nadie más.
- **`momentoInversion()` consume los nudges, no los reemplaza.** `detectarNudgesInversion()` sigue siendo la única fuente: la concentración y el refuerzo positivo entran en la frase del momento, y el del fondo de emergencia sale como `aviso` porque además decide cuál es la acción principal. Cambiar un `id` de nudge rompe la tarjeta en silencio.
- **Las dos columnas del gráfico comparten escala y tienen que sumar exacto.** Las alturas van en % de la columna de "al vencer" (que vale 100), por eso el `.inversion-momento__stack` **no lleva `gap`**: 2px de separación por segmento descuadraban la comparación (medido: 94 contra 92 px de cuerpo para el mismo dinero). La línea entre segmentos es un `box-shadow`, que no ocupa espacio.
- **Sin nada proyectable la segunda columna no se dibuja.** Un portafolio de puras acciones o cripto no tiene "después", que era la limitación conocida de la arquitectura N. Repetir la primera columna fingiría una comparación, así que en su lugar la nota invita a agregar tasa y plazo.
- **El origen del dinero no se puede reasignar a otra cuenta al editar (decisión de EDIT.1).** Se decide una sola vez al crear (ADR 053); reabrir la pregunta permitiría mover el descuento histórico de una cuenta a otra sin que ese movimiento quede en ningún lado. Si el usuario se equivocó de cuenta de origen, la única salida hoy es eliminar y volver a crear.
- **La sugerencia de origen es una apuesta sobre el dato, no una certeza.** `origenSugerido()` decide con un solo umbral (30 días desde la fecha de inicio): más reciente sugiere cuenta, más vieja sugiere preexistente. Es correcto la mayoría de las veces y siempre editable, pero no hay forma de saber si el usuario cambió la fecha de inicio real de una inversión vieja sin que la sugerencia se equivoque.
- **La retención del 7% solo se modela en el CDT.** `proyectarInversion()` devuelve valor neto para CDT y bruto para el resto (la retención de fondos varía y no se modela). Cualquier cifra que se compare entre tipos arrastra esa asimetría.

**Cambios pendientes**: **el momento 3** y el dato que lo habilita (valor real en el tiempo), que pasa por triaje antes de ser tarjeta. El **consolidado del hub** (hallazgo A13) ya no vive acá: DIS.18 lo mudó a la casa de Ahorro y esta sección abre con `.section__volver` ([ADR 056](../DECISIONS/056-la-casa-de-ahorro.md)).

**Riesgos añadidos por DIS.19**:

- **`columnasPortafolio()` no se puede mover sola**: arrastra `proyectarPortafolio` → `proyectarInversion` → `esProyectable` y `calcularPorTipo`. Por eso el movimiento a infra fue de la cadena completa y no de una función. Los seis nombres siguen exportados desde `logic.js`, así que ningún llamador cambió; `bolsas.test.js` compara identidad de función entre infra y el dominio para que una copia local nueva falle.

- **La versión del carril y la de la sección son el mismo gráfico con distinto tamaño**, a propósito: el carril tiene que enseñar a leer la pantalla a la que lleva. Si divergen, el usuario aprende dos veces lo mismo.

**Cambios realizados**:

- 2026-08-02 (**ARQ.1c**): `etapaDePortafolio()` baja a `infra/portafolio.js` y `momentoInversion()` lo consume. Sin cambio de comportamiento: mismos números, mismas frases. Ver CHANGELOG.
- 2026-08-02 (**EDIT.1**, rebanada Inversión, commit `886c5b7`): botón "Editar" por holding; `normalizarInversion(datos, inversionExistente)` preserva `cuentaId`, el origen no se vuelve a preguntar; con cuenta de origen, editar el monto ajusta el saldo por delta (ADR 053 I3), con confirmación solo si el aumento deja la cuenta en negativo. 13 tests unitarios nuevos. Verificado en la app real: editar campos, subir monto con y sin cubrir el saldo, bajar monto (devuelve sin preguntar).
- 2026-07-29 (**INV.1**): el formulario pregunta el origen del dinero (dos ramas, sugerida por la fecha de inicio); con cuenta de origen, guardar descuenta el saldo (con confirmación si deja la cuenta en negativo) y eliminar lo devuelve, salvo que la cuenta ya no exista. `S.inversiones[].cuentaId` nuevo y opcional, sin bump de schema. Ver CHANGELOG.

- 2026-07-29 (**DIS.19**, rebanada 0): la cadena de proyección y `columnasPortafolio()` bajan a `infra/portafolio.js` con re-export desde `logic.js`. Sin cambio de comportamiento. Ver CHANGELOG.

- 2026-07-28 (**DIS.17**, arquitectura O con el gráfico de N, auditoría de diseño por secciones): la cabecera pasa de total a etapa, gráfico de dos columnas con la primera partida por tipo, lenguaje reescrito sin tecnicismos, nudges absorbidos en la frase del momento y un solo primario por pantalla. `momentoInversion()`, `columnasPortafolio()`, `fechaVencimientoInversion()`, `rasgoTipo()` y `explicacionTipo()` nuevas en `logic.js`. Ver CHANGELOG.
