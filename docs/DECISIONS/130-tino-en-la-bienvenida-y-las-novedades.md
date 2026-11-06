# ADR 130 - Tino en la bienvenida del adulto y en las novedades

**Estado:** Aceptada (2026-11-05). Pedido en chat: "vamos a aplicar los cambios de diseño propuestos empezando con la inclusión de Tino en algunos espacios de la app". Lo que propone el diseño "Finko · Identidad Bosque y sol" ya estaba aplicado (ADR 127 y 129); entre los lugares nuevos que se le propusieron, Esteban eligió dos: la bienvenida del adulto y las novedades tras actualizar.
**Fecha:** 2026-11-05
**Autores:** Esteban (pedido y elección de los lugares), Claude Opus 5.5 (candidatos, implementación y redacción)
**Relación:** **Amplía** el [ADR 127](127-identidad-bosque-y-sol.md) D6 (la tabla de dónde aparece Tino suma dos lugares) con sus mismas reglas: el dibujo original sobre su sol, decorativo, solo la primera vez o en una explicación, nunca en el uso diario. **Cambia** el hero del paso del nombre que fijó el [ADR 103](103-el-isotipo-de-finko.md) en el onboarding: el isotipo queda en "¿Quién va a usar Finko?". **Usa por primera vez** el catálogo de novedades de UPD.1, vacío desde que nació.

---

## Contexto

Con los ADR 127 y 129, Tino está en los vacíos de cada sección, la guía del usuario nuevo, las explicaciones para decidir y las celebraciones. Dos momentos que pasan una sola vez seguían sin él: la persona que entra por primera vez escribe su nombre frente al isotipo, y el modal de novedades (UPD.1) era un título y una lista. El modal, además, nunca salía: `NOVEDADES_POR_VERSION` estaba vacío.

Se propusieron cuatro candidatos y se descartaron otros cuatro por las reglas del 127 (abajo). Esteban eligió dos.

## Decisión

### D1. La bienvenida del adulto

En el paso del nombre ("¡Bienvenido a Finko!", `htmlPasoNombre()` de `ui/onboarding.js`), Tino saluda sobre su sol de 96 px, centrado sobre el título, en el lugar de la teja del isotipo. Es lo primero que la persona ve de la app por dentro. El isotipo sigue en la pantalla anterior, "¿Quién va a usar Finko?", que es la de la marca. El texto no cambia: "Hola, soy Tino" lo dice la guía de Inicio, que viene justo después.

### D2. Las novedades tras actualizar

El modal "Novedades de esta actualización" (`ui/novedades.js`) lleva a Tino explicando, sol de 88 px, centrado arriba del título (`.modal--novedades`). Sale una vez por versión con novedades: quien ya la vio no la vuelve a ver, y un usuario nuevo arranca al día (UPD.1).

### D3. La primera entrada del catálogo

`NOVEDADES_POR_VERSION` estrena la clave 672 (el `CACHE_NAME` de esta versión) con "Finko estrena imagen": la paleta del logo, la tarjeta de cada sección y Tino. Quien ya usaba Finko la ve una vez al abrir la versión nueva; sin esta entrada, D2 no se vería nunca.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Tino en el candado o en "¿Quién usa Finko?" | se ven cada vez que se abre la app: es el uso diario que el 127 D6 excluye |
| Tino en la aceptación legal | un documento que se acepta pide tono serio, sin personaje |
| Tino al restaurar un respaldo | el 127 D6 lo excluye por nombre |
| Tino tranquilo en "Todo al día" de "Esta semana" | saldría en la misma pantalla que el tranquilo de "Nada que atender hoy" (129 D3) |
| Tino en lugar del isotipo también en "¿Quién va a usar Finko?" | esa pantalla la ve también el niño, que conoce a Tino por su sprite (095); y la marca necesita un lugar en la primera pantalla |
| Novedades sin entrada, solo con Tino listo | el modal no saldría: el cambio quedaría sin verse |

Quedaron propuestos y sin elegir, para otra decisión: Tino en Ingresos sin ningún ingreso (Mis cuentas) y en el aviso de instalar la app.

## Consecuencias

- Tino aparece en dos momentos más, los dos de una sola vez. No se agregan dibujos: `tino-saluda` y `tino-explica` ya estaban precacheados.
- Quien ya usaba Finko ve las novedades una vez al abrir la versión 672. Dos pruebas de `constants.test.js` suponían el catálogo vacío; ahora lo vacían ellas mismas y lo devuelven.
- El texto de la entrada 672 es contenido nuevo: si se quiere otra redacción, se cambia en `core/constants.js` sin tocar nada más.
