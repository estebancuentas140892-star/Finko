# Ficha de contexto: Perfil niño y Familia

> Revisado: 2026-10-27.

> Los perfiles de niño en el mismo dispositivo, "¿Quién usa Finko?", lo que ve el niño y lo que administra el tutor desde Ajustes, Familia. Decisiones: [ADR 093](../DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md). Tarjetas: iniciativa APR, Fase 3, en [`board/transversal.md`](../board/transversal.md). Reglas de uso y plantilla en [`README.md`](README.md).
>
> **Qué NO buscar acá:** la ruta y la lección del adulto ([`aprende.md`](aprende.md)); el candado y el resto de Ajustes ([`configuracion.md`](configuracion.md)).

---

## Perfiles, "¿Quién usa Finko?" y la piel del niño

- **Objetivo**          : que un tutor y niños de 7 a 12 años compartan el teléfono sin que el niño vea las finanzas del adulto (D1).
- **Estado actual**     : en evolución (Fase 3 de APR). Cerradas **APR.3b** (sistema visual), **APR.3a** (perfiles, selector, alta paso 1, PIN de niño a adulto, candado obligatorio, P1), **APR.3c** (barra, ruta en orden como camino, lección con Frai, celebración, unidad 1) **APR.3d** (Guardé, Gasté, Compartí, mover, una meta con semanas y fecha) y **APR.3e** (alta en dos pasos con mesada, "Entregada" como un solo hecho, premio por ahorrar, progreso del niño). **APR.3f**: las ocho unidades escritas y la ubicación desde los 10 años; falta su revisión pedagógica. **APR.4b**: riel desde 768 px, Inicio en dos columnas desde 1024 px y "Cambiar de perfil" al pie de la barra lateral del adulto. **APR.5a**: Tino, un guatín, reemplaza a Frai ([ADR 095](../DECISIONS/095-tino-en-el-sprite.md)).
- **Verificado contra** : commit de APR.5a (2026-10-27).

**Dónde vive**

