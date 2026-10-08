---
id: BUG-object-manager-multivalue-recordlist-permiso-campo-hoja-UPONE-1859
project: up1
type: bug
module: object-manager/auth
tags:
  - UPONE-1859
  - rbac
  - listInstances
  - security
---

Un layoutConfig enviado por el cliente podía leer cualquier campo alcanzable por una relación inversa sin que corriera el chequeo de capability. Se extrajo createLeafFieldAccessChecker a sourceContract.js, compartido por getInstance y listInstances, y se limita source.limit a MULTIVALUE_FETCH_CAP. También se corrigió un crash al declarar relations y una columna source sobre la misma relación.

Fuente: 1dd05efa src/utils/sourceContract.js:165; src/graphql/resolvers/instance.resolver.js:3139,4152.
