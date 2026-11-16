# Changelog - Finko Claude

> Revisado: 2026-11-16.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-11)

### feat(inicio): AH.1d, en escritorio el estado va en su columna · 2026-11-16

[ADR 150](DECISIONS/150-estados-de-pago-y-logos-en-inicio.md) D6, cierra AH.1. Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v741 (la v740 queda para OB.1b de la otra sesión).

- **"Lo que tienes que pagar" (escritorio):** cada fila es una rejilla de teja de 36 con radio 11 (el logo del pago con `tejaDePago`; préstamo y reserva, la de su sección), nombre, estado en su propia columna de 200 y monto en una de 120, a 60 de alto. Sale el badge de tipo y la flecha: la teja y la pastilla dicen qué es y cómo está.
- **El estado es la pastilla de D1:** el grupo del lote con `textoEstadoObligacion` (vencido o hoy, de OB.1); lo que viene, "próximo" con `cuandoSemana`.
- **El pago va sin signo** (D7); el préstamo que entra conserva el "+". El apartado con emoji legacy lo sigue mostrando (CAT.2c).
- Limpieza: `_tipoBadge`, `_iconoApartado` y `_LABEL_POR_TIPO` quedaron sin uso y salieron; el badge corto sigue en la lista del teléfono.
- Pruebas: `compromisos.test.js` (5 reescritas de la anatomía de escritorio y 2 ajustadas). Unitarias 5936/5936, E2E 500/500.

### refactor(pagos): OB.1b, lo que OB.1 repetía de AH.1 cede a AH.1 · 2026-11-16

Nota del [ADR 151](DECISIONS/151-el-estado-de-una-obligacion-se-decide-una-vez.md), con el [ADR 150](DECISIONS/150-estados-de-pago-y-logos-en-inicio.md). Fichas: [`contexto/inicio.md`](contexto/inicio.md), [`contexto/deudas.md`](contexto/deudas.md). SW v740.

- **El pedido:** donde OB.1 y AH.1 hacían lo mismo, manda AH.1; de OB.1 queda solo lo que AH.1 no tenía (el conjunto del lote con su monto, los textos de lo vencido y lo de hoy, los títulos de grupo).
- **Próximo a vencer:** de 1 a 3 días pasa a la ventana de "Esta semana" (7 días, ADR 150 D1 y D4), y sale el texto "Vence en 3 días", que ninguna pantalla mostraba: lo próximo se dice "Jue 19 · en 3 días". `DIAS_COMPROMISO_PROXIMO` del motor vuelve a su propio 3: los avisos no cambian.
- **La marca de un pago:** `marcaDeCompromiso` (marcas.js) repetía la regla de `tejaDePago` con una diferencia (no leía la nota). Sale; la regla de AH.1 queda expuesta como `marcaDePago` en `infra/fila-pago.js`, `tejaDePago` la usa y `marcaDeGasto` se muda a su lado. `marcas.js` vuelve a como estaba antes de OB.1.
- **La selección de cuenta** es la hoja de AH.1c; OB.1 no le suma nada.
- Pruebas: `fila-pago.test.js` (las de la marca de un gasto, mudadas de `marcas.test.js`, más la nota), `estado-obligacion.test.js` (la semana y el umbral propio del motor).

### feat(pagos): AH.1c, la hoja para elegir la cuenta del pago · 2026-11-16

[ADR 150](DECISIONS/150-estados-de-pago-y-logos-en-inicio.md) D5. Fichas: [`contexto/calendario.md`](contexto/calendario.md) e [`inicio.md`](contexto/inicio.md). SW v739 (la v738 fue de OB.1).

- **"¿Desde qué cuenta vas a realizar el pago?"** reemplaza al selector de tarjetas con "Continuar" en los pagos sin formulario ("Marcar pagado" y el lote de Inicio con varias cuentas). Plegada: la cuenta propuesta (la habitual del pago o la de mayor saldo) con su logo de 44, su tipo y "Cambiar"; "Saldo disponible" en grande y "Después del pago te quedan $X" (o cuánto falta si no alcanza). El botón dice "Pagar $total" y la X cierra.
- **"Cambiar"** abre en la misma hoja todas las cuentas: logo de 40, nombre, saldo en grande y el círculo de marcado; la que no alcanza sola dice "No alcanza sola · faltan $X" y, elegida, sigue llevando al reparto entre cuentas.
- Piezas puras exportadas: `cuentaPropuesta`, `cuentaFrenteAlPago`, `htmlHojaCuentaPago`.
- **La cáscara de la hoja vive en `identidad.css`:** en `components/domain.css` las reglas del encabezado y del pie perdían contra las capas `modals` y `responsive`. El cuerpo (`.cuenta-pago__*`) sí va en `domain.css`.
- Pruebas: `cuenta-pago.test.js` (9). Los de `cuenta-helper.test.js` pasan sin cambios: los radios siguen siendo `cuentaId` y "Pagar" sigue siendo `data-role="confirmar"`. Unitarias 5936/5936, E2E 500/500.

### fix(pagos): OB.1, el estado de cada pago se decide una vez · 2026-11-16

[ADR 151](DECISIONS/151-el-estado-de-una-obligacion-se-decide-una-vez.md). Fichas: [`contexto/inicio.md`](contexto/inicio.md), [`contexto/deudas.md`](contexto/deudas.md). SW v738.

- **El síntoma:** con dos pagos vencidos, Atención hoy decía "2 pagos para hoy · 2 ya vencidos"; el lote abría con "Pagos para hoy" y "Vencen hoy o ya vencieron", y la cuenta se pedía "para registrar 2 pagos vencidos" aunque uno venciera hoy.
- **La causa:** el estado se decidía en cinco sitios con cinco reglas (`sentido` del aviso, `dia === new Date().getDate()`, `diasAtraso === 0`...) y el conjunto del lote se calculaba en cuatro. Las fechas ya eran de calendario local: no era la zona horaria.
- **`infra/estado-obligacion.js`:** `estadoObligacion` (vencido, hoy, próximo a 3 días, el umbral del motor), `textoEstadoObligacion` ("Venció hace N días", "Vence hoy"), el título, la frase y el desglose de un grupo, y `pagosPendientesDelMes`, el único conjunto del lote con su monto y su estado.
- **Lo leen todos:** Atención hoy (`_contenidoPagos`: el bloque se titula "Pagos vencidos", "Pagos para hoy" o "Pagos pendientes"), el lote (título del modal, filas, tarjeta), "Por pagar" (grupo, filas, chip), el panel de Inicio en los dos anchos y la banda del Calendario. "Pagar lo vencido" pasa a "Pagar los N".
- **Montos iguales:** Atención hoy y el panel de Inicio sumaban la cuota completa y el lote cobraba lo que falta tras un abono. El motor toma el monto de `pagosPendientesDelMes`, y una deuda personal sin cuota ya no sale "vencida" por $0 (el botón decía 2 y el lote abría 1).
- **Menos texto:** el intro del lote queda en "Desmarca los que aún no hayas pagado."; la selección de cuenta se titula "¿Desde qué cuenta vas a realizar el pago?" y pierde la frase "Elige la cuenta para registrar 2 pagos vencidos de $X" (`cuenta-helper.js`, dos líneas; la hoja completa llega con AH.1c). El contexto que leen la guía sin cuentas y el reparto pasa a "registrar estos pagos".
- **El servicio de un gasto:** `marcaDeGasto` lo hereda del fijo por `compromisoId` (Netflix, Disney+, HBO Max, Prime Video); `marcaDeCompromiso` lee el `marcaId` y, sin él, el nombre. Sin campo nuevo ni migración (ADR 146, alternativa 3).
- **Bug de paso:** `Number(null)` es 0; sin el chequeo de tipo una obligación sin fecha se leía "para hoy". Lo encontró la prueba nueva.
- **Queda:** lo vencido del mes pasado no entra (el conjunto es del mes en curso) y el débito sin saldo que vence hoy va en su fila pero el lote lo trae.
- **Verificado en la app** (375 px, 16 de nov): Netflix vencido 6 días, tarjeta vencida 2 días con abono de $100.000, Disney+ hoy y HBO Max en 2 días. "Pagos pendientes · Pagar los 3 · $283.800" en Atención hoy, el mismo título, filas y total en el lote, y al registrar: tres gastos, la cuenta baja $283.800 y la deuda $200.000. HBO Max queda en "Esta semana".
- Pruebas: `estado-obligacion.test.js` (nuevo), `atencion-hoy`, `avisos`, `compromisos`, `cuenta-helper` y `marcas`; E2E de `smoke` y `movil-mv2` con los textos nuevos.

