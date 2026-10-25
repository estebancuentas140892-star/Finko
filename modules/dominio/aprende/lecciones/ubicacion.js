/**
 * lecciones/ubicacion.js - la prueba de ubicación (ADR 092 D9, APR.2b).
 *
 * Solo datos. Una pregunta por cada una de las unidades 1 a 4, en orden.
 * Cada paso dice de qué unidad es (`unidad`): si la respondes bien, esa
 * unidad queda como "Ya lo sabes". "Todavía no lo sé" (`noSe`) es una
 * respuesta válida, nunca un error. Ninguna pregunta vuelve al final
 * (`sinRepetir`): esto ubica, no enseña.
 *
 * Revisión pedagógica: pendiente (ADR 092, dudas), registrada en APR.2c.
 */

export default {
  id: 'ubicacion',
  sinRepetir: true,
  pasos: [
    {
      tipo: 'elegir',
      unidad: 'u1',
      noSe: true,
      etiqueta: 'Prueba de ubicación',
      pregunta: 'Tienes $1.800.000 en la cuenta y este mes debes pagar $1.100.000 de arriendo y servicios. ¿Cuánto tienes libre de verdad?',
      opciones: ['$1.800.000', '$700.000', '$1.100.000', '$2.900.000'],
      correcta: 1,
      bien: 'Lo que ya tiene dueño no está libre: $1.800.000 menos $1.100.000 son $700.000.',
      casi: [
        '$1.800.000 es todo lo que hay, pero $1.100.000 ya tienen dueño: te quedan $700.000.',
        '',
        '$1.100.000 es lo que debes pagar, no lo que te queda: te quedan $700.000.',
        'Lo que debes se resta, no se suma: te quedan $700.000.',
      ],
    },
    {
      tipo: 'elegir',
      unidad: 'u2',
      noSe: true,
      etiqueta: 'Prueba de ubicación',
      pregunta: 'Ganas $2.000.000 al mes. Con la regla 50/30/20, ¿cuánto separas para ahorrar?',
      opciones: ['$200.000', '$400.000', '$600.000', '$1.000.000'],
      correcta: 1,
      bien: 'La regla reparte cada $100 que recibes: $50 para lo que necesitas, $30 para tus gustos y $20 para ahorrar o pagar deudas. De $2.000.000, son $400.000.',
      casi: [
        '$200.000 sería el 10 %. Con la regla 50/30/20, el ahorro es el 20 %: $400.000.',
        '',
        '$600.000 es el 30 %, lo de tus gustos. El ahorro es el 20 %: $400.000.',
        '$1.000.000 es el 50 %, lo que necesitas. El ahorro es el 20 %: $400.000.',
      ],
    },
    {
      tipo: 'elegir',
      unidad: 'u3',
      noSe: true,
      etiqueta: 'Prueba de ubicación',
      pregunta: 'Compras un café de $5.000 cinco días a la semana. ¿Cuánto suma en un año?',
      opciones: ['$25.000', '$130.000', '$1.300.000', '$5.000.000'],
      correcta: 2,
      bien: '$5.000 por 5 días por 52 semanas: $1.300.000 al año. Lo pequeño que se repite suma.',
      casi: [
        '$25.000 es una sola semana. En 52 semanas son $1.300.000.',
        '$130.000 es apenas un poco más de un mes. En el año son $1.300.000.',
        '',
        'Es mucho, pero no tanto: $5.000 por 5 días por 52 semanas son $1.300.000.',
      ],
    },
    {
      tipo: 'elegir',
      unidad: 'u4',
      noSe: true,
      etiqueta: 'Prueba de ubicación',
      pregunta: 'Tus gastos fijos son $1.500.000 al mes. ¿Cuánto necesita tu fondo de emergencia para cubrirte 3 meses?',
      opciones: ['$1.500.000', '$3.000.000', '$4.500.000', '$9.000.000'],
      correcta: 2,
      bien: 'Tres meses de gastos fijos: $1.500.000 por 3 son $4.500.000.',
      casi: [
        '$1.500.000 te cubre un solo mes. Para 3 meses son $4.500.000.',
        '$3.000.000 cubre 2 meses. Para 3 son $4.500.000.',
        '',
        '$9.000.000 cubre 6 meses, la meta más alta. Para 3 son $4.500.000.',
      ],
    },
  ],
};
