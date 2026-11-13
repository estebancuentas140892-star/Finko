# Changelog - Finko Claude

> Revisado: 2026-11-13.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-11)

### feat(agenda): MV2.30 Consultar tanda 2, la hoja de un día y el Calendario vacío · 2026-11-13

[ADR 134](DECISIONS/134-consultar-del-adulto-en-el-telefono.md) D5. Ficha: [`contexto/calendario.md`](contexto/calendario.md). SW v686. Tablero "rediseño3".

- **La hoja de un día**: "Mañana, sábado 14 de noviembre" (también hoy y ayer), "1 pago" en vez de "1 compromiso", la frecuencia en palabras ("Gasto fijo · cada mes") y, al pie, "Desde Por pagar lo marcas como pagado. Al volver, el día sigue abierto." En el teléfono "Ver en Por pagar" es un botón a lo ancho bajo su pago.
- **Sin nada con fecha** (ni pagos ni ingresos): el vacío ya no es "Noviembre está despejado" sobre un mes en blanco. En el teléfono el banner con Tino lleva dentro "Agregar un pago fijo", que abre el formulario de Por pagar de una vez (`comp-elegir-tipo-nuevo-ir`), y el mes no se dibuja. Con datos y un mes vacío sigue "está despejado" (ADR 111 D5).
- Pruebas: 6 ajustadas y 1 nueva en `agenda`; en `smoke`, el vacío de "está despejado" siembra un fijo inactivo y uno nuevo abre el gasto fijo desde el vacío.

### feat(agenda): MV2.30 Consultar tanda 1, la hoja Más y Calendario · 2026-11-13

[ADR 134](DECISIONS/134-consultar-del-adulto-en-el-telefono.md) D1 a D4. Fichas: [`contexto/calendario.md`](contexto/calendario.md). SW v685. Tablero "rediseño3".

- **La hoja Más**: cada destino con su estado debajo del nombre ("4 pagos esta semana") y una flecha a la derecha; los rótulos de grupo en frase. Sigue bajo el techo de 444 px (R83) con filas de 6 px de relleno; a 320 la flecha de Ajustes se calla para que su línea entre (ADR 108 D4).
- **Calendario arriba**: la tarjeta del mes dice entra y sale en una pastilla y, en el mes en curso, lo próximo en frase: "Lo próximo: Colegio, mañana. Tu siguiente ingreso llega el 1 de dic." (`fraseLoProximo()`); en otros meses sigue la frase de antes.
- **El mes**: la cabecera cuenta pagos ("7 pagos · 1 ingreso"); la leyenda dice "Sale un pago", "Entra un ingreso", "Vencido" y "Hoy", y todos los pagos van en el color de Por pagar. Lo que vence hoy ya no se marca vencido (como "Vence hoy" en Por pagar, ADR 132); en el teléfono el vencido va en rojo y las flechas del mes sueltas.
- **Lo del mes en listas** (bajo 1024px, mes en curso): "Vencido" en rojo, "Lo que falta este mes" y "Lo que entró", con su suma y una fila por pago (teja, monto, cuándo y qué es) que abre su día (`htmlListasMes()`).
- **Rotación forzada del CHANGELOG**: las entradas del 3 al 5 de noviembre pasan a [`changelog/2026-11.md`](changelog/2026-11.md).
- Pruebas: 12 ajustadas y 5 nuevas en `agenda`; E2E: la leyenda y la pastilla de `smoke` cambian de texto y uno nuevo a 390px abre un día desde las listas.

### feat(apartados): MV2.30 Ahorro tanda 5, la hoja "Nueva reserva"; cierra Ahorro · 2026-11-13

[ADR 133](DECISIONS/133-ahorro-del-adulto-en-el-telefono.md) D7. Ficha: [`contexto/apartados.md`](contexto/apartados.md). SW v684. El tablero "rediseño2" queda aplicado completo y su HTML se borró.

- **Preguntas en frase**: "¿Para qué pago te quieres preparar?" con "Toca uno para llenar el nombre, o escribe el tuyo."; "Nombre"; "(opcional)" en gris en la fecha y la nota.
- **Las otras plantillas** se abren desde un chip punteado "14 más" al final de la fila, en vez del enlace "Ver las otras 14 plantillas" (queda como su nombre accesible). En el teléfono las plantillas son píldoras en fila y el "COP" bajo el monto se va.
- **La frecuencia** son cuatro botones a la vista (el segmento de Familia, radios `frecuenciaAporte`), no una lista desplegable. La pista del aporte en vivo baja a la fecha ("Con fecha, Finko calcula cuánto separar en cada aporte.") y la nota sugiere "Ej.: la moto de Andrés".
- Pruebas: 4 ajustadas y 5 nuevas en `apartados`; un E2E a 390px llena el nombre con una plantilla, abre "14 más", elige "Quincenal" y crea la reserva.

