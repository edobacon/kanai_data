---
id: BUG-curriculum-mapping-alta-tributacion-sin-contributiontype-UPONE-1770
project: up1
type: bug
module: curriculum-mapping
tags:
  - UPONE-1770
  - TICKET-149
  - sp11
  - tributacion
---

El alta rapida (modo por competencia y por malla, ambos por performAssign) no seteaba contributionType en la fila nueva del borrador, y el guardado en conjunto la rechazaba con R-5 ("falta indicar que hace la asignatura con la competencia") mostrando un error. Ahora toda alta nace con contributionType='Develops', el minimo que afirma una tributacion; el usuario lo cambia despues a Evaluates o Both en el detalle.

sourceRef: 62ea98f modsComponents/CompetencyAlignmentGrid/CompetencyAlignmentGridElement.vue:858-871
