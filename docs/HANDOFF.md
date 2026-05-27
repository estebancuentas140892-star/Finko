# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente ía o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-05-27 (v7.2: recomendación como subtítulo interno, no sticker flotante)

**Producción:** https://finko-brown.vercel.app
**Repositorio:** https://github.com/estebancuentas140892-star/Finko

---

## 1. Qué es Finko

PWA offline-first de gestión financiera personal para Colombia.
Vanilla JS puro + ES6 modules. Sin framework, sin build step, sin servidor, sin cuenta.
Todo vive en `localStorage` (clave `fk_v1`). Pensada para personas con poco conocimiento
financiero: lenguaje simple, normativa colombiana (SMMLV, UVT, tasa de usura, GMF).

**Versión actual:** `v1.0.0` - todas las 14 fases originales completadas y cerradas.
**Rama principal:** `main`.

---

## 2. Estado técnico actual

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 932/932 verdes |
| Tests E2E | 18/18 humo + suite completa |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### style(compromisos) - v7.2: recomendación como subtítulo interno · 2026-05-27
Feedback visual del usuario: el badge "✨ Recomendada para vos" parecía un sticker pegado encima del borde superior de la card, no formaba parte del diseño.

**Cambios clave:**
- Eliminado `.estrategia-card-pick__badge` con posicionamiento `absolute` flotando fuera del borde.
- Nuevo `.estrategia-card-pick__sub`: texto verde semibold como subtítulo interno bajo el nombre, sin fondo ni borde. La indicación queda integrada al flujo natural de la card.
- Las cards no recomendadas usan `.estrategia-card-pick__sub--ghost` con `visibility: hidden` para reservar la misma altura, así ambas cards alinean perfectamente en el grid (verificado: 112.77px = 112.77px).
- **`service-worker.js`:** v68 → v69.

**Archivos:** `modules/dominio/compromisos/view.js`, `styles/components.css`, `service-worker.js`.

**Tests:** 932/932 verdes (UI pura).

### refactor(compromisos) - v7.1: contraste de badge + métricas específicas por estrategia · 2026-05-27
Tres bugs reportados por el usuario sobre el rediseño de "Estrategia de pago":

**Cambios clave:**
- **Badge "Recomendada para vos" ilegible:** causa raíz, `var(--fk-bg)` no existe en los tokens del proyecto (se cae al heredado, por eso en dark salía blanco y en light salía negro). Reemplazado por el patrón estándar de chips de éxito: `background: var(--fk-success-bg)` + `color: var(--fk-success-text)` + borde sutil `color-mix(--fk-success 40%, transparent)`. Ahora es un chip outline-style legible en ambos temas, sin saturación neón.
- **Mismo bug en mi código nuevo:** corregí 7 más usos de `var(--fk-bg)` / `var(--fk-text)` / `var(--fk-border)` (que tampoco existen) por sus equivalentes correctos: `--fk-bg-surface`, `--fk-text-primary`, `--fk-border-default`. Tokens pre-existentes con el mismo bug latente quedan fuera de scope (bugs separados).
- **Métricas mezcladas entre estrategias:** ahora cada una muestra solo lo que le corresponde:
  - **Avalancha:** "Libre de deudas en X" + "Total que pagás en intereses $Y" + (si extra > 0) "Te ahorrás respecto a Bola de nieve $Z" en verde.
  - **Bola de nieve:** "Cerrás tu primera deuda en X meses" (con nombre de la deuda como tip) + (si ≥3 deudas) "Después de Y solo te queda N deuda" + "Libre de deudas en T". **Nunca muestra intereses** porque no es lo que esta estrategia optimiza (lo señaló el usuario explícitamente como ruido).
- **Estructura unificada en 3 bloques:** cada estrategia se presenta con `🎯 Qué te ofrece` (beneficio principal) + `📊 Tu impacto` (métricas) + `👤 Ideal si...` (perfil de usuario). Render uniforme entre ambas, contenido distinto.
- **`service-worker.js`:** v67 → v68.

**Archivos:** `modules/dominio/compromisos/view.js` (nuevos `_renderImpactoAvalancha`, `_renderImpactoBolaNieve`, `_META_ESTRATEGIA` reformulado), `styles/components.css` (fix de tokens + nuevos `.estrategia-card__bloque*` y `.estrategia-card__metrica*`, removidos `.estrategia-card__desc/ideal/hero*`), `service-worker.js`.

**Tests:** 932/932 verdes (UI pura, sin lógica nueva).