### feat(inversiones): MV2.30 Ahorro tanda 4, Inversión y la hoja de una inversión · 2026-11-13

[ADR 133](DECISIONS/133-ahorro-del-adulto-en-el-telefono.md) D6. Ficha: [`contexto/inversion.md`](contexto/inversion.md). SW v683. Tablero "rediseño2".

- **Arriba, en el teléfono**: "Lo que pusiste a crecer" y el total, con la pastilla "Al vencer, el tiempo le suma $X".
- **La etapa** dice lo mismo que la tarjeta del momento (DIS.17) con una barra partida en vez de las dos columnas: con una inversión, lo que pusiste y lo que pone el tiempo (rayado) con sus montos; con varias, un tramo por tipo con su rasgo y su porcentaje. La inflación y "Lo que sigue" van al pie de la tarjeta.
- **El aviso del fondo** es una tarjeta con "Ir al fondo"; **cada inversión** es una fila (monto, tipo, tasa y vencimiento) que abre su hoja: lo que tendrías al vencer con su barra, tasa, plazo, de dónde salió el dinero, "Editar" y "Eliminar".
- **Registrar** va a un "+ Inversión" en el encabezado que solo existe en el teléfono: `shell.js` no sube a la barra de escritorio un primario con `data-solo-movil`, donde la acción sigue en la tarjeta del momento.
- **El vacío**: el botón vive dentro de la tarjeta del banner; con el fondo empezado y sin completar, "Antes de invertir, conviene tener tu fondo de emergencia completo" va en tarjeta aparte con "Ver mi fondo". Sin fondo, el primario sigue llevando al Fondo (ADR 086 D2).
- Pruebas: 1 ajustada y 9 nuevas en `inversiones`; dos E2E (390px y escritorio) recorren la fila, la hoja y el "+ Inversión" que no sube a la barra.

### feat(metas): MV2.30 Ahorro tanda 3, Metas y la hoja de una meta · 2026-11-13

[ADR 133](DECISIONS/133-ahorro-del-adulto-en-el-telefono.md) D5. Ficha: [`contexto/metas.md`](contexto/metas.md). SW v682. Tablero "rediseño2".

- **La lista en el teléfono**: la tarjeta de identidad primero (ADR 127 D5), ahora con el porcentaje junto a lo que falta ("42% · te faltan $X", los dos anchos); el aviso del fondo incompleto como tarjeta con "Ir al fondo" a la derecha; la pista "Toca + para aportar" y los grupos en frase ("Con plazo" con su orden debajo, "Sin plazo" con la invitación a ponerle fecha, "Cumplidas · N"), cada uno una tarjeta.
- **Cada meta es una fila** (`htmlFilaMeta()`): su silueta llena con lo reunido, lo reunido de su objetivo y la fecha, la barra y el plan ("Faltan 2 aportes de $945.000, uno al mes"), con un círculo "+" que abre el aporte. La cumplida dice "Cumplida" y no tiene círculo.
- **La hoja de una meta** (`htmlDetalleMeta()`, acción `meta-detalle`): la silueta grande, lo reunido con su porcentaje, la fecha, el plan y lo que falta, "Aportar", "Editar la meta" y "Eliminar esta meta". `formaSilueta()` e `iconoMeta()` pasan de privadas de `view.js` a `detalle.js`, que las comparte con la tarjeta.
- Pruebas: 10 nuevas en `metas`; un E2E a 390px abre la hoja, pasa a editar y aporta desde el círculo, y los dos de ADR 082 miden ahora las filas.

### feat(apartados): MV2.30 Ahorro tanda 2, Reservas y sus hojas · 2026-11-13

[ADR 133](DECISIONS/133-ahorro-del-adulto-en-el-telefono.md) D4. Ficha: [`contexto/apartados.md`](contexto/apartados.md). SW v681. Tablero "rediseño2".

