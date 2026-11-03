# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-03. Última tarea cerrada: MV2.20, las lentes quedan a la vista (ADR 113). MOV.1 en pausa. HF.0f en curso: banco listo sin commitear, BUG-035, BUG-036 y BUG-038 abiertos.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 5209/5209 (2026-11-03, MV2.20, árbol limpio) |
| Tests E2E | 389/389 verdes (2026-11-03, MV2.20, `--workers=2`). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v48 (`perfiles`, APR.3a) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **4**: BUG-027 (documental), BUG-035, BUG-036 y BUG-038 (los encontró HF.0f, sin corregir). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**MV2.20 - las lentes quedan a la vista, 2026-11-03**
Al bajar, la barra de lentes de Gastos y de Ahorro queda pegada arriba; única excepción a R31 ([ADR 113](DECISIONS/113-las-lentes-quedan-a-la-vista.md)). SW v645.

**CFG.6 - Ajustes como índice en el teléfono, 2026-11-03**
Cada bloque es una fila con su estado que se abre en su sitio, lo tuyo primero; 5.376 a 1.261 px a 390 ([ADR 112](DECISIONS/112-ajustes-como-indice-en-el-telefono.md)). SW v644.

**MV2.27 - Calendario: el mes entero en el teléfono, 2026-11-03**
El mes cabe de 320 a 430 px con el día en un círculo; Distribuir y Aportar visten su sección y el vacío dice un mensaje ([ADR 111](DECISIONS/111-calendario-el-mes-entero-en-el-telefono.md)). SW v643.

**MV2.19 - Distribuir sin salir de donde estás, 2026-10-30**
En el teléfono el asistente se abre sobre la pantalla en que estás, con pie pegado, la cuenta al empezar, cada paso con lo suyo y la hoja final con "Deshacer" ([ADR 110](DECISIONS/110-distribuir-sin-salir-de-donde-estas.md)). SW v642.

**MV2.9 - Mis cuentas en filas con hoja, 2026-10-30**
Cuentas, tarjetas y fuentes en filas de 64px que abren la hoja de Gastos; ninguna papelera a la vista y 2.207 a 1.616 px a 390 ([ADR 109](DECISIONS/109-mis-cuentas-en-filas-con-hoja.md)). SW v640.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En pausa:** **MOV.1, auditoría UX/UI móvil de Claude Design**: 17 de 25 cerradas, sigue la 18 (Cierre). Pausada el 2026-10-27 para la prueba en la nube (decisión en chat); el orden de sus fichas no cambia. Detalle en la tarjeta de [`BOARD.md`](BOARD.md).
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md), Propuesta): su Fase 0 corre en paralelo a MOV.1 porque no comparte archivos ni decisiones; HF.0a, HF.0b, HF.0h, HF.0c, HF.0i, HF.0d, HF.0e y HF.0j cerradas; P1 a P8 resueltas. Pendientes de la Fase 0: HF.0f (banco construido y sin commitear: sus ocho rojas reproducen BUG-035, BUG-036 y BUG-038, no se cierra hasta corregirlos) y HF.0g; DOC.5 en Mantenimiento.
- **Iniciativa NUBE** ([ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md), Aceptada): Finko en la nube con Supabase, cuenta opcional. NUBE.0 a NUBE.3 cerradas: cuenta por correo para invitados, sincronización por registro, borrar la cuenta y el teléfono del niño en `finko-prueba`. Sigue NUBE.4 (bancos), que pide su propio ADR; invitar probadores pide SMTP propio en Supabase.
- **Iniciativa APR, "Aprende y aplícalo"** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [ADR 093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), Propuesta; **solo del niño desde el [ADR 101](DECISIONS/101-finko-del-adulto-decide-no-ensena.md)**, que deja para el adulto la ayuda para decidir, DEC.1): Fase 1 en curso sin esperar a MOV.1 (decisión del 2026-10-24); Fase 1 cerrada; Fase 2 cerrada salvo la revisión pedagógica de APR.2c; Fases 1 a 4 hechas; el niño ya puede empezar solo ([ADR 100](DECISIONS/100-el-nino-empieza-solo.md)); quedan la revisión pedagógica de las lecciones del niño (APR.3f) y la ronda 2 de Tino ([ADR 094](DECISIONS/094-tino-el-guatin.md) y [095](DECISIONS/095-tino-en-el-sprite.md), APR.5b), que espera sus dibujos. Cada rebanada se sube a `main` al cerrar. El 093 acota el ADR 003 (ADN 11) solo dentro del perfil niño.
- **MV2.2, Finko móvil 2 segunda entrega**: en proceso en [`BOARD.md`](BOARD.md). Inicio (MV2.15), las fechas (MV2.6), las lentes (MV2.12), el encabezado (MV2.8), botones, avisos y vacíos (MV2.16, MV2.18, MV2.13), los filtros de Movimientos ([ADR 105](DECISIONS/105-movimientos-los-filtros-en-una-fila.md)), "Más" (MV2.21), Mis cuentas en filas (MV2.9), Distribuir en sitio (MV2.19) y Calendario (MV2.27) cerrados; lo que queda (MV2.5, el teclado de iOS) se mide en un iPhone real; MV2.26 la cerró CFG.6 y MV2.20 el ADR 113. Rama `mv2/finko-movil-2`, publicada en `main`.
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
