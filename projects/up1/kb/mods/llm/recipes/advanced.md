---
id: SPEC-mods-006
project: up1
type: spec
module: mods
tags: [avanzado, workflow, versionamiento, clonacion, matriz, jerarquia, calculo, importacion, IA, dashboard, exportacion, wizard, taxonomia, integracion, backlog, licenciamiento]
---
# Recetas Avanzadas — uP1 Mod Development

Patrones complejos que combinan múltiples primitivas. Cada receta referencia IDs de recetas base como prerequisitos.

## Preparacion

Cada receta avanzada combina multiples carpetas. Crear todas las que se necesiten:

```bash
# Estructura completa (crear solo lo necesario)
mkdir -p mods/{mod}/objects
mkdir -p mods/{mod}/logic
mkdir -p mods/{mod}/config/layouts
mkdir -p mods/{mod}/modsComponents
mkdir -p mods/{mod}/lang
mkdir -p mods/{mod}/events
mkdir -p mods/{mod}/flows
mkdir -p mods/{mod}/seed
mkdir -p mods/{mod}/tests/unit
```

## Despues de CADA receta

```bash
# 1. Sync siempre
npm run sync

# 2. Si se crearon/modificaron objects/:
npm run codegen --workspace=@uplanner/object-management-backend
npm run tenant:migrate --workspace=@uplanner/object-management-backend

# 3. Si se crearon/modificaron resolvers:
# Reiniciar Object Manager

# 4. Verificar
npm run check-mods
```

---

### ADV-01: Workflow de aprobación con máquina de estados

**Pre:** OBJ-01, OBJ-03, RES-03, RBAC-02
**Patrón:** Transiciones de estado controladas por rol, con validación de condiciones de negocio y auditoría automática.

**Arquitectura:**
```text
         ┌──────────────────────────────────────────────────┐
         │              Maquina de estados                   │
         └──────────────────────────────────────────────────┘

  [inicio]
     │
     ▼
 ┌─────────┐   submitForReview()   ┌─────────────────────────────────┐
 │  DRAFT  │ ─────────────────────► │       IN_REVIEW                 │
 └─────────┘                       │  (requiere rol REVIEWER)        │
      ▲                            └─────────────────────────────────┘
      │ requestChanges()                      │
      │◄──────────────────────────────────────┤ approve()
      │                                       │
      │                                       ▼
      │                             ┌─────────────────────────────────┐
      │                             │       APPROVED                  │
      │         revokeApproval()    │  (requiere rol APPROVER)        │
      │◄────────────────────────────│                                 │
      │                             └─────────────────────────────────┘
      │                                       │ publish()
      │                                       ▼
      │                             ┌─────────────────────────────────┐
      │                             │       PUBLISHED                 │
      │                             └─────────────────────────────────┘
      │                                       │
      │                                       ▼
      │                                  [fin]
```

**Objetos necesarios:**

```typescript
// MiEntidad — objeto principal con estado
{
  id: string
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED'
  // ... campos del dominio
}

// WorkflowConfig — define estados y transiciones
{
  id: string
  entityType: string   // nombre del objeto al que aplica
  transitions: [
    {
      from: string        // estado origen
      to: string          // estado destino
      requiredRole: string
      conditions: string[] // IDs de condiciones de negocio a evaluar
    }
  ]
}

// WorkflowAudit — registro de cada transición
{
  id: string
  entityId: string
  entityType: string
  fromStatus: string
  toStatus: string
  performedBy: string   // userId
  performedAt: DateTime
  comment: string | null
}
```

**Resolver clave:**

```typescript
// Mutation: executeTransition
async executeTransition(_, { entityId, targetStatus, comment }, ctx) {
  const entity = await ctx.db.miEntidad.findUniqueOrThrow({ where: { id: entityId } })
  const config = await ctx.db.workflowConfig.findFirst({
    where: { entityType: 'MiEntidad' }
  })

  // 1. Validar que la transición existe en la config
  const transition = config.transitions.find(
    t => t.from === entity.status && t.to === targetStatus
  )
  if (!transition) throw new Error(`Transición ${entity.status} → ${targetStatus} no permitida`)

  // 2. Validar rol del usuario
  if (!ctx.user.roles.includes(transition.requiredRole)) {
    throw new Error(`Rol requerido: ${transition.requiredRole}`)
  }

  // 3. Evaluar condiciones de negocio
  for (const conditionId of transition.conditions) {
    const passes = await evaluateCondition(conditionId, entity, ctx)
    if (!passes) throw new Error(`Condición no cumplida: ${conditionId}`)
  }

  // 4. Persistir transición + auditoría
  return ctx.db.$transaction([
    ctx.db.miEntidad.update({ where: { id: entityId }, data: { status: targetStatus } }),
    ctx.db.workflowAudit.create({
      data: { entityId, entityType: 'MiEntidad', fromStatus: entity.status,
              toStatus: targetStatus, performedBy: ctx.user.id, comment }
    })
  ])
}
```

**Layout:** Botones de transición renderizados condicionalmente según estado actual y rol del usuario. Usar `visibilityConditions` en el mod config para mostrar solo las transiciones disponibles al usuario activo. Incluir campo de comentario obligatorio en transiciones de rechazo.

**Validar:**
1. Intentar transición no permitida desde el estado actual → debe rechazar con error claro.
2. Usuario sin rol requerido intenta transición → debe rechazar con error de permisos.
3. Registros en `WorkflowAudit` deben existir después de cada transición exitosa.
4. `entity.status` refleja el nuevo estado tras la mutación.

**Doc:** OBJ-03 (enums), RBAC-02 (verificación de roles en resolvers), RES-03 (mutaciones con $transaction)

---

### ADV-02: Versionamiento de registros con cadena y vigencia única

**Pre:** OBJ-01, OBJ-07, RES-03
**Patrón:** Historial inmutable de versiones de un registro. Solo una versión es la vigente en cada momento.

**Arquitectura:**
```text
┌──────────────────────────┐   previousVersionId   ┌──────────────────────────┐   previousVersionId   ┌─────────────────────────────┐
│  v1                      │ ─────────────────────► │  v2                      │ ─────────────────────► │  v3  [VIGENTE]              │
│  isCurrentVersion: false │                        │  isCurrentVersion: false │                        │  isCurrentVersion: true     │
└──────────────────────────┘                        └──────────────────────────┘                        └─────────────────────────────┘
```

**Objetos necesarios:**

```typescript
// MiEntidad — con campos de versionamiento
{
  id: string
  version: number               // 1, 2, 3...
  isCurrentVersion: boolean     // solo 1 true por parentLogicalId
  parentLogicalId: string       // agrupa todas las versiones del mismo "objeto lógico"
  previousVersionId: string | null  // FK self-referencial
  // ... campos del dominio
  createdAt: DateTime
  createdBy: string
}
```

**Resolver clave:**

