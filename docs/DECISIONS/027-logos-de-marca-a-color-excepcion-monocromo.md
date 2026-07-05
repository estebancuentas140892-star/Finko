# ADR 027 - Logos de marca a color como excepción al monocromo (`data-fullcolor`)

**Estado:** Aceptada e implementada por completo. Ya en producción en los 11 bancos/billeteras reales de `BANCOS_CO` (BR.3, cerrada el 2026-07-05). Este ADR formaliza una decisión que Esteban tomó durante la implementación (Bancolombia, 2026-07-05) sin registro previo: deuda de proceso que BR.4 cierra.
**Fecha:** 2026-07-05
**Autores:** Esteban (decisión de producto), Claude Sonnet 5 (redacción)
**Relación:** amplía [ADR 025](025-logotipos-de-marca-y-tejas.md), sección D2 ("glifos monocromos de un solo path"). No cambia D1 (la teja), D3 (categorías) ni D4 (resolución automática); D5 (marco legal) sigue vigente sin cambios. También referencia [ADR 026](026-biblioteca-de-recursos-graficos.md) (`assets/svg/` como fuente de verdad) y el fix del contorno fantasma (commit `0f143f9`, 2026-07-05) que endureció el validador.

---

## Contexto

Al implementar MK.1/BR.3, algunas marcas (Bancolombia, Banco de Bogotá, Nequi) tienen una identidad donde el color (sólido o degradado) no es un accesorio: es el reconocimiento mismo. Reducirlas a silueta monocroma sobre una teja de color plano, la regla D2 de ADR 025, pierde justo lo que ADR 025 buscaba entregar.

Esteban decidió, sin ADR previo, tratar estos logos como excepción: archivo autónomo a todo color en vez de glifo monocromo. La decisión se generalizó a los 11 bancos/billeteras reales de `BANCOS_CO` (BR.3, 2026-07-05) y quedó documentada operativamente en `assets/svg/README.md` sección 6b, pero nunca en un ADR. BR.4 cierra esa deuda: el registro formal de una decisión ya tomada e implementada.

## Decisión

### D1. Cuándo aplica la excepción

Solo cuando el color (sólido, degradado o mosaico) es parte irreductible de la identidad de la marca y una silueta monocroma perdería reconocimiento inmediato. Es un criterio de juicio humano (Esteban), no automatizable. Hoy aplica a los 11 bancos/billeteras reales de `BANCOS_CO`: Bancolombia, Banco de Bogotá, Nequi, Davivienda, BBVA, Banco Popular, Scotiabank Colpatria, Banco de Occidente, AV Villas, DaviPlata, Lulo Bank y Nubank. "Otro" queda fuera (no es una entidad real). Las marcas globales del catálogo `MARCAS` siguen la regla monocroma D2 de ADR 025, salvo que Esteban decida elevar una en particular a color, caso por caso.

### D2. Marcado: `data-fullcolor="true"`

El `<symbol>` generado en el sprite lleva el atributo `data-fullcolor="true"`: es la señal que distingue el tratamiento (autónomo, conservado tal cual) del de un glifo monocromo (`i-*`/`c-*`/`b-*` normalizado a `currentColor`).

### D3. Archivo autónomo, conservado byte a byte

El `.svg` trae su propio fondo, sus `fill` propios y sus `<defs>` con degradados, tal como Esteban lo entrega desde Illustrator. `scripts/sync-sprite.py` no convierte sus colores (a diferencia del pipeline de iconos estructurales, que sí normaliza a roles `currentColor`). Aplica la regla de fidelidad absoluta ya vigente (ampliada el 2026-07-05): cero contornos, bordes, sombras, brillos o efectos agregados que no estén en el diseño oficial; si un logo necesita contraste con el fondo de la app, se ajusta el contenedor (color de teja, espacio), nunca el logo.

### D4. Color de teja = color del propio fondo del logo

