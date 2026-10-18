# Changelog - Finko Claude

> Revisado: 2026-10-17.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-10)

### fix(gastos): HF.0c, el importador CSV de gastos no crea dinero · 2026-10-17

Cuarta rebanada de la iniciativa HF ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md), P4). Cierra **BUG-029**. Fichas: [`contexto/gastos.md`](contexto/gastos.md) y [`contexto/configuracion.md`](contexto/configuracion.md).

- **Causa raíz:** el importador guardaba `cuentaId` sin descontar (correcto: el CSV es historia que el saldo tecleado ya refleja), pero el gasto importado era indistinguible de uno manual. Editarlo aplicaba la diferencia de monto a la cuenta y borrarlo devolvía el monto: cada importado borrado creaba dinero. Y desde TX.9a el formulario no pide descripción, así que el CSV que exporta Finko la trae vacía y el importador, que la exigía, lo rechazaba.
- **La marca es un dato, no un modo:** `Gasto.sinEfectoSaldo` (schema v44, migración no-op, precedente del ADR 051 D8) la pone `normalizarFila()`. La cuenta se conserva como dato. `deltasPorEdicionDeGasto()` devuelve `{}` para un gasto marcado, y borrar pasa a ser "editar hacia nada" con esa misma función (antes era un `+monto` aparte), así que editar y borrar no pueden divergir. El confirm de borrado nombra solo lo que de verdad se revierte.
- **Sin backfill:** un gasto importado antes de la v44 no se distingue de uno manual y sigue reembolsando al borrarlo. Es la decisión P4, no un olvido.
- **Ida y vuelta:** una fila sin descripción es válida si trae categoría, y los duplicados se detectan por el nombre visible del gasto (descripción, o categoría si no hay), el mismo criterio del título de la lista. Sin eso, dos gastos sin descripción del mismo día y monto chocaban y el segundo se perdía. La columna `descripcion` sigue siendo obligatoria como encabezado.
- **Una expectativa vieja cambió, y es el bug:** `flujos.test.js` usaba "sin descripción, categoría Otros" como fila mala. Es exactamente lo que exporta Finko desde TX.9a; la fila mala pasa a ser la que no trae ni descripción ni categoría. Las demás aserciones del test no cambiaron.
- **Los gastos manuales no cambian:** crear, editar y borrar siguen moviendo su cuenta (controles en smoke.test.js y verificación en la app).
- **Fuera de alcance, dicho:** la marca cubre la cuenta y no la deuda (editar un importado hacia un consumo con tarjeta sigue moviendo la deuda); filas idénticas dentro del mismo CSV siguen tratándose como duplicado.
- **El importador lo dice:** "Formato esperado" suma dos notas: la descripción puede ir vacía si hay categoría, y lo importado no cambia el saldo de las cuentas.
- Verificado en la app (localhost, datos inventados; el archivo se inyectó en el `<input type="file">` porque el selector del sistema no se maneja desde el navegador integrado): importar dos gastos con cuenta deja $800.000; editar Mercado de 120.000 a 150.000 y borrar Transporte (el confirm ya no dice "devuelve") lo dejan en $800.000; borrar el gasto manual de Café devuelve $30.000 a Nómina; al recargar, el importado conserva cuenta y marca.
- Tests: 10 unitarios nuevos (6 en `import.test.js`, 2 en `gastos.test.js`, 2 en `storage.test.js`) y 3 E2E nuevos (`importar-gastos.test.js`: importar, editar, borrar y recargar; importar dos veces; exportar e importar ida y vuelta). Rojos antes del arreglo: 9 unitarios y los 3 E2E (el primero, con 770.000 tras editar). Unitarios 4613/4613, lint verde, E2E 320/320 con `--workers=2`, sin flaky. SW v588 a v589.

### docs(transversal): HF, triaje de los hallazgos de HF.0h · 2026-10-17

Tres decisiones de Esteban sobre lo que dejó abierto HF.0h ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)). Sin runtime.

