/**
 * lecciones/nino/k7.js - unidad 7 del niño, "Guardar para lo que no esperas"
 * (ADR 093 D9). Solo datos. La idea de Frai: tener reserva, como el agua
 * que guarda para cuando no llueve.
 *
 * Revisión pedagógica: pendiente (ADR 093), registrada en APR.3f.
 */

export default {
  'k7-l1': {
    id: 'k7-l1',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'A veces pasan cosas que no esperas.',
        texto: 'Frai guarda agua para cuando no llueve.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: '¿Cuál de estas cosas no la esperabas?',
        opciones: ['Se te rompe el morral', 'Tu cumpleaños', 'El fin de semana'],
        correcta: 0,
        bien: 'Un morral roto no avisa. Pasa y ya.',
        casi: [
          '',
          'Tu cumpleaños llega cada año. Lo sabes.',
          'El fin de semana llega siempre.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'ahorrar', pregunta: '¿Qué podría dañarse y necesitar arreglo?' } },
    ],
  },

  'k7-l2': {
    id: 'k7-l2',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Una reserva es dinero guardado para un problema.',
        texto: 'Si algo se daña, la reserva te ayuda.',
      },
      {
        tipo: 'elegir',
        etiqueta: '¿Qué harías?',
        pregunta: 'Se pierde tu borrador y tienes reserva.',
        opciones: ['Uso un poco de la reserva', 'Lloro y no hago nada', 'Gasto toda la reserva en dulces'],
        correcta: 0,
        bien: 'Para eso es la reserva.',
        casi: [
          '',
          'Tranquilo. Tu reserva puede ayudarte.',
          'La reserva es para el problema, no para dulces.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'ahorrar', pregunta: '¿Cuánto quieres tener de reserva?' } },
    ],
  },

  'k7-l3': {
    id: 'k7-l3',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'No gastes todo lo que guardas.',
        texto: 'Deja siempre un poco para lo que no esperas.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'Tienes $10.000 en Ahorrar. ¿Qué es mejor?',
        opciones: ['Dejar una parte de reserva', 'Gastarlo todo hoy', 'Regalarlo todo'],
        correcta: 0,
        bien: 'Una parte queda lista por si algo pasa.',
        casi: [
          '',
          'Si gastas todo, no te queda reserva.',
          'Regalar es lindo, pero deja una reserva.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'ahorrar', pregunta: '¿Tienes algo guardado por si acaso?' } },
    ],
  },
};
