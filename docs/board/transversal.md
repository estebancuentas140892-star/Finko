# Tablero - Transversal

> Revisado: 2026-08-13.

> Satélite de [`BOARD.md`](../BOARD.md) (afecta varias secciones). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

## Transversal (afecta varias secciones)

> **Auditoría de rendimiento 2026-07 completa** (PERF.0 a PERF.4 cerradas, ver [`scripts/perf/BASELINE.md`](../../scripts/perf/BASELINE.md)). Los dos hallazgos que siguen mandando: `renderSmart()` ya evita el recálculo cruzado, y guardar cuesta ~5 ms debounced, así que la persistencia NO se reescribió ([ADR 030](../DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md), disparadores en su D4). **Disciplina obligatoria de toda tarjeta PERF: correr `pnpm perf` antes y después y comparar contra BASELINE.md.**

> **Iniciativa "INT.1 - Interfaz de escritorio"** (ADR 059, aceptado 2026-08-02). Fuente única del chrome de escritorio, 8 decisiones en 8 rebanadas. Móvil no cambia. **Siete de las ocho rebanadas cerradas** (INT.1a, INT.1b, INT.1c, INT.1d, INT.1e, INT.1f, INT.1h); solo queda INT.1g, diferida; detalle e historia en el CHANGELOG y [`contexto/transversal.md`](../contexto/transversal.md). **Coordinar con AH.7a** (mismo marcado de nav, otra plataforma).

> **La rebanada restante**, en una línea: su alcance completo, con medición y contra declarado, vive en el ADR 059 y no se repite acá. Se re-expande a tarjeta completa al iniciarla.

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
- **Compuerta verificada 2026-08-13** (pedido de ejecución, evaluación sin código). Los tres disparadores del D4 siguen **cerrados**, con la evidencia contra la que se verificó:
  - *Jank en dispositivo real*: **no**. Toda cifra de persistencia del proyecto es de happy-dom (`scripts/perf/BASELINE.md:4`); la auditoría de jank móvil se declara a sí misma "rango de referencia de la industria, no una medición de este proyecto" y descarta el guardado como causa ("contribuye, no domina: 4,8 ms a 10.000 gastos, fuera del camino crítico del frame"). PERF.6 sí atacó jank móvil, pero de render, y dejó `save` "dentro del ruido" (`BASELINE.md:186`).
  - *Usuarios cerca de la cuota*: **no**, y **no existe canal para que esta evidencia aparezca sola**: la app no tiene telemetría por diseño. El único reporte posible es manual de Esteban, y no hay ninguno en BUGS.md ni en el CHANGELOG. En operación normal el aviso de PERF.4 devuelve string vacío.
  - *Feature que exija async o más cupo*: **no**. CFG.4 está bloqueada por el [ADR 043](../DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), que sigue **Abierta** y cuyo checklist de cierre dice que la activación del D4 ocurre "si se elige D o E": no se eligió. Ninguna otra tarjeta viva toca persistencia.
- **Tamaño real del cambio, medido el 2026-08-13** (sirve para no volver a levantarlo): `core/storage.js` 753 líneas con 40 migraciones acumuladas y 6 exports síncronos; `loadData()` es el primer paso de `bootstrap.js:56`, con todo el arranque síncrono detrás; 33 call sites de `save()`, ninguno con `await` (esto sí juega a favor: volverla async es transparente para los callers, como anticipó el ADR 030); y **la factura está en los tests, no en el runtime**: 13 suites E2E con 197 referencias a `fk_v1` y 163 `addInitScript`/`evaluate`, **sin helper central de sembrado** (cada archivo tiene el suyo), más `storage.test.js` con 109 usos de `localStorage`. Reescribir eso sin red de seguridad es reescribir la red de seguridad misma.
- Conclusión de la evaluación: mientras el D4 siga cerrado, ejecutar esta tarjeta cambia la ruta de arranque y migra datos reales **quedándose sin la única prueba que detectaría el daño**. La tarjeta sigue viva y sin iniciar; el próximo intento no necesita repetir esta verificación, solo mirar si algún disparador cambió de estado.

> **Iniciativa Dirección Visual premium** ([ADR 033](../DECISIONS/033-direccion-visual-premium.md)). DV.2a/b/c cerradas. DV.2d: infraestructura y las 8 plantillas del lote listas (2026-08-12), falta solo el arte final de Esteban.

