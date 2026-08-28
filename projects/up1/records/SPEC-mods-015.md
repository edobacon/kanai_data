---
id: SPEC-mods-015
project: up1
type: doc
module: mods
tags:
  - api
  - createInstance
  - importInstances
  - bulk
  - service-token
  - headless
---

# Interaccion programatica

## Preparacion

No requiere crear carpetas en el mod — estas recetas son llamadas HTTP al API GraphQL.
Prerequisito: Object Manager corriendo (`npm run dev --workspace=@uplanner/object-management-backend`).

## Headers obligatorios en cada request:
```
X-Tenant-ID: {tenantId}
Authorization: Bearer {jwt-o-service-token}
Content-Type: application/json
```

Endpoint GraphQL: `POST http://localhost:4000/graphql`

---

### PROG-01: Listar registros con filtros
**Pre:** Objeto existente en BD. Token de autenticación disponible.  
**In:** `objectName`, filtros opcionales, `limit`, `offset`, `orderBy`.  
**Pasos:**
1. Ejecutar query `listInstances`:
   ```graphql
   query {
     listInstances(
       name: "MiObjeto"
       filters: [
         { field: "estado", operator: "EQUALS", value: "ACTIVO" }
         { field: "nombre", operator: "CONTAINS", value: "Demo" }
       ]
       limit: 20
       offset: 0
       sort: { field: "createdAt", direction: "desc" }
     ) {
       totalCount
       items { id data extended }
     }
   }
   ```
   Operadores disponibles: `EQUALS`, `NOT_EQUALS`, `CONTAINS`, `STARTS_WITH`, `ENDS_WITH`, `GREATER_THAN`, `LESS_THAN`, `GREATER_OR_EQUAL`, `LESS_OR_EQUAL`, `IN`, `NOT_IN`, `IS_NULL`, `IS_NOT_NULL`.

**Validar:** `items` es un array de `{ id, data, extended }`. `data` es JSON con los campos del registro. `totalCount` refleja el total sin paginación.  
**Doc:** `specs/up1/core/programmatic-interaction.md` §2

---

### PROG-02: Crear registro individual
**Pre:** Objeto existente. Token con capability `{objectname}:create` o service token.  
**In:** `objectName`, `data` con los campos del registro.  
**Pasos:**
1. Ejecutar mutation `createInstance`:
   ```graphql
   mutation {
     createInstance(
       objectType: "MiObjeto"
       data: {
         nombre: "Nuevo Registro"
         estado: "BORRADOR"
         puntuacion: 75
       }
     ) {
       id
       nombre
       estado
       createdAt
     }
   }
   ```

**Validar:** Respuesta incluye `id` generado. El registro queda con `tenantId` del header `X-Tenant-ID`. Mutation dispara `withEventPublish` si hay evento definido para `create`.  
**Doc:** `specs/up1/core/programmatic-interaction.md` §2

---

### PROG-03: Actualizar registro
**Pre:** Registro existente con `id` conocido. Token con capability `{objectname}:modify`.  
**In:** `objectName`, `id`, campos a actualizar.  
**Pasos:**
1. Ejecutar mutation `updateInstance`:
   ```graphql
   mutation {
     updateInstance(
       objectType: "MiObjeto"
       id: "uuid-del-registro"
       data: {
         estado: "ACTIVO"
         puntuacion: 90
       }
     ) {
       id
       estado
       puntuacion
       updatedAt
     }
   }
   ```

**Validar:** Solo se actualizan los campos enviados en `data`. `updatedAt` se actualiza automáticamente. Si el `id` no pertenece al tenant del header → error (aislamiento multi-tenant).  
**Doc:** `specs/up1/core/programmatic-interaction.md` §2

---

### PROG-04: Eliminar registro
**Pre:** Registro existente con `id` conocido. Token con capability `{objectname}:delete`.  
**In:** `objectName`, `id`.  
**Pasos:**
1. Ejecutar mutation `deleteInstance`:
   ```graphql
   mutation {
     deleteInstance(
       objectType: "MiObjeto"
       id: "uuid-del-registro"
     ) {
       id
     }
   }
   ```

