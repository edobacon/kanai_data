# HU2 (UPONE-1098) — Handoff al equipo de desarrollo: Audit de RecordTypes polimorficos

> **Status**: handoff para discusion estructural
> **Owner**: Eduardo Bacon (eduardo.bacon@uplanner.com)
> **Fecha**: 2026-05-20
> **Sprint**: SP3 — HU2 changeLog audit (universal)
> **Ticket**: TICKET-020 / UPONE-1098

---

## TL;DR

La implementacion de **audit field-by-field** para `recordtypes polimorficos` (`rt__X__curricularsection` — Modality, LearningOutcome, EvaluationComponent, Content, Session, Bibliography, CustomSection) **es fragil con el alcance "mod-only"** del ticket porque requiere replicar logica del platform (`updateInstance` generic).

Se entrego B1.a — ~280 lineas del mod sobrescribiendo `Mutation.updateInstance`. Tras debate de alcance, **se decidio Opcion 3 (hibrido)**:

- **Mantener el wrapper B1.a** (`polymorphicUpdate.resolver.js`) para recuperar el diff field-by-field user-visible.
- **Mitigar la fragilidad** con **8 tests unit** (`tests/unit/polymorphicUpdate.test.js`) que actuan como safety net: si el platform cambia su logica `updateInstance` generic y rompe el wrapper, los tests fallan en CI antes que la regresion llegue a prod.
- **Mantener la consolidacion L40** al padre activity (zero core touch): cambios de hijos polimorficos se registran con `entityType=activity, entityId=ownerId, sourceRefId=<id hijo>, comment="Cambio en <recordType>: <name>"`.
- **3 columnas adicionales del JSON Schema** (`entityName`, `sourceRefName`, `sourceRefType`) que el resolver popula al inserter — habilitan UI legible (nombres en vez de cuids) sin requerir resolver custom de relaciones polimorficas abiertas.
- **Trackear B-pre-fetch-core-rt** como fix estructural del platform (modificar `withEventPublish.js:56` para detectar rt__ y resolver el modelo base) — eliminaria el wrapper del mod a futuro.

Este documento captura **lo intentado, lo aprendido, lo entregado y lo faltante** para que el equipo de desarrollo evalue alcance estructural en proximas iteraciones.

---

## Contexto del problema

### Modelo de datos del platform UP1

UP1 soporta **polimorfismo abierto** via `RecordTypes`:

- `CurricularSection` es la entidad base que tiene `id` standalone (`@id @default(cuid())`).
- Cada subtype polimorfico (`rt__Modality__curricularsection`, `rt__LearningOutcome__curricularsection`, etc.) es una **tabla extension 1:1** referenciada por `curricularsectionId` (FK al base).
- Los modelos Prisma de los rt__ **NO tienen `id` propio** — usan `curricularsectionId` como key.

```prisma
model CurricularSection {
  id           String @id @default(cuid())
  ownerType    String  // 'activity'
  ownerId      String  // id de la activity padre
  recordType   String  // 'Modality' / 'LearningOutcome' / etc.
  name         String
  // ...
}

model rt__Modality__curricularsection {
  curricularsectionId  String  @unique
  curricularsection    CurricularSection @relation(...)
  // fields especificos del subtype
  code         String?
  deliveryMode String?
  theoryHours  Int?
  // ...
}
```

### Mutation generic `updateInstance`

El platform expone `Mutation.updateInstance(objectType, id, data)` que detecta rt__ patterns y hace:
1. Update del base via `prisma[baseModel].update({ where: { id }, ... })`.
2. Upsert del rt__ via `prisma[rtModel].upsert({ where: { [baseObjectLower + 'Id']: id }, ... })`.
3. Upsert de extension ext__ si aplica.

Ver `object-manager/src/graphql/resolvers/instance.resolver.js:2804-2925`.

### Decorator `withEventPublish` (UPONE-1052)

`object-manager/src/events/decorators/withEventPublish.js:56` hace **pre-fetch del state pre-update** para incluirlo en el evento Pub/Sub como `_previousData`:

