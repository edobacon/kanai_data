---
id: SPEC-mods-014
project: up1
type: doc
module: mods
tags:
  - objeto
  - campo
  - FK
  - enum
  - json
  - formula
  - extended
  - relacion
  - codegen
  - migrate
---

# Objetos de negocio

## Preparacion

```bash
mkdir -p mods/{mod}/objects
```

## Flujo base (repetir tras CADA cambio en `objects/`)

```bash
npm run sync
npm run codegen --workspace=@uplanner/object-management-backend
npm run tenant:migrate --workspace=@uplanner/object-management-backend
```

El codegen genera Prisma schema + tipos GraphQL. El migrate aplica los cambios en PostgreSQL. Sin estos tres pasos, los cambios en los JSON no tienen efecto en la API ni en la BD.

---

### OBJ-01: Crear objeto simple sin relaciones
**Pre:** Flujo base disponible. Stack uP1 corriendo.  
**In:** Nombre del objeto (PascalCase), label singular/plural, campos iniciales.  
**Pasos:**
1. Crear `mods/{mod}/objects/MiObjeto.json`:
   ```json
   {
     "$schema": "http://json-schema.org/draft-07/schema#",
     "title": "MiObjeto",
     "type": "object",
     "metadata": {
       "label": "Mi Objeto",
       "labelPlural": "Mis Objetos",
       "gender": "masculino",
       "description": "Descripcion para tooltips y documentacion",
       "defaultLayoutType": "RecordList"
     },
     "properties": {
       "nombre": {
         "type": "string",
         "title": "Nombre",
         "not_null": true
       },
       "descripcion": {
         "type": "string",
         "title": "Descripcion"
       }
     },
     "required": ["nombre"]
   }
   ```
   Reglas de naming:
   - `title` en el JSON: PascalCase, sin espacios.
   - El archivo debe llamarse igual que `title` + `.json` (ej: `MiObjeto.json`).
   - `gender`: `"masculino"` o `"femenino"` — afecta los textos de la UI en español.
   - `defaultLayoutType`: `"RecordList"` (vista tabla) o `"RecordDetail"` (vista formulario).
   - Campos `id`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `tenantId` se heredan de `common.json` — no declararlos.

2. Ejecutar flujo base:
   ```bash
   npm run sync
   npm run codegen --workspace=@uplanner/object-management-backend
   npm run tenant:migrate --workspace=@uplanner/object-management-backend
   ```

**Validar:** En `localhost:4000/graphql`, ejecutar:
```graphql
query {
  listInstances(name: "MiObjeto") {
    totalCount
    items { id data }
  }
}
```
Debe retornar `{ instances: [], totalCount: 0 }` sin errores. Si retorna error "unknown object", el codegen o migrate no completó.  
**Doc:** `specs/up1/mods/creation-guide.md` §5.1, `specs/up1/mods/reference.md` §5

---

### OBJ-02: Agregar campo texto con restricciones
**Pre:** Objeto ya existe en `objects/`. Flujo base disponible.  
**In:** Nombre del campo (camelCase), restricciones deseadas.  
**Pasos:**
1. Agregar el campo en `properties` del JSON del objeto:
   ```json
   "codigo": {
     "type": "string",
     "title": "Código",
     "not_null": true,
     "unique": true,
     "static_default": "SIN-CODIGO"
   }
   ```
   Restricciones disponibles para tipo `string`:
   - `"not_null": true` → columna NOT NULL en PostgreSQL. El campo es obligatorio en create/update.
   - `"unique": true` → constraint UNIQUE en la tabla. El codegen genera índice.
   - `"static_default": "valor"` → valor por defecto cuando no se especifica. Siempre como string aunque sea número o booleano.
   - Para hacerlo obligatorio en la API (validación GraphQL), agregar el nombre del campo al array `required` del objeto.

2. Si el campo es obligatorio, agregarlo a `required`:
   ```json
   "required": ["nombre", "codigo"]
   ```

3. Ejecutar flujo base.

**Validar:** `npm run codegen` debe completar sin errores. Verificar en la API que el campo aparece:
```graphql
query {
  getObjectFields(name: "MiObjeto") {
    name
    fieldType
    isRequired
  }
}
```
El campo `codigo` debe aparecer en la lista.  
**Doc:** `specs/up1/mods/creation-guide.md` §5.1

---

