# ADR 099 - Inicio móvil, segunda vuelta: lo de hoy en una lista que cuadra, lo de la semana debajo y el perfil en el avatar

**Estado:** Aceptada (2026-10-29). Pedido en chat: "vamos a empezar a aplicar los cambios sugeridos en estos diseños", sobre la fase 8 del canvas "Finko móvil: rediseño integral" (Claude Design, tableros "Inicio, segunda vuelta" e "Inicio v2: estados y decisiones"). El canvas deja de mandar con este ADR.
**Fecha:** 2026-10-29
**Autores:** Esteban (pedido y diseño de la fase 8), Claude Opus 5.5 (implementación y redacción)
**Relación:** pieza MV2.15 de la tarjeta MV2.2 (segunda entrega del plan MV2, [ADR 098](098-finko-movil-2-primera-entrega.md)). **Cambia** el [ADR 087](087-inicio-en-movil-tambien-avisa-y-no-resume.md) D5 (lo que no se mueve de Inicio móvil) y el [ADR 034](034-inicio-v2.md) D8 (avatar verde decorativo y engranaje). **Retoma a medias** el candidato móvil del [ADR 070](070-inicio-centro-de-atencion-en-escritorio.md) D10: sale el engranaje, la marca se queda (R31). **Acota a escritorio** el orden fijo del [ADR 057](057-inicio-en-escritorio.md) D2: en móvil ordena el motor. **Respeta** el [ADR 066](066-motor-unico-de-avisos.md) D3 a D5 (el tipo nuevo compone un detector existente y no notifica), el [ADR 092](092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) D1 (estado de la lente en texto), el ADR 034 D4 (detalle por cuenta en su sitio), el ADR 087 D3 (accesos rápidos), IN.9e (guía sin datos) y el [ADR 093](093-perfiles-en-el-dispositivo-y-modo-nino.md) D1 (volver del niño con PIN). Todo bajo 1024 px: escritorio no cambia.

---

## Contexto

Medido en la app real tras MV2.1 (rama `mv2/finko-movil-2`, 390 x 844, escenarios de la auditoría MV2):

| Hallazgo | Medida |
|---|---|
| Inicio con uso normal | 2,7 pantallas. "Atención hoy" ocupa 1.275 px repartidos en cuatro paneles: ingreso, límites, Pendientes del mes y Próximas prioridades |
| La lente dice "9 avisos" y no es lo que se ve | cuenta el préstamo de mañana, que no es de hoy, y deja fuera el ingreso por distribuir, que está arriba de todo |
| Poca información | la lente "Hoy" no dice nada y debajo hay un ingreso esperando que lo distribuyas |
| Próximas prioridades | 432 px para 3 pagos: un encabezado por día y una etiqueta por fila; solo cuenta lo que sale, el salario de mañana no aparece |
| Encabezado | la marca "F" y el avatar "L" son dos tejas verdes seguidas; el avatar no responde al toque |
| Ajustes | el engranaje del saludo y "Más" llevan al mismo lugar |

## Decisión

Tres rebanadas, cada una verificable sola: **MV2.15a** (D1 a D4), **MV2.15b** (D5) y **MV2.15c** (D6 y D7).

### D1. "Atención hoy" es una lista: una fila por clase de aviso

Bajo 1024 px los cuatro paneles de aviso (ingreso por distribuir, límites, avisos del motor y Pendientes del mes) se reemplazan por una sola lista. La clase de una fila es la **sección de origen** del aviso (`seccion` del motor): pagos, límites, tu ingreso, apartados, Me deben y respaldo. Es la misma granularidad del interruptor de avisos de Ajustes (CFG.3c), así que no nace vocabulario nuevo.

- Cada fila lleva su dibujo, una frase, un detalle y **su acción directa**: "Pagar" abre el lote de pago sobre Inicio, "Distribuir" abre el asistente, "Ver" lleva a la sección.
- Tope de tres filas. El orden lo pone el motor (ADR 066 D4: severidad, urgencia y monto): una fila toma el lugar de su aviso más importante. Inicio no reordena.
- La severidad no depende del color: cada clase tiene su dibujo y el lector de pantalla oye la severidad en cada fila.
- Sin avisos, una línea en verde dice qué se revisó. Nunca una lista vacía. Sin cuentas no hay lista: manda la guía del hero (IN.9e).

Los paneles de escritorio no cambian: siguen en el DOM y se ocultan bajo 1024 px por CSS.

### D2. "Hoy es hoy"

Un aviso es de hoy si no apunta a una fecha futura: lo vencido, lo que vence hoy, los límites, el ingreso por distribuir, un apartado listo y el respaldo atrasado. Desde mañana, todo pasa a la lista de la semana (hoy "Próximas prioridades"; D5 la convierte en "Esta semana"). Por eso, desde esta rebanada, "Próximas prioridades" en móvil deja de listar préstamos y apartados que vencen hoy: ya están arriba.

### D3. Un solo número

La lente "Hoy", el enlace "Ver los N" y el título de la hoja dicen el mismo número, y es la suma de lo que hay detrás de las filas. "Ver los N" aparece solo si hay más de lo que se ve: con un aviso por fila, las filas ya lo dicen todo.

