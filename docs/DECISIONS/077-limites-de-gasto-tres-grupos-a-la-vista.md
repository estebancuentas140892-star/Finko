# ADR 077 - Límites de gasto: los tres grupos a la vista, sin romper la contención

**Estado:** Aceptada. En implementación (iniciativa DSK.8, dos rebanadas).
**Fecha:** 2026-08-18
**Autores:** Esteban (producto), Claude Design (auditoría "Límites de gasto 1920"), Claude Opus 5 (implementación)
**Relación:** hereda de los [ADR 071](071-calendario-como-mapa-del-mes-en-escritorio.md) a [ADR 076](076-movimientos-libro-mayor-con-sus-filtros-al-lado.md) el reparto en columnas de escritorio. **Conserva entero el [ADR 019](019-limites-por-rol.md)**: el tratamiento asimétrico por rol y, sobre todo, que los topes por categoría vivan **dentro** de la tarjeta de Estilo de vida. No toca lógica: `presupuesto/logic.js` no cambia.

---

## Contexto

La sección tiene tres tarjetas de grupo, y una mide **5,7 veces** lo que sus hermanas: Necesidades 680 x 263, Ahorro 680 x 263, Estilo de vida **1376 x 1494**. Esa tercera empieza a 510px del inicio del contenido, así que **ninguno de sus sobres entra en la primera pantalla**, y la segunda pregunta de la sección ("¿dónde le pongo freno?") vive entera fuera del pliegue.

La causa no es la contención, que está bien decidida: Estilo de vida contiene sus topes porque son una subdivisión de su presupuesto. La causa es que **a 1376 sus sobres se apilan a ancho completo**, y son ellos los que la hacen crecer.

De ahí salen los demás hallazgos:

- **Más de 1050px entre la categoría y sus cifras** en un sobre de 1342 x 210, con una barra de progreso de **1309px**. Sexta aparición del mismo hueco en la auditoría (Inicio 360, Deudas 1013, Me deben 889, Mis cuentas más de 1100, Movimientos 918), y la barra repite lo de Me deben: a 1309px cada píxel vale 0,08 %, precisión que un porcentaje no tiene.
- **"+ Límite" dos veces, a 1333px de distancia**: el primario de la barra superior y el del pie de la tarjeta, mismo texto y mismo destino. No es un descuido: en móvil el primario vive en el encabezado, cerca del contenido, y al subir a la barra superior los dos quedaron en extremos opuestos.
- **Los dos párrafos que enseñan el concepto**, en una línea de 1342: la intro ("es un tope a lo que gastas, no un ahorro") y la línea de olla finita.
- **El sobre excedido no pasa AA.** Sobre el fondo teñido del estado (`--fk-danger-bg`, que compone a `rgb(59,40,52)`) el subtítulo mide **4,24:1** y la nota **4,09:1**, contra un umbral de 4,5. El mismo subtítulo en un sobre normal mide 5,82:1: **es el tinte del estado lo que hunde el texto**, y justo en el estado que más exige que se lea.

---

## Decisión

**El umbral es 1440px**, el mismo de Deudas, Mis cuentas y Movimientos.

### D1. Cinco y siete: los dos grupos que se leen a un lado, el que se opera al otro

Necesidades y Ahorro apilados en una columna de `span 5`; Estilo de vida en una de `span 7` **con sus topes dentro**, y sus sobres a dos columnas.

**Es el único reparto de la serie que no usa 8 y 4**, y la diferencia tiene motivo: en Calendario, Deudas y Movimientos la columna estrecha lleva un panel o unos controles; acá lleva **dos tarjetas de grupo completas**, con sus tres cifras y su desglose. A `span 4` (~442px) esas tres cifras se aprietan; a `span 5` (~559) respiran. Y la ancha necesita 7 y no 8 porque con ~793 sus sobres a dos columnas dan ~372, que es el ancho natural de un sobre.

**Se descarta poner los tres grupos en fila a `span 4` y bajar los topes a un bloque propio**: ese bloque suelto es exactamente lo que el [ADR 019](019-limites-por-rol.md) retiró. La línea de olla finita ("tus límites cubren $X de los $Y de tu Estilo de vida") solo se sostiene si la relación es visible. Sacarlos de su tarjeta ahorra altura y pierde el argumento.

### D2. Los sobres a dos columnas dentro de su tarjeta

`.envelope` no se toca: lo que cambia es el ancho de la caja que lo contiene. El sobre es una unidad pequeña (cabeza, barra, meta y acciones) y no gana nada con 1342.

Las filas de "Gastas acá y no tiene tope" también pasan a dos columnas por el mismo motivo: son cortas (categoría, monto y una acción) y a ancho completo dejan el mismo vacío.

