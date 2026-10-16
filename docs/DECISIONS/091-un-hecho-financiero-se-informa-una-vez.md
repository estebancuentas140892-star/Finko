# ADR 091 - Un hecho financiero se informa una sola vez: triaje de la iniciativa HF

**Estado:** Propuesta en sus reglas (R-HF1 a R-HF6) y su plan. **Preguntas P1 a P7 resueltas el 2026-10-16**: aceptadas en chat tal como estaban escritas ("Acepto las recomendaciones P1 a P7 del ADR 091 tal como están escritas"). Ver "Resolución de P1 a P7" al final.
**Fecha:** 2026-10-16
**Autores:** Esteban (brief "nueva etapa: integración total, mínima entrada manual, Calendario planificador", 2026-10-16), Claude Opus 5.5 (triaje y redacción)
**Relación:** no revierte ningún ADR. Señala choques con el [020](020-fondo-marcador-de-liquidez.md), [043](043-sincronizacion-multidispositivo-y-cuentas.md) D1 y D4, [051](051-tarjeta-de-credito-producto-integrado.md) D3, [066](066-motor-unico-de-avisos.md) D1 y [081](081-calendario-la-forma-del-mes-entradas-incluidas.md) D2, y los deja como preguntas. Aplica la invariante del [053](053-invariante-de-patrimonio.md). Convive con **MOV.1**: la ficha 18 es dueña de cuatro piezas de esta iniciativa y nada de aquí se le adelanta. Tarjetas: [`board/transversal.md`](../board/transversal.md), bloque HF.

---

## Contexto

El brief fija un principio rector: **"el usuario informa un hecho financiero una sola vez; Finko deduce y actualiza todas las consecuencias que pueda conocer con seguridad"**. No pide reconstruir secciones: pide que las existentes trabajen como un sistema, con cada dominio dueño de lo suyo y sin inferencias financieras inseguras.

Son más de treinta rebanadas en seis capas (modelo, captura, calendario, avisos, movimientos externos, conexión). Por la skill `triaje-tarea` sección 4, eso no es una tarjeta: es una iniciativa, y su brief va a un ADR.

### Estado verificado antes de tocar nada (2026-10-16)

- `main` en `4badf7a` (2026-08-21), sin ramas de trabajo abiertas. **MOV.1 en 16 de 25**, sigue la ficha 17 (Logros), sin empezar.
- **Suite unitaria: 7 rojos de 4.563.** Seis son BUG-028 (crece con el calendario, como `BUGS.md` anticipó). El séptimo es nuevo y del mismo patrón: `inversiones.test.js` usa `fechaInicio: '2026-07-29'` contra `DIAS_ORIGEN_RECIENTE = 30`, así que caducó el 2026-08-28. **La compuerta 1 está rota para cualquier commit**, incluido el de la ficha 17.

---

## Triaje: qué existe, qué choca, quién es dueño

