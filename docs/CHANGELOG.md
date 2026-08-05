# Changelog - Finko Claude

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-08)

### feat(me-deben): PE.6c y PE.6e, rendimiento del préstamo e historial por persona · 2026-08-05

Cierra **PE.6c** y **PE.6e** (D4 y D5 del [ADR 047](DECISIONS/047-me-deben-v2-intereses-e-historial.md)). Ficha: [`contexto/me-deben.md`](contexto/me-deben.md). Se entregan juntas a propósito: las dos son derivaciones puras sobre `Personal.abonos[]` que PE.6b dejó listo, sin schema, sin persistencia nueva y sobre el mismo render. Partirlas habría costado dos ciclos de verificación para el mismo riesgo.

- **`calcularRendimiento()` (D4).** Interés ganado, interés devengado por cobrar, capital recuperado, porcentaje recuperado y rentabilidad. Todo derivado: persistir un derivado es garantizar que se desincronice del historial que lo produce.
- **La rentabilidad no se anualiza, a propósito.** Anualizarla convertiría el número en una promesa de retorno comparable con un CDT, y esto es un préstamo informal a un conocido que puede pagar tarde, a medias o nunca. La cifra honesta es la que ya entró: interés cobrado sobre capital prestado. Por lo mismo, el interés devengado y no cobrado sale como campo aparte y nunca se suma a lo ganado (mismo criterio que lo excluye del patrimonio desde PE.7).
- **En la fila, el copy cambia según el momento.** Abierto: "Interés: 2% mensual · Ya ganaste $20.000, el 4% de lo prestado". Liquidado: "Te dejó $20.000 en intereses, el 4% de lo que prestaste", porque ahí ya no hay nada que seguir, hay un resultado. Reemplaza el "Ya cobraste X en intereses" de PE.1, que decía el monto sin decir si era mucho o poco.
- **`estadisticasPorPersona()` (D5)**, plegado bajo el resumen y **solo para quien tiene más de un préstamo**: con uno solo el bloque repetiría la fila que está justo debajo.
- **Describe, no califica** (D5 y [ADR 003](DECISIONS/003-tono-neutral-profesional.md)). Sin score, sin banda, sin semáforo sobre una persona que ni siquiera usa la app. **La lista se ordena por total prestado, no por puntualidad**: ordenar por quién paga mejor es construir un ranking de confiabilidad por la puerta de atrás.
- **La puntualidad solo cuenta préstamos con fecha pactada**, porque sin fecha no hay nada respecto a lo cual llegar tarde, y contar esa ausencia como falta sería inventar un incumplimiento. Un préstamo abierto cuya fecha ya pasó cuenta como retraso aunque siga vivo; uno cuya fecha aún no llega no cuenta a ningún lado. El promedio de días solo mira los liquidados: uno abierto no tiene duración todavía, y meterlo con la fecha de hoy inflaría el promedio cada día sin que pase nada.
- Las personas se agrupan sin distinguir mayúsculas ni espacios de más ("Tía Marta" y "tía marta " son la misma) y se muestra la última grafía escrita.
- Verificado en la app real: Tía Marta con dos préstamos muestra "2 préstamos: le prestaste $700.000 y te devolvió $520.000 / Con fecha pactada: 1 a tiempo, 1 con retraso / El préstamo que cerró lo cerró en 31 días", Carlos (un solo préstamo) no aparece en el bloque, y su fila dice "Ya ganaste $20.000, el 5% de lo prestado". 26 tests unitarios nuevos y 1 reescrito (el de máscara de DIS.3 V-4, por el copy nuevo). 3814 unit + 263 E2E + lint verdes. SW v493 a v494.
- **Queda abierta PE.6d** (estados visuales, D6): espera a IV.2 en producción, como manda el punto 2 de "Qué falta para cerrarlo" del ADR 047.

### feat(me-deben): PE.6b, historial de abonos con bump de schema · 2026-08-05

Cierra **PE.6b**, la rebanada bisagra de [PE.6](BOARD.md): D4 (rendimiento) y D5 (confianza) del [ADR 047](DECISIONS/047-me-deben-v2-intereses-e-historial.md) dependen de ella. Ficha: [`contexto/me-deben.md`](contexto/me-deben.md).

- **`Personal.abonos[]`, schema v34.** Hasta ahora solo existía el acumulador `pagado`: un préstamo con cinco abonos y otro con un solo pago eran indistinguibles. Cada abono guarda `fecha`, `monto`, `aCapital`, `aInteres` y la `cuentaId` donde entró el dinero.
- **El desglose se guarda, no se recalcula.** Reconstruirlo después es imposible: depende del interés devengado a esa fecha, que el abono siguiente ya movió.
- **Resuelto el punto 1 de "Qué falta para cerrarlo" del ADR 047** (historial vacío vs. abono sintético) **a favor del abono sintético.** Un préstamo con `pagado > 0` migra con UN abono `agrupado: true` que refleja el acumulado, sin tocarlo. Con historial vacío, la suma del historial y `pagado` discreparían desde el día uno y todo lo que se derive de él cargaría una rama de excepción permanente. La migración no inventa lo que no sabe: no reparte el acumulado en fechas, no adivina la cuenta, y la marca `agrupado` es lo que le dice a la vista que no presuma precisión ("Antes de este historial", no una fecha). El desglose capital/interés sí se reconstruye, porque `interesPagado` ya lo venía acumulando.
- **Invariante nuevo:** la suma de `monto` del historial es igual a `pagado`. Por eso el alta con algo ya abonado siembra su primer abono en vez de nacer vacía.
- **Cambiar la tasa no reescribe los abonos ya recibidos.** El historial es registro de lo que pasó: su desglose fue real cuando se cobró y reetiquetarlo hacia atrás sería inventar historia. Los acumuladores del préstamo sí se recalculan, como desde EDIT.1.
- **En la fila, plegado.** `<details>` nativo bajo el resto de hints, cero JS, mismo mecanismo que los desplegables de Ajustes. La fila sigue anclando el pendiente (regla R19): el historial es consulta, no lo que se decide de un vistazo. Los montos pasan por el helper `m()` y respetan el ojo de Inicio (regla R20).
- Verificado en la app real con un estado v33 sembrado: los dos préstamos con pagos previos migraron a un abono agrupado (uno de ellos con su reparto $100.000 capital / $20.000 interés), el de $0 quedó con historial vacío, y cobrar $50.000 de Tía Marta anexó un abono fechado con `cuentaId`, subió el saldo de $1.000.000 a $1.050.000 y dejó `_version: 34` con la suma del historial igual a `pagado`. 31 tests unitarios nuevos (3788 unit + 263 E2E + lint verdes). SW v492 a v493.
- **Fuera de esta rebanada:** PE.6a (D1/D2) ya la cubrían PE.1 y PE.7, el modal de cobro muestra pendiente, capital e interés acumulado desde entonces; PE.6d sigue esperando a IV.2 en producción, como manda el punto 2 del ADR 047.

### feat(tesoreria): MC.13e-2g, el asistente abre educando y reparte sus accesos por paso · 2026-08-05

Cierra **MC.13e-2g**, el rediseño del asistente (MC.13e-2 completo) y con él **MC.13** entera: motor y asistente en producción. Commit `f755c40`. Ficha: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md). Decisiones: [ADR 061](DECISIONS/061-educacion-antes-de-repartir.md).

- **La educación va delante de la acción sin cobrar un clic** (punto 9 del brief). `#modal-distribuir-body` queda en dos bloques del mismo scroll: arriba "Así reparten los expertos" (barra 50/30/20 + por grupo su porcentaje de referencia, el real del usuario al lado y qué entra en el grupo) y los chips de método; abajo el shell paginado intacto y prellenado. **No es un paso paginado a propósito:** un Paso 0 cumplía el punto 9 al pie de la letra pero convertía 3 pasos en 4 en el flujo más repetido de la app, que es lo contrario de lo que pedía la auditoría de UX del 2026-07-21. Así queda resuelta esa tensión, que la tarjeta tenía abierta.
- **Costo medido y declarado:** el bloque mide 299px a 320px de ancho, así que "Monto a distribuir" nace a ~547px del tope del cuerpo del modal en vez de ~278px. En 320x720 son **un** gesto de scroll hasta el checklist, que ya llega marcado; sin desborde horizontal.
- **Cada acceso cruzado en el paso de su categoría** (punto 10). Los `ctas` que MC.13e-2a había retirado de la tarjeta vuelven repartidos: deudas → Necesidades, fondo e inversiones → Ahorro/deudas/inversiones, Límites de gasto → Estilo de vida. El acceso cuyo paso no existe **se descarta, no se reubica** (reubicarlo sería justo lo que el punto 10 prohíbe); el de Límites nunca se pierde porque su paso siempre existe.
- **Navegar desde dentro del modal ya no lo deja abierto detrás.** Los accesos usan la acción built-in `ir-a-seccion`, y el hint "Ponle una fecha en Metas/Reservas" de las filas sin fecha pasa a usarla también: era un `<a>` pelado que cambiaba de sección con el asistente encima. Defecto preexistente, corregido acá por coherencia.
- **El foco de apertura ya no es `#distribuir-monto`.** Ese campo quedó debajo del bloque educativo y enfocarlo con `preventScroll` habría dejado el foco fuera de la vista; lo fija `abrirModal` (botón de cerrar). Un test E2E de MC.7f que lo daba por sentado se reescribió.
- Las tres cifras de la referencia salen del preset `50-30-20` de `PRESETS_DISTRIBUCION`, no del HTML, y el ancho de los segmentos se escribe como propiedad JS tras el `innerHTML` (cero `style=""`, cero porcentajes duplicados en CSS). `.distribucion-rows`/`.distribucion-rows__razon` se borran al quedar sin consumidor; `.distribuir__cta` se reescribe para su consumidor nuevo (era CSS muerto desde que el asistente pasó a modal). Sin bump de schema.
- Verificado en la app real (servidor propio, 320px y 375px): bloque educativo con la barra al 50/30/20 y "tú 35/45/20" del split calculado, un acceso por paso, y el acceso de deudas cerrando el modal y aterrizando en Deudas. 9 tests unitarios nuevos + 3 E2E nuevos + 2 reescritos. 3757 unit + 263 E2E + lint verdes. SW v490 a v492.

