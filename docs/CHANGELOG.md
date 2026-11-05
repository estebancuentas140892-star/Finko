# Changelog - Finko Claude

> Revisado: 2026-11-05.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-11)

### feat(inicio): MV2.30 tanda 1, el encabezado y el saldo de Inicio en el teléfono · 2026-11-05

[ADR 126](DECISIONS/126-inicio-del-adulto-en-el-telefono.md) D1 y D2, del tablero de Inicio de Claude Design (`Diseño Finko/Finko móvil · rediseño.html`). Esteban aprobó en chat las seis recomendaciones que tocan decisiones escritas. Ficha: [`contexto/inicio.md`](contexto/inicio.md). SW v665.

- **Encabezado**: lupa, ojo y avatar juntos a la derecha en `.perfil-inicio__acciones`, sin caja; el avatar es un disco de 36px dentro de su zona de 44. El nombre va en una línea con puntos (supera el ADR 122 D2).
- **El ojo encendido** lleva un disco de acento en toda la app (`[data-action="bloque-saldo-visibilidad"][aria-pressed="true"]`).
- **El saldo sin tarjeta** bajo 1024px. Con el ojo puesto, el monto se calla para el lector y una línea `sr-only` dice "Oculto".
- **La ficha de cuentas** reemplaza la pastilla y el conteo: `etiquetaCuentas()` ("Efectivo y 2 cuentas") y `fichasCuentas()` (hasta tres tejas de marca y "+N"). El detalle abierto lleva "Ir a Mis cuentas". El conteo sigue en escritorio.
- Pruebas: `render.test.js` (3 nuevas, 2 ajustadas), E2E `smoke.test.js` (la ficha y el saldo sin tarjeta a 390) y `movil-mv2.test.js` (el nombre en una línea a 320). Unitarios 5285/5285, lint y E2E 438/438 en árbol limpio.

### feat(ahorro): Ahorro abre en el fondo, se retira la casa · 2026-11-05

[ADR 125](DECISIONS/125-ahorro-abre-en-el-fondo.md). Ficha: [`contexto/ahorro.md`](contexto/ahorro.md). SW v664. Esteban lo pidió en chat: la casa mostraba demasiado junto y la vista con la barra de lentes ya deja pasar de una a otra.

- **En todos los anchos**: la entrada "Ahorro" de la barra inferior y la fila de la barra lateral apuntan a `#fondo`; `#ahorro` pasa a `REDIRECTS` (marcadores, `g h` y enlaces viejos llegan al fondo). Las dos entradas conservan `data-section="ahorro"` como nombre del grupo, así que ninguna se marca vigente por su cuenta.
- **Enlaces que iban a la casa**: la franja del plan y el motivo "Ahorro" de Límites, y los dos accesos del fondo en "Distribuir tu ingreso", llevan a `#fondo`.
- **Se borra** (aprobado en chat): `#sec-ahorro`, `renderCasaAhorro()` y sus gráficos, `casaAhorro()`, `diasAlProximoApartado()`, `ETAPA_INVERSION`, la acción `ahorro-ir-a-carril`, los estilos `.hub`, `.lane`, `.silrow`, `.silbtn` y `.grow`, el "‹ Ahorro" de las cuatro y las pruebas que solo probaban la casa. El dominio deja de repintarse cuando cambian metas, reservas o inversiones.
- Pruebas: `ahorro.test.js` (las de la casa salen; `MODALIDADES_AHORRO` conserva orden y `cuando`), `router.test.js` (`#ahorro` llega al fondo), `shell-nav.test.js`, `bloque-ahorro.test.js`, `volver.test.js`, `bolsas.test.js`, `tesoreria.test.js` y `presupuesto.test.js`; E2E `hub-ahorros.test.js` (abre en el fondo, `#ahorro` redirige, sin "volver"), `ahorro-inversion.test.js`, `navegacion-render.test.js`, `smoke.test.js` y las listas de `movil-mv2`, `reflow-320` y `zonas-tactiles`. Unitarios 5282/5282, lint y E2E 438/438 en árbol limpio.

### feat(nino): MV2.29 tanda 5, Familia del adulto y sus hojas; cierra MV2.29 · 2026-11-05

[ADR 124](DECISIONS/124-el-nino-en-el-telefono.md) D10. Ficha: [`contexto/nino.md`](contexto/nino.md). SW v663. Con esta tanda el tablero de niños quedó aplicado completo y su HTML (`Diseño Finko/Finko móvil · rediseño6.html`) se borró: lo que queda manda el ADR 124.

