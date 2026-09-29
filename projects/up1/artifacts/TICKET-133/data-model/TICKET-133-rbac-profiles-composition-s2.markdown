# Application profiles autorados en S2 (derivados del mapa vivo)

Identidad = campo `name`. `extends` referencia el `name` del padre. Verificado: base∪extension == MOD_CAPABILITIES_BY_ROLE (0 faltantes/0 sobrantes).

## curriculum-design (prefijo 'Curriculum Design')

| Rol institucional | Perfil (name) | extends | Delta de capabilities (target:action) |
|---|---|---|---|
| Consultor Curricular | Curriculum Design Consultor Curricular | (base) | READ_CAPS del mapa + **institution:view** (mod/curriculum-design:view, academicprogram:view, curriculum:view, activity:view/audit, offering:view, curricularsection:view/audit, curricularlink:view/audit, requirement:view, planentry:view, requirementcategory:view, bibliographyreference:view, instructionalcomponenttype:view, core_datalog:view, institution:view) |
| Revisor Curricular | Curriculum Design Revisor Curricular | base | mod/curriculum-design:approve, curriculum:approve, activity:approve, curriculum.status:modify, activity.status:modify |
| Disenador Curricular | Curriculum Design Disenador Curricular | base | mod/curriculum-design:edit; academicprogram:create/modify/clone; curriculum:create/modify/version/clone; activity:create/modify/version; offering:create/modify; curricularsection:create/modify/clone; curricularlink:create/modify; requirement:create/modify; planentry:create/modify; requirementcategory:create/modify; bibliographyreference:create/modify/clone; instructionalcomponenttype:create/modify |
| Autoridad Curricular | Curriculum Design Autoridad Curricular | base | mod/curriculum-design:approve/publish; curriculum:approve/publish/deprecate/archive/revert/delete; activity:approve/publish/deprecate/archive/revert/delete; offering:publish/archive/revert/delete; curriculum.status:modify; activity.status:modify; offering.lifecycleStatus:modify; academicprogram:delete; curricularsection:delete; curricularlink:delete; requirement:delete; planentry:delete; requirementcategory:delete; bibliographyreference:delete; instructionalcomponenttype:delete |
| Admin/Consultor (core) | Curriculum Design Disenador Autoridad (compuesto) | Autoridad | delta Disenador (todas las caps de crear/editar/versionar/clonar de arriba). Union resuelta == Disenador ∪ Autoridad |

## curriculum-mapping (prefijo 'Curriculum Mapping', composicion propia, sin institution)

| Rol institucional | Perfil (name) | extends | Delta de capabilities |
|---|---|---|---|
| Consultor Curricular | Curriculum Mapping Consultor Curricular | (base) | mod/curriculum-mapping:view, performancescale:view, developmentlevel:view, competencynode:view, competencynodeownerunit:view, competencynodescopeunit:view, matrixadoption:view, orgunit:view, core_datalog:view, core_user.name:view |
| Revisor Curricular | Curriculum Mapping Revisor Curricular | base | competencynode:matrix.status:modify, competencynode:approve |
| Disenador Curricular | Curriculum Mapping Disenador Curricular | base | mod/curriculum-mapping:edit; performancescale:create/modify/version; developmentlevel:create/modify; competencynode:create/modify/adopt |
| Autoridad Curricular | Curriculum Mapping Autoridad Curricular | base | performancescale:delete; developmentlevel:delete; competencynode:exempt/adopt/approve/publish/deprecate/archive/revert; competencynode:matrix.status:modify |
| Admin/Consultor (core) | Curriculum Mapping Disenador Autoridad (compuesto) | Autoridad | delta Disenador sin adopt (ya lo aporta Autoridad): mod/curriculum-mapping:edit; performancescale:create/modify/version; developmentlevel:create/modify; competencynode:create/modify. Union resuelta == Disenador ∪ Autoridad |

Retirados en cd/profiles/: GestorCurricular.json, LectorCurricular.json (fixtures RBAC-01).