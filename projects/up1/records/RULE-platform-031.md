---
id: RULE-platform-031
project: up1
type: rule
module: platform
tags:
  - sync
  - core
  - mods
  - object-manager
  - retiro
  - merge
---

# El merge del sync es append-only: un mod que deja de declarar un artefacto no lo retira de core

## What

La fase de merge del sync (Mods → `business/` en object-manager) **agrega, pero nunca quita**.
Cuando un mod deja de declarar un campo, objeto o artefacto que antes publicaba, el sync **no** lo
elimina del repo core: el artefacto sigue en el RecordType publicado, en los N schemas de tenant y en
los typeDefs generados. Retirar algo ya publicado exige **intervención manual commiteada en core**
(editar/borrar el artefacto en `object-manager` y commitearlo con el id del ticket), y verificar que
una corrida posterior de sync **no lo revierte**. Un retiro que solo se hace del lado del mod se
deshace en el siguiente sync.

Corolario operativo (enlaza [[DET-16]]): cuando un ticket de mod **retira** algo que el sync ya
mergeó en core, el tramo de core va **dentro del mismo ticket** (mismo id externo en los commits de
object-manager), no en un ticket aparte, salvo contingencia declarada como deuda.

## Why

Genericidad (lo que juzga Aduana: ¿otro mod lo necesitaría?) y **mecánica de publicación** son dos
preguntas distintas. Un artefacto puede ser `mod-only` por genericidad y **igual** tocar archivos de
core, porque en up1 todo objeto de mod termina publicado y commiteado en el repo core por el merge
del sync. Aduana no mide esa superficie de publicación. Si el análisis se queda solo en "es mod-only"
y no revisa el retiro, el campo retirado reaparece en la próxima corrida de sync y el drift vuelve en
silencio, sin que ningún gate (codegen, sync, `drift:check`, tests) lo dispare mientras no haya
consumidor que lo toque.

## Where

- Fase de merge del sync: Mods → `object-manager/objects/business/` (append-only).
- Precedentes reales del retiro manual en core: commits `fbdcfcb6` y `00b35fb1` en object-manager.
- Consumidores del artefacto retirado a auditar 1:1 antes de eliminar (enlaza [[DET-40]]): RecordType
  publicado, schemas por tenant, typeDefs generados, loaders/seeds y tests de integración que lo
  referencian.

## Origen

sp9 up1, análisis `UPONE-1619-publicacion-en-core.md`: se determinó que el tramo de core de un
retiro va en el mismo ticket del mod, y que el merge append-only obliga a un paso explícito de
"publicación/retiro en core" con su propio DoD (verificar que el sync posterior no revierte).
