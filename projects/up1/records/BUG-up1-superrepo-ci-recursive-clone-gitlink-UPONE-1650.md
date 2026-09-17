---
id: BUG-up1-superrepo-ci-recursive-clone-gitlink-UPONE-1650
project: up1
type: bug
module: up1-superrepo
---

flow/layout/mcp/object-manager/report-builder/suite y varios mods/ son gitlinks sin entrada en .gitmodules (se gestionan por npm run setup / update-repos, no como submodulos git), asi que la recursion de clonado de Woodpecker moria con "No url found for submodule path". Fix: recursive: false en el step de clone, ya que el test raiz (vitest run) no necesita ninguno de esos repos.

**sourceRef:** f755f89 + .woodpecker/test.yml:19-23.
