if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./service-worker.js')
    .then(function (reg) {
      // Forzar chequeo de versión nueva del SW al arrancar la app.
      // Sin esto, el navegador puede demorar hasta 24h en re-fetchear el SW,
      // dejando al usuario con CSS/JS viejo aunque ya haya un deploy nuevo.
      // skipWaiting + clients.claim (en el SW) hacen que la nueva versión
      // tome control inmediatamente cuando se detecta.
      reg.update().catch(function () { /* offline o sin red: ignorar */ });
    })
    .catch(function (err) {
      console.error('[SW] Error al registrar:', err);
    });
}
