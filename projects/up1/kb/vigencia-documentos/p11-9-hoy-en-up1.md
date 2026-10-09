---
id: DOC-kb-vigencia-documentos-p11-9-hoy-en-up1
project: up1
type: doc
module: curriculum-design
tags:
  - vigencia
  - workflow
  - estados
  - versionamiento
  - sp12
---

# Vigencia 11: 9 Cómo funciona hoy en uP1

> Grupo: Parte técnica · Parte 11 de 17 · Líneas 1010 a 1060 del original · [Índice](00-indice.md)

**Ver en HTML (mismo estilo del original):** [p11-9-hoy-en-up1.html](p11-9-hoy-en-up1.html)

## Qué dice esta parte

Diagnóstico del estado actual: `Curriculum.status`, `Activity.status` y `rt__Matrix__competencynode.status` comparten el enum y `Active` significa a la vez aprobado y operando. Lista qué bloquea y qué deja libre hoy un plan Active con estudiantes (bloquea lo menor y deja libre lo sensible) y que cada guard usa su propia lista de estados. Muestra el bug de versionado: tras `asNewVersion`, v1 y v2 quedan Active con `isCurrent=true`.

## Dónde se habló en la reunión (6 oct 2026)

00:08:15 a 00:10:37. Transcripción: `TRANSCRIPT-2026-10-06-modelamiento-flujo-estatus-reglas-uassessment` (records).

## Verificado contra el código (8 oct 2026)

- Confirmado: los guards `planEntryPlanStatusGuard.js` (`PLAN_ENTRY_PLAN_NOT_DRAFT`), `requirementActivityGuard` y `alignmentRules.js` existen en `object-manager/src/graphql/resolvers/mods/`.
- Confirmado: `Activity.isCurrent` existe (`activity.json:198`).
- No se reprodujo el bug de dos versiones Active ni los casos 'Libre' en un tenant. Relacionado en Jira: UPONE-1340 (gestión de la versión actual, Backlog).

## Decisiones y preguntas ligadas

Ninguna propia; justifica la propuesta.

## Fragmento del documento (texto del artefacto)

```text
9 · Cómo funciona hoy en uP1
Un solo campo con dos significados
Punto de partida de la implementación. Curriculum.status, Activity.status y rt__Matrix__competencynode.status comparten el mismo enum. Active significa a la vez "terminó la aprobación" y "está operando".
status (un solo campo)
ciclo de aprobación: Draft · InReview · Approved
ciclo de operación: Active · Deprecated · Archived
Plan ICI v1 en Active, con estudiantes cursándolo: qué deja hacer hoy
Bloqueado: Mover Cálculo II de semestre (planEntry.period · PLAN_ENTRY_PLAN_NOT_DRAFT · sin vía de cambio)
Libre: Reescribir el perfil de egreso (CurricularSection GraduationProfile · ningún guard)
Bloqueado: Cambiar un prerrequisito (requirement · REQUIREMENT_ACTIVITY_LOCKED_BY_ACTIVE_PLAN)
Libre: Bajar créditos de 300 a 280 (rt__Plan__curriculum.totalCredits · ningún guard)
Bloqueado: Ajustar la tributación (CompetencyAlignment · COMPETENCYALIGNMENT_PLAN_LOCKED)
Libre: Cambiar RA y ponderaciones de un programa publicado (CurricularSection LearningOutcome / EvaluationComponent.weight)
Libre: Borrar una competencia de una matriz vigente ("Nothing on the server refuses those edits today" · curriculum-mapping/ai/index.js:399)
Libre: Cualquier cosa por edición masiva (updateBulkInstances no pasa por los guards de los mods)
Se bloquea lo menor y queda libre lo más sensible. Además, cada guard usa su propia lista de estados editables: la malla solo Draft; la tributación Draft, InReview, Approved; los requisitos bloquean solo con Active.
Al versionar el programa de asignatura
CAL101 Cálculo I · v1: status Active · isCurrent true · planEntry.activityId apunta aquí
asNewVersion →
CAL101 Cálculo I · v2: status Draft → Active · isCurrent true (heredado) · previousVersionId v1
Las dos quedan Active e isCurrent=true. Nada depreca la v1, el selector de malla muestra ambas y las mallas siguen apuntando a la v1.
```