### OBJ-03: Agregar campo enum
**Pre:** Objeto ya existe en `objects/`.  
**In:** Nombre del campo, valores posibles del enum.  
**Pasos:**
1. Agregar el campo en `properties`:
   ```json
   "estado": {
     "type": "string",
     "title": "Estado",
     "enum": ["BORRADOR", "EN_REVISION", "PUBLICADO", "ARCHIVADO"],
     "static_default": "BORRADOR",
     "not_null": true
   }
   ```
   - `type` siempre es `"string"` para enums.
   - `enum` recibe un array de strings con los valores permitidos. Usar MAYUSCULAS_CON_GUION por convención.
   - El codegen genera validación en la API: solo los valores del array son aceptados.
   - `static_default` debe ser uno de los valores del enum.

2. Si es obligatorio, agregarlo a `required`.

3. Ejecutar flujo base.

**Validar:** Intentar crear una instancia con un valor fuera del enum:
```graphql
mutation {
  createInstance(objectType: "MiObjeto", data: { estado: "VALOR_INVALIDO" }) {
    id
  }
}
```
Debe retornar error de validación. Con un valor válido, debe crear correctamente.  
**Doc:** `specs/up1/mods/creation-guide.md` §5.1, `specs/up1/mods/reference.md` §5

---

### OBJ-04: Agregar campo fecha
**Pre:** Objeto ya existe en `objects/`.  
**In:** Nombre del campo, si es obligatorio.  
**Pasos:**
1. Agregar el campo en `properties`:
   ```json
   "fechaInicio": {
     "type": "string",
     "format": "date-time",
     "title": "Fecha de Inicio"
   }
   ```
   - `type` es `"string"` — el formato ISO 8601 se valida con `format: "date-time"`.
   - El codegen genera columna `TIMESTAMP` en PostgreSQL.
   - El valor en la API se recibe y retorna como string ISO 8601 (ej: `"2026-03-15T00:00:00.000Z"`).
   - Para fecha sin hora, seguir usando `format: "date-time"` — no existe `format: "date"` en el sistema.

2. Ejecutar flujo base.

**Validar:** Crear una instancia con una fecha:
```graphql
mutation {
  createInstance(
    objectType: "MiObjeto"
    data: { nombre: "Test", fechaInicio: "2026-03-15T00:00:00.000Z" }
  ) {
    id
    fechaInicio
  }
}
```
El campo debe retornarse como string de fecha.  
**Doc:** `specs/up1/mods/creation-guide.md` §5.1

---

### OBJ-05: Agregar campo JSON/JSONB
**Pre:** Objeto ya existe en `objects/`.  
**In:** Nombre del campo, estructura esperada (objeto o array).  
**Pasos:**
1. Agregar el campo en `properties`:
   ```json
   "configuracion": {
     "type": "object",
     "title": "Configuración",
     "default": {}
   }
   ```
   Para arrays:
   ```json
   "etiquetas": {
     "type": "object",
     "title": "Etiquetas",
     "default": []
   }
   ```
   - `type: "object"` genera columna `JSONB` en PostgreSQL para ambos casos (objetos y arrays).
   - `default` define el valor por defecto — usar `{}` para objetos y `[]` para arrays.
   - El contenido no está restringido a nivel de columna — la validación de estructura se hace opcionalmente via `updateJsonSchema` (ver OBJ-18).
   - Tradeoff: JSONB no soporta filtros eficientes por contenido interno en queries genéricas.

2. Ejecutar flujo base.

**Validar:** Crear instancia con un JSON:
```graphql
mutation {
  createInstance(
    objectType: "MiObjeto"
    data: { nombre: "Test", configuracion: { clave: "valor", activo: true } }
  ) {
    id
    configuracion
  }
}
```
El campo debe retornar el objeto JSON completo.  
**Doc:** `specs/up1/mods/objects-map.md` §6 (Patron 5), `specs/up1/mods/creation-guide.md` §5.1

---

### OBJ-06: Agregar campo fórmula
**Pre:** Objeto ya existe en `objects/`. Los campos referenciados por la fórmula ya existen en el mismo objeto.  
**In:** Nombre del campo calculado, expresión de la fórmula.  
**Pasos:**
1. Agregar el campo en `properties`:
   ```json
   "puntuacionPonderada": {
     "type": "formula",
     "title": "Puntuación Ponderada",
     "properties": {
       "formula": "=puntuacion * 100"
     }
   }
   ```
   - `type` debe ser `"formula"` (string literal).
   - La fórmula va en `properties.formula`, con prefijo `=`.
   - El motor usa FormulaJS (399 funciones Excel compatibles): `SUM`, `IF`, `VLOOKUP`, `ROUND`, operadores aritméticos, etc.
   - Referencia a otros campos del mismo objeto: usar el nombre camelCase del campo sin prefijo (ej: `puntuacion`, no `this.puntuacion`).
   - Los campos fórmula son **calculados en runtime** — no generan columna en PostgreSQL.
   - No agregar a `required`.

