---
id: DECISION-curriculum-design-planentry-delete-toctou-UPONE-1757
project: up1
type: decision
module: curriculum-design
---

`assertDeletionKeepsRequirementsSatisfiable` evalua satisfacibilidad sobre un snapshot leido FUERA de la transaccion de borrado; dos requests concurrentes pueden cada una validar contra un estado que la otra invalida. Bajo READ COMMITTED, mover el guard dentro de la tx acota pero no cierra la ventana sin `SELECT ... FOR UPDATE` sobre el arbol de requisitos o aislamiento SERIALIZABLE. Decision: se deja registrada (mismo limite que la unicidad diferida) y el cierre se difiere a enforcement a nivel DB; mismo limite aplica al create batch.

**sourceRef:** 821bdb5 + logic/planEntry-delete-batch.resolver.js:147-156 (assertDeleteBatchDomainInvariants).
