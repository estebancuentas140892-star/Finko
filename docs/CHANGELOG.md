# Changelog - Finko Claude

> Revisado: 2026-11-03.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-11)

### feat(movil): MV2.3 tanda 3, el día en hoja y las hojas se cierran de tres formas · 2026-11-03

[ADR 118](DECISIONS/118-el-dia-en-hoja-y-las-hojas-se-cierran-de-tres-formas.md) (acota el ADR 111 y CAL.3 bajo 1024 px; aplica RN3, RN8 y R46). Escritorio sin cambios. SW v650.

- **El día en su hoja**: tocar un día abre `#modal-dia-calendario` sobre el mes, sin mover la página. Al llegar ya no se abre hoy solo. Al cerrar, el día se desmarca y el foco vuelve a su celda. "Aportar" y "Distribuir" cierran antes la hoja del día.
- **Al volver de "Por pagar"**: "Ver en Por pagar" guarda el día y la entrada del historial; volver a esa entrada reabre la hoja en el mismo día y mes.
- **Toda hoja se cierra de tres formas** (`ui/hojas.js`): la ✕ de siempre, el atrás del sistema (un `CloseWatcher` por hoja; sin la API no hace nada) y deslizar hacia abajo (120 px, un cuarto de la hoja o un tirón rápido). Las dos nuevas cierran como Escape, así que cada diálogo usa su propio cierre. `infra/a11y.js` gana `observarTrap`.
- **Escape cierra la hoja de arriba**, no la primera del documento, y `cerrarModal` deja el fondo inerte mientras quede otra abierta.
- Pruebas: 10 unitarias en `hojas.test.js` y 5 en `agenda.test.js`; 4 E2E en `movil-mv2.test.js` (el día en hoja, la vuelta desde Por pagar, el atrás con `CloseWatcher`, deslizar con toques reales).

### feat(movil): MV2.3 tanda 2, Por pagar por urgencia y en filas · 2026-11-03

[ADR 117](DECISIONS/117-por-pagar-por-urgencia-y-en-filas.md) (acota la ficha 05 del ADR 069, el ADR 036 D5, el ADR 074 D2 y el ADR 104; aplica R89a, R19, R50 y la hoja del ADR 098 D4). Bajo 1024 px salvo Me deben; escritorio sin cambios (ADR 073). SW v649.

- **Por urgencia**: "Vencidos · del más antiguo al más reciente", "Lo que falta este mes", "Más adelante", "Pagado este mes" y "Saldadas", con la suma de los dos primeros. El lote baja al pie de lo vencido ("Pagar los N · $X", mismo conjunto y montos que el modal) y su tarjeta suelta se oculta; con un chip puesto el pie no sale.
- **En filas**: teja de 36, una línea de estado, el monto y la acción debajo ("Marcar pagado", "Abonar $X"). Tocar la fila abre la hoja con editar y eliminar y con cuota, categoría, tasa y cupo como notas; `ui/detalle-fila.js` lee la anatomía `.deuda-card`. `compromisos/index.js` repinta al cruzar 1024 px.
- **Me deben, una pastilla por fila**: la del estado; las notas van en una línea de texto que parte donde haga falta.
- **Texto al 200 %**: las lentes parten su rótulo en dos líneas (el número baja bajo el rótulo) y en las filas de Por pagar, Gastos, Movimientos e Ingresos el monto baja a su renglón en lugar de cortarse.
- Pruebas: 9 unitarias en `compromisos.test.js` y 4 ajustadas en `personales.test.js`; 3 E2E en `movil-mv2.test.js` (filas y hoja, 200 %, escritorio).

### feat(movil): MV2.3 tanda 1, lo que faltaba del canvas · 2026-11-03

[ADR 116](DECISIONS/116-lo-que-faltaba-del-canvas-primera-tanda.md) (cierra pendientes de los ADR 099 y 107 D2; aplica el ADR 023, R4, R73 y la regla 3 del ADR 060); tarjeta MV2.3 con las cinco tandas que siguen. SW v648.

