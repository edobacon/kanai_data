---
id: BUG-codex-hooks-sin-via-declaracion-001
project: horadric
type: bug
module: codex
status: detected
severity: medium
tags:
  - codex
  - hooks
  - det-29
  - enforcement
  - reindex
  - host-limitation
---

# En Codex no hay forma de declarar hooks, asi que DET-29 no tiene guardarriel mecanico

## Symptom

Editar un record de DKC desde Codex con `Edit`/`apply_patch` deja el indice stale: HC muestra estado viejo, por ejemplo una session abierta que ya cerro. En Claude Code eso no pasa porque un hook `PostToolUse` dispara `dkc-reindex` automatico.

## Root cause

Los hooks de Codex existen como motor (`codex-rs/hooks/` con dispatcher, command_runner y los 8 eventos `pre-tool-use`, `post-tool-use`, `session-start`, `stop`, `user-prompt-submit`, `pre-compact`, `post-compact`, `permission-request`) y la feature figura como `hooks  stable  true`. Pero **ninguna via de declaracion disponible funciona**, verificado en HOR-129 S4.T1:

| Via | Resultado |
|-----|-----------|
| `.codex/hooks.json` repo-local, evento kebab-case | el marker de `session-start` NO aparecio en un `codex exec` real |
| `[[hooks."session-start"]]` en el `config.toml` del repo | el parser lo **acepta sin error** pero tampoco dispara |
| Hooks empaquetados en un plugin | feature `plugin_hooks` = `under development false` |
| Import desde `.claude/settings.json` | feature `external_migration` = `experimental false` |
| `[[hooks."session-start"]]` + array `.hooks` anidado en `~/.codex/config.toml` | no dispara (probado con autorizacion del dev) |
| `[[hooks."session-start"]]` plano en `~/.codex/config.toml` | no dispara |
| `~/.codex/hooks.json` (simetrica de `$CODEX_HOME/skills`) | no dispara |

**Evidencia de que la via no esta conectada, no de que la forma sea equivocada**: con `command = 12345` (tipo invalido para un campo string conocido) la config **carga sin ningun error**. Si el bloque `[hooks]` se deserializara en algun momento del arranque, un tipo invalido tendria que fallar. No falla, asi que el bloque no se lee.

Hipotesis: la feature `hooks` esta habilitada como motor pero su superficie de configuracion todavia no esta expuesta al usuario en esta build. Encaja con que las dos vias que el binario si menciona sean la del **plugin manifest** (`"hooks": "./hooks.json"`) y la del **import de Claude Code**, y que ambas features esten apagadas (`plugin_hooks` under development, `external_migration` experimental).

## Expected behavior

Editar un record de `projects/{project}/{tickets|specs|rules|decisions|bugs}/*.md` desde Codex deberia disparar `dkc-reindex {project}` automatico, igual que en Claude Code, para que HC nunca muestre estado stale por una edicion a mano.

## Reproduction

1. Declarar un hook `session-start` que escriba un marker, en `.codex/hooks.json` o en `[hooks]` del `config.toml` del repo.
2. `codex exec -C <repo> -s read-only "responde ok" < /dev/null`
3. El marker no existe.

## Impact

Acotado. Las mutaciones canonicas de DKC ya reindexan solas, asi que el guardarriel de DET-29 solo falta para el `Edit` libre de un record a mano. Consecuencia cuando pasa: HC muestra estado stale y el dev puede ver una session abierta que ya cerro, o no ver una task que ya se completo.

## Workaround

Implementado en HOR-129 S4.T2 y vigente:

- Instruccion explicita en `AGENTS.md`, seccion "Indice fresco: en Codex no hay hook, es tu responsabilidad", replicada en la skill `dkc-execute`.
- `.codex/hooks.json` **retirado del repo**: era config muerta con schema de Claude Code que aparentaba una cobertura inexistente.

**Alcance real del hueco, para no exagerarlo**: las mutaciones canonicas (`dkc-execute-task`, `dkc-set-status`, `dkc-record-decision`, `dkc-reindex`) ya reindexan solas. Lo que queda descubierto es unicamente el `Edit` libre de un record a mano.

## Que lo cerraria

**7 vias descartadas, ninguna pendiente.** Lo que resta no esta de nuestro lado:

- Que Codex habilite `plugin_hooks` y empaquetar el pack como plugin (backlog B1 de HOR-129).
- Que habilite `external_migration` y detecte el `.claude/settings.json`, que ya declara el hook correcto.
- Que exponga la superficie de configuracion de hooks al usuario.

Hasta entonces el workaround por instruccion es la cobertura disponible. Vale re-chequear con `codex features list` tras cada update de Codex: el dia que `plugin_hooks` pase a stable, esto se cierra empaquetando.
