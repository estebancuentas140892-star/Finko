# ADR 151 - El estado de una obligación se decide una vez

**Estado:** Aceptada (2026-11-16). Pedido de Esteban en chat ("Correcciones funcionales de Atención hoy"): clasificar cada obligación por su fecha límite, que los mensajes y las cantidades coincidan en todo el flujo de pago, asociar los gastos de plataformas a su servicio y simplificar los textos de la selección de cuenta.
**Fecha:** 2026-11-16
**Autores:** Esteban (pedido), Claude Opus 5.5 (diseño e implementación)
**Relación:** **Complementa** el [ADR 150](150-estados-de-pago-y-logos-en-inicio.md): sus pastillas leen el estado que se decide acá. **Cambia** el [ADR 126](126-inicio-del-adulto-en-el-telefono.md) D6 en el texto de las filas del lote ("Venció el 5" pasa a "Venció hace 11 días") y en su introducción. **Conserva** el [ADR 099](099-inicio-movil-hoy-en-una-lista.md) D2 (lo que vence después de hoy no entra a "Atención hoy"), el [ADR 132](132-gastos-del-adulto-en-el-telefono.md) D7 (lo de hoy en ámbar, lo vencido en rojo) y el [ADR 146](146-finko-reconoce-el-tipo-de-gasto.md) D4 y su alternativa 3 (el gasto no guarda plataforma). Se apoya en el [ADR 066](066-motor-unico-de-avisos.md) D3: el motor no detecta nada nuevo, combina lo que ya existe.

---

## Contexto

Con dos pagos vencidos, "Atención hoy" decía "2 pagos para hoy" y debajo "2 ya vencidos". El botón abría el lote con el título "Pagos para hoy" y la frase "Vencen hoy o ya vencieron y no están registrados", y la selección de cuenta pedía "Elige la cuenta para registrar 2 pagos vencidos de $X" aunque uno venciera hoy.

Revisado el código, no era un texto mal escrito sino el mismo dato decidido en muchos sitios:

- **El estado:** "Atención hoy" lo leía del `sentido` del aviso; el lote comparaba `dia` contra `new Date().getDate()`; "Por pagar", el panel de escritorio y la tarjeta del lote, contra `diasAtraso === 0`. Cada uno lo escribía con sus palabras ("Venció el 5", "hace 2 días", "ya vencieron", "Ya se venció"), y varios llamaban vencido a lo que vence hoy.
- **El conjunto que se paga:** `_pendientesDelMes` del lote, `_montosVencidos` de "Por pagar" y la banda del Calendario repetían la misma intersección de `vencidosSinPagar` con `pendientesDePagoDelMes`. El panel de Inicio usaba solo la primera mitad.
- **El monto:** "Atención hoy" y el panel de Inicio sumaban la cuota completa; el lote cobraba lo que falta tras un abono parcial. Una deuda personal sin cuota (D.13) salía "vencida" por $0 en "Atención hoy" y el lote no la traía: el botón decía 2 y el modal abría 1.

Las fechas ya se leían bien: todo se cuenta en días de calendario locales (`hoy()`, `diasHastaFecha` a medianoche local, `fechaLocalISO` para el sello de creación). El defecto era de reglas repetidas, no de zona horaria.

## Decisión

### D1. Tres estados, una función

`estadoObligacion(diasRestantes)` en `infra/estado-obligacion.js`: **vencido** si la fecha límite ya pasó, **hoy** si es hoy, **próximo** si llega dentro de la anticipación de la app (`DIAS_ANTICIPACION_OBLIGACION`, 3 días, el umbral de siempre de `compromiso-proximo`, que ahora lo toma de acá). Más lejos no tiene estado. Sin un número entero no hay estado: `null` no se lee como "hoy".

### D2. Un texto por estado

`textoEstadoObligacion` dice el estado con su tono: "Venció ayer" y "Venció hace N días" en rojo, "Vence hoy" en ámbar, "Vence mañana" y "Vence en N días" sin color. Lo usan "Atención hoy" y su hoja, las filas del lote, "Por pagar" y el panel de Inicio en los dos anchos. Reemplaza "Venció el 5" del lote (ADR 126 D6): el mismo pago no se dice de dos maneras entre la fila que se toca y el modal que abre.

### D3. Un grupo se nombra por lo que trae

