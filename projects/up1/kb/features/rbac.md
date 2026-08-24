---
id: SPEC-features-004
project: up1
type: spec
module: features
category: features
tags: [up1, rbac, roles, permisos, capabilities, auth, withAuth, contextos, mods, field-level, object-level, clerk, jwt, active-role, tenant-membership]
fecha: 2026-08-17
sources:
  - object-manager/src/services/auth/activeRole.js (resolveActiveRole, pickDeterministicAssignment)
  - object-manager/src/services/auth/ownedObjectAccess.js (OWNER_SCOPED_OBJECTS, authorizeOwnedCreate/authorizeOwnedMutation)
  - object-manager/src/services/auth/userExtractor.js (getTenantMembershipFromRequest, isTenantAccessAllowed)
  - object-manager/src/graphql/resolvers/user.resolver.js (userQuery.getMyPermissions assignableRoles, userMutation.setActiveRole)
  - object-manager/src/graphql/typeDefs/static.js (assignableRoles, setActiveRole)
  - object-manager/docs/features/rbac-system.md
  - object-manager/docs/features/custom-capabilities.md
  - object-manager/docs/guides/rbac-setup.md
  - object-manager/docs/guides/rbac-examples.md
  - object-manager/docs/guides/role-based-filtering.md
  - object-manager/src/services/auth/ (withAuth, authChecker, userExtractor, checkAppAccess, contextPathUtils, businessContextFilter, generateCapabilities, relationshipDiscovery)
  - object-manager/src/services/auth/authChecker.js (checkObjectPermissions fallback field-level view/modify, checkFieldPermissions, computeFieldViewAccess, filterDataByAllowedFields)
  - object-manager/src/services/auth/withAuth.js (requireAuth, assertAuthenticated, withObjectAuth)
  - object-manager/src/graphql/resolvers/instance.resolver.js (checkFieldPermissions en updateInstance / RecordType / updateBulkInstances; computeFieldViewAccess/filterDataByAllowedFields en getInstance y listInstances; withObjectAuth en el motor CRUD generico)
  - object-manager/src/graphql/resolvers/up1/suite/app.resolver.js (getAppsFiltered con requireAuth)
  - object-manager/src/graphql/resolvers/up1/coreConfig.resolver.js (getConfigs/getConfigApps con requireAuth)
  - object-manager/src/graphql/resolvers/up1/report-builder/{reportData,reportTemplate}.resolver.js (queries envueltas en bloque con requireAuth)
  - layout/src/composables/useRbacPermissions.ts (getEffectivePermission fallback field-level para modify)
  - object-manager/scripts/sync/dbSync.js (Fase 3: Capability Sync)
  - object-manager/scripts/tenant-bootstrap.js (seed de roles y contextos)
  - object-manager/prisma/BASEMODEL/schema.prisma (modelos core RBAC)
  - capabilities.json de retention-wellbeing, hello-world-mod, up1-manager, report-builder
  - object-manager/src/services/auth/modRoleCapabilities.js
  - object-manager/src/services/auth/authChecker.js (serviceAccountHasOp)
  - object-manager/objects/core/{core_ModRole,core_ModRoleCapability,core_ServiceAccount}.json
  - layout/src/composables/useRbacPermissions.ts
  - suite/composables/useRoleSelection.ts
  - mods/curriculum-mapping/logic/levelScheme-upsert.resolver.js (checkObjectPermissions manual en mutations custom)
  - mods/curriculum-mapping/logic/helpers/resolverUtils.js (loadCheckObjectPermissions)
ticket: UPONE-1353, UPONE-1412, UPONE-1439
---
# Sistema de roles y permisos (RBAC) de uP1

## Indice

