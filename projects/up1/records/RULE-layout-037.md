---
id: RULE-layout-037
project: up1
type: rule
module: layout
tags:
  - layout
  - RecordList
  - filtros
  - query
  - motor-listas
  - 1-salto
  - availableFields
  - columns
---

# Límites del motor de listas: filtros 1 salto, query fija y filterableFields = columns

## What

El motor de listas de up1 (`RecordList.vue` + `instance.resolver.js`) tiene tres límites estructurales que no son negociables sin modificar el core:

1. **Filtros declarativos: solo relaciones to-one de 1 salto.** `instance.resolver.js:~L1291` hace `const [parentField, nestedField] = field.split('.')` — toma exactamente 2 segmentos. Un filtro de 2 saltos como `activityline.activity.recordType` falla silenciosamente (toma `activityline` como parentField y `activity` como nestedField, ignorando el tercer segmento). Filtros 1-hop como `activity.recordType` sí funcionan. Workaround: declarar un discriminador de tipo en el objeto intermedio (ej. `Offering.recordType`) o usar un custom resolver con `where` anidado Prisma.

2. **RecordList está cableado fijo a `listInstances`.** `RecordList.vue:~L1639/L3829` usa siempre la query genérica `LIST_INSTANCES`; no existe un campo en `layoutConfig` para apuntar a una query custom (`syllabusOfferings`, etc.). Si se implementa un custom resolver de lista, el frontend no tiene forma de consumirlo declarativamente desde el layout — requiere un cambio de core en `RecordList.vue`.

3. **`availableFields` del modal de filtros = `columns[]`.** `RecordList.vue:~L4655` construye `availableFields` filtrando únicamente los campos declarados en `layoutConfig.columns[]`. Para que un campo aparezca como opción de filtro en el modal, la columna DEBE declararse aunque no aporte valor visual (ej. `executionUnitId` con valor `-` mientras OrgUnit no exista). No existe `filterableFields[]` separado — requiere PR al core de layout para desacoplar. `columns[].filterable` no cambia esto en ningún sentido: `useColumnConfiguration.ts:214` solo lo copia y ningún componente lo lee, así que `filterable: false` no saca una columna del modal (verificado en UPONE-1967, ver RULE-layout-052).

## Why

Los tres límites se descubrieron en tickets distintos y en todos los casos costaron una o más iteraciones extra: (1) el filtro de 2 saltos bloqueó la lista de sílabos en TICKET-064 S2 y obligó a reabrir una decisión de diseño (DEC-LOCAL-03/04, añadiendo recordType al Offering); (2) la query fija fue el 'BLOCKER cross-layer' de TICKET-064 L6, descubierto al intentar conectar un `syllabusOfferings` custom al RecordList; (3) la vinculación columns=filterableFields obligó a agregar una columna `executionUnitId` con valor `-` en TICKET-007 S4 (aprend. L11) — sin declarar la columna el filtro simplemente no aparecía.

## Where

- `object-manager/src/graphql/resolvers/instance.resolver.js:~L1291` — `field.split('.')` (filtro 1-hop)
- `layout/src/layouts/RecordList.vue:~L1639/L3829` — hardcode a `LIST_INSTANCES` / `listInstances`
- `layout/src/layouts/RecordList.vue:~L4655` — `availableFields` construido desde `layoutConfig.columns[]`
- `layout/src/composables/useColumnConfiguration.ts:214` — `filterable` se copia y no se lee
- Config de ejemplo con workaround (1 salto via discriminador): `mods/curriculum-design/config/layouts/default_Offering_syllabus_list.json` (filtro `recordType=Syllabus`, 1 salto)
- Config de ejemplo columna-para-filtro: `mods/curriculum-design/config/layouts/default_AcademicActivity_list.json` (columna `executionUnitId`; el `filterable: true` que declara no es lo que la hace filtrable, lo es estar en `columns[]`)
- Config de ejemplo relación inversa con workaround `USER_RELATED`: `mods/uengagement-up1/config/layouts/engagement_Event_student_calendar.json:19` (`layoutConfig.filters`, `"field": "children.offering.offeringEnrollments.studentId"`, `"value": "{{USER_RELATED:Student:userId}}"`)

4. **Relación inversa: mismo límite de 2 saltos, error explícito.** Un filtro sobre una relación inversa (uno-a-muchos, ej. `children.offering.offeringEnrollments.studentId`) tiene el mismo límite estructural que la relación directa: como máximo 2 saltos. Superarlo no falla en silencio como el caso 1 — el resolver devuelve `INVALID_FILTER_FIELD`. El workaround usado en producción es el placeholder `USER_RELATED:<Objeto>:<campo>`, que resuelve el valor del lado del backend antes de armar el filtro declarativo, evitando así declarar la cadena completa de relaciones en el JSON.

## When

Al diseñar un layout de lista que requiera filtrar por un campo a más de 1 salto de relación (ej. `offer.activityLine.activity.recordType`), al intentar conectar una query custom al RecordList, al necesitar un campo filtrable que no quieres mostrar como columna, o al filtrar por una relación inversa de varios saltos. En todos estos casos, evaluar primero el workaround antes de asumir que el layout puede soportarlo nativamente:
- 2+ saltos (directa o inversa) → agregar discriminador al objeto intermedio, usar 1 salto con el discriminador, o resolver el valor del lado del backend con un placeholder como `USER_RELATED:<Objeto>:<campo>`
- Query custom → no es posible declarativamente; requiere core o restructurar para que `listInstances` lo soporte
- Filtro sin columna → declarar la columna en `columns[]` aunque muestre `-` (es lo que la vuelve filtrable; `filterable` no se lee)
- Sacar una columna del modal de filtros → no hay forma declarativa hoy; `filterable: false` no tiene efecto. Si filtrar por una FK rompe, corregir su `relationDisplayFields` (RULE-layout-052)

## Verification

1. Para filtros: verificar en `layoutConfig.filters` que el campo no requiere más de 1 punto en la ruta de relación (ej. `activity.recordType` OK, `activityLine.activity.recordType` NO). 2. Para queries custom: confirmar que `RecordList.vue` no tiene mecanismo para `customQuery` en `layoutConfig` — si el caso de uso lo requiere, escalar a core. 3. Para filterableFields: verificar que cada campo que debe aparecer en el modal de filtros está declarado en `columns[]` del layoutConfig, y no confiar en `filterable` para ocultar uno.

## Source

- **Discovered in**: TICKET-064, TICKET-007
- **Amended in**: UPONE-1967 (`filterable` no se lee; ver RULE-layout-052)
