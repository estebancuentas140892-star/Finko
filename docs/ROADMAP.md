# Roadmap - Finko Claude

> Documento vivo. Solo contiene lo **pendiente**.
> Lo que ya se hizo está en [`CHANGELOG.md`](CHANGELOG.md).
> Última revisión: 2026-06-03

---

## Estado actual

**Versión liberada:** `v1.0.0` - todas las 14 fases originales completadas.
**Post-v1.0:** secciones A-G completadas (39 tareas opcionales + features portadas), **fase H (Rediseño de Tesorería) cerrada en v8.9**, deuda técnica cerrada en 2026-06-01, onboarding UX cerrado en 2026-06-03, **modernización UI/UX (Parte 3: paleta, tipografía, navegación, cards, iconografía SVG) cerrada en 2026-06-06**.
**Estado:** proyecto estable en producción. 1078/1078 unit + integración verdes, Lighthouse 99-100.
**Fase activa:** ninguna. **Parte 4 (Crecer: Ahorro + Inversión) cerrada** (J.1a-c + J.2a-c). Ver candidatas opcionales más abajo.

---

## Post-v1.0 - Ideas activas

Estas son las áreas pendientes / opcionales. Ninguna es bloqueante para usar la app.

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

**Completadas:**
- ✅ E.1 - Actualizar tasa de usura: Q1 26.77% EA → Q2 28.17% EA (SFC 2026-05-18).
- ✅ E.2 - SMMLV 2026 ($1.750.905, Decreto 1469/2025) y UVT 2026 ($52.374,
  Resolución DIAN 000238/2025). Placeholders 2027 = null - publicación
  esperada dic-2026 (2026-05-19).

**Tareas candidatas:**
- E.2-2027 - Diciembre 2026 / enero 2027: actualizar SMMLV y UVT a valores
  2027 cuando se publiquen oficialmente.
- E.3 - Verificar GMF y otras tasas si hay reforma tributaria.

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
| Tests unitarios | - | 1078/1078 ✅ |
| Tests E2E | - | 18/18 ✅ |