```js
if (event && (operation === 'update' || operation === 'delete') && prisma && args.id !== undefined) {
  try {
    const modelName = objectType.charAt(0).toLowerCase() + objectType.slice(1);
    const idValue = isNaN(Number(args.id)) ? args.id : Number(args.id);
    if (prisma[modelName] && typeof prisma[modelName].findUnique === 'function') {
      previousRecord = await prisma[modelName].findUnique({ where: { id: idValue } });  // ← FALLA para rt__
    }
  } catch (error) {
    console.error(`⚠️  Failed to pre-fetch previous record for ${objectType}.${operation}:`, error.message);
  }
}
```

**Para `objectType = "rt__Modality__curricularsection"`**, esto falla con:

```
Unknown argument `id`. Did you mean `OR`? Available options are marked with ?.
```

Porque el modelo rt__ no tiene `id`, usa `curricularsectionId`. El `_previousData` queda `undefined` y el evento se publica al canal `core` SIN la info necesaria para diff field-by-field.

---

## Lo intentado (cronologico)

### Issue A — Columna `createdAt` no renderiza en tab Historial

**Sintoma**: el layout declaraba `{ "key": "createdAt", "label": "Cuando", "sortable": true }` pero la columna no aparecia en el tab Historial.

**Causa raiz (L36)**: `RecordList` filtra las columnas del layout cruzandolas contra `availableFields` que viene del backend `getObjectFields`. Si el field NO esta en `core_FieldDefinition`, la columna se **descarta silenciosamente**. El JSON Schema del `changeLog` no declaraba `createdAt` (era heredado de `common.json`) — codegen lo agregaba al schema Prisma pero NO sincronizaba el `core_FieldDefinition`.

**Fix mod-only**: declarar `createdAt` explicito en `mods/curriculum-design/objects/changeLog.json` con `format: "date-time"`. Codegen es resiliente a duplicacion (linea 360 de `generatePrismaSchema.js`).

**Side effect (L38)**: cuando se declara explicit, codegen pierde el `@default(now())` heredado. Workaround: el resolver pasa `createdAt: new Date()` explicit en cada `prisma.changeLog.create`.

### Issue B — Cambios en RecordList polimorficos no registran changeLog

**Sintoma**: al editar una Modalidad/Sesion/Evaluacion desde la UI, no se grababa nada en `changeLog`.

**Causa raiz 1 (L37)** — **n8n IF v2 quirks**: el flow `audit-capture` usaba un IF node con regex `^(activity|CurricularSection|CurricularLink)$`. Para eventos `rt__Modality__curricularsection:update`, el regex NO matcheaba (necesitaba extension). Tras intentar 6 variantes del regex (`\w+`, `[a-zA-Z0-9_]+`, anchors, operators distintos — todos fallaron) descubrimos que **IF v2 con `leftValue: ={{ $json.objectType }}` evalua mal expressions en algunos casos** — items salen por FALSE branch aunque el equals literal deberia matchear. **Fix**: reemplazar IF node por `n8n-nodes-base.code` typeVersion 2 con JS directo (`auditableRe.test(item.json.objectType)`).

**Causa raiz 2 (L39)** — **withEventPublish.js no pre-fetch para rt__**: aunque el flow capturaba el evento, el `_previousData` no llegaba al payload. El decorator falla silenciosamente con "Unknown argument id" porque el modelo rt__ no tiene `id`. Sin previousData, no hay diff field-by-field — el resolver registraba 1 row con `field/oldValue/newValue=null + comment="Update sin previousData (recordtype polimorfico — L39)"`.

**Decision A (L40)** — **Consolidacion al padre activity**: en vez de registrar rows con `entityType=curricularSection, entityId=<id Modalidad>` (que no aparecerian en el Historial del activity), el resolver detecta `ownerType=activity + ownerId` y redirige a `entityType=activity, entityId=ownerId, sourceRefId=<id hijo>, comment="Cambio en Modality: <name>"`. **Justificacion**: el user quiere ver TODOS los cambios del activity en su tab Historial, no en cada Modalidad como item individual.

