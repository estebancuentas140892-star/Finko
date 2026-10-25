/**
 * lecciones/u7.js - unidad 7, "Crédito e intereses" (ADR 092 D8).
 *
 * Solo datos. Termina en Por pagar: el Aplícalo (`deudas`) dice lo que te
 * cobran tus deudas este mes; el control usa `credito-cuotas`.
 *
 * Revisión pedagógica: pendiente (ADR 092, dudas), registrada en APR.2c.
 */

export default {
  'u7-l1': {
    id: 'u7-l1',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Una tasa al mes se ve pequeña, pero se acumula en el año.',
        texto: 'El 2 % al mes no es el 24 % al año: es cerca del 27 %, porque cada mes cobra intereses sobre los intereses del anterior. Esa es la tasa efectiva anual.',
        nota: 'Para comparar créditos, compara siempre la tasa efectiva anual.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: '¿Qué crédito es más barato?',
        opciones: ['Uno al 2 % mensual', 'Uno al 22 % efectivo anual', 'Cuestan lo mismo'],
        correcta: 1,
        bien: 'El 2 % mensual equivale a casi el 27 % al año: el del 22 % efectivo anual cuesta menos.',
        casi: [
          'El 2 % mensual equivale a casi el 27 % efectivo anual: cuesta más que el del 22 %.',
          '',
          'No cuestan lo mismo: el 2 % al mes son casi el 27 % al año, más que el 22 %.',
        ],
      },
      { tipo: 'aplica', calculo: 'deudas' },
    ],
  },

  'u7-l2': {
    id: 'u7-l2',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'La tarjeta de crédito es un préstamo que pides cada vez que la usas.',
        texto: 'Si pagas el total de la factura en la fecha, por lo general no pagas intereses. Si pagas solo el mínimo, lo demás queda debiendo y cobra intereses.',
        nota: 'Las compras a varias cuotas cobran intereses sobre lo que falta por pagar.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'Tu factura es de $800.000 y el pago mínimo es de $80.000. ¿Qué te cobra menos?',
        opciones: ['Pagar el mínimo', 'Pagar el total', 'No pagar este mes', 'Pagar la mitad'],
        correcta: 1,
        bien: 'Pagando el total en la fecha no queda saldo que cobre intereses.',
        casi: [
          'Con el mínimo, los $720.000 que quedan cobran intereses el mes siguiente.',
          '',
          'Además de intereses, no pagar trae cobros de mora y daña tu historial.',
          'La mitad que queda debiendo cobra intereses.',
        ],
      },
      {
        tipo: 'clasificar',
        etiqueta: 'Clasifica',
        pregunta: '¿Te cobra intereses?',
        ayuda: 'Desliza a la derecha si cobra intereses y a la izquierda si no. También puedes usar los botones.',
        no: 'No cobra',
        si: 'Cobra intereses',
        tarjetas: [
          { titulo: 'Pagar el total de la factura a tiempo', detalle: 'Antes de la fecha límite', icono: 'i-check-circle', es: false,
            casi: 'Si pagas todo en la fecha, no queda saldo que cobre intereses.' },
          { titulo: 'Una compra a 12 cuotas', detalle: 'Un televisor', icono: 'c-compras', es: true,
            casi: 'Las cuotas cobran intereses sobre lo que falta por pagar.' },
          { titulo: 'Un avance en efectivo', detalle: 'Sacado en un cajero', icono: 'c-billete', es: true,
            casi: 'El avance cobra intereses desde el día en que lo sacas.' },
          { titulo: 'Pagar solo el mínimo', detalle: 'El resto queda para después', icono: 'c-recibo', es: true,
            casi: 'Lo que no pagas queda debiendo y cobra intereses.' },
        ],
      },
      { tipo: 'aplica', calculo: 'deudas' },
    ],
  },

  'u7-l3': {
    id: 'u7-l3',
    pasos: [
      {
        tipo: 'control',
        etiqueta: 'Mueve el control',
        pregunta: 'Un crédito al 2 % al mes. ¿Cuánto pagas según las cuotas?',
        calculo: 'credito-cuotas',
        controles: [
          { id: 'monto', etiqueta: 'Lo que pides', opciones: [500_000, 1_000_000, 3_000_000], inicial: 1_000_000 },
          { id: 'cuotas', etiqueta: 'Número de cuotas', min: 1, max: 36, inicial: 12 },
        ],
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: '¿Por qué una cuota más baja puede salir más cara?',
        opciones: [
          'Porque son más cuotas, y cada mes se pagan intereses',
          'Porque el banco se equivoca',
          'No sale más cara',
          'Porque la tasa cambia sola',
        ],
        correcta: 0,
        bien: 'A 36 cuotas pagas mucho más en intereses que a 12, aunque la cuota se vea más cómoda.',
        casi: [
          '',
          'No es un error: es la cuenta de pagar intereses durante más meses.',
          'Sí sale más cara: compara el total de intereses a 36 cuotas contra 12.',
          'La tasa puede ser la misma: lo que cambia es cuántos meses la pagas.',
        ],
      },
      { tipo: 'aplica', calculo: 'deudas' },
    ],
  },

  'u7-l4': {
    id: 'u7-l4',
    pasos: [
      {
        tipo: 'elegir',
        etiqueta: '¿Qué harías?',
        pregunta: 'Te ofrecen un crédito rápido por mensaje de texto, sin revisar nada.',
        opciones: [
          'Aceptarlo',
          'Verificar que la entidad esté vigilada por la Superintendencia Financiera y comparar la tasa',
          'Dar tus claves para que lo aprueben',
          'Pagar un adelanto para recibirlo',
        ],
        correcta: 1,
        bien: 'Revisa que esté vigilada y compara la tasa efectiva anual antes de firmar.',
        casi: [
          'Un crédito sin revisión ni condiciones claras puede ser una estafa o un gota a gota.',
          '',
          'Nadie legítimo te pide tus claves.',
          'Pedir un pago por adelantado para prestarte es una señal de estafa.',
        ],
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: '¿Qué conviene comparar entre dos créditos?',
        opciones: [
          'Solo la cuota',
          'La tasa efectiva anual y el total que pagas',
          'El diseño de la tarjeta',
          'Qué tan rápido lo aprueban',
        ],
        correcta: 1,
        bien: 'La tasa efectiva anual y el total a pagar dicen cuál cuesta menos de verdad.',
        casi: [
          'Una cuota baja puede esconder muchos meses de intereses.',
          '',
          'El diseño no cambia lo que pagas.',
          'La rapidez no dice cuánto cuesta.',
        ],
      },
      { tipo: 'aplica', calculo: 'deudas' },
    ],
  },
};