2. Ejecutar flujo base.

**Validar:** Crear una instancia con los campos base y verificar que la fórmula se calcula:
```graphql
mutation {
  createInstance(
    objectType: "MiObjeto"
    data: { nombre: "Test", puntuacion: 0.85 }
  ) {
    id
    puntuacion
    puntuacionPonderada
  }
}
```
`puntuacionPonderada` debe retornar `85`.  
**Doc:** `specs/up1/mods/creation-guide.md` §5.1, `specs/up1/core/programmatic-objects.md` §8

---

### OBJ-07: FK a objeto del mismo mod
**Pre:** Ambos objetos existen en `mods/{mod}/objects/`. Flujo base disponible.  
**In:** Nombre del campo FK (debe terminar en `Id`), nombre del objeto destino (PascalCase).  
**Pasos:**
1. En el objeto que contiene la referencia, agregar el campo FK:
   ```json
   "hwAssessmentId": {
     "type": "string",
     "title": "Assessment",
     "x-foreign-key": {
       "object": "HwAssessment",
       "field": "id"
     },
     "not_null": true
   }
   ```
   - El nombre del campo debe terminar en `Id` (convención del codegen).
   - `x-foreign-key.object`: nombre PascalCase del objeto destino, exactamente como está en su `title`.
   - `x-foreign-key.field`: siempre `"id"` para referenciar el ID del registro destino.
   - El codegen genera `@relation()` en Prisma y FK constraint en PostgreSQL.
   - Si es obligatorio, agregar `"not_null": true` y el campo a `required`.

2. Ejecutar flujo base.

**Validar:** Crear una instancia del objeto padre primero, luego una del hijo con el ID:
```graphql
mutation {
  createInstance(
    objectType: "HwFactor"
    data: { hwAssessmentId: "uuid-del-assessment" }
  ) {
    id
    hwAssessmentId
  }
}
```
Debe crear correctamente. Intentar con un UUID inexistente debe retornar error de FK constraint.  
**Doc:** `specs/up1/mods/objects-map.md` §6 (Patron 1), `specs/up1/mods/creation-guide.md` §5.1

---

### OBJ-08: FK a objeto core (Person, Institution, Course, etc.)
**Pre:** El objeto core referenciado existe en la plataforma (siempre es el caso para objetos base).  
**In:** Nombre del campo FK, nombre del objeto core destino.  
**Pasos:**
1. Agregar el campo FK en el JSON del objeto del mod:
   ```json
   "personId": {
     "type": "string",
     "title": "Persona",
     "x-foreign-key": {
       "object": "Person",
       "field": "id"
     }
   }
   ```
   Objetos core disponibles: `Person`, `Institution`, `Campus`, `Faculty`, `Department`, `Career`, `Course`, `Curriculum`, `AcademicPeriod`, `Affiliation`, `Profile`, `Shift`, `TimeBlock`, `Role`, `Tenant`.
   
   Para el dominio de engagement, los objetos reales viven en el mod `uengagement-up1`, no en el core: `Event`, `Offering`, `OfferingEnrollment` son objetos propios del mod. `Service` no es un objeto sino un RecordType de `Activity` (`rt__Service__Activity`, discriminado por el campo `serviceType`). `Category` e `Issue` no existen en el modelo actual. Para referenciar estos objetos desde otro mod, usar FK cross-mod (ver OBJ-11) y verificar que `uengagement-up1` no este en `ignoredMods`.

2. Ejecutar flujo base.

**Validar:** Crear instancia del objeto con un ID de persona válido:
```graphql
mutation {
  createInstance(
    objectType: "MiObjeto"
    data: { nombre: "Test", personId: "uuid-persona-existente" }
  ) {
    id
    personId
  }
}
```  
**Doc:** `specs/up1/mods/objects-map.md` §3 y §6 (Patron 1), `specs/up1/mods/reference.md` §5

---

