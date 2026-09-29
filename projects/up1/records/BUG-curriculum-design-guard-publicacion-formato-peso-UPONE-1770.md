---
id: BUG-curriculum-design-guard-publicacion-formato-peso-UPONE-1770
project: up1
type: bug
module: curriculum-design
tags:
  - UPONE-1770
  - TICKET-150
  - sp11
  - tributacion
---

parseWeightToCents/isFiniteWeight validaban el peso con Number(valor), que acepta formatos que curriculum-mapping rechaza al guardar (notacion cientifica, hexadecimal, punto sin digitos a un lado, signo explicito). Ahora exige el mismo patron de texto decimal simple (DECIMAL_TEXT_PATTERN = /^\d+(\.\d+)?$/) que normalizeContributionPercentage de curriculum-mapping, asi el guard rechaza exactamente lo que cm ya rechazaria.

sourceRef: f09494c logic/helpers/curriculumAlignmentWeights.js:97-107,150-151
