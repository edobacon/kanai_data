---
id: DECISION-up1-manager-recordtype-maker-MGR
project: up1
type: decision
module: up1-manager
tags:
  - MGR-01
  - MGR-02
  - sp9
  - recordtype
  - up1-manager
---

Feature UP1 Manager para crear/editar RecordTypes (MGR-01/02). Guards de ownership, escritura y eliminacion de RT; persistencia de enums, default, helpText, formula y array-required incluyendo transiciones de elementos; integracion de ENUMS y FORMULA en la creacion de RT; capabilities mas especificas por elemento RT.

sourceRef (verificado por diff): object-manager 18374c46 src/graphql/resolvers/objectDefinition.resolver.js + src/graphql/typeDefs/static.js (guards ownership/write/delete RT), f9beb2cd (persistencia enums/default/formula/transiciones); up1-manager 9035b23 (ENUMS+FORMULA en creacion RT), 4d2e925 (capabilities por elemento).
