/**
 * service-worker.js - PWA offline-first para Finko.
 *
 * Estrategia: Cache First.
 *   install  → precachea CORE_ASSETS; OPTIONAL_ASSETS se cachean sin bloquear.
 *   activate → elimina caches de versiones anteriores.
 *   fetch    → sirve desde cache; si no está, va a red y actualiza cache.
 *
 * ⚠️  Bumpear CACHE_NAME cada vez que cambien assets en producción,
 *     o los usuarios seguirán viendo la versión vieja.
 */

const CACHE_NAME = 'finko-v426';

// ── Assets críticos - si falla uno, el install falla (correcto) ───────────
const CORE_ASSETS = [
  // Raíz
  './',
  './manifest.json',

  // CSS
  './styles/main.css',
  './styles/tokens.css',
  './styles/reset.css',
  './styles/base.css',
  './styles/layout.css',
  './styles/components.css',
  './styles/components/buttons.css',
  './styles/components/forms.css',
  './styles/components/atoms.css',
  './styles/components/analysis.css',
  './styles/components/charts.css',
  './styles/components/nudges.css',
  './styles/components/domain.css',
  './styles/components/config.css',
  './styles/modals.css',
  './styles/themes.css',
  './styles/a11y.css',
  './styles/utils.css',
  './styles/responsive.css',

  // Core
  './modules/core/state.js',
  './modules/core/storage.js',
  './modules/core/constants.js',

  // Infra
  './modules/infra/utils.js',
  './modules/infra/crud.js',
  './modules/infra/render.js',
  './modules/infra/memo.js',
  './modules/infra/vencimientos.js',
  './modules/infra/router.js',
  './modules/infra/a11y.js',
  './modules/infra/csv.js',
  './modules/infra/svg.js',
  './modules/infra/icons.js',
  './modules/infra/icon-picker.js',
  './modules/infra/bancos.js',
  './modules/infra/marcas.js',
  './modules/infra/distribuir-pago.js',
  './modules/infra/animate.js',
  './modules/infra/notificaciones.js',
  './modules/infra/sw-register.js',
  './modules/infra/form-errors.js',
  './modules/infra/markdown.js',

  // UI
  './modules/ui/actions.js',
  './modules/ui/bootstrap.js',
  './modules/ui/modales.js',
  './modules/ui/confirm.js',
  './modules/ui/onboarding.js',
  './modules/ui/shell.js',
  './modules/ui/menu-mas.js',
  './modules/ui/registrar.js',
  './modules/ui/install-prompt.js',
  './modules/ui/proposito.js',

  // Dominios
  './modules/dominio/gastos/logic.js',
  './modules/dominio/gastos/view.js',
  './modules/dominio/gastos/index.js',
  './modules/dominio/compromisos/logic.js',
  './modules/dominio/compromisos/logic/modelo.js',
  './modules/dominio/compromisos/logic/alertas.js',
  './modules/dominio/compromisos/logic/estrategia.js',
  './modules/dominio/compromisos/logic/abonos.js',
  './modules/dominio/compromisos/view.js',
  './modules/dominio/compromisos/views/alertas.js',
  './modules/dominio/compromisos/views/lista.js',
  './modules/dominio/compromisos/views/formularios.js',
  './modules/dominio/compromisos/views/estrategia.js',
  './modules/dominio/compromisos/views/estrategia-impacto.js',
  './modules/dominio/compromisos/views/dashboard.js',
  './modules/dominio/compromisos/index.js',
  './modules/dominio/resumen/logic.js',
  './modules/dominio/resumen/view.js',
  './modules/dominio/resumen/index.js',
  './modules/dominio/movimientos/logic.js',
  './modules/dominio/movimientos/view.js',
  './modules/dominio/movimientos/index.js',
  './modules/dominio/accesos/logic.js',
  './modules/dominio/accesos/view.js',
  './modules/dominio/accesos/index.js',
  './modules/dominio/agenda/logic.js',
  './modules/dominio/agenda/view.js',
  './modules/dominio/agenda/index.js',
  './modules/dominio/personales/logic.js',
  './modules/dominio/personales/view.js',
  './modules/dominio/personales/index.js',
  './modules/dominio/tesoreria/logic.js',
  './modules/dominio/tesoreria/logic/cuentas.js',
  './modules/dominio/tesoreria/logic/ingresos.js',
  './modules/dominio/tesoreria/logic/distribucion.js',
  './modules/dominio/tesoreria/logic/transferencias.js',
  './modules/dominio/tesoreria/view.js',
  './modules/dominio/tesoreria/views/cuentas.js',
  './modules/dominio/tesoreria/views/ingresos.js',
  './modules/dominio/tesoreria/views/distribucion.js',
  './modules/dominio/tesoreria/views/transferencias.js',
  './modules/dominio/tesoreria/acciones/cuentas.js',
  './modules/dominio/tesoreria/acciones/ingresos.js',
  './modules/dominio/tesoreria/acciones/distribucion.js',
  './modules/dominio/tesoreria/acciones/transferencias.js',
  './modules/dominio/tesoreria/index.js',
  './modules/dominio/metas/logic.js',
  './modules/dominio/metas/view.js',
  './modules/dominio/metas/index.js',
  './modules/dominio/apartados/logic.js',
  './modules/dominio/apartados/view.js',
  './modules/dominio/apartados/index.js',
  './modules/dominio/analisis/logic.js',
  './modules/dominio/analisis/view.js',
  './modules/dominio/analisis/index.js',
  './modules/infra/financiero.js',
  './modules/dominio/config/view.js',
  './modules/dominio/config/index.js',
  './modules/dominio/config/legal.js',

  // Centro Legal (LEG.1) - textos fuente, docs/legal/ es la fuente de verdad.
  './docs/legal/terminos-y-condiciones.md',
  './docs/legal/politica-de-privacidad.md',
  './docs/legal/tratamiento-de-datos-personales.md',
  './docs/legal/aviso-de-cookies.md',
  './docs/legal/descargo-de-responsabilidad.md',
  './docs/legal/propiedad-intelectual.md',
  './docs/legal/marcas-de-terceros.md',
  './docs/legal/licencias-de-terceros.md',
  './docs/legal/aviso-legal.md',
  './docs/legal/historial-de-cambios.md',
  './modules/dominio/import/logic.js',
  './modules/dominio/import/view.js',
  './modules/dominio/import/index.js',
  './modules/dominio/export/logic.js',
  './modules/dominio/presupuesto/logic.js',
  './modules/dominio/presupuesto/view.js',
  './modules/dominio/presupuesto/index.js',
  './modules/dominio/logros/logic.js',
  './modules/dominio/logros/view.js',
  './modules/dominio/logros/index.js',
  './modules/dominio/ahorro/logic.js',
  './modules/dominio/ahorro/view.js',
  './modules/dominio/ahorro/index.js',
  './modules/dominio/inversiones/logic.js',
  './modules/dominio/inversiones/view.js',
  './modules/dominio/inversiones/index.js',
];

