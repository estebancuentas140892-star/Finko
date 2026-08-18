# ADR 070 - Inicio como centro de atención en escritorio

**Estado:** Aceptada. En implementación (iniciativa DSK.1, cuatro rebanadas).
**Fecha:** 2026-08-18
**Autores:** Esteban (producto), Claude Design (auditoría "Inicio 1920 v2"), Claude Opus 5 (implementación)
**Relación:** **acota el [ADR 057](057-inicio-en-escritorio.md)** (D3 y D4: el reparto de escritorio que este ADR reemplaza) y **acota el [ADR 034](034-inicio-v2.md)** (D1, el orden del bento, y D7, accesos + actividad). Conserva enteros el [ADR 066](066-motor-unico-de-avisos.md) (panel Avisos) y el [ADR 032](032-logros-v2-niveles-y-habitos.md) D6 (tarjeta "Tu progreso"): la auditoría no los vio y no se retiran en silencio. No toca móvil: lo que la ficha 02 de MOV.1 dejó bajo 1024px sigue igual.

---

## Contexto

El [ADR 057](057-inicio-en-escritorio.md) decidió **cómo repartir** Inicio en un monitor: cero celdas de ancho completo, `span 4` y `span 6`. Fue la respuesta correcta a la pregunta de entonces, que era de composición.

La segunda pasada de la auditoría cambia la pregunta. Ya no es "cómo se colocan los nueve módulos", sino **"cuáles pertenecen"**. El criterio nuevo, en una línea: *si el usuario abre Finko diez segundos, tiene que salir sabiendo qué atender*. Contra ese criterio, de los nueve módulos que Inicio pinta hoy en escritorio, cinco contestan "qué pasó" o "cómo voy" (pasado y tendencia) y solo cuatro contestan "qué me exige algo ahora".

Tres defectos medidos contra el código vivo, no contra una impresión:

- **El parche verde del hero son dos piezas, no una.** `linear-gradient(160deg, ...)` deja su punto más denso en la esquina superior izquierda, justo bajo el botón del ojo, y encima hay un blob decorativo de 371 x 150 al 6 % de opacidad que se sale 67px del hero y lo salva un `overflow: hidden`. En una app financiera el verde significa "bien" (lo usan el chip de gasto a la baja y el monto de ingreso), así que un lavado verde detrás del saldo insinúa que el saldo es bueno. Nadie lo decidió: es el color de dominio.
- **"Dónde está tu dinero" no está comprimida: está vacía.** Filas de 32px con avatar de 32px y `gap` ninguno, así que los cuatro avatares se tocan y forman una tira continua. Caja de nombre de 490px para un texto de 142: **360px de nada** entre el nombre de la cuenta y su saldo.
- **El pie de la tarjeta chocaba con el canto.** En la propuesta anterior el botón terminaba en 587 y la tarjeta en 588. Un píxel. El pie llevaba `padding-block-start` y nada abajo.

---

## Decisión

### D1. Inicio en escritorio avisa, no resume

Todo lo que no ayude a contestar *"¿qué necesito saber ahora para no tener un problema con mi dinero?"* sale de Inicio en escritorio, aunque funcione. Quedan tres clases de contenido: **contexto** (cuánto tengo y dónde), **avisos** (situaciones que empeoran si se ignoran) y **obligaciones con fecha** (lo vencido y lo que viene). Nada más.

El alcance es **escritorio, desde 1024px**. Móvil conserva su reparto: bajo ese ancho no hay barra lateral que absorba los atajos, y la auditoría móvil ya decidió sobre esa pantalla por separado.

### D2. Se retiran tres módulos de Inicio en escritorio

| Módulo | Adónde va | Por qué |
|---|---|---|
| Resumen de la semana | Análisis | es tendencia, y la tendencia no tiene fecha límite. Es el módulo más atractivo de Inicio, y ese es justamente el argumento en contra: unas barras llaman más que una lista de texto, y son lo menos urgente de la pantalla |
| Actividad reciente | Movimientos | cuenta el pasado. Nada de lo que muestra requiere una acción ni tiene fecha. Y comparte anatomía con la lista de obligaciones (teja, nombre, monto), así que a primera vista se confunden y solo una de las dos exige algo |
| Accesos rápidos | la barra lateral, que ya los tiene | `span 4` = 442px de tarjeta sola en una fila de 1376: **933px vacíos**. Existe porque en móvil no hay barra lateral; en monitor ese motivo no aplica |

Ninguno de los tres pierde función: los tres cambian de sitio o dejan de duplicar algo que ya está a un clic. **Los tres siguen enteros en móvil.**

