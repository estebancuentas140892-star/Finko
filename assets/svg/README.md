# Biblioteca oficial de recursos gráficos de Finko

> **Fuente única de verdad del sistema visual.** Todo icono, logotipo o ilustración
> de la app nace aquí como un archivo SVG individual, diseñado en Illustrator y
> exportado bajo este estándar. Definida en el [ADR 026](../../docs/DECISIONS/026-biblioteca-de-recursos-graficos.md).
> Última revisión: 2026-07-05 (BR.1).

---

## 1. Cómo se conecta con la app (leer primero)

La app **no** carga estos archivos en tiempo de ejecución. El mecanismo de entrega
sigue siendo el sprite inline de `index.html` (`<symbol id="...">`): cero peticiones
de red, offline garantizado y theming vía `currentColor` que atraviesa `<use>`.

- **Hoy (BR.1):** la biblioteca es un espejo fiel del sprite. Los 100 símbolos
  fueron extraídos byte a byte; regenerar el sprite desde estos archivos produce
  el mismo resultado.
- **Con BR.2 (siguiente tarea):** la relación se invierte. `python scripts/sync-sprite.py`
  leerá esta biblioteca, validará el estándar y regenerará el bloque del sprite.
  A partir de ahí, **reemplazar un archivo aquí + correr el script = la app usa
  el nuevo dibujo en todas partes**, sin tocar código ni rutas.

> ⚠️ Mientras BR.2 no exista, sobrescribir un SVG de esta carpeta **no cambia la
> app todavía**. Puedes ir diseñando y reemplazando archivos con confianza: nada
> se rompe, y todo se integrará al correr el sync.

En producción aplica la rutina de siempre: el service worker es cache-first, así
que cada release que cambie recursos bumpea `CACHE_NAME` (`service-worker.js`).

## 2. Estructura de carpetas

```
assets/svg/
├── README.md              → este estándar
├── iconos/                → identidad Finko: monocromos, theming por CSS
│   ├── secciones/         → 14 símbolos de navegación (home, gastos, metas...)
│   ├── simbolos/          → 13 símbolos semánticos (alert, info, trophy, saldo...)
│   ├── utilitarios/       → 11 glifos monolínea (x, edit, trash, search, eye...)
│   └── categorias/        → 43 glifos de categorías (mercado, bus, salud...)
├── logos/                 → marcas de terceros: silueta monocroma, color en catálogo
│   ├── bancos/            → bancos y billeteras CO (nequi, nubank + 10 plantillas)
│   ├── streaming/         → netflix, spotify, youtube, hbomax, crunchyroll...
│   ├── ia/                → claude, gemini, chatgpt
│   ├── tecnologia/        → apple, icloud, google, playstation, xbox
│   ├── pagos/             → paypal, mercadopago
│   ├── telecom/           → movistar, claro, tigo
│   ├── movilidad/         → uber, rappi
│   └── educacion/         → duolingo, platzi
├── ilustraciones/         → ilustraciones spot y pictogramas (futuro)
└── identidad/             → marca propia de Finko: logo, wordmark (futuro)
```

**La carpeta define el prefijo del `<symbol>`** que genera el sync:

| Carpeta | Prefijo | Ejemplo | El color lo pone |
|---|---|---|---|
| `iconos/secciones`, `iconos/simbolos`, `iconos/utilitarios` | `i-` | `home.svg` → `i-home` | CSS (`.icon`: trazo `currentColor`, grosor 2.35) |
| `iconos/categorias` | `c-` | `mercado.svg` → `c-mercado` | CSS (teja de dominio, `tejaCategoria`) |
| `logos/**` (cualquier subcarpeta) | `b-` | `bancos/nequi.svg` → `b-nequi` | Catálogo (`color` + `texto` de `MARCAS` / `BANCOS_CO`) |

Las subcarpetas de `logos/` son solo organización humana: mover un logo de
`streaming/` a `tecnologia/` **no cambia su id**. En cambio, mover un archivo entre
`iconos/categorias` y las demás carpetas de iconos SÍ cambia el prefijo (c- ↔ i-),
así que eso nunca se hace sin actualizar los consumidores.

## 3. Nomenclatura (los nombres son API)

- **kebab-case, solo ASCII:** minúsculas, dígitos y guion simple. Sin espacios,
  sin tildes, sin ñ: `educacion.svg`, nunca `educación.svg`.
- **El nombre de archivo es el id estable del recurso.** Nunca el nombre visible:
  el archivo es `banco-bogota.svg` aunque en pantalla diga "Banco de Bogotá S.A.".
  Si el nombre comercial cambia, se edita el catálogo; el archivo no se renombra.
- **Para marcas, el archivo se llama exactamente como `MARCAS.id`:** `chatgpt.svg`,
  `disneyplus.svg`, `primevideo.svg` (sin guiones, porque así son esos ids).
