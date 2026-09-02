---
id: DECISION-uengagement-services-offerings-SS475
project: up1
type: decision
module: uengagement-up1
tags:
  - SS-475
  - sp9
  - uengagement-up1
  - flow
  - offerings
---

(SS-475) FLOW-11 recomputa el estado operacional del Service desde sus lineas de servicio; se lee/escribe a traves de Activity (no por RecordType directo, como hacia el flujo original). La admin offerings list se acota a service activities y cada offering se enlaza a su service via Offering.activityId.

sourceRef (verificado por diff): uengagement-up1 6fbd83e flows/flow-11-service-operational-status-sync.json + events/activityline-{created,updated,deleted}.json (FLOW-11 recompute desde lineas), 9afe860 flows/flow-11-service-operational-status-sync.json (read/write through Activity), d6cd625 config/layouts/engagement_Offering_admin_list.json (scope a services), 31758e5 (Offering.activityId).
