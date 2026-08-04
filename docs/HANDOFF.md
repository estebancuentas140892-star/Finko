# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-04. Última tarea cerrada: EDIT.1, editar sin destruir un préstamo (Me deben), cierra la tarjeta completa.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 3736/3736 verdes en el índice de EDIT.1. Las 5 fallas preexistentes de `compromisos.test.js` no aplicaban (archivos no staged); siguen verificadas contra HEAD, sin tarjeta propia |
| Tests E2E | 259/260 verdes + 1 flaky en reintento, corrida del 2026-08-04. **Compuerta** desde el 2026-07-30 (sello sobre el índice, `git add` antes de sellar). **Sesiones paralelas:** `git update-index --cacheinfo` con blob armado a mano (`git hash-object -w`) separa el hunk propio del ajeno en un mismo archivo, usado el 2026-08-04 en `service-worker.js`; precedente con `git apply --cached` el 2026-08-02 (ARQ.1a vs. ARQ.1b) |
| Schema version (`localStorage`) | v32 (`config.ultimaVersionVista`, UPD.1; migración backfill al catálogo vigente) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **3**: ver [BUGS.md](BUGS.md). BUG-025 es el único con impacto en el uso diario, y necesita decisión antes de tocarlo |

---

## 2. Últimas 5 tareas cerradas

**EDIT.1 - editar sin destruir un préstamo (Me deben), cierra la tarjeta completa, 2026-08-04**
Botón "Editar" en cada fila abre el modal con los datos prellenados; la cuenta de origen no se vuelve a preguntar (ADR 053). `normalizarPersonal(datos, existente)` conserva el histórico de pagos y solo recalcula `liquidado`; con cuenta, el monto editado ajusta el saldo por delta (ADR 053 I3), con confirmación si deja la cuenta en negativo. Bug encontrado y corregido en la misma tarea: la rama de edición omitía `motivo`/`fechaLimite` vacíos igual que crear, y `editar()` (Object.assign) conservaba el valor viejo al borrarlos en el form. Mismo patrón que Metas, Apartados e Inversión, que ya lo habían validado. Commit `684e228`.

**INT.1b - las hijas de Ahorro se anidan y el sidebar cabe, 2026-08-03**
Cierra D6 del [ADR 059](DECISIONS/059-interfaz-de-escritorio.md) (mitad) y **BUG-026**. Fondo, Metas, Reservas e Inversión pasan de filas permanentes a `.nav-subnav`, desplegado solo dentro del grupo Ahorro (`shell.js`, `markActiveNav`). El sidebar recupera ~160px y el nav deja de desbordar a 1280x799 (648px/607 disponibles → 608px/608). La regla de compactación de emergencia (BUG-026, muerta por cascada) se borró en vez de repararse. `.section__volver` de las 4 hijas se oculta en desktop, intacto en móvil. Acota el ADR 056 sin revertirlo. Commit `4f87f77`.

**CFG.2b - Finko infiere si debes declarar renta y lo enmarca por situación laboral, 2026-08-03**
Resuelve **D2 del [ADR 050](DECISIONS/050-perfil-fiscal-ubicacion-y-framing.md)** (el framing legal que bloqueaba la tarjeta) por delegación explícita de Esteban: alternativa **C acotada**, la afirmación recae sobre la regla general, nunca sobre la obligación personal del usuario. `inferirEstadoDeclarante()` da 4 estados y su veredicto encabeza la card de renta; el checkbox "La DIAN me notificó" queda como override positivo. Código en el commit `727d8c9` (CAT.3b, sesión paralela) por la carrera del índice compartido.

**CAT.3b - los siete accesos crudos de ícono pasan por la resolutora, 2026-08-03**
`presupuesto/view.js` (envelope + banner de alertas), `resumen/view.js` (categoría top de Inicio) y cuatro accesos de Gastos fijos (`agenda/view.js` ×2, `gastos/logic.js`, `tesoreria/views/distribucion.js`) leían el mapa nativo crudo; los tres primeros ya caían a `c-otros` con una personalizada aunque el formulario que la creó mostrara su ícono. Los siete pasan a `iconoDeCategoriaGasto()` (ADR 058 D3). Quedan CAT.3c y CAT.3d.

**GU.1a - auditoría del sistema de guía + revisión formal del ADR 016, 2026-08-03**
Sin cambio de código. Inventario de las 17 secciones de dominio confirma el [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md) vigente sin desviaciones: las 11 secciones con banner de propósito quedaron limpias de código muerto de EP.1-EP.6, sin empty states que repitan el banner. Único hallazgo: Ahorro apila dos preguntas gancho (banner + hero) mientras el fondo está vacío, anotado para que **AH.5 D3** lo resuelva al rediseñar. Adelantada frente a la recomendación de esperar a las v2 grandes, por instrucción directa.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
