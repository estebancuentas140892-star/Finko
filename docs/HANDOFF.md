# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-01. Última tarea cerrada: DV.2b, riqueza visual piloto (formas orgánicas + patrón).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 3583/3583 verdes |
| Tests E2E | 253/253 verdes (corrida del 2026-08-01, sello del commit `1e21397`). **Es compuerta** desde el 2026-07-30: el hook de pre-commit exige el sello de una corrida verde cuando el diff toca runtime. La huella se calcula sobre el **índice** (`git ls-files -s`), no sobre el árbol: hay que `git add` **antes** de sellar, o el propio `add` invalida el sello |
| Schema version (`localStorage`) | v31 (`seccion` en categoría personalizada, CAT.3a; migración backfill) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **4**: ver [BUGS.md](BUGS.md). BUG-018 es el único con impacto en el uso diario |

---

## 2. Últimas 5 tareas cerradas

**DV.2b - riqueza visual piloto: formas orgánicas + patrón, 2026-08-01**
D3 del [ADR 033](DECISIONS/033-direccion-visual-premium.md), desbloqueada al cerrar DV.2a. Pipeline de `scripts/sync-sprite.py` extendido a `assets/svg/decoracion/` (prefijo `d-`, viewBox propio en vez de forzar 24x24); clase `.decor` (posición absoluta, opacidad 6%, teñida por `--fk-section-color`, `z-index: -1` contenido por `isolation: isolate` en el hero) y patrón `--fk-pattern-dots`. Piloto acotado: 2 heroes (`.hero-inicio` con `d-blob`, `.hero-tesoreria` con `d-onda`) y 2 empty states (Metas, Deudas) con `.pattern-dots`. Sigue DV.2c (movimiento) y DV.2d (ilustraciones, bloqueada).

**DV.2a - cierre documental de tokens de superficie/elevación + degradado de identidad, 2026-08-01**
El código entró en su propio commit (`d8a7d53`, 2026-07-31) sin cierre documental. Escala de elevación de 4 niveles ([ADR 033](DECISIONS/033-direccion-visual-premium.md) D1): `.card`/`.bento__cell`/`.list-item` ganan sombra en reposo en ambos temas, doble capa en claro. `--fk-grad-identity` (D2) consolida el degradado que 6 heroes copiaban a mano. Sin cambios de código en este cierre.

**MC.13e-2f-2 - decisión explícita del remanente al confirmar, 2026-08-01**
Punto 18 del brief; cierra **MC.13e-2f** completa. Radiogroup de 3 opciones dentro del paso final que ya existía, sin preselección y con "Distribuir" bloqueado hasta elegir; la cifra es `sinAsignar`, no `evBudget`. "Ahorro"/"meta" no abre ruta de apply: suma a la fila del Paso 2 y devuelve el foco ahí. Sin fila de ahorro ni de meta el bloque no se renderiza (pregunta de una sola respuesta = fricción). Del rediseño del asistente solo queda **MC.13e-2g**.

**IN.9d - Accesos rápidos en fila propia, Resumen semanal y Actividad reciente en la fila final 6+6, 2026-08-01**
Cuarta rebanada de IN.9 ([ADR 057](DECISIONS/057-inicio-en-escritorio.md) D4), cierra la iniciativa salvo IN.9e. La fusión de Accesos + Actividad (ADR 034 D7) queda acotada a móvil, mismo patrón que el acordeón de IN.9c: dos contenedores conviven en el DOM y `_repartoAccesosActividad()` (render.js) decide cuál se ve. `#panel-resumen` no se duplica, solo cambia de `--full` a `--half` y gana título propio.

**MC.13e-2c - logo/ícono + nota por fila en el asistente, 2026-08-01**
El grueso ya había entrado sin atribución en `132b0b5` (MC.13e-2d): iconos de marca, render de la nota, CSS de `.distribuir__saldo`. Lo pendiente era `Compromiso.nota`: solo existía para `tipo='fijo'` con categoría predefinida (AG.4); las deudas ganan el mismo campo opcional que Meta/Apartado. `.distribuir__nota` (usada sin regla propia desde `132b0b5`) gana estilo.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
