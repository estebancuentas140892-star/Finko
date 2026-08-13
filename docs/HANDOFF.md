# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-13. Última tarea cerrada: CFG.5b, re-autenticación con PIN (cierra CFG.5 completa).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4207/4207 verdes, 8 de ellos del guard de PIN en acciones críticas (CFG.5b) |
| Tests E2E | 269/269 verdes, sello escrito sobre el runtime de CFG.5b (1 flaky en `smoke.test.js`, checklist de Necesidades de Tesorería, ajeno; verde al reintentar). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v40 (`config.avisosPorSeccion` y `.ultimoAvisoISO`, CFG.3c; migración aditiva) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **4**: ver [BUGS.md](BUGS.md). BUG-025 es el único con impacto en el uso diario y necesita decisión; BUG-027 (ADR 059 inexistente) es nuevo, solo documental |

---

## 2. Últimas 5 tareas cerradas

**CFG.5b - re-autenticación con PIN en acciones críticas (Configuración), 2026-08-13**
Cierra la iniciativa CFG.5 completa (CFG.5a, CFG.5b, CFG.5c). `confirmarPin()` nueva en `modules/ui/bloqueo-acceso.js`, mismo contrato Promise<boolean> que `confirmar()`: sin candado activo resuelve `true` de inmediato, sin mostrar nada. Comparte el freno de intentos con el gate de arranque (`_intentoPin()` extraída). Borrar todo, importar respaldo y exportar respaldo piden el PIN; los dos primeros ya pedían "¿estás seguro?", exportar no tenía ninguna pregunta y ahora pide solo el PIN. Verificado en la app real. [ADR 063](DECISIONS/063-candado-de-acceso-local.md). SW v530 → v531.

**CFG.5c - biometría en PWA: viable y aun así descartada (Configuración), 2026-08-13**
Spike, sin código. Se midió el ciclo completo de WebAuthn con autenticador virtual de plataforma: registro, desbloqueo y **verificación de la firma con `crypto.subtle.verify()` en el cliente, sin servidor**: funciona, así que el motivo técnico del [ADR 063](DECISIONS/063-candado-de-acceso-local.md) era falso y queda corregido. Se descarta igual ([ADR 067](DECISIONS/067-biometria-descartada-como-desbloqueo.md)): no sube el techo de seguridad y la credencial vive fuera de `fk_v1`, lo que vuelve trampa el "Olvidé mi PIN borra todo". Reabre solo con ADR 043 resuelto **y** dominio fijo.

**CFG.6 - revisión general de Ajustes, inventario final (Configuración), 2026-08-13**
Cierra la tarjeta. Los pases visuales ya estaban hechos (2026-07-25, 2026-08-02); quedaba el punto 1, inventario de configs que faltan en Ajustes. Revisado el panel completo (`config/view.js`) contra CFG.1 a CFG.5: **sin hallazgos nuevos**, lo único ausente (respaldo/sync, re-autenticación, biometría) ya tiene tarjeta propia. Sin cambios de código.

**CFG.3c - avisos por sección y sello de día persistido (Configuración), 2026-08-13**
Cierra la iniciativa CFG.3 ([ADR 066](DECISIONS/066-motor-unico-de-avisos.md)). Esteban pidió ejecutarla ya, sin esperar la evidencia de uso que el D6 del ADR pedía. **Granularidad por sección** (`SECCIONES_AVISO`, cinco), no por los nueve tipos: nueve toggles habrían sido ruido sin decisión real. `filtrarPorPreferencia()` nuevo en `infra/avisos.js`, consumido por las dos superficies existentes. **El sello persistido (`config.ultimoAvisoISO`) reemplaza el flag de sesión**: antes, cerrar y volver a abrir la app el mismo día repetía la notificación. Schema v39 → v40, aditiva. SW v529 → v530.

**CFG.3b - panel "Avisos" en Inicio (Configuración / transversal), 2026-08-13**
Segunda rebanada del ADR 066. El motor de CFG.3a ya devolvía la lista; el terreno de Inicio ya estaba ocupado por tres paneles que cubren la mayoría de tipos con su lógica de siempre (sin pasar por el motor). El panel nuevo filtra a lo que hoy no tiene casa: apartado listo, día de pago, préstamo con fecha vencida. Vive en `resumen/` (mismo dominio agregador del dashboard). SW v528 → v529.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. **CFG.3 completa** (sus tres rebanadas, [ADR 066](DECISIONS/066-motor-unico-de-avisos.md)). **CFG.5 completa** (CFG.5a, CFG.5b, CFG.5c). **CFG.6 completa** (inventario sin hallazgos nuevos). **LIM.1 completa** (ADR 044 Aceptado). De PA.1 vive **PA.1b** (crédito automático del ingreso fijo, misma hoja). **MT.6**, **PE.6**, **ANL.1**, **AH.7**, **CFG.1+CFG.2**, **CAT** y **GAS.2** completas. De LG.2 queda **LG.2d**; de CFG queda solo **CFG.4** (respaldo/sync, ADN, ADR 043 abierto). La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
