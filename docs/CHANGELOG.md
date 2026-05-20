# Changelog - Finko Claude

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se elimina del ROADMAP/TASKS y se agrega aquí.

---

### fix(ux) - Transicion de tema suave en mobile (UX#2) · 2026-05-19

Bug reportado: el cambio entre tema claro y oscuro se veia como un "salto" brusco en mobile.

**Causa:** el body tenia `transition: background-color X, color X` pero los descendientes
(sidebar, cards, inputs, bordes) cambiaban instantaneamente porque las CSS custom properties
no son animables por si solas: cuando `.light-theme` se agrega/quita del body, los tokens
cambian en un solo frame.

**Solucion: tecnica "class transitioning"**

En JS (`shell.js`): `applyTheme()` agrega `.theme-transitioning` al body ANTES del swap,
activa un timer de 350ms para quitarla (con clearTimeout por si el usuario hace toggle
rapido repetido).

En CSS (`themes.css`): nueva regla con `@media (prefers-reduced-motion: no-preference)`:
```
.theme-transitioning,
.theme-transitioning *,
.theme-transitioning *::before,
.theme-transitioning *::after {
  transition: background-color 280ms ease, border-color 280ms ease,
              color 180ms ease, fill 180ms ease, box-shadow 280ms ease !important;
}
```
El `!important` garantiza la interpolacion incluso en elementos con transiciones mas
especificas. No afecta `@keyframes` (transition e animation son propiedades independientes).
Los usuarios con `prefers-reduced-motion: reduce` ven el cambio instantaneo (sin lag ni mareo).

**Archivos:**
- `modules/ui/shell.js` (applyTheme + timer de limpieza)
- `styles/themes.css` (media query + selector global transitioning)
- `service-worker.js` (v33 a v34)

**Metricas:** 805/805 unit verdes, 2/2 E2E de tema verdes. El `aria-pressed` se actualiza
sincronamente (antes del timer), por eso los tests E2E siguen funcionando.

---

### fix(ux) - Toast de logro cortado en mobile · 2026-05-19

Bug reportado por el usuario: el toast de "Logro desbloqueado" en celular aparecia
parcialmente fuera de pantalla a la derecha y a veces tapado por el bottom nav.

**Causas:**
1. `white-space: nowrap` + `min-width: 220px` + nombres largos
   ("Diversificador", "Mes en verde", "Planificador") forzaban un ancho mayor que
   el contenedor, generando overflow horizontal del contenido.
2. El `bottom: calc(var(--fk-space-6) + env(safe-area-inset-bottom, 0px))` (≈24px)
   quedaba debajo de los 60px del bottom nav mobile, ocultando parte del toast.

**Fixes en `styles/components.css`:**
- Quitado `white-space: nowrap` y `min-width: 220px`.
- `.logro-toast`: `width: max-content` + `max-width: min(420px, calc(100vw - space-6*2 -
  safe-area-left - safe-area-right))` garantiza margenes laterales seguros.
- `.logro-toast__nombre`: `overflow-wrap: anywhere` y `margin: 0` para que el
  nombre largo haga wrap natural.
- Consolidado `.logro-toast__label` duplicado en un solo bloque.
- Nuevo media query `@media (max-width: 1023.98px)`: el toast sube a
  `bottom: calc(var(--fk-header-height) + var(--fk-space-4) + safe-area-bottom)`,
  asi queda arriba del bottom nav.

**Archivos:**
- `styles/components.css` (CSS del toast)
- `service-worker.js` (v32 → v33 para invalidar cache)

**Métricas:** 805/805 unit verdes, 18/18 E2E smoke verdes (no hay E2E del toast porque
es un componente de animacion temporal de 4s).

---

### fix(e2e) - 5 regresiones E2E corregidas · 2026-05-19

Dos causas independientes. Ambas introducidas por commits anteriores al bottom nav mobile.

**Causa 1: textos de empty state renombrados (navegacion-render.test.js)**
Los empty state de Tesorería y Compromisos recibieron copy más humano en algún commit de UX.
Los tests tenían los textos viejos.
- Tesorería: "Sin cuentas todavía" → "¿Dónde guardás tu plata?"
- Compromisos: "Sin compromisos registrados" → "Nada que pagar... por ahora"

**Causa 2: selector `[data-action="theme-toggle"]` resuelve a 2 elementos (smoke.test.js)**
El bottom nav mobile agregó un segundo botón de tema en el modal "Más" (`#menu-mas-tema`).
Playwright strict mode rechaza locators ambiguos.
- Fix: `[data-action="theme-toggle"]` → `button.nav-item[data-action="theme-toggle"]`
  Apunta solo al boton de la nav desktop, que es el visible en los tests con Chromium Desktop.

**Archivos:**
- `tests/e2e/navegacion-render.test.js`: 3 textos actualizados.
- `tests/e2e/smoke.test.js`: 3 ocurrencias del selector corregidas (replace_all).

**Métricas:** 805/805 unit verdes, 38/38 E2E verdes.

---

### test(e2e) - Smoke del banner de instalacion PWA · 2026-05-19

6 tests Playwright que cubren el flujo del banner persuasivo de instalacion. Cierra el
`Próximo paso` que habia quedado abierto tras la tarea del banner.

**Cobertura:**
- Banner oculto antes del onboarding (sin `S.onboarded`).
- Banner visible tras el onboarding (carga inicial con `S.onboarded=true`).
- Click en Instalar abre `#modal-install-ios` (atributo `data-open`).
- Modal lista los 3 pasos correctos (Compartir / Agregar a pantalla de inicio / Agregar).
- Click en X descarta el banner y persiste `fk_install.estado='dismissed'`.
- No reaparece si `fk_install.estado='installed'`.

**Decisiones de diseno:**
- UA iOS forzada via `test.use({ userAgent })` para evitar la dependencia de
  `beforeinstallprompt` que Chromium headless no dispara fuera de un sitio "installable".
- Se inyecta `localStorage.fk_v1` con `_version: 4` y opcionalmente `fk_install` por test,
  patron consistente con `navegacion-render.test.js` y `estrategia-pago.test.js`.

**Hallazgo paralelo:** al correr la suite E2E completa aparecen 5 regresiones preexistentes
(verificadas corriendo los archivos viejos sin mi test):
- `navegacion-render.test.js`: Tesoreria, Compromisos, navegar T->M->T (3 fallos).
- `smoke.test.js`: toggle aria-pressed del tema, persistencia tras reload (2 fallos).

Probable causa: el commit `92b2868 feat(nav): bottom nav mobile con boton "Mas" y selector
de tema accesible` movio el selector del toggle de tema y cambio el orden de listeners de
hashchange. No es bloqueante para el nuevo test, pero queda como tarea siguiente.

**Archivos:**
- `tests/e2e/install-prompt.test.js` (nuevo)

**Métricas tras la tarea:** 805/805 unit verdes, 38 tests E2E totales (33 verdes + 5 fallos
preexistentes).

---

### G.3 - Sistema de logros con toast y confetti · 2026-05-19

Sistema de gamificacion liviano: detecta hitos del usuario, los persiste en S.logros y
muestra un toast animado con confetti la primera vez que cada uno se cumple.

**Logros definidos (12):**
- `primer-paso`: completó el onboarding.
- `primer-ingreso/gasto/compromiso`: primer registro en cada coleccion.
- `tesorero`: primera cuenta o billetera registrada.
- `soñador`: primera meta de ahorro creada.
- `meta-lograda`: primera meta completada.
- `planificador`: primer presupuesto por categoria.
- `diversificador`: 3 o mas cuentas activas.
- `prestamista`: primer prestamo personal registrado.
- `mes-en-verde`: ingresos activos (normalizados a mensual) > gastos del mes actual.
- `diez-gastos`: 10 o mas gastos registrados.

**Arquitectura:**
- `logros/logic.js`: lógica pura. LOGROS[] con `eval(S)` funciones; `evaluarLogros(S)` retorna
  ids cumplidos. Sin DOM, sin imports de otros dominios.
- `logros/index.js`: `initLogros()` + suscripcion a `state:change`. Detecta logros nuevos,
  persiste en S.logros, muestra toast con delay 1.4s entre logros.
- Toast: usa CSS existente (.logro-toast, @keyframes toastIn/toastOut de base.css).
- Confetti: 24 spans .confetti-piece con colores del sistema, posicion fixed, lanzados
  desde zona inferior-central con delay random.

**Schema v3 a v4:**
- `state.js`: `_version: 4`, campo `logros: []` en createInitialState().
- `storage.js`: SCHEMA_VERSION = 4, migracion v3 a v4 agrega `logros: []` idempotente.
- `bootstrap.js`: `initLogros()` despues de renderAll().
- `tests/unit/logros.test.js`: 30 tests nuevos (guardia de inputs, todos los logros, casos
  borde de diversificador, diez-gastos, mes-en-verde, multiples simultaneos, integridad tabla).
- `tests/unit/state.test.js`: version esperada actualizada a 4.

Archivos: `modules/dominio/logros/logic.js` (nuevo), `modules/dominio/logros/index.js` (nuevo),
`modules/core/state.js`, `modules/core/storage.js`, `modules/ui/bootstrap.js`,
`tests/unit/logros.test.js` (nuevo), `tests/unit/state.test.js`, `service-worker.js` (v28 a v29).

---

### feat(analisis) - G.2: Comparación de categorías + patrón semanal · 2026-05-19

Dos funciones puras portadas desde Finko-Refactor e integradas en el panel de análisis.
`detectarMesesSinCerrar` se descartó porque requería `S.historial`, concepto que no
existe en Claude. La comparación de categorías se adapta leyendo dos meses directamente
desde `S.gastos`, sin historial externo.

- `modules/dominio/analisis/logic.js`: +`calcularComparacionCategorias(gastos, anio, mes, config)`:
  computa catMaps de mes actual y mes anterior desde `gastosMes()` + `gastosPorCategoria()`,
  detecta subidas/bajadas/nuevas/desaparecidas, genera highlights.
  +`detectarPatronGastoSemanal(gastos, hoyISO, config)`: acumula totales por día de semana
  en ventana de 90 días, señala días >= 2× el promedio como destacados.
- `modules/dominio/analisis/view.js`: +`_renderComparacionCategorias()` (tabla + highlights)
  y +`_renderPatronSemanal()` (lista de días) integradas en `renderAnalisis()`.
