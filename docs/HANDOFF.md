# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-27. Última tarea cerrada: DIS.9, las 9 correcciones aplicables de la auditoría de diseño de Mis cuentas (4 quedan abiertas: dos por transversales, una sin propuesta y H12 porque revisa el ADR 035 D6; ver [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md)).

**Producción:** https://finko-brown.vercel.app
**Repositorio:** https://github.com/estebancuentas140892-star/Finko

---

## 1. Qué es Finko

PWA offline-first de gestión financiera personal para Colombia.
Vanilla JS puro + ES6 modules. Sin framework, sin build step, sin servidor, sin cuenta.
Todo vive en `localStorage` (clave `fk_v1`). Pensada para personas con poco conocimiento
financiero: lenguaje simple, normativa colombiana (SMMLV, UVT, GMF).

**Versión actual:** `v1.0.0` - todas las 14 fases originales completadas y cerradas.
**Rama principal:** `main`.

---

## 2. Estado técnico actual

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 3122/3122 verdes |
| Tests E2E | 173/173 verdes en las 4 suites corridas el 2026-07-27 (`smoke`, `a11y-forms`, `reflow-320`, `navegacion-render`). La última corrida completa de las 11 suites fue 231/231 el 2026-07-26. El desglose no se transcribe acá: lo reporta la propia corrida. |
| Schema version (localStorage) | v27 |
| Lighthouse Performance | 100 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### fix(mis-cuentas): DIS.9, 9 correcciones de la auditoría de diseño sobre Mis cuentas · 2026-07-27

Auditoría de diseño de la sección más larga de la app (13 hallazgos): se aplican 9. Lo grande: el chip de datos de transferencia **se salía de la tarjeta y pasaba por debajo de editar y eliminar** (medido, 377,8px dentro de un contenedor de 222,7); ahora muestra un solo dato, el que sirve para que a uno le consignen, y la etiqueta trunca con elipsis en su propio elemento (169,5px; 219,2px con un número de 21 dígitos; R40 nueva). La barra de composición pintaba **cuatro segmentos del mismo azul y los dos últimos no se veían** (5,74 · 3,01 · 1,77 · 1,36), mientras el texto de abajo contaba cuentas en vez de repartir el dinero: tres segmentos con "otras", 5,74 · 4,22 · 3,01, y el resumen pasa a "Bancolombia 64% · Davivienda 23% · otras 14%" (R39 nueva). **El piso de opacidad es 0,62 y no el 0,55 que pedía el informe:** medido sobre el fondo real, 0,55 rinde 2,65:1. "Transferir entre cuentas", el único control que mueve dinero real, era el más discreto de la sección y nacía 56px bajo el pliegue: pasa de 165,5x36 ghost a 358,9x44 con borde e ícono, sin volverse primario (R38 nueva). Los dos estados vacíos de ingresos se funden en uno, los cinco emoji salen del sprite, el botón de invertir y las acciones de la tarjeta llegan a 44x44, la mitad de la sección gana su encabezado (`sr-only`) y se retiran dos `role="status"` que se reanunciaban en cada repintado. `DESIGN_SYSTEM.md` gana R38, R39 y R40 (el informe traía seis: dos ya existían y una pertenece a una corrección transversal). **Sin aplicar:** C2 (la anatomía de fila, toca Gastos, Deudas, Personales y Metas a la vez), C8 (el ojo en los selectores de cuenta: `cuenta-helper.js` es transversal, y **es una violación de la R20 ya escrita**, no una regla nueva), H10 (el formulario de 1.270,4px, sin propuesta a propósito) y **H12** (el orden de la sección, revisa el ADR 035 D6 y espera tu palabra). 3122/3122 unit + lint verdes; smoke, a11y-forms, reflow-320 y navegacion-render 173/173. SW v426→v427.

---

### fix(limites): DIS.7, 9 correcciones de la auditoría de diseño sobre Límites de gasto · 2026-07-26