- **La lista en el teléfono**: "Tienes reservado" y el total, una pastilla con cuántas vencen en 30 días y cuánto falta (dice lo del aviso de proximidad, que se calla bajo 1024px) y la pista de cómo se lee cada fila. Los grupos en frase, cada uno una tarjeta; "Vencen en 30 días" suma lo que falta. Sin el comparador: cada barra trae su rayita.
- **Cada reserva es una fila** (`htmlFilaReserva()`): su emoji, lo reunido de lo que necesita, la fecha ("10 de dic, en 27 días" hasta 60 días), la barra con la rayita de hoy y "Vas un aporte atrás"; el círculo de la derecha abre "Aportar" o, si está lista, la marca como usada.
- **La hoja de una reserva** (`htmlDetalleApartado()`, acción `reserva-detalle`): lo reunido contra lo que necesita, dónde deberías ir hoy, cuánto reponer, vence, el plan y lo que falta; "Se repite cada año" es un interruptor que cambia sin cerrar la hoja (apagarlo en una reserva ya reunida cierra la hoja antes de confirmar).
- **"Aportar"** (los dos anchos): lo reunido con su barra antes del monto, "¿Cuánto vas a aportar?" con el campo grande (`monto-hero`), "¿De qué cuenta sale?" y el botón con el monto escrito ("Aportar $90.000").
- **El vacío**: el botón vive dentro de la tarjeta del banner ("Crear mi primera reserva") y el "+ Reserva" del encabezado se va; la salida a Límites va al pie.
- Pruebas: 4 ajustadas y 14 nuevas en `apartados`; dos E2E a 390px recorren la fila, la hoja, el interruptor, "Aportar" y el vacío, y los dos de ADR 083 miden ahora las filas.

### feat(ahorro): MV2.30 Ahorro tanda 1, el encabezado de las cuatro lentes y el Fondo · 2026-11-13

[ADR 133](DECISIONS/133-ahorro-del-adulto-en-el-telefono.md) D1 a D3. Ficha: [`contexto/ahorro.md`](contexto/ahorro.md). SW v680. Tablero "rediseño2".

- **Para qué sirve cada lente** bajo su título ("Para pagos que ya sabes que llegan"), en los dos anchos: sin casa, la frase de cuándo se usa el dinero no decía para qué. El campo `cuando` de `MODALIDADES_AHORRO` pasa a `para`; la línea de propósito que abría la tarjeta del Fondo en escritorio sale, porque el subtítulo ya la dice.
- **El Fondo en el teléfono** (`_renderFondoTelefono()`): "Tu fondo te cubre 1 mes de 3" con una barra partida en los meses de la meta (`tramosCobertura()`, `cifraCobertura()`), la fecha hasta la que cubre, "Aportar al fondo" con el tinte (no sólido, ADR 049 D2) y "Ajustar", la nota del dinero que no se mueve en su caja, el compromiso como tarjeta con cuándo vuelve a empezar (`inicioPeriodoSiguiente()`) y los aportes en filas que abren su hoja con "Eliminar este aporte". Desde 1024px siguen la franja y la gota.
- **El Fondo vacío**: una sola pregunta (la del banner, con Tino) y la tarjeta pegada debajo con los tres niveles en tabla y "Empezar mi fondo" como primario; sin gastos fijos, la pista va al pie con "Ir a Por pagar". Cierra el hallazgo de GU.1a.
- **La tasa del mes** se dice como lo que es: "Este mes te queda el 79% de lo que recibes", según los gastos registrados hasta hoy.
- Pruebas: 5 ajustadas y 18 nuevas en `ahorro`; los dos E2E del Fondo a 390px miden la tarjeta del compromiso y abren la hoja de un aporte.

### feat(compromisos): MV2.30 Gastos tanda 5, la hoja del plan de salida; cierra Gastos · 2026-11-06

[ADR 132](DECISIONS/132-gastos-del-adulto-en-el-telefono.md) D10. Ficha: [`contexto/deudas.md`](contexto/deudas.md). SW v679. El tablero "rediseño1" queda aplicado completo y su HTML se borró.

- **El resultado primero**: "Con tus cuotas de hoy, sales de deudas en 15 meses y pagas $X en intereses", con Tino pensando en la cabeza.
- **¿Por cuál empiezas?**: Bola de nieve y Avalancha como dos pestañas, la recomendada primero y marcada; qué hace cada una, qué cuesta frente a la otra y el orden en que se terminan las deudas.
- **Pago extra**: "Si pagas un poco más cada mes" con el efecto al escribir (`resultadoExtra()`, repintado sin perder el foco) y "Aplicar $X más al mes". Si las cuotas no alcanzan para los intereses, el aviso va primero con lo que crece cada deuda y "Lo mínimo para salir" trae el monto escrito.
- **Otras opciones** (renegociar, juntar) como filas que abren su herramienta en su sitio. Solo en el teléfono: desde 1024px sigue la tarjeta del simulador.
- Pruebas: 7 nuevas en `compromisos`; el E2E de la hoja cambia de pestaña, escribe el extra y abre una opción.