### feat(transversal): LEG.2, aceptación obligatoria versionada · 2026-08-04

Cierra **LEG.2**. Commit `53becc8`. Ficha: [`contexto/transversal.md`](contexto/transversal.md).

- **Onboarding gana paso 2**: tras el nombre, un checkbox único ("Acepto los Términos y condiciones, la Política de privacidad y el Tratamiento de datos personales") con los tres como enlaces al Centro Legal (reusa la acción `abrir-legal` de LEG.1). `S.onboarded` solo pasa a `true` al aceptar, no al escribir el nombre.
- **Gate independiente para usuario existente** (`#aceptacion-legal`): se abre solo si `S.onboarded === true` y `config.legalAceptado` está ausente o es de otra versión que `VERSION_LEGAL`. Bloqueante a propósito: sin botón de cerrar, y el `Escape` global lo ignora (`data-bloqueante`, nuevo guard en `actions.js`); el onboarding conserva su contrato de siempre (Escape sí lo cierra y reaparece la próxima visita).
- **`config.legalAceptado: { version, fecha } | null`** (schema v33). Usuario nuevo arranca en `null`. Usuario existente con datos ya guardados queda **grandfathered**: la migración le asigna la versión histórica `Borrador v0.1` (hardcoded a propósito, mismo precedente que `REMAPEO_TIPO_DEUDA` en v18 a v19), no `null`. Sin el grandfather, el día del despliegue habría bloqueado retroactivamente a todo usuario real y roto el sembrado `onboarded: true` de las 11 suites E2E existentes (ninguna trae `legalAceptado`).
- **No espera al checklist de contenido** de [`legal/README.md`](legal/README.md) (responsable, correo de contacto, licencia del código, revisión de abogado colombiano): ese checklist bloquea el paso del paquete a v1.0, no el mecanismo de aceptación, que corre igual sobre la versión vigente (`Borrador v0.1`). Cuando el paquete suba de versión, el gate de re-aceptación se activa solo.
- Onboarding verificado en la app real (servidor propio, puerto aislado del compartido): paso 1 a paso 2, checkbox obligatorio (sin marcar no avanza), enlaces al Centro Legal abren sobre el gate sin romperlo, `Escape` ignorado en el gate de re-aceptación. 6 tests unitarios nuevos (`aceptacion-legal.test.js`) + 4 de migración v33 (`storage.test.js`) + 2 E2E nuevos y 1 reescrito (`smoke.test.js`, suite Onboarding). 3748 unit + 260 E2E + lint verdes.

### feat(ahorro): AH.5, D2+D3 del ADR 049, hero educativo y aporte directo baja a secundario · 2026-08-04

Cierra **AH.5**. Commit `dfff037`. Ficha: [`contexto/ahorro.md`](contexto/ahorro.md). D1 y D4 ya estaban en producción (AH.5a/AH.5b); cierra las cuatro decisiones del [ADR 049](DECISIONS/049-fondo-de-emergencia-v2.md).

- **D3:** la tarjeta activa abre con una línea de propósito ("Tu protección para cuando algo se dañe o dejes de recibir ingresos") antes del nivel y de cualquier monto. El estado vacío ya lo cumplía (`fondo-card__explica`); la línea nueva lleva el mismo tono a la versión con datos.
- **D2:** "Registrar un aporte" deja `.fondo-card__principal` (botón ancho, color del dominio) por el mismo ghost/secundario que "Editar": el flujo principal ya es "Distribuir mi ingreso" (D1); el registro directo queda para aportes fuera de ciclo. `.fondo-card__principal` se conserva solo para "Empezar mi fondo" del estado vacío.
- **GU.1a (pregunta del hero vacío apilada sobre el banner) sigue abierta:** D3 no la tocó, la tarjeta activa nunca comparte pantalla con el banner (`renderBannerProposito` lo oculta con `fondoEmergencia.activo`). Sin handoff de diseño: se siguió la convención ya escrita en `view.js`/`analysis.css`.
- 4 tests nuevos/reescritos + 5 movidos a `[data-action=...]` para no chocar con el botón nuevo. 3738 unit + 260 E2E + lint verdes. SW v489 a v490.

### feat(personales): EDIT.1, editar sin destruir un préstamo · 2026-08-04

Rebanada Me deben de **EDIT.1** (patrón P3 de la auditoría de UX/producto), **cierra la tarjeta completa** (Metas, Apartados, Inversión y Me deben ya validaron el patrón). Commit `684e228`. Ficha: [`contexto/me-deben.md`](contexto/me-deben.md).

- Botón "Editar" en cada fila abre el mismo modal con los datos actuales prellenados; la cuenta de origen no se vuelve a preguntar (se decide una sola vez al crear, ADR 053), se muestra como nota de solo lectura.
- `normalizarPersonal(datos, existente = null)` gana la rama de edición: conserva el histórico de pagos (`pagado`, `capitalPagado`, `interesPagado`, `interesPendiente`, `ultimoPago`) y solo recalcula `liquidado`; la transición de tasa sigue el mismo criterio que al crear (con interés a sin interés limpia los acumuladores, sin interés a con interés asume lo pagado como capital).
- Con cuenta de origen, editar el monto ajusta el saldo por delta (ADR 053 I3): baja devuelve dinero sin preguntar, sube descuenta de más con confirmación si deja la cuenta en negativo. `_guardarPersonal()` pasa a `async` para ese `confirmar()`.
- **Bug encontrado y corregido en la misma tarea:** la primera versión de la rama de edición omitía `motivo`/`fechaLimite` si venían vacíos, igual que la rama de crear; como `editar()` funde por `Object.assign`, borrar esos campos en el form no los limpiaba, el valor viejo sobrevivía. Se corrigió para que la rama de edición los asigne siempre, aunque queden vacíos.
- 2 tests unitarios nuevos que fijan el bug (borrar `motivo` o `fechaLimite` al editar los limpia de verdad) + los de la rama de edición en general. Verificado en la app real: crear, editar renombrando y bajando el monto (borra motivo/fechaLimite y confirma que desaparecen de `localStorage`), editar con cuenta de origen bajando el monto (devuelve saldo sin preguntar) y subiendo el monto lo suficiente para dejarla en negativo (dispara la confirmación peligrosa con el copy exacto y aplica el delta al confirmar).
- 3736 unit + 259 E2E (1 flaky, pasó en reintento) + lint verdes. SW v489 a v491 (la v490 intermedia vino de una sesión paralela en el mismo worktree).

### feat(shell): INT.1b, las hijas de Ahorro se anidan y el sidebar cabe · 2026-08-03

Cierra **INT.1b** (D6 del [ADR 059](DECISIONS/059-interfaz-de-escritorio.md), mitad) y **BUG-026**. Commit `4f87f77`. Ficha: [`contexto/transversal.md`](contexto/transversal.md).