Auditoría de diseño de la sección (10 hallazgos): se aplican 9. Lo grande: la barra de Necesidades **pintaba el 90% consumido con el acento de marca** (`rgb(31,209,148)` medido), el color que el sistema reserva para dinero disponible y logro, justo encima de la barra con la que Ahorro celebra superar su meta; el ADR 019 pidió que ese grupo se viera neutro y el código cumplía la letra con `claseBarra = ''`, que cae al acento porque ninguna sección declara `data-dom` (R34 nueva, `rgb(136,143,166)` después). La sección listaba "Domicilios · $42.000" y remataba con "Asígnales un límite", pero el formulario **no ofrecía ninguna categoría creada por el usuario**: callejón sin salida; ahora cada fila es el botón que abre el modal con su categoría precargada y los chips incluyen las propias (R35 nueva). El formulario adopta FORM.1b y al hacerlo se destapó que **editar un tope nunca guardaba**: el `<select disabled>` del modo edición no entra en `FormData`, así que la validación fallaba con "Debes elegir una categoría"; la categoría fija viaja ahora en un campo oculto. Los tres nudges apilados bajan a su propio sobre, con el copy del ADR 019 D3 intacto. Los cuatro emoji de estado salen del sprite, los tres grupos pasan a `<h3>`, dos controles llegan a 44px, un solo verbo "+ Límite" y el modal por fin dice si creas o editas. Ficha nueva: [`contexto/limites.md`](contexto/limites.md); `DESIGN_SYSTEM.md` gana R34 y R35. **Sin aplicar, espera tu decisión:** VL1 (que Estilo de vida abra la sección en móvil, revisa el ADR 019 D4; hoy sus topes empiezan a 1.290px, 1,53 pantallas). 3106/3106 unit + lint verdes; smoke 156/156, a11y-forms, reflow-320 y navegacion-render verdes. SW v422→v423.

---

### fix(interfaz): DIS.6, 7 correcciones de la auditoría de diseño sobre la Interfaz · 2026-07-26

Auditoría de diseño de la capa global de navegación (11 hallazgos): se aplican 7. Lo grande: **la primera pantalla de la app era la única sin una sola regla CSS propia**, así que el wizard de bienvenida salía con los defaults del navegador (hero de 16px a la izquierda, nota de privacidad del mismo tamaño que el cuerpo); toma la receta de `.empty-state` y su hero pasa del emoji a la marca "F" que NAV2.1b había diseñado solo para escritorio (R29 nueva). **Estar en Inicio y estar en Análisis se veían idénticos en la barra**: el botón "Más" no llevaba `data-section`, caía al acento genérico y 11 de las 14 secciones compartían el mismo estado activo; ahora nombra la sección, muestra su ícono y hereda su color (Análisis gris, Cuentas azul, Metas violeta) sin agregar un slot ni un token (R30 nueva). **Movimientos no tenía entrada de navegación en ninguna parte** y se llegaba solo por un enlace que arranca oculto: gana su tile y su teja de encabezado (R32 y R33 nuevas). La marca entra a la fila de perfil de Inicio sin costarle altura, porque en móvil el sidebar pierde su logo y la app no se nombraba nunca (R31 nueva). El cierre de la hoja "Más" sube de 32x32 a 44x44 y las pestañas del hub de 38,6 a 44. `DESIGN_SYSTEM.md` gana R29 a R33. **Sin aplicar, esperan tu decisión:** V1 (si Deudas sube a la barra: el sidebar la llama "uso diario" y en el teléfono la esconde), V2 (el hub Ahorros aparece dos veces), V3 (el segundo paso del onboarding, terreno de GU.1a) y V4 (la acción "Registrar" en un slot de pestaña, ADR 024: la recomendación es mantenerla). 3085/3085 unit + 231/231 E2E + lint verdes. SW v421→v422.

---

### fix(apartados): DIS.5, 11 correcciones de la auditoría de diseño sobre Apartados · 2026-07-26

