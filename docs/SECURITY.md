# SECURITY - Finko Claude

> Revisado: 2026-10-28.

> Política de seguridad, modelo de amenaza y prácticas recomendadas para el proyecto.

---

## 1. Modelo de amenaza

Desde el [ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md) Finko tiene dos modos. **El segundo existe desde NUBE.1 (2026-10-27)**, en prueba cerrada.

| Componente | Sin cuenta (hoy) | Con cuenta (desde NUBE.1) |
|---|---|---|
| Servidor | No existe | Supabase (Postgres, autenticación, funciones); Finko no opera servidor propio |
| Claves | No existen | Clave pública del proyecto en el cliente, por diseño; la secreta solo en funciones del servidor |
| Sesión | No existe | Sesión de Supabase en el almacenamiento del navegador; en el teléfono de un niño, un token de vínculo |
| Datos de terceros | No se procesan | Finanzas del adulto y datos de sus niños (Ley 1581) |
| Datos del usuario | Solo `localStorage` | `localStorage` (la copia que manda) y una copia en la nube |
| Recursos externos | Cero: sin CDNs, fonts remotas ni analytics | Igual, más `connect-src` al dominio del proyecto |

**Vector de siempre:** el supply chain de las dependencias de desarrollo (Vitest, Playwright, ESLint), que corren en la máquina del developer y en CI con sus permisos. **Vectores nuevos con cuenta:** reglas RLS mal escritas (la fuga más común en Supabase), robo de sesión por XSS, toma de cuenta, código de vinculación del niño adivinado y dispositivo perdido con la sesión abierta. Sus reglas: sección 8.

---

## 2. Por qué pnpm y no npm

Los scripts `preinstall`, `install` y `postinstall` de npm corren solos al instalar, con los permisos del usuario, y una dependencia transitiva comprometida basta para tomar la máquina (`event-stream` 2018, `ua-parser-js` 2021, `node-ipc` 2022, tipo-squatting 2023, oleadas "shai-hulud" 2024-2025). pnpm v10+ no corre scripts de install salvo lista blanca (`onlyBuiltDependencies`), no instala paquetes publicados hace menos de N días (`minimum-release-age`), verifica la integridad del store y respeta el lockfile en CI.

## 3. Migración a pnpm (hecha)

**Ejecutada el 2026-05-18** con pnpm v11.1.3. Defensas activas en `/.npmrc`: `minimum-release-age=7`, `only-built-dependencies` (`esbuild`, `@vitest/coverage-v8`), `frozen-lockfile=true`. Vercel detecta `pnpm-lock.yaml` solo. La guía paso a paso vive en el historial de este archivo (commit `dc94488` y anteriores).

---

## 4. Workflow de seguridad continuo

### Antes de agregar una dependencia nueva

1. **¿La necesitamos realmente?** Finko evita dependencies - todo lo posible vanilla.
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

- `X-Frame-Options: DENY` - bloquea iframes externos
- `X-Content-Type-Options: nosniff` - desactiva MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` - limita info en referer
- `Permissions-Policy: notifications=(self), camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()` - bloquea APIs no usadas
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` - HSTS explícito
- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; frame-ancestors 'none'` - XSS hardening. `style-src` admite `'unsafe-inline'` por los `style=""` que generan los módulos; `script-src` no. Con cuenta, `connect-src` suma el dominio del proyecto de Supabase (sección 8)

_(todos los hallazgos críticos del audit 2026-05-18 resueltos - H1, H2, H3 ✅)_

---

## 6. Reporte de vulnerabilidades

Finko no es un servicio público - no hay programa formal de bug bounty.

Si encuentras un problema de seguridad en el código del proyecto:

1. **NO** abrir issue público con detalles del exploit.
2. Abrir issue genérico en GitHub con etiqueta `security`, sin detalles técnicos.
3. Contactar al mantenedor por email (ver `package.json` o git log) con los detalles.

---

## 7. Audits realizados

| Fecha | Versión | Hallazgos | Documento |
|---|---|---|---|
| 2026-05-18 | v1.0.0 | 3 críticos (CSP, happy-dom, Permissions-Policy), 4 medios, 3 bajos identificados | commit previo a `d454f1d` |
| 2026-05-18 | v1.0.0 | H1-H3 resueltos: CSP estricto, happy-dom 15.11.7, Permissions-Policy extendida + HSTS | `d454f1d` |

---

## 8. La nube (Supabase, ADR 096)

Rige desde NUBE.1. Cada regla con test o verificación propia; una que falte bloquea la rebanada. Hoy: `registros` (NUBE.2) y los vínculos del niño (NUBE.3), sin permisos para `anon` y con RLS por usuario; las pruebas viven en [`supabase/pruebas-seguridad.sql`](../supabase/pruebas-seguridad.sql).

1. **RLS en toda tabla, sin excepción.** Política por dueño y por familia, con un test por regla contra el proyecto de prueba: el dueño lee y escribe; otro usuario no; el niño no lee al padre; ninguna familia lee a otra.
2. **Claves.** La pública (anon o publishable) va en el cliente: la barrera es RLS. La secreta (service_role) vive solo como secreto de las funciones del servidor: nunca en el repo, el chat, un issue ni un log. Si se filtra, se rota de inmediato.
3. **Sesión.** El riesgo es el XSS: `script-src 'self'` sin excepciones, todo dato del usuario pasa por `esc()` antes de ir al HTML, y Ajustes permite cerrar la sesión en todos los dispositivos.
4. **Inicio de sesión** por correo (enlace o código), por Supabase Auth: Finko no guarda contraseñas. Registro abierto apagado: solo correos invitados. Límites de intentos del proveedor activos.
5. **Código de vinculación del niño**: lo genera el servidor, a pedido de la cuenta del padre y solo para un niño que ya está en su nube; 8 letras de 31 posibles (unos 850 mil millones), un solo uso y vence en 10 minutos. El token que entrega se guarda solo como huella SHA-256 y únicamente abre las funciones del niño, que rechazan lo que no es suyo.
6. **Dispositivo perdido**: el PIN local ([ADR 063](DECISIONS/063-candado-de-acceso-local.md)) sigue cerrando la app; desde otro dispositivo se cierran todas las sesiones.
7. **Sin librería cliente**: `infra/nube.js` habla REST con `fetch` (ADR 096, resolución en NUBE.1). Si algún día entra una, va dentro del repo con versión fija, origen y SHA-256 anotados, y pasa la checklist de la sección 4.
8. **Desarrollo con datos inventados** en un proyecto de Supabase aparte; nunca datos reales en desarrollo ni en E2E.
9. **Incidente**: rotar claves, cerrar sesiones, avisar a los titulares afectados y a la SIC cuando la ley lo exija, y dejarlo en el CHANGELOG.
10. **Borrar la cuenta borra al usuario y todo lo suyo en la nube** (NUBE.2b): `borrar_mi_cuenta()` solo borra a quien la llama y no usa la clave secreta (`supabase/003-borrar-cuenta.sql`, con su prueba). Toda tabla con datos de un usuario cuelga de `auth.users` con `on delete cascade`. Los respaldos del proveedor vencen en su ciclo ([`legal/nube/`](legal/nube/README.md)).
