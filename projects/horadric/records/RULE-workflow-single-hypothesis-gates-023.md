---
id: RULE-workflow-single-hypothesis-gates-023
project: horadric
type: rule
module: workflow
level: should
tags:
  - gates
  - det-32
  - det-13
  - kill-path
  - hipotesis
  - design
---

# Un gate con derecho a matar el ticket cuelga de UNA hipotesis, y un veredicto que cuelga de una hipotesis se reabre con ella

## What

Dos reglas hermanas sobre decisiones que dependen de una premisa no verificada.

**1. Gate duro, una hipotesis.** Si un gate puede cerrar el ticket sin ejecutar, su kill path tiene que nombrar **cual** hipotesis lo dispara. Un REQ que mezcla dos preguntas independientes bajo un solo gate hace que el fallo de la barata mate al ticket sin haber respondido la cara.

Al escribir un gate duro, separar explicitamente:
- que pregunta lo dispara,
- que preguntas quedan vivas si esa falla,
- y si esas otras se pueden responder por otra via.

**2. Veredicto `drop` de DET-32, reabrir con su premisa.** Un `drop` que descansa en una sola hipotesis no verificada en runtime **no queda cerrado porque ya se registro**. Cuando esa hipotesis se cae, el veredicto cae con ella y hay que re-correr la cascada, no darlo por decidido.

Lo mismo aplica al reves: un veredicto puede cambiar de `build` a `reduce` cuando aparece evidencia nueva. En HOR-131, `developer` pasó a `reduce` recien en S4 porque un hallazgo de S3 — que `Bash` es escape de escritura — le quito todo el valor a la palanca que se iba a usar.

## Why

Los dos casos ocurrieron en el mismo ticket y los dos costaron trabajo.

**El gate.** `REQ-VERIFY-01` juntaba dos preguntas ortogonales: **distribucion** (¿desde donde descubre el host una definicion?) y **enforcement** (¿la allowlist la aplica el harness o el prompt?). Su gate duro podia cerrar el ticket si fallaba cualquiera de las dos. Fallo la de distribucion — el pack no cargaba desde el repo en ese host — y el kill path apuntaba a cerrar el ticket, cuando la pregunta que le daba valor, el enforcement, **ni siquiera se habia intentado**. Se resolvio cambiando el canal de carga y respondiendo la segunda, que dio verde. Ejecutar el kill path habria registrado "el mecanismo no funciona" cuando lo que no funcionaba era el canal que el intake asumio.

**El veredicto.** `B1` (script de instalacion del pack) se habia descartado en intake con veredicto `drop` bajo DET-32, apoyado enteramente en H4: *"el pack viaja con el repo y carga via `--add-dir`, un script de instalacion no tendria nada que hacer"*. Cuando S1 refuto esa premisa, el `drop` quedo sin sustento — pero ya estaba registrado y podria haber pasado como decidido. Reabrirlo convirtio a B1 en precondicion de la session siguiente: sin canal de instalacion, el criterio de aceptacion de las tres definiciones ("el agente carga") no se podia ni verificar.

## Where

- `design-{tipo}`: al escribir un gate con `gate_type: fuerte` y al registrar entries `necessity-assessment`
- `request-execute`: al cerrar un gate cuyo resultado tumba una hipotesis del intake
- La seccion `## Triage` del ticket: cuando una hipotesis cambia de estado, revisar que veredictos dependian de ella

## When

Al disenar un gate que puede matar el ticket, al registrar un `drop`, y **cada vez que una hipotesis del Triage cambia de status**.

**Antipatron**: tratar el `decisions_log` como archivo cerrado. Es append-only para no reescribir la historia, no para que las decisiones dejen de revisarse cuando su premisa se cae.

## Related

- [[RULE-workflow-harness-evidence-vs-self-report-022]] — como se refutan las premisas
- DET-32 (necesidad y reuso), DET-13 (cierre con evidencia), DET-14 (approve/iterate/escalate)
