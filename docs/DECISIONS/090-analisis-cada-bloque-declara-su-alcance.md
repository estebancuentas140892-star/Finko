# ADR 090 - Análisis: la salida prefiltrada, y los cinco veredictos de la ficha

**Estado:** Aceptada. Ficha 16 de la auditoría móvil (MOV.1), cerrada el 2026-08-21.
**Fecha:** 2026-08-21
**Autores:** Esteban (producto), Claude Design (auditoría), Claude Opus 5 (análisis e implementación)
**Relación:** cierra la ficha 16 de MOV.1 sobre el dominio `analisis`. **Documenta que sus dos cambios grandes ya estaban en el código**: los implementó **ANL.3** el 2026-08-11 (commit `3ca44ed`), diez días antes de que llegara el turno de la ficha. **Usa el patrón de acceso contextual prefiltrado** de la ficha 07 ([ADR 069](069-bloque-gastos-en-la-barra-movil.md) D8) con el reparto de chip que fijó el [ADR 081](081-calendario-la-forma-del-mes-entradas-incluidas.md). **Cierra la pregunta abierta del [ADR 085](085-limites-la-lente-contiene-limites.md)** (ficha 12) y **acota la candidata R90** del [ADR 088](088-me-deben-urgencia-de-cobro-y-direccion-con-forma.md) y del [ADR 089](089-movimientos-la-quinta-fuente-y-cuatro-puertas.md) D5. **No toca** ninguna fórmula, ningún gráfico ni el monitor de renta.

---

## Contexto

Análisis es la única capa que importa de varios dominios, y lo hace a propósito y documentado: su cabecera declara que "el análisis es inherentemente cross-domain; centralizar aquí evita que los dominios se importen entre sí". Es de solo lectura, no muta `S` y no toca el EventBus. La lista de "mantener" de la ficha es la más larga de la serie.

La ficha levantó tres hallazgos, y al verificarlos contra el código **dos ya estaban resueltos**:

| Id | Hallazgo | Estado al llegar la ficha |
|---|---|---|
| Z1 | El chip declara un mes y solo uno de los cinco bloques mide un mes | **Resuelto** por ANL.3 (2026-08-11) |
| Z2 | "Por cobrar" es un porcentaje y no dice que excluye préstamos sin cuenta | **Resuelto** por ANL.3 |
| Z3 | El aviso de deudas sin saldo enlaza a "Compromisos", que dejó de ser destino móvil | **A medias**: el rótulo ya decía "Por pagar", el prefiltro faltaba |

ANL.3 se llama, literalmente, "cada bloque declara su propio alcance": movió el chip del header al rótulo del grupo "A dónde va tu dinero", puso "hoy" en el patrimonio, dejó "Tendencia, últimos N meses" en la tarjeta de tendencia, y añadió `calcularPrestamosSinCuenta()` con su aviso condicional. Verificado en el código y en la app antes de escribir nada: no había trabajo pendiente ahí.

Lo que sí faltaba es **la mitad del Z3**: el enlace seguía siendo un `href="#compromisos"` pelado, sin el chip que la ficha pedía.

---

## Decisión

### D1. El aviso de deudas sin saldo sale prefiltrado, y concuerda en singular

`calcularPasivos()` devuelve además `deudaSinSaldoId` (la primera sin saldo) y el aviso lleva `data-action="analisis-completar-deuda"`, que emite `porPagar:ver-compromiso`. Es el **cuarto consumidor** del acceso contextual prefiltrado, tras las fichas 06, 08 y 15.

Tres detalles:

- **Nombra el compromiso, no el chip.** El handler destino decide la taxonomía a partir del tipo del compromiso, que es la regla que su propia documentación escribe y que el ADR 081 fijó: quien sale sabe de qué deuda habla, no de cómo se filtra la otra pantalla. Con varias sin saldo se manda la primera: el chip abre el grupo entero y la tarjeta a la que se desplaza es una de las que hay que completar.
- **Sigue siendo un enlace `<a>`, no un botón.** Lo que hace es navegar; el `data-action` solo le añade el chip y el desplazamiento (`dispatch()` hace `preventDefault()`, así que la navegación la ejecuta el handler destino). Sin id conocido cae al enlace pelado, que es lo que había: mejor la lente entera que ninguna salida.
- **La frase concuerda.** Decía "Tienes 1 deuda sin saldo registrado. **Complétalas** en Por pagar": el plural estaba fijo. Es la misma frase que este cambio toca y el mock de la ficha la escribe en singular.

### D2. R88 encuentra su segundo caso. Se recomienda confirmarla en la ficha 18

Era su última oportunidad: la ficha 12 examinó su candidato y lo descartó con razón. Acá aparece sin buscarla, y es **la otra cara del primer caso**: en Calendario el resumen medía menos de lo que la vista dibujaba (solo salidas, sobre un grid con entradas); en Análisis el encabezado declaraba menos alcance del que la vista abarca (un mes, sobre cinco periodos).

**Redacción ampliada que se propone a la 18:** *lo que encabeza una vista describe lo que hay debajo: su conjunto y su periodo.* Si el encabezado abarca menos que la vista, el usuario aplica su alcance a todo lo demás. Se distingue de R82 (que exige que una cifra declare su alcance) porque acá el alcance **se declara y aun así engaña**: lo declarado es cierto solo para una parte.

El caso ya está corregido en el código, así que lo que la 18 recibe es la regla con dos casos, no una deuda.

### D3. R90 se acota: no se extiende a Análisis

