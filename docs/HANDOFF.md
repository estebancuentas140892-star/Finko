# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-06 (feat(config): CFG.1a, situación laboral en el perfil, quita el SMMLV muerto)

**Producción:** https://finko-brown.vercel.app
**Repositorio:** https://github.com/estebancuentas140892-star/Finko

---

## 1. Qué es Finko

PWA offline-first de gestión financiera personal para Colombia.
Vanilla JS puro + ES6 modules. Sin framework, sin build step, sin servidor, sin cuenta.
Todo vive en `localStorage` (clave `fk_v1`). Pensada para personas con poco conocimiento
financiero: lenguaje simple, normativa colombiana (SMMLV, UVT, tasa de usura, GMF).

**Versión actual:** `v1.0.0` - todas las 14 fases originales completadas y cerradas.
**Rama principal:** `main`.

---

## 2. Estado técnico actual

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 2252/2252 verdes |
| Tests E2E | 155/155 verde. Suites: `smoke` 87 tests, `estrategia-pago` 15 tests, `ahorro-inversion` 9 tests, `hub-ahorros` 7 tests, `navegacion-render` 7 tests, `registrar-destinos` 6 tests, `install-prompt` 6 tests, `a11y-forms` 6 tests, `registrar-sheet` 5 tests, `reflow-320` 4 tests, `registrar-distribucion` 3 tests. |
| Schema version (localStorage) | v25 |
| Lighthouse Performance | 100 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(config): CFG.1a, situación laboral en el perfil (quita el SMMLV muerto) · 2026-07-06

Primera rebanada de la iniciativa fusionada **CFG.1 + CFG.2** ("Perfil fiscal/financiero en Ajustes"). Esteban eligió fusionar las dos tarjetas porque la situación laboral (CFG.1) alimenta la interpretación de renta (CFG.2). Análisis previo: el encabezado de Ajustes mostraba nombre + un campo "SMMLV configurado" editable, pero `S.perfil.smmlv` **no lo lee ningún cálculo** (toda la lógica usa la constante legal `SMMLV`): era dato muerto que confundía. Criba de las 8 preguntas de perfil propuestas: solo **situación laboral** tiene consumidor real y no es derivable (ingresos y frecuencia ya viven en `S.ingresos`); el resto se aplaza hasta que exista la feature que lo consuma.

CFG.1a quita el campo SMMLV del encabezado (`_renderPerfil`) y agrega un selector de **situación laboral** (empleado, independiente, pensionado, mixto, otro; vacío = sin especificar), persistido en `perfil.situacionLaboral` (schema v24 → v25, migración idempotente). El handler valida contra `SITUACIONES_LABORALES` (nunca guarda valor libre). `perfil.smmlv` se conserva en el estado por compatibilidad, solo deja de mostrarse.

**Validación:** 2252/2252 unit (9 nuevos: 5 de render en `tests/unit/config.test.js` nuevo, 4 de migración v25 en `storage.test.js`; `state.test.js` actualizado a la forma nueva de `perfil`) + 155/155 E2E en Chromium real (2 nuevos en `smoke.test.js`: el encabezado ya no muestra SMMLV; guardar situación laboral la refleja y persiste en `localStorage`). Ficha nueva `docs/contexto/configuracion.md` (primer análisis a fondo de la sección). SW v335 → v336.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `SITUACIONES_LABORALES` (catálogo de 5 situaciones). |
| `modules/core/state.js` | `perfil.situacionLaboral` nuevo; `smmlv` marcado `@deprecated`. |
| `modules/core/storage.js` | `SCHEMA_VERSION` 24 → 25; migración v24 → v25 (situación laboral por defecto ''). |
| `modules/dominio/config/view.js` | `_renderPerfil` quita el SMMLV y agrega el selector de situación laboral. |
| `modules/dominio/config/index.js` | Handler de `#form-perfil` guarda situación laboral validada (ya no el SMMLV). |
| `tests/unit/config.test.js` | Nuevo: 5 tests de render del perfil. |
| `tests/unit/storage.test.js`, `state.test.js` | Migración v25 (4 tests) + forma de `perfil` actualizada. |
| `tests/e2e/smoke.test.js` | 2 tests E2E del perfil (situación laboral). |
| `docs/contexto/configuracion.md` | Ficha nueva de la sección Ajustes. |
| `docs/contexto/README.md`, `docs/BOARD.md` | Índice de fichas; CFG.1/CFG.2 fusionadas, CFG.1a cerrada, CFG.2a/CFG.2b pendientes. |
| `service-worker.js` | v335 → v336. |

