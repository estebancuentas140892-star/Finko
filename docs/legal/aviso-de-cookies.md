# Aviso de cookies y almacenamiento local

**Versión:** 0.1 (borrador, pendiente de revisión jurídica)
**Fecha:** 2026-07-09

---

## En pocas palabras

- Finko **no usa cookies**. Ninguna: ni de rastreo, ni de publicidad, ni de analytics, ni de sesión.
- La app sí usa el **almacenamiento local** del navegador (`localStorage`), pero solo para una cosa: guardar TUS datos financieros y preferencias en TU dispositivo. Eso es la app funcionando, no un rastreador.
- También guarda una copia de sus propios archivos (caché) para funcionar sin internet.
- Todo se borra desde Ajustes o borrando los datos del sitio en tu navegador.

---

## 1. Cookies: ninguna

1.1. Finko no crea, lee ni utiliza cookies de ningún tipo. No hay cookies propias ni de terceros, porque la app no incluye servicios de terceros en su funcionamiento (sin analytics, sin publicidad, sin botones sociales, sin mapas ni contenido incrustado).

1.2. Por la misma razón, Finko no muestra un banner de consentimiento de cookies: no hay nada que consentir.

## 2. Almacenamiento local (`localStorage`): funcional y bajo tu control

2.1. Finko usa el `localStorage` del navegador como su única base de datos, en tu dispositivo. Ahí se guardan:

- Tus datos financieros (clave `fk_v1`): ingresos, gastos, deudas, ahorros, metas, cuentas y configuración de la app.
- Preferencias de uso (por ejemplo, el tema visual).

2.2. Este almacenamiento es **estrictamente funcional**: sin él la app no puede recordar nada entre sesiones. No se usa para identificarte, perfilarte ni rastrearte, y su contenido nunca se transmite (ver la [Política de privacidad](politica-de-privacidad.md)).

## 3. Caché de la aplicación (service worker)

Para funcionar sin conexión, la app guarda una copia local de sus propios archivos (HTML, CSS, JavaScript, iconos) mediante un service worker. Esa caché contiene archivos de la aplicación, nunca datos tuyos, y se renueva sola cuando hay una versión nueva.

## 4. Cómo borrar todo

- **Desde la app:** Ajustes ofrece borrar todos los datos.
- **Desde el navegador:** borrar los datos del sitio (`https://finko-brown.vercel.app`) elimina el `localStorage` y la caché. La app quedará como recién instalada y tu información no podrá recuperarse salvo que tengas un respaldo exportado.

## 5. Cambios

Si Finko llegara a necesitar cookies o tecnologías equivalentes (por ejemplo, por un cambio de modelo hacia cuentas de usuario), este aviso se actualizará antes de introducirlas y el cambio quedará en el [Historial de cambios](historial-de-cambios.md).
