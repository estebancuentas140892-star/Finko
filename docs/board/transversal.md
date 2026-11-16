# Tablero - Transversal

> Revisado: 2026-11-15.

> Satélite de [`BOARD.md`](../BOARD.md) (afecta varias secciones). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

> **Poda del 2026-11-13 ([ADR 138](../DECISIONS/138-la-poda-del-tablero-del-13-de-noviembre.md)).** Quedó lo que corrige una cifra que el usuario lee o algo que le estorba. Lo que salió (REV.4, REV.5 absorbida, DEC.1, DV.2d, PERF.13 a PERF.15, 18 rebanadas de HF, APR.3f) y por qué vive en ese ADR, no acá: **una idea que coincida con una de ellas se contrasta primero con el 138.**

---

## Transversal (afecta varias secciones)

> **Auditoría de rendimiento 2026-07 completa** (PERF.0 a PERF.4 cerradas, ver [`scripts/perf/BASELINE.md`](../../scripts/perf/BASELINE.md)). Los dos hallazgos que siguen mandando: `renderSmart()` ya evita el recálculo cruzado, y guardar cuesta ~5 ms debounced, así que la persistencia NO se reescribió ([ADR 030](../DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md); sus disparadores del D4 quedaron acotados a dos, T1 y T2, por el [ADR 068](../DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md)). **Disciplina obligatoria de toda tarjeta PERF: correr `pnpm perf` antes y después y comparar contra BASELINE.md**, y `pnpm perf:fluidez` si la tarjeta toca CSS, modales, navegación o animaciones (PERF.11, 2026-10-28: lo que happy-dom no ve). Lo que PERF.11 y PERF.12 midieron y no corrigieron (PERF.13 a PERF.15) salió con el ADR 138 D4: el arranque quedó como umbral de MV2.28, y lo demás ya estaba bajo lo que se nota. Sus cifras son de ese instrumento (CPU 4x, 3.000 gastos).

> **Iniciativa "INT.1 - Interfaz de escritorio", completa** (ADR 059, aceptado 2026-08-02). Fuente única del chrome de escritorio, 8 decisiones en 8 rebanadas. Móvil no cambia. **Las ocho rebanadas cerradas** (INT.1a a INT.1h); detalle e historia en el CHANGELOG y [`contexto/escritorio.md`](../contexto/escritorio.md). **INT.1g cerró el 2026-08-12 sin tarjeta propia** (dentro de una sesión sobre MT.6a) y quedó sin documentar hasta la auditoría del 2026-08-17: su único caso real es el compromiso mensual de Fondo, en [`ahorro.md`](../contexto/ahorro.md). **Coordinar con AH.7a** (mismo marcado de nav, otra plataforma).

> **Diferida del [ADR 068](../DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md): la migración a IndexedDB (antes PERF.5) ya no es tarjeta.** Su decisión, su alcance fijado (blob-en-IDB, no store por colección) y sus **dos** disparadores verificables viven en ese ADR, que reemplaza los tres del ADR 030 D4. **No re-auditar el código ante un pedido de ejecución:** la verificación está hecha y fechada allí; basta mirar si T1 o T2 cambiaron de estado. Al reabrirse nace como tarjeta nueva. Lo que salió a la luz con ese ADR ya cerró completo: **PERF.9** (2026-08-14, columna de caracteres en el harness) y **PERF.10** (2026-08-14, dos rebanadas). T1 ya tiene instrumento: detalle en [`scripts/perf/BASELINE.md`](../../scripts/perf/BASELINE.md).

> **Iniciativa Dirección Visual premium** ([ADR 033](../DECISIONS/033-direccion-visual-premium.md)), cerrada. DV.2d salió con el ADR 138 D4: Tino explica los vacíos. Los ocho dibujos de muestra de `assets/svg/ilustraciones/` y la rama `il-` de `emptyArt()` se pueden borrar como limpieza de paso.

> **Iniciativa REV, la revisión de Esteban del 2026-11-13** (14 puntos en Registro, Inicio, Deudas, Movimientos y General). La tanda 1 cerró con el [ADR 137](../DECISIONS/137-revision-del-13-de-noviembre-tanda-1.md); el ADR 138 D3 recortó lo que quedaba. "Pagar desde varias cuentas" no genera tarjeta: ya existe y se deja así (registra lo que pasa en el banco, un débito por cuenta). **El ojo sigue siendo uno solo** (REV.4 descartada, ADR 106 D3).

