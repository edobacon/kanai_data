---
id: CAP-CUR-020
project: up1
type: spec
module: curriculum-design
status: out-of-scope-sp2
priority: should
actors: [coordinador-curso, super-admin]
external_refs: []
related: [CAP-CUR-019]
business_rules: []
sources:
  - https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1989148681
tags: [curriculum-design, programa-asignatura, capability, catalogo-publico]
---

# CAP-CUR-020: Publicar catalogo publico de cursos

**Actores:** Coordinador, Super Admin | **Prioridad:** Should

> **NOTA:** Capacidad **fuera del alcance de SP2**.

## Descripcion (verbatim)

Publicar programas de curso aprobados en un catalogo accesible sin autenticacion. Incluye busqueda por nombre, codigo, departamento.

## Reglas de negocio

- Solo programas en estado **Publicado** aparecen en el catalogo
- El catalogo es de **solo lectura**

## Resultado esperado

Catalogo publico activo.

## Relacionado

- [CAP-CUR-019](CAP-CUR-019.md) (workflow — debe alcanzar `Published` antes de listar)
