# ADR 200 - Movimientos: buscar y filtrar sin perder la lista

**Estado:** Aceptada y aplicada (2026-11-25), en una rebanada: MOV.4.
**Fecha:** 2026-11-25
**Autores:** el lienzo de Claude Design "Rediseño de Movimientos: Finko móvil" (5 páginas: análisis y propuesta, 11 pantallas en oscuro y en claro, tamaños de pantalla y la especificación S1 a S3) y el pedido "apliquemos los cambios de diseño propuestos en este enlace", Claude Opus 5.5 (auditoría e implementación)
**Relación:** Supera el ADR 105 D1, D2 y D4 (los tipos plegados, el chip "Fechas", "Limpiar filtros" junto a "Solo ..."), el ADR 089 D2 y D3 (el rango plegado y la pastilla de la cuenta), la pastilla de categoría de G5 (ADR 069 D8), los paneles en línea del ADR 186 D2 y sus cuatro atajos de periodo (D4), y la columna de filtros de escritorio del ADR 076 D2 y D4. Ajusta el ADR 121 D1 y el ADR 134 D6 (la fila) y respeta el ADR 137 D5 (con el campo vacío no se sugiere nada). Agrega una segunda excepción a R31, como la del ADR 113.

---

## Contexto

El lienzo recreó Movimientos a 393 px con cinco filtros puestos: buscador, pastillas, chips, "Solo gastos", fechas y resumen se apilaban hasta 434 px (52 % de la pantalla) y la lista empezaba a 546 px. Diagnosticó diez fallas; varias ya las había resuelto GAS.11a ([ADR 186](186-movimientos-encuentra-y-hormiga-por-frecuencia.md)) cuando se dibujó (fijos y deudas separados, categoría y cuenta elegibles, la nota en la búsqueda, el resumen con cualquier filtro). Las que seguían: los controles crecían con cada filtro, un tipo a la vez, fechas sin atajos de semana o de 30 días, tres formas de limpiar, sin empresa, persona, valor ni estado, y "Nada coincide con esos filtros" no decía qué quitar.

La propuesta: los resultados mandan y los controles quedan a un toque. Un buscador que entiende criterios y un solo botón Filtros; lo puesto vive en una fila que nunca pasa de una línea, así que con uno o con ocho filtros la lista empieza a la misma altura (228 px en vez de 546).

## Decisión

### D1. El buscador entiende criterios (`busqueda.js`)

- Al enfocar el campo, en el teléfono, se oculta el encabezado, aparece ← y se pinta el panel. Con el campo vacío: "Buscaste antes" (hasta cinco) y "Puedes buscar por" (descripción o nota, categoría, cuenta, empresa o entidad, persona, monto exacto). Nada se sugiere hasta escribir (ADR 137 D5).
- Desde 2 letras, con espera de 150 ms, sin mayúsculas ni tildes: "Filtrar por" (tipo, categoría, subcategoría, cuenta, empresa, persona, mes desde 3 letras, y el monto si lo escrito es un número; máximo 5, cada una con cuántos movimientos dejaría) y al final "Buscar el texto". La coincidencia va en negrita.
- Elegir una sugerencia crea su chip, borra el texto y deja el foco en el campo para seguir encadenando ("suscrip", "banco", "nov": tres sugerencias, sin abrir la hoja).
- El texto confirmado (Buscar, Enter o "Buscar el texto") se queda en el campo; no es un chip. El modo sigue hasta borrarlo o tocar ←. ← y Atrás del sistema (un `CloseWatcher`) salen y borran el texto.
- Combobox con `aria-activedescendant` y flechas; las sugerencias son `role="option"` dentro de un `listbox` por grupo.

### D2. Un solo botón Filtros y la hoja de ocho criterios (`hoja.js`)

