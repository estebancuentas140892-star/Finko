/**
 * lecciones/u6.js - unidad 6, "Deudas y gota a gota" (ADR 092 D8).
 *
 * Solo datos. Termina en Por pagar: el Aplícalo (`deudas`) suma tus deudas,
 * tus cuotas y lo que te cobran de intereses; el control usa `gota-a-gota`.
 *
 * Gota a gota (ADR 092, dudas): tono informativo, sin alarma, y sin enlazar
 * líneas de denuncia o ayuda mientras no estén verificadas con fecha.
 *
 * Revisión pedagógica: pendiente (ADR 092, dudas), registrada en APR.2c.
 */

export default {
  'u6-l1': {
    id: 'u6-l1',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Una deuda cuesta lo que pides más los intereses.',
        texto: 'Si pides $1.000.000 y devuelves $1.300.000, la deuda te costó $300.000. Mientras más tardas en pagar, más intereses pagas.',
        nota: 'Por eso conviene saber la tasa de cada deuda: es el precio del dinero prestado.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'Debes $1.000.000 al 2 % al mes. Si este mes pagas solo los intereses, ¿cuánto debes el mes siguiente?',
        opciones: ['$980.000', '$1.000.000', '$1.020.000', '$0'],
        correcta: 1,
        bien: 'Pagar solo los $20.000 de intereses deja la deuda igual: para bajarla hay que abonar a lo que debes.',
        casi: [
          'Pagar solo los intereses no baja la deuda: sigues debiendo $1.000.000.',
          '',
          '$1.020.000 sería si no pagaras nada. Al pagar los $20.000 de intereses, sigues en $1.000.000.',
          'La deuda solo baja cuando pagas más que los intereses.',
        ],
      },
      { tipo: 'aplica', calculo: 'deudas' },
    ],
  },

  'u6-l2': {
    id: 'u6-l2',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Con varias deudas, paga el mínimo en todas y el extra a una sola.',
        texto: 'Avalancha: el extra va a la de tasa más alta, y ahorras más intereses. Bola de nieve: va a la más pequeña, y cierras deudas más rápido.',
        nota: 'En Por pagar, Finko te propone el orden con tus deudas.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'Tienes una tarjeta al 2,5 % al mes y un préstamo al 1 % al mes. Con la avalancha, ¿a cuál va el dinero extra?',
        opciones: ['A la tarjeta', 'Al préstamo', 'Mitad y mitad', 'A ninguna'],
        correcta: 0,
        bien: 'La tarjeta cobra más: cada peso extra ahí te ahorra más intereses.',
        casi: [
          '',
          'El préstamo cobra menos: con la avalancha el extra va a la de tasa más alta, la tarjeta.',
          'Repartirlo baja menos intereses que llevarlo todo a la más cara.',
          'Sin abonar extra, las dos tardan más y cobran más.',
        ],
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'Debes $300.000 a un amigo y $4.000.000 al banco. Con la bola de nieve, ¿a cuál va el extra?',
        opciones: ['A la de tu amigo', 'A la del banco'],
        correcta: 0,
        bien: 'Cerrar primero la de $300.000 libera esa cuota para la siguiente.',
        casi: [
          '',
          'La bola de nieve empieza por la más pequeña: cerrarla rápido libera esa cuota y da impulso.',
        ],
      },
      { tipo: 'aplica', calculo: 'deudas' },
    ],
  },

  'u6-l3': {
    id: 'u6-l3',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'El gota a gota es un préstamo informal que se cobra a diario.',
        texto: 'Prestan rápido y sin papeles, pero cobran intereses muy por encima de lo que la ley permite, y cobran con presión.',
        nota: 'Las entidades vigiladas por la Superintendencia Financiera no pueden cobrar más que la tasa de usura. El gota a gota no tiene ese límite.',
      },
      {
        tipo: 'control',
        etiqueta: 'Mueve el control',
        pregunta: 'Un gota a gota cobra el 20 % al mes. ¿Cuánto terminas pagando?',
        calculo: 'gota-a-gota',
        controles: [
          { id: 'prestamo', etiqueta: 'Lo que te prestan', opciones: [200_000, 500_000, 1_000_000], inicial: 500_000 },
        ],
      },
      {
        tipo: 'elegir',
        etiqueta: '¿Qué harías?',
        pregunta: 'Necesitas $500.000 urgentes y no tienes fondo de emergencia.',
        opciones: [
          'Pedir un gota a gota',
          'Pedir un crédito formal en tu banco o en una cooperativa',
          'Sacar un avance de la tarjeta sin mirar la tasa',
          'Firmar una letra en blanco',
        ],
        correcta: 1,
        bien: 'Un crédito formal tiene la tasa limitada por ley y las condiciones por escrito. Y apenas salgas del apuro, empieza tu fondo.',
        casi: [
          'Es rápido, pero cobra intereses enormes y presiona para cobrar.',
          '',
          'Un avance cobra intereses desde el primer día: revisa la tasa antes de usarlo.',
          'Firmar en blanco deja que otro ponga las condiciones después.',
        ],
      },
      { tipo: 'aplica', calculo: 'deudas' },
    ],
  },
};
