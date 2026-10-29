# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-10-29. Última tarea cerrada: MV2.15b, "Esta semana" en Inicio móvil (ADR 099). MOV.1 en pausa. HF.0f en curso: banco listo sin commitear, BUG-035, BUG-036 y BUG-038 abiertos.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 5105/5105 (2026-10-29, MV2.15b) |
| Tests E2E | 373/373 verdes (2026-10-29, MV2.15b). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v48 (`perfiles`, APR.3a) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **4**: BUG-027 (documental), BUG-035, BUG-036 y BUG-038 (los encontró HF.0f, sin corregir). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**MV2.15b - "Esta semana" en Inicio móvil, 2026-10-29**
Lo que entra y lo que sale de mañana a 7 días, con los días de pago de los ingresos; una fila por cosa con el día a la izquierda y el pie por lado ([ADR 099](DECISIONS/099-inicio-movil-hoy-en-una-lista.md) D5). Solo móvil. Sigue MV2.15c. SW v624.

**MV2.15a - "Atención hoy" de Inicio móvil en una lista, 2026-10-29**
Una fila por clase de aviso con su acción, tope de tres y hoja "Ver los N"; la lente, el enlace y la hoja dicen el mismo número. Aviso nuevo "ingreso por distribuir" ([ADR 099](DECISIONS/099-inicio-movil-hoy-en-una-lista.md)). Solo móvil. SW v623.

**MV2.1 - Finko móvil 2, primera entrega, 2026-10-29**
Volver al origen real y a la misma fila, filas de una línea con hoja de detalle, cabecera del bloque Gastos con lupa y primario, Ahorro en cuatro columnas, Mis cuentas de 29 a 3 pantallas, pie pegado en formularios y arreglos del niño ([ADR 098](DECISIONS/098-finko-movil-2-primera-entrega.md)). Solo móvil. Sigue MV2.2. SW v622.

**PERF.12 - cambiar de sección sin estilizar el mes entero, 2026-10-28**
El foco del router iba antes de marcar la barra y forzaba dos pasadas de estilo; los días de Gastos fuera de pantalla ya no se estilizan (`content-visibility`). Gastos 245 a 112 ms a 4x. Quedan PERF.13 a PERF.15. SW v621.

**PERF.11 - fluidez medida en un navegador, 2026-10-28**
`pnpm perf:fluidez` (teléfono emulado, CPU 4x). Los modales cerrados ya no se pintan (36 superficies por cuadro de scroll a 1), abrir una hoja no espera a `inert` (INP 232 a 96 ms), sin View Transition al arrancar. SW v620.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En pausa:** **MOV.1, auditoría UX/UI móvil de Claude Design**: 17 de 25 cerradas, sigue la 18 (Cierre). Pausada el 2026-10-27 para la prueba en la nube (decisión en chat); el orden de sus fichas no cambia. Detalle en la tarjeta de [`BOARD.md`](BOARD.md).
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md), Propuesta): su Fase 0 corre en paralelo a MOV.1 porque no comparte archivos ni decisiones; HF.0a, HF.0b, HF.0h, HF.0c, HF.0i, HF.0d, HF.0e y HF.0j cerradas; P1 a P8 resueltas. Pendientes de la Fase 0: HF.0f (banco construido y sin commitear: sus ocho rojas reproducen BUG-035, BUG-036 y BUG-038, no se cierra hasta corregirlos) y HF.0g; DOC.5 en Mantenimiento.
- **Iniciativa NUBE** ([ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md), Aceptada): Finko en la nube con Supabase, cuenta opcional. NUBE.0 a NUBE.3 cerradas: cuenta por correo para invitados, sincronización por registro, borrar la cuenta y el teléfono del niño en `finko-prueba`. Sigue NUBE.4 (bancos), que pide su propio ADR; invitar probadores pide SMTP propio en Supabase.
- **Iniciativa APR, "Aprende y aplícalo"** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [ADR 093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), Propuesta): Fase 1 en curso sin esperar a MOV.1 (decisión del 2026-10-24); Fase 1 cerrada; Fase 2 cerrada salvo la revisión pedagógica de APR.2c; Fases 1 a 4 hechas; quedan la revisión pedagógica de las lecciones (APR.2c y APR.3f) y la ronda 2 de Tino ([ADR 094](DECISIONS/094-tino-el-guatin.md) y [095](DECISIONS/095-tino-en-el-sprite.md), APR.5b), que espera sus dibujos. Cada rebanada se sube a `main` al cerrar. El 093 acota el ADR 003 (ADN 11) solo dentro del perfil niño.
- **MV2.2, Finko móvil 2 segunda entrega** (Inicio, lentes, Distribuir y Más): en proceso en [`BOARD.md`](BOARD.md). Inicio va por el [ADR 099](DECISIONS/099-inicio-movil-hoy-en-una-lista.md): MV2.15a y MV2.15b cerradas, sigue MV2.15c (avatar y hoja de perfil). Rama `mv2/finko-movil-2`.
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
