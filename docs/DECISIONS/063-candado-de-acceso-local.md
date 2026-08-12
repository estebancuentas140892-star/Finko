# ADR 063 - El candado de acceso es una pantalla de privacidad, no cifrado

**Estado:** Aceptada el 2026-08-12. Esteban pidio arrancar CFG.5 por el PIN local ("PIN local no necesita CFG.4") y delego la eleccion tecnica.
**Fecha:** 2026-08-12
**Autores:** Esteban (encargo y alcance), Claude Opus 5 (analisis del codigo y decision tecnica).
**Origen:** tarjeta **CFG.5** (`board/configuracion.md`), hasta hoy "pendiente de analisis".
**Relacion:** no toca el [ADR 043](043-sincronizacion-multidispositivo-y-cuentas.md) (sigue Abierta): un PIN local no necesita cuenta ni servidor. Reusa el patron de gate bloqueante de LEG.2 (`modules/ui/aceptacion-legal.js`, overlay `data-bloqueante`).

---

## Contexto

CFG.5 pide "un metodo de bloqueo elegible por el usuario (PIN, patron, contrasena, huella o rostro)" mas re-autenticacion en acciones criticas. El motivo real del usuario: proteger su informacion financiera si pierde o le roban el dispositivo.

Lo que el codigo dice hoy:

- Los datos viven en `localStorage`, clave `fk_v1`, **en texto plano** (`modules/core/storage.js:15`). Cualquiera con devtools, `adb` o acceso al perfil del navegador los lee sin pasar por la app.
- `save()` esta debounced 200 ms y persiste `S` completo (ADN 5).
- Las migraciones leen ese JSON plano y lo mutan (ADN 6).
- Los 263 tests E2E siembran `fk_v1` con `localStorage.setItem` plano antes de cargar la app (`tests/e2e/*.test.js`).
- No hay ni un uso de `crypto.subtle` en el proyecto.

De ahi sale la pregunta que esta ADR responde: **el candado protege de que?** Sin decidirlo, cualquier implementacion promete mas de lo que da, y prometer seguridad que no existe es peor que no ofrecerla (ADN 11).

## Decision

**El candado de acceso es una pantalla de privacidad frente a otra persona que usa el dispositivo, no un cifrado de los datos.** Se dice asi, con esas palabras, en la propia pantalla de Ajustes. Consecuencias concretas:

1. **Un solo mecanismo: PIN numerico de 4 a 8 digitos.** No patron, no contrasena libre, no biometria en esta rebanada.
2. **Se guarda el hash, nunca el PIN:** `SHA-256` sobre `salt + ':' + pin`, con `salt` de 16 bytes aleatorios por usuario (`crypto.getRandomValues`), ambos en hexadecimal en `S.config.bloqueo`. El PIN en claro no se persiste ni se emite en ningun evento.
3. **El hash no es la frontera de seguridad y no se pretende que lo sea.** Un PIN de 4 digitos tiene 10.000 combinaciones: ninguna funcion de derivacion lo salva. El hash cumple un objetivo mas modesto y real: que el PIN no quede legible en `localStorage` para quien abra el JSON de pasada o lea un respaldo exportado.
4. **Default apagado.** `config.bloqueo = null` para usuario nuevo y para todo usuario existente (migracion v36 idempotente). Nadie se encuentra la app cerrada sin haberlo pedido.
5. **El gate es bloqueante y opaco:** overlay `#bloqueo-acceso` con `data-bloqueante` (sin cerrar, Escape ignorado) y fondo `var(--fk-bg-base)` en vez del overlay translucido por defecto, porque una pantalla de privacidad que deja leer los saldos detras del blur no sirve para nada.
6. **Freno a la fuerza bruta, en `sessionStorage`:** 5 intentos fallidos y el campo se bloquea 30 s, escalando 30 s por cada tanda. El contador NO va en `S` (no es configuracion del usuario ni tiene que sobrevivir a cerrar la app) pero si en `sessionStorage`, clave `fk_bloqueo_freno`: si viviera solo en memoria del modulo, recargar la pestana bastaria para saltarse la espera que la pantalla acaba de anunciar, y un aviso que se evade con F5 es peor que no ponerlo. Cerrar la pestana si limpia el freno: no se sella esa via porque el limite real lo pone el punto 3, no el freno.
7. **"Olvide mi PIN" borra todo y arranca de cero.** Es la unica salida honesta: como los datos no estan cifrados, no hay nada que "recuperar con el PIN correcto" ni servidor que reponga una credencial. La salida pide la misma confirmacion peligrosa que "Borrar todos mis datos" y dice la consecuencia completa antes de ejecutarla. No abre una capacidad nueva a un ladron: desinstalar la app o limpiar los datos del navegador ya borraba todo sin pasar por aca.

