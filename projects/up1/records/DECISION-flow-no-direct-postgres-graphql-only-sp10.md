---
id: DECISION-flow-no-direct-postgres-graphql-only-sp10
project: up1
type: decision
module: flow
---

Los dos ultimos consumidores de acceso directo a Postgres en flow (resolvePgCredentials/createPgClient en objectSource.ts) se eliminaron. getRealObjectTypes ya llamaba a getObjectDefinitions por GraphQL desde 56a4bd24; 5a3aef5b migro el ultimo caso, getDomains (Domain picker de Up1Event), que leia el registro up1_suite_app con pg.Client propio, ahora usa listInstances filtrando isActive=true (orden order NULLS LAST, name replicado client-side). Motivo: la migracion de roles de la DB de tenant retiro el rol compartido up1_app al que apuntaban PG_USER/PG_PASSWORD. Con esto no queda ningun acceso directo a Postgres desde flow.

**sourceRef:** 5a3aef5b packages/nodes-base/nodes/Up1Event/utils.ts:195-235; resolvePgCredentials/createPgClient eliminados de Up1Shared/objectSource.ts:20-71.