**Decision B1.a (L41)** — **Override del Mutation.updateInstance desde el mod** para resolver L39 sin core touch. El platform UP1 permite override porque `resolverIndex.js:114` spread `...dynamicResolvers.mutations` al final del bloque Mutation. Implementacion:

1. Match `^rt__\w+__curricularsection$` → procesa en mod; sino delega al generic via dynamic import.
2. Pre-fetch via base `CurricularSection` (que SI tiene id standalone) + relacion al rt__ via include → flatten = previousData.
3. Replica logica rt__ del generic (lineas 2827-2925 de `instance.resolver.js`): split fields base/rt__/ext/baseExt + update base + upserts.
4. Publish manual via `publishToChannel` con `_previousData` en envelope.
5. **NO** invocamos el generic (que tambien publicaria sin previousData → doble evento + ruido).

**Resultado smoke**: edicion de Modalidad de TIR101 → row en changeLog con `entityType=activity, entityId=<TIR101_id>, action=Update, source=DirectEdit, field=name, oldValue="Diurno Flexible", newValue="Diurno Flexible222", sourceRefId=<id Modalidad>, comment="Cambio en Modality: Diurno Flexible222"`.

---

## Por que B1.a es fragil

| Aspecto | Riesgo |
|---------|--------|
| **~280 lineas del platform replicadas** en el mod | Si el generic `updateInstance` cambia su logica rt__ (campos custom, extensions, casing rules), el wrapper queda desincronizado. Bugs silenciosos en custom fields/extensions futuros |
| **Sin test integration** que compare shape de response generic vs wrapper | Cualquier change del platform que afecte la logica rt__ se descubrira solo en prod |
| **No cubre create/delete** de rt__ | Solo `update` esta cubierto. `create` y `delete` siguen sin previousData (no hay pre-update state, no es el mismo problema, pero el wrapper no las maneja) |
| **Concepto: mod-only resolviendo limite del decorator core** | El verdadero fix es estructural en `withEventPublish.js`. Cualquier mod futuro que use rt__ polimorficos enfrentara el mismo problema y necesitara replicar el wrapper |
| **Dynamic imports de paths del platform** | Si el platform reestructura paths, el wrapper falla al cargar. Mitigacion: dual candidates (synced + source) — heredado de `mods/ai-agent` pero igual fragil |

---

## Decision final: Opcion 3 hibrido — wrapper B1.a + test safety net

Tras varias iteraciones (revert + pivot a global + recovery), se llego a la **Opcion 3** que combina:

| Pieza | Justificacion |
|-------|---------------|
| Mantener wrapper `polymorphicUpdate.resolver.js` activo | El user reporto que la UI con campo/antes/despues vacios (consecuencia de revertir B1.a) no servia como auditoria. Recuperar el diff es prioritario para UX |
| Agregar 8 tests unit del wrapper (`tests/unit/polymorphicUpdate.test.js`) | Safety net contra cambios del platform que rompan la replica de logica rt__. Si el generic `instance.resolver.js` cambia, los tests fallan en CI antes que la regresion llegue a prod |
| Mantener L40 consolidacion + 3 campos legibles (entityName/sourceRefName/sourceRefType) | UX completa: tabla muestra "Actividad: Introduccion a las Redes" + "Seccion: Modality" + diff de campos |
| Trackear B-pre-fetch-core-rt como must del equipo de plataforma | Fix estructural elimina el wrapper del mod — 30 lineas en `withEventPublish.js` reemplazan 280 lineas del mod |

### Cobertura del safety net (8 tests unit, 100% pass)

