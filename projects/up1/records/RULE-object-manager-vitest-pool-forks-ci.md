---
id: RULE-object-manager-vitest-pool-forks-ci
project: up1
type: rule
module: object-manager
level: must
tags:
  - sp11
  - ci
  - vitest
  - prisma
---

El pool por defecto de vitest usa worker_threads, y el motor nativo de Prisma abortaba toda la suite al correr dentro de un worker thread en CI. test:ci, test:ci:unit y test:ci:security fuerzan --pool=forks (procesos, no threads). Todo script de test nuevo que cargue Prisma debe seguir el mismo patron.

sourceRef: cd9f05ca package.json:16
