---
id: CAP-CUR-017
project: up1
type: spec
module: curriculum-design
status: in-spec
priority: should
actors: [coordinador-curso]
external_refs:
  - UPONE-1035
related: [CAP-CUR-014, CAP-CUR-036]
business_rules: []
sources:
  - https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1989148681
tags: [curriculum-design, programa-asignatura, capability, modalidades]
---

# CAP-CUR-017: Configurar modalidades y tipos de actividad

**Actores:** Coordinador de Curso | **Prioridad:** Should

## Descripcion (verbatim)

Asociar modalidades de imparticion (presencial, online, hibrido) y tipos de actividad academica al programa de curso.

## Reglas de negocio

- Al menos una modalidad debe estar asociada

## Resultado esperado

Modalidades y actividades configuradas.

## Cobertura por ticket

| Ticket DKC | Ticket Jira | Cobertura |
|------------|-------------|-----------|
| TICKET-006 | [UPONE-1033](https://u-planner.atlassian.net/browse/UPONE-1033) | NO cubre — el RT `Modality` no se modela en este ticket. |
| TICKET-009 | [UPONE-1035](https://u-planner.atlassian.net/browse/UPONE-1035) | **Crea el RT `Modality`** + formulario con campos `code`, `theoryHours`, `practiceHours`, `labHours`, `autonomousHours`, `isDefault`, `deliveryMode`. |

## Notas de implementacion

- Mapea al RecordType `Modality` de `CurricularSection`.
- Campos clave (segun modelo):

  | Campo | Tipo | Notas |
  |-------|------|-------|
  | `code` | string | Codigo de la modalidad (ej: "PRES", "ONL") |
  | `theoryHours` | number | Horas teoricas semanales |
  | `practiceHours` | number | Horas practicas |
  | `labHours` | number | Horas de laboratorio |
  | `autonomousHours` | number | Horas autonomas |
  | `isDefault` | boolean | Solo una modalidad puede tener `true` por programa |
  | `deliveryMode` | enum | `Presencial` / `Online` / `Hybrid` |

- Validacion ">=1 Modality requerida" se modela como check en transicion de workflow. En SP2 puede quedar como soft-validation.
- Ejemplo de variabilidad institucional: AIEP usa hasta 13 modalidades por curso, Univalle usa una sola.
- "Tipos de actividad academica" se relaciona con CAP-CUR-036 (Catalogo compartido — fuera SP2). En SP2 puede ser string libre o enum hardcoded.

## Relacionado

- [CAP-CUR-014](CAP-CUR-014.md)
- CAP-CUR-036 (Catalogo de tipos de actividad — fuera SP2)
