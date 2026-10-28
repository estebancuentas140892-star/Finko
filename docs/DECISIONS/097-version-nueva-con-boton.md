# ADR 097 - Una versión nueva se anuncia con un botón, no recarga sola

**Estado:** Aceptada (2026-10-28). Pedido en chat: un botón de actualizar que salga en la app cada vez que haya cambios, para que nadie tenga que desinstalar la app ni borrar la caché, y que conserve su información.
**Fecha:** 2026-10-28
**Autores:** Linay (pedido y decisión de producto), Claude Opus 5.5 (análisis, implementación y redacción)
**Relación:** **reemplaza la decisión de alcance de UPD.1** (2026-08-02, ficha [`contexto/transversal.md`](../contexto/transversal.md)): "el caso seguro sigue recargando solo sin aviso; el aviso visible aparece solo cuando el guard bloquea la recarga". No era un ADR; se escribe uno porque cambia un comportamiento ya en producción con una alternativa descartada. Conserva UPD.2 (`skipWaiting`, traspaso del cache viejo al nuevo y `claim` después) y el resumen de novedades de UPD.1. No toca el ADN.

---

## Contexto

Desde UPD.1 una versión nueva entraba así: el navegador encuentra el `service-worker.js` nuevo (al abrir y al volver a la app), lo instala, toma el control y `sw-register.js` recarga la página **sola** si no hay un modal abierto ni un campo con foco. Solo si la recarga no era segura aparecía un aviso con botón.

Tres problemas con la prueba con conocidos (iniciativa NUBE):

1. **La recarga silenciosa no se ve.** Quien usa la app no sabe que llegó algo nuevo; si no lo nota, cree que sigue en la versión vieja y hace lo único que conoce: desinstalar o borrar la caché.
2. **La pantalla salta sola** unos segundos después de abrir, mientras la persona ya está leyendo.
3. **No había salida dentro de la app** si la instalación quedaba trabada en una versión vieja (un precache que falla deja al SW viejo mandando). "Borrar datos de navegación" sí la destraba, pero se lleva `localStorage`, que es donde viven los datos.

## Decisión

### D1. El aviso con el botón "Actualizar" sale siempre

Cuando el SW nuevo toma el control de una página que ya tenía uno, `sw-register.js` ya no recarga: marca `<html data-sw-actualizacion="lista">` y emite `sw:actualizacion-lista`. `ui/sw-aviso.js` muestra "Hay una versión nueva de Finko. Tus datos se conservan." con **Actualizar** (recarga) y **Ahora no** (lo cierra; vuelve a salir al regresar a la app). La primera instalación no avisa: no hay versión vieja que reemplazar.

Actualizar es recargar. Los datos no corren riesgo: viven en `localStorage`, que ni el SW ni la recarga tocan, y el guardado pendiente se escribe en `pagehide`.

### D2. "Actualizar app" en Ajustes: buscar a pedido y reparar

En el grupo "La app", **Buscar actualización** pide el SW a la red en el momento; si hay versión nueva espera a que quede instalada y recarga, y si no, dice "Ya tienes la versión más reciente". Plegado, **Reparar la app** quita el SW y borra solo los caches `finko-` para que todo baje de nuevo de la red, sin tocar `localStorage`. Sin red no borra nada. "Acerca de" muestra el número de la versión instalada (`1.0.0 (617)`) para confirmar que una actualización entró.

## Alternativas descartadas

- **Mantener la recarga silenciosa y sumar solo el botón de Ajustes.** Es la de menos cambio, pero deja los tres problemas del contexto: la actualización sigue sin verse y la pantalla sigue saltando.
- **Recargar sola cuando es seguro y además mostrar un aviso de "se actualizó".** Avisa, pero después de interrumpir.
- **Comparar un `version.json` desde la página** en vez del ciclo del SW. Duplica lo que el navegador ya hace con `service-worker.js` (lo pide a la red en cada chequeo) y agrega un archivo que hay que mantener en paralelo al bump.

## Consecuencias

### Positivas

- La persona ve cada versión nueva y decide cuándo aplicarla. Nunca más hace falta desinstalar ni borrar la caché.
- Una instalación trabada se repara desde la app sin perder datos.

### Negativas / Restricciones

- Quien ignora el aviso sigue en la versión vieja mientras tenga la app abierta. La nueva igual entra al volver a abrirla, porque ya es la activa.
- **La primera versión con este cambio entra todavía por la recarga silenciosa**: la decide el `sw-register.js` viejo, que está en el cache de cada instalación. El aviso rige desde la siguiente publicación.
- El ciclo real del SW sigue sin E2E (no corre en localhost). Se verificó a mano con un host `*.localhost`, que la app trata como producción, simulando tres publicaciones.
