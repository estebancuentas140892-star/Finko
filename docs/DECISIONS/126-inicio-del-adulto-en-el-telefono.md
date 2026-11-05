# ADR 126 - Inicio del adulto en el teléfono

**Estado:** Aceptada (2026-11-05). En aplicación por tandas: el encabezado y el saldo (1). Quedan "Atención hoy" y su hoja (2), "Esta semana", los vacíos y el usuario nuevo (3), las hojas "Pagos para hoy", "Registrar" y "Tu perfil" (4) y la barra de abajo (5).
**Fecha:** 2026-11-05
**Autores:** Esteban (diseño y decisión), Claude Opus 5.5 (auditoría, implementación y redacción)
**Relación:** **Aplica** el tablero "Finko móvil · rediseño" de Inicio (Claude Design, `Diseño Finko/Finko móvil · rediseño.html`), que compara cada pantalla de hoy con su propuesta; es la primera pieza de MV2.30. **Supera** el [ADR 122](122-lo-que-faltaba-del-canvas-segunda-pasada.md) D2 (el nombre del saludo ya no baja de línea) y, solo bajo 1024px, el [ADR 034](034-inicio-v2.md) D2 y el piloto del [ADR 033](033-direccion-visual-premium.md) D2 y D3 (el saldo deja de ser tarjeta con degradado y forma). **Conserva** el [ADR 106](106-un-encabezado-tres-niveles.md) D3 (un solo ojo, en el encabezado) y el [ADR 099](099-inicio-movil-hoy-en-una-lista.md) D6 (el avatar abre "Tu perfil"). Escritorio no cambia.

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

## Lo que ya se decidió para las tandas que siguen

Aprobado en chat el 2026-11-05 junto con la tanda 1; cada tanda lo escribe en detalle al aplicarse.

1. El saldo deja de ser tarjeta solo en el teléfono (aplicado en D2).
2. El nombre se corta en una línea (aplicado en D1).
3. "Esta semana" deja la flecha de entrada o salida en el recuadro del día en el teléfono; el signo + o - se queda. Escritorio conserva la flecha (acota el ADR 088 D3 y el ADR 099 D5).
4. La hoja de pagar varios a la vez se llama "Pagos para hoy" desde Inicio y desde Por pagar.
5. El ojo encendido es el mismo en toda la app (aplicado en D1).
6. La barra de abajo nueva (activo con píldora detrás del ícono y "Registrar" plano) va en su propia tanda y cambia el ADR 040 D5 y el activo del ADR 031.

Además, sin preguntar: las medidas del tablero sin token (letras de 13, 15 y 17px, pesos 650 y 750, radio 20) van literales con comentario, como ya hacen `nino.css` y `modals.css`; y el signo menos sigue siendo "-", no el "−" del tablero, porque cambiarlo es de toda la app.

## Lo que se ajusta al pasar del tablero a la app

| El tablero dice | La app dice | Por qué |
|---|---|---|
| Ahorro en la barra lleva a `#ahorro` | `#fondo` | la casa se retiró (ADR 125) |
| Las tejas de cuenta con letras y colores propios (B, N, $) | las tejas de marca de `bancoAvatar()` | la identidad de cada banco la fija el ADR 025 |
| El saludo dentro de un `h1` | el `h1` sigue siendo "Tu resumen" (`sr-only`) | nombra la región para el lector desde IN.8d |

## Alternativas descartadas

- **Aplicar el saldo sin tarjeta también en escritorio.** La banda de escritorio (ADR 070 D6) une saldo y cuentas en una superficie y el tablero no la dibuja.
- **Un ojo encendido solo en Inicio.** Sería un control con dos caras; R20 pide el mismo en todas partes.
