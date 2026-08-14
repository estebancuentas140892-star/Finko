# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-13. Última tarea cerrada: DOC.2, auditoría documental transversal (sin código de producto).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4212/4212 verdes (2026-08-13) |
| Tests E2E | 269/269 verdes, sello escrito sobre el runtime de CFG.5b (1 flaky en `smoke.test.js`, checklist de Necesidades de Tesorería, ajeno; verde al reintentar). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v40 (`config.avisosPorSeccion` y `.ultimoAvisoISO`, CFG.3c; migración aditiva) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **2** (eran 4: BUG-016 y BUG-013 se retiraron en DOC.2, ya corregidos): BUG-025, con impacto en el uso diario, y BUG-027, documental |

---

## 2. Últimas 5 tareas cerradas

**DOC.2 - auditoría documental transversal (Transversal), 2026-08-13**
Seis agentes en paralelo sobre 116 Markdown, 5 skills y 66 ADR. **Tres skills tenían el frontmatter YAML roto y nunca se autoactivaban** (el sello `> Revisado:` quedó dentro del bloque `---`): corregido y verificado en runtime. `elegir-modelo` contradecía el Estándar de comunicación de `CLAUDE.md` y se reescribió. **BUGS.md bajó de 4 a 2 errores abiertos**: BUG-016 y BUG-013 estaban corregidos en el código sin darse de baja. 16 enlaces rotos en documentos vivos, ahora cero. `ARCHITECTURE.md` corregido en 14 puntos verificables contra el código. Sin cambios de código de producto.

**PERF.5 - la compuerta del ADR 030 D4 se verifica y sigue cerrada (Transversal), 2026-08-13**
Pedido de ejecutar la migración a IndexedDB. **No se ejecutó, y esa es la entrega.** Los tres disparadores del [ADR 030](DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md) D4 siguen cerrados: sin jank en dispositivo real (toda cifra es de happy-dom), sin evidencia de cuota (la app no tiene telemetría: el disparador no puede dispararse solo) y CFG.4 bloqueada por el [ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), Abierta. Hallazgo nuevo: el costo está en los tests, no en el runtime. Sin código.

**LG.2d - mudanza de la vitrina a "Tu progreso" en Análisis + tarjeta en Inicio (Logros), 2026-08-13**
Cierra la iniciativa "Logros v2" completa. `renderPanelLogros()` se parte en `renderProgresoAnalisis()` y `renderTarjetaProgresoInicio()`; el [ADR 022](DECISIONS/022-vitrina-de-logros-en-ajustes.md) pasa a Superada. Cero cambios en `logros/logic.js`. SW v531 → v532.

**CFG.5b - re-autenticación con PIN en acciones críticas (Configuración), 2026-08-13**
Cierra la iniciativa CFG.5 completa (CFG.5a, CFG.5b, CFG.5c). `confirmarPin()` nueva en `modules/ui/bloqueo-acceso.js`, mismo contrato Promise<boolean> que `confirmar()`: sin candado activo resuelve `true` de inmediato, sin mostrar nada. Comparte el freno de intentos con el gate de arranque (`_intentoPin()` extraída). Borrar todo, importar respaldo y exportar respaldo piden el PIN; los dos primeros ya pedían "¿estás seguro?", exportar no tenía ninguna pregunta y ahora pide solo el PIN. Verificado en la app real. [ADR 063](DECISIONS/063-candado-de-acceso-local.md). SW v530 → v531.

**CFG.5c - biometría en PWA: viable y aun así descartada (Configuración), 2026-08-13**
Spike, sin código. Se midió el ciclo completo de WebAuthn con autenticador virtual de plataforma: registro, desbloqueo y **verificación de la firma con `crypto.subtle.verify()` en el cliente, sin servidor**: funciona, así que el motivo técnico del [ADR 063](DECISIONS/063-candado-de-acceso-local.md) era falso y queda corregido. Se descarta igual ([ADR 067](DECISIONS/067-biometria-descartada-como-desbloqueo.md)): no sube el techo de seguridad y la credencial vive fuera de `fk_v1`, lo que vuelve trampa el "Olvidé mi PIN borra todo". Reabre solo con ADR 043 resuelto **y** dominio fijo.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. **CFG.3 completa** (sus tres rebanadas, [ADR 066](DECISIONS/066-motor-unico-de-avisos.md)). **CFG.5 completa** (CFG.5a, CFG.5b, CFG.5c). **CFG.6 completa** (inventario sin hallazgos nuevos). **LIM.1 completa** (ADR 044 Aceptado). De PA.1 vive **PA.1b** (crédito automático del ingreso fijo, misma hoja). **MT.6**, **PE.6**, **ANL.1**, **AH.7**, **CFG.1+CFG.2**, **CAT** y **GAS.2** completas. **LG.2 completa**; de CFG queda solo **CFG.4** (respaldo/sync, ADN, ADR 043 abierto). **PERF.5 sigue sin iniciar**, con su compuerta reverificada el 2026-08-13. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
