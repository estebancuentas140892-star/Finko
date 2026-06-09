# Roadmap - Finko Claude

> Documento vivo. Solo contiene lo **pendiente**.
> Lo que ya se hizo está en [`CHANGELOG.md`](CHANGELOG.md).
> Última revisión: 2026-06-07

---

## Estado actual

**Versión liberada:** `v1.0.0` - todas las 14 fases originales completadas.
**Post-v1.0:** secciones A-G completadas (39 tareas opcionales + features portadas), **fase H (Rediseño de Tesorería) cerrada en v8.9**, deuda técnica cerrada en 2026-06-01, onboarding UX cerrado en 2026-06-03, **modernización UI/UX (Parte 3: paleta, tipografía, navegación, cards, iconografía SVG) cerrada en 2026-06-06**.
**Estado:** proyecto estable en producción. 1129/1129 unit + integración verdes, Lighthouse 99-100.
**Fase activa:** ninguna. **Parte 4 (Crecer: Ahorro + Inversión) cerrada** (J.1a-c + J.2a-c). **Serie R (calidad de código) cerrada** (R1-R5). **Sección K (Asistencias Inteligentes) cerrada** (K.1 4x1000, K.2 perfil fiscal, K.3 monitor de renta, K.4 datos de renta manuales).

---

## Post-v1.0 - Ideas activas

Estas son las áreas pendientes / opcionales. Ninguna es bloqueante para usar la app.

---

### M. Captura de datos más precisa (gasto rápido + flujos)

**Objetivo:** que cada dato se pida en el momento adecuado y los registros queden organizados y consistentes. Mejora de UX en 3 fases pedida por el usuario.

**Completadas:**
- ✅ M.1 (Fase 1) - Card "Tienes N gastos por organizar" en el dashboard, que cuenta los gastos rápidos sin descripción/categoría y lleva a Gastos - 2026-06-08.
- ✅ M.1b - Editar/Eliminar/"Marcar pagado este mes" en gastos fijos + helper de selección inteligente de cuenta (`cuenta-helper.js`: 0/1/varias) - 2026-06-09.
- ✅ M.2 (Fase 2) - Cuenta de origen en el gasto rápido: autoselección (1 cuenta), selector compacto (varias), empty state guiado (0 cuentas). El gasto rápido descuenta saldo de la cuenta elegida. Form dinámico inyectado en cada apertura - 2026-06-09.
- ✅ M.3 (Fase 3) - Revisión transversal de flujos de captura. Mapeo de los seis flujos (gasto, gasto rápido, ingreso, cuenta, deuda, meta) y cierre de las dos brechas: UI de ingresos recurrentes (subsección "Mis ingresos" + CRUD sobre `S.ingresos`, ahora alimenta el nudge de tasa de ahorro) y cuenta de origen en el abono a metas (descuenta saldo, patrón 0/1/varias) - 2026-06-09.

_(Sección M cerrada: M.1, M.1b, M.2 y M.3 completas. Captura de datos precisa entregada: card de pendientes, gestión de gastos fijos, cuenta de origen en gasto rápido y abono a meta, y fuentes de ingreso recurrentes.)_

---

### I. Onboarding UX para nuevos usuarios

**Objetivo:** que un usuario que abre la app por primera vez entienda en segundos qué hace cada sección y qué pasos debe dar.

**Completadas:**
- ✅ I.1 - Guía de primeros pasos en el hero "Tu plata disponible hoy": mensaje contextual + botón "Ir a Tesorería →" cuando no hay cuentas; desaparece al registrar la primera (toggle en vivo) - 2026-06-03.
- ✅ I.2 - Copy "Anotar un gasto": card renombrada de "Gasto rápido" a "Anotar un gasto" con descripción orientada al caso de uso - 2026-06-03.

**Completadas:**
- ✅ I.3 - Empty states enriquecidos: desc + tip en Gastos, Metas y Presupuesto. Tesorería, Compromisos y Personales ya tenían copy sólido - 2026-06-03.

_(sección I completa. Todas las tareas de onboarding UX cerradas.)_

**Modelo sugerido:** Sonnet 4.6 - Medio.

---

### A. Deploy a producción

**Objetivo:** publicar Finko en una URL pública para acceso desde cualquier dispositivo.