- **Familia en Ajustes**: cada niño es una fila que abre su progreso, con una línea de su mesada. "Se la entregué · $X" va en la fila y no abre nada: anota y avisa con un toast. "Entrar como", "Su teléfono" y quitar al niño pasan a su progreso.
- **Las hojas del tutor** llevan teja, título y una línea en la cabecera (`_pintar(titulo, html, foco, { sub, teja })`, `#modal-familia-teja` y `#modal-familia-sub`) y el pie fijo del ADR 123. "Su teléfono" (`config/nube.js`) esconde la teja y la línea al pintar en el mismo modal.
- **La mesada**: los siete días en botones (cada mes sigue la lista del 1 al 28, `htmlDiaMesada()`), el porcentaje de cada frasco y la suma que se rehacen mientras se escribe (`htmlSumaReparto()`), interruptores y la cuenta solo si se anota como gasto.
- **El progreso** conserva "Esta semana" aunque el tablero no la traía: la pide el ADR 093 D2.
- Pruebas: `perfiles.test.js` y `mesada.test.js` (6 ajustadas con casos nuevos), E2E `perfiles.test.js` (alta, mesada y premio) y `nube.test.js` ("Su teléfono" desde el progreso). Unitarios 5319/5319, lint y E2E 442/442 en árbol limpio.

### feat(nino): MV2.29 tanda 4, la primera vez y "¿Quién usa Finko?" con la piel del niño · 2026-11-05

[ADR 124](DECISIONS/124-el-nino-en-el-telefono.md) D9. Ficha: [`contexto/nino.md`](contexto/nino.md). SW v662.

- **`.kid-piel`**: un contenedor pide los tokens de `body.kid` sin cambiar la piel de la app. `themes.css` lo declara en el mismo bloque (`.kid-piel, body.kid` y su par claro), así la prueba de contraste del niño mide los dos a la vez.
- **"¿Quién usa Finko?"** siempre con la piel del niño: Tino pregunta, los niños primero y el adulto al final, "Agregar un niño · pide tu PIN" como fila punteada.
- **La primera vez**: la primera pantalla y el camino del niño van a toda la pantalla con su piel; "Soy adulto" vuelve al diálogo de siempre. En el camino del niño, Tino hace cada pregunta y arriba van "Volver" y tres puntos de avance.
- **Capas**: el marco a pantalla completa en `responsive.css` y el contenido en `modals.css`, porque las piezas del onboarding viven ahí y `components` no les gana.
- Pruebas: `onboarding-nino.test.js` (4 ajustadas), `perfiles.test.js` (1 ajustada) y E2E `onboarding-nino.test.js` (la piel en el camino del niño). Unitarios 5319/5319, lint y E2E 442/442 en árbol limpio.

### feat(nino): MV2.29 tanda 3, las hojas del niño: anotar y la meta · 2026-11-05

[ADR 124](DECISIONS/124-el-nino-en-el-telefono.md) D8. Ficha: [`contexto/nino.md`](contexto/nino.md). SW v661.

- **Anotar** (Guardé, Gasté, Compartí, mover): el título a la par de la ✕, el monto en una caja de 72 px, cuatro billetes en dos columnas y el frasco en tejas con su dibujo. El botón dice cuánto ("Guardar $5.000") y el billete marcado sigue a lo que hay en el campo (`_reflejarMonto()`).
- **La meta** es una pantalla de paso, sin la barra de abajo en el teléfono. Tres cantidades por semana ($2.000, $5.000, $10.000) reemplazan el paso de $1.000; si la meta ya guardaba otra, entra como cuarta opción marcada. Tino responde la fecha y debajo va con cuánto ya cuenta.
- **Capas de CSS**: `a11y`, `modals` y `responsive` ganan a `components` sin importar la especificidad. La ✕ de la hoja vive en `modals` y su ajuste del teléfono en `responsive`; el campo desnudo no dibuja el anillo de `a11y` porque su caja ya marca el foco.
- Pruebas: `nino.test.js` (3 ajustadas con casos nuevos), E2E `perfiles.test.js` (la meta elige $5.000). Unitarios 5319/5319, lint y E2E 442/442 en árbol limpio.

### feat(nino): MV2.29 tanda 2, Aprender y la lección del niño · 2026-11-05

[ADR 124](DECISIONS/124-el-nino-en-el-telefono.md) D6 y D7. Ficha: [`contexto/nino.md`](contexto/nino.md). SW v660.

