# Ficha de contexto: Identidad visual v3 y Tino en el adulto

> Revisado: 2026-11-05.

> El lenguaje visual de la app (paleta del isotipo, tipografía, forma, profundidad, banda de marca, tarjetas de identidad, barra de abajo) y Tino en la app del adulto (vacíos, bienvenida, explicación, celebraciones). Nace partida de [`sistema-visual.md`](sistema-visual.md), que estaba en su techo de 40 KB: allá sigue el color por sección, las tejas de marca y la navegación. Reglas de uso en [`README.md`](README.md).
>
> **Qué NO buscar acá:** los valores exactos de los tokens (en `styles/tokens.css`); el Tino del niño (en [`nino.md`](nino.md), sprite del ADR 095); el cálculo de los logros (en [`logros.md`](logros.md)).

---

## La capa de identidad

- **Objetivo**          : que Finko se vea como una app financiera actual y con marca propia sin tocar maquetación, lógica ni datos ([ADR 127](../DECISIONS/127-identidad-bosque-y-sol.md)).
- **Estado actual**     : estable. Aplicada a toda la app del adulto en los dos temas y los dos anchos; el niño conserva su diseño.
- **Verificado contra** : copia de trabajo sobre `c87cc03` (2026-11-05), sin commit todavía.

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Paleta de marca, tinta y capas de la tarjeta de identidad | `styles/tokens.css` | `--fk-brand-*`, `--fk-hero-*`, `--fk-grad-bosque` | ~10 |
| Lienzo, acción y sombras del tema claro | `styles/themes.css` | `body.light-theme` | ~7 |
| Fuente display y alias de cifras | `styles/tokens.css` | `--fk-font-display`, `--fk-font-mono` | ~210 |
| `@font-face` de Plus Jakarta Sans e import de la capa | `styles/main.css` | `layer(identidad)` | ~30 |
| Receta visual de cada componente (13 apartados) | `styles/identidad.css` | índice en su cabecera | 1 |
| Tarjeta de identidad (5 heroes) | `styles/identidad.css` | `.hero-gastos, .hero-compromisos, ...` | ~230 |
| Banda de marca de Inicio (móvil y escritorio) | `styles/identidad.css` | `#sec-dash .perfil-inicio`, `.banda-inicio` | ~330 |
| Barra de abajo y "Registrar" flotante | `styles/identidad.css` | `.sidebar .nav-item__fab` | ~440 |

**Riesgos**

- La capa gana a `responsive` por orden de capas, no por especificidad: una regla nueva de `responsive.css` que pelee con la identidad pierde aunque sea más específica. Se corrige acá, no subiendo especificidad allá.
- La tarjeta de identidad redefine los tokens de texto y superficie para sus hijos: una pieza nueva dentro de un hero hereda blanco sobre color. Si debe verse como tarjeta normal, va fuera del hero.
- El primario del encabezado sigue tonal (ADR 106 D4) por una regla explícita de la capa; un primario nuevo en un encabezado entra a esa lista.

**Cambios realizados**

- 2026-11-05 ADR 127: identidad v3 "Bosque y sol".

**Cambios pendientes**

- Las pantallas de arranque de iOS (`assets/splash/`) siguen con el fondo `#101218`: regenerarlas con `scripts/gen-splash.py` y el fondo nuevo.

---

## Tino en la app del adulto

- **Objetivo**          : que Tino acompañe donde suma (vacíos, bienvenida, explicación, celebración) con su dibujo original, nunca redibujado.
- **Estado actual**     : estable.
- **Verificado contra** : copia de trabajo sobre `c87cc03` (2026-11-05), sin commit todavía.

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Los seis dibujos originales | `assets/tino/` | `tino-<pose>.svg` | - |
| Tino sobre su sol (HTML) | `modules/infra/ilustraciones.js` | `htmlTinoSol()`, `TINO_ORIGINAL` | ~85 |
| Pose por sección del vacío | `modules/ui/proposito.js` | `TINO_POR_SECCION` | ~75 |
| Bienvenida del usuario nuevo | `index.html` | `.hero-guia__bienvenida` | ~710 |
| Explicación de la distribución | `modules/dominio/tesoreria/views/distribucion.js` | `distribuir-card__tino` | ~985 |
| Hitos, foto y comparación | `modules/ui/celebraciones.js` | `HITOS`, `fotoHitos()`, `hitosNuevos()` | ~40 |
| Aviso con Tino | `modules/ui/toast.js` | `mostrarToast({ tino })` | ~45 |
| Arranque | `modules/ui/bootstrap.js` | `initCelebraciones()` antes de `initLogros()` | ~145 |

**Recursos**: clases `.tino-sol`, `.tino-sol__img`, `.banner-proposito__tino`, `.fk-toast--tino` (`styles/identidad.css`); tokens `--fk-brand-crema` y `--fk-brand-girasol` (el sol).

**Dependencias y relaciones**: `celebraciones.js` escucha `state:change` y `perfil:cambio`; lee `S.logros`, que llena `dominio/logros` en silencio (ADR 101 D3). Revisa un cuadro después del cambio para que `initLogros` ya haya guardado el logro. Nunca corre con el perfil del niño activo (`esPerfilNino()`).

**Riesgos**

- Un aviso con Tino vive 7 s sobre la barra: una prueba E2E que toque algo en esa franja justo después de crear el primer ingreso, la primera reserva, el primer límite o la primera meta puede chocar con él.
- Una descarga de la nube que traiga un solo ingreso a un teléfono sin ingresos se celebra como primer ingreso: es el único caso que la regla "de 0 a exactamente 1" no distingue.

**Cambios realizados**

- 2026-11-05 ADR 127 D6 y D9: Tino en vacíos, bienvenida, distribución y celebraciones.

**Cambios pendientes**

- Ninguno técnico. Si llegan las poses de la ronda 2 (APR.5b), el adulto las recibe como archivo en `assets/tino/` y una entrada en `TINO_ORIGINAL`.
