---
id: DECISION-suite-sse-redis-fanout-UPONE-1819
project: up1
type: decision
module: suite
---

Con mas de un pod de suite, el registro de clientes SSE era un Map en memoria por proceso: un push podia caer en un pod sin la conexion del browser destino y perderse en silencio. sseFanout.ts agrega que cada pod se suscriba a un canal Redis ('suite:sse-fanout') y entregue localmente al recibir el mensaje, ADEMAS de la entrega same-pod. Si Redis no esta configurado o esta caido, degrada al comportamiento previo (fail-open).

**sourceRef:** f8ec340 + server/utils/sseFanout.ts:1-75.