| Pedido del brief | Ya existe (reutilizar) | Dueño o choque | Resultado |
|---|---|---|---|
| Un hecho, una acción ("pagué el arriendo desde Nequi") | `infra/pago-compromiso.js` (ARQ.2): gasto + descuento + baja de deuda; Calendario, Movimientos, Límites y Análisis derivan | - | **Se integra.** Se verifica con perfiles (HF.0f) y se corrigen los dobles conteos de abajo |
| Los aportes declaran origen | Metas y Reservas descuentan (patrón AP.1); Inversión pregunta origen en dos ramas (053); Me deben con `cuentaId` opcional | **Fondo choca con el ADR 020** (marcador de liquidez, no descuenta) | El Fondo ya no crea dinero: está fuera de activos. **P1** |
| Historial fechado de Metas y Reservas | Precedente `Abono[]` del v34; el Fondo ya guarda `aportes[]` fechados | **Ficha 18** (ADR 089 D1) | Diferido: HF.1c |
| Movimiento de dinero vs significado | R90 (dirección con forma, tres estados) | **Ficha 18**; choca con ADR 002 y 051 D3 (abono y pago de tarjeta son gasto) | HF.1a, **P2** |
| Capa fuentes, externo, conciliación | nada | Fuentes conectadas: ADN 3 y ADR 043 | Modelo y fuentes locales en Fase 4; conectadas en Fase 5 |
| Importador CSV | `dominio/import/` es "importar gastos", la mitad de restauración del export | - | Se conserva como función distinta. BUG-029 |
| Aprender patrones (NETFLIX a Entretenimiento) | `marcas.js` resuelve marca, no categoría; `sugerencias-categoria.js` sugiere **topes** (ADR 044) | - | HF.4e. El formulario de gasto ya no pide descripción: aprender solo aplica donde hay texto (importados, externos) |
| Recurrentes a compromiso | `gastosFrecuentes` (atajos, 60 días), `detectarSuscripcionesLargas` | - | HF.2c |
| Forma habitual de pago | `debitoAutomatico` + `cuentaDebitoId` (v39) | ADR 052 | **Duplicado para automáticos.** Para manuales se deriva del último pago (HF.2a), sin campo nuevo |
| Ingreso con cuenta y crédito automático | `Ingreso.cuentaId` (v27), `creditoAutomatico` + `ingresoId` (v41) | ADR 052 | **Duplicado.** Falta que Distribuir lo respete: BUG-030 |
| Semántica de tarjeta | ADR 051 D3: el consumo es gasto sin cuenta y sube la deuda | El **pago** de la tarjeta es un segundo gasto "Abono" | **P2**, HF.1a y HF.1b |
| Me deben integrado con cuentas | PE.7: prestar con cuenta descuenta; el abono acredita y sale en Movimientos (ADR 089 D1) | ADR 047 | Ya existe con cuenta. "No es ingreso ordinario": HF.1a |
| Inversión como transformación y valor actual | Origen de dos ramas (053) | **Valor de mercado: ficha 18** (ADR 086) | HF.1e |
| Completitud de datos | R88 (lo que encabeza una vista declara su conjunto y su periodo) | Ficha 18 | HF.2d |
| Calendario Hoy, Próximos, Mes | `eventosDeHoy`/`eventosEnProximos` (solo tests), `flujoDelMes`, `ocurrenciasEnRango`, `obligacionesYAportesDelCobro().enVentana` | **ADR 081 D2** (el día se lee, se actúa en Por pagar); K5 en ficha 18 | HF.3a, **P5** |
| Estados del débito automático | Hoja de catch-up y bloqueo por saldo (PA.1a) | ADR 052 D2 rechazó el estado "registrado sin confirmar" | Estados **derivados y de solo lectura**; "fallido" solo como contexto. HF.2b |
| Badge de la PWA | nada (`setAppBadge`: cero usos) | **Diferido del ADR 040** ("¿qué cuenta el badge?") | El brief lo responde: lo que requiere atención (urgente y alta). HF.3e absorbe el diferido |
| Shortcuts y notificación que abre el elemento | El router no acepta parámetros; el SW no tiene `notificationclick` | - | HF.3f |
| Privacidad de la notificación | `verificarYNotificar()` corre fuera del candado (`bootstrap.js`) y muestra el monto aunque `ocultarSaldo` esté activo | ADR 063 y 066 | HF.3g |
| Avisos con la app cerrada, Web Push | - | ADN 3, ADR 066 D1, ADR 043 D1 y D4 | Fase 5. No se promete |
| Widget nativo | - | ADR 001 | Fuera de la iniciativa |

---

## Riesgos de doble conteo y de dinero creado (verificados en el código)