| Test | Que valida |
|------|-----------|
| Intercepts rt__Modality__curricularsection runs pre-fetch + update + upsert | Happy path del wrapper |
| Pre-fetches base record + rt__ relation BEFORE the update | Ordering: previousData ANTES de la mutation |
| Routes fields to correct buckets: base/rt__/ext | Replica de la logica de split del generic |
| Returns shape { id, data, extended } compatible | Compatibilidad con consumers del platform |
| Throws when prisma missing from context | Defensive guard |
| Throws when base model cannot be resolved | Defensive guard contra reset DB |
| Matches rt__Modality__curricularsection canonical | RT_PATTERN regex |
| Matches todos los 7 subtypes | Cobertura de subtypes existentes |

### Lo que queda del scope original (mantenido):

1. **Objeto `changeLog`** + tabla BD + indexes (S8 — TC-1 ✅, TC-2 ✅)
2. **Capabilities** `<obj>:audit` (3 nuevas: activity, curricularsection, curricularlink) (S8 — TC-12 ✅)
3. **i18n** para enums action/source + labels (S8)
4. **Resolver `recordAuditEvent`** con normalizacion entityType (INT-4), source rules (REQ-PRESERVE-05), excluded fields (REQ-PRESERVE-04), JSON >10KB hash+truncate (REQ-PRESERVE-02) (S9 — TC-3, TC-4, TC-5 ✅; TC-17 ✅)
5. **Flow n8n `audit-capture`** con Code node + regex `^(activity|CurricularSection|CurricularLink|rt__[a-zA-Z0-9_]+__(activity|curricularsection|curricularlink))$` (Issue B fix — TC-7 ✅)
6. **L40 — Consolidacion al padre activity** en el resolver: cambios de hijos polimorficos se registran con `entityType=activity, entityId=ownerId, sourceRefId=<id hijo>, comment="Cambio en <recordType>: <name>"`. **Habilita filtrar por activity en el changelog general**.
7. **`createdAt: new Date()`** explicit en cada `prisma.changeLog.create` (L38 workaround)
8. **Tab Historial dentro de cada activity** (10 layouts) mostrando filtro `entityType=activity AND entityId={{parentId}}` — incluye cambios propios + consolidados de hijos
9. **changeLog general** (`default_changeLog_list.json`) con **filtros amplios**: createdAt, entityType, entityId, userId, action, source, field, sourceRefId, comment. **Habilita filtro por activity** via input de texto sobre `entityId`.

### Lo que se revierte:

1. **`polymorphicUpdate.resolver.js`** — wrapper de 280 lineas eliminado del mod.
2. **21 event JSONs** `rt__*__curricularsection-{create,update,delete}.json` — eliminados (sin el wrapper, el pre-fetch falla siempre; los event JSONs no aportan).
3. **Tab Historial detallado por hijo polimorfico** (Modalidad/Sesion/etc. como items independientes) — descartado. El cambio se ve en el Historial del activity padre (via L40) y en el changeLog general.

### UX resultante:

| Cambio del usuario | Donde aparece | Detalle |
|--------------------|---------------|---------|
| Edit campo del activity (ej. `name`, `description`) | Tab Historial dentro del activity + changeLog general | Diff field-by-field (TC-4 ✅) |
| Edit rt__ polimorfico (Modalidad/Sesion/etc.) | Tab Historial dentro del activity padre + changeLog general | 1 row con `comment="Cambio en <recordType>: <name>"`, **sin diff de campos** (L39 limite) |
| Create/Delete de cualquier objeto | Idem | 1 row con `action=Create|Delete` |
| Transition de workflow (HU3 integration) | Tab Historial dentro del activity + changeLog general | 1 row con `action=StateTransition`, FK al `workflowTransitionHistory` (TC-22 ✅) |

---

## Lo faltante — recomendaciones al equipo de desarrollo

### B-pre-fetch-core-rt (priority `must`) — fix estructural del platform

**Que**: modificar `object-manager/src/events/decorators/withEventPublish.js:56` para detectar `objectType.startsWith('rt__')` y resolver el modelo base correcto.

**Como** (esbozo de cambio en el decorator):

