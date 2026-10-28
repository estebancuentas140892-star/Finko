// En desarrollo (localhost / IP local) NO registramos el SW: el cache viejo
// hace que veas CSS/JS mezclado de distintas versiones mientras iterás. En
// produccion el SW sigue habilitado y la app es offline-first.
// Piso entre dos chequeos de versión nueva al volver a la app. Un minuto:
// cambiar de app y volver es un gesto que se repite muchas veces por sesión y
// no tiene sentido pedir el SW en cada uno.
const CHEQUEO_MIN_MS = 60 * 1000;

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
    // UPD.3: una versión nueva se anuncia con un botón, no recarga sola.
    //
    // El SW nuevo ya se activa solo (skipWaiting en service-worker.js), pero
    // activarse no cambia lo que la página tiene en memoria: la persona sigue
    // viendo la versión vieja hasta recargar. UPD.1 recargaba sola cuando no
    // había un modal abierto ni un campo con foco, y solo mostraba el aviso en
    // el caso contrario. Desde UPD.3 el aviso con el botón "Actualizar"
    // (modules/ui/sw-aviso.js) sale siempre: la pantalla nunca salta sola y
    // quien usa la app sabe que llegó algo nuevo. Si lo deja pasar, la versión
    // nueva igual entra la próxima vez que abra Finko, porque ya es la activa.
    //
    // El bug que hay que NO repetir: en la primera visita (sin SW previo)
    // clients.claim() también dispara 'controllerchange', y no hay ninguna
    // versión vieja que reemplazar. Por eso se compara contra el controlador
    // anterior: sin controlador antes, es instalación y no actualización.
    let _controlador = navigator.serviceWorker.controller;

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      const anterior = _controlador;
      _controlador = navigator.serviceWorker.controller;
      if (!anterior) return;
      // Dos señales y no una. El atributo en <html> queda puesto: sw-aviso.js
      // lo lee al arrancar (por si el cambio llegó antes que su listener) y
      // Ajustes lo usa para saber que solo falta recargar. El evento avisa en
      // el momento. document y no EventBus: este archivo es un <script>
      // clasico (no type module), no puede importar, y la regla 8 del ADN
      // prohibe window.X.
      document.documentElement.dataset.swActualizacion = 'lista';
      document.dispatchEvent(new CustomEvent('sw:actualizacion-lista'));
    });

    // updateViaCache: 'none' obliga al navegador a pedir service-worker.js a la
    // red y no al HTTP cache. La cabecera `no-store` ya lo pide (vercel.json),
    // pero en movil el HTTP cache es mas agresivo y esto no depende del server.
    navigator.serviceWorker
      .register('./service-worker.js', { updateViaCache: 'none' })
      .then(function (reg) {
        // Chequear si hay una versión nueva del SW al arrancar. Sin esto el
        // navegador puede demorar hasta 24h en re-fetchear el SW.
        reg.update().catch(function () { /* offline o sin red: ignorar */ });

        // Y chequear también al volver a la app. Esto es lo que arregla el
        // móvil: una PWA instalada casi nunca "navega". El usuario la manda al
        // fondo y la vuelve a traer, y sin navegación el navegador no vuelve a
        // pedir service-worker.js, así que no descubre la versión nueva ni en
        // días. En escritorio un F5 basta; en el teléfono, volver a la app es
        // el equivalente y es el momento correcto de mirar.
        let _ultimoChequeo = Date.now();
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState !== 'visible') return;
          // Cambiar de app rápido varias veces no debe disparar N chequeos.
          if (Date.now() - _ultimoChequeo < CHEQUEO_MIN_MS) return;
          _ultimoChequeo = Date.now();
          reg.update().catch(function () { /* offline o sin red: ignorar */ });
        });
      })
      .catch(function (err) {
        console.error('[SW] Error al registrar:', err);
      });
  }
}