- **El defecto que cierra:** a 1280x799 (portátil de 13") el nav desbordaba 41px bajo su propio scroll interno. La mitigación que el proyecto creía tener (`@media (max-height: 800px)`, compactando filas/grupos/rótulos) nunca se aplicaba: sus cuatro declaraciones tenían la misma especificidad que las reglas incondicionales del mismo archivo, escritas más abajo, y perdían la cascada (BUG-026, hallado al verificar la auditoría de Interfaz contra el código).
- **Fondo, Metas, Reservas e Inversión pasan de filas permanentes a sub-nivel** (`.nav-subnav`): `shell.js` (`markActiveNav`, `GRUPO_AHORRO`) lo despliega solo mientras el hash activo pertenece al grupo Ahorro. El sidebar baja de 14 filas fijas a 9 (grupo cerrado) y recupera los ~160px que le faltaban: medido, el nav pasa de 648px/607 disponibles a 608px/608, sin desborde. La regla de compactación de emergencia se **borró en vez de repararse**: dejó de tener razón de ser.
- **Selector por `aria-controls`, no por `data-section`:** el botón "Más" (bottom nav, oculto en desktop) también gana `data-section="ahorro"` cuando el hash es `ahorro` (`_rotularMas`, patrón previo), así que `data-section` deja de ser único justo en ese caso. `[aria-controls="nav-subnav-ahorro"]` es el selector estable; lo encontró un test E2E antes de llegar a producción.
- **`.section__volver` de las 4 hijas se oculta en desktop** (`--ahorro-hija`, `responsive.css`): la casa ya está anidada en el sidebar, así que el volver es redundante ahí. Intacto en móvil, donde sigue siendo la única salida vertical de la PWA instalada.
- **Acota el ADR 056, no lo revierte** (regla 2.7): el punto 8 pasa de "las 4 entradas directas son permanentes" a "contextuales, dentro del grupo". Nota agregada al propio ADR.
- **Tradeoff aceptado, documentado en el ADR:** una hija ya no es un clic directo desde cualquier sección; hace falta abrir "Ahorro" primero. 4 tests E2E que clickeaban `#metas`/`#inversion` directo desde Dashboard se movieron a `page.goto()` (suites que prueban contenido, no navegación) o al camino de dos clics (suite que sí prueba navegación).
- 3 tests unitarios nuevos (`shell-nav.test.js`: oculto fuera del grupo, desplegado en la casa y en las 4 hijas, replegado al salir) + 5 E2E nuevos (anidado, `scrollHeight` ≤ `clientHeight` a 1280x799, volver oculto en desktop, camino de dos clics, DOM completo intacto para accesibilidad). 3729 unit (5 fallas preexistentes de `compromisos.test.js`, ajenas, confirmadas contra HEAD sin este cambio) + 259 E2E + lint verdes. SW v488 a v489.

### feat(analisis): CFG.2b, Finko infiere si debes declarar renta y lo enmarca por situación laboral · 2026-08-03

Cierra **CFG.2b** y resuelve **D2 del [ADR 050](DECISIONS/050-perfil-fiscal-ubicacion-y-framing.md)**. Ficha: [`contexto/configuracion.md`](contexto/configuracion.md).

> **Nota de historia.** El código viaja en el commit `727d8c9`, que lleva el mensaje de CAT.3b: índice de git compartido con la sesión paralela, mismo cruce que ya documentan AH.5b e INT.1a. Se intentó tres veces separarlo y las tres el commit ajeno se llevó los archivos staged; no se reescribió la historia porque la rama tenía trabajo vivo de la otra sesión encima.

- **La decisión, no el diff:** el framing legal era la decisión abierta del ADR 050, reservada para Esteban, y él la delegó explícitamente al abrir la tarjeta. Se eligió la **alternativa C acotada**: Finko afirma la **regla general** ("superar cualquiera de los 5 criterios de la DIAN normalmente obliga a declarar") y ubica al usuario dentro de ella, pero nunca afirma su obligación como hecho personal. Se rechazó A (condicional puro) porque un "podrías" sobre un tope ya superado se lee como "no pasa nada", y B (solo criterios) porque era el estado que ya existía y no cerraba nada. Las tres reglas de redacción que quedan vinculantes para cualquier texto futuro del monitor están en el ADR.
- `inferirEstadoDeclarante()` en `analisis/logic.js`: 4 estados (`probable`, `posible`, `sin-conclusion`, `improbable`) más el encuadre por `perfil.situacionLaboral`, que cambia el mensaje sin cambiar la conclusión. El veredicto encabeza la card de renta y decide si el colapsable abre solo.
- **El checkbox "La DIAN me notificó" no se borró:** pasa a override **positivo**. Marcarlo fuerza `probable`; dejarlo en blanco no niega nada. Se conserva porque la DIAN notifica con datos que Finko no ve, y su ayuda ahora dice que dejarlo vacío es lo correcto si no se sabe. Sale a cambio de la lista de "situaciones que pueden requerir atención" del perfil fiscal: lo decía dos veces en la misma card.
- `detectarNudgesRenta()` pierde su rama de perfil fiscal, que **nunca se renderizó**: la vista filtraba los nudges `info` y solo pintaba el banner si había alerta alta o media, así que la condición "solo si no hay otros nudges" la hacía inalcanzable. Sus 2 tests se reemplazaron por 12 de la función nueva.
- Balance de tests: **+13 nuevos, -2 retirados** (los del nudge que nunca se renderizaba). 3726/3731 unit + 255 E2E + lint verdes; las 5 fallas restantes son las preexistentes de `compromisos.test.js`, ajenas y verificadas contra HEAD. Verificado en la app con los tres veredictos (probable por criterio, notificado por la DIAN, sin-conclusión). SW v486 a v487.

### fix(transversal): CAT.3b, los siete accesos crudos de ícono pasan por la resolutora · 2026-08-03

Cierra **CAT.3b**. Ficha: [`contexto/transversal.md`](contexto/transversal.md).

> **Nota de historia, no de producto.** El commit `727d8c9` lleva el mensaje de esta tarea y también trae 5 archivos de otra sesión paralela (`analisis/logic.js`, `analisis/view.js`, `config/view.js`, `nudges.css`, `analisis.test.js`, veredicto de declarante): compartíamos el índice de git y quedaron staged cuando corrí `pnpm run test:e2e` acá, mismo cruce que documentan las entradas de **AH.5b** e **INT.1a**. No se reescribió la historia; esa sesión cierra su propia tarjeta con su propia entrada cuando corresponda.

- **El defecto (D3 del ADR 058):** `presupuesto/view.js` (envelope + banner de alertas de límite) y `resumen/view.js` (categoría top de Inicio) leían `CATEGORIA_ICONO` crudo y caían a `c-otros` con una categoría personalizada, aunque el formulario de Gastos que la creó sí mostraba el ícono elegido. Cuatro accesos más del lado de Gastos fijos (`agenda/view.js` ×2, `gastos/logic.js`, `tesoreria/views/distribucion.js`) leían `CATEGORIA_AGENDA_ICONO` crudo por el mismo motivo, sin fallar hoy porque Gastos fijos todavía no acepta personalizadas (CAT.3c).
- Los siete pasan a `iconoDeCategoriaGasto()`, la misma resolutora global que ya usa el formulario de Gastos. `iconoPorOrigen()` (`gastos/logic.js`) gana un tercer parámetro opcional `personalizadas`; sin él se comporta igual que antes (compatibilidad con sus tests existentes).
- 3 tests nuevos que fijan el defecto (envelope, banner de alertas, categoría top de Inicio) + 1 que cubre el nuevo parámetro de `iconoPorOrigen()`. 3726 unit + 255 E2E + lint verdes (5 fallas preexistentes en `compromisos.test.js`, ajenas a esta tarea: confirmadas contra HEAD sin ningún cambio de sesión). SW v485 a v487 (dos bumps concurrentes durante el cierre, mismo patrón de sesión compartida).

### docs(transversal): GU.1a, auditoría del sistema de guía + revisión formal del ADR 016 · 2026-08-03

Cierra **GU.1a**. Sin cambio de código: auditoría de UX. Ficha: [`contexto/transversal.md`](contexto/transversal.md).

- **Adelantada por instrucción directa** frente a la recomendación original de la tarjeta ("después de las v2 grandes, o se hace dos veces"): alcance acotado a lo ya en producción, con el único hallazgo cruzado dejado para su sección v2, no resuelto acá.
- **Inventario de las 17 secciones de dominio** (`modules/dominio/*/view.js`) + `index.html` + `shell.js`: las 11 secciones del [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md) tienen su banner sin código muerto de EP.1-EP.6, sus empty states quedaron recortados sin repetir el banner, y el único `section__subtitle` que queda (Mis cuentas, "Fuentes de ingreso") es título de sub-bloque legítimo, no propósito. Las 6 secciones sin banner (Dashboard, Ajustes, Movimientos, Accesos, Import, Logros) siguen fuera, cada una con motivo propio verificado.
- **Único hallazgo:** el hero vacío de Ahorro apila su propia pregunta gancho sobre la del banner de propósito; queda anotado en `contexto/ahorro.md` para que **AH.5 D3** lo resuelva al rediseñar el hero, no antes.
- **Veredicto:** ADR 016 vigente sin desviaciones, no se re-corta en tarjetas por sección. Compuerta 3 (cero guion largo) verificada; sin `modules/` ni `tests/` tocados, no aplican las demás compuertas.

### docs(ahorro): AH.5b, cierre documental del compromiso por frecuencia real de ingresos · 2026-08-02

El código entró en el commit `e7703f0` (INT.1a, sesión paralela) sin su propio cierre: quedó staged en el índice compartido cuando esa sesión commiteó mientras corría `pnpm run test:e2e` acá. Esta entrada lo repara. Ejecuta D4 del [ADR 049](DECISIONS/049-fondo-de-emergencia-v2.md); D1 (aporte por distribución) ya estaba en producción. Ficha: [`contexto/ahorro.md`](contexto/ahorro.md).

- **El defecto:** el formulario y el medidor del compromiso de ahorro asumían "mensual" sin importar cómo cobra el usuario. Alguien con ingreso quincenal veía "¿cuánto quieres apartar cada mes?" y un medidor que se renueva el 1, aunque su plata entre dos veces al mes.
- **`frecuenciaPrincipalIngresos()` ya vivía en `infra/vencimientos.js`** esperando este consumidor (comentario explícito de MC.13c: "el fondo de emergencia (AH.5)"). `ahorro/index.js` la llama sobre `S.ingresos`, sin duplicar la tabla de frecuencias.
- **Mensual queda byte a byte igual.** `aportadoEnMes()` y el `_diasRestantesDelMes()` original no se tocan; los nuevos `aportadoEnPeriodo()`/`progresoCompromiso(..., frecuencia)` delegan en ellos cuando la frecuencia es Mensual o desconocida. Quincenal/Semanal/Diario ganan su propio rango calendario (`_rangoPeriodo()`): quincena 1-15/16-fin de mes, semana lunes-domingo, día el mismo día. Nunca una ventana móvil de N días: mismo criterio que ya rechazaba el archivo para el mes ("el 1 vuelve a cero, no arrastra los últimos 30 días").
- **La sugerencia de AH.2 sigue razonando en mensual** (ingresos y gastos fijos se piensan por mes) pero se muestra convertida: `montoPorPeriodo()` escala por `diasPorPeriodo(frecuencia) / 30`. El botón "Usar este monto" copia el valor ya convertido, no el mensual crudo: sin la conversión, un usuario quincenal habría duplicado su compromiso real de un clic.
- **`compromisoMensual` conserva su nombre de campo** (sin bump de schema): pasa a significar "compromiso del período que le corresponde al usuario", no "compromiso mensual necesariamente". El copy en toda la sección usa "cada mes/quincena/semana/día" de forma consistente (`etiquetaCadaPeriodo()`), una sola fuente de vocabulario.
- 15 tests unitarios nuevos (`aportadoEnPeriodo()`, `progresoCompromiso()` con frecuencia, `montoPorPeriodo()`, `etiquetaCadaPeriodo()`, un render con frecuencia Quincenal). Verificado en la app real con un ingreso Quincenal sembrado: la pregunta dice "cada quincena", la sugerencia y el botón "Usar este monto" convierten a $92.000 (la mitad de los $184.000 mensuales), el medidor dice "Quedan 14 días de la quincena". 3715 unit + 255 E2E + lint verdes. SW v484 a v485.

### feat(shell): INT.1a, el contenido de escritorio se centra y Movimientos entra al sidebar · 2026-08-02

Abre la iniciativa **INT.1** con su rebanada de menor riesgo, tras escribir el **[ADR 059](DECISIONS/059-interfaz-de-escritorio.md)** que formaliza las ocho decisiones de la auditoría de Interfaz. Ficha: [`contexto/transversal.md`](contexto/transversal.md).

> **Nota de historia, no de producto.** El commit `e7703f0` lleva el mensaje de esta tarea y **no contiene su código**: dos sesiones compartían el índice de git y ese `git commit` recogió lo que la sesión de Ahorro tenía staged (ver la entrada de **AH.5b**, que documenta el otro lado del mismo cruce). El código real de INT.1a viaja en el commit siguiente. La historia no se reescribió a propósito: `e7703f0` ya estaba citado por hash en la entrada de AH.5b, así que rehacerla habría roto esa referencia para dejar el mismo hecho sin explicar en ningún lado.

- **`.section` gana `margin-inline: auto`** (D7, regla R77). El tope de `1440px` existía desde siempre sin centrado, así que todo el sobrante quedaba de un lado: medido a 1920, `main` mide 1.680 y la sección 1.440, con **240px pegados al borde derecho**; a 2560 eran 880. Ahora reparte 120+120 y 440+440. Un vacío asimétrico no se lee como aire, se lee como algo que falta.
- **Movimientos entra al grupo "Seguimiento" del sidebar** (D6, mitad). Era el único de los 14 destinos sin entrada propia en escritorio: la que DIS.6/C6 agregó para cumplir R32 se puso solo en la hoja "Más", que es móvil, así que allá se llegaba únicamente por el enlace "Ver todo" de Actividad reciente, **que arranca `[hidden]` hasta que haya movimientos**. Reusa `i-saldo`, igual que su teja de la hoja: el sprite no tiene ícono propio.
- **Móvil no cambia**: el `nav-item--no-mobile` mantiene la fila fuera de la barra inferior, que conserva sus cinco ranuras, y Movimientos sigue teniendo allá su teja de siempre. Verificado a 390px.
- **Dos premisas del handoff quedaron corregidas al verificarlo contra el código, antes de escribir el ADR.** **PI7 es falso:** `--fk-bg-glass` sí tiene valor en tema claro (`themes.css`, `rgba(255, 255, 255, 0.75)`, desde el commit de CSS base), así que nunca bloqueó la barra superior; el ADR 057 y el tablero lo daban por abierto y se corrigen. Y el hallazgo E3 acredita una mitigación que no existe: nace **[BUG-026](BUGS.md)**, el bloque `@media (max-height: 800px)` del sidebar pierde la cascada en sus cuatro declaraciones (misma especificidad que las reglas incondicionales del mismo archivo, escritas más abajo). Medido con la media query activa: `min-height` computa 40px y no 36. El nav necesita 648px, dispone de 607 y desborda 41px, sin que esa regla compre uno solo. Se decide dentro de INT.1b.
- **R78, R79 y R80 entran a `DESIGN_SYSTEM.md`** con una tarea de retraso: el ADR 057 las pedía al cerrar IN.9 y el cierre de IN.9e no las escribió. **R75 a R77 quedan reservadas** para cuando cierre INT.1: la numeración del handoff asumía que Interfaz aterrizaba primero, así que la lista queda con un hueco declarado en vez de escrita al revés.
- Sin tests nuevos: no hay lógica nueva ni dato nuevo. Verificado en el navegador a 1920, 2560, 1280 y 390px. 3715 unit + 255 E2E + lint verdes. SW v483 a v484; una sesión paralela lo dejó en v485 durante este cierre, así que el bump que viaja con este commit es ese.

### fix(config): CFG.6, "Instalar Finko" y "Activar recordatorios" dejan de estirarse a ancho completo en tablet y escritorio · 2026-08-02

Avanza **CFG.6** (pase de escritorio/tablet + tema claro, alcance acotado; el inventario de configs faltantes, punto 1, sigue pendiente de CFG.1 a CFG.5). Ficha: [`contexto/configuracion.md`](contexto/configuracion.md).

- **El defecto:** los dos botones vivían sueltos dentro de `.config-section` (flex column sin `align-items`, stretch por defecto) y se estiraban a 932px en escritorio (1280px) y 660px en tablet (768px). El pase 2026-07-25 ya había corregido este mismo patrón para `.config-form`/`.config-danger` y los pares de `.config-actions--ambito`, pero no cubría estos dos botones sueltos.
- Nueva regla `.config-section > .btn { align-self: flex-start; min-width: 160px; }`, mismo patrón que "Guardar perfil". Verificado en el navegador a 390/768/1280px.
- **Tema claro revisado por código**, no por captura: `config.css` usa 100% `var(--fk-*)`, cero color hardcodeado. El Browser pane no compuso frames en esta sesión, así que no hay verificación visual real del punto 3; queda para una revisión en dispositivo.
- 26/26 tests de `config.test.js` verdes. SW v482 a v483.

### feat(inicio): IN.9e, estado vacio propio de escritorio, cierra la iniciativa IN.9 · 2026-08-02

Cierra **IN.9e** (ID6 del [ADR 057](DECISIONS/057-inicio-en-escritorio.md)), la ultima rebanada de la iniciativa "Inicio en escritorio": las cinco cierran. Ficha: [`contexto/inicio.md`](contexto/inicio.md).

- **El defecto que resolvia:** sin cuentas, `#hero-guia-saldo` solo tenia la version movil (icono + texto + CTA, ancho completo). Estirada a 990px se leia como una pantalla a medio cargar, no como el arranque de la app.
- **Dos versiones del mismo estado conviven en el DOM**, mismo patron que IN.9c/IN.9d: `.hero-guia__movil` (intacta) y `.hero-guia__escritorio` (pieza centrada `max-width: 620px`, tres pasos numerados: agregar cuentas, registrar un gasto, anotar una deuda). `render.js` no cambia: sigue togglenado un solo `hidden` en el contenedor padre, la CSS decide cual mitad se ve segun el ancho (`responsive.css`, mismo umbral 1024px que `_enEscritorio()`).
- **El copy de los tres pasos queda provisional** (PI5 del informe, pospuesto el 2026-07-31): fijar tono en una sola pantalla antes de la revision de UX Writing completa no es lo que el ADR aprobo. La estructura si esta aprobada.
- **El codigo ya estaba en el arbol** desde el commit `ab8c9a1` (CAT.3a) de una sesion paralela; este cierre verifica (3683 unit + axe verdes, `max-width` medido en 620px real en el navegador a 1280px) y pone la iniciativa IN.9 al dia en el tablero.
- Verificado en la app: sin cuentas, a 1280px se ve la pieza de tres pasos centrada; bajo 1024px, la guia de ancho completo de siempre, intacta.

### feat(agenda): CAL.5b, el lote tambien cubre deudas y se ofrece desde Inicio · 2026-08-02

Cierra **CAL.5a** con sus dos ampliaciones: el pago en lote deja de ser solo de gastos fijos y deja de vivir solo en el Calendario. No hay mecanismo nuevo. Fichas: [`contexto/calendario.md`](contexto/calendario.md) e [`contexto/inicio.md`](contexto/inicio.md).

- **Ningún dominio cambia de dueño.** El lote (su set, su modal, su escritura) sigue siendo de Agenda; la aritmética de la deuda sigue en Compromisos; el par gasto vinculado + baja de `saldoTotal` sigue en `infra/pago-compromiso.js` (ARQ.2 punto 2), que Agenda ya usaba para el fijo. Sumar deudas fue extender ese path, no abrir uno nuevo: `_registrarPagosFijos` pasa a `_registrarPagosCompromisos` y agrega una llamada a `bajarSaldoDeuda`, una vez por compromiso y con el total abonado (no por split, lo dice el contrato del helper).
- **La decisión que la tarjeta pedía explícita, "abono parcial dentro de un lote": el lote ofrece lo que FALTA de la cuota del mes, nunca la cuota completa.** Sumar la cuota entera sobre un abono previo habría cobrado dos veces. Ese faltante se topa además en `saldoTotal` (la última cuota de una deuda casi saldada es el resto, mismo criterio que `ajustarMontoAbono`) y una deuda saldada no aparece. Un fijo conserva su semántica binaria: cualquier gasto vinculado del mes lo cierra.
- **La regla se escribe una sola vez, en `pendientesDePagoDelMes`.** Es el mismo duplicado intencional ya declarado tres veces en `agenda/logic.js` por ADN #10 (`totalDia`, `totalesDelMes`), y el criterio calcado de `estadoPagoMes`. El handler no tiene una segunda aritmética de deuda: recibe el monto ya resuelto.
- **Inicio no importa a Agenda: emite `lote:abrir`.** Evento nuevo (10 en total), mismo patrón que `distribuir:abrir` en la otra dirección. El modal `#modal-pago-lote` vive en `index.html`, así que abre sobre el dashboard sin navegar. El CTA "Pagar los N" aparece con dos o más pendientes, mismo umbral que la tarjeta del Calendario.
- **Defecto preexistente que la entrada desde Inicio obligaba a arreglar:** "Pendientes del mes" listaba lo ya pagado (`detectarVencidosCompletos` solo mira el calendario, nunca los gastos), así que el CTA habría ofrecido registrar dos veces el mismo dinero y el bloque no se habría vaciado al pagar. Nace `vencidosSinPagar()` en `compromisos/logic/alertas.js`, envoltorio que le cruza `estadoPagoMes` del propio dominio; una deuda con abono parcial sigue listada. `detectarVencidosCompletos` no cambia de contrato: el nudge de mora y las alertas siguen razonando sobre el calendario puro.
- **El listener de `state:change` de Compromisos suma `gastos`** para el dashboard: pagar un fijo no toca la colección `compromisos`, y sin eso el bloque no se repintaba. Mismo precedente que CAL.4a en Agenda.
- **Cae solo el hallazgo (2) que DIS.11 dejó abierto**: `.cal-day--vencido` hereda el alcance de `pendientesDePagoDelMes`, así que un día con cuota de deuda vencida ya se marca. Nada que sincronizar a mano: las dos piezas leen el mismo set.
- 32 tests unitarios nuevos (17 de deudas en el lote y del subtítulo de la fila, 5 de `vencidosSinPagar`, 3 del CTA de Inicio) + 2 E2E nuevos. Verificado en la app a 375px: cuota topada al saldo ($200.000 de cuota con $90.000 de saldo cobra $90.000), resto de cuota tras un abono de $120.000 sobre $300.000, y desde Inicio la cuenta baja $1.200.000, la deuda de $2.000.000 a $1.700.000 y el bloque se vacía sin cambiar de sección. 3679 unit + 254 E2E (1 flaky ajeno, IN.9c) + lint verdes. SW v479 a v480.

### fix(compromisos): BUG-018, la fecha por defecto del abono deja de irse a manana · 2026-08-02

Cierra **BUG-018**, el único error abierto con impacto en el uso diario. Fichas: [`contexto/deudas.md`](contexto/deudas.md) y [`contexto/transversal.md`](contexto/transversal.md).

- **El defecto:** el formulario de abono inicializaba la fecha con `new Date().toISOString().slice(0, 10)`. Colombia es UTC-5, así que desde las 7 p.m. hora local esa cadena ya es la de mañana. Reproducido en producción: abono del 24 de julio a las 11:50 p.m. guardado y visible en Movimientos como "25 de julio". Es el único de los cinco sitios que **persistía** el dato malo.
- **El arreglo sugerido en `BUGS.md` resultó innecesario.** Proponía mover `isoFecha()` de tesorería a `infra/utils.js` como única fuente de "hoy en ISO". Esa fuente **ya existía**: `hoy()` en `infra/utils.js`, con getters locales y su JSDoc diciendo que es segura en cualquier huso. No hacía falta mover nada, solo llamarla. Cinco sitios pasan a usarla: el abono, la alerta de deudas durmiendo, los dos nombres de archivo de backup y `personales/view.js`, cuya `_hoyISO()` era una copia literal de `hoy()` y se borró.
- **Lo que NO se tocó, con su razón.** `isoFecha(d)` (tesorería) y `_iso(d)` (privada de `infra/vencimientos.js`) formatean una fecha **cualquiera**, no "hoy", y ya son locales: promoverlas sería refactor preventivo. `fechaCobertura` (`ahorro/logic.js`) usa `toISOString()` a propósito, sobre un `Date` construido en UTC a mediodía; no es el mismo patrón.
- **Nace [BUG-025](BUGS.md), el mismo defecto de huso del lado de la lectura.** `crear()` sella `fechaCreacion: new Date().toISOString()` (un instante UTC, correcto) y media docena de consumidores le cortan los 10 primeros caracteres y la tratan como fecha local. Una deuda creada el 31 de julio a las 8 p.m. cuenta como de agosto; un Bimestral creado esa noche ancla su ciclo un mes tarde. **No se arregló acá**: los registros ya guardados tienen el sello UTC, así que la salida (convertir en la lectura vs. campo nuevo) cambia lo que hoy muestra el Calendario y necesita decisión.
- 2 tests nuevos en `compromisos.test.js` que fijan `process.env.TZ = 'America/Bogota'` y el reloj a las 23:50 del 24 de julio: uno afirma que el formulario dice `2026-07-24` mientras la lectura UTC diría `2026-07-25`, el otro que de día nada cambia. Verificados también con el proceso en `TZ=UTC`, así que no dependen de la máquina. 3683 unit + 255 E2E + lint verdes. SW v481 a v482.

### fix(infra): BUG-017, el Quincenal con dia alto recupera su segundo cobro · 2026-08-02

Cierra **BUG-017**, que estaba abierto esperando decisión de producto y **cambia lo que muestra el Calendario**. Fichas: [`contexto/calendario.md`](contexto/calendario.md) y [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md). Nota de decisión en el D1 del [ADR 041](DECISIONS/041-motor-vencimientos-y-distribucion-v2.md).

- **El defecto:** `ocurrenciasEnMes` resolvía Quincenal como `[diaPago, diaPago + 15]` y **descartaba** el segundo si no cabía en el mes. Con `diaPago = 20` el segundo era el día 35 y desaparecía: el Calendario pintaba un dot en vez de dos, la checklist de Necesidades pedía la mitad del dinero que el mes cobra de verdad, y el pago en lote listaba una ocurrencia menos. Venía de `_diasParaCompromiso` de Agenda; MC.13a lo extrajo tal cual.
- **El arreglo: clampear al último día del mes**, no descartar. Día 20 + 15 vale 31 en julio; día 14 + 15 vale 28 en febrero, que es la segunda quincena real. Si el clamp coincide con el primer día (`diaPago` 31), hay un solo cobro: nadie cobra dos veces el mismo día.
- **Por qué clamp y no el arreglo que sugería `BUGS.md`** (pasar el cobro al día 5 del mes siguiente): `diasParaProximoPago` y `ultimoPagoHasta` ya clampeaban desde MC.4d, así que `ocurrenciasEnMes` era el outlier de tres y el clamp unifica en vez de inventar una cuarta regla. Y rodar al mes siguiente es **incorrecto en el caso común**: un quincenal de día 14 en febrero perdería su segunda quincena, que cobra el 28. La alternativa rechazada queda escrita en el ADR 041 D1.
- **Deja una sola regla de frecuencias.** `_candidatosDelMes`, la copia divergente que MC.13c-3 había declarado ese mismo día para no regresionar el datado, se borra: `ultimoVencimientoHasta` vuelve a leer `ocurrenciasEnMes` directo. La viñeta de la entrada de MC.13c-3 que anuncia esa divergencia queda superada por esta, y no se reescribe.
- **Cambio visible, aceptado:** en un mes con un quincenal de día alto aparece un dot más al cierre del mes. Los 3 tests que fijaban el defecto se reescribieron; ninguno de los otros 139 del motor se movió.
- 3 tests reescritos + 3 nuevos (clamp, coincidencia con el primer día, y el efecto aguas abajo en `obligacionesYAportesDelCobro`: $120.000 en vez de $60.000). SW v480 a v481: la v479 la puso MC.13c-3 y la v480 venía del árbol de una sesión paralela, así que este cierre bumpea sobre lo que había.

### feat(tesoreria): MC.13c-3, datar el cobro de todas las frecuencias · 2026-08-02

Cierra el último pendiente del motor de vencimientos ([ADR 041](DECISIONS/041-motor-vencimientos-y-distribucion-v2.md) D2): un ingreso Bimestral, Trimestral, Semestral o Anual ya no se queda sin clave de de-duplicación. Ficha: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md).

