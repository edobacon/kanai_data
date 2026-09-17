---
id: DOC-kb-sp11-CD-07-postura-genericwriteallowed
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
  - genericWriteAllowed
  - escritura-segura
  - lockstep
  - fix-gated
  - CD-07
---

# CD-07 · Postura genericWriteAllowed: declarar los 13 + 2 decisiones técnicas — detalle

**Identificador interno:** CD-07 (sin código de Jira todavía; mapear a UPONE-xxxx al crear el issue). Tipo: feature (formalización de seguridad) + decisiones técnicas. Epic probable: Curriculum Design (UPONE-1267) / MCP. Asignado: propio. Story Points: 1 + decisiones. Parte de [Plan cd MCP-ready opción mod](PLAN-cd-mcp-ready-opcion-mod). Pre-intake en [CD-07-pre-intake](CD-07-pre-intake). Evidencia de frontera en [CD-07-aduana](CD-07-aduana).

> **Condicionado al fix, de forma SOFT.** cd ya es seguro por N0; declarar genericWriteAllowed es formalización + gate de completitud, no condición de seguridad. Es la contraparte de cd en el lockstep del bloqueo (análoga a los governedObjects de cm, pero al revés).

## 0. Gate de pre-ejecución (OBLIGATORIO antes de arrancar)
Este ticket depende del estado del fix de core (decisiones **D6** y **D7**). NO ejecutar sin correr primero el gate: ver [Gate de validación: estado de los fixes de core](GATE-validacion-estado-fix-core) y [Decisiones para el PO](DECISIONES-PO-estado-verificado).

- **Verificar Check A** (blockGeneric mergeado + verificado en up1/mcp = D7) y **Check B** (interceptores componibles en object-manager = D6). Registrar abajo con fecha.
- **Decisión (matriz del gate):**
  - Check B implementado -> **reajustar CD-07**: en vez de declarar genericWriteAllowed, migrar el override total de cd a interceptores componibles del core (decisión de diseño: migración gradual vs override que llama al componedor).
  - Check B NO + Check A mergeado y verificado -> **declarar genericWriteAllowed de los 13** (opt-out), tras resolver las 2 decisiones técnicas (sección 13).
  - Check B NO + Check A NO (estado a 2026-09-14) -> **no declarar todavía**: cd ya es seguro por N0, la declaración es formalización que solo cobra sentido cuando el motor está presente. Las 2 decisiones técnicas se pueden resolver igual; CD-01..CD-06 avanzan sin esto.

**Registro del gate:**
- [ ] 2026-09-14 — Check A (D7): NO mergeado. Check B (D6): NO implementado. Acción: no declarar aún; resolver las 2 decisiones técnicas y avanzar el resto. Re-verificar al ejecutar.

## 1. Fuente canónica
Sin ticket Jira todavía. Fuente: [Análisis cd para el MCP](Analisis-cd-para-el-MCP-paridad-1-1-postura-blockGeneric-y-gaps-client-side) (sección 2 y 5) + [Reporte del fix de blockGeneric](Reporte-del-fix-de-blockGeneric-bloqueo-de-escritura-generica-del-MCP-para-core).

## 2. Historia de usuario
Como responsable del dato de cd, quiero declarar formalmente que los objetos de cd van por sus reglas (seguras por N0), para cerrar el gate de completitud del bloqueo del MCP junto con cm y academic-scheduling.

## 3. Objetivo
Declarar `genericWriteAllowed` para los 13 objetos de cd (opt-out del bloqueo, porque el genérico ES el camino seguro por N0) y resolver las 2 decisiones técnicas que gatean esa declaración.

## 4. Contexto (para dimensionar)
- **Fix vs feature:** formalización de seguridad + coordinación.
- **Qué existe:** cd no declara nada hoy (`governedObjects|genericWriteAllowed|blockGenericMutation` -> cero en el mod). cd es N0: el genérico pasa por los overrides, así que el genérico es un camino seguro; corresponde `genericWriteAllowed`, no `governedObjects`.
- **Los 13 objetos:** activity, planEntry, requirement, requirementCategory, CurricularSection, Curriculum, Offering, AcademicProgram, BibliographyReference, CurricularLink, InstructionalComponentType, PlanEnrollment, ProgramEnrollment.
- **Gate todo-o-nada:** si cd declara genericWriteAllowed de uno, debe decidir los 13.
- **Por qué opt-out y no bloqueo:** mantener el genérico abierto es lo que permite al agente reproducir las orquestaciones multi-mutation de la malla por genérico (workflow de cd). Bloquear obligaría a construir tools para todo.

## 5. Alcance
**Dentro:** declarar genericWriteAllowed de los 13 en `ai/`; resolver las 2 decisiones técnicas (delete sin override, movePlanEntry) porque condicionan la declaración.
**Fuera:** los gaps de integridad (CD-01..CD-04); la lectura (CD-05).

## 6. Criterios de aceptación (checkeables)
- [ ] cd declara `genericWriteAllowed` para los 13 objetos (o el subconjunto que las decisiones técnicas avalen, con el resto resuelto).
- [ ] La decisión sobre delete sin override (Activity/Curriculum/CurricularSection/Offering) está tomada y reflejada (declarado como allowed si es backstop intencional; con guard agregado si era hueco).
- [ ] La decisión sobre movePlanEntry está tomada (cablear el renumerado al genérico o documentar la mutation dedicada).
- [ ] El gate de completitud (`validate-governed-objects.js`) pasa para cd.

