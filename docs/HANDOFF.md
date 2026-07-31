# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-07-31. Última tarea cerrada: CAT.4, auditoría de consistencia de formularios (sin hallazgos).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 3525/3525 verdes |
| Tests E2E | 246/246 verdes en las 12 suites (corrida completa el 2026-07-30). **Es compuerta** desde el 2026-07-30: el hook de pre-commit exige el sello de una corrida verde cuando el diff toca runtime |
| Schema version (`localStorage`) | v28 |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **2**, ninguno con impacto en el uso diario (uno de copy, uno de la propia suite E2E): ver [BUGS.md](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**CAT.4 - auditoría de consistencia de formularios, 2026-07-31**
Las 2 reglas transversales (categoría/tipo antes que descripción; fecha por defecto = hoy al crear) ya se cumplían en los ~8 formularios en alcance. Cierra sin cambios de código. `fechaObjetivo` (Apartados) y `fechaLimite` (Metas) quedan fuera: son fecha meta futura, no fecha de registro.

**IN.9b - 8 filas de actividad en escritorio y 5 en móvil, 2026-07-31**
Segunda rebanada de IN.9 ([ADR 057](DECISIONS/057-inicio-en-escritorio.md) D4). `movimientosRecientes()` ya recibía el límite por parámetro: cambia el argumento, no la derivación (sin bump). **Limitación declarada:** el panel se repinta con `state:change`, así que cambiar de ancho sin cambiar de estado deja el límite del último render. PI10 (columna corta si el usuario registra poco) sigue abierto, se decide en IN.9d.

**IN.9a - los dos avisos de "Atención hoy" comparten fila, 2026-07-31**
Primera rebanada de IN.9 ([ADR 057](DECISIONS/057-inicio-en-escritorio.md)). Los dos avisos pasan a `bento__cell--half` y el grupo queda en dos filas de dos: 541px a 459px de alto. Cero CSS nuevo, así que tablet y móvil caen solos. Acota el ADR 034 D1 en las dos plataformas (separar por `order` divorciaría foco y visual, WCAG 2.4.3). **ID4 e ID7 salen a INT.1:** dependen de una barra superior de escritorio que no existe. De paso, BUG-021.

**MC.16d - "¿A cuántas cuotas?" al registrar el consumo, 2026-07-30**
Cierra MC.16 salvo MC.16e. Chips 1 a 24 revelados solo con origen `tc:`; sube `cuotaMensual` en `monto / cuotas`. Mismo patrón de deltas netos que `saldoTotal`; un abono no lo toca. No crea un plan por compra (ADR 051 D2): sigue siendo un único `Gasto` con saldo revolvente. `cuotaMensual` ya existía en v5, sin bump.

**MC.16c - bloque de tarjetas de crédito en Mis cuentas, 2026-07-30**
Bloque propio, **fuera** del total de dinero disponible (ADR 051 D6), con cupo, usado y disponible derivado (nunca almacenado). Solo lectura: reusa la anatomía de `.cuenta-card` y cierra con enlace a Deudas, que sigue siendo la dueña de operar. `tarjetasCredito()` duplica a propósito el filtro de `gastos/logic.js` (ADN 10).

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
