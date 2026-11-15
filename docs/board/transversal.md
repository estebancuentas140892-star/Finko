# Tablero - Transversal

> Revisado: 2026-11-14.

> Satélite de [`BOARD.md`](../BOARD.md) (afecta varias secciones). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

> **Poda del 2026-11-13 ([ADR 138](../DECISIONS/138-la-poda-del-tablero-del-13-de-noviembre.md)).** Quedó lo que corrige una cifra que el usuario lee o algo que le estorba. Lo que salió (REV.4, REV.5 absorbida, DEC.1, DV.2d, PERF.13 a PERF.15, 18 rebanadas de HF, APR.3f) y por qué vive en ese ADR, no acá: **una idea que coincida con una de ellas se contrasta primero con el 138.**

---

## Transversal (afecta varias secciones)

> **Auditoría de rendimiento 2026-07 completa** (PERF.0 a PERF.4 cerradas, ver [`scripts/perf/BASELINE.md`](../../scripts/perf/BASELINE.md)). Los dos hallazgos que siguen mandando: `renderSmart()` ya evita el recálculo cruzado, y guardar cuesta ~5 ms debounced, así que la persistencia NO se reescribió ([ADR 030](../DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md); sus disparadores del D4 quedaron acotados a dos, T1 y T2, por el [ADR 068](../DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md)). **Disciplina obligatoria de toda tarjeta PERF: correr `pnpm perf` antes y después y comparar contra BASELINE.md**, y `pnpm perf:fluidez` si la tarjeta toca CSS, modales, navegación o animaciones (PERF.11, 2026-10-28: lo que happy-dom no ve). Lo que PERF.11 y PERF.12 midieron y no corrigieron (PERF.13 a PERF.15) salió con el ADR 138 D4: el arranque quedó como umbral de MV2.28, y lo demás ya estaba bajo lo que se nota. Sus cifras son de ese instrumento (CPU 4x, 3.000 gastos).

> **Iniciativa "INT.1 - Interfaz de escritorio", completa** (ADR 059, aceptado 2026-08-02). Fuente única del chrome de escritorio, 8 decisiones en 8 rebanadas. Móvil no cambia. **Las ocho rebanadas cerradas** (INT.1a a INT.1h); detalle e historia en el CHANGELOG y [`contexto/escritorio.md`](../contexto/escritorio.md). **INT.1g cerró el 2026-08-12 sin tarjeta propia** (dentro de una sesión sobre MT.6a) y quedó sin documentar hasta la auditoría del 2026-08-17: su único caso real es el compromiso mensual de Fondo, en [`ahorro.md`](../contexto/ahorro.md). **Coordinar con AH.7a** (mismo marcado de nav, otra plataforma).

> **Diferida del [ADR 068](../DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md): la migración a IndexedDB (antes PERF.5) ya no es tarjeta.** Su decisión, su alcance fijado (blob-en-IDB, no store por colección) y sus **dos** disparadores verificables viven en ese ADR, que reemplaza los tres del ADR 030 D4. **No re-auditar el código ante un pedido de ejecución:** la verificación está hecha y fechada allí; basta mirar si T1 o T2 cambiaron de estado. Al reabrirse nace como tarjeta nueva. Lo que salió a la luz con ese ADR ya cerró completo: **PERF.9** (2026-08-14, columna de caracteres en el harness) y **PERF.10** (2026-08-14, dos rebanadas). T1 ya tiene instrumento: detalle en [`scripts/perf/BASELINE.md`](../../scripts/perf/BASELINE.md).

> **Iniciativa Dirección Visual premium** ([ADR 033](../DECISIONS/033-direccion-visual-premium.md)), cerrada. DV.2d salió con el ADR 138 D4: Tino explica los vacíos. Los ocho dibujos de muestra de `assets/svg/ilustraciones/` y la rama `il-` de `emptyArt()` se pueden borrar como limpieza de paso.

