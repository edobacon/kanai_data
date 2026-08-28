---
id: BUG-platform-015
project: up1
type: bug
module: platform
tags:
  - core
  - platform
  - codegen
  - recordtypes
  - enum
  - graphql
  - blocker-mod
---

# RT enum fields lose enumValues during codegen — getObjectFields retorna enumValues=null para todo campo enum de RecordType

## Symptom

Cualquier formulario de edicion que renderice un campo declarado con enum en un JSON de RecordType (path mods/<mod>/objects/RecordTypes/rt__X__Y.json) muestra el select sin options. La UI de Vueform recibe enumValues=null desde el resolver getObjectFields. Tambien afecta a los baseFields heredados del baseObject cuando se consulta el RT directamente — el mismo campo retorna enumValues correcto cuando se consulta el baseObject por nombre y null cuando se consulta el rt__X__Y por nombre.

## Expected behavior

getObjectFields debe retornar enumValues correctamente poblado tanto para los baseFields heredados al RT como para los customFields propios del RT. Comportamiento simetrico con el path de baseFields del baseObject (que SI funciona).

## Root cause

Drift en object-manager/src/services/codegen/generatePrismaSchema.js: existen 3 paths que crean core_FieldDefinition con properties JSON. El path baseFields del baseObject (linea 2154-2157) copia AMBAS keys 'enum' y 'enumValues'. Pero el path baseFields heredados al RT (linea 2361) y el path customFields del RT (linea 2432) solo copian 'enum', NO copian 'enumValues'. El resolver getObjectFields (objectDefinition.resolver.js linea 247/269) lee desde fd.properties.enumValues, asi que retorna null cuando solo existe 'enum'.

## Impact

Afecta a TODO mod que declare enum en archivos rt__*.json. Hoy curriculum-design tiene 5 campos enum en RTs todos rotos (Bibliography.referenceType, Content.contentType, CustomSection.contentType, LearningOutcome.bloomLevel, Modality.deliveryMode). Tambien afecta los baseFields heredados cuando se consulta el RT directamente (ej. CurricularSection.ownerType retorna OK desde el base pero null desde rt__Modality__curricularsection). Cualquier mod futuro con RTs y enums sufrira lo mismo. Total estimado mas alla de curriculum-design: bajo hoy (otros mods no tienen RTs con enum hoy) pero alto a futuro al crecer la suite de mods.

## Reproduction

1. Asegurarse de que el mod tiene sync corrido y los RTs estan en business/RecordTypes/ del core.
2. Query GraphQL al backend om (puerto 4000) con header X-Tenant-ID: UPU:
   query { getObjectFields(name: "rt__Modality__curricularsection") { customFields { name enumValues } } }
3. Verificar que deliveryMode retorna enumValues: null.
4. Comparar con: query { getObjectFields(name: "CurricularSection") { baseFields { name enumValues } } }
5. Verificar que ownerType y sectionType retornan enumValues poblado (CurricularSection es Base, va por path 1 que funciona).
6. Inspeccionar BD: SELECT properties FROM core_FieldDefinition WHERE objectDefinitionId = (select id from core_ObjectDefinition where name='rt__Modality__curricularsection'). Confirmar que properties solo tiene 'enum' y NO tiene 'enumValues'.

Fix sugerido (3 lineas en cada path, en object-manager/src/services/codegen/generatePrismaSchema.js):

Path 2 (linea 2361 — baseFields heredados al RT):
- if (fieldSchema.enum) fieldProps.enum = fieldSchema.enum;
+ if (fieldSchema.enum) {
+   fieldProps.enum = fieldSchema.enum;
+   fieldProps.enumValues = fieldSchema.enum;
+ }

Path 3 (linea 2432 — customFields del RT): identico cambio.

Validacion post-fix:
1. Correr `npm run sync --workspace=@uplanner/object-management-backend` (o sync completo) para regenerar BD core_FieldDefinition con enumValues poblado.
2. Re-correr la query GraphQL del paso 2 — deliveryMode debe retornar enumValues: ['InPerson', 'Virtual', 'Hybrid', 'Synchronous', 'Asynchronous'].
3. Smoke manual de los 5 selects de curriculum-design afectados: Modality.deliveryMode, LearningOutcome.bloomLevel, Bibliography.referenceType, Content.contentType, CustomSection.contentType muestran options con labels i18n.

Nota sobre persistencia: el bug fue introducido en algun commit pasado. Los core_FieldDefinition.properties ya estan en BD sin enumValues. Despues del fix, el codegen actualizara los properties con `{ ...existing.properties, ...fieldProps }` (linea 2398) — al merge con el spread, los enumValues nuevos se agregaran sin perder propiedades existentes. NO requiere migracion manual ni borrar registros existentes.

## Workaround

No hay workaround sano desde el mod. Opciones consideradas y descartadas:
- Modificar el JSON del RT para no usar enum — perderia la validacion semantica + la i18n labels existentes
- Crear resolver custom en el mod que envuelva getObjectFields y reinyecte enumValues leyendo el JSON — complejo y fragil, contradice diseño schema-driven
- Mutar BD post-sync para reescribir core_FieldDefinition.properties — hack manual, no escala

Workaround temporal aceptable para usuarios finales: ninguno — los campos quedan como select vacio.

## Solution

Pendiente.

## Related

- **Specs**: SPEC-curriculum-design-001-selects-options-fix
- **Tickets**: TICKET-015
