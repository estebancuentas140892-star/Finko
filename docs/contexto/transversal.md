# Ficha de contexto: Transversal

> Funcionalidades que atraviesan varias secciones de la app (identidad visual, navegación, biblioteca gráfica). Reglas de uso y plantilla en [`README.md`](README.md).

---

## Tejas de marca y biblioteca gráfica (logos de bancos y marcas)

- **Objetivo**          : mostrar el logotipo oficial de cada banco/billetera/marca en una teja de color, con fallback de iniciales, en Mis cuentas, Gastos, Deudas, fijos y suscripciones. `assets/svg/` es la fuente de verdad de diseño (ADR 026); el sprite de `index.html` es artefacto generado.
- **Estado actual**     : BR.3 completa (2026-07-05): los 11 bancos/billeteras reales de `BANCOS_CO` tienen glifo a color; solo "Otro" (no es una entidad real) sigue con iniciales. BR.5 (normalización automática de exports crudos) y BR.4 (ADR 027, excepción de logo a color) cerradas. Iniciativa Biblioteca de recursos gráficos completa.
- **Verificado contra** : `92934a0` (BR.3) más el ADR 027 de este cierre (BR.4), 2026-07-05.

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Catálogo de bancos CO (id, color, texto, simbolo, aliases) | `modules/core/constants.js` | `BANCOS_CO` | ~283 |
| Catálogo de marcas globales | `modules/core/constants.js` | `MARCAS` | antes de BANCOS_CO |
| Render de la teja (glifo o iniciales sobre color) | `modules/infra/marcas.js` | `tejaMarca()` | ~90 |
| Detección de marca en texto libre | `modules/infra/marcas.js` | `resolverMarca()`, `normalizarAlias()` | ~35 |
| Avatar de banco (delega en tejaMarca) | `modules/infra/bancos.js` | `bancoAvatar()` | |
| Sprite generado (símbolos `b-*`) | `index.html` | marcadores `INICIO/FIN bloque generado por scripts/sync-sprite.py` | |
| Pipeline biblioteca → sprite | `scripts/sync-sprite.py` | `normalizar_export_illustrator()` (paso 0, BR.5), `validar_y_convertir()`, `_validar_fullcolor()`, `orden_final()` | |
| Archivos de diseño | `assets/svg/logos/**` | 1 archivo = 1 símbolo (`<slug>.svg` → `b-<slug>`) | |
| Estándar técnico y flujo de trabajo | `assets/svg/README.md` | secciones 6, 6b (logos a color), 7 (export), 9 (flujo en pareja) | |
| CSS de la teja | `styles/components/nudges.css` | `.bank-avatar`, `.bank-avatar__glifo` | ~275 |
| CSS base de iconos (fuente de la herencia de stroke) | `styles/components/forms.css` | `.icon` | ~15 |

**Recursos**: símbolos `b-*` del sprite; `i-saldo` (Efectivo usa un icono estructural como glifo); tokens `--fk-teja-*` (tamaños de teja); campos `color`/`texto` del catálogo pintan la teja vía estilo inline.

**Dependencias y relaciones**: `tejaMarca()` es el único render de teja (bancoAvatar delega); consumidores en tesorería (cuentas), gastos, compromisos (deudas/fijos), agenda. `sprite-sync.test.js` vigila biblioteca ↔ sprite ↔ catálogos; `TX.4` vigila categorías. El sync corre manual: tocar un `.svg` sin correr `python scripts/sync-sprite.py` no cambia la app.

**Riesgos**:

