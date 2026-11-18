# ADR 147 - Gusto o necesidad: Finko reconoce lo hormiga sin adivinar por el monto

**Estado:** Aceptada (2026-11-15). D1, D4 y D5 cambiados por el [ADR 162](162-en-que-fue-y-necesidad-o-deseo-en-cada-gasto.md) (2026-11-17): la respuesta es por gasto y la subcategoría, un paso. Propuesta de Claude, ajustada por Esteban en chat: la categoría Mecato y la pregunta en Otros son suyas; la tabla de subcategorías se validó con "excelente, me gusta mucho la idea".
**Fecha:** 2026-11-15
**Autores:** Esteban (visión de producto), Claude Opus 5.5 (diseño e implementación)
**Relación:** **Reemplaza** el [ADR 032](032-logros-v2-niveles-y-habitos.md) D4 y el [ADR 092](092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) D11 en lo que dicen del criterio ("hormiga es el tamaño de la transacción, no la categoría"). **Extiende** el [ADR 146](146-finko-reconoce-el-tipo-de-gasto.md) (iniciativa SUS) y la taxonomía del [ADR 014](014-taxonomia-categorias-transversal.md). La subcategoría usa la forma de dos niveles del [ADR 064](064-estructura-de-dos-niveles.md), como Metas.

---

## Contexto

Esteban (2026-11-15): "no podemos dar por sentado que todo lo que valga 20 o menos es un gasto hormiga": un jarabe, un medicamento o una herramienta de $15.000 no lo son. Finko tiene que aprender qué es hormiga para cada persona, sin pedirle que conozca la palabra.

El criterio vigente (`infra/hormiga.js`) es solo el monto: toda compra de hasta $20.000 (tope configurable en Límites) cuenta. Lo leen cinco superficies: Gastos (el aviso de la lista), Análisis, Límites (gastos pequeños), Aprende y el logro "Hormiga a raya". El ADR 032 D4 lo eligió así para que "funcione para todos y no se desactive recategorizando". El costo de esa robustez es que el número mezcla gustos con necesidades, y entonces no sirve para decidir.

## Decisión

### D1. Cada gasto tiene un carácter: necesidad, gusto o depende

- **Necesidad**: nunca es hormiga y Finko no pregunta (un jarabe en Salud > Medicamentos).
- **Gusto**: si es pequeño, es hormiga de inmediato, sin esperar a que se repita (Mecato).
- **Depende**: si es pequeño y el mismo concepto se repite (3 veces en 30 días), Finko pregunta "¿Es un gusto o algo que necesitas?" una sola vez por concepto (SUS.2c).

El carácter sale, en este orden, de: lo que el usuario contestó para ese gasto (Otros), la subcategoría, la categoría personalizada, la categoría nativa y, si nada lo dice, "depende". El usuario nunca lee "hormiga" en una pregunta: lee "gusto" o "necesidad". `infra/naturaleza.js` ya usa la palabra "naturaleza" para otra cosa (consumo o pago), por eso el campo se llama `caracter`.

### D2. Mecato, categoría nueva

"Toda clase de chucherías": dulces, paquetes, helado, gaseosas, panadería y fritos. Carácter gusto. Va después de Café. Su ícono lo diseña Esteban; mientras tanto usa `c-hormiga`, que ya no tiene categoría propia que ofrecer (SUS.1b) y dice justo lo que Mecato es. `c-tienda` no sirve: está en el selector de íconos de las categorías propias, y un nativo no puede repetirlo.

### D3. Subcategorías de gasto (validadas con Esteban)