## Alternativas rechazadas

| Alternativa | Por que se rechaza |
|---|---|
| **Cifrar `fk_v1` de verdad** (PBKDF2 desde el PIN + AES-GCM sobre el blob) | Es la unica opcion que protegeria de un atacante con acceso al dispositivo, y aun asi un PIN de 4 digitos se rompe por fuerza bruta offline. A cambio: cada `save()` pasa a ser asincrono y cifrado (toca ADN 5), las migraciones dejan de poder leer el JSON (toca ADN 6), los 263 E2E que siembran `fk_v1` plano se caen todos, y olvidar el PIN pasa a significar perdida definitiva del historial sin ninguna via de rescate (no hay servidor, ADN 3). Coste enorme, promesa que el PIN de 4 digitos no puede sostener. Queda registrada como la direccion correcta **solo si** algun dia se decide contrasena larga y se acepta la perdida irreversible. |
| **Patron de puntos** ademas del PIN | Segundo mecanismo, segunda UI de captura, segundo formato a validar y a testear, para la misma proteccion exacta (el patron es un PIN con otra piel, y su espacio de combinaciones tipico es menor). "Elegible por el usuario" no vale lo que cuesta cuando las dos opciones protegen igual. |
| **Biometria (WebAuthn) en esta rebanada** | La huella o el rostro no entregan una credencial que la app pueda comparar contra un hash local sin un verificador; en PWA depende de `navigator.credentials` con soporte y UX que varian por navegador y por sistema operativo. Hay que verificarlo en el dispositivo real antes de prometerlo en una pantalla, mismo criterio de evidencia del [ADR 030](030-persistencia-diferir-rewrite-salvaguarda-cuota.md). Queda como rebanada aparte (CFG.5c), no como promesa. |
| **Contrasena de usuario** | No hay cuenta que autenticar sin resolver el [ADR 043](043-sincronizacion-multidispositivo-y-cuentas.md). Fuera de alcance por dependencia, no por criterio. |
| **Gate antes de `renderAll()`**, para que la app nunca se pinte bloqueada | Obligaria a partir el arranque en dos caminos y a diferir `renderAll()` tras el desbloqueo, con `initLogros()`, novedades y notificaciones colgando de ese mismo condicional. El overlay opaco ya cumple el objetivo visible con una regla de CSS. Se documenta la limitacion: el DOM se pinta detras del candado, y quien tenga devtools lo ve, igual que ve `localStorage`. |

## Consecuencias

- **Schema v35 → v36:** `config.bloqueo` (`null` = sin candado; `{ hash, salt, creado }` cuando esta activo).
- **Codigo nuevo:** `modules/dominio/config/bloqueo.js` (logica sin DOM: formato del PIN, salt, hash, verificacion, freno de intentos en `sessionStorage`) y `modules/ui/bloqueo-acceso.js` (gate de arranque, mismo patron que `aceptacion-legal.js`).
- **`mostrarErroresForm()` acepta titulo propio** (`modules/infra/form-errors.js`): su default habla de campos que faltan y aca el error casi nunca es eso ("El PIN actual no coincide"). El default no cambia para ningun otro llamador.
- **`bootstrap.js` gana una cola de gates:** el candado va primero y el gate legal + las novedades esperan el evento `bloqueo:abierto`. Un cuarto overlay bloqueante entra en esa cola, no en paralelo.
- **Ajustes** gana el bloque "Candado de acceso" en el grupo "Tu cuenta", con el texto de alcance real visible, no escondido en un hint.
- **Lo que el candado no protege** queda escrito en la pantalla y en la ficha de contexto: devtools, respaldos exportados y acceso fisico al perfil del navegador siguen viendo todo.
- **CFG.5b** (re-autenticacion de acciones criticas: borrar todo, exportar, resetear) reusa `verificarPin()` y una version en promesa del mismo dialogo, igual que `confirmar()` de `modules/ui/confirm.js`. No se implementa en esta rebanada.
- **CFG.6** deja de estar bloqueada por CFG.5 en la parte de "seguridad": el bloque ya existe en el layout de Ajustes.

## Implementacion

Rebanadas en `board/configuracion.md`: **CFG.5a** (esta ADR, PIN local + gate), **CFG.5b** (re-autenticacion en acciones criticas), **CFG.5c** (viabilidad de biometria, spike antes de prometer).
