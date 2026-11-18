# ADR 176 - Análisis en dos lentes: tus gastos y tu situación

**Estado:** Aceptada y aplicada en el teléfono (2026-11-18) en cuatro rebanadas: ANA.1a (D1 y D9, SW v773), ANA.1b (D2 a D5 y D7, SW v774), ANA.1c (D6, SW v775) y ANA.1d (D8, SW v776). El escritorio (D10) queda en ANA.2.
**Fecha:** 2026-11-18
**Autores:** Esteban (tablero "Finko · Rediseño de Análisis", con su pedido de aplicarlo), Claude Opus 5.5 (diagnóstico contra el código e implementación)
**Relación:** **Reabre el [ADR 090](090-analisis-cada-bloque-declara-su-alcance.md) D4**: Análisis gana un selector de periodo, pero solo gobierna Tus gastos; lo que es de hoy queda fuera de su alcance. **Reemplaza el [ADR 046](046-analisis-interpreta-criterio-y-lenguaje.md) D4** (el layout cerrado en bloques) **y el [ADR 134](134-consultar-del-adulto-en-el-telefono.md) D7** (la anatomía del teléfono) bajo 1024px; las lecturas de una línea del 046 D3 se conservan y crecen. **Amplía el [ADR 127](127-identidad-bosque-y-sol.md) D6**: Tino suma dos lugares (D7). **Deja pendiente el [ADR 078](078-analisis-en-dos-filas-de-dos.md)**: el escritorio sigue en dos filas de dos hasta su propia tarjeta (D10). Conserva el 046 D1 a D3, el 090 D1 a D3 y D5, y el [ADR 019](019-limites-por-rol.md) y el [054](054-el-gasto-no-es-una-alerta.md): gastar no es incumplir.

---

## Contexto

Bajo 1024px la sección pintaba 14 visualizaciones y mezclaba cinco periodos en una pantalla: el mes en curso, 12 meses, 90 días, el año fiscal y el saldo de hoy. Tres defectos medidos en el código (`analisis/view.js`, `telefono.js`, `logic.js`) con 4.000 gastos a 390px:

- "Este mes llevas X, 29% menos que octubre" comparaba 18 días contra un octubre completo: casi siempre "bajaba".
- La barra de cada categoría se medía contra la mayor, y "Otras 8 categorías" la llenaba con 39%.
- Las cinco preguntas que la sección debe contestar (en qué gasto, cuál es mi mayor gasto, gasto más o menos que antes, cómo se distribuye, qué hábitos podría mejorar) estaban repartidas entre tarjetas y un plegable.

El tablero separa lo que pasa en un periodo (Tus gastos) de lo que tienes hoy (Tu situación) y le da a cada bloque una sola pregunta.

## Decisión

### D1. Dos lentes

Bajo el título, dos pestañas: **Tus gastos** (un periodo, la de entrada) y **Tu situación** (hoy). El periodo manda sobre todo lo que tiene debajo; salud, patrimonio y renta viven en su propia lente y no lo ven.

### D2. El periodo: Día, Semana, Mes y Año

Bajo las pestañas, cuatro pastillas; Mes es la de entrada. En el encabezado de la sección, una pastilla con flechas recorre el periodo: "Hoy" o "Dom 8 nov", "16 al 22 nov", "Noviembre", "2026". La semana va de lunes a domingo. No se avanza más allá del periodo en curso ni se retrocede antes del primer gasto registrado. En Tu situación la pastilla no aparece. El periodo vive en memoria mientras la app está abierta: no se guarda.

### D3. La misma anatomía en los cuatro periodos

Encabezado en la tarjeta de identidad de Análisis (127 D5, color pizarra) con el total y su gráfica, "En qué gastas" y "Lo que Finko encontró". Cambia lo que vale la pena decir:

| | Día | Semana | Mes | Año |
|---|---|---|---|---|
| La pregunta | ¿Qué gasté hoy? | ¿Cómo va la semana? | ¿En qué se me va el mes? | ¿Cómo voy en el año? |
| Encabezado | Total y número de gastos, contra tu promedio diario del mes | Total, contra la semana pasada a esta altura | Total, contra el mes anterior a esta altura | Total y promedio por mes |
| Gráfica | Ninguna: una barra contra el promedio | 7 barras, de lunes a domingo | Ritmo acumulado contra el mes anterior | 12 barras con la línea del promedio |
| En qué gastas | Cada gasto del día, de mayor a menor, y "Ver el día en Gastos" | Categorías de la semana | 5 categorías y "Otras" | 5 categorías y "Otras" |
| Lo que Finko encontró | Nada que buscar en un día | El día que más pesó | Hormiga, el mayor cambio y el día de la semana | El mes más alto y la hormiga del año |

El promedio por mes del año sale de los meses cerrados con gasto: el mes en curso no lo arrastra hacia abajo y un mes sin registro no cuenta como cero (046 D3).

### D4. Comparar a la misma altura

