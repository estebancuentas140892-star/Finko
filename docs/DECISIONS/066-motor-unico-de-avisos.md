# ADR 066 - Motor único de avisos: sin push, sin fondo, un solo recolector

**Estado:** Aceptada el 2026-08-13. Esteban delegó las decisiones de esta tarjeta ("toma tú las decisiones").
**Fecha:** 2026-08-13
**Autores:** Esteban (delegación), Claude Opus 5 (verificación técnica y redacción).
**Origen:** tarjeta **CFG.3** (notificaciones inteligentes anticipatorias, `board/configuracion.md`), que el tablero tenía en "pendiente de análisis (no iniciar)" con una condición explícita: evaluar primero el riesgo técnico de notificar sin servidor.
**Relación:** es el dueño del "motor único de notificaciones" que ya citan como destino el [ADR 047](047-me-deben-v2-intereses-e-historial.md) (recordatorios de préstamos), el [ADR 052](052-pagos-automaticos.md) (alertas de débito sin saldo, tarjeta PA.1c) y la ficha `contexto/calendario.md`. Consume detectores existentes por la vía que autoriza el [ADR 060](060-lectura-cross-domain-de-solo-lectura.md). Copia el criterio "datos, nunca frases" del [ADR 044](044-motor-unico-de-sugerencia-por-categoria.md) D5. El tono lo fija el [ADR 003](003-tono-neutral-profesional.md).

---

## Contexto

CFG.3 pide avisos que se anticipen a los eventos: día de pago hoy, deuda que vence mañana, pago con días de atraso, categoría cerca de su tope, apartado próximo a vencer, préstamo personal vencido. El pedido del usuario tiene una condición de calidad escrita en la tarjeta: **útiles y no invasivos**, solo cuando ayuden a decidir mejor.

Lo que existe hoy:

- `infra/notificaciones.js` muestra **una** notificación del sistema al abrir la app, y solo sabe de compromisos próximos (`compromisosProximos`, umbral 3 días). Opt-in por `S.config.notificaciones` + permiso del navegador.
- Cada sección tiene su propio `nudge` en la pantalla: mora de compromisos, alertas de límites, apartados próximos, préstamos viejos. Son 27 archivos con avisos propios y ninguno se coordina con otro.
- Los detectores del dato ya están escritos y testeados en los dominios (`vencidosSinPagar`, `alertasLimites`, `apartadosProximos`, `estadoPrestamo`, `estaListoParaReiniciar`).

Falta el recolector: la pieza que responde "de todo lo que le pasa a este usuario hoy, qué merece interrumpirlo".

### El riesgo técnico, resuelto

La pregunta que bloqueaba la tarjeta era si Finko puede notificar **sin la app abierta**. No puede, y la razón no es el soporte de plataforma:

1. **Push API** exige servidor y claves VAPID. Choca de frente con el ADN 3 (sin servidor). Descartada sin discusión.
2. **Periodic Background Sync** (`periodicsync`) no necesita servidor y correría dentro del service worker, pero **un service worker no puede leer `localStorage`**: la API es síncrona y no está expuesta en el scope del worker. Todo el estado de Finko vive en `localStorage` bajo la clave `fk_v1` (ADN 3). Sin acceso al estado, el worker no puede calcular ningún vencimiento: no tiene con qué. A eso se le suma que `periodicsync` es solo Chromium, exige PWA instalada y el navegador decide el intervalo real (iOS Safari no lo implementa).
3. **Timers en la página** (`setInterval`) solo corren mientras la pestaña vive, así que no agregan nada a "al abrir".

Conclusión: **los avisos existen al abrir la app y mientras está abierta.** Cualquier promesa distinta sería falsa, y el mismo criterio del [ADR 030](030-persistencia-diferir-rewrite-salvaguarda-cuota.md) y del [ADR 063](063-candado-de-acceso-local.md) aplica acá: no se promete lo que no se puede sostener en el dispositivo real.

Esto **no** obliga a un ADR sobre el ADN: no se propone cambiar las reglas 2 ni 3, se acepta su consecuencia. El punto 2 queda anotado con su disparador: si algún día se ejecuta **PERF.5** (migrar la persistencia a IndexedDB, hoy "futura, no iniciar"), la mitad técnica del background sync se desbloquea y esta decisión se puede revisar. La mitad de soporte de plataforma seguiría igual.

