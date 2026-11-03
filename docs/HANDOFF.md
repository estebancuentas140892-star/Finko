# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-03. Última tarea cerrada: MV2.3 tanda 2, Por pagar por urgencia y en filas (ADR 117). Siguen cuatro tandas. MOV.1 en pausa. HF.0f en curso: banco listo sin commitear, BUG-035, BUG-036 y BUG-038 abiertos.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 5236/5236 (2026-11-03, MV2.3 tanda 2, árbol limpio) |
| Tests E2E | 394/394 verdes (2026-11-03, MV2.3 tanda 2, `--workers=2`). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v48 (`perfiles`, APR.3a) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **4**: BUG-027 (documental), BUG-035, BUG-036 y BUG-038 (los encontró HF.0f, sin corregir). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**MV2.3 tanda 2 - Por pagar por urgencia y en filas, 2026-11-03**
Vencidos primero con su suma y el lote al pie; cada obligación en una fila con su hoja; Me deben con una pastilla; texto al 200 % en dos renglones ([ADR 117](DECISIONS/117-por-pagar-por-urgencia-y-en-filas.md)). SW v649.

**MV2.3 tanda 1 - lo que faltaba del canvas, 2026-11-03**
Una auditoría encontró 22 propuestas sin hacer; esta tanda aplica las once pequeñas ([ADR 116](DECISIONS/116-lo-que-faltaba-del-canvas-primera-tanda.md)). SW v648.

**MV2.5 - el pie se apoya sobre el teclado, 2026-11-03**
Con el teclado abierto, la hoja toma el área visible y "Guardar" queda encima ([ADR 115](DECISIONS/115-el-pie-se-apoya-sobre-el-teclado.md)). Probada en iPhone; cierra MV2.2. SW v647.

**MARCA.2 - el isotipo flota donde se puede, 2026-11-03**
Íconos `any`, favicon y arranque sin teja; en la pantalla de inicio, sobre blanco a sangre ([ADR 114](DECISIONS/114-el-isotipo-flota-donde-se-puede.md)). SW v646.

**MV2.20 - las lentes quedan a la vista, 2026-11-03**
Al bajar, la barra de lentes de Gastos y de Ahorro queda pegada arriba; única excepción a R31 ([ADR 113](DECISIONS/113-las-lentes-quedan-a-la-vista.md)). SW v645.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En pausa:** **MOV.1, auditoría UX/UI móvil de Claude Design**: 17 de 25 cerradas, sigue la 18 (Cierre). Pausada el 2026-10-27 para la prueba en la nube (decisión en chat); el orden de sus fichas no cambia. Detalle en la tarjeta de [`BOARD.md`](BOARD.md).
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md), Propuesta): su Fase 0 corre en paralelo a MOV.1 porque no comparte archivos ni decisiones; HF.0a, HF.0b, HF.0h, HF.0c, HF.0i, HF.0d, HF.0e y HF.0j cerradas; P1 a P8 resueltas. Pendientes de la Fase 0: HF.0f (banco construido y sin commitear: sus ocho rojas reproducen BUG-035, BUG-036 y BUG-038, no se cierra hasta corregirlos) y HF.0g; DOC.5 en Mantenimiento.
- **Iniciativa NUBE** ([ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md), Aceptada): Finko en la nube con Supabase, cuenta opcional. NUBE.0 a NUBE.3 cerradas: cuenta por correo para invitados, sincronización por registro, borrar la cuenta y el teléfono del niño en `finko-prueba`. Sigue NUBE.4 (bancos), que pide su propio ADR; invitar probadores pide SMTP propio en Supabase.
- **Iniciativa APR, "Aprende y aplícalo"** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [ADR 093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), Propuesta; **solo del niño desde el [ADR 101](DECISIONS/101-finko-del-adulto-decide-no-ensena.md)**, que deja para el adulto la ayuda para decidir, DEC.1): Fase 1 en curso sin esperar a MOV.1 (decisión del 2026-10-24); Fase 1 cerrada; Fase 2 cerrada salvo la revisión pedagógica de APR.2c; Fases 1 a 4 hechas; el niño ya puede empezar solo ([ADR 100](DECISIONS/100-el-nino-empieza-solo.md)); quedan la revisión pedagógica de las lecciones del niño (APR.3f) y la ronda 2 de Tino ([ADR 094](DECISIONS/094-tino-el-guatin.md) y [095](DECISIONS/095-tino-en-el-sprite.md), APR.5b), que espera sus dibujos. Cada rebanada se sube a `main` al cerrar. El 093 acota el ADR 003 (ADN 11) solo dentro del perfil niño.
- **MV2.3, lo que faltaba del canvas móvil**: en proceso en [`BOARD.md`](BOARD.md); tandas 1 y 2 de 6 cerradas ([ADR 116](DECISIONS/116-lo-que-faltaba-del-canvas-primera-tanda.md), [ADR 117](DECISIONS/117-por-pagar-por-urgencia-y-en-filas.md)). Esteban decidió aplicar todo "tal cual como propone el HTML". MV2.2 cerró el 2026-11-03.
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
