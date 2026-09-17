---
id: DOC-kb-sp11-CM-08-guia-deuda-documental
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
  - guia
  - doc
  - CM-08
---

# CM-08 · Guía (contratos/fieldDocs) + deuda documental — detalle

**Identificador interno:** CM-08 (sin código de Jira todavía; mapear a UPONE-xxxx al crear el issue). Tipo: feature (guía) + deuda documental. Epic probable: Curriculum Mapping (UPONE-1452). Asignado: propio. Story Points: 1-2. Parte de [Plan cm MCP-ready opción mod](PLAN-cm-mcp-ready-opcion-mod). Pre-intake en [CM-08-pre-intake](CM-08-pre-intake). Evidencia de frontera en [CM-08-aduana](CM-08-aduana).

## 1. Fuente canónica
Sin ticket Jira todavía. Fuente: [Matriz de MCP-readiness](Matriz-MCP-readiness-cm-y-cd-estado-dependencias-decisiones-esfuerzo-y-de-avance) (dimensión Guía, cm 3/10) + [Ticket cm auto-gobierno](Ticket-cm-auto-gobierno-en-el-MCP-sin-modificar-el-core-del-MCP-Camino-1) (Fase 4).

## 2. Historia de usuario
Como agente (y como Dredd/dev que revisa), quiero que cada objeto de cm tenga su contrato de campos y que la documentación del mod esté al día, para saber cómo llenar cada objeto y no operar con información vieja.

## 3. Objetivo
Cubrir la dimensión Guía: contratos/fieldDocs de los objetos sin guía (hoy 3/10) y saldar la deuda documental del mod.

## 4. Contexto (para dimensionar)
- **Fix vs feature:** deuda + guía.
- **Qué existe:** la carpeta `ai/` del mod tiene contenido tipo hint (descripciones, fieldDocs) y tipo enforced (governedObjects, ruteo); este ticket cubre el hint. Hoy `tools: []` (ai/index.js:38).
- **Deuda concreta:** CLAUDE.md del mod sin UPONE-1756 (CompetencyAlignment) ni 1769; `.ai/PATTERNS.md:39` stale (dice que el filtrado dinámico de tools genéricas por objectType es "unsolved", cuando la rama del fix ya lo resolvió para escritura).

## 5. Alcance
**Dentro:** contratos/fieldDocs de los satélites sin tool propia (RubricDimension, RubricDescriptor, CompetencyNodeDevelopmentLevel, CompetencyNodeOwnerUnit, CompetencyNodeScopeUnit) y cualquier contrato faltante; actualizar CLAUDE.md y PATTERNS.md.
**Fuera:** los contratos de los objetos con tool propia (van en CM-02..CM-07).

## 6. Criterios de aceptación (checkeables)
- [ ] Cada objeto de cm sin guía tiene su contrato/fieldDocs, de modo que la guía de creación del asistente lo describe.
- [ ] CLAUDE.md del mod refleja UPONE-1756 y 1769.
- [ ] PATTERNS.md ya no afirma que el filtrado por objectType para escritura esté sin resolver.

## 7. Definition of Done (checkeable)
- [ ] **Estándar de terminado del equipo:** cada criterio de aceptación tiene test o "N/A" justificado, verificado en el gate de cierre (RULE-dev-013); escritura gobernada por mutations `*Validated`, nunca CRUD genérico ni Prisma directo (RULE-curriculum-design-003, RULE-mcp-011) — N/A aquí (ticket de guía/doc, sin escritura); lógica server-side / MCP-ready — N/A (no introduce lógica); tests unitarios verdes + typecheck en checkout limpio si se toca código (RULE-mods-052, RULE-mods-058); RBAC / tenant isolation — N/A; si toca archivos sincronizados, correr el sync sin dejar artefactos sin generar (RULE-dev-010).
- [ ] Específico de este ticket:
- [ ] La guía de creación del asistente devuelve la guía de cada objeto cubierto.
- [ ] Dredd/agente leen documentación coherente con el código actual.

## 8. Tests mínimos (checkeables; ampliables en ejecución)
- [ ] Para cada objeto cubierto, la guía de creación expone sus campos y su descripción.
- [ ] Revisión de que CLAUDE.md/PATTERNS.md no contradicen el código actual.

## 9. Factores transversales (checkeables)
- [ ] Documentación: aplica (es el corazón del ticket).
- [ ] i18n / a11y / Storybook / RBAC / historial: N/A.
- [ ] Logica server-side / MCP-ready: N/A (no introduce lógica).
- [ ] Convenciones de mod: aplica (contenido de `ai/`).

## 10. Frontera core/mod (Aduana)
| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Contratos/fieldDocs (hint en `ai/`) | `mod-only` | Contenido advisory del pack del mod | mods/curriculum-mapping/ai/ |
| CLAUDE.md / PATTERNS.md | `mod-only` | Documentación del propio mod | mods/curriculum-mapping/CLAUDE.md; .ai/PATTERNS.md |

**Veredicto global:** `todo-mod-only`. Sin código de negocio; guía y documentación del mod. Detalle en [CM-08-aduana](CM-08-aduana).

## 11. Dependencias
- **Se completa junto con:** CM-02..CM-07 (el contrato de cada objeto con tool se escribe dentro de su ticket; aquí se cubren los satélites y la doc transversal).

## 12. Estimación
1-2 SP. Justificación: contratos de ~5 satélites + actualización de dos documentos. Sin lógica.

## 13. Decisiones abiertas
- [ ] Ninguna.

## 14. Guía de ejecución: reglas y patrones up1 a considerar
- **[A favor]** Distinguir en `ai/` el contenido hint (este ticket) del enforced (CM-09). _Fuente: Ticket cm auto-gobierno, sección 0.1._
- **[Transversal]** La doc del mod es fuente para el agente y para Dredd: mantenerla vigente. _Fuente: up1/CLAUDE.md._

## 15. Tickets relacionados
| Ticket | Qué es | Relación | Estado |
|---|---|---|---|
| CM-02..CM-07 | Tools del mod | Escriben el contrato de sus propios objetos | Planeados |
| CM-09 | governedObjects | Contenido enforced de `ai/` (distinto del hint de este ticket) | Planeado |

## 16. Referencias
Matriz de MCP-readiness (dimensión Guía), Ticket cm auto-gobierno (Fase 4), mods/curriculum-mapping/CLAUDE.md, .ai/PATTERNS.md, ai/index.js.