## Decisión

**Un solo motor recolecta los avisos de todas las fuentes, vive en `modules/infra/avisos.js`, es puro y devuelve datos.** Seis decisiones concretas:

### D1. Sin push y sin fondo. Los avisos son al abrir y en la app

No se agrega Push API, ni suscripciones, ni `periodicsync`, ni mirror del estado a IndexedDB. La notificación del sistema sigue siendo la que ya existe (una por apertura), y el resto de los avisos se ven dentro de la app. El copy de Ajustes debe seguir diciendo la verdad sobre eso.

### D2. El motor devuelve datos, nunca frases

Igual que `infra/sugerencias-categoria.js` (ADR 044 D5): cada aviso es un objeto con `tipo`, `severidad`, `nombre`, `monto`, `dias` y `seccion`. El copy lo arma cada superficie. Tres superficies con el mismo string sonarían a plantilla, y un motor que arma frases no se puede testear sin fijar el copy.

### D3. El motor no detecta nada nuevo: compone lo que ya existe

Cada tipo de aviso se apoya en una función ya escrita y ya testeada de su dominio. El motor filtra, clasifica y ordena; no reimplementa reglas de fecha ni de umbral. Ocho tipos, siete fuentes:

| Tipo de aviso | Función que lo detecta | Dónde vive |
|---|---|---|
| `compromiso-vencido` | `vencidosSinPagar` (atraso >= 1 día) | `dominio/compromisos/logic.js` |
| `compromiso-proximo` | `compromisosProximos` (0 a 3 días) | `dominio/compromisos/logic.js` |
| `limite-excedido`, `limite-alerta` | `alertasLimites` | `dominio/presupuesto/logic.js` |
| `apartado-proximo` | `apartadosProximos` (7 días, no 30) | `dominio/apartados/logic.js` |
| `apartado-listo` | `estaListoParaReiniciar` | `dominio/apartados/logic.js` |
| `prestamo-vencido`, `prestamo-proximo` | `estadoPrestamo` | `dominio/personales/logic.js` |
| `dia-de-pago` | `ocurrenciasEnMes` sobre los ingresos activos | `infra/vencimientos.js` |

**El motor vive en `infra/` aunque importe cinco `logic.js` de dominios.** Es la excepción que el propio ADR 060 anticipa en su regla 3 (a partir del tercer consumidor el cálculo es transversal), leída desde el otro lado: un recolector está por definición encima de sus fuentes. Cumple las otras dos reglas al pie de la letra: solo importa `logic.js` puros, nunca `index.js`, `view.js` ni `acciones/*.js`, y solo lee. El precedente ya existía: `infra/notificaciones.js` importa `compromisos/logic.js` desde antes de esta tarjeta.

### D4. La severidad la fija el motor; el tope de cuántos avisos mostrar, la superficie

Cuatro niveles: `urgente`, `alta`, `media`, `baja`. El motor ordena por severidad, luego por urgencia temporal, luego por monto. **No recorta la lista**: quién muestra cuántos es decisión de cada superficie, que es la que sabe cuánto espacio tiene. Un motor que recorta a tres esconde el cuarto aviso a todas sus superficies a la vez.

### D5. La notificación del sistema solo la disparan `urgente` y `alta`

"No invasivo" se traduce en una regla verificable: de todos los avisos del día, solo los de severidad `urgente` o `alta` justifican interrumpir con una notificación del sistema operativo. Un apartado a 6 días o una meta lista para reiniciar no despiertan el teléfono: esperan dentro de la app. Sigue siendo **una** notificación por apertura, con el guard de sesión que ya existía.

### D6. Cero cambio de schema en esta iniciativa

El interruptor sigue siendo el que ya está (`S.config.notificaciones`, un solo booleano) y la de-duplicación sigue siendo el flag de sesión de `notificaciones.js`. No entra `S.config.avisos`, ni preferencias por tipo, ni sellos de "ya te avisé esto hoy" persistidos. Motivo: cada campo nuevo es una migración y un formulario, y todavía no hay evidencia de uso que diga qué tipo molesta. Las preferencias por tipo quedan diferidas a CFG.3c, detrás del uso real.

