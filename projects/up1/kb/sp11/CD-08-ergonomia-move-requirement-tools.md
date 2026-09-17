---
id: DOC-kb-sp11-CD-08-ergonomia-move-requirement-tools
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
  - ergonomia
  - opcional
  - CD-08
---

# CD-08 · Ergonomía (opcional): exponer movePlanEntry + tools del Requirement Editor — detalle

**Identificador interno:** CD-08 (sin código de Jira todavía; mapear a UPONE-xxxx al crear el issue). Tipo: feature (mejora de ergonomía/atomicidad). **Opcional**, fuera del núcleo obligatorio. Epic probable: Curriculum Design (UPONE-1267). Asignado: propio. Story Points: 2-4. Parte de [Plan cd MCP-ready opción mod](PLAN-cd-mcp-ready-opcion-mod). Pre-intake en [CD-08-pre-intake](CD-08-pre-intake). Evidencia de frontera en [CD-08-aduana](CD-08-aduana).

> **Opcional.** cd llega a 1:1 sin este ticket (el genérico N0 reproduce las orquestaciones). Es mejora de atomicidad y ergonomía para el asistente, no requisito de MCP-ready.

## 1. Fuente canónica
Sin ticket Jira todavía. Fuente: [Análisis cd para el MCP](Analisis-cd-para-el-MCP-paridad-1-1-postura-blockGeneric-y-gaps-client-side) (sección 4, mejoras opcionales de ergonomía/atomicidad).

## 2. Historia de usuario
Como responsable del plan de estudios que opera up1 por el asistente, quiero operaciones atómicas para mover materias y para armar/editar requisitos, para que el asistente no tenga que reproducir loops no atómicos por el genérico.

## 3. Objetivo
Exponer como tools de dominio: (a) `movePlanEntry` (renumerado atómico de posición/período) y (b) las operaciones del Requirement Editor (Groups + hojas + reparent + cascada).

## 4. Contexto (para dimensionar)
- **Fix vs feature:** feature de ergonomía/atomicidad.
- **Qué existe:** `movePlanEntry` es una mutation atómica que ya existe pero la UI NO usa (hace loop no atómico) y NO está expuesta como tool. El Requirement Editor NO tiene ninguna tool de dominio; su orquestación solo es reproducible por genérico documentando orden y rollback.
- **Impacto:** hoy un agente que mueve una materia replica el loop genérico no atómico; y armar requisitos por genérico es frágil. Exponer estas tools mejora atomicidad y ergonomía.
- **Relación:** las tools del Requirement Editor se apoyan en el ensamblado (CD-03) y la cascada (CD-04) ya cerrados en el servidor.

## 5. Alcance
**Dentro:** exponer `movePlanEntry` como tool; exponer tools de dominio del Requirement Editor (armar/editar/borrar requisitos con su cascada).
**Fuera:** los gaps de integridad server (CD-01..CD-04), que son requisito; la lectura (CD-05).

## 6. Criterios de aceptación (checkeables)
- [ ] El asistente puede mover una planEntry de posición/período de forma atómica (una sola operación que renumera), no por loop.
- [ ] El asistente puede armar/editar un requisito con su estructura y cascada por una tool de dominio, sin reconstruir por genérico.
- [ ] Las tools pasan por los resolvers gobernados de cd.

## 7. Definition of Done (checkeable)
- [ ] **Estándar de terminado del equipo:** cada criterio de aceptación tiene test o "N/A" justificado, verificado en el gate de cierre (RULE-dev-013); escritura por el camino gobernado del módulo (en cd, los overrides N0 del genérico), sin saltear las reglas (RULE-curriculum-design-003, RULE-server-side-logic-mcp-ready); tests unitarios verdes + typecheck (vue-tsc) en checkout limpio (RULE-mods-052, RULE-mods-058); smoke visual para cambios de UI o "N/A" justificado (RULE-curriculum-design-029); RBAC efectivo, un rol sin capability no ejecuta ni ve (RULE-mcp-004, RULE-layout-039); tenant isolation preservado; si toca archivos sincronizados, correr el sync sin dejar artefactos sin generar (RULE-dev-010).
- [ ] Específico de este ticket:
- [ ] Evidencia runtime de cada tool.
- [ ] No-regresión de las operaciones equivalentes por genérico.
- [ ] RBAC efectivo.

## 8. Tests mínimos (checkeables; ampliables en ejecución)
- [ ] movePlanEntry -> renumera en una sola operación; el estado final (posiciones/períodos) coincide con el que deja la pantalla tras el mismo movimiento.
- [ ] Editar un requisito con la tool -> arma la estructura por vías de CD-03 y, al quitar la última condición de un grupo, elimina ese grupo (cascada de CD-04) en la misma llamada.

## 9. Factores transversales (checkeables)
- [ ] Logica server-side / MCP-ready: aplica.
- [ ] Permisos (RBAC): aplica.
- [ ] Convenciones de mod: aplica (tools en `ai/`).
- [ ] i18n / a11y / Storybook: N/A.

## 10. Frontera core/mod (Aduana)
| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Tool `cd_move_plan_entry` (expone movePlanEntry) | `mod-only` | La mutation ya existe en el mod; solo se expone | logic (movePlanEntry; computeMoveRenumbering/assertValidMoveDestination) |
| Tools del Requirement Editor | `mod-only` | Exponen operaciones de dominio del mod (se apoyan en CD-03/CD-04) | mods/curriculum-design/ai/tools.js; logic (resolver de requirement) |

**Veredicto global:** `todo-mod-only`. Detalle en [CD-08-aduana](CD-08-aduana).

## 11. Dependencias
- **Depende de:** CD-03 y CD-04 (las tools del Requirement Editor se apoyan en el ensamblado y la cascada ya cerrados); la decisión D4 de movePlanEntry de CD-07.
- **Se apoya en:** CD-05 (leer el árbol para operar).

## 12. Estimación
2-4 SP. Justificación: exponer movePlanEntry (mutation ya existe, barato) + construir/exponer las tools del Requirement Editor (más caro). Opcional.

## 13. Decisiones abiertas
- [ ] **D4 (compartida con CD-07):** ¿movePlanEntry se cablea al genérico o se resuelve solo con la tool dedicada? Esta tool es la opción "tool dedicada". Estado verificado 2026-09-14: la mutation dedicada ya existe. Ver [Decisiones para el PO](DECISIONES-PO-estado-verificado).

## 14. Guía de ejecución: reglas y patrones up1 a considerar
- **[A favor]** movePlanEntry ya es atómica (renumera); exponerla evita el loop no atómico del genérico. _Fuente: Análisis cd, sección 4._
- **[A favor]** Las tools del Requirement Editor se apoyan en los resolvers ya endurecidos (CD-03 ensamblado, CD-04 cascada). _Fuente: Análisis cd, secciones 3-4._
- **[Transversal]** Tenant isolation + RBAC. _Fuente: up1/CLAUDE.md._

## 15. Tickets relacionados
| Ticket | Qué es | Relación | Estado |
|---|---|---|---|
| CD-03 | Ensamblado del árbol | Base server de las tools de requisito | Planeado |
| CD-04 | Cascada de Groups | Base server del borrado | Planeado |
| CD-05 | Lectura | Leer el árbol para operar | Planeado |
| CD-07 | genericWriteAllowed | Comparte la decisión D4 de movePlanEntry | Planeado |

## 16. Referencias
Análisis cd para el MCP (sección 4), Decisiones para el PO (D4), código del mod (logic movePlanEntry/computeMoveRenumbering/assertValidMoveDestination, resolver de requirement, ai/tools.js).
