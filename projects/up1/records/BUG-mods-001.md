---
id: BUG-mods-001
project: up1
type: bug
module: mods
---

# Tenant isolation roto en study-notes: resolver y seed sin filtro por tenant

## Symptom

El resolver `logic/studyNoteStatsByCategory.resolver.js:16` ejecuta `prisma.studyNote.groupBy()` sin filtro, retornando datos mezclados de todos los tenants. El seed `seed/_study-notes-seed.js:49` usa `@prisma/client` default (no el client per-tenant generado) y crea registros sin tenant, quedando invisibles en la app.

## Expected behavior

El resolver debe usar el Prisma client per-tenant (que ya opera sobre un esquema aislado) inyectado por contexto, y el seed debe importar el client per-tenant desde `object-manager/prisma/{TENANT}/generated/`.

## Root cause

El POC inicial de study-notes (TICKET-001) usó el patrón Prisma global en vez del per-tenant. Es el mod de referencia — el patrón errado se puede copiar a futuros mods si no se corrige.

## Impact

Data leak cross-tenant en el resolver (RULE-core-001 violada). Seed no produce datos visibles en ningún tenant. Afecta pipeline de desarrollo y demo del POC.

## Reproduction

1) Autenticarse como tenant A. 2) Ejecutar query `studyNoteStatsByCategory`. 3) Observar que el conteo incluye notas de otros tenants. 4) Ejecutar `node seed/_study-notes-seed.js`. 5) Verificar que no aparecen notas en el listado de ningún tenant.

## Workaround

No usar el resolver en producción hasta que se corrija.

## Solution

Pendiente.

## Related

- **Specs**: SPEC-mods-study-notes
- **Tickets**: TICKET-001