### feat(inicio): AH.1b, Esta semana con logos y el tablero tal cual · 2026-11-16

[ADR 150](DECISIONS/150-estados-de-pago-y-logos-en-inicio.md) D4 y D7. Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v737 (la v736 la reservó la sesión de correcciones del lote).

- **"Esta semana":** cada fila lleva la teja de lo que vence (el logo del pago con `tejaDePago`; ingreso, préstamo y reserva, la de su sección) donde iba el recuadro del día, y cuándo en la pastilla gris de "próximo": "Jue 19 · en 3 días" (`cuandoSemana`).
- **El tablero tal cual (D7), pedido de Esteban:** "Esta semana" pierde los totales y el enlace "Calendario" del título; el pago va sin signo ("$39.900"), lo que entra conserva el "+" y su color. "Atención hoy" y su hoja ordenan pagos, tu ingreso y lo demás (`ordenarGruposAtencion`, solo en el HTML: el conteo y los grupos no cambian). "Recibiste tu ingreso el 15 de noviembre", con el mes completo.
- Rotación forzada: las entradas del 14 de noviembre pasaron a [`changelog/2026-11.md`](changelog/2026-11.md).
- Pruebas: `compromisos.test.js` (7 reescritas, 1 nueva y 2 retiradas con los totales), `atencion-hoy.test.js` (2 reescritas y 3 nuevas), E2E de "Esta semana" en `inicio-hoy`. Unitarias 5888/5888, E2E 500/500.

### feat(inicio): AH.1a, cada pago de hoy con su logo y su estado · 2026-11-16

[ADR 150](DECISIONS/150-estados-de-pago-y-logos-en-inicio.md) D1 a D3, del tablero "Finko · Atención hoy y selección de cuenta". Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v735.

- **Antes:** "3 pagos para hoy · $463.800 · 1 ya vencido" decía cuánto, no qué. Ahora "Pagos para hoy" lista cada pago con el logo de su marca, su estado en pastilla y su monto, y el botón "Pagar los 3 · $463.800" paga el lote como antes.
- **Estado con ícono y palabra:** vencido en rojo con fondo (`alert`), para hoy en ámbar (`clock`); lo vencido va primero, el más atrasado arriba. `.chip-estado` vive en `atoms.css` para que "Esta semana" y escritorio usen la misma pieza.
- **La teja es el logo:** `infra/fila-pago.js` (`tejaDePago`) toma el `marcaId` guardado, la marca que menciona el nombre ("Tarjeta Bancolombia" trae el logo del banco) o, sin marca, la teja de su categoría en el color de Por pagar. El débito sin saldo lleva el logo de la cuenta que no alcanza.
- **Tope de tres pagos** a la vista; el resto lo dice "Y N pagos más" y lo lista la hoja "Avisos de hoy", que usa las mismas piezas a 32.
- **Queda para AH.1b** lo que el tablero cambia de ADR anteriores (D7): el orden pagos, ingreso y lo demás, "15 de noviembre" con el mes completo y "Esta semana" sin totales.
- Se coordinó con la sesión "Correcciones de Atención hoy y flujo de pago": ella es dueña del contenido del lote (`_contenidoPagos`) y de los textos; esta rebanada solo pinta.
- Pruebas: `fila-pago.test.js` (7), `atencion-hoy.test.js` (4 reescritas y 5 nuevas), E2E de `smoke` e `inicio-hoy` con las pastillas. Unitarias 5886/5886.

### fix(formularios): FORM.2i, en el iPhone tocar una opción avanza · 2026-11-16

[ADR 142](DECISIONS/142-formularios-por-tarea.md) D4 y D5. Ficha: [`contexto/captura.md`](contexto/captura.md). SW v734.

- **El síntoma:** en un iPhone, Registrar gasto pasaba del monto a la categoría y ahí se quedaba: la teja quedaba elegida y no se llegaba al recibo. Lo mismo en toda pregunta de opciones de "crear por preguntas" (tipo de deuda, tipo de cuenta...).
- **La causa:** "tocar avanza, el teclado no" se decidía con `event.detail > 0`. La opción vive dentro de su `<label>`: el dedo cae en el rótulo y el navegador reenvía el clic al `<input>`. Chrome lo reenvía con `detail` 1; Safari, con `detail` 0, igual que las flechas del teclado. Reproducido en WebKit 26.4 con perfil de iPhone.
- **El cambio:** `ui/toque.js` (`vigilarToques(form)`) recuerda el rótulo recién tocado durante esa tarea; el clic reenviado a su opción cuenta como toque. Lo usan `gastos/telefono.js` y `ui/preguntas.js`, los dos sitios que leían `detail`. El teclado sigue sin avanzar.
- **Por qué no lo vio la suite:** E2E corre solo en Chromium y los unitarios despachaban el clic directo al radio con `detail` 1.
- Pruebas: `toque.test.js` (7) y el caso Safari en `gastos-telefono.test.js` y `preguntas.test.js`. Unitarias 5874/5874, E2E 500/500.

### fix(deploy): UPD.4, el JS y el CSS se revalidan siempre · 2026-11-16

Ficha: [`contexto/transversal.md`](contexto/transversal.md) (aviso de actualización). Sin bump del SW: `vercel.json` no se precachea.

- **El síntoma:** en un iPhone con la app instalada, el "+" de la barra de abajo se hundía al tocarlo y no abría nada, en todas las secciones, con la v733 ya instalada. "Más" y el primario del encabezado sí abrían. Cerrar la app del todo y volver a abrirla lo arregló.
- **Lo que se sabe:** la página en memoria tenía el `index.html` nuevo (el botón pide `registrar-segun-seccion`, NAV.D) y un `actions.js` anterior que no conoce esa acción, y el delegador ignora en silencio una acción sin registrar. El código actual abre bien en Chromium móvil y en WebKit 26.4 con perfil de iPhone, y lo publicado estaba completo (268 archivos del precache en 200).
- **Lo que no se probó:** cómo se armó la mezcla. La sospecha es la ventana de 5 minutos de `max-age=300` en `.js` y `.css`: al recargar, el HTML (`max-age=0`) se revalida y un módulo aún "fresco" se puede reusar de la memoria del navegador. Con publicaciones cada 10 a 30 minutos esa ventana se cruza fácil.
- **El cambio:** `.js` y `.css` pasan a `max-age=0, must-revalidate`, igual que el HTML. El cache que sirve la app es el del SW, así que lo único que se pierde es el atajo del cache HTTP en la primera visita sin SW. Es una mitigación: si el síntoma vuelve, la causa es otra.
- `netlify.toml` conserva `immutable` de un año para `.js` y `.css`: no es el destino de publicación, pero publicarlo ahí repetiría el bloqueo que el changelog de mayo ya registró.
- Pruebas: sin cambios en `modules/`, no hay tests que correr.

