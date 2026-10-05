# Análisis: la verificación obligatoria y lo que cambia en el contrato

Fecha: 2026-10-05. Hereda el análisis y las fases escritos en el caso `kanai-ejecucion-ticket`
(`verificacion-obligatoria-contrato.md` y `fases-verificacion-obligatoria.md`).

## El problema, medido

La sesión de verificación es la red que atrapa el **comportamiento** que el gate no ve: el juez mira el código
—el diff y su evidencia—, no ejecuta la aplicación. Y esa red se está omitiendo:

- De las **28 sesiones `kind=verification`** del store, **13 quedaron abiertas**; entre ellas, las de los dos
  tickets del piloto (**TAO-181 S5** y **TAO-182 S4**).
- Varias cerraron con **todos los ítems pendientes**: JOR-166/S3 (8), TAO-174/S3 y TAO-175/S3 (3 cada una),
  TAO-180/S5 (4). O sea, cerradas **sin verificar**.
- Cuando **sí** se corre, encuentra defectos reales: **TICKET-143/S4** tiene 5 ítems y **los 5 en fallo**;
  **TICKET-143/S6**, 2 fallos. Las demás corrieron en verde (TAO-178 6/6, TAO-177 3/3, TAO-153 2/2).

**Causa raíz**: `shared/session-policy.ts:21` declara `verification: { isWork:false, blocksClose:false }`.
DET-20 no exige su gate para `ready_to_close`, así que el ticket cierra con la verificación abierta o vacía.

## La decisión

La verificación es **obligatoria si el ticket la tiene**; si no la tiene, se omite. Cada ítem **pasa** o queda
**no ejecutado con su motivo** —sin PW, sin ambiente, sin acceso, no aplica, otro— de modo que se pueda
**retomar de forma informada** o **saber por qué se omitió y se pudo seguir**. Si algo queda sin completar,
**Kanai tiene que poder informar por qué**. En la épica la política se vuelve obligatoria por defecto; fuera de
ella sigue advisory, esperando la confirmación del dev.

## Qué cambia en el contrato del TICKET

1. **Política de primera clase** `verification: ask | required` en `tickets`, con **migración** (mismo patrón
   que `teachPolicy`, `draftPolicy`, `reviewPolicy`). Default `ask`. Hoy `report_verification` dice en su propia
   descripción que "el resultado NO bloquea el cierre del ticket" (`tools.ts:812`).
2. **`pending` deja de ser un estado de reposo** cuando la política es obligatoria: cada ítem queda resuelto.
3. **El motivo tiene que ser estructurado.** Hoy `report_verification` acepta `status` y un `evidence` de
   **texto libre**: con eso el porqué queda enterrado en un string y no se puede agregar, filtrar ni informar.
   Hace falta un estado de no-ejecución **con causa** más una nota.
4. **El gate de la sesión de verificación pasa a bloquear** según la política: hoy `blocksClose` es fijo por
   tipo de sesión y tiene que poder sobreescribirse por ticket.
5. **El cierre tiene que poder reportar** qué quedó sin correr, con qué motivo y quién lo decidió.

## Qué cambia en el contrato de la ÉPICA

6. **El default va en el mismo lugar exacto** donde la épica ya fuerza `autopilot: 'autonomous'`
   (`server/epics/policy.ts:14`): ahí se suma `verification: 'required'`.
7. **El contrato de entrega tiene que nombrarlo** (`server/epics/delivery.ts:11`): hoy dice "ejecutar pruebas y
   gates canónicos locales y registrar evidencia por ticket", sin mencionar la verificación.
8. **El cierre de la épica lo hereda**: cada ticket con su verificación resuelta o su motivo, y el conjunto
   reportable.

## Las fases

| Fase | Qué resuelve | Criterios |
|---|---|---|
| **F1** | La política y su **migración**: columna `verification_policy` (`ask`\|`required`, default `ask`) y `set_ticket_config` que la acepta y muestra | `pnpm typecheck` en 0; tests de la tool; migración aplicada y verificada sobre el store |
| **F2** | **El motivo estructurado**: `report_verification` acepta por ítem `status: pass\|fail\|not_run` + `cause` (de la lista) + `note`; `pending` no es estado de reposo con la política obligatoria; una superficie que **informe el porqué** | typecheck 0; tests con `not_run` + causa; lectura que devuelve el motivo |
| **F3** | **El guard del cierre**: con la política obligatoria exige los ítems resueltos; la política puede volver bloqueante el gate de la verificación; el cierre reporta qué quedó sin correr y por qué; el escape del dev queda auditado | typecheck 0; tests del guard en los dos sentidos; evidencia de un cierre trabado y destrabado |
| **F4** | **La épica**: `verification: 'required'` en `activeEpicPolicy`; el contrato de entrega lo nombra; el cierre del conjunto lo hereda | typecheck 0; tests de la política de épica; el contrato menciona la exigencia |
| **F5** | **Verificación de punta a punta**: un ticket con la política obligatoria y un ítem que no se puede correr, con su motivo | el cierre informa el motivo; el ticket cierra con el reconocimiento auditado; evidencia de la corrida |

## Decisiones ya tomadas (no se re-deciden al implementar)

- **Causas**: `sin-pw`, `sin-ambiente`, `sin-acceso`, `no-aplica`, `otro` (nota obligatoria en `otro`).
- **Bloqueo con escape**: el cierre se traba hasta resolver los ítems; el dev puede cerrar reconociendo el
  motivo, auditado (misma forma que el teach).
- **Sin sesión de verificación no hay exigencia.**
