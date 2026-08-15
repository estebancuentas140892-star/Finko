# ADR 043 - Sincronización multidispositivo y cuentas de usuario

**Estado:** **Aceptada el 2026-08-15** (Esteban delegó la decisión: "toma tú las decisiones teniendo en cuenta lo que consideres que es la mejor decisión para el proyecto"). Resuelve **durabilidad**, descarta **ubicuidad**. El ADN no se toca: Finko sigue sin servidor y sin cuenta.
**Fecha:** 2026-07-24 (análisis), decidido el 2026-08-15.
**Autores:** Esteban (producto, delegación), Claude Opus 5 (análisis y decisión)
**Relación:** **no** activa el disparador D4 del [ADR 030](030-persistencia-diferir-rewrite-salvaguarda-cuota.md): al no elegirse D ni E, la migración a IndexedDB sigue donde la dejó el [ADR 068](068-perf5-sale-del-tablero-disparadores-verificables.md). **Desbloquea la iniciativa legal (LEG)**: la cláusula "cambio de modelo (CFG.4)" de los 11 documentos de `docs/legal/` deja de estar pendiente. Suma call sites al guard de [CFG.5b](063-candado-de-acceso-local.md) solo si D2.3 los necesita.
**Alcance:** toca de frente las reglas 2 y 3 del ADN. Por la sección 4 de [`CLAUDE.md`](../../CLAUDE.md), exigía discusión explícita con Esteban antes de cualquier línea de código: esa discusión ocurrió el 2026-08-15 y terminó en delegación explícita.

---

## Contexto

### Lo que Finko es hoy

Finko es una PWA offline-first sin servidor, sin cuenta y sin sincronización. Todo el estado vive en `localStorage` bajo la clave `fk_v1`, en el dispositivo. Son las reglas **2** (offline-first) y **3** (sin servidor) del ADN, y no son detalles de implementación: son la identidad del producto.

El onboarding lo promete de forma explícita: *"Tus datos se guardan solo en tu dispositivo. Sin cuentas. Sin servidores."*

El único mecanismo de respaldo que existe es exportar a JSON o CSV **a mano**, desde Ajustes.

### El problema que abriste

Que si pierdes el teléfono, cambias de equipo, desinstalas la app o formateas, **pierdes todo el historial**. Pediste analizar alternativas (copias de seguridad automáticas, sincronización con cuenta, respaldo cifrado en la nube, restauración desde archivo, u otra) que fueran seguras, sencillas y transparentes, sin comprometer la privacidad.

El brief del 2026-07-08 amplió el planteamiento a la versión completa: crear cuenta, iniciar sesión desde cualquier dispositivo, sincronización automática, recuperación ante pérdida y "continuar donde quedó", con autenticación segura.

Son dos problemas de tamaño muy distinto bajo un mismo enunciado, y la decisión gana claridad si se mantienen separados:

- **Durabilidad:** que tus datos sobrevivan a la pérdida del dispositivo.
- **Ubicuidad:** que puedas usar la app desde varios dispositivos con el mismo estado.

La durabilidad se puede resolver sin cuentas ni servidor. La ubicuidad no.

### Por qué la decisión no se puede tomar por triaje

Porque **redefine el producto**. Si Finko incorpora cuentas y sincronización:

- "Sin servidor. Sin cuenta. Sin sync." deja de ser cierto, y la promesa de privacidad del onboarding tendría que reescribirse.
- Aparece responsabilidad sobre datos financieros de terceros, con un modelo de amenazas que hoy no existe.
- Aparecen costos de operación recurrentes en un producto que hoy no tiene ninguno.
- El paquete legal completo de la iniciativa LEG cambia de raíz: privacidad y tratamiento de datos personales no se parecen en nada entre una app local y una con cuentas.

---

## La pregunta

**¿Finko incorpora sincronización multidispositivo, y con qué modelo de identidad y de custodia de los datos?**

El documento se escribió sin asumir respuesta, para que la decisión se tomara con la información completa sobre la mesa. Las tres preguntas se responden por separado, y así se respondieron el 2026-08-15 (ver "Decisión"):