```js
// withEventPublish.js linea 56-71
if (event && (operation === 'update' || operation === 'delete') && prisma && args.id !== undefined) {
  try {
    let modelName, whereClause;

    // NUEVO: detectar rt__ y resolver al modelo base via curricularsectionId
    const rtMatch = /^rt__\w+__(\w+)$/.exec(objectType);
    if (rtMatch) {
      const baseObjectLower = rtMatch[1]; // ej. 'curricularsection'
      // Resolve casing correcto del base model (lowercase → exact case)
      const baseObjDef = await prisma.core_ObjectDefinition.findFirst({
        where: { name: { equals: baseObjectLower, mode: 'insensitive' } },
        select: { name: true }
      });
      const baseModelName = baseObjDef?.name && prisma[baseObjDef.name] ? baseObjDef.name : baseObjectLower;

      // Pre-fetch el base + include del rt__ para flatten = previousData completo
      const idValue = isNaN(Number(args.id)) ? args.id : Number(args.id);
      const base = await prisma[baseModelName].findUnique({
        where: { id: idValue },
        include: { [objectType]: true },
      });
      if (base) {
        const rtSlice = base[objectType] || {};
        const { [`${baseObjectLower}Id`]: _fk, ...rtRest } = rtSlice;
        const baseClone = { ...base };
        delete baseClone[objectType];
        previousRecord = { ...baseClone, ...rtRest };
      }
    } else {
      // Comportamiento actual (sin rt__): findUnique por id directo
      modelName = objectType.charAt(0).toLowerCase() + objectType.slice(1);
      const idValue = isNaN(Number(args.id)) ? args.id : Number(args.id);
      if (prisma[modelName] && typeof prisma[modelName].findUnique === 'function') {
        previousRecord = await prisma[modelName].findUnique({ where: { id: idValue } });
      }
    }
  } catch (error) {
    console.error(`⚠️  Failed to pre-fetch previous record for ${objectType}.${operation}:`, error.message);
  }
}
```

**Beneficio**:

- Reemplaza el wrapper del mod (~280 lineas eliminadas).
- Habilita diff field-by-field para **todos los rt__ polimorficos del platform** (no solo curriculum-design).
- Sin mantenimiento de logica replicada.

**Estimacion**: ~30 lineas en el decorator + tests integration (1 happy path per rt__ pattern). ~3-5 SP.

**Aplicabilidad**: futuros mods que usen RecordTypes polimorficos enfrentaran exactamente el mismo problema. Este fix los resuelve a todos.

### B-historial-por-item-hijo (priority `could`)

**Que**: opcion alternativa a la consolidacion L40 — registrar 2 rows por cambio: 1 con `entityType=activity` (consolidacion al padre, aparece en Historial del activity) + 1 con `entityType=curricularSection, entityId=<id Modalidad>` (aparece si el user abre la Modalidad como item individual).

**Cuando implementar**: si feedback de usuarios indica que quieren ver "que paso con esta Modalidad" como item independiente.

**Costo**: cambio en el resolver del mod (~10 lineas adicionales: doble create con misma data, dimensiones distintas). Sin tocar core.

### B-storybook-test (priority `should`)

**Que**: test integration que compare shape de response de `updateInstance` generic vs cualquier wrapper futuro. Sin esto, cualquier cambio al platform que afecte la logica rt__ pasara inadvertido hasta que un usuario reporta bug.

### B-cache-policy-historial (priority `could`)

**Que**: UX fix — al volver al tab Historial via navegacion SPA (sin F5), el listado muestra rows stale por el `cache-first` default de Apollo. Opciones:

- F1 (descartada en HU2) — cambiar default global a `cache-and-network` en `useDataFetching.ts:143`. Toca platform layout, afecta TODOS los RecordList.
- F2 (recomendada) — agregar prop opcional `fetchPolicy` al RecordList exposable via layout JSON. Default `cache-first`, configurable a `cache-and-network` por layout. Sin afectar otros listados.

**Estimacion**: ~10 lineas en `layout/src/composables/useDataFetching.ts` + extension del JSON schema del layout. ~1 SP.