- **El agujero que cierra:** `estadoDistribucion` devolvía `'sin-fecha'` para esas cuatro frecuencias, y ese estado deja la acción disponible **a propósito** (no hay periodo que sellar). Consecuencia: quien solo cobra una vez al año podía abrir el asistente y repartir el mismo cobro cuantas veces quisiera, acreditando de más en cada pasada.
- **La regla de frecuencias sube a infra, no baja a Ahorro ni se copia:** `ultimoVencimientoHasta(item, hoyISO)` en `infra/vencimientos.js`, espejo hacia atrás de `ventanaDelCobro`. Las frecuencias largas necesitan el ciclo desde `fechaCreacion`, que solo `ocurrenciasEnMes` sabe calcular (`_caeEnCiclo`, privado): reimplementarlo en tesorería habría sido el cuarto motor que el ADR 041 existe para evitar.
- **`ultimoPagoHasta` pasa a envoltorio delgado** y **cambia de contrato**: recibe el ingreso entero en vez de `(frecuencia, diaPago)`. Sin el objeto no viaja `fechaCreacion` y un Anual se dataría todos los meses. Único consumidor en producción: `estadoDistribucion`. Mismo patrón de envoltorio que Metas y Apartados sobre la mitad B.
- **`FRECUENCIAS_CON_DIA` deja de ser una lista propia** y reexporta `FRECUENCIAS_DATABLES` de infra: pedir el día del mes y poder datar el cobro son la misma pregunta desde los dos lados, y el motor ya necesitaba la lista. Mismo precedente que `FACTOR_MENSUAL` en ese archivo (ARQ.2 punto 1).
- **Divergencia declarada con BUG-017, no arreglada:** datar clampea al último día del mes la segunda quincena que no cabe (día 14 + 15 = 29 en febrero vale 28), porque `ultimoPagoHasta` lo hace desde MC.4d y quitarlo dejaría sin clave el segundo cobro del mes. `ocurrenciasEnMes` en cambio la descarta. Las dos reglas vuelven a ser una cuando Esteban decida BUG-017, que ahora anota los dos sitios.
- **Diario y Semanal siguen sin datarse** y no es un hueco: caen por día de semana y el formulario no les pide `diaPago`. Darles fecha exigiría un campo nuevo, que es otra tarjeta.
- 23 tests nuevos (16 de `ultimoVencimientoHasta` en `vencimientos.test.js`, el resto en `tesoreria.test.js` sobre el envoltorio y el guard). 3656 unit + lint verdes. SW v478 a v479.

