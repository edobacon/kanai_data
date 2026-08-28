---
id: DECISION-020
project: up1
type: decision
module: curriculum-design
tags:
  - object-manager
  - curriculum-design
  - rbac
  - capability
  - clone
  - versioning
---

# DECISION-020: Capability `curriculum:clone` separada de `curriculum:version`, enforced en el engine

## Contexto

UPONE-1450 introdujo un motor de deep-clone atómico (`$transaction` Serializable) para creates con `prefillFrom.deepClone`, usado tanto para clonar Curriculum/Plan de forma independiente como para crear una nueva versión (`asNewVersion`). Ambos flujos comparten el mismo mecanismo de clonado profundo pero tienen semánticas de negocio distintas.

## Decisión

Se definen dos capabilities separadas: `curriculum:clone` (clonar sin versionar) y `curriculum:version` (crear nueva versión). El enforcement se movió al **engine** (`object-manager/src/graphql/resolvers/instance.resolver.js:3219-3220,3224`, `runtimePrefillFrom`), gateado por `!asNewVersion`, para cubrir el path genérico de `createInstance` (no solo el resolver específico del mod). Así cualquier objeto que declare `deepClone` en su prefill hereda el gate correcto sin que cada mod reimplemente el chequeo.

## Alternativas descartadas

- **Una sola capability `curriculum:manage` para ambos flujos**: descartada porque colapsa dos operaciones con impacto de negocio distinto (duplicar un plan vs. versionar el plan vigente) bajo el mismo permiso, impidiendo RBAC granular (ej. un rol que puede clonar pero no versionar oficialmente).
- **Enforcement solo en el resolver de mod (curriculum-design)**: descartada porque no cubre el path genérico de `createInstance` del engine; cualquier otro objeto con `deepClone` en su prefill quedaría sin protección salvo que reimplemente el chequeo manualmente.

## Impacto / reversibilidad

Afecta `object-manager` (engine genérico de creates) y `curriculum-design` (primer consumidor). Nuevo requisito de capability para clonar/versionar Curriculum/Plan, cambio de contrato observable (RBAC). Reversible: es agregar/quitar un gate de capability; no toca el modelo de datos.