#### DOC.3 - Fichas de contexto sobre el techo y sellos `Verificado contra` vencidos
- Prioridad  : media (no rompe nada hoy; encarece cada sesión que abre una de esas fichas)
- Área       : code (documentación técnica)
- Estado     : **medido, no ejecutado.** Lo levantó la auditoría DOC.2 del 2026-08-13 y se dejó fuera a propósito: partir una ficha es mover conocimiento entre archivos, no editar texto, y merece su propia tarea verificada.
  - **Techo roto:** `contexto/transversal.md` 66 KB y `contexto/inicio.md` 50 KB contra un techo de 40. `mis-cuentas.md` está en 40 exactos, sin margen. En `inicio.md` y `calendario.md` el bloque "Cambios realizados" es cerca de la mitad del archivo, escrito como párrafos que reproducen el CHANGELOG en vez de la línea por hito que pide la convención.
  - **Eje de partición sugerido, ya identificado:** de `transversal.md` salen el shell de escritorio (10,5 KB) y logros (9,4 KB); las anclas de navegación de `ui/shell.js` están mapeadas **tres veces** (`sistema-visual.md`, `transversal.md`, `ahorro.md`) y su dueño natural es `sistema-visual.md`.
  - **Sellos vencidos:** `transversal.md:159`, `sistema-visual.md:15` y `captura.md:48` dicen "Verificado contra" un commit de hace más de un mes, con los archivos que describen tocados hasta el 2026-08-13. **No se actualizaron a propósito**: cambiar el hash sin volver a verificar el contenido convierte un sello honesto en uno falso. El que toque esas fichas re-verifica y sella.
- Objetivo   : que ninguna ficha supere su techo y que ningún sello afirme una verificación que no ocurrió.
- Secciones  : `docs/contexto/`
- Depende de : nada
- Modelo     : Alta capacidad - Alto (mover conocimiento sin perderlo, con verificación contra el código)

#### DOC.4 - Automatizar la compuerta 3 (guiones largos) en el pre-commit
- Prioridad  : baja (la compuerta ya es obligatoria y se corre a mano; esto solo baja el riesgo de saltarla por olvido)
- Área       : code (tooling, `.githooks/`)
- Estado     : **candidato sin ejecutar.** Encontrado en la auditoría DOC.2 (2026-08-13): `.githooks/pre-commit` ya bloquea el commit si falta el sello E2E (compuerta 5), pero la compuerta 3 (`git ls-files -z ... | grep -nP '[\x{2013}\x{2014}]'`, en `cerrar-tarea/SKILL.md`) sigue siendo manual. Es el mismo patrón que ya se automatizó para la compuerta 5, aplicado a un chequeo más simple y sin dependencias nuevas.
- Objetivo   : que `.githooks/pre-commit` corra ese mismo comando y bloquee el commit si encuentra guion largo o medio en un archivo trackeado, sin esperar a que quien cierra se acuerde.
- Secciones  : Transversal (`.githooks/pre-commit`)
- Depende de : nada
- Modelo     : Ligero - Medio (extender un hook ya existente con un comando ya escrito y probado)

#### DV.2d - Ilustraciones como clase nueva de asset (D3 del ADR 033)
- Prioridad  : media
- Área       : design
- Estado     : **lote completo con plantillas draft, 2026-08-12.** `scripts/sync-sprite.py` extendido a `assets/svg/ilustraciones/` (prefijo `il-`, viewBox 120x120, color solo por rol). **P4 del ADR 033 resuelto**: el lote son las 8 superficies que hoy usan `emptyArt()` geométrico (Ahorro, Apartados, Cuentas, Deudas, Inversión, Metas, Personales, Movimientos), no las "6 más visitadas" de la pregunta original del ADR (Inicio, Gastos y Calendario no tienen empty state propio: agregárselo es UX nueva, tarjeta aparte si se quiere). Las 8 tienen plantilla draft (`data-placeholder="true"`, mismo principio ADR 026 de DV.2b); `pnpm test` y `python scripts/sync-sprite.py` verificados sin regresión (15 plantillas excluidas del sprite, cero cambio en `index.html`). Falta únicamente: **cola de diseño de Esteban** (reemplazar cada draft por el arte final en Illustrator).
- Objetivo   : spec y lote ya integrados en `assets/svg/README.md` 2.2; falta dibujar el arte final y conectar cada consumidor en `modules/infra/icons.js` (`emptyArt()`) a medida que cada pieza se reemplaza. Presupuesto de sprite ≤ ~25 KB fuente por lote; Lighthouse 100 como gate.
- Secciones  : Transversal (sprite, `infra/icons.js` `emptyArt()`, empty states de las 8 vistas del lote)
- Depende de : DV.2b (pipeline de decoración ya extendido, cerrada); arte final de Esteban en Illustrator (único bloqueo restante)
- Modelo     : Equilibrado - Alto (spec + integración; el diseño es de Esteban)

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
- Secciones  : `assets/svg/`, sprite de `index.html`
- Depende de : IV.2 en producción (cerrado) + revisión visual (hecha) + diseños de Esteban (pendiente, único bloqueo)
- Modelo     : Equilibrado - Alto (revisión de assets contra spec; el diseño es de Esteban)

