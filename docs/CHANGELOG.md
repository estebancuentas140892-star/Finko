# Changelog - Finko Claude

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se elimina del ROADMAP/TASKS y se agrega aquí.

---

### feat(K.4): datos de renta manuales (3 criterios medibles) · 2026-06-07

Registro manual opcional en Configuración para los 3 criterios de renta que el monitor de K.3 no puede derivar de los datos de Finko: ingresos brutos, consumos con tarjeta de crédito y consignaciones. Al registrarlos, el monitor de Análisis los incluye (valor + barra + estado) y deja de mostrar "Sin datos en Finko". Schema v9 → v10. SW v113 → v114. 1129/1129 tests verdes (16 nuevos).

**Decisiones de diseño:** (1) los 3 criterios se hacen registrables, no solo los 2 del título original: dejar ingresos brutos como único "Sin datos" sería inconsistente y ese es el disparador de renta más común. (2) Los valores se kean por año (`config.datosFiscales[anio]`): nunca quedan obsoletos al cambiar de año y el monitor siempre refleja el año correcto. (3) Campo vacío = no provisto = sigue "Sin datos"; un 0 escrito = cero medido real (se distingue por presencia de la clave).

- **`modules/core/state.js`:** typedef `DatosFiscalesAnio` + `Config.datosFiscales` (Record keado por año). `createInitialState()` incluye `config.datosFiscales: {}`. `_version` 9 → 10.
- **`modules/core/storage.js`:** `SCHEMA_VERSION` 9 → 10. Migración v9 → v10: añade `config.datosFiscales = {}` si falta; normaliza valores corruptos (array) a objeto; preserva config previo.
- **`modules/dominio/analisis/logic.js`:** `calcularEstadoRenta` lee `s.config.datosFiscales[anio]`. Helpers `provisto`/`valorManual`/`tipManual`: un criterio pasa a medible solo si su clave está presente y es número finito >= 0. Tips actualizados para apuntar a Configuración cuando faltan, o indicar "registraste manualmente" cuando hay valor.
- **`modules/dominio/config/view.js`:** `_renderDatosRenta()` nueva: sección "🧮 Datos de renta (año)" con 3 inputs numéricos opcionales prellenados con los valores del año. Import de `hoy`. Insertada tras "Perfil fiscal".
- **`modules/dominio/config/index.js`:** handler `submit` de `#form-datos-fiscales`: guarda solo los campos no vacíos en `S.config.datosFiscales[anio]`; si todos quedan vacíos, elimina la entrada del año. Import de `hoy`.
- **`service-worker.js`:** v113 → v114.
- **`tests/unit/storage.test.js`:** 5 tests de migración v9 → v10 (agrega vacío, preserva perfilFiscal/notificaciones, crea config si falta, idempotente en v10, normaliza array corrupto).
- **`tests/unit/analisis.test.js`:** 11 tests de datos manuales (cada criterio se vuelve medible, sin datos sigue sin-datos, 0 explícito medido, 85% cerca, supera + nudge high, otro año no afecta, negativo ignorado, tip cambia, derivados intactos).
- **`tests/unit/state.test.js`:** test de `_version` actualizado de 9 a 10.

---

### feat(K.3): monitor de topes de renta en Análisis · 2026-06-07

Card "Estado de tu renta" en el panel de Análisis: los 5 criterios de obligación de declarar renta de persona natural, con su tope calculado en vivo (`N × UVT`) y el valor actual cuando Finko puede medirlo. Nudges preventivos al 80% (cerca) y al 100% (supera). Sin schema changes. SW v112 → v113. 1113/1113 tests verdes (25 nuevos).

**Decisión del gap de datos (Opción A, honestidad explícita):** de los 5 criterios, solo 2 son medibles con datos reales de Finko (patrimonio bruto = saldos de cuentas activas + inversiones; consumos totales = gastos del año). Los otros 3 se muestran con su tope para referencia pero con badge "Sin datos en Finko": ingresos brutos (el dominio `ingresos` ya no existe desde v8.8), consumos con tarjeta de crédito (`TIPOS_CUENTA` no la distingue) y consignaciones (sin stream de depósitos). Inventar esos valores violaría el principio de encuadre orientativo de la sección K. El registro manual queda como K.4 si surge demanda.

- **`modules/core/constants.js`:** `TOPES_RENTA_UVT` (mapa de los 5 criterios en múltiplos de UVT: ingresos 1.400, patrimonio 4.500, consumos 1.400, tarjeta 1.400, consignaciones 1.400) y `UMBRAL_ALERTA_RENTA` (0,80). Los topes en pesos se derivan en vivo de `UVT` para que actualizar la UVT del año recalcule todo solo.
- **`modules/dominio/analisis/logic.js`:** 4 funciones puras nuevas exportadas. `patrimonioBruto(cuentas, inversiones)` (saldos activos + invertido, defensiva ante null). `totalGastosAnio(gastos, anio)` (suma de gastos del año, ignora montos inválidos). `calcularEstadoRenta(state, anio)` (orquestador: devuelve los 5 criterios con tope, valor, porcentaje, estado y tip; estados `sin-datos`/`ok`/`cerca`/`supera`). `detectarNudgesRenta(estadoRenta, perfilFiscal)` (nudges `high`/`medium` por criterio disparado; nudge `info` extra si `declaranteObligado` y no hay otros). Imports nuevos de `calcularTotalInvertido` y de las constantes.
- **`modules/dominio/analisis/view.js`:** `_renderEstadoRenta(anio)`, `_renderCriterioRenta(c)` y `_renderNudgeRenta(n)` privadas. Card insertada entre `_renderRecomendacionFiscal()` y `_renderPatrimonio()`. Reusa clases `.nudge`, `.progress`, `.progress-bar--score-*` y `.analisis__section` existentes.
- **`styles/components/analysis.css`:** bloque `.renta-criterios` (grid responsive 1→2 col) + `.renta-criterio*` (card, head, label, badge por estado, valor, tope, tip). Solo tokens `var(--fk-*)`.
- **`service-worker.js`:** v112 → v113.
- **`tests/unit/analisis.test.js`:** 25 tests nuevos. 3 de `patrimonioBruto` + 4 de `totalGastosAnio` + 11 de `calcularEstadoRenta` (orden de criterios, topes derivados de UVT, sin-datos para los 3 no medibles, ok/cerca/supera para patrimonio, medición de consumos, forma del objeto) + 7 de `detectarNudgesRenta` (vacío, medium, high, sin-datos sin nudge, declarante info, declarante sin override, input inválido, forma del nudge).

---

### feat(K.2): perfil fiscal en Configuración + recomendación en Análisis · 2026-06-07

Schema v8 → v9. Sección "Perfil fiscal" en Configuración con 3 preguntas opcionales (IVA, contabilidad, declarante DIAN). Recomendación contextual permanente en Análisis cuando algún flag es afirmativo. SW v111 → v112. 1088/1088 tests verdes (4 nuevos: migración v8 → v9).

- **`modules/core/state.js`:** typedef `PerfilFiscal` (ivaResponsable, obligadoContabilidad, declaranteObligado). `Config` ampliada con campo `perfilFiscal` opcional. `createInitialState()` incluye `config.perfilFiscal` con los tres flags en false. `_version` inicial 8 → 9. JSDoc actualizado a schema v9.
- **`modules/core/storage.js`:** `SCHEMA_VERSION` 8 → 9. Migración v8 → v9: añade `config.perfilFiscal` con defaults si no existe; preserva `notificaciones` y cualquier campo previo; crea `config` si faltaba.
- **`modules/dominio/config/view.js`:** función `_renderPerfilFiscal()` nueva: sección `config-section` con 3 checkboxes + botón "Guardar perfil fiscal". Se inserta entre "Tu perfil" y "Apariencia" en `renderPanelConfig()`.
- **`modules/dominio/config/index.js`:** handler `submit` para `#form-perfil-fiscal` en `_inyectarPanel()`. Lee FormData, actualiza `S.config.perfilFiscal.*`, llama `save()` + `renderPanelConfig()` + `announce()`.
- **`modules/dominio/analisis/view.js`:** función `_renderRecomendacionFiscal()` nueva: lee `S.config?.perfilFiscal`, si algún flag es true muestra nudge-info con lista de motivos y enlace "Editar perfil fiscal" → `#config`. Se inserta entre `_renderScoreSalud` y `_renderPatrimonio` en `renderAnalisis()`.
- **`service-worker.js`:** v111 → v112.
- **`tests/unit/storage.test.js`:** describe "Migración v8 → v9" con 4 tests: agrega perfilFiscal en false, preserva notificaciones, crea config si falta, idempotente en v9.
- **`tests/unit/state.test.js`:** test `_version = 8` corregido a `_version = 9`.

---

### feat(K.1): asistencia 4x1000 (GMF) · 2026-06-07

Indicador de costo estimado del 4x1000 en Tesorería + nudge preventivo con sugerencia de exención. Sin schema changes: `Cuenta.aplica4x1000` ya existía. Hint del formulario mejorado con contexto de cuentas exentas (nómina, AFC). SW v110 → v111. 1084/1084 tests verdes (12 nuevos).

- **`modules/dominio/tesoreria/logic.js`:** import de `GMF` desde `constants.js`. Dos funciones nuevas exportadas: `calcularCostoGMF(gastos, cuentas, anio, mes)` (suma gastos del mes desde cuentas con `aplica4x1000 = true`, calcula el 0,4% como proxy del gravamen) y `detectarNudgeGMF(gmfData)` (devuelve objeto de nudge o null cuando `costoGMF > 0`).
- **`modules/dominio/tesoreria/view.js`:** import de `hoy` y las 2 funciones de logic.js. `renderGMFIndicador()` exportada: lee `S.gastos` + `S.cuentas`, llama `calcularCostoGMF` y `detectarNudgeGMF`, renderiza en `#tesoreria-gmf`. `_renderNudgeGMF()` privada: compone el HTML del nudge con título "4x1000 estimado este mes: $X" y descripción con sugerencia de exención. Hint del checkbox de 4x1000 actualizado: "Las cuentas de nómina y AFC están exentas por ley: si la tuya lo es, deja esta opción desmarcada."
- **`modules/dominio/tesoreria/index.js`:** import de `renderGMFIndicador`. `_renderTodo()` llama `renderGMFIndicador()` tras `renderListaCuentas()`.
- **`index.html`:** `<div id="tesoreria-gmf">` añadido entre `#lista-tesoreria` y el simulador laboral.
- **`service-worker.js`:** v110 → v111 (archivos de tesorería + index.html modificados).
- **`tests/unit/tesoreria.test.js`:** 12 tests nuevos. Fixtures `cuentaConGMF`, `cuentaSinGMF`, `gastoDesde`. 8 tests de `calcularCostoGMF` (sin GMF, sin gastos, cálculo exacto, otro mes, otra cuenta, sin cuentaId, múltiples, vacíos) + 4 tests de `detectarNudgeGMF` (null cuando 0, null con input nulo, forma del nudge, valores expuestos).

---

### docs(roadmap): plan de Asistencias Inteligentes (K.1-K.3) · 2026-06-07

Análisis de los indicadores financieros colombianos y documentación del plan estratégico por fases para convertir calculadoras en automatizaciones contextuales. Detecta discrepancia en el CSV de referencia (patrimonio bruto calculado con UVT 2025, no 2026) y la resuele con el principio `N × UVT_VIGENTE`. Test count actualizado de 1078 a 1072 en ROADMAP y HANDOFF (6 tests de usura eliminados en la tarea anterior).

- **`docs/ROADMAP.md`:** sección K nueva (K.1 Asistencia 4x1000, K.2 Perfil fiscal, K.3 Monitor de topes de renta), actualización de Estado actual (R series + K candidata), corrección de test count 1078 → 1072 en Estado actual y tabla de Métricas.
- **`docs/HANDOFF.md`:** nueva entrada en "Qué se hizo recientemente", sección "Qué sigue" actualizada con K.1 como próxima tarea, corrección de test count 596 → 1072 en comandos rápidos, R2 rotado fuera de las últimas 5 entradas.
- **`docs/CHANGELOG.md`:** esta entrada.
- **`docs/TASKS.md`:** "Próxima tarea sugerida" actualizada con K.1.

---

### refactor(legal): eliminar la tasa de usura (ADR 004) · 2026-06-07

Decisión de producto: se elimina por completo el concepto de tasa de usura. Certificada cada trimestre por la SFC, exigía 4 actualizaciones al año para alimentar un único hint informativo. El mantenimiento se enfoca en indicadores anuales (SMMLV, UVT, auxilio) y estables (GMF). Refina el ADN regla #12. 1072/1072 tests verdes (se eliminaron los 6 tests de `clasificarTasaCredito`).

- **`docs/DECISIONS/004-eliminar-tasa-usura.md`:** ADR nuevo que documenta la decisión, las 3 alternativas consideradas (referencia aproximada / eliminar / congelar) y por qué se eligió eliminar.
- **`modules/core/constants.js`:** eliminados la tabla `USURA_POR_PERIODO`, la función `tasaUsuraVigente()`, los exports `TASA_USURA` y `PERIODO_USURA`, y el alias deprecado `TASA_USURA_Q2_2026`. Header del archivo actualizado (una sola tabla histórica anual).
- **`modules/infra/financiero.js`:** eliminada `clasificarTasaCredito()` (clasificaba una tasa en bandas contra la usura; no se consumía en la UI, solo en tests) y su import de `TASA_USURA`. Header del archivo actualizado.
- **`modules/dominio/compromisos/views/formularios.js`:** el hint del formulario de deuda con entidad ya no menciona la usura; ahora orienta: "Ingresa la tasa anual efectiva (% EA) que te cobran. La encuentras en tu extracto, contrato o la app del banco."
- **`tests/unit/calculadoras.test.js`:** eliminado el bloque `describe('clasificarTasaCredito()')` (6 tests) y los imports `clasificarTasaCredito` / `TASA_USURA`.
- **`CLAUDE.md`:** regla #12 refinada (SMMLV/UVT/auxilio anuales; indicadores de alta frecuencia fuera del alcance).
- **`service-worker.js`:** v109 → v110.

---

### refactor(js): R5 - partir compromisos/view.js en 6 sub-modulos · 2026-06-07

`modules/dominio/compromisos/view.js` (1075 líneas) dividido en 6 archivos bajo `views/`, todos menores a 300 líneas. `view.js` convertido en barrel de re-exports preservando los 12 exports públicos sin cambios en `index.js`. SW v108 → v109. Cero cambios funcionales. 1078/1078 tests verdes.

- **`modules/dominio/compromisos/view.js`** (23 líneas): barrel con `export ... from './views/*.js'` para los 12 exports públicos.
- **`modules/dominio/compromisos/views/alertas.js`** (116 líneas): `renderAlertaFijosSinPagar` + `renderAlertaDeudasDurmiendo` (nudges G.1 del dashboard).
- **`modules/dominio/compromisos/views/lista.js`** (176 líneas): `renderListaCompromisos` + helpers privados de item y empty state. Lee `getEstrategiaUI()` para aplicar el orden estratégico.
- **`modules/dominio/compromisos/views/formularios.js`** (229 líneas): `renderFormAbono` + `renderChooserCompromiso` + `renderFormDeuda` (3 modales del dominio).
- **`modules/dominio/compromisos/views/estrategia.js`** (281 líneas): aloja el singleton `_uiEstrategia` + `setEstrategiaUI` / `getEstrategiaUI` + `renderEstrategiaPago` + helpers de cards seleccionables, detalle, no-aplica y acordeón extra.
- **`modules/dominio/compromisos/views/estrategia-impacto.js`** (183 líneas): `renderImpactoAvalancha` + `renderImpactoBolaNieve` + `formatearDuracion` + comparativa Avalancha vs BN (funciones puras).
- **`modules/dominio/compromisos/views/dashboard.js`** (162 líneas): `renderPanelVencidos` + `renderPanelPrioridades` + `_hoyISOLocal` helper.
- **`service-worker.js`:** v108 → v109; 6 nuevos assets añadidos a CORE_ASSETS.

---

### refactor(css): R4 - partir components.css en 8 sub-modulos · 2026-06-07

`styles/components.css` (4612 líneas) dividido en 8 sub-módulos bajo `styles/components/`. Cero cambios visuales. 1078/1078 tests verdes.

- **`styles/components.css`:** convertido en barrel file con 8 `@import` al directorio `styles/components/`.
- **`styles/components/buttons.css`** (185 líneas): BOTONES + CARDS.
- **`styles/components/forms.css`** (489 líneas): ICONOS SVG + INPUTS / FORMULARIOS + QUICK ADD + QUICK TOAST.
- **`styles/components/atoms.css`** (307 líneas): CHIPS Y BADGES + LIST ITEMS + EMPTY STATE + SPINNER + DIVISOR + PROGRESS BAR + TOGGLE.
- **`styles/components/analysis.css`** (1020 líneas): PANEL DE ANÁLISIS completo (bento, métricas del mes, salud financiera, presupuesto por sobre, fondo de emergencia J.1, inversión J.2, gastos por categoría, patrimonio neto).
- **`styles/components/charts.css`** (766 líneas): GRÁFICOS sparkline + donut + IMPORT CSV + COMPROMISOS chooser + ESTRATEGIA DE PAGO.
- **`styles/components/nudges.css`** (387 líneas): SISTEMA DE NUDGES (5 niveles) + LOGRO TOAST + confetti + BANK AVATAR/PICKER + DOMINIO BADGES.
- **`styles/components/domain.css`** (740 líneas): CALCULADORAS + HERRAMIENTA-INLINE + SIM-GATE + INGRESOS-CARD + MES-NAV + FILTROS-BAR + ABONO + HERO SOLO + VENCIDOS + PRIORIDADES + BALANCE-TIRA.
- **`styles/components/config.css`** (752 líneas): CONFIGURACION + INSTALL BANNER + INSTALL IOS + AGENDA/CALENDARIO.
- **`service-worker.js`:** v107 → v108; 8 nuevos assets añadidos a CORE_ASSETS.

---

### refactor(css): R3 - tokenizar px en components.css (34 valores) · 2026-06-07

34 valores hardcodeados de `px` en `styles/components.css` reemplazados por tokens `--fk-space-*` y `--fk-radius-*`. Cero cambios en JS/HTML. 1078/1078 tests verdes.

- **`styles/components.css`:** propiedad `min-height`: 40px × 2 → `space-10` (btn base + input), 32px × 1 → `space-8` (btn-sm), 48px × 2 → `space-12` (btn-lg + cal-day mobile). Propiedad `min-width`: 40px → `space-10` (btn-icon), 32px → `space-8` (btn-icon.btn-sm inline). Propiedad `width/height`: 20px × 4 → `space-5` (badge + spinner), 32px × 6 → `space-8` (spinner-lg inline + bank-avatar + cal-detail__close + cal-detail__icon mobile), 40px × 2 → `space-10` (install-ios__num), 48px × 4 → `space-12` (fondo-hero__icon + inversion-hero__icon), 12px × 3 → `space-3` (score-card__bar height + chart-legend__swatch w/h), 16px × 2 → `space-4` (sim-gate__radio w/h), 8px × 1 → `space-2` (.progress bar height). `gap: 4px` → `space-1` (cal-grid mobile). `margin: 4px 0 0` → `space-1 0 0` (inversion-item__proy). `border-radius: 999px` → `radius-full` (chip pill).
- **Preservados intencionalmente como px:** toggle switch 44px×24px outer + 16px×16px thumb (proporciones fijas, no hay token de 44px), touch targets 44px, valores sin token exacto (26px, 28px, 36px, 56px, 60px, 80px, 96px), micro-separadores visuales (2px, 3px), transforms de animación, dots de calendario (5px, 6px), `letter-spacing: 0.5px`.

---

### refactor(js): R2 - centralizar esc() y genId, eliminar 18 duplicados · 2026-06-07

Dos helpers duplicados eliminados. 1 función exportada en `infra/utils.js`, 1 función exportada en `infra/crud.js`. 1078/1078 tests verdes.

- **`modules/infra/utils.js`:** nueva exportación `esc(str)`: escape HTML, única fuente de verdad.
- **`modules/infra/crud.js`:** `genId()` promovida de privada a `export function genId()`.
- **16 archivos** (`dominio/*/view.js`, `logros/index.js`, `infra/form-errors.js`, `infra/svg.js`, `ui/confirm.js`): importan `{ esc as _esc }` desde `infra/utils.js` (alias preserva todos los call-sites internos sin tocar); se elimina la función `_esc` local en cada uno. Cero cambios en templates HTML generados.
- **`modules/dominio/ahorro/index.js`:** importa `{ genId }` desde `infra/crud.js`; se elimina la función `_genId` local (copia exacta de la de `crud.js`); se reemplaza el único call-site `_genId()` → `genId()`.

---

### refactor(css): R1 - cerrar fugas de color, unificar paleta a tokens · 2026-06-07

40 valores de color hardcodeados reemplazados por tokens `--fk-*` en 4 archivos CSS. Cero cambios en JS ni HTML. 1078/1078 tests verdes.

- **`styles/tokens.css`:** nuevo token `--fk-bg-overlay: rgba(0, 0, 0, 0.65)` en la sección de fondos.
- **`styles/modals.css`:** overlay background → `var(--fk-bg-overlay)` (1 cambio).
- **`styles/layout.css`:** 10 colores reemplazados. Gradiente bento-accent (verde viejo `#00dc82` → `var(--fk-accent)`), filtro hero-guia, 8 glows de iconos por dominio (`var(--fk-dom-*)`). Corrección de drift: analisis usaba `#00e5cc` (token actual `#2fd2bf`), personales usaba `#ff4eb8` (token actual `#f06fc2`). Comentario de contraste WCAG actualizado a valores reales del token.
- **`styles/components.css`:** 28 colores reemplazados. btn-danger, card-*, chip-* (4 variantes), field-invalid y form-errors (6 fallbacks `#ef4444` eliminados: valor incorrecto, token `--fk-danger` siempre existe), badge--warn (3 fallbacks `#fbbf24` eliminados: valor incorrecto, token `--fk-warning` siempre existe), select SVG arrow (color muted antiguo `#6b7490` → `#888fa6`), empty-state icon, envelope alerta/excedido, patrimonio-hero gradientes, import-error (fallback `rgba(239,68,68,0.1)` incorrecto eliminado), import-row--error, calc-result highlight/deduct, chip--active (`#fff` → `var(--fk-text-on-bold)`), config-section warn, config-danger, vencidos-card (nombres de tokens corregidos: `--fk-color-danger` / `--fk-color-warning` → `--fk-danger` / `--fk-warning` / `--fk-amber`), balance-tira.

---

### test(e2e): C2.2+C2.3 - realinear suites E2E rotas (smoke + estrategia-pago) · 2026-06-06

Saldada la deuda técnica de 26 tests pre-existentes en rojo. Cero cambios en código de app.