- **Herencia CSS a través de `<use>` (la trampa grande):** `.icon` pone `fill:none; stroke:currentColor; stroke-width:2.35` en el `<svg>` anfitrión y eso SE HEREDA hacia adentro del `<use>`. Todo elemento pintable de un logo a color debe declarar `fill` y `stroke` explícitos o recibe un contorno fantasma del color `texto` de la teja (pasó con Banco de Bogotá y Nequi, 2026-07-05; fix en `0f143f9`). Validador y guardarraíl lo exigen desde entonces.
- Logos a color (`data-fullcolor="true"`): el cuerpo se conserva byte a byte; su teja se pinta del color del propio fondo del logo; `texto` no pinta el glifo (solo el fallback de iniciales).
- IDs internos de gradiente deben ser únicos en todo el sprite (prefijo del slug, ej. `bbog-g0`); el sync lo verifica.
- `BANCOS_CO[].id` se guarda en `localStorage` (datos del usuario): **nunca renombrar ids**. Renombrar un archivo `.svg` publicado rompe el campo `simbolo` (breaking change; ver `ID_ANTERIOR` en el sync para preservar posición).
- El sync aborta sin escribir (`ErrorProduccion`) si un símbolo publicado perdería su archivo fuente; un archivo a medio pulir se excluye sin bloquear (`ErrorRecurso`).
- El sync (BR.5) reescribe archivos de `assets/svg/` en el disco cuando normaliza un export crudo (declaración XML, `id="Capa_1"`, comentario, `xlink:href`, `<g>` bare, IDs de degradado genéricos): correrlo puede dejar cambios sin commitear en la biblioteca, revisar `git status` después.
- Una `<image>` incrustada NUNCA se borra en silencio (ni en la normalización ni en la validación): se rechaza con error explicando la causa probable (capa de calco de Illustrator).
- No editar a mano el bloque generado de `index.html`.
- Todo cambio de assets en producción bumpea `CACHE_NAME` en `service-worker.js`.

**Cambios pendientes**: ninguno activo (iniciativa Biblioteca de recursos gráficos completa).

**Cambios realizados**:

- 2026-07-05: BR.4, [ADR 027](../DECISIONS/027-logos-de-marca-a-color-excepcion-monocromo.md) formaliza la excepción de logo a color (`data-fullcolor`): cuándo aplica (D1), archivo autónomo conservado byte a byte (D3), color de teja = color del propio fondo del logo (D4), guardarraíl de `fill`/`stroke` explícitos (D5), IDs de degradado prefijados (D6) y convivencia con la fidelidad de ADR 025 (D7). Amplía [ADR 025](../DECISIONS/025-logotipos-de-marca-y-tejas.md) D2. Solo doc, sin cambio de código ni bump de SW.
- 2026-07-05: BR.3 completa. 9 bancos/billeteras más a color de un tirón (Davivienda, BBVA, Banco Popular, Scotiabank Colpatria, DaviPlata, Lulo Bank, Nubank, Banco de Occidente, AV Villas), todos con la misma imagen de calco incrustada de Illustrator retirada. DaviPlata/Davivienda con degradado en español (`Degradado_sin_nombre_N`, regex de BR.5 ampliado); Banco de Occidente con fondo de mosaico de polígonos (no rect plano). Color de teja para los 3 casos sin fondo plano elegido por coincidencia exacta en al menos 2 esquinas (verificado con muestreo de píxeles en canvas). 3 tests migrados de Davivienda (ya con glifo) a "Otro"/"ChatGPT" como nuevos ejemplos del fallback de iniciales.
- 2026-07-05: BR.5, el sync normaliza exports crudos de Illustrator antes de validar (declaración XML, `id="Capa_1"`, comentario, `xlink:href`, `<g>` bare, IDs de degradado genéricos en inglés y español, `data-name`) y reescribe el archivo limpio en `assets/svg/`.
- 2026-07-05 `0f143f9`: fix del contorno fantasma (stroke explícito + validador + guardarraíl + README 6b).
- 2026-07-05 `2b5ae36`: Nequi a color (monograma) + limpieza de exports crudos.
- 2026-07-05: Bancolombia y Banco de Bogotá a color (`data-fullcolor`), sync extendido a degradados.
- 2026-07-05: BR.2 `sync-sprite.py` + guardarraíl `sprite-sync.test.js`.
- 2026-07-05: BR.1 biblioteca `assets/svg/` (100 símbolos extraídos + plantillas).

**Observaciones**: regla de fidelidad absoluta (2026-07-05, orden directa de Esteban): todo SVG que él entrega es la versión oficial; cero contornos, sombras, efectos o reinterpretaciones agregados; si un logo necesita contraste se ajusta el contenedor, nunca el logo; recrear solo por motivos técnicos y visualmente idéntico. Formato de entrega: SVG siempre (fuente de verdad); PNG 512×512 de referencia opcional para logos a color (vara de comparación en la revisión en pareja). ADRs relacionados: 023 (iconografía), 025 (logos y tejas), 026 (biblioteca).