---

### feat(agenda): CAL.2, leyenda del calendario dinámica · 2026-07-06

Primera tarea trabajada sobre la sección Calendario bajo la metodología de fichas de contexto (regla 2.6): no existía `docs/contexto/calendario.md`, así que el análisis a fondo del dominio `agenda` quedó documentado en la ficha nueva antes de codificar. La leyenda bajo el calendario mostraba siempre las 4 entradas posibles (día de ingreso, gasto fijo, deuda con entidad, deuda personal) aunque el usuario no tuviera registros de varias de ellas en el mes visible, ocupando espacio sin aportar información.

Se agregó `tiposPresentesEnMes()` (nuevo, `agenda/logic.js`, función pura sin DOM): recorre el mapa de eventos ya calculado del mes y devuelve solo los tipos que realmente aparecen, en el orden canónico de la leyenda. `_renderLeyenda()` (`agenda/view.js`) pasó a recibir ese mapa de eventos y renderiza únicamente esas entradas; si ningún tipo está presente (mes sin compromisos ni ingresos), no dibuja el contenedor. Color, ícono y nomenclatura de cada tipo siguen siendo los oficiales (`cal-dot--*`, ya usados en los puntos del calendario): esta tarea solo decide qué entradas mostrar, no cómo se ven, cumpliendo la coherencia visual pedida.