### feat(logos): BR.7b, todos los logos pesan lo mismo · 2026-11-16

README de assets/svg sección 6. Ficha: [`contexto/sistema-visual.md`](contexto/sistema-visual.md). SW v733.

- **El tamaño ya no lo da el lado mayor sino la superficie:** BR.7 llevaba todo logo a 20 de lado mayor, y un logo casi cuadrado (Prime Video, Bancolombia, Apple) se veía mucho más grande que uno largo y bajo (Disney+) y rozaba las esquinas. Ahora la caja del logo tiene la superficie de un cuadrado de 16x16, con tope de 20 en su lado mayor: un cuadrado queda en 16x16 y Disney+ sigue en 20 de ancho, como estaba.
- **Corrección por tinta:** con la misma caja, un logo macizo pesa más que uno de trazo fino. Se midió cuánto pinta cada logo (al rasterizarlo) y los que pasan del 22 % se achican a la potencia 0,35, nunca se agrandan: YouTube, Lulo, iCloud, Netflix, Duolingo, Apple.
- Los 40 archivos se rehicieron desde los originales de BR.6c, no encima de BR.7, para no acumular redondeos. Así medidos todos caben en la ficha redonda del saldo, y la reducción al 85 % de BR.7 sale.
- Pruebas: sin cambios de lógica. Unitarias 5865/5865, E2E 500/500.

### feat(logos): BR.7, todo logo llena su teja · 2026-11-16

README de assets/svg secciones 6 y 6b. Ficha: [`contexto/sistema-visual.md`](contexto/sistema-visual.md). SW v732.

- **La retícula de 24 es la teja:** `tejaMarca()` pinta los `b-*` al 100 % (`.bank-avatar__glifo--logo`, con la teja recortando sus esquinas) en vez del 62 %. Los íconos de Finko (`i-*`, Efectivo) siguen al 62 %.
- **Los 40 archivos de `logos/` se normalizaron** separando fondo y logo: el fondo va de borde a borde como rectángulo (el cuadrado redondeado de Disney+, el círculo de Spotify y el de Claro pasan a rectángulo con su mismo relleno) y el logo se escala sin deformar a 20 de lado mayor, centrado. Las siluetas de Simple Icons, que llenaban los 24, bajan a 20. Las coordenadas van horneadas (el sync no admite `transform`) y los degradados del logo se movieron con él. Se borraron las líneas invisibles de AV Villas y Banco de Occidente.
- **ChatGPT y Apple TV+** tenían el logo recortado del fondo negro, mostrando la teja blanca por los huecos: ahora el fondo es negro de borde a borde y el logo va en blanco; su teja pasa a negra. Disney+ toma de color de teja el tono medio de su degradado.
- En la ficha redonda de cuentas del saldo el logo va al 85 % para que el círculo no le corte las esquinas.
- Pruebas: `marcas.test.js` (los colores de teja nuevos y la clase del logo). Unitarias 5865/5865, E2E 500/500.

### refactor(presupuesto): INI.1, se retira el panel de alertas de límites de Inicio · 2026-11-16

[ADR 149](DECISIONS/149-inicio-centro-de-atencion-rapida.md) D2. Fichas: [`contexto/inicio.md`](contexto/inicio.md), [`contexto/limites.md`](contexto/limites.md). SW v731.

- `renderPanelLimites()`, sus cuatro llamadas en `presupuesto/index.js`, el CSS `.limites-card` y su prueba unitaria (el ícono de una categoría propia en la alerta) salen: desde INI.1 no tenían contenedor. El límite pasado en Inicio lo dice "Novedades", con la teja de Límites.
- Unitarias 5864/5864, E2E 500/500.

### feat(inicio): INI.1, Inicio como centro de atención rápida · 2026-11-16

[ADR 149](DECISIONS/149-inicio-centro-de-atencion-rapida.md), que cambia el [099](DECISIONS/099-inicio-movil-hoy-en-una-lista.md) D1 y revisa una alternativa rechazada del [066](DECISIONS/066-motor-unico-de-avisos.md). Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v730.

- **Cuatro bloques en orden de urgencia:** Atención hoy, Esta semana, Por completar y Novedades. Los dos nuevos van en los dos anchos con las filas de Atención hoy, cuyas reglas salen del `@media` de `responsive.css`; aparecen solo con algo que decir.
- **Novedades** (`TIPOS_NOVEDAD`): límite pasado o al 75 %, reserva lista, meta alcanzada, respaldo atrasado y suscripciones. Salen de "Atención hoy" y de `#panel-avisos`; `#panel-limites` sale del DOM. "Nada que atender hoy" ya no promete "ningún límite pasado".
- **Por completar** (`infra/pendientes.js`, fuera del motor de avisos): gastos en Otros sin nota ni descripción de los últimos 30 días (la fila abre el más reciente con `editar-gasto`) y la pregunta de gusto o necesidad del ADR 147 con sus dos respuestas. No se pregunta sobre "Otros" a secas.
- **`meta-alcanzada`**: aviso nuevo del motor, severidad baja, siete días desde el último aporte de la meta cumplida (`fechaMetaAlcanzada`). Sin dato nuevo ni migración; sin interruptor en Ajustes.
- Pruebas: `por-completar.test.js` y `meta-alcanzada.test.js` (25), `atencion-hoy.test.js` con Novedades, E2E `inicio-atencion.test.js` (7); se ajustan `resumen.test.js`, `inicio-hoy.test.js` y `smoke.test.js` (DSK.1c y el panel de avisos). Unitarias 5865/5865, E2E 500/500 (el intermitente "dos dispositivos abiertos" de `nube.test.js` falló en la corrida completa y pasó en la suya, 6/6).

### feat(logos): BR.6c, Disney+ con su ícono nuevo · 2026-11-15

Ficha: [`contexto/sistema-visual.md`](contexto/sistema-visual.md). SW v729.

- Esteban rediseñó el logo: cuadrado de esquinas redondeadas con degradado verde azulado y el wordmark en blanco. Como el fondo ya no es plano, la teja pasa de negra a blanca (`MARCAS`: `color` `#ffffff`, `texto` `#000000`), igual que ChatGPT y Apple TV+: con teja negra se verían cuatro esquinas negras alrededor del ícono.

### feat(nav): NAV.D, el botón central registra según la sección · 2026-11-15

[ADR 148](DECISIONS/148-el-boton-central-registra-segun-la-seccion.md), que revisa el [024](DECISIONS/024-reorganizacion-navegacion-movil.md) D1. Ficha: [`contexto/escritorio.md`](contexto/escritorio.md) (shell). SW v728.

- **Sin mapa nuevo:** el "+" de la barra de abajo dispara el primario del encabezado de la sección activa (`altaDeSeccion()` en `ui/shell.js`), el mismo botón que ya copia la barra superior. Gastos, Por pagar, Límites, Mis cuentas, Me deben, Metas, Reservas e Inversión quedan cubiertas sin nombrarlas; el Fondo es la única excepción escrita (aportar o, sin fondo, empezarlo).
- **Por pagar** hereda lo que ya hacía su botón: con el filtro en "Gastos fijos" abre el gasto fijo, en "Deudas" la deuda, y en "Todo" el selector de tipo.
- **Donde no hay alta** (Inicio, Movimientos, Calendario, Análisis, Ajustes) o el primario está oculto, abre la hoja de siempre. "Registrar" de la barra superior y la tecla N no cambian.
- **Costo aceptado por Esteban:** en las secciones con alta, registrar un gasto ya no está a un toque del botón central.
- El `aria-label` del botón sigue a la sección; el rótulo visible sigue siendo "Registrar".
- Pruebas: `boton-central.test.js` unitario (31) y E2E (16). Unitarias 5833/5833, E2E 493/493.

