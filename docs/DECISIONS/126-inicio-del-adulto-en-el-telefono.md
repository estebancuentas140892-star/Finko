# ADR 126 - Inicio del adulto en el teléfono

**Estado:** Aceptada (2026-11-05). Aplicada completa en cinco tandas: el encabezado y el saldo (1), "Atención hoy" y su hoja (2), "Esta semana", los vacíos y el usuario nuevo (3), las hojas "Pagos para hoy", "Registrar" y "Tu perfil" (4) y la barra de abajo (5). El tablero se borró de `Diseño Finko/` al cerrar la quinta: desde ahí la fuente es este ADR.
**Fecha:** 2026-11-05
**Autores:** Esteban (diseño y decisión), Claude Opus 5.5 (auditoría, implementación y redacción)
**Relación:** **Aplica** el tablero "Finko móvil · rediseño" de Inicio (Claude Design, `Diseño Finko/Finko móvil · rediseño.html`), que compara cada pantalla de hoy con su propuesta; es la primera pieza de MV2.30. **Supera** el [ADR 122](122-lo-que-faltaba-del-canvas-segunda-pasada.md) D2 (el nombre del saludo ya no baja de línea) y, solo bajo 1024px, el [ADR 034](034-inicio-v2.md) D2 y el piloto del [ADR 033](033-direccion-visual-premium.md) D2 y D3 (el saldo deja de ser tarjeta con degradado y forma). **Acota** el [ADR 088](088-me-deben-urgencia-de-cobro-y-direccion-con-forma.md) D3 y el ADR 099 D5 en el teléfono (el recuadro del día va sin flecha, D4) y **cambia** el [ADR 040](040-navegacion-v2-visual.md) D5 y el activo del [ADR 031](031-identidad-de-color-por-seccion.md) (la barra de abajo, D8). **Conserva** el [ADR 106](106-un-encabezado-tres-niveles.md) D3 (un solo ojo, en el encabezado) y el [ADR 099](099-inicio-movil-hoy-en-una-lista.md) D6 (el avatar abre "Tu perfil"). Escritorio no cambia.

---

## Contexto

Después del canvas móvil (ADR 098 a 123) Inicio quedó ordenado, pero sus piezas seguían hablando el lenguaje de tarjeta de la primera versión: el saldo dentro de una tarjeta con degradado, la lupa y el ojo en cajas, el avatar con borde grueso y el nombre bajando hasta cuatro líneas a 360px. El tablero propone el mismo contenido con menos cajas: el saldo suelto sobre el fondo, los controles del encabezado sin caja y una sola tarjeta por bloque.

Esteban aprobó en chat las recomendaciones de la auditoría para los seis puntos que tocan decisiones escritas (D1 a D6 de la sección "Lo que ya se decidió para las tandas que siguen").

## Decisión

### D1. El encabezado (tanda 1)

- **Orden:** marca, saludo y, a la derecha y juntos, lupa, ojo y avatar. Los tres van en `.perfil-inicio__acciones`, sin espacio entre ellos; el grupo se come 8px del margen para que el disco del avatar quede a 16px del borde.
- **Marca** de 32px. **Saludo** en dos líneas: la franja en 13px y el nombre en 18px, peso 650, **en una sola línea con puntos suspensivos**. Supera el ADR 122 D2: el nombre completo sigue en el nombre accesible del avatar y en el título de "Tu perfil".
- **Lupa y ojo sin caja**, de 44px y dibujo de 22px.
- **El ojo encendido** lleva un disco de acento de 36px detrás del dibujo. Vale para todos los ojos de saldo de la app (`[data-action="bloque-saldo-visibilidad"]`), que son el mismo control (R20).
- **El avatar** conserva su zona de 44px; lo que se ve es un disco de 36px con borde fino y la letra en 14px (13px con dos letras). `updSaludo()` envuelve las iniciales en `.perfil-inicio__avatar-disco`.

### D2. El saldo, sin tarjeta (tanda 1)

