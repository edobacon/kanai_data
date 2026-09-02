---
id: SPEC-remove-r2-dead-code
project: pehuen
ticket: PEH-028
status: approved
---

# Remover el adapter Cloudflare R2 (dead code) y su wiring

# Remover el adapter Cloudflare R2 (dead code) y su wiring

## Executive summary — lo que estas aprobando

**Que se quiere**: eliminar el adapter `CloudflareR2Storage` y todo su wiring del target `pehuen-nuxt`. Es dead code: `DEC-005` (2026-04) ratifico **filesystem local** como storage (Option A); el adapter R2 se construyo como opcion nunca elegida y nunca se activo en ningun deploy. El dev confirmo (2026-07-19) que el almacenamiento es filesystem, sin terceros. Este refactor reconcilia el codigo con `DEC-005`.

**Decision critica que ratificas** (registrada en `PEH-028` decisions_log — necessity-assessment: `drop`):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | R2 es dead code → se BORRA (adapter + wiring + dependency), no se cubre con test | Evidencia D1-D7 del ticket: ningun env/Dockerfile/CI del repo setea `provider=r2`; el Dockerfile de prod apunta storage a un volumen local; `DEC-005` eligio filesystem. El dev confirmo filesystem-only |
| 2 | Se remueve tambien `@aws-sdk/client-s3` de `dependencies` | `r2.ts` era su UNICO consumidor en todo el repo (grep repo-wide). Sin R2 la dep es peso muerto (~99 paquetes transitivos) |
| 3 | Zero behavior change | El factory sigue resolviendo `local` (default) y `railway`; ningun path productivo usaba `r2` |

**Riesgos y mitigacion**:
- **Romper el switch del factory** → cubierto: `tests/unit/server/utils/storage/index.test.ts` (factory local/railway) verde tras el cambio.
- **Referencia colgante a keys `r2*` de runtimeConfig** → typecheck estricto (exit 0) confirma que no quedan referencias a `r2Endpoint`/`r2Bucket`/etc.
- **Borrar la dep y romper otro consumidor** → grep repo-wide confirmo `r2.ts` como unico import de `@aws-sdk/client-s3`.

**Que NO se hace**:
- No se toca `local.ts` / `railway.ts` / `validation.ts` / `image-optimizer.ts`.
- No se cambia el formato de `Ruma.img` ni endpoints (paridad DEC-005 intacta).

**Tamano**: 1 session (T1). Riesgo bajo — remocion de dead code con suite + build de respaldo.

**Como se sabe que funciona** (validado bajo Node 24, runtime real de CI via `.nvmrc`):
- `pnpm test:run` → **701/701 verde** (87 files).
- `pnpm lint` → exit 0.
- `npx nuxt typecheck` → exit 0.
- `pnpm build` → exit 0 (clean install, matchea el gate `Lint & Build` del CI).

## Purpose

Resolver el punto debil #5 de la auditoria de migracion (2026-07-19): el adapter R2 wireado-pero-nunca-activado y sin test. Reconciliar el codigo con `DEC-005` (filesystem local) removiendo la rama cloud muerta antes del cutover.

## Refactor scope

### Antes
- `server/utils/storage/index.ts`: factory con `case 'r2': new CloudflareR2Storage()`.
- `server/utils/storage/r2.ts`: adapter S3-compatible (91 lineas), unico consumidor de `@aws-sdk/client-s3`.
- `nuxt.config.ts`: 5 keys `r2*` en runtimeConfig; `types/runtime-config.d.ts`: 5 tipos `r2*`.
- `.env.example`: bloque `NUXT_R2_*` (5 vars).
- `package.json`: dep `@aws-sdk/client-s3`.
- Tests/comentarios que referencian R2 (index.test.ts, runtime-config.test.ts, image.post.ts).

### Despues
- Factory solo `local` (default) + `railway`. Sin import ni case `r2`.
- `r2.ts` eliminado. `@aws-sdk/client-s3` fuera de `dependencies` (lockfile reconciliado).
- runtimeConfig / d.ts / `.env.example` sin keys `r2*`.
- Comentarios actualizados; `runtime-config.test.ts` sin `NUXT_R2_SECRET_ACCESS_KEY` (quedan 3 server vars reales).

### Archivos afectados (10)

| Archivo | Cambio |
|---------|--------|
| `server/utils/storage/r2.ts` | ELIMINADO |
| `server/utils/storage/index.ts` | remove import + `case 'r2'` |
| `nuxt.config.ts` | remove 5 keys `r2*` de runtimeConfig |
| `types/runtime-config.d.ts` | remove 5 tipos `r2*` + comentario |
| `.env.example` | remove bloque `NUXT_R2_*` |
| `package.json` | remove `@aws-sdk/client-s3` |
| `pnpm-lock.yaml` | reconciliado (`pnpm install`) |
| `tests/unit/server/utils/storage/index.test.ts` | comentario actualizado (rama r2 eliminada) |
| `tests/unit/config/runtime-config.test.ts` | remove `NUXT_R2_SECRET_ACCESS_KEY` de serverVars |
| `server/api/rumas/[id]/image.post.ts` | comentario (drop R2 mention) |

## Tasks

- [x] **S1.T1** — Confirmar uso de R2 en deploys (dev/ops). Resuelto: dev confirma filesystem-only, sin terceros. Rollback: n/a (decision).
- [x] **S1.T2** — Borrar adapter + wiring + dependency. Rollback: `git revert` del commit (adapter y wiring viven en historia).
- [x] **S1.T3** — Validar suite/lint/typecheck/build bajo Node 24 (runtime real). Rollback: n/a.

## Acceptance

- [x] Factory resuelve `local`/`railway`; suite storage verde (REQ-PRESERVE).
- [x] Zero referencias a `r2`/`CloudflareR2`/`@aws-sdk` en source (grep limpio).
- [x] `test:run` 701/701, lint 0, typecheck 0, build 0 bajo Node 24.
- [x] `DEC-005` reconciliado (nota PEH-028).
