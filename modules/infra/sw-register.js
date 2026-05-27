// En desarrollo (localhost / IP local) NO registramos el SW: el cache viejo
// hace que veas CSS/JS mezclado de distintas versiones mientras iterás. En
// produccion el SW sigue habilitado y la app es offline-first.
var _hostname = location.hostname;
var _esDesarrollo =
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
    // Cuando un SW nuevo toma control (skipWaiting + clients.claim), los assets
    // en memoria son los viejos. Recargar la pagina automaticamente para que el
    // usuario vea el CSS/JS nuevo sin tener que cerrar y abrir la app manualmente.
    // Flag para no entrar en bucle infinito en la primera instalacion.
    var _ya_recargado = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (_ya_recargado) return;
      _ya_recargado = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register('./service-worker.js')
      .then(function (reg) {
        // Forzar chequeo de version nueva del SW al arrancar la app.
        // Sin esto, el navegador puede demorar hasta 24h en re-fetchear el SW,
        // dejando al usuario con CSS/JS viejo aunque ya haya un deploy nuevo.
        // skipWaiting + clients.claim (en el SW) hacen que la nueva version
        // tome control inmediatamente cuando se detecta.
        reg.update().catch(function () { /* offline o sin red: ignorar */ });
      })
      .catch(function (err) {
        console.error('[SW] Error al registrar:', err);
      });
  }
}