### feat(gastos): MV2.30 Gastos tanda 4, la hoja "Nuevo gasto" · 2026-11-06

[ADR 132](DECISIONS/132-gastos-del-adulto-en-el-telefono.md) D9. Ficha: [`contexto/gastos.md`](contexto/gastos.md). SW v678. Tablero "rediseño1".

- **Preguntas en frase**: "¿Cuánto gastaste?", "¿En qué?", "¿De qué cuenta sale?" y "¿Cuándo?"; se va el "COP" bajo el monto y la nota sugiere "Ej.: almuerzo con el equipo".
- **Monto a la izquierda** en todas las hojas con monto del teléfono (acota el `.monto-hero` del ADR 042 a escritorio): el tablero lo dibuja igual en "Nuevo límite", "Aportar" y "Me pagaron".
- **Cuenta plegada**: con una ya elegida y otra para elegir, el selector compartido muestra solo la elegida ("Tienes $X") y "Cambiar"; elegir otra lo vuelve a plegar. La acción `cuenta-sel-cambiar` es built-in porque el selector es de infra.
- Pruebas: 1 ajustada y 3 nuevas en `gastos`; un E2E en el teléfono abre la hoja, cambia de cuenta y la ve plegarse.

### feat(presupuesto): MV2.30 Gastos tanda 3, Límites y las hojas de un límite · 2026-11-06

[ADR 132](DECISIONS/132-gastos-del-adulto-en-el-telefono.md) D8. Ficha: [`contexto/limites.md`](contexto/limites.md). SW v677. Tablero "rediseño1".

- **Tarjeta del plan** (los dos anchos): Estilo de vida primero, cada grupo dice dónde se mide ("Se mide en Por pagar" es la salida) y el aviso del grupo va dentro, no suelto arriba.
- **Topes en el teléfono**: una tarjeta con una fila por tope (lo gastado, la barra, "Pasó por" o "Quedan" y el porcentaje de su tope), sin botones. La fila abre su hoja (`presupuesto/detalle.js`): lo gastado de su tope, el aviso, sus gastos del mes, "Cambiar el límite" y "Quitar este límite". El de gastos pequeños es una fila más con su hoja. Desde 1024px siguen los sobres.
- **Resumen**: "Tus límites suman $X. Se pasaron N de M."; el aviso de que el plan no alcanza va aparte. La introducción queda solo en el vacío.
- **Nuevo límite**: la grilla de tres columnas y la pista "En noviembre llevas $X en Ropa.", con el origen de la cifra propuesta cuando no es esa.
- Pruebas: 8 ajustadas y 7 nuevas en `presupuesto`; en E2E, el orden del plan y un recorrido de la lente en el teléfono.

### feat(compromisos): MV2.30 Gastos tanda 2, Por pagar y la hoja de una deuda · 2026-11-06

[ADR 132](DECISIONS/132-gastos-del-adulto-en-el-telefono.md) D7. Ficha: [`contexto/deudas.md`](contexto/deudas.md). SW v676. Tablero "rediseño1".

- **Fila**: el nombre con su monto al lado y, a la derecha, un círculo que marca el pago (rojo vencido, ámbar hoy o mañana, neutro el resto; lleno y verde si ya se pagó). Se van el botón de texto por fila, las acciones escondidas y las notas que leía la hoja genérica.
- **Grupos**: "Vencidos" en rojo con "Del más antiguo al más reciente" debajo, sin mayúsculas sostenidas. "Vence hoy" pasa a ámbar: todavía no venció. Arriba, "Toca el círculo cuando pagues algo" solo si hay algo por marcar.
- **Hoja de un pago** (`views/detalle.js`, acción `compromiso-detalle`): la cuota del mes y cuándo vence, cuánto falta, la tasa y el día de pago; "Abonar" o "Marcar pagado", "Editar" y "Eliminar" (o "Archivar" si quedó en cero). Se arma con el compromiso, no copiando la fila.
- Filtros en el color de la sección y "Ver plan" a todo el ancho. Pruebas: 8 de la fila reescritas y 6 nuevas de la hoja en `compromisos`; el E2E de Por pagar toca el círculo y abre la hoja.

---

## Meses anteriores

- [2026-11, del 3 al 5](changelog/2026-11.md) (rotación forzada el 2026-11-13: el mes pasó el techo de 60 KB)
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