La hoja "Avisos de hoy" agrupa por clase, con la severidad en texto ("Urgente", "Importante", "Para revisar", "Para tu información") y la acción completa del grupo ("Pagar los 6 · $2.670.900"). Una sola deduplicación: si el ingreso por distribuir es de hoy, el aviso "te llega hoy" del mismo cobro no se cuenta dos veces.

### D4. Un tipo de aviso nuevo: ingreso por distribuir

`infra/avisos.js` gana `ingreso-por-distribuir`, que compone `estadoDistribucion` (`tesoreria/logic/distribucion.js`) con las mismas entradas que el aviso de Inicio de hoy: último periodo distribuido y cobro confirmado (MC.13f). Solo el estado `listo` avisa. Severidad `media`: no dispara notificación (ADR 066 D5). Es opcional en el motor: lo pide quien pasa el estado de distribución (`avisosDeHoy`), así que las notificaciones y las demás superficies no cambian. No detecta nada nuevo (ADR 066 D3).

### D5. "Esta semana" en vez de "Próximas prioridades" (MV2.15b)

Lo que entra y lo que sale en los próximos 7 días, desde mañana: los mismos compromisos, préstamos y apartados de hoy más el día de pago de los ingresos (`ocurrenciasEnMes`, `infra/vencimientos.js`). Filas de una línea con el día a la izquierda, sin encabezado por día. La dirección sigue dicha con forma ([ADR 088](088-me-deben-urgencia-de-cobro-y-direccion-con-forma.md) D3, sin cambio): la flecha pasa de la teja al recuadro del día y el signo va en el monto, igual que en escritorio; lo que entra lleva además el color de un ingreso (R90). El tipo se dice con palabras en la segunda línea ("Mañana · gasto fijo"); el badge de color se queda en escritorio. Al pie, lo que entra y lo que sale en toda la semana (un apartado no cuenta en ningún lado: no le mueve dinero a nadie). Tope de cuatro filas; el resto, "Y N más en el Calendario". Sin nada en la semana, el "Todo al día" de siempre.

### D6. El avatar es un botón y abre tu perfil (MV2.15c, cambia ADR 034 D8)

El avatar deja el verde (la marca es la única teja verde) y abre una hoja: tu nombre, Familia, copia en la nube y Ajustes. Con un niño en Familia, "Pasarle el teléfono a {nombre}" va primero, uno por niño, y reusa el cambio de perfil que ya existe (`entrarComo`); volver pide el PIN (ADR 093 D1). Nada del adulto entra a la app del niño.

Los dos anchos conviven en el DOM y el CSS decide (criterio de IN.9c): el avatar decorativo de escritorio no cambia, y bajo 1024px se ve un botón propio, neutro, de 44 px, que existe aunque falte el nombre (lleva un dibujo de persona). Cada fila de la hoja lleva a su bloque de Ajustes, que ya existía: la sección se abre y baja hasta el título del bloque, que recibe el foco. La copia en la nube dice el correo si hay sesión.

### D7. El engranaje sale del encabezado (MV2.15c, retoma ADR 070 D10)

Ajustes queda en la hoja del avatar y en "Más". La marca "F" se queda (R31): en móvil no hay barra lateral que nombre la app. Desde 1024px el engranaje ya estaba oculto (DSK.1a), así que sin ancho que lo muestre sale del DOM, como los paneles que retiró el DSK.1a: dejarlo sería marcado muerto.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Una fila por aviso | con uso normal son 9 filas: vuelve a ser la tira de 1.275 px |
| Clases propias de Inicio (pagos, límites, ingreso, "otros") | vocabulario nuevo; la sección de origen ya es la clase que el usuario elige en Ajustes |
| Reordenar las filas en Inicio con un orden fijo (ADR 057 D2) | el motor ya ordena por severidad y urgencia; dos órdenes para lo mismo divergen |
| Contar en la lente todo lo que devuelve el motor | cuenta lo de mañana, que no se ve arriba: es el defecto medido |
| Deduplicar el día de pago dentro del motor | el panel de escritorio sigue mostrando "te llega hoy"; la duplicación es de esta superficie y se resuelve en ella |
| Hoja de avisos como sección propia | otra pantalla para lo que cabe en una hoja; volver tendría que recordar la altura (ADR 098 D2) sin necesidad |

## Consecuencias

### Positivas

- "Atención hoy" se lee en la primera pantalla: tres filas donde había cuatro paneles.
- La lente, el enlace y la hoja dicen el mismo número, y es el de lo que se ve.
- Con poca información, la lente dice "1 aviso" y la fila dice cuál.

### Negativas / Restricciones

- Apagar "Día de pago" en Ajustes también apaga, en móvil, el aviso de distribuir el ingreso: comparten sección. En escritorio el panel de distribuir no pasa por el motor y sigue igual.
- Los montos de la lista y de la hoja no se enmascaran con el ojo todavía, igual que los paneles que reemplazan. El ojo pasa al encabezado con MV2.8 (fase 3, R20), y ahí se extiende la máscara.
- La lista vive en `ui/` y lee el motor; los paneles de dominio siguen pintándose aunque en móvil no se vean (costo de render despreciable, mismo criterio que IN.9c).
