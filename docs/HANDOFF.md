# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-13. Última tarea cerrada: REV.1 (ADR 137), tanda 1 de la revisión del 13 de noviembre. MOV.1 en pausa. HF.0f en curso: banco sin commitear y fuera de esta copia.

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

**REV.1 - la revisión del 13 de noviembre, tanda 1, 2026-11-13**
"Agregar" según el chip de Por pagar, vacíos con botón, el logo, el aviso al instalar, botones redondos, Movimientos y Límites ([ADR 137](DECISIONS/137-revision-del-13-de-noviembre-tanda-1.md)). SW v694.

**MV2.30 Ajustes - el índice, las filas y la hoja de borrar; cierra MV2.30, 2026-11-13**
Grupos con tejas, el tema en la fila y "Guardar respaldo primero"; "rediseño5" borrado ([ADR 136](DECISIONS/136-ajustes-del-adulto-en-el-telefono.md)). SW v693.

**MV2.30 Mis cuentas tanda 4 - Me deben y sus hojas; cierra rediseño4, 2026-11-13**
Me deben en filas, la hoja del préstamo y "Me pagaron"; "rediseño4" borrado ([ADR 135](DECISIONS/135-mis-cuentas-y-me-deben-en-el-telefono.md) D7 y D8). SW v692.

**MV2.30 Mis cuentas tanda 3 - Distribuir, paso 1, 2026-11-13**
Paso 1 en pregunta con lo recomendado, filas de necesidades y "Siguiente: ahorro" ([ADR 135](DECISIONS/135-mis-cuentas-y-me-deben-en-el-telefono.md) D6). SW v691.

**MV2.30 Mis cuentas tanda 2 - la hoja de una cuenta y Transferir, 2026-11-13**
Hoja propia de la cuenta; Transferir con "Sale de", "Entra a" y el monto en el botón ([ADR 135](DECISIONS/135-mis-cuentas-y-me-deben-en-el-telefono.md) D4 y D5). SW v690.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En pausa:** **MOV.1, auditoría UX/UI móvil de Claude Design**: 17 de 25 cerradas, sigue la 18 (Cierre). Pausada el 2026-10-27 para la prueba en la nube. Detalle en [`BOARD.md`](BOARD.md).
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md), Propuesta): su Fase 0 corre en paralelo a MOV.1; cerradas de la HF.0a a la HF.0j salvo la f y la g; P1 a P8 resueltas. Pendientes: HF.0f (errores corregidos; el banco sin commitear, fuera de esta copia) y HF.0g; DOC.5 en Mantenimiento.
- **Iniciativa NUBE** ([ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md), Aceptada): Finko en la nube con Supabase, cuenta opcional. NUBE.0 a NUBE.3 cerradas: cuenta por correo para invitados, sincronización por registro, borrar la cuenta y el teléfono del niño en `finko-prueba`. Sigue NUBE.4 (bancos), que pide su propio ADR; invitar probadores pide SMTP propio en Supabase.
- **Iniciativa APR, "Aprende y aplícalo"** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [ADR 093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), Propuesta; **solo del niño desde el [ADR 101](DECISIONS/101-finko-del-adulto-decide-no-ensena.md)**, que deja para el adulto la ayuda para decidir, DEC.1): Fases 1 a 4 hechas (salvo la revisión pedagógica de APR.2c); el niño ya puede empezar solo ([ADR 100](DECISIONS/100-el-nino-empieza-solo.md)); quedan la revisión pedagógica de las lecciones del niño (APR.3f) y la ronda 2 de Tino en el niño (APR.5b): los dibujos llegaron ([ADR 129](DECISIONS/129-tino-ronda-2-en-el-adulto.md)), falta el conversor del [095](DECISIONS/095-tino-en-el-sprite.md). Cada rebanada se sube a `main` al cerrar. El 093 acota el ADR 003 (ADN 11) solo dentro del perfil niño.
- **Revisión del 13 de noviembre (REV)**: tanda 1 hecha ([ADR 137](DECISIONS/137-revision-del-13-de-noviembre-tanda-1.md)). Siguen REV.2a a REV.3b; REV.4 (los ojos) espera la decisión de Esteban. Detalle en [`board/transversal.md`](board/transversal.md).
- **El adulto en el teléfono (MV2.30)**: hecho. Los 6 tableros "Finko móvil · rediseño" quedaron aplicados ([ADR 126](DECISIONS/126-inicio-del-adulto-en-el-telefono.md) y [132](DECISIONS/132-gastos-del-adulto-en-el-telefono.md) a [136](DECISIONS/136-ajustes-del-adulto-en-el-telefono.md)) y sus HTML borrados; `Diseño Finko/` quedó vacía.
- **Canvas móvil (MV2.3)**: aplicado completo ([ADR 116](DECISIONS/116-lo-que-faltaba-del-canvas-primera-tanda.md) a [123](DECISIONS/123-la-hoja-de-formulario-completa.md)) y publicado en `main` y producción (v658, 2026-11-04, a pedido y sin medir antes). **Lo que queda: MV2.28** en el tablero (anotar MV2.17 y medir fluidez y Lighthouse en producción).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN (la última, sincronización, se cerró con el [ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)). Para el resto, la columna Estado de cada tarjeta.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
