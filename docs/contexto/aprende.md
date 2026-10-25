# Ficha de contexto: Aprende

> Revisado: 2026-10-24.

> La capa de aprendizaje del adulto: la ruta de nueve unidades (`#aprende`) y la lección a pantalla completa (`#modal-leccion`). Decisiones: [ADR 092](../DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md). Tarjetas: iniciativa APR en [`board/transversal.md`](../board/transversal.md). Reglas de uso y plantilla en [`README.md`](README.md).
>
> **Qué NO buscar acá:** el perfil niño y el tutor ([`nino.md`](nino.md)); "Tu progreso" (hoy en [`logros.md`](logros.md), se muda con APR.1d).

---

## Ruta y lección (dominio `aprende`)

- **Objetivo**          : enseñar con práctica y cerrar cada lección en la sección donde se aplica, con los datos del usuario (Aplícalo, D7).
- **Estado actual**     : en evolución (iniciativa APR). **Fase 1 cerrada** (APR.1a a APR.1d): motor de lección, estado en `S`, ruta, la unidad 3 completa, "Tu siguiente paso" en Inicio y el bloque Inicio de tres lentes en móvil (`ui/bloque-inicio.js`). En escritorio, fila propia en "Día a día".
- **Verificado contra** : commit de APR.1a (2026-10-24).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Catálogo de la ruta (9 unidades, lecciones con `contenido: false` mientras no estén escritas) | `modules/dominio/aprende/logic.js` | `UNIDADES` | ~40 |
| Estado de cada unidad y lección recomendada | `modules/dominio/aprende/logic.js` | `estadoRuta()`, `siguienteLeccion()` | ~128, ~152 |
| Lección terminada (suma una vez) y semanas activas | `modules/dominio/aprende/logic.js` | `registrarLeccionHecha()`, `semanaISO()` | ~193, ~169 |
| Motor de la sesión (valor inmutable) | `modules/dominio/aprende/logic.js` | `crearSesion()`, `avanzar()`, `responderElegir()`, `clasificarTarjeta()`, `cambiarControl()`, `moverItem()`, `comprobarOrden()` | ~268 en adelante |
| Pregunta fallada vuelve antes del Aplícalo | `modules/dominio/aprende/logic.js` | `_reencolar()` | ~287 |
| Aritmética de los pasos "control" y su lectura | `modules/dominio/aprende/logic.js` | `CALCULOS`, `RESULTADOS` | |
| El Aplícalo de cada unidad: un modelo que la vista pinta tal cual | `modules/dominio/aprende/aplica.js` | `APLICA`, `modeloAplica()` | |
| Aplícalo de la unidad 3 y límite sugerido | `modules/dominio/aprende/logic.js` | `aplicaHormiga()`, `limiteSugerido()` | ~499 |
| Contenido de cada unidad (solo datos; `{tope}` y los valores legales como marcadores) | `modules/dominio/aprende/lecciones/uN.js` | `'uN-lM'` | |
| HTML de la ruta | `modules/dominio/aprende/view.js` | `htmlRuta()`, `renderRuta()` | ~102 |
| HTML de cada paso y del cierre | `modules/dominio/aprende/view.js` | `htmlLeccion()`, `_pasoAplica()`, `htmlResultadoControl()` | ~421 |
| Carga del contenido con `import()` | `modules/dominio/aprende/index.js` | `_CONTENIDO` | ~30 |
| Acciones de la lección | `modules/dominio/aprende/index.js` | `data-action="leccion-*"` en `initAprende()` | ~276 |
| "Poner un límite de $X": evento `hormiga:limite` y navegación a Límites | `modules/dominio/aprende/index.js` | `_ponerLimiteHormiga()` | ~275 |
| Desplegar en la ruta una unidad que no es la actual | `modules/dominio/aprende/index.js` | `_alternarUnidad()`, `data-action="aprende-unidad"` | ~285 |
| Celebración de unidad (insignia `il-insignia`, `badgeIn`) | `modules/dominio/aprende/view.js` | `_cabezaCierre()` | ~400 |
| Prueba de ubicación (D9): resultado, guardado y cuándo se ofrece; contenido aparte | `modules/dominio/aprende/logic.js` / `lecciones/ubicacion.js` | `resultadoUbicacion()`, `aplicarUbicacion()`, `ofrecerUbicacion()` | |
| Resultado de la prueba y la opción "Todavía no lo sé" | `modules/dominio/aprende/view.js` | `_resultadoUbicacion()`, `_opcionNoSe()`, `_feedbackElegir()` | |
| La sección ofrece su lección (D6): qué lección y con qué dato; los huecos los pone la sección | `modules/dominio/aprende/logic.js` / `view.js` / `index.js` | `OFERTAS_DE_SECCION`, `ofertaDeSeccion()`, `htmlOfertaLeccion()`, `_pintarOferta()` | |
| "Tu siguiente paso" en Inicio (D5): una lección o la acción pendiente | `modules/dominio/aprende/logic.js` / `view.js` | `siguientePaso()`, `htmlSiguientePaso()` | |
| Semana activa al registrar (D3) | `modules/dominio/aprende/index.js` | `_alRegistrar()`, `registrarSemana()` | |
| Catálogo, unidades sabidas, semanas activas, posición en la ruta (lo lee también `logros`) | `modules/infra/ruta-aprende.js` | `UNIDADES`, `contarUnidadesSabidas()`, `contarSemanasActivas()`, `posicionEnRuta()` | |
| Franja Hoy, Aprende y Tu progreso en móvil | `modules/ui/bloque-inicio.js` | `htmlBloqueInicio()`, `estadoLentesInicio()` | |
| Gesto de deslizar (pointer events) | `modules/dominio/aprende/index.js` | `_alPresionar()`, `_alArrastrar()`, `_alSoltar()` | ~249 |
| Criterio de gasto hormiga (compartido con `gastos` y `logros`) | `modules/infra/hormiga.js` | `UMBRAL_GASTO_HORMIGA`, `resumenHormigaMes()` | ~15, ~40 |
| Sección y overlay | `index.html` | `#sec-aprende`, `#panel-aprende`, `#modal-leccion`, `#leccion-panel` | |

