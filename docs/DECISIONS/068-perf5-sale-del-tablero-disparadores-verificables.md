# ADR 068 - PERF.5 sale del tablero: la migración a IndexedDB se acota y sus disparadores se vuelven verificables

**Estado:** Aceptada el 2026-08-14 (Esteban delegó la decisión: "toma tú la decisión que consideres técnicamente correcta").
**Fecha:** 2026-08-13, revisado de forma adversarial y aceptado el 2026-08-14.
**Autores:** Claude Opus 5 (consolidación y decisión). Seis revisiones independientes en paralelo, cada una con la orden de refutar: necesidad técnica, rendimiento y límites reales, riesgo de migración y tests, offline-first y mantenimiento, relación con los ADR vigentes, gobernanza documental. La revisión corrigió la aritmética del hecho 1, agregó el hecho 7 y ajustó el disparador T2; la decisión no se movió.
**Relación:** **acota** el [ADR 030](030-persistencia-diferir-rewrite-salvaguarda-cuota.md) D3 y D4, no lo revierte: la dirección futura sigue siendo IndexedDB y la persistencia sigue sin reescribirse. Retira **PERF.5** del tablero y abre **PERF.9** y **PERF.10**. Referida por [ADR 034](034-inicio-v2.md) D (foto de perfil), [ADR 043](043-sincronizacion-multidispositivo-y-cuentas.md) (sincronización) y [ADR 066](066-motor-unico-de-avisos.md) D1 (avisos en background).

---

## Contexto

PERF.5 ("migrar la persistencia a IndexedDB") nació diferida con el ADR 030 el 2026-07-06 y en cinco semanas se tocó **seis veces sin ejecutarse nunca**: 2026-07-06 (creación), 2026-07-08 (triaje), 2026-07-12 (ADR 034 la usa para vetar la foto de perfil), 2026-07-24 (ADR 043 la declara dependencia), 2026-07-31 (**PERF.8**, trabajo real de ingeniería hecho para alimentar el D4), 2026-08-13 (ADR 066 y un pedido de ejecución que consumió una sesión completa).

La revisión de este ADR midió, no estimó. Hechos nuevos:

1. **El eje de CPU no puede apretar antes que el de cuota: vigilarlo por separado es redundante.** El costo de `save()` es función de los caracteres, no del número de registros, y crece lineal: 4,4 a 4,5 ms por millón de caracteres (`scripts/perf/BASELINE.md:15-17`). Al tope del cupo declarado (4,5 M chars, `storage.js:33`) el guardado cuesta **~20 ms de mediana y ~49 ms de p95**. La cuota corta primero o a la vez, nunca después. En unidades de producto: un gasto real serializa a **~283** caracteres (medido sobre `dominio/gastos/logic.js:516-543` más el `id` UUID y el `fechaCreacion` ISO que agrega `infra/crud.js:36-41`) contra **95** de la semilla del harness, factor **2,98x**; en el cupo caben ~15.900 gastos reales.

   **Corrección de la primera redacción de este ADR** (revisión adversarial del 2026-08-14): decía "~43.000 gastos, ~13 M caracteres, la cuota corta por factor ~3, el CPU es inalcanzable por construcción". Era mezcla de unidades: dividía 50 ms por el p95 y repreciaba después el registro a su tamaño real. El margen verdadero es **2,47x con la mediana y 1,02x con p95**. La conclusión operativa no cambia (la cuota es el eje que manda), pero "inalcanzable" era demasiado fuerte: lo correcto es que **T1 subsume el eje de CPU**.

2. **El disparador de cuota no puede activarse solo.** "Usuarios reales acercándose a la cuota" exige agregación de campo, y la app no tiene telemetría por diseño (ADN 3). El aviso de la salvaguarda se pinta en el dispositivo del usuario y es invisible para el proyecto. Cero menciones de cuota en `BUGS.md` en toda la historia. Un ADR escribió un disparador cuya evidencia el ADN del producto prohíbe recolectar.

3. **El disparador de jank tampoco tiene instrumento, y el que hay mide de menos.** Toda cifra de persistencia del proyecto es de happy-dom (`scripts/perf/BASELINE.md:4`), donde `localStorage` es un Map en memoria: **el `setItem` real, que en un navegador escribe a disco de forma síncrona en el hilo principal, no está medido en absoluto**, y es justo el término que rompería un presupuesto de frame. `scripts/lighthouse.js` fija `formFactor: 'desktop'` y `cpuSlowdownMultiplier: 1`, anulando los tres multiplicadores móviles. PERF.8 construyó la columna "arranque" declarándola "el dato que el D4 exige" y su propia conclusión fue que no servía. Se construyó el instrumento que el ADR pedía y la compuerta no se movió.