- **Por qué**: los registros daban el plan MV2 por cerrado, pero una auditoría independiente de los 13 tableros contra el código encontró 22 propuestas sin hacer o a medias, casi todas hallazgos o detalles de prototipo que nunca tuvieron un ID MV2. Esteban decidió aplicarlas todas "tal cual como propone el HTML".
- **Esta tanda** (las once sin conflicto): la tarjeta pedida destella al llegar desde Calendario (N7); el ojo tapa los montos de "Atención hoy" y de los paneles de Inicio (pendiente del ADR 099); "Aportar $X" en Metas (ADR 107 D2); la pregunta de cada modalidad bajo su título (R73); la media línea del fondo incompleto en Metas (AH4); sin filetes laterales (V1); enlaces de texto con 44 px de zona táctil (A2); el aviso del ingreso puntual dice a qué cuenta entró; "+ Fuente fija" tonal; Distribuir sin emoji (C2).
- **El fondo, en infra**: `gastosFijosMensuales`, `mesesEnPalabras` y `coberturaFondo` pasan a `infra/bolsas.js`. Ahorro y Aprende exportan las mismas funciones con sus nombres; un test comprueba que son la misma, no una copia.
- Pruebas: 3 unitarias de la línea del fondo y 1 de "Aportar $X" en `metas.test.js`, 1 de la máscara en `atencion-hoy.test.js`, 4 de `coberturaFondo` en `bolsas.test.js`; 1 E2E en `movil-mv2.test.js`. Unitarios 5227/5227 (árbol limpio), E2E 391/391.

### feat(movil): MV2.5, el pie se apoya sobre el teclado · 2026-11-03

[ADR 115](DECISIONS/115-el-pie-se-apoya-sobre-el-teclado.md) (completa el ADR 098 D8; respeta D12 y el ADR 092 D7); ficha [`contexto/sistema-visual.md`](contexto/sistema-visual.md). Solo bajo 1024px. SW v647. Probado por Esteban en su iPhone sobre la vista previa de Vercel antes de `main`. **Cierra la tarjeta MV2.2**: el plan del canvas "Finko móvil: rediseño integral" queda aplicado entero.

- **El problema (C1)**: en iOS el teclado tapa la página sin achicarla y la hoja es fija a toda la pantalla; con el teclado abierto en "Nuevo gasto" solo se veía el monto. Chrome en Android hace lo mismo desde que dejó de achicar la página por defecto.
- **`ui/teclado.js`**: lee `visualViewport` y, mientras el teclado tapa más de 120 px, deja `html[data-teclado]` y el área visible en `--fk-vv-alto` y `--fk-vv-arriba`. La hoja abierta toma ese alto y ese tope. La barra del navegador al desplazar y el zoom con los dedos no cuentan.
- **`visualViewport` y no `interactive-widget`**: el atributo del viewport solo lo entiende Chrome en Android, e iOS necesita esto igual.
- **La lección a pantalla completa queda fuera**: no tiene campos y conserva su alto.
- Pruebas: 7 unitarias en `teclado.test.js`; 1 E2E en `movil-mv2.test.js` que reemplaza `visualViewport` (no hay teclado en Chromium sin pantalla): con 380 px visibles en 667, "Guardar" queda encima.

### feat(marca): MARCA.2, el isotipo flota donde se puede · 2026-11-03

[ADR 114](DECISIONS/114-el-isotipo-flota-donde-se-puede.md) (acota el ADR 103 D3; respeta D1 y D2); ficha [`contexto/sistema-visual.md`](contexto/sistema-visual.md). Sin cambios en `modules/` ni en estilos. SW v646.

