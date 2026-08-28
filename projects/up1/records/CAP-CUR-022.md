---
id: CAP-CUR-022
project: up1
type: doc
module: curriculum-design
status: in-spec
tags:
  - curriculum-design
  - programa-asignatura
  - capability
  - clonacion
---

# CAP-CUR-022: Clonar programa de curso

**Actores:** Coordinador de Curso | **Prioridad:** Should

> **Implementado**: clonar via row action "Duplicar", con capabilities `academicprogram:clone`, `curricularsection:clone`, `curriculum:clone` y `bibliographyreference:clone` en `capabilities.json`. El detalle transversal (versionado + clonacion) esta en [features/versioning-cloning.md](../../features/versioning-cloning.md); la lista de capabilities vive en `capabilities.json` del mod y la logica en los resolvers de create de cada objeto.

## Descripcion (verbatim)

Duplicar un programa de curso completo (con secciones, resultados de aprendizaje) para reutilizar en otro curso o contexto.

## Reglas de negocio

- La clonacion genera nuevos identificadores
- El clon nace en estado **Borrador**
- Ver: [BR-VER-002](../business-rules/BR-VER-002.md)

## Resultado esperado

Programa clonado.

## Relacionado

- [CAP-CUR-014](CAP-CUR-014.md)
- [BR-VER-002](../business-rules/BR-VER-002.md) (clonacion masiva como operacion asincrona)
