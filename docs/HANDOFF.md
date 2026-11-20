# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-19. Última tarea cerrada: GAS.10f, cuándo y la factura del fijo.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 6379/6379 (2026-11-19, GAS.10f) |
| Tests E2E | 582/582 (2026-11-19, GAS.10f, `--workers=2`); "dos dispositivos abiertos" de `nube.test.js` es intermitente. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v58 (las categorías para Colombia, GAS.10b) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO (producción, 2026-11-15; la primera corrida en frío da 91) |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **0** (BUG-027 cerrado el 2026-11-15). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**GAS.10f - cuándo y la factura del fijo, 2026-11-19**
Cuándo en una pantalla sin títulos, "Otra" con cuatro chips, y la factura del fijo como la del gasto, con el débito, Para pagar y la nota en línea ([ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D7). SW v822.

**GAS.10e - el gasto fijo, qué es, empresa y sin empresa, 2026-11-19**
El gasto fijo sin "Pagas $X" ni títulos en Qué es y la empresa; los logos por grupo, cuatro por fila, y "Sin empresa" abre "Nombre del servicio" ([ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D6). SW v821.

**GAS.10d - la factura sin desplazar y la nota aparte, 2026-11-19**
La factura del gasto como el tablero: la cifra con COP al lado, "Detalle", lo que queda junto a la cuenta y la nota en una línea con su hoja aparte; cabe en 375 x 667 ([ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D5). SW v820.

**GAS.10c - Nuevo gasto por áreas y la pregunta adentro, 2026-11-19**
Nuevo gasto en el teléfono: la categoría por áreas, cada ícono en su tono, y el detalle con la categoría arriba y "Necesidad" y "Deseo" dentro de la opción que lo pide ([ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D4). SW v819.

**GAS.10b - categorías para Colombia, 2026-11-19**
Mecato pasa a Antojos, nace Carro o moto y Arreglos se une a Ferretería y arreglos; la migración v58 lleva lo guardado ([ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D3). SW v818.

---

## 3. Qué sigue

- **Gastos móvil, cada lugar con una función** ([ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md)): GAS.10a a 10f cerradas; sigue GAS.10g ([`board/gastos.md`](board/gastos.md)).
- **Gastos en el teléfono** ([ADR 182](DECISIONS/182-gastos-cada-cosa-con-su-forma-y-su-color.md)): GAS.8a a 8h cerradas; faltan las poses de Tino que entrega Esteban ([`board/gastos.md`](board/gastos.md)).
- **Revisión de servicios, categorías y movimientos** (ADR 169 a 175): completa (AVC.1, MC.19, PAG.1, GAS.6, MK.3, MC.20 y AH.9).
- **Iniciativa FORM.2** ([ADR 142](DECISIONS/142-formularios-por-tarea.md), formularios por tarea): **completa** (FORM.2a a 2h). Queda probarla en un iPhone real con REV.3b.
- **El tablero quedó en orden de valor** ([`BOARD.md`](BOARD.md), índice). Arriba: REV.3b (la app instalada con tus datos y la versión publicada, espera una prueba en un iPhone real; ahí se verifica también el campo sobre el teclado de REV.2b, y el número del ícono y los accesos directos de HF.3e); lo demás es de prioridad baja o espera algo. Lo que salió y por qué: [ADR 138](DECISIONS/138-la-poda-del-tablero-del-13-de-noviembre.md).
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)): HF.1b, HF.1d y HF.3e cerradas ([ADR 139](DECISIONS/139-la-naturaleza-de-un-gasto.md), [143](DECISIONS/143-todo-cambio-de-saldo-deja-registro.md), [144](DECISIONS/144-lo-que-finko-muestra-fuera-de-la-app.md)); HF.1c, HF.2a y HF.2b cerradas: la iniciativa queda sin tarjetas. Conectar el banco vive en NUBE.4, "no iniciar".
- **Iniciativa SUS** ([ADR 146](DECISIONS/146-finko-reconoce-el-tipo-de-gasto.md), hormiga, fantasma y vampiro sin preguntarlos): SUS.1a a SUS.1c y SUS.2 (2a a 2d) cerradas ([ADR 147](DECISIONS/147-gusto-o-necesidad-hormiga-sin-adivinar.md): hormiga es lo pequeño que es un gusto); sigue SUS.1d (vampiro, espera su superficie).
- **Iniciativa NUBE** ([ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md), Aceptada): NUBE.0 a NUBE.3 cerradas en `finko-prueba`. Invitar probadores pide SMTP propio en Supabase.
- **Iniciativa APR** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), solo del niño desde el [ADR 101](DECISIONS/101-finko-del-adulto-decide-no-ensena.md)): APR.5b cerrada el 2026-11-15: Tino tiene su ronda 2 también en el niño ([095](DECISIONS/095-tino-en-el-sprite.md)). La revisión pedagógica de las lecciones es trabajo externo, fuera del tablero.
- **El adulto en el teléfono (MV2.3 y MV2.30)**: aplicado y publicado ([ADR 116](DECISIONS/116-lo-que-faltaba-del-canvas-primera-tanda.md) a [136](DECISIONS/136-ajustes-del-adulto-en-el-telefono.md)); `Diseño Finko/` vacía. Medido en producción con MV2.28 y PERF.16.
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