**Validación:** 2243/2243 unit (10 nuevos en `tests/unit/agenda.test.js`: `tiposPresentesEnMes` con input inválido/vacío/parcial/completo, y render dinámico de la leyenda con 0, 1 y varios tipos) + 153/153 E2E en Chromium real (2 nuevos en `smoke.test.js`: sin compromisos ni ingresos no dibuja la leyenda; con los tres tipos presentes los muestra a los tres). Dos tests preexistentes que asumían la leyenda estática (mostraba las 4 categorías con estado vacío) se corrigieron para sembrar los tipos que ahora necesitan estar presentes. SW v334 → v335.

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/logic.js` | `tiposPresentesEnMes()` nuevo (puro, recorre el mapa de eventos y filtra contra el orden canónico). |
| `modules/dominio/agenda/view.js` | `_renderLeyenda()` recibe `eventos` y filtra dinámicamente; `_LABEL_LEYENDA` nuevo (etiquetas por tipo, mismas que antes). |
| `tests/unit/agenda.test.js` | 10 tests nuevos; 2 tests existentes de la leyenda corregidos al comportamiento dinámico. |
| `tests/e2e/smoke.test.js` | 2 tests nuevos/reescritos de la leyenda dinámica. |
| `docs/contexto/calendario.md` | Ficha nueva (primer análisis a fondo del dominio `agenda`). |
| `docs/contexto/README.md`, `docs/BOARD.md` | Índice de fichas actualizado; CAL.2 cerrada. |
| `service-worker.js` | v334 → v335. |

---

### perf(analisis): PERF.3, diferir el cómputo del grupo colapsado de Análisis · 2026-07-06

Cierre de la auditoría de rendimiento (queda solo PERF.5/IndexedDB, diferida por el ADR 030). El grupo colapsable "Más detalle de tus gastos" de Análisis calculaba `calcularComparacionCategorias()` (2 barridos de `S.gastos`) y `detectarPatronGastoSemanal()` (1 barrido) en cada `renderAnalisis()`, aunque el usuario nunca lo abriera. Se sacaron esas dos derivaciones del bundle memoizado de PERF.2 a `_calcularDetalleGastos()` (nuevo, memoizado con `['gastos']`) y se difirió su render al evento `toggle` del `<details>`: el panel se dibuja con el cuerpo del grupo vacío y, la primera vez que el usuario lo abre, se calcula y pinta (comparación + patrón semanal + hormigas). Las hormigas no se difirieron: ya vienen dentro de `generarResumen()`, que el panel necesita igual.

**Cómo preserva el comportamiento:** la visibilidad del grupo se decide barato. Con gasto este mes (`resumen.gastoMes > 0`), la comparación siempre tiene contenido, así que el grupo se muestra y su cuerpo queda diferido. Sin gasto este mes (caso menos común), `renderAnalisis()` calcula el detalle en el mismo render para no dibujar un grupo que resultaría vacío (la comparación con el mes anterior o el patrón de 90 días podrían seguir teniendo datos). Cada render reescribe `innerHTML`, así que el `<details>` se recrea y el listener de `toggle` se re-asocia al nodo nuevo; `data-cargado` evita recomputar sobre el mismo nodo.

**Validación:** 2233/2233 unit (5 nuevos en `analisis.test.js`) + 151/151 E2E en Chromium real. Medido con `pnpm perf`: Análisis frío baja de ~9.7/16.3 ms a ~7.4/11.1 ms (mediana, 5.000/10.000 gastos) sin regresión en la ruta caché ni en las otras columnas. SW v333 → v334. Detalle en [`scripts/perf/BASELINE.md`](../scripts/perf/BASELINE.md) y [`docs/contexto/analisis.md`](contexto/analisis.md).

| Archivo | Cambio |
|---|---|
| `modules/dominio/analisis/view.js` | `_calcularDetalleGastos()`/`_calcularDetalleGastosMemo`/`_renderDetalleGastos()` nuevos; `renderAnalisis()` difiere el cuerpo del grupo al `toggle`; `_renderGrupoColapsable()` reemplazado por `_renderGrupoDetalle()`. |
| `tests/unit/analisis.test.js` | 5 tests nuevos del grupo diferido. |
| `scripts/perf/BASELINE.md` | Sección PERF.3 (antes/después de Análisis frío). |
| `docs/contexto/analisis.md`, `docs/BOARD.md` | PERF.3 cerrada; ficha actualizada. |
| `service-worker.js` | v333 → v334. |

---

### perf(storage): PERF.4, ADR 030 persistencia: salvaguarda de cuota + diferir el rewrite · 2026-07-06

Última fase de la auditoría de rendimiento. PERF.4 estaba planteada como "partir la persistencia por colección", pero el análisis (con el harness PERF.0 ya en mano) mostró que **el costo de guardar es bajo**: `save()` está debounced 200 ms y `JSON.stringify(S)` son ~5 ms a 10.000 gastos. El cuello no es la CPU, es el **techo de cuota de `localStorage` (~5 MB)**, un riesgo de pérdida de datos a largo plazo, no de lentitud. Decisión (delegada por Esteban) documentada en el [ADR 030](DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md): **no reescribir la persistencia** (sería el cambio de mayor riesgo del proyecto: ruta de arranque async + migración de años de datos + reescritura del sembrado de 11 suites E2E, para ahorrar ~5 ms debounced), sino poner una salvaguarda barata sobre el riesgo real y dejar **IndexedDB** registrado como dirección futura con disparadores concretos (rechazando explícitamente partir `localStorage` por clave, que no sube la cuota).

**Salvaguarda implementada (ADR 030 D2):** (1) el guardado que falla por cupo lleno **deja de morir en silencio**: antes `_flush()` solo hacía `console.error` y el usuario perdía el cambio sin enterarse; ahora marca `_falloUltimoGuardado`, emite `storage:error` y `config/` lo anuncia (a11y assertive) + muestra un aviso persistente con CTA "Exportar respaldo". (2) Aviso anticipado: `evaluarCuota()`/`estadoCuota()` (puras, en `core/storage.js`) clasifican el uso contra un límite conservador (4.5 M chars): `aviso` ≥ 80 %, `critico` ≥ 95 %; al cruzar de nivel se emite `storage:cuota` (una vez, no por guardado) y la sección "💾 Tus datos" de Ajustes muestra el aviso. En operación normal no se ve nada (el aviso devuelve string vacío).

**Validación:** 2228/2228 unit (9 nuevos en `storage.test.js`: `evaluarCuota` umbrales, `estadoCuota`, y el guardado que falla emite `storage:error` en vez de morir en silencio, simulando el cupo lleno con `vi.stubGlobal`) + 151/151 E2E verdes en Chromium real. SW v332 → v333.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/030-...md` | Nuevo: ADR de la decisión de persistencia (diferir rewrite, salvaguarda, IndexedDB futuro). |
| `modules/core/storage.js` | `evaluarCuota()`, `estadoCuota()`, `LIMITE_LOCALSTORAGE_CHARS`; `_flush()` marca fallo + emite `storage:error`/`storage:cuota` en vez de solo loguear. |
| `modules/dominio/config/view.js` | `_renderAvisoAlmacenamiento()` en la sección "Tus datos" (aviso con CTA a exportar). |
| `modules/dominio/config/index.js` | Escucha `storage:error`/`storage:cuota`: anuncia y re-renderiza el panel. |
| `tests/unit/storage.test.js` | 9 tests nuevos. |
| `docs/BOARD.md` | PERF.4 cerrada; PERF.5 (IndexedDB futuro) documentada como diferida. |
| `service-worker.js` | v332 → v333. |

