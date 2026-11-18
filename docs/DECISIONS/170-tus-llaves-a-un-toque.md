# ADR 170 - Tus llaves a un toque: copiar, los tipos de Bre-B y varias por cuenta

**Estado:** Aceptada (2026-11-18). Pedido "Revisión de servicios, categorías y movimientos", punto 9, parte 9a: consultar y copiar rápido las llaves, cuentas y números propios sin convertir a Finko en un banco. La propuesta salió de esa revisión y se aprobó en chat el mismo día: "Sí, sigue con 9a".
**Fecha:** 2026-11-18
**Autores:** el pedido de revisión (producto), Claude Opus 5.5 (investigación, análisis del modelo y diseño)
**Relación:** **Cambia** MC.14 (los datos de transferencia de una cuenta, 2026-07-11, sin ADR propio; ficha [`contexto/mis-cuentas.md`](../contexto/mis-cuentas.md)): `TIPOS_LLAVE`, una sola llave por cuenta y el campo Alias. **Amplía** la hoja de la cuenta del [ADR 135](135-mis-cuentas-y-me-deben-en-el-telefono.md) D4 (su fila "Para recibir") y el ojo de la sección del [ADR 166](166-un-ojo-por-seccion.md). Sigue la migración por renombre del [ADR 167](167-gastos-fijos-categorias-de-colombia.md) D4 y los mensajes de error del [ADR 142](142-formularios-por-tarea.md). La parte 9b (el dato de pago de otra persona dentro del gasto fijo) queda para su propio ADR.

---

## Contexto

**Lo que hay (MC.14).** Cada cuenta guarda, si el usuario quiere, `datosTransferencia`: el número de cuenta, **una** llave con su tipo (Celular, Correo, Documento, Alfanumérico, Otro) y un alias, cuyo ejemplo en el formulario es "@mi-alias". La hoja de la cuenta muestra un solo dato en "Para recibir" y la tarjeta de escritorio, un chip. **No hay un botón de copiar en ninguna parte de la app**: para pasarle la llave a alguien hay que leerla y teclearla.

**Bre-B** (Banco de la República, desde el 6 de octubre de 2025; más de 110 millones de llaves al primer año):

- Llaves: documento (cédula, cédula de extranjería, NUIP, NIT o pasaporte), celular (10 dígitos que empiezan por 3), correo, alfanumérica (empieza por `@` y la genera la entidad) y código de comercio (solo negocios).
- Cada llave lleva a una sola cuenta. Una cuenta puede tener varias llaves; cada entidad fija un máximo (algunas, 7).

**Dos hallazgos:**

1. El "alias" de MC.14 es la llave alfanumérica de Bre-B con otro nombre.
2. Para qué se usa el dato: dictarlo o pegarlo cuando alguien te va a consignar, y encontrar la llave de tu otra cuenta cuando te transfieres. El gesto que falta es copiar.

---

## Decisión

### D1. Una cuenta guarda varias llaves

`datosTransferencia.llaves`, una lista de `{ tipo, valor }`, reemplaza a `llave` y `tipoLlave`. Hasta 7 por cuenta, el tope que usan algunas entidades. `numeroCuenta` se queda, uno por cuenta. Sin llaves ni número, `datosTransferencia` es `null`, como hoy.

### D2. Los tipos son los de Bre-B

`TIPOS_LLAVE`, en este orden: **Celular, Documento, Correo, Alfanumérica, Otro**. "Alfanumérico" pasa a "Alfanumérica" (es la llave). El código de comercio va en Otro: Finko es de personas. Se sigue guardando el texto del tipo, como en `TIPOS_CUENTA` y las categorías.

### D3. El formato se revisa al escribir la llave

| Tipo | Se acepta | Se guarda |
|---|---|---|
| Celular | 10 dígitos que empiezan por 3, con o sin espacios | solo los dígitos |
| Documento | de 5 a 15 números o letras, con o sin puntos | sin puntos ni espacios |
| Correo | un correo válido | en minúsculas |
| Alfanumérica | empieza por `@` y sigue con letras o números | tal cual |
| Otro | cualquier texto | tal cual |

Además:

- **La misma llave dos veces no:** ni en la misma cuenta ni en dos. "Esa llave ya está en Nequi. En Bre-B una llave lleva a una sola cuenta."
- **Una tarjeta no:** un número de 15 o 16 dígitos que pasa la prueba de Luhn (la de las tarjetas) se rechaza en cualquier campo: "Eso parece el número de una tarjeta. Finko no lo guarda." La nota del formulario que ya dice que Finko no pide contraseñas ni claves se conserva.
- El formato se pide solo a la llave que se escribe o se cambia. Una llave vieja que no lo cumple no bloquea editar el saldo ni el nombre de la cuenta.

### D4. Copiar

