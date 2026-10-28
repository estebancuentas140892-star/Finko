# Ficha de contexto: Nube (cuenta y respaldo)

> Revisado: 2026-10-27.

> La cuenta opcional y el respaldo en Supabase. Decisiones: [ADR 096](../DECISIONS/096-finko-en-la-nube-con-supabase.md). Tarjetas: iniciativa NUBE en [`board/transversal.md`](../board/transversal.md). Reglas de seguridad: [SECURITY.md](../SECURITY.md) sección 8. Reglas de uso y plantilla en [`README.md`](README.md).
>
> **Qué NO buscar acá:** el respaldo en archivo y el resto de "Tus datos" ([`configuracion.md`](configuracion.md)); los perfiles de niño ([`nino.md`](nino.md)).

---

## Cuenta y respaldo en la nube (NUBE.1)

- **Objetivo**          : no perder los datos al perder el teléfono y tenerlos igual en otro dispositivo, sin que la cuenta sea obligatoria.
- **Estado actual**     : prueba cerrada, solo invitados. **NUBE.1** sube el estado completo como un respaldo por usuario; la sincronización por registro es NUBE.2.
- **Verificado contra** : commit de NUBE.1 (2026-10-27).

**Dónde vive**

| Pieza | Archivo | Ancla |
|---|---|---|
| Cliente REST de Supabase (sin librería), sesión y decisiones puras | `modules/infra/nube.js` | `pedirAcceso()`, `entrarConCodigo()`, `capturarEnlaceDeAcceso()`, `sesionVigente()`, `leerRespaldo()`, `guardarRespaldo()`, `borrarRespaldo()`, `decidirAlEntrar()`, `copiaParaNube()`, `prepararRestauracion()` |
| Acciones de Ajustes y subida automática | `modules/dominio/config/nube.js` | `initNube()`, `estadoNube()`, `data-action="nube-*"`, escucha `state:save` y `online` |
| Bloque "Guardar en la nube" | `modules/dominio/config/nube-view.js` | `htmlNube()`, `MENSAJES_NUBE`, `haceCuanto()` |
| La sesión que trae el enlace del correo | `modules/ui/bootstrap.js` | `capturarEnlaceDeAcceso()` antes del router |
| Dominio permitido | `vercel.json`, `netlify.toml` | `connect-src` |
| Proyecto | Supabase `finko-prueba` (`sa-east-1`) | tabla `public.respaldos`: una fila por usuario, RLS por `auth.uid()`, sin permisos para `anon` |

**Recursos**: la sesión vive en `localStorage` con la clave `fk_nube`, fuera de `fk_v1`; la autorización aceptada queda en `S.config.autorizacionNube` (versión y fecha) y viaja con el respaldo. Textos de autorización: [`legal/nube/autorizaciones.md`](../legal/nube/autorizaciones.md).

**Dependencias y relaciones**: `config/nube.js` escucha `state:save` (lo emite `storage.js` tras cada guardado) y sube a los 5 s; restaurar usa `restaurarBlob()` y recarga, como importar un respaldo. No importa ningún otro dominio.

**Riesgos**:

- **Respaldo entero, no por registro.** Si dos dispositivos cambian a la vez, el último que sube reemplaza al otro. Al entrar nunca se pisa nada sin preguntar, pero después sí: es lo que resuelve NUBE.2.
- **El enlace del correo abre el navegador**, no la app instalada: en un teléfono con Finko instalado, la sesión queda en el navegador. El código sirve dentro de la app, pero la plantilla de correo de Supabase no se puede editar sin SMTP propio, así que depende de si la plantilla por defecto lo trae.
- **Correo por defecto de Supabase**: límite bajo de envíos por hora y, según su documentación, solo entrega a correos del equipo del proyecto. Para invitar probadores hace falta SMTP propio.
- **La sesión en `localStorage`** la leería un XSS: por eso `script-src 'self'` sin excepciones y `esc()` en todo dato del usuario.
- **Plan gratis**: Supabase pausa el proyecto tras una semana sin uso. Los datos siguen en cada dispositivo; se reactiva desde su panel.
- **`borrarTodo()` limpia todo `localStorage`**: también olvida la sesión de la nube en ese dispositivo, sin cerrarla en el servidor.

**Cambios pendientes**: SMTP propio para invitar a los probadores; NUBE.2 (sincronización por registro y borrar la cuenta completa, que necesita una función de servidor); NUBE.3 (autorización por niño y su teléfono vinculado).

**Cambios realizados**:

- 2026-10-27 (NUBE.1): cuenta opcional por correo para invitados, respaldo automático del estado completo, traer al entrar en un dispositivo vacío y elegir cuando hay datos en los dos lados.
