---
id: RULE-curriculum-design-043
project: up1
type: rule
module: curriculum-design
tags:
  - sync
  - filesync
  - merge
  - append-only
  - mod-redeclare
  - core-field
  - drop-diferido
  - uengagement
  - workflowid
---

# El merge append-only de `fileSync` reintroduce campos core que un mod redeclara: un drop diferido no pega mientras el mod los redeclare

## What

El merge de objetos mods→business (`fileSync.js:744-752`) es **append-only**: si un mod redeclara un campo core en su `objects/<Object>.json`, el merge lo reintroduce en el modelo aunque el core intente dropearlo. Consecuencia: un **drop diferido de un campo core NO tiene efecto** mientras algún mod siga redeclarándolo. Antes de dropear un campo core, hay que limpiar sus redeclaraciones stale en los mods.

## Why

En TICKET-106, el drop de `workflowId`/`currentStatusId` de `Activity` parecía bloqueado por una dependencia de negocio de uEngagement. El root cause real era `uengagement-up1/objects/Activity.json:56-73` redeclarando esos campos + el merge append-only reintroduciéndolos: JSON duplicado stale, no dependencia. Relacionado con [[feedback_up1_sync_non_surgical_migrations_need_core_coordination]].

## Where

`object-manager` merge (`fileSync.js`), `objects/<Object>.json` de cada mod.

## When

Al dropear o modificar un campo core que algún mod pudiera redeclarar: auditar las redeclaraciones en los mods primero, o el cambio no pega tras el sync.
