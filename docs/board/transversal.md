# Tablero - Transversal

> Revisado: 2026-08-17.

> Satélite de [`BOARD.md`](../BOARD.md) (afecta varias secciones). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

## Transversal (afecta varias secciones)

> **Auditoría de rendimiento 2026-07 completa** (PERF.0 a PERF.4 cerradas, ver [`scripts/perf/BASELINE.md`](../../scripts/perf/BASELINE.md)). Los dos hallazgos que siguen mandando: `renderSmart()` ya evita el recálculo cruzado, y guardar cuesta ~5 ms debounced, así que la persistencia NO se reescribió ([ADR 030](../DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md); sus disparadores del D4 quedaron acotados a dos, T1 y T2, por el [ADR 068](../DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md)). **Disciplina obligatoria de toda tarjeta PERF: correr `pnpm perf` antes y después y comparar contra BASELINE.md.**

> **Iniciativa "INT.1 - Interfaz de escritorio", completa** (ADR 059, aceptado 2026-08-02). Fuente única del chrome de escritorio, 8 decisiones en 8 rebanadas. Móvil no cambia. **Las ocho rebanadas cerradas** (INT.1a a INT.1h); detalle e historia en el CHANGELOG y [`contexto/escritorio.md`](../contexto/escritorio.md). **INT.1g cerró el 2026-08-12 sin tarjeta propia** (dentro de una sesión sobre MT.6a) y quedó sin documentar hasta la auditoría del 2026-08-17: su único caso real es el compromiso mensual de Fondo, en [`ahorro.md`](../contexto/ahorro.md). **Coordinar con AH.7a** (mismo marcado de nav, otra plataforma).

> **Diferida del [ADR 068](../DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md): la migración a IndexedDB (antes PERF.5) ya no es tarjeta.** Su decisión, su alcance fijado (blob-en-IDB, no store por colección) y sus **dos** disparadores verificables viven en ese ADR, que reemplaza los tres del ADR 030 D4. **No re-auditar el código ante un pedido de ejecución:** la verificación está hecha y fechada allí; basta mirar si T1 o T2 cambiaron de estado. Al reabrirse nace como tarjeta nueva. Lo que salió a la luz con ese ADR ya cerró completo: **PERF.9** (2026-08-14, columna de caracteres en el harness) y **PERF.10** (2026-08-14, dos rebanadas). T1 ya tiene instrumento: detalle en [`scripts/perf/BASELINE.md`](../../scripts/perf/BASELINE.md).

> **Iniciativa Dirección Visual premium** ([ADR 033](../DECISIONS/033-direccion-visual-premium.md)). DV.2a/b/c cerradas. DV.2d: infraestructura, 8 plantillas y cableado de `emptyArt()` listos (2026-08-14), falta solo el arte final de Esteban.

#### DV.2d - Ilustraciones como clase nueva de asset (D3 del ADR 033)
- Prioridad  : media
- Área       : design
- Estado     : **solo falta el arte final de Esteban (2026-08-14).** `scripts/sync-sprite.py` extendido a `assets/svg/ilustraciones/` (prefijo `il-`, viewBox 120x120, color solo por rol). **P4 del ADR 033 resuelto**: el lote son las 8 superficies que hoy usan `emptyArt()` geométrico (Ahorro, Apartados, Cuentas, Deudas, Inversión, Metas, Personales, Movimientos), no las "6 más visitadas" de la pregunta original del ADR (Inicio, Gastos y Calendario no tienen empty state propio: agregárselo es UX nueva, tarjeta aparte si se quiere). Las 8 tienen plantilla draft (`data-placeholder="true"`, mismo principio ADR 026 de DV.2b). **Cableado del consumidor cerrado**: `emptyArt()` (`modules/infra/icons.js`) ya busca el symbol `il-<id>` y cae a la geometría mientras el placeholder siga fuera del sprite; ningún consumidor necesita tocarse pieza por pieza. `pnpm test` y `python scripts/sync-sprite.py` verificados sin regresión.
- Objetivo   : único trabajo restante es que Esteban dibuje el arte final en Illustrator y sobrescriba cada placeholder (assets/svg/README.md 2.2); al correr el sync, `emptyArt()` la usa sola. Presupuesto de sprite ≤ ~25 KB fuente por lote; Lighthouse 100 como gate.
- Secciones  : Transversal (sprite, empty states de las 8 vistas del lote)
- Depende de : arte final de Esteban en Illustrator (único bloqueo restante, fuera del alcance de Code)
- Modelo     : sin código pendiente; cola de diseño de Esteban