- **Frase** (`fraseObligaciones`): "2 pagos vencidos", "1 pago vence hoy", "3 pagos pendientes".
- **Título** (`tituloObligaciones`): "Pagos vencidos", "Pago para hoy", "Pagos pendientes". Lo usan el bloque de pagos de "Atención hoy", el título del modal del lote (antes fijo en "Pagos para hoy"), el grupo de "Por pagar" (antes "Vencidos"), el rótulo del panel de escritorio (antes "Ya se venció") y la banda del Calendario (antes "De eso, ya se venció").
- **Desglose** (`detalleObligaciones`): "1 vencido · 2 vencen hoy", solo si los estados se mezclan. Con un solo estado el título ya lo dice; repetirlo debajo era el defecto.

### D4. Un conjunto, un monto

`pagosPendientesDelMes` es el conjunto del pago en lote, con el monto que falta y el estado de cada pago. Lo leen el lote, "Por pagar", el panel de Inicio, la banda del Calendario y el motor de avisos: `compromiso-vencido` y `compromiso-proximo` de 0 días toman de ahí su monto, y lo que no está en el conjunto (no hay nada que pagar este mes) no es un pago vencido. Así "Pagar los N · $X" de cualquier superficie dice lo que el modal va a registrar.

### D5. El flujo de pago no repite lo que el usuario ya sabe

- La introducción del lote queda en lo que hace falta para actuar: "Desmarca los que aún no hayas pagado.", y con deudas, que el abono baja su saldo.
- La selección de cuenta no lleva frase bajo el título "¿Desde qué cuenta vas a realizar el pago?" (lo aplica la hoja del ADR 150 D5). El contexto que viaja al selector es "registrar estos pagos": lo leen la guía sin cuentas y el reparto entre cuentas, y ya no dice "vencidos".
- Botones y etiquetas dicen "Pagar los N" en lugar de "Pagar lo vencido" o "N pagos vencidos" cuando el conjunto trae lo de hoy.
- El registro y la confirmación conservan el número y el total ("2 pagos registrados por $X"): son el resultado, no una repetición.

### D6. El servicio de un gasto se hereda, no se copia

Una suscripción vive en un gasto fijo de Streaming o Suscripciones con su `marcaId` (ADR 146 D4), y cada pago de ese fijo es un gasto con `compromisoId`. `marcaDeGasto(gasto, compromisos)` (`infra/marcas.js`) lee el servicio por ese vínculo: Netflix, Disney+, HBO Max, Prime Video o el banco de la deuda que se abonó. Si el fijo se borró, la descripción del pago ("Pago: Netflix") lo dice. Un gasto suelto no tiene servicio. `marcaDeCompromiso` es la misma lectura para un compromiso: el `marcaId` guardado y, sin él, su nombre. Sin campo nuevo, sin migración, ningún registro cambia; la interfaz puede pintar el logo de cualquier pago cuando lo decida.

## Alternativas descartadas

1. **Corregir solo las frases.** El monto y el conteo seguían saliendo de reglas distintas: la próxima frase nueva habría vuelto a discrepar.
2. **Guardar el servicio en el gasto** (`marcaId` en cada gasto). Es la alternativa 3 del ADR 146: duplica el lugar donde vive una suscripción, se queda vieja si el fijo cambia de plataforma y pide una migración.
3. **Llevar lo próximo a vencer a "Atención hoy".** Revierte el ADR 099 D2: lo próximo vive en "Esta semana", que ahora lo nombra con el mismo estado.
4. **Una frase con el estado bajo el título de la selección de cuenta.** Repite lo que el usuario acaba de marcar en el lote.

## Consecuencias

- **Positivas:** un pago dice lo mismo en "Atención hoy", el lote, "Por pagar", el panel de Inicio y el Calendario; los montos coinciden con lo que se registra; agregar un estado o cambiar un texto es tocar un archivo.
- **Notificaciones:** una deuda personal sin cuota ya no avisa "vencida": no hay cuota que pagar.
- **Límites que siguen:** el conjunto es del mes en curso (lo que venció el mes pasado y sigue sin pagar no aparece; `vencidosSinPagar` razona por mes). Un débito automático sin saldo que vence hoy va en su fila "no alcanza" (HF.2b) y no en el bloque de pagos, pero el lote sí lo trae: ese día el botón puede decir N y el modal traer N+1.