- **BUG-033, reproducido antes de registrarlo:** con dos ingresos en el cobro y el monto editado a lo que llegó, Distribuir sella los dos y la hoja deja de ofrecer el que nunca llegó. Con un solo ingreso la identidad es segura y no hay bug.
- **BUG-034, encontrado al investigar el anterior:** con ingresos en días distintos, el monto por defecto vuelve a sumar una ocurrencia que la distribución anterior ya acreditó. E2E temporal con reloj fijo: +10.000.000 con 9.000.000 recibidos. Viene de MC.13, no de HF.0h.
- **HF.0i** absorbe los dos y espera la decisión **P8** (¿el asistente pregunta qué llegó?). Sin ella no se diseña arquitectura nueva de cobros. HF.0f pasa a depender de HF.0i: congelaría el doble conteo como esperado.
- **HF.0j:** la hoja no ofrecerá cobros anteriores al alta de un ingreso automático; acota el ADR 052 D1 y espera HF.0e por la hora local. Queda abierta la misma pregunta para el débito automático, que hoy se comporta igual.
- **DOC.5:** limpieza de `contexto/mis-cuentas.md` (43,4 KB) al techo de 40 KB, solo trasladando historia, sin mezclarla con correcciones financieras.

### fix(agenda): HF.0h, la hoja de automáticos no reofrece un cobro que Distribuir ya acreditó · 2026-10-17

Tercera rebanada de la iniciativa HF ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)), espejo de HF.0b. Cierra **BUG-032**. Fichas: [`contexto/calendario.md`](contexto/calendario.md) (Pagos automáticos) y [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md) (Distribución v2).

- **Causa raíz:** la hoja decide qué cobro falta mirando solo `IngresoPuntual` con `ingresoId` en el mes (`pendientesDeCreditoDelMes`), y Distribuir acredita el saldo sin dejar ningún registro de qué ocurrencia acreditó. Posponer la hoja y distribuir dejaba el cobro "pendiente" para siempre.
- **Lo que ya existía no alcanzaba, y no se forzó:** `ultimaDistribucionPeriodo` es una sola fecha (la más reciente de cualquier frecuencia, no solo la del cobro), no dice qué ingresos formaban el cobro, no separa la primera quincena de la segunda y reconstruirlo depende de ingresos que el usuario puede editar después. Usarlo como guarda habría escondido ingresos que nadie acreditó.
- **Dato mínimo, por la convención existente:** al confirmar, Distribuir sella en `S.config.cobrosDistribuidos` los pares `{ingresoId, fecha}` que acredita: el mismo conjunto de HF.0b (`_ocurrenciasDelCobro`, ahora fuente única de los dos sentidos) menos lo que la hoja ya registró. Campo opcional de `config` sin schema, igual que `ultimaDistribucionPeriodo` y `cobroConfirmadoPeriodo`. No crea `IngresoPuntual` ni movimientos: eso sigue siendo HF.1d.
- **La hoja descarta por ocurrencia exacta, no por mes:** distribuir la primera quincena no esconde la segunda, ni septiembre esconde octubre, ni un ingreso esconde a otro del mismo monto, descripción o cuenta.
- **Solo se sella si entra dinero nuevo** (`acreditar > 0`). Con el monto editado a mano se sella el cobro entero: el asistente lo trata como un solo cobro, igual que su propio sello de periodo.
- **Deshacer la revierte sola:** `config` ya estaba en el snapshot de "Deshacer", así que el cobro vuelve a la hoja junto con el saldo. Se conservan el mes en curso y los dos anteriores (la hoja revisa dos).
- **Compatibilidad con HF.1d:** cuando Distribuir escriba su `IngresoPuntual`, la guarda se retira. Queda escrito en la tarjeta que la hoja debe descartar ese registro por ocurrencia, o la segunda quincena distribuida dejaría de salir.
- **Fuera de alcance, dicho:** la hoja sigue confirmando un quincenal una vez por mes cuando el crédito lo hace ella misma (riesgo 8 del ADR 091); editar el `diaPago` de un ingreso ya acreditado rompe el par en los dos sentidos; Semanal y Diario siguen sin reconocerse. Hallazgo sin triar: la hoja ofrece el mes anterior de un ingreso automático recién creado, porque no mira `fechaCreacion`.
- Verificado en la app (localhost, datos inventados): hoja con Salario prueba +$4.000.000, "Ahora no" sin cambios (total $800.000); Distribuir con el arriendo de $1.200.000 deja Nómina en $3.300.000 y el total en $3.600.000; al recargar la hoja no se abre. Con Honorarios prueba creado después (automático, día 16), la hoja ofrece solo los honorarios y el total sigue en $3.600.000.
- Tests: 23 unitarios nuevos (15 en `tesoreria.test.js`, 8 en `agenda.test.js`, uno de ellos espejo entre los dos dominios) y 5 E2E nuevos (`distribucion-credito-automatico.test.js`: Distribuir y recargar, "Ahora no", deshacer, otro ingreso y otro periodo, mes siguiente), con el dinero total afirmado en cada paso. Rojos antes del arreglo: 20 de los 23 unitarios (los otros tres afirman que nada se esconde o que la guarda persiste) y 3 de los 5 E2E, donde la hoja volvía a ofrecer +$4.000.000 ("Ahora no" y deshacer son controles). Ninguna expectativa existente cambió. Unitarios 4603/4603, lint verde. E2E 317/317 verdes con `--workers=2` en dos corridas: la primera sin flaky; la segunda, con la máquina más cargada (13 min), 5 flaky por el timeout de 30 s que pasaron al reintento, uno de ellos nuevo (el recorrido con recarga) y cuatro previos. SW v587 a v588.

