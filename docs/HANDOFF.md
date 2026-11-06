# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-05. Última tarea cerrada: Tino en la bienvenida y en las novedades (ADR 130); 127 a 130 en `main` y producción (SW v672). Sigue MV2.30 Gastos. MOV.1 en pausa. HF.0f en curso: banco sin commitear y fuera de esta copia.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 5326/5326 (2026-11-05, ADR 130) |
| Tests E2E | 438/438 (2026-11-05, ADR 130, `--workers=2`); "dos dispositivos abiertos" de `nube.test.js` es intermitente. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v48 (`perfiles`, APR.3a) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **1**: BUG-027 (documental). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**Tino en la bienvenida y en las novedades, 2026-11-05**
Tino saluda en el paso del nombre y explica en las novedades, que estrenan su primera entrada ([ADR 130](DECISIONS/130-tino-en-la-bienvenida-y-las-novedades.md)). SW v672.

**Tino, ronda 2 en el adulto, 2026-11-05**
Ocho dibujos originales más, cada uno en su vacío o aviso; los anchos caben en el sol ([ADR 129](DECISIONS/129-tino-ronda-2-en-el-adulto.md)). SW v671.

**Identidad v3 "Bosque y sol", 2026-11-05**
Paleta del isotipo, Plus Jakarta Sans, tarjetas por sección, banda en Inicio y Tino en el adulto ([ADR 127](DECISIONS/127-identidad-bosque-y-sol.md)); frascos con café ([128](DECISIONS/128-los-frascos-se-llenan-de-cafe.md)). SW v670.

**MV2.30 tanda 5 - la barra de abajo; cierra Inicio, 2026-11-05**
Píldora detrás del ícono activo y "Registrar" plano; el tablero de Inicio quedó completo y su HTML se borró ([ADR 126](DECISIONS/126-inicio-del-adulto-en-el-telefono.md)). SW v669.

**MV2.30 tanda 4 - las hojas de Inicio, 2026-11-05**
"Pagos para hoy" con el estado de cada pago en su color y el total en el pie; "Registrar" con Gasto e Ingreso arriba y una lista debajo; "Tu perfil" con medidas nuevas ([ADR 126](DECISIONS/126-inicio-del-adulto-en-el-telefono.md)). SW v668.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En pausa:** **MOV.1, auditoría UX/UI móvil de Claude Design**: 17 de 25 cerradas, sigue la 18 (Cierre). Pausada el 2026-10-27 para la prueba en la nube (decisión en chat); el orden de sus fichas no cambia. Detalle en la tarjeta de [`BOARD.md`](BOARD.md).
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md), Propuesta): su Fase 0 corre en paralelo a MOV.1 porque no comparte archivos ni decisiones; HF.0a, HF.0b, HF.0h, HF.0c, HF.0i, HF.0d, HF.0e y HF.0j cerradas; P1 a P8 resueltas. Pendientes de la Fase 0: HF.0f (sus tres errores ya están corregidos; el banco sigue sin commitear y no está en esta copia) y HF.0g; DOC.5 en Mantenimiento.
- **Iniciativa NUBE** ([ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md), Aceptada): Finko en la nube con Supabase, cuenta opcional. NUBE.0 a NUBE.3 cerradas: cuenta por correo para invitados, sincronización por registro, borrar la cuenta y el teléfono del niño en `finko-prueba`. Sigue NUBE.4 (bancos), que pide su propio ADR; invitar probadores pide SMTP propio en Supabase.
- **Iniciativa APR, "Aprende y aplícalo"** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [ADR 093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), Propuesta; **solo del niño desde el [ADR 101](DECISIONS/101-finko-del-adulto-decide-no-ensena.md)**, que deja para el adulto la ayuda para decidir, DEC.1): Fases 1 a 4 hechas (salvo la revisión pedagógica de APR.2c); el niño ya puede empezar solo ([ADR 100](DECISIONS/100-el-nino-empieza-solo.md)); quedan la revisión pedagógica de las lecciones del niño (APR.3f) y la ronda 2 de Tino en el niño (APR.5b): los dibujos llegaron ([ADR 129](DECISIONS/129-tino-ronda-2-en-el-adulto.md)), falta el conversor del [095](DECISIONS/095-tino-en-el-sprite.md). Cada rebanada se sube a `main` al cerrar. El 093 acota el ADR 003 (ADN 11) solo dentro del perfil niño.
- **El adulto en el teléfono (MV2.30)**: los 6 tableros "Finko móvil · rediseño" de `Diseño Finko/`, uno por ADR y en tandas. Inicio cerrado ([ADR 126](DECISIONS/126-inicio-del-adulto-en-el-telefono.md)); sigue Gastos ("rediseño1"). Los que faltan van sobre la identidad del [ADR 127](DECISIONS/127-identidad-bosque-y-sol.md).
- **Canvas móvil (MV2.3)**: aplicado completo ([ADR 116](DECISIONS/116-lo-que-faltaba-del-canvas-primera-tanda.md) a [123](DECISIONS/123-la-hoja-de-formulario-completa.md)) y publicado en `main` y producción (v658, 2026-11-04, a pedido y sin medir antes). **Lo que queda: MV2.28** en el tablero (anotar MV2.17 y medir fluidez y Lighthouse en producción).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
