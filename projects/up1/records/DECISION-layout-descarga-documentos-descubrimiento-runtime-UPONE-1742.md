---
id: DECISION-layout-descarga-documentos-descubrimiento-runtime-UPONE-1742
project: up1
type: decision
module: layout
tags:
  - UPONE-1742
  - sp11
  - documentos
---

Un layout solo declara layoutConfig.documents.enabled (true por defecto); la UI pregunta al backend que plantillas tiene el objeto en ese tenant, ya filtradas por permisos. Asi no hay que editar y redesplegar el layout cuando un tenant cambia sus plantillas (son datos por tenant; el layout es config versionada del mod). Tres superficies comparten useDocumentActions.ts: el boton automatico de RecordDetail en modo vista, la row action generateDocument de RecordList (se expande a una entrada por plantilla disponible) y el elemento document-download, el unico que acepta un callId explicito (opcional; sin el usa la plantilla por defecto).

sourceRef: a5707c94 docs/features/document-download.md:1-60, 11a16508 src/composables/useDocumentActions.ts, 8ebcb562 (row action generateDocument)