> **Iniciativa REV, la revisión de Esteban del 2026-11-13** (14 puntos en Registro, Inicio, Deudas, Movimientos y General). La tanda 1 cerró con el [ADR 137](../DECISIONS/137-revision-del-13-de-noviembre-tanda-1.md); el ADR 138 D3 recortó lo que quedaba. "Pagar desde varias cuentas" no genera tarjeta: ya existe y se deja así (registra lo que pasa en el banco, un débito por cuenta). **El ojo sigue siendo uno solo** (REV.4 descartada, ADR 106 D3).

#### REV.3a - Descargar el mes para Excel
- Prioridad  : media
- Estado     : pendiente (reducida por el ADR 138 D3: sin hoja de extracto ni PDF)
- Área       : code
- Objetivo   : "Descargar el mes para Excel" desde el mes de Movimientos: CSV con `;`, BOM y columnas Fecha, Descripción, Categoría, Cuenta, Entrada y Salida, con todo lo que la lista de ese mes muestra. Reemplaza "Exportar gastos a Excel" de Ajustes, que hoy lleva solo gastos
- Riesgo     : sin librerías nuevas (`docs/SECURITY.md`); el CSV de gastos que alimenta "Importar gastos" no puede romperse: si el formato nuevo no sirve para reimportar, Ajustes conserva el viejo
- Archivos   : `modules/dominio/movimientos/logic.js`, su vista, `modules/infra/csv.js`, `modules/dominio/config/index.js` y `view.js`
- Depende de : nada
- Aceptación : el CSV de un mes suma lo mismo que la lista de Movimientos de ese mes y abre en columnas en Excel

#### REV.3b - La app instalada tiene tus datos y la versión publicada
- Prioridad  : alta
- Estado     : pendiente (absorbe REV.5, ADR 138 D3): primero una prueba en un iPhone real y los datos del teléfono de Esteban
- Área       : ambos
- Objetivo   : (1) en iOS la app instalada no comparte `localStorage` con Safari: quien se registra en Safari e instala abre una app vacía. Ofrecer instalar antes del registro en iOS, o avisarlo en el modal; además el iPad no se detecta (`_esIOS()`), los pasos suponen Safari con Compartir abajo y no se detecta el navegador de otra app. (2) El 2026-11-13 producción servía la v693 completa y el aviso "Hay una versión nueva" se pinta bien, pero el teléfono de Esteban seguía en la vieja. Faltan: el número de Acerca de Finko (`1.0.0 (NNN)`), el mensaje de "Buscar actualización", iPhone o Android y desde qué dirección está instalada (si no es finko-brown.vercel.app, no recibe lo que se publica)
- Archivos   : `modules/ui/install-prompt.js`, `index.html` (`#modal-install-ios`), `modules/ui/onboarding.js`, `modules/infra/sw-register.js`, `modules/infra/actualizacion.js`, `modules/ui/sw-aviso.js`, `service-worker.js`
- Depende de : la prueba en el iPhone y esos datos
- Aceptación : en un iPhone, quien instala Finko encuentra sus datos (o fue avisado antes de registrarse), y en el teléfono de Esteban Acerca de Finko muestra la versión publicada. En la misma prueba: el modo escritura de FORM.2a (con el teclado abierto en Nueva deuda se ven la pregunta, el campo, su ayuda y el botón; la ✕ no queda bajo la hora en la app instalada) y el campo sobre el teclado de REV.2b

> **Iniciativa FORM.2 - Formularios por tarea** ([ADR 142](../DECISIONS/142-formularios-por-tarea.md), aceptada 2026-11-14). Fuente única de todo cambio de forma en los formularios del teléfono: cuatro tareas (mover dinero, crear, corregir, ajustes), la regla para elegir cada control y el teclado de Finko. Diseño en el canvas "Finko · Rediseño de formularios móviles", página "Propuesta por tarea"; manda el ADR. Escritorio no cambia. **Una idea sobre cualquier formulario se integra acá, no abre tarjeta suelta.**