```typescript
// Mutation: createNewVersion
async createNewVersion(_, { entityId }, ctx) {
  const current = await ctx.db.miEntidad.findUniqueOrThrow({
    where: { id: entityId, isCurrentVersion: true }
  })

  return ctx.db.$transaction([
    // Desmarcar versión anterior
    ctx.db.miEntidad.update({
      where: { id: entityId },
      data: { isCurrentVersion: false }
    }),
    // Crear nueva versión clonando datos del dominio
    ctx.db.miEntidad.create({
      data: {
        ...pickDomainFields(current),
        version: current.version + 1,
        isCurrentVersion: true,
        parentLogicalId: current.parentLogicalId,
        previousVersionId: current.id,
        status: 'DRAFT',   // nueva versión siempre empieza en DRAFT
        createdBy: ctx.user.id,
      }
    })
  ])
}

// Query: getVersionHistory
async getVersionHistory(_, { parentLogicalId }) {
  return ctx.db.miEntidad.findMany({
    where: { parentLogicalId },
    orderBy: { version: 'desc' }
  })
}
```

**Layout:** Selector de versión en el encabezado del formulario. Badge "Versión vigente" en la versión actual. Botón "Crear nueva versión" visible solo en versión vigente con estado APPROVED o PUBLISHED. Timeline de versiones en panel lateral.

**Validar:**
1. Después de `createNewVersion`, exactamente un registro tiene `isCurrentVersion: true` para ese `parentLogicalId`.
2. El `previousVersionId` de la nueva versión apunta al ID de la versión anterior.
3. La nueva versión tiene `version = anterior + 1` y `status = 'DRAFT'`.
4. La consulta con `isCurrentVersion: true` retorna exactamente un resultado.

**Doc:** OBJ-07 (FK self-referencial en Prisma), RES-03 ($transaction)

---

### ADV-03: Clonación profunda de registros con relaciones

**Pre:** OBJ-01, RES-03, EVT-01
**Patrón:** Copia completa de un registro y sus relaciones configurables. Para volúmenes grandes, procesamiento asíncrono con seguimiento de progreso.

**Arquitectura:**
```text
┌─────────────────────────┐
│    deepClone llamado    │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Leer entidad origen                │
│  y relaciones configuradas          │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Iterar relaciones en config.       │
│  relations                          │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Clonar entidad raiz                │
│  nuevo ID, status=DRAFT             │
│  sourceClonedFromId=origen          │
└────────────┬────────────────────────┘
             │
             ▼
     ┌───────────────────┐
     │ Mas relaciones    │
     │ en config?        │
     └──────┬────────┬───┘
           si        no
            │        │
            ▼        ▼
     Clonar hijos    ┌─────────────────────────┐
     referenciar     │  Persistir en           │
     nuevo padre     │  $transaction           │
            │        └──────────────┬──────────┘
            │◄────────(loop)        │
                                    │
                     ┌──────────────┴──────────────┐
                     │ volumen grande?              │
                     │                             │
                     ▼ no                          ▼ si
             ┌────────────────┐          ┌───────────────────────┐
             │ Emitir evento  │          │  Crear CloneJob       │
             │ ENTITY_CLONED  │          │  status=PENDING       │
             └───────┬────────┘          └──────────┬────────────┘
                     │                              │
                     │                              ▼
                     │                    Worker procesa
                     │                    asincronamente
                     │                              │
                     │◄─────────────────────────────┘
                     ▼
             ┌────────────────┐
             │ Retornar       │
             │ nuevo ID       │
             └────────────────┘
```

**Objetos necesarios:**

```typescript
// CloneConfig — qué relaciones incluir (puede venir del mod config)
{
  relations: [
    { name: 'miRelacion', deep: true },
    { name: 'otraRelacion', deep: false }
  ]
}

// CloneJob — para clonaciones masivas/lentas
{
  id: string
  sourceEntityId: string
  entityType: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number       // 0-100
  resultEntityId: string | null
  errorMessage: string | null
  createdAt: DateTime
  completedAt: DateTime | null
}
```

**Resolver clave:**

```typescript
// Mutation: deepClone (sincrónico para registros simples)
async deepClone(_, { entityId, config }, ctx) {
  const source = await ctx.db.miEntidad.findUniqueOrThrow({
    where: { id: entityId },
    include: buildInclude(config.relations)
  })

  const cloneData = buildClonePayload(source, config)

  return ctx.db.$transaction(async (tx) => {
    const clone = await tx.miEntidad.create({
      data: {
        ...cloneData,
        id: generateId(),
        status: 'DRAFT',
        sourceClonedFromId: entityId,
        createdBy: ctx.user.id,
      }
    })

    for (const rel of config.relations) {
      await cloneRelation(tx, rel, source, clone.id)
    }

    await emitEvent('ENTITY_CLONED', { sourceId: entityId, cloneId: clone.id }, ctx)
    return clone
  })
}

// Para masivo: retorna job en lugar del resultado
async deepCloneAsync(_, { entityId, config }, ctx) {
  const job = await ctx.db.cloneJob.create({
    data: { sourceEntityId: entityId, entityType: 'MiEntidad',
            status: 'PENDING', progress: 0, createdBy: ctx.user.id }
  })
  await enqueueJob('clone', { jobId: job.id, config })
  return job
}
```

**Layout:** Botón "Clonar" con confirmación modal que muestra qué relaciones se incluirán. Para clonaciones asíncronas, banner de progreso con polling al job. Notificación al completar con link al nuevo registro.

**Validar:**
1. El registro clonado tiene `sourceClonedFromId` apuntando al origen.
2. `status = 'DRAFT'` en el clon y todos sus hijos.
3. Las relaciones configuradas existen en el nuevo registro.
4. Las relaciones NO configuradas no se copian.
5. El evento `ENTITY_CLONED` se emite con ambos IDs.

**Doc:** RES-03 ($transaction, includes anidados), EVT-01 (emisión de eventos)

---

### ADV-04: Herencia automática padre→hijo con control de sincronización

**Pre:** OBJ-01, OBJ-03, RES-03
**Patrón:** Al crear un hijo, hereda estructura del padre. La sincronización puede re-ejecutarse y es configurable por tenant.

**Objetos necesarios:**

```typescript
// MiEntidadHijo — con campo de sincronización por dato
{
  id: string
  parentId: string          // FK a MiEntidadPadre
  isSynchronized: boolean   // si este hijo está sincronizado con su padre
  lastSyncAt: DateTime | null
  // ... campos heredados del padre
}

// SyncConfig — por tenant
{
  id: string
  tenantId: string
  entityType: string
  overrideUserEdits: boolean          // si sync sobreescribe ediciones manuales del hijo
  replicateInactivations: boolean     // si inactivar padre inactiva hijos
  triggerWorkflowTransitions: boolean // si cambios de estado del padre disparan transiciones en hijos
}
```

**Resolver clave:**

