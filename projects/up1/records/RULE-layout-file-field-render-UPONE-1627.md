---
id: RULE-layout-file-field-render-UPONE-1627
project: up1
type: rule
module: layout
tags:
  - UPONE-1627
  - UPONE-1741
  - sp10
  - file-field
---

Render del campo tipo file en layouts: molecule FileField (src/components/molecules/FileField/FileField.vue) + elemento Vueform (src/components/vueform/elements/FileFieldElement.vue) en RecordDetail (subir/borrar + link de descarga), y celda file read-only en RecordList (muestra nombre + tamaño). Composables: useAllowedFileTypes.ts (tipos permitidos), useFieldFileDownload.ts (descarga); useImportTemplate excluye los campos file de la plantilla Excel de import. Fix UPONE-1741 (a944bc2): hidratacion del file-field en layouts servidos desde BD + regla required aplicada a booleanos (src/utils/deriveVueformRules.ts). sourceRef: 538a8b4 (RecordDetail render), 6b27510 (RecordList cell), 155fba6 (composable tipos), a944bc2 (hydration+boolean required). Complementa DECISION-object-manager-file-field-storage-UPONE-1627 (almacenamiento por tenant) y DECISION-up1-manager-file-field-editors-UPONE-1627 (editores en el manager).
