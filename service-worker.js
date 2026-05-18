/**
 * service-worker.js — PWA offline-first para Finko.
 *
 * Estrategia: Cache First.
 *   install  → precachea CORE_ASSETS; OPTIONAL_ASSETS se cachean sin bloquear.
 *   activate → elimina caches de versiones anteriores.
 *   fetch    → sirve desde cache; si no está, va a red y actualiza cache.
 *
 * ⚠️  Bumpear CACHE_NAME cada vez que cambien assets en producción,
 *     o los usuarios seguirán viendo la versión vieja.
 */

const CACHE_NAME = 'finko-v2';

// ── Assets críticos — si falla uno, el install falla (correcto) ───────────
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
  './modules/infra/router.js',
  './modules/infra/a11y.js',
  './modules/infra/csv.js',
  './modules/infra/svg.js',
  './modules/infra/notificaciones.js',

  // UI
  './modules/ui/actions.js',
  './modules/ui/bootstrap.js',
  './modules/ui/modales.js',
  './modules/ui/onboarding.js',
  './modules/ui/shell.js',

  // Dominios
  './modules/dominio/ingresos/logic.js',
  './modules/dominio/ingresos/view.js',
  './modules/dominio/ingresos/index.js',
  './modules/dominio/gastos/logic.js',
  './modules/dominio/gastos/view.js',
  './modules/dominio/gastos/index.js',
  './modules/dominio/compromisos/logic.js',
  './modules/dominio/compromisos/view.js',
  './modules/dominio/compromisos/index.js',
  './modules/dominio/tesoreria/logic.js',
  './modules/dominio/tesoreria/view.js',
  './modules/dominio/tesoreria/index.js',
  './modules/dominio/metas/logic.js',
  './modules/dominio/metas/view.js',
  './modules/dominio/metas/index.js',
  './modules/dominio/analisis/logic.js',
  './modules/dominio/analisis/view.js',
  './modules/dominio/analisis/index.js',
  './modules/dominio/calculadoras/logic.js',
  './modules/dominio/calculadoras/view.js',
  './modules/dominio/calculadoras/index.js',
  './modules/dominio/config/view.js',
  './modules/dominio/config/index.js',
  './modules/dominio/import/logic.js',
  './modules/dominio/import/view.js',
  './modules/dominio/import/index.js',
  './modules/dominio/export/logic.js',
];

// ── Assets opcionales — se intentan cachear pero no bloquean el install ───
const OPTIONAL_ASSETS = [
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
];

// ── INSTALL ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Core: fallo aquí = install falla = SW no se activa (comportamiento correcto).
      await cache.addAll(CORE_ASSETS);

      // Opcionales: ignorar individualmente para no bloquear el install.
      await Promise.allSettled(
        OPTIONAL_ASSETS.map((url) =>
          cache.add(url).catch(() => {
            // Íconos pueden no existir aún; no es crítico para funcionar offline.
          })
        )
      );
    })
  );

  // Tomar control sin esperar a que las tabs abiertas recarguen.
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

  // Controlar todas las tabs ya abiertas sin esperar recarga.
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
