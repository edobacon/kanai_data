---
id: DOC-kb-sp11-CM-05-matriz-arbol-rubrica-b4
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - ticket
  - cm-plan
  - detalle
  - arbol
  - integridad
  - B.4
  - CM-05
---

# CM-05 · Matriz: árbol + rúbrica + gap de integridad B.4 — detalle

**Identificador interno:** CM-05 (sin código de Jira todavía; mapear a UPONE-xxxx al crear el issue). Tipo: feature + fix (B.4 cierra un hueco de integridad). Epic probable: Curriculum Mapping (UPONE-1452). Asignado: propio. Story Points: 3-4. Parte de [Plan cm MCP-ready opción mod](PLAN-cm-mcp-ready-opcion-mod). Pre-intake en [CM-05-pre-intake](CM-05-pre-intake). Evidencia de frontera en [CM-05-aduana](CM-05-aduana).

## 1. Fuente canónica
Sin ticket Jira todavía. Fuente: [alcance sp11](DOC-alcance-sp11) + [Ticket cm auto-gobierno](Ticket-cm-auto-gobierno-en-el-MCP-sin-modificar-el-core-del-MCP-Camino-1) (Fase 2 tools de árbol + Fase 5 gap B.4).

## 2. Historia de usuario
Como coordinador curricular que opera up1 por el asistente, quiero construir y editar el árbol de competencias y sus rúbricas por el asistente, con la misma protección que la pantalla, para que no se generen rúbricas sobre una matriz sin escala de medición.

## 3. Objetivo
Traspasar al MCP la pestaña Competencias (árbol de competencias/subcompetencias + rúbrica por nivel) y cerrar el único hueco de integridad real del mod (B.4): que el árbol/rúbrica no se pueda crear sobre una matriz sin escala, y que cada nivel de rúbrica pertenezca a la escala de esa matriz.

## 4. Contexto (para dimensionar)
- **Fix vs feature:** feature (tools) + fix (B.4).
- **Qué existe:** upsertCompetencyTreeValidated (reemplazo total del árbol + rúbrica + niveles, en transacción) y deleteCompetencyNodesValidated. El resolver ya lee la config de la matriz (RT7, readMatrix) y ya valida que los niveles de desarrollo pertenezcan a su catálogo (assertLevelsInCatalog).
- **Hueco B.4 (verificado):** el resolver NO exige que la matriz tenga `performanceScaleId` antes de aceptar rúbrica, y NO valida que cada `RubricDescriptor.levelId` pertenezca a la escala de desempeño de ESA matriz (assertLevelsInCatalog cubre el eje de niveles de desarrollo, no el eje de la escala de la rúbrica). La UI lo bloquea en la barra de pestañas (CompetencyMatrixShell/tabs.ts), pero por MCP se podrían generar `RubricDescriptor.levelId` huérfanos.
- **Linaje:** es el gap surgido con la pestaña Medición (M-14): la matriz existe un rato sin escala, y el id dejó de garantizar que el árbol pueda operar.

## 5. Alcance
**Dentro:** tools de upsert del árbol (reemplazo total: competencias, subcompetencias, rúbrica, niveles) y de borrado de subárbol; el cierre de B.4 en el resolver propio de cm.
**Fuera:** cabecera/medición (CM-04); adopción (CM-06).

## 6. Criterios de aceptación (checkeables)
- [ ] El asistente puede crear/editar el árbol completo de una matriz (competencias, subcompetencias, rúbrica, niveles) por reemplazo total.
- [ ] El asistente puede borrar un subárbol; se borran también sus descendientes y sus rúbricas.
- [ ] El resolver rechaza el árbol/rúbrica si la matriz no tiene escala de desempeño elegida (B.4), con mensaje de negocio.
- [ ] El resolver rechaza un nivel de rúbrica cuyo `levelId` no pertenece a la escala de desempeño de esa matriz (B.4).
- [ ] El cierre de B.4 vale también para la pantalla (va en la `*Validated`, no solo en el MCP).
- [ ] Toda escritura pasa por la mutation gobernada; ninguna usa el CRUD genérico.

## 7. Definition of Done (checkeable)
- [ ] **Estándar de terminado del equipo:** cada criterio de aceptación tiene test o "N/A" justificado, verificado en el gate de cierre (RULE-dev-013); escritura gobernada por mutations `*Validated`, nunca CRUD genérico ni Prisma directo (RULE-curriculum-design-003, RULE-mcp-011); lógica server-side / MCP-ready, ninguna vía de escritura saltea las reglas (RULE-server-side-logic-mcp-ready); tests unitarios verdes + typecheck (vue-tsc) en checkout limpio (RULE-mods-052, RULE-mods-058); smoke visual para cambios de UI o "N/A" justificado (RULE-curriculum-design-029); RBAC efectivo, un rol sin capability no ejecuta ni ve (RULE-mcp-004, RULE-layout-039); tenant isolation preservado; si toca archivos sincronizados, correr el sync sin dejar artefactos sin generar (RULE-dev-010).
- [ ] Específico de este ticket:
- [ ] Evidencia runtime: upsert de árbol, borrado de subárbol, y los dos rechazos de B.4.
- [ ] No-regresión: el árbol de una matriz CON escala sigue funcionando igual que hoy (UI y MCP).
- [ ] Logica server-side / MCP-ready: B.4 vive en el resolver del servicio, no en el cliente.
- [ ] RBAC efectivo.
- [ ] Contrato/fieldDocs del árbol y la rúbrica para la guía.