- **Pedido**: el isotipo con fondo transparente "como los logos modernos". Antes de decidir, una vista previa con el isotipo real mostró lo que hace cada sistema: iOS pinta de negro lo transparente y Android lo encoge en un plato blanco; el diálogo de instalar, el computador y el arranque lo muestran tal cual.
- **Flota donde se puede**: `icon-192.png` e `icon-512.png` (`any`) y el favicon van sin fondo; las pantallas de arranque de iOS llevan el isotipo sin teja sobre el fondo oscuro, más grande que antes (160 en vez de 102 px a 750).
- **En la pantalla de inicio, sobre blanco a sangre**: `apple-touch-icon.png` y dos `maskable` nuevos (`icon-maskable-192/512.png`), sin teja ni filete, con el isotipo al 62 % dentro de la zona segura. El manifest deja de usar `"any maskable"` en un mismo archivo.
- **Todo sale del SVG**: `gen-icons.py` produce cinco PNG y el favicon; `gen-splash.py` dibuja el isotipo sin la teja.
- Pruebas: 2 unitarias en `sw-precache.test.js` (any y maskable por separado; cada ícono existe y está precacheado).

### feat(movil): MV2.20, las lentes quedan a la vista · 2026-11-03

[ADR 113](DECISIONS/113-las-lentes-quedan-a-la-vista.md) (acota R31; respeta los ADR 104, 106 y 098 D12); ficha [`contexto/sistema-visual.md`](contexto/sistema-visual.md). Solo bajo 1024px. SW v645.

- **Medido a 390 con 40 gastos**: Gastos mide 4.076 px y la barra de lentes se iba a los 192; para cambiar de lente había que subir 3.900 px, y tocar "Gastos" en la barra inferior no sube.
- **La barra queda pegada arriba al bajar** (`position: sticky` sobre `env(safe-area-inset-top)`), en el bloque Gastos y en las cuatro hijas de Ahorro. El título, el mes y el hero se van con la lista: Esteban eligió solo las lentes, no el título compacto del canvas.
- **R31 se acota, no se deroga**: la barra de lentes de un bloque es la única excepción (`DESIGN_SYSTEM.md`).
- **El DOM no cambia**: `sticky` solo pega dentro de su padre, y la barra vivía en el envoltorio de la cabecera (192 px). `#tabs-*`, `#chips-*` y `.bloque-gastos` pasan a `display: contents` y unos márgenes reponen el `gap`; las posiciones a la carga quedan iguales (±1 px de redondeo).
- **Lo que se lleva a la vista no queda tapado**: `scroll-padding-top` mientras la sección activa tiene barra.
- Pruebas: 2 E2E en `movil-mv2.test.js` (Gastos y Metas). El desplazamiento va dentro del sondeo porque `volver.js` deja arriba la sección recién abierta.

### feat(config): CFG.6, Ajustes como índice en el teléfono · 2026-11-03

[ADR 112](DECISIONS/112-ajustes-como-indice-en-el-telefono.md) (cierra CFG.6 y absorbe MV2.26; cumple R13 y R14; respeta los ADR 050, 063, 043, 096, 066 y 099 D6); ficha [`contexto/configuracion.md`](contexto/configuracion.md). Escritorio sin cambios. SW v644.

