// En desarrollo (localhost / IP local) NO registramos el SW: el cache viejo
// hace que veas CSS/JS mezclado de distintas versiones mientras iterás. En
// produccion el SW sigue habilitado y la app es offline-first.
const _hostname = location.hostname;
const _esDesarrollo =
  _hostname === 'localhost' ||
  _hostname === '127.0.0.1' ||
  _hostname === '0.0.0.0' ||
  _hostname === '' ||
  _hostname.endsWith('.local') ||
  /^192\.168\./.test(_hostname) ||
  /^10\./.test(_hostname);

if ('serviceWorker' in navigator) {
  if (_esDesarrollo) {
    // Si el usuario tenia un SW activo de una sesion anterior, lo desregistramos
    // y limpiamos caches para que el browser vuelva a fetchear todo de red.
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) { r.unregister(); });
    }).catch(function () { /* ignorar */ });
    if ('caches' in window) {
      caches.keys().then(function (keys) {
        keys.forEach(function (k) { caches.delete(k); });
      }).catch(function () { /* ignorar */ });
    }
  } else {
    // IMPORTANTE: no recargamos la página automáticamente.
    //
    // Antes había un listener de 'controllerchange' que llamaba a
    // location.reload() para forzar la versión nueva. El problema: en la PRIMERA
    // visita (sin SW previo), cuando el SW recién instalado hacía clients.claim()
    // el controlador pasaba de null a SW y 'controllerchange' se disparaba,
    // recargando la página justo cuando el usuario nuevo estaba escribiendo su
    // nombre en el onboarding. Resultado: la pantalla "saltaba" sola a los pocos
    // segundos (el tiempo que tarda el SW en cachear los assets).
    //
    // Ahora el SW ya no usa skipWaiting (ver service-worker.js): una versión
    // nueva queda en "waiting" y se aplica sola en la próxima apertura limpia de
    // la app. Nunca se recarga en medio de una interacción (onboarding, modales,
    // formularios). El offline-first se mantiene intacto.
    navigator.serviceWorker
      .register('./service-worker.js')
      .then(function (reg) {
        // Chequear si hay una versión nueva del SW al arrancar, para que quede
        // pre-cacheada y lista de activar en la próxima apertura. Sin esto el
        // navegador puede demorar hasta 24h en re-fetchear el SW.
        reg.update().catch(function () { /* offline o sin red: ignorar */ });
      })
      .catch(function (err) {
        console.error('[SW] Error al registrar:', err);
      });
  }
}
