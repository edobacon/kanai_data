---
id: RULE-suite-redis-publisher-fail-fast-UPONE-1819
project: up1
type: rule
module: suite
---

createPublisher() dejaba los defaults de ioredis (enableOfflineQueue, retryStrategy, maxRetriesPerRequest): un Redis configurado pero inestable podia encolar publish() y reintentar por segundos antes de que el catch de sseFanout.ts cayera a entrega same-pod, agregando latencia a cada push. Se fuerza enableOfflineQueue:false, retryStrategy:()=>null, maxRetriesPerRequest:null, reconnectOnError:()=>false, igual que la conexion BullMQ de object-manager.

**sourceRef:** 9fb3816 + server/utils/redisClient.ts:37-60 (createPublisher).
