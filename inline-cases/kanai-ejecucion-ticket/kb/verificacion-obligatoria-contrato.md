# La verificación obligatoria: qué obliga a cambiar en el contrato

Fecha: 2026-10-05. Decisión del dev: la verificación es **obligatoria si existe** (si el ticket no tiene
sesión de verificación, se omite), y sus ítems deben **pasar** o quedar con **el motivo por el que no se
pudieron correr** (por ejemplo, sin PW disponible). Si algo queda sin completar, **Kanai tiene que poder decir
por qué**.

## El contrato de HOY

| Pieza | Hoy |
|---|---|
| `report_verification` | `results: [{ status: pass\|fail\|pending, evidence? }]`, `executor: human\|pw`, `closeGate?` (tools.ts:812-813). Su propia descripción dice: *"el resultado NO bloquea el cierre del ticket"* |
| Política por ticket | `teachPolicy`, `draftPolicy`, `reviewPolicy`, `autopilot`, `tier` (columnas de `tickets`); `set_ticket_config` las cambia |
| Cierre (DET-20) | exige el gate de las sesiones con `blocksClose: true`; `verification` tiene `blocksClose: false` (session-policy.ts:21) |
| Épica | `activeEpicPolicy` fuerza `autopilot: 'autonomous'` (epics/policy.ts:14); el contrato de entrega (`epics/delivery.ts:11`) dice "ejecutar pruebas y gates canónicos locales y registrar evidencia por ticket", sin nombrar la verificación |

## Qué obliga a cambiar (ticket)

1. **Una política de primera clase** `verification: ask | required` en `tickets`, con migración: default
   `ask` (advisory, como hasta ahora). Meterla en `meta` funcionaría sin migración, pero `meta` es la bolsa de
   los campos migrados de DKC: no es lugar para una política.
2. **`pending` deja de ser un estado de reposo** cuando la política es obligatoria. Hoy `pending` permite
   cerrar; con la política, cada ítem tiene que estar **resuelto**: `pass`, o **no ejecutado CON MOTIVO**.
3. **El motivo tiene que ser estructurado, no prosa suelta.** `evidence` es texto libre y no se puede agregar
   ni informar. Hace falta un estado de no-ejecución con su causa (sin PW, sin ambiente, sin acceso, no
   aplica, otro) y una nota. Sin eso, "Kanai debe poder informar por qué" no se puede cumplir: el porqué
   quedaría enterrado en un string.
4. **El gate de la sesión de verificación pasa a ser bloqueante** cuando la política es obligatoria: la
   política del ticket tiene que poder **sobreescribir** `blocksClose` por sesión, o el guard tiene que mirar
   la política además del kind.
5. **El cierre tiene que poder REPORTAR**: qué ítem quedó sin correr, con qué motivo y quién lo decidió. Hoy no
   hay superficie que consolide eso.

## Qué obliga a cambiar (épica)

6. **El default**: `activeEpicPolicy` (epics/policy.ts:14) fuerza `autopilot: 'autonomous'`; ahí mismo va
   `verification: 'required'`. Es el mismo lugar, la misma forma.
7. **El contrato de entrega** (epics/delivery.ts:11) tiene que nombrarlo: hoy pide "registrar evidencia por
   ticket"; con la política, la evidencia de la verificación es parte de lo que se entrega, y un ticket de la
   épica no se da por cerrado sin su verificación resuelta o su motivo.
8. **El cierre de la épica** ("completar todos los tickets y hitos") hereda la exigencia: cada ticket con su
   verificación resuelta, y el conjunto reportable con los motivos de lo que no se corrió.

## Lo que esto NO cambia

- Un ticket **sin** sesión de verificación no se ve afectado: se omite, como pidió el dev.
- La política normal sigue siendo advisory: el dev confirma.

## Por qué importa (el dato medido)

De las 28 sesiones de verificación del store, **13 quedaron abiertas** —incluidas las de los dos tickets del
piloto— y varias cerraron con **todos los ítems pendientes**. Las que sí corrieron encontraron **siete fallos
reales** (TICKET-143 S4: 5 de 5; TICKET-143 S6: 2). Es la red que atrapa el comportamiento que el gate no ve,
y es justo la que se omitía.
