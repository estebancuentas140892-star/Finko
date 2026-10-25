/**
 * lecciones/u9.js - unidad 9, "Impuestos: 4x1000 y renta" (ADR 092 D8).
 *
 * Solo datos. Termina en Análisis, donde vive el monitor de renta: el
 * Aplícalo (`impuestos`) compara tus ingresos del año con el tope.
 *
 * Cifras que cambian cada año (ADR 092, dudas): nunca escritas a mano. Los
 * textos usan los marcadores `{anio}`, `{exento4x1000}` y `{topeRenta}`, que
 * la vista llena con `core/constants.js` (ADN 12), y se revisan con E.2.
 *
 * Revisión pedagógica: pendiente (ADR 092, dudas), registrada en APR.2c.
 */

export default {
  'u9-l1': {
    id: 'u9-l1',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'El 4x1000 es un impuesto a los movimientos de dinero.',
        texto: 'Por cada $1.000 que sale de tu cuenta, el banco descuenta $4 para el Estado. Se llama gravamen a los movimientos financieros.',
        nota: 'Se cobra al retirar o transferir, no al recibir.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'Transfieres $1.000.000 desde una cuenta que no está marcada como exenta. ¿Cuánto es el 4x1000?',
        opciones: ['$400', '$4.000', '$40.000', '$0'],
        correcta: 1,
        bien: '$4 por cada $1.000: por $1.000.000 son $4.000.',
        casi: [
          '$400 sería por cada $100.000. Por $1.000.000 son $4.000.',
          '',
          '$40.000 sería el 4 %. El 4x1000 son $4 de cada $1.000: $4.000.',
          'Si la cuenta no está marcada como exenta, sí se cobra: $4.000.',
        ],
      },
      { tipo: 'aplica', calculo: 'impuestos' },
    ],
  },

  'u9-l2': {
    id: 'u9-l2',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Puedes marcar una cuenta de ahorros como exenta del 4x1000.',
        texto: 'En esa cuenta, lo que retiras al mes hasta 350 UVT no paga el impuesto: con valores de {anio}, son {exento4x1000}. Se pide en el banco.',
        nota: 'Solo una cuenta por persona puede estar marcada como exenta.',
      },
      {
        tipo: 'elegir',
        etiqueta: '¿Qué harías?',
        pregunta: 'Tienes dos cuentas de ahorros y casi todo tu dinero lo mueves en una.',
        opciones: [
          'Marcar como exenta la que más mueves',
          'Marcar la que casi no usas',
          'Marcar las dos',
          'No marcar ninguna',
        ],
        correcta: 0,
        bien: 'La exención rinde más en la cuenta donde mueves tu dinero.',
        casi: [
          '',
          'La exención sirve donde más mueves: en la otra casi no te ahorras nada.',
          'Solo una cuenta por persona puede estar exenta.',
          'Sin cuenta exenta pagas el 4x1000 sobre todo lo que retiras.',
        ],
      },
      { tipo: 'aplica', calculo: 'impuestos' },
    ],
  },

  'u9-l3': {
    id: 'u9-l3',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Declarar renta depende de cuánto recibes, tienes y gastas en el año.',
        texto: 'Uno de los topes es el de ingresos: si en el año recibiste 1.400 UVT o más ({topeRenta} con valores de {anio}), tienes que declarar. Hay topes parecidos para el patrimonio, las compras con tarjeta y las consignaciones.',
        nota: 'Declarar no siempre significa pagar: a veces solo se informa.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'Si pasas uno solo de los topes, ¿tienes que declarar?',
        opciones: ['Sí, basta con uno', 'No, tienen que ser todos', 'Solo si eres independiente', 'Solo si tienes casa propia'],
        correcta: 0,
        bien: 'Basta con pasar uno: por eso conviene revisarlos todos.',
        casi: [
          '',
          'Basta con pasar uno de los topes para quedar obligado.',
          'Aplica igual a empleados e independientes.',
          'El patrimonio es uno de los topes, no el único.',
        ],
      },
      { tipo: 'aplica', calculo: 'impuestos' },
    ],
  },
};
