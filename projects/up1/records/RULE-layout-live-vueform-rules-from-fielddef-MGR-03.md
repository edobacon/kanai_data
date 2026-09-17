---
id: RULE-layout-live-vueform-rules-from-fielddef-MGR-03
project: up1
type: rule
module: layout
---

required/format/pattern/min-max/integer-numeric se espejan en vivo desde core_FieldDefinition, con la misma semantica del inline-edit de RecordList. El merge es no destructivo: si el layout declara una regla con el mismo nombre, la del layout gana sobre la derivada del backend. Sincroniza useValidationParser con flush inmediato.

**sourceRef:** 7582f105 + src/composables/useValidationParser.ts + useObjectValidationFields.ts; f4d2ec74 (flush inmediato).
