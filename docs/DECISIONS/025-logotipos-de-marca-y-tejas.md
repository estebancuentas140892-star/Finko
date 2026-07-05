# ADR 025 - Logotipos oficiales de marca y tejas unificadas

**Estado:** Aceptada e implementada por completo: MK.1 y MK.2 cerradas el 2026-07-04/05, ID.3 (categorías en tejas) cerrada el 2026-07-05 (ver [ADR 023](023-lenguaje-de-iconografia-propio.md), sección ID.3).
**Fecha:** 2026-07-04
**Autores:** Esteban (visión de producto), Claude Fable 5 (análisis y diseño)
**Relación:** revisa el alcance de ID.3 definido en [ADR 023](023-lenguaje-de-iconografia-propio.md); el lenguaje Finko Icons v2 ("trazo cálido con chispa") y su dirección C ("insignia por dominio") siguen vigentes: esta ADR agrega la capa de marcas y define el contenedor común. Generaliza el patrón de identidad bancaria de `BANCOS_CO` (`modules/infra/bancos.js`). No toca los catálogos de categorías de ADR 014/015; el guardarraíl TX.4 se actualiza en ID.3.

---

## Contexto

Pedido del usuario (2026-07-04), al arrancar ID.3: siempre que un servicio, empresa o entidad financiera tenga identidad visual reconocida (Netflix, Spotify, Bancolombia, Nequi, Daviplata, Claude...), Finko debe mostrar su **logotipo oficial** en lugar de un icono genérico; las categorías sin marca (Mercado, Transporte, Salud...) siguen usando iconos; todo debe percibirse como un solo sistema de diseño, escalar agregando entradas a un catálogo, y resolver el fallback automáticamente. Pidió además un análisis fundamentado del paquete de iconos que mejor conviva con logotipos, con libertad de proponer una alternativa mejor.

Hallazgos del análisis:

1. **Finko ya hace identidad de marca a medias, con el patrón correcto.** `BANCOS_CO` guarda color corporativo + color de texto por entidad, y `bancoAvatar()` pinta iniciales sobre ese color. Esta ADR es la evolución natural: de iniciales a glifo oficial, y de solo bancos a toda marca.
2. **Cobertura real de fuentes de logotipos (verificada archivo por archivo, 2026-07-04).** Simple Icons (CC0, el estándar de glifos de marca monocromos, con color oficial por entrada) cubre las marcas globales (Netflix, Spotify, YouTube, HBO Max, Disney+, PayPal, Claude, OpenAI, Gemini, Nubank, Mercado Pago, Movistar...) pero **no cubre la banca colombiana**: Nequi, Daviplata, Bancolombia, Davivienda, Banco de Bogotá y Rappi devuelven 404. Ningún paquete cubre el corazón de Finko; adoptar uno "completo" es imposible.
   **Corrección (2026-07-05, al implementar MK.2):** la verificación anterior pasó por un CDN que servía caché de una versión vieja. Contra la versión vigente real (16.25.0, fijada), OpenAI, Amazon, Prime Video y Xbox ya **no están** en Simple Icons (retirados en versiones posteriores a las que servía la caché; la causa exacta no se verificó) y Disney+ tampoco existe. Criterio aplicado, coherente con D5: si el glifo no está en la versión vigente de la fuente, no se embarca; la marca queda con iniciales (fallback de D2), exactamente lo que hizo MK.2 con ChatGPT, Prime Video, Disney+, Claro, Tigo, Rappi y Xbox.
3. **Los `<option>` de un `<select>` nativo no renderizan SVG.** La identidad visual vive en listas, tarjetas y pickers propios; los selects quedan con texto plano (ya decidido para ID.3 y se mantiene).

## Decisión

**El elemento unificador no es un paquete de iconos: es el contenedor.** Toda identidad visual (marca o categoría) se presenta dentro de una **teja** de geometría idéntica. Dentro de la teja conviven dos especies de glifo.

### D1. La teja

Contenedor redondeado único: 40px en listas y tarjetas, 32px en pickers y contextos densos; radio y márgenes con tokens `--fk-*`; glifo al ~55% del lado. Es el principio de los sistemas que mezclan logos e iconos sin desentonar (iOS Ajustes, fintech de referencia): la unidad la da el marco, no el dibujo.

### D2. Capa de marcas (logotipos oficiales)

- Catálogo `MARCAS` en `constants.js`: `{ id, nombre, aliases, color, texto, symbolId }`. `color` es el color oficial de la marca; `texto` es el color del glifo encima (blanco u oscuro según contraste, patrón ya existente en `BANCOS_CO`).
- Glifos monocromos de un solo path en grid de 24, en el sprite inline de `index.html` con prefijo `b-*` (ej. `b-netflix`), separados de los `i-*` estructurales.
- Fuentes: **Simple Icons (CC0) curado** para marcas globales; **glifos propios dibujados por nosotros** para la banca colombiana y cualquier ausencia, en el mismo estilo. La situación legal es idéntica (uso nominativo; el copyright del trazado propio es nuestro) y el resultado visual indistinguible.
- Presentación: teja con fondo sólido `color` + glifo en `texto`. Los colores de marca son fijos, así que la teja funciona igual en tema claro y oscuro.
- Mientras una marca no tenga glifo dibujado, el avatar de iniciales actual es el fallback natural (misma teja, iniciales en vez de glifo): la migración puede ser gradual sin estados rotos.

