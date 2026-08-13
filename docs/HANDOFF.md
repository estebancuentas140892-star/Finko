# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-13. Última tarea cerrada: CFG.2c, asistente fiscal en Ajustes.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4067/4067 verdes. 1 neto nuevo de CFG.2c sobre los 4066 de PERF.6 |
| Tests E2E | 266/266 verdes, sello escrito sobre el runtime de CFG.2c. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v38 (`metas[].planAportes`, MT.6c; default `[]`) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **4**: ver [BUGS.md](BUGS.md). BUG-025 es el único con impacto en el uso diario y necesita decisión; BUG-027 (ADR 059 inexistente) es nuevo, solo documental |

---

## 2. Últimas 5 tareas cerradas

**CFG.2c - lo fiscal pasa a un asistente tras botón en Ajustes (Configuración), 2026-08-13**
Ejecuta D1 del [ADR 050](DECISIONS/050-perfil-fiscal-ubicacion-y-framing.md) y **cierra la iniciativa fusionada CFG.1+CFG.2**. "Perfil fiscal y datos de renta" deja de montarse en el panel (ni plegado): el grupo "Impuestos" pasa a un botón ("Completar perfil fiscal") que abre un modal nuevo (`#modal-fiscal`) con los mismos dos formularios, mismo contrato de guardado. Reubicación de UX, sin lógica fiscal nueva: el override de "Ingresos brutos" se conserva. SW v524 → v525.

**PERF.6 - coalescer de renders reactivos por microtask (Transversal / `infra/render.js`), 2026-08-13**
Reabierta con la evidencia que la propia tarjeta exigía: el escenario nuevo del harness midió **398 ms** por una sola distribución del ingreso estando en Inicio con 10.000 gastos, no los "2-3 repintados de costo bajo" con los que se cerró en "no se hace" el 2026-08-05. Causa: `crud.js` emite un `state:change` **por mutación**, 12 en un tick. `programarRender()` los colapsa a un pintado: **398,3 → 94,5 ms** (4,2x a los 3 volúmenes). **Dedup por identidad:** agendar una flecha creada en el callback no deduplica nada. Migran los 8 listeners que pintan paneles; navegación, arranque y `renderAll` siguen síncronos. SW v523 → v524.

**LG.2e - familia comportamiento de logros (Transversal / `logros`), 2026-08-13**
Última rebanada de código del [ADR 032](DECISIONS/032-logros-v2-niveles-y-habitos.md): entra `hormiga-a-raya` (catálogo 17 → 18) y los otros dos logros del D4 quedan diferidos por datos, con la verificación en el ADR (`pagador-puntual` no es reconstruible: `S.compromisos` solo guarda el estado actual). **Hormiga se mide por monto (≤20.000), no por categoría**, que se desactiva recategorizando. `NIVELES_USUARIO`: tramo superior min 18 → 16. SW v522 → v523.

**AH.7a - Ahorro sube a la barra inferior, Calendario baja a "Más" (Navegación móvil), 2026-08-13**
Supersede el D1 del [ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md) con el [ADR 065](DECISIONS/065-ahorro-en-la-barra-inferior.md): la barra pasa a `Inicio · Gastos · [+] · Ahorro · Más` y Calendario baja al slot de ancho completo de la hoja. Es una entrada `nav-item--mobile-only` nueva, no una mudanza: la casa sigue encabezando su grupo del sidebar. La pestaña se enciende en toda la casa, así que `MAS_SECTIONS` cambia el grupo de ahorro por `agenda`. **`[href="#ahorro"]` ya no es único en el DOM:** todo selector nuevo declara plataforma. SW v521 → v522.

**CFG.2a - los ingresos brutos del monitor de renta se derivan solos (Análisis / Ajustes), 2026-08-13**
Cierra el hueco de captura que el [ADR 050](DECISIONS/050-perfil-fiscal-ubicacion-y-framing.md) dejó fuera de su alcance. `estimarIngresosBrutosAnio()` suma los recurrentes proyectados al año (`FACTOR_ANUAL_INGRESO` nueva en `infra/financiero.js`) más los puntuales del año. **Proyecta el año completo a propósito:** prorratear avisaría tarde. El valor de Ajustes pasa de captura a override. SW v519 → v521.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. **MT.6 (Metas v2)**, **PE.6 (Me deben v2)**, **ANL.1 (Análisis interpreta)** y **AH.7 (Ahorro)** completas, con todas sus rebanadas cerradas. De LIM.1 queda **LIM.1c** (espera el ADR 044). **LG.2d es la única rebanada viva de LG.2** (LG.2e cerrada): desbloqueada por el ADR 046 D4 y sin ninguna rebanada de ANL.1 por delante. **CFG.1+CFG.2 (perfil fiscal) completa**, con CFG.2a y CFG.2c cerradas: el ADR 050 queda implementado. De CFG.5 quedan CFG.5b (re-autenticacion en acciones criticas, habilitada por CFG.5a) y CFG.5c (spike de biometria). Iniciativa CAT (categorías) completa: CAT.1, CAT.2, CAT.3 y CAT.4 cerradas. Iniciativa GAS.2 (toast de confirmación) completa: GAS.2a, GAS.2b y GAS.2c cerradas. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