**Recursos**: `c-birrete` (ícono de la sección), `i-check`, `i-arrow-left`, `i-arrow-right`, `i-chevron-up`, `i-chevron-down` (nuevos en `assets/svg/iconos/utilitarios/`). CSS: `styles/components/aprende.css` (`.aprende-*`, `.leccion*`, filas de animación `stepIn`, `feedbackIn`, `cardOutDer`/`cardOutIzq`, `checkIn`); geometría del overlay en `styles/modals.css` (bloque "LECCIÓN A PANTALLA COMPLETA"). Color de unidad por `data-dom` → `--apr-dom`/`--apr-dom-text`. Estado: `S.aprende` (schema v45; `ubicacion` desde v47).

**Dependencias y relaciones**: escucha `state:change` (repinta la ruta con `programarRender`) y `hashchange`. Escucha `seccion:pintada` (`{ seccion, datos }`, lo emite `ahorro` al pintar el Fondo) y llena `#fondo-leccion` o `#fondo-leccion-pie`. Emite `hormiga:limite` (`{ monto }`), que atiende `presupuesto` (dueño del límite, ficha [`limites.md`](limites.md)). El tope de gasto pequeño lo lee de `S.config.hormiga` con `topeHormiga()`. Los botones del Aplícalo usan acciones globales de `ui/actions.js`: `ir-a-seccion` (cierra y navega) y `registrar-abrir` (cierra y abre `nuevo-gasto`), así no importa dominios destino. Lee `S.gastos` y `S.categoriasPersonalizadas`; `iconoDeCategoriaGasto()` de `core/constants.js`.

**Riesgos**:

- **`S.aprende.hechas` guarda la PRIMERA fecha**: repasar no la cambia. Logros (APR.1d) contará unidades sobre esto; no "actualizar" la fecha al repasar.
- **Las semanas activas se persisten a propósito** (deben ser monótonas). No reemplazarlas por una derivación desde `S.gastos`: borrar un gasto restaría semanas.
- **Primer `import()` dinámico del proyecto.** Todo módulo de `lecciones/` debe estar en el precache del SW (lo exige `sw-precache.test.js`); si falta, la lección no abre sin red.
- **El panel se repinta entero en cada paso.** El foco se mueve a mano (`_pintar({ foco })`): al agregar un tipo de paso, decidir a dónde va el foco o se pierde.
- **El deslizador no repinta el paso** (perdería el foco mientras se arrastra): `_alMoverRango()` parcha el número y `#leccion-resultado`.
- **Las tarjetas de clasificar deben respetar el tope**: un test exige, en toda la unidad, que las marcadas `es: true` sean hormiga según `esGastoHormiga()` con el tope por defecto.
- **La insignia sale solo la primera vez** que una lección completa su unidad (`primeraVez` de `registrarLeccionHecha()`): repasar la última lección no vuelve a celebrar.

**Cambios pendientes**: la ilustración `il-hormiga` del concepto no entró al sprite (usa clases y `ellipse`, fuera del estándar de `sync-sprite.py`); va con APR.3b o se redibuja con el estándar. Ordenar pasos solo con flechas: el arrastre llega con APR.4a.

**Cambios realizados**:

- 2026-10-24 (APR.2b): prueba de ubicación, `S.aprende.ubicacion` (v47).
- 2026-10-24 (APR.2a): la sección ofrece su lección; primer caso Fondo, con `seccion:pintada`.
- 2026-10-24 (APR.2c, unidades 7, 8 y 9): Crédito e intereses; Invertir; Impuestos con marcadores legales. Ruta completa.
- 2026-10-24 (APR.2c, unidades 5 y 6): Metas y reservas; Deudas y gota a gota.
- 2026-10-24 (APR.2c, unidades 1 y 2): Tu dinero hoy y Repartir tu ingreso; la ruta empieza en la unidad 1.
- 2026-10-24 (APR.2c, unidad 4): Fondo de emergencia, cuatro lecciones; el Aplícalo pasa a `aplica.js` (un cálculo por unidad) y los controles a `RESULTADOS`; marcadores legales en los textos.
- 2026-10-24 (APR.1c y APR.1d): bloque Inicio de tres lentes, "Tu siguiente paso", catálogo a `infra/ruta-aprende.js`, semanas activas al registrar.
- 2026-10-24 (APR.1b): lecciones 1, 3 y 4 de la unidad 3, insignia de unidad, unidades desplegables en la ruta, Aplícalo que pone el límite de gastos pequeños.
- 2026-10-24 (APR.1a): dominio nuevo, `S.aprende` (v45), ruta, lección 2 de la unidad 3 de punta a punta, `infra/hormiga.js` como criterio único del umbral.

**Observaciones**: el Aplícalo de las lecciones 2 a 4 pone el límite de gastos pequeños con el monto sugerido (80 % de lo del mes, a la decena de mil); si ya hay uno, lleva a verlo. La lección 1 lleva a Gastos. El texto del logro "Hormiga a raya" en el cierre describe la regla real del ADR 032 (bajar del promedio de los tres meses anteriores), no la del diseño ("mantenerte bajo el límite"), que no existe.