## Alternativas rechazadas

| Alternativa | Por qué se rechaza |
|---|---|
| Push API con servidor propio (o servicio gratuito de terceros) | Rompe el ADN 3 y la promesa de privacidad que el Centro Legal ya publicó: los datos saldrían del dispositivo para que alguien decida cuándo avisar. |
| Espejar `S` a IndexedDB solo para que el service worker calcule vencimientos en fondo | Crea una segunda copia del estado con su propio riesgo de desincronía, para ganar notificaciones en un solo motor de navegador y solo con la PWA instalada. Si la persistencia se muda algún día a IndexedDB, será por PERF.5 y con su propio ADR, no como efecto colateral de los avisos. |
| Un avisador propio por sección (cada dominio decide cuándo notificar) | Es lo que la tarjeta pide evitar de forma explícita ("un solo motor de recordatorios para todas las fuentes, no uno por sección"), y ya se citó como destino en los ADR 047 y 052. Con seis avisadores nadie puede responder "cuál es el más urgente hoy". |
| `setInterval` en la página para avisar durante la sesión | El usuario está mirando la app: interrumpirlo con una notificación del sistema por algo que la pantalla ya puede mostrar es invasivo sin ganancia. |
| Aviso de "meta de ahorro alcanzada" (lo pedía el brief) | `completada` se marca sola en el mismo abono que la completa, y el toast de consecuencia (ADR 062) ya lo dice en ese instante. Repetirlo en la próxima apertura es noticia vieja. Su versión útil sí entra: `apartado-listo`, que es un estado que **persiste** hasta que el usuario usa el dinero y reinicia el ciclo. |
| Aviso de "aporte recomendado de la semana" (lo pedía el brief) | Un aviso responde a un evento con fecha; un aporte recomendado es una sugerencia permanente y ya tiene dueño: el asistente de distribución y las secciones Metas y Apartados. Meterlo acá lo convertiría en un aviso que nunca se apaga, que es la definición de invasivo. |
| Que el motor recorte a N avisos | Ver D4: el recorte pertenece a la superficie, no al recolector. |
| Umbral de 30 días para `apartado-proximo` (el `DIAS_PROXIMO` del dominio) | 30 días es el umbral correcto para **listar** en la sección; como aviso del día no distingue nada (casi siempre habría uno). El motor pide 7 días a la misma función, sin tocar la constante del dominio. |

## Consecuencias

- **`infra/notificaciones.js` deja de saber de compromisos.** Consume el motor y formatea el aviso más grave. Su formateador se generaliza: la función deja de recibir compromisos con `diasRestantes` y recibe avisos, así que sus tests se reescriben sobre el contrato nuevo (la cobertura crece, no baja).
- **Los `nudge` de cada sección no cambian.** Siguen siendo la señal en contexto, dentro de su pantalla. El motor no los reemplaza: responde otra pregunta ("qué es lo más urgente hoy, mirando todo"). Unificarlos sería otra tarjeta y otro ADR.
- **Las tarjetas que esperaban este motor quedan desbloqueadas**: PA.1c (aviso de débito sin saldo, ADR 052) y los recordatorios de préstamos del ADR 047 ya tienen dónde conectarse, como una fuente más de la tabla de D3.
- **Ninguna migración.** Schema intacto (D6), así que la tarjeta no toca `storage.js`.
- **Se documenta un límite honesto, no una función.** Si Esteban espera que el teléfono suene con la app cerrada, la respuesta escrita es no, y el disparador para revisarla es PERF.5.

## Implementación

Tres rebanadas. La primera es la que ejecuta esta tarjeta.

1. **CFG.3a** (esta): ADR + `infra/avisos.js` con los ocho tipos + `infra/notificaciones.js` consumiendo el motor. Sin UI nueva.
2. **CFG.3b**: centro de avisos en la app (superficie que muestra la lista ordenada, con su propio tope y su copy). Es la que decide dónde vive: Inicio o barra superior.
3. **CFG.3c**: preferencias por tipo en Ajustes, solo si el uso real muestra que algún tipo molesta. Ahí sí entra schema.
