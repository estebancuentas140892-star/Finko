# Tablero - Transversal

> Revisado: 2026-08-14.

> Satélite de [`BOARD.md`](../BOARD.md) (afecta varias secciones). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

## Transversal (afecta varias secciones)

> **Auditoría de rendimiento 2026-07 completa** (PERF.0 a PERF.4 cerradas, ver [`scripts/perf/BASELINE.md`](../../scripts/perf/BASELINE.md)). Los dos hallazgos que siguen mandando: `renderSmart()` ya evita el recálculo cruzado, y guardar cuesta ~5 ms debounced, así que la persistencia NO se reescribió ([ADR 030](../DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md); sus disparadores del D4 quedaron acotados a dos, T1 y T2, por el [ADR 068](../DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md)). **Disciplina obligatoria de toda tarjeta PERF: correr `pnpm perf` antes y después y comparar contra BASELINE.md.**

> **Iniciativa "INT.1 - Interfaz de escritorio"** (ADR 059, aceptado 2026-08-02). Fuente única del chrome de escritorio, 8 decisiones en 8 rebanadas. Móvil no cambia. **Siete de las ocho rebanadas cerradas** (INT.1a, INT.1b, INT.1c, INT.1d, INT.1e, INT.1f, INT.1h); solo queda INT.1g, diferida; detalle e historia en el CHANGELOG y [`contexto/escritorio.md`](../contexto/escritorio.md). **Coordinar con AH.7a** (mismo marcado de nav, otra plataforma).

> **La rebanada restante**, en una línea: su alcance completo, con medición y contra declarado, vive en el ADR 059 y no se repite acá. Se re-expande a tarjeta completa al iniciarla.

#### INT.1g - Carril derecho de 320px desde 1.680px (diferida)
- Prioridad  : baja (diferida)
- Estado     : mecanismo cerrado (commit `4f87f77`, dentro de INT.1b). `.section--con-carril` en `styles/layout.css:296-312`: grid `1fr 320px` desde 1.680px; entre 1.024 y 1.680px una columna centrada (INT.1a). **P1 ya resuelto por INT.1e** (recorrido de las 13, ver `contexto/transversal.md`): ninguna sección tiene todavía qué poner en el carril, así que ninguna usa la clase; sigue sin uso real hasta que una sección declare su contenido. Área: ambos.
- Objetivo   : lo urgente deja de obligar a bajar un pliegue.
- Archivos   : `styles/layout.css` (mecanismo listo); falta aplicar `.section--con-carril` por sección
- Depende de : INT.1e cerrada · Modelo: Equilibrado - Alto
- Diferida 2026-08-11: sin sección candidata con contenido para carril. Se reactiva cuando una seccion declare que necesita.

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

#### IV.4 - Iconografía dirigida post-color
- Prioridad  : decidir tras IV.2
- Área       : design (el diseño de los assets es de Esteban; Code solo integra)
- Estado     : **revisión visual hecha, 2026-08-13.** IV.2 (a-d) ya está en producción y la app, revisada en Deudas > Estrategia de pago (ambos iconos en `.estrategia-card-pick__icono`, 28px, sin `--sm`), ya no se percibe fría/genérica en general: el color por dominio de IV.2a/d cumple. El único hallazgo real sigue siendo el que trajo el triaje: estos dos iconos puntuales. **Único bloqueo restante: arte final de Esteban.**
- Objetivo   : si tras el despliegue del color la app aún se percibe fría/genérica, definir la spec por dominio y redibujar en lotes dirigidos (Esteban en Illustrator, pipeline ADR 026 + `sync-sprite.py`, revisión de legibilidad 16/22/48px en ambos temas). NO es un redibujo global del sprite.
- **Spec integrada por triaje 2026-07-08 (brief de Deudas, punto 13):** los iconos de **Avalancha** y **Bola de nieve** no representan el concepto de cada estrategia; rediseñarlos con metáfora clara (regla 5 del ADR 023: metáfora primero) manteniendo el lenguaje v2. Nota: `i-mountain` conserva sus picos agudos a propósito (decisión de ID.7); el problema reportado es de metáfora, no de estilo. Primer lote candidato de esta tarjeta.
- **Direcciones propuestas para Esteban (2026-08-13, a validar en Illustrator):**
  - **Avalancha (`i-mountain`):** el pico agudo se queda (ID.7 lo fija a propósito), pero un pico solo no distingue "avalancha" de "meta/logro" (`i-star`, `i-trophy` ya cubren ese territorio). Falta la caída: 2-3 puntos sólidos (chispa) en trayectoria diagonal descendiente desde el pico, como nieve/roca cayendo. La metáfora a comunicar es "ataca la tasa más alta primero y las demás caen más rápido", no solo "lo más alto".
  - **Bola de nieve (`i-snowball`):** el par de círculos chico/grande (crece) ya apunta bien; hoy le falta el movimiento. Probar un arco corto de rastro/rodado detrás del círculo grande. Si compite con el reconocimiento a 16px (regla 5), se descarta el arco y se queda solo el crecimiento.
  - Ninguno de los dos tiene hoy un uso a 16px real (solo se ven a 28px en la card de estrategia): verificar ahí también antes de entrar al sprite, no solo a 22/48.