### chore(infra) - Service worker deshabilitado en desarrollo · 2026-05-27
El SW estaba cacheando assets viejos en localhost; mientras iterábamos CSS/JS el usuario veía la página "rota" (CSS viejo + HTML nuevo) y debía hacer Ctrl+Shift+R cada vez. Solución estándar: no registrar el SW en hostnames de desarrollo.

**Cambios clave:**
- **`modules/infra/sw-register.js`:** detecta `localhost`, `127.0.0.1`, `0.0.0.0`, `*.local`, `192.168.*`, `10.*`. Si estamos en dev: desregistra cualquier SW existente, borra todos los `caches`, y NO registra uno nuevo. En producción el comportamiento queda igual (offline-first con auto-recarga en `controllerchange`).
- **`service-worker.js`:** v66 → v67 por consistencia (no afecta dev; necesario para que los clientes de producción se actualicen al próximo deploy).

**Migración para el usuario (una sola vez):** después de este cambio se necesita un último Ctrl+Shift+R para que el browser cargue el `sw-register.js` nuevo. De ahí en adelante, los reloads normales (F5) sirven todo de red y los cambios se ven al instante.

**Archivos:** `modules/infra/sw-register.js`, `service-worker.js`.

**Tests:** 932/932 verdes (sin cambios de lógica).

### refactor(compromisos) - Estrategia de pago como cards + recomendación + acordeón · 2026-05-27
Rediseño UX completo de la card "Estrategia de pago" para móvil, en dos pasadas. Cierra el feedback del usuario: la sección saturaba con métricas que no informaban, y el input del extra era funcionalidad oculta que pocos descubrían.

**Cambios clave:**
- **Header simple:** "💡 Estrategia de pago" + "Finko te ayuda a tomar mejores decisiones con tus deudas."
- **Dos cards seleccionables** (Avalancha / Bola de nieve) con badge "✨ Recomendada para vos" en la que corresponde según heurística.
- **Detalle dinámico** debajo de las cards al elegir una: descripción + uso ideal + razón de la recomendación (solo si es la recomendada) + métrica hero "Libre de deudas en X" + intereses totales.
- **Nuevo `recomendarEstrategia(deudas)` puro en `logic.js`:** 0/1 deuda → `null`. Todas con tasa 0 → Bola de nieve. Diferencia tasaMax-tasaMin ≥ 5 pts EA → Avalancha. Resto → Bola de nieve. Tolerante a punto flotante (redondea a 2 decimales antes de comparar).
- **Acordeón opcional "💪 ¿Podés pagar algo extra cada mes?"** colapsado por defecto. Al expandirse muestra input + descripción + cierre con `✕`. Auto-focus al input al abrir. Persiste extra durante la sesión.
- **Helper `_formatearDuracion`:** ≥12 meses se muestra como "X años Y meses" respetando singulares.
- **Comparación de ahorro vacía si empate:** se eliminó el mensaje confuso "ambas estrategias dan el mismo resultado".
- **`service-worker.js`:** v64 → v66.

**Educación financiera:** la lógica Avalancha sigue priorizando por **tasa**, no por interés absoluto en pesos. Es matemáticamente óptima por el efecto cascada (cuando la deuda chica de alta tasa se cierra rápido, todo el flujo libera hacia las demás). Esto se explicó al usuario con su propio ejemplo numérico y se mantiene como práctica estándar.

**Archivos:** `compromisos/view.js`, `compromisos/logic.js` (`recomendarEstrategia`), `compromisos/index.js` (handler + acción `toggle-extra-estrategia`), `styles/components.css`, `service-worker.js`, `tests/unit/compromisos.test.js` (+6 tests).

**Tests:** 932/932 verdes (+6).

### fix(compromisos) - Wording neutro + estética del chooser · 2026-05-27
Hotfix sobre el chooser de Tarea 3.

**Cambios clave:**
- **Wording:** "gota a gota" → "natillera o prestamista particular" en chooser, placeholder y hint del form personal. Motivo: "gota a gota" tiene connotación ilegal; las tasas 5-20% mensual aplican a varios tipos de prestamistas informales.
- **CSS arreglado:** el CSS anterior usaba tokens inexistentes (`--fk-surface-2`, `--fk-font-size-*`, `--fk-border` sin sufijo). Los estilos se ignoraban silenciosamente y las cards se veían "sueltas". Reescrito con tokens reales (`--fk-bg-elevated`, `--fk-text-*`, `--fk-border-default`, `--fk-radius-lg`, `--fk-shadow-*`, `--fk-accent-subtle`) + ícono dentro de círculo verde, hover con translateY/shadow-glow, layout responsive (apilado <480px).
- **`service-worker.js`:** v63 → v64.