- **Aprender deja el camino en zigzag**: la ruta es una línea punteada; cada unidad lista o sabida se repasa desde su primera lección y la actual va abierta con sus lecciones, Tino y un solo botón ("Seguir donde ibas" si la dejó a medias). Con la línea se va el arreglo de desborde del ADR 098 D13 para el zigzag.
- **Lo que dice Tino** junto a la lección sigue una regla para las 24 lecciones: "¡Te falta una para la insignia!" o "¡Vamos con la lección N!".
- **La lección** (mismo motor del adulto, bajo `body.kid` y `_nino`): pregunta de 28 px, opciones de 68 px, pista al pie mientras no responde, y la respuesta en una tarjeta que flota con el color de lo que dice.
- **La unidad terminada** lleva la insignia con el ícono de su unidad, "¡Nueva insignia!" y "Úsalo de verdad" en una frase. **No va**: "Lo necesito" y "Lo quiero" del tablero; las preguntas de "Úsalo" son abiertas y darles opciones es contenido (APR.3f). El pie pasa a "Ver mi alcancía" y "Volver al inicio".
- Pruebas: `nino.test.js` (1 nueva y 2 ajustadas), E2E `perfiles.test.js` y `movil-mv2.test.js` (2 ajustadas). Unitarios 5319/5319, lint y E2E 442/442 en árbol limpio.

### feat(nino): MV2.29 tanda 1, el niño en el teléfono: barra, Inicio, Alcancía y Yo · 2026-11-05

[ADR 124](DECISIONS/124-el-nino-en-el-telefono.md) D1 a D5, del tablero de niños de Claude Design (`Diseño Finko/`, "rediseño6"). Esteban lo pidió en chat. Ficha: [`contexto/nino.md`](contexto/nino.md). SW v659.

- **Nada del tablero estaba aplicado**: la app era igual a sus capturas "hoy". Se aplica en cinco tandas; esta es la primera.
- **"Lo último que anotaste"** sale de `ultimasAnotaciones()` (`nino/logic.js`): la mesada repartida en los tres frascos (mismo `entrega`) y mover entre frascos (mismo `par`) son una sola fila, como el niño las vivió.
- **"Cambiar el plan"** reusa la pantalla de la meta con `borrador.id`: guardar cambia esa meta, no crea otra.
- **La alcancía de Inicio va una sola vez**: antes eran una lista en el teléfono y los frascos en escritorio (ADR 098 D13 queda superado en ese punto). Bajo 360 px los nombres de los frascos pierden el ícono para no partirse.
- **La insignia de Yo lleva el ícono de su unidad**: el sprite expone `--fk-insignia-estrella` y solo Yo la apaga. Dos íconos nuevos: `i-lock` e `i-clock`.
- **Ajustes al tablero** (ADR 124 D5): "Ya lo compré" y "Cuesta" en vez de concordar con el ejemplo; "Ibas en el paso N" porque la lección guarda el paso; "Cambiar de perfil" sigue oculto en el teléfono propio del niño.
- Pruebas: `nino.test.js` (4 nuevas y 5 ajustadas), `perfiles.test.js` (E2E, 3 ajustadas). Unitarios 5318/5318, lint y E2E 442/442 en árbol limpio.

### feat(movil): MV2.28 (b), Ajustes dice qué guarda en "Más" · 2026-11-04

Adenda al [ADR 108](DECISIONS/108-mas-dice-como-esta-cada-destino.md) (D4), del prototipo del tablero 4 del canvas móvil. Esteban la pidió en chat ("Sí, llévala"). SW v658.

- **La fila de Ajustes** en la hoja "Más" lleva "Perfil, Familia, nube y datos" debajo de su nombre. Es fija: Ajustes no tiene una cifra que contar. Sale de `estadosMas()` como las demás líneas, así que el nombre accesible la incluye ("Ajustes, Perfil, Familia, nube y datos").
- **Debajo y no a la derecha**: a la derecha no cabía a 320 y empujaba el botón del tema fuera de la pantalla. La fila sigue en 54 px y la hoja en 438, bajo el techo de 444 de R83.
- Pruebas: 2 unitarias nuevas y 1 ajustada en `menu-mas.test.js`; 1 E2E nueva en `hub-ahorros.test.js` (a 320, la línea entera y el botón del tema a la vista). Unitarios 5314/5314, E2E 442/442, en árbol limpio.

