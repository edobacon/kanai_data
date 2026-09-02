---
id: DECISION-core-ci-woodpecker-UPONE-1650
project: up1
type: decision
module: core
tags:
  - UPONE-1650
  - UPONE-1651
  - sp9
  - ci
  - core
---

Se migra el CI de Bitbucket Pipelines a Woodpecker en mcp/suite/flow. Fail de builds de staging ante branch de input faltante (UPONE-1651). Cuidado con brace/${...} en comandos: Woodpecker los sustituye antes del shell.

sourceRef (verificado por diff): mcp e68cc86 .woodpecker/build.yml (drop bitbucket-pipelines.yml); suite 304e4aa .woodpecker/ (drop Bitbucket pipeline); flow 9fb80c14 .woodpecker/ (Woodpecker build pipeline).