| Categoría | Carácter | Subcategorías (carácter si cambia) |
|---|---|---|
| Mecato | gusto | Dulces y chocolates, Paquetes, Helado, Gaseosas y jugos, Panadería y fritos |
| Café | gusto | Tinto, Café de cafetería, Bebidas frías |
| Restaurantes | depende | Almuerzo del trabajo (necesidad), Comida rápida (gusto), Domicilio, Salida a comer |
| Mercado | necesidad | Supermercado, Tienda de barrio, Plaza o fruver, Carne y pollo |
| Transporte | necesidad | Bus o Metro, Gasolina, Parqueadero, Peajes, Taxi o app (depende) |
| Salud | necesidad | Medicamentos, Cita o copago, Exámenes, Óptica, Odontología |
| Educación | necesidad | Útiles y fotocopias, Libros, Curso o taller, Matrícula |
| Hogar | necesidad | Aseo y limpieza, Herramientas y ferretería, Arreglos, Muebles y electrodomésticos, Decoración (depende) |
| Mascotas | necesidad | Comida, Veterinario, Baño y peluquería, Juguetes y accesorios (depende) |
| Cuidado personal | depende | Aseo personal (necesidad), Peluquería o barbería, Maquillaje, Uñas y spa |
| Ropa | depende | Ropa, Calzado, Accesorios |
| Entretenimiento | depende | Cine, Conciertos y eventos, Rumba y licor, Chance y apuestas (gusto), Paseos |
| Familia | necesidad | Mesada, Ayuda a un familiar, Regalos (depende) |
| Otros | depende | sin subcategorías: se pregunta (D4) |

La subcategoría es opcional y nunca bloquea el guardado. Catálogo plano `SUBCATEGORIAS_GASTO` con ids estables (`mecato-helado`), leído con `hijosDeCategoria`/`hijoPorId`. El gasto guarda `subcategoriaId`, solo si pertenece a su categoría.

### D4. En Otros y en una categoría nueva, la pregunta va en el formulario

Pedido de Esteban: en Otros, Finko no sabe nada, así que pregunta "¿Es un gusto o una necesidad?" en el mismo formulario, opcional. La respuesta se guarda en el gasto (`caracter`). Al crear una categoría, o al usar una propia que todavía no lo dice, la misma pregunta queda guardada en la categoría: se contesta una vez.

Las recargas de celular no piden categoría propia: van en Otros, y el usuario dice que son una necesidad. Los cigarrillos tampoco: el usuario los pone donde los piense (Mecato u Otros).

### D5. Dónde se ve

- **Escritorio**: debajo de las categorías, "Sé más específico" con la subcategoría, o la pregunta de D4. Un `<fieldset>` por categoría, oculto y deshabilitado salvo el de la elegida (patrón de Metas).
- **Teléfono**: tocar una categoría sigue llevando directo al recibo (ADR 142 D4). La subcategoría o la pregunta es una fila opcional del recibo con su mini-hoja, como la nota.
- **La lista**: un gasto sin nota se titula con su subcategoría ("Helado") y debajo dice la categoría.

### D6. La regla de hormiga nueva (SUS.2b)

Es hormiga lo pequeño (tope de siempre) cuyo carácter es gusto, o depende y se repite. Un gasto suelto de carácter "depende" no cuenta. Se aplica en `infra/hormiga.js` y las cinco superficies la leen de ahí.

## Fases

- **SUS.2a** (esta): D1 a D5. Catálogo, formulario, `subcategoriaId` y `caracter` (schema v52), `caracterDeGasto()`. La regla de hormiga todavía no cambia.
- **SUS.2b**: D6 en las cinco superficies.
- **SUS.2c**: la pregunta al repetirse un concepto "depende" y lo aprendido por concepto.
- **SUS.2d**: corregir desde el detalle del gasto y la lista de lo aprendido en Límites.

## Consecuencias

- **Positivas:** el número de hormiga se vuelve creíble (sin medicamentos ni herramientas), el usuario aprende a separar gusto de necesidad sin teoría, y la subcategoría le da a Finko un concepto limpio con qué aprender, en vez del texto libre de la nota.
- **Costo:** dos campos opcionales en el gasto y uno en la categoría personalizada; un catálogo de subcategorías que mantener; un ícono pendiente.
- **Riesgo:** quien nunca elige subcategoría ni contesta queda con su categoría; las de carácter "depende" solo cuentan si se repiten. Es menos que hoy, a propósito: hoy cuenta lo que no es.

## Alternativas consideradas

1. **Seguir solo con el monto** (ADR 032 D4): cuenta como hormiga lo que no lo es; es lo que el pedido corrige.
2. **Preguntar en cada gasto pequeño**: interrumpe el registro que el ADR 142 aligeró.
3. **Una categoría "Gastos hormiga"**: se retiró en SUS.1b; obliga a conocer el término.
4. **Subcategoría obligatoria**: más datos, pero un toque más en cada registro.
