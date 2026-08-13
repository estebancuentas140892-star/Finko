# ADR 067 - La biometria si es viable en PWA y aun asi no entra

**Estado:** Aceptada el 2026-08-13. Esteban encargo la tarjeta y delego la decision completa ("toma tu las decisiones").
**Fecha:** 2026-08-13
**Autores:** Esteban (encargo), Claude Opus 5 (spike, medicion y decision tecnica).
**Origen:** tarjeta **CFG.5c** (`board/configuracion.md`), "Biometria en PWA: verificar antes de prometer". Spike, no implementacion.
**Relacion:** cierra la iniciativa **CFG.5** abierta por el [ADR 063](063-candado-de-acceso-local.md), **corrige un motivo tecnico de ese ADR** (ver "Consecuencias") y deja la reapertura colgada del [ADR 043](043-sincronizacion-multidispositivo-y-cuentas.md) (Abierta) y de la tarjeta A.5 (dominio propio).

---

## Contexto

El ADR 063 dejo la biometria fuera de CFG.5a con este motivo: "la huella o el rostro no entregan una credencial que la app pueda comparar contra un hash local sin un verificador". La tarjeta CFG.5c existia para verificarlo antes de prometer nada en pantalla, con el mismo criterio de evidencia del [ADR 030](030-persistencia-diferir-rewrite-salvaguarda-cuota.md).

La pregunta era una sola: **puede una PWA sin servidor registrar y verificar una credencial biometrica de plataforma, de punta a punta, sin nadie del otro lado?**

## El spike

Chromium de Playwright 1.60, con un **autenticador virtual de plataforma** por CDP (`WebAuthn.addVirtualAuthenticator`, `protocol: ctap2`, `transport: internal`, `hasUserVerification` e `isUserVerified` en true). El autenticador virtual simula el sensor de huella del sistema: no reemplaza la prueba en el telefono, pero prueba el contrato de la API, que es lo que estaba en duda. La app se sirvio en `http://localhost:8081` (contexto seguro, mismo requisito que ya pide `cryptoDisponible()`).

El ciclo medido fue el completo: `navigator.credentials.create()` con `userVerification: 'required'` y `attestation: 'none'`, guardar la clave publica que devuelve `response.getPublicKey()`, `navigator.credentials.get()` con esa credencial, y verificar la firma con `crypto.subtle.verify()` sobre `authenticatorData || SHA-256(clientDataJSON)`, convirtiendo antes la firma ECDSA de DER a `r||s` de 64 bytes.

## Hallazgos

| Pregunta | Resultado medido |
|---|---|
| `isUserVerifyingPlatformAuthenticatorAvailable()` | `true` |
| Registro sin servidor (`create`, attestation `none`) | OK: credential id de 32 bytes, clave publica SPKI de 91 bytes |
| Desbloqueo (`get`, `userVerification: 'required'`) | OK: banderas `UP` y `UV` del `authenticatorData` en 1 |
| **Verificacion de la firma 100 % en el cliente** | **`true`**: `crypto.subtle.verify('ECDSA'/'SHA-256')` valida la asercion sin ningun servidor |
| Contraprueba con el buffer firmado manipulado | `false`: la verificacion rechaza lo que no cuadra |
| Donde queda la credencial | En el autenticador del sistema, **fuera de `fk_v1`** (`WebAuthn.getCredentials` la lista despues de que la pagina ya no guarda nada) |
| Origen por IP (`http://127.0.0.1:8081`) | `SecurityError: This is an invalid domain.` Una direccion IP no puede ser RP ID |

De ahi salen dos cosas que el ADR 063 no sabia:

1. **El verificador existe y es local.** `crypto.subtle` verifica la firma ECDSA P-256 en el navegador. El motivo tecnico del 063 era falso.
2. **La credencial vive fuera de la clave unica.** Es la primera pieza de estado del proyecto que no cabe en `fk_v1` y que ningun respaldo exportado se lleva.

## Decision

**La biometria se descarta como metodo de desbloqueo de Finko. El PIN local sigue siendo el unico.** No se implementa ahora ni queda como pendiente latente: la tarjeta CFG.5c cierra con este documento y sin codigo. Ni "huella" ni "rostro" aparecen en la UI.

Cinco motivos, en orden de peso:

1. **No sube el techo de seguridad ni un centimetro.** La verificacion termina en un booleano del cliente, igual que `verificarPin()`. Quien tenga devtools salta el candado igual y lee `fk_v1` en texto plano, que es exactamente lo que el ADR 063 (puntos 3 y 5) ya escribio en pantalla. La ganancia neta es comodidad: ahorrar 4 pulsaciones al abrir.
2. **Convierte esa comodidad en una trampa de perdida de datos.** La credencial se pierde sin tocar `fk_v1` cuando el usuario desinstala la PWA, limpia los datos del sitio, cambia de equipo o cuando cambia el dominio. Quien desbloquea con huella a diario deja de teclear el PIN y lo olvida, y la unica salida honesta que existe hoy es la del ADR 063 punto 7: **"Olvide mi PIN" borra todo**. Una funcion de conveniencia no puede terminar costando el historial completo.
3. **Rompe el modelo mental de "todo vive en `fk_v1`"** (ADN 3) por primera vez en el proyecto, y lo rompe para no dar nada que el PIN no de ya.
4. **Se acopla al dominio.** El RP ID es el dominio, y el spike confirmo que el origen manda (una IP ni siquiera es RP ID valido). Mudar de `finko-brown.vercel.app` a un dominio propio (tarjeta A.5) invalidaria de golpe todas las credenciales registradas.
5. **Cuesta cobertura de pruebas.** happy-dom no trae WebAuthn (habria que stubearlo entero) y el E2E necesita autenticador virtual por CDP. Se puede: se paga por comodidad.