### feat(logos): BR.6b, Apple Music, Apple TV+, Deezer, Paramount+ y Spotify · 2026-11-15

Segunda tanda de BR.6, mismo proceso de conversión. Ficha: [`contexto/sistema-visual.md`](contexto/sistema-visual.md). SW v727.

- **Tres tratamientos según el archivo:** Paramount+ y Spotify a color con su fondo; Apple TV+ (cuadrado negro con "tv" recortado, como ChatGPT) y Deezer (onda morada sin fondo) a color sobre teja blanca, porque sobre su color corporativo el recorte o la onda desaparecen; Apple Music llegó negra y sin color, así que va como silueta monocroma sobre su rojo, igual que Apple y Claude.
- **Spotify** deja la silueta de Simple Icons (glifo negro sobre verde) por el círculo verde con ondas blancas de Esteban.
- **Paramount+** es fiel pero a 32px el wordmark se lee poco: es el límite del logo horizontal en una teja cuadrada.
- **Siguen con iniciales** YouTube Music y Amazon Music.
- Pruebas: el test de "marca sin símbolo" de `marcas` usa una entrada sintética para no romperse con cada vector nuevo; los de agenda y compromisos pasan de Deezer a YouTube Music. Unitarias 5802/5802, E2E 477/477.

### feat(logos): BR.6, siete logos a color de Esteban entran a la biblioteca · 2026-11-15

[ADR 025](DECISIONS/025-logotipos-de-marca-y-tejas.md) y [027](DECISIONS/027-logos-de-marca-a-color-excepcion-monocromo.md). Ficha: [`contexto/sistema-visual.md`](contexto/sistema-visual.md). SW v726.

- **ChatGPT, Claro, Disney+, Prime Video, Rappi, Tigo y Xbox** reemplazan sus plantillas. Llegaron como exports de Illustrator en lienzos de 1920x1080 a 2500x2500 con clases CSS, y el sync exige 24x24: se escalaron a la retícula, se hornearon a atributos (`fill` y `stroke` explícitos, `fill-rule` donde el original lo trae) y el degradado de Disney+ se recalculó sin `gradientTransform` (id `disneyplus-g0`). Las formas no se redibujaron; solo se quitaron un path invisible y subpaths de un punto en Disney+ y cinco capas idénticas apiladas en ChatGPT.
- **Tamaño dentro de los 24:** el lado mayor del contenido mide 20 (Xbox 19; Claro y ChatGPT llenan los 24 porque su círculo y su cuadrado son el contenedor). El fondo, cuando lo hay, es un `rect` 24x24.
- **El `color` de la teja es el fondo del archivo**, no el corporativo anterior: Claro `#cc2229`, Tigo `#27348b`, Rappi `#f04e46` (antes `#FF441F`, del theme-color del sitio), Prime Video `#0c7aff`, Xbox `#0f7c10`, Disney+ `#000000`. ChatGPT es un cuadrado negro con el nudo recortado, así que va sobre teja blanca. Un `color` distinto del fondo deja un marco alrededor del logo; un test lo fija.
- **Siguen con iniciales y sin archivo** Paramount+, Apple TV+, Apple Music, YouTube Music, Amazon Music y Deezer.
- Pruebas: tres tests usaban ChatGPT y Claro como ejemplo de "marca sin glifo" y ahora usan Deezer; test nuevo en `marcas` con símbolo y color de teja de los siete. Unitarias 5802/5802, E2E 477/477.

### feat(avisos): SUS.1c, pagas varias suscripciones: ¿las usas todas? · 2026-11-15

[ADR 146](DECISIONS/146-finko-reconoce-el-tipo-de-gasto.md) D6 (con su nota de implementación). Ficha: [`contexto/inicio.md`](contexto/inicio.md). Schema v54, SW v725.

- **Tipo nuevo del motor**, `suscripciones-varias`: con 3 o más fijos activos de Streaming y Suscripciones, cuántas plataformas son (por `marcaId`), cuánto suman al mes (una anual por su doceava parte) y al año. Severidad baja: nunca despierta el teléfono. Va con el interruptor de "Deudas y pagos fijos".
- **En Atención hoy** tiene su propia fila (no entra al lote de pagar): "Pagas 4 suscripciones · $200.700 al mes, $2.408.400 al año. ¿Las usas todas?". En Inicio de escritorio, el rótulo de la fila es el botón.
- **"Revisarlas"** lleva a Por pagar y calla el aviso hasta el mes siguiente (`config.suscripcionesRevisadas`): sin fecha, el aviso saldría todos los días.
- Pruebas: `avisos` (6), `atencion-hoy` (2), `resumen` (1), `storage` (1). Unitarias 5801/5801, E2E 477/477.

### feat(gastos): SUS.2d, corregir el gusto o la necesidad y ver lo aprendido · 2026-11-15

[ADR 147](DECISIONS/147-gusto-o-necesidad-hormiga-sin-adivinar.md) D1. Cierra SUS.2. Fichas: [`contexto/gastos.md`](contexto/gastos.md), [`contexto/limites.md`](contexto/limites.md). SW v724.

- **En el gasto** (hoja de escritorio y ficha del teléfono): "¿Es un gusto o algo que necesitas?" dice qué cree Finko de su concepto y deja corregirlo con un toque; la respuesta vale para todo el concepto. Si el gasto tenía su propia respuesta (Otros), cambia también. El pago de un fijo o de una deuda no lo trae.
- **En Límites**, debajo de los gustos pequeños: "Lo que le contaste a Finko (N)", plegado, con "Cambiar" y "Olvidar" por concepto. Olvidar devuelve la decisión a la categoría y Finko vuelve a preguntar si se repite.
- **Un solo escritor** de lo aprendido en Gastos (`_guardarRespuesta`) con "Deshacer", y `conRespuesta()` en infra para cambiar sin mutar.
- **Rotación forzada**: las entradas del 13 de noviembre pasan a [`changelog/2026-11.md`](changelog/2026-11.md).
- Pruebas: `caracter-gasto` (4), `gastos-telefono` (1), `hormiga-limite` (3). Unitarias 5791/5791, E2E 477/477.

### feat(gastos): SUS.2c, "¿es un gusto o algo que necesitas?" y lo que Finko aprende · 2026-11-15

[ADR 147](DECISIONS/147-gusto-o-necesidad-hormiga-sin-adivinar.md) D1. Fichas: [`contexto/gastos.md`](contexto/gastos.md), [`contexto/limites.md`](contexto/limites.md). Schema v53, SW v723.

- **La tarjeta del aviso de Gastos pregunta primero**: el concepto "depende" que se repite, sin respuesta, y que más suma en el mes (`preguntaHormiga()`). "Domicilio: ¿es un gusto o algo que necesitas? Va 3 veces este mes y suma $49.000". Nunca dice "hormiga".
- **La respuesta se guarda por concepto** (`config.hormiga.conceptos`) y manda sobre la categoría y la subcategoría, para lo de antes y lo de después: "Lo necesito" lo saca de las cinco cifras; "Es un gusto" lo hace contar aunque sea una sola vez. El aviso trae "Deshacer".
- **Arreglo de paso**: guardar el límite de gustos pequeños reemplazaba `config.hormiga` entero y habría borrado lo aprendido.
- Pruebas: `caracter-gasto` (5), `gastos` (4 nuevas, 1 ajustada), `gastos-telefono` (1), `hormiga-limite` (1, archivo nuevo, falla sin el arreglo), `storage` (1 nueva, 2 ajustadas), E2E `smoke` (la tarjeta pregunta y "Es un gusto" la vuelve aviso). Unitarias 5784/5784, E2E 477/477.

