---
id: DOC-kb-onboarding-04-modelar-datos
project: up1
type: doc
---

# Modelar datos en UP1

Esta guia explica como disenar el modelo de datos en UP1, incluyendo como migrar desde un sistema tradicional (MySQL/Oracle/MSSQL con tablas manuales) sin duplicar informacion.

## Principio fundamental: JSON es la fuente de verdad

En un sistema tradicional escribes **DDL SQL** o usas una herramienta de modelado (MySQL Workbench, pgAdmin, etc.). En UP1 escribes **JSON**. El sistema genera el resto.

```
JSON object definition
        │
        │  npm run codegen (proceso de 8 pasos)
        ▼
    ┌──────────────────┐
    │ Prisma schema     │  → DB tables + migrations
    │ GraphQL typeDefs  │  → API queries/mutations automaticas
    │ Object metadata   │  → Labels, genero, layout por defecto
    │ Validaciones      │  → Frontend + backend
    └──────────────────┘
```

Tu trabajo es **disenar el JSON**. Todo lo demas es mecanico.

**Nunca editar manualmente**:
- `prisma/schema.prisma` (regenerado en cada codegen)
- `src/graphql/typeDefs/dynamic.js` (regenerado)
- Migraciones ya aplicadas

## Las tres ubicaciones de un object

La primera decision al modelar una entidad es **donde vive**. Hay tres ubicaciones y cada una responde a una pregunta diferente:

```
object-manager/objects/
├── business/
│   ├── Base/                       ← Entidades de dominio compartidas
│   │   ├── Person.json
│   │   ├── Institution.json
│   │   └── ...
│   ├── Extended/                   ← Campos custom por cliente
│   │   └── ext__uplanner__faculty.json
│   └── common.json                 ← Campos heredados por todos
└── tenants/
    └── UPU/
        └── Base/                   ← Objetos core de un tenant especifico
            ├── Faculty.json
            ├── Course.json
            └── ...

mods/{mod}/objects/                 ← Objetos especificos de un mod
    ├── CaCompetencyMatrix.json
    ├── CaCompetency.json
    └── ...
```

### Arbol de decision: donde va mi entidad

```
¿La entidad es core del dominio educativo (Person, Course, Enrollment)?
   │
   ├── SI → objects/business/Base/  (si todos los tenants la necesitan con el mismo shape)
   │        │
   │        └── ¿Un tenant necesita campos adicionales?
   │               └── SI → objects/business/Extended/ext__<cliente>__<obj>.json
   │
   ├── CORE pero distinta por tenant → objects/tenants/{TENANT}/Base/
   │
   └── NO → ¿Es funcionalidad nueva agregada como feature?
          │
          └── SI → mods/{mi-mod}/objects/
```

### Regla de tres verificaciones antes de crear un object

Antes de escribir `MiEntidad.json`, responde:

1. **¿Ya existe algo similar?** — grep en los tres directorios por el concepto. Si alguien ya modelo "Person", "Course", "Faculty", NO crear un duplicado con otro nombre. Referenciar el existente.

2. **¿Quien mas la va a consumir?** — si la respuesta es "muchos mods", va en `business/Base/`. Si es "solo este mod", va en `mods/{mod}/objects/`. Si es "solo este tenant pero multiples mods del tenant", va en `tenants/{TENANT}/Base/`.

3. **¿Es realmente una entidad nueva o un campo adicional?** — si lo unico que agrega es un par de columnas a algo existente, usa Extended, no un object nuevo.

## Common fields — campos heredados automaticamente

Todo object **hereda automaticamente** los campos definidos en `objects/business/common.json`:

```json
{
  "properties": {
    "id": { "type": "string" },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" }
  },
  "required": ["id", "createdAt", "updatedAt"]
}
```

El codegen inyecta estos campos en cada tabla generada. **No los declares en tu JSON**, ya estan.

Adicionalmente, el sistema agrega automaticamente:
- `tenantId` — aislamiento multi-tenant
- Campos de auditoria segun configuracion

Esto elimina una fuente clasica de duplicacion: en un sistema tradicional cada DBA copia las mismas 5 columnas de auditoria en cada CREATE TABLE. En UP1, se definen una vez y se aplican a todo.

## Anatomia de un object JSON

