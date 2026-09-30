---
id: TICKET-158
project: up1
type: ticket
status: in_progress
work_type: fix
external: UPONE-2003
tier: T1
tier_origin: estimated
module: object-manager
autopilot: manual
story_points:
  published: 2
  estimated: 2
---

## Request

Core Extension (Bug fix) originado en la revisión de curriculum-design PR #66 (UPONE-1562). Jira: https://u-planner.atlassian.net/browse/UPONE-2003

UPONE-1562 agregó el tipo de campo `autoincrement` para `internalId` (`Int @unique @default(autoincrement())`). Cuando el usuario copia un registro (Clonar, Duplicar con copia de hijos, Nueva versión), el core arma el registro nuevo copiando todas las columnas del original menos una lista fija que no incluye `internalId`. La copia llega con el mismo número y falla por restricción única (Prisma P2002). Las copias corren en transacción: no queda nada a medias.

### Acciones afectadas (verificado en origin/develop, 2026-09-30)

| Acción | Mod | Qué falla |
| --- | --- | --- |
| Clonar escenario (`scenario-list.json`, `deepClone: true`) | academic-scheduling | raíz Scenario y ScenarioSection |
| Duplicar plan (`default_Curriculum_list.json`, `deepClone: true`) | curriculum-design | raíz Curriculum y sus secciones |
| Nueva versión de plan (`asNewVersion`) | curriculum-design | raíz Curriculum |
| Nueva versión de actividad (`asNewVersion`) | curriculum-design | secciones (CurricularSection) |

curriculum-design #66 ya está mergeado en origin/develop, así que las 4 acciones fallan hoy en develop. Los "Duplicar" que llenan el formulario en el navegador (sin `deepClone` ni `prefillFromCurrent`) no pasan por la copia del core y no fallan.

### Pasos para reproducir

1. Tenant con la columna aplicada (local `uplanner_upu` la tiene en Scenario y ScenarioSection), rol con `mod/academic-scheduling:clone_scenario`.
2. Lista de escenarios, acción de fila "Clonar" sobre un escenario existente.
3. Completar el modal y guardar.
4. Falla con `Unique constraint failed on the fields: (internalId)` (índice `Scenario_internalId_key`). No se crea el escenario.

### Criterios de aceptación

- CA1: Clonar escenario, Duplicar plan, Nueva versión de plan y Nueva versión de actividad crean la copia; cada registro copiado (raíz, hijos y nietos) recibe un `internalId` nuevo de la secuencia.
- CA2: El `internalId` del registro original no cambia.
- CA3: Los `exclude` que ya declaran los mods siguen funcionando igual.
- CA4: La copia de un RecordType con `prefillFrom` tampoco copia `internalId` y respeta `prefillFrom.exclude`.

### Técnico

Los 4 puntos de object-manager que copian filas leen la fila completa y la insertan quitando solo una lista fija; ninguno quita `internalId` (líneas según origin/develop):

1. Raíz normal: `src/graphql/resolvers/helpers/prefill-from-source.js:20` (`PREFILL_DEFAULT_EXCLUDE = ['id','createdAt','updatedAt','createdBy']`) y :175.
2. Raíz de un RecordType: `instance.resolver.js:4453-4466` (`prefillSkip` fijo; además ignora `prefillFrom.exclude`).
3. Hijos por relación directa: `helpers/deep-clone-direct.js` (quita id/createdAt/updatedAt + exclude).
4. Hijos polimórficos: `helpers/deep-clone-polymorphic.js` (idem).

El `delete data.internalId` de `instance.resolver.js:4277` corre antes de `applyPrefillFromSource` (:4385), así que no cubre el valor que trae la copia. `version-from-source.js` no copia columnas.

Enfoque: constante compartida `DB_MANAGED_FIELDS = ['internalId']` (nombre fijo para el tipo autoincrement, `generatePrismaSchema.js:502`) usada en los 4 puntos:
- `prefill-from-source.js:20`: sumarla a `PREFILL_DEFAULT_EXCLUDE`.
- `instance.resolver.js:4453`: sumarla a `prefillSkip`, junto con `prefillFrom.exclude`.
- Llamadas a `deepClonePolymorphicChildren` (:5072) y `deepCloneDirectChildren` (:5083): pasar `exclude: [...DB_MANAGED_FIELDS, ...(prefillFrom.exclude || [])]` (cubre hijos y nietos).

Alternativa descartada: derivar del esquema los campos autoincrement; mismo resultado con más código.

### Tests esperados

- prefill-from-source: un origen con `internalId: 42` produce un `data` sin la clave `internalId`.
- deep-clone-direct y deep-clone-polymorphic: las filas hijas insertadas (incluido un nieto) no llevan `internalId`.
- Camino RecordType: el data heredado no lleva `internalId` y respeta `prefillFrom.exclude`.
- Smoke en tenant local: Clonar escenario, Duplicar plan, Nueva versión de plan y de actividad, con hijos.

### Fuera de alcance

- Parche temporal en los mods (agregar `"internalId"` al `prefillFrom.exclude` de Scenario.json, Curriculum.json y activity.json): no se hace en este ticket.

Relacionado: UPONE-1562, UPONE-1641 (Clonar escenario), UPONE-1982 (mapa internalId para el algoritmo).

## Adendas al request

### Adenda 1 - 2026-09-30 - Eduardo Bacon

El chequeo de drift de esquemas (`npm run drift:check`, `object-manager/scripts/detect-schema-drift.js`) no reconoce el tipo `autoincrement`:
- `jsonTypeToPrisma` (:37) cae al default `String`, asi que reporta 17 errores falsos "Prisma type mismatch (expected: String, got: Int)", uno por cada objeto que declara `internalId`. `src/services/typeMappers.js:350` si lo mapea a Int.
- `compareGeneratedGraphQL` (:326) reporta 17 avisos "Field missing from GraphQL typeDefs" para `internalId`, que esta oculto de GraphQL a proposito (`typeMappers.js:518`, `isAutoincrementFieldType`).

Se suma:
- Mapear `autoincrement` a `Int` en el verificador.
- No exigir en GraphQL los campos `autoincrement` (reusar `isAutoincrementFieldType`).
- Agregar el tipo a la tabla de `docs/guides/schema-drift-detection.md:228`.
- Validacion: correr `npm run drift:check` y confirmar que no queda ningun hallazgo sobre `internalId` (sin test unitario del script: hoy ejecuta main() al importarse; decision del dev).

CA5: `drift:check` no reporta ningun hallazgo sobre `internalId` en los objetos que lo declaran.

Fuera de alcance: el error preexistente `up1_document_template.allowedRoles` (GraphQL JSON vs [String!]); mientras siga, `drift:check` termina con exit 1.

**Motivo**: Segundo efecto del tipo autoincrement (UPONE-1562) en la misma zona, detectado al preparar el desarrollo (sync del 2026-09-30). Se comunica en Jira con un comentario antes del PR, al terminar la ejecucion, por si aparece otro caso.
