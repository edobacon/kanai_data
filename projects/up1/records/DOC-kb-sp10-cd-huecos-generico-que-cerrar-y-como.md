---
id: DOC-kb-sp10-cd-huecos-generico-que-cerrar-y-como
project: up1
type: doc
module: curriculum-design
tags:
  - sp10
  - curriculum-design
  - blockGenericMutation
  - N1
  - huecos
  - activity
  - offering
  - server-side
---

# curriculum-design: huecos del CRUD generico a cerrar y como

Detectado durante la revision de blockGenericMutation (ver REVISION-blockGenericMutation-por-mod-cd-cm). Doc acotado a cd: que debe cerrar y como. Son huecos N1 PROPIOS de cd, independientes de la rama UPONE-1758: existen hoy en mainline, cualquier cliente del CRUD generico (MCP, Suite, API directa) los explota.

## Decision de diseño (fijada)

Se resuelve TODO en codigo, en el resolver del mod. NO se toca el modelo de datos (sin migraciones, sin constraints nuevas de Postgres). El cierre vive en los overrides del CRUD generico que cd ya tiene, que es donde cd protege el resto de sus objetos. Como esos overrides corren dentro de createInstance/updateInstance del object-manager, cubren TODAS las puertas GraphQL (MCP, Suite, API directa); solo un acceso SQL/Prisma crudo quedaria fuera, y eso no es un vector de cliente. Nivel de proteccion identico al que cd ya da a sus otros objetos N0.

## Contexto

cd protege sus objetos con un unico override por mutation generica (sectionValidation create, polymorphicUpdate update, requirementCategoryDelete delete), patron validate-then-delegate. 11 de 13 objetos son N0. La auditoria encontro 2 objetos donde la regla quedo SOLO en una mutation de dominio separada y el create generico la saltea. cd es el mod que puede y debe cerrarlos en su resolver (posee el slot de override), no con un bloqueo del MCP.

## Hueco 1: activity en CREATE (publicacion sin validar)

**Que es.** El guard de publicacion de Activity (I1, suma de pesos del arbol == esperado) corre SOLO en updateInstance cuando la transicion es a status Active (assertActivityEvaluationsOnPublish, polymorphicUpdate.resolver.js:439-456, disparado por data.status === 'Active'). El create no dispatcha ningun objectType === 'Activity' en validateSectionCreate. objects/activity.json:134-140 declara status con static_default 'Draft' y not_null false, sin restringir el valor en create.

**Impacto.** up1_create_object('Activity', { status: 'Active', ...arbol invalido }) crea una Activity ya publicada sin pasar jamas por el chequeo I1.

**Como cerrarlo (en codigo, resolver).** Forzar status a 'Draft' en el create dentro del override sectionValidation.resolver.js (una Activity nace siempre en Draft; publicar es siempre una transicion via update, donde el guard ya vive). No toca el schema: es logica en el resolver, no un cambio de campo en objects/activity.json. Consistente con RM5 de cm ("nace en Draft, no negociable"). Alternativa equivalente en codigo: dispatch objectType === 'Activity' en validateSectionCreate que, si status === 'Active', corra assertActivityEvaluationsOnPublish; se prefiere forzar Draft por ser mas simple y cerrar el vector de raiz. Esfuerzo trivial. Reversible.

## Hueco 2: Offering en CREATE (recordType y unicidad de code)

**Que es.** Las reglas de Offering (Syllabus) - "activityId debe ser Activity.recordType === 'Course'" y "code unico scoped por (activityLineId, termId)" - viven SOLO en createSyllabusOffering (syllabus-offering.resolver.js:127-189; recordType en :157-161, duplicado en :166-175). objects/Offering.json NO declara @@unique para code. sectionValidation.resolver.js no tiene ningun objectType === 'Offering' en el create.

**Impacto.** up1_create_object('Offering', { activityId: <Service>, code: 'X', recordType: 'Syllabus', ... }) saltea completo el chequeo de recordType=Course y el de duplicado de code.

**Como cerrarlo (en codigo, resolver).** Extraer los dos checks (recordType=Course y unicidad de code scoped por (activityLineId, termId)) a un helper puro que hoy consuma createSyllabusOffering, y llamar ese mismo helper desde un dispatch objectType === 'Offering' en validateSectionCreate. Una sola fuente de verdad, sin duplicar la regla, sin tocar el modelo de datos. La unicidad de code se sigue chequeando por consulta en el resolver (lookup del par antes de crear), no por constraint de DB - decision explicita del equipo: no afectar el schema. Cubre todas las puertas GraphQL porque el override vive en createInstance. Esfuerzo menor. Reversible.

Nota de alcance del trade-off: al no subir la unicidad a la DB, un INSERT por SQL/Prisma crudo (fuera de GraphQL) no la respetaria. Se asume: no es un vector de cliente y cd ya opera asi para el resto de sus reglas de resolver.

## Menores a confirmar

- CurricularLink e InstructionalComponentType: sin reglas de negocio conocidas mas alla de FK/enum. No necesariamente un hueco, pero nadie confirmo si deberian tener alguna (ej. anti-duplicado de CurricularLink mismo par+tipo). Revisar con PO.
- Docs desactualizados: server-side-integrity.md y mcp-object-contract.md (2026-06-19) no reflejan 4 familias de reglas nuevas (requirementCategory UPONE-1345, requirement 1352/1378, activity-revert-dependents 1381, planEntry 1757) ni advierten los huecos de Offering/activity-create. Actualizar al cerrar.

## Decision de cd frente al esquema de gobernanza del MCP

Con estos dos huecos cerrados en el resolver, los 13 objetos de cd quedan N0. cd puede quedarse OPT-OUT del esquema governedObjects del MCP legitimamente: no necesita blockGenericMutation porque sus reglas ya corren en el generico para todos los clientes GraphQL. El cierre correcto es en el resolver, no en el bloqueo del MCP. Si se quisiera opt-in (defensa en profundidad, mejor mensaje de negocio), el gate de completitud obliga a clasificar los 13 objetos, costo que solo vale si el equipo lo prioriza.

## Resumen accionable

1. activity CREATE: forzar status Draft en el create override. En codigo, sin tocar schema. Trivial.
2. Offering CREATE: extraer helper compartido de recordType=Course + unicidad de code (lookup en resolver) y engancharlo en el create override. En codigo, sin tocar schema. Menor.
3. Confirmar con PO CurricularLink/InstructionalComponentType.
4. Actualizar docs de integridad al cerrar.
5. cd queda opt-out del esquema MCP una vez cerrados 1 y 2.
