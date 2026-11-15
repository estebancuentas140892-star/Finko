# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-15. Última tarea cerrada: SUS.2a, Mecato, subcategorías y "¿gusto o necesidad?". Nada en proceso.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 5762/5762 (2026-11-15, SUS.2a) |
| Tests E2E | 477/477 (2026-11-15, SUS.2a, `--workers=2`); "dos dispositivos abiertos" de `nube.test.js` es intermitente. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v52 (`subcategoriaId` y `caracter` en el gasto, SUS.2a) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO (producción, 2026-11-15; la primera corrida en frío da 91) |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **0** (BUG-027 cerrado el 2026-11-15). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**SUS.2a - Mecato, subcategorías y "¿gusto o necesidad?", 2026-11-15**
Cada gasto puede decir qué fue ("Helado") y cada categoría su carácter (necesidad, gusto o depende); en Otros se pregunta. Es la base para que hormiga deje de ser solo el monto ([ADR 147](DECISIONS/147-gusto-o-necesidad-hormiga-sin-adivinar.md)). SW v721.

**SUS.1b - el chip "Gastos hormiga" sale del formulario, 2026-11-15**
Hormiga es lo que Finko reconoce por monto: la categoría deja de ofrecerse y lo guardado se sigue leyendo; Límites remite a "Gastos pequeños" ([ADR 146](DECISIONS/146-finko-reconoce-el-tipo-de-gasto.md) D5). SW v720.

**SUS.1a - la plataforma de cada suscripción, 2026-11-15**
Al elegir Streaming, Suscripciones, Telefonía o Internet en un gasto fijo aparecen las plataformas con su logo; con una elegida el fijo se llama como ella y guarda `marcaId` (schema v51). Seis plataformas nuevas con iniciales. Nace la iniciativa SUS ([ADR 146](DECISIONS/146-finko-reconoce-el-tipo-de-gasto.md)). SW v719.

**APR.5b - la ronda 2 de Tino y los hitos del niño, 2026-11-15**
Cuatro poses nuevas en el sprite (pensando, reserva, sembrar, compartir), cada unidad con la suya, y dos hitos con destellos: la meta lograda y la ruta terminada. "Meta cumplida" no cabe en 16 KB (nota del [ADR 095](DECISIONS/095-tino-en-el-sprite.md)). SW v718.

**HF.1c - la fecha de cada aporte a metas y reservas, 2026-11-15**
Cada aporte deja su fila con fecha, monto y cuenta (schema v50) y sale en Movimientos; "Ya lo usé" registra lo usado como gasto sin tocar las cuentas ([ADR 145](DECISIONS/145-los-aportes-de-metas-y-reservas-tienen-fecha.md)). SW v717.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **Iniciativa FORM.2** ([ADR 142](DECISIONS/142-formularios-por-tarea.md), formularios por tarea): **completa** (FORM.2a a 2h). Queda probarla en un iPhone real con REV.3b.
- **El tablero quedó en orden de valor** ([`BOARD.md`](BOARD.md), índice). Arriba: REV.3b (la app instalada con tus datos y la versión publicada, espera una prueba en un iPhone real; ahí se verifica también el campo sobre el teclado de REV.2b, y el número del ícono y los accesos directos de HF.3e); lo demás es de prioridad baja o espera algo. Lo que salió y por qué: [ADR 138](DECISIONS/138-la-poda-del-tablero-del-13-de-noviembre.md).
- **MOV.1 cerrada** con 17 de 25 fichas: las fichas de `contexto/` que mandan algo "a la ficha 18" se leen con la tabla del ADR 138 D1.
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)): HF.1b, HF.1d y HF.3e cerradas ([ADR 139](DECISIONS/139-la-naturaleza-de-un-gasto.md), [143](DECISIONS/143-todo-cambio-de-saldo-deja-registro.md), [144](DECISIONS/144-lo-que-finko-muestra-fuera-de-la-app.md)); HF.1c, HF.2a y HF.2b cerradas: la iniciativa queda sin tarjetas. Conectar el banco vive en NUBE.4, "no iniciar".
- **Iniciativa SUS** ([ADR 146](DECISIONS/146-finko-reconoce-el-tipo-de-gasto.md), hormiga, fantasma y vampiro sin preguntarlos): SUS.1a, SUS.1b y SUS.2a cerradas ([ADR 147](DECISIONS/147-gusto-o-necesidad-hormiga-sin-adivinar.md): hormiga es lo pequeño que es un gusto); siguen SUS.2b a SUS.2d, SUS.1c (el aviso de varias plataformas) y SUS.1d (vampiro, espera su superficie).
- **Iniciativa NUBE** ([ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md), Aceptada): NUBE.0 a NUBE.3 cerradas en `finko-prueba`. Invitar probadores pide SMTP propio en Supabase.
- **Iniciativa APR** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), solo del niño desde el [ADR 101](DECISIONS/101-finko-del-adulto-decide-no-ensena.md)): APR.5b cerrada el 2026-11-15: Tino tiene su ronda 2 también en el niño ([095](DECISIONS/095-tino-en-el-sprite.md)). La revisión pedagógica de las lecciones es trabajo externo, fuera del tablero.
- **El adulto en el teléfono (MV2.3 y MV2.30)**: aplicado y publicado ([ADR 116](DECISIONS/116-lo-que-faltaba-del-canvas-primera-tanda.md) a [136](DECISIONS/136-ajustes-del-adulto-en-el-telefono.md)); `Diseño Finko/` vacía. Medido en producción con MV2.28 y PERF.16.
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
