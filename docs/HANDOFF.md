# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-13. Última tarea cerrada: la poda del tablero (ADR 138). Nada en proceso.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 5431/5431 (2026-11-13, ADR 134 tanda 4) |
| Tests E2E | 449/449 (2026-11-13, ADR 134 tanda 4, `--workers=2`); "dos dispositivos abiertos" de `nube.test.js` es intermitente. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v48 (`perfiles`, APR.3a) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **2**: BUG-027 (documental) y BUG-039 (renta suma el salario dos veces). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**La poda del tablero, 2026-11-13**
De 47 entradas a 17, en orden de valor; MOV.1 cierra con 17 de 25 fichas y HF queda en seis tarjetas ([ADR 138](DECISIONS/138-la-poda-del-tablero-del-13-de-noviembre.md)). Solo documentación.

**REV.1 - la revisión del 13 de noviembre, tanda 1, 2026-11-13**
"Agregar" según el chip de Por pagar, vacíos con botón, el logo, el aviso al instalar, botones redondos, Movimientos y Límites ([ADR 137](DECISIONS/137-revision-del-13-de-noviembre-tanda-1.md)). SW v694.

**MV2.30 Ajustes - el índice, las filas y la hoja de borrar; cierra MV2.30, 2026-11-13**
Grupos con tejas, el tema en la fila y "Guardar respaldo primero"; "rediseño5" borrado ([ADR 136](DECISIONS/136-ajustes-del-adulto-en-el-telefono.md)). SW v693.

**MV2.30 Mis cuentas tanda 4 - Me deben y sus hojas; cierra rediseño4, 2026-11-13**
Me deben en filas, la hoja del préstamo y "Me pagaron"; "rediseño4" borrado ([ADR 135](DECISIONS/135-mis-cuentas-y-me-deben-en-el-telefono.md) D7 y D8). SW v692.

**MV2.30 Mis cuentas tanda 3 - Distribuir, paso 1, 2026-11-13**
Paso 1 en pregunta con lo recomendado, filas de necesidades y "Siguiente: ahorro" ([ADR 135](DECISIONS/135-mis-cuentas-y-me-deben-en-el-telefono.md) D6). SW v691.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **El tablero quedó en orden de valor** ([`BOARD.md`](BOARD.md), índice). Arriba: HF.1b (la tarjeta y los abonos dejan de contar dos veces como gasto), REV.2a (Por pagar con los fijos), REV.3b (la app instalada con tus datos y la versión publicada, espera una prueba en un iPhone real) y REV.2b. Lo que salió y por qué: [ADR 138](DECISIONS/138-la-poda-del-tablero-del-13-de-noviembre.md).
- **MOV.1 cerrada** con 17 de 25 fichas: las fichas de `contexto/` que mandan algo "a la ficha 18" se leen con la tabla del ADR 138 D1.
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)): Fase 0 cerrada; seis tarjetas, ninguna bloqueada por MOV.1. Conectar el banco vive en NUBE.4, "no iniciar".
- **Iniciativa NUBE** ([ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md), Aceptada): NUBE.0 a NUBE.3 cerradas en `finko-prueba`. Invitar probadores pide SMTP propio en Supabase.
- **Iniciativa APR** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), solo del niño desde el [ADR 101](DECISIONS/101-finko-del-adulto-decide-no-ensena.md)): queda APR.5b (correr el conversor del [095](DECISIONS/095-tino-en-el-sprite.md) con los dibujos de la ronda 2). La revisión pedagógica de las lecciones es trabajo externo, fuera del tablero.
- **El adulto en el teléfono (MV2.3 y MV2.30)**: aplicado y publicado ([ADR 116](DECISIONS/116-lo-que-faltaba-del-canvas-primera-tanda.md) a [136](DECISIONS/136-ajustes-del-adulto-en-el-telefono.md)); `Diseño Finko/` vacía. Falta medirlo en producción (MV2.28).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