4. **La tarjeta prometía el beneficio de una variante y listaba los archivos de otra.** El ADR 030 D3 promete "escritura por registro, resolviendo cuota **y** CPU": eso exige un object store por colección, que rompe los 33 bloques de migración acumulados (schema v40, escritos contra un objeto plano único y con lecturas cruzadas entre colecciones), `_applyToS()` y `estadoCuota()`. La lista de archivos de la tarjeta describía la variante barata (el mismo blob JSON dentro de IndexedDB), que sube la cuota y **no** baja el CPU. Nadie había resuelto esa ambigüedad, y decide el costo del trabajo.

5. **La factura crece sola.** El ADR 030 midió 101 referencias a `fk_v1` en 11 archivos E2E. Hoy son **197 en 13 suites**, con 105 siembras, **89 lecturas de vuelta del blob crudo**, 163 `addInitScript`/`evaluate` (114 y 49) y **cero helper central**: no existe siquiera el directorio `tests/e2e/helpers/`. El precio de la migración subió ~62 % en cinco semanas sin que nadie tocara la tarjeta. Y hay tres módulos que escriben `localStorage` sin pasar por `storage.js`: `config/index.js:116` (restaurar respaldo), `config/index.js:329` ("Borrar todos mis datos") y `ui/bloqueo-acceso.js:141` ("Olvidé mi PIN").

   Esa tercera fuga tiene además **un hueco presente, verificado en código y ajeno a IndexedDB**: el `setItem` crudo de `config/index.js:116` vive dentro de un `try` cuyo `catch` (`:119-121`) anuncia "El archivo no es un JSON válido de Finko". Un `QuotaExceededError` al restaurar un respaldo (la operación que más probablemente revienta el cupo) se le reporta al usuario como archivo corrupto, y no marca `falloUltimoGuardado` ni emite `storage:error`: la salvaguarda del ADR 030 D2 **no cubre esa ruta**. Entra al alcance de PERF.10 (D4).

6. **La tarjeta violaba la regla de tamaño del propio proyecto.** 14 líneas y 3.679 caracteres contra el techo de 12 líneas de la skill `triaje-tarea`, cuya regla dice: si necesita más, "no es una tarjeta, es una iniciativa, y su brief va a un ADR". Ya se contradecía a sí misma (línea 30: "las 11 suites E2E"; línea 37, medida el mismo día: "13 suites E2E"). El proyecto tiene precedente escrito para este caso exacto: los logros diferidos del ADR 032 "**NO son tarjeta**: su verificación y condición de reapertura viven en el ADR".

7. **IndexedDB sube el cupo, no la durabilidad, y no desbloquea los avisos en fondo.** El desalojo del navegador es por bucket de origen: `localStorage` e IndexedDB se van juntos, el tope de 7 días de ITP en WebKit borra los dos por igual, y la única palanca real, `navigator.storage.persist()`, protege el bucket completo. **Cero ocurrencias de `navigator.storage` en el repo** (`modules/`, `service-worker.js`, `scripts/`): hay una mejora de durabilidad disponible hoy, sin migrar nada, que nadie tomó. En el otro extremo, un blob JSON en una clave se recupera a mano desde DevTools y una base a medio escribir no, así que para una app sin copia en servidor la migración es neutra en el mejor caso. Y sobre el ADR 066 D1: IndexedDB resolvería el **acceso al dato** desde el service worker, no su **ejecución** (sin push server, prohibido por el ADN 3, y con Periodic Background Sync solo en Chromium, el worker nunca corre con la app cerrada), así que los avisos al abrir seguirían siendo la respuesta correcta después de migrar.

Lo que **no** cambió: no hay ni un síntoma. Cero bugs de persistencia, cero `QuotaExceededError` fuera de un mock de test, el aviso de Ajustes devuelve string vacío en operación normal, y ninguna tarjeta viva exige persistencia asíncrona.

## Decisión

### D1. PERF.5 deja de ser una tarjeta del tablero. Este ADR es su fuente única

