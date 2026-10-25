/**
 * lecciones/u4.js - unidad 4, "Fondo de emergencia" (ADR 092 D8).
 *
 * Solo datos. Termina en Fondo: el Aplícalo (`fondo-meses`) lee tus gastos
 * fijos y tu fondo, y el control usa `fondo-objetivo` y `aporte-meses`.
 * El Fondo ofrece la lección 2 en su pantalla (APR.2a, D6).
 *
 * Revisión pedagógica: pendiente (ADR 092, dudas), registrada en APR.2c.
 */

export default {
  'u4-l1': {
    id: 'u4-l1',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Un fondo de emergencia es dinero para lo que no puedes prever.',
        texto: 'Perder el trabajo, una cita médica, un arreglo urgente en la casa. Sin fondo, esas cosas se pagan con tarjeta o con préstamos caros.',
        nota: 'No es ahorro para gustos ni para metas: queda quieto hasta que lo necesitas.',
      },
      {
        tipo: 'clasificar',
        etiqueta: 'Clasifica',
        pregunta: '¿Es una emergencia?',
        ayuda: 'Desliza a la derecha si lo es y a la izquierda si no. También puedes usar los botones.',
        no: 'No es',
        si: 'Es emergencia',
        tarjetas: [
          { titulo: 'Te quedaste sin trabajo', detalle: 'No sabes cuándo vuelve a entrar dinero', icono: 'c-maletin', es: true,
            casi: 'Perder el ingreso es la emergencia más común, y la razón principal de tener un fondo.' },
          { titulo: 'Las vacaciones de diciembre', detalle: 'Sabes desde enero que llegan', icono: 'c-avion', es: false,
            casi: 'Las vacaciones se planean: son una meta, no una emergencia.' },
          { titulo: 'Una cita médica que no esperabas', detalle: 'Hay que pagarla esta semana', icono: 'c-salud', es: true,
            casi: 'Es urgente y no la esperabas: para esto es el fondo.' },
          { titulo: 'El celular nuevo que salió', detalle: 'El tuyo todavía funciona', icono: 'c-telefono', es: false,
            casi: 'Si el tuyo funciona, cambiarlo es un gusto. Se ahorra para él con una meta.' },
          { titulo: 'Se dañó la nevera', detalle: 'Sin ella se pierde el mercado', icono: 'c-hogar', es: true,
            casi: 'Es necesaria y no podía esperar: es una emergencia.' },
          { titulo: 'La fiesta de cumpleaños', detalle: 'Es en tres meses', icono: 'c-torta', es: false,
            casi: 'Una fiesta se planea con tiempo: no es emergencia.' },
        ],
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'Llega una emergencia de $800.000 y no tienes fondo. ¿Qué suele pasar?',
        opciones: [
          'Se paga con tarjeta o con un préstamo, y sale más caro',
          'Se resuelve sola',
          'El banco la cubre gratis',
          'Nada cambia en tus finanzas',
        ],
        correcta: 0,
        bien: 'Sin fondo, la emergencia se vuelve deuda: al 2 % al mes, esos $800.000 cuestan $16.000 más por cada mes que tardes en pagarlos.',
        casi: [
          '',
          'Una emergencia no espera: si no tienes el dinero, se paga con deuda, y la deuda cobra intereses.',
          'Ningún banco presta gratis: una tarjeta o un crédito cobran intereses cada mes.',
          'Pagarla con deuda te deja cuotas e intereses por meses: sí cambia.',
        ],
      },
      { tipo: 'aplica', calculo: 'fondo-meses' },
    ],
  },

  'u4-l2': {
    id: 'u4-l2',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Lo usual es tener entre 3 y 6 meses de tus gastos fijos.',
        texto: 'Se cuenta en meses porque la pregunta es cuánto tiempo puedes vivir sin ingresos mientras lo resuelves.',
        nota: 'Gastos fijos: arriendo, servicios, mercado básico, transporte y cuotas. Lo que pagas aunque no quieras.',
      },
      {
        tipo: 'control',
        etiqueta: 'Mueve el control',
        pregunta: '¿Cuánto necesita tu fondo?',
        calculo: 'fondo-objetivo',
        controles: [
          { id: 'gastos', etiqueta: 'Tus gastos fijos del mes', opciones: [1_000_000, 1_750_000, 2_500_000], inicial: 1_750_000 },
          { id: 'meses', etiqueta: 'Meses de respaldo', min: 1, max: 12, inicial: 3 },
        ],
      },
      {
        tipo: 'elegir',
        etiqueta: '¿Qué harías?',
        pregunta: 'Trabajas por tu cuenta y hay meses en que casi no entra dinero. ¿Cuántos meses de respaldo te convienen?',
        opciones: ['1 mes', '3 meses', '6 meses o más'],
        correcta: 2,
        bien: 'Si tu ingreso cambia mucho, 6 meses o más te dan tiempo para pasar los meses flojos.',
        casi: [
          'Un mes se acaba rápido si el siguiente también es flojo.',
          '3 meses sirven con un sueldo fijo. Si tu ingreso cambia mucho, conviene más respaldo.',
          '',
        ],
      },
      { tipo: 'aplica', calculo: 'fondo-meses' },
    ],
  },

  'u4-l3': {
    id: 'u4-l3',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Se llena poco a poco, con un aporte fijo.',
        texto: 'Un aporte pequeño que cumples cada mes vale más que uno grande que abandonas. Lo mejor es separarlo el día que recibes tu ingreso.',
        nota: 'Guárdalo aparte: si está con el dinero del día a día, se gasta sin que lo notes.',
      },
      {
        tipo: 'control',
        etiqueta: 'Mueve el control',
        pregunta: '¿En cuánto tiempo lo llenas?',
        calculo: 'aporte-meses',
        controles: [
          { id: 'meta', etiqueta: 'Lo que necesita tu fondo', opciones: [3_000_000, 5_250_000, 10_500_000], inicial: 5_250_000 },
          { id: 'aporte', etiqueta: 'Tu aporte de cada mes', opciones: [150_000, 250_000, 500_000], inicial: 250_000 },
        ],
      },
      {
        tipo: 'ordenar',
        etiqueta: 'Ordena los pasos',
        pregunta: 'Ordena cómo llenar tu fondo',
        items: [
          'Calcula tus gastos fijos del mes',
          'Elige cuántos meses de respaldo quieres',
          'Fija un aporte que sí puedas cumplir',
          'Sepáralo el día que recibes tu ingreso',
        ],
        bien: 'Primero el tamaño, después el aporte, y el aporte apenas llega el dinero: así no compite con los gastos del mes.',
        casi: 'Sin saber tus gastos fijos no sabes cuánto necesitas. Empieza por ahí, define los meses y luego el aporte.',
      },
      { tipo: 'aplica', calculo: 'fondo-meses' },
    ],
  },

  'u4-l4': {
    id: 'u4-l4',
    pasos: [
      {
        tipo: 'elegir',
        etiqueta: '¿Qué harías?',
        pregunta: 'Se dañó la moto con la que trabajas y el arreglo cuesta $600.000.',
        opciones: [
          'Pagarlo con el fondo',
          'Pagarlo con la tarjeta a 24 cuotas',
          'Pedir un préstamo gota a gota',
          'No arreglarla',
        ],
        correcta: 0,
        bien: 'Para esto es el fondo: algo urgente que no esperabas. Usarlo no es fallar.',
        casi: [
          '',
          'Con la tarjeta pagarías intereses durante dos años por algo que tu fondo cubre hoy.',
          'Un gota a gota cobra intereses altísimos y presiona para cobrar. No es la salida.',
          'Sin la moto no trabajas: es justo el tipo de urgencia para la que guardaste.',
        ],
      },
      {
        tipo: 'concepto',
        titulo: 'Después de usarlo, se repone.',
        texto: 'Vuelve a tu aporte de siempre, o súbelo un poco, hasta que el fondo llegue de nuevo a tu meta.',
        nota: 'Mientras lo repones, deja en pausa las metas de gustos: el fondo va primero.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'Usaste $600.000 del fondo y tu aporte es de $150.000 al mes. ¿En cuánto tiempo lo repones?',
        opciones: ['2 meses', '4 meses', '6 meses', '1 año'],
        correcta: 1,
        bien: '$150.000 cada mes durante 4 meses son $600.000.',
        casi: [
          'En 2 meses repondrías $300.000: te faltaría la mitad. Con $150.000 al mes son 4 meses.',
          '',
          'En 6 meses repondrías $900.000: más de lo que usaste. Con $150.000 al mes son 4 meses.',
          'En un año repondrías $1.800.000: con $150.000 al mes, 4 meses bastan.',
        ],
      },
      { tipo: 'aplica', calculo: 'fondo-meses' },
    ],
  },
};
