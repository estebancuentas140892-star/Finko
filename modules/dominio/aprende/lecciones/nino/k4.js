/**
 * lecciones/nino/k4.js - unidad 4 del niño, "Ahorrar poco a poco"
 * (ADR 093 D9). Solo datos. La idea de Frai: esperar a que crezca.
 *
 * Revisión pedagógica: pendiente (ADR 093), registrada en APR.3f.
 */

export default {
  'k4-l1': {
    id: 'k4-l1',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Esperar te ayuda a tener algo mejor.',
        texto: 'Frai crece despacio, pero crece todos los años.',
      },
      {
        tipo: 'elegir',
        etiqueta: '¿Qué harías?',
        pregunta: 'Quieres una bicicleta. ¿Qué te ayuda a tenerla?',
        opciones: ['Guardar un poco cada semana', 'Gastar todo cada semana', 'Esperar que aparezca sola'],
        correcta: 0,
        bien: 'Poco a poco, el frasco Ahorrar se llena.',
        casi: [
          '',
          'Si gastas todo, el frasco nunca se llena.',
          'Nada aparece solo. Hay que guardar.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'ahorrar', pregunta: '¿Qué te gustaría tener en unas semanas?' } },
    ],
  },

  'k4-l2': {
    id: 'k4-l2',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Las ganas de gastar pasan si esperas.',
        texto: 'Antes de gastar, espera un día. Luego decide.',
      },
      {
        tipo: 'elegir',
        etiqueta: '¿Qué harías?',
        pregunta: 'Ves un juguete y quieres comprarlo ya.',
        opciones: ['Lo compro enseguida', 'Espero un día y lo pienso', 'Pido que me lo regalen ya'],
        correcta: 1,
        bien: 'Esperar un día te ayuda a decidir mejor.',
        casi: [
          'Comprar enseguida a veces trae arrepentimiento.',
          '',
          'Pedirlo ya no te ayuda a decidir.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'gastar', pregunta: '¿Algo que querías ya no lo quieres?' } },
    ],
  },

  'k4-l3': {
    id: 'k4-l3',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Lo pequeño suma mucho con el tiempo.',
        texto: 'Con $1.000 cada semana, en un año tienes $52.000.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'Guardas $1.000 cada semana. ¿Cuánto tienes en 10 semanas?',
        opciones: ['$1.000', '$10.000', '$100.000'],
        correcta: 1,
        bien: '$1.000 por 10 semanas son $10.000.',
        casi: [
          '$1.000 es una semana. En 10 son $10.000.',
          '',
          'Es menos. $1.000 por 10 son $10.000.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'ahorrar', pregunta: '¿Cuánto puedes guardar cada semana?' } },
    ],
  },
};
