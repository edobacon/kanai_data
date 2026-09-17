---
id: DECISION-object-manager-document-templates-UPONE-1741
project: up1
type: decision
module: object-manager
tags:
  - UPONE-1741
  - sp10
  - document-templates
---

Feature de plantillas de documentos en el core. Objeto `up1_document_template` (objects/up1/objectmanager/up1_document_template.json) con hooks de ciclo de vida (src/services/documents/documentTemplateHooks.js via src/services/objectHooks.js). Motor de plantillas: sintaxis + AST (src/services/documents/templateSyntax.js, templateAst.js), parser Markdown (markdownParser.js) y Word .docx (parsers/docxParser.js), resolver de datos (templateResolver.js), validador (templateValidator.js) expuesto por query validateDocumentTemplate. Render PDF (pdfRenderer.js) y mutation generateDocument (src/graphql/resolvers/documentTemplate.resolver.js + services/documents/documentService.js + typeDefs/static.js). Superficie UI: pestaña de plantillas en UP1 Manager (mod up1-manager, mismo UPONE-1741). sourceRef: e2458f8 (objeto+hooks), c4f94f0 (sintaxis/AST/markdown), a26edba (docxParser.js), 3f3c97f (templateValidator.js), d3875046 (pdfRenderer.js + generateDocument). Doc: docs/features/document-templates.md.
