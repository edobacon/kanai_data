---
id: DECISION-019
project: up1
type: decision
module: core
tags:
  - object-manager
  - academic-scheduling
  - sns
  - event-system
  - topic-runner
---

# DECISION-019: `TopicRunner` genérico reusable + topic SNS compartido "up1"

## Contexto

El runner de eventos de scheduling (`SchedulingJob`) invocaba una Lambda directo y resolvía el topic SNS por tenant. UPONE-1254 renombró `SchedulingJob` → `ScenarioJob` y refactorizó el runner para publicar a SNS en vez de invocar Lambda directamente.

## Decisión

`TopicRunner` (`object-manager/src/helpers/snsHelper/runners/TopicRunner.js`, `class TopicRunner extends AlgorithmRunner`) recibe `topicName` por constructor en vez de resolverlo por tenant, y publica a un topic SNS **compartido "up1"** (no uno por tenant). Esto permite que otros mods reutilicen el mismo runner con su propio `topicName` sin duplicar la clase. Se renombra `SCHEDULING_TOPIC_OVERRIDE` → `TOPIC_NAME_OVERRIDE` (nombre genérico) y se simplifica el payload SNS (elimina `algorithm`, renombra `jobId`→`scenarioJobId`); la ruta `/complete` pasa a `/end`.

## Alternativas descartadas

- **Mantener runner exclusivo de scheduling + duplicar clase para otros mods**: descartada porque perpetúa código casi-idéntico por mod, divergiendo con el tiempo (misma lógica de retry/error-handling mantenida en N lugares).
- **Topic SNS por tenant** (comportamiento previo): descartado porque no aporta aislamiento real (el consumidor ya filtra por tenantId en el payload) y multiplica la configuración de infraestructura sin beneficio.

## Impacto / reversibilidad

Afecta `object-manager` (helper compartido) y `academic-scheduling` (primer y único consumidor hoy). Cambio de contrato observable: el objeto `ScenarioJob` reemplaza a `SchedulingJob`, y el payload SNS cambia de forma. Reversibilidad: alta a nivel de código (es un refactor de la clase runner), pero requiere coordinar cualquier consumidor SNS externo que dependiera del nombre de campo anterior (`jobId`, `algorithm`).
