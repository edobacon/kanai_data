---
id: SPEC-curriculum-design-INDEX
project: up1
type: doc
module: curriculum-design
status: draft
tags:
  - curriculum-design
  - index
---

# Curriculum Design — INDEX

Indice de specs del modulo `curriculum-design` para Deckard up1.

## Documentos principales

| Archivo | Contenido |
|---------|-----------|
| [overview.md](overview.md) | Posicionamiento Curriculum Design en Learning Assurance, alcance del sprint, dependencias |
| [programa-de-asignatura.md](programa-de-asignatura.md) | Modelo del agregado: Activity (raiz) + CurricularSection polimorfica + CurricularLink + BibliographyReference (4 objetos originales del SP2); inventario completo de los 12 objetos del mod al 2026-07-16 |
| [up1-modeling-guide.md](up1-modeling-guide.md) | **Guia oficial de formato up1** aplicada a los 4 objetos del agregado + plan de creacion del mod |
| [legacy-examples.md](legacy-examples.md) | **Ejemplos legacy Univalle + AIEP** (v2.2, 2026-04-25) — referencia para seed inicial del mod |
| [open-questions.md](open-questions.md) | **14 preguntas abiertas** (Q1–Q10 sobre modelo, Q11–Q14 sobre strict scope de RTs) con priorización SP1/SP2 |
| [references/AGENTS.md](references/AGENTS.md) | **Verbatim**: doc oficial de formato up1 (entregado 2026-04-27) — fuente de verdad para schema |
| [references/EXAMPLES.md](references/EXAMPLES.md) | **Verbatim**: snippets canonicos (objeto de mod + Extended por cliente) |
| [SPEC-008-hu2-audit-rt-polymorphic-handoff.md](SPEC-008-hu2-audit-rt-polymorphic-handoff.md) | **HU2 (UPONE-1098) handoff al equipo de desarrollo** — lo intentado + lo faltante para audit field-by-field de recordtypes polimorficos. Documenta L35-L41, decision pivot a changeLog general + filtro por activity, y B-followups (especialmente B-pre-fetch-core-rt como fix estructural del platform). Nota 2026-07: la tabla changeLog fue retirada y reemplazada por `core_DataLog`/DataLog en UPONE-1380; ver [features/datalog.md](../features/datalog.md) |
| [curriculum-v1-v2-convergence-analysis.md](curriculum-v1-v2-convergence-analysis.md) | **`Curriculum` en UPU: redefinicion v1 (tenant) vs canonico v2 (Base)** (UPONE-1268/TICKET-068, SP5) — **solo UPU redefine** el objeto (override total v1); el v2 ya es canonico para el resto. La solucion recomendada es **Opcion E: quitar el override + extender** (UPU hereda Base v2, legacy a `ext__uplanner__curriculum`), no converger. Que va obligatoriamente en Base y por que no se extiende (discriminador/FK polimorfica/unique compuesto), drift multi-capa JSON/prisma/DB, comparacion E vs A/B'/C/D, hallazgos H1-H5 (bloqueante: sin resolucion Career→AcademicProgram; H5: `publicId` unique en extension a verificar) y **blast radius confinado a UPU** |

## Capacidades (Confluence CAP-CUR-XXX)

Cada archivo es spec verbatim de la capacidad en Confluence + notas de implementacion para SP2.

| Capability | Prioridad | SP2 | Estado actual (2026-07-16) |
|-----------|-----------|-----|-----------------------------|
| [CAP-CUR-014](capabilities/CAP-CUR-014.md) Crear programa de curso | Must | Cubierto por TICKET-006/007 | Implementado |
| [CAP-CUR-015](capabilities/CAP-CUR-015.md) Definir RA del curso | Must | Cubierto parcial por TICKET-006 (modelo + RT) | Implementado |
| [CAP-CUR-016](capabilities/CAP-CUR-016.md) Gestionar secciones | Must | Cubierto por TICKET-009 | Implementado |
| [CAP-CUR-017](capabilities/CAP-CUR-017.md) Configurar modalidades | Should | Cubierto parcial por TICKET-009 (RT Modality) | Implementado |
| [CAP-CUR-018](capabilities/CAP-CUR-018.md) Versionar programa | Must | **Fuera SP2** (campos de soporte si) | **Implementado** (SP6-SP7, UPONE-1216/1381): ver [features/enum-transitions.md](../features/enum-transitions.md) |
| [CAP-CUR-019](capabilities/CAP-CUR-019.md) Workflow del programa | Must | **Fuera SP2** (campo `status` si) | **Implementado** (SP7, UPONE-1381): `status` con enum-transitions declarativas, ver [features/enum-transitions.md](../features/enum-transitions.md) |
| [CAP-CUR-020](capabilities/CAP-CUR-020.md) Catalogo publico | Should | **Fuera SP2** | Fuera de alcance |
| [CAP-CUR-021](capabilities/CAP-CUR-021.md) Compartir via link | Could | **Fuera SP2** | Fuera de alcance |
| [CAP-CUR-022](capabilities/CAP-CUR-022.md) Clonar programa | Should | **Fuera SP2** | **Implementado** (SP6, UPONE-1216): capabilities `academicprogram:clone`, `curricularsection:clone`, `curriculum:clone` |

