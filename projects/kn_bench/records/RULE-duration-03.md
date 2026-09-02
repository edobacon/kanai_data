---
id: RULE-duration-03
project: kn_bench
type: rule
module: duration
---

Todos los errores que lance el modulo DEBEN ser instancias de una clase exportada DurationError (que extiende Error), nunca Error generico. Cada mensaje debe incluir el input ofensor.
