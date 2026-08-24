---
id: SPEC-mods-016
project: up1
type: spec
module: mods
tags: [permisos, capabilities, withAuth, roles, riskLevel]
---
# RBAC y permisos

## Preparacion

El archivo `capabilities.json` va en la raiz del mod: `mods/{mod}/capabilities.json`.
No requiere carpeta adicional.

## Despues de CADA receta

```bash
npm run sync
# Capabilities se insertan en BD (fase 4) — no requiere reinicio
```

---

### RBAC-01: Definir capabilities del mod
**Pre:** `package.json` del mod creado.  
**In:** Nombre del mod (kebab-case), lista de acciones a proteger.  
**Pasos:**
1. Crear `mods/{mod}/capabilities.json`:
   ```json
   {
     "module": "mi-mod",
     "version": "1.0.0",
     "capabilities": [
       { "name": "mod/mi-mod:view_dashboard", "description": "Ver dashboard", "riskLevel": "low" },
       { "name": "mod/mi-mod:manage_records", "description": "Crear y editar registros", "riskLevel": "medium" },
       { "name": "mod/mi-mod:delete_records", "description": "Eliminar registros", "riskLevel": "high" }
     ]
   }
   ```
2. Ejecutar sync para insertar en `core_Capability`:
   ```bash
   npm run sync
   ```

**Validar:** `npm run sync` fase 3 muestra "Capability Sync" sin errores. Las capabilities aparecen en BD (`core_Capability`). Los roles Admin, Consultor y Colaborador las reciben automaticamente con `allow`.  
**Doc:** `specs/up1/features/rbac.md` §9, §10

---

### RBAC-02: Proteger resolver con withAuth (capability única)
**Pre:** RBAC-01 completado. Capability definida en `capabilities.json`.  
**In:** Nombre de la capability, resolver a proteger.  
**Pasos:**
1. Importar `withAuth` en el resolver:
   ```javascript
   import { withAuth } from '../../../../services/auth/withAuth.js';
   ```
2. Envolver la función del resolver:
   ```javascript
   export const miModQuery = {
     getDashboard: withAuth(['mod/mi-mod:view_dashboard'], async (parent, args, context) => {
       return context.prisma.miObjeto.findMany({
         where: { tenantId: context.tenantId }
       });
     }),
   };
   ```

**Validar:** Llamar el resolver sin la capability → respuesta con error de autorización. Con la capability → datos retornados. Verificar que el where incluye `tenantId: context.tenantId`.  
**Doc:** `specs/up1/features/rbac.md` §6

---

### RBAC-03: Proteger resolver con withAuth OR (varias capabilities)
**Pre:** RBAC-01 completado. Al menos dos capabilities definidas.  
**In:** Array de capabilities (el usuario necesita al menos una).  
**Pasos:**
1. Pasar array con múltiples capabilities a `withAuth`:
   ```javascript
   export const miModQuery = {
     getMisDatos: withAuth(
       ['mod/mi-mod:view_data', 'mod/mi-mod:manage_data'],
       async (parent, args, context) => {
         return context.prisma.miObjeto.findMany({
           where: { tenantId: context.tenantId }
         });
       }
     ),
   };
   ```

**Validar:** Usuario con solo `view_data` → acceso permitido. Usuario con solo `manage_data` → acceso permitido. Usuario sin ninguna → error de autorización.  
**Doc:** `specs/up1/features/rbac.md` §6

---

### RBAC-04: Proteger layout con roles
**Pre:** Layout JSON creado en `config/layouts/`.  
**In:** Array de nombres de rol que deben tener acceso.  
**Pasos:**
1. Agregar campo `roles` en el JSON del layout:
   ```json
   {
     "name": "mi_objeto_list",
     "objectName": "MiObjeto",
     "layoutType": "RecordList",
     "roles": ["Admin", "Coordinador"],
     "layoutConfig": { }
   }
   ```
2. Para proteger la app completa, agregar `roles` en `config/app.json`:
   ```json
   {
     "name": "mi-mod",
     "roles": ["Admin", "Coordinador", "Docente"]
   }
   ```
3. Ejecutar sync:
   ```bash
   npm run sync
   ```

**Validar:** Usuario con rol no incluido → layout no aparece en el menú. Roles que no existen en BD se crean automáticamente en `core_Role` durante sync.  
**Doc:** `specs/up1/features/rbac.md` §11

---

### RBAC-05: Proteger row action con requiredCapability
**Pre:** Layout RecordList creado. Capability definida en `capabilities.json` y sincronizada.  
**In:** ID de la row action, nombre de la capability.  
**Pasos:**
1. Agregar `requiredCapability` en la row action del layout:
   ```json
   {
     "rowActions": [
       {
         "id": "delete-record",
         "label": "Eliminar",
         "type": "delete",
         "requiredCapability": "mod/mi-mod:delete_records"
       }
     ]
   }
   ```