**Producción:** https://finko-brown.vercel.app

**Completadas:**
- ✅ A.1 - `netlify.toml` + `vercel.json` listos; SW CORE_ASSETS completo - 2026-05-18.
- ✅ A.1' - Deploy real a Vercel con auto-redeploy desde GitHub - 2026-05-18.
- ✅ A.2 - HTTPS automático con HSTS preload - 2026-05-18.
- ✅ A.3 - SW + headers de seguridad verificados en producción (incluye fix de orden de reglas en `vercel.json`) - 2026-05-18.

**Completadas adicionales:**
- ✅ Fix responsive integral mobile (320-1440px): fluid typography (clamp),
  touch targets 44px+, inputs 16px iOS-safe, breakpoint legacy < 480px movido
  a < 360px, grids 3-col → 1-col en < 768px, `viewport-fit=cover`. SW v6→v7 - 2026-05-18.
- ✅ A.4 - Smoke test confirmado en Redmi Note 11 (PWA instalada, offline OK, responsive verificado) - 2026-05-18.

**Tareas candidatas:**
- A.5 - Agregar dominio custom (opcional). Guía completa en [`docs/SETUP_DOMINIO.md`](SETUP_DOMINIO.md) - cuando el usuario tenga dominio registrado.

**Modelo sugerido:** Sonnet 4.6 - **Esfuerzo:** Bajo.

---

### B. Mejoras de assets

**Objetivo:** elevar la calidad visual de la PWA.

**Completadas:**
- ✅ B.1 - Íconos PNG producción: gráfico de barras, supersampling 4×, safe zone OK - 2026-05-18.
- ✅ B.2 - Screenshots para el manifest (2× 540×720, tema oscuro, form_factor narrow) - 2026-05-18.
- ✅ B.3 - Favicon SVG: 3 barras `#00dc82` sobre `#0f1117`, `<link rel="icon" type="image/svg+xml">`, SW v8 - 2026-05-18.

- ✅ B.4 - Splash screens iOS: 5 PNGs (750×1334…1290×2796), gen-splash.py, meta tags, SW v9 - 2026-05-18.

_(todas las tareas de mejoras de assets completadas)_

**Modelo sugerido:** Sonnet 4.6 - **Esfuerzo:** Bajo.

---

### C. Tests de integración

**Objetivo:** llenar `tests/integration/` (carpeta existe vacía).

**Completadas:**
- ✅ C.1 - Flujo onboarding → cuenta → ingreso → gasto + roundtrip + resiliencia (20 tests) - 2026-05-18.
- ✅ C.2 - Flujo backup: exportar CSV → resetear app → importar → verificar (8 tests) - 2026-05-18.
- ✅ C.3 - Migración schema v1→v2: `_migrate()` + `_applyToS()` + roundtrip (9 tests) - 2026-05-18.

_(no quedan tareas pendientes en C - tests de integración completos)_

**Modelo sugerido:** Sonnet 4.6 - **Esfuerzo:** Medio.

---

### C2. Tests E2E (Playwright)

**Objetivo:** mantener verde la suite smoke de Playwright.

**Completadas:**
- ✅ C2.1 - Smoke de Ahorro e Inversión: `tests/e2e/ahorro-inversion.test.js`, 9 tests (empty state + alta + persistencia + proyección + eliminar) para los 2 dominios de la Parte 4 - 2026-06-06.
- ✅ C2.2 - Realinear `smoke.test.js` (19 fallos resueltos): `waitForSelector('#saldo-total')` → `waitForSelector('#sec-dash.active')` en 6 puntos; Dashboard test 2 siembra cuenta saldo 0 - 2026-06-06.
- ✅ C2.3 - Realinear `estrategia-pago.test.js` (7 fallos resueltos): selectores actualizados al rediseño pick cards (`.estrategia-card__metrica-valor--info/--danger`, acordeón) - 2026-06-06.

_(C2 completa: 57/57 verde en la suite completa.)_

**Modelo sugerido:** Sonnet 4.6 - **Esfuerzo:** Medio.

---

### D. Funcionalidad opcional

**Objetivo:** features que no entraron en v1.0 pero el usuario podría querer.

