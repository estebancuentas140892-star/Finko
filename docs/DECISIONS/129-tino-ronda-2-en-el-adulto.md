# ADR 129 - Tino, las poses de la ronda 2 en la app del adulto

**Estado:** Aceptada (2026-11-05). Esteban entregó en la carpeta "Personaje Tino" las ocho poses que se le pidieron, con el lugar de cada una: "ya agregué los personajes que me dijiste en la carpeta".
**Fecha:** 2026-11-05
**Autores:** Esteban (dibujos y lugares), Claude Opus 5.5 (encaje, implementación y redacción)
**Relación:** **Amplía** el [ADR 127](127-identidad-bosque-y-sol.md) D6 (la tabla de dónde aparece Tino suma cuatro lugares y cambia la pose de seis vacíos) y **cambia** su D9 solo en la pose de "Lograste tu meta". **Respeta** el 127 D6 en lo que no se toca: el dibujo original sin cambiar un trazo, como imagen y sobre su sol, y nunca triste ni enojado. **Adelanta** el [ADR 094](094-tino-el-guatin.md) D3 (ronda 2: sembrar, compartir, reserva, pensando) en el adulto; el niño sigue con su sprite y su ronda 2 (APR.5b, [ADR 095](095-tino-en-el-sprite.md) D4) no entra acá.

---

## Contexto

Con seis poses (ADR 127), Tino explicaba casi todos los vacíos con la misma mano levantada, y había lugares de ayuda que seguían con un ícono: el bombillo de "¿Cómo salir más rápido?", la teja verde de "Nada que atender hoy" y la ilustración genérica de Movimientos. Esteban ofreció dibujar lo que faltara; se le pidió una lista de ocho poses, cada una con su lugar, y las entregó.

## Decisión

### D1. Ocho dibujos originales más

`pensando`, `reserva`, `sembrar`, `compartir`, `con-lupa`, `con-calendario`, `meta-cumplida` y `tranquilo` entran a `assets/tino/` como los seis primeros: sin cambiar un trazo ni un color, solo sin el bloque de metadatos de Illustrator. Cada uno con su lienzo en `TINO_ORIGINAL` (`infra/ilustraciones.js`), que un test compara con su `viewBox`. El Service Worker los precachea.

### D2. Los dibujos a lo ancho caben en el sol

Cuatro poses son más anchas que altas (sembrar, compartir, meta cumplida y tranquilo: de 1,24 a 1,71 veces). De pie, el dibujo va al 86 % del alto apoyado abajo; a lo ancho eso lo sacaría del disco. `encajeTinoSol()` mide la caja para que sus esquinas casi toquen el borde del círculo (un 6 % de más, porque las esquinas de estos dibujos son vacías) y la centra un poco por debajo de la mitad. El sol y el resto no cambian.

### D3. Dónde va cada una

| Lugar | Pose | Antes |
|---|---|---|
| El vacío de Análisis | pensando | explica |
| "¿Cómo salir más rápido?" (entrada del plan y su tarjeta, también en la hoja) | pensando | el bombillo |
| "¿Cómo distribuir $X?" de Mis cuentas | pensando | explica |
| El vacío del Fondo de emergencia | reserva | anima |
| El vacío de Inversión | sembrar | explica |
| El vacío de Me deben | compartir | explica |
| Movimientos vacío y la búsqueda sin resultados | con lupa | la ilustración genérica |
| El vacío de Calendario y el de Por pagar | con calendario | explica |
| El aviso "Lograste tu meta" | meta cumplida | celebra grande |
| "Nada que atender hoy" en Inicio | tranquilo | la teja verde con el visto |

Siguen como estaban: explica en Gastos, Límites y Apartados; anima en Metas; saluda en Mis cuentas y en la guía de Inicio; celebra y celebra grande en los otros siete avisos.

### D4. Las reglas del 127 D6 siguen

Con datos, el banner no se pinta y Tino se va con él. En "Atención hoy", Tino aparece solo cuando no hay nada que atender: con avisos, la lista es lo que importa. Movimientos no tiene banner de propósito: Tino reemplaza la ilustración de su vacío, con el mismo texto.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Recortar los dibujos anchos para que quepan de pie | cambia el dibujo; el ratón de compartir o la planta de sembrar son la pose |
| Un sol ovalado para los dibujos anchos | dos formas de sol para un mismo personaje; el encaje resuelve sin otra forma |
| Tino en cada fila de "Atención hoy" | decora; el 127 D6 lo deja donde ayuda |
| Pasar ya la ronda 2 al sprite del niño | es otra tarea (APR.5b): pide el conversor del 095 D4 y sus pantallas |

## Consecuencias

- Catorce dibujos en `assets/tino/` (unos 550 KB en total, precacheados). Cada pantalla pide solo el suyo.
- Los dibujos de la ronda 2 ya existen: APR.5b deja de esperarlos y le queda correr el conversor para el niño.
- "Nada que atender hoy" pasa de una teja de 36 px a un sol de 56 px: la tarjeta crece de 72 a 87 px de alto.
