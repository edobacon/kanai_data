---
id: DOC-kb-sp11-CM-01-lectura-dominio
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
  - lectura
  - CM-01
---

# CM-01 · Lectura de dominio al MCP (6 queries) — detalle

**Identificador interno:** CM-01 (sin código de Jira todavía; mapear a UPONE-xxxx al crear el issue). Tipo: feature (exposición). Epic probable: Curriculum Mapping (UPONE-1452). Asignado: propio. Story Points: 2-4. Parte de [Plan cm MCP-ready opción mod](PLAN-cm-mcp-ready-opcion-mod). Pre-intake en [CM-01-pre-intake](CM-01-pre-intake). Evidencia de frontera en [CM-01-aduana](CM-01-aduana).

## 1. Fuente canónica
No hay ticket Jira todavía (identificador interno de proceso). La fuente es el material de planning de sp11: [alcance sp11](DOC-alcance-sp11) (bloques C3/C4, migración de cm al MCP) y la [Matriz de MCP-readiness](Matriz-MCP-readiness-cm-y-cd-estado-dependencias-decisiones-esfuerzo-y-de-avance) (dimensión Lectura, cm ~15%).

## 2. Historia de usuario
Como coordinador curricular que opera up1 por el asistente, quiero que el asistente pueda consultar el estado agregado de la matriz de competencia y sus mantenedores, para decidir qué escribir sin corromper datos ni adivinar.

## 3. Objetivo
Exponer las 6 queries de dominio de cm como tools de lectura del MCP, para cubrir la dimensión Lectura (hoy 0 queries expuestas). Solo lectura; no toca escritura.

## 4. Contexto (para dimensionar)
- **Fix vs feature:** feature de exposición. Las queries YA existen en el backend del mod; falta declararlas como tools.
- **Qué existe:** las 6 queries de dominio (verificadas). El pack del mod hoy declara `tools: []` (mods/curriculum-mapping/ai/index.js:38).
- **Linaje:** la matriz de readiness identificó Lectura como el cuello real: un agente puede escribir algo pero no leer el estado agregado para decidir qué escribir. El CRUD genérico de lectura no reconstruye estas vistas (tributación, vigencia de adopción, reconciliador).
- **Deuda conceptual:** se hace junto con la guía (contratos) para que el agente sepa interpretar cada resultado.

## 5. Alcance
**Dentro:** exponer como tools de lectura del MCP las 6 queries de dominio del mod, con su descripción y forma de resultado.
**Fuera:** cualquier escritura (va en CM-02..CM-07); construir agregaciones nuevas (las 6 ya existen); lectura de objetos por el genérico (ya disponible).

## 6. Criterios de aceptación (checkeables)
- [ ] El asistente puede consultar las matrices adoptadas por un plan.
- [ ] El asistente puede consultar la vista de alineación (tributación) de un plan contra una matriz.
- [ ] El asistente puede listar las alineaciones de competencia por plan o por nodo.
- [ ] El asistente puede consultar la reconciliación de adopciones de una matriz (resumen y página por grupo).
- [ ] El asistente puede consultar el estado de adopción de una matriz.
- [ ] Cada tool devuelve el mismo agregado que la pantalla, respetando el control de permisos (RBAC) del backend.

## 7. Definition of Done (checkeable)
- [ ] **Estándar de terminado del equipo:** cada criterio de aceptación tiene test o "N/A" justificado, verificado en el gate de cierre (RULE-dev-013); escritura gobernada por mutations `*Validated`, nunca CRUD genérico ni Prisma directo (RULE-curriculum-design-003, RULE-mcp-011); lógica server-side / MCP-ready, ninguna vía de escritura saltea las reglas (RULE-server-side-logic-mcp-ready); tests unitarios verdes + typecheck (vue-tsc) en checkout limpio (RULE-mods-052, RULE-mods-058); smoke visual para cambios de UI o "N/A" justificado (RULE-curriculum-design-029); RBAC efectivo, un rol sin capability no ejecuta ni ve (RULE-mcp-004, RULE-layout-039); tenant isolation preservado; si toca archivos sincronizados, correr el sync sin dejar artefactos sin generar (RULE-dev-010).
- [ ] Específico de este ticket:
- [ ] Evidencia runtime: sobre datos sembrados, cada tool devuelve el mismo conjunto que muestra la pantalla para ese caso.
- [ ] No-regresión: no se modifica ninguna query ni resolver existente (solo se exponen).
- [ ] RBAC efectivo: un rol sin permiso de lectura no obtiene datos por la tool.
- [ ] Contratos/fieldDocs de cada resultado para que `get_create_guide`/el agente interpreten los campos.

