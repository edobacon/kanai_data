---
id: RULE-index-001
project: horadric
type: rule
module: index
level: must
tags:
  - sqlite
  - fs
  - normalization
  - index
---

# Consumidores del index.db de deckard deben normalizar paths y no asumir sincronizacion con filesystem

## What

Cualquier codigo que lea `projects/{name}/index.db` de deckard debe cumplir **dos invariantes**:

1. **Normalizar `records.file_path`**: el campo puede venir como path absoluto (ej. `/Users/...`) en proyectos legacy (bayley, up1) o como relativo al deckard root (ej. `projects/horadric/tickets/HOR-001.md`) en proyectos insertados manualmente. El consumidor debe manejar ambas formas y sandboxear el resultado contra `DECKARD_ROOT`.

2. **No asumir sincronizacion con el filesystem**: un `.md` puede existir sin su fila en `records`, o una fila puede apuntar a un archivo borrado. El consumidor debe:
   - Degradar a 404/empty-result en lugar de crashear cuando el archivo no existe.
   - Exponer visiblemente el timestamp `index_meta.last_reindex` para que el usuario sepa cuan fresco esta el index.

## Why

Observado durante HOR-001 fase 1:
- `BLY-001.md` existe en el filesystem pero no en `records` del SQLite de bayley — intento de detalle devolvia 404 aunque el archivo esta ahi. Sucede porque el reindex no se corrio despues de editar el ticket.
- `records.file_path` para bayley trae `/Users/edobacon/Workspace/deckard/projects/bayley/...` (absoluto) mientras horadric insertado via `INSERT INTO records` manual trae `projects/horadric/...` (relativo). Sin normalizacion, un endpoint funciona con un proyecto y falla con otro.

## Where

- **Files**: `server/deckard/paths.ts` — expone `resolveRecordPath(dbPath)` que normaliza ambos casos y valida contra DECKARD_ROOT.
- **Files**: `server/routes/tickets.ts`, `server/routes/records.ts`, `server/routes/flow.ts` — todos usan `resolveRecordPath` (no parsean `file_path` crudo).
- **Layers**: backend que consulta `index.db`.

## When

Siempre que se abra una conexion better-sqlite3 a `projects/{name}/index.db` y se lea `records.file_path` para despues abrir el archivo.

## Verification

- Grep: `grep -r 'file_path' server/` — solo `resolveRecordPath` deberia aceptar ese campo como entrada.
- Test: abrir BLY-002 (path absoluto en index) y HOR-001 (path relativo en index) con el mismo endpoint — ambos deben responder 200.
- Test de degradacion: borrar un `.md` y pegarle a su endpoint — debe devolver 404 estructurado, no 500.

## Source

- **Discovered in**: HOR-001, Session #4 (execute fase 1).
- **Evidence**: curl BLY-001/BLY-002 fallaba con paths absolutos hasta crear `paths.ts`; BLY-001 ademas devolvia 404 porque no esta en el index aunque el `.md` existe.
- **Related**: SPEC-viewer-mvp (expone el consumer); promovida desde learns L2 + L3 del ticket HOR-001.
