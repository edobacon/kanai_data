---
id: BR-TAX-001
project: up1
type: doc
module: curriculum-design
status: in-spec
tags:
  - business-rule
  - taxonomias
  - codificacion
  - curriculum-design
---

# BR-TAX-001: Modelo de codificacion dual

## Texto verbatim

Toda entidad codificable (programas academicos, planes de estudio, cursos, programas de curso, competencias, resultados de aprendizaje) tiene dos capas de codificacion:

- **Codigo propio**: definido libremente por la institucion. Es el identificador principal dentro del sistema. Siempre presente y obligatorio
- **Clasificaciones internacionales**: una o mas taxonomias estandarizadas asignadas opcionalmente a la entidad. Cada asignacion vincula la entidad con un codigo especifico de la taxonomia

Una entidad puede tener cero o mas clasificaciones internacionales simultaneas (ej: un programa puede tener CIP y ISCED-F a la vez).

## Aplicacion en Programa de asignatura

- `Activity.code` = "codigo propio" (obligatorio).
- Clasificaciones internacionales: tabla separada (probablemente `EntityClassification` o similar, fuera de este mod) que apunta a `Activity` con M:N hacia taxonomias.

## SP2

- En SP2 modelar `code` (string, required, unique con `version`) en `Activity`.
- NO modelar clasificaciones internacionales en SP2 — fuera de scope.

## Referencias

- [BR-TAX-002](BR-TAX-002.md) (taxonomias disponibles)
- [BR-TAX-003](BR-TAX-003.md) (sugerencia IA)
