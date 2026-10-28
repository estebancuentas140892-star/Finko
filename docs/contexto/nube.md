# Ficha de contexto: Nube (cuenta, sincronización y familia)

> Revisado: 2026-10-28.

> La cuenta opcional y el respaldo en Supabase. Decisiones: [ADR 096](../DECISIONS/096-finko-en-la-nube-con-supabase.md). Tarjetas: iniciativa NUBE en [`board/transversal.md`](../board/transversal.md). Reglas de seguridad: [SECURITY.md](../SECURITY.md) sección 8. Reglas de uso y plantilla en [`README.md`](README.md).
>
> **Qué NO buscar acá:** el respaldo en archivo y el resto de "Tus datos" ([`configuracion.md`](configuracion.md)); los perfiles de niño ([`nino.md`](nino.md)).

---

## Cuenta, sincronización y familia en la nube (NUBE.1 a NUBE.3)

- **Objetivo**          : no perder los datos al perder el teléfono y tenerlos iguales en todos los dispositivos, sin que la cuenta sea obligatoria.
- **Estado actual**     : prueba cerrada, solo invitados. **NUBE.1** (cuenta por correo), **NUBE.2** (sincronización por registro: lo de un dispositivo llega a los otros, también los borrados), **NUBE.2b** (borrar la cuenta completa desde Ajustes, con BORRAR y el PIN; los datos del dispositivo se quedan) y **NUBE.3** (el teléfono del niño, vinculado con un código del padre).
- **Verificado contra** : commit de NUBE.3 (2026-10-28).

**Dónde vive**

| Pieza | Archivo | Ancla |
|---|---|---|
| Cliente REST de Supabase (sin librería), sesión y libro | `modules/infra/nube.js` | `pedirAcceso()`, `entrarConCodigo()`, `capturarEnlaceDeAcceso()`, `sesionVigente()`, `hayRegistros()`, `bajarRegistros()`, `subirRegistros()`, `borrarRegistros()`, `borrarCuenta()`, `leerLibro()`, `decidirAlEntrar()` |
| Motor de sincronización (puro) | `modules/infra/nube-sync.js` | `registrosDe()`, `marcarCambios()`, `aplicarRemotas()`, `filasPendientes()`, `confirmarSubidas()`, `estadoDesdeNube()`, `libroParaReemplazarNube()`, `huella()` |
| Acciones de Ajustes y ciclo de sincronización | `modules/dominio/config/nube.js` | `initNube()`, `estadoNube()`, `_sincronizar()`, `data-action="nube-*"`, escucha `state:save`, `online` y `visibilitychange`, y cada minuto |
| Bloque "Guardar en la nube", modal "Su teléfono" y pantalla del código del niño | `modules/dominio/config/nube-view.js` | `htmlNube()`, `htmlVincularNino()`, `htmlCodigoNino()`, `MENSAJES_NUBE` |
| El teléfono del niño: vínculo y sus funciones | `modules/infra/nube.js` / `config/nube.js` | `crearCodigoNino()`, `canjearCodigoNino()`, `ninoBajar()`, `ninoSubir()`, `leerVinculo()`, `_modo()`, `_canjear()`, `data-action="nube-vincular-nino"`, `nube-codigo-nino` |
| Entrar directo al perfil en el teléfono del niño | `modules/ui/quien-usa.js` / `nino.css` | `initPerfiles()`, `S.config.dispositivoNino`, `.kid-propio` |
| SQL de la base y pruebas de seguridad | `supabase/` | `001-registros.sql`, `002-familia.sql`, `pruebas-seguridad.sql` |
| La sesión que trae el enlace del correo | `modules/ui/bootstrap.js` | `capturarEnlaceDeAcceso()` antes del router |
| Dominio permitido | `vercel.json`, `netlify.toml` | `connect-src` |
| Proyecto | Supabase `finko-prueba` (`sa-east-1`) | tabla `public.registros`: una fila por (usuario, colección, id), hora del servidor por trigger, RLS por `auth.uid()`, sin permisos para `anon` |
| Borrar la cuenta (servidor) | `supabase/003-borrar-cuenta.sql`, prueba en `supabase/pruebas-borrar-cuenta.sql` | `public.borrar_mi_cuenta()`: `security definer`, borra de `auth.users` solo a `auth.uid()`; lo demás cae en cascada |