#### REV.3b - La app instalada tiene tus datos y la versión publicada
- Prioridad  : alta
- Estado     : pendiente (absorbe REV.5, ADR 138 D3): primero una prueba en un iPhone real y los datos del teléfono de Esteban
- Área       : ambos
- Objetivo   : (1) en iOS la app instalada no comparte `localStorage` con Safari: quien se registra en Safari e instala abre una app vacía. Ofrecer instalar antes del registro en iOS, o avisarlo en el modal; además el iPad no se detecta (`_esIOS()`), los pasos suponen Safari con Compartir abajo y no se detecta el navegador de otra app. (2) El 2026-11-13 producción servía la v693 completa y el aviso "Hay una versión nueva" se pinta bien, pero el teléfono de Esteban seguía en la vieja. Faltan: el número de Acerca de Finko (`1.0.0 (NNN)`), el mensaje de "Buscar actualización", iPhone o Android y desde qué dirección está instalada (si no es finko-brown.vercel.app, no recibe lo que se publica)
- Archivos   : `modules/ui/install-prompt.js`, `index.html` (`#modal-install-ios`), `modules/ui/onboarding.js`, `modules/infra/sw-register.js`, `modules/infra/actualizacion.js`, `modules/ui/sw-aviso.js`, `service-worker.js`
- Depende de : la prueba en el iPhone y esos datos
- Aceptación : en un iPhone, quien instala Finko encuentra sus datos (o fue avisado antes de registrarse), y en el teléfono de Esteban Acerca de Finko muestra la versión publicada. En la misma prueba: el modo escritura de FORM.2a (con el teclado abierto en Nueva deuda se ven la pregunta, el campo, su ayuda y el botón; la ✕ no queda bajo la hora en la app instalada) y el campo sobre el teclado de REV.2b, y toda la iniciativa FORM.2 (ADR 142): Registrar gasto con el teclado de Finko, las mini-hojas, las preguntas de crear y la ficha del gasto



> **Iniciativa SUS: Finko reconoce el tipo de gasto** ([ADR 146](../DECISIONS/146-finko-reconoce-el-tipo-de-gasto.md)). Hormiga, fantasma y vampiro sin preguntarle al usuario qué son. SUS.1a (la plataforma de cada suscripción, `marcaId`) SUS.1b (el chip de hormiga sale del formulario) SUS.2a (Mecato, subcategorías y "¿gusto o necesidad?", [ADR 147](../DECISIONS/147-gusto-o-necesidad-hormiga-sin-adivinar.md)) SUS.2b (hormiga es lo pequeño que es un gusto), SUS.2c (la pregunta al repetirse) y SUS.2d (corregir y ver lo aprendido) cerraron el 2026-11-15: SUS.2 completa. SUS.1c (el aviso de varias suscripciones) también. El ícono de Mecato es cola de diseño de Esteban: hoy usa `c-hormiga`. Los vectores de las seis plataformas nuevas son cola de diseño de Esteban, sin tarjeta: entran a `assets/svg/logos/streaming/` y se suman con su `simbolo`.

#### SUS.1d - Vampiro: lo que pagas sin comprar nada
- Prioridad  : baja
- Estado     : requiere decisión de superficie con Esteban
- Área       : ambos
- Objetivo   : cuota de manejo e intereses de deudas como un solo hallazgo (ADR 146 D7). Los seguros atados a un crédito no tienen dato propio
- Depende de : la superficie decidida con Esteban
- Aceptación : por definir con la superficie

> **IV.4 - Iconografía dirigida post-color, cerrada 2026-08-15.** Metáfora de movimiento en los dos iconos que el triaje del 2026-07-08 señaló como ilegibles: Avalancha (`i-mountain`) cambia el punto estático del pico por un trazo desnudo de dos golpes cortos + la chispa al final del recorrido (cae por la ladera, no se queda arriba); Bola de nieve (`i-snowball`) suma un arco de rastro (trazo desnudo, mismo patrón que la puerta de `i-home`) detrás del círculo chico. Se descartó el boceto de 3 chispas en cascada del 2026-08-14 por violar la regla 3 del ADR 023 (un solo punto de valor); la solución final conserva un único `circle` de chispa. Esteban delegó la decisión final ("toma tú las decisiones") en vez de esperar el dibujo en Illustrator: geometría verificada por bbox (sin composición visual real en esta sesión, mismo límite que el 2026-08-14). `assets/svg/iconos/simbolos/mountain.svg` + `snowball.svg`, sprite de `index.html`.

