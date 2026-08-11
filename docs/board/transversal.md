# Tablero - Transversal

> Revisado: 2026-08-11.

> Satélite de [`BOARD.md`](../BOARD.md) (afecta varias secciones). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

## Transversal (afecta varias secciones)

> **Auditoría de rendimiento 2026-07 completa** (PERF.0 a PERF.4 cerradas, ver [`scripts/perf/BASELINE.md`](../../scripts/perf/BASELINE.md)). Los dos hallazgos que siguen mandando: `renderSmart()` ya evita el recálculo cruzado, y guardar cuesta ~5 ms debounced, así que la persistencia NO se reescribió ([ADR 030](../DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md), disparadores en su D4). **Disciplina obligatoria de toda tarjeta PERF: correr `pnpm perf` antes y después y comparar contra BASELINE.md.**

> **Iniciativa "INT.1 - Interfaz de escritorio"** ([ADR 059](../DECISIONS/059-interfaz-de-escritorio.md), aceptado 2026-08-02). Fuente única del chrome de escritorio, 8 decisiones en 8 rebanadas. Móvil no cambia. **INT.1a, INT.1b, INT.1c, INT.1e e INT.1h cerradas**; detalle e historia en el CHANGELOG y [`contexto/transversal.md`](../contexto/transversal.md). **Coordinar con AH.7a** (mismo marcado de nav, otra plataforma).

> **La rebanada restante**, en una línea: su alcance completo, con medición y contra declarado, vive en el [ADR 059](../DECISIONS/059-interfaz-de-escritorio.md) y no se repite acá. Se re-expande a tarjeta completa al iniciarla.

#### INT.1g - Carril derecho de 320px desde 1.680px (diferida)
- Prioridad  : baja (diferida)
- Estado     : mecanismo cerrado (commit `4f87f77`, dentro de INT.1b). `.section--con-carril` en `styles/layout.css:296-312`: grid `1fr 320px` desde 1.680px; entre 1.024 y 1.680px una columna centrada (INT.1a). **P1 ya resuelto por INT.1e** (recorrido de las 13, ver `contexto/transversal.md`): ninguna sección tiene todavía qué poner en el carril, así que ninguna usa la clase; sigue sin uso real hasta que una sección declare su contenido. Área: ambos.
- Objetivo   : lo urgente deja de obligar a bajar un pliegue.
- Archivos   : `styles/layout.css` (mecanismo listo); falta aplicar `.section--con-carril` por sección
- Depende de : INT.1e cerrada · Modelo: Equilibrado - Alto
- Diferida 2026-08-11: sin sección candidata con contenido para carril. Se reactiva cuando una seccion declare que necesita.

#### PERF.5 (futura, no iniciar) - Migrar la persistencia a IndexedDB
- Prioridad  : sin definir (se retoma solo si se dispara un criterio del [ADR 030](../DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md) D4)
- Estado     : diferida por decisión del ADR 030. **NO iniciar** sin uno de sus disparadores: jank de guardado medido en dispositivo real, usuarios reales acercándose a la cuota (el aviso de PERF.4 disparándose en la práctica), o una feature que necesite persistencia asíncrona / mayor cupo (ej. CFG.4).
- Objetivo   : mover de la clave única `fk_v1` en `localStorage` a IndexedDB (cupo mucho mayor + escritura por registro), resolviendo cuota y costo de `JSON.stringify(S)` completo. El ADR 030 D3 rechaza explícitamente partir `localStorage` por clave (no sube la cuota).
- Secciones  : Transversal (`core/storage.js`, `bootstrap.js` pasa a async, sembrado E2E)
- Archivos   : `modules/core/storage.js` (motor async), `modules/ui/bootstrap.js` (loadData async), migración de datos localStorage → IDB sin pérdida, reescritura del sembrado de las 11 suites E2E
- Depende de : un disparador del ADR 030 D4
- Modelo     : Alta capacidad - Extra o Máxima capacidad - Alto (cambio de mayor riesgo del proyecto: ruta de arranque async + migración de datos reales de años)

