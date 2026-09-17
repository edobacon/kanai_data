---
id: DECISION-up1-superrepo-dredd-sonnet-default-sp10
project: up1
type: decision
module: up1-superrepo
---

El Paso 0d de Dredd usa Sonnet siempre por defecto, sin preguntar. Solo se ofrece escalar a Opus cuando el diffstat muestra señal real de riesgo (auth/permisos/RBAC, migraciones de DB, borrado destructivo) o el usuario pide "review a fondo". Verificado con una corrida real: Sonnet encontro los 3 bugs de concurrencia reales, con igual rigor y menor costo/tiempo que Opus. Se suma ~/.dredd/memory.json, cache local por repo (no versionada) de hechos estructurales.

**sourceRef:** 0603b44 + .claude/skills/dredd/SKILL.md (Paso 0d, seccion de memoria local).
