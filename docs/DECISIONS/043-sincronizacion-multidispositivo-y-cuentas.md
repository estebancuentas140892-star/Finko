# ADR 043 - Sincronización multidispositivo y cuentas de usuario

**Estado:** Abierta (decisión sin tomar). **Ninguna dirección está elegida.** No implementar nada de este ADR.
**Fecha:** 2026-07-24
**Autores:** Esteban (producto), Claude Opus 5 (análisis)
**Relación:** activaría el disparador D4 del [ADR 030](030-persistencia-diferir-rewrite-salvaguarda-cuota.md), que ya nombra esta decisión por su identificador de tablero. Su resultado reescribe el alcance de la iniciativa legal (LEG) y condiciona la tarjeta CFG.5.
**Alcance:** toca de frente las reglas 2 y 3 del ADN. Por la sección 4 de [`CLAUDE.md`](../../CLAUDE.md), exige discusión explícita con Esteban antes de cualquier línea de código.

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

## La decisión pendiente

**¿Finko incorpora sincronización multidispositivo, y con qué modelo de identidad y de custodia de los datos?**

**No se asume ninguna respuesta.** Este documento existe para que la decisión se tome con la información completa sobre la mesa, no para recomendar una dirección.

Las tres preguntas que hay que responder, y que pueden responderse por separado:

1. ¿Se resuelve la **durabilidad** (que los datos sobrevivan)? Es la necesidad original y la más urgente.
2. ¿Se resuelve la **ubicuidad** (varios dispositivos con el mismo estado)? Es lo que obliga a replantear el ADN.
3. Si se resuelve alguna, ¿**quién custodia** los datos: tú, un proveedor de almacenamiento que tú elijas, o Finko?

---

## Alternativas sobre la mesa

Cinco opciones, **ninguna marcada, ninguna descartada**. Están ordenadas por distancia creciente respecto del ADN actual, no por preferencia.

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

**Dependencia técnica declarada.** Cualquier sincronización seria exige persistencia asíncrona y más cupo del que da `localStorage`. El [ADR 030](030-persistencia-diferir-rewrite-salvaguarda-cuota.md) ya previó este caso: su disparador **D4** nombra esta decisión de forma explícita como el evento que justificaría retomar la migración a IndexedDB. Si se elige D o E, esa migración deja de estar diferida.

**Efecto sobre el paquete legal.** La iniciativa LEG debe enterarse del resultado antes de redactar nada definitivo: privacidad y tratamiento de datos personales cambian por completo entre una app local y una con cuentas. Decidir LEG antes que esto obligaría a rehacerlo.

**Efecto sobre CFG.5.** El bloqueo local con PIN o biometría no depende de esta decisión y puede existir antes. Pero si se elige E, la autenticación de cuenta y el bloqueo local pasan a ser capas complementarias que hay que diseñar juntas.

**El costo de no decidir.** También tiene consecuencias: mientras la decisión siga abierta, el respaldo real de tus datos depende de que recuerdes exportar a mano. La opción A no es neutral, es una elección con su propio riesgo.

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

## Qué falta para cerrarlo

1. Responder las tres preguntas de la sección "La decisión pendiente": durabilidad, ubicuidad, custodia.
2. Elegir entre A, B, C, D y E, o una combinación por etapas.
3. Si se elige D o E: activar formalmente el disparador D4 del ADR 030 y avisar a la iniciativa LEG antes de que redacte.
4. Si se elige B, C o D: decidir qué pasa cuando el usuario pierde su clave o frase de recuperación.
5. Si se decide no avanzar: dejarlo escrito acá, con la fecha, para que la pregunta no se reabra sola cada vez que aparezca el tema.
