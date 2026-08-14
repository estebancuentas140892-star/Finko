# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-14. Última tarea cerrada: DOC.3, fichas de contexto bajo su techo y sellos vencidos re-verificados (sin código).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4217/4218 (2026-08-14). El único rojo es **BUG-028**, ajeno a la última tarea y verificado con `git stash` |
| Tests E2E | 269/269 verdes, sello `14791f51971b` escrito sobre el runtime de PERF.10a. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v40 (`config.avisosPorSeccion` y `.ultimoAvisoISO`, CFG.3c; migración aditiva) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **3**: BUG-025 (impacto en el uso diario), BUG-027 (documental) y BUG-028 (el aviso de compromiso próximo ignora el `hoyISO` inyectado; deja la suite unitaria en rojo) |

---

## 2. Últimas 5 tareas cerradas

**DOC.3 - fichas de contexto bajo su techo y sellos vencidos re-verificados (Transversal), 2026-08-14**
**El defecto no era el tamaño sino la historia duplicada:** en `inicio.md` y `calendario.md` "Cambios realizados" reproducía el CHANGELOG en párrafos; podarlo bastó, sin partirlas. `transversal.md` sí se partió en cuatro: nacen `categorias.md`, `logros.md` y `escritorio.md`. Los tres sellos se re-verificaron ancla por ancla y **dos afirmaban cifras ya falsas** (CTA de cuenta: 5 superficies, hoy 4; tejas de marca: 11 bancos, hoy 12). Ninguna ficha supera 40 KB. Sin código.

**PERF.10a - fachada de `localStorage` en el runtime (Transversal), 2026-08-14**
`fk_v1` y el motor dejan de nombrarse fuera de `modules/core/storage.js`. `restaurarBlob()` distingue JSON inválido de cupo lleno: la segunda ruta ya no se anuncia como "archivo corrupto" y sí activa la salvaguarda del [ADR 030](DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md) D2. `borrarTodo()` reemplaza los dos `localStorage.clear()` crudos. Las dos cancelan el `save()` pendiente, que podía resucitar datos borrados en el reload. **Falta PERF.10b** (helper E2E). SW v532 → v533.

**ADR 068 - PERF.5 sale del tablero: la migración a IndexedDB se acota (Transversal), 2026-08-14**
Decisión delegada por Esteban, seis revisiones en paralelo. **No se implementa y deja de ser tarjeta:** sus tres disparadores solo cambiaban de estado desde fuera del tablero, así que era inelegible por construcción. El [ADR 068](DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md) es su fuente única: fija el alcance (blob-en-IndexedDB) y deja **dos** disparadores comprobables, T1 (cuota medida) y T2 (ADR 043 resuelto como D o E, o foto de perfil aprobada). Nacen **PERF.9** y **PERF.10**. Sin código.

**DOC.2 - auditoría documental transversal (Transversal), 2026-08-13**
Seis agentes en paralelo sobre 116 Markdown, 5 skills y 66 ADR. **Tres skills tenían el frontmatter YAML roto y nunca se autoactivaban** (el sello `> Revisado:` quedó dentro del bloque `---`): corregido y verificado en runtime. `elegir-modelo` contradecía el Estándar de comunicación de `CLAUDE.md` y se reescribió. **BUGS.md bajó de 4 a 2 errores abiertos**: BUG-016 y BUG-013 estaban corregidos en el código sin darse de baja. 16 enlaces rotos en documentos vivos, ahora cero. `ARCHITECTURE.md` corregido en 14 puntos verificables contra el código. Sin cambios de código de producto.

**LG.2d - mudanza de la vitrina a "Tu progreso" en Análisis + tarjeta en Inicio (Logros), 2026-08-13**
Cierra la iniciativa "Logros v2" completa. `renderPanelLogros()` se parte en `renderProgresoAnalisis()` y `renderTarjetaProgresoInicio()`; el [ADR 022](DECISIONS/022-vitrina-de-logros-en-ajustes.md) pasa a Superada. Cero cambios en `logros/logic.js`. SW v531 → v532.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. **CFG.3 completa** (sus tres rebanadas, [ADR 066](DECISIONS/066-motor-unico-de-avisos.md)). **CFG.5 completa** (CFG.5a, CFG.5b, CFG.5c). **CFG.6 completa** (inventario sin hallazgos nuevos). **LIM.1 completa** (ADR 044 Aceptado). De PA.1 vive **PA.1b** (crédito automático del ingreso fijo, misma hoja). **MT.6**, **PE.6**, **ANL.1**, **AH.7**, **CFG.1+CFG.2**, **CAT** y **GAS.2** completas. **LG.2 completa**; de CFG queda solo **CFG.4** (respaldo/sync, ADN, ADR 043 abierto). La migración a IndexedDB **ya no es tarjeta** ([ADR 068](DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md), fuente única); en su lugar viven **PERF.9** y **PERF.10b** (PERF.10a cerrada el 2026-08-14). La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
