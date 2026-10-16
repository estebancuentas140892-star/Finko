# Tablero - Transversal

> Revisado: 2026-10-16.

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

> **Diferido del [ADR 040](../DECISIONS/040-navegacion-v2-visual.md), absorbido por HF.3e (2026-10-16):** badges de notificación en el nav. La pregunta que lo bloqueaba ("¿qué cuenta el badge?") la respondió el brief de HF: solo lo que requiere atención (avisos `urgente` y `alta` del motor único). El badge del nav y el del ícono de la PWA se deciden juntos en HF.3e.

---

## Iniciativa HF - Un hecho financiero se informa una sola vez

> Brief, triaje, choques con ADR vigentes, riesgos y preguntas P1 a P7: **[ADR 091](../DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)** (Propuesta, 2026-10-16). Fuente única de la iniciativa. Orden por dependencia técnica. **Convive con MOV.1 solo la Fase 0**: la Fase 1 espera a la ficha 18 y HF.3a a HF.3c al cierre de MOV.1. Todos los datos de prueba son inventados.

### Fase 0 - Base confiable (sin ADR, puede empezar ya)

#### HF.0b - Distribuir no reacredita un salario ya acreditado (BUG-030)
- Prioridad  : alta
- Estado     : pendiente
- Área       : code
- Objetivo   : si el cobro del periodo ya entró como `IngresoPuntual` con `ingresoId` (crédito automático) o como ingreso puntual equivalente, Distribuir reparte desde el saldo sin volver a sumar el ingreso
- Riesgo     : saldo inflado en producción hoy; un arreglo que no acredite nunca dejaría cuentas cortas
- Secciones  : Mis cuentas (Distribuir), Calendario (hoja de automáticos), Inicio
- Archivos   : `modules/dominio/tesoreria/logic/distribucion.js`, `tesoreria/acciones/distribucion.js`, `tesoreria/views/distribucion.js`, tests de tesorería
- Depende de : nada
- Aceptación : test "crédito automático confirmado + Distribuir = un solo crédito"; verificación en la app con un perfil inventado
- Modelo     : Alta capacidad, Alto

#### HF.0c - El importador CSV de gastos no crea dinero (BUG-029)
- Prioridad  : alta
- Estado     : requiere decisión (P4 del ADR 091)
- Área       : code
- Objetivo   : importar y borrar deja el saldo igual (recomendado: el gasto importado se marca sin efecto en saldo) y el CSV exportado se puede reimportar
- Riesgo     : restaurar historia restando dos veces si se elige descontar
- Secciones  : Ajustes (importar), Gastos, Mis cuentas
- Archivos   : `modules/dominio/import/logic.js`, `import/index.js`, `modules/dominio/gastos/index.js`, `modules/dominio/export/logic.js`, tests
- Depende de : P4
- Aceptación : test importar + borrar = saldo intacto; test exportar e importar ida y vuelta
- Modelo     : Equilibrado, Medio

#### HF.0d - Una sola regla de vencimiento para avisos, Inicio y Por pagar (BUG-031)
- Prioridad  : media
- Estado     : pendiente
- Área       : code
- Objetivo   : "compromiso próximo" fecha con `infra/vencimientos.js` (frecuencia real, como el Calendario) y descarta lo ya pagado en el ciclo. Aplica el ADR 041, no lo cambia
- Riesgo     : cambia qué ve Inicio para quincenales y bimestrales (hoy está mal, pero es lo que el usuario ve)
- Secciones  : Inicio, Por pagar, avisos, notificación
- Archivos   : `compromisos/logic/modelo.js`, `compromisos/logic/alertas.js`, `compromisos/views/dashboard.js`, `compromisos/views/lista.js`, `infra/avisos.js`
- Depende de : nada
- Aceptación : tests de quincenal y bimestral con la misma fecha en Calendario, Inicio y avisos; pago adelantado no avisa
- Modelo     : Alta capacidad, Alto

