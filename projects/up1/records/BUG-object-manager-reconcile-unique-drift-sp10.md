---
id: BUG-object-manager-reconcile-unique-drift-sp10
project: up1
type: bug
module: object-manager
---

El script que reconcilia la unicidad real (fuera de banda) contra el schema declarado tenia 3 bugs: (1) solo miraba pg_constraint, no pg_index, asi que constraints unicos creados como CREATE UNIQUE INDEX standalone se reportaban como faltantes; (2) la primary key se marcaba como constraint extra no declarado, candidata a DROP; (3) el nombre de constraint autogenerado se calculaba con slicing propio, que no coincide con el truncamiento a 63 caracteres real de Postgres. Verificado en dry-run contra CONTINENTAL/ScenarioSectionAssignment, BASEMODEL/core_User y UPU/TEST. Es el mecanismo que sostiene la regla de UPONE-1801 (soft-delete + @@index en vez de @@unique). Commit sin referencia de ticket.

**sourceRef:** 6cc7bb8e + scripts/reconcile-unique-drift.js.
