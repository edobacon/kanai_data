---
id: SPEC-la-objects-model-INDEX
project: up1
type: spec
module: learning-assurance
category: objects-model
status: active
tags: [learning-assurance, modelo-objetos, index, snapshot, versionado]
last_updated: 2026-05-13
maintained_by: Eduardo Bacon
---

# Modelo de objetos Learning Assurance — INDEX

Registro evolutivo de los objetos de negocio del dominio Learning Assurance + capa transversal (Workflow y Organizacion), tomados como **snapshots por sprint** contra la pagina canonica de Confluence.

**Pagina canonica**: [Modelo de objetos de negocio Learning Assurance](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2038366242) (id 2038366242, autor Esteban Cortes Sandoval).

---

## Como leer esta documentacion

### Para humanos

1. **Empieza por este INDEX** — vista de los 30 objetos del modelo y su tier actual.
2. Si quieres el estado actual del modelo (al inicio del sprint vigente), abre el snapshot mas reciente (`snapshot-sp<N>-<fecha>.md`).
3. Si necesitas ver que cambio respecto al sprint anterior o entre versiones de Confluence, abre [CHANGELOG.md](CHANGELOG.md).
4. Si llegaste aqui porque empieza un sprint nuevo y quieres actualizar el modelo, abre [UPDATE.md](UPDATE.md) (prompt operativo).

### Para LLM

1. **Snapshots son inmutables.** No reescribir `snapshot-sp<N>-<fecha>.md` una vez creado. Para correcciones de typo: anotar inline con `**Erratum YYYY-MM-DD**: ...`.
2. **Cuando arranque un sprint**: ejecutar [UPDATE.md](UPDATE.md) — trae version vigente de Confluence, genera nuevo snapshot, anade entrada al CHANGELOG, actualiza este INDEX (tabla maestra).
3. **Convencion de naming** en valores polimorficos (`workflow.scopeType`, `workflowTransitionHistory.entityType`, `changeLog.entityType`, `curricularSection.ownerType`, etc.): **camelCase** literal (`activity`, `curriculumPlan`, etc.). Aplica a frontmatter, ejemplos, queries y seeds.
4. **Niveles de detalle por tier** dentro de cada snapshot:
   - **Tier 1** (en scope del sprint): definicion completa — campos, tipos, enums, defaults, FKs, constraints, decisiones de diseño.
   - **Tier 2** (referenciados/adyacentes): sintesis estructural — campos principales, status, razon de relevancia.
   - **Tier 3** (catalogo no relacionado): mencion + status + numero de campos + link al verbatim de Confluence.
5. **Cuando un objeto cambia de tier** (entra a scope, se referencia, etc.): actualizar la tabla maestra de este INDEX + nueva fila en CHANGELOG con el motivo.
6. **Citas verbatim de Confluence** entre comillas dobles + comilla simple invertida para campos: `"campo | tipo | Si | notas"`. Trazabilidad obligatoria.
7. **No inventar campos ni constraints** que no esten en Confluence. Si la pagina canonica no lo declara, marcarlo como "decision local — ver ticket DKC T-XXX".

### Reglas no negociables

| Regla | Por que |
|-------|---------|
| Snapshot inmutable | Garantiza trazabilidad historica entre versiones; el modelo evoluciona, el registro no se reescribe |
| Una entrada por sprint | Mantiene la cadencia predecible; sprints sin cambios al modelo no requieren snapshot |
| Tier 1 verbatim de Confluence | Fuente unica de verdad para implementacion; evita drift entre doc y codigo |
| CHANGELOG con tabla cross-version por objeto | Permite ver evolucion de cada objeto en una sola vista, no fragmentado |
| Update via UPDATE.md (no manual) | El prompt operativo asegura consistencia y minimiza errores de actualizacion |

---

## Archivos en esta carpeta