---

### perf(rendimiento): PERF.2, memoizar derivaciones pesadas de Inicio y Análisis · 2026-07-06

Continuación de la auditoría de rendimiento (PERF.0/PERF.1). Con el harness `pnpm perf` en mano, se confirmó el segundo cuello identificado: `resumenSemanal()`, `movimientosRecientes()`/`movimientosCompletos()` (Inicio) y el bundle de `renderAnalisis()` (~7 llamadas de primer nivel, cada una con sub-barridos propios, ej. `serieGastosMensual` recorre 12 meses) recalculaban sobre todo el historial en cada `state:change` relevante, incluso en re-renders redundantes: `renderAll()` repintando el dashboard sin que esos datos cambiaran, o dos listeners reaccionando a una misma acción del usuario (ej. editar un gasto-abono dispara `state:change` para `gastos` y para `compromisos` por separado).

Se agregó `modules/infra/memo.js` (`memoizar()`, nuevo): cachea contra la identidad de referencia de los argumentos + un contador de revisión por sección alimentado por el propio `EventBus` (`state:change`), sin Proxies ni observers sobre `S` (ADN 4). Cualquiera de las dos señales de cambio (referencia nueva o revisión distinta) invalida la caché; nunca se sirve un resultado dudoso. Aplicado a `resumenSemanal()` y a `movimientosRecientes()`/`movimientosCompletos()` (estas últimas con un `extraerClave` propio, porque el caller pasa un objeto envoltorio nuevo en cada llamada) y al bundle consolidado de `renderAnalisis()` (`_calcularDatosAnalisis()`, que junta `generarResumen()` + las 4 series/comparaciones que antes se calculaban por separado). Ninguna función deja de escribir el DOM en cada render: el cacheo es solo de cómputo, nunca de pintado, así que el HTML resultante es idéntico con o sin cache hit.

**Riesgo de medición evitado:** el harness original medía llamando a la misma función N veces sin cambiar `S` entre medidas, lo que tras esta fase convierte casi todas las repeticiones en cache hits (representa un escenario real pero no el costo de un recálculo genuino). `bench.perf.js` ahora mide ambos por separado: "frío" (invalida la caché antes de cada muestra) y "caché" (sin invalidar). Resultado: en frío, el costo no cambia respecto a PERF.0/PERF.1 (sin regresión); en caché, Inicio pasa de 4,3-97,4 ms a 2,2-16,9 ms y Análisis de 4,3-16,3 ms a 2,9-4,6 ms **planos** (ya no crece con el volumen de historial).

