---
id: KN-BENCH-01
project: kn_bench
type: ticket
status: closed
work_type: implement
external: KN-BENCH-01
tier: T2
module: utils
autopilot: autonomous
verification_policy: ask
teach_policy: skip
draft_policy: ask
review_policy: auto
story_points:
  estimated: 3
---

## Request

Implementar un modulo de utilidades de duracion en TypeScript, con dos funciones puras y su
cobertura de tests.

1. parseDuration(input: string): number convierte una duracion humana a milisegundos. Soporta
   unidades d (dias), h (horas), m (minutos), s (segundos) y ms, combinables y en cualquier orden
   (ej: "1h30m", "2d4h", "45s", "500ms"). Espacios opcionales entre segmentos. Valida la entrada:
   string vacio, unidad desconocida, numero sin unidad o unidad sin numero, o valores negativos,
   lanzan Error con mensaje descriptivo.
2. formatDuration(ms: number): string es la inversa: dado un numero de milisegundos no negativo,
   devuelve la forma humana canonica mas compacta (ej: 5400000 -> "1h30m", 0 -> "0ms"). Numeros
   negativos o no finitos lanzan Error.
3. Cobertura de tests que incluya: cada unidad sola, combinaciones, espacios, round-trip (parse
   seguido de format y viceversa) y todos los casos de error.

## Criterios de aceptacion

- typecheck pasa sin errores.
- La suite de tests corre y pasa (verde).
- parseDuration("1h30m") === 5400000.
- formatDuration(5400000) === "1h30m".
- parseDuration("") y parseDuration("10x") lanzan Error.
- formatDuration(-1) lanza Error.
