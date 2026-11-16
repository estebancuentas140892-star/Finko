# ADR 150 - Estados de pago y logos en Inicio, y la hoja para elegir la cuenta del pago

**Estado:** Aceptada (2026-11-16). Tablero de Claude Design "Finko · Atención hoy y selección de cuenta" (cuatro pantallas: Atención hoy en el teléfono, la selección de cuenta plegada y abierta, y las reglas de estados y logos), aplicado tal cual: Esteban pidió "el diseño tal cual como el HTML", también donde choca con un ADR anterior (D7).
**Fecha:** 2026-11-16
**Autores:** Esteban (visión de producto, tablero de diseño), Claude Opus 5.5 (implementación)
**Relación:** **Cambia** el [ADR 126](126-inicio-del-adulto-en-el-telefono.md) D3 para los pagos (ya no se resumen en una frase destacada) y D4 (los totales, el enlace y el signo de "Esta semana"), el [ADR 066](066-motor-unico-de-avisos.md) D4 en "Atención hoy" (el orden de las filas) y el [ADR 102](102-fechas-con-el-ano-solo-si-no-es-el-de-hoy.md) D1 en una frase (D7). Se apoya en el [ADR 025](025-logotipos-de-marca-y-tejas.md) (la teja de marca) y en BR.7 (el logo llena su teja). Conserva el [ADR 099](099-inicio-movil-hoy-en-una-lista.md) (una fila por clase, tope de tres, un solo número) y el [ADR 149](149-inicio-centro-de-atencion-rapida.md) (qué entra a "Atención hoy").

---

## Contexto

"Atención hoy" decía "3 pagos para hoy · $463.800 · 1 ya vencido": el usuario sabía cuánto, pero no qué. Para saber si era Netflix o el arriendo tenía que abrir la hoja. El tablero de Esteban lista cada pago con el logo de su marca y su estado, y fija las reglas que comparten "Atención hoy", "Esta semana" y la hoja "Avisos de hoy". Además rediseña la pregunta "¿Desde qué cuenta?" del pago: hoy es una lista de tarjetas con un "Continuar", y el tablero la vuelve una hoja que muestra la cuenta propuesta, cuánto queda después del pago y un "Cambiar".

## Decisión

### D1. Tres estados de pago, dichos con ícono y palabra

| Estado | Ejemplo | Cómo se ve |
|---|---|---|
| Vencido | "Venció hace 2 días" | pastilla con `--fk-danger-bg` y `--fk-danger-text`, ícono `alert`. Va primero en la lista, el más atrasado arriba |
| Para hoy | "Vence hoy" | pastilla con `--fk-warning-bg` y `--fk-warning-text`, ícono `clock` |
| Próximo | "Jue 19 · en 3 días" | sin fondo, `--fk-text-secondary`, ícono `agenda`. Vive en "Esta semana" |

Nunca solo color. Un estado por fila; el monto queda neutro. La pieza es `chipEstadoPago()` (`infra/fila-pago.js`) con la clase `.chip-estado` (`atoms.css`).

### D2. La teja de un pago es su logo

- El logo llena la teja y no se recolorea (BR.7). Sin logo oficial, las iniciales sobre el color de la marca (lo que ya hace `tejaMarca`).
- La marca sale del `marcaId` guardado o del nombre ("Tarjeta Bancolombia" hereda el logo del banco). Sin marca reconocida, la teja de su categoría en el color de Por pagar. Es `tejaDePago()` (`infra/fila-pago.js`).
- El débito automático sin saldo lleva el logo de la cuenta que no alcanza: es la que hay que llenar.
- Lo que no es un pago (tu ingreso, la nube) conserva la teja de su sección.
- Tamaños: 44 con radio 13 (la cuenta elegida), 40 con radio 12 (filas del teléfono), 36 con radio 11 (filas de escritorio, `--fk-teja-lg`), 32 con radio 10 (la hoja y las listas compactas, `--fk-teja-md`). Filete de 1 px en todas (el borde que ya trae `.bank-avatar`).

### D3. "Pagos para hoy" lista cada pago