### OBJ-09: FK por convención de nombre (auto-detectada)
**Pre:** El objeto destino existe en `objects/business/` (ya fue sincronizado). El campo se nombra siguiendo la convención.  
**In:** Nombre del campo (debe ser `{camelCaseNombreObjeto}Id`).  
**Pasos:**
1. Declarar el campo sin `x-foreign-key` explícito:
   ```json
   "hwAssessmentId": {
     "type": "string",
     "title": "Assessment"
   }
   ```
   El codegen auto-detecta la relación porque:
   - El campo termina en `Id`.
   - Existe un objeto cuyo nombre en PascalCase coincide con la parte antes de `Id` (ej: `hwAssessmentId` → busca objeto `HwAssessment`).
   
   Si el objeto destino existe, el codegen genera la relación Prisma automáticamente.
   
   **Cuándo usar vs OBJ-07:** usar convención cuando la relación es obvia por el nombre. Usar `x-foreign-key` explícito cuando quieres ser preciso o cuando el nombre del campo no sigue exactamente el PascalCase del objeto destino.

2. Ejecutar flujo base.

**Validar:** Verificar en el schema de Prisma generado (`object-manager/prisma/schema.prisma`) que existe una línea `@relation` para el campo. Si no aparece, el nombre del campo no coincide con ningún objeto — usar `x-foreign-key` explícito.  
**Doc:** `specs/up1/mods/objects-map.md` §6 (Patron 3)

---

### OBJ-10: Relación polimórfica
**Pre:** Objeto ya existe en `objects/`. Los tipos posibles del polimorfismo están definidos.  
**In:** Nombre del par de campos (`{nombre}Type` + `{nombre}Id`), tipos posibles.  
**Pasos:**
1. Declarar el par de campos en `properties`:
   ```json
   "assigneeType": {
     "type": "select",
     "title": "Tipo de Asignado",
     "options": [
       { "value": "user", "label": "Usuario" },
       { "value": "resource", "label": "Recurso" }
     ]
   },
   "assigneeId": {
     "type": "string",
     "title": "ID del Asignado"
   }
   ```
   - El campo `Type` es un enum (tipo `select`) con los posibles tipos de objeto.
   - El campo `Id` es un `string` sin FK constraint — la integridad referencial se valida en lógica, no en BD.
   - Pares convencionales: `assigneeType/assigneeId` (quién), `contextType/contextId` (dónde), `relatedObjectType/relatedObjectId` (qué).
   - No usar `x-foreign-key` en el campo `Id` — el polimorfismo es explícitamente sin FK constraint.

2. Si los campos son obligatorios, agregarlos a `required`.

3. Ejecutar flujo base.

**Validar:** Crear instancias con distintos valores de `Type`:
```graphql
mutation {
  createInstance(
    objectType: "MiObjeto"
    data: { assigneeType: "user", assigneeId: "uuid-usuario" }
  ) { id assigneeType assigneeId }
}
```
Ambos tipos deben funcionar. No hay constraint de FK — un UUID inexistente no genera error de BD.  
**Doc:** `specs/up1/mods/objects-map.md` §6 (Patron 4), `specs/up1/mods/example-engagement.md`

---

### OBJ-11: FK cross-mod (a objeto de otro mod activo)
**Pre:** El mod destino está activo (no está en `ignoredMods`). Ambos mods están en `uPlannerMods`.  
**In:** Nombre del campo FK, nombre del objeto en el mod destino.  
**Pasos:**
1. Declarar la FK exactamente igual que una FK a objeto core (OBJ-07):
   ```json
   "studyPlanId": {
     "type": "string",
     "title": "Plan de Estudio",
     "x-foreign-key": {
       "object": "StudyPlan",
       "field": "id"
     }
   }
   ```
   El codegen trata todos los objetos en `objects/business/` por igual — no distingue si vienen del mod A o del mod B.

2. Ejecutar flujo base.

   **ADVERTENCIA CRÍTICA:** Si el mod destino está en `ignoredMods`, sus objetos no se sincronizan a `objects/business/`. La FK apuntará a una tabla inexistente y el codegen fallará. Antes de declarar esta FK, verificar que el mod destino NO está en `ignoredMods`:
   ```bash
   # Verificar en package.json raíz del monorepo
   cat package.json | grep -A5 '"ignoredMods"'
   ```

**Validar:** `npm run codegen` completa sin errores. Si falla con "unknown relation target", el mod destino no está sincronizado.  
**Doc:** `specs/up1/mods/objects-map.md` §9