Un archivo tipico en `objects/business/Base/`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Person",
  "type": "object",
  "metadata": {
    "label": "Persona",
    "labelPlural": "Personas",
    "gender": "femenino",
    "description": "Individuo registrado en el sistema",
    "defaultLayoutType": "RecordList"
  },
  "properties": {
    "firstName": {
      "type": "string",
      "title": "First Name",
      "not_null": true,
      "transformations": [{ "type": "trim" }]
    },
    "email": {
      "type": "string",
      "format": "email",
      "not_null": true,
      "unique": true,
      "transformations": [{ "type": "lowercase" }]
    },
    "documentId": {
      "type": "string",
      "unique": true
    }
  },
  "required": ["firstName", "email"]
}
```

**Partes clave:**

| Seccion | Proposito |
|---------|-----------|
| `title` | Nombre del object (PascalCase, coincide con nombre de archivo) |
| `metadata` | Info Salesforce-style: label visible, genero (para i18n), layout por defecto |
| `properties` | Columnas de la tabla con tipos, validaciones, transformaciones |
| `required` | Campos obligatorios a nivel JSON schema |

**Modificadores de propiedad** (no son JSON Schema standard, son extensiones del codegen):

| Modificador | Genera en Prisma/DDL |
|-------------|----------------------|
| `not_null: true` | `NOT NULL` |
| `unique: true` | `@unique` constraint |
| `static_default: "value"` | `@default("value")` |
| `isForeignKey: true, references: "OtherObject"` | `@relation(fields: [...], references: [...])` |
| `targetField: "publicId"` | FK apunta a un campo custom (no al `id` por defecto) |
| `transformations: [...]` | Normalizaciones aplicadas antes de persistir (trim, lowercase) |
| `validations: [...]` | Reglas custom (regex, longitud, email) |

## Tres formas de referenciar otra entidad

Aqui se resuelve el dilema clasico de duplicacion. **Antes de declarar una columna `facultyId` o guardar `facultyName` en tu tabla, decide el patron correcto:**

### Opcion A — FK directa (dentro del mismo scope)

Cuando el object referenciado vive en el mismo scope (mismo mod, o ambos en business/Base):

```json
{
  "title": "CaCompetency",
  "properties": {
    "caCompetencyMatrixId": {
      "type": "string",
      "isForeignKey": true,
      "references": "CaCompetencyMatrix"
    }
  }
}
```

Genera FK real en la DB. El query engine hace joins automaticamente y GraphQL expone la relacion bidireccional.

**Usar cuando**: la entidad referenciada vive junto a la tuya y evoluciona al mismo ritmo.

### Opcion B — Referencia por publicId con denormalizacion

Cuando el object referenciado vive en otro scope (ej: tu mod referencia un object tenant del core):

```json
{
  "title": "CaMatrixFaculty",
  "metadata": {
    "label": "Facultad de Matriz",
    "description": "Relacion muchos-a-muchos entre matriz de competencias y facultad"
  },
  "properties": {
    "facultyPublicId": {
      "type": "string",
      "title": "Faculty ID",
      "description": "Public ID of the associated faculty",
      "not_null": true
    },
    "facultyName": {
      "type": "string",
      "title": "Faculty Name",
      "description": "Denormalized faculty name for display",
      "not_null": true
    },
    "caCompetencyMatrixId": {
      "type": "string",
      "isForeignKey": true,
      "references": "CaCompetencyMatrix"
    }
  }
}
```

Aqui `Faculty` vive en `tenants/UPU/Base/` y `CaMatrixFaculty` en `mods/assessment-matrix/objects/`. Se usa `facultyPublicId` + `facultyName` denormalizado.

**Usar cuando**:
- Cruzas mods (evita dependencias circulares)
- La entidad referenciada evoluciona independientemente
- Quieres preservar un snapshot historico (el nombre al momento de la relacion)
- Necesitas desacoplar el ciclo de vida

**Atencion — NO es duplicacion redundante**: `facultyName` es un snapshot deliberado. Si Faculty cambia su nombre, CaMatrixFaculty mantiene el historico. Si quieres siempre el nombre actual, resuelve via query o regenera el campo denormalizado con un trigger/evento.

### Opcion C — Extender un object existente (no crear nuevo)

Cuando solo necesitas agregar campos a una entidad que ya existe en el core:

```json
// objects/business/Extended/ext__miempresa__faculty.json
{
  "title": "ext__miempresa__faculty",
  "allOf": [{ "$ref": "../Base/faculty.json" }],
  "properties": {
    "accreditationCode": { "type": "string", "unique": true },
    "accreditationExpiry": { "type": "string", "format": "date-time" }
  }
}
```

Genera una tabla separada `facultyExtended` con FK 1:1 a Faculty. Codegen las une transparentemente.

**Usar cuando**:
- Un cliente necesita campos adicionales sobre una entidad core
- No quieres contaminar Faculty.json con campos que otros tenants no usan
- Debes mantener compatibilidad cross-tenant

**No usar cuando**: los campos aplican a todos los clientes — en ese caso, agregalos al Base y punto.

## Workflow: de un sistema tradicional a UP1

Supongamos que vienes de un sistema con tablas manuales y quieres migrar a UP1. Aqui el flujo.

### Paso 1 — Inventario y clasificacion

Lista todas tus tablas. Clasifica cada una en 4 grupos:

| Grupo | Criterio | Destino en UP1 |
|-------|----------|----------------|
| **Core compartido** | Aparece en casi todos los sistemas educativos (Person, Course, Enrollment) | `objects/business/Base/` |
| **Core tenant** | Existe en todos los sistemas pero con variaciones por institucion (Faculty con codigo propio) | `objects/tenants/{TENANT}/Base/` |
| **Feature** | Funcionalidad especifica (matrices de competencia, retention, intervenciones) | `mods/{mod}/objects/` |
| **Campos extras** | Columnas extra sobre entidad que ya existe | `objects/business/Extended/ext__<cliente>__<obj>.json` |

### Paso 2 — Mapeo de tablas existentes vs objects de UP1

Antes de crear nada, busca coincidencias:

```bash
# Buscar si ya existe algo parecido
grep -ri "Person" /Users/edobacon/Workspace/uplanner/up1/object-manager/objects/
grep -ri "Faculty" /Users/edobacon/Workspace/uplanner/up1/object-manager/objects/
grep -ri "Course" /Users/edobacon/Workspace/uplanner/up1/object-manager/objects/
```

Si existe y tiene los campos que necesitas → usalo.
Si existe pero le faltan columnas → Extended object.
Si no existe → crea el JSON en la ubicacion correcta.

### Paso 3 — Traducir DDL a JSON

Tabla tradicional:

```sql
CREATE TABLE competency_matrix (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'DRAFT',
  level_scheme_id INT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,
  FOREIGN KEY (level_scheme_id) REFERENCES level_scheme(id)
);
```

JSON en UP1:

```json
{
  "title": "CaCompetencyMatrix",
  "metadata": {
    "label": "Matriz de Competencias",
    "labelPlural": "Matrices de Competencias",
    "gender": "femenino"
  },
  "properties": {
    "code": { "type": "string", "not_null": true, "unique": true },
    "name": { "type": "string", "not_null": true },
    "status": { "type": "string", "static_default": "DRAFT" },
    "caLevelSchemeId": {
      "type": "string",
      "isForeignKey": true,
      "references": "CaLevelScheme"
    },
    "description": { "type": "string" }
  },
  "required": ["code", "name"]
}
```

**Cambios clave**:
- `id`, `created_at`, `updated_at` → no los declaras, vienen de `common.json`
- FK en SQL (`FOREIGN KEY`) → `isForeignKey + references` en JSON
- Tipos SQL especificos → tipos JSON Schema (`string`, `number`, `boolean`)
- `AUTO_INCREMENT` de enteros → IDs son strings (CUID) por defecto en UP1
- Nombres de tabla `snake_case` → PascalCase en title, camelCase en properties

### Paso 4 — Migrar datos

Despues de definir los objects:

```bash
# 1. Codegen para generar Prisma schema
npm run codegen --workspace=@uplanner/object-management-backend

