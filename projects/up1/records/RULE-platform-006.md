---
id: RULE-platform-006
project: up1
type: rule
module: platform
tags:
  - convention
  - naming
  - pascalcase
  - objects
  - layouts
  - graphql
  - codegen
  - deploy
---

# Objects, layouts y GraphQL resolver types DEBEN usar PascalCase — lowercase bloquea deploy

## What

Todo nuevo object JSON, layout, evento, resolver y referencia cross-object en mods del platform up1 **DEBE** usar **PascalCase** en los siguientes campos canonicos:

| Campo | Convencion | Ejemplo correcto | Ejemplo incorrecto (rompe deploy) |
|-------|-----------|------------------|------------------------------------|
| `title` en object JSON (`objects/*.json`) | PascalCase | `"title": "Activity"` | `"title": "activity"` |
| `references` cross-object FK (`objects/*.json`) | PascalCase del object referenciado | `"references": "Workflow"` | `"references": "workflow"` |
| Filename de layout (`config/layouts/*.json`) | `default_{ObjectName}_{mode}.json` PascalCase | `default_Activity_view.json` | `default_activity_view.json` |
| `id` interno del layout JSON | idem filename | `"id": "default_Activity_view"` | `"id": "default_activity_view"` |
| `name` interno del layout JSON | idem filename | `"name": "default_Activity_view"` | `"name": "default_activity_view"` |
| `objectName` interno del layout JSON | PascalCase del object | `"objectName": "Activity"` | `"objectName": "activity"` |
| GraphQL resolver return type (`logic/*.schema.graphql`) | PascalCase | `): Activity!` | `): activity!` |
| Event filename (`events/*.json`) | PascalCase `{ObjectName}-{action}.json` | `Activity-create.json` | `activity-create.json` |
| Event `id` field | PascalCase + `:` separator | `"id": "Activity:create"` | `"id": "activity:create"` |
| Event `trigger.objectType` | PascalCase | `"objectType": "Activity"` | `"objectType": "activity"` |
| Enum values que referencian object names (e.g. polimorficos) | PascalCase | `"enum": ["Activity", "Offering"]` | `"enum": ["activity", "Offering"]` |
| `defaultObjects` en `config/app.json` | PascalCase | `"defaultObjects": ["Activity", ...]` | `"defaultObjects": ["activity", ...]` |
| Relation display field names en layouts (`relationDisplayFields`) | PascalCase del object | `"WorkflowStatus": "name"` | `"workflowStatus": "name"` |

**Excepciones (lowercase permitido)**:

- **Capabilities** (`capabilities.json`): formato `objectname:action` lowercase per CLAUDE.md (`Object-level: objectname:view`). Es un namespace de permisos, NO un model name reference.
- **`core_` prefixed core infrastructure models** (e.g. `core_User`, `core_Role`, `core_RoleAssignment`): conservan su prefix lowercase + suffix PascalCase. NO renombrar a `Core_User`.
- **i18n translation keys** generales que NO referencien object names (e.g. `"loading": "Cargando..."`): casing libre per dominio.
- **Field names dentro de un object** (propiedades del JSON schema): camelCase (`workflowId`, `currentStatusId`) — esto NO viola la rule porque NO son refs a object names sino nombres de campo.

## Why

