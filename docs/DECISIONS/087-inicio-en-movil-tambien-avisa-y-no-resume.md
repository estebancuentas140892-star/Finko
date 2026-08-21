# ADR 087 - Inicio en móvil también avisa, y no resume

**Estado:** Aceptada. Decidida por Esteban el 2026-08-21, fuera del orden de MOV.1.
**Fecha:** 2026-08-21
**Autores:** Esteban (producto), Claude Opus 5 (análisis e implementación)
**Relación:** **extiende a móvil el [ADR 070](070-inicio-centro-de-atencion-en-escritorio.md) D2**, que retiró tres módulos de Inicio en escritorio y cerró diciendo "los tres siguen enteros en móvil". Extiende **dos de los tres**, y deja el tercero donde está con su razón. **Acota la ficha 02 de MOV.1** ([ADR 069](069-bloque-gastos-en-la-barra-movil.md)), que decidió que "Inicio conserva su estructura, su orden, su hero y su estado vacío" y dejó la densidad anotada para el cierre. Se adelanta a la ficha 18 en este punto, a pedido de Esteban.

---

## Contexto

El ADR 070 D2 (DSK.1a, 2026-08-19) retiró tres módulos de Inicio en escritorio, con esta tabla:

| Módulo | Adónde va | Por qué |
|---|---|---|
| Resumen de la semana | Análisis | es tendencia, y la tendencia no tiene fecha límite |
| Actividad reciente | Movimientos | cuenta el pasado, y comparte anatomía con la lista de obligaciones |
| Accesos rápidos | la barra lateral, que ya los tiene | `span 4` = 442px de tarjeta sola en una fila de 1376: 933px vacíos |

Y cerró con una frase: **"Los tres siguen enteros en móvil."**

Esa frase se sostenía en que DSK.1 era una iniciativa de escritorio y móvil era territorio de MOV.1. Pero MOV.1 llegó a Inicio en su ficha 02 y decidió no tocar la estructura: *"Inicio conserva su estructura, su orden, su hero y su estado vacío. Cambian cuatro cosas, todas de contenido... Ninguna medida de la retícula se mueve."* Esa misma ficha dejó anotado, sin resolver: *"Con los paneles activos Inicio mide 1.492 px, dos veces el viewport. No lo toco aquí: recortar paneles es rediseñar contenido de otras fichas. Va al cierre."*

Resultado: el usuario ve un Inicio de escritorio depurado y un Inicio móvil con cinco bloques, y **nadie había decidido si eso era deliberado o pendiente**. Verificado antes de decidir: ninguna de las 24 fichas del handoff móvil retira un bloque de Inicio, y el cierre (ficha 18) tampoco lo trae escrito.

**El hallazgo que obliga a decidir:** de los tres argumentos del ADR 070 D2, **solo uno es de ancho de pantalla**.

- "El resumen semanal es tendencia y la tendencia no tiene fecha límite" no habla de píxeles. Vale igual en un teléfono, y más: ahí el alto es el recurso escaso.
- "La actividad reciente cuenta el pasado y comparte anatomía con la lista de obligaciones, así que a primera vista se confunden y solo una de las dos exige algo" tampoco. La confusión de anatomía es peor en una columna que en tres.
- "Accesos rápidos duplica la barra lateral" **sí** es de ancho: la barra lateral no existe bajo 1024px.

---

## Decisión

### D1. El resumen semanal sale de Inicio en móvil

Se retira `#panel-resumen` del DOM, no se oculta: con escritorio y móvil fuera, dejarlo sería marcado muerto. Mismo criterio que el ADR 070 D2 aplicó a los dos contenedores de escritorio de IN.9d.

Su cálculo (`resumen/logic.js`, nueve funciones puras con sus tests) **se conserva entero y sin consumidor**, esperando a la ficha 16. Es lo que el ADR 070 D2 ya había decidido como destino ("vive en Análisis") y Análisis no está auditada: borrar hoy la lógica que la próxima ficha puede adoptar sería churn. Queda anotado como deuda con dueño, no como código huérfano sin explicación.

### D2. La actividad reciente sale de Inicio en móvil

Se retira `#panel-actividad-reciente`, que en móvil vivía **fusionado** con Accesos rápidos en una sola celda (IN.8g, ADR 034 D7). La celda sobrevive con Accesos solo.

**Su función no se pierde y no había que moverla:** la sección Movimientos completa ya está a un toque desde la hoja "Más" (`index.html`, `mas-tile` a `#movimientos`), y la ficha 07 confirmó ese sitio en su hallazgo G3, con la razón escrita de por qué no se saca de ahí. Con el panel fuera, `renderActividadReciente()` y sus dos helpers se retiran; `movimientosRecientes()` en `logic.js` queda sin consumidor y con sus tests, igual que el resumen semanal.

