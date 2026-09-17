---
id: DOC-kb-sp11-CM-04-matriz-cabecera-medicion
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
  - matriz
  - CM-04
---

# CM-04 · Matriz: cabecera + medición + estado al MCP — detalle

**Identificador interno:** CM-04 (sin código de Jira todavía; mapear a UPONE-xxxx al crear el issue). Tipo: feature. Epic probable: Curriculum Mapping (UPONE-1452). Asignado: propio. Story Points: 1.5-2. Parte de [Plan cm MCP-ready opción mod](PLAN-cm-mcp-ready-opcion-mod). Pre-intake en [CM-04-pre-intake](CM-04-pre-intake). Evidencia de frontera en [CM-04-aduana](CM-04-aduana).

## 1. Fuente canónica
Sin ticket Jira todavía. Fuente: [alcance sp11](DOC-alcance-sp11) + [Ticket cm auto-gobierno](Ticket-cm-auto-gobierno-en-el-MCP-sin-modificar-el-core-del-MCP-Camino-1) (Fase 2, tool de matriz; sección 8.2 sobre payload parcial y ciclo de estado).

## 2. Historia de usuario
Como coordinador curricular que opera up1 por el asistente, quiero crear una matriz de competencia, configurar su medición (escala, niveles, modelo) y avanzar su estado por el asistente, respetando las mismas reglas que la pantalla, para dejarla lista para el árbol y la adopción.

## 3. Objetivo
Traspasar al MCP el mantenedor central de la vista principal: los datos generales de la matriz (pestaña General) y la configuración de medición y el ciclo de estado (pestaña Medición).

## 4. Contexto (para dimensionar)
- **Fix vs feature:** feature (exposición de escritura de dominio).
- **Qué existe:** las mutations create/updateCompetencyMatrixValidated ya existen, aceptan payload parcial y llevan el gate assertPublishable adentro. La matriz nace sin escala ni niveles (columnas nullable a propósito), y la obligatoriedad se corre a la publicación.
- **Linaje:** el shell de la matriz reparte 4 pestañas sobre 3 mutations; General y Medición comparten la mutation de cabecera con payload parcial.
- **Deuda:** contrato/fieldDocs de la matriz (identidad, gobierno, medición, estado).

## 5. Alcance
**Dentro:** una tool de guardado de matriz que cubra crear (identidad + gobierno: name, code, matrixType, ownerUnits), editar cabecera, configurar medición (escala, niveles, modelo, ejes de consolidación) y setear estado, todo por payload parcial.
**Fuera:** el árbol/rúbrica (CM-05); la adopción (CM-06); construir los mantenedores de escala/niveles (CM-02/CM-03).

## 6. Criterios de aceptación (checkeables)
- [ ] El asistente puede crear una matriz con su identidad y gobierno, respetando unicidad de código entre matrices y al menos una unidad dueña.
- [ ] El asistente puede editar la cabecera y la configuración de medición por payload parcial (mandar un subconjunto de campos no toca el resto).
- [ ] El asistente puede setear el estado de la matriz (Draft/InReview/Approved/Active/Deprecated/Archived); el gate assertPublishable corre dentro de la misma operación.
- [ ] Publicar y retirar (Deprecated/Archived, RM7) es la misma operación con `status` en el payload, no una operación de transición aparte.
- [ ] La matriz puede existir sin escala ni niveles; la obligatoriedad solo se exige al publicar.
- [ ] Toda escritura pasa por la mutation gobernada; ninguna usa el CRUD genérico.

## 7. Definition of Done (checkeable)
- [ ] **Estándar de terminado del equipo:** cada criterio de aceptación tiene test o "N/A" justificado, verificado en el gate de cierre (RULE-dev-013); escritura gobernada por mutations `*Validated`, nunca CRUD genérico ni Prisma directo (RULE-curriculum-design-003, RULE-mcp-011); lógica server-side / MCP-ready, ninguna vía de escritura saltea las reglas (RULE-server-side-logic-mcp-ready); tests unitarios verdes + typecheck (vue-tsc) en checkout limpio (RULE-mods-052, RULE-mods-058); smoke visual para cambios de UI o "N/A" justificado (RULE-curriculum-design-029); RBAC efectivo, un rol sin capability no ejecuta ni ve (RULE-mcp-004, RULE-layout-039); tenant isolation preservado; si toca archivos sincronizados, correr el sync sin dejar artefactos sin generar (RULE-dev-010).
- [ ] Específico de este ticket:
- [ ] Evidencia runtime: crear, editar por payload parcial, y transición de estado (incluida una a Deprecated/Archived).
- [ ] No-regresión: no se modifica ninguna mutation existente.
- [ ] RBAC efectivo: capabilities de matriz se respetan.
- [ ] Contrato/fieldDocs de la matriz para la guía.

