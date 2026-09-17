---
id: DOC-kb-sp11-CM-07-tools-simples
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
  - tools-simples
  - redundante-si-core
  - CM-07
---

# CM-07 · Tools simples (alineación + adopción de a una) — detalle

**Identificador interno:** CM-07 (sin código de Jira todavía; mapear a UPONE-xxxx al crear el issue). Tipo: feature. Epic probable: Curriculum Mapping (UPONE-1452). Asignado: propio. Story Points: 1-2. Parte de [Plan cm MCP-ready opción mod](PLAN-cm-mcp-ready-opcion-mod). Pre-intake en [CM-07-pre-intake](CM-07-pre-intake). Evidencia de frontera en [CM-07-aduana](CM-07-aduana).

> **Ticket sensible a la decisión de core.** Es el ÚNICO del plan que SE ELIMINA si se implementa el arreglo en el core (el genérico gobernado cubriría estas escrituras de una fila). Decidir Camino A vs core ANTES de construirlo (ver sección 13).

## 0. Gate de pre-ejecución (OBLIGATORIO antes de arrancar)
Este ticket está condicionado al estado del fix de core (decisión **D6**). NO ejecutar sin correr primero el gate: ver [Gate de validación: estado de los fixes de core](GATE-validacion-estado-fix-core) y [Decisiones para el PO](DECISIONES-PO-estado-verificado).

- **Verificar Check B** (interceptores componibles en object-manager = D6). Correr el comando del gate y registrar el resultado con fecha abajo.
- **Decisión:** si Check B está implementado y verificado -> **NO construir / retirar CM-07** (el genérico gobernado cubre las escrituras de una fila). Si Check B NO está (estado a 2026-09-14) -> **construir CM-07** (plan seguro).

**Registro del gate:**
- [ ] 2026-09-14 — Check B (D6): NO implementado (object-manager mantiene dueño único en resolverIndex.js). Acción: construir. Re-verificar al momento de ejecutar.

## 1. Fuente canónica
Sin ticket Jira todavía. Fuente: [alcance sp11](DOC-alcance-sp11) + [Ticket cm auto-gobierno](Ticket-cm-auto-gobierno-en-el-MCP-sin-modificar-el-core-del-MCP-Camino-1) (Fase 3, tools simples).

## 2. Historia de usuario
Como coordinador curricular que opera up1 por el asistente, quiero crear/editar/borrar alineaciones de competencia (tributación) y operar adopciones de a una por el asistente, respetando las mismas reglas que la pantalla.

## 3. Objetivo
Traspasar al MCP las operaciones de UNA fila del dominio de cm: alineación de competencias (tributación) y adopción individual.

## 4. Contexto (para dimensionar)
- **Fix vs feature:** feature (exposición).
- **Qué existe:** las mutations gobernadas de una fila ya existen (tributación de UPONE-1756).
- **Linaje:** CompetencyAlignment es el objeto 1:1 puro (create/update/delete de una fila). Las de adopción de a una conviven con las masivas de CM-06.
- **Deuda:** contrato/fieldDocs.
- **Redundancia potencial:** si se hace el arreglo en el core, el genérico gobernado cubre estas operaciones y estas tools dejan de hacer falta.

## 5. Alcance
**Dentro:** tools de crear/editar/borrar alineación (guard R-1) y cerrar/borrar/eximir adopción de a una.
**Fuera:** las operaciones masivas de adopción (CM-06); la vista de tributación (lectura, CM-01).

## 6. Criterios de aceptación (checkeables)
- [ ] El asistente puede crear, editar y borrar una alineación de competencia (tributación); el borrado respeta el guard R-1.
- [ ] El asistente puede cerrar, borrar y setear exención de una adopción individual.
- [ ] Toda escritura pasa por las mutations gobernadas; ninguna usa el CRUD genérico.

## 7. Definition of Done (checkeable)
- [ ] **Estándar de terminado del equipo:** cada criterio de aceptación tiene test o "N/A" justificado, verificado en el gate de cierre (RULE-dev-013); escritura gobernada por mutations `*Validated`, nunca CRUD genérico ni Prisma directo (RULE-curriculum-design-003, RULE-mcp-011); lógica server-side / MCP-ready, ninguna vía de escritura saltea las reglas (RULE-server-side-logic-mcp-ready); tests unitarios verdes + typecheck (vue-tsc) en checkout limpio (RULE-mods-052, RULE-mods-058); smoke visual para cambios de UI o "N/A" justificado (RULE-curriculum-design-029); RBAC efectivo, un rol sin capability no ejecuta ni ve (RULE-mcp-004, RULE-layout-039); tenant isolation preservado; si toca archivos sincronizados, correr el sync sin dejar artefactos sin generar (RULE-dev-010).
- [ ] Específico de este ticket:
- [ ] Evidencia runtime de cada tool.
- [ ] No-regresión: no se modifica ninguna mutation existente.
- [ ] RBAC efectivo.
- [ ] Contrato/fieldDocs de alineación y adopción de a una.

