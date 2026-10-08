---
id: DECISION-suite-ci-trigger-om-objects-logic-sin-ticket
project: up1
type: decision
module: suite
tags:
  - ci
  - woodpecker
  - trigger-om
  - sin-ticket
---

El paso trigger-om de .woodpecker/build.yml reinicia el último pipeline de uplanner/object-manager en la misma rama cuando un push a develop, staging o master toca objects/** o logic/**, porque el sync de OM replica objects/ de suite y compila resolvers desde logic/. No espera al build de suite, ya que OM lee fuentes y no la imagen. Requiere el secret woodpecker_trigger_token de un usuario con push en object-manager. Commit sin ticket de Jira.

Fuente: 41f5164 .woodpecker/build.yml:134.
