# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-13. Última tarea cerrada: MV2.30 Mis cuentas tanda 1 (ADR 135). Sigue tanda 2. MOV.1 en pausa. HF.0f en curso: banco sin commitear y fuera de esta copia.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 5431/5431 (2026-11-13, ADR 134 tanda 4) |
| Tests E2E | 449/449 (2026-11-13, ADR 134 tanda 4, `--workers=2`); "dos dispositivos abiertos" de `nube.test.js` es intermitente. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v48 (`perfiles`, APR.3a) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **1**: BUG-027 (documental). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**MV2.30 Mis cuentas tanda 1 - el total, tu ingreso y "Reparte", 2026-11-13**
Pastilla de cuentas, "Tu ingreso" y "Reparte tus $X" ([ADR 135](DECISIONS/135-mis-cuentas-y-me-deben-en-el-telefono.md) D1 a D3). SW v689.

**MV2.30 Consultar tanda 4 - Análisis en filas; cierra Consultar, 2026-11-13**
Salud suelta, lo demás en filas, detalle y renta en hoja; "rediseño3" borrado ([ADR 134](DECISIONS/134-consultar-del-adulto-en-el-telefono.md) D7). SW v688.

**MV2.30 Consultar tanda 3 - Movimientos por día, 2026-11-13**
Cada día con su encabezado y su total, la fila sin el día, la hoja del gasto y la búsqueda con "Limpiar" ([ADR 134](DECISIONS/134-consultar-del-adulto-en-el-telefono.md) D6). SW v687.

**MV2.30 Consultar tanda 2 - la hoja de un día y el Calendario vacío, 2026-11-13**
"Mañana, sábado 14", pagos en vez de compromisos, "cada mes"; sin nada con fecha, "Agregar un pago fijo" en el banner ([ADR 134](DECISIONS/134-consultar-del-adulto-en-el-telefono.md) D5). SW v686.

**MV2.30 Consultar tanda 1 - la hoja Más y Calendario, 2026-11-13**
Más con el estado bajo el nombre; Calendario con lo próximo en frase, la leyenda de lo que sale y entra y lo del mes en listas ([ADR 134](DECISIONS/134-consultar-del-adulto-en-el-telefono.md) D1 a D4). SW v685.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En pausa:** **MOV.1, auditoría UX/UI móvil de Claude Design**: 17 de 25 cerradas, sigue la 18 (Cierre). Pausada el 2026-10-27 para la prueba en la nube. Detalle en [`BOARD.md`](BOARD.md).
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md), Propuesta): su Fase 0 corre en paralelo a MOV.1; cerradas de la HF.0a a la HF.0j salvo la f y la g; P1 a P8 resueltas. Pendientes: HF.0f (errores corregidos; el banco sin commitear, fuera de esta copia) y HF.0g; DOC.5 en Mantenimiento.
- **Iniciativa NUBE** ([ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md), Aceptada): Finko en la nube con Supabase, cuenta opcional. NUBE.0 a NUBE.3 cerradas: cuenta por correo para invitados, sincronización por registro, borrar la cuenta y el teléfono del niño en `finko-prueba`. Sigue NUBE.4 (bancos), que pide su propio ADR; invitar probadores pide SMTP propio en Supabase.
- **Iniciativa APR, "Aprende y aplícalo"** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [ADR 093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), Propuesta; **solo del niño desde el [ADR 101](DECISIONS/101-finko-del-adulto-decide-no-ensena.md)**, que deja para el adulto la ayuda para decidir, DEC.1): Fases 1 a 4 hechas (salvo la revisión pedagógica de APR.2c); el niño ya puede empezar solo ([ADR 100](DECISIONS/100-el-nino-empieza-solo.md)); quedan la revisión pedagógica de las lecciones del niño (APR.3f) y la ronda 2 de Tino en el niño (APR.5b): los dibujos llegaron ([ADR 129](DECISIONS/129-tino-ronda-2-en-el-adulto.md)), falta el conversor del [095](DECISIONS/095-tino-en-el-sprite.md). Cada rebanada se sube a `main` al cerrar. El 093 acota el ADR 003 (ADN 11) solo dentro del perfil niño.
- **El adulto en el teléfono (MV2.30)**: los 6 tableros "Finko móvil · rediseño" de `Diseño Finko/`, uno por ADR y en tandas. Inicio ([ADR 126](DECISIONS/126-inicio-del-adulto-en-el-telefono.md)), Gastos ([ADR 132](DECISIONS/132-gastos-del-adulto-en-el-telefono.md)), Ahorro ([ADR 133](DECISIONS/133-ahorro-del-adulto-en-el-telefono.md)) y Consultar ([ADR 134](DECISIONS/134-consultar-del-adulto-en-el-telefono.md)) cerrados; "rediseño4" ([ADR 135](DECISIONS/135-mis-cuentas-y-me-deben-en-el-telefono.md)) en curso, tanda 1 de 4; luego "rediseño5". Van sobre la identidad del [ADR 127](DECISIONS/127-identidad-bosque-y-sol.md).
- **Canvas móvil (MV2.3)**: aplicado completo ([ADR 116](DECISIONS/116-lo-que-faltaba-del-canvas-primera-tanda.md) a [123](DECISIONS/123-la-hoja-de-formulario-completa.md)) y publicado en `main` y producción (v658, 2026-11-04, a pedido y sin medir antes). **Lo que queda: MV2.28** en el tablero (anotar MV2.17 y medir fluidez y Lighthouse en producción).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN (la última, sincronización, se cerró con el [ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)). Para el resto, la columna Estado de cada tarjeta.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
