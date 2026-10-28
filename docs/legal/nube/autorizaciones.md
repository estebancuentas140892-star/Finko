# Textos de autorización en la app (borrador)

**Versión:** 0.2 (borrador para la nube, pendiente de revisión jurídica)
**Fecha:** 2026-10-27
**Uso:** el texto exacto que la app muestra en cada momento en que pide una autorización (Ley 1581, artículos 9 y 12; Decreto 1377 de 2013). Cada aceptación se guarda con versión, fecha y, para un niño, quién autorizó. Voz del adulto: ADN 11. Voz del niño: [ADR 093](../../DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md) D6.

---

## 1. Crear la cuenta (adulto, NUBE.1)

**Título:** Guarda tus datos en la nube

**Texto:** Con una cuenta, Finko guarda una copia de tus datos para que los veas en todos tus dispositivos y no los pierdas si cambias de teléfono. Tu dispositivo sigue teniendo todo. No usamos tus datos para publicidad ni los vendemos.

**Casilla (obligatoria, sin marcar de entrada):** Autorizo a `[PENDIENTE: responsable]` a tratar mis datos de la cuenta y la información financiera que registre, para guardarla, sincronizarla entre mis dispositivos y recuperarla, según la [Política de tratamiento de datos personales](tratamiento-de-datos-personales.md). Sé que puedo consultar, corregir y borrar mis datos y revocar esta autorización cuando quiera.

**Botones:** Crear cuenta · Seguir sin cuenta

## 2. Vincular a un niño (padre, madre o representante legal, NUBE.3)

Implementado el 2026-10-27 en Familia, "Su teléfono" (`htmlVincularNino()`); mientras no haya responsable definido, la app dice "Finko" donde va `[PENDIENTE: responsable]`.

**Título:** Autoriza los datos de `{nombre}`

**Texto:** Para que `{nombre}` use Finko en su propio teléfono y tú veas su avance desde el tuyo, guardamos en la nube su nombre o apodo, su edad, su dibujo, sus frascos, su meta, su mesada y sus lecciones. Nunca su correo, teléfono, documento, fotos ni ubicación. Solo tú ves sus datos.

**Casillas (las dos obligatorias, sin marcar de entrada):**

- Soy padre, madre o representante legal de `{nombre}` y autorizo a `[PENDIENTE: responsable]` a tratar sus datos para estas finalidades, en su interés superior, según la [Política de tratamiento de datos personales](tratamiento-de-datos-personales.md).
- Le conté a `{nombre}` qué es Finko y qué se guarda, y tuve en cuenta su opinión.

**Botones:** Autorizar y vincular · Ahora no

## 3. Lo que ve el niño al entrar en su teléfono (NUBE.3)

**Texto:** Tu `{teNombra}` puede ver tus frascos y tus lecciones desde su teléfono. Nadie más los ve.

`{teNombra}` es cómo el niño nombra al adulto ("papá", "mamá"), en minúscula.

**Botón:** Entendido

## 4. Revocar y borrar

- **Niño (en Familia):** Dejar de guardar los datos de `{nombre}` en la nube. Se borran de la nube y su teléfono deja de sincronizar. En tu teléfono puedes conservarlos o borrarlos. Botones: Borrar de la nube · Cancelar.
- **Cuenta (en Ajustes):** Borrar mi cuenta. Se borra la copia en la nube, también la de tus niños. Lo de este dispositivo se queda hasta que lo borres aquí. Para confirmar, escribe BORRAR. Botones: Borrar mi cuenta · Cancelar.

## 5. Registro de cada autorización

Se guarda en la nube, ligado a la cuenta: el texto aceptado (versión), la fecha y hora, el dispositivo desde el que se aceptó y, para cada niño, la cuenta que lo autorizó. Es la prueba que el titular puede pedir (artículo 8, literal b, Ley 1581).
