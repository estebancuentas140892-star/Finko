# ADR 100 - El niño empieza solo: Finko pregunta quién lo va a usar

**Estado:** Aceptada (2026-10-29). Pedido en chat: "cuando la persona vaya a crear su usuario le pregunte si es adulto o niño [...] la idea es no poner muchos obstáculos al niño para descargar la app [...] quiero que Finko sea una app que lo eduque y que no ponga tantos obstáculos para que este la manipule". Triado en la misma conversación; el usuario eligió el paso legal de un toque, las edades de 7 a 12 y la salida "Este teléfono es de un adulto" con confirmación.
**Fecha:** 2026-10-29
**Autores:** Esteban (pedido y decisiones), Claude Opus 5.5 (triaje, diseño y redacción)
**Relación:** iniciativa APR (Aprende y aplícalo). **Acota** el [ADR 093](093-perfiles-en-el-dispositivo-y-modo-nino.md) D1: el niño ya no necesita que un adulto lo cree para empezar, solo para lo que es del adulto (mesada, premio, copia en la nube). **Acota** la aceptación obligatoria del paquete legal (LEG.2) solo en el camino del niño: un toque honesto en vez de una casilla de contrato. **Respeta** el resto del ADR 093 (de 7 a 12 años; el niño no ve deudas, tarjetas, impuestos, cuentas bancarias ni exportar; el modo niño es una clase, D5; su voz, D6), el [ADR 096](096-finko-en-la-nube-con-supabase.md) y NUBE.3 (el código de la familia sigue igual) y los documentos legales, que no cambian: los términos ya piden que un menor use Finko con el conocimiento de su madre, padre o representante (sección 5).

---

## Contexto

Hoy un niño que descarga Finko solo cae en el formulario de un adulto: "¿cómo te llamas?", después tres documentos legales con una casilla de contrato, y después una app con deudas, tarjetas e impuestos. Para llegar a su propia app (Tino, la alcancía, las lecciones) necesita que un adulto lo cree desde Familia, con PIN, o que un adulto con cuenta en la nube le dé un código. La nube está en prueba, solo para correos invitados.

Lo que ya existe y hace viable un teléfono solo del niño:

- **El niño anota su dinero** (ADR 093 D9): lo que entra, sale o se mueve entre sus frascos, sin el adulto.
- **Aprende y las metas** funcionan sin adulto.
- **El teléfono propio del niño** (`S.config.dispositivoNino`, NUBE.3): entra directo a su perfil y no ofrece "Cambiar de perfil". Hoy solo se llega con el código.

## Decisión

Dos rebanadas: **APR.6a** (D1 a D4) y **APR.6b** (D5).

### D1. La primera pantalla pregunta quién va a usar Finko

Tres opciones grandes: **"Soy adulto"** (el camino de siempre: nombre y documentos), **"Soy niño o niña"** y **"Tengo un código de mi familia"** (NUBE.3, que sale del paso del nombre y sube acá). Al adulto le cuesta un toque más; lo justifica que, sin preguntar, el niño entra por la puerta equivocada.

### D2. El camino del niño: tres pantallas, una decisión en cada una

En su voz (ADR 093 D6):

1. **Cómo te llamas y cuántos años tienes**: el nombre y la edad con botones grandes de 7 a 12. "Tengo 13 años o más" lleva al camino del adulto, que los términos ya permiten con acompañamiento.
2. **Tu dibujo**: el mismo catálogo de Familia (ADR 093 D8, sin fotos).
3. **Antes de empezar** (D3).

Ni PIN, ni correo, ni cuenta, ni internet.

### D3. El paso legal del niño es un toque honesto

"Finko es para aprender a cuidar tu dinero. Úsalo con alguien de tu familia", con un botón: **"Un adulto de mi familia sabe que uso Finko"**. Los documentos quedan enlazados debajo, para el adulto.

Se registra en `S.config.legalAceptado` con `via: 'nino'`: es un aviso dado por el niño, no un contrato aceptado. La aceptación de verdad la da un adulto cuando aparece (D5, o el código de NUBE.3, que ya la registra al autorizar). Los documentos no cambian.

### D4. El teléfono queda como teléfono propio del niño

El mismo modo de NUBE.3 (`dispositivoNino`): sin adulto, sin PIN, sin nube. Todo lo que el niño hace se queda en el teléfono. Como no hay un tutor nombrado, el perfil dice "Tu familia" donde diría "Papá" o "Mamá" (`teNombra`). La mesada, el premio y la copia en la nube llegan solo si aparece un adulto.

### D5. "Este teléfono es de un adulto" (APR.6b)

Un enlace discreto en la pestaña "Yo" del niño, con confirmación. Crea el adulto con su nombre, su PIN (el ADR 093 D1 exige candado con niños en el dispositivo) y la aceptación completa de los documentos. El niño queda como perfil de ese adulto, con todo lo que tenía.

Nada se guarda hasta aceptar los documentos: "Volver" deja el teléfono como estaba. Al terminar entra el adulto, que acaba de crear su PIN, y al volver a abrir Finko aparece "¿Quién usa Finko?". No se ofrece en un teléfono del niño unido a la nube de su familia (NUBE.3): ahí el adulto ya existe en su propio teléfono y lo maneja desde Familia.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Un botón "Soy niño" dentro del paso del nombre | se pierde en una pantalla escrita para adultos; un niño que todavía lee despacio no lo encuentra |
| Pedir el PIN o el correo de un adulto para empezar | es exactamente el obstáculo que el pedido quiere quitar |
| Sin paso legal en el camino del niño | el teléfono quedaría sin ningún registro de que un adulto sabe; el toque cuesta un segundo y lo deja dicho |
| Camino del niño para cualquier menor | las lecciones y la voz del niño están escritas para 7 a 12 (ADR 093 D1 y D6) |
| Salir del modo niño solo con el código de la familia | obliga a un adulto con cuenta en la nube, que hoy es una prueba con invitados |

## Consecuencias

### Positivas

- Un niño llega a su app en tres pantallas, sin depender de nadie para empezar.
- El adulto que quiere acompañar puede llegar después, por el código o desde el mismo teléfono (D5).

### Negativas / Restricciones

- Al adulto le cuesta un toque más en la primera pantalla.
- Un teléfono solo del niño no tiene mesada ni premio hasta que aparezca un adulto.
- Finko no puede saber si de verdad un adulto lo sabe: el toque lo deja dicho, no lo verifica. Es coherente con un producto sin servidor que no recolecta datos (política de privacidad, sección 7).