1. ¿Se resuelve la **durabilidad** (que los datos sobrevivan)? Es la necesidad original y la más urgente. **Sí.**
2. ¿Se resuelve la **ubicuidad** (varios dispositivos con el mismo estado)? Es lo que obliga a replantear el ADN. **No.**
3. Si se resuelve alguna, ¿**quién custodia** los datos: tú, un proveedor de almacenamiento que tú elijas, o Finko? **Tú, siempre. Finko no custodia nada, nunca.**

---

## Alternativas sobre la mesa

Cinco opciones, ordenadas por distancia creciente respecto del ADN actual, no por preferencia. Se dejan tal como se escribieron el 2026-07-24, sin marcas: cuál gana lo dice la sección "Decisión", más abajo.

### A. Statu quo: export/import manual

Lo que existe hoy. Resuelve durabilidad solo si te acuerdas de exportar.

- **Arquitectura:** sin cambios. **Privacidad:** máxima, nada sale del dispositivo salvo cuando tú lo decides. **Almacenamiento:** `localStorage`, con el techo de cuota que el ADR 030 ya documentó. **Modelo operativo:** sin costos, sin responsabilidad de terceros.
- **Lo que no resuelve:** exactamente el problema que abriste. Un respaldo que depende de recordarlo no protege contra un teléfono perdido hoy.

### B. Export/import cifrado mejorado

Igual que A, con cifrado del archivo y una experiencia de restauración más clara.

- **Arquitectura:** cambio menor, todo en cliente. **Privacidad:** máxima, y mejora la de A (hoy el JSON exportado va en claro). **Almacenamiento:** sin cambios. **Modelo operativo:** sin costos.
- **Lo que no resuelve:** sigue siendo manual. No da ubicuidad.
- **Punto a decidir si se elige:** cómo se recupera el acceso si olvidas la clave del archivo. Sin recuperación, un respaldo cifrado que no puedes abrir equivale a no tener respaldo.

### C. Respaldo cifrado automático al almacenamiento del propio usuario

Finko escribe un respaldo cifrado en un destino que tú controlas (Drive, iCloud, un archivo local), de forma periódica y sin intervención.

- **Arquitectura:** requiere integrar con el proveedor de almacenamiento; sigue sin backend propio. **Privacidad:** alta, aunque aparece un tercero (el proveedor) que hoy no existe. **Almacenamiento:** el cupo lo pone tu propia cuenta. **Modelo operativo:** sin costos recurrentes para el proyecto; Finko no custodia nada.
- **Lo que resuelve:** durabilidad, de forma automática. **Lo que no:** ubicuidad real; restaurar sigue siendo un acto deliberado.
- **Puntos a decidir:** qué proveedores, y qué pasa en navegadores o plataformas donde la integración no esté disponible.

### D. Local-first con sincronización cifrada de extremo a extremo

Los datos siguen viviendo en el dispositivo y se sincronizan cifrados, de modo que el servicio de transporte no puede leerlos.

- **Arquitectura:** cambio profundo. Exige resolver **conflictos de edición** entre dispositivos, que es el problema difícil de cualquier sync. **Privacidad:** alta por diseño, pero deja de ser cierto que "nada sale de tu dispositivo". **Almacenamiento:** `localStorage` deja de alcanzar; el disparador D4 del ADR 030 se activa. **Modelo operativo:** hay infraestructura de transporte, con costos, aunque no custodie contenido legible.
- **Lo que resuelve:** durabilidad y ubicuidad, sin que Finko pueda leer tus datos.
- **Puntos a decidir:** identidad sin cuenta tradicional (frase de recuperación, clave por dispositivo), y qué ocurre si pierdes la credencial. Con cifrado de extremo a extremo real, **nadie puede recuperar los datos por ti**: ese es su costo.

### E. Cuentas de usuario con backend gestionado

La versión completa del brief: registro, inicio de sesión, sincronización automática, recuperación ante pérdida.

- **Arquitectura:** backend, base de datos, autenticación. Finko deja de ser una app sin servidor. **Privacidad:** el modelo cambia de raíz; el proyecto pasa a custodiar datos financieros de terceros. **Almacenamiento:** servidor, sin el techo de cuota local. **Modelo operativo:** costos recurrentes, operación continua, respaldo, incidentes, y obligaciones de tratamiento de datos personales en Colombia.
- **Lo que resuelve:** durabilidad, ubicuidad y recuperación sencilla, que es la mejor experiencia de las cinco.
- **Puntos a decidir:** todo el modelo de amenazas, la política de retención, y qué ocurre con los datos si el proyecto deja de operar.

