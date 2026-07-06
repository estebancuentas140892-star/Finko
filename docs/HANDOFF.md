# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-05 (feat(gastos): TX.9a, categoría primero + descripción ya no obligatoria)

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
| Tests unitarios + integración | 2198/2198 verdes |
| Tests E2E | 148/148 verde. Suites: `smoke` 82 tests, `estrategia-pago` 15 tests, `ahorro-inversion` 9 tests, `hub-ahorros` 7 tests, `navegacion-render` 7 tests, `registrar-destinos` 6 tests, `install-prompt` 6 tests, `a11y-forms` 6 tests, `reflow-320` 4 tests, `registrar-distribucion` 3 tests, `registrar-sheet` 3 tests. |
| Schema version (localStorage) | v23 |
| Lighthouse Performance | 100 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(gastos): TX.9a, categoría primero + descripción ya no obligatoria · 2026-07-05

Primera de dos fases de TX.9 (brief de Esteban sobre el formulario de gasto). Categoría pasa a ser el primer campo de `renderFormGasto()` (antes el 4°); el campo Descripción se quitó del formulario (la categoría es ahora el concepto principal); `validarGasto()` ya no la exige. `normalizarGasto()` solo incluye la clave `descripcion` si el caller la trae, para que `editar()` (merge superficial vía `Object.assign`) no borre la descripción de gastos existentes que ya la tenían al editar otro campo. El título del ítem en la lista pasa a ser la categoría; una descripción legacy y la nota (que ya existía, no hubo que crearla) se muestran en el subtítulo junto a la fecha. `esGastoPendiente()` (el criterio del panel "Gastos por organizar") se redefinió de "sin descripción" a `pendienteCompletar === true && categoria === 'Otros'`, preservando su función exacta sin depender de un campo ya no obligatorio.

Encontrados y corregidos 2 bugs propios de "undefined" en consumidores de `gasto.descripcion` sin fallback: el mensaje de confirmación de borrado/anuncio a11y en `gastos/index.js`, y `movimientosDesdeGastos()` en Movimientos (deriva su descripción de la del gasto). Ambos cayeron a la categoría como fallback. Fuera de alcance de esta fase: categorías personalizadas (**TX.9b**, siguiente) y cualquier detección nueva de gasto hormiga/fantasma (es de **TX.10**, no de TX.9).

**Validación:** 2198/2198 unit (tests de formulario reordenado, validación, `esGastoPendiente()`/`gastosPendientes()` con la nueva regla, título/subtítulo del ítem) + 148/148 E2E verdes en navegador real (Playwright); 4 tests de `smoke.test.js` actualizados porque rellenaban un campo que ya no existe. Preview de este entorno no disponible (mismo problema recurrente); verificado además con un flujo manual de creación completa y de Gasto Rápido. Primer análisis a fondo de Gastos documentado en `docs/contexto/gastos.md` (regla 2.6), con la tarjeta original TX.9 dividida en TX.9a/TX.9b (regla 2.1, "dividir lo grande").

| Archivo | Cambio |
|---|---|
| `modules/dominio/gastos/view.js` | `renderFormGasto()` reordenado, sin campo descripción; `_renderGastoItem()` título = categoría. |
| `modules/dominio/gastos/logic.js` | `validarGasto()`, `normalizarGasto()`, `esGastoPendiente()` redefinida. |
| `modules/dominio/gastos/index.js` | `_editarGasto()` sin pre-fill de descripción; `_eliminarGasto()` fallback a categoría; título del modal usa `esGastoPendiente()`. |
| `modules/dominio/movimientos/logic.js` | `movimientosDesdeGastos()` fallback a categoría. |
| `modules/core/state.js` | `Gasto.descripcion` documentado como opcional. |
| `styles/components/forms.css` | `.list-item__placeholder` eliminada (sin consumidores). |
| `tests/unit/gastos.test.js` | Tests de formulario, validación, pendiente y render actualizados/nuevos. |
| `tests/unit/movimientos.test.js` | 1 test actualizado. |
| `tests/e2e/smoke.test.js` | 4 tests actualizados (crear/editar/eliminar gasto). |
| `docs/contexto/gastos.md` | Ficha nueva (primer análisis); TX.9a cerrada. |
| `docs/BOARD.md` | Tarjeta TX.9a cerrada y borrada; TX.9b queda como siguiente fase. |

