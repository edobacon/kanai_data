---
id: DECISION-curriculum-design-polymorphic-document-engine-UPONE-1990
project: up1
type: decision
module: curriculum-design
tags:
  - UPONE-1990
  - document-engine
  - polymorphic
---

Curriculum.ownerId declara polymorphic {typeField: ownerType, targets: Institution}, rt__RecordState__requirement.targetId declara polymorphic por targetType (activity a Activity) y InstructionalComponent.componentTypeId queda como referencia blanda a InstructionalComponentType. No crean FK ni cambian la UI; sin la declaración una plantilla muestra [Dato no existe] en {Curriculum.owner.name}. La declaración hace ambiguos ciertos loops: dentro de Institution, {#Curriculum} necesita via institutionId o via ownerId; dentro de Activity, el alias de requirement necesita via ownerId o via targetId. curriculum-mapping también declara la fuente polimórfica (3fb68ef, 7de3a5a).

Fuente: 16c5097 objects/Curriculum.json:104-108; objects/RecordTypes/rt__RecordState__requirement.json:22-26; 37330dd rt__InstructionalComponent__curricularsection.json.
