# Ficha de contexto: Inicio, Gastos y Movimientos en todos los teléfonos

> Revisado: 2026-11-26.

> Cómo se adaptan las pantallas del teléfono al ancho, al alto y a la letra del sistema (iniciativa TEL.1, [ADR 199](../DECISIONS/199-inicio-gastos-y-movimientos-en-todos-los-telefonos.md)). Transversal a Inicio, Gastos y Movimientos: cada sección sigue en su ficha ([`inicio.md`](inicio.md), [`gastos.md`](gastos.md), [`movimientos.md`](movimientos.md)); acá van las reglas comunes y dónde viven. Reglas de uso en [`README.md`](README.md).
>
> **Qué NO buscar acá:** las opciones de las hojas de Gastos en una línea (GAS.16, en `gastos.md`); las zonas de toque y el contraste de las hojas (GAS.17, en `gastos.md`).

---

## Las reglas de adaptación

- **Objetivo**          : que nada se corte, se parta ni se salga en ningún teléfono de 320 a 440 px, con la letra del sistema al 100, 115 y 130 %.
- **Estado actual**     : TEL.1 aplicada entera (TEL.1a a 1c, el lienzo "en todos los teléfonos").
- **Verificado contra** : TEL.1c (2026-11-25).

**Reglas** (ADR 199): el contenido decide (CSS intrínseco); un texto baja de línea antes que achicarse; solo las cifras grandes se achican, de a 1 px y hasta su mínimo; ninguna palabra se parte (`overflow-wrap: normal`) y no hay puntos salvo en la barra de pasos; la letra de 22 px o más crece como mucho 15 %; zona de toque de 44 y 8 px entre controles con efectos distintos.

**Dónde vive**

| Pieza | Archivo | Ancla |
|---|---|---|
| Zonas seguras con nombre, zona de toque y fin de las listas | `styles/tokens.css` | `--fk-zona-*`, `--fk-toque`, `--fk-fin-de-lista` |
| Filas de Día a día y Movimientos (el monto baja a su renglón) | `styles/responsive.css` | `.list-item--detalle .list-item__body` |
| Fijos: monto y "Pagar" juntos a la derecha | `modules/dominio/compromisos/views/lista.js`, `styles/identidad.css` | `.deuda-card__fin` |
| "Esta semana" y "Atención hoy" | `styles/responsive.css`, `styles/identidad.css` | `.esta-semana__fila`, `#sec-dash .fila-atencion__textos` |
| Deudas y Límites | `styles/identidad.css` | `.deuda-inv__top`, `.limite-fila--estado` |
| Leyenda de la tarjeta | `styles/identidad.css` | `.hero-gastos__leyenda` |
| Barra de abajo en cinco columnas, "Registrar" del ancho de su texto | `styles/identidad.css`, sección 10 | `.sidebar__nav > .nav-group:first-child > [role="group"]` |
| Saludo y nombre de Inicio | `styles/responsive.css` | `#sec-dash .perfil-inicio__nombre` |
| La letra del sistema a 1 rem | `index.html` | `<meta name="text-scale">` |
| Pestañas de Gastos en dos pares | `modules/ui/bloque-gastos.js`, `styles/identidad.css` | `.bloque-tabs__par` |
| Columnas por la palabra más larga (empresas, entidades) | `modules/ui/tejas.js`, `styles/components/captura.css` | `[data-tejas]`, `--palabra-larga` |
| Días del mes de 44 | `modules/ui/preguntas.js`, `styles/components/captura.css` | `.dias` (contenedor), `.dias__rejilla` |
| Cifras que caben con su ojo | `modules/infra/cifra-que-cabe.js`, `styles/tokens.css` | `[data-cabe]`, `data-cabe-final`, `--fk-cifra-*` |
| Hojas fuera de la isla; tinta sobre el rojo | `styles/tokens.css`, `styles/themes.css` | `--fk-hoja-arriba`, `--fk-on-danger` |
| Frenos del toque y "Guardar dos veces" | `modules/ui/toque.js` | `vigilarToques` (`nuevaPantalla`), `vigilarEnvios` |
| El aviso que espera | `modules/ui/toast.js`, `styles/components/nudges.css` | `pausar` / `seguir` |
| Texto de ayuda corto | `modules/ui/placeholder.js` | `data-placeholder-largo`, `data-placeholder-corto` |

**Cómo se prueba**: `tests/e2e/telefonos.test.js` recorre Inicio, las cuatro pestañas de Gastos y Movimientos en cinco combinaciones de tamaño y letra (raíz a 16, 18,4 y 20,8 px) y mide cada palabra con un Range: más de un rectángulo es una palabra partida; un rectángulo fuera de su caja o de la pantalla, un texto que se sale. Suma pestañas, cifras, entidades, días, hojas (la isla se simula con `--fk-zona-arriba`), teclas, ficha, búsqueda, tinta y un temblor con toques de dedo (`hasTouch`). Unitarias: `toque.test.js` (frenos con tiempo falso) y `toast-pausa.test.js`.

**Riesgos**
- Medir texto metiendo spans fuerza un reflujo por palabra y retrasa la pantalla: usar `measureText` de un lienzo (así miden `tejas.js` y `placeholder.js`).
- Los frenos del toque solo miran `pointerType` touch o pen: una prueba con mouse no los ve; la E2E del temblor usa `hasTouch` y `touchscreen.tap`.
- Un `min-width: 0` heredado en la columna de textos vuelve a dejar que la palabra se parta (pasó en Fijos: `.deuda-card__info` de `domain.css`). La columna de textos va con `min-width: auto`.
- Un texto con `white-space: nowrap` dentro de una celda del bento ensancha la portada entera (el mínimo de la columna es el de su contenido).
- `reset.css` deja `overflow-wrap: break-word` en párrafos: solo parte una palabra si su caja es más angosta que ella, así que basta con que la caja no baje de su palabra más larga.

