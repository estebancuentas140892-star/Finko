# Tablero - Finko Claude

> Tablero Kanban de trabajo pendiente. Reemplaza a `TASKS.md` y `ROADMAP.md` (retirados 2026-07-02, ver [CHANGELOG](CHANGELOG.md)).
> Regla de oro: **solo lo pendiente vive aquí.** Al cerrar una tarea, su tarjeta se borra de este archivo y su historia completa queda en [`CHANGELOG.md`](CHANGELOG.md) (ver la skill `cerrar-tarea`).
> Errores conocidos: ver [`BUGS.md`](BUGS.md).
> Contexto técnico por sección (dónde vive cada funcionalidad): ver [`contexto/`](contexto/README.md).
> Última actualización: 2026-08-05. Historia completa de cierres (qué tarjeta, qué cambió, por qué) en [`CHANGELOG.md`](CHANGELOG.md); este archivo ya no la repite (regla de oro de arriba).

---

## En proceso

_(vacío: elegir la siguiente tarjeta de "Pendientes")_

---

## Cómo usar este tablero

1. Elegir **una** tarjeta de "Pendientes" (o del backlog del usuario si hay una nueva).
2. Abrir la ficha de su sección en [`contexto/`](contexto/README.md): si el bloque de la funcionalidad existe y está vigente, trabajar desde ahí sin re-explorar el proyecto; si no existe, el primer paso de la tarea es el análisis profundo + escribir el bloque (`/CLAUDE.md` sección 3).
3. Moverla a "En proceso" con la fecha de inicio.
4. Trabajarla en una sola sesión cuando sea posible; verificar en la app + tests verdes.
5. Al cerrar: ejecutar la skill `cerrar-tarea`, que es dueña de la secuencia completa (compuertas, orden de documentos, techos). De esa secuencia, lo que toca a este archivo es **borrar la tarjeta**.

Campos de una tarjeta:

```markdown
### <ID> - <título corto>
- Prioridad  : alta | media | baja
- Estado     : pendiente | opcional | requiere ADR
- Área       : design | code | ambos (plantilla completa: skill `triaje-tarea`)
- Objetivo   : qué resuelve, en una frase
- Secciones  : secciones de la app afectadas
- Archivos   : rutas relativas involucradas
- Depende de : otra tarjeta o "nada"
- Modelo     : capacidad + nivel sugeridos (ver la skill `elegir-modelo`)
```

Antes de crear una tarjeta nueva: skill `triaje-tarea`, dueña de las reglas (sin duplicados, dividir lo grande, fuente única por funcionalidad, continuidad de la tarea activa).

---

## Índice de pendientes

Las 25 tarjetas del tablero, para elegir la próxima sin cargar el archivo completo (principio 9). "Depende de" va acortado a la referencia clave; el texto completo vive en la tarjeta, más abajo por sección.

