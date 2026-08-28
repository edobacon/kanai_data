---
id: RULE-dev-004
project: up1
type: rule
module: dev
tags:
  - branching
  - core
  - git
  - workflow
  - review
  - dkc
---

# Trabajo en core va en una rama de epica O de ticket (ambas validas), con revision del team up1 antes de develop

## What

La directiva default de up1 es **trabajo autocontenido en el mod, sin tocar core** (ver `RULE-mods-001` + CLAUDE.md). Cuando un ticket SI debe editar codigo de un **workspace core** (`object-manager/`, `layout/`, `suite/`, `flow/` — codigo fuente real, no `mods/` ni outputs del sync), aplica esta politica:

1. **Marca explicita**: el ticket DKC declara en frontmatter `layer: core` (vs `layer: mod`). El campo gobierna el ruteo de branching de esta rule.
2. **Rama de epica O de ticket — ambas son opciones validas**: el trabajo `layer: core` va a una rama nombrada con un **id externo `UPONE-...`**, que puede ser:
   - **Rama de epica** (`UPONE-{epica}`, ej. `UPONE-1206`): agrupa TODO el trabajo `layer: core` de la epica en una unica rama. Se prefiere cuando varios tickets de la misma epica se consolidan para una revision unica del team up1.
   - **Rama de ticket** (`UPONE-{ticket}`, ej. `UPONE-1382`): aisla el trabajo de un ticket en su propia rama. Se prefiere cuando el ticket es independiente, es un follow-up sobre una rama de trabajo ya existente, o el equipo decide revisarlo por separado.

   **La eleccion la fija el ticket** (ver campo `branch` en Setup del ticket / `execute_scope`). La **guarda de rama (DET-30)** valida contra **cualquiera de las dos**: acepta la rama si NO es protegida (`develop`/`main`/`master`) Y su nombre **contiene el id externo** de la epica o del ticket. El match es **por contencion del id, tolerando prefijos/sufijos descriptivos** (ej. `feat/UPONE-1382-hard-delete-cascade` matchea `UPONE-1382`) — NO exige igualdad literal exacta.
3. **Commits con el id del ticket**: cada commit usa el id externo del ticket respectivo como prefijo (`UPONE-1207 ...`, `UPONE-1382 ...`), per DET-19 / DET-27. Asi, este en una rama de epica o de ticket, cada commit es trazable a su ticket.
4. **Merge gated por revision del team up1**: la rama (de epica o de ticket) se mezcla a `develop` **solo despues** de la revision del team up1. El cierre de un ticket `layer: core` en DKC NO implica merge a develop; deja el trabajo en su rama a la espera de esa revision.

Los tickets `layer: mod` (editan solo `mods/<mod>/`) **no** usan esta rama: siguen el flujo mod autocontenido normal y su integracion via `npm run sync`.

## Why

El core es **compartido y critico**: lo consumen todos los mods y tenants. Un cambio core sin revision del team up1 puede romper otros mods, otros tenants u objetos ajenos de forma silenciosa. Agrupar todo el trabajo core de una epica en **una sola rama** (en vez de una rama por ticket) le da al team up1 un cambio **coherente y revisable como unidad** antes de integrarlo a `develop` — en lugar de N PRs parciales que individualmente no cuentan la historia completa.

Esta rule **habilita** el trabajo core de forma controlada; no contradice la directiva default de "no tocar core" (`RULE-mods-001`, CLAUDE.md): esa sigue vigente para cambios que **pertenecen a un mod**. Origen: planificacion SP3 (capacidad de clonacion + versionamiento, epicas `UPONE-1206` core / `UPONE-1038` CD), primer sprint que interviene el core de up1 de forma planificada.

## Where

- **Frontmatter del ticket DKC**: `layer: core | mod` (gobierna el ruteo).
- **Workspaces core** (`config.yaml`): `object-manager/`, `layout/`, `suite/`, `flow/`. Editar su codigo fuente = `layer: core`. Editar `mods/<mod>/` = `layer: mod`.
- **Rama**: `UPONE-{epica}` (ej. `UPONE-1206`) **o** `UPONE-{ticket}` (ej. `UPONE-1382`) — ambas validas, parte de `develop`. La guarda matchea por contencion del id externo (tolera prefijos/sufijos, ej. `feat/UPONE-1382-...`).
- **Commits**: prefijo `UPONE-{ticket}` (DET-19).
- **Merge**: rama (epica o ticket) → `develop`, gated por revision del team up1.

## When

- **Aplica** cuando un ticket tiene `layer: core` (toca codigo de un workspace core).
- **NO aplica** a tickets `layer: mod` (solo `mods/<mod>/`) → flujo mod autocontenido + sync normal.
- En caso de duda (un ticket toca ambos): si edita codigo fuente de un workspace core, es `layer: core` y aplica esta rule.

## Interaccion con DETs

- **DET-19** (external id en artefactos del repo): alineado — branch y commits usan el id externo (`UPONE-...`).
- **DET-27** (commits al cierre de session): esta rule **especializa la estrategia de branching** de DET-27 para core. Los commits por session siguen produciendose y aterrizan en la rama del ticket declarada (de epica `UPONE-{epica}` o de ticket `UPONE-{ticket}`). La validacion humana de cada commit (DET-27) se mantiene.
- **DET-30** (red de seguridad autopilot — guarda de inicio): la guarda de rama que corre en autopilot strict/true/super valida que la rama activa **no sea protegida** Y **contenga el id externo** de la epica o del ticket del que se trate. Ambas ramas son aceptables; la guarda NO rechaza una rama de ticket por no ser de epica (ni viceversa). Verificacion **por repo destino** (cada workspace core es su propio repo git en up1), no en la raiz del monorepo.
- **DET-13** (cierre con evidencia): el cierre de un ticket `layer: core` registra los commits en su rama (epica o ticket) como evidencia; el merge a `develop` es un paso posterior (revision team up1), fuera del cierre DKC del ticket.

## Enforcement

Esta rule la **respeta el LLM** al ejecutar (se carga por DET-11 / proactividad antes de tocar codigo core). NO es un bloqueo duro de git por si sola. Para enforcement duro (git hook que rechace commits core fuera de `UPONE-{epica}`), se configura aparte via el harness (settings.json / hooks).
