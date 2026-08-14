# Operación - Finko

> Runbooks: todo lo que se hace **fuera de escribir código**. Secuencias de pasos reproducibles, no decisiones.
> Lo que NO va acá: decisiones (van a `DECISIONS/`), estado del proyecto (va a [`HANDOFF.md`](HANDOFF.md)) y el catálogo de comandos de desarrollo, que tiene una sola fuente: los scripts de `package.json`, listados para humanos en el [`README.md`](../README.md). Dentro de un runbook se nombra el comando que ese paso necesita y nada más.
> Revisado: 2026-07-30.

| Runbook | Cuándo se ejecuta |
|---|---|
| [1. Dominio custom en Vercel](#1-dominio-custom-en-vercel) | una vez, cuando haya dominio propio (tarjeta A.5) |
| [2. Constantes legales anuales](#2-constantes-legales-anuales-smmlv-auxilio-uvt) | cada enero (tarjeta E.2 del año) |
| [3. Bump del Service Worker](#3-bump-del-service-worker) | en cada tarea que cambie un archivo cacheado |
| [4. Harness de rendimiento](#4-harness-de-rendimiento) | antes y después de toda tarea PERF |
| [5. Hook de pre-commit: compuertas E2E y guion largo](#5-hook-de-pre-commit-compuertas-e2e-y-guion-largo) | una vez por clon, para activarlo |

---

## 1. Dominio custom en Vercel

Cambiar de `finko-brown.vercel.app` a un dominio propio. No requiere cambios de código.

**Requisitos:** dominio registrado (o querer comprarlo), acceso a la cuenta de Vercel donde está deployada la app, y acceso a los DNS del dominio si el registrador es externo.

### Opción A: comprar el dominio en Vercel (lo más simple)

Vercel gestiona DNS y renovación.

1. Vercel Dashboard → Settings → Domains → **Add Domain**.
2. Escribir el dominio deseado (ej. `finko.app`).
3. Si está disponible, Vercel ofrece comprarlo: **Buy Domain**.
4. Completar pago y datos WHOIS.
5. Vercel apunta los DNS y activa HTTPS solo.

Resultado: `https://finko.app` andando en unos 5 minutos.

### Opción B: dominio ya comprado en un registrador externo

1. Vercel Dashboard → Settings → Domains → **Add Domain** → escribir el dominio → **Add**.
2. Vercel muestra sus cuatro nameservers (`ns1` a `ns4.vercel-dns.com`).
3. En el registrador (Namecheap, GoDaddy, etc.): DNS Settings o Nameservers del dominio, reemplazar los existentes por los cuatro de Vercel y guardar.
4. Esperar. La propagación de DNS puede tardar de 24 a 48 horas. Cuando Vercel detecta los nameservers, marca el dominio como **Active**.

### Opción C: mantener el registrador y apuntar solo este dominio

1. Agregar el dominio en Vercel (paso 1 de la opción B).
2. Vercel muestra los **DNS Records** (A record, CNAME).
3. En el registrador, crear esos records a mano en vez de cambiar los nameservers.

### Después de activar

- **HTTPS es automático** (Let's Encrypt, ~5 min).
- Verificar en el navegador que el dominio nuevo se comporta igual que el `.vercel.app`.
- Opcional: en Vercel → Project → Settings, configurar que el dominio viejo redirija al nuevo.

### Costo

| Escenario | Costo |
|---|---|
| Dominio nuevo registrado en Vercel | USD 12-15 al año (típico `.app`) |
| Dominio ya comprado en otro registrador | sin costo en Vercel (solo DNS) |

### Problemas frecuentes

| Síntoma | Qué hacer |
|---|---|
| El dominio da 404 | Esperar 24 h a que propaguen los DNS y verificar los nameservers en el registrador |
| No aparece el candado de HTTPS | Suele tardar ~5 min. Si pasa mucho más, recargar el panel de Vercel |
| El dominio `.vercel.app` sigue funcionando | Es lo normal, Vercel nunca los elimina. Se puede dejar como respaldo |

### Lo que NO se afecta

Los datos del usuario viven en `localStorage`, así que **cambiar de dominio no afecta a nadie que ya use la app**... con una excepción que hay que tener presente: `localStorage` está atado al origen. Un usuario que venía usando `finko-brown.vercel.app` **no verá sus datos** en el dominio nuevo, porque para el navegador es otro origen. Por eso la redirección del dominio viejo importa, y por eso conviene avisar antes de mover el dominio si ya hay usuarios reales. Una PWA ya instalada sigue apuntando al origen con el que se instaló.

Documentación de referencia: [dominios en Vercel](https://vercel.com/docs/concepts/projects/domains).

---

## 2. Constantes legales anuales (SMMLV, auxilio, UVT)

Las únicas constantes con vencimiento del proyecto son anuales: **SMMLV**, **auxilio de transporte** y **UVT** (regla 12 del ADN). Viven en la tabla histórica `LEGAL_POR_ANIO` de `modules/core/constants.js`.

La tasa de usura quedó **fuera del producto a propósito** ([ADR 004](DECISIONS/004-eliminar-tasa-usura.md)): es trimestral y su costo de mantenimiento no se justifica. No volver a introducirla sin un ADR nuevo.

Desde la refactorización a tabla histórica **no se crean exports `_20XX` sueltos**: basta agregar una entrada. Toda la app (UI, cálculos, tests) y el aviso de vigencia dejan de marcar "desactualizado" en cuanto la entrada existe.

1. Obtener los valores oficiales con su decreto o resolución: [Mintrabajo](https://www.mintrabajo.gov.co/) para SMMLV y auxilio de transporte, [DIAN](https://www.dian.gov.co/) para la UVT.
2. En `modules/core/constants.js`, reemplazar el `<año>: null` por la entrada completa:
   ```javascript
   2027: {
     smmlv:             <valor>,
     auxilioTransporte: <valor>,
     uvt:               <valor>,
     vigenciaDesde: '2027-01-01',
     fuentes: { smmlv: '...', auxilio: '...', uvt: '...' },
   },
   ```
3. Correr la suite unitaria (`pnpm test`): incluye `tests/unit/constants.test.js`, que verifica la forma de la tabla.
4. Bumpear `CACHE_NAME` (runbook 3).
5. Commitear como `feat(E.2): cargar SMMLV + auxilio + UVT <año>` y cerrar con la skill `cerrar-tarea`.
6. Push a `main`: el deploy a producción es automático.

Es una tarea mecánica de capacidad ligera: buscar tres cifras oficiales y agregar una entrada.

---

## 3. Bump del Service Worker

El Service Worker es cache-first: si no se sube la versión, el navegador sigue sirviendo los archivos viejos y el usuario **no ve el cambio** aunque el deploy haya salido bien.

**Cuándo:** siempre que cambie un archivo que el SW precachea, es decir `.js`, `.css`, `index.html` o `docs/legal/*.md`. Una tarea de solo documentación interna (BOARD, CHANGELOG, fichas) **no** necesita bump.

**Cómo:** subir en uno el número de `CACHE_NAME` en `service-worker.js`. Es la última edición antes de commitear, para que el número corresponda al contenido real que se publica.

**Cómo verificar:** con la app servida, en DevTools → Application → Service Workers debe aparecer la versión nueva; el archivo nuevo se sirve tras recargar. Si la app queda mostrando lo viejo, casi siempre es un bump olvidado.

**Aviso al usuario** (UPD.1): recarga sola si es seguro; si no, `sw-aviso.js` muestra un banner. Si el bump amerita avisar qué hay de nuevo, agregar entrada a `NOVEDADES_POR_VERSION` (`constants.js`) con la misma clave que este `CACHE_NAME`.

---

## 4. Harness de rendimiento

`scripts/perf/` mide operaciones sensibles con volúmenes crecientes de datos. Su línea base y el registro de mejoras viven en [`scripts/perf/BASELINE.md`](../scripts/perf/BASELINE.md), junto al harness que la produce.

**Disciplina obligatoria de toda tarea PERF:** correr el harness (`pnpm perf`) **antes y después** del cambio y comparar contra BASELINE.md. Una optimización sin medición antes/después no se acepta: el proyecto ya descartó dos optimizaciones que parecían obvias porque la medición mostró que no cambiaban nada ([ADR 030](DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md)).

**Cómo leer el resultado:** cada fila es una operación con su tiempo por volumen. Lo que importa es la tendencia, no el número aislado: una operación que crece lineal con el estado total es un muro futuro; una que queda plana está memoizada y ya no es el problema.

**Qué no mide todavía:** el arranque (`loadData()`, con su `JSON.parse` y sus migraciones), que es justamente lo único que crece lineal con el estado total y no se puede memoizar. Agregar esa columna es la tarjeta **PERF.8**, y es el dato que el ADR 030 exige para decidir el paso a IndexedDB con evidencia en vez de intuición.

El harness es independiente de la suite de tests: no corre con `pnpm test` ni la bloquea.

---

## 5. Hook de pre-commit: compuertas E2E y guion largo

**Qué resuelve.** E2E tarda ~3,5 min, así que nunca fue compuerta de cada commit. El precio se pagó en **BUG-019**: DIS.19 cambió el markup de la casa de Ahorro, actualizó los unit tests y no los E2E, y la suite quedó **dos días en rojo** con 146 tests sin ejecutar. Lo encontró el cierre de otra tarea, por casualidad.

**DOC.4 (2026-08-14) sumó la compuerta 3 al mismo hook.** El chequeo de guion largo/medio (U+2014, U+2013) de `cerrar-tarea/SKILL.md` era manual y se corría a mano en cada cierre: el mismo riesgo de olvido que ya tenía la compuerta E2E antes de BUG-019. `.githooks/pre-commit` ahora corre `git diff --cached` sobre el index (`*.md`, `*.js`, `*.css`, `*.html` a commitear) y bloquea si encuentra alguno, con archivo y línea. Corre sobre el index, no el disco sucio: mismo criterio que la compuerta E2E de abajo, y no depende de Playwright ni agrega dependencias.

**Activarlo (una vez por clon):**

```bash
pnpm run hooks:on
```

Usa `core.hooksPath` apuntando a `.githooks/`. Sin husky ni dependencias: `.git/hooks/` no se versiona y agregar tooling contradice el ADN 1 y [`SECURITY.md`](SECURITY.md). Verificar con `git config core.hooksPath`.

**Cómo funciona.** `scripts/necesita-e2e.js` responde si el cambio obliga a correr E2E: lo obliga tocar `index.html`, `modules/`, `styles/` o `service-worker.js`, y solo eso. `pnpm run test:e2e` corre `scripts/e2e-sello.js` al salir verde, que escribe en `.e2e-sello.json` la huella del runtime aprobado. `.githooks/pre-commit` compara esa huella con la actual y bloquea si no cuadran o falta el sello.

**El hook no corre Playwright, compara huellas: es instantáneo.** Uno que bloquee 3,5 min se acaba saltando con `--no-verify`, y una compuerta que se saltea es peor que ninguna porque da falsa confianza. Con el sello la suite se corre **una vez por lote** y el resto de los commits pasan gratis mientras el runtime no cambie.

**La regla es por ruta, no por contenido del diff.** El primer diseño buscaba señales de markup en las líneas cambiadas y tenía dos falsos negativos: `display: none` rompe un `toBeVisible()` sin traer señal, y cambiar un texto rompe un `toHaveText()` sin tocar una clase. En una compuerta el falso negativo es el peor error.

`.e2e-sello.json` no se versiona: es un hecho de una máquina y un momento, así que un clon nuevo arranca sin sello. Si el hook bloquea, la salida es correr la suite.