- `styles/components.css`: +15 clases CSS para `.comparacion__*` y `.patron__*`.
- `tests/unit/analisis.test.js`: +20 tests (128 total en el archivo). Suite total: 775/775.
- `service-worker.js`: v27 a v28.

### feat(compromisos) - G.1: Detectores de alerta · 2026-05-19

Dos funciones puras portadas y adaptadas desde Finko-Refactor:
`detectarFijosSinPagarEsteMes()` y `detectarDeudasDurmiendo()`.
Adaptacion: Claude usa `S.compromisos[]` unificado con `tipo` en lugar de arrays separados.
Sin historial de pagos (`pagadoEn`, `deudaId`), la deteccion es heuristica:
fijos = `diaPago <= diaHoy`; deudas = `fechaCreacion >= umbral meses` + `saldoPendiente > 0`.

- `modules/dominio/compromisos/logic.js`: +`detectarFijosSinPagarEsteMes(compromisos, hoyISO, config)`
  y +`detectarDeudasDurmiendo(compromisos, hoyISO, config)`. Ambas con niveles de severidad
  y sugerencias de accion.
- `modules/dominio/compromisos/view.js`: +`renderAlertaFijosSinPagar()` y
  +`renderAlertaDeudasDurmiendo()` con nudges tipo `nudge-high` / `nudge-medium`.
  Importa las dos nuevas funciones de `logic.js`.
- `modules/dominio/compromisos/index.js`: ambas funciones llamadas dentro de `_renderTodo()`.
- `index.html`: +`#nudge-fijos-sin-pagar` y +`#nudge-deudas-durmiendo` en `#sec-compromisos`.
- `styles/components.css`: +`.nudge__desc--muted` para el "ver mas..." de lista truncada.
- `tests/unit/compromisos.test.js`: +22 tests (106 total en el archivo). Suite total: 755/755.
- `service-worker.js`: v26 a v27.

### fix(analisis) - Score liquidez/control leía field name equivocado · 2026-05-19

Bug en `calcularScoreSalud()` (F.3): leía `resumen.gastosMes` (con s) pero
`generarResumen()` devuelve `gastoMes` (sin s). El operador `?? 1` ocultaba
el bug en runtime: `gasteMes` caía siempre a `1`, lo cual inflaba
`mesesRunway` (saldoCuentas/1 ≈ infinito → score liquidez 100) y deflactaba
el coeficiente de variación (volatilidad/1 ≈ enorme → score control 0) en
producción. Los tests existentes pasaban porque su fixture usaba la variante
con s.

- `modules/dominio/analisis/logic.js`: ahora acepta ambos field names
  (`resumen.gastoMes ?? resumen.gastosMes ?? 1`).
- `tests/unit/analisis.test.js`: test de regresión con el field name real
  (`gastoMes`) que devuelve `generarResumen()`. Total: 732 + 1 = 733/733 verdes.
- `service-worker.js`: v25 a v26.

### G.3.F9 - Recordatorio de prima 30 días antes del semestre · 2026-05-19

Extensión de G.3.F8: el nudge de prima en `#nudge-prima` ahora escala de urgencia
según los dias que faltan para la próxima prima semestral.

- `modules/dominio/tesoreria/logic.js`: nueva funcion `diasParaPrimaSemestral(hoy?)`.
  Candidatos: 30-jun y 20-dic del año actual + 30-jun del siguiente. Filtra por
  fecha >= hoy (normalizada a medianoche), toma el más próximo. Retorna `{ dias, fecha, semestre }`.
- `modules/dominio/tesoreria/view.js`: `renderNudgePrima()` reescrito con tres estados:
  dias > 30 → nudge-info (distribucion, mismo comportamiento F8).
  dias 8-30 → nudge-medium + "Tu prima llega en X dias" + distribucion.
  dias ≤ 7  → nudge-high + countdown urgente + distribucion.
  El atributo `role` cambia a 'alert' cuando es cercana para accesibilidad.
- `tests/unit/tesoreria.test.js`: 7 tests nuevos para `diasParaPrimaSemestral`.
  Total: 725 + 7 = 732/732 verdes.
- `service-worker.js`: v24 a v25.

### G.3.F8 - Sugerencia de distribución de prima en Tesorería · 2026-05-19

Tarjeta de coaching en la sección Tesorería que estima la prima semestral y sugiere cómo
distribuirla de forma inteligente. Aparece siempre (persistente), pero su contenido cambia:
- Con ingresos mensuales: muestra prima estimada + 3 tramos (fondo, deudas, ahorro).
- Sin ingresos mensuales: pide al usuario registrar su salario en Ingresos.
- Con compromisos tipo 'deuda': incluye tramo "Pago de deudas" (30%); sin deudas, ese
  porcentaje pasa a ahorro (quedando 50% fondo, 50% ahorro).

- `modules/dominio/tesoreria/logic.js`:
  `estimarSalarioMensual(ingresos)`: suma ingresos activos con frecuencia Mensual.
  `sugerirDistribucionPrima(salario, tieneDeudas)`: prima = salario*180/360 y pcts.
- `modules/dominio/tesoreria/view.js`: `renderNudgePrima()` escribe en `#nudge-prima`.
  Lee `S.ingresos` y `S.compromisos` para personalizar la distribución.
- `modules/dominio/tesoreria/index.js`: `_renderTodo()` llama ambas vistas.
  EventBus ahora escucha tambien 'ingresos' y 'compromisos' para re-render.
- `index.html`: `<div id="nudge-prima">` antes de `#lista-tesoreria`.
- `tests/unit/tesoreria.test.js`: +11 tests (estimarSalarioMensual x5, sugerirDistribucion x6).
  Total: 714 + 11 = 725/725 verdes.
- `service-worker.js`: v23 a v24.

### G.3.F5 - Nudge mora inminente en Compromisos · 2026-05-19

Cuando hay compromisos activos con vencimiento en ≤ 5 dias, se muestra un nudge de
advertencia encima de la lista. El nivel escala: `nudge-high` si alguno vence en ≤ 3 dias,
`nudge-medium` si todos estan entre 4 y 5 dias. El nudge desaparece automaticamente cuando
no hay mora inminente (el div se limpia en cada re-render).

- `modules/dominio/compromisos/logic.js`: nueva funcion exportada `nivelAlertaMora(proximos)`.
- `modules/dominio/compromisos/view.js`: nueva funcion exportada `renderNudgeMoraInminente()`.
  Importa `compromisosProximos` y `nivelAlertaMora` de logic.js. Lee `S.compromisos`,
  genera el nudge o limpia el contenedor segun corresponda.
- `modules/dominio/compromisos/index.js`: `_renderTodo()` llama `renderNudgeMoraInminente()`
  antes de `renderListaCompromisos()`. Import de `renderNudgeMoraInminente` agregado.
- `index.html`: nuevo `<div id="nudge-compromisos">` antes de `#lista-compromisos`.
- `tests/unit/compromisos.test.js`: 5 tests nuevos para `nivelAlertaMora` (null, high, high
  con mezcla, medium, umbral 3/4). Total: 709 + 5 = 714/714 verdes.
- `service-worker.js`: v22 a v23.

### G.3.F4 - Bloque de usura en calculadora Credito · 2026-05-19

Cuando la tasa ingresada en la calculadora Credito supera el tope legal de usura vigente (SFC),
se muestra un bloque de alerta critica `.nudge.nudge-critical` ANTES del resultado calculado.
El resultado sigue visible para que el usuario entienda las cifras, pero la advertencia es lo
primero que ve. El announce de accesibilidad tambien cambia al texto de la advertencia.

- `modules/dominio/calculadoras/view.js`: nueva funcion exportada `renderAlertaUsura(tasaEAPct, usuraInfo)`.
  Muestra la tasa ingresada, el tope legal, el periodo vigente, el exceso en puntos, la
  referencia legal (Art. 68 Ley 45/1990) y un link a sfc.gov.co.
- `modules/dominio/calculadoras/index.js`: `_onSubmitCredito` importa `tasaUsuraVigente()`
  (de `core/constants.js`) y `renderAlertaUsura` (de `view.js`). Inyecta la alerta solo
  cuando `clasificarTasaCredito()` retorna `'usura'`; en caso contrario, comportamiento igual.
- `tests/unit/calculadoras.test.js`: 7 tests nuevos para `renderAlertaUsura` (clase CSS,
  rol ARIA, tasa mostrada, tope en pct, periodo, calculo del exceso, exceso en tope exacto).
  Total: 702 + 7 = 709/709 tests verdes.
- `service-worker.js`: v21 a v22.

### G.2.D - CSS para Calculadoras y Configuracion · 2026-05-19

Las dos secciones tenian clases HTML huerfanas sin definicion CSS. Se escribieron las reglas
completas en `styles/components.css` como bloques independientes al final del archivo.

**Calculadoras:**
- `.calc-panel`: flex column con gap-4 para apilar las 7 calculadoras.
- `.calc-card`: surface-card (bg-surface, borde sutil, radius-xl, padding-6, flex column).
- `.calc-card__title`: text-base semibold, igual al patron de titulos de otras secciones.
- `.calc-form` + `.calc-form__fields`: form flex column; grid auto-fill minmax 200px para campos.
- `.calc-result`: area de resultado con borde izquierdo accent, se oculta cuando vacia (`:empty`).
- `.calc-result__grid`: dl en grid 2 col (dt texto, dd mono tabular-nums alineado a la derecha).
- `.calc-result__highlight` (accent), `.calc-result__deduct` (danger), `.calc-result__total` (bold lg).
- `.calc-result__badge`: chip para clasificacion de tasa (usura/alta/estandar/razonable).
- `.calc-result__errors`: lista de errores de validacion en color danger.

**Configuracion:**
- `.config-section`: misma surface-card que calc-card, con margin-bottom-4 entre secciones.
- `.config-section__title`: text-lg semibold.
- `.config-section__desc`: text-sm secondary; variante `--warn` con bg warning-bg y borde.
- `.config-info`: dl key-value en grid 2 col (dt muted, dd primary).
- `.config-form`: flex column gap-4.
- `.config-toggle`: pill switch iOS-style con `appearance: none` + pseudoelemento `::after` que
  se desliza 20px al activarse. Verde (`--fk-accent`) cuando checked.
