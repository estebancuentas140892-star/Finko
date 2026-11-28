# ADR 206 - Lo de hoy en tarjetas (Día a día, teléfono)

**Estado:** Aceptada y aplicada el 2026-11-27 (GAS.19).
**Fecha:** 2026-11-27
**Autores:** el pedido de Esteban ("apliquemos este cambio en el apartado específico que es hoy de día a día en la sección gastos"), con la propuesta `Propuestas Cambios de Diseño SVG/Gastos de hoy en Nequi.svg` (fuera del repo); Claude Opus 5.5 (implementación)
**Relación:** **Cambia**, solo para el grupo "Hoy" de Día a día bajo 1024 px, el [ADR 203](203-lo-esencial-en-la-fila-el-resto-en-la-factura.md) D2 (la cifra arriba a la derecha, junto al primer renglón del nombre, que viene del [ADR 202](202-cada-dato-en-su-sitio.md) D1) y la regla de MV2.1 ([ADR 098](098-finko-movil-2-primera-entrega.md)) de juntar las filas de un día en una sola superficie con separadores. Los demás días, Movimientos ([ADR 204](204-movimientos-con-la-fila-de-dia-a-dia.md)) y escritorio no cambian.

---

## Contexto

La propuesta dibuja lo de hoy en Nequi: "Hoy, viernes 27" grande con el total del día en una pastilla coral, y debajo una tarjeta por gasto. En cada tarjeta, la teja grande de la categoría, una raya vertical, el nombre en negrita a todo el ancho y, bajo una raya, el logo y el nombre de la cuenta a la izquierda y la cifra en verde con su flecha a la derecha. El pedido nombra un apartado: lo de hoy. Los demás días siguen con la fila de SIT.2a, más compacta, que sirve para recorrer el mes.

## Decisión

### D1. El rótulo de hoy y su total en pastilla

"Hoy, viernes 27" en 1,25 rem y extranegrita. El total del día va en una pastilla coral (el coral de Gastos al 25 % sobre el fondo de la app), con la cifra en extranegrita y en el verde bosque profundo en el tema claro; en el oscuro, en el color del texto. Va pegada al borde derecho de las tarjetas.

### D2. Una tarjeta por gasto

Lo de hoy deja la superficie única con separadores: cada gasto es su tarjeta (radio de 18, borde y sombra de reposo, 8 px entre una y otra). "N gastos más de hoy", si lo hay, es otra tarjeta igual.

### D3. La teja de 52 y la raya vertical

La teja de la categoría mide 52 px (su glifo, 28) y va al centro de la tarjeta; una raya de 1 px la separa de los textos.

### D4. El nombre arriba; la cuenta y la cifra debajo

El nombre va solo en su renglón, en negrita y a todo el ancho de la columna. Debajo de una raya, el renglón de la cuenta (logo de 18 y nombre, como en SIT.2a) y, a la derecha, la cifra (1 rem, extranegrita, verde bosque profundo en el claro) con su flecha. Sin cuenta, el renglón lleva solo la cifra. El botón de la tarjeta dice lo mismo que el de la fila.

## Ajustes al aplicar

- **La propuesta mide a 390 px y con una cuenta corta (Nequi).** Se midió también 320, 360, 393 y 430 px, con la letra al 100 y al 115 %. Dos ajustes para que nada se parta en cinco renglones junto a la cifra:
  - **Cuenta larga**: si el renglón de la cuenta pasa de 24 letras ("Davivienda Cuenta de Nómina Empresarial Ahorros"), usa todo el ancho y la cifra baja a su renglón, a la derecha (`fila__pie--apilada`, lo decide la vista).
  - **Columna angosta**: si la columna de textos mide menos de 13 rem (320 px, o 360 con la letra al 115 %), pasa lo mismo con cualquier cuenta (consulta de contenedor `tarjeta-hoy`).
- **El rótulo no se parte tras "Hoy,"**: si "Hoy, miércoles 25" y la pastilla no caben en un renglón, la pastilla baja, a la derecha.
- **El color de la cifra**: el SVG la pinta en un verde casi negro; se usa `--fk-brand-bosque-3`, que es ese verde en la paleta (contraste de más de 10:1 sobre blanco y sobre la pastilla).
- **La letra y los íconos son los de Finko**, no los del SVG (Plus Jakarta Sans e Inter, el sprite de categorías).

## Alternativas descartadas

- **Tarjetas en todos los días del mes**: el pedido nombra lo de hoy, y la tarjeta pasa de 64 a 81 px por gasto; un mes de gastos sería mucho más largo de recorrer.
- **La cifra arriba a la derecha, como en SIT.2a**: la propuesta la lleva junto a la cuenta, y así el nombre usa todo el ancho.
- **Decidir la cuenta larga solo con la consulta de contenedor**: con letra al 115 % en el Redmi (393 px) la columna mide más de 13 rem y la cuenta larga se partía en cinco renglones junto a la cifra.

## Consecuencias

- Lo de hoy se lee primero y aparte del resto del mes; los demás días no cambian.
- `cada-dato.test.js` ya no mide la alineación de la cifra en las tarjetas de hoy (su cifra no está junto al nombre); la mide en los demás días.
- Pruebas: unitarias de la tarjeta (nombre primero, pie con cuenta y cifra, cuenta larga apilada, sin cuenta, la pastilla) y de la fila de los otros días sin tarjeta; E2E de la tarjeta a 320, 360, 393 y 430 px (teja de 52, nada fuera de la tarjeta, cuenta y cifra sin montarse, pastilla en un renglón) y de su alto.
