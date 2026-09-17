---
id: DOC-kb-sp11-CM-06-matriz-adopcion-masiva
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
  - adopcion
  - CM-06
---

# CM-06 · Matriz: adopción (alcance + operaciones masivas) — detalle

**Identificador interno:** CM-06 (sin código de Jira todavía; mapear a UPONE-xxxx al crear el issue). Tipo: feature. Epic probable: Curriculum Mapping (UPONE-1452). Asignado: propio. Story Points: 2-3. Parte de [Plan cm MCP-ready opción mod](PLAN-cm-mcp-ready-opcion-mod). Pre-intake en [CM-06-pre-intake](CM-06-pre-intake). Evidencia de frontera en [CM-06-aduana](CM-06-aduana).

## 1. Fuente canónica
Sin ticket Jira todavía. Fuente: [alcance sp11](DOC-alcance-sp11) + [Ticket cm auto-gobierno](Ticket-cm-auto-gobierno-en-el-MCP-sin-modificar-el-core-del-MCP-Camino-1) (Fase 2, tools de adopción; sección 8.2 flujo doble de addSelected).

## 2. Historia de usuario
Como coordinador curricular que opera up1 por el asistente, quiero definir sobre quién se mide una matriz y administrar sus adopciones en lote por el asistente, respetando las mismas reglas que la pantalla, para gestionar el alcance sin corromper la vigencia.

## 3. Objetivo
Traspasar al MCP la pestaña Adopción: el alcance de adopción de la matriz y las operaciones masivas de altas, cierres, borrados y reconciliación.

## 4. Contexto (para dimensionar)
- **Fix vs feature:** feature (exposición).
- **Qué existe:** las mutations gobernadas de adopción ya existen, con semántica de lote (aceptan la lista completa, trocean adentro en una sola transacción, y saltean filas por motivo de fila en vez de tirar el lote).
- **Linaje:** las operaciones en lote existen porque la acción masiva de la pantalla hacía una request por fila. El alcance (scope) es una decisión independiente del gobierno (ownerUnits dice quién aprueba; scopeUnits, quién usa).
- **Deuda:** contrato/fieldDocs de adopción.

## 5. Alcance
**Dentro:** tools de setear alcance, alta por ids, alta por filtro, reconciliación, cierre en lote y borrado en lote; documentar el flujo doble de addSelected y la semántica de salteo por fila.
**Fuera:** las operaciones de UNA fila (cierre/borrado/exención individual), que van en CM-07; cabecera/árbol.

## 6. Criterios de aceptación (checkeables)
- [ ] El asistente puede setear el alcance de adopción de una matriz (scope, policy, scopeUnits).
- [ ] El asistente puede dar de alta adopciones por lista de ids y por criterio de filtro.
- [ ] El asistente puede reconciliar adopciones (altas + updates + cierres + borrados) según decisiones.
- [ ] El asistente puede cerrar y borrar adopciones en lote, con la semántica de salteo por fila (ya cerrada / rango invertido / id inexistente se saltean, no tiran el lote) y devolviendo qué quedó sin tocar.
- [ ] El borrado en lote solo procede mientras la matriz nunca estuvo vigente; publicada, la operación correcta es cerrar (guard RA-8).
- [ ] Toda escritura pasa por las mutations gobernadas; ninguna usa el CRUD genérico.

## 7. Definition of Done (checkeable)
- [ ] **Estándar de terminado del equipo:** cada criterio de aceptación tiene test o "N/A" justificado, verificado en el gate de cierre (RULE-dev-013); escritura gobernada por mutations `*Validated`, nunca CRUD genérico ni Prisma directo (RULE-curriculum-design-003, RULE-mcp-011); lógica server-side / MCP-ready, ninguna vía de escritura saltea las reglas (RULE-server-side-logic-mcp-ready); tests unitarios verdes + typecheck (vue-tsc) en checkout limpio (RULE-mods-052, RULE-mods-058); smoke visual para cambios de UI o "N/A" justificado (RULE-curriculum-design-029); RBAC efectivo, un rol sin capability no ejecuta ni ve (RULE-mcp-004, RULE-layout-039); tenant isolation preservado; si toca archivos sincronizados, correr el sync sin dejar artefactos sin generar (RULE-dev-010).
- [ ] Específico de este ticket:
- [ ] Evidencia runtime de cada tool, incluido un lote con filas salteadas.
- [ ] No-regresión: no se modifica ninguna mutation existente.
- [ ] RBAC efectivo (capability competencynode:adopt).
- [ ] Contrato/fieldDocs de adopción para la guía.