- Buscador y Filtros de 48 px. El botón lleva una insignia con cuántos criterios hay (el texto no suma) y su nombre lo dice ("Filtros, 3 activos"). Ícono nuevo `i-filtros`.
- La hoja (`#modal-filtros-movimientos`) tiene cuatro grupos: Cuándo (fecha o periodo), Qué (tipo, categoría y subcategoría, estado), Dónde y con quién (cuenta, empresa o entidad, persona) y Cuánto (valor). Un criterio abierto a la vez; abrirlo lo sube al borde del cuerpo y le pasa el foco (R46).
- Aplica en vivo: no hay borrador. Cada opción dice cuántos movimientos tiene con lo demás puesto; el pie dice "Ver 24 movimientos" (con 0, "Sin movimientos" y apagado). Cerrar con la ✕, deslizando, con el velo o con Atrás conserva todo; al cerrar, la lista vuelve arriba y se anuncia cuántos quedaron (R48).
- Periodo: seis atajos en dos columnas (hoy, esta semana de lunes a domingo, este mes del 1 al último día, mes pasado, últimos 30 días con hoy, este año) que llenan Desde y Hasta.
- Categoría: casillas con su conteo; con más de 8, "Buscar categoría". Marcar una la elige entera; sus subcategorías se abren debajo y desmarcar una la deja a medias (casilla indeterminada).
- Cuenta: segmentado "Cualquiera, Salió de, Llegó a" y varias cuentas. Cualquiera conserva la regla de la transferencia (cuenta para sus dos cuentas, ADR 089 D3).
- Sin `<form>`: la hoja no pregunta "¿Salir sin guardar?" (ADR 142 D8) porque nada se pierde.

### D3. El tipo en ocho grupos, varios a la vez

Día a día, gastos fijos, deudas, ingresos, transferencias, ahorro y metas, me deben y ajustes de saldo (`GRUPOS_TIPO`, `grupoMovimiento`). Es la clase de GAS.11a con metas dentro de ahorro. Selección múltiple: "gastos fijos y deudas" juntos. Las llegadas que mandan `dominio` siguen valiendo.

### D4. La fila v2

- A la izquierda, qué: la teja por tipo (el gasto fijo con el color de Por pagar, `dom-agenda`), el nombre y una segunda línea en palabras, "Tipo · Categoría": "Restaurantes", "Gasto fijo · Suscripciones", "Pago de deuda", "Ingreso · Salario", "Transferencia · 4x1000 $800", "Aporte a meta", "Préstamo", "Me deben", "Ajuste de saldo". El tipo nunca se dice solo con el color.
- A la derecha, cuánto y dónde: el monto y, debajo, la cuenta (128 px como máximo). La transferencia no lleva cuenta: su nombre ya dice de dónde a dónde.
- El pago de un fijo o de una deuda se titula con el nombre vigente del fijo o la deuda ("Microsoft 365", no "Pago: Microsoft 365").
- Con texto buscado, lo encontrado se resalta en el título.

### D5. Los datos de cada criterio, derivados (sin tocar el schema)

`prepararMovimientos()` suma a cada movimiento, sobre la fuente ya derivada: el grupo de tipo; la categoría que se filtra (la del gasto, o la del fijo o la deuda que paga, por `compromisoId`); la empresa (la marca del fijo por `marcaId` o por su nombre, `resolverMarca`; la entidad de una deuda es su nombre); la persona (Me deben y la deuda personal); el estado (D6) y el texto donde se busca (título, categorías, nota, cuentas, empresa y persona, sin tildes). Un número busca también el monto: 45000, 45.000 y $45.000 son lo mismo. La deuda recibida y el avance llevan su `compromisoId`; el préstamo y el abono, su `persona`; el ingreso, su categoría. El filtro de los pagos de un compromiso (GAS.14c) solo toma gastos.

### D6. El estado de un pago: a tiempo, con atraso, abono parcial

Solo para fijos y deudas, y solo con alguno de ellos en Tipo o Categoría (si no, la fila se ve y dice "Elige gastos fijos o deudas para usarlo"). El lienzo pedía un dato nuevo por pago; no hizo falta: `vencimientoDeCadaPago()` (`infra/vencimientos.js`) usa la cuenta de la app, cada pago salda el vencimiento más viejo sin pago (ADR 187 D2). Con atraso si se pagó después de ese vencimiento; abono parcial si fue por menos de la cuota (en una deuda, el abono parcial no salda ninguno). Lo pendiente sigue en Por pagar.

### D7. Lo puesto: una línea, quitar y Deshacer

- La fila de activos solo existe con algún criterio, mide 40 px y no se desliza (R9): los chips que caben enteros y el resto en "+N", que abre la hoja en el primero oculto. Cuántos caben se mide con un lienzo (sin reflujo) y se vuelve a medir al cambiar el ancho.
- Cada chip son dos botones: la etiqueta abre la hoja en su criterio ("Cambiar el periodo: noviembre") y la × lo quita ("Quitar el filtro noviembre"). "Limpiar" es la única forma de borrar todo fuera de la hoja. Quitar uno o todos avisa con Deshacer ("Quitaste Bancolombia", "Quitaste 3 filtros", `ui/toast.js`).
- Debajo, el resumen: "5 movimientos · salieron $187.600" (o "entraron ... y salieron ..."). El periodo no se repite: va en su chip (R10). No es región viva (R24): lo anuncia la acción que lo cambió.

