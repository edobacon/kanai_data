---
id: DOC-kb-sp11-CD-04-cascada-groups-vacios
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
  - requirement
  - CD-04
---

# CD-04 · Cascada de borrado de Groups vacíos (higiene de datos) — detalle

**Identificador interno:** CD-04 (sin código de Jira todavía; mapear a UPONE-xxxx al crear el issue). Tipo: fix (higiene de datos / integridad). Epic probable: Curriculum Design (UPONE-1267). Asignado: propio. Story Points: 1. Parte de [Plan cd MCP-ready opción mod](PLAN-cd-mcp-ready-opcion-mod). Pre-intake en [CD-04-pre-intake](CD-04-pre-intake). Evidencia de frontera en [CD-04-aduana](CD-04-aduana).

## 1. Fuente canónica
Sin ticket Jira todavía. Fuente: [Análisis cd para el MCP](Analisis-cd-para-el-MCP-paridad-1-1-postura-blockGeneric-y-gaps-client-side) (gap client-only #4).

## 2. Historia de usuario
Como responsable del plan de estudios, quiero que al borrar una hoja de requisito por el asistente se limpien los Groups que quedan vacíos, igual que hace la pantalla, para que no queden estructuras huérfanas en el árbol.

## 3. Objetivo
Cerrar el gap: portar al servidor la cascada de borrado de Groups vacíos, como post-delete cleanup en el resolver de borrado de cd.

## 4. Contexto (para dimensionar)
- **Fix vs feature:** fix de higiene de datos (no es seguridad).
- **Qué existe:** la cascada vive solo en el cliente (`requirementEditor.logic.ts:214-238`, `computeDeleteCascade`). El servidor no borra Groups huérfanos por su cuenta.
- **Impacto:** borrar la hoja por MCP deja Groups vacíos; divergencia de resultado UI vs MCP (misma acción, estado distinto).
- **Portabilidad MEDIA:** post-delete cleanup en `requirementCategoryDelete.resolver.js`.

## 5. Alcance
**Dentro:** limpieza de Groups vacíos tras el borrado de una hoja/rama de requisito, en el resolver de borrado.
**Fuera:** el ensamblado del árbol (CD-03); el evaluador de prerrequisitos (CD-01).

## 6. Criterios de aceptación (checkeables)
- [ ] Borrar una hoja de requisito que deja un Group vacío -> el Group se elimina también (por cualquier vía: pantalla, genérico, tool).
- [ ] Borrar una hoja que NO deja Groups vacíos -> no se toca nada más.
- [ ] El resultado por MCP es igual al de la pantalla (no divergencia).

## 7. Definition of Done (checkeable)
- [ ] **Estándar de terminado del equipo:** cada criterio de aceptación tiene test o "N/A" justificado, verificado en el gate de cierre (RULE-dev-013); escritura por el camino gobernado del módulo (en cd, los overrides N0 del genérico), sin saltear las reglas (RULE-curriculum-design-003, RULE-server-side-logic-mcp-ready); tests unitarios verdes + typecheck (vue-tsc) en checkout limpio (RULE-mods-052, RULE-mods-058); smoke visual para cambios de UI o "N/A" justificado (RULE-curriculum-design-029); RBAC efectivo, un rol sin capability no ejecuta ni ve (RULE-mcp-004, RULE-layout-039); tenant isolation preservado; si toca archivos sincronizados, correr el sync sin dejar artefactos sin generar (RULE-dev-010).
- [ ] Específico de este ticket:
- [ ] Evidencia runtime: borrado que deja Group vacío -> limpiado.
- [ ] Logica server-side / MCP-ready: la cascada vive en el resolver.
- [ ] No-regresión de borrados que no dejan huérfanos.

## 8. Tests mínimos (checkeables; ampliables en ejecución)
- [ ] Borrar la última hoja de un Group -> el Group se borra.
- [ ] Borrar una hoja de un Group con otras hojas -> el Group queda.
- [ ] Cascada multinivel (Group padre queda vacío tras borrar el hijo) -> se limpia en cadena.

## 9. Factores transversales (checkeables)
- [ ] Logica server-side / MCP-ready: aplica.
- [ ] Permisos (RBAC): aplica.
- [ ] Convenciones de mod: aplica (override N0 del delete).
- [ ] Historial/auditoría: verificar (el borrado en cascada debería auditarse coherente).
- [ ] i18n / a11y / Storybook: N/A.

## 10. Frontera core/mod (Aduana)
| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Post-delete cleanup de Groups vacíos | `mod-only` | Cambio en el resolver de borrado propio de cd (N0) | logic/requirementCategoryDelete.resolver.js; cliente requirementEditor.logic.ts:214-238 (computeDeleteCascade, referencia) |

**Veredicto global:** `todo-mod-only`. Detalle en [CD-04-aduana](CD-04-aduana).

## 11. Dependencias
- **Relación:** mismo dominio de requisitos que CD-01/CD-02/CD-03.

## 12. Estimación
1 SP. Justificación: post-delete cleanup con detección de huérfanos + tests. Portabilidad media.

## 13. Decisiones abiertas
- [ ] Ninguna. (Confirmar el alcance de la cascada multinivel según lo que hace `computeDeleteCascade`.)

## 14. Guía de ejecución: reglas y patrones up1 a considerar
- **[A favor]** Portar `computeDeleteCascade` como cleanup post-delete en el resolver. _Fuente: cliente requirementEditor.logic.ts:214-238._
- **[Gate]** La cascada va en el resolver override de delete (N0). _Fuente: logic/requirementCategoryDelete.resolver.js._
- **[Advertencia]** Cuidar la cascada multinivel (un Group padre que queda vacío tras borrar el hijo). _Fuente: Análisis cd, gap #4._
- **[Transversal]** Tenant isolation + RBAC. _Fuente: up1/CLAUDE.md._

## 15. Tickets relacionados
| Ticket | Qué es | Relación | Estado |
|---|---|---|---|
| CD-03 | Ensamblado del árbol | Complementario (alta vs borrado del árbol) | Planeado |
| CD-01 | Prereq en el alta | Mismo dominio | Planeado |

## 16. Referencias
Análisis cd para el MCP (gap #4), código del mod (logic/requirementCategoryDelete.resolver.js), cliente (requirementEditor.logic.ts:214-238).