#### HF.0e - `fechaCreacion` se lee como fecha local (BUG-025)
- Prioridad  : media
- Estado     : requiere decisión (P3 del ADR 091)
- Área       : code
- Objetivo   : un helper único en `infra/utils.js` convierte el instante ISO a fecha local; lo usan todos los lectores (incluido `infra/bolsas.js`, que el bug no listaba)
- Riesgo     : cambia lo que el Calendario pinta para registros nocturnos
- Secciones  : Por pagar, Calendario, Mis cuentas (asistente), Reservas
- Archivos   : `modules/infra/utils.js`, `infra/vencimientos.js`, `infra/bolsas.js`, `tesoreria/logic/distribucion.js`, `compromisos/logic/alertas.js`
- Depende de : P3
- Aceptación : tests con reloj fijo a las 20:00 hora Colombia
- Modelo     : Equilibrado, Alto

#### HF.0f - Perfiles de regresión: constructores e invariantes
- Prioridad  : alta
- Estado     : pendiente
- Área       : code (solo tests)
- Objetivo   : `tests/fixtures/perfiles.js` con tres perfiles deterministas (ligero: 1 cuenta; común: 2-3 cuentas, tarjeta, ahorro, transferencias; intensivo: 4-5 cuentas, metas, reservas, fondo, inversiones, préstamos, categorías, un año) construidos por las rutas reales de escritura, y una suite de invariantes: I1 a I5, R-HF1, R-HF2, reversas exactas, guardar y cargar, Movimientos sin duplicados, peso serializado
- Riesgo     : congelar como esperado un doble conteo vigente; por eso va después de HF.0b a HF.0d
- Secciones  : todas (sin runtime)
- Archivos   : `tests/fixtures/perfiles.js`, `tests/integration/perfiles.test.js`
- Depende de : HF.0b, HF.0c, HF.0d
- Aceptación : la suite corre en `pnpm test` y falla si se reintroduce cualquiera de los tres bugs
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
- Estado : requiere ADR (P2). **Objetivo**: separar flujo de caja de significado (consumo, pago de obligación, transferencia propia, aporte a bolsa, inversión, préstamo y su cobro, ingreso, devolución, retiro de efectivo, ajuste, apunte de seguimiento), derivado de los registros actuales sin schema. Acota ADR 002 y 051 D3. **Dominios**: movimientos, analisis, presupuesto, ahorro. **Depende de**: ficha 18 (redacción final de R90). **Aceptación**: tabla de clasificación con un test por tipo.

#### HF.1b - Aplicar la naturaleza: nada se cuenta dos veces
- Estado : pendiente. **Objetivo**: tarjeta y abonos dejan de sumar como consumo en Análisis, Límites, tasa de ahorro y renta; el Fondo deja de salir como egreso en Movimientos. **Archivos**: `analisis/logic.js`, `presupuesto/logic.js`, `ahorro/index.js`, `movimientos/logic.js`. **Depende de**: HF.1a. **Aceptación**: perfil común, comprar 100 y pagar la tarjeta 100 da gasto del mes 100.

#### HF.1c - Historial fechado de aportes en Metas y Reservas
- Estado : requiere ADR, dueño ficha 18. **Objetivo**: `aportes[]` con id, fecha, monto y cuenta (schema v44, sin backfill: lo previo queda como saldo de apertura, I4); Movimientos gana sus fuentes 6 y 7; "Ya lo usé" registra el gasto (V5). **Archivos**: `core/state.js`, `core/storage.js`, `metas/`, `apartados/`, `movimientos/logic.js`. **Depende de**: ficha 18, HF.1a. **Aceptación**: migración idempotente con test y perfil intensivo.

#### HF.1d - Todo cambio de saldo deja registro
- Estado : requiere ADR (acota ADR 012). **Objetivo**: Distribuir crea el ingreso y las transferencias que hoy aplica sin registro; desembolso de préstamo, crédito D.14 y ajuste manual dejan su fila. **Archivos**: `tesoreria/acciones/distribucion.js`, `personales/index.js`, `compromisos/index.js`, `tesoreria/logic/cuentas.js`. **Depende de**: HF.1a. **Aceptación**: invariante R-HF2 verde en los tres perfiles.

#### HF.1e - Inversión: valor actual y cierre de posición
- Estado : requiere ADR, dueño ficha 18 (ADR 086). **Objetivo**: valor actual con fecha, liquidar devuelve a una cuenta elegida con su rendimiento, patrimonio usa el valor actual si existe (I4 para lo previo). **Archivos**: `inversiones/`, `infra/portafolio.js`, `analisis/logic.js`. **Depende de**: ficha 18. **Aceptación**: liquidar no cambia el patrimonio salvo el rendimiento.