```typescript
// Mutation: syncFromParent — re-sincroniza un hijo con su padre
async syncFromParent(_, { childId }, ctx) {
  const child = await ctx.db.miEntidadHijo.findUniqueOrThrow({
    where: { id: childId },
    include: { parent: true }
  })

  const syncConfig = await ctx.db.syncConfig.findFirst({
    where: { tenantId: ctx.tenant.id, entityType: 'MiEntidadHijo' }
  })

  // Respetar la config: si no se sobreescriben ediciones, solo sincronizar campos no tocados
  const fieldsToSync = syncConfig?.overrideUserEdits
    ? INHERITABLE_FIELDS
    : INHERITABLE_FIELDS.filter(f => !child.userEditedFields?.includes(f))

  const syncData = pick(child.parent, fieldsToSync)

  return ctx.db.miEntidadHijo.update({
    where: { id: childId },
    data: { ...syncData, isSynchronized: true, lastSyncAt: new Date() }
  })
}

// Hook en createMiEntidadHijo: heredar del padre automáticamente
async createMiEntidadHijo(_, { parentId, ...data }, ctx) {
  const parent = await ctx.db.miEntidadPadre.findUniqueOrThrow({ where: { id: parentId } })
  const inheritedData = pick(parent, INHERITABLE_FIELDS)

  return ctx.db.miEntidadHijo.create({
    data: { ...inheritedData, ...data, parentId, isSynchronized: true, lastSyncAt: new Date() }
  })
}
```

**Layout:** Indicador visual de sincronización (badge "Sincronizado" / "Modificado"). Botón "Restaurar desde padre" en campos modificados. Panel de config de sincronización por tenant en la sección de administración.

**Validar:**
1. Al crear hijo, los campos heredables tienen los valores del padre.
2. `isSynchronized: true` y `lastSyncAt` con fecha reciente tras crear.
3. Si `overrideUserEdits: false`, campos editados manualmente no se sobreescriben al sincronizar.
4. Si `overrideUserEdits: true`, todos los campos se actualizan.

**Doc:** OBJ-03 (campos calculados/flags), RES-03 (includes en mutaciones)

---

### ADV-05: Árbol jerárquico multinivel

**Pre:** OBJ-01, RES-01, VUE-01
**Patrón:** Estructura padre-hijo ilimitada con navegación, reordenamiento y validación de circularidad.

**Objetos necesarios:**

```typescript
// MiNodo — nodo del árbol (self-referencial)
{
  id: string
  parentId: string | null   // null = raíz
  order: number             // posición entre hermanos
  level: number             // calculado: 0=raíz, 1=hijo, 2=nieto...
  name: string
  // ... campos del dominio
}
```

**Resolver clave:**

```typescript
// Query: getTree — CTE recursivo (raw query para Prisma)
async getTree(_, { rootId }, ctx) {
  const rows = await ctx.db.$queryRaw`
    WITH RECURSIVE tree AS (
      SELECT id, parent_id, name, "order", 0 AS level
      FROM mi_nodo
      WHERE id = ${rootId}

      UNION ALL

      SELECT n.id, n.parent_id, n.name, n."order", t.level + 1
      FROM mi_nodo n
      INNER JOIN tree t ON n.parent_id = t.id
    )
    SELECT * FROM tree ORDER BY level, "order"
  `
  return buildTreeFromRows(rows) // convierte filas planas a objeto anidado
}

// Mutation: moveNode — valida circularidad antes de mover
async moveNode(_, { nodeId, newParentId, newOrder }, ctx) {
  if (newParentId) {
    // Verificar que newParentId no es descendiente de nodeId
    const descendants = await getDescendantIds(nodeId, ctx)
    if (descendants.includes(newParentId)) {
      throw new Error('No se puede mover un nodo a uno de sus descendientes')
    }
  }

  // Recalcular levels del subárbol movido
  return ctx.db.$transaction(async (tx) => {
    await tx.miNodo.update({
      where: { id: nodeId },
      data: { parentId: newParentId, order: newOrder }
    })
    await recalculateLevels(nodeId, tx)
  })
}
```

**Layout:** Componente `TreeView` con:
- Expand/collapse por nodo (estado local Vue `expandedIds: Set<string>`)
- Drag-and-drop para reordenar y reparentar (biblioteca: `vue-draggable-next` o similar)
- Breadcrumb dinámico al seleccionar un nodo
- Indicador de nivel con indentación visual
- Acciones por nodo: agregar hijo, editar, mover, eliminar

**Validar:**
1. `getTree` retorna estructura anidada correcta con todos los niveles.
2. `moveNode` a un descendiente lanza error.
3. Después de mover, `level` del nodo y sus descendientes se recalcula correctamente.
4. El `order` entre hermanos se mantiene consistente.

**Doc:** RES-01 (queries con raw SQL en Prisma), VUE-01 (componentes recursivos)

---

### ADV-06: Matriz NxM editable (tabla pivote con atributos)

**Pre:** OBJ-01, RES-03, VUE-01
**Patrón:** Relación muchos-a-muchos con atributos en la tabla de unión. UI como tabla pivote editable.

**Objetos necesarios:**

```typescript
// MiRelacion — tabla de unión con atributos
{
  id: string
  entityAId: string         // FK a entidad del eje Y (filas)
  entityBId: string         // FK a entidad del eje X (columnas)
  level: number | null      // atributo 1 de la celda
  weight: number | null     // atributo 2 de la celda
  isActive: boolean
  // agrega atributos según el dominio
}
```

**Resolver clave:**

```typescript
// Query: getMatrix — retorna estructura lista para renderizar
async getMatrix(_, { parentId }, ctx) {
  const rows = await getRows(parentId, ctx)    // entidades del eje Y
  const cols = await getCols(parentId, ctx)    // entidades del eje X
  const cells = await ctx.db.miRelacion.findMany({
    where: { entityAId: { in: rows.map(r => r.id) } }
  })

  return {
    rows,
    cols,
    cells: cells.reduce((acc, c) => {
      acc[`${c.entityAId}:${c.entityBId}`] = c
      return acc
    }, {} as Record<string, MiRelacion>)
  }
}

// Mutation: upsertCell — crea o actualiza una celda
async upsertCell(_, { entityAId, entityBId, attrs }, ctx) {
  return ctx.db.miRelacion.upsert({
    where: { entityAId_entityBId: { entityAId, entityBId } },
    create: { entityAId, entityBId, ...attrs, isActive: true },
    update: { ...attrs }
  })
}

// Mutation: removeCell — vaciar una celda
async removeCell(_, { entityAId, entityBId }, ctx) {
  return ctx.db.miRelacion.delete({
    where: { entityAId_entityBId: { entityAId, entityBId } }
  })
}
```

**Layout:** Componente `MatrizEditor` con:
- Headers fijos (scroll horizontal para muchas columnas)
- Celdas editables inline con `click-to-edit`
- Modo heatmap: colorear celdas según valor del atributo numérico
- Checkbox por celda para activar/desactivar relación rápidamente
- Exportar a CSV desde el toolbar

**Validar:**
1. `getMatrix` retorna todas las celdas existentes para las filas del eje Y.
2. `upsertCell` crea si no existe, actualiza si existe.
3. Clave única `(entityAId, entityBId)` previene duplicados.
4. Modo heatmap refleja el valor numérico con el color correcto.

**Doc:** OBJ-01 (índices compuestos únicos en Prisma), VUE-01 (tablas dinámicas)

---

### ADV-07: Motor de cálculo agregado multicapa

**Pre:** OBJ-01, OBJ-05, RES-03, EVT-01
**Patrón:** Cálculo configurable por capas con estrategias intercambiables. Resultados pre-computados e invalidados por eventos.

