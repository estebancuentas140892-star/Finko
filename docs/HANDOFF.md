# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-27. Última tarea cerrada: GAS.18, Día a día sin filtro y el ojo junto a la lupa.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 6585/6585 (2026-11-27, GAS.18) |
| Tests E2E | 667/667, 1 saltada por la fecha (2026-11-27, GAS.18, `--workers=2`); "dos dispositivos abiertos" de `nube.test.js` es intermitente. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v60 (tasas reparadas, GAS.14a) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO (producción, 2026-11-15; la primera corrida en frío da 91) |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **0** (BUG-027 cerrado el 2026-11-15). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**GAS.18 - Día a día sin filtro y el ojo junto a la lupa, 2026-11-27**
En el teléfono salen los chips de categoría (buscar es la lupa) y el ojo de cada pestaña pasa de la cifra a la cabecera ([ADR 205](DECISIONS/205-dia-a-dia-sin-filtro-y-el-ojo-junto-a-la-lupa.md)). SW v870.

**MOV.5 - Movimientos con la fila de Día a día, 2026-11-27**
En el teléfono, la fila de Día a día: la cifra arriba, el nombre a todo el ancho, qué es y la cuenta con su logo ([ADR 204](DECISIONS/204-movimientos-con-la-fila-de-dia-a-dia.md)). SW v869.

**SIT.2c - lo esencial en Inicio y Tu plan (cierra SIT.2), 2026-11-27**
"4 pagos más por $X" en un renglón con la flecha; Esta semana con teja de 44 y "Entra" y "Sale" en línea; Tu plan sin datos en una fila ([ADR 203](DECISIONS/203-lo-esencial-en-la-fila-el-resto-en-la-factura.md) D8 y D9). SW v868.

**SIT.2b - lo esencial en Fijos, Deudas y la factura del fijo, 2026-11-27**
Fijos sin "N pagos de $X", Deudas sin entidad ni día, el total sin barra vacía y la factura del fijo sin puntos suspensivos ([ADR 203](DECISIONS/203-lo-esencial-en-la-fila-el-resto-en-la-factura.md) D5 a D7). SW v867.

**SIT.2a - lo esencial en la fila de Día a día y en su factura, 2026-11-27**
La fila del gasto en 2 renglones (qué, cuánto, cuenta); "Pagar" de 30 px; la factura sin fecha repetida ([ADR 203](DECISIONS/203-lo-esencial-en-la-fila-el-resto-en-la-factura.md) D1 a D4). SW v866.

---

## 3. Qué sigue

- **Cada dato en su sitio** ([ADR 202](DECISIONS/202-cada-dato-en-su-sitio.md), [203](DECISIONS/203-lo-esencial-en-la-fila-el-resto-en-la-factura.md)): SIT.1 y SIT.2 aplicadas enteras; Movimientos ya usa la fila de Día a día en el teléfono ([ADR 204](DECISIONS/204-movimientos-con-la-fila-de-dia-a-dia.md)).
- **Movimientos y teléfonos** ([ADR 200](DECISIONS/200-movimientos-buscar-y-filtrar.md), [199](DECISIONS/199-inicio-gastos-y-movimientos-en-todos-los-telefonos.md)): lienzos aplicados. Falta TalkBack, `text-scale` en el Redmi al 115 % y la isla de un iPhone instalado.
- **Gastos, el lienzo** ([ADR 198](DECISIONS/198-gastos-accesibles.md)): El lienzo "Gastos · Rediseño integral" queda aplicado (GAS.13, GAS.15a a 15k, GAS.16 y GAS.17); falta un recorrido con TalkBack.
- **Gastos en el teléfono** ([ADR 182](DECISIONS/182-gastos-cada-cosa-con-su-forma-y-su-color.md)): GAS.8a a 8h cerradas; faltan las poses de Tino que entrega Esteban ([`board/gastos.md`](board/gastos.md)).
- **Iniciativa FORM.2** ([ADR 142](DECISIONS/142-formularios-por-tarea.md), formularios por tarea): **completa** (FORM.2a a 2h). Queda probarla en un iPhone real con REV.3b.
- **El tablero quedó en orden de valor** ([`BOARD.md`](BOARD.md), índice). Arriba: REV.3b (la app instalada con tus datos y la versión publicada, espera una prueba en un iPhone real; ahí se verifica también el campo sobre el teclado de REV.2b, y el número del ícono y los accesos directos de HF.3e); lo demás es de prioridad baja o espera algo. Lo que salió y por qué: [ADR 138](DECISIONS/138-la-poda-del-tablero-del-13-de-noviembre.md).
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)): HF.1b, HF.1d y HF.3e cerradas ([ADR 139](DECISIONS/139-la-naturaleza-de-un-gasto.md), [143](DECISIONS/143-todo-cambio-de-saldo-deja-registro.md), [144](DECISIONS/144-lo-que-finko-muestra-fuera-de-la-app.md)); HF.1c, HF.2a y HF.2b cerradas: la iniciativa queda sin tarjetas. Conectar el banco vive en NUBE.4, "no iniciar".
- **Iniciativa SUS** ([ADR 146](DECISIONS/146-finko-reconoce-el-tipo-de-gasto.md), hormiga, fantasma y vampiro sin preguntarlos): SUS.1a a SUS.1c y SUS.2 (2a a 2d) cerradas ([ADR 147](DECISIONS/147-gusto-o-necesidad-hormiga-sin-adivinar.md): hormiga es lo pequeño que es un gusto); sigue SUS.1d (vampiro, espera su superficie).
- **Iniciativa NUBE** ([ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md), Aceptada): NUBE.0 a NUBE.3 cerradas en `finko-prueba`. Invitar probadores pide SMTP propio en Supabase.
- **Iniciativa APR** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), solo del niño desde el [ADR 101](DECISIONS/101-finko-del-adulto-decide-no-ensena.md)): APR.5b cerrada (Tino, ronda 2, [095](DECISIONS/095-tino-en-el-sprite.md)); la revisión pedagógica es trabajo externo.
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