| Archivo | Proposito | Mutabilidad |
|---------|-----------|-------------|
| [INDEX.md](INDEX.md) | Este archivo — hub, tabla maestra, instrucciones de lectura | Se actualiza cada sprint |
| [CHANGELOG.md](CHANGELOG.md) | Tracking cross-version por objeto + delta accionable entre snapshots | Se actualiza cada sprint |
| [UPDATE.md](UPDATE.md) | Prompt operativo para LLM — como traer nueva version de Confluence y actualizar registros | Estable (se ajusta solo si cambia el procedimiento) |
| [snapshot-sp2-2026-05-12.md](snapshot-sp2-2026-05-12.md) | Modelo tal como se implemento al cierre de SP2 (3 objetos curriculares en codigo) | **Inmutable** |
| [snapshot-sp3-2026-05-13.md](snapshot-sp3-2026-05-13.md) | Modelo objetivo al inicio de SP3 — Confluence v1.10 (8 objetos en scope HU2+HU3+HU4) | **Inmutable** |

---

## Tabla maestra — los 30 objetos del modelo

Estado al snapshot actual (SP3 2026-05-13, Confluence v1.10).

| # | Objeto | Categoria Confluence | Status Confluence | Tier SP2 | Tier SP3 | Ticket DKC SP3 | Notas |
|---:|--------|---------------------|-------------------|----------|----------|----------------|-------|
| 1 | organization | Plataforma — Organizacion | Implementado | Tier 2 | Tier 2 | — | Base multi-tenancy; FK desde institution |
| 2 | institution | Plataforma — Organizacion | Implementado | Tier 2 | Tier 2 | — | Discriminador de tenant; FK desde workflow/workflowStatus |
| 3 | orgUnit | Plataforma — Organizacion | Implementado | Tier 2 | Tier 2 | — | FK desde activity.executionUnitId |
| 4 | workflowStatus | Plataforma — Workflow | En implementacion | Tier 3 (no existia) | **Tier 1** | TICKET-018 | NEW v1.9. v1.10 agrego InReview a category |
| 5 | workflow | Plataforma — Workflow | En implementacion | Tier 3 (no existia) | **Tier 1** | TICKET-018 | NEW v1.9 |
| 6 | workflowTransition | Plataforma — Workflow | En implementacion | Tier 3 (no existia) | **Tier 1** | TICKET-018 | NEW v1.9 |
| 7 | workflowTransitionHistory | Plataforma — Workflow | En implementacion | Tier 3 (no existia) | **Tier 1** | TICKET-018 | NEW v1.9. Reemplaza al `workflowTransition` LA-interno antiguo |
| 8 | academicProgram | LA — Dominio principal | Draft | Tier 3 | Tier 3 | — | scopeType del workflow |
| 9 | curriculumPlan | LA — Dominio principal | Draft | Tier 3 | Tier 2 | — | scopeType del workflow + ownerType de curricularSection. Si cambia, afecta seeds |
| 10 | planEntry | LA — Dominio principal | Draft | Tier 3 | Tier 3 | — | — |
| 11 | activity | LA — Dominio principal | En implementacion | **Tier 1** (como AcademicActivity PascalCase) | **Tier 1** | TICKET-019 | v1.8 rename Pascal→camel; v1.9 +workflowId/currentStatusId; v1.10 rename academicActivity→activity + purpose |
| 12 | curricularSection | LA — Dominio principal | Implementado | **Tier 1** | **Tier 1** | TICKET-020 | Auditada por changeLog en HU2. v1.8 rename Pascal→camel (no aplicado en codigo) |
| 13 | competencyNode | LA — Dominio principal | Draft | Tier 3 | Tier 2 | — | scopeType del workflow |
| 14 | milestone | LA — Dominio principal | Draft | Tier 3 | Tier 3 | — | — |
| 15 | studentGrade | LA — Dominio principal | Draft | Tier 3 | Tier 3 | — | v1.5 migracion (G1): hours migraron a curricularSection.Modality |
| 16 | achievement | LA — Dominio principal | Draft | Tier 3 | Tier 3 | — | — |
| 17 | graduationProfileEntry | LA — Soporte | Draft | Tier 3 | Tier 3 | — | — |
| 18 | requirementCategory | LA — Soporte | Draft | Tier 3 | Tier 3 | — | — |
| 19 | activityEquivalence | LA — Soporte | Draft | Tier 3 | Tier 3 | — | — |
| 20 | competencyEquivalence | LA — Soporte | Draft | Tier 3 | Tier 3 | — | — |
| 21 | electiveOption | LA — Soporte | Draft | Tier 3 | Tier 3 | — | — |
| 22 | entryDependency | LA — Soporte | Draft | Tier 3 | Tier 3 | — | — |
| 23 | competencyAlignment | LA — Soporte | Draft | Tier 3 | Tier 3 | — | Hermano de curricularLink — tributacion al perfil de competencias |
| 24 | curricularLink | LA — Soporte | Implementado | **Tier 1** | **Tier 1** | TICKET-020 | Auditada por changeLog en HU2. v1.5 NEW (G2) |
| 25 | changeRequest | LA — Soporte | Draft | Tier 3 | Tier 2 | — | scopeType del workflow + source de changeLog |
| 26 | planEnrollment | LA — Soporte | Draft | Tier 3 | Tier 3 | — | — |
| 27 | changeLog | LA — Soporte | En implementacion | Tier 3 (no existia) | **Tier 1** | TICKET-020 | HU2 — auditoria universal polimorfica. Confluence declara `entityType | string`, no enum |
| 28 | specialization | LA — Soporte | Draft | Tier 3 | Tier 3 | — | — |
| 29 | planEntrySpecialization | LA — Soporte | Draft | Tier 3 | Tier 3 | — | — |
| 30 | bibliographyReference | LA — Catalogo compartido | Implementado | Tier 2 | Tier 2 | — | Referenciado por curricularSection (recordType=Bibliography). v1.0 G3 tolerante a datos pobres |