- `.config-toggle__label`: text-sm medium.
- `.config-actions`: flex-wrap gap-2 para los 4 botones de importar/exportar.
- `.config-danger`: zona roja sutil (bg danger-bg, borde rgba 25%), flex column gap-3.
- `.config-danger__title`: text-sm semibold danger-text.

Archivos: `styles/components.css` (2 bloques nuevos al final), `service-worker.js` (v20 a v21).

---

### G.2.C - Onboarding wizard de 3 pasos · 2026-05-19

Amplió el wizard de bienvenida (antes: 1 paso con solo nombre) a 3 pasos reales
que dejan la app configurada con datos iniciales sin abrumar al usuario.

**Paso 1 - Bienvenida:**
- Mismo campo de nombre que antes.
- Nuevo: indicador de pasos (3 dots animados, pill activo en verde).
- Texto: "¡Bienvenido a Finko! Tu plata, tu idioma, sin complicaciones."

**Paso 2 - Tu plata (datos opcionales):**
- Ingreso principal: monto + frecuencia (select con FRECUENCIAS, por defecto "mensual").
- Cuenta o billetera: nombre + saldo inicial (Nequi, Efectivo, Bancolombia, etc.).
- Todo opcional. Si el usuario llena algo, `guardar()` lo persiste al pasar al paso 3.
- Botón "Omitir" salta directamente al paso 3 sin guardar nada.
- Se reutiliza `guardar()` de crud.js. Validación inline (no importa lógica de dominio).

**Paso 3 - Primera meta (datos opcionales):**
- 5 chips preset: 🛡️ Fondo de emergencia, ✈️ Viaje, 💻 Tecnología, 🏠 Vivienda, 🎓 Educación.
- Click en chip: pre-llena el campo nombre + emoji (solo si el campo está vacío).
- El usuario puede escribir su propia meta y monto objetivo.
- "Omitir y empezar" completa el onboarding sin guardar meta.
- "Empezar 🎉" guarda la meta (si hay nombre) y completa el wizard.

**CSS nuevo en modals.css:**
- `.modal--onboarding` (max-width 460px, text-center).
- `.onboarding__steps` + `.onboarding__step` + `.onboarding__step.active` (pill animado width 8px → 28px).
- `.onboarding__hero/title/desc/footer/note/skip/divider`.
- `.onboarding__chips` + `.onboarding__chip` + `.onboarding__chip.selected`.

Archivos: `modules/ui/onboarding.js` (reescrito), `styles/modals.css`, `service-worker.js` (v19 a v20).

---

### G.2.B - Empty states modernos (tono Duolingo) en 8 secciones · 2026-05-19

Mejora de UX/copy en todos los estados vacíos de la app. Objetivo: pasar de mensajes secos y
clínicos a textos cálidos con personalidad, que inviten a la acción y enseñen algo útil.

**Patrón aplicado en cada sección:**
- Título cálido (pregunta o frase con voz de la app: "¿En qué se fue la plata?").
- Descripción con beneficio concreto (no descripción de feature, sino lo que el usuario gana).
- Botón CTA con acción clara.
- `.empty-state__tip` con tip financiero educativo breve (clase ya estaba en CSS desde G.1).

**Secciones actualizadas:**
- Ingresos: "Tu plata empieza aquí" + tip sobre ingresos variables.
- Gastos: "¿En qué se fue la plata?" + tip sobre Análisis instantáneo.
- Compromisos: "Nada que pagar... por ahora" + tip sobre patrimonio neto.
- Personales: "Nadie te debe... o no lo recordaste" + tip sobre pagos parciales.
- Tesorería: "¿Dónde guardás tu plata?" + tip sobre billeteras digitales.
- Metas: "¿Qué estás ahorrando para lograr?" + tip sobre fondo de emergencia.
- Presupuesto: "Controlá sin enredarte" + tip sobre regla 50/30/20.
- Análisis (2 mensajes inline): tendencia y por categoría mejorados.

Archivos: `modules/dominio/{ingresos,gastos,compromisos,personales,tesoreria,metas,presupuesto,analisis}/view.js`, `service-worker.js` (v18 a v19).

---

### G.2.A - Bento Grid asimétrico en dashboard · 2026-05-19

Rediseño del dashboard: de 6 celdas planas e iguales a 7 celdas con jerarquía visual clara.

**Layout nuevo:**
- Hero saldo (8col×2row): `.bento__cell--wide.bento__cell--tall.bento__cell--accent.bento__cell--hero`. Valor con `.bento__value--xl` (`clamp(2.25rem, 5vw, 3.75rem)`).
- Balance del mes (4col×2row): `data-dominio="analisis"`. Muestra ingresos estimados vs gastos mes, con color verde/rojo dinámico.
- Ingresos / Gastos / Metas (4col×1row c/u): con `data-dominio` correspondiente.
- Compromisos / Préstamos (6col×1row c/u, `.bento__cell--half`): nueva celda `#personales-count`.

**CSS agregado en layout.css:**
- `.bento__cell--half` (span 6 desktop, span 3 tablet, span 1 mobile).
- `.bento__cell--hero` (border-radius 28px, padding generoso).
- `.bento__value--xl` (clamp 2.25rem → 3.75rem).
- `[data-dominio]::before` pseudo-element (borde top 3px del color del dominio).
- Glow de icono por dominio via `filter: drop-shadow()`.
- Animación cascade (nth-child 1-8, 40ms entre cada celda).
- Hover lift en desktop: `translateY(-2px)`.

**render.js:** `updateBadge()` ahora también llena `#personales-count` (lógica inline para no romper regla 10 de no-domain-imports en infra).

Archivos: `index.html`, `styles/layout.css`, `styles/responsive.css`, `modules/infra/render.js`, `service-worker.js` (v17 a v18).

---

### G.1 - Foundation UI: tokens de dominio, animaciones, sistema nudge · 2026-05-19

Infraestructura visual base del rediseño moderno (inspiración Duolingo pero con sobriedad financiera).

**tokens.css:**
- 8 tokens `--fk-dom-*` (verde ingresos, naranja gastos, rojo compromisos, azul tesorería,
  violeta metas, teal análisis, amarillo presupuesto, rosa personales).
- 15 tokens `--fk-nudge-*` para 5 niveles de urgencia (critical/high/medium/info/success),
  cada uno con bg/border/accent usando `color-mix(in srgb, ...)`.

**base.css:**
- `font-variant-numeric: tabular-nums` en `.mono`.
- 4 keyframes: `sectionIn` (entrada de sección), `cardIn` (tarjeta desde abajo), `toastIn/Out` (slide), `confettiFall` (lluvia de confetti).
- Animación `sectionIn` en `.sec.active > *:first-child` (respeta `prefers-reduced-motion`).
- Feedback táctil en móvil: `.btn:active { transform: scale(0.97) }`.

**components.css:**
- `.nudge` base (grid 3 cols: icon/body/cta) + 5 variantes (.nudge-critical → .nudge-success).
- `.logro-toast` (fixed bottom, slide animation, glow verde).
- `.confetti-piece` con animación `confettiFall`.
- `.dom-badge` con 8 variantes de dominio.
- `.empty-state__tip` (tip educativo: borde izquierdo, bg elevada, texto xs).
- `.input-money`: `font-variant-numeric: tabular-nums`.
- `.empty-state__icon`: 3.5rem, sin opacity, `filter: drop-shadow(...)`.

**CLAUDE.md:** Sección 7 - prohibición de em-dash (U+2014 ─) y en-dash (U+2013 -) en textos del proyecto. Tabla de alternativas (dos puntos, punto, paréntesis, guión, coma). Grep para verificar. Excepción: datos del usuario.

Archivos: `styles/tokens.css`, `styles/base.css`, `styles/components.css`, `styles/layout.css`, `styles/responsive.css`, `CLAUDE.md`, `service-worker.js` (v16 a v17).

---

### Refactor: single-source-of-truth en constantes legales y tokens · 2026-05-19

Refactor arquitectural para eliminar la necesidad de tocar múltiples archivos
cuando cambian valores oficiales. Antes (patrón antiguo): cambiar el SMMLV
requería actualizar imports, UI strings, tests, docstrings - 6 archivos.
Ahora: una sola entrada en una tabla.

**Nueva estructura en `modules/core/constants.js`:**

```js
// Tabla histórica indexada por año
const LEGAL_POR_ANIO = {
  2025: { smmlv, auxilioTransporte, uvt, vigenciaDesde, fuentes },
  2026: { ... valores 2026 ... },
  2027: null,  // agregar acá cuando se publique
};

// Tabla histórica indexada por trimestre (para tasa de usura)
const USURA_POR_PERIODO = {
  '2026-Q1': { tasa: 0.2677, desde, hasta, fuente },
  '2026-Q2': { tasa: 0.2817, desde, hasta, fuente },
};

// Selectores dinámicos
export function legalVigente(fecha = new Date())   { ... }
export function tasaUsuraVigente(fecha = new Date()){ ... }
export function legalDelAnio(anio)                 { ... }  // lectura histórica
export function aniosPublicados()                  { ... }

// Exports estables - lo que importa el resto del proyecto
export const SMMLV               = ...;  // vigente
export const AUXILIO_TRANSPORTE  = ...;
export const UVT                 = ...;
export const TASA_USURA          = ...;
export const VIGENCIA            = ...;
export const ANIO_VIGENTE        = ...;
export const PERIODO_USURA       = ...;
```

**Cómo actualizar al año 2027:**

```js
const LEGAL_POR_ANIO = {
  ...,
  2027: {
    smmlv: <valor>, auxilioTransporte: <valor>, uvt: <valor>,
    vigenciaDesde: '2027-01-01',
    fuentes: { smmlv: '...', auxilio: '...', uvt: '...' },
  },
};
```

Eso es todo. Toda la app usa los nuevos valores automáticamente cuando
la fecha del sistema entra en 2027:
- `S.perfil.smmlv` se inicializa al SMMLV 2027 para usuarios nuevos.
- Calculadora de PILA usa el nuevo SMMLV como piso del IBC.
- Calculadora de Prima usa el nuevo SMMLV para el umbral de auxilio.
- "Acerca de Finko" muestra el SMMLV y fuentes nuevas dinámicamente.
- Form de compromisos muestra el hint con la usura vigente del trimestre.
- Tests siguen pasando (usan las constantes importadas, no literales).

**Migración de consumidores:**

