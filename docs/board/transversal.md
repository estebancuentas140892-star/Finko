# Tablero - Transversal

> Revisado: 2026-10-29.

> Satélite de [`BOARD.md`](../BOARD.md) (afecta varias secciones). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

## Transversal (afecta varias secciones)

> **Auditoría de rendimiento 2026-07 completa** (PERF.0 a PERF.4 cerradas, ver [`scripts/perf/BASELINE.md`](../../scripts/perf/BASELINE.md)). Los dos hallazgos que siguen mandando: `renderSmart()` ya evita el recálculo cruzado, y guardar cuesta ~5 ms debounced, así que la persistencia NO se reescribió ([ADR 030](../DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md); sus disparadores del D4 quedaron acotados a dos, T1 y T2, por el [ADR 068](../DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md)). **Disciplina obligatoria de toda tarjeta PERF: correr `pnpm perf` antes y después y comparar contra BASELINE.md**, y `pnpm perf:fluidez` si la tarjeta toca CSS, modales, navegación o animaciones (PERF.11, 2026-10-28: lo que happy-dom no ve). PERF.13 a PERF.15 son lo que PERF.11 y PERF.12 midieron y no corrigieron; sus cifras son de ese instrumento (CPU 4x, 3.000 gastos).

> **Iniciativa "INT.1 - Interfaz de escritorio", completa** (ADR 059, aceptado 2026-08-02). Fuente única del chrome de escritorio, 8 decisiones en 8 rebanadas. Móvil no cambia. **Las ocho rebanadas cerradas** (INT.1a a INT.1h); detalle e historia en el CHANGELOG y [`contexto/escritorio.md`](../contexto/escritorio.md). **INT.1g cerró el 2026-08-12 sin tarjeta propia** (dentro de una sesión sobre MT.6a) y quedó sin documentar hasta la auditoría del 2026-08-17: su único caso real es el compromiso mensual de Fondo, en [`ahorro.md`](../contexto/ahorro.md). **Coordinar con AH.7a** (mismo marcado de nav, otra plataforma).

> **Diferida del [ADR 068](../DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md): la migración a IndexedDB (antes PERF.5) ya no es tarjeta.** Su decisión, su alcance fijado (blob-en-IDB, no store por colección) y sus **dos** disparadores verificables viven en ese ADR, que reemplaza los tres del ADR 030 D4. **No re-auditar el código ante un pedido de ejecución:** la verificación está hecha y fechada allí; basta mirar si T1 o T2 cambiaron de estado. Al reabrirse nace como tarjeta nueva. Lo que salió a la luz con ese ADR ya cerró completo: **PERF.9** (2026-08-14, columna de caracteres en el harness) y **PERF.10** (2026-08-14, dos rebanadas). T1 ya tiene instrumento: detalle en [`scripts/perf/BASELINE.md`](../../scripts/perf/BASELINE.md).

> **Iniciativa Dirección Visual premium** ([ADR 033](../DECISIONS/033-direccion-visual-premium.md)). DV.2a/b/c cerradas. DV.2d: infraestructura, 8 plantillas y cableado de `emptyArt()` listos (2026-08-14), falta solo el arte final de Esteban.

#### DEC.1 - Finko explica el porqué dentro de cada decisión
- Prioridad  : media
- Estado     : pendiente
- Área       : ambos
- Objetivo   : el conocimiento útil vuelve donde se decide, sin preguntas ni lecciones ([ADR 101](../DECISIONS/101-finko-del-adulto-decide-no-ensena.md) D5). Primeros lugares: repartir el ingreso, qué deuda pagar primero y un límite pasado; cada uno con su diseño y su ADR
- Riesgo     : volver a parecer un curso; la regla es una frase con el dato del usuario, nunca un cuestionario
- Secciones  : Mis cuentas (distribuir), Por pagar (estrategia), Límites
- Archivos   : `dominio/tesoreria/views/distribucion.js`, `dominio/compromisos/views/estrategia.js`, `dominio/presupuesto/view.js`
- Depende de : nada
- Aceptación : en cada lugar, la razón se lee sin salir de la decisión y con las cifras del usuario

