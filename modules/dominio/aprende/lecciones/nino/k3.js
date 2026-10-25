/**
 * lecciones/nino/k3.js - unidad 3 del niño, "Mi alcancía y mi meta"
 * (ADR 093 D9). Solo datos. Termina en su alcancía: los tres frascos y una
 * meta con precio y semanas.
 *
 * Revisión pedagógica: pendiente (ADR 093), registrada en APR.3f.
 */

export default {
  'k3-l1': {
    id: 'k3-l1',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Tu dinero va en tres frascos.',
        texto: 'Ahorrar es para tus metas. Gastar, para tus gustos. Compartir, para ayudar.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'Quieres juntar para un balón. ¿Qué frasco usas?',
        opciones: ['Ahorrar', 'Gastar', 'Compartir'],
        correcta: 0,
        bien: 'Ahorrar es el frasco de tus metas.',
        casi: [
          '',
          'Gastar es para los gustos de hoy.',
          'Compartir es para regalar o ayudar.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'ahorrar', pregunta: '¿Para qué quieres ahorrar?' } },
    ],
  },

  'k3-l2': {
    id: 'k3-l2',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Una meta es algo que quieres, con su precio.',
        texto: 'Saber cuánto cuesta te dice cuánto te falta.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'Un libro cuesta $20.000. Tienes $5.000. ¿Cuánto te falta?',
        opciones: ['$15.000', '$25.000', '$5.000'],
        correcta: 0,
        bien: '$20.000 menos $5.000 son $15.000.',
        casi: [
          '',
          'Se resta, no se suma. Te faltan $15.000.',
          '$5.000 es lo que tienes. Te faltan $15.000.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'ahorrar', pregunta: '¿Ya tienes tu meta en la alcancía?' } },
    ],
  },

  'k3-l3': {
    id: 'k3-l3',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Si guardas un poco cada semana, llegas.',
        texto: 'Con $2.000 cada semana, en 5 semanas tienes $10.000.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'Guardas $3.000 cada semana. ¿Cuánto tienes en 4 semanas?',
        opciones: ['$7.000', '$12.000', '$3.000'],
        correcta: 1,
        bien: '$3.000 por 4 semanas son $12.000.',
        casi: [
          'Se multiplica: $3.000 por 4 son $12.000.',
          '',
          '$3.000 es una semana. En 4 son $12.000.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'ahorrar', pregunta: '¿Cuánto guardarás esta semana?' } },
    ],
  },
};