| Pieza | Archivo | Ancla |
|---|---|---|
| Modelo del niño, validación del alta y quién usa Finko ahora (sesión, no se guarda) | `modules/infra/perfiles.js` | `normalizarPerfil()`, `validarNino()`, `crearNino()`, `ninos()`, `hayNinos()`, `perfilActivo()`, `entrarComo()` |
| Estado y migración | `modules/core/state.js` / `storage.js` | `perfiles` (schema v48) |
| "¿Quién usa Finko?", PIN del adulto y cambio de piel con fundido | `modules/ui/quien-usa.js` | `initPerfiles()`, `abrirQuienUsa()`, `htmlQuienUsa()`, `_aplicarPiel()`, `data-action="perfil-cambiar"` |
| "Cambiar de perfil" al pie de la barra lateral del adulto, solo con niños | `modules/ui/quien-usa.js` / `index.html` | `_pintarAccesoPerfil()`, `#sidebar-perfil` |
| Fundido compartido con el cambio de tema (CFG.7) | `modules/ui/shell.js` | `conFundido()` |
| "Olvidé mi PIN" con y sin niños (P1) | `modules/ui/bloqueo-acceso.js` | `olvideMiPin()`, `PALABRA_BORRAR`, `intentarPin()` |
| Confirmación con palabra escrita | `modules/ui/confirm.js` | opción `palabra` |
| Bloque Familia, alta en dos pasos, mesada, premio y progreso | `modules/dominio/config/familia.js`, `familia-view.js` | `initFamilia()`, `abrirAlta()`, `_entregada()`, `_pagarPremio()`, `htmlFamilia()`, `htmlMesada()`, `htmlPremio()`, `htmlProgresoNino()`, `data-action="familia-*"` |
| Calendario de la mesada y premio (sin DOM, lo leen tutor y niño) | `modules/infra/mesada.js` | `repartoPorDefecto()`, `validarMesada()`, `mesadaPendiente()`, `proximaMesada()`, `guardadoTodoElMes()`, `premioPendiente()`, `proximoPremio()` |
| El gasto Familia del tutor | `modules/dominio/gastos/index.js` | `_registrarGastoExterno()`, evento `gasto:registrar` |
| Candado obligatorio con niños | `modules/dominio/config/view.js` / `index.js` | `_renderBloqueo()`, `_quitarCandado()` |
| La app del niño: cuatro pantallas y su barra (riel desde 768 px, con su dibujo y "Cambiar") | `modules/dominio/nino/index.js` / `view.js` | `initNino()`, `_irA()`, `htmlBarraNino(vista, perfil)`, `htmlInicioNino()`, `htmlRutaNino()`, `htmlAlcanciaNino()`, `htmlYoNino()`, `data-action="nino-vista"`, evento `nino:vista` |
| La ruta en orden (sin DOM) | `modules/dominio/nino/logic.js` | `estadoRutaNino()`, `siguienteLeccionNino()`, `unidadesHechasNino()`, `sinEmpezarNino()` (Tino se presenta) |
| Catálogo de la ruta del niño | `modules/infra/ruta-aprende.js` | `UNIDADES_NINO` |
| Saldos de los frascos, avance y cambios del niño | `modules/infra/perfiles.js` | `saldosFrascos()`, `guardarAprendeNino()`, `actualizarNino()`, `FRASCOS` |
| Alcancía y meta (sin DOM): validar y crear movimientos, plan de la meta, llenado de cada frasco | `modules/dominio/nino/logic.js` | `validarMovimiento()`, `crearMovimientos()`, `metaActiva()`, `planMeta()`, `validarMeta()`, `llenadoFrasco()`, `puedeMover()` |
| Hoja para anotar y pantalla de la meta | `modules/dominio/nino/view.js` / `index.js` | `htmlMovimientoNino()`, `htmlMetaNino()`, `htmlTarjetaMeta()`, `data-action="nino-mov"`, `nino-monto`, `nino-meta-*`, `#modal-nino` |
| La lección del niño: mismo motor, su avance y su cierre | `modules/dominio/aprende/index.js` / `view.js` | `_progreso()`, `_guardarProgreso()`, `ctx.nino`, `_cierreNino()`, `data-action="leccion-salir-a"` |
| Contenido del niño (solo datos) y su ubicación desde los 10 | `modules/dominio/aprende/lecciones/nino/kN.js`, `nino/ubicacion.js` | `'k1-l1'`, `ofreceUbicacionNino()`, `EDAD_UBICACION_NINO` |
| Dibujos, Tino, frasco y destellos | `modules/infra/ilustraciones.js` | `DIBUJOS`, `htmlDibujo()`, `POSES_TINO`, `htmlTino()`, `htmlFrasco()`, `htmlDestellos()` |
| Markup | `index.html` | `#quien-usa`, `#modal-familia`, `#nino-app`, `#nino-main`, `#nino-nav` |

**Recursos**: símbolos `il-tino-*` (cinco poses, color por rol `--fk-tino-*`), `il-balon` a `il-patineta`, `il-frasco`, `il-frasco-borde` (`assets/svg/ilustraciones/`, ver su README 2.2). CSS: `styles/components/nino.css` (base visual y sección "PERFILES"); tokens del niño en `tokens.css` y `themes.css` (`body.kid`, `body.light-theme.kid`); fondo opaco del selector en `modals.css`.

**Dependencias y relaciones**: `entrarComo()` emite `perfil:cambio` (`{ id }`), que escuchan `ui/quien-usa.js` (piel) y `dominio/nino` (pinta). Entrar al adulto emite `bloqueo:abierto` (bootstrap.js encadena gate legal, novedades y débitos). "Agregar un niño" desde el selector emite `familia:agregar`, que abre el alta en config. Con niños, `bootstrap.js` llama `initPerfiles()` en vez de `initBloqueoAcceso()`. `modales.js` usa `#nino-app` como fondo inerte en el perfil niño.

