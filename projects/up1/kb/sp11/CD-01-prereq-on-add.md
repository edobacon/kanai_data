---
id: DOC-kb-sp11-CD-01-prereq-on-add
project: up1
type: doc
module: curriculum-design
tags:
  - sp11
  - mcp
  - curriculum-design
  - ticket
  - cd-plan
  - detalle
  - integridad
  - prereq
  - riesgo-vigente
  - CD-01
---

# CD-01 · Prerrequisitos/correq/créditos en el ALTA de planEntry (gap de integridad vigente) — detalle

**Identificador interno:** CD-01 (sin código de Jira todavía; mapear a UPONE-xxxx al crear el issue). Tipo: fix (cierra un hueco de integridad ACTIVO). Epic probable: Curriculum Design (UPONE-1267). Asignado: propio. Story Points: 2-3. Parte de [Plan cd MCP-ready opción mod](PLAN-cd-mcp-ready-opcion-mod). Pre-intake en [CD-01-pre-intake](CD-01-pre-intake). Evidencia de frontera en [CD-01-aduana](CD-01-aduana).

> **Prioridad: riesgo de integridad VIGENTE.** Alcanzable HOY por `cd_add_plan_entries_batch` (tool ya expuesta): el asistente puede insertar cursos violando prerrequisitos/correquisitos/umbral de créditos, algo que la pantalla nunca permite. Abordar primero, independiente del resto.