**Recursos**: la sesión vive en `localStorage` con la clave `fk_nube`, el vínculo del teléfono de un niño en `fk_nube_nino` y el libro de sincronización (huella, hora y pendiente de cada registro, más el cursor) en `fk_nube_sync`, todos fuera de `fk_v1`; la autorización aceptada queda en `S.config.autorizacionNube` (versión y fecha) y viaja con el respaldo. Textos de autorización: [`legal/nube/autorizaciones.md`](../legal/nube/autorizaciones.md).

**Dependencias y relaciones**: `config/nube.js` escucha `state:save` (lo emite `storage.js` tras cada guardado) y sincroniza a los 3 s. Lo que baja se aplica con arreglos nuevos, `save()`, `state:change` por clave y `renderAll()`. Traer todo usa `restaurarBlob()` y recarga, como importar un respaldo. No importa ningún otro dominio.

**Riesgos**:

- **Conflicto por registro, gana el más reciente** según la hora de cada dispositivo: un reloj muy desfasado puede hacer ganar el cambio equivocado. El perfil del niño va partido por dueño, así que el padre y el niño solo chocan si cambian el mismo movimiento o meta.
- **El teléfono del niño no puede cambiar lo que fija el padre** (nombre, mesada, premio): la base lo rechaza y la app ni lo intenta. Si algo de eso difiere en su teléfono, la siguiente bajada lo reemplaza.
- **Desvincular deja los datos en el teléfono del niño**: deja de sincronizar, pero lo que anotó no se borra de ahí.
- **No es tiempo real**: el otro dispositivo ve el cambio al volver a la app, al tocar "Sincronizar ahora" o en el minuto siguiente.
- **El libro ocupa cupo de `localStorage`** (unos 60 bytes por registro): si se acerca al tope, entra el disparador D4 del ADR 030.
- **Datos de una app más vieja** hacen recargar la app para migrar; los de una más nueva no se aplican hasta actualizar.
- **El enlace del correo abre el navegador**, no la app instalada: en un teléfono con Finko instalado, la sesión queda en el navegador. El código sirve dentro de la app, pero la plantilla de correo de Supabase no se puede editar sin SMTP propio, así que depende de si la plantilla por defecto lo trae.
- **Correo por defecto de Supabase**: límite bajo de envíos por hora y, según su documentación, solo entrega a correos del equipo del proyecto. Para invitar probadores hace falta SMTP propio.
- **La sesión en `localStorage`** la leería un XSS: por eso `script-src 'self'` sin excepciones y `esc()` en todo dato del usuario.
- **Plan gratis**: Supabase pausa el proyecto tras una semana sin uso. Los datos siguen en cada dispositivo; se reactiva desde su panel.
- **`borrarTodo()` limpia todo `localStorage`**: también olvida la sesión de la nube en ese dispositivo, sin cerrarla en el servidor.
- **Tras borrar la cuenta, los otros dispositivos** siguen con su token hasta que vence (hasta una hora); lo que intenten subir lo rechaza la llave foránea y al vencer vuelven al modo sin cuenta.
- **`borrar_mi_cuenta()` escribe en el esquema `auth` de Supabase**: si el proveedor quita ese permiso, falla entera y hay que pasar a una Edge Function (ADR 096, resolución de NUBE.2b). Una tabla nueva sin `on delete cascade` a `auth.users` quedaría atrás: lo vigila un test unitario.

**Cambios pendientes**: SMTP propio para invitar a los probadores. El inicio de sesión real, el borrado de la cuenta y el vínculo del teléfono de un niño no se probaron de punta a punta con un usuario real: falta el primer usuario invitado (las funciones se probaron en el servidor dentro de transacciones deshechas).

**Cambios realizados**:

- 2026-10-28 (NUBE.3): el teléfono del niño se vincula con un código de un solo uso del padre, sincroniza solo su perfil, y el perfil viaja partido por dueño.
- 2026-10-28 (NUBE.2b): borrar la cuenta completa con `borrar_mi_cuenta()`, función de base sin clave secreta; en el dispositivo quedan los datos y se olvida la autorización.
- 2026-10-27 (NUBE.2): sincronización por registro con libro local de huellas, borrados que viajan, tabla `registros` en lugar de `respaldos`.
- 2026-10-27 (NUBE.1): cuenta opcional por correo para invitados, respaldo automático del estado completo, traer al entrar en un dispositivo vacío y elegir cuando hay datos en los dos lados.
