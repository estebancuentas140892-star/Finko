# Tablero - Transversal

> Satélite de [`BOARD.md`](../BOARD.md) (afecta varias secciones). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

## Transversal (afecta varias secciones)

> **Auditoría de rendimiento 2026-07 completa** (PERF.0 a PERF.4 cerradas, ver [`scripts/perf/BASELINE.md`](../../scripts/perf/BASELINE.md)). Los dos hallazgos que siguen mandando: `renderSmart()` ya evita el recálculo cruzado, y guardar cuesta ~5 ms debounced, así que la persistencia NO se reescribió ([ADR 030](../DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md), disparadores en su D4). **Disciplina obligatoria de toda tarjeta PERF: correr `pnpm perf` antes y después y comparar contra BASELINE.md.**

> **Iniciativa "INT.1 - Interfaz de escritorio"** ([ADR 059](../DECISIONS/059-interfaz-de-escritorio.md), aceptado 2026-08-02). Fuente única del chrome de escritorio, 8 decisiones en 8 rebanadas. Móvil no cambia. **INT.1a e INT.1b cerradas** (2026-08-02 y 2026-08-03); detalle e historia en el CHANGELOG y [`contexto/transversal.md`](../contexto/transversal.md). **Coordinar con AH.7a** (mismo marcado de nav, otra plataforma).

> **Las seis rebanadas restantes**, en una línea cada una: su alcance completo, con medición y contra declarado, vive en el [ADR 059](../DECISIONS/059-interfaz-de-escritorio.md) y no se repite acá. Se re-expanden a tarjeta completa al iniciarlas.

#### INT.1c - Barra superior de 56px: sección, Registrar, tema y perfil
- Estado     : pendiente, prioridad media. D1, D2 y D5. **PI7 ya no la bloquea** (era falso). Depende de **INT.1b cerrada** (misma zona de marcado). Área: ambos.
- Objetivo   : teja + título fijos (el `h1` hoy se va con el scroll), "Registrar" abriendo la misma `#modal-registrar` que móvil (hoy sin un solo disparador en escritorio), tema y perfil a la derecha.
- Riesgo     : cambia el chrome de las 13 secciones a la vez. **Pendiente P9:** `backdrop-filter` fijo contra el techo de Lighthouse 100; alternativa lista, fondo opaco con borde.
- Archivos   : `index.html`, `modules/ui/shell.js`, `styles/layout.css`, `styles/responsive.css`
- Aceptación : las 13 secciones en ambos temas + Lighthouse 100 + registrar en 1 clic · Modelo: Alta capacidad - Alto

#### INT.1d - La cinta de saldo en la barra, con su ojo de privacidad
- Estado     : pendiente, prioridad media. D9 (P7 y P10 ya decididos por Esteban). Área: ambos.
- Objetivo   : `.sidebar__saldo` deja de ser CSS sin marcado y pasa a componente real. Lee `ocultarSaldo` (R20) y **no se pinta en Inicio**, donde el hero ya lo dice (R27).
- Archivos   : `index.html`, `modules/infra/render.js`, `styles/layout.css`
- Depende de : INT.1c · Aceptación: visible en 12 de 13 secciones y ningún monto real en el DOM enmascarado · Modelo: Equilibrado - Alto

#### INT.1e - El primario de cada sección sube a la barra
- Estado     : pendiente, prioridad media. D3. **Bloqueada por el pendiente P1:** hay secciones con dos acciones (Mis cuentas) y otras sin ninguna (Análisis, Ahorro, Movimientos); hay que recorrer las 13 antes de codificar. Área: ambos.
- Objetivo   : el primario pasa a secundario en la barra (R38, R1) y la página arranca en el dato. ~70px por sección.
- Archivos   : `index.html`, `modules/ui/shell.js`, las vistas con encabezado propio
- Depende de : INT.1c + P1 resuelto · Modelo: Alta capacidad - Alto

#### INT.1f - Formulario de escritorio a 840px y dos columnas
- Estado     : pendiente, prioridad media. D8. Área: ambos.
- Objetivo   : `.modal` mide 520px sin ninguna regla sobre 1024px, así que 8 campos se apilan con scroll interno y 1.400px libres al lado. **Móvil no cambia** y el orden lógico tampoco (R11).
- Riesgo     : toca todos los modales, incluidos el asistente de distribución y el import de CSV (`.modal--xl`)
- Archivos   : `styles/modals.css`, `styles/responsive.css`
- Depende de : nada duro; conviene tras INT.1c · Modelo: Equilibrado - Alto

#### INT.1g - Carril derecho de 320px desde 1.680px
- Estado     : pendiente, prioridad baja. D7 (mitad). **Bloqueada por el mismo P1 que INT.1e:** el carril solo sirve si cada sección decide qué pone ahí. Área: ambos.
- Objetivo   : lo urgente deja de obligar a bajar un pliegue. Entre 1.024 y 1.680px, contenido centrado a una columna, sin carril.
- Archivos   : `styles/layout.css`, `styles/responsive.css`, `index.html`
- Depende de : INT.1a cerrada + P1 resuelto · Modelo: Equilibrado - Alto

#### INT.1h - Cuatro atajos de teclado
- Estado     : pendiente, prioridad baja. **Pendiente P8: la única decisión del informe que puede fallar por implementación, no por diseño.** Área: code.
- Objetivo   : `N` registrar, `G` + inicial saltar de sección, `?` la lista, `Esc` cerrar (ya existe). El quinto (`/`) entra con la auditoría del buscador.
- Riesgo     : un `keydown` global debe ignorar campos de texto y no chocar con el navegador ni con el modo de navegación de un lector de pantalla. Hoy el único global es el `Escape` de `ui/actions.js`.
- Archivos   : `modules/ui/actions.js`, `index.html` (panel de ayuda)
- Depende de : INT.1c · Modelo: Alta capacidad - Alto (riesgo de accesibilidad real)

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
- Depende de : decidir si el beneficio (situacional, Inicio) justifica el cambio de timing. Alternativa recomendada: PERF.7 primero (ganancia medida e incondicional).
- Modelo     : Alta capacidad - Alto (si se hace)

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

