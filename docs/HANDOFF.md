# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-02. Última tarea cerrada: EDIT.1 (rebanada Apartados), editar sin destruir una reserva.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 3600/3600 verdes |
| Tests E2E | 252/253 + 1 flaky (retry verde), corrida del 2026-08-02, sello del commit `5929836`. **Es compuerta** desde el 2026-07-30: el hook de pre-commit exige el sello de una corrida verde cuando el diff toca runtime. La huella se calcula sobre el **índice** (`git ls-files -s`), no sobre el árbol: hay que `git add` **antes** de sellar, o el propio `add` invalida el sello. **Ojo con sesiones paralelas sobre el mismo worktree**: el índice compartido puede invalidar el sello entre que se corre la suite y se commitea (visto el 2026-08-01/02: contención de CPU y staging entrelazado con otra sesión; `git add -p` para separar hunks propios de ajenos cuando el mismo archivo cambia por dos sesiones a la vez) |
| Schema version (`localStorage`) | v31 (`seccion` en categoría personalizada, CAT.3a; migración backfill) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **4**: ver [BUGS.md](BUGS.md). BUG-018 es el único con impacto en el uso diario |

---

## 2. Últimas 5 tareas cerradas

**EDIT.1 (rebanada Apartados) - editar sin destruir una reserva, 2026-08-02**
Botón "Editar" en la tarjeta; `normalizarApartado(datos, apartadoExistente)` preserva `montoActual`/`recurrente`/`periodoMeses` y recalcula `completado` contra el objetivo nuevo. Mismo patrón que EDIT.1a validó en Metas. Inversión y Me deben siguen pendientes de la misma tarjeta.

**PERF.7c - warm-up de derivaciones pesadas en idle, 2026-08-01**
Cierra **PERF.7** completo. `bootstrap.js`, tras `renderAll()`, agenda un `requestIdleCallback` (fallback `setTimeout`) que precalienta el bundle memoizado de Análisis y el historial completo de Movimientos (`precalentarAnalisis()`, `precalentarMovimientos()`), sin tocar el DOM. Reusa los memos ya existentes de PERF.2, sin infra nueva. Detalle: [`scripts/perf/BASELINE.md`](../scripts/perf/BASELINE.md).

**DV.2c - cascada de listas + resaltado de fila + retiro de bucles infinitos, 2026-08-01**
D4 del [ADR 033](DECISIONS/033-direccion-visual-premium.md), independiente de DV.2a/b. Cascada acotada (`cardIn`, primeros 6 `.list-item` de cualquier lista vía `:nth-child(-n+6 of .list-item)`) y resaltado de fila nueva (`.list-item--nuevo`, pseudo-elemento con tinte de dominio que se desvanece por `opacity`). Helper `resaltarFilaNueva()` en `infra/animate.js`, listo pero sin consumidor todavía. Retira `empty-orbit`/`empty-float` (bucles infinitos ambientales); catálogo cerrado de animación en DESIGN_SYSTEM.md. Sigue DV.2d (ilustraciones, bloqueada).

**DV.2b - riqueza visual piloto: formas orgánicas + patrón, 2026-08-01**
D3 del [ADR 033](DECISIONS/033-direccion-visual-premium.md), desbloqueada al cerrar DV.2a. Pipeline de `scripts/sync-sprite.py` extendido a `assets/svg/decoracion/` (prefijo `d-`, viewBox propio en vez de forzar 24x24); clase `.decor` (posición absoluta, opacidad 6%, teñida por `--fk-section-color`, `z-index: -1` contenido por `isolation: isolate` en el hero) y patrón `--fk-pattern-dots`. Piloto acotado: 2 heroes (`.hero-inicio` con `d-blob`, `.hero-tesoreria` con `d-onda`) y 2 empty states (Metas, Deudas) con `.pattern-dots`.

**DV.2a - cierre documental de tokens de superficie/elevación + degradado de identidad, 2026-08-01**
El código entró en su propio commit (`d8a7d53`, 2026-07-31) sin cierre documental. Escala de elevación de 4 niveles ([ADR 033](DECISIONS/033-direccion-visual-premium.md) D1): `.card`/`.bento__cell`/`.list-item` ganan sombra en reposo en ambos temas, doble capa en claro. `--fk-grad-identity` (D2) consolida el degradado que 6 heroes copiaban a mano. Sin cambios de código en este cierre.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