Y no por falta de ganas, sino porque **no hay dónde aplicarla**. Buscado en el código: Análisis no muestra ninguna vista que mezcle direcciones de flujo. La app no rastrea ingresos desde v8.8 y `generarResumen()` lo documenta ("el resumen se centra en gastos, compromisos y patrimonio; no expone ingreso, balance ni tasa de ahorro"). Todo lo que fluye acá, sale.

Activos y pasivos parecen el caso y no lo son: son **stocks, no flujos** (lo que tienes y lo que debes, no dinero moviéndose), y aun así el neto negativo ya se marca con un signo, que es forma. Forzar flechas de entrada y salida sobre columnas de balance convertiría la regla en decoración.

**R90 queda limitada a Movimientos y al panel de prioridades de Inicio**, con sus tres estados. Sigue candidata hasta la 18.

### D4. El seguimiento de los tres grupos no se muda a Análisis

La ficha 12 dejó la pregunta con el argumento hecho y sin decidir. La respuesta es **no**, y sale del código: el seguimiento de los tres grupos es ejecución contra el plan de **un mes concreto** y necesita poder cambiar de mes. Análisis está clavado a `hoy()` (deriva año y mes de la fecha del día) y **no tiene selector**. Traerlo obligaría a añadirle un reloj que la sección deliberadamente no tiene, y que el bloque Gastos sí tiene por la ficha 07.

Y el Z1 dice justo lo contrario de lo que haría falta: el problema de esta pantalla era que ya mezclaba demasiados periodos. **La franja de tres líneas se queda en la lente de Límites** (ADR 085).

### D5. Lo que no se mueve

La ubicación en "Consultar" (R84 verificada), el nombre, el score con sus cuatro factores, el patrimonio y su fórmula, los cinco buckets con la exclusión razonada del fondo de emergencia, `repartirPorcentajes()` por resto mayor, la barra decorativa con los porcentajes en texto, los dos `<details>` que recuerdan su estado con cómputo diferido, el estado vacío único con su excepción fiscal, el ojo de privacidad y el monitor de renta.

**Tres cosas se quedan sin auditar, a propósito:** el bucket "Inversión" sigue siendo capital al costo y no valor de mercado (la ficha 13 ya lo mandó a la 18: es modelo de datos); los montos de los cinco buckets no caben en 390px sin volverse cinco filas, y el porcentaje responde a la pregunta de esa tarjeta ("de qué está hecho"); y el **monitor de renta (K.3)** es una función fiscal completa (topes en UVT, criterios, veredicto y nudges) que merece su propio examen, así que la 18 decide si entra al alcance de la auditoría o se documenta aparte.

---

## Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| Reimplementar Z1 y Z2 porque la ficha los pide | Ya estaban en el código desde ANL.3, verificados en la app. Rehacerlos sería churn, y el riesgo real era el contrario: tocar lo que ya cumplía |
| Que el aviso mande el nombre del chip (`{chip: 'deuda'}`) | La documentación del handler destino dice que el chip lo decide ese dominio, no el emisor, y el ADR 081 lo fijó como reparto. Pasarle la taxonomía obligaría a cada emisor a saber que un fijo y una deuda se filtran distinto |
| Un evento nuevo (`porPagar:ver-grupo`) para llegar al chip sin nombrar deuda | API nueva para un solo llamador, cuando el que existe ya resuelve el caso nombrando un compromiso concreto |
| Convertir el enlace en `<button>` | Lo que hace es navegar a otra sección: el elemento correcto es un enlace, y así conserva su semántica para lectores y para teclado |
| Añadir un selector de mes a Análisis para poder traer los tres grupos | Es lo que Z1 acaba de corregir en la dirección opuesta. La sección es una foto de hoy más contexto histórico, no una superficie de plan mensual |
| Poner los montos de los cinco buckets junto a sus porcentajes | Cinco montos no caben en 390px sin convertir la línea en cinco filas, y eso empuja el resto de la página una pantalla más abajo |
| Extender R90 a activos y pasivos | Son stocks, no flujos. La regla habla de dirección del dinero moviéndose |

---

## Consecuencias

- **Completar una deuda sin saldo cuesta el mismo toque y llega a un destino que existe**, con el chip puesto y la tarjeta a la vista.
- **La ficha 16 se cierra sin reimplementar nada de Z1 ni Z2.** Queda escrito que ANL.3 las resolvió y por qué se verificó antes de tocar: es el segundo caso en la auditoría (tras INT.1g) en que una tarjeta pendiente ya estaba cerrada en el código.
- **R88 llega a la ficha 18 con dos casos y una redacción ampliada**, en vez de descartarse por falta de evidencia.
- **R90 llega acotada a dos vistas** (Movimientos y el panel de prioridades), con la verificación de que ninguna otra sección auditada mezcla direcciones.
- **R86 suma su sexta aparición en cinco dominios** (el rótulo "Compromisos" de este aviso, ya corregido por ANL.3) y queda **lista para confirmar** en la 18.
- **R89a suma su tercer caso positivo** (`seriePorCategoria()` ordena descendente y agrupa el resto en "Otros"; los buckets del patrimonio llevan orden fijo declarado) y **R89b su cuarto**: las cifras que Análisis comparte con otros dominios salen de las funciones de esos dominios, no de copias.
- **R87 sin caso**: Análisis no crea nada, no tiene altas.
- **Lo que sigue abierto para la 18:** el valor de mercado de las inversiones (modelo de datos, enviado por la 13, y afecta al bucket "Inversión" de esta pantalla), el alcance del monitor de renta, y las seis candidatas con su estado: R86, R88, R89a y R89b listas para confirmar; R87 pendiente de cláusula; R90 confirmable con alcance.
