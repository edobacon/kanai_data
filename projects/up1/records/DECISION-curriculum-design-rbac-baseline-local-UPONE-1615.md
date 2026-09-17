---
id: DECISION-curriculum-design-rbac-baseline-local-UPONE-1615
project: up1
type: decision
module: curriculum-design
---

El baseline de equivalencia RBAC de los 4 roles curriculares se mueve de `up1/docs/rbac` (compartido) a `docs/rbac/baseline-curricular-caps-2026-09-02.json`, local al mod. El gate `profileBaselineEquivalence` pasa a leerlo local (ya no trepa al repo up1) y delega la no-escalada de los roles core (Admin/Consultor) al guardrail propio de up1, dejando el gate del mod self-contained sobre su propio subconjunto de roles.

**sourceRef:** ea165d8 + docs/rbac/baseline-curricular-caps-2026-09-02.json (nuevo) y tests/unit/profileBaselineEquivalence.test.js.
