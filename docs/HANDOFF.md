# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-10-25. Última tarea cerrada: APR.4a, Aprende y la lección en escritorio. HF.0f en curso: banco listo sin commitear, BUG-035, BUG-036 y BUG-038 abiertos.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4944/4944 (2026-10-25, APR.4a) |
| Tests E2E | 347/347 verdes (2026-10-25, APR.4a, `--workers=2`). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v48 (`perfiles`, APR.3a) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **4**: BUG-027 (documental), BUG-035, BUG-036 y BUG-038 (los encontró HF.0f, sin corregir). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**APR.4a - Aprende y la lección en escritorio, 2026-10-25**
Ruta en dos columnas con el detalle de la lección elegida ("Vas a aprender", ejercicios, "Termina en"); lección con la salida escrita y la respuesta al lado; ordenar se arrastra. SW v610.

**APR.3f - las unidades 2 a 8 del niño y su ubicación, 2026-10-25**
Ruta del niño completa en su voz (un test mide las frases) y tres preguntas de ubicación desde los 10 años. Falta la revisión pedagógica de las ocho unidades. SW v609.

**APR.3e - el tutor en Ajustes, Familia, 2026-10-25**
Alta en dos pasos con la mesada; "Entregada" anota un gasto Familia del tutor y llena los frascos (un solo hecho); premio por ahorrar sobre lo guardado todo el mes; progreso del niño. Categoría Familia nueva. SW v608.

**APR.3d - la alcancía y la meta del niño, 2026-10-25**
Guardé, Gasté, Compartí y mover entre frascos, cada frasco lleno contra lo suyo; una meta que responde en semanas y fecha. Solo anota: Finko no mueve dinero. SW v607.

**APR.3c - la app del niño y su ruta, 2026-10-25**
Barra de cuatro destinos, Inicio con Frai, ruta en orden como camino, lección con su piel y celebración con "Úsalo de verdad"; unidad 1 escrita. El avance va al perfil del niño. SW v606.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En proceso:** **MOV.1, auditoría UX/UI móvil de Claude Design**: 16 de 25 cerradas, sigue la 17 (Logros). El orden lo fijó Esteban y no se altera; el detalle vive en la tarjeta de [`BOARD.md`](BOARD.md).
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md), Propuesta): su Fase 0 corre en paralelo a MOV.1 porque no comparte archivos ni decisiones; HF.0a, HF.0b, HF.0h, HF.0c, HF.0i, HF.0d, HF.0e y HF.0j cerradas; P1 a P8 resueltas. Pendientes de la Fase 0: HF.0f (banco construido y sin commitear: sus ocho rojas reproducen BUG-035, BUG-036 y BUG-038, no se cierra hasta corregirlos) y HF.0g; DOC.5 en Mantenimiento.
- **Iniciativa APR, "Aprende y aplícalo"** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [ADR 093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), Propuesta): Fase 1 en curso sin esperar a MOV.1 (decisión del 2026-10-24); Fase 1 cerrada; Fase 2 cerrada salvo la revisión pedagógica de APR.2c; Fase 3 hecha salvo la revisión pedagógica (APR.2c y APR.3f); APR.4a cerrada, sigue APR.4b (el niño en escritorio). Cada rebanada se sube a `main` al cerrar. El 093 acota el ADR 003 (ADN 11) solo dentro del perfil niño.
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