| Antes | Ahora |
|---|---|
| `import { SMMLV_2026 }` | `import { SMMLV }` |
| `import { UVT_2026 }` | `import { UVT }` |
| `import { AUXILIO_TRANSPORTE_2026 }` | `import { AUXILIO_TRANSPORTE }` |
| `import { TASA_USURA_Q2_2026 }` | `import { TASA_USURA }` |

Los aliases viejos (`SMMLV_2026`, etc.) se mantienen como `@deprecated`
apuntando al valor vigente, para no romper código externo si lo hubiera.

**Tokens CSS (`styles/tokens.css`):**

Agregados para eliminar hex codes duplicados en componentes:
- `--fk-amber: #f59e0b` (warning más cálido - duplicados en import).
- `--fk-amber-bg: rgba(245, 158, 11, 0.08)`.
- `--fk-text-on-bold: #fff` (texto sobre fondos saturados accent/danger).

Eliminados 8 colores hardcodeados:
- `color: #fff` (×4) en `.btn-danger:hover`, `.badge` base, `.nav-item__badge`.
- `color: #0f1117` (×1) en `.badge-warning` → reemplazado por `var(--fk-text-on-accent)`.
- `#f59e0b` (×3) en `.import-warn`, `.import-stat--dup` → `var(--fk-amber)`.

**Metadatos de la app:**

Centralizados `APP_NAME` y `APP_VERSION` en `constants.js`. `config/view.js`
ahora lee `APP_VERSION` en vez de tener `0.1.0` hardcoded. Versión sigue
sincronizada manualmente con `package.json` (documentado en docstring).

**Otros:**

- `modules/dominio/calculadoras/logic.js`: docstring genérica (sin valores
  específicos de año).
- `modules/dominio/calculadoras/view.js`: `min="${SMMLV}"` dinámico.
- `modules/dominio/compromisos/view.js`: hint de tasa de usura dinámico
  (`tasaUsuraVigente().tasa` + `.periodo`).
- `tests/unit/calculadoras.test.js`: test "salario > 2×SMMLV" usa `3 * SMMLV`
  (resilient a cambios futuros); test "usa TASA_USURA por defecto" usa
  `TASA_USURA + 0.01` y `TASA_USURA * 0.30` en vez de literales 0.50/0.10.
- `service-worker.js`: CACHE_NAME v15→v16.

**Tests:** 702/702 unit + 32/32 E2E verdes.

---

### E.2 - Actualizar SMMLV/UVT 2026 + preparar 2027 · 2026-05-19

**Hallazgo:** los valores etiquetados como "2026" en `constants.js` correspondían
en realidad al año 2025 (1.423.500 / 49.799 / 200.000 son los valores 2025).
Los valores oficiales 2026 entraron en vigencia el 1 de enero de 2026.

**Cambios en `modules/core/constants.js`:**

| Constante | Antes (2025 mal etiquetado) | Ahora (2026 oficial) |
|---|---:|---:|
| `SMMLV_2026` | 1_423_500 | **1_750_905** |
| `AUXILIO_TRANSPORTE_2026` | 200_000 | **249_095** |
| `UVT_2026` | 49_799 | **52_374** |

**Nuevas constantes añadidas:**
- `VIGENCIA_2026 = '2026-01-01'` - fecha ISO de vigencia.
- `SMMLV_2027 = null` - pendiente de publicación oficial.
- `AUXILIO_TRANSPORTE_2027 = null` - pendiente.
- `UVT_2027 = null` - pendiente.
- `VIGENCIA_2027 = null` - pendiente.

**Fuentes oficiales utilizadas:**

- **SMMLV 2026 ($1.750.905):** Decreto 1469 del 29 de diciembre de 2025
  (Mintrabajo). Suspendido provisionalmente por el Consejo de Estado en
  feb-2026; ratificado por el Decreto 0159 del 19 de febrero de 2026, que
  mantiene transitoriamente el mismo valor mientras se resuelve la legalidad
  del decreto original.
  Doc: https://dapre.presidencia.gov.co/normativa/normativa/DECRETO%20No.%200159%20DEL%2019%20DE%20FEBRERO%20DE%202026.pdf
  Comunicado oficial: https://www.presidencia.gov.co/prensa/Paginas/Salario-vital-2-000-000-a-partir-de-enero-de-2026-251230.aspx
- **Auxilio transporte 2026 ($249.095):** Decreto 1470 del 29 de diciembre
  de 2025 (Mintrabajo).
- **UVT 2026 ($52.374):** Resolución DIAN 000238 del 15 de diciembre de 2025.
  Doc: https://www.dian.gov.co/normatividad/Normatividad/Resoluci%C3%B3n%20000238%20de%2015-12-2025.Pdf
  Comunicado INCP: https://incp.org.co/publicaciones/infoincp-publicaciones/impuestos/2025/12/dian-fijo-en-52-374-en-valor-de-la-uvt-para-el-ano-gravable-2026/

**Valores 2027:** NO publicados oficialmente. Calendario habitual:
- SMMLV: decreto presidencial en la última semana de diciembre del año anterior.
- UVT: resolución DIAN antes del 1 de enero del año gravable.
- **Publicación esperada: diciembre 2026.**

**Cambios colaterales (referencias UI y test):**

- `modules/dominio/config/view.js`: placeholder y "Acerca de" actualizados.
- `modules/dominio/calculadoras/view.js`: `min="1750905"` en input de prima.
- `modules/dominio/calculadoras/logic.js`: docstring actualizada.
- `tests/unit/calculadoras.test.js`:
  - Constantes locales `SMMLV_2026/AUXILIO_2026` sincronizadas.
  - Test "salario > 2 SMMLV no incluye auxilio": cambiado salario de
    prueba de $3.000.000 → $4.000.000 (nuevo umbral 2×SMMLV = $3.501.810).
- `service-worker.js`: CACHE_NAME v14→v15.
- 702/702 unit + 32/32 E2E verdes.

---

### Fix routing race condition (segunda iteración, 5 dominios) · 2026-05-18

**Bug reportado por el usuario:** al navegar desde Dashboard hacia Tesorería
o Metas, la sección a veces aparecía completamente vacía (solo el título,
sin lista, sin empty state). Síntoma intermitente: si abría la app
directamente en `#tesoreria` lo veía bien, pero si llegaba navegando
desde el dashboard, vacío.

**Causa raíz:** el fix anterior (2026-05-18) corrigió `renderSmart()` para
usar `location.hash` en vez de `.active`, y agregó `hashchange` listener
solo a `analisis/`. Pero **5 dominios seguían sin listener**: tesoreria,
metas, gastos, ingresos, compromisos. Esos dominios sólo rendereaban en:
1. El init (si `location.hash` coincidía en ese momento).
2. `EventBus.on('state:change', ...)` cuando se mutaba su sección.

Si el usuario llegaba navegando sin haber mutado el estado, el HTML
de la lista nunca se renderaba. Aparecía como sección vacía.

**Fix:** agregar `window.addEventListener('hashchange', ...)` a los 5
dominios siguiendo el patrón ya validado en analisis/config/presupuesto/
calculadoras/personales:

```js
window.addEventListener('hashchange', () => {
  renderSmart(renderListaX, 'X');
});
```

**Test de regresión:** nuevo archivo `tests/e2e/navegacion-render.test.js`
con 6 tests que arrancan siempre en `#dash` y navegan a cada sección,
asegurando que el empty state aparece. Sin el fix, los asserts fallaban.

- `modules/dominio/tesoreria/index.js` (+listener hashchange)
- `modules/dominio/metas/index.js` (+listener hashchange)
- `modules/dominio/gastos/index.js` (+listener hashchange)
- `modules/dominio/ingresos/index.js` (+listener hashchange)
- `modules/dominio/compromisos/index.js` (+listener hashchange)
- `tests/e2e/navegacion-render.test.js` (nuevo, 6 tests)
- `service-worker.js` (v13→v14)
- Tests: 702/702 unit, 32/32 E2E verdes.

---

### Test E2E F.4 - Smoke de Estrategia de pago · 2026-05-18

8 tests Playwright end-to-end en `tests/e2e/estrategia-pago.test.js`:

1. Card visible con ≥ 2 deudas válidas.
2. Avalancha: deuda de mayor tasa EA en posición 1.
3. Bola de Nieve: deuda de menor saldo en posición 1.
4. Toggle Avalancha→Bola de Nieve→Avalancha restaura orden original.
5. Input "extra mensual" redibuja card con totales distintos.
6. Intereses totales renderizados con formato pesos (`$`).
7. 1 deuda → hint (no card completa, no `.estrategia-card__orden`).
8. 0 deudas válidas → `#estrategia-pago` vacío.

- `tests/e2e/estrategia-pago.test.js` (nuevo, 262 líneas, 8 tests)
- E2E: 26/26 verdes.

---

### F.4 - Estrategias Avalancha / Bola de Nieve para pago de deudas · 2026-05-18

Nueva sección en `compromisos/` que aparece automáticamente cuando el usuario
tiene ≥ 2 deudas activas con `saldoPendiente`, `tasaEA` y `monto` válidos.
Permite simular y comparar dos estrategias clásicas de amortización:

- **Avalancha:** prioriza la deuda de **mayor tasa EA** → matemáticamente
  óptima, minimiza intereses pagados.
- **Bola de Nieve:** prioriza la deuda de **menor saldo** → motivacional,
  victorias rápidas (estilo Dave Ramsey).

**Algoritmo de simulación (`simularEstrategiaPago`):**

1. Ordenar deudas según la estrategia elegida.
2. Cada mes:
   - Aplicar interés mensual: `saldo × ((1 + tasaEA)^(1/12) - 1)`.
   - Pagar cuota mínima en todas las deudas no prioritarias.
   - Volcar el "presupuesto restante" (cuota mínima + extra mensual + cuotas
     liberadas de deudas ya saldadas) en la deuda prioritaria.
3. Cuando una deuda llega a 0, su cuota se libera y "rueda" a la siguiente.
4. Tope MAX_MESES = 600 (50 años) como safety contra loops cuando el aporte
   no alcanza ni para cubrir el interés mensual.

**3 funciones puras nuevas en `compromisos/logic.js`:**
- `filtrarDeudasPagables(compromisos)` - filtra y normaliza shape.
- `simularEstrategiaPago(deudas, extraMensual, estrategia)` - simulación mes a mes.
- `compararEstrategias(deudas, extraMensual)` - corre ambas + delta de ahorro.