**Validar:** Respuesta retorna el `id` eliminado. Para objetos que declaran hijos en su metadata (la mayoría de curriculum-design: `AcademicProgram`, `Curriculum`, `Activity`, `Offering`, `CurricularSection`) ya no aplica error de constraint: el motor cascada automáticamente o bloquea con un mensaje semántico legible (UPONE-1382). El error de constraint de FK solo sigue aplicando a objetos que NO declaran hijos en su metadata. Usa `deleteImpactPreview` antes de eliminar para anticipar el resultado sin mutar.  
**Doc:** `specs/up1/core/programmatic-interaction.md` §2, `features/delete-cascade.md`

---

### PROG-05: Import masivo desde array (importInstances con data[])
**Pre:** Objeto existente. Token disponible.  
**In:** `objectName`, array de registros a crear o actualizar, modo (`create`/`upsert`).  
**Pasos:**
1. Ejecutar mutation `importInstances` con array en `data`:
   ```graphql
   mutation {
     importInstances(
       objectType: "MiObjeto"
       data: [
         { nombre: "Registro A", estado: "ACTIVO", puntuacion: 80 }
         { nombre: "Registro B", estado: "BORRADOR", puntuacion: 60 }
         { nombre: "Registro C", estado: "ACTIVO", puntuacion: 95 }
       ]
       mode: "create"
     ) {
       totalProcessed
       successCount
       failedCount
       rows {
         rowIndex
         status
         errors
       }
     }
   }
   ```
   Modos: `"create"` (solo inserta), `"upsert"` (crea o actualiza).

**Validar:** `totalProcessed = successCount + failedCount`. Registros fallidos aparecen en `rows` con sus errores. Hasta 500 registros → sincrónico (respuesta inmediata). Más de 500 → asincrónico: retorna `{ jobId }`, usar `importStatus(jobId)` para polling.  
**Doc:** `specs/up1/core/programmatic-interaction.md` §4

---

### PROG-06: Import masivo desde Excel/CSV (POST /upload + importInstances)
**Pre:** Archivo `.xlsx` o `.csv` preparado con los datos.  
**In:** Ruta del archivo, `objectName`, mapping de columnas a campos.  
**Pasos:**
1. Subir el archivo:
   ```bash
   curl -X POST http://localhost:4000/upload \
     -H "X-Tenant-ID: UPU" \
     -H "Authorization: Bearer $TOKEN" \
     -F "file=@datos.xlsx"
   # Respuesta: { "filePath": "/tmp/uploads/abc123.xlsx" }
   ```
2. Previsualizar (opcional):
   ```graphql
   mutation {
     previewImport(filePath: "/tmp/uploads/abc123.xlsx", objectType: "MiObjeto") {
       headers
       rowCount
       detectedFKs
     }
   }
   ```
3. Ejecutar el import con mapping de columnas:
   ```graphql
   mutation {
     importInstances(
       filePath: "/tmp/uploads/abc123.xlsx"
       objectType: "MiObjeto"
       mapping: {
         "Nombre": "nombre"
         "Estado": "estado"
         "Puntuacion": "puntuacion"
       }
       mode: "create"
     ) {
       totalProcessed
       successCount
       failedCount
       rows { rowIndex status errors }
     }
   }
   ```

**Validar:** `previewImport` permite verificar el mapping antes de importar. Errores de validación aparecen por fila. El Excel de errores es reimportable (solo filas fallidas). Límite JSON body: 100KB.  
**Doc:** `specs/up1/core/programmatic-interaction.md` §4

---

### PROG-07: Update masivo (updateBulkInstances)
**Pre:** IDs de los registros a actualizar conocidos. Token con capability `{objectname}:modify`.  
**In:** `objectName`, array de `ids`, `data` con los campos a actualizar (mismos valores para todos).  
**Pasos:**
1. Ejecutar mutation `updateBulkInstances`:
   ```graphql
   mutation {
     updateBulkInstances(
       objectType: "MiObjeto"
       ids: ["uuid-1", "uuid-2", "uuid-3"]
       data: { estado: "INACTIVO" }
     ) {
       successCount
       failedCount
     }
   }
   ```