### D3. Accesos rápidos se queda, y su razón es la que lo distingue

Es el único de los tres cuyo argumento era de ancho. En móvil no hay barra lateral que lo duplique, así que sigue cerrando la pantalla y `render.js` lo sigue ocultando desde 1024px.

Con eso, `_repartoCierreInicio()` pasa de decidir sobre dos elementos a decidir sobre uno.

### D4. "Tu progreso" no se toca en esta decisión

El tablero ya lo tenía anotado como candidato sin tarjeta ("auditar si **Tu progreso** pertenece a Inicio"), y **no es uno de los tres módulos del ADR 070 D2**: es universal en las dos plataformas por decisión propia (LG.2d, [ADR 032](032-logros-v2-niveles-y-habitos.md) D6). Retirarlo exigiría el argumento que esta decisión no tiene, así que se queda y sigue como candidato para la ficha 18, junto con la ficha 17, que audita Logros.

### D5. Lo que no se mueve

El hero del saldo con su detalle por cuenta, el grupo "Atención hoy" con sus avisos y "Pendientes del mes", "Próximas prioridades", el saludo, el engranaje a Ajustes, el estado vacío y las cuatro decisiones de contenido de la ficha 02 (las salidas a "Por pagar", los accesos por defecto, el alcance declarado del resumen semanal, y "Ver todo" condicionado). **Ninguna medida de la retícula se mueve**, igual que decidió la ficha 02.

---

## Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| Dejar los tres enteros en móvil, como decía el ADR 070 D2 | Dos de sus tres argumentos no dependen del ancho, así que la frase se sostenía en el alcance de la iniciativa y no en el razonamiento. Y el usuario reportó dos veces la asimetría como un defecto |
| Retirar también Accesos rápidos, por simetría con escritorio | Su motivo era explícitamente de ancho: en móvil no hay barra lateral que lo duplique. Quitarlo dejaría a móvil sin atajos y sin la puerta de "Personalizar" |
| Retirar también "Tu progreso" | No es uno de los tres módulos del ADR 070 D2 y su universalidad es una decisión propia (ADR 032 D6). Sin argumento nuevo, se queda |
| Ocultar los dos paneles por CSS en vez de retirarlos del DOM | Es marcado muerto en los dos anchos. El ADR 070 D2 ya resolvió este mismo caso retirando del DOM |
| Esperar la ficha 18, donde la ficha 02 lo dejó parqueado | Es lo correcto si nadie lo reclama. Esteban lo reclamó dos veces, y el argumento ya estaba escrito y era transferible: esperar habría sido dejar vivo un defecto reportado por no llegarle el turno |
| Borrar también `resumen/logic.js` y `movimientosRecientes()` | La ficha 16 (Análisis) es el destino que el propio ADR 070 D2 le dio al resumen semanal, y no está auditada. Borrar hoy lo que la próxima ficha puede adoptar es churn |
| Mover el resumen semanal a Análisis en esta misma decisión | Análisis ya tiene su propio "patrón semanal" y su auditoría es la ficha 16. Meterle un panel sin auditar la sección es legislar sobre ella |

---

## Consecuencias

- **Inicio en móvil baja de cinco bloques a tres:** el hero del saldo, "Atención hoy" y "Tu progreso", más Accesos rápidos cerrando la pantalla. Es la misma jerarquía que escritorio, con la diferencia que sí tiene motivo.
- **Se recuperan los dos bloques más altos de la pantalla.** La ficha 02 midió Inicio en 1.492px con los paneles activos, dos veces el viewport; esta decisión ataca justo esa medición, que era su observación sin decisión.
- **Nada pierde función.** El historial completo está a un toque en "Más" y la tendencia semanal tiene su casa asignada en Análisis desde el ADR 070 D2.
- **Dos módulos de lógica quedan sin consumidor, a propósito y con dueño escrito:** `resumen/logic.js` entero y `movimientosRecientes()`. Sus tests unitarios se conservan, así que la lógica sigue verificada el día que la ficha 16 la adopte.
- **30 tests se retiran** porque su sujeto deja de existir (11 del panel semanal, 18 del panel de actividad y 1 que comparaba los dos renderizadores de movimientos), más un test E2E. No es pérdida de cobertura: es cobertura de código que ya no se ejecuta.
- **`_repartoCierreInicio()` se simplifica** a una sola decisión, y su documentación deja de describir un reparto que ya no existe.
- **Lo que sigue abierto:** si **"Tu progreso"** pertenece a Inicio (candidato del tablero, y la ficha 17 audita Logros), y si la ficha 16 adopta el resumen semanal o si su lógica se retira. Las dos preguntas van a la ficha 18 con este ADR como antecedente.