> **Iniciativa CAT: taxonomía + picker de ícono compartido, completa.** Fuente única para categorías entre secciones. CAT.1, CAT.2, CAT.3 y CAT.4 cerradas (reglas heredadas en [`contexto/categorias.md`](../contexto/categorias.md), bloque "Categorías personalizadas del usuario").

> **Iniciativa GU.1: guía por navegación (aprender usando, no leyendo)** (6.º lote, 2026-07-08, brief General puntos 4+5). **GU.1a cerrada (2026-08-03):** [ADR 016](../DECISIONS/016-banner-proposito-de-seccion.md) auditado y vigente sin desviaciones; detalle en [`contexto/transversal.md`](../contexto/transversal.md). **Regla anti-doble-trabajo:** GU.1 define el principio y audita el sistema transversal (banners, hints); los rediseños internos de cada sección viven en sus iniciativas v2, que aplican este principio en vez de duplicarlo.

> **Iniciativa LEG: Centro Legal y cumplimiento.** El paquete, su estado por documento y el checklist de datos pendientes viven en [`legal/README.md`](../legal/README.md), su dueño. **LEG.1** (Centro Legal, borradores + UI) y **LEG.2** (aceptación obligatoria versionada, onboarding + gate de re-aceptación) cerradas, detalle en [`contexto/transversal.md`](../contexto/transversal.md) y el CHANGELOG. El checklist de contenido (responsable, contacto, licencia, revisión de abogado colombiano) sigue abierto y bloquea el paso del paquete a v1.0, no el mecanismo de aceptación, que ya corre sobre la versión vigente. La revisión del abogado es trabajo profesional externo, no una tarea de código.

> **Iniciativa LG.2: Logros v2, gamificación de hábitos, completa.** Alcance, regla anti-gaming y catálogo: **[ADR 032](../DECISIONS/032-logros-v2-niveles-y-habitos.md)** (Aceptada). **LG.2d cerró el 2026-08-13** (mudanza a "Tu progreso" en Análisis + tarjeta en Inicio): el [ADR 022](../DECISIONS/022-vitrina-de-logros-en-ajustes.md) pasa a Superada, ver [`contexto/logros.md`](../contexto/logros.md). Los dos logros diferidos por datos (`ahorro-creciente`, `pagador-puntual`) NO son tarjeta: su verificación y condición de reapertura viven en el ADR 032, sección "Resolución de LG.2e en implementación". Nombres de niveles de usuario siguen provisionales hasta que Esteban entregue los definitivos (cambiarlos no toca datos).

> **Iniciativa "PA.1 - Pagos y créditos automáticos" completa** ([ADR 052](../DECISIONS/052-pagos-automaticos.md) D1-D4, Aceptada). PA.1a (débito de compromisos) cerró 2026-08-13 y PA.1b (crédito del ingreso fijo, misma hoja `#modal-automaticos`) cerró 2026-08-14. Detalle en [`contexto/calendario.md`](../contexto/calendario.md). Queda **PA.1c**, opcional y sin tarjeta (llevar el aviso de "sin cuenta"/"sin saldo" al motor único de CFG.3, ya cerrado): se re-expande a tarjeta si Esteban la retoma.

> **Diferido del [ADR 040](../DECISIONS/040-navegacion-v2-visual.md), cerrado por HF.3e (2026-11-15, [ADR 144](../DECISIONS/144-lo-que-finko-muestra-fuera-de-la-app.md) D2):** el número cuenta lo que interrumpe (avisos `urgente` y `alta`). Va en el ícono de la app instalada; el nav no lleva número: dentro de la app, Inicio ya abre en "Atención hoy". Si se pide en el nav, entra por triaje con este mismo conteo (`avisosQueNotifican()`).

---

## Iniciativa HF - Un hecho financiero se informa una sola vez

