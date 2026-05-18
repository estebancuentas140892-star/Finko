# Roadmap — Finko Claude

> Documento vivo. Solo contiene lo **pendiente**.
> Lo que ya se hizo está en [`CHANGELOG.md`](CHANGELOG.md).
> Última revisión: 2026-05-17

---

## Estado actual

**Versión liberada:** `v1.0.0` — todas las 14 fases originales completadas.
**Fase activa:** ninguna. El proyecto está estable y listo para usar localmente.

---

## Post-v1.0 — Ideas activas

Estas son las áreas pendientes / opcionales. Ninguna es bloqueante para usar la app.

### A. Deploy a producción

**Objetivo:** publicar Finko en una URL pública para acceso desde cualquier dispositivo.

**Completadas:**
- ✅ A.1 — `netlify.toml` + `vercel.json` listos; SW CORE_ASSETS completo (finko-v2) — 2026-05-18.

**Tareas candidatas:**
- A.2 — HTTPS: automático en Netlify/Vercel al hacer el primer deploy (no requiere acción).
- A.3 — Verificar que el Service Worker se registra correctamente en producción (hacer el deploy primero).
- A.4 — Smoke test desde móvil real (instalación PWA + offline).
- A.5 — Agregar dominio custom (opcional).

**Modelo sugerido:** Sonnet 4.6 — **Esfuerzo:** Bajo.

---

### B. Mejoras de assets

**Objetivo:** elevar la calidad visual de la PWA.

**Completadas:**
- ✅ B.1 — Íconos PNG producción: gráfico de barras, supersampling 4×, safe zone OK — 2026-05-18.

**Tareas candidatas:**
- B.2 — Screenshots para el manifest (`screenshots` field — mejora la instalación PWA en Android).
- B.3 — Favicon SVG (el Apple Touch Icon ya está cubierto por `apple-touch-icon.png`).
- B.4 — Splash screen iOS.

**Modelo sugerido:** Sonnet 4.6 — **Esfuerzo:** Bajo.

---

### C. Tests de integración

**Objetivo:** llenar `tests/integration/` (carpeta existe vacía).

**Completadas:**
- ✅ C.1 — Flujo onboarding → cuenta → ingreso → gasto + roundtrip + resiliencia (20 tests) — 2026-05-18.

**Tareas candidatas:**
- C.2 — Flujo backup: exportar JSON → resetear app → importar → verificar.
- C.3 — Flujo migración: cargar `localStorage` con schema viejo → verificar `loadData()` lo sube.

**Modelo sugerido:** Sonnet 4.6 — **Esfuerzo:** Medio.

---

### D. Funcionalidad opcional

**Objetivo:** features que no entraron en v1.0 pero el usuario podría querer.

**Completadas:**
- ✅ D.1 — Exportar gastos a CSV con BOM UTF-8 (roundtrip con D.2) — 2026-05-18.
- ✅ D.2 — Importar gastos desde CSV con preview + detección de duplicados — 2026-05-18.
- ✅ D.3 — Gráficos en `analisis/` (sparkline mensual, donut de categorías) — 2026-05-18.
- ✅ D.4 — Recordatorios push para compromisos próximos a vencer (Notification API) — 2026-05-18.

**Tareas candidatas pendientes:**
- D.5 — Modo "presupuesto por sobre" (envelope budgeting).

**Modelo sugerido:** Sonnet 4.6 / Opus 4.7 según complejidad — **Esfuerzo:** Medio–Alto.

---

### E. Mantenimiento periódico

**Objetivo:** mantener vigentes las constantes legales colombianas.

**Tareas candidatas:**
- E.1 — Cada trimestre: actualizar tasa de usura en `modules/core/constants.js` (fuente: SFC).
- E.2 — Cada enero: actualizar SMMLV (Mintrabajo) y UVT (DIAN).
- E.3 — Verificar GMF y otras tasas si hay reforma tributaria.

**Modelo sugerido:** Haiku 4.5 — **Esfuerzo:** Bajo.

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
| Tests unitarios | — | 300/300 ✅ |
| Tests E2E | — | 18/18 ✅ |