Una tarjeta cuyos tres disparadores no pueden cambiar de estado por trabajo hecho desde el tablero no es elegible, y una tarjeta no elegible contradice la regla de uso del tablero. El discriminador contra la otra diferida es limpio: **INT.1g se desbloquea con trabajo del propio tablero** (que una sección declare contenido para el carril); **PERF.5 solo se desbloqueaba desde fuera**.

En `board/transversal.md` queda una **nota de cita de una línea** apuntando acá, con el formato que el proyecto ya usa para los diferidos del ADR 032 y del ADR 040. Al reabrirse, **nace como tarjeta nueva** con el alcance de D2.

El identificador `PERF.5` se conserva a propósito en el título y el cuerpo de este ADR: las referencias que quedan en runtime (`modules/infra/notificaciones.js:9`) y en ADR anteriores siguen resolviendo por búsqueda.

### D2. La variante es blob-en-IndexedDB, no un object store por colección

El hecho 1 mata la mitad "CPU" de la justificación del ADR 030 D3: no hay volumen alcanzable en el que `JSON.stringify(S)` sea el problema. Sin ese beneficio, partir el estado en stores por colección paga la reescritura de los 33 bloques de migración, de `_applyToS()` y de `estadoCuota()` a cambio de nada.

**El alcance queda fijado: mover el mismo blob JSON de `localStorage` a un único registro en IndexedDB.** Sube el cupo (el único riesgo real que el ADR 030 declaró) y conserva intactas las migraciones, la regla ADN 6 y la ruta de exportar respaldo. La escritura por registro queda **rechazada** con la misma fuerza con que el ADR 030 D3 rechazó partir `localStorage` por clave, y por la misma razón: complejidad que no resuelve el problema real.

### D3. Los tres disparadores del D4 se reemplazan por dos verificables

| Disparador del ADR 030 D4 | Destino |
|---|---|
| Jank de guardado medido en dispositivo real | **Se retira, absorbido por T1.** El costo de guardar es función de los caracteres y el cupo los limita antes o a la vez (hecho 1), así que T1 se cruza primero: un eje separado para lo mismo. Además nunca tuvo instrumento (hecho 3). |
| Usuarios reales acercándose a la cuota | **Se reformula** a algo auto-observable, ver abajo. |
| Feature que exija persistencia asíncrona o mayor cupo | **Se conserva**, delegado a su dueño real. |

Los disparadores vigentes desde hoy son **dos**, y ambos pueden producir evidencia dentro del repositorio:

- **T1, cuota medida.** El harness de `scripts/perf/` reporta el peso serializado real del estado y cruza el 80 % de `LIMITE_LOCALSTORAGE_CHARS`; **o** un `storage:error` observado por Esteban entra a `BUGS.md`. Cubre también el eje de CPU: al cruzarse T1 el guardado ya está en ~20 ms de mediana y ~49 de p95, o sea que si alguna vez hay jank de guardado, T1 se disparó antes. Requiere **PERF.9** para existir: sin esa medición, T1 nace tan ciego como el disparador que reemplaza.
- **T2, decisión de producto.** El [ADR 043](043-sincronizacion-multidispositivo-y-cuentas.md) se resuelve como **D** o **E** (las únicas dos de sus cinco opciones que exigen la migración; A, B y C no activan T2, y no cierran T1: la cuota sigue vigilada pase lo que pase), **o** el veto de la foto de perfil del [ADR 034](034-inicio-v2.md) pasa de rechazado a aprobado. Ambos son decisiones de Esteban, no de una medición.

**Nada más abre esta decisión.** Un pedido de ejecutar la migración sin T1 ni T2 se responde con este ADR, sin volver a auditar el código: la verificación completa ya está hecha y fechada acá.

### D4. Lo que sí rinde hoy se convierte en dos tarjetas independientes

Ninguna de las dos requiere decidir sobre IndexedDB, ninguna toca el ADN, y las dos valen aunque la migración no ocurra nunca:

- **PERF.9 - peso serializado real del estado.** Columna de caracteres en `scripts/perf/bench.perf.js` y semilla corregida a la forma real de un registro (UUID de `genId()`, `fechaCreacion` ISO), que hoy pesa un tercio de lo real. Es la medición que convierte todo el argumento de cuota de estimación ("~1.5-3 MB", ADR 030) en dato, y la que hace verificable a T1.
- **PERF.10 - un solo punto de acceso a `localStorage`.** Helper único de sembrado y lectura para las 13 suites E2E, más una fachada en `storage.js` para los tres módulos que hoy escriben la clave cruda. Ataca el patrón P7 del proyecto ("un concepto con cuatro implementaciones") sobre la deuda que más rápido crece, cierra el hueco presente del `catch` de restaurar respaldo (hecho 5) y de paso cierra un riesgo latente: bajo cualquier motor que no sea `localStorage`, los dos `localStorage.clear()` de "Borrar todos mis datos" y "Olvidé mi PIN" seguirían compilando y no borrarían nada.

