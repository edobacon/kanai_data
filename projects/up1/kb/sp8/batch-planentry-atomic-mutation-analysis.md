# Análisis: mutation batch atómica para `planEntry` (create/update)

> Documento de contexto **independiente de TICKET-120 (UPONE-1539)**. Nace de OQ-4 de ese ticket (atomicidad del flujo guiado de alta modular, REQ-10) pero excede su alcance: la falta de una operación batch atómica es un límite **transversal** del componente de malla. Verificado contra código en `uplanner/up1`, mod `curriculum-design`, 2026-08-06.
>
> **ACTUALIZACIÓN 2026-08-06**: tras verificar que el batch atómico de **create** es **mod-owned** (resolver custom + `context.prisma.$transaction`, precedente `activity-formtemplate.resolver.js:97`), el dev decidió traerlo **dentro de TICKET-120** como **REQ-11** (`createPlanEntriesBatch`, para el alta guiada modular REQ-10). Regla aplicada: "si es mod-only, va en el ticket actual; solo lo que no es mod deriva a otro ticket".
>
> Por lo tanto, **este documento cubre ahora SOLO lo que queda fuera de TICKET-120 por ser core / transversal**:
> - **`updatePlanEntriesBatch`** para el **reorder** drag&drop (transversal — el reorder también aplica al modo secuencial, fuera del alcance modular de TICKET-120).
> - **Opción B**: generalizar un `createManyInstances` en el **CRUD genérico de object-manager** (core, sirve a toda la plataforma).
> - El eventual cambio de **firma del `createInstance` genérico** para aceptar un `tx` (A1), si en TICKET-120 se confirma que hace falta y no basta el fallback `tx` directo.
>
> El `createPlanEntriesBatch` de create para el alta modular ya NO es alcance de este doc (vive en TICKET-120 / REQ-11).

## 1. Qué

Una **mutation de backend que inserte/actualice varias `planEntry` en una sola transacción** (todo-o-nada), de modo que un fallo a mitad **revierte** el conjunto en vez de dejar el server en estado parcial. Candidatas:

- `createPlanEntriesBatch(objectType, data: [JSON!]!): [PlanEntry!]!`
- `updatePlanEntriesBatch(objectType, updates: [JSON!]!): [PlanEntry!]!` (para el reorder)

## 2. Por qué (motivación transversal, no solo REQ-10)

Hoy el componente de malla (`CurriculumMesh`) persiste **en loops secuenciales de mutations `createInstance`/`updateInstance`**, sin atomicidad. Tres flujos lo sufren:

1. **Flujo guiado de alta modular (REQ-10, TICKET-120)**: agregar un curso + sus prerrequisitos faltantes debería ser "una única acción consistente" (maqueta `mockup_v10`). En v1 (client-side) es un loop de creates → si uno falla, quedan los previos.
2. **Alta masiva de obligatorias/electivas**: `buildObligatoriaPlanEntryPayloads` / `buildElectivaPlanEntryPayloads` (`curriculumMesh.logic.ts`) arman **arrays de payloads** que hoy se crean uno por uno.
3. **Drag & drop (reorder)**: `persistPeriodPositionUpdates` (`CurriculumMeshElement.vue:635-652`) hace un loop de `updateInstance`. El propio código lo marca (FIX W3, comentario `.vue:626-634`):
   > *"este loop NO es atómico — una mutation intermedia que falla deja posiciones 'gapeadas' en el server ... Una persistencia batch real requeriría una mutation de backend dedicada (fuera de alcance del mod)."*
   Mitigación actual: en el `catch`, `refetch()` (re-lee la verdad del server) + expone `mutationError`; nunca rollback fake del cliente.

**Consecuencia del estado actual**: estados parciales visibles en el server ante fallo intermedio; la única defensa es re-leer y que el usuario corrija. Para el alta guiada (REQ-10) esto es más sensible (varios inserts encadenados por dependencias).

## 3. Dónde

**Corrección importante respecto al framing inicial de OQ-4** (que asumía "batch → core"):

- El mod **ya declara resolvers custom** mod-owned en `mods/curriculum-design/logic/*.resolver.js` (+ `*.schema.graphql` con `extend type Mutation`), que el sync propaga a `object-manager`. Ej.: `curriculum-create.resolver.js` expone `createCurriculumWithRecordType`.
- El mod **ya usa transacciones**: `activity-formtemplate.resolver.js:97` → `const created = await prisma.$transaction(async (tx) => { ... })`, con `context.prisma` (client **tenant-scoped**).

→ Por lo tanto, la mutation batch atómica es **factible como resolver custom del mod** (`logic/planEntry-batch.resolver.js` + `.schema.graphql`), **sin editar código core de object-manager**. Es **backend, pero mod-owned** (`layer:mod`, mismo patrón que `curriculum-create`/`activity-formtemplate`). Solo sería `layer:core` si se decidiera generalizar un `createManyInstances` en el CRUD genérico de OM (alternativa B abajo).

Ubicación propuesta:
- `mods/curriculum-design/logic/planEntry-batch.resolver.js` (resolver)
- `mods/curriculum-design/logic/planEntry-batch.schema.graphql` (`extend type Mutation`)
- Consumo: `mods/curriculum-design/modsComponents/CurriculumMesh/` (reemplaza los loops de `persistPeriodPositionUpdates` y del alta)

## 4. Cómo

### Opción A — resolver custom del mod con `$transaction` (recomendada, layer:mod)