---

### OBJ-12: Extended object (campos custom por tenant)
**Pre:** El objeto base al que se quiere extender existe en el core. Se conoce el código del tenant en MAYÚSCULAS.  
**In:** Nombre del objeto base (lowercase), código del tenant, campos a agregar.  
**Pasos:**
1. Crear el archivo extended en el mod. Naming obligatorio: `ext__{TENANT}__{objeto_en_lowercase}.json`:
   ```
   mods/mi-mod/objects/ext__UPU__person.json
   ```
2. Contenido del archivo:
   ```json
   {
     "$schema": "http://json-schema.org/draft-07/schema#",
     "title": "ext__UPU__person",
     "type": "object",
     "properties": {
       "emergencyContact": {
         "type": "string",
         "title": "Contacto de Emergencia"
       },
       "scholarshipType": {
         "type": "string",
         "title": "Tipo de Beca",
         "enum": ["NONE", "PARTIAL", "FULL"]
       }
     }
   }
   ```
   - `title` debe ser exactamente igual al nombre del archivo (sin extensión).
   - `TENANT`: código del tenant en MAYÚSCULAS (ej: `UPU`, `UNAB`, `TEST`).
   - El objeto base (ej: `person`) en minúsculas.
   - El codegen genera tabla separada `ext__UPU__person` con relación 1:1 al objeto base.
   - En el tenant UPU, el tipo GraphQL de `Person` incluye los campos extended. En otros tenants, esos campos no existen.

3. Ejecutar flujo base.

**Validar:** En el tenant UPU, consultar un `Person` y verificar que los campos extended aparecen en el tipo GraphQL. En otro tenant, los campos no deben estar disponibles.  
**Doc:** `specs/up1/mods/objects-map.md` §7, `specs/up1/mods/creation-guide.md` §5.1

---

### OBJ-13: Validación fórmula (createObjectValidation)
**Pre:** El objeto existe en la API. Los campos referenciados en la fórmula existen en el objeto. Se tiene el `objectDefinitionId` (obtenerlo con `getObjectDefinitions`).  
**In:** Expresión de validación, mensaje de error, ID del objeto.  
**Pasos:**
1. Obtener el `objectDefinitionId`:
   ```graphql
   query {
     getObjectDefinitions {
       id
       name
     }
   }
   ```
2. Ejecutar la mutation en `localhost:4000/graphql`:
   ```graphql
   mutation {
     createObjectValidation(data: {
       objectDefinitionId: "clx1234..."
       name: "fechas_validas"
       formula: "=fechaFin > fechaInicio"
       errorMessage: "La fecha de fin debe ser posterior a la fecha de inicio"
       isActive: true
     }) {
       id
       name
       formula
       isActive
     }
   }
   ```
   - La fórmula usa prefijo `=` y FormulaJS (funciones Excel: `IF`, `AND`, `OR`, `LEN`, operadores).
   - Referencia a campos del objeto por su nombre camelCase.
   - `name`: identificador único de la validación (snake_case convencional).
   - La validación se ejecuta automáticamente en `create` y `update`.

**Validar:** Intentar crear/actualizar una instancia que viole la validación:
```graphql
mutation {
  createInstance(
    objectType: "MiObjeto"
    data: { fechaInicio: "2026-12-01T00:00:00Z", fechaFin: "2026-01-01T00:00:00Z" }
  ) { id }
}
```
Debe retornar el `errorMessage` configurado.  
**Doc:** `specs/up1/core/programmatic-objects.md` §8

---

### OBJ-14: Modificar metadatos de objeto (label, labelPlural, gender, defaultLayoutType)
**Pre:** El objeto existe. Si viene de un mod (source `Business`), modificar el JSON del mod. Si fue creado via API (source `Tenant`), se puede usar la mutation.  
**In:** Metadatos a modificar.  
**Pasos:**

**Opción A — Objeto de mod (recomendado):** editar el JSON directamente:
```json
{
  "metadata": {
    "label": "Nuevo Label",
    "labelPlural": "Nuevos Labels",
    "gender": "femenino",
    "defaultLayoutType": "RecordDetail"
  }
}
```
Luego ejecutar el flujo base.