#### FORM.2h - Ajustes con mini-hojas y lo que quedó de D9 y D10
- Prioridad  : baja
- Estado     : pendiente
- Área       : ambos
- Objetivo   : ADR 142 D7 (Tu nombre, Tu perfil y el candado como lista con su valor y una mini-hoja), D10 (la ayuda de la tasa en una mini-hoja con Tino, "Primero necesitas una cuenta" con Tino pensando) y D9 (la tasa muy alta deja de bloquear y pasa a aviso ámbar con su salida; cambia `validarCompromiso`). El banco de Nueva cuenta con buscador (142 D2). Cierra la iniciativa
- Archivos   : `config/view.js`, `ui/mini-hoja.js`, `compromisos/logic/modelo.js` y su vista, `tesoreria/views/cuentas.js`
- Depende de : nada
- Aceptación : E2E a 390 px de cambiar el nombre en Ajustes desde su mini-hoja, y de guardar una deuda con tasa alta después del aviso

#### MV2.28 - Medir lo publicado: fluidez y Lighthouse en producción
- Prioridad  : media
- Estado     : pendiente. (b) y (d) hechas; (c) pasó a REV.2b; absorbe PERF.13 como umbral (ADR 138 D4)
- Área       : code
- Objetivo   : `pnpm perf:fluidez` contra las cifras de PERF.11 y PERF.12 en `scripts/perf/BASELINE.md` (el INP de abrir una hoja y de cambiar de sección no empeora; el arranque, hoy 616 ms bloqueados con CPU 4x, baja de 400) y `pnpm lighthouse` en 100. Se abre un arreglo solo para lo que pase de su umbral. **No va**: "N gastos · $X en {mes}" sobre la lista filtrada de Gastos (descartado en el ADR 122)
- Riesgo     : una hoja más lenta tras la agarradera o los pies fijos; ya está en producción, así que si empeoró se corrige de inmediato
- Secciones  : todas las hojas, arranque
- Archivos   : `scripts/perf/fluidez.js`, `scripts/lighthouse.js`, `scripts/perf/BASELINE.md`
- Depende de : nada
- Aceptación : cifras antes y después en BASELINE.md
- Modelo     : capacidad estándar, esfuerzo bajo

> **IV.4 - Iconografía dirigida post-color, cerrada 2026-08-15.** Metáfora de movimiento en los dos iconos que el triaje del 2026-07-08 señaló como ilegibles: Avalancha (`i-mountain`) cambia el punto estático del pico por un trazo desnudo de dos golpes cortos + la chispa al final del recorrido (cae por la ladera, no se queda arriba); Bola de nieve (`i-snowball`) suma un arco de rastro (trazo desnudo, mismo patrón que la puerta de `i-home`) detrás del círculo chico. Se descartó el boceto de 3 chispas en cascada del 2026-08-14 por violar la regla 3 del ADR 023 (un solo punto de valor); la solución final conserva un único `circle` de chispa. Esteban delegó la decisión final ("toma tú las decisiones") en vez de esperar el dibujo en Illustrator: geometría verificada por bbox (sin composición visual real en esta sesión, mismo límite que el 2026-08-14). `assets/svg/iconos/simbolos/mountain.svg` + `snowball.svg`, sprite de `index.html`.

> **Iniciativa CAT: taxonomía + picker de ícono compartido, completa.** Fuente única para categorías entre secciones. CAT.1, CAT.2, CAT.3 y CAT.4 cerradas (reglas heredadas en [`contexto/categorias.md`](../contexto/categorias.md), bloque "Categorías personalizadas del usuario").

> **Iniciativa GU.1: guía por navegación (aprender usando, no leyendo)** (6.º lote, 2026-07-08, brief General puntos 4+5). **GU.1a cerrada (2026-08-03):** [ADR 016](../DECISIONS/016-banner-proposito-de-seccion.md) auditado y vigente sin desviaciones; detalle en [`contexto/transversal.md`](../contexto/transversal.md). **Regla anti-doble-trabajo:** GU.1 define el principio y audita el sistema transversal (banners, hints); los rediseños internos de cada sección viven en sus iniciativas v2, que aplican este principio en vez de duplicarlo.

