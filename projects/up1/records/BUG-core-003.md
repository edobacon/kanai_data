---
id: BUG-core-003
project: up1
type: bug
module: core
tags:
  - versionado
  - curriculum
  - object-manager
  - ext
  - sp5
  - sp6
---

# Versionar Curriculum crashea en el write del ext-base (Unknown argument updatedById)

## Symptom

Versionar un Curriculum(Plan) (rowAction 'Nueva versión' / createInstance asNewVersion) lanza PrismaClientValidationError: Unknown argument `updatedById` en ext__uplanner__curriculum.create.

## Expected behavior

La nueva versión (v2) se crea sin error.

## Root cause

El versionado corre con objectType=Curriculum (base). El armado del create de la fila ext-base inyecta `updatedById`, pero la tabla ext__uplanner__curriculum solo tiene la columna `curriculumId` (sin custom fields ni columnas de auditoría).

## Impact

Versionar un Curriculum no completa. Bloquea el versionado/clonado de la malla con hijos (carryover SP4 → SP5/SP6, Épica E).

## Reproduction

Probado en vivo 2026-06-23: GraphQL localhost:4000 + Authorization Bearer STORYBOOK_STATIC_TOKEN + X-Tenant-ID UPU → createInstance(objectType:'Curriculum', data:{asNewVersion:true, prefillFrom:{source:'<UV-ICIV-PLAN-2026>'}}). El error ocurre dentro del $transaction Serializable → rollback (DB queda intacta, solo v1).

## Workaround

Ninguno funcional. Fix en core: no inyectar `updatedById` en el create del ext cuando la tabla ext no tiene esa columna.

## Solution

Pendiente.

## Related

- **Specs**: specs/up1/sp5/auditoria-viabilidad_2026-06-23.md §5.ter (H-7)
- **Tickets**: —
