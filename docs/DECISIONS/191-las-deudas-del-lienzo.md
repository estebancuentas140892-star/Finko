# ADR 191 - Las deudas del lienzo

**Estado:** Aceptada (2026-11-22).
**Fecha:** 2026-11-22
**Autores:** Esteban (pedido: seguir con la página 7 del lienzo "Gastos · Rediseño integral"), Claude Design (el lienzo), Claude Opus 5.5 (implementación)
**Relación:** Aplica la página 7 ("Deudas") del lienzo `https://claude.ai/artifact/M8EZZ5L2DrnxqzAZvZAwbJ`, tarjeta GAS.15 ([ADR 190](190-el-plan-de-deudas-del-lienzo.md) aplicó la página 8). **Cambia** el [ADR 142](142-formularios-por-tarea.md) D5 en el formulario de deudas (una pregunta por pantalla pasa a cuatro pasos con nombre por tipo), el [ADR 189](189-revision-tecnica-de-gastos-y-motor-de-deudas.md) D4 (la relación y el nombre van en la misma pantalla) y el [ADR 182](182-gastos-cada-cosa-con-su-forma-y-su-color.md) D5 en los textos de Deudas la primera vez. Conserva el [ADR 183](183-gastos-que-cuadran.md) D4 (la tarjeta de crédito nace en Mis cuentas).

---

## Contexto

La revisión del 2026-11-22 (textos de cada tablero contra el código) dejó la página 7 con huecos: el formulario de deudas seguía preguntando una cosa por pantalla en seis pasos ("¿A quién le debes?", "¿Qué tipo de deuda es?", "¿Cómo la reconoces?", saldo, cuota, día) y, desde "Agregar deuda con una entidad", volvía a preguntar con quién era la deuda: justo lo que el pedido de GAS.14 pedía no hacer. El lienzo trae diez tableros: la lista con entidades y con personas, la primera vez, "¿Con quién es?", la deuda con una entidad en cuatro pasos (Crédito, Cuánto, Cuota, Revisar) y la deuda con una persona en cuatro (Quién, Cuánto, Cómo pagas, Revisar), cada una con su factura.

## Decisión

### D1. Cuatro pasos con nombre por tipo (GAS.15b)

- **Con una entidad:** *Crédito* (el tipo de crédito en píldoras y la entidad en una grilla de logos, en la misma pantalla), *Cuánto* (el saldo, con el teclado de Finko), *Cuota* (la cuota de cada mes y el día, juntas, con el teclado del teléfono) y *Revisar*.
- **Con una persona:** *Quién* (el nombre, con sus iniciales, y "Es tu": Familiar, Amigo, Vecino, Natillera, Prestamista, La tienda (fiado), Otro), *Cuánto*, *Cómo pagas* y *Revisar*.
- La barra de pasos dice lo elegido en los pasos hechos ("Davivienda", "$6.000.000", "$400.000"; "Juan Diego", "Cada mes") y se toca para volver a ellos.

### D2. "¿Con quién es?" solo cuando no se sabe

Desde "Agregar deuda con una entidad", "Con una persona" o los caminos de la primera vez, el formulario arranca en el primer paso de su tipo: no se vuelve a preguntar. Cuando no se sabe (la entrada general de Deudas), la primera pantalla es "¿Con quién es?": dos tarjetas ("Con un banco o entidad", con cuatro logos; "Con una persona", con tres iniciales) y "¿Es una tarjeta de crédito? Se agrega en Mis cuentas"; esa pantalla no lleva la barra de pasos.

### D3. La deuda con una entidad se nombra con lo elegido

- El nombre sale del tipo y la entidad ("Libre inversión Davivienda", "Tarjeta Bancolombia", "Crédito Confiar" con "Otra"); no se pregunta. Al editar, el nombre propio que ya tenía se conserva hasta que se cambia el crédito o la entidad.
- "Otra" pide el nombre de la entidad. Una tarjeta que llega de Mis cuentas trae su banco elegido.
- La factura: la teja de la entidad, el tipo y la entidad a la izquierda y lo que debes a la derecha; "Cuota $400.000 · el 28 de cada mes" en una fila; luego, en línea, *Débito automático*, *Tasa de interés*, *Cuotas que faltan* (nuevo, opcional), *Nota* y *Recibí este dinero*.

### D4. La deuda con una persona: cómo pagas

- *Una cuota cada mes:* la cuota y el día (5, 10, 15, 20, 30 u Otro).
- *Todo en una fecha:* la fecha; se guarda como "Única vez" con esa fecha como inicio (su día es el día de pago) y la cuota es todo el saldo, así vence ese día en Por pagar.
- *Cuando pueda:* sin cuota ni día (como GAS.14d).
- La factura: las iniciales, el nombre y la relación con "le debes"; "Le pagas"; en línea, *Te prestó el* (hoy por defecto, nuevo), *Te cobra interés* (un interruptor que abre la tasa mensual; apagado, la tasa es 0 %), *Nota*, *Para pagar* y *Recibí este dinero*. El sello dice "Deuda personal".

### D5. Lo que el motor de preguntas gana (para quien lo pide)

`data-pasos-elegido` (los pasos hechos dicen lo elegido y se tocan), `data-titulo-oculto` (una pantalla sin título grande: sus rótulos van adentro), `data-sin-teclado` (un dinero con el teclado del teléfono) y `[data-factura-quien]` (la cabecera de la factura con teja y la cifra al lado). La factura de la deuda usa las líneas de la del gasto fijo (GAS.13g). La página 4 del lienzo (el gasto fijo) puede usar lo mismo.

### D6. Los datos

Campos nuevos, opcionales y sin migración: `Compromiso.fechaPrestamo` (deuda con una persona), `Compromiso.cuotasRestantes` (con una entidad) y `fechaInicio` también en deudas "Única vez". Las categorías guardadas no cambian: los chips las leen con la etiqueta del lienzo ("Educativo" se lee "Estudio", "Otra" "Otro", "Prestamista particular" "Prestamista", "Fiado" "La tienda (fiado)"). "Te prestó el" en la lista usa `fechaPrestamo` y, si no hay, la fecha en que se anotó.

### D7. La primera vez

"Con un banco o entidad · Créditos, libranzas, compras a cuotas" y "Con una persona · Familia, amigos, natillera, fiado", con la teja en frambuesa y "Agregar" en el color de Deudas. En pantallas bajas la teja se achica para que la calma siga sobre la barra.

## Alternativas descartadas

- **Seguir con una pregunta por pantalla:** el lienzo agrupa lo que se responde junto (el tipo con la entidad, la cuota con el día) y eso quita dos pantallas.
- **Un campo `entidad` nuevo en la deuda:** todo lo que reconoce el logo lee el nombre; nombrar con el tipo y la entidad no pide migración y la lista puede separar los dos (GAS.15c).

## Consecuencias

- Las pruebas que recorrían el formulario viejo cambian de pasos; el contrato de datos (`descripcion`, `categoria`, `cuotaMensual`, `diaPago`, `frecuencia`, `tasa`) es el mismo.
- Pendiente en esta página: la lista (GAS.15c): el tipo como título y la entidad debajo, "· pagaste", "le debes", "Pagar" aparte y el total en cada pestaña.

## Ajustes al aplicar

- **D1:** el botón dice "Continuar", como el lienzo. La pista "¿Es una tarjeta de crédito? Agrégala en Mis cuentas" sigue en el paso Crédito (ADR 183 D4), también cuando no se pasa por "¿Con quién es?". "Frecuencia" solo aparece si la deuda guardada no es mensual.
