# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-15. Última tarea cerrada: FORM.2h, cierra la iniciativa FORM.2 (formularios por tarea). Nada en proceso.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 5582/5582 (2026-11-15, FORM.2h) |
| Tests E2E | 472/472 (2026-11-15, FORM.2h, `--workers=2`); "dos dispositivos abiertos" de `nube.test.js` es intermitente. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v48 (`perfiles`, APR.3a) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **1**: BUG-027 (documental). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**FORM.2h - Ajustes con mini-hojas, Tino, la tasa alta en ámbar y el banco con buscador, 2026-11-15**
Cierra FORM.2 ([ADR 142](DECISIONS/142-formularios-por-tarea.md)): "Tu perfil" como lista con mini-hojas, la tasa muy alta avisa sin bloquear, Tino explica la tasa y piensa en "Primero necesitas una cuenta", y el banco se busca. SW v708.

**FORM.2d - la ficha del gasto es su formulario, 2026-11-14**
En el teléfono, tocar un gasto abre su recibo: cada dato se cambia en su mini-hoja, se guarda solo y se deshace; eliminar al pie ([ADR 142](DECISIONS/142-formularios-por-tarea.md) D6). SW v706.

**FORM.2g - el resto de crear y los controles de Finko en todos los formularios, 2026-11-14**
Reserva, préstamo, inversión y límite por preguntas; ningún formulario del teléfono muestra un selector del sistema, y una prueba lo vigila ([ADR 142](DECISIONS/142-formularios-por-tarea.md) D2 y D5). SW v705.

**FORM.2f - cuenta, ingreso fijo, gasto fijo y meta por preguntas, 2026-11-14**
Los cuatro van de a una pregunta con su resumen y "Agrega si quieres"; editar abre en el resumen ([ADR 142](DECISIONS/142-formularios-por-tarea.md) D5). SW v704.

**FORM.2e - crear por preguntas y Nueva deuda, 2026-11-14**
Una pregunta por pantalla con progreso, resumen editable y "Agrega si quieres" (`ui/preguntas.js`); Nueva deuda en seis preguntas ([ADR 142](DECISIONS/142-formularios-por-tarea.md) D5). SW v703.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **Iniciativa FORM.2** ([ADR 142](DECISIONS/142-formularios-por-tarea.md), formularios por tarea): **completa** (FORM.2a a 2h). Queda probarla en un iPhone real con REV.3b.
- **El tablero quedó en orden de valor** ([`BOARD.md`](BOARD.md), índice). Arriba: REV.3b (la app instalada con tus datos y la versión publicada, espera una prueba en un iPhone real; ahí se verifica también el campo sobre el teclado de REV.2b), HF.1d y HF.3e. Lo que salió y por qué: [ADR 138](DECISIONS/138-la-poda-del-tablero-del-13-de-noviembre.md).
- **MOV.1 cerrada** con 17 de 25 fichas: las fichas de `contexto/` que mandan algo "a la ficha 18" se leen con la tabla del ADR 138 D1.
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)): Fase 0 cerrada; HF.1b cerrada (ADR 139); quedan cinco tarjetas, ninguna bloqueada. Conectar el banco vive en NUBE.4, "no iniciar".
- **Iniciativa NUBE** ([ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md), Aceptada): NUBE.0 a NUBE.3 cerradas en `finko-prueba`. Invitar probadores pide SMTP propio en Supabase.
- **Iniciativa APR** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), solo del niño desde el [ADR 101](DECISIONS/101-finko-del-adulto-decide-no-ensena.md)): queda APR.5b (correr el conversor del [095](DECISIONS/095-tino-en-el-sprite.md) con los dibujos de la ronda 2). La revisión pedagógica de las lecciones es trabajo externo, fuera del tablero.
- **El adulto en el teléfono (MV2.3 y MV2.30)**: aplicado y publicado ([ADR 116](DECISIONS/116-lo-que-faltaba-del-canvas-primera-tanda.md) a [136](DECISIONS/136-ajustes-del-adulto-en-el-telefono.md)); `Diseño Finko/` vacía. Falta medirlo en producción (MV2.28).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
