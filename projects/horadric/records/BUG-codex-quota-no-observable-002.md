---
id: BUG-codex-quota-no-observable-002
project: horadric
type: bug
module: codex
status: wontfix
severity: medium
tags:
  - codex
  - quota
  - delegation
  - fallback
  - observability
---

# El cupo restante de Codex no es consultable, asi que el fallback tiene que ser reactivo

## Symptom

No hay forma verificada de saber cuanto cupo queda **antes** de delegar. Cualquier diseno que quiera enrutar segun el cupo disponible (por ejemplo "si queda poco, usa el host local") no tiene de donde leerlo.

## Expected

Una superficie local (comando, archivo de estado, campo en el stream) que exponga cupo restante o porcentaje usado, como la que existe para los modelos (`codex debug models`).

## Impact

Cualquier gate que dependa de un proveedor externo se puede colgar en la primera falla de cupo si no hay red. El impacto real quedo acotado por el fallback reactivo: la delegacion falla en ~4s, se clasifica y el rol lo toma el host local o el orquestador con el handoff persistido, asi que el gate avanza. Lo que se pierde es la posibilidad de **anticipar**: no se puede decidir a quien delegar segun el cupo disponible, ni avisar antes de arrancar una session larga.

## Root cause

Medido el 2026-07-31:

- `codex debug` solo expone `models` y `prompt-input`.
- `~/.codex/.codex-global-state.json` (44KB) no guarda estado de rate limit: un walk recursivo por claves con `rate`/`limit`/`usage`/`quota`/`credit` solo devuelve `otraces-sample-rate`.
- El evento `turn.completed` del stream trae `usage` (tokens de **esta** llamada), no cupo restante.
- La UI interactiva muestra rate limits con `/status`, pero no hay equivalente no-interactivo.

## Reproduction

```bash
codex debug --help                      # solo models y prompt-input
python3 -c "import json;d=json.load(open('$HOME/.codex/.codex-global-state.json'));print([k for k in d if 'limit' in k.lower() or 'quota' in k.lower()])"
```

## Workaround

**Fallback reactivo**: intentar, clasificar el fallo y degradar. `commands/dkc-delegate` clasifica en `quota | model-unavailable | schema-invalid | transport | unknown` con **default a `unknown`**, y cualquier clase que no sea `schema-invalid` (bug propio) degrada al host local o le pasa el rol al orquestador con el handoff persistido.

El costo de esa eleccion es un intento fallido antes de degradar: medido en ~4s y sin tokens de razonamiento en los 2 casos forzables.

**Lo que queda sin verificar**: el texto exacto del error de cupo real, porque el cupo no se puede agotar a demanda. Por eso el matcher es defensivo. La receta para cerrarlo cuando ocurra esta en `HOR-130` (seccion Testing, "Receta para verificar el caso de cupo real").

## Corolario general

Cuando el limite de un proveedor externo no es observable, la resiliencia se construye en el **manejo del fallo**, no en la prediccion. Y el matcher de errores conviene defensivo: es mejor degradar de mas que colgar un gate.
