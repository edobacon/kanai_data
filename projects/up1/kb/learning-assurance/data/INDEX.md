---
id: SPEC-learning-assurance-010
project: up1
type: spec
module: learning-assurance
category: data
tags: [up1, learning-assurance, propuesta, curriculum-design, curriculum-mapping, assessment, capacidades, reglas, flujos, integraciones]
fecha: 2026-04-10
fuente: Confluence uP1 — espacio uP1, seccion Learning Assurance
autor: Esteban Cortes (esteban.cortes@uplanner.com)
confluence_root_id: "1990066183"
confluence_url: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1990066183/Learning+Assurance
---
# Learning Assurance — Propuesta funcional (Esteban Cortes)

Extraccion completa de la propuesta de Learning Assurance documentada en Confluence por Esteban Cortes. Contiene la especificacion funcional de 3 aplicaciones con 129 capacidades, reglas transversales, flujos funcionales e integraciones.

```text
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│ Curriculum Design │────>│ Curriculum Mapping │────>│ Learning          │────>│ Learning         │
│ 62 capacidades    │     │ 24 capacidades     │     │ Assessment        │     │ Pathways (roadm.)│
└────────┬──────────┘     └───────────────────┘     │ 43 capacidades    │     └──────────────────┘
         │                                           └───────────────────┘
         ▼
┌──────────────────┐
│ Course Catalog   │
│ (roadmap)        │
└──────────────────┘

┌────────────────────┐  - - gobierna - ->  Curriculum Design
│ Reglas transversal.│  - - gobierna - ->  Curriculum Mapping
└────────────────────┘  - - gobierna - ->  Learning Assessment

┌────────────────────┐  - - conecta - ->   Curriculum Design
│ Flujos funcionales │  - - conecta - ->   Curriculum Mapping
└────────────────────┘  - - conecta - ->   Learning Assessment

┌────────────────────┐
│ Integraciones      │  - - integra - ->   Learning Assessment
└────────────────────┘
```

## Estructura de esta carpeta

| Archivo | Confluence ID | Descripcion |
|---------|--------------|-------------|
| [01-vision-funcional.md](01-vision-funcional.md) | [2002223105](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2002223105) | Descripcion general de la linea, que hace cada app, a quien va dirigida, flujos por app, diferenciadores |
| [02-curriculum-design.md](02-curriculum-design.md) | [1989148681](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1989148681) | App 1: 62 capacidades (planes, programas, syllabi, catalogos, evidencias, IA, taxonomias, mejora continua) |
| [03-curriculum-mapping.md](03-curriculum-mapping.md) | [1987674175](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1987674175) | App 2: 24 capacidades (matrices, niveles, perfil de egreso, tributacion, IA) |
| [04-learning-assessment.md](04-learning-assessment.md) | [1989705746](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1989705746) | App 3: 43 capacidades (evaluacion, evidencias, seguimiento, reporteria, acreditacion, integraciones, config) |
| [05-reglas-transversales.md](05-reglas-transversales.md) | [1988165713](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1988165713) | Reglas BR-XXX: workflows, multi-tenancy, integraciones, versionamiento, permisos, licenciamiento, notificaciones, taxonomias, modelo de datos, migracion MADS, libertad evaluativa, calculo de logro |
| [06-flujos-funcionales.md](06-flujos-funcionales.md) | [2001207299](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2001207299) | 20 flujos: escenarios A/B/C, config inicial, carga SIS, enriquecimiento, creacion, syllabi, clonacion, IA, mejora continua, matrices, perfil, tributacion, evaluacion, calificaciones, seguimiento, reporteria, acreditacion, MADS, integracion, taxonomias, exportacion, notificaciones |
| [07-integraciones.md](07-integraciones.md) | [1989574665](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1989574665) | Modelo de integracion: Banner, Anthology, LMS, Attendance & Grades, genericos. Patron de sincronizacion |
| [08-learning-pathways.md](08-learning-pathways.md) | [1988067392](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1988067392) | Roadmap futuro: rutas personalizadas, recomendacion de electivos |
| [09-course-catalog.md](09-course-catalog.md) | [1988067399](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1988067399) | Roadmap futuro: catalogo publico, busqueda, comparador |

## Resumen de capacidades

| App | Must | Should | Could | Total |
|-----|------|--------|-------|-------|
| Curriculum Design | 27 | 25 | 10 | **62** |
| Curriculum Mapping | 14 | 5 | 5 | **24** |
| Learning Assessment | 20 | 17 | 6 | **43** |
| **Total** | **61** | **47** | **21** | **129** |

## Como usar esta data

- **Para migration-plan/**: cruzar capacidades con features de uP1 (object-manager, mods, layouts, RBAC, flow engine)
- **Para Senku**: las tags permiten buscar por app, tipo de capacidad, regla transversal
- **Para implementacion**: cada CAP-XXX-NNN es una unidad de trabajo atomica con actores, prioridad, reglas y resultado esperado