**Resumen por tier (SP3):**
- **Tier 1 — En scope SP3**: 8 objetos (activity, curricularSection, curricularLink, workflow, workflowStatus, workflowTransition, workflowTransitionHistory, changeLog).
- **Tier 2 — Referenciados/adyacentes**: 8 objetos (organization, institution, orgUnit, curriculumPlan, competencyNode, changeRequest, bibliographyReference, + 1 colateral).
- **Tier 3 — Resto del catalogo**: 14 objetos (todos en Draft en Confluence).

**Resumen por tier (SP2):**
- **Tier 1 — Implementados al cierre SP2**: 3 objetos (AcademicActivity, CurricularSection, CurricularLink).
- **Tier 2 — Adyacentes**: 4 objetos (organization, institution, orgUnit, bibliographyReference).
- **Tier 3 — Resto**: 23 objetos (incluye los 4 workflow + changeLog que no existian).

---

## Sprints documentados

| Sprint | Fecha snapshot | Snapshot | Confluence base | Tickets DKC |
|--------|----------------|----------|-----------------|-------------|
| SP2 | 2026-05-12 (cierre) | [snapshot-sp2-2026-05-12.md](snapshot-sp2-2026-05-12.md) | ~v1.4 (pre-rename camelCase, pre-objetos workflow). Divergencias locales declaradas | TICKET-006, TICKET-007, TICKET-009, TICKET-010, TICKET-011, TICKET-012, TICKET-013, TICKET-014, TICKET-015, TICKET-016, TICKET-017, TICKET-022 |
| SP3 | 2026-05-13 (inicio) | [snapshot-sp3-2026-05-13.md](snapshot-sp3-2026-05-13.md) | v1.10 (page version 14, 2026-05-12 edit). Canonica vigente | TICKET-018 (HU3), TICKET-019 (HU4), TICKET-020 (HU2) |

---

## Glosario de status (Confluence)

| Status | Significado |
|--------|-------------|
| Implementado | Objeto existe en core con schema estable. Implementacion productiva en al menos un tenant |
| En implementacion | Diseno aprobado, implementacion en curso o cubierto en sprint vigente |
| Draft | Diseno propuesto, sujeto a cambios. No esta en codigo ni planificado para sprint inmediato |

## Como agregar snapshot del proximo sprint

Ver [UPDATE.md](UPDATE.md) — procedimiento paso a paso para LLM y humano.