### fix(movil): MV2.28 (d), el margen seguro en el pie de los diálogos cortos · 2026-11-04

Adenda al [ADR 123](DECISIONS/123-la-hoja-de-formulario-completa.md) D1 (tablero 3: "`env(safe-area-inset-bottom)` en el pie"). Bajo 481 px. SW v657.

- **Los diálogos cortos** con el pie fuera del cuerpo (confirmar, "¿Desde qué cuenta?", novedades, la contraseña del respaldo, la confirmación del PIN e instalar en el iPhone) suman el margen seguro inferior a su pie. Con los 34 px de un iPhone sin botón de inicio, el botón terminaba sobre la barra de inicio; ahora queda por encima. Las hojas `--sheet` ya lo llevaban en su padding y no lo duplican.
- Pruebas: 1 E2E nueva en `movil-mv2.test.js`, que simula el margen con `Emulation.setSafeAreaInsetsOverride` (CDP). Unitarios 5312/5312 y E2E 440/441 sin reintentos, en árbol limpio: la que falla ("dos dispositivos abiertos" en `nube.test.js`) es intermitente y falla igual sin este cambio (3 de 5); con la configuración del proyecto pasa.

### fix(distribucion): BUG-035, BUG-036 y BUG-038, los pagos de compromisos · 2026-11-04

Corrige los tres defectos que dejó abiertos el banco de HF.0f ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)), sin schema nuevo. El código entró en `5c97b98` bajo el mensaje de MV2.28 por un cruce entre dos sesiones que trabajaban en el mismo árbol; esta entrada es su registro. Fichas: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md) (Distribución) y [`contexto/gastos.md`](contexto/gastos.md) (Formulario de gasto).

- **BUG-036 (alta):** Distribuir fechaba con hoy todo lo marcado, también lo que vence el mes siguiente (salario el 25, arriendo el 3). `pagosDeNecesidadPorMes` (`tesoreria/logic/distribucion.js`) parte cada fila en un pago por mes cubierto: el del mes en curso con hoy, el del siguiente con su vencimiento más antiguo, mismo criterio que la hoja de automáticos ([ADR 052](DECISIONS/052-pagos-automaticos.md) D2). El monto se reparte por ocurrencias y la suma no cambia; la cuenta y el saldo de la deuda bajan hoy, una vez. `construirDesgloseNecesidades` gana `fechas`.
- **Consecuencia aceptada:** el pago adelantado sale en Movimientos con su fecha futura y cuenta en el Análisis de ese mes, aunque el dinero salió hoy (flujo de caja frente a significado, HF.1a).
- **BUG-035 (baja):** `deltasPorEdicionEnDeuda` recibe los compromisos y descarta los fijos, y `_ajustarSaldoDeuda` tampoco escribe en uno. Borrar el pago del arriendo ya no le escribe `saldoTotal` ni anuncia "sube de nuevo el saldo".
- **BUG-038 (media):** editar un pago o un abono abre el formulario con `categoriaFija`: su categoría interna sola y marcada, un aviso de que no cambia, y sin tarjetas en el origen (elegir una lo volvía compra). Cubre Movimientos, la lista y la hoja del gasto, que comparten `_editarGasto`.
- **También:** `ARCHITECTURE.md` decía "no hay cuentas de usuario"; queda alineado con la ADN 3 (nube opcional, [ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md)).
- **Tests:** `pago-vinculado.test.js` (9, rutas reales de editar y borrar), 6 nuevos y 1 ajustado en `tesoreria.test.js`, y E2E `distribucion-mes-siguiente.test.js` (2, rojos sin el arreglo: en noviembre la hoja volvía a ofrecer el arriendo). Unitarios 5312/5312 en árbol limpio, lint verde, E2E 440/440 (`--workers=2`). SW v655 a v656.

### feat(movil): MV2.3 segunda pasada, la hoja de formulario completa · 2026-11-04

[ADR 123](DECISIONS/123-la-hoja-de-formulario-completa.md) (tablero 3, "Hojas y formularios"; tablero 12, contraste). Cierra la segunda pasada: las 12 propuestas que la segunda auditoría encontró quedan aplicadas. **Acota** el ADR 031: en la hoja del teléfono la franja de color cede su lugar a la agarradera. SW v655.