El codegen del platform ([`object-manager/src/services/fileParsing.js:209-213`](https://bitbucket.org/uplanner/object-management/src/develop/src/services/fileParsing.js)) lee el campo `title` del object JSON **directo sin transformacion** y lo usa como nombre del modelo Prisma:

```js
export function getModel(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return data.title;  // ← USA EL TITLE DIRECTO COMO MODEL NAME
}
```

Si `title` es lowercase, el codegen produce `model activity {}` (lowercase) en `prisma/{tenant}/schema.prisma`. Esto rompe el deploy en al menos 4 capas:

1. **Prisma schema convention**: el resto del platform usa PascalCase (`model Person`, `model OrgUnit`, `model Institution`, `model CurricularSection`). Lowercase es inconsistente y rompe expectations del Prisma client TS codegen.
2. **GraphQL schema codegen**: el cliente GraphQL del suite genera types PascalCase (Apollo codegen convention). Resolvers lowercase generan schema mismatch al compilar.
3. **Linux FS case-sensitivity**: en ambientes de deploy (Linux), `activity != Activity`. Cualquier consumer hardcoded a PascalCase (suite, codegen del client GraphQL) falla con "Layout not found" o "table does not exist" silent failures.
4. **LayoutOrchestrator resolution**: el suite resuelve `default_{ObjectName}_{mode}` con PascalCase per CLAUDE.md (`Default layout naming convention: default_Person_view`). Lowercase filenames no matchean → "Layout not found" runtime errors al abrir RecordDetail.

El sync mechanism ([`object-manager/scripts/sync/fileSync.js:431`](https://bitbucket.org/uplanner/object-management/src/develop/scripts/sync/fileSync.js)) tambien propaga el `title` directo a la BD como `objectName`, asi que el problema se replica a la tabla `up1_layen_layout`.

**Caso historico**: TICKET-019 (HU4 rename `academicActivity → activity`) introdujo objects + layouts lowercase. TICKET-025 mantuvo el lowercase al renombrar layouts. Clemente Jara detecto el deploy block en ambientes y abrio `hotfix/casing` (4 commits). TICKET-028 adapta la intent del hotfix sobre develop y crea esta RULE para prevenir recurrencias.

## Where

Aplica a TODOS los mods en `mods/*` que definan objects, layouts, eventos o resolvers custom:

- **Files**:
  - `mods/{mod}/objects/*.json` — campo `title` + `references` cross-object
  - `mods/{mod}/config/layouts/*.json` — filename + `id` + `name` + `objectName`
  - `mods/{mod}/events/*.json` — filename + `id` + `trigger.objectType`
  - `mods/{mod}/logic/*.schema.graphql` — resolver return types
  - `mods/{mod}/config/app.json` — `defaultObjects` array
  - `mods/{mod}/lang/*.json` — values que referencien object names (enums polimorficos)

- **Tables**:
  - `up1_layen_layout.objectName` — derivado del `title` via sync (no editar manual)
  - `up1_layen_layout.id` + `.name` — derivados del filename de layout JSON

- **Layers**: frontend (layouts JSON), backend (GraphQL schemas, events), database (Prisma model name), codegen (object-manager generatePrismaSchema.js)

## When

**Siempre** que se cumpla cualquiera de:

1. Se cree un object JSON nuevo en cualquier mod.
2. Se cree un layout JSON nuevo en cualquier mod.
3. Se cree un evento JSON nuevo en cualquier mod.
4. Se cree o modifique un GraphQL resolver schema (.graphql) con return type del object.
5. Se renombre un object existente (e.g. `academicActivity → activity` debe ser `academicActivity → Activity`).
6. Se referencie un object cross-object via FK (`references`) o cross-mod via `associatedLayoutConfigs.layoutId`.

**Acciones obligatorias antes de commit / merge**:

- Validar via grep que `title` de cada object es PascalCase
- Validar que filenames de layouts siguen patron `default_{PascalCase}_{mode}.json`
- Correr `npm run codegen` localmente (o equivalente) para confirmar que Prisma schema regenera `model {PascalCase}`
- Correr tests integration que validan layout naming (e.g. `tests/integration/layouts-declared.test.ts` espera PascalCase)

## Verification

### Grep checks (deterministicos, ejecutables en CI o pre-commit hook)

```bash
# Test 1 — Object titles PascalCase: 0 matches lowercase esperado
grep -rE '"title":\s*"[a-z][a-zA-Z]*",' mods/{mod}/objects/ ; \
  test $? -eq 1 # exit 1 = no match = pass

# Test 2 — Object references PascalCase: 0 matches lowercase a object names del mod
grep -rE '"references":\s*"(activity|workflow|workflowStatus|workflowTransition|workflowTransitionHistory)"' mods/{mod}/objects/ ; \
  test $? -eq 1

# Test 3 — Layout filenames PascalCase: lista debe ser solo PascalCase
ls mods/{mod}/config/layouts/default_*.json | grep -E "default_[a-z]" ; \
  test $? -eq 1

# Test 4 — objectName fields en layouts PascalCase
grep -rE '"objectName":\s*"[a-z]' mods/{mod}/config/layouts/ ; \
  test $? -eq 1
# (excepcion: rt__ recordtypes son lowercase intencionalmente)

# Test 5 — GraphQL resolver types PascalCase
grep -rE ":\s*(activity|workflow|workflowStatus|workflowTransition|workflowTransitionHistory)!" mods/{mod}/logic/ ; \
  test $? -eq 1
```

### Tests integration

Cualquier mod nuevo DEBE incluir un test `tests/integration/layouts-declared.test.ts` (o equivalente) que:
- Verifique que filenames de layouts siguen patron PascalCase
- Verifique que `objectName` interno coincide con PascalCase del title del object
- Verifique que `id` + `name` internos del layout coinciden con filename

### Codegen output check

Post-codegen, validar:
```bash
grep -E "^model {PascalCaseName} " object-manager/prisma/{tenant}/schema.prisma | wc -l
# Esperado: 1 match por cada object PascalCase del mod
```

### CI hook (recomendado, no implementado al momento de crear la rule)

Pre-commit / pre-merge hook que ejecute los 5 grep checks anteriores como gate automatico. Issue para implementar: pendiente.

## Examples

### Ejemplo positivo (sigue la rule)

`mods/curriculum-design/objects/Activity.json`:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Activity",
  "type": "object",
  "properties": {
    "workflowId": {
      "type": "string",
      "isForeignKey": true,
      "references": "Workflow",
      "targetField": "id"
    }
  }
}
```

`mods/curriculum-design/config/layouts/default_Activity_view.json`:
```json
{
  "id": "default_Activity_view",
  "name": "default_Activity_view",
  "objectName": "Activity",
  "layoutType": "RecordDetail"
}
```

`mods/curriculum-design/logic/activity.schema.graphql`:
```graphql
extend type Mutation {
  updateActivityValidated(id: String!, input: UpdateActivityValidatedInput!): Activity!
}
```

`mods/curriculum-design/events/Activity-create.json`:
```json
{
  "id": "Activity:create",
  "trigger": {
    "objectType": "Activity",
    "operation": "create"
  }
}
```

### Ejemplo negativo (viola la rule — bloquea deploy)

`mods/curriculum-design/objects/activity.json`:
```json
{
  "title": "activity",            // ❌ lowercase title
  "properties": {
    "workflowId": {
      "references": "workflow"    // ❌ lowercase ref
    }
  }
}
```

`mods/curriculum-design/config/layouts/default_activity_view.json`:  ❌ lowercase filename
```json
{
  "id": "default_activity_view",  // ❌ lowercase id
  "objectName": "activity"        // ❌ lowercase objectName
}
```

```graphql
updateActivityValidated(...): activity!  // ❌ lowercase resolver type
```

**Por que falla cada uno**: ver seccion `## Why` arriba — codegen produce `model activity {}` lowercase, suite consumer espera PascalCase, deploy en Linux FS rompe con "table not found" / "Layout not found".

## Migracion de datos legacy — patron mod-internal canonico (NO SQL out-of-band)

Cuando un mod ya tiene filas en BD con casing lowercase y se refactoriza a PascalCase, **NO usar SQL scripts externos** en `scripts/migrations/*.sql` ejecutados manualmente con `psql`. Razon: no hay forma confiable de ejecutarlos en deploy production sin DBA intervention manual (caso TICKET-025 — su SQL nunca corrio en production, las filas legacy quedaron).

**Patron canonico**: usar el mecanismo de **seeds del mod** (`mods/{mod}/seed/_data-*.js` + `seed/seed.js` entrypoint), que se invoca automaticamente con `npm run seed`. Cada loader debe ser:

1. **Idempotente**: re-corrida sin side effects (detectar si la migracion ya se aplico)
2. **Scope-restricted**: filtrar por `tenantId` apropiado (e.g. UPU para Phase 1 — DECISION-012)
3. **Prisma-client based**: usar el client tipado, NO `prisma.$executeRaw` con SQL string
4. **Handle ambas orientaciones temporales**: si sync corre ANTES del seed, los nuevos rows ya existen y el seed limpia orphans. Si seed corre antes que sync, el seed renombra en place

**Template de loader (TICKET-028 reference)**:

```js
// mods/{mod}/seed/_data-{descriptor}-migration.js
export async function loadXxxMigration(prisma, tenantId) {
  if (tenantId !== 'UPU') {
    return { skipped: true, reason: `tenant ${tenantId} fuera de scope` };
  }

  const legacyRows = await prisma.{table}.findMany({
    where: { /* condicion que detecta legacy state */ },
  });

  if (legacyRows.length === 0) {
    return { migrated: 0, skipped: false, total: 0 }; // idempotente: no-op
  }

  let renamed = 0;
  let deleted = 0;
  for (const legacy of legacyRows) {
    const existsNew = await prisma.{table}.findFirst({ /* condicion que detecta version nueva */ });
    if (existsNew) {
      // sync ya creo la version nueva: DELETE el orphan
      await prisma.{table}.delete({ where: { id: legacy.id } });
      deleted++;
    } else {
      // no existe: UPDATE en place (preserva id, FKs)
      await prisma.{table}.update({ where: { id: legacy.id }, data: { /* PascalCase */ } });
      renamed++;
    }
  }

  return { renamed, deleted, skipped: false, total: legacyRows.length };
}
```

**Registro en seed.js**:

```js
import { loadXxxMigration } from './_data-xxx-migration.js';

// ...dentro de export default async function seed(prisma, tenantId)...
const xxxMigration = await loadXxxMigration(prisma, tenantId);
console.log(`  ✓ XxxMigration: ${xxxMigration.renamed}/${xxxMigration.deleted}/${xxxMigration.total}`);
```

**Test mock obligatorio**: cualquier mod con tests `seed-entry.test.ts` debe mockear el nuevo loader en `vi.hoisted` + `vi.mock` + `beforeEach.mockReset().mockResolvedValue(defaultResult)`.

**Implementacion de referencia**: [`mods/curriculum-design/seed/_data-layouts-pascalcase-cleanup.js`](mods/curriculum-design/seed/_data-layouts-pascalcase-cleanup.js) (TICKET-028 — limpieza de filas legacy `up1_layen_layout` lowercase → PascalCase).

## Operational notes — restart dev server post-sync (codegen + typedefs)

Cuando un cambio toca **codegen** (titles, references, resolver types) o **typedefs** (`object-manager/src/graphql/typeDefs/dynamic.js`, `mods.js`) — directa o indirectamente via `npm run sync` — el **object-manager dev server DEBE reiniciarse** para que la GraphQL schema runtime refleje los nuevos types.

**Por que**:

- Suite (Nuxt) tiene **hot-reload** + Apollo client refetch del schema → recarga automatica al primer query post-restart del backend
- Object-manager **NO tiene hot-reload de typedefs** → los typedefs se cargan UNA VEZ al startup del Apollo Server desde `dynamic.js` + `mods.js`. Cambios al archivo NO se cargan dinamicamente
- Resultado del olvido: GraphQL schema runtime queda **stale** (e.g., types lowercase pre-sync siguen activos aunque el archivo en disco ya este PascalCase). El suite hace queries con types nuevos PascalCase que el server rechaza con errores genericos como "Error al cargar {objeto}"

**Cuando aplica el restart obligatorio**:

| Cambio | Restart om necesario? |
|--------|-----------------------|
| `npm run sync` (cualquier Phase 3+5+8 — codegen + logic + seed) | **Si** |
| `npm run codegen` directo | **Si** |
| Edit manual de `objects/*.json` `title` o `references` | **Si** (cambia el schema generado) |
| Edit manual de `logic/*.schema.graphql` resolver types | **Si** |
| Edit de capabilities.json | No (capabilities se cargan dinamico) |
| Edit de layouts JSON | No (layouts viven en BD via sync, suite los lee al render) |
| Cambios solo en componentes Vue/SFCs del mod | No (suite hot-reload los toma) |
| Edit de tests, docs, i18n | No |

**Como restart canonico** (depende del setup del dev — un patron comun en up1):

```bash
# Opcion A — usar tu script personal (si lo tenes — ej. `up1-start`)
up1-start

# Opcion B — manual: kill + restart object-manager
pkill -f "node src/index.js"
cd /Users/edobacon/Workspace/uplanner/up1/object-manager
npm run dev

# Opcion C — docker compose si el dev usa eso para om
docker compose restart object-manager
```

**Verificacion post-restart** (curl introspection):

```bash
curl -sX POST http://localhost:4000/graphql -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name } } }"}' | \
  python3 -c "import sys, json; d=json.load(sys.stdin); types=[t['name'] for t in d['data']['__schema']['types']]; print(sorted([t for t in types if t.lower().startswith('activity') or t.lower().startswith('workflow')]))"
```

Esperado post-restart correcto: types PascalCase (`Activity`, `Workflow`, etc.). Si aparecen lowercase (`activity`, `workflow`): el server no se reinicio o cargo el archivo viejo.

**Caso historico** (TICKET-028, 2026-05-20): la sync regenero `dynamic.js` correctamente a PascalCase, BD se actualizo, layouts se renombraron — pero el dev server llevaba 8h corriendo con la schema vieja en memoria. Suite hacia queries con types nuevos contra schema viejo y devolvia "Error al cargar activity". Bug aparente del fix de codigo cuando en realidad era cache del runtime. **Restart resolvio en 30 segundos**.

## Source

- **Discovered in**: TICKET-028, Session 0 (intake-explore 2026-05-20)
- **Evidence**: Clemente Jara detecto deploy block via `hotfix/casing` (4 commits, ultimo `771804e` 2026-05-20). Su branch tiene merge-base `938eda1` (pre-TICKET-025), generando conflicts al merge directo. TICKET-028 aplico la intent sobre develop actual + creo esta RULE para prevenir recurrencia.
- **Related**:
  - SPEC-010-fix-casing-pascalcase-objects (spec del fix)
  - SPEC-004-rename-activity-workflow (TICKET-019 — origen del lowercase)
  - SPEC-006-hu4-followup-rename-cleanup-badge-status (TICKET-025 — mantuvo el lowercase)
  - RULE-platform-001 (CSS inline para SFCs custom Vueform — convencion adjacent)
  - CLAUDE.md de up1 (`Default layout naming convention: default_{ObjectName}_{mode}`)
- **Anti-patterns documentados**: rebase mecanico de `hotfix/casing → develop` sin coordinar — borra files de UPONE-1098 + introduce conflicts massivos.