- Bajo 1024px `.hero-inicio` pierde fondo, borde, sombra y forma decorativa: el rótulo y el monto (40px, peso 750) van sueltos sobre el fondo. La banda de escritorio no cambia.
- **Con el ojo puesto** el monto se calla para el lector (`aria-hidden`) y una línea `sr-only` dice "Oculto": antes el lector leía seis puntos.
- **La pastilla pasa a ficha de cuentas:** hasta tres tejas de marca en círculo (las cuentas primero y el efectivo al final; si hay más, un disco "+N"), cómo está repartido el dinero y una flecha. `etiquetaCuentas()`: una cuenta dice su nombre; efectivo y otras, "Efectivo y N cuentas"; sin efectivo, "N cuentas"; solo efectivo, "Efectivo". El nombre accesible conserva "Ver detalle por cuenta: …" y, abierta, "Ocultar detalle por cuenta". `fichasCuentas()` pinta las tejas con `bancoAvatar()`.
- **El conteo de abajo** ("efectivo + 2 cuentas bancarias") se calla en el teléfono: lo dice la ficha. Sigue en escritorio.
- **El detalle abierto** va en una tarjeta propia: una fila por cuenta (nombre en dos líneas como máximo, el saldo nunca se corta) y, al pie, "Ir a Mis cuentas".
- 28px entre el saldo, "Atención hoy" y "Esta semana".

### D3. "Atención hoy" y la hoja "Avisos de hoy" (tanda 2)

- **El título** va en 18px, sin mayúsculas, con "Ver los N" en su fila.
- **Una sola tarjeta con el primer aviso destacado:** su urgencia escrita en su color (Urgente, Importante, Para revisar, Para tu información), la frase en 16px, el detalle y un botón a todo el ancho. Los demás avisos son filas que se tocan enteras: teja, frase y detalle en dos líneas como máximo, y a la derecha el verbo corto con su flecha. El nombre accesible de la fila es la acción completa ("Ver el límite de Restaurantes") y la frase con su urgencia la describe (`aria-describedby`).
- **La teja dice la sección, no la urgencia:** `.cat-teja` con el dominio de la sección (`_DOM_POR_SECCION`: Me deben en `personales`, las reservas en `ahorro`, respaldo y nube en `analisis`). La urgencia se lee; "Para tu información" pasa a un tono neutro.
- **El peso del botón:** mover dinero ("Pagar los 2 · $X", "Distribuir ahora") viste su sección con `.btn-dominio`; ir a otro lugar es `btn-secondary`. Vale para el destacado y para la hoja. En la fila, el verbo de lo que mueve dinero va en el color de su sección.
- **Copys:** el estado del lote va aparte del monto y en su color ("$1.415.000 · 1 ya vencido"); en Me deben la frase es el nombre y el detalle "Te debe $X · fecha acordada hace N días", porque el nombre puede ser largo y el monto no se corta; el respaldo dice "Ir a respaldar tus datos".
- **La hoja:** el número en pastilla junto al título (el lector sigue oyendo "Avisos de hoy · N"), cada grupo con la teja de su sección, su título sin mayúsculas, la urgencia en pastilla, la lista sobre un fondo apenas más claro y el botón con su peso.

### D4. "Esta semana" (tanda 3)

- **El título** como el de "Atención hoy", con "Calendario" a la derecha.
- **Los totales van arriba**, entre el título y la tarjeta: "Entra $100.000 · Salen $802.016", cada cifra en negrita (lo que entra en acento). Misma lógica de siempre ("Entra/Entran", "Sale/Salen", "Sin pagos esta semana").
- **El recuadro del día** mide 44px y **va sin flecha**: el signo del monto dice la dirección (acota el ADR 088 D3 y el ADR 099 D5; escritorio conserva la flecha en `_filaObligacion()`). **El día se escribe una vez:** la fila del mismo día que la anterior deja un hueco.
- **El tipo del ingreso** dice "ingreso", no "entra".
- **"Y N más en el Calendario"** es la fila de pie de la tarjeta.
- **Sin nada en la semana**, una tarjeta con la teja del Calendario y dos líneas: "Todo al día" y "Sin vencimientos en los próximos 7 días.".

### D5. El usuario nuevo (tanda 3)

