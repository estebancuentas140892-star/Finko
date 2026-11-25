# ADR 199 - Inicio, Gastos y Movimientos en todos los teléfonos

**Estado:** Aceptada (2026-11-25). Se aplica en tres rebanadas: TEL.1a (D2 a D4), TEL.1b (D1 y D5 a D10) y TEL.1c (D11 a D19).
**Fecha:** 2026-11-25
**Autores:** el lienzo de Claude Design "Finko · Inicio, Gastos y Movimientos en todos los teléfonos" (7 páginas con 21 cambios) y el pedido "realiza las 7 propuestas" (primero el 2026-11-22, en una sesión que se cortó por el límite de uso; repetido el 2026-11-25), Claude Opus 5.5 (auditoría e implementación)
**Relación:** Supera el ADR 122 D2 y el ADR 126 D1 (el saludo y el nombre se cortaban con puntos), el 5rem del ADR 117 D4 (el cuerpo de la fila), la fila deslizable de categorías del ADR 157 D5 y las letras de 12 y 12,5 px de las pestañas a 320 (GAS.10a, ADR 185 D1). Completa GAS.16 ([ADR 197](197-las-opciones-en-una-linea.md)) y GAS.17 ([ADR 198](198-gastos-accesibles.md)) fuera de las hojas.

---

## Contexto

El lienzo midió Inicio, Gastos y Movimientos en ocho tamaños de teléfono (320 x 568 a 430 x 932) con la letra del sistema al 100, 115 y 130 % (Android; iOS no la agranda en la web, pero su zoom de página deja 393 en 314 px). Sus reglas: el contenido decide (CSS intrínseco: `max-content`, `min-content`, `flex-wrap`); un texto baja de línea antes que achicarse y solo las cifras grandes se achican; ninguna palabra se parte y no hay puntos suspensivos salvo en la barra de pasos; la letra de 22 px o más crece como mucho 15 %; toda zona de toque mide 44 x 44 y entre controles con efectos distintos hay 8 px.

La auditoría propia (Playwright, siete tamaños por tres escalas, Range por palabra) encontró en la app de hoy: títulos y detalles con puntos en Día a día y Movimientos, el nombre de Inicio cortado en todos los tamaños, las filas de "Esta semana" y "Atención hoy" ensanchando la portada a 320 (la columna del bento medía 329 en 296: los montos quedaban fuera de la pantalla), los nombres de Deudas cortados, en Fijos el monto montado sobre "Pagar", "$300.000" partido en dos líneas en Límites, la leyenda saliéndose de la tarjeta y las etiquetas de la barra cortadas a 320 al 115 %.

## Decisión

### D1. La letra del sistema llega a 1 rem (TEL.1b)

`<meta name="text-scale" content="scale">` en `index.html`: con ella Chrome en Android cambia el tamaño de 1 rem con la letra del sistema (16, 18,4, 20,8 px) y deja de inflar las letras por su cuenta, que era lo que sacaba los textos de sus cajas. Las pruebas la simulan con el tamaño de la raíz.

### D2. Nada se corta: las filas bajan de línea (TEL.1a)

- Título y detalle de las filas de Día a día, Movimientos, Fijos, Deudas, "Esta semana" y "Atención hoy" bajan de línea; sin puntos, sin recorte a dos líneas y con `overflow-wrap: normal` (ninguna palabra se parte).
- La columna de textos no baja de su palabra más larga (`min-width: auto`); el monto (con "Pagar" o el círculo en Fijos, que ahora van juntos a la derecha) baja a un segundo renglón, a la derecha, solo cuando esa palabra no cabe a su lado.
- En Límites, nombre y "$X de $Y" tampoco bajan de su palabra más larga; "Te pasaste $X" baja de línea si no cabe.
- El saludo y el nombre de Inicio bajan de línea; los tres botones quedan arriba.
- Los chips de categorías de Día a día bajan de línea en vez de deslizarse de lado.

### D3. La leyenda de la tarjeta se envuelve (TEL.1a)

"Mercado 44 % · Ropa 16 % · Resumen ›" se envuelve y "Resumen ›" baja a su renglón, a la derecha.

### D4. La barra de abajo y el fin de las listas (TEL.1a)

"Registrar" va en una columna del ancho de su texto y las otras cuatro reparten el resto; ninguna etiqueta se corta. Las listas terminan 35 px sobre la barra más la zona segura inferior (`--fk-fin-de-lista`: los 26 que sobresale "Registrar", 8 de aire y el borde), así la última fila queda sobre el botón.

### D5. Las cuatro pestañas en dos pares (TEL.1b)

Las pestañas de Gastos van en dos pares que se envuelven: una fila mientras las cuatro quepan con su insignia y 2 px de aire; si no, 2 x 2 (Día a día y Fijos arriba, Deudas y Límites abajo, el mismo orden de lectura). Cada par es una rejilla de dos columnas iguales. La letra ya no baja a 12 o 12,5 px en los teléfonos angostos.

### D6. Empresas y entidades por la palabra más larga (TEL.1b)

La columna mínima es la mayor entre 4,5 rem y la palabra más larga de la lista más 3 px; `tejas.js` la mide cuando la rejilla aparece o cambia de ancho. Separación de 12 (8 bajo 360).

### D7. Los atajos de la primera vez en 2 x 2 (TEL.1b)