1. [Modelo general](#1-modelo-general)
2. [Entidades del sistema](#2-entidades-del-sistema)
3. [Tipos de capabilities](#3-tipos-de-capabilities)
4. [Contextos jerarquicos](#4-contextos-jerarquicos)
5. [Flujo de autenticacion](#5-flujo-de-autenticacion)
6. [withAuth: proteger resolvers](#6-withauth-proteger-resolvers)
7. [Permisos a nivel de objeto](#7-permisos-a-nivel-de-objeto)
8. [Permisos a nivel de campo](#8-permisos-a-nivel-de-campo)
9. [Capabilities custom de mods](#9-capabilities-custom-de-mods)
10. [Sync de capabilities](#10-sync-de-capabilities)
11. [Filtrado de apps y layouts por rol](#11-filtrado-de-apps-y-layouts-por-rol)
12. [Frontend: consumir permisos](#12-frontend-consumir-permisos)
13. [Roles predefinidos](#13-roles-predefinidos)
14. [API GraphQL de permisos](#14-api-graphql-de-permisos)
15. [Service accounts](#15-service-accounts)
16. [Guia para mods: como integrar RBAC](#16-guia-para-mods-como-integrar-rbac)
17. [Roles internos de mod/App](#17-roles-internos-de-modapp)
18. [Autenticacion vs autorizacion: requireAuth](#18-autenticacion-vs-autorizacion-requireauth)
19. [Mutations custom de mod: sin auth automatica del core](#19-mutations-custom-de-mod-sin-auth-automatica-del-core)
20. [Rol activo server-authoritative](#20-rol-activo-server-authoritative)
21. [Membresia de tenant y escritura sobre objetos publicos](#21-membresia-de-tenant-y-escritura-sobre-objetos-publicos)

Para el detalle transversal de hardening de seguridad (headers, limites GraphQL, timing-safe compare, codigos de error), ver [features/security-hardening.md](./security-hardening.md).

---

## 1. Modelo general

RBAC jerarquico inspirado en Moodle. Modelo de 5 entidades:

```text
  ┌─────────────┐
  │  core_User  │
  └──────┬──────┘
         ▼
  ┌──────────────────────┐
  │  core_RoleAssignment │
  └──────┬───────────────┘
         │
    ┌────┴───────────┐
    ▼                ▼
┌──────────┐  ┌──────────────┐
│core_Role │  │core_Context  │
└─────┬────┘  └──────────────┘
      ▼
┌──────────────────┐
│core_RoleCapability│
└──────────┬────────┘
           ▼
  ┌────────────────────┐
  │   core_Capability  │
  └────────────────────┘
```

**Principios:**
- Un usuario puede tener **multiples roles** (acumulativos)
- Los permisos se suman — si Role A da `person:view` y Role B da `person:modify`, el usuario tiene ambos
- Cada asignacion de rol tiene un **contexto** (tenant, institucion, campus) que limita su alcance
- Las capabilities tienen 3 niveles: **modulo** (`mod/wellbeing:view360`), **objeto** (`person:view`), **campo** (`person.salary:modify`)
- Field-level sobreescribe object-level

---

## 2. Entidades del sistema

### core_User

```prisma
model core_User {
  id             Int      @id @default(autoincrement())
  clerkUserId    String?  @unique    // ID de Clerk JWT
  email          String   @unique
  active         Boolean  @default(true)
  roleAssignments core_RoleAssignment[]
}
```

### core_Role

```prisma
model core_Role {
  id          Int      @id @default(autoincrement())
  name        String   @unique    // "Admin", "Consultor", "Coordinador"
  description String?
  archetype   String?             // sysadmin | admin | manager | user
  isActive    Boolean  @default(true)
  roleCapabilities  core_RoleCapability[]
  roleAssignments   core_RoleAssignment[]
}
```

### core_Capability

```prisma
model core_Capability {
  id                    Int      @id @default(autoincrement())
  name                  String   @unique   // "person:view", "mod/wellbeing:view360"
  description           String?
  riskLevel             String?            // low | medium | high
  applicableContextTypes Json?
  objectDefinitionId    Int?               // FK a ObjectDefinition (auto-generada)
  fieldDefinitionId     Int?               // FK a FieldDefinition (auto-generada)
  roleCapabilities      core_RoleCapability[]
}
```

### core_RoleCapability (tabla pivot)

```prisma
model core_RoleCapability {
  id           Int    @id @default(autoincrement())
  roleId       Int
  capabilityId Int
  defaultValue String @default("allow")   // allow | prohibit | inherit
  @@unique([roleId, capabilityId])
}
```

### core_RoleAssignment

```prisma
model core_RoleAssignment {
  id          Int     @id @default(autoincrement())
  userId      Int
  roleId      Int
  contextId   Int
  contextPath String  // Denormalizado: "/system/UPU" (performance)
  isActive    Boolean @default(true)
  @@unique([userId, roleId, contextId])
}
```

### core_Context

```prisma
model core_Context {
  id          Int     @id @default(autoincrement())
  name        String
  path        String  @unique   // "/system", "/system/UPU", "/system/UPU/campus/NORTE"
  depth       Int
  segments    Json               // Parsed path as key-value
  hasWildcard Boolean @default(false)
  parentId    Int?               // Self-relation (jerarquia)
}
```

### core_ModRole / core_ModRoleCapability

Roles internos por App (UPONE-1353). Agrupan capabilities reutilizables y se mapean a un rol institucional por App. Detalle del mecanismo en la seccion 17.

```prisma
model core_ModRole {           // rol interno ligado a una App
  id     Int    @id @default(autoincrement())
  appId  Int
  name   String                // "Admin", "Teacher", ...
}
model core_ModRoleCapability { // capabilities incluidas en un rol interno
  id           Int    @id @default(autoincrement())
  modRoleId    Int
  capabilityId Int
}
```

`up1_suite_app_role.modRoleId` (objeto fuente en el repo `suite`) es el mapping opcional entre App + rol institucional y el rol interno.

### core_ServiceAccount

Cuentas de servicio en BD, con alcance de operaciones (UPONE-1353). Detalle en la seccion 15.

```prisma
model core_ServiceAccount {
  id         Int      @id @default(autoincrement())
  secretHash String                       // hash del secreto; el token viaja con prefijo up1_svc_
  allowedOps Json                         // array de patrones op ("Person:view", "*:*", ...)
  expiresAt  DateTime?
  active     Boolean  @default(true)
  lastUsedAt DateTime?
}
```

---

## 3. Tipos de capabilities

### Auto-generadas (desde objetos)

El script `generateCapabilities.js` crea capabilities automaticamente desde `core_ObjectDefinition`:

**Object-level** (4 por objeto):

```
person:view
person:create
person:modify
person:delete
```

**Field-level** (2 por campo no-comun):

```
person.salary:view
person.salary:modify
person.email:view
person.email:modify
```

Campos comunes (`id`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `tenantId`) **no** generan field-level capabilities.

### Custom de mods/proyectos

Definidas en `capabilities.json`:

```
mod/wellbeing:view360
mod/wellbeing:manage_alerts
mod/retention:view_reports
report:create
report:export
```

### System capabilities

```
system:admin
system:manage_users
system:manage_roles
system:view_logs
system:manage_objects
```

---

## 4. Contextos jerarquicos

Cada asignacion de rol tiene un contexto que limita su alcance:

```text
  ┌─────────────────────────────────────────┐
  │              /system/                   │
  └──────────────────┬──────────────────────┘
                     ▼
  ┌─────────────────────────────────────────┐
  │            /system/UPU/                 │
  └──────────────────┬──────────────────────┘
                     ▼
  ┌─────────────────────────────────────────┐
  │       /system/UPU/campus/NORTE/         │
  └──────────────────┬──────────────────────┘
                     ▼
  ┌─────────────────────────────────────────┐
  │  /system/UPU/campus/NORTE/faculty/CS/   │
  └─────────────────────────────────────────┘
```

### Resolucion

Cuando un request llega con `contextPath: /system/UPU`, se buscan capabilities del usuario cuyo `roleAssignment.contextPath` sea **prefijo o igual**:

```
Assignment con contextPath /system       → MATCH (prefijo)
Assignment con contextPath /system/UPU   → MATCH (igual)
Assignment con contextPath /system/TEST  → NO MATCH (otro tenant)
Assignment con contextPath /system/UPU/campus/NORTE → MATCH (mas especifico, incluido)
```

### Wildcards

`/system/UPU/campus/*` matchea cualquier campus de UPU.

---

## 5. Flujo de autenticacion

```
Request HTTP
  │
  │ Headers: Authorization: Bearer <JWT>, X-Tenant-ID: UPU
  ▼
userExtractor.js
  │
  ├─ 1. ¿UP1_FLOW_SERVICE_TOKEN? → isServiceAccount: true (bypass RBAC)
  ├─ 2. ¿STORYBOOK_STATIC_TOKEN? → busca STORYBOOK_MOCK_EMAIL en DB
  ├─ 3. ¿RBAC_TEST_MODE=true? → simula profile.manager@uplanner.cl
  └─ 4. Clerk JWT: verifica con JWKS → extrae clerkUserId → busca core_User
       │
       │ Include: roleAssignments → role → roleCapabilities → capability + context
       ▼
  context = {
    user: { id, email, roleAssignments: [...] },
    prisma: PrismaClient,
    tenantId: "UPU",
    contextPath: "/system/UPU",
    selectedRole: "Admin"  // de header X-Selected-Role
  }
       │
       ▼
  Resolver ejecuta con context
```

---

## 6. withAuth: proteger resolvers

### Uso basico

```javascript
import { withAuth } from '../../../../services/auth/withAuth.js';

export const miModQuery = {
  getMisDatos: withAuth(['mod/mi-mod:view_data'], async (parent, args, context) => {
    return context.prisma.miObjeto.findMany({
      where: { tenantId: context.tenantId }
    });
  }),
};
```

### Logica OR (basta con una capability)

```javascript
// El usuario necesita AL MENOS UNA de estas capabilities
getMisDatos: withAuth(
  ['mod/mi-mod:view_data', 'mod/mi-mod:manage_data'],
  resolver
)
```

### Solo admin

```javascript
import { requireAdmin } from '../../../../services/auth/withAuth.js';

export const adminQuery = {
  getSystemConfig: requireAdmin(async (parent, args, context) => { ... }),
};
```

### Verificacion manual (soft check)

```javascript
import { hasCapability } from '../../../../services/auth/authChecker.js';

export const miQuery = {
  getDatos: async (parent, args, context) => {
    const data = await context.prisma.miObjeto.findMany({ ... });

    // Ocultar campo sensible si no tiene permiso
    const canViewSalary = await hasCapability(context, ['person.salary:view']);
    if (!canViewSalary) {
      data.forEach(d => delete d.salary);
    }

    return data;
  }
};
```

### Verificacion condicional

```javascript
export const miMutation = {
  updateRecord: withAuth(['miobjeto:modify'], async (parent, { input }, context) => {
    // Verificar field-level solo si se modifica un campo sensible
    if (input.budget !== undefined) {
      await checkCapability(context, ['miobjeto.budget:modify']);
    }
    return context.prisma.miObjeto.update({ ... });
  }),
};
```

### Funciones disponibles

| Funcion | Import | Comportamiento |
|---------|--------|---------------|
| `withAuth(caps[], resolver)` | withAuth.js | HOF. Lanza error si no tiene cap. OR logic |
| `requireCapability(cap, resolver)` | withAuth.js | Alias de withAuth para 1 cap |
| `requireAdmin(resolver)` | withAuth.js | Alias: withAuth(['system:admin']) |
| `withObjectAuth(action, resolver)` | withAuth.js | Genera cap desde objectType del args |
| `checkCapability(context, caps[])` | authChecker.js | Lanza error si no tiene. Para verificacion manual |
| `hasCapability(context, caps[])` | authChecker.js | Retorna boolean. No lanza error |
| `checkObjectPermissions(ctx, objType, action)` | authChecker.js | Genera cap `{obj}:{action}` |
| `checkFieldPermissions(user, objType, fields[], action)` | authChecker.js | Verifica por cada campo |
| `requireAuth(resolver)` | withAuth.js | Exige `context.user` (autenticacion). No verifica ninguna capability |
| `assertAuthenticated(context)` | withAuth.js | Forma imperativa de `requireAuth`, para modulos que no pueden importar top-level |

Detalle de `requireAuth` vs `withAuth` en la seccion 18.

---

## 7. Permisos a nivel de objeto

`withObjectAuth` genera la capability automaticamente desde el `objectType` del args:

```javascript
import { withObjectAuth } from '../../../../services/auth/withAuth.js';

export const miMutation = {
  createRecord: withObjectAuth('create', async (parent, args, context) => {
    // args.objectType = "Person" → verifica "person:create"
    return context.prisma[args.objectType].create({ ... });
  }),
};
```

### Objetos publicos (bypass RBAC)

Estos objetos **no requieren verificacion** de permisos:

```javascript
const PUBLIC_OBJECTS = ['up1_suite_app', 'up1_layen_layout', 'N8nWorkflow'];
```

> **Nota (UPONE-1353, seccion 21):** "publico" cubre solo LECTURAS. Los writes sobre estos tres objetos pasan por el gate de capability igual que cualquier otro objeto; la unica excepcion declarativa es una ventana de ownership acotada a `up1_layen_layout` (`OWNER_SCOPED_OBJECTS`), detallada en la seccion 21.

### Fallback view/modify con field-level

Si un usuario no tiene `person:view` pero tiene `person.salary:view`, el sistema **permite el acceso** al objeto Person (gate object-level) pero solo muestra los campos para los que tiene field-level view caps.

El mismo fallback aplica a `modify`: si un usuario no tiene `person:modify` pero tiene `person.salary:modify`, el sistema **permite el acceso** al objeto Person en el gate object-level, y luego `checkFieldPermissions` sigue limitando que campos puede escribir realmente.

> **Nota (UPONE-1393, 2026-07-10):** antes de este fix el fallback field-level en el backend solo aplicaba a `view`. Como consecuencia, un usuario con solo una capability field-level de `modify` (ej. `person.salary:modify`) era rechazado en el gate object-level antes de llegar al chequeo granular. Evidencia: `object-manager/src/services/auth/authChecker.js` (`checkObjectPermissions`, `authChecker.js:232`) ahora cubre `action === 'view' || action === 'modify'` (`authChecker.js:291`) y filtra las capabilities que terminan en `:${action}` via `endsWith` (`authChecker.js:293-295`, RT en `:299-302`). En resolvers, `object-manager/src/graphql/resolvers/instance.resolver.js` reactivo `checkFieldPermissions` en `updateInstance` (base-path `instance.resolver.js:4217`, comentario "Re-enabled (UPONE-1393)" en `:4190-4196`), en el early-return de RecordType (`:4104`) y en `updateBulkInstances` (`:4665`).

---

## 8. Permisos a nivel de campo

### Como funciona

El field-level **sobreescribe** el object-level:

```
1. ¿Tiene person.salary:modify? → Si → permitir modificar salary
2. ¿No tiene? → Fallback a person:modify → Si → permitir
3. ¿Tampoco tiene? → Denegar
```

### En resolvers

```javascript
import { checkFieldPermissions } from '../../../../services/auth/authChecker.js';

// Antes de update, verificar permisos sobre los campos que se modifican
await checkFieldPermissions(
  context.user,
  'Person',
  Object.keys(input),  // ["salary", "email", "name"]
  'modify'
);
// Lanza error si no tiene permiso para alguno de los campos
```

### En frontend

```typescript
import { useRbacPermissions } from '@/composables/useRbacPermissions';

const { isFieldModifiable } = useRbacPermissions();

// ¿Puede editar el campo salary de Person?
const canEditSalary = isFieldModifiable('person', 'salary');
// 1. Busca person.salary:modify → 2. Fallback: person:modify → 3. deny
```

### Auto-generacion

`generateCapabilities.js` genera field-level caps para:
- **Todos** los campos de objetos extended (custom)
- Campos base que **no** estan en `common.json` (id, createdAt, etc. se excluyen)

### Paridad list ↔ detail (UPONE-1439)

`listInstances` y `getInstance` (`object-manager/src/graphql/resolvers/instance.resolver.js`) comparten la misma logica de filtrado field-level: `computeFieldViewAccess` y `filterDataByAllowedFields` (`object-manager/src/services/auth/authChecker.js:476` y `:513`). Ambas funciones calculan una vez si el usuario paso el gate object-level por fallback field-level (ver seccion 7) y, de ser asi, recortan la respuesta a solo los campos con `:view` real.

> **Nota (UPONE-1439):** antes de este fix, `getInstance` devolvia **todos** los campos del registro apenas pasaba el gate object-level, incluso cuando ese gate solo se cumplia por el fallback field-level (tener cualquier `objeto.campo:view`, sin tener `objeto:view`). `listInstances` ya aplicaba el filtro; `getInstance` no, exponiendo en el detalle campos para los que el usuario no tenia capability. La extraccion a helpers compartidos cierra la fuga y evita que list y detail vuelvan a divergir.

---

## 9. Capabilities custom de mods

### Formato de capabilities.json

```json
{
  "module": "mi-mod",
  "version": "1.0.0",
  "capabilities": [
    {
      "name": "mod/mi-mod:view_dashboard",
      "description": "Ver dashboard del modulo",
      "riskLevel": "low"
    },
    {
      "name": "mod/mi-mod:manage_records",
      "description": "Crear y gestionar registros",
      "riskLevel": "medium"
    },
    {
      "name": "mod/mi-mod:delete_records",
      "description": "Eliminar registros",
      "riskLevel": "high"
    },
    {
      "name": "miobjeto.campoSensible:view",
      "description": "Ver campo sensible en MiObjeto",
      "riskLevel": "low"
    }
  ]
}
```

### Convenciones de nombre

| Nivel | Patron | Ejemplo |
|-------|--------|---------|
| Modulo | `mod/{modname}:{accion}` | `mod/wellbeing:view360` |
| Objeto | `{objectname}:{accion}` | `report:create` |
| Campo | `{objectname}.{field}:{accion}` | `hwassessment.riskScore:modify` |
| Sistema | `system:{accion}` | `system:admin` |

### Riesgo

| riskLevel | Significado | Ejemplo |
|-----------|-------------|---------|
| `low` | Solo lectura, no sensible | view_dashboard, view_reports |
| `medium` | Escritura, dato semi-sensible | manage_records, edit |
| `high` | Destructivo o altamente sensible | delete, manage_interventions |

### Mezcla de niveles

Un mod puede definir capabilities de **modulo** y **campo** en el mismo archivo:

```json
{
  "capabilities": [
    { "name": "mod/hello-world:view_assessments", "riskLevel": "low" },
    { "name": "hwassessment.riskScore:view", "riskLevel": "low" },
    { "name": "hwassessment.riskScore:modify", "riskLevel": "medium" }
  ]
}
```

---

## 10. Sync de capabilities

### Que pasa en `npm run sync` (Fase 3)

```
1. Escanea capabilities.json de cada proyecto (suite, layout, flow, etc.)
2. Escanea capabilities.json de cada mod en mods/
3. Por cada capability:
   - Si no existe en core_Capability → CREATE
   - Si existe → UPDATE (description, riskLevel)
4. Nuevas capabilities → auto-asignar a roles por defecto (Admin, Consultor, Colaborador) con defaultValue: 'allow'
5. Limpieza: elimina capabilities custom que ya no existen en ningun JSON
```

### Auto-asignacion a roles por defecto

Cuando el sync crea una capability nueva, la asigna automaticamente con `defaultValue: 'allow'` a:
- **Admin**
- **Consultor**
- **Colaborador**

Esto significa que al agregar una nueva capability al mod, los usuarios con estos roles la obtienen automaticamente.

---

## 11. Filtrado de apps y layouts por rol

### En app.json del mod

```json
{
  "name": "engagement",
  "roles": ["Admin", "Consultor", "Colaborador", "Coordinador"]
}
```

Sin `roles` → visible para todos.

### En layouts del mod

```json
{
  "name": "mi_objeto_list",
  "roles": ["Admin", "Coordinador"]
}
```

Sin `roles` → visible para todos.

### Como funciona el filtrado

```
Server: getAppsFiltered / getAllLayoutsFiltered
  │
  ├─ 1. Carga apps/layouts activos
  ├─ 2. Lee junction tables (up1_suite_app_role, up1_layen_layout_role)
  ├─ 3. Si app/layout sin roles → siempre visible (publico)
  ├─ 4. Si app/layout con roles → user necesita al menos uno
  └─ 5. Si header X-Selected-Role → filtra adicionalmente a ese rol

Frontend: availableApplications (computed)
  │
  └─ Filtra por requiredPermissions via hasCapability()
```

### Doble capa de filtrado

1. **Server-side**: filtrado por rol (via junction tables)
2. **Client-side**: filtrado por capabilities (via `requiredPermissions` en el layout)

Esto permite:
- `roles: ["Admin"]` → solo Admin ve la app/layout
- `requiredPermissions: ["report:view"]` → dentro de los que ven la app, solo los que tienen la capability

---

## 12. Frontend: consumir permisos

### useRbacPermissions (singleton)

```typescript
import { useRbacPermissions } from '@/composables/useRbacPermissions';

const {
  fetchCapabilities,       // Carga capabilities del backend
  hasCapability,           // ¿Tiene esta capability?
  getEffectivePermission,  // Combina config + capability
  isFieldModifiable,       // ¿Puede modificar este campo?
} = useRbacPermissions();
```

### hasCapability — verificacion simple

```typescript
// ¿Puede crear reportes?
if (hasCapability('report:create')) {
  showCreateButton.value = true;
}
```

### getEffectivePermission — combinar config de layout + capability

```typescript
// Si el layout dice canCreate: false → SIEMPRE deny (hard override)
// Si el layout dice canCreate: true o no dice → verificar capability
const canCreate = getEffectivePermission('report', 'create', layoutConfig.canCreate);
```

Para `action === 'modify'`, `getEffectivePermission` (`useRbacPermissions.ts:115`) tambien hace fallback a las field-level caps: si el usuario no tiene `report:modify` pero tiene alguna `report.<campo>:modify`, devuelve `true` (`:136-142` en RecordType, `:147-151` en objetos no-RT). Es el mismo mecanismo que ya usaba `hasViewPermission` (`:169`), que sirve de "reference shape" que `modify` ahora replica.

> **Importante:** la sincronizacion entre `authChecker.js` (backend) y `useRbacPermissions.ts` (frontend) es **manual**. UPONE-1393 encontro que ambas capas habian divergido: el frontend ya concedia el fallback de `modify` mientras el backend lo rechazaba. Al tocar cualquiera de las dos, revisa la otra; este acoplamiento implicito cruza repos y no hay chequeo automatico que lo detecte.

### isFieldModifiable — permisos de campo

```typescript
// ¿Puede editar el campo salary de Person?
const canEditSalary = isFieldModifiable('person', 'salary');
```

### useRoleSelection — seleccion de rol activo

```typescript
import { useRoleSelection } from '@/composables/useRoleSelection';

const {
  selectedRole,     // Rol activo
  availableRoles,   // Roles del usuario
  selectRole,       // Cambiar rol
  loadAvailableRoles,
} = useRoleSelection();

// Cambiar rol → re-fetcha apps, layouts, capabilities
selectRole({ name: 'Coordinador', contextPath: '/system/UPU' });
```

El rol seleccionado se envia como header `X-Selected-Role` en cada request GraphQL via el plugin de Apollo.

> **Nota (UPONE-1353, seccion 20):** desde `resolveActiveRole`, el backend acepta este header como pista pero lo ignora para autorizar: el rol que realmente gobierna el request es el que resuelve server-side desde `core_User.activeRoleId`. Un mismatch entre el header y el rol resuelto se loguea (`rbac.active_role_mismatch`), no se obedece.

### En RecordList: row actions con requiredCapability

```json
{
  "rowActions": [
    {
      "id": "create-child",
      "label": "Crear Hijo",
      "requiredCapability": "mod/mi-mod:manage_records"
    }
  ]
}
```

El Layout Engine verifica `hasCapability('mod/mi-mod:manage_records')` antes de mostrar el boton.

---

## 13. Roles predefinidos

### Del seed/bootstrap

| Rol | Archetype | Origen | Capabilities |
|-----|-----------|--------|-------------|
| Admin | sysadmin | Bootstrap de tenant | TODAS las capabilities con `allow` |
| Consultor | — | Sync de capabilities | Nuevas caps auto-asignadas |
| Colaborador | — | Sync de capabilities | Nuevas caps auto-asignadas |

### Creados dinamicamente

Cuando un `app.json` o layout JSON referencia un rol que no existe (ej: `"Coordinador"`), el sync lo **crea automaticamente** en `core_Role`.

### Archetypes

| Archetype | Significado |
|-----------|-------------|
| `sysadmin` | Administrador del sistema completo |
| `admin` | Administrador de tenant |
| `manager` | Gestor con permisos amplios |
| `user` | Usuario regular |

---

## 14. API GraphQL de permisos

### Queries

```graphql
# Obtener permisos del usuario actual
query {
  getMyPermissions {
    user { id email }
    currentTenant
    currentContext
    roles { name description contextPath }
    contexts { path name }
    capabilities { name description roleName contextPath }
    capabilityNames   # Array plano de strings para hasCapability
  }
}

# Roles disponibles
query { getAvailableRoles { id name description } }

# Roles de una app
query { getAppRoleNames(appId: "clx...") }

# Capabilities de roles por objeto
query {
  getObjectRoleCapabilities(objectName: "Person") {
    role
    capabilities
  }
}
```

### Mutations

```graphql
# Gestionar roles de una app
mutation {
  manageAppRoles(appId: "clx...", roleNames: ["Admin", "Coordinador"])
}

# Gestionar capabilities de roles por objeto
mutation {
  manageObjectRoles(
    objectName: "Person"
    assignments: [
      { role: "Coordinador", capabilities: ["person:view", "person:modify"] }
      { role: "Estudiante", capabilities: ["person:view"] }
    ]
  )
}
```

---

## 15. Service accounts

### core_ServiceAccount (cuentas en BD, con alcance) — UPONE-1353

Mecanismo principal de acceso programatico. Cada cuenta vive en `core_ServiceAccount` (ver seccion 2) y define un conjunto de operaciones permitidas (`allowedOps`), no un bypass.

- **Token**: prefijo `up1_svc_`. `userExtractor.js` (`extractUser`) hashea el token, busca la cuenta por `secretHash` y valida `active` + `expiresAt` antes de aceptarla; setea `isServiceAccount: true` y carga `allowedOps` como un `Set`.
- **No es bypass**: la cuenta **pasa** por `checkCapability`, `checkObjectPermissions` y `checkFieldPermissions` (`authChecker.js`), solo que la validacion se hace contra `allowedOps` en vez de contra roles. El matcher `serviceAccountHasOp` soporta comodines: `Objeto:accion`, `*:accion`, `Objeto:*` y `*:*` (acceso total). Una cuenta con `allowedOps` acotado tiene restricciones reales.
- **Unico bypass que queda**: el filtro de contexto de negocio (`businessContextFilter.js`: `if (user.isServiceAccount) return {}`), que no aplica scoping por tenant/contexto a las cuentas de servicio.
- **Gestion**: mutations `listServiceAccounts` / `createServiceAccount` / ... (`serviceAccount.resolver.js`), gateadas por `core_serviceaccount:{view,create,edit}`. La UI vive en up1-manager (`serviceaccount-{list,create,view}.json`); `allowedOps` se edita con el componente `CapabilityPatternEditor`. El campo legacy `allowedTenants` fue removido.

### n8n / Flow Engine

Variable `UP1_FLOW_SERVICE_TOKEN`. Si el Bearer del request coincide, `userExtractor` marca `isServiceAccount: true` con `allowedOps = { '*:*' }`. No es un bypass distinto: recorre los mismos `checkCapability`/`checkObjectPermissions`/`checkFieldPermissions` que cualquier cuenta, validando contra el comodin `*:*` (por eso pasa todo). El unico bypass real, igual que arriba, es `businessContextFilter.js:97`.

### Storybook (desarrollo)

Variable `STORYBOOK_STATIC_TOKEN` (solo en `NODE_ENV !== 'production'`):
- Busca usuario por `STORYBOOK_MOCK_EMAIL` en BD
- Usa sus roleAssignments reales

### RBAC_TEST_MODE (desarrollo)

Variable `RBAC_TEST_MODE=true` (solo en `NODE_ENV !== 'production'`):
- Simula el usuario `profile.manager@uplanner.cl`
- Sin necesidad de JWT de Clerk

---

## 16. Guia para mods: como integrar RBAC

### Paso 1: Definir capabilities en capabilities.json

```json
{
  "module": "mi-mod",
  "version": "1.0.0",
  "capabilities": [
    { "name": "mod/mi-mod:view_dashboard", "riskLevel": "low" },
    { "name": "mod/mi-mod:manage_records", "riskLevel": "medium" },
    { "name": "mod/mi-mod:delete_records", "riskLevel": "high" },
    { "name": "miobjeto.campoSensible:view", "riskLevel": "low" },
    { "name": "miobjeto.campoSensible:modify", "riskLevel": "medium" }
  ]
}
```

### Paso 2: Proteger resolvers con withAuth

```javascript
import { withAuth } from '../../../../services/auth/withAuth.js';

export const miModQuery = {
  getDashboard: withAuth(['mod/mi-mod:view_dashboard'], async (parent, args, context) => {
    return context.prisma.miObjeto.findMany({ where: { tenantId: context.tenantId } });
  }),
};

export const miModMutation = {
  deleteRecord: withAuth(['mod/mi-mod:delete_records'], async (parent, { id }, context) => {
    return context.prisma.miObjeto.delete({ where: { id, tenantId: context.tenantId } });
  }),
};
```

### Paso 3: Filtrar apps y layouts por rol

```json
// config/app.json
{ "roles": ["Admin", "Coordinador"] }

// config/layouts/mi-lista.json
{ "roles": ["Admin", "Coordinador", "Docente"] }
```

### Paso 4: Agregar requiredCapability a row actions

```json
{
  "rowActions": [
    {
      "id": "delete",
      "label": "Eliminar",
      "requiredCapability": "mod/mi-mod:delete_records"
    }
  ]
}
```

### Paso 5: Verificar permisos en componentes Vue

```typescript
import { useRbacPermissions } from '@/composables/useRbacPermissions';

const { hasCapability, isFieldModifiable } = useRbacPermissions();

const canManage = hasCapability('mod/mi-mod:manage_records');
const canViewSensitive = isFieldModifiable('miobjeto', 'campoSensible');
```

### Paso 6: Sync

```bash
npm run sync   # Fase 3 sincroniza capabilities → auto-asigna a Admin, Consultor, Colaborador
```

### Diagrama resumen

```
capabilities.json ──→ npm run sync (Fase 3) ──→ core_Capability (BD)
                                                      │
                                                      ▼
                                              core_RoleCapability
                                              (auto-asignado a Admin, Consultor, Colaborador)
                                                      │
                                                      ▼
Resolver: withAuth(['mod/mi-mod:view']) ──→ authChecker.checkCapability()
                                              │
                                              ├─ user.roleAssignments
                                              ├─ role.roleCapabilities
                                              ├─ capability.name match
                                              └─ contextPath match
                                                      │
                                                      ▼
                                              Allow / Deny

Layout: "requiredCapability" ──→ useRbacPermissions.hasCapability()
                                              │
                                              └─ capabilityNames.includes()
                                                      │
                                                      ▼
                                              Show / Hide boton
```

---

## 17. Roles internos de mod/App

Ademas de asignar capabilities directo a un rol institucional via `core_RoleCapability` (secciones 2 y 3), una App puede declarar **roles internos** que agrupan capabilities reutilizables. Asi un mismo rol institucional (ej. `Director`) puede mapear a distintos niveles de acceso segun la App. Ticket UPONE-1353.

### Cadena de resolucion

```
Usuario
  → core_RoleAssignment → core_Role
      ├─ core_RoleCapability                     (capabilities directas)
      └─ up1_suite_app_role.modRoleId → core_ModRole → core_ModRoleCapability
```

En runtime, `enrichUserWithModRoleCapabilities` (`object-manager/src/services/auth/modRoleCapabilities.js`, invocado desde `userExtractor.js`) suma en un set plano las capabilities directas del rol institucional MAS las de todos los roles internos mapeados en Apps activas, antes de que corran `checkCapability`/`checkObjectPermissions`.

### Reglas (verificadas en codigo)

- El mapping es **aditivo**: no reemplaza ni modifica `core_RoleCapability`.
- **`extends`** hereda capabilities de otro rol interno de la misma App (con guard de ciclos).
- **Sin scoping por App actual**: si un rol mapea a `Admin` en Engagement y a `Teacher` en Scheduling, ambas familias de capabilities quedan disponibles a la vez.
- Apps inactivas (`up1_suite_app.isActive = false`) no aportan capabilities.
- Los duplicados se deduplican por nombre de capability.

### Materializacion por sync

Los roles internos se declararian en `mods/<mod>/roles/*.json` (`{ name, description, extends, capabilities }`), y el sync (`dbSync.js`) los upsertea a `core_ModRole` + `core_ModRoleCapability`. Detalles del ciclo de vida:

- Borrar un `roles/*.json`: sus mappings quedan con `modRoleId = null`; el mapping App+Rol no se borra.
- Un mod sin ningun `roles/*.json`: sus roles internos previos se consideran obsoletos y se eliminan por sync.
- JSON malformado: el sync **salta el borrado de stale roles** de ese mod y emite warn (no destruye mappings por un archivo corrupto transitorio).
- La eliminacion por sync registra una entrada forense en `core_SchemaAuditLog` con `reason = "mod-role-sync-delete"` (snapshot del rol, sus capabilities y los mappings afectados).
- `roles/*.json` solo referencia capabilities existentes; el sync no crea capabilities fantasma.

> **Estado actual (verificado 2026-07-20)**: el mecanismo esta implementado y activo, pero **ningun mod declara hoy una carpeta `roles/`**, asi que no hay roles internos materializados. La UI de edicion de App (up1-manager, row action "Roles" sobre la lista de apps → modal `app-role-mappings-list`) administra los mappings institucional → interno; no hay layouts para editar `core_ModRoleCapability` (el contenido del paquete se cambia en codigo y se aplica con sync).

---

## 18. Autenticacion vs autorizacion: requireAuth

`withAuth`/`checkCapability` responden "¿tiene esta capability?" (autorizacion). `requireAuth` responde una pregunta distinta y mas simple: "¿hay un usuario autenticado?" (autenticacion), sin exigir ninguna capability puntual.

### Por que existe un gate separado

Varias queries de "boot" alimentan la navegacion de Suite para **cualquier rol logueado**: listar apps disponibles, layouts, configs. Gatearlas con una capability especifica (`withAuth(['algo:view'])`) dejaria afuera a roles que legitimamente no tienen esa capability pero si deben recibir una respuesta (el filtrado real ya ocurre por fila/campo dentro del propio resolver — ver secciones 7, 8 y 11). `requireAuth` solo bloquea el acceso anonimo; no reemplaza el filtrado interno.

```javascript
// object-manager/src/services/auth/withAuth.js
export function assertAuthenticated(context) {
  if (!context?.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
}

export function requireAuth(resolver) {
  return async function authenticatedResolver(parent, args, context, info) {
    assertAuthenticated(context);
    return resolver(parent, args, context, info);
  };
}
```

### Uso real (UPONE-1412, SEC-02)

```javascript
// object-manager/src/graphql/resolvers/up1/suite/app.resolver.js
getAppsFiltered: requireAuth(async (_, args, { prisma, user, selectedRole }) => {
  // context.user garantizado; el filtrado por rol sigue aparte (junction tables, seccion 11)
}),
```

```javascript
// object-manager/src/graphql/resolvers/up1/report-builder/reportData.resolver.js
export const reportBuilderQuery = Object.fromEntries(
  Object.entries(reportBuilderQueryRaw).map(([name, resolver]) => [name, requireAuth(resolver)])
);
```

Todas las queries de lectura de `reportBuilderQuery` y `reportTemplateQuery`, y `getConfigs`/`getConfigApps` (`coreConfig.resolver.js`), quedan protegidas asi: rechazan acceso anonimo, mantienen el resultado disponible para cualquier rol logueado. Las mutations de esos mismos mods siguen gateadas por capability especifica (`withAuth`), sin cambios.

### Regla practica

| Necesitas... | Usa |
|---|---|
| Bloquear anonimos, permitir cualquier rol logueado (boot reads, pickers, dashboards de solo-lectura ampliamente compartidos) | `requireAuth(resolver)` |
| Restringir a quienes tengan una capability puntual | `withAuth(['cap'], resolver)` |
| Ambas cosas (autenticado Y con capability) | `withAuth` ya lo cubre: `checkCapability` exige usuario autenticado como precondicion |

---

## 19. Mutations custom de mod: sin auth automatica del core

El motor CRUD generico (`createInstance`, `updateInstance`, `deleteInstance`, `listInstances`, `getInstance`, bulk *, etc., todos en `object-manager/src/graphql/resolvers/instance.resolver.js`) envuelve **automaticamente** cada resolver con `withObjectAuth(action, resolver)` (seccion 7): cualquier objeto (base, extended, RecordType) que pase por ese motor generico queda gateado sin que el mod tenga que hacer nada.

Ese auto-gating **no aplica** a mutations custom que un mod define fuera del motor generico (funciones nuevas, registradas aparte, no un override de `create/updateInstance`). El core no sabe que existen hasta que se registran como resolvers propios, asi que no las envuelve con nada. **El mod es responsable de llamar `checkObjectPermissions` (u otro gate equivalente) el mismo dentro de cada mutation custom**, antes de tocar la base de datos.

### Caso verificado: `curriculum-mapping` (LevelScheme)

`upsertLevelSchemeValidated`, `deleteLevelSchemeValidated` y `setLevelSchemeActiveValidated` (`mods/curriculum-mapping/logic/levelScheme-upsert.resolver.js`) son mutations custom: el generic no soporta dirty-checking, rename en dos fases ni hard-delete FK-safe para RecordTypes, asi que el mod escribe su propio pipeline transaccional. Al ser mutations nuevas (no overrides), **no pasan por `withObjectAuth`** — el chequeo se agrega a mano:

```javascript
// mods/curriculum-mapping/logic/levelScheme-upsert.resolver.js
await checkPermission(context, LEVELSCHEME_OBJECT, id ? 'modify' : 'create');   // upsert (linea 104)
await checkPermission(context, LEVELSCHEME_OBJECT, 'modify');                   // soft-delete (linea 443)
await checkPermission(context, LEVELSCHEME_OBJECT, 'delete');                   // hard-delete (linea 541)
```

```javascript
// mods/curriculum-mapping/logic/helpers/resolverUtils.js
// Carga checkObjectPermissions del platform (authChecker) via dynamic import (synced/source), con cache.
// checkObjectPermissions(context, objectType, action) LANZA si no hay permiso (o no hay user)
// y resuelve la capability como `{objeto}:{action}` (LEVELSCHEME_OBJECT -> "levelscheme:modify", etc).
```

`checkPermission` es el nombre inyectado en el pipeline (`loadCheckObjectPermissions`), con un default no-op (`ALLOW_ALL_PERMISSIONS`) solo para tests que no ejercitan RBAC; en produccion siempre se inyecta el chequeo real.

### Regla practica para cualquier mod

Al escribir una mutation GraphQL de mod que **no** sea un simple override de `createInstance`/`updateInstance`/`deleteInstance` del motor generico:

1. No asumir que hay auth automatica solo porque el objeto tiene capabilities generadas.
2. Llamar `checkObjectPermissions(context, ObjectType, action)` (o `checkCapability`/`withAuth` si aplica mejor) como primera linea del resolver, antes de cualquier lectura/escritura sensible.
3. Si la mutation opera sobre campos especificos con capability granular, sumar `checkFieldPermissions` (seccion 8).

---

## 20. Rol activo server-authoritative

Antes de UPONE-1353, el rol bajo el que corria un request era el que el cliente mandaba en `X-Selected-Role`. Nueve consumidores del backend resolvian permisos con el patron `if (selectedRole) { filter }`: **omitir el header ampliaba los permisos del usuario a la union de todos sus roles asignados**, en vez de restringirlos. Una restriccion que depende de un header provisto por el cliente no es enforcement.

### resolveActiveRole

`object-manager/src/services/auth/activeRole.js` (`resolveActiveRole`) reemplaza esa fuente. La regla vive en `core_User.activeRoleId`, no en el header. Orden de resolucion:

1. Sin usuario, o service account: `null` (las cuentas de servicio responden a `allowedOps`, nunca a roles).
2. Sin asignaciones de rol: `null`.
3. Una sola asignacion: esa, sin persistir nada.
4. `activeRoleId` seteado y aun asignado al usuario: ese rol.
5. `activeRoleId` ausente, o apuntando a un rol ya no asignado (revocado): eleccion deterministica (`pickDeterministicAssignment`, ordena por id de asignacion, prefiere activas) y persistencia best-effort.

`X-Selected-Role` sobrevive solo como pista: si no coincide con el rol resuelto server-side, se loguea `rbac.active_role_mismatch` (con `userId`, `headerHint`, `activeRole`) y se ignora. `src/index.js` llena `context.selectedRole` con el valor de `resolveActiveRole`, no con el header crudo; los nueve consumidores existentes no cambian. Ver `RULE-core-046`.

### Mutation setActiveRole

```graphql
mutation {
  setActiveRole(roleName: "Coordinador") {
    # devuelve el mismo shape que getMyPermissions, ya resuelto con el rol nuevo
  }
}
```

`setActiveRole` (`object-manager/src/graphql/resolvers/user.resolver.js`, `userMutation.setActiveRole`) esta protegida solo con `requireAuth`: cambiar entre roles que el usuario YA tiene asignados no otorga nada nuevo. Verifica que `roleName` sea una de las `roleAssignments` del usuario (si no, `FORBIDDEN`), persiste `activeRoleId` en `core_User` y devuelve el resultado de `getMyPermissions` ya recalculado con el rol nuevo, para que el frontend repinte sin un segundo round-trip.

### Campo assignableRoles

`getMyPermissions` ahora expone `assignableRoles: [RoleInfo!]!` (`typeDefs/static.js:864`): el roster completo de roles que el usuario tiene en el tenant actual, independiente de cual este activo. Antes de este campo, un selector de rol obtenia esa lista omitiendo deliberadamente el header `X-Selected-Role` para que `roles` volviera como la union, truco que dejo de funcionar ahora que el rol activo es estado de servidor.

### Frontend: useRoleSelection asincrono

`suite/composables/useRoleSelection.ts`: `selectRole()` ahora es asincrono, llama a `setActiveRole` y solo actualiza el estado local si el servidor confirma. Ver `RULE-suite-010`.

---

## 21. Membresia de tenant y escritura sobre objetos publicos

Dos endurecimientos de UPONE-1414/UPONE-1353 que cierran el mismo tipo de hueco (un header o una lista de "publico" tratados como autorizacion suficiente).

### Membresia de tenant contra el claim de Clerk

`X-Tenant-ID` por si solo no autoriza el acceso al tenant. `object-manager/src/services/auth/userExtractor.js` (`getTenantMembershipFromRequest`, `isTenantAccessAllowed`) verifica la membresia contra el claim firmado de Clerk `up1Tenants` (`payload.up1Tenants`) antes de resolver el cliente Prisma del tenant.

Semantica de rollout seguro: solo un claim NO VACIO que omite el tenant deniega. Un claim ausente, vacio, o un token exento (service account `up1_svc_`, `UP1_FLOW_SERVICE_TOKEN`, `STORYBOOK_STATIC_TOKEN`, o cualquier token no-Clerk) permite el acceso, para no bloquear usuarios existentes emitidos antes de que el claim se configurara. Ver `RULE-core-047`.

### Writes sobre PUBLIC_OBJECTS: capability, no bypass

Como ya nota la seccion 7, "publico" en `PUBLIC_OBJECTS` (`up1_suite_app`, `up1_layen_layout`, `N8nWorkflow`) cubre solo lecturas (`PUBLIC_ACTIONS`, `object-manager/src/services/auth/withAuth.js`). Un write sobre cualquiera de los tres exige la capability del objeto igual que cualquier otro.

La unica excepcion es declarativa y acotada: `object-manager/src/services/auth/ownedObjectAccess.js` (`OWNER_SCOPED_OBJECTS`) permite que el DUEÑO de una fila la gestione sin la capability de objeto, hoy solo para `up1_layen_layout` (el wizard "Mis Vistas Personalizadas" de `CreateViewWizard.vue`, que cualquier usuario autenticado puede usar aunque 16 de 22 roles de un tenant de referencia carezcan de `up1_layen_layout:create`). Dos invariantes de este mecanismo:

1. El owner es SIEMPRE el usuario autenticado del request (`resolveOwnerId`), nunca un valor tomado del payload. El wizard manda `ownerId` desde un prop que por default es `null`; confiar en el payload permitiria crear una vista privada a nombre de otro usuario.
2. Solo califican creates de un unico registro. `createBulkInstances` (payload `data` es array) e `importInstances` (sin `data`) quedan fuera: el patch de ownership solo puede estampar un owner sobre un payload plano, asi que ambos siguen exigiendo la capability de objeto.

Ver `RULE-core-048`.

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-04-10 | Documento inicial: guia completa de RBAC basada en codigo fuente de auth services, schemas Prisma, docs oficiales, y capabilities de 4 mods |
| 2026-07-20 | UPONE-1353: seccion 17 (roles internos de mod/App: core_ModRole/core_ModRoleCapability, enrichUserWithModRoleCapabilities, sync + audit); seccion 15 reescrita para core_ServiceAccount (alcance por allowedOps, no bypass) y correccion del claim de bypass del flow token; entidades core_ModRole/core_ModRoleCapability/core_ServiceAccount en seccion 2 |
| 2026-08-03 | UPONE-1439: seccion 8, paridad field-view list↔detail (`computeFieldViewAccess`/`filterDataByAllowedFields` compartidos entre `listInstances` y `getInstance`). UPONE-1412: seccion 18 nueva (`requireAuth`/`assertAuthenticated`, autenticacion vs autorizacion), fila en tabla de funciones de seccion 6. Seccion 19 nueva: mutations custom de mod no reciben auth automatica del core, deben llamar `checkObjectPermissions` manualmente (verificado en `curriculum-mapping/logic/levelScheme-upsert.resolver.js`). Enlace a `features/security-hardening.md` agregado en el indice |
| 2026-08-17 | UPONE-1353: seccion 20 nueva, rol activo server-authoritative (`resolveActiveRole`, `core_User.activeRoleId`, `X-Selected-Role` degradado a pista logueada via `rbac.active_role_mismatch`, mutation `setActiveRole`, campo `assignableRoles`); seccion 12 y 7 anotadas. UPONE-1414: seccion 21 nueva, membresia de tenant contra el claim de Clerk `up1Tenants` (`getTenantMembershipFromRequest`/`isTenantAccessAllowed`) y writes sobre `PUBLIC_OBJECTS` gateados por capability salvo la excepcion de ownership de `up1_layen_layout` (`ownedObjectAccess.js`) |
