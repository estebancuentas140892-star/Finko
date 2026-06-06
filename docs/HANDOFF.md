# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente ía o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-03 (test: e2e suite 100% verde - realineado con form de cuenta rediseñado + copy de compromisos)

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
| Tests unitarios + integración | 931/931 verdes (`-32` por borrar `ingresos.test.js` y +18 por aportes empleado + cesantías) |
| Tests E2E | 33/33 verdes (smoke + navegacion-render, realineados con el form de cuenta rediseñado en v8.9) |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(copy): rediseño Parte 3A.2 - renombres a lenguaje humano · 2026-06-06

Dos labels del nav violaban la regla ADN #11 ("lenguaje humano"): el nombre en el nav no coincidía con el copy interno de la sección.

**Cambios:**
- **`index.html`:** nav sidebar y menú "Más" móvil: "Compromisos" -> "Deudas", "Tesorería" -> "Mis cuentas". Títulos h1 de sección actualizados. Guía del dashboard y aria-labels actualizados.
- **`modules/dominio/gastos/view.js`:** label del botón "Ir a Tesorería" -> "Ir a Mis cuentas". Corregido también el bug de href truncado (`href="#tesor"` -> `href="#tesoreria"`).

Los identificadores internos (hash `#compromisos`, `#tesoreria`, funciones JS, clases CSS) no cambiaron: cero riesgo de regresión. 931/931 unit verdes.

### feat(nav): rediseño Parte 3A.1 - IA, wayfinding y hub "Crecer" · 2026-06-05

Reorganización de navegación (sin tocar el router). Enfoque elegido con el usuario: arreglos + hub "Crecer".

**Cambios:**
- **`modules/ui/shell.js`:** `markActiveNav` ahora resalta el botón "Más" (barra inferior móvil) cuando el hash pertenece a una sección que vive dentro del menú "Más" (`MAS_SECTIONS`). Antes: al entrar a Metas/Tesorería/etc. en móvil, ninguna pestaña se resaltaba (cero "estás aquí").
- **`index.html`:** sidebar desktop con grupo nuevo "Crecer" (Metas migrada desde "Gestión", listo para Ahorro+Inversión). Menú "Más" móvil reestructurado de grilla plana a 3 grupos con jerarquía: Gestión, Crecer, Herramientas.
- **`styles/modals.css`:** estilos `.menu-mas__group` y `.menu-mas__group-label` (rótulo xs, mayúsculas, muted).

**Verificación:** wayfinding confirmado (botón "Más" activo + `aria-current=page` en Metas móvil); menú agrupado y sidebar con Crecer verificados en preview. 931/931 unit verdes.

**Sigue:** 3A.2 (renombres a lenguaje humano: "Tesorería", "Compromisos" vs "Deudas"; pendiente definir las palabras con el usuario). Luego 3B (jerarquía visual/layout) y 3C (iconografía emoji -> SVG).

### feat(ui): rediseño Parte 2 - tipografía self-hosted (Inter Variable + DM Mono) · 2026-06-05

Inter y DM Mono no cargaban en producción: el `@import` de Google Fonts era bloqueado por la CSP `font-src 'self'`. Ahora las fuentes se sirven desde `assets/fonts/` sin peticiones externas.

**Cambios:**
- **`assets/fonts/inter-variable.woff2`** (48 KB): Inter Variable que cubre pesos 100-900 en 1 archivo. Sustituye los 6 archivos estáticos que se pedían antes (~143 KB -> 48 KB).
- **`assets/fonts/dm-mono-400.woff2`** (15 KB) y **`dm-mono-500.woff2`** (15 KB): solo los 2 pesos usados. Italic omitido: ningún elemento mono usa `font-style: italic`.
- **`styles/main.css`**: `@import` de Google Fonts reemplazado por 3 declaraciones `@font-face` con `font-display: swap` y `unicode-range` Latin.
- **`service-worker.js`**: bump `finko-v93` -> `finko-v94`. Los 3 WOFF2 agregados a `OPTIONAL_ASSETS` para pre-cacheo offline.

