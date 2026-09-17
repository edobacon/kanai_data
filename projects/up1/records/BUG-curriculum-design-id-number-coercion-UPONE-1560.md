---
id: BUG-curriculum-design-id-number-coercion-UPONE-1560
project: up1
type: bug
module: curriculum-design
---

`readRecordType` coercionaba el id a `Number(id)` cuando `!isNaN(Number(id))`, asumiendo ids numericos; se remueve la coercion (`const idValue = id`) para que el lookup use el id tal como llega, sin asumir un tipo. Mismo patron corregido en helpers hermanos (requirementActivityGuard, requirementCycleGuard, polymorphicUpdate, requirementCategoryDelete). Alineado con la migracion de ids de core de Int a String (UPONE-1560).

**sourceRef:** 0830325 + logic/curriculum-read.resolver.js:121-122 (readRecordType).
