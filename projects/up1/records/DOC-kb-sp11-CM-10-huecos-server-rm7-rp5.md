---
id: DOC-kb-sp11-CM-10-huecos-server-rm7-rp5
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
  - RM7
  - RP5
  - decision-PO
  - CM-10
---

# CM-10 · Huecos de servidor RM7/RP5 (decisión PO) — detalle

**Identificador interno:** CM-10 (sin código de Jira todavía; mapear a UPONE-xxxx al crear el issue). Tipo: mejora de calidad de datos (opcional, decisión PO). Epic probable: Curriculum Mapping (UPONE-1452). Asignado: propio (si se aprueba). Story Points: 2-4 (solo si se implementa). Parte de [Plan cm MCP-ready opción mod](PLAN-cm-mcp-ready-opcion-mod). Pre-intake en [CM-10-pre-intake](CM-10-pre-intake). Evidencia de frontera en [CM-10-aduana](CM-10-aduana).

> **No es requisito de MCP-ready.** Ni la pantalla ni el asistente aplican estas reglas hoy; no cambian el % de readiness ni el 1:1. Es una decisión de PO sobre calidad de datos.

## 1. Fuente canónica
Sin ticket Jira todavía. Fuente: [Matriz de MCP-readiness](Matriz-MCP-readiness-cm-y-cd-estado-dependencias-decisiones-esfuerzo-y-de-avance) (M9, decisión de PO) + [Ticket cm auto-gobierno](Ticket-cm-auto-gobierno-en-el-MCP-sin-modificar-el-core-del-MCP-Camino-1) (sección 9, dependencias fuera del ticket).

## 2. Historia de usuario
Como responsable del dato de cm, quiero decidir si se implementa el retiro real de matriz (RM7) y la completitud de descriptores de rúbrica (RP5), para cerrar huecos de calidad de datos si el negocio lo requiere.

## 3. Objetivo
Tomar la decisión de PO sobre dos huecos de servidor y, si se aprueban, implementarlos en el resolver propio de cm.

## 4. Contexto (para dimensionar)
- **RM7 (retiro/borrado de matriz):** hoy NO existe borrado de matriz; el retiro es una transición de `status` a Deprecated/Archived (alcanzable por `cm_save_competency_matrix`, CM-04), y el delete se bloquea con mensaje "en desarrollo". Decidir si alcanza con la transición o se implementa un retiro/borrado real.
- **RP5 (completitud de descriptores de rúbrica):** diferida por producto. Hoy el MCP iguala a la plataforma (ninguna la aplica), así que no rompe el 1:1. Decidir si se implementa la validación de completitud.

## 5. Alcance
**Dentro:** la decisión de PO; si se aprueba alguno, su implementación en el resolver del mod + tests.
**Fuera:** cualquier cambio si la decisión es no implementar (quedan como deuda diferida documentada).

## 6. Criterios de aceptación (checkeables)
- [ ] Decisión de PO registrada para RM7 (transición de estado vs retiro real) y para RP5 (implementar vs diferir).
- [ ] Si RM7 se aprueba como retiro real: la operación existe, gobernada, con su guard; el delete deja de decir "en desarrollo".
- [ ] Si RP5 se aprueba: el resolver valida la completitud de descriptores con mensaje de negocio.

## 7. Definition of Done (checkeable)
- [ ] **Estándar de terminado del equipo (aplica si se implementa):** cada criterio de aceptación tiene test o "N/A" justificado, verificado en el gate de cierre (RULE-dev-013); escritura gobernada por mutations `*Validated`, nunca CRUD genérico ni Prisma directo (RULE-curriculum-design-003, RULE-mcp-011); lógica server-side / MCP-ready, ninguna vía de escritura saltea las reglas (RULE-server-side-logic-mcp-ready); tests unitarios verdes + typecheck en checkout limpio (RULE-mods-052, RULE-mods-058); RBAC efectivo y tenant isolation preservado (RULE-mcp-004, RULE-layout-039); si toca archivos sincronizados, correr el sync sin dejar artefactos sin generar (RULE-dev-010).
- [ ] Específico de este ticket:
- [ ] Evidencia runtime de la regla implementada.
- [ ] Logica server-side / MCP-ready: la regla vive en el resolver.
- [ ] No-regresión.

## 8. Tests mínimos (checkeables; ampliables en ejecución)
- [ ] Si RM7 (retiro real): retirar una matriz sin adopciones vigentes -> se retira; una con adopciones vigentes -> el retiro se rechaza con mensaje.
- [ ] Si RP5: rúbrica incompleta -> rechazada; completa -> aceptada.

## 9. Factores transversales (checkeables)
- [ ] Logica server-side / MCP-ready: aplica (si se implementa).
- [ ] Permisos (RBAC): aplica (si se implementa).
- [ ] Historial/auditoría: aplica para RM7.
- [ ] i18n / a11y / Storybook: N/A.

## 10. Frontera core/mod (Aduana)
| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| RM7 (retiro/borrado de matriz), si se implementa | `mod-only` | Cambio en el resolver/mutation propio de cm | logic/competencyMatrix-update.* / nueva mutation del mod |
| RP5 (completitud de descriptores), si se implementa | `mod-only` | Cambio en el resolver del árbol/rúbrica de cm | logic/competencyTree-upsert.resolver.js |

**Veredicto global:** `todo-mod-only` si se implementa; `N/A` mientras sea solo decisión. Detalle en [CM-10-aduana](CM-10-aduana).

## 11. Dependencias
- **Relación:** RM7 se apoya en el ciclo de estado de CM-04; RP5 en el árbol/rúbrica de CM-05.

## 12. Estimación
2-4 SP, solo si el PO decide implementar (ambos, o uno). Cero si se difieren.

## 13. Decisiones abiertas
- [ ] **D5 · RM7:** ¿alcanza con la transición de estado (Deprecated/Archived) o se implementa un retiro/borrado real? Estado verificado 2026-09-14: el retiro por estado existe; el borrado real no. Recomendación: alcanza con la transición para MCP-ready; retiro real solo si el negocio lo pide.
- [ ] **D5 · RP5:** ¿se implementa la completitud de descriptores este sprint o queda diferida? Estado verificado 2026-09-14: no la aplica hoy ni pantalla ni asistente. Recomendación: diferir (no rompe 1:1). Ver [Decisiones para el PO](DECISIONES-PO-estado-verificado).

## 14. Guía de ejecución: reglas y patrones up1 a considerar
- **[A favor]** Si se implementa, va en el resolver propio de cm (mod-only), como B.4. _Fuente: mods/curriculum-mapping/CLAUDE.md._
- **[Advertencia]** RM7 como delete real cambia semántica académica: el retiro de un plan vigente es cerrar, no borrar. _Fuente: logic/matrixAdoption.schema.graphql (RA-8, criterio análogo)._
- **[Transversal]** Tenant isolation + RBAC. _Fuente: up1/CLAUDE.md._

## 15. Tickets relacionados
| Ticket | Qué es | Relación | Estado |
|---|---|---|---|
| CM-04 | Matriz: cabecera + estado | RM7 se apoya en el ciclo de estado | Planeado |
| CM-05 | Árbol + rúbrica | RP5 vive en el resolver del árbol | Planeado |

## 16. Referencias
Matriz de MCP-readiness (M9), Ticket cm auto-gobierno (sección 9), Decisiones para el PO (D5), código del mod (logic/competencyMatrix-update.*, competencyTree-upsert.resolver.js).