Un periodo en curso nunca se mide contra uno completo: el 1 al 18 de noviembre contra el 1 al 18 de octubre, el lunes a miércoles contra el lunes a miércoles anterior. Un periodo cerrado se compara completo contra el anterior completo. La comparación va en una pastilla: bajar es verde; subir es neutro, nunca rojo. La regla rige también la pastilla de la tendencia del escritorio.

### D5. En qué gastas

Una fila por categoría con su monto, su parte del total y una barra que **mide esa parte** (no contra la mayor). Con más de seis categorías, cinco y "Otras N categorías" con sus nombres ("Salud, Ropa, Hogar y Mascotas"; desde cuatro, "Café, Ropa, Hogar y 5 más"). Sobre las filas, una frase: "Restaurantes es tu mayor gasto: 33% de noviembre". Cada fila abre su categoría (D8).

### D6. Lo que Finko encontró

Hasta tres hallazgos del periodo, ordenados por dinero (el del día de la semana, que no es una suma, va al final), cada uno con su enlace opcional. Describe, no ordena: la acción es un enlace que la persona elige (046 D3). Sin hallazgos el bloque no aparece. A mitad de periodo solo se anuncia lo que ya subió: una bajada se confirma al cerrar. Reparte lo que hacía el plegable "Más detalle de tus gastos", que sale: el total contra el mes anterior va al encabezado, el cambio de cada categoría a su detalle y el mayor a este bloque; el patrón por día de la semana y la hormiga pasan a una frase. "Ver cuáles" abre la hoja con las compras pequeñas de gusto por categoría.

### D7. Tino acompaña, nunca adorna

Siempre el dibujo original sobre su sol (127 D6). Dos lugares nuevos: con lupa en la cabecera de "Lo que Finko encontró", y tranquilo en un periodo sin gastos, con "Registrar un gasto" (en un día pasado, con la fecha de ese día).

### D8. El detalle de una categoría

Una pantalla dentro de Análisis, con "‹ Análisis" para volver y el periodo que la abrió: el total con su parte y su número de gastos; la comparación a la misma altura en pastilla y en frase; el límite del mes si la categoría tiene uno; "En qué se va", las subcategorías con su parte (lo anterior a la v52 cae en "Sin detalle"); "Cómo ha cambiado", sus últimos seis meses contra el promedio de los cinco anteriores; y "Tus gastos más grandes", cinco, con "Ver los N en Gastos" (Movimientos con la categoría y el periodo puestos).

### D9. Tu situación

"Hoy, miércoles 18 de noviembre" y tres tarjetas:

- **Salud de tu dinero**: número, banda en pastilla, barra y lo que más la frena con su salida (sin cambios de cálculo). "De dónde sale el 59" es una fila que abre los cuatro factores en una hoja.
- **Lo que realmente tienes**: el neto, una frase (lo que tienes, lo que debes y cuánto pesan tus deudas) y dos filas: "Lo que tienes" abre sus cinco partes; "Lo que debes" abre las deudas con su saldo y la salida a Por pagar.
- **Estado de tu renta**: una fila que solo avisa con alerta; el detalle sigue en su hoja.

### D10. El escritorio queda para después

Desde 1024px sigue el ADR 078 (dos filas de dos) hasta que su propia tarjeta lo rediseñe con esta estructura; solo cambia su pastilla de tendencia (D4). La proyección de patrimonio sigue sin conectar (046 D4: pintarla sería una tarjeta nueva).

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Un selector de periodo para toda la sección | El problema era justo mezclar periodos: la salud y el patrimonio son de hoy, y la renta es del año fiscal. |
| Conservar la dona y las 12 barras en Mes | Repiten las filas y no responden "¿voy gastando más o menos?"; el ritmo acumulado sí. |
| Medir la barra de cada categoría contra la mayor | La primera siempre va llena y "Otras" parece la segunda categoría; la parte del total es lo que dice el número de al lado. |
| Comparar el mes en curso contra el anterior completo | A mitad de mes casi siempre "baja": el dato engaña justo cuando importa. |
| Anunciar a mitad de periodo lo que bajó | Puede subir antes de cerrar; una buena noticia que se desmiente enseña a no creerle a la sección. |
| Listar en Análisis todos los gastos de una categoría | Las listas viven en Gastos (Movimientos); Análisis muestra los más grandes y enlaza al resto. |
| Rediseñar el escritorio en la misma iniciativa | El tablero no lo dibuja; se hace con su propia tarjeta una vez el teléfono esté en uso. |

## Consecuencias

- `analisis/telefono.js` se rehace; la lógica nueva (rangos de periodo, comparación a la misma altura, ritmo acumulado, hallazgos, subcategorías, gastos más grandes) es pura y vive en `analisis/logic.js`.
- `analisis/logic.js` lee los límites (`presupuesto/logic.js`): crece la excepción documentada de la capa de agregación (ADN 10).
- El plegable "Más detalle de tus gastos" desaparece del teléfono; en el escritorio sigue hasta su tarjeta.
- Fuera del alcance: el escritorio (D10) y una salida a Movimientos filtrada por hormiga, que no existe como filtro.