**Arquitectura:**
```text
┌──────────────────────────────┐
│  Evento: datos cambiados     │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│  Marcar Snapshot como stale  │
└────────────┬─────────────────┘
             │
             ▼
     ┌───────────────────┐
     │ Recalculo         │
     │ inmediato?        │
     └──────┬────────┬───┘
           si        no
            │        │
            │        ▼
            │  Job batch programado
            │        │
            └────────┘
                 │
                 ▼
┌──────────────────────────────┐
│  calculate llamado           │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│  Cargar CalcProfile          │
│  con strategies[]            │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│  Capa 1: apply strategy      │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│  Capa 2: apply strategy      │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│  Capa N: apply strategy      │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│  Persistir Snapshot          │
│  data + computedAt           │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│  Retornar resultado          │
└──────────────────────────────┘
```

**Objetos necesarios:**

```typescript
// CalcProfile — define las capas y sus estrategias
{
  id: string
  name: string
  entityType: string
  strategies: [
    { layer: 1, strategy: 'AVG_WEIGHTED', weightField: 'credits', sourceRelation: 'items' },
    { layer: 2, strategy: 'PROGRESSIVE', thresholds: [60, 70, 80, 90], scores: [0, 1, 2, 3] },
    { layer: 3, strategy: 'MAX', sourceFields: ['layer1Result', 'layer2Result'] }
  ]
}

// Snapshot — resultado pre-computado
{
  id: string
  entityId: string
  entityType: string
  scope: 'INDIVIDUAL' | 'GROUP' | 'GLOBAL'
  profileId: string
  data: Json          // resultado por capa + resultado final
  computedAt: DateTime
  isStale: boolean    // marcado cuando los datos fuente cambian
}
```

**Resolver clave:**

```typescript
// Query: calculate — retorna snapshot vigente o recalcula
async calculate(_, { entityId, profileId }, ctx) {
  const snapshot = await ctx.db.snapshot.findFirst({
    where: { entityId, profileId, isStale: false }
  })
  if (snapshot) return snapshot

  const profile = await ctx.db.calcProfile.findUniqueOrThrow({ where: { id: profileId } })
  const entity = await loadEntityWithData(entityId, profile, ctx)

  let layerResults: Record<string, number> = {}

  for (const strategyConfig of profile.strategies) {
    layerResults[`layer${strategyConfig.layer}Result`] =
      await applyStrategy(strategyConfig, entity, layerResults, ctx)
  }

  const finalResult = layerResults[`layer${profile.strategies.length}Result`]

  return ctx.db.snapshot.upsert({
    where: { entityId_profileId: { entityId, profileId } },
    create: { entityId, entityType: profile.entityType, scope: 'INDIVIDUAL',
              profileId, data: { ...layerResults, finalResult }, computedAt: new Date(), isStale: false },
    update: { data: { ...layerResults, finalResult }, computedAt: new Date(), isStale: false }
  })
}

// Estrategias disponibles
const STRATEGIES = {
  AVG_WEIGHTED: (items, config) => {
    const total = items.reduce((sum, i) => sum + i[config.weightField], 0)
    return items.reduce((sum, i) => sum + (i.value * i[config.weightField]), 0) / total
  },
  PROGRESSIVE: (value, config) => {
    const idx = config.thresholds.findLastIndex(t => value >= t)
    return idx === -1 ? 0 : config.scores[idx]
  },
  MAX: (_, config, prev) => Math.max(...config.sourceFields.map(f => prev[f])),
  LAST: (_, config, prev) => prev[config.sourceFields.at(-1)]
}
```

**Layout:** Panel de resultado con desglose por capa. Tooltip explicativo por estrategia. Botón "Recalcular" para forzar recálculo aunque no esté stale. Badge de fecha de último cálculo.

**Validar:**
1. Primer `calculate` crea el Snapshot con `isStale: false`.
2. Evento de cambio en datos fuente marca el Snapshot como `isStale: true`.
3. Siguiente `calculate` detecta `isStale` y recalcula.
4. Los valores por capa se persisten en `data` y son auditables.
5. Estrategia `AVG_WEIGHTED` con pesos distintos produce resultado diferente a promedio simple.

**Doc:** OBJ-05 (campos Json en Prisma), EVT-01 (handlers de eventos para invalidación)

---

### ADV-08: Importación desde sistema externo con idempotencia

**Pre:** OBJ-01, RES-03, FLOW-04
**Patrón:** Sincronización unidireccional desde fuente externa. Re-ejecutable sin duplicados gracias a `externalId`.

**Arquitectura:**
```text
┌──────────────────┐  HTTP GET  ┌──────────────────┐
│  Sistema Externo │ ──────────► │  n8n: fetch data │
└──────────────────┘            └────────┬─────────┘
                                         │
                                         ▼
                                ┌──────────────────────┐
                                │  Transformar al      │
                                │  schema interno      │
                                └────────┬─────────────┘
                                         │
                                         ▼
                          ┌──────────────────────────────────┐
                          │  upsertByExternalId              │
                          │  por cada registro               │
                          └──────────────┬───────────────────┘
                                         │
                         ┌───────────────┴───────────────┐
                         │  find by externalId           │
                         ▼                               ▼
                    Existe?                          No existe?
                         │                               │
                         ▼                               ▼
                  UPDATE registro                CREATE registro
                         │                               │
                         └───────────────┬───────────────┘
                                         │
                                         ▼
                                ┌──────────────────────┐
                                │  Registrar en SyncLog│
                                └────────┬─────────────┘
                                         │
                                         ▼
                                ┌──────────────────────┐
                                │  Notificar           │
                                │  completado/errores  │
                                └──────────────────────┘
```

**Objetos necesarios:**

```typescript
// MiEntidad — campos de integración
{
  id: string
  externalId: string | null    // ID en el sistema externo (indexed, unique por externalSystem)
  externalSystem: string | null // nombre del sistema origen ('SISTEMA_A', 'ERP', etc.)
  lastSyncAt: DateTime | null
  // ... campos del dominio
}

// SyncLog — registro de cada ejecución de sync
{
  id: string
  externalSystem: string
  entityType: string
  startedAt: DateTime
  completedAt: DateTime | null
  recordsProcessed: number
  success: number
  failed: number
  errors: Json   // array de { externalId, message }
  triggeredBy: 'SCHEDULED' | 'MANUAL'
}
```

**Resolver clave:**

```typescript
// Mutation: upsertByExternalId — idempotente
async upsertByExternalId(_, { externalSystem, externalId, data }, ctx) {
  const existing = await ctx.db.miEntidad.findFirst({
    where: { externalSystem, externalId }
  })

  if (existing) {
    return ctx.db.miEntidad.update({
      where: { id: existing.id },
      data: { ...mapExternalToInternal(data), lastSyncAt: new Date() }
    })
  }

  return ctx.db.miEntidad.create({
    data: { ...mapExternalToInternal(data), externalId, externalSystem, lastSyncAt: new Date() }
  })
}

// Flow n8n (pseudocódigo de nodos)
// 1. Schedule Trigger (cron: cada 6h)
// 2. HTTP Request → GET ${EXTERNAL_API_URL}/records?since={{lastSyncAt}}
// 3. Code node: transform response → [{externalId, ...fields}]
// 4. Loop over items → GraphQL mutation upsertByExternalId
// 5. Aggregate results → createSyncLog mutation
// 6. IF failed > 0 → Send alert notification
```