**Completadas:**
- ✅ D.1 - Exportar gastos a CSV con BOM UTF-8 (roundtrip con D.2) - 2026-05-18.
- ✅ D.2 - Importar gastos desde CSV con preview + detección de duplicados - 2026-05-18.
- ✅ D.3 - Gráficos en `analisis/` (sparkline mensual, donut de categorías) - 2026-05-18.
- ✅ D.4 - Recordatorios push para compromisos próximos a vencer (Notification API) - 2026-05-18.
- ✅ D.5 - Envelope budgeting (presupuesto por categoría) + schema v2 - 2026-05-18.

_(no quedan tareas funcionales pendientes en D - todas las features de v1 + post-v1 completadas)_

**Modelo sugerido:** Sonnet 4.6 / Opus 4.7 según complejidad - **Esfuerzo:** Medio-Alto.

---

### E. Mantenimiento periódico

**Objetivo:** mantener vigentes las constantes legales colombianas.

**Objetivo (refinado 2026-06-07):** mantener vigentes solo las constantes
legales de baja frecuencia: anuales (SMMLV, UVT, auxilio de transporte) y
estables sin vencimiento (GMF/4x1000, aportes de seguridad social). Los
indicadores de alta frecuencia (usura trimestral) quedan fuera del alcance.

**Completadas:**
- ✅ E.1 - Actualizar tasa de usura: Q1 26.77% EA → Q2 28.17% EA (SFC 2026-05-18).
  _(Histórico: la usura se eliminó del producto el 2026-06-07, ver ADR 004.)_
- ✅ E.2 - SMMLV 2026 ($1.750.905, Decreto 1469/2025) y UVT 2026 ($52.374,
  Resolución DIAN 000238/2025). Placeholders 2027 = null - publicación
  esperada dic-2026 (2026-05-19).
- ✅ E.4 - Eliminar la tasa de usura del producto (tabla, función, exports,
  hint del formulario y `clasificarTasaCredito`). Refina ADN regla #12.
  ADR 004. SW v109 → v110 - 2026-06-07.

**Tareas candidatas:**
- E.2-2027 - Diciembre 2026 / enero 2027: actualizar SMMLV y UVT a valores
  2027 cuando se publiquen oficialmente.
- E.3 - Verificar GMF y otras tasas si hay reforma tributaria.
- E.5 (opcional) - Agregar IPC como constante anual si se quiere mostrar
  inflación observada (mencionado por el usuario; hoy solo existe
  `INFLACION_OBJETIVO`, la meta de BanRep para rentabilidad real).

**Modelo sugerido:** Haiku 4.5 - **Esfuerzo:** Bajo.

---

### F. Features portadas desde Finko-Refactor

**Objetivo:** identificar funciones útiles en el proyecto paralelo `Finko-Refactor/` y portarlas con el patrón modular de Claude (`logic.js` puro + `view.js` + `index.js`).

**Completadas:**
- ✅ F.1 - Calculadoras nuevas (PILA, Rentabilidad Real, clasificarTasaCredito) - 2026-05-18.
- ✅ F.2 - Dominio `personales/`: préstamos otorgados (schema v2→v3, 42 tests nuevos) - 2026-05-18.

**Completadas:**
- ✅ F.3 - Score de Salud Financiera en dashboard: agregado cross-dominio con 4 factores ponderados (ahorro 40%, deuda 25%, liquidez 20%, control 15%), bandas visuales, sub-factor cards - 2026-05-18.
- ✅ F.4 - Estrategias Avalancha/Bola de Nieve para pago de deudas: 3 funciones puras (filtrar, simular mes a mes, comparar), card en compromisos con input de extra mensual + toggle + tabla + ahorro vs alternativa; 17 tests nuevos - 2026-05-18.

_(no quedan tareas pendientes en F - features portadas completas)_

**Modelo sugerido:** Opus 4.7 - **Esfuerzo:** Medio (F.2/F.4) / Alto (F.3).

---

### G. Insights desde Finko-Refactor (segunda oleada)

**Objetivo:** portar las features de analisis avanzado y alertas inteligentes de Finko-Refactor
que no fueron incluidas en la fase F.

**Completadas:**
- ✅ G.1 - Detectores de alerta en compromisos: `detectarFijosSinPagarEsteMes()` y
  `detectarDeudasDurmiendo()` en `compromisos/logic.js`; nudges en la sección; 22 tests nuevos - 2026-05-19.