> **Iniciativa LEG: Centro Legal y cumplimiento.** El paquete, su estado por documento y el checklist de datos pendientes viven en [`legal/README.md`](../legal/README.md), su dueño. **LEG.1** (Centro Legal, borradores + UI) y **LEG.2** (aceptación obligatoria versionada, onboarding + gate de re-aceptación) cerradas, detalle en [`contexto/transversal.md`](../contexto/transversal.md) y el CHANGELOG. El checklist de contenido (responsable, contacto, licencia, revisión de abogado colombiano) sigue abierto y bloquea el paso del paquete a v1.0, no el mecanismo de aceptación, que ya corre sobre la versión vigente. La revisión del abogado es trabajo profesional externo, no una tarea de código.

> **Iniciativa LG.2: Logros v2, gamificación de hábitos, completa.** Alcance, regla anti-gaming y catálogo: **[ADR 032](../DECISIONS/032-logros-v2-niveles-y-habitos.md)** (Aceptada). **LG.2d cerró el 2026-08-13** (mudanza a "Tu progreso" en Análisis + tarjeta en Inicio): el [ADR 022](../DECISIONS/022-vitrina-de-logros-en-ajustes.md) pasa a Superada, ver [`contexto/logros.md`](../contexto/logros.md). Los dos logros diferidos por datos (`ahorro-creciente`, `pagador-puntual`) NO son tarjeta: su verificación y condición de reapertura viven en el ADR 032, sección "Resolución de LG.2e en implementación". Nombres de niveles de usuario siguen provisionales hasta que Esteban entregue los definitivos (cambiarlos no toca datos).

> **Iniciativa "PA.1 - Pagos y créditos automáticos" completa** ([ADR 052](../DECISIONS/052-pagos-automaticos.md) D1-D4, Aceptada). PA.1a (débito de compromisos) cerró 2026-08-13 y PA.1b (crédito del ingreso fijo, misma hoja `#modal-automaticos`) cerró 2026-08-14. Detalle en [`contexto/calendario.md`](../contexto/calendario.md). Queda **PA.1c**, opcional y sin tarjeta (llevar el aviso de "sin cuenta"/"sin saldo" al motor único de CFG.3, ya cerrado): se re-expande a tarjeta si Esteban la retoma.

> **Diferido del [ADR 040](../DECISIONS/040-navegacion-v2-visual.md), absorbido por HF.3e (2026-10-16):** badges de notificación en el nav. La pregunta que lo bloqueaba ("¿qué cuenta el badge?") la respondió el brief de HF: solo lo que requiere atención (avisos `urgente` y `alta` del motor único). El badge del nav y el del ícono de la PWA se deciden juntos en HF.3e.

---

## Iniciativa HF - Un hecho financiero se informa una sola vez

> Brief, triaje, riesgos y preguntas P1 a P8 (resueltas): **[ADR 091](../DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)**. El [ADR 138](../DECISIONS/138-la-poda-del-tablero-del-13-de-noviembre.md) D2 dejó el plan en seis tarjetas: **ninguna espera ya a la ficha 18 ni al cierre de MOV.1**. **HF.1b cerró el 2026-11-13** con el [ADR 139](../DECISIONS/139-la-naturaleza-de-un-gasto.md): cada gasto tiene su naturaleza (`infra/naturaleza.js`) y cada vista su lente; las filas nuevas de HF.1c y HF.1d se clasifican con esa tabla. La Fase 0 cerró (HF.0a a HF.0j; la f y la g salieron sin código). Lo que se conectaba con el banco (HF.4 y HF.5a) vive en NUBE.4. Todos los datos de prueba son inventados.

