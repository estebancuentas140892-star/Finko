# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-02. Última tarea cerrada: CAL.5b, el lote también cubre deudas y se ofrece desde Inicio.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 3679/3679 verdes |
| Tests E2E | 255/255 verdes, corrida del 2026-08-02, **sin flaky**: el de IN.9c estaba causado por la cascada de entrada del dashboard (`cardIn` desliza cada celda desde `translateY(8px)` con 40ms de stagger y `boundingBox()` incluye el transform), y se cerró midiendo con `emulateMedia({ reducedMotion: 'reduce' })`. **Es compuerta** desde el 2026-07-30: el hook de pre-commit exige el sello de una corrida verde cuando el diff toca runtime. La huella se calcula sobre el **índice** (`git ls-files -s`), no sobre el árbol: hay que `git add` **antes** de sellar, o el propio `add` invalida el sello. **Ojo con sesiones paralelas sobre el mismo worktree**: el índice compartido puede invalidar el sello entre que se corre la suite y se commitea; `git reset HEAD -- archivo` + `git apply --cached parche.diff` separa hunks propios de ajenos cuando el mismo archivo cambia por dos sesiones a la vez, sin tocar el árbol de trabajo de la otra sesión (usado el 2026-08-02 en `infra/bolsas.js` y `tests/unit/analisis.test.js`, ARQ.1a vs. ARQ.1b) |
| Schema version (`localStorage`) | v32 (`config.ultimaVersionVista`, UPD.1; migración backfill al catálogo vigente) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **4**: ver [BUGS.md](BUGS.md). BUG-018 es el único con impacto en el uso diario |

---

## 2. Últimas 5 tareas cerradas

**CAL.5b - el lote también cubre deudas y se ofrece desde Inicio, 2026-08-02**
El pago en lote deja de ser solo de gastos fijos y solo del Calendario. Una deuda entra por **lo que falta de la cuota del mes, topado a su `saldoTotal`** (la decisión de "abono parcial dentro de un lote" que la tarjeta pedía explícita: cobrar la cuota entera sobre un abono previo habría cobrado dos veces). Ningún dominio cambia de dueño: Agenda sigue siendo dueña del lote, la aritmética de la deuda sigue en Compromisos y el par gasto vinculado + baja de saldo sigue en `infra/pago-compromiso.js`. Inicio no importa a Agenda: emite el evento nuevo `lote:abrir` y el modal abre sobre el dashboard. De paso, "Pendientes del mes" deja de listar lo ya pagado (defecto preexistente que el CTA nuevo volvía visible).

**MC.13c-3 - datar el cobro de todas las frecuencias, 2026-08-02**
`ultimoVencimientoHasta(item, hoyISO)` en `infra/vencimientos.js`: el último cobro de las seis frecuencias con día del mes, espejo hacia atrás de `ventanaDelCobro`. Un ingreso Bimestral a Anual deja de caer en `'sin-fecha'` y gana la clave de de-duplicación que le faltaba (antes se podía repartir el mismo cobro cuantas veces se abriera el asistente). `ultimoPagoHasta` queda como envoltorio y **cambia de contrato**: recibe el ingreso entero, porque las frecuencias largas sitúan su ciclo desde `fechaCreacion`. Semanal y Diario siguen sin datarse por modelo de datos, no por alcance. Cierra el último pendiente del [ADR 041](DECISIONS/041-motor-vencimientos-y-distribucion-v2.md) D2.

**AH.8 - el carril de Inversión dice su etapa, 2026-08-02**
El carril de la casa de Ahorro pasa de "2 inversiones" a "2 inversiones, construyendo": el conteo del D4 del [ADR 056](DECISIONS/056-la-casa-de-ahorro.md) más la etapa que su mockup pedía desde DIS.18. `casaAhorro()` gana `etapaInversion`; las palabras viven en `ETAPA_INVERSION` (`ahorro/logic.js`) y son las mismas del chip de la sección hija, con un test que falla si las dos pantallas se separan. Cierra la última consecuencia pendiente del ADR 056.

**ARQ.1c - la etapa de Inversión al alcance del hub de Ahorro, 2026-08-02**
`etapaDePortafolio()` en `infra/portafolio.js`: el corte que decide el momento del portafolio (una inversión con monto es el 1, dos o más el 2) sale del dominio Inversión, que lo consume sin cambiar de comportamiento. Era la última pieza de arquitectura que le faltaba a la casa de Ahorro para su carril de Inversión ([ADR 056](DECISIONS/056-la-casa-de-ahorro.md)). Las frases del momento **no** bajaron: infra devuelve números, cada pantalla pone su vocabulario. El carril sigue diciendo "2 inversiones": qué debe decir es decisión de copy, no de arquitectura.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