La guía de tres pasos que ya tenía escritorio pasa también al teléfono, en línea de tiempo: el primer paso lleno de acento y los otros dos con borde, unidos por una línea. En el teléfono el paso 2 dice "Con el botón Registrar de abajo"; escritorio sigue diciendo "de arriba". El botón "Agregar mis cuentas" va a todo el ancho.

### D6. Las hojas "Pagos para hoy", "Registrar" y "Tu perfil" (tanda 4)

- **"Pagos para hoy"** es el título del lote desde Inicio y desde Por pagar (antes "Pagar lo vencido"): el conjunto ya incluía lo que vence hoy. La introducción dice "Vencen hoy o ya vencieron y no están registrados." Cada fila dice su estado en su color: "Venció el 5" en rojo, "Vence hoy" en ámbar; en una deuda, "Cuota de la deuda · venció el 5" o "Resto de la cuota · vence hoy". `renderFormPagoLote(pendientes, diaHoy)` recibe el día de hoy solo si el lote es del mes en curso.
- **El pie del lote** lleva "Total a registrar" y la cifra en una fila sobre el botón, que pasa a 52px con el dibujo de chulo; sin nada marcado, la fila pide marcar uno. En el teléfono la lista va unida en una sola tarjeta (acotado a `#modal-pago-lote`: "Movimientos automáticos" comparte `.lote-row`).
- **"Registrar"**: Gasto e Ingreso arriba en dos columnas, con su teja y su tinte; lo que depende de tus datos (abono, transferir, aporte) va en una lista debajo, una fila por destino con la teja de su sección y una flecha. La lista se oculta si queda vacía. La hoja es la misma en los dos anchos.
- **"Tu perfil"** solo cambia de medidas: el avatar con borde fino, el nombre en 20px y dos líneas, filas de 64px y la lista sobre un fondo apenas más claro.

### D7. Medidas sin token y el signo menos

Las medidas del tablero que no tienen token (letras de 13, 15 y 17px, pesos 550, 650 y 750, radios 20, 18, 14, 12 y 11) van literales y con comentario, como ya hacen `nino.css` y `modals.css`; no nacen tokens nuevos. El signo menos sigue siendo "-", no el "−" del tablero: cambiarlo es de toda la app.

### D8. La barra de abajo (tanda 5)

- **La sección activa** ya no tiñe la celda entera ni lleva la barrita de arriba: una píldora de 56 × 32 detrás del ícono, en el color de su sección (acento en Inicio), y el rótulo en su color con peso 650. Las inactivas van en el gris tenue con peso 500; la chispa sigue en acento. Gastos mientras se está en otra de sus lentes lleva la misma píldora.
- **"Registrar"** es una píldora de acento plana del mismo tamaño, sin degradado, sombra ni salto, con el rótulo en el color del texto.
- **La barra** es un tono más oscuro que la tarjeta, con la receta de la barra del niño. Cambia el ADR 040 D5 (la pastilla con relieve) y el activo del ADR 031 (celda teñida y barrita).
- La píldora es el `::before` que antes dibujaba la barrita: no cambia el marcado.

## Lo que se ajusta al pasar del tablero a la app

| El tablero dice | La app dice | Por qué |
|---|---|---|
| Ahorro en la barra lleva a `#ahorro` | `#fondo` | la casa se retiró (ADR 125) |
| Las tejas de cuenta con letras y colores propios (B, N, $) | las tejas de marca de `bancoAvatar()` | la identidad de cada banco la fija el ADR 025 |
| El saludo dentro de un `h1` | el `h1` sigue siendo "Tu resumen" (`sr-only`) | nombra la región para el lector desde IN.8d |

## Alternativas descartadas

- **Aplicar las tandas sin preguntar las seis que tocaban decisiones escritas.** Esteban las aprobó en chat antes de la tanda 1; ninguna se revirtió en silencio.

- **Aplicar el saldo sin tarjeta también en escritorio.** La banda de escritorio (ADR 070 D6) une saldo y cuentas en una superficie y el tablero no la dibuja.
- **Un ojo encendido solo en Inicio.** Sería un control con dos caras; R20 pide el mismo en todas partes.
