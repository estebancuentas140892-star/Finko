/**
 * lecciones/nino/k6.js - unidad 6 del niño, "Compartir y ayudar"
 * (ADR 093 D9). Solo datos. Termina en el frasco Compartir.
 *
 * Revisión pedagógica: pendiente (ADR 093), registrada en APR.3f.
 */

export default {
  'k6-l1': {
    id: 'k6-l1',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Compartir también es usar bien el dinero.',
        texto: 'El frasco Compartir es para regalar o ayudar.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: '¿Para qué sirve el frasco Compartir?',
        opciones: ['Para un regalo a la abuela', 'Para tu balón nuevo', 'Para un dulce para ti'],
        correcta: 0,
        bien: 'Compartir es pensar en otros.',
        casi: [
          '',
          'El balón es una meta: va en Ahorrar.',
          'Un dulce para ti va en Gastar.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'compartir', pregunta: '¿A quién te gustaría darle algo?' } },
    ],
  },

  'k6-l2': {
    id: 'k6-l2',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Un regalo no tiene que ser caro.',
        texto: 'Algo hecho por ti también vale mucho.',
      },
      {
        tipo: 'elegir',
        etiqueta: '¿Qué harías?',
        pregunta: 'Es el cumpleaños de tu amigo. Tienes $3.000 en Compartir.',
        opciones: ['Hago una tarjeta y le doy un dulce', 'Pido dinero para algo caro', 'No le doy nada'],
        correcta: 0,
        bien: 'Con poco puedes dar algo lindo.',
        casi: [
          '',
          'No hace falta gastar mucho para regalar.',
          'Con $3.000 puedes dar algo pequeño.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'compartir', pregunta: '¿Qué podrías regalar con lo que tienes?' } },
    ],
  },

  'k6-l3': {
    id: 'k6-l3',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Ayudar también es compartir.',
        texto: 'Puedes ayudar con dinero, con tiempo o con cosas.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: '¿Cuál de estas cosas es ayudar?',
        opciones: ['Donar ropa que ya no usas', 'Botar tus juguetes', 'Esconder tus útiles'],
        correcta: 0,
        bien: 'Lo que ya no usas puede servirle a otro.',
        casi: [
          '',
          'Botarlos no ayuda. Mejor regálalos.',
          'Esconderlos no ayuda a nadie.',
        ],
      },
      { tipo: 'aplica', usalo: { frasco: 'compartir', pregunta: '¿Cómo ayudarás esta semana?' } },
    ],
  },
};
