---
id: RULE-platform-020
project: up1
type: rule
module: platform
tags:
  - prisma
  - migrate
  - db-push
  - shadow-db
  - drift
  - ai-safety
---

# Drift preexistente DB UPU vs migration history: db push aditivo vs reset destructivo (decision del dev)

## What

Cuando DB y migration history divergen (drift preexistente por `db push` previo que no registro migration), un cambio aditivo legitimo queda rehen: `migrate dev` exige reset destructivo (shadow DB detecta el drift). La decision es del dev segun el riesgo de data-loss: `db push --accept-data-loss` aditivo, o reset destructivo con reseed.

## Why

`up1:migration-task` (`aws/migration-task-def.json`) corre `prisma db push` que no registra migration; con el tiempo DB y migration history divergen. Prisma 5.x exige `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` para destructivos. `migrate status` puede reportar 'up to date' mientras `migrate dev` exige reset destructivo.

## Where

Cualquier ticket con cambios aditivos al schema UPU; release de Prisma 5.x exige consent var para destructivos.

## When

Pre-`migrate dev` o `migrate deploy` con drift preexistente conocido.

## Verification

`prisma migrate status` + lectura de migration history vs `schema.prisma` antes de elegir via.

## Source

- **Discovered in**: TICKET-103