1. **Distribuir reacredita un salario ya acreditado** (BUG-030). `estadoDistribucion()` mira plantillas y `config`, nunca `ingresosPuntuales` con `ingresoId`; el asistente suma `monto` a la cuenta (`tesoreria/acciones/distribucion.js`, bloque "El ingreso se acredita").
2. **Importar gastos y borrarlos crea dinero** (BUG-029). Importar guarda `cuentaId` sin descontar; borrar reembolsa.
3. **Tarjeta contada dos veces como gasto**: consumo + pago "Abono" en `totalGastosMes`, tasa de ahorro, Necesidades de Límites y el monitor de renta. Es diseño del ADR 051 D3, por eso es **P2** y no bug.
4. **Capital de deuda contado como consumo**: todo abono es gasto "Deudas" (`pago-compromiso.js`).
5. **Renta suma el salario dos veces**: el proyectado más los créditos automáticos del mismo salario (`analisis/logic.js`, ingresos brutos). Monitor sin auditar: ficha 18.
6. **El Fondo sale como egreso en Movimientos** sin mover ninguna cuenta (`movimientos/logic.js`, `movimientosDesdeAportes`).
7. **Dinero que desaparece sin registro**: meta o reserva borrada o cumplida, "Ya lo usé" sin gasto (V5, ficha 18), inversión borrada sin `cuentaId`, y devolución a la cuenta original aunque parte entró por Distribuir desde otra.
8. **Subregistro**: un fijo semanal o quincenal se marca pagado una vez por mes; un crédito automático, una vez por ingreso y mes.
9. **"Compromiso próximo" avisa lo ya pagado** y fecha por `diaPago` ignorando la frecuencia (BUG-031): Inicio y la notificación contradicen al Calendario.
10. **Saldo editable a mano sin registro**: si tras aportar a una reserva igualas el saldo al del banco, ese dinero se cuenta dos veces.

## Riesgos sobre saldo y patrimonio

- **`Cuenta.saldo` es un valor cacheado sin diario.** Al menos ocho rutas lo cambian sin registro (el ingreso, las transferencias y el complemento de Distribuir, el desembolso de un préstamo, el crédito D.14 de una deuda, los aportes, el ajuste manual). Conciliar con un banco exige que **todo cambio de saldo tenga su registro** (HF.1d) antes de abrir la Fase 4.
- **I4 prohíbe el backfill**: toda migración de historial arranca con un saldo de apertura sin fecha, nunca con aportes inventados.
- `patrimonioBruto` (monitor de renta) excluye metas, reservas y por cobrar: lo decide la ficha 18 junto con el monitor.

## Almacenamiento local

- Cupo declarado 4,5 M caracteres; el 80 % (T1 del [ADR 068](068-perf5-sale-del-tablero-disparadores-verificables.md)) llega cerca de **14.000 gastos** (PERF.9).
- Aportes fechados: 110 a 160 caracteres cada uno. Despreciable.
- **Movimientos externos: 350 a 500 caracteres por fila.** Tres cuentas con 80 movimientos al mes suman 1,0 a 1,4 M caracteres al año: **T1 en dos o tres años**, la mitad si el navegador cobra bytes. HF.4a debe fijar retención y compactación y medirse en el harness antes de abrir una fuente. Es el probable activador de la migración a IndexedDB: se dice ahora para no descubrirlo después.
- El respaldo se exporta con sangría y restaurar no valida forma (`_migrate()` convierte un no-objeto en estado inicial). Cerca del tope, un respaldo puede no caber al restaurarse.

## Finko Local y Finko Conectado

- **Local, sin tocar el ADN** (Fases 0 a 4): conciliación, Bandeja, extracto CSV, compartir texto (Web Share Target), badge, shortcuts, rutas profundas, posponer, Calendario planificador. El PDF local con su contraseña solo en memoria es local pero exige un parser (**P7**).
- **Conectado** (Fase 5): Open Finance (un agregador es servidor más custodia de tokens), correo (OAuth con credencial de aplicación, el mismo motivo del 043 D3), push con la app cerrada, un "recuérdamelo luego" que suene con la app cerrada y la detección real de un débito fallido. Todo exige un ADR que derogue **ADN 3**, el **043 D1 y D4** y el **066 D1**. La condición de reapertura del 043 sigue vigente: modelo de negocio, o ubicuidad sin custodia.

