/**
 * lecciones/u3.js - unidad 3, "Gastos hormiga y límites" (ADR 092 D8).
 *
 * Solo datos: los textos de cada paso. La aritmética de los pasos "control"
 * vive en `CALCULOS` de logic.js y el Aplícalo en `aplicaHormiga()`. Se
 * carga con `import()` al abrir una lección (D11).
 *
 * `{tope}` se reemplaza en la vista por el tope hormiga vigente, formateado.
 * `cta` del Aplícalo: 'gastos' lleva a mirar las compras; 'limite' propone
 * el límite de gastos pequeños con su monto en el botón (R50).
 *
 * Revisión pedagógica: pendiente (ADR 092, dudas). Ningún texto se da por
 * revisado hasta que quede registrado en la tarjeta APR.2c.
 */

export default {
  'u3-l1': {
    id: 'u3-l1',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Lo pequeño también suma.',
        texto: 'Un gasto de $5.000 no se siente. Cinco a la semana son unos $100.000 al mes, más que muchos recibos de servicios.',
        nota: 'En esta unidad vas a ver tus gastos pequeños y a ponerles un límite que sí puedas cumplir.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'Un domicilio de $12.000, dos veces por semana. ¿Cuánto es al mes, más o menos?',
        opciones: ['$24.000', '$48.000', '$96.000', '$144.000'],
        correcta: 2,
        bien: 'Dos domicilios por semana parecen poco, pero el mes suma $96.000: casi lo mismo que un plan de celular.',
        casi: [
          '$24.000 es una sola semana. El mes tiene unas cuatro: $12.000 por 2 por 4 son $96.000.',
          '$48.000 son dos semanas. El mes tiene unas cuatro: $12.000 por 2 por 4 son $96.000.',
          '',
          '$144.000 serían tres domicilios por semana. Con dos, el mes suma $12.000 por 2 por 4: $96.000.',
        ],
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: '¿Qué te cuesta más en un año?',
        opciones: [
          'Unos zapatos de $250.000 que compras una vez',
          'Un tinto de $3.000 de lunes a viernes',
        ],
        correcta: 1,
        bien: 'El tinto de lunes a viernes suma $780.000 en el año: más que tres pares de esos zapatos.',
        casi: [
          'Los zapatos se notan porque los pagas de una vez. El tinto de lunes a viernes suma $780.000 en el año: más que tres pares.',
          '',
        ],
      },
      { tipo: 'aplica', calculo: 'hormiga-mes', cta: 'gastos' },
    ],
  },

  'u3-l2': {
    id: 'u3-l2',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Un gasto hormiga es pequeño, se repite y casi no se nota.',
        texto: 'Un tinto, un domicilio, una recarga. Uno solo no pesa. Juntos, al final del mes, sí.',
        nota: 'En Finko, un gasto pequeño es uno de {tope} o menos. Puedes cambiar ese tope en Límites.',
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
        criterio: 'hormiga',
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
      { tipo: 'aplica', calculo: 'hormiga-mes', cta: 'limite' },
    ],
  },

  'u3-l3': {
    id: 'u3-l3',
    pasos: [
      {
        tipo: 'concepto',
        titulo: 'Un límite muy bajo se rompe en la primera semana.',
        texto: 'Si gastas $180.000 al mes en lo pequeño y te pones $50.000, a los pocos días ya te pasaste. Y un límite roto se suele abandonar.',
        nota: 'Un buen límite parte de lo que ya gastas y te pide un cambio pequeño.',
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'Gastas $200.000 al mes en lo pequeño. ¿Qué límite tiene más probabilidad de cumplirse?',
        opciones: ['$50.000', '$100.000', '$160.000', '$250.000'],
        correcta: 2,
        bien: '$160.000 es un poco menos de lo que gastas: un cambio pequeño que sí puedes sostener.',
        casi: [
          'Es la cuarta parte de lo que gastas: se rompe en la primera semana.',
          'Es la mitad de golpe. Bajar un poco cada mes funciona mejor que un recorte grande.',
          '',
          'Es más de lo que ya gastas: no te pide ningún cambio.',
        ],
      },
      {
        tipo: 'ordenar',
        etiqueta: 'Ordena los pasos',
        pregunta: 'Ordena los pasos para poner un límite que dure todo el mes',
        items: [
          'Mira cuánto gastaste en lo pequeño el mes pasado',
          'Elige un límite un poco menor, no la mitad',
          'A mitad de mes, revisa cómo vas',
          'Si te pasas, ajusta el límite en vez de abandonarlo',
        ],
        bien: 'Un límite que parte de lo que ya gastas se puede cumplir. Bajarlo a la mitad de golpe suele romperse en la primera semana, y entonces se abandona.',
        casi: 'Primero se mira lo que ya gastas: sin ese dato, cualquier límite es un número al azar. Luego eliges, revisas a mitad de mes y ajustas si hace falta.',
      },
      {
        tipo: 'elegir',
        etiqueta: '¿Qué harías?',
        pregunta: 'Tu límite para lo pequeño es $150.000 y a mitad de mes ya vas en $120.000.',
        opciones: [
          'Nada: igual ya me voy a pasar',
          'Mirar en qué se fue y frenar lo que pueda estas dos semanas',
          'Subir el límite a $300.000 para no pasarme',
          'Dejar de anotar los gastos pequeños',
        ],
        correcta: 1,
        bien: 'Mirar en qué se fue te dice qué frenar. Con dos semanas por delante, todavía puedes terminar cerca del límite.',
        casi: [
          'Rendirte a mitad de mes borra lo que ya hiciste bien. Quedan dos semanas para ajustar.',
          '',
          'Duplicarlo deja de pedirte un cambio. Si hace falta, se ajusta un poco, no se borra.',
          'Dejar de anotar no baja el gasto, solo lo esconde. Y sin el dato no puedes ajustar.',
        ],
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'Te pasaste del límite este mes. ¿Qué es lo más útil para el próximo?',
        opciones: [
          'Quitar el límite: no sirve',
          'Ponerte la mitad para compensar',
          'Ajustarlo a lo que de verdad puedes y volver a intentar',
          'No mirar los gastos del mes',
        ],
        correcta: 2,
        bien: 'Ajustar, no rendirse: un límite que se corrige cada mes termina siendo uno que se cumple.',
        casi: [
          'Pasarse una vez es información, no un fracaso: el límite te mostró a dónde se va el dinero.',
          'Bajarlo a la mitad repite el error del límite muy bajo: se rompe antes.',
          '',
          'Sin mirar el mes no sabes qué ajustar.',
        ],
      },
      { tipo: 'aplica', calculo: 'hormiga-mes', cta: 'limite' },
    ],
  },

  'u3-l4': {
    id: 'u3-l4',
    pasos: [
      {
        tipo: 'clasificar',
        criterio: 'hormiga',
        etiqueta: 'Repaso',
        pregunta: '¿Es un gasto hormiga?',
        ayuda: 'Desliza a la derecha si lo es y a la izquierda si no. También puedes usar los botones.',
        no: 'No es',
        si: 'Es hormiga',
        tarjetas: [
          { titulo: 'Gaseosa en la tienda', monto: 3_500, detalle: 'Casi todos los días', icono: 'c-tienda', es: true,
            casi: 'Es pequeña y casi diaria: al mes son más de $70.000. Es hormiga.' },
          { titulo: 'Cuota del celular', monto: 89_900, detalle: 'Una vez al mes, ya la tienes planeada', icono: 'c-telefono', es: false,
            casi: 'Se repite, pero es un pago fijo que planeas. No es hormiga.' },
          { titulo: 'Propina del parqueadero', monto: 2_000, detalle: 'Varias veces por semana', icono: 'c-carro', es: true,
            casi: 'Es mínima, pero se repite sin que lo pienses: eso la vuelve hormiga.' },
          { titulo: 'Mercado del mes', monto: 420_000, detalle: 'Lo planeas cada mes', icono: 'c-mercado', es: false,
            casi: 'Es grande y lo planeas. No es hormiga.' },
        ],
      },
      {
        tipo: 'elegir',
        etiqueta: 'Elige una',
        pregunta: 'En Finko, ¿qué cuenta como gasto pequeño?',
        opciones: [
          'Toda compra de comida',
          'Toda compra de {tope} o menos, de cualquier categoría',
          'Solo lo que pagas en efectivo',
          'Lo que tú marques como hormiga',
        ],
        correcta: 1,
        bien: 'Lo pequeño depende del valor de cada compra, y ese tope lo ajustas en Límites: el mismo se usa en toda la app.',
        casi: [
          'No depende de la categoría: un domicilio de $15.000 cuenta igual que un tinto. Cuenta toda compra de {tope} o menos.',
          '',
          'No depende de cómo pagas: con tarjeta o en efectivo, toda compra de {tope} o menos cuenta.',
          'Se mide por el valor de cada compra, no por una marca: así ningún gasto pequeño se esconde cambiándole el nombre.',
        ],
      },
      { tipo: 'aplica', calculo: 'hormiga-mes', cta: 'limite' },
    ],
  },
};
