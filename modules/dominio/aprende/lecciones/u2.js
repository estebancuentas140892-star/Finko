/**
 * lecciones/u2.js - unidad 2, "Repartir tu ingreso" (ADR 092 D8).
 *
 * Solo datos. Termina en Repartir ingreso: el Aplícalo (`reparto-503020`)
 * reparte tu ingreso del mes y abre el asistente; el control usa
 * `regla-503020`.
 *
 * Revisión pedagógica: pendiente (ADR 092, dudas), registrada en APR.2c.
 */

export default {
  'u2-l1': {
    id: 'u2-l1',
    aprendes: [
      'Cómo reparte la regla 50/30/20 cada $100 que recibes.',
      'Cuánto separar para ahorrar con tu ingreso.',
      'Cómo cambia el reparto si cambia tu ingreso.',
    ],
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'La regla 50/30/20 reparte cada $100 que recibes.',
        texto: '$50 para lo que necesitas, $30 para tus gustos y $20 para ahorrar o pagar deudas.',
        nota: 'Es un punto de partida: si tus necesidades pasan de la mitad, se ajusta.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'Ganas $2.000.000 al mes. Con la regla 50/30/20, ¿cuánto separas para ahorrar?',
        opciones: ['$200.000', '$400.000', '$600.000', '$1.000.000'],
        correcta: 1,
        bien: 'La regla reparte cada $100 que recibes: $50 para lo que necesitas, $30 para tus gustos y $20 para ahorrar o pagar deudas. De $2.000.000, son $400.000.',
        casi: [
          '$200.000 son $10 de cada $100. La regla separa $20: de $2.000.000 son $400.000.',
          '',
          '$600.000 son $30 de cada $100, la parte de tus gustos. Para ahorrar son $400.000.',
          '$1.000.000 es la mitad, la parte de lo que necesitas. Para ahorrar son $400.000.',
        ],
      },
      {
        tipo: 'control',
        etiqueta: 'Mueve el control',
        pregunta: 'Cambia el ingreso y mira cómo se reparte.',
        calculo: 'regla-503020',
        controles: [
          { id: 'ingreso', etiqueta: 'Lo que recibes al mes', opciones: [1_500_000, 2_000_000, 3_500_000], inicial: 2_000_000 },
        ],
      },
      { tipo: 'aplica', calculo: 'reparto-503020' },
    ],
  },

  'u2-l2': {
    id: 'u2-l2',
    aprendes: [
      'Cómo distinguir una necesidad de un gusto.',
      'Qué hacer si tus necesidades pasan de $50 de cada $100.',
      'Cómo recuperar margen con el tiempo.',
    ],
    pasos: [
      {
        tipo: 'clasificar',
        etiqueta: 'Clasifica',
        pregunta: '¿Es una necesidad o un gusto?',
        ayuda: 'Desliza a la derecha si es una necesidad y a la izquierda si es un gusto. También puedes usar los botones.',
        no: 'Gusto',
        si: 'Necesidad',
        tarjetas: [
          { titulo: 'Arriendo', detalle: 'Donde vives', icono: 'c-hogar', es: true,
            casi: 'Sin un lugar donde vivir no puedes seguir: es necesidad.' },
          { titulo: 'Plataformas de series', detalle: 'Películas y series en casa', icono: 'c-streaming', es: false,
            casi: 'Se disfruta, pero se puede vivir sin ellas: es un gusto.' },
          { titulo: 'Mercado del mes', detalle: 'La comida de la casa', icono: 'c-mercado', es: true,
            casi: 'La comida básica es necesidad.' },
          { titulo: 'Ropa de marca', detalle: 'Ya tienes ropa para el día a día', icono: 'c-ropa', es: false,
            casi: 'Vestirse es necesidad; la marca es un gusto.' },
          { titulo: 'Transporte al trabajo', detalle: 'Bus o metro todos los días', icono: 'c-bus', es: true,
            casi: 'Sin transporte no llegas a trabajar: es necesidad.' },
          { titulo: 'Comer afuera el fin de semana', detalle: 'Con amigos o en familia', icono: 'c-restaurantes', es: false,
            casi: 'Comer es necesidad; comer afuera es un gusto.' },
        ],
      },
      {
        tipo: 'elegir',
        etiqueta: '¿Qué harías?',
        pregunta: 'Tus necesidades suman $65 de cada $100 que recibes. ¿Qué haces con la regla?',
        opciones: [
          'La abandono: no sirve para mí',
          'Ajusto los porcentajes y busco bajar las necesidades con tiempo',
          'Dejo de ahorrar para siempre',
          'Cubro la diferencia con la tarjeta',
        ],
        correcta: 1,
        bien: 'Por ahora puede ser 65, 20 y 15. Con tiempo, buscar un arriendo o un plan más barato te devuelve margen.',
        casi: [
          'La regla es un punto de partida, no un examen: se adapta a tu caso.',
          '',
          'Aunque sea poco, separar algo cada mes crea el hábito.',
          'Cubrir necesidades con tarjeta convierte cada mes en deuda.',
        ],
      },
      { tipo: 'aplica', calculo: 'reparto-503020' },
    ],
  },

  'u2-l3': {
    id: 'u2-l3',
    aprendes: [
      'Por qué ahorrar lo que sobra casi nunca funciona.',
      'En qué orden repartir el ingreso el día que llega.',
      'Cómo hacer que el ahorro no dependa de lo que sobre.',
    ],
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Págate primero: separa el ahorro el día que llega el dinero.',
        texto: 'Si ahorras lo que sobra a fin de mes, casi nunca sobra. Si lo separas primero, el resto del mes se acomoda a lo que queda.',
        nota: 'En Finko, el asistente Repartir ingreso hace ese reparto el día del cobro.',
      },
      {
        tipo: 'ordenar',
        etiqueta: 'Ordena los pasos',
        pregunta: 'Ordena qué hacer cuando recibes tu ingreso',
        items: [
          'Llega tu ingreso',
          'Separas tu ahorro',
          'Pagas lo fijo',
          'Gastas lo que queda',
        ],
        bien: 'Ahorro primero, después lo fijo, y el resto para el día a día: así el ahorro no depende de lo que sobre.',
        casi: 'Si el ahorro va al final, compite con todo lo demás y casi siempre pierde. Va justo después de que llega el ingreso.',
      },
      { tipo: 'aplica', calculo: 'reparto-503020' },
    ],
  },
};
