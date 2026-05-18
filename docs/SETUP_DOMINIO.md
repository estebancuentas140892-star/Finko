# A.5 — Configurar dominio custom en Vercel

> Guía para cambiar de `finko-brown.vercel.app` a un dominio propio (ej: `finko.app`, `finko.co`).

---

## Requisitos previos

- Dominio registrado en un registrador (Namecheap, GoDaddy, Route 53, etc.) O querer comprar uno nuevo.
- Acceso a la cuenta de Vercel donde está deployada la app (`vercel-brown` o similar).
- Acceso a los DNS del dominio (si es registrador externo).

---

## Opción 1: Comprar dominio en Vercel

**Ventaja:** Vercel gestiona todo (DNS, renovación, etc.).

1. En **Vercel Dashboard** → Settings → Domains
2. Click **"Add Domain"**
3. Escribe el dominio deseado (ej: `finko.app`)
4. Si está disponible, Vercel ofrece comprarlo directamente. Click **"Buy Domain"**
5. Completa el pago y datos WHOIS
6. **Automático:** Vercel apunta los DNS y activa HTTPS

**Resultado:** `https://finko.app` listo en ~5 min.

---

## Opción 2: Dominio externo (registrador independiente)

**Caso:** Ya compraste `finko.app` en Namecheap, GoDaddy, etc.

### Paso 1: Agregar dominio en Vercel

1. Vercel Dashboard → Settings → Domains
2. Click **"Add Domain"**
3. Escribe el dominio (ej: `finko.app`)
4. Click **"Add"**
5. Vercel muestra 4 **nameservers**:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ns3.vercel-dns.com
   ns4.vercel-dns.com
   ```

### Paso 2: Apuntar DNS en el registrador

1. Accede a tu registrador (Namecheap, GoDaddy, etc.)
2. Ve a **DNS Settings** o **Nameservers** del dominio
3. Reemplaza los nameservers existentes con los 4 de Vercel (arriba)
4. Guarda cambios

**Nota:** Los cambios de DNS pueden tardar 24–48h en propagarse globalmente.

### Paso 3: Verificar en Vercel

En unos minutos (usualmente), Vercel detectará los nameservers y marcará el dominio como **"Active"**. Si no, espera 24h y recarga la página.

---

## Opción 3: Registrador + Vercel DNS Records (avanzado)

**Caso:** Quieres mantener el registrador pero apuntar solo este dominio a Vercel.

1. En Vercel: agregar el dominio (paso anterior).
2. Vercel te mostrará **DNS Records** (A record, CNAME, etc.).
3. En tu registrador: en lugar de cambiar nameservers, crea estos records manualmente.
4. Guarda y espera propagación.

---

## Después de activar el dominio

### SSL/TLS (automático)

Vercel activa HTTPS automáticamente con Let's Encrypt. En ~5 min tendrás certificado válido.

### Verificar en el navegador

```
https://finko.app
```

Debería funcionar igual que `finko-brown.vercel.app`. Todos los datos del usuario siguen en `localStorage` — no afecta nada.

### Opción: redirigir el dominio viejo

En Vercel → Project → Deployments → Settings, puedes configurar que `finko-brown.vercel.app` redirija a `finko.app` (opcional).

---

## Costo estimado

| Escenario | Costo |
|---|---|
| Dominio new registrado en Vercel | USD 12–15/año (típico `.app`) |
| Dominio ya comprado en Namecheap/GoDaddy | $0 en Vercel (solo DNS, free) |

---

## Troubleshooting

| Problema | Solución |
|---|---|
| Dominio muestra error 404 | Espera 24h a que los DNS se propaguen. Verifica nameservers en registrador. |
| HTTPS no aparece | En Vercel, el dominio debería mostrar un candado 🔒 en ~5 min. Si tarda, recarga o contacta Vercel support. |
| Viejo dominio `.vercel.app` sigue funcionando | Normal. Vercel nunca elimina los dominios `.vercel.app`. Puedes dejarlos como backup o desactivarlos manualmente. |

---

## Notas

- **Finko en producción** vive en `localStorage`. El cambio de dominio NO afecta datos de usuarios.
- **PWA instalada** en celulares no se afecta por cambio de dominio — seguirá funcionando offline.
- **Analytics, logs, certificados** se heredan automáticamente en Vercel.

Para preguntas adicionales, ver [docs de Vercel](https://vercel.com/docs/concepts/projects/domains).
