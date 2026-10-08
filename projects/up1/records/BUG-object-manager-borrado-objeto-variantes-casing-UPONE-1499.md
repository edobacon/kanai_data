---
id: BUG-object-manager-borrado-objeto-variantes-casing-UPONE-1499
project: up1
type: bug
module: object-manager/object-definitions
tags:
  - UPONE-1499
  - delete
  - casing
---

En Linux un objeto puede tener dos ext JSON: createObjectDefinition escribe ext__c__FooBar.json y customFields.js escribe ext__c__foobar.json (el que lee el codegen). Si el borrado deja una variante viva en disco o S3, re-registra el objeto o sus campos. Ahora findObjectJsonFilePaths localiza el casing real y borra además las variantes original y minúscula en S3. Las capabilities de objeto y de campos (por nombre exacto) y el registry se borran en una sola $prisma.$transaction, y el pipeline de schema corre después de auditar. El commit c331557c restauró este fix tras un revert (98769c64).

Fuente: 35cfea0b src/graphql/resolvers/objectDefinition.resolver.js:267-290,1925-1940.
