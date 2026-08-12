# Tablero - Finko Claude

> Revisado: 2026-08-12.

> Tablero Kanban de trabajo pendiente. Reemplaza a `TASKS.md` y `ROADMAP.md` (retirados 2026-07-02, ver [CHANGELOG](CHANGELOG.md)).
> Regla de oro: **solo lo pendiente vive aquí.** Al cerrar una tarea, su tarjeta se borra de este archivo y su historia completa queda en [`CHANGELOG.md`](CHANGELOG.md) (ver la skill `cerrar-tarea`).
> Errores conocidos: ver [`BUGS.md`](BUGS.md).
> Contexto técnico por sección (dónde vive cada funcionalidad): ver [`contexto/`](contexto/README.md).
> Última actualización: 2026-08-12. Historia completa de cierres (qué tarjeta, qué cambió, por qué) en [`CHANGELOG.md`](CHANGELOG.md); este archivo ya no la repite (regla de oro de arriba).

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
| INT.1g | Carril derecho de 320px desde 1.680px (diferida) | Transversal | baja (diferida) | sin sección candidata con contenido |
| MT.6 | Metas v2: subcategorías inteligentes + plan de aportes (en curso, faltan MT.6c/d) | Metas | media-alta | nada: ADR 064 cerró la estructura de dos niveles |
| LIM.1a | El dinero extra del mes, informado sin repartir | Límites | media | nada: ADR 045 D3 cerró el criterio |
| LIM.1b | Los fijos no esenciales cuentan contra Estilo de vida | Límites | media | nada; mueve el reparto en Límites y Mis cuentas a la vez |
| LIM.1c | Sugerir dónde y cuánto poner tope (bloqueada) | Límites | sin definir | ADR 044 (motor único de sugerencia) |
| PE.6d | Me deben: los cinco estados de un vistazo | Me deben | media-alta | bloqueada por IV.2 en producción |
| ANL.1c | Lectura del colapsable de detalle de Análisis | Análisis | baja | nada: ANL.1a cerrada |
| CFG.2c | Reubicar lo fiscal: asistente en Ajustes + Análisis | Configuración | sin definir | CFG.2a |
| CFG.2a | Auto-derivar ingresos brutos al monitor de renta | Configuración | sin definir | CFG.1a (cerrada) |
| CFG.3 | Notificaciones inteligentes anticipatorias | Configuración | sin definir | nada; riesgo técnico a evaluar primero |
| CFG.4 | Respaldo, cuentas y sincronización [DECISIÓN DE ADN] | Configuración | sin definir | ADR 043 resuelto |
| CFG.5b | Re-autenticación con PIN en acciones críticas | Configuración | sin definir | CFG.5a (cerrada) |
| CFG.5c | Biometría en PWA: verificar antes de prometer | Configuración | sin definir | CFG.5a (cerrada) + dispositivo real |
| CFG.6 | Revisión general de la sección Ajustes | Configuración | sin definir | CFG.2a/2c, CFG.3, CFG.4 |
| PERF.5 | Migrar la persistencia a IndexedDB (futura, no iniciar) | Transversal | sin definir | un disparador del ADR 030 D4 |
| PERF.6 | Coalescer de renders por microtask | Transversal | baja | decidir si el beneficio lo justifica |
| DV.2d | Ilustraciones como clase nueva de asset | Transversal | media | P4 del ADR 033 + cola de diseño |
| IV.4 | Iconografía dirigida post-color | Transversal | tras IV.2 | IV.2 en producción + revisión visual |
| LG.2d | Mudanza de la vitrina a Análisis + tarjeta en Inicio | Transversal | media | nada: ADR 046 D4 reservó el bloque en Análisis |
| LG.2e | Familia comportamiento (interpretación de hábitos) | Transversal | baja | LG.2c; `ahorro-creciente` sigue sin derivación de ingreso mensual |
| PA.1 | Pagos y créditos automáticos (débito automático simulado) | Transversal | media-alta | ADR 041 (motor); ADR 052 (Abierta) |
| A.5 | Dominio custom en Vercel | Mantenimiento | baja | que el usuario tenga el dominio registrado |
| E.2-2027 | Actualizar SMMLV + UVT a valores 2027 | Mantenimiento | alta (enero 2027) | publicación oficial de los decretos 2027 |
| E.3 | Verificar GMF y otras tasas si hay reforma tributaria | Mantenimiento | baja | que ocurra una reforma |

---

## Pendientes por sección

> **Lente de la auditoría de UX/producto (2026-07-21).** Recorrido de toda la app simulando a un usuario colombiano real. Sus 7 patrones son criterio de priorización, no tareas, y explican casi toda la lista de abajo. **Cerrados:** P2 (trabajo manual uno por uno), P4 (ledger de solo lectura), P5 (módulos que no comparten datos con el saldo) y P3 editar sin destruir (EDIT.1 cerrada el 2026-08-04 en sus 4 secciones; MC.17f cerrada el 2026-08-12 cierra el caso distinto de deshacer una transferencia). **Abiertos:** P1 datos que la app ya tiene y vuelve a pedir (LIM.1a, CFG.2a; la mitad `cuentaId` de MC.13e-2f ya cerró), P6 se informa pero no se acciona (motor único de sugerencia por categoría: LIM.1c / ANL.1 / [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md)), P7 un concepto con cuatro implementaciones (ARQ.1 y ARQ.2 cerradas el 2026-08-02, ver `contexto/transversal.md`).
>
> **Alcance honesto del triaje:** se trió todo lo que el informe entregó enumerado. Su tabla "hallazgos por módulo" vino como vista filtrable y las fichas individuales no llegaron en texto: si Esteban quiere ese detalle triado uno por uno, hay que recuperarlo de la fuente.

