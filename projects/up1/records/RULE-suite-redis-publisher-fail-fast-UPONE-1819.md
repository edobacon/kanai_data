---
id: RULE-suite-redis-publisher-fail-fast-UPONE-1819
project: up1
type: rule
module: suite
tags:
  - UPONE-1819
  - sp10
  - sp11
  - suite-redis
---

Dos niveles distintos en server/utils/redisClient.ts:
- Por comando (sin cambios desde sp10): publish() no encola ni reintenta. enableOfflineQueue:false, maxRetriesPerRequest:null y reconnectOnError:()=>false, para que un Redis inestable no agregue latencia y sseFanout.ts caiga enseguida a la entrega same-pod.
- Conexion del socket (cambio de sp11): retryStrategy ya NO es ()=>null. Con ()=>null, ioredis abandonaba la reconexion para siempre tras la primera falla, y si Redis no estaba listo al arrancar el pod (carrera real con el healthcheck de docker-compose) el singleton quedaba muerto aunque Redis se recuperara. Ahora publisher y subscriber reintentan en segundo plano con backoff acotado (times => min(times*1000, 30000)) sin bloquear ningun publish. El subscriber hace su SUBSCRIBE en el evento 'ready', no en el constructor. Se loguea cada intento de reconexion y la recuperacion.

sourceRef: 9fb3816 (fail-fast original); 0850977 y b6c300d server/utils/redisClient.ts:48 (createPublisher), :69-85 (flags), :78 y :117 (retryStrategy), :92 ('ready'); 6210bb5, cffe224, 0da9341 (logs de reconexion)
