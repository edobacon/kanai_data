---
id: RULE-workflow-verify-the-record-018
project: horadric
type: rule
module: workflow
level: must
tags:
  - det-33
  - verification
  - wrappers
  - registro
  - auth
  - fallback
---

# Un comando que registra algo se verifica leyendo el registro, no su propia salida

## What

Cuando un wrapper deja rastro (una entry en `decisions_log`, un archivo, un indice), verificarlo **leyendo el destino**, no el stdout del comando. Y cuando un fallback invoca **otro CLI**, asumir que ese CLI tiene su propia credencial y su propio modo de fallar.

Dos casos concretos de HOR-130 S3/S4:

1. El resumen de maquina del comando salia por **stderr**, que el wrapper de bash no capturaba. El comando imprimia el `usage` en pantalla y la entry registrada decia "sin usage reportado". Los dos outputs eran del mismo proceso y no coincidian.
2. `dkc-record-decision` **no acepta `--project`** (resuelve el ticket por id). Pasarselo hacia fallar el registro con un `WARN` que se perdia entre la salida normal.

Y el caso del fallback anidado: `claude -p` devolvio `401 OAuth access token has expired` mientras la sesion padre funcionaba perfecto, porque su credencial es otra. Peor: es **redundante** — dentro de una sesion de Claude Code el agente local **es** el orquestador. El fallback correcto ahi no es levantar otro proceso que hay que autenticar aparte, sino **senalizarle el trabajo con el handoff persistido**.

## Why

Es DET-33 aplicado a los wrappers propios: el output de un comando es self-report. Un comando puede imprimir exito y no haber registrado nada, sobre todo cuando el registro es una invocacion secundaria cuyo fallo se traga con `|| true` para no romper el flujo principal.

Los dos bugs sobrevivieron a `bash -n`, a la revision del codigo y a una corrida exitosa. Aparecieron al **leer el frontmatter del ticket** despues de correr el comando.

## Where

- `commands/dkc-delegate` (registro de `agent-invocation` y `kb-injection`, y el bloque de fallback)
- Cualquier wrapper nuevo que invoque `dkc-record-decision` o `dkc-execute-task`

## When

Al escribir o modificar un comando que registra estado, y al disenar un fallback que invoque otro CLI.

## Verificacion

Correr el comando y despues leer el destino:

```bash
./commands/dkc-delegate --role researcher --ticket <ID> --task S1.T1 --prompt "..."
python3 -c "print(open('projects/<p>/tickets/<ID>.md').read().split('---')[1])" | grep -A5 invoked-cli
```