**Opción B — Objeto creado via API (source Tenant):**
```graphql
mutation {
  updateObjectDefinition(
    name: "MiObjeto"
    label: "Nuevo Label"
    labelPlural: "Nuevos Labels"
    gender: "femenino"
    defaultLayoutType: "RecordDetail"
  ) {
    id
    name
    label
    labelPlural
  }
}
```
Esta mutation dispara `applyChanges()` automáticamente — no requiere flujo base manual.

**Validar:** En la UI (`localhost:3000`), el label del objeto debe actualizarse en tabs, títulos y breadcrumbs. El `defaultLayoutType` afecta cómo se muestra el objeto cuando se accede desde `defaultObjects` en app.json.  
**Doc:** `specs/up1/core/programmatic-objects.md` §3

---

### OBJ-15: Crear objeto via API GraphQL (runtime, sin archivos)
**Pre:** Stack uP1 corriendo. Token de autenticación válido con permisos de admin.  
**In:** Nombre del objeto (PascalCase), campos iniciales, metadatos.  
**Pasos:**
1. Ejecutar la mutation en `localhost:4000/graphql` con token de autenticación:
   ```graphql
   mutation {
     createObjectDefinition(
       name: "ResearchProject"
       fields: [
         { name: "title", fieldType: "text", label: "Título", isRequired: true }
         { name: "budget", fieldType: "currency", label: "Presupuesto" }
         { name: "status", fieldType: "text", label: "Estado" }
         { name: "startDate", fieldType: "date", label: "Fecha Inicio" }
         { name: "isActive", fieldType: "boolean", label: "Activo" }
       ]
       label: "Proyecto de Investigación"
       labelPlural: "Proyectos de Investigación"
       gender: "masculino"
       description: "Gestión de proyectos de investigación académica"
       defaultLayoutType: "RecordList"
     ) {
       id
       name
       tableName
       label
     }
   }
   ```
   Qué sucede internamente: crea registro en `core_ObjectDefinition` con `source: 'Tenant'`, escribe el JSON en `objects/business/Base/`, crea 4 capabilities CRUD automáticas, y dispara `applyChanges()` (codegen + migrate + restart).

2. Esperar 10-30 segundos para que el pipeline complete.

   **Diferencia con OBJ-01:** los objetos creados via API tienen `source: 'Tenant'` — son modificables via API pero no están versionados en git del mod. Los objetos de mod tienen `source: 'Business'` — versionados pero read-only via API.

**Validar:** Después de ~20 segundos, verificar que el objeto está disponible:
```graphql
query {
  listInstances(name: "ResearchProject") {
    totalCount
    items { id data }
  }
}
```  
**Doc:** `specs/up1/core/programmatic-objects.md` §2 y §3

---

### OBJ-16: Agregar campo via API (createCustomField)
**Pre:** El objeto destino tiene `source: 'Tenant'` (fue creado via API/UI). Se tiene el `objectDefinitionId`.  
**In:** Nombre del campo, tipo, label.  
**Pasos:**
1. Obtener el `objectDefinitionId` si no se tiene:
   ```graphql
   query {
     getObjectDefinitions {
       id
       name
     }
   }
   ```
2. Ejecutar la mutation:
   ```graphql
   mutation {
     createCustomField(
       objectDefinitionId: "clx1234..."
       name: "fundingSource"
       fieldType: "text"
       label: "Fuente de Financiamiento"
       description: "Organización que financia el proyecto"
       isRequired: false
       defaultValue: "Interno"
     ) {
       id
       name
       fieldType
       label
     }
   }
   ```
   Tipos de campo disponibles: `text`, `textarea`, `textarea_long`, `number`, `boolean`, `email`, `currency`, `date`, `datetime`, `time`, `percent`, `phone`, `url`, `json`, `relation`.

   La mutation dispara `applyChanges()` automáticamente — no correr flujo base manual.

   **Restricción:** solo funciona en objetos con `source: 'Tenant'`. En objetos de mod (`source: 'Business'`), retorna error "read-only".

**Validar:** Esperar ~15 segundos y luego:
```graphql
query {
  getObjectFields(name: "ResearchProject") {
    name
    fieldType
    label
  }
}
```
El nuevo campo debe aparecer.  
**Doc:** `specs/up1/core/programmatic-objects.md` §4

---

