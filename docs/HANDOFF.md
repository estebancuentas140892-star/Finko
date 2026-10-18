# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-10-17. Última tarea cerrada: HF.0h, la hoja de automáticos no reofrece un cobro ya distribuido (BUG-032).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4603/4603 (2026-10-17, HF.0h) |
| Tests E2E | 317/317 verdes (2026-10-17, HF.0h, `--workers=2`). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v43 (`config.respaldoCifrado`, CFG.4c; migración no-op) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **4**: BUG-025, BUG-027 (documental), **BUG-029** (crea dinero) y BUG-031. Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**HF.0h - el cobro distribuido no vuelve a la hoja, 2026-10-17**
Cierra BUG-032, el espejo de HF.0b: Distribuir sella en `config.cobrosDistribuidos` las ocurrencias que acredita (`ingresoId` + fecha exacta) y la hoja las descarta una por una. Deshacer la revierte; HF.1d la retira. SW v588.

**HF.0b - un cobro se acredita una sola vez, 2026-10-16**
Cierra BUG-030: Distribuir ya no suma otra vez lo que la hoja de créditos automáticos acreditó (`ingresoId` + fecha exacta del cobro, nunca parecido de monto). Abre BUG-032, el sentido inverso, reproducido en la app (HF.0h). SW v587.

**HF.0a - la suite vuelve a verde, 2026-10-16**
Cierra BUG-028: "compromiso próximo" respeta el `hoyISO` del motor (`proximoVencimiento`, `urgencia` y `compromisosProximos` aceptan la fecha). El séptimo rojo, un test de Inversión con fecha caducada, fija el reloj. Sin cambio visible. SW v586.

**HF - triaje de "un hecho financiero se informa una sola vez", 2026-10-16**
Brief de Esteban triado contra el código ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md), Propuesta; 32 rebanadas en [`board/transversal.md`](board/transversal.md)). Solo la **Fase 0** convive con MOV.1; la 1 espera a la ficha 18. Seis choques con ADR vigentes quedan como preguntas P1 a P7. Tres errores nuevos: BUG-029 a BUG-031.

**MOV.1 ficha 16 - Analisis: la salida prefiltrada y cinco veredictos, 2026-08-21**
Llego con **dos de sus tres hallazgos ya cerrados** por ANL.3 el 2026-08-11, verificado antes de tocar nada (segundo caso tras INT.1g). Faltaba medio Z3: el aviso de deudas sin saldo decia "Por pagar" pero enlazaba pelado, y ahora sale **prefiltrado** con el chip Deudas ([ADR 090](DECISIONS/090-analisis-cada-bloque-declara-su-alcance.md)). Los otros cuatro veredictos son documentacion: **R88 gana su segundo caso** y va a la 18 lista para confirmar; **R90 se acota** y no llega aca (activos y pasivos son stocks, no flujos); los tres grupos **no** se mudan, porque Analisis esta clavado a `hoy()`; el monitor de renta queda sin auditar. Avance MOV.1: **16 de 25**. SW v585.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En proceso:** **MOV.1, auditoría UX/UI móvil de Claude Design**: 16 de 25 cerradas, sigue la 17 (Logros). El orden lo fijó Esteban y no se altera; el detalle vive en la tarjeta de [`BOARD.md`](BOARD.md).
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md), Propuesta): su Fase 0 corre en paralelo a MOV.1 porque no comparte archivos ni decisiones; HF.0a, HF.0b y HF.0h cerradas; P1 a P7 resueltas, ninguna rebanada de la Fase 0 espera decisiones.
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
