/**
 * lecciones/nino/k2.js - unidad 2 del niño, "Lo que necesito y lo que quiero"
 * (ADR 093 D9). Solo datos, con el mismo motor que el adulto.
 *
 * Voz del niño (D6): frases de máximo 10 palabras, cifras redondas. El
 * clasificar va con dos botones grandes ("Lo necesito", "Lo quiero").
 *
 * Revisión pedagógica: pendiente (ADR 093), registrada en APR.3f.
 */

export default {
  'k2-l1': {
    id: 'k2-l1',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Necesitar es no poder vivir sin algo.',
        texto: 'Querer es desear algo que puedes esperar.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: '¿Cuál de estas cosas necesitas?',
        opciones: ['Zapatos para el colegio', 'Una patineta nueva', 'Un juego nuevo'],
        correcta: 0,
        bien: 'Los zapatos los necesitas para ir al colegio.',
        casi: [
          '',
          'La patineta es divertida, pero puedes esperar.',
          'Un juego lo quieres. Puedes vivir sin él.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'gastar', pregunta: '¿Lo último que compraste lo necesitabas?' } },
    ],
  },

  'k2-l2': {
    id: 'k2-l2',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Antes de comprar, pregúntate: ¿lo necesito?',
        texto: 'Si solo lo quieres, puedes esperar unos días.',
      },
      {
        tipo: 'clasificar',
        etiqueta: 'Clasifica',
        pregunta: '¿Lo necesitas o lo quieres?',
        ayuda: 'Toca un botón para cada cosa. No hay prisa.',
        no: 'Lo quiero',
        si: 'Lo necesito',
        bien: '¡Así es! Separaste lo que necesitas de lo que quieres.',
        tarjetas: [
          { titulo: 'Un helado', detalle: '$3.000 en la tienda del colegio', icono: 'c-tienda', es: false,
            casi: 'El helado es rico, pero puedes vivir sin él.' },
          { titulo: 'Útiles del colegio', detalle: 'Cuadernos y lápices', icono: 'c-libro', es: true,
            casi: 'Los útiles los necesitas para aprender.' },
          { titulo: 'Un juguete nuevo', detalle: 'Lo viste en una vitrina', icono: 'c-regalo', es: false,
            casi: 'Un juguete lo quieres. Puedes esperar.' },
          { titulo: 'El almuerzo', detalle: 'La comida de cada día', icono: 'c-restaurantes', es: true,
            casi: 'Comer lo necesitas todos los días.' },
          { titulo: 'Una gaseosa', detalle: '$2.000 en la tienda', icono: 'c-cafe', es: false,
            casi: 'La gaseosa la quieres. El agua sí la necesitas.' },
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'gastar', pregunta: '¿Es para algo que necesitas o que quieres?' } },
    ],
  },

  'k2-l3': {
    id: 'k2-l3',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Primero lo que necesitas. Después, un gusto.',
        texto: 'Si sobra dinero, puedes darte un gusto pequeño.',
      },
      {
        tipo: 'elegir',
        etiqueta: '¿Qué harías?',
        pregunta: 'Tienes $5.000. Quieres un dulce y necesitas un lápiz.',
        opciones: ['Compro el lápiz primero', 'Compro solo el dulce', 'No compro nada'],
        correcta: 0,
        bien: 'Primero el lápiz. Si sobra, el dulce.',
        casi: [
          '',
          'Sin lápiz no puedes hacer la tarea.',
          'El lápiz sí lo necesitas. Cómpralo primero.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'gastar', pregunta: '¿Qué necesitas esta semana?' } },
    ],
  },
};
