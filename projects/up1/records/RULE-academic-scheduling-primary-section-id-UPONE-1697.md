---
id: RULE-academic-scheduling-primary-section-id-UPONE-1697
project: up1
type: rule
module: academic-scheduling
---

sectionRequirements.id_master_section estaba hardcodeado al id de la propia seccion. Regla: si la seccion es miembro de un SectionEquivalency vigente para el escenario (active=true, scenarioId null o igual; un grupo scoped al escenario gana sobre uno institucional, despues el id mas bajo) y la seccion primaria del grupo tambien esta en el escenario, se envia el id de la primaria (masterSectionBySection) para que herede la asignacion. Si la primaria no esta en el escenario, o no hay grupo, se mantiene el propio id. Un cliente sin los modelos, o una DB desfasada (P2021), degrada a "master propio" para toda seccion en vez de fallar el input.

**sourceRef:** 1b4aca8 + logic/schedule/sectionEquivalency.js:33 (masterSectionBySection).