### B-follow-up-custom-table (priority `should`)

**Que**: componente custom Vue `HistorialAuditLogElement.vue` replicando el patron `CompositeSectionTreeElement.vue` del mod, para entregar UX rica con:

- Badges semanticos por `action` (color)
- Diff visual lado a lado para `oldValue → newValue`
- Avatar chip para `User`
- Expand row para `comment` largo

**Cuando**: post-validacion en sandbox UPU para acreditacion academica. Si la UX texto plano del scope A se valida suficiente, no se implementa.

**Estimacion**: ~800-950 lineas en el mod. ~8 SP.

---

## Lecciones aprendidas (reusables)

| Codigo | Aprendizaje | Aplicabilidad |
|--------|-------------|---------------|
| L35 | Vueform tabs render panels como sibling DOM (no `tab-content`/`tab-pane` Bootstrap convention) | Todos los smokes E2E que inspeccionen tabs Vueform |
| L36 | RecordList silencia columnas sin FieldDefinition en BD | Cualquier dev que agregue columnas a layouts de objetos del mod debe verificar el FieldDefinition |
| L37 | n8n IF v2 con expressions en `leftValue` es indeterministico — preferir Code node | Patron reusable cross-mod |
| L38 | Codegen NO aplica `@default(now())` a fields explicit del JSON Schema | Cualquier mod que declare common fields explicitos debe pasar el default desde el resolver |
| L39 | `withEventPublish.js` no pre-fetch para rt__ polimorficos | Limite estructural del platform — afecta CUALQUIER mod con rt__ |
| L40 | Consolidacion al padre activity via `ownerType + ownerId` | Patron reusable para cualquier objeto polimorfico que se quiera auditar en el contexto del padre |
| L41 | Override de mutations generic desde mods es posible via spread order en `resolverIndex.js` | Patron de extensibilidad del platform — usar con cuidado por fragilidad |

---

## Glosario

- **rt__ polimorfico**: tabla extension 1:1 del base via `<base>Id` FK. Sin `id` standalone. Convencion UP1 (`rt__<RecordType>__<base>`).
- **`withEventPublish`**: decorator core que envuelve mutations para publicar eventos Pub/Sub + BullMQ (UPONE-1052).
- **`_previousData`**: campo del envelope del evento que contiene el snapshot del record ANTES de la mutation. Critico para diff field-by-field.
- **L<num>**: Learn numerado del ticket — formato deckard.
- **B-<id>**: item de backlog del ticket — formato deckard.

---

## Archivos relevantes

| Path | Rol |
|------|-----|
| `mods/curriculum-design/objects/changeLog.json` | JSON Schema del objeto audit |
| `mods/curriculum-design/logic/auditCapture.resolver.js` | Resolver del mod — `Mutation.recordAuditEvent` + L40 consolidacion |
| `mods/curriculum-design/logic/auditCapture.schema.graphql` | GraphQL types del mutation |
| `mods/curriculum-design/flows/audit-capture.json` | Flow n8n — Code node + GraphQL mutation node |
| `mods/curriculum-design/events/*-{create,update,delete}.json` | Event JSONs (10: 3 bases × 3 ops + activity-transition) |
| `mods/curriculum-design/config/layouts/default_changeLog_list.json` | RecordList del changeLog general (con filtros amplios) |
| `mods/curriculum-design/config/layouts/default_activity_view.json` | Tab Historial dentro del activity |
| `mods/curriculum-design/capabilities.json` | Capabilities `<obj>:audit` |
| `object-manager/src/events/decorators/withEventPublish.js` | **CORE** — donde aplicar B-pre-fetch-core-rt |
| `object-manager/src/graphql/resolvers/instance.resolver.js:2804-2925` | **CORE** — logica rt__ del generic (referencia) |

---

## Contacto

Eduardo Bacon — eduardo.bacon@uplanner.com

Para discusion estructural del B-pre-fetch-core-rt: agendar revision con el equipo de platform.
