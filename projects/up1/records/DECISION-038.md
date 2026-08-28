---
id: DECISION-038
project: up1
type: decision
module: layout
tags:
  - layout
  - testing
  - visual-regression
  - dx
---

# Se descarta el PoC de regresion visual en layout

## Contexto

Como parte del plan de calidad y DX del workspace `layout` (fases 0-4, Nelson Cornejo), se integro un PoC de regresion visual (`toMatchScreenshot`, `src/__visual__`) sobre Vitest 4, con el objetivo de detectar cambios visuales no intencionales en los componentes de Atomic Design.

## Decision

El PoC se integra y luego se abandona en la misma ventana, con razon explicita en el propio commit `d0901edd` ("chore: drop the visual regression PoC (decision: DX cost outweighs value)"): mantener baselines de screenshot es un costo de mantenimiento que el equipo no va a sostener, y los desarrolladores de mods (la audiencia mas amplia que consume `layout`) nunca fueron el publico objetivo de esta suite. `toMatchScreenshot` y `src/__visual__` se remueven; el bump de Vitest 4 que lo acompañaba sobrevive archivado en la rama `feat/fase-5-visual-regression` por si se retoma con nueva evidencia. El propio commit deja una nota de Fase 7: la descomposicion del monolito (RecordDetail.vue, ~4000+ lineas) pierde la red de seguridad visual que este PoC habria dado.

## Alternativas descartadas

- **Mantener la suite de regresion visual en el pipeline de layout**: se descarta porque el costo de mantener baselines (actualizarlas en cada cambio visual intencional, revisar falsos positivos de renderizado) supera el valor que aporto durante el PoC, segun la evaluacion propia del equipo.

## Impacto y reversibilidad

Sin impacto en el comportamiento de produccion: es tooling de testing, no codigo de plataforma. Se registra explicitamente para que nadie reintente la misma integracion sin nueva evidencia de que el costo de DX bajo o el valor subio (ej. si la descomposicion del monolito de RecordDetail.vue hace que la falta de red visual se vuelva mas dolorosa). Reversible: el trabajo de Vitest 4 queda archivado en `feat/fase-5-visual-regression` para retomar sin partir de cero.
