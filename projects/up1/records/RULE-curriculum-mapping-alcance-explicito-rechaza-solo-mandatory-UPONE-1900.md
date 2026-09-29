---
id: RULE-curriculum-mapping-alcance-explicito-rechaza-solo-mandatory-UPONE-1900
project: up1
type: rule
module: curriculum-mapping
level: must
tags:
  - UPONE-1900
  - sp11
  - adopcion
---

validateMatrixAdoption rechazaba cualquier adoptionPolicy no vacia con alcance explicito. Se acoto a rechazar solo Mandatory: es el unico caso donde perder la politica rompe una garantia, porque assertExemptionAllowed exige MANDATORY para eximir una fila y sin ella desaparece la unica salida gobernada de una matriz obligatoria. Con Optional, resolveAdoptionPolicy ya persiste null y el resto compara contra MANDATORY, asi que Optional y null se comportan igual y aceptarlo no pierde nada.

sourceRef: 1f353e4 logic/helpers/validateMatrixAdoption.js:177-215,248
