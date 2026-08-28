---
id: CAP-CUR-016
project: up1
type: doc
module: curriculum-design
status: in-spec
tags:
  - curriculum-design
  - programa-asignatura
  - capability
  - secciones
---

# CAP-CUR-016: Gestionar secciones del programa de curso

**Actores:** Coordinador de Curso | **Prioridad:** Must

## Descripcion (verbatim)

Editar el contenido de cada seccion del programa (contenidos tematicos, metodologia, bibliografia, etc.). Las secciones soportan anidamiento (ej: Unidad 1 dentro de Contenidos).

## Reglas de negocio

- Las secciones obligatorias deben tener contenido antes de avanzar en el workflow
- El anidamiento no tiene limite de profundidad

## Resultado esperado

Secciones editadas con contenido.

## Cobertura por ticket

| Ticket DKC | Ticket Jira | Cobertura |
|------------|-------------|-----------|
| TICKET-006 | [UPONE-1033](https://u-planner.atlassian.net/browse/UPONE-1033) | Modela el objeto base `CurricularSection` con campos comunes. **NO crea los RTs especificos**. |
| TICKET-009 | [UPONE-1035](https://u-planner.atlassian.net/browse/UPONE-1035) | **Crea los RecordTypes** (subset minimo Modality + LearningOutcome + Content, ver Q11) + layouts del detail con secciones editables. |

## Notas de implementacion

- Las "secciones" mapean a `CurricularSection` con distintos `recordType`. Cada RT tiene su propio formulario (resuelto via [UPONE-944](https://u-planner.atlassian.net/browse/UPONE-944) — layout por RecordType).
- "Anidamiento" se modela via campo `parentSectionId` (FK a `CurricularSection`) — pendiente de validar en SP2.
- "Secciones obligatorias" depende de [CAP-CUR-011](../../) (configuracion de estructura institucional, fuera SP2). En SP2 se modelan como flag `isRequired` con default por RT.
- Riesgo: ningun mod usa todavia layouts por RecordType. Ver [risks/layouts-recordtype-untested.md](../risks/layouts-recordtype-untested.md).

## Tipos de seccion soportados (RecordTypes a configurar)

Segun el modelo de objetos:

| RecordType | Categoria | Foco |
|-----------|-----------|------|
| LearningOutcome | Structural | RA — CAP-CUR-015 |
| EvaluationComponent | Structural | Componentes ponderados |
| Content | Structural | Contenidos tematicos (verbatim "contenidos tematicos") |
| Session | Structural | Sesiones |
| Modality | Structural | Modalidades — CAP-CUR-017 |
| ApprovalCondition | Structural | Asistencia minima, nota minima |
| Bibliography | Structural | Bibliografia (verbatim) |
| GeneralData | Structural | Metodologia (verbatim — campo libre custom institucional) |
| Custom | Complementaria | Definidas por Super Admin (CAP-CUR-013) |

## Relacionado

- [CAP-CUR-014](CAP-CUR-014.md)
- Modelo: [programa-de-asignatura.md](../programa-de-asignatura.md)