**Dependencia abierta:** el botón "Personalizar" de Accesos rápidos se queda sin sitio en escritorio. Necesita entrada en Ajustes; hasta que la tenga, personalizar accesos es una acción solo de móvil.

### D3. Avisos y "Tu progreso" se quedan

`#panel-avisos` ([ADR 066](066-motor-unico-de-avisos.md)) y `#panel-progreso-inicio` ([ADR 032](032-logros-v2-niveles-y-habitos.md) D6) no aparecen en la auditoría: se escribió contra una foto anterior a las dos. Avisos encaja en la clase "avisos" de D1 y entra en la columna estrecha. "Tu progreso" no encaja en ninguna de las tres clases, pero **retirarlo sin análisis propio sería revertir un ADR en silencio**, que es lo único que CLAUDE.md prohíbe hacer callado. Se conserva tal cual y queda anotado como candidato a auditoría propia.

### D4. La decoración sale entera

Fuera el gradiente de identidad del hero (M1) y fuera el blob `d-blob` (M2), **en escritorio**. El color vuelve a significar estado y nada más; el saldo no es un estado. El blob además era piloto declarado en el propio código (*"DV.2b, piloto acotado, 1 sola por pantalla"*): si en un año no se extendió al resto de la app, no se adoptó.

### D5. El ojo se pega a la etiqueta del saldo

Se conserva la **función** entera, incluida la regla de enmascarar total y detalle a la vez (si no, el total se reconstruye sumando las cuentas). Lo que cambia es dónde vive: deja la esquina absoluta (solución de móvil, donde el hero es todo el ancho) y se pega al final de "Tu dinero disponible hoy", sin caja ni borde. Deja de flotar y dice a qué se refiere.

### D6. El saldo y las cuentas se funden en una banda de ancho completo

Son la misma pregunta ("cuánto tengo, y dónde está"), así que dejan de ser dos celdas `span 6`. Una banda a lo ancho: saldo a la izquierda, cuatro fichas de cuenta a la derecha, cada ficha con su avatar, su nombre y su cifra **juntos**. Eso mata los 360px muertos y el ritmo vertical roto de una sola vez.

Va arriba porque es el contexto sin el cual una deuda de $1.284.500 no significa nada (la misma cifra es una molestia o una crisis según lo que haya en el banco), pero va **callada**: sin decoración y sin competir con lo urgente.

### D7. Debajo, dos columnas asimétricas de 4 y 8

El grupo "Atención hoy" en 2 x 2 se emparejaba por tipo (avisos 114 + 114, listas 370 + 370) **solo si estaban los cuatro paneles**, y cada uno se oculta por su cuenta. Con un número impar visible, media fila queda vacía y un aviso hereda la altura de una lista: la zona más importante de Inicio era la que peor se comportaba con pocos datos, que es el caso normal.

El reparto pasa a ser fijo: **avisos en columna estrecha (`span 4`), obligaciones en columna ancha (`span 8`)**. Un aviso es corto por naturaleza; una lista de obligaciones crece. El reparto deja de depender de cuántos paneles haya. Sigue sobre la rejilla de 12 de siempre: no hay retícula nueva.

Con esto **Inicio deja de ser un bento en escritorio**. En la primera pasada el mosaico era correcto porque había seis clases de contenido con pesos distintos; al retirar estadísticas, pasado y atajos quedan tres bloques y dos son la misma clase. Un mosaico que solo reconcilia tres piezas es una retícula con nombre bonito.

### D8. "Pendientes del mes" y "Próximas prioridades" se fusionan

Misma pregunta partida en dos: mismo archivo de origen (`compromisos/views/dashboard.js`), mismo eje (el tiempo), mismo enlace a `#agenda`, y el propio código dice que la fila de una tiene *"anatomía idéntica"* a la de la otra. Para saber cuánto debe en total, el usuario tenía que sumar dos cifras de dos tarjetas.

Queda una sola tarjeta, **"Lo que tienes que pagar"**, con una línea de tiempo continua: el grupo **"Ya se venció"** al frente en rojo, y después los grupos por día con etiqueta relativa ("mañana", "en 4 días"). Se conservan el agrupado por día, los `.dom-badge` de dominio y el pago en lote.

El pie lleva la cifra dentro del botón (**"Pagar lo vencido - $1.474.400"**) y el resto al lado ("4 pagos - en total debes $5.964.300"). La suma ya está hecha.

### D9. El pie respira y la tarjeta es la celda