- **Renombrar un archivo publicado = breaking change:** rompe el `simbolo` del
  catálogo. Si de verdad hace falta, se hace junto con la línea del catálogo y
  el sync en el mismo commit.

Caso conocido: `logos/ia/gemini.svg` hoy corresponde al symbol `b-googlegemini`
(herencia de Simple Icons). BR.2 lo normaliza a `b-gemini` actualizando la línea
de `MARCAS`.

## 4. Estándar técnico común (todo archivo de `iconos/` y `logos/`)

| Aspecto | Regla |
|---|---|
| Documento | `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">`, **sin** `width`/`height` (responsive: el tamaño lo da el contexto) |
| Retícula | 24×24. Dibujar alineado a la retícula de píxel; decimales con máximo 2 cifras |
| Área viva | ~21×21 (margen óptico ~1.5px por lado). Compensación óptica: círculos y diagonales pueden tocar el área completa, cuadrados quedan algo más chicos |
| Primitivas permitidas | `path`, `circle`, `rect`, `line` (atraviesan `<use>` sin sorpresas) |
| Prohibido | `text`, `image`, `mask`, `clipPath`, `filter`, gradientes, `style`/clases CSS, `defs`, `transform` (coordenadas ya "horneadas") |
| Complejidad máxima | ~6 elementos por archivo y ~1 KB minificado. Si necesita más, la metáfora es demasiado compleja para 24px |
| Legibilidad | Reconocible a 16px. Separación mínima entre trazos: ~1.5px en la retícula de 24 |
| Retina / densidades | Garantizado por ser vectorial; la nitidez real sale de alinear a la retícula y verificar en los tamaños reales de uso |
| Modo claro/oscuro | Garantizado por diseño: los iconos son monocromos (`currentColor`) y los logos van sobre teja de color corporativo fijo, que funciona igual en ambos temas. **Nunca** colores absolutos en el archivo |

Tamaños reales de verificación antes de aprobar cualquier recurso: **16px**
(inline con texto), **20-22px** (botones y navegación), **32px** (teja densa),
**40px** (teja de lista) y **48px** (empty states), en tema oscuro Y claro.

## 5. Iconos Finko (lenguaje v2 "trazo cálido con chispa", ADR 023)

Resumen operativo; la teoría completa está en el [ADR 023](../../docs/DECISIONS/023-lenguaje-de-iconografia-propio.md).

1. **Trazo:** diseñar con grosor **2.35** para previsualizar, pero el archivo **no
   lleva `stroke-width` ni `stroke`**: el grosor y el color los pone la clase CSS
   `.icon` (2.35 base, 2.5 en `--sm`, 1.8 en `--lg`). Por eso **jamás se expanden
   los trazos** (nada de Objeto > Expandir): un trazo expandido queda congelado
   en un grosor y rompe las escalas.
2. **Redondez sistemática:** terminaciones y uniones redondeadas (las pone el CSS),
   radios ≥ 2.9 en contenedores, ápices con arco, curvas antes que diagonales
   rectas. Excepción "metáfora primero": vértices agudos solo donde la metáfora
   los exige (punta del avión, play de streaming, picos de montaña).
3. **Duotono al 22 %:** cuando la metáfora tiene "cuerpo" (casa, tarjeta, frasco),
   esa región lleva `fill="currentColor" fill-opacity=".22"` (y `stroke="none"` si
   es una región sin contorno propio).
4. **La chispa (firma de la familia):** exactamente **un** elemento sólido pequeño
   (`circle` r 1.2 a 1.65) integrado a la metáfora, con
   `fill="var(--fk-icon-dot, currentColor)" stroke="none"`. El contexto la enciende
   (nav → acento, tejas → color del dominio). Si la chispa compite con el
   reconocimiento del dibujo, se sacrifica la chispa, nunca la claridad.
5. **Utilitarios exentos:** los glifos de `iconos/utilitarios/` (x, chevron, check,
   edit, trash, search, eye...) son monolínea sin duotono ni chispa, **por diseño
   permanente**: son verbos, no identidad.

Roles de color dentro del archivo (los únicos tres permitidos):

| Rol | Cómo va en el SVG final |
|---|---|
| Trazo | Elemento "desnudo", sin atributos de color (los hereda de CSS) |
| Cuerpo duotono | `fill="currentColor" fill-opacity=".22"` |
| Chispa | `fill="var(--fk-icon-dot, currentColor)" stroke="none"` |

Referencia real (`iconos/secciones/home.svg`): cuerpo de la casa con duotono,
puerta como trazo desnudo, ventana como chispa.

## 6. Logos de terceros

- **Silueta monocroma del isotipo oficial**, idealmente **un solo path**
  (Buscatrazos > Unir en Illustrator). Aquí sí va todo como relleno:
  `fill="currentColor" stroke="none"`.
