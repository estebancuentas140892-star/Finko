# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-05. Última tarea cerrada: ADR 125, Ahorro abre en el fondo (sin casa). Sigue MV2.30, los 6 tableros del adulto. MOV.1 en pausa. HF.0f en curso: banco sin commitear y fuera de esta copia.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 5282/5282 (2026-11-05, ADR 125, árbol limpio) |
| Tests E2E | 438/438 (2026-11-05, ADR 125, `--workers=2`); "dos dispositivos abiertos" de `nube.test.js` es intermitente. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v48 (`perfiles`, APR.3a) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **1**: BUG-027 (documental). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**ADR 125 - Ahorro abre en el fondo, 2026-11-05**
"Ahorro" (barra inferior y lateral) abre el fondo con la barra de las cuatro lentes; `#ahorro` redirige y la casa se borra con su código y sus pruebas ([ADR 125](DECISIONS/125-ahorro-abre-en-el-fondo.md)). SW v664.

**MV2.29 - el niño en el teléfono, 2026-11-05**
El tablero de niños aplicado en cinco tandas: barra, Inicio, Alcancía y Yo; Aprender y la lección; las hojas; la primera vez y "¿Quién usa Finko?"; Familia del adulto ([ADR 124](DECISIONS/124-el-nino-en-el-telefono.md)). SW v663, publicado en `main` y producción el mismo día a pedido de Esteban.

**MV2.28 (b) - Ajustes dice qué guarda en "Más", 2026-11-04**
La fila de Ajustes lleva "Perfil, Familia, nube y datos" debajo del nombre, como en el prototipo (adenda al [ADR 108](DECISIONS/108-mas-dice-como-esta-cada-destino.md)). SW v658.

**MV2.28 (d) - el margen seguro en el pie de los diálogos cortos, 2026-11-04**
Confirmar, "¿Desde qué cuenta?", novedades y los demás diálogos con el pie fuera del cuerpo ya no dejan sus botones sobre la barra de inicio del iPhone (adenda al [ADR 123](DECISIONS/123-la-hoja-de-formulario-completa.md)). SW v657.

**BUG-035, BUG-036 y BUG-038 - los pagos de compromisos, 2026-11-04**
Distribuir fecha cada pago en el mes que cubre; un pago o abono se edita con su categoría fija; el pago de un fijo no toca `saldoTotal` (5c97b98). SW v656.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En pausa:** **MOV.1, auditoría UX/UI móvil de Claude Design**: 17 de 25 cerradas, sigue la 18 (Cierre). Pausada el 2026-10-27 para la prueba en la nube (decisión en chat); el orden de sus fichas no cambia. Detalle en la tarjeta de [`BOARD.md`](BOARD.md).
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md), Propuesta): su Fase 0 corre en paralelo a MOV.1 porque no comparte archivos ni decisiones; HF.0a, HF.0b, HF.0h, HF.0c, HF.0i, HF.0d, HF.0e y HF.0j cerradas; P1 a P8 resueltas. Pendientes de la Fase 0: HF.0f (sus tres errores ya están corregidos; el banco sigue sin commitear y no está en esta copia) y HF.0g; DOC.5 en Mantenimiento.
- **Iniciativa NUBE** ([ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md), Aceptada): Finko en la nube con Supabase, cuenta opcional. NUBE.0 a NUBE.3 cerradas: cuenta por correo para invitados, sincronización por registro, borrar la cuenta y el teléfono del niño en `finko-prueba`. Sigue NUBE.4 (bancos), que pide su propio ADR; invitar probadores pide SMTP propio en Supabase.
- **Iniciativa APR, "Aprende y aplícalo"** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [ADR 093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), Propuesta; **solo del niño desde el [ADR 101](DECISIONS/101-finko-del-adulto-decide-no-ensena.md)**, que deja para el adulto la ayuda para decidir, DEC.1): Fases 1 a 4 hechas (salvo la revisión pedagógica de APR.2c); el niño ya puede empezar solo ([ADR 100](DECISIONS/100-el-nino-empieza-solo.md)); quedan la revisión pedagógica de las lecciones del niño (APR.3f) y la ronda 2 de Tino ([ADR 094](DECISIONS/094-tino-el-guatin.md) y [095](DECISIONS/095-tino-en-el-sprite.md), APR.5b), que espera sus dibujos. Cada rebanada se sube a `main` al cerrar. El 093 acota el ADR 003 (ADN 11) solo dentro del perfil niño.
- **El adulto en el teléfono (MV2.30)**: los 6 tableros "Finko móvil · rediseño" de `Diseño Finko/`, uno por ADR y en tandas, como el del niño (ADR 124). Sin empezar; el orden está en la tarjeta.
- **Canvas móvil (MV2.3)**: aplicado completo ([ADR 116](DECISIONS/116-lo-que-faltaba-del-canvas-primera-tanda.md) a [123](DECISIONS/123-la-hoja-de-formulario-completa.md)) y publicado en `main` y producción (v658, 2026-11-04, a pedido y sin medir antes). **Lo que queda: MV2.28** en el tablero (anotar MV2.17 y medir fluidez y Lighthouse en producción).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