### feat(ahorro): AH.8, el carril de Inversion dice su etapa · 2026-08-02

Ejecuta la consecuencia que el [ADR 056](DECISIONS/056-la-casa-de-ahorro.md) dejó pendiente desde DIS.18, con el dato que **ARQ.1c** puso a su alcance esa misma jornada. Ficha: [`contexto/ahorro.md`](contexto/ahorro.md).

- **El carril pasa de "2 inversiones" a "2 inversiones, construyendo".** No es la etapa **en vez** del conteo: el conteo del D4 no decía en qué va el usuario (que es justo lo que dicen los otros tres carriles: tiempo cubierto, metas vivas, días al cobro) y la etapa sola no dice el tamaño de lo construido. El D4 no se revierte, se completa.
- `casaAhorro()` recibe `etapaInversion` (opcional, `number|null`); `ETAPA_INVERSION` en `ahorro/logic.js` pone las palabras. **Una etapa sin entrada en esa tabla cae al conteo solo**, nunca a una frase rota: la etapa 3 todavía no existe.
- **Las dos palabras son las mismas del chip de la sección hija a propósito** ("aprendiendo", "construyendo"): el carril lleva ahí y el usuario tiene que reconocer lo que leyó. Infra no guarda copy, así que la coincidencia la sostiene un test de `bolsas.test.js` que falla si una de las dos pantallas se renombra sola.
- **El conteo del carril ahora filtra igual que la etapa.** Antes era `S.inversiones.length` (contaba una inversión con monto 0, que la etapa no cuenta); ahora las dos cifras salen de la misma llamada a `etapaDePortafolio()`. Sin efecto práctico: la validación del formulario ya exige monto positivo.
- 4 tests nuevos (3 en `ahorro.test.js`, 1 de no divergencia en `bolsas.test.js`). Verificado en la app con 0, 1 y 2 inversiones. 3633 unit + E2E + lint verdes. SW v477 a v478.