---

### feat(resumen): IN.4a, accesos rápidos personalizables en Inicio · 2026-07-05

Última fase de la iniciativa "Inicio como centro de control" del [ADR 028](DECISIONS/028-inicio-centro-de-control.md): fila de tiles bajo el hero con 1 toque a secciones que hoy quedan detrás de "Más" (Mis cuentas, Deudas, Ahorros, Límites de gasto, Me deben, Análisis, Movimientos, Ajustes), más un modal "Personalizar" con selección por lista (tocar agrega/quita, sin drag & drop, ADR 028 D2). Bump de schema v23 (`S.config.accesosInicio`, migración idempotente). El default (3 de las 8 elegibles) se decidió con un análisis objetivo de frecuencia de autoconsulta y de qué ya cubre Inicio hoy, a pedido explícito de Esteban de no basarlo en preferencia personal: **Mis cuentas, Ahorros, Límites de gasto**, el mismo patrón que usan Mint/YNAB/Fintonic como pantalla principal (cuentas + presupuesto + metas); Deudas/Análisis/Me deben/Ajustes/Movimientos quedan disponibles para quien personalice. Dominio nuevo `modules/dominio/accesos/` (`logic.js` puro, `view.js`, `index.js`), reutilizando al máximo componentes existentes: los tiles son `.menu-mas__item` tal cual (mismo color por dominio que el menú "Más", cero CSS de color nuevo) y el modal reusa `.list-item`/`tejaCategoria()` (mismo patrón que Movimientos/Gastos). Bug propio detectado y corregido en el camino: el texto instructivo del modal usaba `.confirm__mensaje`, clase que los tests E2E ya trataban como identificador único del mensaje de un modal de confirmación activo; al quedar siempre en el DOM rompía ese selector (`strict mode violation` en Playwright). Se corrigió con `.form-hint` (helper genérico ya existente). 2188/2188 unit (20 tests nuevos: `accesos.test.js` + migración v22→v23 en `storage.test.js`) + 148/148 E2E (smoke + navegación) verdes en navegador real (Playwright); preview de este entorno no disponible (mismo problema recurrente), verificado además con un flujo manual Dashboard → tiles → Personalizar → toggle → persistencia → tap-through. SW v326 → v327. **Cierra la iniciativa de Inicio del ADR 028; solo queda IN.6b (avatar), a la espera de diseños de Esteban.**

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `ACCESOS_INICIO` (catálogo de 8), `ACCESOS_INICIO_DEFAULT`. |
| `modules/core/state.js` | `S.config.accesosInicio` default. |
| `modules/core/storage.js` | Migración v22 → v23; `SCHEMA_VERSION = 23`. |
| `modules/dominio/accesos/logic.js` | Nuevo: `accesosVisibles()`, `alternarAcceso()`. |
| `modules/dominio/accesos/view.js` | Nuevo: `renderAccesosInicio()`, `renderModalPersonalizarAccesos()`. |
| `modules/dominio/accesos/index.js` | Nuevo: `initAccesos()`, acciones `accesos-personalizar`/`accesos-toggle`. |
| `modules/ui/bootstrap.js` | Import + llamada a `initAccesos()`. |
| `index.html` | Fila de tiles bajo el hero, modal `#modal-personalizar-accesos`. |
| `styles/components/domain.css` | Bloque `ACCESOS-INICIO` (grilla de tiles). |
| `styles/components/atoms.css` | `.accesos-row*` (fila toggleable del modal). |
| `tests/unit/accesos.test.js` | Nuevo: 17 tests. |
| `tests/unit/storage.test.js` | 3 tests nuevos (migración v23). |
| `docs/contexto/inicio.md`, `docs/MAPA.md` | IN.4a cerrada; dominio indexado. |
| `docs/BOARD.md` | Tarjeta IN.4a borrada; iniciativa del ADR 028 completa salvo IN.6b. |
| `service-worker.js` | `accesos/` agregado a `CORE_ASSETS`; v326 → v327. |

---

### feat(movimientos): TX.8b, vista completa + Gastos acota categorías internas · 2026-07-05