#### MV2.2 - Finko móvil 2, segunda entrega
- Prioridad  : media
- Estado     : en proceso
- Área       : ambos
- Objetivo   : lo que la primera entrega ([ADR 098](../DECISIONS/098-finko-movil-2-primera-entrega.md)) dejó del plan MV2 por riesgo de composición. Queda: las tres lentes con un solo lenguaje visual (MV2.12), Distribuir dentro de Mis cuentas sin modal de pasos (MV2.19), una línea de estado por destino en "Más", los chips de dominio de Movimientos, que todavía desbordan a 390 (R9), y el resto del plan del canvas: peso de botones por dominio (R8), avisos sin borde lateral, primeros pasos en el teléfono, Ajustes como índice (insumo de CFG.6), la fila de Ingresos con hoja y el pie con el teclado de iOS
- Riesgo     : el asistente de distribución tiene ADR propio (080): cada pieza se acota con uno nuevo, nunca en silencio
- Secciones  : lentes de los bloques, bloque Gastos, Mis cuentas, menú Más, Movimientos
- Archivos   : `ui/bloque-gastos.js`, `ui/bloque-inicio.js`, `dominio/tesoreria/views/distribucion.js`, `index.html` (`#modal-mas`), `styles/responsive.css` (bloque MV2)
- Depende de : nada. El canvas "Finko móvil 2" (Claude Design) tiene los prototipos; manda el ADR que se escriba para cada pieza
- Aceptación : mismas medidas de la auditoría MV2 (primera pantalla, alto por escenario, 320 a 430 px, claro y oscuro) y escritorio sin cambios en E2E

#### PERF.13 - Arranque: 616 ms de hilo bloqueado
- Prioridad  : baja
- Estado     : pendiente
- Área       : code
- Objetivo   : el arranque bloquea 616 ms (cuadro más largo 547) y lo domina el layout del contenido (~410 ms), no el JS (~50 ms sin freno). PERF.11 descartó con medición los modales cerrados y la fuente Inter; falta saber qué se maqueta (ver si el `<use>` del sprite o las secciones pintadas al arrancar)
- Riesgo     : -
- Secciones  : arranque
- Archivos   : `ui/bootstrap.js`, `index.html`, `styles/`
- Depende de : nada
- Aceptación : `pnpm perf:fluidez`, bloqueo del arranque bajo 400 ms

#### PERF.14 - Pasar de una hoja a otra sin soltar el fondo
- Prioridad  : baja
- Estado     : pendiente
- Área       : code
- Objetivo   : Registrar → formulario de gasto (INP 136 tras PERF.12) cierra la hoja, quita `inert` y devuelve el foco antes de abrir el formulario: un recálculo de todo el fondo visible en el camino del toque. Pasar el trap y el `inert` de una hoja a la siguiente lo evita; hoy `a11y.js` guarda un solo trap (`_trapEl`)
- Riesgo     : foco que vuelve a un elemento oculto al cerrar el segundo modal
- Secciones  : hoja Registrar y sus destinos, `ir-a-crear-cuenta`
- Archivos   : `ui/modales.js`, `infra/a11y.js`, `ui/actions.js`
- Depende de : nada
- Aceptación : "form Gasto" bajo 120 ms de INP; test del foco de vuelta al botón Registrar

#### PERF.15 - Anotar solo lo que cambió antes de sincronizar
- Prioridad  : baja
- Estado     : pendiente
- Área       : code
- Objetivo   : la pasada que sigue a un guardado sigue huellando el estado entero: 27 ms con 3.000 gastos y 91 con 10.000 en Node (unas 4 veces más en un teléfono). `state:change` ya dice qué colección cambió
- Riesgo     : un cambio que no emite su sección no llega a la nube
- Secciones  : nube (solo con cuenta)
- Archivos   : `dominio/config/nube.js`, `infra/nube-sync.js`
- Depende de : nada
- Aceptación : test de que un cambio en una colección solo huella esa colección; pasada tras guardar bajo 10 ms a 3.000 gastos

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