> Brief, triaje, riesgos y preguntas P1 a P8 (resueltas): **[ADR 091](../DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)**. El [ADR 138](../DECISIONS/138-la-poda-del-tablero-del-13-de-noviembre.md) D2 dejó el plan en seis tarjetas: **ninguna espera ya a la ficha 18 ni al cierre de MOV.1**. **HF.1d y HF.3e cerraron el 2026-11-15** con los [ADR 143](../DECISIONS/143-todo-cambio-de-saldo-deja-registro.md) y [144](../DECISIONS/144-lo-que-finko-muestra-fuera-de-la-app.md). **HF.1b cerró el 2026-11-13** con el [ADR 139](../DECISIONS/139-la-naturaleza-de-un-gasto.md): cada gasto tiene su naturaleza (`infra/naturaleza.js`) y cada vista su lente; las filas nuevas de HF.1c y HF.1d se clasifican con esa tabla. La Fase 0 cerró (HF.0a a HF.0j; la f y la g salieron sin código). Lo que se conectaba con el banco (HF.4 y HF.5a) vive en NUBE.4. Todos los datos de prueba son inventados.

---

## Iniciativa APR - Aprende y aplícalo

> Handoff de Claude Design "Finko · Aprende y aplícalo" (35 tableros, octubre 2026), triado el 2026-10-24. Fuente única: **[ADR 092](../DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md)**. **Desde el [ADR 101](../DECISIONS/101-finko-del-adulto-decide-no-ensena.md) la capa es solo del niño**: el adulto no ve Aprende ni Tu progreso (capa de aprendizaje del adulto) y **[ADR 093](../DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md)** (perfiles, modo niño y tutor), los dos en Propuesta. **La Fase 1 (APR.1a a APR.1d) cerró el 2026-10-24** sin esperar a las fichas 17 y 19 de MOV.1 (decisión en chat, resolución al final del ADR 092); cada rebanada se sube a `main` al cerrar. Las catorce dudas del handoff quedaron resueltas por defecto con la propuesta del diseño; **P1 del ADR 093** ("Olvidé mi PIN" con niños) se resolvió el 2026-10-24 con su recomendación. La GU.1 (guía por navegación) sigue dueña de banners y hints: esta iniciativa no los toca. El catálogo de ilustraciones del niño entra por `scripts/sync-sprite.py` (el pipeline que dejó DV.2d).

> **APR.3f salió del tablero (ADR 138 D4).** Las ocho unidades y la ubicación desde los 10 años están escritas (2026-10-25) y una prueba mide la voz del ADR 093 D6. Lo que faltaba, la revisión pedagógica registrada, es trabajo de una persona, como la del abogado en LEG: cuando exista, sus correcciones entran como tarjeta.

> **Fase 5 - Tino, completa** (APR.5a y APR.5b, [ADR 094](../DECISIONS/094-tino-el-guatin.md) y [ADR 095](../DECISIONS/095-tino-en-el-sprite.md)): la ronda 2 entró al sprite del niño el 2026-11-15, menos "meta cumplida", que no cabe en 16 KB.

---

## Iniciativa NUBE - Finko en la nube con Supabase

> Decisión, las cuatro razones del ADR 043 revisadas, seguridad y Ley 1581: **[ADR 096](../DECISIONS/096-finko-en-la-nube-con-supabase.md)**, fuente única, con su resolución en implementación. Cuenta opcional, copia local que manda (offline-first intacto). **NUBE.0 a NUBE.2 cerradas el 2026-10-27; NUBE.2b y NUBE.3 el 2026-10-28** (MOV.1 en pausa por decisión en chat): proyecto `finko-prueba` en São Paulo, cuenta por correo solo para invitados, sincronización por registro entre dispositivos, borrar la cuenta completa y el teléfono del niño vinculado con un código del padre; detalle en [`contexto/nube.md`](../contexto/nube.md). **Pendiente del dueño de la cuenta**: SMTP propio en Supabase para que el correo de acceso llegue a los probadores. Plan gratis mientras Finko es de prueba; plan pago antes de abrir cuentas a personas fuera del grupo de prueba.

#### NUBE.4 - Bancos (absorbe HF.4a a HF.4f y HF.5a)
- Estado : no iniciar; pide su propio ADR (finanzas abiertas en Colombia). **Absorbe** la Fase 4 del ADR 091 (movimiento externo, conciliación, bandeja, aprender la categoría por descripción, compartir texto) y la Fase 5 (Finko Conectado, que exige derogar el ADN 3, el ADR 043 D1 y D4 y el ADR 066 D1): las tres son traer movimientos del banco (ADR 138 D2). Si se retoma, empieza por importar el extracto CSV del banco (antes HF.4d), que no toca el ADN; el diseño de cada pieza sigue escrito en el 091.

