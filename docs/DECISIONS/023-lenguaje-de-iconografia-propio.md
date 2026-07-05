# ADR 023 - Lenguaje de iconografía propio (duotono + punto de valor)

**Estado:** Aceptada, revisada el 2026-07-04 (v2 "trazo cálido con chispa"); ID.7 (símbolos estructurales) e ID.3 (categorías en tejas) cerradas el 2026-07-05, ver secciones finales. Iniciativa completa.
**Fecha:** 2026-07-04
**Autores:** Claude Fable 5 (análisis y decisión, revisión visual aprobada por Esteban)
**Resuelve:** ID.1 e ID.2 (identidad visual: sistema de iconografía) y su revisión ID.6 (lenguaje v2). Revisa parcialmente la decisión de ARCHITECTURE.md sección 8.1 (iconografía híbrida emoji/SVG).

---

## Contexto

La revisión visual de 2026-07-04 (39 capturas de las 13 secciones en escritorio oscuro, móvil y claro) concluyó que la brecha principal entre Finko y un producto con identidad propia está en la iconografía. Hoy conviven dos lenguajes:

1. **UI estructural:** ~30 símbolos SVG con geometría copiada de Lucide (`<symbol id="i-*">` en `index.html`). Consistentes, pero genéricos: los mismos iconos de miles de apps.
2. **Categorías y momentos expresivos:** ~70 emojis en 6 catálogos de `constants.js` más emojis sueltos en títulos y nudges. Dependen de la plataforma (Segoe UI Emoji en Windows, otro dibujo en Android/iOS), tienen pesos visuales dispares y comunican "app genérica".

El usuario pidió explícitamente un sistema donde todos los iconos pertenezcan a la misma familia visual, con estilo minimalista, limpio y moderno, reconocible sin leer el texto, y sin costo de rendimiento.

La decisión previa (híbrido intencional, guardarraíl TX.4, serie del icono de Gastos) se revisa aquí: el híbrido resolvió la consistencia emoji-a-emoji, pero no puede resolver la identidad, porque el dibujo del emoji no es nuestro.

## Decisión

**Finko adopta un lenguaje de iconografía propio, "Finko Icons", basado en tres rasgos: geometría de línea sobre grid de 24, duotono heredado del contexto y un "punto de valor" sólido integrado en la metáfora.** El despliegue es por fases; esta ADR define el lenguaje y lo aplica como piloto a los 14 símbolos de navegación.

### Reglas del lenguaje

1. **Grid y trazo:** viewBox `0 0 24 24`, área viva ~21×21 (margen óptico ~1.5px). Trazo 2, terminaciones y uniones redondeadas (se hereda del CSS `.icon` existente; la identidad no depende de adelgazar el trazo, y así los símbolos aún no migrados no desentonan en grosor).
2. **Duotono:** cuando la metáfora tiene "cuerpo" (una casa, una tarjeta, un frasco), esa región se rellena con `fill="currentColor" fill-opacity=".15"` como atributo dentro del símbolo. Hereda el color del contexto igual que el trazo: en la navegación activa se tiñe de acento, en superficies de dominio se puede teñir con `--fk-dom-*`. Cero CSS nuevo, cero JS.
3. **Punto de valor:** cada icono de identidad lleva exactamente un elemento sólido pequeño (`circle` r 1.2-1.6, `fill="currentColor" stroke="none"`) integrado como detalle natural de la metáfora: la ventana de la casa, el día marcado del calendario, la moneda del frasco, el centro de la diana. Es la firma de la familia: "cada icono lleva un peso".
4. **Glifos utilitarios exentos:** herramientas de un solo trazo (x, chevron, check, edit, trash, search, eye) quedan monolínea, sin duotono ni punto. Son verbos, no identidad; recargarlos les quitaría legibilidad a 16px.
5. **Metáfora primero:** si el duotono o el punto compiten con el reconocimiento inmediato del icono, se sacrifican ellos, nunca la claridad (principio 1 del design system).

### Piloto (esta tarea)

