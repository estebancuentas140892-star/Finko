# ADR 175 - ¿A dónde se paga?: el dato para pagar vive en el pago

**Estado:** Aceptada (2026-11-18). Pedido "Revisión de servicios, categorías y movimientos", punto 9, parte 9b: guardar los datos para transferirle a alguien, sin convertir a Finko en un banco. La propuesta salió de esa revisión y se aprobó en chat el mismo día: "Sí, sigue con 9b".
**Fecha:** 2026-11-18
**Autores:** el pedido de revisión (producto), Claude Opus 5.5 (análisis del modelo y diseño)
**Relación:** **Completa** el [ADR 170](170-tus-llaves-a-un-toque.md), que resolvió los datos propios (9a): reusa sus tipos de llave de Bre-B, su revisión de formato, el rechazo de números de tarjeta, `infra/portapapeles.js` y el enmascarado. **Amplía** el gasto fijo y la deuda con una persona (`Compromiso`) con un dato de referencia, y su ficha en Por pagar ([ADR 117](117-por-pagar-por-urgencia-y-en-filas.md)) y la hoja "¿Desde qué cuenta pagas?" del [ADR 152](152-inicio-rediseno-saldo-al-centro-y-pago-en-hojas.md) D6 con un botón de copiar. Respeta el ojo de la sección del [ADR 166](166-un-ojo-por-seccion.md). No crea movimientos.

---

## Contexto

La revisión pedía un lugar donde consultar y copiar las llaves de Bre-B, las cuentas y los números de Nequi cuando hay que transferir. El ADR 170 resolvió las cuentas propias. Falta **a quién le pagas**: el arrendador, la administración del conjunto, quien trabaja en casa o la persona a la que le debes.

Hoy ese dato vive en el chat con el arrendador, en una foto del recibo o en la memoria. Finko ya sabe **qué** se paga y **cuándo** (el fijo o la deuda en Por pagar), pero no **a dónde**. El momento en que hace falta es justo antes de pagar: abrir el pago en Finko, copiar el dato, pagar en la app del banco y volver a marcarlo pagado.

Para un servicio público pasa lo mismo con otro dato: el **número de contrato o la referencia de pago** que pide el banco o PSE (EPM, el acueducto, la pensión del colegio).

---

## Decisión

### D1. El dato vive en el pago, no en una libreta

Campo opcional **`datosPago`** en el `Compromiso` de tipo **gasto fijo** o **deuda con una persona**:

| Campo | Qué es |
|---|---|
| `titular` | A nombre de quién ("Martha Gómez", "Conjunto Los Pinos"). Opcional |
| `llave` | Una llave de Bre-B `{ tipo, valor }`, con los tipos y el formato del ADR 170 D2 y D3 |
| `entidad` | El banco o la billetera donde recibe (id de `BANCOS_CO`). Opcional; acompaña al número de cuenta |
| `numeroCuenta` | Número de cuenta, si no tiene llave |
| `referencia` | Número de contrato o referencia de pago |

Tiene que haber al menos uno de `llave`, `numeroCuenta` o `referencia`. Va en "Agrega si quieres" al crear el fijo o la deuda ([ADR 142](142-formularios-por-tarea.md) D5) y en la ficha al editar. Se borra con el compromiso. Sin migración: sin el dato, todo se ve como hoy.

Una sola llave por pago: a quien se le paga se le transfiere a una cuenta.

### D2. Copiar donde se paga

- **En la ficha del fijo o de la deuda** (la hoja que abre cada pago en Por pagar): una sección **"Para pagar"** con cada dato y su botón Copiar (ADR 170 D4). "Copiaste la llave de Martha Gómez".
- **En la hoja "¿Desde qué cuenta pagas?"** (ADR 152 D6), cuando aparece: el dato principal con Copiar, arriba de las cuentas. Es lo primero que se necesita para pagar.
- Copiar no cierra la hoja: al volver de la app del banco, el pago sigue abierto para marcarlo.
- **"Pagar varios"** no lleva botones de copiar: cada pago tiene su ficha.

### D3. Lo que se ve y lo que no

Las reglas del ADR 170 D5:

- La llave de celular, la de correo, la alfanumérica y la referencia se ven completas.
- El documento y el número de cuenta se ven enmascarados (`•••• 4567`) hasta tocarlos.
- Con el ojo de Por pagar cerrado, todo se enmascara. Copiar sigue funcionando.

### D4. Seguridad

- **Solo lo necesario para pagarle.** Nada de su cédula, salvo cuando es su llave; nada de su dirección ni su teléfono, salvo cuando es su llave.
- **Un número de tarjeta, no** (prueba de Luhn del ADR 170 D3) en la llave ni en el número de cuenta. La referencia queda fuera de esa prueba: las referencias de pago pueden ser largas y no son tarjetas.
- Son datos de otra persona para uso personal. Viajan a la nube como el resto (cifrados en tránsito, con las reglas por usuario de `SECURITY.md`) y se borran con el fijo.
- Finko no abre la app del banco, no arma enlaces de pago ni genera códigos QR: copiar es el límite (ADR 170 D8).

### D5. Lo que queda fuera

- **La deuda con una entidad:** se paga en el banco o en su app, y su número de tarjeta u obligación es justo lo que Finko no guarda.
- **Me deben:** ahí el que cobra eres tú y se comparte tu llave (ADR 170).
- **Una libreta de contactos para transferir** (D6, descartada).

---

## Rebanada

| Rebanada | Qué entrega |
|---|---|
| PAG.1 | D1 a D4: `datosPago` en el fijo y en la deuda con una persona (normalizar, validar, editar), "Para pagar" en su ficha con Copiar y el dato en "¿Desde qué cuenta pagas?". Espera MC.19b (el helper de copiar y el enmascarado) |

---

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Una libreta de contactos (nombre, banco y llave de cada persona) | Duplica los destinatarios inscritos del banco, suma una pantalla y guarda datos de terceros sin un pago que los use |
| El dato en la nota del fijo | No se puede copiar solo el dato, no se enmascara y no se revisa su formato |
| Varias llaves por pago | A quien se le paga se le transfiere a una cuenta; una basta |
| Copiar desde la fila de Por pagar | La fila tiene un solo primario (ADR 117); un segundo botón compite con "Pagar" |
| Abrir la app del banco con el dato puesto | Es un instrumento de pago: Finko no paga (ADR 170 D8) |
| También en la deuda con una entidad | Se paga en su canal, y su número de tarjeta no se guarda |

---

## Consecuencias

### Positivas

- Pagar el arriendo es abrir el pago, copiar la llave, pagar en el banco y volver a marcarlo.
- La referencia de un servicio público deja de buscarse en el recibo cada mes.
- Con el ADR 170, la parte 9 de la revisión queda completa sin una pantalla nueva.

### Negativas / Restricciones

- Un dato opcional más en dos formularios.
- Finko guarda datos de terceros: pocos, opcionales y solo donde se usan.
- En el iPhone, copiar con la app instalada se prueba en el teléfono real (como en MC.19b).
