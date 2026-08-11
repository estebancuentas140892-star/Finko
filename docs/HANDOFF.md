# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-10. Última tarea cerrada: GAS.2b, segunda línea del toast de Gastos (Gastos).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 3827/3832 verdes en el índice de GAS.2b; `gastos.test.js` 244/244 (7 nuevos de `consecuenciaDeGasto()`). `tests/unit/compromisos.test.js` tiene 5 fallas por una fuga de `vi.useFakeTimers()` sin restaurar (ajena a GAS.2b, verificada y flaggeada aparte: la lógica de `dashboard.js` renderiza bien aislada) |
| Tests E2E | 263 verdes, 0 failed, sello escrito sobre el índice de GAS.2b. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v35 (`config.atajosTeclado`, INT.1h; default encendido, apagable en Ajustes). GAS.2a/2b no bumpearon schema (no tocan `localStorage`) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **4**: ver [BUGS.md](BUGS.md). BUG-025 es el único con impacto en el uso diario y necesita decisión; BUG-027 (ADR 059 inexistente) es nuevo, solo documental |

---

## 2. Últimas 5 tareas cerradas

**GAS.2b - segunda línea del toast con la consecuencia del gasto (Gastos), 2026-08-10**
`consecuenciaDeGasto()` (`gastos/logic.js`, pura) decide la segunda línea con prioridad fija: límite excedido, límite en alerta, saldo restante de la cuenta, o nada. [ADR 060](DECISIONS/060-lectura-cross-domain-de-solo-lectura.md) formaliza cómo `gastos/index.js` lee `calcularProgreso()` de `presupuesto/logic.js` sin violar ADN 10 (el `logic.js` puro se comparte, no el `index.js`). Resuelve los 4 casos que la ficha 22 no cubría: repartido, consumo con tarjeta, edición, ojo de privacidad. De paso, BUG-027 (ADR 059 inexistente).

**GAS.2a - toast compartido de confirmación (Gastos), 2026-08-10**
Toast genérico (`ui/toast.js`, `mostrarToast()`) copiado del patrón de logros pero en `ui/` para no violar ADN 10; primer consumidor `_guardarGasto()`, primera línea con el nombre del gasto guardado. Corrige un hallazgo del handoff de Claude Design (ficha 22): el toast que asumía ya existente no existía, solo corría `announce()` (solo lector de pantalla).

**INT.1h - cuatro atajos de teclado en escritorio (Transversal), 2026-08-06**
`N`, `G` + letra, `?`, `Esc` ([ADR 059](DECISIONS/059-interfaz-de-escritorio.md), P8 resuelto). `_handleKeydown()` (`ui/actions.js`) los arma con tres guardas contra el riesgo de accesibilidad: campo de texto con foco, modal abierto, o tecla modificadora presionada cancelan el atajo. Interruptor en Ajustes → La app (WCAG 2.1.4), `S.config.atajosTeclado`, schema v35. Commit `f5fcda7`.

**INT.1e - el primario de sección sube a la barra (Transversal), 2026-08-06**
`#topbar-primario` en la barra superior, en secundario ([ADR 059](DECISIONS/059-interfaz-de-escritorio.md) D3, R38). `_syncPrimarioTopbar()` lee el único `.btn-primary` del encabezado activo (8 de las 13 secciones lo tienen) y copia texto, `aria-label` y `data-action`/`data-modal`, sin mapa nuevo por sección; se resincroniza ante cada navegación y `state:change`. El botón original se oculta en desktop y se restaura bajo 1024px. Commit `63f95f5`.

**INT.1c e INT.1d - barra superior de escritorio con cinta de saldo (Transversal), 2026-08-05**
Barra fija de 56px ([ADR 059](DECISIONS/059-interfaz-de-escritorio.md) D1/D2/D5): teja+título de la sección activa, "Registrar" (misma hoja que móvil), tema y Ajustes; fondo opaco sin `backdrop-filter` para no arriesgar Lighthouse (99/100/100/100). La cinta de saldo (D9) vuelve `.sidebar__saldo` un componente real, con su ojo de privacidad, oculta en Inicio (el hero ya lo dice) y sin cuentas. Commit `a6eb349`.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. **GAS.2c** (extender la confirmación a Abono/Aporte) queda diferida en [`board/gastos.md`](board/gastos.md): no se activa sin aprobación explícita, por regla de la propia ficha 22 ("si dos formularios más lo necesitan, deja de ser un arreglo local"). De PE.6 solo queda **PE.6d** (estados visuales) y está bloqueada hasta que IV.2 esté en producción. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