- **`tests/e2e/smoke.test.js` (C2.2, 19 tests):** 6 `waitForSelector('#saldo-total')` cambiados a `waitForSelector('#sec-dash.active')` en los 4 `beforeEach` afectados + 2 puntos internos de test. Dashboard test 1: aserción actualizada a `#sec-dash.active` + `#hero-guia-saldo`. Dashboard test 2: nueva lógica con `addInitScript` para sembrar una cuenta de saldo 0 antes de re-navegar. Causa raíz: la guía I.1 agrega atributo `hidden` a `#saldo-total` cuando no hay cuentas, y `waitForSelector` (estado visible por defecto) esperaba indefinidamente.
- **`tests/e2e/estrategia-pago.test.js` (C2.3, 7 tests):** tests 1-7 actualizados al rediseño de la card de estrategia (v7+). Eliminados: `.estrategia-card__paso` (lista de pasos), `.estrategia-card__total-valor`, `.estrategia-card--hint`, `.estrategia-card__orden`, texto "Estrategia de pago de deudas". Reemplazados por: click en pick card (`[data-action="elegir-estrategia"]`), `.estrategia-card__metrica-valor--info` (deuda prioritaria), `.estrategia-card__metrica-valor--danger` (intereses totales), abrir acordeón antes de rellenar `#estrategia-extra`, `.estrategia-card__placeholder` (1 deuda), `.estrategia-card-pick` (ausencia = sin pick cards). Test 8 (0 deudas) ya pasaba y no requirió cambio.

57/57 verde en la suite completa (1 worker y 5 workers en paralelo).

---

### test(e2e): smoke de Ahorro e Inversión (cobertura E2E de la Parte 4) · 2026-06-06

Nueva suite `tests/e2e/ahorro-inversion.test.js` (9 tests) que cubre los 2 dominios de la Parte 4, antes con cobertura unit + verificación manual pero sin smoke E2E. Solo se agregó el archivo de test: cero cambios en código de app.

- **Ahorro (4 tests):** empty state desde el dashboard, activar fondo (modal → form → hero con monto base), registrar aporte (historial + hero suma base + aporte), persistencia tras `reload`.
- **Inversión (5 tests):** empty state, alta (lista + hero con total), proyección al vencimiento de un CDT en el item (retención 7%: $10.000.000 al 10% EA 12m → $10.930.000), eliminar (vuelve al empty state), persistencia tras `reload`.
- **Detalle técnico:** el seed `estadoBaseV8` escribe `fk_v1` solo si no existe, porque `addInitScript` corre en cada carga (incluido `reload`) y, sin la guarda, re-escribía el estado vacío y borraba lo creado por el test. Tras `reload` se espera la sección activa, no `#saldo-total` (vive en el dashboard inactivo).

9/9 verde en aislado y en la corrida completa en paralelo (5 workers). **Deuda pre-existente detectada (NO de esta tarea):** la corrida completa muestra 26 fallos previos: 19 en `smoke.test.js` (esperan `#saldo-total` visible, oculto por la guía I.1 sin cuentas) y 7 en `estrategia-pago.test.js` (card de estrategia rediseñada con pestañas). Anotados como deuda; candidata #1 del roadmap.

---

### feat(inversion): J.2c - nudges educativos de inversión (cierra Parte 4) · 2026-06-06

Tercer y último slice de J.2. **Cierra la Parte 4 (Crecer: Ahorro + Inversión).** Nudges educativos sobre el portafolio. Sin cambio de schema.

