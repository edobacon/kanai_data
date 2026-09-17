---
id: DOC-kb-sp11-CD-06-guia-fielddocs
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
  - guia
  - fieldDocs
  - CD-06
---

# CD-06 · Guía (contratos/fieldDocs para los 13 objetos) — detalle

**Identificador interno:** CD-06 (sin código de Jira todavía; mapear a UPONE-xxxx al crear el issue). Tipo: feature (guía). Epic probable: Curriculum Design (UPONE-1267). Asignado: propio. Story Points: 1-3. Parte de [Plan cd MCP-ready opción mod](PLAN-cd-mcp-ready-opcion-mod). Pre-intake en [CD-06-pre-intake](CD-06-pre-intake). Evidencia de frontera en [CD-06-aduana](CD-06-aduana).

> **Segundo mayor salto de MCP-ready de cd.** Guía hoy ~10% (1 de 13 objetos con contrato), peso 15%.

## 1. Fuente canónica
Sin ticket Jira todavía. Fuente: [Matriz de MCP-readiness](Matriz-MCP-readiness-cm-y-cd-estado-dependencias-decisiones-esfuerzo-y-de-avance) (dimensión Guía de cd, D5).

## 2. Historia de usuario
Como agente (y como dev/Dredd que revisa), quiero que cada objeto de cd tenga su contrato de campos, para saber cómo llenarlo correctamente al operar por el asistente.

## 3. Objetivo
Cubrir la dimensión Guía: contratos/fieldDocs de los objetos de cd sin guía (hoy 1 de 13).

## 4. Contexto (para dimensionar)
- **Fix vs feature:** guía.
- **Qué existe:** solo 1 de 13 objetos con contrato. Los 13: activity, planEntry, requirement, requirementCategory, CurricularSection, Curriculum, Offering, AcademicProgram, BibliographyReference, CurricularLink, InstructionalComponentType, PlanEnrollment, ProgramEnrollment.
- **Impacto:** sin contrato, el agente no sabe cómo llenar cada objeto al escribir por el genérico N0.

## 5. Alcance
**Dentro:** contratos/fieldDocs de los 12 objetos sin guía (priorizando los más usados por el asistente: activity, planEntry, requirement, requirementCategory, Curriculum).
**Fuera:** el contrato del resultado de las queries de lectura (va con CD-05).

## 6. Criterios de aceptación (checkeables)
- [ ] Cada uno de los objetos priorizados tiene su contrato/fieldDocs, de modo que la guía de creación del asistente describe sus campos.
- [ ] La guía distingue campos obligatorios, opcionales y sus reglas conocidas.

## 7. Definition of Done (checkeable)
- [ ] **Estándar de terminado del equipo:** cada criterio de aceptación tiene test o "N/A" justificado, verificado en el gate de cierre (RULE-dev-013); escritura por el camino gobernado — N/A aquí (ticket de guía, sin escritura); lógica server-side — N/A (no introduce lógica); tests unitarios verdes + typecheck en checkout limpio si se toca código (RULE-mods-052, RULE-mods-058); RBAC / tenant isolation — N/A; si toca archivos sincronizados, correr el sync sin dejar artefactos sin generar (RULE-dev-010).
- [ ] Específico de este ticket:
- [ ] La guía de creación devuelve el contrato de cada objeto cubierto.
- [ ] Coherencia con el schema real de cada objeto (no inventar campos).

## 8. Tests mínimos (checkeables; ampliables en ejecución)
- [ ] Para cada objeto cubierto, la guía de creación expone sus campos y reglas.
- [ ] Revisión de que los campos declarados coinciden con el schema del objeto.

## 9. Factores transversales (checkeables)
- [ ] Documentación: aplica (es el corazón del ticket).
- [ ] i18n / a11y / Storybook / RBAC / historial: N/A.
- [ ] Convenciones de mod: aplica (contenido hint de `ai/`).

## 10. Frontera core/mod (Aduana)
| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Contratos/fieldDocs de los objetos de cd | `mod-only` | Contenido advisory (hint) del pack del mod | mods/curriculum-design/ai/ |

**Veredicto global:** `todo-mod-only`. Sin código de negocio; guía. Detalle en [CD-06-aduana](CD-06-aduana).

## 11. Dependencias
- **Relación:** el contrato del resultado de lectura va con CD-05; los contratos de escritura ayudan a todos los tickets de escritura.

## 12. Estimación
1-3 SP. Justificación: contratos de ~12 objetos. El rango lo mueve cuántos se cubren con contrato rico vs mínimo.

## 13. Decisiones abiertas
- [ ] **D8 · ¿Se cubren los 12 o solo los priorizados este sprint?** Recomendación: priorizar activity/planEntry/requirement/requirementCategory/Curriculum y dejar catálogos/relaciones para después. Estado verificado 2026-09-14: hoy 1 de 13 objetos con guía en cd (3 de 10 en cm). Ver [Decisiones para el PO](DECISIONES-PO-estado-verificado).

## 14. Guía de ejecución: reglas y patrones up1 a considerar
- **[A favor]** Contenido hint en `ai/` (lo sirve la guía de creación); no confundir con el enforced (cd no declara governedObjects, solo genericWriteAllowed en CD-07). _Fuente: Análisis cd, sección 2._
- **[Advertencia]** No inventar campos: derivar de los `.json` de `objects/` y de las reglas server. _Fuente: mods/curriculum-design/objects/*.json._
- **[Transversal]** La doc del mod es fuente para el agente y para Dredd. _Fuente: up1/CLAUDE.md._

## 15. Tickets relacionados
| Ticket | Qué es | Relación | Estado |
|---|---|---|---|
| CD-05 | Lectura | Contrato del resultado de las queries | Planeado |
| CD-01..CD-04 | Gaps de integridad | Los contratos reflejan las reglas cerradas | Planeados |
| CM-08 | Guía + deuda documental (Mapping) | Misma decisión de alcance (D8) del lado cm | Planeado |

## 16. Referencias
Matriz de MCP-readiness (D5, dimensión Guía), Decisiones para el PO (D8), mods/curriculum-design/ai/, objects/*.json.
