# Tablero - Finko Claude

> Revisado: 2026-08-18.

> Tablero Kanban de trabajo pendiente. Reemplaza a `TASKS.md` y `ROADMAP.md` (retirados 2026-07-02, ver [CHANGELOG](CHANGELOG.md)).
> Regla de oro: **solo lo pendiente vive aquí.** Al cerrar una tarea, su tarjeta se borra de este archivo y su historia completa queda en [`CHANGELOG.md`](CHANGELOG.md) (ver la skill `cerrar-tarea`).
> Errores conocidos: ver [`BUGS.md`](BUGS.md).
> Contexto técnico por sección (dónde vive cada funcionalidad): ver [`contexto/`](contexto/README.md).
> Última actualización: 2026-08-18. Historia completa de cierres (qué tarjeta, qué cambió, por qué) en [`CHANGELOG.md`](CHANGELOG.md); este archivo ya no la repite (regla de oro de arriba).

---

## En proceso

### MOV.1 - auditoría UX/UI móvil de Claude Design, 25 entregas
- Prioridad  : alta
- Estado     : en proceso (iniciada 2026-08-15)
- Área       : ambos
- Objetivo   : implementar el handoff "Mobile app design handoff" ficha por ficha, en el orden que fijó Esteban, sin reinterpretar las propuestas
- Secciones  : todas
- Archivos   : según ficha
- Depende de : nada
- Avance     : **05/25 cerradas** (01 navegación móvil global, [ADR 069](DECISIONS/069-bloque-gastos-en-la-barra-movil.md); 02 Inicio; 03 Más; 04 Ahorro; 05 Por pagar, que recuperó el alta de gasto fijo y el pago en lote). Sigue la 06.
- Restricción: el orden no se altera. Cada ficha se implementa, se valida en la app y se cierra antes de abrir la siguiente. Lo que una ficha deja anotado para otra (ej. HR-1, o el destino de Logros) no se decide antes de llegar a ella.

### DSK.1 - Inicio como centro de atención en escritorio, 4 rebanadas
- Prioridad  : alta
- Estado     : en proceso (iniciada 2026-08-18)
- Área       : ambos
- Objetivo   : implementar la auditoría "Inicio 1920 v2" de Claude Design ([ADR 070](DECISIONS/070-inicio-centro-de-atencion-en-escritorio.md)): Inicio en escritorio avisa, no resume
- Secciones  : Inicio
- Archivos   : `index.html`, `modules/infra/render.js`, `modules/dominio/compromisos/views/dashboard.js`, `styles/layout.css`, `styles/responsive.css`, `styles/components/domain.css`
- Depende de : nada
- Avance     : **00/04**. a) purga y cabecera (D2, D10). b) banda de contexto (D4, D5, D6). c) columnas 4 + 8 (D7). d) fusión de obligaciones y pie (D8, D9).
- Restricción: **alcance escritorio, desde 1024px.** Móvil no se toca: es territorio de MOV.1, que sigue abierta. Las dos iniciativas comparten `index.html` y corren en sesiones distintas: `git status` antes de cada rebanada, y stagear solo los archivos propios.

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

Las 4 tarjetas del tablero, para elegir la próxima sin cargar el archivo completo (principio 9). "Depende de" va acortado a la referencia clave; el texto completo vive en la tarjeta, más abajo por sección.

| ID | Título | Sección | Prioridad | Depende de |
|---|---|---|---|---|
| DV.2d | Ilustraciones como clase nueva de asset | Transversal | media | cola de diseño de Esteban |
| A.5 | Dominio custom en Vercel | Mantenimiento | baja | que el usuario tenga el dominio registrado |
| E.2-2027 | Actualizar SMMLV + UVT a valores 2027 | Mantenimiento | alta (enero 2027) | publicación oficial de los decretos 2027 |
| E.3 | Verificar GMF y otras tasas si hay reforma tributaria | Mantenimiento | baja | que ocurra una reforma |

---

## Pendientes por sección

> **Lente de la auditoría de UX/producto (2026-07-21).** Recorrido de toda la app simulando a un usuario colombiano real. Sus 7 patrones son criterio de priorización, no tareas, y explican casi toda la lista de abajo. **Cerrados:** P2 (trabajo manual uno por uno), P4 (ledger de solo lectura), P5 (módulos que no comparten datos con el saldo) y P3 editar sin destruir (EDIT.1 cerrada el 2026-08-04 en sus 4 secciones; MC.17f cerrada el 2026-08-12 cierra el caso distinto de deshacer una transferencia). **Abiertos:** P1 datos que la app ya tiene y vuelve a pedir (queda solo `consumosTC`/`consignaciones` del monitor de renta, sin tarjeta propia: CFG.2a y CFG.2c cerraron el 2026-08-13 y la mitad `cuentaId` de MC.13e-2f ya había cerrado), ~~P6 se informa pero no se acciona~~ (**cerrado el 2026-08-13 con LIM.1c**: el motor único del [ADR 044](DECISIONS/044-motor-unico-de-sugerencia-por-categoria.md) convierte el patrón en un tope con monto y puerta; ANL.1 había cubierto la mitad "informar bien", no la de accionar, por decisión del [ADR 046](DECISIONS/046-analisis-interpreta-criterio-y-lenguaje.md) D3), P7 un concepto con cuatro implementaciones (ARQ.1 y ARQ.2 cerradas el 2026-08-02, ver `contexto/transversal.md`).
>
> **Alcance honesto del triaje:** se trió todo lo que el informe entregó enumerado. Su tabla "hallazgos por módulo" vino como vista filtrable y las fichas individuales no llegaron en texto: si Esteban quiere ese detalle triado uno por uno, hay que recuperarlo de la fuente.

