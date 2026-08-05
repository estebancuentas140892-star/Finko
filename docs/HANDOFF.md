# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-05. Última tarea cerrada: PE.6c y PE.6e, rendimiento e historial por persona (Me deben).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 3814/3814 verdes en el índice de PE.6c/PE.6e |
| Tests E2E | 263/263 verdes, sello escrito sobre el índice de PE.6c/PE.6e. **Compuerta** desde el 2026-07-30. **Sesiones paralelas:** árbol compartido con otra sesión (docs de diseño de escritorio sin commitear); el cierre commiteó solo sus propios archivos |
| Schema version (`localStorage`) | v34 (`Personal.abonos[]`, PE.6b; los préstamos ya cobrados migran con un abono agrupado y conservan `pagado`) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **3**: ver [BUGS.md](BUGS.md). BUG-025 es el único con impacto en el uso diario, y necesita decisión antes de tocarlo |

---

## 2. Últimas 5 tareas cerradas

**PE.6c y PE.6e - rendimiento del préstamo e historial por persona (Me deben), 2026-08-05**
Derivaciones puras sobre el historial que dejó PE.6b, sin schema. `calcularRendimiento()` dice cuánto ganaste y qué porcentaje de lo prestado es, **sin anualizar**: anualizar convertiría un préstamo informal en una promesa de retorno comparable con un CDT. `estadisticasPorPersona()` alimenta un bloque plegado bajo el resumen, solo para quien tiene más de un préstamo, que **describe y no califica** ([ADR 047](DECISIONS/047-me-deben-v2-intereses-e-historial.md) D5): sin score, y ordenado por total prestado, no por puntualidad. La puntualidad solo cuenta préstamos con fecha pactada. Commit `PENDIENTE2`.

**PE.6b - historial de abonos con schema v34 (Me deben), 2026-08-05**
`Personal.abonos[]` guarda fecha, monto, desglose capital/interés y cuenta destino de cada abono: hasta ahora solo existía el acumulador `pagado` y un préstamo con cinco abonos era indistinguible de uno con un solo pago. Resuelve el punto abierto del [ADR 047](DECISIONS/047-me-deben-v2-intereses-e-historial.md) a favor del **abono sintético**: lo ya cobrado migra agrupado en un abono marcado `agrupado`, que la vista rotula "Antes de este historial" en vez de inventarle fecha. Es la precondición de PE.6c y PE.6e. Commit `4e9d0d0`.

**MC.13e-2g - el asistente abre educando y reparte sus accesos por paso (Mis cuentas), cierra MC.13 completa, 2026-08-05**
`#modal-distribuir-body` queda en dos bloques del mismo scroll: educación arriba (barra 50/30/20, el porcentaje real del usuario al lado y qué entra en cada grupo) y el shell paginado de siempre abajo, prellenado. No es un Paso 0 a propósito: cumplir el punto 9 al pie de la letra habría sumado un clic al flujo más repetido de la app, lo contrario de lo que pedía la auditoría de UX. Los `ctas` vuelven repartidos uno por paso según su categoría, y el que no tiene paso se descarta. Decisiones y alternativas rechazadas: [ADR 061](DECISIONS/061-educacion-antes-de-repartir.md). Commit `f755c40`.

**LEG.2 - aceptación obligatoria versionada (Transversal), 2026-08-04**
Onboarding gana paso 2: checkbox único con enlaces al Centro Legal, obligatorio antes de entrar. Usuario existente con versión vieja (o sin registro) ve un gate independiente y bloqueante (sin Escape). `config.legalAceptado: {version, fecha} | null`, schema v33; usuario con datos ya guardados queda grandfathered a la versión histórica en la migración, no se le exige aceptar retroactivamente. No espera al checklist de contenido de `legal/README.md` (responsable, contacto, licencia, revisión de abogado): eso bloquea el paquete a v1.0, no el mecanismo. Commit `53becc8`.

**AH.5 - D2+D3 del ADR 049, hero educativo y aporte directo baja a secundario (Ahorro), 2026-08-04**
La tarjeta activa del fondo abre con una línea de propósito antes de la primera cifra (D3); "Registrar un aporte" baja de botón primario ancho al mismo peso ghost/secundario que "Editar" (D2), porque el flujo principal ya es el asistente "Distribuir mi ingreso". Sin handoff de diseño: sin mockup, se siguió la convención ya escrita en `view.js`/`analysis.css`. Cierra las cuatro decisiones del ADR 049. Commit `dfff037`.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. De PE.6 solo queda **PE.6d** (estados visuales) y está bloqueada hasta que IV.2 esté en producción. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
