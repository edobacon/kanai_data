---
id: DOC-kb-sp11-CM-02-escala-desempeno
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
  - performance-scale
  - CM-02
---

# CM-02 · Escala de desempeño al MCP (PerformanceScale) — detalle

**Identificador interno:** CM-02 (sin código de Jira todavía; mapear a UPONE-xxxx al crear el issue). Tipo: feature. Epic probable: Curriculum Mapping (UPONE-1452). Asignado: propio. Story Points: 1.5-2. Parte de [Plan cm MCP-ready opción mod](PLAN-cm-mcp-ready-opcion-mod). Pre-intake en [CM-02-pre-intake](CM-02-pre-intake). Evidencia de frontera en [CM-02-aduana](CM-02-aduana).

## 1. Fuente canónica
Sin ticket Jira todavía. Fuente: [alcance sp11](DOC-alcance-sp11) (arranque acotado = los 2 mantenedores previos a la matriz) + [Ticket cm auto-gobierno](Ticket-cm-auto-gobierno-en-el-MCP-sin-modificar-el-core-del-MCP-Camino-1) (Fase 2, tools compuestas).

## 2. Historia de usuario
Como coordinador curricular que opera up1 por el asistente, quiero crear, editar, activar/desactivar y borrar escalas de desempeño por el asistente, respetando las mismas reglas que la pantalla, para preparar el insumo de medición de las matrices.

## 3. Objetivo
Traspasar al MCP el mantenedor de escala de desempeño (PerformanceScale: un Scheme + sus niveles), uno de los dos mantenedores que cuelgan de los botones de la vista principal.

## 4. Contexto (para dimensionar)
- **Fix vs feature:** feature (exposición de escritura de dominio).
- **Qué existe:** las mutations gobernadas ya están en el backend del mod; falta exponerlas como tools. Hoy el pack declara `tools: []`.
- **Linaje:** PerformanceScale (UPONE-1454) fue lo primero implementado del mod. Es autocontenido y no depende de la matriz.
- **Deuda:** contratos/fieldDocs de la escala para la guía del agente.

## 5. Alcance
**Dentro:** tools de crear/editar (upsert de Scheme + niveles, con duplicado por prefillFrom), activar/desactivar (con cascada), y borrar (con guard). Su contrato de guía.
**Fuera:** la elección de la escala dentro de la matriz (eso es CM-04, pestaña Medición); niveles de desarrollo (CM-03).

## 6. Criterios de aceptación (checkeables)
- [ ] El asistente puede crear una escala completa (Scheme + niveles) respetando R5-R8/R11 y la unicidad de código R1/R2.
- [ ] El asistente puede editar una escala existente y reconciliar sus niveles.
- [ ] El asistente puede duplicar una escala (prefillFrom) al crear.
- [ ] El asistente puede activar/desactivar una escala, con la cascada correspondiente a sus niveles.
- [ ] El asistente puede borrar una escala; si una matriz la referencia, el borrado se bloquea (guard R9/D-12) con sugerencia de inactivar.
- [ ] Todas las escrituras pasan por las mutations gobernadas; ninguna usa el CRUD genérico.

## 7. Definition of Done (checkeable)
- [ ] **Estándar de terminado del equipo:** cada criterio de aceptación tiene test o "N/A" justificado, verificado en el gate de cierre (RULE-dev-013); escritura gobernada por mutations `*Validated`, nunca CRUD genérico ni Prisma directo (RULE-curriculum-design-003, RULE-mcp-011); lógica server-side / MCP-ready, ninguna vía de escritura saltea las reglas (RULE-server-side-logic-mcp-ready); tests unitarios verdes + typecheck (vue-tsc) en checkout limpio (RULE-mods-052, RULE-mods-058); smoke visual para cambios de UI o "N/A" justificado (RULE-curriculum-design-029); RBAC efectivo, un rol sin capability no ejecuta ni ve (RULE-mcp-004, RULE-layout-039); tenant isolation preservado; si toca archivos sincronizados, correr el sync sin dejar artefactos sin generar (RULE-dev-010).
- [ ] Específico de este ticket:
- [ ] Evidencia runtime de cada tool (crear, editar, activar, borrar bloqueado y borrar permitido).
- [ ] No-regresión: no se modifica ninguna mutation existente (solo se exponen).
- [ ] RBAC efectivo: capabilities performancescale:create/modify/delete se respetan.
- [ ] Contrato/fieldDocs de PerformanceScale para la guía.

