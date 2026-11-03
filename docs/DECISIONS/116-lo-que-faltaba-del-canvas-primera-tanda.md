# ADR 116 - Lo que faltaba del canvas, primera tanda

**Estado:** Aceptada (2026-11-03). Pedido en chat: "lo que queda faltando en los HTML de la carpeta que te pasé y aplicar commit y push a lo que todavía le falta". Una auditoría independiente de los 13 tableros del canvas "Finko móvil: rediseño integral" contra el código encontró 22 propuestas sin hacer o a medias, aunque los registros daban el plan por cerrado: casi todas eran hallazgos de la auditoría o detalles de los prototipos que nunca tuvieron un ID MV2. Esteban decidió aplicarlas "tal cual como propone el HTML", también las que acotan decisiones aprobadas. Este ADR cubre la primera tanda: las once piezas pequeñas que no chocan con ninguna decisión.
**Fecha:** 2026-11-03
**Autores:** Esteban (diseño y decisión), Claude Opus 5.5 (auditoría, implementación y redacción)
**Relación:** tarjeta **MV2.3** (las cinco tandas que siguen). **Cierra** dos pendientes de decisiones aceptadas: el [ADR 099](099-inicio-movil-hoy-en-una-lista.md) dejó la máscara del ojo en Inicio para "cuando el ojo suba al encabezado", y el [ADR 107](107-el-peso-de-cada-cosa.md) D2 pedía "Aportar $X" donde la sección sabe el monto. **Aplica** el [ADR 023](023-lenguaje-de-iconografia-propio.md) (iconografía propia), R4 (44 px táctiles), R73 (la pregunta de la modalidad) y el ADR 107 D4 (sin filete lateral). **Aplica** la regla 3 del [ADR 060](060-lectura-cross-domain-de-solo-lectura.md): el cálculo del fondo sube a infra porque lo leen tres dominios.

---

## Contexto

| Hallazgo del canvas | Lo que había |
|---|---|
| N7: desde Calendario se llega a la lista y no al pago | "Ver en Por pagar" filtraba y desplazaba, pero nada marcaba la tarjeta pedida entre 20 |
| ADR 099, pendiente | los montos de "Atención hoy" (fila y hoja) y de los paneles de Inicio no obedecían al ojo |
| ADR 107 D2, pendiente | Metas decía "Aportar" sin el monto; Reservas sí lo decía |
| Recorrido 4 (R73) | la pregunta de cada modalidad ("Algún día, cuando quieras") solo estaba en la portada de Ahorro |
| AH4 | Metas no decía que el fondo de emergencia estaba incompleto |
| V1 | quedaban filetes laterales en los errores de formulario, los avisos emergentes, el aviso de versión, los patrones de Análisis y la nota de instalar en iOS |
| A2 | "Ver en Me deben", "Ajustes, Datos de renta" o "Ajustar" medían de 15 a 21 px de alto |
| Recorrido 1 | registrar un ingreso puntual solo lo anunciaba al lector de pantalla |
| Fase 12 | "+ Fuente fija" crea una regla y era un botón secundario de 36 px |
| C2 | Distribuir usaba 📦 🎯 💰 junto a los nombres de los grupos |

## Decisión

### D1. La tarjeta pedida se marca al llegar

Al llegar a Por pagar desde Calendario, la tarjeta del compromiso destella con el resaltado de fila nueva (`resaltarFilaNueva`), cuando ya terminó de desplazarse.

### D2. El ojo tapa los montos de Inicio

La fila y la hoja de "Atención hoy" y los paneles de Inicio ("Esta semana", lo vencido, lo pendiente) enmascaran sus montos con el ojo. Los conteos y las fechas no se tapan (R20).

### D3. "Aportar $X" en Metas

Con plan de aportes, el botón dice cuánto, como Reservas. Con el ojo puesto, solo "Aportar".

### D4. La pregunta de la modalidad bajo el título

Fondo: "Ojalá nunca lo uses". Reservas: "En una fecha que no elegiste". Metas: "Algún día, cuando quieras". Inversión: "Además, creciendo". Son las mismas frases de su carril en la portada.

### D5. El fondo incompleto, en media línea sobre Metas

"Tu fondo de emergencia va en 1 mes y 2 semanas de 3. Conviene completarlo primero. Ir al fondo", o, sin fondo, "Todavía no tienes fondo de emergencia. Conviene empezar por él." Con el fondo completo no hay línea. `gastosFijosMensuales`, `mesesEnPalabras` y `coberturaFondo` pasan a `infra/bolsas.js`; Ahorro y Aprende exportan las mismas funciones con sus nombres de siempre.

### D6. Ningún filete lateral

El nivel lo dicen el ícono, el tinte y el borde completo. La cita de los documentos legales conserva su raya: es tipografía de cita, no un aviso.

### D7. Los enlaces de texto, con zona de 44 px

Bajo 1024 px, `.link` y "Ajustar" de Límites agrandan su zona sensible con un pseudo-elemento centrado, sin cambiar el texto.

### D8. Registrar un ingreso dice a qué cuenta entró

Un aviso visible: "Ingreso de $X" y "Entró a Nequi: ahora tiene $Y", con la máscara del ojo.

### D9. "+ Fuente fija" es tonal y de 44 px

Misma receta que crear en los encabezados (ADR 106 D4).

### D10. Distribuir sin emoji

Los nombres de los grupos van solos, como en el prototipo.

## Alternativas descartadas

- **Copiar el cálculo del fondo en Metas.** Ya había dos copias; la tercera es la que la regla 3 del ADR 060 manda a infra.
- **Hacer las 22 piezas en un solo cambio.** Mezclaba lo pequeño con cinco piezas que acotan decisiones y dejaba un solo punto de verificación.

## Consecuencias

### Positivas

- Las dos promesas de los ADR 099 y 107 se cumplen.
- Una sola copia del cálculo del fondo para tres lectores.

### Negativas / Restricciones

- Un enlace `.link` que necesite su propio `::after` bajo 1024 px tiene que respetar la zona táctil.
- Las cinco tandas que siguen acotan decisiones aprobadas (R89a, ADR 036 y 074, 098 D4, 104 y 111) y llevan su propio ADR.
