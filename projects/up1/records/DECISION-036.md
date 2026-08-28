---
id: DECISION-036
project: up1
type: decision
module: root
tags:
  - aduana
  - core-mod-boundary
  - skills
  - workflow
---

# El gate core/mod pasa de hook por-archivo a skill por-ticket

## Contexto

El gate que decidia si algo pertenecia a core o a un mod (`/up1-check`) era un comando manual respaldado por el hook `validate-write.js` en `PreToolUse`: se evaluaba archivo por archivo, en el momento de la escritura, sin visibilidad del alcance completo del ticket que se estaba implementando.

## Decision

Se retira `/up1-check` (comando, hook `validate-write.js` y su entrada `PreToolUse`, confirmado eliminados en el commit `bbb2169`) y se reemplaza por la skill Aduana (`.claude/skills/aduana/SKILL.md`). Aduana corre UNA vez al planear el ticket, no por archivo: descompone el requerimiento en artefactos tecnicos y juzga la genericidad de cada uno (¿depende de algo especifico del cliente/mod, o lo necesitaria otro mod tambien?). Aduana nunca decide la frontera core/mod por si sola: cuando un artefacto es candidato a core, delega la redaccion y creacion del ticket correspondiente en la skill `core-extension-writer` (`.claude/skills/core-extension-writer/SKILL.md`, creada primero en la misma serie de commits). La decision de frontera la sigue tomando el equipo de core; Aduana solo la detecta y la propone.

## Alternativas descartadas

- **Mantener el hook bloqueante por archivo**: evaluar archivo por archivo no tiene contexto del ticket completo, lo que genera falsos positivos/negativos cuando un artefacto solo se entiende como core-worthy al ver el conjunto (ej. un patron de acceso a datos que se repite en varios archivos del mismo ticket). Ademas un hook bloqueante interrumpe el flujo de escritura en cada archivo, mientras que un gate de planificacion evalua una sola vez con todo el alcance a la vista.

## Impacto y reversibilidad

Cambio de convencion transversal de creacion de codigo para mods: el gate pasa de ser "por archivo" (bloqueante, en tiempo de escritura) a "por ticket" (skill de planificacion, sin hook). Documentado en `docs/guides/core-mod-boundary-workflow.md` y en la seccion "Regla de Creacion" del `CLAUDE.md` raiz. Reversible restaurando el hook y el comando, pero se perderia la vision de alcance completo del ticket que motivo el cambio.
