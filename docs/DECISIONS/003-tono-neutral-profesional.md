# ADR 003 - Tono de voz neutral y profesional (refinamiento de la regla 11)

**Estado:** Aceptada
**Fecha:** 2026-06-06
**Autores:** Esteban (producto), Claude Opus 4.8 (implementación)

---

## Contexto

La regla 11 del ADN (`CLAUDE.md`) decía: "Lenguaje humano: 'Tu plata' antes que 'Saldo disponible'". Bajo esa regla, la copy adoptó un tono muy colombiano e informal: la palabra "plata", voseo en los verbos ("agregá", "tenés", "podés", "registrá") y varios coloquialismos.

Con el uso real, el dueño de producto notó que ese tono, en algunos casos, le resta seriedad y confianza al producto. El objetivo del proyecto es que la app sea usable por cualquier persona, de cualquier edad (adultos y niños) y sin conocimientos financieros previos.

Alternativas consideradas para la voz:

1. **Tú** ("Agrega tu cuenta", "Tu dinero disponible hoy") - opción elegida.
2. **Usted** ("Agregue su cuenta", "Su dinero disponible hoy") - más formal, pero distante y frío para un público que incluye niños.
3. **Neutral impersonal** ("Agregar cuenta", "Dinero disponible hoy") - profesional pero guía menos y se siente como etiquetas de sistema.

---

## Decisión

**Se refina la regla 11: el lenguaje sigue siendo humano y sin jerga, pero pasa de "muy colombiano/informal" a "neutral, claro y profesional".**

Reglas concretas:

1. **"plata" → "dinero"** en toda la copy de UI. (Excepción: datos del usuario y nombres propios como "Daviplata".)
2. **Voz "tú" (tuteo)**, no voseo ni usted. Verbos: "agrega", "tienes", "puedes", "registra", "elige", "define" (no "agregá", "tenés", "podés").
3. **Español neutro pan-hispano:** se evitan coloquialismos marcados. Se conservan términos-producto reales que el usuario reconoce (ej: "gota a gota", nombre real del préstamo informal en Colombia).
4. **Sin jerga financiera** (se mantiene lo ya hecho: nada de "patrimonio neto", "Balance del mes", etc.).
5. **Cada texto guía:** dice qué información se muestra, qué acción tomar y qué beneficio se obtiene.

El espíritu original de la regla 11 (lenguaje humano, accesible, sin jerga) se mantiene intacto. Solo cambia la ejecución: de informal-regional a neutral-profesional.

---

## Justificación

### 1. Accesible para todas las edades

El tuteo es cercano sin ser informal. Un niño y un adulto lo entienden por igual. El usted se siente distante; el voseo es regional y puede confundir fuera de ciertas zonas.

### 2. Confianza y profesionalismo

"Dinero" en vez de "plata" y verbos neutros transmiten seriedad sin caer en lo bancario-corporativo. La app inspira confianza para manejar finanzas personales.

### 3. Alcance pan-hispano

El español neutro con tuteo es el estándar de las apps modernas de producto en Latinoamérica y España. No ata el producto a una región.

### 4. Coherencia con la propuesta de valor

El objetivo sigue siendo que cualquier persona entienda la app desde el primer momento. El tono neutral-profesional sirve mejor a ese objetivo que el regional-informal.

---

## Consecuencias

### Positivas

- Producto percibido como más serio y confiable.
- Copy entendible para cualquier edad y región hispanohablante.
- Se mantiene la simplicidad y la ausencia de jerga.

### Negativas / Restricciones

- Overhaul de copy transversal (~75 textos en ~15 archivos).
  - *Mitigación:* se aplica por lotes verificables (chrome estático primero, luego dominios), una superficie a la vez.
- La regla 11 de `CLAUDE.md` se actualiza para reflejar el nuevo tono.
- Riesgo de inconsistencia temporal entre lotes.
  - *Mitigación:* cada lote se verifica en la app y se commitea; la "plata → dinero" se hace de una para evitar mezcla.

---

## Guía rápida de aplicación

| Antes | Después |
|---|---|
| Tu plata disponible hoy | Tu dinero disponible hoy |
| ¿Dónde tenés tu plata? | ¿Dónde tienes tu dinero? |
| Agregá tus cuentas | Agrega tus cuentas |
| ¿Cuánto debés en total? | ¿Cuánto debes en total? |
| Registrá los préstamos | Registra los préstamos |
| Anotá cada compra | Anota cada compra |
| Elegí una cuenta | Elige una cuenta |
| Podés ajustarlo | Puedes ajustarlo |