### refactor(transversal): ARQ.1c, la etapa de Inversion al alcance de Ahorro · 2026-08-02

Reabre el punto 2 que **ARQ.1** había dejado como hueco intencional, a pedido de Esteban. Commit `b6a7825`. Fichas: [`contexto/ahorro.md`](contexto/ahorro.md) e [`contexto/inversion.md`](contexto/inversion.md). Sin cambio de comportamiento ni de UI.

- **El pedido llegó rotulado LEG.2**, ID que ya pertenece a la tarjeta legal de aceptación versionada (sigue abierta y sin tocar). Se cierra como **ARQ.1c**, que es donde el pendiente estaba documentado.
- `etapaDePortafolio(inversiones)` en `infra/portafolio.js`: el corte que decide el momento del portafolio (una inversión con monto es la etapa 1, dos o más la 2), más las abiertas y la lista que las produjo. Es la única pieza que la casa de Ahorro no podía obtener sin romper ADN 10, y la última de arquitectura que le faltaba a su carril de Inversión ([ADR 056](DECISIONS/056-la-casa-de-ahorro.md)).
- **Baja el criterio, no la sección.** `momentoInversion()` lo consume y conserva títulos, frases, anticipo, acción y avisos; `TOTAL_MOMENTOS` tampoco baja (el conteo "momento 1 de 3" es del relato de Inversión y no lo lee nadie más). Infra devuelve números y cada pantalla pone su vocabulario, mismo criterio que `estadoDeBolsa()`.
- **Lo que queda del carril es copy, no arquitectura:** `_estadoInversion()` sigue diciendo "2 inversiones" porque el D4 del ADR 056 define esa unidad, y cambiarla es decisión de producto. El dato ya está a una llamada de distancia.
- 5 tests nuevos en `bolsas.test.js` (bordes, umbral, filtro de monto y la invariante de que las dos puertas dan el mismo número). 3630 unit + 252 E2E (1 flaky ajeno, IN.9c) + lint verdes. SW v476 a v477.

### docs(transversal): ARQ.1, cierre documental · 2026-08-02

Cierra la tarjeta **ARQ.1** completa (patrón P7). Ficha: [`contexto/transversal.md`](contexto/transversal.md). Sin cambio de código: decisión de Esteban sobre los dos puntos que quedaban tras ARQ.1a/1b.

- **Handlers de "aportar"** (`_guardarAbonoMeta` en `metas/index.js`, `_guardarAporte` en `apartados/index.js`): quedan como duplicación intencional documentada, mismo criterio que ARQ.2 punto 3. El cálculo que hacían distinto ya está unificado desde ARQ.1a; lo que sigue duplicado es orquestación de UI, no lógica de negocio, y `infra/bolsas.js` es "sin DOM" a propósito.
- **Etapa de Inversión en el carril de Ahorro** (DIS.18): `_estadoInversion()` sigue mostrando un conteo en vez de la etapa de `momentoInversion()`. Es un cambio de UI real, no un refactor mecánico de cálculo duplicado: queda fuera del alcance de esta tarjeta.
- Tarjeta ARQ.1 sale de `docs/BOARD.md`.

### refactor(transversal): ARQ.1b, propiedad descuenta saldo (ADR 053) · 2026-08-02

Rebanada de **ARQ.1** (patrón P7 de la auditoría de UX/producto). Commit `bc25fe9`. Ficha: [`contexto/transversal.md`](contexto/transversal.md).

- `descuentaSaldo(tipoBolsa, registro)` en `infra/bolsas.js`: la tabla del ADR 053 I2 hecha código (Metas y Apartados siempre descuentan; el Fondo nunca, ADR 020; Inversión según si declaró `cuentaId`, INV.1), antes folclore repartido por dominio.
- `calcularActivos()` no llama esta función: su regla de suma no se toca de forma retroactiva (ADR 053 I4).
- 4 tests de invariante en `analisis.test.js`, incluido el que documenta la brecha aceptada I4: una inversión sin `cuentaId` igual suma a activos porque no hay forma de adivinar su procedencia con datos existentes.
- Pendiente de ARQ.1: los handlers de "aportar" (Metas/Apartados) y la etapa de Inversión del carril (DIS.18).
- 3625 unit + 253 E2E + lint verdes. SW v475 a v476.

### refactor(transversal): ARQ.1a, unificar progreso de las cuatro bolsas · 2026-08-02

Rebanada de **ARQ.1** (patrón P7 de la auditoría de UX/producto). Commit `87b6b04`. Ficha: [`contexto/transversal.md`](contexto/transversal.md).

- `progresoDeBolsa(objetivo, actual)` en `infra/bolsas.js` reemplaza las tres copias de `calcularProgreso`/`calcularProgresoFondo` (Metas, Apartados, Ahorro) más la cuarta inline de `estadoDeBolsa`, con el criterio de bordes más estricto (el del Fondo: objetivo no finito o acumulado negativo, antes solo protegidos ahí).
- `diasHastaFecha` de un solo argumento en `metas/logic.js` (redondeo distinto al de `infra/bolsas.js`) se retira sin reemplazo: no lo llamaba nadie en `modules/`, solo su propio test.
- Resuelve la pieza de arquitectura que necesita el Hub Ahorro para leer el progreso de Metas y Apartados sin importar esos dominios (ADN 10): la fuente única ya vive en `infra/bolsas.js`.
- Pendiente de ARQ.1: la propiedad "descuenta saldo" del ADR 053, los handlers de "aportar" y la etapa de Inversión del carril.
- 3621 unit + 253 E2E + lint verdes. SW v474 a v475.

### feat(inversiones): EDIT.1, editar sin destruir una inversión · 2026-08-02

Rebanada Inversión de **EDIT.1** (patrón P3 de la auditoría de UX/producto). Commit `886c5b7`. Ficha: [`contexto/inversion.md`](contexto/inversion.md). Me deben sigue pendiente de la misma tarjeta.

- Botón "Editar" en cada holding abre el mismo modal con tipo, nombre, monto, tasa EA, plazo y fecha prellenados; el origen del dinero no se vuelve a preguntar (se decide una sola vez al crear, ADR 053).
- `normalizarInversion(datos, inversionExistente = null)` preserva el `cuentaId` del registro existente en vez de leerlo del form (que ya no lo pregunta).
- Con cuenta de origen, editar el monto ajusta el saldo de esa cuenta por el delta entre el monto viejo y el nuevo (ADR 053 I3): si sube, descuenta de más (con confirmación solo si deja la cuenta en negativo); si baja, devuelve la diferencia sin preguntar.
- 13 tests unitarios nuevos (`normalizarInversion` en modo edición, `renderFormInversion` prellenado y nota de origen en solo lectura, botón Editar en la tarjeta). Verificado en la app real: editar campos, subir el monto con y sin cubrir el saldo (dispara y no dispara confirmación según corresponda), bajar el monto.
- 3621 unit + 252 E2E (1 flaky, pasó en reintento) + lint verdes. SW v473 a v474.

### refactor(transversal): ARQ.2, consolidar los calculos duplicados que quedan · 2026-08-02

Hallazgo de la auditoria de UX/producto (2026-07-21), patron P7. Commit `94475e1`. Ficha: [`contexto/transversal.md`](contexto/transversal.md). Sin cambio de comportamiento en lo que se toco.

- **Punto 1, `FACTOR_MENSUAL`**: `infra/financiero.js` exporta `FACTOR_MENSUAL_INGRESO` (antes privada); `tesoreria/logic/ingresos.js` la reexporta como `FACTOR_MENSUAL` en vez de mantener una copia identica. Las tablas de 9 entradas de `compromisos/logic/modelo.js` y `ahorro/index.js` no se tocan: son otra tabla, duplicacion ya intencional por ADN #10.
- **Punto 2, helper "registrar pago de compromiso"**: nuevo `infra/pago-compromiso.js` (`gastoDePagoCompromiso()` + `bajarSaldoDeuda()`). Sustituye 4 copias, no las 3 que nombraba el hallazgo original: `compromisos/index.js` tenia dos (`_guardarAbono` y el listener `distribucion:aplicar`), mas el apply de `tesoreria/acciones/distribucion.js` y `agenda/index.js` (`_registrarPagosFijos`). El descuento de la cuenta de origen queda en cada caller (cada uno lo hace en un momento distinto, a proposito). Desbloquea la parte de deudas de CAL.5b.
- **Punto 3, analizado y NO tocado** (decision de Esteban): `totalesDelMes`/`totalDia` de Agenda y `_obligacionesEnRango` de `infra/vencimientos.js` ya divergieron en comportamiento (esta ultima topa una deuda a `saldoTotal`, BUG-004; Agenda no). Unificarlas de verdad seria cambio de comportamiento, no el refactor mecanico que pedia la tarjeta.
- 3608 unit + 253 E2E (1 flaky, paso en reintento; ajena, no relacionada) + lint verdes. SW v472 a v473.

### feat(actualizacion): UPD.1, aviso de version nueva + resumen de novedades · 2026-08-02

Commit `fbaeba6`. Ficha: [`contexto/transversal.md`](contexto/transversal.md).