# 2. Generar migracion
npx prisma migrate dev --name initial_competency_matrix

# 3. Importar datos desde el sistema viejo (script custom o seed)
npm run seed --workspace=@uplanner/object-management-backend
```

## Antipatrones a evitar

### Antipatron 1: Crear un object con los mismos campos que uno existente

```
❌  Creaste MyPerson.json en mods/mi-mod/objects/ con firstName, lastName, email
✅  Usa el Person.json existente. Si necesitas un campo extra, Extended object.
```

### Antipatron 2: Duplicar columnas de auditoria

```json
// ❌ MAL
{
  "title": "MiObjeto",
  "properties": {
    "id": { "type": "string" },
    "createdAt": { "type": "string" },
    "updatedAt": { "type": "string" },
    "name": { "type": "string" }
  }
}
```

```json
// ✅ BIEN — id, createdAt, updatedAt vienen de common.json
{
  "title": "MiObjeto",
  "properties": {
    "name": { "type": "string" }
  }
}
```

### Antipatron 3: FK directa a un object de otro mod

```
❌  En mi mod A, declaro FK directa a un object del mod B:
    { "modBObjectId": { "isForeignKey": true, "references": "ModBObject" } }

Problema: crea dependencia circular entre mods y rompe el principio de modularidad.

✅  Usa referencia por publicId + denormalizacion:
    { "modBPublicId": { "type": "string", "not_null": true },
      "modBName": { "type": "string", "description": "Denormalized for display" } }
