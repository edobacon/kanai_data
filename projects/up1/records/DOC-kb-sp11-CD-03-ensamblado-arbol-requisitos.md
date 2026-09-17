---
id: DOC-kb-sp11-CD-03-ensamblado-arbol-requisitos
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
  - CD-03
---

# CD-03 · Ensamblado del árbol de requisitos por vías (mutation de dominio) — detalle

**Identificador interno:** CD-03 (sin código de Jira todavía; mapear a UPONE-xxxx al crear el issue). Tipo: feature (mutation de dominio) + fix (integridad estructural). Epic probable: Curriculum Design (UPONE-1267). Asignado: propio. Story Points: 2-3. Parte de [Plan cd MCP-ready opción mod](PLAN-cd-mcp-ready-opcion-mod). Pre-intake en [CD-03-pre-intake](CD-03-pre-intake). Evidencia de frontera en [CD-03-aduana](CD-03-aduana).

## 1. Fuente canónica
Sin ticket Jira todavía. Fuente: [Análisis cd para el MCP](Analisis-cd-para-el-MCP-paridad-1-1-postura-blockGeneric-y-gaps-client-side) (gap client-only #2).

## 2. Historia de usuario
Como responsable del plan de estudios, quiero que al construir requisitos por el asistente el árbol quede armado con la misma estructura por vías que arma la pantalla (OR contenedor -> AND por vía -> hojas), para que el evaluador lo interprete como se pretende.

## 3. Objetivo
Cerrar el gap: portar el ensamblado estructural del árbol de requisitos "por vías" al servidor, exponiendo una mutation de dominio que arme la estructura correcta en vez de dejarla librada al genérico.

## 4. Contexto (para dimensionar)
- **Fix vs feature:** feature (mutation de dominio) que cierra un gap de integridad estructural.
- **Qué existe:** la lógica de ensamblado vive solo en el cliente (`RequirementEditor/requirementCreate.logic.ts`: `ensureOrContainer`, `resolveTargetGroup`, `createViaGroup`). Ningún resolver valida la FORMA del árbol (solo ciclos y estado de plan por create/update individual).
- **Impacto:** un caller MCP que arme requisitos por el genérico puede crear estructuras que el evaluador interpreta distinto a la intención.
- **Portabilidad MEDIA:** exponer una mutation de dominio (`createRequirementCondition`) que porte la lógica de ensamblado.

## 5. Alcance
**Dentro:** una mutation de dominio (server) que arme la estructura por vías (OR->AND->hojas) de forma correcta, expuesta como tool; opcionalmente validar la forma del árbol en el resolver.
**Fuera:** el evaluador de prerrequisitos en el alta (CD-01); la cascada de borrado de Groups (CD-04).

## 6. Criterios de aceptación (checkeables)
- [ ] Existe una operación de dominio que crea una condición de requisito ensamblando la estructura por vías correcta (contenedor OR, grupos AND por vía, hojas).
- [ ] Un requisito creado con esa operación, ante los mismos datos de un alumno, da el mismo resultado de cumplimiento que uno armado por la pantalla.
- [ ] Toda escritura de esa operación pasa por el resolver gobernado (no deja la forma librada al genérico crudo).

## 7. Definition of Done (checkeable)
- [ ] **Estándar de terminado del equipo:** cada criterio de aceptación tiene test o "N/A" justificado, verificado en el gate de cierre (RULE-dev-013); escritura por el camino gobernado del módulo (en cd, los overrides N0 del genérico), sin saltear las reglas (RULE-curriculum-design-003, RULE-server-side-logic-mcp-ready); tests unitarios verdes + typecheck (vue-tsc) en checkout limpio (RULE-mods-052, RULE-mods-058); smoke visual para cambios de UI o "N/A" justificado (RULE-curriculum-design-029); RBAC efectivo, un rol sin capability no ejecuta ni ve (RULE-mcp-004, RULE-layout-039); tenant isolation preservado; si toca archivos sincronizados, correr el sync sin dejar artefactos sin generar (RULE-dev-010).
- [ ] Específico de este ticket:
- [ ] Evidencia runtime: crear un requisito de 2 vías -> se persiste OR(AND por vía) con sus hojas.
- [ ] Logica server-side / MCP-ready: el ensamblado vive en el servidor.
- [ ] No-regresión de los requisitos existentes.
- [ ] RBAC efectivo.

## 8. Tests mínimos (checkeables; ampliables en ejecución)
- [ ] Crear una condición con 2 vías -> se persiste OR(AND(vía1), AND(vía2)) con las hojas de cada vía.
- [ ] El evaluador sobre esa estructura da verdadero solo si se satisface al menos una vía completa.
- [ ] Crear una condición de una sola vía -> un único grupo AND con sus hojas, sin contenedor OR redundante.

## 9. Factores transversales (checkeables)
- [ ] Logica server-side / MCP-ready: aplica.
- [ ] Permisos (RBAC): aplica.
- [ ] Convenciones de mod: aplica (mutation de dominio + ficha en `ai/`).
- [ ] Historial/auditoría: verificar.
- [ ] i18n / a11y / Storybook: N/A.

## 10. Frontera core/mod (Aduana)
| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Mutation de dominio `createRequirementCondition` (ensamblado por vías) | `mod-only` | Nueva mutation en el resolver propio de cd; porta lógica hoy en el cliente | logic (resolver de requirement); cliente RequirementEditor/requirementCreate.logic.ts (ensureOrContainer, resolveTargetGroup, createViaGroup) |
| Tool que expone la mutation | `mod-only` | Ficha/registerExtra en el pack del mod | mods/curriculum-design/ai/tools.js |

**Veredicto global:** `todo-mod-only`. Detalle en [CD-03-aduana](CD-03-aduana).

## 11. Dependencias
- **Relación:** mismo dominio de requisitos que CD-01, CD-02 y CD-04. Se apoya en la lectura del árbol (CD-05) para validar.

## 12. Estimación
2-3 SP. Justificación: portar la lógica de ensamblado a una mutation de dominio + exponerla + tests. Portabilidad media.

## 13. Decisiones abiertas
- [ ] ¿Se valida además la FORMA del árbol en el resolver de create/update individual, o alcanza con exponer la mutation de ensamblado? Recomendación: exponer la mutation cubre el 1:1; validar la forma es endurecimiento adicional.

## 14. Guía de ejecución: reglas y patrones up1 a considerar
- **[A favor]** Portar `ensureOrContainer`/`resolveTargetGroup`/`createViaGroup` a una mutation de dominio server. _Fuente: RequirementEditor/requirementCreate.logic.ts._
- **[Gate]** Escritura por el resolver gobernado; exponer la mutation como ficha en `ai/`. _Fuente: mods/curriculum-design/ai/tools.js._
- **[Transversal]** Tenant isolation + RBAC. _Fuente: up1/CLAUDE.md._

## 15. Tickets relacionados
| Ticket | Qué es | Relación | Estado |
|---|---|---|---|
| CD-01 | Prereq en el alta | Mismo dominio | Planeado |
| CD-02 | K<=N | Mismo dominio | Planeado |
| CD-04 | Cascada de Groups vacíos | Complementario (borrado del árbol) | Planeado |
| CD-05 | Lectura (árbol de requisitos) | Ayuda a validar | Planeado |

## 16. Referencias
Análisis cd para el MCP (gap #2), código del mod (resolver de requirement, ai/tools.js), cliente (RequirementEditor/requirementCreate.logic.ts).