Cada sección con tarjetas vivas tiene su satélite en `docs/board/`, mismo nombre que su ficha de [`contexto/`](contexto/README.md). El satélite es la fuente de la tarjeta completa; acá solo el enganche.

### Inicio (dominio `resumen`)

> **Iniciativa "IN.9 - Inicio en escritorio", cerrada** (sus cinco rebanadas, 2026-08-02). Detalle e historia: [`contexto/inicio.md`](contexto/inicio.md) y CHANGELOG. **PI8 sigue abierto** (contraste de los tokens `--fk-dom-*`, bajo el mínimo WCAG 1.4.11) y no viaja con INT.1: merece tarjeta de accesibilidad propia. Móvil no cambia salvo lo que IN.9a decidió.

### Calendario (dominio `agenda`)

_(Anti-duplicado, triaje 2026-07-08: las tres partes del brief "Auditoría UX/UI Calendario" ya tienen fuente única y no generan tarjeta aquí. Tinte de color en las tarjetas de evento → **IV.2c**; logos de marca en eventos → [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md); picker de icono y categorías personalizadas reutilizables → iniciativa **CAT** en Transversal.)_

### Metas (dominio `metas`)

MT.6 → [`board/metas.md`](board/metas.md)

### Ahorro (dominio `ahorro`, casa de Ahorro + fondo de emergencia)

AH.7a → [`board/ahorro.md`](board/ahorro.md)

### Límites de gasto (dominio `presupuesto`)

LIM.1a, LIM.1b, LIM.1c → [`board/limites.md`](board/limites.md)

### Me deben (dominio `personales`)

PE.6d → [`board/me-deben.md`](board/me-deben.md)

### Análisis (dominio `analisis`)

ANL.1c → [`board/analisis.md`](board/analisis.md)

### Configuración (dominio `config`)

CFG.2c, CFG.2a, CFG.3, CFG.4, CFG.5b, CFG.5c, CFG.6 → [`board/configuracion.md`](board/configuracion.md)

---

## Transversal (afecta varias secciones)

INT.1a a INT.1h, PERF.5, PERF.6, DV.2d, IV.4, LG.2d, LG.2e, PA.1 → [`board/transversal.md`](board/transversal.md)

---

## Secciones sin tarjetas pendientes

Se listan solo para que una idea nueva de estas secciones no vuelva a generar una tarjeta duplicada: su fuente única ya está decidida.

| Sección | Dónde vive su trabajo futuro |
|---|---|
| Movimientos | Ledger accionable, con búsqueda y filtros, completo. Deshacer una transferencia (**MC.17f**) cerró el 2026-08-12; editar un aporte puntual no tiene tarjeta propia (ver `contexto/movimientos.md`) |
| Mis cuentas | Iniciativa "Mis Cuentas v2" completa: **MC.13**, **MC.16**, **MC.17** (incluye MC.17f) y **MC.18** en producción (ver `contexto/mis-cuentas.md`) |
| Gastos | Iniciativa del toast de confirmación completa: **GAS.2a**, **GAS.2b** y **GAS.2c** cerradas ([ADR 062](DECISIONS/062-toast-de-consecuencia-en-abono-y-aporte.md)), ver `board/gastos.md` |
| Deudas | Iniciativa "Deudas v2" completa ([ADR 036](DECISIONS/036-deudas-v2-visual.md)). Que un pago de deuda descuente de la cuenta ya existe desde el [ADR 002](DECISIONS/002-abono-deudas.md): si aparece un caso donde NO ocurra, es un bug para [`BUGS.md`](BUGS.md), no una feature |
| Inversión | Sin pendientes propios. "Editar sin destruir" ya cerró (**EDIT.1**, 2026-08-02); su infraestructura compartida cerró con **ARQ.1** (2026-08-02) |
| Apartados | Iniciativa "Apartados v2" completa (**AP.5** cerrada, 2026-08-01). "Editar sin destruir" ya cerró (**EDIT.1**, 2026-08-02); el catálogo de plantillas queda fuera de **CAT.3** (razón en el [ADR 058](DECISIONS/058-categorias-personalizadas-globales.md)) |
| "Editar sin destruir" (EDIT.1) | **Iniciativa completa** (2026-08-04): Metas (`contexto/metas.md`, EDIT.1a), Apartados, Inversión y Me deben, las 4 secciones que la tenían, editan sin recrear |
| Biblioteca gráfica e iconografía | Completas ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md), [025](DECISIONS/025-logotipos-de-marca-y-tejas.md), [026](DECISIONS/026-biblioteca-de-recursos-graficos.md), [027](DECISIONS/027-logos-de-marca-a-color-excepcion-monocromo.md)). La regla de fidelidad de los SVG que entrega Esteban y el costo de agregar un glifo viven en [`assets/svg/README.md`](../assets/svg/README.md). Lo único pendiente es **IV.4** |

---
## Mantenimiento

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