### feat(gastos): SUS.2b, hormiga es lo pequeño que es un gusto · 2026-11-15

[ADR 147](DECISIONS/147-gusto-o-necesidad-hormiga-sin-adivinar.md) D6. Fichas: [`contexto/limites.md`](contexto/limites.md), [`contexto/aprende.md`](contexto/aprende.md), [`contexto/logros.md`](contexto/logros.md). SW v722.

- **La regla nueva vive en un solo lugar** (`gastosHormiga()` en `infra/hormiga.js`): pequeño (el tope de siempre) y gusto, o "depende" y repetido 3 veces en 30 días por concepto. Una necesidad nunca cuenta, ni el pago de un fijo o una deuda.
- **El concepto** es la subcategoría, o la primera palabra de la nota sin tildes ni plural ("Helados de mora" y "helado" son lo mismo), o la categoría sola.
- **Se mira sobre todo el historial**: una racha que cruza el cambio de mes cuenta en los dos, y los dos primeros de una serie cuentan cuando llega el tercero.
- **Las cinco superficies leen lo mismo**: el aviso de Gastos ("Gustos pequeños: X"), Análisis, el sobre de Límites (ahora "Gustos pequeños"), Aprende y el logro "Hormiga a raya". Las categorías propias pasan con su carácter.
- **Lo viejo dice lo que era**: un gasto en "Gastos hormiga" es gusto; Vivienda, Servicios públicos, Alimentación y Ahorro, necesidad.
- **Las lecciones del niño no cambian**: sus tarjetas siguen clasificando por tamaño (`esGastoPequeno`, antes `esGastoHormiga`).
- Pruebas: `caracter-gasto` (10 nuevas de la regla), 15 ajustadas en `aprende`, `gastos`, `logros`, `presupuesto` y `analisis` (sus datos usaban categorías que ahora son necesidad). Unitarias 5772/5772, E2E 477/477.

### feat(gastos): SUS.2a, Mecato, subcategorías y "¿gusto o necesidad?" · 2026-11-15

[ADR 147](DECISIONS/147-gusto-o-necesidad-hormiga-sin-adivinar.md) (reemplaza el criterio "hormiga es solo el monto" del ADR 032 D4 y el 092 D11). Fichas: [`contexto/gastos.md`](contexto/gastos.md), [`contexto/categorias.md`](contexto/categorias.md). Schema v52, SW v721.

- **Mecato**, categoría nueva de carácter gusto, con la hormiga como ícono hasta tener su glifo (`c-tienda` ya es de las categorías propias).
- **Cada categoría y subcategoría dice su carácter** (`CARACTER_CATEGORIA_GASTO`, `SUBCATEGORIAS_GASTO`): 54 subcategorías en 13 categorías, validadas con Esteban. `caracterDeGasto()` resuelve: lo contestado, la subcategoría, la categoría propia, la nativa, "depende". Todavía no lo lee ninguna cifra: eso es SUS.2b.
- **"Sé más específico"** debajo de las categorías en escritorio; en el teléfono, una fila opcional del recibo con su mini-hoja, así tocar una categoría sigue llevando directo al recibo.
- **En Otros se pregunta "¿Es un gusto o una necesidad?"** y queda en el gasto; en una categoría propia, en la categoría, una sola vez. Las recargas van en Otros y se contestan así, sin categoría propia.
- **La fila se titula con la subcategoría** cuando no hay nota ("Helado", debajo "Mecato · Nequi"); "Repetir" y editar la conservan.
- Pruebas: `caracter-gasto` (20, archivo nuevo), `gastos-telefono` (4 nuevas), `storage` (1 nueva). Unitarias 5762/5762, E2E 477/477.

### feat(gastos): SUS.1b, el chip "Gastos hormiga" sale del formulario · 2026-11-15

[ADR 146](DECISIONS/146-finko-reconoce-el-tipo-de-gasto.md) D5. Fichas: [`contexto/gastos.md`](contexto/gastos.md), [`contexto/limites.md`](contexto/limites.md). SW v720.

- **Hormiga ya no se declara**: el formulario de gasto (escritorio y teléfono) deja de ofrecer la categoría. Un café de $6.500 cuenta como gasto pequeño en su propia categoría, por monto (`infra/hormiga.js`).
- **Lo guardado no se pierde**: la categoría sigue en `CATEGORIAS_GASTO`, así que los gastos viejos conservan su ícono y sus topes se siguen mostrando. Mismo tratamiento que Vivienda en CAT.1a.
- **Límites explica en vez de pedir un tope imposible**: un gasto viejo en "Gastos hormiga" sale en "Gastas acá y no tiene tope" con "Se controla en Gastos pequeños".
- Pruebas: `constants` (1 ajustada), `gastos` (1 nueva), `presupuesto` (2 nuevas). Unitarias 5737/5737, E2E 477/477.

### feat(compromisos): SUS.1a, la plataforma de cada suscripción · 2026-11-15

[ADR 146](DECISIONS/146-finko-reconoce-el-tipo-de-gasto.md) (ejecuta las fases 0 y 1 del [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md) con la forma del [ADR 064](DECISIONS/064-estructura-de-dos-niveles.md)). Ficha: [`contexto/deudas.md`](contexto/deudas.md). Schema v51, SW v719.

- **El catálogo por fin tiene tags** (`MARCAS[].categorias`) y cada categoría de fijo dice cuáles ofrece (`TAGS_CATEGORIA_AGENDA`): Streaming une video y música; Suscripciones, IA, nube, juegos, educación y domicilios; Telefonía e Internet, los operadores. `iCloud` y `Google` estrenan el tag `nube`.
- **Seis plataformas nuevas con iniciales** hasta tener su vector: Paramount+, Apple TV+, Apple Music, YouTube Music, Amazon Music y Deezer. Las compuestas van antes que su genérica: "YouTube Music" ya no resuelve a YouTube.
- **El nombre de cada marca resuelve a sí misma** (test que recorre el catálogo): por eso el fijo con plataforma se llama "Netflix" y Calendario, Por pagar y Distribuir pintan su logo sin tocarlos.
- **Al editar un fijo de antes**, el selector propone la plataforma que su nombre o su nota ya mencionan; se guarda solo si el usuario guarda. La migración v51 no inventa `marcaId`.
- **En el teléfono**, elegir una categoría con plataformas baja la hoja hasta el selector, y el resumen dice "Streaming · Netflix" (`data-resumen-valor`).
- **Rotación forzada**: las cuatro tandas de Consultar del 13 pasan a [`changelog/2026-11.md`](changelog/2026-11.md).
- Pruebas: `marcas` (11 nuevas), `compromisos` (11 nuevas), `storage` (2 nuevas), E2E `smoke` (1 nueva: elegir Netflix, verlo en el Calendario y reabrirlo elegido). Unitarias 5734/5734, E2E 477/477.

### feat(nino): APR.5b, la ronda 2 de Tino y los hitos del niño · 2026-11-15

Nota del [ADR 095](DECISIONS/095-tino-en-el-sprite.md) (la ronda 2 por el conversor) y [ADR 094](DECISIONS/094-tino-el-guatin.md). Ficha: [`contexto/nino.md`](contexto/nino.md). SW v718.

