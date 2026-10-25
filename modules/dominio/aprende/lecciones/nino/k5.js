/**
 * lecciones/nino/k5.js - unidad 5 del niño, "Gastar con un plan"
 * (ADR 093 D9). Solo datos. Mirar el precio, comparar y saber cuánto hay
 * en el frasco Gastar antes de comprar.
 *
 * Revisión pedagógica: pendiente (ADR 093), registrada en APR.3f.
 */

export default {
  'k5-l1': {
    id: 'k5-l1',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Antes de comprar, mira el precio.',
        texto: 'Si cuesta más de lo que tienes, no alcanza.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'Tienes $4.000. ¿Qué puedes comprar?',
        opciones: ['Un jugo de $3.000', 'Un libro de $15.000', 'Un balón de $30.000'],
        correcta: 0,
        bien: '$3.000 es menos que $4.000. Te alcanza.',
        casi: [
          '',
          '$15.000 es más de lo que tienes.',
          '$30.000 es mucho más de lo que tienes.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'gastar', pregunta: '¿Cuánto puedes gastar esta semana?' } },
    ],
  },

  'k5-l2': {
    id: 'k5-l2',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Lo mismo puede costar distinto en otra tienda.',
        texto: 'Comparar precios te deja más dinero para otra cosa.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'El mismo cuaderno cuesta $4.000 aquí y $3.000 allá.',
        opciones: ['Lo compro donde cuesta $3.000', 'Lo compro donde cuesta $4.000', 'Da igual'],
        correcta: 0,
        bien: 'Así te quedan $1.000 más.',
        casi: [
          '',
          'Es el mismo cuaderno, pero pagas $1.000 más.',
          'No da igual: allá te ahorras $1.000.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'gastar', pregunta: '¿Comparaste precios la última vez?' } },
    ],
  },

  'k5-l3': {
    id: 'k5-l3',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Gasta solo lo que hay en Gastar.',
        texto: 'Así no tocas lo que guardas para tu meta.',
      },
      {
        tipo: 'elegir',
        etiqueta: '¿Qué harías?',
        pregunta: 'En Gastar tienes $2.000. Quieres algo de $5.000.',
        opciones: ['Saco de Ahorrar sin pensar', 'Espero y junto en Gastar', 'Pido prestado sin pagar'],
        correcta: 1,
        bien: 'Esperar te deja comprarlo sin tocar tu meta.',
        casi: [
          'Ahorrar es para tu meta. Mejor espera.',
          '',
          'Lo prestado se devuelve. Mejor espera y junta.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'gastar', pregunta: '¿Para qué juntas en Gastar?' } },
    ],
  },
};