Cuarta y última fase de la iniciativa TX.8 del [ADR 028](DECISIONS/028-inicio-centro-de-control.md): vista completa de Movimientos en ruta propia `#movimientos` (sin ícono fijo en la barra de navegación; se llega por el link "Ver todo" del panel compacto de Inicio o por hash directo), agrupada por mes, sin totales (el resumen financiero es de Análisis, ADR 028 D5). Cada `Movimiento` ahora lleva un campo `dominio` (`gastos`/`compromisos`/`ingresos`/`ahorro`) que colorea la teja del ícono con `tejaCategoria()`, igual que Gastos/Deudas; `movimientosCompletos()` nuevo en `logic.js` reusa `movimientosRecientes()` con límite `Infinity` sin duplicar la combinación/orden de las 3 fuentes. En paralelo, `renderListaGastos()`/`renderFiltrosGastos()` excluyen las categorías internas ('Deudas', 'Gastos fijos') vía `_sinInternas()`: Gastos queda enfocada en gasto cotidiano; `S.gastos` no se toca, así que Análisis y Límites (que leen todo el historial) no se ven afectados. Se corrigió de paso un hueco de TX.8a: `movimientos/{logic,view,index}.js` no estaban en el precache de `service-worker.js`. 2168/2168 unit (17 tests nuevos en `movimientos.test.js` + 7 en `gastos.test.js`) + E2E smoke 82/82 y navegación 7/7 en navegador real (Playwright), incluida una regresión nueva para la ruta sin ícono de nav; preview de este entorno no disponible (mismo problema recurrente), verificado además con un flujo manual Dashboard → "Ver todo" → Movimientos con datos reales. SW v325 → v326. **Cierra la iniciativa TX.8; siguen pendientes IN.4a e IN.6b del ADR 028.**

| Archivo | Cambio |
|---|---|
| `modules/dominio/movimientos/logic.js` | Campo `dominio` en las 3 funciones `movimientosDesde*`; `movimientosCompletos()` nuevo. |
| `modules/dominio/movimientos/view.js` | `renderMovimientosCompletos()`, agrupación por mes, link "Ver todo". |
| `modules/dominio/movimientos/index.js` | Wiring de render para la ruta `#movimientos`. |
| `modules/dominio/gastos/view.js` | `_sinInternas()` en `renderListaGastos()`/`renderFiltrosGastos()`. |
| `modules/infra/router.js` | Entrada `movimientos` → `sec-movimientos` en `SECTIONS`. |
| `index.html` | Sección `#sec-movimientos` nueva. |
| `styles/components/domain.css`, `atoms.css` | Bloque MOVIMIENTOS, link "Ver todo", `.list-item__amount--ingreso`. |
| `tests/unit/movimientos.test.js`, `gastos.test.js` | 17 + 7 tests nuevos. |
| `tests/e2e/navegacion-render.test.js` | 1 test nuevo (ruta sin ícono de nav). |
| `docs/contexto/inicio.md`, `docs/MAPA.md` | TX.8b cerrada; dominio actualizado. |
| `docs/BOARD.md` | Tarjeta TX.8b borrada. |
| `service-worker.js` | Precache de `movimientos/` agregado (hueco de TX.8a); v325 → v326. |

---

### feat(movimientos): TX.8a, dominio nuevo + Actividad reciente en Inicio · 2026-07-05

Tercera fase del [ADR 028](DECISIONS/028-inicio-centro-de-control.md): panel "Actividad reciente" en Inicio con los últimos 5 movimientos, derivados sin log paralelo (D5) desde `S.gastos`, `S.ingresosPuntuales` y `S.ahorro.aportes`. Dominio nuevo `modules/dominio/movimientos/` (`logic.js` puro sin `S` ni imports cross-dominio, ADN 10 intacto; `view.js` lee `S` y arma el panel; `index.js` registra el render vía `registrarRender()`, mismo patrón que `compromisos`/`tesoreria`). Se agregó `CATEGORIA_ICONO['Gastos fijos'] = 'i-recurring'` en `constants.js` (única pieza faltante para que las categorías internas tuvieran ícono propio sin necesitar `iconoPorOrigen()` de `gastos/logic.js`, que habría violado ADN 10). CSS nuevo `.actividad-reciente*` siguiendo el patrón visual de `vencidos-card`/`prioridades-card`. 2145/2145 unit (26 tests nuevos) + E2E smoke 82/82 en navegador real; preview de este entorno no disponible (mismo problema recurrente). SW v324 → v325. **Siguiente fase del orden recomendado: TX.8b (vista completa de Movimientos + Gastos acotado).**