## 8. Tests mínimos (checkeables; ampliables en ejecución)
- [ ] upsert crea Scheme + niveles válidos -> persistido; con código repetido -> rechazado (R1/R2).
- [ ] upsert con niveles inválidos (R5-R8/R11) -> rechazado con mensaje de negocio.
- [ ] upsert con prefillFrom y sin niveles -> clona los del origen.
- [ ] set_active(false) -> sella la escala y sus niveles; set_active(true) revierte.
- [ ] delete con matriz referenciando -> rechazado (R9) con sugerencia; delete sin referencias -> borra Scheme + niveles.
- [ ] Rol sin capability -> la tool no ejecuta.

## 9. Factores transversales (checkeables)
- [ ] i18n: N/A (los mensajes de negocio ya vienen del resolver; la tool los propaga).
- [ ] Accesibilidad / Storybook: N/A.
- [ ] Logica server-side / MCP-ready: aplica. La tool llama la `*Validated`; no saltea reglas.
- [ ] Permisos (RBAC): aplica (performancescale:create/modify/delete).
- [ ] Historial/auditoría: verificar si la mutation de escala escribe historial; si lo hace, se hereda.
- [ ] Convenciones de mod: aplica (RecordTypes rt__Scheme/rt__Level, escritura gobernada, fichas en `ai/`).

## 10. Frontera core/mod (Aduana)
| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| `cm_upsert_performance_scale` (registerExtra: es upsert, busca-luego-crea) | `mod-only` | Vive en el pack del mod; llama upsertPerformanceScaleValidated del mod | mods/curriculum-mapping/ai/; logic/performanceScale-upsert.resolver.js |
| `cm_set_performance_scale_active` (ficha) | `mod-only` | Llama setPerformanceScaleActiveValidated del mod | logic/performanceScale-upsert.schema.graphql |
| `cm_delete_performance_scale` (ficha, writePattern preview-confirm) | `mod-only` | Llama deletePerformanceScaleValidated (guard R9) del mod | logic/performanceScale-upsert.schema.graphql |
| Mecanismo registerExtra / fichas | `mod-only` (se consume) | API existente del motor del MCP | up1/mcp/src/mods/types.js:37 |

**Veredicto global:** `todo-mod-only`. Detalle en [CM-02-aduana](CM-02-aduana).

## 11. Dependencias
- **Depende de:** CM-01 recomendada antes (leer para decidir), no bloqueante.
- **Habilita:** CM-04 (la matriz elige una escala existente en Medición).

## 12. Estimación
1.5-2 SP. Justificación: 3 tools sobre mutations que ya existen (una por registerExtra, dos fichas) + contrato. Sin lógica de negocio nueva.

## 13. Decisiones abiertas
- [ ] Ninguna bloqueante.

## 14. Guía de ejecución: reglas y patrones up1 a considerar
- **[Gate]** Escritura gobernada: usar las mutations `*Validated`, nunca el CRUD genérico ni Prisma directo. _Fuente: mods/curriculum-mapping/CLAUDE.md._
- **[A favor]** El upsert es busca-luego-crea: registrarlo por `registerExtra` (no reduce a una ficha). _Fuente: up1/mcp/src/mods/types.js:37; ejemplo academic-scheduling/ai/index.js:67._
- **[A favor]** delete con `writePattern:"preview-confirm"` por ser destructivo. _Fuente: up1/mcp/src/tools/register-declarative-tools.js._
- **[Advertencia]** El backend no reparte pesos ni infiere thresholds: la tool debe mandar min/max/weight válidos. _Fuente: logic/helpers/validatePerformanceScale.js._
- **[Transversal]** Tenant isolation + RBAC en cada llamada. _Fuente: up1/CLAUDE.md._

## 15. Tickets relacionados
| Ticket | Qué es | Relación | Estado |
|---|---|---|---|
| CM-04 | Matriz: cabecera + medición | Consume la escala (la elige en Medición) | Planeado |
| CM-01 | Lectura de dominio | Leer antes de escribir | Planeado |
| UPONE-1454 | PerformanceScale (implementación original) | Antecedente | (a confirmar en Jira) |

## 16. Referencias
Alcance sp11, Ticket cm auto-gobierno (Fase 2), código del mod (logic/performanceScale-upsert.*, helpers/validatePerformanceScale.js, performanceScaleUniqueness.js), objects/RecordTypes/rt__Scheme__performancescale.json, rt__Level__performancescale.json.
