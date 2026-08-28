---
id: RULE-mods-046
project: up1
type: rule
module: mods
tags:
  - jsonb
  - json
  - codegen
  - object-definition
  - mod
  - curriculum
---

# Campo JSONB en objeto del mod: declarar type:object + static_default:"{}"

## What

Para declarar un campo JSONB en un objeto del mod, usar `"type": "object"` con `"static_default": "{}"`. El tipo `"json"` NO existe en el schema del mod. El codegen mapea `type:object` a `jsonb` en Prisma. Precedente real: `BibliographyReference.metadata` y `rt__Plan__curriculum.rotationConfig`.

## Why

Usar `"type": "json"` produce un error de codegen o un tipo incorrecto. Sin `static_default: "{}"` el campo queda null en nuevos registros, lo que puede romper consumers que esperan un objeto.

## Where

- `mods/<mod>/objects/<Obj>.json` (declaración del campo)
- `mods/curriculum-design/objects/BibliographyReference.json` (precedente: campo `metadata`)
- `mods/curriculum-design/objects/RecordTypes/rt__Plan__curriculum.json` (campo `rotationConfig`)
- `object-manager/src/codegen/generatePrismaSchema.js` (mapeo type:object → jsonb)
- `object-manager/prisma/<tenant>/schema.prisma` (resultado: `rotationConfig Json?` o similar)

## When

Cada vez que se declara un campo de estructura libre (configuración, metadata, JSON arbitrario) en un objeto del mod. Verificar que el campo aparece como `Json` o `Json?` en el schema Prisma generado.

## Verification

1. `grep -A3 '"type": "object"' mods/<mod>/objects/<Obj>.json` → confirmar `static_default: "{}"`.
2. Tras `npm run sync`, verificar en `prisma/<tenant>/schema.prisma` que el campo es `Json` o `Json?` (no `String` ni ausente).

## Source

- **Discovered in**: TICKET-063
