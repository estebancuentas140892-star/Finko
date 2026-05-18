# SECURITY — Finko Claude

> Política de seguridad, modelo de amenaza y prácticas recomendadas para el proyecto.
> Última revisión: 2026-05-18

---

## 1. Modelo de amenaza

Finko es **offline-first, sin backend, sin sync, sin cuenta**. El vector de ataque
sobre la **app en producción** es mínimo:

| Componente | Riesgo |
|---|---|
| Servidor backend | No existe |
| API keys / tokens | No existen |
| Cookies / sesión | No existen |
| Datos de terceros | No se procesan |
| Datos del usuario | Solo en `localStorage` del propio navegador |
| Recursos externos | Cero — sin CDNs, sin fonts remotas, sin analytics |

**Vector real:** el **supply chain de dependencias de desarrollo** (Vitest, Playwright,
ESLint, Pillow para scripts, etc.). Estas corren en la máquina del developer y en CI,
con los permisos del usuario que ejecutó `npm install`.

---

## 2. Por qué evitar npm y migrar a pnpm

### Historial de ataques a npm

npm ha sufrido ataques de supply chain repetidos a lo largo de los años:

| Año | Paquete | Impacto |
|---|---|---|
| 2018 | `event-stream` | Backdoor en lib popular, cripto-stealer al instalar |
| 2021 | `ua-parser-js` | Versión maliciosa publicada, minero CPU |
| 2022 | `node-ipc` | Sabotaje del autor (data wipe en máquinas rusas/bielorrusas) |
| 2023 | Tipo-squatting masivo | Cientos de paquetes con nombres similares a populares |
| 2024–2025 | Oleadas "shai-hulud" | `postinstall` scripts inyectando cripto-stealers |

**El vector común:** los scripts `preinstall`, `install` y `postinstall` se ejecutan
**automáticamente** al hacer `npm install`, con **permisos completos del usuario**.
Una dependencia transitiva comprometida es suficiente para tomar control de la máquina.

### Defensas built-in de pnpm

pnpm (a partir de v10) trae mitigaciones que npm aún no tiene por defecto:

| Defensa | Qué hace |
|---|---|
| `onlyBuiltDependencies` | Por defecto NO ejecuta scripts de install. Requiere whitelist explícita en `.npmrc` |
| `minimum-release-age` (v10.16+) | No instala paquetes publicados hace menos de N días. Atrapa la mayoría de reports de malware reciente |
| `verify-store-integrity` | Chequeo de integridad del store local antes de instalar |
| `frozen-lockfile` | Por defecto en CI, evita resolución dinámica |
| Store global con symlinks | Bonus: ahorro ~70% disco, velocidad de instalación 2–3× |

### Ventaja adicional

pnpm también es **más liviano** que npm: usa un store global con hardlinks, lo que
evita duplicar gigabytes de `node_modules` entre proyectos.

---

## 3. Guía de migración: npm → pnpm

> **✅ Migración ejecutada el 2026-05-18** — pnpm v11.1.3, 596/596 tests verdes.
> Los pasos a continuación son referencia histórica y para replicar en otros entornos.

### Paso 1 — Instalar pnpm globalmente

```bash
# Opción 1: vía npm (una sola vez)
npm install -g pnpm

# Opción 2: standalone, sin npm
# Windows (PowerShell):
iwr https://get.pnpm.io/install.ps1 -useb | iex

# Verificar
pnpm --version    # debería ser >= 10.16.0
```

### Paso 2 — Limpiar y reinstalar en el proyecto

```bash
cd C:/Users/USUARIO/Desktop/Finko_Claude

# Borrar artefactos de npm
rm -rf node_modules
rm package-lock.json

# Instalar con pnpm (genera pnpm-lock.yaml)
pnpm install
```

### Paso 3 — Crear `.npmrc` con defensas

Archivo en la raíz del proyecto (`/.npmrc`):