**Layout:** Sección "Sincronización" en administración con tabla de `SyncLog`. Botón "Sincronizar ahora" para disparo manual. Badge en cada registro mostrando origen externo y fecha de última sync.

**Validar:**
1. Ejecutar sync dos veces con los mismos datos → sin duplicados, registros actualizados.
2. Nuevo registro en sistema externo → se crea en interno en el siguiente ciclo.
3. `SyncLog` registra `success` + `failed` correctamente.
4. Registro con `externalId` malformado no detiene el proceso; se registra en `errors[]`.

**Doc:** FLOW-04 (flows n8n con loops y HTTP), RES-03 (upsert en Prisma)

---

### ADV-09: Generación de contenido con IA (job asíncrono con revisión humana)

**Pre:** OBJ-01, RES-03, EVT-01, FLOW-02
**Patrón:** Pipeline de generación IA con gate de revisión humana antes de aplicar el resultado.

**Arquitectura:**
```text
┌───────────────────────────┐
│  Usuario solicita         │
│  generacion               │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│  submitAIJob              │
│  crea job PENDING         │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│  Cola de jobs             │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│  Worker / Flow            │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│  Llamar LLM API           │
│  con prompt + contexto    │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│  Parsear JSON de respuesta│
└─────────────┬─────────────┘
              │
              ▼
      ┌───────────────┐
      │  Valido?      │
      └──────┬────┬───┘
            si    no
             │    │
             ▼    ▼
    job → REVIEW  job → FAILED
    resultJSON    errorMessage
    persistido
             │
             ▼
    Notificar usuario
    para revisar
             │
             ▼
      ┌───────────────┐
      │ Revision      │
      │ humana        │
      └──────┬────┬───┘
      confirmar  rechazar
             │    │
             ▼    ▼
    confirm-    rejectAI-
    AIResult    Result
    aplicar     descartar
    resultado
```

**Objetos necesarios:**

```typescript
// AIJob — job de generación
{
  id: string
  entityType: string
  entityId: string | null    // entidad sobre la que genera (si aplica)
  inputRef: Json             // prompt, contexto, parámetros
  status: 'PENDING' | 'PROCESSING' | 'REVIEW' | 'CONFIRMED' | 'REJECTED' | 'FAILED'
  resultJSON: Json | null    // resultado parseado del LLM
  errorMessage: string | null
  model: string              // modelo LLM usado
  tokensUsed: number | null
  createdBy: string
  createdAt: DateTime
  reviewedBy: string | null
  reviewedAt: DateTime | null
}
```

**Resolver clave:**

```typescript
// Mutation: submitAIJob
async submitAIJob(_, { entityType, entityId, inputRef }, ctx) {
  const job = await ctx.db.aIJob.create({
    data: { entityType, entityId, inputRef, status: 'PENDING',
            model: AI_MODEL_DEFAULT, createdBy: ctx.user.id }
  })
  await enqueueJob('ai-generation', { jobId: job.id })
  return job
}

// Mutation: confirmAIResult — aplica el resultado al objeto destino
async confirmAIResult(_, { jobId }, ctx) {
  const job = await ctx.db.aIJob.findUniqueOrThrow({
    where: { id: jobId, status: 'REVIEW' }
  })

  return ctx.db.$transaction([
    applyAIResult(job.entityType, job.entityId, job.resultJSON, ctx),
    ctx.db.aIJob.update({
      where: { id: jobId },
      data: { status: 'CONFIRMED', reviewedBy: ctx.user.id, reviewedAt: new Date() }
    })
  ])
}

// Mutation: rejectAIResult
async rejectAIResult(_, { jobId, reason }, ctx) {
  return ctx.db.aIJob.update({
    where: { id: jobId, status: 'REVIEW' },
    data: { status: 'REJECTED', errorMessage: reason,
            reviewedBy: ctx.user.id, reviewedAt: new Date() }
  })
}
```

**Layout:** Panel "Generar con IA" en el formulario del objeto. Mientras procesa: spinner con estado del job (polling cada 3s). En estado REVIEW: formulario editable con el resultado propuesto por la IA, botones "Confirmar" y "Rechazar". Badge en el objeto si tiene contenido generado por IA.

**Validar:**
1. `submitAIJob` crea job en PENDING y lo encola.
2. Worker cambia a PROCESSING luego a REVIEW con `resultJSON` no nulo.
3. `confirmAIResult` solo acepta jobs en REVIEW.
4. Después de confirmar, el resultado se aplica al objeto destino.
5. `tokensUsed` y `model` se registran para auditoría de costos.

**Doc:** FLOW-02 (workers en n8n), EVT-01 (notificaciones al completar job)

---

### ADV-10: Dashboard de reportería con snapshots pre-computados

**Pre:** OBJ-01, RES-01, VUE-01, EVT-01, FLOW-04
**Patrón:** Reportes con baja latencia usando snapshots cacheados. Invalidación event-driven y recálculo batch.

**Objetos necesarios:**

```typescript
// ReportSnapshot — resultado pre-computado por scope y filtros
{
  id: string
  reportType: string          // 'PROGRESS_SUMMARY', 'DISTRIBUTION', etc.
  scope: 'INDIVIDUAL' | 'GROUP' | 'GLOBAL'
  entityId: string | null     // null para scope GLOBAL
  filters: Json               // parámetros de filtrado usados
  data: Json                  // resultado: series, totals, breakdowns
  computedAt: DateTime
  isStale: boolean
  ttlHours: number            // cuánto tiempo es válido aunque no esté stale
}
```

**Resolver clave:**

```typescript
// Query: getReport — cacheable
async getReport(_, { reportType, scope, entityId, filters }, ctx) {
  const snapshotKey = buildSnapshotKey(reportType, scope, entityId, filters)

  const snapshot = await ctx.db.reportSnapshot.findFirst({
    where: { ...snapshotKey, isStale: false,
             computedAt: { gte: new Date(Date.now() - snapshot.ttlHours * 3600_000) } }
  })

  if (snapshot) return snapshot.data

  // Si no hay snapshot válido, calcular en el momento
  const data = await computeReport(reportType, scope, entityId, filters, ctx)

  await ctx.db.reportSnapshot.upsert({
    where: { reportType_scope_entityId_filtersHash: snapshotKey },
    create: { ...snapshotKey, data, computedAt: new Date(), isStale: false, ttlHours: 24 },
    update: { data, computedAt: new Date(), isStale: false }
  })

  return data
}

// Handler de evento: marcar snapshots como stale al cambiar datos fuente
async onSourceDataChanged(event) {
  await ctx.db.reportSnapshot.updateMany({
    where: { entityId: event.entityId, reportType: { in: AFFECTED_REPORTS[event.entityType] } },
    data: { isStale: true }
  })
}
```

**Layout:** Dashboard con slots configurables por tipo de chart (`<ReportSlot type="progress-bar" />`, `<ReportSlot type="distribution-pie" />`). Indicador de "Última actualización: hace X minutos". Botón "Actualizar" que fuerza recálculo (marca como stale + recalcula). Skeleton loading mientras calcula.