Auditoría de diseño de la sección (13 hallazgos): se aplican 11. Lo grande: el badge de vencimiento imprimía **rojo de emergencia a tres semanas de la fecha** porque `.badge` está declarada en dos archivos y atoms se importa después de forms; vuelve al ámbar con selector compuesto (R23 nueva). La fila medía **344,6px repartidos 56 | 110 | 133**, con la columna de botones más ancha que la de información y el subtítulo envolviendo en seis líneas: baja a 215px con 208px de cuerpo, el ícono entra al centro del anillo y el "%" pasa a la derecha (R28 nueva). El aviso repetía la primera fila con **otro umbral** (60 días contra 30), así que un apartado a 45 días se contaba y no se señalaba: un solo `DIAS_PROXIMO` y un aviso que suma (R25 y R27 nuevas). **Cinco `role="status"`** anunciaban contenido estático en cada re-render: cero (R24 nueva). **"Ya lo usé" ponía $1.240.000 en cero sin preguntar** desde un botón de 78x36: ahora confirma y mide 44px (R26 nueva). Los dos montos ganan separador de miles (R16, segundo caso), las 20 plantillas pasan a 6 visibles y 14 plegadas (formulario de 1.235px a 835px), y el vacío por fin dice que **el dinero se aparta en el primer aporte**, cosa que ninguna pantalla decía. `DESIGN_SYSTEM.md` gana R23 a R28. **Sin aplicar, esperan tu decisión:** A11 (registrar el gasto al usar el apartado: hoy pagar el SOAT con lo reunido no deja rastro en Gastos ni en Análisis; cruza dominios) y A13 (el consolidado del hub Ahorros, ADR 024 D4, afecta a las cuatro secciones). 3081/3081 unit + lint verdes; smoke, a11y-forms, hub-ahorros y reflow-320 verdes. SW v420→v421.

---

### fix(gastos): DIS.4, 10 correcciones de la auditoría de diseño sobre Gastos · 2026-07-26

Auditoría de diseño de la sección (12 hallazgos): se aplican 10. Lo grande: el hero decía **"Gastaste este mes" en cualquier mes navegado**, con su propia nav diciendo "Junio 2026" a 30px de distancia; ahora nombra el mes visible (regla R10 nueva). La fila daba **41,5% de su ancho a tres botones** y bajaba el monto al segundo renglón, con 110,7px para el nombre: el monto vuelve arriba (a 16,8px del tope) y las acciones bajan a su renglón. La barra de filtros escondía **436px de 792px** tras un scroll que en móvil no se dibuja: envuelve, y sus chips pasan de 27,7px a 44px (R9 nueva). El total del mes se anunciaba dentro de un grupo llamado "Filtrar por categoría". "›" ya no navega hasta 2029 hacia meses vacíos cuyo CTA registraba en el mes corriente. El usuario nuevo deja de ver un hero de $0 entre dos bloques que dicen lo mismo, un solo verbo y un solo primario en toda la sección, y el formulario **vuelve a abrir con el monto** (TX.12 lo había desplazado, contra el ADR 042 D2; R11 nueva). `DESIGN_SYSTEM.md` gana R9, R10 y R11. **Sin aplicar, esperan tu decisión:** V1 (el copy y la acción del insight de gastos hormiga, revisa el ADR 039 D4) y V2 (el alto del formulario, revisa el ADR 042 D3). 3055/3055 unit + lint verdes; smoke, a11y-forms, navegacion-render y reflow-320 verdes. SW v419→v420.

---

> Para tareas anteriores (fix(me-deben) DIS.3 las 11 correcciones de la auditoría de diseño sobre Me deben, fix(deudas) DIS.2 las 8 correcciones de la auditoría de diseño sobre Deudas, fix(inicio) V1 el acento de marca deja de medir el gasto semanal, docs(reorg) Fases 1 y 2 de la reorganización documental, feat(metas) EDIT.1a editar sin destruir el progreso, feat(gastos) TX.12 gastos frecuentes y "Repetir", feat(agenda) CAL.5a pagar en lote lo que ya venció, feat(movimientos) MOV.2 búsqueda y filtros en el ledger, feat(movimientos) MOV.1 el ledger deja de ser solo lectura, feat(personales,analisis) PE.7 "Me deben" conectado a cuentas y patrimonio, feat(apartados,ahorro) AP.5a + AH.5a el monto de un aporte llega prellenado, fix(agenda) BUG-015 "Marcar pagado" registra el pago en el mes visible, fix(tesoreria) BUG-014 la distribución reparte el cobro del período, no el mes, y el historial completo antes de esas), ver [`docs/CHANGELOG.md`](CHANGELOG.md) o [`docs/changelog/`](changelog/) para meses ya archivados.