## 8. Tests mínimos (checkeables; ampliables en ejecución)
- [ ] adoptedMatricesForPlan(planId) -> devuelve exactamente las matrices adoptadas por ese plan.
- [ ] competencyAlignmentView(planId, matrixId) -> devuelve, por competencia, en qué materias tributa.
- [ ] listCompetencyAlignments(planId | competencyNodeId) -> devuelve solo las alineaciones del plan o del nodo indicado.
- [ ] reconcileMatrixAdoptions(matrixId) + reconcileGroupPage(matrixId, group, limit, offset) -> resumen por grupo y página con total.
- [ ] Consulta de adopción de matriz -> devuelve el alcance y los planes vigentes de esa matriz.
- [ ] Con un rol sin capability de lectura -> la tool no expone datos.

## 9. Factores transversales (checkeables)
- [ ] i18n: N/A (tools de lectura, sin UI nueva).
- [ ] Accesibilidad: N/A.
- [ ] Storybook: N/A.
- [ ] Logica server-side / MCP-ready: aplica. Son lecturas; no introducen escritura que saltee reglas.
- [ ] Permisos (RBAC): aplica. Las queries corren con el contexto del usuario y respetan sus capabilities.
- [ ] Historial/auditoría: N/A (lectura).
- [ ] Convenciones de mod: aplica. Las tools se declaran como fichas en `ai/` del mod (schema-driven), sin tocar el core.

## 10. Frontera core/mod (Aduana)
| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| 6 tools de lectura (fichas `operation:"query"`) | `mod-only` | Se declaran en el pack del mod; llaman queries que ya viven en el mod | mods/curriculum-mapping/ai/index.js:38; logic/*.resolver.js |
| Mecanismo de registro de tools de lectura | `mod-only` (se consume, no se crea) | El motor del MCP ya soporta `operation:"query"` de forma nativa | up1/mcp/src/mods/types.js:14; src/tools/register-declarative-tools.js:8 |

**Veredicto global:** `todo-mod-only`. Se ejecuta dentro del mod, sin coordinación con core. Detalle en [CM-01-aduana](CM-01-aduana).

## 11. Dependencias
- **Habilita:** CM-02..CM-07 (leer el estado antes de decidir qué escribir). Recomendado como primer ticket.
- **Depende de:** nada.

## 12. Estimación
2-4 SP. Justificación: 6 queries a exponer como fichas + sus contratos de resultado; sin lógica nueva. El rango lo mueve cuántos resultados necesitan un contrato de campos rico vs uno mínimo.

## 13. Decisiones abiertas
- [ ] Ninguna bloqueante. (El soporte de tools de lectura en el motor quedó verificado: `operation:"query"`.)

## 14. Guía de ejecución: reglas y patrones up1 a considerar
- **[A favor]** La lectura por CRUD genérico o consulta directa está permitida; estas tools solo empaquetan queries de dominio que el genérico no reconstruye. _Fuente: mods/curriculum-mapping/CLAUDE.md (escrituras gobernadas; lectura libre)._
- **[A favor]** Declarar las tools como fichas declarativas (`operation:"query"`, sin `writePattern`). _Fuente: up1/mcp/src/tools/register-declarative-tools.js._
- **[Evitar]** Exponer ids internos o rutas locales en los resultados hacia el usuario. _Fuente: instrucciones del MCP de up1 (no exponer nombres/ids técnicos)._
- **[Transversal]** Respetar tenant isolation y el contexto de permisos del usuario en cada query. _Fuente: up1/CLAUDE.md._

## 15. Tickets relacionados
| Ticket | Qué es | Relación | Estado |
|---|---|---|---|
| CM-02..CM-07 | Tools de escritura de cm | Consumen la lectura para decidir | Planeados (este proceso) |
| UPONE-1758 | Diagnóstico MCP de Curriculum Mapping | Antecedente (marcó lectura como cuello) | Developing (a confirmar en Jira) |
| UPONE-1452 | Epic Curriculum Mapping | Contenedor | (a confirmar en Jira) |

## 16. Referencias
Alcance sp11, Matriz de MCP-readiness (dimensión Lectura), código del mod (logic/*.resolver.js), motor del MCP (up1/mcp/src/tools/register-declarative-tools.js).
