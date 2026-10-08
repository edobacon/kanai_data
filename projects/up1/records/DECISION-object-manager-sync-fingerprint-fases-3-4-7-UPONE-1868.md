---
id: DECISION-object-manager-sync-fingerprint-fases-3-4-7-UPONE-1868
project: up1
type: decision
module: object-manager/codegen-sync
tags:
  - UPONE-1868
  - sync
  - fingerprint
---

Las fases 3, 4 y 7 del sync se omiten en una corrida repetida sin cambios, comparando una huella (BASEMODEL generado, fuente de codegen, directorio de objetos del tenant, generadores externos). El skip de db push no confía en un marcador local: exige un registro coincidente en core_SeedExecution del tenant (seedFile __sync_db_push__), y el marcador de codegen se borra si hizo falta push o este falló, para que una BD caída o vacía nunca se saltee. Se fuerza con UP1_SEED_RESEED=true o --seed-reseed. Alternativa descartada: marcador solo en filesystem, que no detecta una BD vacía.

Fuente: 3bb3716c y 1e5d9764 docs/features/sync-phase-gating.md:30,48-63,77-91.