**Cambios realizados**
- 2026-11-25 TEL.1a: filas, leyenda, barra de abajo y saludo sin puntos ni palabras partidas ([ADR 199](../DECISIONS/199-inicio-gastos-y-movimientos-en-todos-los-telefonos.md) D2 a D4).
- 2026-11-25 TEL.1b: `text-scale`, pestañas en pares, tejas por la palabra más larga, días de 44 y cifras que caben ([ADR 199](../DECISIONS/199-inicio-gastos-y-movimientos-en-todos-los-telefonos.md) D1, D5 a D10).
- 2026-11-25 TEL.1c: hojas fuera de la isla, teclas, papelera a 8 de la ✕, toques con frenos, aviso que espera, búsqueda corta, nombres y tinta sobre el rojo ([ADR 199](../DECISIONS/199-inicio-gastos-y-movimientos-en-todos-los-telefonos.md) D11 a D19).

**Cambios pendientes**
- Confirmar en el Redmi al 115 % que la letra del sistema llega a 1 rem con `text-scale` (D1).
- Un recorrido con TalkBack y con un iPhone instalado (la isla y el indicador de verdad).

---

## Cada dato en su sitio (SIT.1, ADR 202)

- **Objetivo**          : que cada dato tenga su renglón y su lugar en Inicio y Gastos del teléfono: las unidades no se parten, la cifra se queda arriba a la derecha y el nombre usa todo el ancho desde su segundo renglón.
- **Estado actual**     : SIT.1a (Día a día), SIT.1b (Fijos, Atención hoy y Deudas) y SIT.1c (Esta semana, Novedades y bancos) aplicadas. Falta SIT.1d (Límites, ficha del gasto y vacíos).
- **Verificado contra** : SIT.1c (2026-11-26).

**Reglas** (R93 en `DESIGN_SYSTEM.md`): un dato por renglón; `.fk-unidad` no se parte; palabras en vez de " · "; la cifra flota arriba a la derecha antes del nombre en el DOM; nombres con `pretty`, titulares con `.fk-balance`.

**Dónde vive**

| Pieza | Archivo | Ancla |
|---|---|---|
| La fila de dato | `styles/identidad.css` (sección "Cada dato en su sitio") | `.fila__texto`, `.fila__der`, `.fila__cifra`, `.fila__nombre`, `.fila__estado`, `.fila__dato` |
| Unidades y balance (solo teléfono) | `styles/utils.css` | `.fk-unidad`, `.fk-balance` |
| La fila del gasto en el teléfono | `modules/dominio/gastos/view.js` | `_renderGastoItem(..., telefono)`, `_renglonCuenta`, `textosFilaGasto` (`clasificacion`, `cuenta`) |
| Encabezado del día, lectura del mes y su vacío | `modules/dominio/gastos/view.js` | `complementoDiaGastos`, `_comparacionTelefono`, `_lecturaTelefono`, `_renderDiaNuevo` |
| Fila de Fijos y Por pagar, tarjeta de deuda, Entidades y personas | `modules/dominio/compromisos/views/lista.js` | `_renderFila` (`pagos`), `_metaDeuda` (renglones), `_proximaCuota`, `_renderFilaInventario` |
| Tarjetas de Fijos y Deudas | `modules/dominio/compromisos/views/hero.js` | `.hero-compromisos__linea--par` |
| Aviso de Tino en Deudas | `modules/dominio/compromisos/views/estrategia.js`, `logic/motor-deudas.js` | `htmlEntradaPlanSalida({ sugerencia })`, `analizarDeudas().crecen` |
| Fila de Atención hoy, "N pagos más" y Novedades | `modules/ui/atencion-hoy.js` | `_piezasFila`, `_htmlMas`, `_htmlFila`, `_htmlDetalle`, `_unidades` |
| Esta semana y sus totales | `modules/dominio/compromisos/views/dashboard.js` | `_filaSemana`, `.esta-semana__par` |
| Lista de bancos de la banda | `modules/infra/render.js` | `_filasCuentas` (`.hero-inicio__cuenta--fila`) |

**Cómo se prueba**: `tests/e2e/cada-dato.test.js` (escenario largo del lienzo, cinco anchos por tres tamaños de letra): ninguna unidad, cifra ni estado en dos renglones, nada con " · ", el nombre en 2 renglones desde 360 y 3 a 320, la cifra en el primer renglón del nombre, nada con puntos suspensivos ni `hyphens: auto`. `SECCIONES` crece con cada rebanada.

**Riesgos**
- La vista decide la fila por ancho al pintar (como el pliegue por semanas): girar de escritorio a teléfono sin repintar deja la fila de escritorio hasta la siguiente acción.
- A 320 con la letra al 130 % una primera palabra larga no cabe junto a la cifra: el nombre empieza debajo (aceptado en el ADR 202).

**Cambios realizados**
- 2026-11-26 SIT.1a: fila del gasto, encabezado del día, tarjeta del mes y su vacío, sin guiones ([ADR 202](../DECISIONS/202-cada-dato-en-su-sitio.md) D1 a D5).
- 2026-11-26 SIT.1b: Fijos, Atención hoy y Deudas con la fila de dato; el aviso de Tino en lista (D6).
- 2026-11-26 SIT.1c: Esta semana, Novedades y la lista de bancos (D7).
