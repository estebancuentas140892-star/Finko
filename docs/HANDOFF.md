# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-10-25. Última tarea cerrada: ADR 094, Tino el guatín reemplaza a Frai. HF.0f en curso: banco listo sin commitear, BUG-035, BUG-036 y BUG-038 abiertos.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4952/4952 (2026-10-25, MOV.1 ficha 17) |
| Tests E2E | 354/354 verdes (2026-10-25, MOV.1 ficha 17, `--workers=2`). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v48 (`perfiles`, APR.3a) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **4**: BUG-027 (documental), BUG-035, BUG-036 y BUG-038 (los encontró HF.0f, sin corregir). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**ADR 094 - Tino, el guatín, 2026-10-25**
El personaje del niño pasa de Frai a Tino; tres lecciones ya cuentan la semilla. APR.5a y APR.5b esperan los dibujos de Esteban. SW v613.

**MOV.1 ficha 17 - Logros, 2026-10-25**
Dos de sus cuatro cambios ya estaban hechos (MOV.20a y LG.2e). Los encargos de los pendientes enlazan su sección, la vitrina se parte en "Te falta" y "Ya los tienes" y el aviso de desbloqueo lleva a Tu progreso (H9). SW v612.

**APR.4b - el niño en tableta y escritorio, 2026-10-25**
Riel a la izquierda desde 768 px con su dibujo y "Cambiar"; Inicio en dos columnas desde 1024 px con los tres frascos. El adulto cambia de perfil desde el pie de la barra lateral cuando hay niños. SW v611.

**APR.4a - Aprende y la lección en escritorio, 2026-10-25**
Ruta en dos columnas con el detalle de la lección elegida ("Vas a aprender", ejercicios, "Termina en"); lección con la salida escrita y la respuesta al lado; ordenar se arrastra. SW v610.

**APR.3f - las unidades 2 a 8 del niño y su ubicación, 2026-10-25**
Ruta del niño completa en su voz (un test mide las frases) y tres preguntas de ubicación desde los 10 años. Falta la revisión pedagógica de las ocho unidades. SW v609.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En proceso:** **MOV.1, auditoría UX/UI móvil de Claude Design**: 17 de 25 cerradas, sigue la 18 (Cierre). El orden lo fijó Esteban y no se altera; el detalle vive en la tarjeta de [`BOARD.md`](BOARD.md).
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md), Propuesta): su Fase 0 corre en paralelo a MOV.1 porque no comparte archivos ni decisiones; HF.0a, HF.0b, HF.0h, HF.0c, HF.0i, HF.0d, HF.0e y HF.0j cerradas; P1 a P8 resueltas. Pendientes de la Fase 0: HF.0f (banco construido y sin commitear: sus ocho rojas reproducen BUG-035, BUG-036 y BUG-038, no se cierra hasta corregirlos) y HF.0g; DOC.5 en Mantenimiento.
- **Iniciativa APR, "Aprende y aplícalo"** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [ADR 093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), Propuesta): Fase 1 en curso sin esperar a MOV.1 (decisión del 2026-10-24); Fase 1 cerrada; Fase 2 cerrada salvo la revisión pedagógica de APR.2c; Fases 1 a 4 hechas; quedan la revisión pedagógica de las lecciones (APR.2c y APR.3f) y Tino, el guatín ([ADR 094](DECISIONS/094-tino-el-guatin.md), APR.5a y APR.5b), que espera los dibujos. Cada rebanada se sube a `main` al cerrar. El 093 acota el ADR 003 (ADN 11) solo dentro del perfil niño.
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
