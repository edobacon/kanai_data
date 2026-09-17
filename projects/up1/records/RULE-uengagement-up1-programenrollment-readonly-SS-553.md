---
id: RULE-uengagement-up1-programenrollment-readonly-SS-553
project: up1
type: rule
module: uengagement-up1
---

config/layouts/retention_ProgramEnrollment_list.json y _list_indicators pierden canCreate/canEdit/canEditRowField/canDelete/canBulkDelete (los 5 en false) y se desactivan los layouts de create/edit huerfanos, porque el dato viene de una integracion externa, no de carga manual.

**sourceRef:** d875d0b + config/layouts/retention_ProgramEnrollment_list.json:197-201.