> **Diferido del [ADR 040](../DECISIONS/040-navegacion-v2-visual.md), absorbido por HF.3e (2026-10-16):** badges de notificación en el nav. La pregunta que lo bloqueaba ("¿qué cuenta el badge?") la respondió el brief de HF: solo lo que requiere atención (avisos `urgente` y `alta` del motor único). El badge del nav y el del ícono de la PWA se deciden juntos en HF.3e.

---

## Iniciativa HF - Un hecho financiero se informa una sola vez

> Brief, triaje, choques con ADR vigentes, riesgos y preguntas P1 a P7 (**resueltas el 2026-10-16**): **[ADR 091](../DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)**. Fuente única de la iniciativa. Orden por dependencia técnica. **Convive con MOV.1 solo la Fase 0**: la Fase 1 espera a la ficha 18 y HF.3a a HF.3c al cierre de MOV.1. Todos los datos de prueba son inventados.

### Fase 0 - Base confiable (sin ADR, puede empezar ya)

#### HF.0f - Perfiles de regresión: constructores e invariantes
- Prioridad  : alta
- Estado     : en curso (2026-10-18). Banco construido y verificado en el árbol de trabajo, **sin commitear**: `tests/fixtures/{rutas,perfiles,invariantes}.js` y `tests/integration/perfiles{,-anual,-reversas}.test.js`, 165 de 173 verdes desde BUG-037. Las ocho rojas reproducen BUG-035, BUG-036 y BUG-038 ([`BUGS.md`](../BUGS.md)); no se cierra ni se commitea con la suite en rojo, y la corrección de esos errores no entra en HF.0f
- Área       : code (solo tests)
- Objetivo   : `tests/fixtures/perfiles.js` con tres perfiles deterministas (ligero: 1 cuenta; común: 2-3 cuentas, tarjeta, ahorro, transferencias; intensivo: 4-5 cuentas, metas, reservas, fondo, inversiones, préstamos, categorías, un año) construidos por las rutas reales de escritura, y una suite de invariantes: I1 a I5, R-HF1, R-HF2, reversas exactas, guardar y cargar, Movimientos sin duplicados, peso serializado
- Riesgo     : congelar como esperado un doble conteo vigente; por eso va después de HF.0d
- Secciones  : todas (sin runtime)
- Archivos   : `tests/fixtures/perfiles.js`, `tests/integration/perfiles.test.js`
- Depende de : nada
- Aceptación : la suite corre en `pnpm test` y falla si se reintroduce cualquiera de los bugs de doble conteo de la Fase 0
- Modelo     : Alta capacidad, Extra

#### HF.0g - Perfiles de regresión en E2E: navegación y destinos
- Prioridad  : media
- Estado     : pendiente
- Área       : code (solo tests)
- Objetivo   : sembrar cada perfil con `tests/e2e/helpers/estado.js`, recorrer las quince secciones, seguir los enlaces prefiltrados y comparar cifras clave contra la lógica, sin errores de consola
- Riesgo     : tiempo de la compuerta 5 (hoy ~3,5 min); medirlo
- Secciones  : todas
- Archivos   : `tests/e2e/perfiles.test.js`, `tests/e2e/helpers/estado.js`
- Depende de : HF.0f
- Aceptación : `pnpm run test:e2e` verde con la suite nueva
- Modelo     : Equilibrado, Alto

### Fase 1 - Modelo (no iniciar antes de cerrar la ficha 18 de MOV.1)

#### HF.1a - ADR: naturaleza del movimiento
- Estado : requiere ADR (dirección fijada por P2: el pago de obligación conserva su registro y deja de sumar como consumo). **Objetivo**: separar flujo de caja de significado (consumo, pago de obligación, transferencia propia, aporte a bolsa, inversión, préstamo y su cobro, ingreso, devolución, retiro de efectivo, ajuste, apunte de seguimiento), derivado de los registros actuales sin schema. Acota ADR 002 y 051 D3. **Dominios**: movimientos, analisis, presupuesto, ahorro. **Depende de**: ficha 18 (redacción final de R90). **Aceptación**: tabla de clasificación con un test por tipo.