**Validar:**
1. Segunda llamada a `getReport` con mismos parámetros retorna el snapshot cacheado sin recalcular.
2. Evento de cambio en datos fuente marca los snapshots afectados como `isStale: true`.
3. `getReport` con snapshot stale recalcula y persiste nuevo snapshot.
4. Job batch nocturno procesa todos los snapshots stale.

**Doc:** RES-01 (queries complejas), EVT-01 (handlers), FLOW-04 (jobs batch en n8n)

---

### ADV-11: Exportación a PDF/Word con plantillas por tenant

**Pre:** RES-03, EVT-01, FLOW-02
**Patrón:** Generación de documentos a partir de plantillas configurables por tenant. Exportación masiva asíncrona.

**Objetos necesarios:**

```typescript
// ExportTemplate — plantilla por formato y tipo de entidad
{
  id: string
  tenantId: string
  name: string
  format: 'PDF' | 'DOCX'
  entityType: string
  templateContent: string   // HTML con handlebars para PDF, o base64 DOCX con marcadores
  isDefault: boolean
  version: number
}

// ExportJob — para exportaciones masivas
{
  id: string
  tenantId: string
  templateId: string
  entityIds: Json           // array de IDs a exportar
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  resultUrls: Json | null   // array de { entityId, url }
  errorCount: number
  createdBy: string
  completedAt: DateTime | null
}
```

**Resolver clave:**

```typescript
// Mutation: exportDocument — exportación individual
async exportDocument(_, { entityId, templateId }, ctx) {
  const [entity, template] = await Promise.all([
    ctx.db.miEntidad.findUniqueOrThrow({ where: { id: entityId }, include: EXPORT_INCLUDES }),
    ctx.db.exportTemplate.findUniqueOrThrow({ where: { id: templateId } })
  ])

  const fileBuffer = template.format === 'PDF'
    ? await renderPDF(template.templateContent, entity)
    : await renderDOCX(template.templateContent, entity)

  const fileName = `${entity.name}-v${entity.version}.${template.format.toLowerCase()}`
  const signedUrl = await uploadToS3(fileBuffer, fileName, ctx.tenant.id)

  return { url: signedUrl, expiresAt: addHours(new Date(), 24) }
}

// Mutation: exportDocumentBulk — exportación masiva asíncrona
async exportDocumentBulk(_, { entityIds, templateId }, ctx) {
  const job = await ctx.db.exportJob.create({
    data: { tenantId: ctx.tenant.id, templateId, entityIds,
            status: 'PENDING', progress: 0, createdBy: ctx.user.id }
  })
  await enqueueJob('export-bulk', { jobId: job.id })
  return job
}
```

**Layout:** Botón "Exportar" con dropdown de formatos y selección de plantilla. Para exportación masiva: modal de progreso con barra. Al completar: listado descargable de archivos generados con links de descarga temporal (S3 signed URLs con TTL de 24h).

**Validar:**
1. `exportDocument` retorna URL válida que resuelve el documento correcto.
2. El documento renderizado contiene los datos del registro (nombre, versión, campos).
3. Para exportación masiva, `ExportJob.progress` avanza de 0 a 100.
4. URLs expiradas después del TTL retornan 403 desde S3.

**Doc:** RES-03 (manejo de buffers y uploads), EVT-01 (notificación al completar ExportJob)

---

### ADV-12: Setup wizard de configuración inicial por tenant

**Pre:** OBJ-01, RES-01, LAY-04
**Patrón:** Onboarding guiado paso a paso. Guard que bloquea el acceso a la app hasta completar la configuración.

**Arquitectura:**
```text
┌──────────────────────┐
│   Usuario accede     │
└──────────┬───────────┘
           │
           ▼
   ┌───────────────┐
   │ Setup         │
   │ completado?   │
   └──────┬────┬───┘
         si    no
          │    │
          ▼    ▼
       App   Wizard
       normal de setup
                │
                ▼
     ┌──────────────────────┐
     │ Paso 1:              │
     │ Configuracion basica │
     └──────────┬───────────┘
                │
                ▼
     ┌──────────────────────┐
     │ Paso 2:              │
     │ Usuarios y roles     │
     └──────────┬───────────┘
                │
                ▼
     ┌──────────────────────┐
     │ Paso 3:              │
     │ Importacion inicial  │
     └──────────┬───────────┘
                │
                ▼
     ┌──────────────────────┐
     │ Paso N:              │
     │ Configuracion avanz. │
     └──────────┬───────────┘
                │
                ▼
       ┌────────────────────┐
       │ Todos los pasos    │
       │ completados?       │
       └──────┬──────────┬──┘
             si           no
              │            │
              ▼            │
     completedAt = now()   │
              │            │
              ▼            ▼
           App normal   (vuelve al
                         Wizard)
```

**Objetos necesarios:**

```typescript
// TenantSetup — estado del wizard por tenant
{
  id: string
  tenantId: string
  steps: [
    {
      id: string
      title: string
      description: string
      isRequired: boolean
      isCompleted: boolean
      completedAt: DateTime | null
      completedBy: string | null
      data: Json | null    // datos capturados en este paso
    }
  ]
  currentStep: string      // ID del paso actual
  completedAt: DateTime | null
}
```

**Resolver clave:**

```typescript
// Query: getSetupStatus
async getSetupStatus(_, __, ctx) {
  return ctx.db.tenantSetup.findFirst({ where: { tenantId: ctx.tenant.id } })
}

// Mutation: completeStep — marca un paso como completado y avanza
async completeStep(_, { stepId, data }, ctx) {
  const setup = await ctx.db.tenantSetup.findFirstOrThrow({
    where: { tenantId: ctx.tenant.id }
  })

  const steps = setup.steps.map(s =>
    s.id === stepId
      ? { ...s, isCompleted: true, completedAt: new Date(), completedBy: ctx.user.id, data }
      : s
  )

  const nextStep = steps.find(s => !s.isCompleted)
  const allRequired = steps.filter(s => s.isRequired).every(s => s.isCompleted)

  return ctx.db.tenantSetup.update({
    where: { id: setup.id },
    data: {
      steps,
      currentStep: nextStep?.id ?? null,
      completedAt: allRequired ? new Date() : null
    }
  })
}
```

**Layout:** Layout wizard de pantalla completa (sin sidebar de la app principal). Sidebar izquierdo con lista de pasos (icono check verde si completado, círculo si pendiente, resaltado si es el actual). Panel derecho con formulario del paso actual. Botón "Continuar" para avanzar y "Omitir" para pasos opcionales. Barra de progreso en el header (`completedRequired / totalRequired`).

**Guard de navegación:**

```typescript
// middleware/setup-guard.ts
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith('/setup')) return // no bloquear el wizard en sí

  const setup = await fetchSetupStatus()
  if (!setup.completedAt) {
    return navigateTo('/setup')
  }
})
```

**Validar:**
1. Usuario accede a `/dashboard` sin setup completo → redirige a `/setup`.
2. `completeStep` actualiza el paso correcto sin afectar los demás.
3. Al completar todos los pasos requeridos, `completedAt` se persiste.
4. Después de `completedAt`, el guard no redirige al wizard.