> **Iniciativa CAT: taxonomía + picker de ícono compartido, completa.** Fuente única para categorías entre secciones. CAT.1, CAT.2, CAT.3 y CAT.4 cerradas (reglas heredadas en [`contexto/transversal.md`](../contexto/transversal.md), bloque "Categorías personalizadas del usuario").

> **Iniciativa GU.1: guía por navegación (aprender usando, no leyendo)** (6.º lote, 2026-07-08, brief General puntos 4+5). **GU.1a cerrada (2026-08-03):** [ADR 016](../DECISIONS/016-banner-proposito-de-seccion.md) auditado y vigente sin desviaciones; detalle en [`contexto/transversal.md`](../contexto/transversal.md). **Regla anti-doble-trabajo:** GU.1 define el principio y audita el sistema transversal (banners, hints); los rediseños internos de cada sección viven en sus iniciativas v2, que aplican este principio en vez de duplicarlo.

> **Iniciativa LEG: Centro Legal y cumplimiento.** El paquete, su estado por documento y el checklist de datos pendientes viven en [`legal/README.md`](../legal/README.md), su dueño. **LEG.1** (Centro Legal, borradores + UI) y **LEG.2** (aceptación obligatoria versionada, onboarding + gate de re-aceptación) cerradas, detalle en [`contexto/transversal.md`](../contexto/transversal.md) y el CHANGELOG. El checklist de contenido (responsable, contacto, licencia, revisión de abogado colombiano) sigue abierto y bloquea el paso del paquete a v1.0, no el mecanismo de aceptación, que ya corre sobre la versión vigente. La revisión del abogado es trabajo profesional externo, no una tarea de código.

> **Iniciativa LG.2: Logros v2, gamificación de hábitos, completa.** Alcance, regla anti-gaming y catálogo: **[ADR 032](../DECISIONS/032-logros-v2-niveles-y-habitos.md)** (Aceptada). **LG.2d cerró el 2026-08-13** (mudanza a "Tu progreso" en Análisis + tarjeta en Inicio): el [ADR 022](../DECISIONS/022-vitrina-de-logros-en-ajustes.md) pasa a Superada, ver [`contexto/transversal.md`](../contexto/transversal.md). Los dos logros diferidos por datos (`ahorro-creciente`, `pagador-puntual`) NO son tarjeta: su verificación y condición de reapertura viven en el ADR 032, sección "Resolución de LG.2e en implementación". Nombres de niveles de usuario siguen provisionales hasta que Esteban entregue los definitivos (cambiarlos no toca datos).

#### PA.1b - Crédito automático del ingreso fijo
- Prioridad  : media-alta (mismo caso común que el débito, visto desde el lado del ingreso)
- Estado     : lista para trabajar. El [ADR 052](../DECISIONS/052-pagos-automaticos.md) quedó **Aceptado** (2026-08-13) y su D4 pone esta rebanada después de PA.1a, ya cerrada.
- Objetivo   : marcar un ingreso fijo como "me lo abonan solo" y ofrecerlo en la misma hoja `#modal-automaticos`, con el mismo criterio de D2 (Finko prepara, el usuario confirma). La pregunta propia a resolver: qué colección recibe el abono recurrente, porque `Ingreso` es una plantilla y no un evento del ledger.
- Secciones  : Mis cuentas (ingresos), Calendario (hoja), Movimientos
- Depende de : PA.1a (cerrada); `Ingreso.cuentaId` ya existe desde MC.13d
- Modelo     : Equilibrado - Alto (la filosofía ya está decidida; falta el dueño del dato)

> **Diferido del [ADR 040](../DECISIONS/040-navegacion-v2-visual.md):** badges de notificación en el nav. Es decisión de producto de Esteban (¿qué cuenta el badge?); al retomarse nace como tarjeta nueva.
