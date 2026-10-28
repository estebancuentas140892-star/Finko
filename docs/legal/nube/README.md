# Paquete legal para la nube (borrador, NUBE.0)

> Borradores para cuando Finko tenga cuentas ([ADR 096](../../DECISIONS/096-finko-en-la-nube-con-supabase.md)). **No los publica la app**: el Centro Legal y el service worker solo leen los documentos de `docs/legal/`, que siguen describiendo el modelo sin cuenta y siguen siendo ciertos hasta NUBE.1.
> Revisado: 2026-10-27. Estado: **v0.2 borrador**, pendiente de revisión por un abogado colombiano (condición del 096 D7 para abrir cuentas fuera del grupo de prueba).

## Qué hay acá y qué reemplaza

| Borrador | Reemplaza o completa | Cuándo entra |
|---|---|---|
| [tratamiento-de-datos-personales.md](tratamiento-de-datos-personales.md) | reemplaza `../tratamiento-de-datos-personales.md` | NUBE.1 |
| [politica-de-privacidad.md](politica-de-privacidad.md) | reemplaza `../politica-de-privacidad.md` | NUBE.1 |
| [terminos-de-la-cuenta.md](terminos-de-la-cuenta.md) | se suma como sección nueva de `../terminos-y-condiciones.md` | NUBE.1 |
| [autorizaciones.md](autorizaciones.md) | textos de la app: crear la cuenta, vincular a un niño, revocar | NUBE.1 (adulto) y NUBE.3 (niño) |

**Cambios menores que no necesitan borrador propio**, se hacen al activar NUBE.1:

- `aviso-de-cookies.md`: con cuenta, el navegador guarda también la sesión de Supabase (no es una cookie de rastreo ni de publicidad).
- `aviso-legal.md`: el responsable del tratamiento deja de ser un marcador y pasa a ser obligatorio.
- `descargo-de-responsabilidad.md`: la app con cuenta está en etapa de prueba; la disponibilidad del servicio no está garantizada (la copia en el dispositivo sí queda).
- Todos los documentos: la "cláusula CFG.4" (cambio de modelo) se reemplaza por la referencia al ADR 096.

## Cómo se activan

1. Revisión del abogado sobre estos borradores y sobre los datos pendientes de abajo.
2. Al cerrar NUBE.1, los borradores reemplazan a los vigentes con versión **1.0** si la revisión ya ocurrió, o **0.2** si Finko sigue en prueba con un grupo cerrado; se registra en `../historial-de-cambios.md`.
3. LEG.2 pide la re-aceptación a todos por el cambio de versión. Quien no cree cuenta sigue como hoy; la autorización de datos solo se pide al crear la cuenta ([autorizaciones.md](autorizaciones.md)).

## Datos pendientes (se suman a los de `../README.md`)

- [ ] **Responsable del tratamiento**: nombre, identificación y domicilio (marcador `[PENDIENTE: responsable]`). Con cuentas deja de ser opcional.
- [ ] **Correo y canal de atención** de consultas y reclamos (`[PENDIENTE: correo de contacto]`).
- [ ] **Región del proyecto de Supabase** y país donde quedan los datos (`[PENDIENTE: región]`), para la transmisión internacional.
- [ ] **Contrato de transmisión con Supabase** (su acuerdo de tratamiento de datos, DPA) aceptado en la cuenta del proyecto.
- [ ] **Registro Nacional de Bases de Datos (RNBD)**: verificar si aplica según la figura del responsable.
- [ ] **Plazo de borrado** en la nube tras borrar la cuenta (`[PENDIENTE: plazo]`, propuesto 30 días incluidos los respaldos del proveedor).
