---
id: RULE-curriculum-design-guard-publicacion-permiso-antes-de-leer-UPONE-1770
project: up1
type: rule
module: curriculum-design
level: must
tags:
  - UPONE-1770
  - TICKET-150
  - sp11
  - tributacion
  - permisos
---

authCheckerLoader.js centraliza la carga de checkObjectPermissions para assertCurriculumWeightsOnPublish y la query validateCurriculumAlignmentWeights: ambos chequean el permiso ANTES de leer datos. Si ninguna ruta de import carga el modulo de auth, lanza CURRICULUM_DESIGN_CANNOT_LOAD_AUTH en vez de seguir sin chequeo, para que un error de import nunca abra un hueco de permisos. El guard ademas filtra por la adopcion vigente.

sourceRef: 4929844 logic/helpers/authCheckerLoader.js:1-47, logic/curriculum-alignment-weights.resolver.js:41-42; f92e5b0 (codigo de error)
