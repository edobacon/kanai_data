---
id: SPEC-features-003
project: up1
type: doc
module: features
tags:
  - up1
  - rbac
  - ejemplos
  - permisos
  - capabilities
  - withAuth
  - layouts
  - componentes
  - resolvers
  - row-actions
  - field-level
  - administracion
---

# Ejemplos practicos de RBAC en uP1

Guia con ejemplos reales de como crear, consumir y administrar permisos en cada nivel del sistema.

## Indice

1. [Crear permisos: capabilities.json](#1-crear-permisos-capabilitiesjson)
2. [Proteger resolvers: backend](#2-proteger-resolvers-backend)
3. [Controlar visibilidad: layouts JSON](#3-controlar-visibilidad-layouts-json)
4. [Verificar en componentes Vue: frontend](#4-verificar-en-componentes-vue-frontend)
5. [Crear composable de permisos para un mod](#5-crear-composable-de-permisos-para-un-mod)
6. [Permisos a nivel de campo](#6-permisos-a-nivel-de-campo)
7. [Filtrar apps y layouts por rol](#7-filtrar-apps-y-layouts-por-rol)
8. [Administrar quien tiene los permisos](#8-administrar-quien-tiene-los-permisos)
9. [Testing de permisos](#9-testing-de-permisos)
10. [Resumen: donde se usa cada mecanismo](#10-resumen-donde-se-usa-cada-mecanismo)
11. [Patron SEC-01: envolver mutations de administracion de roles](#11-patron-sec-01-envolver-mutations-de-administracion-de-roles)
12. [checkObjectPermissions manual en mutation custom de mod](#12-checkobjectpermissions-manual-en-mutation-custom-de-mod)

Para la distincion entre `requireAuth` (autenticacion) y `withAuth`/capability (autorizacion), ver [features/rbac.md, seccion 18](./rbac.md#18-autenticacion-vs-autorizacion-requireauth) y [features/security-hardening.md](./security-hardening.md).

---

## 1. Crear permisos: capabilities.json

### Paso 1: Definir en el mod

```json
// mods/mi-mod/capabilities.json
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
      "description": "Eliminar registros permanentemente",
      "riskLevel": "high"
    },
    {
      "name": "miobjeto.campoSensible:view",
      "description": "Ver campo sensible en MiObjeto",
      "riskLevel": "low"
    },
    {
      "name": "miobjeto.campoSensible:modify",
      "description": "Modificar campo sensible en MiObjeto",
      "riskLevel": "medium"
    }
  ]
}
```

### Paso 2: Sincronizar

```bash
npm run sync
```

Fase 3 del sync:
- Crea las capabilities en `core_Capability`
- Las asigna automaticamente a **Admin**, **Consultor** y **Colaborador** con `defaultValue: 'allow'`

### Ejemplo real: hello-world-mod

```json
{
  "module": "hello-world",
  "version": "1.0.0",
  "capabilities": [
    { "name": "mod/hello-world:view_assessments", "riskLevel": "low" },
    { "name": "mod/hello-world:manage_assessments", "riskLevel": "medium" },
    { "name": "mod/hello-world:view_interventions", "riskLevel": "low" },
    { "name": "mod/hello-world:manage_interventions", "riskLevel": "high" },
    { "name": "mod/hello-world:view_metrics", "riskLevel": "low" },
    { "name": "hwassessment.riskScore:view", "riskLevel": "low" },
    { "name": "hwassessment.riskScore:modify", "riskLevel": "medium" },
    { "name": "hwintervention.notes:view", "riskLevel": "low" },
    { "name": "hwintervention.notes:modify", "riskLevel": "medium" }
  ]
}
```

Mezcla 3 niveles: **modulo** (`mod/hello-world:*`), **objeto** (implicito via CRUD auto), y **campo** (`hwassessment.riskScore:*`).

### Ejemplo real: report-builder

```json
[
  { "name": "report:view", "riskLevel": "low" },
  { "name": "report:create", "riskLevel": "medium" },
  { "name": "report:edit", "riskLevel": "medium" },
  { "name": "report:delete", "riskLevel": "high" },
  { "name": "report:clone", "riskLevel": "medium" },
  { "name": "report:export", "riskLevel": "low" },
  { "name": "reporttemplate:view", "riskLevel": "low" },
  { "name": "reporttemplate:create", "riskLevel": "medium" },
  { "name": "reporttemplate:edit", "riskLevel": "medium" },
  { "name": "reporttemplate:delete", "riskLevel": "high" }
]
```

Usa nivel **objeto** (`report:*`, `reporttemplate:*`) + acciones custom (`clone`, `export`).

---

## 2. Proteger resolvers: backend

### withAuth basico — proteger query

```javascript
// logic/miFeature.resolver.js
import { withAuth } from '../../../../services/auth/withAuth.js';

export const miFeatureQuery = {
  getDashboard: withAuth(
    ['mod/mi-mod:view_dashboard'],
    async (parent, args, context) => {
      return context.prisma.miObjeto.findMany({
        where: { tenantId: context.tenantId }
      });
    }
  ),
};
```

Si el usuario no tiene `mod/mi-mod:view_dashboard`:

```
Error: Unauthorized: Missing required capability [mod/mi-mod:view_dashboard] in context /system/UPU
```

### withAuth — proteger mutation

```javascript
export const miFeatureMutation = {
  createRecord: withAuth(
    ['mod/mi-mod:manage_records'],
    async (parent, args, context) => {
      return context.prisma.miObjeto.create({
        data: { ...args.input, tenantId: context.tenantId }
      });
    }
  ),

  deleteRecord: withAuth(
    ['mod/mi-mod:delete_records'],
    async (parent, { id }, context) => {
      return context.prisma.miObjeto.delete({
        where: { id, tenantId: context.tenantId }
      });
    }
  ),
};
```

### Logica OR — basta con una capability

```javascript
// El usuario necesita AL MENOS UNA de estas
export const miQuery = {
  getRecords: withAuth(
    ['mod/mi-mod:view_dashboard', 'mod/mi-mod:manage_records'],
    async (parent, args, context) => { ... }
  ),
};
```

### requireAdmin — solo administradores

```javascript
import { requireAdmin } from '../../../../services/auth/withAuth.js';

export const adminQuery = {
  getSystemConfig: requireAdmin(async (parent, args, context) => {
    return context.prisma.systemConfig.findFirst();
  }),
};
```

Equivale a `withAuth(['system:admin'], resolver)`.

### hasCapability — verificacion suave (no lanza error)

```javascript
import { hasCapability } from '../../../../services/auth/authChecker.js';

export const miQuery = {
  getRecords: async (parent, args, context) => {
    const records = await context.prisma.miObjeto.findMany({ ... });

    // Ocultar campo sensible si no tiene permiso
    const canViewSensible = await hasCapability(context, ['miobjeto.campoSensible:view']);

    return records.map(r => ({
      ...r,
      campoSensible: canViewSensible ? r.campoSensible : null
    }));
  }
};
```

### checkCapability — verificacion condicional

```javascript
import { checkCapability } from '../../../../services/auth/authChecker.js';

export const miMutation = {
  updateRecord: withAuth(['miobjeto:modify'], async (parent, { id, input }, context) => {
    // Si modifica campo sensible, verificar permiso adicional
    if (input.campoSensible !== undefined) {
      await checkCapability(context, ['miobjeto.campoSensible:modify']);
    }

    return context.prisma.miObjeto.update({
      where: { id },
      data: input
    });
  }),
};
```

### Ejemplo real: hello-world-mod (hwMetrics.resolver.js)

```javascript
import { withAuth } from '../../../../services/auth/withAuth.js';

export const hwMetricsQuery = {
  getHwAssessment: withAuth(
    ['mod/hello-world:view_assessments'],
    async (parent, args, context) => {
      const assessment = await context.prisma.hwAssessment.findFirst({
        where: { studentId: args.studentId },
        include: { hwFactors: true },
      });
      return assessment ? { ...assessment, riskFactors: assessment.hwFactors || [] } : null;
    }
  ),

  getAllHwAssessments: withAuth(
    ['mod/hello-world:view_assessments'],
    async (parent, args, context) => {
      const assessments = await context.prisma.hwAssessment.findMany({
        include: { hwFactors: true },
      });
      return assessments.map(a => ({ ...a, riskFactors: a.hwFactors || [] }));
    }
  ),
};

export const hwMetricsMutation = {
  createHwAssessment: withAuth(
    ['mod/hello-world:manage_assessments'],
    async (parent, args, context) => { ... }
  ),

  updateHwAssessment: withAuth(
    ['mod/hello-world:manage_assessments'],
    async (parent, args, context) => { ... }
  ),
};
```

**Patron**: `view_*` para queries, `manage_*` para mutations.

---

## 3. Controlar visibilidad: layouts JSON

### Row actions con requiredCapability

```json
{
  "name": "hw_assessment_list",
  "objectName": "HwAssessment",
  "layoutType": "RecordList",
  "layoutConfig": {
    "rowActions": [
      {
        "id": "create-intervention",
        "label": "Crear Intervencion",
        "type": "modal",
        "targetLayoutId": "hw_intervention_create",
        "targetObjectName": "HwIntervention",
        "requiredCapability": "hwintervention:create",
        "visibilityConditions": {
          "operator": "AND",
          "conditions": [
            { "field": "isActive", "operator": "==", "value": true }
          ]
        },
        "initialDataMapping": { "hwAssessmentId": "record.id" }
      },
      {
        "id": "view-factors",
        "label": "Ver Factores",
        "type": "modal",
        "targetLayoutId": "hw_factor_assessment_list",
        "requiredCapability": "hwfactor:view"
      }
    ]
  }
}
```

**Como funciona**: el Layout Engine (`useRowActionHandler`) verifica `hasCapability(requiredCapability)` antes de mostrar cada boton. Si el usuario no tiene la capability, el boton **no se renderiza**.

```typescript
// layout/src/composables/useRowActionHandler.ts
const isActionVisible = (action, record) => {
  const capability = action.requiredCapability;
  if (capability && !hasCapability(capability)) {
    return false;  // Ocultar boton
  }
  // Verificar visibilityConditions adicionales...
  return true;
};
```

### Layout con roles

```json
{
  "name": "mi_objeto_admin_list",
  "objectName": "MiObjeto",
  "layoutType": "RecordList",
  "roles": ["Admin", "Coordinador"],
  "layoutConfig": { ... }
}
```

Solo usuarios con rol Admin o Coordinador ven este layout. Sin `roles` = visible para todos.

### Layout con requiredPermissions (client-side)

```json
{
  "name": "report_list",
  "layoutType": "RecordDetail",
  "requiredPermissions": ["report:view"],
  "layoutConfig": { ... }
}
```

`requiredPermissions` se verifica en el **frontend** via `hasCapability()`. `roles` se verifica en el **backend** via junction tables.

### Controlar CRUD con config del layout

```json
{
  "layoutConfig": {
    "canCreate": true,
    "canEdit": true,
    "canDelete": false
  }
}
```

**Logica de getEffectivePermission:**
- `canCreate: false` → **siempre** ocultar boton crear (hard override)
- `canCreate: true` → mostrar si tiene capability `{objectname}:create`
- `canCreate` no definido → mostrar si tiene capability `{objectname}:create`

---

## 4. Verificar en componentes Vue: frontend

### useRbacPermissions — el composable central

```typescript
import { useRbacPermissions } from '@/composables/useRbacPermissions';

const {
  hasCapability,           // (cap: string) => boolean
  getEffectivePermission,  // (obj, action, configValue?) => boolean
  isFieldModifiable,       // (obj, field) => boolean
  fetchCapabilities,       // (apolloClient, force?) => Promise<void>
} = useRbacPermissions();
```

### Verificar capability simple

```vue
<template>
  <div>
    <Button v-if="canCreate" @click="openCreate">Crear Registro</Button>
    <Button v-if="canDelete" variant="danger" @click="handleDelete">Eliminar</Button>
    <Text v-if="!canCreate && !canDelete">No tienes permisos de gestion</Text>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRbacPermissions } from '@/composables/useRbacPermissions'
import { Button, Text } from '../../components/atoms'

const { hasCapability } = useRbacPermissions()

const canCreate = computed(() => hasCapability('mod/mi-mod:manage_records'))
const canDelete = computed(() => hasCapability('mod/mi-mod:delete_records'))
</script>
```

### Combinar config del layout + capability

```vue
<script setup>
const { getEffectivePermission } = useRbacPermissions()

const props = defineProps<{
  objectName: string
  canCreate?: boolean   // Viene del layout JSON
  canEdit?: boolean
  canDelete?: boolean
}>()

// Si layout dice false → deny. Si true/undefined → check capability
const effectiveCanCreate = computed(() =>
  getEffectivePermission(props.objectName, 'create', props.canCreate)
)
const effectiveCanEdit = computed(() =>
  getEffectivePermission(props.objectName, 'modify', props.canEdit)
)
const effectiveCanDelete = computed(() =>
  getEffectivePermission(props.objectName, 'delete', props.canDelete)
)
</script>
```

### Fallback field-level para modify (UPONE-1393)

Desde UPONE-1393 (2026-07-10), `getEffectivePermission` con `action === 'modify'` hace fallback a las field-level caps. Un usuario que solo tiene `activity.status:modify` (sin `activity:modify`) ahora obtiene `true`:

```typescript
const { getEffectivePermission } = useRbacPermissions()

// Solo tiene activity.status:modify, no activity:modify
getEffectivePermission('Activity', 'modify')  // → true (fallback a la field-level cap)
```

`create` y `delete` no tienen este fallback: nunca existen caps field-level de esas acciones (solo `view` y `modify` se granularizan por campo). El backend replica esta logica en `checkObjectPermissions` (`authChecker.js`); recuerda que la sincronizacion entre backend y frontend es manual.

### Uso real en RecordList.vue

```typescript
// layout/src/layouts/RecordList.vue
const { getEffectivePermission, hasCapability, isFieldModifiable } = useRbacPermissions();

// ¿Puede crear registros de este objeto?
const effectiveCanCreate = computed(() =>
  getEffectivePermission(props.objectName, 'create', props.canCreate)
);

// ¿Puede descargar template de importacion?
const canDownloadCurrentObjectTemplate = computed(() =>
  hasCapability(`${props.objectName.toLowerCase()}:create`)
);

// Row actions: verificar capability por cada accion
const processedRowActions = computed(() =>
  rawActions.map(action => ({
    ...action,
    isVisible: (record) => {
      const cap = action.requiredCapability;
      if (cap && !hasCapability(cap)) return false;
      // + evaluar visibilityConditions...
      return true;
    }
  }))
);
```

### Ocultar elementos segun campo

```vue
<template>
  <div>
    <Text>{{ record.nombre }}</Text>
    <Text v-if="canViewSalary">Salario: {{ record.salary }}</Text>
    <Input v-if="canEditSalary" v-model="record.salary" />
  </div>
</template>

<script setup>
const { hasCapability, isFieldModifiable } = useRbacPermissions()

const canViewSalary = computed(() => hasCapability('person.salary:view'))
const canEditSalary = computed(() => isFieldModifiable('person', 'salary'))
</script>
```

---

## 5. Crear composable de permisos para un mod

Para mods con multiples vistas que necesitan verificar permisos, crear un composable dedicado:

### Ejemplo real: useReportPermissions

```typescript
// modsComponents/ReportListManager/useReportPermissions.ts
import { computed, type ComputedRef } from 'vue';
import { useRbacPermissions } from '../../composables/useRbacPermissions';

export interface ReportPermissionsConfig {
  canCreate?: boolean;
  canView?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function useReportPermissions(
  objectName: ComputedRef<string>,
  config: ComputedRef<ReportPermissionsConfig>
) {
  const { getEffectivePermission, hasCapability } = useRbacPermissions();

  // Reportes
  const effectiveCanCreate = computed(() =>
    getEffectivePermission(objectName.value, 'create', config.value.canCreate)
  );
  const effectiveCanView = computed(() => {
    if (config.value.canView === false) return false;
    return hasCapability(`${objectName.value.toLowerCase()}:view`);
  });
  const effectiveCanEdit = computed(() => {
    if (config.value.canEdit === false) return false;
    return hasCapability(`${objectName.value.toLowerCase()}:edit`);
  });
  const effectiveCanClone = computed(() => {
    if (config.value.canEdit === false) return false;
    return hasCapability(`${objectName.value.toLowerCase()}:clone`);
  });
  const effectiveCanDelete = computed(() =>
    getEffectivePermission(objectName.value, 'delete', config.value.canDelete)
  );

  // Templates
  const effectiveCanTemplateCreate = computed(() => {
    if (config.value.canCreate === false) return false;
    return hasCapability('reporttemplate:create');
  });
  const effectiveCanTemplateEdit = computed(() => {
    if (config.value.canEdit === false) return false;
    return hasCapability('reporttemplate:edit');
  });

  return {
    effectiveCanCreate, effectiveCanView, effectiveCanEdit,
    effectiveCanClone, effectiveCanDelete,
    effectiveCanTemplateCreate, effectiveCanTemplateEdit,
  };
}
```

### Patron para tu mod

```typescript
// modsComponents/MiWidget/useMiModPermissions.ts
import { computed, type ComputedRef } from 'vue';
import { useRbacPermissions } from '../../composables/useRbacPermissions';

export function useMiModPermissions(config: ComputedRef<{ canCreate?: boolean; canDelete?: boolean }>) {
  const { hasCapability, getEffectivePermission } = useRbacPermissions();

  return {
    canViewDashboard: computed(() => hasCapability('mod/mi-mod:view_dashboard')),
    canManageRecords: computed(() => hasCapability('mod/mi-mod:manage_records')),
    canDeleteRecords: computed(() =>
      getEffectivePermission('miObjeto', 'delete', config.value.canDelete)
    ),
    canViewSensitiveField: computed(() => hasCapability('miobjeto.campoSensible:view')),
    canEditSensitiveField: computed(() => hasCapability('miobjeto.campoSensible:modify')),
  };
}
```

---

## 6. Permisos a nivel de campo

### En el backend (resolver)

```javascript
import { checkFieldPermissions } from '../../../../services/auth/authChecker.js';

export const miMutation = {
  updatePerson: withAuth(['person:modify'], async (parent, { id, input }, context) => {
    // Verificar permisos sobre los campos que se intentan modificar
    await checkFieldPermissions(
      context.user,
      'Person',
      Object.keys(input),  // ej: ["salary", "email", "name"]
      'modify'
    );
    // Si pasa, todos los campos tienen permiso
    return context.prisma.person.update({ where: { id }, data: input });
  }),
};
```

**Jerarquia de checkFieldPermissions** (por cada campo):

```
1. ¿Tiene person.salary:modify? → Si → permitir
2. ¿No tiene? → ¿Tiene person:modify? → Si → permitir (object-level cubre todos los campos)
3. ¿Tampoco? → Error: "Missing required capability"
```

### En el frontend (componente)

```vue
<template>
  <form>
    <Input v-model="record.name" label="Nombre" />

    <!-- Campo salary: solo visible si tiene permiso -->
    <div v-if="canViewSalary">
      <Input
        v-if="canEditSalary"
        v-model="record.salary"
        label="Salario"
      />
      <Text v-else>Salario: {{ record.salary }}</Text>
    </div>

    <!-- Campo email: editable solo si tiene permiso -->
    <Input
      v-model="record.email"
      label="Email"
      :disabled="!canEditEmail"
    />
  </form>
</template>

<script setup>
import { computed } from 'vue'
import { useRbacPermissions } from '@/composables/useRbacPermissions'

const { hasCapability, isFieldModifiable } = useRbacPermissions()

const canViewSalary = computed(() => hasCapability('person.salary:view'))
const canEditSalary = computed(() => isFieldModifiable('person', 'salary'))
const canEditEmail = computed(() => isFieldModifiable('person', 'email'))
</script>
```

### isFieldModifiable — logica interna

```typescript
const isFieldModifiable = (objectName: string, fieldName: string): boolean => {
  const objLower = objectName.toLowerCase()

  // 1. Field-level (mas especifico)
  if (capabilityNames.value.includes(`${objLower}.${fieldName}:modify`)) return true

  // 2. Object-level (cubre todos los campos)
  if (capabilityNames.value.includes(`${objLower}:modify`)) return true

  // 3. Deny
  return false
}
```

---

## 7. Filtrar apps y layouts por rol

### En app.json

```json
{
  "name": "mi-mod",
  "label": "Mi Modulo",
  "roles": ["Admin", "Coordinador", "Docente"]
}
```

Sin `roles` → app visible para todos. Con `roles` → solo esos roles la ven en el sidebar.

### En layout JSON

```json
{
  "name": "mi_objeto_admin_list",
  "roles": ["Admin"],
  "layoutConfig": { ... }
}
```

### Doble capa

```
1. Server: getAppsFiltered()
   → Lee junction table up1_suite_app_role
   → Si app sin roles → siempre visible
   → Si app con roles → user necesita al menos uno
   → Si X-Selected-Role header → filtra a ese rol

2. Frontend: availableApplications
   → Filtra por requiredPermissions via hasCapability()
```

### X-Selected-Role — cambio de rol en runtime

Cuando el usuario selecciona un rol en la navbar:

```
1. selectRole() actualiza window.__SELECTED_ROLE_NAME__
2. Apollo plugin inyecta header X-Selected-Role en cada request
3. Backend filtra roleAssignments al rol seleccionado
4. Frontend re-fetcha apps + layouts + capabilities
5. UI se actualiza: apps/layouts/botones cambian segun el nuevo rol
```

---

## 8. Administrar quien tiene los permisos

### Auto-asignacion en sync

Al ejecutar `npm run sync`, las capabilities nuevas se asignan automaticamente a:
- **Admin** → `defaultValue: 'allow'`
- **Consultor** → `defaultValue: 'allow'`
- **Colaborador** → `defaultValue: 'allow'`

### Via GraphQL: gestionar roles de una app

```graphql
mutation {
  manageAppRoles(
    appId: "clx_app_id"
    roleNames: ["Admin", "Coordinador", "Docente"]
  )
}
```

Esto crea los roles si no existen y los asocia a la app.

### Via GraphQL: gestionar capabilities de roles por objeto

```graphql
mutation {
  manageObjectRoles(
    objectName: "MiObjeto"
    assignments: [
      {
        role: "Admin"
        capabilities: ["miobjeto:view", "miobjeto:create", "miobjeto:modify", "miobjeto:delete"]
      },
      {
        role: "Coordinador"
        capabilities: ["miobjeto:view", "miobjeto:create", "miobjeto:modify"]
      },
      {
        role: "Docente"
        capabilities: ["miobjeto:view"]
      },
      {
        role: "Estudiante"
        capabilities: []
      }
    ]
  )
}
```

### Via GraphQL: consultar permisos de un usuario

```graphql
query {
  getMyPermissions {
    user { id email }
    roles { name description contextPath }
    capabilityNames
    capabilities {
      name
      description
      roleName
      contextPath
    }
  }
}
```

### Via GraphQL: consultar capabilities de roles por objeto

```graphql
query {
  getObjectRoleCapabilities(objectName: "MiObjeto") {
    role
    capabilities
  }
}
```

Retorna:

```json
[
  { "role": "Admin", "capabilities": ["miobjeto:view", "miobjeto:create", "miobjeto:modify", "miobjeto:delete"] },
  { "role": "Docente", "capabilities": ["miobjeto:view"] }
]
```

### Via UI: mod up1-manager

El mod `up1-manager` (consola de administracion; reemplazo del retirado `object-manager-editor`) provee la UI para gestionar permisos. Solo accesible para Admin y Consultor:

- **Roles por objeto / por app**: mutations `manageObjectRoles` / `manageAppRoles`.
- **Roles internos por App** (UPONE-1353): row action **"Roles"** sobre la lista de apps abre el modal `app-role-mappings-list`, que mapea rol institucional → rol interno (`core_ModRole`) por App.
- **Service accounts** (UPONE-1353): layouts `serviceaccount-{list,create,view}`; `allowedOps` se edita con `CapabilityPatternEditor`.

### Bootstrap de tenant

Al crear un tenant nuevo (`npm run tenant:create`):
1. Se crea rol **Admin** con archetype `sysadmin`
2. Se crean contextos `/system` y `/system/{tenantId}`
3. Se asignan **todas** las capabilities existentes al Admin con `allow`
4. Se crea usuario `profile.manager@uplanner.cl` con rol Admin (si no existe)

---

## 9. Testing de permisos

### Mock de withAuth en tests de resolver

```javascript
// tests/mocks/auth.mock.js
vi.mock('../../../../services/auth/withAuth.js', () => ({
  withAuth: (_caps, resolver) => resolver  // Bypass: ejecuta resolver sin verificar
}));
```

### Test de filtrado por rol (ejemplo real)

```javascript
// tests/unit/roleFiltering/layoutFiltering.test.js
import { layoutQuery } from '@om/graphql/resolvers/up1/layout/layout.resolver.js';

describe('Role-Based Layout Filtering', () => {
  it('returns hw layouts when user has matching role', async () => {
    // Layout hw-list restringido a Admin
    prisma.up1_layen_layout_role.findMany.mockResolvedValue([
      { layoutId: 'hw-list', roleId: ADMIN_ROLE_ID },
    ]);

    const ctx = mockContext({
      user: {
        roleAssignments: [mockRoleAssignment({ roleId: ADMIN_ROLE_ID, roleName: 'Admin' })],
      },
    });

    const result = await layoutQuery.getAllLayoutsFiltered(null, {}, ctx);
    expect(result.map(l => l.id)).toContain('hw-list');
  });

  it('excludes hw layouts when user has non-matching role', async () => {
    const ctx = mockContext({
      user: {
        roleAssignments: [mockRoleAssignment({ roleId: STUDENT_ROLE_ID, roleName: 'Estudiante' })],
      },
    });

    const result = await layoutQuery.getAllLayoutsFiltered(null, {}, ctx);
    expect(result.map(l => l.id)).not.toContain('hw-list');
  });

  it('always includes public layouts (no roles)', async () => {
    const result = await layoutQuery.getAllLayoutsFiltered(null, {}, ctx);
    expect(result.map(l => l.id)).toContain('public-layout');
  });
});
```

### Test de resolver con verificacion de tenantId

```javascript
describe('hwMetrics resolver', () => {
  it('filters by tenant (via Prisma schema isolation)', async () => {
    const prisma = createPrismaMock();
    const context = { prisma, tenantId: 'TEST', user: createAuthContext() };

    await hwMetricsQuery.getAllHwAssessments(null, {}, context);

    // Prisma client ya esta scoped al tenant — no necesita where tenantId
    expect(prisma.hwAssessment.findMany).toHaveBeenCalled();
  });
});
```

---

## 10. Resumen: donde se usa cada mecanismo

| Nivel | Mecanismo | Donde se define | Donde se verifica | Ejemplo |
|-------|-----------|-----------------|-------------------|---------|
| **Resolver** | `withAuth(['cap'])` | `capabilities.json` | `logic/*.resolver.js` (backend) | `withAuth(['mod/mi-mod:manage_records'], resolver)` |
| **Resolver (soft)** | `hasCapability()` | `capabilities.json` | `logic/*.resolver.js` (backend) | `if (await hasCapability(ctx, ['cap'])) { ... }` |
| **Resolver (campo)** | `checkFieldPermissions()` | Auto-generado | `logic/*.resolver.js` (backend) | `checkFieldPermissions(user, 'Person', fields, 'modify')` |
| **Layout (visibility)** | `roles: [...]` | Layout JSON | Server: `getAllLayoutsFiltered` | `"roles": ["Admin"]` |
| **Layout (CRUD)** | `canCreate/canEdit/canDelete` | Layout JSON | Frontend: `getEffectivePermission()` | `"canCreate": true` + `hasCapability('obj:create')` |
| **Row action** | `requiredCapability` | Layout JSON | Frontend: `useRowActionHandler` | `"requiredCapability": "hwfactor:view"` |
| **App sidebar** | `roles: [...]` | `config/app.json` | Server: `getAppsFiltered` | `"roles": ["Admin", "Coordinador"]` |
| **App sidebar** | `requiredPermissions` | `config/app.json` | Frontend: `hasCapability()` | `"requiredPermissions": ["report:view"]` |
| **Componente Vue** | `hasCapability()` | `capabilities.json` | Frontend: `useRbacPermissions` | `hasCapability('mod/mi-mod:view_dashboard')` |
| **Componente Vue (campo)** | `isFieldModifiable()` | Auto-generado | Frontend: `useRbacPermissions` | `isFieldModifiable('person', 'salary')` |
| **Composable de mod** | Custom wrapper | `capabilities.json` | Frontend: composable propio | `useMiModPermissions()` |
| **Admin: roles por objeto** | `manageObjectRoles` | GraphQL mutation | BD: `core_RoleCapability` | Asignar caps a roles |
| **Admin: roles por app** | `manageAppRoles` | GraphQL mutation | BD: `up1_suite_app_role` | Asignar roles a apps |

### Flujo completo de un permiso

```
1. DEFINIR:    capabilities.json del mod
2. SYNC:       npm run sync → core_Capability + auto-assign a Admin/Consultor/Colaborador
3. BACKEND:    withAuth(['cap']) en resolver → checkCapability() verifica user.roleAssignments
4. FRONTEND:   useRbacPermissions().hasCapability('cap') → verifica capabilityNames[]
5. LAYOUT:     "requiredCapability": "cap" → useRowActionHandler filtra boton
6. ADMIN:      manageObjectRoles → asigna caps especificas a roles especificos
```

---

## 11. Patron SEC-01: envolver mutations de administracion de roles

Las mutations que administran roles/capabilities (via GraphQL, seccion 8 de este doc y seccion 14 de `rbac.md`) son en si mismas superficie sensible: quien las puede invocar decide quien tiene acceso a que. `up1-manager` las protege envolviendolas con `requireCapability`/`withAuth`, no dejandolas abiertas a cualquier usuario autenticado.

```javascript
// mods/up1-manager/logic/objectRoles.resolver.js
import { withAuth, requireCapability } from '../../../../services/auth/withAuth.js';

export const objectRolesQuery = {
  // Solo quien tiene la capability de VER el editor de objetos puede leer
  // el mapa rol -> capabilities de un objeto.
  getObjectRoleCapabilities: requireCapability(
    'mod/up1-manager/objectdefinition:view',
    async (_, { objectName }, { prisma }) => {
      // ... arma { role, capabilities } por cada rol con al menos una capability sobre el objeto
    }
  )
};

export const objectRolesMutation = {
  // Solo quien puede crear O editar objetos (el editor de ObjectDefinition invoca esta
  // mutation desde su afterSave hook, tanto en el flujo de crear como en el de editar)
  // puede reescribir las asignaciones rol -> capability de un objeto.
  manageObjectRoles: withAuth(
    ['mod/up1-manager/objectdefinition:create', 'mod/up1-manager/objectdefinition:edit'],
    async (_, { objectName, assignments }, context) => {
      // ... transaccion: upsert de capabilities + reemplazo de core_RoleCapability
    }
  )
};
```

**Patron a replicar**: cualquier mutation nueva que administre roles, capabilities o mappings de acceso (no solo las de `up1-manager`) debe quedar detras de una capability propia del panel de administracion que la expone — nunca abierta con solo `context.user` presente. `requireCapability` es el alias de un solo elemento de `withAuth` (ver tabla de la seccion 6 en `rbac.md`).

---

## 12. checkObjectPermissions manual en mutation custom de mod

El motor CRUD generico (`createInstance`/`updateInstance`/`deleteInstance` en `object-manager/src/graphql/resolvers/instance.resolver.js`) ya viene envuelto en `withObjectAuth` (seccion 7 y 19 de `rbac.md`). Una mutation **custom** de mod — una funcion nueva, no un override del generico — no pasa por ahi: el mod debe llamar el chequeo el mismo.

```javascript
// mods/curriculum-mapping/logic/levelScheme-upsert.resolver.js
import { loadCheckObjectPermissions } from './helpers/resolverUtils.js';

const LEVELSCHEME_OBJECT = 'LevelScheme'; // objeto BASE para el chequeo RBAC (resuelve a levelscheme:<action>)

// Wrapper inyectado en produccion: loadCheckObjectPermissions() carga
// checkObjectPermissions del platform (authChecker.js) via dynamic import.
// En tests se puede inyectar un no-op (ALLOW_ALL_PERMISSIONS) para no ejercitar RBAC.
async function upsertLevelScheme(context, input, checkPermission = loadCheckObjectPermissions()) {
  const { id } = input;

  // Antes de tocar la DB: create -> levelscheme:create, update -> levelscheme:modify
  await checkPermission(context, LEVELSCHEME_OBJECT, id ? 'modify' : 'create');

  // ... parse -> defaults -> validar -> unicidad -> persistir en $transaction
}

async function setLevelSchemeActive(context, id, isActive, checkPermission) {
  await checkPermission(context, LEVELSCHEME_OBJECT, 'modify');   // soft-delete via isActive
  // ...
}

async function deleteLevelScheme(context, id, checkPermission) {
  await checkPermission(context, LEVELSCHEME_OBJECT, 'delete');   // hard-delete FK-safe
  // ...
}
```

```javascript
// mods/curriculum-mapping/logic/helpers/resolverUtils.js
// checkObjectPermissions(context, objectType, action) LANZA si no hay permiso (o no hay user)
// y resuelve la capability como `{objeto}:{action}` — LEVELSCHEME_OBJECT + 'modify' -> "levelscheme:modify".
export function loadCheckObjectPermissions() { /* dynamic import + cache del helper del platform */ }
```

**Por que importa**: si el mod olvida esta llamada, la mutation queda **sin ningun gate de autorizacion** — cualquier usuario autenticado (o incluso sin usuario, segun el resolver) podria ejecutarla. No hay red de seguridad automatica del core para mutations fuera del motor generico. Ver regla practica completa en `rbac.md`, seccion 19.

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-04-10 | Documento inicial: ejemplos practicos de RBAC basados en codigo real de hello-world-mod, report-builder, RecordList.vue y auth services |
| 2026-08-03 | Seccion 11 nueva: patron SEC-01 (envolver `getObjectRoleCapabilities`/`manageObjectRoles` con `requireCapability`/`withAuth`, UPONE-1411, verificado en `mods/up1-manager/logic/objectRoles.resolver.js`). Seccion 12 nueva: `checkObjectPermissions` manual en las 3 mutations custom de `curriculum-mapping/logic/levelScheme-upsert.resolver.js` (UPONE-1454), con el porque de la ausencia de auth automatica para mutations fuera del motor CRUD generico. Enlace a `rbac.md` seccion 18 y a `features/security-hardening.md` agregado en el indice |
