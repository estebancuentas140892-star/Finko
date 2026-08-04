# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-03. Última tarea cerrada: GU.1a, auditoría del sistema de guía + revisión formal del ADR 016.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 3715/3715 verdes |
| Tests E2E | 255/255 verdes, corrida del 2026-08-02 (CFG.6, config.css + service-worker.js staged), **sin flaky**: el de IN.9c estaba causado por la cascada de entrada del dashboard (`cardIn` desliza cada celda desde `translateY(8px)` con 40ms de stagger y `boundingBox()` incluye el transform), y se cerró midiendo con `emulateMedia({ reducedMotion: 'reduce' })`. **Es compuerta** desde el 2026-07-30: el hook de pre-commit exige el sello de una corrida verde cuando el diff toca runtime. La huella se calcula sobre el **índice** (`git ls-files -s`), no sobre el árbol: hay que `git add` **antes** de sellar, o el propio `add` invalida el sello. **Ojo con sesiones paralelas sobre el mismo worktree**: el índice compartido puede invalidar el sello entre que se corre la suite y se commitea; `git reset HEAD -- archivo` + `git apply --cached parche.diff` separa hunks propios de ajenos cuando el mismo archivo cambia por dos sesiones a la vez, sin tocar el árbol de trabajo de la otra sesión (usado el 2026-08-02 en `infra/bolsas.js` y `tests/unit/analisis.test.js`, ARQ.1a vs. ARQ.1b) |
| Schema version (`localStorage`) | v32 (`config.ultimaVersionVista`, UPD.1; migración backfill al catálogo vigente) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **4**: ver [BUGS.md](BUGS.md). BUG-025 es el único con impacto en el uso diario, y necesita decisión antes de tocarlo; BUG-026 (la compactación del sidebar no se aplica) se decide dentro de INT.1b |

---

## 2. Últimas 5 tareas cerradas

**GU.1a - auditoría del sistema de guía + revisión formal del ADR 016, 2026-08-03**
Sin cambio de código. Inventario de las 17 secciones de dominio confirma el [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md) vigente sin desviaciones: las 11 secciones con banner de propósito quedaron limpias de código muerto de EP.1-EP.6, sin empty states que repitan el banner. Único hallazgo: Ahorro apila dos preguntas gancho (banner + hero) mientras el fondo está vacío, anotado para que **AH.5 D3** lo resuelva al rediseñar. Adelantada frente a la recomendación de esperar a las v2 grandes, por instrucción directa.

**AH.5b - el compromiso del fondo se pregunta y se mide en la frecuencia real de ingresos, 2026-08-02**
Ejecuta D4 del [ADR 049](DECISIONS/049-fondo-de-emergencia-v2.md): `frecuenciaPrincipalIngresos()` (ya esperaba este consumidor en `infra/vencimientos.js`, comentario de MC.13c) reemplaza el "mensual" asumido en el formulario y el medidor del compromiso de ahorro. Mensual queda byte a byte igual; Quincenal/Semanal/Diario ganan su propio rango calendario, nunca ventana móvil. El código entró en el commit `e7703f0` (INT.1a, sesión paralela) por una carrera del índice compartido durante `test:e2e`; este cierre solo pone la documentación al día.

**INT.1a - el contenido de escritorio se centra y Movimientos entra al sidebar, 2026-08-02**
Abre la iniciativa INT.1 ([ADR 059](DECISIONS/059-interfaz-de-escritorio.md), 8 rebanadas) por la de menor riesgo. `.section` gana `margin-inline: auto`: los 240px que quedaban pegados al borde derecho a 1920 (880 a 2560) pasan a repartirse. Movimientos era el único de los 14 destinos sin entrada en el sidebar de escritorio. Al verificar el handoff contra el código cayeron dos premisas suyas: **PI7 era falso** (`--fk-bg-glass` sí tiene valor claro, no bloqueaba nada) y nace **BUG-026**, la regla de emergencia del sidebar pierde la cascada en sus cuatro declaraciones.

**CFG.6 - pase de escritorio/tablet + tema claro en Ajustes, 2026-08-02**
"Instalar Finko" y "Activar recordatorios" vivían sueltos dentro de `.config-section` (flex column, stretch por defecto) y se estiraban a 932px en escritorio (1280px) y 660px en tablet (768px); el pase 2026-07-25 solo había corregido `.config-form`/`.config-danger` y los pares de `.config-actions--ambito`. Nueva regla `.config-section > .btn { align-self: flex-start; min-width: 160px; }`, mismo patrón que "Guardar perfil". Tema claro revisado por código (100% `var(--fk-*)`), sin captura real. Sigue abierto el inventario de configs faltantes (punto 1), depende de CFG.1 a CFG.5.

**IN.9e - estado vacío propio de escritorio, cierra IN.9, 2026-08-02**
`.hero-guia__escritorio` nueva: pieza centrada de 620px con tres pasos, junto a `.hero-guia__movil` intacta; la CSS decide cuál se ve por ancho. Copy provisional (PI5). Código ya en el árbol desde `ab8c9a1` (sesión paralela); este cierre verifica y pone el tablero al día.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