## 8. Tests mínimos (checkeables; ampliables en ejecución)
- [ ] set scope -> persiste alcance + scopeUnits; el editor de adopciones se reevalúa contra lo guardado.
- [ ] add por ids -> se adoptan esos planes; add por filtro -> se adoptan los planes que cumplen el filtro.
- [ ] reconcile con decisiones + defaultDecision -> aplica altas/updates/cierres/borrados.
- [ ] close en lote con una fila ya cerrada / rango invertido / id inexistente -> se saltean, devuelve cuántas cerró y la lista sin tocar.
- [ ] remove en lote con matriz que ya estuvo vigente -> rechazado (RA-8); nunca vigente -> borra.
- [ ] Rol sin capability -> la tool no ejecuta.

## 9. Factores transversales (checkeables)
- [ ] i18n: N/A (mensajes de negocio del resolver).
- [ ] Accesibilidad / Storybook: N/A.
- [ ] Logica server-side / MCP-ready: aplica. Las tools llaman las `*Validated`; no saltean reglas.
- [ ] Permisos (RBAC): aplica (competencynode:adopt).
- [ ] Historial/auditoría: aplica (adopción escribe historial, logic/helpers/matrixAdoptionHistory.js).
- [ ] Convenciones de mod: aplica (escritura gobernada, fichas/registerExtra en `ai/`).

## 10. Frontera core/mod (Aduana)
| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| `cm_set_matrix_adoption_scope` | `mod-only` | Llama setMatrixAdoptionScopeValidated del mod | logic/matrixAdoption.schema.graphql |
| `cm_add_matrix_adoptions` / `..._by_filter` | `mod-only` | Llaman addMatrixAdoptions(...ByFilter)Validated del mod | logic/matrixAdoption.resolver.js |
| `cm_apply_matrix_adoption_reconciliation` | `mod-only` | Llama applyMatrixAdoptionReconciliationValidated del mod | logic/matrixAdoption.resolver.js; helpers/reconcileAdoptions.js |
| `cm_close_matrix_adoptions` / `cm_remove_matrix_adoptions` | `mod-only` | Llaman close/removeMatrixAdoptionsValidated (guard RA-8) del mod | logic/matrixAdoption.schema.graphql |
| registerExtra / fichas | `mod-only` (se consume) | API existente del motor del MCP | up1/mcp/src/mods/types.js:37 |

**Veredicto global:** `todo-mod-only`. Detalle en [CM-06-aduana](CM-06-aduana).

## 11. Dependencias
- **Depende de:** CM-04 (matrixId).
- **Relación:** CM-07 cubre las operaciones de UNA fila del mismo dominio de adopción.

## 12. Estimación
2-3 SP. Justificación: 6 tools sobre mutations existentes (altas por filtro/reconciliación pueden ir por registerExtra por su forma; el resto fichas) + contrato + documentar el flujo doble de addSelected.

## 13. Decisiones abiertas
- [ ] Ninguna bloqueante.

## 14. Guía de ejecución: reglas y patrones up1 a considerar
- **[Gate]** Escritura gobernada: mutations `*Validated`, nunca CRUD genérico. _Fuente: mods/curriculum-mapping/CLAUDE.md._
- **[A favor]** Las operaciones en lote aceptan la lista completa: pasar todo, el resolver trocea en una transacción. _Fuente: logic/matrixAdoption.schema.graphql (docstrings de close/removeMatrixAdoptions)._
- **[Advertencia]** Flujo doble: la UI (addSelected) puede disparar add_by_filter y luego add en secuencia, sin dependencia ni rollback. Reproducir llamando las dos tools en orden; documentarlo como único caso. _Fuente: MatrixAdoptionEditorElement.vue:2318-2384._
- **[Advertencia]** RA-8: desde que la matriz se publica, retirar un plan es cerrar (no borrar). _Fuente: logic/matrixAdoption.schema.graphql._
- **[Transversal]** Tenant isolation + RBAC. _Fuente: up1/CLAUDE.md._

## 15. Tickets relacionados
| Ticket | Qué es | Relación | Estado |
|---|---|---|---|
| CM-04 | Matriz: cabecera + medición | Prerrequisito (matrixId) | Planeado |
| CM-07 | Tools simples | Operaciones de adopción de UNA fila (mismo dominio) | Planeado |

## 16. Referencias
Alcance sp11, Ticket cm auto-gobierno (Fase 2, 8.2), código del mod (logic/matrixAdoption.resolver.js, matrixAdoption.schema.graphql, helpers/validateMatrixAdoption.js, reconcileAdoptions.js, matrixAdoptionHistory.js), MatrixAdoptionEditorElement.vue.