```graphql
# planEntry-batch.schema.graphql
extend type Mutation {
  "Crea varias planEntry en una sola transaccion (todo-o-nada). Para alta guiada modular (REQ-10) y alta masiva."
  createPlanEntriesBatch(data: [JSON!]!): [PlanEntry!]!
  "Actualiza varias planEntry (period/position) en una sola transaccion. Para el reorder drag&drop."
  updatePlanEntriesBatch(updates: [JSON!]!): [PlanEntry!]!
}
```

```js
// planEntry-batch.resolver.js (esquema)
export const planEntryBatchMutation = {
  createPlanEntriesBatch: async (parent, { data }, context) => {
    const prisma = context.prisma            // tenant-scoped
    return prisma.$transaction(async (tx) => {
      const out = []
      for (const payload of data) {
        // delegar al createInstance generico PASANDO tx, o crear via tx directo
        out.push(await createOne({ payload, tx, context }))
      }
      return out                             // si algo lanza, la tx revierte TODO
    })
  },
  // updatePlanEntriesBatch: analogo con tx sobre updateInstance
}
```

**Tensión de diseño a resolver (disciplina THIN adapter, TICKET-070):** los resolvers custom del mod son "adapters THIN, cero `prisma.create` propios, delegan en el `createInstance` genérico de core". Para el batch hay que elegir:
- **A1**: hacer que el `createInstance`/`updateInstance` genérico de core acepte un **tx opcional** (`context.prisma` o `tx`) → mantiene THIN, pero **toca la firma del genérico de core** (pequeño cambio core, coordinar).
- **A2**: en el resolver batch, usar `tx` directo (`tx.planEntry.create`) → rompe la disciplina THIN (lógica de persistencia en el mod), pero **cero core**. `planEntry` es objeto **base** (sin RecordTypes ni extensión 1:1 — a diferencia de `Curriculum`), así que el create es directo y el riesgo de A2 es bajo.

Decidir A1 vs A2 es el corazón del futuro ticket.

### Opción B — `createManyInstances` genérico en el CRUD de OM (layer:core)

Generalizar un batch en el CRUD auto-generado de object-manager (sirve a todos los objetos, no solo `planEntry`). Más potente y reutilizable, pero **es core** (editar OM), mayor superficie y coordinación (RULE-dev-004). Solo si el equipo quiere la capacidad transversal a toda la plataforma.

### Cliente (ambas opciones)

- Reemplazar `persistPeriodPositionUpdates` (loop de `updateInstance`) por **una** llamada `updatePlanEntriesBatch`.
- Reemplazar el loop de alta (obligatorias/electivas + alta guiada REQ-10) por `createPlanEntriesBatch`.
- Eliminar la mitigación `refetch`-on-catch de W3: la transacción da rollback **real** en el server → el cliente puede confiar en atomicidad (revert visual = simplemente refetch tras error, pero sin estado parcial persistido).
- Tenant isolation: `context.prisma` ya es tenant-scoped; la `tx` la hereda. El client per-tenant no envía `tenantId` (convención del mod).

## 5. Alcance sugerido para el futuro ticket

**Dentro:** `createPlanEntriesBatch` + `updatePlanEntriesBatch` (resolver mod + schema), decisión A1/A2, cableado en la malla (reorder + alta), tests (unit del resolver con tx que revierte ante fallo; smoke de reorder y alta con fallo intermedio → sin estado parcial), regresión de los flujos actuales.
**Fuera:** cambios de modelo; generalización a otros objetos (eso es Opción B, otro ticket); la UX del alta guiada (esa es REQ-10 de TICKET-120, que consume esta mutation si existe).

**Dependencia con TICKET-120:** TICKET-120 REQ-10 v1 es client-side no-atómico (DEC-LOCAL-07). Si este ticket batch se hace **antes**, REQ-10 lo consume y gana atomicidad. Si se hace **después**, REQ-10 v1 se refactoriza para usarlo. No se bloquean mutuamente.

## 6. Riesgos / consideraciones

- **THIN adapter (TICKET-070)**: A2 mete persistencia en el mod; documentar la excepción o preferir A1 (tx-aware en core).
- **`createInstance` tx-aware (A1)**: verificar que el genérico de core (`instanceMutation.createInstance`, cargado por dynamic import dual-path) pueda recibir `tx`; si no, es un cambio core acotado.
- **Errores parciales y mensajes**: la mutation debe devolver un error claro que el cliente mapee (qué falló), no solo abortar.
- **Performance**: `$transaction` con N inserts es una sola conexión; para N grande evaluar `tx.planEntry.createMany` (si no se necesita el `createInstance` genérico por-item).
- **Orden**: para el alta guiada (dependencias), el orden de inserción dentro de la tx puede importar si hay validaciones por-item; definirlo.

## 7. Referencias (código verificado)

- Límite batch documentado: `mods/curriculum-design/modsComponents/CurriculumMesh/CurriculumMeshElement.vue:626-652` (FIX W3, `persistPeriodPositionUpdates`).
- Precedente de `$transaction` en el mod: `mods/curriculum-design/logic/activity-formtemplate.resolver.js:97`.
- Patrón de resolver custom + schema: `logic/curriculum-create.resolver.js`, `logic/curriculum-create.schema.graphql` (`extend type Mutation`, delega en `instanceMutation.createInstance`, disciplina THIN TICKET-070).
- Builders de payload batch (ya existen, hoy se crean 1x1): `curriculumMesh.logic.ts` → `buildObligatoriaPlanEntryPayloads`, `buildElectivaPlanEntryPayloads`.
- Origen: TICKET-120 (UPONE-1539) OQ-4 / DEC-LOCAL-07 / REQ-10.