## 8. Tests mínimos (checkeables; ampliables en ejecución)
- [ ] create/update de una alineación válida -> queda guardada; delete de una alineación en la condición que R-1 bloquea -> se rechaza con mensaje; sin esa condición -> se elimina.
- [ ] close/remove/exempt de una adopción -> aplicado; con estado de matriz que lo impide -> rechazado.
- [ ] Rol sin capability -> la tool no ejecuta.

## 9. Factores transversales (checkeables)
- [ ] i18n: N/A (mensajes del resolver).
- [ ] Accesibilidad / Storybook: N/A.
- [ ] Logica server-side / MCP-ready: aplica.
- [ ] Permisos (RBAC): aplica.
- [ ] Historial/auditoría: aplica (alineación/adopción escriben historial).
- [ ] Convenciones de mod: aplica.

## 10. Frontera core/mod (Aduana)
| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| `cm_create/update/delete_competency_alignment` (fichas) | `mod-only` | Llaman create/update/deleteCompetencyAlignmentValidated (guard R-1) del mod | logic/competencyAlignment.schema.graphql; competencyAlignment.resolver.js |
| `cm_close/remove/set_exemption_matrix_adoption` (fichas) | `mod-only` | Llaman close/remove/setMatrixAdoptionExemptionValidated del mod | logic/matrixAdoption.schema.graphql |
| registerExtra / fichas | `mod-only` (se consume) | API existente del motor del MCP | up1/mcp/src/mods/types.js:37 |

**Veredicto global:** `todo-mod-only`, con reajuste: estas tools son las que el arreglo en el core volvería redundantes (escrituras de una fila cubiertas por el genérico gobernado). Detalle en [CM-07-aduana](CM-07-aduana).

## 11. Dependencias
- **Depende de:** nada (alineación) / CM-04 para adopción de a una.
- **Relación:** CM-06 (operaciones masivas del mismo dominio).

## 12. Estimación
1-2 SP. Justificación: 6 tools de una fila sobre mutations existentes (fichas) + contrato.

## 13. Decisiones abiertas
- [ ] **D6 · Camino A vs core, antes de construir CM-07.** Resuelto por el Gate de pre-ejecución (sección 0): si el core está verificado, se saltea; si no, se construye. Estado verificado 2026-09-14: core NO implementado -> se construye. Recomendación: no bloquear el sprint esperando el core. Ver [Decisiones para el PO](DECISIONES-PO-estado-verificado).

## 14. Guía de ejecución: reglas y patrones up1 a considerar
- **[Gate]** Escritura gobernada: mutations `*Validated`, nunca CRUD genérico. _Fuente: mods/curriculum-mapping/CLAUDE.md._
- **[A favor]** Fichas declarativas (una llamada por operación); delete con preview-confirm. _Fuente: up1/mcp/src/tools/register-declarative-tools.js._
- **[Advertencia]** Guard R-1 en el borrado de alineación: revisar la condición antes de exponer el mensaje. _Fuente: logic/helpers/alignmentRules.js._
- **[Transversal]** Tenant isolation + RBAC. _Fuente: up1/CLAUDE.md._

## 15. Tickets relacionados
| Ticket | Qué es | Relación | Estado |
|---|---|---|---|
| CM-06 | Adopción masiva | Mismo dominio, operaciones en lote | Planeado |
| CM-01 | Lectura de dominio | Vista de tributación (lectura) | Planeado |
| CM-CORE | Arreglo en el core (follow-up) | Volvería redundante a CM-07 (D6) | No comprometido |

## 16. Referencias
Alcance sp11, Ticket cm auto-gobierno (Fase 3), El arreglo en el core (redundancia de las tools simples), Gate de validación estado fix core, Decisiones para el PO (D6), código del mod (logic/competencyAlignment.*, matrixAdoption.*, helpers/alignmentRules.js).
