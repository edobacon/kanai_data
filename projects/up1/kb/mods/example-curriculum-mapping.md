---
id: SPEC-mods-curriculum-mapping
project: up1
type: spec
module: mods
category: mods
fecha: 2026-08-17
ticket: UPONE-1453/1454/1458/1537/1455
tags: [curriculum-mapping, levelscheme, recordtype, composite, vueform, rbac, config-system, competencynode, matrix]
sources:
  - mods/curriculum-mapping/README.md
  - mods/curriculum-mapping/docs/INDEX.md
  - mods/curriculum-mapping/docs/PLAN-esquema-de-niveles.md
  - mods/curriculum-mapping/docs/RESUMEN-levelscheme-editor.md
  - mods/curriculum-mapping/docs/reference/levelscheme-object.md
  - mods/curriculum-mapping/docs/reference/competencynode-object.md
  - mods/curriculum-mapping/docs/guides/level-scheme-editor.md
  - mods/curriculum-mapping/docs/CONFIG-display-decimals.md
  - mods/curriculum-mapping/docs/BUG-core-harddelete-cascade-recordtype.md
  - mods/curriculum-mapping/docs/BUG-core-softdelete-recordtype.md
  - mods/curriculum-mapping/capabilities.json
  - mods/curriculum-mapping/objects/LevelScheme.json
  - mods/curriculum-mapping/objects/CompetencyNode.json
  - mods/curriculum-mapping/objects/RecordTypes/rt__Scheme__levelscheme.json
  - mods/curriculum-mapping/objects/RecordTypes/rt__Level__levelscheme.json
  - mods/curriculum-mapping/objects/RecordTypes/rt__Matrix__competencynode.json
  - mods/curriculum-mapping/objects/RecordTypes/rt__Competency__competencynode.json
  - mods/curriculum-mapping/objects/RecordTypes/rt__SubCompetency__competencynode.json
  - mods/curriculum-mapping/logic/levelScheme-upsert.resolver.js
  - mods/curriculum-mapping/logic/competencyMatrix-update.resolver.js
  - mods/curriculum-mapping/logic/helpers/resolverUtils.js
  - mods/curriculum-mapping/logic/helpers/compositeCatalog.js
  - mods/curriculum-mapping/logic/helpers/levelSchemeUniqueness.js
  - mods/curriculum-mapping/seed/_data-rbac.js
  - mods/curriculum-mapping/config/layouts/default_CompetencyNode_edit.json
  - mods/curriculum-mapping/config/layouts/default_CompetencyNode_create.json
  - mods/curriculum-mapping/config/settings.json
  - object-manager/src/graphql/resolvers/instance.resolver.js
---

# Mod curriculum-mapping (resumen evergreen)

Este documento es un resumen de orientacion. La documentacion completa y detallada vive en el propio
repo del mod, en `mods/curriculum-mapping/docs/` (indice en
[`docs/INDEX.md`](../../../../up1/mods/curriculum-mapping/docs/INDEX.md)) y se mantiene por su autor.
No se duplica contenido aca: cada seccion enlaza al doc fuente.

## 1. Que es

Mod nuevo (creado 2026-07-21, UPONE-1453) que implementa el dominio de diseno curricular por
competencias, por fases. La fase F1 (UPONE-1454/1458) cubre `LevelScheme`: el catalogo de escalas de
logro (cualitativas, cuantitativas o mixtas) con sus niveles ordenados, reusable entre matrices de
competencias.

- Vision de dominio completa (competencias, rubrica, tributacion, logro): `docs/competency-management-proposal.md`.
- Guia de creacion/scaffolding del mod: `docs/CREATE-curriculum-mapping.md`.

## 2. LevelScheme: modelo Composite RecordType

`LevelScheme` es un objeto base con discriminador `recordType`, con dos RecordTypes en la misma tabla
enlazados por `parentId` (self-tree): `rt__Scheme__levelscheme` (el esquema: `kind`, `scoreBasis`,
`scaleMin`/`scaleMax`, `isActive`, `version`) y `rt__Level__levelscheme` (cada nivel: `position`,
`weight`, `isAchieved`, `minThreshold`, `maxThreshold`, `descriptor`).