### D8. Las llegadas son filtros comunes

Una llegada desde otra sección (`movimientos:ver`: un tope de Límites, la lente Día a día, una cuenta de Mis cuentas, los pagos de un fijo) reemplaza los filtros puestos y se ve como chips. Un mes entero llega como "Noviembre". Los filtros viven en el estado de la vista: se conservan al salir y volver en la misma sesión.

### D9. Pegado al bajar; escritorio

- En el teléfono, al bajar, el encabezado se va y quedan pegados el buscador, Filtros y la fila de activos, sobre el fondo, con un filo al despegarse. Segunda excepción a R31, como la barra de lentes del ADR 113.
- En escritorio la barra y la hoja son las mismas: el buscador y Filtros van sobre el ledger, en sus 8 columnas, y la columna de filtros de la derecha se retira. Las sugerencias caen como un panel sobre la lista.

### D10. Cuando no hay nada que mostrar

- Con datos y sin resultados (M10): "Nada coincide con estos 3 filtros", una frase con lo puesto ("En octubre no hay suscripciones desde Bancolombia.") y "Prueba quitando uno", cada filtro con cuántos habría sin él; abajo, "Quitar todos los filtros". Con solo texto: "No encontramos "xyz"", "Revisa cómo está escrito o busca por categoría, cuenta o monto" y "Borrar la búsqueda".
- Sin ningún movimiento (M11) no hay buscador ni Filtros: Tino con lupa, la frase y "Registrar un movimiento".

### D11. Accesible

Hoja `role="dialog"` con foco atrapado que vuelve al control que la abrió; cada criterio es un botón con `aria-expanded` y `aria-controls`; las opciones son casillas y radios reales con su conteo en el nombre ("Transporte, 7 movimientos"); el campo usa 16 px o más; toda zona de toque mide 44. La E2E `movimientos-filtros` pasa axe (WCAG 2.2 AA) y las zonas de 44 en el buscador, cada criterio de la hoja y la lista con chips, en oscuro y en claro.

## Ajustes al aplicar

- **Sin puntos suspensivos** (manda el ADR 199 D2, con su compuerta): el lienzo cortaba nombre y categoría con "..."; aquí bajan de línea. Un chip que no cabe entero, ni siquiera el primero, va al "+N".
- **Letra en rem** (ADR 199 D1): el lienzo mide en px; aquí la letra crece con la del sistema. El campo usa `max(16px, 1rem)`.
- **Valor**: campos con separador de miles y el teclado numérico del teléfono, no el de Finko: sus 12 teclas no caben en la hoja bajo dos campos chicos. El monto exacto se escribe en el buscador.
- **Fechas**: Desde y Hasta son campos de fecha del sistema, no "1 nov 2026" dibujado.
- **La lista se filtra al confirmar el texto**, no en cada tecla: mientras se escribe, el panel ocupa ese espacio (M03).
- **Categorías**: el lienzo dibuja "Transporte"; en el catálogo es "Bus, taxi y apps" (GAS.13a). Manda el catálogo.
- **"Este mes"** pasa a ser el mes entero (S2); el atajo del ADR 186 D4 era "lo que va del mes".
- **La fila de activos no recorta** (`overflow` visible): un recorte se comía la zona de 44 de los chips (R4).
- **La barra pegada** mide 108 px (el lienzo decía 96): 8 de aire arriba, 48, 8 y 40.
- **El aviso con Deshacer** dura 8 s y se pausa con el dedo (el de la app, TEL.1c), no 6.
- **Lo que el diagnóstico daba por pendiente y ya estaba** (GAS.11a): fijos y deudas separados, categoría y cuenta elegibles, la nota y la categoría en la búsqueda y el resumen con cualquier filtro.

## Consecuencias

- Movimientos gana tres módulos (`filtros.js`, puro; `hoja.js`; `busqueda.js`) y `vencimientoDeCadaPago` en `infra/vencimientos.js`. `logic.js` suma `persona`, `compromisoId` y `categoriaIngreso` a algunas fuentes.
- Las pruebas del ADR 105, del rango plegado y de las pastillas se reescribieron sobre la barra nueva; la E2E `movimientos-filtros` recorre los ocho caminos del lienzo (S3).
- Pendiente: un recorrido con TalkBack y probarlo en el Redmi con la letra al 115 %.