> **Iniciativa CAT: taxonomía + picker de ícono compartido.** Fuente única para categorías entre secciones. CAT.1, CAT.2 y CAT.4 cerradas (reglas heredadas en [`contexto/transversal.md`](../contexto/transversal.md)). Queda CAT.3.

#### CAT.3 - Categorías personalizadas globales (mismo estatus que las nativas, en toda la app)
- Prioridad  : media
- Estado     : **decidida el 2026-07-31, [ADR 058](../DECISIONS/058-categorias-personalizadas-globales.md)**, en cuatro rebanadas. **CAT.3a y CAT.3b cerradas**, quedan dos.
- Objetivo   : las personalizadas de TX.9b valen hoy solo para Gastos; extenderlas a Gastos fijos con la sección como campo del objeto (`seccion: 'gasto' | 'fijo'`), oferta filtrada por sección y resolución de ícono global.
- Secciones  : transversal (Gastos, Gastos fijos, Presupuesto, Inicio, Calendario, Tesorería)
- Depende de : nada. CAT.1 (a qué sección pertenece una categoría) y CAT.2 (cómo se crea) ya cerraron
- **Alcance corregido en el mapeo del 2026-07-31:** gráficos, CSV y 8 de 9 filtros **ya funcionan** con personalizadas (el color viene del dominio y del ranking, no de la categoría; no existe ningún mapa `categoría` a `color` en el repo). El trabajo real era el gate de escritura de fijos (CAT.3c, pendiente) y los 7 accesos crudos al mapa de íconos (CAT.3b, cerrada).
- Modelo     : Alta capacidad - Alto (bump de schema + propagación transversal)

##### CAT.3c - Gastos fijos ofrece y acepta personalizadas
- Estado     : pendiente
- Alcance    : chip de categoría nueva en `renderFormGastoFijo()`, decidiendo cómo convive con `'Otro'` (que es miembro literal del catálogo, no sentinela), y los tres gates de escritura de `compromisos/logic/modelo.js` (`:276` rechaza duro, `:414` descarta a `null` en silencio, `:55`) más sus dos espejos en `agenda/index.js:145` y `:217`

##### CAT.3d - las superficies de fijos resuelven el ícono de una personalizada
- Estado     : pendiente, última rebanada
- Alcance    : detalle del día del calendario, checklist de Necesidades de Tesorería y el gasto nacido de un fijo (`iconoPorOrigen`) ya pasan por la resolutora desde CAT.3b; esta rebanada es la verificación end-to-end con una personalizada real de sección `'fijo'`, que solo existe una vez CAT.3c la habilite

> **Iniciativa GU.1: guía por navegación (aprender usando, no leyendo)** (6.º lote, 2026-07-08, brief General puntos 4+5). **GU.1a cerrada (2026-08-03):** [ADR 016](../DECISIONS/016-banner-proposito-de-seccion.md) auditado y vigente sin desviaciones; detalle en [`contexto/transversal.md`](../contexto/transversal.md). **Regla anti-doble-trabajo:** GU.1 define el principio y audita el sistema transversal (banners, hints); los rediseños internos de cada sección viven en sus iniciativas v2, que aplican este principio en vez de duplicarlo.

> **Iniciativa LEG: Centro Legal y cumplimiento.** El paquete, su estado por documento, el checklist de datos pendientes y el gate de revisión por abogado colombiano viven en [`legal/README.md`](../legal/README.md), su dueño. **Decisión de secuencia vigente: redactar para el modelo local-only actual** con cláusula de versionado, sin esperar a CFG.4; si el [ADR 043](../DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md) aprueba cuentas o sync, el paquete se reescribe. La revisión del abogado es trabajo profesional externo, no una tarea de código: las tarjetas de acá producen borradores e inventario **para** esa revisión.

#### LEG.2 - Aceptación obligatoria versionada (onboarding + re-aceptación en cambios)
- Prioridad  : alta
- Estado     : pendiente. LEG.1 (Centro Legal, borradores + UI) ya está cerrada: el bloqueo real que queda es de **contenido**, no de código. Antes de pedirle al usuario que "acepte" hace falta resolver el checklist de [`legal/README.md`](../legal/README.md) (su dueño) y pasar el paquete de v0.1 a v1.0. El criterio de re-aceptación ya quedó definido en `docs/legal/historial-de-cambios.md`.
- Objetivo   : primera apertura: aceptación expresa de términos + privacidad + datos personales antes de usar la app (paso nuevo del onboarding); cambios importantes de políticas: re-aceptación antes de continuar (comparar versión aceptada vs vigente). Registro local de aceptación (versión + fecha, bump de schema en `S.config`). **Limitación honesta a documentar:** sin servidor, la "evidencia" de aceptación vive solo en el dispositivo del usuario; una evidencia verificable por Finko requiere CFG.4.
- Secciones  : Onboarding, Configuración, `core/state.js`/`storage.js` (registro versionado)
- Archivos   : `modules/ui/onboarding.js`, `modules/core/state.js`, `modules/core/storage.js`
- Depende de : el checklist de `legal/README.md` resuelto y el paquete en v1.0
- Modelo     : Equilibrado - Alto (flujo de onboarding + versionado persistido + migración)

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