"¿En qué gastaste hoy?": las cuatro tejas van en una fila solo si caben con "Restaurantes" (22,5 rem de contenido, que crecen con la letra); si no, 2 x 2.

### D8. Días del mes de 44 x 44 (TEL.1b)

La rejilla de días mira su propio ancho: siete columnas desde 332 px (separación 6 desde 361, 4 por debajo); seis por debajo de 332, con "Último día del mes" en las cinco casillas libres.

### D9. Las cifras grandes caben con su ojo (TEL.1b)

La letra de 22 px o más crece como mucho 15 % (`--fk-cifra-*`, `--fk-titulo-22`). Si la cifra no cabe, `cifra-que-cabe.js` la achica de a 1 px hasta su mínimo: 28 en la tarjeta del mes, 34 en el saldo de Inicio y en el monto. La factura ya se adapta con unidades de contenedor.

### D10. El mensaje de la hamaca se mide (TEL.1b)

El ancho de la hamaca sale del alto real del mensaje, no de los 64 px que suponía la regla; el mínimo de 160 se queda y por debajo se acepta desplazar.

### D11. Fuera de la isla, el indicador y la barra de gestos (TEL.1c)

Arriba de la hoja: max(40, zona superior + 8); bajo 700 de alto: max(16, zona superior + 8). La acción fija suma la zona inferior. En horizontal, relleno lateral = max(16, zona lateral).

### D12. Teclado más grande cuando sobra alto (TEL.1c)

Teclas de 56 desde 844 de alto, 52 de 700 a 843 y 44 por debajo; 8 px entre teclas siempre.

### D13. La barra de pasos se toca bien (TEL.1c)

Ya cumplía con GAS.17 (ADR 198 D1): cada paso cubre su celda y 8 px arriba y abajo. Se verifica que no pise la cabecera.

### D14. Papelera y ✕ con 8 de aire (TEL.1c)

En la ficha del gasto y del fijo hay 8 px entre las dos zonas (antes 4).

### D15. Avanzar al tocar, con frenos (TEL.1c)

Se mantiene el avance al tocar (ahorra un toque por paso). Gracia de 350 ms en cada pantalla u hoja nueva; cuenta solo el toque que empieza y termina en la misma opción y se mueve menos de 10 px; con teclado sigue sin esperar. Guardar, Crear y Pagar ignoran un segundo toque durante 1 s.

### D16. El aviso con "Deshacer" espera (TEL.1c)

Se pausa mientras el dedo o el foco están en él y sigue al soltar; se apoya sobre el fin de la lista.

### D17. Búsqueda de Movimientos con versión corta (TEL.1c)

"Nombre, nota, categoría" cuando "Busca por nombre, nota o categoría" no cabe en el campo.

### D18. Nombres que empiezan por lo que se ve (TEL.1c)

"noviembre, cambiar de mes y ver el resumen"; la insignia de la pestaña en texto oculto ("Fijos, 1 pendiente"); "Te pasaste en Café, ver el límite"; "Marcar pagado: EPM".

### D19. Insignias y botón rojo legibles en oscuro (TEL.1c)

En el tema oscuro, la tinta sobre el rojo (#ff4757) pasa de blanco (3,34:1) a #1b0508 (5,87:1). El rojo no cambia; en claro sigue blanca (6,02:1).

## Lo que el pedido daba por pendiente y ya estaba

- **Cambio 16 (segmentados de dos se apilan):** GAS.16 ([ADR 197](197-las-opciones-en-una-linea.md)) ya pone "Toda la categoría / Solo una parte" juntas si caben y una debajo de la otra si no.
- **Cambio 21 (la cifra no cuenta con movimiento reducido):** `countUp` (`infra/animate.js`) ya escribe el valor final sin animar con `prefers-reduced-motion: reduce`.
- **Cambio 13 (zona de 44 en los pasos hechos):** GAS.17 (ADR 198 D1).

## Alternativas descartadas

- **Cortar con puntos y dar el nombre completo al lector:** el lienzo lo prohíbe y quien ve la pantalla lee un dato a medias.
- **Achicar la letra en los teléfonos angostos:** la letra no baja; el texto baja de línea. Solo las cifras grandes se achican.
- **Quitar el avance al tocar por el temblor:** suma un "Continuar" por paso y cada toque extra es otra oportunidad de error; los frenos de D15 atacan lo que falla.

## Consecuencias

- Las filas pueden crecer en alto (dos o tres líneas con la letra grande); el orden de lectura no cambia en ningún ancho.
- La etiqueta `text-scale` está marcada en el lienzo como "confirmar en el aparato": verificar en el Redmi al 115 % que `getComputedStyle(document.documentElement).fontSize` dé "18.4px".
- Prueba nueva: `tests/e2e/telefonos.test.js` (la matriz de tamaños y escalas sobre las seis pantallas, la barra y el fin de las listas).

## Ajustes al aplicar

- **D2:** la fila de chips deslizable de Día a día (ADR 157 D5) también baja de línea: la regla de chips del lienzo vale para todos.
- **D5:** con la regla "cada pestaña cabe con su insignia", a 320 al 100 % con dos insignias las cuatro caben en una fila; el lienzo las dibujaba en 2 x 2 porque supuso cuartos iguales.
- **D9:** el monto se queda en 58 px (ADR 142 D3) con tope de 66,7; el lienzo lo midió en 54.
