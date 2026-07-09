# Política de privacidad de Finko

**Versión:** 0.1 (borrador, pendiente de revisión jurídica)
**Fecha:** 2026-07-09
**Aplica a:** Finko en su modelo local-only (`https://finko-brown.vercel.app`).

---

## En pocas palabras

- **Tus datos financieros nunca salen de tu dispositivo.** Finko no tiene servidores, ni cuentas, ni bases de datos. Nadie en Finko puede ver lo que registras.
- Finko **no recolecta nada**: sin analytics, sin rastreadores, sin publicidad, sin cookies.
- Lo único que viaja por internet es la descarga de la app misma (los archivos que la componen), como al abrir cualquier página web.
- Tú controlas todo: exportas, importas o borras tu información desde Ajustes cuando quieras.

---

## 1. El principio: privacidad por diseño

Finko fue construida para que la privacidad no dependa de promesas sino de arquitectura. La aplicación no tiene servidor propio ni sistema de cuentas: técnicamente no existe un lugar donde Finko pueda recibir, almacenar o procesar tu información. Esta política describe ese modelo y lo que sí ocurre cuando usas la app.

## 2. Qué información registras y dónde vive

2.1. Al usar Finko ingresas información financiera personal: ingresos, gastos, deudas, ahorros, metas, cuentas, recordatorios y preferencias de la app.

2.2. Toda esa información se guarda **exclusivamente en el almacenamiento local (`localStorage`) del navegador de tu dispositivo**. No se transmite a Finko ni a terceros, no se respalda en ninguna nube y no se sincroniza con otros dispositivos.

2.3. Finko no te pide nombre, correo, teléfono, documento de identidad ni ningún dato de contacto. No hay registro ni inicio de sesión.

## 3. Qué NO hace Finko

- No usa herramientas de analítica ni de medición de audiencia.
- No usa cookies (ver el [Aviso de cookies y almacenamiento local](aviso-de-cookies.md)).
- No muestra publicidad ni comparte información con anunciantes.
- No incluye SDKs, scripts ni conexiones de terceros en su funcionamiento: la app no realiza peticiones a servicios externos mientras la usas.
- No vende, alquila ni cede datos, porque no los tiene.

## 4. Lo único que viaja por internet: la descarga de la app

4.1. Finko es una aplicación web. Para instalarla o actualizarla, tu navegador descarga los archivos de la app (HTML, CSS, JavaScript, iconos) desde el proveedor de hosting (Vercel Inc.), que sirve archivos estáticos.

4.2. Como cualquier servidor web, el proveedor de hosting procesa datos técnicos de la conexión (por ejemplo, la dirección IP y el navegador usado) para entregar los archivos y proteger su infraestructura. Ese procesamiento es propio del hosting y ocurre bajo las políticas de Vercel; **no incluye ninguno de tus datos financieros**, que nunca se envían.

4.3. Una vez instalada, la app funciona sin conexión: el service worker guarda una copia local de los archivos y solo vuelve a la red para buscar actualizaciones de la propia app.

## 5. Tus controles

Desde la sección Ajustes puedes, en cualquier momento:

- **Exportar** un respaldo completo de tus datos (archivo JSON) o tus gastos (CSV).
- **Importar** un respaldo para restaurar o mover tu información a otro dispositivo.
- **Borrar todos los datos** de la app en el dispositivo.

Borrar los datos de navegación del sitio desde el navegador tiene el mismo efecto que borrar desde Ajustes: la información se elimina de forma definitiva, sin copia en ninguna parte.

## 6. Tu responsabilidad: el respaldo

La contraparte de que nadie más tenga tus datos es que nadie puede recuperarlos por ti. Si el dispositivo se pierde, se daña o se borra su almacenamiento, la información solo sobrevive si exportaste un respaldo. La app te avisa cuando el espacio local se acerca al límite y te sugiere exportar.

## 7. Menores de edad

Finko no recolecta datos de nadie, incluidos menores de edad. Si un menor usa la app, su información queda igualmente solo en el dispositivo, bajo el control de quien lo administre.

## 8. Cambios a esta política

8.1. Cualquier cambio se registra en el [Historial de cambios](historial-de-cambios.md) y, si es importante, la app pedirá tu aceptación de la versión nueva.

8.2. **Cambio de modelo:** esta política describe el modelo local-only vigente. Si Finko llegara a ofrecer cuentas, respaldo en la nube o sincronización, esta política se reescribirá por completo antes de activar esas funciones, identificando responsable del tratamiento, finalidades, encargados y canales para ejercer tus derechos, y se pedirá tu consentimiento expreso.

## 9. Contacto

Preguntas o solicitudes sobre privacidad: `[PENDIENTE: correo de contacto]`. El marco de derechos sobre datos personales en Colombia está en la [Política de tratamiento de datos personales](tratamiento-de-datos-personales.md).