| Archivo | Cambio |
|---|---|
| `modules/dominio/movimientos/{logic,view,index}.js` | Dominio nuevo. |
| `modules/ui/bootstrap.js` | Registro de `initMovimientos()`. |
| `modules/core/constants.js` | `CATEGORIA_ICONO['Gastos fijos']`. |
| `index.html` | `#panel-actividad-reciente`. |
| `styles/components/domain.css` | Bloque `ACTIVIDAD-RECIENTE`. |
| `tests/unit/movimientos.test.js` | 26 tests nuevos. |
| `docs/contexto/inicio.md`, `docs/MAPA.md` | TX.8a cerrada; dominio indexado. |
| `docs/BOARD.md` | Tarjeta TX.8a borrada. |
| `service-worker.js` | v324 → v325. |

---

### feat(tesoreria): CAL.1, nudge de distribución del ingreso en Inicio · 2026-07-05

Segunda fase del [ADR 028](DECISIONS/028-inicio-centro-de-control.md): Inicio muestra un nudge en "Atención hoy" cuando llegó el cobro del periodo y aún no se distribuyó ("Hoy recibes tu ingreso" / "Recibiste tu ingreso el {fecha}") con CTA "Distribuir ahora". Hallazgo clave: `estadoDistribucion()` y `S.config.ultimaDistribucionPeriodo` **ya existían** (los usa el panel equivalente de Mis cuentas); el ADR anticipaba un marcador nuevo dentro del bump v23 y no hizo falta, así que ese bump queda acotado a `accesosInicio` (IN.4a) y `avatar` (IN.6b). El CTA reutiliza el mismo `distribuir:abrir` del recordatorio de Calendario (ADR 021): el Calendario no pierde nada. Renderizado por **tesorería** (dueña del asistente), registrado vía `registrarRender()` como los paneles de `compromisos`; reutiliza el componente `.nudge`/`.nudge-info` existente, cero CSS nuevo. 2119/2119 unit (7 tests nuevos) + E2E smoke 82/82 en navegador real (Playwright); preview de este entorno no disponible (mismo problema recurrente). SW v323 → v324. **Siguiente fase del orden recomendado: TX.8a (dominio movimientos + Actividad reciente).**

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/views/distribucion.js` | `renderNudgeDistribucionInicio()` nuevo. |
| `modules/dominio/tesoreria/acciones/distribucion.js` | Acción `distribuir-desde-inicio`. |
| `modules/dominio/tesoreria/index.js` | Registro del render (state:change, hashchange, registrarRender). |
| `index.html` | `#panel-distribuir-inicio` en el bento de Inicio. |
| `tests/unit/tesoreria.test.js` | 7 tests nuevos. |
| `docs/contexto/inicio.md` | CAL.1 cerrada. |
| `docs/BOARD.md` | Tarjeta CAL.1 borrada. |
| `service-worker.js` | v323 → v324. |

---

---