**Archivos:** `compromisos/view.js`, `styles/components.css`, `service-worker.js`.

**Tests:** 926/926 verdes.

> Para tareas anteriores, ver [`docs/CHANGELOG.md`](CHANGELOG.md).

---

## 4. Qué sigue (roadmap post-v1.0)

**Estado actual:** App completa, en producción estable (`https://finko-brown.vercel.app`). Todas las features v1.0 + post-v1.0 están implementadas. **Modo mantenimiento.**

> **Importante para futuros desarrolladores:** Antes de instalar dependencias o configurar
> un nuevo entorno, leer [`docs/SECURITY.md`](SECURITY.md). Incluye política anti-malware npm,
> guía de migración a **pnpm** con defensas (`minimum-release-age`, `only-built-dependencies`),
> y el audit de seguridad realizado el 2026-05-18.

Tareas opcionales restantes:

| Prioridad | Tarea | Cuándo | Nivel |
|---|---|---|---|
| 1 | **A.5 - Dominio custom** (opcional) | Cuando el usuario tenga dominio registrado | Guía lista en [`docs/SETUP_DOMINIO.md`](SETUP_DOMINIO.md) |
| 2 | **E.2 - SMMLV + UVT** (anual) | **Enero 2027** - buscar nuevos valores Mintrabajo (SMMLV) + DIAN (UVT), actualizar `modules/core/constants.js` | ~15 min, Haiku |
| 3 | **E.3 - GMF + reforma** (demanda) | Si hay reforma tributaria - verificar cambios en GMF | Ad-hoc |

### ⏰ Recordatorio enero 2027 - E.2

**Qué hacer:**
1. 👉 Visita [DIAN UVT](https://www.dian.gov.co/) y [Mintrabajo SMMLV](https://www.mintrabajo.gov.co/)
2. Obtén los valores vigentes para 2027
3. Actualiza en `modules/core/constants.js`:
   ```javascript
   export const SMMLV_2027 = <nuevo_valor>;
   export const UVT_2027 = <nuevo_valor>;
   ```
4. Cambia las referencias de `_2026` a `_2027` en `constants.js`
5. Tests (`npm test` → 596/596 verdes)
6. Commit: `feat(E.2): actualizar SMMLV 2027 + UVT 2027`
7. Push a main → auto-deploy a producción

**Archivo:** Escribe tu `Próximo paso` con modelo **Haiku 4.5** (búsqueda + cambio mecánico).

---

## 5. Cómo trabajamos (workflow)

- **Una tarea a la vez.** No se empieza la siguiente sin verificar en la app y commitear.
- **Al cerrar cada tarea:** actualizar este archivo (HANDOFF.md) + CHANGELOG.md; eliminar de ROADMAP.md y TASKS.md.
- **Al final de cada respuesta:** bloque `─── Próximo paso ───` con modelo sugerido + nivel.
- **Modelos permitidos:** `Haiku 4.5` (sin nivel) · `Sonnet 4.6 - Bajo/Medio/Alto` · `Opus 4.7 - Bajo/Medio/Alto/Extra Alto/Max`.
- **Regla de oro:** calidad del código primero, ahorro de tokens segundo.
- Workflow completo en [`/CLAUDE.md`](../CLAUDE.md) sección 2.

---

## 6. Arquitectura en una línea por capa

```
core/        → state.js (singleton S), storage.js (save debounced), constants.js (CO legales)
infra/       → utils, render, a11y, crud, router, csv, svg, notificaciones
ui/          → bootstrap (entry point), shell, actions (delegación data-action), modales, onboarding
dominio/     → ingresos, gastos, compromisos, tesoreria, metas, analisis,
               calculadoras, config, import, export
tests/unit/  → lógica pura (Vitest + happy-dom) - 521 tests
tests/e2e/   → smoke tests (Playwright) - 18 tests
```

Regla clave: **ningún dominio importa a otro** - comunicación exclusiva por `EventBus`.
Todo `logic.js` es sin DOM (testeable en Node). Todo `view.js` solo lee `S`, no lo muta.

---

## 7. Comandos rápidos

```bash
python -m http.server 8080   # Servir la app (ES6 modules requieren HTTP)
pnpm test                     # 596 tests unitarios + integración
pnpm run test:e2e             # 18 smoke tests Playwright
pnpm run coverage             # umbral 90% capa lógica
pnpm run lighthouse           # requiere servidor en :8080
```