- ✅ G.2 - Insights de gasto en analisis: `calcularComparacionCategorias()` + `detectarPatronGastoSemanal()`; 20 tests nuevos - 2026-05-19.
- ✅ G.3 - Sistema de Logros y Rachas (gamificacion): 12 logros, toast + confetti, schema v4 - 2026-05-19.

_(todas las tareas de G completadas)_

**Modelo sugerido:** Sonnet 4.6 Medio (G.2) / Opus 4.7 Medio (G.3).

---

### J. Crecer: Ahorro + Inversión (hábitos financieros a largo plazo)

**Objetivo:** dos secciones nuevas en el hub "Crecer" que incentiven buenos hábitos: ahorrar con propósito e invertir para el largo plazo. Decisiones de producto confirmadas con el usuario (2026-06-06).

**Reutiliza lo existente (no duplicar):** `modules/infra/financiero.js` ya tiene `calcularCDT`, `calcularInteresCompuesto`, `calcularRentabilidadReal`, `calcularRegla72`. Metas (objetivos puntuales) y los simuladores inline (CDT, crecimiento de ahorros) se quedan como están.

#### J.1 - Ahorro (PRIMERO): fondo de emergencia + hábito

Tracker de la plata real que aparta el usuario, distinto de Metas (objetivos con fecha).

- **Schema v6 → v7** con migración idempotente. Nuevo slice `ahorro`:
  `{ fondoEmergencia: { activo, metaMeses (3-6), montoActual }, aportes: [{id, monto, fecha, nota}], compromisoMensual }`.
- **`ahorro/logic.js` (puro, con tests):** `calcularObjetivoFondo(gastosFijosMensuales, metaMeses)`, `calcularProgresoFondo`, `mesesDeColchon`, `calcularTasaAhorro(ingresos, gastos)`. Reutiliza el cálculo de gastos fijos mensuales que ya alimenta el Balance del mes.
- **UI:** sección `sec-ahorro` + nav item en "Crecer" (sidebar + menú Más) con ícono SVG `i-ahorro` (alcancía). Hero del fondo de emergencia (progreso, meses cubiertos, faltante), empty state con CTA, y config de meta de meses.

  **Slices (smallest-first, cada uno verificable en la app):**
  - ✅ **J.1a** - Fundación + fondo de emergencia (2026-06-06): schema+migración v6→v7, `logic.js` (30 tests) + 4 tests de migración, sección con hero del fondo + nav + ícono SVG `i-ahorro` + token `--fk-dom-ahorro`, empty state con preview dinámico, modal activar/editar/desactivar. Ver [CHANGELOG](CHANGELOG.md).
  - ✅ **J.1b** - Hábito de apartar dinero (2026-06-06): modal de aporte + historial ordenado desc + nudge de tasa de ahorro (5 niveles) + "págate primero" mensual (compromisoMensual). Hero usa total = base + suma de aportes. EventBus extendido a ingresos/gastos. 25 tests nuevos. Ver [CHANGELOG](CHANGELOG.md).
  - ✅ **J.1c** - Nudges + integración (2026-06-06): logro `fondo-emergencia` ("Red de seguridad" 🛡️) + flag `completado` persistido por `ahorro/index.js`; Score de Salud con 4to factor Ahorro (`calcularScoreSalud(resumen, ahorroData)`, backward-compat 3↔4 factores, Deuda 30 / Liquidez 25 / Control 20 / Ahorro 25) + card 🛡️ + nudge CTA si no hay fondo; `'ahorro'` en SECCIONES_OBSERVADAS. 13 tests nuevos. Ver [CHANGELOG](CHANGELOG.md).

  _(J.1 Ahorro completa: J.1a + J.1b + J.1c cerradas. Sigue J.2 Inversión.)_

#### J.2 - Inversión (DESPUÉS): portafolio real

Registro de inversiones reales (CDT, fondo, cripto, acciones) con monto, tasa y plazo.

