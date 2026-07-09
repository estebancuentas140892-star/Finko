# Licencias de terceros

**Versión:** 0.1 (borrador, pendiente de revisión jurídica)
**Fecha:** 2026-07-09

---

## En pocas palabras

- Finko funciona sin librerías externas: el código de la app es propio, escrito en JavaScript estándar.
- Lo que sí viene de terceros son las **fuentes tipográficas** (Inter y DM Mono) y parte de los **trazados de logotipos** (Simple Icons). Todos son proyectos abiertos y sus licencias se respetan y se listan aquí.
- Las herramientas que usamos para desarrollar y probar la app no se distribuyen contigo: no forman parte de lo que descargas.

---

## 1. Componentes distribuidos con la aplicación

Estos son los únicos recursos de terceros que llegan a tu dispositivo al instalar Finko:

### 1.1. Fuente tipográfica Inter

- **Autor:** Rasmus Andersson.
- **Licencia:** SIL Open Font License 1.1 (OFL-1.1).
- **Uso en Finko:** tipografía principal de toda la interfaz, distribuida como archivo de fuente empaquetado con la app.
- **Texto de la licencia:** `https://openfontlicense.org` (el texto completo se incluirá en el Centro Legal de la app).

### 1.2. Fuente tipográfica DM Mono

- **Autor:** Colophon Foundry (encargo de Google Fonts).
- **Licencia:** SIL Open Font License 1.1 (OFL-1.1).
- **Uso en Finko:** tipografía de cifras y contextos monoespaciados, distribuida como archivos de fuente empaquetados con la app.
- **Texto de la licencia:** `https://openfontlicense.org` (el texto completo se incluirá en el Centro Legal de la app).

La OFL permite usar, empaquetar y redistribuir las fuentes con el software, prohíbe venderlas por separado y exige conservar sus avisos de autoría y licencia.

### 1.3. Simple Icons (glifos de marca)

- **Proyecto:** Simple Icons (`https://simpleicons.org`).
- **Licencia:** CC0 1.0 Universal (dedicación al dominio público).
- **Uso en Finko:** una selección curada de trazados monocromos de logotipos, incorporada al sprite de iconos de la app.
- **Nota:** CC0 libera el trazado como obra gráfica; **no** libera las marcas representadas, que siguen siendo de sus titulares (ver el [Aviso de marcas de terceros](marcas-de-terceros.md)).

## 2. Lo que NO se distribuye

2.1. Finko no usa frameworks, librerías de interfaz ni SDKs en ejecución: el JavaScript, el CSS y el HTML de la app son código propio que corre directamente en tu navegador.

2.2. Las herramientas de desarrollo y prueba (Vitest, Playwright, ESLint, Prettier, Lighthouse, happy-dom, axe-core y similares) se usan para construir y verificar la app, pero **no forman parte de los archivos que descargas** y por eso no imponen condiciones sobre tu uso de Finko. Cada una conserva su licencia en su propio proyecto.

2.3. Los iconos de categorías y símbolos de la interfaz (sistema Finko Icons) son diseño propio, no de terceros (ver [Propiedad intelectual](propiedad-intelectual.md)).

## 3. Actualización de esta lista

Si en el futuro se incorpora cualquier recurso de terceros nuevo (una fuente, un glifo, una librería), se agregará a esta lista antes de publicarse, con su autor, licencia y uso. Los cambios quedan en el [Historial de cambios](historial-de-cambios.md).