La teja del catálogo (`color` en `BANCOS_CO`/`MARCAS`) se pinta con el mismo tono dominante del fondo del logo, no con un "color corporativo oficial" independiente. El campo `texto` deja de pintar el glifo (el logo ya trae sus propios colores) y solo sigue sirviendo para el fallback de iniciales, si el símbolo llegara a retirarse. Cuando el logo no tiene un único color de fondo plano (degradado o mosaico de polígonos: DaviPlata, Davivienda, Banco de Occidente), el color se elige por coincidencia exacta en al menos 2 de las 4 esquinas del glifo, verificado por muestreo de píxeles en canvas (criterio aplicado en BR.3, ver `CHANGELOG.md` 2026-07-05).

### D5. `fill` y `stroke` explícitos en todo elemento pintable (guardarraíl técnico)

Motivado por el bug del contorno fantasma (commit `0f143f9`, 2026-07-05): la clase `.icon` (`styles/components/forms.css`) declara `fill:none; stroke:currentColor` en el `<svg>` anfitrión, y esas propiedades se heredan hacia adentro de `<use>`. Todo elemento pintable de un logo a color debe declarar `fill` y `stroke` propios (aunque sea `stroke="none"`), o hereda un contorno o un vaciado accidental del color `texto` de la teja. `scripts/sync-sprite.py` (`_validar_fullcolor()`) y el guardarraíl `tests/unit/sprite-sync.test.js` lo exigen; detectan la falta, no la corrigen sola: es responsabilidad del archivo fuente.

### D6. IDs de degradado prefijados por slug

Los `<defs>` con gradientes usan ids prefijados con el nombre del archivo (`bbog-g0`, `bancolombia-g0`...) para evitar colisión: el sprite es un único documento SVG y dos logos con el mismo id de gradiente se pisarían. `scripts/sync-sprite.py` normaliza automáticamente los ids genéricos de un export crudo de Illustrator (inglés y español, BR.5) al prefijo correcto.

### D7. Convivencia con la fidelidad D5 de ADR 025

Esta excepción no contradice D5 de ADR 025 ("el trazado se hace sobre el isotipo oficial vigente, sin distorsión ni reinterpretación"): decide el modo de color (monocromo frente a autónomo a color), no relaja la fidelidad, la refuerza (D3 de este ADR es más estricto que el monocromo estándar). El marco legal es el mismo de D5 de ADR 025: uso nominativo para identificar cuentas y servicios del propio usuario, retiro del archivo y su fila de catálogo si el titular objeta.

## Alternativas consideradas

- **Forzar monocromo también en estos 11 bancos (statu quo D2 de ADR 025).** Descartada: para marcas donde el color ES la identidad (amarillo de Bancolombia, degradado morado/rosa de Nequi), una silueta monocroma sobre teja plana pierde el reconocimiento inmediato que era el objetivo entero de ADR 025.
- **Dos colores en el catálogo: uno "oficial" de marca para la teja y otro del logo.** Descartada: redundante y propensa a desincronía visual entre teja y logo. Un solo color, el del propio fondo del logo, es la única fuente de verdad.
- **Convertir los colores del logo a roles `currentColor`, como los iconos estructurales.** Descartada: destruye degradados y mosaicos, que son justo la razón de la excepción, y multiplicaría el trabajo de conversión manual por cada banco.

## Consecuencias

### Positivas

- Reconocimiento de marca instantáneo para los bancos y billeteras más usados en Colombia, coherente con el objetivo original de ADR 025.
- El criterio queda escrito y es replicable: cualquier marca futura (global o colombiana) que Esteban decida elevar a color completo sigue el mismo patrón (D1 a D7).
- El guardarraíl técnico (D5) previene, para todo símbolo fullcolor futuro, la misma clase de bug ya vista (contorno fantasma por herencia CSS).

### Negativas / Restricciones

- Cada logo a color pesa más que un glifo monocromo de un solo path (varios `fill`, degradados); aceptable a la escala actual (11 bancos).
- El criterio de "cuándo aplica" (D1) es juicio humano, no una regla automática: cada marca nueva candidata a fullcolor requiere que Esteban la revise antes de tratarla así.
- Cuando el logo no tiene un color de fondo plano único, el color de teja es una aproximación (D4), documentada explícitamente para no sorprender a futuras revisiones.
