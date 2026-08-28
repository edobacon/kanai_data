---
id: RULE-core-019
project: up1
type: rule
module: core
tags:
  - codegen
  - resolvers
  - architecture
  - validation
  - metadata
---

# Keys declarativas per-capacidad del JSON: validar shape en build-time (codegen), consumir directo desde el JSON en el resolver — sin sync extra al registry si el consumer es por-resolver

## What

Cuando un objeto declara una key declarativa que solo consume **un resolver puntual** (no logica transversal del sistema), el patron recomendado es:

1. **Build-time (codegen)**: validar el shape de la key con un helper modular de codegen. El codegen falla con error claro si el shape es invalido (campos faltantes, tipos incorrectos). Esto da feedback temprano al dev.
2. **Runtime (resolver)**: el resolver lee la key directo desde el JSON del objeto. **No** se sincroniza al registry (`core_ObjectDefinition`) salvo que multiples consumers transversales la necesiten.

Contraejemplo (cuando SI sincronizar al registry): si la config es consumida por logica transversal (varios resolvers, workers, frontend) → sincronizar a `core_ObjectDefinition` via Fase 3 del codegen (patron de `versioningConfig`). El criterio es **alcance del consumer**: por-resolver puntual → leer del JSON; transversal → registry.

## Why

Sincronizar todo al registry agrega acoplamiento y una columna + sync que solo se justifica si el dato se consume desde multiples lugares o necesita query-ability. Para una key que solo un resolver lee, el JSON del objeto ya es la fuente de verdad accesible en runtime — el sync extra es overhead sin retorno. Separar la responsabilidad (validar en build, consumir en runtime) mantiene el feedback temprano sin pagar el costo del registry.

## Where

- **Files**:
  - Validacion build-time: helpers modulares en `up1/object-manager/src/services/codegen/`
  - Consumo runtime: `up1/object-manager/src/graphql/resolvers/**`
- **Layers**: backend (codegen + resolvers)

## When

Al diseñar una key declarativa nueva bajo `metadata` de un objeto. Decidir entre "leer del JSON en el resolver" vs "sincronizar al registry" segun el alcance del consumer (puntual por-resolver vs transversal).

## Verification

Review manual en design: para cada key declarativa nueva, documentar quien la consume. Si es 1 resolver → no sync al registry, validacion en codegen + lectura directa. Si es transversal → sync al registry justificado.

## Source

- **Discovered in**: TICKET-033, Session 6 (L5)
- **Evidence**: HU-0d valido el shape de `polymorphicChildren` en build-time (helper de codegen) y lo consume directo desde el JSON en el resolver de `deepClone`, sin sincronizar al registry — porque solo el resolver de clonacion lo necesita. Contrasta con `versioningConfig` (HU-0j) que SI se sincroniza al registry porque HU-1+ lo consume transversalmente.
- **Related**: RULE-core-017 (`versioningConfig` en registry — caso transversal)