## Alternativas rechazadas

| Alternativa | Por que se rechaza |
|---|---|
| **Biometria como unico metodo, sin PIN** | Sin fallback, perder la credencial (desinstalar, limpiar datos, cambiar de equipo) deja al usuario fuera de su propia app, y el unico rescate posible sin servidor es borrar todo. Es la version peor del motivo 2. |
| **Biometria opcional encima del PIN** | Es justo lo que el spike midio y funciona. Se rechaza igual: mientras olvidar el PIN cueste el historial completo, cualquier cosa que haga que el usuario deje de teclearlo a diario juega en contra suya. |
| **Passkey sincronizada** (`residentKey: 'required'` + iCloud Keychain o Google Password Manager) | La sincronizacion mitiga el motivo 2, pero a cambio ata el desbloqueo a una cuenta de plataforma: exactamente la direccion que el [ADR 043](043-sincronizacion-multidispositivo-y-cuentas.md) todavia no decidio. Y no cubre el motivo 4. |
| **Dejar la decision abierta hasta probar en el telefono de Esteban** | La evidencia de dispositivo hace falta para **prometer**, no para no prometer. Ninguno de los cinco motivos depende de que la huella responda en su telefono: el spike ya mostro que la API responde. Dejarla "en estudio" solo mantiene viva una expectativa que la decision no va a cumplir. |
| **Cifrar `fk_v1` con la credencial** (usar la firma como material de clave) | La extension `prf` de WebAuthn permitiria derivar una clave estable, pero su soporte varia mas que el resto de la API y arrastra el paquete completo que el ADR 063 ya rechazo: `save()` asincrono y cifrado (ADN 5), migraciones que dejan de leer el JSON (ADN 6), 269 E2E que siembran `fk_v1` plano. Ademas eleva el motivo 2 a perdida definitiva e irreversible. |

## Consecuencias

- **CFG.5c cierra sin codigo y sin pantalla nueva.** Es el resultado que la tarjeta pedia: un ADR que decide por escrito.
- **El ADR 063 queda corregido en su motivo, no en su decision.** Su tabla de alternativas decia que la biometria no entrega una credencial comparable localmente "sin un verificador": es falso, el verificador es `crypto.subtle` y corre en el cliente. La conclusion de aquel ADR (no incluirla en CFG.5a) se sostiene, con los motivos de este documento. Se agrega la nota correspondiente en el 063: no se revierte ni se corrige un ADR en silencio.
- **La tarjeta A.5 (dominio propio) queda con un riesgo menos:** al no haber credenciales WebAuthn registradas, mudar de dominio no arrastra nada.
- **La iniciativa CFG.5 queda cerrada con CFG.5b** (re-autenticacion con PIN en acciones criticas), que es la unica rebanada que sigue viva y no depende de esta decision.
- **Lo que reabre el tema, y solo si se dan las dos a la vez:** que el ADR 043 se resuelva con un respaldo real (perder la credencial local deja de significar perder el historial) **y** que el dominio quede fijo. Sin esas dos, volver a discutirlo es repetir este documento.
- **El script del spike no entra al repo:** es de un solo uso y su valor es el resultado, ya escrito arriba. Lo esencial para repetirlo, si algun dia hace falta, es el bloque de abajo.

## Como repetir el spike

```js
// Autenticador virtual de plataforma por CDP (Playwright, Chromium):
const cdp = await page.context().newCDPSession(page);
await cdp.send('WebAuthn.enable');
await cdp.send('WebAuthn.addVirtualAuthenticator', { options: {
  protocol: 'ctap2', transport: 'internal', hasResidentKey: true,
  hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true,
} });

// En la pagina (contexto seguro): registrar, desbloquear y verificar sin servidor.
const cred = await navigator.credentials.create({ publicKey: {
  challenge: crypto.getRandomValues(new Uint8Array(32)),
  rp: { id: location.hostname, name: 'Finko' },
  user: { id: new Uint8Array([1]), name: 'local', displayName: 'local' },
  pubKeyCredParams: [{ type: 'public-key', alg: -7 }],           // ES256
  authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
  attestation: 'none',
} });
const spki = cred.response.getPublicKey();                        // lo unico a persistir
// ...navigator.credentials.get({ allowCredentials: [{ id: cred.rawId, type: 'public-key' }] })
// ...crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, clave,
//      firmaDerARaw(asercion.response.signature),
//      concat(authenticatorData, SHA-256(clientDataJSON)))       // devolvio true
```
