# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-10-24. Última tarea cerrada: APR.2c (unidad 4), el Fondo de emergencia y un Aplícalo para cada unidad. HF.0f en curso: banco listo sin commitear, BUG-035, BUG-036 y BUG-038 abiertos.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4844/4844 (2026-10-24, APR.2c u4) |
| Tests E2E | 334/334 verdes (2026-10-24, APR.1d, `--workers=2`). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v46 (`config.hormiga`, APR.1b) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **4**: BUG-027 (documental), BUG-035, BUG-036 y BUG-038 (los encontró HF.0f, sin corregir). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**APR.2c (unidad 4) - Fondo de emergencia y un Aplícalo por unidad, 2026-10-24**
Cuatro lecciones del Fondo con su Aplícalo sobre tus gastos fijos. `aplica.js` arma el cierre de cualquier unidad y la vista lo pinta igual; los cálculos de las nueve quedan probados. SW v598.

**APR.1c y APR.1d - Inicio de tres lentes y Tu progreso propio, 2026-10-24**
Inicio es bloque en móvil (Hoy, Aprende, Tu progreso); "Tu progreso" deja Análisis e Inicio y suma unidades y logros en un solo nivel; "Tu siguiente paso" ocupa la celda de la tarjeta de logros. Cierra la Fase 1. SW v597.

**APR.1b - la unidad 3 completa y el límite de gastos pequeños, 2026-10-24**
Cuatro lecciones con insignia al terminar; el Aplícalo pone el límite de gastos pequeños, que Límites muestra como un sobre más. El tope de gasto pequeño pasa a ser del usuario y lo leen Aprende, Gastos, Análisis y el logro. Schema v46, SW v596.

**APR.1a - la ruta de Aprende y su primera lección, 2026-10-24**
Dominio `aprende` (ADR 092): ruta de nueve unidades en `#aprende` (en escritorio, fila en "Día a día") y la lección 2 de la unidad 3 a pantalla completa, con Aplícalo sobre los gastos pequeños del mes. `infra/hormiga.js` unifica el umbral. Schema v45, SW v595.

**BUG-037 - una compra con la tarjeta no es un pago, 2026-10-18**
El consumo (`consumoTC`) lleva el `compromisoId` de la tarjeta pero ya no cuenta como abono: estado del mes, último abono, Calendario, Por pagar, Inicio, avisos, hoja de automáticos y Distribuir leen solo los pagos reales. El banco de HF.0f baja de nueve a ocho rojas. SW v594.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En proceso:** **MOV.1, auditoría UX/UI móvil de Claude Design**: 16 de 25 cerradas, sigue la 17 (Logros). El orden lo fijó Esteban y no se altera; el detalle vive en la tarjeta de [`BOARD.md`](BOARD.md).
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md), Propuesta): su Fase 0 corre en paralelo a MOV.1 porque no comparte archivos ni decisiones; HF.0a, HF.0b, HF.0h, HF.0c, HF.0i, HF.0d, HF.0e y HF.0j cerradas; P1 a P8 resueltas. Pendientes de la Fase 0: HF.0f (banco construido y sin commitear: sus ocho rojas reproducen BUG-035, BUG-036 y BUG-038, no se cierra hasta corregirlos) y HF.0g; DOC.5 en Mantenimiento.
- **Iniciativa APR, "Aprende y aplícalo"** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [ADR 093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), Propuesta): Fase 1 en curso sin esperar a MOV.1 (decisión del 2026-10-24); Fase 1 cerrada; Fase 2 en curso (unidades escritas: 3 y 4). Cada rebanada se sube a `main` al cerrar. El 093 acota el ADR 003 (ADN 11) solo dentro del perfil niño.
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