- **Cuatro poses al sprite** (`assets/svg/ilustraciones/`, `scripts/sync-sprite.py`): pensando, reserva, sembrar y compartir, de 7 a 15 KB cada una. El conversor ganó soporte de `polygon`, cuatro roles de color (`--fk-tino-verde`, `-hoja`, `-celeste`, `-gris`, en `themes.css`) y el encaje por ancho de las poses anchas.
- **Cada unidad explica con su pose** (`poseTinoDeUnidad()`): "Lo que necesito y lo que quiero" piensa, "Compartir y ayudar" comparte, "Guardar para lo que no esperas" se cubre de la lluvia y "¿Por qué crece mi dinero?" siembra. En la lección y en la ruta.
- **Tino piensa** con las tres preguntas de ubicación y **siembra** en el premio por ahorrar.
- **Dos hitos con destellos**: la meta lograda y la ruta terminada ("Terminaste tu ruta", con "Ver mi ruta") celebran en grande.
- **"Meta cumplida" no entra al sprite**: no baja de 18,8 KB sin deformarse y el tope es 16. El adulto la sigue usando como imagen.
- Pruebas: `nino` (3 nuevas y 1 ajustada: la meta lograda celebra en grande), `nino-visual` (2 nuevas y 1 ajustada: la lista de poses). Unitarias 5710/5710, E2E 476/476 (la intermitente de `nube.test.js` pasó en su reintento).

### feat(ahorro): HF.1c, la fecha de cada aporte a metas y reservas · 2026-11-15

[ADR 145](DECISIONS/145-los-aportes-de-metas-y-reservas-tienen-fecha.md) (aplica la R-HF2 del 091 a la última ruta sin fila y resuelve V5 del 083). Fichas: [`contexto/metas.md`](contexto/metas.md), [`contexto/apartados.md`](contexto/apartados.md), [`contexto/movimientos.md`](contexto/movimientos.md). Schema v50, SW v717.

- **`aportes[]` en metas y reservas** (`{ id, fecha, monto, cuentaId, origen? }`): una fila por cuenta del reparto; sin cuentas, una sin cuenta; lo de Distribuir lleva la cuenta de origen y `origen: 'distribucion'` (`filasDeAporte()`, `infra/crud.js`).
- **Migración v49 a v50 idempotente**: pone `aportes: []` y conserva los válidos. No inventa filas: lo que ya había es saldo de apertura (I4 del 091).
- **Movimientos gana dos fuentes**: "Aporte a {nombre}", neutras como la transferencia, con su cuenta; `efectoEnCuenta()` las resta, así el saldo de cada cuenta vuelve a ser apertura más filas. Chip de filtro "Metas".
- **"Ya lo usé" registra el gasto** (V5): lo liberado queda en "Otros" con el nombre de la reserva, `apartadoId` y `sinEfectoSaldo` (ese dinero salió al aportarlo). El diálogo lo avisa; la categoría se cambia en Gastos.
- Fuera: borrar o editar un aporte, el dinero de una meta o reserva borrada, elegir la categoría en el diálogo.
- Pruebas: `aportes-bolsas` (15 nuevas: filas, fuentes, efecto en cuenta, gasto de la reserva, migración y R-HF2 con los manejadores reales). Unitarias 5705/5705, E2E 476/476 (la intermitente de `nube.test.js` falló bajo carga y pasó aislada dos veces).

### docs(contexto): cuatro fichas vuelven bajo su techo de 40 KB · 2026-11-15

Regla de la skill `cerrar-tarea` (sección 4): superar el techo obliga a podar o a partir por eje real.

- **`inicio.md` (55 KB a 39 KB)**: los bloques de escritorio (IN.9 y DSK.1, con sus trampas y riesgos) se mudan sin cambios a [`contexto/escritorio.md`](contexto/escritorio.md), sección "Inicio en escritorio": ese es su eje. Inicio deja un puntero.
- **`inicio.md`, `deudas.md`, `sistema-visual.md` y `gastos.md`**: los hitos más viejos de "Cambios realizados" (julio y agosto) se resumen en una línea por bloque, con sus IDs y el enlace al mes de [`changelog/`](changelog/) donde está el detalle. No se borra nada que no esté en el CHANGELOG.

### docs(decisiones): BUG-027, el ADR 059 se reconstruye · 2026-11-15

Cierra **BUG-027**: el [ADR 059](DECISIONS/059-interfaz-de-escritorio.md) (interfaz de escritorio, iniciativa INT.1) se citaba como aceptado desde el 2026-08-02 y nunca se había commiteado. Ficha: [`contexto/escritorio.md`](contexto/escritorio.md).

- **Reconstruido desde los cierres de INT.1a a INT.1h** (`changelog/2026-08.md`), la ficha de escritorio y las citas "ADR 059 Dn" del código. Conserva número y fecha de aceptación: el código lo cita en siete archivos y un ADR nuevo las dejaría apuntando a nada.
- **No inventa decisiones**: dice qué no se pudo recuperar. D1, D2 y D5 se citan siempre juntos y no se sabe cómo se repartían entre las piezas de la barra; D4 no lo cita nadie por número y se infiere (los atajos de INT.1h son la única rebanada sin decisión).
- **Enlaces reparados**: el ADR 084 apuntaba a un archivo que nunca existió; el 065 y el 076 lo citaban sin enlace. `BUGS.md` queda sin errores abiertos.

### feat(cuentas): HF.2a, la cuenta habitual de cada pago · 2026-11-15

R-HF5 del [ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md): se deriva, no se pide. Fichas: [`contexto/calendario.md`](contexto/calendario.md), [`contexto/deudas.md`](contexto/deudas.md). SW v716.

- **`cuentaHabitualDe()`** (`infra/cuenta-helper.js`): la cuenta del último pago del compromiso, sin campo nuevo. A igual fecha, la de mayor monto (un pago repartido); una compra con la tarjeta no cuenta (BUG-037); si esa cuenta ya no está activa, no adivina con un pago más viejo.
- **"Marcar pagado"** del gasto fijo y **el abono** a una deuda abren en esa cuenta aunque otra tenga más saldo. **El lote** también, si todos sus pagos comparten la misma.
- Sin pagos previos, todo queda como antes: la cuenta de mayor saldo.
- Pruebas: `cuenta-helper` (8 nuevas: la derivación y el selector), `compromisos` (2: el segundo abono abre con la cuenta del primero). Unitarias 5690/5690, E2E 476/476 (la intermitente de `nube.test.js` falló una vez y pasó aislada).

### feat(avisos): HF.2b, el débito automático sin saldo se avisa antes · 2026-11-15

Nota del [ADR 052](DECISIONS/052-pagos-automaticos.md) (resuelve PA.1c) y acotación del D2 del [ADR 099](DECISIONS/099-inicio-movil-hoy-en-una-lista.md). Fichas: [`contexto/calendario.md`](contexto/calendario.md), [`contexto/transversal.md`](contexto/transversal.md). SW v715.

