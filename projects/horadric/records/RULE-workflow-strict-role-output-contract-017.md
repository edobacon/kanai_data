---
id: RULE-workflow-strict-role-output-contract-017
project: horadric
type: rule
module: workflow
level: must
tags:
  - delegation
  - schemas
  - roles
  - structured-output
  - contracts
---

# El schema de salida de un rol se deriva de su contrato, en modo strict, y no todos los roles tienen uno

## What

Al darle a un rol DKC un JSON Schema de salida para delegarlo:

1. **Se deriva campo por campo** del bloque `## Output` de `prompts/agents/<rol>.md`. No se agregan campos, y **tampoco se recortan**: sacar `test_artifacts` o `decisions_made` del developer rompe lo que el scribe procesa despues.
2. **Modo strict obligatorio**: toda property va en `required`, y lo opcional se expresa como union con `null` (`"type": ["integer","null"]`). Un schema con properties opcionales se rechaza con `invalid_json_schema` en ~4s.
3. **Un rol sin output estructurado documentado no recibe schema inventado**. `architect` produce specs y decisions como archivos markdown (`architect.md:58-61`), asi que no es delegable con contrato de salida; `scribe` escribe el registro canonico y el host destino no tiene hook de reindex.

La parte mecanica de cada rol (ops permitidas, sandbox, `requires`, escalation) vive en `prompts/agents/contracts.yaml` y la consume `dkc-delegate`: **marcar un rol como no delegable ahi lo desactiva sin tocar codigo**.

## Why

El contrato de un rol estaba en prosa y su enforcement en un `case` hardcodeado dentro del comando. Eso tiene dos consecuencias: el contrato se puede contradecir sin que nada falle, y agregar un rol exige editar el ejecutor.

El punto 3 salio de un error real: el spec de HOR-130 pedia 4 schemas y al escribir el tercero aparecio que `architect` no tiene contrato JSON. Se corrigio el spec en vez de inventarle campos, porque el REQ prohibia exactamente eso.

El punto 1 salio de otro: el primer schema del developer recorto 3 bloques del contrato "para simplificar", y el juez de correctitud lo marco como infidelidad al contrato del rol.

## Where

- `commands/lib/schemas/roles/*.json`
- `prompts/agents/contracts.yaml`
- `prompts/agents/<rol>.md`, bloque `## Output`

## When

Al hacer delegable un rol nuevo, al cambiar el output de un rol existente, y al diagnosticar `invalid_json_schema`.

## Verificacion

```bash
./commands/dkc-delegate --role <rol> --ticket <ID> --dry-run   # resuelve desde el contrato
server/.venv/bin/python -m pytest server/tests/test_intents_manifest.py -q
```

Dos tests cuidan las invariantes: todo rol no delegable tiene que declarar **por que**, y todo rol que escribe tiene que exigir `files_scope`.