- **Boceto técnico listo para Illustrator (Claude, 2026-08-14):** geometría concreta de las dos direcciones de arriba, para pegar como punto de partida, no como arte final (el diseño sigue siendo de Esteban). No se tocó `assets/svg/` ni el sprite: el guardarraíl de `sync-sprite.py` aborta si un símbolo publicado (`i-mountain`, `i-snowball`) se reemplaza por un `data-placeholder`, así que la única forma de integrar sería dar por final un dibujo que nadie de Design aprobó. Sin preview real (el panel del navegador no compuso en esta sesión), la legibilidad a 16px es la del cálculo, no la del ojo.
  - **Avalancha:** `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m8 3 4 8 5-5 5 15H2L8 3z" fill="currentColor" fill-opacity=".22"/><circle cx="9.4" cy="5.8" r="0.9" fill="var(--fk-icon-dot, currentColor)" stroke="none"/><circle cx="10.4" cy="7.8" r="1.2" fill="var(--fk-icon-dot, currentColor)" stroke="none"/><circle cx="11.4" cy="9.8" r="1.5" fill="var(--fk-icon-dot, currentColor)" stroke="none"/></svg>`. Cuerpo del path intacto (los picos de ID.7 no se tocan); la chispa única del pico se reemplaza por 3 chispas en cascada, creciendo hacia abajo (la avalancha gana masa al caer). Ojo: esto usa 3 elementos con `var(--fk-icon-dot)` a la vez, no el "un solo punto de valor" de la regla 3 del ADR 023; se apoya en la excepción de metáfora de la regla 5, ya invocada por esta misma tarjeta, pero es una desviación explícita que Esteban debe validar o rechazar, no una lectura automática de la regla.
  - **Bola de nieve:** `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3.5 15.5a6 6 0 0 1 4-7.8"/><circle cx="12" cy="16.5" r="4.5" fill="currentColor" fill-opacity=".22"/><circle cx="8.6" cy="7.4" r="2.6"/><circle cx="16.4" cy="5.6" r="1.6" fill="var(--fk-icon-dot, currentColor)" stroke="none"/></svg>`. Único cambio: un trazo de arco (sin relleno, hereda `.icon`) detrás del círculo chico, sugiriendo el rastro rodado. Si a 16px se ve sucio, se borra ese `path` y queda el diseño actual sin cambios (retroceso de 1 línea).
- Secciones  : `assets/svg/`, sprite de `index.html`
- Depende de : IV.2 en producción (cerrado) + revisión visual (hecha) + diseños de Esteban (pendiente, único bloqueo)
- Modelo     : Equilibrado - Alto (revisión de assets contra spec; el diseño es de Esteban)

> **Iniciativa CAT: taxonomía + picker de ícono compartido, completa.** Fuente única para categorías entre secciones. CAT.1, CAT.2, CAT.3 y CAT.4 cerradas (reglas heredadas en [`contexto/categorias.md`](../contexto/categorias.md), bloque "Categorías personalizadas del usuario").

> **Iniciativa GU.1: guía por navegación (aprender usando, no leyendo)** (6.º lote, 2026-07-08, brief General puntos 4+5). **GU.1a cerrada (2026-08-03):** [ADR 016](../DECISIONS/016-banner-proposito-de-seccion.md) auditado y vigente sin desviaciones; detalle en [`contexto/transversal.md`](../contexto/transversal.md). **Regla anti-doble-trabajo:** GU.1 define el principio y audita el sistema transversal (banners, hints); los rediseños internos de cada sección viven en sus iniciativas v2, que aplican este principio en vez de duplicarlo.

> **Iniciativa LEG: Centro Legal y cumplimiento.** El paquete, su estado por documento y el checklist de datos pendientes viven en [`legal/README.md`](../legal/README.md), su dueño. **LEG.1** (Centro Legal, borradores + UI) y **LEG.2** (aceptación obligatoria versionada, onboarding + gate de re-aceptación) cerradas, detalle en [`contexto/transversal.md`](../contexto/transversal.md) y el CHANGELOG. El checklist de contenido (responsable, contacto, licencia, revisión de abogado colombiano) sigue abierto y bloquea el paso del paquete a v1.0, no el mecanismo de aceptación, que ya corre sobre la versión vigente. La revisión del abogado es trabajo profesional externo, no una tarea de código.

> **Iniciativa LG.2: Logros v2, gamificación de hábitos, completa.** Alcance, regla anti-gaming y catálogo: **[ADR 032](../DECISIONS/032-logros-v2-niveles-y-habitos.md)** (Aceptada). **LG.2d cerró el 2026-08-13** (mudanza a "Tu progreso" en Análisis + tarjeta en Inicio): el [ADR 022](../DECISIONS/022-vitrina-de-logros-en-ajustes.md) pasa a Superada, ver [`contexto/logros.md`](../contexto/logros.md). Los dos logros diferidos por datos (`ahorro-creciente`, `pagador-puntual`) NO son tarjeta: su verificación y condición de reapertura viven en el ADR 032, sección "Resolución de LG.2e en implementación". Nombres de niveles de usuario siguen provisionales hasta que Esteban entregue los definitivos (cambiarlos no toca datos).

> **Iniciativa "PA.1 - Pagos y créditos automáticos" completa** ([ADR 052](../DECISIONS/052-pagos-automaticos.md) D1-D4, Aceptada). PA.1a (débito de compromisos) cerró 2026-08-13 y PA.1b (crédito del ingreso fijo, misma hoja `#modal-automaticos`) cerró 2026-08-14. Detalle en [`contexto/calendario.md`](../contexto/calendario.md). Queda **PA.1c**, opcional y sin tarjeta (llevar el aviso de "sin cuenta"/"sin saldo" al motor único de CFG.3, ya cerrado): se re-expande a tarjeta si Esteban la retoma.

> **Diferido del [ADR 040](../DECISIONS/040-navegacion-v2-visual.md):** badges de notificación en el nav. Es decisión de producto de Esteban (¿qué cuenta el badge?); al retomarse nace como tarjeta nueva.
