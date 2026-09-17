---
id: DOC-kb-sp11-CD-02-consistencia-k-de-n
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
  - k-de-n
  - CD-02
---

# CD-02 · Consistencia K<=N en pools K-de-N (gap de integridad) — detalle

**Identificador interno:** CD-02 (sin código de Jira todavía; mapear a UPONE-xxxx al crear el issue). Tipo: fix (integridad). Epic probable: Curriculum Design (UPONE-1267). Asignado: propio. Story Points: 0.5-1. Parte de [Plan cd MCP-ready opción mod](PLAN-cd-mcp-ready-opcion-mod). Pre-intake en [CD-02-pre-intake](CD-02-pre-intake). Evidencia de frontera en [CD-02-aduana](CD-02-aduana).

## 1. Fuente canónica
Sin ticket Jira todavía. Fuente: [Análisis cd para el MCP](Analisis-cd-para-el-MCP-paridad-1-1-postura-blockGeneric-y-gaps-client-side) (gap client-only #3).

## 2. Historia de usuario
Como responsable del plan de estudios, quiero que un pool "K de N" no pueda persistir con K mayor que la cantidad de hijos normativos, para que no queden requisitos imposibles de satisfacer.

## 3. Objetivo
Cerrar el gap: validar en el servidor que `minToSatisfy` (K) sea menor o igual a la cantidad de hijos normativos (N), en el dispatch de requirement.

## 4. Contexto (para dimensionar)
- **Fix vs feature:** fix de integridad.
- **Qué existe:** el cliente deriva K y solo REPORTA si K>N, no bloquea (`deriveMinToSatisfy`, `curriculumMesh.logic.ts:557-561`). El schema solo exige `minToSatisfy>=1`; ningún guard server valida K<=N.
- **Impacto:** por el genérico/MCP se persiste un requisito imposible (K>N).
- **Portabilidad ALTA:** invariante simple en el dispatch de requirement.

## 5. Alcance
**Dentro:** invariante server K<=N al crear/editar un requisito K-de-N.
**Fuera:** el ensamblado estructural del árbol (CD-03).

## 6. Criterios de aceptación (checkeables)
- [ ] Crear/editar un requisito con K > N (hijos normativos) es rechazado con mensaje de negocio.
- [ ] K <= N sigue aceptándose.
- [ ] La regla vale para pantalla, genérico y tools (va en el resolver).

## 7. Definition of Done (checkeable)
- [ ] **Estándar de terminado del equipo:** cada criterio de aceptación tiene test o "N/A" justificado, verificado en el gate de cierre (RULE-dev-013); escritura por el camino gobernado del módulo (en cd, los overrides N0 del genérico), sin saltear las reglas (RULE-curriculum-design-003, RULE-server-side-logic-mcp-ready); tests unitarios verdes + typecheck (vue-tsc) en checkout limpio (RULE-mods-052, RULE-mods-058); smoke visual para cambios de UI o "N/A" justificado (RULE-curriculum-design-029); RBAC efectivo, un rol sin capability no ejecuta ni ve (RULE-mcp-004, RULE-layout-039); tenant isolation preservado; si toca archivos sincronizados, correr el sync sin dejar artefactos sin generar (RULE-dev-010).
- [ ] Específico de este ticket:
- [ ] Evidencia runtime: K>N rechazado; K<=N aceptado.
- [ ] Logica server-side / MCP-ready: la regla vive en el resolver.
- [ ] No-regresión.

## 8. Tests mínimos (checkeables; ampliables en ejecución)
- [ ] K=N+1 -> rechazado.
- [ ] K=N -> aceptado.
- [ ] Editar un pool bajando N por debajo de K -> rechazado.

## 9. Factores transversales (checkeables)
- [ ] Logica server-side / MCP-ready: aplica.
- [ ] Permisos (RBAC): aplica.
- [ ] Convenciones de mod: aplica (override N0, dispatch de requirement).
- [ ] i18n / a11y / Storybook / historial: N/A (o hereda si el requisito audita).

## 10. Frontera core/mod (Aduana)
| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Invariante K<=N en el dispatch de requirement | `mod-only` | Cambio en el resolver override propio de cd | logic (dispatch de requirement, override N0); curriculumMesh.logic.ts:557-561 (lógica cliente de referencia) |

**Veredicto global:** `todo-mod-only`. Detalle en [CD-02-aduana](CD-02-aduana).

## 11. Dependencias
- **Relación:** mismo dominio de requisitos que CD-01 y CD-03.

## 12. Estimación
0.5-1 SP. Justificación: invariante simple con sus tests.

## 13. Decisiones abiertas
- [ ] Ninguna.

## 14. Guía de ejecución: reglas y patrones up1 a considerar
- **[Gate]** La regla va en el resolver (N0), no en el cliente. _Fuente: Análisis cd, sección 3._
- **[A favor]** "Hijos normativos" es el N a contar: definir N según la semántica ya usada por `deriveMinToSatisfy`. _Fuente: curriculumMesh.logic.ts:557-561._
- **[Transversal]** Tenant isolation + RBAC. _Fuente: up1/CLAUDE.md._

## 15. Tickets relacionados
| Ticket | Qué es | Relación | Estado |
|---|---|---|---|
| CD-01 | Prereq en el alta | Mismo dominio | Planeado |
| CD-03 | Ensamblado del árbol | Mismo dominio (forma del árbol) | Planeado |

## 16. Referencias
Análisis cd para el MCP (gap #3), código del mod (dispatch de requirement, override N0), cliente (curriculumMesh.logic.ts:557-561).