#### HF.1b - Aplicar la naturaleza: nada se cuenta dos veces
- Estado : pendiente. **Objetivo**: tarjeta y abonos dejan de sumar como consumo en Análisis, Límites, tasa de ahorro y renta; el Fondo deja de salir como egreso en Movimientos. **Archivos**: `analisis/logic.js`, `presupuesto/logic.js`, `ahorro/index.js`, `movimientos/logic.js`. **Depende de**: HF.1a. **Aceptación**: perfil común, comprar 100 y pagar la tarjeta 100 da gasto del mes 100.

#### HF.1c - Historial fechado de aportes en Metas y Reservas
- Estado : requiere ADR, dueño ficha 18. **Objetivo**: `aportes[]` con id, fecha, monto y cuenta (schema v45: la v44 la tomó HF.0c; sin backfill: lo previo queda como saldo de apertura, I4); Movimientos gana sus fuentes 6 y 7; "Ya lo usé" registra el gasto (V5). **Archivos**: `core/state.js`, `core/storage.js`, `metas/`, `apartados/`, `movimientos/logic.js`. **Depende de**: ficha 18, HF.1a. **Aceptación**: migración idempotente con test y perfil intensivo.

#### HF.1d - Todo cambio de saldo deja registro
- Estado : requiere ADR (acota ADR 012). **Objetivo**: Distribuir crea el ingreso y las transferencias que hoy aplica sin registro; desembolso de préstamo, crédito D.14 y ajuste manual dejan su fila. Retira la guarda de HF.0h y HF.0i (`config.cobrosDistribuidos`): el `IngresoPuntual` de Distribuir la reemplaza solo para lo que el usuario confirmó como recibido, y la hoja tiene que descartarlo por ocurrencia, no por mes, o la segunda quincena distribuida deja de salir. **Archivos**: `tesoreria/acciones/distribucion.js`, `personales/index.js`, `compromisos/index.js`, `tesoreria/logic/cuentas.js`. **Depende de**: HF.1a. **Aceptación**: invariante R-HF2 verde en los tres perfiles.

#### HF.1e - Inversión: valor actual y cierre de posición
- Estado : requiere ADR, dueño ficha 18 (ADR 086). **Objetivo**: valor actual con fecha, liquidar devuelve a una cuenta elegida con su rendimiento, patrimonio usa el valor actual si existe (I4 para lo previo). **Archivos**: `inversiones/`, `infra/portafolio.js`, `analisis/logic.js`. **Depende de**: ficha 18. **Aceptación**: liquidar no cambia el patrimonio salvo el rendimiento.

#### HF.1g - Me deben: abono con id, borrar un abono, cobro de lo que era solo seguimiento
- Estado : pendiente. **Archivos**: `personales/`. **Depende de**: HF.1a. **Aceptación**: borrar un abono revierte la cuenta exacta.

### Fase 2 - Captura sin repetir (Finko Local)

#### HF.2a - Cuenta habitual derivada
- Estado : pendiente, sin ADR. **Objetivo**: "Marcar pagado" y el abono preseleccionan la última cuenta usada para ese compromiso, derivada de sus gastos (R-HF5, sin campo nuevo). **Archivos**: `infra/cuenta-helper.js`, `compromisos/index.js`, `agenda/index.js`. **Depende de**: nada.

#### HF.2b - Débito automático en riesgo
- Estado : pendiente (PA.1c ampliada, nota al ADR 052). **Objetivo**: aviso `debito-sin-saldo` para débitos próximos, no solo vencidos; estados derivados de solo lectura (esperado, sin saldo, registrado). **Archivos**: `infra/avisos.js`, `agenda/logic.js`. **Depende de**: nada.

#### HF.2c - Gasto recurrente sugiere un pago fijo
- Estado : requiere ADR corto. **Objetivo**: misma marca o categoría, monto parecido y cadencia mensual en tres meses o más, sin `compromisoId`: Por pagar ofrece convertirlo. **Archivos**: `gastos/logic.js`, `infra/marcas.js`, `compromisos/views/`. **Depende de**: HF.1a.

#### HF.2d - Completitud de datos sin juicio
- Estado : requiere ADR. **Objetivo**: distinguir "no gastaste" de "no tenemos datos" (vigencia por cuenta y por periodo), sin puntaje. **Depende de**: HF.1d, ficha 18 (R88).