- **Cero color en el archivo.** El color corporativo (`color` de la teja) y el
  color del glifo encima (`texto`) viven en `MARCAS` / `BANCOS_CO`
  (`modules/core/constants.js`). Así el mismo archivo sirve en ambos temas.
- Área viva ~18×18 a 20×20 según densidad óptica, silueta centrada.
- **Fidelidad (ADR 025 D5):** el trazado se hace sobre el isotipo oficial vigente,
  sin distorsión ni reinterpretación. Uso nominativo: identificar los servicios
  del propio usuario; si un titular objeta, se retira el archivo y su fila del
  catálogo y el fallback de iniciales absorbe.

### 6b. Logos a color (`data-fullcolor="true"`, excepción al monocromo)

Para marcas cuya identidad ES el color (Bancolombia, Banco de Bogotá, Nequi) el
archivo es **autónomo**: trae su fondo, sus `fill` propios y sus `<defs>` con
degradados. El sync lo conserva byte a byte (no convierte colores) y su teja de
catálogo se pinta del color del propio fondo del logo. Reglas duras:

- **Fidelidad absoluta al original:** cero contornos, bordes, sombras, brillos,
  efectos o reinterpretaciones que no estén en el diseño oficial. Si el logo
  necesita contraste con el fondo de la app, se ajusta el **contenedor** (color
  de teja, espacio alrededor), nunca el logo.
- **Todo elemento pintable declara `fill` Y `stroke` explícitos** (aunque sea
  `stroke="none"`). Motivo: la clase CSS `.icon` pone `fill:none` y
  `stroke:currentColor` en el `<svg>` anfitrión y esas propiedades se heredan
  hacia adentro del `<use>`; un elemento sin `stroke` propio recibe un contorno
  fantasma del color `texto` de la teja (así apareció el contorno blanco en
  Banco de Bogotá y el morado que se comía el acento rosa de Nequi, 2026-07-05),
  y uno sin `fill` propio desaparece. El atributo de presentación en el elemento
  gana a la herencia. `sync-sprite.py` y `sprite-sync.test.js` lo verifican.
- **IDs internos con prefijo del slug** (`bbog-g0`...): el sprite es un solo
  documento y dos logos con el mismo id de gradiente se pisarían.

## 7. Exportar desde Adobe Illustrator

**Configuración del documento:** mesa de trabajo de 24×24 px, unidades en px,
"Alinear a retícula de píxel" activo.

**Colores centinela mientras diseñas** (para que el rol de cada elemento sea
inequívoco; BR.2 los convertirá automáticamente, y mientras tanto se ajustan a
mano con la tabla de la sección 5):

| Centinela en Illustrator | Rol | Se convierte en |
|---|---|---|
| Trazo negro `#000000` | Trazo | Elemento sin atributos de color |
| Relleno cian `#00FFFF` | Cuerpo duotono | `fill="currentColor" fill-opacity=".22"` |
| Relleno magenta `#FF00FF` | Chispa | `fill="var(--fk-icon-dot, currentColor)"` |
| Cualquier relleno (solo `logos/`) | Silueta de logo | `fill="currentColor" stroke="none"` |

**Exportación:** Archivo > Exportar > Exportar como... > SVG con:

- Estilo: **Atributos de presentación** (nunca CSS interno ni `<style>`).
- Fuente: convertir a contornos (aunque la regla es no usar texto).
- IDs de objeto: **Mínimo**.
- Decimales: **2**.
- Reducido (minify): ✓. Adaptable (responsive): ✓ (elimina `width`/`height`).

**Entrega el export tal cual sale de Illustrator, sin limpiarlo a mano** (BR.5):
`scripts/sync-sprite.py` normaliza automáticamente antes de validar, y reescribe
el archivo limpio de vuelta en `assets/svg/`:

- Declaración XML, `id="Capa_1"`, `version`, comentario del generador: se quitan.
- `xlink:href` → `href` (namespace `xlink` innecesario).
- `<g>` bare envolviendo los paths (sin `transform`/`class`/`style`): se desenvuelve.
- IDs de degradado por defecto (`linear-gradient`, `linear-gradient1`...): se
  renombran con el nombre del propio archivo como prefijo (`banco-bogota-g0`...).
  Un id ya prefijado a mano queda intacto (idempotente).

Lo que el sync **no** hace por ti, porque es una decisión de diseño:

- **`fill`/`stroke` explícitos en cada elemento pintable** de un logo a color
  (sección 6b): si falta, el sync excluye el recurso con el error puntual, no
  lo adivina.
- **`data-fullcolor="true"`**: marcarlo es tuyo (ver sección 6b vs. silueta
  monocroma de la sección 6).
- **Una `<image>` incrustada** (capa de calco/referencia olvidada): se rechaza
  con un error explicando la causa probable; nunca se borra en silencio.