**Doc:** LAY-04 (layouts en Nuxt), RES-01 (queries de configuración por tenant)

---

### ADV-13: Taxonomías jerárquicas compartidas con catálogos

**Pre:** OBJ-01, ADV-05, SEED-01
**Patrón:** Catálogos estándar reutilizables y configurables por tenant. Soporte para taxonomías externas versionadas.

**Objetos necesarios:**

```typescript
// Taxonomy — catálogo (puede ser estándar o personalizado)
{
  id: string
  name: string           // 'BLOOM_TAXONOMY', 'ISCO_OCCUPATIONS', etc.
  source: string         // 'STANDARD' | 'CUSTOM' | 'EXTERNAL'
  version: string        // '2001', '2024', etc.
  description: string | null
}

// TaxonomyEntry — nodo del catálogo (jerárquico, ver ADV-05)
{
  id: string
  taxonomyId: string
  code: string           // código único dentro de la taxonomía
  name: string
  description: string | null
  parentCode: string | null   // jerarquía por código (más estable que FK de ID)
  level: number
  order: number
  isActive: boolean
  metadata: Json | null       // atributos extra según la taxonomía
}

// TaxonomyConfig — qué taxonomías activa cada tenant y cómo
{
  id: string
  tenantId: string
  taxonomyId: string
  entityType: string       // a qué entidades aplica esta taxonomía
  fieldName: string        // nombre del campo en la entidad destino
  isRequired: boolean
  maxSelections: number | null  // null = ilimitado
  allowedCodes: Json | null     // subconjunto de códigos permitidos para este tenant
}
```

**Resolver clave:**

```typescript
// Query: getTaxonomyTree — reutiliza lógica de ADV-05 filtrada por taxonomía
async getTaxonomyTree(_, { taxonomyId, tenantId }, ctx) {
  const config = await ctx.db.taxonomyConfig.findFirst({ where: { taxonomyId, tenantId } })
  const entries = await ctx.db.taxonomyEntry.findMany({
    where: {
      taxonomyId,
      isActive: true,
      ...(config?.allowedCodes ? { code: { in: config.allowedCodes } } : {})
    },
    orderBy: [{ level: 'asc' }, { order: 'asc' }]
  })
  return buildTreeFromEntries(entries)
}

// Query: suggestCode — sugerencia IA (opcional)
async suggestTaxonomyCode(_, { taxonomyId, description }, ctx) {
  const entries = await ctx.db.taxonomyEntry.findMany({
    where: { taxonomyId, isActive: true },
    select: { code: true, name: true, description: true }
  })
  // Llamar LLM con entries + description para sugerir el código más adecuado
  return callLLMForSuggestion(entries, description)
}
```

**Seed de catálogos estándar:**

```typescript
// seeds/taxonomies.ts
export async function seedTaxonomies(db: PrismaClient) {
  const BLOOM_TAXONOMY = {
    name: 'BLOOM_TAXONOMY', source: 'STANDARD', version: '2001',
    entries: [
      { code: '1', name: 'Recordar', level: 1, parentCode: null },
      { code: '2', name: 'Comprender', level: 1, parentCode: null },
      { code: '3', name: 'Aplicar', level: 1, parentCode: null },
      { code: '3.1', name: 'Ejecutar', level: 2, parentCode: '3' },
      // ...
    ]
  }
  await upsertTaxonomy(db, BLOOM_TAXONOMY)
}
```

**Layout:** Selector de taxonomía como `TreeSelect` con búsqueda. Badge con código al seleccionar. Opción de sugerencia IA con icono de varita. En administración: gestión de `TaxonomyConfig` por tenant.

**Validar:**
1. Seed corre de forma idempotente (upsert por código).
2. `getTaxonomyTree` respeta `allowedCodes` del tenant.
3. Entradas de nivel 2 solo aparecen bajo su padre correcto.
4. Campo marcado como `isRequired` fuerza selección antes de guardar.

**Doc:** SEED-01 (seeds idempotentes), ADV-05 (árbol jerárquico), OBJ-01 (índices en Prisma)

---

### ADV-14: Sincronización bidireccional con sistema externo

**Pre:** OBJ-01, RES-03, ADV-08
**Patrón:** Extiende ADV-08 con flujo de salida. El modo es configurable por tenant (solo entrada vs bidireccional).

**Objetos necesarios:**

```typescript
// Extensión de MiEntidad con campos bidireccionales
{
  // Campos de ADV-08 (externalId, externalSystem, lastSyncAt)...
  syncId: string | null      // ID estable para que el sistema externo nos referencie
  syncMode: 'INBOUND_ONLY' | 'BIDIRECTIONAL'
  lastOutboundAt: DateTime | null
  outboundVersion: number    // incrementa en cada cambio que se debe publicar
}

// SyncConfig por tenant (extensión)
{
  // ... campos base
  mode: 'INBOUND_ONLY' | 'BIDIRECTIONAL'
  outboundWebhookUrl: string | null   // URL del sistema externo para notificar cambios
  outboundFields: Json                // qué campos incluir en el payload de salida
}
```

**Resolver clave:**

```typescript
// Mutation: linkExternalRecord — para que externo vincule su ID con el nuestro
async linkExternalRecord(_, { syncId, externalId, externalSystem }, ctx) {
  const entity = await ctx.db.miEntidad.findFirstOrThrow({ where: { syncId } })
  return ctx.db.miEntidad.update({
    where: { id: entity.id },
    data: { externalId, externalSystem, lastSyncAt: new Date() }
  })
}

// Endpoint outbound — expuesto para que el sistema externo consulte cambios
// GET /api/sync/changes?since=<timestamp>&externalSystem=<nombre>
async getOutboundChanges(req, res) {
  const { since, externalSystem } = req.query
  const config = await getSyncConfig(externalSystem, req.tenant)

  if (config.mode !== 'BIDIRECTIONAL') {
    return res.status(403).json({ error: 'Sync bidireccional no habilitado para este tenant' })
  }

  const changes = await ctx.db.miEntidad.findMany({
    where: {
      externalSystem,
      lastModifiedAt: { gte: new Date(since) }
    },
    select: buildOutboundSelect(config.outboundFields)
  })

  return res.json({ changes, timestamp: new Date().toISOString() })
}

// Hook post-update: notificar al externo si hay webhook configurado
async onEntityUpdated(entity, ctx) {
  const config = await getSyncConfig(entity.externalSystem, ctx.tenant)
  if (config.mode !== 'BIDIRECTIONAL' || !config.outboundWebhookUrl) return

  await fetch(config.outboundWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Sync-Token': config.webhookSecret },
    body: JSON.stringify(buildOutboundPayload(entity, config.outboundFields))
  })
}
```

**Layout:** Panel de administración con modo de sync configurable (toggle INBOUND/BIDIRECTIONAL). Log de eventos de salida con estado (enviado/error). Indicador por registro: "Sincronizado con [Sistema Externo]" con fecha.

**Validar:**
1. Con `mode: 'INBOUND_ONLY'`, el endpoint `/api/sync/changes` retorna 403.
2. `linkExternalRecord` solo funciona si `syncId` existe en nuestra base.
3. Al actualizar un registro, el webhook outbound se notifica dentro de 5s.
4. Payload outbound solo incluye los campos configurados en `outboundFields`.

