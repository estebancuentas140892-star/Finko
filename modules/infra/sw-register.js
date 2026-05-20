if ('serviceWorker' in navigator) {
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