**Checklist después de exportar** (lo de arriba ya lo resuelve el sync; solo
revisa a mano lo que sigue siendo decisión de diseño):

- [ ] Iconos: trazos desnudos (sin `stroke`, `stroke-width`, `fill="none"`);
      duotono y chispa con sus atributos exactos (sección 5).
- [ ] Logos monocromos: todo `fill="currentColor" stroke="none"`.
- [ ] Logos a color: `data-fullcolor="true"` + `fill`/`stroke` explícitos en
      cada elemento pintable (sección 6b).
- [ ] Sin texto, sin imágenes incrustadas (capas de calco olvidadas).
- [ ] Peso ≤ ~1 KB (los logos de Simple Icons pueden superarlo levemente).

## 8. Plantillas pendientes (`data-placeholder`)

Los archivos con `data-placeholder="true"` en la raíz son **plantillas**: marcan
el recurso que falta diseñar (hoy: 10 bancos CO, disneyplus, primevideo, chatgpt,
xbox, claro, tigo, rappi). El sync de BR.2 los **excluye** del sprite, así que la
app sigue mostrando el fallback de iniciales sin estados rotos. Para publicar el
recurso real basta sobrescribir el archivo (el atributo desaparece con él).

## 9. Flujo de trabajo del equipo de diseño

1. **Esteban diseña** el recurso en Illustrator sobre este estándar.
2. **Exporta** con la configuración de la sección 7 y **sobrescribe** el archivo
   en su carpeta (o crea uno nuevo si es un recurso nuevo). El SVG es siempre el
   formato de entrega: es la fuente de verdad y va tal cual a la app.
   *Opcional pero recomendado para logos a color o diseños con matices:* adjuntar
   también un **PNG de referencia** (512×512, exportado desde Illustrator) que
   muestre cómo debe verse el recurso. Ese PNG es la vara contra la que se
   compara el render real de la app en la revisión; habría atrapado de inmediato
   el contorno fantasma de 2026-07-05.
3. **Revisión en pareja (Claude):** cada entrega se audita contra criterios
   fijos antes de entrar a la biblioteca:
   - Legibilidad: ¿se reconoce a 16px sin leer texto? ¿silueta única en la familia?
   - Consistencia: ¿cumple trazo/redondez/duotono/chispa (iconos) o
     silueta fiel monocroma (logos)? ¿peso visual parejo con sus hermanos?
   - Técnica: checklist de la sección 7, complejidad, retícula.
   - Ambos temas: render a los 5 tamaños de verificación en oscuro y claro.
   El resultado es "aprobado" u "observaciones" con propuesta concreta de ajuste.
4. **Integración:** correr el sync (BR.2); si el recurso es nuevo, agregar su
   fila de catálogo (sección 10). Tests verdes, commit, push.
5. **Producción:** bump de `CACHE_NAME` en el release (rutina existente) y
   validación en el celular.

## 10. Agregar un recurso nuevo (recetas)

- **Marca global nueva** (ej. Perplexity): crear `logos/ia/perplexity.svg` +
  1 fila en `MARCAS` (`constants.js`) con `id: 'perplexity'`, aliases, `color`,
  `texto`, `iniciales` y `simbolo: 'b-perplexity'`. Nada más: `resolverMarca()`
  y todas las tejas la reciben solas.
- **Banco/billetera:** crear `logos/bancos/<slug>.svg` + agregar
  `simbolo: 'b-<slug>'` a su fila existente de `BANCOS_CO`. (Ojo: los `id` de
  `BANCOS_CO` son nombres visibles por herencia y viven en datos del usuario;
  el slug del archivo es el id estable nuevo, el campo `simbolo` es el puente.)
- **Categoría nueva:** crear `iconos/categorias/<slug>.svg` + entrada en el
  `CATEGORIA_*_ICONO` correspondiente con `'c-<slug>'`. El guardarraíl TX.4
  avisa si el id no existe en el sprite.
- **Solo se crean archivos para entidades que la app conoce** (catálogos de
  `constants.js`). Un SVG sin fila de catálogo no se usa nunca; primero la fila,
  después (o junto con) el archivo.

## 11. Por qué no hay un `catalog.json`

Los metadatos (nombre visible, aliases, colores, a qué categoría pertenece cada
cosa) **ya viven en `modules/core/constants.js`** (`MARCAS`, `BANCOS_CO`,
`CATEGORIA_*_ICONO`): crear un JSON paralelo sería duplicar la verdad y
desincronizarla. La ruta física se deriva por convención (carpeta + nombre =
prefijo + id), así que no hace falta registrarla en ningún lado. La coherencia
biblioteca ↔ sprite ↔ catálogos la vigilará un test guardarraíl (BR.2), igual
que hoy TX.4 vigila sprite ↔ catálogos.