### fix(tesoreria): HF.0b, Distribuir no reacredita un cobro que el crédito automático ya acreditó · 2026-10-16

Segunda rebanada de la iniciativa HF ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)). Cierra **BUG-030** y abre **BUG-032**. Fichas: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md) (Distribución v2) y [`contexto/calendario.md`](contexto/calendario.md) (Pagos automáticos).

- **Causa raíz:** PA.1b dio a un mismo cobro dos caminos de crédito y ninguno miraba al otro. La hoja de automáticos acredita y escribe `IngresoPuntual` con `ingresoId`; `_confirmarDistribucion()` sumaba `monto` siempre, porque desde MC.13e-1 el asistente tiene un solo flujo ("siempre acredita") y PA.1b llegó un mes después sin tocarlo.
- **El arreglo es una resta, no un modo:** `montoYaAcreditadoDelCobro()` (pura, en `logic/distribucion.js`) suma lo que la hoja ya acreditó de este cobro y la acción acredita `max(0, monto - eso)`. El reparto, el déficit, las transferencias y el undo no cambian.
- **Identidad explícita:** cuenta un `IngresoPuntual` solo si su `ingresoId` es un ingreso del cobro (frecuencia principal, el mismo conjunto de `montoCobroPrincipal`) y su `fecha` es exactamente la del último cobro de ese ingreso (`ultimoPagoHasta`). La hoja escribe esa misma fecha porque las dos salen de `ocurrenciasEnMes`. Monto, descripción o cuenta iguales no bastan, y un ingreso puntual sin `ingresoId` es un evento aparte (decisión (a) del ADR 041, que no se toca).
- **El periodo sale de la fecha exacta, no del mes:** el crédito de septiembre no vuelve acreditado octubre, y en un quincenal la primera quincena no cubre la segunda (la hoja acredita una vez por mes).
- **"Ingreso puntual equivalente"**, que la tarjeta mencionaba, no existe como concepto en el código: no se inventó. Un ingreso registrado a mano sin `ingresoId` sigue sin reconocerse.
- **Hallazgo nuevo, reproducido en la app:** el sentido inverso. Si el usuario pospone la hoja y distribuye, la hoja vuelve a ofrecer el cobro y confirmarlo lo duplica. Es BUG-032 (tarjeta HF.0h); arreglarlo toca la hoja del Calendario, fuera de esta tarea.
- **Fuera de alcance, dicho:** frecuencias sin día datable (Semanal, Diario, Variable) no se reconocen; con dos ingresos del cobro en cuentas distintas, lo acreditado se queda donde entró y el asistente descuenta todo de la cuenta de origen, como ya hacía.
- Verificado en la app (localhost, perfil inventado): hoja confirmada, Cuenta Nómina en $4.500.000; Distribuir con el arriendo de $1.200.000 y $500.000 a Cuenta Ahorros deja $2.800.000 y $800.000, total $3.600.000. Antes del arreglo, la E2E daba $6.800.000 en Nómina.
- Tests: 11 unitarios nuevos (`tesoreria.test.js`: escenarios A a D, quincenal, otra frecuencia, sin fecha datable, guardar y cargar) y 3 E2E nuevos (`distribucion-credito-automatico.test.js`, rojos antes del arreglo). Ninguna expectativa existente cambió. Unitarios 4580/4580, lint verde. E2E 312/312 verdes con `--workers=2`, sin flaky. SW v586 a v587.

