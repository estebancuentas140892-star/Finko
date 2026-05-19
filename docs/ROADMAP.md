# Roadmap - Finko Claude

> Documento vivo. Solo contiene lo **pendiente**.
> Lo que ya se hizo está en [`CHANGELOG.md`](CHANGELOG.md).
> Última revisión: 2026-05-18

---

## Estado actual

**Versión liberada:** `v1.0.0` - todas las 14 fases originales completadas.
**Post-v1.0:** todas las secciones A-G completadas (39 tareas opcionales + features portadas).
**Estado:** proyecto estable en producción. 805/805 unit tests verdes, 38/38 E2E verdes, Lighthouse 99-100.
**Fase activa:** ninguna. El roadmap post-v1.0 está 100% cerrado.

---

## Post-v1.0 - Ideas activas

Estas son las áreas pendientes / opcionales. Ninguna es bloqueante para usar la app.

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
| Tests unitarios | - | 300/300 ✅ |
| Tests E2E | - | 18/18 ✅ |
