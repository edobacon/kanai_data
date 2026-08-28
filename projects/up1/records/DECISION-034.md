---
id: DECISION-034
project: up1
type: decision
module: mods
tags:
  - uengagement
  - studentlogger
  - datalog
  - auditoria
---

# `StudentLogger` reemplaza `core_DataLog` como historial de cambios del estudiante

## Contexto

El tab de "change-log" del registro de estudiante en uengagement-up1 leia el historial generico `core_DataLog` para mostrar los cambios de matricula y factores de riesgo. Ese historial generico no modela bien las dos naturalezas de cambio que el equipo de retencion necesitaba distinguir en la UI (cambios de matricula vs cambios de factor de riesgo), ni permite adjuntar contexto de dominio propio a cada entrada.

## Decision

Se crea el objeto de dominio `StudentLogger` (`mods/uengagement-up1/objects/StudentLogger.json`) con dos RecordTypes (`rt__EnrollmentChange__StudentLogger`, `rt__RiskFactorChange__StudentLogger`), alimentado por tres eventos (`programenrollment-updated`, `studentriskfactor-created`, `studentriskfactor-updated`) y tres flows (`flow-16-programenrollment-logger`, `flow-17-riskfactor-added-logger`, `flow-18-riskfactor-changed-logger`). El tab de change-log del registro de estudiante (`config/layouts/retention_ProgramEnrollment_view.json`) pasa a leer `StudentLogger` en vez de `core_DataLog`, y se elimina el layout `retention_dataLogEntry_view.json` que exponia el historial generico para ese caso de uso.

## Alternativas descartadas

- **Seguir usando el historial generico `core_DataLog` para ese tab**: es el comportamiento previo. Se descarta porque `core_DataLog` no distingue el tipo de cambio de dominio (matricula vs factor de riesgo) sin logica adicional en el front, y cualquier campo de contexto especifico de retencion tendria que forzarse dentro de la forma generica del DataLog.

## Impacto y reversibilidad

Cambio de contrato de datos observable: la UI del tab de change-log ya no lee `core_DataLog` para este caso de uso, sino el objeto de dominio propio. DET-40 (auditoria de reemplazo) aplica directamente: se retira un camino (`core_DataLog`) por otro (`StudentLogger`), y habria que verificar que todo lo que el historial generico cubria para este tab esta replicado en el nuevo objeto; esa verificacion puntual no se completo en este recon y queda pendiente. Reversible restaurando `retention_dataLogEntry_view.json` y el layout previo, pero se perderia la separacion por tipo de cambio que motivo la migracion.