**Verificación:** Inter Variable activa (pesos 400-800 cargados), DM Mono 400/500 activos. Montos con figuras tabulares correctas. Sin errores de consola. 931/931 unit verdes.

### feat(ui): rediseño Parte 1 - paleta "calma confiable" (color, claro + oscuro) · 2026-06-05

Primera parte de una modernización UX/UI por fases. Dirección elegida con el usuario: "calma confiable". Solo tokens, cero hardcode, ambos temas.

**Cambios:**
- **`styles/tokens.css`:** acento de marca de neón `#00dc82` a esmeralda calmada `#1fd194`; `success` desacoplado de la marca (`#25cf86`); `--fk-text-muted` sube a contraste AA en oscuro (`#888fa6`); colores de dominio armonizados en croma (turquesa, azul, amarillo, rosa); sombras tintadas al azul-tinta; bases ligeramente templadas.
- **`styles/themes.css`:** `--fk-text-muted` claro a `#5d6276` (AA sobre blanco); acento decorativo claro a `#13b377`; sombras tintadas; bases `#f6f7fa`/`#eef1f8`.
- **`index.html` + `manifest.json`:** `theme-color`/`background_color` alineados con la base nueva (`#101218`).

**Verificación:** capturas antes/después en preview (Dashboard claro y oscuro, móvil 375px); foco visible confirmado; 931/931 unit verdes, sin errores de consola. Nota: el lint tiene 17 errores preexistentes en archivos `.js` ajenos a esta tarea.

**Sigue:** Parte 2 (tipografía: self-hostear la fuente, hoy bloqueada por CSP en prod). Partes 3-5 pendientes: diseño/navegación, secciones Ahorro+Inversión, otras mejoras.

### fix(sw): agregar módulo Agenda a CORE_ASSETS + bump CACHE_NAME a finko-v93 · 2026-06-05

Bug latente: los 3 archivos de `modules/dominio/agenda/` nunca estuvieron en `CORE_ASSETS` del service worker desde que se creó el módulo (v38 a v92). Con cache frío sin red, el import estático en `bootstrap.js` falla y cae toda la app. El bump de CACHE_NAME fuerza el refresco en dispositivos con cache rezagado (celulares con versión vieja instalada como PWA).

**Cambios:**
- **`service-worker.js`:** `CACHE_NAME` bumpeado a `finko-v93`. Agregados `agenda/logic.js`, `agenda/view.js`, `agenda/index.js` a `CORE_ASSETS`. Total módulos/styles cubiertos: 65/65 (0 faltantes).

**Tests:** 931/931 unit verdes. Sin cambios de lógica ni UI.

### test(e2e): realinear suite con form de cuenta rediseñado (v8.7-v8.9) · 2026-06-03

6 tests pre-existentes que fallaban desde el rediseño de Tesorería. El form de cuenta eliminó el campo `nombre` (ahora se autogenera como banco + tipo) y usa un bank-picker cuya lista flotante se mueve a `<body>`. Los tests seguían buscando `[name="nombre"]` y un selector de cuenta por nombre custom.

**Cambios:**
- **`tests/e2e/smoke.test.js`:** nuevo helper `crearCuentaEfectivo(page, saldo)` que encapsula el flujo correcto (bank-picker → seleccionar "Efectivo" → saldo → submit → esperar cierre). 5 tests actualizados: usan el helper y cambian las aserciones de nombre a "Efectivo" (autogenerado) y los `selectOption` de `cuentaId` a `{ label: 'Efectivo' }`.
- **`tests/e2e/navegacion-render.test.js`:** assertion de compromisos actualizada de "Nada que pagar... por ahora" a "Sin deudas registradas" (copy actual en `compromisos/view.js:362`).

**Resultado:** 33/33 e2e + 931/931 unit verdes. Suite completa sin fallos.

### feat(ux): I.3 - empty states enriquecidos para nuevos usuarios · 2026-06-03

Tips y descripciones más ricas en las 3 secciones con empty state más flaco. Sin cambios de lógica ni schema.