```ini
# No instalar paquetes publicados hace menos de 7 días.
# Atrapa la mayoría de reports de malware antes de que llegue a tu máquina.
minimum-release-age=7

# Lista blanca de paquetes autorizados a ejecutar scripts de install.
# Cualquier otro paquete con postinstall será BLOQUEADO automáticamente.
# Actualizar esta lista cuando se agregue una dep que legítimamente necesite scripts.
only-built-dependencies[]=esbuild
only-built-dependencies[]=@vitest/coverage-v8

# CI debe respetar el lockfile exacto.
frozen-lockfile=true

# Otras buenas prácticas
strict-peer-dependencies=false
auto-install-peers=true
```

### Paso 4 — Actualizar `package.json` scripts (opcional)

Los scripts actuales (`npm test`, `npm run lint`, etc.) **seguirán funcionando con pnpm**
automáticamente (`pnpm test`, `pnpm run lint`). No es necesario cambiarlos.

Si en algún script hay `npm` literal hardcoded (ej. `npm run X && npm run Y`), reemplazarlo
por `pnpm` para coherencia.

### Paso 5 — Adaptar CI (Vercel)

Vercel detecta `pnpm-lock.yaml` automáticamente y usa `pnpm install`. No requiere config.

Si en algún punto el `vercel.json` define `installCommand`, actualizar:
```json
"installCommand": "pnpm install --frozen-lockfile"
```

### Paso 6 — Commitear el cambio

```bash
git add pnpm-lock.yaml .npmrc
git rm package-lock.json
git commit -m "chore: migrar de npm a pnpm + defensas anti-malware"
```

### Paso 7 — Verificar

- `pnpm test` → 596/596 tests verdes
- `pnpm run lighthouse` → métricas equivalentes (servir con `pnpm run serve` primero)
- `pnpm run test:e2e` → 18/18 smoke tests verdes
- Vercel deploy automático en push a `main` → producción OK

---

## 4. Workflow de seguridad continuo

### Antes de agregar una dependencia nueva

1. **¿La necesitamos realmente?** Finko evita dependencies — todo lo posible vanilla.
2. **¿Quién la mantiene?** Preferir libs con autor conocido, > 1 año en npm, weekly downloads sólidas.
3. **¿Tiene `postinstall` / `preinstall`?**
   ```bash
   pnpm view <paquete> scripts
   ```
   Si los tiene, evaluar si es legítimo o agregarlo a `only-built-dependencies`.
4. **`pnpm audit`** después de instalar.

### Antes de cada release

```bash
pnpm audit              # ver vulnerabilidades conocidas
pnpm outdated            # ver actualizaciones disponibles
pnpm update --interactive # actualizar selectivamente
```

### Cuando aparezca un advisory crítico

1. Verificar si Finko usa el paquete (transitivo o directo).
2. Si sí, hacer bump dirigido o pin de versión segura.
3. Documentar en `docs/CHANGELOG.md`.

---

## 5. Headers de seguridad en producción

Ver `vercel.json` y `netlify.toml`. Headers actuales en producción:

- `X-Frame-Options: DENY` — bloquea iframes externos
- `X-Content-Type-Options: nosniff` — desactiva MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` — limita info en referer
- `Permissions-Policy: notifications=(self), camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()` — bloquea APIs no usadas
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` — HSTS explícito
- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; frame-ancestors 'none'` — XSS hardening

_(todos los hallazgos críticos del audit 2026-05-18 resueltos — H1, H2, H3 ✅)_

---

## 6. Reporte de vulnerabilidades

Finko no es un servicio público — no hay programa formal de bug bounty.

Si encontrás un problema de seguridad en el código del proyecto:

1. **NO** abrir issue público con detalles del exploit.
2. Abrir issue genérico en GitHub con etiqueta `security`, sin detalles técnicos.
3. Contactar al mantenedor por email (ver `package.json` o git log) con los detalles.

---

## 7. Audits realizados

| Fecha | Versión | Hallazgos | Documento |
|---|---|---|---|
| 2026-05-18 | v1.0.0 | 3 críticos (CSP, happy-dom, Permissions-Policy), 4 medios, 3 bajos | (en conversación) |
| 2026-05-18 | v1.0.0 | H1-H3 resueltos: CSP estricto, happy-dom 15.11.7, Permissions-Policy extendida + HSTS | d454f1d |

> **TODO:** crear `docs/AUDITS/2026-05-18.md` con el reporte completo cuando se decida implementar los hallazgos críticos.
