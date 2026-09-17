---
id: DECISION-up1-manager-id-column-selector-UPONE-1751
project: up1
type: decision
module: up1-manager
---

Se agrego un select "Id Column" en la pestaña Metadata del editor de objeto, poblado en runtime con los campos escalares propios (useObjectIdColumnOptions.ts, reusando useFormulaFieldNavigator; las FK se excluyen porque son los ids opacos que esta feature reemplaza). A diferencia de todo otro campo editable en esa pestaña, no lleva disableConditions: queda editable incluso para objetos CORE, que son los que necesitan elegir su columna identificadora. Se excluyeron ademas las columnas de bookkeeping de plataforma. Documentado como excepcion deliberada al principio de que los objetos CORE no se editan desde el mod.

**sourceRef:** fb46e1e objectdefinition-edit.json + useObjectIdColumnOptions.ts; b15c167 (exclusion bookkeeping); 47f6d24 docs.
