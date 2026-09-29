---
id: BUG-object-manager-drift-check-internalid-autoincrement-UPONE-1562
project: up1
type: bug
module: object-manager
tags:
  - UPONE-1562
  - sp11
  - drift-check
  - internalId
---

jsonTypeToPrisma en scripts/detect-schema-drift.js no tiene un caso para 'autoincrement' y cae al default, que devuelve 'String'. Como el codegen emite internalId como Int @default(autoincrement()), el drift check marca un error "Prisma type mismatch (expected: String, got: Int)" por cada objeto que declara internalId (14 en BASEMODEL y UPU al 2026-09-28: Activity, Contract, Instructor, OrgUnit, Resource, ResourceTypes, Scenario, ScenarioSection, Section, SectionCluster, Shift, Term, TermType, TimeBlock) y el sync termina con "Drift check failed". No es drift real de la base: la base y el schema generado coinciden. Pendiente en develop: mapear 'autoincrement' a 'Int' en jsonTypeToPrisma, igual que typeMappers.js.

sourceRef: scripts/detect-schema-drift.js:37 (jsonTypeToPrisma, default en :57-59), src/services/typeMappers.js:16-18. Reproducido corriendo npm run drift:check el 2026-09-28.