---

## Decisión propuesta: seis reglas de la iniciativa

- **R-HF1.** Un hecho se registra una vez. Sus consecuencias se derivan o se aplican por la ruta única del dominio dueño (`pago-compromiso`, `credito-ingreso`, transferencias). Ninguna consecuencia se guarda como registro paralelo.
- **R-HF2.** Ningún saldo cambia sin un registro que lo explique. Es la I3 del 053 extendida a toda ruta.
- **R-HF3.** Finko nunca pide, recibe ni guarda contraseña bancaria, PIN, CVV, clave dinámica, OTP ni respuestas de seguridad. La contraseña de apertura de un PDF vive solo en memoria y no se registra.
- **R-HF4.** Un movimiento externo nunca toca un saldo: lo toca, una sola vez, el registro de dominio al que se vincula. Un correo es contexto, nunca una salida.
- **R-HF5.** Antes de un campo nuevo: ¿se puede derivar con certeza de lo que ya existe? Si sí, no se pide.
- **R-HF6.** Sugerir antes de automatizar. Automatizar solo tras confirmación explícita, visible y revocable.

## Preguntas para Esteban

- **P1. Fondo (ADR 020).** ¿Se conserva el marcador? Recomendación: **sí**. El brief pide "patrimonio sin cambio" y el marcador ya lo cumple (el Fondo está fuera de activos); lo que falla es su dirección en Movimientos, que arregla HF.1b. Descontar exige el flujo de retiro que el 020 rechazó por no existir.
- **P2. Pago de tarjeta y abono a deuda (ADR 051 D3, ADR 002).** ¿Siguen sumando como gasto? Recomendación: el registro se queda (mueve saldo y baja deuda), pero su naturaleza pasa a "pago de obligación" y **deja de sumar como consumo**. ADR nuevo (HF.1a) que acota los dos.
- **P3. BUG-025.** ¿(a) campo nuevo o (b) conversión en la lectura? Recomendación: **(b)**, arregla el pasado sin schema.
- **P4. BUG-029.** El gasto importado con cuenta: ¿descontar al importar o marcarlo sin efecto en el saldo? Recomendación: **marcarlo**. El CSV restaura historia que el saldo tecleado ya refleja; descontar la restaría dos veces.
- **P5. Calendario (ADR 081 D2).** ¿Recupera acciones directas? Recomendación: solo "Marcar pagado" y "Registrar abono", por la misma ruta de `pago-compromiso`; el resto, enlaces prefiltrados.
- **P6. Finko Conectado.** Recomendación: **no iniciar** hasta cerrar la Fase 4 con uso real.
- **P7. PDF.** ¿Vendorizar un parser sin build? Toca `SECURITY.md` y el ADR 001. Recomendación: diferir y empezar por el extracto CSV.

## Plan por fases (orden técnico, no por lo vistoso)

| Fase | Rebanadas | Puede empezar |
|---|---|---|
| 0. Base confiable | HF.0a a HF.0g | **ya**: no toca archivos ni decisiones de MOV.1 |
| 1. Modelo | HF.1a a HF.1g | al cerrar la **ficha 18** |
| 2. Captura sin repetir | HF.2a a HF.2d | tras la Fase 0 (HF.2d tras HF.1d) |
| 3. Calendario y avisos | HF.3a a HF.3g | HF.3d a HF.3g tras la Fase 0; HF.3a a HF.3c al cerrar MOV.1 |
| 4. Movimientos externos | HF.4a a HF.4f | tras HF.1a y HF.1d |
| 5. Conectado | HF.5a | no iniciar |

Cada tarjeta (objetivo, dominios, archivos, dependencia, ADR, pruebas y cierre) vive en [`board/transversal.md`](../board/transversal.md).

### Primera tarea: HF.0a, y por qué convive con MOV.1