---

## Decisión

**Gana B, ampliada con la durabilidad que el navegador ya regala y con el fin de "solo si te acuerdas". Se descartan C, D y E.**

El razonamiento en una frase: el problema que abrió esta decisión es **perder el historial**, y perder el historial se resuelve entero sin cuentas, sin servidor y sin costo; lo único que D y E agregan sobre eso es la ubicuidad, que Finko no necesita para dejar de perder datos y que se paga con la identidad del producto, con dinero recurrente y con la custodia de datos financieros de terceros.

### D1. No hay cuentas ni sincronización. D y E quedan descartadas, con fecha

No por dificultad técnica, sino por cuatro razones que no dependen de la ejecución:

1. **Costo recurrente en un producto sin modelo de negocio.** El ADR deja el precio "fuera de alcance", y esa es justamente la señal: una infraestructura que hay que pagar todos los meses en un proyecto que no cobra termina apagándose, y apagarla se lleva los datos de quien confió en ella. Es peor que no haberla ofrecido.
2. **Custodia de datos financieros de terceros.** Aparece un modelo de amenazas que hoy no existe, más las obligaciones de tratamiento de datos personales de la Ley 1581 en Colombia, sobre un mantenedor único. La opción E las asume completas; la D las reduce, no las elimina (metadatos, disponibilidad, incidentes).
3. **La promesa del onboarding es del producto, no del copy.** "Tus datos se guardan solo en tu dispositivo. Sin cuentas. Sin servidores." es lo que hace a Finko distinta de cualquier app de finanzas con registro. Cambiarla es cambiar de producto, y el problema que se quería resolver no lo exige.
4. **El conflicto de edición es el problema difícil, y sería nuevo.** La opción D obliga a resolver qué gana cuando dos dispositivos editaron el mismo gasto sin conexión. Eso es una capa de complejidad permanente en una app vanilla sin build step (ADR 001), pagada para siempre por una comodidad, no por una pérdida.

**Consecuencia de gobernanza:** la pregunta queda respondida, con fecha. Si vuelve a aparecer, la conversación arranca en estas cuatro razones y en qué cambió, no en cero. Mismo criterio del [ADR 067](067-biometria-descartada-como-desbloqueo.md) con la biometría.

### D2. La durabilidad sí se resuelve, en tres palancas que no tocan el ADN

Ninguna necesita servidor, cuenta, build step ni costo recurrente. Están en orden: primero lo que no depende del usuario, al final lo que sí.

**D2.1 - El navegador deja de poder borrar los datos por su cuenta.** `navigator.storage.persist()` marca el almacenamiento del origen como persistente y lo saca del desalojo automático por presión de espacio. El hecho 7 del [ADR 068](068-perf5-sale-del-tablero-disparadores-verificables.md) ya lo había verificado: **cero ocurrencias de `navigator.storage` en el repo**, es decir, había una mejora de durabilidad disponible desde el día uno que nadie tomó, y era la única que no le pide nada al usuario. Entra acá.

**D2.2 - El respaldo deja de depender de que te acuerdes.** Finko sella la fecha del último respaldo exportado (`config.ultimoRespaldoISO`), la muestra en Ajustes en lenguaje humano y avisa cuando pasó demasiado tiempo con datos nuevos sin respaldar. El aviso **no es un motor nuevo**: monta en el motor único del [ADR 066](066-motor-unico-de-avisos.md), que ya sabe priorizar y ya tiene interruptor por sección. La opción A "no es neutral, es una elección con su propio riesgo", como dice este mismo ADR más arriba: esto es lo que le quita el riesgo sin cambiar de arquitectura.