**Validar:** Usuario sin la capability → botón de acción no visible en la fila. Usuario con la capability → botón visible. El Layout Engine llama `hasCapability()` del composable `useRbacPermissions` antes de renderizar.  
**Doc:** `specs/up1/features/rbac.md` §12

---

### RBAC-06: Proteger campo individual (field-level)
**Pre:** Campo sensible existente en el objeto. RBAC-01 completado.  
**In:** Nombre del objeto (camelCase), nombre del campo, acción (`view` o `modify`).  
**Pasos:**
1. Agregar capabilities field-level en `capabilities.json`:
   ```json
   {
     "capabilities": [
       { "name": "miobjeto.campoSensible:view", "riskLevel": "low" },
       { "name": "miobjeto.campoSensible:modify", "riskLevel": "medium" }
     ]
   }
   ```
2. En el resolver, verificar antes del update:
   ```javascript
   import { checkFieldPermissions } from '../../../../services/auth/authChecker.js';

   export const miModMutation = {
     updateRecord: withAuth(['miobjeto:modify'], async (parent, { id, input }, context) => {
       await checkFieldPermissions(context.user, 'MiObjeto', Object.keys(input), 'modify');
       return context.prisma.miObjeto.update({
         where: { id, tenantId: context.tenantId },
         data: input
       });
     }),
   };
   ```
3. Ejecutar sync:
   ```bash
   npm run sync
   ```

**Validar:** Usuario sin `miobjeto.campoSensible:modify` intentando actualizar ese campo → error de autorización. Field-level sobreescribe object-level: si tiene el field pero no el object, se permite ese campo específico.  
**Doc:** `specs/up1/features/rbac.md` §8

---

### RBAC-07: Verificar capability soft en resolver (hasCapability — filtrar sin bloquear)
**Pre:** Capability definida y sincronizada.  
**In:** Capability a verificar, campo a ocultar si no tiene permiso.  
**Pasos:**
1. Importar `hasCapability` desde `authChecker.js`:
   ```javascript
   import { hasCapability } from '../../../../services/auth/authChecker.js';
   ```
2. Usar en el resolver para ocultar datos sin bloquear el acceso:
   ```javascript
   export const miModQuery = {
     getRecords: async (parent, args, context) => {
       const data = await context.prisma.miObjeto.findMany({
         where: { tenantId: context.tenantId }
       });

       const canViewSensitive = await hasCapability(context, ['miobjeto.campoSensible:view']);
       if (!canViewSensitive) {
         data.forEach(d => delete d.campoSensible);
       }

       return data;
     }
   };
   ```

**Validar:** `hasCapability` retorna `boolean`, no lanza error. Usuario sin permiso → campo ausente en la respuesta pero resolver completa. Diferencia con `checkCapability`: este lanza error (hard block), `hasCapability` retorna false (soft check).  
**Doc:** `specs/up1/features/rbac.md` §6

---

### RBAC-08: Restringir app a tenants específicos
**Pre:** `config/app.json` del mod creado.  
**In:** Array de IDs de tenant que deben ver la app (ej: `["UPU", "DEMO"]`).  
**Pasos:**
1. Agregar campo `tenants` en `config/app.json`:
   ```json
   {
     "name": "mi-mod",
     "label": "Mi Mod",
     "tenants": ["UPU", "DEMO"]
   }
   ```
   Para todos los tenants usar `["*"]`.
2. Ejecutar sync:
   ```bash
   npm run sync
   ```

**Validar:** Acceder con un tenant no incluido → la app no aparece en el sidebar. Acceder con tenant incluido → app visible (si el usuario también tiene el rol requerido).  
**Doc:** `specs/up1/mods/reference.md` §9

---

### RBAC-09: Crear capability field-level para campo sensible
**Pre:** Objeto existe en `objects/`. RBAC-01 completado.  
**In:** Nombre del objeto, nombre del campo sensible.  
**Pasos:**
1. Agregar en `capabilities.json` las dos capabilities del campo (view y modify):
   ```json
   {
     "module": "mi-mod",
     "version": "1.0.0",
     "capabilities": [
       { "name": "miobjeto.salario:view", "description": "Ver salario", "riskLevel": "low" },
       { "name": "miobjeto.salario:modify", "description": "Modificar salario", "riskLevel": "high" }
     ]
   }
   ```
2. Sincronizar para insertar en `core_Capability`:
   ```bash
   npm run sync
   ```
3. En el frontend, usar `isFieldModifiable` para controlar la editabilidad:
   ```typescript
   import { useRbacPermissions } from '@/composables/useRbacPermissions';
   const { isFieldModifiable } = useRbacPermissions();
   const canEditSalario = isFieldModifiable('miobjeto', 'salario');
   ```

**Validar:** `npm run sync` fase 3 sin errores. En BD, `core_Capability` contiene ambos registros. Fallback: si no existe `miobjeto.salario:view` se cae a `miobjeto:view`.  
**Doc:** `specs/up1/features/rbac.md` §8, §9