```

### Antipatron 4: Campos especificos de tenant en el Base global

```
❌  En Faculty.json (Base global) agregas campos que solo usa UPU.
    Ej: "upuAccreditationCode", "upuInternalCode".

✅  Opciones:
    - Si son para un tenant: objects/tenants/UPU/Extended/ o en el Base del tenant
    - Si son para un cliente: objects/business/Extended/ext__upu__faculty.json
```

### Antipatron 5: Columnas JSON para esquivar modelado

```
❌  Guardar { "settings": { "flag1": true, "flag2": "x", "flag3": 5, ... } } como blob JSON
    cuando hay 10 campos estructurados dentro. Evita queries por esos campos y rompe validaciones.

✅  Declarar los campos como properties si son conocidos y queryables.
    Usar JSON solo cuando la estructura es genuinamente flexible (ej: payload de eventos).
```

### Antipatron 6: Tabla junction sin campos propios

```
❌  Crear CaMatrixFaculty solo con { matrixId, facultyPublicId } para evitar M2M directo.

✅  Si no tiene campos propios ni denormalizacion, evalua si realmente necesitas la tabla.
    Pero si hay snapshot/denormalizacion (facultyName, fecha de asociacion, metadata),
    la tabla junction esta justificada. Ver CaMatrixFaculty como ejemplo.
