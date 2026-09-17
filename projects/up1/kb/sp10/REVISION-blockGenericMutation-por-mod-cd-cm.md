---
id: DOC-kb-sp10-REVISION-blockGenericMutation-por-mod-cd-cm
project: up1
type: doc
module: mcp
tags:
  - sp10
  - mcp
  - blockGenericMutation
  - UPONE-1758
  - curriculum-design
  - curriculum-mapping
  - revision
  - por-mod
---

# Revision blockGenericMutation por mod (cd + cm): que hace bien, que falta, quien resuelve

Revision por mod del tema blockGenericMutation acotada a los mods propios (curriculum-design, curriculum-mapping). Complementa PLAN/ANALISIS-impacto/ANALISIS-testing-1758/VEREDICTO. Verificado contra codigo real (auditorias por mod, con file:line).

## 1. Que hace el MCP hoy (mainline, sin la rama 1758)

No bloquea nada. up1_create_object/up1_update_object ejecutan createInstance/updateInstance genericas y up1_delete_object llama deleteInstance, las tres incondicionales, registradas fuera del gate de mods (mcp-server.js:426 vs :251). `objects`/`notExposed` de un pack son decorativos (alimentan buildModsDoc, no frenan escritura). Cualquier objeto gobernado de cualquier mod es escribible por el generico. La rama origin/UPONE-1758 tiene el motor que lo cierra (embudo en up1.write(), canonicalizacion de alias rt__/ext__, gate de completitud), sin mergear y sin declaraciones de mod pusheadas.

## 2. curriculum-design (cd)

### Bien
Un unico override por mutation (sectionValidation create, polymorphicUpdate update, requirementCategoryDelete delete), validate-then-delegate. El guard vive DENTRO del resolver que expone el backend, asi que protege cross-client (web, GraphQL, API, MCP pasan por el mismo chequeo). 11 de 13 objetos N0 (overrides o @@unique de DB). Disciplina documentada de recableo cuando un refactor deja un objeto sin guard.

### Mal / incompleto (dos huecos N1 reales)
- **activity CREATE**: el guard de publicacion (suma de pesos I1) solo corre en UPDATE->Active (polymorphicUpdate.resolver.js:439-456). up1_create_object('Activity', {status:'Active', arbol invalido}) crea publicado sin pasar por el chequeo; Activity no aparece en el dispatch de create de sectionValidation.resolver.js.
- **Offering CREATE**: "solo recordType=Course" + unicidad de code por (activityLineId, termId) viven solo en createSyllabusOffering (syllabus-offering.resolver.js:127-189); el generico las saltea entero. Sin objectType==='Offering' en el override de create.
- Menores: CurricularLink e InstructionalComponentType sin reglas conocidas pero sin confirmar; docs (server-side-integrity.md, mcp-object-contract.md) desactualizados 2026-06-19, no reflejan 4 familias nuevas ni estos huecos.

### Falta revisar
Confirmar con PO si el CREATE generico de Offering y de Activity publicado debe bloquearse o corregirse; y si CurricularLink/InstructionalComponentType tienen reglas pendientes.

### Propuesta cd: TRABAJO DEL MOD, no del MCP
cd posee el slot de override y tiene la maquinaria. Escalar las dos reglas al resolver (N0, cross-client): guard de Offering al dispatch de create, y forzar/validar status en el create de Activity. No taparlo con blockGenericMutation del MCP: seria mas debil (solo MCP) y redundante. Con eso cd queda opt-out del esquema de gobernanza del MCP legitimamente (todo N0).

## 3. curriculum-mapping (cm)

### Bien
Analisis riguroso: mapea objetos gobernados por objeto (G-5), documenta el bypass (G-1), y ya resolvio el unico caso expresable en DB con @@unique [matrixId, code] (M-9), que si es cross-client. Concluyo correctamente que el mod NO puede auto-protegerse (G-2), tras intentarlo y revertirlo (commit 7972381 escrito, 068ec91 revertido 2026-09-10).

### Mal / incompleto (no por culpa suya)
- No puede proteger por resolver: Mutation.createInstance tiene un solo dueño (Object.assign, gana el ultimo alfabetico); cd ocupa el slot y carga antes, un override de cm lo mataria sin error.
- Contradiccion interna: CLAUDE.md G-5 dice CompetencyAlignment "no gobernado", pero el arbol actual (UPONE-1756, mergeado despues) SI implementa su mutation gobernada con REQ-01/R-1..R-5. Hoy CompetencyAlignment ES gobernado y debe entrar en cualquier lista.
- El pack hoy lista solo 3 de 10 objetos en su allowlist; los 7 satelites (rubricas, adopcion, tablas puente, alignment) quedan fuera.

