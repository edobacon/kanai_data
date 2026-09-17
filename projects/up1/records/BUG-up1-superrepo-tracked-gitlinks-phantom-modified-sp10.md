---
id: BUG-up1-superrepo-tracked-gitlinks-phantom-modified-sp10
project: up1
type: bug
module: up1-superrepo
---

flow, layout, mcp, object-manager, report-builder, suite y varios mods/ estaban trackeados como gitlinks pese a que .gitignore los listaba, causando entradas M fantasma constantes en git status. Se destrackearon (git rm --cached) y se reforzo .gitignore; estos repos se gestionan por npm run setup / update-repos, no por git submodules.

**sourceRef:** 6b14ef7 + .gitignore:1-7.
