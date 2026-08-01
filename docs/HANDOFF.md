# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-01. Última tarea cerrada: IN.9d, Accesos rápidos en fila propia y Actividad reciente en la fila final 6+6 de escritorio.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 3577/3577 verdes |
| Tests E2E | 253/253 verdes (corrida del 2026-08-01, sello del commit `b265c01`). **Es compuerta** desde el 2026-07-30: el hook de pre-commit exige el sello de una corrida verde cuando el diff toca runtime; el árbol compartido puede necesitar resellar si otra sesión edita en simultáneo |
| Schema version (`localStorage`) | v31 (`seccion` en categoría personalizada, CAT.3a; migración backfill) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **4**: ver [BUGS.md](BUGS.md). BUG-018 es el único con impacto en el uso diario |

---

## 2. Últimas 5 tareas cerradas

**IN.9d - Accesos rápidos en fila propia, Resumen semanal y Actividad reciente en la fila final 6+6, 2026-08-01**
Cuarta rebanada de IN.9 ([ADR 057](DECISIONS/057-inicio-en-escritorio.md) D4), cierra la iniciativa salvo IN.9e. La fusión de Accesos + Actividad (ADR 034 D7) queda acotada a móvil, mismo patrón que el acordeón de IN.9c: dos contenedores conviven en el DOM y `_repartoAccesosActividad()` (render.js) decide cuál se ve. `#panel-resumen` no se duplica, solo cambia de `--full` a `--half` y gana título propio.

**MC.13e-2c - logo/ícono + nota por fila en el asistente, 2026-08-01**
El grueso ya había entrado sin atribución en `132b0b5` (MC.13e-2d): iconos de marca, render de la nota, CSS de `.distribuir__saldo`. Lo pendiente era `Compromiso.nota`: solo existía para `tipo='fijo'` con categoría predefinida (AG.4); las deudas ganan el mismo campo opcional que Meta/Apartado. `.distribuir__nota` (usada sin regla propia desde `132b0b5`) gana estilo.

**AP.5 - form v2 de Apartados y recurrencia como toggle, 2026-08-01**
Cierre documental: el código entró como colateral del commit `ab8c9a1` (CAT.3a). El form de nuevo apartado adopta chips-cat + monto-hero (resuelve el conflicto del [ADR 042](DECISIONS/042-formularios-v2-visual.md) D9 a favor de los chips) y la pregunta de recurrencia sale del alta; se activa después con el botón "Hacer recurrente" que ya vivía en la tarjeta.

**CAT.3a - modelo de las categorías personalizadas globales, 2026-08-01**
Primera de las cuatro rebanadas del [ADR 058](DECISIONS/058-categorias-personalizadas-globales.md), sin cambio visible todavía: campo `seccion` (bump v30 a v31 con backfill), resolutora de ícono global sobre los dos catálogos nativos y validador que compara contra los dos. Las compuertas destaparon **8 unitarios y 4 E2E rojos en HEAD**, los tres del mismo patrón de fechas fijas en los tests (BUG-022, BUG-023, BUG-024): quedaron arreglados en el mismo commit y la suite vuelve a verde.

**MC.16e - avisos de costo de la tarjeta de crédito, 2026-07-31**
Cierra **MC.16 completa** y deja ejecutado el [ADR 051](DECISIONS/051-tarjeta-de-credito-producto-integrado.md). Dos de los tres avisos del D7 no tenían dato que los disparara: se resuelven con **un solo campo** (`avanceTC`, bump v29 a v30) y el retiro en otra red entra en el texto del mismo aviso. El **pago mínimo se deriva** de `tasa` y saldo, no se captura (un mínimo tecleado queda viejo cada mes). Se sumó un cuarto aviso derivable, **el consumo que pasa del cupo**, que el tablero traía anotado desde MC.16b. Ninguno bloquea: informan el costo, no validan.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