### Fase 3 - Calendario planificador y avisos (Finko Local)

#### HF.3a - ADR: Calendario planificador (Hoy, Próximos, Mes)
- Estado : requiere ADR (acota ADR 081 D2; P5 fijó que vuelven solo "Marcar pagado" y "Registrar abono"). **Objetivo**: tres vistas, prioridad derivada (urgente, importante, próximo, informativo) mapeada a las severidades del ADR 066, acciones directas solo por `pago-compromiso`. **Depende de**: cierre de MOV.1 (K5 en ficha 18).

#### HF.3b - "Antes de tu próximo ingreso" (lógica pura)
- Estado : pendiente (dentro de HF.3a). **Objetivo**: disponible (sin cupo de tarjeta, I5) menos pagos en ventana menos aportes planeados; reusa `obligacionesYAportesDelCobro().enVentana`. **Archivos**: `infra/vencimientos.js`, `agenda/logic.js`. **Depende de**: HF.3a.

#### HF.3c - Vista Próximos con su bloque de suficiencia
- Estado : pendiente. **Archivos**: `agenda/view.js`, `styles/components/config.css`. **Depende de**: HF.3a, HF.3b. **Aceptación**: evidencia visual a 375px y escritorio.

#### HF.3d - Posponer un aviso sin mover la fecha real
- Estado : pendiente (nota al ADR 066). **Objetivo**: `config.avisosPospuestos` (schema), filtro en el motor. **Depende de**: nada.

#### HF.3e - Badge de la PWA y del nav
- Estado : pendiente (nota al ADR 066; absorbe el diferido del ADR 040). **Objetivo**: `navigator.setAppBadge(n)` con los avisos `urgente` y `alta` tras preferencias, al abrir, en `state:change` y `visibilitychange`; se limpia en cero. **Depende de**: nada.

#### HF.3f - Rutas profundas, shortcuts y notificación que abre el elemento
- Estado : requiere ADR corto (convención de ruta). **Objetivo**: el router acepta un destino de elemento; `manifest.json` gana shortcuts (Hoy, Por pagar, Registrar gasto, Registrar ingreso); el SW gana `notificationclick`. **Archivos**: `infra/router.js`, `manifest.json`, `service-worker.js`, `infra/notificaciones.js`.

#### HF.3g - Privacidad de la notificación del sistema
- Estado : requiere ADR corto (acota 063 y 066). **Objetivo**: con candado activo, la notificación no nombra ni muestra montos; respeta `ocultarSaldo`; niveles privado, normal, detallado. **Archivos**: `infra/notificaciones.js`, `ui/bootstrap.js`, `config/`. **Depende de**: nada (elegible en cualquier momento).

### Fase 4 - Movimientos externos (Finko Local, modelo antes que fuentes)

#### HF.4a - ADR: movimiento externo y conciliación
- Estado : requiere ADR. **Objetivo**: entidad (id, fuente, producto, id externo, fecha, monto, dirección, descripción original, estado bancario, estado de conciliación pendiente, vinculado o ignorado, sugerencia, confianza, vínculo), clave de deduplicación, R-HF4, retención y compactación, presupuesto de cupo (T1). **Depende de**: HF.1a, HF.1d, HF.0f.

#### HF.4b - Colección y motor de conciliación puro
- Estado : pendiente. **Objetivo**: migración, motor sin UI, columna nueva en el harness de perf. **Depende de**: HF.4a.

#### HF.4c - Bandeja "Finko necesita tu ayuda"
- Estado : pendiente. **Objetivo**: confirmar aplica las consecuencias una vez por las rutas de dominio existentes. No mezcla con el Calendario. **Depende de**: HF.4b.

#### HF.4d - Fuente local: extracto CSV del banco
- Estado : pendiente. **Objetivo**: importador nuevo hacia movimientos externos, separado del de gastos; comparte `infra/csv.js`. **Depende de**: HF.4b.

#### HF.4e - Aprender categoría por descripción
- Estado : requiere ADR (R-HF6). **Objetivo**: reglas confirmadas, sugerencia, y tras confirmaciones repetidas la oferta de automatizar, revocable en Ajustes. **Depende de**: HF.4b.