### OBJ-17: Agregar campo relación via API (fieldType: relation)
**Pre:** El objeto destino existe en la plataforma. Se tiene el `objectDefinitionId` del objeto donde se agrega el campo.  
**In:** Nombre del campo FK, nombre del objeto destino, cardinalidad.  
**Pasos:**
1. Ejecutar la mutation con `fieldType: "relation"`:
   ```graphql
   mutation {
     createCustomField(
       objectDefinitionId: "clx1234..."
       name: "departmentId"
       fieldType: "relation"
       label: "Departamento"
       target: "Department"
       oneToOne: false
     ) {
       id
       name
       fieldType
     }
   }
   ```
   - `target`: nombre PascalCase del objeto destino — debe existir en la plataforma.
   - `oneToOne: false` para relaciones N:1 (muchos registros apuntan a uno). `true` para 1:1.
   - El resolver detecta automáticamente el tipo de ID del target (String o Int) desde el schema Prisma.
   - Si el campo no termina en `Id`, el sistema agrega el sufijo automáticamente.

   La mutation dispara `applyChanges()` automáticamente.

**Validar:** Esperar ~15 segundos y crear una instancia con el ID del objeto relacionado:
```graphql
mutation {
  createInstance(
    objectType: "ResearchProject"
    data: { title: "Test", departmentId: "uuid-depto" }
  ) { id departmentId }
}
```  
**Doc:** `specs/up1/core/programmatic-objects.md` §4

---

### OBJ-18: Actualizar JSON schema de campo json (updateJsonSchema)
**Pre:** El campo de tipo `json` existe en el objeto. Se tiene el `fieldDefinitionId` del campo (obtenerlo con `getObjectFields`).  
**In:** ID del campo, nuevo schema JSON.  
**Pasos:**
1. Obtener el `fieldDefinitionId`:
   ```graphql
   query {
     getObjectFields(name: "MiObjeto") {
       id
       name
       fieldType
     }
   }
   ```
2. Ejecutar la mutation:
   ```graphql
   mutation {
     updateJsonSchema(
       fieldDefinitionId: "clx5678..."
       schema: {
         type: "object"
         properties: {
           nivel: { type: "string" }
           puntaje: { type: "number" }
           etiquetas: { type: "array", items: { type: "string" } }
         }
         required: ["nivel"]
       }
     ) {
       id
       version
       schema
       isActive
     }
   }
   ```
   - Crea una **nueva versión** del schema (la anterior se desactiva automáticamente — no se elimina).
   - El schema se usa para validación y generación de UI en campos tipo `json`.
   - Dispara `applyChanges()` automáticamente.
   - Útil para campos JSONB donde se quiere definir estructura esperada sin crear tablas relacionadas.

**Validar:** La mutation retorna el nuevo objeto `FieldJsonSchema` con `isActive: true` y `version` incrementado. El schema anterior queda con `isActive: false`.  
**Doc:** `specs/up1/core/programmatic-objects.md` §4

---

## Diagrama de decisión: crear vs extender vs consumir

```text
┌───────────────────────────────┐
│   Necesito datos en mi mod    │
└──────────────┬────────────────┘
               ▼
┌──────────────────────────────────────┐
│ Los datos ya existen en un objeto    │
│ core?                                │
└────┬──────────────────┬─────────────┬┘
     │                  │             │
  Si, exactamente   Si, pero faltan  No, son datos
  como estan        campos extra     nuevos del dominio
     │                  │             │
     ▼                  ▼             ▼
 CONSUMIR       Los campos extra   Los datos son propios
 Layout con     son especificos    del dominio del mod?
 objectName     de un tenant?
 del core o        │                 │           │
 listInstances()   │             Si, entidad   No, datos
                   │             central del  transversales
               Si, solo          mod              │
               un tenant              │          │
                   │                  ▼          ▼
                   ▼             [CREAR]   [MODIFICAR CORE]
              EXTENDER           objects/  Requiere coord.
              ext__{TENANT}__    {MiObjeto}con equipo de
              {objeto}.json      .json     plataforma
              Campos custom      Tabla nueva
              por tenant         PostgreSQL
                   │
                   ▼
             No, todos los
             tenants lo
             necesitarian
                   │
                   ▼
           Mejor agregar al
           objeto base core?
              │         │
           Si (campo    No (campo
           universal)   del dominio)
              │         │
              ▼         ▼
         MODIFICAR    CREAR
         CORE         (ver arriba)

 Ejemplos:
 CONSUMIR  → mostrar lista de Person en el mod de engagement
 EXTENDER  → campo 'beca' en Person solo para tenant UPU
 CREAR     → TimeBlockTemplate, HwAssessment, StudyPlan
 MOD.CORE  → campo que todos los tenants necesitan igual
```