## 1. Fuente canónica
Sin ticket Jira todavía. Fuente: [Análisis cd para el MCP](Analisis-cd-para-el-MCP-paridad-1-1-postura-blockGeneric-y-gaps-client-side) (gap client-only #1) + [Comparativo cm vs cd](cm-vs-cd-en-el-MCP-comparativo-para-decision-PO) (sección 3, el punto más urgente).

## 2. Historia de usuario
Como responsable del plan de estudios, quiero que el alta de materias al plan por el asistente valide prerrequisitos, correquisitos y umbral de créditos igual que la pantalla, para que no se inserten cursos que violan la estructura del plan.

## 3. Objetivo
Cerrar el gap: cablear el evaluador de requisitos como guard del ALTA de planEntry (hoy solo está cableado al BORRADO), en el resolver propio de cd.

## 4. Contexto (para dimensionar)
- **Fix vs feature:** fix de integridad, riesgo activo.
- **Qué existe:** la validación vive HOY solo en el cliente (`CurriculumMesh/evaluateRequirementTree.logic.ts` + `prereqCheck.logic.ts:41-168`, aborta el alta en `CurriculumMeshElement.vue:1713`). El resolver de create NO la aplica (`sectionValidation.resolver.js:202-221`, `planEntry-batch.resolver.js:154-160` solo validan Plan Draft/unicidad/forma). El evaluador server-side SÍ existe pero cableado solo al BORRADO (`planEntryDeletionRequirementGuard.js`).
- **Portabilidad ALTA:** el twin server (`evaluateRequirementTree.js`) y el loader (`requirementTreeLoader.js`) ya existen; falta cablearlos como guard de CREATE, análogo al de delete.
- **N0:** al ir en el resolver override, la regla cierra UI + MCP + cross-client a la vez.

## 5. Alcance
**Dentro:** cablear el evaluador de requisitos como precondición del alta de planEntry (individual y batch), rechazando altas que violen prerrequisitos/correquisitos/umbral de créditos, con mensaje de negocio.
**Fuera:** el ensamblado del árbol de requisitos (CD-03); la lectura de la malla (CD-05).

## 6. Criterios de aceptación (checkeables)
- [ ] El alta de una planEntry (individual y batch) rechaza el caso que viola prerrequisitos.
- [ ] Rechaza el caso que viola correquisitos.
- [ ] Rechaza el caso que viola el umbral de créditos.
- [ ] El rechazo ocurre en el resolver del servicio (vale para pantalla, genérico y tools), no solo en el cliente.
- [ ] `cd_add_plan_entries_batch` (tool existente) queda cubierta por el guard (deja de poder insertar cursos inválidos).
- [ ] Un alta válida sigue funcionando igual que hoy (no-regresión).

## 7. Definition of Done (checkeable)
- [ ] **Estándar de terminado del equipo:** cada criterio de aceptación tiene test o "N/A" justificado, verificado en el gate de cierre (RULE-dev-013); escritura por el camino gobernado del módulo (en cd, los overrides N0 del genérico), sin saltear las reglas (RULE-curriculum-design-003, RULE-server-side-logic-mcp-ready); tests unitarios verdes + typecheck (vue-tsc) en checkout limpio (RULE-mods-052, RULE-mods-058); smoke visual para cambios de UI o "N/A" justificado (RULE-curriculum-design-029); RBAC efectivo, un rol sin capability no ejecuta ni ve (RULE-mcp-004, RULE-layout-039); tenant isolation preservado; si toca archivos sincronizados, correr el sync sin dejar artefactos sin generar (RULE-dev-010).
- [ ] Específico de este ticket:
- [ ] Evidencia runtime: intento de alta inválida por el asistente -> rechazada; alta válida -> aceptada.
- [ ] Logica server-side / MCP-ready: la regla vive en el resolver, no en el cliente.
- [ ] No-regresión del alta válida (UI + tool batch).
- [ ] RBAC efectivo.

## 8. Tests mínimos (checkeables; ampliables en ejecución)
- [ ] Alta que viola prerrequisito -> rechazada con mensaje de negocio.
- [ ] Alta que viola correquisito -> rechazada.
- [ ] Alta que supera/no alcanza el umbral de créditos -> rechazada.
- [ ] Alta batch con una entrada inválida -> el lote se rechaza de forma atómica (ninguna materia queda agregada), con mensaje que identifica la entrada y el requisito incumplido (coherente con la semántica atómica de createPlanEntriesBatch).
- [ ] Alta válida -> persiste (no-regresión).

## 9. Factores transversales (checkeables)
- [ ] Logica server-side / MCP-ready: **aplica y es el objetivo.**
- [ ] Permisos (RBAC): aplica.
- [ ] Historial/auditoría: verificar si el alta escribe DataLog; si lo hace, se preserva.
- [ ] Convenciones de mod: aplica (override N0 del genérico, resolver propio).
- [ ] i18n / a11y / Storybook: N/A.

## 10. Frontera core/mod (Aduana)
| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Guard de prerrequisitos en el create de planEntry | `mod-only` | Cambio en el resolver override propio de cd (N0); reusa el twin server ya existente | logic/sectionValidation.resolver.js:202-221; planEntry-batch.resolver.js:154-160; evaluateRequirementTree.js; requirementTreeLoader.js; planEntryDeletionRequirementGuard.js (patrón del delete) |

**Veredicto global:** `todo-mod-only`. Es resolver propio de cd; al ser N0 cierra UI + MCP + cross-client. No requiere tocar el core. Detalle en [CD-01-aduana](CD-01-aduana).

## 11. Dependencias
- **Depende de:** nada. Es el más urgente y autocontenido.
- **Relación:** comparte dominio de requisitos con CD-03 (ensamblado) y CD-02 (K<=N).

## 12. Estimación
2-3 SP. Justificación: el evaluador y el loader ya existen; el trabajo es cablearlos como guard de CREATE (análogo al de delete) + tests. El rango lo mueve cuánto difieren las firmas create vs delete.

## 13. Decisiones abiertas
- [ ] **D1 (prioridad · decide PO):** cuándo cerrar este riesgo vigente; recomendado: ya. Estado verificado 2026-09-14: hueco abierto (evaluador solo en el borrado). Ver [Decisiones para el PO](DECISIONES-PO-estado-verificado).
- [ ] (Técnica) La atomicidad del batch ante una entrada inválida conviene definirla: rechazar el lote completo vs la entrada; recomendación: coherente con la semántica atómica actual de `createPlanEntriesBatch`.

## 14. Guía de ejecución: reglas y patrones up1 a considerar
- **[A favor]** Reusar el twin server `evaluateRequirementTree.js` + `requirementTreeLoader.js`, cableándolo como guard de CREATE igual que `planEntryDeletionRequirementGuard.js` lo hace para el borrado. _Fuente: logic/planEntryDeletionRequirementGuard.js._
- **[Gate]** La regla va en el override N0, no en el cliente ni en una tool: así cubre todas las vías. _Fuente: Análisis cd, sección 8._
- **[Advertencia]** El alta batch es atómica: definir el comportamiento ante una entrada inválida coherente con `createPlanEntriesBatch`. _Fuente: logic/planEntry-batch.resolver.js._
- **[Transversal]** Tenant isolation + RBAC. _Fuente: up1/CLAUDE.md._

## 15. Tickets relacionados
| Ticket | Qué es | Relación | Estado |
|---|---|---|---|
| CD-02 | K<=N en pools | Mismo dominio de requisitos | Planeado |
| CD-03 | Ensamblado del árbol de requisitos | Mismo dominio | Planeado |
| CD-05 | Lectura (árbol de requisitos) | Ayuda a validar este guard | Planeado |
| UPONE-1267 | Epic Curriculum Design | Contenedor | (a confirmar en Jira) |

## 16. Referencias
Análisis cd para el MCP (gap #1), Comparativo cm vs cd (punto más urgente), Decisiones para el PO (D1), código del mod (logic/sectionValidation.resolver.js, planEntry-batch.resolver.js, evaluateRequirementTree.js, requirementTreeLoader.js, planEntryDeletionRequirementGuard.js), cliente (CurriculumMesh/evaluateRequirementTree.logic.ts, prereqCheck.logic.ts).
