---
id: DECISION-005
project: up1
type: decision
module: curriculum-design
tags:
  - curriculum-design
  - workflow
  - modelo
  - sprint-futuro
  - postergado
---

# DECISION-005: Postergar modelado completo de `workflowState` y objeto `Workflow` a sprint futuro

## Contexto

Open question Q2 detecto inconsistencia entre los valores del enum `workflowState` actual en Confluence y los valores presentes en los ejemplos legacy v2.2:

- **Enum Confluence/draft actual**: `draft`, `active`, `suspended`, `discontinue` (lowercase)
- **Ejemplos Univalle/AIEP**: `Review`, `Approved`, `Published`, `OpenForEdit`, `Deprecated` (PascalCase, valores distintos)

El modelo de objetos `Workflow` y la logica de transiciones de estado son parte de la mecanica de aprobacion del Programa de asignatura ([CAP-CUR-019](../specs/curriculum-design/capabilities/CAP-CUR-019.md)) — capability NO incluida en el alcance de este sprint.

## Drivers

1. **Alcance del sprint**: TICKET-006/007/009 modelan los objetos base, NO la maquinaria de workflow.
2. **Refactor anticipado**: Esteban confirmo que el enum y la logica seran modificados cuando se implemente la capability del workflow. Tomar decision firme ahora seria refactor a corto plazo.
3. **Consistencia local**: aun sin modelar Workflow, hay que dejar los ejemplos seed coherentes con el enum disponible para que carguen sin errores.

## Decision

**Postergar** el modelado completo del enum `workflowState` y del objeto `Workflow` a sprint futuro junto con [CAP-CUR-019](../specs/curriculum-design/capabilities/CAP-CUR-019.md).

**Acciones inmediatas para SP1 (este sprint)** — ACTUALIZADAS 2026-04-28 tras revision contra Confluence:

1. **Enum alineado a Confluence**: `["Draft", "Review", "Approved", "Published", "OpenForEdit", "Deprecated"]` (PascalCase, 6 valores oficiales del modelo Learning Assurance v1.2).
2. `workflowState` es **required** en el schema (no nullable). Default `"Draft"`.
3. **Ajuste retroactivo**: el enum minimo provisorio inicial (`["draft", "active", "suspended", "discontinue"]` lowercase) se descarta. La revision de Confluence mostro que los 6 valores ya estan definidos firmemente.
4. NO crear el objeto `Workflow` en este sprint (sigue postergado a CAP-CUR-019).
5. NO definir transiciones permitidas en este sprint (las transiciones son de la maquina de estados, fuera de SP1).

## Cita verbatim de la reunion 2026-04-28

> Esteban Cortes: _"considerar Edu, que todavia falta modelar (...) que es parte de lo que vamos a hacer este sprint, el objeto de workflow y como va a ser la relacion con ese estado. (...) yo diria, por lo tanto, que no consideremos que esa lista de estados va a cambiar, pero como para el proximo sprint."_
>
> _"el enum en particular especifico que vayamos a usar y la logica va a ser modificada. Sabemos que va a tener que tener un workflow state el objeto de academic unit, algun estado, pero considerarlos como un preview, digamos, de lo que va a ser."_
>
> _"o sea, yo digo que si estan en los ejemplos para completar, completa en el enum el faltante, digamos. Hazlos consistentes, ajustalos para que sean consistentes."_
>
> _"o sea, lo podeis cambiar como con publish, no se, algo asi con alguno de los que ya estan definidos ahi, cambiar, ajustar el ejemplo."_

## Mapping para seed legacy (actualizado 2026-04-28)

Tras alinear con Confluence, los valores del legacy v2.2 ya coinciden directamente con el enum oficial:

| Valor legacy | Valor SP1 (Confluence) | Comentario |
|--------------|------------------------|------------|
| `Active` | `Approved` | (Univalle Active = Approved en taxonomia Confluence) |
| `Published` | `Published` | Mapeo directo |
| `Approved` | `Approved` | Mapeo directo |
| `Review` | `Review` | Mapeo directo |
| `OpenForEdit` | `OpenForEdit` | Mapeo directo |
| `Deprecated` | `Deprecated` | Mapeo directo |

> **Nota**: el seed actual en `mods/curriculum-design/seed/_data-univalle.js` y `_data-aiep.js` carga ambos cursos con `workflowState='Approved'` (por defecto activo, listo para usarse). En sprint futuro CAP-CUR-019 se modela la maquina de transiciones.

## Consecuencias positivas

- Desbloquea TICKET-006 sin tomar decision arquitectonica anticipada.
- Permite cargar el seed legacy sin errores de validacion enum.
- Reserva la decision de fondo para cuando exista contexto pleno (CAP-CUR-019).

## Consecuencias negativas

- El seed cargado en SP1 NO refleja fielmente la semantica original de cada estado legacy.
- Requerira un script de re-migracion de `workflowState` cuando se implemente Workflow real.

## Que cubre y NO cubre

### Cubre
- El enum minimo a usar en el JSON Schema durante SP1.
- El mapping de valores legacy → valores SP1.
- La decision de NO modelar el objeto `Workflow` en este sprint.

### NO cubre
- El enum final del workflowState (definicion en CAP-CUR-019).
- Las transiciones permitidas entre estados (depende de Q9 + Q10).
- El casing definitivo (depende de Q10, no bloqueante este sprint).
- Los handlers de logica de aprobacion (CAP-CUR-019).

## Referencias

- [Open Questions Q2](../specs/curriculum-design/open-questions.md#q2)
- [CAP-CUR-019 Workflow del programa](../specs/curriculum-design/capabilities/CAP-CUR-019.md)
- [BR-WKF-001](../specs/curriculum-design/business-rules/BR-WKF-001.md), [BR-WKF-002](../specs/curriculum-design/business-rules/BR-WKF-002.md)
- [BR-MIG-001](../specs/curriculum-design/business-rules/BR-MIG-001.md) (herencia MADS)
- Reunion 2026-04-28
