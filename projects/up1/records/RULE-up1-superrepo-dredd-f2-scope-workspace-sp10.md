---
id: RULE-up1-superrepo-dredd-f2-scope-workspace-sp10
project: up1
type: rule
module: up1-superrepo
---

F2 (contexto/hermanos) era la fase dominante en costo de una corrida real (10m34s de 21m57s) porque buscaba en todo el clon sin importar el tamaño del PR. Ahora la busqueda de hermanos se acota al workspace/mod que contiene el archivo cambiado (package.json mas cercano), y solo se expande a cross-mod ante señal real (elemento compartido/exportado, busqueda pobre, o diff ya cross-workspace). La deteccion de duplicacion sigue siendo full-clone a proposito.

**sourceRef:** 3bdc439 + .claude/skills/dredd/SKILL.md:1-46.