**Validación:** 2219/2219 unit (10 tests nuevos en `tests/unit/memo.test.js`) + 151/151 E2E verdes en Chromium real (Playwright). SW v331 → v332. Detalle completo en [`scripts/perf/BASELINE.md`](../scripts/perf/BASELINE.md), [`docs/contexto/inicio.md`](contexto/inicio.md) y [`docs/contexto/analisis.md`](contexto/analisis.md) (ficha nueva, primer análisis a fondo del dominio).

| Archivo | Cambio |
|---|---|
| `modules/infra/memo.js` | Nuevo: `memoizar()`, caché de 1 entrada por revisión de sección + identidad de referencia. |
| `modules/dominio/resumen/view.js` | `resumenSemanal()` envuelta en `_resumenSemanalMemo`. |
| `modules/dominio/movimientos/view.js` | `movimientosRecientes()`/`movimientosCompletos()` envueltas con `extraerClave` propio. |
| `modules/dominio/analisis/view.js` | `_calcularDatosAnalisis()` nuevo (consolida 7 llamadas en 1), envuelto en `_calcularDatosAnalisisMemo`. |
| `scripts/perf/bench.perf.js` | Medición "frío"/"caché" separada para no confundir cache hits del harness con una mejora real. |
| `tests/unit/memo.test.js` | Nuevo: 10 tests del helper de memoización. |
| `docs/contexto/analisis.md` | Ficha nueva (primer análisis a fondo del dominio). |
| `docs/contexto/inicio.md`, `docs/contexto/README.md` | Bloques de Inicio/Análisis actualizados; índice de fichas. |
| `service-worker.js` | `infra/memo.js` agregado a `CORE_ASSETS`; v331 → v332. |

---

---

