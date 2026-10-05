# Fases para la verificación obligatoria (F6 a F10)

Fecha: 2026-10-05. Decisión del dev: la verificación es **obligatoria si el ticket tiene la sesión**; si no la
tiene, se omite. Cada ítem **pasa** o queda **no ejecutado con su motivo** (por ejemplo, sin PW disponible).
Y Kanai tiene que poder **informar por qué**. En la épica, la política se vuelve obligatoria por defecto, en el
mismo lugar donde hoy se fuerza `autopilot: 'autonomous'`.

Estas fases se suman al plan del caso. **La enmienda formal del plan se hace con el plan completo en un solo
envío**, y la implementación toca una migración del store: van juntas en una sesión con contexto, no a las
apuradas.

## Decisiones que ya están tomadas (default propuesto, se ajusta al implementar)

- **Causas de no-ejecución**: `sin-pw`, `sin-ambiente`, `sin-acceso`, `no-aplica`, `otro` (con nota obligatoria
  en `otro`).
- **Bloqueo con escape**: con la política en obligatoria, el cierre **se traba** hasta resolver los ítems; el
  dev puede cerrar reconociendo el motivo, auditado (misma forma que el teach).
- **Sin sesión de verificación no hay exigencia**: el ticket se comporta como hasta ahora.

## F6 — La política y su migración

- Columna nueva en `tickets` (`verification_policy`, `ask` | `required`, default `ask`), migración, y
  `set_ticket_config` que la acepta y la muestra.
- La política normal sigue **advisory**: el dev confirma.
- **Criterios**: `pnpm typecheck` en 0; tests de `set_ticket_config` con la política nueva; migración aplicada
  sobre el store vivo con su verificación.

## F7 — El motivo estructurado (el punto que más cambia)

- `report_verification` pasa a aceptar por ítem: `status: pass | fail | not_run`, `cause` (de la lista) y
  `note`. `evidence` se conserva para lo que sí se corrió.
- **`pending` deja de ser un estado de reposo** cuando la política es obligatoria.
- **Kanai puede informar el porqué**: una superficie que liste los ítems no ejecutados con su causa y su nota.
- **Criterios**: typecheck en 0; tests de la tool con `not_run` + causa; una lectura que devuelva el motivo.

## F8 — El guard del cierre

- Con la política en obligatoria, el cierre exige los ítems resueltos: `pass`, o `not_run` **con causa**.
- La política del ticket puede volver bloqueante el gate de su sesión de verificación (hoy `blocksClose` está
  fijo por tipo de sesión: `shared/session-policy.ts:21`).
- El cierre **reporta** qué quedó sin correr y por qué, y el escape del dev queda auditado.
- **Criterios**: typecheck en 0; tests del guard en los dos sentidos (con la política exige, sin ella no);
  evidencia de un cierre trabado por un ítem pendiente y destrabado por su motivo.

## F9 — La épica

- `activeEpicPolicy` (`server/epics/policy.ts:14`, donde ya va `autopilot: 'autonomous'`) suma
  `verification: 'required'`.
- El contrato de entrega (`server/epics/delivery.ts:11`, hoy "registrar evidencia por ticket") **nombra** la
  verificación: un ticket de la épica no se da por cerrado sin su verificación resuelta o su motivo.
- El cierre del conjunto lo hereda.
- **Criterios**: typecheck en 0; tests de la política de épica; el contrato de entrega menciona la exigencia.

## F10 — Verificación del conjunto, de punta a punta

- Un ticket real con la política en obligatoria, con un ítem que **no se puede correr**, y su motivo
  registrado.
- **Criterios**: el cierre informa el motivo; el ticket cierra con el reconocimiento auditado; y el caso queda
  con la evidencia de la corrida.

## Lo que justifica todo esto (medido el 2026-10-05)

De las 28 sesiones de verificación del store: **13 quedaron abiertas** —incluidas las de TAO-181 y TAO-182—,
varias cerraron con **todos los ítems pendientes** (JOR-166/S3: 8; TAO-174/S3 y TAO-175/S3: 3; TAO-180/S5: 4),
y las que sí corrieron encontraron **siete fallos reales** (TICKET-143/S4: 5 de 5; TICKET-143/S6: 2). Es la red
que atrapa el comportamiento que el gate no ve — y con el encadenado pasa de conveniente a necesaria.
