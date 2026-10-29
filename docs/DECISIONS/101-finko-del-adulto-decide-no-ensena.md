# ADR 101 - Finko del adulto ayuda a decidir; no enseña con lecciones

**Estado:** Aceptada (2026-10-29). Pedido en chat: "en la versión de adultos no veo necesidad de tener un sitio de aprende y otro de tu progreso, además de accesos rápidos [...] la app de Finko no puede verse como algo educativo sino como un sitio para manejar mis finanzas, la idea es que Finko ayude a tomar mejores decisiones no que le realice preguntas a la persona". Triado en la misma conversación; el usuario eligió retirar Aprende y Tu progreso del adulto conservando los datos, registrar la ayuda para decidir como tarjeta (DEC.1) y reescribir o borrar las pruebas de lo retirado.
**Fecha:** 2026-10-29
**Autores:** Esteban (pedido y decisiones), Claude Opus 5.5 (triaje y redacción)
**Relación:** **Retira del adulto** la capa de aprendizaje del [ADR 092](092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) (Propuesta): D1 (Inicio como bloque de tres lentes), D2 (Aprende y Tu progreso en la barra lateral), D4 (la lente Tu progreso), D5 ("Tu siguiente paso") y D6 (la sección ofrece su lección). **Retira** la vitrina y los avisos de logro del [ADR 032](032-logros-v2-niveles-y-habitos.md) (los logros se siguen calculando y guardando). **Revierte** el [ADR 087](087-inicio-en-movil-tambien-avisa-y-no-resume.md) D3 y el IN.4a: Accesos rápidos sale de Inicio. **No toca** al niño: su Aprender, su ruta, sus lecciones y su ubicación usan el mismo motor ([ADR 093](093-perfiles-en-el-dispositivo-y-modo-nino.md), [ADR 100](100-el-nino-empieza-solo.md)), que se queda.

---

## Contexto

Lo que el adulto veía con la capa de aprendizaje:

| Pieza | Dónde |
|---|---|
| Franja de lentes "Hoy, Aprende, Tu progreso" | Inicio, bajo 1024 px |
| "Tu siguiente paso" ("Empezar lección") | Inicio |
| Aprende: ruta de lecciones con preguntas | barra lateral en escritorio, lente en móvil |
| Oferta de lección dentro de una sección ("Entiende tu fondo") | Fondo de emergencia |
| Tu progreso (nivel, lo que sabes, logros) y avisos "N logros nuevos" | barra lateral, lente y avisos emergentes |
| Accesos rápidos y "Personalizar" | cierre de Inicio en móvil |

El pedido es de producto, no de diseño: Finko del adulto es un sitio para manejar el dinero. Las lecciones con preguntas lo hacen parecer un curso, y los accesos repiten lo que ya hacen la barra inferior, "Más" y las filas de "Atención hoy" (ADR 099).

## Decisión

### D1. Inicio del adulto es una sola pantalla

Sin franja de lentes, sin "Tu siguiente paso" y sin Accesos rápidos. El número de avisos ya lo dicen "Atención hoy" y su "Ver los N" (ADR 099 D3).

### D2. Aprende y Tu progreso salen de la app del adulto

Salen sus secciones, sus entradas en la barra lateral, la oferta del Fondo y los avisos de logro. `#aprende` y `#progreso` llevan a Inicio, para que un enlace viejo no quede en blanco.

### D3. Los datos se quedan

`S.aprende` del adulto, `S.logros` y `S.config.accesosInicio` no se tocan: sin migración. Los logros se siguen calculando y guardando en silencio. Si algún día algo de esto vuelve, vuelve con su historia.

### D4. El motor de lecciones se queda, para el niño

El niño abre sus lecciones con la misma acción y el mismo modal. Lo que solo pintaba para el adulto (su ruta, "Tu siguiente paso", la oferta, la vitrina de logros, la franja de lentes y los accesos) queda en el código sin pantalla, igual que sus lecciones; se borra cuando se decida.

### D5. Lo que sigue: Finko explica el porqué dentro de cada decisión (DEC.1)

El conocimiento útil vuelve donde se decide, sin preguntas: al repartir el ingreso, al elegir qué deuda pagar primero, al pasarse de un límite. Tarjeta DEC.1, cada lugar con su diseño.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Dejar Aprende como guías en "Más" | el usuario eligió retirarlo; una sección de lectura sigue siendo un curso dentro de la app |
| Dejar los logros dentro de Análisis | Análisis interpreta el dinero; un nivel y unas insignias son de la persona, y eso es lo que se retira |
| Borrar ya el código y las lecciones del adulto | borrar archivos se confirma aparte (CLAUDE.md); sin pantalla no cuesta nada al usuario |
| Quitar también el motor de lecciones | es la app del niño (ADR 093) |

## Consecuencias

### Positivas

- Inicio del adulto queda con una sola pregunta: qué atender hoy y qué viene esta semana.
- La barra lateral pierde dos entradas que no eran del dinero.

### Negativas / Restricciones

- Los atajos que alguien personalizó dejan de verse; sus secciones siguen a un toque en la barra o en "Más".
- Queda código sin pantalla (ruta del adulto, vitrina, accesos, franja de lentes) hasta que se decida borrarlo.
- Las lecciones del adulto pierden su revisión pedagógica pendiente (APR.2c): ya no se ven.