> Para tareas anteriores (perf(movimientos) PERF.1 paginar por lotes la vista completa de Movimientos, refactor(gastos) IN.5 eliminar "Gasto rápido" y el subsistema de pendientes, feat(ux) CTA unificado "necesitas una cuenta" lleva directo a crear la cuenta, feat(gastos) TX.9b categorías personalizadas, feat(gastos) TX.9a categoría primero + descripción ya no obligatoria, feat(resumen) IN.4a accesos rápidos personalizables en Inicio, feat(movimientos) TX.8b vista completa de Movimientos + Gastos acota categorías internas, feat(movimientos) TX.8a dominio nuevo + Actividad reciente en Inicio, feat(tesoreria) CAL.1 nudge de distribución del ingreso en Inicio, feat(resumen) IN.6a saludo dinámico con nombre en Inicio, docs(adr) ADR 028 Inicio como centro de control aprobado, fix(resumen) IN.7 Próximas prioridades ya no duplica lo que vence hoy, docs(adr) BR.4 ADR 027 formaliza la excepción de logo a color, feat(assets) BR.3 completa los 11 bancos/billeteras de BANCOS_CO a color, feat(assets) BR.5 el sync normaliza exports crudos de Illustrator, fix(assets) contorno fantasma en logos a color por herencia CSS vía use, docs(workflow) metodología de contexto técnico por funcionalidad, feat(ui) escala de tokens de iconografía + fix de cascada @layer, feat(assets) BR.3 rediseño de Nequi a color + limpieza de exports crudos, feat(assets) logos de marca a color Bancolombia y Banco de Bogotá, feat(assets) BR.2 script de sincronización biblioteca → sprite, refactor(compromisos) N.4 logic.js dividido en submódulos, refactor(tesoreria) N.3 dominio dividido en submódulos por subsistema, docs(mapa) N.2 mapa de navegación del código, feat(assets) BR.1 biblioteca oficial de recursos gráficos, style(ui) ID.5 tracking del patrimonio alineado con el hero, feat(ui) ID.3 categorías Finko v2 en tejas por dominio, feat(ui) ID.7 símbolos estructurales al lenguaje v2, feat(ui) MK.2 detección de marca por nombre en fijos, suscripciones y deudas, feat(ui) MK.1 teja de marca con glifos oficiales en Mis cuentas, docs(adr) ADR 025 logotipos de marca y tejas unificadas, feat(nav) NAV.C pulidos de navegación con cierre del ADR 024, feat(nav) NAV.A2b slice 2 oferta de distribución tras un ingreso, feat(nav) NAV.A2b slice 1 Abono a deuda y Aporte a ahorro en la hoja "Registrar", feat(nav) NAV.B hub "Ahorros" con pestañas y consolidado, feat(nav) NAV.A2a bottom nav de 5 con botón central "Registrar", feat(tesoreria) NAV.A1 ingreso puntual en Mis cuentas, docs(nav) auditoría de navegación móvil, ADR 024 y tarjetas NAV, feat(ui) ID.6 Finko Icons v2 "trazo cálido con chispa" con piloto en la navegación, feat(ui) ID.2 familia Finko Icons en el resto de la UI estructural, feat(ui) ID.4 espaciado y jerarquía en las tarjetas más densas, feat(ui) ID.1 lenguaje de iconografía propio con piloto en la navegación, style(analisis) paleta unificada entre la dona y las barras por categoría, feat(tesoreria) MC.6c señales más ricas para la distribución automática, feat(inversiones) E.5 IPC observado como constante anual, feat(gastos) TX.3 categorías Café y Gastos hormiga, feat(logros) LG.1b vitrina de logros en Ajustes ADR 022, feat(agenda) AP.4, MT.2 y AH.4 recordatorio de día de ingreso ADR 021, feat(ahorro) AH.3 y AUD.6 ADR 020 fondo como marcador de liquidez, feat(ahorro) AH.2 aporte recomendado del fondo explicado con datos reales, feat(personales) PE.1 tasa de interés opcional y reparto capital/interés, feat(tesoreria) MC.10 y MC.11 piso de ahorro y detección de déficit real, feat(compromisos) D.10 y D.13 categorías de relación para deuda personal y Fiado, feat(presupuesto) MC.8d pulido de Límites con iconos por categoría, test(rwd) RWD.1 verificación de reflow real a 320px en E2E, feat(presupuesto) MC.8c layout de dos columnas en Límites, feat(compromisos) D.12 aviso de tasa desconocida por deuda en la lista, feat(compromisos) D.11 la recomendación nombra la única deuda con interés, fix(ahorro) AH.1 hint del objetivo del fondo explicado, feat(logros) LG.1a toast de logros más legible, feat(personales) PE.2 a PE.5 estados de seguimiento humanizados en Me deben, style(a11y) COL.1 y COL.2 contraste de warning y texto deshabilitado, test(a11y) A11Y.5 pase axe sobre formularios dinámicos en E2E, feat(gastos) TX.6 y TX.7 el gasto hereda el ícono de su compromiso de origen, feat(ui) EP.7d divulgación progresiva Mis cuentas/Análisis/Me deben con la épica EP.7 completa, feat(ui) EP.7c divulgación progresiva Metas/Ahorro/Inversión, feat(ui) EP.7b divulgación progresiva Gastos/Deudas/Calendario/Límites, feat(ui) EP.7a banner con divulgación progresiva, docs(adr) ADR 016 revisado divulgación progresiva, chore(tesoreria) MC.12 renombrar "Ingreso" a "Ingresos fijos", fix(tesoreria) MC.7f pulido del asistente épica MC.7 completa, feat(tesoreria) MC.7e Paso 3 reparte entre cuentas, feat(tesoreria) MC.7d completo asistente paginado + R3, fix(tesoreria) BUG-007/BUG-008 copy cuota de manejo + validaciones Infinity, fix(compromisos) BUG-006 abono extra, fix(tesoreria) BUG-009 tope coordinado cuota+extra, docs(bugs) diseño BUG-009, fix(tesoreria) BUG-005 cuota de manejo, fix(tesoreria) BUG-003/BUG-004 checklist de Necesidades, feat(tesoreria) MC.7d slice 1 checklist de Necesidades, docs(revision) Mis cuentas, docs(adr) ADR 018 revisión, AG.4, AG.2, AG.7, AG.6, AG.5, MT.4, MT.5, MT.3, MT.1, IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

---

## 4. Mantenimiento y producción

**App en producción estable:** https://finko-brown.vercel.app (Lighthouse 99-100, cero deuda técnica conocida).

La lista completa y vigente de tareas de mantenimiento y features opcionales vive en [`docs/BOARD.md`](BOARD.md) (secciones "Mantenimiento" y por sección de la app). Esta sección solo guarda el procedimiento detallado de la tarea recurrente más delicada.

> **Importante para futuros desarrolladores:** Antes de instalar dependencias o configurar
> un nuevo entorno, leer [`docs/SECURITY.md`](SECURITY.md). Incluye política anti-malware npm,
> guía de migración a **pnpm** con defensas (`minimum-release-age`, `only-built-dependencies`),
> y el audit de seguridad realizado el 2026-05-18.

### Recordatorio enero 2027 - E.2-2027

> Desde la refactorización a tabla histórica, **no se crean exports `_2027`**: basta con agregar UNA entrada en `LEGAL_POR_ANIO`. Toda la app (UI, cálculos, tests) y el aviso de vigencia de P1 dejan de marcar "desactualizado" en cuanto la entrada existe.

**Qué hacer:**
1. Visita [DIAN UVT](https://www.dian.gov.co/) y [Mintrabajo SMMLV](https://www.mintrabajo.gov.co/)
2. Obtén los valores oficiales 2027 (SMMLV, auxilio de transporte, UVT) con sus decretos/resoluciones.
3. En `modules/core/constants.js`, reemplaza `2027: null` por una entrada completa:
   ```javascript
   2027: {
     smmlv:             <nuevo_valor>,
     auxilioTransporte: <nuevo_valor>,
     uvt:               <nuevo_valor>,
     vigenciaDesde: '2027-01-01',
     fuentes: { smmlv: '...', auxilio: '...', uvt: '...' },
   },
   ```
4. Tests (`pnpm test` → todo verde; incluye `tests/unit/constants.test.js`).
5. Bumpear `CACHE_NAME` en `service-worker.js`.
6. Commit: `feat(E.2): cargar SMMLV + auxilio + UVT 2027`
7. Push a main → auto-deploy a producción.

**Modelo:** Escribe tu `Próximo paso` con **Haiku 4.5** (búsqueda + cambio mecánico de una entrada).

---

## 5. Cómo trabajamos (workflow)

Workflow completo (una tarea a la vez, cierre de conversación, selección de modelo) en [`/CLAUDE.md`](../CLAUDE.md) sección 2. No se duplica acá para no desincronizarse.

---

## 6. Arquitectura en una línea por capa

```
core/        → state.js (singleton S), storage.js (save debounced), constants.js (CO legales)
infra/       → utils, render, a11y, crud, router, csv, svg, notificaciones
ui/          → bootstrap (entry point), shell, actions (delegación data-action), modales, onboarding
dominio/     → agenda, ahorro, analisis, apartados, calculadoras, compromisos,
               config, export, gastos, import, inversiones, logros, metas,
               movimientos, personales, presupuesto, resumen, tesoreria
```

Regla clave: **ningún dominio importa a otro** - comunicación exclusiva por `EventBus`.
Todo `logic.js` es sin DOM (testeable en Node). Todo `view.js` solo lee `S`, no lo muta.
Detalle completo en [`docs/ARCHITECTURE.md`](ARCHITECTURE.md). Cifras de tests actuales: ver sección 2 arriba.

---

## 7. Comandos rápidos

```bash
python -m http.server 8080   # Servir la app (ES6 modules requieren HTTP)
pnpm test                     # tests unitarios + integración (Vitest + happy-dom)
pnpm run test:e2e             # smoke tests Playwright
pnpm run coverage             # umbral 90% capa lógica
pnpm run lighthouse           # requiere servidor en :8080
pnpm perf                     # harness de rendimiento (scripts/perf/), no toca pnpm test
```