### D3. Capa de categorías (sin marca)

Sin cambios respecto del ADR 023 revisado: iconos **Finko Icons v2** sobre teja teñida con `--fk-dom-*` al ~14% y chispa en el color del dominio (dirección C). El emoji personalizado de Metas "Otra" y de Apartados se conserva como dato del usuario, dentro de la misma teja.

### D4. Resolución automática (escalabilidad)

Helper único en infra (`resolverMarca(texto)`):

1. `cuenta.banco` es id del catálogo → marca directa, sin heurística.
2. Nombre libre (gasto fijo, suscripción, deuda, fuente de ingreso) → match por `aliases` normalizados ("Netflix Premium" → Netflix).
3. Sin match → teja de categoría del dominio.

Agregar una marca nueva = 1 `<symbol>` en el sprite + 1 fila en el catálogo; todos los consumidores la reciben sin configuración adicional. Ningún dominio importa a otro: el catálogo vive en core y el helper en infra, como `bancos.js` hoy (regla ADN 10 intacta).

### D5. Marco legal

CC0 libera el copyright, no la marca registrada. El uso es **nominativo**: identificar los servicios y cuentas del propio usuario, práctica estándar del sector (Monzo, Revolut, YNAB muestran logos de comercios y bancos). Reglas: no alterar los glifos más allá de la versión monocroma estándar, no sugerir patrocinio ni afiliación, y retirar un logo si su titular lo objeta (basta borrar la fila del catálogo: el fallback de iniciales o categoría absorbe sin romper nada).

### D6. Emojis de celebración: se conservan

Los 11 emojis de logros (toast + vitrina de Ajustes), el 💚 de marca (logo del sidebar, onboarding) y el 🎉 de los toasts de completado se quedan: son momentos expresivos, no UI estructural, y el 💚 funciona como marca propia. El confetti ya es CSS. Decisión revisable si el usuario lo pide tras ver el sistema completo en su celular.

### Fases (tarjetas re-cortadas en BOARD.md)

| Tarjeta | Alcance |
|---|---|
| **MK.1** | Teja (CSS + helper de render) + catálogo `MARCAS` + glifos propios de banca CO + upgrade de `bancoAvatar()` en Mis cuentas y el picker de cuentas. |
| **MK.2** | `resolverMarca()` por aliases + ~20 marcas globales de suscripciones y servicios + consumo en Calendario (fijos) y Deudas. |
| **ID.3** (re-cortada) | ~40 iconos de categoría Finko v2 en tejas por dominio; retiro de `CATEGORIA_*_EMOJI` de la UI estructural; TX.4 pasa a comparar ids de sprite. |

ID.7 (símbolos estructurales a v2) no cambia.

## Alternativas consideradas

- **Adoptar un paquete único (Lucide/Phosphor/Tabler) para categorías y todo lo demás.** Descartada: es revertir ID.6. El lenguaje v1 era geometría Lucide y el usuario lo rechazó por genérico ("iconos que podrían pertenecer a cualquier producto"); ningún paquete trae la chispa ni el duotono, y ninguno cubre la banca CO.
- **Logotipos a todo color (press kits, colecciones tipo gilbarbara/logos).** Descartada: rompen la coherencia claro/oscuro, pesan 5 a 20 KB por logo, sus formas dispares desunifican las listas, y la cobertura colombiana es igual de pobre. El glifo monocromo sobre el color oficial retiene el reconocimiento (color + silueta) a una fracción del costo.
- **Servicio de logos en línea (Clearbit, Brandfetch, favicons).** Descartada de plano: rompe offline-first y "sin servidor" (reglas ADN 2 y 3).
- **Quedarse con iniciales + color para siempre (statu quo).** Descartada: no entrega el reconocimiento inmediato pedido; las iniciales quedan solo como fallback transitorio.

## Consecuencias

### Positivas

- Reconocimiento instantáneo de marcas en cuentas, suscripciones y deudas; el sistema entero se percibe unificado por la teja.
- Escalable por catálogo, cero dependencias, cero build step, offline intacto: ~30 a 40 marcas ≈ +8 KB gzip en el sprite inline.
- La decisión de ID.6 (lenguaje propio v2) sale reforzada, no revertida: las categorías siguen siendo identidad de Finko.

### Negativas / Restricciones

- ~10 a 15 glifos de banca CO se dibujan a mano (criterio visual; verificar a 32 y 40px en ambos temas antes de entrar al sprite).
- El sprite crece (~90 símbolos al cierre de ID.3); vigilar el peso de `index.html`.
- El match por aliases es heurístico: un falso negativo cae al fallback de categoría (aceptable); los falsos positivos se evitan con aliases conservadores (palabra completa normalizada, no substring agresivo).
- Riesgo de marca registrada bajo pero no nulo; mitigado por D5 y por el retiro trivial (borrar una fila del catálogo).