- **Schema v7 → v8** con migración. Slice `inversiones: [{id, tipo, nombre, monto, tasaEA, plazoMeses, fechaInicio}]`.
- **`inversiones/logic.js`:** total invertido, valor proyectado al vencimiento (usa `calcularCDT`/`calcularInteresCompuesto`), rentabilidad real del portafolio (usa `calcularRentabilidadReal`).
- **UI:** sección `sec-inversion` + nav en "Crecer" + ícono SVG. Hero con total invertido + valor proyectado, lista de holdings, modal de alta.

  **Slices:**
  - ✅ **J.2a** - Fundación + lista + alta (2026-06-06): schema+migración v7→v8, `logic.js` (43 tests) + 3 tests de migración, sección con hero de total invertido + desglose por tipo + lista de holdings + modal de alta, nav en "Crecer" (sidebar + menú Más), ícono SVG `i-inversion`, token `--fk-dom-inversion`. Verificado en navegador. Ver [CHANGELOG](CHANGELOG.md).
  - ✅ **J.2b** - Proyección + rentabilidad real (2026-06-06): proyección al vencimiento por holding (CDT con retención 7% vía `calcularCDT`; resto crecimiento compuesto EA vía `calcularInteresCompuesto`), card de portafolio (valor proyectado + ganancia esperada), rentabilidad real (Fisher con `INFLACION_OBJETIVO` 3% Banco de la República). 15 tests nuevos. Verificado en navegador. Ver [CHANGELOG](CHANGELOG.md).
  - ✅ **J.2c** - Educación/nudges (2026-06-06): `detectarNudgesInversion` (fondo primero, concentración por tipo ≥ 70%, retorno variable ≥ 50%, refuerzo positivo) + tip de horizonte. 14 tests nuevos. Verificado en navegador. Ver [CHANGELOG](CHANGELOG.md).

  _(Parte 4 completa: Ahorro J.1a-c + Inversión J.2a-c. Orden global ejecutado: J.1a → J.1b → J.1c → J.2a → J.2b → J.2c.)_

---

### R. Refactor de calidad de código (sin tocar funcionalidad)

**Objetivo:** mejorar mantenibilidad, legibilidad y escalabilidad sin romper nada. El sistema de tokens ya es bueno: el trabajo es cerrar fugas y eliminar duplicación.

**Completadas:**
- ✅ R1 - Cerrar 40 fugas de color: `tokens.css` (1 token nuevo `--fk-bg-overlay`), `modals.css`, `layout.css` (10 valores) y `components.css` (28 valores). Corregidos drift de paleta vieja y nombres de tokens equivocados (`--fk-color-danger` → `--fk-danger`) - 2026-06-07.
- ✅ R2 - Centralizar `esc()` y `genId`: exportadas desde `infra/utils.js` y `infra/crud.js`; 16 copias locales de `_esc` eliminadas; `_genId` en `ahorro/index.js` reemplazada por `genId` de `crud.js` - 2026-06-07.
- ✅ R3 - Cerrar 34 fugas de `px` en `components.css`: 9 valores de pixel reemplazados por tokens `--fk-space-*` (space-1 a space-12) y `--fk-radius-full`. Preservados intencionales: toggle 44px×24px, touch targets 44px, valores sin token exacto (26px, 28px, 36px, etc.) - 2026-06-07.
- ✅ R4 - Partir `components.css` (4612 líneas) en 8 sub-módulos bajo `styles/components/`. Barrel file con 8 `@import`. SW v107 → v108; 8 nuevos assets en CORE_ASSETS - 2026-06-07.
- ✅ R5 - Partir `compromisos/view.js` (1075 líneas) en 6 sub-módulos bajo `views/` (todos < 300 líneas). Barrel preserva 12 exports públicos; cero cambios en `index.js`. SW v108 → v109 - 2026-06-07.

_(Serie R cerrada: R1-R5 completas. La calidad de código alcanzó el objetivo: tokens cumplidos, helpers centralizados, archivos por debajo del umbral ADN.)_

**Modelo sugerido para R2:** Sonnet 4.6 - Bajo.

---

### K. Asistencias Inteligentes

**Objetivo:** convertir los indicadores financieros colombianos (UVT, SMMLV, GMF, topes de renta) en automatizaciones de fondo, alertas preventivas y recomendaciones contextuales. El resultado: menos calculadoras que el usuario debe consultar a mano, más inteligencia que aparece sola cuando es relevante.