Detalle completo de campos, 11 restricciones (R1-R11) y donde se enforzan cada una (DB vs runtime):
`docs/reference/levelscheme-object.md`.

### Decision notable: string-everywhere en campos numericos

`weight`, `minThreshold`, `maxThreshold`, `scaleMin`, `scaleMax` son columnas **`string`**, no
numericas, por un workaround a un bug de plataforma (seccion 5). Detalle en
`docs/reference/levelscheme-object.md` seccion "String-everywhere".

## 3. Editor Vueform custom: LevelSchemeEditor

El dominio no se edita con el `RecordCollectionEditor` generico: usa un custom element Vueform propio
(`level-scheme-editor`, `modsComponents/LevelSchemeEditor/`), desacoplado del generico porque necesita
logica propia (herencia de umbral entre niveles, ocultar columnas segun `kind`, clonado).

Como funciona el elemento y como se testea: `docs/guides/level-scheme-editor.md`. Bitacora de
decisiones y fixes aplicados durante la construccion (DataLog, dirty-checking, rename, clon, tests):
`docs/RESUMEN-levelscheme-editor.md`. Plan maestro con las decisiones D-1..D-12: `docs/PLAN-esquema-de-niveles.md`.

## 4. Mutations gobernadas (nunca CRUD generico)

Todas las escrituras de dominio pasan por mutations `*Validated` propias del mod
(`logic/levelScheme-upsert.resolver.js`):

| Mutation | Que hace |
|----------|----------|
| `upsertLevelSchemeValidated(data: JSON!)` | Crea/actualiza el esquema completo (Scheme + Levels) en una transaccion atomica: dirty-checking de niveles (update/create/delete), rename de codes en dos fases, clon al crear (`data.prefillFrom.source`, `cloneStrategy: "prefilledModal"`) |
| `setLevelSchemeActiveValidated(id, isActive)` | Soft-delete custom: toggle de `isActive` |
| `deleteLevelSchemeValidated(id)` | Hard-delete custom FK-safe (niveles + extensiones RT antes del Scheme, transaccion), con guard `inUse` (R9) |

El registro de historial (DataLog) tambien es manual: se escribe como una entrada consolidada bajo
`historyKey = LevelScheme:{schemeId}` (el DataLog automatico del core esta apagado,
`metadata.enableDataLog: false`, porque su unificacion hijo-padre es por *owner* y los `Level` se
relacionan por `parentId`).

**Por que mutations custom y no el generico**: el generico del core no soporta soft-delete ni
hard-delete cascadeado para objetos RecordType (ver seccion 5, los 2 bugs de plataforma). El mod
resuelve ambos con logica propia.

## 5. RBAC server-side manual

El core no envuelve mutations custom de un mod con auth automatico (solo el CRUD generico trae el
chequeo via `withObjectAuth`). Como las 3 mutations arriba escriben directo por Prisma (fuera del
generico), cada una gatea explicitamente el permiso object-level antes de tocar la DB, con
`checkObjectPermissions(context, 'LevelScheme', action)` (`logic/helpers/resolverUtils.js`,
`loadCheckObjectPermissions`): `upsertLevelScheme` chequea `create` o `modify` segun venga `id`,
`setLevelSchemeActive` chequea `modify`, `deleteLevelScheme` chequea `delete`. Los
`requiredCapability` de los layouts solo ocultan botones en la UI; el enforcement real es este
chequeo server-side. Capabilities: `levelscheme:{view,create,modify,version,delete}` (sin prefijo
`mod/`, object-level; `capabilities.json`).

## 6. Config del mod: `cm.displayDecimals`

Parametro configurable por tenant (Config System del core) que controla cuantas posiciones decimales
se muestran en valores numericos read-only del mod (notas, ponderaciones, promedios). Solo afecta
despliegue: el dato persiste a precision completa, el redondeo es visual (`formatDisplayNumber`,
`toFixed`). Tenant-wide, sin `allowUserOverride`.

