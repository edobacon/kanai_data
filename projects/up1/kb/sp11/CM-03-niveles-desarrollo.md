---
id: DOC-kb-sp11-CM-03-niveles-desarrollo
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
  - development-level
  - CM-03
---

# CM-03 · Niveles de desarrollo al MCP (DevelopmentLevel) — detalle

**Identificador interno:** CM-03 (sin código de Jira todavía; mapear a UPONE-xxxx al crear el issue). Tipo: feature. Epic probable: Curriculum Mapping (UPONE-1452). Asignado: propio. Story Points: 1.5-2. Parte de [Plan cm MCP-ready opción mod](PLAN-cm-mcp-ready-opcion-mod). Pre-intake en [CM-03-pre-intake](CM-03-pre-intake). Evidencia de frontera en [CM-03-aduana](CM-03-aduana).

## 1. Fuente canónica
Sin ticket Jira todavía. Fuente: [alcance sp11](DOC-alcance-sp11) (arranque acotado = los 2 mantenedores previos a la matriz) + [Ticket cm auto-gobierno](Ticket-cm-auto-gobierno-en-el-MCP-sin-modificar-el-core-del-MCP-Camino-1) (Fase 2).

## 2. Historia de usuario
Como coordinador curricular que opera up1 por el asistente, quiero crear, editar, activar/desactivar y borrar esquemas de niveles de desarrollo por el asistente, respetando las mismas reglas que la pantalla, para preparar el insumo de medición de las matrices.

## 3. Objetivo
Traspasar al MCP el mantenedor de niveles de desarrollo (DevelopmentLevel: escala + sus niveles), el segundo mantenedor que cuelga de los botones de la vista principal.

## 4. Contexto (para dimensionar)
- **Fix vs feature:** feature (exposición de escritura de dominio).
- **Qué existe:** las mutations gobernadas ya están en el backend del mod; falta exponerlas. Hoy `tools: []`.
- **Linaje:** hermano de CM-02 (mismo patrón que PerformanceScale). Autocontenido, no depende de la matriz.
- **Deuda:** contrato/fieldDocs para la guía.

## 5. Alcance
**Dentro:** tools de crear/editar (upsert de escala + niveles, con duplicado por prefillFrom), activar/desactivar, y borrar (con guard). Su contrato de guía.
**Fuera:** la elección del esquema dentro de la matriz (CM-04, Medición); escala de desempeño (CM-02).

## 6. Criterios de aceptación (checkeables)
- [ ] El asistente puede crear una escala de niveles completa respetando RC2-RC4 y la unicidad de código RC1.
- [ ] El asistente puede editar una escala y reconciliar sus niveles.
- [ ] El asistente puede duplicar una escala (prefillFrom) al crear.
- [ ] El asistente puede activar/desactivar una escala (con la cascada a niveles).
- [ ] El asistente puede borrar una escala; si una tributación apunta a alguno de sus niveles, el borrado se bloquea (guard RC6) con sugerencia de inactivar.
- [ ] Todas las escrituras pasan por las mutations gobernadas; ninguna usa el CRUD genérico.

## 7. Definition of Done (checkeable)
- [ ] **Estándar de terminado del equipo:** cada criterio de aceptación tiene test o "N/A" justificado, verificado en el gate de cierre (RULE-dev-013); escritura gobernada por mutations `*Validated`, nunca CRUD genérico ni Prisma directo (RULE-curriculum-design-003, RULE-mcp-011); lógica server-side / MCP-ready, ninguna vía de escritura saltea las reglas (RULE-server-side-logic-mcp-ready); tests unitarios verdes + typecheck (vue-tsc) en checkout limpio (RULE-mods-052, RULE-mods-058); smoke visual para cambios de UI o "N/A" justificado (RULE-curriculum-design-029); RBAC efectivo, un rol sin capability no ejecuta ni ve (RULE-mcp-004, RULE-layout-039); tenant isolation preservado; si toca archivos sincronizados, correr el sync sin dejar artefactos sin generar (RULE-dev-010).
- [ ] Específico de este ticket:
- [ ] Evidencia runtime de cada tool (crear, editar, activar, borrar bloqueado y borrar permitido).
- [ ] No-regresión: no se modifica ninguna mutation existente.
- [ ] RBAC efectivo: capabilities developmentlevel:create/modify/delete se respetan.
- [ ] Contrato/fieldDocs de DevelopmentLevel para la guía.

