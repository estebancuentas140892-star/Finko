# Registro de errores - Finko Claude

> Errores detectados durante el desarrollo, con toda la información necesaria para resolverlos sin tener que volver a buscar dónde están.
> Al solucionarse, el error se **elimina** de este archivo y el fix queda documentado en [`CHANGELOG.md`](CHANGELOG.md) con referencia al ID.
> Última actualización: 2026-07-04 (BUG-010 registrado).

---

## Cómo registrar un error

```markdown
### BUG-NNN - <título corto>
- Estado    : pendiente | en proceso | solucionado
- Prioridad : alta | media | baja
- Problema  : qué se ve mal, con pasos para reproducirlo
- Causa     : causa raíz, si ya se identificó (si no, "sin investigar")
- Archivo   : ruta completa desde la raíz del proyecto
- Función   : función, componente o módulo afectado
- Líneas    : rango aproximado
- Secciones : secciones de la app afectadas
```

Numerar `BUG-001`, `BUG-002`... de forma consecutiva y sin reutilizar números aunque un error se elimine.

---

## Pendientes

### BUG-010 - El bottom nav no respeta el safe area inferior de iOS
- Estado    : pendiente (se resuelve dentro de NAV.A2, ver [BOARD.md](BOARD.md))
- Prioridad : media
- Problema  : con la PWA instalada en un iPhone con home indicator (la app usa `viewport-fit=cover` + `apple-mobile-web-app-capable`), la barra de navegación inferior queda pegada al borde físico y la franja del sistema pisa los labels (Inicio, Gastos, Calendario, Más). Reproducir: instalar la PWA en un iPhone X o posterior y observar la barra inferior.
- Causa     : en el breakpoint móvil, `.sidebar` se fija abajo con `height: var(--fk-header-height)` (60px) sin sumar `env(safe-area-inset-bottom)`. Los nudges, toasts y el install banner sí lo compensan (`nudges.css`, `forms.css`, `config.css`); la barra principal no.
- Archivo   : styles/responsive.css
- Función   : media query `(max-width: 1023px)`, regla `.sidebar` (y `padding-bottom` de `.main-content`)
- Líneas    : 39-52 y 125
- Secciones : todas (navegación)
