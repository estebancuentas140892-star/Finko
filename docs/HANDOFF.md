# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-05. Última tarea cerrada: INT.1c e INT.1d, barra superior de escritorio con cinta de saldo (Transversal).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 3814/3814 verdes en el índice de INT.1f |
| Tests E2E | 263/263 verdes, sello escrito sobre el índice de CFG.7. **Compuerta** desde el 2026-07-30. **Sesiones paralelas:** árbol compartido con otra sesión durante todo el cierre; el hunk de `applyTheme` en `modules/ui/shell.js` se extrajo a mano con `git apply --cached` para no arrastrar su trabajo en curso (`_syncTopbar`, INT.1c) al commit |
| Schema version (`localStorage`) | v34 (`Personal.abonos[]`, PE.6b; los préstamos ya cobrados migran con un abono agrupado y conservan `pagado`) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **3**: ver [BUGS.md](BUGS.md). BUG-025 es el único con impacto en el uso diario, y necesita decisión antes de tocarlo |

---

## 2. Últimas 5 tareas cerradas

**INT.1c e INT.1d - barra superior de escritorio con cinta de saldo (Transversal), 2026-08-05**
Barra fija de 56px ([ADR 059](DECISIONS/059-interfaz-de-escritorio.md) D1/D2/D5): teja+título de la sección activa, "Registrar" (misma hoja que móvil), tema y Ajustes; fondo opaco sin `backdrop-filter` para no arriesgar Lighthouse (99/100/100/100). La cinta de saldo (D9) vuelve `.sidebar__saldo` un componente real, con su ojo de privacidad, oculta en Inicio (el hero ya lo dice) y sin cuentas. Commit `a6eb349`.

**CFG.7 - transición de tema con View Transitions API (Configuración), 2026-08-05**
`applyTheme()` usa `document.startViewTransition()` cuando el navegador lo soporta y no hay `prefers-reduced-motion`: crossfade nativo del tema en un solo paint (220ms), mejora progresiva sobre el fallback previo (`theme-transitioning`, 280ms), que se conserva intacto para Firefox y `reduced-motion`. Sin bump de schema. Commit `4a7eda0`.

**INT.1f - formulario de escritorio a 840px y dos columnas (Transversal), 2026-08-05**
El modal base sube de 520 a 840px desde 1024px de ventana ([ADR 059](DECISIONS/059-interfaz-de-escritorio.md) D8); su `<form>` interno pasa a grid de 2 columnas, con los campos simples (label + un solo `.input`/`.select`, sin hint ni picker) emparejados vía `:has()` y todo lo demás a ancho completo. Sin `grid-auto-flow: dense`: el orden del DOM no cambia. Móvil no cambia. CSS puro, sin bump de schema. Commit `bf37761`.

**PE.6c y PE.6e - rendimiento del préstamo e historial por persona (Me deben), 2026-08-05**
Derivaciones puras sobre el historial que dejó PE.6b, sin schema. `calcularRendimiento()` dice cuánto ganaste y qué porcentaje de lo prestado es, **sin anualizar**: anualizar convertiría un préstamo informal en una promesa de retorno comparable con un CDT. `estadisticasPorPersona()` alimenta un bloque plegado bajo el resumen, solo para quien tiene más de un préstamo, que **describe y no califica** ([ADR 047](DECISIONS/047-me-deben-v2-intereses-e-historial.md) D5): sin score, y ordenado por total prestado, no por puntualidad. La puntualidad solo cuenta préstamos con fecha pactada. Commit `a188744`.

**PE.6b - historial de abonos con schema v34 (Me deben), 2026-08-05**
`Personal.abonos[]` guarda fecha, monto, desglose capital/interés y cuenta destino de cada abono: hasta ahora solo existía el acumulador `pagado` y un préstamo con cinco abonos era indistinguible de uno con un solo pago. Resuelve el punto abierto del [ADR 047](DECISIONS/047-me-deben-v2-intereses-e-historial.md) a favor del **abono sintético**: lo ya cobrado migra agrupado en un abono marcado `agrupado`, que la vista rotula "Antes de este historial" en vez de inventarle fecha. Es la precondición de PE.6c y PE.6e. Commit `4e9d0d0`.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. De PE.6 solo queda **PE.6d** (estados visuales) y está bloqueada hasta que IV.2 esté en producción. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