| ID | Título | Sección | Prioridad | Depende de |
|---|---|---|---|---|
| INT.1g | Carril derecho de 320px desde 1.680px | Transversal | baja | INT.1e cerrada |
| MC.17f | Deshacer o editar una transferencia | Mis cuentas | media | coordinar con MOV.1 |
| MT.6 | Metas v2: subcategorías inteligentes + plan de aportes | Metas | media-alta | nada (el motor de MC.13 ya está); ADR 029 D3 |
| LIM.1 | Límites v2: asistente preventivo de estilo de vida | Límites | sin definir | ADR 045 (base de cálculo); ADR 044 (sugerencias) |
| PE.6d | Me deben: los cinco estados de un vistazo | Me deben | media-alta | bloqueada por IV.2 en producción |
| ANL.1 | Análisis como centro de interpretación financiera | Análisis | sin definir | ADR 046 (criterio y lenguaje); ADR 044 (recomendaciones) |
| CFG.2c | Reubicar lo fiscal: asistente en Ajustes + Análisis | Configuración | sin definir | CFG.2a |
| CFG.2a | Auto-derivar ingresos brutos al monitor de renta | Configuración | sin definir | CFG.1a (cerrada) |
| CFG.3 | Notificaciones inteligentes anticipatorias | Configuración | sin definir | nada; riesgo técnico a evaluar primero |
| CFG.4 | Respaldo, cuentas y sincronización [DECISIÓN DE ADN] | Configuración | sin definir | ADR 043 resuelto |
| CFG.5 | Seguridad de acceso: PIN, patrón, biometría | Configuración | sin definir | nada para PIN local; cuenta depende de CFG.4 |
| CFG.6 | Revisión general de la sección Ajustes | Configuración | sin definir | CFG.1 a CFG.5 |
| PERF.5 | Migrar la persistencia a IndexedDB (futura, no iniciar) | Transversal | sin definir | un disparador del ADR 030 D4 |
| PERF.6 | Coalescer de renders por microtask | Transversal | baja | decidir si el beneficio lo justifica |
| DV.2d | Ilustraciones como clase nueva de asset | Transversal | media | P4 del ADR 033 + cola de diseño |
| IV.4 | Iconografía dirigida post-color | Transversal | tras IV.2 | IV.2 en producción + revisión visual |
| CAT.3 | Categorías personalizadas globales (4 rebanadas, ADR 058) | Transversal | media | nada; decidida el 2026-07-31 |
| LG.2d | Mudanza de la vitrina a Análisis + tarjeta en Inicio | Transversal | baja (bloqueada) | ANL.1 (layout) |
| LG.2e | Familia comportamiento (interpretación de hábitos) | Transversal | baja | LG.2c; `ahorro-creciente` además depende de ANL.1 |
| PA.1 | Pagos y créditos automáticos (débito automático simulado) | Transversal | media-alta | ADR 041 (motor); ADR 052 (Abierta) |
| DOC.1 | Reorganización documental, fases 3 a 5 | Mantenimiento | media | nada |
| A.5 | Dominio custom en Vercel | Mantenimiento | baja | que el usuario tenga el dominio registrado |
| E.2-2027 | Actualizar SMMLV + UVT a valores 2027 | Mantenimiento | alta (enero 2027) | publicación oficial de los decretos 2027 |
| E.3 | Verificar GMF y otras tasas si hay reforma tributaria | Mantenimiento | baja | que ocurra una reforma |

---

## Pendientes por sección

> **Lente de la auditoría de UX/producto (2026-07-21).** Recorrido de toda la app simulando a un usuario colombiano real. Sus 7 patrones son criterio de priorización, no tareas, y explican casi toda la lista de abajo. **Cerrados:** P2 (trabajo manual uno por uno), P4 (ledger de solo lectura), P5 (módulos que no comparten datos con el saldo) y P3 editar sin destruir (EDIT.1 cerrada el 2026-08-04 en sus 4 secciones; queda **MC.17f**, deshacer una transferencia, que es un caso distinto). **Abiertos:** P1 datos que la app ya tiene y vuelve a pedir (LIM.1, CFG.2a; la mitad `cuentaId` de MC.13e-2f ya cerró), P6 se informa pero no se acciona (motor único de sugerencia por categoría: LIM.1 / ANL.1 / [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md)), P7 un concepto con cuatro implementaciones (ARQ.1 y ARQ.2 cerradas el 2026-08-02, ver `contexto/transversal.md`).
>
> **Un hallazgo sigue cuestionando una decisión vigente y no se ejecuta sin la palabra de Esteban** (regla 2.7: un ADR no se revierte en silencio): MC.17f frente al cierre de MC.17 como "completa". Su tarjeta lo dice en su Estado. La propuesta de distribución de un toque quedó resuelta por el [ADR 061](DECISIONS/061-educacion-antes-de-repartir.md): la educación va delante sin cobrar un clic, y colapsar los tres pasos en una sola pantalla se descartó como reordenamiento (son tres decisiones distintas) y sale a triaje si Esteban lo quiere como tarjeta propia.
>
> **Alcance honesto del triaje:** se trió todo lo que el informe entregó enumerado. Su tabla "hallazgos por módulo" vino como vista filtrable y las fichas individuales no llegaron en texto: si Esteban quiere ese detalle triado uno por uno, hay que recuperarlo de la fuente.

