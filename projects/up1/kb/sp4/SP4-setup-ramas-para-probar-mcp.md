# SP4 — Alistar las ramas de up1

> **Cómo usar este archivo**: dile al agente *"alista las ramas de up1 a lo que dice este md"* o *"sigue estas
> instrucciones"*. El agente hace los checkouts indicados y verifica que quedaron seteados. **Nada más**.
> **Regla**: los repos **donde hicimos avances en SP4** van en su rama de SP4; **todos los demás** van a `develop`.
> **Alcance**: solo dejar los repos en la rama correcta. NO incluye sync, reinicio de servicios ni MCP.
> **Tickets Jira**: UPONE-1270 (versionado/convergencia de Curriculum), UPONE-1219 (motor de clonado/versionado), UPONE-1271 (clone layout).

---

## Grupo A — repos con avances de SP4 → rama de SP4

Cada repo es un git **independiente**. Usar `git -C <path>` (nunca `cd <repo> && git ...`).

```bash
git -C /Users/edobacon/Workspace/uplanner/up1/object-manager         checkout UPONE-1261-academic-program
git -C /Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design  checkout UPONE-1261-academic-program
git -C /Users/edobacon/Workspace/uplanner/up1/layout                  checkout UPONE-1271-recorddetail-payload-fix
```

## Grupo B — el resto → `develop`

```bash
git -C /Users/edobacon/Workspace/uplanner/up1                checkout develop   # root del monorepo
git -C /Users/edobacon/Workspace/uplanner/up1/suite          checkout develop
git -C /Users/edobacon/Workspace/uplanner/up1/flow           checkout develop
git -C /Users/edobacon/Workspace/uplanner/up1/report-builder checkout develop
```

## Verificar

```bash
git -C /Users/edobacon/Workspace/uplanner/up1/object-manager         branch --show-current   # → UPONE-1261-academic-program
git -C /Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design  branch --show-current   # → UPONE-1261-academic-program
git -C /Users/edobacon/Workspace/uplanner/up1/layout                  branch --show-current   # → UPONE-1271-recorddetail-payload-fix
git -C /Users/edobacon/Workspace/uplanner/up1                branch --show-current   # → develop
git -C /Users/edobacon/Workspace/uplanner/up1/suite          branch --show-current   # → develop
git -C /Users/edobacon/Workspace/uplanner/up1/flow           branch --show-current   # → develop
git -C /Users/edobacon/Workspace/uplanner/up1/report-builder branch --show-current   # → develop
```

---

## Referencia — qué trae cada rama de SP4

| Repo | Rama | Avance SP4 |
|------|------|------------|
| object-manager (core) | `UPONE-1261-academic-program` | versionado workflow-opcional + `updateInstance` FK→connect (UPONE-1270); `polymorphicChildrenDerived` (UPONE-1219) |
| mods/curriculum-design (mod) | `UPONE-1261-academic-program` | `updateCurriculumWithRecordType` (split RecordType en edit) + `returnsScalar`; read/herencia de la extensión RT (UPONE-1270) |
| layout (core, UI) | `UPONE-1271-recorddetail-payload-fix` | filtrado de `initialData` en `RecordDetail.handleSubmit` (UPONE-1271) |

> object-manager y el mod comparten el **nombre** de rama por la épica, pero son repos **distintos**: checkouts independientes.

---

## Si un checkout falla por cambios locales

Los repos arrastran artefactos de **sync/seed** sin commitear por diseño (object defs synced, schemas, typeDefs,
layouts). Si el `checkout` se queja del working tree:

- **NO** hacer `reset --hard` ni `--accept-data-loss`.
- Si el repo ya está en la rama esperada, el checkout es no-op → está OK.
- Si hay duda, **parar y avisar al dev**.

## Gotchas

- **Repos independientes**: siempre `git -C <abspath>`; nunca `cd … && git`.
- **node default = 22** — no prefijar con `nvm use`.
- Este doc **solo** deja las ramas. Hacer que el backend tome los cambios (sync + reinicio) y probar el MCP es **otro paso**, fuera de alcance.