**Cambios:**
- **`modules/dominio/gastos/view.js`:** desc cambia de "Registrá tus gastos para llevar el control de tu plata" a una versión con ejemplos concretos (supermercado, transporte...) y mención de la agrupación por categoría. Tip nuevo: referencia al botón "Anotar un gasto" del dashboard.
- **`modules/dominio/metas/view.js`:** tip nuevo sobre el fondo de emergencia (3 meses de gastos fijos) como primera meta recomendada.
- **`modules/dominio/presupuesto/view.js`:** tip nuevo: empezar con 2-3 categorías de mayor gasto y que el avance se actualiza en tiempo real.

**Tests:** 931/931 unit verdes. Sin tests nuevos (puro copy en templates de view.js).

**Sigue:** la sección I (Onboarding UX) está completa. Considerar: commit conjunto de I.1+I.2+I.3 o iniciar otra área del ROADMAP.

### feat(dashboard): onboarding UX - guía de primeros pasos + copy "Anotar un gasto" · 2026-06-03

Dos mejoras de UX para nuevos usuarios del dashboard:

**1. Guía de primeros pasos en "Tu plata disponible hoy":** cuando el usuario no tiene cuentas registradas, el hero oculta la descripción técnica y muestra un bloque con el mensaje "Para ver tu plata disponible, primero registrá tus cuentas y tu efectivo en Tesorería" + botón verde "Ir a Tesorería →". Al registrar la primera cuenta, la guía desaparece sola (toggle en vivo desde `updSaldo`).

**2. Renombrar "Gasto rápido":** el título de la card pasó a "Anotar un gasto" (orientado a la acción) y la descripción a "¿Compraste o pagaste algo? Solo el monto. Lo describís después." (ancla el caso de uso).

**Cambios clave:**
- **`index.html`:** bloque `#hero-guia-saldo` (mensaje + botón, `hidden` por defecto); `id="saldo-desc"` a la descripción; card `quick-add` con nuevo título y desc.
- **`styles/layout.css`:** clases `.hero-guia` y `.hero-guia__texto` (el botón reusa `.btn.btn-primary.btn-lg`).
- **`modules/infra/render.js` (`updSaldo`):** toggle `hidden` de guía/desc según `S.cuentas.length`.
- **`tests/e2e/smoke.test.js`:** 2 tests nuevos (estado vacío muestra guía; con cuenta la oculta); selectores de nav acotados a `.nav-item`.
- **`tests/e2e/navegacion-render.test.js`:** selectores de Tesorería acotados a `.nav-item` (hay 2 `a[href="#tesoreria"]`).