## Consecuencias

- **Positivas:** el tablero deja de cargar una tarjeta que nadie podía elegir y que ya había consumido una ranura de "Últimas 5 tareas cerradas" sin cerrar nada. La séptima re-evaluación deja de ser posible: hay dos disparadores comprobables y una respuesta escrita para el pedido de ejecución. El alcance ambiguo queda resuelto antes de costar trabajo. Y el trabajo con retorno real (PERF.9, PERF.10) sale a la luz, tapado hasta hoy por una tarjeta que lo contenía como nota al pie.
- **Negativas / deuda aceptada:** T1 no puede activarse hasta que PERF.9 exista, así que hasta entonces el techo de cuota sigue vigilado solo por `falloUltimoGuardado` (detecta el fallo, no lo anticipa). El comentario de `modules/infra/notificaciones.js:9` sigue citando "PERF.5" como identificador de tablero; no se corrigió para no tocar runtime en una tarea documental, y se arregla en la próxima tarea que toque ese archivo. `LIMITE_LOCALSTORAGE_CHARS` sigue siendo una suposición con comentario, no una medición: si el navegador cobra bytes sobre UTF-16 en vez de code units, el techo real es la mitad, el aviso anticipado nunca dispara y `QuotaExceededError` llega con el medidor marcando 58 %. PERF.9 debe reportar el peso, no resolver esa duda; resolverla exige medir contra un navegador real.
- **Candidato que este ADR deja anotado y no convierte en tarjeta:** llamar a `navigator.storage.persist()` (hoy cero ocurrencias en el repo) protegería el bucket de origen completo sin migrar nada, que es más durabilidad de la que da IndexedDB. No entra al tablero acá porque toca runtime, puede mostrar un permiso del navegador y por lo tanto es decisión de producto: **requiere triaje con Esteban**, no ejecución silenciosa desde este ADR.

## Alternativas rechazadas

- **Implementar la migración ahora.** Cero síntomas, cero disparadores, y el riesgo más alto del proyecto: cambia la ruta de arranque, migra datos reales de años sin copia en servidor y reescribe la única suite capaz de detectar el daño, todo a la vez. El modo de fallo del cambio es idéntico al desastre que dice prevenir, y las tres rutas de rescate fallan **sin excepción y sin síntoma**: bajo IndexedDB, `config/index.js:116` restauraría un respaldo en un almacén que ya nadie lee (y aun así diría "Datos importados. Recargando..."), y los dos `localStorage.clear()` de "Borrar todos mis datos" y "Olvidé mi PIN" compilarían sin borrar nada. Además, happy-dom 15.11.7 no implementa IndexedDB ni `structuredClone` (verificado en `node_modules/` y en runtime), así que los 4212 tests unitarios necesitarían `fake-indexeddb` como devDependency nueva: hoy el proyecto tiene `dependencies: {}` y 8 devDeps, y una dependencia nueva pasa por [`SECURITY.md`](../SECURITY.md) y por su propio ADR.
- **Mantener PERF.5 como tarjeta bloqueada, tal cual.** Es lo que ya se hizo seis veces. Garantiza la séptima: la tarjeta era inaccionable por diseño, y dos de sus tres disparadores eran imposibles de observar. Dejarla igual traslada el costo a la próxima sesión que la vuelva a leer.
- **Eliminar la migración como trabajo futuro.** Rechazada: el techo de cuota es real y ya cobra un costo de producto verificable (la foto de perfil lleva tres rechazos por `QuotaExceededError`, ADR 028 D3, ADR 030 y ADR 034), y el ADR 043 tiene un camino escrito que la activa. Borrarla obligaría a redescubrir todo este análisis desde cero.
- **Mudar el contenido de la tarjeta a `contexto/transversal.md`.** Es el destino natural del estado vivo, pero esa ficha está en 66 KB contra un techo de 40 y **DOC.3** ya la tiene fichada por eso. Engordarla sería empeorar a sabiendas una deuda ya medida. La ficha recibe solo el resumen; el detalle vive acá.
