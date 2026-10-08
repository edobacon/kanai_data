---
id: DOC-vigencia-documentos-13-11-metodo-en-el-codigo
project: up1
type: doc
module: curriculum-design
tags: [vigencia, workflow, estados, versionamiento, curriculum-design, curriculum-mapping, sp12]
source: https://claude.ai/artifact/RQyrVMBvpq7WQTQb15CHdo
---
# Parte 13: 11 · El método en el código

> Grupo: Parte técnica · Parte 13 de 17 · Líneas 1131 a 1280 del original · [Índice](../00-INDICE.md)

**Ver en HTML (mismo estilo del original):** [13-11-metodo-en-el-codigo.html](13-11-metodo-en-el-codigo.html)

## Qué dice esta parte

Un único guard de edición en el core, declarado en el JSON de cada objeto (`metadata.validity`, `editPolicy`, `changeClass` por campo), aplicado a todos los caminos de escritura y con tabla de decisión vigencia por clase de cambio. Incluye cobertura de caminos (update, create, bulk, resolvers de mods, import, MCP, delete), protección de versiones (linaje inmutable, solo desde la última, no se borra lo usado, cerrada es de solo lectura) y la query `getEditability` para que el formulario muestre qué se puede hacer por campo.

## Dónde se habló en la reunión (6 oct 2026)

01:14:17 a 01:18:34. Transcripción: `records/TRANSCRIPT-2026-10-06-modelamiento-flujo-estatus-reglas-uassessment.md`.

## Verificado contra el código (8 oct 2026)

- Confirmado: existen `runBeforeCreate` y `runBeforeUpdate` en el core (`instance.resolver.js`, tests de hooks).
- Confirmado: no hay `beforeDelete`.
- Confirmado: no existe `getEditability`.
- Confirmado: hay resolvers de mod que reescriben `updateInstance` (`curriculum-design/polymorphicUpdate.resolver.js`), por lo que 'un solo punto' requiere exportar el guard.

## Decisiones y preguntas ligadas

D6 (dónde vive el guard), D7 (ramas de versiones) y D8 (insignia por campo, a conversar con Klaus).

## Fragmento del documento (texto del artefacto)