### D3. Los dos párrafos que enseñan se acotan a 62ch

La intro y la línea de olla finita. Importa más que en otras secciones porque son los dos textos que explican **qué es un tope**, a alguien que puede no saberlo.

### D4. Un solo "Nuevo límite" en pantalla, y con el nombre correcto

Mientras el primario de la barra superior esté visible, el botón del pie de la tarjeta se retira. Es **la regla inversa de una que la sección ya tiene**: `_sincronizarBotonEncabezado()` oculta el primario del encabezado en el estado vacío, con el argumento de que "tres botones a la vez no dicen por dónde empezar". Faltaba la mitad simétrica. En el estado vacío se conserva el comportamiento actual: el de la barra se oculta y el del pie se queda.

**Y el texto pasa de "+ Límite" a "Nuevo límite"**, aplicando la regla D3 del lenguaje de acciones: fuera el "+" (lo aporta el ícono) y "Nuevo" porque un tope es una entidad que persiste. Alcanza a **las dos apariciones del literal**: el botón y la afordancia de cada fila de categoría sin tope. Cambiar una y no la otra habría sido peor que no cambiar ninguna.

**No se toca la tercera puerta**, que es buena: cada fila de "Gastas acá y no tiene tope" **es** el botón que abre el formulario con su categoría precargada.

### D5. El texto del sobre excedido vuelve a pasar AA

El subtítulo y la nota pasan a `--fk-text-secondary`, acotado al estado excedido: normal y alerta no cambian.

**La nota no se queda en rojo porque no hay rojo que la salve**: en tema oscuro `--fk-danger-text` resuelve al mismo `#ff4757` que `--fk-danger`, así que subir el tono exigiría inventar un color, y eso no se hace acá. Tampoco hace falta: el estado ya lo dicen el borde, la barra roja y la palabra "Excedido" de la línea de meta, que está justo encima en ese mismo tono y a 5,82:1. La nota es la prosa que lo explica, no la señal.

**Se cambia el color, no el tamaño**, y el tinte rojo del sobre se conserva: es la señal de estado y funciona.

### D6. Lo que no se toca, y acá con especial cuidado

Todo el tratamiento asimétrico por rol del [ADR 019](019-limites-por-rol.md): Necesidades siempre neutra porque se monitorea y no se alarma; Ahorro en verde con "Ahorrado de más" en positivo porque pasarse es un logro; Estilo de vida como único grupo con ámbar y rojo. La barra `--neutro` explícita de Necesidades. Que los topes vivan dentro de Estilo de vida, con su línea de olla finita. Que cada fila de categoría huérfana sea el botón que crea su tope, y que una categoría que no puede llevar tope explique por qué. Que la nota de estado baje al sobre que describe. Que el desglose de Ahorro avise de que sus montos son acumulados. Y que el presupuesto no se fije acá, con el enlace a Mis cuentas como única puerta.

---

## Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| Tres tarjetas en fila a `span 4`, con los topes en un bloque propio | ese bloque suelto es lo que el ADR 019 retiró: la línea de olla finita solo se sostiene si los topes están dentro del grupo que subdividen |
| Reparto 8 y 4, como el resto de la serie | acá la columna estrecha lleva dos tarjetas de grupo completas, y a ~442px sus tres cifras se aprietan |
| Achicar el sobre o su barra | el sobre está bien resuelto; lo que sobra es el ancho de la caja que lo contiene |
| Subir el tono de la nota del sobre excedido en vez de bajarla a secundario | en tema oscuro `--fk-danger-text` resuelve al mismo color que `--fk-danger`: habría que inventar un rojo nuevo |
| Quitar el tinte del sobre excedido para ganar contraste | el tinte es la señal de estado y funciona; lo que falla es el texto encima |

---

## Consecuencias

- Los tres grupos vuelven a leerse como tres grupos comparables, y los sobres (la respuesta a "dónde le pongo freno") entran en la primera pantalla.
- **D4 y D5 valen en todos los anchos**: el duplicado de botón solo se ve en escritorio, pero el texto y el contraste no dependen del ancho. Declarado acá para que la ficha de MOV.1 que toque la sección lo herede.
- Tercer umbral de contraste que aparece en esta serie, tras el color de Calendario y la opacidad de grupo de Me deben. Las tres veces por lo mismo: mirar un color aislado en vez de sobre la superficie que le toca. Conviene medir siempre contra el fondo compuesto del estado, no contra el fondo base.
- La regla de "un solo primario visible" pasa a tener sus dos mitades escritas en el mismo sitio: la que oculta el del encabezado sin plan, y la que oculta el del pie cuando el de arriba está.