**Validar:** Todos los IDs reciben los mismos valores de `data`. IDs que no pertenecen al tenant → error de aislamiento (no se actualizan silenciosamente). Útil para migraciones de campo o actualizaciones masivas de estado.  
**Doc:** `specs/up1/core/programmatic-interaction.md` §4

---

### PROG-08: Delete masivo (deleteBulkInstances)
**Pre:** IDs de los registros a eliminar conocidos. Token con capability `{objectname}:delete`.  
**In:** `objectName`, array de `ids`.  
**Pasos:**
1. Ejecutar mutation `deleteBulkInstances`:
   ```graphql
   mutation {
     deleteBulkInstances(
       objectType: "MiObjeto"
       ids: ["uuid-1", "uuid-2", "uuid-3"]
     ) {
       successCount
       failedCount
     }
   }
   ```

**Validar:** Retorna conteo de éxitos y fallos. Fallos posibles: para objetos que declaran hijos en su metadata, ya no aplica FK constraint: el motor cascada el borrado o lo bloquea con un mensaje semántico legible (UPONE-1382); el error de constraint de FK solo sigue aplicando a objetos que NO declaran hijos en su metadata. También puede fallar por ID que no pertenece al tenant. Operación irreversible — verificar IDs antes de ejecutar.  
**Doc:** `specs/up1/core/programmatic-interaction.md` §4, `features/delete-cascade.md`

---

### PROG-09: Script headless con service token (ejemplo Node.js con fetch)
**Pre:** Variable de entorno `UP1_FLOW_SERVICE_TOKEN` configurada. Node.js 18+ disponible.  
**In:** URL del GraphQL, tenant, operaciones a ejecutar.  
**Pasos:**
1. Crear `scripts/load-data.js`:
   ```javascript
   // Script headless con service token — bypasea RBAC completamente
   const GRAPHQL_URL = 'http://localhost:4000/graphql';
   const TOKEN = process.env.UP1_FLOW_SERVICE_TOKEN;
   const TENANT = process.env.TENANT_ID ?? 'UPU';

   if (!TOKEN) throw new Error('UP1_FLOW_SERVICE_TOKEN no configurado');

   async function graphql(query, variables = {}) {
     const res = await fetch(GRAPHQL_URL, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'X-Tenant-ID': TENANT,
         'Authorization': `Bearer ${TOKEN}`
       },
       body: JSON.stringify({ query, variables })
     });

     if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

     const json = await res.json();
     if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
     return json.data;
   }

   // Listar registros
   const { listInstances } = await graphql(`
     query {
       listInstances(name: "MiObjeto", limit: 10) {
         totalCount
         items { id data }
       }
     }
   `);
   console.log(`Total registros: ${listInstances.totalCount}`);
   listInstances.items.forEach(i => console.log(i.data.nombre));

   // Crear registro
   const { createInstance } = await graphql(`
     mutation($data: JSON!) {
       createInstance(objectType: "MiObjeto", data: $data) {
         id
         nombre
       }
     }
   `, { data: { nombre: 'Registro Script', estado: 'ACTIVO', puntuacion: 100 } });
   console.log(`Creado: ${createInstance.id}`);

   // Import masivo
   const { importInstances } = await graphql(`
     mutation($data: [JSON!]!) {
       importInstances(objectType: "MiObjeto", data: $data, mode: "create") {
         totalProcessed
         successCount
         failedCount
       }
     }
   `, { data: [
     { nombre: 'Batch 1', estado: 'ACTIVO', puntuacion: 50 },
     { nombre: 'Batch 2', estado: 'BORRADOR', puntuacion: 30 }
   ]});
   console.log(`Import: ${importInstances.successCount}/${importInstances.totalProcessed} exitosos`);
   ```
2. Ejecutar:
   ```bash
   UP1_FLOW_SERVICE_TOKEN=tu-token TENANT_ID=UPU node scripts/load-data.js
   ```

**Validar:** El service token bypasea RBAC completamente — sin verificación de capabilities, sin businessContextFilter. Usar solo para scripts de carga, migraciones y automatizaciones. **No exponer el token en código versionado** — usar variables de entorno.  
**Doc:** `specs/up1/core/programmatic-interaction.md` §7, §9