#### HF.1d - Todo cambio de saldo deja registro (absorbe HF.1g)
- Prioridad  : media
- Estado     : requiere ADR (acota el ADR 012)
- Área       : code
- Objetivo   : Distribuir crea el ingreso y las transferencias que hoy aplica sin registro; el desembolso de un préstamo, el crédito D.14 y el ajuste manual de saldo dejan su fila; en Me deben cada abono lleva id y borrarlo revierte la cuenta exacta. Retira la guarda de HF.0h y HF.0i (`config.cobrosDistribuidos`): el `IngresoPuntual` de Distribuir la reemplaza solo para lo confirmado como recibido, descartado por ocurrencia y no por mes, o la segunda quincena distribuida deja de salir
- Riesgo     : un saldo igualado a mano tras un aporte se cuenta dos veces (riesgo 10 del 091): es lo que esta tarjeta cierra
- Archivos   : `tesoreria/acciones/distribucion.js`, `tesoreria/logic/cuentas.js`, `personales/`, `compromisos/index.js`
- Depende de : nada (sus filas se clasifican con el ADR 139)
- Aceptación : R-HF2 (saldo final igual a apertura más registros) con una prueba por ruta; borrar un abono de Me deben revierte la cuenta exacta

#### HF.1c - La fecha de cada aporte a metas y reservas
- Prioridad  : baja
- Estado     : requiere ADR
- Área       : code
- Objetivo   : `aportes[]` con id, fecha, monto y cuenta en metas y reservas (schema nuevo, sin backfill: lo previo queda como saldo de apertura, I4). Movimientos gana sus fuentes 6 y 7, y "Ya lo usé" registra el gasto (V5)
- Archivos   : `core/state.js`, `core/storage.js`, `metas/`, `apartados/`, `movimientos/logic.js`
- Depende de : nada
- Aceptación : migración idempotente con prueba; un aporte a una meta sale en Movimientos en su fecha

#### HF.2a - La cuenta habitual de cada pago
- Prioridad  : baja
- Estado     : pendiente, sin ADR
- Área       : code
- Objetivo   : "Marcar pagado" y el abono preseleccionan la última cuenta usada para ese compromiso, derivada de sus gastos (R-HF5, sin campo nuevo)
- Archivos   : `infra/cuenta-helper.js`, `compromisos/index.js`, `agenda/index.js`
- Depende de : nada
- Aceptación : prueba de la derivación; el segundo pago de un compromiso abre con la cuenta del primero

#### HF.2b - El débito automático sin saldo se avisa antes de vencer
- Prioridad  : baja
- Estado     : pendiente (PA.1c ampliada, nota al ADR 052)
- Área       : code
- Objetivo   : aviso `debito-sin-saldo` para débitos próximos, no solo vencidos; estados derivados de solo lectura (esperado, sin saldo, registrado)
- Archivos   : `infra/avisos.js`, `agenda/logic.js`
- Depende de : nada
- Aceptación : prueba del motor: un débito a tres días con la cuenta por debajo del monto genera el aviso

#### HF.3e - Lo que la app instalada muestra fuera de ella (absorbe HF.3f y HF.3g)
- Prioridad  : media
- Estado     : requiere ADR corto (convención de ruta; acota los ADR 063 y 066; absorbe el diferido del ADR 040)
- Área       : ambos
- Objetivo   : (1) con el candado activo, la notificación del sistema no nombra ni muestra montos, y respeta `ocultarSaldo` (hoy `verificarYNotificar()` corre fuera del candado y muestra el monto); (2) `navigator.setAppBadge(n)` con los avisos `urgente` y `alta`, al abrir, en `state:change` y `visibilitychange`, y se limpia en cero; (3) la notificación abre su elemento (`notificationclick`) y `manifest.json` gana accesos directos (Hoy, Por pagar, Registrar gasto, Registrar ingreso). Hoy no existe ninguna de las tres
- Riesgo     : el router no acepta parámetros: la ruta de un elemento es convención nueva
- Archivos   : `infra/notificaciones.js`, `ui/bootstrap.js`, `infra/router.js`, `manifest.json`, `service-worker.js`
- Depende de : nada. Rebanadas en ese orden: la (1) es la de más valor
- Aceptación : prueba de que con candado la notificación no lleva montos; en Android instalado, el número del ícono coincide con los avisos que piden atención

---

## Iniciativa APR - Aprende y aplícalo

