---
id: BR-TNT-002
project: up1
type: doc
module: curriculum-design
status: in-spec
tags:
  - business-rule
  - multi-tenant
  - configuracion
  - defaults
  - curriculum-design
---

# BR-TNT-002: Defaults de plataforma vs configuracion institucional

## Texto verbatim

Las entidades de configuracion (tipos de competencia, tipos de curso, esquemas de niveles, tipos de componente, formulas, etc.) tienen dos origenes posibles:

- **Default de plataforma:** compartido por todas las instituciones, no editable
- **Custom de la institucion:** creado y editable por el Super Admin

La resolucion es: primero buscar configuracion custom de la institucion, luego fallback al default de plataforma.

## Aplicacion en Programa de asignatura

- Tipos de RecordType de `CurricularSection` (LearningOutcome, EvaluationComponent, etc.) son **defaults de plataforma**.
- "Secciones complementarias custom" (CAP-CUR-013) seran custom institucionales — el Super Admin puede agregar nuevos RecordTypes para su institucion.
- El catalogo de modalidades (Presencial/Online/Hybrid) es default; tipos de actividad academica (CAP-CUR-036) seran custom.

## Estado de implementacion

Implementado: el mod opera en produccion con defaults de plataforma para los RecordTypes base. La extensibilidad para custom institucionales (CAP-CUR-013) sigue su propio alcance, independiente de este ajuste.

## Referencias

- [BR-TNT-001](BR-TNT-001.md) (aislamiento)
- CAP-CUR-013 (configuracion estructura)
