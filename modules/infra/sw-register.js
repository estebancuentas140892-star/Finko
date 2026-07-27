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
    // UPD.1: una versión nueva entra con una sola recarga.
    //
    // El SW nuevo ya se activa solo (skipWaiting en service-worker.js), pero
    // activarse no cambia lo que la página tiene en memoria: sin esta recarga
    // el usuario ve los assets viejos hasta que vuelva a entrar. Con ella, un
    // F5 alcanza: el SW nuevo toma el control, dispara 'controllerchange' y la
    // página se recarga una vez contra el cache nuevo.
    //
    // El bug que hay que NO repetir: antes existía un listener de
    // 'controllerchange' que recargaba SIEMPRE. En la primera visita (sin SW
    // previo) clients.claim() dispara el evento, así que la pantalla saltaba
    // sola a los pocos segundos, justo cuando el usuario nuevo estaba
    // escribiendo su nombre en el onboarding. De ahí las tres guardas:
    // solo si YA había un controlador (o sea, es actualización y no primera
    // instalación), solo una vez por carga, y solo si no hay nada abierto que
    // el usuario pueda perder.
    let _yaRecargado = false;
    const _habiaControlador = Boolean(navigator.serviceWorker.controller);

    // Declarada dentro del bloque a proposito: en un <script> clasico una
    // funcion de nivel superior seria window.esSeguroRecargar, y la regla 8 del
    // ADN prohibe cualquier window.X. El precio es que no se puede importar en
    // un test; de todos modos el ciclo del SW no corre en localhost (rama de
    // arriba), asi que este archivo nunca tuvo cobertura automatizada.
    const esSeguroRecargar = function () {
      // Un modal abierto (`.modal-overlay[data-open]`, contrato de
      // ui/modales.js) o un campo con foco significan que el usuario esta en
      // medio de algo. Ahi NO se recarga: la version nueva ya quedo activa, asi
      // que entra sola en la proxima recarga natural. Se pierde inmediatez,
      // nunca datos.
      if (document.querySelector('.modal-overlay[data-open]')) return false;
      const foco = document.activeElement;
      return !(foco && /^(INPUT|TEXTAREA|SELECT)$/.test(foco.tagName));
    };

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (_yaRecargado || !_habiaControlador) return;
      if (!esSeguroRecargar()) return;
      _yaRecargado = true;
      location.reload();
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
