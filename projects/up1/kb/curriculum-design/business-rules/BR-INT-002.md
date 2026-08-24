---
id: BR-INT-002
project: up1
type: spec
module: curriculum-design
category: integraciones
status: in-spec
sources:
  - https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1988165713
referenced_by_caps: []
external_refs: []
tags: [business-rule, integraciones, escenarios, gobernanza, curriculum-design]
---

# BR-INT-002: Escenarios de integracion y gobernanza

## Texto verbatim

La integracion entre Learning Assurance y los sistemas institucionales (SIS/LMS) es **bidireccional**: uPlanner puede actuar como consumidor O como origen de los documentos academicos (carreras, planes de estudio, cursos).

Se identifican tres escenarios de implementacion que determinan el flujo de datos, la gobernanza de entidades y la aplicabilidad de taxonomias:

- **Escenario A — SIS gobierna, uPlanner enriquece:** La institucion mantiene carreras, planes y cursos en el SIS. Se realiza carga inicial y el SIS sigue siendo autoritativo. uPlanner enriquece con programas de curso detallados, syllabi, competencias, tributacion y assessment. Integracion unidireccional (SIS → uPlanner). Las taxonomias internacionales no aplican — la codificacion viene del SIS

- **Escenario B — Carga inicial desde SIS, transicion de gobernanza a uPlanner:** La institucion parte con carga inicial desde el SIS, pero decide que los nuevos documentos academicos se creen desde Curriculum Design. Las entidades importadas conservan su codificacion original del SIS. Las nuevas entidades se crean en uPlanner con codificacion propia (incluyendo taxonomias si estan configuradas). Integracion bidireccional: las nuevas entidades se exportan al SIS via identificador de sincronizacion

- **Escenario C — Gobernanza completa de uPlanner:** La institucion no tiene SIS o decide empezar desde cero. Todas las entidades se crean en Curriculum Design. Las taxonomias aplican plenamente desde el inicio. Si posteriormente se conecta un SIS, se usa el flujo outbound para poblarlo

**Flujo inbound (SIS → uPlanner):** El sistema externo envia la estructura academica. uPlanner importa usando el identificador de sistema externo para sincronizacion idempotente ([BR-INT-001](BR-INT-001.md))

**Flujo outbound (uPlanner → SIS):** La institucion crea documentos en uPlanner y los exporta. El sistema genera un identificador de sincronizacion que la institucion retorna al vincular el documento en su SIS

En todos los escenarios, las competencias, tributacion, evaluacion por competencias y analisis IA son siempre autoritativos de uPlanner.

## Aplicacion en Programa de asignatura

- En **escenario A**: el `Activity` se importa con `externalSystemId="BANNER"` (o equivalente) y `externalRecordId=<codigo>`. La institucion enriquece con `CurricularSection`s pero el identificador SIS permanece.
- En **escenario B**: programas creados antes de la transicion mantienen su origen externo. Programas nuevos nacen sin `externalSystemId` y luego pueden exportarse.
- En **escenario C**: todos los `Activity` nacen sin `externalSystemId`.

## SP2

- Modelar los campos `externalSystemId` y `externalRecordId` como nullable.
- No implementar flujos de import/export en SP2.

## Referencias

- [BR-INT-001](BR-INT-001.md) (identificador externo)
- [BR-INT-003](BR-INT-003.md) (fuentes calificaciones)
- [BR-TAX-002](BR-TAX-002.md) (aplicabilidad de taxonomias por escenario)
