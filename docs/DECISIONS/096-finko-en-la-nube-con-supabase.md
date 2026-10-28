# ADR 096 - Finko en la nube con Supabase: cuentas, sincronización y familia

**Estado:** Aceptada (2026-10-27). Decisión en chat: todo en la nube con autorización del padre, Supabase como proveedor ("utilizamos supabase"), plan gratis mientras Finko es una app de prueba y suscripción paga cuando muchas personas la usen. Dos puntos quedan resueltos por defecto con la recomendación de este ADR y son revisables: la cuenta es **opcional** (D1) y el código **empieza al cerrar MOV.1** (D8).
**Fecha:** 2026-10-27
**Autores:** Linay (decisión de producto y de costo), Claude Opus 5.5 (análisis y redacción)
**Relación:** **reemplaza el D1 y deroga el D4 del [ADR 043](043-sincronizacion-multidispositivo-y-cuentas.md)** (no hay cuentas ni sincronización; Finko no custodia datos de nadie); su D2 (persistencia del origen, sello del último respaldo, respaldo cifrado) sigue vigente para quien no tenga cuenta. **Cambia la regla 3 del ADN** de [`CLAUDE.md`](../../CLAUDE.md) ("sin servidor, solo `localStorage`") y conserva la 2 (offline-first), la 4 y la 5. **Extiende el [ADR 093](093-perfiles-en-el-dispositivo-y-modo-nino.md) D1**: el niño ya no tiene que estar en el teléfono del padre. Conserva el [ADR 063](063-candado-de-acceso-local.md): el PIN sigue siendo local. Puede activar el disparador D4 del [ADR 030](030-persistencia-diferir-rewrite-salvaguarda-cuota.md) (ver D4). Iniciativa: [`board/transversal.md`](../board/transversal.md), bloque NUBE.
**Alcance:** toca las reglas 2 y 3 del ADN. La sección 4 de `CLAUDE.md` exige discusión explícita antes de una línea de código: ocurrió en chat el 2026-10-27, con el ADR 043 y sus cuatro razones sobre la mesa.

---

## Contexto

El ADR 043 resolvió un problema de **una persona**: no perder el historial si pierde el teléfono. Lo resolvió sin servidor (respaldo exportado, cifrado opcional, aviso cuando pasa mucho tiempo sin respaldar) y descartó la ubicuidad porque Finko no la necesitaba para dejar de perder datos. Su condición de reapertura: que aparezca un modelo de negocio que sostenga costos recurrentes.

Tres hechos cambiaron desde entonces:

1. **Finko tiene dos personas por familia.** El ADR 093 trajo al niño, con su ruta, su alcancía y una mesada que el padre anota. Hoy los dos tienen que compartir un teléfono. Que el padre vea el avance del hijo desde el suyo, y el niño use el propio, ya no es comodidad: es la función.
2. **El adulto quiere sus finanzas en más de un dispositivo.** El escritorio ya existe (INT.1, APR.4), pero con otros datos: lo que se anota en el celular no aparece en el PC.
3. **Hay un compromiso de costo.** Plan gratis durante la prueba y suscripción paga cuando haya muchos usuarios. Es la condición de reapertura del 043.

Además, la conexión futura con bancos (finanzas abiertas) necesita un servidor que reciba los movimientos: ningún camino sin servidor la permite.

### Las cuatro razones del 043, una por una

| Razón del 043 | Qué cambia |
|---|---|
| Costo recurrente sin modelo de negocio | Gratis durante la prueba; suscripción comprometida al crecer. Y por D2, si el servicio se apaga los datos siguen en cada dispositivo: apagarlo ya no se los lleva |
| Custodia de datos financieros y Ley 1581 | Se acepta, con sus obligaciones escritas en D6 y D7. Es lo que más pesa de esta decisión |
| La promesa "sin cuentas, sin servidores" | Sigue siendo cierta para quien no crea cuenta (D1) |
| El conflicto de edición entre dispositivos | Se resuelve por registro y no por archivo, y cada dato tiene un dueño natural (D4) |

## Decisión

### D1. Cuentas y nube, opcionales

- **Sin cuenta, Finko funciona exactamente como hoy**: todo en el dispositivo, con el respaldo del 043.
- **Con cuenta**, los datos se sincronizan entre los dispositivos del adulto y con los perfiles de sus niños. Crear la cuenta pide aceptar los términos nuevos; vincular un niño pide la autorización del padre.
- **Quien ya usa Finko no pierde nada ni tiene que hacer nada**: si crea cuenta, lo que tiene en el teléfono sube como primer contenido de la nube.
- **Inicio de sesión del adulto** con correo (enlace o contraseña) o Google. El PIN del candado (063) sigue siendo local de cada dispositivo.

### D2. La copia local manda: local-first

