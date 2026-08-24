---
id: CAP-CUR-018
project: up1
type: spec
module: curriculum-design
status: in-spec
priority: must
actors: [coordinador-curso]
external_refs: []
related: [CAP-CUR-014]
business_rules: [BR-VER-001]
sources:
  - https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1989148681
tags: [curriculum-design, programa-asignatura, capability, versionamiento]
---

# CAP-CUR-018: Versionar programa de curso

**Actores:** Coordinador de Curso | **Prioridad:** Must

> **Implementado** (UPONE-1381): versionar esta gateado por `versionableFromStates: ["Approved", "Active"]` en `metadata.versioning` de `Activity` (`mods/curriculum-design/objects/activity.json`) y por la capability `activity:version`. Ver [features/enum-transitions.md](../../features/enum-transitions.md) (seccion 3, gate de versionado).

## Descripcion (verbatim)

Crear una nueva version de un programa de curso, copiando su contenido completo. La codificacion de version es libre (el usuario puede usar codigo de periodo academico, año, secuencial, u otro esquema segun la practica institucional). Permite versionamiento individual o masivo (multiples programas en una operacion batch con tracking de progreso).

## Reglas de negocio

- El versionamiento masivo genera un job asincrono con barra de progreso
- La version anterior no se modifica
- Ver: [BR-VER-001](../business-rules/BR-VER-001.md) (cadena de versiones)

## Resultado esperado

Nueva version creada en estado **Borrador**.

## Notas de implementacion

- Cadena de versiones via `previousVersionId`, con unicidad `uniqueConstraints: [["previousVersionId", "version"]]` en `activity.json` ([BR-VER-001](../business-rules/BR-VER-001.md)).
- Gate de versionado: `versionableFromStates: ["Approved", "Active"]` en `metadata.versioning`; no se puede versionar desde `Draft`, `InReview`, `Deprecated` ni `Archived`.
- Versionamiento masivo (batch con progreso): no verificado en este pase, pendiente de confirmar si sigue vigente como requerimiento.

## Relacionado

- [CAP-CUR-014](CAP-CUR-014.md)
- [BR-VER-001](../business-rules/BR-VER-001.md)
- [features/enum-transitions.md](../../features/enum-transitions.md)
