/**
 * lecciones/u3.js - unidad 3, "Gastos hormiga y límites" (ADR 092 D8).
 *
 * Solo datos: los textos de cada paso. La aritmética de los pasos "control"
 * vive en `CALCULOS` de logic.js y el Aplícalo en `aplicaHormiga()`. Se
 * carga con `import()` al abrir una lección (D11).
 *
 * `{tope}` se reemplaza en la vista por el tope hormiga vigente, formateado.
 * Revisión pedagógica: pendiente de registrar en la tarjeta APR.1b.
 */

export default {
  'u3-l2': {
    id: 'u3-l2',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Un gasto hormiga es pequeño, se repite y casi no se nota.',
        texto: 'Un tinto, un domicilio, una recarga. Uno solo no pesa. Juntos, al final del mes, sí.',
        nota: 'En Finko, un gasto pequeño es uno de {tope} o menos.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: '¿Cuál de estos es un gasto hormiga?',
        opciones: [
          'El arriendo de cada mes',
          'Un tinto de $3.000 casi todos los días',
          'Las vacaciones de fin de año',
          'Una nevera nueva',
        ],
        correcta: 1,
        bien: 'Un tinto solo no pesa, pero se repite sin que lo pienses: 20 tintos al mes son $60.000.',
        casi: [
          'El arriendo es grande y lo planeas cada mes. El gasto hormiga es pequeño y se repite sin que lo pienses: 20 tintos al mes son $60.000.',
          '',
          'Las vacaciones cuestan mucho, pero pasan una vez al año y las planeas. El gasto hormiga es pequeño y se repite sin que lo pienses: 20 tintos al mes son $60.000.',
          'Una nevera cuesta mucho y la compras una vez en años. El gasto hormiga es pequeño y se repite sin que lo pienses: 20 tintos al mes son $60.000.',
        ],
      },
      {
        tipo: 'clasificar',
        etiqueta: 'Clasifica',
        pregunta: '¿Es un gasto hormiga?',
        ayuda: 'Desliza a la derecha si lo es y a la izquierda si no. También puedes usar los botones.',
        no: 'No es',
        si: 'Es hormiga',
        tarjetas: [
          { titulo: 'Arriendo', monto: 1_050_000, detalle: 'Una vez al mes, lo tienes planeado', icono: 'c-hogar', es: false,
            casi: 'El arriendo se repite, pero es grande y lo planeas. El gasto hormiga es pequeño y pasa sin que lo pienses.' },
          { titulo: 'Recarga del celular', monto: 10_000, detalle: 'Cada semana, sin pensarlo', icono: 'c-telefono', es: true,
            casi: 'Es pequeña y se repite cada semana: eso la vuelve hormiga. Son unos $40.000 al mes.' },
          { titulo: 'Pandebono y café', monto: 6_500, detalle: 'Casi todas las mañanas, camino al trabajo', icono: 'c-cafe', es: true,
            casi: 'Uno solo no pesa, pero casi todas las mañanas suman más de $130.000 al mes. Es hormiga.' },
          { titulo: 'Mercado de la quincena', monto: 380_000, detalle: 'Lo planeas cada 15 días', icono: 'c-mercado', es: false,
            casi: 'Se repite, pero es grande y lo planeas. No es hormiga.' },
          { titulo: 'Domicilio de almuerzo', monto: 18_000, detalle: 'Tres veces por semana', icono: 'c-restaurantes', es: true,
            casi: 'Es pequeño y se repite tres veces por semana: son más de $200.000 al mes. Es hormiga.' },
          { titulo: 'Matrícula del curso de inglés', monto: 450_000, detalle: 'Una vez por semestre', icono: 'c-birrete', es: false,
            casi: 'Es grande y pasa dos veces al año. No es hormiga.' },
        ],
      },
      {
        tipo: 'control',
        etiqueta: 'Mueve el control',
        pregunta: 'Un tinto cada mañana. ¿Cuánto suma en un año?',
        calculo: 'gasto-repetido-anual',
        controles: [
          { id: 'precio', etiqueta: 'Precio del tinto', opciones: [3_000, 4_500, 6_500], inicial: 4_500 },
          { id: 'dias', etiqueta: 'Días a la semana', min: 1, max: 7, inicial: 5 },
        ],
      },
      {
        tipo: 'aplica',
        calculo: 'hormiga-mes',
      },
    ],
  },
};
