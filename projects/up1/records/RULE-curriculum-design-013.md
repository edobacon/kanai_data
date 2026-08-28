---
id: RULE-curriculum-design-013
project: up1
type: rule
module: curriculum-design
tags:
  - fk-polimorfica
  - ownertype
  - curriculum-design
  - mcp
  - sp5
---

# FK polimorfica (ownerType/ownerId) sin integridad referencial: validar en capa app

## What

Las FK polimórficas (`ownerType` enum + `ownerId` string) se modelan SIN integridad referencial en DB (convención, no constraint `@relation`). La validación de coherencia ownerType↔ownerId es responsabilidad de la capa de aplicación (resolver del mod). En el MCP, `ownerId` se resuelve por nombre/código condicional a `ownerType` vía `resolveReference`.

## Why

Es el patrón establecido de la plataforma (Curriculum.ownerId {AcademicProgram,Institution}; CurricularSection.ownerId). La DB acepta un ownerId inválido para el ownerType dado → sin validación en app se corrompen datos silenciosamente.

## Where

objects/<obj>.json (ownerType enum + ownerId string, sin isForeignKey); resolver del mod (validación); curriculum-write.ts del MCP (resolveReference, precedente).

## When

Al modelar un objeto con dueño polimórfico, ej. requirement.ownerType {curriculum, activity, offering}.

## Verification

Crear el objeto con ownerId inexistente para el ownerType → la capa app lo marca (o se documenta la convención aceptada). Precedente: curriculum-write.ts (resolveReference por nombre).

## Source

- **Discovered in**: —