> Handoff de Claude Design "Finko · Aprende y aplícalo" (35 tableros, octubre 2026), triado el 2026-10-24. Fuente única: **[ADR 092](../DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md)**. **Desde el [ADR 101](../DECISIONS/101-finko-del-adulto-decide-no-ensena.md) la capa es solo del niño**: el adulto no ve Aprende ni Tu progreso (capa de aprendizaje del adulto) y **[ADR 093](../DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md)** (perfiles, modo niño y tutor), los dos en Propuesta. **La Fase 1 (APR.1a a APR.1d) cerró el 2026-10-24** sin esperar a las fichas 17 y 19 de MOV.1 (decisión en chat, resolución al final del ADR 092); cada rebanada se sube a `main` al cerrar. Las catorce dudas del handoff quedaron resueltas por defecto con la propuesta del diseño; **P1 del ADR 093** ("Olvidé mi PIN" con niños) se resolvió el 2026-10-24 con su recomendación. La GU.1 (guía por navegación) sigue dueña de banners y hints: esta iniciativa no los toca. El catálogo de ilustraciones del niño entra por `scripts/sync-sprite.py` (el pipeline que dejó DV.2d).

> **APR.3f salió del tablero (ADR 138 D4).** Las ocho unidades y la ubicación desde los 10 años están escritas (2026-10-25) y una prueba mide la voz del ADR 093 D6. Lo que faltaba, la revisión pedagógica registrada, es trabajo de una persona, como la del abogado en LEG: cuando exista, sus correcciones entran como tarjeta.

### Fase 5 - Tino, el guatín ([ADR 094](../DECISIONS/094-tino-el-guatin.md) y [ADR 095](../DECISIONS/095-tino-en-el-sprite.md))

#### APR.5b - La ronda 2 de Tino y los hitos del niño
- Estado : pendiente. Los dibujos de la ronda 2 llegaron y el adulto ya los usa ([ADR 129](../DECISIONS/129-tino-ronda-2-en-el-adulto.md)); en el niño entran por el conversor que vive junto a los dibujos fuente (095 D4), con el tope de 16 KB por pose. **Objetivo**: sembrar, compartir, reserva y pensando en sus pantallas; hitos del niño (meta cumplida y ruta terminada, con el confeti que ya existe). **Modelo**: Equilibrado, Medio.

---

## Iniciativa NUBE - Finko en la nube con Supabase

> Decisión, las cuatro razones del ADR 043 revisadas, seguridad y Ley 1581: **[ADR 096](../DECISIONS/096-finko-en-la-nube-con-supabase.md)**, fuente única, con su resolución en implementación. Cuenta opcional, copia local que manda (offline-first intacto). **NUBE.0 a NUBE.2 cerradas el 2026-10-27; NUBE.2b y NUBE.3 el 2026-10-28** (MOV.1 en pausa por decisión en chat): proyecto `finko-prueba` en São Paulo, cuenta por correo solo para invitados, sincronización por registro entre dispositivos, borrar la cuenta completa y el teléfono del niño vinculado con un código del padre; detalle en [`contexto/nube.md`](../contexto/nube.md). **Pendiente del dueño de la cuenta**: SMTP propio en Supabase para que el correo de acceso llegue a los probadores. Plan gratis mientras Finko es de prueba; plan pago antes de abrir cuentas a personas fuera del grupo de prueba.

#### NUBE.4 - Bancos (absorbe HF.4a a HF.4f y HF.5a)
- Estado : no iniciar; pide su propio ADR (finanzas abiertas en Colombia). **Absorbe** la Fase 4 del ADR 091 (movimiento externo, conciliación, bandeja, aprender la categoría por descripción, compartir texto) y la Fase 5 (Finko Conectado, que exige derogar el ADN 3, el ADR 043 D1 y D4 y el ADR 066 D1): las tres son traer movimientos del banco (ADR 138 D2). Si se retoma, empieza por importar el extracto CSV del banco (antes HF.4d), que no toca el ADN; el diseño de cada pieza sigue escrito en el 091.

