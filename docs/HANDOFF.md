# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-04. Última tarea cerrada: AH.5, D2+D3 del ADR 049, hero educativo y aporte directo baja a secundario (Ahorro).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 3738/3738 verdes en el índice de AH.5 |
| Tests E2E | 260/260 verdes, sello escrito sobre el índice con solo `view.js`/`service-worker.js` staged (AH.5, 2026-08-04). **Compuerta** desde el 2026-07-30. **Sesiones paralelas:** con otra sesión escribiendo el mismo árbol en vivo (LEG.2), la corrida se reintentó 4 veces por inestabilidad del server compartido (8081) hasta coincidir con una ventana calma; ninguna falla tocó Ahorro/Fondo en ningún intento |
| Schema version (`localStorage`) | v32 (`config.ultimaVersionVista`, UPD.1; migración backfill al catálogo vigente) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **3**: ver [BUGS.md](BUGS.md). BUG-025 es el único con impacto en el uso diario, y necesita decisión antes de tocarlo |

---

## 2. Últimas 5 tareas cerradas

**AH.5 - D2+D3 del ADR 049, hero educativo y aporte directo baja a secundario (Ahorro), 2026-08-04**
La tarjeta activa del fondo abre con una línea de propósito antes de la primera cifra (D3); "Registrar un aporte" baja de botón primario ancho al mismo peso ghost/secundario que "Editar" (D2), porque el flujo principal ya es el asistente "Distribuir mi ingreso". Sin handoff de diseño: sin mockup, se siguió la convención ya escrita en `view.js`/`analysis.css`. Cierra las cuatro decisiones del ADR 049. Commit `dfff037`.

**EDIT.1 - editar sin destruir un préstamo (Me deben), cierra la tarjeta completa, 2026-08-04**
Botón "Editar" en cada fila abre el modal con los datos prellenados; la cuenta de origen no se vuelve a preguntar (ADR 053). `normalizarPersonal(datos, existente)` conserva el histórico de pagos y solo recalcula `liquidado`; con cuenta, el monto editado ajusta el saldo por delta (ADR 053 I3), con confirmación si deja la cuenta en negativo. Bug encontrado y corregido en la misma tarea: la rama de edición omitía `motivo`/`fechaLimite` vacíos igual que crear, y `editar()` (Object.assign) conservaba el valor viejo al borrarlos en el form. Mismo patrón que Metas, Apartados e Inversión, que ya lo habían validado. Commit `684e228`.

**INT.1b - las hijas de Ahorro se anidan y el sidebar cabe, 2026-08-03**
Cierra D6 del [ADR 059](DECISIONS/059-interfaz-de-escritorio.md) (mitad) y **BUG-026**. Fondo, Metas, Reservas e Inversión pasan de filas permanentes a `.nav-subnav`, desplegado solo dentro del grupo Ahorro (`shell.js`, `markActiveNav`). El sidebar recupera ~160px y el nav deja de desbordar a 1280x799 (648px/607 disponibles → 608px/608). La regla de compactación de emergencia (BUG-026, muerta por cascada) se borró en vez de repararse. `.section__volver` de las 4 hijas se oculta en desktop, intacto en móvil. Acota el ADR 056 sin revertirlo. Commit `4f87f77`.

**CFG.2b - Finko infiere si debes declarar renta y lo enmarca por situación laboral, 2026-08-03**
Resuelve **D2 del [ADR 050](DECISIONS/050-perfil-fiscal-ubicacion-y-framing.md)** (el framing legal que bloqueaba la tarjeta) por delegación explícita de Esteban: alternativa **C acotada**, la afirmación recae sobre la regla general, nunca sobre la obligación personal del usuario. `inferirEstadoDeclarante()` da 4 estados y su veredicto encabeza la card de renta; el checkbox "La DIAN me notificó" queda como override positivo. Código en el commit `727d8c9` (CAT.3b, sesión paralela) por la carrera del índice compartido.

**CAT.3b - los siete accesos crudos de ícono pasan por la resolutora, 2026-08-03**
`presupuesto/view.js` (envelope + banner de alertas), `resumen/view.js` (categoría top de Inicio) y cuatro accesos de Gastos fijos (`agenda/view.js` ×2, `gastos/logic.js`, `tesoreria/views/distribucion.js`) leían el mapa nativo crudo; los tres primeros ya caían a `c-otros` con una personalizada aunque el formulario que la creó mostrara su ícono. Los siete pasan a `iconoDeCategoriaGasto()` (ADR 058 D3). Quedan CAT.3c y CAT.3d.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