### Los 10 objetos de cm
CompetencyNode (Matrix = matriz raiz; Competency/SubCompetency = arbol), PerformanceScale, DevelopmentLevel, RubricDimension, RubricDescriptor, MatrixAdoption, CompetencyNodeOwnerUnit, CompetencyNodeScopeUnit, CompetencyNodeDevelopmentLevel, CompetencyAlignment. Invariantes en competencyMatrix-create/update (RM1-RM14), competencyTree-upsert (RT1-RT12), performanceScale-upsert (D-4/D-5), developmentLevel-upsert (RC1-RC6), matrixAdoption (RA-1..RA-13), competencyAlignment (REQ-01/R-1..R-5/R-10). El generico los saltea todos hoy.

### Cobertura de la propuesta vs el analisis de cm
- Vector agente/MCP sobre objetos gobernados: CUBIERTO (para los que se declaren).
- Cubrir los 10 y no solo la matriz (G-5): cubierto SOLO si governedObjects incluye los 10; el gate de completitud del MCP (validate-governed-objects.js) lo FUERZA (si el pack declara postura, debe declarar todos sus objetos propios). El gate previene el hueco de satelites.
- Bypass cross-client (CRUD generico de la Suite + API/GraphQL directa): NO cubierto. El bloqueo vive en el proceso MCP; las otras dos puertas quedan abiertas. Solo la unicidad de codigo quedo cross-client (por @@unique); el resto (pesos, transiciones, RA/RC/REQ) sin defensa salvo RBAC ("riesgo asumido").
- Cierre integral: Core Extension (lista de interceptores componibles en los 3 campos del core), ya redactado como ticket en G-2. La propuesta MCP no lo reemplaza.

Veredicto cm: la propuesta cubre bien lo unico que cm puede cerrar hoy (vector MCP) y el gate la obliga a cubrir los 10, pero deja fuera dos de las tres puertas, que es lo que cm mismo marco como fuera del alcance del mod y pendiente de Core Extension.

### Falta revisar en cm
Actualizar la nota G-5 (CompetencyAlignment ya gobernado); declarar los 10 (no 3); pushear (hoy no esta en ninguna rama).

### Propuesta cm: MOD + MCP + CORE
- Mod (chico): declarar governedObjects de los 10, corregir la nota stale, pushear.
- MCP: el bloqueo ES la palanca correcta para cm (no puede hacer resolver). Cubre el vector agente.
- Core: el hook componible es lo que cm necesita para paridad cross-client con cd.

## 4. Interaccion entre mods

cd <-> cm (el eje): el slot de override es de un solo dueño y cd lo ocupa; eso empuja a cm fuera del resolver hacia el bloqueo MCP. No es problema de cm, es limitacion del core. El Core Extension (lista de interceptores) resuelve la raiz para ambos: dejaria a cd y cm registrar guards que se componen en vez de pisarse; libera a cd de ser el unico dueño y vuelve sus overrides componibles.

cd <-> as, cm <-> as: sin objetos compartidos. as solo entra por el choque de as_set_rule_value con la rama MCP (tema aparte, mod ajeno).

## 5. Sintesis: quien resuelve que

- activity-CREATE y Offering N1 (cd) -> cd, resolver override (fuerte, cross-client).
- Escritura generica de los 10 objetos de cm por MCP -> cm declara + MCP bloquea (MCP: unica palanca de cm hoy).
- Que cm no declare solo 3 y olvide 7 satelites -> MCP, gate de completitud del sync.
- Bypass cross-client de cm (Suite + API directa) -> Core, Core Extension (interceptores componibles).
- Slot de override de un solo dueño (limita a cm, ata a cd) -> Core, mismo Core Extension.
- as_set_rule_value roto por el cambio -> as (ajeno), migrar a up1.write.

En una linea: cd debe cerrar sus dos huecos en su propio resolver (puede y debe); cm debe declarar sus 10 y apoyarse en el MCP porque es lo unico que tiene, pero su cierre real es el Core Extension, que ademas destraba la limitacion que hoy ata a cd al slot unico.