- **Aviso discreto con boton "Actualizar ahora"** cuando el SW aplica una version nueva pero `sw-register.js` no pudo recargar solo (modal abierto o input con foco al momento del cambio): antes el usuario no tenia ninguna senal hasta la proxima recarga casual. El caso seguro (sin guardas activas) sigue recargando en silencio, sin cambios. `sw-register.js` es un `<script>` clasico y no puede importar `EventBus`; avisa via `CustomEvent('sw:actualizacion-lista')` en `document`, que `modules/ui/sw-aviso.js` escucha.
- **Resumen de novedades una sola vez tras actualizar**: catalogo `NOVEDADES_POR_VERSION` (`constants.js`, vacio por ahora, se llena a mano en cada release que lo amerite) comparado contra `config.ultimaVersionVista` (bump de schema v31 a v32, migracion idempotente). Un usuario nuevo o uno que migra arranca "al dia" con el catalogo vigente, nunca ve de golpe todo el historial acumulado.
- Ambos mecanismos son independientes entre si: el resumen de novedades corre en cada arranque sin importar si la version nueva entro por la recarga silenciosa o por el boton del aviso.
- 8 tests unitarios nuevos (`ultimaVersionNovedadesConocida`, migracion v31 a v32). Verificado en la app real: banner y modal de novedades probados de forma aislada (import directo de los modulos nuevos + evento simulado), dado que el bootstrap completo no pudo correr en vivo por una rotura pasajera y ajena de otra sesion en `infra/bolsas.js` (ya resuelta por esa sesion). 3608 unit + 253 E2E (1 flaky, paso en reintento) + lint verdes. SW v470 a v472 (bump compartido con EDIT.1/apartados, en curso en paralelo).

### feat(apartados): EDIT.1, editar sin destruir una reserva · 2026-08-02

Rebanada Apartados de **EDIT.1** (patrón P3 de la auditoría de UX/producto). Commit `5929836`. Ficha: [`contexto/apartados.md`](contexto/apartados.md). Inversión y Me deben siguen pendientes de la misma tarjeta.

- Botón "Editar" en la tarjeta abre el mismo modal de siempre con los datos actuales prellenados (nombre, ícono, monto objetivo, fecha objetivo, nota); las plantillas rápidas se ocultan en modo edición.
- `normalizarApartado(datos, apartadoExistente = null)` preserva `montoActual`, `recurrente` y `periodoMeses` del registro existente (no vuelven a pasar por el form) y recalcula `completado` contra el objetivo nuevo, mismo patrón que **EDIT.1a** validó en Metas.
- 17 tests unitarios nuevos (`normalizarApartado` en modo edición, `renderFormApartado` prellenado, botón Editar en la tarjeta). Verificado en la app real: crear, editar nombre/monto/fecha, y editar bajando el objetivo por debajo del acumulado (recalcula `completado` a `true` sin tocar el acumulado).
- 3600 unit + 252 E2E + lint verdes. SW v470 a v472.

### perf(rendimiento): PERF.7c, warm-up de derivaciones pesadas en idle · 2026-08-01

Cierra **PERF.7** completo. Commit `156aa88`. Detalle: [`scripts/perf/BASELINE.md`](../scripts/perf/BASELINE.md).

- `bootstrap.js`, tras `renderAll()`, agenda un `requestIdleCallback` (fallback `setTimeout` sin soporte, ej. Safari) que llama a `precalentarAnalisis()` y `precalentarMovimientos()`, nuevas en cada `view.js`. Ambas solo invocan los memos ya existentes de PERF.2 con los mismos argumentos que sus renders reales; no tocan el DOM.
- Sin infra nueva: los memos de 1 entrada ya cacheaban por firma de argumentos, así que precalentar en idle es solo llamarlos una vez antes de que el usuario navegue.
- 6 tests unitarios nuevos (3 por función: no lanza sin contenedor, no toca el DOM, precalentar no cambia el resultado del render posterior). 3583 unit + 253 E2E + lint verdes. SW v467 a v470 (bump compartido con DV.2b/DV.2c, en curso en paralelo).

### feat(diseno): DV.2c, cascada de listas + resaltado de fila + retiro de bucles infinitos · 2026-08-01

D4 del [ADR 033](DECISIONS/033-direccion-visual-premium.md), independiente de DV.2a/b. Ficha: [`contexto/sistema-visual.md`](contexto/sistema-visual.md). Commits `680b0f0`; la cascada, el resaltado y la doctrina de DESIGN_SYSTEM.md ya habían entrado sin atribución en `ac10202`/`b03ca88` (misma condición de carrera de staging concurrente con la sesión de DV.2b que también los afectó a ellos, ver `1e21397`).

- **Cascada acotada de listas**: `.list-item:nth-child(-n+6 of .list-item)` anima con `cardIn` los primeros 6 ítems de cualquier lista (paso 35ms, cola ≤175ms); el selector CSS4 `of S` cuenta solo hermanos de esa clase, así que un divisor intercalado (cabecera de mes en Movimientos) no corre el conteo. El resto de la lista aparece sin animar.
- **Resaltado de fila recién guardada**: clase `.list-item--nuevo`, pseudo-elemento `::after` con `--fk-row-highlight-bg` que se desvanece por `opacity` en 600ms (compositor, nunca `background-color`). Helper `resaltarFilaNueva(el, dominio)` en `infra/animate.js`: no-op bajo `prefers-reduced-motion`, reentrante por elemento. **Sin consumidor todavía**: ninguna vista lo llama al guardar; lo conecta cada iniciativa v2 por sección cuando le toque (regla anti-sistema-paralelo del ADR).
- **Retiro de `empty-orbit`/`empty-float`**: los dos bucles `animation-iteration-count: infinite` ambientales de los empty states contradecían el veto de animaciones permanentes del propio brief. Cero `infinite` fuera de `a11y.css` en todo `styles/` (auditado).
- **Catálogo cerrado de animación** documentado en `DESIGN_SYSTEM.md`: toda animación nueva necesita fila propia con su propósito, o no se implementa.
- 3583 unit + 251 E2E + lint verdes. SW v469 a v470.

### feat(dv2): DV.2b, riqueza visual piloto: formas orgánicas + patrón · 2026-08-01

D3 del [ADR 033](DECISIONS/033-direccion-visual-premium.md), desbloqueada al cerrar DV.2a. Ficha: [`contexto/sistema-visual.md`](contexto/sistema-visual.md). Commits `ac10202` + `1e21397` (el segundo repara un bloque CSS perdido por una escritura concurrente durante el cierre, ver mensaje del commit).

- **Pipeline extendido a `assets/svg/decoracion/`** (prefijo `d-`): a diferencia de `iconos/`/`logos/`, cada forma declara su propio `viewBox` (no forzado a 24×24) y `scripts/sync-sprite.py` lo preserva en el `<symbol>` generado; sin roles centinela, `fill="currentColor"` puesto a mano. Catálogo inicial de 3 formas draft que Esteban sobrescribe en Illustrator (ADR 026): `blob.svg`, `arco.svg`, `onda.svg`.
- **Clase `.decor`** (`styles/components/atoms.css`): posición absoluta, `z-index: -1`, opacidad 6%, teñida por `--fk-section-color` del hero anfitrión. El contenedor gana `overflow: hidden` + `isolation: isolate` para recortar la forma y contener el z-index negativo.
- **Token `--fk-pattern-dots`** (`styles/tokens.css`) + clase `.pattern-dots`: patrón CSS puro, sin asset, reservado a empty states/onboarding.
- **Piloto acotado (D3 del ADR): 2 heroes + 2 empty states.** `.hero-inicio` (`d-blob`) y `.hero-tesoreria` (`d-onda`); empty states de Metas y Deudas con `.pattern-dots`.
- `assets/svg/README.md` gana la sección 2.3 (`decoracion/`); `DESIGN_SYSTEM.md` gana "Riqueza visual". Guardarraíl `sprite-sync.test.js` actualizado con el mismo mapeo de prefijo. 3583 unit verdes (+7 del guardarraíl de sprite), E2E verde. SW v467 a v469.

### docs(diseno): DV.2a, cierre documental de tokens de superficie/elevación + degradado de identidad · 2026-08-01

El código entró en su propio commit (`d8a7d53`, 2026-07-31) sin cierre documental: tarjeta seguía en BOARD.md y sin entrada de changelog. Esta entrada lo repara. Ficha: [`contexto/sistema-visual.md`](contexto/sistema-visual.md).

- **Escala de elevación de 4 niveles** ([ADR 033](DECISIONS/033-direccion-visual-premium.md) D1): `.card`, `.bento__cell` y `.list-item` ganan sombra en reposo (`--fk-shadow-sm`) en ambos temas; en tema claro sube a doble capa tintada azul-tinta (contacto + ambiental).
- **Token `--fk-grad-identity` consolida el degradado** (D2) que 6 heroes copiaban a mano (`.hero-inicio`, `.score-hero`, `.hero-gastos`, `.hero-tesoreria`, `.hero-compromisos`, `.hero-agenda`): fórmula fija, `--fk-section-color` y `--fk-grad-identity-stop` parametrizables por superficie. Paradas 14/15/16% conservadas sin unificar (ya medidas, no se re-miden). Cada hero redeclara la fórmula localmente: un `var()` dentro de una custom property resuelve contra el elemento donde esa property se declara, no donde se consume.
- `docs/DESIGN_SYSTEM.md` ya había ganado la sección "Sombras y elevación" en el commit original. Sin cambios de código en este cierre, solo documental. SW ya estaba en v461 desde el commit original.

### feat(tesoreria): MC.13e-2f-2, decisión explícita del remanente al confirmar · 2026-08-01

Punto 18 del brief; **cierra MC.13e-2f completa** (la mitad del `cuentaId` cerró el 2026-07-30). Ficha: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md).