> Para tareas anteriores (feat(resumen) IN.6a saludo dinámico con nombre en Inicio, docs(adr) ADR 028 Inicio como centro de control aprobado, fix(resumen) IN.7 Próximas prioridades ya no duplica lo que vence hoy, docs(adr) BR.4 ADR 027 formaliza la excepción de logo a color, feat(assets) BR.3 completa los 11 bancos/billeteras de BANCOS_CO a color, feat(assets) BR.5 el sync normaliza exports crudos de Illustrator, fix(assets) contorno fantasma en logos a color por herencia CSS vía use, docs(workflow) metodología de contexto técnico por funcionalidad, feat(ui) escala de tokens de iconografía + fix de cascada @layer, feat(assets) BR.3 rediseño de Nequi a color + limpieza de exports crudos, feat(assets) logos de marca a color Bancolombia y Banco de Bogotá, feat(assets) BR.2 script de sincronización biblioteca → sprite, refactor(compromisos) N.4 logic.js dividido en submódulos, refactor(tesoreria) N.3 dominio dividido en submódulos por subsistema, docs(mapa) N.2 mapa de navegación del código, feat(assets) BR.1 biblioteca oficial de recursos gráficos, style(ui) ID.5 tracking del patrimonio alineado con el hero, feat(ui) ID.3 categorías Finko v2 en tejas por dominio, feat(ui) ID.7 símbolos estructurales al lenguaje v2, feat(ui) MK.2 detección de marca por nombre en fijos, suscripciones y deudas, feat(ui) MK.1 teja de marca con glifos oficiales en Mis cuentas, docs(adr) ADR 025 logotipos de marca y tejas unificadas, feat(nav) NAV.C pulidos de navegación con cierre del ADR 024, feat(nav) NAV.A2b slice 2 oferta de distribución tras un ingreso, feat(nav) NAV.A2b slice 1 Abono a deuda y Aporte a ahorro en la hoja "Registrar", feat(nav) NAV.B hub "Ahorros" con pestañas y consolidado, feat(nav) NAV.A2a bottom nav de 5 con botón central "Registrar", feat(tesoreria) NAV.A1 ingreso puntual en Mis cuentas, docs(nav) auditoría de navegación móvil, ADR 024 y tarjetas NAV, feat(ui) ID.6 Finko Icons v2 "trazo cálido con chispa" con piloto en la navegación, feat(ui) ID.2 familia Finko Icons en el resto de la UI estructural, feat(ui) ID.4 espaciado y jerarquía en las tarjetas más densas, feat(ui) ID.1 lenguaje de iconografía propio con piloto en la navegación, style(analisis) paleta unificada entre la dona y las barras por categoría, feat(tesoreria) MC.6c señales más ricas para la distribución automática, feat(inversiones) E.5 IPC observado como constante anual, feat(gastos) TX.3 categorías Café y Gastos hormiga, feat(logros) LG.1b vitrina de logros en Ajustes ADR 022, feat(agenda) AP.4, MT.2 y AH.4 recordatorio de día de ingreso ADR 021, feat(ahorro) AH.3 y AUD.6 ADR 020 fondo como marcador de liquidez, feat(ahorro) AH.2 aporte recomendado del fondo explicado con datos reales, feat(personales) PE.1 tasa de interés opcional y reparto capital/interés, feat(tesoreria) MC.10 y MC.11 piso de ahorro y detección de déficit real, feat(compromisos) D.10 y D.13 categorías de relación para deuda personal y Fiado, feat(presupuesto) MC.8d pulido de Límites con iconos por categoría, test(rwd) RWD.1 verificación de reflow real a 320px en E2E, feat(presupuesto) MC.8c layout de dos columnas en Límites, feat(compromisos) D.12 aviso de tasa desconocida por deuda en la lista, feat(compromisos) D.11 la recomendación nombra la única deuda con interés, fix(ahorro) AH.1 hint del objetivo del fondo explicado, feat(logros) LG.1a toast de logros más legible, feat(personales) PE.2 a PE.5 estados de seguimiento humanizados en Me deben, style(a11y) COL.1 y COL.2 contraste de warning y texto deshabilitado, test(a11y) A11Y.5 pase axe sobre formularios dinámicos en E2E, feat(gastos) TX.6 y TX.7 el gasto hereda el ícono de su compromiso de origen, feat(ui) EP.7d divulgación progresiva Mis cuentas/Análisis/Me deben con la épica EP.7 completa, feat(ui) EP.7c divulgación progresiva Metas/Ahorro/Inversión, feat(ui) EP.7b divulgación progresiva Gastos/Deudas/Calendario/Límites, feat(ui) EP.7a banner con divulgación progresiva, docs(adr) ADR 016 revisado divulgación progresiva, chore(tesoreria) MC.12 renombrar "Ingreso" a "Ingresos fijos", fix(tesoreria) MC.7f pulido del asistente épica MC.7 completa, feat(tesoreria) MC.7e Paso 3 reparte entre cuentas, feat(tesoreria) MC.7d completo asistente paginado + R3, fix(tesoreria) BUG-007/BUG-008 copy cuota de manejo + validaciones Infinity, fix(compromisos) BUG-006 abono extra, fix(tesoreria) BUG-009 tope coordinado cuota+extra, docs(bugs) diseño BUG-009, fix(tesoreria) BUG-005 cuota de manejo, fix(tesoreria) BUG-003/BUG-004 checklist de Necesidades, feat(tesoreria) MC.7d slice 1 checklist de Necesidades, docs(revision) Mis cuentas, docs(adr) ADR 018 revisión, AG.4, AG.2, AG.7, AG.6, AG.5, MT.4, MT.5, MT.3, MT.1, IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

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
```