### docs(transversal): HF, P1 a P7 del ADR 091 resueltas · 2026-10-16

Las siete recomendaciones del [ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md) se aceptaron en chat tal como estaban escritas. Sin runtime.

- **Ninguna rebanada de la Fase 0 espera ya una decisión:** HF.0c (P4, el gasto importado no toca el saldo) y HF.0e (P3, BUG-025 por la opción b) quedan desbloqueadas.
- **Ningún ADR cambia hoy.** El 020 se conserva (P1) y HF.1f sale del tablero sin código. Los que se acotan (051 D3 y 002 por P2, 081 D2 por P5) se acotan con su ADR propio en HF.1a y HF.3a, que siguen atadas a la ficha 18 y al cierre de MOV.1.
- **P7 parte una tarjeta:** HF.4f queda solo con compartir texto; el PDF se difiere y no conserva tarjeta. P6 deja HF.5a en "no iniciar".
- Las reglas R-HF1 a R-HF6 y el plan siguen como propuesta: las preguntas eran sobre choques, no sobre las reglas.

### fix(avisos): HF.0a, la suite vuelve a verde y "compromiso próximo" respeta la fecha inyectada · 2026-10-16

Primera rebanada de la iniciativa HF ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)). Cierra **BUG-028**. Ficha: [`contexto/transversal.md`](contexto/transversal.md), bloque "Motor único de avisos".

- **La compuerta 1 estaba rota para cualquier commit**, incluido el de la ficha 17 de MOV.1: 7 rojos de 4.563. Ahora 4.569 de 4.569.
- **El arreglo es un parámetro, no una regla nueva.** `proximoVencimiento()`, `urgencia()` y `compromisosProximos()` aceptan la fecha de referencia con default hoy (la convención de `diasParaProximoPago()` en tesorería), y `_deCompromisosProximos()` recibe el `hoyISO` del motor y lo pasa por `_fechaRef()`, como ya hacían las otras seis fuentes. Los siete consumidores que no pasan fecha no cambian.
- **Sin cambio visible.** En producción `hoyISO` ya es el día real: lo que estaba roto era el contrato de inyectabilidad, y con él la suite.
- **El séptimo rojo era otro caso del mismo patrón, sin registrar**: `inversiones.test.js` usaba `fechaInicio: '2026-07-29'` contra `DIAS_ORIGEN_RECIENTE = 30` con el reloj real, así que caducó el 2026-08-28. Ahora fija el reloj.
- **Los tests nuevos fijan el reloj meses después de la fecha inyectada.** Si una fuente vuelve a leer `new Date()`, fallan cualquier día, no solo los que no coinciden con el fixture: la razón por la que BUG-028 pasó desapercibido el día que se escribió.
- **Fuera de alcance, a propósito:** que esa fecha ignore la frecuencia y lo ya pagado es BUG-031 (HF.0d). Cambia lo que ve el usuario y merece su propia tarjeta.
- Verificado en la app (localhost, datos inventados): Inicio pinta "Arriendo de prueba" que vence hoy e "Internet de prueba" en 2 días, y el motor, llamado en el navegador con `hoyISO` 2026-09-17, devuelve solo "Internet de prueba, 1 día", lo que antes del arreglo era imposible. El SW no se registra en localhost por diseño.
- Tests: 6 unitarios nuevos (5 de fecha inyectada en `compromisos.test.js`, 1 en `avisos.test.js`) y 1 reparado. Lint verde. E2E 309/309 verdes con `--workers=2` (con los workers por defecto, esta máquina daba 14 flaky y 1 rojo por carga del servidor Python, también en `main` sin cambios). SW v585 a v586.