```text
11 · El método en el código
Reglas de edición y protección de versiones, declaradas y aplicadas por el core
La vigencia dice cuándo algo está protegido. El método dice cómo el código lo hace cumplir, igual en todos los objetos y en todos los caminos de escritura. Hoy esa protección está repartida en guards de cada mod, con criterios distintos.
Un solo punto de control
Caminos de escritura
updateInstance
createInstance (hijos)
update/createBulkInstances
resolvers de mods
importInstances
tools MCP
deleteInstance · sin hook hoy
→
Guard de edición del core
Resuelve el documento: el propio registro o su dueño
Calcula su vigencia en vivo (computeValidity), sin leer la copia guardada
Lee el changeClass de cada campo tocado
Mira por qué canal llega: directo, corrección, ajuste o nueva versión
Aplica la tabla de decisión
→
Resultado
Permitido y auditado
Exige corrección FIELD_REQUIRES_CORRECTION
Exige ajuste FIELD_REQUIRES_ADJUSTMENT
Exige nueva versión FIELD_REQUIRES_NEW_VERSION
Solo lectura VERSION_CLOSED
Se declara en el JSON del objeto
// objects/Curriculum.json (propuesta)
"metadata": {
"versioning": { … ya existe … },
"validity": {
"fromField": "validFrom",
"untilField": "admissionUntil",
"dependents": [{ "object": "PlanEnrollment",
"via": "curriculumId", "where": { "status": "Active" } }]
},
"editPolicy": {
"defaultChangeClass": "structural",
"children": [
{ "object": "planEntry", "via": "planId" },
{ "object": "requirement", "via": "ownerId" },
{ "object": "CurricularSection", "via": "ownerId" },
{ "object": "CompetencyAlignment", "via": "planId" }
]
}
},
"properties": {
// solo las excepciones; lo no declarado hereda "structural"
"name": { …, "changeClass": "correctable" },
"description": { …, "changeClass": "correctable" }
// totalCredits, totalPeriods, progression: sin declarar → structural
}
// objects/planEntry.json (hijo del plan)
"metadata": {
"editPolicy": {
"ownerVia": "planId",
"operations": {
"create": { "changeClass": "structural",
"adjustableWhen": "blockId != null" },
"delete": { "changeClass": "structural",
"adjustableWhen": "blockId != null" }
}
}
},
"properties": {
"period": { …, "changeClass": "adjustable",
"changeClassRange": ["adjustable", "structural"] }
}
Sigue el patrón de metadata.versioning: el codegen valida y persiste. Fail-closed: un campo sin clase se trata como structural, así que solo se declaran las excepciones más permisivas. En la malla, agregar o quitar una asignatura electiva (blockId con valor) es ajuste; una obligatoria, reforma. La institución puede mover period dentro de su rango.
Tabla de decisión
Vigencia / clase
correctable
adjustable
structural
Sin vigencia
Directo
Directo
Directo
Programado · Vigente · En extinción
Corrección*:correct + comentario
AjusteChangeRequest
Nueva versiónasNewVersion
Cerrado
Solo lectura
Solo lectura
Solo lectura
Los hijos (malla, requisitos, secciones, tributación, árbol de la matriz) no tienen estado propio: el guard usa la vigencia del dueño.
Cobertura de los caminos de escritura
Camino | ¿Pasa hoy por los hooks del core? | Qué hace falta
updateInstance (base y RecordType) | Sí runBeforeUpdate (UPONE-1741) | Registrar el guard
createInstance de hijos | Sí runBeforeCreate | El guard resuelve el dueño y aplica su vigencia
createBulkInstances / updateBulkInstances | Sí delegan en el resolver singular | Heredan el guard
deleteInstance y borrado masivo | No no existe beforeDelete | Core agregar el hook
Resolvers propios de mods (polymorphicUpdate, planEntry-batch, competencyTree-upsert…) | No escriben con su lógica | Invocar el guard exportado por el core; un test de contrato lo exige
Carga masiva importInstances | A verificar usa validateInstanceData | Debe pasar por el guard
Tools MCP | Depende del resolver que invocan | Heredan si el resolver está cubierto
Seeds y migraciones | - | Bypass explícito y auditado
Protección de versiones
Linaje inmutableversion y previousVersionId fijosNo se editan después de crear la versión.
Sin ramasSolo desde la última versiónVERSION_NOT_LATEST. Hoy el core permite versionar desde cualquiera.
Sin borradoUsada una vez, nunca se borraSi tuvo dependientes, se cierra (PUBLISHED_VERSION_NOT_DELETABLE; precedente wasEverActive). Si se retiró sin haber sido usada, puede borrarse y queda el registro del retiro.
CerradaSolo lectura totalHijos incluidos. Queda como evidencia histórica.
HerenciaLos hijos se protegen por su dueñoDeclarado en editPolicy.children, no en cada mod.
RastroTodo cambio protegido queda registradoChangeRequest con el antes y el después, más core_DataLog.
Cómo lo ve el usuario
Una query nueva, getEditability(objectName, recordId), devuelve el modo de cada campo. RecordDetail solo muestra; no decide. Es el mismo patrón que getValidTransitions.
Plan ICI · v1 · Plan 2020Vigente desde 2020-1
Nombre Corregir
Ingenieria Civil Indutrial
Créditos totales Nueva versión
300
Malla · Cálculo II en semestre Proponer ajuste
2
Perfil de egreso Nueva versión
El ingeniero ICI diseña y gestiona sistemas productivos…
Pruebas: tests de contrato generados desde la metadata (vigencia × clase × canal) por cada objeto gobernado, más un test que falla si un resolver de mod escribe sobre un objeto gobernado sin pasar por el guard.
```
