# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-10-24 (triaje de APR, sin runtime). Última tarea cerrada: BUG-037, una compra con la tarjeta no es un pago. HF.0f en curso: banco listo sin commitear, BUG-035, BUG-036 y BUG-038 abiertos.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4762/4762 (2026-10-18, BUG-037) |
| Tests E2E | 328/328 verdes (2026-10-18, BUG-037, `--workers=2`). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v44 (`Gasto.sinEfectoSaldo`, HF.0c; migración no-op) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **4**: BUG-027 (documental), BUG-035, BUG-036 y BUG-038 (los encontró HF.0f, sin corregir). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**BUG-037 - una compra con la tarjeta no es un pago, 2026-10-18**
El consumo (`consumoTC`) lleva el `compromisoId` de la tarjeta pero ya no cuenta como abono: estado del mes, último abono, Calendario, Por pagar, Inicio, avisos, hoja de automáticos y Distribuir leen solo los pagos reales. El banco de HF.0f baja de nueve a ocho rojas. SW v594.

**HF.0j - la hoja de automáticos empieza en el alta, 2026-10-18**
Acota el ADR 052 D1: la hoja no ofrece cobros ni pagos anteriores a la `fechaCreacion` (hora local) del ingreso o compromiso, filtrando cada ocurrencia antes de agrupar por mes. Lo que ya existía conserva su catch-up; sin fecha de alta, la ventana queda como antes. SW v593.

**HF.0e - fechaCreacion en hora local, 2026-10-17**
Cierra BUG-025 (P3 del ADR 091): `fechaLocalISO()` en `infra/utils.js` lee el instante guardado como día local y respeta las fechas de calendario; sin schema ni migración. Ciclos largos, Distribuir, reservas y alertas de deuda dejan de correrse un día o un mes. SW v592.

**HF.0d - Una sola regla de vencimiento, 2026-10-17**
Cierra BUG-031: Inicio, Por pagar y el motor de avisos fechan y leen pagos como el Calendario (frecuencia real, estado por mes). Lo pagado antes de vencer no avisa; un bimestral solo vence en su ciclo; una deuda saldada no queda vencida. SW v591.

**HF.0i - Distribuir solo acredita cobros identificados, 2026-10-17**
Cierra BUG-033 y BUG-034 (P8 del ADR 091): el monto propuesto es lo que falta repartir, ocurrencia por ocurrencia; con varios ingresos el usuario marca cuáles llegaron, y una diferencia de monto se aclara, nunca se adivina. SW v590.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En proceso:** **MOV.1, auditoría UX/UI móvil de Claude Design**: 16 de 25 cerradas, sigue la 17 (Logros). El orden lo fijó Esteban y no se altera; el detalle vive en la tarjeta de [`BOARD.md`](BOARD.md).
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md), Propuesta): su Fase 0 corre en paralelo a MOV.1 porque no comparte archivos ni decisiones; HF.0a, HF.0b, HF.0h, HF.0c, HF.0i, HF.0d, HF.0e y HF.0j cerradas; P1 a P8 resueltas. Pendientes de la Fase 0: HF.0f (banco construido y sin commitear: sus ocho rojas reproducen BUG-035, BUG-036 y BUG-038, no se cierra hasta corregirlos) y HF.0g; DOC.5 en Mantenimiento.
- **Iniciativa APR, "Aprende y aplícalo"** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [ADR 093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), Propuesta): triada el 2026-10-24, **no se inicia antes de cerrar las fichas 17 y 19 de MOV.1**. Primer alcance: Fase 1 del adulto (APR.1a a APR.1d). Abierta P1 del 093 ("Olvidé mi PIN" con niños). El 093 acota el ADR 003 (ADN 11) solo dentro del perfil niño.
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