- **Medido a 390**: 15 bloques abiertos en 5.376 px, "Tu perfil" a 1.355 y la nube a 2.543. Con el índice cerrado, 1.261 px.
- **Cada bloque es una fila** bajo 1024px: `_fila()` toma el HTML que ya pinta cada `_render*()` y convierte su título en un botón con `aria-expanded` y su estado en una línea (el nombre, "Activo", la frase de Familia de la hoja del avatar, "Sin cuenta", el último respaldo, el permiso de recordatorios, la versión). Los formularios y su cableado no cambian.
- **Lo abierto sobrevive al repintado**: `_filasAbiertas` vive en el módulo, así que cambiar el tema o guardar no cierra la fila. La nube a mitad de entrar abre sola, y la hoja del avatar abre la fila del bloque al que lleva y le pasa el foco.
- **Lo tuyo primero**: Tu cuenta, Familia, Tus datos, La app, Impuestos, Información. En escritorio la vista pinta el panel de siempre y `config/index.js` lo repinta al cruzar 1024px.
- **Atajos solo con puntero fino** (todos los anchos): `_handleKeydown()` no corre sin `any-pointer: fine`, y el bloque se esconde con la misma condición, así que un teléfono con teclado bluetooth no queda con atajos que no puede apagar (WCAG 2.1.4).
- **Anotado sin decidir**: "Acerca de" y el Centro Legal dicen que nada sale del teléfono en la misma pantalla que "Guardar en la nube"; va a NUBE.
- **Ficha podada**: `contexto/configuracion.md` estaba en su techo (40,8 KB); "Cambios realizados" pasa a una línea por hito (33 KB antes de esta entrada).
- Pruebas: 4 unitarias en `config.test.js` y 1 en `atajos-teclado.test.js`; 2 E2E en `movil-mv2.test.js` (móvil y escritorio); el E2E de la hoja del avatar espera el foco en la fila abierta.

### feat(movil): MV2.27, Calendario: el mes entero en el teléfono · 2026-11-03

[ADR 111](DECISIONS/111-calendario-el-mes-entero-en-el-telefono.md) (cambia bajo 1024px el ADR 037 D2; acota R4 entre 320 y 357px; aplica en Calendario el ADR 107 D1, D3 y D5; respeta el ADR 037 D3, el 081 K4 y el 071); ficha [`contexto/calendario.md`](contexto/calendario.md). Ningún cálculo cambia. SW v643.

- **La grilla cabe** (a, bajo 1024px): `aspect-ratio: 1` con piso de 44 se volvía un ancho mínimo y la grilla pedía 332px; a 360 el domingo quedaba 17px fuera de la tarjeta. Ahora `minmax(0, 1fr)` sin hueco, 8px del relleno de la tarjeta a cada lado y 3rem de alto: 40,9 x 48 a 320, 45,5 a 360. Con el texto al 130 % nada se sale.
- **El día, en un círculo** (a): el estado deja la celda y pasa a un círculo de 2rem detrás del número, con los mismos colores y el mismo orden; el número sube a 14px. La leyenda va en dos columnas alineadas.
- **Textos que no se parten** (b): "este mes" va en `.cal-card__sub-mes` y calla bajo 1024; cada lado del resumen del día es un `.cal-detail__lado` que baja entero; el nombre de un pago usa dos renglones. El texto que se lee no cambia.
- **Lo aprobado llega** (c, todos los anchos): "Viernes 30 de octubre" en minúscula; la pill de pago sale del cuerpo y ocupa su renglón (el abono parcial pasa de tres renglones a uno); "Distribuir" con `data-dom="tesoreria"` y "Aportar" con `data-dom="metas"`, una línea nueva en `buttons.css`; con el propósito visible `.cal-empty` calla su mensaje como `.empty-state`, y su botón vuelve a verde lleno (revisa DIS.11 C8, que lo había bajado a borde por el "+ Agregar gasto fijo" que la ficha 05 se llevó).
- **Cuatro tests con fecha** (fuera del alcance, solo tests; fallaban igual en el commit anterior): FD3 de `compromisos.test.js` usaba `diaPago: 5` aunque su comentario dice `DIA_PASADO`, y fallaba del 1 al 5 de cada mes. Tres E2E de Por pagar en `smoke.test.js` crean un fijo, llegan al Calendario y tocan su día; sin eventos hoy, DSK.2c ya lo había abierto y el clic lo cerraba. `abrirDiaAgenda()` solo toca si el día no está abierto.
- Pruebas: 5 unitarias en `agenda.test.js`; 4 E2E en `movil-mv2.test.js` (tres móviles y uno de escritorio); el E2E de C8 en `smoke.test.js` cambia de sentido.

---

## Meses anteriores

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