**D2.3 - El archivo de respaldo puede ir cifrado (la opción B).** Cifrado opcional con contraseña al exportar, detección y descifrado transparentes al importar, con `crypto.subtle` (AES-GCM + PBKDF2), el mismo API que el candado del [ADR 063](063-candado-de-acceso-local.md) ya usa. Hoy el JSON exportado va en claro y contiene el historial financiero completo: quien lo suba a Drive o lo deje en Descargas lo deja legible para cualquiera con acceso a esa carpeta. **Es opcional a propósito**, y la respuesta al punto que el ADR dejó abierto en B ("cómo se recupera el acceso si olvidas la clave") es: **no se recupera, y se dice con esas palabras en la propia pantalla**. Un respaldo cifrado obligatorio con clave olvidada es peor que ninguno.

### D3. La opción C queda descartada como implementación, no como idea

Escribir el respaldo en el Drive o el iCloud del usuario exige OAuth con credencial de aplicación (consola del proveedor, pantalla de consentimiento, proceso de verificación) y, en el caso de iCloud, no hay API web para hacerlo. Eso mete un tercero, un secreto que mantener y una dependencia de plataforma a cambio de un beneficio que D2.2 ya cubre en su parte importante.

**Si algún día vuelve, vuelve por otro camino:** File System Access API sobre una carpeta que el usuario elija (que él ya puede tener sincronizada con Drive o OneDrive), sin OAuth y sin secreto. **Disparador:** que esa API deje de ser exclusiva de Chromium de escritorio. Mientras tanto, decir "respaldo automático a la nube" y que funcione en un navegador de cada tres sería una promesa a medias.

### D4. La custodia es del usuario, siempre

No es una consecuencia de D1: es una regla propia, y sobrevive a cualquier revisión futura de D1. Finko no aloja, no transporta y no puede leer datos de nadie. Cualquier propuesta futura que necesite que el proyecto custodie algo entra por un ADR nuevo que tenga que derogar este punto de forma explícita.

### D5. Rebanadas que abre esta decisión

Cuatro, en este orden. **CFG.4 deja de estar bloqueada** y pasa a ser una iniciativa con rebanadas ejecutables.

| Rebanada | Qué hace | Estado |
|---|---|---|
| **CFG.4a** | D2.1: `navigator.storage.persist()` y el estado real visible en "Tus datos" | **cerrada el 2026-08-15** |
| **CFG.4b** | D2.2: sello del último respaldo, aviso montado en el motor del ADR 066, estado en Ajustes | **cerrada el 2026-08-15** |
| **CFG.4c** | D2.3: respaldo cifrado opcional con contraseña, importación transparente | **cerrada el 2026-08-15** (AES-GCM 256 + PBKDF2 600k; no sumó call site al guard de CFG.5b) |
| **CFG.4d** | Cierra la cláusula "cambio de modelo (CFG.4)" en los 11 documentos de `docs/legal/` (solo docs, avisa a LEG) | **cerrada el 2026-08-15** (5 documentos con cláusula propia, cambio menor, sin re-aceptación) |

---

## Consecuencias esperadas

Evaluadas en los cuatro ejes del encargo, más los que aparecieron al analizarlo.

| Eje | A | B | C | D | E |
|---|---|---|---|---|---|
| **Arquitectura** | sin cambios | menor, en cliente | integración con terceros | profunda: sync y conflictos | backend completo |
| **Privacidad** | máxima | máxima | alta, con un tercero | alta por diseño | modelo nuevo, custodia propia |
| **Almacenamiento** | `localStorage` | `localStorage` | cupo del usuario | activa D4 del ADR 030 | servidor |
| **Modelo operativo** | sin costos | sin costos | sin costos recurrentes | transporte con costo | costos continuos y obligaciones |
| **Resuelve durabilidad** | solo si la recuerdas | solo si la recuerdas | sí | sí | sí |
| **Resuelve ubicuidad** | no | no | no | sí | sí |
| **Reescribe el ADN** | no | no | matiza la promesa | sí | sí |
| **Reescribe el paquete legal** | no | no | parcialmente | sí | por completo |

**El ADN no se toca a medias.** Las opciones A, B y C conservan "sin servidor" y "sin cuenta". Las opciones D y E no. Entre C y D hay un salto cualitativo, no gradual: es el punto donde el producto cambia de naturaleza.