Cada sección con tarjetas vivas tiene su satélite en `docs/board/`, mismo nombre que su ficha de [`contexto/`](contexto/README.md). El satélite es la fuente de la tarjeta completa; acá solo el enganche.

### Inicio (dominio `resumen`)

> **Iniciativa "IN.9 - Inicio en escritorio", cerrada** (sus cinco rebanadas, 2026-08-02). Detalle e historia: [`contexto/inicio.md`](contexto/inicio.md) y CHANGELOG. **PI8 sigue abierto** (contraste de los tokens `--fk-dom-*`, bajo el mínimo WCAG 1.4.11) y no viaja con INT.1: merece tarjeta de accesibilidad propia. Móvil no cambia salvo lo que IN.9a decidió.
>
> **DSK.1 acota IN.9 y está en proceso** (arriba, "En proceso"). El [ADR 070](DECISIONS/070-inicio-centro-de-atencion-en-escritorio.md) reemplaza el reparto de escritorio que fijaron D3 y D4 del [ADR 057](DECISIONS/057-inicio-en-escritorio.md). Dependencia abierta que deja: **"Personalizar accesos" se queda sin entrada en escritorio** y necesita sitio en Ajustes. Candidato anotado, sin tarjeta: auditar si **"Tu progreso"** pertenece a Inicio.

### Calendario (dominio `agenda`)

_(Anti-duplicado, triaje 2026-07-08: las tres partes del brief "Auditoría UX/UI Calendario" ya tienen fuente única y no generan tarjeta aquí. Tinte de color en las tarjetas de evento → **IV.2c**; logos de marca en eventos → [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md); picker de icono y categorías personalizadas reutilizables → iniciativa **CAT** en Transversal.)_

### Configuración (dominio `config`)

_(Sin tarjetas pendientes: la iniciativa CFG.4 cerró completa el 2026-08-15. Ver la tabla "Secciones sin tarjetas pendientes".)_

---

## Transversal (afecta varias secciones)

DV.2d → [`board/transversal.md`](board/transversal.md)

---

## Secciones sin tarjetas pendientes

Se listan solo para que una idea nueva de estas secciones no vuelva a generar una tarjeta duplicada: su fuente única ya está decidida.

| Sección | Dónde vive su trabajo futuro |
|---|---|
| Movimientos | Ledger accionable, con búsqueda y filtros, completo. Deshacer una transferencia (**MC.17f**) cerró el 2026-08-12; editar un aporte puntual no tiene tarjeta propia (ver `contexto/movimientos.md`) |
| Me deben | Iniciativa **PE.6** completa (**PE.6a-e**; PE.6d cerró el 2026-08-12, [ADR 047](DECISIONS/047-me-deben-v2-intereses-e-historial.md)), ver `contexto/me-deben.md` |
| Mis cuentas | Iniciativa "Mis Cuentas v2" completa: **MC.13**, **MC.16**, **MC.17** (incluye MC.17f) y **MC.18** en producción (ver `contexto/mis-cuentas.md`) |
| Gastos | Iniciativa del toast de confirmación completa: **GAS.2a**, **GAS.2b** y **GAS.2c** cerradas ([ADR 062](DECISIONS/062-toast-de-consecuencia-en-abono-y-aporte.md)), ver `board/gastos.md` |
| Configuración | Iniciativa "Durabilidad de los datos" completa: **CFG.4a-d** cerradas ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)), ver `board/configuracion.md` |
| Ahorro | **AH.7 completa**: AH.7b renombró "Apartados" a "Reservas" (2026-07-31) y AH.7a subió la casa a la barra inferior de móvil ([ADR 065](DECISIONS/065-ahorro-en-la-barra-inferior.md), 2026-08-13), ver `contexto/ahorro.md` |
| Metas | Iniciativa "Metas v2" completa: **MT.6a-d** cerradas ([ADR 048](DECISIONS/048-metas-v2-subcategorias-y-plan-de-aportes.md), [ADR 064](DECISIONS/064-estructura-de-dos-niveles.md)), ver `contexto/metas.md` |
| Deudas | Iniciativa "Deudas v2" completa ([ADR 036](DECISIONS/036-deudas-v2-visual.md)). Que un pago de deuda descuente de la cuenta ya existe desde el [ADR 002](DECISIONS/002-abono-deudas.md): si aparece un caso donde NO ocurra, es un bug para [`BUGS.md`](BUGS.md), no una feature |
| Inversión | Sin pendientes propios. "Editar sin destruir" ya cerró (**EDIT.1**, 2026-08-02); su infraestructura compartida cerró con **ARQ.1** (2026-08-02) |
| Apartados | Iniciativa "Apartados v2" completa (**AP.5** cerrada, 2026-08-01). "Editar sin destruir" ya cerró (**EDIT.1**, 2026-08-02); el catálogo de plantillas queda fuera de **CAT.3** (razón en el [ADR 058](DECISIONS/058-categorias-personalizadas-globales.md)) |
| "Editar sin destruir" (EDIT.1) | **Iniciativa completa** (2026-08-04): Metas (`contexto/metas.md`, EDIT.1a), Apartados, Inversión y Me deben, las 4 secciones que la tenían, editan sin recrear |
| Biblioteca gráfica e iconografía | Completas ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md), [025](DECISIONS/025-logotipos-de-marca-y-tejas.md), [026](DECISIONS/026-biblioteca-de-recursos-graficos.md), [027](DECISIONS/027-logos-de-marca-a-color-excepcion-monocromo.md)). La regla de fidelidad de los SVG que entrega Esteban y el costo de agregar un glifo viven en [`assets/svg/README.md`](../assets/svg/README.md). **IV.4 cerrada (2026-08-15)**: metáfora de Avalancha/Bola de nieve, ver CHANGELOG |

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
