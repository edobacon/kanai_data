---
id: RULE-platform-022
project: up1
type: rule
module: platform
tags:
  - git
  - generated-artifacts
  - typedefs
  - codegen
  - commits
  - hygiene
---

# Nunca committear un artefacto generado por delante de su fuente: al committear typedefs/schemas regenerados, hacerlo quirúrgico

## What

Los artefactos generados TRACKED del object-manager (`src/graphql/typeDefs/mods.js`, `up1.js`, `dynamic.js`, `prisma/*/schema.prisma`) se regeneran completos en bloque (`sync:logic`, `codegen`), así que una regeneración puede modificar **varios** archivos a la vez, reflejando el estado ACTUAL del working tree — incluyendo fuente que aún no está committeada.

Al committear un artefacto regenerado, hacerlo **quirúrgico**: committear un artefacto generado SOLO si su fuente ya está committeada. Si el diff del artefacto refleja cambios de fuente aún sin committear, dejar ese archivo fuera del commit. Nunca `git add .` que arrastre artefactos generados por delante de su fuente.

Caso origen: al regenerar typedefs con `sync:logic` para arreglar `mods.js` (ver [[rule-platform-021]]), también se regeneró `up1.js`. `mods.js` se committeó (su fuente —remoción de `auditCapture.schema.graphql`— ya estaba en git desde b70a6d9), pero `up1.js` se dejó fuera: su diff reflejaba el restructure de report-builder (`Report.json`/`ReportTemplate.json`) que seguía **modificado sin committear** en el working tree. Committear `up1.js` habría dejado el typedef generado por delante de su fuente.

## Why

Un artefacto generado committeado por delante de su fuente crea una inconsistencia difícil de rastrear: el schema efectivo no coincide con las definiciones JSON/`.graphql` en git, y el próximo que regenere desde la fuente committeada obtiene un diff "fantasma". El artefacto generado debe ser siempre una función determinística de la fuente committeada, no del working tree local.

## Where

- **Files generados TRACKED**: `object-manager/src/graphql/typeDefs/{mods.js,up1.js,dynamic.js}`, `object-manager/prisma/*/schema.prisma`
- **Sus fuentes**: `mods/*/logic/*.schema.graphql`, `mods/*/objects/*.json`, `object-manager/objects/**`, `{suite,layout,report-builder}/logic|schema`
- **Layers**: build / api / git

## When

Siempre que vayas a committear un typedef/schema regenerado, especialmente si la regeneración tocó más de un archivo o el working tree tiene drift en curso (update de repos a medias, branch de feature con objetos modificados sin committear).

## Verification

- Antes de `git add`: por cada artefacto generado con diff, confirmar que su fuente correspondiente esté committeada (`git status` de los JSON/`.graphql` fuente). Si la fuente está `M`/untracked → NO committear ese artefacto.
- Stagear archivo por archivo (`git add <path>`), nunca `git add .` ni `-A` cuando hay drift generado.
- Post-commit: `git diff --cached --name-only` debe listar solo los artefactos cuya fuente está en el commit (o ya committeada).

## Source

- **Discovered in**: sesión de debugging ad-hoc, 2026-07-15 (fix del crash `Unknown type "ChangeLog"` en up1/UPU)
- **Evidence**: `sync:logic` regeneró `mods.js` (fuente committeada) y `up1.js` (fuente `Report.json`/`ReportTemplate.json` modificada sin committear). Se committeó solo `mods.js` (commit b774a893, branch feat/UPONE-1382-hard-delete-cascade); `up1.js` quedó en el working tree para el trabajo de report-builder.
- **Related**: [[rule-platform-021]] (regenerar+committear typedef al retirar schema de un mod); convención de artefactos sincronizados (CLAUDE.md up1).