- **Las tres decisiones de UX de Esteban del 2026-07-30, tal cual.** Radiogroup de 3 opciones dentro del paso final "Estilo de vida" que ya existía, **sin preselección** (una opción marcada de entrada sería la respuesta de Finko, no la del usuario) y con "Distribuir" bloqueado hasta elegir: ni cuarto paso ni modal. La cifra es `sinAsignar`, lo que sobra del cobro, no `evBudget` del split. Y "ahorro"/"meta" **no abre ruta de apply nueva**: `_elegirDestinoRemanente` suma a la fila que el Paso 2 ya tiene, devuelve el foco ahí y la deja editable. Sin cambios en `logic/distribucion.js`: `resumirPlanDistribucion` ya devolvía `sinAsignar`.
- **Dos cosas que el diseño no cubría.** Sin fila de ahorro ni de meta donde ponerlo, la única respuesta posible sería "dejarlo": una pregunta de una sola respuesta es fricción, no decisión, así que el bloque no se renderiza y el asistente confirma como antes. Y elegir destino marca `data-editado` en la fila del fondo **aunque no sea la receptora**: sin eso, el automático de R3 le descontaría al fondo lo que se acaba de sumar a otra fila y el remanente nunca bajaría a cero.
- Guard en `_confirmarDistribucion` además del botón deshabilitado, mismo cinturón que el del déficit (MC.13e-2e). 5 E2E nuevos ([`distribucion-remanente.test.js`](../tests/e2e/distribucion-remanente.test.js)), incluido el camino hasta `localStorage`. Sin bump de schema. SW v466 a v467.

### feat(inicio): IN.9d, Accesos rápidos en fila propia, Resumen semanal y Actividad reciente en la fila final 6+6 · 2026-08-01

Cuarta rebanada de **IN.9** ([ADR 057](DECISIONS/057-inicio-en-escritorio.md) D4), cierra la iniciativa salvo IN.9e. Ficha: [`contexto/inicio.md`](contexto/inicio.md).

- **La fusión de Accesos rápidos + Actividad reciente (ADR 034 D7) queda acotada a móvil, igual que hizo IN.9c con el acordeón.** Mismo patrón: dos contenedores conviven en el DOM (`#accesos-actividad-movil` fusionado; `#panel-accesos-escritorio` span 4 en fila propia y `#panel-actividad-reciente-escritorio` span 6 junto a `#panel-resumen`), `_repartoAccesosActividad()` nuevo en `render.js` decide cuál se ve según el ancho (mismo umbral 1024px que `_enEscritorio()`). `accesos/view.js` y `movimientos/view.js` llenan las dos copias sin condicional; el reparto se llama después de los renders de dominio para no pisar el oculto por falta de movimientos que ya aplicó `movimientos/view.js`.
- **`#panel-resumen` no se duplica:** es la misma celda en los dos anchos, pasa de `bento__cell--full` a `bento__cell--half` (CSS responsive ya la vuelve span 1 en móvil) y recupera un título propio (`renderPanelResumen()`) porque el grupo con label externo que lo describía ahora también tendría que describir Actividad reciente, que no comparte tema. El gráfico semanal recupera la proporción con la que se diseñó (R79: 49px por barra a span 6 contra 177px que daba el span 12 anterior).
- **DOM = orden visual = orden de foco en los dos anchos, sin `order` de CSS** (mismo criterio que rechazó IN.9a D2 por WCAG 2.4.3): Accesos rápidos en fila propia se logra envolviendo su única celda en un `.bento__group` sin label (fuerza fila completa); Resumen y Actividad son celdas sueltas fuera de grupo, así el auto-flow del grid las empareja solas. En móvil, el grupo de Accesos y la celda de Actividad quedan `hidden` y el acordeón fusionado ocupa su lugar de siempre: el orden visible no cambia.
- 9 tests unitarios nuevos (`accesos.test.js`, `movimientos.test.js`, `render.test.js`, `resumen.test.js`) + 2 E2E (fusión móvil confirmada intacta a 390px, fila final 6+6 medida a 1280px). La medición de posición espera 600ms: la entrada del bento anima cada celda con delay escalonado (layout.css) y dos celdas en índices distintos miden "y" en puntos distintos de su propio slide-in si no se espera a que asiente. 3577 unit + 253 E2E + lint verdes. SW v465 a v466.

### feat(tesoreria): MC.13e-2c, logo/ícono + nota por fila en el asistente · 2026-08-01

El grueso (`_iconoDestino`/`_iconoNecesidad` con `bancoAvatar`/`resolverMarca`, render de `nota`, CSS de `.distribuir__saldo`) ya había entrado sin atribución en el commit `132b0b5` (MC.13e-2d). Ficha: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md).

- `Compromiso.nota` solo existía para `tipo='fijo'` con categoría predefinida (AG.4, doble uso del campo de texto); las deudas no tenían dónde guardarla. `renderFormDeuda()` gana el campo "Nota (opcional)" (mismo patrón que Meta/Apartado), `normalizarCompromiso()` lo guarda para `esDeuda()`.
- `.distribuir__nota` estaba usada en el HTML desde `132b0b5` sin regla propia (texto sin estilo); gana color muted + cursiva.
- Sin bump de schema (campo opcional, `undefined`-safe). SW a v465.

### docs(apartados): AP.5, cierre documental del form v2 y la recurrencia como toggle · 2026-08-01

El código entró como colateral del commit `ab8c9a1` (CAT.3a) sin su propio cierre; esta entrada lo repara. Ficha: [`contexto/apartados.md`](contexto/apartados.md).

- **Form v2** (`renderFormApartado()`): plantillas migradas de `.chip` a `chips-cat`/`chip-cat`, monto objetivo a `monto-hero`, campo "Nota" nuevo, footer `modal__footer--principal`. Resuelve el conflicto abierto del [ADR 042](DECISIONS/042-formularios-v2-visual.md) D9 (dropdown vs. chips): ganan los chips, la convención ya escrita del lenguaje v2.
- **Recurrencia fuera del registro inicial**: se retira el `<details>` "Este gasto se repite" (checkbox + `select` de periodo) del alta; se activa después con el botón "Hacer recurrente" que ya vivía en la tarjeta (`toggle-recurrente-apartado`).
- Sin bump de schema ni tests nuevos: `normalizarApartado()`/`validarApartado()` ya toleraban `recurrente`/`periodoMeses` ausentes, y `apartados.test.js` (167 tests) ya cubría el toggle y la ausencia de los campos retirados.

### docs(inicio): IN.9c, cierre documental de la columna propia del detalle por cuenta · 2026-08-01

Tercera rebanada de **IN.9** ([ADR 057](DECISIONS/057-inicio-en-escritorio.md) D3). El código entró como colateral del commit `ab8c9a1` (CAT.3a) sin su propio cierre; esta entrada lo repara. Ficha: [`contexto/inicio.md`](contexto/inicio.md).

- `#panel-cuentas-detalle`/`#cuentas-detalle-lista` (`index.html`) muestran el detalle por cuenta en una columna propia desde 1024px, y comparten `_filasCuentas()` (`render.js`) con el acordeón del hero, que a partir de ahora queda acotado a menos de 1024px (`_enEscritorio()`). La máscara de privacidad cubre las dos celdas juntas, extensión de IN.2 ya prevista en el ADR.
- Tests y bump de SW ya estaban en `ab8c9a1` (v463): `smoke.test.js` (E2E, columna de escritorio) y `render.test.js` (unit). Sin cambios de código en este cierre.

### fix(test): BUG-022, BUG-023 y BUG-024, suites que se ponían rojas según el día del mes · 2026-08-01

Encontrados al correr las compuertas de CAT.3a: **8 unitarios y 4 E2E rojos en HEAD**, verificados contra un stash completo del árbol. Ninguno es un defecto de la app: los tres son el **mismo patrón de fechas fijas** en los tests, que solo fallan los primeros días de cada mes.

- **BUG-022** (`renderPanelVencidos`, 6 tests): `DIA_PASADO` envuelve a módulo 28, así que el día 1 del mes devolvía 27, o sea el futuro. Sin vencidos, el panel salía vacío. Los dos describes fijan el reloj a mitad de mes, la convención que el propio archivo ya había adoptado para los tests de distancia exacta.
- **BUG-023** (chip TX.12b, 1 unitario + 2 E2E): el unitario fijaba fechas de junio contra la ventana de 60 días que `renderFormGasto` mide con el reloj real. El E2E sembraba con `isoHaceNDias`, correcto, pero la lista de gastos muestra el **mes en curso** y el día 1 toda fecha "hace N días" cae en el mes anterior: se topa en el día 1.
- **BUG-024** (gota del compromiso de ahorro): los aportes estaban fijos en julio y el medidor mide el mes en curso.
- **Colateral real de CAT.3a, no rot:** el E2E de TX.9b creaba una personalizada llamada "Gimnasio", que con el D4 nuevo ahora colisiona con `CATEGORIAS_AGENDA`. Renombrada a "Suplementos", igual que los unitarios equivalentes.

### feat(gastos): CAT.3a, modelo de categorías personalizadas globales · 2026-08-01

Primera de cuatro rebanadas del [ADR 058](DECISIONS/058-categorias-personalizadas-globales.md). Sin cambio visible en la app todavía. Ficha: [`contexto/transversal.md`](contexto/transversal.md).

- **Campo `seccion` en `S.categoriasPersonalizadas`** (D1): `'gasto' | 'fijo'`, backfill `'gasto'` en las existentes (bump de schema v30 a v31, migración idempotente).
- **Resolutora global de ícono** (D2): `iconoDeCategoriaGasto()` ahora también resuelve contra `CATEGORIA_AGENDA_ICONO`, no solo `CATEGORIA_ICONO`, antes de caer a la personalizada o al genérico `i-gastos`. Ignora la `seccion` a propósito: una superficie que pinta un movimiento no sabe, y no debe saber, de qué formulario salió el nombre.
- **`validarCategoriaPersonalizada` compara contra los dos catálogos nativos** (D4): `CATEGORIAS_GASTO` y `CATEGORIAS_AGENDA`. El nombre es único en toda la app, no por sección.
- El formulario de gasto sigue siendo la única fuente de personalizadas hasta CAT.3c: `gastos/index.js` estampa `seccion: 'gasto'` al crear.


---

## Meses anteriores

- [2026-07](changelog/2026-07.md)
- [2026-06](changelog/2026-06.md)
- [2026-05](changelog/2026-05.md)

---

## Convención de entradas

Cada entrada agrupa por fase/release y dentro lista commits con:
- **tipo(área)** - `commit_hash` · `archivos tocados` - descripción de qué cambió.

Tipos: `feat` (nueva funcionalidad), `fix` (bug), `refactor` (sin cambio funcional), `test`, `docs`, `chore` (config/build), `style` (formato).
