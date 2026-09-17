---
id: RULE-layout-embedded-recordlist-i18n-namespace-UPONE-1760
project: up1
type: rule
module: layout
---

Extiende a RecordList el mecanismo ensureNavNamespaces/loadInstanceNamespace que UPONE-1745 dio a RecordDetail. Un RecordList embebido para un objeto distinto al de la ruta no cargaba su propio namespace i18n, por lo que enums.<field>.<value> caia al valor crudo hasta que otro componente lo cargaba por efecto colateral. loadInstanceNamespace se movio a utils/ porque ahora es compartido.

**sourceRef:** 46a7fa42 + src/layouts/RecordList/RecordList.vue L3092-3118 + src/utils/loadInstanceNamespace.ts (nuevo).