// ── Assets opcionales - se intentan cachear pero no bloquean el install ───
const OPTIONAL_ASSETS = [
  // Fuentes self-hosted (WOFF2). No bloquean el install pero se pre-cachean
  // para disponibilidad offline inmediata. Ya están en CORE via main.css;
  // aquí se garantiza que el archivo esté en cache aunque main.css ya esté.
  './assets/fonts/inter-variable.woff2',
  './assets/fonts/dm-mono-400.woff2',
  './assets/fonts/dm-mono-500.woff2',

  './assets/icons/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/screenshots/screenshot-1-dashboard.png',
  './assets/screenshots/screenshot-2-gastos.png',
  './assets/splash/splash-750x1334.png',
  './assets/splash/splash-1170x2532.png',
  './assets/splash/splash-1179x2556.png',
  './assets/splash/splash-1284x2778.png',
  './assets/splash/splash-1290x2796.png',
];

// ── INSTALL ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Core: fallo aquí = install falla = SW no se activa (comportamiento correcto).
      // `cache: 'reload'` evita servir versiones obsoletas del HTTP cache del browser
      // o CDN intermedio - fuerza un fetch fresco contra origen al instalar.
      await cache.addAll(
        CORE_ASSETS.map((url) => new Request(url, { cache: 'reload' })),
      );

      // Opcionales: ignorar individualmente para no bloquear el install.
      await Promise.allSettled(
        OPTIONAL_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {
            // Íconos pueden no existir aún; no es crítico para funcionar offline.
          })
        )
      );
    })
  );

  // skipWaiting() SÍ, y acá está el porqué (UPD.1, revisa la decisión anterior
  // de este mismo bloque, que decía lo contrario).
  //
  // Sin skipWaiting el SW nuevo queda en "waiting" hasta que no quede NINGUNA
  // página controlada por el viejo. Eso no es "la próxima recarga": es cerrar
  // todas las pestañas de la app, y en una PWA instalada puede no pasar en
  // días. Medido en producción: con la v423 activa, un F5 instalaba la v424 y
  // seguía sirviendo la v423, así que un fix publicado no llegaba nunca.
  //
  // Peor, el arreglo no podía vivir del lado de la página: `sw-register.js` lo
  // sirve el SW viejo desde su propio cache, así que cualquier lógica nueva de
  // actualización queda atrapada detrás de la versión que intenta reemplazar.
  // Este archivo es el único que el navegador vuelve a pedir a la red en cada
  // carga (byte-compare + `Cache-Control: no-store`), así que es el único lugar
  // donde el desbloqueo funciona de verdad.
  //
  // El riesgo que la decisión anterior quería evitar (recargar la página en
  // medio de una interacción) NO lo causaba skipWaiting: lo causaba el listener
  // de 'controllerchange' que recargaba siempre, incluso en la primera visita.
  // La recarga vive ahora en sw-register.js con tres guardas, y un SW nuevo
  // tomando el control sin recargar no interrumpe nada: los assets ya cargados
  // siguen en memoria.
  self.skipWaiting();
});

// ── ACTIVATE ───────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );

  // clients.claim() hace que este SW controle la página apenas se activa.
  // En la PRIMERA instalación (no había SW antes) eso habilita el modo offline
  // de inmediato. En una ACTUALIZACIÓN, junto con el skipWaiting del install,
  // es lo que hace que la página en curso pase a este SW y que se dispare
  // 'controllerchange': la señal que sw-register.js usa para recargar una sola
  // vez y con guardas.
  self.clients.claim();
});

// ── FETCH ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Solo interceptar GETs del mismo origen.
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Cache hit → devolver inmediatamente.
      if (cached) return cached;

      // Cache miss → red, y guardar la respuesta exitosa en cache.
      return fetch(event.request)
        .then((response) => {
          // No cachear respuestas no-200, opacas o de error.
          if (
            !response ||
            response.status !== 200 ||
            response.type === 'opaque'
          ) {
            return response;
          }

          const clone = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clone));

          return response;
        })
        .catch(() => {
          // Sin red y sin cache: para navegación, devolver el shell.
          if (event.request.mode === 'navigate') {
            return caches.match('./');
          }
          // Para otros recursos: dejar que el error llegue al cliente.
          return new Response('Sin conexión', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
    })
  );
});
