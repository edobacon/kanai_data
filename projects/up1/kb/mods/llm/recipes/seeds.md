---
id: SPEC-mods-018
project: up1
type: spec
module: mods
tags: [seed, datos-iniciales, upsert, relacional, tenantManager]
---
# Seeds — Datos iniciales

## Preparacion

```bash
mkdir -p mods/{mod}/seed
```

## Despues de CADA receta

```bash
# Seeds planos (sin prefijo _) se ejecutan automaticamente en fase 8:
npm run sync

# Seeds relacionales (con prefijo _) se ejecutan manualmente:
node mods/{mod}/seed/_nombre-del-seed.js
```

---

### SEED-01: Seed plano auto-ejecutado
**Pre:** Objeto sincronizado y tabla existente en BD (`npm run codegen` + `tenant:migrate` ejecutados).  
**In:** Nombre del objeto (`objectName`), clave única (`uniqueKey`), campos del registro.  
**Pasos:**
1. Crear directorio `seed/` dentro del mod:
   ```bash
   mkdir -p mods/mi-mod/seed
   ```
2. Crear `mods/mi-mod/seed/config-seeds.js`:
   ```javascript
   export default [
     {
       objectName: 'MiObjeto',
       uniqueKey: { nombre: 'Registro Default' },
       data: {
         nombre: 'Registro Default',
         estado: 'ACTIVO',
         puntuacion: 50
       }
     },
     {
       objectName: 'MiObjeto',
       uniqueKey: { nombre: 'Registro Secundario' },
       data: {
         nombre: 'Registro Secundario',
         estado: 'BORRADOR',
         puntuacion: 10
       }
     }
   ];
   ```
3. Ejecutar sync (fase 8 ejecuta los seeds automáticamente):
   ```bash
   npm run sync
   ```

**Validar:** Sync fase 8 "Seed Data" sin errores. Ejecutar nuevamente → no crea duplicados (lógica upsert: si existe por `uniqueKey` actualiza, si no crea). Seeds **no** disparan `withEventPublish` ni aplican RBAC — Prisma directo.  
**Doc:** `specs/up1/core/programmatic-interaction.md` §5

---

### SEED-02: Seed relacional manual
**Pre:** Objetos padre e hijo sincronizados y en BD. Seed del padre ya ejecutado (o padre existe).  
**In:** Objeto padre con su clave de búsqueda, objeto hijo con FK al padre.  
**Pasos:**
1. Crear archivo con prefijo `_` (excluido de auto-ejecución en sync):
   ```javascript
   // mods/mi-mod/seed/_populate-relations.js
   import prisma from '../../../object-manager/src/prisma/client.js';

   const seeds = [
     {
       parentObject: 'MiPadre',
       parentWhere: { nombre: 'Padre Principal' },
       childObject: 'MiHijo',
       uniqueKey: { nombre: 'Hijo Uno' },
       data: { nombre: 'Hijo Uno', puntuacion: 80 }
     },
     {
       parentObject: 'MiPadre',
       parentWhere: { nombre: 'Padre Principal' },
       childObject: 'MiHijo',
       uniqueKey: { nombre: 'Hijo Dos' },
       data: { nombre: 'Hijo Dos', puntuacion: 60 }
     }
   ];

   for (const seed of seeds) {
     const padre = await prisma[seed.parentObject.charAt(0).toLowerCase() + seed.parentObject.slice(1)].findFirst({
       where: seed.parentWhere
     });
     if (!padre) {
       console.warn(`Padre no encontrado: ${seed.parentObject} ${JSON.stringify(seed.parentWhere)}`);
       continue;
     }
     await prisma[seed.childObject.charAt(0).toLowerCase() + seed.childObject.slice(1)].upsert({
       where: seed.uniqueKey,
       update: seed.data,
       create: {
         ...seed.data,
         [seed.parentObject.charAt(0).toLowerCase() + seed.parentObject.slice(1)]: {
           connect: { id: padre.id }
         }
       }
     });
   }

   await prisma.$disconnect();
   ```
2. Ejecutar manualmente (requiere que el padre ya exista):
   ```bash
   node mods/mi-mod/seed/_populate-relations.js
   ```

**Validar:** Los registros hijo aparecen en BD con FK al padre correctamente enlazada. El prefijo `_` impide que sync ejecute este archivo automáticamente en fase 8. Si el padre no existe → warning en consola, el hijo se omite.  
**Doc:** `specs/up1/core/programmatic-interaction.md` §5

---

### SEED-03: Seed multi-tenant
**Pre:** `tenantManager` disponible. Objetos sincronizados en todos los tenants (`tenant:migrate` ejecutado para cada uno).  
**In:** Datos a insertar, repetir por cada tenant registrado.  
**Pasos:**
1. Crear `mods/mi-mod/seed/_populate-all-tenants.js`:
   ```javascript
   import tenantManager from '../../../object-manager/src/services/tenantManager.js';

   const tenants = tenantManager.getRegisteredTenants();

   for (const tenantId of tenants) {
     const prisma = tenantManager.getClient(tenantId);

     // Upsert registro base por tenant
     await prisma.miObjeto.upsert({
       where: {
         tenantId_nombre: { tenantId, nombre: 'Config Default' }
       },
       update: { estado: 'ACTIVO' },
       create: {
         nombre: 'Config Default',
         estado: 'ACTIVO',
         puntuacion: 100,
         tenantId
       }
     });

     console.log(`Seed completado para tenant ${tenantId}`);
   }
   ```
2. Ejecutar manualmente:
   ```bash
   node mods/mi-mod/seed/_populate-all-tenants.js
   ```
   O agregar como `config-seeds.js` si debe ejecutarse automáticamente en cada sync para todos los tenants.

**Validar:** Cada tenant tiene el registro creado con su propio `tenantId`. `tenantManager.getRegisteredTenants()` retorna los IDs de todos los tenants activos. `tenantManager.getClient(tenantId)` retorna el cliente Prisma del tenant correspondiente.  
**Doc:** `specs/up1/core/programmatic-interaction.md` §5, §9