**UI (`compromisos/view.js`):**
- Card que aparece SOLO con ≥ 2 deudas válidas (no estorba a usuarios sin
  deudas múltiples). Con 1 deuda muestra hint educativo.
- Input "extra mensual" (COP) con persistencia local en la pestaña.
- Toggle Avalancha 🏔️ / Bola de Nieve ⚪ con hint contextual.
- Tabla ordenada con mes-pagado por deuda.
- Comparación: "💰 Con [estrategia] ahorrás $X y N mes/meses respecto a [otra]"
  con plural correcto (1 mes vs N meses).
- Si ambas estrategias dan idéntico resultado (caso típico: tasa más alta
  coincide con saldo más bajo), muestra mensaje neutral.

**17 tests nuevos en `compromisos.test.js`** (702/702 verdes), cubriendo:
- `filtrarDeudasPagables`: rechazo de no-deudas, saldos/tasas/montos inválidos.
- `simularEstrategiaPago`: 0/1/N deudas, extra=0 vs extra>0, orden por tasa
  vs saldo, tope MAX_MESES, redondeo de centavos al pagar.
- `compararEstrategias`: empate, Avalancha gana (caso normal), datos vacíos.

**Verificado manualmente en preview** con 3 sets:
- 3 deudas (Visa 32% $2.5M, Banco 24% $8.5M, Hipo 12% $80M) → empate orgánico
  porque Visa es la de mayor tasa Y menor saldo.
- 2 deudas divergentes (Crédito caro 30% $15M, Préstamo barato 12% $1.5M):
  Avalancha ahorra $27.895 sin extra; con $500K extra ahorra $282.575 y 1 mes.
- 1 deuda: aparece hint educativo en lugar de la card principal.

**Archivos:**
- `modules/dominio/compromisos/logic.js` - 3 funciones nuevas (+182 LOC).
- `modules/dominio/compromisos/view.js` - `renderEstrategiaPago` + 2 helpers
  + estado UI local (+150 LOC).
- `modules/dominio/compromisos/index.js` - 2 nuevos handlers
  (`elegir-estrategia`, `cambiar-extra-estrategia` con event delegation),
  `_renderTodo()` que re-renderiza ambas vistas tras cambios.
- `index.html` - contenedor `#estrategia-pago` en sección compromisos.
- `styles/components.css` - estilos `.estrategia-card` (+118 LOC).
- `tests/unit/compromisos.test.js` - 17 tests nuevos.
- `service-worker.js` - bump `finko-v12` → `finko-v13`.

---

### Política de seguridad + guía pnpm · 2026-05-18

Nuevo documento de política de seguridad para el proyecto. Motivado por las oleadas
recientes de ataques supply-chain a npm (eventos "shai-hulud" 2024-2025: paquetes
con `postinstall` inyectando cripto-stealers al instalar).

- `docs/SECURITY.md` (nuevo): modelo de amenaza de Finko (offline-first, sin backend),
  historial de ataques a npm, defensas de pnpm (`minimum-release-age=7`,
  `only-built-dependencies` por whitelist), guía completa de migración npm→pnpm en 7 pasos,
  workflow de seguridad continuo, log de audits realizados.
- `CLAUDE.md`: agregada referencia a `docs/SECURITY.md` en sección "Antes de tocar código,
  leer" - obligatorio antes de modificar dependencias.
- `docs/HANDOFF.md`: nota de aviso para futuros developers sobre la política.

No se ejecuta migración ahora - está documentado para cuando el usuario decida hacerla
en sesión dedicada (cambia lockfile, afecta CI).

---

### A.5 - Guía: configurar dominio custom · 2026-05-18

Documentación para A.5 (opcional). Cuando el usuario tenga un dominio registrado y quiera
cambiar de `finko-brown.vercel.app` a uno propio (ej: `finko.app`).

- `docs/SETUP_DOMINIO.md` (nuevo): 3 opciones (comprar en Vercel, dominio externo +
  nameservers, o DNS records manuales), pasos detallados, troubleshooting, costos estimados.

No requiere cambios de código en Finko - solo config en Vercel + DNS del registrador.

---

### B.4 - Splash screens iOS · 2026-05-18

5 imágenes PNG para la pantalla de arranque al abrir la PWA instalada en iOS.

Dispositivos cubiertos y archivos generados en `assets/splash/`:
- `splash-750x1334.png` - iPhone SE (2nd/3rd gen) / iPhone 8
- `splash-1170x2532.png` - iPhone 12 / 13 / 14
- `splash-1179x2556.png` - iPhone 14 Pro / 15
- `splash-1284x2778.png` - iPhone 14 Plus / 15 Plus
- `splash-1290x2796.png` - iPhone 14 Pro Max / 15 Pro Max

Diseño: fondo `#0f1117`, logo 3 barras ascendentes `#00dc82` centrado (~44% alto),
"Finko" bold en verde, "Tu plata bajo control" en `#475569`. Generados con
`scripts/gen-splash.py` (Pillow, escalado por `scale = w / 750`).

`index.html`: `<meta name="apple-mobile-web-app-capable" content="yes">`,
`<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`,
y 5 tags `<link rel="apple-touch-startup-image" media="...">` con media queries
exactos por `device-width`, `device-height` y `-webkit-device-pixel-ratio`.

`service-worker.js`: 5 PNGs en `OPTIONAL_ASSETS`; `CACHE_NAME` `finko-v8` → `finko-v9`.

Tests: 596/596 verdes.

---

### B.3 - Favicon SVG · 2026-05-18

Favicon vectorial para Finko. Sin favicon previo en el proyecto (solo `apple-touch-icon.png`).

- `assets/icons/favicon.svg` (nuevo): viewBox 32×32, fondo `#0f1117` con rx=5,
  3 barras ascendentes `#00dc82` (rx=2). Proporciones idénticas al ícono PNG existente.
- `index.html`: `<link rel="icon" type="image/svg+xml" href="assets/icons/favicon.svg" />`
  antes del apple-touch-icon.
- `service-worker.js`: `favicon.svg` agregado a CORE_ASSETS; `CACHE_NAME` bumpeado
  `finko-v7` → `finko-v8`.

Tests: 596/596 verdes. El SVG se verifica en el HTML fuente vía fetch al servidor.

---

### E.1 - Actualizar tasa de usura Q1 → Q2 2026 · 2026-05-18

Tasa de usura vigente (SFC - Superintendencia Financiera de Colombia) actualizada
al cierre trimestral. Q1 2026 vencía 2026-03-31 con 26.77% EA. Q2 2026 (abril-junio)
certificado a 28.17% EA por resolución SFC.

Cambios en el código:
- `modules/core/constants.js`: renombrado `TASA_USURA_Q1_2026` → `TASA_USURA_Q2_2026`,
  valor 0.2677 → 0.2817, comentario actualizado con vigencia hasta 2026-06-30.
- `modules/dominio/compromisos/view.js`: hint en modal de crear/editar Compromiso
  actualizado de "26.77% EA (SFC, Q1 2026)" a "28.17% EA (SFC, Q2 2026)".

Tests: 596/596 verdes (Vitest), sin impacto en cobertura. La constante no se importa
en otros módulos (fue preparada para futura funcionalidad de cálculo de intereses máximos).

---

### A.4 - Smoke test confirmado en Redmi Note 11 · 2026-05-18

Usuario verificó en dispositivo real (Xiaomi Redmi Note 11, 393px) que el fix
responsive de la sesión anterior funciona correctamente. Reportó: números del
dashboard más legibles, botones con altura suficiente para tocar (44px+), inputs
sin activar zoom automático en iOS, navegación completa a las 5 secciones sin
overflow, operación offline confirmada (modo avión + agregar gasto). Cierre de
tarea A.4 del ROADMAP post-v1.0. No requirió cambios de código - solo verificación.

---

### Fix: responsive integral mobile (320-1440px) · 2026-05-18

Smoke test A.4 reveló que aunque la barra inferior ya mostraba los 5 íconos,
la app en general no se sentía adaptada a móviles modernos (Redmi Note 11
393px y similares). Refactor integral de `responsive.css` con principios:

1. **Fluid typography con `clamp()`** - el valor hero del dashboard
   (`.bento__value`, `.card__value`, `.patrimonio-hero__valor`) escala
   fluidamente entre 24px (320px viewport) y 36px (≥600px) en vez de
   saltar bruscamente entre breakpoints. Antes se mostraba 24px en
   cualquier móvil < 480px (Redmi/Pixel/iPhone moderno incluidos);
   ahora a 393px se renderiza a 31.5px, suficiente para destacar como
   métrica principal.

2. **Touch targets ≥ 44px** - `.btn`, `.input`, `.select` y `textarea.input`
   ahora tienen `min-height: 44px` en `< 1024px` (cumple Apple HIG y
   se acerca a Material 48px). Antes 40px era demasiado chico.

3. **Inputs 16px font-size en móvil** - fix para el bug clásico de iOS
   Safari que hace zoom automático al enfocar un input con `font-size < 16px`.
   Antes los inputs eran 14px → al tocarlos la página entera saltaba
   en iPhone.

4. **Breakpoint `< 480px` → `< 360px`** - la regla previa reducía h1 y
   bento__value en todo móvil moderno (393/414px también afectados). El
   nuevo breakpoint solo aplica a dispositivos legacy reales como iPhone
   SE 1ª gen (320px). Móviles modernos (360/393/414) ya no se ven
   "comprimidos".

5. **Grids fijos colapsan a 1-col en < 768px** - `.proyeccion-grid` (era
   3 cols), `.presupuesto-hero__totales` (era 3 cols), `.metric-grid` y
   `.chart-stats` ahora son 1-col en móvil, evitando contenido apretado.
   `.import-resumen` baja a 2-col (estaba auto-fit pero quedaba muy chico).

6. **Nav-item label con ellipsis** - en viewports muy chicos (320px) el
   label "Tesorería" se trunca con `…` en lugar de desbordar.

7. **`viewport-fit=cover` + `maximum-scale=5`** en `index.html` - cubre
   notch/area segura en dispositivos modernos y permite zoom del usuario
   (accesibilidad: no bloqueamos zoom).

8. **Bump `CACHE_NAME` v6→v7** - los PWA instalados refrescarán CSS, HTML
   y SW cacheados al reabrir la app.

