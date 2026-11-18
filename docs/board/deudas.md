# Tablero - Por pagar (dominio `compromisos`)

> Revisado: 2026-11-18.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `compromisos`, mismo nombre que su ficha [`contexto/deudas.md`](../contexto/deudas.md)). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.
> **Estado: una iniciativa viva, AVC.1 (un avance no es un gasto), y una tarjeta, PAG.1 (¿a dónde se paga?), abajo.** "Deudas v2" está completa ([ADR 036](../DECISIONS/036-deudas-v2-visual.md)). Que un pago de deuda descuente de la cuenta existe desde el [ADR 002](../DECISIONS/002-abono-deudas.md): si aparece un caso donde no ocurra, es un bug para [`BUGS.md`](../BUGS.md), no una tarjeta.

---

> **Iniciativa AVC.1 - Un avance no es un gasto** ([ADR 169](../DECISIONS/169-un-avance-no-es-un-gasto.md), aceptada 2026-11-18). Fuente única de todo lo del avance con tarjeta de crédito: cuando el dinero llega a ti, la tarjeta presta y la cuenta recibe; el costo se dice en pesos antes de guardar. Cambia el [ADR 051](../DECISIONS/051-tarjeta-de-credito-producto-integrado.md) D7. **Una idea sobre avances se integra acá, no abre tarjeta suelta.**

#### AVC.1c - El aviso de avances seguidos
- Prioridad  : media
- Estado     : pendiente
- Área       : code
- Objetivo   : ADR 169 D8: `avancesRecientes` (dos o más en 90 días, de la lista de la tarjeta y de los gastos con `avanceTC`) y su tipo en el motor único, severidad media, con el botón al plan de salida
- Riesgo     : no dispara notificación del sistema (ADR 066 D5)
- Secciones  : Inicio (Atención hoy), Por pagar
- Archivos   : `modules/dominio/compromisos/logic/`, `modules/infra/avisos.js`, `tests/unit/avisos.test.js`
- Depende de : nada
- Aceptación : unitarias: dos avances en 90 días dan un aviso; uno solo, o dos separados por más de 90 días, no
- Modelo     : capacidad estándar, esfuerzo bajo

#### PAG.1 - ¿A dónde se paga?
- Prioridad  : media
- Estado     : pendiente
- Área       : ambos
- Objetivo   : [ADR 175](../DECISIONS/175-a-donde-se-paga.md) D1 a D4: `datosPago` (titular, una llave de Bre-B, entidad, número de cuenta o referencia de pago) en el gasto fijo y en la deuda con una persona; "Para pagar" con Copiar en su ficha; el dato principal con Copiar en "¿Desde qué cuenta pagas?"; enmascarado y ojo como en el ADR 170
- Riesgo     : reusa la validación de llaves de MC.19a y el helper de MC.19b, no los copia; la referencia queda fuera de la prueba de Luhn; la deuda con una entidad no ofrece el campo
- Secciones  : Por pagar (formularios de gasto fijo y de deuda con una persona, ficha), Inicio (hoja "¿Desde qué cuenta pagas?")
- Archivos   : `modules/core/state.js`, `modules/dominio/compromisos/logic/modelo.js`, `views/formularios.js`, `views/detalle.js` e `index.js`, `modules/infra/cuenta-helper.js`, `tests/unit/compromisos.test.js`
- Depende de : MC.19b
- Aceptación : unitarias de normalizar y validar `datosPago` (al menos un dato, formato de la llave, sin tarjetas); E2E a 390 px: un arriendo con la llave de celular de quien lo cobra muestra "Para pagar", Copiar deja los 10 dígitos en el portapapeles y la hoja sigue abierta para marcarlo pagado
- Modelo     : capacidad estándar, esfuerzo medio