Los 14 símbolos de la navegación se redibujan con el lenguaje: `i-home` (casa con ventana), `i-gastos` (recibo con total), `i-agenda` (calendario con día marcado), `i-deudas` (tarjeta con firma), `i-cuentas` (banco), `i-personales` (persona + moneda que te deben), `i-presupuesto` (velocímetro: un límite), `i-metas` (diana), `i-apartados` (caja con compartimiento reservado), `i-ahorro` (frasco con moneda), `i-inversion` (curva con área ganada), `i-analisis` (dona con segmento), `i-ajustes` (deslizadores) y `i-mas` (puntos sólidos).

Dos metáforas cambian a propósito: Límites de gasto pasa de torta a **velocímetro** (un límite es un tope, no una distribución) y Ahorro pasa de cerdito a **frasco con moneda** (el cerdito a trazo era ilegible a 22px; el frasco mantiene la metáfora de guardar y gana el punto de valor natural).

### ID.2 (2026-07-04): resto de la UI estructural

Se redibujan 8 símbolos existentes con el lenguaje (`i-saldo`, `i-recurring`, `i-lightbulb`, `i-alert`, `i-bolt`, `i-trophy`, `i-mountain`, `i-circle`, este último reinterpretado como "bola de nieve" con dos círculos, uno chico y uno grande, para la metáfora de crecimiento) y se agregan 5 símbolos nuevos: `i-star` (recomendación), `i-percent` (renegociar tasa; el propio glifo del % ya trae dos círculos, así que el "punto de valor" sale gratis de la forma), `i-trending-up` (aumentar pago/aporte), `i-info` (explicación neutra, hermano de `i-alert` con círculo en vez de triángulo) e `i-bar-chart` (bloque "Tu impacto": tres barras crecientes con punto en la más alta). `i-cuentas` (ya redibujado en ID.1) se reutiliza para "Consolidar deudas": mismo símbolo, misma metáfora (institución financiera), sin necesidad de un dibujo nuevo.

Se retiran los emojis de utilería concentrados en la card "Estrategia de pago" (💡, 💪 ×3, ✨ ×2, ℹ️, 🚨, ⚠️, 📊, 🤝, 🏦) y en el tip evergreen de Inversión (💡), todos reemplazados por `icon()`. Se agrega el modificador `.icon--sm` (14px) para iconos en línea con texto xs/sm (subtítulos, badges, selectores de alternativa), evitando que un icono de 20px domine una etiqueta pequeña.

**Quedan fuera de ID.2, deliberadamente:** un caso de `hint.textContent = ...` en `apartados/index.js` que interpola 💡 pero asigna a `textContent` (no `innerHTML`): inyectar un `<svg>` ahí se mostraría como texto crudo, no como icono. Cambiar esa asignación a `innerHTML` para ganar un icono no se justificó por el riesgo/beneficio de tocar una región `aria-live`. Tampoco se tocaron los emojis de categoría (`CATEGORIA_*_EMOJI` en `constants.js`, dominio de ID.3) ni el badge "📝 Pendiente" de Gastos ni los usos sueltos de ⚠ en otros 8 archivos: no forman parte del mismo cúmulo visual que motivó esta fase y su limpieza es un alcance propio, no una extensión mecánica de este cambio.

### ID.3 (pendiente)

Iconos de categorías (gastos, ingresos, agenda, deudas, metas) con tinte por dominio; retirar los catálogos de emoji estructurales y actualizar el guardarraíl TX.4. El destino de los emojis de celebración (logros, confetti) se decide en ID.3 con el usuario.

## Consecuencias

### Positivas

- Identidad propia y consistente: el mismo dibujo en Windows, Android e iOS, tintable por tema y por dominio.
- Cero costo de rendimiento: sprite inline estático, sin peticiones nuevas, sin JS; el crecimiento del sprite completo (~40-60 símbolos al final de ID.3) ronda los 4 KB gzip.
- El duotono por atributo atraviesa `<use>` sin CSS adicional y funciona igual en los empty states (`emptyArt()`).
- La migración es por fases con la app siempre funcional: los símbolos conservan sus ids, así que ningún consumidor (`icon()`, `emptyArt()`, HTML estático) cambia.

### Negativas / Restricciones

