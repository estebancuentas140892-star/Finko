# ADR 136 - Ajustes del adulto en el teléfono

**Estado:** Aceptada (2026-11-13). Aplicada completa en una sola tanda (SW v693): el índice (D1), las filas abiertas (D2) y la hoja de borrar (D3) viven en `config/view.js` y se probaron juntos. El tablero se borró de `Diseño Finko/` al cerrarla: desde ahí la fuente es este ADR, y MV2.30 queda completa.
**Fecha:** 2026-11-13
**Autores:** Esteban (diseño y decisión: "vamos a seguir aplicando los cambios de diseño propuestos en esta carpeta"), Claude Opus 5.5 (auditoría, implementación y redacción)
**Relación:** **Aplica** el tablero "Finko móvil · rediseño5" (Claude Design, `Diseño Finko/`), la sexta y última pieza de MV2.30, sobre la identidad del [ADR 127](127-identidad-bosque-y-sol.md). **Cambia**, solo en el teléfono, los seis grupos del [ADR 112](112-ajustes-como-indice-en-el-telefono.md) D3 (pasan a cuatro: Familia entra a "Tú y tu familia" e Impuestos a "Tus datos") y la fila del tema (de abrir un bloque a un interruptor en la fila); en los dos anchos, la situación laboral en lista desplegable (CFG.1) pasa a botones y "Guardar en la nube" a "Copia en la nube". **Conserva** Ajustes como índice de filas que se abren en su sitio ([ADR 112](112-ajustes-como-indice-en-el-telefono.md)) y lo abierto que sobrevive al repintado.

---

## Contexto

El tablero compara Ajustes de hoy (capturas del 2026-11-04) con una propuesta: el índice con poco configurado y a 360 px con todo configurado; las filas de Respaldo y exportación, Tu perfil, Copia en la nube y Recordatorios abiertas, y la hoja de "Borrar todos tus datos". Se auditó cada propuesta contra la app de hoy fotografiada con datos parecidos.

## Decisión

### D1. El índice (tanda 1)

Bajo el título, "Tu perfil, tus datos y cómo funciona Finko". Cuatro grupos en frase: "Tú y tu familia" (Tu perfil, Candado de acceso, Familia), "Tus datos" (Copia en la nube, Respaldo y exportación, Impuestos), "La app en este teléfono" (Tema oscuro, Recordatorios, Instalar app, Actualizar app) e "Información" (Centro Legal, Acerca de Finko). Cada fila con su teja, su nombre y su estado; lo que pide atención ("Nunca has guardado un respaldo", "Bloqueados en este dispositivo") con un ícono de aviso. El tema oscuro es un interruptor en la fila misma. Las tejas usan los íconos del tablero: familia, nube, archivo, campana, descargar, actualizar y documento entran a la biblioteca (`assets/svg/iconos/simbolos/`) y al sprite, con el trazo de la identidad del ADR 127.

### D2. Tu perfil, Copia en la nube y Recordatorios (tanda 2)

Tu perfil: el nombre y "¿Cómo recibes tus ingresos? (opcional)" en botones, con para qué sirve. Copia en la nube: para qué sirve una cuenta, el correo, la autorización y "Enviarme el acceso". Recordatorios bloqueados: qué pasó, cómo activarlos desde el teléfono y dónde sigue lo que vence.

### D3. Respaldo y exportación y "Borrar todos tus datos" (tanda 3)

Qué pasa sin la nube, cuándo fue el último respaldo, "Guardar respaldo ahora" y "Protegerlo con contraseña"; "Más opciones" con restaurar, exportar e importar en filas; "Borrar todos mis datos" aparte, con lo que borra. La hoja de borrar recuerda si no hay respaldo y ofrece "Guardar respaldo primero" antes de "Sí, borrar todo": `confirmar()` gana un `aviso` con su salida, que cierra la hoja y guarda el respaldo.

## Lo que se ajusta al pasar del tablero a la app

| El tablero dice | La app dice | Por qué |
|---|---|---|
| "Tienes la última versión" en Actualizar app | "Busca si hay una versión nueva" | la app no sabe si hay una versión nueva hasta buscarla (UPD.3); decirlo sin buscar podría ser falso |
| "Perfil fiscal completo" en Impuestos | "Opcional" | el perfil fiscal son tres respuestas de sí o no, sin un estado de completo |
| Sin "Atajos de teclado" | la fila sigue, solo con mouse o trackpad | ADR 112 D4: en un teléfono sin puntero fino no se ve |
| La situación laboral en botones sueltos | los mismos botones en el segmento de opciones de Familia | es el control de opciones a la vista que ya existe |
| "Más opciones" con cuatro filas, cada una con su ícono | las filas sin ícono, con su flecha; "Pedir que no se borren" es el bloque "Borrado automático del navegador", que solo se ve si el navegador lo permite | CFG.4a: sin esa función del navegador la fila prometería algo que no se puede hacer |
| "Protegerlo con contraseña" dentro de la tarjeta del aviso | el interruptor debajo del botón, con su frase | es el interruptor de siempre (TX.11), como los demás de Ajustes |
| "Enviarme el acceso" apagado hasta marcar la autorización ("Se activa cuando marques la autorización") | el botón siempre encendido; sin la marca, el envío lo dice | NUBE.1: el aviso al enviar ya explica qué falta, y un botón apagado no dice por qué |
| "Ajustes · Respaldo y exportación" bajo el título de la hoja de borrar, y "No se puede deshacer." en negrita | el título solo y la frase sin negrita | la cabeza de los modales tiene un solo renglón; el mensaje de confirmar es texto plano |
| "teléfono" en los textos de Respaldo, Copia en la nube, Recordatorios y la hoja de borrar | "teléfono" bajo 1024 px y "dispositivo" en escritorio | el tablero mira el teléfono; en el computador "teléfono" sería falso |

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Aplicarlo en tres tandas, una por decisión | las tres tocan `config/view.js` a la vez (el índice arma las filas que D2 y D3 abren) y se escribieron juntas; partirlas habría dejado commits intermedios con filas a medio cambiar |
| Sustituir los íconos que faltan por los del sprite (`recurring`, `apartados`, `clock`...) | decían otra cosa (una flecha circular por la nube, un cofre de reservas por el respaldo); el tablero trae los dibujos con el mismo trazo |

## Consecuencias

- Lo que es contenido (nombres de filas y grupos, frases) cambia en los dos anchos; la composición en filas sigue siendo solo bajo 1024 px (ADR 112).
- Se publica en una sola tanda, con su prueba y su versión del Service Worker (v693).