## 8. Tests mínimos (checkeables; ampliables en ejecución)
- [ ] upsert de árbol con matriz con escala -> persiste (reemplazo total, transacción).
- [ ] upsert de árbol/rúbrica con matriz SIN performanceScaleId -> rechazado (B.4).
- [ ] upsert con un levelId de rúbrica fuera de la escala de la matriz -> rechazado (B.4).
- [ ] delete de subárbol -> borra el nodo, sus descendientes y sus rúbricas; ids ajenos a la matriz -> ignorados en silencio.
- [ ] No-regresión: caso de árbol válido pre-B.4 -> sigue pasando.

## 9. Factores transversales (checkeables)
- [ ] i18n: N/A (mensajes de negocio del resolver).
- [ ] Accesibilidad / Storybook: N/A.
- [ ] Logica server-side / MCP-ready: **aplica y es el corazón del ticket** (B.4 es la pieza server-side).
- [ ] Permisos (RBAC): aplica.
- [ ] Historial/auditoría: aplica (el árbol escribe historial vía competencyMatrixHistory.js).
- [ ] Convenciones de mod: aplica (escritura gobernada, resolver propio, fichas en `ai/`).

## 10. Frontera core/mod (Aduana)
| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| `cm_upsert_competency_tree` (registerExtra: reemplazo total, no reduce a ficha) | `mod-only` | Vive en el pack del mod; llama upsertCompetencyTreeValidated del mod | mods/curriculum-mapping/ai/; logic/competencyTree-upsert.resolver.js |
| `cm_delete_competency_nodes` (ficha, preview-confirm) | `mod-only` | Llama deleteCompetencyNodesValidated del mod | logic/competencyTree-upsert.schema.graphql |
| Cierre B.4 (precondición performanceScaleId + levelId pertenece a la escala) | `mod-only` | Cambio en el resolver propio de cm (logic/), NO en el core ni en object-manager | logic/competencyTree-upsert.resolver.js (readMatrix RT7 ~230; persistRubric); helpers/validateCompetencyTree.js |

**Veredicto global:** `todo-mod-only`. B.4, aunque es la única pieza server-side del plan, es trabajo del resolver propio de cm; el core no lo cubre y no hace falta tocarlo. Detalle en [CM-05-aduana](CM-05-aduana).

## 11. Dependencias
- **Depende de:** CM-04 (la matriz existe y tiene escala elegida). Respetar la dependencia de orden: escala antes del árbol.
- **Habilita:** que el árbol/rúbrica sea 1:1 UI vs asistente.

## 12. Estimación
3-4 SP. Justificación: 2 tools sobre mutations existentes (1-2 SP) + el cierre de B.4 en el resolver con sus tests (1-2 SP). El rango lo mueve cuánto trabajo de test de no-regresión pide el árbol.

## 13. Decisiones abiertas
- [ ] Ninguna bloqueante. (RP5, completitud de descriptores de rúbrica, es decisión de PO en CM-10 y no afecta el 1:1.)

## 14. Guía de ejecución: reglas y patrones up1 a considerar
- **[Gate]** Escritura gobernada: mutations `*Validated`, nunca CRUD genérico. _Fuente: mods/curriculum-mapping/CLAUDE.md._
- **[A favor]** B.4 se cierra en el resolver propio (logic/), análogo a la validación RT7 "la matriz existe" y a assertLevelsInCatalog para niveles de desarrollo. _Fuente: logic/competencyTree-upsert.resolver.js:230 (readMatrix); logic/helpers/nodeDevelopmentLevels.js:102 (assertLevelsInCatalog)._
- **[Advertencia]** El backend no reparte pesos: la tool manda pesos/estructura válidos (el reparto "100% en partes iguales" es conveniencia de UI, opcional replicar como helper). _Fuente: CompetencyRubricEditor/rubric.ts (cliente); validador server._
- **[Advertencia]** Dependencia de orden: elegir la escala (CM-04) antes del árbol. _Fuente: CompetencyMatrixShell/tabs.ts (requiresFields: performanceScaleId)._
- **[Transversal]** Tenant isolation + RBAC. _Fuente: up1/CLAUDE.md._

## 15. Tickets relacionados
| Ticket | Qué es | Relación | Estado |
|---|---|---|---|
| CM-04 | Matriz: cabecera + medición | Prerrequisito (matriz + escala) | Planeado |
| CM-10 | RM7/RP5 | RP5 (completitud de rúbrica) decisión de PO | Planeado |
| UPONE-1758 | Diagnóstico MCP de cm | Antecedente (identificó B.4) | Developing (a confirmar) |

## 16. Referencias
Alcance sp11, Ticket cm auto-gobierno (Fase 2 y 5), código del mod (logic/competencyTree-upsert.resolver.js, helpers/validateCompetencyTree.js, nodeDevelopmentLevels.js, competencyMatrixHistory.js), CompetencyMatrixShell/tabs.ts.