---

## 4. Mantenimiento y producción

**App en producción estable:** https://finko-brown.vercel.app (Lighthouse 99-100). **Deuda técnica conocida: 2 errores abiertos**, ninguno con impacto en el uso diario (uno de copy, uno de la propia suite E2E): ver [`docs/BUGS.md`](BUGS.md).

La lista completa y vigente de tareas de mantenimiento y features opcionales vive en [`docs/BOARD.md`](BOARD.md) (secciones "Mantenimiento" y por sección de la app). Esta sección solo guarda el procedimiento detallado de la tarea recurrente más delicada.

> **Importante para futuros desarrolladores:** Antes de instalar dependencias o configurar
> un nuevo entorno, leer [`docs/SECURITY.md`](SECURITY.md). Incluye política anti-malware npm,
> guía de migración a **pnpm** con defensas (`minimum-release-age`, `only-built-dependencies`),
> y el audit de seguridad realizado el 2026-05-18.

### Recordatorio enero 2027 - E.2-2027

> Desde la refactorización a tabla histórica, **no se crean exports `_2027`**: basta con agregar UNA entrada en `LEGAL_POR_ANIO`. Toda la app (UI, cálculos, tests) y el aviso de vigencia de P1 dejan de marcar "desactualizado" en cuanto la entrada existe.

**Qué hacer:**
1. Visita [DIAN UVT](https://www.dian.gov.co/) y [Mintrabajo SMMLV](https://www.mintrabajo.gov.co/)
2. Obtén los valores oficiales 2027 (SMMLV, auxilio de transporte, UVT) con sus decretos/resoluciones.
3. En `modules/core/constants.js`, reemplaza `2027: null` por una entrada completa:
   ```javascript
   2027: {
     smmlv:             <nuevo_valor>,
     auxilioTransporte: <nuevo_valor>,
     uvt:               <nuevo_valor>,
     vigenciaDesde: '2027-01-01',
     fuentes: { smmlv: '...', auxilio: '...', uvt: '...' },
   },
   ```
4. Tests (`pnpm test` → todo verde; incluye `tests/unit/constants.test.js`).
5. Bumpear `CACHE_NAME` en `service-worker.js`.
6. Commit: `feat(E.2): cargar SMMLV + auxilio + UVT 2027`
7. Push a main → auto-deploy a producción.

**Modelo:** Escribe tu `Próximo paso` con **Haiku 4.5** (búsqueda + cambio mecánico de una entrada).

---

## 5. Cómo trabajamos (workflow)

Workflow completo (una tarea a la vez, cierre de conversación, selección de modelo) en [`/CLAUDE.md`](../CLAUDE.md) sección 2. No se duplica acá para no desincronizarse.

---

## 6. Arquitectura en una línea por capa

```
core/        → state.js (singleton S), storage.js (save debounced), constants.js (CO legales)
infra/       → utils, render, a11y, crud, router, csv, svg, notificaciones
ui/          → bootstrap (entry point), shell, actions (delegación data-action), modales, onboarding
dominio/     → accesos, agenda, ahorro, analisis, apartados, compromisos,
               config, export, gastos, import, inversiones, logros, metas,
               movimientos, personales, presupuesto, resumen, tesoreria
```

Regla clave: **ningún dominio importa a otro** - comunicación exclusiva por `EventBus`.
Todo `logic.js` es sin DOM (testeable en Node). Todo `view.js` solo lee `S`, no lo muta.
Detalle completo en [`docs/ARCHITECTURE.md`](ARCHITECTURE.md). Cifras de tests actuales: ver sección 2 arriba.

---

## 7. Comandos rápidos

```bash
python -m http.server 8080   # Servir la app (ES6 modules requieren HTTP)
pnpm test                     # tests unitarios + integración (Vitest + happy-dom)
pnpm run test:e2e             # smoke tests Playwright
pnpm run coverage             # umbral 90% capa lógica
pnpm run lighthouse           # requiere servidor en :8080
pnpm perf                     # harness de rendimiento (scripts/perf/), no toca pnpm test
```
