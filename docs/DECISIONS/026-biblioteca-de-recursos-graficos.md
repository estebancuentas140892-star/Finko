# ADR 026 - Biblioteca oficial de recursos gráficos (assets/svg/ como fuente de verdad)

**Estado:** Aceptada. BR.1 (estructura + estándar + extracción) implementada el 2026-07-05; BR.2 (script de sincronización) y BR.3 (primer lote de glifos propios) pendientes en [BOARD.md](../BOARD.md).
**Fecha:** 2026-07-05
**Autores:** Esteban (visión de producto y diseño), Claude Fable 5 (análisis y arquitectura)
**Relación:** continúa los [ADR 023](023-lenguaje-de-iconografia-propio.md) (lenguaje Finko Icons v2) y [ADR 025](025-logotipos-de-marca-y-tejas.md) (tejas y logotipos): no cambia ni el lenguaje ni el mecanismo de entrega, cambia **dónde vive la fuente de diseño y cómo se mantiene**. Compatible con ADN 1 (sin build step, ver Consecuencias).

---

## Contexto

Con la iniciativa de identidad visual 2026-07 completa, Esteban decidió dar el paso
siguiente: diseñar personalmente en Adobe Illustrator los iconos propios de Finko y
los glifos de marca que ninguna fuente cubre (la banca colombiana entera, ChatGPT,
Disney+, Claro, Tigo, Rappi, Xbox... hoy con iniciales). Para eso pidió una
**biblioteca oficial de recursos gráficos**: archivos SVG individuales organizados
por carpetas, con un estándar de exportación definido, donde mantener el sistema
consista en **sobrescribir o agregar archivos**, sin tocar código ni rutas.

El mecanismo de entrega actual (sprite inline en `index.html`) es óptimo para la
app: cero peticiones, offline atómico con el SW, y `currentColor` + variables CSS
atraviesan `<use>` (imprescindible para el duotono y la chispa del lenguaje v2).
Pero como **entorno de diseño** es hostil: los dibujos viven incrustados en un HTML
de 30k tokens, no se pueden abrir en Illustrator, y "reemplazar un icono" exige
editar HTML a mano.

## Decisión

**`assets/svg/` es la fuente de verdad de diseño; el sprite de `index.html` pasa a
ser un artefacto generado desde ella.**

1. **Un archivo = un recurso = un id estable.** El nombre de archivo (kebab-case,
   ASCII) es el id; el nombre visible vive en los catálogos. La carpeta determina
   el prefijo del symbol: `iconos/*` → `i-`/`c-`, `logos/**` → `b-`. Las
   subcarpetas de `logos/` son organización humana y no afectan el id.
2. **La biblioteca nace poblada, no vacía.** Los 100 símbolos del sprite se
   extrajeron byte a byte a archivos individuales: Esteban rediseña sobre los
   dibujos v2 reales, y la regeneración del sprite es verificable por igualdad.
3. **Sincronización por script de desarrollo (BR.2):** `scripts/sync-sprite.py`
   regenera el bloque del sprite desde la biblioteca, valida el estándar
   (viewBox, primitivas, decimales, complejidad), convierte los colores centinela
   de Illustrator a los roles finales, excluye plantillas y detecta colisiones.
   Un test guardarraíl vigila biblioteca ↔ sprite ↔ catálogos (extensión de TX.4).
4. **Plantillas con `data-placeholder="true"`:** todo recurso conocido por los
   catálogos pero aún sin diseño existe como plantilla; el sync las excluye y el
   fallback de iniciales (ADR 025 D2) absorbe. Sobrescribir la plantilla publica
   el recurso.
5. **Sin `catalog.json`:** los metadatos ya viven en `constants.js` (`MARCAS`,
   `BANCOS_CO`, `CATEGORIA_*_ICONO`); la ruta se deriva por convención. Un
   catálogo paralelo sería doble verdad.
6. **El estándar de diseño y exportación** (retícula 24, área viva, roles de
   color, checklist de Illustrator, flujo de revisión en pareja) vive en
   [`assets/svg/README.md`](../../assets/svg/README.md), junto a los archivos que
   norma.

## Alternativas consideradas

- **Cargar los .svg individuales en runtime (fetch + inyección o `<img>`).**
  Descartada: ~120 peticiones que hoy son cero, lista de precache del SW gigante,
  hidratación asíncrona en un pipeline de render 100 % síncrono, y `<img>` ni
  siquiera hereda `currentColor` (mataría duotono y chispa). El sprite inline ya
  resuelve todo eso; el problema era solo la fuente de diseño.
- **CSS `mask-image` por archivo.** Descartada: colapsa el icono a un solo color;
  el lenguaje v2 es esencialmente bicolor (trazo + chispa encendida).
- **Bundler/plugin que ensamble el sprite en build.** Descartada de plano: viola
  ADN 1. El script de BR.2 es otra especie: herramienta de desarrollo opcional,
  como `scripts/gen-icons.py`.
- **Seguir editando el sprite a mano.** Statu quo. Funcionó para 100 símbolos
  hechos por Claude, pero es incompatible con el flujo Illustrator de Esteban y
  con el objetivo de mantener el sistema "reemplazando archivos".

## Consecuencias

### Positivas

- Flujo de diseño real: Illustrator → exportar → sobrescribir archivo → sync.
  Agregar una marca nueva sigue costando 1 archivo + 1 fila de catálogo.
- La validación del estándar se vuelve automática (script + guardarraíl), en vez
  de depender de revisión manual del HTML.
- Cero cambio en runtime: la app, el SW, los helpers (`icon()`, `tejaMarca()`,
  `tejaCategoria()`) y los tests existentes no se enteran.
- ADN 1 intacto: la app corre igual sin ejecutar ningún script; el sync es una
  herramienta de mantenimiento, no un paso de build de runtime.

### Negativas / Restricciones

- El mismo dibujo existe dos veces en el repo (fuente en `assets/svg/`, artefacto
  en `index.html`). Mitigación: el sync es determinista y el guardarraíl de BR.2
  falla si divergen. Hasta que BR.2 exista, **el sprite manda** y la biblioteca
  es espejo: si un símbolo cambiara a mano en el sprite, hay que replicarlo aquí.
- Reemplazar un archivo no se refleja en la app hasta correr el sync (un comando)
  y, en producción, hasta el bump de `CACHE_NAME` del release (rutina existente).
- Los ~117 SVG nuevos pesan poco (~80 KB fuente) y **no** entran al precache del
  SW: no son assets de runtime.
- Pendiente de BR.2: normalizar `b-googlegemini` → `b-gemini` (1 línea en
  `MARCAS`) para cumplir la regla "archivo = id de catálogo".