Guia completa (como se configura, se resuelve por tenant, y 5 limitaciones conocidas incluyendo i18n
del label y reset de overrides al versionar la definicion): `docs/CONFIG-display-decimals.md`.

## 7. Bugs de plataforma documentados por el mod

El mod destapo y documento 2 huecos del core en `object-manager/src/graphql/resolvers/instance.resolver.js`
(resolver `deleteBulkInstances`), ambos con la misma causa raiz: la rama que maneja RecordTypes hace
`return` antes de llegar a la logica que los evita.

1. **Hard-delete no cascadea `directChildren` en RecordTypes** (`docs/BUG-core-harddelete-cascade-recordtype.md`):
   el motor de cascada declarativa (`cascadeDeleteIfApplicable`) solo corre en el camino de objetos
   base; borrar un RT con hijos declarados en `metadata.directChildren` los deja huerfanos. Tambien
   afecta a `deleteImpactPreview` (consulta el modelo RT por `id`, que no existe como columna en tablas
   RT). Workaround: `deleteLevelSchemeValidated` borra los hijos explicitamente en orden FK-safe.
2. **Soft-delete declarativo (`metadata.softDelete`) no se aplica a RecordTypes** (`docs/BUG-core-softdelete-recordtype.md`):
   la rama RT nunca referencia `bulkSoftField`; declarar `softDelete` en un objeto RT no falla, pero
   tampoco tiene efecto (el borrado sigue siendo fisico). Workaround: `setLevelSchemeActiveValidated`
   togglea `isActive` directo por Prisma.

Seguimiento en DKC: reportado como TICKET-117 (modulo core, external UPONE-1479) al momento de escribir
este resumen; verificar su estado antes de asumir que sigue abierto.

## 8. CompetencyNode: modelo de la Matriz de competencias (UPONE-1537)

`CompetencyNode` es un objeto base con discriminador `recordType` y 3 RecordTypes: `rt__Matrix__competencynode`, `rt__Competency__competencynode` y `rt__SubCompetency__competencynode`. Modela la matriz de competencias con ejes de evaluacion y agregacion configurables, y una maquina de estados de revision/publicacion.

**Ejes por matriz** (`objects/RecordTypes/rt__Matrix__competencynode.json`): cada matriz declara `levelSchemeId` (FK a `LevelScheme`, la escala de logro: unica para toda la matriz, sin excepcion por competencia, porque es lo que hace los logros comparables entre si), `matrixType` (enum de 5 valores: `Generic`, `Transversal`, `Specific`, `Professional`, `International`) y politicas por eje que dicen si el valor de evaluacion/agregacion es una preseleccion que cada competencia puede sobreescribir o una regla fija para toda la matriz.

**Causa raiz de un detalle de modelo, historica**: el campo `status` de la maquina de estados no pudo vivir en el objeto base `CompetencyNode`, porque el selector de transiciones no resolvia el alias del RecordType contra el objeto base; quedo declarado en la tabla satelite `rt__Matrix__competencynode` (`objects/RecordTypes/rt__Matrix__competencynode.json:91`). Ese bug de core ya se corrigio despues, en UPONE-1566 (`object-manager`, "enum transitions on RecordType screens"), asi que el motivo de la ubicacion actual de `status` es historico, no una restriccion vigente.

Ver [RULE-mods-069](../../rules/mods/RULE-mods-069.md): para habilitar capabilities de CAMPO sobre un RecordType (aqui, las transiciones de estado con `requiredCapabilities` propias por arista: `competencynode:approve`, `:publish`, `:deprecate`, `:archive`, `:revert`), la mutation debe gatear contra el ALIAS del RT (`competencyMatrix-update.resolver.js:95-102`, `checkPermission(context, MATRIX_ALIAS, 'modify')`), no contra el objeto base: el `authChecker` del core solo evalua el prefijo de capability de campo de un RT cuando la mutation se gatea con el alias.

## 9. Catalogos gobernados con motor comun (UPONE-1455)