- **Cada dispositivo guarda todo en `fk_v1`, como hoy.** La app abre, registra y calcula sin red (ADN 2). La nube es una copia que se mantiene al día, no la fuente de cada pantalla.
- **El singleton `S`, el `save()` con debounce y los dominios no cambian** (ADN 4, 5 y 10). La sincronización es una capa nueva en `infra/` que escucha el guardado por el EventBus y no la importa ningún dominio.
- **Si Supabase se cae, se pausa o se deja de pagar, nadie pierde datos**: siguen en cada dispositivo y se exportan como hoy.

### D3. Supabase, con la librería dentro del repo

- **Supabase**: Postgres, autenticación, reglas por fila (RLS) y funciones en el servidor. Postgres sirve para los bancos y los reportes futuros, y es una salida si algún día se cambia de proveedor.
- **Plan gratis mientras Finko es de prueba.** Se pausa tras una semana sin uso y no trae respaldos diarios; por D2 eso no pierde datos de nadie. **Se pasa al plan pago antes de abrir las cuentas a personas fuera del grupo de prueba.**
- **La región es la más cercana disponible**, y su país se declara en la política de tratamiento (transferencia internacional, Ley 1581 art. 26).
- **Sin CDN y sin build step**: la librería cliente se copia al repo como un archivo ESM con versión fija, revisado como cualquier dependencia (SECURITY.md, sección 4). La CSP sigue con `script-src 'self'` y solo `connect-src` suma el dominio del proyecto.
- **La clave pública del proyecto va en el cliente**, como Supabase lo diseña: la barrera son las reglas RLS, y cada regla tiene su test.

### D4. Sincronizar por registro, gana el cambio más reciente

- **Cada registro ya tiene un id único** (`genId()`, UUID). Se le suma la fecha de su último cambio, y el borrado pasa a ser una marca (el registro queda como borrado y se sincroniza así). Es un bump de schema con migración idempotente (ADN 6).
- **En la nube, una tabla por familia de datos con el registro como JSON**: dueño, colección, id, datos, fecha de cambio y marca de borrado. Las migraciones del ADN 6 siguen siendo el único lugar donde vive el esquema; la nube no lo duplica.
- **Si dos dispositivos cambiaron el mismo registro, gana el cambio más reciente de ese registro**, no del estado entero. Editar el mismo gasto en dos lugares a la vez es raro, y en la familia cada dato tiene dueño: el niño anota sus frascos y el padre la mesada.
- **Lo pendiente por subir se calcula** con la fecha de cada registro contra la del último envío, sin una cola aparte. Si las marcas de borrado o los metadatos acercan la cuota de `localStorage`, se activa el disparador D4 del ADR 030 (IndexedDB) con su propia tarjeta.

### D5. La familia en la nube

- **El padre es dueño de la familia.** Ve el avance, la alcancía y las metas de sus niños desde cualquier dispositivo con su cuenta.
- **El niño no tiene correo ni contraseña.** El padre genera un código desde su cuenta y con él vincula el teléfono del niño; el niño entra con su perfil, como hoy.
- **Las reglas por fila separan lo que ve cada uno**: el niño solo lo suyo; el padre, lo suyo y lo de sus niños; ninguna familia ve a otra.
- **El niño nunca ve las finanzas del adulto**, también en la nube (093 D1).

### D6. Seguridad

- **El modelo de amenaza de SECURITY.md se reescribe** antes de la primera línea de código: aparecen sesiones, tokens, un servidor y datos de terceros.
- **Tests de las reglas RLS** contra un proyecto de prueba: quien no es dueño no lee ni escribe; el niño no lee al padre; ninguna familia lee a otra.
- **Nada de datos reales en desarrollo**: el proyecto de prueba se siembra con datos inventados, como los E2E.

### D7. Datos personales y niños (Ley 1581)

- **Los documentos de `docs/legal/` se reescriben antes de que exista una cuenta real**: política de tratamiento, términos y aviso de privacidad, con responsable, finalidades, derechos del titular y cómo ejercerlos.
- **Datos de niños**: solo con autorización expresa del padre o representante legal y en su interés superior (Ley 1581 art. 7, Decreto 1377 de 2013). Se pide al vincular cada niño y queda registrada con su fecha.
- **Quien borra su cuenta borra sus datos en la nube**; en el dispositivo quedan hasta que los borre ahí.
- La revisión de un abogado colombiano, ya abierta en la iniciativa LEG, pasa a ser condición para abrir las cuentas a personas fuera del grupo de prueba.

### D8. Por fases, después de MOV.1

| Rebanada | Qué entrega | Depende de |
|---|---|---|
| NUBE.0 | Proyecto de Supabase de prueba, SECURITY.md reescrito, CSP, librería en el repo, documentos legales en borrador | este ADR |
| NUBE.1 | Cuenta del adulto y respaldo automático: sube lo que hay y, en otro dispositivo, lo recupera al iniciar sesión | NUBE.0 |
| NUBE.2 | Sincronización por registro entre los dispositivos del adulto (celular y PC) | NUBE.1 |
| NUBE.3 | Familia: vincular el teléfono del niño con un código y el avance del niño para el padre desde cualquier dispositivo | NUBE.2 |
| NUBE.4 | Bancos: conexión de finanzas abiertas, con su propio ADR | NUBE.2 |

