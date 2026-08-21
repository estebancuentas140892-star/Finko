# Tablero - Finko Claude

> Revisado: 2026-08-21.

> Tablero Kanban de trabajo pendiente. Reemplaza a `TASKS.md` y `ROADMAP.md` (retirados 2026-07-02, ver [CHANGELOG](CHANGELOG.md)).
> Regla de oro: **solo lo pendiente vive aquí.** Al cerrar una tarea, su tarjeta se borra de este archivo y su historia completa queda en [`CHANGELOG.md`](CHANGELOG.md) (ver la skill `cerrar-tarea`).
> Errores conocidos: ver [`BUGS.md`](BUGS.md).
> Contexto técnico por sección (dónde vive cada funcionalidad): ver [`contexto/`](contexto/README.md).
> Última actualización: 2026-08-21. Historia completa de cierres (qué tarjeta, qué cambió, por qué) en [`CHANGELOG.md`](CHANGELOG.md); este archivo ya no la repite (regla de oro de arriba).

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
- Avance     : **13/25 cerradas** (01 navegación móvil global, [ADR 069](DECISIONS/069-bloque-gastos-en-la-barra-movil.md); 02 Inicio; 03 Más; 04 Ahorro; 05 Por pagar, que recuperó el alta de gasto fijo y el pago en lote; 06 Mis cuentas, [ADR 080](DECISIONS/080-mis-cuentas-un-primario-y-lo-informativo-al-pie.md), que acota el 075 en D1 y D5; 07 el bloque Gastos, [ADR 069](DECISIONS/069-bloque-gastos-en-la-barra-movil.md) D8; 08 Calendario, [ADR 081](DECISIONS/081-calendario-la-forma-del-mes-entradas-incluidas.md), que supera el 037 en la mitad del hero; 09 Metas, [ADR 082](DECISIONS/082-metas-cabeza-orden-y-un-final-que-pesa-poco.md), que acota DIS.14 en la lista y confirma la tarjeta; 10 Reservas, [ADR 083](DECISIONS/083-reservas-el-orden-que-el-dominio-ya-tenia-escrito.md), que conecta el orden que el dominio ya tenia escrito; 11 el Fondo, [ADR 084](DECISIONS/084-fondo-el-compromiso-del-periodo-en-la-primera-pantalla.md), que conserva el ADR 049 D2 y descarta uno de sus cuatro cambios; 12 Limites, [ADR 085](DECISIONS/085-limites-la-lente-contiene-limites.md), que acota el ADR 077 D1 y D4 y cierra G2; 13 Inversion, [ADR 086](DECISIONS/086-inversion-la-etapa-se-nombra-y-el-consejo-es-el-boton.md), que confirma DIS.17 casi entero). **La casa Ahorro y sus cuatro hijas quedan cerradas** (04, 09, 10, 11, 13). Sigue la 14, Me deben.
- Restricción: el orden no se altera. Cada ficha se implementa, se valida en la app y se cierra antes de abrir la siguiente. Lo que una ficha deja anotado para otra (ej. HR-1, o el destino de Logros) no se decide antes de llegar a ella.
- Aparte     : el **bloque de Logros del handoff (ficha 20)** se aplicó fuera del orden como MOV.20a el 2026-08-20, porque no toca ningún archivo abierto por las fichas 06 ni 07. De ese bloque, R91 quedó **anulada** (premisa previa a LG.2e). El resto de la ficha 20 son los anclajes R86 de otros dominios, que se aplican con la ficha que los nombra.
- Deuda de 05: la ficha 06 destapó que la 05 especificó los cuatro chips de la lente Por pagar y no los implementó. Los chips ya están (ADR 080 D6); **siguen faltando** la fila de altas que aparece solo para el grupo visible y el pie de saldo con "Ver plan de salida". Se cierran cuando toque revisar la 05, no antes.
- Abierto por 08: el **día vencido** se pinta ámbar en Calendario y rojo en Inicio y en "Por pagar" (K5). Las dos decisiones tienen razón escrita y buena; elegir un lado es una decisión de tono que ninguna ficha tomó, y va a la **ficha 18**.
- Abierto por 09: **R87 no se consolida** hasta que la **ficha 18** le escriba la clausula del movimiento que apunta a un objeto concreto de una lista. La 09 invirtio su reparto (el canonico es la seccion) y la 10 la reforzo: alli el boton de la seccion trae el monto calculado y el de Registrar no puede.
- Abierto por 10: **R89 se parte** en **R89a** (una lista que no cabe en pantalla declara su orden, y ese orden responde a la pregunta de la seccion: fichas 05, 09 y 10) y **R89b** (un mismo conjunto se ordena igual en todas sus vistas: la 04 incumplida, la 10 cumplida). Reservas cumple una mitad y falla la otra a la vez, y eso demuestra que son independientes. La **ficha 18** decide si el corte es ese o si R89b se absorbe en una regla de coherencia ya existente. Tambien le llegan **V5** (el "Ya lo usé" cierra el ciclo sin registrar el gasto, cruza Gastos, Movimientos y Analisis), el **estado terminal de las cuatro bolsas** (hoy resuelto de formas opuestas, con Fondo e Inversion sin auditar) y el **techo del comparador**, componente compartido sin umbral declarado.
- Abierto por 11: **primer choque de una ficha con un ADR vigente**. Su E2 proponia subir el aporte del Fondo a primario y eso revierte el [ADR 049](DECISIONS/049-fondo-de-emergencia-v2.md) D2; Esteban decidio conservar el 049 y la ficha cerro con tres cambios de cuatro. Queda un **cabo suelto de estilo muerto**: `.fondo-card__principal` existe en `analysis.css` y ningun markup lo usa. Y a la **ficha 18** le llegan el tercer tipo de R87 (el aporte al fondo no crea regla ni mueve dinero, y comparte la teja "Aporte" con los que si descuentan), **E5** (el historial sin techo, tercer pendiente del mismo tipo tras las fichas 05 y 10), la ubicacion del aviso de tasa de ahorro y el patron "arreglado solo en escritorio", que conviene barrer porque esta auditoria solo cubre movil.
- Abierto por 12: la **ficha 18** decide si el seguimiento de los tres grupos pertenece a **Analisis** y no a Gastos (la franja lo conserva por frecuencia de consulta, pero un plan cuyo tercer grupo es Ahorro no es una pregunta de Gastos), y si el trafico nuevo hacia Mis cuentas obliga a releer su conclusion de "destino de servicio" (ficha 06). **R88 sigue con una sola aparicion**: la 12 examino su candidato (el panel de Inicio subcuenta) y lo descarto porque ese panel no encabeza la vista que resume; la **ficha 16** es su ultima candidata, y si no le da la segunda, la 18 la descarta en vez de arrastrarla.
- Abierto por 13: a la **ficha 18** le llega la pregunta de si **Finko debe guardar el valor de mercado de una inversion**. Es el dato que falta para que exista un tercer momento y el que haria honesto el patrimonio de Analisis, que hoy suma capital invertido y no valor actual: toca el modelo de datos y la ficha 16. Tambien le llegan el **caso del contador con denominador inalcanzable** (una sola aparicion en trece fichas, se anota como caso y no como regla), el **matiz de R87** (registrar una inversion mueve dinero Y crea un objeto duradero, asi que no encaja en ninguno de los tres tipos) y la verificacion de que no queda ningun R85 en otros dominios.
- Avisos     : la ficha **19** es un rediseño de la vitrina de Logros con premisa previa a LG.2d (la ubicaba en Ajustes): hay que releerla contra las dos superficies de hoy. Y las fichas escritas antes del 2026-08-17 pueden chocar con los ADR de escritorio (070 a 079): el choque se resuelve con un ADR que acote, como hizo el 080, nunca en silencio.


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
> **DSK.1 acota IN.9 y está en proceso** (arriba, "En proceso"). El [ADR 070](DECISIONS/070-inicio-centro-de-atencion-en-escritorio.md) reemplaza el reparto de escritorio que fijaron D3 y D4 del [ADR 057](DECISIONS/057-inicio-en-escritorio.md). Dependencia abierta que deja: **"Personalizar accesos" se queda sin entrada en escritorio** y necesita sitio en Ajustes, que ya tiene dueño en **CFG.6** (`board/configuracion.md`). Candidato anotado, sin tarjeta: auditar si **"Tu progreso"** pertenece a Inicio, que el [ADR 087](DECISIONS/087-inicio-en-movil-tambien-avisa-y-no-resume.md) dejo explicitamente sin decidir (no es uno de los tres modulos del ADR 070 D2 y su universalidad es decision propia del ADR 032 D6). Ese mismo ADR 087 saca de Inicio movil el resumen semanal y la actividad reciente, y deja **dos modulos de logica sin consumidor** con destino escrito en la ficha 16: `resumen/logic.js` y `movimientosRecientes()`.

### Calendario (dominio `agenda`)

_(Anti-duplicado, triaje 2026-07-08: las tres partes del brief "Auditoría UX/UI Calendario" ya tienen fuente única y no generan tarjeta aquí. Tinte de color en las tarjetas de evento → **IV.2c**; logos de marca en eventos → [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md); picker de icono y categorías personalizadas reutilizables → iniciativa **CAT** en Transversal.)_

### Configuración (dominio `config`)

CFG.6 → [`board/configuracion.md`](board/configuracion.md)

_(CFG.1 a CFG.5 cerraron completas. **CFG.6** es la auditoría UX/UI móvil de la pantalla: Ajustes es la única de las 15 secciones sin ficha en el handoff, y no se inicia hasta que cierren las fichas 17, 18 y 19 de MOV.1, que deciden el Logros que vive dentro.)_

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