Ver [DECISION-033](../../decisions/DECISION-033-common-catalog-engine.md). `LevelScheme` (seccion 2) y el nuevo `CoverageScheme` comparten el mismo tipo de escritura gobernada (renombre de codigos en dos fases, dirty-checking hijo por hijo, registro consolidado de auditoria, cascada de `isActive`), asi que se extrajo un motor comun **`createCatalogEngine`** (`logic/helpers/compositeCatalog.js`). Cada catalogo especifico es un cliente delgado del motor; del lado del front, el editor de grilla generico (`RecordCollectionEditor`) se reusa entre `LevelSchemeEditor` y el editor de `CoverageScheme`.

**Fix incluido en el motor** ([BUG-mods-026](../../bugs/mods/bug-mods-026.md)): inactivar un `LevelScheme` o `CoverageScheme` no propagaba `isActive: false` a sus niveles hijos, dejando datos incoherentes (niveles "vigentes" bajo un esquema retirado). `setChildrenActive` (`logic/helpers/compositeCatalog.js:163-183`) corrige esto con un `updateMany` dentro de la misma transaccion que actualiza el padre.

**Unicidad case-insensitive** ([BUG-mods-025](../../bugs/mods/bug-mods-025.md)): la unicidad de `code` en los tres objetos del mod (`LevelScheme`, `CoverageScheme`, la matriz de competencias) era case-sensitive y permitia duplicados por casing. `comparableCode` (`logic/helpers/levelSchemeUniqueness.js:61-64`) pliega a minusculas solo para comparar; `hasConflictingCode` usa `mode: 'insensitive'` en la query Prisma.

**Capability de CAMPO en vez de objeto completo** (UPONE-1454, ver [RULE-mods-070](../../rules/mods/RULE-mods-070.md)): la columna "Usuario" del tab de Historial (`core_DataLog.userId`, un `Int` sin relacion a `core_User`) se resuelve con una query lateral del front hacia `core_User`. La capability otorgada es de CAMPO especifico (`core_user.name:view`, `seed/_data-rbac.js:74-92`), no la del objeto completo, porque esta ultima expondria via `listInstances` el email, telefono, programa, cohorte y `clerkUserId` de todos los usuarios del tenant.

## 10. Estado real del refinamiento SP9 de la matriz de competencias

**El refinamiento de SP9 de la matriz de competencias NO esta implementado**, verificado por lectura directa de `objects/RecordTypes/rt__Matrix__competencynode.json` y `config/layouts/` al 2026-08-17:

- `matrixType` sigue con **5 valores** en el enum (`Generic`, `Transversal`, `Specific`, `Professional`, `International`), no 4.
- El formulario de creacion/edicion (`config/layouts/default_CompetencyNode_create.json`, `default_CompetencyNode_edit.json`) es `layoutType: "RecordDetail"` con un `layoutConfig.schema` plano: no hay estructura de tabs ni pestanas de informacion general, alcance o competencias.
- **No existe** ningun objeto ni RecordType de "adopcion de matriz" (`matrix adoption`) en el mod: no aparece en `objects/` ni en `config/layouts/`.
- **No hay** ninguna validacion de suma de pesos igual a 100% en el codigo del mod (sin coincidencias para logica de suma/total de `weight` en `logic/`).

Este doc no consagra ese diseno como hecho: si SP9 se implementa, esta seccion se actualiza contra el codigo real en ese momento.

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-08-03 | Documento inicial: resumen evergreen del mod nuevo curriculum-mapping (F1, LevelScheme), con enlaces a la documentacion exhaustiva propia del repo |
| 2026-08-17 | Actualizacion: modelo `CompetencyNode` de la Matriz de competencias con 3 RecordTypes, ejes configurables y maquina de estados (UPONE-1537); catalogos gobernados con motor comun `createCatalogEngine` mas cascada de `isActive` y unicidad case-insensitive (UPONE-1455); capability de CAMPO para la columna Usuario del historial (UPONE-1454); RBAC por alias de RecordType para capabilities de campo; verificacion explicita de que el refinamiento SP9 de la matriz (4 tipos, formulario con tabs, adopcion de matriz, validacion de suma de pesos) NO esta implementado en el codigo actual |
