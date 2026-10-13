---
id: RULE-object-manager-borrar-registro-borra-archivos-UPONE-1979
project: up1
type: rule
module: object-manager
tags:
  - UPONE-1979
---

El borrado de un registro elimina los archivos de sus campos de tipo archivo, y tambien los de los registros borrados en cascada. La limpieza la hacen `purgeDeletedRecordFiles` y `purgeCascadeFiles`, llamadas desde el resolver de instancias. [sin verificar: que pasa si el almacenamiento falla; hay un catch en recordFilesCleanup.js:72 que no se leyo]

sourceRef: 1b39710a (UPONE-1979), src/services/recordFilesCleanup.js:45,91, src/graphql/resolvers/instance.resolver.js:78
