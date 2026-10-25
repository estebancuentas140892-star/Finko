/**
 * lecciones/u8.js - unidad 8, "Invertir: CDT y regla del 72" (ADR 092 D8).
 *
 * Solo datos. Termina en Inversión: el Aplícalo (`inversion-72`) suma lo que
 * tienes invertido y dice en cuánto se duplicaría cada inversión; los
 * controles usan `interes-compuesto` y `regla-72`.
 *
 * Revisión pedagógica: pendiente (ADR 092, dudas), registrada en APR.2c.
 */

export default {
  'u8-l1': {
    id: 'u8-l1',
    aprendes: [
      'La diferencia entre ahorrar e invertir.',
      'Qué dinero conviene tener a la mano.',
      'Cuándo tiene sentido invertir lo que no vas a usar.',
    ],
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Ahorrar es guardar; invertir es poner el dinero a producir.',
        texto: 'El fondo de emergencia se ahorra: tiene que estar a la mano. Lo que no vas a necesitar en un buen tiempo se puede invertir para que crezca más que la inflación.',
        nota: 'Primero el fondo de emergencia; después, invertir.',
      },
      {
        tipo: 'elegir',
        etiqueta: '¿Qué harías?',
        pregunta: 'Ya tienes tu fondo completo y te sobran $2.000.000 que no vas a usar en un año.',
        opciones: [
          'Dejarlos quietos en la cuenta de ahorros',
          'Invertirlos en un CDT a un año',
          'Gastarlos ya',
          'Prestarlos sin papeles',
        ],
        correcta: 1,
        bien: 'Si no los vas a necesitar en un año, un CDT a ese plazo los pone a crecer con una tasa fija.',
        casi: [
          'En la cuenta casi no crecen, y la inflación les quita valor.',
          '',
          'Si no los necesitas, gastarlos por gastarlos no te deja nada.',
          'Prestar sin papeles arriesga perderlos.',
        ],
      },
      { tipo: 'aplica', calculo: 'inversion-72' },
    ],
  },

  'u8-l2': {
    id: 'u8-l2',
    aprendes: [
      'Qué es un CDT y cómo funciona.',
      'Para qué dinero sirve.',
      'Por qué no sirve para lo que puedes necesitar pronto.',
    ],
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Un CDT es dinero que le prestas al banco por un plazo fijo.',
        texto: 'Tú eliges el plazo, el banco te paga una tasa fija y al final te devuelve todo con los intereses. Sacarlo antes del plazo por lo general no se puede.',
        nota: 'Los CDT de entidades vigiladas tienen el seguro de depósitos de Fogafín, con un tope por persona.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: '¿Para qué dinero sirve un CDT?',
        opciones: [
          'Para el que puedes necesitar mañana',
          'Para el que no vas a usar mientras dura el plazo',
          'Para el arriendo del mes',
          'Para el fondo de emergencia',
        ],
        correcta: 1,
        bien: 'Un CDT encaja con dinero que no vas a tocar mientras dura el plazo.',
        casi: [
          'Si lo necesitas mañana, el plazo te lo impide.',
          '',
          'Lo del mes tiene que estar disponible.',
          'El fondo tiene que estar a la mano: un CDT lo encierra por el plazo.',
        ],
      },
      { tipo: 'aplica', calculo: 'inversion-72' },
    ],
  },

  'u8-l3': {
    id: 'u8-l3',
    aprendes: [
      'Qué es el interés compuesto.',
      'Cómo crece tu dinero si dejas invertido lo que ganas.',
      'Por qué el tiempo hace la diferencia.',
    ],
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Con el interés compuesto, ganas intereses sobre tus intereses.',
        texto: 'Si dejas invertido lo que ganas, el año siguiente los intereses se calculan sobre una base más grande. Con tiempo, la diferencia es enorme.',
        nota: 'El tiempo pesa más que el monto: empezar temprano rinde.',
      },
      {
        tipo: 'control',
        etiqueta: 'Mueve el control',
        pregunta: 'Al 10 % efectivo anual, ¿cuánto tendrías?',
        calculo: 'interes-compuesto',
        controles: [
          { id: 'inicial', etiqueta: 'Lo que inviertes hoy', opciones: [500_000, 1_000_000, 5_000_000], inicial: 1_000_000 },
          { id: 'anios', etiqueta: 'Años', min: 1, max: 30, inicial: 10 },
        ],
      },
      { tipo: 'aplica', calculo: 'inversion-72' },
    ],
  },

  'u8-l4': {
    id: 'u8-l4',
    aprendes: [
      'La regla del 72: en cuántos años se duplica tu dinero.',
      'Cómo cambia ese tiempo con la tasa.',
      'Por qué tu inversión tiene que ganarle a la inflación.',
    ],
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'La regla del 72 te dice en cuántos años se duplica tu dinero.',
        texto: 'Divide 72 entre la tasa anual: al 8 % se duplica en unos 9 años; al 12 %, en unos 6.',
        nota: 'Es una cuenta aproximada, buena para comparar de un vistazo.',
      },
      {
        tipo: 'control',
        etiqueta: 'Mueve el control',
        pregunta: 'Mueve la tasa y mira en cuánto se duplica.',
        calculo: 'regla-72',
        controles: [
          { id: 'tasa', etiqueta: 'Tasa efectiva anual', min: 2, max: 24, inicial: 8, sufijo: ' %' },
        ],
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'Si la inflación es del 5 % y tu inversión rinde el 5 %, ¿tu dinero crece de verdad?',
        opciones: ['Sí, se duplica', 'No: apenas conserva su valor', 'Se triplica', 'Lo pierde todo'],
        correcta: 1,
        bien: 'Para crecer de verdad, la inversión tiene que rendir más que la inflación.',
        casi: [
          'Rendir lo mismo que la inflación solo conserva lo que puedes comprar.',
          '',
          'Con un 5 % no se triplica.',
          'No lo pierde: conserva su valor, pero no crece.',
        ],
      },
      { tipo: 'aplica', calculo: 'inversion-72' },
    ],
  },
};