**Tests:** 931/931 unit + integración verdes. E2E Dashboard 4/4 verdes (guía estado vacío ✓, toggle con cuenta ✓, navegación #tesoreria ✓). Deuda pre-existente: 5 e2e del form de cuenta y 1 de copy de compromisos siguen rotos desde v8.9 (anotados como chip de tarea).

**Sigue:** Tarea 3 de UX (ayudas contextuales / descripción en las secciones vacías para nuevos usuarios).

### refactor(infra): eliminar updateBadge y renderResumenGastos (no-ops cross-domain) · 2026-06-01

Cierre de la deuda técnica anotada en v8.9. Ambas funciones eran no-ops porque los IDs que actualizaban (`#gastos-mes`, `#compromisos-count`, `#metas-count`, `#personales-count`) desaparecieron del HTML en el rediseño del dashboard. Se eliminan los exports, los imports y las 8 llamadas distribuidas en 4 dominios. Sin riesgo funcional: la app no observaba ningún cambio de estas llamadas. Tests: 931/931, sin variación.

**Cambios clave:**
- **`modules/infra/render.js`:** removida `updateBadge()` completa. `updSaldo()` recortada a solo `#saldo-total`. Docstring y `renderAll()` actualizados.
- **`modules/dominio/gastos/view.js`:** removida `renderResumenGastos()` completa.
- **`modules/dominio/gastos/index.js`:** removido import + 5 llamadas a `renderResumenGastos`.
- **`modules/dominio/agenda/index.js`:** removido import + 1 llamada a `updateBadge`.
- **`modules/dominio/import/index.js`:** removido import + 1 llamada a `updateBadge`.
- **`modules/dominio/compromisos/index.js`:** removido import + 6 llamadas a `updateBadge`.

**Archivos:** `modules/infra/render.js`, `modules/dominio/gastos/{index,view}.js`, `modules/dominio/agenda/index.js`, `modules/dominio/import/index.js`, `modules/dominio/compromisos/index.js`, `docs/`.

**Tests:** 931/931 verdes. Sin tests nuevos (el código eliminado no tenía lógica, solo IDs inexistentes).

**Sigue:** ninguna fase activa. Próximas opciones: A.5 (dominio custom), E.2 (SMMLV+UVT 2027 en enero).

### feat(tesoreria): v8.9 - simulador laboral gateado empleado vs independiente + limpieza ingresos · 2026-05-29

Cierre de la fase H (Rediseño de Tesorería). Parte B reemplaza el área de la card de ingresos por un simulador con gate de perfil (empleado / independiente) que nunca mezcla cálculos. Se agregan funciones nuevas de lógica financiera CO (aportes del trabajador 4 % + 4 % + FSP y cesantías + intereses) y se cierra también la limpieza opcional H.C (borrado del dominio `ingresos/` muerto + refresco de asserts e2e obsoletos).

**Cambios clave:**
- **`modules/core/constants.js`:** 4 constantes legales nuevas con fuente: `SALUD_EMPLEADO` (4 %), `PENSION_EMPLEADO` (4 %), `FSP_TRAMOS` (tabla progresiva por múltiplos de SMMLV) e `INTERESES_CESANTIAS` (12 %).
- **`modules/infra/financiero.js`:** Dos funciones nuevas. `calcularAportesEmpleado(salario)`: IBC = max(salario, SMMLV); salud 4 % + pensión 4 % + FSP por tramos (0 % bajo 4 SMMLV, hasta 2 % desde 20 SMMLV); ARL $0. `calcularCesantias(salario, dias, variablesPromedio)`: cesantías y sus intereses 12 % anual. Helper interno `_tasaFSP(ibc)`. Totales sumados desde componentes redondeados para que reconcilien siempre.
- **`tests/unit/calculadoras.test.js`:** 18 tests nuevos (10 aportes + 8 cesantías).
- **`index.html`:** Reemplazado `#simulador-laboral` v8.7 por gate v8.9 con radio de perfil y `fieldset` separados (empleado: salario+días+extras+bonos; independiente: ingreso+ARL). Botón oculto hasta elegir perfil.
- **`styles/components.css`:** Nuevas clases `.sim-gate*` y `.sim-profile-fields`. Grid responsivo, opción seleccionada vía `:has(:checked)`.
- **`modules/dominio/tesoreria/index.js`:** Imports ampliados. `_calcularEmpleado` y `_calcularIndependiente` separados; `_onSubmitSimuladorLaboral` despacha por perfil; `_initSimuladorLaboral` cablea el gate. Cesantías para empleado: extrapolación `días * 2` (máx 360) desde el semestre.
- **Borrados (H.C):** `modules/dominio/ingresos/{logic,view,index}.js`, `tests/unit/ingresos.test.js`. El directorio `ingresos/` ya no existe.
- **`service-worker.js`:** v91 → v92; removidas las 3 rutas de `ingresos/` del `CORE_ASSETS`.
- **`tests/integration/flujos.test.js`:** Quitado el import de `ingresos/logic.js` y el test que lo usaba; Suite 3 (roundtrip) sigue probando que `S.ingresos` persiste a localStorage.
- **`tests/e2e/smoke.test.js`:** Tests del dashboard reescritos para solo testar `#saldo-total` (los IDs `#gastos-mes`, `#compromisos-count`, `#metas-count` eran obsoletos desde un rediseño previo).

**Archivos:** `modules/core/constants.js`, `modules/infra/financiero.js`, `modules/dominio/tesoreria/index.js`, `styles/components.css`, `index.html`, `service-worker.js`, `tests/unit/calculadoras.test.js`, `tests/integration/flujos.test.js`, `tests/e2e/smoke.test.js`, `docs/`. Eliminados: `modules/dominio/ingresos/{logic,view,index}.js`, `tests/unit/ingresos.test.js`.

**Tests:** 931/931 unitarios + integración verdes. E2E pendiente verificación manual.

**Sigue:** deuda técnica `updateBadge`/`renderResumenGastos` cerrada en el commit siguiente.

### refactor(app): v8.8 - eliminación del concepto de ingreso mensual (Tesorería redesign, Parte A) · 2026-05-28

Primera parte del rediseño de Tesorería. Decisión del usuario: "Simplificar todo". Se elimina el ingreso mensual como concepto vivo de la app. El dashboard, Análisis y Logros dejan de depender de ingresos. La app queda centrada en saldos (cuentas) + gastos. Los archivos del dominio `ingresos/` NO se borran: quedan desconectados (código muerto) para no arriesgar una migración de schema (regla 2.5). `S.ingresos` se mantiene en el schema por retrocompatibilidad de datos.

**Cambios clave:**
- **`modules/dominio/analisis/logic.js`:** quitado el import cross-domain de ingresos; borradas `calcularBalance`, `calcularTasaAhorro`, `nivelSalud`; `generarResumen(gastos, compromisos, cuentas, anio, mes, metas)` sin ingresos ni balance; `calcularScoreSalud` reponderado a 3 factores (Deuda 40, Liquidez 35, Control 25). `proyectarPatrimonio` y `proyeccionMultiHorizonte` se conservan como funciones puras con sus tests.
- **`modules/dominio/analisis/view.js`:** corregida la llamada a `generarResumen`; quitadas las cards "Ingresos proyectados" y "Balance neto" (ahora Gastos, Compromisos, Total egresos); eliminada la sección "Salud financiera" (tasa de ahorro); quitado el factor "Ahorro" del Score; removido el bloque "Proyección de patrimonio".
- **`modules/infra/render.js`:** quitado el cálculo de ingresos/balance del dashboard y la constante muerta `_FACTOR_MENSUAL`.
- **`modules/dominio/logros/logic.js`:** borrados los logros `primer-ingreso` y `mes-en-verde` y el helper `_mesEnVerde`.
- **`modules/ui/bootstrap.js`:** desconectado `initIngresos` (import + llamada).
- **`index.html`:** removidos la tira "Balance del mes" (dashboard), la `#panel-ingresos-card` (Tesorería) y el `#modal-ingreso`. El bloque `#simulador-laboral` queda intacto para Parte B.
- **`modules/dominio/analisis/index.js`, `modules/dominio/tesoreria/index.js`:** removida la sección observada `'ingresos'` (rama muerta del EventBus).
- **`modules/dominio/config/index.js`:** el mensaje de reset ya no menciona "ingresos".
- **Tests:** `analisis.test.js` y `logros.test.js` adaptados; `flujos.test.js` reescribe las 3 suites de análisis al modelo sin ingresos; removidos los e2e de la card de ingresos (`smoke.test.js` Suite 4 y nav income-card en `navegacion-render.test.js`).

**Pendiente (deuda técnica anotada):** el e2e del dashboard tiene asserts pre-existentes obsoletos (`#gastos-mes`, `#compromisos-count`, `#metas-count` ya no existen tras un rediseño previo del dashboard). No es de esta tarea: refrescar la suite e2e del dashboard queda como tarea aparte.

**Archivos:** `modules/dominio/analisis/{logic,view,index}.js`, `modules/infra/render.js`, `modules/dominio/logros/logic.js`, `modules/ui/bootstrap.js`, `index.html`, `modules/dominio/tesoreria/index.js`, `modules/dominio/config/index.js`, `tests/unit/analisis.test.js`, `tests/unit/logros.test.js`, `tests/integration/flujos.test.js`, `tests/e2e/smoke.test.js`, `tests/e2e/navegacion-render.test.js`, `CLAUDE.md`, `docs/`.

**Tests:** 945/945 unitarios + integración verdes. E2E no ejecutado (requiere servidor + Chromium).

**Sigue:** Parte B - reemplazar el área de la card de ingresos por un "Simulador laboral" con gate empleado vs independiente (prima, PILA/IBC, auxilio de transporte, horas extras y recargos, bonos). NUNCA mezclar empleado e independiente en la salida.

### feat(tesoreria): v8.7 - simulador laboral unificado + limpieza form cuentas · 2026-05-27

**Fase 1. Simulador laboral:**
- Quitar nudge "Calculá tu prima..." de la sección Tesorería.
- Fusionar herramientas Prima + PILA en único "Simulador laboral" stateless (reutiliza `financiero.js`).
- **Conflicto pendiente:** mantener o eliminar card "Mis ingresos" (fuente única de `S.ingresos` para dashboard/análisis/logros).

**Fase 2. Limpieza form de cuentas:**
- Agregar "Efectivo" como **primera opción** en el bank picker (BANCOS_CO).
- Ocultar campo "Tipo de cuenta" cuando banco=Efectivo (no aplica).
- Quitar campo "Nombre de la cuenta" (se autogenera de `banco+tipo`).
- Actualizar validación: tipo no requerido cuando banco=Efectivo.
- Normalizar tipo='Efectivo' cuando banco=Efectivo para evitar duplicación "Efectivo Efectivo".
- Tests: 3 nuevos para Efectivo, verificando validación y normalización.

**Archivos:** `index.html`, `modules/core/constants.js`, `modules/dominio/tesoreria/view.js`, `modules/dominio/tesoreria/index.js`, `modules/dominio/tesoreria/logic.js`, `styles/components.css`, `tests/unit/tesoreria.test.js`.

**Tests:** 973/973 verdes (3 nuevos).

---

### feat(tesoreria): v8.6 - prima de servicios = estimador honesto con variables opcionales · 2026-05-27

Convierte la calculadora de prima en un estimador honesto (opción A aprobada). Reconoce que la prima real depende de horas extras, recargos y bonos habituales, que varían por trabajador y empresa.

**Cambios clave:**
- **`modules/infra/financiero.js`:** `calcularPrima(salario, dias, variablesPromedio = 0)`. Nuevo 3er parámetro opcional. El IBC para liquidación incluye `salarioBase + variablesAplicadas`. Retorna `variablesAplicadas` en el resultado. Backwards-compatible: los 7 tests existentes siguen verdes.
- **`index.html`:** Form renombrado ("🎁 Estimá tu prima de servicios"). Descripción honesta: "Aproximación para salario fijo. Si tenés horas extras o bonos habituales, ingrésalos para mayor precisión." Dos campos opcionales nuevos: "Horas extras y recargos promedio/mes" + "Bonos y comisiones habituales promedio/mes". Botón: "Estimar prima".
- **`modules/dominio/tesoreria/index.js`:** Handler suma `extras + bonos` como `variablesPromedio`. Muestra fila "Variables incluidas" en el grid solo si hay > 0. Disclaimer al pie del resultado: "Estimación simplificada. El valor real depende de tu nómina exacta del semestre."
- **`tests/unit/calculadoras.test.js`:** 3 tests nuevos de `variablesPromedio`: default=0 equivale a omitir, positivo incrementa la prima correctamente, negativo se trata como 0.
- **`service-worker.js`:** v88 → v89.

**Archivos:** `modules/infra/financiero.js`, `index.html`, `modules/dominio/tesoreria/index.js`, `tests/unit/calculadoras.test.js`, `service-worker.js`, `docs/`.

**Tests:** 970/970 verdes (3 nuevos).

> Para tareas anteriores (v8.5 y previas), ver [`docs/CHANGELOG.md`](CHANGELOG.md).

---

## 4. Qué sigue (roadmap post-v1.0)

**Fase activa:** ninguna. La fase H (Rediseño de Tesorería) cerró en v8.9 con la Parte B (simulador gateado) y la limpieza opcional H.C (borrado de `ingresos/` muerto + refresco e2e). La app sigue estable en producción.

**Opciones para la próxima sesión:**
- **Cerrar deuda técnica:** eliminar `updateBadge` y `renderResumenGastos` no-ops que quedaron cableadas desde 4 dominios (refactor cross-domain acotado).
- **A.5 - Dominio custom** cuando el usuario tenga un dominio registrado.
- **E.2 - SMMLV + UVT 2027** en enero 2027 (~15 min, Haiku).
- Pequeñas mejoras de UX o copy a demanda.

**Estado base:** App en producción estable (`https://finko-brown.vercel.app`).

> **Importante para futuros desarrolladores:** Antes de instalar dependencias o configurar
> un nuevo entorno, leer [`docs/SECURITY.md`](SECURITY.md). Incluye política anti-malware npm,
> guía de migración a **pnpm** con defensas (`minimum-release-age`, `only-built-dependencies`),
> y el audit de seguridad realizado el 2026-05-18.

Tareas opcionales restantes:

| Prioridad | Tarea | Cuándo | Nivel |
|---|---|---|---|
| 1 | **A.5 - Dominio custom** (opcional) | Cuando el usuario tenga dominio registrado | Guía lista en [`docs/SETUP_DOMINIO.md`](SETUP_DOMINIO.md) |
| 2 | **E.2 - SMMLV + UVT** (anual) | **Enero 2027** - buscar nuevos valores Mintrabajo (SMMLV) + DIAN (UVT), actualizar `modules/core/constants.js` | ~15 min, Haiku |
| 3 | **E.3 - GMF + reforma** (demanda) | Si hay reforma tributaria - verificar cambios en GMF | Ad-hoc |

### ⏰ Recordatorio enero 2027 - E.2

**Qué hacer:**
1. 👉 Visita [DIAN UVT](https://www.dian.gov.co/) y [Mintrabajo SMMLV](https://www.mintrabajo.gov.co/)
2. Obtén los valores vigentes para 2027
3. Actualiza en `modules/core/constants.js`:
   ```javascript
   export const SMMLV_2027 = <nuevo_valor>;
   export const UVT_2027 = <nuevo_valor>;
   ```
4. Cambia las referencias de `_2026` a `_2027` en `constants.js`
5. Tests (`npm test` → 596/596 verdes)
6. Commit: `feat(E.2): actualizar SMMLV 2027 + UVT 2027`
7. Push a main → auto-deploy a producción

**Archivo:** Escribe tu `Próximo paso` con modelo **Haiku 4.5** (búsqueda + cambio mecánico).

---

## 5. Cómo trabajamos (workflow)

- **Una tarea a la vez.** No se empieza la siguiente sin verificar en la app y commitear.
- **Al cerrar cada tarea:** actualizar este archivo (HANDOFF.md) + CHANGELOG.md; eliminar de ROADMAP.md y TASKS.md.
- **Al final de cada respuesta:** bloque `─── Próximo paso ───` con modelo sugerido + nivel.
- **Modelos permitidos:** `Haiku 4.5` (sin nivel) · `Sonnet 4.6 - Bajo/Medio/Alto` · `Opus 4.7 - Bajo/Medio/Alto/Extra Alto/Max`.
- **Regla de oro:** calidad del código primero, ahorro de tokens segundo.
- Workflow completo en [`/CLAUDE.md`](../CLAUDE.md) sección 2.

---

## 6. Arquitectura en una línea por capa

```
core/        → state.js (singleton S), storage.js (save debounced), constants.js (CO legales)
infra/       → utils, render, a11y, crud, router, csv, svg, notificaciones
ui/          → bootstrap (entry point), shell, actions (delegación data-action), modales, onboarding
dominio/     → ingresos, gastos, compromisos, tesoreria, metas, analisis,
               calculadoras, config, import, export
tests/unit/  → lógica pura (Vitest + happy-dom) - 521 tests
tests/e2e/   → smoke tests (Playwright) - 18 tests
```

Regla clave: **ningún dominio importa a otro** - comunicación exclusiva por `EventBus`.
Todo `logic.js` es sin DOM (testeable en Node). Todo `view.js` solo lee `S`, no lo muta.

---

## 7. Comandos rápidos

```bash
python -m http.server 8080   # Servir la app (ES6 modules requieren HTTP)
pnpm test                     # 596 tests unitarios + integración
pnpm run test:e2e             # 18 smoke tests Playwright
pnpm run coverage             # umbral 90% capa lógica
pnpm run lighthouse           # requiere servidor en :8080
```