#### PERF.6 - Coalescer de renders por microtask (alcance revisado a la baja)
- Prioridad  : baja
- Estado     : pendiente de decisión. **Hallazgo del 2026-07-07:** `renderSmart()` corta por hash, así que una vista solo se pinta cuando es la sección activa. El doble-render caro que motivó la tarjeta (Análisis, 5 observadores, ~11 ms) NO ocurre en la práctica: Análisis es solo-lectura, no se muta desde ahí, y renderSmart bloquea su pintado desde cualquier otra sección. La exposición real queda en los paneles de Inicio (actividad reciente, resumen) que se repintan 2-3 veces durante una acción multi-sección lanzada desde Inicio (ej. distribución del ingreso): costo bajo.
- Objetivo   : `programarRender(fn)` en `infra/render.js`, cola dedupada por identidad, vaciada en microtask; los listeners de `state:change` agendan en vez de pintar directo, colapsando repintados del mismo tick a uno. Renders directos (navegación, arranque, `renderAll`) siguen síncronos.
- Riesgo     : cambia el timing de los renders reactivos de síncrono a microtask. Blast radius de tests medido chico (los tests de vista llaman la view directo, no vía bus; E2E auto-espera). Cerca del pipeline de render: si se hace, medir el doble-render real con un escenario nuevo del harness antes/después (disciplina ADR 030).
- Secciones  : Transversal (`infra/render.js` + listeners `state:change` de los dominios multi-observador)
- Depende de : decidir si el beneficio (situacional, Inicio) justifica el cambio de timing. Alternativa recomendada: PERF.7 primero (ganancia medida e incondicional) - ya cerrada el 2026-08-01 (commit `156aa88`).
- Modelo     : Alta capacidad - Alto (si se hace)
- Decision 2026-08-05: no se hace. PERF.7 (la alternativa recomendada) ya cerro con ganancia medida e incondicional. Lo que queda de PERF.6 es beneficio situacional y bajo (paneles de Inicio, 2-3 repintados en una accion multi-seccion) contra riesgo real: cambiar el pipeline de render de sincrono a microtask. No hay disparador nuevo que lo justifique. Se reabre solo si aparece evidencia de costo real medido (nuevo escenario de harness, disciplina ADR 030).

> **Iniciativa Dirección Visual premium** ([ADR 033](../DECISIONS/033-direccion-visual-premium.md)). DV.2a/b/c cerradas. Solo **P4** (lote inicial de ilustraciones) sigue abierta, se decide al iniciar DV.2d.

#### DV.2d - Ilustraciones como clase nueva de asset (D3 del ADR 033)
- Prioridad  : media
- Área       : design
- Estado     : **bloqueada.** Es la única rebanada que sigue esperando: **P4 del ADR 033 sin resolver** (lote inicial de ilustraciones; se decide al iniciarla) y **cola de diseño de Esteban** (los drafts de Claude entran como plantillas que él sobrescribe, principio ADR 026)
- Objetivo   : carpeta `assets/svg/ilustraciones/` (prefijo `il-*`) + spec (retícula 120, trazo del lenguaje v2 escalado, paleta limitada a tokens, ambos temas) + extensión del sync; los empty states del lote P4 (recomendado: las 6 superficies más visitadas) reemplazan el arte geométrico de `emptyArt()`. Presupuesto de sprite ≤ ~25 KB fuente por lote; Lighthouse 100 como gate.
- Secciones  : Transversal (sprite, `infra/icons.js` `emptyArt()`, empty states de las vistas del lote)
- Depende de : DV.2b (pipeline de decoración ya extendido); diseños o drafts aprobados
- Modelo     : Equilibrado - Alto (spec + integración; el diseño es de Esteban)

#### IV.4 - Iconografía dirigida post-color
- Prioridad  : decidir tras IV.2
- Área       : design (el diseño de los assets es de Esteban; Code solo integra)
- Estado     : bloqueada por revisión visual con capturas después de IV.2
- Objetivo   : si tras el despliegue del color la app aún se percibe fría/genérica, definir la spec por dominio y redibujar en lotes dirigidos (Esteban en Illustrator, pipeline ADR 026 + `sync-sprite.py`, revisión de legibilidad 16/22/48px en ambos temas). NO es un redibujo global del sprite.
- **Spec integrada por triaje 2026-07-08 (brief de Deudas, punto 13):** los iconos de **Avalancha** y **Bola de nieve** no representan el concepto de cada estrategia; rediseñarlos con metáfora clara (regla 5 del ADR 023: metáfora primero) manteniendo el lenguaje v2. Nota: `i-mountain` conserva sus picos agudos a propósito (decisión de ID.7); el problema reportado es de metáfora, no de estilo. Primer lote candidato de esta tarjeta.
- Secciones  : `assets/svg/`, sprite de `index.html`
- Depende de : IV.2 en producción + revisión visual + diseños de Esteban
- Modelo     : Equilibrado - Alto (revisión de assets contra spec; el diseño es de Esteban)

> **Iniciativa CAT: taxonomía + picker de ícono compartido, completa.** Fuente única para categorías entre secciones. CAT.1, CAT.2, CAT.3 y CAT.4 cerradas (reglas heredadas en [`contexto/transversal.md`](../contexto/transversal.md), bloque "Categorías personalizadas del usuario").

> **Iniciativa GU.1: guía por navegación (aprender usando, no leyendo)** (6.º lote, 2026-07-08, brief General puntos 4+5). **GU.1a cerrada (2026-08-03):** [ADR 016](../DECISIONS/016-banner-proposito-de-seccion.md) auditado y vigente sin desviaciones; detalle en [`contexto/transversal.md`](../contexto/transversal.md). **Regla anti-doble-trabajo:** GU.1 define el principio y audita el sistema transversal (banners, hints); los rediseños internos de cada sección viven en sus iniciativas v2, que aplican este principio en vez de duplicarlo.