Cada sección con tarjetas vivas tiene su satélite en `docs/board/`, mismo nombre que su ficha de [`contexto/`](contexto/README.md). El satélite es la fuente de la tarjeta completa; acá solo el enganche.

### Inicio (dominio `resumen`)

> **Iniciativa "IN.9 - Inicio en escritorio", cerrada** (sus cinco rebanadas, 2026-08-02). Detalle e historia: [`contexto/inicio.md`](contexto/inicio.md) y CHANGELOG. **PI8 sigue abierto** (contraste de los tokens `--fk-dom-*`, bajo el mínimo WCAG 1.4.11) y no viaja con INT.1: merece tarjeta de accesibilidad propia. Móvil no cambia salvo lo que IN.9a decidió.

### Calendario (dominio `agenda`)

_(Anti-duplicado, triaje 2026-07-08: las tres partes del brief "Auditoría UX/UI Calendario" ya tienen fuente única y no generan tarjeta aquí. Tinte de color en las tarjetas de evento → **IV.2c**; logos de marca en eventos → [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md); picker de icono y categorías personalizadas reutilizables → iniciativa **CAT** en Transversal.)_

### Mis cuentas (dominio `tesoreria`)

MC.17f → [`board/mis-cuentas.md`](board/mis-cuentas.md)

### Metas (dominio `metas`)

MT.6 → [`board/metas.md`](board/metas.md)

### Ahorro (dominio `ahorro`, casa de Ahorro + fondo de emergencia)

AH.7a → [`board/ahorro.md`](board/ahorro.md)

### Límites de gasto (dominio `presupuesto`)

LIM.1 → [`board/limites.md`](board/limites.md)

### Me deben (dominio `personales`)

PE.6d → [`board/me-deben.md`](board/me-deben.md)

### Análisis (dominio `analisis`)

ANL.1 → [`board/analisis.md`](board/analisis.md)

### Configuración (dominio `config`)

CFG.2c, CFG.2a, CFG.3, CFG.4, CFG.5, CFG.6 → [`board/configuracion.md`](board/configuracion.md)

---

## Transversal (afecta varias secciones)

INT.1a a INT.1h, PERF.5, PERF.6, DV.2d, IV.4, CAT.3 (+ CAT.3c, CAT.3d), LG.2d, LG.2e, PA.1 → [`board/transversal.md`](board/transversal.md)

---

## Secciones sin tarjetas pendientes

Se listan solo para que una idea nueva de estas secciones no vuelva a generar una tarjeta duplicada: su fuente única ya está decidida.

| Sección | Dónde vive su trabajo futuro |
|---|---|
| Gastos | Iniciativa "Gastos v2" completa ([ADR 039](DECISIONS/039-gastos-v2-visual.md)), con 3 decisiones diferidas anotadas en el ADR: FAB, búsqueda en el header y comparación tangible del insight hormiga. La taxonomía de categorías ya cerró (**CAT.1**, [ADR 014](DECISIONS/014-taxonomia-categorias-transversal.md)); lo que queda de categorías es **CAT.3** (personalizadas globales) y el motor de sugerencia por categoría, la fusión LIM.1 / ANL.1 / ADR 029 |
| Movimientos | Ledger accionable, con búsqueda y filtros, completo. El hueco que queda es **MC.17f** (deshacer transferencia); editar un aporte puntual no tiene tarjeta propia (ver `contexto/movimientos.md`) |
| Deudas | Iniciativa "Deudas v2" completa ([ADR 036](DECISIONS/036-deudas-v2-visual.md)). Que un pago de deuda descuente de la cuenta ya existe desde el [ADR 002](DECISIONS/002-abono-deudas.md): si aparece un caso donde NO ocurra, es un bug para [`BUGS.md`](BUGS.md), no una feature |
| Inversión | Sin pendientes propios. "Editar sin destruir" ya cerró (**EDIT.1**, 2026-08-02); su infraestructura compartida cerró con **ARQ.1** (2026-08-02) |
| Apartados | Iniciativa "Apartados v2" completa (**AP.5** cerrada, 2026-08-01). "Editar sin destruir" ya cerró (**EDIT.1**, 2026-08-02); el catálogo de plantillas queda fuera de **CAT.3** (razón en el [ADR 058](DECISIONS/058-categorias-personalizadas-globales.md)) |
| "Editar sin destruir" (EDIT.1) | **Iniciativa completa** (2026-08-04): Metas (`contexto/metas.md`, EDIT.1a), Apartados, Inversión y Me deben, las 4 secciones que la tenían, editan sin recrear |
| Biblioteca gráfica e iconografía | Completas ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md), [025](DECISIONS/025-logotipos-de-marca-y-tejas.md), [026](DECISIONS/026-biblioteca-de-recursos-graficos.md), [027](DECISIONS/027-logos-de-marca-a-color-excepcion-monocromo.md)). La regla de fidelidad de los SVG que entrega Esteban y el costo de agregar un glifo viven en [`assets/svg/README.md`](../assets/svg/README.md). Lo único pendiente es **IV.4** |

