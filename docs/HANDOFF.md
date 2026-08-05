# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-05. Última tarea cerrada: MC.13e-2g, el asistente abre educando (Mis cuentas), que cierra MC.13 completa.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 3757/3757 verdes en el índice de MC.13e-2g |
| Tests E2E | 263/263 verdes, sello escrito sobre el índice de MC.13e-2g. **Compuerta** desde el 2026-07-30. **Sesiones paralelas:** árbol compartido con otra sesión (docs de diseño de escritorio sin commitear); el cierre commiteó solo sus propios archivos |
| Schema version (`localStorage`) | v33 (`config.legalAceptado`, LEG.2; migración grandfather para datos existentes) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **3**: ver [BUGS.md](BUGS.md). BUG-025 es el único con impacto en el uso diario, y necesita decisión antes de tocarlo |

---

## 2. Últimas 5 tareas cerradas

**MC.13e-2g - el asistente abre educando y reparte sus accesos por paso (Mis cuentas), cierra MC.13 completa, 2026-08-05**
`#modal-distribuir-body` queda en dos bloques del mismo scroll: educación arriba (barra 50/30/20, el porcentaje real del usuario al lado y qué entra en cada grupo) y el shell paginado de siempre abajo, prellenado. No es un Paso 0 a propósito: cumplir el punto 9 al pie de la letra habría sumado un clic al flujo más repetido de la app, lo contrario de lo que pedía la auditoría de UX. Los `ctas` vuelven repartidos uno por paso según su categoría, y el que no tiene paso se descarta. Decisiones y alternativas rechazadas: [ADR 061](DECISIONS/061-educacion-antes-de-repartir.md). Commit `f755c40`.

**LEG.2 - aceptación obligatoria versionada (Transversal), 2026-08-04**
Onboarding gana paso 2: checkbox único con enlaces al Centro Legal, obligatorio antes de entrar. Usuario existente con versión vieja (o sin registro) ve un gate independiente y bloqueante (sin Escape). `config.legalAceptado: {version, fecha} | null`, schema v33; usuario con datos ya guardados queda grandfathered a la versión histórica en la migración, no se le exige aceptar retroactivamente. No espera al checklist de contenido de `legal/README.md` (responsable, contacto, licencia, revisión de abogado): eso bloquea el paquete a v1.0, no el mecanismo. Commit `53becc8`.

**AH.5 - D2+D3 del ADR 049, hero educativo y aporte directo baja a secundario (Ahorro), 2026-08-04**
La tarjeta activa del fondo abre con una línea de propósito antes de la primera cifra (D3); "Registrar un aporte" baja de botón primario ancho al mismo peso ghost/secundario que "Editar" (D2), porque el flujo principal ya es el asistente "Distribuir mi ingreso". Sin handoff de diseño: sin mockup, se siguió la convención ya escrita en `view.js`/`analysis.css`. Cierra las cuatro decisiones del ADR 049. Commit `dfff037`.

**EDIT.1 - editar sin destruir un préstamo (Me deben), cierra la tarjeta completa, 2026-08-04**
Botón "Editar" en cada fila abre el modal con los datos prellenados; la cuenta de origen no se vuelve a preguntar (ADR 053). `normalizarPersonal(datos, existente)` conserva el histórico de pagos y solo recalcula `liquidado`; con cuenta, el monto editado ajusta el saldo por delta (ADR 053 I3), con confirmación si deja la cuenta en negativo. Bug encontrado y corregido en la misma tarea: la rama de edición omitía `motivo`/`fechaLimite` vacíos igual que crear, y `editar()` (Object.assign) conservaba el valor viejo al borrarlos en el form. Mismo patrón que Metas, Apartados e Inversión, que ya lo habían validado. Commit `684e228`.

**INT.1b - las hijas de Ahorro se anidan y el sidebar cabe, 2026-08-03**
Cierra D6 del [ADR 059](DECISIONS/059-interfaz-de-escritorio.md) (mitad) y **BUG-026**. Fondo, Metas, Reservas e Inversión pasan de filas permanentes a `.nav-subnav`, desplegado solo dentro del grupo Ahorro (`shell.js`, `markActiveNav`). El sidebar recupera ~160px y el nav deja de desbordar a 1280x799 (648px/607 disponibles → 608px/608). La regla de compactación de emergencia (BUG-026, muerta por cascada) se borró en vez de repararse. `.section__volver` de las 4 hijas se oculta en desktop, intacto en móvil. Acota el ADR 056 sin revertirlo. Commit `4f87f77`.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
