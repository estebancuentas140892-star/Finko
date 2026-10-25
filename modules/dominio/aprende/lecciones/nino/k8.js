/**
 * lecciones/nino/k8.js - unidad 8 del niño, "¿Por qué crece mi dinero?"
 * (ADR 093 D9). Solo datos. El interés que se ve: el premio por ahorrar
 * que da el tutor (D4). A esta unidad enlaza la tarjeta del premio.
 *
 * Revisión pedagógica: pendiente (ADR 093), registrada en APR.3f.
 */

export default {
  'k8-l1': {
    id: 'k8-l1',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Si dejas tu dinero quieto, puede crecer.',
        texto: 'A eso se le llama interés: te pagan por guardar.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: '¿Qué es el interés?',
        opciones: ['Lo que te pagan por guardar', 'Un regalo de cumpleaños', 'Lo que gastas en dulces'],
        correcta: 0,
        bien: 'El interés premia el dinero que guardas.',
        casi: [
          '',
          'Un regalo no depende de lo que guardas.',
          'Lo que gastas no crece. Se va.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'ahorrar', pregunta: '¿Cuánto tienes guardado ahora?' } },
    ],
  },

  'k8-l2': {
    id: 'k8-l2',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Más guardado, más premio.',
        texto: 'Con $1 por cada $10, $20.000 te dan $2.000.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'Te suman $1 por cada $10. Guardas $30.000. ¿Cuánto recibes?',
        opciones: ['$3.000', '$30.000', '$300'],
        correcta: 0,
        bien: 'Por cada $10 recibes $1. Con $30.000 son $3.000.',
        casi: [
          '',
          'Eso sería recibir todo lo que guardas. Son $3.000.',
          'Es más. Por cada $10, $1: son $3.000.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'ahorrar', pregunta: '¿Cuánto recibirías con lo que tienes?' } },
    ],
  },

  'k8-l3': {
    id: 'k8-l3',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'El tiempo hace crecer tu dinero guardado.',
        texto: 'Cada mes el premio se suma y sigue creciendo.',
      },
      {
        tipo: 'elegir',
        etiqueta: '¿Qué harías?',
        pregunta: 'Recibiste tu premio. ¿Qué te ayuda a crecer más?',
        opciones: ['Dejarlo en Ahorrar', 'Gastarlo todo hoy', 'Esconderlo y olvidarlo'],
        correcta: 0,
        bien: 'En Ahorrar, el mes que viene te da más premio.',
        casi: [
          '',
          'Si lo gastas, ya no crece.',
          'Escondido no te suma premio.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'ahorrar', pregunta: '¿Para qué meta te sirve tu premio?' } },
    ],
  },
};
