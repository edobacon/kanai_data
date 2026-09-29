---
id: RULE-curriculum-mapping-plan-publicado-congela-tributacion-UPONE-1770
project: up1
type: rule
module: curriculum-mapping
level: must
tags:
  - UPONE-1770
  - TICKET-151
  - sp11
  - tributacion
---

alignmentRules.js agrega la regla R-PL: el plan del planEntry debe estar en un estado editable (isPlanEditableStatus) para crear, mover, retirar o guardar en conjunto una tributacion (CompetencyAlignment). El guard corre en el servidor, dentro de la transaccion del resolver y antes de escribir, en las cinco vias (resolver individual, batch, bulkApply y las demas). La grilla pasa a solo lectura cuando el plan no es editable, con aviso y errores traducidos.

sourceRef: b23caa0 logic/helpers/alignmentRules.js:24,258,286,320; a3728ba logic/alignmentView.resolver.js