- Con ID.1 e ID.2 cerradas, todo símbolo de identidad (no utilitario) ya está en el lenguaje propio; los monolínea (edit, trash, x, chevron, search, eye, eye-off, check-circle, moon, sun) se quedan así para siempre por diseño (regla 4), no por migración pendiente.
- Los emojis de categorías siguen en las listas hasta ID.3; la sección de Gastos mantendrá el contraste entre nav propia y categorías emoji durante la transición.
- Redibujar iconos es trabajo de criterio visual: cada símbolo nuevo debe verificarse a 22px (nav), 16px (botones) y 48px (empty states) en ambos temas antes de entrar al sprite.
- La decisión del icono de Gastos registrada en la memoria del proyecto (serie sobria, no unificar con Compromisos/Personales) queda superada por esta ADR en su parte de "emoji vs SVG es intencional"; la parte de sobriedad se conserva como principio.

---

## Revisión v2 (2026-07-04): "trazo cálido con chispa" (ID.6)

### Motivo

Al arrancar ID.3, Esteban replanteó el sistema: el lenguaje v1 cumple pero se percibe neutro, frío y poco memorable ("iconos genéricos que podrían pertenecer a cualquier producto"). Pidió una identidad con personalidad que transmita confianza, cercanía, organización, progreso, tranquilidad, motivación y optimismo, sin sacrificar reconocimiento inmediato (la usabilidad manda sobre la creatividad).

El diagnóstico técnico del frío confirmó cuatro causas: (1) trazo 2 sobre grid 24 es el peso exacto de Lucide, el acento de miles de apps; (2) el duotono al 15 % casi desaparece en fondo oscuro, el tema por defecto; (3) el punto de valor era del mismo color que el trazo, así que la firma no se registraba; (4) cero color fuera del estado activo, con 10 colores de dominio ya definidos en tokens y desaprovechados. El estudio de mercado (Wise, Monzo, Nubank como referentes de identidad; N26 como contraejemplo de línea fina elegante pero fría) y la teoría de diseño (redondez y terminaciones redondeadas se perciben cercanas; el peso del trazo comunica presencia; el color vehicula el optimismo) respaldan la dirección elegida.

### Direcciones evaluadas

- **A "trazo cálido con chispa" (elegida):** evolución del lenguaje v1 con más peso, más redondez y la firma encendida en color.
- **B "sello sólido" (descartada):** siluetas rellenas con detalle en espacio negativo; máxima presencia, pero pesa en listas densas de 15 filas y le quita aire al tema oscuro.
- **C "insignia por dominio" (adoptada como tratamiento de superficie):** el glifo vive en una teja redondeada teñida con el color de su sección (`--fk-dom-*` al ~14 % de fondo, glifo al 100 %). No es un lenguaje aparte: es cómo se presentarán las categorías en ID.3.

### Reglas v2 (sustituyen a las reglas 1-3 del lenguaje; la 4 y la 5 siguen vigentes)

1. **Trazo 2.35 global:** el grosor vive en CSS (`.icon`), así que toda la familia (incluidos los símbolos aún no redibujados y los glifos utilitarios) gana cuerpo en un solo cambio. Escalas: `.icon--sm` 2.5, `.icon--lg` 1.8.
2. **Redondez sistemática:** esquinas y uniones muy redondeadas (radios ≥ 2.9 en contenedores, ápices con arco en vez de vértice, curvas antes que diagonales rectas). La redondez es el rasgo de cercanía.
3. **Duotono al 22 %:** la región "cuerpo" sube de `fill-opacity=".15"` a `.22` para que se vea en fondo oscuro sin competir con el trazo.
4. **La chispa:** el punto de valor pasa a `fill="var(--fk-icon-dot, currentColor)"`. El contexto la enciende declarando la variable (la navegación la pone en `--fk-accent`: item inactivo gris con chispa verde viva; las tejas de categoría la pondrán en su `--fk-dom-*`). Sin variable declarada cae a `currentColor`: cero regresión en el resto de la app y cero JS, porque las variables CSS atraviesan el shadow DOM de `<use>`.

### Piloto ID.6 y fases

Los 14 símbolos de navegación quedaron redibujados en v2. Un cambio de metáfora: Inversión pasa del zigzag con flecha a una **curva suave ascendente con la chispa en el extremo** (progreso calmado, "aquí vas hoy"); el zigzag transmitía volatilidad. En `i-mas`, el punto central es la chispa. Fases restantes: recalentar la geometría de los símbolos estructurales de ID.2 (que mientras tanto heredan el trazo 2.35) y las categorías con teja por dominio (ID.3).

