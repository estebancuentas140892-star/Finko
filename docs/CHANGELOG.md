# Changelog - Finko Claude

> Revisado: 2026-10-16.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-10)

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