**Riesgos**:

- **El perfil activo vive solo en memoria.** Guardarlo en `fk_v1` dejaría a un niño dentro del adulto al recargar; con niños, Finko siempre abre en el selector (D1).
- **El candado no cifra.** Quien abra `fk_v1` lee todos los perfiles; el selector y Ajustes lo dicen.
- **La piel se decide al aplicarse**, no al pedirse: con View Transitions el cambio corre un cuadro después y dos cambios seguidos pueden llegar en desorden.
- **El aviso de logro del adulto** se oculta mientras el candado o el selector están abiertos y en el perfil niño (`modals.css`, `nino.css`): es un dato del adulto.
- **La alcancía solo anota** (D3): cada acción es un movimiento del perfil; el saldo de un frasco es la suma de los suyos y nunca baja de cero. "Lo compré" es una salida de Ahorrar con `tipo: 'meta'`.
- **La pantalla de la meta no se repinta** con `state:change` mientras está abierta: borraría lo que el niño escribe.
- **"Entregada" nace una vez**: `mesadaPendiente()` solo devuelve la última fecha que tocaba si no está en `entregas`. Si el tutor borra el gasto Familia, los frascos del niño no se tocan (cada lado se corrige en su lugar).
- **El gasto Familia no pregunta por sobregiro**: el dinero ya se entregó. Necesita una cuenta elegida en la mesada; sin ella, el premio se suma al niño sin gasto.
- **Quitar el candado con niños** no se ofrece y el handler lo rechaza: primero hay que eliminar sus perfiles.
- **Tino pesa unos 12 KB por pose** en el sprite de `index.html`, también para el adulto (095 D1). Un test pone el tope en 16 KB; la ronda 2 entra por el conversor que vive junto a los dibujos fuente (095 D4), no en el repo.
- **Inicio trae la alcancía dos veces** (la lista corta y los tres frascos) y el ancho elige cuál se ve (`nino.css`): un test que cuente frascos en Inicio ve los dos. Lo mismo con "Cambiar": en el teléfono va en Inicio y en Yo; desde 768 px, en el riel.

**Cambios pendientes**: el selector usa el campo de PIN de siempre, no el teclado numérico del diseño; falta el avatar de Inicio como atajo a Familia (D2). La ronda 2 de Tino y los hitos del niño (APR.5b) esperan sus dibujos.

**Cambios realizados**:

- 2026-10-27 (APR.5a): Tino reemplaza a Frai en el sprite y en las siete pantallas, celebra en grande la unidad terminada y se presenta en Inicio.
- 2026-10-25 (ADR 094): Frai pasa a Tino, un guatín; k1-l3, k4-l1 y k7-l1 cuentan la metáfora de la semilla.
- 2026-10-25 (APR.4b): riel del niño en tableta y escritorio, Inicio en dos columnas, "Cambiar de perfil" en la barra lateral del adulto.
- 2026-10-25 (APR.3f): unidades 2 a 8 y ubicación desde los 10 años; lo sabido cuenta en la ruta en orden.
- 2026-10-25 (APR.3e): alta con mesada, "Entregada" con gasto Familia, premio por ahorrar, progreso del niño.
- 2026-10-25 (APR.3d): alcancía con Guardé, Gasté, Compartí y mover; una meta con semanas y fecha.
- 2026-10-25 (APR.3c): app del niño con barra, ruta en orden, lección con Frai, celebración y unidad 1.
- 2026-10-25 (APR.3a): perfiles (v48), "¿Quién usa Finko?", alta paso 1 con PIN obligatorio, Familia en Ajustes, P1.
- 2026-10-25 (APR.3b): `.kid` y sus tokens con AA medido, Frai, catálogo de dibujos y frasco en el sprite.