#### HF.4f - Fuente local: compartir texto
- Estado : requiere ADR. **Objetivo**: Web Share Target hacia movimiento externo pendiente. El PDF quedó diferido por P7 y vuelve con su propio ADR si se retoma. **Depende de**: HF.4d.

### Fase 5 - Finko Conectado

#### HF.5a - ADR: Finko Conectado
- Estado : no iniciar (P6: hasta cerrar la Fase 4 con uso real). **Objetivo**: decidir Open Finance, correo y push. Exige derogar ADN 3, ADR 043 D1 y D4 y ADR 066 D1. **Depende de**: Fase 4 cerrada con uso real.

---

## Iniciativa APR - Aprende y aplícalo

> Handoff de Claude Design "Finko · Aprende y aplícalo" (35 tableros, octubre 2026), triado el 2026-10-24. Fuente única: **[ADR 092](../DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md)**. **Desde el [ADR 101](../DECISIONS/101-finko-del-adulto-decide-no-ensena.md) la capa es solo del niño**: el adulto no ve Aprende ni Tu progreso (capa de aprendizaje del adulto) y **[ADR 093](../DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md)** (perfiles, modo niño y tutor), los dos en Propuesta. **La Fase 1 (APR.1a a APR.1d) cerró el 2026-10-24** sin esperar a las fichas 17 y 19 de MOV.1 (decisión en chat, resolución al final del ADR 092); cada rebanada se sube a `main` al cerrar. Las catorce dudas del handoff quedaron resueltas por defecto con la propuesta del diseño; **P1 del ADR 093** ("Olvidé mi PIN" con niños) se resolvió el 2026-10-24 con su recomendación. La GU.1 (guía por navegación) sigue dueña de banners y hints: esta iniciativa no los toca. DV.2d conserva su lote; el catálogo de ilustraciones del niño entra por su mismo pipeline.

### Fase 3 - Perfiles, niño y tutor (ADR 093)

#### APR.3f - Contenido del niño
- Estado : escritas las ocho unidades y la ubicación desde los 10 años (2026-10-25), con un test que mide la voz del ADR 093 D6. **Falta la revisión pedagógica registrada**, que es la aceptación. **Modelo**: Equilibrado, Alto.

### Fase 5 - Tino, el guatín ([ADR 094](../DECISIONS/094-tino-el-guatin.md) y [ADR 095](../DECISIONS/095-tino-en-el-sprite.md))

#### APR.5b - La ronda 2 de Tino y los hitos del niño
- Estado : espera los dibujos de la ronda 2; entran por el conversor que vive junto a los dibujos fuente (095 D4), con el tope de 16 KB por pose. **Objetivo**: sembrar, compartir, reserva y pensando en sus pantallas; hitos del niño (meta cumplida y ruta terminada, con el confeti que ya existe). **Modelo**: Equilibrado, Medio.

---

## Iniciativa NUBE - Finko en la nube con Supabase

> Decisión, las cuatro razones del ADR 043 revisadas, seguridad y Ley 1581: **[ADR 096](../DECISIONS/096-finko-en-la-nube-con-supabase.md)**, fuente única, con su resolución en implementación. Cuenta opcional, copia local que manda (offline-first intacto). **NUBE.0 a NUBE.2 cerradas el 2026-10-27; NUBE.2b y NUBE.3 el 2026-10-28** (MOV.1 en pausa por decisión en chat): proyecto `finko-prueba` en São Paulo, cuenta por correo solo para invitados, sincronización por registro entre dispositivos, borrar la cuenta completa y el teléfono del niño vinculado con un código del padre; detalle en [`contexto/nube.md`](../contexto/nube.md). **Pendiente del dueño de la cuenta**: SMTP propio en Supabase para que el correo de acceso llegue a los probadores. Plan gratis mientras Finko es de prueba; plan pago antes de abrir cuentas a personas fuera del grupo de prueba.

#### NUBE.4 - Bancos
- Estado : no iniciar; pide su propio ADR (finanzas abiertas en Colombia).