- **La hoja completa** (bajo 481 px): agarradera arriba de toda hoja que se cierra, cabecera de 60 px con la teja, el título y la ✕ de 44, y alto del 94 % sin meterse bajo la barra de estado. Los 16 formularios de dominio sin teja la reciben con el ícono de su sección y los 14 pies que no eran fijos pasan a `modal__footer--principal` (fijos y con el margen seguro inferior).
- **Errores bajo su campo**: cada error se escribe debajo del campo que nombra, con el ícono de alerta, y el campo queda con `aria-invalid` y `aria-describedby`; arriba, "Revisa los 2 campos marcados.". Una tabla (`_CAMPOS`) reconoce el campo aunque cada formulario lo llame distinto ("monto objetivo", "fecha pactada", "nombre de la persona"). El ⚠️ se retira.
- **Contraste AA en los dos temas**: la prueba nueva encontró cinco piezas bajo AA y se corrigen: el filtro activo en claro (2,71:1) toma los colores del botón primario; "Abonar", "Marcar pagado", "Aportar" y el chip informativo suben con un 20 % del texto principal.
- **El foco de apertura**: `trapFocus()` tomaba el `<use href>` de la teja como enfocable y el foco se perdía en `<body>` (ya pasaba en los cinco formularios con teja); el selector pasa a `a[href]`. Un pie fijo con "Desactivar fondo" debajo conserva su margen para no taparla.
- Pruebas: 9 unitarias nuevas en `form-errors.test.js`, 1 en `modales.test.js` y 1 ajustada en `ahorro.test.js`; E2E nueva `contraste.test.js` (4: secciones y un formulario con errores, en oscuro y claro). Unitarios 5297/5297, E2E 438/438.

### feat(movil): MV2.3 segunda pasada, lo que faltaba del canvas · 2026-11-04

[ADR 122](DECISIONS/122-lo-que-faltaba-del-canvas-segunda-pasada.md). Una segunda auditoría de los 13 tableros encontró 12 propuestas sin hacer o a medias; esta tanda cubre las puntuales. Bajo 1024 px salvo donde se dice. SW v654.

- **Metas**: el divisor dice "Con plazo · la más cercana primero".
- **Inicio**: a 320 se corta el saludo, no el nombre, que baja de línea.
- **Por pagar**: los cuatro filtros son botones de igual ancho.
- **Ningún filete lateral ni emoji de nivel**: la importación de CSV pasa a borde completo con el ícono de alerta, el reparto de Familia lleva el color del frasco en todo el borde y los avisos de Reservas y Ajustes usan el ícono del sistema (en todos los anchos).
- **Gastos con filtro**: bajo el total, "2 gastos · tu límite es $250.000", o solo "2 gastos" si la categoría no tiene límite. El ojo tapa el monto.
- **El conflicto de la nube, en Atención hoy**: tipo `nube-por-decidir` en el motor de avisos, severidad media y sin interruptor, con "Decidir" que lleva a Ajustes.
- **Notificaciones bloqueadas**: aviso de atención con ícono, título y cómo volver a activarlas.
- Pruebas: 5 unitarias nuevas (gastos, avisos, Atención hoy) y 1 ajustada en metas; E2E nuevas: la fila del título no pasa de 52 px a 320 en diez secciones, el saludo y los filtros a 320, y ninguna pieza visible con filete lateral en las 15 secciones. Unitarios 5287/5287, E2E 434/434, en árbol limpio.

### feat(movil): MV2.3 tanda 6, buscar, la nube en el avatar y las pruebas del canvas · 2026-11-04

[ADR 121](DECISIONS/121-buscar-la-nube-en-el-avatar-y-las-pruebas-del-canvas.md) (recorrido 7 del canvas; reglas de carga, conexión y sincronización del tablero 3; verificaciones del tablero 6). **Cierra la tarjeta MV2.3**: las 22 propuestas del canvas que la auditoría encontró sin hacer quedan aplicadas en seis tandas (ADR 116 a 121). SW v653.