- **Aviso `debito-sin-saldo`**: un débito automático de hoy a tres días cuya cuenta no alcanza. Severidad `alta` (interrumpe con la notificación activada), sección `compromisos`. Reemplaza al "vence en N días" del mismo pago.
- **El saldo se consume en cascada**: primero lo vencido sin registrar, después lo próximo por fecha. La cascada de la hoja "Pagos automáticos" pasa a `resolverDebitosContraCuentas()` (`agenda/logic.js`) y la usan los dos.
- **Estados derivados** (`estadosDebitosAutomaticos()`): `esperado`, `sin-saldo`, `sin-cuenta`, `registrado`. No se guardan.
- **"Atención hoy"** lo muestra aunque la fecha sea futura, en su propia fila: "Nequi no alcanza para Netflix · Se debita en 3 días · faltan $25.000", con "Ver tus cuentas". En escritorio va en el panel de avisos con su rótulo ámbar. La notificación: "Nequi no alcanza para Netflix, que se debita en 3 días".
- Fuera: el aviso del débito sin cuenta y el estado en el Calendario.
- Pruebas: `agenda` (17 nuevas), `avisos` (11), `atencion-hoy` (4), `notificaciones` (2). Unitarias 5680/5680, E2E 476/476.

### perf(arranque): PERF.16, el arranque bajo 400 ms y entrar a Fondo · 2026-11-15

Cifras y método en [`scripts/perf/BASELINE.md`](../scripts/perf/BASELINE.md) (sección PERF.16). Ficha: [`contexto/transversal.md`](contexto/transversal.md). SW v714.

- **Un overlay cerrado y sin abrir nunca no se maqueta por dentro** (`content-visibility: hidden`): los 40 con sus formularios eran ~310 ms del arranque. `despertarOverlay()` lo devuelve al render antes de abrirlo y conserva la animación. El arranque baja de 675 a 350 ms bloqueados a 4x.
- **Registrar, "Más" y el formulario de gasto se despiertan en idle**: su primera apertura no paga nada.
- **Los aportes de Fondo fuera de pantalla no se estilizan** (`content-visibility: auto`): el tab Ahorro baja de 359 a 194 ms de respuesta.
- **Lighthouse en producción da 100 en las cuatro**: el 91 de MV2.28 era la conexión en frío de la primera corrida. `lighthouse.js` audita `127.0.0.1`.
- Queda en el borde el formulario de gasto (INP entre 160 y 192 ms a 4x), sin tocar.
- Rotación forzada: las cinco tandas de Ahorro del 13 pasan a [`changelog/2026-11.md`](changelog/2026-11.md).
- Pruebas: `modales` (5 nuevas). Unitarias 5646/5646, E2E 476/476.

### perf(fluidez): MV2.28, medir lo publicado y devolver el cambio de sección · 2026-11-15

Cifras y método en [`scripts/perf/BASELINE.md`](../scripts/perf/BASELINE.md) (sección MV2.28). Ficha: [`contexto/transversal.md`](contexto/transversal.md). SW v713.

- **Se midió producción** contra el commit de PERF.12 en la misma máquina: `fluidez.js --url` y `lighthouse.js` con dirección. El instrumento se colgaba con el tab Ahorro (hoy abre Fondo): ya no, y cada interacción tiene tope.
- **Cambiar de sección reestilizaba toda la página** (2.295 elementos en vez de 260): `html:has(.section.active .bloque-tabs)` le cambiaba el estilo a la raíz al navegar. El `scroll-padding-top` queda fijo en móvil. Entrar a Gastos baja de 274 a 189 ms de respuesta a 4x; a Inicio, de 193 a 109.
- **Abrir "Más" ya no recorre el historial en el toque**: el último movimiento y la salud van memoizados y se precalientan en idle (INP 104 a 72 ms).
- **El arranque no lee layout a mitad del script**: `initTeclado()` y el color de la barra esperan un cuadro.
- **Lo que sigue sobre su umbral va a PERF.16**: el arranque (675 ms bloqueados en local y 918 en producción, contra 400), entrar a Fondo y el Speed Index de Lighthouse (Performance 91 en producción; las otras tres en 100).
- Pruebas: `menu-mas` (4 nuevas), `teclado` (1 nueva). Unitarias 5641/5641, E2E 476/476.

### feat(avisos): HF.3e, lo que Finko muestra fuera de la app · 2026-11-15

[ADR 144](DECISIONS/144-lo-que-finko-muestra-fuera-de-la-app.md) (acota los ADR 063 y 066, cierra el diferido del ADR 040) y su resolución en implementación. Ficha: [`contexto/transversal.md`](contexto/transversal.md). SW v712.

- **Con candado, la notificación no dice qué ni cuánto**: "Tienes 2 avisos en Finko · Ábrela para verlos", sin nombre, cifra ni emoji. Con el ojo puesto y sin candado nombra el aviso sin la cifra (`formatearAvisoSistema(aviso, total, { candado, oculto })`).
- **El número del ícono** (`navigator.setAppBadge`) cuenta los avisos `urgente` y `alta` de las secciones encendidas, solo con los recordatorios activados; se limpia en cero. Se recalcula al abrir, en `state:change` y `state:save` (una vez por cuadro) y al volver a la app. Notificación y número leen la misma lista (`avisosQueNotifican()`).
- **Tocar la notificación abre la sección del aviso** (`data.url` y `notificationclick` en el SW): enfoca la app abierta y cambia el hash, o la abre ahí. No hay ruta por elemento.
- **Cuatro accesos directos** en `manifest.json`: Hoy, Por pagar, Registrar gasto y Registrar ingreso. `?accion=` es lista cerrada (`ui/accion-arranque.js`), se borra de la dirección al leerla y se ejecuta tras el candado y la aceptación legal, antes de novedades y débitos.
- **El SW sirve el shell de `/` a una navegación con query**: guardar `/?accion=...` aparte lo habría dejado viejo tras el traspaso de `activate`.
- El nav no lleva número: dentro de la app Inicio ya abre en "Atención hoy" (nota del ADR 040 en el tablero).
- Rotación forzada: las entradas del 6 de noviembre pasan a [`changelog/2026-11.md`](changelog/2026-11.md).
- Pruebas: `fuera-de-la-app` (20 nuevas: el copy con candado y ojo, `verificarYNotificar` con `data.url`, el número con sus casos, la ruta por sección, el SW con su `notificationclick` y la navegación con query, el manifiesto y `?accion=`); E2E `accesos-directos` (4 nuevas, una con el PIN antes del formulario). Unitarias 5636/5636, E2E 476/476.

### feat(movimientos): REV.3a, descargar el mes para Excel · 2026-11-15

[ADR 138](DECISIONS/138-la-poda-del-tablero-del-13-de-noviembre.md) D3 y su resolución en implementación. Fichas: [`contexto/movimientos.md`](contexto/movimientos.md), [`contexto/configuracion.md`](contexto/configuracion.md). SW v711.

- **Cada divisor de mes trae su botón de descarga**: `finko-movimientos-YYYY-MM.csv` con Fecha, Descripción, Categoría, Cuenta, Entrada y Salida, de la más vieja a la más reciente. Separador `;` y BOM UTF-8: así Excel en español lo abre en columnas y con tildes.
- **Baja lo que la lista muestra de ese mes, filtros incluidos** (`movimientosVisibles()`, que ahora usa también el render). Entrada menos Salida da el neto del divisor: lo `neutro` (transferencia, aporte al fondo) va con su monto en la descripción, no en las columnas.
- **Ajustes conserva su CSV, renombrado** a "Exportar gastos en CSV · Para volver a importarlos": el formato del mes no se reimporta. La descarga de los dos vive en `infra/csv.js` `descargarCSV()`.
- El botón mide 40 px en escritorio y 44 en el teléfono: `.btn-icon.btn-sm` lo bajaba a 32 de ancho, y la regla lleva `.btn-icon` en el selector.
- Pruebas: `movimientos-excel` (10 nuevas: columnas, orden, mes, transferencia, el neto contra `sumaDeMovimientos`, BOM y comillas, relectura con `parsearCSV`, el botón por mes y la descarga con un filtro puesto); `config` (1 ajustada: el texto de la fila). Unitarias 5616/5616, E2E 472/472 (en el puerto 8091: el 8081 de esta máquina quedó con sockets que escuchan sin proceso y cuelgan peticiones al azar).

