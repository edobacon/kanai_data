---
id: CAP-CUR-015
project: up1
type: spec
module: curriculum-design
status: in-spec
priority: must
actors: [coordinador-curso]
external_refs:
  - UPONE-1033
related: [CAP-CUR-014]
business_rules: []
sources:
  - https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1989148681
tags: [curriculum-design, programa-asignatura, capability, learning-outcome]
---

# CAP-CUR-015: Definir resultados de aprendizaje del curso

**Actores:** Coordinador de Curso | **Prioridad:** Must

## Descripcion (verbatim)

Declarar los resultados de aprendizaje del curso: que sera capaz de hacer el estudiante al completarlo. Cada resultado tiene un codigo identificador, nombre y descripcion.

## Reglas de negocio

- El codigo debe ser unico dentro del programa de curso (ej: RA-01, RA-02)
- Al menos un resultado de aprendizaje es requerido antes de avanzar en el workflow

## Resultado esperado

Resultados de aprendizaje definidos y asociados al programa.

## Cobertura por ticket

| Ticket DKC | Ticket Jira | Cobertura |
|------------|-------------|-----------|
| TICKET-006 | [UPONE-1033](https://u-planner.atlassian.net/browse/UPONE-1033) | Modela el objeto base `CurricularSection` (campos comunes). **NO declara el RT `LearningOutcome`**. |
| TICKET-009 | [UPONE-1035](https://u-planner.atlassian.net/browse/UPONE-1035) | **Declara el RT `LearningOutcome`** (`rt__LearningOutcome__curricularsection.json`) con campos `code`, `bloomLevel`, `isRequiredInAllSections`. Carga seed Univalle/AIEP. |

> **Importante**: en TICKET-006 NO se cargan campos especificos como `bloomLevel` — solo campos comunes de CurricularSection.

## Notas de implementacion

- Mapea al RecordType `LearningOutcome` de `CurricularSection`.
- Campos: `code` (unique scope `ownerId`), `name`, `description`, `bloomLevel` (opcional, segun [BR-TAX-002](../business-rules/BR-TAX-002.md) sobre Bloom revisada), `isRequiredInAllSections`.
- Validacion "al menos un RA requerido" se aplica al transicionar workflow (ver [BR-WKF-001](../business-rules/BR-WKF-001.md), CAP-CUR-019).
- En SP2: declarar el RecordType y permitir CRUD basico. Validacion bloqueante de workflow puede quedar para sprint donde se implemente CAP-CUR-019.

## Relacionado

- [CAP-CUR-014](CAP-CUR-014.md)
- Bloom (BR-TAX-002): codificacion opcional Anderson-Krathwohl 2001 — 6 niveles cognitivos (Recordar, Comprender, Aplicar, Analizar, Evaluar, Crear)
- [BR-LIB-003](../business-rules/BR-LIB-003.md): RA marcados como "obligatorios en toda seccion" no pueden desactivarse por docente en syllabus