## 8. Tests mínimos (checkeables; ampliables en ejecución)
- [ ] create con identidad+gobierno válidos -> persiste; con código repetido -> rechazado; sin unidad dueña -> rechazado.
- [ ] update con subconjunto de campos -> solo cambia esos (payload parcial).
- [ ] update de medición (escala/niveles/modelo/ejes) -> persiste.
- [ ] set status a Approved sin cumplir assertPublishable -> rechazado; con condiciones cumplidas -> avanza.
- [ ] retiro por status (Deprecated/Archived) -> aplicado por la misma tool.
- [ ] Rol sin capability -> la tool no ejecuta.

## 9. Factores transversales (checkeables)
- [ ] i18n: N/A (mensajes de negocio vienen del resolver).
- [ ] Accesibilidad / Storybook: N/A.
- [ ] Logica server-side / MCP-ready: aplica. La tool llama la `*Validated`; no saltea reglas.
- [ ] Permisos (RBAC): aplica.
- [ ] Historial/auditoría: aplica. La matriz escribe historial (logic/helpers/competencyMatrixHistory.js); se hereda al llamar la `*Validated`.
- [ ] Convenciones de mod: aplica (RecordType rt__Matrix__competencynode, escritura gobernada, fichas en `ai/`).

## 10. Frontera core/mod (Aduana)
| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| `cm_save_competency_matrix` (registerExtra: crea-o-edita según exista) | `mod-only` | Vive en el pack del mod; llama create/updateCompetencyMatrixValidated del mod | mods/curriculum-mapping/ai/; logic/competencyMatrix-create.resolver.js; competencyMatrix-update.resolver.js |
| Gate assertPublishable (dentro de la mutation) | `mod-only` | Ya vive en el resolver del mod; se hereda | logic/helpers/assertPublishable.js |
| Mecanismo registerExtra | `mod-only` (se consume) | API existente del motor del MCP | up1/mcp/src/mods/types.js:37 |

**Veredicto global:** `todo-mod-only`. Detalle en [CM-04-aduana](CM-04-aduana).

## 11. Dependencias
- **Depende de:** CM-02 y CM-03 (en Medición se elige una escala y un esquema de niveles existentes). Prerrequisito de CM-05 y CM-06 (dan el matrixId).
- **Habilita:** CM-05 (árbol), CM-06 (adopción).

## 12. Estimación
1.5-2 SP. Justificación: una tool sobre mutations existentes (registerExtra por ser crea-o-edita) + contrato. El payload parcial y el `status` ya los soporta la mutation (restricción de diseño, no costo nuevo).

## 13. Decisiones abiertas
- [ ] Ninguna bloqueante para la tool. (RM7 como delete real de matriz es decisión de PO, en CM-10; aquí el retiro es por `status`.)

## 14. Guía de ejecución: reglas y patrones up1 a considerar
- **[Gate]** Escritura gobernada: mutations `*Validated`, nunca CRUD genérico. _Fuente: mods/curriculum-mapping/CLAUDE.md._
- **[A favor]** La mutation acepta payload parcial ("omitir un campo = no tocarlo"): la tool reproduce el guardado por etapas eligiendo qué campos manda. _Fuente: logic/competencyMatrix-update.resolver.js (data: JSON!)._
- **[A favor]** `status` viaja dentro del payload; el gate assertPublishable corre adentro. No crear una tool de transición aparte. _Fuente: objects/RecordTypes/rt__Matrix__competencynode.json; logic/helpers/assertPublishable.js._
- **[Advertencia]** Dependencia de orden: crear la matriz (obtener matrixId) antes de árbol/adopción. _Fuente: CompetencyMatrixShell/tabs.ts (requiresRecord)._
- **[Transversal]** Tenant isolation + RBAC en cada llamada. _Fuente: up1/CLAUDE.md._

## 15. Tickets relacionados
| Ticket | Qué es | Relación | Estado |
|---|---|---|---|
| CM-02 / CM-03 | Escala / niveles | Se eligen en Medición (dependencia) | Planeados |
| CM-05 | Árbol + rúbrica + B.4 | Depende del matrixId de esta tool | Planeado |
| CM-06 | Adopción masiva | Depende del matrixId | Planeado |
| CM-10 | RM7/RP5 | RM7 (retiro real de matriz) decisión de PO | Planeado |

## 16. Referencias
Alcance sp11, Ticket cm auto-gobierno (Fase 2 y 8.2), código del mod (logic/competencyMatrix-create.*, competencyMatrix-update.*, helpers/validateCompetencyMatrix.js, assertPublishable.js, competencyMatrixHistory.js), objects/RecordTypes/rt__Matrix__competencynode.json, config/layouts/default_CompetencyNode_edit.json.