Verificado en preview a 6 viewports: 320, 360, 393, 414, 768, 1280px.
Cero overflow horizontal en todos.

- `styles/responsive.css` (reescrito), `index.html` (meta viewport),
  `service-worker.js` (CACHE_NAME)

---

### B.2 - Screenshots PWA para manifest · 2026-05-18

2 screenshots de 540×720 (tema oscuro) para enriquecer la ficha de instalación
PWA en Android Chrome. Generados con Pillow desde script Python reproducible.

- `assets/screenshots/screenshot-1-dashboard.png` - Dashboard con balance, presupuesto y compromisos próximos.
- `assets/screenshots/screenshot-2-gastos.png` - Listado de gastos del mes con categorías color-coded.
- `manifest.json` - array `"screenshots"` con `form_factor: "narrow"` y labels descriptivos.
- `service-worker.js` - screenshots en `OPTIONAL_ASSETS`; bump `CACHE_NAME` v5→v6.
- `scripts/gen-screenshots.py` - script reutilizable para regenerar screenshots.

---

### Fix: sidebar móvil colapsada (A.4 smoke test reveló bug) · 2026-05-18

Smoke test desde móvil real (Xiaomi/Android) reveló que la barra de navegación
inferior solo mostraba el item activo (Dashboard), atrapando al usuario en el
dashboard sin forma de navegar a Ingresos, Gastos, etc. Dos bugs estructurales
acumulados desde Fase 6 que Lighthouse + E2E (que solo probaron 1280×800) no
detectaron.

**Bug 1 - wrapper interno rompe el flex chain:**
La nav real es `sidebar__nav > nav-group > div[role="list"] > nav-item`. En
mobile, `sidebar__nav` es `flex-direction:row` pero el `<div role="list">`
intermedio era `display:block` (default), apilando los 5 items verticales
dentro de una caja de 60px con `overflow:hidden` → solo se veía el primero.

**Bug 2 - `top: 0` desktop colateral en mobile:**
`.sidebar` desktop tiene `position:sticky; top:0`. En mobile cambia a
`position:fixed; bottom:0` pero el `top:0` heredado seguía activo. Con
`height:60px` fijo, `top:0` ganaba a `bottom:0` → la barra quedaba ARRIBA en
vez de abajo.

**Fix:**
- Aplanar la cadena en mobile: `.sidebar__nav > .nav-group, .sidebar__nav > .nav-group > [role="list"] { display: flex; flex-direction: row; flex: 1; }`.
- `top: auto` explícito en `.sidebar` del media query mobile.
- Bump `CACHE_NAME` `finko-v4 → finko-v5` para que los PWA instalados refresquen el `responsive.css` cacheado (sin esto, el fix no llega al usuario).

**Verificado en preview a 375×812:** sidebar en y:752 (al fondo), 5 items en
fila distribuidos correctamente, segundo grupo ocultado por la regla
`.nav-group:not(:first-child)` ya existente.

**Commits:**
- **fix(responsive)** - `ee727ec` · `styles/responsive.css` - fix de los 2 bugs estructurales.
- **chore(sw)** - `1bf3b00` · `service-worker.js` - bump `CACHE_NAME` v4→v5.

---

### Deploy real + verificación headers (A.1' / A.2 / A.3) · 2026-05-18

Finko publicada en producción en `https://finko-brown.vercel.app`. Repo en
`https://github.com/estebancuentas140892-star/Finko` con integración Vercel→GitHub
para auto-redeploy en cada push a `main`.

**Verificación de headers (A.3):**
- **HTML** `/`: `max-age=0, must-revalidate` ✓
- **`/service-worker.js`**: `no-cache, no-store, must-revalidate` ✓ (tras fix)
- **`/styles/*.css`**: `max-age=31536000, immutable` ✓
- **`/modules/**/*.js`**: `max-age=31536000, immutable` ✓
- **Security headers** en todas las rutas: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: notifications=(self)` ✓
- **HTTPS** (A.2): automático en Vercel con `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` ✓

**Fix detectado en producción:**
Vercel aplica TODAS las reglas que matchean una ruta y, cuando dos setean el
mismo header, **gana la última en orden**. La regla genérica `/(.*)\.js`
matcheaba `service-worker.js` y, al venir después de la regla específica,
sobrescribía `Cache-Control` con `immutable` (max-age 1 año), bloqueando
actualizaciones del PWA. Solución: reordenar `vercel.json` para que la regla
de `/service-worker.js` sea la última. `netlify.toml` NO cambia porque Netlify
usa "primera regla gana" (comportamiento inverso) y ahí el orden ya era correcto.

**Commits:**
- **fix(deploy)** - `0960322` · `vercel.json` - reordenar reglas para que SW reciba `no-cache`.

---

### Tests de integración - Migración schema v1→v2 (C.3) · 2026-05-18

9 tests en Suite 6 de `tests/integration/flujos.test.js` que blindan la lógica de `_migrate()` y `_applyToS()` introducidas en el schema bump de D.5.

**Casos cubiertos:**
- **Migración base** (1 test): fixture `_version:1` sin `presupuestos` → `loadData()` agrega `presupuestos:[]` y sube `_version` a `SCHEMA_VERSION` (2).
- **Legacy sin `_version`** (1 test): dato muy viejo sin el campo → se trata como v1 y migra correctamente.
- **Idempotencia** (1 test): fixture `_version:2` con presupuestos existentes → no los borra ni duplica.
- **Preservación de datos** (1 test): cuentas, ingresos, gastos, compromisos, metas, perfil y `onboarded` de v1 sobreviven sin alteraciones.
- **`presupuestos` preexistente en v1** (1 test): `_migrate()` solo agrega si `!Array.isArray(data.presupuestos)`, los existentes se respetan.
- **`_version` string `"1"`** (1 test): `typeof "1" !== 'number'` → fallback a 1 → migra.
- **`_version` null** (1 test): `typeof null !== 'number'` → fallback a 1 → migra.
- **Roundtrip post-migración** (1 test): `loadData(v1)` → `_flushNow()` → `loadData()` → estado v2 idéntico.
- **Campos desconocidos descartados** (1 test): `_applyToS()` itera `Object.keys(createInitialState())`, campos legacy como `transferencias` no aparecen en `S`.

**Commits:**
- **test(integration)** - `tests/integration/flujos.test.js` (ampliado con Suite 6) - 9 tests nuevos; 596/596 tests verdes.

---

### Tests de integración - Flujo C.2 (Backup/Restore) · 2026-05-18

8 tests en `tests/integration/flujos.test.js` cubriendo el ciclo completo export → reset → import.

**Suites:**
- **Export a CSV** (2 tests): `gastosACSV()` preserva toda la información (fecha, monto, descripción, categoría, cuenta, nota); CSV vacío cuando no hay gastos.
- **Import desde CSV** (3 tests): `procesarCSV()` detecta correctamente gastos válidos, duplicados e errores; detección de duplicados cuando se reimporta lo mismo; cuentaId se resuelve correctamente o es null si no existe.
- **Roundtrip completo** (1 test): exportar → limpiar → importar → verificar que datos son idénticos (fecha, monto, descripción, categoría, cuentaId, nota).
- **Validación y robustez** (2 tests): CSV con errores múltiples rechaza solo las filas malas; BOM UTF-8 se procesa correctamente.

**Commits:**
- **test(integration)** - `tests/integration/flujos.test.js` (ampliado) - 8 tests nuevos; 587/587 tests verdes.

---

### Envelope budgeting - Presupuesto por sobre (D.5) · 2026-05-18

Nueva sección "Presupuesto" cierra la funcionalidad core de Finko. Un envelope por
categoría con monto mensual recurrente; el progreso se compara contra los gastos del
mes actual.

**Resumen:**
- Estados de progreso: `ok` (<75%), `alerta` (75-100%), `excedido` (>100%). Cada estado
  con su color en la barra de progreso y un icono (⏰/⚠️) en el título del envelope.
- Panel completo con hero (Asignado · Gastado · Restante), lista de envelope cards
  color-coded, y sección de "Categorías con gastos sin presupuesto" (huérfanas).
- Modal de creación/edición. Al editar, la categoría queda deshabilitada para evitar
  conflictos con el resto del schema (delete + create new si el usuario quiere cambiar).
- Schema bump `v1 → v2`: agrega `S.presupuestos = []`. Migración idempotente garantiza
  que usuarios existentes arrancan sin envelopes sin perder datos.
- SW mejora: `cache: 'reload'` en `install` evita servir versiones obsoletas del HTTP
  cache del browser o CDN intermedio (relevante también para producción).

**Commits:**
- **feat(presupuesto)** - `f3f4141` · `modules/dominio/presupuesto/{logic,view,index}.js` (nuevos),
  `modules/core/{state,storage}.js`, `modules/infra/router.js`, `modules/ui/bootstrap.js`,
  `index.html`, `styles/components.css`, `service-worker.js`, `tests/unit/{presupuesto,state}.test.js` -
  38 tests nuevos del logic; CACHE_NAME `finko-v3` → `finko-v4`; 579/579 verdes.

---

### Tests de integración - Flujo C.1 · 2026-05-18

20 tests en `tests/integration/flujos.test.js` cubriendo el flujo principal de usuario.

**Suites:**
- **Estado del flujo** (6 tests): onboarding → cuenta → ingreso → gasto; verifica que cada dominio registra correctamente y los ítems tienen IDs únicos.
- **Análisis cross-domain** (6 tests): `calcularBalance`, `calcularTasaAhorro`, `nivelSalud`, `generarResumen` calculan correctamente sobre el estado real; incluye caso "salud crítica" con egresos > ingresos.
- **Roundtrip localStorage** (4 tests): `_flushNow()` + `loadData()` reproduce el estado exacto; análisis idéntico antes y después; `loadData()` idempotente; múltiples ítems sin duplicados.
- **Resiliencia** (4 tests): JSON corrupto, estado vacío, `generarResumen` sobre estado vacío, cuenta inactiva excluida del total.

**Commits:**
- **test(integration)** - `534d7d0` · `tests/integration/flujos.test.js` (nuevo) - 541/541 tests verdes (18 archivos).

---

### Íconos PNG producción + Apple Touch Icon (B.1) · 2026-05-18

Rediseño completo de los íconos PWA con técnica de supersampling.

**Resumen:**
- Diseño nuevo: 3 barras crecientes redondeadas (`#00dc82` sobre `#0f1117`). Gráfico financiero inmediatamente reconocible, funciona a 192px y 512px.
- Técnica: renderizado 4× (`2048px`, `768px`) + downscale `LANCZOS` → anti-aliasing de producción.
- Safe zone 80% cumplido: contenido dentro del área segura para `maskable`.
- Nuevo `apple-touch-icon.png` (180×180) para instalación en iOS Safari.
- `<link rel="apple-touch-icon">` agregado en `index.html`.
- `apple-touch-icon.png` en `OPTIONAL_ASSETS` del SW.