```

## Quien consume cada cosa — trazabilidad

Cuando defines un object, queda expuesto a multiples consumidores. La trazabilidad de "quien consume X" se hace asi:

### En el backend (object-manager)

Cada object JSON genera automaticamente:
- Tabla Prisma (acceso via `prisma.myObject.findMany()`)
- Queries GraphQL: `myObject(id: "")`, `myObjects(where: {...})`
- Mutations: `createMyObject`, `updateMyObject`, `deleteMyObject`
- Types GraphQL correspondientes

**Consumidores posibles**:
- Resolvers custom del mismo mod (via Prisma)
- Resolvers de otros mods (via GraphQL API — no directo via Prisma)
- Suite (via GraphQL)

**Como saber quien consume?**
- Grep de `prisma.myObject` en `object-manager/src/`
- Grep de `myObject(` en todos los resolvers de mods (.resolver.js)
- Grep de `myObject` en layouts JSON (`objectName` attribute)

### En el frontend

Un object puede aparecer en:
- `config/app.json` de uno o mas mods (como `defaultObjects`)
- `config/layouts/*.json` de uno o mas mods (como `objectName`)
- Custom components que hagan queries GraphQL

### Regla de impacto colateral

Antes de modificar un object (ej: renombrar campo, cambiar tipo), aplica el checklist:

1. Grep del nombre del object en todos los mods
2. Grep del nombre del campo especifico
3. Revisar resolvers que lo referencien
4. Revisar layouts que lo muestren
5. Revisar migraciones que ya esten en produccion

Si el cambio rompe consumidores → crear migration path (campo nuevo + deprecar el viejo, no renombrar in-place).

## Checklist de migracion — paso a paso

Para cada tabla del sistema origen:

```
[ ] Clasifique la entidad: core compartido / core tenant / feature / extension
[ ] Busque duplicados existentes en UP1 (Base, tenants, mods)
[ ] Decidi ubicacion final del object
[ ] Traduje DDL a JSON object definition
[ ] Removi columnas de auditoria (van de common.json)
[ ] Convertir FK a isForeignKey/references o a publicId denormalizado segun corresponda
[ ] Ejecute codegen y genere migracion
[ ] Escribi seed o script de importacion de datos
[ ] Verifique en GraphQL playground que queries/mutations funcionan
[ ] Cree layouts JSON para que la entidad sea visible en la UI
[ ] Documentar el mapeo tabla-origen → object-destino
```

## Caso de ejemplo: migrar assessment de suite-front

Suite-front tiene el siguiente modelo (simplificado):

```sql
CREATE TABLE competency_matrix (id, code, name, status, level_scheme_id, description);
CREATE TABLE competency_matrix_node (id, code, name, id_parent, nmOrder, matrix_id, is_holistic);
CREATE TABLE level_scheme (id, code, name, scheme_mode);
CREATE TABLE level_scheme_level (id, scheme_id, code, name, order, weight);
CREATE TABLE level_criteria (id, level_id, code, name);
CREATE TABLE level_threshold (id, level_id, min, max, is_accomplished);
-- Faculty y Curriculum ya existen en el sistema base
CREATE TABLE competency_matrix_faculty (matrix_id, faculty_id);
CREATE TABLE competency_matrix_curriculum (matrix_id, curriculum_id);
```

### Clasificacion

| Tabla | Clasificacion | Destino | Razon |
|-------|---------------|---------|-------|
| competency_matrix | Feature | `mods/assessment-matrix/objects/CaCompetencyMatrix.json` | Es una feature especifica, no core |
| competency_matrix_node | Feature | `mods/assessment-matrix/objects/CaCompetency.json` | Ligado a la feature |
| level_scheme | Feature | `mods/assessment-matrix/objects/CaLevelScheme.json` | Parte del mismo feature set |
| level_scheme_level | Feature | `mods/assessment-matrix/objects/CaLevel.json` | Idem |
| level_criteria | Feature | `mods/assessment-matrix/objects/CaCriteria.json` | Idem |
| level_threshold | Feature | `mods/assessment-matrix/objects/CaThreshold.json` | Idem |
| Faculty, Curriculum | Core tenant | Ya existen en `tenants/UPU/Base/` | No se tocan |
| competency_matrix_faculty | Feature (junction) | `mods/assessment-matrix/objects/CaMatrixFaculty.json` | Cross-mod: mod feature → core tenant. Denormalizacion |
| competency_matrix_curriculum | Feature (junction) | `mods/assessment-matrix/objects/CaMatrixCurriculum.json` | Idem |

### Patrones aplicados

1. **Prefijo `Ca`** en todos los objects del mod para evitar colision con otros mods (ej: `Cm` para curriculum-mapping)
2. **FK internas** entre objects del mismo mod (CaCompetency → CaCompetencyMatrix, CaLevel → CaLevelScheme)
3. **Denormalizacion** en las junction cross-scope:
   - CaMatrixFaculty: `facultyPublicId + facultyName` (no FK real a Faculty)
   - CaMatrixCurriculum: `curriculumPublicId + curriculumName`
4. **Self-reference** para jerarquia en CaCompetency: `parentId` con `references: "self"`
5. **Sin columnas de auditoria declaradas** — vienen de common.json

### Lo que NO se hizo (por buena razon)

- No se duplico Faculty en el mod. Se referencia por publicId.
- No se modifico el Faculty.json del core para agregar campos de competency_matrix. Esa dependencia corre en sentido inverso.
- No se creo un common fields custom para el mod. Se uso el global.
- No se creo una mega-tabla con todos los datos de assessment. Cada concepto es su propio object.

## Resumen: los 6 principios

1. **JSON primero, SQL nunca** — edita solo los objects JSON, el sistema genera lo demas
2. **Herencia automatica** — id, createdAt, updatedAt, tenantId NO se declaran
3. **Una entidad, una ubicacion** — antes de crear, busca si ya existe
4. **FK directa solo en el mismo scope** — cruzar mods o scopes exige publicId + denormalizacion
5. **Extender antes que duplicar** — para campos custom, Extended objects antes que un object nuevo
6. **Impacto colateral obligatorio** — antes de modificar un object, grep de consumidores en backend, layouts y resolvers

---

Anterior: [03 — Construir vistas](03-construir-vistas.md)