---
## Mantenimiento

#### DOC.1 - Reorganización documental, fases 3 a 5
- Prioridad  : media
- Estado     : Fases 1, 2 y 3 cerradas. **Fase 4:** de los 10 de la tabla 11.1 están hechos 9; el **6** (`BOARD.md` partido en satélites por dominio, `docs/board/`) cerrado el 2026-08-03: BOARD.md baja de 60 KB a ~10 KB (índice + enganches), 8 satélites nuevos, ninguno sobre el techo de 40 KB. Solo falta el **9**, que sigue esperando la decisión de Esteban sobre los comodines amplios de `settings.local.json` (12.2). Plan completo: [`MIGRACION.md`](MIGRACION.md) sección 7.
- Objetivo   : bajar el arranque de una tarea de ~69.400 a ~21.000 tokens sin perder información, moviendo cada bloque a su dueño documental.
- Secciones  : ninguna de la app (solo documentación, `CLAUDE.md` y `.claude/`)
- Archivos   : la tabla de trazabilidad de [`MIGRACION.md`](MIGRACION.md) sección 6 los lista uno por uno
- Depende de : nada. Cada fase es commiteable y verificable por separado; el orden 3 → 4 → 5 importa porque la tabla de documentos de CLAUDE.md debe apuntar a la estructura ya migrada
- Modelo     : la Fase 3 pide criterio de redacción y arquitectura de información (comprimir sin perder reglas); la Fase 4 es mecánica pero con validación de destino en cada borrado

#### A.5 - Dominio custom en Vercel
- Prioridad  : baja
- Estado     : pendiente (espera a que el usuario registre un dominio)
- Objetivo   : cambiar de `finko-brown.vercel.app` a un dominio propio. No requiere cambios de código.
- Secciones  : Infraestructura
- Archivos   : guía completa en [`OPERACION.md`](OPERACION.md) runbook 1
- Depende de : que el usuario tenga el dominio registrado
- Modelo     : sin código, solo config en Vercel

#### E.2-2027 - Actualizar SMMLV + UVT a valores 2027
- Prioridad  : alta (cuando llegue la fecha)
- Estado     : pendiente, programada para enero 2027
- Objetivo   : reemplazar `2027: null` por la entrada completa en `LEGAL_POR_ANIO` con los valores oficiales de Mintrabajo (SMMLV) y DIAN (UVT). Procedimiento paso a paso: [`OPERACION.md`](OPERACION.md) runbook 2.
- Secciones  : Transversal (constantes legales)
- Archivos   : `modules/core/constants.js`
- Depende de : publicación oficial de los decretos/resoluciones 2027
- Modelo     : Ligero

#### E.3 - Verificar GMF y otras tasas si hay reforma tributaria
- Prioridad  : baja
- Estado     : pendiente (ad-hoc, solo si hay reforma)
- Objetivo   : revisar si una reforma tributaria cambia el GMF (4x1000) u otras constantes.
- Secciones  : Transversal (constantes legales)
- Archivos   : `modules/core/constants.js`
- Depende de : que ocurra una reforma
- Modelo     : Ligero

_(Nota de mantenimiento anual: junto con E.2, cada enero agregar también la entrada del año en `IPC_OBSERVADO_POR_ANIO` con el cierre del DANE, ver E.5 en el CHANGELOG de 2026-07.)_
