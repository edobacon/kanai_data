---
id: DECISION-002
project: up1
type: decision
module: curriculum-design
tags:
  - curriculum-design
  - modelo-objetos
  - foreign-key
  - postergado
---

# DECISION-002: Postergar la FK `AcademicActivity.executionUnitId → OrgUnit` en SP1

## Contexto

El [Modelo de objetos de negocio Learning Assurance](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2038366242) describe que `AcademicActivity` tiene un campo `executionUnitId` que apunta a `OrgUnit` (objeto representando la unidad organizativa que ejecuta la actividad academica, con `recordType=AcademicExecution`).

Verificacion en codebase up1 (sesion 2026-04-27): **`OrgUnit` NO existe** como objeto core ni como mod en up1. Solo existe `Institution` ([up1/object-manager/objects/business/Base/institution.json](../../../../up1/object-manager/objects/business/Base/institution.json)) que ya tiene `recordType` y `parentId` para jerarquias institucionales.

Esta decision afecta UPONE-1033 directamente (configuracion del objeto `AcademicActivity`) y UPONE-1034 (filtro por "Unidad Organizativa" en el listado).

## Drivers

1. **Bloqueo de scope**: crear `OrgUnit` en SP1 es trabajo arquitectonico transversal (no se limita a Curriculum Design — afectara otros mods curriculares).
2. **Riesgo de aceleracion**: definir `OrgUnit` en este sprint sin discusion del modelo institucional puede generar reescritura posterior.
3. **Uso real en SP1**: el filtro UO del UPONE-1034 y el FK de UPONE-1033 son puntos donde la falta de OrgUnit se siente, pero ambos pueden funcionar con un campo opcional (nullable) sin bloquear el sprint.

## Alternativas evaluadas

| Opcion | Pro | Contra |
|--------|-----|--------|
| A. Crear `OrgUnit` como objeto core nuevo | Resuelve definitivamente el modelo | Trabajo arquitectonico transversal, excede scope SP1 |
| B. Reutilizar `Institution` con `recordType=AcademicExecution` | Aprovecha objeto core existente con jerarquia (`parentId`). Casa con la convencion `recordType` de up1 | Requiere validar con quien definio el modelo si Institution puede absorber el rol de OrgUnit. La convencion del modelo dice OrgUnit, no Institution |
| **C. Postergar la FK** (elegida) | Desbloquea SP1. Permite que el equipo decida A o B con calma, sin bloquear codigo | El filtro de UPONE-1034 por "Unidad Organizativa" queda sin mecanismo concreto en SP1 — necesita workaround |

## Decision

**Postergar la FK `executionUnitId` para definicion post-SP1.** Concretamente:

1. **En `AcademicActivity.json`**:
   - Incluir el campo `executionUnitId` como **opcional/nullable** desde SP1.
   - NO declarar el FK Prisma todavia (sin `references`/`isForeignKey`).
   - Comentar en el JSON: `"description": "FK to OrgUnit — postergado, ver DECISION-002"`.

2. **En UPONE-1034 (filtro por UO)**:
   - El filtro queda **inactivo o stub** en SP1.
   - Documentar en el ticket DKC (TICKET-007) que el filtro por UO se activa cuando se resuelva la FK (post-SP1).
   - Alternativa: si el equipo decide opcion B (Institution), el filtro por UO se vuelve filtro por `Institution` con un `recordType` especifico.

3. **Levantar la decision A vs B post-SP1** con quien define el modelo (Esteban Cortes — autor de la pagina de Confluence). Pregunta concreta:
   - ¿`OrgUnit` es objeto separado o se modela como `Institution` con `recordType=AcademicExecution`?
   - ¿La jerarquia organizativa academica (facultad → departamento → programa) usa `Institution.parentId` o requiere modelo dedicado?

## Consecuencias positivas

- SP1 desbloqueado sin asumir decision arquitectonica que excede el scope.
- Cambio futuro a opcion A o B es de bajo impacto: agregar el FK en migration, seedear con valor por defecto si es necesario.
- Schema nuevo no introduce decisiones que despues haya que revertir.

## Consecuencias negativas

- El filtro "Unidad Organizativa" del UPONE-1034 no tiene comportamiento real en SP1 — se mostrara como stub/desactivado.
- La spec `programa-de-asignatura.md` debe documentar este gap explicitamente para evitar confusion.
- Cuando se resuelva la decision real, requerira un PR adicional para conectar el FK y activar el filtro.

## Confirmacion

Eduardo respondio "1 C" cuando se le presentaron las 3 opciones (sesion 2026-04-27), confirmando "se puede agregar despues, no es requerido para 1033, ni esta del todo definido el raiz".

## Plan de seguimiento

- [ ] **TICKET-007** (UPONE-1034): documentar que el filtro UO queda como stub
- [ ] **Crear ticket follow-up**: "Definir y modelar OrgUnit / unidad organizativa academica" — post-SP1, owner: Esteban Cortes
- [ ] **Confluence**: comentar en la pagina del Modelo de objetos pidiendo aclaracion sobre OrgUnit vs Institution

## Referencias

- Modelo Confluence: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2038366242
- Spec del agregado: [specs/curriculum-design/programa-de-asignatura.md](../../specs/curriculum-design/programa-de-asignatura.md)
- Institution actual: [up1/object-manager/objects/business/Base/institution.json](../../../../up1/object-manager/objects/business/Base/institution.json)
- Verificacion ausencia OrgUnit: realizada por Agent Explore en sesion 2026-04-27
