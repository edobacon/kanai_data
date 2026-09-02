---
id: RULE-workflow-agent-pack-lifecycle-021
project: horadric
type: rule
module: workflow
level: must
tags:
  - agents
  - instalacion
  - cache
  - hooks
  - fail-open
  - host-integration
  - det-4
---

# El pack de agentes no contiene nada si no esta bien instalado, y no se actualiza solo

## What

Tres propiedades del ciclo de vida del pack, las tres verificadas en runtime y las tres contraintuitivas.

**1. El pack repo-local NO carga solo.** El host escanea `.claude/agents/` caminando hacia arriba desde el cwd, y tambien dentro de carpetas agregadas con `--add-dir` o `/add-dir`. Pero las carpetas declaradas en `permissions.additionalDirectories` de un settings file **dan acceso a archivos y no cargan configuracion** — subagentes incluidos. Claude Desktop otorga las carpetas por esa via, asi que el pack de `deckard/.claude/agents/` **no existe** para una sesion cuyo cwd sea otro repo.

La instalacion en el scope de usuario (`~/.claude/agents/`, por symlink) es obligatoria, no una comodidad. Se hace con `./.claude/agents/install-agents.sh`.

**2. La definicion se cachea en su primer uso de la sesion.** Editarla despues no tiene efecto hasta reiniciar.

| Situacion | ¿Reinicio? |
|---|---|
| Agregar una definicion nueva **por symlink**, que es como instala el pack | si (medido) |
| Editar una que ya se uso en esta sesion | si |
| Editar una que todavia no se uso | no |

**Alcance de lo medido**: los tres casos se comprobaron con definiciones instaladas por symlink, que es como el pack instala siempre. Si un archivo REAL colocado a mano en `~/.claude/agents/` se detectaria sin reiniciar quedo sin discriminar — se planto la prueba y el reinicio ocurrio antes de poder invocarla. La guia operativa de arriba es correcta para el pack; no conviene enunciarla como propiedad general del host.

Esto **importa por seguridad**: si le sacas una tool a un rol porque descubriste que no deberia tenerla, el rol la conserva hasta el proximo reinicio mientras el archivo en disco dice lo contrario. **Achicar una allowlist no surte efecto sobre un agente que ya corrio.** Si el motivo del cambio fue contener algo, reinicia antes de dar la contencion por hecha.

**3. Un hook cuyo script no existe falla ABIERTO.** El host no bloquea la tool call: la deja pasar sin error visible. El rol corre sin guard mientras su definicion afirma que lo tiene.

Consecuencia directa: si un rol del pack usa `hooks.PreToolUse` para acotar por ruta, **el symlink de `guards/` es load-bearing**. El instalador lo enlaza junto con las definiciones, y un test exige que el script del hook exista, sea ejecutable y cuelgue de `$HOME`. Eso no es higiene: es la mitigacion.

El comando del hook usa `$HOME/.claude/agents/guards/...` y **nunca `$CLAUDE_PROJECT_DIR`**, porque este ultimo resuelve al cwd de la sesion — que en DKC casi nunca es `deckard`, ya que los roles corren sobre el repo del proyecto en curso.

## Why

Las tres se descubrieron corrigiendo afirmaciones equivocadas, y las tres versiones equivocadas llegaron a estar escritas en la doc del propio ticket.

- **La 1** contradijo a H4 del intake, que habia leido bien la doc del host y la habia aplicado a un setup que no era `--add-dir`. El sintoma es mudo: `Agent type 'dkc-reviewer' not found`, sin ninguna pista de por que.
- **La 2** costo tres redacciones. Primero se afirmo que un directorio nuevo se detectaba sin reiniciar (falso: habia habido un reinicio invisible, porque la sesion se resume con el mismo id). Despues, que achicar una allowlist entraba en vigor de inmediato — tambien falso, y **en la direccion peligrosa**. El experimento que lo confirmaba estaba mal disenado: media un primer uso. El discriminante fue achicarle el pool a un agente **ya usado**, que ignoro la edicion por completo.
- **La 3** era el riesgo R6 del ticket, y se confirmo con un discriminador limpio: se removio el symlink de `guards/` y se pidio una escritura **permitida**. Si el host fallara cerrado ante un hook irresoluble, hasta esa deberia haberse bloqueado. Se ejecuto sin error y sin ninguna entrada en el log del guard.

Lo que si quedo descartado: la advertencia de la doc sobre workspace trust aplica a subagentes **project-level**. Los de usuario corren sus hooks sin ese paso, y el pack se instala ahi.

## Where

- `.claude/agents/install-agents.sh` — instala, prunea huerfanos, aborta ante conflicto sin escribir nada
- `.claude/agents/guards/` — scripts de hooks; viajan con el pack y se symlinkean juntos
- `docs/agent-pack.md` — la nota operativa completa
- `server/tests/test_agent_pack_contracts.py` — verifica que el script de cada hook exista, ejecute y cuelgue de `$HOME`

## When

Al instalar el pack, al agregarle un rol, al cambiarle el pool a uno existente, y **siempre que se cambie una allowlist con intencion de contener**.

**Antipatron**: instalar el pack copiando solo los `.md` a mano. Deja los guards afuera, y con ellos la contencion por ruta, sin ningun error visible.

## Related

- [[RULE-workflow-agent-pack-enforcement-020]] — cuanto contiene el pack cuando si esta bien instalado
- [[RULE-workflow-harness-evidence-vs-self-report-022]] — como se midieron estas tres