- **Buscar en Movimientos**: con el campo vacío y con el foco, "Buscaste antes" (las cinco últimas búsquedas confirmadas con resultados, en `S.config.busquedasRecientes`), "Por categoría" (las cuatro más usadas y "Todas…") y "Por tipo y cuenta". Con texto, "N resultados · $X en todo tu historial". Cada mes con su total neto, y el año solo si no es el actual; la fila dice "Mar 27 · Restaurantes · Nequi".
- **La nube en la hoja del avatar**: "Sin conexión · tus cambios quedan en este teléfono y se envían al volver", "Hay cambios por subir" o "En la nube hace 2 min"; sin cuenta, la invitación de siempre. Ajustes dice "En la nube hace..." en vez de "Sincronizado hace...".
- **Filas de espera**: con 1.500 movimientos o más, al llegar a Movimientos se ven filas del alto de las reales mientras se arma la lista. Quietas: el catálogo de animación prohíbe los bucles.
- **Las pruebas del plan**: `reflow-320.test.js` recorre las 15 secciones en seis anchos (320 × 568 a 430) con cuatro semillas (`helpers/semillas.js`: vacía, poca, normal y la de PERF.0), y `zonas-tactiles.test.js` mide a 390 que ningún control quede bajo 44 px y ninguna barra esconda opciones. La prueba encontró seis controles chicos: los botones `.btn-sm` suben a 44 en el teléfono, y el atajo de la franja de Límites, "Elegir fecha" de una meta y el historial de abonos de Me deben ganan la zona de los enlaces (ADR 116 D7).
- Pruebas: 6 unitarias en `movimientos-buscar.test.js`, 5 en `hoja-perfil.test.js` y 5 ajustadas en `movimientos.test.js`; E2E nuevas en `buscar.test.js` (4), `zonas-tactiles.test.js` (1) y 24 de reflujo. Unitarios 5282/5282, E2E 431/431.

### feat(movil): MV2.3 tanda 5, separador de miles en todos los campos de dinero · 2026-11-04

[ADR 120](DECISIONS/120-separador-de-miles-en-todos-los-campos-de-dinero.md) (completa R16; aplica la regla 3 del ADR 060). En todos los anchos. SW v652.

- **28 campos más**: gasto, fijo, abono, deuda (saldo, cupo, cuota), meta, aporte, fondo, inversión, préstamo y cobro, límite y gastos pequeños, cuenta y cuota de manejo, ingresos, transferencia, el extra y la cuota de la estrategia, y Distribuir. Pasan a texto con teclado numérico y `data-miles`; pierden `min`, `max` y `step` (los validadores ya dicen qué falta). Con renta y Reservas son 33.
- **Un solo cableado** (`ui/miles.js`): reformatea al escribir sin mover el cursor de entre los dígitos, y entrega dígitos al armar `FormData` (evento `formdata`), así que los validadores no cambian. Quien lee `.value` usa `desdeMiles()` y quien escribe usa `miles()`.
- **El par sube a `infra/miles.js`** y conserva el signo: una cuenta en sobregiro no se vuelve positiva al editarla. Reservas y Ajustes lo reexportan y retiran su cableado.
- **De paso**: el extra de "Aumentar la cuota" se leía con `Number()` y, con puntos, daba 100 en vez de 100.000.
- Pruebas: 7 unitarias en `miles.test.js`, 9 ajustadas; 2 E2E nuevas en `miles.test.js` (escribir en medio, guardar como número, saldo negativo) y 20 aserciones E2E ajustadas al valor con puntos. `tests/setup.js` hace que happy-dom dispare `formdata`.

### feat(movil): MV2.3 tanda 4, el plan de salida en hoja y el detalle del gasto · 2026-11-04

[ADR 119](DECISIONS/119-plan-de-salida-en-hoja-y-el-detalle-del-gasto.md) (cierra la deuda de la ficha 05 y MV2.14; acota el ADR 098 D4 para los gastos). Bajo 1024 px; escritorio sin cambios. SW v651.

- **"¿Cómo salir más rápido?" al pie de Por pagar**: con dos o más deudas, una tarjeta dice qué compara y que nada cambia hasta confirmar; "Ver plan" abre `#modal-plan-salida` con el simulador de siempre. `#estrategia-pago` se muda a la hoja en el teléfono y vuelve a su sitio desde 1024 px: una sola copia, porque sus campos guardan el estado de la simulación.
- **La hoja del gasto con datos propios** (`gastos/detalle.js`): de qué cuenta salió, la nota y la categoría en filas; cómo va el límite de la categoría en el mes del gasto, con "Ver límite"; "Repetir hoy" y "Editar"; "Los N gastos de X en {mes}", que abre Movimientos con la categoría y el mes puestos; y "Borrar este gasto" con lo que vuelve a la cuenta. El ojo tapa los montos. Movimientos y Mis cuentas conservan la hoja que copia la fila.
- Pruebas: 11 unitarias en `gastos-detalle.test.js`, 2 en `compromisos.test.js` y 1 ajustada en `detalle-fila.test.js`; 2 E2E nuevas y 2 ajustadas en `movil-mv2.test.js`.

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