**Doc:** ADV-08 (upsertByExternalId, SyncLog), RES-03 (endpoints REST en Express)

---

### ADV-15: Backlog de mejora continua vinculado a registros

**Pre:** OBJ-01, RES-03, ADV-01, ADV-02
**Patrón:** Sistema de solicitudes de cambio con su propio workflow. Integración con versionamiento: al crear versión nueva, el backlog aprobado se presenta como checklist.

**Objetos necesarios:**

```typescript
// ChangeRequest — solicitud de cambio
{
  id: string
  entityType: string
  entityId: string          // registro al que aplica
  type: 'MICRO' | 'MACRO'  // MICRO: sobre versión vigente / MACRO: espera nueva versión
  status: 'PROPOSED' | 'IN_REVIEW' | 'APPROVED' | 'APPLIED' | 'REJECTED'
  title: string
  description: string
  proposedBy: string
  proposedAt: DateTime
  reviewedBy: string | null
  appliedIn: string | null  // versionId donde se aplicó (para MACRO)
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
}
```

**Resolver clave:**

```typescript
// Query: getApprovedBacklog — se usa al crear nueva versión (ADV-02)
async getApprovedBacklog(_, { entityId }, ctx) {
  return ctx.db.changeRequest.findMany({
    where: { entityId, type: 'MACRO', status: 'APPROVED' },
    orderBy: [{ priority: 'desc' }, { proposedAt: 'asc' }]
  })
}

// Mutation: applyChangeRequest — marca MICRO como aplicado sobre versión vigente
async applyChangeRequest(_, { changeRequestId, notes }, ctx) {
  const cr = await ctx.db.changeRequest.findUniqueOrThrow({
    where: { id: changeRequestId, status: 'APPROVED', type: 'MICRO' }
  })

  return ctx.db.$transaction([
    // Aplicar el cambio propuesto al registro
    applyChangeToEntity(cr.entityType, cr.entityId, cr.description, ctx),
    ctx.db.changeRequest.update({
      where: { id: changeRequestId },
      data: { status: 'APPLIED', appliedAt: new Date(), appliedBy: ctx.user.id,
              applicationNotes: notes }
    })
  ])
}

// Al ejecutar createNewVersion (ADV-02): presentar backlog
async createNewVersionWithBacklog(_, { entityId }, ctx) {
  const [newVersion, backlog] = await Promise.all([
    createNewVersion(entityId, ctx),
    getApprovedBacklog(entityId, ctx)
  ])

  return { newVersion, pendingBacklog: backlog }
  // El frontend muestra el backlog como checklist para que el usuario decida qué aplicar
}
```

**Layout:** Panel "Solicitudes de mejora" en la vista del registro con tabs por tipo (MICRO/MACRO) y estado. Formulario de nueva solicitud inline. Al crear versión nueva: modal con checklist del backlog MACRO aprobado ("¿Cuáles incluir en esta versión?"). Badge con contador de solicitudes aprobadas pendientes.

**Validar:**
1. `getApprovedBacklog` solo retorna ChangeRequests en estado APPROVED y tipo MACRO.
2. Al crear nueva versión, el backlog se presenta como checklist no aplicado.
3. `applyChangeRequest` solo funciona en MICRO con status APPROVED.
4. ChangeRequest MACRO queda en APPROVED hasta que se aplica explícitamente en una versión.

**Doc:** ADV-01 (workflow de estados), ADV-02 (createNewVersion), RES-03 ($transaction)

---

### ADV-16: Feature flags / licenciamiento por módulo por tenant

**Pre:** OBJ-01, RES-01, RBAC-01
**Patrón:** Control de acceso a módulos basado en licencias por tenant, con verificación de dependencias transitivas.

**Objetos necesarios:**

```typescript
// TenantLicense — módulo habilitado para un tenant
{
  id: string
  tenantId: string
  moduleId: string      // ej: 'MOD_ANALYTICS', 'MOD_AI_GENERATION'
  enabledAt: DateTime
  expiresAt: DateTime | null   // null = sin expiración
  enabledBy: string
}

// ModuleDependency — árbol de dependencias entre módulos
{
  moduleId: string           // módulo que tiene la dependencia
  requiresModuleId: string   // módulo que se requiere
}

// Module — catálogo de módulos disponibles
{
  id: string       // 'MOD_ANALYTICS'
  name: string
  description: string
  tier: 'BASE' | 'ADVANCED' | 'ENTERPRISE'
}
```

**Resolver clave:**

```typescript
// Helper: hasModule — verifica licencia + dependencias transitivas
async function hasModule(tenantId: string, moduleId: string, db: PrismaClient): Promise<boolean> {
  const now = new Date()

  // 1. Verificar licencia directa
  const license = await db.tenantLicense.findFirst({
    where: { tenantId, moduleId,
             enabledAt: { lte: now },
             OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
  })
  if (!license) return false

  // 2. Verificar dependencias transitivas
  const deps = await db.moduleDependency.findMany({ where: { moduleId } })
  for (const dep of deps) {
    const depEnabled = await hasModule(tenantId, dep.requiresModuleId, db)
    if (!depEnabled) return false
  }

  return true
}

// Guard de resolver: withModule
function withModule(moduleId: string, resolver: Function) {
  return async (parent, args, ctx) => {
    const allowed = await hasModule(ctx.tenant.id, moduleId, ctx.db)
    if (!allowed) throw new Error(`Módulo no habilitado: ${moduleId}`)
    return resolver(parent, args, ctx)
  }
}

// Uso en resolver:
const getAnalyticsData = withModule('MOD_ANALYTICS', async (_, args, ctx) => {
  // lógica del resolver...
})
```

**Composable frontend:**

```typescript
// composables/useModuleAccess.ts
export function useModuleAccess(moduleId: string) {
  const { data: licenses } = useTenantLicenses()

  const isEnabled = computed(() => {
    if (!licenses.value) return false
    return licenses.value.some(l =>
      l.moduleId === moduleId &&
      l.enabledAt <= new Date() &&
      (!l.expiresAt || l.expiresAt > new Date())
    )
  })

  return { isEnabled }
}

// Uso en componente Vue:
// const { isEnabled } = useModuleAccess('MOD_ANALYTICS')
// v-if="isEnabled" en menú o ruta
```

**Layout:** Panel de administración con lista de módulos disponibles y estado (activo/inactivo/expirado). Toggle para activar módulos (solo superadmin). Badge "PRO" o "ENTERPRISE" en features bloqueadas. Al intentar acceder a feature bloqueada: modal de upgrade en lugar de error.

**Validar:**
1. `hasModule` retorna false si la licencia expiró.
2. `hasModule` retorna false si un módulo dependencia no tiene licencia.
3. Resolver con `withModule` lanza error 403 sin licencia activa.
4. `useModuleAccess` en frontend oculta el menú/ruta sin licencia.
5. Activar la licencia del módulo dependencia desbloquea el módulo que lo requiere.

**Doc:** RBAC-01 (guards en resolvers), RES-01 (caching de permisos por tenant)