En "Atención hoy" del teléfono el grupo de pagos es un bloque propio: su título, una lista con un pago por fila (teja de 40, nombre, estado bajo el nombre, monto a la derecha) y el botón "Pagar los N · $total" a todo el ancho, con el color de Por pagar. Tope de tres pagos a la vista (`MAX_PAGOS_ATENCION`); el resto lo dice una línea ("Y 2 pagos más") y lo lista la hoja. El bloque va donde lo ponga el motor: si otro aviso es el primero, ese sigue destacado como antes (ADR 126 D3).

La hoja "Avisos de hoy" usa las mismas piezas en compacto: teja de 32 y estado en pastilla para cada pago; teja de la cuenta para cada débito sin saldo.

### D4. "Esta semana" con logo y fecha

Cada fila de "Esta semana" lleva la teja de su pago (D2) y el estado "próximo" (D1): "Jue 19 · en 3 días", en lugar del recuadro con el día a la izquierda.

### D5. La hoja "¿Desde qué cuenta vas a realizar el pago?"

Reemplaza el selector de tarjetas de `resolverPagoConSelector` (pagar un fijo o el lote de Inicio con varias cuentas):

- **Plegada:** la cuenta propuesta (la habitual del pago o, si no hay, la de mayor saldo) en una tarjeta con su logo de 44, su tipo y un botón "Cambiar"; debajo "Saldo disponible" en grande y "Después del pago te quedan $X". El botón dice "Pagar $total".
- **Cambiar:** la misma hoja muestra todas las cuentas como opciones (logo de 40, nombre, saldo en grande, círculo de marcado). La que no alcanza sola lo dice: "No alcanza sola · faltan $X". Elegirla sigue llevando al reparto entre cuentas, como antes.
- Sin frase de explicación bajo el título.

### D6. Escritorio: el estado en su propia columna

En las filas de pagos de escritorio la teja es de 36 y el estado va en una columna propia entre el nombre y el monto.

### D7. Lo que el tablero cambia de ADR anteriores

Esteban pidió el diseño "tal cual como el HTML", sin rondas de preguntas. Donde el tablero dibuja algo distinto de un ADR anterior, manda el tablero:

- **El orden de "Atención hoy":** pagos, después tu ingreso, después lo demás en el orden del motor (`ordenarGruposAtencion`). Cambia el [ADR 066](066-motor-unico-de-avisos.md) D4 ("esta superficie no reordena") solo aquí y en su hoja; dentro de los pagos, lo vencido primero (D1).
- **"Recibiste tu ingreso el 15 de noviembre":** el mes completo en esa frase. El [ADR 102](102-fechas-con-el-ano-solo-si-no-es-el-de-hoy.md) D1 (mes en tres letras) sigue para el resto de la app.
- **"Esta semana" sin totales ni enlace "Calendario" en el título**, que el tablero no dibuja. "Y N más en el Calendario" sigue al pie cuando hay más filas de las que caben. Cambia el [ADR 126](126-inicio-del-adulto-en-el-telefono.md) D4.
- **El monto de un pago va sin signo** ("$39.900"): el monto queda neutro (D1). Lo que entra conserva el "+" y su color: sin signo, entrar y salir se distinguirían solo por color.

## Alternativas descartadas

- **Mostrar todos los pagos en "Atención hoy", sin tope.** Con seis pagos vencidos la lista empujaba "Esta semana" fuera de la pantalla; la hoja ya existe para verlos todos.
- **Una pastilla también para lo próximo.** El tablero lo pide sin fondo: una pastilla de color en cada fila de la semana gritaría lo que no urge.
- **Conservar lo que chocaba con ADR anteriores** (el orden del motor, "15 de nov", los totales de la semana). Fue la primera lectura; Esteban pidió el tablero tal cual.

## Consecuencias

- La frase del lote ("3 pagos para hoy · 1 ya vencido") deja de verse en "Atención hoy": la dicen las pastillas de cada pago. `contenidoGrupo()` la sigue calculando para la hoja y para quien la necesite.
- Sin los totales de la semana, cuánto sale en siete días ya no se lee en Inicio: lo dice el Calendario.
- Se aplica en rebanadas: AH.1a (D1 a D3), AH.1b (D4 y D7), AH.1c (D5), AH.1d (D6).
