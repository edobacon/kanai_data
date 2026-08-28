---
id: CAP-CUR-014
project: up1
type: doc
module: curriculum-design
status: in-spec
tags:
  - curriculum-design
  - programa-asignatura
  - capability
---

# CAP-CUR-014: Crear programa de curso

**Actores:** Coordinador de Curso, Jefe de Departamento | **Prioridad:** Must

## Descripcion (verbatim)

Definir el programa base de un curso con sus caracteristicas generales y secciones de contenido segun la estructura configurada por la institucion.

## Reglas de negocio

- Un programa de curso pertenece a un curso base del catalogo
- Las secciones disponibles dependen de la estructura configurada (CAP-CUR-011)
- La combinacion de codigo y version debe ser unica por curso
- Ver: [BR-WKF-001](../business-rules/BR-WKF-001.md)

## Resultado esperado

Programa de curso en estado **Borrador**.

## Cobertura por ticket

| Ticket DKC | Ticket Jira | Cobertura |
|------------|-------------|-----------|
| TICKET-006 | [UPONE-1033](https://u-planner.atlassian.net/browse/UPONE-1033) | Configura el objeto `Activity` (sustrato del programa) |
| TICKET-007 | [UPONE-1034](https://u-planner.atlassian.net/browse/UPONE-1034) | Vista listado de programas creados |

> **Fuera de los tickets actuales**: la capability completa requiere flujo de creacion via wizard, validaciones de unicidad `(code, version)`, configuracion de secciones por institucion (CAP-CUR-011/013).

## Notas de implementacion

- El "programa base de un curso" mapea al objeto `Activity` con `recordType="Course"`.
- "Secciones de contenido" mapea a N `CurricularSection` con distintos `recordType`.
- "Estructura configurada por la institucion" (CAP-CUR-011) sera implementada en sprints posteriores. En SP2 se asume estructura por defecto.
- "Combinacion de codigo y version unica" requiere unique constraint en `(code, version)` en la tabla `Activity`.

## Relacionado

- [CAP-CUR-011](../../) (Configuracion de estructura — fuera de SP2)
- [CAP-CUR-015](CAP-CUR-015.md), [CAP-CUR-016](CAP-CUR-016.md), [CAP-CUR-017](CAP-CUR-017.md) (siguen al programa creado)
