---
id: KN-BENCH-02
project: kn_bench
type: ticket
status: closed
work_type: implement
external: KN-BENCH-02
tier: T2
module: duration
autopilot: autonomous
verification_policy: ask
teach_policy: skip
draft_policy: ask
review_policy: auto
---

## Request

Implementar un modulo de utilidades de duracion en TypeScript: parseDuration(input) que convierte
"1h30m"/"2d4h"/"45s"/"500ms" a milisegundos (unidades d/h/m/s/ms, combinables, orden libre, espacios
opcionales entre segmentos, validacion con Error ante vacio/unidad desconocida/negativos), y
formatDuration(ms) inversa (forma canonica compacta, 0 -> "0ms", negativos/no-finitos lanzan Error).
Cobertura de tests: cada unidad, combinaciones, round-trip y errores.

## Criterios de aceptacion
- parseDuration("1h30m")===5400000; formatDuration(5400000)==="1h30m".
- parseDuration("") y parseDuration("10x") lanzan Error; formatDuration(-1) lanza Error.
- typecheck limpio y suite verde.
