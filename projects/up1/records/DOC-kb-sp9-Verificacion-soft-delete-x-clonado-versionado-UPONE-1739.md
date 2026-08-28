---
id: DOC-kb-sp9-Verificacion-soft-delete-x-clonado-versionado-UPONE-1739
project: up1
type: doc
---

# Verificacion soft-delete x clonado/versionado (UPONE-1739)

Contexto: PR object-manager #530 (UPONE-1739) inyecta el filtro de soft-delete tambien en las
lecturas anidadas (include/select). Se verifico que ese cambio no rompe el clonado ni el versionado,
en los tres ambitos donde podia impactar. Toda la verificacion se corrio contra la base real de UPU.

## PRs bajo revision (feature coordinada, mismo autor, a develop)

- object-manager #530 (UPONE-1739): filtrar filas soft-deleted tambien en lecturas anidadas.
  Rama origin/UPONE-1739 (3222daaf). Diff: tenantManager.js + 2 tests + doc (4 archivos).
- academic-scheduling #112 (UPONE-1640): bulk unassignment de asignaciones. Rama origin/UPONE-1640-impl.
  Consumidor del fix (soft-borra ScenarioSectionAssignment).
- layout #372 (UPONE-1738): expone refreshCurrentPage. Rama origin/UPONE-1738. Sin relacion con soft-delete.

Veredicto de los PRs: #530 y #112 aprobables con observaciones (cero S0/S1/S2). #372 bloqueado por
proceso (green-light de Core, tipo 3), codigo solido. Comentarios ya posteados en los tres PRs.

## Por que #530 no impacta al clonado (traza de codigo)

1. El deep clone lee cada nivel de hijos con consulta top-level (findMany por FK), no con include/select
   anidado: deep-clone-direct.js:96, deep-clone-polymorphic.js:140,348. El filtrado top-level ya existia
   por el $extends global (pre-#530).
2. #530 solo toca el hook de lecturas anidadas (withNestedFlags en tenantManager.js). El path del clon
   no pasa por ahi y no se envuelve en runWithIncludeInactive (unico uso: instance.resolver.js:2781).
3. El diff de #530 no toca ningun archivo de clonado ni versionado (confirmado: 0 archivos de clone en el diff).

## Evidencia ejecutada (base real de UPU, rama UPONE-1739 en worktree aislado)

### 1. Unit (67/67)
softDeleteExtension + relationTargets + deep-clone-direct + deep-clone-polymorphic + prefill-from-source.
Clone helpers y filtro anidado coexisten en verde.

### 2. e2e + integracion contra BD real (23/23)
9 files: clone-activity-polymorphic, clone-direct-children, clone-plan-deep-root, clone-plan-mesh-derived,
clone-version-createinstance-full, version-asnewversion, clone-capability-invariants,
curriculum-versioning-gate, getVersionChain-field-level. Incluye el path de produccion completo:
CLONE via createInstance(prefillFrom.source) -> raiz nueva + malla clonada + categoryId remapeado;
VERSION via asNewVersion -> v2 previousVersionId=source + malla arrastrada y remapeada.

### 3. Smoke scenario (soft-delete del core, campo active) 6/6
ScenarioSectionAssignment, con el cliente extendido de la rama (tenantManager.getClient('UPU')):
- clone read (top-level) EXCLUYE la asignacion soft-borrada; INCLUYE la hermana viva.
- nested read (#530, profundidad 2) EXCLUYE la soft-borrada; INCLUYE la hermana viva.
- bypass runWithIncludeInactive RECUPERA la soft-borrada.
Estado de la BD restaurado al finalizar.

### 4. Smoke cm / curriculum-mapping (soft-delete propio del mod, campo isActive) 7/7
Invocando la funcion real del mod setLevelSchemeActive (LevelScheme "Escala de plataforma", 3 niveles):
- inactivar -> scheme.isActive=false, y arrastre D-12: los 3 niveles hijos a isActive=false.
- pickers (isActive:true) EXCLUYEN el scheme y sus niveles.
- reactivar -> scheme y niveles vuelven a isActive=true (restaurado).
cm implementa soft-delete CUSTOM (isActive + arrastre), no el declarativo del core, porque LevelScheme
es objeto RecordType y el soft-delete declarativo del core no aplica a RecordTypes
(ver mods/curriculum-mapping/docs/BUG-core-softdelete-recordtype.md, resuelto para delete-path por UPONE-1479).

## Interseccion soft-delete x registry del core (BD real UPU)

Modelos con softDeleteConfig en el core (el $extends de #530 aplica): ActivityType (isActive),
Scenario, ScenarioJob, ScenarioSection, ScenarioSectionAssignment, ScenarioTerm (todos flag active).
Objetos de cm (LevelScheme, CoverageScheme, CompetencyNode, CompetencyAlignment, RubricDescriptor):
NINGUNO en el registry -> #530 no toca ninguna lectura de cm.

## Resumen por ambito

- CD (curriculum-design): tiene clone/versionado generico; su arbol no tiene modelos con soft-delete;
  #530 lee top-level, no lo afecta. 23 e2e/integracion en verde.
- scenario (academic-scheduling): tiene soft-delete del core; NO es clonable (Scenario sin
  polymorphicChildren/directChildren). Smoke 6/6 sobre el mecanismo de lectura.
- cm (curriculum-mapping): soft-delete custom (isActive); su "Duplicar" es crear-con-prellenado
  (readSourceForClone), no el clone generico; fuera del registry del core. Smoke 7/7.

## Veredicto final (lado soft-delete + clonado + versionado)

APROBADO. No se encontro regresion. El soft-delete es viable y convive con el clonado/versionado en
los tres ambitos, probado con traza estatica + 67 unit + 23 e2e/integracion + 2 smokes (6/6 y 7/7)
contra la base real. Toda mutacion de la BD fue restaurada.

Nota operativa: coordinar el orden de merge para que #530 (UPONE-1739) entre antes o junto a #112
(UPONE-1640); hasta entonces las filas soft-borradas pueden verse en lecturas anidadas.

Metodo: verificado sobre origin/UPONE-1739 @ 3222daaf, BD real UPU (dev, localhost:5432). Guard de
kn-dredd activo durante la review. Pagina de evidencia con capturas:
https://claude.ai/code/artifact/a389f9e6-8d40-4da8-98d8-76064050a72d
