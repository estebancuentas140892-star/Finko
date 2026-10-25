/**
 * lecciones/nino/ubicacion.js - la prueba de ubicación del niño (ADR 093 D9).
 *
 * Solo desde los 10 años: de 7 a 9 la ruta empieza en la unidad 1. Tres
 * preguntas, una por cada una de las unidades 1 a 3, en orden, con
 * "Todavía no lo sé" como respuesta válida. Mismo formato que la del
 * adulto (`lecciones/ubicacion.js`), en la voz del niño (D6).
 *
 * Revisión pedagógica: pendiente (ADR 093), registrada en APR.3f.
 */

export default {
  id: 'ubicacion-nino',
  sinRepetir: true,
  pasos: [
    {
      tipo: 'elegir',
      unidad: 'k1',
      noSe: true,
      etiqueta: 'Antes de empezar',
      pregunta: '¿Para qué sirve el dinero?',
      opciones: ['Para cambiarlo por cosas', 'Para jugar con él', 'No sirve para nada'],
      correcta: 0,
      bien: 'El dinero se cambia por cosas que necesitas o quieres.',
      casi: [
        '',
        'No es un juguete. Se cambia por cosas.',
        'Sí sirve: con él compras lo que necesitas.',
      ],
    },
    {
      tipo: 'elegir',
      unidad: 'k2',
      noSe: true,
      etiqueta: 'Antes de empezar',
      pregunta: '¿Cuál de estas cosas necesitas, y no solo quieres?',
      opciones: ['Un juguete nuevo', 'Útiles para el colegio', 'Un helado'],
      correcta: 1,
      bien: 'Los útiles los necesitas para aprender.',
      casi: [
        'Un juguete lo quieres, pero puedes esperar.',
        '',
        'Un helado es un gusto, no algo necesario.',
      ],
    },
    {
      tipo: 'elegir',
      unidad: 'k3',
      noSe: true,
      etiqueta: 'Antes de empezar',
      pregunta: 'Quieres juntar para un balón. ¿En qué frasco guardas?',
      opciones: ['Gastar', 'Ahorrar', 'Compartir'],
      correcta: 1,
      bien: 'Ahorrar es el frasco de tus metas.',
      casi: [
        'Gastar es para los gustos de hoy.',
        '',
        'Compartir es para regalar o ayudar.',
      ],
    },
  ],
};
