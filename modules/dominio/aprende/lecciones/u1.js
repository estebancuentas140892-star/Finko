/**
 * lecciones/u1.js - unidad 1, "Tu dinero hoy" (ADR 092 D8).
 *
 * Solo datos. Termina en Mis cuentas: el Aplícalo (`dinero-hoy`) suma tus
 * cuentas y descuenta lo comprometido del mes; el control usa `libre-por-dia`.
 *
 * Revisión pedagógica: pendiente (ADR 092, dudas), registrada en APR.2c.
 */

export default {
  'u1-l1': {
    id: 'u1-l1',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'No todo el dinero de tu cuenta está libre.',
        texto: 'Si hoy tienes $2.000.000, pero el arriendo y los servicios del mes suman $1.200.000, lo que de verdad puedes usar son $800.000.',
        nota: 'Finko llama a eso tu dinero disponible: lo que queda después de lo que ya debes pagar.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'Tienes $1.500.000 en la cuenta y este mes debes pagar $900.000 de arriendo y servicios. ¿Cuánto tienes libre?',
        opciones: ['$1.500.000', '$900.000', '$600.000', '$2.400.000'],
        correcta: 2,
        bien: '$1.500.000 menos los $900.000 que ya tienen dueño: $600.000 libres.',
        casi: [
          '$1.500.000 es todo lo que hay, pero $900.000 ya tienen dueño: te quedan $600.000.',
          '$900.000 es lo que debes pagar, no lo que te queda. Te quedan $600.000.',
          '',
          'Eso sería sumar lo que debes, y se resta: te quedan $600.000.',
        ],
      },
      { tipo: 'aplica', calculo: 'dinero-hoy' },
    ],
  },

  'u1-l2': {
    id: 'u1-l2',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Tu dinero vive en varios lugares.',
        texto: 'Una cuenta de ahorros, una billetera digital en el celular, el efectivo de la billetera. Si no los sumas todos, no sabes cuánto tienes.',
        nota: 'En Finko cada lugar es una cuenta: así el total que ves es el real.',
      },
      {
        tipo: 'clasificar',
        etiqueta: 'Clasifica',
        pregunta: '¿Lo puedes usar hoy?',
        ayuda: 'Desliza a la derecha si lo puedes usar hoy y a la izquierda si no. También puedes usar los botones.',
        no: 'Hoy no',
        si: 'Lo puedo usar',
        tarjetas: [
          { titulo: 'Efectivo en tu billetera', monto: 85_000, detalle: 'En tu bolsillo', icono: 'c-billete', es: true,
            casi: 'El efectivo es dinero disponible: también cuenta en tu total.' },
          { titulo: 'Un CDT a 6 meses', monto: 2_000_000, detalle: 'Vence en marzo', icono: 'i-inversion', es: false,
            casi: 'Un CDT tiene plazo: sacarlo antes cuesta o no se puede. No es dinero de hoy.' },
          { titulo: 'Tu billetera digital', monto: 320_000, detalle: 'Lo mueves desde el celular', icono: 'c-telefono', es: true,
            casi: 'Lo mueves cuando quieras: es dinero disponible.' },
          { titulo: 'Lo que le prestaste a un amigo', monto: 200_000, detalle: 'Te dijo que te paga en diciembre', icono: 'c-amigos', es: false,
            casi: 'Es tuyo, pero hoy lo tiene otra persona: vive en Me deben, no en tus cuentas.' },
          { titulo: 'Tu cuenta de ahorros', monto: 1_400_000, detalle: 'Con tarjeta débito', icono: 'i-cuentas', es: true,
            casi: 'La sacas cuando quieras con la tarjeta: es dinero disponible.' },
        ],
      },
      { tipo: 'aplica', calculo: 'dinero-hoy' },
    ],
  },

  'u1-l3': {
    id: 'u1-l3',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Cada mes tiene dos columnas: lo que entra y lo que sale.',
        texto: 'Si sale más de lo que entra, la diferencia se paga con ahorro o con deuda. Mirar las dos columnas a tiempo evita esa sorpresa.',
        nota: 'En Finko, lo que entra son tus ingresos; lo que sale, tus gastos, pagos y cuotas.',
      },
      {
        tipo: 'control',
        etiqueta: 'Mueve el control',
        pregunta: '¿Cuánto te queda para el día a día?',
        calculo: 'libre-por-dia',
        controles: [
          { id: 'ingreso', etiqueta: 'Lo que recibes al mes', opciones: [1_500_000, 2_000_000, 3_000_000], inicial: 2_000_000 },
          { id: 'fijos', etiqueta: 'Tus pagos fijos del mes', opciones: [900_000, 1_400_000, 1_800_000], inicial: 1_400_000 },
        ],
      },
      {
        tipo: 'elegir',
        etiqueta: '¿Qué harías?',
        pregunta: 'A mitad de mes ves que ya gastaste casi todo lo que te quedaba libre.',
        opciones: [
          'Seguir igual y ver qué pasa',
          'Revisar en qué se fue y frenar lo que no es necesario',
          'Pagar todo con tarjeta hasta fin de mes',
          'Dejar de anotar los gastos',
        ],
        correcta: 1,
        bien: 'Revisar a tiempo te deja medio mes para ajustar.',
        casi: [
          'Seguir igual lleva a terminar el mes con deuda.',
          '',
          'La tarjeta no agranda tu dinero: lo adelanta, y lo cobra con intereses.',
          'Sin anotar no sabes qué frenar: el gasto sigue, solo que no lo ves.',
        ],
      },
      { tipo: 'aplica', calculo: 'dinero-hoy' },
    ],
  },
};
