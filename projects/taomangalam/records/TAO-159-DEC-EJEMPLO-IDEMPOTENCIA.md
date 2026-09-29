---
id: TAO-159-DEC-EJEMPLO-IDEMPOTENCIA
project: taomangalam
type: decision
module: EP-00
tags:
  - TAO-159
  - GH-12
  - pg-boss
  - idempotencia
---

Decision (HU-00-07 / TAO-159): la idempotencia por clave del trabajo de ejemplo se apoya en un `EffectStore` en memoria (`createInMemoryEffectStore`), instanciado a nivel de modulo en `defaultConsumerDeps` (`server/src/queue/consumers.ts`). Es un registro POR PROCESO.

Limite aceptado: el criterio «el mismo trabajo encolado dos veces con la misma clave produce un solo efecto observable» se cumple dentro de un proceso. No cruza procesos (backend y `worker` levantados a la vez tienen cada uno su propio Set) ni reinicios; `singletonKey` de pg-boss solo deduplica mientras el trabajo previo sigue en cola o activo, no despues de completado. El trabajo de ejemplo NO tiene efecto de negocio, asi que el impacto es nulo y el store en memoria alcanza como plantilla; la limitacion quedo documentada en los comentarios de `jobs/example-job.ts` y `queue/consumers.ts`.

Regla para jobs reales: un trabajo real con efecto de negocio DEBE registrar ese efecto en un store DURABLE (p.ej. una tabla del schema de aplicacion, con el rol que corresponda), no en el store en memoria de la plantilla.

Alternativa descartada: hacer durable el store del ejemplo en el schema `pgboss`; no aplica porque ese schema es de la libreria, y el rol de cola no puede tocar el schema de aplicacion (DEC-200).
