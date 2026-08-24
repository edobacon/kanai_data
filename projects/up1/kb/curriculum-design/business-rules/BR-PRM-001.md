---
id: BR-PRM-001
project: up1
type: spec
module: curriculum-design
category: permisos
status: in-spec
sources:
  - https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1988165713
referenced_by_caps: []
external_refs: []
tags: [business-rule, permisos, syllabus, granular, curriculum-design]
---

# BR-PRM-001: Permisos por seccion del syllabus

## Texto verbatim

Cada seccion del syllabus tiene control de acceso granular con permiso de ver y editar independientes:

- Datos generales del curso
- Modalidades y actividades
- Competencias del curso
- Contenidos (temas, subtemas)
- Sesiones
- Evaluaciones
- Condiciones de aprobacion
- Referencias y bibliografia

Los permisos se definen por rol y pueden variar segun el estado del workflow.

## Aplicacion en Programa de asignatura

Aunque la regla menciona "syllabus", el principio analogo aplica al **programa de asignatura**: cada `recordType` de `CurricularSection` puede tener permisos `ver`/`editar` independientes por rol.

Esto se alinea con el sistema RBAC de up1. En la practica, el nombre de capability real es object-level sin prefix `mod/` (RULE-mods-037), ej: `curricularsection:view`, no `mod/curriculum-design:<recordType>:<accion>` como se anticipaba aqui.

Tambien casa con [UPONE-947](https://u-planner.atlassian.net/browse/UPONE-947) (permisos granulares por RecordType, Ready to test).

## Estado de implementacion

- Implementado (UPONE-1393): RBAC granular por `requiredCapability` en tabs y secciones de los layouts (`default_Activity_edit.json`, `default_Activity_view.json`, y equivalentes de `Curriculum`/`Offering`), no solo CRUD amplio a nivel objeto.
- Ver [features/rbac.md](../../features/rbac.md) para el modelo completo de capabilities objeto/campo/modulo y el fallback field-level.

## Referencias

- [BR-PRM-002](BR-PRM-002.md) (cascada)
- [UPONE-947](https://u-planner.atlassian.net/browse/UPONE-947)
