/**
 * lecciones/u5.js - unidad 5, "Metas y reservas" (ADR 092 D8).
 *
 * Solo datos. Termina en Metas: el Aplícalo (`metas`) suma lo que llevas en
 * tus metas y señala la que no tiene fecha; el control usa `meta-mensual`.
 *
 * Revisión pedagógica: pendiente (ADR 092, dudas), registrada en APR.2c.
 */

export default {
  'u5-l1': {
    id: 'u5-l1',
    aprendes: [
      'Qué hace clara una meta: nombre, precio y fecha.',
      'Cómo sale lo que guardas cada mes.',
      'Por qué "ahorrar más" no es una meta.',
    ],
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Una meta clara tiene nombre, precio y fecha.',
        texto: 'Ahorrar más no te dice cuánto ni hasta cuándo. Un viaje a Cartagena de $1.800.000 para diciembre sí: con eso sabes cuánto guardar cada mes.',
        nota: 'En Finko, una meta con fecha calcula sola tu aporte de cada mes.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: '¿Cuál meta está mejor planteada?',
        opciones: [
          'Ahorrar más este año',
          'Comprar algo bonito',
          'Un portátil de $2.400.000 para junio',
          'Tener más dinero',
        ],
        correcta: 2,
        bien: 'Con precio y fecha sabes el aporte: $2.400.000 en 8 meses son $300.000 al mes.',
        casi: [
          'No dice cuánto ni hasta cuándo: no hay forma de saber si vas bien.',
          'Sin precio ni fecha, no sabes cuánto guardar.',
          '',
          'Sin un monto ni una fecha, no sabes cuándo llegaste.',
        ],
      },
      { tipo: 'aplica', calculo: 'metas' },
    ],
  },

  'u5-l2': {
    id: 'u5-l2',
    aprendes: [
      'Cuánto guardar cada mes para llegar a tu meta.',
      'Qué hacer si no te alcanza para el aporte.',
      'Por qué mover la fecha mantiene la meta viva.',
    ],
    pasos: [
      {
        tipo: 'control',
        etiqueta: 'Mueve el control',
        pregunta: '¿Cuánto guardas cada mes para llegar?',
        calculo: 'meta-mensual',
        controles: [
          { id: 'precio', etiqueta: 'Lo que cuesta', opciones: [1_200_000, 1_800_000, 2_400_000], inicial: 1_800_000 },
          { id: 'meses', etiqueta: 'Meses que faltan', min: 1, max: 24, inicial: 6 },
        ],
      },
      {
        tipo: 'elegir',
        etiqueta: '¿Qué harías?',
        pregunta: 'Tu meta pide $300.000 al mes y solo puedes guardar $200.000.',
        opciones: [
          'Abandonar la meta',
          'Correr la fecha unos meses',
          'Guardar $300.000 aunque no alcance para el mercado',
          'Pedir prestado para completarla',
        ],
        correcta: 1,
        bien: 'Mover la fecha mantiene la meta viva: $1.800.000 a $200.000 al mes son 9 meses en lugar de 6.',
        casi: [
          'Con $200.000 al mes igual llegas, solo que un poco después.',
          '',
          'Dejar de cubrir lo necesario para una meta termina en deuda.',
          'Pedir prestado para una meta te deja pagando intereses por algo que podía esperar.',
        ],
      },
      { tipo: 'aplica', calculo: 'metas' },
    ],
  },

  'u5-l3': {
    id: 'u5-l3',
    aprendes: [
      'Qué es una reserva y en qué se diferencia de una meta.',
      'Qué gastos que sabes que llegan conviene reservar.',
      'Cómo dividirlos por meses para que no te golpeen.',
    ],
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Una reserva guarda dinero para un gasto que sabes que llega.',
        texto: 'El SOAT, el impuesto del carro, la matrícula del colegio, los regalos de diciembre. No son sorpresa: si los divides por meses, no te golpean de una.',
        nota: 'En Finko se llaman Reservas: cada una con su monto y su fecha.',
      },
      {
        tipo: 'clasificar',
        etiqueta: 'Clasifica',
        pregunta: '¿Es para una reserva o para una meta?',
        ayuda: 'Desliza a la derecha si es una reserva y a la izquierda si es una meta. También puedes usar los botones.',
        no: 'Meta',
        si: 'Reserva',
        tarjetas: [
          { titulo: 'SOAT de la moto', detalle: 'Se paga cada año en abril', icono: 'c-escudo', es: true,
            casi: 'Llega cada año en la misma fecha: es una reserva.' },
          { titulo: 'Un viaje que sueñas', detalle: 'Todavía sin fecha fija', icono: 'c-avion', es: false,
            casi: 'Es algo que quieres lograr: es una meta.' },
          { titulo: 'Matrícula del colegio', detalle: 'Cada enero', icono: 'c-birrete', es: true,
            casi: 'Se repite cada año: es una reserva.' },
          { titulo: 'Cambiar de celular', detalle: 'Cuando juntes lo necesario', icono: 'c-telefono', es: false,
            casi: 'Es algo que decides comprar: es una meta.' },
          { titulo: 'Impuesto predial', detalle: 'Una vez al año', icono: 'c-edificio', es: true,
            casi: 'Se paga cada año: es una reserva.' },
        ],
      },
      { tipo: 'aplica', calculo: 'metas' },
    ],
  },
};
