/**
 * lecciones/nino/k1.js - unidad 1 del niño, "¿Qué es el dinero?" (ADR 093 D9).
 *
 * Solo datos, con el mismo motor que el adulto. Voz del niño (D6): frases de
 * máximo 10 palabras, cifras en pesos redondos, exclamaciones solo en lo que
 * dice el personaje (Tino, ADR 094). El cierre es "Úsalo de verdad" (`usalo`): una pregunta sobre un
 * frasco de su alcancía, con lo que tiene ahí.
 *
 * Revisión pedagógica: pendiente (ADR 093), registrada en APR.3f.
 */

export default {
  'k1-l1': {
    id: 'k1-l1',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'El dinero sirve para cambiarlo por cosas.',
        texto: 'Con dinero compras comida, útiles o un helado.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: '¿Qué puedes conseguir con dinero?',
        opciones: ['Un cuaderno', 'Que llueva', 'Volar como un pájaro'],
        correcta: 0,
        bien: 'Un cuaderno se compra con dinero.',
        casi: [
          '',
          'La lluvia no se compra. La trae el cielo.',
          'Volar no se compra con dinero.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'gastar', pregunta: '¿Qué compraste la última vez?' } },
    ],
  },

  'k1-l2': {
    id: 'k1-l2',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'El dinero se gana trabajando.',
        texto: 'Tu familia trabaja para ganarlo. Por eso vale cuidarlo.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: '¿De dónde sale el dinero de tu mesada?',
        opciones: ['Del trabajo de tu familia', 'De un árbol', 'Aparece solo'],
        correcta: 0,
        bien: 'Alguien trabajó para ganar ese dinero.',
        casi: [
          '',
          'El dinero no crece en los árboles.',
          'El dinero no aparece solo. Alguien lo gana.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'ahorrar', pregunta: '¿Cómo vas a cuidar tu dinero?' } },
    ],
  },

  'k1-l3': {
    id: 'k1-l3',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Guardar es no gastar todo hoy.',
        texto: 'El guatín guarda semillas para cuando no hay frutos. Tú puedes guardar dinero.',
      },
      {
        tipo: 'elegir',
        etiqueta: '¿Qué harías?',
        pregunta: 'Te regalan $10.000. ¿Qué haces?',
        opciones: ['Gastar todo hoy', 'Guardar una parte', 'Dejarlo por ahí'],
        correcta: 1,
        bien: 'Guardar una parte te deja dinero para mañana.',
        casi: [
          'Si gastas todo hoy, mañana no tienes nada.',
          '',
          'Si lo dejas por ahí, se te puede perder.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'ahorrar', pregunta: '¿Cuánto quieres guardar esta semana?' } },
    ],
  },
};
