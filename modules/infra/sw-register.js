if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./service-worker.js')
    .catch(function (err) {
      console.error('[SW] Error al registrar:', err);
    });
}
