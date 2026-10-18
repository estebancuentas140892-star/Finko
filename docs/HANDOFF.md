# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-10-17. Última tarea cerrada: HF.0d, Una sola regla de vencimiento para avisos, Inicio y Por pagar (BUG-031).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4686/4686 (2026-10-17, HF.0d) |
| Tests E2E | 328/328 verdes (2026-10-17, HF.0d, `--workers=2`). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v44 (`Gasto.sinEfectoSaldo`, HF.0c; migración no-op) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **2**: BUG-025 y BUG-027 (documental). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**HF.0d - Una sola regla de vencimiento, 2026-10-17**
Cierra BUG-031: Inicio, Por pagar y el motor de avisos fechan y leen pagos como el Calendario (frecuencia real, estado por mes). Lo pagado antes de vencer no avisa; un bimestral solo vence en su ciclo; una deuda saldada no queda vencida. SW v591.

**HF.0i - Distribuir solo acredita cobros identificados, 2026-10-17**
Cierra BUG-033 y BUG-034 (P8 del ADR 091): el monto propuesto es lo que falta repartir, ocurrencia por ocurrencia; con varios ingresos el usuario marca cuáles llegaron, y una diferencia de monto se aclara, nunca se adivina. SW v590.

**HF.0c - el importador CSV no crea dinero, 2026-10-17**
Cierra BUG-029 (P4 del ADR 091): el gasto importado conserva su cuenta y sale con `sinEfectoSaldo` (schema v44), así que importarlo, editarlo o borrarlo no toca el saldo. El CSV que exporta Finko se vuelve a importar. Antes, el triaje de los hallazgos de HF.0h: BUG-033, BUG-034, HF.0i, HF.0j y DOC.5. SW v589.

**HF.0h - el cobro distribuido no vuelve a la hoja, 2026-10-17**
Cierra BUG-032, el espejo de HF.0b: Distribuir sella en `config.cobrosDistribuidos` las ocurrencias que acredita (`ingresoId` + fecha exacta) y la hoja las descarta una por una. Deshacer la revierte; HF.1d la retira. SW v588.

**HF.0b - un cobro se acredita una sola vez, 2026-10-16**
Cierra BUG-030: Distribuir ya no suma otra vez lo que la hoja de créditos automáticos acreditó (`ingresoId` + fecha exacta del cobro, nunca parecido de monto). Abre BUG-032, el sentido inverso, reproducido en la app (HF.0h). SW v587.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En proceso:** **MOV.1, auditoría UX/UI móvil de Claude Design**: 16 de 25 cerradas, sigue la 17 (Logros). El orden lo fijó Esteban y no se altera; el detalle vive en la tarjeta de [`BOARD.md`](BOARD.md).
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md), Propuesta): su Fase 0 corre en paralelo a MOV.1 porque no comparte archivos ni decisiones; HF.0a, HF.0b, HF.0h, HF.0c, HF.0i y HF.0d cerradas; P1 a P8 resueltas. Pendientes de la Fase 0: HF.0e, HF.0j (ingresos y débitos, espera HF.0e), HF.0f y HF.0g; DOC.5 en Mantenimiento.
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