## 7. Definition of Done (checkeable)
- [ ] **Estándar de terminado del equipo:** cada criterio de aceptación tiene test o "N/A" justificado, verificado en el gate de cierre (RULE-dev-013); escritura por el camino gobernado del módulo (en cd, los overrides N0 del genérico), sin saltear las reglas (RULE-curriculum-design-003, RULE-server-side-logic-mcp-ready); tests unitarios verdes + typecheck (vue-tsc) en checkout limpio (RULE-mods-052, RULE-mods-058); RBAC efectivo y tenant isolation preservado (RULE-mcp-004, RULE-layout-039); si toca archivos sincronizados, correr el sync sin dejar artefactos sin generar (RULE-dev-010).
- [ ] Específico de este ticket:
- [ ] Las 2 decisiones técnicas registradas con su resolución.
- [ ] El gate de completitud del sync pasa.
- [ ] Coordinación con el lockstep del motor (ver Dependencias externas de [CM-09](CM-09-escritura-segura-governedobjects)).

## 8. Tests mínimos (checkeables; ampliables en ejecución)
- [ ] Pack de cd declara los 13; el gate de completitud pasa.
- [ ] Escritura genérica sobre un objeto de cd por el asistente -> sigue permitida y sigue pasando por la validación N0 (no se bloquea).
- [ ] Si alguna decisión agregó un guard de delete -> ese delete queda validado.

## 9. Factores transversales (checkeables)
- [ ] Logica server-side / MCP-ready: aplica (formaliza la postura; el enforcement ya está por N0).
- [ ] Permisos (RBAC): N/A directo.
- [ ] Convenciones de mod: aplica (contenido enforced de `ai/`).
- [ ] i18n / a11y / Storybook / historial: N/A.

## 10. Frontera core/mod (Aduana)
| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Declaración `genericWriteAllowed` de los 13 | `mod-only` | Config del pack del mod (opt-out); el enforcement ya vive en los overrides N0 del mod | mods/curriculum-design/ai/; logic (overrides N0) |
| Guard de delete (si una decisión revela hueco) | `mod-only` | Cambio en el resolver de borrado propio de cd | logic/requirementCategoryDelete.resolver.js |

**Veredicto global:** `mod-only`, con **dependencia externa SOFT** del merge del motor del bloqueo (lockstep, ver [CM-09](CM-09-escritura-segura-governedobjects) sección 10bis). No requiere código de core. Detalle en [CD-07-aduana](CD-07-aduana).

## 11. Dependencias
- **Depende de:** las 2 decisiones técnicas (sección 13) y, para activar, del merge del motor (soft; cd ya es seguro sin él).
- **Coordina con:** CM-09 (mismo lockstep del bloqueo).

## 12. Estimación
1 SP la declaración + el costo de las 2 decisiones (y un eventual guard de delete si se detecta hueco, ~0.5-1 SP extra).

## 13. Decisiones abiertas
- [ ] **D3 · Delete sin override** en Activity/Curriculum/CurricularSection/Offering: ¿backstop intencional por constraint de DB o guard faltante? Estado verificado 2026-09-14: no hay override de delete para esos 4. Si es hueco, agregar el guard antes de declarar; si es intencional, declarar. Decide: equipo de cd.
- [ ] **D4 · movePlanEntry vs update genérico** de position/period: ¿se cablea el renumerado atómico al genérico o se resuelve solo con la mutation dedicada (CD-08)? Estado verificado 2026-09-14: la mutation dedicada ya existe. Decide: equipo de cd.
- [ ] **D6 / D7 (vía gate, sección 0):** el estado del fix de core y del follow-up determina si se declara, se reajusta o se espera. Ver [Decisiones para el PO](DECISIONES-PO-estado-verificado).

## 14. Guía de ejecución: reglas y patrones up1 a considerar
- **[A favor]** cd va con `genericWriteAllowed` (opt-out), NO `governedObjects`: el genérico ES el código que aplica la regla (N0). _Fuente: Análisis cd, sección 2._
- **[Gate]** Gate de completitud todo-o-nada: declarar uno obliga a decidir los 13. _Fuente: up1/mcp/scripts/validate-governed-objects.js._
- **[Advertencia]** Confirmar los delete sin override antes de declararlos allowed (defense-in-depth vs hueco). _Fuente: Análisis cd, sección 5._
- **[Transversal]** Coordinar el merge con el lockstep del motor (CM-09). _Fuente: Reporte del fix de blockGeneric, sección 6._

## 15. Tickets relacionados
| Ticket | Qué es | Relación | Estado |
|---|---|---|---|
| CM-09 | governedObjects de cm + activación | Mismo lockstep del bloqueo (cd es la contraparte opt-out) | Planeado |
| CD-08 | Ergonomía (movePlanEntry) | Comparte la decisión D4 de movePlanEntry | Planeado (opcional) |
| CD-01..CD-04 | Gaps de integridad | Los overrides que hacen seguro al genérico | Planeados |

## 16. Referencias
Análisis cd para el MCP (secciones 2 y 5), Reporte del fix de blockGeneric, Gate de validación estado fix core, Decisiones para el PO (D3, D4, D6, D7), up1/mcp/scripts/validate-governed-objects.js, mods/curriculum-design/ai/, objects/*.json.

## Nota de reajuste (si el core se implementa, Camino B)
SE REAJUSTA (no se elimina). En vez de declarar genericWriteAllowed (opt-out del bloqueo del MCP), cd migraría su override total a interceptores componibles del core. Decisión de diseño abierta: migración gradual a interceptores puntuales vs que el override total llame al componedor durante la transición.
