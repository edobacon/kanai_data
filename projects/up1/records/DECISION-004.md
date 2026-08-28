---
id: DECISION-004
project: up1
type: decision
module: curriculum-design
tags:
  - curriculum-design
  - modelo
  - integracion
  - datalake
  - externalId
---

# DECISION-004: `externalId` como UN solo campo en `AcademicActivity`

## Contexto

Open question Q1 planteo si modelar el identificador externo como **1 campo** (`externalId`) o **2 campos** (`externalSystemId` + `externalRecordId`) para soportar instituciones que reciben datos desde multiples sistemas (ej: Banner + LMS propio).

La documentacion de Confluence Learning Assurance no es explicita sobre el caso multi-sistema. El codigo up1 no tiene precedente — `externalId` no existe en ninguno de los 21 Bases verificados.

## Drivers

1. **Capa de datos previa (data lake)**: el equipo Data Service esta construyendo un proceso de integracion que pre-procesa datos de N sistemas externos antes de llegar a UP1. Esa capa unifica N identificadores en un unico identificador.
2. **Modelo estandar**: el campo equivale al `integrationId` del modelo estandar de UP1, que tradicionalmente es 1 solo string.
3. **Place holder explicito**: la decision no es definitiva — sirve para SP1 mientras el equipo Data Service avanza. Puede sufrir modificaciones cuando se implemente la integracion real.

## Alternativas evaluadas

| Opcion | Pro | Contra |
|--------|-----|--------|
| **A. 1 campo `externalId: string \| null`** (elegida) | Alineado con modelo estandar (integrationId). Capa de datos asume responsabilidad de unificar N→1. Simple, sin cambios futuros si se mantiene 1 sistema integrado. | Si una institucion tiene multiples sistemas activos y quiere trazabilidad N a 1 dentro de UP1, requiere modelo adicional posterior. |
| B. 2 campos `externalSystemId` + `externalRecordId` | Permite mapeo directo N a 1 dentro de UP1 sin capa intermedia. Trazabilidad inmediata. | Sobre-modela el caso comun (1 sistema). Duplica logica que el data lake va a centralizar. |
| C. 1 campo + tabla auxiliar `ExternalMapping` | Maxima flexibilidad. | Sobre-ingenieria para SP1. |

## Decision

**Adoptar 1 solo campo `externalId: string \| null`** en `AcademicActivity`. Tipo `string`, opcional, no unique (para permitir fallbacks de ingestion). Equivale al `integrationId` del modelo estandar UP1.

## Cita verbatim de la reunion 2026-04-28

> Esteban Cortes: _"un external ID esta bien. (...) la unificacion de n identificadores a un unico identificador deberia venir en esa capa de datos. Por lo tanto, lo que termina viendo UP1 es un external ID y podria haber una relacion uno a n distintos, pero seria como una capa, ya sea otros objetos dentro del mismo UP1 o una capa de procesamiento de datos en una capa tecnologica distinta."_
>
> _"por eso yo deje uno solo, eh, por lo mismo finalmente y porque en paralelo a que nosotros vayamos avanzando en la migracion hacia UP1, el equipo de Data Service va a tener que estar trabajando como el nuevo proceso de integracion. Entonces, claro, eventualmente ese external ID podria sufrir como modificaciones, pero por ahora es como un place holder."_
>
> _"en este caso, claro, estaria como mapeando lo que en el modelo estandar es el integration ID."_

## Consecuencias positivas

- Mantiene UP1 simple (1 campo) y delega la complejidad multi-sistema al data lake (responsabilidad correcta).
- Alineado al patron `integrationId` ya establecido en UP1.
- Coincide con la realidad actual: Univalle y AIEP integran 1 sistema cada uno.

## Consecuencias negativas

- Si el data lake no avanza al ritmo esperado y aparece un cliente con N sistemas activos antes de Q3 2026, requeriria un workaround temporal.
- El campo no tiene constraint de unicidad — la responsabilidad de evitar duplicados queda en la capa de ingestion.

## Schema resultante (parcial AcademicActivity)

```json
{
  "externalId": {
    "type": ["string", "null"],
    "label": "Identificador externo",
    "description": "Identificador del sistema fuente (data lake unifica N sistemas en 1 ID antes de llegar a UP1). Equivale al integrationId del modelo estandar."
  }
}
```

## Que cubre y NO cubre

### Cubre
- Tipo y cardinalidad del campo en `AcademicActivity`.
- Justificacion del unico campo (delegacion al data lake).

### NO cubre
- Diseño del data lake / proceso de integracion (responsabilidad del equipo Data Service).
- Constraint de unicidad — definir en sprint posterior si se confirma.
- Indice de performance — pendiente verificar volumen.

## Referencias

- [Open Questions Q1](../specs/curriculum-design/open-questions.md#q1)
- [BR-INT-001 Identificador externo](../specs/curriculum-design/business-rules/BR-INT-001.md)
- Modelo estandar UP1: `integrationId` en Bases existentes
- Reunion 2026-04-28 (Eduardo + Esteban + Juan Diego)
