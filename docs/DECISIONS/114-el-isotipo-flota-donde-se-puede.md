# ADR 114 - El isotipo flota donde se puede

**Estado:** Aceptada (2026-11-03). Pedido en chat: "que el isotipo de la app se vea tanto al descargar la app, como cuando queda instalada en el mobile [...] con fondo transparente para que luzca como los logos modernos". Esteban eligió en chat, sobre una vista previa con el isotipo real, "flota donde se pueda" con fondo blanco en la pantalla de inicio.
**Fecha:** 2026-11-03
**Autores:** Esteban (pedido y elección), Claude Opus 5.5 (vista previa, implementación y redacción)
**Relación:** **acota** el [ADR 103](103-el-isotipo-de-finko.md) en D3 (los íconos se derivaban con la teja crema a sangre) y en su alternativa descartada "el isotipo sin teja", que deja de valer fuera de la app. **Respeta** el ADR 103 D1 (el SVG es la única fuente) y D2 (dentro de la app el isotipo sigue en su teja: barra lateral, Inicio móvil y bienvenida). Ningún archivo de `modules/` ni de estilos cambia.

---

## Contexto

Hoy todos los íconos son el isotipo sobre la teja crema `#fbf6ec`, también donde nada obliga a tener fondo. Lo que permite cada lugar, comprobado con el isotipo real:

| Lugar | Qué hace con un PNG transparente |
|---|---|
| Pantalla de inicio en iPhone (`apple-touch-icon`) | lo pinta sobre negro: no existe el ícono transparente |
| Pantalla de inicio en Android (ícono `maskable`) | si no hay `maskable`, el lanzador encoge el ícono sobre un plato blanco |
| Diálogo de instalar, computador, arranque de Android (ícono `any`) | lo muestra tal cual: el isotipo flota |
| Pestaña del navegador (favicon) | lo muestra tal cual |
| Arranque en iPhone (`apple-touch-startup-image`) | es una imagen entera: el fondo lo pone Finko |

Los íconos de Nike o Apple en un teléfono son el logo sobre un fondo sólido a sangre; flotan en su web, no en la pantalla de inicio.

## Decisión

### D1. Donde se puede, el isotipo flota

Los íconos `any` (192 y 512), el favicon y las pantallas de arranque de iOS llevan el isotipo sin teja ni fondo. En el arranque va sobre el fondo oscuro de la app, con el nombre y el lema.

### D2. En la pantalla de inicio, sobre blanco a sangre

`apple-touch-icon.png` y los íconos `maskable` nuevos (192 y 512) llevan el isotipo sobre blanco `#ffffff` hasta el borde, sin teja ni filete, al 62 % del alto: dentro de la zona segura que recorta cada sistema.

### D3. Dentro de la app no cambia nada

La teja del ADR 103 D2 sigue en la barra lateral, en Inicio móvil y en la bienvenida.

## Alternativas descartadas

- **Transparente también en la pantalla de inicio.** iOS lo pinta sobre negro y Android lo encoge en un plato blanco: el resultado es el opuesto al pedido.
- **El oscuro de Finko en la pantalla de inicio.** Combina con la app, pero la pieza verde se pierde (1,98:1 contra `#101218`).
- **Dejar la crema.** Era lo que se veía como "logo con fondo".

## Consecuencias

### Positivas

- Al instalar y en el computador, Finko se ve como su logo, no como una teja.
- El blanco es el fondo donde las tres piezas se leen mejor.

### Negativas / Restricciones

- En el arranque y en las pestañas oscuras la pieza verde se ve menos que sobre la teja. Es lo que cuesta que flote.
- Quien ya instaló Finko ve el ícono nuevo cuando el sistema lo actualiza; en iPhone, solo al volver a agregarla a la pantalla de inicio (ADR 103).
- `gen-icons.py` produce cinco PNG y no tres: los `maskable` quedan aparte de los `any`.