**Principios de diseño:**
- **UVT como motor.** Todos los topes se calculan como `N × UVT_VIGENTE`. Al actualizar la constante `UVT` en enero, los topes se recalculan solos sin tocar otra línea.
- **Alerta al 80%, no al 100%.** El valor está en prevenir: avisar cuando el usuario se acerca al tope, no cuando ya lo cruzó.
- **Encuadre orientativo obligatorio.** Toda alerta incluye: "según lo que registras en Finko; confirma con un contador". Nunca afirmar "debes declarar"; siempre "podrías estar cerca del umbral".
- **Datos ya registrados, primero.** Solo pedir información nueva cuando no haya forma de inferirla del estado existente (`S`).

**Gaps de modelo conocidos (no bloquean K.1 ni K.2):**
- Tarjetas de crédito: `TIPOS_CUENTA` no incluye "Tarjeta de crédito". Los consumos con tarjeta (uno de los 5 criterios de renta) no son directamente computables. Bloquea K.3; se decide el enfoque antes de comenzarlo.
- Consignaciones: no hay stream de depósitos explícitos. Aproximable con suma de ingresos registrados + disclaimer claro.

---

#### K.1 - Asistencia 4x1000 (GMF)

✅ **Cerrada** · 2026-06-07. Ver [CHANGELOG](CHANGELOG.md).

---

#### K.2 - Perfil fiscal (preguntas opcionales)

✅ **Cerrada** · 2026-06-07. Ver [CHANGELOG](CHANGELOG.md).

---

#### K.3 - Monitor de topes de renta

✅ **Cerrada** · 2026-06-07. Ver [CHANGELOG](CHANGELOG.md).

Decisión del gap de tarjetas de crédito (y otros): **Opción A, honestidad explícita.** Finko muestra los 5 topes calculados en vivo (`N × UVT`), pero solo "mide" los 2 criterios para los que tiene datos reales (patrimonio bruto y consumos totales). Los otros 3 (ingresos brutos, consumos con tarjeta de crédito, consignaciones) se muestran con su tope para referencia y badge "Sin datos en Finko" + tip de dónde consultarlo. Razón: el dominio `ingresos` ya no existe (post-v8.8), `TIPOS_CUENTA` no distingue tarjeta de crédito, y no hay stream de consignaciones; inventar esos valores violaría el principio de encuadre orientativo. Si surge demanda, el registro manual queda como K.4 sin bloquear nada.

---

---

#### K.4 - Datos de renta manuales

✅ **Cerrada** · 2026-06-07. Ver [CHANGELOG](CHANGELOG.md).

Registro manual opcional en Configuración (sección "Datos de renta") para los 3 criterios que el monitor no deriva: ingresos brutos, consumos con tarjeta de crédito y consignaciones. Valores keados por año en `config.datosFiscales[anio]` (schema v9 → v10). Al registrarlos, el monitor de K.3 los mide y deja de mostrar "Sin datos en Finko". Cierra el gap de datos que K.3 dejó documentado como honestidad explícita.

---

_(Sección K cerrada: K.1, K.2, K.3 y K.4 completas. Asistencias Inteligentes entregadas: 4x1000, perfil fiscal, monitor de topes de renta y registro manual de los criterios no derivables.)_

---

## Métricas alcanzadas en v1.0

| Métrica | Objetivo v1 | Real |
|---|---|---|
| LOC por archivo de dominio | < 400 | 230 (máx) |
| `style=""` inline en HTML | 0 | 0 ✅ |
| `window.X` en módulos | 0 | 0 ✅ |
| `onclick=""` en HTML | 0 | 0 ✅ |
| Lighthouse Performance | ≥ 90 | 99 ✅ |
| Lighthouse Accessibility | ≥ 95 | 100 ✅ |
| Lighthouse Best Practices | ≥ 90 | 100 ✅ |
| Lighthouse SEO | ≥ 80 | 100 ✅ |
| Cobertura lógica (líneas) | ≥ 90% | 99.6% ✅ |
| Tests unitarios | - | 1129/1129 ✅ |
| Tests E2E | - | 57/57 ✅ (`smoke` 28 + `estrategia-pago` 8 + `ahorro-inversion` 9 + `navegacion-render` 12) |