### ID.3 (2026-07-05): categorías Finko v2 en tejas por dominio

Cierre de la última fase (re-cortada por el [ADR 025](025-logotipos-de-marca-y-tejas.md)). 43 símbolos nuevos `c-*` cubren las 71 claves de los 6 catálogos (`CATEGORIA_*_ICONO` en `constants.js`, que reemplazan a los `CATEGORIA_*_EMOJI`), compartiendo glifo cuando la etiqueta o la metáfora coinciden (casa, carro, libro, caja "Otro/Otra/Otros"...). Cinco categorías reusan símbolos estructurales existentes en vez de duplicar el dibujo: Vivienda/Arriendo → `i-home`, Tarjeta de crédito/Cuota de manejo → `i-deudas`, Comisión → `i-percent`, Rendimientos → `i-trending-up`, y la interna Ahorro → `i-ahorro`.

Decisiones de metáfora que registrar: Transporte es **bus** y Vehículo es **carro** (moverse vs. el activo que se compra); con el paso al sprite, Vacaciones gana **palmera** y Emprendimiento gana **cohete** (la reconciliación de emojis de MT.1 ya no las limita); el triángulo de play de `c-streaming` ES la chispa (elemento sólido en `--fk-icon-dot`, vértices agudos por regla 5, igual que la punta de `c-avion`, el diamante de `c-anillo` y el tablero de `c-birrete`); la cabeza de `c-hormiga` es su chispa (mismo patrón de `i-mas`); en `c-edificio` la chispa es "una ventana encendida".

La dirección C ("insignia por dominio") se materializa en `tejaCategoria()` (`infra/icons.js`) + `.cat-teja` (atoms.css): dentro de la teja `currentColor` ES el color del dominio, así que la chispa cae a él sin declarar `--fk-icon-dot`. Los `<select>` quedan con texto plano (un `<option>` nativo no renderiza SVG, ADR 025). El guardarraíl TX.4 compara ids de sprite y verifica que todo id exista como `<symbol>`; las plantillas de Apartados salen de TX.4 (su `icono` es emoji como dato del usuario). En Metas, `normalizarMeta` deja de almacenar el emoji de la categoría: la vista resuelve el glifo desde `CATEGORIA_META_ICONO` al renderizar (las metas viejas migran solas), y el emoji manual del usuario (categoría "Otra") se conserva como dato.

### ID.7 (2026-07-05): símbolos estructurales recalentados a v2

Los 13 símbolos de ID.2 (`saldo`, `recurring`, `lightbulb`, `alert`, `bolt`, `trophy`, `mountain`, `circle`, `star`, `percent`, `trending-up`, `info`, `bar-chart`) suben a duotono 22 % y chispa (`var(--fk-icon-dot, currentColor)`). Aplicación de la regla 5 "metáfora primero": los picos de `i-mountain` (avalancha), la punta de `i-bolt` y las 5 puntas de `i-star` se mantienen agudos a propósito, la geometría puntiaguda ES la metáfora, mismo criterio que ya dejó agudo el vértice central de la porción de `i-analisis` en el piloto ID.6. `i-saldo` y `i-star` no llevan punto de valor adicional: la propia forma (el signo peso, la estrella) ya es la firma, y sumar un punto competiría con la lectura (regla 5 también). `i-percent` enciende la chispa en sus dos círculos, ya que ambos juntos son "el punto de valor" de ese glifo (razonamiento de ID.2). `i-info` mantiene su círculo exterior sin relleno duotono, más liviano que `i-alert`: es la distinción deliberada entre una alerta (pesada) y una explicación neutra (calmada). Redondez sistemática aplicada donde había una esquina incidental de contenedor, sin tocar la silueta de la metáfora: radio de las esquinas del triángulo de `i-alert` (2 → 2.3), radio de las asas de `i-trophy` (2.5 → 2.9, coincide con el piso "≥ 2.9" de la regla 2), y esquinas de `i-bar-chart` de rx 1 a rx 2 (cápsula: la mitad exacta del ancho de la barra, extremos en semicírculo).