Dos correcciones de composición, ninguna de tamaño de letra:

- El pie lleva aire **arriba y abajo**, no solo arriba. El botón más importante de la pantalla deja de parecer que se sale.
- La tarjeta **es** la celda: sin caja dentro de caja. Antes iba en una celda `--flat` con 24px de relleno propio, así que su borde caía 24px por dentro del de la columna vecina y dos superficies de la misma fila quedaban desalineadas. Ahora los bordes de la banda y de las dos columnas caen a plomo por los dos lados.

### D10. El encabezado de perfil pierde marca y engranaje

Se aplica la D8 del [ADR 034](034-inicio-v2.md), que ya estaba aprobada y no se había ejecutado en escritorio. Fuera la marca "F" (existe porque en móvil la barra lateral pierde su logo; en monitor el logo está a 240px) y fuera el engranaje (es la tercera entrada a Ajustes de la misma pantalla). Se quedan avatar y saludo. El `h1` sigue en `sr-only`: Inicio cumplía D1 del armazón antes de que D1 existiera.

### D11. Lo que sobra no se rellena

Con datos reales de un mes cargado queda aire bajo la última fila y la pantalla cabe entera en el pliegue sin desplazar. **Ese aire es la señal de que no queda nada urgente**, y crece cuando el mes está tranquilo. Una pantalla de alertas que siempre está llena deja de ser una pantalla de alertas.

De la misma decisión se sigue una regla de documentación: **no se fija en documento una cifra exacta de píxeles sobrantes.** Se mueve con cada cambio de altura o de hueco (lo hizo tres veces en tres revisiones) y una cifra que se desactualiza sola acaba contradiciendo al documento que la contiene.

---

## Alternativas rechazadas

**Recolocar el Resumen de la semana en vez de retirarlo.** Es el módulo mejor hecho de Inicio y la tentación es darle otro sitio dentro de la pantalla. Rechazada: el problema no es dónde está, es que compite por atención con lo vencido. Su ausencia es la decisión.

**Conservar el bento y arreglar solo el 2 x 2.** Mantendría el mosaico y corregiría el emparejamiento por tipo. Rechazada: con tres bloques y dos de la misma clase, el mosaico ya no reconcilia nada. Además dejaría dentro los cinco módulos que fallan la prueba de pertenencia, que es el hallazgo de fondo.

**Aplicar D4, D5 y D10 también en móvil.** El argumento de M1 (el color se reserva para estados) es igual de válido bajo 1024px. Rechazada por continuidad: la ficha 02 de MOV.1 cerró sobre Inicio móvil el 2026-08-15 y la auditoría móvil sigue abierta con 21 fichas por delante. Tocar móvil desde un documento de escritorio invadiría una iniciativa activa. Queda anotado como candidato para cuando MOV.1 llegue a su ficha de Inicio.

**Retirar también Avisos y "Tu progreso", para dejar las tres superficies exactas del mockup.** Rechazada: la auditoría no los midió porque no existían en su foto. Sacarlos sería revertir el ADR 066 y el ADR 032 D6 sin discusión.

---

## Consecuencias

**A favor**

- El orden de lectura pasa a coincidir con el orden de urgencia: contexto callado arriba, lo vencido en rojo en la primera pantalla.
- El reparto deja de depender del estado de los datos, que era el defecto estructural del 2 x 2.
- Tres nombres abstractos ("Pendientes", "Próximas prioridades", "Atención hoy") se cambian por español corriente: "Requiere tu atención", "Lo que tienes que pagar", "Ya se venció". Sirve al ADN 11 y al [ADR 003](003-tono-neutral-profesional.md).
- Cero capas decorativas: ningún color sin función.
- La pantalla cabe en el pliegue sin desplazamiento.

**En contra, o pendiente**

- **Tercera pieza que se parte por plataforma.** IN.9c partió la máscara de privacidad y IN.9d partió Accesos/Actividad; esto añade el reparto entero del bento. Cada división necesita test dedicado, y el patrón `matchMedia` heredado no repinta ante un cambio de ancho sin cambio de estado.
- **"Personalizar accesos" se queda sin entrada en escritorio** (dependencia abierta de D2).
- **Tablet (768 a 1023px) sigue sin auditar**, igual que lo dejó el ADR 057.
- **"Tu progreso" queda fuera de las tres clases de D1** sin haber sido auditado: deuda anotada, no resuelta.
- Calendario hereda de aquí la línea de tiempo agrupada por día. Nada obliga a implementarla allí ya, pero la decisión de nombre y forma queda tomada.