### docs(transversal): HF, triaje de la iniciativa "un hecho financiero se informa una sola vez" · 2026-10-16

Triaje del brief de Esteban del 2026-10-16 contra el código. Decisión: [ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md) (Propuesta). Tarjetas: [`board/transversal.md`](board/transversal.md), bloque HF. Sin runtime.

- **MOV.1 no bloquea la iniciativa entera, solo sus Fases 1 y 3.** La Fase 0 no comparte archivos con la ficha 17 ni decide nada de la 18; la 18 es dueña del historial fechado, el valor de mercado, R90 y V5, y HF los espera.
- **La compuerta 1 estaba rota para todos:** 7 rojos en `main` (6 de BUG-028 y uno nuevo, un test de Inversión con fecha fija que caducó el 2026-08-28). Por eso la primera rebanada es HF.0a y no algo visible.
- **Cinco pedidos del brief ya existían** y no generan trabajo: forma habitual de pago y crédito automático (ADR 052), semántica del consumo con tarjeta (ADR 051 D3), préstamo con cuenta (PE.7) e inversión con origen (ADR 053).
- **Seis choques con ADR vigentes quedan como preguntas, no como cambios:** Fondo (020), pago de tarjeta y abono como gasto (051 D3, 002), Calendario sin acciones (081 D2), push y servidor (066 D1, 043 D1 y D4). Ninguno se revierte en silencio.
- **Tres errores nuevos, verificados en el código:** BUG-029 (importar gastos y borrarlos crea dinero), BUG-030 (Distribuir reacredita un salario ya acreditado por PA.1b) y BUG-031 ("compromiso próximo" avisa lo ya pagado y fecha sin la frecuencia).
- **Cupo:** los movimientos externos llevarían el estado a T1 del ADR 068 en dos o tres años; queda escrito antes de abrir la Fase 4.
- El diferido del ADR 040 (badges del nav) pasa a HF.3e: el brief respondió qué cuenta el badge.
- `CHANGELOG.md` rota: agosto pasa a [`changelog/2026-08.md`](changelog/2026-08.md) (364 KB, sobre el techo de 200 de un mes cerrado, igual que 2026-07; partirlo no entra aquí).
- Compuerta 3 verde. Sin tocar `modules/`, no hay tests que correr.

---

## Meses anteriores

- [2026-08](changelog/2026-08.md)
- [2026-07](changelog/2026-07.md)
- [2026-06](changelog/2026-06.md)
- [2026-05](changelog/2026-05.md)

---

## Convención de entradas

Cada entrada agrupa por fase/release y dentro lista commits con:
- **tipo(área)** - `commit_hash` · `archivos tocados` - descripción de qué cambió.

Tipos: `feat` (nueva funcionalidad), `fix` (bug), `refactor` (sin cambio funcional), `test`, `docs`, `chore` (config/build), `style` (formato).