**Commits:**
- **feat(assets)** - `43dc878` · `scripts/gen-icons.py` (reescrito), `assets/icons/icon-192.png`, `assets/icons/icon-512.png`, `assets/icons/apple-touch-icon.png` (nuevo), `index.html`, `service-worker.js`.

---

### Deploy a producción - Netlify/Vercel (A.1) · 2026-05-18

Config de deploy estático lista para Netlify y Vercel. Sin build step.

**Resumen:**
- `netlify.toml`: `publish = "."`, sin comando de build, cache 1 año para JS/CSS, `no-cache` para `service-worker.js`, cabeceras de seguridad (`X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy: notifications=(self)`).
- `vercel.json`: configuración equivalente para Vercel.
- `service-worker.js`: 7 módulos post-v1.0 faltantes agregados a `CORE_ASSETS` (csv, svg, notificaciones, import/*, export/logic); `CACHE_NAME` bumpeado de `finko-v1` → `finko-v2`.

**Para publicar:**
```bash
# Netlify
npm i -g netlify-cli
netlify deploy --prod --dir .

# Vercel
npm i -g vercel
vercel --prod
```

**Commits:**
- **feat(deploy)** - `518a297` · `netlify.toml` (nuevo), `vercel.json` (nuevo), `service-worker.js` - config de headers, caché y seguridad; SW CORE_ASSETS completo; CACHE_NAME v2.

---

### Feature: Exportar gastos a CSV (D.1) - 2026-05-18

Exportación de gastos al mismo formato que acepta el importador (D.2), garantizando roundtrip completo.

**Resumen:**
- Botón "📤 Exportar gastos (CSV)" en Configuración → Tus datos, junto a los botones de importar.
- Función pura `gastosACSV(gastos, cuentas)` en `modules/dominio/export/logic.js`: serializa con BOM UTF-8 (compatibilidad Excel en Windows), ordena por fecha más reciente primero, resuelve `cuentaId` → nombre legible.
- Formato de salida: `fecha,monto,descripcion,categoria,cuenta,nota` - idéntico al que acepta D.2.
- Estado vacío: anuncia "No hay gastos para exportar" sin generar archivo.
- Archivo descargado: `finko-gastos-YYYY-MM-DD.csv`.

**Commits:**

- **feat(export)** - `f091091` · `modules/dominio/export/logic.js` (nuevo), `modules/dominio/config/view.js`, `modules/dominio/config/index.js`, `tests/unit/export.test.js` (nuevo) - `gastosACSV()`; botón y acción `exportar-gastos-csv` wired desde `config`; 13 tests nuevos (521/521 verdes).

---

## [1.0.0] - 2026-05-16

Primera versión estable y completa de Finko Claude. PWA offline-first lista para uso local.

**Métricas finales:**
- Lighthouse: **Performance 99 · Accessibility 100 · Best Practices 100 · SEO 100**
- Tests unitarios: **300/300** verdes
- Tests E2E: **18/18** verdes (Playwright)
- Cobertura lógica: **99.6% líneas · 100% funciones**
- Lint: limpio
- `onclick`/`style`/`window.X` en HTML/módulos: **0 / 0 / 0**

### Feature: Patrimonio Neto + Proyección (2026-05-17)

Feature completa en 3 tareas: lógica financiera → extensión de formulario → renderizado UI.

**Resumen:**
- Tarea 1: Cálculo de patrimonio neto (activos − pasivos) y proyecciones lineales a 6/12/24 meses.
- Tarea 2: Captura de `saldoPendiente` y `tasaEA` para deudas en compromiso (campos opcionales).
- Tarea 3: Panel Patrimonio con hero card, grid de activos/pasivos, CTA si faltan saldos, proyecciones.

**Commits:**

- **feat(analisis)** - `6b014dd` · `modules/dominio/analisis/logic.js`, `modules/core/state.js`, `tests/unit/analisis.test.js` - lógica pura: `calcularActivos()`, `calcularPasivos()`, `calcularPatrimonioNeto()`, `proyectarPatrimonio()`, `proyeccionMultiHorizonte()`; extensión de `generarResumen()` con parámetro opcional metas; 33 tests nuevos cubriendo activos, pasivos, patrimonio, proyecciones; back-compat garantizada.
- **feat(compromisos)** - `8b9adbc` · `modules/dominio/compromisos/{logic,view,index}.js`, `tests/unit/compromisos.test.js`, `styles/components.css` - captura `saldoPendiente` (monto adeudado) y `tasaEA` (tasa efectiva anual) para compromisos de tipo deuda; campos opcionales en formulario (hidden hasta seleccionar tipo=deuda); validación condicional; normalización; 14 tests; estilos `.form-optional`, `.form-hint`; visibilidad toggle en `_inyectarForm()`.
- **feat(analisis)** - `c0025c4` · `modules/dominio/analisis/{view,index.js}`, `styles/components.css` - renderizado de patrimonio: hero card (patrimonio neto ±signo), grid activos/pasivos con detalles, CTA si faltan saldos, subsección proyecciones (6m/12m/24m con dinámica de ahorro/déficit); ~180 líneas CSS nuevas (.patrimonio-hero, .proyeccion-grid, plus fix de .metric-card/.salud-card/.progress-bar que estaban sin estilo); observa cambios de metas.

### Feature: Importar gastos desde CSV (D.2) - Preview + detección de duplicados (2026-05-18)

Importación masiva de gastos desde extractos bancarios o backups CSV.

**Resumen:**
- Parser RFC 4180 simplificado en `infra/csv.js` con autodetección de separador (`,` o `;`), quote escaping, BOM UTF-8, CRLF/CR/LF, saltos dentro de quotes.
- Soporte solo para gastos (los ingresos son recurrentes, no transacciones individuales en este schema).
- Validación per-row con número de línea real; errores acumulados, no se aborta al primero.
- Normalización: fechas en 4 formatos (incluyendo DD/MM/YYYY colombiano y validación de bisiestos); montos en formato CO (`1.234.567,89`) y US (`1,234,567.89`) con `$` opcional.
- **Detección de duplicados** via hash determinista `fecha|monto|descripcionLower`: compara contra `S.gastos` existentes y dentro del propio CSV.
- **Match de cuenta** por nombre case-insensitive (solo cuentas activas).
- **Modal con 2 vistas**: picker (file + hint del formato) → preview (4 stats + tabla scrollable con sticky header + acciones cancelar/confirmar).
- Botón nuevo en Configuración → "Tus datos": "📥 Importar gastos (CSV)".

**Commits:**

- **feat(import)** - `ba4cec5` · `modules/infra/csv.js` (nuevo), `modules/dominio/import/{logic,view,index}.js` (nuevos), `index.html`, `modules/dominio/config/view.js`, `modules/ui/bootstrap.js`, `styles/components.css`, `tests/unit/{csv,import}.test.js` - parser CSV (`parsearCSV`, `parsearCSVaObjetos`, `serializarCSV`, `detectarSeparador`); lógica de importación (`procesarCSV`, `validarFila`, `normalizarFila`, `hashGasto`, `parsearFecha`, `parsearMonto`); UI modal con 5 acciones (`abrir-import`, `seleccionar-csv` via change-delegation, `confirmar-import`, `cancelar-import`, `reiniciar-import`); 93 tests nuevos (508/508 verdes).

### Feature: Notificaciones Push (D.4) - Recordatorios de compromisos (2026-05-18)

Recordatorios locales sin servidor usando la Web Notifications API.

**Resumen:**
- Opt-in explícito desde el panel Configuración → sección "🔔 Recordatorios".
- 4 estados de la sección según permiso del navegador: default (botón activar) / granted (toggle) / denied (instrucciones) / unsupported (fallback link).
- Al arrancar la app: si opt-in + permiso granted + hay compromisos ≤ 3 días → muestra UNA notificación por sesión.
- Formato singular ("⏰ Arriendo vence hoy") y plural ("⏰ 3 compromisos vencen mañana, nombres…").
- `S.config.notificaciones` persistido en localStorage; sin schema bump (campo opcional retrocompatible).

**Commits:**

- **feat(notificaciones)** - `f56e06f` · `modules/infra/notificaciones.js` (nuevo), `modules/core/state.js`, `modules/dominio/compromisos/logic.js`, `modules/dominio/config/{view,index}.js`, `modules/ui/bootstrap.js`, `eslint.config.js`, `tests/unit/{notificaciones,compromisos}.test.js` - `estadoPermiso()`, `pedirPermiso()`, `mostrarNotificacion()`, `verificarYNotificar()`, `formatearMensajeNotificacion()` (pura); `compromisosProximos(compromisos, diasLimite=3)`; wiring UI acciones; 21 tests nuevos (415/415 verdes).

### Feature: Gráficos (D.3) - Sparkline + Donut (2026-05-18)

Visualización de datos financieros con SVG inline vanilla, sin librerías.

**Resumen:**
- Sección "Tendencia de gastos": sparkline 12 meses con área suave, eje X, 4 stats (este mes, variación, máximo, mínimo).
- Donut integrado en "Gastos por categoría": distribución circular con leyenda y tooltips nativos.
- Paleta de 7 colores accesibles; "Otros" agrupa categorías pequeñas de forma semántica.
- Layout responsive: donut y barras en columna (mobile), lado a lado (desktop 768px+).

**Commits:**

- **feat(analisis)** - `e63a9f0` · `modules/infra/svg.js` (nuevo), `modules/dominio/analisis/logic.js`, `modules/dominio/analisis/view.js`, `styles/components.css`, `tests/unit/{svg,analisis}.test.js` - helpers puros `sparkline()`, `donut()`, `colorearSegmentos()` en `svg.js` (180 líneas); lógica `serieGastosMensual()`, `seriePorCategoria()` para computar series temporales (75 líneas); renderizado `_renderTendencia()` + donut integrado (90 líneas); CSS responsivo (.sparkline, .donut, .chart-*, layout grid) 145 líneas; 47 tests nuevos (31 svg.test.js, 16 analisis.test.js; 394/394 verdes).

### Extras post-fase 14 (2026-05-16/17)

- **fix(bento)** - `15e487b` · `index.html`, `styles/layout.css`, `modules/infra/render.js` - celda huérfana de la Bento Grid en desktop: se agregaron las cards `#metas-count` y `#balance-mes` y la lógica de cálculo en `updSaldo()` con `_FACTOR_MENSUAL`.
- **feat(pwa)** - `e0b598e` · `assets/icons/icon-192.png`, `assets/icons/icon-512.png`, `scripts/gen-icons.py` - íconos PNG reales generados con Pillow (fondo `#0f1117`, círculo `#00dc82`, letra "F").
- **test(a11y)** - `87848bc` · `tests/unit/a11y.test.js`, `eslint.config.js` - integración de axe-core con 6 tests WCAG 2.1 AA sobre el `index.html` estático (0 violaciones críticas/serias).
- **test(e2e)** - `9af9f80` · `tests/e2e/smoke.test.js`, `playwright.config.js`, `package.json` - 18 smoke tests Playwright cubriendo navegación, CRUD ingresos/gastos/cuentas, persistencia, tema, modales.
- **feat(qa)** - `8ebbaf8` · `scripts/lighthouse.js`, `index.html`, `styles/layout.css` - script Lighthouse programático (usa Chromium de Playwright para evitar EPERM en Windows). Fixes para llegar a Accessibility 100: `aria-dialog-name` en `#onboarding` (cambio a `aria-label`) y contraste de `.bento__label` (color `--fk-text-muted` → `--fk-text-secondary`, ratio 4.0:1 → 7.0:1).

### Fase 14 - PWA + Service Worker + verificación final (2026-05-16)

- **feat(pwa)** - `b78ad4f` · `manifest.json`, `service-worker.js`, `index.html` - manifest completo (name, short_name, display:standalone, theme_color, lang:es, íconos 192/512); SW cache-first con CORE_ASSETS + OPTIONAL_ASSETS tolerante, purga de caches viejos al activar, fallback al shell en navegación offline; registro SW vía `<script>` plain con guard `'serviceWorker' in navigator`.
- **chore(qa)** - `e8c0a77` · `package.json`, `vitest.config.js`, tag `v1.0.0` - bump 0.1.0 → 1.0.0, cobertura ajustada a la capa lógica pura (excluye `view.js`, `index.js`, `ui/` DOM-bound), umbral 90%.

### Fase 13 - Onboarding + Configuración (2026-05-15)

- **feat(ui)** - `873d817` · `modules/ui/onboarding.js`, `modules/dominio/config/{view,index}.js`, `modules/ui/bootstrap.js`, `index.html`, `eslint.config.js` - wizard real de bienvenida (form en `#onboarding-body`, guarda `S.perfil.nombre` + `S.onboarded`); panel de configuración con perfil editable (nombre + SMMLV), exportar JSON (Blob + URL.createObjectURL), importar JSON (FileReader + reload), resetear app, sección "Acerca de".

### Fase 12 - Calculadoras financieras (2026-05-15)

- **feat(dominio)** - `0dcec52` · `modules/dominio/calculadoras/{logic,view,index}.js`, `tests/unit/calculadoras.test.js`, `modules/infra/router.js`, `modules/ui/bootstrap.js` - 5 calculadoras: CDT (retención 7%), crédito (sistema francés, EA→mensual), interés compuesto (capitalización periódica), regla 72 (aproximado + logarítmico), prima (Ley 1788/2016, auxilio si ≤ 2 SMMLV); lazy load via hashchange; 39 tests; fix `router.js` entrada `['ingresos', 'sec-ingresos']`.

### Fase 11 - Análisis financiero (2026-05-14)

- **feat(dominio)** - `53a5f1d` · `modules/dominio/analisis/{logic,view,index}.js`, `tests/unit/analisis.test.js`, `modules/ui/bootstrap.js` - agregación cross-domain: `calcularBalance()`, `calcularTasaAhorro()`, `nivelSalud()` (excelente/buena/ajustada/critica), `generarResumen()`; UI con 4 métricas, salud con progress bar, gastos por categoría con barras proporcionales, alertas hormiga; 28 tests; EventBus observa 4 secciones para recalcular.

### Fase 10 - Compromisos (2026-05-14)

- **feat(dominio)** - `769d010` · `modules/dominio/compromisos/{logic,view,index}.js`, `tests/unit/compromisos.test.js`, `modules/ui/bootstrap.js`, `index.html` - gastos fijos + deudas + agenda; catálogos `TIPOS_COMPROMISO`/`LABEL_TIPO`/`ICONO_TIPO`; `compromisosActivos()`, `calcularCompromisoMensual()`, `proximoVencimiento()`, `urgencia()`; lista ordenada por urgencia con chip de días; badge en navbar; 40 tests.

### Fase 9 - Metas de ahorro (2026-05-13)

- **feat(dominio)** - `ed0681c` · `modules/dominio/metas/{logic,view,index}.js`, `tests/unit/metas.test.js`, `modules/ui/bootstrap.js`, `index.html` - `metasActivas()`, `calcularProgreso()`, `diasHastaFecha()`, `calcularAhorroDiario()`; lista con progress bar + empty state; abonar via prompt; 41 tests.

### Fase 8 - Ingresos + Gastos (2026-05-13)

- **feat(dominio)** - `469f006` · `modules/dominio/ingresos/{logic,view,index}.js`, `modules/dominio/gastos/{logic,view,index}.js`, `tests/unit/{ingresos,gastos}.test.js`, `modules/ui/bootstrap.js`, `index.html` - ingresos (`ingresosActivos`, `calcularIngresoMensual`, frecuencias mensual/quincenal/semanal/diario); gastos (`gastosMes`, `totalGastosMes`, `gastosPorCategoria`, `detectarHormigas`); bento `#ingresos-mes` + `#gastos-mes` actualizado en `updSaldo`; modales con formularios validados; 64 tests entre los dos dominios.

### Fase 7 - Tesorería (2026-05-12)

- **feat(dominio)** - `632a0fe` · `modules/dominio/tesoreria/{logic,view,index}.js`, `tests/unit/tesoreria.test.js`, `modules/ui/bootstrap.js`, `index.html`, `eslint.config.js` - `cuentasActivas()`, `calcularTotalCuentas()`, `_iconoPorBanco()`; lista de cuentas con saldo + empty state; saldo total en dashboard; 24 tests.

### Fase 6 - UI Shell (2026-05-12)

- **feat(ui)** - `1381bce` · `modules/ui/{bootstrap,actions,modales,onboarding}.js`, `index.html` - entry point completo: `bootstrap.js` (loadData → initAcciones → initShell → initRouter → initOnboarding → renderAll); `actions.js` con `registrarAccion()`/`dispatch()` + built-ins (theme-toggle, modal-open, modal-close); `modales.js` factory con `abrirModal()` (trapFocus), `cerrarModal()` (releaseFocus), `resetModal()`; onboarding stub (Fase 13 completa el wizard); eliminado `events.js` legacy.

### Fase 5 - Infra (2026-05-12)

- **feat(infra)** - `6f8a786` · `modules/infra/{utils,render,a11y,crud}.js`, `tests/unit/{utils,crud}.test.js` - `f()` (formato COP), `hoy()`, `fechaLegible()`, `dialogo()`; `renderSmart()`, `updSaldo()`, `updateBadge()`, `renderAll()`, `registrarRender()`; `announce()`, `trapFocus()`, `releaseFocus()`; CRUD genérico `guardar()`/`editar()`/`eliminar()` sobre `S`; 34 tests.

### Fase 4 - Core JS (2026-05-12)

- **feat(core)** - `4ca1adc` · `modules/core/{state,storage,constants}.js`, `tests/unit/{state,storage}.test.js` - constantes financieras CO (SMMLV, UVT, tasa usura Q1-2026, GMF, catálogos bancos); singleton `S` schema v1 + `createInitialState()` + EventBus pub/sub; `loadData()` con migración v1 idempotente; `save()` debounced 200ms; 24 tests (incluye round-trip, debounce, corrupción).

### Fase 3 - HTML Shell + Router (2026-05-11)

- **feat(shell)** - `91246ab` · `index.html`, `modules/infra/router.js`, `modules/ui/shell.js`, `modules/ui/events.js` - shell con landmarks semánticos (`nav`, `main`); sidebar con 7 secciones + footer (theme toggle + ajustes); 8 secciones `<section>` listas para dominios; 4 modales scaffold; PWA meta tags; hash routing; tema persistente; delegación `data-action`; soporte Escape.

### Fase 2 - Design System + CSS (2026-05-10)

- **feat(css)** - `b570afc` · `styles/{tokens,reset,base,components,layout,modals,themes,a11y,responsive,utils,main}.css`, `docs/DESIGN_SYSTEM.md` - design system completo: tokens (paleta, tipografía, espaciado, radii, sombras), reset cross-browser, base con focus visible, `.btn`/`.card`/`.input`/`.chip`/`.badge`/`.list-item`, shell + sidebar + Bento Grid, modales con animaciones, modo oscuro/claro, `prefers-reduced-motion`, breakpoints 1440/1024/768/480/360, helpers `.sr-only`; importado con `@layer` en orden estricto.

### Fase 1 - Esqueleto y documentación (2026-05-10)

- **chore** - `eb2b3ab` · estructura de carpetas, `package.json` con devDeps (vitest, eslint, prettier, happy-dom), `.gitignore`, `.prettierrc`, `eslint.config.js`, `.editorconfig`, `README.md`, `docs/{ARCHITECTURE,ROADMAP,TASKS,CHANGELOG,CONTRIBUTING,IA_CONTEXT}.md`, `docs/DECISIONS/001-no-build-step.md`, `index.html` + `styles/main.css` stub, `vitest.config.js`, `tests/setup.js`.

---

## Convención de entradas

Cada entrada agrupa por fase/release y dentro lista commits con:
- **tipo(área)** - `commit_hash` · `archivos tocados` - descripción de qué cambió.

Tipos: `feat` (nueva funcionalidad), `fix` (bug), `refactor` (sin cambio funcional), `test`, `docs`, `chore` (config/build), `style` (formato).
