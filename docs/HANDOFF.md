# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-10. Última tarea cerrada: GAS.2a, toast compartido de confirmación (Gastos).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 3820/3825 verdes en el índice de GAS.2a; `gastos.test.js` 237/237. `tests/unit/compromisos.test.js` tiene 5 fallas por una fuga de `vi.useFakeTimers()` sin restaurar (ajena a GAS.2a e INT.1h, verificada y flaggeada aparte: la lógica de `dashboard.js` renderiza bien aislada) |
| Tests E2E | 263 verdes, 0 failed, sello escrito sobre el índice de GAS.2a. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v35 (`config.atajosTeclado`, INT.1h; default encendido, apagable en Ajustes). GAS.2a no bumpeó schema (no toca `localStorage`) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **3**: ver [BUGS.md](BUGS.md). BUG-025 es el único con impacto en el uso diario, y necesita decisión antes de tocarlo |

---

## 2. Últimas 5 tareas cerradas

**GAS.2a - toast compartido de confirmación (Gastos), 2026-08-10**
Toast genérico (`ui/toast.js`, `mostrarToast()`) copiado del patrón de logros pero en `ui/` para no violar ADN 10; primer consumidor `_guardarGasto()`, primera línea con el nombre del gasto guardado. Corrige un hallazgo del handoff de Claude Design (ficha 22): el toast que asumía ya existente no existía, solo corría `announce()` (solo lector de pantalla). GAS.2b (segunda línea con la consecuencia) queda pendiente en `board/gastos.md`.

**INT.1h - cuatro atajos de teclado en escritorio (Transversal), 2026-08-06**
`N`, `G` + letra, `?`, `Esc` ([ADR 059](DECISIONS/059-interfaz-de-escritorio.md), P8 resuelto). `_handleKeydown()` (`ui/actions.js`) los arma con tres guardas contra el riesgo de accesibilidad: campo de texto con foco, modal abierto, o tecla modificadora presionada cancelan el atajo. Interruptor en Ajustes → La app (WCAG 2.1.4), `S.config.atajosTeclado`, schema v35. Commit `f5fcda7`.

**INT.1e - el primario de sección sube a la barra (Transversal), 2026-08-06**
`#topbar-primario` en la barra superior, en secundario ([ADR 059](DECISIONS/059-interfaz-de-escritorio.md) D3, R38). `_syncPrimarioTopbar()` lee el único `.btn-primary` del encabezado activo (8 de las 13 secciones lo tienen) y copia texto, `aria-label` y `data-action`/`data-modal`, sin mapa nuevo por sección; se resincroniza ante cada navegación y `state:change`. El botón original se oculta en desktop y se restaura bajo 1024px. Commit `63f95f5`.

**INT.1c e INT.1d - barra superior de escritorio con cinta de saldo (Transversal), 2026-08-05**
Barra fija de 56px ([ADR 059](DECISIONS/059-interfaz-de-escritorio.md) D1/D2/D5): teja+título de la sección activa, "Registrar" (misma hoja que móvil), tema y Ajustes; fondo opaco sin `backdrop-filter` para no arriesgar Lighthouse (99/100/100/100). La cinta de saldo (D9) vuelve `.sidebar__saldo` un componente real, con su ojo de privacidad, oculta en Inicio (el hero ya lo dice) y sin cuentas. Commit `a6eb349`.

**CFG.7 - transición de tema con View Transitions API (Configuración), 2026-08-05**
`applyTheme()` usa `document.startViewTransition()` cuando el navegador lo soporta y no hay `prefers-reduced-motion`: crossfade nativo del tema en un solo paint (220ms), mejora progresiva sobre el fallback previo (`theme-transitioning`, 280ms), que se conserva intacto para Firefox y `reduced-motion`. Sin bump de schema. Commit `4a7eda0`.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. **GAS.2b** (segunda línea del toast de Gastos, consulta cross-domain a `presupuesto/logic.js`) queda como siguiente rebanada natural de GAS.2a, con decisiones abiertas para Esteban en [`board/gastos.md`](board/gastos.md). De PE.6 solo queda **PE.6d** (estados visuales) y está bloqueada hasta que IV.2 esté en producción. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