> **Iniciativa LEG: Centro Legal y cumplimiento.** El paquete, su estado por documento y el checklist de datos pendientes viven en [`legal/README.md`](../legal/README.md), su dueño. **LEG.1** (Centro Legal, borradores + UI) y **LEG.2** (aceptación obligatoria versionada, onboarding + gate de re-aceptación) cerradas, detalle en [`contexto/transversal.md`](../contexto/transversal.md) y el CHANGELOG. El checklist de contenido (responsable, contacto, licencia, revisión de abogado colombiano) sigue abierto y bloquea el paso del paquete a v1.0, no el mecanismo de aceptación, que ya corre sobre la versión vigente. La revisión del abogado es trabajo profesional externo, no una tarea de código.

> **Iniciativa LG.2: Logros v2, gamificación de hábitos.** Alcance, regla anti-gaming y catálogo: **[ADR 032](../DECISIONS/032-logros-v2-niveles-y-habitos.md)** (Aceptada). Quedan LG.2d y LG.2e. **Sin cerrar por el ADR:** nombres de niveles de usuario provisionales hasta que Esteban entregue los definitivos; al cerrar LG.2d, marcar el [ADR 022](../DECISIONS/022-vitrina-de-logros-en-ajustes.md) como Superada (la vitrina se muda de Ajustes). Disciplina de ADR 022 vigente: evaluadores O(1), evaluación barata por `state:change`.

#### LG.2d - Mudanza de la vitrina: "Tu progreso" en Análisis + tarjeta en Inicio
- Prioridad  : baja (bloqueada)
- Estado     : **bloqueada por ANL.1** (ADR 032 D6: no posicionar dos veces). El otro bloqueo (IN.8) ya se levantó: "Inicio v2" está completa en producción, pero su layout (ADR 034) no reservó bloque para logros, así que la tarjeta compacta de Inicio es diseño nuevo a proponer al iniciar LG.2d. La vitrina sigue en Ajustes (ADR 022 vigente) hasta que ANL.1 defina el layout de Análisis.
- Objetivo   : mover la vitrina a un apartado "Tu progreso" en Análisis y agregar la tarjeta compacta en Inicio (nivel actual + último logro + próximo objetivo, ubicación a definir dentro del bento de Inicio v2); al cerrar, marcar el ADR 022 como Superada.
- Secciones  : Análisis, Inicio, Ajustes (`logros`)
- Depende de : ANL.1 (layout de Análisis)
- Modelo     : Equilibrado - Alto (reubicación cross-sección con coordinación de layouts)

#### LG.2e - Familia comportamiento (interpretación de hábitos)
- Prioridad  : baja
- Estado     : pendiente; parcialmente bloqueada por datos
- Objetivo   : 3 logros de comportamiento (`hormiga-a-raya` implementable ya, `ahorro-creciente` bloqueado por falta de derivación de ingreso mensual, `pagador-puntual` a verificar). Detalle en [`contexto/transversal.md`](../contexto/transversal.md), sección Logros.
- Secciones  : Transversal (`logros`)
- Depende de : LG.2c (usa "mes completo de registro" como guardia); `ahorro-creciente` además de ANL.1
- Modelo     : Alta capacidad - Alto (detectores de comportamiento con riesgo real de incentivos perversos)

#### PA.1 - Pagos y créditos automáticos (débito automático simulado)
- Prioridad  : media-alta (caso muy común: suscripciones y cuotas con débito automático)
- Estado     : **no iniciar**: las 2 decisiones de filosofía siguen sin tomar. Ver **[ADR 052](../DECISIONS/052-pagos-automaticos.md)** (Abierta), su dueño. La secuencia "lote manual primero" ya se cumplió (CAL.5a cerrada); esta tarjeta sigue viva, no absorbida.
- Objetivo   : pregunta opcional "¿este pago se descuenta automáticamente?" al registrar un gasto fijo, deuda o suscripción, y su procesamiento al llegar la fecha. Cubre también el crédito automático del ingreso fijo: un solo criterio, no dos.
- Secciones  : Deudas, Calendario (fijos), Mis cuentas, Inicio (alertas), transversal
- Riesgo     : registrar un movimiento que el usuario no confirmó rompe la filosofía "Finko refleja la realidad, no la inventa" si el débito real falla o se difiere (ADR 052 D2)
- Depende de : motor de vencimientos (ADR 041, no construir un segundo); ADR 052 resuelto y aprobado por Esteban
- Modelo     : Máxima capacidad - Alto para el ADR (filosofía de producto con riesgo de confianza del usuario); implementación por rebanadas después

> **Diferido del [ADR 040](../DECISIONS/040-navegacion-v2-visual.md):** badges de notificación en el nav. Es decisión de producto de Esteban (¿qué cuenta el badge?); al retomarse nace como tarjeta nueva.
