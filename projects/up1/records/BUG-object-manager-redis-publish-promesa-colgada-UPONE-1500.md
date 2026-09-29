---
id: BUG-object-manager-redis-publish-promesa-colgada-UPONE-1500
project: up1
type: bug
module: object-manager
tags:
  - UPONE-1500
  - sp11
  - redis
---

getPublisher().publish(...) se llamaba sin await ni catch. Con ioredis, un Redis caido rechaza esa promesa y Node mataba el proceso por unhandled rejection en medio del request (el cambio ya estaba guardado, pero el usuario veia error de conexion). Ahora se envuelve en Promise.resolve(...).catch(...): loguea el fallo y sigue, sin bloquear ni tumbar el proceso.

sourceRef: 6b9dccde src/services/applyChanges.js:111
