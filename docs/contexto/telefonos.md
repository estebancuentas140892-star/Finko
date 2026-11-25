# Ficha de contexto: Inicio, Gastos y Movimientos en todos los teléfonos

> Revisado: 2026-11-25.

> Cómo se adaptan las pantallas del teléfono al ancho, al alto y a la letra del sistema (iniciativa TEL.1, [ADR 199](../DECISIONS/199-inicio-gastos-y-movimientos-en-todos-los-telefonos.md)). Transversal a Inicio, Gastos y Movimientos: cada sección sigue en su ficha ([`inicio.md`](inicio.md), [`gastos.md`](gastos.md), [`movimientos.md`](movimientos.md)); acá van las reglas comunes y dónde viven. Reglas de uso en [`README.md`](README.md).
>
> **Qué NO buscar acá:** las opciones de las hojas de Gastos en una línea (GAS.16, en `gastos.md`); las zonas de toque y el contraste de las hojas (GAS.17, en `gastos.md`).

---

## Las reglas de adaptación

- **Objetivo**          : que nada se corte, se parta ni se salga en ningún teléfono de 320 a 440 px, con la letra del sistema al 100, 115 y 130 %.
- **Estado actual**     : TEL.1a aplicada (filas, leyenda, barra, saludo); TEL.1b y 1c pendientes ([`board/transversal.md`](../board/transversal.md)).
- **Verificado contra** : TEL.1a (2026-11-25).

**Reglas** (ADR 199): el contenido decide (CSS intrínseco); un texto baja de línea antes que achicarse; solo las cifras grandes se achican, de a 1 px y hasta su mínimo; ninguna palabra se parte (`overflow-wrap: normal`) y no hay puntos salvo en la barra de pasos; la letra de 22 px o más crece como mucho 15 %; zona de toque de 44 y 8 px entre controles con efectos distintos.

**Dónde vive**

| Pieza | Archivo | Ancla |
|---|---|---|
| Zonas seguras con nombre, zona de toque y fin de las listas | `styles/tokens.css` | `--fk-zona-*`, `--fk-toque`, `--fk-fin-de-lista` |
| Filas de Día a día y Movimientos (el monto baja a su renglón) | `styles/responsive.css` | `.list-item--detalle .list-item__body` |
| Fijos: monto y "Pagar" juntos a la derecha | `modules/dominio/compromisos/views/lista.js`, `styles/identidad.css` | `.deuda-card__fin` |
| "Esta semana" y "Atención hoy" | `styles/responsive.css`, `styles/identidad.css` | `.esta-semana__fila`, `#sec-dash .fila-atencion__textos` |
| Deudas y Límites | `styles/identidad.css` | `.deuda-inv__top`, `.limite-fila--estado` |
| Leyenda de la tarjeta | `styles/identidad.css` | `.hero-gastos__leyenda` |
| Barra de abajo en cinco columnas, "Registrar" del ancho de su texto | `styles/identidad.css`, sección 10 | `.sidebar__nav > .nav-group:first-child > [role="group"]` |
| Saludo y nombre de Inicio | `styles/responsive.css` | `#sec-dash .perfil-inicio__nombre` |

**Cómo se prueba**: `tests/e2e/telefonos.test.js` recorre Inicio, las cuatro pestañas de Gastos y Movimientos en cinco combinaciones de tamaño y letra (raíz a 16, 18,4 y 20,8 px) y mide cada palabra con un Range: más de un rectángulo es una palabra partida; un rectángulo fuera de su caja o de la pantalla, un texto que se sale.

**Riesgos**
- Un `min-width: 0` heredado en la columna de textos vuelve a dejar que la palabra se parta (pasó en Fijos: `.deuda-card__info` de `domain.css`). La columna de textos va con `min-width: auto`.
- Un texto con `white-space: nowrap` dentro de una celda del bento ensancha la portada entera (el mínimo de la columna es el de su contenido).
- `reset.css` deja `overflow-wrap: break-word` en párrafos: solo parte una palabra si su caja es más angosta que ella, así que basta con que la caja no baje de su palabra más larga.

**Cambios realizados**
- 2026-11-25 TEL.1a: filas, leyenda, barra de abajo y saludo sin puntos ni palabras partidas ([ADR 199](../DECISIONS/199-inicio-gastos-y-movimientos-en-todos-los-telefonos.md) D2 a D4).

**Cambios pendientes**
- TEL.1b y 1c (pestañas, tejas, días, cifras, hamaca, hojas, teclas, toques, aviso, búsqueda, nombres y tinta roja): [`board/transversal.md`](../board/transversal.md).
- Confirmar en el Redmi al 115 % que la letra del sistema llega a 1 rem con `text-scale` (D1).
