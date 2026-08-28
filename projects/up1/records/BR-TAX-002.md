---
id: BR-TAX-002
project: up1
type: doc
module: curriculum-design
status: in-spec
tags:
  - business-rule
  - taxonomias
  - configuracion
  - bloom
  - cip
  - isced
  - curriculum-design
---

# BR-TAX-002: Configuracion institucional de taxonomias

## Texto verbatim

El Super Admin configura que taxonomias estan activas para la institucion desde el modulo de configuraciones de uP1. Para cada taxonomia activa se define:

- **A que entidades aplica** (programas, cursos, competencias, resultados de aprendizaje, o combinaciones)
- **Si es obligatoria u opcional** por tipo de entidad. Si es obligatoria, la entidad no puede avanzar en el workflow sin tener el codigo asignado
- **Si se habilita sugerencia por IA** para esa taxonomia

La plataforma viene precargada con los catalogos de taxonomias mas relevantes:

- **CIP 2020** (Classification of Instructional Programs, NCES): programas y cursos. Estandar en EE.UU., obligatorio para reporte IPEDS
- **ISCED-F 2013** (UNESCO): programas y cursos. Estandar global para estadisticas educativas
- **Bloom revisada** (Anderson-Krathwohl 2001): resultados de aprendizaje. 6 niveles cognitivos (Recordar, Comprender, Aplicar, Analizar, Evaluar, Crear)
- **ESCO** (European Commission): competencias. 13,890+ competencias catalogadas en 28 idiomas
- **Tuning America Latina**: competencias genericas. 27 competencias de referencia para LATAM
- **ABET Student Outcomes**: resultados de aprendizaje para ingenieria. 7 outcomes estandarizados

Los catalogos precargados no pueden ser eliminados. La institucion puede agregar taxonomias custom propias.

Las taxonomias se actualizan cuando se publican nuevas versiones de los estandares (ej: CIP se revisa cada ~10 años).

**Aplicabilidad segun escenario de integracion ([BR-INT-002](BR-INT-002.md)):**

- Escenario A (SIS gobierna): las taxonomias no aplican — las entidades se importan con la codificacion del SIS
- Escenario B (transicion de gobernanza): las taxonomias aplican solo a entidades creadas en Curriculum Design. Las entidades importadas del SIS conservan su codificacion original y no son sujeto de clasificacion obligatoria
- Escenario C (gobernanza completa uPlanner): las taxonomias aplican a todas las entidades desde el inicio

## Aplicacion en Programa de asignatura

- `Activity` puede tener clasificaciones CIP/ISCED-F.
- `CurricularSection` con `recordType=LearningOutcome` puede tener clasificacion Bloom (campo `bloomLevel`).
- Para SP2, modelar el campo `bloomLevel` en el RT LearningOutcome (string nullable, ej: "Recordar", "Aplicar", "Crear").

## SP2

- Modelar `bloomLevel` en `rt__LearningOutcome__curricularsection.json`.
- NO modelar clasificaciones CIP/ISCED-F (fuera de scope, requieren tabla separada).

## Referencias

- [BR-TAX-001](BR-TAX-001.md), [BR-TAX-003](BR-TAX-003.md)
- [BR-INT-002](BR-INT-002.md)
- CAP-CUR-015