> **IV.4 - Iconografía dirigida post-color, cerrada 2026-08-15.** Metáfora de movimiento en los dos iconos que el triaje del 2026-07-08 señaló como ilegibles: Avalancha (`i-mountain`) cambia el punto estático del pico por un trazo desnudo de dos golpes cortos + la chispa al final del recorrido (cae por la ladera, no se queda arriba); Bola de nieve (`i-snowball`) suma un arco de rastro (trazo desnudo, mismo patrón que la puerta de `i-home`) detrás del círculo chico. Se descartó el boceto de 3 chispas en cascada del 2026-08-14 por violar la regla 3 del ADR 023 (un solo punto de valor); la solución final conserva un único `circle` de chispa. Esteban delegó la decisión final ("toma tú las decisiones") en vez de esperar el dibujo en Illustrator: geometría verificada por bbox (sin composición visual real en esta sesión, mismo límite que el 2026-08-14). `assets/svg/iconos/simbolos/mountain.svg` + `snowball.svg`, sprite de `index.html`.

> **Iniciativa CAT: taxonomía + picker de ícono compartido, completa.** Fuente única para categorías entre secciones. CAT.1, CAT.2, CAT.3 y CAT.4 cerradas (reglas heredadas en [`contexto/categorias.md`](../contexto/categorias.md), bloque "Categorías personalizadas del usuario").

> **Iniciativa GU.1: guía por navegación (aprender usando, no leyendo)** (6.º lote, 2026-07-08, brief General puntos 4+5). **GU.1a cerrada (2026-08-03):** [ADR 016](../DECISIONS/016-banner-proposito-de-seccion.md) auditado y vigente sin desviaciones; detalle en [`contexto/transversal.md`](../contexto/transversal.md). **Regla anti-doble-trabajo:** GU.1 define el principio y audita el sistema transversal (banners, hints); los rediseños internos de cada sección viven en sus iniciativas v2, que aplican este principio en vez de duplicarlo.

> **Iniciativa LEG: Centro Legal y cumplimiento.** El paquete, su estado por documento y el checklist de datos pendientes viven en [`legal/README.md`](../legal/README.md), su dueño. **LEG.1** (Centro Legal, borradores + UI) y **LEG.2** (aceptación obligatoria versionada, onboarding + gate de re-aceptación) cerradas, detalle en [`contexto/transversal.md`](../contexto/transversal.md) y el CHANGELOG. El checklist de contenido (responsable, contacto, licencia, revisión de abogado colombiano) sigue abierto y bloquea el paso del paquete a v1.0, no el mecanismo de aceptación, que ya corre sobre la versión vigente. La revisión del abogado es trabajo profesional externo, no una tarea de código.

> **Iniciativa LG.2: Logros v2, gamificación de hábitos, completa.** Alcance, regla anti-gaming y catálogo: **[ADR 032](../DECISIONS/032-logros-v2-niveles-y-habitos.md)** (Aceptada). **LG.2d cerró el 2026-08-13** (mudanza a "Tu progreso" en Análisis + tarjeta en Inicio): el [ADR 022](../DECISIONS/022-vitrina-de-logros-en-ajustes.md) pasa a Superada, ver [`contexto/logros.md`](../contexto/logros.md). Los dos logros diferidos por datos (`ahorro-creciente`, `pagador-puntual`) NO son tarjeta: su verificación y condición de reapertura viven en el ADR 032, sección "Resolución de LG.2e en implementación". Nombres de niveles de usuario siguen provisionales hasta que Esteban entregue los definitivos (cambiarlos no toca datos).

> **Iniciativa "PA.1 - Pagos y créditos automáticos" completa** ([ADR 052](../DECISIONS/052-pagos-automaticos.md) D1-D4, Aceptada). PA.1a (débito de compromisos) cerró 2026-08-13 y PA.1b (crédito del ingreso fijo, misma hoja `#modal-automaticos`) cerró 2026-08-14. Detalle en [`contexto/calendario.md`](../contexto/calendario.md). Queda **PA.1c**, opcional y sin tarjeta (llevar el aviso de "sin cuenta"/"sin saldo" al motor único de CFG.3, ya cerrado): se re-expande a tarjeta si Esteban la retoma.

> **Diferido del [ADR 040](../DECISIONS/040-navegacion-v2-visual.md):** badges de notificación en el nav. Es decisión de producto de Esteban (¿qué cuenta el badge?); al retomarse nace como tarjeta nueva.