1. **No es idea nueva**: BUG-028 está registrado desde el 2026-08-14; el test de Inversión es la cuarta repetición del patrón que `BUGS.md` vigila.
2. **Cero archivos compartidos** con la ficha 17 (`dominio/logros/`): toca `infra/avisos.js`, `compromisos/logic/modelo.js` y tres tests.
3. **No decide nada de la ficha 18**: no toca K5, R86 a R90, historial, valor de mercado ni el monitor de renta.
4. **Precedente**: el 2026-08-21, entre las fichas 13 y 14, se cerraron el ADR 087 y un fix de Inicio fuera de la ficha; MOV.20a se aplicó fuera de orden por la misma razón.
5. **Desbloquea a MOV.1**: sin suite verde, ni la ficha 17 puede commitearse.

## Pruebas nuevas que la iniciativa necesita

- **Unitarias**: fecha inyectada en compromisos próximos; una sola regla de vencimiento (quincenal, bimestral, pago adelantado); Distribuir con crédito automático ya registrado; importar y borrar deja el saldo igual.
- **Perfiles de regresión** (ligero, común, intensivo), datos inventados y deterministas, construidos por las rutas reales de escritura: I1 a I5, R-HF1 (un hecho, un registro), R-HF2 (saldo final igual a apertura más registros), reversas exactas, guardar y cargar con migración idempotente, Movimientos sin duplicados, volumen y peso serializado.
- **E2E por perfil**: las quince secciones sin errores de consola, enlaces prefiltrados que llegan a su destino, cifras clave iguales a la lógica.
- **Perf**: columna de movimientos externos en el harness (HF.4b) antes de abrir una fuente.

## Consecuencias

- La Fase 0 arranca sin esperar a nadie y deja la compuerta 1 verde para todos, MOV.1 incluido.
- Las Fases 1 y 3 quedan atadas a la ficha 18 y al cierre de MOV.1: esta iniciativa no le adelanta decisiones a la auditoría.
- La Fase 4 llega con su costo de cupo escrito: si se abre, probablemente activa T1 del ADR 068.
- Ninguna rebanada introduce framework, TypeScript, backend ni dependencias. La única excepción posible (P7) queda como pregunta.

## Resolución de P1 a P7 (2026-10-16)

Las siete recomendaciones se aceptaron sin cambios. Lo que cada una fija y qué rebanada lo ejecuta:

| | Decisión | Efecto en el tablero |
|---|---|---|
| P1 | Se conserva el [ADR 020](020-fondo-marcador-de-liquidez.md): el aporte al Fondo no descuenta cuenta | HF.1f sale sin código. Solo cambia la dirección del aporte en Movimientos (HF.1b) |
| P2 | El pago de tarjeta y el abono a deuda conservan su registro, pero su naturaleza es "pago de obligación" y dejan de sumar como consumo | Lo escribe HF.1a como ADR nuevo que acota el 051 D3 y el 002, después de la ficha 18 (R90) |
| P3 | BUG-025 por la opción (b): conversión a fecha local en la lectura, con un helper único y sin schema | HF.0e desbloqueada |
| P4 | El gasto importado se marca sin efecto en el saldo: importarlo, editarlo o borrarlo no toca la cuenta | HF.0c desbloqueada. El campo es opcional y sin backfill (precedente: ADR 051 D8) |
| P5 | El Calendario recupera solo "Marcar pagado" y "Registrar abono", por `pago-compromiso`; lo demás son enlaces prefiltrados | Lo escribe HF.3a como ADR que acota el 081 D2, al cerrar MOV.1 |
| P6 | Finko Conectado no se inicia hasta cerrar la Fase 4 con uso real | HF.5a sigue en "no iniciar"; la condición de reapertura del 043 no cambia |
| P7 | El PDF se difiere; la Fase 4 empieza por el extracto CSV (HF.4d) | HF.4f queda solo con compartir texto. El PDF vuelve con su propio ADR si se retoma |

**Consecuencia:** ninguna rebanada de la Fase 0 espera ya una decisión. Las Fases 1 y 3 siguen atadas a la ficha 18 y al cierre de MOV.1, que no dependían de estas preguntas.