## 8. Tests mínimos (checkeables; ampliables en ejecución)
- [ ] upsert crea escala + niveles válidos -> persistido; con código repetido -> rechazado (RC1).
- [ ] upsert con menos del mínimo de niveles o nombre/código inválido -> rechazado (RC2-RC4).
- [ ] upsert con prefillFrom y sin niveles -> clona los del origen.
- [ ] set_active(false) -> sella escala y niveles; set_active(true) revierte.
- [ ] delete con tributación apuntando a un nivel -> rechazado (RC6) con sugerencia; delete sin referencias -> borra escala + niveles.
- [ ] Rol sin capability -> la tool no ejecuta.

## 9. Factores transversales (checkeables)
- [ ] i18n: N/A (mensajes de negocio ya vienen del resolver).
- [ ] Accesibilidad / Storybook: N/A.
- [ ] Logica server-side / MCP-ready: aplica. La tool llama la `*Validated`; no saltea reglas.
- [ ] Permisos (RBAC): aplica (developmentlevel:create/modify/delete).
- [ ] Historial/auditoría: verificar si la mutation escribe historial; si lo hace, se hereda.
- [ ] Convenciones de mod: aplica (escritura gobernada, fichas en `ai/`).

## 10. Frontera core/mod (Aduana)
| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| `cm_upsert_development_level` (registerExtra: es upsert) | `mod-only` | Vive en el pack del mod; llama upsertDevelopmentLevelValidated del mod | mods/curriculum-mapping/ai/; logic/developmentLevel-upsert.resolver.js |
| `cm_set_development_level_active` (ficha) | `mod-only` | Llama setDevelopmentLevelActiveValidated del mod | logic/developmentLevel-upsert.schema.graphql |
| `cm_delete_development_level` (ficha, preview-confirm) | `mod-only` | Llama deleteDevelopmentLevelValidated (guard RC6) del mod | logic/developmentLevel-upsert.schema.graphql |
| Mecanismo registerExtra / fichas | `mod-only` (se consume) | API existente del motor del MCP | up1/mcp/src/mods/types.js:37 |

**Veredicto global:** `todo-mod-only`. Detalle en [CM-03-aduana](CM-03-aduana).

## 11. Dependencias
- **Depende de:** CM-01 recomendada antes (no bloqueante).
- **Habilita:** CM-04 (la matriz elige un esquema de niveles en Medición).

## 12. Estimación
1.5-2 SP. Justificación: 3 tools sobre mutations existentes (una registerExtra, dos fichas) + contrato. Sin lógica nueva.

## 13. Decisiones abiertas
- [ ] Ninguna bloqueante.

## 14. Guía de ejecución: reglas y patrones up1 a considerar
- **[Gate]** Escritura gobernada: mutations `*Validated`, nunca CRUD genérico. _Fuente: mods/curriculum-mapping/CLAUDE.md._
- **[A favor]** upsert por `registerExtra`; set_active/delete por ficha; delete con preview-confirm. _Fuente: up1/mcp/src/mods/types.js:37._
- **[Advertencia]** RC6 bloquea el borrado si una tributación referencia un nivel (competencyAlignment.developmentLevelId): sugerir inactivar. _Fuente: logic/developmentLevel-upsert.schema.graphql._
- **[Transversal]** Tenant isolation + RBAC en cada llamada. _Fuente: up1/CLAUDE.md._

## 15. Tickets relacionados
| Ticket | Qué es | Relación | Estado |
|---|---|---|---|
| CM-04 | Matriz: cabecera + medición | Consume el esquema de niveles | Planeado |
| CM-02 | Escala de desempeño | Hermano (mismo patrón de mantenedor) | Planeado |
| CM-01 | Lectura de dominio | Leer antes de escribir | Planeado |

## 16. Referencias
Alcance sp11, Ticket cm auto-gobierno (Fase 2), código del mod (logic/developmentLevel-upsert.*, helpers/validateDevelopmentLevel.js), objects/DevelopmentLevel.json.
