# ADR 023 - Lenguaje de iconografía propio (duotono + punto de valor)

**Estado:** Aceptada
**Fecha:** 2026-07-04
**Autores:** Claude Fable 5 (análisis y decisión, revisión visual aprobada por Esteban)
**Resuelve:** ID.1 (identidad visual: sistema de iconografía). Revisa parcialmente la decisión de ARCHITECTURE.md sección 8.1 (iconografía híbrida emoji/SVG).

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

### Fases siguientes (fuera de esta ADR)

- **ID.2:** extender la familia al resto de la UI estructural (símbolos de acciones y títulos; retirar emojis de utilería como 💡 y 🟨).
- **ID.3:** iconos de categorías (gastos, ingresos, agenda, deudas, metas) con tinte por dominio; retirar los catálogos de emoji estructurales y actualizar el guardarraíl TX.4. El destino de los emojis de celebración (logros, confetti) se decide en ID.3 con el usuario.

## Consecuencias

### Positivas

- Identidad propia y consistente: el mismo dibujo en Windows, Android e iOS, tintable por tema y por dominio.
- Cero costo de rendimiento: sprite inline estático, sin peticiones nuevas, sin JS; el crecimiento del sprite completo (~40-60 símbolos al final de ID.3) ronda los 4 KB gzip.
- El duotono por atributo atraviesa `<use>` sin CSS adicional y funciona igual en los empty states (`emptyArt()`).
- La migración es por fases con la app siempre funcional: los símbolos conservan sus ids, así que ningún consumidor (`icon()`, `emptyArt()`, HTML estático) cambia.

### Negativas / Restricciones

- Durante ID.1-ID.2 conviven símbolos redibujados y símbolos estilo Lucide: la diferencia es sutil (mismo trazo) pero existe hasta cerrar ID.2.
- Los emojis de categorías siguen en las listas hasta ID.3; la sección de Gastos mantendrá el contraste entre nav propia y categorías emoji durante la transición.
- Redibujar iconos es trabajo de criterio visual: cada símbolo nuevo debe verificarse a 22px (nav), 16px (botones) y 48px (empty states) en ambos temas antes de entrar al sprite.
- La decisión del icono de Gastos registrada en la memoria del proyecto (serie sobria, no unificar con Compromisos/Personales) queda superada por esta ADR en su parte de "emoji vs SVG es intencional"; la parte de sobriedad se conserva como principio.
