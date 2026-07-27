# ADR 053 - Invariante de patrimonio: cuándo un monto puede sumarse a activos

**Estado:** Aceptada
**Fecha:** 2026-07-25
**Autores:** Esteban (aprobación), Claude Fable 5 (análisis)
**Origen:** hallazgo H5 de la auditoría integral del 2026-07-25.

---

## Contexto

`calcularActivos()` (`analisis/logic.js`) suma cinco fuentes: saldo de cuentas activas, metas, apartados, inversiones y "por cobrar". La regla que hace correcta esa suma vive hoy **solo como comentario** en esa función, y cada dominio la interpreta por su cuenta:

| Fuente | ¿Descuenta la cuenta al registrarse? | ¿Cómo lo garantiza? |
|---|---|---|
| Metas | sí, siempre | el dominio descuenta al abonar |
| Apartados | sí, siempre | el dominio descuenta al aportar |
| Fondo de emergencia | no, por diseño | excluido de activos ([ADR 020](020-fondo-marcador-de-liquidez.md)) |
| Por cobrar (`personales`) | opcional | activos suma **solo** los préstamos con `cuentaId` |
| **Inversiones** | **nunca** | **nada lo garantiza: la invariante está rota** |

El dominio `inversiones` no tiene una sola referencia a `cuentaId`, `saldo` ni `editar('cuentas')`, mientras `analisis` afirma que "Inversiones es dinero que salió de las cuentas hacia un instrumento real". Mientras el usuario solo registre inversiones preexistentes (tecleando saldos de cuenta que ya las excluyen) la invariante se cumple por casualidad. Al comprar un CDT con dinero de una cuenta registrada, el patrimonio y el Score de Salud se inflan de forma permanente y silenciosa.

El [ADR 020](020-fondo-marcador-de-liquidez.md) resolvió este mismo problema para el fondo, pero solo para el fondo. El [ADR 009](009-consolidado-de-ahorro.md) trata la vista consolidada de Ahorro, no el patrimonio. **Ningún ADR es dueño de la regla general.**

## Decisión

Se fija la invariante de patrimonio, aplicable a toda fuente de activos presente y futura:

> **I1.** Un mismo peso se cuenta a lo sumo una vez en `activos`.
>
> **I2.** Un monto entra a `activos` solo si (a) salió de `cuentas` de forma registrada, o (b) nunca estuvo en `cuentas`. Un monto que sigue en una cuenta registrada no puede sumarse por segunda vez desde otra fuente.
>
> **I3.** Toda operación que descuenta saldo al crear debe revertirlo al eliminar y ajustar el delta al editar. No se implementa un alta que mueva dinero sin su reversa.
>
> **I4.** La regla de suma de `calcularActivos()` no se cambia de forma retroactiva. Los registros existentes en dispositivos reales no admiten backfill de procedencia: adivinarla sería inventar el dato.
>
> **I5.** Un cupo de crédito disponible nunca es un activo.

**Dónde se aplica la invariante:** en la **captura**, preguntando el origen cuando la app no puede deducirlo. No en la capa de análisis.

### Consecuencia inmediata para Inversiones

El origen del dinero es **opcional** (`cuentaId` opcional, `undefined`-safe, sin bump de `SCHEMA_VERSION`: mismo precedente que `cuotaManejo`, `aplica4x1000` y `costoGMF`). Existen casos legítimos sin cuenta origen y ninguno es marginal: inversión preexistente registrada en el onboarding (el caso más común), descuento directo de nómina, rendimientos reinvertidos dentro del instrumento, y dinero fuera del universo de la app (efectivo, cuenta no registrada, regalo).

Se pregunta con dos ramas explícitas ("salió de una de mis cuentas" / "ya la tenía o vino de otra parte"), no con un checkbox silencioso: la corrección del patrimonio depende de la respuesta y no hay un default seguro para ambos casos. El default **sugerido** se infiere de `fecha de inicio`, dato que el formulario ya pide: fecha de hoy o reciente sugiere cuenta origen; fecha pasada sugiere preexistente. Así la pregunta nueva se vuelve una confirmación.

### Alternativas rechazadas

1. **Cuenta origen obligatoria.** Rompe los cuatro casos legítimos sin origen.
2. **Copiar literal el patrón de `personales`** (activos suma solo lo que tiene `cuentaId`). Viola I4: haría desaparecer del patrimonio las inversiones preexistentes ya registradas. El precedente de `personales` aplica al patrón de captura, no a la regla de suma: un préstamo siempre nace cuando se registra, una inversión puede tener diez años.
3. **Modelar la inversión como transferencia hacia un destino no-cuenta** (reusar MC.17). Viola el invariante de transferencia ([`contexto/mis-cuentas.md`](../contexto/mis-cuentas.md): el patrimonio neto no cambia y ambos extremos son cuentas propias de dinero real) y ensucia el ledger.
4. **Solo copy explicativo, sin descuento.** Barato y honesto, pero el patrimonio sigue duplicándose.

## Consecuencias

### Positivas

- La regla deja de ser folclore por dominio y pasa a ser verificable. Alimenta directamente a **MC.16** ([ADR 051](051-tarjeta-de-credito-producto-integrado.md)), cuyo riesgo declarado ("el cupo disponible nunca puede sumarse al patrimonio") es I5.
- **ARQ.1** gana un atributo explícito que modelar en el modelo unificado de bolsas: "descuenta saldo sí/no".
- No toca `analisis`, ni el motor de vencimientos, ni el schema. Superficie contenida.

### Negativas / Restricciones

- `inversiones` cruza la línea de dominio de solo-registro a dominio que mueve dinero: es el último de las cuatro bolsas en cruzarla. Debe hacerlo vía `editar('cuentas', ...)` de `infra/crud.js`, nunca importando tesorería (ADN 10). Precedente exacto: PE.7 en `personales`.
- Las inversiones ya registradas quedan con origen desconocido de forma permanente. Es correcto y es el comportamiento actual.
- I3 encarece el alta: implementar solo la creación con descuento queda prohibido por este ADR, porque abriría un hueco de integridad equivalente a MC.17f en un dominio hoy limpio.