El código empieza al cerrar MOV.1 (regla de continuidad): el ADR y NUBE.0 en papel pueden avanzar antes.

## Alternativas descartadas

- **Solo la familia en la nube y las finanzas del adulto en el teléfono.** Era la recomendación inicial, pero no cumple dos de los tres requisitos: el adulto no vería sus finanzas en el PC y seguiría perdiendo todo si pierde el teléfono sin respaldo.
- **Sincronización cifrada de extremo a extremo** (opción D del 043). El servidor no podría leer nada, pero eso impide la conexión con bancos, obliga a repartir claves entre los teléfonos de la familia y, si se pierde la clave, nadie recupera los datos: justo la pérdida que esta decisión quiere evitar.
- **La nube como fuente única, sin copia local.** Rompe el offline-first (ADN 2) y hace que un corte o un apagado del servicio se lleve los datos.
- **Cuenta obligatoria.** Rompe a quien ya usa Finko sin cuenta y la promesa de privacidad sin darle nada a cambio. Revisable si la experiencia de prueba lo pide.
- **Firebase.** Trae el modo sin conexión resuelto, pero su base no es relacional, el cobro por lectura es difícil de prever y amarra el proyecto a Google; con D2 la copia local ya la pone Finko.
- **Cargar la librería desde un CDN.** Abre `script-src` a un tercero en cada carga; una copia fija en el repo da lo mismo sin ese riesgo.

## Consecuencias

### Positivas

- Perder el teléfono deja de perder datos, sin depender de acordarse de respaldar.
- Las mismas finanzas en el celular y en el PC, y padre e hijo cada uno en su teléfono.
- La base que la conexión con bancos necesita.

### Negativas / Restricciones

- **Finko pasa a custodiar datos financieros de terceros, y de niños**, con las obligaciones de la Ley 1581: atender reclamos, reportar incidentes y sostener la política de tratamiento.
- **Un servicio que operar**: sesiones, recuperación de cuenta, pausas del plan gratis y, al crecer, un costo mensual.
- **El texto del onboarding cambia**: "Tus datos se guardan solo en tu dispositivo. Sin cuentas. Sin servidores." (`ui/onboarding.js`) pasa a decir que sin cuenta todo queda en el dispositivo y con cuenta, también en la nube.
- **Los tests E2E de la nube necesitan un proyecto de prueba** o un doble del servidor; los actuales siguen corriendo sin red.
- **Más superficie de ataque**: la CSP se abre a un dominio y aparece un inicio de sesión.

---

## Resolución en implementación (NUBE.1, 2026-10-27)

Lo que la implementación de NUBE.1 fijó o corrigió de este ADR. El ADR no se reescribe: esto lo acota.

- **D8, el orden:** MOV.1 queda en pausa y la nube empieza antes de que cierre, por decisión en chat ("Sí, empieza NUBE"). La prueba con 5 o 6 conocidos manda sobre las 8 fichas que le faltan a MOV.1.
- **D3, sin librería:** NUBE.1 solo usa el acceso por correo, la sesión y una tabla, y eso es REST. Un cliente propio con `fetch` (`infra/nube.js`) evita meter al repo una librería de terceros con su cadena de dependencias. Se vuelve a mirar en NUBE.2 si la sincronización por registro o el tiempo real la justifican.
- **D4, por fases:** NUBE.1 sube el estado completo como un respaldo por usuario (tabla `respaldos`, RLS por usuario). La marca de cambio por registro y el borrado como marca, con su bump de schema, pasan a NUBE.2.
- **D1, el acceso:** por correo, con enlace o código, sin contraseñas, y solo para invitados (registro abierto apagado). Al entrar nunca se pisa un lado: sin respaldo sube, con respaldo y el dispositivo vacío trae, y con datos en los dos lados la persona elige. El PIN no sube.
- **D7, la autorización:** una casilla al pedir el acceso, que nombra también los perfiles de niños que el adulto administra; queda en `S.config.autorizacionNube` con versión y fecha. La autorización por cada niño del D5 sigue en NUBE.3.
- **Borrar la cuenta completa** (el usuario de autenticación) necesita una función de servidor con la clave secreta. NUBE.1 ofrece borrar el respaldo de la nube, que también cierra la sesión; la cuenta completa queda para NUBE.2.
- **Correo:** las plantillas de Supabase no se editan sin SMTP propio, y su correo por defecto tiene un límite bajo de envíos y, según su documentación, solo entrega al equipo del proyecto. Para invitar a los probadores hace falta SMTP propio, a cargo del dueño de la cuenta.