## Funcionalidades transversales agregadas post-SP2

| Ticket Jira | Cobertura | Referencia |
|-------------|-----------|------------|
| [UPONE-1382](https://u-planner.atlassian.net/browse/UPONE-1382) | Delete en cascada: metadata `polymorphicChildren`/`directChildren` en las 4 raices del mod + `canDelete`/`deleteWarning` en listados | [features/delete-cascade.md](../features/delete-cascade.md) |
| [UPONE-1393](https://u-planner.atlassian.net/browse/UPONE-1393) | RBAC granular por tab (`requiredCapability` en secciones de los layouts `_edit`) | [features/rbac.md](../features/rbac.md) |

## Reglas de negocio (Confluence BR-XXX-NNN)

Cada archivo es spec verbatim de la BR en Confluence + aplicacion al programa de asignatura.

### Workflow (BR-WKF)

- [BR-WKF-001](business-rules/BR-WKF-001.md) Reglas generales de workflow
- [BR-WKF-002](business-rules/BR-WKF-002.md) Control de acceso por workflow
- [BR-WKF-003](business-rules/BR-WKF-003.md) Inmutabilidad por estudiantes activos
- [BR-WKF-004](business-rules/BR-WKF-004.md) Coordinacion plan ↔ perfil egreso

### Versionamiento (BR-VER)

- [BR-VER-001](business-rules/BR-VER-001.md) Cadena de versiones
- [BR-VER-002](business-rules/BR-VER-002.md) Clonacion

### Migracion programa→syllabus (BR-MIG)

- [BR-MIG-001](business-rules/BR-MIG-001.md) Herencia automatica de estructura
- [BR-MIG-002](business-rules/BR-MIG-002.md) Control de sincronizacion
- [BR-MIG-003](business-rules/BR-MIG-003.md) Bloqueo por calificaciones (PRIORIDAD MAXIMA)

### Integraciones (BR-INT)

- [BR-INT-001](business-rules/BR-INT-001.md) Identificador de sistema externo
- [BR-INT-002](business-rules/BR-INT-002.md) Escenarios A/B/C de integracion
- [BR-INT-003](business-rules/BR-INT-003.md) Fuentes de calificaciones

### Permisos (BR-PRM)

- [BR-PRM-001](business-rules/BR-PRM-001.md) Permisos granulares por seccion
- [BR-PRM-002](business-rules/BR-PRM-002.md) Cascada de permisos

### Multi-tenancy (BR-TNT)

- [BR-TNT-001](business-rules/BR-TNT-001.md) Aislamiento por institucion
- [BR-TNT-002](business-rules/BR-TNT-002.md) Defaults de plataforma vs custom

### Taxonomias (BR-TAX)

- [BR-TAX-001](business-rules/BR-TAX-001.md) Codificacion dual
- [BR-TAX-002](business-rules/BR-TAX-002.md) Configuracion institucional (Bloom, CIP, ISCED-F, ESCO, Tuning, ABET)
- [BR-TAX-003](business-rules/BR-TAX-003.md) Sugerencia IA

### Libertad evaluativa (BR-LIB)

- [BR-LIB-001](business-rules/BR-LIB-001.md) Niveles Restringido/Guiado/Libre
- [BR-LIB-002](business-rules/BR-LIB-002.md) Validacion de cobertura RA
- [BR-LIB-003](business-rules/BR-LIB-003.md) Proteccion de RA criticos

### Modelo de datos (BR-MOD)

- [BR-MOD-001](business-rules/BR-MOD-001.md) **CRITICO**: CourseProgram pertenece al catalogo, NO a StudyPlan

## Riesgos identificados

- [RISK-001](risks/layouts-recordtype-untested.md) Layouts por RecordType sin precedente en mods (severity: medium)

## Decisions relacionadas

- [DECISION-001](../../decisions/DECISION-mod-unico-curriculum-design.md) Mod unico `curriculum-design` para los 4 objetos
- [DECISION-002](../../decisions/DECISION-org-unit-defer.md) Postergar FK `executionUnitId → OrgUnit`

## Tickets DKC

| Ticket | Jira | Foco |
|--------|------|------|
| TICKET-006 | [UPONE-1033](https://u-planner.atlassian.net/browse/UPONE-1033) | Configuracion de objetos del agregado |
| TICKET-007 | [UPONE-1034](https://u-planner.atlassian.net/browse/UPONE-1034) | Vista listado de Activity |
| TICKET-009 | [UPONE-1035](https://u-planner.atlassian.net/browse/UPONE-1035) | Vista detalle con CurricularSections + RecordTypes |

## Fuentes Confluence

- [Vision Funcional](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2002223105)
- [Learning Assurance overview](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1990066183)
- [Curriculum Design](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1989148681) — capacidades CAP-CUR
- [Modelo de objetos de negocio Learning Assurance](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2038366242) — modelo de objetos
- [Reglas Transversales](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1988165713) — todas las BR
- [Flujos Funcionales](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2001207299) — flujos 3B, 16, 19
- [Integraciones](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1989574665)