**Dependencia técnica declarada, ahora resuelta.** Cualquier sincronización seria exige persistencia asíncrona y más cupo del que da `localStorage`, y el disparador **D4** del [ADR 030](030-persistencia-diferir-rewrite-salvaguarda-cuota.md) nombra esta decisión como el evento que justificaría retomar la migración a IndexedDB. **Al descartarse D y E, ese disparador no se activa**: la migración sigue diferida donde la dejó el [ADR 068](068-perf5-sale-del-tablero-disparadores-verificables.md), con sus dos disparadores verificables intactos. Ninguna de las tres palancas de D2 necesita persistencia asíncrona: `persist()` es una marca del origen, el sello es un campo más de `S.config`, y el cifrado ocurre sobre un blob que ya se serializaba entero para exportarlo.

**Efecto sobre el paquete legal: LEG queda desbloqueada.** Los 11 documentos de `docs/legal/` se redactaron con modelo local-only y una cláusula de cambio de modelo que apuntaba a esta decisión. Con D1 y D4 escritos, esa cláusula deja de ser una reserva y pasa a ser un hecho: no habrá cuentas ni custodia de terceros. Es la rebanada **CFG.4d**.

**Efecto sobre CFG.5.** Se confirma lo que el ADR ya preveía: al no elegirse E, no hay autenticación de cuenta que diseñar junto al candado local. El candado del [ADR 063](063-candado-de-acceso-local.md) queda como está. Si D2.3 agrega un cuarto call site al guard de CFG.5b, decide su patrón según la regla que ya fijó esa tarjeta, no por copia del de al lado.

**El costo de no decidir, que era real, se cierra.** Mientras la decisión siguió abierta, el respaldo dependía de que el usuario recordara exportar a mano: la opción A nunca fue neutral. D2.1 y D2.2 son exactamente la respuesta a ese costo, y son la parte de esta decisión que hay que ejecutar primero.

**Lo que esta decisión NO resuelve, dicho sin adornos.** Si el usuario pierde el teléfono sin haber exportado nunca, pierde el historial. D2.1 protege del borrado del navegador, no del extravío del aparato; D2.2 reduce la ventana, no la elimina. La única forma de eliminarla era D o E, y su precio está en D1. Que quede escrito acá evita que la app prometa en Ajustes más de lo que puede cumplir.

---

## Fuera de alcance

- **El bloqueo local de la app** (PIN, patrón, biometría) y la re-autenticación en acciones críticas. Es la tarjeta CFG.5, independiente de esta decisión salvo en el caso E.
- **La migración a IndexedDB.** Es del [ADR 030](030-persistencia-diferir-rewrite-salvaguarda-cuota.md). Este ADR puede **activar su disparador D4**, no decidir el motor de persistencia.
- **La redacción del paquete legal.** Es la iniciativa LEG. Este ADR le indica qué escenario debe cubrir.
- **La elección de proveedor concreto**, si se eligen C, D o E. Es una decisión de implementación posterior.
- **El precio o modelo de negocio.** Si el escenario elegido tiene costos recurrentes, cómo se financian es una decisión de producto aparte.

---

## No duplica

| ADR | Qué decide | Frontera con este |
|---|---|---|
| [030](030-persistencia-diferir-rewrite-salvaguarda-cuota.md) | Diferir la reescritura de persistencia; IndexedDB como dirección futura; salvaguarda de cuota | Decide **a qué motor migrar cuando toque** y qué lo dispara. Este decide **si toca**. El 030 ya nombra esta decisión en su D4: son complementarios por diseño |
| [001](001-no-build-step.md) | Vanilla JS sin build step | Restringe **cómo** se construiría cualquier opción, no si se construye |

Ningún ADR existente decide sobre cuentas de usuario ni sincronización. Verificado antes de escribir este documento.

---

## Qué queda por hacer

El ADR está cerrado: lo que queda es ejecución, no decisión. Las cuatro rebanadas viven en D5 y su tarjeta es **CFG.4** en [`board/configuracion.md`](../board/configuracion.md).

**Condición de reapertura.** Esta pregunta no se reabre por que alguien vuelva a mencionarla. Se reabre solo si cambia uno de los hechos que la decidieron: que Finko pase a tener un modelo de negocio que sostenga costos recurrentes, o que aparezca una vía de ubicuidad sin custodia, sin costo permanente y sin conflicto de edición que resolver a mano. Cualquiera de las dos entra por un ADR nuevo que cite a este.