#### HF.1f - Fondo y origen del dinero
- Estado : requiere decisión (P1). Recomendación: conservar el ADR 020; sin código salvo HF.1b. ADR nuevo solo si Esteban elige descontar, y entonces con su flujo de retiro.

#### HF.1g - Me deben: abono con id, borrar un abono, cobro de lo que era solo seguimiento
- Estado : pendiente. **Archivos**: `personales/`. **Depende de**: HF.1a. **Aceptación**: borrar un abono revierte la cuenta exacta.

### Fase 2 - Captura sin repetir (Finko Local)

#### HF.2a - Cuenta habitual derivada
- Estado : pendiente, sin ADR. **Objetivo**: "Marcar pagado" y el abono preseleccionan la última cuenta usada para ese compromiso, derivada de sus gastos (R-HF5, sin campo nuevo). **Archivos**: `infra/cuenta-helper.js`, `compromisos/index.js`, `agenda/index.js`. **Depende de**: HF.0d.

#### HF.2b - Débito automático en riesgo
- Estado : pendiente (PA.1c ampliada, nota al ADR 052). **Objetivo**: aviso `debito-sin-saldo` para débitos próximos, no solo vencidos; estados derivados de solo lectura (esperado, sin saldo, registrado). **Archivos**: `infra/avisos.js`, `agenda/logic.js`. **Depende de**: HF.0d.

#### HF.2c - Gasto recurrente sugiere un pago fijo
- Estado : requiere ADR corto. **Objetivo**: misma marca o categoría, monto parecido y cadencia mensual en tres meses o más, sin `compromisoId`: Por pagar ofrece convertirlo. **Archivos**: `gastos/logic.js`, `infra/marcas.js`, `compromisos/views/`. **Depende de**: HF.0e, HF.1a.

#### HF.2d - Completitud de datos sin juicio
- Estado : requiere ADR. **Objetivo**: distinguir "no gastaste" de "no tenemos datos" (vigencia por cuenta y por periodo), sin puntaje. **Depende de**: HF.1d, ficha 18 (R88).

### Fase 3 - Calendario planificador y avisos (Finko Local)

#### HF.3a - ADR: Calendario planificador (Hoy, Próximos, Mes)
- Estado : requiere ADR (P5, acota ADR 081 D2). **Objetivo**: tres vistas, prioridad derivada (urgente, importante, próximo, informativo) mapeada a las severidades del ADR 066, acciones directas solo por `pago-compromiso`. **Depende de**: cierre de MOV.1 (K5 en ficha 18), HF.0d.

#### HF.3b - "Antes de tu próximo ingreso" (lógica pura)
- Estado : pendiente (dentro de HF.3a). **Objetivo**: disponible (sin cupo de tarjeta, I5) menos pagos en ventana menos aportes planeados; reusa `obligacionesYAportesDelCobro().enVentana`. **Archivos**: `infra/vencimientos.js`, `agenda/logic.js`. **Depende de**: HF.3a.

#### HF.3c - Vista Próximos con su bloque de suficiencia
- Estado : pendiente. **Archivos**: `agenda/view.js`, `styles/components/config.css`. **Depende de**: HF.3a, HF.3b. **Aceptación**: evidencia visual a 375px y escritorio.

#### HF.3d - Posponer un aviso sin mover la fecha real
- Estado : pendiente (nota al ADR 066). **Objetivo**: `config.avisosPospuestos` (schema), filtro en el motor. **Depende de**: nada.

#### HF.3e - Badge de la PWA y del nav
- Estado : pendiente (nota al ADR 066; absorbe el diferido del ADR 040). **Objetivo**: `navigator.setAppBadge(n)` con los avisos `urgente` y `alta` tras preferencias, al abrir, en `state:change` y `visibilitychange`; se limpia en cero. **Depende de**: HF.0d.

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

#### HF.4f - Fuentes locales: compartir texto y PDF
- Estado : requiere ADR (P7). **Objetivo**: Web Share Target hacia movimiento externo pendiente; PDF con contraseña solo en memoria. **Depende de**: HF.4d.

### Fase 5 - Finko Conectado

#### HF.5a - ADR: Finko Conectado
- Estado : no iniciar (P6). **Objetivo**: decidir Open Finance, correo y push. Exige derogar ADN 3, ADR 043 D1 y D4 y ADR 066 D1. **Depende de**: Fase 4 cerrada con uso real.