En la hoja de la cuenta, "Para recibir" lista cada llave y el número de cuenta, cada uno con su botón **Copiar**. Copia el valor completo y sin formato (los 10 dígitos del celular, sin espacios: es lo que piden los campos de los bancos) y confirma con el toast de siempre: "Copiaste tu llave de celular de Nequi". En escritorio, el chip de la tarjeta copia la llave que muestra.

Es el primer "copiar" de la app: un helper nuevo, `infra/portapapeles.js`, con la Clipboard API y un respaldo para el navegador que no la tenga. Si nada funciona, el toast lo dice y el dato queda a la vista para copiarlo a mano.

### D5. Lo que se ve y lo que no

- **Celular, correo y alfanumérica se ven completos.** Son las que uno comparte, y verlas confirma que es la correcta. El celular se ve con espacios (`300 123 4567`).
- **Documento y número de cuenta se ven enmascarados** (`•••• 4567`). Tocar el dato lo muestra completo hasta cerrar la hoja. Copiar no necesita mostrarlo.
- **Con el ojo de Mis cuentas cerrado** (ADR 166), todas se enmascaran. Copiar sigue funcionando.

### D6. El formulario

El interruptor "Guardar los datos que compartes cuando alguien te va a consignar" se queda. Debajo: el número de cuenta y la lista de llaves, cada una con su tipo (chips) y su valor, con "Agregar otra llave" mientras haya menos de 7 y un botón para quitar cada una. En el teléfono va al resumen de "Nueva cuenta", como ya lo dejó FORM.2f. **Sale el campo Alias** (D7).

### D7. Lo que ya está guardado

En el siguiente bump de schema (el [ADR 169](169-un-avance-no-es-un-gasto.md) tomó la v56; el que se implemente primero toma la siguiente):

- `llave` y `tipoLlave` pasan a ser la primera entrada de `llaves`. Un tipo vacío (caso defensivo de MC.14) queda como Otro.
- `tipoLlave` "Alfanumérico" pasa a "Alfanumérica".
- Un `alias` que empieza por `@` pasa a llave Alfanumérica; cualquier otro alias, a llave Otro. Si repite una llave que ya está, no se duplica.
- Nada se borra: todo queda visible y editable, y lo que no cumpla el formato de D3 se conserva como está.

### D8. Lo que queda fuera

- **Los datos de otras personas** (el arrendador, el conjunto): parte 9b, su propio ADR.
- **Me deben:** no tiene un mensaje de cobro donde pegar la llave. Si llega a tenerlo, usa el mismo helper.
- **Abrir la app del banco, armar enlaces de pago o generar el QR de Bre-B:** son instrumentos de pago. Copiar es el límite.

---

## Rebanadas

| Rebanada | Qué entrega |
|---|---|
| MC.19a | D1 a D3 y D7: el modelo de varias llaves, los tipos, la validación por tipo, las dos reglas de rechazo y la migración. Sin pantalla nueva: la hoja muestra la primera llave como hoy |
| MC.19b | D4 a D6: Copiar con `infra/portapapeles.js`, el enmascarado, el ojo y el formulario de varias llaves |

---

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Seguir con una llave por cuenta | Bre-B permite varias, y es común tener celular y cédula en la misma cuenta |
| Guardar el tipo como id estable (`celular`) | La convención de `TIPOS_LLAVE`, `TIPOS_CUENTA` y las categorías es el texto; cambiarla solo aquí suma vocabulario |
| Conservar Alias como campo aparte | Es la llave alfanumérica con otro nombre: dos campos para un mismo dato |
| Enmascarar todas las llaves siempre | El celular y el correo se comparten; ocultarlos agrega un toque y no protege nada |
| Mostrar el documento y el número completos | La cédula es dato de identidad: a la vista solo cuando se pide |
| Exigir el formato también a lo guardado | Bloquearía editar el saldo por una llave vieja |
| Copiar con espacios o puntos | Los campos de los bancos piden los dígitos; algunos rechazan los espacios |
| Generar el QR de Bre-B para recibir | Es un instrumento de pago con estándar propio: Finko no cobra ni paga |

---

## Consecuencias

### Positivas

- Pasarle tu llave a alguien es abrir la hoja de la cuenta y un toque.
- Las llaves se llaman igual que en la app del banco.
- Una cédula o un número de cuenta ya no quedan a la vista de quien mira la pantalla.

### Negativas / Restricciones

- Un bump de schema con migración de `llave`, `tipoLlave` y `alias`.
- El primer helper de portapapeles: en el iPhone, la app instalada solo copia dentro del toque del usuario, y hay que probarlo ahí (REV.3b).
- La ficha `contexto/mis-cuentas.md` pasa de su techo de 40 KB: se poda al cerrar la primera rebanada ([ADR 138](138-la-poda-del-tablero-del-13-de-noviembre.md) D4).
