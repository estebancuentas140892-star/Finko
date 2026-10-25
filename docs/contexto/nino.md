# Ficha de contexto: Perfil niño y Familia

> Revisado: 2026-10-25.

> Los perfiles de niño en el mismo dispositivo, "¿Quién usa Finko?", lo que ve el niño y lo que administra el tutor desde Ajustes, Familia. Decisiones: [ADR 093](../DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md). Tarjetas: iniciativa APR, Fase 3, en [`board/transversal.md`](../board/transversal.md). Reglas de uso y plantilla en [`README.md`](README.md).
>
> **Qué NO buscar acá:** la ruta y la lección del adulto ([`aprende.md`](aprende.md)); el candado y el resto de Ajustes ([`configuracion.md`](configuracion.md)).

---

## Perfiles, "¿Quién usa Finko?" y la piel del niño

- **Objetivo**          : que un tutor y niños de 7 a 12 años compartan el teléfono sin que el niño vea las finanzas del adulto (D1).
- **Estado actual**     : en evolución (Fase 3 de APR). **APR.3b** (sistema visual: `.kid`, Frai, dibujos, frasco) y **APR.3a** (perfiles, selector, alta paso 1, PIN de niño a adulto, candado obligatorio, P1) cerradas. El niño ve por ahora un Inicio mínimo; su barra, ruta, alcancía y "Yo" llegan con APR.3c y APR.3d; mesada, premio y progreso del niño con APR.3e.
- **Verificado contra** : commit de APR.3a (2026-10-25).

**Dónde vive**

| Pieza | Archivo | Ancla |
|---|---|---|
| Modelo del niño, validación del alta y quién usa Finko ahora (sesión, no se guarda) | `modules/infra/perfiles.js` | `normalizarPerfil()`, `validarNino()`, `crearNino()`, `ninos()`, `hayNinos()`, `perfilActivo()`, `entrarComo()` |
| Estado y migración | `modules/core/state.js` / `storage.js` | `perfiles` (schema v48) |
| "¿Quién usa Finko?", PIN del adulto y cambio de piel con fundido | `modules/ui/quien-usa.js` | `initPerfiles()`, `abrirQuienUsa()`, `htmlQuienUsa()`, `_aplicarPiel()`, `data-action="perfil-cambiar"` |
| Fundido compartido con el cambio de tema (CFG.7) | `modules/ui/shell.js` | `conFundido()` |
| "Olvidé mi PIN" con y sin niños (P1) | `modules/ui/bloqueo-acceso.js` | `olvideMiPin()`, `PALABRA_BORRAR`, `intentarPin()` |
| Confirmación con palabra escrita | `modules/ui/confirm.js` | opción `palabra` |
| Bloque Familia y alta del niño (paso 1, PIN si falta) | `modules/dominio/config/familia.js`, `familia-view.js` | `initFamilia()`, `abrirAlta()`, `htmlFamilia()`, `htmlAltaNino()`, `htmlAltaPin()`, `data-action="familia-*"` |
| Candado obligatorio con niños | `modules/dominio/config/view.js` / `index.js` | `_renderBloqueo()`, `_quitarCandado()` |
| Lo que ve el niño | `modules/dominio/nino/` | `initNino()`, `htmlInicioNino()` |
| Dibujos, Frai, frasco y destellos | `modules/infra/ilustraciones.js` | `DIBUJOS`, `htmlDibujo()`, `htmlFrai()`, `htmlFrasco()`, `htmlDestellos()` |
| Markup | `index.html` | `#quien-usa`, `#modal-familia`, `#nino-app`, `#nino-main` |

**Recursos**: símbolos `il-frai-*`, `il-balon` a `il-patineta`, `il-frasco`, `il-frasco-borde` (`assets/svg/ilustraciones/`, ver su README 2.2). CSS: `styles/components/nino.css` (base visual y sección "PERFILES"); tokens del niño en `tokens.css` y `themes.css` (`body.kid`, `body.light-theme.kid`); fondo opaco del selector en `modals.css`.

**Dependencias y relaciones**: `entrarComo()` emite `perfil:cambio` (`{ id }`), que escuchan `ui/quien-usa.js` (piel) y `dominio/nino` (pinta). Entrar al adulto emite `bloqueo:abierto` (bootstrap.js encadena gate legal, novedades y débitos). "Agregar un niño" desde el selector emite `familia:agregar`, que abre el alta en config. Con niños, `bootstrap.js` llama `initPerfiles()` en vez de `initBloqueoAcceso()`. `modales.js` usa `#nino-app` como fondo inerte en el perfil niño.

**Riesgos**:

- **El perfil activo vive solo en memoria.** Guardarlo en `fk_v1` dejaría a un niño dentro del adulto al recargar; con niños, Finko siempre abre en el selector (D1).
- **El candado no cifra.** Quien abra `fk_v1` lee todos los perfiles; el selector y Ajustes lo dicen.
- **La piel se decide al aplicarse**, no al pedirse: con View Transitions el cambio corre un cuadro después y dos cambios seguidos pueden llegar en desorden.
- **El aviso de logro del adulto** se oculta mientras el candado o el selector están abiertos y en el perfil niño (`modals.css`, `nino.css`): es un dato del adulto.
- **Quitar el candado con niños** no se ofrece y el handler lo rechaza: primero hay que eliminar sus perfiles.

**Cambios pendientes**: el selector usa el campo de PIN de siempre, no el teclado numérico del diseño; el avatar de Inicio como atajo a Familia (D2) llega con APR.3e.

**Cambios realizados**:

- 2026-10-25 (APR.3a): perfiles (v48), "¿Quién usa Finko?", alta paso 1 con PIN obligatorio, Familia en Ajustes, P1.
- 2026-10-25 (APR.3b): `.kid` y sus tokens con AA medido, Frai, catálogo de dibujos y frasco en el sprite.