### feat(movimientos): HF.1d-2, Distribuir deja su ingreso y sus transferencias (ADR 143 D6) · 2026-11-15

[ADR 143](DECISIONS/143-todo-cambio-de-saldo-deja-registro.md) D6 y su resolución en implementación; cierra HF.1d. Fichas: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md), [`contexto/calendario.md`](contexto/calendario.md). SW v710.

- **El cobro que acredita Distribuir sale en Movimientos**: un `IngresoPuntual` por ocurrencia recibida, en su fecha, con `ingresoId`, `origen: 'distribucion'` y `repartido: true` (`registrosDelCobroDistribuido`). Lo que había acreditado la hoja no se registra otra vez: su fila queda `repartido`.
- **Lo que mueve entre cuentas también**: Estilo de vida y el complemento del déficit quedan como `transferencias` con la nota "Distribuir mi ingreso" (`transferenciasDeLaDistribucion`). "Deshacer" quita las filas con el saldo.
- **La fila es el sello**: la hoja de créditos descarta la ocurrencia que escribió Distribuir, no el mes (la segunda quincena sigue saliendo), y el asistente no propone lo `repartido`. `config.cobrosDistribuidos` ya no se escribe; se lee para lo repartido antes (convertirlo inventaría historial, I4).
- **Sin fecha datable** la fila es de hoy y va ligada al ingreso principal, para que la renta no la cuente encima del ingreso fijo (BUG-039).
- Pruebas: `registro-saldo` (R-HF2 de Distribuir, con deshacer), `tesoreria` (9: las filas y las transferencias), `agenda` (3: la hoja con la fila de Distribuir); E2E `distribucion-credito-automatico` (2 ajustadas: Distribuir sí deja `IngresoPuntual`, y lo repartido se lee de las filas).

### feat(movimientos): HF.1d-1, todo cambio de saldo deja registro (ADR 143) · 2026-11-15

[ADR 143](DECISIONS/143-todo-cambio-de-saldo-deja-registro.md), que aplica la R-HF2 del [ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md) y cierra su riesgo 10. Fichas: [`contexto/movimientos.md`](contexto/movimientos.md), [`contexto/me-deben.md`](contexto/me-deben.md), [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md). Schema v49. SW v709.

- **La regla que se prueba**: el saldo de hoy de una cuenta es su saldo de apertura más sus filas de Movimientos. `efectoEnCuenta(movimientos, cuentaId)` las suma (la transferencia resta lo enviado más su 4x1000 del origen; el gasto importado no cuenta) y `registro-saldo.test.js` lo prueba ruta por ruta con los manejadores reales.
- **Filas derivadas, sin dato nuevo**: lo prestado con cuenta ("Le prestaste a Mamá", sale) y el dinero recibido de una deuda D.14 ("Recibiste: ...", entra por `montoAcreditado`, en su día local).
- **El ajuste a mano**: editar el saldo de una cuenta guarda un registro en la colección nueva `ajustesSaldo` (migración v48 a v49, viaja a la nube), que Movimientos muestra como "Ajuste de saldo". No es ingreso ni gasto: Análisis, la renta y la tasa de ahorro no lo leen.
- **Borrar un préstamo devuelve su dinero** (cambia lo que decidió PE.7): el desembolso vuelve a su cuenta y cada abono sale de donde entró (`reversionAlBorrar`); la confirmación dice qué vuelve a dónde. Un abono sin cuenta no se toca.
- **Cada abono nuevo trae su id**, que usa su fila de Movimientos.
- Pendiente, HF.1d-2: Distribuir sigue acreditando sin fila y la guarda `cobrosDistribuidos` sigue en pie.
- Pruebas: `registro-saldo` (11 nuevas: las filas, `efectoEnCuenta`, la reversión, la migración y R-HF2 en el ajuste, el préstamo de punta a punta y la deuda D.14); E2E `smoke` (2 ajustadas: el ledger de Me deben y el de una cuenta suman la fila de lo prestado). Unitarias 5593/5593, E2E 472/472.

### feat(formularios): FORM.2h, Ajustes con mini-hojas, Tino, la tasa alta en ámbar y el banco con buscador · 2026-11-15

[ADR 142](DECISIONS/142-formularios-por-tarea.md) D2, D7, D9 y D10. **Cierra la iniciativa FORM.2.** Fichas: [`contexto/captura.md`](contexto/captura.md), [`contexto/deudas.md`](contexto/deudas.md), [`contexto/configuracion.md`](contexto/configuracion.md). SW v708.

- **D7, Ajustes como lista** (`data-ajustes`, `montarAjustes`): en el teléfono, "Tu perfil" se lee como filas con su valor a la derecha ("Tu nombre", "¿Cómo recibes tus ingresos?"); tocar una abre su mini-hoja con el campo y "Listo", y al cerrarla, si cambió, el formulario se envía solo (el `submit` de siempre guarda y dice "Guardado"). El botón "Guardar perfil" sale en el teléfono. El candado (PIN) conserva sus pasos: es un flujo de seguridad, no un dato que se edita.
- **D9, la tasa muy alta deja de bloquear**: `validarCompromiso` solo rechaza lo que no puede ser una tasa (más de 1.000 % al año o 500 % al mes, `TASA_IMPOSIBLE`); entre lo muy alto (`TASA_MUY_ALTA`, 200 % y 100 %) y eso, `avisoTasaAlta` muestra un aviso ámbar mientras se escribe y la deuda se guarda igual.
- **D10, Tino en los formularios**: la ⓘ de la tasa abre una mini-hoja con Tino que explica dónde está (`data-mini-ayuda`, `initMiniHojas`, también en escritorio), y "Primero necesitas una cuenta" (Registrar gasto y Me llegó dinero) lleva a Tino pensando en vez de la teja.
- **D2, el banco con buscador**: en el teléfono, "Banco o billetera" de Nueva cuenta abre el desplegable de Finko con buscador en vez de la lista flotante.
- `captura-telefono.js` prepara al iniciar los formularios que ya están en la página (Ajustes se pinta antes).
- Pruebas: `compromisos` (2 reescritas y 1 nueva: muy alta avisa, imposible bloquea); E2E `formularios-telefono` (3 nuevas: el nombre en su mini-hoja, la deuda con tasa alta y Tino, el banco con buscador); `movil-mv2` (1 ajustada: la cuenta elige el banco en el desplegable). Unitarias 5582/5582, E2E 472/472. Falta la prueba de toda la iniciativa en un iPhone real (REV.3b).

## Meses anteriores

- [2026-11, del 3 al 14](changelog/2026-11.md) (rotación forzada el 2026-11-13, el 2026-11-15 y el 2026-11-16: el mes pasó el techo de 60 KB)
- [2026-10](changelog/2026-10.md)
- [2026-08](changelog/2026-08.md)
- [2026-07](changelog/2026-07.md)
- [2026-06](changelog/2026-06.md)
- [2026-05](changelog/2026-05.md)

---

## Convención de entradas

Cada entrada agrupa por fase/release y dentro lista commits con:
- **tipo(área)** - `commit_hash` · `archivos tocados` - descripción de qué cambió.

Tipos: `feat` (nueva funcionalidad), `fix` (bug), `refactor` (sin cambio funcional), `test`, `docs`, `chore` (config/build), `style` (formato).