- **`inversiones/logic.js`** (`detectarNudgesInversion`, 14 tests): función pura que recibe inversiones + `contexto` con el estado del fondo (el caller lee `S.ahorro`; no se importa el dominio Ahorro, ADN #10). Prioridad: (1) "fondo primero" (high sin fondo / medium incompleto), (2) concentración (un tipo ≥ 70% con 2+ holdings), (3) retorno variable (≥ 50% sin tasa/plazo), (4) refuerzo positivo (fondo completo + diversificado). Umbrales exportados.
- **`inversiones/view.js`**: `_renderNudges` (el de fondo enlaza a `#ahorro`) + `_renderTipHorizonte` (tip evergreen de largo plazo).
- **`styles/components.css`**: `.inversion-nudges` + `.inversion-tip`. Reutiliza `.nudge*`. **`service-worker.js`**: v106 → v107.

1078/1078 unit + integración verdes. Verificado en navegador (3 nudges en orden + tip). **Parte 4 completa: Ahorro (J.1a-c) + Inversión (J.2a-c).**

---

### feat(inversion): J.2b - proyección al vencimiento + rentabilidad real del portafolio · 2026-06-06

Segunda entrega de J.2 (Inversión). Proyección de valor al vencimiento por holding y rentabilidad real del portafolio. Sin cambio de schema: todo se calcula a partir de los datos ya capturados en J.2a.

- **`inversiones/logic.js`** (5 funciones nuevas, 15 tests): importa de `infra/financiero.js` (capa infra, no dominio). `esProyectable` (tasa + plazo + monto > 0), `proyectarInversion` (CDT vía `calcularCDT` con retención 7%; Fondo/Acciones/Cripto/Otro vía `calcularInteresCompuesto`, crecimiento compuesto EA sin retención), `proyectarPortafolio` (no proyectables cuentan a su monto), `tasaPromedioPonderada` (EA ponderada por monto), `calcularRentabilidadRealPortafolio` (Fisher vía `calcularRentabilidadReal`).
- **`constants.js`**: `INFLACION_OBJETIVO = 0.03` (meta puntual Banco de la República, con fuente + nota de revisión, ADN #12).
- **`inversiones/view.js`**: card "Proyección al vencimiento" (valor proyectado, ganancia esperada con color, nominal → real con inflación visible, nota de retorno variable). Proyección inline por holding. `_fmtTasa` redondea a 2 decimales.
- **`styles/components.css`**: `.inversion-proy*`, `.inversion-item__proy*`, signos `.is-pos`/`.is-neg` locales. **`service-worker.js`**: v105 → v106.

1064/1064 unit + integración verdes. Verificado en navegador (CDT + FIC + Bitcoin: proyección $8.867.550, nominal 10,5% → real 7,28%). Sigue: J.2c (educación/nudges).

---

### feat(inversion): J.2a - fundación del dominio Inversión + portafolio real · 2026-06-06

Primera entrega de J.2 (Inversión). Funda un nuevo dominio con migración v7→v8, lógica pura testeada, sección con hero de total invertido, lista de holdings, modal de alta y nav. La proyección de valor y rentabilidad real llegan en J.2b.

- **Schema v7→v8:** nueva colección top-level `inversiones: [{id, tipo, nombre, monto, tasaEA, plazoMeses, fechaInicio, fechaCreacion}]`. Migración idempotente (agrega `inversiones: []` si falta). 3 tests de migración.
- **`inversiones/logic.js`** (puro, 43 tests): `TIPOS_INVERSION` (CDT, Fondo, Acciones, Cripto, Otro), `calcularTotalInvertido`, `calcularPorTipo` (desglose con %), `ordenarInversionesPorMonto`, validación + normalización de los 6 campos (tasa EA y plazo opcionales: 0 válido para rentabilidad variable). Respeta ADN #10.
- **`inversiones/view.js`**: empty state con CTA + tip (fondo de emergencia primero), `inversion-hero` (total + conteo + desglose por tipo), lista de holdings (tipo/tasa/plazo/fecha + eliminar), `renderFormInversion`.
- **`inversiones/index.js`**: usa `crud.js` (`guardar`/`eliminar`, colección top-level). Acciones `inversion-nueva`, `inversion-eliminar`. Re-render en `state:change` + hashchange.
- **HTML/CSS**: sprite `i-inversion` (trending-up), nav en grupo "Crecer" (sidebar + menú Más), sección `sec-inversion` + modal, router, token `--fk-dom-inversion: #4db8d8`, estilos `.inversion-hero*`/`.inversion-lista*`/`.label__opt`. Bootstrap `initInversiones`. SW v104→v105.

1049/1049 unit + integración verdes. Verificado en navegador (empty state, alta, hero, lista). Sigue: J.2b (proyección + rentabilidad real).

---

### feat(ahorro): J.1c - Score de Salud 4 factores + logro fondo-emergencia + nudge analisis · 2026-06-06

Tercera y última entrega de J.1 (Ahorro). Integra el fondo de emergencia con el Score de Salud y el sistema de logros. **J.1 completa.**

- **`logros/logic.js`**: nuevo logro `fondo-emergencia` ("Red de seguridad", 🛡️). Eval lee `s.ahorro?.fondoEmergencia?.completado === true`. 5 tests nuevos.
- **`ahorro/index.js`**: nueva `_actualizarCompletado()` recalcula y persiste el flag `completado` en `S.ahorro.fondoEmergencia` (vía `calcularMontoTotalFondo` + `calcularObjetivoFondo` + `calcularProgresoFondo`). Se invoca antes de cada `save()` en las 4 mutaciones del fondo (guardar, desactivar, agregar y eliminar aporte). Import ampliado a las 3 funciones de cálculo.
- **`analisis/logic.js`**: `calcularScoreSalud(resumen, ahorroData = null)` con 2do parámetro opcional. Con `ahorroData`: 4 factores (Deuda 30%, Liquidez 25%, Control 20%, Ahorro 25%; ahorro = 100 completado / 50 activo / 0 sin fondo). Sin `ahorroData`: comportamiento legacy 3 factores (40/35/25). Backward-compat total. 8 tests nuevos.
- **`analisis/view.js`**: `_renderScoreSalud` lee `S.ahorro.fondoEmergencia`, pasa `ahorroData`, muestra 4ta card (🛡️ Ahorro). Nudge con CTA a `#ahorro` si no hay fondo activo.
- **`analisis/index.js`**: `'ahorro'` agregado a `SECCIONES_OBSERVADAS` (score se actualiza en vivo).
- **`service-worker.js`**: v103 → v104.

1003/1003 unit + integración verdes. **Cierra la fase J.1 (Ahorro). Sigue: J.2 (Inversión).**

---

### feat(ahorro): J.1b - hábito de ahorro: aportes + historial + tasa de ahorro + "págate primero" · 2026-06-06

Segunda entrega de J.1 (Ahorro). Añade el ciclo de registro de aportes sobre el fondo de emergencia, el compromiso mensual y el nudge de tasa de ahorro.

- **`ahorro/logic.js`**: 8 funciones nuevas (J.1b): `calcularTotalAportes`, `calcularMontoTotalFondo`, `ordenarAportesPorFecha`, `validarMontoAporte`, `validarFechaAporte`, `normalizarMontoAporte`, `validarCompromisoMensual`, `normalizarCompromisoMensual`. 25 tests nuevos.
- **`ahorro/view.js`**: hero usa `calcularMontoTotalFondo` (base + aportes). Nueva sección `ahorro-habito`: chip de compromiso mensual, lista de aportes ordenada desc, nudge de tasa de ahorro con 5 niveles (success/info/medium/high según porcentaje). Dos forms nuevos: `renderFormAporte` y `renderFormCompromisoMensual`.
- **`ahorro/index.js`**: `_calcularIngresosMensuales()`, `_calcularGastosEsteMes()`, `_calcularTasaAhorro()` (sin importar de otro dominio, ADN #10). 3 acciones nuevas: `ahorro-nuevo-aporte`, `ahorro-eliminar-aporte`, `ahorro-editar-compromiso`. EventBus re-render extendido a `ingresos` y `gastos` (para que el nudge de tasa actualice en vivo). `_genId()` local para aportes.
- **`styles/components.css`**: estilos `.ahorro-habito*` (~50 líneas).
- **`service-worker.js`**: v102 → v103.

990/990 unit + integración verdes. Pendiente: J.1c (nudges + integración con Score de Salud).

---

### feat(ahorro): Parte 4 - J.1a fundación del dominio Ahorro + fondo de emergencia · 2026-06-06

Primera entrega de J.1 (Ahorro). Funda el dominio con migración v6→v7, lógica pura testeada, sección con hero del fondo de emergencia, nav en "Crecer" e ícono SVG.

- **Schema v6→v7:** nuevo slice `S.ahorro` (`fondoEmergencia`, `aportes`, `compromisoMensual`). Migración idempotente y defensiva. 4 tests integración nuevos.
- **`ahorro/logic.js`** (puro): `calcularObjetivoFondo`, `calcularProgresoFondo`, `mesesDeColchon`, `calcularTasaAhorro`, validación/normalización. 30 tests unitarios.
- **`ahorro/view.js`**: empty state con preview, `fondo-hero` (monto + barra + meses cubiertos + faltante + banner). `renderFormFondo` para activar/editar.
- **`ahorro/index.js`**: calcula `gastosFijosMensuales` localmente desde S.compromisos sin importar de otro dominio (FACTOR_MENSUAL replicado, regla ADN #10). 3 acciones.
- **HTML/CSS**: sprite `i-ahorro`, sidebar grupo Crecer, menú Más con `--fk-dom-ahorro: #38c98c`, sección + modal, router + MAS_SECTIONS. SW v101→v102.
- **E2E**: 1 smoke nuevo (`Ahorro muestra empty state al navegar desde Dashboard`).

965/965 unit + integración verdes. Pendiente: J.1b (aportes + tasa de ahorro) y J.1c (nudges + Score).

---

### copy(tono): Batch 3 - tuteo completo en Metas, Presupuesto, Personales, Análisis, Config, Onboarding · 2026-06-06

23 textos convertidos. Tono neutral-profesional completo en toda la app (Batch 3 de 3).

- `metas/view.js`: 2 cambios. `presupuesto/view.js`: 5. `personales/view.js`: 3.
- `analisis/view.js`: 2. `config/view.js`: 9. `onboarding.js`: 2.
- `service-worker.js`: v100 → v101.

931/931 unit verdes. Refinamiento de tono cerrado en sus 3 batches.

---

### copy(tono): Batch 2 - tuteo completo en Mis cuentas, Gastos, Deudas + E2E · 2026-06-06

29 textos convertidos (voseo → tú, "plata" → "dinero") en los 3 dominios de uso diario.

- `tesoreria/view.js`: 5 textos (empty state, hints de 4x1000 y cuota de manejo).
- `gastos/view.js`: 7 textos (badge, empty states, form-empty, hint selector cuenta).
- `compromisos/view.js`: 17 textos (nudge, abono form, deuda form, estrategia de pago).
- `tests/e2e/navegacion-render.test.js`: 3 aserciones de `¿Dónde guardás tu plata?` actualizadas.
- `service-worker.js`: v99 → v100.

931/931 unit verdes. Batch 2 de 3 (chrome: done; dominios diarios: done; resto: Batch 3).

---

### copy(tono): refinamiento a voz neutral-profesional - Batch 1 · 2026-06-06

Tono pasa de informal-colombiano a neutral-profesional: voz "tú" (no voseo), "dinero" (no "plata"). Refina la regla 11 del ADN (espíritu intacto: lenguaje humano sin jerga).

- `docs/DECISIONS/003-tono-neutral-profesional.md`: ADR nuevo. `CLAUDE.md`: regla 11 actualizada.
- `index.html`: 13 textos del chrome ("Tu dinero disponible hoy", "¿Dónde tienes tu dinero?", etc.).
- `service-worker.js`: v98 → v99.

Batch 1 de N (chrome estático). Siguen los dominios. 931/931 unit verdes.

---

### feat(icons): Parte 3C.3 - ícono de acento del hero → SVG (3C completa) · 2026-06-06

Último slice de 3C. El hero "Tu plata disponible hoy" (💵) → SVG (`i-saldo`, $ en círculo, verde acento). Auditoría: era el único ícono de acento grande; el resto son datos de usuario o emojis cálidos que se conservan.

- `index.html`: símbolo `i-saldo` + hero → svg (preserva id y aria para render.js).
- `layout.css`: `.bento__icon.icon` 32px + tinte acento. `service-worker.js`: v97 → v98.

3C completa: UI chrome 100% SVG, emojis expresivos conservados. 931/931 unit verdes.

---

### feat(icons): Parte 3C.2 - íconos de acción (editar/borrar/cerrar/chevron) → SVG · 2026-06-06

Segundo slice de 3C. Íconos de acción a SVG (mismo sprite). Borrar pasa de X ambigua a papelera clara.

- `index.html`: 4 símbolos nuevos (`i-edit`, `i-trash`, `i-x`, `i-chevron-right`) + 14 botones cerrar + chevron quick-add.
- 7 views de dominio: editar (`i-edit`) en gastos/tesorería; borrar (`i-trash`) en 6 dominios; cerrar (`i-x`) en agenda y toast.
- `components.css`: íconos de acción a 18px. `service-worker.js`: v96 → v97.

No se tocó el `×` de "4×1000" ni las flechas inline en copy. 931/931 unit verdes.

---

### feat(icons): Parte 3C - migración híbrida de iconografía (nav emoji → SVG) · 2026-06-06

Migración híbrida: SVG para la navegación, emojis expresivos conservados (tono cálido del ADN). Sistema nuevo: sprite SVG inline (`<symbol>` + `<use>`, estilo Lucide MIT), vanilla sin build, color vía `.icon { stroke: currentColor }`.

- `index.html`: sprite de 11 símbolos + 18 reemplazos (nav-item + menu-mas).
- `components.css`: clase base `.icon`. `layout.css`: nav 22px. `modals.css`: menú "Más" 28px con tinte por dominio (`--fk-dom-*`).
- `service-worker.js`: `CACHE_NAME` v95 → v96.

Convención documentada en ARCHITECTURE.md. 931/931 unit verdes.

---

### feat(ux): empty state "Tu plata disponible hoy" + CTA moderno · 2026-06-06

UX #3 de 4. Hero del dashboard sin cuentas: ya no muestra un `$0` confuso. Empty state centrado con ícono, título, descripción y botón CTA pill verde "Agregar mis cuentas" (href: #tesoreria).

- `index.html`: IDs `hero-saldo-icon` y `hero-saldo-label`; `hero-guia-saldo` rediseñado.
- `render.js`: `updSaldo` oculta/muestra ícono, label y valor cuando `sinCuentas`.
- `layout.css`: clases `hero-guia__icon/title/desc/cta`, layout centrado, glow, pill CTA.

931/931 unit verdes.

---

### copy(ux): microcopy de formularios y empty states más claro · 2026-06-06

UX #2 de 4. Reemplazados términos técnicos (patrimonio neto, Balance del mes) y textos fríos por copy amigable y sin jerga. 5 archivos: agenda, compromisos, gastos, analisis, tesoreria. 931/931 unit verdes.

---

### style(forms): espaciado vertical entre campos de formularios · 2026-06-06

UX #1 de 4. Los `.form-group` quedaban pegados (0px entre grupos), rompiendo la jerarquía.

- `components.css`: `form:not(.config-form) .form-group:not(:first-child) { margin-top: space-5 }` (20px). `.config-form` gap space-4 → space-5. `.cuota-fieldset` margen space-2 → space-5.

Verificado en gasto-fijo, config y cuenta. 931/931 unit verdes.

---

### fix(css): app sin estilos en producción - @import descartados por orden · 2026-06-06

Bug crítico: la app cargaba sin CSS en móvil. En la Parte 2 los `@font-face` quedaron antes de los `@import` en `main.css`; la spec CSS descarta los `@import` que no preceden a toda otra regla, dejando 0 capas cargadas.

- `main.css`: `@import layer(...)` primero, `@font-face` después.
- `service-worker.js`: `CACHE_NAME` v94 → v95.

Preview: `importedSheetsLoaded: 10`, `totalImportedRules: 868`, body con tokens dark + Inter. 931/931 unit verdes.

---

### feat(ui): rediseño Parte 3B cont. - layout de card en 2 filas (mobile) · 2026-06-06

- `responsive.css`: grid 3 col + 2 filas en `< 540px` con `:has(.list-item__meta)`. Nombre completo en fila 1, monto en fila 2, botones top-right.
- `tesoreria/view.js`: saldo de `__action` a `__meta` para alinear con el patrón compartido. Grid aplica también a Mis cuentas.

Deudas, Mis cuentas y Gastos verificados en móvil 375px. 931/931 unit verdes.

---

### feat(ui): rediseño Parte 3B - escaneabilidad de cards de lista · 2026-06-06

Jerarquía visual en las cards `.list-item`. La escala tipográfica móvil ya estaba resuelta en `responsive.css` (no se tocó).

- **`styles/components.css`:** `.list-item__title` sin truncar (wrap natural). `.list-item__amount`/`.list-item__value` de `text-sm` a `text-base` (monto = ancla visual).
- **`modules/dominio/compromisos/view.js`:** card de deuda reestructurada: subtítulo "Cuota $X/mes · día N" + contexto "Tipo · tasa"; eliminada la línea "Saldo:" redundante.

931/931 unit verdes. Pendiente: layout de 2 filas para móvil (compactación total).

---

### feat(copy): rediseño Parte 3A.2 - renombres a lenguaje humano · 2026-06-06

- "Compromisos" -> "Deudas" (nav sidebar, menú Más, h1 de sección, aria-labels).
- "Tesorería" -> "Mis cuentas" (ídem). Identifiers internos intactos.
- `gastos/view.js`: corregido bug `href="#tesor"` -> `href="#tesoreria"` y copy de botón.

931/931 unit verdes. Solo labels visibles al usuario; cero riesgo de regresión.

---

### feat(nav): rediseño Parte 3A.1 - IA, wayfinding y hub "Crecer" · 2026-06-05

Reorganización de navegación sin tocar el router. Prepara la IA para las secciones Ahorro e Inversión.

- **`modules/ui/shell.js`:** `markActiveNav` resalta el botón "Más" móvil cuando el hash está en `MAS_SECTIONS`. Corrige el bug de wayfinding (antes ninguna pestaña se resaltaba en secciones del menú "Más").
- **`index.html`:** grupo "Crecer" nuevo en el sidebar (Metas migrada desde "Gestión"). Menú "Más" móvil reestructurado de grilla plana a 3 grupos con jerarquía (Gestión, Crecer, Herramientas).
- **`styles/modals.css`:** estilos de grupo `.menu-mas__group` + `.menu-mas__group-label`.

931/931 unit verdes. Renombres a lenguaje humano quedan para 3A.2.

---

### feat(ui): rediseño Parte 2 - tipografía self-hosted (Inter Variable + DM Mono) · 2026-06-05

Inter y DM Mono eran bloqueadas por CSP `font-src 'self'` en producción. Ahora se sirven sin peticiones externas.

- **`assets/fonts/inter-variable.woff2`** (48 KB): Inter Variable pesos 100-900 en 1 archivo (antes 6 estáticos = ~143 KB).
- **`assets/fonts/dm-mono-400.woff2`** + **`dm-mono-500.woff2`** (~30 KB): solo los 2 pesos realmente usados. Italic eliminado por no usarse en ningún elemento mono.
- **`styles/main.css`**: `@import` Google Fonts reemplazado por 3 `@font-face` con `font-display: swap` y `unicode-range` Latin.
- **`service-worker.js`**: bump `finko-v93` -> `finko-v94`. WOFF2 pre-cacheados en `OPTIONAL_ASSETS`.

Total descarga de fuentes: **78 KB** (antes: ~188 KB + petición externa bloqueada). 931/931 unit verdes.

---

### feat(ui): rediseño Parte 1 - paleta "calma confiable" · 2026-06-05

Primera fase de modernización UX/UI por partes. Dirección "calma confiable": menos neón, mejor accesibilidad, sin perder identidad verde. Solo tokens, ambos temas, cero hardcode.

- **`styles/tokens.css`:** acento `#00dc82` -> `#1fd194` (esmeralda menos saturada, menos fatiga); `--fk-success` desacoplado de la marca (`#25cf86`); `--fk-text-muted` `#6b7490` -> `#888fa6` (AA); colores de dominio armonizados (`analisis` `#00e5cc` -> `#2fd2bf`, `tesoreria`, `presupuesto`, `personales`); sombras tintadas; bases templadas.
- **`styles/themes.css`:** `--fk-text-muted` `#7a7f95` -> `#5d6276` (AA sobre blanco); acento decorativo claro `#13b377`; sombras tintadas azul-tinta; bases `#f6f7fa`/`#eef1f8`.
- **`index.html` + `manifest.json`:** `theme-color`/`background_color` -> `#101218`.

Verificado en preview (claro + oscuro, móvil). 931/931 unit verdes.

---

### fix(sw): Agenda en CORE_ASSETS + finko-v93 · 2026-06-05

Archivos `modules/dominio/agenda/{logic,view,index}.js` nunca estuvieron en `CORE_ASSETS` del SW (desde v38). Con cache frío y sin red, el import estático desde `bootstrap.js` fallaba y caía toda la app. El bump de CACHE_NAME fuerza el refresco en dispositivos con cache rezagado.

- **`service-worker.js`:** `finko-v92` -> `finko-v93`. Agregados los 3 archivos del dominio Agenda a `CORE_ASSETS`. Ahora 65/65 módulos y estilos cubiertos.

---

### test(e2e): realinear suite con form de cuenta rediseñado (v8.7-v8.9) · 2026-06-03

Cierre de deuda de e2e acumulada desde el rediseño de Tesorería. 6 tests fallaban por cambios de form que no se reflejaron en los tests.

1. **`tests/e2e/smoke.test.js`:** nuevo helper `crearCuentaEfectivo(page, saldo)` que encapsula el flujo actual del bank-picker: click trigger, esperar `#banco-list:not([hidden])`, click `[data-value="Efectivo"]`, fill saldo, submit, esperar `modalCerrado('modal-cuenta')`. 5 tests de cuenta migrados al helper; assertions de nombre actualizadas a "Efectivo"; `selectOption('custom name')` a `{ label: 'Efectivo' }` en los selectores de `cuentaId` del form de gastos.
2. **`tests/e2e/navegacion-render.test.js`:** assertion de compromisos corregida: "Nada que pagar... por ahora" → "Sin deudas registradas".

**Resultado final:** 33/33 e2e + 931/931 unit verdes. Sin cambios en código de producción.

---

### feat(ux): I.3 - empty states enriquecidos para nuevos usuarios · 2026-06-03

Tres archivos de view.js, puro copy. Sin lógica nueva, sin CSS nuevo, sin tests nuevos.

1. **`modules/dominio/gastos/view.js`:** desc enriquecida con ejemplos de gastos cotidianos (supermercado, transporte, comida, servicios) y mención de la agrupación por categoría. Tip nuevo que conecta con el botón "Anotar un gasto" del dashboard.
2. **`modules/dominio/metas/view.js`:** tip nuevo sobre el fondo de emergencia (3 meses de gastos fijos) como primera meta recomendada para un usuario nuevo.
3. **`modules/dominio/presupuesto/view.js`:** tip nuevo: empezar por 2-3 categorías de mayor gasto; el avance se actualiza en tiempo real al registrar gastos.

Secciones ya buenas que no se tocaron: Tesorería (tip ✓), Compromisos (tip ✓), Personales (copy conversacional ✓).

**Tests:** 931/931 verdes. Sin cambio en count.

---

### feat(dashboard): onboarding UX - guía de primeros pasos + copy "Anotar un gasto" · 2026-06-03

Mejoras de UX orientadas al nuevo usuario del dashboard. Sin cambios en lógica de dominio ni schema.

1. **`index.html`:** bloque `#hero-guia-saldo` dentro del hero del saldo (mensaje contextual + botón `.btn-primary.btn-lg` "Ir a Tesorería →", `hidden` por defecto). `id="saldo-desc"` a la descripción existente. Card `.quick-add`: título cambia de "Gasto rápido" a "Anotar un gasto"; desc pasa a "¿Compraste o pagaste algo? Solo el monto. Lo describís después."; `aria-label` actualizado.
2. **`styles/layout.css`:** nuevas clases `.hero-guia` (flexbox columna, gap, margen top) y `.hero-guia__texto` (max-width 46ch, color secundario, line-height 1.5). Removida `.bento__cta` (intermedia, descartada en el reencuadre).
3. **`modules/infra/render.js` (`updSaldo`):** si `S.cuentas` activas es vacío, `guia.hidden = false` + `desc.hidden = true`; si hay cuentas, al revés. Corre en carga, tras onboarding y en cada alta/borrado de cuenta: el toggle es en vivo.
4. **`tests/e2e/smoke.test.js`:** 2 tests nuevos en la suite Dashboard ("sin cuentas muestra la guía hacia Tesorería" y "con cuenta oculta la guía"); selectores del loop de navegación acotados a `.nav-item[href]` para evitar ambigüedad con el nuevo enlace de la guía.
5. **`tests/e2e/navegacion-render.test.js`:** los 3 clicks a `a[href="#tesoreria"]` acotados a `.nav-item[href="#tesoreria"]` por el mismo motivo.

**Tests:** 931/931 unit + integración verdes. E2E Dashboard: 4/4 verdes. Deuda pre-existente: 5 e2e del flujo de alta de cuenta y 1 de copy de compromisos siguen rotos desde v8.9 (sin relación con este cambio).

---

### refactor(infra): eliminar updateBadge y renderResumenGastos (no-ops cross-domain) · 2026-06-01

Cierre de deuda técnica anotada en v8.9. Ambas funciones eran no-ops sobre IDs que ya no existen en el HTML tras el rediseño del dashboard. Se eliminan exports, imports y todas las llamadas distribuidas en 4 dominios.

1. **`modules/infra/render.js`:** removida `updateBadge()` completa; `updSaldo()` recortada a solo `#saldo-total` (eliminadas secciones de `#gastos-mes` y `#metas-count`); `renderAll()` sin llamada a `updateBadge`; docstrings actualizados.
2. **`modules/dominio/gastos/view.js`:** removida `renderResumenGastos()` (era un no-op sobre `#gastos-mes` inexistente).
3. **`modules/dominio/gastos/index.js`:** removido `renderResumenGastos` del import + 5 llamadas.
4. **`modules/dominio/agenda/index.js`:** removido `updateBadge` del import + 1 llamada.
5. **`modules/dominio/import/index.js`:** removido import completo de `render.js` + 1 llamada.
6. **`modules/dominio/compromisos/index.js`:** removido `updateBadge` del import + 6 llamadas.

**IDs ya inexistentes (confirmado grep sobre index.html):** `#gastos-mes`, `#compromisos-count`, `#metas-count`, `#personales-count`.

**Tests:** 931/931 verdes. Sin cambio en test count (código sin lógica, sin tests).

**Archivos:** `modules/infra/render.js`, `modules/dominio/gastos/{index,view}.js`, `modules/dominio/agenda/index.js`, `modules/dominio/import/index.js`, `modules/dominio/compromisos/index.js`, `docs/`.

---

### feat(tesoreria): v8.9 - simulador laboral gateado empleado vs independiente + limpieza ingresos · 2026-05-29

Parte B del rediseño de Tesorería (cierra la fase): el simulador laboral pregunta primero la situación laboral y nunca mezcla los cálculos de empleado e independiente. Cierra también la limpieza opcional H.C: borrado del dominio `ingresos/` muerto y refresco de asserts e2e obsoletos. La fase H. (Rediseño de Tesorería) queda cerrada.

**Cambios B-1 (lógica financiera CO nueva):**

1. **`modules/core/constants.js`:** Agregadas 4 constantes legales con fuente: `SALUD_EMPLEADO` (4 %), `PENSION_EMPLEADO` (4 %), `FSP_TRAMOS` (tabla progresiva del Fondo de Solidaridad Pensional por múltiplos de SMMLV) e `INTERESES_CESANTIAS` (12 % anual sobre el saldo).
2. **`modules/infra/financiero.js`:** Dos funciones nuevas. `calcularAportesEmpleado(salario)` devuelve el descuento mensual del trabajador: IBC = max(salario, SMMLV), salud 4 % + pensión 4 % + FSP progresivo (0 % bajo 4 SMMLV; 1 %, 1.2 %, 1.4 %, 1.6 %, 1.8 %, 2 % por tramos). ARL: $0 (la paga el empleador). `calcularCesantias(salario, dias, variablesPromedio)` calcula cesantías (base × días / 360) más intereses (12 % anual proporcional). Helper interno `_tasaFSP(ibc)`. Detalle técnico: ambos `totalDescuento` y `total` se computan sumando componentes ya redondeados, no redondeando la suma cruda, para que siempre reconcilien.
3. **`tests/unit/calculadoras.test.js`:** 18 tests nuevos (10 de aportes empleado + 8 de cesantías): piso IBC, ausencia de ARL, FSP por tramos, reconciliación de totales, auxilio con/sin, proporcionalidad a días, tope 360.

**Cambios B-2 (UI gateada):**

4. **`index.html`:** Reemplazado el bloque `#simulador-laboral` v8.7 (un solo form mezclado) por gate v8.9: radio de perfil ("💼 Empleado" / "🧑‍💻 Independiente"), `fieldset` empleado (salario, días, extras, bonos) y `fieldset` independiente (ingreso, ARL clase). Botón "Calcular" oculto hasta elegir perfil.
5. **`styles/components.css`:** Nuevas clases `.sim-gate`, `.sim-gate__option`, `.sim-gate__radio`, `.sim-gate__body`, `.sim-gate__titulo`, `.sim-gate__desc`, `.sim-profile-fields`. Grid `auto-fit minmax(160px, 1fr)` responsivo. La opción seleccionada resalta vía `:has(:checked)` con `border-color: var(--fk-accent)`.
6. **`modules/dominio/tesoreria/index.js`:** Imports ampliados con `calcularAportesEmpleado` + `calcularCesantias`. `_calcularEmpleado(datos, el)` valida salario+días y renderiza 4 secciones (descuento mensual, beneficio mensual, prima semestral, cesantías como proyección anual). `_calcularIndependiente(datos, el)` valida ingreso y renderiza PILA completo. `_onSubmitSimuladorLaboral(e)` despacha por perfil. `_initSimuladorLaboral()` cablea radio change (muestra el `fieldset` correcto y el botón) y submit. Regla crítica: ningún output mezcla prima/cesantías con PILA. Cesantías para empleado: extrapolación `días * 2` cap 360 desde el semestre.

**Cambios H.C (limpieza opcional cerrada):**

7. **Borrados:** `modules/dominio/ingresos/{logic,view,index}.js` y `tests/unit/ingresos.test.js`. El directorio `ingresos/` ya no existe. `S.ingresos` se preserva en schema por retrocompatibilidad de datos (decisión de Parte A).
8. **`service-worker.js`:** Removidas las 3 rutas de `ingresos/` del CORE_ASSETS. `finko-v91` → `finko-v92`.
9. **`tests/integration/flujos.test.js`:** Quitado el import de `ingresosActivos`, `calcularTotalMensual`, `calcularIngresoMensual` y el test `'primer ingreso: activo y su cuota mensual es el monto declarado'`. La Suite 3 (roundtrip) sigue probando que `S.ingresos` persiste a localStorage (la capa de datos sigue válida).
10. **`tests/e2e/smoke.test.js`:** Reescritos los 2 tests del dashboard para solo testar `#saldo-total`. Quitados los asserts a `#gastos-mes`, `#compromisos-count`, `#metas-count` que eran obsoletos desde un rediseño previo del dashboard.

**Deuda técnica restante (NO de esta tarea):** Las funciones `updateBadge` (en `render.js`) y `renderResumenGastos` (en `gastos/view.js`) siguen siendo no-ops sobre IDs que ya no existen. Quedan cableadas desde `compromisos/`, `agenda/`, `import/` y `gastos/`. Eliminarlas requiere refactor cross-domain que excede el scope de H.C. Queda documentado para una tarea futura si se decide cerrarlas.

**Archivos:** `modules/core/constants.js`, `modules/infra/financiero.js`, `modules/dominio/tesoreria/index.js`, `styles/components.css`, `index.html`, `service-worker.js`, `tests/unit/calculadoras.test.js`, `tests/integration/flujos.test.js`, `tests/e2e/smoke.test.js`, `docs/`. Eliminados: `modules/dominio/ingresos/{logic,view,index}.js`, `tests/unit/ingresos.test.js`.

**Tests:** 931/931 unitarios + integración verdes (`-32` por borrar `ingresos.test.js` y `+18` por aportes/cesantías). E2E pendiente verificación manual (suite de dashboard reescrita).

---

### refactor(app): v8.8 - eliminación del concepto de ingreso mensual (Tesorería redesign, Parte A) · 2026-05-28

Parte A del rediseño de Tesorería. Decisión del usuario: "Simplificar todo". El ingreso mensual deja de ser un concepto vivo: el dashboard, Análisis y Logros ya no dependen de ingresos. La app queda centrada en saldos (cuentas) + gastos. Los archivos del dominio `ingresos/` NO se borran: se desconectan (código muerto) para evitar una migración de schema riesgosa (regla 2.5). `S.ingresos` permanece en el schema por retrocompatibilidad de datos.

**Cambios:**

1. **`modules/dominio/analisis/logic.js`:** Removido el import cross-domain de `ingresos/logic.js`. Borradas `calcularBalance`, `calcularTasaAhorro` y `nivelSalud`. `generarResumen` cambia de firma a `(gastos, compromisos, cuentas, anio, mes, metas = [])` y deja de exponer `ingresoMensual`, `balance`, `tasaAhorro`, `salud`, `proyeccion`. Agrega `egresos` (gastos + compromisos). `calcularScoreSalud` se reponderá a 3 factores: Deuda 0.40, Liquidez 0.35, Control 0.25 (antes incluía tasa de ahorro). `proyectarPatrimonio` y `proyeccionMultiHorizonte` se conservan como funciones puras exportadas con sus tests.
2. **`modules/dominio/analisis/view.js`:** Corregida la llamada a `generarResumen` (ya no pasa `S.ingresos`). En "Resumen del mes" se quitan las cards "Ingresos proyectados" y "Balance neto"; quedan Gastos, Compromisos y Total egresos. Eliminada la sección "Salud financiera" (tasa de ahorro). Quitado el factor "📈 Ahorro" del Score de salud. Removido el bloque "Proyección de patrimonio".
3. **`modules/infra/render.js`:** Quitado del dashboard el cálculo de ingresos mensuales y balance, y la constante muerta `_FACTOR_MENSUAL`.
4. **`modules/dominio/logros/logic.js`:** Borrados los logros `primer-ingreso` ("Primera plata") y `mes-en-verde` ("Mes en verde") y el helper `_mesEnVerde`.
5. **`modules/ui/bootstrap.js`:** Desconectado `initIngresos` (import + llamada). El dominio `ingresos/` queda como código muerto, no se borra.
6. **`index.html`:** Removidos la tira "Balance del mes" (`#balance-mes`) del dashboard, la `#panel-ingresos-card` de Tesorería y el modal `#modal-ingreso`. El bloque `#simulador-laboral` se conserva para Parte B.
7. **`modules/dominio/analisis/index.js` y `modules/dominio/tesoreria/index.js`:** Removida `'ingresos'` de las secciones observadas del EventBus (rama muerta).
8. **`modules/dominio/config/index.js`:** El mensaje de reset ya no menciona "ingresos".
9. **`CLAUDE.md`:** Agregado Opus 4.8 (niveles Bajo, Medio, Alto, Extra, Max) a las tablas de combinaciones válidas y de cuándo usar cada combinación.
10. **Tests:** `tests/unit/analisis.test.js` adaptado a la nueva firma y al score de 3 factores. `tests/unit/logros.test.js`: removidos los tests de `primer-ingreso` y `mes-en-verde`, ajustado el de "logros múltiples". `tests/integration/flujos.test.js`: reescritas las 3 suites de análisis al modelo sin ingresos. E2E: removidos `smoke.test.js` Suite 4 ("Ingresos - card en Tesorería", 3 tests) y el test "card de ingresos vacía" de `navegacion-render.test.js`; limpiadas las líneas `#ingresos-mes` / `#balance-mes` del test de métricas del dashboard.

**Deuda técnica anotada (no de esta tarea):** la suite e2e del dashboard tiene asserts pre-existentes obsoletos (`#gastos-mes`, `#compromisos-count`, `#metas-count` no existen tras un rediseño previo del dashboard). Queda como tarea aparte refrescar el e2e del dashboard.

**Archivos:** `modules/dominio/analisis/{logic,view,index}.js`, `modules/infra/render.js`, `modules/dominio/logros/logic.js`, `modules/ui/bootstrap.js`, `index.html`, `modules/dominio/tesoreria/index.js`, `modules/dominio/config/index.js`, `tests/unit/analisis.test.js`, `tests/unit/logros.test.js`, `tests/integration/flujos.test.js`, `tests/e2e/smoke.test.js`, `tests/e2e/navegacion-render.test.js`, `CLAUDE.md`, `service-worker.js`, `docs/`.

**Tests:** 945/945 unitarios + integración verdes. E2E no ejecutado (requiere servidor + Chromium).

---

### feat(tesoreria): v8.7 - simulador laboral unificado + limpieza form cuentas · 2026-05-27

Combina dos fases de rediseño de Tesorería post-v8.6: unificar prima+PILA y limpiar UX del form de cuentas.

**Fase 1: Simulador laboral unificado.**

1. **`index.html`:** Quitar nudge "Calculá tu prima de servicios. Registrá al menos un ingreso..." (`#nudge-prima`). Reemplazar dos `<details>` (prima y PILA separados) por único `<details id="simulador-laboral">` con título "🧮 Simulador laboral: prima y aportes PILA" y descripción "...el sistema puede hacer un cálculo completo e integrado...". Form con 5 campos: salario básico, días trabajados, clase ARL, horas extras/recargos, bonos/comisiones (últimos 2 opcionales). Submit "Calcular".
2. **`modules/dominio/tesoreria/index.js`:** Reemplazar handlers `_onSubmitHerramientaPrima` y `_onSubmitHerramientaPILA` por único `_onSubmitSimuladorLaboral`. Output muestra prima (empleados) + aportes PILA (independientes) en bloques separados con advertencia: "Estimación simplificada. La prima aplica a empleados; los aportes PILA, a independientes."
3. **`modules/dominio/tesoreria/view.js`:** Removidos `renderNudgePrima()` y funciones helper. Solo quedan `renderListaCuentas()` y `renderFormCuenta()`.
4. **`styles/components.css`:** Nuevas clases `.calc-result__subtitle` para títulos dentro de resultados, y `.calc-result__grid + .calc-result__subtitle` para agregar margen/border entre bloques.
5. **Decisión pendiente:** ¿Eliminar o mantener card "💰 Mis ingresos"? El usuario quiere borrarla ("mis ingresos son los que agrego en las cuentas"), pero es la única fuente de `S.ingresos` que alimenta dashboard/"ingresos del mes", Análisis e Ingresos/Logros. Account balances ≠ monthly income. Requiere arquitectura de reemplazo.

**Fase 2: Limpieza form de cuentas.**

1. **`modules/core/constants.js`:** Efectivo agregado como **primer entrada** en `BANCOS_CO`: `{ id: 'Efectivo', iniciales: '💵', color: '#16a34a', texto: '#ffffff' }`. Total de bancos: 13 → 14. Efectivo sigue en `TIPOS_CUENTA` para backwards-compat (cuentas antiguas).
2. **`modules/dominio/tesoreria/view.js` (`renderFormCuenta()`):** Quitar `<div class="form-group">` con `cuenta-nombre`. Agregar `id="form-group-tipo"` al div del `<select>` para ocultarlo dinámicamente. `_renderCuentaItem()` deduplica: si `banco === tipo`, muestra solo banco (evita "Efectivo · Efectivo").
3. **`modules/dominio/tesoreria/logic.js` (`validarCuenta()`):** Tipo no es requerido cuando `banco === 'Efectivo'`. Cambio: `if (datos.banco !== 'Efectivo' && (!datos.tipo?.trim() || datos.tipo === '')) { errores.push(...) }`.
4. **`modules/dominio/tesoreria/logic.js` (`normalizarCuenta()`):** `const tipo = (banco === 'Efectivo') ? 'Efectivo' : (datos.tipo ?? '');`. Normaliza tipo a 'Efectivo' cuando banco es Efectivo, evitando inconsistencia con _autoNombre().
5. **`modules/dominio/tesoreria/index.js`:** `_selectItem()` en `_initBankPicker` dispara `new Event('change')` en hidden input para notificar cambio de banco. Nueva función `_toggleTipoField()` lee `banco` y oculta/muestra `#form-group-tipo` (limpiar tipo value si Efectivo). `_inyectarForm()` registra listener `change` en `[name="banco"]`. `_editarCuenta()` remueve línea de prefill nombre (campo eliminado) y llama `_toggleTipoField()` después de setear banco. `_nuevaCuenta()` llama `_toggleTipoField()` para mostrar tipo si fue previamente oculto.
6. **`tests/unit/tesoreria.test.js`:** 3 tests nuevos: (a) `validarCuenta({ banco: 'Efectivo', tipo: '', saldo: '0' })` → sin errores; (b) `validarCuenta({ banco: 'Efectivo', tipo: 'Efectivo', saldo: '0' })` → sin errores; (c) `normalizarCuenta({ banco: 'Efectivo', tipo: '', ... })` → tipo y nombre = 'Efectivo'.

**Archivos:** `index.html`, `modules/core/constants.js`, `modules/dominio/tesoreria/view.js`, `modules/dominio/tesoreria/index.js`, `modules/dominio/tesoreria/logic.js`, `styles/components.css`, `tests/unit/tesoreria.test.js`.

**Tests:** 973/973 verdes (3 nuevos en tesoreria.test.js).

---

### feat(tesoreria): v8.6 - prima de servicios = estimador honesto con variables opcionales · 2026-05-27

Convierte la calculadora de prima en un estimador honesto que reconoce la complejidad real (horas extras, recargos, bonos habituales). Mantiene backward compatibility: `calcularPrima(salario, dias)` sin el 3er parámetro sigue funcionando igual.

**Cambios:**

1. **`modules/infra/financiero.js`:** `calcularPrima(salario, dias, variablesPromedio = 0)`. El IBC liquidable es ahora `salarioBase + variablesAplicadas`. Retorna `variablesAplicadas` (Math.max(0, Math.round(variablesPromedio))). Backwards-compatible.
2. **`index.html`:** Summary "🎁 Estimá tu prima de servicios". Descripción honesta. 2 campos opcionales (sin `required`): `hprima-extras` (horas extras y recargos promedio/mes) y `hprima-bonos` (bonos y comisiones habituales promedio/mes). Botón "Estimar prima".
3. **`modules/dominio/tesoreria/index.js`:** Handler suma `extras + bonos` → `variablesPromedio`. Grid muestra fila "Variables incluidas" solo si > 0. Disclaimer al pie: "Estimación simplificada. El valor real depende de tu nómina exacta del semestre."
4. **`tests/unit/calculadoras.test.js`:** 3 tests nuevos: `variablesPromedio=0` equivale a omitir, valor positivo incrementa prima correctamente (delta exacto = `variablesPromedio × dias/360`), valor negativo se trata como 0.
5. **`service-worker.js`:** v88 → v89.

**Archivos:** `modules/infra/financiero.js`, `index.html`, `modules/dominio/tesoreria/index.js`, `tests/unit/calculadoras.test.js`, `service-worker.js`.

**Tests:** 970/970 verdes (3 nuevos).

---

### style(copy): v8.5 - eliminar guion simple "-" en strings de UI visibles · 2026-05-27

Limpieza de copy: feedback del usuario para evitar el guion simple `-` como separador de inciso en texto visible. El em-dash `-` ya estaba prohibido por CLAUDE.md; ahora extendemos la regla al `-` cuando funciona como pausa entre cláusulas, reemplazándolo por comas, dos puntos o paréntesis según el caso.

**Cambios (13 strings de UI):**

1. **`modules/dominio/metas/view.js:80`** (empty-state): "Definí una meta - un viaje, un fondo de emergencia, lo que quieras - y llevá el control de tu progreso." → "Definí una meta, como un viaje, un fondo de emergencia o lo que quieras, y llevá el control de tu progreso."
2. **`modules/dominio/presupuesto/view.js:151`** (empty-state): "Asigná un monto mensual por categoría - por ejemplo, $500.000 para Alimentación - y Finko te va a avisar cuando te acerques al límite." → reemplazo de los dos `-` por comas.
3. **`modules/dominio/personales/view.js:99`** (chip): "X días - ya toca cobrar" → "X días, ya toca cobrar".
4. **`modules/dominio/compromisos/view.js:431`** (label form): "Tasa de interés mensual (%) - opcional" → "Tasa de interés mensual % (opcional)".
5. **`index.html:6`** (meta description): "Finko - Tu gestión..." → "Finko: tu gestión...".
6. **`index.html:34`** (title): "Finko - Tu plata bajo control" → "Finko: tu plata bajo control".
7. **`index.html:62`** (aria-label nav Dashboard): "Dashboard - resumen financiero" → "Dashboard: resumen financiero".
8. **`index.html:112`** (aria-label nav Préstamos): "Préstamos personales - me deben" → "Préstamos personales: me deben".
9-13. **`index.html:385-389`** (5 options ARL del PILA): "Clase I - oficina" → "Clase I: oficina" y análogo para las clases II a V.
14. **`service-worker.js`**: v87 → v88 (CORE_ASSETS modificados).

**Comentarios HTML y JSDoc no cambiaron** (no son visibles al usuario y no aplica la regla extendida).

**Archivos:** `index.html`, `modules/dominio/metas/view.js`, `modules/dominio/presupuesto/view.js`, `modules/dominio/personales/view.js`, `modules/dominio/compromisos/view.js`, `service-worker.js`.

**Tests:** 967/967 verdes (cambio puramente de copy).

---

### refactor(calculadoras): v8.4 - redistribuir calculadoras a dominios + limpiar módulo (sub-tarea 5/5) · 2026-05-27

Cierra la reorganización "Calculadoras → dominios naturales". Las 7 calculadoras ahora viven en sus secciones naturales. El módulo `calculadoras/` fue eliminado por completo.

**Cambios:**

1. **`index.html`:** 4 nuevos `<details class="herramienta-inline">` en `sec-metas` (CDT, Interés Compuesto) y `sec-analisis` (Regla del 72, Rentabilidad real). Eliminada la sección `sec-calc` completa con su panel y formularios.
2. **`modules/dominio/metas/index.js`:** Nuevas imports (`f` de utils, `calcularCDT`, `calcularInteresCompuesto`, `validarCampos` de financiero). Handlers `_onSubmitHerramientaCDT` y `_onSubmitHerramientaIC`. Wire-up en `initMetas()`.
3. **`modules/dominio/analisis/index.js`:** Nuevas imports (`f` de utils, `calcularRegla72`, `calcularRentabilidadReal`, `validarCampos` de financiero). Handlers `_onSubmitHerramientaR72` y `_onSubmitHerramientaRentabilidad`. Wire-up en `initAnalisis()`.
4. **`modules/ui/bootstrap.js`:** Removidos `import { initCalculadoras }` e `initCalculadoras()`.
5. **`modules/dominio/calculadoras/view.js`** y **`index.js`:** Borrados. El directorio `calculadoras/` queda vacío y ya no forma parte del bundle.
6. **`tests/unit/calculadoras.test.js`:** Removidos import `renderAlertaUsura` y el `describe('renderAlertaUsura()')` con 7 tests. La función fue deprecada junto al módulo.
7. **`service-worker.js`:** v86 → v87; removidas entradas `calculadoras/view.js` y `calculadoras/index.js` de `CORE_ASSETS`.

**Archivos:** `index.html`, `modules/dominio/metas/index.js`, `modules/dominio/analisis/index.js`, `modules/ui/bootstrap.js`, `service-worker.js`, `tests/unit/calculadoras.test.js`. Borrados: `modules/dominio/calculadoras/view.js`, `modules/dominio/calculadoras/index.js`.

**Tests:** 967/967 verdes.

---

### refactor(tesoreria): v8.3 - integrar Prima + PILA en Tesorería (sub-tarea 4/5) · 2026-05-27

Herramientas de nómina de independientes movidas a su sección natural.

**Cambios:**

1. **`index.html`:** Dos `<details class="herramienta-inline">` tras `lista-tesoreria` en `sec-tesoreria`: Prima de servicios (`#herramienta-prima`, campos salario + días) y PILA (`#herramienta-pila`, campo ingreso + select clase ARL con las 5 opciones).
2. **`modules/dominio/tesoreria/index.js`:** Imports `f`, `calcularPrima`, `calcularPILA`, `validarCampos`. Handlers `_onSubmitHerramientaPrima` y `_onSubmitHerramientaPILA` con salida `calc-result__grid`. Wire-up en `initTesoreria()`.
3. **`service-worker.js`:** v85 → v86.

**Archivos:** `index.html`, `modules/dominio/tesoreria/index.js`, `service-worker.js`.

**Tests:** 974/974 verdes.

---

### refactor(compromisos): v8.2 - integrar calculadora de Crédito en Compromisos (sub-tarea 3/5) · 2026-05-27

Primera herramienta inline integrada: el simulador de crédito vive ahora dentro de la sección donde el usuario toma la decisión de endeudarse.

**Cambios:**

1. **`index.html`:** `<details class="herramienta-inline" id="herramienta-credito">` tras `lista-compromisos` en `sec-compromisos`. Form con campos `hcred-principal`, `hcred-tasa`, `hcred-plazo`.
2. **`styles/components.css`:** Nuevo bloque `.herramienta-inline` (reusable para todas las herramientas inline del proyecto): `border-radius`, arrow toggle `▸` rotado con CSS, hover, cuerpo con `border-top`.
3. **`modules/dominio/compromisos/index.js`:** Imports `calcularCredito`, `validarCampos`. Handler `_onSubmitHerramientaCredito`. Wire-up en `initCompromisos()`.
4. **`service-worker.js`:** v84 → v85.

**Archivos:** `index.html`, `styles/components.css`, `modules/dominio/compromisos/index.js`, `service-worker.js`.

**Tests:** 974/974 verdes.

---

### refactor(infra): v8.1 - mover calculadoras/logic.js a infra/financiero.js (sub-tarea 2/5) · 2026-05-27

Prerequisito ADN para redistribuir calculadoras: mover la lógica a `infra/` permite que cualquier dominio la importe sin violar la regla "ningún dominio importa a otro".

**Cambios:**

1. **`modules/infra/financiero.js`** (nuevo): todas las funciones puras financieras de `calculadoras/logic.js` con import corregido (`../core/constants.js`). Exports: `calcularCDT`, `calcularCredito`, `calcularInteresCompuesto`, `calcularRegla72`, `calcularPrima`, `calcularPILA`, `calcularRentabilidadReal`, `clasificarTasaCredito`, `validarCampos`.
2. **`modules/dominio/calculadoras/logic.js`:** Borrado (95% rename a `infra/financiero.js` según git).
3. **`modules/dominio/calculadoras/index.js`:** Actualizado import a `../../infra/financiero.js`.
4. **`tests/unit/calculadoras.test.js`:** Actualizado import de funciones lógicas a `../../modules/infra/financiero.js`.
5. **`service-worker.js`:** v84 → v85 (agrega `financiero.js`, mantiene `calculadoras/view.js` e `index.js` que se borrarán en v8.4).

**Archivos:** `modules/infra/financiero.js` (creado), `modules/dominio/calculadoras/logic.js` (borrado), `modules/dominio/calculadoras/index.js`, `tests/unit/calculadoras.test.js`, `service-worker.js`.

**Tests:** 974/974 verdes.

---

### refactor(nav): v8.0 - eliminar sección Calculadoras del nav (sub-tarea 1/5) · 2026-05-27

Primera sub-tarea de "Calculadoras → dominios naturales". Solo navegación.

**Cambios:**

1. **`index.html`:** Quitado link `#calc` del sidebar desktop y del menú Más mobile.
2. **`modules/infra/router.js`:** Eliminado `['calc', 'sec-calc']` de SECTIONS. Agregado `REDIRECTS map` con `calc → dash`: redirige `#calc` al Dashboard vía `history.replaceState` sin disparar hashchange adicional.
3. **`service-worker.js`:** v83 → v84.

**Archivos:** `index.html`, `modules/infra/router.js`, `service-worker.js`.

**Tests:** 974/974 verdes.

---

### feat(compromisos) - v7.15: abono a deudas, sub-tarea 3 (badge agenda + tip proyección + E2E) · 2026-05-27

Cierra la feature completa "Abonar deuda" (ADR 002). Sub-tarea 3 de 3: feedback visual al usuario dentro de la Agenda y en el modal de abono, más cobertura E2E del flujo.

**Cambios:**

1. **`modules/dominio/agenda/view.js`:** `_renderDetalleItem` ahora recibe `viewYear` y `viewMonth`. Detecta si existe un gasto-abono del mes visualizado vinculado al compromiso via `compromisoId`. Si existe, muestra el badge `<p class="cal-detail__badge-abono">✓ Ya abonaste este mes</p>`.

2. **`modules/dominio/compromisos/view.js`:** `renderFormAbono` agrega `data-saldo` y `data-cuota` al `<form>` (necesarios para el tip de proyección) y un `<p id="abono-tip-proyeccion">` vacio con `aria-live="polite"`.

3. **`modules/dominio/compromisos/index.js`:** función `_actualizarTipProyeccion` (listener en `input` del campo monto). Calcula meses antes y después del abono (`Math.ceil(saldo/cuota)`) y actualiza el tip: "Con este abono terminás X mes/meses antes." Solo aparece cuando el ahorro de tiempo es >= 1 mes.

4. **`styles/components.css`:** clase `.cal-detail__badge-abono` (texto xs, color success, margen superior). Actualiza comentario de sección "ABONO A DEUDAS".

5. **`tests/e2e/smoke.test.js`:** Suite 11 "Agenda - badge abono": inyecta estado con una deuda y un gasto-abono del mes actual via `addInitScript`, navega a `/#agenda`, clica el día 15, verifica `.cal-detail__badge-abono` visible con texto "Ya abonaste este mes". Corrige también el test previo de la leyenda del calendario (selector `text=Deuda` fallaba por ambigüedad entre "Deuda entidad" y "Deuda personal": reemplazado por `toContainText`).

6. **`service-worker.js`:** v82 → v83.

**Archivos:** `modules/dominio/agenda/view.js`, `modules/dominio/compromisos/view.js`, `modules/dominio/compromisos/index.js`, `styles/components.css`, `tests/e2e/smoke.test.js`, `service-worker.js`.

**Tests:** 974/974 verdes. E2E: 39 pasan (badge test verde + fix de leyenda Agenda).

---

### feat(compromisos) - v7.14: abono a deudas, sub-tarea 2 (modal + botón + glue code) · 2026-05-27

Feature "Abonar deuda" completa en UI. Segunda de 3 sub-tareas: todo lo visible y el glue code de sincronización.

**Cambios:** botón "Abonar" en cada card de deuda (`compromisos/view.js`); modal `#modal-abono` con form completo (`index.html`); `renderFormAbono(deuda)` en `view.js`; handlers `_abrirAbono`, `_guardarAbono`, `_archivarCompromiso`, `_actualizarSaldoDisponibleAbono` en `compromisos/index.js`; `normalizarGasto` incluye `compromisoId` en `gastos/logic.js`; `_ajustarSaldoDeuda` en `gastos/index.js` sincroniza `saldoTotal` al editar/eliminar un gasto-abono; 3 tests de integración nuevos.

**Archivos:** `index.html`, `styles/components.css`, `modules/dominio/compromisos/view.js`, `modules/dominio/compromisos/index.js`, `modules/dominio/gastos/logic.js`, `modules/dominio/gastos/index.js`, `service-worker.js`, `tests/unit/compromisos.test.js`.

**Tests:** 974/974 verdes (3 nuevos de integración).

---

### feat(compromisos) - v7.13: abono a deudas, sub-tarea 1 (modelo + lógica + tests) · 2026-05-27

Decisión arquitectónica documentada previamente en [`docs/DECISIONS/002-abono-deudas.md`](DECISIONS/002-abono-deudas.md). Esta versión cierra la **Sub-tarea 1 de 3** de la feature "Abonar deuda": introduce el modelo de datos y la lógica pura, sin tocar UI (nada visible para el usuario aún). El plan completo es:

1. **Sub-tarea 1 (esta versión):** schema + funciones puras + tests unitarios.
2. **Sub-tarea 2 (próxima):** modal de abono, botón en card, glue code en `gastos/index.js` para sincronizar `saldoTotal` cuando un gasto-abono se edita o elimina.
3. **Sub-tarea 3:** badge "ya abonaste este mes" en agenda, tip "si abonás $Y, terminás Z meses antes", E2E smoke.

**Cambios:**

1. **`modules/core/state.js`:** typedef `Gasto` agrega campo opcional `compromisoId?: string`. Cuando está presente, marca el gasto como abono a la deuda referenciada. Backwards-compatible (campo opcional, sin migración).

2. **`modules/dominio/compromisos/logic.js`:** 5 funciones puras nuevas al final del archivo bajo el comentario `// ── ABONOS A DEUDAS (ADR 002) ─`:
   - `aplicarAbonoASaldo(saldoActual, monto)`: resta el monto del saldo. Devuelve siempre ≥ 0 (cap implícito). Maneja NaN/undefined sin propagar.
   - `revertirAbonoDeSaldo(saldoActual, monto)`: suma el monto al saldo (revierte un abono previo al editar o eliminar el gasto vinculado).
   - `ajustarMontoAbono(monto, saldoActual)`: caps el monto al saldo si excede. Devuelve `{ montoAjustado, saldaDeuda }` para que el handler sepa si la deuda quedó en 0.
   - `validarAbono(datos, deuda)`: 11 reglas de validación (monto > 0, cuentaId requerido, fecha YYYY-MM-DD, deuda existe, es tipo deuda-entidad/personal, está activa, tiene saldo > 0). Acumula errores en una sola pasada.
   - `deltasSaldoCompromisoPorEdicionGasto(antes, despues)`: dado el estado antes y después de un gasto, devuelve mapa `{ compromisoId → delta }` sobre `saldoTotal`. Maneja crear/editar/eliminar, cambio de monto, cambio de compromiso, vincular/desvincular. Delta negativo = saldo baja (aplicar abono), positivo = saldo sube (revertir).

3. **`tests/unit/compromisos.test.js`:** 39 tests nuevos en 5 bloques `describe`:
   - `aplicarAbonoASaldo`: 6 tests (resta normal, monto > saldo, monto = saldo, monto = 0, saldo NaN, monto NaN).
   - `revertirAbonoDeSaldo`: 4 tests (suma normal, saldo 0, saldo NaN, monto NaN).
   - `ajustarMontoAbono`: 7 tests (monto < saldo, monto = saldo, monto > saldo, monto = 0, monto negativo, saldo 0, monto NaN).
   - `validarAbono`: 12 tests (OK, monto faltante/0/negativo, cuentaId vacío, fecha vacía/mal formato, deuda null/fijo/inactiva/saldada, multi-error).
   - `deltasSaldoCompromisoPorEdicionGasto`: 10 tests (crear, eliminar, editar monto subiendo/bajando, cambiar compromiso, desvincular, vincular, sin cambios, ambos null, ambos sin compromisoId).

4. **`service-worker.js`:** v80 → v81.

**Arquitectura.** Las funciones nuevas viven en `compromisos/logic.js` porque operan sobre el saldo de compromisos, aunque las invoquen desde `gastos/index.js` en Sub-tarea 2. Cumple la regla ADN "ningún dominio importa a otro": el handler de gastos lee `S.compromisos` directamente vía el singleton compartido (no por import), y llama a la función pura desde el dominio compromisos. No hay acoplamiento de módulos, solo de datos vía S.

**Archivos tocados:** `modules/core/state.js`, `modules/dominio/compromisos/logic.js`, `tests/unit/compromisos.test.js`, `service-worker.js`.

**Tests:** 971/971 verdes (39 nuevos sobre el baseline de 932).

---

### fix(compromisos) - v7.12: tasa de interés sin decimales + sin "% EA" en cards de deudas · 2026-05-27

Feedback del usuario: las cards de deuda en Compromisos mostraban la tasa con decimales y con el sufijo técnico "% EA". Pidió mostrar enteros limpios sin etiqueta.

**Cambios:**

1. **`tasaMostrada` en `view.js:220`:** para deuda-entidad, `${tasaEA.toFixed(1)}% EA` → `${Math.round(tasaEA)}%`. Para deuda-personal (tasa mensual), `${(tasa * 100).toFixed(2)}% mensual (~X.X% EA)` → `${Math.round(tasa * 100)}% mensual` (el equivalente EA desaparece). `sin interés` sin cambios.

2. **Label del formulario:** `'Tasa de interés EA (%)'` → `'Tasa de interés (%)'`. Elimina el tecnicismo "EA" del campo.

3. **Hint de usura en el formulario:** `~28.17% EA (SFC, ...)` → `~28% anual (SFC, ...)`. Reemplaza "EA" por "anual" (más legible) y redondea a entero.

4. **`service-worker.js`:** v79 → v80.

**Archivos tocados:** `modules/dominio/compromisos/view.js`, `service-worker.js`.

**Tests:** 932/932 verdes (cambio puramente presentacional).

---

### fix(calculadoras) - v7.11: remover tasa EA + usura de calculadora de crédito · 2026-05-27

Feedback del usuario: la calculadora de crédito mostraba tres elementos derivados que no eran centrales al cálculo y agregaban ruido: la fila "Tasa mensual efectiva", la alerta de usura (cuando la tasa supera el tope SFC) y el badge clasificador ("Tasa razonable / estándar / alta / excede usura"). Pidió ocultar los tres para que el resultado se enfoque en lo importante (cuota, total pagado, intereses).

**Cambios:**

1. **`modules/dominio/calculadoras/view.js`:** `renderResultCredito` ya no incluye la fila "Tasa mensual efectiva". Quedan tres filas: Cuota mensual fija (highlight verde), Total pagado, Total intereses (deduct rojo).

2. **`modules/dominio/calculadoras/index.js`:** `_onSubmitCredito` simplificado. Ya no clasifica la tasa contra usura, ya no inyecta `renderAlertaUsura` arriba del resultado, ya no inyecta `renderBadgeTasa` debajo. Solo: validar campos, calcular, renderizar resultado, anunciar. Removidos imports muertos: `tasaUsuraVigente` (de `core/constants.js`), `clasificarTasaCredito` (de `logic.js`), `renderBadgeTasa` y `renderAlertaUsura` (de `view.js`).

3. **Las funciones puras quedan intactas:** `clasificarTasaCredito` (en `logic.js`), `renderBadgeTasa` y `renderAlertaUsura` (en `view.js`) siguen exportadas. Sus tests siguen pasando. Si en el futuro se quiere reactivar la alerta o el badge, basta con re-importarlos y llamarlos en el handler.

4. **`service-worker.js`:** v78 → v79.

**Verificación visual:** screenshot del calc de crédito con monto $10M / tasa 35% (usura) / plazo 36 meses confirma:
- No aparece "Tasa mensual efectiva".
- No aparece el nudge rojo "Tasa por encima del limite legal de usura".
- No aparece el badge "🚫 Excede la usura legal (SFC)".
- Solo las tres métricas centrales: Cuota mensual fija $426.648, Total pagado $15.359.345, Total intereses $5.359.345.

**Archivos tocados:** `modules/dominio/calculadoras/view.js`, `modules/dominio/calculadoras/index.js`, `service-worker.js`.

**Tests:** 932/932 verdes (cambio puramente presentacional; los tests de `clasificarTasaCredito` y `renderAlertaUsura` siguen pasando porque siguen siendo funciones públicas).

---

### fix(compromisos) - v7.10: comparativa Avalancha vs BN siempre visible + remover "Libre de deudas en" · 2026-05-27

Feedback del usuario: en la card de Avalancha faltaba mostrar el impacto financiero comparativo entre estrategias ("cuánto me ahorro eligiendo Avalancha vs Bola de nieve"). La fila que existía ("Te ahorrás respecto a Bola de nieve") solo aparecía cuando `extraMensual > 0 && ahorro > 0`, así que en el caso del usuario (deudas con tasa 0 mezcladas, sin extra) nunca se mostraba ningún mensaje. Además pidió eliminar "Libre de deudas en" porque "el cambio no es que sea muy notorio" (suele coincidir entre estrategias).

**Cambios:**

1. **Nuevo helper `_renderComparativa(resultado, extraMensual)` en `view.js`** — siempre devuelve un banner cubriendo los 3 escenarios posibles:
   - **Hay ahorro real** (`ahorroIntereses > 0.5` o `ahorroMeses > 0`): banner verde success "💰 Con Avalancha te ahorrarías **$X** en intereses [y **Y** de tiempo] frente a Bola de nieve". Junta intereses y tiempo en la misma frase con "y" si ambos difieren.
   - **Empate sin extra** (`extraMensual === 0`, sin diff): banner azul info "ℹ️ Con tus deudas actuales, Avalancha y Bola de nieve dan el mismo costo. Probá agregar un pago extra mensual abajo para ver dónde empieza a aparecer el ahorro con Avalancha." Apunta al acordeón de extra como CTA implícito.
   - **Empate con extra** (`extraMensual > 0`, sin diff): banner azul info "ℹ️ Con este pago extra, ambas estrategias terminan en el mismo costo. Podés elegir por preferencia: orden financiero (Avalancha) o impulso psicológico (Bola de nieve)."
   - Solo se invoca desde Avalancha (Bola de nieve no tiene "ahorro" que mostrar respecto a sí misma; su victoria propia es "Cerrás tu primera deuda en").

2. **Removida la fila "Libre de deudas en" de ambas estrategias** (`_renderImpactoAvalancha` y `_renderImpactoBolaNieve`):
   - Razón del usuario: el tiempo total suele coincidir entre estrategias (depende más del saldo + cuota mínima que de la estrategia, salvo casos con extra mensual relevante), así que la métrica no aportaba valor comparativo.
   - El tiempo total relevante (cuando difiere) ahora vive dentro del banner comparativo en Avalancha. En Bola de nieve queda "Cerrás tu primera deuda en" como métrica de tiempo (la victoria temprana, su propio enfoque).

3. **Estructura final de métricas:**
   - **Avalancha:** Apuntás primero a (azul info) · Total que pagás en intereses (rojo danger) · **Banner comparativo** (verde success o azul info según escenario).
   - **Bola de nieve:** Apuntás primero a (azul info) · Cerrás tu primera deuda en (verde success).

4. **CSS nuevo:** `.estrategia-card__ahorro--info` para el banner azul de empate, reusando `--fk-info` (#3d8aff). El banner verde success existente queda intacto para el escenario con ahorro real.

5. **Limpieza:** eliminado el helper muerto `_renderComparacionAhorro` (definido pero nunca invocado tras v7.4); su lógica condicional se generaliza en el nuevo `_renderComparativa`.

**Verificación visual:** state inspection del DOM confirmó los 3 escenarios:
- Extra = $0: banner azul info, mensaje de empate con CTA al acordeón.
- Extra = $200.000: banner verde success "Con Avalancha te ahorrarías $11.379 en intereses frente a Bola de nieve".
- (Empate con extra > 0: caso edge no reproducible con las deudas del usuario, pero rama implementada y testeable por unit si surge un caso así.)

**Archivos tocados:** `modules/dominio/compromisos/view.js`, `styles/components.css`, `service-worker.js`.

**`service-worker.js`:** v77 → v78.

**Tests:** 932/932 verdes (cambio puramente presentacional; sin lógica de cálculo nueva).

---

### fix(agenda) - v7.9: leyenda alineada al modelo + dots de deuda con color real · 2026-05-27

Feedback del usuario: la leyenda del calendario en Agenda mostraba "Fijo / Deuda / Agenda" pero el modelo real de compromisos solo tiene 3 tipos (`fijo`, `deuda-entidad`, `deuda-personal`) y el tipo `agenda` ya no se usa. Pidió reorganizar las categorías a "Gasto fijo / Deuda entidad / Deuda personal" para que los nombres reflejen lo que realmente se puede agregar.

**Bug preexistente descubierto en el camino:** los dots del calendario para deudas no tenían color real. El renderer (`_renderDots` en `agenda/view.js`) generaba clases `cal-dot--deuda-entidad` y `cal-dot--deuda-personal`, pero en `styles/components.css` solo existían `.cal-dot--fijo`, `.cal-dot--deuda` (huérfana, sin uso) y `.cal-dot--agenda` (huérfana). Los dots de deudas caían al estilo base gris muted.

**Cambios:**

1. **Leyenda nueva (`agenda/view.js::_renderLeyenda`):**
   - Antes: 3 items "Fijo / Deuda / Agenda".
   - Ahora: 3 items "Gasto fijo / Deuda entidad / Deuda personal" alineados con los `tipo` reales del modelo. La categoría "Agenda" (que no correspondía a ningún tipo activo) se reemplaza por la subdivisión real de deudas que ya existía en los datos pero no se reflejaba en la leyenda.

2. **CSS de dots actualizado (`styles/components.css`):**
   - Antes: `.cal-dot--fijo`, `.cal-dot--deuda` (huérfana), `.cal-dot--agenda` (huérfana).
   - Ahora: `.cal-dot--fijo` (sin cambios, naranja `--fk-dom-presupuesto`), `.cal-dot--deuda-entidad` (rojo `--fk-dom-compromisos`, #ff4757), `.cal-dot--deuda-personal` (rosa `--fk-dom-personales`, #ff4eb8). Eliminadas las dos clases huérfanas.

**Decisiones de diseño:**

- **Dos tonos distintos para las dos categorías de deuda** (no un solo color compartido) porque el usuario quiso diferenciar visualmente entidad vs personal en el calendario. Se aprovecharon dos tokens ya definidos en la paleta (`--fk-dom-compromisos` y `--fk-dom-personales`), sin necesidad de paleta nueva.

**Verificación visual:** screenshot mobile dark del calendario de Mayo 2026 confirmó:
- Leyenda al pie: 🟡 Gasto fijo · 🔴 Deuda entidad · 🌸 Deuda personal.
- Dots en celdas: día 5 (Crédito ICETEX) rojo, día 15 (Tarjeta Visa) rojo, día 20 (Préstamo mamá) rosa. Antes todos eran gris muted; ahora cada deuda tiene su color real.

**Archivos tocados:** `modules/dominio/agenda/view.js`, `styles/components.css`, `service-worker.js`.

**`service-worker.js`:** v76 → v77.

**Tests:** 932/932 verdes (cambio puramente presentacional).

---

### fix(compromisos) - v7.8: "Apuntás primero a" en BN + tip de Avalancha más humano · 2026-05-27

Iteración doble tras v7.7. Primero el usuario pidió la métrica "Apuntás primero a" también en Bola de nieve (en v7.7 había quedado solo en Avalancha) para que ambas estrategias se sientan consistentes y sean fáciles de comparar lado a lado. Luego pidió ajustar el tip de Avalancha: el original "la deuda con tasa más alta" era técnico y no comunicaba el *por qué* (impacto sobre las finanzas, no solo el valor de la tasa).

**Cambios:**

1. **Nueva métrica "Apuntás primero a" en Bola de nieve (`view.js::_renderImpactoBolaNieve`):**
   - Antes: BN mostraba solo "Libre de deudas en" y "Cerrás tu primera deuda en" (con el nombre de la deuda como tip).
   - Ahora: 2da métrica = "Apuntás primero a: <nombre de la deuda>" (color info azul) + tip "la deuda más chica". Misma posición que en Avalancha → estructura visual idéntica entre ambas estrategias.
   - La deuda mostrada es `resultado.bolaNieve.orden[0]` — la primera del array ordenado por la estrategia (saldo ascendente), la deuda prioritaria que el usuario debe atacar con el extra para que el efecto bola funcione.

2. **Tip de "Cerrás tu primera deuda en" ahora condicional (BN):**
   - Antes: siempre mostraba el nombre de la primera deuda en cerrarse como tip.
   - Ahora: solo lo muestra cuando la primera en cerrarse difiere de la priorizada (edge case con saldos o cuotas raras donde otra deuda se apaga antes que la target). En el caso habitual (target === primera) se omite para no repetir el nombre en filas contiguas con "Apuntás primero a".

3. **Tip de "Apuntás primero a" en Avalancha más humano (`view.js::_renderImpactoAvalancha`):**
   - Antes: "la deuda con tasa más alta" — técnico, describe el dato pero no el impacto.
   - Ahora: "la deuda que más intereses te genera" — comunica el *por qué* (el efecto sobre las finanzas) en lugar del *qué* (el valor de la tasa). Lenguaje más cercano al usuario no financiero.

**Estructura final de métricas (3 filas en cada una, espejo visual en las dos primeras):**
- Avalancha: LIBRE DE DEUDAS EN (azul) · APUNTÁS PRIMERO A "la deuda que más intereses te genera" (azul) · TOTAL QUE PAGÁS EN INTERESES (rojo).
- Bola de nieve: LIBRE DE DEUDAS EN (azul) · APUNTÁS PRIMERO A "la deuda más chica" (azul) · CERRÁS TU PRIMERA DEUDA EN (verde, victoria temprana propia de BN).

**Verificación visual:** screenshots mobile dark con cada estrategia seleccionada confirmaron las 3 métricas en orden esperado y el tip nuevo de Avalancha visible bajo el nombre de la deuda priorizada. Sin errores en consola.

**Archivos tocados:** `modules/dominio/compromisos/view.js`, `service-worker.js`.

**`service-worker.js`:** v74 → v76.

**Tests:** sin cambios de lógica (cambio puramente presentacional); suite previa 932/932 verdes.

---

### fix(compromisos) - v7.7: "Apuntás primero a" en Avalancha + copy de Avalancha más claro · 2026-05-27

Iteración tras feedback del usuario sobre v7.6. Tres temas: el usuario sospechó un bug en el cálculo porque "Libre de deudas en" coincidía entre ambas estrategias y no veía diferencia visible; la frase "aguantás que la primera deuda cerrada tarde un poco más" en el resumen de Avalancha no era clara; y le pareció que el tip de "Cerrás tu primera deuda en" en Bola de nieve no coincidía con la primera deuda de la lista debajo (en realidad sí coincide; era una confusión visual).

**Revisión del cálculo (no hay bug):**

`simularEstrategiaPago` (`modules/dominio/compromisos/logic.js:641-730`) sí implementa el efecto cascada correctamente: línea 681 suma TODAS las cuotas al presupuesto del mes (incluso las de deudas ya pagadas, así se "liberan"); línea 700 vuelca todo el presupuesto restante en la deuda prioritaria. Lo que ocurre con las deudas del usuario es matemáticamente coherente: Préstamo Mamá (tasa 0% EA, saldo $1.2M, cuota $200k) cierra a los 6 meses en AMBAS estrategias (porque sin interés se paga al mismo ritmo independientemente del orden estratégico). Después de mes 6, ambas estrategias coinciden porque la siguiente más chica (Visa, $4.5M) ES también la siguiente con mayor tasa. Por eso "Libre de deudas en" coincide en 1 año 7 meses.

**Cambios:**

1. **Nueva métrica "Apuntás primero a" en Avalancha (`view.js::_renderImpactoAvalancha`):**
   - Antes: Avalancha mostraba solo "Libre de deudas en" y "Total en intereses". El usuario no veía diferencia conceptual con Bola de nieve.
   - Ahora: 2da métrica = "Apuntás primero a: <nombre de la deuda>" (color info azul) + tip "la deuda con tasa más alta".
   - La deuda mostrada es `resultado.avalancha.orden[0]` — la primera del array ordenado por la estrategia (mayor tasaEA), que es la deuda que esta estrategia prioriza con todo el extra disponible.
   - **No usamos "Cerrás tu primera deuda en"** en Avalancha (probada inicialmente) porque con deudas con tasa 0% mezcladas, la primera en cerrarse puede ser la chica sin interés, que es la misma que aparece en BN → no comunicaría la diferencia entre estrategias.
   - Resultado: ahora el usuario ve "Apuntás primero a: **Tarjeta Visa**" (Avalancha) vs "Cerrás tu primera deuda en 6 meses (**Préstamo mama**)" (BN). Diferencia conceptual visible incluso cuando el tiempo total coincide.
2. **Copy de Avalancha más claro (`_RESUMEN_ESTRATEGIA.avalancha`):**
   - Antes: "...Ideal si querés ahorrar en plata y aguantás que la primera deuda cerrada tarde un poco más."
   - Ahora: "...Puede que la primera deuda tarde un poco más en cerrarse, pero a la larga ahorrás más dinero."
   - Más directo, sin el imperativo "aguantás" que sonaba a sacrificio.
3. **Tip "Cerrás tu primera deuda en" en BN (sin cambios):** verificado por DOM que el tip "Préstamo mama" coincide con la primera deuda de la lista debajo cuando BN está activa (la lista se reordena por saldo ascendente en `renderListaCompromisos`). No había bug; era una confusión visual.

**Verificación visual:** screenshot mobile dark con Avalancha seleccionada confirmó:
- "📊 TU IMPACTO" con 3 métricas: "LIBRE DE DEUDAS EN: 1 año 7 meses" (azul) + "APUNTÁS PRIMERO A: Tarjeta Visa" con tip "la deuda con tasa más alta" (azul) + "TOTAL QUE PAGÁS EN INTERESES: $1.640.559" (rojo).
- Snapshot DOM de BN: "LIBRE DE DEUDAS EN: 1 año 7 meses" (azul) + "CERRÁS TU PRIMERA DEUDA EN: 6 meses (Prestamo mama)" (verde).

**Archivos tocados:** `modules/dominio/compromisos/view.js`, `service-worker.js`.

**`service-worker.js`:** v73 → v74.

**Tests:** 932/932 verdes (sin cambios de lógica).

---

### fix(compromisos) - v7.6: orden consistente de métricas + estado "1 sola deuda" · 2026-05-27

Iteración tras feedback del usuario sobre v7.5. Dos problemas: cuando el usuario tiene solo 1 deuda activa, la sección "Estrategia de pago" mostraba las 2 cards sin "✨ Recomendada para vos" (porque la recomendación requiere ≥2 deudas para comparar), lo que dejaba la UI confusa y sin guía; y al reordenar BN en v7.5 para poner "Cerrás tu primera deuda en" como primera métrica, rompimos la consistencia visual con Avalancha que mantiene "Libre de deudas en" primero.

**Cambios:**

1. **Orden consistente en "📊 Tu impacto" entre ambas estrategias (`modules/dominio/compromisos/view.js::_renderImpactoBolaNieve`):**
   - **Avalancha:** 1) Libre de deudas en (azul info), 2) Total en intereses (rojo danger), [3) Te ahorrás (verde success) si extra > 0].
   - **Bola de nieve:** 1) Libre de deudas en (azul info), 2) Cerrás tu primera deuda en (verde success).
   - "Libre de deudas en" ahora está SIEMPRE en la primera posición con el mismo color azul. Las métricas únicas de cada estrategia van al final con su color distintivo (rojo para intereses, verde para victorias).
   - Justificación: la consistencia visual prima cuando el usuario compara opciones lado a lado; saber dónde mirar para cada métrica común reduce carga cognitiva. La diferenciación de enfoque (financiero vs psicológico) queda comunicada por el copy del bloque "Por qué te conviene" / "Cómo funciona" + por el color de la métrica única al final.
2. **Caso especial "1 sola deuda" (`renderEstrategiaPago`):**
   - Antes: con 1 deuda se mostraban ambas cards (Avalancha y Bola de nieve) sin "✨ Recomendada para vos" (porque `recomendarEstrategia` devuelve `null` para `deudas.length < 2`). Resultado: cards sin guía, comparador sin sentido.
   - Ahora: si `deudas.length === 1`, reemplazamos el cuerpo entero por un mensaje útil: `"Tenés una sola deuda activa (<nombre>). Cuando tengas dos o más, Finko te recomendará la mejor estrategia para pagarlas (Avalancha vs Bola de nieve)."`
   - Esto evita mostrar un comparador irrelevante y educa al usuario sobre cuándo verá la recomendación.

**Verificación visual:** screenshot mobile dark con Avalancha seleccionada confirmó:
- Badge "✨ Recomendada para vos" en verde debajo del nombre de Avalancha.
- "📊 TU IMPACTO" empieza con "LIBRE DE DEUDAS EN: 1 año 7 meses" en azul, seguido de "TOTAL QUE PAGÁS EN INTERESES: $1.640.559" en rojo.
- Snapshot DOM de Bola de nieve confirmó mismo orden: "Libre de deudas en" primero (azul), "Cerrás tu primera deuda en" segundo (verde).

**`service-worker.js`:** v72 → v73.

**Archivos tocados:** `modules/dominio/compromisos/view.js`, `service-worker.js`.

**Tests:** 932/932 verdes (sin cambios de lógica).

---

### refactor(compromisos) - v7.5: métricas diferenciadas por enfoque + copy humano · 2026-05-27

Iteración tras feedback del usuario sobre v7.4. Tres problemas: mostrar "Total que pagás en intereses" en Bola de nieve daba la sensación errónea de que esa estrategia cobraba algo extra; la métrica "Libre de deudas en" daba el mismo valor en ambas estrategias sin extra mensual (matemáticamente correcto: ambas tardan lo mismo cuando la deuda más larga domina), lo que sugería falsamente que las estrategias eran iguales; y el copy de "Por qué te conviene" exponía números técnicos crudos ("tasas (0.0% y 213.8% EA)") difíciles de interpretar.

**Cambios:**

1. **Métricas diferenciadas por enfoque de la estrategia (`modules/dominio/compromisos/view.js`):**
   - **Avalancha (enfoque financiero):** 2-3 métricas → Libre de deudas en (info azul) + Total en intereses (danger rojo) + (si extra > 0) Te ahorrás $X (success verde).
   - **Bola de nieve (enfoque psicológico):** 2 métricas → **Cerrás tu primera deuda en X meses** (success verde, métrica principal porque es la victoria que esta estrategia optimiza) + Libre de deudas en (info azul, secundaria).
   - **Removida** la métrica "Total en intereses" de Bola de nieve (revertimos v7.4): aunque era el mismo dato financiero, ubicada en BN se interpretaba como costo agregado por elegir esa estrategia.
   - **Cada estrategia comunica ahora qué optimiza**: la primera métrica visible (lo más prominente) ya no es "Libre de deudas en" en ambas, sino la métrica que define el foco de la estrategia.
2. **Copy de recomendación sin números técnicos (`modules/dominio/compromisos/logic.js::recomendarEstrategia`):**
   - Antes (caso "diferencia >= 5 pts"): `"Hay una diferencia importante entre tus tasas (0.0% y 28.5% EA). Atacar la más cara primero te ahorra más dinero en total."`
   - Ahora: `"Tenés una deuda con tasa de interés mucho más alta que las otras. Atacarla primero reduce el peso de los intereses en tus finanzas y te hace ahorrar más a largo plazo."`
   - Antes (caso "todas con tasa 0"): `"Tus N deudas no cobran interés. Bola de nieve te ayuda a cerrar la más pequeña primero y mantener la motivación."`
   - Ahora: `"Tus deudas no cobran intereses, así que cerrar la más pequeña primero te da progreso visible sin perder plata por elegir un orden u otro."`
   - Antes (caso "tasas parecidas"): `"Tus tasas son parecidas (X% a Y% EA). Cerrar la deuda más pequeña primero te da impulso para seguir."`
   - Ahora: `"Tus deudas cobran tasas parecidas, así que el ahorro por elegir la más cara primero es pequeño. Cerrar la más chica te da impulso visible para seguir."`
   - Cero porcentajes mostrados al usuario. Cero términos como "EA" o "puntos" que requieren contexto financiero.
3. **Test de razón actualizado (`tests/unit/compromisos.test.js`):** ajustado regex tolerante a la nueva redacción (`/m[aá]s alta|intereses/i` en lugar del literal "diferencia"; `/no cobran inter[eé]s(es)?/i` para tolerar singular/plural y acento).

**Por qué la métrica "Libre de deudas en" daba igual sin extra:** matemáticamente, sin pagos extra cada deuda se paga al ritmo de su cuota mínima. La deuda más larga (ICETEX en el caso del usuario: $8M / $300k mes ≈ 27 meses) marca el "punto final" para ambas estrategias. Lo único que cambia entre Avalancha y BN sin extra es el ORDEN de cierre, no cuándo termina todo. Con extra mensual sí cambia: Avalancha lo manda a la tasa más alta y termina antes; BN lo manda a la más chica. Esto se mantiene como dato real (no se oculta), pero ahora la primera métrica de cada estrategia es distinta para que el usuario perciba enfoques diferentes incluso cuando "Libre de deudas en" coincide.

**Verificación visual:** screenshot en mobile dark theme con Bola de nieve seleccionada confirmó:
- "📊 TU IMPACTO" con "CERRÁS TU PRIMERA DEUDA EN: 6 meses" en verde + "Préstamo mama" como tip + "LIBRE DE DEUDAS EN: 1 año 7 meses" en azul.
- Sin métrica "Total en intereses".
- Copy de "ℹ️ CÓMO FUNCIONA" sin números técnicos.

**Archivos tocados:** `modules/dominio/compromisos/view.js`, `modules/dominio/compromisos/logic.js`, `tests/unit/compromisos.test.js`, `service-worker.js`.

**`service-worker.js`:** v71 → v72.

**Tests:** 932/932 verdes.

---

### refactor(compromisos) - v7.4: detalle compacto, mensaje "no aplica" y métricas consistentes · 2026-05-27

Iteración tras feedback del usuario sobre v7.3. Tres problemas: el detalle (3 bloques: Por qué te recomendamos / Qué te ofrece / Ideal si) saturaba la pantalla en mobile; al tocar una estrategia desactivada (Avalancha sin deudas con interés) no pasaba nada; y el orden de métricas en "Tu impacto" difería entre Avalancha y Bola de nieve, confundiendo la comparación.

**Cambios (`modules/dominio/compromisos/view.js`, `styles/components.css`):**

1. **Detalle compacto: 3 bloques → 2 bloques.** El primero ahora unifica razón + mecanismo + ideal en 1 párrafo:
   - Si es la recomendada: título "✨ Por qué te conviene" + razón (de `recomendarEstrategia`) + mecanismo + ideal.
   - Si NO es la recomendada: título "ℹ️ Cómo funciona" + mecanismo + ideal (sin razón).
   - Removidos `meta.beneficio` y `meta.ideal` de `_META_ESTRATEGIA`. Los textos viven ahora en `_RESUMEN_ESTRATEGIA` y se concatenan en `_renderResumenEstrategia`.
   - **Ahorro vertical:** ~180px en mobile.
2. **Cards "no aplica" siguen clicables.** Antes Avalancha sin tasas > 0 quedaba `disabled` (no clicable, tooltip que no funciona en mobile). Ahora:
   - La card lleva clase `.estrategia-card-pick--inactiva` (opacidad 0.6, nombre en `--fk-text-muted`).
   - Al hacer click se muestra `_renderNoAplica('avalancha')`: un bloque `.estrategia-card__no-aplica` (fondo `--fk-warning-bg`, borde 40% warning) con título "🔒 No aplica con tus deudas actuales", explicación ("Avalancha solo tiene sentido si hay al menos una deuda con tasa de interés mayor a 0...") y sugerencia ("usá Bola de nieve para cerrar primero la más chica").
   - El bloque "Tu impacto" no se renderiza en este caso (las métricas no tendrían sentido).
   - Removida la lógica que forzaba `_uiEstrategia.estrategia = 'bolaNieve'` cuando Avalancha no aplicaba (era cambio silencioso).
3. **Métricas en orden consistente entre estrategias.** Ambas muestran ahora, en el mismo orden:
   1. **Libre de deudas en** → `.estrategia-card__metrica-valor--info` (azul `var(--fk-info-text)` #3d8aff, informativo neutro).
   2. **Total que pagás en intereses** → `.estrategia-card__metrica-valor--danger` (rojo `var(--fk-danger-text)` #ff4757, lo que perdés).
   3. **Métrica única de cada estrategia** → `--success` (verde, el "premio" de elegir esa estrategia):
      - Avalancha: "Te ahorrás respecto a Bola de nieve $X" (solo si extra > 0).
      - Bola de nieve: "Cerrás tu primera deuda en X meses (nombre)".
   - **Bola de nieve ahora SÍ muestra intereses** (revertimos la decisión de v7.1). Razón: el usuario merece ver el costo real para comparar honestamente. Removida la métrica "Después de X meses solo te queda N deuda" porque rompía la lista fija de 3.
4. **CSS nuevo en `styles/components.css`:**
   - `.estrategia-card-pick--inactiva` (opacidad 0.6, color del nombre `--fk-text-muted`). Reemplaza `[disabled]`.
   - `.estrategia-card__metrica-valor--info` y `--danger` (junto al `--success` existente).
   - `.estrategia-card__no-aplica` (fondo warning, padding, gap, borde 40%).

**Verificación visual:** screenshot en mobile (375×812 dark) confirmó:
- Avalancha seleccionada con detalle compacto: bloque "✨ Por qué te conviene" + bloque "📊 Tu impacto" con "Libre de deudas en 1 año 7 meses" en azul y "Total que pagás en intereses $1.640.559" en rojo.
- Test del flow "no aplica" via `preview_eval` simulando `tasa=0` en todas las deudas: Avalancha aparece con clase `--inactiva` y al hacer click se reemplaza el detalle por el mensaje warning con sugerencia.

**Archivos tocados:** `modules/dominio/compromisos/view.js`, `styles/components.css`, `service-worker.js`.

**`service-worker.js`:** v70 → v71.

**Tests:** 932/932 verdes (sin cambios de lógica; solo presentación e UX).

---

### docs(compromisos) - v7.3: copy de estrategias explica el mecanismo · 2026-05-27

El copy previo de las estrategias daba el beneficio pero no el mecanismo. "Pagás menos intereses" (sin explicar por qué) y "Cerrás deudas rápido y mantenés la motivación" (que reducía Bola de nieve a algo puramente psicológico, ocultando su mecanismo real: la cuota liberada se reinyecta en la siguiente deuda). El usuario no podía elegir con información.

**Cambios (`modules/dominio/compromisos/view.js`, objeto `_META_ESTRATEGIA`):**

1. **Avalancha · `beneficio`:** "Pagás menos intereses en total. Atacás primero la deuda con la tasa más alta: como es la que más te cuesta, eliminarla rápido hace que cada peso siguiente vaya más al capital y menos a intereses."
2. **Avalancha · `ideal`:** "Te importa el ahorro en plata y aguantás que la primera deuda cerrada tarde un poco más." (antes: "Te importa pagar menos plata y podés mantener disciplina.")
3. **Bola de nieve · `beneficio`:** "Cada deuda cerrada acelera la siguiente. Atacás primero la más chica; cuando la terminás, la cuota que pagabas ahí se suma a la siguiente deuda. Así cada deuda libera más plata para la próxima, generando un efecto acumulativo (la \"bola\" que crece)."
4. **Bola de nieve · `ideal`:** "Necesitás ver progreso rápido para no abandonar, aunque pagues un poco más de intereses en total." (antes: "Te cuesta arrancar o necesitás ver progreso visible.")

**Principios aplicados:**

- **Mecanismo explícito** en el bloque 🎯 (no solo "qué"): cada estrategia explica *cómo* logra su beneficio.
- **Trade-off honesto** en el bloque 👤: Avalancha cuesta tiempo psicológico hasta cerrar la primera, Bola de nieve cuesta un poco más de intereses. Mostrar el costo permite elección informada.
- **Sin CSS nuevo**: solo cambia el texto. Las clases existentes manejan bien 2-3 frases en mobile.

**Verificación:** snapshot DOM en mobile (375×812) confirmó que ambos copys renderizan correctamente con Avalancha y Bola de nieve seleccionadas.

**`service-worker.js`:** v69 → v70.

**Tests:** 932/932 verdes (sin cambios de lógica).

---

### style(compromisos) - v7.2: recomendación como subtítulo interno · 2026-05-27

Iteración corta sobre v7.1. El usuario reportó visualmente que el badge "✨ Recomendada para vos" se veía como un sticker pegado encima del borde superior de la card, no como parte natural del diseño.

**Cambios:**

1. **Eliminado el badge flotante (`.estrategia-card-pick__badge`):** tenía `position: absolute` con `top: calc(-1 * --fk-space-2)` y `transform: translateX(-50%)`, lo que lo hacía sobresalir fuera del borde. Visualmente parecía una etiqueta autoadhesiva.
2. **Nuevo subtítulo interno (`.estrategia-card-pick__sub`):** texto verde semibold (`var(--fk-success-text)`, `font-weight: 600`, `font-size: xs`) ubicado dentro de la card, debajo del nombre de la estrategia. Sin fondo, sin borde, sin sombra: integrado al flow vertical natural (ícono → nombre → recomendación).
3. **Slot reservado en cards no recomendadas (`.estrategia-card-pick__sub--ghost`):** un span con `visibility: hidden` y `&nbsp;` mantiene la misma altura en la card no recomendada. Resultado: ambas cards alinean perfectamente en el grid (verificado en preview: 112.77px = 112.77px).
4. **`service-worker.js`:** v68 → v69.

**Archivos tocados:** `modules/dominio/compromisos/view.js`, `styles/components.css`, `service-worker.js`.

**Tests:** 932/932 verdes (UI pura).

---

### refactor(compromisos) - v7.1: contraste de badge + métricas específicas por estrategia · 2026-05-27

Iteración sobre el rediseño v7 de "Estrategia de pago". El usuario reportó tres problemas concretos: el badge "Recomendada para vos" ilegible en ambos temas, "Pagás $X en intereses" mostrándose en Bola de nieve aunque no corresponde a esa estrategia, y la sensación general de que ambas estrategias mostraban la misma información en vez de la que realmente importa para cada decisión.

**Motivación:**

- En light theme el badge salía con texto negro sobre verde oscuro (ilegible). En dark theme salía como verde neón saturado con texto blanco (molesto).
- Bola de nieve es una estrategia psicológica (cerrar deudas rápido para mantener motivación). Mostrar "intereses totales" en ella es como mostrar "ahorro" en una dieta de placebo: no es la métrica que esa estrategia optimiza.
- El usuario pidió explícitamente que cada estrategia tenga 3 secciones: qué beneficio ofrece, qué impacto tiene en su situación, y para qué tipo de persona aplica.

**Cambios:**

1. **Fix del badge "Recomendada para vos" (`styles/components.css::.estrategia-card-pick__badge`):**
   - **Causa raíz:** `var(--fk-bg)` **no existe** en `styles/tokens.css` (los tokens reales son `--fk-bg-base`, `--fk-bg-surface`, `--fk-bg-elevated`). Cuando el navegador no resuelve una custom property, la propiedad cae al valor heredado: por eso en light theme el `color` heredaba el `--fk-text-primary` (casi negro #1a1d27) y en dark heredaba blanco.
   - **Solución:** patrón estándar del proyecto para chips de éxito (ver `.chip-success` línea 648): `background: var(--fk-success-bg)` (10-12% alpha) + `color: var(--fk-success-text)` (verde sólido legible en cada tema) + `border: 1px solid color-mix(in srgb, var(--fk-success) 40%, transparent)`.
   - **Resultado:** chip outline-style con contraste WCAG AAA en ambos temas (~7:1 en light, ~6:1 en dark) y sin saturación neón molesta.
2. **Fix de otros tokens inexistentes en mi código nuevo:** reemplazados 7 usos de `var(--fk-bg)` / `var(--fk-text)` / `var(--fk-border)` (que no existen) por `--fk-bg-surface` / `--fk-text-primary` / `--fk-border-default`. Solo en clases que escribí en v7 (estrategia-card-pick, placeholder, link, acordeón, metricas). Los bugs latentes en componentes pre-existentes (`.orden-badge`, `.estrategia-card__paso`, etc.) quedan fuera de scope.
3. **Métricas específicas por estrategia (`compromisos/view.js`):**
   - Nuevo `_renderImpactoAvalancha`: "Libre de deudas en X" + "Total que pagás en intereses $Y" + (si extra > 0 y hay ahorro real) "Te ahorrás respecto a Bola de nieve $Z y T meses" en color verde success.
   - Nuevo `_renderImpactoBolaNieve`: "Cerrás tu primera deuda en X meses" (con nombre de la deuda como tip italic) en verde success + (si ≥3 deudas) "Después de Y solo te queda N deuda" + "Libre de deudas en T". **Sin métrica de intereses** por decisión deliberada.
   - Wording: "A los X meses" → "Después de X" (mejor con singulares como "1 año").
4. **Estructura unificada en 3 bloques (`_renderDetalleEstrategia`):** cada estrategia se renderiza con el mismo esqueleto: `🎯 Qué te ofrece` (1 frase del beneficio principal) + `📊 Tu impacto` (la lista de métricas específicas) + `👤 Ideal si...` (perfil del usuario al que le sirve). La razón de la recomendación ("¿Por qué te la recomendamos?") se ubica arriba del primer bloque, solo si la estrategia activa es la recomendada.
5. **`_META_ESTRATEGIA` reformulado:** los campos `descripcion` (HTML largo) e `ideal` quedaron reemplazados por `beneficio` (1 frase corta para el bloque 🎯) e `ideal` (texto plano para 👤).
6. **CSS (`styles/components.css`):**
   - Nuevos `.estrategia-card__bloque`, `.estrategia-card__bloque-titulo` (mayúscula tracking 0.04em, font-size xs), `.estrategia-card__bloque-body`.
   - Nuevos `.estrategia-card__metricas` (lista en superficie), `.estrategia-card__metrica`, `.estrategia-card__metrica-label/valor/tip` y modificador `.estrategia-card__metrica-valor--success` (verde para "te ahorrás" y "primera deuda cerrada").
   - Removidos `.estrategia-card__desc`, `.estrategia-card__ideal` y todo el bloque `.estrategia-card__hero*` (la métrica única hero se reemplazó por la lista de métricas variables).
   - Media query `<480px` ajusta la lista de métricas a font-size base.
7. **`service-worker.js`:** v67 → v68.

**Verificación visual:** screenshots tomados en mobile (375×812) en light y dark theme. Validado:
- Light: badge verde oscuro sobre fondo verde sutil, legible. Métricas de Avalancha con "Te ahorrás $71.300" en verde destacado.
- Dark: badge verde apagado sobre fondo de mismo tono, sin neón. Métricas de Bola de nieve con "Cerrás tu primera deuda en 6 meses (Prestamo mama)" en verde.

**Archivos tocados:** `modules/dominio/compromisos/view.js`, `styles/components.css`, `service-worker.js`.

**Tests:** 932/932 verdes (sin cambios de lógica; solo presentación).

---

### chore(infra) - Service worker deshabilitado en desarrollo · 2026-05-27

Mientras se iteraba CSS/JS en la sesión actual, el usuario reportó que la página se veía "mezclada" (CSS viejo + HTML nuevo) y debía hacer Ctrl+Shift+R cada vez. Causa: el service worker estaba cacheando assets viejos y el bump de `CACHE_NAME` no se propagaba sin recarga forzada.

**Motivación:**

- El SW está pensado para garantizar offline-first en **producción**, no para soportar el ciclo de desarrollo iterativo.
- En localhost el desarrollador necesita ver cambios al instante; un SW cache-first va en contra de eso.
- Práctica estándar (CRA, Vite PWA, Workbox docs): registrar el SW solo en hostnames de producción.

**Cambios:**

1. **`modules/infra/sw-register.js`:** detección de entorno de desarrollo con una variable `_esDesarrollo` que cubre `localhost`, `127.0.0.1`, `0.0.0.0`, hostname vacío, `*.local`, `192.168.*` y `10.*` (LAN dev). Si estamos en dev:
   - Llama a `navigator.serviceWorker.getRegistrations()` y desregistra todo lo que haya.
   - Llama a `caches.keys()` y borra todos los caches.
   - No registra ningún SW nuevo.
2. **En producción:** comportamiento sin cambios. Sigue el flujo de `controllerchange` con auto-reload + `reg.update()` al arrancar.
3. **`service-worker.js`:** v66 → v67 por consistencia (necesario para que los clientes de producción con SW activo se actualicen al próximo deploy).

**Migración para el usuario (una sola vez):** después de pullear este cambio se necesita un último Ctrl+Shift+R para que el browser cargue el `sw-register.js` nuevo. De ahí en adelante, F5 normal sirve todo de red y los cambios se ven al instante.

**Verificación:** en preview a `http://localhost:8081` se confirmó por consola que tras un reload `navigator.serviceWorker.getRegistrations()` devuelve `[]` y `caches.keys()` devuelve `[]`. Sin errores en console.

**Archivos tocados:** `modules/infra/sw-register.js`, `service-worker.js`.

**Tests:** 932/932 verdes (sin cambios de lógica).

---

### refactor(compromisos) - Estrategia de pago como cards + recomendación + acordeón · 2026-05-27

Rediseño UX completo de la card "Estrategia de pago" en Compromisos, en dos pasadas. La pasada inicial (progressive disclosure por extra=0/extra>0) se descartó porque el usuario detectó que el input del extra mensual seguía siendo funcionalidad oculta. Esta entrada describe la versión final.

**Motivación final:**

- "Ambas estrategias dan el mismo resultado" (cuando extra=0) era confuso para el usuario, aunque técnicamente correcto.
- El input "¿Cuánto extra podés pagar al mes?" estaba siempre arriba sin contexto: una persona que no entiende qué significa "extra" lo dejaba vacío sin descubrir la funcionalidad.
- Faltaba una guía pedagógica que sugiriera **qué estrategia conviene** a cada persona según el perfil de sus deudas.

**Cambios:**

1. **Header sin pregunta intrusiva (`compromisos/view.js::renderEstrategiaPago`):** "💡 Estrategia de pago" + "Finko te ayuda a tomar mejores decisiones con tus deudas." Cero inputs visibles al arrancar.
2. **Dos cards seleccionables grandes (Avalancha / Bola de nieve):** layout grid 1fr 1fr, ícono grande, nombre debajo, borde verde sólido + fondo accent cuando está activa, badge "✨ Recomendada para vos" flotante en la que corresponde según la heurística. Tap target ≥96px (mobile-friendly).
3. **`recomendarEstrategia(deudas)` puro en `logic.js`:**
   - 0/1 deuda → `{ estrategia: null, razon: '' }` (no se recomienda).
   - Todas con tasa 0 → Bola de nieve (Avalancha no aplica).
   - Diferencia `tasaMax - tasaMin` ≥ 5 puntos EA → Avalancha (el ahorro justifica el esfuerzo).
   - Tasas similares (<5 pts) → Bola de nieve (la motivación pesa más que el ahorro marginal).
   - **Tolerante a punto flotante:** redondea la diferencia a 2 decimales antes de comparar (evita `0.15 - 0.10 = 0.04999...` que rompía el umbral exacto de 5 pts).
4. **Detalle dinámico bajo la card seleccionada (`_renderDetalleEstrategia`):**
   - Descripción ("Pagás primero la deuda con la **tasa más alta**. Ahorrás más intereses a largo plazo.").
   - Uso ideal ("Ideal si tu objetivo es pagar menos plata en total.").
   - Razón de la recomendación con cifras reales del usuario (solo si es la recomendada): "Hay una diferencia importante entre tus tasas (0.0% y 28.5% EA). Atacar la más cara primero te ahorra más dinero en total."
   - Métrica hero "Libre de deudas en **X**" (`--fk-text-2xl`) con intereses totales como meta secundaria y tip "(lo que vas a pagar de más por encima del saldo)".
   - Comparación de ahorro solo si extra > 0 y hay diferencia real.
5. **Placeholder cuando nada está seleccionado:** "Tocá una estrategia para ver el detalle y cómo te ayuda."
6. **Acordeón opcional "💪 ¿Podés pagar algo extra cada mes?"** colapsado por defecto. Al expandir muestra el input numérico, descripción educativa y botón `✕` para cerrar. Auto-focus al input al abrir (UX teclado).
7. **`_formatearDuracion(meses)`:** ≥12 meses → "X años Y meses" respetando singulares. "28 meses" → "2 años 4 meses".
8. **Decisión de dominio:** la lógica de Avalancha sigue priorizando por **tasa** (no por interés absoluto en pesos como sugirió el usuario). Razón: el efecto cascada hace que Avalancha por tasa sea matemáticamente óptima incluso con deudas chicas de alta tasa, porque al cerrar la chica se liberan flujos hacia las grandes. Se explicó al usuario con su propio ejemplo numérico.
9. **CSS (`styles/components.css`):** nuevos `.estrategia-cards`, `.estrategia-card-pick`, `.estrategia-card-pick--activa`, `.estrategia-card-pick__badge/icono/nombre`, `.estrategia-card__detalle/desc/ideal/razon/placeholder/link/acordeon*`. Removidos `.estrategia-card__controls/toggle/cta/inicial` (de la versión anterior).
10. **`service-worker.js`:** v64 → v66 (acumulado tras dos iteraciones del rediseño).

**Archivos tocados:** `modules/dominio/compromisos/view.js`, `modules/dominio/compromisos/logic.js`, `modules/dominio/compromisos/index.js`, `styles/components.css`, `service-worker.js`, `tests/unit/compromisos.test.js`.

**Tests:** 932/932 verdes (+6 nuevos casos para `recomendarEstrategia`: una deuda, lista vacía/inválida, todas con tasa 0, diferencia ≥5pts, tasas similares, límite exacto de 5pts).

---

### fix(compromisos) - Wording neutro + estética del chooser · 2026-05-27

Hotfix sobre el chooser de Tarea 3 con dos puntos del usuario.

**Cambios:**

1. **Wording neutro en chooser y form personal (`compromisos/view.js`):**
   - Chooser desc: "Familiar, amigo, gota a gota." → "Familiar, amigo, natillera o prestamista particular."
   - Placeholder personal: "Ej. Préstamo de mamá, Gota a gota" → "Ej. Préstamo de mamá, Crédito particular".
   - Hint tasa personal: "El gota a gota suele cobrar..." → "Los prestamistas particulares (natilleras, persona natural) suelen cobrar entre 5% y 20% mensual."
   - Motivo: "gota a gota" tiene connotación de actividad ilegal; la práctica de tasas 5-20% mensual aplica a varios tipos de prestamistas informales (natilleras, particulares).

2. **CSS del chooser arreglado (`styles/components.css`):**
   - Bug original: usé tokens inexistentes (`--fk-surface-2`, `--fk-font-size-sm`, `--fk-border`). Las propiedades se ignoraban silenciosamente y las cards se veían "sueltas" sin fondo ni borde definido.
   - Tokens correctos: `--fk-bg-elevated`, `--fk-text-sm/lg/xs`, `--fk-border-default`, `--fk-radius-lg`, `--fk-shadow-sm/md/glow`, `--fk-accent-subtle`.
   - Mejoras visuales: cards con `box-shadow` y `border-radius lg` (16px), icono dentro de círculo verde-acento de 56px, hover con `translateY(-2px) + shadow-glow`, padding mayor (24px). Layout responsive: en pantallas <480px las cards se apilan horizontalmente con icono a la izquierda.

3. **`service-worker.js`:** v63 → v64.

**Archivos tocados:** `modules/dominio/compromisos/view.js`, `styles/components.css`, `service-worker.js`.

**Tests:** 926/926 verdes.

---

### refactor(compromisos) - Chooser entidad/personal + lista única reordenable · 2026-05-27

Rediseño del modal "Nueva deuda" y de la card de estrategia de pago. Responde a feedback del usuario (4 puntos reportados).

**Motivación:**
- El form unificado (selector de tipo + todos los campos juntos) era confuso para usuarios que no distinguen deuda con entidad de deuda personal.
- La card de estrategia Avalancha/Bola de nieve mostraba la lista de deudas internamente (`<ol>`), y debajo existía una segunda lista (`#lista-compromisos`). La misma información aparecía dos veces, haciendo invisible el reordenamiento al cambiar estrategia.
- El "bug" de avalancha reportado no era un bug de lógica: el reordenamiento funcionaba, pero la duplicación lo ocultaba.

**Cambios:**

1. **Modal en 2 pasos (`compromisos/view.js`, `compromisos/index.js`):**
   - Paso 1: chooser con 2 tarjetas grandes ("🏦 Entidad" / "🤝 Personal") + descripción de cada tipo.
   - Paso 2: form tailored por tipo. Entidad: tasa EA obligatoria + referencia a la usura vigente. Personal: tasa mensual opcional + hint de gota a gota.
   - Botón "← Volver" regresa al chooser. Título del modal se actualiza ("Nueva deuda" → "Deuda con entidad" / "Deuda personal").
   - `tipo` va en `<input type="hidden">` (el usuario ya eligió en el chooser, no necesita un selector).

2. **Lista única reordenable (`compromisos/view.js`):**
   - Eliminado `<ol class="estrategia-card__orden">` de `renderEstrategiaPago()`.
   - La card ahora muestra: controles (extra mensual + toggle) + resumen (meses libre, intereses) + comparación de ahorro.
   - Solo `#lista-compromisos` con badges 1°, 2°, 3° que se reordenan al clickear estrategia.
   - Subtítulo de la card: "La lista de abajo se reordena según la estrategia activa."

3. **CSS (`styles/components.css`):**
   - Nuevas clases: `.comp-chooser`, `.comp-chooser__btn`, `.comp-chooser__icon`, `.comp-chooser__label`, `.comp-chooser__desc`, `.comp-chooser__pregunta`.

4. **`service-worker.js`:** v62 → v63.

**Archivos tocados:** `modules/dominio/compromisos/view.js`, `modules/dominio/compromisos/index.js`, `styles/components.css`, `service-worker.js`.

**Tests:** 926/926 verdes (sin tests nuevos: cambios son UI pura, sin lógica de negocio nueva).

---

### feat(agenda) - Botón "+ Agregar gasto fijo" en Agenda · 2026-05-27

Cierre de Tarea 2 (post v6). Después del rediseño de Compromisos a solo deudas, la sección Agenda recibe el punto de entrada para crear gastos fijos.

**Motivación:**
- Tras el rediseño v6 los `tipo='fijo'` ya conviven en `S.compromisos`, pero no había forma de crearlos desde la UI (el modal de Compromisos pasó a ser solo deudas).
- Conceptualmente los gastos fijos (arriendo, servicios, suscripciones) son recordatorios calendario, no obligaciones financieras con saldo. Encajan en Agenda.

**Cambios:**

1. **`index.html`:**
   - Botón "+ Agregar gasto fijo" en el header de `#sec-agenda` (`data-action="nuevo-gasto-fijo"`).
   - Nuevo modal `#modal-gasto-fijo` con body vacío para inyección.
   - Título del modal de Compromisos cambia de "Nuevo compromiso" a "Nueva deuda" (alineado con v6).

2. **`modules/dominio/agenda/view.js`:**
   - Nueva función exportada `renderFormGastoFijo()`: form simplificado con 4 campos visibles (descripcion, monto, frecuencia, día de pago) + `<input type="hidden" name="tipo" value="fijo">`.

3. **`modules/dominio/agenda/index.js`:**
   - Handlers `_nuevoGastoFijo` y `_guardarGastoFijo`.
   - Reusa `validarCompromiso` + `normalizarCompromiso` de `compromisos/logic.js` (puras, ya cubren shape `fijo`).
   - `_inyectarFormGastoFijo()` reinyecta el form en cada apertura: `resetModal` borraría el hidden `tipo` y el `selected` de Mensual.

4. **`service-worker.js`:** v61 → v62.

**Bug encontrado y arreglado durante el desarrollo:** `resetModal` (en `modules/ui/modales.js`) hace `el.value = ''` para todos los inputs incluidos `type="hidden"` y `<select>` con `selected`. Esto vacía el hidden `tipo='fijo'` y desselecciona Mensual del default. Workaround local: reinyectar el form al abrir el modal en vez de llamar `resetModal`. (Sin tocar `modales.js` para no introducir regresiones en otros modales.)

**Tests:** 926/926 verdes (sin tests nuevos: la lógica reusada ya estaba cubierta en `compromisos.test.js`).

**Verificación manual:** Agenda → "+ Agregar gasto fijo" → llenar (Netflix, 25.000, Mensual, día 10) → Guardar. El día 10 muestra dot naranja y el compromiso aparece al hacer click en el día.

---

### refactor(compromisos) - Rediseño v6: solo deudas (entidad / personal) + estrategia arriba · 2026-05-27

Rediseño de la sección Compromisos a partir del feedback del usuario.

**Motivación:**
- La sección "Compromisos" mezclaba gastos fijos (arriendo) con deudas (tarjeta, gota a gota), confundiendo dos conceptos distintos.
- Los campos saldoPendiente y tasaEA eran opcionales y se entendían mal: la gente interpretaba `monto` como "lo que debo" cuando en realidad era la cuota mensual.
- En Colombia los préstamos personales (gota a gota) cobran tasa **mensual** (5-20%), no anual. El form solo permitía EA.
- La card de estrategia Avalancha/Bola de Nieve vivía abajo y solo aparecía con ≥2 deudas. No definía el orden de la lista.

**Cambios:**

1. **Schema v5 → v6 con migración automática:**
   - `tipo: 'deuda'` → `'deuda-entidad'` (banco/fintech/tarjeta).
   - `tipo: 'agenda'` → `'fijo'` con `frecuencia='Única vez'`.
   - `tipo: 'fijo'` sin cambios.
   - Nuevos campos para deudas: `saldoTotal` (lo que aún se debe), `cuotaMensual` (lo que se paga al mes), `tasa` + `tasaUnidad` ('EA' o 'mensual').
   - Migración mapea: `saldoTotal = saldoPendiente ?? monto * 12`, `cuotaMensual = monto`, `tasa = tasaEA ?? 0`, `tasaUnidad = 'EA'`.

2. **Sección Compromisos (solo deudas):**
   - Formulario nuevo: tipo (entidad/personal) + descripción + saldoTotal + cuotaMensual + tasa (con selector EA/mensual) + frecuencia + diaPago.
   - Validación: deuda-entidad exige tasa EA obligatoria; deuda-personal puede tener tasa opcional (mensual usual para gota a gota).
   - Card de estrategia subida al tope: define el orden de pago aplicado a la lista (badge 1°, 2°, 3°…).
   - Avalancha se deshabilita si no hay ninguna deuda con tasa > 0 (no aporta info).
   - Eliminado el nudge superior "1 pago vence en X días" (ya vive en el Dashboard).

3. **Cross-domain:**
   - `analisis/logic.js::calcularPasivos`: usa `saldoTotal` y acepta deuda-entidad + deuda-personal.
   - `tesoreria/view.js`: distribución de prima detecta ambos tipos de deuda.
   - `compromisos/logic.js::detectarDeudasDurmiendo`: nuevo modelo.
   - `infra/form-errors.js`: mapea errores de los nuevos campos.

**Archivos:**
- `modules/core/state.js`: typedef Compromiso actualizado; `_version: 6`.
- `modules/core/storage.js`: migración v5→v6 + bump SCHEMA_VERSION.
- `modules/dominio/compromisos/logic.js`: nuevos catálogos (TIPOS_DEUDA, esDeuda, tasaMensualToEA, tasaEADe); validar/normalizar reescritos; calcularCompromisoMensual y filtrarDeudasPagables adaptados; detectarDeudasDurmiendo usa saldoTotal/cuotaMensual.
- `modules/dominio/compromisos/view.js`: renderFormCompromiso reescrito (solo deudas); renderListaCompromisos ordena según estrategia; _renderCompromisoItem muestra saldo+cuota+tasa+badge orden; renderEstrategiaPago vive arriba y aparece desde 1 deuda; renderNudgeMoraInminente eliminado.
- `modules/dominio/compromisos/index.js`: removido import del nudge; lista se re-renderiza al cambiar estrategia.
- `modules/dominio/analisis/logic.js`: calcularPasivos usa saldoTotal y filtra ambos tipos de deuda.
- `modules/dominio/tesoreria/view.js`: detección de deudas para distribución de prima.
- `modules/infra/form-errors.js`: mapeo de campos saldoTotal/cuotaMensual/tasa/tasaUnidad.
- `index.html`: estrategia arriba, lista abajo, nudge superior removido, botón "+ Nueva deuda".
- `styles/components.css`: `.tasa-input-group`, `.orden-badge`, estado disabled de Avalancha.
- `tests/unit/storage.test.js`: +4 tests para migración v5→v6.
- `tests/unit/state.test.js`: `_version` actualizado a 6.
- `tests/unit/compromisos.test.js`: fixtures + tests adaptados al nuevo modelo (validar, normalizar, filtrarDeudasPagables, detectarDeudasDurmiendo, detectarVencidosCompletos, detectarFijosSinPagarEsteMes).
- `tests/unit/analisis.test.js`: deuda fixture + calcularPasivos adaptados.
- `service-worker.js`: v60 → v61.

**Tests:** 926/926 verdes (+4 nuevos por la migración).

**Pendiente para próxima sesión (Tarea 2):** mover el botón "+ Agregar gasto fijo" a la sección Agenda con un formulario simplificado. Los tipos `fijo` ya existen en S.compromisos; solo falta el punto de entrada.

---

### fix(dash) - Vencidos no marca compromisos recién creados + re-render desde compromisos · 2026-05-26

Dos bugs reportados sobre el dashboard nuevo:

**Bug #1: compromiso nuevo aparecía como vencido.**
Al agregar un compromiso cuyo día de pago ya pasó este mes (ej. hoy 26, diaPago=15),
el panel "Vencidos" lo marcaba como mora aunque acabara de crearse. El ciclo del
día 15 nunca le aplicó: el compromiso aún no existía.

**Fix:** `detectarVencidosCompletos()` y `detectarFijosSinPagarEsteMes()` ahora
miran `fechaCreacion` (que ya se setea automáticamente en `crud.js`). Si el
compromiso se creó este mismo año/mes después de su día de pago, se excluye
del panel. Su próximo vencimiento real es el mes siguiente.

**Bug #2: dashboard no se actualizaba al crear/editar compromisos desde la sección
Compromisos.** El handler de `state:change` para `compromisos` solo llamaba a
`_renderTodo()`, no a `_renderDashboardPanels()`. Si el usuario volvía a `#dash`
sin disparar hashchange, el panel quedaba con datos viejos.

**Fix:** Agregado `renderSmart(_renderDashboardPanels, 'dash')` al listener de
`state:change`. `renderSmart` corta si la sección activa no es 'dash', así que
es barato llamarlo siempre.

**Archivos:**
- `modules/dominio/compromisos/logic.js`: regla anti-falso-positivo con
  `fechaCreacion` en `detectarVencidosCompletos` y `detectarFijosSinPagarEsteMes`.
- `modules/dominio/compromisos/index.js`: re-render del dashboard en `state:change`.
- `tests/unit/compromisos.test.js`: +5 tests (4 para vencidos completos, 1 para fijos).
- `service-worker.js`: v59→v60.

**Tests:** 920/920 verdes (+5).

---

### refactor(dash) - Dashboard acción-orientado: Vencidos + Próximas Prioridades · 2026-05-26

Rediseño del dashboard para mostrar **solo** información de acción inmediata
("qué tengo que hacer hoy" y "qué se viene pronto"), eliminando contadores
genéricos que no aportaban contexto.

**Motivación del usuario:**
- "Compromisos activos: 3" y "Me deben: 1" eran números sin contexto.
- No había forma rápida de saber qué cuotas/arriendos vencían pronto sin entrar
  a Compromisos.
- No había sección de "Vencidos" para gastos/cuotas que ya pasaron el día de pago.
- Balance del mes y análisis de ingresos/gastos/metas estaban mal ubicados:
  el dashboard debería ser acción inmediata, no análisis histórico.

**Cambios:**
- **Eliminado del dashboard:** bento de Ingresos del mes, Gastos del mes, Metas
  activas, Compromisos activos, Me deben. Card "Hoy" (fusionada con Próximas
  Prioridades).
- **Nuevo `#panel-vencidos`:** compromisos cuyo día de pago ya pasó (los 3 tipos:
  fijo, deuda, agenda). Hasta ~3 items visibles, resto con scroll vertical
  interno (max-height) para no inflar el dashboard. Color de borde izquierdo
  por severidad: amarillo (leve, ≤3 días), naranja (moderada, 4-10), rojo (urgente, >10).
- **Nuevo `#panel-prioridades`:** próximos 7 días agrupados por día. Etiquetas
  "Hoy" (destacado en accent), "Mañana", "En N días". Cada grupo lista
  ícono + descripción + monto del compromiso.
- **Nueva `.balance-tira`:** Balance del mes como tira simple (no card grande),
  ya que es el único indicador combinado de acción inmediata que justifica
  quedarse en dashboard. Color por signo (verde positivo, rojo negativo).
- **Score de Salud Financiera:** sigue en Análisis (donde estaba). Ingresos/gastos
  del mes individuales: ya existían en Análisis (`generarResumen`), no había que
  moverlos.

**Decisiones de diseño:**
- Card "Hoy" se fusionó con Próximas Prioridades para eliminar redundancia
  (ambos mostraban eventos del día actual).
- Vencidos cubre los 3 tipos de compromiso (fijo + deuda + agenda) usando la
  misma fórmula `diasAtraso = diaHoy - diaPago` para simplicidad.
- Limitación aceptada: agenda con frecuencia='Única vez' de meses anteriores
  calcula atraso contra el mes en curso, no contra la fecha original. Se resuelve
  con disciplina del usuario (toggle activo=false al pagar).
- Fix de timezone para "venció hoy": se reemplazó `toISOString().slice(0,10)`
  por `_hoyISOLocal()` (usa getFullYear/getMonth/getDate). En GMT-5, después
  de 19:00 local, `toISOString` devolvía el día siguiente, generando un día de
  atraso fantasma.

**Arquitectura:**
- Ambos paneles viven en `compromisos/view.js` (no se creó dominio `dashboard/`):
  son vistas de los compromisos, no de un dominio nuevo.
- Render orquestado via `registrarRender(() => renderSmart(fn, 'dash'))` para
  que reaccionen a cualquier `state:change`. hashchange agrega rerender al
  navegar a `#dash`.

**Archivos:**
- `modules/dominio/compromisos/logic.js`: + `detectarVencidosCompletos(comp, hoyISO)`
  (extensión de `detectarFijosSinPagarEsteMes` a los 3 tipos); + `agruparPorDiasRestantes(proximos)`
- `modules/dominio/compromisos/view.js`: + `renderPanelVencidos()` + `renderPanelPrioridades()`
  + helper `_hoyISOLocal()`
- `modules/dominio/compromisos/index.js`: importa `registrarRender` y los nuevos
  renders; `_renderDashboardPanels()` agrupa ambos; suscripción a `renderSmart(fn, 'dash')`
- `modules/dominio/agenda/view.js`: eliminada `renderCardHoy()` (obsoleta)
- `modules/dominio/agenda/index.js`: quitado import de `registrarRender` y `renderCardHoy`
- `index.html`: `#sec-dash` reestructurado completo (hero solo, panel-vencidos,
  panel-prioridades, balance-tira); eliminados `#panel-hoy` y `#bento-dash`
- `styles/components.css`: + `.bento__cell--solo`, `.vencidos-card`, `.prioridades-card`,
  `.balance-tira` (con reuse de `bento__value--accent/danger` para color por signo);
  eliminado `.hoy-card`
- `service-worker.js`: v58→v59
- `tests/unit/compromisos.test.js`: +14 tests (9 para `detectarVencidosCompletos`,
  5 para `agruparPorDiasRestantes`)

**Tests:** 915/915 verdes (+14 sobre 901).

---

### feat(gastos) - Selector de mes anterior/siguiente sobre la lista · 2026-05-23

Encabezado `‹ Mayo 2026 ›` encima de los chips de categoría. Permite revisar gastos
de cualquier mes sin exportar CSV. El filtro de categoría se resetea al navegar de mes.
El mes seleccionado persiste durante la sesión.

**Archivos:**
- `modules/dominio/gastos/view.js`: constante `MONTHS`; estado local `_viewYear`/`_viewMonth`; `_ensureMes()`; `navegarMesGastos(delta)` exportada; `renderFiltrosGastos()` incluye `.mes-nav` + chips; `renderListaGastos()` usa el mes de la vista en lugar de `hoy()`
- `modules/dominio/gastos/index.js`: `_prevMes()` / `_nextMes()`; acciones `gastos-prev-mes` y `gastos-next-mes` registradas; import de `navegarMesGastos`
- `styles/components.css`: bloque `.mes-nav` (btn, label, hover, focus-visible)
- `service-worker.js`: v57→v58

**Tests:** 901/901 verdes (sin tests nuevos: la navegación es análoga a `navegarMes` en Agenda; `gastosMes` ya estaba cubierta).

---

### feat(gastos) - Filtro por categoría con chips fijos sobre la lista · 2026-05-23

Chips de categoría encima de la lista de gastos del mes. "Todos" activo por defecto.
Un chip por categoría presente en el mes; al hacer clic filtra la lista en tiempo real.
El filtro persiste en la sesión y se auto-resetea si la categoría activa desaparece.
Si la categoría activa no tiene gastos, muestra "Sin gastos en esta categoría" + "Ver todos".

**Archivos:**
- `modules/dominio/gastos/logic.js`: `filtrarGastos(gastos, categoria)` (función pura)
- `modules/dominio/gastos/view.js`: estado local `_filtroCategoria`; `renderFiltrosGastos()`; `setFiltroCategoria()`; `renderListaGastos()` aplica filtro; `_renderEmptyFiltro()`
- `modules/dominio/gastos/index.js`: acción `gastos-filtrar-cat`; `renderFiltrosGastos` en EventBus y hashchange
- `index.html`: `<div id="panel-filtros-gastos">` antes de `#lista-gastos`
- `styles/components.css`: `.filtros-bar` + `.chip` + `.chip--active`
- `service-worker.js`: v56→v57
- `tests/unit/gastos.test.js`: +8 tests para `filtrarGastos`

**Tests:** 901/901 verdes.

---

### feat(dash) - Card "Hoy" con mini-agenda del día en el Dashboard · 2026-05-23

**Motivación:** El Dashboard es la pantalla más vista. Tener que ir a Agenda para saber
qué compromisos vencen hoy genera un viaje extra innecesario. La card "Hoy" trae ese
contexto directo al Dashboard, donde el usuario ya está mirando.

**Comportamiento:**
- Con compromisos hoy: lista hasta 3 items (ícono de tipo, nombre, monto) + "+N más"
- Sin compromisos hoy pero hay próximos (ventana 14 días): "Sin compromisos hoy. Próximo: [nombre] mañana / en N días."
- Sin nada próximo: "Sin compromisos próximos. 🎉"
- Sin compromisos activos registrados: card no se renderiza (sin ruido para usuarios nuevos)
- Link "Ver agenda" en el header lleva directamente al calendario

**Archivos:**
- `modules/dominio/agenda/logic.js`: ya tenía `eventosDeHoy()` y `eventosEnProximos()` (añadidos en tarea anterior)
- `modules/dominio/agenda/view.js`: nueva función exportada `renderCardHoy()`; import extendido con las dos funciones de logic
- `modules/dominio/agenda/index.js`: importa `registrarRender` (nuevo) y `renderCardHoy`; `registrarRender(() => renderSmart(renderCardHoy, 'dash'))` sincroniza con estado global; hashchange cubre 'agenda' y 'dash'
- `index.html`: `<div id="panel-hoy">` insertado entre `.quick-add` y `#bento-dash`
- `styles/components.css`: bloque `.hoy-card` completo (header, title, link, body, list, item, dot, name, amount, more, empty, prox)
- `service-worker.js`: v55→v56
- `tests/unit/agenda.test.js`: +13 tests para `eventosDeHoy` (5 casos) y `eventosEnProximos` (7 casos) con `vi.useFakeTimers()`; import extendido a las 4 funciones exportadas

**Tests:** 893/893 verdes.

---

### refactor(ux) - Menú reordenado por frecuencia de uso real · 2026-05-23

**Motivación:** El usuario identificó 3 secciones de uso diario (Dashboard, Gastos, Agenda)
y señaló que Tesorería es setup inicial (se usa una sola vez, luego Finko actualiza saldos
automáticamente). El menú anterior ponía Tesorería en el bottom nav de mobile en lugar de Agenda.

**Cambios en `index.html`:**

Mobile bottom nav (slots visibles sin abrir Más):
- Antes: Dashboard · Gastos · Tesorería · [Más]
- Después: Dashboard · Gastos · Agenda · [Más]

Desktop sidebar, 3 grupos ordenados por frecuencia:
- Grupo "Diario": Dashboard, Gastos, Agenda, Compromisos
- Grupo "Gestión": Tesorería, Me deben, Metas, Presupuesto
- Grupo "Herramientas": Análisis, Calculadoras

Modal "Más" en mobile:
- Agrega Tesorería (ahora secundaria)
- Quita Agenda (ya accesible desde bottom nav)

**Otros cambios:**
- `playwright.config.js`: `retries: 1` para absorber flakes del SW entre workers paralelos
- `tests/e2e/smoke.test.js`: `test.describe.serial('Onboarding')` para evitar contaminación
- `service-worker.js`: v54→v55

**Tests:** 880/880 unit, 48/48 E2E (47 passed + 1 flaky que pasa con retry de SW timing).

---

### refactor(ux) - Ingresos integrado como card compacta dentro de Tesorería · 2026-05-22

**Motivación:** El 80% de usuarios colombianos tiene 1 ingreso (SMMLV o similar).
Dedicarle una sección entera de primer nivel al menú era desproporcionado. Una card
compacta dentro de Tesorería es proporcional al uso real y mantiene toda la funcionalidad.

**Cambios:**
- Sección `#sec-ingresos` eliminada (HTML + nav-item + router)
- Card `.ingresos-card` integrada en `#sec-tesoreria` sobre la lista de cuentas
- Muestra: título "Mis ingresos", total mensual, lista de items, botón "+ Agregar"
- Empty state: "Todavía no registraste ingresos"
- Sin pérdida de funcionalidad: modal, entity, lógica, dashboard, Score,
  Calculadoras y Envelope Budgeting siguen leyendo `S.ingresos` sin cambios

**Archivos modificados:**
- `index.html`: eliminado nav-item "Ingresos", `<section id="sec-ingresos">`
  y ruta en router; agregado `<div id="panel-ingresos-card">` en sec-tesoreria
- `modules/infra/router.js`: eliminado `['ingresos', 'sec-ingresos']` del SECTIONS map
- `modules/dominio/ingresos/view.js`: nueva función exportada `renderCardIngresos()`;
  elimina `renderListaIngresos()` y `_renderEmptyState()` (absorbidas por renderCardIngresos)
- `modules/dominio/ingresos/index.js`: listeners state:change y hashchange cambian a
  `'tesoreria'`; llamadas a `renderListaIngresos()` reemplazadas por `renderCardIngresos()`
- `styles/components.css`: bloque `.ingresos-card` (70 líneas): `__header`, `__title`,
  `__meta`, `__total`, `__list`, `__empty`
- `service-worker.js`: cache bump v53→v54
- `tests/e2e/smoke.test.js`: suite 4 reescrita ("card en Tesorería", 3 tests);
  fix flake onboarding (localStorage.clear antes de goto inicial)
- `tests/e2e/navegacion-render.test.js`: test "Ingresos muestra empty state" actualizado
  para verificar `.ingresos-card__empty` en lugar del elemento eliminado `#lista-ingresos`

**Tests:** 880/880 unit verdes, 48/48 E2E verdes. SW: v54.

---

### fix(logros) - Toast de logro se quedaba estancado en pantalla · 2026-05-22

**Reporte:** El toast de logro desbloqueado se mostraba en pantalla indefinidamente (no desaparecía tras ~2.5s).
Usuario reportó en producción que los logros nunca se ocultaban.

**Raíz:** En `modules/dominio/logros/index.js` función `_mostrarToast()`:
```javascript
// ANTES (bug):
toast.addEventListener('animationend', () => clearTimeout(timeoutFade), { once: true });
setTimeout(() => { ... toast.classList.add('fade'); ... }, DURACION_MS);
```

El listener capturaba el evento `animationend` de la **animación de entrada** (`toastIn`, ~350ms)
en lugar de la salida, cancelando el timer del fadeout. Secuencia:
- t=0ms: toast insertado, animación toastIn empieza
- t=0ms: setTimeout(2500ms) armado para disparar fade
- t=350ms: toastIn termina → `animationend` dispara → clearTimeout() cancela el timer
- t=2500ms: timer nunca se ejecuta → toast estancado forever

**Solución:**
1. Remover el listener defensivo que capturaba el evento equivocado
2. Agregar guard `if (!toast.isConnected) return;` en el setTimeout para detectar si el toast
   fue removido externamente (fallback seguro)

```javascript
// AHORA (fix):
setTimeout(() => {
  if (!toast.isConnected) return;  // ya removido externamente
  toast.classList.add('fade');
  const onEnd = () => { toast.remove(); };
  toast.addEventListener('animationend', onEnd, { once: true });
  setTimeout(onEnd, 400);  // fallback por prefers-reduced-motion
}, DURACION_MS);
```

**Archivos modificados:**
- `modules/dominio/logros/index.js` (líneas 88-96): removido listener con { once: true },
  agregado `toast.isConnected` guard, preservado fallback timeout para prefers-reduced-motion
- `service-worker.js`: cache v52→v53

**Tests:** 835/835 unit verdes (cambio es solo runtime/DOM, sin logic.js).

**Verificación en producción:**
- v53 deployed a Vercel (git push + auto-deploy)
- curl a `service-worker.js` confirma presencia del guard `isConnected`
- Toast ahora desaparece en ~2.9s (2.5s visible + 0.4s fade) consistentemente

---

### feat(tesoreria, compromisos) - Cuota de manejo auto-sincronizada con compromiso fijo · 2026-05-20

Nueva feature opcional en el dominio de tesorería: al crear o editar una cuenta, la persona puede
activar "cuota de manejo" (tarifa mensual que el banco cobra en días específicos). Cuando está
activa, Finko auto-genera un Compromiso de tipo Fijo con frecuencia Mensual, vinculado a la cuenta
mediante campos `esCuotaManejo=true` y `cuentaId`. La sincronización es **idempotente**:

- Cuota **nueva** (antes no existía) → crear Compromiso
- Cuota **editada** (monto o día cambiaron) → editar Compromiso (solo si campos reales cambiaron)
- Cuota **eliminada** (checkbox desactivado) → eliminar Compromiso vinculado
- Cuenta **eliminada** → cascada a Compromiso

**Schema:** Bump v4→v5. Cambios:
- Cuenta: campo opcional `cuotaManejo: {monto, diaCobro}`
- Compromiso: campo opcional `cuentaId`, bandera `esCuotaManejo`
- Migración v4→v5 es idempotente (cuentas viejas quedan con `cuotaManejo=null`, compromisos viejos
  quedan con `esCuotaManejo=false`). Cero pérdida de datos.

**Archivos modificados:**
- `modules/core/state.js`: new typedef `CuotaManejo`, schema type definitions, bump _version 4→5
- `modules/core/storage.js`: SCHEMA_VERSION=5, migration v4→v5 (no-op data transform)
- `modules/dominio/tesoreria/logic.js`: parseCuotaManejo(datos), validarCuenta() extended para
  validar cuota si toggle activo, normalizarCuenta() preserva cuotaManejo, compromisoDesdeCuotaManejo()
  genera shape, compromisoCuotaManejoDeCuenta() busca linked compromise
- `modules/dominio/tesoreria/view.js`: renderFormCuenta() agrega checkbox "cuota de manejo mensual"
  + fieldset hidden con inputs monto/dia, renderCuentaItem() muestra hint visual cuando cuota activa
- `modules/dominio/tesoreria/index.js`: _sincronizarCuotaManejo() orchestrator idempotente (3 vías:
  create, update, delete), _toggleCuotaFieldset() muestra/oculta según checkbox, _inyectarForm()
  adjunta listener en el form
- `styles/components.css`: .checkbox-row (flex + gap), .cuota-fieldset (border, padding, [hidden])
- `tests/unit/tesoreria.test.js`: +16 tests cubriendo parseCuotaManejo, validarCuenta con/sin cuota,
  normalizarCuenta, compromisoDesdeCuotaManejo, compromisoCuotaManejoDeCuenta
- `tests/unit/state.test.js`: actualizado check de _version (4→5)
- `service-worker.js`: cache bump v50→v51

**Tests:** 880/880 verdes (Unit 835 + Integration 45). Incluye 4 nuevos E2E smoke tests en
`tests/e2e/smoke.test.js` cobriendo el flujo gastos-cuenta completo (crear cuenta, gasto con selector,
editar monto, cambiar cuenta, eliminar, verificar saldos). Total E2E: 47/47 verdes.

**Impacto:**
- La sección Compromisos now muestra cuotas de manejo con ícono diferenciado y puede editarlas.
- La sección Agenda now muestra cuotas en el calendario mensual (Fijo, Mensual, auto-generadas).
- El formulario de tesorería refleja la feature visualmente (checkbox + fieldset conditional).
- E2E suite verifica que saldos se actualizan correctamente end-to-end (dashboard, tesorería, lista gastos).

---

### fix(gastos, tesoreria) - "Tu plata disponible hoy" no actualizaba con gastos · 2026-05-20

**Reporte:** Al crear un gasto desde la sección Gastos, el dashboard ("Tu plata disponible hoy")
no se actualizaba. El saldo seguía mostrando el valor anterior, aunque el gasto estaba guardado.

**Raíz:** El formulario de gastos no tenía selector de cuenta. Todos los gastos se guardaban con
`cuentaId=null`. La función `updSaldo()` solo suma `S.cuentas.saldo` (saldos de cuentas), así que
gastos sin cuenta nunca afectaban el cálculo de disponible.

**Solución:** Hacer **obligatorio** el selector de cuenta en la creación de gasto. Introducir
concepto de "gasto rápido" (cuentaId=null) como estado intermedio que se completa editando el
gasto en modal (seleccionando la cuenta real). Nuevo sistema de descuento de saldo:

- **Crear gasto:** descuenta monto de cuenta seleccionada
- **Editar gasto:** revierte monto de cuenta vieja, descuenta de nueva (soporta cambios
  simultáneos cuenta + monto)
- **Eliminar gasto:** devuelve monto a cuenta
- **Gasto rápido incompleto (cuentaId=null):** no toca saldo hasta que se edite con cuenta

**Archivos modificados:**
- `modules/dominio/gastos/logic.js`: validarGasto() requiere cuentaId, nuevas funciones puras
  (sin DOM): aplicarGastoASaldo(cuenta, monto), revertirGastoDeSaldo(cuenta, monto),
  deltasPorEdicionDeGasto() calcula cambios precisos en dos cuentas
- `modules/dominio/gastos/view.js`: renderFormGasto() agrega <select name="cuentaId" required>,
  empty state "No hay cuentas" si no existen, input hint "#gasto-saldo-disponible" reactivo
  mostrando "Saldo disponible en [Cuenta]: $X"
- `modules/dominio/gastos/index.js`: _guardarGasto() llama _ajustarSaldoCuenta(cuentaId, -monto)
  en create/edit, _editarGasto() pre-rellena selector + _actualizarSaldoDisponible(),
  _eliminarGasto() revierte, _montarFormGasto() inyecta form on-demand (ver cuentas actualizadas
  entre aperturas)
- `styles/components.css`: .form-hint--muted, .form-hint--danger, .form-empty (ícono + title + desc)
- `tests/unit/gastos.test.js`: +29 tests (validarGasto require cuentaId, aplicarGastoASaldo 4 casos,
  revertirGastoDeSaldo 2 casos, deltasPorEdicionDeGasto 8 casos cubriendo misma cuenta, cambios
  cuentas, cambios ambos, migraciones)
- `service-worker.js`: cache bump v49→v50

**Tests:** 835/835 unit verdes.

**Impacto visual:**
- Dashboard "Tu plata disponible hoy" now decreases correctly on gasto create.
- Tesorería sección muestra saldo decremented immediately.
- Form hint below monto input shows "Saldo disponible: $X" cuando cuenta seleccionada.
- Empty state guía usuario a crear cuenta first (CTA a Tesorería).

---

### fix(ux) - Toast de logro: duración 2.5s + auto-update del SW · 2026-05-20

El usuario reportó dos problemas en mobile que resultaron tener distintas causas:

**Reportes:**
1. Toast de logro tarda demasiado en desaparecer (parece bug).
2. Toast de logro aparece cortado a la derecha (fuera de pantalla).
3. Avatares de banco sin color en lista de cuentas (mobile).
4. Avatares de banco sin color en dropdown del picker (mobile).

**Diagnóstico:** los 4 problemas se verificaron en preview mobile y resultaron:
- Solo el #1 era un bug real en el código actual.
- Los #2, #3, #4 eran consecuencia de un service worker viejo cacheado en el
  celular del usuario. En preview con SW v41 (limpio), el toast se ve centrado
  y los avatares muestran sus colores corporativos. El navegador móvil tarda
  hasta 24h en revisar si hay versión nueva del `service-worker.js`, dejando
  al usuario con CSS/JS de varias versiones atrás.

**Soluciones:**

1. `modules/dominio/logros/index.js`: `DURACION_MS` reducido de 4000 a 2500ms.
   El toast se cierra en ~2.9s total (incluyendo el fade de 0.4s). Antes ~4.4s.
   Sentido: 2.5s es estándar para toasts informativos; 4s sentía "stuck".

2. `modules/infra/sw-register.js`: tras `register()` exitoso, se llama
   `reg.update()` para forzar al navegador a chequear si hay una versión nueva
   del SW. Combinado con `skipWaiting()` + `clients.claim()` ya presentes,
   futuras actualizaciones toman control inmediatamente.

3. `service-worker.js`: v41 → v42 (invalidar cache).

**Tests:** 835/835 verdes.

**Nota para el usuario:** los problemas #2, #3, #4 desaparecen cuando el SW
v42 se descargue en su celular. Esto pasa la próxima vez que abra la app
(con `reg.update()` siempre se verifica). Si quiere ver los cambios ya
mismo, puede ir a Chrome Móvil > Ajustes > Privacidad > Borrar datos de
navegación > Solo para finko-brown.vercel.app.

---

### perf(ux) - Transición de tema sin lag en mobile (P2) · 2026-05-19

El usuario reportó lag perceptible al cambiar tema claro/oscuro en mobile,
mientras que en desktop la transición se sentía fluida y natural. El objetivo
era paridad visual entre ambas plataformas.

**Causa raíz:** el CSS `.theme-transitioning *` aplicaba `transition` a TODOS
los descendientes del body (563 elementos en mobile × 5 propiedades = ~2800
transiciones evaluadas por frame). En desktop con GPU dedicada el compositor
absorbía el costo. En mobile (CPU/GPU compartido), forzaba frame drops durante
los 280ms de la animación, produciendo la sensación de lag.

**Solución:** restringir el selector a una lista acotada de ~30 contenedores
que realmente cambian de color al cambiar tema:

- `body`, `.sidebar`, `.topbar`, `.bottom-nav`, `.menu-mas`, `.menu-mas__item`
- `.card`, `.bento-card`, `.list-item`, `.list-item__icon`
- `.modal-overlay`, `.modal`, `.modal__header`, `.modal__body`, `.config-section`
- `.cal-card`, `.cal-day`, `.cal-detail`, `.cal-detail__item`, `.nav-item`, `.field`
- `input`, `select`, `textarea`, `button`, `.btn`, `.chip`, `.tag`
- `.install-banner`, `.toast`, `.logro-toast`

**Resultado:** 563 elementos animados → 185 (reducción del 67%). El texto y los
elementos inline heredan `color` del contenedor animado, por lo que el ojo
percibe el crossfade igual de fluido. Duración 280ms preservada (paridad con
desktop). Medición: el click + frame de aplicación toma ~22ms estable a lo
largo de 5 toggles consecutivos (antes había drift por el costo del style recalc).

**Archivos:**
- `styles/themes.css`: lista explícita de selectores, comentario actualizado
  explicando el por qué.
- `service-worker.js`: v40 → v41.

**Tests:** 835/835 verdes (cambio solo CSS).

---

### fix(ux) - Toggle de tema duplicado: centralizado en Ajustes (P3) · 2026-05-19

El toggle de tema existia en tres lugares simultáneos:
1. Botón `<button data-action="theme-toggle">` en `.sidebar__footer` (visible solo en desktop).
2. Botón `<button id="menu-mas-tema">` en el menú "Más" del bottom nav (mobile).
3. Checkbox `<input data-action="theme-toggle">` dentro de `_renderTema()` en config,
   oculto en mobile por `config-section--desktop-only`.

Causa raíz: la sección Ajustes se marcó `desktop-only` cuando aún no era suficientemente
accesible en mobile; los botones extra compensaban. Al resolver el acceso mobile de config,
los tres controles coexistian sin necesidad.

Solución: eliminar botones 1 y 2; quitar `config-section--desktop-only` del `_renderTema()`.
El checkbox en Ajustes es ahora el único punto de control, visible en todos los tamaños.

Descubrimiento durante la tarea: el browser revierte `checked` del checkbox de forma
asincrona (macrotask posterior) despues de que el handler llama `e.preventDefault()`.
Esto hacia que las asignaciones sincronas a `el.checked` se pisaran. Solucion: envolver
en `setTimeout(0)` tanto `_syncThemeButton()` como el listener `EventBus.on('theme:change')`.

**Archivos:**
- `index.html`: -6 lineas (dos botones `data-action="theme-toggle"` eliminados).
- `modules/dominio/config/view.js`: clase `config-section--desktop-only` removida de `_renderTema()`.
- `modules/ui/shell.js`: `_syncThemeButton()` maneja `input[type=checkbox]` con `setTimeout(0)`.
- `modules/dominio/config/index.js`: listener `theme:change` envuelto en `setTimeout(0)`.
- `tests/e2e/smoke.test.js`: Suite 7 reescrita (navega a config, verifica body class).
- `service-worker.js`: v40.

**Tests:** 835/835 verdes.

---

### fix(tesoreria) - Layout mobile de list-item y avatares de banco (P1) · 2026-05-19

CSS faltante para variantes del `.list-item` que todos los dominios usaban en HTML pero
ningun selector cubria: `__body` (flex:1), `__meta` (columna de monto, flex-col
right-align), `__action` (fila flex: saldo + boton X en tesoreria), `__value`
(mono/semibold como `__amount`).

Sin estos, en tesoreria el saldo y boton X apilaban verticalmente (display:block default)
y el titulo no truncaba. Mismo efecto potencial en compromisos/gastos pero menos visible
porque `__action` solo tenia botones.

Agrega `.list-item__icon:has(.bank-avatar) { background: transparent }` para remover el
bg redundante del wrapper cuando el avatar tiene color propio.

**Archivos:** `styles/components.css` (+34 lineas).

**Tests:** 835/835 verdes (solo CSS, sin lógica nueva).

**Commit:** `1b060e0`

---

### feat(agenda) - Sub 4/5 - Panel de detalle del día al click · 2026-05-19

Panel expandible inline que aparece al clickear un día con compromisos. Muestra la lista
con icono por tipo, descripción, "Tipo · Frecuencia", monto. Segundo click o botón X
cierran (toggle). Clickear otro día cambia la selección. Navegar mes limpia.

**Archivos:** `modules/dominio/agenda/view.js` (estado `_diaSeleccionado`, función
`mostrarDia()`, `_renderDetalleDia()` + `_renderDetalleItem()`, helper `_esc`).
`modules/dominio/agenda/index.js` (handler `_mostrarDia`).
`styles/components.css` (`.cal-detail*`, `.cal-day--selected`, `.cal-day--inactive`,
layout mobile grid 2col).
`index.html` (sin cambios).

**Tests:** 835/835 unitarios verdes (sin nuevos).

**Commit:** `e3852e4`

---

### feat(agenda) - Sub 3/5 - Render calendario, navegación y dots por tipo · 2026-05-19

Render del calendario mensual (cabecera, grilla 7 columnas lun-dom, dots de color por
tipo, leyenda). Navegación prev/siguiente mes. Visualización: día actual con borde
verde + fondo accent. Día pasado con opacity 0.55. Día con eventos: dots hasta 3,
luego "+N". Responsive mobile: celdas 48px tappables.

**Archivos:** `modules/dominio/agenda/view.js` (estado `_viewYear/_viewMonth`,
funciones `navegarMes()`, `resetearVistaAlMesActual()`, `renderAgenda()`, helpers
`_renderCabecera()`, `_renderDiasSemana()`, `_renderGrid()`, `_renderDots()`,
`_renderLeyenda()`). `modules/dominio/agenda/index.js` (handlers `_prevMes()`,
`_nextMes()`, escuchador de `state:change` y `hashchange`). `styles/components.css`
(bloque AGENDA completo: `.cal-card`, `.cal-grid`, `.cal-day` + variantes, `.cal-dot`
por tipo, `.cal-legend`, @media mobile).

**Tests:** 835/835 unitarios verdes (sin nuevos).

**Commit:** `4f17c94`

---

### feat(agenda) - Sub 2/5 - Lógica pura: mapeo de eventos del mes · 2026-05-19

Función `eventosDelMes(compromisos, year, month)` que mapea cada compromiso a los días
del mes en que ocurre según su frecuencia: Diario, Semanal, Quincenal, Mensual,
Bimestral, Trimestral, Semestral, Anual, Única vez. Respeta ciclos periódicos desde
`fechaCreacion`. Devuelve {día: [compromisos]}. Función `totalEventosDelMes(eventos)`
cuenta totales. 30 tests unitarios cubriendo todas las frecuencias y casos borde.

**Archivos:** `modules/dominio/agenda/logic.js` (funciones puras sin DOM).
`tests/unit/agenda.test.js` (30 tests).

**Tests:** 30 nuevos, 835/835 totales verdes.

**Commit:** `ef54842`

---

### feat(agenda) - Sub 1/5 - Esqueleto: estructura HTML, routing, bootstrap · 2026-05-19

Nueva sección `#sec-agenda` en index.html con `<div id="panel-agenda">` (output del
render). Enlace en sidebar desktop ("Agenda y calendario del mes") + entrada en menú
móvil ("⋯ Más"). Router setup: agregado `['agenda', 'sec-agenda']` en `modules/infra/router.js`.
Bootstrap: import + `initAgenda()` en `modules/ui/bootstrap.js`. SW v37.

**Archivos:** `index.html` (nueva sección + links en navbar + menu). `modules/infra/router.js`
(mapeo hash). `modules/ui/bootstrap.js` (init). `service-worker.js` (v37).
`modules/dominio/agenda/index.js` (stub).

**Tests:** 835/835 unitarios verdes (sin nuevos).

**Commit:** `11271f2`

---

### fix(ux) - Selector de banco: dropdown posicionado fuera del modal en mobile · 2026-05-19

Bug reportado: al crear una cuenta en tesoreria, la lista desplegable del custom bank picker
aparecia fuera del modal y desalineada (especialmente notable en mobile con el dropdown cerca
del borde inferior del viewport).

**Causa raiz: CSS containing block**

El `.modal` padre tenia `transform: translateY(100%)` en estado cerrado y `translateY(0)` al
abrir (animacion bottom-sheet). Cualquier propiedad `transform != none` crea un **containing block**
que captura descendientes con `position: fixed`. El dropdown:
1. Calculaba su posicion con `getBoundingClientRect()` (relativo al viewport, px reales).
2. Se posicionaba con `position: fixed top: X px; left: Y px;`.
3. Pero CSS lo posicionaba relativo al modal transformado, no al viewport.
4. Resultado: desplazamiento observable, especialmente en mobile.

**Solucion:**

Dos cambios en `tesoreria/index.js`:

1. **Mover el dropdown a `<body>`** al inicializar:
   ```javascript
   document.body.appendChild(list);
   ```
   Ahora el dropdown es hijo directo de body, fuera del containing block del modal.
   Su `position: fixed` se calcula respecto al viewport real.

2. **Reescribir `_posicionar()`** para detectar overflow y abrir hacia arriba si es necesario:
   ```javascript
   const vh = window.innerHeight;
   const altoMax = 260; // max-height del .bank-picker__list en CSS
   const espacioAbajo = vh - r.bottom;
   const espacioArriba = r.top;
   
   if (espacioAbajo < altoMax && espacioArriba > espacioAbajo) {
     // No cabe abajo y hay mas espacio arriba: abrir hacia arriba
     list.style.top = 'auto';
     list.style.bottom = `${vh - r.top + 4}px`;
   } else {
     // Abrir hacia abajo (default)
     list.style.bottom = 'auto';
     list.style.top = `${r.bottom + 4}px`;
   }
   ```

3. **Nueva funcion `_resetBankPicker()`** al reabrir el modal:
   `resetModal()` limpia inputs/selects, pero el display visual del picker vive en body
   (fuera del overlay). Agregar reset explícito:
   ```javascript
   function _resetBankPicker() {
     const display = document.querySelector('#modal-cuenta .bank-picker__display');
     if (display) {
       display.innerHTML = '<span class="bank-picker__placeholder">Seleccionar…</span>';
     }
     document.querySelectorAll('#banco-list [role="option"]').forEach(item => {
       item.setAttribute('aria-selected', 'false');
     });
   }
   ```
   Llamada en `_nuevaCuenta()` despues de `resetModal()`.

4. **Documentacion ampliada** en `_initBankPicker()` explicando por qué se mueve a body
   y cuales son las implicaciones (containing block, viewport-fixed positioning, etc.).

**Archivos:**
- `modules/dominio/tesoreria/index.js`: `_resetBankPicker()` nueva, `_posicionar()` reescrita,
  documentacion de `_initBankPicker()` ampliada, `_nuevaCuenta()` ahora llama `_resetBankPicker()`.
- `service-worker.js`: v36 a v37 (invalidar cache para forzar nuevo modal en clientes).

**Metricas:** 805/805 unit verdes (sin cambios), 41/41 E2E verdes. Tests ya pasaban porque
la lógica de posicionamiento se prueba en happy-dom (no requiere transform real).

**Verificacion:** Testeado en mobile (375x812) y desktop (1280x801), dropdown abre hacia
abajo o arriba según espacio disponible.

---

### feat(ux) - Sidebar colapsable en desktop (UX#3) · 2026-05-19

Boton para colapsar el sidebar lateral en desktop (>= 1024px) a solo iconos (64px de ancho).

**Cambios:**
- `index.html`: boton `sidebar__collapse-btn` al final de `.sidebar__footer`, con SVG
  chevron inline (izquierda cuando expandido, derecha cuando colapsado via `scaleX(-1)`).
- `styles/layout.css`: nueva seccion "SIDEBAR COLAPSABLE". Estado `body.sidebar-collapsed`
  overridea `--fk-sidebar-width` a `var(--fk-sidebar-collapsed)` (64px, token ya existia).
  `.sidebar__collapse-btn` con borde superior separador y color muted. Clase temporal
  `body.sidebar-animating` activa `transition: grid-template-columns 250ms` en `.app-shell`
  solo durante el toggle del usuario (no en carga inicial ni resize).
  Guard `@media (min-width: 1024px)` en todos los selectores de estado colapsado.
- `modules/ui/shell.js`: `toggleSidebarCollapse()` alterna la clase + timer 300ms para
  limpiar `.sidebar-animating`. `initSidebarCollapse()` restaura el estado desde
  `localStorage` clave `fk_sidebar_collapsed`. `_syncCollapseButton()` actualiza
  `aria-expanded` y label del boton. `_syncNavTitles()` agrega/quita `title` en items
  para tooltip nativo al hover cuando los labels estan ocultos.
- `modules/ui/actions.js`: registra accion `sidebar-toggle` que llama `toggleSidebarCollapse()`.
- `modules/ui/bootstrap.js`: llama `initSidebarCollapse()` despues de `initShell()`.
- `tests/e2e/smoke.test.js`: suite "Sidebar colapsable (desktop)" con 3 tests.
- `service-worker.js`: v35 a v36.

**Metricas:** 805/805 unit verdes, 41/41 E2E verdes.

---

### feat(ux) - Logos/avatares de bancos en selector de cuenta (UX#4) · 2026-05-19

Custom bank picker visual que reemplaza el `<select>` nativo de bancos por un combobox
accesible con avatares de color corporativo e iniciales de cada entidad.

**Cambios:**
- `constants.js`: BANCOS_CO pasa de `string[]` a `{ id, iniciales, color, texto }[]`.
  El `id` es el mismo string que antes → retrocompatibilidad total con localStorage.
  Colores corporativos reales: Bancolombia #FFC727, Davivienda #E31837, Nequi #9C00FF,
  Daviplata #FF8000, Nubank #820AD1, Lulo Bank #FF5A1F, etc.
- `tesoreria/view.js`: `renderFormCuenta()` genera el HTML del custom picker con
  `role="combobox"`, trigger button, `input[type="hidden" name="banco"]` y `ul[role="listbox"]`.
  Helper `_bankAvatarHtml(bancoId)` busca en BANCOS_CO y genera el span del avatar.
  `_renderCuentaItem()` ahora muestra el avatar del banco en lugar del emoji guardado.
- `tesoreria/index.js`: `_initBankPicker()` (nueva función) con:
  - Toggle al click en el trigger.
  - `position: fixed` calculado con `getBoundingClientRect()` (para no quedar cortado
    por el `overflow: hidden` del modal).
  - Teclado: flechas arriba/abajo, Enter/Space para seleccionar, Escape para cerrar.
  - `pointerdown` capture para cerrar al tocar fuera.
- `components.css`: estilos de `.bank-picker`, `.bank-picker__trigger`,
  `.bank-picker__list` (max-height: 260px + scroll), `.bank-picker__item`,
  `.bank-avatar`. Animación `fadeInDown` de 0.15s al abrir la lista.
- `tests/e2e/smoke.test.js`: actualizado el test de Tesorería para usar el nuevo picker
  (click en trigger + click en primer item).
- `service-worker.js`: v34 a v35.

**Metricas:** 805/805 unit verdes, 38/38 E2E verdes.

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
